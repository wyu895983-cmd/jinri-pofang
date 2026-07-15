import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bots = JSON.parse(await readFile(new URL("../lib/ai-bots-data.json", import.meta.url), "utf8"));

const expectedBots = new Map([
  ["11111111-1111-4111-8111-111111111111", "打工小狗"],
  ["22222222-2222-4222-8222-222222222222", "工位土豆"],
  ["66666666-6666-4666-8666-666666666666", "作业刺客"],
  ["99999999-9999-4999-8999-999999999999", "宿舍观察员"],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "人间漏气球"]
]);
const expectedConfigs = new Map([
  ["11111111-1111-4111-8111-111111111111", {
    displayName: "打工小狗",
    avatarUrl: "/brand-mark.svg",
    personaType: "worker",
    personaDesc: "疲惫但嘴贫的上班族，围绕加班、通勤、会议、周报和领导自嘲，不攻击个人。",
    displayLabel: "AI 吐槽员",
    tone: "疲惫、嘴贫、自嘲、生活化，但不恶毒",
    topics: ["加班", "通勤", "会议", "周报", "领导"]
  }],
  ["22222222-2222-4222-8222-222222222222", {
    displayName: "工位土豆",
    avatarUrl: "/brand-mark.svg",
    personaType: "worker",
    personaDesc: "摆烂、疲惫、冷幽默",
    displayLabel: "PoPo 分身",
    tone: "有梗，但不要太像段子手",
    topics: ["摸鱼", "PPT", "日报", "绩效", "咖啡续命"]
  }],
  ["66666666-6666-4666-8666-666666666666", {
    displayName: "作业刺客",
    avatarUrl: "/brand-mark.svg",
    personaType: "student",
    personaDesc: "大学生、赶作业、熬夜",
    displayLabel: "PoPo 分身",
    tone: "像学生深夜发疯",
    topics: ["作业", "ddl", "老师", "作品集", "课堂展示"]
  }],
  ["99999999-9999-4999-8999-999999999999", {
    displayName: "宿舍观察员",
    avatarUrl: "/brand-mark.svg",
    personaType: "student",
    personaDesc: "观察生活、吐槽舍友但不攻击",
    displayLabel: "AI 吐槽员",
    tone: "生活细节多一点",
    topics: ["宿舍作息", "外卖", "洗衣机", "空调", "噪音"]
  }],
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
    displayName: "人间漏气球",
    avatarUrl: "/brand-mark.svg",
    personaType: "life",
    personaDesc: "生活崩溃但可爱",
    displayLabel: "PoPo 分身",
    tone: "更泛生活化，适合所有用户共鸣",
    topics: ["失眠", "外卖", "减肥", "社交尴尬", "天气", "拖延"]
  }]
]);
const bannedPhrases = ["作为一个AI", "作为AI", "我是一名用户", "我不能提供", "我无法协助"];
const topicTerms = [...new Set([...expectedConfigs.values()].flatMap((config) => config.topics))]
  .sort((left, right) => right.length - left.length);
const topicPattern = new RegExp(topicTerms.map(escapeRegExp).join("|"), "giu");

assert.equal(bots.length, 5, "should define exactly 5 target AI bots");
assert.deepEqual(new Map(bots.map((bot) => [bot.id, bot.displayName])), expectedBots);
assert.deepEqual(
  new Map(bots.map(({ id, templates: _templates, ...config }) => [id, config])),
  expectedConfigs,
  "bot configurations should exactly match the approved design"
);

const seenNames = new Set();
const seenContent = new Set();
const normalizedContent = new Map();
for (const bot of bots) {
  assert.ok(bot.id, "bot needs id");
  assert.ok(bot.displayName, "bot needs displayName");
  assert.ok(bot.avatarUrl, `${bot.displayName} needs avatarUrl`);
  assert.ok(["worker", "student", "life"].includes(bot.personaType), `${bot.displayName} needs a valid personaType`);
  assert.ok(bot.personaDesc, `${bot.displayName} needs personaDesc`);
  assert.ok(["AI 吐槽员", "PoPo 分身"].includes(bot.displayLabel), `${bot.displayName} needs an exact AI display label`);
  assert.ok(bot.tone, `${bot.displayName} needs tone`);
  assert.ok(Array.isArray(bot.topics) && bot.topics.length > 0, `${bot.displayName} needs topics`);
  assert.ok(Array.isArray(bot.templates), `${bot.displayName} needs templates`);
  assert.ok(bot.templates.length >= 60, `${bot.displayName} should have at least 60 templates`);
  assert.ok(!seenNames.has(bot.displayName), `${bot.displayName} should be unique`);
  seenNames.add(bot.displayName);

  const patternKeys = new Set();
  for (const template of bot.templates) {
    assert.equal(typeof template, "object", `${bot.displayName} template should be an object`);
    const { content, patternKey } = template;
    assert.equal(typeof content, "string", `${bot.displayName} template content should be a string`);
    assert.equal(typeof patternKey, "string", `${bot.displayName} patternKey should be a string`);
    assert.ok(patternKey.trim(), `${bot.displayName} patternKey should be non-empty`);
    assert.ok(content.length >= 15 && content.length <= 60, `${bot.displayName} template length out of range: ${content}`);
    for (const phrase of bannedPhrases) {
      assert.ok(!content.includes(phrase), `${bot.displayName} template contains banned phrase ${phrase}: ${content}`);
    }
    assert.ok(!seenContent.has(content), `duplicate AI template: ${content}`);
    seenContent.add(content);
    const normalized = normalizeTemplate(content);
    assert.ok(
      !normalizedContent.has(normalized),
      `near-duplicate AI templates after topic normalization: ${normalizedContent.get(normalized)} / ${content}`
    );
    normalizedContent.set(normalized, content);
    patternKeys.add(patternKey);
  }
  assert.ok(patternKeys.size >= 8, `${bot.displayName} should have at least 8 patternKey groups`);
}

assert.equal(new Set(bots.flatMap((bot) => bot.templates.map((item) => item.content))).size, 300);
console.log(`AI bot checks passed: ${bots.length} bots, ${seenContent.size} templates.`);

function normalizeTemplate(content) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(topicPattern, "<topic>")
    .replace(/[^\p{L}\p{N}<>]+/gu, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
