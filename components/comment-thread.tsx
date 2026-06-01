"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { RichContent } from "@/components/rich-content";
import { StickerPicker } from "@/components/sticker-picker";
import { createComment, reactToComment } from "@/lib/actions";
import { formatTime } from "@/lib/time";

type CommentProfile = {
  id: string;
  nickname: string;
  exp: number;
  energy: number;
  streak_count: number;
};

export type CommentItem = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  like_count: number;
  featured_label: "god_reply" | "daily_god_reply" | null;
  created_at: string;
  updated_at?: string | null;
  profiles: CommentProfile;
};

export function CommentThread({
  postId,
  comments,
  canComment,
  error
}: {
  postId: string;
  comments: CommentItem[];
  canComment: boolean;
  error?: string;
}) {
  const topComments = useMemo(() => comments.filter((comment) => !comment.parent_comment_id), [comments]);
  const repliesByParent = useMemo(() => {
    return comments.reduce<Record<string, CommentItem[]>>((acc, comment) => {
      if (!comment.parent_comment_id) return acc;
      acc[comment.parent_comment_id] = [...(acc[comment.parent_comment_id] ?? []), comment];
      return acc;
    }, {});
  }, [comments]);

  return (
    <section className="glass rounded-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 text-white">评论区</h2>
        <span className="text-label text-muted">{comments.length} 条讨论</span>
      </div>

      {canComment ? (
        <CommentForm postId={postId} error={error} />
      ) : (
        <p className="mt-4 rounded-card border border-line bg-white/[0.04] p-4 text-meta text-muted">
          登录后才能积累怨气值和经验。
        </p>
      )}

      <div className="mt-6 space-y-4">
        {topComments.length ? (
          topComments.map((comment) => (
            <CommentCard
              canComment={canComment}
              comment={comment}
              key={comment.id}
              postId={postId}
              replies={repliesByParent[comment.id] ?? []}
            />
          ))
        ) : (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">
            暂无评论，空气突然安静。
          </p>
        )}
      </div>
    </section>
  );
}

function CommentForm({
  postId,
  parentId,
  error,
  replyToName
}: {
  postId: string;
  parentId?: string;
  error?: string;
  replyToName?: string;
}) {
  return (
    <form action={createComment} className={parentId ? "mt-3" : "mt-4"}>
      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentCommentId" value={parentId} /> : null}
      {error ? <p className="mb-3 text-meta text-acid">{error}</p> : null}
      <textarea
        name="content"
        maxLength={80}
        required
        rows={parentId ? 2 : 3}
        placeholder={
          parentId
            ? replyToName
              ? `回复 ${replyToName}，会显示在本条评论下。`
              : "回复一下，回复不加经验。"
            : "80 字以内，5 字以上才有 +1 EXP。"
        }
        className="w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
      />
      <StickerPicker />
      <button className="app-button mt-3 inline-flex items-center gap-2 bg-acid text-ink hover:brightness-110">
        <Send className="icon-18" />
        {parentId ? "回复" : "评论"}
      </button>
    </form>
  );
}

function CommentCard({
  comment,
  replies,
  postId,
  canComment
}: {
  comment: CommentItem;
  replies: CommentItem[];
  postId: string;
  canComment: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyToName, setReplyToName] = useState<string | undefined>();

  function openReply(name?: string) {
    setReplyToName(name);
    setReplyOpen(true);
  }

  return (
    <article className={`rounded-card border p-5 ${commentClass(comment.featured_label)}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-5 text-white">{comment.profiles.nickname}</p>
          <p className="mt-2 text-meta text-muted">
            {formatTime(comment.created_at, { mode: "detail", editedAt: comment.updated_at })}
          </p>
        </div>
        <FeaturedLabel label={comment.featured_label} />
      </div>

      <RichContent className="text-body text-zinc-100" content={comment.content} />

      <div className="mt-4 flex items-center gap-3">
        <CommentLikeButton comment={comment} postId={postId} />
        {canComment ? (
          <button
            className="app-button inline-flex items-center gap-2 text-muted hover:bg-white/5 hover:text-white"
            onClick={() => (replyOpen ? setReplyOpen(false) : openReply())}
            type="button"
          >
            <MessageCircle className="icon-18" />
            回复
          </button>
        ) : null}
      </div>

      {replyOpen ? <CommentForm postId={postId} parentId={comment.id} replyToName={replyToName} /> : null}

      {replies.length ? (
        <div className="mt-4 space-y-3 border-l border-line pl-4">
          {replies.map((reply) => (
            <article className="rounded-card bg-white/[0.035] p-4" key={reply.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-[15px] font-semibold leading-5 text-white">{reply.profiles.nickname}</p>
                <p className="text-meta text-muted">
                  {formatTime(reply.created_at, { mode: "detail", editedAt: reply.updated_at })}
                </p>
              </div>
              <RichContent className="text-body text-zinc-200" content={reply.content} />
              <div className="mt-3">
                <CommentLikeButton comment={reply} postId={postId} compact />
                {canComment ? (
                  <button
                    className="app-button ml-2 inline-flex min-h-8 items-center gap-2 px-3 text-label text-muted hover:bg-white/5 hover:text-white"
                    onClick={() => openReply(reply.profiles.nickname)}
                    type="button"
                  >
                    回复
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CommentLikeButton({ comment, postId, compact = false }: { comment: CommentItem; postId: string; compact?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(comment.like_count);
  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));

    startTransition(async () => {
      const result = await reactToComment(comment.id, postId);
      if (!result.ok) {
        setLiked(!nextLiked);
        setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
      }
    });
  }

  return (
    <motion.button
      className={`app-button inline-flex items-center gap-2 border border-line ${
        liked ? "bg-acid/15 text-acid shadow-acid" : "bg-white/[0.04] text-muted hover:text-white"
      } ${compact ? "min-h-8 px-3 text-label" : ""}`}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.2 }}
      onClick={toggleLike}
      disabled={isPending}
      type="button"
    >
      <Heart className="icon-18" />
      {count}
    </motion.button>
  );
}

function FeaturedLabel({ label }: { label: CommentItem["featured_label"] }) {
  if (!label) return null;

  const isDaily = label === "daily_god_reply";
  return (
    <span
      className={`featured-reply rounded-full px-3 py-1 text-label ${
        isDaily
          ? "border border-yellow-300/60 bg-yellow-300/15 text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.22)]"
          : "border border-acid/40 bg-acid/10 text-acid shadow-acid"
      }`}
    >
      {isDaily ? "🌟 今日神回复" : "✨ 神回复"}
    </span>
  );
}

function commentClass(label: CommentItem["featured_label"]) {
  if (label === "daily_god_reply") {
    return "border-yellow-300/50 bg-yellow-300/[0.055] shadow-[0_0_24px_rgba(250,204,21,0.14)] hot-gold";
  }

  if (label === "god_reply") {
    return "border-acid/30 bg-acid/[0.035] shadow-acid";
  }

  return "border-line bg-white/[0.035]";
}
