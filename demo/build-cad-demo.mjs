// Autonomous demo-video pipeline for the SANAD CAD drawing-review workspace.
//
//   node demo/build-cad-demo.mjs            -> preflight, then record if clean
//   node demo/build-cad-demo.mjs --check    -> preflight only, no recording
//
// Self-contained sibling of build-demo.mjs, targeting the SANAD Review
// Cockpit (http://localhost:5174) backed by the CAD rule engine on :3203.
// Story: one submitted drawing package goes from the review queue to a
// returned correction request. The engine screens; the human decides.
//
// Sync model: every scene is a list of BEATS. A beat pairs one line of
// narration with the action that line describes. Each beat gets its own TTS
// clip, muxed at the exact offset where that beat ran.
//
// Stages: 1) TTS per beat (cached)  2) PREFLIGHT (engine endpoints + dry run
// of every beat; record only if 100% clean)  3) headed record with cursor,
// captions, title cards, zoom-on-panel  4) ffmpeg muxes per-beat audio.

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "demo", "output");
const AUDIO_DIR = join(ROOT, "demo", "audio");
const BASE_URL = process.env.CAD_DEMO_BASE_URL || "http://localhost:5174";
const ENGINE_URL = process.env.CAD_ENGINE_URL || "http://localhost:3203";
const CHECK_ONLY = process.argv.includes("--check");
const OUT_NAME = "cad-review-demo.mp4";
const FFMPEG = (await import("ffmpeg-static")).default;

const BEAT_PAD_MS = 700; // silence held after a beat's narration ends
const CAD_REQUEST_ID = "CAD-202605190500710";
const DRAWING_NAME = "example2.dxf";

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

const OPEN_TITLE = "SANAD · CAD Drawing Review";
const OPEN_SUB = "Automated ITS drawing screening. Decisions stay human.";
const CLOSE_SUB = "Minutes of screening. Evidence only. Decisions stay human.";

