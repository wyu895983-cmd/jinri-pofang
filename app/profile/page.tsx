"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark, Edit3 } from "lucide-react";
import { useEffect, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { BrandMark } from "@/components/brand-mark";
import NicknameInput from "@/components/nickname-input";
import { RichContent } from "@/components/rich-content";
import { StatsCard } from "@/components/stats-card";
import { getLevelInfo } from "@/lib/levels";
import {
  getFavorites,
  getNotifications,
  getPosts,
  InteractionNotification,
  LocalPost,
  LocalUser,
  getCurrentUser,
  markNotificationsRead,
  refreshCurrentUser,
  signOutLocalUser,
  updateCurrentUserProfile
} from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [notifications, setNotifications] = useState<InteractionNotification[]>([]);
  const [likesExpanded, setLikesExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  async function refresh(markRead = false) {
    const cached = getCurrentUser();
    if (cached) {
      setUser(cached);
      setNickname(cached.nickname);
      setAvatar(cached.avatar_url);
    }

    const current = await refreshCurrentUser();
    setUser(current);
    setNickname(current?.nickname ?? "");
    setAvatar(current?.avatar_url ?? "");
    setFavoriteCount(getFavorites().length);
    if (!current) {
      setNotifications([]);
      setPosts([]);
      return;
    }

    const [nextNotifications, nextPosts] = await Promise.all([markRead ? markNotificationsRead() : getNotifications(), getPosts()]);
    setNotifications(nextNotifications);
    setPosts(nextPosts.filter((post) => post.user_id === current.guest_user_id));
  }

  useEffect(() => {
    let active = true;
    let listening = false;
    const refreshFromStorage = () => {
      if (active) void refresh();
    };

    async function load() {
      await refresh(true);
      if (!active) return;
      window.addEventListener("pofang:storage-change", refreshFromStorage);
      listening = true;
    }

    void load();
    return () => {
      active = false;
      if (listening) window.removeEventListener("pofang:storage-change", refreshFromStorage);
    };
  }, []);

  async function saveAvatar() {
    const next = await updateCurrentUserProfile({ avatar_url: avatar });
    setUser(next);
    setNickname(next?.nickname ?? nickname);
    setAvatar(next?.avatar_url ?? avatar);
    setEditing(false);
  }

  async function handleNicknameSaved(next: LocalUser | null) {
    if (next) {
      setUser(next);
      setNickname(next.nickname);
      setAvatar(next.avatar_url);
    }
    await refresh();
  }

  async function selectAvatar(nextAvatar: string) {
    setAvatar(nextAvatar);
    const next = await updateCurrentUserProfile({ avatar_url: nextAvatar });
    if (next) setUser(next);
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
  const likeNotifications = notifications.filter((notification) => notification.type === "like");
  const commentNotifications = notifications.filter((notification) => notification.type === "comment");
  const visibleLikeNotifications = likesExpanded ? likeNotifications : likeNotifications.slice(0, 2);
  const visibleCommentNotifications = commentsExpanded ? commentNotifications : commentNotifications.slice(0, 2);

  function formatNotificationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function preview(text: string) {
    return text.length > 42 ? `${text.slice(0, 42)}...` : text;
  }

  function notificationHref(notification: InteractionNotification) {
    if (notification.type === "comment" && notification.commentId) {
      return `/post/${notification.postId}#comment-${notification.commentId}`;
    }

    return `/post/${notification.postId}`;
  }

  return (
    <div className="space-y-5">
      <section className="glass rounded-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h2 text-white">收到的互动</h2>
          <span className="rounded-full border border-acid/25 bg-acid/10 px-3 py-1 text-meta text-acid">{notifications.length}</span>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-3 text-label text-acid">点赞了你的吐槽</p>
            <div className="space-y-3">
              {likeNotifications.length ? (
                visibleLikeNotifications.map((notification) => (
                  <Link className="block rounded-card border border-line bg-white/[0.035] p-3 transition hover:border-acid/35" href={`/post/${notification.postId}`} key={notification.id}>
                    <p className="text-meta text-muted">{formatNotificationTime(notification.createdAt)}</p>
                    <p className="mt-2 text-body text-zinc-100">有人点赞了你的吐槽</p>
                    <p className="mt-1 line-clamp-2 text-meta text-muted">{preview(notification.postText)}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-card border border-line bg-white/[0.025] p-3 text-meta text-muted">暂时还没有点赞提醒。</p>
              )}
            </div>
            {likeNotifications.length > 2 ? (
              <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setLikesExpanded((value) => !value)} type="button">
                {likesExpanded ? "收起" : "展开更多"}
              </button>
            ) : null}
          </div>

          <div>
            <p className="mb-3 text-label text-acid">评论了你的吐槽</p>
            <div className="space-y-3">
              {commentNotifications.length ? (
                visibleCommentNotifications.map((notification) => (
                  <Link className="block rounded-card border border-line bg-white/[0.035] p-3 transition hover:border-acid/35" href={notificationHref(notification)} key={notification.id}>
                    <p className="text-meta text-muted">{formatNotificationTime(notification.createdAt)}</p>
                    <p className="mt-2 text-body text-zinc-100">有人评论了你的吐槽</p>
                    <p className="mt-1 line-clamp-2 text-meta text-muted">{preview(notification.postText)}</p>
                    {notification.commentText ? <p className="mt-2 rounded-button bg-acid/10 px-3 py-2 text-meta text-acid">{preview(notification.commentText)}</p> : null}
                  </Link>
                ))
              ) : (
                <p className="rounded-card border border-line bg-white/[0.025] p-3 text-meta text-muted">暂时还没有评论提醒。</p>
              )}
            </div>
            {commentNotifications.length > 2 ? (
              <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setCommentsExpanded((value) => !value)} type="button">
                {commentsExpanded ? "收起" : "展开更多"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

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
          <div className="mt-5 space-y-4">
            <NicknameInput onSaved={handleNicknameSaved} />
            <AvatarPicker selected={avatar} onSelect={selectAvatar} />
            <button className="app-button w-full bg-acid text-ink" onClick={saveAvatar} type="button">
              保存头像
            </button>
          </div>
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
