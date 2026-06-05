"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_AVATARS, enterWithNickname, getRandomNickname, updateCurrentUserProfile } from "@/lib/storage";

const REMEMBER_LOGIN_KEY = "jinri-pofang:remember-login";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberLoaded, setRememberLoaded] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(new URLSearchParams(window.location.search).get("message") ?? "");
    setAvatar(window.localStorage.getItem("userAvatar") || DEFAULT_AVATARS[0]);

    try {
      const saved = JSON.parse(window.localStorage.getItem(REMEMBER_LOGIN_KEY) ?? "null") as
        | { remember?: boolean; nickname?: string; passphrase?: string }
        | null;

      if (saved?.remember) {
        setRememberMe(true);
        setNickname(saved.nickname?.slice(0, 12) ?? "");
        setPassphrase(saved.passphrase?.slice(0, 24) ?? "");
      }
    } catch {
      window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    } finally {
      setRememberLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!rememberLoaded) return;

    if (!rememberMe) {
      window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
      return;
    }

    window.localStorage.setItem(
      REMEMBER_LOGIN_KEY,
      JSON.stringify({
        remember: true,
        nickname: nickname.slice(0, 12),
        passphrase: passphrase.slice(0, 24)
      })
    );
  }, [nickname, passphrase, rememberLoaded, rememberMe]);

  async function selectAvatar(nextAvatar: string) {
    setAvatar(nextAvatar);
    await updateCurrentUserProfile({ avatar_url: nextAvatar });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = nickname.trim() || getRandomNickname();

    if (passphrase.trim().length < 4) {
      setError(t("auth.passphraseTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      await enterWithNickname(value, passphrase);
      await updateCurrentUserProfile({ nickname: value, avatar_url: avatar });
      router.push("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : t("auth.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="glass rounded-card p-6 text-center">
        <BrandMark className="mx-auto h-20 w-20 drop-shadow-[0_0_28px_rgba(182,255,59,0.24)]" />
        <h1 className="mt-5 text-h1 text-white">{t("auth.title")}</h1>
        <p className="mt-3 text-body text-muted">{t("auth.subtitle")}</p>

        {error ? <p className="mt-5 rounded-button border border-acid/30 bg-acid/10 px-4 py-3 text-meta text-acid">{error}</p> : null}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            className="h-12 w-full rounded-button border border-line bg-ink/70 px-4 text-center text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={12}
            onChange={(event) => {
              setNickname(event.target.value.slice(0, 12));
              setError("");
            }}
            placeholder={t("auth.nicknamePlaceholder")}
            value={nickname}
          />
          <input
            className="h-12 w-full rounded-button border border-line bg-ink/70 px-4 text-center text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={24}
            onChange={(event) => {
              setPassphrase(event.target.value);
              setError("");
            }}
            placeholder={t("auth.passphrasePlaceholder")}
            type="password"
            value={passphrase}
          />
          <label className="flex items-center gap-2 rounded-button border border-line bg-white/[0.035] px-3 py-3 text-left text-label text-muted">
            <input
              checked={rememberMe}
              className="h-4 w-4 shrink-0 rounded border-line bg-ink accent-acid"
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            <span>{t("auth.rememberMe")}</span>
          </label>
          <div className="rounded-card border border-line bg-white/[0.035] p-3">
            <p className="mb-3 text-left text-label text-muted">{t("auth.avatarLabel")}</p>
            <AvatarPicker selected={avatar} onSelect={selectAvatar} />
          </div>
          <button className="app-button w-full bg-acid text-ink hover:brightness-110" disabled={submitting}>
            {submitting ? t("auth.submitting") : t("auth.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
