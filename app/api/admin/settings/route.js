import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Fields that must NEVER leak to non-admins. The settings GET endpoint is
// public (user dashboards read prices/wallets from here) so we strip
// secrets server-side for everyone except admins.
const ADMIN_ONLY_FIELDS = ["vapidPrivateKey"];

function publicSettings(s) {
  if (!s) return s;
  const out = { ...s };
  for (const k of ADMIN_ONLY_FIELDS) delete out[k];
  return out;
}

// NO in-memory cache. On Vercel, each serverless function instance has its
// own memory — an admin saving on instance A doesn't invalidate the cache
// on instance B, so a user signing up on B would see stale (empty) data.
// Settings reads are cheap (a single indexed findOne); we hit the DB every
// time and rely on Cache-Control headers to prevent CDN/browser caching.
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";

    await connectDB();
    let s = await Settings.findOne({ key: "main" }).lean();
    if (!s) {
      const created = await Settings.create({ key: "main" });
      s = created.toObject();
    }

    return NextResponse.json(
      { settings: isAdmin ? s : publicSettings(s) },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e) {
    console.error("Settings GET error:", e.message);
    return NextResponse.json(
      { settings: {}, error: e.message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await req.json();
    delete body._id;
    delete body.__v;
    delete body.key;
    delete body.createdAt;
    delete body.updatedAt;

    const settings = await Settings.findOneAndUpdate(
      { key: "main" },
      { $set: body },
      { new: true, upsert: true, lean: true }
    );

    return NextResponse.json(
      { settings, message: "Settings saved" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e) {
    console.error("Settings PATCH error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
