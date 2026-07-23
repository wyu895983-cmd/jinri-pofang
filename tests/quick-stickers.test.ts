import assert from "node:assert/strict";
import test from "node:test";
import { insertAtSelection, shouldShowQuickStickers } from "../lib/quick-stickers.ts";

test("inserts at the selection without submitting", () => {
  assert.deepEqual(insertAtSelection("abcd", "[popo:p1]", 1, 3, 80), {
    value: "a[popo:p1]d",
    caret: 10
  });
});

test("rejects an insertion that would exceed max length", () => {
  assert.equal(insertAtSelection("abcd", "[popo:p1]", 4, 4, 8), null);
});

test("shows again after the input becomes empty", () => {
  assert.equal(shouldShowQuickStickers("hello", true), false);
  assert.equal(shouldShowQuickStickers("", true), true);
  assert.equal(shouldShowQuickStickers("", false), true);
});
