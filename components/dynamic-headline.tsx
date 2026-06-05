"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function DynamicHeadline() {
  const { locale, t } = useI18n();
  const headlinePool = useMemo(() => [t("home.headline1"), t("home.headline2"), t("home.headline3")], [locale, t]);
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState<string>(headlinePool[0]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLineIndex(0);
    setText(headlinePool[0]);
    setDeleting(false);
  }, [locale]);

  useEffect(() => {
    const target = headlinePool[lineIndex];
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
          setLineIndex((value) => (value + 1) % headlinePool.length);
          return;
        }

        setText(target.slice(0, text.length + 1));
      },
      deleting ? 28 : 52
    );

    return () => window.clearTimeout(timer);
  }, [deleting, headlinePool, lineIndex, text]);

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
