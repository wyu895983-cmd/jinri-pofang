import assert from "node:assert/strict";
import test from "node:test";
import { addFollowingId, filterFollowingPosts, isSelfFollow, removeFollowingId, uniqueFollowingIds } from "../lib/follow-model.ts";

test("rejects self follow and collapses duplicate relationships", () => {
  assert.equal(isSelfFollow("a", "a"), true);
  assert.deepEqual(uniqueFollowingIds(["a", "b", "a"]), ["a", "b"]);
  assert.throws(() => addFollowingId(["b"], "a", "a"), /FOLLOW_SELF_FORBIDDEN/);
  assert.deepEqual(addFollowingId(["b"], "a", "b"), ["b"]);
});

test("unfollow removes only the requested edge", () => {
  assert.deepEqual(removeFollowingId(["a", "b", "c"], "b"), ["a", "c"]);
});

test("following feed keeps post order and never duplicates posts", () => {
  const posts = [{ id: "3", user_id: "c" }, { id: "1", user_id: "a" }, { id: "2", user_id: "b" }];
  assert.deepEqual(filterFollowingPosts(posts, ["a", "a", "c"]).map((post) => post.id), ["3", "1"]);
  assert.deepEqual(filterFollowingPosts(posts, []), []);
});
