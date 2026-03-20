export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import User from "@/models/User";
import Notification from "@/models/Notification";

import Settings from "@/models/Settings";
import { isPackageExpired } from "@/lib/packageUtils";
import { mToObj } from "@/lib/utils";
import { GAME_NAMES, PKG_LIMITS_DEF } from "@/lib/constants";

async function getPkgLimits() {
  try {
    const s = await Settings.findOne({ key: "main" }).lean();
    if (!s) return PKG_LIMITS_DEF;
    return { gold: s.goldMaxPreds || 3, platinum: s.platinumMaxPreds || 3, diamond: s.diamondMaxPreds || 3 };
  } catch (e) { return PKG_LIMITS_DEF; }
}

// Auto-expire check
async function expireOldRounds() {
  const now = new Date();
  await Round.updateMany(
    { status: "live", expiresAt: { $lte: now, $ne: null } },
    { $set: { status: "expired", closedAt: now } }
  );
}

// POST — admin creates a round (draft or live)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { gameId, matches, adminNote, goLive, expiresInMinutes, betLink, isFree } = await req.json();

    if (!gameId || !GAME_NAMES[gameId]) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    if (!matches || matches.length < 1 || matches.length > 10) return NextResponse.json({ error: "1-10 matches required" }, { status: 400 });
    if (expiresInMinutes !== undefined && (expiresInMinutes < 5 || expiresInMinutes > 10080)) {
      return NextResponse.json({ error: "Expiry must be 5 min to 7 days (10080 min)" }, { status: 400 });
    }

    for (const m of matches) {
      if (!m.homeTeam?.trim() || !m.awayTeam?.trim() || !m.picks?.length) {
        return NextResponse.json({ error: "All matches need teams and at least 1 pick" }, { status: 400 });
      }
      if (m.homeTeam.length > 100 || m.awayTeam.length > 100) {
        return NextResponse.json({ error: "Team names too long" }, { status: 400 });
      }
      for (const p of m.picks) {
        if (p.odd !== undefined && (isNaN(p.odd) || p.odd < 1 || p.odd > 1000)) {
          return NextResponse.json({ error: "Odds must be between 1.00 and 1000.00" }, { status: 400 });
        }
      }
    }

    // Calculate total odd from all picks across all matches
    let allOdds = [];
    matches.forEach(m => m.picks.forEach(p => { if (p.odd) allOdds.push(parseFloat(p.odd)); }));
    const totalOdd = parseFloat(allOdds.reduce((a, o) => a * o, 1).toFixed(2));

    const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null;

    const round = await Round.create({
      gameId,
      matches: matches.map(m => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        matchTime: m.matchTime || "",
        picks: m.picks.filter(p => p.pick).map(p => ({
          market: p.market,
          pick: p.pick,
          odd: parseFloat(p.odd) || 1.5,
        })),
      })),
      totalOdd,
      adminNote: adminNote || "",
      betLink: betLink || "",
      isFree: !!isFree,
      status: goLive ? "live" : "draft",
      publishedAt: goLive ? new Date() : null,
      expiresAt,
    });

    if (goLive) {
      // Notify all approved users
      const users = await User.find({ status: "approved" }).select("_id").lean();
      if (users.length > 0) {
        await Notification.insertMany(users.map(u => ({
          type: "system",
          message: `🔥 New ${GAME_NAMES[gameId]} round is LIVE! ${matches.length} matches ready. Open the app to play!`,
          forUserId: u._id,
        })));
      }
      await Notification.create({
        type: "system",
        message: `✅ ${GAME_NAMES[gameId]} round published with ${matches.length} matches. ${users.length} users notified.`,
        forAdmin: true,
      });
    }

    return NextResponse.json({ message: goLive ? "Round is LIVE!" : "Draft saved", round });
  } catch (error) {
    console.error("Round create error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// GET — get rounds
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    await expireOldRounds();

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    // Admin sees everything
    if (session.user.role === "admin") {
      const query = {};
      if (gameId) query.gameId = gameId;
      const rounds = await Round.find(query).sort({ createdAt: -1 }).limit(50).lean();
      return NextResponse.json({ rounds });
    }

    // User — live rounds for subscribed games + free rounds for all approved users
    const user = await User.findById(session.user.id).select("gamePackages status").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const gp = mToObj(user.gamePackages);
    const subscribedGames = Object.keys(gp).filter(g => !isPackageExpired(gp[g]));

    // Determine user's package tier(s) for AI-generated round filtering
    const userTiers = [];
    for (const [g, pkg] of Object.entries(gp)) {
      if (!isPackageExpired(pkg) && pkg.package) userTiers.push(pkg.package);
    }

    // Build query: subscribed game rounds OR free rounds
    const conditions = [];

    // Free rounds — available to ALL approved users
    if (gameId) {
      conditions.push({ status: "live", isFree: true, gameId });
    } else {
      conditions.push({ status: "live", isFree: true });
    }

    // Subscribed game rounds (non-free)
    if (subscribedGames.length > 0) {
      const subQuery = { status: "live", isFree: { $ne: true } };
      if (gameId) {
        if (subscribedGames.includes(gameId)) subQuery.gameId = gameId;
        else subQuery.gameId = "__none__"; // no match
      } else {
        subQuery.gameId = { $in: subscribedGames };
      }
      // AI tier filter
      if (userTiers.length > 0) {
        subQuery.$or = [
          { aiGenerated: { $ne: true } },
          { aiGenerated: true, aiPackageTier: { $in: userTiers } },
        ];
      } else {
        subQuery.aiGenerated = { $ne: true };
      }
      conditions.push(subQuery);
    }

    const rounds = await Round.find({ $or: conditions }).sort({ createdAt: -1 }).lean();
    const userId = user._id.toString();

    const mapped = rounds.map(r => ({
      ...r,
      claimed: (r.claimedBy || []).includes(userId),
      // Hide match picks if not claimed (free rounds always show picks)
      matches: (r.claimedBy || []).includes(userId) || r.isFree
        ? r.matches
        : r.matches.map(m => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, matchTime: m.matchTime, picks: [] })),
    }));

    return NextResponse.json({ rounds: mapped, subscribed: subscribedGames.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH — publish/close round (admin) or claim round (user)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    // Admin actions: publish, close, delete
    if (session.user.role === "admin") {
      const { roundId, action, expiresInMinutes } = body;
      if (!roundId || !action) return NextResponse.json({ error: "roundId and action required" }, { status: 400 });

      if (action === "publish") {
        const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null;
        const round = await Round.findByIdAndUpdate(roundId, {
          status: "live", publishedAt: new Date(), expiresAt,
        }, { new: true });
        if (!round) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const users = await User.find({ status: "approved" }).select("_id").lean();
        if (users.length > 0) {
          await Notification.insertMany(users.map(u => ({
            type: "system",
            message: `🔥 New ${GAME_NAMES[round.gameId]} round is LIVE! ${round.matches.length} matches. Open app to play!`,
            forUserId: u._id,
          })));
        }
        return NextResponse.json({ message: "Published!", round });
      }

      if (action === "close") {
        await Round.findByIdAndUpdate(roundId, { status: "closed", closedAt: new Date() });
        return NextResponse.json({ message: "Round closed" });
      }

      if (action === "result") {
        const { result } = body;
        if (!["won", "lost", "partial", "pending"].includes(result)) {
          return NextResponse.json({ error: "Invalid result. Use: won, lost, partial, pending" }, { status: 400 });
        }
        await Round.findByIdAndUpdate(roundId, { result, resultNote: body.resultNote || "" });
        return NextResponse.json({ message: `Round marked as ${result}` });
      }

      if (action === "delete") {
        await Round.findByIdAndDelete(roundId);
        return NextResponse.json({ message: "Deleted" });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // User action: claim round
    const { roundId } = body;
    if (!roundId) return NextResponse.json({ error: "roundId required" }, { status: 400 });

    const round = await Round.findById(roundId).lean();
    if (!round || round.status !== "live") return NextResponse.json({ error: "Round not available" }, { status: 404 });

    const user = await User.findById(session.user.id);
    if (!user || user.status !== "approved") return NextResponse.json({ error: "Account not active" }, { status: 403 });

    const userId = user._id.toString();
    if ((round.claimedBy || []).includes(userId)) {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    // Free rounds — skip credit checks
    if (round.isFree) {
      const claimResult = await Round.findOneAndUpdate(
        { _id: round._id, claimedBy: { $ne: userId } },
        { $addToSet: { claimedBy: userId } },
        { new: true }
      );
      if (!claimResult) return NextResponse.json({ error: "Already claimed" }, { status: 400 });
      const fullRound = await Round.findById(roundId).lean();
      return NextResponse.json({ message: "Unlocked!", round: fullRound, isFree: true });
    }

    const gameId = round.gameId;
    const PKG_LIMITS = await getPkgLimits();
    const gp = mToObj(user.gamePackages);
    const gamePkg = gp[gameId];

    if (!gamePkg) return NextResponse.json({ error: "No package for this game" }, { status: 403 });

    // Check time-based expiry (atomic: unset only if still matching)
    if (isPackageExpired(gamePkg)) {
      await User.findOneAndUpdate(
        { _id: user._id, [`gamePackages.${gameId}.expiresAt`]: gamePkg.expiresAt },
        { $unset: { [`gamePackages.${gameId}`]: "" } }
      );
      return NextResponse.json({ error: "EXPIRED", message: "Package expired. Subscribe again." }, { status: 403 });
    }

    const maxPreds = PKG_LIMITS[gamePkg.package] || 1;
    const used = gamePkg.predictionsUsed || 0;

    if (used >= maxPreds) {
      await User.findOneAndUpdate(
        { _id: user._id, [`gamePackages.${gameId}.predictionsUsed`]: used },
        { $unset: { [`gamePackages.${gameId}`]: "" } }
      );
      return NextResponse.json({ error: "EXHAUSTED", message: "All credits used. Subscribe again." }, { status: 429 });
    }

    // ATOMIC: Claim the round only if not already claimed (prevents race condition)
    const claimResult = await Round.findOneAndUpdate(
      { _id: round._id, claimedBy: { $ne: userId } },
      { $addToSet: { claimedBy: userId } },
      { new: true }
    );
    if (!claimResult) {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    const newUsed = used + 1;
    const exhausted = newUsed >= maxPreds;

    // ATOMIC: Increment predictionsUsed — only if value hasn't changed since read
    const creditUpdate = exhausted
      ? { $unset: { [`gamePackages.${gameId}`]: "" } }
      : { $set: { [`gamePackages.${gameId}.predictionsUsed`]: newUsed } };
    await User.findOneAndUpdate(
      { _id: user._id, [`gamePackages.${gameId}.predictionsUsed`]: used },
      creditUpdate
    );

    const gameName = GAME_NAMES[gameId] || gameId;
    await Notification.create({
      type: "system",
      message: `${user.name} unlocked ${gameName} round (${newUsed}/${maxPreds})${exhausted ? " — PACKAGE EXPIRED" : ""}`,
      forAdmin: true, relatedUserId: user._id,
    });

    // Return full round with picks
    const fullRound = await Round.findById(roundId).lean();

    return NextResponse.json({
      message: "Unlocked!",
      round: fullRound,
      predictionsUsed: newUsed,
      maxPredictions: maxPreds,
      exhausted,
    });
  } catch (error) {
    console.error("Round PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// v2
