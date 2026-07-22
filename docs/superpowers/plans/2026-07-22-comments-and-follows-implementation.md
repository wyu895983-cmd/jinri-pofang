# Comments and Follows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable two-level comment replies, database-authorized comment deletion, quick comment stickers, secure follow relationships, public user profiles, following feeds, and followed-author highlighting without regressing existing features.

**Architecture:** Preserve the current custom nickname/passphrase account model while adding opaque database sessions for new privileged mutations. Keep comment and follow rules in Supabase RPCs, expose small typed storage functions to the client, and extract pure grouping/filtering helpers so behavior can be tested with Node's built-in test runner.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.6, Supabase Postgres 17, `@supabase/supabase-js` 2.45, Tailwind CSS, Framer Motion, Node 24 test runner.

## Global Constraints

- Work only in `D:\文档\画画\jinri-pofang`.
- Preserve every pre-existing uncommitted change; never reset, overwrite, or stage unrelated hunks.
- Implement modules in this order: replies, deletion, quick stickers, follow mutations, profile counts/state, feeds, followed-author highlight.
- Preserve `zh-CN`, `en`, `ja`, and `ko` translations.
- Preserve posting, likes, comment timestamps, notifications, experience, profile synchronization, AI-author fields, favorites, Realtime subscriptions, and current layout density.
- Reuse `comments`, `profiles`, `posts`, `comment_feed`, `StickerPicker`, `getPosts`, and existing post-card components.
- Use test-first development for every behavior change and run module tests after each module.
- Do not apply production DDL until the migration has passed static tests and has been reviewed against the live schema.
- For files already dirty before this feature (`components/local-post-card.tsx`, `components/post-card.tsx`, `lib/queries.ts`, `lib/storage.ts`, `package.json`, `supabase/schema.sql`), review `git diff -- <file>` after each edit and do not create commits that accidentally include pre-existing hunks.

---

## File Responsibility Map

- `lib/comment-thread.ts`: pure root resolution, grouping, insertion, and deletion helpers.
- `tests/comment-thread.test.ts`: two-level comment behavior tests.
- `supabase/migrations/20260722000000_comments_follows_sessions.sql`: additive schema, backfill, secure sessions, comment RPCs, follow RPCs, grants, and RLS.
- `supabase/schema.sql`: canonical schema mirror, updated without disturbing existing AI work.
- `lib/storage.ts`: Supabase/local adapters and typed comment/follow/profile/feed APIs.
- `app/post/[id]/page.tsx`: comment composer state, reply focus, comment rendering, menu, optimistic insertion/deletion.
- `components/sticker-picker.tsx`: controlled insertion and four-item quick strip.
- `tests/quick-stickers.test.ts`: pure quick-strip visibility and insertion tests.
- `lib/follow-model.ts`: pure follow-state, count, feed, and highlight helpers.
- `tests/follow-model.test.ts`: follow/feed behavior tests.
- `components/follow-button.tsx`: reusable follow/unfollow control.
- `app/profile/[id]/page.tsx`: other-user profile page.
- `app/profile/page.tsx`: own following/follower counts.
- `app/page.tsx`: square/following tabs and empty state.
- `components/local-post-card.tsx`, `components/post-card.tsx`, `components/feed-list.tsx`: correct profile links and optional followed styling.
- `app/leaderboard/page.tsx`: correct public profile links.
- `lib/i18n.tsx`: all new visible copy in four languages.
- `tests/i18n-comments-follows.test.ts`: translation-key parity.
- `scripts/verify-comments-follows-schema.mjs`: read-only live database assertions after migration.
- `package.json`: focused test/typecheck/schema verification scripts.

---

### Task 1: Comment Relationship Model