const SCENES = [
  {
    id: "s0",
    lower: null,
    beats: [
      {
        say: "This is SANAD, the review cockpit for Abu Dhabi Mobility. A consultant has just submitted a traffic signal design package for review.",
        async do(h) {
          await h.card(OPEN_TITLE, OPEN_SUB);
          // Behind the card: sign in (not persisted) and open the queue.
          await h.typeInto(h.page.locator(".login-card input[type=email]").first(), "reviewer@itc.gov.ae");
          await h.typeInto(h.page.locator(".login-card input[type=password]").first(), "sanad-demo");
          await h.click(h.page.locator("button.login-submit").first(), { settle: 700 });
          await h.click(h.page.locator(".sidebar-nav .nav-item", { hasText: "Requests" }).first(), { settle: 700 });
          await h.page
            .locator(".figma-requests-table-card tbody tr", { hasText: CAD_REQUEST_ID })
            .first()
            .waitFor({ timeout: 15000 });
        },
      },
    ],
  },

  {
    id: "s1",
    lower: null,
    beats: [
      {
        say: "The submission lands in the review queue like any other request.",
        async do(h) {
          await h.card(null);
          await h.pace(500);
          await h.hover(
            h.page.locator(".figma-requests-table-card tbody tr", { hasText: CAD_REQUEST_ID }).first(),
            { settle: 900 },
          );
        },
      },
      {
        say: "One click opens the CAD workspace.",
        async do(h) {
          await h.click(
            h.page.locator(".figma-requests-table-card tbody tr", { hasText: CAD_REQUEST_ID }).first(),
            { settle: 900 },
          );
          await h.page.locator(".sanad-cadw").first().waitFor({ timeout: 15000 });
          await h.page.locator(".cadw-drawing-card").first().waitFor({ timeout: 15000 });
          await h.pace(400);
        },
      },
    ],
  },

  {
    id: "s2",
    lower: "Screened before a human opens it",
    beats: [
      {
        say: "The rule engine has already screened this package against the ITS six zero four design standard.",
        async do(h) {
          await h.click(h.page.locator(".cadw-drawing-card", { hasText: DRAWING_NAME }).first(), { settle: 900 });
          // Summary header fully hydrated: 11 junctions, rules count resolved.
          const ok = await h.page
            .waitForFunction(
              () => {
                const cells = document.querySelectorAll(".cadw-summary-stats > div strong");
                return (
                  cells.length >= 3 &&
                  cells[0].textContent.trim() === "11" &&
                  cells[1].textContent.trim() !== "…"
                );
              },
              { timeout: 15000 },
            )
            .then(() => true)
            .catch(() => false);
          if (!ok) h.issues.push("s2: summary header did not hydrate for example2");
        },
      },
      {
        say: "Eleven junctions. Thirteen rules evaluated. Over two thousand devices classified straight from the drawing geometry.",
        async do(h) {
          await h.zoomTo(".cadw-summary", { scale: 1.5 });
          await h.pace(1500);
        },
      },
    ],
  },

  {
    id: "s3",
    lower: "Findings are measurements",
    beats: [
      {
        say: "Every finding is a measurement, not an opinion.",
        async do(h) {
          await h.unzoom();
          await h.choose(h.page.locator('select[aria-label="Filter by verdict"]').first(), "VIOLATION");
          const ok = await h.page
            .waitForFunction(
              () => {
                const rows = document.querySelectorAll(".cadw-table tbody tr");
                return rows.length === 7 && [...rows].some((r) => r.textContent.includes("curb clearance"));
              },
              { timeout: 15000 },
            )
            .then(() => true)
            .catch(() => false);
          if (!ok) h.issues.push("s3: VIOLATION filter did not return the 7 expected rows");
        },
      },
      {
        say: "One hundred ninety three of two hundred fifty curb clearance dimensions read below the required one point three meters. The worst is just eight centimeters.",
        async do(h) {
          await h.zoomTo(".cadw-table", { scale: 1.3 });
          await h.hover(h.page.locator(".cadw-table tbody tr", { hasText: "curb clearance" }).first(), {
            settle: 1200,
          });
          await h.pace(1000);
        },
      },
    ],
  },

  {
    id: "s4",
    lower: "Evidence at the junction",
    beats: [
      {
        say: "Click any finding and the evidence appears, drawn on the junction itself.",
        async do(h) {
          await h.click(h.page.locator(".cadw-table tbody tr", { hasText: "curb clearance" }).first(), {
            settle: 500,
          });
          await h.unzoom();
          await h.page.locator(".cadw-evidence").first().waitFor({ timeout: 15000 });
          await h.waitImageReady(".cadw-evidence .cadw-image-frame img", 25000, "s4: junction evidence render");
        },
      },
      {
        say: "Red circles mark each breach with its measured value. The reviewer sees exactly what the consultant will see.",
        async do(h) {
          await h.zoomTo(".cadw-evidence .cadw-image-frame", { scale: 1.3 });
          await h.pace(1400);
          // Warm the engine's render cache for the junction Next lands on, so
          // the swap never shows a blank frame while the engine draws it.
          await h.prefetchNextEvidence();
          await h.click(h.page.locator(".cadw-evidence-bar button", { hasText: "Next" }).first(), {
            settle: 500,
            noScroll: true,
          });
          await h.waitImageReady(".cadw-evidence .cadw-image-frame img", 25000, "s4: next junction render");
          await h.pace(800);
        },
      },
    ],
  },

  {
    id: "s5",
    lower: "The human gate",
    beats: [
      {
        say: "The engine recommends returning the drawing, and it is only a recommendation. Nothing leaves SANAD on its own.",
        async do(h) {
          await h.unzoom();
          await h.pace(400);
          await h.hover(h.page.locator(".cadw-ai-summary").first(), { settle: 600 });
          await h.zoomTo(".cadw-ai-summary", { scale: 1.4, yBias: 90 });
          await h.pace(1400);
        },
      },
      {
        say: "The decision stays with the reviewer.",
        async do(h) {
          // Un-zoom first so the correction modal opens full frame, not inside
          // a scaled right rail.
          await h.unzoom(700);
          await h.click(h.page.locator(".cadw-ai-actions button", { hasText: "Request correction" }).first(), {
            settle: 600,
            noScroll: true,
          });
          await h.page.locator(".cadw-correction-body textarea").first().waitFor({ timeout: 20000 });
          await h.pace(400);
        },
      },
    ],
  },

  {
    id: "s6",
    lower: "The correction package",
    beats: [
      {
        say: "One click drafts the full correction request. Every violation cited with its rule text and its measured evidence.",
        async do(h) {
          await h.hover(h.page.locator(".cadw-correction-body textarea").first(), { settle: 400 });
          // Slow read-through of the engine-composed email body.
          await h.panElement(".cadw-correction-body textarea", 0.6, 4800);
          await h.pace(300);
        },
      },
      {
        say: "The marker numbers match a global findings markup, the whole drawing annotated, ready to attach.",
        async do(h) {
          await h.panElement(".cadw-correction-modal", 1, 2000);
          await h.waitImageReady(".cadw-attachment-markup img", 25000, "s6: findings markup thumbnail");
          await h.zoomTo(".cadw-attachment-markup", { scale: 1.45 });
          await h.pace(2400);
        },
      },
    ],
  },

  {
    id: "s7",
    lower: "Back to the consultant",
    beats: [
      {
        say: "The request goes back to the consultant the same day.",
        async do(h) {
          await h.unzoom(800);
          await h.click(h.page.locator(".cadw-correction-actions button", { hasText: "Queue correction request" }).first(), {
            settle: 700,
          });
          const ok = await h.page
            .waitForFunction(
              () => {
                const pill = document.querySelector(".cadw-head .status-pill");
                return pill && pill.textContent.includes("Waiting applicant");
              },
              { timeout: 10000 },
            )
            .then(() => true)
            .catch(() => false);
          if (!ok) h.issues.push("s7: status pill did not flip to Waiting applicant");
          await h.hover(h.page.locator(".cadw-head .status-pill").first(), { settle: 500 });
          await h.zoomTo(".cadw-head-copy", { scale: 1.35 });
        },
      },
      {
        say: "Minutes of screening instead of days. Evidence only. Decisions stay human.",
        async do(h) {
          await h.pace(900);
          await h.unzoom(700);
          await h.lowerThird(null);
          await h.pace(300);
          await h.card(OPEN_TITLE, CLOSE_SUB);
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
   3. Overlays + helpers (cursor, captions, cards, zoom-on-panel)
\* ------------------------------------------------------------------ */

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById("__cur")) return;
    const layer = document.documentElement;
    // The app fits the viewport and every panel scrolls internally; hiding
    // document overflow removes the window scrollbars that would otherwise
    // appear while the root is scaled for a zoom.
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
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
        borderRadius: "50%", border: "3px solid rgba(31,74,61,0.9)", zIndex: "2147483644",
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
      fontSize: "15px", fontWeight: "600", letterSpacing: "0.02em", zIndex: "2147483646",
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
    // Full-frame title card. Overlays (subtitle) stay above it; cursor hides.
    window.__card = (title, subtitle) => {
      const prev = document.getElementById("__card");
      c.style.opacity = title ? "0" : "1";
      if (!title) {
        if (prev) { prev.style.opacity = "0"; setTimeout(() => prev.remove(), 800); }
        return;
      }
      if (prev) prev.remove();
      const el = document.createElement("div");
      el.id = "__card";
      Object.assign(el.style, {
        position: "fixed", inset: "0", zIndex: "2147483645", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px",
        background: "linear-gradient(135deg,#0d1f19 0%,#1f4a3d 100%)", color: "#fff",
        opacity: "1", transition: "opacity .8s ease", fontFamily: "Georgia, serif", textAlign: "center",
        // Actions run behind the card (sign in, navigation) so it must never
        // swallow the pointer.
        pointerEvents: "none",
      });
      el.innerHTML =
        `<div style="font-size:58px;font-weight:700;letter-spacing:-0.01em;max-width:1200px">${title}</div>` +
        `<div style="font-family:Segoe UI,sans-serif;font-size:19px;opacity:.72;letter-spacing:.16em;text-transform:uppercase">${subtitle || ""}</div>`;
      layer.appendChild(el);
    };
    // Zoom-on-panel: the app root is scaled; overlays live on <html> and stay
    // crisp. __zoomState lets a later zoom convert on-screen coords back to
    // the untransformed space.
    window.__zoomState = { s: 1, tx: 0, ty: 0 };
    window.__zoom = (cx, cy, scale, ms) =>
      new Promise((res) => {
        const root = document.getElementById("root");
        if (!root) return res();
        root.style.transformOrigin = "0 0";
        root.style.transition = `transform ${ms}ms cubic-bezier(.25,.1,.25,1)`;
        const W = window.innerWidth;
        const H = window.innerHeight;
        let s = scale, tx = 0, ty = 0;
        if (!scale || scale === 1) {
          s = 1;
          root.style.transform = "none";
        } else {
          tx = Math.min(0, Math.max(W - s * W, W / 2 - s * cx));
          ty = Math.min(0, Math.max(H - s * H, H / 2 - s * cy));
          root.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
        }
        window.__zoomState = { s, tx, ty };
        setTimeout(res, ms + 60);
      });
    // Slow, eased scroll of a panel (textarea or modal), so a read-through
    // looks like a camera move, never a jump. frac is 0..1 of max scroll.
    window.__panEl = (sel, frac, ms) =>
      new Promise((res) => {
        const el = document.querySelector(sel);
        if (!el) return res();
        const max = el.scrollHeight - el.clientHeight;
        const target = Math.max(0, Math.min(max, max * frac));
        const start = el.scrollTop;
        const dist = target - start;
        const t0 = performance.now();
        function step(now) {
          const p = Math.min(1, (now - t0) / ms);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          el.scrollTop = start + dist * e;
          if (p < 1) requestAnimationFrame(step);
          else res();
        }
        requestAnimationFrame(step);
      });
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
  async function has(locator, label) {
    const n = await locator.count().catch(() => 0);
    if (!n) issues.push(`missing: ${label}`);
    return n > 0;
  }
  async function boxOf(locator) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await locator.waitFor({ state: "visible", timeout: 12000 });
        const box = await locator.boundingBox();
        if (box) return box;
      } catch { /* retry */ }
      await sleep(1200);
    }
    throw new Error("element never became visible");
  }
  async function cursorTo(x, y) {
    await page.evaluate(([cx, cy]) => window.__cursorTo(cx, cy), [x, y]);
    await pace(650);
  }
  async function click(locator, { settle = 600, noScroll = false } = {}) {
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
  // Move the cursor onto an element and rest there (real hover included so
  // CSS hover states render), without clicking.
  async function hover(locator, { settle = 600 } = {}) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await boxOf(locator);
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 40);
    await locator.hover({ timeout: 4000 }).catch(() => {});
    await cursorTo(x, y);
    await pace(settle);
  }
  async function typeInto(locator, text) {
    await click(locator, { settle: 200 });
    await locator.fill("");
    if (fast) await locator.fill(text);
    else await locator.pressSequentially(text, { delay: 45 });
    await pace(250);
  }
  // Native <select>: move the cursor there and set the value programmatically
  // so no OS dropdown popup (which the recorder cannot see) is left open.
  async function choose(locator, value, { settle = 800 } = {}) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await boxOf(locator);
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 40);
    await cursorTo(x, y);
    await page.evaluate(([cx, cy]) => window.__ripple(cx, cy), [x, y]);
    await pace(200);
    await locator.selectOption(value);
    await pace(settle);
  }
  async function lowerThird(text) { await page.evaluate((t) => window.__lowerThird(t), text); }
  async function card(title, subtitle) { await page.evaluate(([a, b]) => window.__card(a, b), [title, subtitle]); }
  // Zoom into the panel being interacted with. Coordinates are measured on
  // screen and converted back to untransformed space so chained zooms work.
  async function zoomTo(selector, { scale = 1.4, ms = 1100, xBias = 0, yBias = 0 } = {}) {
    const target = await page.evaluate(
      ([sel, xb, yb]) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const z = window.__zoomState || { s: 1, tx: 0, ty: 0 };
        const cx = (r.left + r.width / 2 - z.tx) / z.s + xb;
        const cy = (r.top + r.height / 2 - z.ty) / z.s + yb;
        return [cx, cy];
      },
      [selector, xBias, yBias],
    );
    if (!target) { issues.push(`zoom target missing: ${selector}`); return; }
    await page.evaluate(
      ([cx, cy, s, d]) => window.__zoom(cx, cy, s, d),
      [...target, scale, fast ? 120 : ms],
    );
    await pace(250);
  }
  async function unzoom(ms = 900) {
    await page.evaluate((d) => window.__zoom(0, 0, 1, d), fast ? 120 : ms);
    await pace(200);
  }
  async function panElement(selector, frac, ms) {
    const found = await page.evaluate((sel) => Boolean(document.querySelector(sel)), selector);
    if (!found) { issues.push(`pan target missing: ${selector}`); return; }
    await page.evaluate(([sel, f, d]) => window.__panEl(sel, f, d), [selector, frac, fast ? 150 : ms]);
    await pace(200);
  }
  // Ask the engine to render the junction evidence Next will show, before the
  // click, so the image swap is instant instead of a blank frame.
  async function prefetchNextEvidence() {
    await page
      .evaluate(async () => {
        const sel = document.querySelector(".cadw-evidence-bar select");
        if (!sel) return;
        const next = sel.options[sel.selectedIndex + 1];
        if (!next) return;
        const label = next.textContent.trim();
        await fetch(
          `http://localhost:3203/api/cad/drawings/example2/junctions/${encodeURIComponent(label)}/evidence.png`,
        ).catch(() => {});
      })
      .catch(() => {});
  }
  async function waitImageReady(selector, timeout = 20000, label = selector) {
    const ok = await page
      .waitForFunction(
        (sel) => {
          const img = document.querySelector(sel);
          return img && img.complete && img.naturalWidth > 0;
        },
        selector,
        { timeout },
      )
      .then(() => true)
      .catch(() => false);
    if (!ok) issues.push(`image did not load: ${label}`);
  }
  return {
    pace, has, click, hover, typeInto, choose, lowerThird, card,
    zoomTo, unzoom, panElement, prefetchNextEvidence, waitImageReady, page, issues,
  };
}

