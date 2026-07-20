// Splice the city 3D map miniclips into the finished platform demo.
//
//   node demo/build-3dmap-insert.mjs
//
// Sweet-spot path: the four screen recordings in demo/input become one
// narrated segment (same coral voice, same subtitle pill as the pipeline)
// inserted at the narration gap after the asset-twin sequence (T=297.4s).
// Output: demo/output/dooh-platform-demo-v2.mp4

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FFMPEG = (await import("ffmpeg-static")).default;
const IN = join(ROOT, "demo", "input");
const AUDIO = join(ROOT, "demo", "audio");
const OUT_DIR = join(ROOT, "demo", "output");
const SCRATCH = join(ROOT, "demo", "output", "_3dmap_tmp");
for (const d of [AUDIO, OUT_DIR, SCRATCH]) mkdirSync(d, { recursive: true });

const BASE = join(IN, "dooh-platform-demo.mp4");
const T_CUT = 297.4; // inside the 296.25-298.39s narration gap after the twin
const FONT = "C\\:/Windows/Fonts/segoeui.ttf";

// OpenAI key from .env (server-side only, never printed)
const env = readFileSync(join(ROOT, ".env"), "utf8");
const KEY = env.match(/OPENAI_API_KEY\s*=\s*"?([^\s"]+)"?/)?.[1];
if (!KEY) throw new Error("OPENAI_API_KEY missing from .env");

const VOICE = "coral";
const BASE_INSTRUCTIONS =
  "You are a real person giving a live walkthrough of a product you know inside out, speaking to a small room of senior colleagues. Sound human and natural, never like a synthetic corporate voiceover. Warm, genuine, a little understated. Vary your pace and pitch, let the important phrases land, and take a natural breath between sentences. Use light, easy phrasing and do not over-enunciate. Never rush.";
const TONE = "Quietly impressed and unhurried, like showing colleagues something genuinely new that is just landing in the product.";

// One beat per miniclip. src trims skip the dark lead-in and the
// box/polygon selection attempts (control.mp4 keeps 1.5-21.5s only).
const BEATS = [
  {
    id: "map3d-1",
    src: join(IN, "2D-3D.mp4"),
    from: 1.0,
    avail: 11.2,
    say: "And this is where the map goes next. The same control room, lifted into a full model of the city.",
  },
  {
    id: "map3d-2",
    src: join(IN, "control.mp4"),
    from: 1.5,
    avail: 20.0,
    say: "Every screen sits in its real place. The operator flies the city, opens a display, and reads its live state on the spot.",
  },
  {
    id: "map3d-3",
    src: join(IN, "plan.mp4"),
    from: 1.5,
    avail: 8.2,
    say: "Planning gets the same view. Demand zones drape over the districts, so a planner reads an area before a single screen exists.",
  },
  {
    id: "map3d-4",
    src: join(IN, "radus.mp4"),
    from: 0.5,
    avail: 7.8,
    say: "And a radius broadcast is drawn on the real city. Same governance, richer map.",
  },
];

function run(bin, args, what) {
  const res = spawnSync(bin, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  if (res.status !== 0) throw new Error(`${what} failed:\n${res.stderr.toString().slice(-1600)}`);
  return res;
}
function probeDur(file) {
  const res = spawnSync(FFMPEG, ["-i", file], { stdio: ["ignore", "pipe", "pipe"] });
  const m = res.stderr.toString().match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

// 1) TTS per beat (cached by content hash, same scheme as the pipeline)
const instructions = `${BASE_INSTRUCTIONS} ${TONE}`;
for (const b of BEATS) {
  const hash = createHash("sha256").update(`${VOICE}|${instructions}|${b.say}`).digest("hex").slice(0, 16);
  b.wav = join(AUDIO, `${b.id}-${hash}.wav`);
  if (existsSync(b.wav)) { console.log(`  tts cached ${b.id}`); continue; }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE, input: b.say, response_format: "wav", instructions }),
  });
  if (!res.ok) throw new Error(`TTS ${b.id}: ${res.status} ${await res.text()}`);
  writeFileSync(b.wav, Buffer.from(await res.arrayBuffer()));
  console.log(`  tts -> ${b.id}`);
}

// 2) Timing: each sub-segment runs audio + a small tail; hold the last
//    frame (tpad clone) if the recording is shorter than the line.
for (const b of BEATS) {
  b.audioDur = probeDur(b.wav);
  b.dur = Math.round((b.audioDur + 0.7) * 100) / 100;
  b.pad = Math.max(0, Math.round((b.dur - b.avail) * 100) / 100);
  console.log(`  ${b.id}: audio ${b.audioDur.toFixed(2)}s, segment ${b.dur.toFixed(2)}s, pad ${b.pad.toFixed(2)}s`);
}
const segTotal = BEATS.reduce((s, b) => s + b.dur, 0);
const baseDur = probeDur(BASE);
console.log(`  segment total ${segTotal.toFixed(2)}s, base ${baseDur.toFixed(2)}s, expect ${(baseDur + segTotal).toFixed(2)}s`);

