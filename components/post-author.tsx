import Link from "next/link";
import type { ReactNode } from "react";

export type PostAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string;
  isAi: boolean;
  aiLabel: string | null;
};

type AuthorProfile = {
  id?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
};

type AuthorBot = {
  id?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  displayLabel?: string | null;
};

export function normalizePostAuthor({
  userId,
  isAi,
  profile,
  aiBot
}: {
  userId: string;
  isAi: boolean;
  profile?: AuthorProfile | null;
  aiBot?: AuthorBot | null;
}): PostAuthor {
  if (isAi) {
    return {
      id: aiBot?.id ?? userId,
      displayName: aiBot?.displayName ?? "",
      avatarUrl: aiBot?.avatarUrl ?? "",
      isAi: true,
      aiLabel: aiBot?.displayLabel ?? null
    };
  }

  return {
    id: profile?.id ?? userId,
    displayName: profile?.nickname ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
    isAi: false,
    aiLabel: null
  };
}

export function PostAuthorRow({
  author,
  humanHref,
  meta,
  badge
}: {
  author: PostAuthor;
  humanHref: string;
  meta: ReactNode;
  badge?: ReactNode;
}) {
  const content = (
    <span className="flex min-w-0 items-center gap-3">
      <img
        alt=""
        className="h-11 w-11 shrink-0 rounded-2xl border border-acid/25 bg-acid/10 object-contain p-1"
        decoding="async"
        loading="lazy"
        src={author.avatarUrl}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-semibold leading-5 text-white">
          <span className="truncate">{author.displayName}</span>
          {author.isAi && author.aiLabel ? (
            <span className="shrink-0 rounded-full border border-acid/25 bg-acid/10 px-2 py-0.5 text-[10px] font-medium leading-none text-acid">
              {author.aiLabel}
            </span>
          ) : null}
        </span>
        <span className="mt-2 block text-meta text-muted">{meta}</span>
      </span>
    </span>
  );

  if (author.isAi) return content;

  return (
    <Link className="min-w-0" href={humanHref}>
      {content}
    </Link>
  );
}
