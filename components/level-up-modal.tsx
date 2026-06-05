"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function LevelUpModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("pofang:level-up", handler);
    return () => window.removeEventListener("pofang:level-up", handler);
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-card border border-acid/30 bg-panel p-8 text-center shadow-acid"
            initial={{ scale: 0.78, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.span
                className="absolute text-lg"
                key={index}
                initial={{ x: 150, y: 130, opacity: 0, rotate: 0 }}
                animate={{
                  x: 20 + ((index * 29) % 270),
                  y: 20 + ((index * 47) % 210),
                  opacity: [0, 1, 0],
                  rotate: 180
                }}
                transition={{ duration: 0.75, delay: index * 0.018 }}
              >
                {index % 2 ? "✨" : "🎉"}
              </motion.span>
            ))}
            <p className="text-4xl">🎉</p>
            <p className="mt-3 text-h2 text-acid">{t("levelUp.title")}</p>
            <motion.p
              className="mt-2 text-[56px] font-bold leading-none text-white"
              initial={{ scale: 0.75 }}
              animate={{ scale: [0.75, 1.12, 1] }}
              transition={{ duration: 0.68 }}
            >
              Lv8
            </motion.p>
            <p className="mt-3 text-h2 text-white">{t("levelUp.role")}</p>
            <p className="mt-3 text-meta text-muted">{t("levelUp.body")}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
