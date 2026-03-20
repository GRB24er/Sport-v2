export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Upload from "@/models/Upload";
import Round from "@/models/Round";
import User from "@/models/User";
import { mToObj } from "@/lib/utils";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    if (session.user.role !== "admin" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(id)
      .select("gamePackages pendingGamePackages referralCode referralBalance referralTotalEarned referralCount")
      .lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [totalPredictions, pendingPredictions, recentPredictions] = await Promise.all([
      Upload.countDocuments({ userId: id, status: "responded" }),
      Upload.countDocuments({ userId: id, status: "pending" }),
      Upload.find({ userId: id }).select("-imageData").sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Rounds claimed by this user — for win/loss/streak tracking
    const claimedRounds = await Round.find({ claimedBy: id })
      .select("result totalOdd createdAt gameId matches adminNote betLink resultNote aiGenerated aiPackageTier aiConfidence")
      .sort({ createdAt: -1 }).limit(50).lean();

    const resolved = claimedRounds.filter(r => r.result === "won" || r.result === "lost");
    const wins = resolved.filter(r => r.result === "won").length;
    const losses = resolved.filter(r => r.result === "lost").length;
    const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0;

    // Current streak (consecutive wins from most recent, skip pending)
    let streak = 0;
    for (const r of claimedRounds) {
      if (r.result === "won") streak++;
      else if (r.result === "lost") break;
      else if (r.result === "pending") continue;
      else break;
    }

    // Best streak ever
    let bestStreak = 0, tempStreak = 0;
    for (const r of [...claimedRounds].reverse()) {
      if (r.result === "won") { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
      else if (r.result === "lost") { tempStreak = 0; }
    }

    const wonRounds = claimedRounds.filter(r => r.result === "won" && r.totalOdd);
    const avgOdds = wonRounds.length > 0 ? (wonRounds.reduce((a, r) => a + r.totalOdd, 0) / wonRounds.length).toFixed(1) : 0;

    const gp = mToObj(user.gamePackages);
    const now = Date.now();
    let activePackages = 0;
    for (const [, pkg] of Object.entries(gp)) {
      if (pkg.expiresAt && new Date(pkg.expiresAt).getTime() > now) activePackages++;
    }

    // Tier breakdown for AI rounds
    const tierStats = {};
    for (const tier of ["gold", "platinum", "diamond"]) {
      const tierRounds = claimedRounds.filter(r => r.aiGenerated && r.aiPackageTier === tier);
      const tierResolved = tierRounds.filter(r => r.result === "won" || r.result === "lost");
      const tierWins = tierResolved.filter(r => r.result === "won").length;
      tierStats[tier] = {
        total: tierRounds.length,
        wins: tierWins,
        losses: tierResolved.length - tierWins,
        winRate: tierResolved.length > 0 ? Math.round((tierWins / tierResolved.length) * 100) : 0,
      };
    }

    return NextResponse.json({
      totalPredictions, pendingPredictions,
      recentPredictions: recentPredictions.map(p => ({
        _id: p._id, gameId: p.gameId, status: p.status, matches: p.matches,
        totalOdd: p.totalOdd, aiConfidence: p.aiConfidence, riskLevel: p.riskLevel,
        analysis: p.analysis, tips: p.tips, createdAt: p.createdAt, respondedAt: p.respondedAt,
      })),
      activePackages,
      referralEarnings: user.referralTotalEarned || 0,
      referralCount: user.referralCount || 0,
      referralBalance: user.referralBalance || 0,
      roundStats: { total: claimedRounds.length, resolved: resolved.length, wins, losses, winRate, streak, bestStreak, avgOdds: Number(avgOdds) },
      tierStats,
      recentRounds: claimedRounds.slice(0, 10).map(r => ({
        _id: r._id, result: r.result, totalOdd: r.totalOdd, createdAt: r.createdAt,
        gameId: r.gameId, matchCount: r.matches?.length || 0,
        teams: r.matches?.map(m => `${m.homeTeam} vs ${m.awayTeam}`).join(" \u2022 ") || "",
        resultNote: r.resultNote,
      })),
    });
  } catch (e) {
    console.error("Stats API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
