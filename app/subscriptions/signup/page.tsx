"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
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

// Component that uses searchParams
function SignupContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [showCheckout, setShowCheckout] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

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
              className="fixed top-24 sm:top-28 right-4 sm:right-8 z-50 glass-light rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              <span className="text-white text-sm hidden sm:inline">
                Loading...
              </span>
            </motion.div>
          )}

          {userError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-24 sm:top-28 left-1/2 transform -translate-x-1/2 z-50 glass-light rounded-xl px-4 py-3 border-2 border-red-500/30 shadow-lg max-w-md"
            >
              <p className="text-red-400 text-sm">{userError}</p>
            </motion.div>
          )}

          {user && !loadingUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
              className="fixed top-24 sm:top-28 right-4 sm:right-8 z-50 glass-light rounded-full px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-lg border border-white/10 hover:border-white/20 transition-all group"
            >
              {/* User Avatar Circle */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-white/20 to-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <span className="text-white font-semibold text-xs sm:text-sm">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
              </div>

              {/* User Info */}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-white font-medium text-sm leading-tight">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[#a0a0a0] text-xs leading-tight">
                  {user.email}
                </span>
              </div>

              {/* Mobile: Just show initials, expand on hover */}
              <div className="sm:hidden">
                <div className="group-hover:hidden">
                  <span className="text-white text-xs font-medium">
                    {user.firstName}
                  </span>
                </div>
                <div className="hidden group-hover:flex flex-col">
                  <span className="text-white text-xs font-medium whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[#a0a0a0] text-xs truncate max-w-[120px]">
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
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  Put Your Money Where Your Goals Are
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-[#a0a0a0] max-w-2xl mx-auto px-2">
                  Monthly subscription that rewards your progress. The more you
                  complete, the more you earn back.
                </p>
              </motion.div>

              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 md:mb-16"
              >
                <div className="glass-light rounded-xl sm:rounded-2xl p-5 sm:p-6">
                  <Target className="w-8 h-8 sm:w-10 sm:h-10 text-white mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Set Your Goal
                  </h3>
                  <p className="text-[#a0a0a0] text-sm">
                    Define your goal and commit $144 to hold yourself
                    accountable.
                  </p>
                </div>

                <div className="glass-light rounded-xl sm:rounded-2xl p-5 sm:p-6">
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-white mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Track Progress
                  </h3>
                  <p className="text-[#a0a0a0] text-sm">
                    Complete tasks and milestones toward your goal. Every step
                    counts.
                  </p>
                </div>

                <div className="glass-light rounded-xl sm:rounded-2xl p-5 sm:p-6">
                  <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-white mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Earn Money Back
                  </h3>
                  <p className="text-[#a0a0a0] text-sm">
                    The more you achieve, the more you earn back. Hit 90%+ for a
                    full refund.
                  </p>
                </div>
              </motion.div>

              {/* Main Commitment Plan */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="max-w-3xl mx-auto"
              >
                <div className="relative glass-light rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 border-2 border-white">
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-white text-black px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                      Monthly Subscription
                    </span>
                  </div>

                  {/* First Month */}
                  <div className="text-center mb-6 sm:mb-8 mt-4 sm:mt-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      First Month
                    </h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl sm:text-5xl font-bold text-white">
                        $98
                      </span>
                    </div>
                    <p className="text-[#a0a0a0] mt-2 text-sm sm:text-base">
                      Full refund possible - prove your commitment
                    </p>
                  </div>

                  {/* First Month Refund Structure */}
                  <div className="glass-medium rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-center">
                      First Month Earnings
                    </h4>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)]">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            0-70% completion
                          </span>
                        </div>
                        <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          $0 back
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)]">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            70-90% completion
                          </span>
                        </div>
                        <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          $50 back
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)] border border-green-500/30">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            90%+ completion
                          </span>
                        </div>
                        <span className="text-green-400 font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          All back ($98)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Following Months */}
                  <div className="border-t border-glass-light pt-6 sm:pt-8 mb-6 sm:mb-8">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                        Following Months
                      </h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl sm:text-4xl font-bold text-white">
                          $98
                        </span>
                        <span className="text-[#a0a0a0] ml-2">/month</span>
                      </div>
                      <p className="text-[#a0a0a0] mt-2 text-sm">
                        $48 processing fee • Up to $50 back
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)]">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            0-70% completion
                          </span>
                        </div>
                        <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          $0 back
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)]">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            70-90% completion
                          </span>
                        </div>
                        <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          $25 back
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-[rgba(255,255,255,0.03)] border border-green-500/30">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0"></div>
                          <span className="text-[#a0a0a0] text-xs sm:text-sm">
                            90%+ completion
                          </span>
                        </div>
                        <span className="text-green-400 font-semibold text-xs sm:text-sm whitespace-nowrap ml-2">
                          $50 back
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-2 border-white/30 bg-transparent checked:bg-white checked:border-white transition-all cursor-pointer"
                      />
                      <span className="text-[#a0a0a0] text-sm group-hover:text-white transition-colors">
                        I understand this is a monthly subscription with
                        different pricing and refund structures. I commit to
                        tracking my progress honestly and understand that
                        refunds are based on verified completion percentages. I
                        can cancel anytime.
                      </span>
                    </label>
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    onClick={handleStartCommitment}
                    disabled={!agreedToTerms || !!userError || loadingUser}
                    className={`w-full py-4 rounded-xl font-semibold transition-all ${
                      agreedToTerms && !userError && !loadingUser
                        ? "bg-white text-black hover:bg-[#f5f5f5] cursor-pointer"
                        : "glass-light text-[#a0a0a0] cursor-not-allowed"
                    }`}
                    whileHover={
                      agreedToTerms && !userError && !loadingUser
                        ? { scale: 1.02 }
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
                </div>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center mt-8 sm:mt-12 md:mt-16 space-y-2 sm:space-y-4 px-4"
              >
                <p className="text-[#a0a0a0] text-xs sm:text-sm">
                  🔒 Secure payment processing powered by Stripe
                </p>
                <p className="text-[#a0a0a0] text-xs sm:text-sm">
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
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                  Complete Your Commitment
                </h2>
                <p className="text-[#a0a0a0] mb-2 text-sm sm:text-base">
                  Secure payment powered by Stripe
                </p>
                <p className="text-xs sm:text-sm text-[#808080]">
                  All payment information is encrypted and secure
                </p>
              </div>

              {/* White container for Stripe checkout */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl">
                <CheckoutForm />
              </div>

              <button
                onClick={() => setShowCheckout(false)}
                className="mt-6 sm:mt-8 text-[#a0a0a0] hover:text-white transition-colors mx-auto block font-medium text-sm sm:text-base"
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