/* ------------------------------------------------------------------ *\
   4. Run stages
\* ------------------------------------------------------------------ */

const CONSOLE_IGNORE = [
  /favicon/i,
  /React DevTools/i,
  /\[vite\]/i,
  /Download the Vue Devtools/i,
  /clipboard/i,
];

function watchConsole(page, issues, tag) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
    issues.push(`${tag}: console error: ${text.slice(0, 160)}`);
  });
  page.on("pageerror", (err) => {
    issues.push(`${tag}: page exception: ${String(err.message || err).slice(0, 160)}`);
  });
}

// The engine must be live with the seeded drawing before anything records.
async function engupPreflight(issues) {
  try {
    const res = await fetch(`${ENGINE_URL}/api/cad/drawings`);
    if (!res.ok) throw new Error(`drawings -> ${res.status}`);
    const { drawings } = await res.json();
    const ex2 = drawings.find((d) => d.id === "example2");
    if (!ex2) throw new Error("seeded drawing example2 missing");
    if (ex2.junction_count !== 11) issues.push(`engine: example2 junction_count is ${ex2.junction_count}, expected 11`);
    if (ex2.verdicts.violation !== 7) issues.push(`engine: example2 violations is ${ex2.verdicts.violation}, expected 7`);
    const images = [
      `${ENGINE_URL}/api/cad/drawings/example2/junctions/IP338A/evidence.png`,
      `${ENGINE_URL}/api/cad/drawings/example2/junctions/IP348A/evidence.png`,
      `${ENGINE_URL}/api/cad/drawings/example2/junctions/IP350/evidence.png`,
      `${ENGINE_URL}/api/cad/drawings/example2/markup.png`,
      `${ENGINE_URL}/api/cad/drawings/example2/overview.png`,
    ];
    for (const url of images) {
      const img = await fetch(url);
      const type = img.headers.get("content-type") || "";
      if (!img.ok || !type.includes("image")) issues.push(`engine: ${url} -> ${img.status} ${type}`);
    }
    const email = await fetch(`${ENGINE_URL}/api/cad/drawings/example2/correction-email`);
    if (!email.ok) issues.push(`engine: correction-email -> ${email.status}`);
  } catch (err) {
    issues.push(`engine unreachable: ${String(err.message || err)}`);
  }
}

