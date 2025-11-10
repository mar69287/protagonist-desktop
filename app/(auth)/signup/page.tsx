"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, name);
      router.push("/confirmation");
    } catch (err) {
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <h1 className="text-3xl font-bold text-white">Protagonist</h1>
          </motion.div>
          <p className="text-[#a0a0a0]">Create your account to get started.</p>
        </div>

        <div className="glass-light rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Sign Up</h2>
              <p className="text-[#a0a0a0] text-sm">
                Fill in your details to create an account
              </p>
            </div>

            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Must be at least 8 characters"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                className="w-4 h-4 rounded border-[#404040] bg-[#1a1a1a] text-white focus:ring-white mt-1"
              />
              <label className="text-sm text-[#a0a0a0]">
                I agree to the{" "}
                <Link href="/terms" className="text-white hover:text-[#f5f5f5]">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-white hover:text-[#f5f5f5]"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              variant="primary"
              className="w-full"
              showArrow
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-[#a0a0a0]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-white hover:text-[#f5f5f5] font-medium transition-colors"
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
