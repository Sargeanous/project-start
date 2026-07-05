// Autonomous demo-video pipeline for the Unified DOOH Platform.
//
//   node demo/build-demo.mjs            -> preflight, then record if clean
//   node demo/build-demo.mjs --check    -> preflight only, no recording
//
// Sync model: every scene is a list of BEATS. A beat pairs one line of
// narration with the action that line describes. Each beat gets its own TTS
// clip, muxed at the exact offset where that beat ran, so audio and on-screen
// action stay together instead of drifting across a long per-scene clip.
//
// Stages: 1) TTS per beat (cached)  2) PREFLIGHT dry run of every beat (record
// only if 100% clean)  3) headed record with cursor, captions, title cards
// 4) ffmpeg muxes each beat's audio at its offset.

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

const BEAT_PAD_MS = 700; // silence held after a beat's narration ends

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
   1. Scenes as beats (say + do). No em or en dashes anywhere.
\* ------------------------------------------------------------------ */

const SCENES = [
  {
    id: "s1",
    title: "Seven a.m. The network wakes up",
    beats: [
      {
        say: "Abu Dhabi, seven a.m. Fourteen digital displays across five zones wake up under one system.",
        async do(h) {
          await h.card("Unified DOOH Platform", "Abu Dhabi Media Office · one day on the network");
        },
      },
      {
        say: "In the control room, operators watch the estate breathe: every screen, its health, and what it is playing, live on the map.",
        async do(h) {
          await h.card(null);
          await h.click(h.page.locator("button", { hasText: "ADMO Control Room" }).first(), { settle: 1200 });
          await h.page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20000 });
          await h.page.locator(".asset-board").scrollIntoViewIfNeeded().catch(() => {});
          await h.pace(1200);
          await h.page.locator(".control-estate-group").scrollIntoViewIfNeeded().catch(() => {});
          const zones = h.page.locator(".zone-list button");
          await h.click(zones.nth(1), { settle: 700 });
          await h.click(zones.nth(2), { settle: 700 });
        },
      },
      {
        say: "And any display is one click away, exactly as it looks on the street.",
        async do(h) {
          const fs = h.page.locator("button", { hasText: "Full screen" }).first();
          if (await h.has(fs, "s1: live view Full screen")) {
            await h.click(fs, { settle: 1000 });
            await h.pace(2600);
            await h.page.keyboard.press("Escape");
          }
        },
      },
    ],
  },

  {
    id: "s2",
    title: "The request: an advertiser bids for airtime",
    beats: [
      {
        say: "Across town, an advertiser wants premium airtime.",
        async do(h) {
          await h.switchProfile("Advertiser");
          await h.nav("Marketplace");
          await h.click(h.page.locator("button", { hasText: "Open auctions" }).first(), { settle: 900 });
        },
      },
      {
        say: "In the marketplace he opens the live auctions, names his campaign, and raises his bid on the Corniche evening rotation moments before it closes.",
        async do(h) {
          const lot = h.page.locator(".auction-card").first();
          if (await h.has(lot, "s2: auction lot")) {
            await lot.scrollIntoViewIfNeeded().catch(() => {});
            const bidName = lot.locator("label", { hasText: "Campaign name" }).locator("input").first();
            if (await h.has(bidName, "s2: bid name input")) await h.typeInto(bidName, "Corniche Summer Nights");
            const placeBid = lot.locator("button", { hasText: "Place bid" }).first();
            if (await h.has(placeBid, "s2: place bid")) await h.click(placeBid, { settle: 1200 });
          }
        },
      },
      {
        say: "The request now exists inside the platform, on the record and routed to review.",
      },
    ],
  },

  {
    id: "s3",
    title: "The award: money clears before delivery",
    beats: [
      {
        say: "At noon, finance closes the round.",
        async do(h) {
          await h.switchProfile("ADMO Finance");
          const closeBtn = h.page.locator("button", { hasText: "Close auction" }).first();
          if (await h.has(closeBtn, "s3: close auction")) await h.click(closeBtn, { settle: 1400 });
        },
      },
      {
        say: "The platform awards at first price, raises the invoice with VAT, and holds delivery until the money clears. Payment confirmed.",
        async do(h) {
          const pay = h.page.locator("button", { hasText: "Confirm payment" }).first();
          if (await h.has(pay, "s3: confirm payment")) await h.click(pay, { settle: 1500 });
        },
      },
      {
        say: "And the Commercial Map already knows who holds that screen, on what contract, and until when.",
        async do(h) {
          await h.nav("Commercial Map");
          await h.page.locator(".leaflet-marker-icon").first().waitFor({ timeout: 20000 });
          await h.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
          await h.pace(1200);
          await h.click(h.page.locator(".leaflet-marker-icon").nth(2), { settle: 1000, noScroll: true });
          await h.smoothScroll(360);
        },
      },
    ],
  },

  {
    id: "s4",
    title: "The gate: AI reviews, humans decide",
    beats: [
      {
        say: "Now the gate. MediaGPT reads the creative first: bilingual copy, rights, restricted categories.",
        async do(h) {
          await h.switchProfile("ADMO Content Reviewer");
          await h.click(h.page.locator(".submission-list button", { hasText: "National observance takeover" }).first(), { settle: 1000 });
          const start = h.page.locator("button", { hasText: "Start review" }).first();
          if (await h.has(start, "s4: start review")) await h.click(start, { settle: 1000 });
          await h.page.locator(".ai-review-card").first().scrollIntoViewIfNeeded().catch(() => {});
        },
      },
      {
        say: "It flags what a human should look at and cites the exact policy clause. But AI only proposes; people decide.",
        async do(h) {
          const aiCheck = h.page.locator("button", { hasText: "Run MediaGPT check" }).first();
          if (await h.has(aiCheck, "s4: run MediaGPT check")) {
            await h.click(aiCheck, { settle: 1200 });
            await h.pace(2200);
          }
        },
      },
      {
        say: "High-impact content takes two named approvers, each with a one-time code, and neither the owner nor the bidder may sign their own work.",
        async do(h) {
          const panel = h.page.locator(".approvals-panel").first();
          await panel.scrollIntoViewIfNeeded().catch(() => {});
          let select = panel.locator("select").first();
          await h.click(select, { settle: 250 });
          await select.selectOption({ index: 1 });
          await h.pace(500);
          await h.click(panel.locator("button", { hasText: "Approve with MFA" }).first(), { settle: 800 });
          await h.mfa();
        },
      },
      {
        say: "Two signatures later it is approved, and the whole decision sits in the journal, permanently.",
        async do(h) {
          const select = h.page.locator(".approvals-panel select").first();
          if (await h.has(select, "s4: second approver select")) {
            await h.click(select, { settle: 250 });
            await select.selectOption({ index: 1 });
            await h.pace(500);
            const second = h.page.locator(".approvals-panel button", { hasText: "Second approval (MFA)" }).first();
            if (await h.has(second, "s4: second approval")) {
              await h.click(second, { settle: 800 });
              await h.mfa("915530");
            }
          }
        },
      },
    ],
  },

  {
    id: "s5",
    title: "The copilot: ask the platform anything",
    beats: [
      {
        say: "Everyone on the platform has the same copilot. Ask it anything: it reads the live estate and answers with sources.",
        async do(h) {
          await h.switchProfile("ADMO Control Room");
          await h.click(h.page.locator(".chat-fab").first(), { settle: 800 });
          await h.askChat("Which assets are offline or need attention right now?");
        },
      },
      {
        say: "Ask it to act, and it drafts the action but never executes it. Every write waits for a human decision.",
        async do(h) {
          await h.askChat("Draft a maintenance ticket for AD-HWY-009 with high severity.");
        },
      },
      {
        say: "Here, the operator approves the maintenance ticket it drafted. Intelligence, with a leash.",
        async do(h) {
          const approve = h.page.locator(".chat-panel .agent-action-card button", { hasText: "Approve" }).first();
          if (await h.has(approve, "s5: approve proposal")) await h.click(approve, { settle: 1200 });
          await h.click(h.page.locator(".chat-panel header button", { hasText: "Close" }).first(), { settle: 600 });
        },
      },
    ],
  },

  {
    id: "s5b",
    title: "The twin: every screen has a digital double",
    beats: [
      {
        say: "The copilot flagged a screen offline. Before a crew rolls, the technical team opens that asset as a live 3D twin.",
        async do(h) {
          await h.nav("Network and Devices");
          const asset = h.page.locator(".asset-registry button", { hasText: "Al Ain Gateway" }).first();
          if (await h.has(asset, "twin: AD-HWY-009 row")) await h.click(asset, { settle: 900 });
          const fs = h.page.locator(".asset-twin-pane button", { hasText: "Full screen" }).first();
          if (await h.has(fs, "twin: Full screen")) {
            await h.click(fs, { settle: 1000 });
            await h.page.locator(".twin-fullscreen").first().waitFor({ timeout: 12000 }).catch(() => h.issues.push("twin: fullscreen did not open"));
            await h.pace(1500);
          }
        },
      },
      {
        say: "They spin the full model around to inspect the back of the structure,",
        async do(h) {
          await h.dragRotate(".twin-fullscreen canvas");
        },
      },
      {
        say: "explode it into its stack of panels, controllers and power units,",
        async do(h) {
          await h.slide(".twin-fullscreen .twin-explode input[type=range]", [0.15, 0.3, 0.45, 0.6, 0.72]);
        },
      },
      {
        say: "and open any faulty part to read exactly what is wrong and what to do about it.",
        async do(h) {
          const issue = h.page.locator(".twin-fullscreen .twin-issue.tone-fault").first();
          if (await h.has(issue, "twin: faulty issue row")) {
            await h.click(issue, { settle: 900 });
            await h.page.locator(".twin-window").first().waitFor({ timeout: 8000 }).catch(() => h.issues.push("twin: detail window did not open"));
            await h.pace(2200);
          }
          const close = h.page.locator(".twin-fullscreen .icon-button").first();
          if (await close.count()) await h.click(close, { settle: 700 });
          else await h.page.keyboard.press("Escape");
        },
      },
    ],
  },

  {
    id: "s6",
    title: "It plays, and proves it",
    beats: [
      {
        say: "At the scheduled minute, the creative goes live, and the screen answers back with a cryptographic receipt, hash chained to every play before it, all the way to genesis.",
        async do(h) {
          await h.switchProfile("ADMO Content Reviewer");
          await h.click(h.page.locator("button", { hasText: "Scheduling" }).first(), { settle: 900 });
          const play = h.page.locator("button", { hasText: "Play now" }).first();
          if (await h.has(play, "s6: play now")) await h.click(play, { settle: 1200 });
        },
      },
      {
        say: "Finance verifies the chain and settles the booking. Billing rests on evidence, not estimates.",
        async do(h) {
          await h.switchProfile("ADMO Finance");
          const verify = h.page.locator("button", { hasText: "Verify hash chain" }).first();
          await verify.scrollIntoViewIfNeeded().catch(() => {});
          await h.click(verify, { settle: 1400 });
          const reconcile = h.page.locator("button", { hasText: "Reconcile against PoP" }).first();
          if (await reconcile.count()) {
            await h.click(reconcile, { settle: 1000 });
            const settleBtn = h.page.locator("button", { hasText: "Close settlement" }).first();
            if (await settleBtn.count()) await h.click(settleBtn, { settle: 1000 });
          }
        },
      },
    ],
  },

  {
    id: "s7",
    title: "The interruption: an alert outranks everything",
    beats: [
      {
        say: "Then the day changes. NCEMA issues a weather alert.",
        async do(h) {
          await h.switchProfile("ADMO Control Room");
          await h.nav("Alerts");
          const row = h.page.locator("tbody tr", { hasText: "Weather alert broadcast" }).first();
          if (await h.has(row, "s7: weather alert row")) await h.click(row, { settle: 1000 });
        },
      },
      {
        say: "MediaGPT assists but never touches the message: it checks Arabic and English parity and proposes routing, read only by design.",
        async do(h) {
          const checks = h.page.locator("button", { hasText: "Run MediaGPT checks" }).first();
          if (await h.has(checks, "s7: run checks")) { await h.click(checks, { settle: 1400 }); await h.pace(1200); }
          const assist = h.page.locator("button", { hasText: "Run AI assist" }).first();
          if (await h.has(assist, "s7: run AI assist")) {
            await h.click(assist, { settle: 900 });
            await h.page.locator(".emg-assist-body").first().waitFor({ timeout: 25000 }).catch(() => h.issues.push("s7: AI assist did not answer"));
          }
        },
      },
      {
        say: "The duty officer approves with a one-time code and broadcasts. Within seconds the network drops commercial content for the warning. Emergencies outrank everything.",
        async do(h) {
          const select = h.page.locator(".approvals-action select").first();
          if (await h.has(select, "s7: approver select")) {
            await select.scrollIntoViewIfNeeded().catch(() => {});
            await h.click(select, { settle: 250 });
            await select.selectOption({ index: 1 });
            await h.pace(400);
            await h.click(h.page.locator("button", { hasText: "Approve with MFA" }).first(), { settle: 800 });
            await h.mfa("774201");
          }
          const broadcast = h.page.locator("button", { hasText: "Broadcast now (preempt)" }).first();
          if (await h.has(broadcast, "s7: broadcast now")) await h.click(broadcast, { settle: 1600 });
        },
      },
    ],
  },

  {
    id: "s8",
    title: "The response: crews out, screens dark on command",
    beats: [
      {
        say: "A screen struggles in the storm. Dispatch shows exactly which sites get a crew before anyone commits.",
        async do(h) {
          await h.nav("Control Centre");
          await h.click(h.page.locator(".operator-actions-row button", { hasText: "Dispatch technician" }).first(), { settle: 900 });
          await h.pace(1600);
          await h.click(h.page.locator(".dispatch-dialog button", { hasText: "Dispatch to" }).first(), { settle: 1200 });
        },
      },
      {
        say: "And when a display must go dark right now, the kill switch, password confirmed and fully audited, blanks it in seconds and restores it just as fast.",
        async do(h) {
          await h.click(h.page.locator(".operator-actions-row button", { hasText: "Kill switch" }).first(), { settle: 900 });
          const modal = h.page.locator(".kill-modal");
          await h.typeInto(modal.locator(".kill-form input").first(), "Storm incident DR-11");
          await h.click(modal.locator("button", { hasText: "Blank displays" }).first(), { settle: 800 });
          const confirm = h.page.locator(".kill-dialog");
          await h.typeInto(confirm.locator("input[type=password]").first(), "operator-demo");
          await h.click(confirm.locator("button", { hasText: "Blank displays now" }).first(), { settle: 1300 });
          await h.click(modal.locator("button", { hasText: "Re-enable all" }).first(), { settle: 1000 });
          await h.click(modal.locator(".icon-btn").first(), { settle: 600 });
        },
      },
    ],
  },

  {
    id: "s9",
    title: "The close: the day on the books",
    beats: [
      {
        say: "By evening, the day is already on the books: what sold, what played, what was proven, what was interrupted.",
        async do(h) {
          await h.switchProfile("ADMO Finance");
          await h.nav("Reports & BI");
          await h.pace(1400);
          await h.smoothScroll(420);
        },
      },
      {
        say: "One platform. One closed loop. From dirham, to display, to proof.",
        async do(h) {
          await h.lowerThird(null);
          await h.card("One platform. One closed loop.", "From dirham · to display · to proof");
        },
      },
    ],
  },
];

