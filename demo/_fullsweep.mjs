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
  await p.screenshot({ path: OUT + "/st-" + name + ".png" });
  const a = await audit();
  log.push({ name, leaks: a });
}
async function step(name, fn) {
  try { await fn(); await shot(name); }
  catch (e) { log.push({ name, ERROR: String(e).split("\n")[0].slice(0, 110) }); await p.keyboard.press("Escape").catch(() => {}); }
}
const nav = (label) => p.locator(".nav-group button", { hasText: label }).first().click();
const wait = (ms) => p.waitForTimeout(ms);

await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
await p.locator("button", { hasText: "Platform Admin" }).first().click();
await p.locator(".cc-toast").first().waitFor({ timeout: 20000 });
await wait(2000);

await step("d-kill-modal", async () => { await p.locator(".cc-more-btn").click(); await p.locator(".cc-more-menu button", { hasText: "Kill switch" }).click(); await p.locator(".kill-modal").waitFor({ timeout: 5000 }); });
await step("d-kill-confirm", async () => { await p.locator(".kill-modal input").first().fill("Sweep test"); await p.locator(".kill-modal button", { hasText: "Blank displays" }).first().click(); await p.locator(".kill-dialog").waitFor({ timeout: 5000 }); });
await p.locator(".kill-dialog button", { hasText: "Cancel" }).first().click().catch(() => {});
await p.locator(".kill-modal .icon-btn").first().click().catch(() => {});
await step("d-dispatch", async () => { await p.locator(".cc-more-btn").click(); await p.locator(".cc-more-menu button", { hasText: "Dispatch technician" }).click(); await p.locator(".dispatch-dialog").waitFor({ timeout: 5000 }); });
await p.locator(".dispatch-dialog button", { hasText: "Cancel" }).first().click().catch(() => {});
await step("d-notifications", async () => { await p.locator(".notification-trigger").click(); await wait(500); });
await p.locator(".notification-trigger").click().catch(() => {});

await step("d-cms", async () => { await nav("CMS"); await wait(1500); });
await step("d-cms-deepscan", async () => {
  const start = p.locator("button", { hasText: "Start review" }).first();
  if (await start.count()) await start.click();
  await wait(800);
  const chk = p.locator("button", { hasText: "Run MediaGPT check" }).first();
  if (await chk.count()) { await chk.click(); await wait(1500); }
  const det = p.locator("button", { hasText: "Show AI details" }).first();
  if (await det.count()) { await det.click(); await wait(800); await det.scrollIntoViewIfNeeded(); }
});
await step("d-cms-mfa", async () => {
  const sel = p.locator(".approvals-panel select").first();
  await sel.scrollIntoViewIfNeeded();
  await sel.selectOption({ index: 1 });
  await p.locator(".approvals-panel button", { hasText: "MFA" }).first().click();
  await p.locator(".revision-dialog").last().waitFor({ timeout: 5000 });
});
await p.locator(".revision-dialog button", { hasText: "Cancel" }).last().click().catch(() => {});
await step("d-studio", async () => { await p.locator("button", { hasText: "Create with AI" }).first().click(); await wait(800); });

await step("d-alerts", async () => { await nav("Alerts and Emergencies"); await wait(1200); const row = p.locator("tbody tr").first(); if (await row.count()) await row.click(); await wait(800); });
await step("d-network-kanban", async () => { await nav("Network and Devices"); await wait(1500); await p.locator(".network-tabs button", { hasText: "Maintenance workbench" }).click(); await wait(800); });
await step("d-twin-full", async () => { await p.locator(".network-tabs button", { hasText: "Asset operations" }).click(); await wait(1200); await p.locator(".asset-twin-pane button", { hasText: "Full screen" }).click(); await p.locator(".twin-fullscreen").waitFor({ timeout: 8000 }); await wait(1500); });
await p.keyboard.press("Escape").catch(() => {});
await step("d-financials", async () => { await nav("Financials"); await wait(1500); });
await step("d-reports", async () => { await nav("Reports & BI"); await wait(1500); });
await step("d-radius", async () => { await nav("Radius Broadcast"); await wait(2000); const preset = p.locator(".radius-presets button").first(); if (await preset.count()) await preset.click(); await wait(1200); });
await step("d-yield", async () => { await nav("Yield Advisor"); await wait(1000); const ask = p.locator(".yield-form button").first(); if (await ask.count()) await ask.click(); await wait(1500); });
await step("d-commercial-map", async () => { await nav("Commercial Map"); await wait(2000); });

await step("d-wizard", async () => {
  await p.locator(".sidebar-profile").click(); await wait(700);
  await p.locator("button", { hasText: "Advertiser" }).first().click(); await wait(1200);
  await nav("Marketplace"); await wait(1000);
  await p.locator("button", { hasText: "New campaign brief" }).first().click();
  await wait(900);
});
await p.keyboard.press("Escape").catch(() => {});

await p.evaluate(() => { const svg = document.querySelector(".topbar-actions .icon-button svg.lucide-sun, .topbar-actions .icon-button svg.lucide-moon"); if (svg) svg.closest("button").click(); });
await wait(600);
await step("l-marketplace", async () => { await wait(400); });
await step("l-cms-deepscan", async () => {
  await p.locator(".sidebar-profile").click(); await wait(700);
  await p.locator("button", { hasText: "Platform Admin" }).first().click(); await wait(1500);
  await nav("CMS"); await wait(1200);
  const det = p.locator("button", { hasText: "Show AI details" }).first();
  if (await det.count()) { await det.click().catch(() => {}); await wait(600); }
});
await step("l-network", async () => { await nav("Network and Devices"); await wait(1800); });
await step("l-financials", async () => { await nav("Financials"); await wait(1200); });
await step("l-reports", async () => { await nav("Reports & BI"); await wait(1200); });
await step("l-kill", async () => { await nav("Control Centre"); await wait(1800); await p.locator(".cc-more-btn").click(); await p.locator(".cc-more-menu button", { hasText: "Kill switch" }).click(); await p.locator(".kill-modal").waitFor({ timeout: 5000 }); });
await p.locator(".kill-modal .icon-btn").first().click().catch(() => {});

await p.evaluate(() => { const svg = document.querySelector(".topbar-actions .icon-button svg.lucide-sun, .topbar-actions .icon-button svg.lucide-moon"); if (svg) svg.closest("button").click(); });
await wait(400);
await p.locator(".topbar-actions .icon-button", { hasText: "AR" }).click();
await wait(1500);
await step("r-control", async () => { await wait(800); });
await step("r-cms", async () => { await p.locator(".nav-group button").nth(1).click(); await wait(1500); });
await step("r-alerts", async () => { await p.locator(".nav-group button").nth(2).click(); await wait(1500); });

console.log(JSON.stringify(log, null, 1));
await b.close();
