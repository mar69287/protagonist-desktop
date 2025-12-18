import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SubmissionDay } from "@/lib/generateSubmissionCalendar";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscriptionId, action } = body;

    if (action !== "pre_billing_check") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    console.log(`Processing pre-billing check for user ${userId}`);

    // Get the user from DynamoDB
    const userResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.USERS,
        Key: { userId },
      })
    );

    if (!userResult.Item) {
      console.error(`User ${userId} not found`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.Item;

    if (!user.currentPeriodStart || !user.currentPeriodEnd) {
      console.error(`User ${userId} missing subscription period dates`);
      return NextResponse.json(
        { error: "User subscription period not found" },
        { status: 400 }
      );
    }

    if (!user.currentChallengeId) {
      console.error(`User ${userId} has no current challenge`);
      return NextResponse.json(
        { error: "User has no current challenge" },
        { status: 400 }
      );
    }

    // Get current challenge to check expected submissions
    const currentChallengeResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.CHALLENGES,
        Key: { challengeId: user.currentChallengeId },
      })
    );

    if (!currentChallengeResult.Item) {
      console.error(`Challenge ${user.currentChallengeId} not found`);
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const currentChallenge = currentChallengeResult.Item;

    console.log(
      `Found challenge: ${currentChallenge.challengeId}, created: ${currentChallenge.createdAt}, status: ${currentChallenge.status}`
    );

    // Billing period boundaries
    const subscriptionStart = new Date(user.currentPeriodStart);
    const subscriptionEnd = new Date(user.currentPeriodEnd);
    const checkTime = new Date(subscriptionEnd.getTime() - 3600000); // 1 hour before end

    console.log(
      `Checking billing period: ${
        user.currentPeriodStart
      } to ${checkTime.toISOString()}`
    );

    // Check if current challenge started before or after the billing period started
    const currentChallengeStart = new Date(currentChallenge.startDate);
    const challengesToCheck = [currentChallenge];

    // If current challenge started AFTER billing period start,
    // we need to also check the previous challenge
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");

    if (currentChallengeStart > subscriptionStart) {
      console.log(
        `Current challenge started ${currentChallenge.startDate} (after period start), checking for previous challenge`
      );

      // Get all user challenges sorted by creation date
      const userChallengesResult = await dynamoDb.send(
        new QueryCommand({
          TableName: TableNames.CHALLENGES,
          IndexName: "userId-createdAt-index",
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          ScanIndexForward: true, // Sort ascending by createdAt (oldest first)
        })
      );

      const allChallenges = userChallengesResult.Items || [];

      // Find the previous challenge (the one before current)
      const currentIndex = allChallenges.findIndex(
        (c) => c.challengeId === user.currentChallengeId
      );

      if (currentIndex > 0) {
        const previousChallenge = allChallenges[currentIndex - 1];
        challengesToCheck.unshift(previousChallenge); // Add to beginning
        console.log(
          `Found previous challenge ${previousChallenge.challengeId}, checking both`
        );
      }
    } else {
      console.log(
        `Current challenge started ${currentChallenge.startDate} (before or at period start), only checking this challenge`
      );
    }

    // Collect all submission days from submissionCalendar(s) that fall within billing period
    const allRelevantSubmissions: SubmissionDay[] = [];
    // const now = new Date(); // Temporarily disabled for testing

    console.log(
      `Checking ${challengesToCheck.length} challenge(s) for submissions:`,
      challengesToCheck.map((c) => c.challengeId)
    );

    for (const challenge of challengesToCheck) {
      const submissionCalendar: SubmissionDay[] =
        challenge.submissionCalendar || [];

      // Filter to submissions in billing period
      // For testing: Temporarily removed deadline check to allow future dates
      const submissionsInPeriod = submissionCalendar.filter((day) => {
        const submissionDate = new Date(day.targetDate);
        // const deadline = new Date(day.deadline); // Temporarily disabled
        return (
          submissionDate >= subscriptionStart && submissionDate <= checkTime
          // && deadline <= now // Temporarily disabled for testing future dates
        );
      });

      allRelevantSubmissions.push(...submissionsInPeriod);

      console.log(
        `Challenge ${challenge.challengeId}: ${submissionsInPeriod.length} submissions in billing period`
      );

      // Log the submission calendar details for this challenge
      console.log(`  Submission calendar for ${challenge.challengeId}:`);
      console.log(`  Total calendar entries: ${submissionCalendar.length}`);
      console.log(
        `  Submissions in billing period (${submissionsInPeriod.length}):`
      );
      submissionsInPeriod.forEach((sub, idx) => {
        console.log(
          `    ${idx + 1}. ${sub.targetDate} (${sub.dayOfWeek}): ${sub.status}`
        );
      });
    }

    console.log(
      `Total ${allRelevantSubmissions.length} submissions across ${challengesToCheck.length} challenge(s) for billing period`
    );

    // Count verified submissions from submissionCalendar status field
    const verifiedCount = allRelevantSubmissions.filter(
      (day) => day.status === "verified"
    ).length;

    console.log(
      `${verifiedCount} verified out of ${allRelevantSubmissions.length} expected`
    );

    // Log status breakdown
    const statusBreakdown = allRelevantSubmissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`  Status breakdown:`, statusBreakdown);

    // Check if this is the user's first billing cycle
    // Query all challenges to see if only one exists
    const allUserChallengesResult = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.CHALLENGES,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: true,
      })
    );

    const allUserChallenges = allUserChallengesResult.Items || [];
    const isFirstBillingCycle = allUserChallenges.length <= 1;

    console.log(
      `GSI Query returned ${allUserChallenges.length} challenge(s):`,
      allUserChallenges.map((c) => ({
        challengeId: c.challengeId,
        createdAt: c.createdAt,
      }))
    );
    console.log(
      `First billing cycle: ${isFirstBillingCycle} (user has ${allUserChallenges.length} total challenge(s))`
    );

    // Calculate refund based on submissionCalendar verified count
    const refundCalculation = calculateRefundFromSubmissions(
      allRelevantSubmissions.length,
      verifiedCount,
      isFirstBillingCycle
    );

    console.log(`Refund calculation for user ${userId}:`, refundCalculation);

    // If refund is needed, process it
    if (refundCalculation.refundAmount > 0) {
      await processRefund(userId, subscriptionId, refundCalculation);
    } else {
      console.log(`No refund needed for user ${userId}`);
    }

    // Delete the EventBridge rule since it's a one-time trigger
    try {
      const { deletePreBillingCheckRule } = await import(
        "@/services/aws/eventbridge"
      );
      await deletePreBillingCheckRule(userId, subscriptionId);
      console.log(
        `EventBridge rule deleted for user ${userId}, subscription ${subscriptionId}`
      );
    } catch (error) {
      console.error(
        `Failed to delete EventBridge rule for user ${userId}:`,
        error
      );
      // Don't fail the request if cleanup fails
    }

    return NextResponse.json({
      success: true,
      userId,
      subscriptionId,
      refundCalculation,
    });
  } catch (error) {
    console.error("Error processing pre-billing check:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate refund based on challengeSubmissions table data
 *
 * First Billing Cycle:
 * - 90%+ completion: Full refund ($98)
 * - 70-90% completion: $50 refund
 * - <70%: No refund
 *
 * Subsequent Billing Cycles:
 * - 90%+ completion: $50 refund
 * - 70-90% completion: $25 refund
 * - <70%: No refund
 */
function calculateRefundFromSubmissions(
  totalExpected: number,
  verifiedCount: number,
  isFirstBillingCycle: boolean
): {
  totalExpected: number;
  successfulSubmissions: number;
  missedSubmissions: number;
  completionRate: number;
  refundAmount: number;
  isFirstBillingCycle: boolean;
} {
  const missedSubmissions = totalExpected - verifiedCount;

  // Calculate completion rate
  const completionRate =
    totalExpected > 0 ? (verifiedCount / totalExpected) * 100 : 0;

  // Calculate refund amount based on tiered structure
  let refundAmount = 0;

  if (isFirstBillingCycle) {
    // First billing cycle refund logic
    if (completionRate >= 90) {
      refundAmount = 98; // Full refund
    } else if (completionRate >= 70) {
      refundAmount = 50;
    } else {
      refundAmount = 0; // No refund
    }
  } else {
    // Subsequent billing cycles refund logic
    if (completionRate >= 90) {
      refundAmount = 50;
    } else if (completionRate >= 70) {
      refundAmount = 25;
    } else {
      refundAmount = 0; // No refund
    }
  }

  console.log(
    `Completion: ${completionRate.toFixed(
      2
    )}% (${verifiedCount}/${totalExpected}) - First billing: ${isFirstBillingCycle} - Refund: $${refundAmount}`
  );

  return {
    totalExpected,
    successfulSubmissions: verifiedCount,
    missedSubmissions,
    completionRate,
    refundAmount,
    isFirstBillingCycle,
  };
}

/**
 * Process a refund for a user based on their subscription
 */
async function processRefund(
  userId: string,
  subscriptionId: string,
  refundCalculation: {
    refundAmount: number;
    successfulSubmissions: number;
    totalExpected: number;
    completionRate: number;
  }
): Promise<void> {
  try {
    // Get the most recent payment for this subscription
    const { QueryCommand } = await import("@aws-sdk/lib-dynamodb");

    const paymentResult = await dynamoDb.send(
      new QueryCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        FilterExpression:
          "subscriptionId = :subscriptionId AND #type = :paymentType AND #status = :succeededStatus",
        ExpressionAttributeNames: {
          "#type": "type",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":subscriptionId": subscriptionId,
          ":paymentType": "payment",
          ":succeededStatus": "succeeded",
        },
        ScanIndexForward: false, // Sort descending by createdAt
        Limit: 1,
      })
    );

    if (!paymentResult.Items || paymentResult.Items.length === 0) {
      console.error(`No payment found for subscription ${subscriptionId}`);
      return;
    }

    const payment = paymentResult.Items[0];
    const refundAmount = refundCalculation.refundAmount;

    console.log(
      `Processing refund: Original payment: $${
        payment.amount
      }, Refund: $${refundAmount} (${refundCalculation.completionRate.toFixed(
        2
      )}% completion)`
    );

    // Process refund via Stripe using PaymentIntent (2025-10-29.clover API)
    if (!payment.stripeInvoiceId) {
      console.error("No Stripe invoice ID found in payment record");
      return;
    }

    // Get PaymentIntent ID from payment record or invoice
    let paymentIntentId = payment.stripePaymentIntentId;

    // If not stored, retrieve from invoice by expanding payment_intent
    if (!paymentIntentId) {
      console.log(
        `Retrieving PaymentIntent from invoice: ${payment.stripeInvoiceId}`
      );

      try {
        // Get the invoice to find the customer
        const invoice = await stripe.invoices.retrieve(payment.stripeInvoiceId);
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) {
          console.error("No customer ID found on invoice");
        } else {
          console.log(
            `Searching PaymentIntents for customer ${customerId}, amount: ${invoice.amount_paid}`
          );

          // List PaymentIntents for this customer
          const paymentIntents = await stripe.paymentIntents.list({
            customer: customerId,
            limit: 10,
          });

          console.log(
            `Found ${paymentIntents.data.length} PaymentIntents for customer`
          );

          // Find PaymentIntent that matches the invoice amount
          const matchingPI = paymentIntents.data.find((pi) => {
            const piAmount = pi.amount;
            const invoiceAmount = invoice.amount_paid;
            const amountMatches = piAmount === invoiceAmount;

            console.log(
              `  Checking PI ${pi.id}: amount=${piAmount}, invoice amount=${invoiceAmount}, match=${amountMatches}`
            );

            return amountMatches && pi.status === "succeeded";
          });

          if (matchingPI) {
            paymentIntentId = matchingPI.id;
            console.log(`✅ Found matching PaymentIntent: ${paymentIntentId}`);
          } else {
            console.log(
              `No matching PaymentIntent found for invoice ${payment.stripeInvoiceId}`
            );
          }
        }
      } catch (error) {
        console.error("Error finding PaymentIntent:", error);
      }
    } else {
      console.log(`Using stored PaymentIntent: ${paymentIntentId}`);
    }

    // We need a PaymentIntent ID to create a refund
    if (!paymentIntentId) {
      console.error("Unable to find PaymentIntent for refund");
      console.error("Payment data:", {
        stripeInvoiceId: payment.stripeInvoiceId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
      });
      return;
    }

    console.log(
      `Creating refund for PaymentIntent ${paymentIntentId}, amount: $${refundAmount}`
    );

    // Create the refund using PaymentIntent (preferred method for 2025-10-29 API)
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: "requested_by_customer" as const,
      metadata: {
        userId,
        subscriptionId,
        completionRate: refundCalculation.completionRate.toFixed(2),
        successfulSubmissions:
          refundCalculation.successfulSubmissions.toString(),
        totalExpected: refundCalculation.totalExpected.toString(),
        stripeInvoiceId: payment.stripeInvoiceId,
      },
    });

    console.log(`Refund created: ${refund.id} for $${refundAmount}`);

    // Record the refund in payment history
    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: {
          paymentId: refund.id,
          userId,
          subscriptionId,
          type: "refund",
          amount: refundAmount,
          status: "succeeded",
          stripeInvoiceId: payment.stripeInvoiceId,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: null,
          refundReason: `Partial refund: ${refundCalculation.successfulSubmissions}/${refundCalculation.totalExpected} submissions completed`,
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log(`Refund recorded in payment history for user ${userId}`);
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error;
  }
}
