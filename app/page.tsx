"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function Home() {
  const [animationData, setAnimationData] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Load the Lottie animation
    fetch("/intial-home-screen.json")
      .then((response) => response.json())
      .then((data) => setAnimationData(data));

    // Trigger fade-in animation
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Lottie Background */}
      {animationData && (
        <div className="absolute inset-0 w-full h-full">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
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

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col h-screen p-8 pt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* App name at top */}
        <div className="flex justify-center items-center pt-4">
          <h1
            className="text-2xl md:text-5xl font-extrabold text-white tracking-[0.125em]"
            style={{
              fontFamily: "'Ogg', serif",
              textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
            }}
          >
            Protagonist
          </h1>
        </div>

        {/* Spacer to push buttons to center */}
        <div className="flex-1" />

        {/* Buttons at bottom center */}
        <div className="flex flex-row justify-between items-center w-full max-w-4xl mx-auto px-8 md:px-16">
          <motion.button
            onClick={() => {
              // Fade to black before navigating
              const overlay = document.createElement("div");
              overlay.style.cssText =
                "position: fixed; inset: 0; background: black; z-index: 9999; opacity: 0; transition: opacity 0.5s ease-in-out;";
              document.body.appendChild(overlay);

              setTimeout(() => {
                overlay.style.opacity = "1";
              }, 10);

              setTimeout(() => {
                window.location.href = "/onboarding";
              }, 500);
            }}
            className="px-4 py-2 text-white text-xl md:text-2xl font-semibold cursor-pointer"
            style={{
              fontFamily: "'Helvetica Neue', system-ui, sans-serif",
              textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Begin
          </motion.button>

          <Link href="/login">
            <motion.button
              className="px-4 py-2 text-white text-xl md:text-2xl font-semibold"
              style={{
                fontFamily: "'Helvetica Neue', system-ui, sans-serif",
                textShadow: "0px 2px 8px rgba(0, 0, 0, 0.8)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          </Link>
        </div>

        {/* Bottom spacer */}
        <div className="flex-1" />
      </motion.div>
    </div>
  );
}
