"use client";

import { normalizePostAuthor, type PostAuthor } from "@/components/post-author";
import { HOME_COPY_POOL } from "@/lib/copy-pool";
import { createAiAvatarFallback, pickAiColdStartPosts } from "@/lib/ai-bots";
import { removeCommentBranch } from "@/lib/comment-thread";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

export type LocalUser = {
  guest_user_id: string;
  id?: string;
  user_id?: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
  last_login_date: string;
  login_streak: number;
  exp: number;
  energy: number;
  total_posts: number;
  total_likes: number;
  is_admin?: boolean;
  language?: string | null;
};

export type FavoriteRecord = {
  post_id: string;
  created_at: string;
};

export type LocalPost = {
  id: string;
  user_id: string;
  author_id?: string;
  userId?: string;
  nickname: string;
  avatar_url: string;
  author: PostAuthor;
  content: string;
  sticker_id?: string | null;
  reaction_count: number;
  comment_count: number;
  liked_by: string[];
  created_at: string;
  updated_at?: string | null;
  is_mock?: boolean;
  is_ai_post?: boolean;
  ai_bot_id?: string | null;
  ai_display_label?: string | null;
  ai_persona_type?: string | null;
};

export type LocalComment = {
  id: string;
  post_id: string;
  parent_comment_uuid?: string | null;
  parent_comment_id?: string | null;
  root_comment_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_username?: string | null;
  parent_nickname?: string | null;
  replyToComment?: { id: string; content: string } | null;
  replyToUser?: { id?: string; nickname: string } | null;
  user_id: string;
  nickname: string;
  avatar_url: string;
  content: string;
  sticker_id?: string | null;
  like_count: number;
  liked_by: string[];
  created_at: string;
};

export type InteractionNotification = {
  id: string;
  type: "like" | "comment";
  postId: string;
  commentId?: string;
  postText: string;
  commentText?: string;
  createdAt: string;
  read: boolean;
};

const USER_KEY = "jinri-pofang:guest-user";
const POSTS_KEY = "jinri-pofang:posts";
const COMMENTS_KEY = "jinri-pofang:comments";
const FOLLOWING_KEY = "jinri-pofang:following-ids";
const FAVORITES_KEY = "jinri-pofang:favorites";
const USER_NAME_KEY = "userName";
const USER_AVATAR_KEY = "userAvatar";
const LANGUAGE_KEY = "jinri-pofang:language";
const SESSION_TOKEN_KEY = "jinri-pofang:session-token";
export const DEFAULT_AVATARS = ["/avatars/avatar1.webp", "/avatars/avatar2.webp", "/avatars/avatar3.webp", "/avatars/avatar4.webp"];
const RANDOM_NICKNAMES = ["今日路过", "普通破防人", "地铁发呆员", "还能再撑会儿", "怨气待机中", "先笑一下"];
const POST_COLUMNS = "id,user_id,content,sticker_id,reaction_count,comment_count,created_at,updated_at,is_ai_post,ai_bot_id,profiles(id,nickname,avatar_url),ai_bots(id,display_name,avatar_url,display_label)";
const LEGACY_POST_FEED_COLUMNS = "id,user_id,nickname,avatar_url,content,sticker_id,reaction_count,comment_count,created_at,updated_at";
const COMMENT_FEED_COLUMNS = "id,post_id,parent_comment_id,parent_nickname,user_id,nickname,avatar_url,content,sticker_id,like_count,created_at,updated_at,root_comment_id,reply_to_user_id,reply_to_username";
const LEGACY_COMMENT_FEED_COLUMNS = "id,post_id,user_id,nickname,avatar_url,content,sticker_id,like_count,created_at,updated_at";
const PROFILE_COLUMNS = "id,nickname,avatar_url,exp,energy,total_posts,total_likes,login_streak,created_at,last_login_date,is_admin,language";
const NOTIFICATION_COLUMNS = 'id,type,fromUserId,fromUserName,toUserId,postId,commentId,postText,commentText,createdAt,read';
let cachedUser: LocalUser | null | undefined;

const mockNicknames = ["匿名路过", "今天先忍了", "还能再撑会儿", "地铁发呆员", "情绪待机中", "普通熬夜人"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
}

function readString(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key)?.trim() ?? "";
}

function writeProfileKeys(user: Pick<LocalUser, "nickname" | "avatar_url">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_NAME_KEY, user.nickname);
  window.localStorage.setItem(USER_AVATAR_KEY, user.avatar_url || DEFAULT_AVATARS[0]);
}

function mergeProfileKeys(user: LocalUser) {
  const nickname = readString(USER_NAME_KEY).slice(0, 12);
  const avatar = readString(USER_AVATAR_KEY);

  return {
    ...user,
    nickname: nickname || user.nickname,
    avatar_url: avatar || user.avatar_url || DEFAULT_AVATARS[0]
  };
}

