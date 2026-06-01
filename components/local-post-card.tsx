"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { RichContent } from "@/components/rich-content";
import type { LocalPost } from "@/lib/storage";

type Emotion = {
  emoji: string;
  label: string;
  value: "laugh" | "same" | "broken" | "fire";
  message: string;
};

const emotions: Emotion[] = [
  { emoji: "😂", label: "笑死", value: "laugh", message: "笑出声了，PoPo 已经替你鼓掌。" },
  { emoji: "😭", label: "共鸣", value: "same", message: "这份委屈，大家都懂。" },
  { emoji: "💀", label: "破防", value: "broken", message: "这条怨气我替你记下了。" },
  { emoji: "🔥", label: "神吐槽", value: "fire", message: "这句可以进今日神吐槽。" }
];

export function LocalPostCard({
  post,
  index = 0,
  liked,
  onLike,
  onEmotion,
  disabled = false,
  href = `/post/${post.id}`
}: {
  post: LocalPost;
  index?: number;
  liked: boolean;
  onLike: () => void;
  onEmotion?: (reaction: "laugh" | "same" | "broken" | "fire") => void;
  disabled?: boolean;
  href?: string;
}) {
  const heatClass = getHeatClass(post.reaction_count);
  const [activeEmotion, setActiveEmotion] = useState<Emotion["value"] | null>(null);

  function toggleEmotion(emotion: Emotion) {
    setActiveEmotion((current) => {
      if (current === emotion.value) return null;
      onEmotion?.(emotion.value);
      return emotion.value;
    });
  }

  return (
    <motion.article
      className={`glass relative overflow-hidden rounded-card p-5 transition-colors ${heatClass}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.055, 0.4), ease: "easeOut" }}
      whileTap={{ scale: 0.992 }}
    >
      {post.reaction_count >= 200 ? <span className="hot-shine" /> : null}
      <div className="mb-4 flex items-start justify-between gap-3">
        <Link href={post.is_mock ? "#" : "/profile"} className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 text-white">{post.nickname}</p>
          <p className="mt-2 text-meta text-muted">{formatLocalTime(post.created_at)}</p>
        </Link>
        <LikeBadge count={post.reaction_count} disabled={disabled} liked={liked} onClick={onLike} />
      </div>

      <Link href={href}>
        <RichContent className="whitespace-pre-wrap break-words text-body text-zinc-100" content={post.content} />
      </Link>

      {post.reaction_count >= 500 ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/50 bg-yellow-300/15 px-3 py-1 text-label text-yellow-200">
          🔥热门
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {emotions.map((emotion) => (
          <EmotionButton
            active={activeEmotion === emotion.value}
            disabled={disabled}
            key={emotion.label}
            emotion={emotion}
            onReact={() => toggleEmotion(emotion)}
          />
        ))}
        <Link className="app-button col-span-2 flex items-center justify-center text-muted hover:bg-white/5 hover:text-white" href={`/post/${post.id}`}>
          {post.comment_count} 条评论
        </Link>
      </div>
    </motion.article>
  );
}

function LikeBadge({ count, disabled, liked, onClick }: { count: number; disabled?: boolean; liked: boolean; onClick: () => void }) {
  const [burst, setBurst] = useState(0);
  const [delta, setDelta] = useState<"+1" | "-1">("+1");
  const particles = ["✦", "怨", "✧", "Po", "✦"];

  function click() {
    setDelta(liked ? "-1" : "+1");
    setBurst((value) => value + 1);
    onClick();
  }

  return (
    <motion.button
      type="button"
      className={`relative h-8 shrink-0 overflow-visible rounded-[12px] border px-3 text-label ${
        liked ? "border-acid/80 bg-acid/25 text-white shadow-acid" : "border-acid/30 bg-acid/10 text-acid"
      }`}
      animate={burst ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileTap={{ scale: 0.9 }}
      onClick={click}
      aria-pressed={liked}
      disabled={disabled}
    >
      <motion.span key={count} initial={{ scale: 1.22 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
        {count}赞
      </motion.span>

      <AnimatePresence>
        {burst > 0 ? (
          <motion.span
            className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-label text-acid"
            key={`delta-${burst}`}
            initial={{ opacity: 0, y: 8, scale: 0.7 }}
            animate={{ opacity: [0, 1, 0], y: -12, scale: [0.7, 1.12, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            {delta}
          </motion.span>
        ) : null}
      </AnimatePresence>

      {burst > 0
        ? particles.map((particle, index) => (
            <motion.span
              className="pointer-events-none absolute left-1/2 top-1/2 text-[11px] font-semibold text-acid"
              key={`${burst}-${particle}-${index}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.65 }}
              animate={{
                opacity: [0, 1, 0],
                x: (index - 2) * 13,
                y: -18 - (index % 2) * 12,
                scale: [0.65, 1.15, 0.75]
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              {particle}
            </motion.span>
          ))
        : null}
    </motion.button>
  );
}

function EmotionButton({
  active,
  disabled,
  emotion,
  onReact
}: {
  active: boolean;
  disabled?: boolean;
  emotion: Emotion;
  onReact?: () => void;
}) {
  const [burst, setBurst] = useState(0);
  const particles = Array.from({ length: 8 });

  return (
    <div className="relative">
      <motion.button
        className="app-button group relative w-full overflow-hidden border border-line bg-white/[0.04] text-button text-zinc-100 hover:border-purple/50 hover:bg-purple/10"
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.18 }}
        onClick={() => {
          if (!active) setBurst((value) => value + 1);
          onReact?.();
        }}
        disabled={disabled}
        type="button"
      >
        <span className="mr-2">{emotion.emoji}</span>
        {emotion.label}
        <span className="pointer-events-none absolute inset-0">
          {particles.map((_, index) => (
            <motion.span
              className="absolute left-1/2 top-1/2 opacity-0"
              key={`${burst}-${index}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
              animate={
                burst
                  ? {
                      opacity: [0, 1, 0],
                      x: [0, (index - 3.5) * 9],
                      y: [0, -28 - (index % 3) * 10],
                      scale: [0.7, 1.2, 0.7]
                    }
                  : undefined
              }
              transition={{ duration: 0.6 }}
            >
              {emotion.emoji}
            </motion.span>
          ))}
        </span>
      </motion.button>

      <AnimatePresence>
        {active ? (
          <motion.div
            className="mt-2 rounded-card border border-acid/30 bg-ink/92 p-3 text-meta text-zinc-100 shadow-acid"
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {emotion.message}
            <Link className="mt-2 block text-label text-acid" href="/feedback">
              去反馈
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function getHeatClass(count: number) {
  if (count >= 500) return "hot-gold";
  if (count >= 200) return "hot-flow";
  if (count >= 100) return "hot-red";
  if (count >= 50) return "hot-orange";
  return "";
}

function formatLocalTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(value)) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