/* ------------------------------------------------------------------ *\
   2. TTS (per beat)
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
    if (withInstructions) {
      body.instructions =
        "Professional corporate product-demo narrator. Female, warm, confident. Slow, deliberate, unhurried pace with clear pauses. No rush.";
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
   3. Overlays + helpers
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
    window.__lowerThird = (text) => {
      if (!text) { lt.style.opacity = "0"; return; }
      lt.textContent = text;
      lt.style.opacity = "1";
    };
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
    window.__subtitle = (text) => {
      if (!text) { sub.style.opacity = "0"; return; }
      sub.textContent = text;
      sub.style.opacity = "1";
    };
    window.__card = (title, subtitle) => {
      let el = document.getElementById("__card");
      c.style.opacity = title ? "0" : "1";
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
      layer.appendChild(el);
    };
  });
}

// A caption line for a beat: split very long lines at a comma so no caption
// is a wall of text, but keep it tied to the beat's single audio clip.
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
      issues.push("error boundary appeared (This page didn't load)");
      console.log("  [heal] error boundary, recovering");
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
      try {
        await locator.waitFor({ state: "visible", timeout: 12000 });
        const box = await locator.boundingBox();
        if (box) return box;
      } catch { /* heal + retry */ }
      await healIfCrashed();
      await sleep(1200);
    }
    throw new Error("element never became visible");
  }
  async function cursorTo(x, y) {
    await page.evaluate(([cx, cy]) => window.__cursorTo(cx, cy), [x, y]);
    await pace(650);
  }
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
    if (fast) await locator.fill(text);
    else await locator.pressSequentially(text, { delay: 60 });
    await pace(300);
  }
  async function nav(label) {
    await click(page.locator("nav button, aside button").filter({ hasText: label }).first(), { settle: 1000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await pace(500);
  }
  async function switchProfile(name) {
    const sw = page.locator("button", { hasText: "Switch profile" }).first();
    if (await sw.count()) await click(sw, { settle: 700 });
    await click(page.locator("button", { hasText: name }).first(), { settle: 1200 });
  }
  async function lowerThird(text) { await page.evaluate((t) => window.__lowerThird(t), text); }
  async function card(title, subtitle) { await page.evaluate(([a, b]) => window.__card(a, b), [title, subtitle]); }
  async function smoothScroll(toY) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), toY);
    await pace(1200);
  }
  async function mfa(code = "482913") {
    const dialog = page.locator(".revision-dialog").last();
    await typeInto(dialog.locator("input").first(), code);
    await click(dialog.locator("button", { hasText: "Verify and approve" }).first(), { settle: 900 });
  }
  async function askChat(question, timeout = 50000) {
    const before = await page.locator(".chat-panel .chat-log article.assistant").count();
    await typeInto(page.locator(".chat-panel footer input"), question);
    await click(page.locator(".chat-panel footer button").first(), { settle: 400 });
    const answered = await page.waitForFunction(
      (n) => {
        const a = document.querySelectorAll(".chat-panel .chat-log article.assistant");
        return a.length > n && ![...a].some((x) => x.textContent.includes("MediaGPT is thinking"));
      }, before, { timeout },
    ).then(() => true).catch(() => false);
    if (!answered) issues.push(`chat did not answer: "${question.slice(0, 36)}..."`);
    await pace(700);
  }
  // Drag across a 3D canvas to orbit the model (OrbitControls left-drag).
  async function dragRotate(selector) {
    const box = await boxOf(page.locator(selector).first());
    const cy = box.y + box.height / 2;
    const startX = box.x + box.width * 0.32;
    const endX = box.x + box.width * 0.72;
    await cursorTo(startX, cy);
    await page.mouse.move(startX, cy);
    await page.mouse.down();
    const steps = fast ? 4 : 26;
    for (let i = 1; i <= steps; i += 1) {
      const x = startX + ((endX - startX) * i) / steps;
      await page.mouse.move(x, cy);
      await page.evaluate(([px, py]) => window.__cursorTo(px, py), [x, cy]);
      await sleep(fast ? 10 : 42);
    }
    await page.mouse.up();
    await pace(900);
  }
  // Step a range input through values so the bound animation plays smoothly.
  async function slide(selector, values) {
    const el = page.locator(selector).first();
    const box = await boxOf(el);
    await cursorTo(box.x + box.width * 0.2, box.y + box.height / 2);
    for (const v of values) {
      await el.evaluate((node, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(node, String(val));
        node.dispatchEvent(new Event("input", { bubbles: true }));
      }, v);
      await page.evaluate(([bx, bw, val, by, bh]) => window.__cursorTo(bx + bw * val, by + bh / 2), [box.x, box.width, v, box.y, box.height]);
      await pace(320);
    }
    await pace(500);
  }
  return { pace, has, click, typeInto, nav, switchProfile, lowerThird, card, smoothScroll, mfa, askChat, dragRotate, slide, healIfCrashed, page, issues };
}

