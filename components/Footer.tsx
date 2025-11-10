"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative glass-medium border-t border-[#404040]">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          {/* Brand section */}
          <motion.div
            className="text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-block mb-3">
              <span className="text-2xl font-bold text-white">Protagonist</span>
            </Link>
            <p className="text-[#a0a0a0] max-w-xs mb-4">
              Get paid to accomplish your goals. Transform aspirations into achievements.
            </p>

            {/* Contact */}
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <Mail className="w-4 h-4 text-[#a0a0a0]" />
              <a
                href="mailto:support@protagonist.app"
                className="text-[#a0a0a0] hover:text-white transition-colors text-sm"
              >
                support@protagonist.app
              </a>
            </div>
          </motion.div>

          {/* Links section */}
          <motion.div
            className="flex flex-col md:flex-row gap-8 md:gap-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="text-center md:text-left">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-[#a0a0a0] hover:text-white transition-colors text-sm"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/subscriptions/signup"
                    className="text-[#a0a0a0] hover:text-white transition-colors text-sm"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-center md:text-left">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-[#a0a0a0] hover:text-white transition-colors text-sm"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-[#a0a0a0] hover:text-white transition-colors text-sm"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          className="pt-8 mt-8 border-t border-[#404040] text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[#a0a0a0] text-sm">
            © {new Date().getFullYear()} Protagonist. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
