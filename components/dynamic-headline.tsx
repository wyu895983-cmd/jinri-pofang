"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HOME_HEADLINE_POOL } from "@/lib/copy-pool";

export function DynamicHeadline() {
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState<string>(HOME_HEADLINE_POOL[0]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = HOME_HEADLINE_POOL[lineIndex];
    const timer = window.setTimeout(
      () => {
        if (!deleting && text === target) {
          window.setTimeout(() => setDeleting(true), 5000);
          return;
        }

        if (deleting && text.length > 0) {
          setText((value) => value.slice(0, -1));
          return;
        }

        if (deleting && text.length === 0) {
          setDeleting(false);
          setLineIndex((value) => (value + 1) % HOME_HEADLINE_POOL.length);
          return;
        }

        setText(target.slice(0, text.length + 1));
      },
      deleting ? 28 : 52
    );

    return () => window.clearTimeout(timer);
  }, [deleting, lineIndex, text]);

  return (
    <h1 className="min-h-20 text-h1 text-white">
      <motion.span
        key={lineIndex}
        initial={{ opacity: 0.45, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        {text}
      </motion.span>
      <motion.span
        className="ml-1 inline-block h-8 w-1 translate-y-1 rounded-full bg-acid"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </h1>
  );
}