**Files:**
- Create: `lib/comment-thread.ts`
- Create: `tests/comment-thread.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: comment records containing `id`, `parent_comment_id`, `root_comment_id`, and `created_at`.
- Produces: `getCommentRootId`, `groupCommentThread`, `insertComment`, and `removeCommentBranch`.

- [ ] **Step 1: Write failing pure-model tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { groupCommentThread, insertComment, removeCommentBranch } from "../lib/comment-thread.ts";

test("groups replies to replies under one root in chronological order", () => {
  const root = { id: "root", parent_comment_id: null, root_comment_id: null, created_at: "2026-01-03T00:00:00Z" };
  const first = { id: "first", parent_comment_id: "root", root_comment_id: "root", created_at: "2026-01-03T01:00:00Z" };
  const second = { id: "second", parent_comment_id: "first", root_comment_id: "root", created_at: "2026-01-03T02:00:00Z" };
  const grouped = groupCommentThread([second, root, first]);
  assert.deepEqual(grouped.roots.map((item) => item.id), ["root"]);
  assert.deepEqual(grouped.repliesByRoot.root.map((item) => item.id), ["first", "second"]);
});

test("inserts a returned reply without duplicating a realtime copy", () => {
  const item = { id: "reply", parent_comment_id: "root", root_comment_id: "root", created_at: "2026-01-03T01:00:00Z" };
  assert.equal(insertComment(insertComment([], item), item).length, 1);
});

test("removes only a reply or a complete root branch", () => {
  const rows = [
    { id: "root", parent_comment_id: null, root_comment_id: null, created_at: "2026-01-03T00:00:00Z" },
    { id: "reply", parent_comment_id: "root", root_comment_id: "root", created_at: "2026-01-03T01:00:00Z" }
  ];
  assert.deepEqual(removeCommentBranch(rows, "reply").map((item) => item.id), ["root"]);
  assert.deepEqual(removeCommentBranch(rows, "root"), []);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `node --test tests/comment-thread.test.ts`

Expected: FAIL because `lib/comment-thread.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

```ts
export type ThreadComment = {
  id: string;
  parent_comment_id?: string | null;
  root_comment_id?: string | null;
  created_at: string;
};

export function getCommentRootId(comment: ThreadComment) {
  return comment.root_comment_id ?? comment.parent_comment_id ?? null;
}

export function groupCommentThread<T extends ThreadComment>(comments: T[]) {
  const roots = comments
    .filter((comment) => !comment.parent_comment_id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const repliesByRoot: Record<string, T[]> = {};
  for (const comment of comments) {
    const rootId = getCommentRootId(comment);
    if (!rootId) continue;
    repliesByRoot[rootId] = [...(repliesByRoot[rootId] ?? []), comment].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
    );
  }
  return { roots, repliesByRoot };
}

export function insertComment<T extends ThreadComment>(comments: T[], next: T) {
  return comments.some((comment) => comment.id === next.id) ? comments : [...comments, next];
}

export function removeCommentBranch<T extends ThreadComment>(comments: T[], commentId: string) {
  const target = comments.find((comment) => comment.id === commentId);
  if (!target) return comments;
  return target.parent_comment_id
    ? comments.filter((comment) => comment.id !== commentId)
    : comments.filter((comment) => comment.id !== commentId && getCommentRootId(comment) !== commentId);
}
```

- [ ] **Step 4: Add focused scripts and verify GREEN**

Add to `package.json` scripts:

```json
"test:comments": "node --test tests/comment-thread.test.ts",
"typecheck": "tsc --noEmit"
```

Run: `npm.cmd run test:comments`

Expected: three passing tests.

---

### Task 2: Comment Schema, Backfill, and Reply RPC

**Files:**
- Create: `supabase/migrations/20260722000000_comments_follows_sessions.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/storage.ts`
- Test: `tests/comment-thread.test.ts`

**Interfaces:**
- Produces comment fields `root_comment_id`, `reply_to_user_id`, and `reply_to_username`.
- Updates `create_comment(profile_uuid, post_uuid, comment_content, comment_sticker_id, parent_comment_uuid)` while preserving its callable signature.
- Extends `LocalComment` and `COMMENT_FEED_COLUMNS` with the new fields.

- [ ] **Step 1: Add RED assertions for reply metadata mapping**

Extend the test fixture to assert a reply-to-reply keeps `root_comment_id === "root"` and exposes `reply_to_user_id` and `reply_to_username` unchanged after grouping.

Run: `npm.cmd run test:comments`

Expected: FAIL until the type and helper fixture support the fields.

- [ ] **Step 2: Write the additive SQL migration**

The migration must:

```sql
alter table public.comments
  add column if not exists root_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists reply_to_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reply_to_username text;

update public.comments child
set root_comment_id = coalesce(parent.root_comment_id, parent.id),
    reply_to_user_id = parent.user_id,
    reply_to_username = profile.nickname
from public.comments parent
join public.profiles profile on profile.id = parent.user_id
where child.parent_comment_id = parent.id
  and (child.root_comment_id is null or child.reply_to_user_id is null or child.reply_to_username is null);

create index if not exists comments_root_created_at_idx
  on public.comments(root_comment_id, created_at asc)
  where root_comment_id is not null;
```

