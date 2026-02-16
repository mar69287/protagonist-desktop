import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Force Node.js runtime for Netlify compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Stripe with your secret key
// Make sure to add STRIPE_SECRET_KEY to your .env.local
// STRIPE_SECRET_KEY=sk_test_...
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const { userId, email, useTrial = true, isFirstSubscription = true, selectedPriceId } = await request.json();
    
    console.log(`🚀 [Checkout Session API] Creating checkout session`);
    console.log(`📋 [Checkout Session API] Parameters:`, {
      userId,
      email,
      useTrial,
      isFirstSubscription,
      selectedPriceId,
    });

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Price IDs based on subscription status
    // First subscription: uses STRIPE_PRICE_ID (first month price)
    // Second+ subscription: user can choose from three prices
    const firstMonthPriceId = process.env.STRIPE_PRICE_ID; // First month price
    const secondMonthPriceId1 = process.env.STRIPE_SUBSCRIPTION_OPTION_1_PRICE_ID; // Second+ subscription option 1
    const secondMonthPriceId2 = process.env.STRIPE_SUBSCRIPTION_OPTION_2_PRICE_ID; // Second+ subscription option 2
    const secondMonthPriceId3 = process.env.STRIPE_SUBSCRIPTION_OPTION_3_PRICE_ID; // Second+ subscription option 3

    // Build line items based on subscription status and trial selection
    const lineItems: Array<{ price: string; quantity: number }> = [];

    if (isFirstSubscription) {
      // First subscription: only use the first price
      console.log(`🎯 [Checkout Session API] First subscription detected - using only first price: ${firstMonthPriceId}`);
      if (!firstMonthPriceId) {
        throw new Error("STRIPE_PRICE_ID is not configured");
      }
      lineItems.push({
        price: firstMonthPriceId,
        quantity: 1,
      });
    } else {
      // Second+ subscription: use the selected price ID
      if (!selectedPriceId) {
        throw new Error("selectedPriceId is required for second+ subscriptions");
      }
      console.log(`🎯 [Checkout Session API] Second+ subscription detected - using selected price: ${selectedPriceId}`);
      
      // Validate that the selected price is one of the allowed options
      const allowedPriceIds = [firstMonthPriceId, secondMonthPriceId1, secondMonthPriceId2, secondMonthPriceId3].filter(Boolean);
      if (!allowedPriceIds.includes(selectedPriceId)) {
        throw new Error(`Invalid price ID: ${selectedPriceId}. Must be one of: ${allowedPriceIds.join(", ")}`);
      }
      
      lineItems.push({
        price: selectedPriceId,
        quantity: 1,
      });
    }

    // Add trial fee if user selected trial option
    if (useTrial) {
      const trialPriceId = process.env.STRIPE_TRIAL_PRICE_ID; // $10 one-time trial fee
      if (!trialPriceId) {
        throw new Error("STRIPE_TRIAL_PRICE_ID is not configured");
      }
      lineItems.push({
        price: trialPriceId,
        quantity: 1,
      });
    }

    // Create subscription data with optional trial period
    const subscriptionData: {
      metadata: { user_id: string };
      trial_period_days?: number;
    } = {
      metadata: {
        user_id: userId, // This will be available in all webhook events
      },
    };

    // Only add trial period if user selected trial option
    if (useTrial) {
      subscriptionData.trial_period_days = 3; // 3-day trial period
    }

    // Create a checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: lineItems,
      mode: "subscription",
      customer_email: email, // Pre-fill email in checkout
      return_url: `${request.headers.get(
        "origin"
      )}/subscriptions/return?session_id={CHECKOUT_SESSION_ID}`,
      subscription_data: subscriptionData,
      metadata: {
        plan_type: "goal_commitment",
        user_id: userId,
        has_trial: useTrial ? "true" : "false",
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