function saveUser(user: LocalUser) {
  const next = mergeProfileKeys(user);
  writeProfileKeys(next);
  cachedUser = next;
  writeJson(USER_KEY, next);
  return next;
}

function toUser(row: any): LocalUser {
  return {
    guest_user_id: row.id,
    nickname: row.nickname,
    avatar_url: row.avatar_url ?? DEFAULT_AVATARS[0],
    created_at: row.created_at ?? nowIso(),
    last_login_date: row.last_login_date ?? todayKey(),
    login_streak: Number(row.login_streak ?? 1),
    exp: Number(row.exp ?? 0),
    energy: Number(row.energy ?? 20),
    total_posts: Number(row.total_posts ?? 0),
    total_likes: Number(row.total_likes ?? 0),
    is_admin: Boolean(row.is_admin),
    language: row.language ?? null
  };
}

function toPost(row: any, likedBy: string[] = []): LocalPost {
  const current = getCurrentUser();
  const postUserId = row.user_id ?? row.author_id ?? row.userId ?? "";
  const isCurrentUserPost = getCurrentUserId(current) === postUserId;
  const aiBot = Array.isArray(row.ai_bots) ? row.ai_bots[0] : row.ai_bots;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const isAiPost = Boolean(row.is_ai_post);
  const humanNickname = isCurrentUserPost && current ? current.nickname : row.nickname ?? profile?.nickname ?? "匿名路过";
  const humanAvatar = isCurrentUserPost && current ? current.avatar_url : row.avatar_url ?? profile?.avatar_url ?? DEFAULT_AVATARS[0];
  const author = normalizePostAuthor({
    userId: postUserId,
    isAi: isAiPost,
    profile: { id: profile?.id ?? postUserId, nickname: humanNickname, avatarUrl: humanAvatar },
    aiBot: aiBot
      ? { id: aiBot.id, displayName: aiBot.display_name, avatarUrl: aiBot.avatar_url, displayLabel: aiBot.display_label }
      : null
  });
  return {
    id: row.id,
    user_id: postUserId,
    nickname: author.displayName,
    avatar_url: author.avatarUrl,
    author,
    content: row.content,
    sticker_id: row.sticker_id,
    reaction_count: Number(row.reaction_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    liked_by: likedBy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_ai_post: isAiPost,
    ai_bot_id: row.ai_bot_id ?? null,
    ai_display_label: author.aiLabel,
    ai_persona_type: row.ai_persona_type ?? aiBot?.persona_type ?? null
  };
}

function toComment(row: any, likedBy: string[] = []): LocalComment {
  const current = getCurrentUser();
  const isCurrentUserComment = current?.guest_user_id === row.user_id;
  const nickname = isCurrentUserComment && current ? current.nickname : row.nickname;
  const avatar = isCurrentUserComment && current ? current.avatar_url : row.avatar_url ?? DEFAULT_AVATARS[0];
  const parentCommentId = row.parent_comment_uuid ?? row.parent_comment_id ?? null;
  return {
    id: row.id,
    post_id: row.post_id,
    parent_comment_uuid: parentCommentId,
    parent_comment_id: parentCommentId,
    root_comment_id: row.root_comment_id ?? null,
    reply_to_user_id: row.reply_to_user_id ?? row.replyToUser?.id ?? null,
    reply_to_username: row.reply_to_username ?? row.replyToUser?.nickname ?? row.parent_nickname ?? null,
    parent_nickname: row.parent_nickname ?? null,
    replyToComment: row.replyToComment ?? row.reply_to_comment ?? null,
    replyToUser: row.replyToUser ?? row.reply_to_user ?? null,
    user_id: row.user_id,
    nickname,
    avatar_url: avatar,
    content: row.content,
    sticker_id: row.sticker_id,
    like_count: Number(row.like_count ?? 0),
    liked_by: likedBy,
    created_at: row.created_at
  };
}

function seedPosts(): LocalPost[] {
  const existing = readJson<LocalPost[] | null>(POSTS_KEY, null);
  if (existing) {
    return existing.map((post) =>
      post.author
        ? post
        : {
            ...post,
            author: normalizePostAuthor({
              userId: post.ai_bot_id ?? post.user_id,
              isAi: Boolean(post.is_ai_post),
              profile: { id: post.user_id, nickname: post.nickname, avatarUrl: post.avatar_url },
              aiBot: post.is_ai_post
                ? {
                    id: post.ai_bot_id ?? post.user_id,
                    displayName: post.nickname,
                    avatarUrl: post.avatar_url,
                    displayLabel: post.ai_display_label
                  }
                : null
            })
          }
    );
  }

  const mockPosts: LocalPost[] = HOME_COPY_POOL.map((content, index) => ({
    id: `mock-${index + 1}`,
    user_id: `mock-user-${index % mockNicknames.length}`,
    nickname: mockNicknames[index % mockNicknames.length],
    avatar_url: DEFAULT_AVATARS[index % DEFAULT_AVATARS.length],
    author: normalizePostAuthor({
      userId: `mock-user-${index % mockNicknames.length}`,
      isAi: false,
      profile: {
        id: `mock-user-${index % mockNicknames.length}`,
        nickname: mockNicknames[index % mockNicknames.length],
        avatarUrl: DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]
      }
    }),
    content,
    reaction_count: 8 + ((index * 13) % 180),
    comment_count: (index * 5) % 22,
    liked_by: [],
    created_at: new Date(Date.now() - (index + 1) * 9 * 60 * 1000).toISOString(),
    updated_at: null,
    is_mock: true
  }));
  const aiPosts: LocalPost[] = pickAiColdStartPosts({ existingRealPostCount: 0, usedContents: mockPosts.map((post) => post.content) }).map((post, index) => ({
    id: `mock-ai-${post.botId}-${index + 1}`,
    user_id: post.botId,
    nickname: post.bot.displayName,
    avatar_url: post.bot.avatarUrl || createAiAvatarFallback(post.bot),
    author: normalizePostAuthor({
      userId: post.botId,
      isAi: true,
      aiBot: {
        id: post.botId,
        displayName: post.bot.displayName,
        avatarUrl: post.bot.avatarUrl || createAiAvatarFallback(post.bot),
        displayLabel: post.bot.displayLabel
      }
    }),
    content: post.content,
    reaction_count: 2 + ((index * 7) % 18),
    comment_count: 0,
    liked_by: [],
    created_at: post.createdAt,
    updated_at: null,
    is_mock: true,
    is_ai_post: true,
    ai_bot_id: post.botId,
    ai_display_label: post.bot.displayLabel,
    ai_persona_type: post.personaType
  }));
  const posts = [...aiPosts, ...mockPosts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  writeJson(POSTS_KEY, posts);
  writeJson(COMMENTS_KEY, []);
  return posts;
}

function localEnterWithNickname(nickname: string) {
  const trimmed = nickname.trim().slice(0, 12);
  if (!trimmed) throw new Error("请输入昵称");
  const existing = readJson<LocalUser | null>(USER_KEY, null);
  const savedAvatar = readString(USER_AVATAR_KEY);
  if (typeof window !== "undefined") window.localStorage.setItem(USER_NAME_KEY, trimmed);
  return saveUser({
    guest_user_id: existing?.guest_user_id ?? uuid(),
    nickname: trimmed,
    avatar_url: savedAvatar || existing?.avatar_url || DEFAULT_AVATARS[0],
    created_at: existing?.created_at ?? nowIso(),
    last_login_date: todayKey(),
    login_streak: existing?.last_login_date === todayKey() ? existing.login_streak : (existing?.login_streak ?? 0) + 1,
    exp: existing?.last_login_date === todayKey() ? existing.exp : (existing?.exp ?? 0) + 5,
    energy: existing?.last_login_date === todayKey() ? existing.energy : 20,
    total_posts: existing?.total_posts ?? 0,
    total_likes: existing?.total_likes ?? 0
  });
}

export function getCurrentUser() {
  const user = cachedUser !== undefined ? cachedUser : readJson<LocalUser | null>(USER_KEY, null);
  if (!user) {
    cachedUser = null;
    return null;
  }
  const next = mergeProfileKeys(user);
  if (next.nickname !== user.nickname || next.avatar_url !== user.avatar_url) {
    saveUser(next);
  }
  cachedUser = next;
  return next;
}

export function getCurrentUserId(user = getCurrentUser()) {
  return user?.guest_user_id ?? user?.id ?? user?.user_id ?? null;
}

export function getPostAuthorId(post: LocalPost) {
  return post.user_id ?? post.author_id ?? post.userId ?? null;
}

export function getRandomNickname() {
  return `${RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)]}${Math.floor(100 + Math.random() * 900)}`;
}

export async function updateCurrentUserProfile(input: { nickname?: string; avatar_url?: string }) {
  const user = getCurrentUser();
  const nickname = input.nickname?.trim().slice(0, 12);
  const avatar = input.avatar_url || readString(USER_AVATAR_KEY) || DEFAULT_AVATARS[0];

  if (typeof window !== "undefined") {
    if (nickname) window.localStorage.setItem(USER_NAME_KEY, nickname);
    if (avatar) window.localStorage.setItem(USER_AVATAR_KEY, avatar);
  }

  if (!user) {
    window.dispatchEvent(new CustomEvent("pofang:storage-change"));
    return null;
  }

  const next = saveUser({
    ...user,
    nickname: nickname || user.nickname,
    avatar_url: avatar || user.avatar_url || DEFAULT_AVATARS[0]
  });

  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("update_profile", {
        profile_uuid: next.guest_user_id,
        raw_nickname: next.nickname,
        raw_avatar_url: next.avatar_url
      });
      if (error) throw error;
      if (data) return saveUser(toUser(data));
    } catch {
      // Local profile preferences still apply even if remote profile update is unavailable.
    }
  }

  return next;
}

