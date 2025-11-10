"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showArrow?: boolean;
}

export default function Button({
  href,
  onClick,
  children,
  variant = "primary",
  size = "md",
  className = "",
  showArrow = false,
}: ButtonProps) {
  const baseStyles =
    "font-semibold rounded-full transition-all duration-300 inline-flex items-center gap-2";

  const variantStyles = {
    primary:
      "bg-primary text-white hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(255,101,47,0.5)] shadow-md",
    secondary:
      "border-2 border-secondary text-secondary hover:bg-secondary hover:text-white hover:shadow-[0_0_20px_rgba(20,167,108,0.4)] transition-all",
    ghost: "text-neutral-200 hover:text-accent transition-colors",
  };

  const sizeStyles = {
    sm: "px-6 py-2 text-sm",
    md: "px-8 py-4 text-lg",
    lg: "px-10 py-5 text-xl",
  };

  const buttonContent = (
    <>
      <span className="relative z-10">{children}</span>
      {showArrow && (
        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
      )}
    </>
  );

  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} group relative overflow-hidden`;

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link href={href} className={buttonClasses}>
          {buttonContent}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={buttonClasses}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {buttonContent}
    </motion.button>
  );
}
