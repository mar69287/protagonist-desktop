import { NextRequest, NextResponse } from "next/server";
import { TableNames } from "@/services/aws/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import Anthropic from "@anthropic-ai/sdk";

// Force Node.js runtime for Netlify compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function generateSentencesWithClaude(
  proofMethod: string,
  why: string
): Promise<{ sentence1: string; sentence2: string; sentence3: string } | null> {
  try {
    const rawApiKey = process.env.CLAUDE_API_KEY;
    if (!rawApiKey) {
      console.error("❌ [Sentences API] CLAUDE_API_KEY not found in generateSentencesWithClaude");
      return null;
    }

    // Initialize Anthropic client lazily to avoid initialization errors
    const apiKey = rawApiKey.trim();
    console.log("🔑 [Sentences API] Using API key for Claude request:", {
      length: apiKey.length,
      preview: apiKey.length > 20 
        ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
        : `${apiKey.substring(0, Math.min(10, apiKey.length))}...`,
      startsWith: apiKey.substring(0, Math.min(7, apiKey.length)),
    });
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `You are a helpful assistant. Based on the user's proof method and their "why", generate three sentences:

1. First sentence: "Each day you upload proof of [action]. I'll check it."
   - Use the proofMethod to create a grammatically correct sentence
   - Don't literally insert the proofMethod text, but create a natural sentence based on it
   - End with "I'll check it."
   - Example: If proofMethod is "Screenshot of the certification programs you researched (browser tabs, notes, website pages)", generate "Each day you upload proof of researching certification programs. I'll check it."
   - Example: If proofMethod is "photo of workout", generate "Each day you upload proof of completing your workout. I'll check it."
   - Example: If proofMethod is "screenshot", generate "Each day you upload proof of your progress. I'll check it."

2. Second sentence: "If something seems off, a human reviews it."
   - This sentence is always the same, just return it exactly as written

3. Third sentence: "Because not [big overarching goal/why it matters] is worth putting something real on the line"
   - Use the "why" to fill in the overarching goal
   - Make it natural and meaningful
   - Example: If why is "to have more fulfillment and grow beyond stagnant fitness coaching", generate "Because not pursuing fulfillment and growth beyond stagnant fitness coaching is worth putting something real on the line"
   - Example: If why is "I want to be healthy", generate "Because not prioritizing your health is worth putting something real on the line"

Proof Method: ${proofMethod}
Why: ${why}

Generate ONLY the three sentences, one per line, nothing else.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("Claude response:", JSON.stringify(message.content));

    // Extract the text from Claude's response
    let content = "";
    for (const block of message.content) {
      if (block.type === "text") {
        content += block.text;
      }
    }

    if (!content) {
      console.error("No content in Claude response");
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

    console.error("Could not parse sentences from Claude response:", content);
    return null;
  } catch (error: any) {
    const errorStatus = error?.status || error?.statusCode;
    const errorMessage = error?.message || String(error);
    
    console.error("❌ [Sentences API] Error calling Claude API:", {
      error: errorMessage,
      name: error?.name,
      code: error?.code,
      status: errorStatus,
      stack: error?.stack,
    });

    // Provide specific error messages for common issues
    if (errorStatus === 401) {
      console.error("❌ [Sentences API] Claude API returned 401 Unauthorized. This usually means:");
      console.error("   1. The CLAUDE_API_KEY is invalid or expired");
      console.error("   2. The API key doesn't have the correct permissions");
      console.error("   3. The API key format is incorrect");
      console.error("   Please check your Netlify environment variables.");
    } else if (errorStatus === 429) {
      console.error("❌ [Sentences API] Claude API returned 429 Rate Limit. Too many requests.");
    } else if (errorStatus === 500 || errorStatus === 502 || errorStatus === 503) {
      console.error("❌ [Sentences API] Claude API server error. Please try again later.");
    }
    
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

    // Check for required environment variables early
    const rawApiKey = process.env.CLAUDE_API_KEY;
    
    // Log API key info for debugging (masked for security)
    if (rawApiKey) {
      const apiKeyLength = rawApiKey.length;
      const apiKeyPreview = rawApiKey.length > 20 
        ? `${rawApiKey.substring(0, 10)}...${rawApiKey.substring(apiKeyLength - 4)}`
        : `${rawApiKey.substring(0, Math.min(10, apiKeyLength)))}...`;
      const hasWhitespace = rawApiKey !== rawApiKey.trim();
      
      console.log("🔑 [Sentences API] CLAUDE_API_KEY info:", {
        exists: true,
        length: apiKeyLength,
        preview: apiKeyPreview,
        startsWith: rawApiKey.substring(0, Math.min(7, apiKeyLength)),
        hasWhitespace: hasWhitespace,
        trimmedLength: rawApiKey.trim().length,
      });
    } else {
      console.error("❌ [Sentences API] CLAUDE_API_KEY not found in environment variables");
      console.error("❌ [Sentences API] Available env vars starting with 'CLAUDE':", 
        Object.keys(process.env).filter(key => key.includes('CLAUDE')));
      return NextResponse.json(
        { 
          error: "Server configuration error: Missing API key",
          errorCode: "MISSING_CLAUDE_API_KEY"
        },
        { status: 500 }
      );
    }

    // Validate API key format (should start with 'sk-ant-' or 'sk-')
    const apiKey = rawApiKey.trim();
    if (!apiKey.startsWith('sk-ant-') && !apiKey.startsWith('sk-')) {
      console.error("❌ [Sentences API] CLAUDE_API_KEY appears to be invalid format");
      console.error("❌ [Sentences API] API key preview:", apiKey.substring(0, 20) + "...");
      console.error("❌ [Sentences API] Expected to start with 'sk-ant-' or 'sk-'");
      return NextResponse.json(
        { 
          error: "Server configuration error: Invalid API key format",
          errorCode: "INVALID_CLAUDE_API_KEY_FORMAT"
        },
        { status: 500 }
      );
    }
    
    console.log("✅ [Sentences API] CLAUDE_API_KEY format validated");

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID_NEXT || !process.env.AWS_SECRET_ACCESS_KEY_NEXT) {
      console.error("❌ [Sentences API] AWS credentials not found in environment variables");
      console.error("❌ [Sentences API] AWS_ACCESS_KEY_ID_NEXT present:", !!process.env.AWS_ACCESS_KEY_ID_NEXT);
      console.error("❌ [Sentences API] AWS_SECRET_ACCESS_KEY_NEXT present:", !!process.env.AWS_SECRET_ACCESS_KEY_NEXT);
      return NextResponse.json(
        { 
          error: "Server configuration error: Missing AWS credentials",
          errorCode: "MISSING_AWS_CREDENTIALS"
        },
        { status: 500 }
      );
    }

    console.log("✅ [Sentences API] Environment variables verified");

    console.log("🔍 [Sentences API] Fetching onboarding data for userId:", userId);

    // Create DynamoDB client with verified credentials
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
        userId,
        region,
        tableName: TableNames.ONBOARDING_CHAT,
      });
      return NextResponse.json(
        { 
          error: "Failed to fetch onboarding data",
          errorCode: "DYNAMODB_ERROR",
          details: dynamoError?.name || "Unknown DynamoDB error"
        },
        { status: 500 }
      );
    }

    if (!onboardingData.Item) {
      console.error("❌ [Sentences API] Onboarding data not found for userId:", userId);
      return NextResponse.json(
        { 
          error: "Onboarding data not found",
          errorCode: "ONBOARDING_DATA_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    console.log("✅ [Sentences API] Onboarding data retrieved");

    const onboarding = onboardingData.Item;
    const proofMethod = onboarding.proofMethod || "";
    const why = onboarding.why || "";
    const structuredSchedule = onboarding.structuredSchedule || {};

    if (!proofMethod || !why) {
      console.error("❌ [Sentences API] Missing proofMethod or why in onboarding data:", {
        userId,
        hasProofMethod: !!proofMethod,
        hasWhy: !!why,
      });
      return NextResponse.json(
        { 
          error: "Missing proofMethod or why in onboarding data",
          errorCode: "MISSING_ONBOARDING_FIELDS"
        },
        { status: 400 }
      );
    }

    console.log("🔍 [Sentences API] Generating sentences with Claude...");

    // Generate sentences using Claude
    const sentences = await generateSentencesWithClaude(proofMethod, why);

    if (!sentences) {
      console.error("❌ [Sentences API] Failed to generate sentences");
      // Check if it was a 401 error (we log it in the function, but need to return appropriate error)
      return NextResponse.json(
        { 
          error: "Failed to generate sentences. Please check Claude API key configuration.",
          errorCode: "CLAUDE_GENERATION_FAILED",
          hint: "This is usually caused by an invalid or missing CLAUDE_API_KEY in Netlify environment variables"
        },
        { status: 500 }
      );
    }

    console.log("✅ [Sentences API] Sentences generated successfully");

    // Calculate monthly amount based on submission frequency
    // For a 30-day month, calculate based on schedule days per week
    const scheduleDays = structuredSchedule.days || [];
    const frequency = structuredSchedule.frequency || "weekly";
    
    let monthlySubmissions = 0;
    if (frequency === "weekly" && scheduleDays.length > 0) {
      // Weekly frequency: days per week * 4.33 weeks per month
      monthlySubmissions = Math.round(scheduleDays.length * 4.33);
    } else if (frequency === "daily") {
      // Daily frequency: 30 days per month
      monthlySubmissions = 30;
    } else {
      // Default: assume 3 days per week if we can't determine
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
      monthlySubmissions: monthlySubmissions,
      scheduleDays: scheduleDays,
      frequency: frequency,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ [Sentences API] Unexpected error after", duration, "ms:", {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      type: typeof error,
    });
    return NextResponse.json(
      { 
        error: "Failed to generate sentences",
        errorCode: "UNEXPECTED_ERROR",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}