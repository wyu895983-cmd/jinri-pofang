"use client";

import { createClient as createBrowserClient } from "@supabase/supabase-js";

export function isSupabaseBrowserConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      !url.includes("your-project") &&
      !key.includes("your-supabase-publishable-key") &&
      !key.includes("your-anon-key")
  );
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !isSupabaseBrowserConfigured()) {
    throw new Error("Supabase 尚未配置真实 Project URL 和 Publishable Key。");
  }

  return createBrowserClient(url, key);
}
