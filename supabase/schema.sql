create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique check (char_length(trim(nickname)) between 1 and 12),
  pass_hash text not null,
  avatar_url text not null default '/brand-mark.svg',
  exp integer not null default 0 check (exp >= 0),
  energy integer not null default 20 check (energy >= 0),
  energy_date date not null default current_date,
  last_login_date date,
  login_streak integer not null default 0 check (login_streak >= 0),
  total_posts integer not null default 0 check (total_posts >= 0),
  total_likes integer not null default 0 check (total_likes >= 0),
  language text not null default 'zh-CN' check (language in ('zh-CN', 'ja', 'ko', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists language text not null default 'zh-CN' check (language in ('zh-CN', 'ja', 'ko', 'en'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 100),
  sticker_id text,
  reaction_count integer not null default 0 check (reaction_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  milestone_awarded integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 80),
  sticker_id text,
  like_count integer not null default 0 check (like_count >= 0),
  milestone_awarded integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'laugh', 'same', 'broken', 'fire')),
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

create unique index if not exists reactions_post_user_idx on public.reactions(post_id, user_id) where post_id is not null;
create unique index if not exists reactions_comment_user_idx on public.reactions(comment_id, user_id) where comment_id is not null;

create table if not exists public.exp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  exp_amount integer not null,
  milestone_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists exp_logs_user_milestone_key_idx on public.exp_logs(user_id, milestone_key) where milestone_key is not null;
create index if not exists exp_logs_user_day_idx on public.exp_logs(user_id, source_type, created_at);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '匿名路过',
  type text not null check (type in ('bug', 'idea', 'content', 'other')),
  content text not null check (char_length(trim(content)) between 1 and 300),
  contact text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('like', 'comment')),
  "fromUserId" uuid not null references public.profiles(id) on delete cascade,
  "fromUserName" text not null,
  "toUserId" uuid not null references public.profiles(id) on delete cascade,
  "postId" uuid not null references public.posts(id) on delete cascade,
  "commentId" uuid references public.comments(id) on delete cascade,
  "postText" text not null,
  "commentText" text,
  "createdAt" timestamptz not null default now(),
  read boolean not null default false
);

alter table public.notifications
  add column if not exists "commentId" uuid references public.comments(id) on delete cascade;

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists comments_post_id_created_at_idx on public.comments(post_id, created_at asc);
create index if not exists comments_parent_comment_id_created_at_idx on public.comments(parent_comment_id, created_at asc);
create index if not exists profiles_exp_idx on public.profiles(exp desc);
create index if not exists notifications_to_user_read_created_idx on public.notifications("toUserId", read, "createdAt" desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.exp_logs enable row level security;
alter table public.feedbacks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);

drop policy if exists "posts are readable" on public.posts;
create policy "posts are readable" on public.posts for select using (true);

drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable" on public.comments for select using (true);

drop policy if exists "reactions are readable" on public.reactions;
create policy "reactions are readable" on public.reactions for select using (true);

drop policy if exists "anyone can create feedback" on public.feedbacks;
create policy "anyone can create feedback" on public.feedbacks for insert with check (true);

drop policy if exists "notifications are readable" on public.notifications;
create policy "notifications are readable" on public.notifications for select using (true);

drop policy if exists "notifications are writable by app" on public.notifications;
create policy "notifications are writable by app" on public.notifications for insert with check (true);

drop policy if exists "notifications can be marked read" on public.notifications;
create policy "notifications can be marked read" on public.notifications for update using (true) with check (true);

