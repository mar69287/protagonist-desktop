# Trial Options Update - Summary

## Overview
Added the ability for users to choose between:
1. **With Trial**: $10 upfront for 3-day trial, then $98/month
2. **Without Trial**: $98/month immediately (no trial period)

Users can also cancel during the trial period from the manage subscription page.

---

## Changes Made

### 1. **Signup Page** (`app/subscriptions/signup/page.tsx`)

#### Added Trial Toggle UI
- Two-button toggle to select trial or no-trial option
- "With Trial" option is recommended and selected by default
- Dynamic pricing display based on selection
- Updated terms agreement text to reflect selected option

**Key Features:**
- Visual toggle buttons with hover states
- Real-time price display updates
- Clear messaging about what each option includes

#### State Management
```typescript
const [useTrial, setUseTrial] = useState(true); // Default to trial
```

---

### 2. **Checkout Form** (`services/stripe/CheckoutForm.tsx`)

#### Updated Props
```typescript
interface CheckoutFormProps {
  userId: string;
  email?: string;
  useTrial?: boolean; // NEW: defaults to true
}
```

#### API Call Update
Now passes `useTrial` parameter to the checkout session API:
```typescript
body: JSON.stringify({ userId, email, useTrial })
```

---

### 3. **Checkout Session API** (`app/api/stripe/checkout-session/route.ts`)

#### Conditional Trial Logic
- Accepts `useTrial` parameter (defaults to `true`)
- Conditionally adds trial price ID to line items
- Only sets `trial_period_days: 3` if `useTrial` is true
- Adds metadata to track if subscription has trial

**Line Items Logic:**
```typescript
// Always include monthly subscription
const lineItems = [{ price: priceId, quantity: 1 }];

// Add $10 trial fee only if user selected trial
if (useTrial) {
  lineItems.push({ price: trialPriceId, quantity: 1 });
}
```

**Subscription Data:**
```typescript
const subscriptionData = {
  metadata: { user_id: userId },
  ...(useTrial && { trial_period_days: 3 }) // Conditional trial period
};
```

---

### 4. **Manage Subscription Page** (`app/subscriptions/manage/page.tsx`)

#### Added Trial Status Support

**Updated User Type:**
```typescript
subscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid" | "trialing" | null;
```

**Updated Subscription Type:**
```typescript
interface Subscription {
  // ... existing fields
  trialEnd?: string | null; // NEW: trial end date
}
```

#### UI Updates for Trial Status

**Status Badge:**
- Shows "Trial" badge in gray when `status === "trialing"`
- Shows trial-specific messaging

**Billing Period Display:**
- Shows "Trial Ends" date when in trial
- Shows "First Billing Date" instead of "Next Billing Date"
- Displays days remaining in trial

**Cancellation Section:**
- Different messaging for trial vs active subscription
- "Cancel Trial" button during trial period
- Explains that $10 trial fee is non-refundable
- Clarifies that $98 monthly fee won't be charged if cancelled during trial

**Cancel Confirmation Modal:**
- Custom messaging for trial cancellations
- Shows trial end date
- Explains refund policy

---

### 5. **Get Subscription API** (`app/api/subscriptions/get-subscription/route.ts`)

#### Added Trial End Date
```typescript
return NextResponse.json({
  // ... existing fields
  trialEnd: subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null,
});
```

---

## User Flows

### Flow 1: Signup with Trial (Default)
1. User lands on signup page
2. "With Trial" option is pre-selected (recommended)
3. Shows: "$10 today" → "Try it out for 3 days" → "Then $98/month"
4. User agrees to terms and proceeds to checkout
5. Stripe charges $10 immediately
6. Subscription created with `status: "trialing"` and `trial_end` 3 days from now
7. After 3 days: First $98 charge, status changes to `active`

### Flow 2: Signup without Trial
1. User lands on signup page
2. User clicks "Without Trial" option
3. Shows: "$98/month" → "Start your commitment immediately"
4. User agrees to terms and proceeds to checkout
5. Stripe charges $98 immediately
6. Subscription created with `status: "active"` (no trial period)
7. Monthly billing continues

### Flow 3: Cancel During Trial
1. User with trial goes to manage subscription page
2. Sees "Trial Period" status with trial end date
3. Clicks "Cancel Trial" button
4. Modal explains: keep access until trial ends, $10 non-refundable, no $98 charge
5. User confirms cancellation
6. Subscription set to `cancel_at_period_end: true`
7. User keeps access until trial ends
8. No $98 charge occurs

