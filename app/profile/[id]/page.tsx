"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FollowButton } from "@/components/follow-button";
import { RichContent } from "@/components/rich-content";
import { StatsCard } from "@/components/stats-card";
import { useI18n } from "@/lib/i18n";
import { getPublicProfile } from "@/lib/storage";

type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getPublicProfile(id).then((value) => {
      setData(value);
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return <div className="glass rounded-card p-8 text-center text-meta text-muted">{t("common.loading")}</div>;
  if (!data) return <div className="glass rounded-card p-8 text-center text-meta text-muted">{t("profile.notFound")}</div>;

  return (
    <div className="space-y-5">
      <section className="glass rounded-card p-5">
        <div className="flex items-center gap-4">
          <img alt="" className="h-16 w-16 rounded-2xl border border-acid/30 bg-acid/10 object-contain p-2" src={data.profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="text-label text-acid">{t("profile.file")}</p>
            <h1 className="mt-1 truncate text-h1 text-white">{data.profile.nickname}</h1>
          </div>
          <FollowButton initialFollowing={data.isFollowing} onChange={(following) => setData((current) => current ? { ...current, isFollowing: following, followerCount: Math.max(0, current.followerCount + (following ? 1 : -1)) } : current)} targetProfileId={id} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatsCard label={t("follow.followingCount")} value={data.followingCount} />
        <StatsCard label={t("follow.followerCount")} value={data.followerCount} />
      </div>

      <section>
        <h2 className="mb-4 text-h2 text-white">{t("profile.history")}</h2>
        <div className="space-y-4">
          {data.posts.length ? data.posts.map((post) => (
            <Link className="glass block rounded-card p-5" href={`/post/${post.id}`} key={post.id}>
              <RichContent className="whitespace-pre-wrap text-body text-zinc-100" content={post.content} />
              <p className="mt-3 text-meta text-muted">{post.reaction_count} {t("common.like")} · {t("post.comments", { count: post.comment_count })}</p>
            </Link>
          )) : <div className="glass rounded-card p-8 text-center text-meta text-muted">{t("profile.emptyHistory")}</div>}
        </div>
      </section>
    </div>
  );
}
