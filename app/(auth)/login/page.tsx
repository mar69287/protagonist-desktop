"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
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
          <p className="text-[#a0a0a0]">
            Welcome back! Please login to your account.
          </p>
        </div>

        <div className="glass-light rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Login</h2>
              <p className="text-[#a0a0a0] text-sm">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

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
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#404040] bg-[#1a1a1a] text-white focus:ring-white"
                />
                <span className="text-sm text-[#a0a0a0]">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-white hover:text-[#f5f5f5] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              variant="primary"
              className="w-full"
              showArrow
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center text-sm text-[#a0a0a0]">
              Don't have an account?{" "}
              <Link
                href="/subscriptions/signup"
                className="text-white hover:text-[#f5f5f5] font-medium transition-colors"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
