import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260722000000_comments_follows_sessions.sql", import.meta.url);

test("follows table prevents self and duplicate relationships", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create table if not exists public\.follows/i);
  assert.match(sql, /primary key \(follower_id, following_id\)/i);
  assert.match(sql, /constraint follows_not_self check \(follower_id <> following_id\)/i);
  assert.match(sql, /alter table public\.follows enable row level security/i);
});

test("follow mutations derive the caller from a private session", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create or replace function public\.follow_profile\(session_token text, target_profile_id uuid\)/i);
  assert.match(sql, /actor_uuid := private\.require_profile_session\(session_token\)/i);
  assert.match(sql, /on conflict \(follower_id, following_id\) do nothing/i);
  assert.match(sql, /revoke insert, update, delete on public\.follows from anon, authenticated/i);
  assert.match(sql, /create or replace function public\.unfollow_profile/i);
  assert.doesNotMatch(sql, /grant (insert|delete).*public\.follows/i);
});
