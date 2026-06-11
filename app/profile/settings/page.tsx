"use client";

import { ChevronRight, FileText, Info, Languages, ScrollText, Tag } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const items = [
    { icon: Info, label: t("settings.aboutTitle"), value: "" },
    { icon: Tag, label: t("settings.version"), value: "v0.1.0" },
    { icon: FileText, label: t("settings.terms"), value: t("settings.placeholder") },
    { icon: ScrollText, label: t("settings.privacy"), value: t("settings.placeholder") }
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h1 text-white">{t("settings.title")}</h1>
        <p className="mt-3 text-body text-muted">{t("settings.subtitle")}</p>
      </div>

      <section className="glass rounded-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-acid/25 bg-acid/10 text-acid">
            <Languages className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-body text-zinc-100">{t("language.label")}</span>
          <LanguageSwitcher />
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="flex items-center gap-3 border-t border-line px-5 py-4" key={item.label}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-acid/25 bg-acid/10 text-acid">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-body text-zinc-100">{item.label}</span>
              {item.value ? <span className="shrink-0 text-meta text-muted">{item.value}</span> : <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
            </div>
          );
        })}
      </section>

      <section className="glass rounded-card p-5">
        <p className="mb-2 text-label text-acid">{t("settings.aboutTitle")}</p>
        <h2 className="text-h2 text-white">{t("settings.aboutHeading")}</h2>
        <div className="mt-4 space-y-4 text-body leading-7 text-zinc-200">
          <p>{t("settings.aboutIntro")}</p>
          <p>
            {t("settings.aboutBody1")}
            <br />
            {t("settings.aboutBody2")}
          </p>
          <p>
            {t("settings.aboutTrace1")}
            <br />
            {t("settings.aboutTrace2")}
            <br />
            {t("settings.aboutTrace3")}
          </p>
        </div>

        <div className="my-5 h-px bg-line" />

        <div className="space-y-4 text-body leading-7 text-zinc-200">
          <div>
            <p className="text-label text-muted">{t("settings.developerLabel")}</p>
            <p className="mt-2 text-white">{t("settings.developerName")}</p>
          </div>
          <p>{t("settings.origin")}</p>
          <p>
            {t("settings.originBody1")}
            <br />
            {t("settings.originBody2")}
          </p>
          <p>
            {t("settings.future1")}
            <br />
            {t("settings.future2")}
          </p>
        </div>

        <div className="my-5 h-px bg-line" />
        <p className="text-meta text-muted">{t("settings.copyright")}</p>
      </section>
    </div>
  );
}
