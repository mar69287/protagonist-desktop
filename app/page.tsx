"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Rocket, Code, TrendingUp, Users } from "lucide-react";
import HeroSection from "@/components/sections/HeroSection";
import FeatureBlob from "@/components/ui/FeatureBlob";
import StatWave from "@/components/ui/StatWave";
import Button from "@/components/ui/Button";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Built for speed with cutting-edge technology and optimized performance.",
    color: "var(--color-accent)", // Accent yellow
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description:
      "Enterprise-grade security to keep your data safe and protected.",
    color: "var(--color-secondary)", // Secondary green
  },
  {
    icon: Rocket,
    title: "Scale Infinitely",
    description:
      "Grow without limits. Our platform scales with your business needs.",
    color: "var(--color-info)", // Info cyan
  },
  {
    icon: Code,
    title: "Developer First",
    description: "Beautiful APIs and tools designed for modern developers.",
    color: "var(--color-primary)", // Primary orange
  },
];

const stats = [
  { value: "99.9%", label: "Uptime", icon: TrendingUp },
  { value: "10M+", label: "Users", icon: Users },
  { value: "50K+", label: "Projects", icon: Code },
];

export default function Home() {
  return (
    <div className="">
      <HeroSection />

      {/* Stats Section - Diagonal Split Design */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-neutral-800">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <StatWave
                key={stat.label}
                value={stat.value}
                label={stat.label}
                icon={stat.icon}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section - Flowing Layout */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
              Powerful Capabilities
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Everything you need to build and scale your next big idea
            </p>
          </motion.div>

          {/* Unique flowing grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={index === 0 || index === 3 ? "lg:col-span-2" : ""}
              >
                <FeatureBlob
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  color={feature.color}
                  index={index}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Unique Split Design */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-neutral-800">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
              Ready to Transform Your Vision?
            </h2>
            <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
              Join thousands of developers and businesses already building with
              our platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button href="/contact" size="lg" showArrow>
                Start Building Now
              </Button>
              <Button href="/about" variant="secondary" size="lg">
                Explore Features
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
