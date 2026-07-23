"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefObject, useEffect, useState } from "react";
import { insertAtSelection, shouldShowQuickStickers } from "@/lib/quick-stickers";
import { popoStickers } from "@/lib/stickers";

type StickerPickerProps = {
  textareaRef?: RefObject<HTMLTextAreaElement>;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function StickerPicker({ textareaRef, value, onValueChange }: StickerPickerProps = {}) {
  const [open, setOpen] = useState(false);
  const [quickDismissed, setQuickDismissed] = useState(false);
  const controlled = value !== undefined && Boolean(onValueChange);

  useEffect(() => {
    if (value === "") setQuickDismissed(false);
  }, [value]);

  function insertSticker(token: string, dismissQuick = false) {
    const active = document.activeElement;
    const form = active?.closest?.("form") ?? document.querySelector("form");
    const textarea = textareaRef?.current ?? form?.querySelector<HTMLTextAreaElement>("textarea[name='content']");
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const result = insertAtSelection(value ?? textarea.value, token, start, end, textarea.maxLength);
    if (!result) return;

    if (controlled) onValueChange?.(result.value);
    else {
      textarea.value = result.value;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (dismissQuick) setQuickDismissed(true);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.caret, result.caret);
    });
  }

  return (
    <div className="mt-3">
      {controlled ? (
        <AnimatePresence initial={false}>
          {shouldShowQuickStickers(value ?? "", quickDismissed) ? (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="mb-3 grid grid-cols-4 gap-2 overflow-hidden"
              exit={{ height: 0, marginBottom: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {popoStickers.slice(0, 4).map((sticker) => (
                <motion.button
                  className="grid aspect-square max-h-16 place-items-center overflow-hidden rounded-[12px] border border-line bg-white/[0.04] p-1 hover:border-acid/50"
                  key={sticker.id}
                  onClick={() => insertSticker(sticker.token, true)}
                  title={sticker.name}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                >
                  <img alt={sticker.name} className="h-full w-full object-contain" decoding="async" loading="lazy" src={sticker.src} />
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
      <button
        className="app-button inline-flex items-center gap-2 border border-line bg-white/[0.04] text-muted hover:bg-white/[0.07] hover:text-white"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        PoPo 表情
      </button>

      {open ? (
        <div className="mt-3 grid grid-cols-5 gap-2 rounded-card border border-line bg-ink/70 p-3">
          {popoStickers.map((sticker) => (
            <button
              className="grid aspect-square min-h-0 place-items-center overflow-hidden rounded-[12px] border border-line bg-white/[0.04] p-1 hover:border-acid/50"
              key={sticker.id}
              onClick={() => insertSticker(sticker.token)}
              title={sticker.name}
              type="button"
            >
              <img alt={sticker.name} className="h-full w-full object-contain" decoding="async" loading="lazy" src={sticker.src} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
