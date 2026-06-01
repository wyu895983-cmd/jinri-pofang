"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { LocalPostCard } from "@/components/local-post-card";
import { RichContent } from "@/components/rich-content";
import { StickerPicker } from "@/components/sticker-picker";
import { createComment, getComments, getCurrentUser, getPost, likeComment, likePost, LocalComment, LocalPost } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<LocalPost | null>(null);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const current = getCurrentUser();
    setUserId(current?.guest_user_id ?? null);
    setPost(await getPost(params.id));
    setComments(await getComments(params.id));
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, [params.id]);

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

  if (!post) {
    return <div className="glass rounded-card p-8 text-center text-meta text-muted">这条破防瞬间已经找不到了。</div>;
  }

  return (
    <div className="space-y-4">
      <LocalPostCard
        liked={Boolean(userId && post.liked_by.includes(userId))}
        onLike={() => {
          if (!requireName()) return;
          void likePost(post.id).then(refresh);
        }}
        onEmotion={(reaction) => {
          if (!requireName()) return;
          void likePost(post.id, reaction).then(refresh);
        }}
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
          {comments.length ? (
            comments.map((comment, index) => (
              <motion.article
                className="rounded-card border border-line bg-white/[0.035] p-4"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
                key={comment.id}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-[15px] font-semibold leading-5 text-white">{comment.nickname}</p>
                  <button
                    className={`rounded-[12px] border px-3 py-1 text-label ${
                      userId && comment.liked_by.includes(userId) ? "border-acid/70 bg-acid/20 text-acid" : "border-line text-muted"
                    }`}
                    onClick={() => {
                      if (!requireName()) return;
                      void likeComment(comment.id).then(refresh);
                    }}
                    type="button"
                  >
                    {comment.like_count}赞
                  </button>
                </div>
                <RichContent className="text-body text-zinc-200" content={comment.content} />
              </motion.article>
            ))
          ) : (
            <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">暂无评论，空气突然安静。</p>
          )}
        </div>
      </section>
    </div>
  );
}
