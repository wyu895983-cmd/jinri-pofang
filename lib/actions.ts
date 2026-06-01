"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkContentSafety } from "@/lib/content-safety";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(`/login?message=${encodeURIComponent("请先在 .env.local 配置 Supabase 项目地址和 anon key。")}`);

  const email = String(formData.get("email") ?? "");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` }
  });

  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("登录链接已发送，去邮箱点一下就能开喷。")}`);
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/");

  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function setupProfile(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(`/login?message=${encodeURIComponent("请先配置 Supabase，再初始化 PoPo 档案。")}`);

  const nickname = String(formData.get("nickname") ?? "").trim();
  const identityTag = String(formData.get("identityTag") ?? "").trim() || null;
  const allowedTags = ["学生", "老师", "父母", "打工人", "设计师", "程序员", "自由职业", "其他"];

  if (nickname.length < 1 || nickname.length > 16) {
    redirect(`/profile/setup?error=${encodeURIComponent("昵称需要 1-16 个字。")}`);
  }

  if (identityTag && !allowedTags.includes(identityTag)) {
    redirect(`/profile/setup?error=${encodeURIComponent("身份标签不太对，先跳过也可以。")}`);
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?message=${encodeURIComponent("登录后才能积累怨气值和经验")}`);

  await supabase.rpc("ensure_daily_profile");
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      identity_tag: identityTag,
      avatar_url: "/brand-mark.svg",
      profile_initialized: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) redirect(`/profile/setup?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/");
}

export async function createPost(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(`/login?message=${encodeURIComponent("登录后才能积累怨气值和经验")}`);

  const content = String(formData.get("content") ?? "");
  const safety = checkContentSafety(content);
  if (!safety.ok) redirect(`/create?error=${encodeURIComponent(safety.message ?? "这条暂时不能发布。")}`);

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_post", { post_content: content });

  if (error) redirect(`/create?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  redirect(`/post/${data}`);
}

export async function createComment(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const content = String(formData.get("content") ?? "");
  const parentCommentId = String(formData.get("parentCommentId") ?? "") || null;
  if (!isSupabaseConfigured()) redirect(`/post/${postId}?error=${encodeURIComponent("登录后才能积累怨气值和经验")}`);

  const safety = checkContentSafety(content);
  if (!safety.ok) redirect(`/post/${postId}?error=${encodeURIComponent(safety.message ?? "这条暂时不能发布。")}`);

  const supabase = createClient();
  const { error } = await supabase.rpc("create_comment", {
    post_uuid: postId,
    comment_content: content,
    parent_uuid: parentCommentId
  });

  if (error) redirect(`/post/${postId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
}

export async function reactToPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const reaction = String(formData.get("reaction") ?? "laugh");
  if (!isSupabaseConfigured()) redirect(`/login?message=${encodeURIComponent("登录后才能积累怨气值和经验")}`);

  const supabase = createClient();
  const { error } = await supabase.rpc("react_to_post", { post_uuid: postId, reaction_name: reaction });

  if (error) redirect(`/login?message=${encodeURIComponent("登录后才能积累怨气值和经验")}`);
  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
}

export async function reactToComment(commentId: string, postId: string) {
  if (!isSupabaseConfigured()) return { ok: false, status: "error", message: "登录后才能积累怨气值和经验" };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("react_to_comment", { comment_uuid: commentId });

  if (error) return { ok: false, status: "error", message: error.message };

  revalidatePath(`/post/${postId}`);
  return { ok: true, status: data as "added" | "removed" };
}
