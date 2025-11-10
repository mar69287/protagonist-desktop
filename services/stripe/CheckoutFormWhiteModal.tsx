"use client";

import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback } from "react";

// Make sure to add your Stripe publishable key to .env.local
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutFormProps {
  amount: number; // Amount in cents (e.g., 14400 for $144)
}

export default function CheckoutFormWhiteModal({ amount }: CheckoutFormProps) {
  const fetchClientSecret = useCallback(async () => {
    // Call your API to create a checkout session
    const response = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();
    return data.clientSecret;
  }, [amount]);

  // Light theme for white modal background
  const options = {
    fetchClientSecret,
  };

  return (
    <div id="checkout" className="bg-white rounded-2xl p-8 shadow-2xl">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
