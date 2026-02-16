"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, DollarSign, Target, Check, Sparkles } from "lucide-react";
import { useState, useEffect, Suspense, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { User } from "@/types";

// Add custom scrollbar styles + card animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .subscription-scroll-container::-webkit-scrollbar {
      height: 8px;
    }
    .subscription-scroll-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
    }
    .subscription-scroll-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 10px;
    }
    .subscription-scroll-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.4);
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }

    .card-shimmer::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 24px;
      padding: 2px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 25%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0.1) 75%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: shimmer 3s ease-in-out infinite;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      z-index: 1;
    }

    .card-glow {
      position: absolute;
      inset: -2px;
      border-radius: 26px;
      background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.15));
      animation: pulse-glow 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }

    .plan-card {
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .plan-card:active {
      transform: scale(0.97);
    }
  `;
  if (!document.head.querySelector('style[data-subscription-scrollbar]')) {
    style.setAttribute('data-subscription-scrollbar', 'true');
    document.head.appendChild(style);
  }
}

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
      className={`relative ${className}`}
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

// Price IDs for second+ subscriptions - fetched from environment variables
const getSecondMonthPriceIds = () => {
  const priceId1 = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_OPTION_1_PRICE_ID;
  const priceId2 = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_OPTION_2_PRICE_ID;
  const priceId3 = process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_OPTION_3_PRICE_ID;

  const priceIds = [priceId1, priceId2, priceId3].filter(Boolean);

  if (priceIds.length === 0) {
    console.warn("⚠️ [Signup Page] No subscription price IDs configured in environment variables");
  }

  return priceIds;
};

// Interface for price data from Stripe
interface PriceData {
  id: string;
  unitAmount: number | null;
  currency: string;
  recurring: {
    interval: string;
    intervalCount: number;
  } | null;
  metadata: Record<string, string>;
  product: string | { id: string; name?: string; description?: string };
  productName?: string;
}

// Subscription Plan Card Component
function PlanCard({
  price,
  isSelected,
  onSelect,
  index,
}: {
  price: PriceData;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const formattedPrice = price.unitAmount
    ? `$${(price.unitAmount / 100).toFixed(0)}`
    : "N/A";
  const period = price.recurring ? `/${price.recurring.interval}` : "";
  const planName = price.metadata.name || price.productName || "Subscription Plan";
  const description = price.metadata.description || "";
  const features = price.metadata.features
    ? price.metadata.features.split(",").map((f) => f.trim()).filter(Boolean)
    : [];
  const isRecommended = price.metadata.recommended === "true";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onSelect}
      className="plan-card relative w-full"
      style={{ cursor: "pointer" }}
    >
      {/* Glow effect behind selected card */}
      {isSelected && <div className="card-glow" />}

      <div
        className={`relative overflow-hidden ${isSelected ? "card-shimmer" : ""}`}
        style={{
          padding: "32px 24px",
          borderRadius: "24px",
          backgroundColor: isSelected
            ? "rgba(255, 255, 255, 0.06)"
            : "rgba(255, 255, 255, 0.02)",
          border: isSelected
            ? "2px solid rgba(255, 255, 255, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isSelected
            ? "0 0 40px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          transform: isSelected ? "scale(1.02)" : "scale(1)",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Recommended badge */}
        {isRecommended && (
          <div
            style={{
              position: "absolute",
              top: "-1px",
              right: "24px",
              backgroundColor: "#e0e0e0",
              color: "#0a0a0a",
              padding: "6px 14px",
              borderRadius: "0 0 12px 12px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.2px",
              fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              zIndex: 3,
            }}
          >
            <Sparkles size={12} />
            POPULAR
          </div>
        )}

        {/* Selection indicator */}
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "24px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: isSelected
              ? "2px solid #e0e0e0"
              : "2px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            backgroundColor: isSelected ? "#e0e0e0" : "transparent",
          }}
        >
          {isSelected && <Check size={14} color="#0a0a0a" strokeWidth={3} />}
        </div>

        <div className="flex flex-col items-center text-center pt-6">
          {/* Plan Name */}
          <h5
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: isSelected ? "#f0f0f0" : "#c0c0c0",
              marginBottom: "16px",
              fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              lineHeight: 1.3,
              transition: "color 0.3s ease",
            }}
          >
            {planName}
          </h5>

          {/* Price */}
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span
              style={{
                fontSize: "48px",
                fontWeight: 800,
                color: isSelected ? "#ffffff" : "#d0d0d0",
                fontFamily: "'OggText', 'Ogg', serif",
                lineHeight: 1,
                transition: "color 0.3s ease",
              }}
            >
              {formattedPrice}
            </span>
            <span
              style={{
                fontSize: "18px",
                color: "#888888",
                fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              {period}
            </span>
          </div>

          {/* Description */}
          {description && (
            <p
              style={{
                fontSize: "14px",
                color: "#999999",
                fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                lineHeight: 1.6,
                marginBottom: "20px",
                maxWidth: "280px",
              }}
            >
              {description}
            </p>
          )}

          {/* Features List */}
          {features.length > 0 && (
            <div
              className="w-full pt-5 mt-auto"
              style={{
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div className="space-y-3">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3"
                    style={{ textAlign: "left" }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: isSelected
                          ? "rgba(255, 255, 255, 0.12)"
                          : "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                        transition: "background-color 0.3s ease",
                      }}
                    >
                      <Check
                        size={10}
                        color={isSelected ? "#e0e0e0" : "#888888"}
                        strokeWidth={3}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "14px",
                        color: isSelected ? "#b0b0b0" : "#888888",
                        fontFamily:
                          "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                        lineHeight: 1.5,
                        transition: "color 0.3s ease",
                      }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
  const [useTrial, setUseTrial] = useState(false);
  const [showTrialOption, setShowTrialOption] = useState(false);
  const [isFirstSubscription, setIsFirstSubscription] = useState(true);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [firstMonthPrice, setFirstMonthPrice] = useState<PriceData | null>(null);
  const [loadingFirstMonthPrice, setLoadingFirstMonthPrice] = useState(false);
  const [sentences, setSentences] = useState<{
    sentence1: string;
    sentence2: string;
    sentence3: string;
  } | null>(null);
  const [monthlySubmissions, setMonthlySubmissions] = useState<number>(0);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [sentencesError, setSentencesError] = useState(false);
  const [selectedMode, setSelectedMode] = useState<1 | 2 | 3>(1);

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
          console.log(`📥 [Signup Page] Received user data:`, {
            userId: data.user?.userId,
            email: data.user?.email,
            isFirstSubscription: data.isFirstSubscription,
          });
          setUser(data.user);
          setIsFirstSubscription(data.isFirstSubscription ?? true);
          console.log(`✅ [Signup Page] Set isFirstSubscription to: ${data.isFirstSubscription ?? true}`);
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
      setUserError("No user ID provided. Please use a valid invitation link.");
    }
  }, [userId]);

  // Fetch first month price data from Stripe when it's the first subscription
  useEffect(() => {
    if (isFirstSubscription && !loadingUser) {
      setLoadingFirstMonthPrice(true);
      console.log(`🔍 [Signup Page] Fetching first month price from API`);

      fetch(`/api/stripe/first-month-price`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch first month price");
          }
          return res.json();
        })
        .then((data) => {
          console.log(`📥 [Signup Page] Received first month price data:`, data);
          if (data && data.id) {
            setFirstMonthPrice(data);
          } else {
            console.warn("⚠️ [Signup Page] No valid first month price returned from API");
            setFirstMonthPrice(null);
          }
          setLoadingFirstMonthPrice(false);
        })
        .catch((err) => {
          console.error("❌ [Signup Page] Error fetching first month price:", err);
          setFirstMonthPrice(null);
          setLoadingFirstMonthPrice(false);
        });
    }
  }, [isFirstSubscription, loadingUser]);

  // Fetch price data from Stripe when it's not the first subscription
  useEffect(() => {
    if (!isFirstSubscription && !loadingUser) {
      setLoadingPrices(true);
      const priceIds = getSecondMonthPriceIds();
      if (priceIds.length === 0) {
        console.warn("⚠️ [Signup Page] No price IDs configured");
        setLoadingPrices(false);
        return;
      }

      const priceIdsString = priceIds.join(",");
      console.log(`🔍 [Signup Page] Fetching prices: ${priceIdsString}`);

      fetch(`/api/stripe/prices?priceIds=${priceIdsString}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch prices");
          }
          return res.json();
        })
        .then((data) => {
          console.log(`📥 [Signup Page] Received price data:`, data.prices);
          if (data.prices && data.prices.length > 0) {
            setPriceData(data.prices);
          } else {
            console.warn("⚠️ [Signup Page] No valid prices returned from API");
            setPriceData([]);
          }
          setLoadingPrices(false);
        })
        .catch((err) => {
          console.error("❌ [Signup Page] Error fetching prices:", err);
          setPriceData([]);
          setLoadingPrices(false);
        });
    }
  }, [isFirstSubscription, loadingUser]);

  // Fetch onboarding sentences when it's the first subscription
  useEffect(() => {
    if (isFirstSubscription && userId && !loadingUser) {
      setLoadingSentences(true);
      console.log(`🔍 [Signup Page] Fetching onboarding sentences for userId: ${userId}`);

      fetch(`/api/onboarding/sentences?userId=${userId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error("❌ [Signup Page] API error response:", {
              status: res.status,
              statusText: res.statusText,
              error: errorData.error,
              errorCode: errorData.errorCode,
              details: errorData.details,
            });
            throw new Error(errorData.error || "Failed to fetch sentences");
          }
          return res.json();
        })
        .then((data) => {
          console.log(`📥 [Signup Page] Received sentences:`, data.sentences);
          if (data.sentences) {
            setSentences(data.sentences);
            setSentencesError(false);
          }
          if (data.monthlySubmissions) {
            setMonthlySubmissions(data.monthlySubmissions);
          }
          setLoadingSentences(false);
        })
        .catch((err) => {
          console.error("❌ [Signup Page] Error fetching sentences:", err);
          setSentences(null);
          setSentencesError(true);
          setLoadingSentences(false);
        });
    }
  }, [isFirstSubscription, userId, loadingUser]);

  const handleStartCommitment = () => {
    // For second+ subscriptions, map selectedMode to priceId
    if (!isFirstSubscription) {
      if (selectedMode === 1 && priceData.length > 0) {
        setSelectedPriceId(priceData[0].id);
      } else if (selectedMode === 2 && priceData.length > 1) {
        setSelectedPriceId(priceData[1].id);
      } else if (selectedMode === 3 && priceData.length > 2) {
        setSelectedPriceId(priceData[2].id);
      } else {
        return; // No valid price selected
      }
    }
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

  // Show full page loading while fetching sentences for first subscription
  if (isFirstSubscription && !useTrial && loadingSentences) {
    return (
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
    );
  }

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
              {/* Header - Show for all subscriptions */}
              {!useTrial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-12 sm:mb-16"
                >
                  <h1
                    style={{
                      fontSize: "clamp(40px, 7vw, 72px)",
                      fontWeight: 800,
                      color: "#e0e0e0",
                      marginBottom: "8px",
                      lineHeight: 1.2,
                      fontFamily: "'OggText', 'Ogg', serif",
                    }}
                  >
                    Make progress. Get paid.
                  </h1>
                </motion.div>
              )}

              {/* Mode Carousel - Show for all subscriptions */}
              {/* Mode Carousel - Show for all subscriptions */}
              {!useTrial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mb-8 sm:mb-12"
                >
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 subscription-scroll-container snap-x snap-mandatory">
                    {[
                      { name: "PROTAGONIST MODE", perDay: "$1+", price: 30, mode: 1 as const },
                      { name: "HERO MODE", perDay: "$2+", price: 60, mode: 2 as const },
                      { name: "LEGEND MODE", perDay: "$3+", price: 90, mode: 3 as const },
                    ].map((tier) => {
                      const isSelected = selectedMode === tier.mode;
                      const isLocked = isFirstSubscription && tier.mode > 1;

                      return (
                        <div
                          key={tier.name}
                          className={`min-w-[280px] sm:min-w-[320px] snap-center ${isLocked ? "opacity-50" : ""}`}
                          onClick={() => {
                            if (!isLocked) {
                              setSelectedMode(tier.mode);
                              if (!isFirstSubscription && priceData.length >= tier.mode) {
                                setSelectedPriceId(priceData[tier.mode - 1].id);
                              }
                              setAgreedToTerms(false);
                            }
                          }}
                        >
                          <div
                            className={isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                            style={{
                              backgroundColor: "#1a1a1a",
                              border: isSelected
                                ? "2px solid rgba(255, 255, 255, 0.3)"
                                : "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "24px",
                              padding: "32px",
                              position: "relative",
                              overflow: "hidden",
                              transition: "all 0.3s ease",
                            }}
                          >
                            {/* Inner shadows */}
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.25), rgba(0,0,0,0.12), rgba(0,0,0,0.05), transparent)", borderRadius: "24px 24px 0 0", pointerEvents: "none", zIndex: 1 }} />
                            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "35%", background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)", borderRadius: "24px 0 0 24px", pointerEvents: "none", zIndex: 1 }} />
                            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "35%", background: "linear-gradient(to left, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)", borderRadius: "0 24px 24px 0", pointerEvents: "none", zIndex: 1 }} />

                            {isLocked && (
                              <div style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "#1a1a1a", padding: "4px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, color: "#888888", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", zIndex: 3 }}>
                                LOCKED
                              </div>
                            )}

                            <div className="text-center" style={{ position: "relative", zIndex: 2 }}>
                              <div style={{ fontSize: "14px", fontWeight: 800, color: isLocked ? "#666666" : "#888888", letterSpacing: "2px", marginBottom: "12px", fontFamily: "'OggText', 'Ogg', serif" }}>
                                {tier.name}
                              </div>
                              <div style={{ fontSize: "56px", fontWeight: 800, color: isLocked ? "#666666" : "#e0e0e0", marginBottom: "4px", fontFamily: "'OggText', 'Ogg', serif", lineHeight: 1 }}>
                                {tier.perDay.replace("+", "")}
                                {tier.perDay.includes("+") && (
                                  <span style={{ fontSize: "32px", verticalAlign: "middle" }}>+</span>
                                )}
                              </div>
                              <div style={{ fontSize: "14px", color: isLocked ? "#555555" : "#888888", marginBottom: "20px", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                                earned back per day
                              </div>

                              {isLocked ? (
                                <div style={{ fontSize: "13px", color: "#666666", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "left", lineHeight: "1.6" }}>
                                  {tier.mode === 2 ? (
                                    <>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Charity Unlock:</div>
                                        <div>Protagonist donates $2 to the charity of your choice for every 7 days of upload consistency.</div>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Real Life Accountability:</div>
                                        <div>Choose a friend who gets notified every time you miss an upload.</div>
                                      </div>
                                    </>
                                  ) : tier.mode === 3 ? (
                                    <>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Treasure Mode:</div>
                                        <div>Hit 30 days of consistency and we'll send you $10 cash.</div>
                                      </div>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Challenge a Friend:</div>
                                        <div>Set a bet with your friend. Whoever is most consistent takes home the $.</div>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>XP Unlock:</div>
                                        <div>Earn extra points for each completed task and unlock real rewards from our partners.</div>
                                      </div>
                                    </>
                                  ) : (
                                    <div>Unlock after month 1</div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(0,0,0,0.3)", marginBottom: "16px" }}>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#e0e0e0", fontFamily: "'OggText', 'Ogg', serif", marginBottom: "4px" }}>
                                      ${tier.price}/mo
                                    </div>
                                  </div>
                                  {tier.mode === 1 ? (
                                    loadingSentences ? (
                                      <div style={{ fontSize: "13px", color: "#888888", lineHeight: "1.6", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "center" }}>
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/30"></div>
                                          <span>Loading...</span>
                                        </div>
                                      </div>
                                    ) : sentences && sentences.sentence1 ? (
                                      <div style={{ fontSize: "13px", color: "#b0b0b0", lineHeight: "1.6", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "center" }}>
                                        <div style={{ marginBottom: "8px" }}>
                                          {sentences.sentence1}
                                        </div>
                                        <div style={{ marginBottom: "8px" }}>
                                          If it passes, you earn ${tier.price} ÷ your uploads.
                                        </div>
                                        <div>
                                          If it doesn't, a human double checks it to verify.
                                        </div>
                                      </div>
                                    ) : sentencesError ? (
                                      <div style={{ fontSize: "13px", color: "#b0b0b0", lineHeight: "1.6", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "center" }}>
                                        <div style={{ marginBottom: "8px" }}>
                                          Each day you upload proof, I'll check it.
                                        </div>
                                        <div style={{ marginBottom: "8px" }}>
                                          If it passes, you earn ${tier.price} ÷ your uploads.
                                        </div>
                                        <div>
                                          If it doesn't, a human double checks it to verify.
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: "13px", color: "#888888", lineHeight: "1.6", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "center" }}>
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/30"></div>
                                          <span>Loading...</span>
                                        </div>
                                      </div>
                                    )
                                  ) : tier.mode === 2 ? (
                                    <div style={{ fontSize: "13px", color: "#b0b0b0", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "left", lineHeight: "1.6" }}>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Charity Unlock:</div>
                                        <div>Protagonist donates $2 to the charity of your choice for every 7 days of upload consistency.</div>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Real Life Accountability:</div>
                                        <div>Choose a friend who gets notified every time you miss an upload.</div>
                                      </div>
                                    </div>
                                  ) : tier.mode === 3 ? (
                                    <div style={{ fontSize: "13px", color: "#b0b0b0", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", textAlign: "left", lineHeight: "1.6" }}>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Treasure Mode:</div>
                                        <div>Hit 30 days of consistency and we'll send you $10 cash.</div>
                                      </div>
                                      <div style={{ marginBottom: "12px" }}>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>Challenge a Friend:</div>
                                        <div>Set a bet with your friend. Whoever is most consistent takes home the $.</div>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, marginBottom: "4px", color: "#888888" }}>XP Unlock:</div>
                                        <div>Earn extra points for each completed task and unlock real rewards from our partners.</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: "13px", color: "#ef4444", fontWeight: 600, fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                                      Miss a day? That money is gone.
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Three Sentences - Show for all subscriptions */}
              {/* Sentences */}
              {!useTrial && sentences && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mb-8 sm:mb-12 max-w-2xl mx-auto"
                >
                  <div style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "16px", padding: "20px 24px" }}>
                    <div className="text-center space-y-2">

                      {sentences.sentence3 && (
                        <p style={{ color: "#b0b0b0", fontSize: "14px", lineHeight: "1.6", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                          {sentences.sentence3}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Old Header - Only show for trials */}
              {useTrial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-8 sm:mb-12 md:mb-16"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="trial-header"
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
                        Having Second Thoughts? We Get It.
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
                        Taking the next step in your life is a big decision. Try a smaller step with our 3-day trial.
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {/* How It Works - Hidden for new first subscription design */}
              {false && isFirstSubscription && !useTrial && (
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
                      Earn back money for every successful submission you complete.
                    </p>
                  </NeumorphicCard>
                </motion.div>
              )}

              {/* Main Commitment Plan - Only show for trials */}
              {useTrial && (
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
                            {isFirstSubscription && useTrial ? (
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
                                    $3
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "16px",
                                      color: "#888888",
                                      fontFamily:
                                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                    }}
                                  >
                                    for 3 days
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
                                  Then {firstMonthPrice ? `$${firstMonthPrice.unitAmount ? (firstMonthPrice.unitAmount / 100).toFixed(0) : "98"}/month` : "$98/month"} after trial ends
                                </p>
                              </>
                            ) : isFirstSubscription ? (
                              <>
                                {loadingFirstMonthPrice ? (
                                  <div className="flex justify-center items-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/30"></div>
                                  </div>
                                ) : firstMonthPrice ? (
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
                                        ${firstMonthPrice.unitAmount ? (firstMonthPrice.unitAmount / 100).toFixed(0) : "N/A"}
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
                                      {firstMonthPrice.metadata.description || "Start your commitment immediately"}
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
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <p
                                  style={{
                                    color: "#b0b0b0",
                                    fontSize: "16px",
                                    marginBottom: "8px",
                                    fontFamily:
                                      "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                                  }}
                                >
                                  Select a subscription plan below
                                </p>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Trial Refund */}
                      {isFirstSubscription && useTrial && showTrialOption && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.4 }}
                          style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderRadius: "16px", padding: "20px", marginBottom: "24px", border: "1px solid rgba(34, 197, 94, 0.2)" }}
                        >
                          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e", marginBottom: "8px", textAlign: "center", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", letterSpacing: "1px" }}>
                            TRIAL REFUND
                          </h4>
                          <p style={{ fontSize: "14px", color: "#b0b0b0", marginBottom: "12px", textAlign: "center", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                            Your $3 is divided across your trial days. Complete each day and earn $1+ back.
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(34, 197, 94, 0.15)" }}>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "14px", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                              Complete all 3 days = full $3 back
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* First Month Per-Submission Refund Structure - Only show when NOT in trial mode and first subscription */}
                      {/* How You Earn Back - Simplified */}
                      {isFirstSubscription && !useTrial && firstMonthPrice && (
                        <div style={{ backgroundColor: "rgba(34, 197, 94, 0.06)", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e", marginBottom: "12px", textAlign: "center", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", letterSpacing: "1px" }}>
                            HOW YOU EARN BACK
                          </h4>
                          <p style={{ fontSize: "14px", color: "#999999", textAlign: "center", lineHeight: 1.6, fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif", marginBottom: "16px" }}>
                            Your ${firstMonthPrice.unitAmount ? (firstMonthPrice.unitAmount / 100).toFixed(0) : "30"} is divided across your submission days. Complete each day and earn $1+ back.
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></div>
                            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "14px", fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif" }}>
                              Complete every submission = full ${firstMonthPrice.unitAmount ? (firstMonthPrice.unitAmount / 100).toFixed(0) : "30"} back
                            </span>
                          </div>
                        </div>
                      )}

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
                            {isFirstSubscription && useTrial
                              ? `I understand this starts with a $3 3-day trial, then becomes a ${firstMonthPrice ? `$${firstMonthPrice.unitAmount ? (firstMonthPrice.unitAmount / 100).toFixed(0) : "98"}/month` : "$98/month"} subscription. I understand that refunds are based on successful submissions. I can cancel anytime.`
                              : "I understand that refunds are based on successful submissions. I can cancel anytime."}
                          </span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <motion.button
                        onClick={handleStartCommitment}
                        disabled={
                          !agreedToTerms ||
                          !!userError ||
                          loadingUser ||
                          (!isFirstSubscription && !selectedPriceId)
                        }
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
                            : !isFirstSubscription && !selectedPriceId
                              ? "Please select a subscription plan"
                              : agreedToTerms
                                ? "Commit to My Goal"
                                : "Please agree to terms"}
                      </motion.button>

                      {/* Not Ready Yet Button / Switch Back Button - Only show for first subscription */}
                      {isFirstSubscription && (
                        !useTrial ? (
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
                                setAgreedToTerms(false);
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
                              Not ready yet? Try our 3-day trial for $3
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
                                setAgreedToTerms(false);
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
                        )
                      )}
                    </NeumorphicCard>
                  </div>
                </motion.div>
              )}

              {/* Terms and Checkout Button - Show for all subscriptions */}
              {!useTrial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="max-w-3xl mx-auto"
                >
                  <NeumorphicCard>
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
                          {isFirstSubscription
                            ? `I understand that I pay $30/month and earn $1+ back for each successful submission. Miss a day, that money is gone. I can cancel anytime.`
                            : selectedMode === 1
                              ? `I understand that I pay $30/month and earn $1+ back for each successful submission. Miss a day, that money is gone. I can cancel anytime.`
                              : selectedMode === 2
                                ? `I understand that I pay $60/month and earn $2+ back for each successful submission. Miss a day, that money is gone. I can cancel anytime.`
                                : `I understand that I pay $90/month and earn $3+ back for each successful submission. Miss a day, that money is gone. I can cancel anytime.`}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      onClick={handleStartCommitment}
                      disabled={
                        !agreedToTerms ||
                        !!userError ||
                        loadingUser ||
                        (!isFirstSubscription && !selectedMode)
                      }
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
                          : !isFirstSubscription && !selectedMode
                            ? "Please select a mode"
                            : agreedToTerms
                              ? "Commit to My Goal"
                              : "Please agree to terms"}
                    </motion.button>

                    {/* Not Ready Yet Button - Only show for first subscription */}
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
                          setAgreedToTerms(false);
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
                        Not ready yet? Try our 3-day trial for $3
                      </button>
                    </motion.div>
                  </NeumorphicCard>
                </motion.div>
              )}

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
                    useTrial={isFirstSubscription ? useTrial : false}
                    isFirstSubscription={isFirstSubscription}
                    selectedPriceId={selectedPriceId || undefined}
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