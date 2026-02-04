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
  userId: string;
  email?: string;
  useTrial?: boolean;
}

export default function CheckoutForm({
  userId,
  email,
  useTrial = true,
}: CheckoutFormProps) {
  const fetchClientSecret = useCallback(async () => {
    // Call your API to create a checkout session
    // Now using Stripe Price ID from product catalog
    const response = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, email, useTrial }),
    });

    const data = await response.json();
    return data.clientSecret;
  }, [userId, email, useTrial]);

  const options = {
    fetchClientSecret,
  };

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
