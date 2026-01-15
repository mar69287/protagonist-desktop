"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ChatBackground from "./ChatBackground";
import SequentialTextDisplay from "./SequentialTextDisplay";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPhaseProps {
  phase: "plan" | "accountability";
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  fadeIn: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onBack: () => void;
}

export default function ChatPhase({
  phase,
  messages,
  inputValue,
  isLoading,
  fadeIn,
  onInputChange,
  onSend,
  onBack,
}: ChatPhaseProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  // Filter to only show assistant messages and the initial "Got It." user message
  const assistantMessages = messages.filter(
    (msg) => msg.role === "assistant" || msg.content === "Got It."
  );

  // Calculate item height based on viewport
  const ITEM_HEIGHT_VH = 60; // 60% of viewport height

  // Auto-scroll to latest message when new messages arrive
  useEffect(() => {
    if (assistantMessages.length > 0) {
      const timer = setTimeout(() => {
        const lastIndex = assistantMessages.length - 1;
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollTo({
            top: lastIndex * (window.innerHeight * (ITEM_HEIGHT_VH / 100)),
            behavior: "smooth",
          });
        }
        setCurrentIndex(lastIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [assistantMessages.length]);

  // Scroll to loading indicator when loading starts
  useEffect(() => {
    if (isLoading && assistantMessages.length > 0) {
      const timer = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollTo({
            top:
              assistantMessages.length *
              (window.innerHeight * (ITEM_HEIGHT_VH / 100)),
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, assistantMessages.length]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const itemHeight = window.innerHeight * (ITEM_HEIGHT_VH / 100);
    const index = Math.round(scrollTop / itemHeight);
    setCurrentIndex(Math.max(0, Math.min(index, assistantMessages.length - 1)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSend();
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text || typeof text !== "string") return <span>{text}</span>;

    // Split by line breaks first to preserve them
    const lines = text.split("\n");

    return (
      <>
        {lines.map((line, lineIndex) => {
          // Split by **bold** and *italic* patterns
          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

          return (
            <span key={lineIndex}>
              {parts.map((part, index) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={index} className="font-bold">
                      {part.slice(2, -2)}
                    </strong>
                  );
                } else if (part.startsWith("*") && part.endsWith("*")) {
                  return (
                    <em key={index} className="italic">
                      {part.slice(1, -1)}
                    </em>
                  );
                }
                return <span key={index}>{part}</span>;
              })}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          );
        })}
      </>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-screen bg-black overflow-hidden">
      {/* Chat Background */}
      <ChatBackground />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Messages - Scroll Wheel */}
        <div className="absolute inset-0">
          <div
            ref={messagesEndRef}
            className="w-full h-full overflow-y-auto scroll-smooth"
            style={{
              scrollSnapType: "y mandatory",
              WebkitOverflowScrolling: "touch",
            }}
            onScroll={handleScroll}
          >
            <div
              className="px-6 md:px-8"
              style={{
                paddingTop: "5rem",
                paddingBottom: `${40}vh`,
              }}
            >
              {assistantMessages.map((message, index) => (
                <div
                  key={index}
                  className="flex items-start pt-8"
                  style={{
                    minHeight: `${ITEM_HEIGHT_VH}vh`,
                    scrollSnapAlign: "start",
                  }}
                >
                  <div
                    className={`w-full transition-opacity duration-300 break-words ${
                      currentIndex === index ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {message.role === "assistant" &&
                    index === assistantMessages.length - 1 ? (
                      // Apply sequential display to the most recent assistant message
                      <SequentialTextDisplay
                        text={message.content}
                        className="text-base md:text-lg text-gray-300 leading-relaxed text-left break-words"
                        minDuration={2000}
                        maxDuration={8000}
                        wordsPerMinute={200}
                        fadeDuration={0.4}
                        renderFormattedText={(text) => (
                          <p className="text-base md:text-lg text-gray-300 leading-relaxed text-left break-words">
                            {renderFormattedText(text)}
                          </p>
                        )}
                        maxScrollHeight="15vh"
                      />
                    ) : (
                      // Show older messages normally
                      <p className="text-base md:text-lg text-gray-300 leading-relaxed text-left break-words">
                        {renderFormattedText(message.content)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div
                  className="flex items-start pt-8"
                  style={{
                    height: `${ITEM_HEIGHT_VH}vh`,
                    scrollSnapAlign: "start",
                  }}
                >
                  <div className="flex gap-2">
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0,
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.15,
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.3,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="p-6">
            <form
              onSubmit={handleSubmit}
              className="flex flex-row items-end gap-2 bg-transparent rounded-[22px] p-1.5"
            >
              <textarea
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim() && !isLoading) {
                      onSend();
                    }
                  }
                }}
                placeholder="Share what's on your mind..."
                disabled={isLoading}
                className="flex-1 p-4 text-base font-normal text-white bg-transparent border-none rounded-[22px] resize-none outline-none placeholder-[#a0a0a0] leading-[22px]"
                rows={1}
                style={{
                  fontFamily: "'HelveticaNeue', system-ui, sans-serif",
                  minHeight: "50px",
                  maxHeight: "200px",
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`px-4 py-2 bg-transparent border-none text-base font-semibold transition-colors ${
                  isLoading || !inputValue.trim()
                    ? "text-[#a0a0a0] cursor-not-allowed"
                    : "text-white cursor-pointer"
                }`}
                style={{
                  fontFamily: "'HelveticaNeue', system-ui, sans-serif",
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
