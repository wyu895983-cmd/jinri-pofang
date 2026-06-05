"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_AVATARS } from "@/lib/storage";

export function AvatarPicker({
  selected,
  onSelect
}: {
  selected?: string;
  onSelect: (avatar: string) => void;
}) {
  const { t } = useI18n();
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
            aria-label={t("auth.chooseAvatar", { count: index + 1 })}
          >
            <img alt="" className="h-full w-full object-contain" decoding="async" loading="lazy" src={avatar} />
          </motion.button>
        );
      })}
    </div>
  );
}
