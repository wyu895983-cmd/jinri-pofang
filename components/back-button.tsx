"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const gestureRef = useRef<{ x: number; y: number; id: number | null; active: boolean } | null>(null);

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

      gestureRef.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier, active: true };
    }

    function onTouchMove(event: TouchEvent) {
      const start = gestureRef.current;
      if (!start?.active) return;

      const touch = Array.from(event.touches).find((item) => item.identifier === start.id);
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = Math.abs(touch.clientY - start.y);
      if (deltaY > 52 && deltaY > deltaX) {
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
      if (deltaX > 78 && deltaY < 46) {
        goBack();
      }
    }

    function onTouchCancel() {
      gestureRef.current = null;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch" || event.clientX > 28 || event.button !== 0) return;
      gestureRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId, active: true };
    }

    function onPointerMove(event: PointerEvent) {
      const start = gestureRef.current;
      if (!start?.active || start.id !== event.pointerId) return;

      const deltaX = event.clientX - start.x;
      const deltaY = Math.abs(event.clientY - start.y);
      if (deltaY > 52 && deltaY > deltaX) {
        gestureRef.current = null;
      }
    }

    function onPointerUp(event: PointerEvent) {
      const start = gestureRef.current;
      if (!start || start.id !== event.pointerId) return;

      gestureRef.current = null;
      const deltaX = event.clientX - start.x;
      const deltaY = Math.abs(event.clientY - start.y);
      if (deltaX > 78 && deltaY < 46) {
        goBack();
      }
    }

    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { capture: true, passive: true });
    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    window.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });
    window.addEventListener("pointercancel", onTouchCancel, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchCancel, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onTouchCancel, true);
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
