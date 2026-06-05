"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { languages, useI18n, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { currentLanguage, locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ maxHeight: 208, right: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  function choose(nextLocale: Locale) {
    setLocale(nextLocale);
    setOpen(false);
  }

  function updateMenuPosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxHeight = Math.min(208, window.innerHeight - 24);
    const preferredTop = rect.bottom + 8;
    const shouldOpenUp = preferredTop + maxHeight > window.innerHeight - 12;
    setMenuPosition({
      maxHeight,
      right: Math.max(12, window.innerWidth - rect.right),
      top: shouldOpenUp ? Math.max(12, rect.top - maxHeight - 8) : preferredTop
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        aria-expanded={open}
        aria-label={t("language.label")}
        className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-button border border-line bg-white/[0.045] px-3 text-label text-zinc-100 transition hover:border-acid/40 hover:bg-white/[0.07]"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <span className="truncate">{currentLanguage.name}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {mounted && open
        ? createPortal(
            <>
              <button className="fixed inset-0 z-[9998] cursor-default" onClick={() => setOpen(false)} type="button" aria-label={t("common.cancel")} />
              <div
                className="fixed z-[9999] w-44 overflow-hidden rounded-card border border-line bg-panel shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                style={{ right: menuPosition.right, top: menuPosition.top }}
              >
                <div
                  className="overflow-y-auto overscroll-contain"
                  style={{ maxHeight: menuPosition.maxHeight, WebkitOverflowScrolling: "touch" }}
                >
                  {languages.map((language) => (
                    <button
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left text-label transition ${
                        locale === language.code ? "bg-acid/14 text-acid" : "text-zinc-100 hover:bg-white/[0.06]"
                      }`}
                      key={language.code}
                      onClick={() => choose(language.code)}
                      type="button"
                    >
                      <span className="text-base leading-none">{language.flag}</span>
                      <span className="truncate">{language.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
