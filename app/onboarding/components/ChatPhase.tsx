"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);

  // Filter to only show assistant messages and the initial "Got It." user message
  const assistantMessages = messages.filter(
    (msg) => msg.role === "assistant" || msg.content === "Got It."
  );

  // Update displayed messages when new messages arrive
  useEffect(() => {
    setDisplayedMessages(assistantMessages);
  }, [assistantMessages.length]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [displayedMessages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSend();
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text || typeof text !== "string") return text;

    // Split by **bold** and *italic* patterns
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, index) => {
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
      return part;
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadeIn ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-20 pb-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {displayedMessages.map((message, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  {renderFormattedText(message.content)}
                </p>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                className="flex justify-center items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 md:px-8 pb-8">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex gap-2 items-end"
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
              className="flex-1 bg-transparent border-b border-gray-600 text-white placeholder-gray-500 px-4 py-3 resize-none focus:outline-none focus:border-white transition-colors"
              rows={1}
              style={{
                minHeight: "50px",
                maxHeight: "200px",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                isLoading || !inputValue.trim()
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              Send
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
