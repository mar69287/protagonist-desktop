"use client";

import { ReactNode } from "react";

interface HeadingProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeToStyles = {
  xs: "text-lg",
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl",
  "2xl": "text-5xl sm:text-6xl",
};

export default function Heading({
  children,
  as: Component = "h2",
  size = "md",
  className = "",
}: HeadingProps) {
  return (
    <Component
      className={`font-bold text-white ${sizeToStyles[size]} ${className}`}
    >
      {children}
    </Component>
  );
}
