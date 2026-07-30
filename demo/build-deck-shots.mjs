// Deck screenshots for the three newest tabs (Planning, Construction, Tickets),
// which post-date the cap-*.png set. Mirrors demo/build-shots.mjs.
//
//   node demo/build-deck-shots.mjs
//
// Logs in as Platform Admin and navigates only (no governed writes).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "demo", "screenshots");
const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:8080";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await context.newPage();

async function login(profile = "Platform Admin") {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.locator("button", { hasText: profile }).first().click();
  await sleep(1400);
}
async function nav(label) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(250);
  await page.locator("nav button, aside button").filter({ hasText: label }).first().click({ timeout: 15000 });
  await sleep(1600);
}
async function shot(name) {
  await sleep(400);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  shot -> ${name}.png`);
}
async function safe(label, fn) {
  try { await fn(); } catch (err) { console.log(`  SKIP ${label}: ${String(err.message || err).split("\n")[0]}`); }
}

console.log("Deck screenshots (Planning, Construction, Tickets)...");
await login("Platform Admin");

await safe("planning", async () => {
  await nav("Planning");
  await page.locator(".plan-workspace").first().waitFor({ timeout: 15000 });
  await page.locator(".pz-map").first().waitFor({ timeout: 15000 });
  await sleep(3000); // let CARTO tiles settle
  await shot("deck-planning");
});

await safe("construction", async () => {
  await nav("Construction");
  await page.locator(".cons-programme").first().waitFor({ timeout: 15000 });
  await sleep(1800);
  await shot("deck-construction");
});

await safe("tickets", async () => {
  await nav("Tickets");
  await page.locator(".tkt-table").first().waitFor({ timeout: 15000 });
  await sleep(1500);
  await shot("deck-tickets");
});

await context.close();
await browser.close();
console.log("Done. Frames in demo/screenshots/deck-*.png");
