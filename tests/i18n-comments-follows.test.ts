import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const i18nUrl = new URL("../lib/i18n.tsx", import.meta.url);

test("reply, deletion, follow, feed, and badge keys exist in all four locales", async () => {
  const source = await readFile(i18nUrl, "utf8");
  const keys = [
    "auth.secureSessionRequired", "post.replyingTo", "post.replyLine", "post.commentDeleted",
    "post.deleteComment", "post.deleteCommentConfirm", "follow.follow", "follow.following",
    "follow.followingCount", "follow.followerCount", "follow.square", "follow.feed",
    "follow.empty", "follow.followedBadge", "profile.notFound"
  ];
  for (const key of keys) {
    const matches = source.match(new RegExp(`"${key.replaceAll(".", "\\.")}"\\s*:`, "g")) ?? [];
    assert.equal(matches.length, 4, `${key} should exist in all four locales`);
  }
});
