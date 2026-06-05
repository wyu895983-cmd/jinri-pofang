"use client";

import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/storage";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/client";

const typeOptions: Array<{ label: string; value: FeedbackType }> = [
  { label: "feedback.type.bug", value: "bug" },
  { label: "feedback.type.idea", value: "idea" },
  { label: "feedback.type.content", value: "content" },
  { label: "feedback.type.other", value: "other" }
];

export default function FeedbackPage() {
  const { t } = useI18n();
  const [nickname, setNickname] = useState("匿名路过");
  const [type, setType] = useState<FeedbackType>("bug");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const configured = isSupabaseBrowserConfigured();

  useEffect(() => {
    setNickname(getCurrentUser()?.nickname ?? "匿名路过");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!content.trim()) {
      setMessage(t("feedback.empty"));
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({ nickname, type, content, contact });
      setContent("");
      setContact("");
      setMessage(t("feedback.success"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("feedback.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">{t("feedback.eyebrow")}</p>
        <h1 className="text-h1 text-white">{t("feedback.title")}</h1>
        <p className="mt-3 text-body text-muted">{t("feedback.subtitle")}</p>
      </div>

      {!configured ? (
        <div className="rounded-card border border-acid/30 bg-acid/10 p-4 text-meta text-acid">
          {t("feedback.notConfigured")}
        </div>
      ) : null}

      <form className="glass rounded-card p-5" onSubmit={submit}>
        <label className="block">
          <span className="text-label text-muted">{t("feedback.nickname")}</span>
          <input
            className="mt-2 h-11 w-full rounded-button border border-line bg-ink/70 px-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={12}
            onChange={(event) => setNickname(event.target.value.slice(0, 12))}
            value={nickname}
          />
        </label>

        <div className="mt-5">
          <p className="text-label text-muted">{t("feedback.type")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {typeOptions.map((option) => (
              <button
                className={`app-button border ${
                  type === option.value ? "border-acid/70 bg-acid/15 text-acid shadow-acid" : "border-line bg-white/[0.04] text-zinc-100"
                }`}
                key={option.value}
                onClick={() => setType(option.value)}
                type="button"
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-label text-muted">{t("feedback.content")}</span>
          <textarea
            className="mt-2 w-full resize-none rounded-card border border-line bg-ink/70 p-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={300}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t("feedback.placeholder")}
            rows={5}
            value={content}
          />
        </label>

        <label className="mt-5 block">
          <span className="text-label text-muted">{t("feedback.contact")}</span>
          <input
            className="mt-2 h-11 w-full rounded-button border border-line bg-ink/70 px-4 text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={80}
            onChange={(event) => setContact(event.target.value)}
            placeholder={t("feedback.contactPlaceholder")}
            value={contact}
          />
        </label>

        {message ? <p className="mt-4 rounded-button border border-acid/30 bg-acid/10 px-4 py-3 text-meta text-acid">{message}</p> : null}

        <motion.button
          className="app-button mt-5 w-full bg-acid text-ink hover:brightness-110 disabled:opacity-60"
          disabled={submitting}
          whileTap={{ scale: 0.96 }}
        >
          {submitting ? t("feedback.submitting") : t("feedback.submit")}
        </motion.button>
      </form>
    </div>
  );
}
