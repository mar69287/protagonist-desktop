"use client";

import { motion } from "framer-motion";
import { CheckCircle, Zap, Shield, Award } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    features: [
      "Unlimited goal tracking",
      "Commitment contracts",
      "Progress analytics",
      "Mobile app access",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Annual",
    price: "$99.99",
    period: "/year",
    savings: "Save $20",
    features: [
      "Everything in Monthly",
      "Priority support",
      "Advanced analytics",
      "Custom goal templates",
      "Accountability partner matching",
    ],
    popular: true,
  },
];

export default function SignupPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = (planName: string) => {
    setSelectedPlan(planName);
    // TODO: Integrate Stripe checkout here
    console.log("Selected plan:", planName);
  };

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            Start Your Journey
          </h1>
          <p className="text-xl text-[#a0a0a0] max-w-2xl mx-auto">
            Choose the plan that works best for you and begin accomplishing your goals today.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          <div className="glass-light rounded-2xl p-6">
            <Zap className="w-10 h-10 text-white mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Goal Tracking
            </h3>
            <p className="text-[#a0a0a0] text-sm">
              Track unlimited goals with detailed progress monitoring and insights.
            </p>
          </div>

          <div className="glass-light rounded-2xl p-6">
            <Shield className="w-10 h-10 text-white mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Commitment Contracts
            </h3>
            <p className="text-[#a0a0a0] text-sm">
              Sign binding contracts to hold yourself accountable to your goals.
            </p>
          </div>

          <div className="glass-light rounded-2xl p-6">
            <Award className="w-10 h-10 text-white mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Earn Rewards
            </h3>
            <p className="text-[#a0a0a0] text-sm">
              Get paid for achieving your goals and staying committed to your plan.
            </p>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              className={`relative glass-light rounded-2xl p-8 ${
                plan.popular
                  ? "border-2 border-white"
                  : "border border-[rgba(255,255,255,0.2)]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-[#a0a0a0] ml-2">{plan.period}</span>
                </div>
                {plan.savings && (
                  <span className="text-white text-sm font-medium mt-2 inline-block">
                    {plan.savings}
                  </span>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-white mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-[#a0a0a0]">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={() => handleSubscribe(plan.name)}
                className={`w-full py-4 rounded-xl font-semibold transition-colors ${
                  plan.popular
                    ? "bg-white text-black hover:bg-[#f5f5f5]"
                    : "glass-light text-white hover:bg-[rgba(255,255,255,0.15)]"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16 space-y-4"
        >
          <p className="text-[#a0a0a0] text-sm">
            Secure payment processing powered by Stripe
          </p>
          <p className="text-[#a0a0a0] text-sm">
            Cancel anytime • No hidden fees • 30-day money-back guarantee
          </p>
        </motion.div>
      </div>
    </div>
  );
}

