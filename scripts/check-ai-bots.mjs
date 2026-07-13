import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bots = JSON.parse(await readFile(new URL("../lib/ai-bots-data.json", import.meta.url), "utf8"));

assert.equal(bots.length, 10, "should define exactly 10 AI bots");
assert.equal(bots.filter((bot) => bot.personaType === "worker").length, 5, "should define 5 worker bots");
assert.equal(bots.filter((bot) => bot.personaType === "student").length, 4, "should define 4 student bots");
assert.equal(bots.filter((bot) => bot.personaType === "life").length, 1, "should define 1 life bot");
assert.equal(
  bots.reduce((sum, bot) => sum + (Array.isArray(bot.templates) ? bot.templates.length : 0), 0),
  200,
  "should define exactly 200 AI post templates"
);

const seenNames = new Set();
const seenContent = new Set();
for (const bot of bots) {
  assert.ok(bot.id, "bot needs id");
  assert.ok(bot.displayName, "bot needs displayName");
  assert.ok(bot.avatarUrl, `${bot.displayName} needs avatarUrl`);
  assert.ok(["worker", "student", "life"].includes(bot.personaType), `${bot.displayName} needs a valid personaType`);
  assert.ok(bot.personaDesc, `${bot.displayName} needs personaDesc`);
  assert.ok(["AI吐槽员", "PoPo分身"].includes(bot.displayLabel), `${bot.displayName} needs an AI display label`);
  assert.ok(bot.tone, `${bot.displayName} needs tone`);
  assert.ok(Array.isArray(bot.topics) && bot.topics.length > 0, `${bot.displayName} needs topics`);
  assert.ok(Array.isArray(bot.templates), `${bot.displayName} needs templates`);
  assert.ok(bot.templates.length >= 20, `${bot.displayName} should have at least 20 templates`);
  assert.ok(!seenNames.has(bot.displayName), `${bot.displayName} should be unique`);
  seenNames.add(bot.displayName);

  for (const content of bot.templates) {
    assert.ok(content.length >= 15 && content.length <= 60, `${bot.displayName} template length out of range: ${content}`);
    assert.ok(!content.includes("作为一个AI"), `${bot.displayName} template should not self-describe as AI`);
    assert.ok(!content.includes("我是一名用户"), `${bot.displayName} template should not impersonate a user`);
    assert.ok(!seenContent.has(content), `duplicate AI template: ${content}`);
    seenContent.add(content);
  }
}

console.log(`AI bot checks passed: ${bots.length} bots, ${seenContent.size} templates.`);
