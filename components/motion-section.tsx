"use client";

import { motion, useReducedMotion } from "framer-motion";

export function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={false}
      whileInView={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1], y: [24, 0] }}
      viewport={{ once: true, margin: "0px 0px 80px 0px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
