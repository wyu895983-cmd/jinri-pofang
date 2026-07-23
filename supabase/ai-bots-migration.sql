-- AI bots migration for Jinri Pofang China.
-- Safe to run multiple times. Contains only AI bot tables, post markers, settings, indexes, policies, and RPC.

create extension if not exists pgcrypto;

create table if not exists public.ai_bots (
  id uuid primary key,
  display_name text not null,
  avatar_url text not null default '/brand-mark.svg',
  persona_type text not null,
  persona_desc text not null,
  tone text not null,
  topics text[] not null default '{}',
  display_label text not null default 'AI_BOT',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ai_bots
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists persona_type text,
  add column if not exists persona_desc text,
  add column if not exists tone text,
  add column if not exists topics text[],
  add column if not exists display_label text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz;

alter table public.ai_bots
  alter column avatar_url set default '/brand-mark.svg',
  alter column topics set default '{}',
  alter column display_label set default 'AI_BOT',
  alter column is_active set default true,
  alter column created_at set default now();

update public.ai_bots
set avatar_url = coalesce(avatar_url, '/brand-mark.svg'),
    topics = coalesce(topics, '{}'),
    display_label = coalesce(display_label, 'AI_BOT'),
    is_active = coalesce(is_active, true),
    created_at = coalesce(created_at, now());

alter table public.ai_bots
  alter column display_name set not null,
  alter column avatar_url set not null,
  alter column persona_type set not null,
  alter column persona_desc set not null,
  alter column tone set not null,
  alter column topics set not null,
  alter column display_label set not null,
  alter column is_active set not null,
  alter column created_at set not null;

create unique index if not exists ai_bots_display_name_idx on public.ai_bots(display_name);

create or replace function public.assert_human_profile(profile_uuid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.ai_bots bot where bot.id = profile_uuid
  ) then
    raise exception using
      errcode = '42501',
      message = 'AI bot profiles cannot be used by general user RPCs';
  end if;
end;
$$;

create or replace function public.assert_human_nickname(raw_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_nickname text := pg_catalog.btrim(raw_nickname);
begin
  if pg_catalog.left(clean_nickname, 5) = '__ai_'
    or exists (
      select 1
      from public.ai_bots bot
      where bot.display_name = clean_nickname
    )
  then
    raise exception using
      errcode = '42501',
      message = 'AI bot nicknames are reserved';
  end if;
end;
$$;

do $$
begin
  if pg_catalog.to_regprocedure('public.login_or_create_profile_unchecked(text,text)') is null then
    alter function public.login_or_create_profile(text, text) rename to login_or_create_profile_unchecked;
  end if;
  if pg_catalog.to_regprocedure('public.ensure_daily_profile_unchecked(uuid)') is null then
    alter function public.ensure_daily_profile(uuid) rename to ensure_daily_profile_unchecked;
  end if;
  if pg_catalog.to_regprocedure('public.update_profile_unchecked(uuid,text,text)') is null then
    alter function public.update_profile(uuid, text, text) rename to update_profile_unchecked;
  end if;
  if pg_catalog.to_regprocedure('public.update_profile_language_unchecked(uuid,text)') is null then
    alter function public.update_profile_language(uuid, text) rename to update_profile_language_unchecked;
  end if;
end;
$$;

create or replace function public.login_or_create_profile(raw_nickname text, raw_passphrase text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_human_nickname(raw_nickname);
  return public.login_or_create_profile_unchecked(raw_nickname, raw_passphrase);
end;
$$;
create or replace function public.ensure_daily_profile(profile_uuid uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_human_profile(profile_uuid);
  return public.ensure_daily_profile_unchecked(profile_uuid);
end;
$$;

create or replace function public.update_profile(
  profile_uuid uuid,
  raw_nickname text default null,
  raw_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_human_nickname(raw_nickname);
  perform public.assert_human_profile(profile_uuid);
  return public.update_profile_unchecked(profile_uuid, raw_nickname, raw_avatar_url);
end;
$$;

create or replace function public.update_profile_language(profile_uuid uuid, next_language text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_human_profile(profile_uuid);
  return public.update_profile_language_unchecked(profile_uuid, next_language);
end;
$$;

revoke execute on function public.assert_human_profile(uuid) from public, anon, authenticated;
revoke execute on function public.assert_human_nickname(text) from public, anon, authenticated;
revoke execute on function public.login_or_create_profile(text, text) from public;
revoke execute on function public.ensure_daily_profile(uuid) from public;
revoke execute on function public.update_profile(uuid, text, text) from public;
revoke execute on function public.update_profile_language(uuid, text) from public;
grant execute on function public.login_or_create_profile(text, text) to anon, authenticated;
grant execute on function public.ensure_daily_profile(uuid) to anon, authenticated;
grant execute on function public.update_profile(uuid, text, text) to anon, authenticated;
grant execute on function public.update_profile_language(uuid, text) to anon, authenticated;
revoke execute on function public.login_or_create_profile_unchecked(text, text) from public, anon, authenticated;
revoke execute on function public.ensure_daily_profile_unchecked(uuid) from public, anon, authenticated;
revoke execute on function public.update_profile_unchecked(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.update_profile_language_unchecked(uuid, text) from public, anon, authenticated;
revoke execute on function public.add_exp(uuid, text, integer, integer, uuid, text) from public, anon, authenticated;

update public.profiles bot_profile
set pass_hash = extensions.crypt(pg_catalog.gen_random_uuid()::text, extensions.gen_salt('bf')),
    updated_at = pg_catalog.now()
where exists (
  select 1 from public.ai_bots bot where bot.id = bot_profile.id
);

create table if not exists public.ai_post_templates (
  id uuid primary key default gen_random_uuid(),
  ai_bot_id uuid not null references public.ai_bots(id) on delete cascade,
  content text not null,
  pattern_key text not null default 'general',
  is_active boolean not null default true,
  used_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_post_templates
  add column if not exists ai_bot_id uuid,
  add column if not exists content text,
  add column if not exists pattern_key text,
  add column if not exists is_active boolean,
  add column if not exists used_count integer,
  add column if not exists last_used_at timestamptz,
  add column if not exists created_at timestamptz;

alter table public.ai_post_templates
  alter column id set default gen_random_uuid(),
  alter column pattern_key set default 'general',
  alter column is_active set default true,
  alter column used_count set default 0,
  alter column created_at set default now();

update public.ai_post_templates
set pattern_key = coalesce(nullif(pattern_key, ''), 'general'),
    is_active = coalesce(is_active, true),
    used_count = coalesce(used_count, 0),
    created_at = coalesce(created_at, now());

alter table public.ai_post_templates
  alter column ai_bot_id set not null,
  alter column content set not null,
  alter column pattern_key set not null,
  alter column is_active set not null,
  alter column used_count set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_post_templates_ai_bot_id_fkey'
      and conrelid = 'public.ai_post_templates'::regclass
  ) then
    alter table public.ai_post_templates
      add constraint ai_post_templates_ai_bot_id_fkey
      foreign key (ai_bot_id) references public.ai_bots(id) on delete cascade;
  end if;
end;
$$;

create unique index if not exists ai_post_templates_bot_content_idx on public.ai_post_templates(ai_bot_id, content);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings
  add column if not exists value text,
  add column if not exists updated_at timestamptz;

alter table public.app_settings
  alter column updated_at set default now();

insert into public.app_settings(key, value)
values ('ai_auto_posting_enabled', 'true')
on conflict (key) do nothing;

insert into public.app_settings(key, value)
values (
  'ai_auto_posting_config',
  '{
    "quota_bands": [
      {"key":"quiet","real_min":0,"real_max":4,"target_min":6,"target_max":8},
      {"key":"steady","real_min":5,"real_max":14,"target_min":4,"target_max":6},
      {"key":"busy","real_min":15,"real_max":29,"target_min":2,"target_max":4},
      {"key":"organic","real_min":30,"real_max":null,"target_min":0,"target_max":2}
    ],
    "windows": [
      {"key":"morning","start":"08:00","end":"10:00"},
      {"key":"midday","start":"12:00","end":"14:00"},
      {"key":"evening","start":"18:00","end":"20:00"},
      {"key":"late","start":"22:00","end":"01:00"}
    ],
    "global_gap_minutes":30,
    "bot_gap_minutes":240,
    "normal_bot_daily_cap":2,
    "absolute_bot_daily_cap":3,
    "template_cooldown_days":30,
    "per_window_max":2,
    "rare_third_post_probability":0.1
  }'
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

alter table public.posts
  add column if not exists is_ai_post boolean,
  add column if not exists ai_bot_id uuid;

alter table public.posts
  alter column is_ai_post set default false;

update public.posts
set is_ai_post = false
where is_ai_post is null;

alter table public.posts
  alter column is_ai_post set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_ai_bot_id_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_ai_bot_id_fkey
      foreign key (ai_bot_id) references public.ai_bots(id) on delete set null;
  end if;
end;
$$;

revoke insert, update on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;

create table if not exists public.ai_posting_daily_state (
  local_date date primary key,
  activity_band text not null,
  initial_target integer not null check (initial_target between 0 and 8),
  current_target integer not null check (current_target between 0 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_posting_slots (
  id uuid primary key default gen_random_uuid(),
  local_date date not null references public.ai_posting_daily_state(local_date) on delete cascade,
  window_key text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'posted', 'skipped')),
  post_id uuid references public.posts(id) on delete set null,
  processed_at timestamptz,
  unique (local_date, scheduled_for)
);

create table if not exists public.ai_scheduler_logs (
  id bigint generated always as identity primary key,
  slot_id uuid not null references public.ai_posting_slots(id) on delete cascade,
  result text not null,
  ai_bot_id uuid references public.ai_bots(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (slot_id)
);

create index if not exists ai_posting_slots_pending_scheduled_idx
  on public.ai_posting_slots(scheduled_for)
  where status = 'pending';
create index if not exists ai_posting_slots_post_id_idx
  on public.ai_posting_slots(post_id) where post_id is not null;
create index if not exists posts_ai_created_idx
  on public.posts(created_at desc) where is_ai_post = true;
create index if not exists posts_ai_bot_created_idx
  on public.posts(ai_bot_id, created_at desc) where is_ai_post = true;
create index if not exists ai_post_templates_bot_active_usage_idx
  on public.ai_post_templates(ai_bot_id, is_active, last_used_at, used_count);
create index if not exists ai_scheduler_logs_bot_id_idx
  on public.ai_scheduler_logs(ai_bot_id) where ai_bot_id is not null;
create index if not exists ai_scheduler_logs_post_id_idx
  on public.ai_scheduler_logs(post_id) where post_id is not null;

drop function if exists public.create_ai_post_from_pool();

create or replace function public.ensure_ai_daily_schedule(p_local_date date)
returns public.ai_posting_daily_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config jsonb;
  v_band jsonb;
  v_window jsonb;
  v_state public.ai_posting_daily_state%rowtype;
  v_real_count integer;
  v_target integer;
  v_slots_created integer := 0;
  v_per_window_max integer;
  v_global_gap_minutes integer;
  v_window_start timestamp;
  v_window_end timestamp;
  v_candidate timestamptz;
begin
  if p_local_date is null then
    raise exception 'local date is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ai_daily_schedule:' || p_local_date::text, 0)
  );

  select s.* into v_state
  from public.ai_posting_daily_state s
  where s.local_date = p_local_date;
  if found then
    return v_state;
  end if;

  select value::jsonb into strict v_config
  from public.app_settings
  where key = 'ai_auto_posting_config';
  v_per_window_max := (v_config ->> 'per_window_max')::integer;
  v_global_gap_minutes := (v_config ->> 'global_gap_minutes')::integer;

  select pg_catalog.count(*)::integer into v_real_count
  from public.posts p
  where p.is_ai_post = false
    and p.created_at >= (p_local_date::timestamp at time zone 'Asia/Shanghai')
    and p.created_at < ((p_local_date + 1)::timestamp at time zone 'Asia/Shanghai');

  select band into strict v_band
  from pg_catalog.jsonb_array_elements(v_config -> 'quota_bands') band
  where v_real_count >= (band ->> 'real_min')::integer
    and ((band ->> 'real_max') is null or v_real_count <= (band ->> 'real_max')::integer)
  limit 1;

  v_target := (v_band ->> 'target_min')::integer
    + pg_catalog.floor(
        pg_catalog.random() * (
          (v_band ->> 'target_max')::integer - (v_band ->> 'target_min')::integer + 1
        )
      )::integer;

  insert into public.ai_posting_daily_state(local_date, activity_band, initial_target, current_target)
  values (p_local_date, v_band ->> 'key', v_target, v_target)
  on conflict (local_date) do nothing;

  while v_slots_created < v_target loop
    select candidate into v_window
    from pg_catalog.jsonb_array_elements(v_config -> 'windows') candidate
    where (
      select pg_catalog.count(*)
      from public.ai_posting_slots existing
      where existing.local_date = p_local_date
        and existing.window_key = candidate ->> 'key'
    ) < least(v_per_window_max, 2)
    order by pg_catalog.random()
    limit 1;

    exit when v_window is null;

    v_window_start := p_local_date::timestamp + (v_window ->> 'start')::time;
    v_window_end := p_local_date::timestamp + (v_window ->> 'end')::time;
    if v_window_end <= v_window_start then
      v_window_end := v_window_end + interval '1 day'; -- 22:00 to next-day 01:00
    end if;

    select (
      v_window_start
      + minute_offset * interval '1 minute'
    ) at time zone 'Asia/Shanghai'
    into v_candidate
    from pg_catalog.generate_series(
      1,
      (extract(epoch from (v_window_end - v_window_start)) / 60)::integer - 1
    ) minute_offset
    where extract(
      minute from v_window_start + minute_offset * interval '1 minute'
    ) <> 0
      and not exists (
        select 1
        from public.ai_posting_slots existing
        where existing.local_date = p_local_date
          and pg_catalog.abs(extract(epoch from (existing.scheduled_for - (
            v_window_start + minute_offset * interval '1 minute'
          ) at time zone 'Asia/Shanghai'))) <
            extract(epoch from pg_catalog.make_interval(mins => v_global_gap_minutes))
      )
    order by pg_catalog.random()
    limit 1;

    if v_candidate is null then
      raise exception 'Unable to fill AI posting target for %', p_local_date;
    end if;

    insert into public.ai_posting_slots(local_date, window_key, scheduled_for)
    values (p_local_date, v_window ->> 'key', v_candidate)
    on conflict (local_date, scheduled_for) do nothing;
    if not found then
      raise exception 'Duplicate AI posting slot for %', p_local_date;
    end if;
    v_slots_created := v_slots_created + 1;
  end loop;

  select s.* into strict v_state
  from public.ai_posting_daily_state s
  where s.local_date = p_local_date;
  return v_state;
end;
$$;

create or replace function public.create_ai_post_from_pool(p_slot_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config jsonb;
  v_slot public.ai_posting_slots%rowtype;
  v_bot public.ai_bots%rowtype;
  v_template public.ai_post_templates%rowtype;
  v_post public.posts%rowtype;
  v_post_local_date date := pg_catalog.timezone('Asia/Shanghai', pg_catalog.now())::date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_bot_gap_minutes integer;
  v_normal_cap integer;
  v_absolute_cap integer;
  v_template_cooldown_days integer;
  v_rare_third_probability double precision;
begin
  select s.* into v_slot
  from public.ai_posting_slots s
  where s.id = p_slot_id
    and s.status = 'pending'
    and s.scheduled_for <= pg_catalog.now()
  for update skip locked;
  if not found then
    raise exception 'Slot is not due or is already claimed';
  end if;

  select value::jsonb into strict v_config
  from public.app_settings
  where key = 'ai_auto_posting_config';
  v_bot_gap_minutes := (v_config ->> 'bot_gap_minutes')::integer;
  v_normal_cap := (v_config ->> 'normal_bot_daily_cap')::integer;
  v_absolute_cap := (v_config ->> 'absolute_bot_daily_cap')::integer;
  v_template_cooldown_days := (v_config ->> 'template_cooldown_days')::integer;
  v_rare_third_probability := (v_config ->> 'rare_third_post_probability')::double precision;
  v_day_start := v_post_local_date::timestamp at time zone 'Asia/Shanghai';
  v_day_end := (v_post_local_date + 1)::timestamp at time zone 'Asia/Shanghai';

  select b.* into v_bot
  from public.ai_bots b
  where b.is_active = true
    and not exists (
      select 1 from public.posts recent
      where recent.is_ai_post = true
        and recent.ai_bot_id = b.id
        and recent.created_at > pg_catalog.now() - pg_catalog.make_interval(mins => v_bot_gap_minutes)
    )
    and (
      select pg_catalog.count(*)
      from public.posts daily
      where daily.is_ai_post = true
        and daily.ai_bot_id = b.id
        and daily.created_at >= v_day_start
        and daily.created_at < v_day_end
    ) < v_absolute_cap
    and (
      (
        select pg_catalog.count(*)
        from public.posts daily
        where daily.is_ai_post = true
          and daily.ai_bot_id = b.id
          and daily.created_at >= v_day_start
          and daily.created_at < v_day_end
      ) < v_normal_cap
      or pg_catalog.random() < v_rare_third_probability
    )
  order by (
    select pg_catalog.count(*)
    from public.posts daily
    where daily.is_ai_post = true
      and daily.ai_bot_id = b.id
      and daily.created_at >= v_day_start
      and daily.created_at < v_day_end
  ), pg_catalog.random()
  limit 1
  for update of b skip locked;
  if not found then
    return null;
  end if;

  select t.* into v_template
  from public.ai_post_templates t
  where t.ai_bot_id = v_bot.id
    and t.is_active = true
    and (t.last_used_at is null or t.last_used_at <= pg_catalog.now() - pg_catalog.make_interval(days => v_template_cooldown_days))
    and t.pattern_key is distinct from (
      select recent_template.pattern_key
      from public.posts recent_post
      join public.ai_post_templates recent_template
        on recent_template.ai_bot_id = recent_post.ai_bot_id
       and recent_template.content = recent_post.content
      where recent_post.is_ai_post = true
        and recent_post.ai_bot_id = v_bot.id
      order by recent_post.created_at desc
      limit 1
    )
  order by t.used_count, t.last_used_at nulls first, pg_catalog.random()
  limit 1
  for update of t skip locked;
  if not found then
    return null;
  end if;

  insert into public.profiles(id, nickname, pass_hash, avatar_url, total_posts, updated_at)
  values (
    v_bot.id,
    '__ai_' || pg_catalog.substr(pg_catalog.md5(v_bot.id::text), 1, 7),
    extensions.crypt(pg_catalog.gen_random_uuid()::text, extensions.gen_salt('bf')),
    v_bot.avatar_url,
    0,
    pg_catalog.now()
  )
  on conflict (id) do update
  set nickname = excluded.nickname,
      pass_hash = excluded.pass_hash,
      avatar_url = excluded.avatar_url,
      updated_at = pg_catalog.now();

  insert into public.posts(user_id, content, sticker_id, is_ai_post, ai_bot_id)
  values (v_bot.id, v_template.content, null, true, v_bot.id)
  returning * into v_post;

  update public.ai_post_templates
  set used_count = used_count + 1,
      last_used_at = pg_catalog.now()
  where id = v_template.id;

  update public.profiles
  set total_posts = total_posts + 1,
      updated_at = pg_catalog.now()
  where id = v_bot.id;

  return v_post;
end;
$$;

create or replace function public.run_ai_auto_posting_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled text;
  v_config jsonb;
  v_local_date date := pg_catalog.timezone('Asia/Shanghai', pg_catalog.now())::date;
  v_state public.ai_posting_daily_state%rowtype;
  v_slot public.ai_posting_slots%rowtype;
  v_post public.posts%rowtype;
  v_band jsonb;
  v_real_count integer;
  v_ai_count integer;
  v_band_target_cap integer;
  v_global_gap_minutes integer;
  v_per_window_max integer;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  select value into v_enabled
  from public.app_settings
  where key = 'ai_auto_posting_enabled';
  if coalesce(v_enabled, 'true') <> 'true' then
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'disabled', 'slot_id', null, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('ai_auto_posting_tick', 0)) then
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'already_running', 'slot_id', null, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  select value::jsonb into strict v_config
  from public.app_settings
  where key = 'ai_auto_posting_config';
  v_global_gap_minutes := (v_config ->> 'global_gap_minutes')::integer;
  v_per_window_max := (v_config ->> 'per_window_max')::integer;
  perform public.ensure_ai_daily_schedule(v_local_date);

  select s.* into v_slot
  from public.ai_posting_slots s
  where s.local_date in (v_local_date, v_local_date - 1)
    and s.status = 'pending'
    and s.scheduled_for <= pg_catalog.now()
  order by s.scheduled_for
  limit 1
  for update skip locked;
  if not found then
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'no_due_slot', 'slot_id', null, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  v_day_start := v_slot.local_date::timestamp at time zone 'Asia/Shanghai';
  v_day_end := (v_slot.local_date + 1)::timestamp at time zone 'Asia/Shanghai';

  select pg_catalog.count(*)::integer into v_real_count
  from public.posts p
  where p.is_ai_post = false
    and p.created_at >= v_day_start
    and p.created_at < v_day_end;

  select band into strict v_band
  from pg_catalog.jsonb_array_elements(v_config -> 'quota_bands') band
  where v_real_count >= (band ->> 'real_min')::integer
    and ((band ->> 'real_max') is null or v_real_count <= (band ->> 'real_max')::integer)
  limit 1;
  v_band_target_cap := (v_band ->> 'target_max')::integer;

  update public.ai_posting_daily_state
  set activity_band = v_band ->> 'key',
      current_target = least(current_target, v_band_target_cap),
      updated_at = pg_catalog.now()
  where local_date = v_slot.local_date
  returning * into v_state;

  select pg_catalog.count(*)::integer into v_ai_count
  from public.ai_posting_slots posted_slot
  where posted_slot.local_date = v_slot.local_date
    and posted_slot.status = 'posted';
  if v_ai_count >= v_state.current_target then
    update public.ai_posting_slots
    set status = 'skipped', processed_at = pg_catalog.now()
    where id = v_slot.id;
    insert into public.ai_scheduler_logs(slot_id, result, details)
    values (v_slot.id, 'target_reached', pg_catalog.jsonb_build_object('target', v_state.current_target))
    on conflict (slot_id) do nothing;
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'target_reached', 'slot_id', v_slot.id, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  if exists (
    select 1 from public.posts recent
    where recent.is_ai_post = true
      and recent.created_at > pg_catalog.now() - pg_catalog.make_interval(mins => v_global_gap_minutes)
  ) then
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'global_gap', 'slot_id', v_slot.id, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  if (
    select pg_catalog.count(*)
    from public.ai_posting_slots posted_slot
    where posted_slot.local_date = v_slot.local_date
      and posted_slot.window_key = v_slot.window_key
      and posted_slot.status = 'posted'
  ) >= v_per_window_max then
    update public.ai_posting_slots
    set status = 'skipped', processed_at = pg_catalog.now()
    where id = v_slot.id;
    insert into public.ai_scheduler_logs(slot_id, result, details)
    values (v_slot.id, 'window_cap_reached', pg_catalog.jsonb_build_object('window_key', v_slot.window_key))
    on conflict (slot_id) do nothing;
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'window_cap_reached', 'slot_id', v_slot.id, 'post_id', null, 'ai_bot_id', null
    );
  end if;

  v_post := public.create_ai_post_from_pool(v_slot.id);
  if v_post.id is null then
    update public.ai_posting_slots
    set status = 'skipped', processed_at = pg_catalog.now()
    where id = v_slot.id;
    insert into public.ai_scheduler_logs(slot_id, result, details)
    values (v_slot.id, 'no_eligible_post', '{}'::jsonb)
    on conflict (slot_id) do nothing;
    return pg_catalog.jsonb_build_object(
      'posted', false, 'reason', 'no_eligible_post', 'slot_id', v_slot.id,
      'post_id', null, 'ai_bot_id', null
    );
  end if;

  update public.ai_posting_slots
  set status = 'posted', post_id = v_post.id, processed_at = pg_catalog.now()
  where id = v_slot.id;
  insert into public.ai_scheduler_logs(slot_id, result, ai_bot_id, post_id)
  values (v_slot.id, 'posted', v_post.ai_bot_id, v_post.id)
  on conflict (slot_id) do nothing;

  return pg_catalog.jsonb_build_object(
    'posted', true, 'reason', 'posted', 'slot_id', v_slot.id,
    'post_id', v_post.id, 'ai_bot_id', v_post.ai_bot_id
  );
end;
$$;

alter table public.ai_bots enable row level security;
alter table public.ai_post_templates enable row level security;
alter table public.app_settings enable row level security;
alter table public.ai_posting_daily_state enable row level security;
alter table public.ai_posting_slots enable row level security;
alter table public.ai_scheduler_logs enable row level security;

drop policy if exists "ai bots are readable" on public.ai_bots;
create policy "ai bots are readable" on public.ai_bots
  for select to anon, authenticated using (true);
drop policy if exists "ai templates are readable" on public.ai_post_templates;

revoke all on table public.ai_bots from anon, authenticated;
revoke select (
  id, display_name, avatar_url, persona_type, persona_desc, tone, topics, display_label, is_active, created_at
) on public.ai_bots from anon, authenticated;
grant select (id, display_name, avatar_url, display_label) on public.ai_bots to anon, authenticated;
revoke all on table public.ai_post_templates from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.ai_posting_daily_state from anon, authenticated;
revoke all on table public.ai_posting_slots from anon, authenticated;
revoke all on table public.ai_scheduler_logs from anon, authenticated;
revoke all on sequence public.ai_scheduler_logs_id_seq from public, anon, authenticated;

revoke execute on function public.ensure_ai_daily_schedule(date) from public, anon, authenticated;
revoke execute on function public.create_ai_post_from_pool(uuid) from public, anon, authenticated;
revoke execute on function public.run_ai_auto_posting_tick() from public, anon, authenticated;
grant execute on function public.run_ai_auto_posting_tick() to postgres, service_role;

create extension if not exists pg_cron;
select cron.unschedule(jobid)
from cron.job
where jobname = 'jinri_pofang_ai_auto_posting_minutely';
select cron.schedule(
  'jinri_pofang_ai_auto_posting_minutely',
  '* * * * *',
  'select public.run_ai_auto_posting_tick();'
);
