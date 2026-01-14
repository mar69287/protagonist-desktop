"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CommitmentData {
  goal: string;
  why: string;
  plan: string;
  proofMethod: string;
  submissionType: string;
  schedule: string;
  actionSummary: string;
  coreReason: string;
  proofContextSentence: string;
  worthItSentence: string;
  structuredSchedule?: {
    days: string[];
    deadline_time: string;
    frequency: string;
  };
}

interface CommitmentPhaseProps {
  commitmentText: string;
  commitmentData: CommitmentData;
  signed: boolean;
  isLoading: boolean;
  fadeIn: boolean;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  onSign: () => void;
  onBack: () => void;
}

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function CommitmentPhase({
  commitmentText,
  commitmentData,
  signed,
  isLoading,
  fadeIn,
  timezone,
  onTimezoneChange,
  onSign,
  onBack,
}: CommitmentPhaseProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showButton, setShowButton] = useState(false);

  const slides = [
    {
      title: "Your Plan",
      content: commitmentData.goal,
    },
    {
      title: "Why It Matters",
      content: commitmentData.why,
    },
    {
      content: "But let's be real.",
      delay: 2000,
    },
    {
      content: "There will be days you don't want to do this.",
      delay: 2000,
    },
    {
      content: "These next 30 days aren't about motivation.",
      delay: 2000,
    },
    {
      content: "They're about commitment.",
      delay: 2000,
    },
    {
      content:
        "When something is on the line, your brain stops negotiating with excuses. Action becomes automatic - regardless of how you feel.",
      delay: 3000,
    },
    {
      content:
        "So here's how I'm going to keep you committed. You'll put some money down. Enough to care about losing it - not so much that it stresses you out.",
      delay: 3000,
    },
    {
      content: capitalizeFirstLetter(commitmentData.proofContextSentence),
      delay: 2500,
    },
    {
      content:
        "And if life happens and you miss a day - keep going. As long as you hit 50%+ of the month — you'll get money back. And if you hit 90%+ — you'll get all of it back.",
      delay: 3000,
    },
    {
      content:
        "Most people pursue their goals because they want to. Protagonists achieve them because they have to. They know this money isn't a penalty - it's a promise. A promise to yourself to stick to the long-term plan — even when short-term motivation fades.",
      delay: 4000,
    },
    {
      content: capitalizeFirstLetter(commitmentData.worthItSentence),
      delay: 2500,
    },
  ];

  useEffect(() => {
    if (currentSlide < slides.length) {
      const delay = slides[currentSlide].delay || 3000;
      const timer = setTimeout(() => {
        if (currentSlide < slides.length - 1) {
          setCurrentSlide(currentSlide + 1);
        } else {
          setShowButton(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, slides.length]);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col justify-between h-full p-8 pt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Messages */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-3xl mx-auto">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {currentSlideData.title && (
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
                  {currentSlideData.title}
                </h2>
              )}
              <p
                className={`text-center ${
                  currentSlideData.title
                    ? "text-base md:text-lg text-gray-300"
                    : "text-lg md:text-xl text-white"
                } leading-relaxed`}
                style={{ textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)" }}
              >
                {currentSlideData.content}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Button - Show after all slides */}
        {showButton && (
          <motion.div
            className="flex flex-col items-center mb-8 space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Timezone Selector */}
            <div className="w-full max-w-md">
              <label className="block text-sm text-gray-400 mb-2 text-center">
                Select Your Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => onTimezoneChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-white transition-colors"
              >
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEDT)</option>
              </select>
            </div>

            {/* Sign Button */}
            <button
              onClick={onSign}
              disabled={signed || isLoading}
              className={`px-8 py-4 font-semibold rounded-xl text-lg transition-colors ${
                signed || isLoading
                  ? "bg-green-600 text-white cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {signed ? "Signed ✓" : "Sign My Commitment"}
            </button>

            <p className="text-xs text-gray-400 text-center max-w-md px-4">
              By signing, you agree to commit to your plan for the next 30 days.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
