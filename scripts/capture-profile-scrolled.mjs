import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices, request } from "playwright";

const baseUrl = (process.env.PORTFOLIO_BASE_URL || "https://jinri-pofang.vercel.app").replace(/\/$/, "");
const outputPath = resolve(process.cwd(), "portfolio-case", "jinri-pofang-profile-page-scrolled.png");
const journeyOutputPath = resolve(process.cwd(), "portfolio-screens", "11-full-profile-avatar-start.png");

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

const profile = await rpc(api, "login_or_create_profile", {
  raw_nickname: "作品集破防人",
  raw_passphrase: "portfolio-2026"
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

await context.addInitScript((user) => {
  window.localStorage.setItem("jinri-pofang:welcome-complete", "true");
  window.localStorage.setItem(
    "jinri-pofang:guest-user",
    JSON.stringify({
      guest_user_id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      last_login_date: user.last_login_date,
      login_streak: user.login_streak,
      exp: user.exp,
      energy: user.energy,
      total_posts: user.total_posts,
      total_likes: user.total_likes,
      is_admin: user.is_admin
    })
  );
}, profile);

const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  await page.locator("header").evaluate((element) => {
    element.style.display = "none";
  });
  await page.locator("button[aria-label]").first().evaluate((element) => {
    element.style.display = "none";
  });

  const profileCard = page.locator("section").filter({ hasText: "我的 PoPo 档案" }).first();
  await profileCard.waitFor({ state: "visible" });
  await page.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "instant" });
  }, await profileCard.elementHandle());
  await page.waitForTimeout(700);

  await mkdir(resolve(process.cwd(), "portfolio-case"), { recursive: true });
  await page.screenshot({ path: outputPath });

  await page.evaluate((profileElement) => {
    document.querySelectorAll("body > nav, main ~ *").forEach((element) => {
      element.style.display = "none";
    });
    let sibling = profileElement.previousElementSibling;
    while (sibling) {
      sibling.style.display = "none";
      sibling = sibling.previousElementSibling;
    }
    const main = document.querySelector("main");
    if (main) {
      main.style.paddingTop = "0";
      main.style.paddingBottom = "0";
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, await profileCard.elementHandle());
  await page.waitForTimeout(500);
  await mkdir(resolve(process.cwd(), "portfolio-screens"), { recursive: true });
  await page.locator("main").screenshot({ path: journeyOutputPath });
  console.log(outputPath);
  console.log(journeyOutputPath);
} finally {
  await browser.close();
}
