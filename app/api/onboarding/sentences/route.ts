import { NextRequest, NextResponse } from "next/server";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import Anthropic from "@anthropic-ai/sdk";

// Force Node.js runtime for Netlify compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

async function generateSentencesWithClaude(
  proofMethod: string,
  why: string
): Promise<{ sentence1: string; sentence2: string; sentence3: string } | null> {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not found in environment variables");
      return null;
    }

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
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Fetch onboarding data
    const onboardingData = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.ONBOARDING_CHAT,
        Key: { userId: userId },
      })
    );

    if (!onboardingData.Item) {
      return NextResponse.json(
        { error: "Onboarding data not found" },
        { status: 404 }
      );
    }

    const onboarding = onboardingData.Item;
    const proofMethod = onboarding.proofMethod || "";
    const why = onboarding.why || "";
    const structuredSchedule = onboarding.structuredSchedule || {};

    if (!proofMethod || !why) {
      return NextResponse.json(
        { error: "Missing proofMethod or why in onboarding data" },
        { status: 400 }
      );
    }

    // Generate sentences using Claude
    const sentences = await generateSentencesWithClaude(proofMethod, why);

    if (!sentences) {
      return NextResponse.json(
        { error: "Failed to generate sentences" },
        { status: 500 }
      );
    }

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
  } catch (error) {
    console.error("Error generating sentences:", error);
    return NextResponse.json(
      { error: "Failed to generate sentences" },
      { status: 500 }
    );
  }
}