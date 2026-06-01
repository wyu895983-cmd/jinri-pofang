"use client";

import { motion } from "framer-motion";

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.p
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-acid/30 bg-ink/90 px-4 py-2 text-meta text-acid shadow-acid"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
    >
      {message}
    </motion.p>
  );
}
