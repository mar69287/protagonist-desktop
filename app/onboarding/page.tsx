"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatPhase from "./components/ChatPhase";
import CommitmentPhase from "./components/CommitmentPhase";
import IntroScreen from "./components/IntroScreen";
import WheelOfLifeScreen from "./components/WheelOfLifeScreen";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://zzvz492qrb.execute-api.us-west-1.amazonaws.com";

type Phase = "intro" | "wheel" | "plan" | "accountability" | "commitment";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WheelArea {
  name: string;
  value: number;
  min: number;
  max: number;
}

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

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [wheelData, setWheelData] = useState<WheelArea[] | null>(null);
  const [planStartIndex, setPlanStartIndex] = useState<number>(0);
  const [commitmentText, setCommitmentText] = useState("");
  const [commitmentData, setCommitmentData] = useState<CommitmentData>({
    goal: "",
    why: "",
    plan: "",
    proofMethod: "",
    submissionType: "",
    schedule: "",
    actionSummary: "",
    coreReason: "",
    proofContextSentence: "",
    worthItSentence: "",
    structuredSchedule: undefined,
  });
  const [signed, setSigned] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    // Auto-detect timezone if possible
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone || "America/Los_Angeles");
    } catch (error) {
      console.error("Error detecting timezone:", error);
    }
  }, []);

  // Start wheel phase from intro
  const startWheelPhase = () => {
    // Fade out before transitioning
    setFadeIn(false);

    setTimeout(() => {
      setPhase("wheel");
      // Fade in after phase change
      setTimeout(() => {
        setFadeIn(true);
      }, 100);
    }, 100);
  };

  // Handle wheel completion and start plan phase
  const handleWheelComplete = async (wheelData: WheelArea[]) => {
    console.log("=== Wheel Data Received ===");
    console.log(JSON.stringify(wheelData, null, 2));

    setWheelData(wheelData);

    // Fade to black before transitioning
    setFadeIn(false);

    setTimeout(() => {
      setPhase("plan");
      setMessages([]);

      // Fade in after phase change
      setTimeout(() => {
        setFadeIn(true);
      }, 100);

      // Show loading dots for 3 seconds
      setIsLoading(true);

      setTimeout(() => {
        // After 3 seconds, hide loading and show "Got It." message
        setIsLoading(false);

        const initialUserMessage: Message = {
          role: "user",
          content: "Got It.",
        };
        setMessages([initialUserMessage]);

        // Wait another 3 seconds before calling API
        setTimeout(async () => {
          setIsLoading(true);

          try {
            const payload = {
              messages: [],
              wheel_data: { areas: wheelData },
            };

            console.log("=== Sending Wheel Data to AI API (/chat/plan) ===");
            console.log(JSON.stringify(payload, null, 2));

            const response = await fetch(`${API_BASE}/chat/plan`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const aiMessage: Message = {
              role: "assistant",
              content:
                data.message ||
                data.response ||
                "Let's create a plan based on your wheel of life assessment.",
            };

            console.log("=== AI RESPONSE (Plan Initial) ===");
            console.log(aiMessage.content);

            setMessages((prev) => [...prev, aiMessage]);
            setPlanStartIndex(0);
            setIsLoading(false);
          } catch (error) {
            console.error("Error fetching initial plan message:", error);
            const fallbackMessage: Message = {
              role: "assistant",
              content:
                "Great! Now let's create a plan based on your wheel of life assessment. What area would you like to focus on improving?",
            };
            setMessages((prev) => [...prev, fallbackMessage]);
            setPlanStartIndex(0);
            setIsLoading(false);
          }
        }, 3000);
      }, 3000);
    }, 500); // Wait for fade to black
  };

  // ==================== PLAN PHASE ====================
  const sendPlanMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue("");

    const userMessage: Message = {
      role: "user",
      content: messageContent,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const payload = {
        messages: updatedMessages,
        wheel_data: wheelData ? { areas: wheelData } : undefined,
      };

      // console.log("=== Sending to AI API (/chat/plan) ===");
      // console.log(JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE}/chat/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();

      if (data.metadata && data.metadata.plan_complete) {
        console.log("Plan complete - transitioning to accountability phase");
        startAccountabilityPhase();
        return;
      } else {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
        };

        console.log("=== AI RESPONSE (Plan Phase) ===");
        console.log(assistantMessage.content);

        setMessages([...updatedMessages, assistantMessage]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages([...updatedMessages, errorMessage]);
      setIsLoading(false);
    }
  };

  // ==================== ACCOUNTABILITY PHASE ====================
  const startAccountabilityPhase = async () => {
    setIsLoading(true);
    setPhase("accountability");
    try {
      const response = await fetch(`${API_BASE}/chat/accountability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };

      console.log("=== AI RESPONSE (Accountability Initial) ===");
      console.log(assistantMessage.content);

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error starting accountability:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAccountabilityMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue("");

    const userMessage: Message = {
      role: "user",
      content: messageContent,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat/accountability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };

      console.log("=== AI RESPONSE (Accountability Phase) ===");
      console.log(assistantMessage.content);

      const messagesWithResponse = [...updatedMessages, assistantMessage];
      setMessages(messagesWithResponse);
      setIsLoading(false);

      if (data.metadata && data.metadata.accountability_complete) {
        console.log("Accountability complete - generating commitment...");
        // Start commitment API call immediately while showing the last message
        generateCommitment(messagesWithResponse);
        return;
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages([...updatedMessages, errorMessage]);
      setIsLoading(false);
    }
  };

  // ==================== COMMITMENT PHASE ====================
  const generateCommitment = async (messagesToUse?: Message[]) => {
    try {
      const allMessages = messagesToUse || messages;
      const planAndAccountabilityMessages = allMessages.slice(planStartIndex);

      // Calculate reading time for the last message
      const lastMessage = allMessages[allMessages.length - 1];
      const wordCount = lastMessage.content.split(/\s+/).length;
      const wordsPerMinute = 200;
      const readingTime = (wordCount / wordsPerMinute) * 60 * 1000;
      const adjustedReadingTime = Math.min(
        Math.max(readingTime * 1.2, 2000),
        8000
      );

      console.log(`Reading time for last message: ${adjustedReadingTime}ms`);
      console.log(
        `Sending ${planAndAccountabilityMessages.length} messages to commitment`
      );

      // Start timing and API call simultaneously
      const startTime = Date.now();

      const response = await fetch(`${API_BASE}/chat/commitment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: planAndAccountabilityMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Commitment error:", errorData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      console.log("=== COMMITMENT API RESPONSE ===");
      console.log(JSON.stringify(data, null, 2));

      setCommitmentText(data.commitment);

      if (data.data) {
        const commitmentDataFromAPI = {
          goal: data.data.goal || "",
          why: data.data.why || "",
          plan: data.data.plan || "",
          proofMethod: data.data.proof_method || "",
          submissionType: data.data.submission_type || "",
          schedule: data.data.schedule || "",
          actionSummary: data.data.action_summary || "",
          coreReason: data.data.core_reason || "",
          proofContextSentence: data.data.proof_context_sentence || "",
          worthItSentence: data.data.worth_it_sentence || "",
          structuredSchedule: data.data.structured_schedule || undefined,
        };

        console.log("=== PARSED COMMITMENT DATA ===");
        console.log(JSON.stringify(commitmentDataFromAPI, null, 2));

        setCommitmentData(commitmentDataFromAPI);
      }

      // Calculate remaining reading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, adjustedReadingTime - elapsedTime);

      console.log(
        `API took ${elapsedTime}ms, waiting ${remainingTime}ms more for reading`
      );

      // Wait for remaining reading time before transition
      setTimeout(() => {
        setIsLoading(false);
        // Fade to black
        setFadeIn(false);

        setTimeout(() => {
          setPhase("commitment");
          // Fade in commitment screen
          setTimeout(() => {
            setFadeIn(true);
          }, 100);
        }, 500); // Wait for fade to black
      }, remainingTime);
    } catch (error) {
      console.error("Error generating commitment:", error);
      setCommitmentText("Error generating commitment. Please try again.");
      setIsLoading(false);
      setTimeout(() => {
        setFadeIn(false);
        setTimeout(() => {
          setPhase("commitment");
          setTimeout(() => {
            setFadeIn(true);
          }, 100);
        }, 500);
      }, 2000);
    }
  };

  const signCommitment = async () => {
    setSigned(true);
    handleComplete();
  };

  const handleComplete = () => {
    // Navigate to signup with onboarding data
    router.push(
      `/subscriptions/signup?onboarding=${encodeURIComponent(
        JSON.stringify({
          goal: commitmentData.goal,
          why: commitmentData.why,
          plan: commitmentData.plan,
          schedule: commitmentData.schedule,
          proofMethod: commitmentData.proofMethod,
          submissionType: commitmentData.submissionType,
          commitmentText,
          chatHistory: messages,
          timezone,
          structuredSchedule: commitmentData.structuredSchedule,
          wheelData,
        })
      )}`
    );
  };

  const handleBack = () => {
    router.back();
  };

  const handleSendMessage = () => {
    if (phase === "plan") {
      sendPlanMessage();
    } else if (phase === "accountability") {
      sendAccountabilityMessage();
    }
  };

  return (
    <div className="min-h-screen w-full bg-black">
      {phase === "intro" && (
        <IntroScreen fadeIn={fadeIn} onStart={startWheelPhase} />
      )}
      {phase === "wheel" && (
        <WheelOfLifeScreen
          fadeIn={fadeIn}
          onComplete={handleWheelComplete}
          onBack={handleBack}
        />
      )}
      {(phase === "plan" || phase === "accountability") && (
        <ChatPhase
          phase={phase}
          messages={messages}
          inputValue={inputValue}
          isLoading={isLoading}
          fadeIn={fadeIn}
          onInputChange={setInputValue}
          onSend={handleSendMessage}
          onBack={handleBack}
        />
      )}
      {phase === "commitment" && (
        <CommitmentPhase
          commitmentText={commitmentText}
          commitmentData={commitmentData}
          signed={signed}
          isLoading={isLoading}
          fadeIn={fadeIn}
          timezone={timezone}
          onTimezoneChange={setTimezone}
          onSign={signCommitment}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
