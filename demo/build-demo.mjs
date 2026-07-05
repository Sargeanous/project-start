// Autonomous demo-video pipeline for the Unified DOOH Platform.
//
//   node demo/build-demo.mjs            -> preflight, then record if clean
//   node demo/build-demo.mjs --check    -> preflight only, no recording
//
// Stages:
//   1. Narration script -> OpenAI TTS (wav per scene, cached by text hash)
//   2. PREFLIGHT: a fast headless dry run of every scene. Any missing
//      element, skipped step, scene error or error-boundary hit is
//      reported, and the recording does not start unless the path is
//      100% clean. The dry run also warms every dev-server route.
//   3. RECORD: Playwright drives a headed browser, records video, injects
//      a visible cursor, click ripples, lower-thirds and title cards;
//      each scene is paced to its narration clip plus a viewing dwell.
//   4. ffmpeg (ffmpeg-static) muxes the narration onto the recording.
//
// Requirements: dev server on :8080, OPENAI_API_KEY in .env, internet for
// map tiles and TTS. Leave the browser window alone while it records.

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
const FFMPEG = (await import("ffmpeg-static")).default;

// Extra seconds the viewer gets on each scene after the narration ends.
const SCENE_DWELL_MS = 3500;

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

/* ------------------------------------------------------------------ *\
   1. The narration script (one day on the network; no em or en dashes)
\* ------------------------------------------------------------------ */

const SCENES = [
  {
    id: "s1-control",
    title: "Seven a.m. The network wakes up",
    narration:
      "Abu Dhabi, seven a.m. Fourteen digital displays across five zones wake up under one system. In the control room, operators watch the estate breathe: every screen, its health, and what it is playing, live on the map. And any display is one click away, exactly as it looks on the street.",
  },
  {
    id: "s2-request",
    title: "The request: a campaign is born",
    narration:
      "Across town, an advertiser needs airtime. He picks a package from the marketplace, names his campaign, and submits. That is it. The request now exists inside the platform, already routed to review. For premium inventory he plays the auction instead, raising his bid on the Corniche evening rotation moments before it closes.",
  },
  {
    id: "s3-award",
    title: "The award: money clears before delivery",
    narration:
      "At noon, finance closes the round. The platform awards at first price, raises the invoice with VAT, and holds delivery until the money clears. Payment confirmed. And the Commercial Map already knows who holds that screen, on what contract, and until when.",
  },
  {
    id: "s4-gate",
    title: "The gate: AI reviews, humans decide",
    narration:
      "Now the gate. MediaGPT reads the creative first: bilingual copy, rights, restricted categories. It flags what a human should look at and cites the exact policy clause. But AI only proposes; people decide. High-impact content takes two named approvers, each with a one-time code, and neither the owner nor the bidder may sign their own work. Two signatures later it is approved, and the whole decision sits in the journal, permanently.",
  },
  {
    id: "s5-copilot",
    title: "The copilot: ask the platform anything",
    narration:
      "Everyone on the platform has the same copilot. Ask it anything: it reads the live estate and answers with sources. Ask it to act, and it drafts the action but never executes it. Every write waits for a human decision. Here, the operator approves the maintenance ticket it drafted. Intelligence, with a leash.",
  },
  {
    id: "s6-proof",
    title: "It plays, and proves it",
    narration:
      "At the scheduled minute, the creative goes live, and the screen answers back with a cryptographic receipt, hash chained to every play before it, all the way to genesis. Finance verifies the chain and settles the booking. Billing rests on evidence, not estimates.",
  },
  {
    id: "s7-emergency",
    title: "The interruption: an alert outranks everything",
    narration:
      "Then the day changes. NCEMA issues a weather alert. MediaGPT assists but never touches the message: it checks Arabic and English parity and proposes routing, read only by design. The duty officer approves with a one-time code and broadcasts. Within seconds the network drops commercial content for the warning. Emergencies outrank everything.",
  },
  {
    id: "s8-safety",
    title: "The response: crews out, screens dark on command",
    narration:
      "A screen struggles in the storm. Dispatch shows exactly which sites get a crew before anyone commits. And when a display must go dark right now, the kill switch, password confirmed and fully audited, blanks it in seconds and restores it just as fast.",
  },
  {
    id: "s9-close",
    title: "The close: the day on the books",
    narration:
      "By evening, the day is already on the books: what sold, what played, what was proven, what was interrupted. One platform. One closed loop. From dirham, to display, to proof.",
  },
];

