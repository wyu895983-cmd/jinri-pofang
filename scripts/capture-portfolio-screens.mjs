import { readFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices, request } from "playwright";

const baseUrl = (process.env.PORTFOLIO_BASE_URL || "https://jinri-pofang.vercel.app").replace(/\/$/, "");
const outputDir = resolve(process.cwd(), "portfolio-screens");
const ownerName = process.env.PORTFOLIO_OWNER_NAME || "作品集破防人";
const actorName = process.env.PORTFOLIO_ACTOR_NAME || "作品集互动员";
const passphrase = process.env.PORTFOLIO_PASSPHRASE || "portfolio-2026";
const files = [
  "01-home.png", "02-leaderboard.png", "03-create.png", "04-profile.png",
  "05-favorites.png", "06-search.png", "07-post-detail.png", "08-comments.png",
  "09-interactions.png", "10-full-home.png", "11-full-profile.png", "12-full-post-detail.png"
];
const results = [];

async function loadEnvFile() {
  const values = {};
  const source = await readFile(resolve(process.cwd(), ".env.local"), "utf8").catch(() => "");
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

async function rpc(api, name, data) {
  const response = await api.post(`/rest/v1/rpc/${name}`, { data });
  if (!response.ok()) throw new Error(`${name} failed (${response.status()}): ${await response.text()}`);
  return response.json();
}

async function createPortfolioData() {
  const env = await loadEnvFile();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL/key in .env.local.");

  const api = await request.newContext({
    baseURL: supabaseUrl,
    extraHTTPHeaders: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  try {
    const owner = await rpc(api, "login_or_create_profile", { raw_nickname: ownerName, raw_passphrase: passphrase });
    const actor = await rpc(api, "login_or_create_profile", { raw_nickname: actorName, raw_passphrase: passphrase });
    const post = await rpc(api, "create_post", {
      post_content: "作品集测试：今天最破防的是，需求写着只改一点点。",
      post_sticker_id: null,
      profile_uuid: owner.id
    });
    await rpc(api, "react_to_post", { post_uuid: post.id, profile_uuid: actor.id, reaction_name: "like" });
    const comment = await rpc(api, "create_comment", {
      comment_content: "这句真的太有共鸣了。",
      comment_sticker_id: null,
      parent_comment_uuid: null,
      post_uuid: post.id,
      profile_uuid: actor.id
    });
    await rpc(api, "create_comment", {
      comment_content: "收到，继续优雅破防。",
      comment_sticker_id: null,
      parent_comment_uuid: comment.id,
      post_uuid: post.id,
      profile_uuid: owner.id
    });
    return { owner, postUrl: `${baseUrl}/post/${post.id}` };
  } finally {
    await api.dispose();
  }
}

async function waitForPage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function open(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForPage(page);
  console.log(`[URL] ${page.url()}`);
}

async function capture(page, url, name, options = {}) {
  await open(page, url);
  if (options.heading) {
    const heading = page.getByRole("heading", { name: options.heading }).first();
    if (!(await heading.isVisible().catch(() => false))) throw new Error(`Section not found: ${options.heading}`);
    await heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  const path = resolve(outputDir, name);
  await page.screenshot({ path, fullPage: Boolean(options.fullPage) });
  results.push({ accessUrl: page.url(), filePath: path, screenshotUrl: `file:///${path.replaceAll("\\", "/")}` });
  console.log(`[SAVED] ${path}`);
}

await mkdir(outputDir, { recursive: true });
await Promise.all(files.map((name) => rm(resolve(outputDir, name), { force: true })));

const { owner, postUrl } = await createPortfolioData();
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  ...devices["iPhone 15 Pro"],
  colorScheme: "dark",
  deviceScaleFactor: 2,
  screen: { width: 393, height: 852 },
  viewport: { width: 393, height: 852 }
});
await context.addInitScript((profile) => {
  window.localStorage.setItem("jinri-pofang:welcome-complete", "true");
  window.localStorage.setItem("jinri-pofang:guest-user", JSON.stringify({
    guest_user_id: profile.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
    last_login_date: profile.last_login_date,
    login_streak: profile.login_streak,
    exp: profile.exp,
    energy: profile.energy,
    total_posts: profile.total_posts,
    total_likes: profile.total_likes,
    is_admin: profile.is_admin
  }));
}, owner);
const page = await context.newPage();

try {
  await capture(page, `${baseUrl}/`, "01-home.png");
  await capture(page, `${baseUrl}/leaderboard`, "02-leaderboard.png");
  await capture(page, `${baseUrl}/create`, "03-create.png");
  await capture(page, `${baseUrl}/profile`, "04-profile.png");
  await capture(page, `${baseUrl}/favorites`, "05-favorites.png");
  await capture(page, `${baseUrl}/search`, "06-search.png");
  await capture(page, postUrl, "07-post-detail.png");
  await capture(page, `${postUrl}#comments`, "08-comments.png", { heading: "评论区" });
  await capture(page, `${baseUrl}/profile#interactions`, "09-interactions.png", { heading: "收到的互动" });
  await capture(page, `${baseUrl}/`, "10-full-home.png", { fullPage: true });
  await capture(page, `${baseUrl}/profile`, "11-full-profile.png", { fullPage: true });
  await capture(page, postUrl, "12-full-post-detail.png", { fullPage: true });
} finally {
  await browser.close();
}

console.log("\n截图清单：");
for (const result of results) {
  console.log(`实际访问 URL: ${result.accessUrl}`);
  console.log(`实际截图 URL: ${result.screenshotUrl}`);
  console.log(`文件路径: ${result.filePath}\n`);
}
