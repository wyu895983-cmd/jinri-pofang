"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { StickerPicker } from "@/components/sticker-picker";
import { createPost, getCurrentUser, LocalUser } from "@/lib/storage";

const loginPrompt = `/login?message=${encodeURIComponent("取个名字才能留下你的破防痕迹。")}`;

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace(loginPrompt);
      return;
    }
    setUser(current);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("content") ?? "").trim();

    if (!text) {
      setError("先写点什么再发射。");
      return;
    }

    try {
      const post = await createPost(text);
      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败了。");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-label text-acid">发布吐槽</p>
        <h1 className="text-h1 text-white">把这口气，优雅地吐出去</h1>
      </div>

      <form className="glass rounded-card p-5" onSubmit={submit}>
        {user ? (
          <div className="mb-4 flex flex-wrap gap-3 text-meta">
            <span className="rounded-button bg-white/[0.06] px-3 py-2 text-zinc-200">{user.nickname}</span>
            <span className="rounded-button bg-acid/10 px-3 py-2 font-medium text-acid">今日怨气值 {user.energy}/20</span>
          </div>
        ) : null}

        {error ? <p className="mb-4 rounded-button border border-acid/30 bg-acid/10 px-4 py-3 text-meta text-acid">{error}</p> : null}

        <RageMeter content={draft} />

        <textarea
          className="w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
          maxLength={100}
          name="content"
          onInput={(event) => setDraft(event.currentTarget.value)}
          placeholder="100 字以内，精准破防。比如：老板说这个需求很简单的时候，我就知道今晚不简单。"
          required
          rows={5}
        />
        <StickerPicker />
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-meta text-muted">发布消耗 1 点怨气值，获得 2 EXP。</p>
          <button className="app-button bg-acid text-ink hover:brightness-110">发射</button>
        </div>
      </form>
    </div>
  );
}

function RageMeter({ content }: { content: string }) {
  const score = Math.min(100, Math.round(content.trim().length * 1.8 + punctuationScore(content)));
  const level = score >= 90 ? "SS" : score >= 74 ? "S" : score >= 55 ? "A" : score >= 30 ? "B" : "C";

  return (
    <div className="mb-4 rounded-card border border-line bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center justify-between text-meta">
        <span className="text-muted">破防指数</span>
        <motion.span
          className="text-label text-acid drop-shadow-[0_0_14px_rgba(182,255,59,0.3)]"
          key={`${score}-${level}`}
          initial={{ scale: 1.18 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.28 }}
        >
          {score}% · {level}
        </motion.span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple via-fuchsia-500 to-acid"
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function punctuationScore(value: string) {
  return (value.match(/[!！?？。]/g)?.length ?? 0) * 5;
}
