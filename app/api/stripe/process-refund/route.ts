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
    const { userId, subscriptionId, paymentId, action } = body;

    if (action !== "pre_billing_check") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    console.log(
      `Processing pre-billing check for user ${userId}, payment ${paymentId}`
    );

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

      console.log(
        `\n=== DEBUG: Checking Challenge ${challenge.challengeId} ===`
      );
      console.log(
        `Date Range: ${subscriptionStart.toISOString()} to ${checkTime.toISOString()}`
      );
      console.log(`Current time: ${new Date().toISOString()}`);
      console.log(
        `Total submissions in calendar: ${submissionCalendar.length}\n`
      );

      // Filter to submissions in billing period with proper criteria:
      // 1. Submission date is within billing period
      // 2. Deadline has PASSED (don't evaluate future submissions)
      // 3. NOT already checked in a previous refund period
      // Note: We include ALL submissions with passed deadlines (verified, denied, missed, pending)
      // because they all count as "expected" submissions for the refund calculation
      const submissionsInPeriod = submissionCalendar.filter((day) => {
        const submissionDate = new Date(day.targetDate);
        const deadline = new Date(day.deadline);
        const now = new Date();

        // Must be in date range
        const inDateRange =
          submissionDate >= subscriptionStart && submissionDate <= checkTime;

        // Deadline must have passed
        const deadlinePassed = deadline <= now;

        // Not already checked in a previous period
        const notAlreadyChecked = !day.refundCheckPeriod;

        // Debug logging for each submission
        const passes = inDateRange && deadlinePassed && notAlreadyChecked;
        console.log(
          `  ${day.targetDate} (${
            day.status
          }): inRange=${inDateRange}, deadlinePassed=${deadlinePassed}, notChecked=${notAlreadyChecked} → ${
            passes ? "✅ INCLUDED" : "❌ EXCLUDED"
          }`
        );
        if (!deadlinePassed) {
          console.log(
            `    └─ Deadline: ${deadline.toISOString()} vs Now: ${now.toISOString()}`
          );
        }

        return inDateRange && deadlinePassed && notAlreadyChecked;
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

    // Count successful submissions: ONLY "verified" (passed AI check)
    // "denied" means they submitted but failed AI check - counts as expected but NOT successful
    // "missed"/"pending" means they didn't submit - counts as expected but NOT successful
    const completedCount = allRelevantSubmissions.filter(
      (day) => day.status === "verified"
    ).length;

    console.log(
      `${completedCount} verified submissions out of ${allRelevantSubmissions.length} expected`
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

    // Calculate refund based on submissionCalendar completed count (verified + denied)
    const refundCalculation = calculateRefundFromSubmissions(
      allRelevantSubmissions.length,
      completedCount,
      isFirstBillingCycle
    );

    console.log(`Refund calculation for user ${userId}:`, refundCalculation);

    // Mark all submissions that were included in this refund check
    // This prevents double-counting in future billing periods
    const currentPeriodId = `${checkTime.getUTCFullYear()}-${String(
      checkTime.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    console.log(
      `Marking ${allRelevantSubmissions.length} submissions as checked for period ${currentPeriodId}`
    );

    // Update each challenge's submissionCalendar to mark checked submissions
    const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    for (const challenge of challengesToCheck) {
      const updatedCalendar = (challenge.submissionCalendar || []).map(
        (day: SubmissionDay) => {
          // If this submission was included in our check, mark it
          const wasIncluded = allRelevantSubmissions.some(
            (sub) => sub.targetDate === day.targetDate
          );
          if (wasIncluded) {
            return { ...day, refundCheckPeriod: currentPeriodId };
          }
          return day;
        }
      );

      await dynamoDb.send(
        new UpdateCommand({
          TableName: TableNames.CHALLENGES,
          Key: { challengeId: challenge.challengeId },
          UpdateExpression:
            "SET submissionCalendar = :calendar, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":calendar": updatedCalendar,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );

      console.log(
        `  Updated challenge ${challenge.challengeId} with refundCheckPeriod markers`
      );
    }

    // If refund is needed, process it
    if (refundCalculation.refundAmount > 0) {
      await processRefund(paymentId, refundCalculation);
    } else {
      console.log(`No refund needed for user ${userId}`);
      // Create a payment history record for the "no refund" decision
      await recordNoRefund(paymentId, refundCalculation);
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
 * Calculate refund based on submission completion rate
 *
 * Calculation:
 * - Total Expected: All submissions with passed deadlines in billing period
 * - Successful: Only "verified" submissions (passed AI check)
 * - Completion Rate: (verified / total expected) * 100
 *
 * Note: "denied" submissions count as expected but NOT successful
 *
 * First Billing Cycle:
 * - 90%+ completion: $98 refund
 * - 70-89% completion: $49 refund
 * - 50-69% completion: $30 refund
 * - <50%: No refund
 *
 * Subsequent Billing Cycles:
 * - 90%+ completion: $50 refund
 * - 70-89% completion: $25 refund
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
      refundAmount = 98;
    } else if (completionRate >= 70) {
      refundAmount = 49;
    } else if (completionRate >= 50) {
      refundAmount = 30;
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
 * Process a refund for a specific payment
 */
async function processRefund(
  paymentId: string,
  refundCalculation: {
    refundAmount: number;
    successfulSubmissions: number;
    totalExpected: number;
    completionRate: number;
  }
): Promise<void> {
  try {
    // Get the payment record directly by ID
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

    // Verify this is a payment record
    if (payment.type !== "payment" || payment.status !== "succeeded") {
      console.error(
        `Invalid payment record: type=${payment.type}, status=${payment.status}`
      );
      return;
    }
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
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,
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
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
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

    console.log(
      `Refund recorded in payment history for user ${payment.userId}`
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error;
  }
}

/**
 * Record a "no refund" decision in payment history for audit trail
 */
async function recordNoRefund(
  paymentId: string,
  refundCalculation: {
    refundAmount: number;
    successfulSubmissions: number;
    totalExpected: number;
    completionRate: number;
  }
): Promise<void> {
  try {
    // Validate paymentId before querying
    if (!paymentId) {
      console.error(`No paymentId provided, cannot record no-refund decision`);
      return;
    }

    console.log(`📝 Recording no-refund decision for paymentId: ${paymentId}`);

    // Get the payment record directly by ID
    const paymentResult = await dynamoDb.send(
      new GetCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Key: { paymentId },
      })
    );

    const payment = paymentResult.Item;

    if (!payment) {
      console.error(`Payment record not found: ${paymentId}`);
      return;
    }

    const timestamp = new Date().toISOString();

    // Create a unique ID for this no-refund record
    const noRefundRecordId = `no-refund-${payment.userId}-${payment.subscriptionId}-${timestamp}`;

    // Record the no-refund decision in payment history
    await dynamoDb.send(
      new PutCommand({
        TableName: TableNames.PAYMENT_HISTORY,
        Item: {
          paymentId: noRefundRecordId,
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          type: "refund",
          amount: 0,
          status: "not_eligible",
          stripeInvoiceId: payment.stripeInvoiceId || null,
          stripePaymentIntentId: payment.stripePaymentIntentId || null,
          stripeChargeId: null,
          refundReason: `No refund: ${
            refundCalculation.successfulSubmissions
          }/${
            refundCalculation.totalExpected
          } submissions completed (${refundCalculation.completionRate.toFixed(
            2
          )}% - threshold not met)`,
          createdAt: timestamp,
        },
      })
    );

    console.log(
      `No-refund decision recorded in payment history for user ${
        payment.userId
      }: ${refundCalculation.completionRate.toFixed(2)}% completion`
    );
  } catch (error) {
    console.error("Error recording no-refund decision:", error);
    // Don't throw - we don't want to fail the entire check if recording fails
  }
}
