"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureBlobProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  index: number;
}

export default function FeatureBlob({
  icon: Icon,
  title,
  description,
  color,
  index,
}: FeatureBlobProps) {
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Morphing blob background */}
      <motion.div
        className="absolute inset-0 rounded-[40%] blur-xl opacity-30"
        style={{
          background: `linear-gradient(135deg, ${color}, transparent)`,
        }}
        animate={{
          borderRadius: [
            "40% 60% 70% 30% / 40% 50% 60% 50%",
            "70% 30% 50% 50% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "40% 60% 70% 30% / 40% 50% 60% 50%",
          ],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content container */}
      <div className="relative p-8 rounded-3xl border border-neutral-700 bg-neutral-800 shadow-xl hover:shadow-2xl transition-shadow">
        {/* Icon with morphing background */}
        <motion.div
          className="relative w-16 h-16 mb-6"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: color }}
            animate={{
              borderRadius: [
                "30% 70% 70% 30% / 30% 30% 70% 70%",
                "70% 30% 30% 70% / 70% 70% 30% 30%",
                "30% 70% 70% 30% / 30% 30% 70% 70%",
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-8 h-8 text-white relative z-10" />
          </div>
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>

        {/* Description */}
        <p className="text-neutral-300 leading-relaxed">{description}</p>

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: `linear-gradient(135deg, ${color}, transparent)`,
            opacity: 0,
          }}
          whileHover={{ opacity: 0.1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
