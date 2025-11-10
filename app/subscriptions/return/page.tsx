"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ReturnPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/stripe/session-status?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setStatus(data.status);
          setCustomerEmail(data.customer_email);
        })
        .catch((error) => {
          console.error("Error fetching session status:", error);
          setStatus("error");
        });
    }
  }, [sessionId]);

  if (!sessionId || status === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full glass-light rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4 sm:mb-6"
          >
            <div className="bg-green-500/20 rounded-full p-3 sm:p-4">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" />
            </div>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Payment Successful!
          </h1>

          <p className="text-[#a0a0a0] mb-2 text-sm sm:text-base">
            Thank you for your commitment! A confirmation email will be sent to:
          </p>

          <p className="text-white font-semibold mb-6 text-sm sm:text-base break-all">
            {customerEmail}
          </p>

          <div className="glass-medium rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
              Your First Month - How You Earn It Back:
            </h2>
            <ul className="space-y-2 sm:space-y-3 text-[#a0a0a0]">
              <li className="flex justify-between text-xs sm:text-sm">
                <span>0-50% goal completion:</span>
                <span className="text-white ml-2">$0 back</span>
              </li>
              <li className="flex justify-between text-xs sm:text-sm">
                <span>50-70% goal completion:</span>
                <span className="text-white ml-2">$22 back</span>
              </li>
              <li className="flex justify-between text-xs sm:text-sm">
                <span>70-90% goal completion:</span>
                <span className="text-white ml-2">$49 back</span>
              </li>
              <li className="flex justify-between text-xs sm:text-sm">
                <span>90%+ goal completion:</span>
                <span className="text-green-400 font-semibold ml-2">
                  All back ($98)
                </span>
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t border-glass-light">
              <p className="text-xs sm:text-sm text-[#a0a0a0] mb-2 font-semibold">
                Following Months: $98/month
              </p>
              <ul className="space-y-2 text-[#a0a0a0] text-xs">
                <li>• 0-70%: $0 back</li>
                <li>• 70-90%: $25 back</li>
                <li>• 90%+: $50 back (max)</li>
              </ul>
            </div>
          </div>

          <Link
            href="/"
            className="inline-block bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#f5f5f5] transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full glass-light rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
          Something went wrong
        </h1>
        <p className="text-[#a0a0a0] mb-6 text-sm sm:text-base">
          We couldn&apos;t process your payment. Please try again or contact
          support.
        </p>
        <Link
          href="/subscriptions/signup"
          className="inline-block bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold hover:bg-[#f5f5f5] transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