export async function syncLanguagePreference(language: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_KEY, language);

  const user = getCurrentUser();
  if (user) saveUser({ ...user, language });
  if (!user || !isSupabaseBrowserConfigured()) return;

  try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("update_profile_language", {
      next_language: language,
      profile_uuid: user.guest_user_id
    });
    if (error) throw error;
  } catch {
    // Some existing databases may not have the optional language column yet.
  }
}

export async function fetchRemoteLanguagePreference() {
  const user = getCurrentUser();
  if (!user) return null;
  if (!isSupabaseBrowserConfigured()) return normalizeStoredLanguage(user.language);

  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("profiles").select("language").eq("id", user.guest_user_id).single();
    if (error) throw error;
    return normalizeStoredLanguage(data?.language ?? user.language);
  } catch {
    return normalizeStoredLanguage(user.language);
  }
}

function normalizeStoredLanguage(language: unknown) {
  return typeof language === "string" && ["zh-CN", "ja", "ko", "en"].includes(language) ? language : null;
}

export function getFavorites() {
  return readJson<FavoriteRecord[]>(FAVORITES_KEY, []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function isFavorite(postId: string) {
  return getFavorites().some((favorite) => favorite.post_id === postId);
}

export function toggleFavorite(postId: string) {
  const favorites = getFavorites();
  const exists = favorites.some((favorite) => favorite.post_id === postId);
  const next = exists ? favorites.filter((favorite) => favorite.post_id !== postId) : [{ post_id: postId, created_at: nowIso() }, ...favorites];
  writeJson(FAVORITES_KEY, next);
  return !exists;
}

export async function getFavoritePosts() {
  const favorites = getFavorites();
  const posts = await getPosts();
  const byId = new Map(posts.map((post) => [post.id, post]));
  return favorites.map((favorite) => byId.get(favorite.post_id)).filter(Boolean) as LocalPost[];
}

export async function searchCommunity(query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const posts = await getPosts();
  return posts.filter((post) => post.content.toLowerCase().includes(term) || post.nickname.toLowerCase().includes(term));
}

export async function getNotifications() {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return [];

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("toUserId", user.guest_user_id)
    .order("createdAt", { ascending: false })
    .limit(80);

  if (error) return [];
  return (data ?? []) as InteractionNotification[];
}

export async function hasUnreadNotifications() {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return false;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("toUserId", user.guest_user_id)
    .eq("read", false)
    .limit(1);

  if (error) return false;
  return Boolean(data?.length);
}

export async function markNotificationsRead() {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return [];

  const supabase = createSupabaseBrowserClient();
  await supabase.from("notifications").update({ read: true }).eq("toUserId", user.guest_user_id).eq("read", false);
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
  return getNotifications();
}

export function subscribeToNotifications(onInsert: () => void) {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return () => undefined;

  const supabase = createSupabaseBrowserClient();
  const channel = supabase
    .channel(`notifications:${user.guest_user_id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `toUserId=eq.${user.guest_user_id}`
      },
      onInsert
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToPostFeed(onChange: () => void) {
  if (!isSupabaseBrowserConfigured()) return () => undefined;

  const supabase = createSupabaseBrowserClient();
  const channel = supabase
    .channel("post-feed")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts"
      },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToPost(postId: string, onChange: () => void) {
  if (!isSupabaseBrowserConfigured() || postId.startsWith("mock-")) return () => undefined;

  const supabase = createSupabaseBrowserClient();
  const channel = supabase
    .channel(`post:${postId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `id=eq.${postId}`
      },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToComments(postId: string, onChange: () => void) {
  if (!isSupabaseBrowserConfigured() || postId.startsWith("mock-")) return () => undefined;

  const supabase = createSupabaseBrowserClient();
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `post_id=eq.${postId}`
      },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export async function enterWithNickname(nickname: string, passphrase = "") {
  const trimmed = nickname.trim().slice(0, 12);
  if (!trimmed) throw new Error("请输入昵称");
  if (!passphrase.trim() || passphrase.trim().length < 4) throw new Error("请输入至少 4 位口令");
  if (typeof window !== "undefined") window.localStorage.setItem(USER_NAME_KEY, trimmed);

  if (!isSupabaseBrowserConfigured()) return localEnterWithNickname(trimmed);

  const supabase = createSupabaseBrowserClient();
  const credentials = {
    raw_nickname: trimmed,
    raw_passphrase: passphrase
  };
  const { data, error } = await supabase.rpc("login_or_create_profile_session", credentials);

  if (!error && data && typeof data === "object" && "profile" in data && "session_token" in data) {
    const payload = data as { profile: unknown; session_token: string };
    window.localStorage.setItem(SESSION_TOKEN_KEY, payload.session_token);
    return saveUser(toUser(payload.profile));
  }

  if (error && !["PGRST202", "42883"].includes(error.code ?? "")) throw error;

  const { data: legacyData, error: legacyError } = await supabase.rpc("login_or_create_profile", credentials);
  if (legacyError) throw legacyError;
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  return saveUser(toUser(legacyData));
}

export function signOutLocalUser() {
  cachedUser = null;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
}

export async function signOutCurrentUser() {
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionToken = getSessionToken();
      if (sessionToken) await supabase.rpc("revoke_profile_session", { session_token: sessionToken });
      await supabase.auth.signOut();
    } catch {
      // Local sign-out should still complete if Supabase Auth is unavailable.
    }
  }

  signOutLocalUser();
}

export async function getFollowingIds() {
  const user = getCurrentUser();
  if (!user) return [];
  if (isSupabaseBrowserConfigured()) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", user.guest_user_id);
    if (error) throw error;
    return [...new Set((data ?? []).map((row: { following_id: string }) => row.following_id))];
  }
  return readJson<string[]>(FOLLOWING_KEY, []);
}

export async function getFollowState(targetProfileId: string) {
  return (await getFollowingIds()).includes(targetProfileId);
}

export async function getFollowCounts(profileId: string) {
  if (isSupabaseBrowserConfigured()) {
    const supabase = createSupabaseBrowserClient();
    const [{ count: followingCount, error: followingError }, { count: followerCount, error: followerError }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId)
    ]);
    if (followingError) throw followingError;
    if (followerError) throw followerError;
    return { followingCount: followingCount ?? 0, followerCount: followerCount ?? 0 };
  }
  const currentId = getCurrentUserId(getCurrentUser());
  const followingCount = currentId === profileId ? readJson<string[]>(FOLLOWING_KEY, []).length : 0;
  return { followingCount, followerCount: 0 };
}

