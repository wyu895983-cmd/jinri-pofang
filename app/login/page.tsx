"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { enterWithNickname } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(new URLSearchParams(window.location.search).get("message") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = nickname.trim();

    if (!value) {
      setError("请输入昵称");
      return;
    }

    if (passphrase.trim().length < 4) {
      setError("请输入至少 4 位口令");
      return;
    }

    setSubmitting(true);
    try {
      await enterWithNickname(value, passphrase);
      router.push("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "进入失败，请检查昵称和口令。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="glass rounded-card p-6 text-center">
        <BrandMark className="mx-auto h-20 w-20 drop-shadow-[0_0_28px_rgba(182,255,59,0.24)]" />
        <h1 className="mt-5 text-h1 text-white">欢迎来到今日破防</h1>
        <p className="mt-3 text-body text-muted">取个名字，今天先破防一下。</p>

        {error ? <p className="mt-5 rounded-button border border-acid/30 bg-acid/10 px-4 py-3 text-meta text-acid">{error}</p> : null}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            className="h-12 w-full rounded-button border border-line bg-ink/70 px-4 text-center text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={12}
            onChange={(event) => {
              setNickname(event.target.value.slice(0, 12));
              setError("");
            }}
            placeholder="请输入昵称"
            value={nickname}
          />
          <input
            className="h-12 w-full rounded-button border border-line bg-ink/70 px-4 text-center text-body text-white outline-none ring-acid/20 placeholder:text-zinc-600 focus:border-acid focus:ring-4"
            maxLength={24}
            onChange={(event) => {
              setPassphrase(event.target.value);
              setError("");
            }}
            placeholder="请输入口令"
            type="password"
            value={passphrase}
          />
          <button className="app-button w-full bg-acid text-ink hover:brightness-110" disabled={submitting}>
            {submitting ? "进入中..." : "开始破防"}
          </button>
        </form>
      </div>
    </div>
  );
}
