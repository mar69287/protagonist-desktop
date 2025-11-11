// types/index.ts

export interface User {
  // Existing fields
  userId: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  updatedAt: string;

  // New Stripe subscription fields
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid" | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface PaymentHistory {
  paymentId: string;
  userId: string;
  subscriptionId: string;
  type: "payment" | "refund" | "failed_payment";
  amount: number;
  status: "succeeded" | "failed" | "refunded";
  stripeInvoiceId?: string | null;
  stripeChargeId?: string | null;
  refundReason?: string | null;
  createdAt: string;
}
