"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { FeedSkeleton } from "@/components/skeleton";
import { useI18n } from "@/lib/i18n";
import { getLevelInfo } from "@/lib/levels";
import { getLeaderboard, getPosts, LocalPost, LocalUser } from "@/lib/storage";

type HotTab = "today" | "week" | "all";

export default function LeaderboardPage() {
  const { t } = useI18n();
  const [topLiked, setTopLiked] = useState<LocalPost[]>([]);
  const [topCommented, setTopCommented] = useState<LocalPost[]>([]);
  const [topUsers, setTopUsers] = useState<LocalUser[]>([]);
  const [allPosts, setAllPosts] = useState<LocalPost[]>([]);
  const [tab, setTab] = useState<HotTab>("today");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [data, posts] = await Promise.all([getLeaderboard(), getPosts()]);
    setTopLiked(data.topLiked);
    setTopCommented(data.topCommented);
    setTopUsers(data.topUsers);
    setAllPosts(posts);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, []);

  const hotPosts = useMemo(() => rankByHot(filterByTab(allPosts, tab)).slice(0, 8), [allPosts, tab]);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">{t("leaderboard.eyebrow")}</p>
        <h1 className="text-h1 text-white">{t("leaderboard.title")}</h1>
      </div>

      <section className="glass rounded-card p-5">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["today", t("leaderboard.today")],
            ["week", t("leaderboard.week")],
            ["all", t("leaderboard.all")]
          ].map(([value, label]) => (
            <button
              className={`app-button border ${tab === value ? "border-acid/70 bg-acid/15 text-acid shadow-acid" : "border-line bg-white/[0.04] text-muted"}`}
              key={value}
              onClick={() => setTab(value as HotTab)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? <FeedSkeleton /> : <RankPanel items={hotPosts} valueKey="score" suffix={t("leaderboard.heatSuffix")} />}
      </section>

      <RankPanel title={t("leaderboard.topLiked")} items={topLiked} valueKey="reaction_count" suffix={t("leaderboard.likesSuffix")} />
      <RankPanel title={t("leaderboard.topCommented")} items={topCommented} valueKey="comment_count" suffix={t("leaderboard.commentsSuffix")} />

      <section className="glass rounded-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-h2 text-white">
          <Trophy className="icon-18 text-acid" />
          {t("leaderboard.growth")}
        </h2>
        <div className="space-y-3">
          {topUsers.length ? (
            topUsers.map((profile, index) => {
              const level = getLevelInfo(profile.exp);
              return (
                <Link className="flex items-center justify-between rounded-card bg-white/[0.04] p-4 hover:bg-white/[0.07]" href="/profile" key={profile.guest_user_id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <img alt="" className="h-10 w-10 rounded-2xl border border-acid/20 bg-acid/10 object-contain p-1" src={profile.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-5 text-white">
                        #{index + 1} {profile.nickname}
                      </p>
                      <p className="mt-2 text-meta text-muted">
                        Lv{level.level} · {level.title}
                      </p>
                    </div>
                  </div>
                  <span className="text-label text-acid">{profile.exp}</span>
                </Link>
              );
            })
          ) : (
            <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">{t("leaderboard.emptyUsers")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RankPanel({
  title,
  items,
  valueKey,
  suffix
}: {
  title?: string;
  items: Array<LocalPost & { score?: number }>;
  valueKey: "reaction_count" | "comment_count" | "score";
  suffix: string;
}) {
  const { t } = useI18n();
  return (
    <section className={title ? "glass rounded-card p-5" : ""}>
      {title ? <h2 className="mb-4 text-h2 text-white">{title}</h2> : null}
      <div className="space-y-3">
        {items.length ? (
          items.map((post, index) => (
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: index * 0.05 }} key={post.id}>
              <Link className={`block rounded-card border p-4 hover:bg-white/[0.07] ${rankClass(index)}`} href={`/post/${post.id}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-[15px] font-semibold leading-5 text-white">
                    {rankIcon(index)} {post.nickname}
                  </p>
                  <span className="shrink-0 text-label text-acid">
                    {post[valueKey] ?? 0} {suffix}
                  </span>
                </div>
                <p className="line-clamp-2 text-meta text-muted">{post.content}</p>
              </Link>
            </motion.div>
          ))
        ) : (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">{t("leaderboard.emptyRank")}</p>
        )}
      </div>
    </section>
  );
}

function filterByTab(posts: LocalPost[], tab: HotTab) {
  const now = Date.now();
  const maxAge = tab === "today" ? 24 * 60 * 60 * 1000 : tab === "week" ? 7 * 24 * 60 * 60 * 1000 : Infinity;
  return posts.filter((post) => now - Date.parse(post.created_at) <= maxAge);
}

function rankByHot(posts: LocalPost[]) {
  return [...posts]
    .map((post) => ({ ...post, score: post.reaction_count * 2 + post.comment_count * 3 }))
    .sort((a, b) => b.score - a.score);
}

function rankIcon(index: number) {
  if (index === 0) return "🏆";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

function rankClass(index: number) {
  if (index === 0) return "border-yellow-300/45 bg-yellow-300/[0.09] shadow-[0_0_24px_rgba(250,204,21,0.18)]";
  if (index === 1) return "border-zinc-300/35 bg-zinc-300/[0.075] shadow-[0_0_20px_rgba(212,212,216,0.12)]";
  if (index === 2) return "border-orange-300/35 bg-orange-300/[0.075] shadow-[0_0_20px_rgba(253,186,116,0.12)]";
  return "border-line bg-white/[0.04]";
}
