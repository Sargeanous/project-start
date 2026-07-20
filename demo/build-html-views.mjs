// Static HTML snapshots of every view shown in the platform demo video.
//
//   node demo/build-html-views.mjs
//
// Drives the live app (localhost:8081) through each view from the demo,
// then serializes the DOM to a self-contained .html file per view:
//   - <canvas> elements are frozen into <img> data URIs (maps, charts, twin)
//   - same-origin images are inlined as data URIs
//   - all scripts are stripped so the snapshot never re-boots the app
// The city 3D map segment comes from an external build (screen recordings),
// so those views are HTML pages embedding full-res stills from the clips.
// Output: demo/html-views/*.html + index.html

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FFMPEG = (await import("ffmpeg-static")).default;
const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:8081";
const OUT = join(ROOT, "demo", "html-views");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const written = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();

async function login(profile) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.locator("button.profile-card", { hasText: profile }).first().click();
  await sleep(1600);
}
async function nav(label) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(250);
  await page.locator("nav button, aside button").filter({ hasText: label }).first().click({ timeout: 12000 });
  await sleep(1800);
}

// Serialize the current DOM into one standalone HTML string.
async function serialize(title) {
  return page.evaluate(async (pageTitle) => {
    // 1) freeze every canvas into a data-URI image (WebGL may come back
    //    blank without preserveDrawingBuffer; best effort, never fatal)
    for (const cv of document.querySelectorAll("canvas")) {
      try {
        const url = cv.toDataURL("image/png");
        if (url && url.length > 200) {
          const img = document.createElement("img");
          img.src = url;
          img.width = cv.clientWidth || cv.width;
          img.height = cv.clientHeight || cv.height;
          img.style.cssText = cv.style.cssText;
          img.className = cv.className;
          cv.replaceWith(img);
        }
      } catch {}
    }
    // 2) inline same-origin images (skip data: and cross-origin tiles,
    //    which stay as absolute URLs and load when viewed online)
    const imgs = [...document.images].filter(
      (im) => im.src && !im.src.startsWith("data:") && im.src.startsWith(location.origin),
    ).slice(0, 80);
    await Promise.all(imgs.map(async (im) => {
      try {
        const blob = await (await fetch(im.src)).blob();
        const uri = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(blob);
        });
        im.src = uri;
      } catch {}
    }));
    // 3) clone, strip scripts and dev preloads, stamp the title
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("script, link[rel=modulepreload], link[rel=preload]").forEach((n) => n.remove());
    const t = clone.querySelector("title");
    if (t) t.textContent = pageTitle;
    return "<!DOCTYPE html>\n<!-- Static snapshot from the Unified DOOH Platform demo video. Interactive logic removed; map tiles and fonts load from the internet. -->\n" + clone.outerHTML;
  }, title);
}
async function snap(file, title, desc) {
  const html = await serialize(title);
  writeFileSync(join(OUT, file), html);
  written.push({ file, title, desc });
  console.log(`  snap -> ${file} (${Math.round(html.length / 1024)}kb)`);
}
async function safe(label, fn) {
  try { await fn(); } catch (err) { console.log(`  SKIP ${label}: ${String(err.message || err).split("\n")[0]}`); }
}

console.log("HTML views of the demo video...");

// --- 01 login ---
await safe("login view", async () => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await sleep(1500);
  await snap("01-login-role-picker.html", "Login: role picker", "Landing screen where each role enters its own permissioned workspace");
});

// --- Platform Admin views ---
await safe("admin login", () => login("Platform Admin"));

