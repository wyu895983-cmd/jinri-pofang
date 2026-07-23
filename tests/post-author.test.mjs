import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("defines and uses one normalized post author", () => {
  assert.equal(existsSync(new URL("../components/post-author.tsx", import.meta.url)), true);
  const shared = read("components/post-author.tsx");
  assert.match(shared, /export type PostAuthor\s*=\s*\{/);
  for (const field of ["id", "displayName", "avatarUrl", "isAi", "aiLabel"]) {
    assert.match(shared, new RegExp(`\\b${field}\\b`));
  }
  assert.match(shared, /export function normalizePostAuthor/);
  assert.match(shared, /export function PostAuthorRow/);
  for (const path of ["lib/storage.ts", "lib/queries.ts"]) {
    const source = read(path);
    assert.match(source, /author\??:\s*PostAuthor/);
    assert.match(source, /author:\s*normalizePostAuthor/);
  }
  for (const path of ["components/local-post-card.tsx", "components/post-card.tsx"]) {
    const source = read(path);
    assert.match(source, /<PostAuthorRow/);
    assert.doesNotMatch(source, /function AiBadge/);
  }
  assert.match(shared, /author\.isAi[\s\S]*return content/);
  assert.match(shared, /<Link[^>]+href=\{humanHref\}/);
});