function allBeats() {
  const list = [];
  for (const scene of SCENES) scene.beats.forEach((beat, index) => list.push({ scene, beat, index }));
  return list;
}

async function preflight(browser) {
  console.log("2/4 Preflight: engine endpoints + dry-running every beat...");
  const issues = [];
  await engupPreflight(issues);
  if (issues.length) return issues; // no point dry-running against a bad engine

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  watchConsole(page, issues, "preflight");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  const h = makeHelpers(page, { fast: true, issues });
  for (const scene of SCENES) {
    await h.lowerThird(scene.lower ?? null);
    for (const beat of scene.beats) {
      const started = Date.now();
      try {
        if (beat.do) await beat.do(h);
        console.log(`  ok ${scene.id}: ${beat.say.slice(0, 44)}... (${((Date.now() - started) / 1000).toFixed(1)}s)`);
      } catch (err) {
        const msg = String(err.message || err).split("\n")[0];
        issues.push(`${scene.id} beat failed (${beat.say.slice(0, 30)}...): ${msg}`);
        console.log(`  FAIL ${scene.id}: ${msg}`);
        await page.screenshot({ path: join(OUT_DIR, `cad-preflight-${scene.id}.png`) }).catch(() => {});
        await page.goto(BASE_URL, { waitUntil: "networkidle" }).catch(() => {});
        await injectOverlays(page).catch(() => {});
      }
    }
  }
  // Sanity: the evidence junction the curb-clearance row lands on.
  const junctionLabel = await page
    .locator(".cadw-evidence-bar select option:checked")
    .textContent()
    .catch(() => null);
  if (junctionLabel && !/IP/.test(junctionLabel)) {
    issues.push(`preflight: unexpected evidence junction "${junctionLabel}"`);
  }
  await context.close();
  return issues;
}

