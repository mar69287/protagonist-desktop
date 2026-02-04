"use client";

import { useEffect, useState, Suspense, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

// Neumorphic Card Component with Inset Shadow Effect
interface NeumorphicCardProps {
  children: ReactNode;
  className?: string;
  centerContent?: boolean;
}

function NeumorphicCard({
  children,
  className = "",
  centerContent = false,
}: NeumorphicCardProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "24px",
        padding: "32px",
      }}
    >
      {/* Top inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.4), rgba(0,0,0,0.25), rgba(0,0,0,0.12), rgba(0,0,0,0.05), transparent)",
          borderRadius: "24px 24px 0 0",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Left inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "35%",
          background:
            "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)",
          borderRadius: "24px 0 0 24px",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Right inner shadow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "35%",
          background:
            "linear-gradient(to left, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.15), rgba(0,0,0,0.08), rgba(0,0,0,0.03), transparent)",
          borderRadius: "0 24px 24px 0",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className={
          centerContent ? "flex flex-col items-center justify-center" : ""
        }
        style={{ position: "relative", zIndex: 2 }}
      >
        {children}
      </div>
    </div>
  );
}

function ReturnPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/stripe/session-status?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          setStatus(data.status);
          setCustomerEmail(data.customer_email);
        })
        .catch((error) => {
          console.error("Error fetching session status:", error);
          setStatus("error");
        });
    }
  }, [sessionId]);

  if (!sessionId || status === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2
          className="w-12 h-12 animate-spin"
          style={{ color: "#888888" }}
        />
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full"
        >
          <NeumorphicCard centerContent>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4 sm:mb-6"
            >
              <div
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  borderRadius: "50%",
                  padding: "16px",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" />
              </div>
            </motion.div>

            <h1
              style={{
                fontSize: "clamp(24px, 5vw, 40px)",
                fontWeight: 800,
                color: "#e0e0e0",
                marginBottom: "16px",
                fontFamily: "'OggText', 'Ogg', serif",
              }}
            >
              Payment Successful!
            </h1>

            <p
              style={{
                color: "#b0b0b0",
                marginBottom: "8px",
                fontSize: "14px",
                fontFamily:
                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              }}
            >
              Thank you for your commitment! A confirmation email will be sent
              to:
            </p>

            <p
              style={{
                color: "#e0e0e0",
                fontWeight: 600,
                marginBottom: "32px",
                fontSize: "14px",
                wordBreak: "break-all",
                fontFamily:
                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              }}
            >
              {customerEmail}
            </p>

            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                textAlign: "left",
                width: "100%",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#e0e0e0",
                  marginBottom: "16px",
                  fontFamily: "'OggText', 'Ogg', serif",
                }}
              >
                Your First Month - How You Earn It Back:
              </h2>
              <div className="space-y-3">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <span
                    style={{
                      color: "#888888",
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    Below 50%:
                  </span>
                  <span
                    style={{
                      color: "#b0b0b0",
                      fontWeight: 600,
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    $0 back
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <span
                    style={{
                      color: "#888888",
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    50-69%:
                  </span>
                  <span
                    style={{
                      color: "#b0b0b0",
                      fontWeight: 600,
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    $30 back
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <span
                    style={{
                      color: "#888888",
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    70-89%:
                  </span>
                  <span
                    style={{
                      color: "#b0b0b0",
                      fontWeight: 600,
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    $49 back
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                  }}
                >
                  <span
                    style={{
                      color: "#888888",
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    90%+:
                  </span>
                  <span
                    style={{
                      color: "#22c55e",
                      fontWeight: 600,
                      fontSize: "14px",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    All back ($98)
                  </span>
                </div>
              </div>

              {/* <div
                style={{
                  marginTop: "24px",
                  paddingTop: "24px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "#b0b0b0",
                    marginBottom: "12px",
                    fontWeight: 700,
                    fontFamily: "'OggText', 'Ogg', serif",
                  }}
                >
                  Following Months: $98/month
                </p>
                <div className="space-y-2">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "#888888",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    <span>Below 70%:</span>
                    <span style={{ color: "#b0b0b0" }}>$0 back</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "#888888",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    <span>70-89%:</span>
                    <span style={{ color: "#b0b0b0" }}>$25 back</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "#888888",
                      fontFamily:
                        "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                    }}
                  >
                    <span>90%+:</span>
                    <span style={{ color: "#22c55e" }}>$50 back (max)</span>
                  </div>
                </div>
              </div> */}
            </div>
          </NeumorphicCard>

          {/* <Link
              href="/"
              style={{
                display: "inline-block",
                backgroundColor: "#e0e0e0",
                color: "#1a1a1a",
                padding: "16px 32px",
                borderRadius: "16px",
                fontSize: "16px",
                fontWeight: 700,
                fontFamily:
                  "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                marginTop: "24px",
              }}
              className="hover:bg-[#f0f0f0] transition-colors"
            >
              Go to Dashboard
            </Link> */}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <NeumorphicCard centerContent>
          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 800,
              color: "#e0e0e0",
              marginBottom: "16px",
              fontFamily: "'OggText', 'Ogg', serif",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#b0b0b0",
              marginBottom: "32px",
              fontSize: "14px",
              fontFamily:
                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
            }}
          >
            We couldn&apos;t process your payment. Please try again or contact
            support.
          </p>
          <Link
            href="/subscriptions/signup"
            style={{
              display: "inline-block",
              backgroundColor: "#e0e0e0",
              color: "#1a1a1a",
              padding: "16px 32px",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: 700,
              fontFamily:
                "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
            className="hover:bg-[#f0f0f0] transition-colors"
          >
            Try Again
          </Link>
        </NeumorphicCard>
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2
            className="w-12 h-12 animate-spin"
            style={{ color: "#888888" }}
          />
        </div>
      }
    >
      <ReturnPageContent />
    </Suspense>
  );
}
