"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, PlusCircle, Trophy, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/lib/i18n";

const tabs = [
  { href: "/", labelKey: "nav.home", icon: Flame },
  { href: "/leaderboard", labelKey: "nav.leaderboard", icon: Trophy },
  { href: "/create", labelKey: "nav.create", icon: PlusCircle },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound }
];

export function Nav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-ink/88 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-[430px] items-center gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-10 w-10 shrink-0 drop-shadow-[0_0_18px_rgba(182,255,59,0.18)]" />
            <span className="truncate text-h2 text-white">{t("common.appName")}</span>
          </Link>
        </nav>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/92 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[430px] grid-cols-4 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          {tabs.map(({ href, labelKey, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[12px] text-label ${
                  active ? "bg-acid/12 text-acid" : "text-muted"
                }`}
                href={href}
                key={href}
              >
                <Icon className="icon-18" />
                <span className="max-w-full truncate">{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
