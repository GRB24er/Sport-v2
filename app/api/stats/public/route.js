export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Round from "@/models/Round";

// Public homepage stats. Replaces previously hardcoded "12,000+ Winners /
// $245K+ Total Won / 80% Win Rate". Returns real numbers when there's enough
// data; returns null fields when the platform's too young so the UI can show
// honest copy instead of inflated marketing numbers.

const MIN_USERS_TO_SHOW = 25;
const MIN_ROUNDS_TO_SHOW = 20;
const CACHE_TTL = 5 * 60 * 1000;
let cache = null;
let cacheAt = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cacheAt < CACHE_TTL) return NextResponse.json(cache);

    await connectDB();

    const [approvedUsers, resolvedWonAgg, resolvedRounds, winRoundCount] = await Promise.all([
      User.countDocuments({ status: "approved" }),
      Round.aggregate([
        { $match: { result: "won" } },
        { $group: { _id: null, totalOdd: { $sum: "$totalOdd" }, count: { $sum: 1 } } },
      ]),
      Round.countDocuments({ result: { $in: ["won", "lost"] } }),
      Round.countDocuments({ result: "won" }),
    ]);

    const wins = winRoundCount;
    const winRate = resolvedRounds > 0 ? Math.round((wins / resolvedRounds) * 100) : null;

    // "Total Won" approximation: sum of winning round odds × an assumed $10 stake.
    // This is conservative and won't show until we have at least MIN_ROUNDS_TO_SHOW
    // resolved rounds — keeps us out of false-advertising territory while the
    // platform's young.
    const totalOddSum = resolvedWonAgg?.[0]?.totalOdd || 0;
    const estimatedTotalWon = Math.round(totalOddSum * 10);

    const hasEnoughUsers = approvedUsers >= MIN_USERS_TO_SHOW;
    const hasEnoughRounds = resolvedRounds >= MIN_ROUNDS_TO_SHOW;

    const result = {
      members: hasEnoughUsers ? approvedUsers : null,
      totalWon: hasEnoughRounds ? estimatedTotalWon : null,
      winRate: hasEnoughRounds ? winRate : null,
      resolvedRounds,
      wins,
      // Helpful flags for UI
      newPlatform: !hasEnoughUsers || !hasEnoughRounds,
    };

    cache = result;
    cacheAt = now;
    return NextResponse.json(result);
  } catch (e) {
    console.error("Public stats error:", e.message);
    return NextResponse.json({ members: null, totalWon: null, winRate: null, newPlatform: true });
  }
}
