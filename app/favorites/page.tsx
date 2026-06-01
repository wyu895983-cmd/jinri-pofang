"use client";

import { useEffect, useState } from "react";
import { FeedSkeleton } from "@/components/skeleton";
import { LocalPostCard } from "@/components/local-post-card";
import { Toast } from "@/components/toast";
import { getCurrentUser, getFavoritePosts, getFavorites, likePost, LocalPost, toggleFavorite } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;

export default function FavoritesPage() {
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const userId = getCurrentUser()?.guest_user_id ?? null;

  async function refresh() {
    setPosts(await getFavoritePosts());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, []);

  async function handleLike(postId: string, reaction = "like") {
    if (!getCurrentUser()) {
      window.location.href = loginPrompt;
      return;
    }
    const before = posts;
    setPosts((value) => optimistic(value, postId, userId!));
    try {
      await likePost(postId, reaction);
    } catch {
      setPosts(before);
      showToast(setToast, "点赞失败，稍后再试");
    }
  }

  function removeFavorite(postId: string) {
    toggleFavorite(postId);
    setPosts((value) => value.filter((post) => post.id !== postId));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">我的收藏</p>
        <h1 className="text-h1 text-white">那些舍不得划走的破防</h1>
        <p className="mt-3 text-body text-muted">按收藏时间倒序排列。</p>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : posts.length ? (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <LocalPostCard
              favorited
              index={index}
              key={post.id}
              liked={Boolean(userId && post.liked_by.includes(userId))}
              onFavorite={() => removeFavorite(post.id)}
              onLike={() => handleLike(post.id)}
              onEmotion={(reaction) => handleLike(post.id, reaction)}
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-card p-8 text-center">
          <p className="text-h2 text-white">还没有收藏</p>
          <p className="mt-3 text-body text-muted">看到戳你的吐槽，点右上角收藏就会出现在这里。</p>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function optimistic(posts: LocalPost[], postId: string, userId: string) {
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