export async function getPublicProfile(profileId: string) {
  const posts = (await getPosts()).filter((post) => post.user_id === profileId);
  let profile: LocalUser | null = null;
  if (isSupabaseBrowserConfigured()) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", profileId).maybeSingle();
    if (error) throw error;
    if (data) profile = toUser(data);
  } else {
    const current = getCurrentUser();
    if (getCurrentUserId(current) === profileId) profile = current;
    else if (posts[0]) profile = {
      guest_user_id: profileId,
      nickname: posts[0].nickname,
      avatar_url: posts[0].avatar_url,
      created_at: posts[0].created_at,
      last_login_date: posts[0].created_at.slice(0, 10),
      login_streak: 0,
      exp: 0,
      energy: 0,
      total_posts: posts.length,
      total_likes: posts.reduce((sum, post) => sum + post.reaction_count, 0)
    };
  }
  if (!profile) return null;
  const [{ followingCount, followerCount }, isFollowing] = await Promise.all([getFollowCounts(profileId), getFollowState(profileId)]);
  return { profile, posts, followingCount, followerCount, isFollowing };
}

export async function followProfile(targetProfileId: string) {
  const user = getCurrentUser();
  if (!user) throw new Error("PROFILE_SESSION_REQUIRED");
  if (user.guest_user_id === targetProfileId) throw new Error("FOLLOW_SELF_FORBIDDEN");
  if (isSupabaseBrowserConfigured()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("PROFILE_SESSION_REQUIRED");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("follow_profile", { session_token: sessionToken, target_profile_id: targetProfileId });
    if (error) throw new Error(getErrorMessage(error));
  } else {
    writeJson(FOLLOWING_KEY, [...new Set([...readJson<string[]>(FOLLOWING_KEY, []), targetProfileId])]);
  }
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
  return true;
}

