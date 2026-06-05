"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { FeedSkeleton } from "@/components/skeleton";
import { LocalPostCard } from "@/components/local-post-card";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser, isFavorite, likePost, LocalPost, searchCommunity, toggleFavorite } from "@/lib/storage";

export default function SearchPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalPost[]>([]);
  const userId = getCurrentUser()?.guest_user_id ?? null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setResults(await searchCommunity(query));
    setLoading(false);
  }

  async function react(postId: string, reaction = "like") {
    if (!userId) return;
    setResults((value) => optimistic(value, postId, userId));
    try {
      await likePost(postId, reaction);
    } catch {
      setResults(await searchCommunity(query));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">{t("search.eyebrow")}</p>
        <h1 className="text-h1 text-white">{t("search.title")}</h1>
      </div>
      <form className="glass flex gap-2 rounded-card p-3" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 bg-transparent px-2 text-body text-white outline-none placeholder:text-zinc-600"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search.placeholder")}
          value={query}
        />
        <button className="app-button bg-acid px-4 text-ink" type="submit">
          <Search className="h-4 w-4" />
        </button>
      </form>

      {loading ? (
        <FeedSkeleton />
      ) : !searched ? (
        <div className="glass rounded-card p-8 text-center text-meta text-muted">{t("search.initial")}</div>
      ) : results.length ? (
        <div className="space-y-4">
          {results.map((post, index) => (
            <LocalPostCard
              favorited={isFavorite(post.id)}
              index={index}
              key={post.id}
              liked={Boolean(userId && post.liked_by.includes(userId))}
              onFavorite={() => toggleFavorite(post.id)}
              onLike={() => react(post.id)}
              onEmotion={(reaction) => react(post.id, reaction)}
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-card p-8 text-center">
          <p className="text-h2 text-white">{t("search.emptyTitle")}</p>
          <p className="mt-3 text-body text-muted">{t("search.emptyBody")}</p>
        </div>
      )}
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
