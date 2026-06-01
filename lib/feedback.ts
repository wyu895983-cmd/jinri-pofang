"use client";

import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

export type FeedbackType = "bug" | "idea" | "content" | "other";

export async function submitFeedback(input: {
  nickname: string;
  type: FeedbackType;
  content: string;
  contact?: string;
}) {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error("请先配置真实 Supabase Project URL 和 Publishable Key。");
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("feedbacks").insert({
    nickname: input.nickname.trim() || "匿名路过",
    type: input.type,
    content: input.content.trim(),
    contact: input.contact?.trim() || null
  });

  if (error) throw error;
}
