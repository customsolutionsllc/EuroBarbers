"use client";

import { motion } from "framer-motion";

export function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      className={className}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
