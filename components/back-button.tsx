"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const gestureRef = useRef<{ x: number; y: number; id: number } | null>(null);

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
      if (!touch || touch.clientX > 30) {
        gestureRef.current = null;
        return;
      }

      gestureRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
    }

    function onTouchMove(event: TouchEvent) {
      const start = gestureRef.current;
      if (!start) return;

      const touch = Array.from(event.touches).find((item) => item.identifier === start.id);
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = Math.abs(touch.clientY - start.y);
      if (deltaY >= 60 && deltaY > Math.max(deltaX, 0)) {
        gestureRef.current = null;
      }
    }

    function onTouchEnd(event: TouchEvent) {
      const start = gestureRef.current;
      if (!start) return;

      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
      gestureRef.current = null;
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = Math.abs(touch.clientY - start.y);
      if (deltaX > 70 && deltaY < 60) {
        goBack();
      }
    }

    function onTouchCancel() {
      gestureRef.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchCancel, true);
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
