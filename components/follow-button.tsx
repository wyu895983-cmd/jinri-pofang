"use client";

import { useEffect, useState } from "react";
import { followProfile, getCurrentUser, getCurrentUserId, getFollowState, unfollowProfile } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

export function FollowButton({ targetProfileId, initialFollowing, onChange }: { targetProfileId: string; initialFollowing?: boolean; onChange?: (following: boolean) => void }) {
  const { t } = useI18n();
  const currentUserId = getCurrentUserId(getCurrentUser());
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (initialFollowing !== undefined || !currentUserId || currentUserId === targetProfileId) return;
    void getFollowState(targetProfileId).then(setFollowing);
  }, [currentUserId, initialFollowing, targetProfileId]);

  if (currentUserId === targetProfileId) return null;

  async function toggle() {
    if (pending) return;
    if (!currentUserId) {
      window.location.href = `/login?message=${encodeURIComponent(t("auth.needName"))}`;
      return;
    }
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      if (next) await followProfile(targetProfileId);
      else await unfollowProfile(targetProfileId);
      onChange?.(next);
    } catch (error) {
      setFollowing(!next);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("PROFILE_SESSION")) window.location.href = `/login?message=${encodeURIComponent(t("auth.secureSessionRequired"))}`;
    } finally {
      setPending(false);
    }
  }

  return (
    <button aria-pressed={following} className={`app-button min-w-24 ${following ? "border border-line bg-white/[0.04] text-muted" : "bg-acid text-ink"}`} disabled={pending} onClick={toggle} type="button">
      {following ? t("follow.following") : t("follow.follow")}
    </button>
  );
}
