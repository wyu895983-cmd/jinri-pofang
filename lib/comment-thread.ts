export type ThreadComment = {
  id: string;
  parent_comment_id?: string | null;
  root_comment_id?: string | null;
  created_at: string;
};

export function getCommentRootId(comment: ThreadComment) {
  return comment.root_comment_id ?? comment.parent_comment_id ?? null;
}

export function groupCommentThread<T extends ThreadComment>(comments: T[], rootComparator: (a: T, b: T) => number) {
  const roots = comments.filter((comment) => !comment.parent_comment_id).sort(rootComparator);
  const repliesByRoot: Record<string, T[]> = {};

  for (const comment of comments) {
    const rootId = getCommentRootId(comment);
    if (!rootId) continue;
    repliesByRoot[rootId] = [...(repliesByRoot[rootId] ?? []), comment].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
    );
  }

  return { roots, repliesByRoot };
}

export function insertComment<T extends ThreadComment>(comments: T[], next: T) {
  return comments.some((comment) => comment.id === next.id) ? comments : [...comments, next];
}

export function removeCommentBranch<T extends ThreadComment>(comments: T[], commentId: string) {
  const target = comments.find((comment) => comment.id === commentId);
  if (!target) return comments;

  return target.parent_comment_id
    ? comments.filter((comment) => comment.id !== commentId)
    : comments.filter((comment) => comment.id !== commentId && getCommentRootId(comment) !== commentId);
}
