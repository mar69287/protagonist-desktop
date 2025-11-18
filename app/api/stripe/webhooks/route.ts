import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

// Type helpers for Stripe properties that may not be recognized by TypeScript
type StripePaymentIntentWithInvoice = Stripe.PaymentIntent & {
  invoice?: string | Stripe.Invoice;
};

type StripeChargeWithPaymentIntent = Stripe.Charge & {
  payment_intent?: string | Stripe.PaymentIntent;
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature");
    return NextResponse.json(
      { error: "Missing stripe signature" },
      { status: 400 }
    );
  }

  try {
    const body = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
    }

    // Verify the event came from Stripe
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log(`Webhook received: ${event.type}`);

    // Handle specific events
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook Error: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }
}

// ============================================================================
// SUBSCRIPTION EVENTS
// ============================================================================

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`Subscription created: ${subscription.id}`);

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionItem = (subscription as any).items?.data?.[0];
    const currentPeriodStart = subscriptionItem?.current_period_start;
    const currentPeriodEnd = subscriptionItem?.current_period_end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;

    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: `
          SET stripeCustomerId = :customerId,
              stripeSubscriptionId = :subscriptionId,
              subscriptionStatus = :status,
              currentPeriodStart = :periodStart,
              currentPeriodEnd = :periodEnd,
              cancelAtPeriodEnd = :cancelAtPeriodEnd,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":customerId":
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id || null,
          ":subscriptionId": subscription.id,
          ":status": subscription.status,
          ":periodStart": currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : new Date().toISOString(),
          ":periodEnd": currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ":cancelAtPeriodEnd": cancelAtPeriodEnd ?? false,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`User ${userId} subscription created successfully`);

    const { GetCommand, QueryCommand } = await import("@aws-sdk/lib-dynamodb");

    const paymentHistory = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        Limit: 1,
      })
    );

    const isFirstSubscription =
      !paymentHistory.Items || paymentHistory.Items.length === 0;

    if (isFirstSubscription) {
      console.log(`First subscription for user ${userId} - creating Challenge`);

      // Fetch onboarding data
      const onboardingData = await dynamoDb.send(
        new GetCommand({
          TableName: TableNames.ONBOARDING_CHAT,
          Key: { userId: userId },
        })
      );

      if (!onboardingData.Item) {
        console.error(`No onboarding data found for user ${userId}`);
        return;
      }

      const onboarding = onboardingData.Item;
      const structuredSchedule = onboarding.structuredSchedule || {};

      // Generate challengeId
      const challengeId = uuidv4();

      // Create Challenge record
      await dynamoDb.send(
        new PutCommand({
          TableName: TableNames.CHALLENGES,
          Item: {
            challengeId: challengeId,
            userId: userId,
            subscriptionId: subscription.id,
            status: "active",

            // From onboarding
            goal: onboarding.goal,
            plan: onboarding.plan,
            schedule: onboarding.schedule, // Human-readable
            proofMethod: onboarding.proofMethod,
            submissionType: onboarding.submissionType,
            timezone: onboarding.timezone,

            // Structured schedule for logic
            scheduleDays: structuredSchedule.days || [],
            deadlineTime: structuredSchedule.deadline_time || "23:59",
            frequency: structuredSchedule.frequency || "weekly",

            // Tracking
            totalSubmissions: 0,
            successfulSubmissions: 0,
            currentCompletionRate: 0,

            // Billing period
            startDate: currentPeriodStart
              ? new Date(currentPeriodStart * 1000).toISOString()
              : new Date().toISOString(),
            endDate: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            nextBillingDate: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

            // Timestamps
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );

      console.log(`Challenge ${challengeId} created for user ${userId}`);

      // Update user with challengeId
      await dynamoDb.send(
        new UpdateCommand({
          TableName: TableNames.USERS,
          Key: { userId: userId },
          UpdateExpression: "SET currentChallengeId = :challengeId",
          ExpressionAttributeValues: {
            ":challengeId": challengeId,
          },
        })
      );

      console.log(`User ${userId} updated with challengeId ${challengeId}`);

      // TODO: Create EventBridge rule for checking before billing
      // const oneHourBeforeBilling = new Date(currentPeriodEnd * 1000 - 3600000);
      // await createEventBridgeRule(challengeId, oneHourBeforeBilling);
    } else {
      console.log(
        `User ${userId} has existing payment history - skipping Challenge creation`
      );
    }
  } catch (error) {
    console.error("Error updating user with subscription:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Subscription updated: ${subscription.id}`);

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  try {
    // Access period dates from subscription items (they're not at top level)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionItem = (subscription as any).items?.data?.[0];
    const currentPeriodStart = subscriptionItem?.current_period_start;
    const currentPeriodEnd = subscriptionItem?.current_period_end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;

    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: `
          SET subscriptionStatus = :status,
              currentPeriodStart = :periodStart,
              currentPeriodEnd = :periodEnd,
              cancelAtPeriodEnd = :cancelAtPeriodEnd,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":status": subscription.status,
          ":periodStart": currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : new Date().toISOString(),
          ":periodEnd": currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ":cancelAtPeriodEnd": cancelAtPeriodEnd ?? false,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`User ${userId} subscription updated successfully`);
  } catch (error) {
    console.error("Error updating user subscription:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: ${subscription.id}`);

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  try {
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: `
          SET subscriptionStatus = :status,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":status": "canceled",
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`User ${userId} subscription deleted successfully`);
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
    throw error;
  }
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Invoice payment succeeded: ${invoice.id}`);

  // In newer Stripe API versions, subscription is nested in parent.subscription_details
  const subscriptionId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).parent?.subscription_details?.subscription ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).subscription;

  console.log(`Subscription ID from invoice: ${subscriptionId}`);

  if (!subscriptionId) {
    console.log("No subscription associated with invoice");
    return;
  }

  try {
    // Get subscription to get user_id from metadata
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      throw new Error("No user_id in subscription metadata");
    }

    // Access period dates from subscription items (they're not at top level)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionItem = (subscription as any).items?.data?.[0];
    const currentPeriodStart = subscriptionItem?.current_period_start;
    const currentPeriodEnd = subscriptionItem?.current_period_end;

    // Update user with subscription period dates
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: `
          SET currentPeriodStart = :periodStart,
              currentPeriodEnd = :periodEnd,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":periodStart": currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : new Date().toISOString(),
          ":periodEnd": currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    // Note: In newer Stripe API (2025-10-29), charge IDs are not directly available on subscription invoices
    // We'll use the invoice ID as the primary identifier, which is sufficient for tracking
    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: {
          paymentId: invoice.id,
          userId: userId,
          subscriptionId: subscriptionId,
          type: "payment",
          amount: (invoice.amount_paid ?? 0) / 100, // Convert cents to dollars
          status: "succeeded",
          stripeInvoiceId: invoice.id,
          stripeChargeId: null, // Not available in newer API for subscription invoices
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log(`Payment recorded for user ${userId}`);
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Invoice payment failed: ${invoice.id}`);

  // In newer Stripe API versions, subscription is nested in parent.subscription_details
  const subscriptionId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).parent?.subscription_details?.subscription ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).subscription;
  if (!subscriptionId) {
    console.log("No subscription associated with invoice");
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      throw new Error("No user_id in subscription metadata");
    }

    // Update user status to past_due
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: `
          SET subscriptionStatus = :status,
              updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":status": "past_due",
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    // Create failed payment record
    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: {
          paymentId: `failed_${invoice.id}`,
          userId: userId,
          subscriptionId: subscriptionId,
          type: "failed_payment",
          amount: (invoice.amount_due ?? 0) / 100,
          status: "failed",
          stripeInvoiceId: invoice.id,
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log(`Failed payment recorded for user ${userId}`);

    // TODO: Send email notification to user about failed payment
  } catch (error) {
    console.error("Error handling failed payment:", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`Charge refunded: ${charge.id}`);

  try {
    // Get the payment intent to find subscription
    const chg = charge as StripeChargeWithPaymentIntent;
    const paymentIntentId =
      typeof chg.payment_intent === "string"
        ? chg.payment_intent
        : chg.payment_intent?.id;
    if (!paymentIntentId) {
      console.log("No payment intent associated with charge");
      return;
    }

    const paymentIntent = (await stripe.paymentIntents.retrieve(
      paymentIntentId
    )) as StripePaymentIntentWithInvoice;
    const invoiceId =
      typeof paymentIntent.invoice === "string"
        ? paymentIntent.invoice
        : paymentIntent.invoice?.id;

    if (!invoiceId) {
      console.log("No invoice associated with payment intent");
      return;
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);

    // In newer Stripe API versions, subscription is nested in parent.subscription_details
    const subscriptionId =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invoice as any).parent?.subscription_details?.subscription ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invoice as any).subscription;

    if (!subscriptionId) {
      console.log("No subscription associated with invoice");
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      throw new Error("No user_id in subscription metadata");
    }

    // Update the original payment record to mark it as refunded
    // Payment records use invoice ID as the paymentId
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Key: { paymentId: invoiceId },
        UpdateExpression: `
          SET #status = :status,
              #type = :type,
              stripeChargeId = :chargeId,
              refundReason = :reason
        `,
        ExpressionAttributeNames: {
          "#status": "status",
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":status": "refunded",
          ":type": "refund",
          ":chargeId": charge.id,
          ":reason": "Manual refund processed",
        },
      })
    );

    console.log(
      `Refund of $${
        (charge.amount_refunded ?? 0) / 100
      } recorded for user ${userId}`
    );
  } catch (error) {
    console.error("Error handling charge refund:", error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
  // This is usually handled by invoice.payment_succeeded
  // Add additional logic here if needed
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent failed: ${paymentIntent.id}`);
  // This is usually handled by invoice.payment_failed
  // Add additional logic here if needed
}
