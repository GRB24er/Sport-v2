import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Upload from "@/models/Upload";
import { PREDICTION_MARKETS } from "@/lib/constants";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const SYSTEM_PROMPT = `You are an expert sports betting analyst AI specialized in analyzing SportyBet Instant Football (virtual football) screenshots. Your job is to:

1. EXTRACT from the screenshot: team names, match details, odds, and any visible data
2. ANALYZE the virtual football patterns, odds structures, and historical tendencies
3. PREDICT outcomes across multiple markets with confidence levels

For each match you identify, provide predictions for these markets:
- Match Result (Home Win / Draw / Away Win)
- Over/Under 2.5 Goals
- Both Teams to Score (Yes / No)
- Correct Score (most likely scoreline)
- First Half Result
- Total Goals range

IMPORTANT RULES:
- Be specific with team names as shown in the screenshot
- Assign realistic odds (1.20 - 8.00 range for singles)
- Give confidence as a percentage (60-95%)
- Aim for combined odds of 3x-8x across 2-3 picks
- Focus on the highest confidence picks

Respond ONLY in this exact JSON format:
{
  "matches": [
    {
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "picks": [
        {
          "market": "Match Result",
          "pick": "Home Win",
          "odd": 1.85,
          "confidence": 78
        }
      ]
    }
  ],
  "totalOdd": 4.52,
  "analysis": "Brief analysis of why these picks were chosen",
  "confidence": 80
}`;

async function analyzeWithGemini(imageBase64) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Extract base64 data and mime type
  const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid image format");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            {
              text: "Analyze this SportyBet Instant Football screenshot. Extract the match data and provide your predictions in the exact JSON format specified. Focus on the highest confidence picks with realistic odds.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error:", error);
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

  const prediction = JSON.parse(jsonStr);

  // Validate structure
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

    // Call Gemini AI
    const prediction = await analyzeWithGemini(imageBase64);

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
        aiPowered: true,
      },
    });
  } catch (error) {
    console.error("AI Prediction error:", error);

    // If Gemini fails, return a helpful error
    if (error.message?.includes("GEMINI_API_KEY")) {
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
