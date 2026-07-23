import { normalizePostAuthor, type PostAuthor } from "@/components/post-author";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  nickname: string;
  exp: number;
  energy: number;
  login_streak?: number;
  streak_count: number;
  avatar_url?: string;
  identity_tag?: string | null;
  profile_initialized?: boolean;
};

export type PostWithProfile = {
  id: string;
  user_id: string;
  content: string;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  updated_at?: string | null;
  profiles: Profile;
  author?: PostAuthor;
  is_ai_post?: boolean;
  ai_bot_id?: string | null;
  ai_bots?: {
    id: string;
    display_name: string;
    avatar_url: string;
    display_label: string;
  } | null;
  ai_display_label?: string | null;
  ai_persona_type?: string | null;
};

export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.rpc("ensure_daily_profile");
    }

    return user;
  } catch {
    return null;
  }
}

export async function getPosts(limit = 50) {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id,user_id,content,reaction_count,comment_count,created_at,updated_at,is_ai_post,ai_bot_id,profiles(id,nickname,avatar_url,exp,energy,streak_count),ai_bots(id,display_name,avatar_url,display_label)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(toPostWithAuthor);
  } catch {
    return [];
  }
}

export async function getProfile(userId: string) {
  if (!isSupabaseConfigured()) {
    return { profile: null, totalPosts: 0, totalLikes: 0, posts: [] as PostWithProfile[] };
  }

  const supabase = createClient();
  try {
    const [{ data: profile }, { count: totalPosts }, { data: posts }, { data: postLikes }, { data: commentLikes }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("posts")
        .select("id,user_id,content,reaction_count,comment_count,created_at,updated_at,is_ai_post,ai_bot_id,profiles(id,nickname,avatar_url,exp,energy,streak_count),ai_bots(id,display_name,avatar_url,display_label)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("posts").select("reaction_count").eq("user_id", userId),
      supabase.from("comments").select("like_count").eq("user_id", userId)
    ]);

    const postLikeCount = (postLikes ?? []).reduce((sum, post) => sum + Number(post.reaction_count ?? 0), 0);
    const commentLikeCount = (commentLikes ?? []).reduce((sum, comment) => sum + Number(comment.like_count ?? 0), 0);
    const totalLikes = postLikeCount + commentLikeCount;
    return {
      profile: profile as Profile | null,
      totalPosts: totalPosts ?? 0,
      totalLikes,
      posts: (posts ?? []).map(toPostWithAuthor)
    };
  } catch {
    return { profile: null, totalPosts: 0, totalLikes: 0, posts: [] as PostWithProfile[] };
  }
}

function toPostWithAuthor(row: any): PostWithProfile {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const aiBot = Array.isArray(row.ai_bots) ? row.ai_bots[0] : row.ai_bots;
  return {
    ...row,
    profiles: profile,
    ai_bots: aiBot ?? null,
    author: normalizePostAuthor({
      userId: row.user_id ?? "",
      isAi: Boolean(row.is_ai_post),
      profile: profile
        ? { id: profile.id, nickname: profile.nickname, avatarUrl: profile.avatar_url }
        : null,
      aiBot: aiBot
        ? { id: aiBot.id, displayName: aiBot.display_name, avatarUrl: aiBot.avatar_url, displayLabel: aiBot.display_label }
        : null
    })
  } as PostWithProfile;
}
