"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
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
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Get the latest assistant message
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
  
  // Get the "Got It." message if it exists
  const gotItMessage = messages.find((msg) => msg.content === "Got It.");
  
  // Show "Got It." if no assistant messages yet, otherwise show latest assistant message
  const displayMessage = latestAssistantMessage || gotItMessage;

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
        {/* Messages - Only Latest */}
        <div className="absolute inset-0 flex items-start justify-center pt-4 pb-40 px-6 md:px-8">
          <div className="w-full max-w-3xl">
            {displayMessage ? (
              displayMessage.role === "assistant" ? (
                <div
                  className="w-full break-words"
                  style={{ overflowWrap: "anywhere" }}
                >
                  <SequentialTextDisplay
                    text={displayMessage.content}
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
                    maxScrollHeight="60vh"
                  />
                </div>
              ) : (
                // Show "Got It." message
                <p className="text-base md:text-lg text-gray-300 leading-relaxed text-left break-words">
                  {displayMessage.content}
                </p>
              )
            ) : null}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start pt-4">
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

        {/* Input Area */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pb-20"
          style={{
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.8) 70%, transparent 100%)",
          }}
        >
          <div className="px-6 pt-12 pb-6">
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
                onFocus={(e) => {
                  // Scroll the input into view on iOS
                  setTimeout(() => {
                    e.target.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }, 300);
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
