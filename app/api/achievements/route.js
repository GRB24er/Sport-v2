import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Achievement from "@/models/Achievement";
import Round from "@/models/Round";
import { BADGES, evaluateBadges } from "@/lib/achievements";

export const dynamic = "force-dynamic";

// GET — return all badges with earned/locked state for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = session.user.id;
    const [user, earned, rounds] = await Promise.all([
      User.findById(userId).lean(),
      Achievement.find({ userId }).lean(),
      Round.find({ status: { $in: ["live", "closed", "expired"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Compute stats from rounds the user has access to
    const stats = computeUserStats(user, rounds);
    const evaluated = evaluateBadges({ user, stats, rounds });

    // Persist newly-earned badges
    const earnedMap = new Map(earned.map(e => [e.badgeId, e]));
    const newlyEarned = [];
    for (const { badge, result } of evaluated) {
      if (!earnedMap.has(badge.id)) {
        await Achievement.create({
          userId,
          badgeId: badge.id,
          progress: result.progress || 1,
          meta: result.meta || {},
        });
        newlyEarned.push(badge.id);
      }
    }

    const allBadges = BADGES.map(b => {
      const e = earnedMap.get(b.id);
      const wasJustEarned = newlyEarned.includes(b.id);
      return {
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description,
        tier: b.tier,
        earned: !!e || wasJustEarned,
        earnedAt: e?.earnedAt || (wasJustEarned ? new Date() : null),
      };
    });

    return NextResponse.json({
      badges: allBadges,
      newlyEarned,
      stats,
    });
  } catch (e) {
    console.error("Achievements error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

function computeUserStats(user, rounds) {
  // Mirror the round stats logic — wins/losses/streaks across resolved rounds the user could see
  const resolved = rounds.filter(r => r.result === "won" || r.result === "lost");
  const wins = resolved.filter(r => r.result === "won").length;
  const losses = resolved.filter(r => r.result === "lost").length;

  // Compute best streak walking through resolved rounds in chronological order
  let bestStreak = 0;
  let curStreak = 0;
  const chrono = [...resolved].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  for (const r of chrono) {
    if (r.result === "won") {
      curStreak++;
      if (curStreak > bestStreak) bestStreak = curStreak;
    } else {
      curStreak = 0;
    }
  }

  return { wins, losses, bestStreak, totalResolved: resolved.length };
}
