"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface IntroScreenProps {
  fadeIn: boolean;
  onStart: () => void;
}

// Calculate duration based on word count
const calculateDuration = (text: string): number => {
  if (text === "") return 800;

  const wordCount = text.split(/\s+/).length;
  const wordsPerMinute = 200;
  const readingTime = (wordCount / wordsPerMinute) * 60 * 1000;
  const adjustedTime = readingTime * 1.2; // Add 20% for comprehension

  // Clamp between 1.5 and 6 seconds
  return Math.min(Math.max(adjustedTime, 1500), 6000);
};

export default function IntroScreen({ fadeIn, onStart }: IntroScreenProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [animationData, setAnimationData] = useState<any>(null);
  const [realityCheckAnimationData, setRealityCheckAnimationData] =
    useState<any>(null);
  const [showScrollWheel, setShowScrollWheel] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lottieLoaded, setLottieLoaded] = useState(false);
  const [lottieDirection, setLottieDirection] = useState(1);
  const lottieRef = useRef<any>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [fadeToBlack, setFadeToBlack] = useState(false);

  useEffect(() => {
    // Load the first Lottie animation
    fetch("/onboarding-gate.json")
      .then((response) => response.json())
      .then((data) => {
        setAnimationData(data);
        // Wait for Lottie to render and fade in before showing text
        setTimeout(() => {
          if (lottieRef.current) {
            lottieRef.current.setSpeed(0.5); // Half speed
          }
          setLottieLoaded(true);
        }, 1500); // Wait 1.5s for Lottie to appear
      });

    // Load the reality check animation
    fetch("/reality-check-instructions.json")
      .then((response) => response.json())
      .then((data) => setRealityCheckAnimationData(data));
  }, []);

  // Set speed for Lottie when it's ready and on direction change
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(0.5); // Half speed
    }
  }, [lottieDirection, currentScreen]);

  const messages1 = [
    "Welcome to the first day of the rest of your life.",
    "You're about to take the first step toward becoming the protagonist of your own story.",
    "Don't worry — you won't be doing this alone.",
    "I'll be with you the whole way.",
    "Before we begin, you need to know where you're going.",
    "Whether you arrived here crystal-clear or completely lost, you're about to answer the questions most people avoid — and gain the clarity most people never reach.",
    "It takes about 2 minutes.",
    "After that, your story begins.",
    "There's only one wrong way to do this:",
    "by not being honest.",
    "So… be honest.",
    "Ready?",
  ];

  const messages2 = [
    "Reality Check",
    "This is the Reality Check.",
    "An honest scan of your life as it is now — so we know how to take it where you want it to go.",
    "You'll be scoring each area of your life, one by one — from your family to your finances. Trust your gut.",
    "When the countdown hits zero, press and hold the center of the screen.",
    "The better you feel about the area, the longer you should hold.",
  ];

  const currentMessages = currentScreen === 0 ? messages1 : messages2;

  // Sequential message animation - fade in, show, fade out, next
  useEffect(() => {
    if (!lottieLoaded || showScrollWheel) return;

    console.log(
      "Animating message index:",
      currentMessageIndex,
      "of",
      currentMessages.length,
      "Screen:",
      currentScreen
    );

    if (currentMessageIndex >= currentMessages.length) {
      console.log("All messages shown, enabling scroll wheel");
      setShowScrollWheel(true);
      return;
    }

    const currentMessage = currentMessages[currentMessageIndex];
    const displayDuration = calculateDuration(currentMessage);

    console.log("Message:", currentMessage, "Duration:", displayDuration);

    // Fade in immediately
    setMessageVisible(true);

    // Wait display duration, then fade out
    const fadeOutTimer = setTimeout(() => {
      console.log("Fading out message:", currentMessageIndex);
      setMessageVisible(false);
    }, displayDuration);

    // After fade out, move to next message
    const nextTimer = setTimeout(() => {
      console.log("Moving to next message");
      setCurrentMessageIndex((prev) => prev + 1);
    }, displayDuration + 1500); // Wait for display + fade out

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(nextTimer);
    };
  }, [
    currentMessageIndex,
    currentMessages.length,
    lottieLoaded,
    showScrollWheel,
    currentScreen,
  ]);

  // Scroll to last message when scroll wheel appears
  useEffect(() => {
    if (showScrollWheel && scrollContainerRef.current) {
      setTimeout(() => {
        const lastMessageIndex = currentMessages.length - 1;
        const itemHeight = 120;
        scrollContainerRef.current?.scrollTo({
          top: lastMessageIndex * itemHeight,
          behavior: "smooth",
        });
        setScrollIndex(lastMessageIndex);
      }, 100);
    }
  }, [showScrollWheel, currentMessages.length]);

  // Reset when screen changes
  useEffect(() => {
    console.log("Screen changed to:", currentScreen);
    setCurrentMessageIndex(0);
    setMessageVisible(false);
    setShowScrollWheel(false);
    setLottieLoaded(false);
    setLottieDirection(1);
    setScrollIndex(0);

    // Wait for Lottie to appear and fade in, then start text
    const timer = setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.setSpeed(0.5); // Half speed
      }
      setLottieLoaded(true);
      console.log("Lottie loaded for screen:", currentScreen);
    }, 1800); // Slightly longer wait to ensure fade completes
    return () => clearTimeout(timer);
  }, [currentScreen]);

  const handleNext = () => {
    // Fade to black before transitioning
    setFadeToBlack(true);

    setTimeout(() => {
      if (currentScreen === 0) {
        setCurrentScreen(1);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: "instant" });
        // Reset fade to black for next screen
        setTimeout(() => {
          setFadeToBlack(false);
        }, 100);
      } else {
        // Scroll to top before transitioning to next phase
        window.scrollTo({ top: 0, behavior: "instant" });
        onStart();
      }
    }, 500); // Wait for fade to black
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const itemHeight = 120;
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    setScrollIndex(Math.max(0, Math.min(index, currentMessages.length - 1)));
  };

  const currentAnim =
    currentScreen === 0 ? animationData : realityCheckAnimationData;

  const getMessageStyle = (message: string) => {
    if (
      message === "Welcome to the first day of the rest of your life." ||
      message === "Ready?" ||
      message === "Reality Check"
    ) {
      return "text-xl md:text-3xl font-bold text-white";
    } else if (
      message === "Before we begin, you need to know where you're going."
    ) {
      return "text-lg md:text-2xl font-bold text-white";
    } else if (
      message.includes("wrong way") ||
      message.includes("be honest") ||
      message === "I'll be with you the whole way."
    ) {
      return "text-base md:text-lg font-semibold text-white";
    } else {
      return "text-sm md:text-base text-gray-300";
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Lottie Background */}
      {currentAnim && (
        <motion.div
          className="absolute -top-10 left-0 right-0 bottom-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          key={currentScreen}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={currentAnim}
            loop={false}
            autoplay={true}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "translateY(40px)",
            }}
            rendererSettings={{
              preserveAspectRatio: "xMidYMid slice",
            }}
            onComplete={() => {
              // Toggle direction for yoyo effect
              const newDirection = lottieDirection === 1 ? -1 : 1;
              setLottieDirection(newDirection);
              if (lottieRef.current) {
                lottieRef.current.setDirection(newDirection);
                lottieRef.current.setSpeed(0.5); // Half speed
                lottieRef.current.play();
              }
            }}
            onLoopComplete={() => {
              if (lottieRef.current) {
                lottieRef.current.setSpeed(0.5); // Half speed
              }
            }}
          />
        </motion.div>
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Sequential Display: Single message fade in/out */}
        {!showScrollWheel &&
          lottieLoaded &&
          currentMessages[currentMessageIndex] && (
            <div className="flex-1 flex items-start justify-center px-8 pt-12">
              <motion.p
                key={`message-${currentMessageIndex}`}
                className={`text-center ${getMessageStyle(
                  currentMessages[currentMessageIndex]
                )} max-w-3xl`}
                style={{
                  fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                  textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: messageVisible ? 1 : 0 }}
                transition={{ duration: 1.5 }}
              >
                {currentMessages[currentMessageIndex]}
              </motion.p>
            </div>
          )}

        {/* Scroll Wheel: After all messages shown */}
        {showScrollWheel && (
          <div
            className="absolute top-12 left-0 right-0 px-8 pointer-events-none"
            style={{ height: "120px" }}
          >
            <div
              ref={scrollContainerRef}
              className="overflow-y-auto snap-y snap-mandatory scrollbar-hide pointer-events-auto"
              onScroll={handleScroll}
              style={{
                scrollSnapType: "y mandatory",
                height: "120px",
              }}
            >
              {currentMessages.map((message, index) => {
                const isActive = index === scrollIndex;

                return (
                  <div
                    key={`${currentScreen}-${index}`}
                    className="flex items-center justify-center snap-center"
                    style={{
                      height: "120px",
                      opacity: isActive ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                    }}
                  >
                    <p
                      className={`text-center ${getMessageStyle(
                        message
                      )} max-w-3xl`}
                      style={{
                        fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                        textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
                      }}
                    >
                      {message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Button */}
        {showScrollWheel && (
          <motion.div
            className="absolute bottom-24 left-0 right-0 flex justify-center z-30 px-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={handleNext}
              className="w-full max-w-[600px] px-8 py-[18px] text-white font-semibold rounded-2xl transition-all hover:scale-105 active:scale-95 text-lg"
              style={{
                fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {currentScreen === 0 ? "Ready." : "I understand"}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Fade to black overlay for transitions */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          opacity: fadeToBlack ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          zIndex: 9999,
        }}
      />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
