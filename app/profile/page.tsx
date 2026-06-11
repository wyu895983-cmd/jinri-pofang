"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark, ChevronDown, ChevronRight, Edit3, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import NicknameInput from "@/components/nickname-input";
import { RichContent } from "@/components/rich-content";
import { StatsCard } from "@/components/stats-card";
import { useI18n } from "@/lib/i18n";
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
  signOutCurrentUser,
  updateCurrentUserProfile
} from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [notifications, setNotifications] = useState<InteractionNotification[]>([]);
  const [likesExpanded, setLikesExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function confirmLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await signOutCurrentUser();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="glass rounded-card p-6 text-center">
        <BrandMark className="mx-auto h-20 w-20" />
        <h1 className="mt-5 text-h1 text-white">{t("profile.noProfileTitle")}</h1>
        <p className="mt-3 text-body text-muted">{t("profile.noProfileBody")}</p>
        <Link className="app-button mt-6 inline-flex w-full items-center justify-center bg-acid text-ink" href="/login">
          {t("profile.goLogin")}
        </Link>
      </div>
    );
  }

  const level = getLevelInfo(user.exp);
  const likeNotifications = notifications.filter((notification) => notification.type === "like");
  const commentNotifications = notifications.filter((notification) => notification.type === "comment");
  const visibleLikeNotifications = likesExpanded ? likeNotifications : likeNotifications.slice(0, 2);
  const visibleCommentNotifications = commentsExpanded ? commentNotifications : commentNotifications.slice(0, 2);
  const historyCanCollapse = posts.length > 3;
  const visibleHistoryPosts = historyCanCollapse && !historyExpanded ? posts.slice(0, 3) : posts;

  function formatNotificationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
          <h2 className="text-h2 text-white">{t("profile.notifications")}</h2>
          <span className="rounded-full border border-acid/25 bg-acid/10 px-3 py-1 text-meta text-acid">{notifications.length}</span>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-3 text-label text-acid">{t("profile.likesTitle")}</p>
            <div className="space-y-3">
              {likeNotifications.length ? (
                visibleLikeNotifications.map((notification) => (
                  <Link className="block rounded-card border border-line bg-white/[0.035] p-3 transition hover:border-acid/35" href={`/post/${notification.postId}`} key={notification.id}>
                    <p className="text-meta text-muted">{formatNotificationTime(notification.createdAt)}</p>
                    <p className="mt-2 text-body text-zinc-100">{t("profile.someoneLiked")}</p>
                    <p className="mt-1 line-clamp-2 text-meta text-muted">{preview(notification.postText)}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-card border border-line bg-white/[0.025] p-3 text-meta text-muted">{t("profile.noLikes")}</p>
              )}
            </div>
            {likeNotifications.length > 2 ? (
              <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setLikesExpanded((value) => !value)} type="button">
                {likesExpanded ? t("profile.collapse") : t("profile.expand")}
              </button>
            ) : null}
          </div>

          <div>
            <p className="mb-3 text-label text-acid">{t("profile.commentsTitle")}</p>
            <div className="space-y-3">
              {commentNotifications.length ? (
                visibleCommentNotifications.map((notification) => (
                  <Link className="block rounded-card border border-line bg-white/[0.035] p-3 transition hover:border-acid/35" href={notificationHref(notification)} key={notification.id}>
                    <p className="text-meta text-muted">{formatNotificationTime(notification.createdAt)}</p>
                    <p className="mt-2 text-body text-zinc-100">{t("profile.someoneCommented")}</p>
                    <p className="mt-1 line-clamp-2 text-meta text-muted">{preview(notification.postText)}</p>
                    {notification.commentText ? <p className="mt-2 rounded-button bg-acid/10 px-3 py-2 text-meta text-acid">{preview(notification.commentText)}</p> : null}
                  </Link>
                ))
              ) : (
                <p className="rounded-card border border-line bg-white/[0.025] p-3 text-meta text-muted">{t("profile.noComments")}</p>
              )}
            </div>
            {commentNotifications.length > 2 ? (
              <button className="mt-3 text-label text-muted transition hover:text-acid" onClick={() => setCommentsExpanded((value) => !value)} type="button">
                {commentsExpanded ? t("profile.collapse") : t("profile.expand")}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass rounded-card p-5">
        <div className="flex items-center gap-4">
          <img alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-acid/30 bg-acid/10 object-contain p-2 shadow-acid" src={user.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="text-label text-acid">{t("profile.file")}</p>
            <h1 className="mt-1 truncate text-h1 text-white">{user.nickname}</h1>
            <p className="mt-1 text-meta text-muted">
              {t("profile.levelLine", { level: level.level, title: getProfileLevelTitle(level.level, t) })}
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
              {t("profile.saveAvatar")}
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-meta text-muted">
            <span>{user.exp} EXP</span>
            <span>{level.expToNext > 0 ? t("profile.expToNext", { count: level.expToNext, level: level.nextLevel }) : t("profile.maxLevel")}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-purple via-fuchsia-500 to-acid" style={{ width: `${level.progress}%` }} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatsCard label={t("profile.totalPosts")} value={user.total_posts} />
        <StatsCard label={t("profile.totalLikes")} value={user.total_likes} />
        <StatsCard label={t("profile.favorites")} value={favoriteCount} />
        <StatsCard label={t("profile.streak")} value={`${user.login_streak} ${t("profile.days")}`} />
      </div>

      <section className="glass rounded-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h2 text-white">{t("profile.settings")}</h2>
            <p className="mt-1 text-meta text-muted">{t("language.label")}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link className="app-button flex items-center justify-center gap-2 border border-acid/35 bg-acid/10 text-acid" href="/favorites">
          <Bookmark className="h-4 w-4" />
          {t("profile.myFavorites")}
        </Link>
        <Link className="app-button flex items-center justify-center border border-acid/35 bg-acid/10 text-acid" href="/feedback">
          {t("profile.feedback")}
        </Link>
      </div>

      <section className="glass rounded-card p-5">
        <h2 className="mb-4 text-h2 text-white">{t("profile.badges")}</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["💚", t("profile.badgeFirst"), user.total_posts > 0],
            ["🔥", t("profile.badgeHeat"), user.total_likes >= 5],
            ["🌙", t("profile.badgeStreak"), user.login_streak >= 2],
            ["✍️", t("profile.badgeTalker"), posts.length >= 3],
            ["⚡", t("profile.badgeEnergy"), user.exp >= 20],
            ["🏆", t("profile.badgeGrowth"), user.exp >= 100]
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

      <section className="glass rounded-card overflow-hidden">
        <Link className="flex items-center gap-3 border-b border-line px-5 py-4 transition hover:bg-white/[0.04]" href="/profile/account">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-acid/25 bg-acid/10 text-acid">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-body text-zinc-100">{t("profile.accountSecurity")}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
        <Link className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/[0.04]" href="/profile/settings">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-acid/25 bg-acid/10 text-acid">
            <Settings className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-body text-zinc-100">{t("settings.title")}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      </section>

      <button
        className="app-button flex w-full items-center justify-center gap-2 border border-red-400/35 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"
        onClick={() => setLogoutOpen(true)}
        type="button"
      >
        <LogOut className="h-4 w-4" />
        {t("profile.logout")}
      </button>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-h2 text-white">{t("profile.history")}</h2>
          {historyCanCollapse ? (
            <button
              className="inline-flex items-center gap-1 text-label text-muted transition hover:text-acid"
              onClick={() => setHistoryExpanded((value) => !value)}
              type="button"
            >
              {historyExpanded ? t("profile.collapse") : t("profile.expand")}
              <ChevronDown className={`h-4 w-4 transition ${historyExpanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>
        <div className="space-y-4">
          {posts.length ? (
            visibleHistoryPosts.map((post) => (
              <Link className="glass block rounded-card p-5" href={`/post/${post.id}`} key={post.id}>
                <RichContent className="whitespace-pre-wrap text-body text-zinc-100" content={post.content} />
                <p className="mt-3 text-meta text-muted">
                  {post.reaction_count} {t("common.like")} · {t("post.comments", { count: post.comment_count })}
                </p>
              </Link>
            ))
          ) : (
            <div className="glass rounded-card p-8 text-center text-meta text-muted">{t("profile.emptyHistory")}</div>
          )}
        </div>
      </section>

      {logoutOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink/75 p-5 backdrop-blur-md">
          <motion.div
            className="w-full max-w-sm rounded-card border border-red-400/25 bg-panel p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h2 className="text-h2 text-white">{t("profile.logoutTitle")}</h2>
            <p className="mt-3 text-body text-muted">{t("profile.logoutBody")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="app-button border border-line text-muted hover:bg-white/5 hover:text-white"
                disabled={loggingOut}
                onClick={() => setLogoutOpen(false)}
                type="button"
              >
                {t("common.cancel")}
              </button>
              <button
                className="app-button bg-red-400 text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loggingOut}
                onClick={confirmLogout}
                type="button"
              >
                {loggingOut ? t("profile.loggingOut") : t("profile.logoutConfirm")}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function getProfileLevelTitle(level: number, t: (key: string, values?: Record<string, string | number>) => string) {
  if (level >= 100) return t("profile.levelTitle.god");
  if (level >= 50) return t("profile.levelTitle.sober");
  if (level >= 30) return t("profile.levelTitle.performer");
  if (level >= 20) return t("profile.levelTitle.mage");
  if (level >= 10) return t("profile.levelTitle.master");
  if (level >= 5) return t("profile.levelTitle.specialist");
  return t("profile.levelTitle.intern");
}
