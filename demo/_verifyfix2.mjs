import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const audit = () => p.evaluate(() => {
  const theme = document.documentElement.dataset.theme || "dark";
  const lum = (r, g, bl) => 0.2126*r/255 + 0.7152*g/255 + 0.0722*bl/255;
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
    if (theme === "dark" ? L > 0.72 : L < 0.22) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height < 4000 || !r.width) continue;
      bad.push((typeof el.className === "string" && el.className ? el.className.split(" ")[0] : el.tagName));
    }
  }
  return [...new Set(bad)].slice(0, 8);
});
await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.setItem("dooh-theme", "dark"));
await p.reload({ waitUntil: "networkidle" });
await p.locator("button", { hasText: "Platform Admin" }).first().click();
await p.waitForTimeout(1800);
await p.locator(".nav-group button", { hasText: "CMS" }).first().click();
await p.waitForTimeout(1500);
// pick a submission already In review, else start one
const inRev = p.locator(".submission-list button", { hasText: "National Day tribute" }).first();
if (await inRev.count()) { await inRev.click(); } else {
  const start = p.locator("button", { hasText: "Start review" }).first();
  if (await start.count()) await start.click();
}
await p.waitForTimeout(900);
const panel = p.locator(".approvals-panel").first();
await panel.scrollIntoViewIfNeeded();
await panel.locator("select").selectOption({ index: 1 });
await p.waitForTimeout(300);
const btn = panel.locator("button", { hasText: "MFA" }).first();
await btn.click({ timeout: 8000 });
await p.locator(".revision-dialog").last().waitFor({ timeout: 6000 });
await p.waitForTimeout(400);
await p.screenshot({ path: OUT + "/fx-mfa2.png" });
console.log(JSON.stringify({ mfaDark: await audit() }));
// wizard re-audit
await p.goto("http://localhost:8080", { waitUntil: "networkidle" });
await p.locator("button", { hasText: "Advertiser" }).first().click();
await p.waitForTimeout(1500);
await p.locator(".nav-group button", { hasText: "Marketplace" }).first().click();
await p.waitForTimeout(1200);
await p.locator("button", { hasText: "New campaign brief" }).first().click();
await p.waitForTimeout(900);
console.log(JSON.stringify({ wizardDark: await audit() }));
await b.close();
