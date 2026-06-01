"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { RichContent } from "@/components/rich-content";
import { reactToPost } from "@/lib/actions";
import { getLevelInfo } from "@/lib/levels";
import type { PostWithProfile } from "@/lib/queries";
import { formatTime, type TimeFormatMode } from "@/lib/time";

const reactions = [
  ["laugh", "😂", "笑死"],
  ["same", "😭", "共鸣"],
  ["broken", "💀", "破防"],
  ["fire", "🔥", "神吐槽"]
] as const;

function heatClass(count: number) {
  if (count >= 500) return "hot-gold";
  if (count >= 100) return "hot-red";
  if (count >= 50) return "hot-orange";
  return "";
}

export function PostCard({ post, timeMode = "relative" }: { post: PostWithProfile; timeMode?: TimeFormatMode }) {
  const level = getLevelInfo(post.profiles.exp);
  const [badgeLiked, setBadgeLiked] = useState(false);
  const [badgeLikes, setBadgeLikes] = useState(post.reaction_count);
  const [badgeBurst, setBadgeBurst] = useState(0);
  const heat = heatClass(badgeLikes);

  function toggleBadgeLike() {
    setBadgeLiked((liked) => {
      const next = !liked;
      setBadgeLikes((count) => Math.max(0, count + (next ? 1 : -1)));
      setBadgeBurst((value) => value + 1);
      return next;
    });
  }

  return (
    <motion.article
      className={`glass ${heat} rounded-card p-5 transition-colors hover:border-acid/30`}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <Link href={`/profile?user=${post.user_id}`} className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 text-white">{post.profiles.nickname}</p>
          <p className="mt-2 text-meta text-muted">
            Lv{level.level} · {level.title} · {formatTime(post.created_at, { mode: timeMode, editedAt: post.updated_at })}
          </p>
        </Link>
        <LikeBadge count={badgeLikes} liked={badgeLiked} burst={badgeBurst} onClick={toggleBadgeLike} />
      </div>

      <Link href={`/post/${post.id}`}>
        <RichContent className="whitespace-pre-wrap break-words text-body text-zinc-100" content={post.content} />
      </Link>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {reactions.map(([value, emoji, label]) => (
          <form action={reactToPost} key={value}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="reaction" value={value} />
            <ReactionButton emoji={emoji} label={label} milestoneReady={badgeLikes === 4} />
          </form>
        ))}
        <Link
          href={`/post/${post.id}`}
          className="app-button col-span-2 inline-flex items-center justify-center gap-2 text-muted hover:bg-white/5 hover:text-white sm:col-span-1"
        >
          <MessageCircle className="icon-18" />
          {post.comment_count}
        </Link>
      </div>

      {badgeLikes >= 5 ? (
        <p className="mt-4 flex items-center gap-2 text-label text-acid">
          <Sparkles className="h-3 w-3" />
          这条已经有点东西了
        </p>
      ) : null}
    </motion.article>
  );
}

function LikeBadge({
  count,
  liked,
  burst,
  onClick
}: {
  count: number;
  liked: boolean;
  burst: number;
  onClick: () => void;
}) {
  const particles = ["💚", "✨", "+1", "怨", "✨"];

  return (
    <motion.button
      type="button"
      className={`relative h-8 shrink-0 overflow-visible rounded-[12px] border px-3 text-label ${
        liked ? "border-acid/70 bg-acid/25 text-white shadow-acid" : "border-acid/30 bg-acid/10 text-acid"
      }`}
      animate={liked ? { scale: [1, 1.16, 1] } : { scale: [1, 0.94, 1] }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "取消点赞" : "点赞"}
    >
      {count}赞
      <AnimatePresence>
        {liked && burst > 0 ? (
          <motion.span
            className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-label text-acid"
            key={`plus-${burst}`}
            initial={{ opacity: 0, y: 8, scale: 0.7 }}
            animate={{ opacity: [0, 1, 0], y: -12, scale: [0.7, 1.12, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            +1
          </motion.span>
        ) : null}

        {burst > 0
          ? particles.map((particle, index) => (
              <motion.span
                className="pointer-events-none absolute left-1/2 top-1/2 text-[11px] font-semibold"
                key={`${burst}-${particle}-${index}`}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.65 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: (index - 2) * 13,
                  y: -18 - (index % 2) * 12,
                  scale: [0.65, 1.15, 0.75]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {liked ? particle : ""}
              </motion.span>
            ))
          : null}
      </AnimatePresence>
    </motion.button>
  );
}

function ReactionButton({
  emoji,
  label,
  milestoneReady
}: {
  emoji: string;
  label: string;
  milestoneReady: boolean;
}) {
  const particles = Array.from({ length: 8 });
  const [burst, setBurst] = useState(0);

  function handleClick() {
    setBurst((value) => value + 1);

    if (milestoneReady) {
      window.dispatchEvent(new CustomEvent("pofang:energy-gain"));
    }

    if (label === "神吐槽") {
      window.dispatchEvent(new CustomEvent("pofang:level-up"));
    }
  }

  return (
    <motion.button
      className="app-button group relative w-full overflow-hidden border border-line bg-white/[0.04] text-button text-zinc-100 hover:border-purple/50 hover:bg-purple/10"
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
    >
      <span className="mr-2">{emoji}</span>
      {label}
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
            {emoji}
          </motion.span>
        ))}
      </span>
    </motion.button>
  );
}
