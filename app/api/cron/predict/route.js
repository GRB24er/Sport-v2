export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for AI generation

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { fetchTodayFixtures, enrichFixtures } from "@/lib/footballApi";
import { generatePredictions } from "@/lib/aiPredictor";

// Security: verify cron secret to prevent unauthorized triggers
function verifyCronSecret(req) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // If no secret configured, allow (dev mode)
  return secret === expected;
}

// Check if we already generated rounds today for a given tier
async function alreadyGeneratedToday(packageTier) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const existing = await Round.findOne({
    aiGenerated: true,
    aiPackageTier: packageTier,
    createdAt: { $gte: startOfDay },
  });
  return !!existing;
}

// ─── CORE PREDICTION LOGIC ───
async function runPredictions(force = false) {
  const startTime = Date.now();

  try {
    await connectDB();

    // 1. Fetch today's fixtures
    console.log("🔄 Fetching today's fixtures...");
    const fixtures = await fetchTodayFixtures();

    if (fixtures.length === 0) {
      console.log("ℹ️ No fixtures found for today");
      return NextResponse.json({
        message: "No fixtures today for target leagues",
        fixtures: 0,
        rounds: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📋 Found ${fixtures.length} fixtures across target leagues`);

    // Group fixtures by league for logging
    const byLeague = {};
    fixtures.forEach(f => {
      byLeague[f.leagueShort] = (byLeague[f.leagueShort] || 0) + 1;
    });
    console.log("📊 Fixtures by league:", byLeague);

    // 2. Check which tiers still need generation today
    const tiersNeeded = [];
    for (const tier of ["gold", "platinum", "diamond"]) {
      if (force || !(await alreadyGeneratedToday(tier))) {
        tiersNeeded.push(tier);
      } else {
        console.log(`⏭️ ${tier.toUpperCase()} already generated today, skipping`);
      }
    }

    if (tiersNeeded.length === 0) {
      return NextResponse.json({
        message: "All tiers already generated today",
        fixtures: fixtures.length,
        rounds: 0,
        duration: Date.now() - startTime,
      });
    }

    // 3. Enrich fixtures with form, H2H, standings
    console.log("🔍 Enriching fixtures with team data...");
    const enrichedFixtures = await enrichFixtures(fixtures);
    console.log(`✅ Enriched ${enrichedFixtures.length} fixtures`);

    // 4. Generate AI predictions for each needed tier
    console.log(`🤖 Generating predictions for tiers: ${tiersNeeded.join(", ")}...`);
    const predictions = {};

    for (const tier of tiersNeeded) {
      try {
        const pred = await generatePredictions(enrichedFixtures, tier);
        if (pred) predictions[tier] = pred;
      } catch (err) {
        console.error(`❌ Failed ${tier}:`, err.message);
      }
      // Rate limit buffer between Gemini calls
      if (tiersNeeded.indexOf(tier) < tiersNeeded.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 5. Create rounds from predictions
    const createdRounds = [];

    for (const [tier, pred] of Object.entries(predictions)) {
      try {
        const validMatches = pred.matches.filter(m =>
          m.homeTeam && m.awayTeam && m.picks?.length > 0
        );

        if (validMatches.length === 0) {
          console.warn(`⚠️ No valid matches for ${tier}, skipping`);
          continue;
        }

        // Build league summary for the note
        const leagues = [...new Set(validMatches.map(m => {
          const fix = enrichedFixtures.find(f =>
            f.homeTeam === m.homeTeam && f.awayTeam === m.awayTeam
          );
          return fix?.leagueShort || "Football";
        }))];

        const round = await Round.create({
          gameId: "football",
          matches: validMatches.map(m => ({
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            matchTime: m.matchTime || "",
            picks: m.picks.map(p => ({
              market: p.market,
              pick: p.pick,
              odd: parseFloat(p.odd) || 1.5,
            })),
          })),
          totalOdd: pred.totalOdd,
          adminNote: pred.adminNote || `AI-generated ${tier} predictions for ${leagues.join(", ")}`,
          betLink: "",
          status: "live",
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
          result: "pending",
          aiGenerated: true,
          aiPackageTier: tier,
          aiConfidence: pred.confidence || 75,
          aiAnalysis: pred.analysis || "",
        });

        createdRounds.push({ tier, roundId: round._id, matches: validMatches.length, odds: pred.totalOdd });
        console.log(`✅ Created ${tier.toUpperCase()} round: ${validMatches.length} matches, odds ${pred.totalOdd}`);
      } catch (err) {
        console.error(`❌ Failed to create ${tier} round:`, err.message);
      }
    }

    // 6. Notify users about new rounds
    if (createdRounds.length > 0) {
      try {
        const users = await User.find({ status: "approved" }).select("_id").lean();
        if (users.length > 0) {
          const tierNames = createdRounds.map(r => r.tier.charAt(0).toUpperCase() + r.tier.slice(1));
          const totalMatches = createdRounds.reduce((a, r) => a + r.matches, 0);

          await Notification.insertMany(users.map(u => ({
            type: "system",
            message: `🤖 AI Predictions are LIVE! ${totalMatches} matches analyzed for ${tierNames.join(", ")} tiers. Open the app to claim your round!`,
            forUserId: u._id,
          })));
        }

        await Notification.create({
          type: "system",
          message: `🤖 AI auto-generated ${createdRounds.length} prediction rounds: ${createdRounds.map(r => `${r.tier}(${r.matches}m, ${r.odds}x)`).join(", ")}`,
          forAdmin: true,
        });
      } catch (err) {
        console.error("Failed to send notifications:", err.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Cron complete in ${duration}ms — ${createdRounds.length} rounds created`);

    return NextResponse.json({
      message: `Generated ${createdRounds.length} prediction rounds`,
      fixtures: fixtures.length,
      fixturesByLeague: byLeague,
      rounds: createdRounds,
      duration,
    });
  } catch (error) {
    console.error("Cron predict error:", error);
    // Never leak raw driver errors (bad auth, connection strings, etc.)
    // to the client — log them, return a clean classified message.
    const msg = (error?.message || "").toLowerCase();
    let userMessage = "AI prediction generation failed.";
    let code = "INTERNAL";
    if (msg.includes("bad auth") || msg.includes("authentication failed") || msg.includes("not authorized")) {
      userMessage = "Database authentication failed. Check MONGODB_URI on the server.";
      code = "DB_AUTH";
    } else if (msg.includes("enotfound") || msg.includes("etimeout") || msg.includes("serverselectiontimeout")) {
      userMessage = "Can't reach the database. Check Atlas IP allow-list and cluster status.";
      code = "DB_UNREACHABLE";
    } else if (msg.includes("ppq_api_key")) {
      userMessage = "PayPerQ AI is not configured (missing PPQ_API_KEY).";
      code = "AI_CONFIG";
    } else if (msg.includes("football-data") || msg.includes("api-football") || msg.includes("fixture")) {
      userMessage = "Couldn't fetch today's fixtures from the football API.";
      code = "FIXTURES";
    }
    return NextResponse.json(
      { error: userMessage, code, duration: Date.now() - startTime },
      { status: 500 }
    );
  }
}

// ─── GET — Automated cron trigger (Vercel Cron / external service) ───
export async function GET(req) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runPredictions(false);
}

// ─── POST — Manual trigger by admin ───
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "admin") {
      // Admin can force regeneration even if already generated today
      const { searchParams } = new URL(req.url);
      const force = searchParams.get("force") === "true";
      return runPredictions(force);
    }

    // Fall back to cron secret for non-admin callers
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return runPredictions(false);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
