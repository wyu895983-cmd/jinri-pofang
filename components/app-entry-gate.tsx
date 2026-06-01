"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const WELCOME_KEY = "jinri-pofang:welcome-complete";

export function AppEntryGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showSplash) return;
    if (window.localStorage.getItem(WELCOME_KEY) === "true") return;
    if (pathname === "/login") return;
    setShowWelcome(true);
  }, [pathname, showSplash]);

  function start() {
    window.localStorage.setItem(WELCOME_KEY, "true");
    setShowWelcome(false);
    router.push("/login");
  }

  return (
    <AnimatePresence>
      {showSplash ? <SplashScreen /> : null}
      {!showSplash && showWelcome ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-5 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 onboarding-crack opacity-80" />
          <section className="glass relative w-full max-w-[390px] rounded-card p-6 text-center">
            <BrandMark className="mx-auto h-24 w-24 drop-shadow-[0_0_32px_rgba(182,255,59,0.28)]" />
            <h1 className="mt-6 text-h1 text-white">欢迎来到今日破防</h1>
            <p className="mt-4 text-body text-muted">取个名字，今天先破防一下。像小程序一样，点开就能用。</p>
            <button className="app-button mt-8 w-full bg-acid text-ink hover:brightness-110" onClick={start} type="button">
              开始破防
            </button>
          </section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-ink"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 onboarding-crack" />
      <motion.div
        className="relative flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
          <BrandMark className="h-24 w-24 drop-shadow-[0_0_34px_rgba(182,255,59,0.34)]" />
        </motion.div>
        <h1 className="mt-5 text-h1 text-white">今日破防</h1>
        <p className="mt-3 text-body text-acid">今天也稳定破防中...</p>
      </motion.div>
    </motion.div>
  );
}
