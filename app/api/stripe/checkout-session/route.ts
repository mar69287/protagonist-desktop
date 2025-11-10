import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key
// Make sure to add STRIPE_SECRET_KEY to your .env.local
// STRIPE_SECRET_KEY=sk_test_...
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: NextRequest) {
  try {
    // Get the price ID from environment variables
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID is not configured");
    }

    // Create a checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price: priceId, // Use the price ID from Stripe Product Catalog
          quantity: 1,
        },
      ],
      mode: "subscription", // Changed from "payment" to "subscription"
      return_url: `${request.headers.get(
        "origin"
      )}/subscriptions/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        plan_type: "goal_commitment",
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
