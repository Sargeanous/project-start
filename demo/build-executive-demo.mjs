// Executive demo video for the ADMO Unified DOOH Platform.
//
//   node demo/build-executive-demo.mjs
//
// Produces:
//   demo/output/dooh-executive-demo.mp4
//
// The video intentionally starts on the real landing/profile screen. No title
// card. The story is a human-paced executive walkthrough: role based access,
// live operations, MediaGPT-assisted decisions, emergency governance, digital
// twin maintenance, supply chain, financial proof and bidder closure.

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "demo", "output");
const AUDIO_DIR = join(ROOT, "demo", "audio");
const BASE_URL = process.env.DEMO_BASE_URL || "http://127.0.0.1:5191";
const OUT_NAME = "dooh-executive-demo.mp4";
const FFMPEG = (await import("ffmpeg-static")).default;
const VIEWPORT = { width: 1920, height: 1080 };
const BEAT_PAD_MS = 500;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIO_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return "";
  const env = readFileSync(envPath, "utf8");
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith("OPENAI_API_KEY="));
  return line ? line.slice("OPENAI_API_KEY=".length).trim() : "";
}

const API_KEY = loadApiKey();

function wavDurationSeconds(buf) {
  const byteRate = buf.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      const actual = size === 0xffffffff || offset + 8 + size > buf.length ? buf.length - offset - 8 : size;
      return actual / byteRate;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV data chunk not found");
}

