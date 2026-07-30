// Context screenshots for the per-box minis on the PoP annex deck.
//   node demo/build-box-shots.mjs
// Captures the views that have no screenshot yet (placement planning tabs,
// marketplace, media planner). Safe skips if a view fails to render.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "demo", "screenshots");
const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:8081";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })).newPage();

async function login(profile) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await sleep(4000);
  await page.locator("button.profile-card", { hasText: profile }).first().click({ timeout: 20000 });
  await sleep(1800);
}
async function nav(label) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(250);
  await page.locator("nav button, aside button").filter({ hasText: label }).first().click({ timeout: 12000 });
  await sleep(2200);
}
async function shot(name) { await sleep(400); await page.screenshot({ path: join(OUT, `${name}.png`) }); console.log("  shot -> " + name); }
async function safe(label, fn) { try { await fn(); } catch (e) { console.log(`  SKIP ${label}: ${String(e.message || e).split("\n")[0]}`); } }

await safe("admin login", () => login("Platform Admin"));

await safe("placement map", async () => {
  await nav("Planning");
  await sleep(3500);
  await shot("box-placement-map");
});
await safe("placement validation", async () => {
  const tab = page.locator('[role="tab"]').filter({ hasText: /validation|Validation/ }).first();
  await tab.click({ timeout: 8000 });
  await sleep(2000);
  await shot("box-placement-validation");
});
await safe("placement portfolio", async () => {
  const tab = page.locator('[role="tab"]').filter({ hasText: /portfolio|Portfolio/ }).first();
  await tab.click({ timeout: 8000 });
  await sleep(1800);
  await shot("box-placement-portfolio");
});

await safe("advertiser login", () => login("Advertiser"));
await safe("marketplace", async () => {
  await nav("Marketplace");
  await sleep(2000);
  await shot("box-marketplace");
});
await safe("media planner", async () => {
  await nav("Media Planner");
  await sleep(1500);
  const btn = page.locator("button", { hasText: "Build my plan" }).first();
  await btn.click({ timeout: 8000 });
  await sleep(1500);
  await shot("box-media-planner");
});

await browser.close();
console.log("done");
