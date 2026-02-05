"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CreditCard,
  Calendar,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// Neumorphic Card Component
interface NeumorphicCardProps {
  children: ReactNode;
  className?: string;
  centerContent?: boolean;
}

function NeumorphicCard({
  children,
  className = "",
  centerContent = false,
}: NeumorphicCardProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "32px",
      }}
    >
      {/* Top inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.25), rgba(0,0,0,0.12), rgba(0,0,0,0.05), transparent)",
          borderRadius: "24px 24px 0 0",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Left inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "35%",
          background:
            "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)",
          borderRadius: "24px 0 0 24px",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Right inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "35%",
          background:
            "linear-gradient(to left, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)",
          borderRadius: "0 24px 24px 0",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className={
          centerContent ? "flex flex-col items-center justify-center" : ""
        }
        style={{ position: "relative", zIndex: 2 }}
      >
        {children}
      </div>
    </div>
  );
}

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?:
    | "active"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "trialing"
    | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentChallengeId?: string;
  timezone?: string;
  expoPushToken?: string;
  notificationSettings?: {
    enabled: boolean;
    lastNotificationSent?: string;
    missCount: number;
    consecutiveMisses: number;
    firstMissNotified: boolean;
  };
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  trialEnd?: string | null;
}

export default function ManageSubscriptionPage() {
  const { user: authUser, logout } = useAuth();
  const router = useRouter();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Fetch subscription data when auth user is available
    // Middleware ensures we're authenticated before reaching this page
    if (authUser) {
      fetchUserAndSubscription();
    }
  }, [authUser]);

  const fetchUserAndSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasNoSubscription(false);

      // Step 1: Fetch user from DynamoDB
      const userResponse = await fetch("/api/users/me");

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user information");
      }

      const userData = await userResponse.json();
      const user = userData.user as User;
      setDbUser(user);

      // Step 2: Check if user has an active subscription or trial
      if (
        !user.stripeSubscriptionId ||
        (user.subscriptionStatus !== "active" &&
          user.subscriptionStatus !== "trialing")
      ) {
        // User has no active subscription or trial
        setHasNoSubscription(true);
        setLoading(false);
        return;
      }

      // Step 3: Fetch full subscription details from Stripe
      const subscriptionResponse = await fetch(
        `/api/subscriptions/get-subscription?subscriptionId=${user.stripeSubscriptionId}`
      );

      if (!subscriptionResponse.ok) {
        if (subscriptionResponse.status === 404) {
          setHasNoSubscription(true);
          return;
        }
        throw new Error("Failed to fetch subscription details");
      }

      const subscriptionData = await subscriptionResponse.json();
      setSubscription(subscriptionData);
    } catch (err: any) {
      console.error("Error fetching subscription:", err);
      setError(err.message || "Failed to load subscription information");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      setError(null);

      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: dbUser?.stripeSubscriptionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      // Refresh subscription data
      await fetchUserAndSubscription();
      setShowCancelConfirm(false);
    } catch (err: any) {
      console.error("Error cancelling subscription:", err);
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.push("/login");
    } catch (err: any) {
      console.error("Error logging out:", err);
      setError("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  // Show loading state while fetching subscription data
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Loader2
          className="w-12 h-12 animate-spin"
          style={{ color: "#888888" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-18 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Sign Out Button - Top Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-end mb-6"
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "16px",
              fontWeight: 600,
              fontSize: "14px",
              fontFamily:
                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#b0b0b0",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s ease",
              cursor: loggingOut ? "not-allowed" : "pointer",
              opacity: loggingOut ? 0.6 : 1,
            }}
            className="hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 48px)",
              fontWeight: 800,
              color: "#e0e0e0",
              marginBottom: "16px",
              fontFamily: "'OggText', 'Ogg', serif",
            }}
          >
            Manage Subscription
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#b0b0b0",
              fontFamily:
                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
            }}
          >
            View and manage your commitment subscription
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div
              style={{
                backgroundColor: "#1a1a1a",
                border: "2px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "14px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  {error}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {hasNoSubscription && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <NeumorphicCard centerContent>
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "50%",
                  padding: "16px",
                  marginBottom: "24px",
                }}
              >
                <AlertCircle
                  className="w-12 h-12"
                  style={{ color: "#888888" }}
                />
              </div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#e0e0e0",
                  marginBottom: "12px",
                  fontFamily: "'OggText', 'Ogg', serif",
                }}
              >
                No Active Subscription
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "#b0b0b0",
                  marginBottom: "32px",
                  fontFamily:
                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  textAlign: "center",
                  maxWidth: "400px",
                }}
              >
                You don't have an active subscription. Start your commitment
                journey today!
              </p>
              <a
                href="/subscriptions/signup"
                style={{
                  display: "inline-block",
                  backgroundColor: "#e0e0e0",
                  color: "#1a1a1a",
                  padding: "16px 32px",
                  borderRadius: "16px",
                  fontSize: "16px",
                  fontWeight: 700,
                  fontFamily:
                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  textDecoration: "none",
                }}
                className="hover:bg-[#f0f0f0] transition-colors"
              >
                Get Started
              </a>
            </NeumorphicCard>
          </motion.div>
        )}

        {subscription && !hasNoSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Subscription Status Card */}
            <NeumorphicCard>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div
                    style={{
                      backgroundColor:
                        subscription.status === "trialing"
                          ? "rgba(136, 136, 136, 0.15)"
                          : subscription.cancelAtPeriodEnd
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                      borderRadius: "50%",
                      padding: "12px",
                      border:
                        subscription.status === "trialing"
                          ? "1px solid rgba(136, 136, 136, 0.3)"
                          : subscription.cancelAtPeriodEnd
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    <CreditCard
                      className="w-6 h-6"
                      style={{
                        color:
                          subscription.status === "trialing"
                            ? "#888888"
                            : subscription.cancelAtPeriodEnd
                            ? "#ef4444"
                            : "#22c55e",
                      }}
                    />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: "24px",
                        fontWeight: 800,
                        color: "#e0e0e0",
                        marginBottom: "8px",
                        fontFamily: "'OggText', 'Ogg', serif",
                      }}
                    >
                      {subscription.status === "trialing"
                        ? "Trial Period"
                        : subscription.cancelAtPeriodEnd
                        ? "Subscription Ending"
                        : "Active Subscription"}
                    </h2>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#888888",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      }}
                    >
                      {subscription.status === "trialing"
                        ? "Then $98/month after trial"
                        : `$${(subscription.amount / 100).toFixed(2)} / month`}
                    </p>
                  </div>
                </div>
                  <div
                    style={{
                      backgroundColor:
                        subscription.status === "trialing"
                          ? "rgba(136, 136, 136, 0.1)"
                          : subscription.cancelAtPeriodEnd
                          ? "rgba(239, 68, 68, 0.1)"
                          : "rgba(34, 197, 94, 0.1)",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border:
                        subscription.status === "trialing"
                          ? "1px solid rgba(136, 136, 136, 0.3)"
                          : subscription.cancelAtPeriodEnd
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color:
                          subscription.status === "trialing"
                            ? "#888888"
                            : subscription.cancelAtPeriodEnd
                            ? "#ef4444"
                            : "#22c55e",
                        fontFamily: "'OggText', 'Ogg', serif",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      {subscription.status === "trialing"
                        ? "Trial"
                        : subscription.cancelAtPeriodEnd
                        ? "Ending Soon"
                        : "Active"}
                    </span>
                  </div>
              </div>

              {/* Billing Period / Trial Info */}
              <div
                style={{
                  marginTop: "24px",
                  paddingTop: "24px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="space-y-4">
                  {/* Trial End Date (if in active trial, not cancelled) */}
                  {subscription.status === "trialing" &&
                    subscription.trialEnd &&
                    !subscription.cancelAtPeriodEnd && (
                      <div className="flex items-center gap-3">
                        <Calendar
                          className="w-5 h-5"
                          style={{ color: "#888888" }}
                        />
                        <div className="flex-1">
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#666666",
                              fontFamily: "'OggText', 'Ogg', serif",
                              letterSpacing: "1.5px",
                              textTransform: "uppercase",
                              marginBottom: "4px",
                            }}
                          >
                            Trial Ends
                          </p>
                          <p
                            style={{
                              fontSize: "16px",
                              color: "#e0e0e0",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              fontWeight: 600,
                              marginBottom: "4px",
                            }}
                          >
                            {new Date(subscription.trialEnd).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                          {/* Days Remaining in Trial */}
                          {(() => {
                            const trialEndDate = new Date(
                              subscription.trialEnd
                            );
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            trialEndDate.setHours(0, 0, 0, 0);
                            const daysRemaining = Math.ceil(
                              (trialEndDate.getTime() - today.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );
                            return (
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "#888888",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                {daysRemaining > 0
                                  ? `${daysRemaining} ${
                                      daysRemaining === 1 ? "day" : "days"
                                    } remaining in trial`
                                  : "Trial ending today"}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                  {/* Current Period Start */}
                  {subscription.status !== "trialing" && (
                    <div className="flex items-center gap-3">
                      <Calendar
                        className="w-5 h-5"
                        style={{ color: "#888888" }}
                      />
                      <div className="flex-1">
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#666666",
                            fontFamily: "'OggText', 'Ogg', serif",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          Current Period Start
                        </p>
                        <p
                          style={{
                            fontSize: "16px",
                            color: "#e0e0e0",
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {new Date(
                            subscription.currentPeriodStart
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Current Period End / Next Billing Date */}
                  <div className="flex items-center gap-3">
                    <Calendar
                      className="w-5 h-5"
                      style={{ color: "#888888" }}
                    />
                    <div className="flex-1">
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#666666",
                          fontFamily: "'OggText', 'Ogg', serif",
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          marginBottom: "4px",
                        }}
                      >
                        {subscription.status === "trialing" && !subscription.cancelAtPeriodEnd
                          ? "First Billing Date"
                          : subscription.cancelAtPeriodEnd
                          ? "Expires On"
                          : "Next Billing Date"}
                      </p>
                      <p
                        style={{
                          fontSize: "16px",
                          color: "#e0e0e0",
                          fontFamily:
                            "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          fontWeight: 600,
                          marginBottom: "4px",
                        }}
                      >
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {/* Days Remaining */}
                      {subscription.status !== "trialing" && (() => {
                        const endDate = new Date(subscription.currentPeriodEnd);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);
                        const daysRemaining = Math.ceil(
                          (endDate.getTime() - today.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#888888",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            {daysRemaining > 0
                              ? `${daysRemaining} ${
                                  daysRemaining === 1 ? "day" : "days"
                                } remaining`
                              : "Expired"}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning if ending soon (within 7 days) */}
              {(() => {
                const endDate = new Date(subscription.currentPeriodEnd);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                const daysRemaining = Math.ceil(
                  (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                const isEndingSoon = daysRemaining <= 7 && daysRemaining > 0;

                // Only show this warning for non-trial subscriptions
                if (
                  isEndingSoon &&
                  subscription.cancelAtPeriodEnd &&
                  subscription.status !== "trialing"
                ) {
                  return (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#ef4444",
                          fontFamily:
                            "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ Your subscription expires in {daysRemaining}{" "}
                        {daysRemaining === 1 ? "day" : "days"}. You'll lose
                        access on{" "}
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })}
                        .
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {subscription.cancelAtPeriodEnd && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#ef4444",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      }}
                    >
                      {subscription.status === "trialing" ? (
                        <>
                          Your trial has been cancelled. You'll continue to have access
                          until{" "}
                          {subscription.trialEnd &&
                            new Date(subscription.trialEnd).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          , and you won't be charged the $98/month after that.
                          <br />
                          <br />
                          <strong style={{ color: "#22c55e" }}>
                            💰 You can still get your $10 back!
                          </strong>{" "}
                          Complete all submission proofs during your trial period
                          and we'll refund your $10.
                        </>
                      ) : (
                        <>
                          Your subscription will be cancelled at the end of the
                          current billing period. You'll continue to have access
                          until then.
                        </>
                      )}
                    </p>
                  </div>
                )}
            </NeumorphicCard>

            {/* Cancel Subscription Section */}
            {/* Show cancel button only for non-cancelled subscriptions */}
            {!subscription.cancelAtPeriodEnd && (
              <NeumorphicCard>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#e0e0e0",
                    marginBottom: "12px",
                    fontFamily: "'OggText', 'Ogg', serif",
                  }}
                >
                  {subscription.status === "trialing"
                    ? "Cancel Trial"
                    : "Cancel Subscription"}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#888888",
                    marginBottom: "24px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    lineHeight: "1.6",
                  }}
                >
                  {subscription.status === "trialing" ? (
                    <>
                      Cancel now to avoid the $98 monthly charge. You'll keep
                      access until your trial ends, but won't be charged after
                      that.
                      <br />
                      <br />
                      <strong style={{ color: "#22c55e" }}>
                        Good news: You can still earn your $10 trial fee back!
                      </strong>{" "}
                      Complete all your submission proofs during the trial period
                      and we'll refund your $10.
                    </>
                  ) : (
                    "If you cancel, you'll continue to have access until the end of your current billing period. You can resubscribe at any time."
                  )}
                </p>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "16px",
                    fontWeight: 700,
                    fontSize: "16px",
                    transition: "all 0.3s ease",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[rgba(239,68,68,0.15)]"
                >
                  {subscription.status === "trialing"
                    ? "Cancel Trial"
                    : "Cancel Subscription"}
                </button>
              </NeumorphicCard>
            )}
          </motion.div>
        )}

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => !cancelling && setShowCancelConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full"
              >
                <NeumorphicCard>
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#e0e0e0",
                        fontFamily: "'OggText', 'Ogg', serif",
                      }}
                    >
                      {subscription?.status === "trialing"
                        ? "Cancel Trial?"
                        : "Cancel Subscription?"}
                    </h3>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#b0b0b0",
                      marginBottom: "24px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      lineHeight: "1.6",
                    }}
                  >
                    {subscription?.status === "trialing" ? (
                      <>
                        <strong style={{ color: "#e0e0e0" }}>
                          Cancel to avoid the $98 monthly charge?
                        </strong>
                        <br />
                        <br />
                        You'll keep access until{" "}
                        {subscription.trialEnd &&
                          new Date(subscription.trialEnd).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        . After that, your subscription will end and you won't be
                        charged the $98/month.
                        <br />
                        <br />
                        <div
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            border: "1px solid rgba(34, 197, 94, 0.2)",
                          }}
                        >
                          <strong style={{ fontSize: "13px", color: "#22c55e" }}>
                            💰 You can still get your $10 back!
                          </strong>
                          <br />
                          <span style={{ fontSize: "13px", color: "#b0b0b0" }}>
                            Complete all submission proofs during your trial and
                            we'll refund your $10, even if you cancel.
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        Are you sure you want to cancel your subscription? You'll
                        still have access until{" "}
                        {subscription &&
                          new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        .
                      </>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "12px",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        color: "#b0b0b0",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: cancelling ? "not-allowed" : "pointer",
                      }}
                      className="hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      Keep Subscription
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "12px",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        border: "1px solid #ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: cancelling ? "not-allowed" : "pointer",
                      }}
                      className="hover:bg-[#dc2626]"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        "Yes, Cancel"
                      )}
                    </button>
                  </div>
                </NeumorphicCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
