"use client";

import { motion } from "framer-motion";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ConfirmationPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card variant="elevated" padding="lg">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-success/20 rounded-full blur-2xl"></div>
                <div className="relative w-24 h-24 bg-success/10 rounded-full flex items-center justify-center border-2 border-success">
                  <CheckCircle className="w-12 h-12 text-success" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Account Created Successfully!
              </h1>
              <p className="text-neutral-300">
                Welcome aboard, {user?.name || "there"}!
              </p>
            </div>

            {/* Email verification notice */}
            <div className="bg-info/10 border border-info rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="font-semibold text-info mb-1">
                    Verify Your Email
                  </h3>
                  <p className="text-sm text-neutral-300">
                    We've sent a verification email to{" "}
                    <span className="font-medium text-white">
                      {user?.email || "your email"}
                    </span>
                    . Please check your inbox and click the verification link to
                    activate your account.
                  </p>
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="bg-neutral-800 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-white mb-4">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-sm font-bold">
                      1
                    </span>
                  </div>
                  <div>
                    <p className="text-neutral-200">Check your email inbox</p>
                    <p className="text-sm text-neutral-400">
                      Look for an email from us
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-sm font-bold">
                      2
                    </span>
                  </div>
                  <div>
                    <p className="text-neutral-200">Click the verification link</p>
                    <p className="text-sm text-neutral-400">
                      Activate your account
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-sm font-bold">
                      3
                    </span>
                  </div>
                  <div>
                    <p className="text-neutral-200">Start exploring</p>
                    <p className="text-sm text-neutral-400">
                      Enjoy all the features
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/" className="flex-1">
                <Button variant="primary" className="w-full" showArrow>
                  Go to Dashboard
                </Button>
              </Link>
              <Button variant="secondary" className="flex-1">
                Resend Email
              </Button>
            </div>

            <p className="text-sm text-neutral-400">
              Didn't receive the email?{" "}
              <Link
                href="/support"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                Contact support
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

