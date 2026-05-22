import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import ChatThread from "@/models/ChatThread";
import Settings from "@/models/Settings";
import { chatCompletion } from "@/lib/aiClient";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are BetGenius AI, a sharp, friendly football betting analyst inside the BetGenius platform.

YOUR ROLE
- Help users analyze fixtures, markets, and odds for EPL, La Liga, Serie A and Bundesliga.
- Explain why a pick is reasonable using team form, head-to-head, home/away records, injuries, league context.
- Give probability-weighted reasoning, not certainty. Mention risk honestly.
- Suggest realistic stake-sizing using Kelly fraction or fixed-percentage when the user asks.

STYLE
- Be concise, confident, and friendly. Bullet points are fine. No fluff.
- Use the user's first name when natural.
- When you don't know recent match details, acknowledge it and reason from priors.
- If asked "should I bet X?", give a clear yes/no/maybe with the key reason in one line, then expand.

GUARDRAILS
- Never claim guaranteed wins. Always mention that betting involves risk.
- For Diamond-tier markets (HT/FT, Correct Score), emphasize they need higher conviction.
- Encourage responsible play. If the user describes chasing losses, gently advise stepping back.
- Do not invent specific player news, injuries, or fixture results you cannot verify — reason generally instead.
`;

const DAILY_LIMIT_FALLBACK = 20;
const MAX_MESSAGES_IN_CONTEXT = 16;

async function getSettings() {
  try {
    const s = await Settings.findOne({ key: "main" }).lean();
    return s || {};
  } catch {
    return {};
  }
}

function summarizeUserContext(user) {
  const lines = [];
  if (user?.name) lines.push(`User: ${user.name}`);
  const gp = user?.gamePackages instanceof Map ? Object.fromEntries(user.gamePackages) : (user?.gamePackages || {});
  const tiers = Object.values(gp).map(p => p?.package).filter(Boolean);
  if (tiers.length) lines.push(`Active packages: ${tiers.join(", ")}`);
  return lines.length ? `\n\n--- Context about this user ---\n${lines.join("\n")}` : "";
}

// GET /api/chat?threadId=... — fetch a single thread or list recent threads
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (threadId) {
      const thread = await ChatThread.findOne({ _id: threadId, userId: session.user.id }).lean();
      if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ thread });
    }

    const threads = await ChatThread.find({ userId: session.user.id })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .select("title lastMessageAt messages")
      .lean();
    const summary = threads.map(t => ({
      _id: t._id,
      title: t.title,
      lastMessageAt: t.lastMessageAt,
      messageCount: t.messages?.length || 0,
      preview: t.messages?.[t.messages.length - 1]?.content?.slice(0, 80) || "",
    }));
    return NextResponse.json({ threads: summary });
  } catch (e) {
    console.error("Chat GET error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/chat — send a message, get assistant reply
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Burst rate limit on top of the per-user daily cap — prevents a single
    // user from hammering PayPerQ if they script the endpoint.
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `chat:${session.user.id}:${ip}`, limit: 8, windowMs: 60 * 1000 });
    if (!rl.ok) {
      return rateLimitResponse(NextResponse, rl, "You're sending messages too fast. Slow down a bit.");
    }

    await connectDB();
    const settings = await getSettings();
    if (settings.aiChatEnabled === false) {
      return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 });
    }

    const user = await User.findById(session.user.id).lean();
    if (!user || user.status !== "approved") {
      return NextResponse.json({ error: "Account not active" }, { status: 403 });
    }

    const { message, threadId } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long (max 4000 chars)" }, { status: 400 });
    }

    let thread;
    if (threadId) {
      thread = await ChatThread.findOne({ _id: threadId, userId: user._id });
      if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    } else {
      thread = new ChatThread({
        userId: user._id,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    // Daily usage cap — count today's user messages across all threads
    const limit = Number.isFinite(settings.aiChatDailyLimit) && settings.aiChatDailyLimit > 0
      ? settings.aiChatDailyLimit
      : DAILY_LIMIT_FALLBACK;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const usageThreads = await ChatThread.find({
      userId: user._id,
      lastMessageAt: { $gte: startOfDay },
    }).select("messages").lean();
    const usedToday = usageThreads.reduce((sum, t) =>
      sum + (t.messages || []).filter(m => m.role === "user" && new Date(m.createdAt) >= startOfDay).length, 0);
    if (usedToday >= limit) {
      return NextResponse.json({ error: `Daily chat limit reached (${limit} messages). Resets at midnight.` }, { status: 429 });
    }

    // Build conversation context (most recent N messages)
    const history = (thread.messages || []).slice(-MAX_MESSAGES_IN_CONTEXT);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + summarizeUserContext(user) },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];

    let assistantReply;
    try {
      const { content } = await chatCompletion({
        messages,
        model: settings.aiModelChat || undefined,
        temperature: 0.5,
        maxTokens: 1024,
      });
      assistantReply = (content || "").trim();
      if (!assistantReply) throw new Error("Empty response");
    } catch (err) {
      console.error("AI chat error:", err.message);
      return NextResponse.json({ error: "AI is unavailable. Please try again shortly." }, { status: 502 });
    }

    thread.messages.push({ role: "user", content: message.trim() });
    thread.messages.push({ role: "assistant", content: assistantReply });
    thread.lastMessageAt = new Date();
    if (!threadId) thread.title = message.trim().slice(0, 60);
    await thread.save();

    return NextResponse.json({
      threadId: thread._id,
      reply: assistantReply,
      usedToday: usedToday + 1,
      limit,
    });
  } catch (e) {
    console.error("Chat POST error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/chat?threadId=... — delete a thread
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
    await ChatThread.deleteOne({ _id: threadId, userId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