Replace `create_comment` so the database locks and reads the direct target, rejects a missing or cross-post target with SQLSTATE `P0002` and message `COMMENT_DELETED`, derives `root_comment_id`, snapshots the target nickname, notifies the direct target owner, and retains existing EXP behavior.

- [ ] **Step 3: Update the canonical schema without disturbing AI hunks**

Add the same columns, index, backfill-safe function definition, and view columns to `supabase/schema.sql`. Run:

`git diff -- supabase/schema.sql`

Expected: existing AI additions remain present; only comment/follow sections gain new hunks.

- [ ] **Step 4: Update storage mapping**

Extend `LocalComment`:

```ts
root_comment_id?: string | null;
reply_to_user_id?: string | null;
reply_to_username?: string | null;
```

Add those columns to `COMMENT_FEED_COLUMNS`, map them in `toComment`, and have `createComment` return the enriched reply with local fallback deriving the same root and target fields.

- [ ] **Step 5: Run module verification**

Run:

```text
npm.cmd run test:comments
npm.cmd run typecheck
```

Expected: comment tests pass and typecheck reports no new errors.

---

### Task 3: Reply Focus, Two-Level Rendering, and Optimistic Insert

**Files:**
- Modify: `app/post/[id]/page.tsx`
- Modify: `lib/i18n.tsx`
- Test: `tests/comment-thread.test.ts`

**Interfaces:**
- Consumes `groupCommentThread` and `insertComment`.
- Uses `HTMLTextAreaElement` and `HTMLFormElement` refs.

- [ ] **Step 1: Add RED model coverage for current sort rules**

Add a test with two roots to require likes-first sorting through a `rootComparator` callback while keeping replies chronological. Change `groupCommentThread(comments, rootComparator)` accordingly.

Run: `npm.cmd run test:comments`

Expected: FAIL because the helper does not accept the comparator.

- [ ] **Step 2: Add comparator support and restore GREEN**

Implement the comparator parameter and pass the current `like_count desc, created_at desc` comparator from the page.

- [ ] **Step 3: Implement reply activation**

In the post page:

```ts
const commentFormRef = useRef<HTMLFormElement>(null);
const commentInputRef = useRef<HTMLTextAreaElement>(null);

function beginReply(comment: LocalComment) {
  setReplyTarget(comment);
  commentFormRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  window.requestAnimationFrame(() => commentInputRef.current?.focus({ preventScroll: true }));
}
```

Wire comment nickname, content wrapper, and reply button to `beginReply`. Do not place the reply handler on like/menu controls.

- [ ] **Step 4: Replace nested-parent inference with root grouping**

Render only root comments at the first level and `repliesByRoot[root.id]` once beneath each root. Display reply context from persisted `reply_to_username`, falling back to the direct parent only for legacy rows.

- [ ] **Step 5: Make successful submission local and race-safe**

Use the return value from `createComment`, call `setComments((current) => insertComment(current, created))`, reset the form, and clear reply state. Do not call `refresh()` after successful creation. Keep Realtime refresh but deduplicate by ID.

Map `COMMENT_DELETED` to `post.commentDeleted` and clear the stale reply target.

- [ ] **Step 6: Add four-language copy and run checks**

Add keys for `post.replyingTo`, `post.replyPlaceholder`, `post.replyContext`, `post.commentDeleted`, and reply cancellation in all dictionaries.

Run:

```text
npm.cmd run test:comments
npm.cmd run typecheck
```

Expected: tests and typecheck pass.

---

### Task 4: Database Session and Comment Deletion Permission

**Files:**
- Modify: `supabase/migrations/20260722000000_comments_follows_sessions.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/storage.ts`
- Modify: `app/login/page.tsx`
- Modify: `app/post/[id]/page.tsx`
- Modify: `lib/i18n.tsx`
- Create: `tests/comment-permissions.test.ts`

**Interfaces:**
- Produces `login_or_create_profile_session`, `revoke_profile_session`, private token validation, and `delete_comment`.
- Produces browser helpers `getSessionToken`, `deleteComment`, and session-aware login/logout.

- [ ] **Step 1: Write RED permission-contract tests**

Create tests that read the migration text and assert it contains:

```ts
assert.match(sql, /create table private\.profile_sessions/i);
assert.match(sql, /revoke all on function public\.delete_comment/i);
assert.match(sql, /comment_owner.*post_owner.*actor_is_admin/is);
assert.match(sql, /greatest\(comment_count - deleted_count, 0\)/i);
```

Also assert there is no public INSERT/DELETE grant on `follows` or direct DELETE grant on `comments`.

Run: `node --test tests/comment-permissions.test.ts`

Expected: FAIL before session and delete SQL exists.

- [ ] **Step 2: Add secure session SQL**

Create schema `private`, table `private.profile_sessions`, enable RLS, revoke all table access, and add a private validator that hashes the supplied token with `digest`, rejects expired/revoked sessions, and returns `profile_id`.

Add `public.login_or_create_profile_session(raw_nickname text, raw_passphrase text) returns jsonb`. It calls the existing checked login path, generates 32 random bytes encoded as hex, stores only the SHA-256 hash, expires after 30 days, and returns `{ profile, session_token }`.

Add `public.revoke_profile_session(session_token text) returns void`.

- [ ] **Step 3: Add transactional delete SQL**

`delete_comment(session_token text, comment_uuid uuid)` must lock the comment and post, check author/post owner/admin, count root descendants using `root_comment_id`, delete the target, and decrement `posts.comment_count` by the exact count. It must return deleted IDs or `{ deleted_count, root_comment_id }` so the client can update locally.

Revoke PUBLIC execute, grant only to `anon, authenticated`, and leave direct comments DELETE unavailable.

- [ ] **Step 4: Integrate session login without invalidating existing reads**

Store the token under `jinri-pofang:session-token`. New logins call the session RPC. Logout attempts revocation then always clears both token and existing local user keys. Existing browsers without a token remain readable; privileged actions redirect to login with `auth.secureSessionRequired`.

- [ ] **Step 5: Add comment menu and optimistic removal**

Show the three-dot menu only when current user is the comment author, the post author, or admin. Confirm with `post.deleteCommentConfirm`, call `deleteComment`, then apply `removeCommentBranch`. Disable duplicate requests and close the menu on completion.

- [ ] **Step 6: Run deletion module tests**

Run:

```text
node --test tests/comment-permissions.test.ts
npm.cmd run test:comments
npm.cmd run typecheck
```

Expected: all pass.

---

### Task 5: Quick Sticker Interaction

**Files:**
- Create: `lib/quick-stickers.ts`
- Create: `tests/quick-stickers.test.ts`
- Modify: `components/sticker-picker.tsx`
- Modify: `app/post/[id]/page.tsx`

**Interfaces:**
- Produces `insertAtSelection(value, token, start, end, maxLength)` and `shouldShowQuickStickers(value, dismissed)`.
- `StickerPicker` receives `textareaRef`, `value`, and `onValueChange`.

- [ ] **Step 1: Write RED insertion and visibility tests**

```ts
test("inserts at the selection without submitting", () => {
  assert.deepEqual(insertAtSelection("abcd", "[popo:p1]", 1, 3, 80), {
    value: "a[popo:p1]d",
    caret: 11
  });
});

test("shows again only after the input becomes empty", () => {
  assert.equal(shouldShowQuickStickers("hello", true), false);
  assert.equal(shouldShowQuickStickers("", true), true);
});
```

