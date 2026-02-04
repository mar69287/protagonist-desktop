"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import { useState, useEffect, Suspense, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { User } from "@/types";

// Dynamically import CheckoutForm to avoid SSR issues with Stripe
const CheckoutForm = dynamic(() => import("@/services/stripe/CheckoutForm"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>
  ),
});

// Neumorphic Card Component with Inset Shadow Effect
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

// Component that uses searchParams
function SignupContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [showCheckout, setShowCheckout] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [useTrial, setUseTrial] = useState(false); // Toggle for trial option
  const [showTrialOption, setShowTrialOption] = useState(false); // Show trial info

  // Fetch user data when userId is available
  useEffect(() => {
    if (userId) {
      setLoadingUser(true);
      fetch(`/api/users?userId=${userId}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error("User not found");
            }
            throw new Error("Failed to fetch user");
          }
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          setLoadingUser(false);
        })
        .catch((err) => {
          console.error("Error fetching user:", err);
          setUserError(
            err.message === "User not found"
              ? "User not found. Please check your invitation link."
              : "Failed to load user information. Please try again."
          );
          setLoadingUser(false);
        });
    } else {
      // No userId provided in URL
      setUserError("No user ID provided. Please use a valid invitation link.");
    }
  }, [userId]);

  const handleStartCommitment = () => {
    if (agreedToTerms) {
      setShowCheckout(true);
    }
  };

  // Scroll to top when checkout is shown
  useEffect(() => {
    if (showCheckout) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showCheckout]);

  return (
    <div className="min-h-screen bg-black pt-18 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Floating User Profile Badge - Top Right (Hidden when checkout is open) */}
      {!showCheckout && (
        <AnimatePresence>
          {loadingUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-24 sm:top-28 right-4 sm:right-8 z-50 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#888888]"></div>
              <span
                className="text-sm hidden sm:inline"
                style={{
                  color: "#b0b0b0",
                  fontFamily:
                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                }}
              >
                Loading...
              </span>
            </motion.div>
          )}

          {userError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-24 sm:top-28 left-1/2 transform -translate-x-1/2 z-50 rounded-xl px-4 py-3 shadow-lg max-w-md"
              style={{
                backgroundColor: "#1a1a1a",
                border: "2px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "14px",
                  fontFamily:
                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                }}
              >
                {userError}
              </p>
            </motion.div>
          )}

          {user && !loadingUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
              className="fixed top-24 sm:top-28 right-4 sm:right-8 z-50 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-lg transition-all group"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* User Avatar Circle */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <span
                  style={{
                    color: "#e0e0e0",
                    fontWeight: 600,
                    fontSize: "12px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
              </div>

              {/* User Info */}
              <div className="hidden sm:flex flex-col items-start">
                <span
                  style={{
                    color: "#e0e0e0",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: 1.2,
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  {user.firstName} {user.lastName}
                </span>
                <span
                  style={{
                    color: "#888888",
                    fontSize: "12px",
                    lineHeight: 1.2,
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  {user.email}
                </span>
              </div>

              {/* Mobile: Just show initials, expand on hover */}
              <div className="sm:hidden">
                <div className="group-hover:hidden">
                  <span
                    style={{
                      color: "#e0e0e0",
                      fontSize: "12px",
                      fontWeight: 500,
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    {user.firstName}
                  </span>
                </div>
                <div className="hidden group-hover:flex flex-col">
                  <span
                    style={{
                      color: "#e0e0e0",
                      fontSize: "12px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    {user.firstName} {user.lastName}
                  </span>
                  <span
                    style={{
                      color: "#888888",
                      fontSize: "12px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                    className="truncate max-w-[120px]"
                  >
                    {user.email}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {!showCheckout ? (
            <motion.div
              key="pricing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 sm:mb-12 md:mb-16"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={useTrial ? "trial-header" : "regular-header"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <h1
                      style={{
                        fontSize: "clamp(32px, 6vw, 64px)",
                        fontWeight: 800,
                        color: "#e0e0e0",
                        marginBottom: "24px",
                        lineHeight: 1.2,
                        fontFamily: "'OggText', 'Ogg', serif",
                      }}
                    >
                      {useTrial
                        ? "Having Second Thoughts? We Get It."
                        : "Put Your Money Where Your Goals Are"}
                    </h1>
                    <p
                      style={{
                        fontSize: "clamp(16px, 2vw, 20px)",
                        color: "#b0b0b0",
                        maxWidth: "600px",
                        margin: "0 auto",
                        padding: "0 16px",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      {useTrial
                        ? "Taking the next step in your life is a big decision. Try a smaller step with our 3-day trial."
                        : "Monthly subscription that rewards your progress. The more you complete, the more you earn back."}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* How It Works - Only show when NOT in trial mode */}
              {!useTrial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 md:mb-16"
                >
                  <NeumorphicCard centerContent>
                    <div style={{ marginBottom: "8px" }}>
                      <Target size={28} color="#888888" strokeWidth={1.5} />
                    </div>
                    <div
                      style={{
                        fontFamily: "'OggText', 'Ogg', serif",
                        fontWeight: 800,
                        fontSize: "12px",
                        color: "#666666",
                        letterSpacing: "2.2px",
                        marginBottom: "16px",
                        marginTop: "8px",
                        textAlign: "center",
                      }}
                    >
                      SET YOUR GOAL
                    </div>
                    <p
                      style={{
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "#b0b0b0",
                        lineHeight: "20px",
                        textAlign: "center",
                      }}
                    >
                      Define your personal goals and commit to achieving them with real accountability.
                    </p>
                  </NeumorphicCard>

                  <NeumorphicCard centerContent>
                    <div style={{ marginBottom: "8px" }}>
                      <TrendingUp size={28} color="#888888" strokeWidth={1.5} />
                    </div>
                    <div
                      style={{
                        fontFamily: "'OggText', 'Ogg', serif",
                        fontWeight: 800,
                        fontSize: "12px",
                        color: "#666666",
                        letterSpacing: "2.2px",
                        marginBottom: "16px",
                        marginTop: "8px",
                        textAlign: "center",
                      }}
                    >
                      TRACK PROGRESS
                    </div>
                    <p
                      style={{
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "#b0b0b0",
                        lineHeight: "20px",
                        textAlign: "center",
                      }}
                    >
                      Complete tasks and milestones toward your goal. Every step
                      counts.
                    </p>
                  </NeumorphicCard>

                  <NeumorphicCard centerContent>
                    <div style={{ marginBottom: "8px" }}>
                      <DollarSign size={28} color="#888888" strokeWidth={1.5} />
                    </div>
                    <div
                      style={{
                        fontFamily: "'OggText', 'Ogg', serif",
                        fontWeight: 800,
                        fontSize: "12px",
                        color: "#666666",
                        letterSpacing: "2.2px",
                        marginBottom: "16px",
                        marginTop: "8px",
                        textAlign: "center",
                      }}
                    >
                      EARN MONEY BACK
                    </div>
                    <p
                      style={{
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "#b0b0b0",
                        lineHeight: "20px",
                        textAlign: "center",
                      }}
                    >
                      The more you achieve, the more you earn back. Hit 90%+ for
                      maximum rewards.
                    </p>
                  </NeumorphicCard>
                </motion.div>
              )}

              {/* Main Commitment Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="max-w-3xl mx-auto"
              >
                <div className="relative">
                  <NeumorphicCard className="border-2 border-white/10">
                    <div
                      className="absolute -top-7 sm:-top-8 left-1/2 transform -translate-x-1/2"
                      style={{ zIndex: 3 }}
                    >
                      <span
                        style={{
                          backgroundColor: "#888888",
                          color: "#1a1a1a",
                          padding: "4px 16px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 800,
                          letterSpacing: "1.5px",
                          fontFamily: "'OggText', 'Ogg', serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        MONTHLY SUBSCRIPTION
                      </span>
                    </div>

                    {/* Pricing Display */}
                    <div className="mb-6 sm:mb-8 mt-4 sm:mt-4">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={useTrial ? "trial" : "no-trial"}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="text-center"
                        >
                          {useTrial ? (
                            <>
                              <div className="flex items-baseline justify-center gap-2 mb-2">
                                <span
                                  style={{
                                    fontSize: "48px",
                                    fontWeight: 800,
                                    color: "#e0e0e0",
                                    fontFamily: "'OggText', 'Ogg', serif",
                                  }}
                                >
                                  $10
                                </span>
                                <span
                                  style={{
                                    fontSize: "16px",
                                    color: "#888888",
                                    fontFamily:
                                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                  }}
                                >
                                  today
                                </span>
                              </div>

                              <p
                                style={{
                                  color: "#888888",
                                  fontSize: "13px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                Then $98/month after trial ends
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-baseline justify-center gap-2 mb-2">
                                <span
                                  style={{
                                    fontSize: "48px",
                                    fontWeight: 800,
                                    color: "#e0e0e0",
                                    fontFamily: "'OggText', 'Ogg', serif",
                                  }}
                                >
                                  $98
                                </span>
                                <span
                                  style={{
                                    fontSize: "16px",
                                    color: "#888888",
                                    fontFamily:
                                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                  }}
                                >
                                  /month
                                </span>
                              </div>
                              <p
                                style={{
                                  color: "#b0b0b0",
                                  fontSize: "14px",
                                  marginBottom: "4px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                Start your commitment immediately
                              </p>
                              <p
                                style={{
                                  color: "#888888",
                                  fontSize: "13px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                Earn back based on your completion rate
                              </p>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Trial Period Refund (if trial selected and shown) */}
                    {useTrial && showTrialOption && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.4 }}
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          borderRadius: "16px",
                          padding: "20px",
                          marginBottom: "24px",
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#22c55e",
                            marginBottom: "8px",
                            textAlign: "center",
                            fontFamily: "'OggText', 'Ogg', serif",
                          }}
                        >
                          Trial Period Refund
                        </h4>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#b0b0b0",
                            marginBottom: "12px",
                            textAlign: "center",
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          }}
                        >
                          Complete all required proofs within the 3-day
                          trial period and get your full $10 back.
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            backgroundColor: "rgba(34, 197, 94, 0.15)",
                          }}
                        >
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span
                            style={{
                              color: "#22c55e",
                              fontWeight: 600,
                              fontSize: "14px",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            100% completion in trial = Full $10 refund
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* First Month Refund Structure - Only show when NOT in trial mode */}
                    {!useTrial && (
                      <div
                        style={{
                          backgroundColor: "rgba(0,0,0,0.3)",
                          borderRadius: "16px",
                          padding: "24px",
                          marginBottom: "32px",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#b0b0b0",
                            marginBottom: "8px",
                            textAlign: "center",
                            fontFamily: "'OggText', 'Ogg', serif",
                          }}
                        >
                          First Month Earnings
                        </h4>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#888888",
                            marginBottom: "16px",
                            textAlign: "center",
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          }}
                        >
                          Based on your completion rate during the first 30 days
                        </p>
                        <div className="space-y-3 sm:space-y-4">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              backgroundColor: "rgba(0,0,0,0.2)",
                              border: "1px solid rgba(34, 197, 94, 0.2)",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0"></div>
                              <span
                                style={{
                                  color: "#888888",
                                  fontSize: "14px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                90%+
                              </span>
                            </div>
                            <span
                              style={{
                                color: "#22c55e",
                                fontWeight: 600,
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              All back ($98)
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              backgroundColor: "rgba(0,0,0,0.2)",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 shrink-0"></div>
                              <span
                                style={{
                                  color: "#888888",
                                  fontSize: "14px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                70-89%
                              </span>
                            </div>
                            <span
                              style={{
                                color: "#b0b0b0",
                                fontWeight: 600,
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              $49 back
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              backgroundColor: "rgba(0,0,0,0.2)",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 shrink-0"></div>
                              <span
                                style={{
                                  color: "#888888",
                                  fontSize: "14px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                50-69%
                              </span>
                            </div>
                            <span
                              style={{
                                color: "#b0b0b0",
                                fontWeight: 600,
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              $30 back
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              backgroundColor: "rgba(0,0,0,0.2)",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shrink-0"></div>
                              <span
                                style={{
                                  color: "#888888",
                                  fontSize: "14px",
                                  fontFamily:
                                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                }}
                              >
                                Below 50%
                              </span>
                            </div>
                            <span
                              style={{
                                color: "#b0b0b0",
                                fontWeight: 600,
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              $0 back
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Following Months - COMMENTED OUT */}
                    {/* <div
                      style={{
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        paddingTop: "32px",
                        marginBottom: "32px",
                      }}
                    >
                      <div className="text-center mb-4 sm:mb-6">
                        <h3
                          style={{
                            fontSize: "20px",
                            fontWeight: 800,
                            color: "#e0e0e0",
                            marginBottom: "8px",
                            fontFamily: "'OggText', 'Ogg', serif",
                          }}
                        >
                          Following Months
                        </h3>
                        <div className="flex items-baseline justify-center">
                          <span
                            style={{
                              fontSize: "36px",
                              fontWeight: 800,
                              color: "#e0e0e0",
                              fontFamily: "'OggText', 'Ogg', serif",
                            }}
                          >
                            $98
                          </span>
                          <span
                            style={{
                              color: "#b0b0b0",
                              marginLeft: "8px",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            /month
                          </span>
                        </div>
                        <p
                          style={{
                            color: "#888888",
                            marginTop: "8px",
                            fontSize: "14px",
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          }}
                        >
                          $48 processing fee • Up to $50 back
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            backgroundColor: "rgba(0,0,0,0.2)",
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shrink-0"></div>
                            <span
                              style={{
                                color: "#888888",
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              Below 70%
                            </span>
                          </div>
                          <span
                            style={{
                              color: "#b0b0b0",
                              fontWeight: 600,
                              fontSize: "14px",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            $0 back
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            backgroundColor: "rgba(0,0,0,0.2)",
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 shrink-0"></div>
                            <span
                              style={{
                                color: "#888888",
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              70-89%
                            </span>
                          </div>
                          <span
                            style={{
                              color: "#b0b0b0",
                              fontWeight: 600,
                              fontSize: "14px",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            $25 back
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            backgroundColor: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(34, 197, 94, 0.2)",
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0"></div>
                            <span
                              style={{
                                color: "#888888",
                                fontSize: "14px",
                                fontFamily:
                                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                              }}
                            >
                              90%+
                            </span>
                          </div>
                          <span
                            style={{
                              color: "#22c55e",
                              fontWeight: 600,
                              fontSize: "14px",
                              fontFamily:
                                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            }}
                          >
                            $50 back
                          </span>
                        </div>
                      </div>
                    </div> */}

                    {/* Terms Agreement */}
                    <div className="mb-6">
                      <div
                        className="flex items-start gap-3 cursor-pointer group"
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                      >
                        <div className="relative mt-1 shrink-0">
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "6px",
                              backgroundColor: "#1a1a1a",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              position: "relative",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: agreedToTerms
                                ? "inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.05)"
                                : "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 4px rgba(255,255,255,0.03)",
                            }}
                          >
                            {agreedToTerms && (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                style={{
                                  position: "absolute",
                                  top: "0",
                                  left: "0",
                                  pointerEvents: "none",
                                }}
                              >
                                <path
                                  d="M5 10L8.5 13.5L15 7"
                                  stroke="#b0b0b0"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            color: "#888888",
                            fontSize: "14px",
                            lineHeight: "1.5",
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                          }}
                          className="group-hover:text-[#b0b0b0] transition-colors"
                        >
                          {useTrial
                            ? "I understand this starts with a $10 3-day trial, then becomes a $98/month subscription. I understand that refunds are based on verified completion percentages. I can cancel anytime."
                            : "I understand that refunds are based on verified completion percentages. I can cancel anytime."}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      onClick={handleStartCommitment}
                      disabled={!agreedToTerms || !!userError || loadingUser}
                      style={{
                        width: "100%",
                        padding: "16px",
                        borderRadius: "16px",
                        fontWeight: 700,
                        fontSize: "16px",
                        letterSpacing: "0.5px",
                        transition: "all 0.3s ease",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        ...(agreedToTerms && !userError && !loadingUser
                          ? {
                              backgroundColor: "#e0e0e0",
                              color: "#1a1a1a",
                              cursor: "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }
                          : {
                              backgroundColor: "rgba(0,0,0,0.3)",
                              color: "#666666",
                              cursor: "not-allowed",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                            }),
                      }}
                      whileHover={
                        agreedToTerms && !userError && !loadingUser
                          ? { scale: 1.02, backgroundColor: "#f0f0f0" }
                          : {}
                      }
                      whileTap={
                        agreedToTerms && !userError && !loadingUser
                          ? { scale: 0.98 }
                          : {}
                      }
                    >
                      {userError
                        ? "Cannot proceed - User error"
                        : loadingUser
                        ? "Loading..."
                        : agreedToTerms
                        ? "Commit to My Goal"
                        : "Please agree to terms"}
                    </motion.button>

                    {/* Not Ready Yet Button / Switch Back Button */}
                    {!useTrial ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 text-center"
                      >
                        <button
                          onClick={() => {
                            setUseTrial(true);
                            setShowTrialOption(true);
                            setAgreedToTerms(false); // Reset agreement when switching
                          }}
                          style={{
                            color: "#888888",
                            fontSize: "14px",
                            fontWeight: 500,
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            textDecoration: "underline",
                            transition: "color 0.2s ease",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: "8px",
                          }}
                          className="hover:text-[#b0b0b0]"
                        >
                          Not ready yet? Try our 3-day trial for $10
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 text-center"
                      >
                        <button
                          onClick={() => {
                            setUseTrial(false);
                            setShowTrialOption(false);
                            setAgreedToTerms(false); // Reset agreement when switching
                          }}
                          style={{
                            color: "#888888",
                            fontSize: "14px",
                            fontWeight: 500,
                            fontFamily:
                              "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                            textDecoration: "underline",
                            transition: "color 0.2s ease",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            padding: "8px",
                          }}
                          className="hover:text-[#b0b0b0]"
                        >
                          Ready to commit? Switch to full monthly plan
                        </button>
                      </motion.div>
                    )}
                  </NeumorphicCard>
                </div>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center mt-8 sm:mt-12 md:mt-16 space-y-2 sm:space-y-4 px-4"
              >
                <p
                  style={{
                    color: "#888888",
                    fontSize: "14px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  🔒 Secure payment processing powered by Stripe
                </p>
                <p
                  style={{
                    color: "#888888",
                    fontSize: "14px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  Your commitment is safe and refunds are processed
                  automatically
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl mx-auto"
            >
              <div className="mb-6 sm:mb-8 text-center px-2">
                <h2
                  style={{
                    fontSize: "clamp(24px, 4vw, 32px)",
                    fontWeight: 800,
                    color: "#e0e0e0",
                    marginBottom: "16px",
                    fontFamily: "'OggText', 'Ogg', serif",
                  }}
                >
                  Complete Your Commitment
                </h2>
                <p
                  style={{
                    color: "#b0b0b0",
                    marginBottom: "8px",
                    fontSize: "16px",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  Secure payment powered by Stripe
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#888888",
                    fontFamily:
                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  }}
                >
                  All payment information is encrypted and secure
                </p>
              </div>

              {/* White container for Stripe checkout */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl">
                {userId && (
                  <CheckoutForm
                    userId={userId}
                    email={user?.email}
                    useTrial={useTrial}
                  />
                )}
              </div>

              <button
                onClick={() => setShowCheckout(false)}
                style={{
                  marginTop: "32px",
                  color: "#888888",
                  fontWeight: 500,
                  fontSize: "16px",
                  transition: "color 0.3s ease",
                  fontFamily:
                    "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                }}
                className="hover:text-[#b0b0b0] mx-auto block"
              >
                ← Go back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Main component with Suspense boundary for searchParams
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4"
              style={{ borderColor: "#888888" }}
            ></div>
            <p
              style={{
                color: "#b0b0b0",
                fontFamily:
                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              }}
            >
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
