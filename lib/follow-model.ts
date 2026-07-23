export function isSelfFollow(currentUserId: string | null | undefined, targetId: string) {
  return Boolean(currentUserId && currentUserId === targetId);
}

export function uniqueFollowingIds(ids: readonly string[]) {
  return [...new Set(ids)];
}

export function addFollowingId(ids: readonly string[], currentUserId: string, targetId: string) {
  if (isSelfFollow(currentUserId, targetId)) throw new Error("FOLLOW_SELF_FORBIDDEN");
  return uniqueFollowingIds([...ids, targetId]);
}

export function removeFollowingId(ids: readonly string[], targetId: string) {
  return uniqueFollowingIds(ids).filter((id) => id !== targetId);
}

export function filterFollowingPosts<T extends { user_id: string }>(posts: readonly T[], followingIds: readonly string[]) {
  const followed = new Set(followingIds);
  return posts.filter((post) => followed.has(post.user_id));
}