async function record(browser) {
  console.log("3/4 Recording...");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const issues = [];
  watchConsole(page, issues, "record");
  // Keep the app invisible (dark backdrop, matching the title card) until the
  // title card is up, so the video never opens on a flash of the sign-in page.
  await page.addInitScript(() => {
    const add = () => {
      try {
        if (document.getElementById("__preHide")) return;
        const style = document.createElement("style");
        style.id = "__preHide";
        style.textContent = "html, body { background: #0d1f19 !important; } #root { visibility: hidden !important; }";
        (document.head || document.documentElement).appendChild(style);
      } catch { /* pre-paint cosmetics only */ }
    };
    if (document.documentElement) add();
    else document.addEventListener("readystatechange", add, { once: true });
  });
  const t0 = Date.now();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectOverlays(page);
  // Cover the sign-in screen instantly; the first beat re-issues the same
  // card (idempotent) with its narration.
  await page.evaluate(([a, b]) => window.__card(a, b), [OPEN_TITLE, OPEN_SUB]);
  await page.evaluate(() => document.getElementById("__preHide")?.remove());
  const h = makeHelpers(page, { fast: false, issues });
  const timeline = []; // { audioFile, offsetMs }
  const beatLog = [];

  try {
    for (const scene of SCENES) {
      await h.lowerThird(scene.lower ?? null);
      for (const beat of scene.beats) {
        const offsetMs = Date.now() - t0;
        timeline.push({ audioFile: beat.audioFile, offsetMs });
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
        const elapsed = Date.now() - startedAt;
        const target = beat.duration * 1000 + BEAT_PAD_MS;
        if (elapsed < target) await sleep(target - elapsed);
        beatLog.push({
          scene: scene.id,
          say: beat.say.slice(0, 60),
          offsetMs,
          sayMs: Math.round(beat.duration * 1000),
          ranMs: Math.max(elapsed, target),
        });
        console.log(`  ${scene.id} beat @ ${(offsetMs / 1000).toFixed(1)}s (say ${beat.duration.toFixed(1)}s, ran ${(elapsed / 1000).toFixed(1)}s)`);
      }
    }
    await sleep(3200); // hold closing card
  } catch (err) {
    await page.screenshot({ path: join(OUT_DIR, "cad-error.png") }).catch(() => {});
    await context.close();
    throw err;
  }

  const totalMs = Date.now() - t0;
  const video = page.video();
  await context.close();
  const rawVideo = await video.path();
  writeFileSync(join(OUT_DIR, "cad-review-demo-timings.json"), JSON.stringify({ totalMs, beats: beatLog }, null, 2));
  console.log(`  raw video: ${rawVideo}`);
  return { rawVideo, timeline, issues, totalMs };
}

