import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppEntryGate } from "@/components/app-entry-gate";
import { BackButton } from "@/components/back-button";
import { Nav } from "@/components/nav";
import { PopoAssistant } from "@/components/popo-assistant";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://jinri-pofang.vercel.app";
const shareImage = "/share-card.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "今日破防",
    template: "%s | 今日破防"
  },
  description: "所有人的破防瞬间",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "今日破防",
    description: "所有人的破防瞬间",
    url: "/",
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
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "今日破防",
    description: "所有人的破防瞬间",
    images: [shareImage]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/app-icon-1024.png", sizes: "1024x1024", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "今日破防"
  }
};

export const viewport: Viewport = {
  themeColor: "#09090B"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans`}>
        <AppEntryGate />
        <Nav />
        <BackButton />
        <main className="mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-5">{children}</main>
        <PopoAssistant />
      </body>
    </html>
  );
}