async function tts(text, file) {
  const hash = createHash("sha256").update(`executive|nova|${text}`).digest("hex").slice(0, 16);
  const metaFile = `${file}.json`;
  if (existsSync(file) && existsSync(metaFile)) {
    const meta = JSON.parse(readFileSync(metaFile, "utf8"));
    if (meta.hash === hash) return wavDurationSeconds(readFileSync(file));
  }
  if (!API_KEY) {
    // Fallback duration keeps caption timing usable if the key is not present.
    return Math.max(2.8, text.length / 18);
  }
  console.log(`  tts -> ${file}`);
  async function request(model, withInstructions) {
    const body = { model, voice: "nova", input: text, response_format: "wav" };
    if (withInstructions) {
      body.instructions =
        "Warm executive product-demo narrator. Confident, human, calm, with natural changes of pace. Slow enough for senior stakeholders to follow. Avoid sales hype.";
    }
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

function captionLines(text) {
  if (text.length <= 108) return [text];
  const clauses = text.split(/,\s*/);
  const lines = [];
  let buffer = "";
  for (const clause of clauses) {
    const next = buffer ? `${buffer}, ${clause}` : clause;
    if (next.length > 108 && buffer) {
      lines.push(buffer);
      buffer = clause;
    } else {
      buffer = next;
    }
  }
  if (buffer) lines.push(buffer);
  return lines;
}

const BEATS = [
  {
    id: "landing",
    scene: "Role based access",
    say: "We start on the real landing page. Each person enters the same platform, but with a permissioned workspace built around their role.",
    async do(h) {
      await h.waitFor(".login-screen", "landing profile screen");
      await h.hoverText("ADMO Control Room");
      await h.hoverText("Advertiser");
      await h.hoverText("Platform Admin");
      await h.pace(600);
    },
  },
  {
    id: "enter-admin",
    scene: "Role based access",
    say: "For the executive walkthrough, we enter as Platform Admin, with visibility across operations, content, finance and the AI governance layer.",
    async do(h) {
      await h.clickText("Platform Admin", { scope: ".profile-grid", settle: 1600 });
      await h.waitFor(".workspace", "main workspace");
    },
  },
  {
    id: "control-map",
    scene: "Control Centre",
    say: "The Control Centre is the operating picture. Assets, alarms, proof of play and queued campaigns are visible on the live Abu Dhabi estate.",
    async do(h) {
      await h.nav("Control Centre");
      await h.waitFor(".cc-page", "control centre");
      await h.pace(1500);
      await h.hoverSelector(".cc-kpis");
      await h.hoverSelector(".cc-board");
    },
  },
  {
    id: "control-live",
    scene: "Control Centre",
    say: "A screen is not an abstract row. Clicking an asset shows what is playing, what comes next, and the commercial or civic status behind it.",
    async do(h) {
      await h.clickSelector(".cc-card", { settle: 1200 });
      await h.waitFor(".cc-popover", "asset live popover");
      await h.hoverSelector(".cc-popover-media");
      await h.pace(1300);
      await h.clickSelector(".cc-popover .icon-btn", { settle: 700 });
    },
  },
  {
    id: "bulk-action",
    scene: "Multi screen action",
    say: "The wow moment is direct action. Select several screens, choose whether to display now or schedule, attach a visual, and let the platform surface rule conflicts before anyone commits.",
    async do(h) {
      await h.clickSelector(".cc-select-tool button", { settle: 500 });
      await h.dragMarquee();
      if (await h.exists(".cc-selection-bar")) {
        await h.clickText("Display message", { scope: ".cc-selection-bar", settle: 1200 });
        await h.waitFor(".selection-dialog", "bulk action dialog");
        await h.hoverSelector(".selection-visual-source");
        await h.hoverSelector(".selection-creative-preview");
        await h.pace(1900);
        await h.closeModal();
      }
    },
  },
  {
    id: "cms-queue",
    scene: "CMS review",
    say: "In CMS, the reviewer works from a focused queue. Selecting a campaign reveals the creative, the stage timeline and only the details that matter for the current decision.",
    async do(h) {
      await h.nav("CMS");
      await h.waitFor(".cms-review-workspace", "CMS review workspace");
      await h.clickText("Louvre summer exhibition", { scope: ".submission-list", settle: 1000 });
      if (await h.exists("button:text-is('Start review')")) {
        await h.clickText("Start review", { settle: 900 });
      }
      await h.hoverSelector(".submission-context-bar");
      await h.hoverSelector(".stage-tracker");
      await h.pace(900);
    },
  },
  {
    id: "cms-ai",
    scene: "MediaGPT in CMS",
    say: "MediaGPT is marked with a sparkle wherever it is working. Here it reviews risk, cites the rules and prepares the action, but the human reviewer still chooses what happens next.",
    async do(h) {
      await h.clickText("MediaGPT", { scope: ".review-section-tabs", settle: 900 });
      await h.hoverSelector(".ai-mini-panel");
      await h.clickText("Prepare bidder message", { settle: 900 });
      if (await h.exists(".revision-dialog")) {
        await h.hoverSelector(".revision-dialog textarea");
        await h.pace(1500);
        await h.clickText("Cancel", { scope: ".revision-dialog", settle: 600 });
      }
    },
  },
  {
    id: "alerts",
    scene: "Alerts and emergencies",
    say: "Emergency workflows keep the governance strict. MediaGPT checks bilingual layout and routing, while authority, visual approval and MFA stay with named people.",
    async do(h) {
      await h.nav("Alerts and Emergencies");
      await h.waitFor(".alerts-workspace", "alerts workspace");
      await h.hoverSelector(".alert-visual-review");
      await h.clickText("Run MediaGPT checks", { settle: 1400 });
      await h.hoverSelector(".alert-check-list");
      await h.pace(900);
    },
  },
  {
    id: "twin",
    scene: "Network and Devices",
    say: "For maintenance, operations does not leave the platform. An asset opens with its live digital twin, active issues and the exact service-order path.",
    async do(h) {
      await h.nav("Network and Devices");
      await h.waitFor(".asset-operations-group", "network workspace");
      await h.clickText("Mussafah Bridge Banner", { scope: ".nd-asset-list", settle: 1200 });
      await h.hoverSelector(".nd-viewer");
      await h.hoverSelector(".nd-issues");
      await h.pace(1200);
    },
  },
  {
    id: "twin-fullscreen",
    scene: "Network and Devices",
    say: "The model can expand when detail matters. This is the kind of screen a field team can inspect, discuss and act from without jumping tools.",
    async do(h) {
      await h.clickSelector(".nd-viewer-fs", { settle: 1200 });
      if (await h.exists(".twin-fullscreen")) {
        await h.pace(1700);
        await h.closeModal();
      }
    },
  },
  {
    id: "maintenance",
    scene: "Maintenance workbench",
    say: "The same issue appears in the maintenance workbench as work, not a note. Teams see assignment, execution, progress and completion in one operational board.",
    async do(h) {
      await h.clickText("Maintenance workbench", { scope: ".nd-tabs", settle: 1000 });
      await h.waitFor(".kanban-board, .kanban", "maintenance board");
      await h.hoverSelector(".kanban-board, .kanban");
      await h.pace(1400);
    },
  },
  {
    id: "supply",
    scene: "Supply chain",
    say: "Supply chain closes the loop. The asset row expands into components, service orders, purchase orders, ETAs and MediaGPT recommendations for what to do next.",
    async do(h) {
      await h.clickText("Supply chain", { scope: ".nd-tabs", settle: 1000 });
      await h.waitFor(".asset-supply-table", "supply chain table");
      await h.hoverSelector(".asset-supply-table");
      await h.pace(1700);
    },
  },
  {
    id: "mediagpt-suite",
    scene: "MediaGPT Suite",
    say: "MediaGPT is also visible as a suite of governed agents. Each capability has inputs, a boundary and a run log, so AI work is observable instead of mysterious.",
    async do(h) {
      await h.nav("MediaGPT");
      await h.waitFor(".workbench-grid", "MediaGPT suite");
      await h.clickText("MediaGPT Yield Advisor", { scope: ".agent-rail", settle: 900 });
      await h.hoverSelector(".workbench");
      await h.pace(1200);
    },
  },
  {
    id: "knowledge-rules",
    scene: "Knowledge and rules",
    say: "The AI layer is grounded by knowledge and rules. ADMO can see the source corpora and edit the policy rules that condition recommendations.",
    async do(h) {
      await h.nav("Knowledge");
      await h.waitFor(".knowledge-page, .source-detail, .knowledge-sources", "knowledge page");
      await h.pace(900);
      await h.nav("Rules");
      await h.waitFor(".rules-catalogue, .rule-detail, .rule-editor", "rules page");
      await h.hoverSelector(".rule-detail, .rule-editor, .rules-catalogue");
      await h.pace(1000);
    },
  },
  {
    id: "financials",
    scene: "Financials",
    say: "Finance sees commercial performance, scenarios and proof controls through dedicated subtabs. MediaGPT can explain yield while proof of play anchors settlement.",
    async do(h) {
      await h.nav("Financials");
      await h.waitFor(".financial-tabs", "financial tabs");
      await h.clickText("Scenarios", { scope: ".financial-tabs", settle: 900 });
      await h.hoverSelector(".scenario-form");
      await h.clickText("Settlement", { scope: ".financial-tabs", settle: 900 });
      await h.hoverSelector(".table-card");
      await h.pace(1300);
    },
  },
  {
    id: "chatbot",
    scene: "MediaGPT copilot",
    say: "And the copilot is always available. Ask a business question and it responds inside the platform, with charts or actions when the answer needs more than text.",
    async do(h) {
      await h.clickSelector(".chat-fab", { settle: 800 });
      if (await h.exists(".chat-panel")) {
        await h.askChat("Show revenue month on month this year for Reem Island as a bar chart.");
        await h.pace(1800);
        await h.closeChat();
      }
    },
  },
  {
    id: "bidder",
    scene: "Bidder closure",
    say: "Finally, switch to the advertiser. The same decision is visible from the outside as a campaign status, a message from ADMO and a clear next action.",
    async do(h) {
      await h.switchProfile("Advertiser");
      await h.nav("Campaigns");
      await h.waitFor(".table-card, .bidder-message-queue", "bidder campaigns");
      await h.hoverSelector(".table-card");
      await h.pace(1500);
    },
  },
  {
    id: "close",
    scene: "Close",
    say: "That is the platform story: one estate, one operating system, AI where it accelerates decisions, and human governance where the stakes are high.",
    async do(h) {
      await h.switchProfile("Platform Admin");
      await h.nav("Control Centre");
      await h.waitFor(".cc-page", "closing control centre");
      await h.pace(2200);
    },
  },
];

async function resetPlatform() {
  const res = await fetch(`${BASE_URL}/api/dooh/reset`, { method: "POST" }).catch(() => null);
  if (!res || !res.ok) console.warn(`  warning: reset failed at ${BASE_URL}/api/dooh/reset`);
}

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById("__demo_cursor")) return;
    const root = document.documentElement;
    const cursor = document.createElement("div");
    cursor.id = "__demo_cursor";
    Object.assign(cursor.style, {
      position: "fixed",
      left: "940px",
      top: "540px",
      width: "20px",
      height: "20px",
      borderRadius: "999px",
      background: "rgba(75, 170, 112, 0.9)",
      border: "2.5px solid white",
      boxShadow: "0 6px 18px rgba(0,0,0,0.38)",
      zIndex: "2147483647",
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      transition: "left 560ms cubic-bezier(.22,.61,.36,1), top 560ms cubic-bezier(.22,.61,.36,1), opacity 240ms ease",
    });
    root.appendChild(cursor);

    const scene = document.createElement("div");
    scene.id = "__demo_scene";
    Object.assign(scene.style, {
      position: "fixed",
      top: "22px",
      right: "28px",
      zIndex: "2147483647",
      padding: "8px 14px",
      borderRadius: "999px",
      background: "rgba(8, 24, 19, 0.74)",
      color: "#eef8f1",
      border: "1px solid rgba(255,255,255,0.18)",
      font: "600 13px/1.2 Aptos, Segoe UI, sans-serif",
      letterSpacing: "0.04em",
      pointerEvents: "none",
      opacity: "0",
      backdropFilter: "blur(8px)",
      transition: "opacity 260ms ease",
    });
    root.appendChild(scene);

    const subtitle = document.createElement("div");
    subtitle.id = "__demo_subtitle";
    Object.assign(subtitle.style, {
      position: "fixed",
      left: "50%",
      bottom: "30px",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      maxWidth: "1120px",
      width: "max-content",
      padding: "10px 18px",
      borderRadius: "10px",
      background: "rgba(8, 20, 16, 0.78)",
      color: "#fff",
      font: "500 21px/1.35 Aptos, Segoe UI, sans-serif",
      textAlign: "center",
      boxShadow: "0 10px 34px rgba(0,0,0,0.28)",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 180ms ease",
    });
    root.appendChild(subtitle);

    window.__demoCursorTo = (x, y) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };
    window.__demoRipple = (x, y) => {
      const ripple = document.createElement("div");
      Object.assign(ripple.style, {
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        width: "12px",
        height: "12px",
        borderRadius: "999px",
        border: "3px solid rgba(75,170,112,0.85)",
        transform: "translate(-50%, -50%)",
        zIndex: "2147483646",
        pointerEvents: "none",
        opacity: "1",
        transition: "width 440ms ease, height 440ms ease, opacity 440ms ease",
      });
      root.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.width = "62px";
        ripple.style.height = "62px";
        ripple.style.opacity = "0";
      });
      setTimeout(() => ripple.remove(), 560);
    };
    window.__demoScene = (text) => {
      if (!text) {
        scene.style.opacity = "0";
        return;
      }
      scene.textContent = text;
      scene.style.opacity = "1";
    };
    window.__demoSubtitle = (text) => {
      if (!text) {
        subtitle.style.opacity = "0";
        return;
      }
      subtitle.textContent = text;
      subtitle.style.opacity = "1";
    };
    window.__demoPanTo = (targetY, ms) => new Promise((resolve) => {
      const startY = window.scrollY;
      const distance = targetY - startY;
      const started = performance.now();
      function step(now) {
        const progress = Math.min(1, (now - started) / ms);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        window.scrollTo(0, startY + distance * eased);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  });
}

