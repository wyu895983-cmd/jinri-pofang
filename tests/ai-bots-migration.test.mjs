import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/ai-bots-migration.sql", import.meta.url), "utf8");
const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");

test("defines the idempotent scheduler schema and supporting indexes", () => {
  for (const table of ["ai_posting_daily_state", "ai_posting_slots", "ai_scheduler_logs"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
  }
  assert.match(sql, /add column if not exists pattern_key text/i);
  assert.match(sql, /where status = 'pending'/i);
  assert.match(sql, /posts.*created_at.*where is_ai_post = true/is);
  assert.match(sql, /ai_post_templates\s*\(ai_bot_id,\s*is_active,\s*last_used_at,\s*used_count\)/i);
});

test("centralizes scheduler rules without re-enabling an operator-disabled scheduler", () => {
  assert.match(sql, /ai_auto_posting_config/i);
  for (const key of [
    "quota_bands", "windows", "global_gap_minutes", "bot_gap_minutes",
    "normal_bot_daily_cap", "absolute_bot_daily_cap", "template_cooldown_days",
    "per_window_max", "rare_third_post_probability"
  ]) assert.match(sql, new RegExp(`"${key}"`, "i"));
  assert.match(sql, /values\s*\('ai_auto_posting_enabled',\s*'true'\)\s*on conflict \(key\) do nothing/is);
  assert.match(sql, /values\s*\(\s*'ai_auto_posting_config',[\s\S]*on conflict \(key\) do update/i);
});

test("generates a locked deterministic Shanghai schedule with spaced non-hour slots", () => {
  assert.match(sql, /function public\.ensure_ai_daily_schedule\(p_local_date date\)/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /Asia\/Shanghai/i);
  assert.match(sql, /22:00/i);
  assert.match(sql, /pg_catalog\.generate_series\s*\(/i);
  assert.match(sql, /make_interval\(mins\s*=>\s*v_global_gap_minutes\)/i);
  assert.match(sql, /extract\s*\(\s*minute\s+from/i);
  assert.match(sql, /on conflict \(local_date\) do nothing/i);
  assert.doesNotMatch(sql, /v_attempts/i);
});

test("uses valid PostgreSQL EXTRACT syntax", () => {
  assert.doesNotMatch(sql, /pg_catalog\.extract\s*\(/i);
  assert.match(sql, /(?:^|[^.\w])extract\s*\(\s*epoch\s+from/im);
  assert.match(sql, /(?:^|[^.\w])extract\s*\(\s*minute\s+from/im);
});

test("atomically selects eligible bots and templates using the actual Shanghai post day", () => {
  assert.match(sql, /function public\.create_ai_post_from_pool\(p_slot_id uuid\)/i);
  assert.ok((sql.match(/for update skip locked/gi) ?? []).length >= 2);
  assert.match(sql, /v_post_local_date date := pg_catalog\.timezone\('Asia\/Shanghai',\s*pg_catalog\.now\(\)\)::date/i);
  assert.match(sql, /v_day_start := v_post_local_date::timestamp at time zone 'Asia\/Shanghai'/i);
  assert.match(sql, /v_day_end := \(v_post_local_date \+ 1\)::timestamp at time zone 'Asia\/Shanghai'/i);
  const createStart = sql.search(/create or replace function public\.create_ai_post_from_pool\(/i);
  const createEnd = sql.indexOf("$$;", createStart);
  const createBody = sql.slice(createStart, createEnd);
  assert.doesNotMatch(createBody, /v_day_start := v_slot\.local_date/i);
  assert.match(sql, /make_interval\(mins\s*=>\s*v_bot_gap_minutes\)/i);
  assert.match(sql, /make_interval\(days\s*=>\s*v_template_cooldown_days\)/i);
  assert.match(sql, /<\s*v_absolute_cap/i);
  assert.match(sql, /update public\.ai_post_templates[\s\S]*used_count = used_count \+ 1/i);
});

test("dispatches current and cross-midnight due slots without swallowing database errors", () => {
  assert.match(sql, /function public\.run_ai_auto_posting_tick\(\)/i);
  assert.match(sql, /pg_try_advisory_xact_lock/i);
  assert.match(sql, /s\.local_date in \(v_local_date,\s*v_local_date - 1\)/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /'no_eligible_post'/i);
  assert.doesNotMatch(sql, /exception\s+when\s+others/i);
  assert.match(sql, /on conflict \(slot_id\) do nothing/i);
  for (const key of ["posted", "reason", "slot_id", "post_id", "ai_bot_id"]) {
    assert.match(sql, new RegExp(`'${key}'`, "i"));
  }
});

test("attributes cross-midnight state and posted counts to the selected slot plan", () => {
  assert.match(sql, /where local_date = v_slot\.local_date\s+returning \* into v_state/i);
  assert.match(sql, /from public\.ai_posting_slots posted_slot[\s\S]*posted_slot\.local_date = v_slot\.local_date[\s\S]*posted_slot\.status = 'posted'/i);
  assert.doesNotMatch(sql, /where local_date = v_local_date\s+returning \* into v_state/i);
});

test("rejects AI bot UUIDs across every general profile write path and rotates secrets", () => {
  assert.match(sql, /function public\.assert_human_profile\(profile_uuid uuid\)/i);
  for (const name of ["ensure_daily_profile", "update_profile", "update_profile_language"]) {
    const wrapperStart = sql.search(new RegExp(`create or replace function public\\.${name}\\(`, "i"));
    const wrapperEnd = sql.indexOf("$$;", wrapperStart);
    assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart, `${name} wrapper should exist`);
    assert.match(sql.slice(wrapperStart, wrapperEnd), /perform public\.assert_human_profile\(profile_uuid\)/i);
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\([^;]+\\) from public`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^;]+\\) to anon, authenticated`, "i"));
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}_unchecked\\(`, "i"));
  }
  for (const name of ["create_post", "create_comment", "react_to_post", "react_to_comment"]) {
    const functionStart = schema.search(new RegExp(`function public\\.${name}\\(`, "i"));
    const functionEnd = schema.indexOf("$$;", functionStart);
    assert.ok(functionStart >= 0 && functionEnd > functionStart, `${name} should exist`);
    assert.match(schema.slice(functionStart, functionEnd), /(?:row_profile :=|perform) public\.ensure_daily_profile\(profile_uuid\)/i);
  }
  assert.match(sql, /revoke execute on function public\.add_exp\(uuid,\s*text,\s*integer,\s*integer,\s*uuid,\s*text\) from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /ai-bot-disabled-login/i);
  assert.match(sql, /extensions\.crypt\(pg_catalog\.gen_random_uuid\(\)::text,\s*extensions\.gen_salt\('bf'\)\)/i);
  assert.match(sql, /update public\.profiles bot_profile[\s\S]*pass_hash = extensions\.crypt\(pg_catalog\.gen_random_uuid\(\)::text/i);
  assert.match(sql, /pass_hash = excluded\.pass_hash/i);
});

test("reserves every bot display name and internal nickname from human profile RPCs", () => {
  const guardStart = sql.search(/create or replace function public\.assert_human_nickname\(/i);
  const guardEnd = sql.indexOf("$$;", guardStart);
  const guardBody = sql.slice(guardStart, guardEnd);
  assert.ok(guardStart >= 0 && guardEnd > guardStart, "nickname guard should exist");
  assert.match(guardBody, /pg_catalog\.btrim\(raw_nickname\)/i);
  assert.match(guardBody, /from public\.ai_bots[\s\S]*display_name/i);
  assert.match(schema, /char_length\(clean_nickname\)[\s\S]*char_length\(clean_nickname\) > 12/i);
  assert.match(guardBody, /pg_catalog\.left\(clean_nickname,\s*5\) = '__ai_'/i);

  const loginStart = sql.search(/create or replace function public\.login_or_create_profile\(/i);
  const loginEnd = sql.indexOf("$$;", loginStart);
  assert.match(sql.slice(loginStart, loginEnd), /perform public\.assert_human_nickname\(raw_nickname\)/i);
  assert.match(sql, /revoke execute on function public\.login_or_create_profile_unchecked\(text,\s*text\) from public, anon, authenticated/i);
  assert.match(sql, /revoke execute on function public\.login_or_create_profile\(text,\s*text\) from public/i);
  assert.match(sql, /grant execute on function public\.login_or_create_profile\(text,\s*text\) to anon, authenticated/i);

  const updateStart = sql.search(/create or replace function public\.update_profile\(/i);
  const updateEnd = sql.indexOf("$$;", updateStart);
  assert.match(sql.slice(updateStart, updateEnd), /perform public\.assert_human_nickname\(raw_nickname\)/i);

  const createStart = sql.search(/create or replace function public\.create_ai_post_from_pool\(/i);
  const createEnd = sql.indexOf("$$;", createStart);
  const createBody = sql.slice(createStart, createEnd);
  assert.match(createBody, /'__ai_'\s*\|\|\s*pg_catalog\.substr\(pg_catalog\.md5\(v_bot\.id::text\),\s*1,\s*7\)/i);
  assert.doesNotMatch(createBody, /values\s*\(\s*v_bot\.id,\s*v_bot\.display_name/i);
});

test("locks down internal tables, sensitive bot columns, and every AI function", () => {
  for (const table of [
    "ai_bots", "ai_post_templates", "app_settings", "ai_posting_daily_state",
    "ai_posting_slots", "ai_scheduler_logs"
  ]) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  assert.doesNotMatch(sql, /create policy "ai templates are readable"/i);
  assert.match(sql, /revoke all on table public\.ai_bots from anon, authenticated/i);
  assert.match(sql, /revoke select \([\s\S]*persona_type[\s\S]*is_active[\s\S]*\) on public\.ai_bots from anon, authenticated/i);
  assert.match(sql, /grant select \([^)]*display_name[^)]*avatar_url[^)]*display_label[^)]*\) on public\.ai_bots to anon, authenticated/is);
  assert.match(sql, /revoke all on table public\.ai_post_templates from anon, authenticated/i);
  assert.match(sql, /revoke execute on function public\.ensure_ai_daily_schedule\(date\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.run_ai_auto_posting_tick\(\) to postgres, service_role/i);
});

test("installs one minutely pg_cron job through supported APIs", () => {
  assert.match(sql, /create extension if not exists pg_cron/i);
  assert.match(sql, /cron\.unschedule\(jobid\)/i);
  assert.match(sql, /cron\.schedule\s*\(\s*'jinri_pofang_ai_auto_posting_minutely'\s*,\s*'\* \* \* \* \*'\s*,\s*'select public\.run_ai_auto_posting_tick\(\);'/is);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+cron\.job/i);
});
test("uses valid PostgreSQL LEAST syntax", () => {
  assert.doesNotMatch(sql, /pg_catalog\.least\s*\(/i);
  assert.match(sql, /(?:^|[^.\w])least\s*\(\s*v_per_window_max\s*,\s*2\s*\)/im);
  assert.match(sql, /(?:^|[^.\w])least\s*\(\s*current_target\s*,\s*v_band_target_cap\s*\)/im);
});