# How the Refund System Works

## Overview

When a user subscribes, they get a challenge with scheduled submission days. One hour before their billing period renews, the system checks how many submissions they completed and issues a refund based on their completion rate.

## The Flow

```
1. User Subscribes (Stripe)
   ↓
2. Webhook creates Challenge with submissionCalendar
   ↓
3. EventBridge scheduled 1 hour before billing (stores userId)
   ↓
4. EventBridge triggers → Lambda → Your API (with userId)
   ↓
5. API gets user's currentChallengeId
   ↓
6. API checks if multiple challenges in this billing period
   ↓
7. API combines submissions from all relevant challenges
   ↓
8. API calculates completion rate
   ↓
9. API issues Stripe refund (if earned)
   ↓
10. EventBridge rule deleted (challenges continue if multi-month)
```

## Refund Tiers

### First Challenge

| Completion Rate | Refund |
| --------------- | ------ |
| 90% or more     | $98    |
| 70-89%          | $50    |
| Less than 70%   | $0     |

### Subsequent Challenges (2nd, 3rd, etc.)

| Completion Rate | Refund |
| --------------- | ------ |
| 90% or more     | $50    |
| 70-89%          | $25    |
| Less than 70%   | $0     |

## How Completion is Calculated

### Step 1: Get User's Billing Period

**IMPORTANT:** Uses `user.currentPeriodStart` and `user.currentPeriodEnd` from the Users table, **NOT** challenge dates.

**Why?** Challenges can span 3+ months, but we refund based on the CURRENT billing month only.

**Example:**

```
Challenge Duration: Nov 1 - Jan 31 (3 months)
Current Billing Period: Dec 1 - Dec 31
→ Only counts December submissions for December refund
```

### Step 2: Filter Submissions

```typescript
// Get user's billing dates
const subscriptionStart = new Date(user.currentPeriodStart); // Dec 1
const subscriptionEnd = new Date(user.currentPeriodEnd);     // Dec 31
const checkTime = subscriptionEnd - 1 hour;                   // Dec 30 11 PM

// Only count submissions in this billing period
const relevantSubmissions = submissionCalendar.filter(day =>
  day.targetDate >= subscriptionStart &&
  day.targetDate <= checkTime &&
  day.deadline <= now // Deadline has passed
);
```

### Step 3: Calculate Rate

```typescript
totalExpected = relevantSubmissions.length;
successful = relevantSubmissions.filter(day => day.status === "submitted").length;
completionRate = (successful / totalExpected) × 100;
```

### Step 4: Check for Multiple Challenges in Period

```typescript
// Get user's currentChallengeId
const currentChallenge = await getChallenge(user.currentChallengeId);

// Did current challenge start AFTER billing period?
if (currentChallenge.startDate > user.currentPeriodStart) {
  // User finished a previous challenge and started new one mid-period
  // Need to check BOTH challenges' submissions
  const previousChallenge = await getPreviousChallenge(userId);
  challengesToCheck = [previousChallenge, currentChallenge];
} else {
  // Only current challenge exists in this period
  challengesToCheck = [currentChallenge];
}
```

### Step 5: Combine Submissions

```typescript
// Collect submissions from all relevant challenges
let allSubmissions = [];
for (const challenge of challengesToCheck) {
  const filtered = challenge.submissionCalendar.filter(
    (day) => day.targetDate >= currentPeriodStart && day.targetDate <= checkTime
  );
  allSubmissions = allSubmissions.concat(filtered);
}
```

### Step 6: Detect First Billing Cycle

```typescript
// Is this user's first billing cycle ever?
const allUserChallenges = await getUserChallenges(userId);
const isFirstBillingCycle = allUserChallenges.length === 1;
```

### Step 7: Apply Refund Tier

```typescript
if (isFirstBillingCycle) {
  if (completionRate >= 90) return 98;
  if (completionRate >= 70) return 50;
  return 0;
} else {
  if (completionRate >= 90) return 50;
  if (completionRate >= 70) return 25;
  return 0;
}
```

### Step 8: Process Refund

```typescript
// Get latest payment
const payment = await getLatestPayment(userId, subscriptionId);

// Create Stripe refund
const refund = await stripe.refunds.create({
  charge: payment.stripeChargeId,
  amount: refundAmount * 100, // Convert to cents
  reason: "requested_by_customer",
});

// Record in DynamoDB
await saveRefund(refund, userId, subscriptionId);

// Delete EventBridge rule (one-time use per billing period)
// Note: Challenges are NOT marked as complete - they may span multiple months
await deleteEventBridgeRule(userId, subscriptionId);
```

## Example Scenario

### User Profile

- **First challenge**: Yes
- **Schedule**: Monday, Wednesday, Friday (3×/week)
- **Billing**: Dec 1 - Dec 31
- **Subscription cost**: $98

### Performance

- **Expected submissions in December**: 13
- **Completed**: 12
- **Missed**: 1

### Calculation

```
Completion Rate = (12 / 13) × 100 = 92.3%
First Challenge: YES
92.3% >= 90% → Refund: $98 ✅
```

### Timeline

```
Dec 1, 00:00 - Subscription starts
Dec 1, 00:01 - Challenge created, EventBridge scheduled
...user submits throughout the month...
Dec 30, 23:00 - EventBridge triggers refund check
Dec 30, 23:01 - Refund processed: $98
Dec 31, 00:00 - Next billing period starts
```

## Multi-Month Challenge Example

### Scenario A: Single Challenge Spanning Multiple Months

**User Profile:**

