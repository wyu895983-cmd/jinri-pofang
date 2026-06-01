"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { hasUnreadNotifications, subscribeToNotifications } from "@/lib/storage";

export function PopoAssistant() {
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const unread = await hasUnreadNotifications();
      if (active) setHasUnread(unread);
    }

    void refresh();
    const unsubscribe = subscribeToNotifications(() => {
      setHasUnread(true);
    });

    window.addEventListener("pofang:storage-change", refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("pofang:storage-change", refresh);
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-[max(14px,calc((100vw-430px)/2+14px))] z-40">
      <motion.button
        aria-label="打开我的页面"
        className="relative grid h-14 w-14 place-items-center rounded-2xl border border-acid/40 bg-acid/10 shadow-acid backdrop-blur"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push("/profile")}
        type="button"
      >
        {hasUnread ? (
          <motion.span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-acid shadow-[0_0_16px_rgba(182,255,59,0.95)]"
            animate={{ opacity: [0.55, 1, 0.55], scale: [0.86, 1.18, 0.86] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        <BrandMark className="h-10 w-10" />
      </motion.button>
    </div>
  );
}