export async function unfollowProfile(targetProfileId: string) {
  if (isSupabaseBrowserConfigured()) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("PROFILE_SESSION_REQUIRED");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("unfollow_profile", { session_token: sessionToken, target_profile_id: targetProfileId });
    if (error) throw new Error(getErrorMessage(error));
  } else {
    writeJson(FOLLOWING_KEY, readJson<string[]>(FOLLOWING_KEY, []).filter((id) => id !== targetProfileId));
  }
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
  return true;
}

export async function getFollowingPosts() {
  const [posts, followingIds] = await Promise.all([getPosts(), getFollowingIds()]);
  const followed = new Set(followingIds);
  return posts.filter((post) => followed.has(post.user_id));
}

export async function getPosts() {
  const user = getCurrentUser();

  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const [{ rows, error }, { data: reactions }] = await Promise.all([
        fetchPostRows(supabase),
        user
          ? supabase.from("reactions").select("post_id").eq("user_id", user.guest_user_id).not("post_id", "is", null)
          : Promise.resolve({ data: [] })
      ]);
      if (error) throw error;
      const liked = new Set((reactions ?? []).map((reaction: any) => reaction.post_id));
      return (rows ?? []).map((row: any) => toPost(row, liked.has(row.id) && user ? [user.guest_user_id] : []));
    } catch {
      return seedPosts().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
  }

  return seedPosts().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getPost(postId: string) {
  const user = getCurrentUser();

  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    try {
      const supabase = createSupabaseBrowserClient();
      const [{ row, error }, { data: reactions }] = await Promise.all([
        fetchPostRow(supabase, postId),
        user
          ? supabase.from("reactions").select("post_id").eq("user_id", user.guest_user_id).eq("post_id", postId).limit(1)
          : Promise.resolve({ data: [] })
      ]);
      if (error) throw error;
      return row ? toPost(row, reactions?.length && user ? [user.guest_user_id] : []) : null;
    } catch {
      // Fall back to the feed path for local/mock data or transient query failures.
    }
  }

  const posts = await getPosts();
  return posts.find((post) => post.id === postId) ?? null;
}

