"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { DynamicHeadline } from "@/components/dynamic-headline";
import { LocalPostCard } from "@/components/local-post-card";
import { getCurrentUser, getPosts, likePost, LocalPost } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;
const NETWORK_TOAST = "网络开小差了，稍后再试";
const LIKE_LOCK_MS = 500;

export default function HomePage() {
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  async function refresh() {
    const user = getCurrentUser();
    setUserId(user?.guest_user_id ?? null);
    setPosts(await getPosts());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, []);

  const reactionCount = useMemo(() => posts.reduce((sum, post) => sum + post.reaction_count + post.comment_count, 0), [posts]);

  async function handleLike(postId: string, reaction = "like") {
    const currentUserId = getCurrentUser()?.guest_user_id;
    if (!currentUserId) {
      window.location.href = loginPrompt;
      return;
    }

    if (pendingPostIds.has(postId)) return;

    const previousPosts = posts;
    if (!previousPosts.some((post) => post.id === postId)) return;

    setPendingPostIds((value) => new Set(value).add(postId));
    setPosts((value) => applyOptimisticPostReaction(value, postId, currentUserId));

    try {
      await Promise.all([likePost(postId, reaction), wait(LIKE_LOCK_MS)]);
    } catch {
      setPosts(previousPosts);
      showNetworkToast(setToast);
    } finally {
      setPendingPostIds((value) => {
        const next = new Set(value);
        next.delete(postId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-label text-acid">今日情绪广场</p>
        <DynamicHeadline />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-card p-4">
          <p className="text-meta text-muted">今日破防</p>
          <p className="mt-1 text-h2 text-white">{posts.length}</p>
        </div>
        <div className="glass rounded-card p-4">
          <p className="text-meta text-muted">互动热度</p>
          <motion.p
            className="mt-1 text-h2 text-acid drop-shadow-[0_0_16px_rgba(182,255,59,0.28)]"
            animate={{ scale: [1, 1.045, 1], filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {reactionCount}
          </motion.p>
        </div>
      </section>

      <div className="space-y-4">
        {posts.map((post, index) => (
          <LocalPostCard
            disabled={pendingPostIds.has(post.id)}
            index={index}
            key={post.id}
            liked={Boolean(userId && post.liked_by.includes(userId))}
            onLike={() => handleLike(post.id)}
            onEmotion={(reaction) => handleLike(post.id, reaction)}
            post={post}
          />
        ))}
      </div>

      {toast ? <p className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-acid/30 bg-ink/90 px-4 py-2 text-meta text-acid shadow-acid">{toast}</p> : null}
    </div>
  );
}

function applyOptimisticPostReaction(posts: LocalPost[], postId: string, userId: string) {
  return posts.map((post) => {
    if (post.id !== postId) return post;
    const liked = post.liked_by.includes(userId);
    return {
      ...post,
      liked_by: liked ? post.liked_by.filter((id) => id !== userId) : [...post.liked_by, userId],
      reaction_count: Math.max(0, post.reaction_count + (liked ? -1 : 1))
    };
  });
}

function showNetworkToast(setToast: (value: string) => void) {
  setToast(NETWORK_TOAST);
  window.setTimeout(() => setToast(""), 1800);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
