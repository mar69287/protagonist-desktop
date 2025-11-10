"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatWaveProps {
  value: string;
  label: string;
  icon: LucideIcon;
  index: number;
}

export default function StatWave({
  value,
  label,
  icon: Icon,
  index,
}: StatWaveProps) {
  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
    >
      {/* Animated wave background */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 200"
        preserveAspectRatio="none"
        style={{ zIndex: 0 }}
      >
        <motion.path
          d="M0,100 Q50,50 100,100 T200,100 L200,200 L0,200 Z"
          fill={`url(#gradient-${index})`}
          animate={{
            d: [
              "M0,100 Q50,50 100,100 T200,100 L200,200 L0,200 Z",
              "M0,100 Q50,150 100,100 T200,100 L200,200 L0,200 Z",
              "M0,100 Q50,50 100,100 T200,100 L200,200 L0,200 Z",
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <defs>
          <linearGradient
            id={`gradient-${index}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(20, 167, 108, 0.15)" />
            <stop offset="100%" stopColor="rgba(255, 228, 0, 0.15)" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Content */}
      <div className="relative z-10 p-8 text-center">
        {/* Icon with orbiting effect */}
        <motion.div
          className="inline-flex mb-4"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div className="relative" whileHover={{ scale: 1.2 }}>
            <Icon className="w-10 h-10 text-primary" />
            <motion.div
              className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Value */}
        <motion.div
          className="text-5xl font-bold mb-2 text-primary"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: index * 0.15 + 0.2,
            type: "spring",
            stiffness: 200,
          }}
        >
          {value}
        </motion.div>

        {/* Label */}
        <div className="text-neutral-300 font-medium text-lg">{label}</div>
      </div>
    </motion.div>
  );
}
