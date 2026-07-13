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
  bot.templates.map((content) => ({
    ai_bot_id: bot.id,
    content,
    is_active: true
  }))
);

await upsert("ai_bots", aiBots, "id");
await upsert("ai_post_templates", templates, "ai_bot_id,content");

console.log(`Seeded ${bots.length} AI bots and ${templates.length} templates.`);

async function upsert(table, rows, onConflict) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} seed failed: ${error.message}`);
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
