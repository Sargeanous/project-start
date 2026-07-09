import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const log = [];
const audit = () => p.evaluate(() => {
  const theme = document.documentElement.dataset.theme || "dark";
  const lum = (r, g, bl) => 0.2126 * r / 255 + 0.7152 * g / 255 + 0.0722 * bl / 255;
  const skip = /leaflet|cc-tag|cc-card|hex-pin|chat-send|cc-toast-glyph|creative|billboard|twin-stage|feed|avatar|badge|kill-panel/;
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    if (skip.test(el.className || "")) continue;
    const cs = getComputedStyle(el);
    const m = (cs.backgroundColor || "").match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
    if (!m) continue;
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a < 0.6) continue;
    const L = lum(+m[1], +m[2], +m[3]);
    const leak = theme === "dark" ? L > 0.72 : L < 0.22;
    if (leak) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 4000 || !r.width) continue;
      bad.push((typeof el.className === "string" && el.className ? el.className.split(" ")[0] : el.tagName));
    }
  }
  return [...new Set(bad)].slice(0, 8);
});
async function boot(profile, theme, lang) {
  await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
  await p.evaluate((t) => localStorage.setItem("dooh-theme", t), theme);
  await p.reload({ waitUntil: "networkidle" });
  await p.locator("button", { hasText: profile }).first().click();
  await p.waitForTimeout(1800);
  if (lang === "ar") { await p.locator(".topbar-actions .icon-button", { hasText: "AR" }).click(); await p.waitForTimeout(1200); }
}
const nav = (label) => p.locator(".nav-group button", { hasText: label }).first().click();
const wait = (ms) => p.waitForTimeout(ms);

// 1. MFA in dark
await boot("Platform Admin", "dark");
try {
  await nav("CMS"); await wait(1500);
  const start = p.locator("button", { hasText: "Start review" }).first();
  if (await start.count()) { await start.click(); await wait(900); }
  const panel = p.locator(".approvals-panel").first();
  await panel.scrollIntoViewIfNeeded({ timeout: 5000 });
  await panel.locator("select").selectOption({ index: 1 });
  await panel.locator("button", { hasText: "MFA" }).first().click();
  await p.locator(".revision-dialog").last().waitFor({ timeout: 5000 });
  await wait(400);
  await p.screenshot({ path: OUT + "/fx-mfa.png" });
  log.push({ name: "mfa-dark", leaks: await audit() });
} catch (e) { log.push({ name: "mfa-dark", ERROR: String(e).split("\n")[0].slice(0, 100) }); }

// 2. Wizard dark
await boot("Advertiser", "dark");
try {
  await nav("Marketplace"); await wait(1200);
  await p.locator("button", { hasText: "New campaign brief" }).first().click(); await wait(900);
  await p.screenshot({ path: OUT + "/fx-wizard.png" });
  log.push({ name: "wizard-dark", leaks: await audit() });
} catch (e) { log.push({ name: "wizard-dark", ERROR: String(e).slice(0, 100) }); }

// 3. Alerts dark + 4. RTL CMS audits
await boot("Platform Admin", "dark");
try {
  await nav("Alerts and Emergencies"); await wait(1400);
  const row = p.locator("tbody tr").first(); if (await row.count()) { await row.click(); await wait(900); }
  log.push({ name: "alerts-dark", leaks: await audit() });
} catch (e) { log.push({ name: "alerts-dark", ERROR: String(e).slice(0, 100) }); }
await boot("Platform Admin", "dark", "ar");
try {
  await p.locator(".nav-group button").nth(1).click(); await wait(1500);
  log.push({ name: "rtl-cms", leaks: await audit() });
} catch (e) { log.push({ name: "rtl-cms", ERROR: String(e).slice(0, 100) }); }

// 5. Twin fullscreen Escape
await boot("Platform Admin", "dark");
try {
  await nav("Network and Devices"); await wait(1600);
  await p.locator(".asset-twin-pane button", { hasText: "Full screen" }).click();
  await p.locator(".twin-fullscreen").waitFor({ timeout: 8000 });
  await p.keyboard.press("Escape");
  await wait(600);
  const still = await p.locator(".twin-fullscreen").count();
  log.push({ name: "twin-escape", closes: still === 0 });
} catch (e) { log.push({ name: "twin-escape", ERROR: String(e).slice(0, 100) }); }

console.log(JSON.stringify(log, null, 1));
await b.close();
