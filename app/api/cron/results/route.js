export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Notification from "@/models/Notification";
import { fetchFinishedMatches } from "@/lib/footballApi";
import { formatDate } from "@/lib/leagues";

function verifyCronSecret(req) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return secret === expected;
}

// Check if a pick won based on match result
function evaluatePick(pick, homeGoals, awayGoals, htHome, htAway) {
  const m = pick.market?.toLowerCase() || "";
  const p = pick.pick?.toLowerCase() || "";
  const totalGoals = homeGoals + awayGoals;

  // Match Result
  if (m.includes("match result") || m === "1x2") {
    if (p.includes("home")) return homeGoals > awayGoals;
    if (p.includes("draw")) return homeGoals === awayGoals;
    if (p.includes("away")) return homeGoals < awayGoals;
  }

  // Over/Under 2.5
  if (m.includes("over/under") || m.includes("o/u")) {
    if (p.includes("over")) return totalGoals > 2.5;
    if (p.includes("under")) return totalGoals < 2.5;
  }

  // BTTS
  if (m.includes("both teams") || m.includes("btts")) {
    if (p.includes("yes")) return homeGoals > 0 && awayGoals > 0;
    if (p.includes("no")) return homeGoals === 0 || awayGoals === 0;
  }

  // Double Chance
  if (m.includes("double chance")) {
    if (p.includes("1x") || p.includes("home or draw")) return homeGoals >= awayGoals;
    if (p.includes("12") || p.includes("home or away")) return homeGoals !== awayGoals;
    if (p.includes("x2") || p.includes("draw or away")) return homeGoals <= awayGoals;
  }

  // Correct Score
  if (m.includes("correct score")) {
    const scoreMatch = p.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (scoreMatch) {
      return parseInt(scoreMatch[1]) === homeGoals && parseInt(scoreMatch[2]) === awayGoals;
    }
  }

  // First Half Result
  if (m.includes("first half") && htHome !== null && htAway !== null) {
    if (p.includes("home")) return htHome > htAway;
    if (p.includes("draw")) return htHome === htAway;
    if (p.includes("away")) return htHome < htAway;
  }

  // HT/FT
  if (m.includes("half time") && m.includes("full time") && htHome !== null && htAway !== null) {
    const parts = p.split("/").map(s => s.trim().toLowerCase());
    if (parts.length === 2) {
      const htResult = htHome > htAway ? "home" : htHome < htAway ? "away" : "draw";
      const ftResult = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
      return parts[0] === htResult && parts[1] === ftResult;
    }
  }

  // Total Goals Range
  if (m.includes("total goals")) {
    if (p.includes("0-1")) return totalGoals <= 1;
    if (p.includes("2-3")) return totalGoals >= 2 && totalGoals <= 3;
    if (p.includes("4-5")) return totalGoals >= 4 && totalGoals <= 5;
    if (p.includes("6+") || p.includes("6 or more")) return totalGoals >= 6;
  }

  return null;
}

async function checkResults() {
  const startTime = Date.now();
  await connectDB();

  // Find AI-generated rounds that are still pending result
  const pendingRounds = await Round.find({
    aiGenerated: true,
    result: "pending",
    status: { $in: ["live", "closed", "expired"] },
    publishedAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  }).lean();

  if (pendingRounds.length === 0) {
    return NextResponse.json({ message: "No pending AI rounds to check", duration: Date.now() - startTime });
  }

  console.log(`Checking results for ${pendingRounds.length} AI rounds...`);

  // Fetch finished fixtures from today and yesterday
  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  const finishedFixtures = [];
  for (const dateStr of [today, yesterday]) {
    const matches = await fetchFinishedMatches(dateStr);
    finishedFixtures.push(...matches);
  }

  if (finishedFixtures.length === 0) {
    return NextResponse.json({ message: "No finished fixtures found", duration: Date.now() - startTime });
  }

  // Build lookup map: normalized "hometeam vs awayteam" -> result
  const resultMap = {};
  for (const fix of finishedFixtures) {
    if (fix.homeGoals === null) continue;
    const key = `${fix.homeTeam} vs ${fix.awayTeam}`.toLowerCase();
    resultMap[key] = {
      homeGoals: fix.homeGoals,
      awayGoals: fix.awayGoals,
      htHome: fix.htHome,
      htAway: fix.htAway,
    };
  }

  let updatedCount = 0;

  for (const round of pendingRounds) {
    let allResolved = true;
    let allWon = true;
    let anyLost = false;
    let matchResults = [];

    for (const match of round.matches) {
      const key = `${match.homeTeam} vs ${match.awayTeam}`.toLowerCase();
      const result = resultMap[key];

      if (!result) {
        allResolved = false;
        continue;
      }

      for (const pick of match.picks) {
        const won = evaluatePick(pick, result.homeGoals, result.awayGoals, result.htHome, result.htAway);
        if (won === false) {
          anyLost = true;
          allWon = false;
        } else if (won === null) {
          allResolved = false;
        }
        matchResults.push({ match: `${match.homeTeam} vs ${match.awayTeam}`, pick: pick.pick, market: pick.market, won });
      }
    }

    if (allResolved && matchResults.length > 0) {
      const roundResult = anyLost ? "lost" : "won";
      const wonPicks = matchResults.filter(r => r.won === true).length;
      const totalPicks = matchResults.length;
      const resultNote = `AI auto-checked: ${wonPicks}/${totalPicks} picks correct`;

      await Round.findByIdAndUpdate(round._id, {
        result: roundResult,
        resultNote,
        status: "closed",
        closedAt: new Date(),
      });

      await Notification.create({
        type: "system",
        message: `AI Round (${round.aiPackageTier?.toUpperCase()}) auto-resolved: ${roundResult === "won" ? "WON" : "LOST"} — ${wonPicks}/${totalPicks} picks correct (${round.totalOdd}x odds)`,
        forAdmin: true,
      });

      updatedCount++;
      console.log(`Round ${round._id} marked as ${roundResult} (${wonPicks}/${totalPicks})`);
    }
  }

  const duration = Date.now() - startTime;
  return NextResponse.json({
    message: `Checked ${pendingRounds.length} rounds, updated ${updatedCount}`,
    checked: pendingRounds.length,
    updated: updatedCount,
    duration,
  });
}

// GET — Cron trigger
export async function GET(req) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return checkResults();
}

// POST — Admin manual trigger
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "admin") {
      return checkResults();
    }
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return checkResults();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
