import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Prediction from "@/models/Prediction";
import Notification from "@/models/Notification";

import { mToObj } from "@/lib/utils";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(params.id).select("-password").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (session.user.role !== "admin" && session.user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert Maps to plain objects (Mongoose 8 can return Map even with .lean())
    user.gamePackages = mToObj(user.gamePackages);
    user.pendingGamePackages = mToObj(user.pendingGamePackages);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Safety: admin cannot delete themselves (would lock them out)
    if (session.user.id === params.id) {
      return NextResponse.json({ error: "You can't delete your own admin account." }, { status: 400 });
    }

    const target = await User.findById(params.id).select("role name");
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Safety: don't delete the last admin
    if (target.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Can't delete the last admin account." }, { status: 400 });
      }
    }

    await User.findByIdAndDelete(params.id);
    await Prediction.deleteMany({ userId: params.id });
    await Notification.deleteMany({ $or: [{ relatedUserId: params.id }, { forUserId: params.id }] });

    // Invalidate the 30s dashboard cache so the freshly-deleted user
    // doesn't keep reappearing in the admin list for half a minute.
    try {
      const mod = await import("@/app/api/admin/dashboard/route");
      if (typeof mod.invalidateDashboardCache === "function") mod.invalidateDashboardCache();
    } catch {}

    return NextResponse.json({ message: `Deleted ${target.name}` });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Whitelist of fields admin can modify via PATCH
const ALLOWED_FIELDS = new Set([
  "name", "email", "phone", "status", "referralCode", "referralBalance",
  "referralTotalEarned", "referralCount", "bettingId", "amountPaid",
  "approvedAt", "approvedBy", "avatar",
]);
// Prefix-allowed for nested gamePackages updates (e.g. "gamePackages.epl")
const ALLOWED_PREFIXES = ["gamePackages.", "pendingGamePackages."];

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    // Action-based updates (ban, block, suspend, unblock)
    if (body.action) {
      const actionMap = { ban: "banned", block: "blocked", suspend: "suspended", unblock: "approved" };
      const newStatus = actionMap[body.action];
      if (!newStatus) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

      const user = await User.findByIdAndUpdate(params.id, { $set: { status: newStatus } }, { new: true }).select("-password");
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      await Notification.create({
        type: "system",
        message: `User ${user.name} status changed to ${newStatus}`,
        forAdmin: true, relatedUserId: user._id,
      });

      return NextResponse.json({ user });
    }

    // Filter to only allowed fields — prevents role escalation, password overwrite, etc.
    const sanitized = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key) || ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
        sanitized[key] = body[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(params.id, { $set: sanitized }, { new: true }).select("-password");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
