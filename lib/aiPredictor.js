// ═══════════════════════════════════════════════════════
// AI PREDICTION ENGINE — Gemini-Powered Match Analysis
// Analyzes enriched fixture data to generate predictions
// ═══════════════════════════════════════════════════════

import { buildMatchAnalysis } from "./footballApi";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── SYSTEM PROMPTS PER PACKAGE TIER ───

const GOLD_PROMPT = `You are an elite football prediction AI with 85%+ accuracy targeting SAFE, HIGH-PROBABILITY picks.

## YOUR ROLE
Generate a prediction round for GOLD package users. Target total odds: 15-25 range.
Focus on the SAFEST possible picks — match results, over/under, double chance.

## PREDICTION STRATEGY FOR GOLD (15-25 ODDS)
- Pick 2-3 matches from the fixtures provided
- Use markets: Match Result (1X2), Over/Under 2.5, Double Chance, BTTS
- Each pick should have 70%+ individual probability
- Combined odds should land between 15.00 and 25.00
- Prioritize strong favorites playing at home
- Avoid matches with high uncertainty (derbies, end-of-season dead rubbers)

## ANALYSIS REQUIREMENTS
- Study team form (last 5 matches), league position, home/away records
- Check head-to-head history for patterns
- Factor in goal-scoring trends (avg goals, BTTS rates)
- Consider league context (title race, relegation battle, mid-table)

## CONFIDENCE SCORING
- 85-95%: Rock-solid pick, clear favorite, strong data support
- 75-84%: Good pick, solid value
- 65-74%: Moderate, include only if needed for odds target
- Below 65%: DO NOT include

## RULES
- Use EXACT team names from the data provided
- Odds must be realistic (1.20 - 5.00 per pick)
- Provide clear reasoning for every pick
- If fewer than 2 good matches exist, return fewer picks (quality over quantity)
- "adminNote" should explain WHY these picks were selected (2-3 sentences for users)`;

const PLATINUM_PROMPT = `You are an elite football prediction AI with 85%+ accuracy targeting MEDIUM-RISK, HIGH-REWARD picks.

## YOUR ROLE
Generate a prediction round for PLATINUM package users. Target total odds: 25-50 range.
Balance risk and reward — include some bolder picks alongside safer ones.

## PREDICTION STRATEGY FOR PLATINUM (25-50 ODDS)
- Pick 3-4 matches from the fixtures provided
- Use markets: Match Result (1X2), Over/Under 2.5, BTTS, First Half Result
- Each pick should have 60%+ individual probability
- Combined odds should land between 25.00 and 50.00
- Mix safe picks (1.50-2.00) with value picks (2.50-4.00)
- Look for value in underdog situations and goal markets

## ANALYSIS REQUIREMENTS
- Deep analysis of team form, league position, home/away splits
- Head-to-head patterns and recent meetings
- Goal-scoring trends, defensive records
- League context: motivation, fixture congestion, rest days

## CONFIDENCE SCORING
- 85-95%: Premium pick with overwhelming evidence
- 75-84%: Strong pick, clear edge identified
- 65-74%: Good value pick, acceptable risk
- 55-64%: Speculative but data-supported — use sparingly
- Below 55%: DO NOT include

## RULES
- Use EXACT team names from the data
- Odds must be realistic (1.30 - 6.00 per pick)
- Provide detailed reasoning for every pick
- "adminNote" should explain the strategy (2-3 sentences for users)`;

const DIAMOND_PROMPT = `You are an elite football prediction AI specializing in PREMIUM MARKETS: Half Time/Full Time and Correct Score.

## YOUR ROLE
Generate a prediction round for DIAMOND package users. Focus on HT/FT and Correct Score markets.
These are high-odds, specialist picks for experienced bettors.

## PREDICTION STRATEGY FOR DIAMOND (HT/FT & CORRECT SCORE)
- Pick 2-3 matches from the fixtures provided
- PRIMARY markets: Half Time/Full Time, Correct Score
- SECONDARY markets: First Half Result, Total Goals Range
- Each correct score pick typically pays 5.00-15.00
- Each HT/FT pick typically pays 2.50-8.00
- Look for predictable matches (dominant home team, defensive away team)

## HT/FT ANALYSIS
- Home/Home is most common (~30% of matches involving strong home teams)
- Draw/Home or Draw/Away suggest teams that start slow but finish strong
- Study first-half scoring patterns for both teams

## CORRECT SCORE ANALYSIS
- 1-0 and 2-1 are statistically most common home wins
- 0-0 is valuable in defensive matchups (Serie A, low-scoring derbies)
- 2-0 is common for dominant home favorites
- Look at average goals per game and defensive records

## CONFIDENCE SCORING
- 70-85%: Strong pattern, high conviction
- 55-69%: Good value, reasonable probability
- Below 55%: DO NOT include — these markets need higher conviction

## RULES
- Use EXACT team names from the data
- Odds must be realistic for these markets (2.50 - 20.00 per pick)
- Provide detailed reasoning citing specific stats
- "adminNote" should explain the specialist angle (2-3 sentences for users)`;

