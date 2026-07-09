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
      bad.push(typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName);
    }
  }
  return [...new Set(bad)].slice(0, 6);
});
async function shot(name) {
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + "/s2-" + name + ".png" });
  log.push({ name, leaks: await audit() });
}
async function boot(profile, theme, lang) {
  await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
  await p.evaluate((t) => localStorage.setItem("dooh-theme", t), theme);
  await p.reload({ waitUntil: "networkidle" });
  await p.locator("button", { hasText: profile }).first().click();
  await p.waitForTimeout(1800);
  if (lang === "ar") { await p.locator(".topbar-actions .icon-button", { hasText: "AR" }).click(); await p.waitForTimeout(1200); }
}
async function step(name, fn) {
  try { await fn(); await shot(name); }
  catch (e) { log.push({ name, ERROR: String(e).split("\n")[0].slice(0, 110) }); }
}
const nav = (label) => p.locator(".nav-group button", { hasText: label }).first().click();
const wait = (ms) => p.waitForTimeout(ms);

// Section A: dark dialogs re-check (after fixes), fresh boot per dialog
await boot("Platform Admin", "dark");
await step("d2-kill-confirm", async () => {
  await p.locator(".cc-more-btn").click();
  await p.locator(".cc-more-menu button", { hasText: "Kill switch" }).click();
  await p.locator(".kill-modal").waitFor({ timeout: 5000 });
  await p.locator(".kill-modal input").first().fill("Sweep test");
  await p.locator(".kill-modal button", { hasText: "Blank displays" }).first().click();
  await p.locator(".kill-dialog").waitFor({ timeout: 5000 });
});
await boot("Platform Admin", "dark");
await step("d2-dispatch", async () => { await p.locator(".cc-more-btn").click(); await p.locator(".cc-more-menu button", { hasText: "Dispatch technician" }).click(); await p.locator(".dispatch-dialog").waitFor({ timeout: 5000 }); });

// Section B: CMS mfa + studio
await boot("Platform Admin", "dark");
await step("d2-cms-mfa", async () => {
  await nav("CMS"); await wait(1500);
  const start = p.locator("button", { hasText: "Start review" }).first();
  if (await start.count()) { await start.click(); await wait(800); }
  const sel = p.locator(".approvals-panel select").first();
  await sel.scrollIntoViewIfNeeded();
  await sel.selectOption({ index: 1 });
  await p.locator(".approvals-panel button", { hasText: "MFA" }).first().click();
  await p.locator(".revision-dialog").last().waitFor({ timeout: 5000 });
});
await boot("Platform Admin", "dark");
await step("d2-studio", async () => { await nav("CMS"); await wait(1200); await p.locator("button", { hasText: "Create with AI" }).first().click(); await wait(800); });

// Section C: pages (single boot, nav only - no dialogs so no cascade risk)
await boot("Platform Admin", "dark");
await step("d2-alerts", async () => { await nav("Alerts and Emergencies"); await wait(1400); const row = p.locator("tbody tr").first(); if (await row.count()) { await row.click(); await wait(900); } });
await step("d2-kanban", async () => { await nav("Network and Devices"); await wait(1500); await p.locator(".network-tabs button", { hasText: "Maintenance workbench" }).click(); await wait(900); });
await step("d2-twin-full", async () => { await p.locator(".network-tabs button", { hasText: "Asset operations" }).click(); await wait(1200); await p.locator(".asset-twin-pane button", { hasText: "Full screen" }).click(); await p.locator(".twin-fullscreen").waitFor({ timeout: 8000 }); await wait(1600); await p.keyboard.press("Escape"); });
await step("d2-financials", async () => { await nav("Financials"); await wait(1500); });
await step("d2-reports", async () => { await nav("Reports & BI"); await wait(1500); });
await step("d2-radius", async () => { await nav("Radius Broadcast"); await wait(2200); const preset = p.locator(".radius-presets button").first(); if (await preset.count()) { await preset.click(); await wait(1200); } });
await step("d2-yield", async () => { await nav("Yield Advisor"); await wait(1000); const ask = p.locator(".yield-form button").first(); if (await ask.count()) { await ask.click(); await wait(1600); } });
await step("d2-commercial", async () => { await nav("Commercial Map"); await wait(2200); });

// Section D: wizard (Advertiser)
await boot("Advertiser", "dark");
await step("d2-wizard", async () => { await nav("Marketplace"); await wait(1200); await p.locator("button", { hasText: "New campaign brief" }).first().click(); await wait(1000); });

// Section E: light pass
await boot("Platform Admin", "light");
await step("l2-cms", async () => { await nav("CMS"); await wait(1400); });
await step("l2-network", async () => { await nav("Network and Devices"); await wait(1800); });
await step("l2-financials", async () => { await nav("Financials"); await wait(1400); });
await step("l2-reports", async () => { await nav("Reports & BI"); await wait(1400); });
await boot("Platform Admin", "light");
await step("l2-kill", async () => { await p.locator(".cc-more-btn").click(); await p.locator(".cc-more-menu button", { hasText: "Kill switch" }).click(); await p.locator(".kill-modal").waitFor({ timeout: 5000 }); });

// Section F: RTL dark
await boot("Platform Admin", "dark", "ar");
await step("r2-cms", async () => { await p.locator(".nav-group button").nth(1).click(); await wait(1500); });
await step("r2-alerts", async () => { await p.locator(".nav-group button").nth(2).click(); await wait(1500); });
await step("r2-network", async () => { await p.locator(".nav-group button").nth(3).click(); await wait(1800); });

console.log(JSON.stringify(log, null, 1));
await b.close();