### Flow 4: Cancel After Trial (Active Subscription)
1. User with active subscription goes to manage page
2. Sees "Active Subscription" status
3. Clicks "Cancel Subscription"
4. Modal explains: keep access until end of billing period
5. User confirms cancellation
6. Subscription set to `cancel_at_period_end: true`
7. User keeps access until period ends
8. No renewal charge occurs

---

## Subscription Status States

| Status | Description | User Experience |
|--------|-------------|-----------------|
| `trialing` | In 3-day trial period | Full access, $10 paid, awaiting first $98 charge |
| `active` | Paying monthly | Full access, recurring $98 charges |
| `past_due` | Payment failed | Limited/no access (configurable) |
| `canceled` | Subscription ended | No access |

---

## Testing Checklist

### Signup Flow
- [ ] Toggle between trial/no-trial options
- [ ] Verify correct pricing displays for each option
- [ ] Complete checkout with trial option
- [ ] Complete checkout without trial option
- [ ] Verify Stripe subscription status matches selection

### Trial Management
- [ ] View subscription during trial period
- [ ] See trial end date and days remaining
- [ ] Cancel during trial period
- [ ] Verify no $98 charge after trial cancellation
- [ ] Verify access continues until trial ends

### Active Subscription Management
- [ ] View active subscription (post-trial or no-trial)
- [ ] Cancel active subscription
- [ ] Verify access continues until period end
- [ ] Verify no renewal charge after cancellation

### Webhooks
- [ ] `customer.subscription.created` with trial
- [ ] `customer.subscription.created` without trial
- [ ] `invoice.payment_succeeded` for $10 trial fee
- [ ] `invoice.payment_succeeded` for $98 first charge (after trial)
- [ ] `customer.subscription.updated` when status changes
- [ ] `customer.subscription.deleted` on cancellation

---

## Environment Variables Required

```bash
# Existing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...  # $98/month recurring

# NEW (for trial option)
STRIPE_TRIAL_PRICE_ID=price_...  # $10 one-time trial fee

# For webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Stripe Dashboard Setup

### Products Needed

1. **Monthly Subscription** (already exists)
   - Price: $98/month
   - Billing: Recurring
   - Price ID: `STRIPE_PRICE_ID`

2. **Trial Fee** (create this)
   - Price: $10
   - Billing: **One off** (NOT recurring)
   - Price ID: `STRIPE_TRIAL_PRICE_ID`

---

## Key Implementation Details

### Why Two Line Items for Trial?
Stripe trials typically don't charge upfront. To charge $10 for the trial:
- Add the $10 one-time price as a separate line item
- This charges immediately at checkout
- The recurring $98 price is added but doesn't charge until trial ends

### Cancel During Trial Behavior
- Stripe sets `cancel_at_period_end: true`
- User keeps access until `trial_end` date
- No recurring charge occurs after trial ends
- The $10 trial fee is NOT refunded (one-time payment)

### Metadata Tracking
The checkout session includes:
```typescript
metadata: {
  plan_type: "goal_commitment",
  user_id: userId,
  has_trial: useTrial ? "true" : "false", // Track trial selection
}
```

---

## Files Modified

1. `app/subscriptions/signup/page.tsx` - Added trial toggle UI
2. `services/stripe/CheckoutForm.tsx` - Pass trial selection to API
3. `app/api/stripe/checkout-session/route.ts` - Conditional trial logic
4. `app/subscriptions/manage/page.tsx` - Trial status display & cancellation
5. `app/api/subscriptions/get-subscription/route.ts` - Return trial end date

---

## Next Steps / Future Enhancements

1. **Analytics**: Track trial vs no-trial conversion rates
2. **Email Notifications**: 
   - Trial ending reminder (1 day before)
   - Trial ended confirmation
   - First charge notification
3. **Trial Extension**: Allow extending trial period
4. **Different Trial Lengths**: Make trial duration configurable
5. **Trial Refund Policy**: Consider partial refunds for early cancellations

---

## Support & Troubleshooting

### Common Issues

**Issue**: "STRIPE_TRIAL_PRICE_ID is not configured"
- **Solution**: Create the $10 one-time product in Stripe and add price ID to `.env`

**Issue**: User charged $98 immediately with trial selected
- **Solution**: Verify `trial_period_days: 3` is being set in checkout session

**Issue**: Trial status not showing in manage page
- **Solution**: Check that subscription type includes `"trialing"` status

**Issue**: Can't cancel during trial
- **Solution**: Verify manage page checks for both `"active"` and `"trialing"` statuses

---

## Documentation References

- [Stripe Trials Documentation](https://stripe.com/docs/billing/subscriptions/trials)
- [Stripe Checkout Sessions](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)
