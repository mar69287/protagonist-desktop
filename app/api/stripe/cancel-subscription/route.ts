import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  const response = NextResponse.next();

  try {
    // Get authenticated user
    const cognitoUser = await authenticatedUser({
      request: req as any,
      response: response as any,
    });

    if (!cognitoUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Cancel the subscription at period end in Stripe
    const subscription = (await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })) as any;

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

    // Update user in DynamoDB using Cognito sub as userId
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE || "users",
        Key: {
          userId: cognitoUser.userId, // Cognito sub ID
        },
        UpdateExpression:
          "SET cancelAtPeriodEnd = :cancel, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":cancel": true,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(
              (subscription.current_period_end as number) * 1000
            ).toISOString()
          : null,
      },
    });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