export async function createPost(content: string) {
  const user = getCurrentUser();
  if (!user) throw new Error("取个名字才能留下你的破防痕迹。");

  if (isSupabaseBrowserConfigured()) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("create_post", {
      profile_uuid: user.guest_user_id,
      post_content: content,
      post_sticker_id: null
    });
    if (error) throw error;
    await refreshCurrentUser();
    return toPost({ ...data, nickname: user.nickname, avatar_url: user.avatar_url }, []);
  }

  if (user.energy <= 0) throw new Error("今日怨气值空了，明天再来破防。");
  const posts = seedPosts();
  const post: LocalPost = {
    id: uuid(),
    user_id: user.guest_user_id,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    author: normalizePostAuthor({
      userId: user.guest_user_id,
      isAi: false,
      profile: { id: user.guest_user_id, nickname: user.nickname, avatarUrl: user.avatar_url }
    }),
    content: content.trim(),
    reaction_count: 0,
    comment_count: 0,
    liked_by: [],
    created_at: nowIso(),
    updated_at: null
  };
  writeJson(POSTS_KEY, [post, ...posts]);
  saveUser({ ...user, energy: Math.max(user.energy - 1, 0), exp: user.exp + 2, total_posts: user.total_posts + 1 });
  return post;
}

async function fetchPostRows(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).order("created_at", { ascending: false }).limit(80);
  if (!error) return { rows: data ?? [], error: null };

  const legacy = await supabase.from("post_feed").select(LEGACY_POST_FEED_COLUMNS).order("created_at", { ascending: false }).limit(80);
  return { rows: legacy.data ?? [], error: legacy.error };
}

async function fetchPostRow(supabase: ReturnType<typeof createSupabaseBrowserClient>, postId: string) {
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).eq("id", postId).single();
  if (!error) return { row: data, error: null };

  const legacy = await supabase.from("post_feed").select(LEGACY_POST_FEED_COLUMNS).eq("id", postId).single();
  return { row: legacy.data, error: legacy.error };
}

export async function deletePost(postId: string) {
  const user = getCurrentUser();
  const userId = getCurrentUserId(user);
  if (!userId) throw new Error("请先登录");

  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("delete_post", {
      profile_uuid: userId,
      post_uuid: postId
    });
    if (error) throw error;
  } else {
    writeJson(
      POSTS_KEY,
      seedPosts().filter((post) => post.id !== postId)
    );
  }

  writeJson(
    FAVORITES_KEY,
    getFavorites().filter((favorite) => favorite.post_id !== postId)
  );
}

export async function likePost(postId: string, reaction = "like") {
  const user = getCurrentUser();
  if (!user) throw new Error("取个名字才能留下你的破防痕迹。");

  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("react_to_post", {
      profile_uuid: user.guest_user_id,
      post_uuid: postId,
      reaction_name: reaction
    });
    if (error) throw error;
    await refreshCurrentUser();
    return true;
  }

  const posts = seedPosts();
  let liked = false;
  writeJson(
    POSTS_KEY,
    posts.map((post) => {
      if (post.id !== postId) return post;
      liked = !post.liked_by.includes(user.guest_user_id);
      return {
        ...post,
        liked_by: liked ? [...post.liked_by, user.guest_user_id] : post.liked_by.filter((id) => id !== user.guest_user_id),
        reaction_count: Math.max(0, post.reaction_count + (liked ? 1 : -1))
      };
    })
  );
  return liked;
}

