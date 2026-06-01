import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code && isSupabaseConfigured()) {
    const supabase = createClient();
    try {
      await supabase.auth.exchangeCodeForSession(code);
      await supabase.rpc("ensure_daily_profile");
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("profile_initialized").eq("id", user.id).single();
        if (!profile?.profile_initialized) {
          return NextResponse.redirect(new URL("/profile/setup", requestUrl.origin));
        }
      }
    } catch {
      return NextResponse.redirect(new URL("/login?message=登录后才能积累怨气值和经验", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