await safe("control centre", async () => {
  await nav("Control Centre");
  await page.locator(".hex-pin").first().waitFor({ timeout: 20000 });
  await sleep(2200);
  await snap("02-control-centre-live-city-map.html", "Control Centre: live city map", "The live estate on the Abu Dhabi map with KPIs, alerts and the asset board");
});
await safe("asset popover", async () => {
  await page.evaluate(() => {
    const m = document.querySelectorAll(".leaflet-marker-icon.hex-pin-icon");
    (m[6] || m[m.length - 1])?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(1400);
  await snap("03-control-centre-asset-popover.html", "Control Centre: asset popover", "A screen opened from the map showing its live creative and state");
});
await safe("commercial map", async () => {
  await nav("Commercial Map");
  await page.locator(".hex-pin").first().waitFor({ timeout: 20000 });
  await sleep(1800);
  await snap("04-commercial-map-inventory-sales.html", "Commercial Map: inventory and sales", "Sales view of the estate: who holds each screen, at what rate, until when");
});
await safe("cms queue", async () => {
  await nav("CMS");
  await sleep(1600);
  await snap("05-cms-content-review-queue.html", "CMS: content review queue", "Submissions from advertisers waiting for review and scheduling");
});
await safe("cms ai review", async () => {
  const sub = page.locator(".submission-list button").first();
  if (await sub.count()) { await sub.click(); await sleep(900); }
  const mg = page.locator(".review-section-tabs button", { hasText: "MediaGPT" }).first();
  if (await mg.count()) { await mg.click(); await sleep(1400); }
  await snap("06-cms-mediagpt-ai-review.html", "CMS: MediaGPT AI review", "The AI checks on a submitted creative: brand safety, wording, cultural fit");
});
await safe("alerts", async () => {
  await nav("Alerts and Emergencies");
  await page.locator(".alerts-list button").first().waitFor({ timeout: 12000 });
  const weather = page.locator(".alerts-list button", { hasText: "Weather alert broadcast" }).first();
  if (await weather.count()) { await weather.click(); await sleep(1200); }
  await snap("07-alerts-emergency-weather-broadcast.html", "Alerts: emergency weather broadcast", "A CAP weather alert with its bilingual creative and governed lifecycle");
});
await safe("network devices", async () => {
  await nav("Network and Devices");
  await page.locator(".nd-workspace").first().waitFor({ timeout: 15000 });
  await sleep(1600);
  await snap("08-network-devices-asset-operations.html", "Network and Devices: asset operations", "Fleet health, schedules, vitals and open issues for the physical estate");
});
await safe("asset twin", async () => {
  await page.locator(".nd-viewer-fs").first().click();
  await page.locator(".twin-fullscreen canvas").first().waitFor({ timeout: 15000 });
  await sleep(3500);
  await snap("09-network-3d-asset-twin-dossier.html", "Network: 3D asset twin dossier", "The digital twin of one billboard with component health and active issues (3D canvas frozen as an image)");
  await page.keyboard.press("Escape").catch(() => {});
});
await safe("financials", async () => {
  await nav("Financials");
  await sleep(1800);
  await snap("10-financials-budget-and-settlement.html", "Financials: budget and settlement", "Budgets, invoices with VAT, payment states and finance approvals");
});
await safe("reports", async () => {
  await nav("Reports");
  await sleep(2000);
  await snap("11-reports-bi-proof-of-play.html", "Reports and BI: proof of play", "End of day reporting: what sold, what played, what was proven");
});
await safe("mediagpt", async () => {
  await nav("MediaGPT");
  await sleep(1800);
  await snap("12-mediagpt-copilot-workspace.html", "MediaGPT: copilot workspace", "The estate-wide AI copilot every role shares");
});

// --- Advertiser views (marketplace + campaign submission) ---
await safe("advertiser login", () => login("Advertiser"));
await safe("advertiser campaigns", async () => {
  await nav("Campaigns");
  await sleep(1600);
  await snap("13-advertiser-campaigns-workspace.html", "Advertiser: campaigns workspace", "Where an advertiser creates a campaign and tracks its states");
});
await safe("advertiser marketplace", async () => {
  await nav("Marketplace");
  await sleep(1600);
  await snap("14-advertiser-marketplace-packages.html", "Advertiser: marketplace packages", "Packages and inventory an advertiser can bid on");
});

await context.close();
await browser.close();

// --- City 3D map views (external build): full-res stills wrapped in HTML ---
const CLIPS = [
  { src: "2D-3D.mp4", at: 8.5, file: "15-city-3d-map-2d-to-3d-transition", title: "City 3D map: 2D to 3D transition", desc: "The control room map lifting into the full 3D model of Abu Dhabi (external city digital twin build, still from screen recording)" },
  { src: "control.mp4", at: 8.0, file: "16-city-3d-map-control-centre-flyover", title: "City 3D map: Control Centre flyover", desc: "Every screen in its real place on the 3D city, with live asset popovers (external build, still from screen recording)" },
  { src: "plan.mp4", at: 6.0, file: "17-city-3d-map-planning-zones", title: "City 3D map: Planning demand zones", desc: "Demand zones draped over the districts on the 3D city (external build, still from screen recording)" },
  { src: "radus.mp4", at: 6.0, file: "18-city-3d-map-radius-broadcast", title: "City 3D map: radius broadcast", desc: "A radius broadcast drawn on the real city (external build, still from screen recording)" },
];
for (const c of CLIPS) {
  const png = join(OUT, `${c.file}.png`);
  const res = spawnSync(FFMPEG, ["-y", "-ss", String(c.at), "-i", join(ROOT, "demo", "input", c.src), "-frames:v", "1", png], { stdio: "ignore" });
  if (res.status !== 0) { console.log(`  SKIP still ${c.src}`); continue; }
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${c.title}</title>
<style>body{margin:0;background:#141716;color:#eef7f2;font-family:'Segoe UI',sans-serif}
figure{margin:0}img{width:100%;height:auto;display:block}
figcaption{padding:14px 22px;font-size:14px;color:#aec0b9;border-top:1px solid #2c322f}
figcaption b{color:#38d08a}</style></head>
<body><figure><img src="${c.file}.png" alt="${c.title}">
<figcaption><b>${c.title}.</b> ${c.desc}</figcaption></figure></body></html>\n`;
  writeFileSync(join(OUT, `${c.file}.html`), html);
  written.push({ file: `${c.file}.html`, title: c.title, desc: c.desc });
  console.log(`  still -> ${c.file}.html`);
}

// --- index ---
const rows = written
  .map((w) => `<li><a href="${w.file}">${w.title}</a><span>${w.desc}</span></li>`)
  .join("\n");
writeFileSync(join(OUT, "index.html"), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Unified DOOH Platform: demo video HTML views</title>
<style>body{margin:0;padding:48px;background:#1f2221;color:#f4fbf8;font-family:'Segoe UI',sans-serif;max-width:980px}
h1{font-size:26px}p{color:#aec0b9}ol{padding-left:20px}li{margin:12px 0;line-height:1.45}
a{color:#38d08a;font-weight:600;text-decoration:none;font-size:16px}a:hover{text-decoration:underline}
li span{display:block;color:#aec0b9;font-size:13px}</style></head>
<body><h1>Unified DOOH Platform: every view in the demo video</h1>
<p>Static snapshots of the app views shown in dooh-platform-demo-v2.mp4, in the order they appear in the flow. Snapshots are non interactive; map tiles and fonts load from the internet. The four city 3D map views come from the external digital twin build and are stills from the screen recordings.</p>
<ol>${rows}</ol></body></html>\n`);
console.log(`Done: ${written.length} views + index.html in demo/html-views`);
