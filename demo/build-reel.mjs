// MediaGPT capability reel: a standalone AI-capability video.
//
//   node demo/build-reel.mjs            -> preflight, then record if clean
//   node demo/build-reel.mjs --check    -> preflight only
//
// Same beat-synced infrastructure as build-demo.mjs (per-beat TTS muxed at
// each beat's offset, cursor, captions, preflight gate). Different story:
// four things MediaGPT does best - ask in plain language, create, target a
// radius, and advise on spend. Output: demo/output/mediagpt-capability-reel.mp4

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "demo", "output");
const AUDIO_DIR = join(ROOT, "demo", "audio");
const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:8080";
const CHECK_ONLY = process.argv.includes("--check");
const OUT_NAME = "mediagpt-capability-reel.mp4";
const FFMPEG = (await import("ffmpeg-static")).default;
const BEAT_PAD_MS = 700;
const ADVERTISER_CREATIVE = join(ROOT, "demo", "assets", "advertiser-creative.png");

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });

function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error("OPENAI_API_KEY not found in .env");
  return line.slice("OPENAI_API_KEY=".length).trim();
}
const API_KEY = loadApiKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *\
   Scenes (beats). Runs entirely as ADMO Control Room. No dashes.
\* ------------------------------------------------------------------ */

const SCENES = [
  {
    id: "r0",
    title: "MediaGPT: the copilot inside the platform",
    beats: [
      {
        say: "One platform. One copilot. Every operator has it.",
        async do(h) { await h.card("MediaGPT", "The copilot inside the platform"); },
      },
      {
        say: "It reads the live estate, it creates, it targets, and it advises. And it never acts without a human. Here are four things it does best.",
        async do(h) {
          await h.card(null);
          await h.click(h.page.locator("button", { hasText: "ADMO Control Room" }).first(), { settle: 1200 });
          await h.page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20000 }).catch(() => {});
        },
      },
    ],
  },
  {
    id: "r1",
    title: "Ask in plain language",
    beats: [
      {
        say: "Ask it anything, in your own words. Which live highway screens are on air in Abu Dhabi City right now?",
        async do(h) {
          await h.click(h.page.locator(".chat-fab").first(), { settle: 800 });
          await h.askChat("Which live highway screens are on air in Abu Dhabi City right now?");
        },
      },
      {
        say: "MediaGPT resolves the exact screens and shows the tools it called to find them. No filters, no menus.",
        async do(h) { await h.pace(1500); },
      },
    ],
  },
  {
    id: "r1b",
    title: "It turns questions into charts",
    beats: [
      {
        say: "Ask it for the numbers, and it answers with a chart.",
        async do(h) {
          await h.askChat("Chart revenue by zone, month over month, as a bar chart.");
          await h.page.locator(".chat-chart").first().waitFor({ timeout: 20000 }).catch(() => h.issues.push("reel: chat chart did not render"));
        },
      },
      {
        say: "The same question a strategist would ask, answered straight from the live ledger, with the trend and the figures behind it.",
        async do(h) {
          await h.page.locator(".chat-chart").first().scrollIntoViewIfNeeded().catch(() => {});
          await h.pace(2600);
        },
      },
    ],
  },
  {
    id: "r2",
    title: "It creates the message",
    beats: [
      {
        say: "It creates, too. Give the studio a brief, and it writes the campaign in Arabic and English.",
        async do(h) {
          await h.click(h.page.locator(".chat-panel header button", { hasText: "Close" }).first(), { settle: 500 });
          await h.nav("MediaGPT");
          const studio = h.page.locator("button", { hasText: "MediaGPT Studio" }).filter({ hasText: "civic" }).first();
          if (await h.has(studio, "reel: Studio skill")) await h.click(studio, { settle: 800 });
          const run = h.page.locator("button").filter({ hasText: /^Run/ }).first();
          if (await h.has(run, "reel: Studio run")) await h.click(run, { settle: 900 });
        },
      },
      {
        say: "Four layouts, both languages, on brand, in seconds.",
        async do(h) {
          await h.page.locator(".agent-result table, [class*=result] table").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("reel: studio table did not render"));
          await h.pace(2500);
        },
      },
    ],
  },
  {
    id: "r2b",
    title: "It reviews what people make",
    beats: [
      {
        say: "It does not only create. Hand it a finished visual, and it reviews it like a senior creative officer.",
        async do(h) {
          await h.switchProfile("ADMO Content Reviewer");
          await h.nav("CMS");
          await h.click(h.page.locator("button").filter({ hasText: "Create with AI" }).first(), { settle: 900 });
          await h.click(h.page.locator("button").filter({ hasText: "Review my visual" }).first(), { settle: 700 });
          // Match the studio brief to the uploaded advertiser artwork so the
          // critique reads coherently (not against the National Day default).
          const name = h.page.locator(".studio-controls label", { hasText: "Campaign name" }).locator("input").first();
          if (await h.has(name, "reel: review campaign name")) await h.typeInto(name, "Corniche Summer Nights");
          const brief = h.page.locator(".studio-controls label", { hasText: "Creative brief" }).locator("textarea").first();
          if (await h.has(brief, "reel: review brief")) await h.typeInto(brief, "Azure Hotels summer hospitality campaign for roadside screens, bilingual.");
          const file = h.page.locator(".studio-controls input[type=file]").first();
          if (await h.has(file, "reel: review upload input")) await file.setInputFiles(ADVERTISER_CREATIVE);
          await h.page.locator(".studio-visual .creative-frame.large").first().waitFor({ timeout: 8000 }).catch(() => h.issues.push("reel: uploaded visual did not render"));
          await h.pace(1000);
        },
      },
      {
        say: "Brand safety, cultural fit, Arabic legibility and composition, each scored, with concrete fixes an officer can act on.",
        async do(h) {
          const review = h.page.locator(".studio-controls button", { hasText: "Review with MediaGPT" }).first();
          if (await h.has(review, "reel: review button")) await h.click(review, { settle: 900 });
          await h.page.locator(".studio-recos").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("reel: review result did not render"));
          await h.page.locator(".studio-recos").first().scrollIntoViewIfNeeded().catch(() => {});
          await h.pace(2600);
        },
      },
    ],
  },
  {
    id: "r3",
    title: "One message, a whole area",
    beats: [
      {
        say: "Now the headline. A safety message needs every screen within reach of Downtown. The operator draws the area.",
        async do(h) {
          await h.switchProfile("ADMO Control Room");
          await h.nav("Radius Broadcast");
          await h.page.locator(".radius-map").first().waitFor({ timeout: 15000 }).catch(() => {});
          await h.pace(1400);
          const preset = h.page.locator(".radius-presets button", { hasText: "Downtown Abu Dhabi" }).first();
          if (await h.has(preset, "reel: Downtown preset")) await h.click(preset, { settle: 1000 });
        },
      },
      {
        say: "MediaGPT finds the screens inside, writes one bilingual message, and checks each screen against policy.",
        async do(h) {
          const gen = h.page.locator(".radius-compose button", { hasText: "Generate with MediaGPT" }).first();
          if (await h.has(gen, "reel: radius generate")) {
            await h.click(gen, { settle: 800 });
            await h.page.locator(".radius-message strong").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("reel: radius copy did not render"));
          }
          await h.page.locator(".radius-screens").first().scrollIntoViewIfNeeded().catch(() => {});
          await h.pace(1600);
        },
      },
      {
        say: "It flags the one beside a mosque and holds it out, then queues the rest.",
        async do(h) {
          const queue = h.page.locator("button").filter({ hasText: /Queue .*clear screens/ }).first();
          if (await h.has(queue, "reel: radius queue")) await h.click(queue, { settle: 1000 });
        },
      },
      {
        say: "One approval from a second officer, and the whole area lights up together.",
        async do(h) {
          const select = h.page.locator(".radius-approve select").first();
          if (await h.has(select, "reel: approver select")) {
            await h.click(select, { settle: 250 });
            await select.selectOption({ index: 1 });
            await h.pace(500);
            await h.click(h.page.locator(".approvals-action button", { hasText: "Approve and queue" }).first(), { settle: 1200 });
          }
        },
      },
    ],
  },
  {
    id: "r4",
    title: "It advises where to spend",
    beats: [
      {
        say: "And it advises where the budget works hardest.",
        async do(h) {
          await h.nav("Yield Advisor");
          await h.pace(1000);
        },
      },
      {
        say: "Give it a budget and a goal, and MediaGPT ranks the screens by projected reach, with the reasoning and the cost per thousand.",
        async do(h) {
          const ask = h.page.locator(".yield-form button").first();
          if (await h.has(ask, "reel: yield ask")) await h.click(ask, { settle: 900 });
          await h.page.locator(".yield-row").first().waitFor({ timeout: 15000 }).catch(() => h.issues.push("reel: yield rows did not render"));
          await h.pace(2200);
        },
      },
    ],
  },
  {
    id: "r4b",
    title: "It watches the hardware",
    beats: [
      {
        say: "It watches the hardware, too. When a screen runs hot, MediaGPT drafts the service order.",
        async do(h) {
          await h.nav("Network and Devices");
          const asset = h.page.locator(".asset-registry button", { hasText: "WTC Souk Panel" }).first();
          if (await h.has(asset, "reel: warning asset")) await h.click(asset, { settle: 900 });
          const draft = h.page.locator(".asset-twin-pane button", { hasText: "Draft ticket" }).first();
          if (await h.has(draft, "reel: draft ticket")) await h.click(draft, { settle: 900 });
          await h.page.locator(".ai-mini-panel").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("reel: ticket draft did not render"));
        },
      },
      {
        say: "Likely cause, the parts to bring, and the response time. The team reviews the draft and commits the work order. The copilot prepares, the operator decides.",
        async do(h) {
          await h.page.locator(".ai-mini-panel").first().scrollIntoViewIfNeeded().catch(() => {});
          await h.pace(2200);
          const create = h.page.locator(".ai-mini-panel button", { hasText: "Create service order" }).first();
          if (await h.has(create, "reel: create service order")) await h.click(create, { settle: 1200 });
        },
      },
    ],
  },
  {
    id: "r5",
    title: "One copilot, always governed",
    beats: [
      {
        say: "It reads the estate and charts it. It creates, and it reviews. It targets a whole area, advises where to spend, and even drafts the repair. And every action still waits for a human. MediaGPT.",
        async do(h) { await h.lowerThird(null); await h.card("MediaGPT", "reads · creates · reviews · targets · advises"); },
      },
    ],
  },
];

