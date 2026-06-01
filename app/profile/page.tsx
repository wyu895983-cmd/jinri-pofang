"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark, Edit3 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { BrandMark } from "@/components/brand-mark";
import { RichContent } from "@/components/rich-content";
import { StatsCard } from "@/components/stats-card";
import { getLevelInfo } from "@/lib/levels";
import { getFavorites, getPosts, LocalPost, LocalUser, refreshCurrentUser, signOutLocalUser, updateCurrentUserProfile } from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [favoriteCount, setFavoriteCount] = useState(0);

  async function refresh() {
    const current = await refreshCurrentUser();
    setUser(current);
    setNickname(current?.nickname ?? "");
    setAvatar(current?.avatar_url ?? "");
    setFavoriteCount(getFavorites().length);
    setPosts(current ? (await getPosts()).filter((post) => post.user_id === current.guest_user_id) : []);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("pofang:storage-change", refresh);
    return () => window.removeEventListener("pofang:storage-change", refresh);
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = await updateCurrentUserProfile({ nickname, avatar_url: avatar });
    setUser(next);
    setEditing(false);
  }

  if (!user) {
    return (
      <div className="glass rounded-card p-6 text-center">
        <BrandMark className="mx-auto h-20 w-20" />
        <h1 className="mt-5 text-h1 text-white">还没有 PoPo 档案</h1>
        <p className="mt-3 text-body text-muted">取个名字才能留下你的破防痕迹。</p>
        <Link className="app-button mt-6 inline-flex w-full items-center justify-center bg-acid text-ink" href="/login">
          去取名字
        </Link>
      </div>
    );
  }

  const level = getLevelInfo(user.exp);

  return (
    <div className="space-y-5">
      <section className="glass rounded-card p-5">
        <div className="flex items-center gap-4">
          <img alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-acid/30 bg-acid/10 object-contain p-2 shadow-acid" src={user.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="text-label text-acid">我的 PoPo 档案</p>
            <h1 className="mt-1 truncate text-h1 text-white">{user.nickname}</h1>
            <p className="mt-1 text-meta text-muted">
              Lv{level.level} · {level.title}
            </p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-2xl border border-line text-muted" onClick={() => setEditing((value) => !value)} type="button">
            <Edit3 className="h-4 w-4" />
          </button>
        </div>

        {editing ? (
          <form className="mt-5 space-y-4" onSubmit={saveProfile}>
            <input
              className="h-11 w-full rounded-button border border-line bg-ink/70 px-4 text-body text-white outline-none focus:border-acid"
              maxLength={12}
              onChange={(event) => setNickname(event.target.value)}
              value={nickname}
            />
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
            <button className="app-button w-full bg-acid text-ink">保存资料</button>
          </form>
        ) : null}

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-meta text-muted">
            <span>{user.exp} EXP</span>
            <span>{level.expToNext > 0 ? `还差 ${level.expToNext} EXP 升 Lv${level.nextLevel}` : "已到最高等级"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-purple via-fuchsia-500 to-acid" style={{ width: `${level.progress}%` }} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatsCard label="总发帖" value={user.total_posts} />
        <StatsCard label="总获赞" value={user.total_likes} />
        <StatsCard label="收藏" value={favoriteCount} />
        <StatsCard label="连续登录" value={`${user.login_streak} 天`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link className="app-button flex items-center justify-center gap-2 border border-acid/35 bg-acid/10 text-acid" href="/favorites">
          <Bookmark className="h-4 w-4" />
          我的收藏
        </Link>
        <Link className="app-button flex items-center justify-center border border-acid/35 bg-acid/10 text-acid" href="/feedback">
          意见反馈
        </Link>
      </div>

      <section className="glass rounded-card p-5">
        <h2 className="mb-4 text-h2 text-white">徽章墙</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["💚", "初次破防", user.total_posts > 0],
            ["🔥", "热度体质", user.total_likes >= 5],
            ["🌙", "连续登录", user.login_streak >= 2],
            ["✍️", "吐槽选手", posts.length >= 3],
            ["⚡", "怨气充能", user.exp >= 20],
            ["🏆", "PoPo 成长", user.exp >= 100]
          ].map(([icon, label, active]) => (
            <motion.div
              className={`rounded-card border p-3 text-center ${active ? "border-acid/40 bg-acid/10 shadow-acid" : "border-line bg-white/[0.035] opacity-55"}`}
              key={String(label)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              animate={active ? { filter: ["brightness(1)", "brightness(1.18)", "brightness(1)"] } : undefined}
              transition={{ duration: 1.8, repeat: active ? Infinity : 0 }}
            >
              <p className="text-2xl">{icon}</p>
              <p className="mt-2 text-label text-zinc-100">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <button
        className="app-button w-full border border-line text-muted hover:bg-white/5 hover:text-white"
        onClick={() => {
          signOutLocalUser();
          router.push("/login");
        }}
        type="button"
      >
        换个昵称
      </button>

      <section>
        <h2 className="mb-4 text-h2 text-white">历史吐槽</h2>
        <div className="space-y-4">
          {posts.length ? (
            posts.map((post) => (
              <Link className="glass block rounded-card p-5" href={`/post/${post.id}`} key={post.id}>
                <RichContent className="whitespace-pre-wrap text-body text-zinc-100" content={post.content} />
                <p className="mt-3 text-meta text-muted">
                  {post.reaction_count} 赞 · {post.comment_count} 评论
                </p>
              </Link>
            ))
          ) : (
            <div className="glass rounded-card p-8 text-center text-meta text-muted">你还没有发布过吐槽。</div>
          )}
        </div>
      </section>
    </div>
  );
}
