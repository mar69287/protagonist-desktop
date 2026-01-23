"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

// Neumorphic Card Component
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
        className={centerContent ? "flex flex-col items-center justify-center" : ""}
        style={{ position: "relative", zIndex: 2 }}
      >
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect parameter from URL if present
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const redirectTo = searchParams.get('redirect') || '/subscriptions/manage';

  useEffect(() => {
    // If already authenticated, redirect to intended page
    if (isAuthenticated && !authLoading) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, authLoading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Redirect is handled by useEffect above
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#888888" }} />
      </div>
    );
  }

  // Don't render form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 800,
                color: "#e0e0e0",
                marginBottom: "12px",
                fontFamily: "'OggText', 'Ogg', serif",
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "#b0b0b0",
                fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
              }}
            >
              Sign in to manage your subscription
            </p>
          </div>

          {/* Login Form */}
          <NeumorphicCard>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p
                      style={{
                        color: "#ef4444",
                        fontSize: "14px",
                        fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      }}
                    >
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#666666",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                    fontFamily: "'OggText', 'Ogg', serif",
                  }}
                >
                  Email
                </label>
                <div className="relative">
                  <div
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <Mail size={20} color="#888888" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "16px 16px 16px 48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#e0e0e0",
                      fontSize: "16px",
                      fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      outline: "none",
                      transition: "all 0.2s ease",
                      boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 4px rgba(255,255,255,0.03)",
                    }}
                    className="focus:border-white/20"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#666666",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                    fontFamily: "'OggText', 'Ogg', serif",
                  }}
                >
                  Password
                </label>
                <div className="relative">
                  <div
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <Lock size={20} color="#888888" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "16px 16px 16px 48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#e0e0e0",
                      fontSize: "16px",
                      fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                      outline: "none",
                      transition: "all 0.2s ease",
                      boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 4px rgba(255,255,255,0.03)",
                    }}
                    className="focus:border-white/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "16px",
                  fontWeight: 700,
                  fontSize: "16px",
                  letterSpacing: "0.5px",
                  transition: "all 0.3s ease",
                  fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                  backgroundColor: loading ? "rgba(0,0,0,0.3)" : "#e0e0e0",
                  color: loading ? "#666666" : "#1a1a1a",
                  cursor: loading ? "not-allowed" : "pointer",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                className={loading ? "" : "hover:bg-[#f0f0f0]"}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#888888",
                  fontFamily: "'Helvetica Neue', -apple-system, system-ui, sans-serif",
                }}
              >
                Don't have an account?{" "}
                <Link
                  href="/subscriptions/signup"
                  style={{
                    color: "#e0e0e0",
                    fontWeight: 600,
                  }}
                  className="hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </NeumorphicCard>
        </motion.div>
      </div>
    </div>
  );
}