/* ------------------------------------------------------------------ *\
   TTS
\* ------------------------------------------------------------------ */

function wavDurationSeconds(buf) {
  const byteRate = buf.readUInt32LE(28);
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString("ascii", o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    if (id === "data") {
      const actual = size === 0xffffffff || o + 8 + size > buf.length ? buf.length - o - 8 : size;
      return actual / byteRate;
    }
    o += 8 + size + (size % 2);
  }
  throw new Error("wav data chunk not found");
}

async function tts(text, file) {
  const hash = createHash("sha256").update(`nova|${text}`).digest("hex").slice(0, 16);
  const metaFile = `${file}.json`;
  if (existsSync(file) && existsSync(metaFile)) {
    const meta = JSON.parse(readFileSync(metaFile, "utf8"));
    if (meta.hash === hash) return wavDurationSeconds(readFileSync(file));
  }
  console.log(`  tts -> ${file}`);
  async function request(model, withInstructions) {
    const body = { model, voice: "nova", input: text, response_format: "wav" };
    if (withInstructions) body.instructions = "Professional corporate product-demo narrator. Female, warm, confident. Slow, deliberate, unhurried pace with clear pauses. No rush.";
    return fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  let res = await request("gpt-4o-mini-tts", true);
  if (!res.ok) res = await request("tts-1", false);
  if (!res.ok) throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  const duration = wavDurationSeconds(buf);
  writeFileSync(metaFile, JSON.stringify({ hash, duration }));
  return duration;
}

/* ------------------------------------------------------------------ *\
   Overlays + helpers (same as build-demo.mjs)
\* ------------------------------------------------------------------ */

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById("__cur")) return;
    const layer = document.documentElement;
    const c = document.createElement("div");
    c.id = "__cur";
    Object.assign(c.style, {
      position: "fixed", left: "960px", top: "700px", width: "22px", height: "22px",
      borderRadius: "50%", background: "rgba(31,74,61,0.85)", border: "2.5px solid #fff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.45)", zIndex: "2147483647", pointerEvents: "none",
      transform: "translate(-50%,-50%)",
      transition: "left 0.6s cubic-bezier(.22,.61,.36,1), top 0.6s cubic-bezier(.22,.61,.36,1), opacity 0.4s ease",
    });
    layer.appendChild(c);
    window.__cursorTo = (x, y) => { c.style.left = `${x}px`; c.style.top = `${y}px`; };
    window.__ripple = (x, y) => {
      const r = document.createElement("div");
      Object.assign(r.style, {
        position: "fixed", left: `${x}px`, top: `${y}px`, width: "12px", height: "12px",
        borderRadius: "50%", border: "3px solid rgba(31,74,61,0.9)", zIndex: "2147483646",
        pointerEvents: "none", transform: "translate(-50%,-50%)", opacity: "1",
        transition: "width .45s ease-out, height .45s ease-out, opacity .45s ease-out",
      });
      layer.appendChild(r);
      requestAnimationFrame(() => { r.style.width = "70px"; r.style.height = "70px"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 600);
    };
    const lt = document.createElement("div");
    lt.id = "__lt";
    Object.assign(lt.style, {
      position: "fixed", left: "30px", top: "26px", padding: "9px 18px", borderRadius: "12px",
      background: "rgba(13,31,25,0.85)", color: "#fff", fontFamily: "Segoe UI, sans-serif",
      fontSize: "15px", fontWeight: "600", letterSpacing: "0.02em", zIndex: "2147483647",
      pointerEvents: "none", opacity: "0", transition: "opacity .4s ease", backdropFilter: "blur(4px)",
    });
    layer.appendChild(lt);
    window.__lowerThird = (text) => { if (!text) { lt.style.opacity = "0"; return; } lt.textContent = text; lt.style.opacity = "1"; };
    const sub = document.createElement("div");
    sub.id = "__sub";
    Object.assign(sub.style, {
      position: "fixed", left: "50%", bottom: "42px", transform: "translateX(-50%)",
      maxWidth: "1180px", width: "max-content", padding: "10px 22px", borderRadius: "10px",
      background: "rgba(8,20,16,0.82)", color: "#fff", fontFamily: "Segoe UI, sans-serif",
      fontSize: "22px", fontWeight: "500", lineHeight: "1.35", textAlign: "center",
      zIndex: "2147483647", pointerEvents: "none", opacity: "0", transition: "opacity .2s ease",
      textShadow: "0 1px 3px rgba(0,0,0,0.5)", boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
    });
    layer.appendChild(sub);
    window.__subtitle = (text) => { if (!text) { sub.style.opacity = "0"; return; } sub.textContent = text; sub.style.opacity = "1"; };
    window.__card = (title, subtitle) => {
      let el = document.getElementById("__card");
      c.style.opacity = title ? "0" : "1";
      if (!title) { if (el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 800); } return; }
      el = document.createElement("div");
      el.id = "__card";
      Object.assign(el.style, {
        position: "fixed", inset: "0", zIndex: "2147483645", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px",
        background: "linear-gradient(135deg,#0d1f19 0%,#1f4a3d 100%)", color: "#fff",
        opacity: "1", transition: "opacity .8s ease", fontFamily: "Georgia, serif", textAlign: "center",
      });
      el.innerHTML = `<div style="font-size:58px;font-weight:700;letter-spacing:-0.01em;max-width:1200px">${title}</div>` +
        `<div style="font-family:Segoe UI,sans-serif;font-size:19px;opacity:.72;letter-spacing:.16em;text-transform:uppercase">${subtitle || ""}</div>`;
      layer.appendChild(el);
    };
  });
}

