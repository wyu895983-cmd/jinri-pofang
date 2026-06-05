"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { StickerPicker } from "@/components/sticker-picker";
import { Toast } from "@/components/toast";
import { useI18n } from "@/lib/i18n";
import { createPost, getCurrentUser, LocalUser } from "@/lib/storage";

export default function CreatePage() {
  const router = useRouter();
  const { t } = useI18n();
  const loginPrompt = `/login?message=${encodeURIComponent(t("auth.needName"))}`;
  const [user, setUser] = useState<LocalUser | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

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
    if (submitting) return;
    const form = event.currentTarget;
    const text = String(new FormData(form).get("content") ?? "").trim();

    if (!text) {
      setError(t("create.empty"));
      return;
    }

    try {
      setSubmitting(true);
      await createPost(text);
      form?.reset();
      setDraft("");
      setError("");
      setSuccess(t("create.success"));
      window.setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.failed"));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-label text-acid">{t("create.eyebrow")}</p>
        <h1 className="text-h1 text-white">{t("create.title")}</h1>
      </div>

      <form className="glass rounded-card p-5" onSubmit={submit}>
        {user ? (
          <div className="mb-4 flex flex-wrap gap-3 text-meta">
            <span className="rounded-button bg-white/[0.06] px-3 py-2 text-zinc-200">{user.nickname}</span>
            <span className="rounded-button bg-acid/10 px-3 py-2 font-medium text-acid">{t("create.energy", { count: user.energy })}</span>
          </div>
        ) : null}

        {error ? <p className="mb-4 rounded-button border border-acid/30 bg-acid/10 px-4 py-3 text-meta text-acid">{error}</p> : null}

        <RageMeter content={draft} />

        <textarea
          className="w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
          maxLength={100}
          name="content"
          onInput={(event) => setDraft(event.currentTarget.value)}
          placeholder={t("create.placeholder")}
          required
          rows={5}
        />
        <StickerPicker />
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-meta text-muted">{t("create.cost")}</p>
          <button className="app-button bg-acid text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
            {submitting ? t("create.submitting") : t("create.submit")}
          </button>
        </div>
      </form>
      <Toast message={success} />
    </div>
  );
}

function RageMeter({ content }: { content: string }) {
  const { t } = useI18n();
  const score = Math.min(100, Math.round(content.trim().length * 1.8 + punctuationScore(content)));
  const level = score >= 90 ? "SS" : score >= 74 ? "S" : score >= 55 ? "A" : score >= 30 ? "B" : "C";

  return (
    <div className="mb-4 rounded-card border border-line bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center justify-between text-meta">
        <span className="text-muted">{t("create.rageIndex")}</span>
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
