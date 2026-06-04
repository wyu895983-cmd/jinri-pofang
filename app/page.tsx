"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DynamicHeadline } from "@/components/dynamic-headline";
import { FeedSkeleton } from "@/components/skeleton";
import { LocalPostCard } from "@/components/local-post-card";
import { Toast } from "@/components/toast";
import { deletePost, getCurrentUser, getCurrentUserId, getFavorites, getPostAuthorId, getPosts, isFavorite, likePost, LocalPost, subscribeToPostFeed, toggleFavorite } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;
const NETWORK_TOAST = "网络开小差了，稍后再试";
const LIKE_LOCK_MS = 500;

export default function HomePage() {
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  async function refresh() {
    const current = getCurrentUser();
    setUserId(getCurrentUserId(current));
    setPosts(await getPosts());
    setFavoriteIds(new Set(getFavorites().map((favorite) => favorite.post_id)));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    let refreshTimer: number | undefined;
    const refreshSoon = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refresh, 120);
    };
    const unsubscribe = subscribeToPostFeed(refreshSoon);
    window.addEventListener("pofang:storage-change", refresh);
    return () => {
      unsubscribe();
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener("pofang:storage-change", refresh);
    };
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
      showToast(setToast, NETWORK_TOAST);
    } finally {
      setPendingPostIds((value) => {
        const next = new Set(value);
        next.delete(postId);
        return next;
      });
    }
  }

  function handleFavorite(postId: string) {
    try {
      toggleFavorite(postId);
      setFavoriteIds(new Set(getFavorites().map((favorite) => favorite.post_id)));
    } catch {
      showToast(setToast, "收藏失败，稍后再试");
    }
  }

  async function handleDelete(postId: string) {
    if (!window.confirm("确定删除这条破防吗？")) return;
    try {
      await deletePost(postId);
      setPosts((value) => value.filter((post) => post.id !== postId));
      showToast(setToast, "已删除");
      await refresh();
    } catch (err) {
      showToast(setToast, err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-label text-acid">今日情绪广场</p>
          <div className="flex gap-2">
            <Link className="grid h-9 w-9 place-items-center rounded-2xl border border-line bg-white/[0.04] text-muted" href="/search" aria-label="搜索">
              <Search className="h-4 w-4" />
            </Link>
            <Link className="grid h-9 w-9 place-items-center rounded-2xl border border-line bg-white/[0.04] text-muted" href="/favorites" aria-label="收藏">
              <Bookmark className="h-4 w-4" />
            </Link>
          </div>
        </div>
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

      {loading ? (
        <FeedSkeleton />
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <LocalPostCard
              disabled={pendingPostIds.has(post.id)}
              favorited={favoriteIds.has(post.id) || isFavorite(post.id)}
              index={index}
              key={post.id}
              liked={Boolean(userId && post.liked_by.includes(userId))}
              onFavorite={() => handleFavorite(post.id)}
              onDelete={Boolean(userId && userId === getPostAuthorId(post)) ? () => handleDelete(post.id) : undefined}
              onLike={() => handleLike(post.id)}
              onEmotion={(reaction) => handleLike(post.id, reaction)}
              post={post}
            />
          ))}
        </div>
      )}

      <Toast message={toast} />
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

function showToast(setToast: (value: string) => void, message: string) {
  setToast(message);
  window.setTimeout(() => setToast(""), 1800);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