function beatCaptionLines(say) {
  if (say.length <= 104) return [say];
  const out = [];
  let buf = "";
  for (const clause of say.split(/,\s*/)) {
    const piece = buf ? `${buf}, ${clause}` : clause;
    if (piece.length > 104 && buf) { out.push(buf); buf = clause; } else { buf = piece; }
  }
  if (buf) out.push(buf);
  return out;
}

function makeHelpers(page, { fast = false, issues = [] } = {}) {
  const pace = (ms) => sleep(fast ? Math.min(ms * 0.15, 220) : ms);
  async function healIfCrashed() {
    const retry = page.locator("button", { hasText: "Try again" }).first();
    if (await retry.count().catch(() => 0)) {
      issues.push("error boundary appeared");
      await retry.click().catch(() => {});
      await sleep(2000);
    }
  }
  async function has(locator, label) {
    const n = await locator.count().catch(() => 0);
    if (!n) issues.push(`missing: ${label}`);
    return n > 0;
  }
  async function boxOf(locator) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await healIfCrashed();
      try { await locator.waitFor({ state: "visible", timeout: 12000 }); const b = await locator.boundingBox(); if (b) return b; } catch { /* retry */ }
      await healIfCrashed();
      await sleep(1200);
    }
    throw new Error("element never became visible");
  }
  async function cursorTo(x, y) { await page.evaluate(([cx, cy]) => window.__cursorTo(cx, cy), [x, y]); await pace(650); }
  async function click(locator, { settle = 600, noScroll = false } = {}) {
    await healIfCrashed();
    if (!noScroll) await locator.scrollIntoViewIfNeeded().catch(() => {});
    await pace(300);
    const box = await boxOf(locator);
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 40);
    await cursorTo(x, y);
    await page.evaluate(([cx, cy]) => window.__ripple(cx, cy), [x, y]);
    await pace(140);
    await locator.click({ timeout: 6000 }).catch(() => page.mouse.click(x, y));
    await pace(settle);
  }
  async function typeInto(locator, text) {
    await click(locator, { settle: 200 });
    await locator.fill("");
    if (fast) await locator.fill(text); else await locator.pressSequentially(text, { delay: 55 });
    await pace(300);
  }
  async function nav(label) {
    await click(page.locator("nav button, aside button").filter({ hasText: label }).first(), { settle: 1000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await pace(500);
  }
  async function lowerThird(text) { await page.evaluate((t) => window.__lowerThird(t), text); }
  async function card(title, subtitle) { await page.evaluate(([a, b]) => window.__card(a, b), [title, subtitle]); }
  async function switchProfile(name) {
    const sw = page.locator("button", { hasText: "Switch profile" }).first();
    if (await sw.count()) await click(sw, { settle: 700 });
    await click(page.locator("button", { hasText: name }).first(), { settle: 1200 });
  }
  async function askChat(question, timeout = 50000) {
    const before = await page.locator(".chat-panel .chat-log article.assistant").count();
    await typeInto(page.locator(".chat-panel footer input"), question);
    await click(page.locator(".chat-panel footer button").first(), { settle: 400 });
    const answered = await page.waitForFunction(
      (n) => { const a = document.querySelectorAll(".chat-panel .chat-log article.assistant"); return a.length > n && ![...a].some((x) => x.textContent.includes("MediaGPT is thinking")); },
      before, { timeout },
    ).then(() => true).catch(() => false);
    if (!answered) issues.push(`chat did not answer: "${question.slice(0, 36)}..."`);
    await pace(700);
  }
  return { pace, has, click, typeInto, nav, lowerThird, card, switchProfile, askChat, healIfCrashed, page, issues };
}

/* ------------------------------------------------------------------ *\
   Run stages
\* ------------------------------------------------------------------ */

async function resetPlatform() {
  const reset = await fetch(`${BASE_URL}/api/dooh/reset`, { method: "POST" });
  if (!reset.ok) throw new Error("state reset failed; is the dev server running on :8080?");
  writeFileSync(join(ROOT, ".dooh-data", "agent-actions.json"), "[]\n");
}

async function preflight(browser) {
  console.log("2/4 Preflight: dry-running every beat...");
  await resetPlatform();
  const issues = [];
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  const h = makeHelpers(page, { fast: true, issues });
  for (const scene of SCENES) {
    await h.lowerThird(scene.title);
    for (const beat of scene.beats) {
      const started = Date.now();
      try { if (beat.do) await beat.do(h); console.log(`  ok ${scene.id}: ${beat.say.slice(0, 44)}... (${((Date.now() - started) / 1000).toFixed(1)}s)`); }
      catch (err) {
        const msg = String(err.message || err).split("\n")[0];
        issues.push(`${scene.id} beat failed (${beat.say.slice(0, 30)}...): ${msg}`);
        console.log(`  FAIL ${scene.id}: ${msg}`);
        await page.screenshot({ path: join(OUT_DIR, `reel-preflight-${scene.id}.png`) }).catch(() => {});
        await page.goto(BASE_URL, { waitUntil: "networkidle" }).catch(() => {});
        await injectOverlays(page).catch(() => {});
      }
    }
  }
  await context.close();
  return issues;
}

async function record(browser) {
  console.log("3/4 Recording...");
  await resetPlatform();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  const issues = [];
  const h = makeHelpers(page, { fast: false, issues });
  const timeline = [];
  try {
    for (const scene of SCENES) {
      await h.lowerThird(scene.title);
      for (const beat of scene.beats) {
        const offsetMs = Date.now() - t0;
        timeline.push({ audioFile: beat.audioFile, offsetMs });
        await page.evaluate(([lines, totalMs]) => {
          (window.__capT || []).forEach(clearTimeout);
          window.__capT = [];
          const chars = lines.reduce((s, l) => s + l.length, 0) || 1;
          let acc = 0;
          for (const line of lines) {
            const d = Math.max(1200, Math.round(totalMs * (line.length / chars)));
            const at = acc;
            window.__capT.push(setTimeout(() => window.__subtitle(line), at));
            acc += d;
          }
          window.__capT.push(setTimeout(() => window.__subtitle(""), acc));
        }, [beatCaptionLines(beat.say), Math.round(beat.duration * 1000)]).catch(() => {});
        const startedAt = Date.now();
        if (beat.do) await beat.do(h);
        const elapsed = Date.now() - startedAt;
        const target = beat.duration * 1000 + BEAT_PAD_MS;
        if (elapsed < target) await sleep(target - elapsed);
        console.log(`  ${scene.id} beat @ ${(offsetMs / 1000).toFixed(1)}s (say ${beat.duration.toFixed(1)}s, ran ${(elapsed / 1000).toFixed(1)}s)`);
      }
    }
    await sleep(4500);
  } catch (err) {
    await page.screenshot({ path: join(OUT_DIR, "reel-error.png") }).catch(() => {});
    await context.close();
    throw err;
  }
  const video = page.video();
  await context.close();
  const rawVideo = await video.path();
  console.log(`  raw video: ${rawVideo}`);
  return { rawVideo, timeline, issues };
}

function mux(rawVideo, timeline) {
  console.log("4/4 Muxing audio...");
  const args = ["-y", "-i", rawVideo];
  for (const t of timeline) args.push("-i", t.audioFile);
  const delays = timeline.map((t, i) => `[${i + 1}:a]adelay=${Math.max(0, Math.round(t.offsetMs))}|${Math.max(0, Math.round(t.offsetMs))}[a${i}]`);
  const mixInputs = timeline.map((_, i) => `[a${i}]`).join("");
  const filter = `${delays.join(";")};${mixInputs}amix=inputs=${timeline.length}:normalize=0[aout]`;
  const outFile = join(OUT_DIR, OUT_NAME);
  args.push("-filter_complex", filter, "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", outFile);
  const res = spawnSync(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  if (res.status !== 0) { console.error(res.stderr.toString().slice(-3000)); throw new Error("ffmpeg failed"); }
  rmSync(rawVideo, { force: true });
  return outFile;
}

async function main() {
  console.log("1/4 Generating narration (per beat)...");
  for (const scene of SCENES) {
    for (let i = 0; i < scene.beats.length; i += 1) {
      const beat = scene.beats[i];
      beat.audioFile = join(AUDIO_DIR, `${scene.id}-${i}.wav`);
      beat.duration = await tts(beat.say, beat.audioFile);
    }
  }
  const browser = await chromium.launch({ headless: false });
  try {
    const issues = await preflight(browser);
    if (issues.length) {
      console.log(`\nPREFLIGHT FAILED with ${issues.length} issue(s):`);
      for (const i of issues) console.log(`  - ${i}`);
      console.log("\nNot recording. Fix and run again.");
      process.exitCode = 1;
      return;
    }
    console.log("  preflight clean.");
    if (CHECK_ONLY) { console.log("\n--check: skipping recording."); return; }
    const { rawVideo, timeline, issues: recIssues } = await record(browser);
    if (recIssues.length) {
      console.log(`\nRECORDING TAINTED with ${recIssues.length} issue(s):`);
      for (const i of recIssues) console.log(`  - ${i}`);
      rmSync(rawVideo, { force: true });
      process.exitCode = 1;
      return;
    }
    console.log(`\nDone: ${mux(rawVideo, timeline)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
