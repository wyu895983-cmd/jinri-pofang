"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function EnergyFeedback() {
  const [active, setActive] = useState(false);
  const [energy, setEnergy] = useState(16);

  useEffect(() => {
    const handler = () => {
      setEnergy((value) => value + 1);
      setActive(true);
      window.setTimeout(() => setActive(false), 720);
    };
    window.addEventListener("pofang:energy-gain", handler);
    return () => window.removeEventListener("pofang:energy-gain", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed right-5 top-20 z-40">
      <motion.div
        className="rounded-button border border-acid/30 bg-ink/85 px-4 py-2 text-meta font-semibold text-acid shadow-acid backdrop-blur"
        animate={active ? { scale: [1, 1.18, 1], color: ["#b8ff3d", "#ffffff", "#b8ff3d"] } : { scale: 1 }}
        transition={{ duration: 0.46 }}
      >
        怨气 {energy}
      </motion.div>
      <AnimatePresence>
        {active
          ? Array.from({ length: 12 }).map((_, index) => (
              <motion.span
                className="absolute right-8 top-8 h-2 w-2 rounded-full bg-acid"
                key={index}
                initial={{ opacity: 0, x: -120 + index * 14, y: 160 - (index % 4) * 18, scale: 0.7 }}
                animate={{ opacity: [0, 1, 0], x: 8, y: 4, scale: [0.7, 1.2, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.68, delay: index * 0.018, ease: "easeOut" }}
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  );
}
