"use client";

import { motion } from "framer-motion";
import { Target, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6">
              Protagonist
            </h1>
            <p className="text-xl sm:text-2xl text-[#a0a0a0] mb-4">
              Get Paid to Accomplish Your Goals
            </p>
            <p className="text-base sm:text-lg text-[#a0a0a0] max-w-2xl mx-auto mb-12">
              Transform your aspirations into achievements with accountability
              that matters. Set goals, commit to them, and earn rewards as you
              succeed.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <motion.button
                  className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-[#f5f5f5] transition-colors w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Log In
                </motion.button>
              </Link>
              <Link href="/subscriptions/signup">
                <motion.button
                  className="px-8 py-4 glass-light text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.15)] transition-colors w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <div className="glass-light rounded-2xl p-8 hover:bg-[rgba(255,255,255,0.15)] transition-colors">
              <Target className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Define Your Goals
              </h3>
              <p className="text-[#a0a0a0]">
                Interactive chat-based onboarding guides you through setting
                meaningful, achievable goals.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-light rounded-2xl p-8 hover:bg-[rgba(255,255,255,0.15)] transition-colors">
              <Award className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Commit & Sign
              </h3>
              <p className="text-[#a0a0a0]">
                Create a commitment contract that holds you accountable to your
                aspirations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-light rounded-2xl p-8 hover:bg-[rgba(255,255,255,0.15)] transition-colors">
              <TrendingUp className="w-12 h-12 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Track & Earn
              </h3>
              <p className="text-[#a0a0a0]">
                Monitor your progress and get rewarded as you accomplish your
                committed goals.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-light rounded-2xl p-10 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Your Journey Starts Here
            </h2>
            <p className="text-lg text-[#a0a0a0] mb-6">
              Protagonist is a mobile app available on iOS and Android that
              combines goal-setting psychology with financial incentives. Define
              what matters, commit to your plan, and let us help you become the
              protagonist of your own success story.
            </p>
            <Link href="/subscriptions/signup">
              <motion.button
                className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-[#f5f5f5] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Journey
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