/* ------------------------------------------------------------------ *\
   2. TTS
\* ------------------------------------------------------------------ */

function wavDurationSeconds(buf) {
  const byteRate = buf.readUInt32LE(28);
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString("ascii", o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    if (id === "data") {
      // Streamed WAVs (OpenAI TTS) carry a 0xFFFFFFFF placeholder size;
      // the real payload is simply the rest of the buffer.
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
    const body = {
      model,
      voice: "nova",
      input: text,
      response_format: "wav",
    };
    if (withInstructions) {
      body.instructions =
        "Professional corporate product-demo narrator. Female, warm, confident. Slow, deliberate, unhurried pace with clear pauses between sentences. No rush.";
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

/* ------------------------------------------------------------------ *\
   3. Overlays and helpers
\* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    Object.assign(c.style, {
      position: "fixed", left: "960px", top: "700px", width: "22px", height: "22px",
      borderRadius: "50%", background: "rgba(31,74,61,0.85)", border: "2.5px solid #fff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.45)", zIndex: "2147483647", pointerEvents: "none",
      transform: "translate(-50%,-50%)",
      transition: "left 0.65s cubic-bezier(.22,.61,.36,1), top 0.65s cubic-bezier(.22,.61,.36,1), opacity 0.4s ease",
    });
    document.body.appendChild(c);
    window.__cursorTo = (x, y) => { c.style.left = `${x}px`; c.style.top = `${y}px`; };
    window.__ripple = (x, y) => {
      const r = document.createElement("div");
      Object.assign(r.style, {
        position: "fixed", left: `${x}px`, top: `${y}px`, width: "12px", height: "12px",
        borderRadius: "50%", border: "3px solid rgba(31,74,61,0.9)", zIndex: "2147483646",
        pointerEvents: "none", transform: "translate(-50%,-50%)", opacity: "1",
        transition: "width .45s ease-out, height .45s ease-out, opacity .45s ease-out",
      });
      document.body.appendChild(r);
      requestAnimationFrame(() => { r.style.width = "70px"; r.style.height = "70px"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 600);
    };
    const lt = document.createElement("div");
    lt.id = "__lt";
    Object.assign(lt.style, {
      position: "fixed", left: "30px", bottom: "30px", padding: "11px 20px", borderRadius: "12px",
      background: "rgba(13,31,25,0.85)", color: "#fff", fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px", fontWeight: "600", letterSpacing: "0.02em", zIndex: "2147483647",
      pointerEvents: "none", opacity: "0", transition: "opacity .4s ease", backdropFilter: "blur(4px)",
    });
    document.body.appendChild(lt);
    window.__lowerThird = (text) => {
      if (!text) { lt.style.opacity = "0"; return; }
      lt.textContent = text;
      lt.style.opacity = "1";
    };
    window.__card = (title, subtitle) => {
      let el = document.getElementById("__card");
      c.style.opacity = title ? "0" : "1"; // hide the demo cursor while a card is up
      if (!title) {
        if (el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 800); }
        return;
      }
      el = document.createElement("div");
      el.id = "__card";
      Object.assign(el.style, {
        position: "fixed", inset: "0", zIndex: "2147483645", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px",
        background: "linear-gradient(135deg,#0d1f19 0%,#1f4a3d 100%)", color: "#fff",
        opacity: "1", transition: "opacity .8s ease", fontFamily: "Georgia, serif", textAlign: "center",
      });
      el.innerHTML =
        `<div style="font-size:58px;font-weight:700;letter-spacing:-0.01em;max-width:1200px">${title}</div>` +
        `<div style="font-family:Segoe UI,sans-serif;font-size:19px;opacity:.72;letter-spacing:.16em;text-transform:uppercase">${subtitle || ""}</div>`;
      document.body.appendChild(el);
    };
  });
}

// fast=true: preflight mode. Cosmetic waits collapse, and every missing
// element or recovery is recorded in `issues` instead of silently skipped.
function makeHelpers(page, { fast = false, issues = [] } = {}) {
  const pace = (ms) => sleep(fast ? Math.min(ms * 0.15, 250) : ms);

  async function healIfCrashed() {
    const retry = page.locator("button", { hasText: "Try again" }).first();
    if (await retry.count().catch(() => 0)) {
      issues.push("error boundary appeared (This page didn't load)");
      console.log("  [heal] error boundary appeared, recovering");
      await retry.click().catch(() => {});
      await sleep(2000);
    }
  }
  async function has(locator, label) {
    const n = await locator.count().catch(() => 0);
    if (!n) issues.push(`missing: ${label}`);
    return n > 0;
  }
  async function cursorTo(x, y) {
    await page.evaluate(([cx, cy]) => window.__cursorTo(cx, cy), [x, y]);
    await pace(700);
  }
  // Wait for a locator to be visible with a box, healing the error boundary
  // and retrying once. Route transitions plus the occasional dev-server
  // crash mean an element can be briefly absent; this rides that out.
  async function boxOf(locator) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await healIfCrashed();
      try {
        await locator.waitFor({ state: "visible", timeout: 12000 });
        const box = await locator.boundingBox();
        if (box) return box;
      } catch {
        // fall through to heal + retry
      }
      await healIfCrashed();
      await sleep(1200);
    }
    throw new Error("element never became visible");
  }
  async function click(locator, { settle = 650 } = {}) {
    await healIfCrashed();
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await pace(350);
    const box = await boxOf(locator);
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 40);
    await cursorTo(x, y);
    await page.evaluate(([cx, cy]) => window.__ripple(cx, cy), [x, y]);
    await pace(160);
    await locator.click({ timeout: 6000 }).catch(() => page.mouse.click(x, y));
    await pace(settle);
  }
  async function typeInto(locator, text) {
    await click(locator, { settle: 250 });
    await locator.fill("");
    if (fast) {
      await locator.fill(text);
    } else {
      await locator.pressSequentially(text, { delay: 65 });
    }
    await pace(350);
  }
  async function nav(label) {
    const loc = page.locator("nav button, aside button").filter({ hasText: label }).first();
    await click(loc, { settle: 1100 });
    // Let the route's chunk mount and the page heading settle before the
    // next scene step queries for an element on it.
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await pace(600);
  }
  async function switchProfile(name) {
    const sw = page.locator("button", { hasText: "Switch profile" }).first();
    if (await sw.count()) await click(sw, { settle: 800 });
    await click(page.locator("button", { hasText: name }).first(), { settle: 1300 });
  }
  async function lowerThird(text) {
    await page.evaluate((t) => window.__lowerThird(t), text);
  }
  async function card(title, subtitle) {
    await page.evaluate(([a, b]) => window.__card(a, b), [title, subtitle]);
  }
  async function smoothScroll(toY) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), toY);
    await pace(1200);
  }
  async function mfa(code = "482913") {
    const dialog = page.locator(".revision-dialog").last();
    await typeInto(dialog.locator("input").first(), code);
    await click(dialog.locator("button", { hasText: "Verify and approve" }).first(), { settle: 1000 });
  }
  // Ask the MediaGPT chat dock a question and wait until it finishes
  // answering. AI latency is real in both modes.
  async function askChat(question, timeout = 50000) {
    const before = await page.locator(".chat-panel .chat-log article.assistant").count();
    await typeInto(page.locator(".chat-panel footer input"), question);
    await click(page.locator(".chat-panel footer button").first(), { settle: 500 });
    const answered = await page
      .waitForFunction(
        (n) => {
          const articles = document.querySelectorAll(".chat-panel .chat-log article.assistant");
          const thinking = [...articles].some((a) => a.textContent.includes("MediaGPT is thinking"));
          return articles.length > n && !thinking;
        },
        before,
        { timeout },
      )
      .then(() => true)
      .catch(() => false);
    if (!answered) issues.push(`chat did not answer in time: "${question.slice(0, 40)}..."`);
    await pace(800);
  }
  return { pace, has, cursorTo, click, typeInto, nav, switchProfile, lowerThird, card, smoothScroll, mfa, askChat, healIfCrashed, page, issues };
}

/* ------------------------------------------------------------------ *\
   4. Scene actions
\* ------------------------------------------------------------------ */

const ACTIONS = {
  async "s1-control"(h) {
    await h.card("Unified DOOH Platform", "Abu Dhabi Media Office · one day on the network");
    await h.pace(4200);
    await h.card(null);
    await h.pace(500);
    await h.click(h.page.locator("button", { hasText: "ADMO Control Room" }).first(), { settle: 1400 });
    await h.page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20000 });
    await h.lowerThird("Seven a.m. The network wakes up");
    await h.pace(1800);
    await h.page.locator(".asset-board").scrollIntoViewIfNeeded().catch(() => {});
    await h.pace(1600);
    await h.page.locator(".control-estate-group").scrollIntoViewIfNeeded().catch(() => {});
    await h.pace(1600);
    const zones = h.page.locator(".zone-list button");
    await h.click(zones.nth(1), { settle: 1100 });
    await h.click(zones.nth(2), { settle: 1100 });
    const fullScreen = h.page.locator("button", { hasText: "Full screen" }).first();
    if (await h.has(fullScreen, "s1: live view Full screen button")) {
      await h.click(fullScreen, { settle: 1200 });
      await h.pace(2600);
      await h.page.keyboard.press("Escape");
      await h.pace(800);
    }
  },

  async "s2-request"(h) {
    await h.switchProfile("Advertiser");
    await h.lowerThird("The request: a campaign is born");
    await h.nav("Marketplace");
    await h.pace(1200);
    // Fixed-rate package request
    await h.click(h.page.locator("button", { hasText: "Fixed-rate packages" }).first(), { settle: 1000 });
    const packages = h.page.locator(".package-grid button");
    if (await h.has(packages.nth(1), "s2: package card")) {
      await h.click(packages.nth(1), { settle: 900 });
    }
    const nameInput = h.page.locator(".linked-detail form label", { hasText: "Campaign name" }).locator("input").first();
    if (await h.has(nameInput, "s2: campaign name input")) {
      await h.typeInto(nameInput, "Summer Family Offer");
      const submit = h.page.locator("button[type=submit]", { hasText: "Submit campaign" }).first();
      if (await h.has(submit, "s2: submit campaign button")) {
        await h.click(submit, { settle: 1400 });
      }
    }
    // Premium inventory: raise the bid on the Corniche lot before it closes.
    // Submitting the package brief navigates to Campaigns, so go back first.
    await h.nav("Marketplace");
    await h.pace(900);
    await h.click(h.page.locator("button", { hasText: "Open auctions" }).first(), { settle: 1000 });
    const lot = h.page.locator(".auction-card").first();
    if (await h.has(lot, "s2: auction lot card")) {
      await lot.scrollIntoViewIfNeeded().catch(() => {});
      const bidName = lot.locator("label", { hasText: "Campaign name" }).locator("input").first();
      if (await h.has(bidName, "s2: bid campaign name input")) await h.typeInto(bidName, "Corniche Summer Nights");
      const placeBid = lot.locator("button", { hasText: "Place bid" }).first();
      if (await h.has(placeBid, "s2: place bid button")) await h.click(placeBid, { settle: 1500 });
    }
  },

  async "s3-award"(h) {
    await h.switchProfile("ADMO Finance");
    await h.lowerThird("The award: money clears before delivery");
    const closeBtn = h.page.locator("button", { hasText: "Close auction" }).first();
    if (await h.has(closeBtn, "s3: close auction button")) {
      await h.click(closeBtn, { settle: 1500 });
    }
    const pay = h.page.locator("button", { hasText: "Confirm payment" }).first();
    if (await h.has(pay, "s3: confirm payment button")) {
      await h.click(pay, { settle: 1500 });
    }
    await h.nav("Commercial Map");
    await h.page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20000 });
    await h.pace(1400);
    const marker = h.page.locator(".leaflet-marker-icon").nth(2);
    await h.click(marker, { settle: 1000 });
    await h.page.locator(".linked-detail").scrollIntoViewIfNeeded().catch(() => {});
    await h.pace(1200);
  },

  async "s4-gate"(h) {
    await h.switchProfile("ADMO Content Reviewer");
    await h.lowerThird("The gate: AI reviews, humans decide");
    await h.click(h.page.locator(".submission-list button", { hasText: "National observance takeover" }).first(), { settle: 1100 });
    // The AI review card renders once the submission is In review.
    const start = h.page.locator("button", { hasText: "Start review" }).first();
    if (await h.has(start, "s4: start review button")) await h.click(start, { settle: 1000 });
    const aiReview = h.page.locator(".ai-review-card").first();
    if (await h.has(aiReview, "s4: AI review card")) {
      await aiReview.scrollIntoViewIfNeeded().catch(() => {});
      await h.pace(1500);
      const aiCheck = h.page.locator("button", { hasText: "Run MediaGPT check" }).first();
      if (await h.has(aiCheck, "s4: run MediaGPT check button")) {
        await h.click(aiCheck, { settle: 1200 });
        await h.pace(2500); // let the refreshed findings land on camera
      }
    }
    const panel = h.page.locator(".approvals-panel").first();
    await panel.scrollIntoViewIfNeeded().catch(() => {});
    // first approval
    let select = panel.locator("select").first();
    await h.click(select, { settle: 250 });
    await select.selectOption({ index: 1 });
    await h.pace(600);
    await h.click(panel.locator("button", { hasText: "Approve with MFA" }).first(), { settle: 900 });
    await h.mfa();
    // second approval (dual control)
    select = h.page.locator(".approvals-panel select").first();
    if (await h.has(select, "s4: second approver select")) {
      await h.click(select, { settle: 250 });
      await select.selectOption({ index: 1 });
      await h.pace(600);
      const second = h.page.locator(".approvals-panel button", { hasText: "Second approval (MFA)" }).first();
      if (await h.has(second, "s4: second approval button")) {
        await h.click(second, { settle: 900 });
        await h.mfa("915530");
      }
    }
    await h.pace(1200);
  },

  async "s5-copilot"(h) {
    await h.switchProfile("ADMO Control Room");
    await h.lowerThird("The copilot: ask the platform anything");
    await h.click(h.page.locator(".chat-fab").first(), { settle: 900 });
    await h.askChat("Which assets are offline or need attention right now?");
    await h.pace(1500);
    await h.askChat("Draft a maintenance ticket for AD-HWY-009 with high severity.");
    const approve = h.page.locator(".chat-panel .agent-action-card button", { hasText: "Approve" }).first();
    if (await h.has(approve, "s5: chat proposal approve button")) {
      await h.click(approve, { settle: 1400 });
    }
    await h.pace(1200);
    await h.click(h.page.locator(".chat-panel header button", { hasText: "Close" }).first(), { settle: 700 });
  },

  async "s6-proof"(h) {
    await h.switchProfile("ADMO Content Reviewer");
    await h.lowerThird("It plays, and proves it");
    await h.click(h.page.locator("button", { hasText: "Scheduling" }).first(), { settle: 1000 });
    const play = h.page.locator("button", { hasText: "Play now" }).first();
    if (await h.has(play, "s6: play now button")) await h.click(play, { settle: 1400 });
    await h.switchProfile("ADMO Finance");
    const verify = h.page.locator("button", { hasText: "Verify hash chain" }).first();
    await verify.scrollIntoViewIfNeeded().catch(() => {});
    await h.pace(900);
    await h.click(verify, { settle: 1600 });
    const reconcile = h.page.locator("button", { hasText: "Reconcile against PoP" }).first();
    if (await reconcile.count()) {
      await h.click(reconcile, { settle: 1200 });
      const settleBtn = h.page.locator("button", { hasText: "Close settlement" }).first();
      if (await settleBtn.count()) await h.click(settleBtn, { settle: 1200 });
    }
    await h.pace(1000);
  },

  async "s7-emergency"(h) {
    await h.switchProfile("ADMO Control Room");
    await h.nav("Alerts");
    await h.lowerThird("The interruption: an alert outranks everything");
    // Follow the narration: the NCEMA weather alert, checked then approved.
    const row = h.page.locator("tbody tr", { hasText: "Weather alert broadcast" }).first();
    if (await h.has(row, "s7: NCEMA weather alert row")) await h.click(row, { settle: 1100 });
    const checks = h.page.locator("button", { hasText: "Run MediaGPT checks" }).first();
    if (await h.has(checks, "s7: run MediaGPT checks button")) {
      await h.click(checks, { settle: 1600 });
      await h.pace(1500);
    }
    const assist = h.page.locator("button", { hasText: "Run AI assist" }).first();
    if (await h.has(assist, "s7: run AI assist button")) {
      await h.click(assist, { settle: 900 });
      await h.page.locator(".emg-assist-body").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("s7: AI assist did not answer in time"));
      await h.pace(2000);
    }
    const select = h.page.locator(".approvals-action select").first();
    if (await h.has(select, "s7: alert approver select")) {
      await select.scrollIntoViewIfNeeded().catch(() => {});
      await h.click(select, { settle: 250 });
      await select.selectOption({ index: 1 });
      await h.pace(500);
      await h.click(h.page.locator("button", { hasText: "Approve with MFA" }).first(), { settle: 900 });
      await h.mfa("774201");
    }
    const broadcast = h.page.locator("button", { hasText: "Broadcast now (preempt)" }).first();
    if (await h.has(broadcast, "s7: broadcast now button")) await h.click(broadcast, { settle: 1800 });
    await h.pace(1400);
  },

  async "s8-safety"(h) {
    await h.nav("Control Centre");
    await h.lowerThird("The response: crews out, screens dark on command");
    await h.click(h.page.locator(".operator-actions-row button", { hasText: "Dispatch technician" }).first(), { settle: 1000 });
    await h.pace(1800);
    const dispatchCta = h.page.locator(".dispatch-dialog button", { hasText: "Dispatch to" }).first();
    await h.click(dispatchCta, { settle: 1300 });
    await h.click(h.page.locator(".operator-actions-row button", { hasText: "Kill switch" }).first(), { settle: 1000 });
    const modal = h.page.locator(".kill-modal");
    await h.typeInto(modal.locator(".kill-form input").first(), "Storm incident DR-11");
    await h.click(modal.locator("button", { hasText: "Blank displays" }).first(), { settle: 900 });
    const confirm = h.page.locator(".kill-dialog");
    await h.typeInto(confirm.locator("input[type=password]").first(), "operator-demo");
    await h.click(confirm.locator("button", { hasText: "Blank displays now" }).first(), { settle: 1500 });
    await h.click(modal.locator("button", { hasText: "Re-enable all" }).first(), { settle: 1100 });
    await h.click(modal.locator(".icon-btn").first(), { settle: 800 });
  },

  async "s9-close"(h) {
    await h.switchProfile("ADMO Finance");
    await h.nav("Reports & BI");
    await h.lowerThird("The close: the day on the books");
    await h.pace(2200);
    await h.smoothScroll(420);
    await h.pace(2000);
    await h.lowerThird(null);
    await h.card("One platform. One closed loop.", "From dirham · to display · to proof");
  },
};

