import assert from "node:assert/strict";
import test from "node:test";

import { groupCommentThread, insertComment, removeCommentBranch } from "../lib/comment-thread.ts";

type TestComment = {
  id: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  reply_to_user_id?: string | null;
  reply_to_username?: string | null;
  like_count: number;
  created_at: string;
};

const newestFirstByLikes = (a: TestComment, b: TestComment) =>
  b.like_count - a.like_count || Date.parse(b.created_at) - Date.parse(a.created_at);

test("groups replies to replies under one root in chronological order", () => {
  const root: TestComment = {
    id: "root",
    parent_comment_id: null,
    root_comment_id: null,
    like_count: 2,
    created_at: "2026-01-03T00:00:00Z"
  };
  const first: TestComment = {
    id: "first",
    parent_comment_id: "root",
    root_comment_id: "root",
    reply_to_user_id: "root-author",
    reply_to_username: "根评论作者",
    like_count: 0,
    created_at: "2026-01-03T01:00:00Z"
  };
  const second: TestComment = {
    id: "second",
    parent_comment_id: "first",
    root_comment_id: "root",
    reply_to_user_id: "first-author",
    reply_to_username: "第一位回复者",
    like_count: 0,
    created_at: "2026-01-03T02:00:00Z"
  };

  const grouped = groupCommentThread([second, root, first], newestFirstByLikes);

  assert.deepEqual(grouped.roots.map((item) => item.id), ["root"]);
  assert.deepEqual(grouped.repliesByRoot.root.map((item) => item.id), ["first", "second"]);
  assert.equal(grouped.repliesByRoot.root[1].reply_to_user_id, "first-author");
  assert.equal(grouped.repliesByRoot.root[1].reply_to_username, "第一位回复者");
});

test("sorts root comments with the existing likes-first comparator", () => {
  const olderPopular: TestComment = {
    id: "popular",
    parent_comment_id: null,
    root_comment_id: null,
    like_count: 5,
    created_at: "2026-01-01T00:00:00Z"
  };
  const newer: TestComment = {
    id: "newer",
    parent_comment_id: null,
    root_comment_id: null,
    like_count: 1,
    created_at: "2026-01-02T00:00:00Z"
  };

  const grouped = groupCommentThread([newer, olderPopular], newestFirstByLikes);

  assert.deepEqual(grouped.roots.map((item) => item.id), ["popular", "newer"]);
});

test("inserts a returned reply without duplicating a realtime copy", () => {
  const reply: TestComment = {
    id: "reply",
    parent_comment_id: "root",
    root_comment_id: "root",
    like_count: 0,
    created_at: "2026-01-03T01:00:00Z"
  };

  assert.equal(insertComment(insertComment([], reply), reply).length, 1);
});

test("removes only a reply or a complete root branch", () => {
  const rows: TestComment[] = [
    {
      id: "root",
      parent_comment_id: null,
      root_comment_id: null,
      like_count: 0,
      created_at: "2026-01-03T00:00:00Z"
    },
    {
      id: "reply",
      parent_comment_id: "root",
      root_comment_id: "root",
      like_count: 0,
      created_at: "2026-01-03T01:00:00Z"
    }
  ];

  assert.deepEqual(removeCommentBranch(rows, "reply").map((item) => item.id), ["root"]);
  assert.deepEqual(removeCommentBranch(rows, "root"), []);
});
