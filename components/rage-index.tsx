"use client";

import { motion } from "framer-motion";

export function RageIndex({ postCount, reactionCount }: { postCount: number; reactionCount: number }) {
  const score = Math.min(100, Math.max(8, postCount * 9 + reactionCount * 2));
  const status =
    score < 30 ? "☀️ 心态稳定" : score < 60 ? "🌤 有点烦" : score < 80 ? "🌧 大家都在破防" : "⚡ 怨气爆表";

  return (
    <section className="glass mb-4 rounded-card p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-label text-acid">互联网怨气指数</p>
          <p className="mt-2 text-meta text-muted">今日互联网怨气</p>
        </div>
        <motion.span
          className="text-[32px] font-bold leading-10 text-white"
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32 }}
        >
          {score}%
        </motion.span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple via-fuchsia-500 to-acid"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
      </div>
      <p className="mt-3 text-meta font-medium text-zinc-200">{status}</p>
    </section>
  );
}
