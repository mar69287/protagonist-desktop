import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";
import {
  UpdateCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { SubmissionDay } from "@/lib/generateSubmissionCalendar";
import {
  deletePreBillingCheckRule,
  deleteTrialRefundCheckRule,
} from "@/services/aws/eventbridge";

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

    // Get user from DynamoDB
    const userResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.USERS,
        Key: { userId: cognitoUser.userId },
      })
    );

    if (!userResult.Item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.Item;

    if (!user.currentPeriodStart || !user.currentPeriodEnd) {
      return NextResponse.json(
        { error: "User subscription period not found" },
        { status: 400 }
      );
    }

    if (!user.currentChallengeId) {
      return NextResponse.json(
        { error: "User has no current challenge" },
        { status: 400 }
      );
    }

    // Get the most recent payment for this subscription
    const paymentHistoryScan = await dynamoDb.send(
      new ScanCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        FilterExpression:
          "subscriptionId = :subscriptionId AND #type = :type AND #status = :status",
        ExpressionAttributeNames: {
          "#type": "type",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":subscriptionId": subscriptionId,
          ":type": "payment",
          ":status": "succeeded",
        },
      })
    );

    const payments = (paymentHistoryScan.Items || []).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (payments.length === 0) {
      return NextResponse.json(
        { error: "No payment found for this subscription" },
        { status: 404 }
      );
    }

    // Use the most recent payment (should be for current period)
    const paymentId = payments[0].paymentId;

    // Calculate refund based on current period submissions
    const subscriptionStart = new Date(user.currentPeriodStart);
    const subscriptionEnd = new Date(user.currentPeriodEnd);
    const now = new Date();

    // Get current challenge
    const currentChallengeResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.CHALLENGES,
        Key: { challengeId: user.currentChallengeId },
      })
    );

    if (!currentChallengeResult.Item) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const currentChallenge = currentChallengeResult.Item;

    // Get ALL user challenges to find which ones overlap with the subscription period
    const userChallengesResult = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.CHALLENGES,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": cognitoUser.userId,
        },
        ScanIndexForward: true, // Sort ascending by createdAt (oldest first)
      })
    );

    const allChallenges = userChallengesResult.Items || [];
    
    // Filter challenges that have submissions within the subscription period
    // A challenge is relevant if:
    // 1. It has a startDate that's before or during the period, AND
    // 2. It has submissions that fall within the subscription period
    const challengesToCheck = allChallenges.filter((challenge) => {
      const challengeStart = new Date(challenge.startDate);
      const challengeEnd = challenge.endDate ? new Date(challenge.endDate) : null;
      
      // Challenge is relevant if:
      // - It started before or during the subscription period, AND
      // - It hasn't ended yet, OR it ended during/after the subscription period started
      const startedBeforeOrDuringPeriod = challengeStart <= subscriptionEnd;
      const endedAfterPeriodStart = !challengeEnd || challengeEnd >= subscriptionStart;
      
      return startedBeforeOrDuringPeriod && endedAfterPeriodStart;
    });

    // If no challenges found, at least include the current challenge
    if (challengesToCheck.length === 0) {
      challengesToCheck.push(currentChallenge);
    }

    console.log(
      `Found ${challengesToCheck.length} challenge(s) with submissions in subscription period:`,
      challengesToCheck.map((c) => ({
        challengeId: c.challengeId,
        startDate: c.startDate,
        endDate: c.endDate,
      }))
    );

    // Collect all submission days from submissionCalendar(s) that fall within billing period
    const allRelevantSubmissions: SubmissionDay[] = [];

    for (const challenge of challengesToCheck) {
      const submissionCalendar: SubmissionDay[] =
        challenge.submissionCalendar || [];

      // All submissions in the full period (start → end) excluding already-refunded ones
      // These form the DENOMINATOR (totalExpected) - the full commitment they signed up for
      const submissionsInPeriod = submissionCalendar.filter((day) => {
        const submissionDate = new Date(day.targetDate);

        // Must be within the full subscription period (start to END, not just now)
        const inPeriodRange =
          submissionDate >= subscriptionStart && submissionDate <= subscriptionEnd;

        // Exclude submissions already counted in a previous refund period
        const notAlreadyChecked = !day.refundCheckPeriod;

        return inPeriodRange && notAlreadyChecked;
      });

      allRelevantSubmissions.push(...submissionsInPeriod);
    }

    // Count successful submissions: ONLY "verified" AND only up to NOW
    // These form the NUMERATOR - what they actually completed before cancelling
    const completedCount = allRelevantSubmissions.filter(
      (day) => day.status === "verified" && new Date(day.targetDate) <= now
    ).length;

    // Check if this is the user's first billing cycle
    const allUserChallengesResult = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.CHALLENGES,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": cognitoUser.userId,
        },
        ScanIndexForward: true,
      })
    );

    const allUserChallenges = allUserChallengesResult.Items || [];
    const isFirstBillingCycle = allUserChallenges.length <= 1;
    const isTrialCheck = user.subscriptionStatus === "trialing";

    // Calculate refund
    const hasSubscriptionType =
      user.subscriptionType != null && user.subscriptionType !== "";

    let refundCalculation;

    if (isTrialCheck) {
      // Trial refund calculation
      const TRIAL_PRICE = 3;
      const totalExpected = allRelevantSubmissions.length;
      let refundAmount = 0;

      if (totalExpected === 0) {
        refundAmount = TRIAL_PRICE;
      } else {
        const refundPerSubmission = TRIAL_PRICE / totalExpected;
        refundAmount = completedCount * refundPerSubmission;
      }

      refundCalculation = {
        totalExpected,
        successfulSubmissions: completedCount,
        missedSubmissions: totalExpected - completedCount,
        completionRate:
          totalExpected > 0 ? (completedCount / totalExpected) * 100 : 0,
        refundAmount: Math.round(refundAmount * 100) / 100,
        isFirstBillingCycle: false,
      };
    } else if (hasSubscriptionType) {
      // New per-submission refund calculation
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const subscriptionItem = subscription.items?.data?.[0];
      const monthlyPrice = subscriptionItem?.price?.unit_amount
        ? subscriptionItem.price.unit_amount / 100
        : 0;

      const totalExpected = allRelevantSubmissions.length;
      let refundAmount = 0;

      if (totalExpected === 0) {
        refundAmount = 0;
      } else {
        const refundPerSubmission = monthlyPrice / totalExpected;
        refundAmount = completedCount * refundPerSubmission;
      }

      refundCalculation = {
        totalExpected,
        successfulSubmissions: completedCount,
        missedSubmissions: totalExpected - completedCount,
        completionRate:
          totalExpected > 0 ? (completedCount / totalExpected) * 100 : 0,
        refundAmount: Math.round(refundAmount * 100) / 100,
        isFirstBillingCycle,
      };
    } else {
      // Legacy refund calculation
      const totalExpected = allRelevantSubmissions.length;
      const completionRate =
        totalExpected > 0 ? (completedCount / totalExpected) * 100 : 0;

      let refundAmount = 0;

      if (isFirstBillingCycle) {
        if (totalExpected === 0) {
          refundAmount = 0;
        } else if (completionRate >= 90) {
          refundAmount = 98;
        } else if (completionRate >= 70) {
          refundAmount = 49;
        } else if (completionRate >= 50) {
          refundAmount = 30;
        }
      } else {
        if (totalExpected === 0) {
          refundAmount = 0;
        } else if (completionRate >= 90) {
          refundAmount = 50;
        } else if (completionRate >= 70) {
          refundAmount = 25;
        }
      }

      refundCalculation = {
        totalExpected,
        successfulSubmissions: completedCount,
        missedSubmissions: totalExpected - completedCount,
        completionRate,
        refundAmount,
        isFirstBillingCycle,
      };
    }

    // Process refund if amount > 0
    if (refundCalculation.refundAmount > 0) {
      await processRefund(
        paymentId,
        {
          refundAmount: refundCalculation.refundAmount,
          successfulSubmissions: refundCalculation.successfulSubmissions,
          totalExpected: refundCalculation.totalExpected,
          completionRate: refundCalculation.completionRate,
        },
        isFirstBillingCycle
      );
    }

    // Mark all counted submissions with refundCheckPeriod to prevent double-counting
    const periodId = `immediate-cancel-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    for (const challenge of challengesToCheck) {
      const updatedCalendar = (challenge.submissionCalendar || []).map(
        (day: SubmissionDay) => {
          const wasIncluded = allRelevantSubmissions.some(
            (sub) => sub.targetDate === day.targetDate
          );
          if (wasIncluded) {
            return { ...day, refundCheckPeriod: periodId };
          }
          return day;
        }
      );

      await dynamoDb.send(
        new UpdateCommand({
          TableName: TableNames.CHALLENGES,
          Key: { challengeId: challenge.challengeId },
          UpdateExpression: "SET submissionCalendar = :calendar, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":calendar": updatedCalendar,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
      console.log(`Marked ${allRelevantSubmissions.length} submissions with refundCheckPeriod: ${periodId}`);
    }

    // Delete EventBridge rules
    // Note: These functions handle ResourceNotFoundException gracefully
    // If rules aren't found (e.g., already deleted or have year-month suffix), that's okay
    try {
      await deletePreBillingCheckRule(cognitoUser.userId, subscriptionId);
    } catch (error) {
      console.error("Error deleting pre-billing EventBridge rule:", error);
      // Don't fail the request if rule deletion fails
    }

    try {
      await deleteTrialRefundCheckRule(cognitoUser.userId, subscriptionId);
    } catch (error) {
      console.error("Error deleting trial refund EventBridge rule:", error);
      // Don't fail the request if rule deletion fails
    }

    // Cancel subscription immediately in Stripe
    await stripe.subscriptions.cancel(subscriptionId);

    // Mark current challenge as completed
    if (user.currentChallengeId) {
      try {
        await dynamoDb.send(
          new UpdateCommand({
            TableName: TableNames.CHALLENGES,
            Key: { challengeId: user.currentChallengeId },
            UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":status": "completed",
              ":updatedAt": new Date().toISOString(),
            },
          })
        );
        console.log(`Marked challenge ${user.currentChallengeId} as completed`);
      } catch (error) {
        console.error(`Error marking challenge as completed:`, error);
        // Don't fail the request if challenge update fails
      }
    }

    // Update user in DynamoDB
    await dynamoDb.send(
      new UpdateCommand({
        TableName: TableNames.USERS,
        Key: {
          userId: cognitoUser.userId,
        },
        UpdateExpression:
          "SET subscriptionStatus = :status, cancelAtPeriodEnd = :cancel, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":status": "canceled",
          ":cancel": false,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({
      success: true,
      refundCalculation,
      message: "Subscription cancelled immediately",
    });
  } catch (error: any) {
    console.error("Error cancelling subscription immediately:", error);

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription immediately" },
      { status: 500 }
    );
  }
}

/**
 * Process a refund for a specific payment (reused from process-refund route)
 */
async function processRefund(
  paymentId: string,
  refundCalculation: {
    refundAmount: number;
    successfulSubmissions: number;
    totalExpected: number;
    completionRate: number;
  },
  isFirstBillingCycle: boolean
): Promise<void> {
  try {
    // Get the payment record
    const paymentResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Key: { paymentId },
      })
    );

    if (!paymentResult.Item) {
      console.error(`Payment record not found: ${paymentId}`);
      return;
    }

    const payment = paymentResult.Item;

    if (payment.type !== "payment" || payment.status !== "succeeded") {
      console.error(
        `Invalid payment record: type=${payment.type}, status=${payment.status}`
      );
      return;
    }

    let refundAmount = refundCalculation.refundAmount;
    const originalPaymentAmount = payment.amount;

    // Cap refund at original payment amount
    if (refundAmount > originalPaymentAmount) {
      refundAmount = originalPaymentAmount;
    }

    if (!payment.stripeInvoiceId) {
      console.error("No Stripe invoice ID found in payment record");
      return;
    }

    // Get invoice to find customer ID
    let customerId: string | null = null;
    let paymentIntentId = payment.stripePaymentIntentId;

    try {
      const invoice = await stripe.invoices.retrieve(payment.stripeInvoiceId);
      customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id || null;
    } catch (error) {
      console.error("Error retrieving invoice:", error);
    }

    // If not stored, retrieve PaymentIntent from customer
    if (!paymentIntentId && customerId) {
      try {
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customerId,
          limit: 10,
        });

        const invoice = await stripe.invoices.retrieve(payment.stripeInvoiceId);
        const invoiceAmount = invoice.amount_paid;

        const matchingPI = paymentIntents.data.find(
          (pi) => pi.amount === invoiceAmount && pi.status === "succeeded"
        );

        if (matchingPI) {
          paymentIntentId = matchingPI.id;
        }
      } catch (error) {
        console.error("Error finding PaymentIntent:", error);
      }
    }

    if (!paymentIntentId) {
      console.error("Unable to find PaymentIntent for refund");
      return;
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: "requested_by_customer" as const,
      metadata: {
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,
        completionRate: refundCalculation.completionRate.toFixed(2),
        successfulSubmissions: refundCalculation.successfulSubmissions.toString(),
        totalExpected: refundCalculation.totalExpected.toString(),
        stripeInvoiceId: payment.stripeInvoiceId,
        immediateCancellation: "true",
      },
    });

    console.log(`Refund created: ${refund.id} for $${refundAmount}`);

    // Record the refund in payment history
    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: {
          paymentId: refund.id,
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          type: "refund",
          amount: refundAmount,
          status: "succeeded",
          stripeInvoiceId: payment.stripeInvoiceId,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: null,
          refundReason: `Immediate cancellation refund: ${refundCalculation.successfulSubmissions}/${refundCalculation.totalExpected} submissions completed`,
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log(`Refund recorded in payment history`);
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error;
  }
}