create or replace function public.add_exp(
  target_user uuid,
  source_name text,
  points integer,
  cap_per_day integer default null,
  source_uuid uuid default null,
  milestone_key_name text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  already integer := 0;
  accepted integer := points;
begin
  if milestone_key_name is not null and exists (
    select 1 from public.exp_logs
    where user_id = target_user and milestone_key = milestone_key_name
  ) then
    return 0;
  end if;

  if cap_per_day is not null then
    select coalesce(sum(exp_amount), 0) into already
    from public.exp_logs
    where user_id = target_user
      and source_type = source_name
      and created_at >= date_trunc('day', now());

    accepted := greatest(least(points, cap_per_day - already), 0);
  end if;

  if accepted > 0 then
    update public.profiles
    set exp = exp + accepted, updated_at = now()
    where id = target_user;

    insert into public.exp_logs(user_id, source_type, source_id, exp_amount, milestone_key)
    values (target_user, source_name, source_uuid, accepted, milestone_key_name);
  end if;

  return accepted;
end;
$$;

create or replace function public.ensure_daily_profile(profile_uuid uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row_profile public.profiles;
begin
  update public.profiles
  set energy = case when energy_date < current_date then 20 else energy end,
      energy_date = current_date,
      login_streak = case
        when last_login_date is null then 1
        when last_login_date = current_date then login_streak
        when last_login_date = current_date - 1 then login_streak + 1
        else 1
      end,
      last_login_date = current_date,
      updated_at = now()
  where id = profile_uuid;

  perform public.add_exp(profile_uuid, 'daily_login', 5, 5, null, null)
  where not exists (
    select 1 from public.exp_logs
    where user_id = profile_uuid
      and source_type = 'daily_login'
      and created_at >= date_trunc('day', now())
  );

  select * into row_profile from public.profiles where id = profile_uuid;
  return row_profile;
end;
$$;

create or replace function public.login_or_create_profile(raw_nickname text, raw_passphrase text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_nickname text := trim(raw_nickname);
  row_profile public.profiles;
begin
  if char_length(clean_nickname) < 1 or char_length(clean_nickname) > 12 then
    raise exception '昵称需要 1-12 个字';
  end if;

  if char_length(coalesce(raw_passphrase, '')) < 4 then
    raise exception '口令至少 4 位';
  end if;

  select * into row_profile from public.profiles where nickname = clean_nickname;

  if row_profile.id is null then
    insert into public.profiles(nickname, pass_hash, last_login_date, login_streak)
    values (clean_nickname, extensions.crypt(raw_passphrase, extensions.gen_salt('bf')), current_date, 1)
    returning * into row_profile;

    perform public.add_exp(row_profile.id, 'daily_login', 5, 5, null, null);
    select * into row_profile from public.profiles where id = row_profile.id;
    return row_profile;
  end if;

  if row_profile.pass_hash <> extensions.crypt(raw_passphrase, row_profile.pass_hash) then
    raise exception '昵称或口令不对';
  end if;

  return public.ensure_daily_profile(row_profile.id);
end;
$$;

create or replace function public.update_profile(profile_uuid uuid, raw_nickname text default null, raw_avatar_url text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_nickname text := nullif(trim(coalesce(raw_nickname, '')), '');
  clean_avatar text := nullif(trim(coalesce(raw_avatar_url, '')), '');
  row_profile public.profiles;
begin
  if clean_nickname is not null and (char_length(clean_nickname) < 1 or char_length(clean_nickname) > 12) then
    raise exception '昵称需要 1-12 个字';
  end if;

  update public.profiles
  set nickname = coalesce(clean_nickname, nickname),
      avatar_url = coalesce(clean_avatar, avatar_url),
      updated_at = now()
  where id = profile_uuid
  returning * into row_profile;

  if row_profile.id is null then
    raise exception '用户不存在';
  end if;

  return row_profile;
end;
$$;

create or replace function public.update_profile_language(profile_uuid uuid, next_language text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row_profile public.profiles;
begin
  if next_language not in ('zh-CN', 'ja', 'ko', 'en') then
    raise exception 'Unsupported language';
  end if;

  update public.profiles
  set language = next_language,
      updated_at = now()
  where id = profile_uuid
  returning * into row_profile;

  if row_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return row_profile;
end;
$$;

create or replace function public.create_post(profile_uuid uuid, post_content text, post_sticker_id text default null)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  row_profile public.profiles;
  row_post public.posts;
begin
  row_profile := public.ensure_daily_profile(profile_uuid);

  if row_profile.id is null then
    raise exception '请先取个名字';
  end if;

  if row_profile.energy < 1 then
    raise exception '今日怨气值空了，明天再来破防';
  end if;

  if char_length(trim(post_content)) < 1 or char_length(post_content) > 100 then
    raise exception '吐槽必须是 1-100 字';
  end if;

  insert into public.posts(user_id, content, sticker_id)
  values (profile_uuid, trim(post_content), nullif(trim(coalesce(post_sticker_id, '')), ''))
  returning * into row_post;

  update public.profiles
  set energy = greatest(energy - 1, 0),
      total_posts = total_posts + 1,
      updated_at = now()
  where id = profile_uuid;

  perform public.add_exp(profile_uuid, 'post_create', 2, 40, row_post.id, null);
  return row_post;
end;
$$;

drop function if exists public.create_comment(uuid, uuid, text, text);

create or replace function public.create_comment(
  profile_uuid uuid,
  post_uuid uuid,
  comment_content text,
  comment_sticker_id text default null,
  parent_comment_uuid uuid default null
)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  row_comment public.comments;
  post_owner uuid;
  parent_owner uuid;
  notify_owner uuid;
begin
  perform public.ensure_daily_profile(profile_uuid);

  select user_id into post_owner from public.posts where id = post_uuid;
  if post_owner is null then
    raise exception '帖子不存在';
  end if;

  if char_length(trim(comment_content)) < 1 or char_length(comment_content) > 80 then
    raise exception '评论必须是 1-80 字';
  end if;

  if parent_comment_uuid is not null then
    select user_id into parent_owner
    from public.comments
    where id = parent_comment_uuid and post_id = post_uuid;

    if parent_owner is null then
      raise exception '父评论不存在';
    end if;
  end if;

  notify_owner := coalesce(parent_owner, post_owner);

  insert into public.comments(post_id, parent_comment_id, user_id, content, sticker_id)
  values (post_uuid, parent_comment_uuid, profile_uuid, trim(comment_content), nullif(trim(coalesce(comment_sticker_id, '')), ''))
  returning * into row_comment;

  update public.posts set comment_count = comment_count + 1, updated_at = now() where id = post_uuid;

  perform public.add_exp(profile_uuid, 'comment_create', 1, 10, row_comment.id, null);
  if notify_owner <> profile_uuid then
    perform public.add_exp(notify_owner, 'received_comment', 1, 20, row_comment.id, null);

    insert into public.notifications(type, "fromUserId", "fromUserName", "toUserId", "postId", "commentId", "postText", "commentText")
    select 'comment', profile_uuid, from_profile.nickname, notify_owner, post_uuid, row_comment.id, p.content, row_comment.content
    from public.posts p
    join public.profiles from_profile on from_profile.id = profile_uuid
    where p.id = post_uuid
      and not exists (
        select 1 from public.notifications n
        where n.type = 'comment'
          and n."fromUserId" = profile_uuid
          and n."toUserId" = notify_owner
          and n."postId" = post_uuid
          and n."commentId" = row_comment.id
      );
  end if;

  return row_comment;
end;
$$;

create or replace function public.react_to_post(profile_uuid uuid, post_uuid uuid, reaction_name text default 'like')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  new_count integer;
  milestone integer;
  exp_reward integer;
  energy_reward integer;
begin
  if reaction_name not in ('like', 'laugh', 'same', 'broken', 'fire') then
    raise exception '反应类型不对';
  end if;

  perform public.ensure_daily_profile(profile_uuid);
  select user_id into owner_id from public.posts where id = post_uuid;
  if owner_id is null then
    raise exception '帖子不存在';
  end if;

  if exists (select 1 from public.reactions where post_id = post_uuid and user_id = profile_uuid) then
    delete from public.reactions where post_id = post_uuid and user_id = profile_uuid;
    update public.posts set reaction_count = greatest(reaction_count - 1, 0), updated_at = now() where id = post_uuid returning reaction_count into new_count;
    update public.profiles set total_likes = greatest(total_likes - 1, 0), updated_at = now() where id = owner_id;
    return 'removed';
  end if;

  insert into public.reactions(post_id, user_id, reaction_type)
  values (post_uuid, profile_uuid, reaction_name);

  update public.posts
  set reaction_count = reaction_count + 1, updated_at = now()
  where id = post_uuid
  returning reaction_count into new_count;

  update public.profiles set total_likes = total_likes + 1, updated_at = now() where id = owner_id;

  if owner_id <> profile_uuid then
    insert into public.notifications(type, "fromUserId", "fromUserName", "toUserId", "postId", "postText")
    select 'like', profile_uuid, from_profile.nickname, owner_id, post_uuid, p.content
    from public.posts p
    join public.profiles from_profile on from_profile.id = profile_uuid
    where p.id = post_uuid
      and not exists (
        select 1 from public.notifications n
        where n.type = 'like'
          and n."fromUserId" = profile_uuid
          and n."toUserId" = owner_id
          and n."postId" = post_uuid
      );
  end if;

  foreach milestone in array array[5, 10, 20, 50, 100, 500]
  loop
    if new_count >= milestone and not (
      select milestone = any(milestone_awarded) from public.posts where id = post_uuid
    ) then
      exp_reward := case milestone
        when 5 then 2
        when 10 then 5
        when 20 then 10
        when 50 then 30
        when 100 then 80
        when 500 then 500
        else 0
      end;

      energy_reward := case milestone
        when 5 then 1
        when 20 then 2
        when 100 then 5
        else 0
      end;

      update public.posts set milestone_awarded = array_append(milestone_awarded, milestone) where id = post_uuid;
      perform public.add_exp(owner_id, 'post_like_milestone', exp_reward, null, post_uuid, 'post_' || post_uuid || '_like_' || milestone);

      if energy_reward > 0 then
        update public.profiles set energy = energy + energy_reward, updated_at = now() where id = owner_id;
      end if;
    end if;
  end loop;

  return 'added';
end;
$$;

create or replace function public.react_to_comment(profile_uuid uuid, comment_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  perform public.ensure_daily_profile(profile_uuid);
  select user_id into owner_id from public.comments where id = comment_uuid;
  if owner_id is null then
    raise exception '评论不存在';
  end if;

  if exists (select 1 from public.reactions where comment_id = comment_uuid and user_id = profile_uuid) then
    delete from public.reactions where comment_id = comment_uuid and user_id = profile_uuid;
    update public.comments set like_count = greatest(like_count - 1, 0), updated_at = now() where id = comment_uuid;
    update public.profiles set total_likes = greatest(total_likes - 1, 0), updated_at = now() where id = owner_id;
    return 'removed';
  end if;

  insert into public.reactions(comment_id, user_id, reaction_type)
  values (comment_uuid, profile_uuid, 'like');
  update public.comments set like_count = like_count + 1, updated_at = now() where id = comment_uuid;
  update public.profiles set total_likes = total_likes + 1, updated_at = now() where id = owner_id;
  return 'added';
end;
$$;

create or replace view public.post_feed as
select
  p.id,
  p.user_id,
  pr.nickname,
  pr.avatar_url,
  p.content,
  p.sticker_id,
  p.reaction_count,
  p.comment_count,
  p.created_at,
  p.updated_at
from public.posts p
join public.profiles pr on pr.id = p.user_id;

create or replace view public.comment_feed as
select
  c.id,
  c.post_id,
  c.parent_comment_id,
  parent_profile.nickname as parent_nickname,
  c.user_id,
  pr.nickname,
  pr.avatar_url,
  c.content,
  c.sticker_id,
  c.like_count,
  c.created_at,
  c.updated_at
from public.comments c
join public.profiles pr on pr.id = c.user_id
left join public.comments parent_comment on parent_comment.id = c.parent_comment_id
left join public.profiles parent_profile on parent_profile.id = parent_comment.user_id;

grant select on public.profiles, public.posts, public.comments, public.reactions, public.post_feed, public.comment_feed, public.notifications to anon, authenticated;
grant insert on public.feedbacks to anon, authenticated;
grant update(read) on public.notifications to anon, authenticated;
grant execute on function public.login_or_create_profile(text, text) to anon, authenticated;
grant execute on function public.update_profile(uuid, text, text) to anon, authenticated;
grant execute on function public.update_profile_language(uuid, text) to anon, authenticated;
grant execute on function public.ensure_daily_profile(uuid) to anon, authenticated;
grant execute on function public.create_post(uuid, text, text) to anon, authenticated;
grant execute on function public.create_comment(uuid, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.react_to_post(uuid, uuid, text) to anon, authenticated;
grant execute on function public.react_to_comment(uuid, uuid) to anon, authenticated;

revoke execute on function public.add_exp(uuid, text, integer, integer, uuid, text) from public, anon, authenticated;

alter table public.notifications replica identity full;
alter table public.posts replica identity full;
alter table public.comments replica identity full;
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end;
$$;
