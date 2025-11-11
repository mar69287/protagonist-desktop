import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user to find their subscription ID
    const userResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.USERS,
        Key: { userId },
      })
    );

    const user = userResult.Item;
    if (!user || !user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found for this user" },
        { status: 404 }
      );
    }

    // Cancel subscription at period end (user keeps access until billing period ends)
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update user immediately in database (webhook will also update as backup)
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId },
        UpdateExpression: `
          SET cancelAtPeriodEnd = :cancelAtPeriodEnd,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":cancelAtPeriodEnd": true,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      message:
        "Subscription will be cancelled at the end of the billing period",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription",
      },
      { status: 500 }
    );
  }
}
