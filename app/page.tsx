"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DynamicHeadline } from "@/components/dynamic-headline";
import { FeedSkeleton } from "@/components/skeleton";
import { LocalPostCard } from "@/components/local-post-card";
import { Toast } from "@/components/toast";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser, getCurrentUserId, getFavorites, getFollowingIds, getPosts, isFavorite, likePost, LocalPost, subscribeToPostFeed, toggleFavorite } from "@/lib/storage";

const LIKE_LOCK_MS = 500;

export default function HomePage() {
  const { t } = useI18n();
  const loginPrompt = `/login?message=${encodeURIComponent(t("auth.needName"))}`;
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"square" | "following">("square");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  async function refresh() {
    const current = getCurrentUser();
    setUserId(getCurrentUserId(current));
    const [nextPosts, nextFollowingIds] = await Promise.all([getPosts(), getFollowingIds()]);
    setPosts(nextPosts);
    setFollowingIds(new Set(nextFollowingIds));
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
  const displayedPosts = useMemo(() => feedMode === "square" ? posts : posts.filter((post) => followingIds.has(post.user_id)), [feedMode, followingIds, posts]);

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
      showToast(setToast, t("common.networkError"));
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
      showToast(setToast, t("common.networkError"));
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-label text-acid">{t("home.eyebrow")}</p>
          <div className="flex gap-2">
            <Link className="grid h-9 w-9 place-items-center rounded-2xl border border-line bg-white/[0.04] text-muted" href="/search" aria-label={t("home.searchAria")}>
              <Search className="h-4 w-4" />
            </Link>
            <Link className="grid h-9 w-9 place-items-center rounded-2xl border border-line bg-white/[0.04] text-muted" href="/favorites" aria-label={t("home.favoriteAria")}>
              <Bookmark className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <DynamicHeadline />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-card p-4">
          <p className="text-meta text-muted">{t("home.todayPosts")}</p>
          <p className="mt-1 text-h2 text-white">{posts.length}</p>
        </div>
        <div className="glass rounded-card p-4">
          <p className="text-meta text-muted">{t("home.heat")}</p>
          <motion.p
            className="mt-1 text-h2 text-acid drop-shadow-[0_0_16px_rgba(182,255,59,0.28)]"
            animate={{ scale: [1, 1.045, 1], filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {reactionCount}
          </motion.p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 rounded-card border border-line bg-white/[0.025] p-1">
        <button aria-pressed={feedMode === "square"} className={`app-button ${feedMode === "square" ? "bg-acid text-ink" : "text-muted"}`} onClick={() => setFeedMode("square")} type="button">{t("follow.square")}</button>
        <button aria-pressed={feedMode === "following"} className={`app-button ${feedMode === "following" ? "bg-acid text-ink" : "text-muted"}`} onClick={() => setFeedMode("following")} type="button">{t("follow.feed")}</button>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <div className="space-y-4">
          {feedMode === "following" && !userId ? <Link className="glass block rounded-card p-8 text-center text-meta text-muted" href={loginPrompt}>{t("auth.needName")}</Link> : null}
          {feedMode === "following" && userId && displayedPosts.length === 0 ? (
            <button className="glass w-full rounded-card p-8 text-center text-meta text-muted" onClick={() => setFeedMode("square")} type="button">{t("follow.empty")}</button>
          ) : null}
          {displayedPosts.map((post, index) => (
            <LocalPostCard
              disabled={pendingPostIds.has(post.id)}
              favorited={favoriteIds.has(post.id) || isFavorite(post.id)}
              index={index}
              key={post.id}
              liked={Boolean(userId && post.liked_by.includes(userId))}
              followed={feedMode === "square" && followingIds.has(post.user_id)}
              onFavorite={() => handleFavorite(post.id)}
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
