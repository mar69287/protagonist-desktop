import { NextResponse } from "next/server";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// Force Node.js runtime for Netlify compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const response = NextResponse.next();
  let cognitoUser: any = null;

  console.log("🔍 [Users Me API] Request received");
  console.log("🔍 [Users Me API] URL:", req.url);

  try {
    // Get authenticated user from Cognito
    console.log("🔐 [Users Me API] Authenticating user...");
    cognitoUser = await authenticatedUser({
      request: req as any,
      response: response as any,
    });

    if (!cognitoUser) {
      console.error("❌ [Users Me API] Unauthorized - no cognito user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ [Users Me API] User authenticated:", {
      userId: cognitoUser.userId,
      email: cognitoUser.email,
    });

    // Check for required AWS credentials
    if (
      !process.env.AWS_ACCESS_KEY_ID_NEXT ||
      !process.env.AWS_SECRET_ACCESS_KEY_NEXT
    ) {
      console.error("❌ [Users Me API] Missing AWS credentials in environment variables");
      console.error("❌ [Users Me API] AWS_ACCESS_KEY_ID_NEXT present:", !!process.env.AWS_ACCESS_KEY_ID_NEXT);
      console.error("❌ [Users Me API] AWS_SECRET_ACCESS_KEY_NEXT present:", !!process.env.AWS_SECRET_ACCESS_KEY_NEXT);
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create DynamoDB client with credentials
    // Use DYNAMODB_REGION instead of AWS_REGION (which is reserved by Netlify)
    const region = process.env.DYNAMODB_REGION || "us-west-1";
    const tableName = process.env.DYNAMODB_USERS_TABLE || "users";

    console.log("DynamoDB Configuration:", {
      region,
      tableName,
      hasCredentials: !!(
        process.env.AWS_ACCESS_KEY_ID_NEXT &&
        process.env.AWS_SECRET_ACCESS_KEY_NEXT
      ),
      userId: cognitoUser.userId,
    });

    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT,
      },
    });
    const dynamodb = DynamoDBDocumentClient.from(client);

    // Use the Cognito sub (userId) to fetch from DynamoDB
    // cognitoUser.userId is the Cognito 'sub' claim
    console.log("📡 [Users Me API] Querying DynamoDB for user:", cognitoUser.userId);
    
    const result = await dynamodb.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          userId: cognitoUser.userId, // This is the Cognito sub ID
        },
      })
    );

    console.log("📡 [Users Me API] DynamoDB query result:", !!result.Item ? "User found" : "User not found");

    if (!result.Item) {
      console.error("❌ [Users Me API] User not found in DynamoDB");
      console.error("❌ [Users Me API] Searched for userId:", cognitoUser.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the user data we're returning
    const userData = result.Item;
    console.log("✅ [Users Me API] Returning user data:", {
      userId: userData.userId,
      email: userData.email,
      hasStripeCustomerId: !!userData.stripeCustomerId,
      hasStripeSubscriptionId: !!userData.stripeSubscriptionId,
      subscriptionStatus: userData.subscriptionStatus,
    });

    return NextResponse.json({ user: result.Item });
  } catch (error: any) {
    console.error("❌ [Users Me API] Error fetching user:", error);
    console.error("❌ [Users Me API] Error details:", {
      error: error.message,
      errorType: error.__type || error.name,
      tableName: process.env.DYNAMODB_USERS_TABLE || "users",
      region: process.env.DYNAMODB_REGION || "us-west-1",
      userId: cognitoUser?.userId,
    });

    // Provide more specific error message for ResourceNotFoundException
    if (
      error.__type ===
        "com.amazonaws.dynamodb.v20120810#ResourceNotFoundException" ||
      error.name === "ResourceNotFoundException"
    ) {
      return NextResponse.json(
        {
          error: `DynamoDB table not found. Table: "${
            process.env.DYNAMODB_USERS_TABLE || "users"
          }", Region: "${process.env.DYNAMODB_REGION || "us-west-1"}"`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}
