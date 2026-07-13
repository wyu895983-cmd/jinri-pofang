import aiBotsData from "@/lib/ai-bots-data.json";

export type AiPersonaType = "worker" | "student" | "life";

export type AiBot = {
  id: string;
  displayName: string;
  avatarUrl: string;
  personaType: AiPersonaType;
  personaDesc: string;
  displayLabel: string;
  tone: string;
  topics: string[];
  templates: string[];
};

export type GeneratedAiPost = {
  botId: string;
  content: string;
  personaType: AiPersonaType;
  createdAt: string;
};

export const AI_BOTS = aiBotsData as AiBot[];

export function isAiAutoPostingEnabled() {
  return process.env.NEXT_PUBLIC_AI_AUTO_POSTING_ENABLED !== "false";
}

export function getAiBot(botId: string) {
  return AI_BOTS.find((bot) => bot.id === botId) ?? null;
}

export function generateAiPost(bot: AiBot, usedContents: string[] = [], now = new Date()): GeneratedAiPost {
  const used = new Set(usedContents);
  const candidates = bot.templates.filter((template) => !used.has(template));
  const pool = candidates.length ? candidates : bot.templates;
  const content = pool[Math.floor(Math.random() * pool.length)] ?? bot.templates[0];

  return {
    botId: bot.id,
    content,
    personaType: bot.personaType,
    createdAt: now.toISOString()
  };
}

export function createAiAvatarFallback(bot: Pick<AiBot, "displayName" | "personaType">) {
  const palette: Record<AiPersonaType, string> = {
    worker: "#b7ff3c",
    student: "#a78bfa",
    life: "#f9a8d4"
  };
  const label = encodeURIComponent(bot.displayName.slice(0, 2));
  const color = encodeURIComponent(palette[bot.personaType]);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%2318181b'/%3E%3Ccircle cx='48' cy='48' r='30' fill='${color}' opacity='.22'/%3E%3Ctext x='48' y='55' text-anchor='middle' font-size='24' font-family='Arial,sans-serif' font-weight='700' fill='white'%3E${label}%3C/text%3E%3C/svg%3E`;
}

export function pickAiColdStartPosts(options: { existingRealPostCount: number; usedContents?: string[]; now?: Date }) {
  if (!isAiAutoPostingEnabled()) return [];

  const now = options.now ?? new Date();
  const targetCount = options.existingRealPostCount >= 20 ? 3 : 8 + Math.floor(Math.random() * 8);
  const bots = shuffle(AI_BOTS).slice(0, 3 + Math.floor(Math.random() * 4));
  const perBotCount = new Map<string, number>();
  const usedContents = [...(options.usedContents ?? [])];
  const posts: Array<GeneratedAiPost & { bot: AiBot }> = [];

  while (posts.length < targetCount) {
    const availableBots = bots.filter((bot) => (perBotCount.get(bot.id) ?? 0) < 2);
    if (!availableBots.length) break;

    const bot = availableBots[posts.length % availableBots.length];
    const generated = generateAiPost(bot, usedContents, withRandomPostingTime(now, posts.length));
    usedContents.push(generated.content);
    perBotCount.set(bot.id, (perBotCount.get(bot.id) ?? 0) + 1);
    posts.push({ ...generated, bot });
  }

  return posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function withRandomPostingTime(base: Date, index: number) {
  const windows = [
    [8 * 60, 10 * 60],
    [12 * 60, 14 * 60],
    [17 * 60 + 30, 19 * 60 + 30],
    [22 * 60, 25 * 60]
  ];
  const [start, end] = windows[index % windows.length];
  const minutes = start + Math.floor(Math.random() * (end - start));
  const date = new Date(base);
  date.setHours(Math.floor(minutes / 60) % 24, minutes % 60, Math.floor(Math.random() * 50), 0);
  if (date.getTime() > base.getTime()) date.setDate(date.getDate() - 1);
  return date;
}

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