export async function getComments(postId: string) {
  const user = getCurrentUser();

  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: rows, error } = await supabase
        .from("comment_feed")
        .select(COMMENT_FEED_COLUMNS)
        .eq("post_id", postId)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false });
      let nextRows: any[] | null = rows;
      if (error) {
        const { data: legacyRows, error: legacyError } = await supabase
          .from("comment_feed")
          .select(LEGACY_COMMENT_FEED_COLUMNS)
          .eq("post_id", postId)
          .order("like_count", { ascending: false })
          .order("created_at", { ascending: false });
        if (legacyError) throw legacyError;
        nextRows = legacyRows;
      }
      const { data: relationshipRows } = await supabase
        .from("comments")
        .select("id,parent_comment_id,root_comment_id,reply_to_user_id,reply_to_username,user_id,content")
        .eq("post_id", postId);
      const relationshipsById = new Map((relationshipRows ?? []).map((row: any) => [row.id, row]));
      const feedById = new Map((nextRows ?? []).map((row: any) => [row.id, row]));
      nextRows = (nextRows ?? []).map((row: any) => {
        const relationship = relationshipsById.get(row.id);
        const parentCommentId = row.parent_comment_id ?? relationship?.parent_comment_id ?? null;
        const parent = parentCommentId ? feedById.get(parentCommentId) ?? relationshipsById.get(parentCommentId) : null;
        return {
          ...row,
          parent_comment_id: parentCommentId,
          root_comment_id: row.root_comment_id ?? relationship?.root_comment_id ?? parent?.root_comment_id ?? parentCommentId,
          reply_to_user_id: row.reply_to_user_id ?? relationship?.reply_to_user_id ?? parent?.user_id ?? null,
          reply_to_username: row.reply_to_username ?? relationship?.reply_to_username ?? parent?.nickname ?? row.parent_nickname ?? null,
          parent_nickname: row.parent_nickname ?? parent?.nickname ?? null,
          replyToComment: parent ? { id: parent.id, content: parent.content } : null,
          replyToUser: parent ? { id: parent.user_id, nickname: parent.nickname ?? row.parent_nickname ?? "" } : null
        };
      });
      const commentIds = (nextRows ?? []).map((row: any) => row.id);
      const { data: reactions } =
        user && commentIds.length
          ? await supabase.from("reactions").select("comment_id").eq("user_id", user.guest_user_id).in("comment_id", commentIds)
          : { data: [] };
      const liked = new Set((reactions ?? []).map((reaction: any) => reaction.comment_id));
      return (nextRows ?? []).map((row: any) => toComment(row, liked.has(row.id) && user ? [user.guest_user_id] : []));
    } catch {
      return [];
    }
  }

  return sortLocalComments(readJson<LocalComment[]>(COMMENTS_KEY, []).filter((comment) => comment.post_id === postId));
}

function sortLocalComments(comments: LocalComment[]) {
  const repliesByParent = new Map<string, LocalComment[]>();
  const topComments: LocalComment[] = [];
  const byId = new Map(comments.map((comment) => [comment.id, comment]));

  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = byId.get(comment.parent_comment_id);
      const parentId = parent?.parent_comment_id ?? comment.parent_comment_id;
      repliesByParent.set(parentId, [...(repliesByParent.get(parentId) ?? []), comment]);
      return;
    }

    topComments.push(comment);
  });

  topComments.sort((a, b) => b.like_count - a.like_count || Date.parse(b.created_at) - Date.parse(a.created_at));
  repliesByParent.forEach((replies) => replies.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)));
  return topComments.flatMap((comment) => [comment, ...(repliesByParent.get(comment.id) ?? [])]);
}

