# Trial Period Refund System

## Overview

Users who sign up with the **$10 trial** option can now earn back their trial fee based on their performance during the 3-day trial period. This gives them immediate feedback and a chance to get money back before committing to the full $98/month subscription.

---

## Timeline & Payment Flow

### **Day 0: Signup**
- User pays: **$10** (trial fee)
- Subscription status: `trialing`
- Challenge created: **30 days** (full billing period)
- EventBridge rules created:
  1. **Trial refund check** - triggers 1 hour before trial ends (Day 3)
  2. **Monthly refund check** - triggers 1 hour before Day 30

### **Day 3 at 11:00 PM (1 hour before trial ends)**
- **Trial refund check triggers** via EventBridge
- System checks: Submissions during trial period (Days 0-3)
- Refund processed: Up to $10 based on completion rate
- User receives: Immediate refund to original payment method

### **Day 3 at Midnight (Trial ends)**
- Stripe charges: **$98** (first monthly payment)
- Subscription status: `trialing` → `active`
- Challenge continues: No interruption
- User keeps access regardless of trial refund

### **Day 30 at 11:00 PM (1 hour before next billing)**
- **Monthly refund check triggers** via EventBridge
- System checks: All submissions from Days 0-30 (EXCLUDING trial period already checked)
- Refund processed: Based on monthly refund structure
- Stripe charges: Next **$98** for following month

---

## Trial Refund Structure (Days 0-3)

| Completion Rate | Refund Amount | Notes |
|----------------|---------------|-------|
| **90%+ ✅** | $10 (full refund) | Exceptional performance |
| **70-89% 🟡** | $7 | Good performance |
| **50-69% 🟠** | $4 | Moderate performance |
| **< 50% ❌** | $0 | Below threshold |

### Example:
If a user has a schedule of 3 submissions during the trial:
- **3/3 verified** = 100% → $10 refund
- **2/3 verified** = 67% → $4 refund
- **1/3 verified** = 33% → $0 refund

---

## Monthly Refund Structure (Days 0-30)

### First Month After Trial:
Submissions during the trial period are **excluded** from the monthly refund calculation (they were already checked).

| Completion Rate | Refund Amount | Notes |
|----------------|---------------|-------|
| **90%+ ✅** | $98 + $10 bonus = $108 | Full refund + bonus |
| **70-89% 🟡** | $49 + $10 bonus = $59 | Partial + bonus |
| **50-69% 🟠** | $30 + $10 bonus = $40 | Small + bonus |
| **< 50% ❌** | $10 bonus only | Bonus only |

**Maximum Total First Month:** User pays $10 + $98 = $108, can get back up to $10 (trial) + $108 (monthly) = $118 total if they complete 90%+ for both periods.

### Subsequent Months:
| Completion Rate | Refund Amount |
|----------------|---------------|
| **90%+ ✅** | $50 |
| **70-89% 🟡** | $25 |
| **< 70% ❌** | $0 |

---

## Technical Implementation

### 1. **Webhook Handler** (`app/api/stripe/webhooks/route.ts`)

When a subscription is created with a trial:

```typescript
// Detect trial subscription
const trialEnd = fullSubscription.trial_end;

if (trialEnd && billingReason === "subscription_create") {
  // Create trial refund check (10 min before trial ends)
  await createTrialRefundCheckRule(
    userId,
    subscriptionId,
    invoice.id, // $10 payment invoice
    new Date(trialEnd * 1000)
  );
}

// Also create regular monthly refund check (1 hour before month ends)
await createPreBillingCheckRule(
  userId,
  subscriptionId,
  invoice.id,
  oneHourBeforeBilling
);
```

### 2. **EventBridge Rules** (`services/aws/eventbridge.ts`)

Two separate rules are created:

**Trial Refund Rule:**
- Name: `trial-refund-{userId}-{subscriptionId}-{YYYYMM}`
- Schedule: 1 hour before `trial_end`
- Action: `trial_refund_check`
- Payload includes: `trialEndTime`

