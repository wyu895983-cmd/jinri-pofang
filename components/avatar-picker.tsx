"use client";

import { motion } from "framer-motion";
import { DEFAULT_AVATARS } from "@/lib/storage";

export function AvatarPicker({
  selected,
  onSelect
}: {
  selected?: string;
  onSelect: (avatar: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {DEFAULT_AVATARS.map((avatar, index) => {
        const active = selected === avatar;
        return (
          <motion.button
            className={`grid aspect-square place-items-center rounded-2xl border p-2 ${
              active ? "border-acid/70 bg-acid/15 shadow-acid" : "border-line bg-white/[0.04]"
            }`}
            key={avatar}
            onClick={() => onSelect(avatar)}
            type="button"
            whileTap={{ scale: 0.94 }}
            aria-label={`选择头像 ${index + 1}`}
          >
            <img alt="" className="h-full w-full object-contain" decoding="async" loading="lazy" src={avatar} />
          </motion.button>
        );
      })}
    </div>
  );
}
