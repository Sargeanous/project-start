# Unified DOOH Platform (ADMO)

A unified digital-out-of-home (DOOH) advertising and operations platform for the
Abu Dhabi Media Office: one system for the whole public screen estate, from selling
airtime to playing it and proving it played, with MediaGPT (AI) assisting at every
step under human governance.

## Watch first (demo videos)

Two narrated walkthroughs live in `demo/output/`:

- **`demo/output/dooh-platform-demo.mp4`** (~5.5 min) — the closed-loop day:
  inventory → advertiser uploads a creative → auction & payment → ADMO creates a
  civic creative with AI → the governance gate (AI reviews, humans approve with dual
  control) → schedule → play → cryptographic proof-of-play → emergency preempt →
  dispatch & kill switch → close of books.
- **`demo/output/mediagpt-capability-reel.mp4`** (~3.3 min) — the MediaGPT
  capability reel: ask in plain language, turn questions into charts, generate a
  creative, review an uploaded creative with vision AI, apply one message to a whole
  radius, advise where to spend, and draft predictive-maintenance work orders.

## Key documents

- **[UI/UX Design Guide](docs/ui-ux-design.md)** — the design language, patterns,
  and rules for building new screens consistently.
- **Knowledge pack** — `knowledge/` (UAE media content standards, advertising guide,
  internal content policy) used for AI citations.

## What makes it distinct

- **Closed-loop, not tabs** — money → display → proof, end to end.
- **AI proposes, humans approve** — every AI write is queued for a named human
  decision; the OpenAI key is server-side only.
- **Governed by design** — segregation of duties, MFA step-up, dual control for
  high-impact content, and an immutable decision journal.
- **Evidence-led** — hash-chained proof-of-play backs billing.
- **Bilingual and RTL** — Arabic is first-class throughout.

## Run it

```bash
npm install
npm run dev        # dev server on http://localhost:8080
```

AI features need `OPENAI_API_KEY` in `.env` (server-side). Without it, the app runs
with branded offline fallbacks.

## Tech

TanStack Start + React 19 + Vite. File-backed server store (`.dooh-data/`, not in
git). Leaflet maps, recharts, a 3D digital twin. Agent layer with a tool registry,
approval queue, and promptfoo evals (`npm run eval:agent`). Demo videos are produced
by Playwright + OpenAI TTS + ffmpeg (`demo/build-demo.mjs`, `demo/build-reel.mjs`).
