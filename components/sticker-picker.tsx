"use client";

import { useState } from "react";
import { popoStickers } from "@/lib/stickers";

export function StickerPicker() {
  const [open, setOpen] = useState(false);

  function insertSticker(token: string) {
    const active = document.activeElement;
    const form = active?.closest?.("form") ?? document.querySelector("form");
    const textarea = form?.querySelector<HTMLTextAreaElement>("textarea[name='content']");
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextValue = `${textarea.value.slice(0, start)}${token}${textarea.value.slice(end)}`;
    if (nextValue.length > textarea.maxLength && textarea.maxLength > 0) return;

    textarea.value = nextValue;
    textarea.focus();
    textarea.setSelectionRange(start + token.length, start + token.length);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div className="mt-3">
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
              <img alt={sticker.name} className="h-full w-full object-contain" src={sticker.src} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
