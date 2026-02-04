# 3-Day Trial Setup Guide ($10 Trial + $98/Month)

This guide will help you set up the 3-day trial period with a $10 upfront fee in Stripe.

## What We've Implemented

The app now supports:
- **$10 upfront payment** for a 3-day trial
- **3-day trial period** before the first recurring charge
- **$98/month recurring** subscription after trial ends
- Updated UI on signup page to reflect new pricing

## Stripe Dashboard Setup

### Step 1: Verify Your Existing Product

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Find your existing **$98/month** subscription product
3. Copy the **Price ID** (starts with `price_xxx`)
4. This should already be in your environment variables as `STRIPE_PRICE_ID`

### Step 2: Create the Trial Fee Product

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in the details:
   - **Name**: `3-Day Trial Access Fee` (or similar)
   - **Description**: `One-time fee for 3-day trial period`
   - **Pricing model**: Select **"Standard pricing"**
   - **Price**: `$10.00`
   - **Billing period**: Select **"One time"** (NOT recurring)
   - **Currency**: USD
4. Click **"Save product"**
5. Copy the **Price ID** (it will look like `price_1ABC...`)

### Step 3: Update Environment Variables

Add the trial price ID to your environment variables. You need to add this in two places:

#### For Local Development (`.env.local`):

Create or update your `.env.local` file in the project root:

```bash
# Existing variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...  # Your existing $98/month price
STRIPE_WEBHOOK_SECRET=whsec_...

# NEW: Add this line
STRIPE_TRIAL_PRICE_ID=price_...  # Your new $10 one-time price
```

#### For Production (Netlify/Vercel/etc):

Add the environment variable in your hosting platform:

**Netlify:**
1. Go to Site settings → Environment variables
2. Add new variable:
   - Key: `STRIPE_TRIAL_PRICE_ID`
   - Value: `price_...` (your trial price ID)

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add new variable:
   - Name: `STRIPE_TRIAL_PRICE_ID`
   - Value: `price_...` (your trial price ID)

### Step 4: Test the Integration

1. Start your development server
2. Go to the signup page
3. You should see:
   - New UI showing **"$10 today"** for the trial
   - Text indicating **"Then $98/month after trial ends"**
4. Complete a test checkout
5. Verify in Stripe Dashboard:
   - Check that the subscription has a 3-day trial period
   - Verify the $10 payment was collected immediately
   - Check that the first $98 charge is scheduled for 3 days from now

## How It Works

### Customer Experience:
1. **Day 0**: Customer pays $10 and gets immediate access
2. **Days 1-3**: Trial period - full access to the app
3. **Day 3** (at trial end): First $98 charge for the monthly subscription
4. **Monthly after that**: $98 recurring charge

### Technical Flow:
1. Checkout session creates a subscription with `trial_period_days: 3`
2. Two line items are charged:
   - One-time $10 trial fee (charged immediately)
   - $98/month subscription (first charge after 3 days)
3. Webhooks will receive:
   - `customer.subscription.created` - immediately when trial starts
   - `invoice.payment_succeeded` - when $10 is paid
   - `invoice.payment_succeeded` - again when first $98 is paid (after 3 days)

### Important Webhook Considerations:

The existing webhook handler in `app/api/stripe/webhooks/route.ts` should handle this correctly because:
- It already handles `customer.subscription.created` 
- It checks `billing_reason === "subscription_create"` for initial subscriptions
- The trial period is managed by Stripe, so challenges will still be created properly

**However**, you may want to update the challenge creation logic to account for the trial period. During the 3-day trial, users might not need the full challenge setup yet.

## Cancellation During Trial

Users can cancel during the 3-day trial period. Here's what happens:

- **Cancel during trial**: They keep access until trial ends, then subscription doesn't renew
- **$10 trial fee**: This is non-refundable (since it grants immediate access)
- **No $98 charge**: If cancelled before trial ends, they're never charged the $98

To handle this, you may want to update your cancel subscription endpoint to inform users of this policy.

## Optional: Update Cancel Flow

You might want to add messaging in your subscription management page:

```typescript
// In app/subscriptions/manage/page.tsx or similar
"During trial: You'll keep access for the remaining trial period. 
The $10 trial fee is non-refundable."

"After trial: You can cancel anytime and won't be charged for the next period."
```

## Testing with Test Mode

Use Stripe test cards:
- **Successful payment**: `4242 4242 4242 4242`
- **Expires after trial**: `4000 0000 0000 0341` (will fail on the first recurring charge)

Test the full flow:
1. Sign up with test card
2. Verify $10 charge appears immediately
3. Check subscription shows 3-day trial in Stripe dashboard
4. (Optional) Fast-forward time using Stripe's test clock feature

## Need Help?

If you encounter issues:
1. Check Stripe Dashboard → Logs for API errors
2. Check your app logs for webhook processing
3. Verify all environment variables are set correctly
4. Make sure you're using the correct Price IDs (test mode vs live mode)

---

## Files Modified

- `app/api/stripe/checkout-session/route.ts` - Added trial period and trial fee
- `app/subscriptions/signup/page.tsx` - Updated UI to show trial pricing