function videoDurationMs(file) {
  const res = spawnSync(FFMPEG, ["-i", file], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 24 });
  const m = res.stderr.toString().match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) return null;
  return Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000);
}

function mux(rawVideo, timeline, wallTotalMs) {
  console.log("4/4 Muxing audio...");
  // Playwright's recorder drifts a few percent against wall clock on this
  // machine (the raw video runs longer than the wall time it covers). Scale
  // the audio offsets by the measured ratio so narration stays on the action
  // all the way to the closing card.
  let scale = 1;
  const vidMs = videoDurationMs(rawVideo);
  if (vidMs && wallTotalMs) {
    const ratio = vidMs / wallTotalMs;
    if (ratio > 0.95 && ratio < 1.15) scale = ratio;
    console.log(`  video ${(vidMs / 1000).toFixed(1)}s vs wall ${(wallTotalMs / 1000).toFixed(1)}s -> audio offset scale ${scale.toFixed(4)}`);
    // Record the scale so frame QA can map wall offsets to video time.
    try {
      const tf = join(OUT_DIR, "cad-review-demo-timings.json");
      const data = JSON.parse(readFileSync(tf, "utf8"));
      data.videoMs = vidMs;
      data.audioScale = scale;
      data.trimMs = Math.max(0, Math.round((timeline[0].offsetMs - 10) * scale));
      writeFileSync(tf, JSON.stringify(data, null, 2));
    } catch { /* QA convenience only */ }
  }
  // Trim the pre-navigation lead (about:blank white, then the dark pre-hide
  // backdrop) so the video opens on the title card as narration begins.
  const trimMs = Math.max(0, Math.round((timeline[0].offsetMs - 10) * scale));
  const args = ["-y", "-ss", (trimMs / 1000).toFixed(3), "-i", rawVideo];
  for (const t of timeline) args.push("-i", t.audioFile);
  const delays = timeline.map((t, i) => {
    const at = Math.max(0, Math.round(t.offsetMs * scale) - trimMs);
    return `[${i + 1}:a]adelay=${at}|${at}[a${i}]`;
  });
  const mixInputs = timeline.map((_, i) => `[a${i}]`).join("");
  const filter = `${delays.join(";")};${mixInputs}amix=inputs=${timeline.length}:normalize=0[aout]`;
  const outFile = join(OUT_DIR, OUT_NAME);
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
      beat.audioFile = join(AUDIO_DIR, `cad-${scene.id}-${i}.wav`);
      beat.duration = await tts(beat.say, beat.audioFile);
    }
  }
  const total = allBeats().reduce((s, b) => s + b.beat.duration + BEAT_PAD_MS / 1000, 0);
  console.log(`  ${allBeats().length} beats, ~${total.toFixed(0)}s narration`);

  const browser = await chromium.launch({ headless: CHECK_ONLY });
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

    const { rawVideo, timeline, issues, totalMs } = await record(browser);
    if (issues.length) {
      console.log(`\nRECORDING TAINTED with ${issues.length} issue(s):`);
      for (const issue of issues) console.log(`  - ${issue}`);
      console.log("Not muxing. Run again.");
      rmSync(rawVideo, { force: true });
      process.exitCode = 1;
      return;
    }
    const outFile = mux(rawVideo, timeline, totalMs);
    console.log(`\nDone: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
