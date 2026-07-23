import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260722000000_comments_follows_sessions.sql", import.meta.url);

async function migrationSql() {
  return readFile(migrationUrl, "utf8");
}

test("stores opaque sessions outside the exposed public schema", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create schema if not exists private/i);
  assert.match(sql, /create table if not exists private\.profile_sessions/i);
  assert.match(sql, /token_hash text not null unique/i);
  assert.match(sql, /digest\(decode\(session_token, 'hex'\), 'sha256'\)/i);
  assert.match(sql, /alter table private\.profile_sessions enable row level security/i);
  assert.match(sql, /revoke all on private\.profile_sessions from public, anon, authenticated/i);
});

test("comment deletion checks comment owner, post owner, and admin in the database", async () => {
  const sql = await migrationSql();

  assert.match(sql, /create or replace function public\.delete_comment/i);
  assert.match(sql, /comment_owner/i);
  assert.match(sql, /post_owner/i);
  assert.match(sql, /actor_is_admin/i);
  assert.match(sql, /if actor_uuid <> comment_owner and actor_uuid <> post_owner and not actor_is_admin/i);
  assert.match(sql, /raise exception using errcode = '42501', message = 'COMMENT_DELETE_FORBIDDEN'/i);
});

test("root deletion counts the full branch and updates post comment_count atomically", async () => {
  const sql = await migrationSql();

  assert.match(sql, /root_comment_id = comment_uuid/i);
  assert.match(sql, /deleted_count/i);
  assert.match(sql, /greatest\(comment_count - deleted_count, 0\)/i);
  assert.match(sql, /for update/i);
});

test("sensitive functions are not executable by PUBLIC", async () => {
  const sql = await migrationSql();

  assert.match(sql, /revoke delete on public\.comments from anon, authenticated/i);
  assert.match(sql, /revoke execute on function public\.delete_comment\(text, uuid\) from public/i);
  assert.match(sql, /revoke execute on function public\.login_or_create_profile_session\(text, text\) from public/i);
  assert.match(sql, /revoke execute on function private\.require_profile_session\(text\) from public, anon, authenticated/i);
});