- **Challenge**: Nov 1 - Jan 31 (3 months)
- **Schedule**: 3×/week
- **Billing**: Monthly on the 1st
- **Current month**: December

**What Gets Counted:**

```
November (previous billing period):
  - 13 submissions scheduled
  - NOT COUNTED (previous period)

December (current billing period):
  - 13 submissions scheduled
  - COUNTED for December refund ✅
  - User completed 11/13 = 84.6%
  - Refund: $50 (first billing cycle, 70-89%)

January (future billing period):
  - 13 submissions scheduled
  - Will be counted for January refund
```

### Scenario B: Multiple Challenges in One Billing Period

**User Profile:**

- **First Challenge**: Nov 15 - Dec 15
- **Second Challenge**: Dec 16 - Jan 31
- **Billing**: Dec 1 - Dec 31
- **Schedule**: 3×/week for both

**What Gets Counted:**

```
First Challenge (Nov 15 - Dec 15):
  - Dec 1-15 submissions: 7 submissions ← COUNTED ✅

Second Challenge (Dec 16 - Jan 31):
  - Dec 16-30 submissions: 6 submissions ← COUNTED ✅

Total for December billing:
  - Combined: 13 submissions from both challenges
  - User completed: 12/13 = 92.3%
  - Refund: $98 (first billing cycle, 90%+)
```

### Key Point

- **Single challenge spanning months**: Each billing period checks only that month's submissions
- **Multiple challenges in one period**: Combines submissions from ALL challenges in that billing period
- **Challenges never marked "complete"**: They continue across billing periods

## Database Structure

### Users Table

```typescript
{
  userId: string;
  currentPeriodStart: string; // "2025-12-01T00:00:00.000Z"
  currentPeriodEnd: string; // "2025-12-31T23:59:59.999Z"
  subscriptionStatus: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}
```

### Challenges Table

```typescript
{
  challengeId: string;
  userId: string;
  subscriptionId: string;

  // Challenge duration (can be > 1 month)
  startDate: string;
  endDate: string;

  // Submission tracking
  submissionCalendar: [
    {
      targetDate: "2025-12-03",
      dayOfWeek: "Monday",
      deadline: "2025-12-03T23:00:00.000Z",
      status: "submitted" | "missed" | "pending",
      submissionId?: string,
      submittedAt?: string
    }
  ],

  // Note: Challenges are NOT marked complete by refund system
  // They continue until their endDate
  status: "active" | "completed",
  createdAt: string
}
```

### PaymentHistory Table

```typescript
{
  paymentId: string;
  userId: string;
  subscriptionId: string;
  type: "payment" | "refund",
  amount: number,
  status: "succeeded" | "failed",
  stripeChargeId: string,
  stripeInvoiceId: string,
  refundReason?: string,
  createdAt: string
}
```

## EventBridge Lifecycle

### Creation

```typescript
// When subscription created
const oneHourBeforeBilling = new Date(currentPeriodEnd - 3600000);
await createEventBridgeRule(userId, subscriptionId, oneHourBeforeBilling);
```

**Rule name**: `pre-billing-check-{userId}-{subscriptionId}`
**Schedule**: One-time cron expression
**Target**: Lambda function → Your API
**Payload**: userId + subscriptionId (NOT challengeId)

### Execution

```typescript
// At scheduled time
EventBridge → Lambda → POST /api/stripe/process-refund
{
  "userId": "user-123",
  "subscriptionId": "sub_abc",
  "action": "pre_billing_check"
}
```

### Cleanup

```typescript
// After refund processed
await deleteEventBridgeRule(userId, subscriptionId);
```

**Important**:

- Rules are one-time use per billing period
- Rule stores userId (not challengeId) to handle multiple challenges in one period
- Rules get deleted after firing to avoid clutter

## Edge Cases

### User subscribes mid-month

```
Subscription: Dec 15 - Jan 15
Expected submissions: 6 (half of December)
Refund check: Jan 14 at 11 PM
Only counts Dec 15-31 submissions
```

### Challenge already in progress

```
Challenge started: Nov 1
User subscribes: Dec 1
Refund check: Dec 30 at 11 PM
Only counts Dec 1-30 submissions (ignores November)
```

### User cancels subscription

```
Subscription ends: Dec 31
Refund check: Dec 30 at 11 PM (still runs)
Refund issued based on December performance
No future EventBridge rules created
Challenge continues if multi-month (not marked complete)
```

### User finishes challenge mid-month and starts new one

```
Challenge 1: Nov 15 - Dec 15 (completed Dec 15)
Challenge 2: Dec 16 - Jan 31 (started Dec 16)
Billing period: Dec 1 - Dec 31
Refund check: Dec 30 at 11 PM

→ Checks BOTH challenges
→ Counts submissions from Dec 1-15 (Challenge 1)
→ Counts submissions from Dec 16-30 (Challenge 2)
→ Combines for total completion rate
```

## Testing Without EventBridge

You can test the refund logic directly:

```bash
curl -X POST http://localhost:3000/api/stripe/process-refund \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "subscriptionId": "sub_test123",
    "action": "pre_billing_check"
  }'
```

This bypasses EventBridge and calls the refund logic directly.

## Summary

1. **Billing-period based**: Refunds calculated per billing period, not per challenge
2. **Multi-challenge support**: Handles multiple challenges within one billing period
3. **Tiered refunds**: Different amounts for first vs. subsequent billing cycles
4. **Automatic**: EventBridge triggers 1 hour before billing
5. **One-time rules**: EventBridge rules deleted after use (per billing period)
6. **Fair**: Each month stands on its own for multi-month challenges
7. **Non-destructive**: Challenges continue across months (not marked complete)