**Monthly Refund Rule:**
- Name: `pre-billing-{userId}-{subscriptionId}-{YYYYMM}`
- Schedule: 1 hour before `current_period_end`
- Action: `pre_billing_check`
- Payload: Standard billing check

### 3. **Refund Processing** (`app/api/stripe/process-refund/route.ts`)

The refund processor handles both types of checks:

```typescript
const isTrialCheck = action === "trial_refund_check";

// Set period boundaries
if (isTrialCheck && trialEndTime) {
  // Check only trial period (Days 0-3)
  subscriptionStart = new Date(user.currentPeriodStart);
  subscriptionEnd = new Date(trialEndTime);
  checkTime = new Date(subscriptionEnd.getTime() - 3600000); // 1 hour
} else {
  // Check full billing period (Days 0-30)
  subscriptionStart = new Date(user.currentPeriodStart);
  subscriptionEnd = new Date(user.currentPeriodEnd);
  checkTime = new Date(subscriptionEnd.getTime() - 3600000);
}
```

**Key Features:**
- Trial checks use `calculateTrialRefund()` (max $10)
- Monthly checks use `calculateRefundFromSubmissions()` (varies by cycle)
- Submissions marked with period ID to prevent double-counting:
  - Trial: `trial-YYYY-MM`
  - Monthly: `YYYY-MM`

### 4. **Submission Calendar Filtering**

Submissions are filtered based on:
1. **Date Range:** Must fall within the check period
2. **Deadline:** Must be within period OR already passed OR already completed
3. **Not Already Checked:** `refundCheckPeriod` must be null or different period

```typescript
const submissionsInPeriod = submissionCalendar.filter((day) => {
  const inDateRange = 
    submissionDate >= subscriptionStart && 
    submissionDate <= checkTime;
  
  const deadlineEligible = 
    deadline <= subscriptionEnd || 
    deadline <= now || 
    (day.status === "verified" || day.status === "denied");
  
  const notAlreadyChecked = !day.refundCheckPeriod;
  
  return inDateRange && deadlineEligible && notAlreadyChecked;
});
```

---

## User Journey Examples

### Example 1: High Performer
**Schedule:** Submit daily (7 days/week)

**Trial Period (Days 0-3):**
- Expected: 3 submissions
- Completed: 3 verified ✅
- Completion: 100%
- **Trial Refund: $10**

**Day 3:** User gets $10 back, pays $98 to continue

**Full Month (Days 0-30):**
- Expected: 30 submissions
- Already checked (trial): 3 submissions
- Remaining to check: 27 submissions
- Completed: 27 verified ✅
- Completion: 100%
- **Monthly Refund: $108** ($98 + $10 bonus)

**Total Paid:** $10 + $98 = $108
**Total Refunded:** $10 + $108 = $118
**Net:** User made $10! 🎉

### Example 2: Cancel During Trial
**Schedule:** Submit 3x/week

**Trial Period (Days 0-3):**
- Expected: 1 submission
- Completed: 1 verified ✅
- Completion: 100%
- **Trial Refund: $10**

**Day 2:** User cancels subscription
**Day 3 (1 hour before trial ends):** User gets $10 refund
**Day 3 (trial ends):** Subscription canceled, NO $98 charge

**Total Paid:** $10
**Total Refunded:** $10
**Net:** User paid $0 and got to try the service ✅

### Example 3: Poor Performance
**Schedule:** Submit daily (7 days/week)

**Trial Period (Days 0-3):**
- Expected: 3 submissions
- Completed: 1 verified ❌
- Completion: 33%
- **Trial Refund: $0**

**Day 3:** User pays $98 to continue (no trial refund)

**Full Month (Days 0-30):**
- Expected: 30 submissions
- Already checked (trial): 3 submissions
- Remaining to check: 27 submissions
- Completed: 5 verified (total 6/30) ❌
- Completion: 20%
- **Monthly Refund: $10** (bonus only)

**Total Paid:** $10 + $98 = $108
**Total Refunded:** $0 + $10 = $10
**Net:** User paid $98 for the experience

---

## Benefits of This System

