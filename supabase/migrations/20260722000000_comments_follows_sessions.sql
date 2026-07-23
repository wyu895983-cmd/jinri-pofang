-- Additive migration for stable two-level comments, secure sessions, and follows.
-- Later sections are appended module-by-module after their contract tests pass.

alter table public.comments
  add column if not exists root_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists reply_to_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reply_to_username text;

update public.comments child
set root_comment_id = coalesce(direct_parent.root_comment_id, direct_parent.parent_comment_id, direct_parent.id),
    reply_to_user_id = direct_parent.user_id,
    reply_to_username = reply_profile.nickname
from public.comments direct_parent
join public.profiles reply_profile on reply_profile.id = direct_parent.user_id
where child.parent_comment_id = direct_parent.id
  and (
    child.root_comment_id is null
    or child.reply_to_user_id is null
    or child.reply_to_username is null
  );
create index if not exists comments_parent_comment_id_created_at_idx
  on public.comments(parent_comment_id, created_at asc);


create index if not exists comments_root_created_at_idx
  on public.comments(root_comment_id, created_at asc)
  where root_comment_id is not null;

create index if not exists comments_reply_to_user_id_idx
  on public.comments(reply_to_user_id)
  where reply_to_user_id is not null;

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
  direct_parent public.comments;
  post_owner uuid;
  parent_owner uuid;
  parent_nickname text;
  root_uuid uuid;
  notify_owner uuid;
begin
  perform public.ensure_daily_profile(profile_uuid);

  select user_id into post_owner
  from public.posts
  where id = post_uuid;

  if post_owner is null then
    raise exception using errcode = 'P0002', message = 'POST_NOT_FOUND';
  end if;

  if char_length(trim(comment_content)) < 1 or char_length(comment_content) > 80 then
    raise exception using errcode = '22023', message = 'COMMENT_LENGTH_INVALID';
  end if;

  if parent_comment_uuid is not null then
    select c.* into direct_parent
    from public.comments c
    where c.id = parent_comment_uuid
      and c.post_id = post_uuid
    for share;

    if direct_parent.id is null then
      raise exception using errcode = 'P0002', message = 'COMMENT_DELETED';
    end if;

    parent_owner := direct_parent.user_id;
    root_uuid := coalesce(direct_parent.root_comment_id, direct_parent.id);

    select nickname into parent_nickname
    from public.profiles
    where id = parent_owner;
  end if;

  notify_owner := coalesce(parent_owner, post_owner);

  insert into public.comments(
    post_id,
    parent_comment_id,
    root_comment_id,
    reply_to_user_id,
    reply_to_username,
    user_id,
    content,
    sticker_id
  )
  values (
    post_uuid,
    parent_comment_uuid,
    root_uuid,
    parent_owner,
    parent_nickname,
    profile_uuid,
    trim(comment_content),
    nullif(trim(coalesce(comment_sticker_id, '')), '')
  )
  returning * into row_comment;

  update public.posts
  set comment_count = comment_count + 1,
      updated_at = now()
  where id = post_uuid;

  perform public.add_exp(profile_uuid, 'comment_create', 1, 10, row_comment.id, null);

  if notify_owner <> profile_uuid then
    perform public.add_exp(notify_owner, 'received_comment', 1, 20, row_comment.id, null);

    insert into public.notifications(
      type,
      "fromUserId",
      "fromUserName",
      "toUserId",
      "postId",
      "commentId",
      "postText",
      "commentText"
    )
    select
      'comment',
      profile_uuid,
      from_profile.nickname,
      notify_owner,
      post_uuid,
      row_comment.id,
      p.content,
      row_comment.content
    from public.posts p
    join public.profiles from_profile on from_profile.id = profile_uuid
    where p.id = post_uuid
      and not exists (
        select 1
        from public.notifications n
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

create or replace view public.comment_feed
with (security_invoker = true)
as
select
  c.id,
  c.post_id,
  c.user_id,
  pr.nickname,
  pr.avatar_url,
  c.content,
  c.sticker_id,
  c.like_count,
  c.created_at,
  c.updated_at,
  c.parent_comment_id,
  parent_profile.nickname as parent_nickname,
  c.root_comment_id,
  c.reply_to_user_id,
  c.reply_to_username
from public.comments c
join public.profiles pr on pr.id = c.user_id
left join public.comments parent_comment on parent_comment.id = c.parent_comment_id
left join public.profiles parent_profile on parent_profile.id = parent_comment.user_id;

grant select on public.comment_feed to anon, authenticated;

revoke execute on function public.create_comment(uuid, uuid, text, text, uuid) from public;
grant execute on function public.create_comment(uuid, uuid, text, text, uuid) to anon, authenticated;

create schema if not exists private;

create table if not exists private.profile_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now()
);

create index if not exists profile_sessions_profile_id_idx
  on private.profile_sessions(profile_id, expires_at desc);

alter table private.profile_sessions enable row level security;
revoke all on private.profile_sessions from public, anon, authenticated;

