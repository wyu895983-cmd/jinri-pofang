"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getLevelInfo } from "@/lib/levels";
import { getLeaderboard, LocalPost, LocalUser } from "@/lib/storage";

export default function LeaderboardPage() {
  const [topLiked, setTopLiked] = useState<LocalPost[]>([]);
  const [topCommented, setTopCommented] = useState<LocalPost[]>([]);
  const [topUsers, setTopUsers] = useState<LocalUser[]>([]);

  async function refresh() {
    const data = await getLeaderboard();
    setTopLiked(data.topLiked);
    setTopCommented(data.topCommented);
    setTopUsers(data.topUsers);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">排行榜</p>
        <h1 className="text-h1 text-white">今天谁在互联网大杀四方</h1>
      </div>

      <RankPanel title="今日神吐槽" items={topLiked} valueKey="reaction_count" suffix="赞" />
      <RankPanel title="今日破防王" items={topCommented} valueKey="comment_count" suffix="评" />

      <section className="glass rounded-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-h2 text-white">
          <Trophy className="icon-18 text-acid" />
          我的成长榜
        </h2>
        <div className="space-y-3">
          {topUsers.length ? (
            topUsers.map((profile, index) => {
              const level = getLevelInfo(profile.exp);
              return (
                <Link className="flex items-center justify-between rounded-card bg-white/[0.04] p-4 hover:bg-white/[0.07]" href="/profile" key={profile.guest_user_id}>
                  <div>
                    <p className="text-[15px] font-semibold leading-5 text-white">
                      #{index + 1} {profile.nickname}
                    </p>
                    <p className="mt-2 text-meta text-muted">
                      Lv{level.level} · {level.title}
                    </p>
                  </div>
                  <span className="text-label text-acid">{profile.exp}</span>
                </Link>
              );
            })
          ) : (
            <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">取个名字后，你就会出现在这里。</p>
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
  title: string;
  items: LocalPost[];
  valueKey: "reaction_count" | "comment_count";
  suffix: string;
}) {
  return (
    <section className="glass rounded-card p-5">
      <h2 className="mb-4 text-h2 text-white">{title}</h2>
      <div className="space-y-3">
        {items.length ? (
          items.map((post, index) => (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              key={post.id}
            >
              <Link className={`block rounded-card border p-4 hover:bg-white/[0.07] ${rankClass(index)}`} href={`/post/${post.id}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold leading-5 text-white">
                  {rankIcon(index)} {post.nickname}
                </p>
                <span className="text-label text-acid">
                  {post[valueKey]} {suffix}
                </span>
              </div>
              <p className="line-clamp-2 text-meta text-muted">{post.content}</p>
            </Link>
            </motion.div>
          ))
        ) : (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-meta text-muted">今天还没人上榜。</p>
        )}
      </div>
    </section>
  );
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
