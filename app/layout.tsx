import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppEntryGate } from "@/components/app-entry-gate";
import { Nav } from "@/components/nav";
import { PopoAssistant } from "@/components/popo-assistant";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "今日破防",
  description: "每天一点小破防，大家一起笑着活。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "今日破防"
  },
  themeColor: "#09090B"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans`}>
        <AppEntryGate />
        <Nav />
        <main className="mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-5">{children}</main>
        <PopoAssistant />
      </body>
    </html>
  );
}