Run: `node --test tests/quick-stickers.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement pure helpers and verify GREEN**

Implement length guarding, returned caret position, and empty-value visibility. Run the same test and expect two passes.

- [ ] **Step 3: Make the comment textarea controlled**

Track `commentValue` in the post page, pass it to the textarea, clear it after success, and reset quick-strip state when the composer remounts or value becomes empty.

- [ ] **Step 4: Extend the existing picker**

Render `popoStickers.slice(0, 4)` above the full picker. Use Framer Motion `whileTap={{ scale: 0.9 }}` and AnimatePresence fade-out. Each click inserts at the caret, calls `onValueChange`, refocuses, updates selection, dismisses the quick strip, and never submits.

- [ ] **Step 5: Run quick-sticker module tests**

Run:

```text
node --test tests/quick-stickers.test.ts
npm.cmd run typecheck
```

Expected: all pass.

---

### Task 6: Follow and Unfollow Mutations

**Files:**
- Modify: `supabase/migrations/20260722000000_comments_follows_sessions.sql`
- Modify: `supabase/schema.sql`
- Create: `lib/follow-model.ts`
- Create: `tests/follow-model.test.ts`
- Modify: `lib/storage.ts`
- Create: `components/follow-button.tsx`
- Modify: `lib/i18n.tsx`

**Interfaces:**
- Produces table `public.follows` and RPCs `follow_profile`, `unfollow_profile`.
- Produces client APIs `getFollowState(targetId)`, `followProfile(targetId)`, and `unfollowProfile(targetId)`.

- [ ] **Step 1: Write RED follow-model tests**

Test that self-follow is rejected, duplicate IDs collapse to one relationship, unfollow removes only the requested edge, and pending state prevents duplicate mutation calls.

Run: `node --test tests/follow-model.test.ts`

Expected: FAIL before `lib/follow-model.ts` exists.

- [ ] **Step 2: Implement pure follow helpers**

Export `isSelfFollow`, `uniqueFollowingIds`, `addFollowingId`, and `removeFollowingId`; rerun tests to GREEN.

- [ ] **Step 3: Add follows SQL and RLS**

```sql
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create index if not exists follows_following_created_idx on public.follows(following_id, created_at desc);
```

Add a SELECT policy and SELECT grant only. Mutation RPCs derive `follower_id` from the private session validator, validate the target, use `ON CONFLICT DO NOTHING` for stable follow behavior, and delete only the caller's edge.

- [ ] **Step 4: Add storage adapters and FollowButton**

The button performs optimistic label changes, disables while pending, rolls back on failure, hides for self, and redirects to secure login if no valid token exists. No follow animation beyond existing button press feedback.

- [ ] **Step 5: Run follow mutation tests**

Run:

```text
node --test tests/follow-model.test.ts tests/comment-permissions.test.ts
npm.cmd run typecheck
```

Expected: all pass.

---

### Task 7: Counts and Public User Profile

**Files:**
- Create: `app/profile/[id]/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `lib/storage.ts`
- Modify: `components/local-post-card.tsx`
- Modify: `components/post-card.tsx`
- Modify: `components/feed-list.tsx`
- Modify: `app/leaderboard/page.tsx`
- Modify: `lib/i18n.tsx`
- Test: `tests/follow-model.test.ts`

**Interfaces:**
- Produces `getPublicProfile(profileId)` returning `{ profile, posts, followingCount, followerCount, isFollowing }`.

- [ ] **Step 1: Add RED count tests**

Given relationship fixtures, assert counts are derived rather than stored on a profile and that current-user state is true only for the matching edge.

- [ ] **Step 2: Implement count helpers and storage query**

Query `profiles`, authored posts, two exact-count follow queries, and current edge in parallel. Select only public profile fields; never select `pass_hash` or session data.

- [ ] **Step 3: Build the public profile route**

Render current visual primitives, stats, authored posts, and `FollowButton`. If `id` equals the current user, redirect to `/profile`. Show a localized not-found state for missing users.

- [ ] **Step 4: Add own-profile counts**

Extend the existing stats grid with localized following and follower counts without changing notification, badges, settings, or history sections.

- [ ] **Step 5: Correct all author links**

Use `/profile/${authorId}` for real authors in every post-card variant and leaderboard. Preserve mock-card non-navigation and AI badges.

- [ ] **Step 6: Run profile module checks**

Run:

```text
node --test tests/follow-model.test.ts
npm.cmd run typecheck
```

Expected: pass.

---

### Task 8: Square and Following Feeds

**Files:**
- Modify: `lib/follow-model.ts`
- Modify: `tests/follow-model.test.ts`
- Modify: `lib/storage.ts`
- Modify: `app/page.tsx`
- Modify: `lib/i18n.tsx`

**Interfaces:**
- Produces `getFollowingIds()`, `getFollowingPosts()`, and `filterFollowingPosts(posts, followingIds)`.

- [ ] **Step 1: Write RED feed tests**

Assert only followed author posts appear, original post order is retained, duplicate following IDs do not duplicate posts, and an empty following set returns an empty list.

- [ ] **Step 2: Implement filtering and storage APIs**

Keep `getPosts` as the square source. Fetch current follow IDs and filter already-normalized posts so liked state, AI metadata, favorites, and current sorting remain intact.

- [ ] **Step 3: Add home feed tabs**

Add `feedMode: "square" | "following"`, accessible tab buttons, and derive displayed posts. Default to square. Preserve the current headline, stats, search, favorites, likes, Realtime refresh, and skeleton.

- [ ] **Step 4: Add following empty state**