// ─── SHARED OUTPUT FORMAT ───
const OUTPUT_FORMAT = `

## OUTPUT FORMAT (respond ONLY with this JSON, no other text):
{
  "matches": [
    {
      "homeTeam": "Exact Home Team Name",
      "awayTeam": "Exact Away Team Name",
      "matchTime": "HH:MM",
      "picks": [
        {
          "market": "Match Result",
          "pick": "Home Win",
          "odd": 1.85
        }
      ]
    }
  ],
  "totalOdd": 18.5,
  "adminNote": "Why these picks: Explanation of the strategy and key factors...",
  "confidence": 82,
  "analysis": "Detailed analysis paragraph covering all picks"
}`;

// ─── GENERATE PREDICTIONS WITH GEMINI ───
export async function generatePredictions(enrichedFixtures, packageTier = "gold") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  if (!enrichedFixtures.length) {
    return null; // No fixtures to predict
  }

  // Build match analysis data for the prompt
  const matchData = enrichedFixtures.map(f => buildMatchAnalysis(f)).join("\n\n---\n\n");

  // Select tier-specific prompt
  let tierPrompt;
  switch (packageTier) {
    case "platinum": tierPrompt = PLATINUM_PROMPT; break;
    case "diamond": tierPrompt = DIAMOND_PROMPT; break;
    default: tierPrompt = GOLD_PROMPT;
  }

  const fullPrompt = `${tierPrompt}${OUTPUT_FORMAT}

═══════════════════════════════════════════
TODAY'S AVAILABLE FIXTURES (analyze these):
═══════════════════════════════════════════

${matchData}

Based on the data above, generate your prediction round. Remember:
- Select ONLY the best matches with highest confidence
- Use EXACT team names as shown in the data
- Ensure total odds fall within the target range for this tier
- Quality over quantity — skip uncertain matches`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const reqBody = JSON.stringify({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.85,
      maxOutputTokens: 2048,
    },
  });

  // Retry logic for rate limits (429)
  let response;
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 60000);
      response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: reqBody,
      });
      clearTimeout(to);

      if (response.status === 429 && attempt < maxRetries) {
        const waitSec = 30 * (attempt + 1); // 30s, 60s, 90s
        console.log(`⏳ Gemini rate limited (${packageTier}), retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }
      break;
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (attempt < maxRetries && fetchErr.name === "AbortError") {
        console.log(`⏳ Gemini timeout (${packageTier}), retrying...`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      throw fetchErr;
    }
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.text();
    console.error(`Gemini API error [${response.status}]:`, error.slice(0, 300));
    throw new Error(`Gemini API returned ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("No response from Gemini");
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = textContent;
  const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let prediction;
  try {
    prediction = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error("Failed to parse Gemini response:", textContent.slice(0, 500));
    throw new Error("Invalid JSON from Gemini");
  }

  // Validate structure
  if (!prediction.matches || !Array.isArray(prediction.matches) || prediction.matches.length === 0) {
    throw new Error("No matches in prediction");
  }

  // Recalculate total odds (don't trust AI math)
  let totalOdd = 1;
  prediction.matches.forEach(m => {
    m.picks.forEach(p => {
      totalOdd *= parseFloat(p.odd) || 1;
    });
  });
  prediction.totalOdd = parseFloat(totalOdd.toFixed(2));

  // Sanitize: ensure match structure
  prediction.matches = prediction.matches.map(m => ({
    homeTeam: String(m.homeTeam || "").trim(),
    awayTeam: String(m.awayTeam || "").trim(),
    matchTime: String(m.matchTime || "").trim(),
    picks: (m.picks || []).map(p => ({
      market: String(p.market || "Match Result").trim(),
      pick: String(p.pick || "").trim(),
      odd: Math.max(1, Math.min(1000, parseFloat(p.odd) || 1.5)),
    })),
  }));

  return {
    matches: prediction.matches,
    totalOdd: prediction.totalOdd,
    adminNote: prediction.adminNote || "",
    confidence: prediction.confidence || 75,
    analysis: prediction.analysis || "",
    packageTier,
  };
}

// ─── GENERATE ALL THREE TIERS FROM SAME FIXTURES ───
export async function generateAllTierPredictions(enrichedFixtures) {
  const results = {};

  for (const tier of ["gold", "platinum", "diamond"]) {
    try {
      const prediction = await generatePredictions(enrichedFixtures, tier);
      if (prediction) {
        results[tier] = prediction;
        console.log(`✅ ${tier.toUpperCase()} prediction generated: ${prediction.matches.length} matches, odds ${prediction.totalOdd}`);
      }
    } catch (err) {
      console.error(`❌ Failed to generate ${tier} prediction:`, err.message);
    }

    // Delay between tier calls to respect Gemini rate limits
    await new Promise(r => setTimeout(r, 15000));
  }

  return results;
}
