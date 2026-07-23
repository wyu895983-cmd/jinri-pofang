import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const bots = JSON.parse(await readFile(new URL("../lib/ai-bots-data.json", import.meta.url), "utf8"));
const targetIds = bots.map((bot) => bot.id);

test("seed preserves history while upserting target bots and pattern-keyed templates", async () => {
  const result = await runSeed();

  assert.equal(result.status, 0, result.stderr);
  const calls = await readCalls(result.logPath);
  const botUpsert = calls.find((call) => call.table === "ai_bots" && call.method === "upsert");
  const templateUpsert = calls.find((call) => call.table === "ai_post_templates" && call.method === "upsert");
  const deactivate = calls.find((call) => call.table === "ai_bots" && call.method === "update");

  assert.deepEqual(botUpsert.options, { onConflict: "id" });
  assert.deepEqual(botUpsert.rows.map((row) => row.id), targetIds);
  assert.deepEqual(templateUpsert.options, { onConflict: "ai_bot_id,content" });
  assert.equal(templateUpsert.rows.length, 300);
  assert.deepEqual(templateUpsert.rows[0], {
    ai_bot_id: bots[0].id,
    content: bots[0].templates[0].content,
    pattern_key: bots[0].templates[0].patternKey,
    is_active: true
  });
  assert.deepEqual(deactivate.values, { is_active: false });
  assert.ok(
    deactivate.filters.some(
      ([method, column, operator, value]) =>
        ((method === "filter" && operator === "not.in") || (method === "not" && operator === "in")) &&
        column === "id" &&
        targetIds.every((id) => value.includes(id))
    ),
    "expected a non-target ID filter instead of deleting historical bots"
  );
  assert.equal(calls.some((call) => call.method === "delete"), false);
});

test("seed fails when a target bot has fewer than 60 active templates", async () => {
  const result = await runSeed("low-template-count");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /at least 60 active templates/i);
});

test("seed fails unless exactly five target bots are active", async () => {
  const result = await runSeed("missing-active-target");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exactly 5 active target bots/i);
});

test("seed fails when a non-target bot remains active", async () => {
  const result = await runSeed("extra-active-non-target");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /active bots must exactly match target ids/i);
});

test("seed uses exact head counts instead of returned template rows", async () => {
  const result = await runSeed("truncated-template-response");

  assert.equal(result.status, 0, result.stderr);
  const calls = await readCalls(result.logPath);
  const templateCounts = calls.filter(
    (call) => call.table === "ai_post_templates" && call.method === "select" && call.options?.count === "exact"
  );
  assert.equal(templateCounts.length, targetIds.length);
  assert.ok(templateCounts.every((call) => call.options.head === true));
  assert.deepEqual(
    templateCounts.map((call) => call.filters.find(([method, column]) => method === "eq" && column === "ai_bot_id")?.[2]),
    targetIds
  );
});

async function runSeed(scenario = "success") {
  const root = await mkdtemp(join(tmpdir(), "seed-ai-bots-"));
  const scriptsDir = join(root, "scripts");
  const libDir = join(root, "lib");
  const packageDir = join(root, "node_modules", "@supabase", "supabase-js");
  const logPath = join(root, "calls.jsonl");

  await Promise.all([
    mkdir(scriptsDir, { recursive: true }),
    mkdir(libDir, { recursive: true }),
    mkdir(packageDir, { recursive: true })
  ]);
  await Promise.all([
    copyFile(new URL("../scripts/seed-ai-bots.mjs", import.meta.url), join(scriptsDir, "seed-ai-bots.mjs")),
    copyFile(new URL("../lib/ai-bots-data.json", import.meta.url), join(libDir, "ai-bots-data.json")),
    writeFile(join(root, "package.json"), JSON.stringify({ type: "module" })),
    writeFile(join(packageDir, "package.json"), JSON.stringify({ type: "module", exports: "./index.js" })),
    writeFile(join(packageDir, "index.js"), fakeSupabaseModule)
  ]);

  const result = spawnSync(process.execPath, ["scripts/seed-ai-bots.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
      MOCK_LOG_PATH: logPath,
      MOCK_SCENARIO: scenario,
      MOCK_TARGET_IDS: JSON.stringify(targetIds)
    }
  });

  return { ...result, logPath };
}

async function readCalls(path) {
  const raw = await readFile(path, "utf8");
  return raw.trim().split("\n").filter(Boolean).map(JSON.parse);
}

const fakeSupabaseModule = String.raw`
import { appendFileSync } from "node:fs";

const targetIds = JSON.parse(process.env.MOCK_TARGET_IDS);

function record(call) {
  appendFileSync(process.env.MOCK_LOG_PATH, JSON.stringify(call) + "\n");
}

class Query {
  constructor(table) {
    this.table = table;
    this.operation = null;
    this.filters = [];
  }

  upsert(rows, options) {
    this.operation = { method: "upsert", rows, options };
    return this;
  }

  update(values) {
    this.operation = { method: "update", values };
    return this;
  }

  delete() {
    this.operation = { method: "delete" };
    return this;
  }

  select(columns, options) {
    this.operation = { method: "select", columns, options };
    return this;
  }

  in(column, values) {
    this.filters.push(["in", column, values]);
    return this;
  }

  eq(column, value) {
    this.filters.push(["eq", column, value]);
    return this;
  }

  not(column, operator, value) {
    this.filters.push(["not", column, operator, value]);
    return this;
  }

  filter(column, operator, value) {
    this.filters.push(["filter", column, operator, value]);
    return this;
  }

  then(resolve) {
    record({ table: this.table, ...this.operation, filters: this.filters });
    let data = null;
    if (this.operation.method === "select" && this.table === "ai_bots") {
      let activeIds = process.env.MOCK_SCENARIO === "missing-active-target" ? targetIds.slice(0, 4) : targetIds;
      if (process.env.MOCK_SCENARIO === "extra-active-non-target") {
        activeIds = [...targetIds, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"];
      }
      const idFilter = this.filters.find(([method, column]) => method === "in" && column === "id");
      if (idFilter) activeIds = activeIds.filter((id) => idFilter[2].includes(id));
      data = activeIds.map((id) => ({ id }));
    }
    if (this.operation.method === "select" && this.table === "ai_post_templates") {
      const botId = this.filters.find(([method, column]) => method === "eq" && column === "ai_bot_id")?.[2];
      if (this.operation.options?.head) {
        const count = process.env.MOCK_SCENARIO === "low-template-count" && botId === targetIds[0] ? 59 : 5000;
        resolve({ data: null, count, error: null });
        return;
      }
      const rowsPerBot = process.env.MOCK_SCENARIO === "truncated-template-response" ? 1 : 60;
      data = targetIds.flatMap((id) => Array.from({ length: rowsPerBot }, () => ({ ai_bot_id: id })));
    }
    resolve({ data, count: null, error: null });
  }
}

export function createClient() {
  return { from(table) { return new Query(table); } };
}
`;