function makeHelpers(page, issues) {
  async function pace(ms) {
    await sleep(ms);
  }

  async function exists(selector) {
    return (await page.locator(selector).count().catch(() => 0)) > 0;
  }

  async function waitFor(selector, label, timeout = 15000) {
    const ok = await page.locator(selector).first().waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
    if (!ok) issues.push(`missing: ${label}`);
    return ok;
  }

  async function box(locator) {
    await locator.first().waitFor({ state: "visible", timeout: 12000 });
    const rect = await locator.first().boundingBox();
    if (!rect) throw new Error("visible element has no box");
    return rect;
  }

  async function moveToLocator(locator) {
    const rect = await box(locator);
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await page.mouse.move(x, y, { steps: 18 });
    await page.evaluate(([px, py]) => window.__demoCursorTo(px, py), [x, y]);
    await pace(420);
    return { x, y };
  }

  async function clickLocator(locator, { settle = 650, noScroll = false } = {}) {
    if (!noScroll) await locator.first().scrollIntoViewIfNeeded().catch(() => {});
    const point = await moveToLocator(locator.first());
    await page.evaluate(([px, py]) => window.__demoRipple(px, py), [point.x, point.y]);
    await locator.first().click({ timeout: 12000 });
    await pace(settle);
  }

  function scopedText(text, scope) {
    const root = scope ? page.locator(scope) : page;
    return root.locator("button, a, summary, [role=tab]").filter({ hasText: text }).first();
  }

  async function clickText(text, options = {}) {
    const locator = scopedText(text, options.scope);
    if (!(await locator.count().catch(() => 0))) {
      issues.push(`missing text control: ${text}`);
      return false;
    }
    await clickLocator(locator, options);
    return true;
  }

  async function hoverText(text) {
    const locator = page.locator("button, a, [role=tab]").filter({ hasText: text }).first();
    if (await locator.count().catch(() => 0)) await moveToLocator(locator);
  }

  async function clickSelector(selector, options = {}) {
    const locator = page.locator(selector).first();
    if (!(await locator.count().catch(() => 0))) {
      issues.push(`missing selector: ${selector}`);
      return false;
    }
    await clickLocator(locator, options);
    return true;
  }

  async function hoverSelector(selector) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) await moveToLocator(locator);
  }

  async function nav(label) {
    const item = page.locator("aside button").filter({ hasText: label }).first();
    if (await item.count().catch(() => 0)) {
      await clickLocator(item, { settle: 900 });
      return;
    }
    await clickText(label, { settle: 900 });
  }

  async function switchProfile(name) {
    const onLogin = await exists(".login-screen");
    if (!onLogin) {
      const profileButton = page.locator(".sidebar-profile").first();
      if (await profileButton.count().catch(() => 0)) await clickLocator(profileButton, { settle: 900 });
      else await clickText("Switch profile", { settle: 900 });
      await waitFor(".login-screen", "profile switch screen");
    }
    await clickText(name, { scope: ".profile-grid", settle: 1300 });
    await waitFor(".workspace", `${name} workspace`);
  }

  async function closeModal() {
    const close = page.locator(".revision-dialog .icon-btn, .twin-fullscreen .icon-button, .selection-dialog .icon-btn").first();
    if (await close.count().catch(() => 0)) {
      await clickLocator(close, { settle: 700 });
    } else {
      await page.keyboard.press("Escape");
      await pace(700);
    }
  }

  async function closeChat() {
    const close = page.locator(".chat-head-actions button").last();
    if (await close.count().catch(() => 0)) await clickLocator(close, { settle: 600 });
    else await page.keyboard.press("Escape");
  }

  async function dragMarquee() {
    const map = page.locator(".live-map.canvas").first();
    if (!(await map.count().catch(() => 0))) {
      issues.push("missing map for marquee select");
      return;
    }
    const rect = await box(map);
    const start = { x: rect.x + rect.width * 0.28, y: rect.y + rect.height * 0.26 };
    const end = { x: rect.x + rect.width * 0.66, y: rect.y + rect.height * 0.64 };
    await page.mouse.move(start.x, start.y, { steps: 16 });
    await page.evaluate(([x, y]) => window.__demoCursorTo(x, y), [start.x, start.y]);
    await page.mouse.down();
    for (let i = 1; i <= 24; i += 1) {
      const x = start.x + ((end.x - start.x) * i) / 24;
      const y = start.y + ((end.y - start.y) * i) / 24;
      await page.mouse.move(x, y);
      await page.evaluate(([px, py]) => window.__demoCursorTo(px, py), [x, y]);
      await sleep(28);
    }
    await page.mouse.up();
    await pace(900);
  }

  async function askChat(prompt) {
    const input = page.locator(".chat-panel footer input, .chat-panel textarea").first();
    if (!(await input.count().catch(() => 0))) {
      issues.push("chat input missing");
      return;
    }
    await clickLocator(input, { settle: 250 });
    await input.fill(prompt);
    await pace(300);
    const before = await page.locator(".chat-panel article.assistant, .chat-panel .assistant").count().catch(() => 0);
    await clickLocator(page.locator(".chat-panel footer button").first(), { settle: 500 });
    await page.waitForFunction(
      (n) => document.querySelectorAll(".chat-panel article.assistant, .chat-panel .assistant").length > n,
      before,
      { timeout: 35000 },
    ).catch(() => issues.push("chat did not answer in time"));
  }

  return {
    pace,
    exists,
    waitFor,
    clickText,
    hoverText,
    clickSelector,
    hoverSelector,
    nav,
    switchProfile,
    closeModal,
    closeChat,
    dragMarquee,
    askChat,
  };
}

