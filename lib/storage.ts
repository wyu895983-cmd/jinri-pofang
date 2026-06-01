"use client";

import { HOME_COPY_POOL } from "@/lib/copy-pool";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

export type LocalUser = {
  guest_user_id: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
  last_login_date: string;
  login_streak: number;
  exp: number;
  energy: number;
  total_posts: number;
  total_likes: number;
};

export type LocalPost = {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string;
  content: string;
  sticker_id?: string | null;
  reaction_count: number;
  comment_count: number;
  liked_by: string[];
  created_at: string;
  updated_at?: string | null;
  is_mock?: boolean;
};

export type LocalComment = {
  id: string;
  post_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string;
  content: string;
  sticker_id?: string | null;
  like_count: number;
  liked_by: string[];
  created_at: string;
};

const USER_KEY = "jinri-pofang:guest-user";
const POSTS_KEY = "jinri-pofang:posts";
const COMMENTS_KEY = "jinri-pofang:comments";
const POST_FEED_COLUMNS = "id,user_id,nickname,avatar_url,content,sticker_id,reaction_count,comment_count,created_at,updated_at";
const COMMENT_FEED_COLUMNS = "id,post_id,user_id,nickname,avatar_url,content,sticker_id,like_count,created_at,updated_at";
const PROFILE_COLUMNS = "id,nickname,avatar_url,exp,energy,total_posts,total_likes,login_streak,created_at,last_login_date";

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

function saveUser(user: LocalUser) {
  writeJson(USER_KEY, user);
  return user;
}

function toUser(row: any): LocalUser {
  return {
    guest_user_id: row.id,
    nickname: row.nickname,
    avatar_url: row.avatar_url ?? "/brand-mark.svg",
    created_at: row.created_at ?? nowIso(),
    last_login_date: row.last_login_date ?? todayKey(),
    login_streak: Number(row.login_streak ?? 1),
    exp: Number(row.exp ?? 0),
    energy: Number(row.energy ?? 20),
    total_posts: Number(row.total_posts ?? 0),
    total_likes: Number(row.total_likes ?? 0)
  };
}

