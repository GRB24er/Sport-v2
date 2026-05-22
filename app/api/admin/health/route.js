export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

// GET /api/admin/health — admin-only health probe
// Returns one of: { ok: true }  |  { ok: false, reason: "..." }
// Reasons are sanitized — never leak credentials or full driver errors.
function classify(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("bad auth") || msg.includes("authentication failed")) {
    return "DB_AUTH_FAILED"; // wrong user/password in MONGODB_URI
  }
  if (msg.includes("enotfound") || msg.includes("dns")) {
    return "DB_HOST_NOT_FOUND"; // hostname in URI is wrong / DNS down
  }
  if (msg.includes("etimeout") || msg.includes("timed out") || msg.includes("serverselectiontimeout")) {
    return "DB_TIMEOUT"; // network blocked or IP not allow-listed in Atlas
  }
  if (msg.includes("mongodb_uri not set")) {
    return "DB_URI_MISSING"; // env var not configured
  }
  if (msg.includes("not authorized")) {
    return "DB_USER_NO_ACCESS"; // user exists but lacks DB permissions
  }
  return "DB_UNKNOWN";
}

const HUMAN = {
  DB_AUTH_FAILED:    "MongoDB rejected the credentials. Check MONGODB_URI — username/password is wrong, or special characters in the password need URL-encoding (@ → %40, : → %3A, # → %23).",
  DB_HOST_NOT_FOUND: "MongoDB hostname can't be resolved. The cluster URL in MONGODB_URI is wrong.",
  DB_TIMEOUT:        "MongoDB didn't respond in time. Your IP probably isn't on the Atlas Network Access allow-list, or the cluster is paused.",
  DB_URI_MISSING:    "MONGODB_URI env var isn't set. Add it to your .env.local (dev) or Vercel project settings (prod).",
  DB_USER_NO_ACCESS: "MongoDB user exists but doesn't have access to the target database. Update the user's database privileges in Atlas.",
  DB_UNKNOWN:        "Unknown database error. Check server logs.",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ ok: false, reason: "DB_URI_MISSING", message: HUMAN.DB_URI_MISSING }, { status: 503 });
    }

    try {
      await connectDB();
      // Real round-trip — `ping` is the cheapest authenticated DB op
      await mongoose.connection.db.admin().command({ ping: 1 });
    } catch (err) {
      const reason = classify(err);
      console.error("[health] db error:", err.message);
      return NextResponse.json(
        { ok: false, reason, message: HUMAN[reason] || HUMAN.DB_UNKNOWN },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      mongoState: mongoose.connection.readyState, // 1 = connected
      ppqConfigured: !!process.env.PPQ_API_KEY,
      cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME,
      vapidConfigured: !!process.env.VAPID_PUBLIC_KEY,
    });
  } catch (e) {
    console.error("[health] unexpected:", e);
    return NextResponse.json({ ok: false, reason: "DB_UNKNOWN", message: HUMAN.DB_UNKNOWN }, { status: 500 });
  }
}
