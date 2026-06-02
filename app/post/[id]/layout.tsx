import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const siteUrl = getSiteUrl();
const shareImage = "/share-card.png";

type PostLayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

export async function generateMetadata({ params }: PostLayoutProps): Promise<Metadata> {
  const postUrl = `/post/${params.id}`;
  const description = (await getPostSummary(params.id)) || "所有人的破防瞬间";

  return {
    metadataBase: new URL(siteUrl),
    title: "今日破防",
    description,
    alternates: {
      canonical: postUrl
    },
    openGraph: {
      title: "今日破防",
      description,
      url: postUrl,
      siteName: "今日破防",
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: "今日破防"
        }
      ],
      locale: "zh_CN",
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title: "今日破防",
      description,
      images: [shareImage]
    }
  };
}

export default function PostLayout({ children }: PostLayoutProps) {
  return children;
}

async function getPostSummary(postId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || postId.startsWith("mock-")) return "";

  try {
    const supabase = createClient(url, key, {
      auth: {
        persistSession: false
      }
    });
    const { data } = await supabase.from("post_feed").select("content").eq("id", postId).single();
    return summarize(data?.content ?? "");
  } catch {
    return "";
  }
}

function summarize(content: string) {
  const text = content.replace(/\s+/g, " ").trim();
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (/^https?:\/\//.test(value) && !/localhost|127\.0\.0\.1/.test(value)) return value.replace(/\/$/, "");
  return "https://jinri-pofang.vercel.app";
}
