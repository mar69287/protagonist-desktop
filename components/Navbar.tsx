"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Login", href: "/login" },
  { name: "Sign Up", href: "/subscriptions/signup" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Transform scroll position to opacity
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        opacity: navbarOpacity,
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      {/* Background with glass morphism */}
      <div className="relative glass-medium border-b border-[#404040]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <motion.span
                className="text-2xl font-bold text-white"
                whileHover={{ scale: 1.05 }}
              >
                Protagonist
              </motion.span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {navItems.map((item, index) => (
                <NavLink key={item.name} href={item.href} index={index}>
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* Mobile menu button */}
            <motion.button
              className="md:hidden p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)]"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className="md:hidden overflow-hidden"
          initial={false}
          animate={{
            height: isMobileMenuOpen ? "auto" : 0,
            opacity: isMobileMenuOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-4 space-y-2 glass-medium border-t border-[#404040]">
            {navItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{
                  x: isMobileMenuOpen ? 0 : -20,
                  opacity: isMobileMenuOpen ? 1 : 0,
                }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="block px-4 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
}

function NavLink({
  href,
  children,
  index,
}: {
  href: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={href}>
        <motion.div
          className="relative px-4 py-2 rounded-lg group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 text-[#a0a0a0] group-hover:text-white transition-colors font-medium">
            {children}
          </span>

          {/* Animated underline */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
            style={{ originX: 0 }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}