### For Users:
1. **Immediate Feedback:** Get money back after just 3 days
2. **Low Risk:** Can test the system for $10 and get it back if they perform well
3. **Motivation:** Knowing they can get the trial fee back encourages engagement
4. **Fair:** Trial submissions count toward overall progress

### For Business:
1. **Higher Conversion:** Users are more likely to try with refundable trial
2. **Quality Users:** Those who get refunds are engaged and likely to continue
3. **Reduced Churn:** Early positive reinforcement (refund) builds commitment
4. **Data Insights:** Can identify high-performers early in the trial

---

## Edge Cases Handled

### User Cancels After Trial Refund
- User gets $10 trial refund at Day 3
- User cancels before Day 30
- Result: NO monthly refund (no payment to refund)

### User Has No Submissions During Trial
- Trial refund: $0
- Monthly refund: Calculated based on Days 0-30 performance
- Trial submissions still excluded from monthly calculation

### Refund Exceeds Payment Amount
- Trial refunds capped at $10 (trial fee paid)
- Monthly refunds capped at payment amount
- Excess amount added as Stripe customer balance credit

### Trial Ends Mid-Day
- EventBridge triggers 1 hour before exact trial end time
- Gives time for refund processing before $98 charge
- Submissions with deadlines past the check time are excluded

---

## Configuration

### Environment Variables
```bash
# EventBridge Configuration
EVENTBRIDGE_TARGET_ARN=arn:aws:lambda:...
EVENTBRIDGE_ROLE_ARN=arn:aws:iam:...

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...  # $98/month
STRIPE_TRIAL_PRICE_ID=price_...  # $10 trial fee
```

### Timing Constants
```typescript
// In eventbridge.ts
const trialCheckOffset = 3600000; // 1 hour before trial end
const monthlyCheckOffset = 3600000; // 1 hour before billing
```

---

## Monitoring & Debugging

### Logs to Watch

**Trial Refund Check:**
```
🎯 Trial subscription detected - trial ends at: 2026-02-06T00:00:00.000Z
✅ Trial refund EventBridge rule created - will fire at 2026-02-05T23:00:00.000Z
Processing trial refund check for user xxx, payment inv_xxx
Checking TRIAL period: 2026-02-03 to 2026-02-06 (checking at 2026-02-05T23:00:00)
Trial Completion: 100.00% (3/3) - Refund: $10
Refund created: re_xxx for $10
```

**Monthly Refund Check:**
```
Processing pre-billing check for user xxx, payment inv_xxx
Checking billing period: 2026-02-03 to 2026-03-05 (checking at 2026-03-04T23:00:00)
Total 27 submissions across 1 challenge(s) (excluding 3 trial submissions)
Completion: 96.30% (26/27) - First billing: true - Refund: $108
```

### Common Issues

**Issue:** Trial refund not triggering
- Check EventBridge rule was created in webhook logs
- Verify `trial_end` exists on subscription
- Check rule schedule matches trial end time

**Issue:** Double-counting submissions
- Check `refundCheckPeriod` field on submissions
- Trial submissions should have `trial-YYYY-MM`
- Monthly submissions should have `YYYY-MM`

**Issue:** Wrong refund amount
- Verify which check type is running (trial vs monthly)
- Check completion rate calculation
- Verify payment amount in database

---

## Future Enhancements

1. **Email Notifications:**
   - Trial refund processed email
   - "You earned $X back!" message
   - Motivational email before trial ends

2. **Dashboard Display:**
   - Show trial progress in real-time
   - "X% complete - on track for $10 refund"
   - Trial countdown timer

3. **Flexible Trial Tiers:**
   - 3-day trial: $10
   - 7-day trial: $20
   - 14-day trial: $30

4. **Trial Extension:**
   - Allow one-time trial extension
   - Add extra days for edge cases

---

## Files Modified

- `services/aws/eventbridge.ts` - Added `createTrialRefundCheckRule()`
- `app/api/stripe/webhooks/route.ts` - Detect trial and create trial refund rule
- `app/api/stripe/process-refund/route.ts` - Handle trial refund checks, added `calculateTrialRefund()`
