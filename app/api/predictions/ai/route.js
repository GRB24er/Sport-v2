import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Upload from "@/models/Upload";
import { PREDICTION_MARKETS } from "@/lib/constants";

const PPQ_BASE_URL = process.env.PPQ_BASE_URL || "https://api.ppq.ai";
const PPQ_MODEL = process.env.PPQ_MODEL || "gpt-4o";

const SYSTEM_PROMPT = `You are an elite sports betting analyst with deep expertise in football (soccer) across EPL, La Liga, Serie A, and Bundesliga. You have analyzed 50,000+ real football matches and understand team form, tactical patterns, and betting markets.

## YOUR MISSION
1. EXTRACT from the screenshot: exact team names, match numbers, visible odds, kickoff times
2. ANALYZE using your knowledge of team form, head-to-head records, league trends, and odds distributions
3. PREDICT with surgical precision — focus on HIGH PROBABILITY picks

## ANALYSIS METHODOLOGY
- Analyze team form over last 5-10 matches, home/away splits, and key player availability
- Over 2.5 goals hits ~50% across top leagues; varies by league (Bundesliga higher, Serie A lower)
- BTTS "Yes" occurs ~48% in EPL, ~45% in La Liga
- Look for VALUE: when displayed odds overestimate or underestimate true probability
- Combine 2-3 high-confidence singles for optimal accumulator odds (3x-8x range)
- Prioritize Match Result and Over/Under — they have highest hit rates

## MARKETS TO ANALYZE (pick best 2-4 per match)
- Match Result (1X2) — Home Win / Draw / Away Win
- Over/Under 2.5 Goals
- Both Teams to Score (BTTS)
- Correct Score (most likely scoreline based on odds patterns)
- First Half Result (1X2)
- Total Goals Range (0-1 / 2-3 / 4-5 / 6+)
- Double Chance (1X / 12 / X2)

## CONFIDENCE SCORING
- 85-95%: Very strong signal, clear favorite with supporting data
- 75-84%: Good probability, solid value pick
- 65-74%: Moderate confidence, worth including in larger accumulators
- Below 65%: Skip — not worth the risk

## OUTPUT RULES
- Use EXACT team names from the screenshot
- Odds must be realistic (1.15 - 8.00 for singles)
- Provide detailed reasoning for each pick
- Include a "riskLevel" for the overall prediction (low/medium/high)
- Add a "tips" field with brief betting advice

Respond ONLY in this exact JSON format:
{
  "matches": [
    {
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "matchTime": "12:30",
      "picks": [
        {
          "market": "Match Result",
          "pick": "Home Win",
          "odd": 1.85,
          "confidence": 82,
          "reasoning": "Home team favored at 1.85, historical win rate ~58%"
        }
      ]
    }
  ],
  "totalOdd": 4.52,
  "analysis": "Detailed analysis of match patterns and why these picks were selected",
  "confidence": 80,
  "riskLevel": "medium",
  "tips": "Place 60% of stake on the main picks, 40% on backup selections"
}`;

async function analyzeWithAi(imageBase64) {
  const apiKey = process.env.PPQ_API_KEY;
  if (!apiKey) {
    throw new Error("PPQ_API_KEY not configured");
  }

  // Validate the data URL format up front so we fail fast on bad input
  if (!/^data:image\/\w+;base64,/.test(imageBase64)) {
    throw new Error("Invalid image format");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch(`${PPQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: PPQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this betting screenshot. Extract the match data and provide your predictions in the exact JSON format specified. Focus on the highest confidence picks with realistic odds.",
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error(`PayPerQ API error [${response.status}]:`, error.slice(0, 500));
    throw new Error(`PayPerQ API returned ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content;

  if (!textContent) {
    throw new Error("No response from PayPerQ");
  }

  // Parse JSON from response (handle stray markdown code fences)
  let jsonStr = textContent.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const prediction = JSON.parse(jsonStr);

  if (!prediction.matches || !Array.isArray(prediction.matches)) {
    throw new Error("Invalid prediction format");
  }

  return prediction;
}

// POST — User submits screenshot for AI analysis
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user || user.status !== "approved") {
      return NextResponse.json({ error: "Account not active" }, { status: 403 });
    }

    const { imageBase64, uploadId } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image required" }, { status: 400 });
    }

    // Call PayPerQ vision AI
    const prediction = await analyzeWithAi(imageBase64);

    // Calculate total odd
    let totalOdd = 1;
    prediction.matches.forEach((match) => {
      match.picks.forEach((pick) => {
        totalOdd *= pick.odd || 1;
      });
    });
    totalOdd = parseFloat(totalOdd.toFixed(2));

    // If there's an upload ID, update it with the AI response
    if (uploadId) {
      await Upload.findByIdAndUpdate(uploadId, {
        status: "responded",
        matches: prediction.matches,
        totalOdd,
        analysis: prediction.analysis || "",
        aiConfidence: prediction.confidence || 75,
        riskLevel: prediction.riskLevel || "medium",
        tips: prediction.tips || "",
        respondedAt: new Date(),
        aiPowered: true,
      });
    }

    return NextResponse.json({
      success: true,
      prediction: {
        matches: prediction.matches,
        totalOdd,
        analysis: prediction.analysis,
        confidence: prediction.confidence,
        riskLevel: prediction.riskLevel,
        tips: prediction.tips,
        aiPowered: true,
      },
    });
  } catch (error) {
    console.error("AI Prediction error:", error);

    // If the AI provider is misconfigured, surface a clearer error
    if (error.message?.includes("PPQ_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Contact admin." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