function toPost(row: any, likedBy: string[] = []): LocalPost {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname,
    avatar_url: row.avatar_url ?? "/brand-mark.svg",
    content: row.content,
    sticker_id: row.sticker_id,
    reaction_count: Number(row.reaction_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    liked_by: likedBy,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toComment(row: any, likedBy: string[] = []): LocalComment {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    nickname: row.nickname,
    avatar_url: row.avatar_url ?? "/brand-mark.svg",
    content: row.content,
    sticker_id: row.sticker_id,
    like_count: Number(row.like_count ?? 0),
    liked_by: likedBy,
    created_at: row.created_at
  };
}

function seedPosts(): LocalPost[] {
  const existing = readJson<LocalPost[] | null>(POSTS_KEY, null);
  if (existing) return existing;

  const posts: LocalPost[] = HOME_COPY_POOL.map((content, index) => ({
    id: `mock-${index + 1}`,
    user_id: `mock-user-${index % mockNicknames.length}`,
    nickname: mockNicknames[index % mockNicknames.length],
    avatar_url: "/brand-mark.svg",
    content,
    reaction_count: 8 + ((index * 13) % 180),
    comment_count: (index * 5) % 22,
    liked_by: [],
    created_at: new Date(Date.now() - (index + 1) * 9 * 60 * 1000).toISOString(),
    updated_at: null,
    is_mock: true
  }));

  writeJson(POSTS_KEY, posts);
  writeJson(COMMENTS_KEY, []);
  return posts;
}

function localEnterWithNickname(nickname: string) {
  const trimmed = nickname.trim().slice(0, 12);
  if (!trimmed) throw new Error("请输入昵称");
  const existing = readJson<LocalUser | null>(USER_KEY, null);
  return saveUser({
    guest_user_id: existing?.guest_user_id ?? uuid(),
    nickname: trimmed,
    avatar_url: "/brand-mark.svg",
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
  return readJson<LocalUser | null>(USER_KEY, null);
}

export async function enterWithNickname(nickname: string, passphrase = "") {
  const trimmed = nickname.trim().slice(0, 12);
  if (!trimmed) throw new Error("请输入昵称");
  if (!passphrase.trim() || passphrase.trim().length < 4) throw new Error("请输入至少 4 位口令");

  if (!isSupabaseBrowserConfigured()) return localEnterWithNickname(trimmed);

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("login_or_create_profile", {
    raw_nickname: trimmed,
    raw_passphrase: passphrase
  });

  if (error) throw error;
  return saveUser(toUser(data));
}

export function signOutLocalUser() {
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("pofang:storage-change"));
}

export async function getPosts() {
  const user = getCurrentUser();

  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const [{ data: rows, error }, { data: reactions }] = await Promise.all([
        supabase.from("post_feed").select(POST_FEED_COLUMNS).order("created_at", { ascending: false }).limit(80),
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
      const [{ data: rows, error }, { data: reactions }] = await Promise.all([
        supabase.from("comment_feed").select(COMMENT_FEED_COLUMNS).eq("post_id", postId).order("created_at", { ascending: true }),
        user
          ? supabase.from("reactions").select("comment_id").eq("user_id", user.guest_user_id).not("comment_id", "is", null)
          : Promise.resolve({ data: [] })
      ]);
      if (error) throw error;
      const liked = new Set((reactions ?? []).map((reaction: any) => reaction.comment_id));
      return (rows ?? []).map((row: any) => toComment(row, liked.has(row.id) && user ? [user.guest_user_id] : []));
    } catch {
      return [];
    }
  }

  return readJson<LocalComment[]>(COMMENTS_KEY, [])
    .filter((comment) => comment.post_id === postId)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

export async function createComment(postId: string, content: string) {
  const user = getCurrentUser();
  if (!user) throw new Error("取个名字才能留下你的破防痕迹。");

  if (isSupabaseBrowserConfigured() && !postId.startsWith("mock-")) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("create_comment", {
      profile_uuid: user.guest_user_id,
      post_uuid: postId,
      comment_content: content,
      comment_sticker_id: null
    });
    if (error) throw error;
    await refreshCurrentUser();
    return toComment({ ...data, nickname: user.nickname, avatar_url: user.avatar_url }, []);
  }

  const comment: LocalComment = {
    id: uuid(),
    post_id: postId,
    user_id: user.guest_user_id,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    content: content.trim(),
    like_count: 0,
    liked_by: [],
    created_at: nowIso()
  };
  const comments = readJson<LocalComment[]>(COMMENTS_KEY, []);
  const posts = seedPosts().map((post) => (post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post));
  writeJson(COMMENTS_KEY, [...comments, comment]);
  writeJson(POSTS_KEY, posts);
  saveUser({ ...user, exp: user.exp + 1 });
  return comment;
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
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const [{ data: liked }, { data: commented }, { data: users }] = await Promise.all([
        supabase.from("post_feed").select(POST_FEED_COLUMNS).order("reaction_count", { ascending: false }).limit(5),
        supabase.from("post_feed").select(POST_FEED_COLUMNS).order("comment_count", { ascending: false }).limit(5),
        supabase.from("profiles").select(PROFILE_COLUMNS).order("exp", { ascending: false }).limit(10)
      ]);
      return {
        topLiked: (liked ?? []).map((row: any) => toPost(row)),
        topCommented: (commented ?? []).map((row: any) => toPost(row)),
        topUsers: (users ?? []).map((row: any) => toUser(row))
      };
    } catch {
      // fall through
    }
  }
  const posts = await getPosts();
  const user = getCurrentUser();
  return {
    topLiked: [...posts].sort((a, b) => b.reaction_count - a.reaction_count).slice(0, 5),
    topCommented: [...posts].sort((a, b) => b.comment_count - a.comment_count).slice(0, 5),
    topUsers: user ? [user] : []
  };
}

export async function refreshCurrentUser() {
  const user = getCurrentUser();
  if (!user || !isSupabaseBrowserConfigured()) return user;
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.guest_user_id).single();
  return data ? saveUser(toUser(data)) : user;
}
