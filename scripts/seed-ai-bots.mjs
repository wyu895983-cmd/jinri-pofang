import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

await loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding AI bots.");
}

const bots = JSON.parse(await readFile(new URL("../lib/ai-bots-data.json", import.meta.url), "utf8"));
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const targetIds = bots.map((bot) => bot.id);

const aiBots = bots.map((bot) => ({
  id: bot.id,
  display_name: bot.displayName,
  avatar_url: bot.avatarUrl,
  persona_type: bot.personaType,
  persona_desc: bot.personaDesc,
  tone: bot.tone,
  topics: bot.topics,
  display_label: bot.displayLabel,
  is_active: true
}));

const templates = bots.flatMap((bot) =>
  bot.templates.map(({ content, patternKey }) => ({
    ai_bot_id: bot.id,
    content,
    pattern_key: patternKey,
    is_active: true
  }))
);

await deactivateNonTargetBots();
await upsert("ai_bots", aiBots, "id");
await upsert("ai_post_templates", templates, "ai_bot_id,content");
await verifySeed();

console.log(`Seeded ${bots.length} AI bots and ${templates.length} templates.`);

async function deactivateNonTargetBots() {
  const { error } = await supabase
    .from("ai_bots")
    .update({ is_active: false })
    .not("id", "in", `(${targetIds.join(",")})`);
  if (error) throw new Error(`ai_bots deactivation failed: ${error.message}`);
}

async function upsert(table, rows, onConflict) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} seed failed: ${error.message}`);
}

async function verifySeed() {
  const { data: activeBots, error: botError } = await supabase
    .from("ai_bots")
    .select("id")
    .eq("is_active", true);
  if (botError) throw new Error(`ai_bots verification failed: ${botError.message}`);
  const activeBotIds = new Set(activeBots.map((bot) => bot.id));
  if (activeBotIds.size !== targetIds.length || targetIds.some((id) => !activeBotIds.has(id))) {
    throw new Error(
      `Seed verification failed: expected exactly 5 active target bots; active bots must exactly match target IDs (found ${activeBots.length}).`
    );
  }

  for (const targetId of targetIds) {
    const { count, error: templateError } = await supabase
      .from("ai_post_templates")
      .select("*", { count: "exact", head: true })
      .eq("ai_bot_id", targetId)
      .eq("is_active", true);
    if (templateError) throw new Error(`ai_post_templates verification failed: ${templateError.message}`);
    if (count < 60) {
      throw new Error(
        `Seed verification failed: every target bot must have at least 60 active templates; ${targetId} has ${count}.`
      );
    }
  }
}

async function loadEnvLocal() {
  let raw = "";
  try {
    raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^[ '\"]|[ '\"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
