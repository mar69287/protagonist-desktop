import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

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

    // Get subscription ID from query params
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Fetch subscription from Stripe with expanded fields
    const subscription = (await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice", "customer"],
    })) as any;

    // Period dates are in the subscription items, not at the top level
    // Get the first subscription item (most subscriptions have one item)
    const subscriptionItem = subscription.items?.data?.[0];

    // Debug: Log subscription structure
    console.log("=== Subscription Debug ===");
    console.log("Subscription ID:", subscription.id);
    console.log("Has items:", !!subscription.items);
    console.log("Items count:", subscription.items?.data?.length || 0);
    console.log(
      "Item current_period_start:",
      subscriptionItem?.current_period_start
    );
    console.log(
      "Item current_period_end:",
      subscriptionItem?.current_period_end
    );

    // Safely extract period dates from subscription item
    // Stripe returns timestamps in seconds, convert to milliseconds for Date
    let currentPeriodStart = subscriptionItem?.current_period_start
      ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
      : null;

    let currentPeriodEnd = subscriptionItem?.current_period_end
      ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
      : null;

    // If dates are missing from Stripe, try to get them from DynamoDB
    if (!currentPeriodStart || !currentPeriodEnd) {
      console.log(
        "Period dates missing from Stripe, fetching from DynamoDB..."
      );

      // Check for required AWS credentials
      if (
        process.env.AWS_ACCESS_KEY_ID_NEXT &&
        process.env.AWS_SECRET_ACCESS_KEY_NEXT
      ) {
        const client = new DynamoDBClient({
          region: process.env.DYNAMODB_REGION || "us-west-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID_NEXT,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_NEXT,
          },
        });
        const dynamodb = DynamoDBDocumentClient.from(client);

        const result = await dynamodb.send(
          new GetCommand({
            TableName: process.env.DYNAMODB_USERS_TABLE || "users",
            Key: { userId: cognitoUser.userId },
          })
        );

        if (result.Item) {
          if (!currentPeriodStart && result.Item.currentPeriodStart) {
            currentPeriodStart = result.Item.currentPeriodStart;
            console.log(
              "Using currentPeriodStart from DynamoDB:",
              currentPeriodStart
            );
          }
          if (!currentPeriodEnd && result.Item.currentPeriodEnd) {
            currentPeriodEnd = result.Item.currentPeriodEnd;
            console.log(
              "Using currentPeriodEnd from DynamoDB:",
              currentPeriodEnd
            );
          }
        }
      }
    }

    // If still missing, throw an error
    if (!currentPeriodStart || !currentPeriodEnd) {
      console.error("Missing period dates in subscription:", {
        subscription_item_current_period_start:
          subscriptionItem?.current_period_start,
        subscription_item_current_period_end:
          subscriptionItem?.current_period_end,
        has_items: !!subscription.items,
        items_count: subscription.items?.data?.length || 0,
      });
      throw new Error("Subscription period dates are missing");
    }

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      amount: subscription.items.data[0]?.price.unit_amount || 0,
      currency: subscription.items.data[0]?.price.currency || "usd",
    });
  } catch (error: any) {
    console.error("Error fetching subscription:", error);

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
