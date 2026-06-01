"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function DailyCheckinToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seenKey = `pofang-checkin-${new Date().toISOString().slice(0, 10)}`;
    if (window.localStorage.getItem(seenKey)) return;

    window.localStorage.setItem(seenKey, "1");
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed left-5 right-5 top-16 z-50 mx-auto max-w-sm rounded-card border border-acid/30 bg-panel/95 p-5 shadow-acid backdrop-blur"
          initial={{ opacity: 0, y: -28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
        >
          <p className="text-label text-acid">今日签到成功</p>
          <p className="mt-2 text-h2 text-white">+5 EXP</p>
          <p className="mt-2 text-meta text-muted">连续登录 7 天可解锁：🔥 怨气连载家</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