async function showBeatCaption(page, beat, duration) {
  const lines = captionLines(beat.say);
  await page.evaluate(
    ([scene, beatLines, totalMs]) => {
      (window.__demoCaptionTimers || []).forEach(clearTimeout);
      window.__demoCaptionTimers = [];
      window.__demoScene(scene);
      const chars = beatLines.reduce((sum, line) => sum + line.length, 0) || 1;
      let offset = 0;
      for (const line of beatLines) {
        const slice = Math.max(1200, Math.round(totalMs * (line.length / chars)));
        window.__demoCaptionTimers.push(setTimeout(() => window.__demoSubtitle(line), offset));
        offset += slice;
      }
      window.__demoCaptionTimers.push(setTimeout(() => window.__demoSubtitle(""), offset + 400));
    },
    [beat.scene, lines, Math.round(duration * 1000)],
  );
}

async function record() {
  await resetPlatform();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  const issues = [];
  const timeline = [];
  const t0 = Date.now();

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  const h = makeHelpers(page, issues);

  for (const beat of BEATS) {
    const offsetMs = Date.now() - t0;
    timeline.push({ audioFile: beat.audioFile, offsetMs });
    await showBeatCaption(page, beat, beat.duration);
    const started = Date.now();
    try {
      await beat.do(h);
    } catch (err) {
      issues.push(`${beat.id}: ${String(err.message || err).split("\n")[0]}`);
    }
    const elapsed = Date.now() - started;
    const target = beat.duration * 1000 + BEAT_PAD_MS;
    if (elapsed < target) await sleep(target - elapsed);
    console.log(`  beat ${beat.id} @ ${(offsetMs / 1000).toFixed(1)}s`);
  }

  await page.evaluate(() => {
    window.__demoScene("");
    window.__demoSubtitle("");
  }).catch(() => {});
  await sleep(1800);
  const video = page.video();
  await context.close();
  await browser.close();
  return { rawVideo: await video.path(), timeline, issues };
}

