import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public post queries request only AI bot columns granted to browser roles", () => {
  for (const path of ["lib/storage.ts", "lib/queries.ts"]) {
    const source = read(path);
    const embeddedSelections = source.match(/ai_bots\([^)]*\)/g) ?? [];
    assert.ok(embeddedSelections.length > 0, `${path} should embed ai_bots`);
    for (const selection of embeddedSelections) {
      assert.match(selection, /id,display_name,avatar_url,display_label/);
      assert.doesNotMatch(selection, /persona_type/);
    }
  }
});
