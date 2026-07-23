import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260722000000_comments_follows_sessions.sql", import.meta.url);

test("comment migration adds stable two-level reply fields exactly once", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /add column if not exists root_comment_id uuid/i);
  assert.match(sql, /add column if not exists reply_to_user_id uuid/i);
  assert.match(sql, /add column if not exists reply_to_username text/i);
  assert.match(sql, /comments_root_created_at_idx/i);
});

test("create_comment derives the root and stores the actual reply target", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /direct_parent\.root_comment_id/i);
  assert.match(sql, /reply_to_user_id/i);
  assert.match(sql, /reply_to_username/i);
  assert.match(sql, /COMMENT_DELETED/i);
  assert.match(sql, /notify_owner := coalesce\(parent_owner, post_owner\)/i);
});

test("comment_feed exposes reply fields using invoker security", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /with \(security_invoker = true\)/i);
  assert.match(sql, /c\.root_comment_id/i);
  assert.match(sql, /c\.reply_to_user_id/i);
  assert.match(sql, /c\.reply_to_username/i);
});

test("comment_feed preserves existing column order before appending reply fields", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /select\s+c\.id,\s+c\.post_id,\s+c\.user_id,\s+pr\.nickname,\s+pr\.avatar_url,\s+c\.content,\s+c\.sticker_id,\s+c\.like_count,\s+c\.created_at,\s+c\.updated_at,\s+c\.parent_comment_id/i);
});
