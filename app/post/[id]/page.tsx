"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LocalPostCard } from "@/components/local-post-card";
import { RichContent } from "@/components/rich-content";
import { StickerPicker } from "@/components/sticker-picker";
import { Toast } from "@/components/toast";
import {
  createComment,
  deletePost,
  getComments,
  getCurrentUser,
  getCurrentUserId,
  getPost,
  getPostAuthorId,
  isFavorite,
  likeComment,
  likePost,
  LocalComment,
  LocalPost,
  subscribeToComments,
  subscribeToPost,
  toggleFavorite
} from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;
const NETWORK_TOAST = "网络开小差了，稍后再试";
const LIKE_LOCK_MS = 500;
const DELETE_PARTICLES = [
  { bottom: "5%", color: "bg-acid/70", delay: 0, left: "8%", x: -12 },
  { bottom: "9%", color: "bg-zinc-400/60", delay: 0.03, left: "17%", x: 8 },
  { bottom: "4%", color: "bg-acid/60", delay: 0.06, left: "27%", x: -5 },
  { bottom: "12%", color: "bg-zinc-500/70", delay: 0.01, left: "36%", x: 13 },
  { bottom: "7%", color: "bg-acid/70", delay: 0.08, left: "46%", x: -10 },
  { bottom: "15%", color: "bg-zinc-400/60", delay: 0.04, left: "55%", x: 7 },
  { bottom: "6%", color: "bg-acid/60", delay: 0.02, left: "64%", x: -8 },
  { bottom: "11%", color: "bg-zinc-500/70", delay: 0.07, left: "73%", x: 11 },
  { bottom: "5%", color: "bg-acid/70", delay: 0.05, left: "82%", x: -6 },
  { bottom: "14%", color: "bg-zinc-400/60", delay: 0, left: "91%", x: 9 }
] as const;

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<LocalPost | null>(null);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<LocalComment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const [pendingCommentIds, setPendingCommentIds] = useState<Set<string>>(new Set());
  const commentsById = useMemo(() => new Map(comments.map((comment) => [comment.id, comment])), [comments]);
  const topComments = useMemo(() => comments.filter((comment) => !getParentCommentId(comment)), [comments]);
  const repliesByParent = useMemo(() => {
    const byId = new Map(comments.map((comment) => [comment.id, comment]));
    return comments.reduce<Record<string, LocalComment[]>>((acc, comment) => {
      const directParentId = getParentCommentId(comment);
      if (!directParentId) return acc;
      const parent = byId.get(directParentId);
      const parentId = parent ? getParentCommentId(parent) ?? directParentId : directParentId;
      acc[parentId] = [...(acc[parentId] ?? []), comment].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      return acc;
    }, {});
  }, [comments]);

  async function refresh() {
    if (deletingRef.current) return;
    const current = getCurrentUser();
    setUserId(getCurrentUserId(current));
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
    let refreshTimer: number | undefined;
    const refreshSoon = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refresh, 120);
    };
    const unsubscribePost = subscribeToPost(params.id, refreshSoon);
    const unsubscribeComments = subscribeToComments(params.id, refreshSoon);
    window.addEventListener("pofang:storage-change", refresh);
    return () => {
      unsubscribePost();
      unsubscribeComments();
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener("pofang:storage-change", refresh);
    };
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

  useEffect(() => {
    if (replyTarget && !comments.some((comment) => comment.id === replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [comments, replyTarget]);

  function requireName() {
    if (getCurrentUser()) return true;
    router.push(loginPrompt);
    return false;
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingComment) return;
    if (!requireName()) return;

    try {
      setSubmittingComment(true);
      await createComment(params.id, String(new FormData(event.currentTarget).get("content") ?? ""), replyTarget?.id ?? null);
      event.currentTarget.reset();
      setReplyTarget(null);
      setError("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "评论失败了。");
    } finally {
      setSubmittingComment(false);
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

  async function handleDelete() {
    if (!post || deleting || !window.confirm("确定删除这条破防吗？")) return;
    try {
      deletingRef.current = true;
      setError("");
      setDeleting(true);
      await wait(800);
      await deletePost(post.id);
      setToast("已删除");
      window.setTimeout(() => router.push("/"), 500);
    } catch (err) {
      deletingRef.current = false;
      setDeleting(false);
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (!loaded && !post) {
    return <PostDetailSkeleton />;
  }

  if (!post) {
    return (
      <>
        <div className="glass rounded-card p-8 text-center text-meta text-muted">这条破防瞬间已经找不到了。</div>
        <Toast message={toast} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <motion.div
          animate={
            deleting
              ? {
                  clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"],
                  filter: ["blur(0px)", "blur(6px)"],
                  opacity: [1, 0],
                  y: [0, -20]
                }
              : {
                  clipPath: "inset(0% 0% 0% 0%)",
                  filter: "blur(0px)",
                  opacity: 1,
                  y: 0
                }
          }
          transition={{ duration: 0.8, ease: "easeIn" }}
        >
          <LocalPostCard
            disabled={pendingPostIds.has(post.id) || deleting}
            favorited={favorited}
            liked={Boolean(userId && post.liked_by.includes(userId))}
            onFavorite={() => setFavorited(toggleFavorite(post.id))}
            onDelete={Boolean(userId && userId === getPostAuthorId(post)) ? handleDelete : undefined}
            onLike={() => handlePostReaction()}
            onEmotion={(reaction) => handlePostReaction(reaction)}
            post={post}
          />
        </motion.div>

        {deleting
          ? DELETE_PARTICLES.map((particle, index) => (
              <motion.span
                animate={{ opacity: [0, 0.9, 0], rotate: [0, index % 2 ? 35 : -35], x: particle.x, y: -70 - (index % 3) * 14 }}
                className={`pointer-events-none absolute h-1.5 w-1 ${particle.color}`}
                initial={{ opacity: 0, rotate: 0, x: 0, y: 0 }}
                key={`${particle.left}-${particle.bottom}`}
                style={{ bottom: particle.bottom, left: particle.left }}
                transition={{ delay: particle.delay, duration: 0.7, ease: "easeOut" }}
              />
            ))
          : null}
      </div>

      <section className="glass rounded-card p-5">
        <h2 className="text-h2 text-white">评论区</h2>
        <form className="mt-4" onSubmit={submitComment}>
          {error ? <p className="mb-3 text-meta text-acid">{error}</p> : null}
          {replyTarget ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-card border border-acid/30 bg-acid/10 px-3 py-2 text-meta text-acid">
              <span className="truncate">回复 @{replyTarget.nickname}</span>
              <button className="shrink-0 text-muted transition hover:text-white" onClick={() => setReplyTarget(null)} type="button">
                取消
              </button>
            </div>
          ) : null}
          <textarea
            className="w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={80}
            name="content"
            placeholder={replyTarget ? `回复 @${replyTarget.nickname}` : "80 字以内，接住这份破防。"}
            rows={3}
          />
          <StickerPicker />
          <button className="app-button mt-3 bg-acid text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60" disabled={submittingComment}>
            {submittingComment ? "发送中..." : "评论"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {commentsLoading && !comments.length ? (
            <CommentSkeleton />
          ) : topComments.length ? (
            topComments.map((comment, index) => (
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
                    <img alt="" className="h-9 w-9 rounded-2xl border border-acid/20 bg-acid/10 object-contain p-1" decoding="async" loading="lazy" src={comment.avatar_url} />
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
                <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setReplyTarget(comment)} type="button">
                  回复
                </button>
                {repliesByParent[comment.id]?.length ? (
                  <div className="mt-4 space-y-3 border-l border-acid/20 pl-4">
                    {repliesByParent[comment.id].map((reply) => (
                      <article className="rounded-card border border-line bg-ink/35 p-3" id={`comment-${reply.id}`} key={reply.id}>
                        <div className="mb-3 rounded-button border-l-2 border-acid/30 bg-white/[0.04] px-3 py-2 text-meta text-muted">
                          @{getReplyContext(reply, commentsById, comment).nickname}：{getReplyContext(reply, commentsById, comment).content}
                        </div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <img alt="" className="h-7 w-7 rounded-xl border border-acid/20 bg-acid/10 object-contain p-1" decoding="async" loading="lazy" src={reply.avatar_url} />
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold leading-5 text-white">{reply.nickname}</p>
                              <p className="mt-0.5 text-meta text-muted">{formatCommentTime(reply.created_at)}</p>
                            </div>
                          </div>
                          <motion.button
                            className={`rounded-[12px] border px-2 py-1 text-label ${
                              userId && reply.liked_by.includes(userId) ? "border-acid/70 bg-acid/20 text-acid" : "border-line text-muted"
                            }`}
                            disabled={pendingCommentIds.has(reply.id)}
                            onClick={() => handleCommentLike(reply.id)}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                          >
                            <motion.span key={reply.like_count} initial={{ scale: 1.22 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                              {reply.like_count}赞
                            </motion.span>
                          </motion.button>
                        </div>
                        <RichContent className="text-body text-zinc-200" content={`${reply.nickname}：${reply.content}`} />
                        <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setReplyTarget(reply)} type="button">
                          回复
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
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

function getParentCommentId(comment: LocalComment) {
  return comment.parent_comment_uuid ?? comment.parent_comment_id ?? null;
}

function getReplyContext(reply: LocalComment, commentsById: Map<string, LocalComment>, topLevelComment: LocalComment) {
  const parentId = getParentCommentId(reply);
  const parentComment = parentId ? commentsById.get(parentId) : null;
  return {
    nickname: reply.replyToUser?.nickname || parentComment?.nickname || reply.parent_nickname || topLevelComment.nickname,
    content: reply.replyToComment?.content || parentComment?.content || topLevelComment.content
  };
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
