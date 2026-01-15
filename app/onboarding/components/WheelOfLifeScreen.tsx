"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Award,
  Brain,
  Briefcase,
  DollarSign,
  Dumbbell,
  Heart,
  Home,
  Smile,
  Users,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface WheelArea {
  name: string;
  value: number;
  min: number;
  max: number;
}

interface WheelOfLifeScreenProps {
  fadeIn: boolean;
  onComplete: (wheelData: WheelArea[]) => void;
  onBack: () => void;
}

const WHEEL_AREAS = [
  "Friends",
  "Physical Health",
  "Career",
  "Love",
  "Mental Health",
  "Family",
  "Money",
  "Fun",
];

const AREA_ICONS: Record<string, React.ComponentType<any>> = {
  Friends: Users,
  "Physical Health": Dumbbell,
  Career: Briefcase,
  Love: Heart,
  "Mental Health": Brain,
  Family: Home,
  Money: DollarSign,
  Fun: Smile,
};

const MEASUREMENTS = [
  { label: "Thriving", min: 81, max: 100 },
  { label: "Growing", min: 61, max: 80 },
  { label: "Steady", min: 41, max: 60 },
  { label: "Struggling", min: 21, max: 40 },
  { label: "Stuck", min: 0, max: 20 },
];

const getMeasurementLabel = (percentage: number): string => {
  for (const measurement of MEASUREMENTS) {
    if (percentage >= measurement.min && percentage <= measurement.max) {
      return measurement.label;
    }
  }
  return MEASUREMENTS[MEASUREMENTS.length - 1].label;
};

// Color interpolation for liquid fill
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
};

const interpolateColor = (
  color1: string,
  color2: string,
  t: number
): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const getColorForPercentage = (percentage: number): string => {
  const colors = [
    "#2A1414", // Oxide Red (0-20%)
    "#3E2C22", // Smoked Brown (20-40%)
    "#4B554C", // Ash Olive (40-60%)
    "#3C6A63", // Deep Sage (60-80%)
    "#2A5E66", // Cold Teal (80-100%)
  ];

  if (percentage <= 20) {
    return colors[0];
  } else if (percentage <= 40) {
    const t = (percentage - 20) / 20;
    return interpolateColor(colors[0], colors[1], t);
  } else if (percentage <= 60) {
    const t = (percentage - 40) / 20;
    return interpolateColor(colors[1], colors[2], t);
  } else if (percentage <= 80) {
    const t = (percentage - 60) / 20;
    return interpolateColor(colors[2], colors[3], t);
  } else {
    const t = (percentage - 80) / 20;
    return interpolateColor(colors[3], colors[4], t);
  }
};