function mux(rawVideo, timeline) {
  const outFile = join(OUT_DIR, OUT_NAME);
  if (!API_KEY) {
    const res = spawnSync(FFMPEG, [
      "-y",
      "-i", rawVideo,
      "-c:v", "libx264",
      "-crf", "20",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outFile,
    ], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
    if (res.status !== 0) throw new Error(res.stderr.toString().slice(-2000));
    rmSync(rawVideo, { force: true });
    return outFile;
  }

  const args = ["-y", "-i", rawVideo];
  for (const item of timeline) args.push("-i", item.audioFile);
  const delays = timeline.map((item, i) => `[${i + 1}:a]adelay=${Math.max(0, Math.round(item.offsetMs))}|${Math.max(0, Math.round(item.offsetMs))}[a${i}]`);
  const mixInputs = timeline.map((_, i) => `[a${i}]`).join("");
  const filter = `${delays.join(";")};${mixInputs}amix=inputs=${timeline.length}:normalize=0[aout]`;
  args.push(
    "-filter_complex", filter,
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    outFile,
  );
  const res = spawnSync(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  if (res.status !== 0) throw new Error(res.stderr.toString().slice(-3000));
  rmSync(rawVideo, { force: true });
  return outFile;
}

async function main() {
  console.log("1/3 Preparing narration...");
  for (let i = 0; i < BEATS.length; i += 1) {
    const beat = BEATS[i];
    beat.audioFile = join(AUDIO_DIR, `exec-${String(i + 1).padStart(2, "0")}-${beat.id}.wav`);
    beat.duration = await tts(beat.say, beat.audioFile);
  }
  const expected = BEATS.reduce((sum, beat) => sum + beat.duration + BEAT_PAD_MS / 1000, 0);
  console.log(`  ${BEATS.length} beats, about ${Math.round(expected)} seconds`);

  console.log("2/3 Recording browser walkthrough...");
  const { rawVideo, timeline, issues } = await record();
  if (issues.length) {
    console.warn("  recording warnings:");
    for (const issue of issues) console.warn(`  - ${issue}`);
  }

  console.log("3/3 Muxing final MP4...");
  const outFile = mux(rawVideo, timeline);
  console.log(`Done: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
