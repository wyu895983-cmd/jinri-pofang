import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices, request } from "playwright";

const baseUrl = (process.env.PORTFOLIO_BASE_URL || "https://jinri-pofang.vercel.app").replace(/\/$/, "");
const outputPath = resolve(process.cwd(), "portfolio-screens", "08-comments-replies.png");
const passphrase = "portfolio-2026";

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

const env = await loadEnvFile();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL/key in .env.local.");

const api = await request.newContext({
  baseURL: supabaseUrl,
  extraHTTPHeaders: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
});

const owner = await rpc(api, "login_or_create_profile", {
  raw_nickname: "作品集破防人",
  raw_passphrase: passphrase
});
const actor = await rpc(api, "login_or_create_profile", {
  raw_nickname: "作品集互动员",
  raw_passphrase: passphrase
});
const post = await rpc(api, "create_post", {
  post_content: "作品集测试：今天最破防的是，需求写着只改一点点。",
  post_sticker_id: null,
  profile_uuid: owner.id
});
const comment = await rpc(api, "create_comment", {
  comment_content: "这句真的太有共鸣了。",
  comment_sticker_id: null,
  parent_comment_uuid: null,
  post_uuid: post.id,
  profile_uuid: actor.id
});
await rpc(api, "create_comment", {
  comment_content: "@作品集互动员：收到，继续优雅破防。",
  comment_sticker_id: null,
  parent_comment_uuid: comment.id,
  post_uuid: post.id,
  profile_uuid: owner.id
});
await api.dispose();

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
  window.localStorage.setItem(
    "jinri-pofang:guest-user",
    JSON.stringify({
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
    })
  );
}, owner);

const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/post/${post.id}?portfolio=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  const reply = page.getByText("继续优雅破防", { exact: false }).last();
  await reply.waitFor({ state: "visible" });
  await page.evaluate((element) => {
    const replyTop = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, replyTop - 580), behavior: "instant" });
  }, await reply.elementHandle());
  await page.waitForTimeout(700);

  await mkdir(resolve(process.cwd(), "portfolio-screens"), { recursive: true });
  await page.screenshot({ path: outputPath });
  console.log(outputPath);
} finally {
  await browser.close();
}