/* ------------------------------------------------------------------ *\
   4. Run stages
\* ------------------------------------------------------------------ */

async function resetPlatform() {
  const reset = await fetch(`${BASE_URL}/api/dooh/reset`, { method: "POST" });
  if (!reset.ok) throw new Error("state reset failed; is the dev server running on :8080?");
  writeFileSync(join(ROOT, ".dooh-data", "agent-actions.json"), "[]\n");
}

function allBeats() {
  const list = [];
  for (const scene of SCENES) {
    scene.beats.forEach((beat, index) => list.push({ scene, beat, index }));
  }
  return list;
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
      try {
        if (beat.do) await beat.do(h);
        console.log(`  ok ${scene.id}: ${beat.say.slice(0, 44)}... (${((Date.now() - started) / 1000).toFixed(1)}s)`);
      } catch (err) {
        const msg = String(err.message || err).split("\n")[0];
        issues.push(`${scene.id} beat failed (${beat.say.slice(0, 30)}...): ${msg}`);
        console.log(`  FAIL ${scene.id}: ${msg}`);
        await page.screenshot({ path: join(OUT_DIR, `preflight-${scene.id}-${beat.say.slice(0, 12).replace(/\W/g, "")}.png`) }).catch(() => {});
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
  const timeline = []; // { audioFile, offsetMs }

  try {
    for (const scene of SCENES) {
      await h.lowerThird(scene.title);
      for (const beat of scene.beats) {
        const offsetMs = Date.now() - t0;
        timeline.push({ audioFile: beat.audioFile, offsetMs });
        // Caption for this beat, timed across its own audio clip.
        await page.evaluate(
          ([lines, totalMs]) => {
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
          },
          [beatCaptionLines(beat.say), Math.round(beat.duration * 1000)],
        ).catch(() => {});
        const startedAt = Date.now();
        if (beat.do) await beat.do(h);
        // Hold until the beat's narration has fully played (plus a short pad).
        const elapsed = Date.now() - startedAt;
        const target = beat.duration * 1000 + BEAT_PAD_MS;
        if (elapsed < target) await sleep(target - elapsed);
        console.log(`  ${scene.id} beat @ ${(offsetMs / 1000).toFixed(1)}s (say ${beat.duration.toFixed(1)}s, ran ${(elapsed / 1000).toFixed(1)}s)`);
      }
    }
    await sleep(4500); // hold closing card
  } catch (err) {
    await page.screenshot({ path: join(OUT_DIR, "error.png") }).catch(() => {});
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
  const outFile = join(OUT_DIR, "dooh-platform-demo.mp4");
  args.push(
    "-filter_complex", filter,
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    outFile,
  );
  const res = spawnSync(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  if (res.status !== 0) {
    console.error(res.stderr.toString().slice(-3000));
    throw new Error("ffmpeg failed");
  }
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
  const total = allBeats().reduce((s, b) => s + b.beat.duration + BEAT_PAD_MS / 1000, 0);
  console.log(`  ${allBeats().length} beats, ~${total.toFixed(0)}s narration`);

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
    if (CHECK_ONLY) { console.log("\n--check: skipping recording."); return; }

    const { rawVideo, timeline, issues } = await record(browser);
    if (issues.length) {
      console.log(`\nRECORDING TAINTED with ${issues.length} issue(s):`);
      for (const issue of issues) console.log(`  - ${issue}`);
      console.log("Not muxing. Run again.");
      rmSync(rawVideo, { force: true });
      process.exitCode = 1;
      return;
    }
    const outFile = mux(rawVideo, timeline);
    console.log(`\nDone: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