export default function WheelOfLifeScreen({
  fadeIn,
  onComplete,
  onBack,
}: WheelOfLifeScreenProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isReady, setIsReady] = useState(false);
  const [holdPercentage, setHoldPercentage] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null);
  const [lottieDirection, setLottieDirection] = useState<1 | -1>(1);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: "instant" });

    fetch("/bg-reality-check-bars.json")
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
      lottieRef.current.setSpeed(0.5); // Half speed
      lottieRef.current.play();
    }
  }, [lottieDirection]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
      setCountdown(null);
    }
  }, [countdown]);

  // Reset countdown when moving to a different area
  useEffect(() => {
    const currentArea = WHEEL_AREAS[currentAreaIndex];
    const hasValue = values[currentArea] !== undefined;

    if (hasValue) {
      setCountdown(null);
      setIsReady(true);
      setHoldPercentage(0);
    } else {
      setCountdown(3);
      setIsReady(false);
      setHoldPercentage(0);
    }
  }, [currentAreaIndex, values]);

  // Handle mouse/touch up
  const handleMouseUp = useCallback(() => {
    if (!isReady) return;

    setIsPressing(false);

    const finalPercentage = Math.round(holdPercentage);
    const currentArea = WHEEL_AREAS[currentAreaIndex];

    // Save any percentage >= 1% (even very short holds)
    if (finalPercentage >= 1) {
      setValues((prev) => ({ ...prev, [currentArea]: finalPercentage }));
    }

    setHoldStartTime(null);
    setHoldPercentage(0);
  }, [isReady, holdPercentage, currentAreaIndex]);

  // Handle mouse/touch down
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isReady) return;
    e.preventDefault(); // Prevent context menu and other default behaviors
    setIsPressing(true);
    setHoldStartTime(Date.now());
    setHoldPercentage(0);
  };

  // Update hold percentage while pressing
  useEffect(() => {
    if (!isPressing || !holdStartTime) return;

    let animationFrameId: number;

    const updatePercentage = () => {
      const elapsed = Date.now() - holdStartTime;
      const percentage = Math.min(100, (elapsed / 4286) * 100);
      setHoldPercentage(percentage);

      if (percentage < 100) {
        animationFrameId = requestAnimationFrame(updatePercentage);
      }
    };

    animationFrameId = requestAnimationFrame(updatePercentage);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPressing, holdStartTime]);

  // Add global mouse up listener to catch releases outside the element
  useEffect(() => {
    if (!isPressing) return;

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isPressing, handleMouseUp]);

  const handleNavigateBack = () => {
    if (currentAreaIndex > 0) {
      setCurrentAreaIndex(currentAreaIndex - 1);
      setHoldPercentage(0);
    }
  };

  const handleNavigateForward = () => {
    const currentArea = WHEEL_AREAS[currentAreaIndex];
    const isCurrentCompleted = values[currentArea] !== undefined;

    if (!isCurrentCompleted) {
      return;
    }

    // If on last area and completed, proceed to chat
    if (currentAreaIndex === WHEEL_AREAS.length - 1 && allValuesSet) {
      handleComplete();
    } else if (currentAreaIndex < WHEEL_AREAS.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1);
      setHoldPercentage(0);
    }
  };

  const handleDotPress = (index: number) => {
    const targetArea = WHEEL_AREAS[index];
    const isTargetCompleted = values[targetArea] !== undefined;

    if (index === currentAreaIndex) return;

    if (index < currentAreaIndex || isTargetCompleted) {
      setCurrentAreaIndex(index);
      setHoldPercentage(0);
    }
  };

  const handleComplete = () => {
    const wheelData: WheelArea[] = WHEEL_AREAS.map((area) => ({
      name: area,
      value: values[area],
      min: 0,
      max: 100,
    }));

    console.log("=== Wheel of Life Data ===");
    console.log(JSON.stringify(wheelData, null, 2));

    // Fade to black before completing
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position: fixed; inset: 0; background: black; z-index: 9999; opacity: 0; transition: opacity 0.5s ease-in-out;";
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      onComplete(wheelData);
      // Keep the overlay for a moment while chat phase fades in, then remove it
      setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => {
          document.body.removeChild(overlay);
        }, 500);
      }, 100);
    }, 500);
  };

  const allValuesSet = WHEEL_AREAS.every((area) => values[area] !== undefined);
  const currentArea = WHEEL_AREAS[currentAreaIndex];
  const displayPercentage = isPressing
    ? holdPercentage
    : values[currentArea] ?? 0;
  const currentMeasurement = getMeasurementLabel(displayPercentage);

  const Icon = AREA_ICONS[currentArea];

  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* Lottie Background - Fixed */}
      {animationData && (
        <div className="fixed inset-0 pointer-events-none z-0">
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

      {/* Liquid Fill Animation - Fixed, from bottom up */}
      {displayPercentage > 0 && (
        <div
          className="fixed left-0 right-0 bottom-0 z-5 pointer-events-none"
          style={{
            height: `calc((100vh - 4rem - 4rem - 3.5rem) * ${
              displayPercentage / 100
            })`,
            maxHeight: "calc(100vh - 4rem - 4rem - 3.5rem)",
            background: `linear-gradient(to top, ${getColorForPercentage(
              displayPercentage
            )}, ${getColorForPercentage(
              Math.min(displayPercentage + 20, 100)
            )})`,
          }}
        >
          {/* Wavy top edge */}
          <div className="absolute top-0 left-0 right-0 w-full overflow-hidden -translate-y-full">
            <svg
              className="w-full"
              style={{ height: "20px" }}
              preserveAspectRatio="none"
              viewBox="0 0 1200 20"
            >
              <path
                d="M0,10 Q300,0 600,10 T1200,10 L1200,20 L0,20 Z"
                fill={getColorForPercentage(
                  Math.min(displayPercentage + 20, 100)
                )}
              >
                <animate
                  attributeName="d"
                  dur="2s"
                  repeatCount="indefinite"
                  values="M0,10 Q300,0 600,10 T1200,10 L1200,20 L0,20 Z;
                          M0,10 Q300,20 600,10 T1200,10 L1200,20 L0,20 Z;
                          M0,10 Q300,0 600,10 T1200,10 L1200,20 L0,20 Z"
                />
              </path>
            </svg>
          </div>
        </div>
      )}

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col min-h-screen p-4 md:p-8 pb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-white text-2xl hover:bg-gray-700/50 transition-colors z-20"
        >
          ←
        </button>

        {/* Area Label */}
        <div className="flex items-center justify-center mt-10 mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold text-white text-center z-20"
            style={{
              fontFamily: "'Helvetica Neue', system-ui, sans-serif",
              textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
            }}
          >
            {currentArea}
          </h1>
        </div>

        {/* Main Interaction Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {countdown !== null && countdown > 0 && (
            <motion.div
              className="text-8xl md:text-9xl font-bold text-white"
              style={{
                fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                textShadow: "0px 4px 16px rgba(0, 0, 0, 0.9)",
              }}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              key={countdown}
            >
              {countdown}
            </motion.div>
          )}

          {isReady && (
            <>
              {/* Full Screen Press Area */}
              <div
                className="absolute inset-0 cursor-pointer select-none z-10"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  if (isPressing) handleMouseUp();
                }}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onTouchCancel={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
              />

              {/* Circular Press Button (Left Side) */}
              {displayPercentage === 0 && (
                <div className="absolute left-8 md:left-16 z-15 w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-blue-400 bg-blue-400/20 flex items-center justify-center pointer-events-none">
                  <p
                    className="text-white text-base md:text-lg font-semibold"
                    style={{
                      fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                      textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
                    }}
                  >
                    Press & Hold
                  </p>
                </div>
              )}

              {/* Measurements Sidebar */}
              <div className="absolute right-4 md:right-8 flex flex-col gap-16 md:gap-24 text-right z-15 pointer-events-none">
                {MEASUREMENTS.map((measurement) => {
                  const isActive =
                    displayPercentage >= measurement.min &&
                    displayPercentage <= measurement.max;
                  return (
                    <div
                      key={measurement.label}
                      className={`transition-all duration-200 ${
                        isActive
                          ? "text-white text-lg md:text-xl font-bold scale-110"
                          : "text-gray-500 text-sm md:text-base"
                      }`}
                      style={{ textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)" }}
                    >
                      {measurement.label}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Progress Navigator */}
        <div className="flex items-center justify-between gap-2 md:gap-4 mt-4 md:mt-6 pb-6 md:pb-4 px-3 md:px-4">
          {/* Back Button - Circular */}
          <button
            onClick={handleNavigateBack}
            disabled={currentAreaIndex === 0}
            className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-xl md:text-2xl transition-all shrink-0 ${
              currentAreaIndex === 0
                ? "bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-30"
                : "bg-gray-700 text-white hover:bg-gray-600 border border-gray-600"
            }`}
            style={{ lineHeight: "0" }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: "3px",
              }}
            >
              ←
            </span>
          </button>

          {/* Icons */}
          <div className="flex gap-1.5 md:gap-2 items-center">
            {WHEEL_AREAS.map((area, index) => {
              const isCompleted = values[area] !== undefined;
              const isCurrent = index === currentAreaIndex;
              const Icon = AREA_ICONS[area];

              let iconColor = "#6b7280"; // gray-500 for inactive
              if (isCompleted) {
                iconColor = "#4ade80"; // green-400 for completed
              } else if (isCurrent) {
                iconColor = "#60a5fa"; // blue-400 for current
              }

              return (
                <button
                  key={area}
                  onClick={() => handleDotPress(index)}
                  className="p-0.5 md:p-1 transition-all"
                  disabled={index > currentAreaIndex && !isCompleted}
                >
                  <Icon
                    size={18}
                    color={iconColor}
                    strokeWidth={2}
                    className="md:w-5 md:h-5"
                  />
                </button>
              );
            })}
          </div>

          {/* Forward Button - Circular */}
          <button
            onClick={handleNavigateForward}
            disabled={values[currentArea] === undefined}
            className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-xl md:text-2xl transition-all shrink-0 ${
              values[currentArea] === undefined
                ? "bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-30"
                : "bg-white text-black hover:bg-gray-100"
            }`}
            style={{ lineHeight: "0" }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: "3px",
              }}
            >
              →
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
