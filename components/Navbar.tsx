"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function Navbar() {
  const { scrollY } = useScroll();

  // Transform scroll position to opacity
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-3xl"
      style={{
        opacity: navbarOpacity,
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      {/* Background with glass morphism */}
      <div className="relative glass-medium border-b border-gray">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-16 sm:h-20 px-4 lg:px-8">
            {/* Centered Logo */}
            <motion.span
              className="text-2xl sm:text-3xl font-bold text-white tracking-wide"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              Protagonist
            </motion.span>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
