import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isConfigured() {
  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      !url.includes("your-project") &&
      !key.includes("your-supabase-publishable-key") &&
      !key.includes("your-anon-key")
  );
}

if (!isConfigured()) {
  console.error("Supabase is not configured. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key);
const { error } = await supabase.from("feedbacks").insert({
  nickname: "connection-test",
  type: "other",
  content: "Supabase feedback connection test",
  contact: null
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("Supabase feedback insert OK.");
