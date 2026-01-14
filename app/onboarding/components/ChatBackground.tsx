"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface ChatBackgroundProps {
  style?: React.CSSProperties;
}

export default function ChatBackground({ style }: ChatBackgroundProps) {
  const initialLottieRef = useRef<any>(null);
  const loopLottieRef = useRef<any>(null);
  const [showLoopAnimation, setShowLoopAnimation] = useState(false);
  const [lottieDirection, setLottieDirection] = useState<1 | -1>(1);
  const [initialAnimationData, setInitialAnimationData] = useState<any>(null);
  const [loopAnimationData, setLoopAnimationData] = useState<any>(null);

  // Load animation data
  useEffect(() => {
    fetch("/chatInitial.json")
      .then((response) => response.json())
      .then((data) => setInitialAnimationData(data));

    fetch("/chat.json")
      .then((response) => response.json())
      .then((data) => setLoopAnimationData(data));
  }, []);

  const handleInitialAnimationFinish = () => {
    console.log("Initial animation finished, switching to loop animation");
    setShowLoopAnimation(true);
  };

  const handleLoopAnimationFinish = () => {
    console.log("Loop animation finished, reversing direction");
    setLottieDirection((prev) => (prev === 1 ? -1 : 1));
  };

  // Restart animation when direction changes (for yoyo effect)
  useEffect(() => {
    if (showLoopAnimation && loopLottieRef.current) {
      console.log("Restarting animation with direction:", lottieDirection);
      loopLottieRef.current.setDirection(lottieDirection);
      loopLottieRef.current.play();
    }
  }, [lottieDirection, showLoopAnimation]);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={style}
    >
      {/* Initial Animation */}
      {initialAnimationData && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: showLoopAnimation ? 0 : 1 }}
        >
          <Lottie
            lottieRef={initialLottieRef}
            animationData={initialAnimationData}
            loop={false}
            autoplay={true}
            onComplete={handleInitialAnimationFinish}
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

      {/* Loop Animation */}
      {loopAnimationData && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: showLoopAnimation ? 1 : 0 }}
        >
          <Lottie
            lottieRef={loopLottieRef}
            animationData={loopAnimationData}
            loop={false}
            autoplay={false}
            onComplete={handleLoopAnimationFinish}
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
    </div>
  );
}
