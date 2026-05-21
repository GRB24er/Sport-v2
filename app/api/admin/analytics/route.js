export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Round from "@/models/Round";
import Upload from "@/models/Upload";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function bucketByDay(items, dateField, valueFn = () => 1, days = 30) {
  const buckets = new Array(days).fill(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startMs = today.getTime() - (days - 1) * MS_PER_DAY;

  for (const it of items) {
    const d = it[dateField];
    if (!d) continue;
    const ms = new Date(d).getTime();
    if (ms < startMs) continue;
    const idx = Math.floor((ms - startMs) / MS_PER_DAY);
    if (idx >= 0 && idx < days) buckets[idx] += valueFn(it) || 0;
  }
  return buckets;
}

function sum(arr) { return arr.reduce((a, n) => a + n, 0); }
function periodSplit(arr) {
  const half = Math.floor(arr.length / 2);
  return { prev: sum(arr.slice(0, half)), curr: sum(arr.slice(half)) };
}

// 60s cache to avoid hammering the DB on rapid refreshes
let cache = null;
let cacheAt = 0;
const TTL = 60_000;

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    if (cache && now - cacheAt < TTL) return NextResponse.json(cache);

    await connectDB();

    const days = 30;
    const since = new Date(Date.now() - days * MS_PER_DAY);

    const [users, rounds, uploads] = await Promise.all([
      User.find({ createdAt: { $gte: since } })
        .select("status amountPaid approvedAt createdAt referredBy gamePackages")
        .lean(),
      Round.find({ createdAt: { $gte: since } })
        .select("result totalOdd createdAt publishedAt aiGenerated aiPackageTier claimedBy")
        .lean(),
      Upload.find({ createdAt: { $gte: since } })
        .select("status createdAt aiPowered")
        .lean(),
    ]);

    // ── Daily series ──
    const approvedUsers = users.filter(u => u.status === "approved");
    const newUsersDaily = bucketByDay(users, "createdAt", () => 1, days);
    const revenueDaily = bucketByDay(approvedUsers, "approvedAt", u => u.amountPaid || 0, days);
    const roundsDaily = bucketByDay(rounds, "createdAt", () => 1, days);
    const uploadsDaily = bucketByDay(uploads, "createdAt", () => 1, days);

    // Win rate per day for AI rounds only
    const aiRounds = rounds.filter(r => r.aiGenerated && (r.result === "won" || r.result === "lost"));
    const winRateDaily = (() => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const startMs = today.getTime() - (days - 1) * MS_PER_DAY;
      const buckets = new Array(days).fill(null).map(() => ({ wins: 0, total: 0 }));
      for (const r of aiRounds) {
        const ms = new Date(r.createdAt).getTime();
        if (ms < startMs) continue;
        const idx = Math.floor((ms - startMs) / MS_PER_DAY);
        if (idx < 0 || idx >= days) continue;
        buckets[idx].total++;
        if (r.result === "won") buckets[idx].wins++;
      }
      return buckets.map(b => b.total === 0 ? 0 : Math.round((b.wins / b.total) * 100));
    })();

    // Per-tier accuracy aggregate over the window
    const tierStats = {};
    for (const tier of ["gold", "platinum", "diamond"]) {
      const tierRounds = aiRounds.filter(r => r.aiPackageTier === tier);
      const wins = tierRounds.filter(r => r.result === "won").length;
      tierStats[tier] = {
        total: tierRounds.length,
        wins,
        losses: tierRounds.length - wins,
        winRate: tierRounds.length === 0 ? 0 : Math.round((wins / tierRounds.length) * 100),
      };
    }

    // ── Totals + period deltas ──
    const totals = {
      newUsers: sum(newUsersDaily),
      revenue: sum(revenueDaily),
      rounds: sum(roundsDaily),
      uploads: sum(uploadsDaily),
      aiRoundsResolved: aiRounds.length,
      aiWins: aiRounds.filter(r => r.result === "won").length,
    };
    totals.aiWinRate = totals.aiRoundsResolved === 0 ? 0 : Math.round((totals.aiWins / totals.aiRoundsResolved) * 100);

    const deltas = {
      newUsers: periodSplit(newUsersDaily),
      revenue: periodSplit(revenueDaily),
      rounds: periodSplit(roundsDaily),
      uploads: periodSplit(uploadsDaily),
    };

    // ── Engagement: claim rate per round ──
    const liveRounds = rounds.filter(r => r.publishedAt);
    const totalClaims = liveRounds.reduce((a, r) => a + (r.claimedBy?.length || 0), 0);
    const avgClaimsPerRound = liveRounds.length === 0 ? 0 : Math.round((totalClaims / liveRounds.length) * 10) / 10;

    const result = {
      days,
      series: {
        newUsers: newUsersDaily,
        revenue: revenueDaily,
        rounds: roundsDaily,
        uploads: uploadsDaily,
        aiWinRate: winRateDaily,
      },
      totals,
      deltas,
      tierStats,
      engagement: { totalClaims, avgClaimsPerRound, liveRounds: liveRounds.length },
    };

    cache = result;
    cacheAt = now;
    return NextResponse.json(result);
  } catch (e) {
    console.error("Analytics error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
