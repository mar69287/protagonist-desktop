import { NextResponse } from "next/server";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(req: Request) {
  const response = NextResponse.next();

  try {
    // Get authenticated user from Cognito
    const cognitoUser = await authenticatedUser({
      request: req as any,
      response: response as any,
    });

    if (!cognitoUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for required AWS credentials
    if (
      !process.env.AWS_ACCESS_KEY_ID_NEXT ||
      !process.env.AWS_SECRET_ACCESS_KEY_NEXT
    ) {
      console.error("Missing AWS credentials in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create DynamoDB client with credentials
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-west-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT,
      },
    });
    const dynamodb = DynamoDBDocumentClient.from(client);

    // Use the Cognito sub (userId) to fetch from DynamoDB
    // cognitoUser.userId is the Cognito 'sub' claim
    const result = await dynamodb.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE || "users",
        Key: {
          userId: cognitoUser.userId, // This is the Cognito sub ID
        },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: result.Item });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}
