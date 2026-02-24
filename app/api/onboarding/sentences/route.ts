import { NextRequest, NextResponse } from "next/server";
import { TableNames } from "@/services/aws/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Force Node.js runtime for Netlify compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function generateSentencesWithClaude(
  proofMethod: string,
  why: string,
  goal: string
): Promise<{ sentence1: string; sentence2: string; sentence3: string } | null> {
  try {
    const apiKey = process.env.CLAUDE_API_KEY?.trim();
    if (!apiKey) {
      console.error("❌ [Sentences API] CLAUDE_API_KEY not found");
      return null;
    }

    const prompt = `You are a helpful assistant. Based on the user's proof method, goal, and their "why", generate three sentences.

CRITICAL REQUIREMENTS FOR ALL SENTENCES:
- Be CONCISE: Keep sentences short and to the point. Avoid unnecessary words.
- Make SENSE: The sentence must be logical and clear. Read it back to ensure it flows naturally.
- Be GRAMMATICALLY CORRECT: Use proper grammar, spelling, and punctuation. Double-check your work.

1. First sentence: "Each day you upload [simple description]. I'll check it."
   - Use the proofMethod to create a simple, concise sentence
   - Keep it short and natural - just describe what they upload, don't over-explain
   - Extract the core action/item from the proofMethod and make it simple
   - End with "I'll check it."
   - Example: If proofMethod is "Photo of your home-cooked meal or restaurant receipt showing it's not fast food", generate "Each day you upload a picture of your meal. I'll check it."
   - Example: If proofMethod is "Screenshot of the certification programs you researched (browser tabs, notes, website pages)", generate "Each day you upload a screenshot of your research. I'll check it."
   - Example: If proofMethod is "photo of workout", generate "Each day you upload a picture of your workout. I'll check it."
   - Example: If proofMethod is "screenshot", generate "Each day you upload a screenshot. I'll check it."
   - Keep it simple: "Each day you upload [a/an] [simple noun phrase]. I'll check it."
   - Don't say "proof of photographing" or "proof of taking" - just say "a picture" or "a photo" or "a screenshot"

2. Second sentence: "If something seems off, a human reviews it."
   - This sentence is always the same, just return it exactly as written
   - Make sure it's grammatically correct: "If something seems off, a human reviews it."

3. Third sentence: "Because [the why/positive outcome] is worth putting something real on the line"
   - Use ONLY the "why" to create a meaningful sentence about the deeper motivation
   - UNDERSTANDING THE "WHY": The "why" is the reason/motivation someone wants to reach their goal. It's why they're putting money into this app - to ensure they achieve this important outcome. The sentence means: "Because [failing to achieve this important outcome] is worth putting money on the line to avoid" - meaning the outcome is so important that you're willing to risk money to ensure you achieve it.
   - The sentence should make logical sense: you're putting money on the line BECAUSE you don't want to fail at achieving your "why"
   - Make it natural and meaningful, focusing on the deeper motivation (the "why")
   - IMPORTANT: Only use the "why" - do NOT mention the goal in this sentence
   - IMPORTANT: The sentence must make sense logically. If the "why" is "to show up right for my wedding", the sentence should be about achieving that outcome and being worth putting money on the line
   - Example: If why is "to have more fulfillment and grow beyond stagnant fitness coaching", generate "Because pursuing fulfillment and growth beyond stagnant fitness coaching is worth putting something real on the line"
   - Example: If why is "I want to be healthy", generate "Because prioritizing your health is worth putting something real on the line"
   - Example: If why is "to show up right for my wedding next year", generate "Because showing up right for your wedding next year is worth putting something real on the line" (NOT "not looking good" - the why is about showing up right, so the sentence should be about not achieving that)
   - The sentence should feel personal and focus on the deeper motivation
   - Read the sentence back: Does it make sense that someone would put money on the line to avoid failing at this outcome?

Goal: ${goal}
Proof Method: ${proofMethod}
Why: ${why}

FINAL CHECKLIST before generating:
- Are all sentences concise (short and to the point)?
- Do all sentences make logical sense when read? (Especially sentence 3 - does it make sense that someone would put money on the line to avoid failing at this outcome?)
- Is the grammar correct in all three sentences?
- Did you use ONLY the "why" in sentence 3 (not the goal)?
- Does sentence 3 correctly interpret the "why" as the reason/motivation for putting money on the line?
- Are the sentences natural and easy to read?

Generate ONLY the three sentences, one per line, nothing else.`;

    console.log("🔍 [Sentences API] Making Claude API request via fetch...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [Sentences API] Claude API failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      return null;
    }

    const data = await response.json();
    const content =
      data.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    console.log("✅ [Sentences API] Claude API request successful");
    console.log("Claude response:", content);

    if (!content) {
      console.error("❌ [Sentences API] No content in Claude response");
      return null;
    }

    // Parse the three sentences from the response
    const lines = content
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (lines.length >= 3) {
      return {
        sentence1: lines[0],
        sentence2: lines[1],
        sentence3: lines[2],
      };
    }

    // Fallback: try to extract sentences if they're in a different format
    const sentence1Match = content.match(
      /Each day you upload proof of[^.]+\. I'll check it\./i
    );
    const sentence2Match = content.match(
      /If something seems off, a human reviews it\./i
    );
    const sentence3Match = content.match(
      /Because not[^.]+is worth putting something real on the line/i
    );

    if (sentence1Match && sentence2Match && sentence3Match) {
      return {
        sentence1: sentence1Match[0].trim(),
        sentence2: sentence2Match[0].trim(),
        sentence3: sentence3Match[0].trim(),
      };
    }

    console.error("❌ [Sentences API] Could not parse sentences from Claude response:", content);
    return null;
  } catch (error: any) {
    console.error("❌ [Sentences API] Error calling Claude API:", {
      error: error?.message || String(error),
      name: error?.name,
      stack: error?.stack,
    });
    return null;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log("🚀 [Sentences API] Request started");
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      console.error("❌ [Sentences API] Missing userId parameter");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log("✅ [Sentences API] userId received:", userId);

    // Check for Claude API key
    if (!process.env.CLAUDE_API_KEY) {
      console.error("❌ [Sentences API] CLAUDE_API_KEY not found in environment variables");
      return NextResponse.json(
        {
          error: "Server configuration error: Missing Claude API key",
          errorCode: "MISSING_CLAUDE_API_KEY",
        },
        { status: 500 }
      );
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID_NEXT || !process.env.AWS_SECRET_ACCESS_KEY_NEXT) {
      console.error("❌ [Sentences API] AWS credentials not found in environment variables");
      return NextResponse.json(
        {
          error: "Server configuration error: Missing AWS credentials",
          errorCode: "MISSING_AWS_CREDENTIALS",
        },
        { status: 500 }
      );
    }

    console.log("✅ [Sentences API] Environment variables verified");
    console.log("🔍 [Sentences API] Fetching onboarding data for userId:", userId);

    // Create DynamoDB client
    const region = process.env.DYNAMODB_REGION || "us-west-1";
    const dynamoDbClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT,
      },
    });
    const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

    // Fetch onboarding data
    let onboardingData;
    try {
      onboardingData = await dynamoDb.send(
        new GetCommand({
          TableName: TableNames.ONBOARDING_CHAT,
          Key: { userId: userId },
        })
      );
    } catch (dynamoError: any) {
      console.error("❌ [Sentences API] DynamoDB error:", {
        error: dynamoError?.message || dynamoError,
        name: dynamoError?.name,
        code: dynamoError?.code,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch onboarding data",
          errorCode: "DYNAMODB_ERROR",
        },
        { status: 500 }
      );
    }

    if (!onboardingData.Item) {
      console.error("❌ [Sentences API] Onboarding data not found for userId:", userId);
      return NextResponse.json(
        { error: "Onboarding data not found", errorCode: "ONBOARDING_DATA_NOT_FOUND" },
        { status: 404 }
      );
    }

    console.log("✅ [Sentences API] Onboarding data retrieved");

    const onboarding = onboardingData.Item;
    const proofMethod = onboarding.proofMethod || "";
    const why = onboarding.why || "";
    const goal = onboarding.goal || "";
    const structuredSchedule = onboarding.structuredSchedule || {};

    console.log("📋 [Sentences API] Extracted onboarding data:", {
      goal,
      why,
      proofMethod,
    });

    if (!proofMethod || !why || !goal) {
      console.error("❌ [Sentences API] Missing proofMethod, why, or goal in onboarding data");
      return NextResponse.json(
        { error: "Missing proofMethod, why, or goal in onboarding data", errorCode: "MISSING_ONBOARDING_FIELDS" },
        { status: 400 }
      );
    }

    console.log("🔍 [Sentences API] Generating sentences with Claude...");
    console.log("📝 [Sentences API] Sending to Claude - Goal:", goal, "| Why:", why, "| ProofMethod:", proofMethod);

    const sentences = await generateSentencesWithClaude(proofMethod, why, goal);

    if (!sentences) {
      console.error("❌ [Sentences API] Failed to generate sentences");
      return NextResponse.json(
        {
          error: "Failed to generate sentences",
          errorCode: "CLAUDE_GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    console.log("✅ [Sentences API] Sentences generated successfully");

    // Calculate monthly submissions based on schedule
    const scheduleDays = structuredSchedule.days || [];
    const frequency = structuredSchedule.frequency || "weekly";

    let monthlySubmissions = 0;
    if (frequency === "weekly" && scheduleDays.length > 0) {
      monthlySubmissions = Math.round(scheduleDays.length * 4.33);
    } else if (frequency === "daily") {
      monthlySubmissions = 30;
    } else {
      monthlySubmissions = Math.round(3 * 4.33);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Sentences API] Successfully completed in ${duration}ms`);

    return NextResponse.json({
      sentences: {
        sentence1: sentences.sentence1,
        sentence2: sentences.sentence2,
        sentence3: sentences.sentence3,
      },
      goal,
      monthlySubmissions,
      scheduleDays,
      frequency,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ [Sentences API] Unexpected error after", duration, "ms:", {
      error: error?.message || error,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: "Failed to generate sentences", errorCode: "UNEXPECTED_ERROR" },
      { status: 500 }
    );
  }
}