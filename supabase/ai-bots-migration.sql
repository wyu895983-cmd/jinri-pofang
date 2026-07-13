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

create table if not exists public.ai_post_templates (
  id uuid primary key default gen_random_uuid(),
  ai_bot_id uuid not null references public.ai_bots(id) on delete cascade,
  content text not null,
  is_active boolean not null default true,
  used_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_post_templates
  add column if not exists ai_bot_id uuid,
  add column if not exists content text,
  add column if not exists is_active boolean,
  add column if not exists used_count integer,
  add column if not exists last_used_at timestamptz,
  add column if not exists created_at timestamptz;

alter table public.ai_post_templates
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column used_count set default 0,
  alter column created_at set default now();

update public.ai_post_templates
set is_active = coalesce(is_active, true),
    used_count = coalesce(used_count, 0),
    created_at = coalesce(created_at, now());

alter table public.ai_post_templates
  alter column ai_bot_id set not null,
  alter column content set not null,
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

create index if not exists posts_ai_bot_created_idx on public.posts(ai_bot_id, created_at desc) where is_ai_post = true;
create index if not exists ai_post_templates_bot_active_idx on public.ai_post_templates(ai_bot_id, is_active, last_used_at);

alter table public.ai_bots enable row level security;
alter table public.ai_post_templates enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "ai bots are readable" on public.ai_bots;
create policy "ai bots are readable" on public.ai_bots for select using (true);

drop policy if exists "ai templates are readable" on public.ai_post_templates;
create policy "ai templates are readable" on public.ai_post_templates for select using (true);

create or replace function public.create_ai_post_from_pool()
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  setting_value text;
  chosen_bot public.ai_bots;
  chosen_template public.ai_post_templates;
  row_post public.posts;
  today_ai_total integer := 0;
  today_real_total integer := 0;
  max_ai_posts_today integer := 15;
begin
  select value into setting_value
  from public.app_settings
  where key = 'ai_auto_posting_enabled';

  if coalesce(setting_value, 'true') <> 'true' then
    raise exception 'AI auto posting is disabled';
  end if;

  select count(*) into today_real_total
  from public.posts
  where is_ai_post = false
    and created_at >= (date_trunc('day', timezone('Asia/Shanghai', now())) at time zone 'Asia/Shanghai');

  select count(*) into today_ai_total
  from public.posts
  where is_ai_post = true
    and created_at >= (date_trunc('day', timezone('Asia/Shanghai', now())) at time zone 'Asia/Shanghai');

  max_ai_posts_today := case when today_real_total >= 20 then 3 else 15 end;

  if today_ai_total >= max_ai_posts_today then
    raise exception 'Daily AI post cap reached';
  end if;

  select b.* into chosen_bot
  from public.ai_bots b
  where b.is_active = true
    and (
      select count(*)
      from public.posts p
      where p.ai_bot_id = b.id
        and p.is_ai_post = true
        and p.created_at >= (date_trunc('day', timezone('Asia/Shanghai', now())) at time zone 'Asia/Shanghai')
    ) < 2
    and not exists (
      select 1
      from public.posts p
      where p.ai_bot_id = b.id
        and p.is_ai_post = true
        and p.created_at > now() - interval '4 hours'
    )
  order by random()
  limit 1;

  if chosen_bot.id is null then
    raise exception 'No eligible AI bot';
  end if;

  select t.* into chosen_template
  from public.ai_post_templates t
  where t.ai_bot_id = chosen_bot.id
    and t.is_active = true
    and not exists (
      select 1
      from public.posts p
      where p.ai_bot_id = chosen_bot.id
        and p.content = t.content
        and p.created_at > now() - interval '3 days'
    )
  order by t.used_count asc, t.last_used_at asc nulls first, random()
  limit 1;

  if chosen_template.id is null then
    raise exception 'No eligible AI post template';
  end if;

  insert into public.profiles(id, nickname, pass_hash, avatar_url, total_posts, updated_at)
  values (
    chosen_bot.id,
    chosen_bot.display_name,
    extensions.crypt('ai-bot-disabled-login', extensions.gen_salt('bf')),
    chosen_bot.avatar_url,
    0,
    now()
  )
  on conflict (id) do update
  set avatar_url = excluded.avatar_url,
      updated_at = now();

  insert into public.posts(user_id, content, sticker_id, is_ai_post, ai_bot_id)
  values (chosen_bot.id, chosen_template.content, null, true, chosen_bot.id)
  returning * into row_post;

  update public.ai_post_templates
  set used_count = used_count + 1,
      last_used_at = now()
  where id = chosen_template.id;

  update public.profiles
  set total_posts = total_posts + 1,
      updated_at = now()
  where id = chosen_bot.id;

  return row_post;
end;
$$;


create or replace function public.run_ai_auto_posting_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  setting_value text;
  sh_now timestamp := timezone('Asia/Shanghai', now());
  minute_of_day integer;
  slot_start timestamptz := date_trunc('hour', now());
  slot_end timestamptz := date_trunc('hour', now()) + interval '1 hour';
  result_post public.posts;
begin
  select value into setting_value
  from public.app_settings
  where key = 'ai_auto_posting_enabled';

  if coalesce(setting_value, 'true') <> 'true' then
    return jsonb_build_object('posted', false, 'reason', 'disabled');
  end if;

  minute_of_day := extract(hour from sh_now)::integer * 60 + extract(minute from sh_now)::integer;

  if not (
    (minute_of_day >= 8 * 60 and minute_of_day < 10 * 60)
    or (minute_of_day >= 12 * 60 and minute_of_day < 14 * 60)
    or (minute_of_day >= 17 * 60 + 30 and minute_of_day < 19 * 60 + 30)
    or (minute_of_day >= 22 * 60)
    or (minute_of_day < 60)
  ) then
    return jsonb_build_object('posted', false, 'reason', 'outside_window');
  end if;

  if exists (
    select 1
    from public.posts
    where is_ai_post = true
      and created_at >= slot_start
      and created_at < slot_end
  ) then
    return jsonb_build_object('posted', false, 'reason', 'slot_already_posted');
  end if;

  if random() > 0.75 then
    return jsonb_build_object('posted', false, 'reason', 'random_skip');
  end if;

  begin
    result_post := public.create_ai_post_from_pool();
  exception
    when others then
      return jsonb_build_object('posted', false, 'reason', sqlerrm);
  end;

  return jsonb_build_object(
    'posted', true,
    'post_id', result_post.id,
    'ai_bot_id', result_post.ai_bot_id,
    'created_at', result_post.created_at
  );
end;
$$;

revoke execute on function public.run_ai_auto_posting_tick() from public, anon, authenticated;

revoke execute on function public.create_ai_post_from_pool() from public, anon, authenticated;
