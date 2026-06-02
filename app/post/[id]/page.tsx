"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { LocalPostCard } from "@/components/local-post-card";
import { RichContent } from "@/components/rich-content";
import { StickerPicker } from "@/components/sticker-picker";
import { Toast } from "@/components/toast";
import { createComment, getComments, getCurrentUser, getPost, isFavorite, likeComment, likePost, LocalComment, LocalPost, toggleFavorite } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;
const NETWORK_TOAST = "网络开小差了，稍后再试";
const LIKE_LOCK_MS = 500;

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<LocalPost | null>(null);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const [pendingCommentIds, setPendingCommentIds] = useState<Set<string>>(new Set());

  async function refresh() {
    const current = getCurrentUser();
    setUserId(current?.guest_user_id ?? null);
    setCommentsLoading(true);
    const [nextPost, nextComments] = await Promise.all([getPost(params.id), getComments(params.id)]);
    setPost(nextPost);
    setComments(nextComments);
    setFavorited(isFavorite(params.id));
    setLoaded(true);
    setCommentsLoading(false);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, [params.id]);

  useEffect(() => {
    if (commentsLoading || !window.location.hash.startsWith("#comment-")) return;

    let timeout: number | undefined;
    let attempts = 0;
    const targetId = window.location.hash.slice(1);

    function scrollWhenReady() {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      attempts += 1;
      if (attempts < 5) timeout = window.setTimeout(scrollWhenReady, 100);
    }

    timeout = window.setTimeout(scrollWhenReady, 0);
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [comments, commentsLoading]);

  function requireName() {
    if (getCurrentUser()) return true;
    router.push(loginPrompt);
    return false;
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireName()) return;

    try {
      await createComment(params.id, String(new FormData(event.currentTarget).get("content") ?? ""));
      event.currentTarget.reset();
      setError("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "评论失败了。");
    }
  }

  async function handlePostReaction(reaction = "like") {
    const currentUserId = getCurrentUser()?.guest_user_id;
    if (!currentUserId || !post) {
      router.push(loginPrompt);
      return;
    }
    if (pendingPostIds.has(post.id)) return;

    const previousPost = post;
    setPendingPostIds((value) => new Set(value).add(post.id));
    setPost(applyOptimisticPostReaction(post, currentUserId));

    try {
      await Promise.all([likePost(post.id, reaction), wait(LIKE_LOCK_MS)]);
    } catch {
      setPost(previousPost);
      showNetworkToast(setToast);
    } finally {
      setPendingPostIds((value) => {
        const next = new Set(value);
        next.delete(post.id);
        return next;
      });
    }
  }

  async function handleCommentLike(commentId: string) {
    const currentUserId = getCurrentUser()?.guest_user_id;
    if (!currentUserId) {
      router.push(loginPrompt);
      return;
    }
    if (pendingCommentIds.has(commentId)) return;

    const previousComments = comments;
    if (!previousComments.some((comment) => comment.id === commentId)) return;

    setPendingCommentIds((value) => new Set(value).add(commentId));
    setComments((value) => applyOptimisticCommentReaction(value, commentId, currentUserId));

    try {
      await Promise.all([likeComment(commentId), wait(LIKE_LOCK_MS)]);
    } catch {
      setComments(previousComments);
      showNetworkToast(setToast);
    } finally {
      setPendingCommentIds((value) => {
        const next = new Set(value);
        next.delete(commentId);
        return next;
      });
    }
  }

  if (!loaded && !post) {
    return <PostDetailSkeleton />;
  }

  if (!post) {
    return <div className="glass rounded-card p-8 text-center text-meta text-muted">这条破防瞬间已经找不到了。</div>;
  }

  return (
    <div className="space-y-4">
      <LocalPostCard
        disabled={pendingPostIds.has(post.id)}
        favorited={favorited}
        liked={Boolean(userId && post.liked_by.includes(userId))}
        onFavorite={() => setFavorited(toggleFavorite(post.id))}
        onLike={() => handlePostReaction()}
        onEmotion={(reaction) => handlePostReaction(reaction)}
        post={post}
      />

      <section className="glass rounded-card p-5">
        <h2 className="text-h2 text-white">评论区</h2>
        <form className="mt-4" onSubmit={submitComment}>
          {error ? <p className="mb-3 text-meta text-acid">{error}</p> : null}
          <textarea
            className="w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={80}
            name="content"
            placeholder="80 字以内，接住这份破防。"
            rows={3}
          />
          <StickerPicker />
          <button className="app-button mt-3 bg-acid text-ink hover:brightness-110">评论</button>
        </form>

        <div className="mt-6 space-y-3">
          {commentsLoading && !comments.length ? (
            <CommentSkeleton />
          ) : comments.length ? (
            comments.map((comment, index) => (
              <motion.article
                className="rounded-card border border-line bg-white/[0.035] p-4"
                id={`comment-${comment.id}`}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
                key={comment.id}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img alt="" className="h-9 w-9 rounded-2xl border border-acid/20 bg-acid/10 object-contain p-1" src={comment.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-5 text-white">{comment.nickname}</p>
                      <p className="mt-1 text-meta text-muted">{formatCommentTime(comment.created_at)}</p>
                    </div>
                  </div>
                  <motion.button
                    className={`rounded-[12px] border px-3 py-1 text-label ${
                      userId && comment.liked_by.includes(userId) ? "border-acid/70 bg-acid/20 text-acid" : "border-line text-muted"
                    }`}
                    disabled={pendingCommentIds.has(comment.id)}
                    onClick={() => handleCommentLike(comment.id)}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                  >
                    <motion.span key={comment.like_count} initial={{ scale: 1.22 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                      {comment.like_count}赞
                    </motion.span>
                  </motion.button>
                </div>
                <RichContent className="text-body text-zinc-200" content={comment.content} />
              </motion.article>
            ))
          ) : (
            <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">暂无评论，空气突然安静。</p>
          )}
        </div>
      </section>

      <Toast message={toast} />
    </div>
  );
}

function applyOptimisticPostReaction(post: LocalPost, userId: string) {
  const liked = post.liked_by.includes(userId);
  return {
    ...post,
    liked_by: liked ? post.liked_by.filter((id) => id !== userId) : [...post.liked_by, userId],
    reaction_count: Math.max(0, post.reaction_count + (liked ? -1 : 1))
  };
}

function applyOptimisticCommentReaction(comments: LocalComment[], commentId: string, userId: string) {
  return comments.map((comment) => {
    if (comment.id !== commentId) return comment;
    const liked = comment.liked_by.includes(userId);
    return {
      ...comment,
      liked_by: liked ? comment.liked_by.filter((id) => id !== userId) : [...comment.liked_by, userId],
      like_count: Math.max(0, comment.like_count + (liked ? -1 : 1))
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

function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-card p-5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 space-y-3">
          <div className="h-4 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <section className="glass rounded-card p-5">
        <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
        <CommentSkeleton />
      </section>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div className="rounded-card border border-line bg-white/[0.035] p-4" key={item}>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-2xl bg-acid/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (sameDay) return `今天 ${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
  return `${padTime(date.getMonth() + 1)}-${padTime(date.getDate())} ${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
}