export async function createComment(postId: string, content: string, parentCommentId: string | null = null) {
  const user = getCurrentUser();
  if (!user) throw new Error("取个名字才能留下你的破防痕迹。");
  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("create_comment", {
      profile_uuid: user.guest_user_id,
      post_uuid: postId,
      comment_content: content,
      comment_sticker_id: null,
      parent_comment_uuid: parentCommentId
    });
    if (error) {
      if (parentCommentId) throw new Error(`回复评论失败：${getErrorMessage(error)}`);
      const { data: legacyData, error: legacyError } = await supabase.rpc("create_comment", {
        profile_uuid: user.guest_user_id,
        post_uuid: postId,
        comment_content: content,
        comment_sticker_id: null,
        parent_comment_uuid: null
      });
      if (legacyError) throw new Error(`评论发送失败：${getErrorMessage(legacyError)}`);
      await refreshCurrentUser();
      return toComment({ ...legacyData, nickname: user.nickname, avatar_url: user.avatar_url }, []);
    }
    await refreshCurrentUser();
    return toComment({ ...data, nickname: user.nickname, avatar_url: user.avatar_url }, []);
  }

  const comments = readJson<LocalComment[]>(COMMENTS_KEY, []);
  const parentComment = parentCommentId ? comments.find((comment) => comment.id === parentCommentId) : null;
  const comment: LocalComment = {
    id: uuid(),
    post_id: postId,
    parent_comment_uuid: parentComment?.id ?? null,
    parent_comment_id: parentComment?.id ?? null,
    root_comment_id: parentComment ? parentComment.root_comment_id ?? parentComment.parent_comment_id ?? parentComment.id : null,
    reply_to_user_id: parentComment?.user_id ?? null,
    reply_to_username: parentComment?.nickname ?? null,
    parent_nickname: parentComment?.nickname ?? null,
    replyToComment: parentComment ? { id: parentComment.id, content: parentComment.content } : null,
    replyToUser: parentComment ? { id: parentComment.user_id, nickname: parentComment.nickname } : null,
    user_id: user.guest_user_id,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    content: content.trim(),
    like_count: 0,
    liked_by: [],
    created_at: nowIso()
  };
  const posts = seedPosts().map((post) => (post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post));
  writeJson(COMMENTS_KEY, [...comments, comment]);
  writeJson(POSTS_KEY, posts);
  saveUser({ ...user, exp: user.exp + 1 });
  return comment;
}

export async function deleteComment(commentId: string) {
  const user = getCurrentUser();
  if (!user) throw new Error("PROFILE_SESSION_REQUIRED");

  if (isSupabaseBrowserConfigured() && !commentId.startsWith("mock-")) {
    const sessionToken = getSessionToken();
    if (!sessionToken) throw new Error("PROFILE_SESSION_REQUIRED");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("delete_comment", {
      session_token: sessionToken,
      comment_uuid: commentId
    });
    if (error) throw new Error(getErrorMessage(error));
    return data as { comment_id: string; deleted_count: number };
  }

  const comments = readJson<LocalComment[]>(COMMENTS_KEY, []);
  if (!comments.some((comment) => comment.id === commentId)) throw new Error("COMMENT_DELETED");
  const nextComments = removeCommentBranch(comments, commentId);
  const deletedCount = comments.length - nextComments.length;
  const target = comments.find((comment) => comment.id === commentId)!;
  writeJson(COMMENTS_KEY, nextComments);
  writeJson(POSTS_KEY, seedPosts().map((post) => (
    post.id === target.post_id ? { ...post, comment_count: Math.max(0, post.comment_count - deletedCount) } : post
  )));
  return { comment_id: commentId, deleted_count: deletedCount };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message?: unknown }).message);
  return "请稍后再试";
}

export async function likeComment(commentId: string) {
  const user = getCurrentUser();
  if (!user) throw new Error("取个名字才能留下你的破防痕迹。");

  if (isSupabaseBrowserConfigured()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("react_to_comment", {
      profile_uuid: user.guest_user_id,
      comment_uuid: commentId
    });
    if (error) throw error;
    await refreshCurrentUser();
    return true;
  }

  let liked = false;
  const comments = readJson<LocalComment[]>(COMMENTS_KEY, []).map((comment) => {
    if (comment.id !== commentId) return comment;
    liked = !comment.liked_by.includes(user.guest_user_id);
    return {
      ...comment,
      liked_by: liked ? [...comment.liked_by, user.guest_user_id] : comment.liked_by.filter((id) => id !== user.guest_user_id),
      like_count: Math.max(0, comment.like_count + (liked ? 1 : -1))
    };
  });
  writeJson(COMMENTS_KEY, comments);
  return liked;
}

export async function getLeaderboard() {
  const posts = await getPosts();
  let topUsers: LocalUser[] = [];

  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: users } = await supabase.from("profiles").select(PROFILE_COLUMNS).order("exp", { ascending: false }).limit(10);
      topUsers = (users ?? []).map((row: any) => toUser(row));
    } catch {
      topUsers = [];
    }
  } else {
    const user = getCurrentUser();
    topUsers = user ? [user] : [];
  }

  return {
    topLiked: [...posts].sort((a, b) => b.reaction_count - a.reaction_count).slice(0, 5),
    topCommented: [...posts].sort((a, b) => b.comment_count - a.comment_count).slice(0, 5),
    topUsers
  };
}

export async function refreshCurrentUser() {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return user;
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.guest_user_id).single();
  return data ? saveUser(toUser(data)) : user;
}
