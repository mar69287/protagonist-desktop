"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
  const [subPhase, setSubPhase] = useState(1);
  const lottieRef = useRef<any>(null);
  const [lottieDirection, setLottieDirection] = useState<1 | -1>(1);
  const [animationData, setAnimationData] = useState<any>(null);

  // Load commitment animation
  useEffect(() => {
    fetch("/commitment.json")
      .then((response) => response.json())
      .then((data) => setAnimationData(data));
  }, []);

  // Yoyo effect for Lottie animation
  const handleAnimationComplete = () => {
    setLottieDirection((prev) => (prev === 1 ? -1 : 1));
  };

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setDirection(lottieDirection);
      lottieRef.current.play();
    }
  }, [lottieDirection]);

  // SubPhase 1 animations - plan and why sections
  const [planOpacity, setPlanOpacity] = useState(0);
  const [whyOpacity, setWhyOpacity] = useState(0);

  useEffect(() => {
    if (subPhase === 1 && commitmentData.goal) {
      // Plan section fade in
      setTimeout(() => {
        setPlanOpacity(1);
      }, 500);

      // Hold plan for 3 seconds
      setTimeout(() => {
        // Plan fade out
        setPlanOpacity(0);

        // Why section fade in
        setTimeout(() => {
          setWhyOpacity(1);
          // Why section stays visible - no fade out, no button
        }, 500);
      }, 3500);
    }
  }, [subPhase, commitmentData.goal]);

  return (
    <div className="fixed inset-0 w-full h-screen bg-black overflow-hidden">
      {/* Commitment Lottie Background */}
      {animationData && (
        <div className="fixed inset-0 z-0">
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            autoplay={true}
            onComplete={handleAnimationComplete}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            rendererSettings={{
              preserveAspectRatio: "xMidYMid slice",
            }}
          />
        </div>
      )}

      {/* Content */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {subPhase === 1 && (
          <div className="flex-1 flex items-start justify-start p-6 md:p-8 pt-16 md:pt-20">
            {/* Plan section - fades in and out first */}
            <motion.div
              className="absolute top-16 md:top-20 left-6 md:left-8 right-6 md:right-8 text-center"
              animate={{ opacity: planOpacity }}
              transition={{ duration: 0.6 }}
            >
              <h2
                className="text-2xl md:text-3xl font-bold text-white mb-6"
                style={{
                  fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                }}
              >
                Your plan.
              </h2>
              <div>
                <p
                  className="text-base md:text-lg text-white leading-relaxed"
                  style={{
                    fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                  }}
                >
                  {capitalizeFirstLetter(commitmentData.goal)}{" "}
                  {commitmentData.actionSummary}
                </p>
              </div>
            </motion.div>

            {/* Why section - fades in after plan and stays visible */}
            <motion.div
              className="absolute top-16 md:top-20 left-6 md:left-8 right-6 md:right-8 text-center"
              animate={{ opacity: whyOpacity }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <p
                  className="text-base md:text-lg text-white leading-relaxed"
                  style={{
                    fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                  }}
                >
                  {capitalizeFirstLetter(commitmentData.coreReason)}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
