import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { sendPush } from "@/lib/pushSender";

export const dynamic = "force-dynamic";

// POST — admin-only endpoint to dispatch a push notification
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { target, userId, userIds, payload } = await req.json();
    if (!payload?.title) {
      return NextResponse.json({ error: "payload.title required" }, { status: 400 });
    }

    await connectDB();

    let dest;
    if (target === "all") dest = { roleAll: true };
    else if (Array.isArray(userIds) && userIds.length) dest = userIds;
    else if (userId) dest = userId;
    else return NextResponse.json({ error: "Specify target=all, userId, or userIds" }, { status: 400 });

    const result = await sendPush(dest, payload);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Push send error:", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
