import aiBotsData from "@/lib/ai-bots-data.json";

export type AiPersonaType = "worker" | "student" | "life";

export type AiBot = {
  id: string;
  displayName: string;
  avatarUrl: string;
  personaType: AiPersonaType;
  personaDesc: string;
  displayLabel: "AI吐槽员" | "PoPo分身";
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

export type AiPostingConfig = {
  enabled: boolean;
  minDailyPosts: number;
  maxDailyPosts: number;
  minBotsPerRun: number;
  maxBotsPerRun: number;
  maxPostsPerBotPerDay: number;
  minHoursBetweenBotPosts: number;
  reduceWhenRealPostsAtLeast: number;
  timeWindows: Array<{ start: string; end: string }>;
};

export const AI_BOTS = aiBotsData as AiBot[];

export const DEFAULT_AI_POSTING_CONFIG: AiPostingConfig = {
  enabled: true,
  minDailyPosts: 8,
  maxDailyPosts: 15,
  minBotsPerRun: 3,
  maxBotsPerRun: 6,
  maxPostsPerBotPerDay: 2,
  minHoursBetweenBotPosts: 4,
  reduceWhenRealPostsAtLeast: 20,
  timeWindows: [
    { start: "08:00", end: "10:00" },
    { start: "12:00", end: "14:00" },
    { start: "17:30", end: "19:30" },
    { start: "22:00", end: "01:00" }
  ]
};

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
  const targetCount =
    options.existingRealPostCount >= DEFAULT_AI_POSTING_CONFIG.reduceWhenRealPostsAtLeast
      ? DEFAULT_AI_POSTING_CONFIG.minBotsPerRun
      : randomInt(DEFAULT_AI_POSTING_CONFIG.minDailyPosts, DEFAULT_AI_POSTING_CONFIG.maxDailyPosts);
  const bots = shuffle(AI_BOTS).slice(0, randomInt(DEFAULT_AI_POSTING_CONFIG.minBotsPerRun, DEFAULT_AI_POSTING_CONFIG.maxBotsPerRun));
  const perBotCount = new Map<string, number>();
  const usedContents = [...(options.usedContents ?? [])];
  const posts: Array<GeneratedAiPost & { bot: AiBot }> = [];

  while (posts.length < targetCount) {
    const availableBots = bots.filter((bot) => (perBotCount.get(bot.id) ?? 0) < DEFAULT_AI_POSTING_CONFIG.maxPostsPerBotPerDay);
    if (!availableBots.length) break;

    const bot = availableBots[posts.length % availableBots.length];
    const scheduledAt = withRandomPostingTime(now, posts.length);
    const generated = generateAiPost(bot, usedContents, scheduledAt);
    usedContents.push(generated.content);
    perBotCount.set(bot.id, (perBotCount.get(bot.id) ?? 0) + 1);
    posts.push({ ...generated, bot });
  }

  return posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function withRandomPostingTime(base: Date, index: number) {
  const window = DEFAULT_AI_POSTING_CONFIG.timeWindows[index % DEFAULT_AI_POSTING_CONFIG.timeWindows.length];
  const minutes = randomMinuteInWindow(window.start, window.end);
  const date = new Date(base);
  date.setHours(Math.floor(minutes / 60), minutes % 60, Math.floor(Math.random() * 50), 0);
  if (date.getTime() > base.getTime()) date.setDate(date.getDate() - 1);
  return date;
}

function randomMinuteInWindow(start: string, end: string) {
  const startMinute = toMinute(start);
  let endMinute = toMinute(end);
  if (endMinute <= startMinute) endMinute += 24 * 60;
  const minute = randomInt(startMinute, endMinute - 1);
  return minute % (24 * 60);
}

function toMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
