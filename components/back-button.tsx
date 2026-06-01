"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number; id: number } | null>(null);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    if (pathname === "/") return;

    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch || touch.clientX > 28) return;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
    }

    function onTouchEnd(event: TouchEvent) {
      const start = touchStartRef.current;
      if (!start) return;

      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
      touchStartRef.current = null;
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = Math.abs(touch.clientY - start.y);
      if (deltaX > 78 && deltaY < 46) {
        goBack();
      }
    }

    function onTouchCancel() {
      touchStartRef.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [goBack, pathname]);

  if (pathname === "/") return null;

  return (
    <button
      aria-label="返回"
      className="fixed left-[max(10px,calc((100vw-430px)/2+10px))] top-[calc(env(safe-area-inset-top)+72px)] z-50 grid h-9 w-9 place-items-center rounded-2xl border border-acid/35 bg-ink/88 text-acid shadow-acid backdrop-blur-xl transition active:scale-95 hover:bg-acid/10"
      onClick={goBack}
      type="button"
    >
      <ChevronLeft className="icon-18" />
    </button>
  );
}
