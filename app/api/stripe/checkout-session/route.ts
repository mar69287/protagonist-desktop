import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key
// Make sure to add STRIPE_SECRET_KEY to your .env.local
// STRIPE_SECRET_KEY=sk_test_...
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const { userId, email, useTrial = true } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the price IDs from environment variables
    const priceId = process.env.STRIPE_PRICE_ID; // $98/month recurring

    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID is not configured");
    }

    // Build line items based on trial selection
    const lineItems = [
      {
        price: priceId, // $98/month recurring price
        quantity: 1,
      },
    ];

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
