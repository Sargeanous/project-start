// Deck-ready capability screenshots for the Unified DOOH Platform.
//
//   node demo/build-shots.mjs
//
// Logs in and navigates only (no governed writes). Frames render at 2x
// (3840x2160) for slides. The 3D twin is shot LAST and time-guarded, because
// screenshotting an actively rendering WebGL canvas can hang.

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
  await page.keyboard.press("Escape").catch(() => {}); // dismiss any lingering overlay
  await sleep(250);
  await page.locator("nav button, aside button").filter({ hasText: label }).first().click({ timeout: 15000 });
  await sleep(1600);
}
async function shot(name) {
  await sleep(400);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  shot -> ${name}.png`);
}
// Race a screenshot against a timeout so a hung WebGL frame can never wedge the run.
async function shotGuarded(name, ms = 12000) {
  const guard = new Promise((_, rej) => setTimeout(() => rej(new Error("screenshot timed out")), ms));
  await Promise.race([page.screenshot({ path: join(OUT, `${name}.png`) }), guard]);
  console.log(`  shot -> ${name}.png`);
}
async function safe(label, fn) {
  try { await fn(); } catch (err) { console.log(`  SKIP ${label}: ${String(err.message || err).split("\n")[0]}`); }
}

console.log("Capability screenshots...");
await fetch(`${BASE_URL}/api/dooh/reset`, { method: "POST" }).catch(() => {});
await login("Platform Admin");

await safe("01 control-centre", async () => {
  await nav("Control Centre");
  await page.locator(".hex-pin").first().waitFor({ timeout: 20000 });
  await sleep(2000);
  await shot("cap-01-control-centre");
});

await safe("02 network", async () => {
  await nav("Network and Devices");
  await page.locator(".nd-workspace").first().waitFor({ timeout: 15000 });
  await sleep(1500);
  await shot("cap-02-network-devices");
});

await safe("04 mediagpt", async () => {
  await nav("MediaGPT");
  await sleep(2000);
  await shot("cap-04-mediagpt-copilot");
});

await safe("05 commercial-map", async () => {
  await nav("Commercial Map");
  await page.locator(".hex-pin").first().waitFor({ timeout: 20000 });
  await sleep(1400);
  await page.evaluate(() => {
    const m = document.querySelectorAll(".leaflet-marker-icon.hex-pin-icon");
    (m[6] || m[m.length - 1]).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.locator(".commercial-popover").first().waitFor({ timeout: 8000 }).catch(() => {});
  await sleep(1200);
  await shot("cap-05-commercial-map");
});

await safe("06 cms-review", async () => {
  await nav("CMS");
  await sleep(1200);
  const sub = page.locator(".submission-list button").first();
  if (await sub.count()) await sub.click();
  await sleep(900);
  const mg = page.locator(".review-section-tabs button", { hasText: "MediaGPT" }).first();
  if (await mg.count()) await mg.click();
  await sleep(1400);
  await shot("cap-06-cms-ai-review");
});

await safe("07 alerts", async () => {
  await nav("Alerts");
  await page.locator(".alerts-list button").first().waitFor({ timeout: 12000 });
  await sleep(600);
  const weather = page.locator(".alerts-list button", { hasText: "Weather alert broadcast" }).first();
  if (await weather.count()) await weather.click();
  await sleep(1200);
  await shot("cap-07-alerts-emergency");
});

await safe("08 radius", async () => {
  await nav("Radius Broadcast");
  await sleep(2400);
  await shot("cap-08-radius-broadcast");
});

await safe("09 yield", async () => {
  await nav("Yield Advisor");
  await sleep(2000);
  await shot("cap-09-yield-advisor");
});

await safe("10 reports", async () => {
  await nav("Reports");
  await sleep(2200);
  await shot("cap-10-reports-bi");
});

// 3) 3D twin, exploded — LAST and time-guarded (WebGL screenshot can hang).
await safe("03 twin", async () => {
  await nav("Network and Devices");
  await page.locator(".nd-workspace").first().waitFor({ timeout: 15000 });
  await page.locator(".nd-viewer-fs").first().click();
  await page.locator(".twin-fullscreen canvas").first().waitFor({ timeout: 15000 });
  await sleep(3000);
  const slider = page.locator(".twin-fullscreen .twin-explode input[type=range]").first();
  if (await slider.count()) {
    await slider.evaluate((node) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(node, "0.5");
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  await sleep(6000); // let the explode fully settle so the canvas stops rendering
  await shotGuarded("cap-03-digital-twin", 12000);
});

await context.close();
await browser.close();
console.log("Done. Frames in demo/screenshots/cap-*.png");
