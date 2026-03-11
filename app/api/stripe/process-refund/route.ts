import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { dynamoDb, TableNames } from "@/services/aws/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SubmissionDay } from "@/lib/generateSubmissionCalendar";

// Force Node.js runtime for Netlify compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscriptionId, paymentId, action } = body;

    if (action !== "pre_billing_check" && action !== "trial_refund_check") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const isTrialCheck = action === "trial_refund_check";

    console.log(
      `Processing ${
        isTrialCheck ? "trial refund" : "pre-billing"
      } check for user ${userId}, payment ${paymentId}`
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

    // Determine period boundaries
    // For trial users, currentPeriodEnd is the trial end date
    // For active users, currentPeriodEnd is the billing period end date
    const subscriptionStart = new Date(user.currentPeriodStart);
    const subscriptionEnd = new Date(user.currentPeriodEnd);
    const checkTime = new Date(subscriptionEnd.getTime() - 3600000); // 1 hour before end
    const now = new Date();

    console.log(
      `Checking ${
        isTrialCheck ? "TRIAL" : "billing"
      } period: ${subscriptionStart.toISOString()} to ${subscriptionEnd.toISOString()} (checking at ${checkTime.toISOString()})`
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
        `Date Range: ${subscriptionStart.toISOString()} to ${checkTime.toISOString()} (period ends at ${subscriptionEnd.toISOString()})`
      );
      console.log(`Current time: ${new Date().toISOString()}`);
      console.log(
        `Total submissions in calendar: ${submissionCalendar.length}\n`
      );

      // Filter to submissions in billing period with proper criteria:
      // 1. Submission targetDate is within billing period (subscriptionStart to subscriptionEnd)
      // 2. Deadline is within billing period OR deadline has passed OR submission is already verified/denied
      //    (This allows early submissions to count if they're already completed)
      // 3. NOT already checked in a previous refund period
      // Note: We include ALL submissions with deadlines in the period (verified, denied, missed, pending)
      // because they all count as "expected" submissions for the refund calculation
      const submissionsInPeriod = submissionCalendar.filter((day) => {
        const submissionDate = new Date(day.targetDate);
        const deadline = new Date(day.deadline);

        // Must be in date range (use checkTime as upper bound - 1 hour before period end)
        // This ensures we check submissions up to 1 hour before billing, giving time for refund processing
        const inDateRange =
          submissionDate >= subscriptionStart && submissionDate <= checkTime;

        // Deadline must be:
        // - Within the billing period (deadline <= subscriptionEnd), OR
        // - Already passed (deadline <= now), OR
        // - Submission is already completed (verified/denied) - counts early submissions
        const deadlineInPeriod = deadline <= subscriptionEnd;
        const deadlinePassed = deadline <= now;
        const isCompleted =
          day.status === "verified" || day.status === "denied";
        const deadlineEligible =
          deadlineInPeriod || deadlinePassed || isCompleted;

        // Not already checked in a previous period
        const notAlreadyChecked = !day.refundCheckPeriod;

        // Debug logging for each submission
        const passes = inDateRange && deadlineEligible && notAlreadyChecked;
        console.log(
          `  ${day.targetDate} (${
            day.status
          }): inRange=${inDateRange}, deadlineEligible=${deadlineEligible} (inPeriod=${deadlineInPeriod}, passed=${deadlinePassed}, completed=${isCompleted}), notChecked=${notAlreadyChecked} → ${
            passes ? "✅ INCLUDED" : "❌ EXCLUDED"
          }`
        );
        if (!deadlineEligible) {
          console.log(
            `    └─ Deadline: ${deadline.toISOString()}, Period End: ${subscriptionEnd.toISOString()}, Now: ${now.toISOString()}`
          );
        }

        return inDateRange && deadlineEligible && notAlreadyChecked;
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

    // Check if this is the user's first billing cycle (not applicable for trial checks)
    let isFirstBillingCycle = false;

    if (!isTrialCheck) {
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
      isFirstBillingCycle = allUserChallenges.length <= 1;

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
    }

    // Calculate refund based on submissionCalendar completed count
    // Check if user has subscriptionType to determine which refund method to use
    const hasSubscriptionType = user.subscriptionType != null && user.subscriptionType !== '';
    
    console.log(
      `📊 Refund calculation method: ${isTrialCheck ? 'Trial' : hasSubscriptionType ? 'New (per-submission)' : 'Legacy (percentage-based)'}`
    );
    if (!isTrialCheck) {
      console.log(
        `   User subscriptionType: ${user.subscriptionType || 'not set (using legacy)'}`
      );
    }
    
    const refundCalculation = isTrialCheck
      ? calculateTrialRefund(allRelevantSubmissions.length, completedCount)
      : hasSubscriptionType
      ? await calculateRefundFromSubmissionsNew(
          allRelevantSubmissions.length,
          completedCount,
          user.stripeSubscriptionId,
          isFirstBillingCycle
        )
      : calculateRefundFromSubmissions(
          allRelevantSubmissions.length,
          completedCount,
          isFirstBillingCycle
        );

    console.log(
      `${isTrialCheck ? "Trial" : "Billing"} refund calculation for user ${userId}:`,
      refundCalculation
    );

    // Mark all submissions that were included in this refund check
    // This prevents double-counting in future billing periods
    const currentPeriodId = isTrialCheck
      ? `trial-${checkTime.getUTCFullYear()}-${String(
          checkTime.getUTCMonth() + 1
        ).padStart(2, "0")}`
      : `${checkTime.getUTCFullYear()}-${String(
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
      await processRefund(paymentId, refundCalculation, isFirstBillingCycle);
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
 * Calculate refund for trial period ($3 total)
 *
 * Trial period is 3 days, and user has already paid $3.
 * Refund is calculated per successful submission based on total submissions in the period.
 *
 * Refund structure:
 * - If 0 submissions in period: Full $3 refund
 * - Otherwise: $3 ÷ total submissions = refund per submission
 * - Refund amount = verified submissions × refund per submission
 *
 * Examples:
 * - 3 submissions: $3 ÷ 3 = $1 per submission
 * - 2 submissions: $3 ÷ 2 = $1.50 per submission
 * - 1 submission: $3 ÷ 1 = $3 per submission
 * - 0 submissions: Full $3 refund
 */
function calculateTrialRefund(
  totalExpected: number,
  verifiedCount: number
): {
  totalExpected: number;
  successfulSubmissions: number;
  missedSubmissions: number;
  completionRate: number;
  refundAmount: number;
  isFirstBillingCycle: boolean;
} {
  const missedSubmissions = totalExpected - verifiedCount;
  const TRIAL_PRICE = 3; // $3 trial price

  // Calculate completion rate
  const completionRate =
    totalExpected > 0 ? (verifiedCount / totalExpected) * 100 : 0;

  let refundAmount = 0;

  // If no submissions in the timeframe, full refund
  if (totalExpected === 0) {
    refundAmount = TRIAL_PRICE;
    console.log(
      `Trial: No submissions in period - Full $${TRIAL_PRICE} refund`
    );
  } else {
    // Calculate refund per submission: $3 ÷ total submissions
    const refundPerSubmission = TRIAL_PRICE / totalExpected;
    // Refund amount = verified submissions × refund per submission
    refundAmount = verifiedCount * refundPerSubmission;

    console.log(
      `Trial: ${verifiedCount}/${totalExpected} verified submissions - $${TRIAL_PRICE} ÷ ${totalExpected} = $${refundPerSubmission.toFixed(2)} per submission - Refund: $${refundAmount.toFixed(2)}`
    );
  }

  return {
    totalExpected,
    successfulSubmissions: verifiedCount,
    missedSubmissions,
    completionRate,
    refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
    isFirstBillingCycle: false, // Not applicable for trial
  };
}

/**
 * Calculate refund for NEW subscription types (per-submission based)
 * 
 * Calculation:
 * - Get subscription price from Stripe
 * - Refund per submission = price ÷ total submissions
 * - Refund amount = verified submissions × refund per submission
 * 
 * Note: If 0 submissions expected in period, refund is $0
 */
async function calculateRefundFromSubmissionsNew(
  totalExpected: number,
  verifiedCount: number,
  subscriptionId: string | null | undefined,
  isFirstBillingCycle: boolean
): Promise<{
  totalExpected: number;
  successfulSubmissions: number;
  missedSubmissions: number;
  completionRate: number;
  refundAmount: number;
  isFirstBillingCycle: boolean;
}> {
  const missedSubmissions = totalExpected - verifiedCount;
  
  // Calculate completion rate
  const completionRate =
    totalExpected > 0 ? (verifiedCount / totalExpected) * 100 : 0;

  let refundAmount = 0;
  let monthlyPrice = 0;

  if (!subscriptionId) {
    console.warn('⚠️ No subscription ID provided for new refund calculation');
    return {
      totalExpected,
      successfulSubmissions: verifiedCount,
      missedSubmissions,
      completionRate,
      refundAmount: 0,
      isFirstBillingCycle,
    };
  }

  try {
    // Get subscription from Stripe to get the price
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    // Get the first subscription item's price
    const subscriptionItem = subscription.items?.data?.[0];
    if (subscriptionItem?.price?.unit_amount) {
      monthlyPrice = subscriptionItem.price.unit_amount / 100; // Convert cents to dollars
    } else {
      console.warn('⚠️ Could not find price in subscription');
      return {
        totalExpected,
        successfulSubmissions: verifiedCount,
        missedSubmissions,
        completionRate,
        refundAmount: 0,
        isFirstBillingCycle,
      };
    }

    // Calculate refund from submissions
    if (totalExpected === 0) {
      // No submissions expected in the period
      refundAmount = 0;
      console.log(
        `New refund calculation: No submissions expected in period - $0 refund`
      );
    } else {
      // Calculate refund per submission: price ÷ total submissions
      const refundPerSubmission = monthlyPrice / totalExpected;
      // Refund amount = verified submissions × refund per submission
      refundAmount = verifiedCount * refundPerSubmission;

      console.log(
        `New refund calculation: ${verifiedCount}/${totalExpected} verified submissions - $${monthlyPrice} ÷ ${totalExpected} = $${refundPerSubmission.toFixed(2)} per submission - Refund: $${refundAmount.toFixed(2)}`
      );
    }
  } catch (error) {
    console.error('Error fetching subscription for new refund calculation:', error);
    return {
      totalExpected,
      successfulSubmissions: verifiedCount,
      missedSubmissions,
      completionRate,
      refundAmount: 0,
      isFirstBillingCycle,
    };
  }

  return {
    totalExpected,
    successfulSubmissions: verifiedCount,
    missedSubmissions,
    completionRate,
    refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
    isFirstBillingCycle,
  };
}

/**
 * Calculate refund based on submission completion rate (LEGACY - for users without subscriptionType)
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
    if (totalExpected === 0) {
      refundAmount = 0; // No submissions expected, no refund
      console.log(
        `Legacy refund calculation: No submissions expected in period - $0 refund`
      );
    } else if (completionRate >= 90) {
      refundAmount = 98;
    } else if (completionRate >= 70) {
      refundAmount = 49;
    } else if (completionRate >= 50) {
      refundAmount = 30;
    } else {
      refundAmount = 0; // No refund if below threshold
    }
  } else {
    // Subsequent billing cycles refund logic
    if (totalExpected === 0) {
      refundAmount = 0; // No submissions expected, no refund
      console.log(
        `Legacy refund calculation: No submissions expected in period - $0 refund`
      );
    } else if (completionRate >= 90) {
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
  },
  isFirstBillingCycle: boolean
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
    const originalCalculatedRefund = refundCalculation.refundAmount;
    let refundAmount = refundCalculation.refundAmount;
    const originalPaymentAmount = payment.amount;

    // Cap refund at original payment amount (Stripe limitation)
    // If calculated refund exceeds payment, user gets full refund
    const wasCapped = refundAmount > originalPaymentAmount;
    if (wasCapped) {
      console.log(
        `⚠️ Calculated refund ($${refundAmount}) exceeds original payment ($${originalPaymentAmount}). Capping at $${originalPaymentAmount}.`
      );
      refundAmount = originalPaymentAmount;
    }

    console.log(
      `Processing refund: Original payment: $${originalPaymentAmount}, Refund: $${refundAmount} (${refundCalculation.completionRate.toFixed(
        2
      )}% completion)`
    );

    // Process refund via Stripe using PaymentIntent (2025-10-29.clover API)
    if (!payment.stripeInvoiceId) {
      console.error("No Stripe invoice ID found in payment record");
      return;
    }

    // Get invoice to find customer ID (needed for refund)
    let customerId: string | null = null;
    let paymentIntentId = payment.stripePaymentIntentId;

    // Retrieve invoice to get customer ID
    try {
      const invoice = await stripe.invoices.retrieve(payment.stripeInvoiceId);
      customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id || null;

      if (!customerId) {
        console.error("No customer ID found on invoice");
      }
    } catch (error) {
      console.error("Error retrieving invoice:", error);
    }

    // If not stored, retrieve PaymentIntent from customer
    if (!paymentIntentId && customerId) {
      console.log(
        `Retrieving PaymentIntent from invoice: ${payment.stripeInvoiceId}`
      );

      try {
        // List PaymentIntents for this customer
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customerId,
          limit: 10,
        });

        console.log(
          `Found ${paymentIntents.data.length} PaymentIntents for customer`
        );

        // Get invoice amount for matching
        const invoice = await stripe.invoices.retrieve(payment.stripeInvoiceId);
        const invoiceAmount = invoice.amount_paid;

        // Find PaymentIntent that matches the invoice amount
        const matchingPI = paymentIntents.data.find((pi) => {
          const piAmount = pi.amount;
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
      } catch (error) {
        console.error("Error finding PaymentIntent:", error);
      }
    } else if (paymentIntentId) {
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
