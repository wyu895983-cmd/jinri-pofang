"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { RichContent } from "@/components/rich-content";
import { getLevelInfo } from "@/lib/levels";
import type { HomeFeedPost } from "@/lib/copy-pool";
import { formatTime } from "@/lib/time";

const loginPrompt = "/login?message=%E7%99%BB%E5%BD%95%E5%90%8E%E6%89%8D%E8%83%BD%E7%A7%AF%E7%B4%AF%E6%80%A8%E6%B0%94%E5%80%BC%E5%92%8C%E7%BB%8F%E9%AA%8C";

export function FeedList({ posts, canReact }: { posts: HomeFeedPost[]; canReact: boolean }) {
  return (
    <motion.div className="space-y-4" initial="hidden" animate="show">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          variants={{
            hidden: { opacity: 0, y: 18 },
            show: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.45, delay: Math.min(index * 0.055, 0.35), ease: "easeOut" }}
        >
          {post.fromCopyPool ? <CopyPoolPostCard canReact={canReact} post={post} /> : <PostCard post={post} />}
        </motion.div>
      ))}
    </motion.div>
  );
}

function CopyPoolPostCard({ post, canReact }: { post: HomeFeedPost; canReact: boolean }) {
  const level = getLevelInfo(post.profiles.exp);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.reaction_count);

  function toggleLike() {
    setLiked((value) => {
      const next = !value;
      setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
      return next;
    });
  }

  return (
    <motion.article
      className="glass rounded-card p-5 transition-colors hover:border-acid/30"
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 text-white">{post.profiles.nickname}</p>
          <p className="mt-2 text-meta text-muted">
            Lv{level.level} · {level.title} · {formatTime(post.created_at, { mode: "relative" })}
          </p>
        </div>
        {canReact ? (
          <motion.button
            type="button"
            className={`relative h-8 shrink-0 rounded-[12px] border px-3 text-label ${
              liked ? "border-acid/70 bg-acid/25 text-white shadow-acid" : "border-acid/30 bg-acid/10 text-acid"
            }`}
            animate={liked ? { scale: [1, 1.16, 1] } : { scale: [1, 0.94, 1] }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? "取消点赞" : "点赞"}
          >
            {likes}赞
          </motion.button>
        ) : (
          <Link className="h-8 shrink-0 rounded-[12px] border border-acid/30 bg-acid/10 px-3 text-label leading-8 text-acid" href={loginPrompt}>
            {likes}赞
          </Link>
        )}
      </div>

      <RichContent className="whitespace-pre-wrap break-words text-body text-zinc-100" content={post.content} />

      <div className="mt-5 flex flex-wrap gap-2">
        {["😂 笑死", "😭 共鸣", "💀 破防", "🔥 神吐槽"].map((label) =>
          canReact ? (
            <button
              className="app-button border border-line bg-white/[0.04] text-button text-zinc-100 hover:border-purple/50 hover:bg-purple/10"
              key={label}
              type="button"
              onClick={toggleLike}
            >
              {label}
            </button>
          ) : (
            <Link
              className="app-button inline-flex items-center border border-line bg-white/[0.04] text-button text-zinc-100 hover:border-purple/50 hover:bg-purple/10"
              href={loginPrompt}
              key={label}
            >
              {label}
            </Link>
          )
        )}
        <span className="app-button inline-flex items-center justify-center gap-2 text-muted">
          <MessageCircle className="icon-18" />
          {post.comment_count}
        </span>
      </div>
    </motion.article>
  );
}
