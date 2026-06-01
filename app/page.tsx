"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { DynamicHeadline } from "@/components/dynamic-headline";
import { LocalPostCard } from "@/components/local-post-card";
import { getCurrentUser, getPosts, likePost, LocalPost } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;

export default function HomePage() {
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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
    try {
      await likePost(postId, reaction);
      await refresh();
    } catch {
      window.location.href = loginPrompt;
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
            index={index}
            key={post.id}
            liked={Boolean(userId && post.liked_by.includes(userId))}
            onLike={() => handleLike(post.id)}
            onEmotion={(reaction) => handleLike(post.id, reaction)}
            post={post}
          />
        ))}
      </div>
    </div>
  );
}
