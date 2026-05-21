import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

// GET — return the VAPID public key so the client can build a subscription
export async function GET() {
  try {
    await connectDB();
    const s = await Settings.findOne({ key: "main" }).lean();
    const publicKey = s?.vapidPublicKey || process.env.VAPID_PUBLIC_KEY || "";
    const enabled = (s?.pushEnabled !== false) && !!publicKey;
    return NextResponse.json({ enabled, publicKey });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — save a subscription for the current user
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subscription, userAgent } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await connectDB();
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        userAgent: userAgent || "",
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Push subscribe error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE — remove a subscription (user unsubscribed in the browser)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    await connectDB();
    await PushSubscription.deleteOne({ endpoint, userId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