// 3) Captions: split lines >104 chars at a comma (pipeline rule), timed
//    proportionally to character count. Written as textfiles for drawtext.
function captionLines(say) {
  if (say.length <= 104) return [say];
  const clauses = say.split(/,\s*/);
  const out = [];
  let buf = "";
  for (const c of clauses) {
    const next = buf ? `${buf}, ${c}` : c;
    if (next.length > 104 && buf) { out.push(buf); buf = c; } else buf = next;
  }
  if (buf) out.push(buf);
  return out;
}
BEATS.forEach((b, i) => {
  const lines = captionLines(b.say);
  const totalChars = lines.reduce((s, l) => s + l.length, 0);
  let t = 0.15;
  b.captions = lines.map((line, j) => {
    const span = (b.audioDur + 0.4 - 0.15) * (line.length / totalChars);
    const file = join(SCRATCH, `cap-${i}-${j}.txt`);
    writeFileSync(file, line);
    const cap = { file, from: t, to: Math.min(b.dur - 0.05, t + span) };
    t += span;
    return cap;
  });
});

// 4) One-pass filter graph: 4 styled sub-segments + base split at T_CUT,
//    concat, single encode matched to the base (1080p25, aac 24k mono).
const escPath = (p) => p.replace(/\\/g, "/").replace(/:/g, "\\:");
const parts = [];
const maps = [];
BEATS.forEach((b, i) => {
  const inIdx = i + 1;
  const draws = b.captions
    .map((c) => `drawtext=fontfile='${FONT}':textfile='${escPath(c.file)}':fontsize=22:fontcolor=white:box=1:boxcolor=0x081410@0.82:boxborderw=12:x=(w-text_w)/2:y=h-54-text_h:enable='between(t,${c.from.toFixed(2)},${c.to.toFixed(2)})'`)
    .join(",");
  const fadeIn = i === 0 ? ",fade=t=in:st=0:d=0.4" : "";
  const fadeOut = i === BEATS.length - 1 ? `,fade=t=out:st=${(b.dur - 0.4).toFixed(2)}:d=0.4` : "";
  const pad = b.pad > 0 ? `,tpad=stop_mode=clone:stop_duration=${b.pad.toFixed(2)}` : "";
  parts.push(
    `[${inIdx}:v]trim=start=${b.from}:end=${(b.from + Math.min(b.avail, b.dur)).toFixed(2)},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=25${pad},${draws}${fadeIn}${fadeOut}[sv${i}]`,
    `[${inIdx + 4}:a]aresample=24000,aformat=channel_layouts=mono,apad,atrim=end=${b.dur.toFixed(2)},asetpts=PTS-STARTPTS[sa${i}]`,
  );
  maps.push(`[sv${i}][sa${i}]`);
});
const filter = [
  `[0:v]trim=end=${T_CUT},setpts=PTS-STARTPTS,fps=25,setsar=1[bv0]`,
  `[0:a]atrim=end=${T_CUT},asetpts=PTS-STARTPTS,aresample=24000[ba0]`,
  `[0:v]trim=start=${T_CUT},setpts=PTS-STARTPTS,fps=25,setsar=1[bv1]`,
  `[0:a]atrim=start=${T_CUT},asetpts=PTS-STARTPTS,aresample=24000[ba1]`,
  ...parts,
  `[bv0][ba0]${maps.join("")}[bv1][ba1]concat=n=${BEATS.length + 2}:v=1:a=1[outv][outa]`,
].join(";");

const OUT = join(OUT_DIR, "dooh-platform-demo-v2.mp4");
const args = [
  "-y", "-i", BASE,
  ...BEATS.flatMap((b) => ["-i", b.src]),
  ...BEATS.flatMap((b) => ["-i", b.wav]),
  "-filter_complex", filter,
  "-map", "[outv]", "-map", "[outa]",
  "-c:v", "libx264", "-crf", "19", "-preset", "veryfast", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-ar", "24000", "-ac", "1", "-b:a", "96k",
  "-movflags", "+faststart",
  OUT,
];
console.log("  encoding (single pass)...");
run(FFMPEG, args, "final encode");
console.log(`  wrote ${OUT} (${probeDur(OUT).toFixed(2)}s)`);
