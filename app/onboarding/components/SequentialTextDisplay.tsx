"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface SequentialTextDisplayProps {
  text: string;
  onComplete?: () => void;
  className?: string;
  minDuration?: number; // Minimum duration per section in ms (default 2000)
  maxDuration?: number; // Maximum duration per section in ms (default 8000)
  wordsPerMinute?: number; // Reading speed (default 200)
  fadeDuration?: number; // Fade transition duration in ms (default 0.4s)
  renderFormattedText?: (text: string) => React.ReactNode;
  maxScrollHeight?: string; // Max height as CSS value (default "30vh")
}

export default function SequentialTextDisplay({
  text,
  onComplete,
  className = "",
  minDuration = 2000,
  maxDuration = 8000,
  wordsPerMinute = 200,
  fadeDuration = 0.4,
  renderFormattedText,
  maxScrollHeight = "30vh",
}: SequentialTextDisplayProps) {
  const [sections, setSections] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showScrollableView, setShowScrollableView] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);

  // Split text into sections on double line breaks or single line breaks
  useEffect(() => {
    // Split by double line breaks first, then by single if no doubles exist
    let splitSections = text.split(/\n\n+/);

    // If only one section, try splitting by single line breaks
    if (splitSections.length === 1) {
      splitSections = text.split(/\n+/);
    }

    // Filter out empty sections and trim
    const filteredSections = splitSections
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSections(filteredSections);
    setCurrentSectionIndex(0);
    setShowScrollableView(false);
  }, [text]);

  // Calculate reading duration based on text length
  const calculateDuration = useCallback(
    (sectionText: string): number => {
      // Count words (rough estimate: split by spaces)
      const wordCount = sectionText.split(/\s+/).length;

      // Calculate reading time in milliseconds
      const readingTime = (wordCount / wordsPerMinute) * 60 * 1000;

      // Add a bit of extra time for comprehension (20% more)
      const adjustedTime = readingTime * 1.2;

      // Clamp between min and max
      return Math.min(Math.max(adjustedTime, minDuration), maxDuration);
    },
    [wordsPerMinute, minDuration, maxDuration]
  );

  // Auto-scroll to bottom when scrollable view appears
  useEffect(() => {
    if (showScrollableView && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          top: scrollViewRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [showScrollableView]);

  // Animate the current section
  useEffect(() => {
    if (sections.length === 0) return;
    if (showScrollableView) return; // Don't animate if scrollable view is showing

    const currentSection = sections[currentSectionIndex];
    const displayDuration = calculateDuration(currentSection);

    // After displaying for calculated duration, check if there are more sections
    const timer = setTimeout(() => {
      if (currentSectionIndex < sections.length - 1) {
        // Move to next section (fade animation handled by AnimatePresence)
        setCurrentSectionIndex((prev) => prev + 1);
      } else {
        // Last section completed - show scrollable view
        setShowScrollableView(true);
        onComplete?.();
      }
    }, displayDuration + fadeDuration * 1000);

    return () => clearTimeout(timer);
  }, [
    currentSectionIndex,
    sections,
    fadeDuration,
    onComplete,
    showScrollableView,
    calculateDuration,
  ]);

  if (sections.length === 0) {
    return null;
  }

  // Show scrollable view with all sections after completion
  if (showScrollableView) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: fadeDuration }}
        className="w-full"
      >
        <div
          ref={scrollViewRef}
          className="overflow-y-auto"
          style={{ maxHeight: maxScrollHeight }}
        >
          {sections.map((section, index) => (
            <div key={index} className="mb-4 last:mb-0">
              {renderFormattedText ? (
                renderFormattedText(section)
              ) : (
                <p className={className}>{section}</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Show current section with fade animation
  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSectionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: fadeDuration }}
        >
          {renderFormattedText ? (
            renderFormattedText(sections[currentSectionIndex])
          ) : (
            <p className={className}>{sections[currentSectionIndex]}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