When logged in with no followed profiles, show the localized exact Chinese copy “还没有关注的人，去广场看看吧。” and a button that selects square. For logged-out users, show the existing localized login prompt.

- [ ] **Step 5: Run feed module tests**

Run:

```text
node --test tests/follow-model.test.ts
npm.cmd run typecheck
```

Expected: pass.

---

### Task 9: Followed-Author Highlight and Translation Parity

**Files:**
- Modify: `components/local-post-card.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/i18n.tsx`
- Create: `tests/i18n-comments-follows.test.ts`

**Interfaces:**
- Adds optional `followed?: boolean` to `LocalPostCard`.

- [ ] **Step 1: Write RED translation parity test**

Load the four dictionaries and assert all new keys exist in every locale, including reply/deletion, secure-session, follow labels/counts, feed tabs, empty state, and followed badge.

Run: `node --test tests/i18n-comments-follows.test.ts`

Expected: FAIL until all locale keys exist.

- [ ] **Step 2: Add subtle followed styling**

When `followed` is true, add a `border-l-2 border-l-emerald-200/60` treatment, `bg-emerald-200/[0.025]`, and a compact localized badge. Do not change heat classes or use a saturated green fill.

- [ ] **Step 3: Pass followed state only in square mode**

The home page passes `followed={feedMode === "square" && followingIds.has(post.user_id)}`. The following feed does not need redundant highlight.

- [ ] **Step 4: Complete all four dictionaries and restore GREEN**

Run:

```text
node --test tests/i18n-comments-follows.test.ts
npm.cmd run typecheck
```

Expected: pass.

---

### Task 10: Database Application and Final Verification

**Files:**
- Create: `scripts/verify-comments-follows-schema.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces read-only command `npm run verify:comments-follows-schema`.

- [ ] **Step 1: Review current Supabase documentation and changelog**

Read the current Supabase changelog, RLS guidance, function security guidance, and database advisors before applying DDL. Confirm no relevant breaking changes affect Postgres 17, security-invoker views, grants, or RPC exposure.

- [ ] **Step 2: Run every local test before DDL**

Add scripts:

```json
"test:comments-follows": "node --test tests/comment-thread.test.ts tests/comment-permissions.test.ts tests/quick-stickers.test.ts tests/follow-model.test.ts tests/i18n-comments-follows.test.ts"
```

Run: `npm.cmd run test:comments-follows`

Expected: all tests pass.

- [ ] **Step 3: Apply the reviewed migration once**

Use the Supabase migration tool with project `ysikjrxtaftuqsngbseu` and migration name `comments_follows_sessions`. Do not apply `supabase/schema.sql` wholesale.

- [ ] **Step 4: Verify database behavior read-only**

The verification script/query must assert:

- all three comment columns exist once;
- `follows` constraints and indexes exist;
- `private.profile_sessions` is not exposed;
- direct DELETE on comments and direct writes on follows are unavailable to `anon`/`authenticated`;
- sensitive RPCs have only intended execute grants;
- unauthorized delete, self-follow, and forged profile UUID attempts fail;
- post owner, comment owner, and admin deletion succeed in a rolled-back transaction;
- root deletion removes replies and decrements the count by the exact number.

- [ ] **Step 5: Run advisors**

Run Supabase security and performance advisors. Fix any new finding caused by this migration; record unrelated pre-existing findings separately.

- [ ] **Step 6: Run final project verification**

Run:

```text
npm.cmd run test:comments-follows
npm.cmd run typecheck
npm.cmd run build
npm.cmd run verify:comments-follows-schema
git status --short
git diff --check
```

Expected: all tests pass, typecheck succeeds, production build succeeds, database verification succeeds, no whitespace errors, and all pre-existing uncommitted files remain present.

- [ ] **Step 7: Perform browser regression checks**

Verify reply focus and mobile keyboard attempt, reply-to-reply placement, deleted-target error, all three deletion roles, quick-strip reset, follow/unfollow, own/public counts, profile links, square/following tabs, empty state, followed highlight, likes, favorites, notifications, EXP, comment timestamps, AI badges, and four languages.

---

## Completion Criteria

- Each module's focused tests were observed failing before production implementation and passing afterward.
- No existing uncommitted change was reset, overwritten, or silently staged.
- The live migration is additive and verified against the actual project.
- Database permissions do not trust a caller-supplied profile UUID for delete/follow mutations.
- TypeScript, production build, schema verification, translation parity, and all focused tests pass.
