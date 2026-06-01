"use client";

import { useEffect, useState } from "react";
import { LocalUser, updateCurrentUserProfile } from "@/lib/storage";

export default function NicknameInput({ onSaved }: { onSaved?: (user: LocalUser | null) => void }) {
  const [nickname, setNickname] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNickname(window.localStorage.getItem("userName") || "");
  }, []);

  async function saveNickname() {
    const value = nickname.trim().slice(0, 12);
    if (!value) return;

    window.localStorage.setItem("userName", value);
    const user = await updateCurrentUserProfile({ nickname: value });
    setNickname(value);
    setSaved(true);
    onSaved?.(user);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-button border border-line bg-ink/70 px-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
          maxLength={12}
          onChange={(event) => {
            setNickname(event.target.value.slice(0, 12));
            setSaved(false);
          }}
          placeholder="请输入昵称"
          type="text"
          value={nickname}
        />
        <button className="h-11 shrink-0 rounded-button bg-acid px-4 text-label font-bold text-ink transition active:scale-95" onClick={saveNickname} type="button">
          保存
        </button>
      </div>
      {saved ? <p className="text-meta text-acid">昵称已保存</p> : null}
    </div>
  );
}
