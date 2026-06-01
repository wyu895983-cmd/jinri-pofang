"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const quotes = [
  "今天也辛苦你硬撑了。",
  "先破防一下，等会儿继续做人。",
  "这条怨气我替你记下了。",
  "笑出来也算一种自救。",
  "别急，PoPo 正在加载情绪缓冲区。"
];

export function PopoAssistant() {
  const [quote, setQuote] = useState("");
  const [open, setOpen] = useState(false);

  function talk() {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    setOpen(true);
  }

  return (
    <div className="fixed bottom-24 right-[max(14px,calc((100vw-430px)/2+14px))] z-40">
      <AnimatePresence>
        {open ? (
          <motion.div
            className="mb-3 max-w-[220px] rounded-card border border-acid/30 bg-ink/92 p-3 text-meta text-zinc-100 shadow-acid backdrop-blur"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
          >
            {quote}
            <Link className="mt-2 block text-label text-acid" href="/feedback">
              去反馈
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        className="grid h-14 w-14 place-items-center rounded-2xl border border-acid/40 bg-acid/10 shadow-acid backdrop-blur"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.9 }}
        onClick={talk}
        type="button"
        aria-label="PoPo 助手"
      >
        <BrandMark className="h-10 w-10" />
      </motion.button>
    </div>
  );
}