/* ------------------------------------------------------------------ *\
   5. Run stages
\* ------------------------------------------------------------------ */

async function resetPlatform() {
  const reset = await fetch(`${BASE_URL}/api/dooh/reset`, { method: "POST" });
  if (!reset.ok) throw new Error("state reset failed; is the dev server running on :8080?");
  // The agent approval queue persists separately from platform state; start
  // with a clean inbox so only on-camera proposals appear.
  writeFileSync(join(ROOT, ".dooh-data", "agent-actions.json"), "[]\n");
}

async function preflight(browser) {
  console.log("2/4 Preflight: dry-running every scene...");
  await resetPlatform();
  const issues = [];
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  const h = makeHelpers(page, { fast: true, issues });
  for (const scene of SCENES) {
    const started = Date.now();
    try {
      await ACTIONS[scene.id](h);
      console.log(`  ok ${scene.id} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (err) {
      issues.push(`${scene.id} failed: ${String(err.message || err).split("\n")[0]}`);
      console.log(`  FAIL ${scene.id}: ${String(err.message || err).split("\n")[0]}`);
      await page.screenshot({ path: join(OUT_DIR, `preflight-${scene.id}.png`) }).catch(() => {});
      // try to recover for the remaining scenes
      await page.goto(BASE_URL, { waitUntil: "networkidle" }).catch(() => {});
      await injectOverlays(page).catch(() => {});
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

  const offsets = [];
  try {
    for (const scene of SCENES) {
      const sceneStart = Date.now() - t0;
      offsets.push(sceneStart);
      console.log(`  ${scene.id} @ ${(sceneStart / 1000).toFixed(1)}s (clip ${scene.duration.toFixed(1)}s)`);
      await ACTIONS[scene.id](h);
      const elapsed = Date.now() - t0 - sceneStart;
      const target = scene.duration * 1000 + SCENE_DWELL_MS;
      if (elapsed < target) await sleep(target - elapsed);
    }
    await sleep(4500); // hold the closing card
  } catch (err) {
    await page.screenshot({ path: join(OUT_DIR, "error.png"), fullPage: false }).catch(() => {});
    await context.close();
    throw err;
  }

  const video = page.video();
  await context.close();
  const rawVideo = await video.path();
  console.log(`  raw video: ${rawVideo}`);
  return { rawVideo, offsets, issues };
}

function mux(rawVideo, offsets) {
  console.log("4/4 Muxing audio...");
  const args = ["-y", "-i", rawVideo];
  for (const scene of SCENES) args.push("-i", scene.audioFile);
  const delays = SCENES.map((s, i) => {
    const d = Math.max(0, Math.round(offsets[i]));
    return `[${i + 1}:a]adelay=${d}|${d}[a${i}]`;
  });
  const mixInputs = SCENES.map((_, i) => `[a${i}]`).join("");
  const filter = `${delays.join(";")};${mixInputs}amix=inputs=${SCENES.length}:normalize=0[aout]`;
  const outFile = join(OUT_DIR, "dooh-platform-demo.mp4");
  args.push(
    "-filter_complex", filter,
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    outFile,
  );
  const res = spawnSync(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
  if (res.status !== 0) {
    console.error(res.stderr.toString().slice(-3000));
    throw new Error("ffmpeg failed");
  }
  rmSync(rawVideo, { force: true });
  return outFile;
}

async function main() {
  console.log("1/4 Generating narration...");
  for (const scene of SCENES) {
    scene.audioFile = join(AUDIO_DIR, `${scene.id}.wav`);
    scene.duration = await tts(scene.narration, scene.audioFile);
    console.log(`  ${scene.id}: ${scene.duration.toFixed(1)}s`);
  }

  const browser = await chromium.launch({ headless: false });
  try {
    const preflightIssues = await preflight(browser);
    if (preflightIssues.length) {
      console.log(`\nPREFLIGHT FAILED with ${preflightIssues.length} issue(s):`);
      for (const issue of preflightIssues) console.log(`  - ${issue}`);
      console.log("\nNot recording. Fix the issues and run again.");
      process.exitCode = 1;
      return;
    }
    console.log("  preflight clean.");
    if (CHECK_ONLY) {
      console.log("\n--check: skipping the recording stage.");
      return;
    }

    const { rawVideo, offsets, issues } = await record(browser);
    if (issues.length) {
      console.log(`\nRECORDING TAINTED with ${issues.length} issue(s):`);
      for (const issue of issues) console.log(`  - ${issue}`);
      console.log("The take is flawed. Not muxing. Run again.");
      rmSync(rawVideo, { force: true });
      process.exitCode = 1;
      return;
    }
    const outFile = mux(rawVideo, offsets);
    console.log(`\nDone: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
