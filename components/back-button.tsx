"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    router.push("/");
  }

  return (
    <button
      aria-label="返回"
      className="fixed left-[max(14px,calc((100vw-430px)/2+14px))] top-[calc(env(safe-area-inset-top)+76px)] z-50 grid h-10 w-10 place-items-center rounded-2xl border border-acid/35 bg-ink/88 text-acid shadow-acid backdrop-blur-xl transition hover:bg-acid/10"
      onClick={goBack}
      type="button"
    >
      <ChevronLeft className="icon-18" />
    </button>
  );
}
