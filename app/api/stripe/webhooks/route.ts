import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { UpdateCommand, PutCommand, QueryCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  generateSubmissionCalendar,
  SubmissionDay,
} from "@/lib/generateSubmissionCalendar";
import {
  createPreBillingCheckRule,
  createTrialRefundCheckRule,
} from "@/services/aws/eventbridge";

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

      case "payment_intent.created":
        // Handle PaymentIntent creation - link to invoice for refunds
        await handlePaymentIntentCreated(event.data.object);
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
    // Fetch the full subscription from Stripe API to ensure we have complete data
    // The webhook event sometimes has incomplete data
    const fullSubscription = await stripe.subscriptions.retrieve(
      subscription.id
    );
    console.log({ fullSubscription });
    console.log({ subscription });

    // Access period dates from the subscription object
    // Using type assertion as these properties exist but aren't in the type definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentPeriodStart = (fullSubscription as any).current_period_start;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentPeriodEnd = (fullSubscription as any).current_period_end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancelAtPeriodEnd = (fullSubscription as any).cancel_at_period_end;

    // Fallback: If current_period_start/end don't exist (flexible billing mode),
    // use billing_cycle_anchor and calculate the end date
    if (!currentPeriodStart || !currentPeriodEnd) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const billingCycleAnchor = (fullSubscription as any).billing_cycle_anchor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interval = (fullSubscription as any).plan?.interval || "month";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intervalCount = (fullSubscription as any).plan?.interval_count || 1;

      if (billingCycleAnchor) {
        // Calculate the next billing date from the anchor using UTC methods
        const anchorDate = new Date(billingCycleAnchor * 1000);
        const nextBillingDate = new Date(anchorDate);

        if (interval === "month") {
          // setUTCMonth handles different month lengths automatically
          nextBillingDate.setUTCMonth(
            nextBillingDate.getUTCMonth() + intervalCount
          );
        } else if (interval === "year") {
          nextBillingDate.setUTCFullYear(
            nextBillingDate.getUTCFullYear() + intervalCount
          );
        } else if (interval === "week") {
          nextBillingDate.setUTCDate(
            nextBillingDate.getUTCDate() + 7 * intervalCount
          );
        } else if (interval === "day") {
          nextBillingDate.setUTCDate(
            nextBillingDate.getUTCDate() + intervalCount
          );
        }

        currentPeriodStart = billingCycleAnchor;
        currentPeriodEnd = Math.floor(nextBillingDate.getTime() / 1000);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trialStart = (fullSubscription as any).trial_start;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trialEnd = (fullSubscription as any).trial_end;

    console.log(
      `Subscription period data: start=${currentPeriodStart}, end=${currentPeriodEnd}, trialStart=${trialStart}, trialEnd=${trialEnd}, status=${fullSubscription.status}`
    );

    // If there's a trial, use trial_start for period start and trial_end for period end
    // This way currentPeriodEnd reflects the actual trial period during trial
    // When trial converts to active, subscription.updated webhook will update to billing period
    const actualPeriodStart = trialStart || currentPeriodStart;
    const actualPeriodEnd = trialEnd || currentPeriodEnd;

    console.log(
      `Using actualPeriodStart=${actualPeriodStart ? new Date(actualPeriodStart * 1000).toISOString() : 'null'}, actualPeriodEnd=${actualPeriodEnd ? new Date(actualPeriodEnd * 1000).toISOString() : 'null'}`
    );

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
            typeof fullSubscription.customer === "string"
              ? fullSubscription.customer
              : fullSubscription.customer?.id || null,
          ":subscriptionId": fullSubscription.id,
          ":status": fullSubscription.status,
          ":periodStart": actualPeriodStart
            ? new Date(actualPeriodStart * 1000).toISOString()
            : new Date().toISOString(),
          ":periodEnd": actualPeriodEnd
            ? new Date(actualPeriodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ":cancelAtPeriodEnd": cancelAtPeriodEnd ?? false,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`User ${userId} subscription created successfully`);

    const existingChallenges = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.CHALLENGES,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        Limit: 1,
      })
    );

    const isFirstSubscription =
      !existingChallenges.Items || existingChallenges.Items.length === 0;

    if (isFirstSubscription) {
      // If this is the first subscription AND it's NOT a trial, set it to cancel at period end
      // For trial subscriptions, we'll set cancel_at_period_end when the first full monthly payment is made
      if (!trialEnd) {
        console.log(
          `First subscription for user ${userId} (no trial) - setting cancel_at_period_end to true`
        );

        // Update Stripe subscription to cancel at period end
        await stripe.subscriptions.update(fullSubscription.id, {
          cancel_at_period_end: true,
        });

        console.log(
          `Subscription ${fullSubscription.id} set to cancel at period end`
        );

        // Update DynamoDB to reflect this
        await dynamoDb.send(
          new UpdateCommand({
            TableName: TableNames.USERS,
            Key: { userId: userId },
            UpdateExpression: "SET cancelAtPeriodEnd = :cancel",
            ExpressionAttributeValues: {
              ":cancel": true,
            },
          })
        );
      } else {
        console.log(
          `First subscription for user ${userId} has trial - will set cancel_at_period_end after first full monthly payment`
        );
      }

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

      // Calculate start and end dates
      // For trial subscriptions, current_period_start is when the actual subscription begins (after trial)
      // So we need to use trial_start or "now" for the challenge start date
      // (trialStart and trialEnd are already declared above)

      // If there's a trial, start the challenge NOW (trial start time)
      // Otherwise, use current_period_start
      const startDate = trialStart
        ? new Date(trialStart * 1000).toISOString()
        : currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : new Date().toISOString();

      // Challenge should ALWAYS span the full 30-day billing period
      // Use current_period_end (billing period end), NOT trial_end
      const endDate = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log(
        `Challenge dates: startDate=${startDate}, endDate=${endDate}${
          trialEnd ? `, trialEnd=${new Date(trialEnd * 1000).toISOString()}` : ""
        }`
      );

      // Generate submission calendar
      const scheduleDays = structuredSchedule.days || [];
      const deadlineTime = structuredSchedule.deadline_time || "23:59";
      const timezone = onboarding.timezone || "America/Los_Angeles";

      let submissionCalendar: SubmissionDay[] = [];

      if (scheduleDays.length > 0) {
        try {
          submissionCalendar = generateSubmissionCalendar(
            startDate,
            endDate,
            scheduleDays,
            deadlineTime,
            timezone
          );
          console.log(
            `Generated ${submissionCalendar.length} submission days for challenge ${challengeId}`
          );
        } catch (error) {
          console.error(`Error generating submission calendar: ${error}`);
        }
      }

      // Capitalize first letter of why
      const why =
        onboarding.why && onboarding.why.length > 0
          ? onboarding.why.charAt(0).toUpperCase() + onboarding.why.slice(1)
          : onboarding.why;

      // Create Challenge record
      await dynamoDb.send(
        new PutCommand({
          TableName: TableNames.CHALLENGES,
          Item: {
            challengeId: challengeId,
            userId: userId,
            subscriptionId: fullSubscription.id,
            status: "active",

            // From onboarding
            goal: onboarding.goal,
            plan: onboarding.plan,
            schedule: onboarding.schedule, // Human-readable
            proofMethod: onboarding.proofMethod,
            submissionType: onboarding.submissionType,
            timezone: onboarding.timezone,
            why: why,

            // Structured schedule for logic
            scheduleDays: structuredSchedule.days || [],
            deadlineTime: structuredSchedule.deadline_time || "23:59",
            frequency: structuredSchedule.frequency || "weekly",

            // Submission calendar - NEW!
            submissionCalendar: submissionCalendar,

            // Tracking
            totalSubmissions: 0,
            successfulSubmissions: 0,
            currentCompletionRate: 0,

            // Billing period
            startDate: startDate,
            endDate: endDate,
            nextBillingDate: endDate,

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

      // EventBridge rule will be created in handleInvoicePaymentSucceeded
      // when we have the paymentId
    } else {
      console.log(
        `User ${userId} has existing challenge - skipping Challenge creation`
      );
    }
  } catch (error) {
    console.error("Error updating user with subscription:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Subscription updated: ${subscription.id}`);
  
  // Print full subscription object for debugging
  console.log("Full subscription object:");
  console.log(JSON.stringify({
    id: subscription.id,
    status: subscription.status,
    current_period_start: (subscription as any).current_period_start,
    current_period_end: (subscription as any).current_period_end,
    trial_start: (subscription as any).trial_start,
    trial_end: (subscription as any).trial_end,
    cancel_at_period_end: (subscription as any).cancel_at_period_end,
    billing_cycle_anchor: (subscription as any).billing_cycle_anchor,
  }, null, 2));

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  try {
    // Access period dates from the subscription object directly
    // Using type assertion as these properties exist but aren't in the type definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodStart = (subscription as any).current_period_start;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodEnd = (subscription as any).current_period_end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trialEnd = (subscription as any).trial_end;

    // If subscription is ACTIVELY in trial (status="trialing"), use trial_end for currentPeriodEnd
    // Otherwise use current_period_end (billing period end)
    // Note: trialEnd still exists after trial ends, so we must check status
    const actualPeriodEnd = subscription.status === "trialing" && trialEnd ? trialEnd : currentPeriodEnd;

    console.log(
      `Updating subscription: status=${subscription.status}, trialEnd=${trialEnd ? new Date(trialEnd * 1000).toISOString() : 'null'}, using ${subscription.status === "trialing" ? "trial end" : "billing period end"} for currentPeriodEnd`
    );
    console.log(
      `Period values from webhook: currentPeriodStart=${currentPeriodStart}, currentPeriodEnd=${currentPeriodEnd}`
    );

    // Build update expression dynamically - only update period dates if they exist in the webhook
    let updateExpression = `SET subscriptionStatus = :status, cancelAtPeriodEnd = :cancelAtPeriodEnd, updatedAt = :updatedAt`;
    const expressionAttributeValues: Record<string, any> = {
      ":status": subscription.status,
      ":cancelAtPeriodEnd": cancelAtPeriodEnd ?? false,
      ":updatedAt": new Date().toISOString(),
    };

    // Only update period dates if they're present in the webhook
    if (currentPeriodStart) {
      updateExpression += `, currentPeriodStart = :periodStart`;
      expressionAttributeValues[":periodStart"] = new Date(currentPeriodStart * 1000).toISOString();
    }
    
    if (actualPeriodEnd) {
      updateExpression += `, currentPeriodEnd = :periodEnd`;
      expressionAttributeValues[":periodEnd"] = new Date(actualPeriodEnd * 1000).toISOString();
    }

    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: { userId: userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    console.log(`✅ User ${userId} subscription updated in DynamoDB:`);
    console.log(`   status: ${subscription.status}`);
    console.log(`   currentPeriodStart: ${currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : 'null'}`);
    console.log(`   currentPeriodEnd: ${actualPeriodEnd ? new Date(actualPeriodEnd * 1000).toISOString() : 'null'}`);
    console.log(`   cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);
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

    // Get period dates from invoice (more reliable than subscription for flexible billing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoicePeriodStart = (invoice as any).period_start;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoicePeriodEnd = (invoice as any).period_end;

    console.log(`📄 Invoice details for ${invoice.id}:`);
    console.log(
      `  period_start: ${invoicePeriodStart} (${new Date(
        invoicePeriodStart * 1000
      ).toISOString()})`
    );
    console.log(
      `  period_end: ${invoicePeriodEnd} (${new Date(
        invoicePeriodEnd * 1000
      ).toISOString()})`
    );
    console.log(`  billing_reason: ${invoice.billing_reason}`);
    console.log(
      `  created: ${invoice.created} (${new Date(
        invoice.created * 1000
      ).toISOString()})`
    );

    // Determine the ACTUAL current period dates based on billing reason
    let actualPeriodStart = invoicePeriodStart;
    let actualPeriodEnd = invoicePeriodEnd;

    const billingReason = invoice.billing_reason;

    // For initial subscription creation, calculate the proper period end
    if (billingReason === "subscription_create") {
      console.log(
        `🆕 Initial subscription - calculating period from billing cycle anchor`
      );

      // Get subscription details for period calculation
      const fullSubscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const billingCycleAnchor = (fullSubscription as any).billing_cycle_anchor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interval = (fullSubscription as any).plan?.interval || "month";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intervalCount = (fullSubscription as any).plan?.interval_count || 1;

      if (billingCycleAnchor) {
        const anchorDate = new Date(billingCycleAnchor * 1000);
        const nextBillingDate = new Date(anchorDate);

        if (interval === "month") {
          nextBillingDate.setUTCMonth(
            nextBillingDate.getUTCMonth() + intervalCount
          );
        } else if (interval === "year") {
          nextBillingDate.setUTCFullYear(
            nextBillingDate.getUTCFullYear() + intervalCount
          );
        } else if (interval === "week") {
          nextBillingDate.setUTCDate(
            nextBillingDate.getUTCDate() + 7 * intervalCount
          );
        } else if (interval === "day") {
          nextBillingDate.setUTCDate(
            nextBillingDate.getUTCDate() + intervalCount
          );
        }

        actualPeriodStart = Math.floor(anchorDate.getTime() / 1000);
        actualPeriodEnd = Math.floor(nextBillingDate.getTime() / 1000);

        console.log(
          `  Calculated period: ${new Date(
            actualPeriodStart * 1000
          ).toISOString()} to ${new Date(actualPeriodEnd * 1000).toISOString()}`
        );
      }
    }
    // For renewals, the invoice represents the period that JUST ENDED
    // We need to calculate the NEW current period
    else if (
      billingReason === "subscription_cycle" ||
      billingReason === "subscription_update"
    ) {
      console.log(
        `🔄 Renewal detected - calculating NEW current period (invoice shows OLD period)`
      );

      // Get subscription details for interval calculation
      const fullSubscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interval = (fullSubscription as any).plan?.interval || "month";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intervalCount = (fullSubscription as any).plan?.interval_count || 1;

      // Current period START = invoice period END (the old period just ended)
      actualPeriodStart = invoicePeriodEnd;

      // Current period END = add one interval to period start
      const periodStartDate = new Date(actualPeriodStart * 1000);
      const periodEndDate = new Date(periodStartDate);

      if (interval === "month") {
        periodEndDate.setUTCMonth(periodEndDate.getUTCMonth() + intervalCount);
      } else if (interval === "year") {
        periodEndDate.setUTCFullYear(
          periodEndDate.getUTCFullYear() + intervalCount
        );
      } else if (interval === "week") {
        periodEndDate.setUTCDate(
          periodEndDate.getUTCDate() + 7 * intervalCount
        );
      } else if (interval === "day") {
        periodEndDate.setUTCDate(periodEndDate.getUTCDate() + intervalCount);
      }

      actualPeriodEnd = Math.floor(periodEndDate.getTime() / 1000);

      console.log(
        `  NEW current period: ${new Date(
          actualPeriodStart * 1000
        ).toISOString()} to ${new Date(actualPeriodEnd * 1000).toISOString()}`
      );
    }

    // Check if subscription is in trial before updating period dates
    const subscriptionToCheck = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Only update period dates if NOT in trial
    // During trial, the subscription.created webhook already set trial_end as currentPeriodEnd
    if (subscriptionToCheck.status === "trialing") {
      console.log(
        `⏸️  Skipping period update - subscription is in trial. Trial period already set by subscription.created webhook.`
      );
    } else {
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
            ":periodStart": actualPeriodStart
              ? new Date(actualPeriodStart * 1000).toISOString()
              : new Date().toISOString(),
            ":periodEnd": actualPeriodEnd
              ? new Date(actualPeriodEnd * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            ":updatedAt": new Date().toISOString(),
          },
        })
      );

      console.log(`✅ User ${userId} period updated in DynamoDB:`);
      console.log(
        `   currentPeriodStart: ${new Date(
          actualPeriodStart * 1000
        ).toISOString()}`
      );
      console.log(
        `   currentPeriodEnd: ${new Date(actualPeriodEnd * 1000).toISOString()}`
      );
    }

    // In API version 2025-10-29.clover, invoices don't include payment_intent directly
    // We need to list PaymentIntents associated with this invoice
    let paymentIntentId: string | null = null;

    try {
      console.log(
        `🔄 Searching for PaymentIntent associated with invoice ${invoice.id}...`
      );

      // List PaymentIntents for this customer that match the invoice
      const paymentIntents = await stripe.paymentIntents.list({
        customer:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id,
        limit: 10,
      });

      console.log(
        `Found ${paymentIntents.data.length} PaymentIntents for customer`
      );

      // Find the PaymentIntent that matches this invoice
      // Filter by amount and status, then pick the one with closest timestamp
      const candidatePaymentIntents = paymentIntents.data.filter((pi) => {
        const amountMatches = pi.amount === invoice.amount_paid;
        const isSucceeded = pi.status === "succeeded";
        return amountMatches && isSucceeded;
      });

      // Sort by time difference and take the closest one
      const matchingPI = candidatePaymentIntents.sort((a, b) => {
        const aDiff = Math.abs(invoice.created - a.created);
        const bDiff = Math.abs(invoice.created - b.created);
        return aDiff - bDiff;
      })[0];

      // Log all candidates for debugging
      candidatePaymentIntents.forEach((pi) => {
        const timeDiff = Math.abs(invoice.created - pi.created);
        const isMatch = pi === matchingPI;
        console.log(
          `  Checking PI ${pi.id}: amount=${pi.amount} (invoice=${
            invoice.amount_paid
          }), status=${pi.status}, timeDiff=${timeDiff}s → ${
            isMatch ? "✅ SELECTED (closest)" : "❌ not closest"
          }`
        );
      });

      if (matchingPI) {
        paymentIntentId = matchingPI.id;
        console.log(`✅ Found matching PaymentIntent: ${paymentIntentId}`);
      } else {
        console.log(
          `❌ No matching PaymentIntent found for invoice ${invoice.id}`
        );
      }
    } catch (error) {
      console.error("Error finding PaymentIntent:", error);
    }

    console.log(`💳 PaymentIntent ID: ${paymentIntentId || "Not found"}`);

    // Store payment record with PaymentIntent ID
    const paymentHistoryItem = {
      paymentId: invoice.id,
      userId: userId,
      subscriptionId: subscriptionId,
      type: "payment",
      amount: (invoice.amount_paid ?? 0) / 100, // Convert cents to dollars
      status: "succeeded",
      stripeInvoiceId: invoice.id,
      stripeChargeId: null, // Not available in newer API
      stripePaymentIntentId: paymentIntentId,
      createdAt: new Date().toISOString(),
    };

    console.log("📝 About to write PaymentHistory item to DynamoDB:");
    console.log(JSON.stringify(paymentHistoryItem, null, 2));

    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: paymentHistoryItem,
      })
    );

    console.log(
      `✅ Payment recorded for user ${userId} with PaymentIntent ${paymentIntentId}`
    );

    // Get subscription to check for trial
    const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trialEnd = (fullSubscription as any).trial_end;

    // Check if this is the first full monthly payment (amount > $10) after a trial
    // If so, set cancel_at_period_end = true
    const paymentAmount = (invoice.amount_paid ?? 0) / 100;
    if (paymentAmount > 10 && fullSubscription.status === "active") {
      console.log(
        `💰 Payment amount is $${paymentAmount} - checking if this is first full monthly payment`
      );

      // Scan payment history to see if there are any other payments > $10 for this subscription
      const paymentHistoryScan = await dynamoDb.send(
        new ScanCommand({
          TableName: TableNames.PAYMENT_HISTORY,
          FilterExpression: "subscriptionId = :subscriptionId AND amount > :amount AND #type = :type",
          ExpressionAttributeNames: {
            "#type": "type",
          },
          ExpressionAttributeValues: {
            ":subscriptionId": subscriptionId,
            ":amount": 10,
            ":type": "payment",
          },
        })
      );

      const previousFullPayments = paymentHistoryScan.Items || [];
      console.log(
        `Found ${previousFullPayments.length} payment(s) > $10 for subscription ${subscriptionId} (including current one)`
      );

      // If this is the first full payment (only 1 payment > $10 exists, which is the current one)
      if (previousFullPayments.length === 1) {
        console.log(
          `🎯 First full monthly payment detected - setting cancel_at_period_end to true`
        );

        try {
          // Update Stripe subscription to cancel at period end
          await stripe.subscriptions.update(fullSubscription.id, {
            cancel_at_period_end: true,
          });

          // Update DynamoDB to reflect this
          await dynamoDb.send(
            new UpdateCommand({
              TableName: TableNames.USERS,
              Key: { userId: userId },
              UpdateExpression: "SET cancelAtPeriodEnd = :cancel",
              ExpressionAttributeValues: {
                ":cancel": true,
              },
            })
          );

          console.log(
            `✅ Subscription ${fullSubscription.id} set to cancel at period end after first full payment`
          );
        } catch (error) {
          console.error(
            `Failed to set cancel_at_period_end for subscription ${fullSubscription.id}:`,
            error
          );
          // Don't fail the webhook if this update fails
        }
      }
    }

    // If this is a trial subscription, create a trial refund check FIRST
    if (trialEnd && billingReason === "subscription_create") {
      const trialEndDate = new Date(trialEnd * 1000);
      const oneHourBeforeTrialEnd = new Date(
        trialEndDate.getTime() - 3600000 // 1 hour
      );

      console.log(
        `🎯 Trial subscription detected - trial ends at: ${trialEndDate.toISOString()}`
      );

      try {
        await createTrialRefundCheckRule(
          userId,
          subscriptionId,
          invoice.id, // Use the $10 trial payment invoice ID
          trialEndDate
        );

        console.log(
          `✅ Trial refund EventBridge rule created for user ${userId} - will fire at ${oneHourBeforeTrialEnd.toISOString()} (1 hour before trial ends)`
        );
      } catch (error) {
        console.error(
          `Failed to create trial refund rule for user ${userId}:`,
          error
        );
        // Don't fail the webhook if EventBridge rule creation fails
      }

      // Skip creating monthly refund rule for trial subscriptions
      // The monthly rule will be created when the first $98 payment succeeds
      console.log(
        `⏭️  Skipping monthly refund rule creation for trial - will create when first full payment succeeds`
      );
    } else {
      // Create EventBridge rule for next billing cycle (1 hour before billing time)
      // Do this for non-trial initial subscriptions and all renewals
      console.log(
        `📅 Stripe will bill at: ${new Date(
          actualPeriodEnd * 1000
        ).toISOString()}`
      );

      const oneHourBeforeBilling = new Date(actualPeriodEnd * 1000 - 3600000); // Subtract 1 hour

      await createPreBillingCheckRule(
        userId,
        subscriptionId,
        invoice.id, // Pass the paymentId (invoice ID)
        oneHourBeforeBilling
      );

      const eventType =
        billingReason === "subscription_create"
          ? "initial subscription"
          : "renewal";
      console.log(
        `✅ EventBridge rule created for ${eventType} of user ${userId} - will fire at ${oneHourBeforeBilling.toISOString()} (1 hour before billing)`
      );
    }
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

async function handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent created: ${paymentIntent.id}`);

  try {
    // Get the invoice ID from the PaymentIntent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const piWithInvoice = paymentIntent as any;
    const invoiceId =
      typeof piWithInvoice.invoice === "string"
        ? piWithInvoice.invoice
        : piWithInvoice.invoice?.id;

    if (!invoiceId) {
      console.log(
        "No invoice associated with PaymentIntent yet, will update when invoice is created"
      );
      return;
    }

    console.log(
      `Updating payment record ${invoiceId} with PaymentIntent ${paymentIntent.id}`
    );

    // Update the payment record with the PaymentIntent ID
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Key: { paymentId: invoiceId },
        UpdateExpression: `SET stripePaymentIntentId = :paymentIntentId`,
        ExpressionAttributeValues: {
          ":paymentIntentId": paymentIntent.id,
        },
        // Only update if the record exists
        ConditionExpression: "attribute_exists(paymentId)",
      })
    );

    console.log(
      `✅ PaymentIntent ${paymentIntent.id} linked to payment ${invoiceId}`
    );
  } catch (error) {
    // If the record doesn't exist yet, that's okay - it will be created by invoice.payment_succeeded
    if (
      (error as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `Payment record doesn't exist yet for PaymentIntent ${paymentIntent.id}, will be created by invoice.payment_succeeded`
      );
    } else {
      console.error("Error updating payment with PaymentIntent ID:", error);
    }
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);

  try {
    // Get the invoice ID from the PaymentIntent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const piWithInvoice = paymentIntent as any;
    const invoiceId =
      typeof piWithInvoice.invoice === "string"
        ? piWithInvoice.invoice
        : piWithInvoice.invoice?.id;

    if (!invoiceId) {
      console.log("No invoice associated with PaymentIntent, skipping update");
      return;
    }

    console.log(
      `Updating payment record ${invoiceId} with PaymentIntent ${paymentIntent.id}`
    );

    // Update the payment record with the PaymentIntent ID
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Key: { paymentId: invoiceId },
        UpdateExpression: `SET stripePaymentIntentId = :paymentIntentId`,
        ExpressionAttributeValues: {
          ":paymentIntentId": paymentIntent.id,
        },
        // Only update if the record exists
        ConditionExpression: "attribute_exists(paymentId)",
      })
    );

    console.log(
      `✅ PaymentIntent ${paymentIntent.id} linked to payment ${invoiceId}`
    );
  } catch (error) {
    // If the record doesn't exist yet, that's okay - it will be created by invoice.payment_succeeded
    if (
      (error as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `Payment record doesn't exist yet for PaymentIntent ${paymentIntent.id}, will be created by invoice.payment_succeeded`
      );
    } else {
      console.error("Error updating payment with PaymentIntent ID:", error);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent failed: ${paymentIntent.id}`);
  // This is usually handled by invoice.payment_failed
  // Add additional logic here if needed
}