create or replace function private.require_profile_session(session_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_uuid uuid;
begin
  if session_token is null or session_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '28000', message = 'PROFILE_SESSION_INVALID';
  end if;

  update private.profile_sessions
  set last_seen_at = pg_catalog.now()
  where token_hash = pg_catalog.encode(extensions.digest(decode(session_token, 'hex'), 'sha256'), 'hex')
    and revoked_at is null and expires_at > pg_catalog.now()
  returning profile_id into actor_uuid;

  if actor_uuid is null then
    raise exception using errcode = '28000', message = 'PROFILE_SESSION_INVALID';
  end if;
  return actor_uuid;
end;
$$;

revoke execute on function private.require_profile_session(text) from public, anon, authenticated;

create or replace function public.login_or_create_profile_session(raw_nickname text, raw_passphrase text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  row_profile public.profiles;
  raw_token text := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
begin
  row_profile := public.login_or_create_profile(raw_nickname, raw_passphrase);
  insert into private.profile_sessions(profile_id, token_hash, expires_at)
  values (
    row_profile.id,
    pg_catalog.encode(extensions.digest(decode(raw_token, 'hex'), 'sha256'), 'hex'),
    pg_catalog.now() + interval '30 days'
  );
  return pg_catalog.jsonb_build_object(
    'profile', pg_catalog.to_jsonb(row_profile) - 'pass_hash',
    'session_token', raw_token
  );
end;
$$;

revoke execute on function public.login_or_create_profile_session(text, text) from public;
grant execute on function public.login_or_create_profile_session(text, text) to anon, authenticated;

create or replace function public.revoke_profile_session(session_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if session_token is null or session_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  update private.profile_sessions
  set revoked_at = pg_catalog.now()
  where token_hash = pg_catalog.encode(extensions.digest(decode(session_token, 'hex'), 'sha256'), 'hex')
    and revoked_at is null;
end;
$$;

revoke execute on function public.revoke_profile_session(text) from public;
grant execute on function public.revoke_profile_session(text) to anon, authenticated;

create or replace function public.delete_comment(session_token text, comment_uuid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_uuid uuid;
  comment_owner uuid;
  post_owner uuid;
  post_uuid uuid;
  is_root boolean;
  actor_is_admin boolean := false;
  deleted_count integer := 0;
begin
  actor_uuid := private.require_profile_session(session_token);
  select c.user_id, p.user_id, p.id, c.parent_comment_id is null
  into comment_owner, post_owner, post_uuid, is_root
  from public.comments c
  join public.posts p on p.id = c.post_id
  where c.id = comment_uuid
  for update of c, p;

  if comment_owner is null then
    raise exception using errcode = 'P0002', message = 'COMMENT_DELETED';
  end if;

  select coalesce(pr.is_admin, false) into actor_is_admin
  from public.profiles pr where pr.id = actor_uuid;

  if actor_uuid <> comment_owner and actor_uuid <> post_owner and not actor_is_admin then
    raise exception using errcode = '42501', message = 'COMMENT_DELETE_FORBIDDEN';
  end if;

  if is_root then
    select count(*)::integer into deleted_count
    from public.comments
    where id = comment_uuid or root_comment_id = comment_uuid;
  else
    deleted_count := 1;
  end if;

  delete from public.comments where id = comment_uuid;
  update public.posts
  set comment_count = greatest(comment_count - deleted_count, 0), updated_at = pg_catalog.now()
  where id = post_uuid;

  return pg_catalog.jsonb_build_object('comment_id', comment_uuid, 'deleted_count', deleted_count);
end;
$$;

revoke execute on function public.delete_comment(text, uuid) from public;
grant execute on function public.delete_comment(text, uuid) to anon, authenticated;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);
create index if not exists follows_following_created_idx on public.follows(following_id, created_at desc);
alter table public.follows enable row level security;
drop policy if exists follows_public_read on public.follows;
create policy follows_public_read on public.follows for select using (true);
grant select on public.follows to anon, authenticated;

create or replace function public.follow_profile(session_token text, target_profile_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_uuid uuid;
begin
  actor_uuid := private.require_profile_session(session_token);
  if actor_uuid = target_profile_id then
    raise exception using errcode = '22023', message = 'FOLLOW_SELF_FORBIDDEN';
  end if;
  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;
  insert into public.follows(follower_id, following_id)
  values (actor_uuid, target_profile_id)
  on conflict (follower_id, following_id) do nothing;
  return true;
end;
$$;

create or replace function public.unfollow_profile(session_token text, target_profile_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor_uuid uuid;
begin
  actor_uuid := private.require_profile_session(session_token);
  delete from public.follows
  where follower_id = actor_uuid and following_id = target_profile_id;
  return true;
end;
$$;

revoke execute on function public.follow_profile(text, uuid) from public;
revoke execute on function public.unfollow_profile(text, uuid) from public;
grant execute on function public.follow_profile(text, uuid) to anon, authenticated;
grant execute on function public.unfollow_profile(text, uuid) to anon, authenticated;

revoke insert, update, delete on public.follows from anon, authenticated;
revoke delete on public.comments from anon, authenticated;
