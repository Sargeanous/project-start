# Unified DOOH Platform — UI/UX Design Guide

Design language, patterns, and rules for the Abu Dhabi Media Office (ADMO) Unified
DOOH platform. This is the reference for building new pages so they feel like part
of the same product. It is written to be read alongside the code: component names
map to functions in `src/App.tsx`, and class names map to `src/dooh-styles.css`.

> One-line philosophy: **operational software for a government-adjacent operator —
> calm, evidence-led, bilingual, and safe by default. AI proposes; humans approve.**

---

## 1. Who this is for and what it must convey

The platform runs a public digital-out-of-home network (billboards, gantries,
mall panels) for ADMO. The people using it are control-room operators, content
reviewers, finance, and external advertisers. The UI has to communicate three
things at a glance on every screen:

1. **State of the estate** — what is live, what needs attention, what is playing.
2. **Chain of custody** — who did what, under which rule, with what evidence.
3. **Control with a leash** — powerful actions exist (kill a screen, preempt for
   an emergency, approve high-impact content) but are visibly gated.

Everything below serves those three goals.

---

## 2. Design principles

1. **Flows, not features.** Pages are organised around a task a role completes end
   to end, not around a database table. The demo videos in `demo/` are the canonical
   expression of this: inventory → auction → award → payment → governed review →
   schedule → play → proof → settle.
2. **Dependent things live in one box.** If two panels are a list and its detail,
   or a control and the thing it acts on, they are a single bordered container with
   an internal divider — never two separate boxes. Two boxes imply two independent
   objects and mislead the user. (See §5, the `LinkedDetail` pattern.)
3. **Safety controls must look dangerous.** A destructive or outward-facing action
   never blends in with routine controls. It is red, it is confirmed, and where it
   is rare it is hidden behind its trigger rather than sitting open on the page.
4. **AI proposes, a human decides.** Every AI output is a recommendation with its
   sources shown. No AI action writes to the estate without an explicit human
   approval step. This is a hard product rule, not a preference.
5. **Never show an empty or broken state.** No blank creative frames, no dead
   spinners, no walls of near-identical rows. If real data is missing, show a
   branded placeholder or a staged progress animation.
6. **Bilingual and RTL are first-class.** Arabic is not an afterthought; every
   public-facing string is EN/AR and the whole app mirrors under `dir="rtl"`.
7. **Evidence over assertion.** Prefer showing the proof (hash chain, PoP receipt,
   rule citation, approval signatures) to claiming the outcome.

---

## 3. Foundations

### Typography
- `--font-serif: "Fraunces", ...` — display/headings, brand mark, metric numbers,
  and `Detail` value text. Gives the product its editorial, institutional feel.
- `--font-sans: "Inter", ...` — all body copy, controls, labels, tables.
- Arabic: `"Noto Sans Arabic"` for body, `"Amiri"` for RTL headings
  (`html[dir="rtl"]` swaps heading fonts to Amiri).
- Monospace (`ui-monospace, Menlo`) is reserved for hashes, IDs, and journal/diff
  output, so machine-generated evidence reads as machine-generated.
- Fonts load from Google Fonts in `src/routes/__root.tsx`. **Anything rendered
  outside the DOM (e.g. an SVG creative used as an image) must embed the font as a
  base64 `@font-face`** — see `src/backend/creative-fonts.ts` and
  `composeCivicVisual` in `src/routes/api/dooh/$.ts`. An SVG-as-image cannot reach
  the stylesheet, so the font has to travel inside it.

### Color and the tone system
There is one semantic tone scale used everywhere, typed as
`Tone = "neutral" | "good" | "warn" | "danger" | "info"`. It drives `StatusPill`,
`Metric`, deep-scan bars, and map pins so that green/amber/red mean the same thing
on every surface:
- **good** — healthy, live, approved, settled.
- **warn** — needs attention, degraded, pending, below threshold.
- **danger** — offline, blocked, kill/emergency, high-impact category.
- **info** — informational/neutral-positive.
- **neutral** — inert reference data.

The brand greens (`#0d1f19`, `#1f4a3d`, `#14472b`) are the primary palette; the UAE
flag palette appears only where it is meaningful (civic creatives, National Day).

### Iconography
`lucide-react` throughout, one icon per concept (e.g. `ShieldCheck` = governance,
`Sparkles` = MediaGPT/AI, `Wrench` = maintenance, `Target` = radius, `Gauge` =
yield). Panels take an `icon` prop so the header icon reinforces the page's job.

---

## 4. Layout system (the building blocks)

Every page is composed from a small, fixed vocabulary so pages are predictable:

| Component | Role |
|---|---|
| `PageBody` | Page shell / vertical rhythm. |
| `MetricGrid` + `Metric` | The KPI strip at the top of a page (4 cards). First thing the eye lands on: the state of that domain. |
| `Panel` | A titled bordered section: `icon`, `title`, optional `action` (right-aligned control or status). The default container. |
| `Segmented` | Tab strip for switching sub-views inside a page (e.g. CMS: Submissions / Create with AI / Media Library / Scheduling). |
| `LinkedDetail` | The list→detail "one box" container (see §5). |
| `StatusPill` | Small tone-coloured label for state. |
| `Button` | `variant="primary" \| "secondary" \| "danger"`, optional `icon`. |
| `Detail` | Label/value pair; value uses the serif for a considered feel. |

**Rule: view-toggle button strips go at the top or bottom of a page, never floating
in the middle.** A control stranded mid-page reads as a bug and breaks the scan.

---

## 5. Signature pattern — `LinkedDetail` ("dependent blocks = one box")

This is the most important layout rule in the product and the one most often got
wrong before it was codified.

**When two panels are dependent — a catalogue and the item you selected, a control
and the object it acts on — render them as ONE bordered box with a header and an
internal divider, not two side-by-side boxes.** Separate boxes imply two unrelated
objects; a single box says "this detail belongs to that list."

Applied across: CMS submissions list + detail, CAP alerts table + alert detail,
Knowledge bases → sources → source detail, Skills catalogue + skill detail,
Marketplace packages + submit form, Control Centre estate (zones + map + live
view), Commercial Map (map + allocation detail), Rules (ruleset + simulator).

Implementation: the `LinkedDetail` component (`.linked-detail`, `.linked-detail-head`).
Scrolling rule: **the inner list shows a scrollbar only when it is taller than the
paired detail pane** — not by default. A permanent scrollbar on a short list is
visual noise.

---

## 6. Safety and destructive controls

Government operators can take actions that darken public screens or preempt the
whole network. The UI makes those actions unmistakable and hard to trigger by
accident.

- **Kill switch** (`KillSwitchPanel` → `.kill-modal`, `KillConfirmDialog`): a
  `variant="danger"` (red) quick-action button. It opens a **modal only when
  clicked** — it does not sit open on the Control Centre competing with routine
  boxes. Blanking requires a **reason code and a password confirmation**, is scoped
  (asset ≤10s / zone ≤30s / emirate ≤60s, emirate = dual control), and is fully
  audited. Re-enable is one click and just as fast.
- **Dispatch technicians** (`DispatchDialog`): opens a confirmation that spells out
  exactly which sites get a crew and what it will cost, before anything commits.
- **General rule:** irreversible or outward-facing actions get (1) danger styling,
  (2) an explicit confirmation that states the consequence in plain language, and
  (3) an audit trail. Approval granted in one context never silently carries to
  another.

---

## 7. Governance & AI-in-the-loop UI (AI proposes, humans approve)

The platform's differentiator is that intelligence is always on a leash, and the
UI shows the leash.

- **AI review card / deep scan** (`AiDeepScan`, `.ai-review-card`, `.deepscan-*`):
  MediaGPT scores a creative on brand safety, cultural fit, Arabic accuracy,
  legibility at 40m, composition. "Run MediaGPT check" and "Show AI details" expose
  the scores, the findings, and **rule/knowledge citations** (`IntelligenceCitations`)
  so a reviewer sees *why*, not just *what*.
- **Named-approver decision** (`SubmissionApprovals`, `.approvals-panel`):
  - Segregation of duties — the owner and the bidder cannot approve their own work.
  - MFA step-up (`MfaStepUpDialog`) for sensitive/high-impact content.
  - **Dual control** — high-impact needs two distinct named approvers, each with a
    one-time code. The panel shows `have / needed` and the signatures collected.
- **Journal** (`SubmissionJournal`): an immutable, reverse-chronological timeline of
  every decision, who made it, under which rule, and what comes next.
- **Agentic copilot** (`.chat-panel`, agent action cards): when you ask MediaGPT to
  *act*, it drafts the action and queues it — the operator clicks Approve. It never
  self-executes. The chat also shows the tools it called (e.g. `getFinancials |
  executed`) so the reasoning is legible.
- **Category → treatment mapping** is visible and consistent: routine = single
  approver; sensitive/civic = approver + MFA; high-impact/estate takeover = dual
  control. Governance visibly scales with impact.

**Server-side boundary (relevant to UX honesty):** the OpenAI key is server-only;
the client never calls the model directly. Offline/failed AI calls fall back to a
branded, plausible result so the UI never dead-ends.

---

## 8. Data realism and empty states

A convincing operator tool never looks like a demo with placeholder rows.

- **No blank creative frames.** `creativeBackground()` / `composeFallbackVisual`
  always render a branded visual; the Creative Studio shows a staged "thinking"
  animation while a real image generates rather than a dead spinner.
- **Diverse, realistic seed data.** Submissions, assets, and campaigns are varied
  (different advertisers, zones, states), not repetitive near-duplicates.
- **Test/eval data is filtered out** of the live UI (`isRealSubmission`) so QA
  fixtures never leak into a customer-facing screen.
- **Maps are populated** — enough assets and allocations that the estate looks like
  a real network, not three pins.

---

## 9. Maps, charts, and the 3D twin

- **Live maps** (`LiveMap`, `RadiusMap` via Leaflet): allocation-coloured pins using
  the same tone scale. Camera moves are slow, single-direction pans — no jumpy
  recentering. On the Commercial Map, the map and the allocation detail beneath it
  are one scroll surface, revealed by a gentle pan.
- **Charts** (`ChatChart`, recharts): MediaGPT answers quantitative questions with a
  bar/line chart inline in the chat, plus a one-line insight and a suggested action.
- **3D digital twin** (`ClientOnlyBillboardTwin`): every screen has a live double you
  can rotate, explode into its panel/controller/power stack, and click a faulty part
  to read exactly what is wrong and what to do. Faulty parts are tinted on the model.

---

## 10. Creative Studio (AI-assisted creative)

`CreativeStudio` (CMS → "Create with AI") has two modes, both feeding the same
governed pipeline:
- **Generate** — the officer sets the exact bilingual wording (editable fields), and
  MediaGPT paints a text-free background and the platform **composites the exact
  wording on top** (`composeCivicVisual`). This guarantees the Arabic is correct by
  construction rather than trusting an image model to render Arabic. A staged
  progress list ("reading the brand book… selecting the flag palette… rendering")
  fills the generation time.
- **Review** — the officer uploads a finished visual and gpt-4o vision scores it and
  returns concrete fixes. (Raster only — vision cannot read SVG.)

The advertiser marketplace path mirrors this: advertisers **upload their own
creative** (Submit is disabled until they do); the platform never invents an
advertiser's artwork.

---

## 11. Interaction and feedback rules

- **Loading is never dead.** Use staged progress or skeletons; show what the system
  is doing. Cache slow results so repeat views are instant.
- **Chat rendering** uses a lightweight markdown renderer (`MarkdownLite`) so
  assistant replies get real headers/bold/lists instead of raw asterisks.
- **Status is always tone-coloured** and consistent with §3.
- **Confirm before anything hard to undo or outward-facing** (see §6).

---

## 12. Accessibility & internationalisation

- Full RTL under `html[dir="rtl"]`, with Arabic heading fonts.
- Every public string is bilingual via the `translations` map; missing keys fall
  back to the English source rather than breaking. (Watch: the Arabic map rejects
  duplicate keys — `tsc` TS1117; last occurrence wins at runtime.)
- Dialogs and tab strips carry `role`/`aria-modal`/`aria-selected`/`aria-label`.
- Contrast targets ≥ 4.5:1; the deep-scan surfaces contrast ratios explicitly.

---

## 13. Layout pitfalls learned (do not repeat)

- **Do not put `min-height` on grid rows/cards.** It clipped asset-registry cards
  and overflowed kanban columns. Let rows size to content.
- **Beware the global `input { width: 100% }`.** It stretched checkboxes in the
  dispatch and kill-confirm dialogs; give checkboxes an explicit fixed size and lay
  out dialog rows as `checkbox / content / pill` grids.
- **Scrollbars are conditional**, not default (see §5).
- **View toggles never float mid-page** (see §4).
- Do a systematic pass, page by page, before shipping UI — the issues above were
  caught by looking at real rendered frames, not by assuming.

---

## 14. Where things live (file map)

| Concern | Location |
|---|---|
| All components + pages | `src/App.tsx` (single large module; no parallel edits) |
| Styles + tokens | `src/dooh-styles.css` |
| Fonts (web) | `src/routes/__root.tsx` |
| Fonts (embedded, for composed visuals) | `src/backend/creative-fonts.ts` |
| AI endpoints + creative compositor | `src/routes/api/dooh/$.ts` |
| Server state store | `src/backend/dooh-store.ts` |
| Rules engine | `src/rules-engine.ts`, `src/rules-data.ts` |
| Seed data | `src/data.ts` |
| Demo videos (walkthroughs of the flows) | `demo/build-demo.mjs`, `demo/build-reel.mjs`, output in `demo/output/` |

---

## 15. Checklist for a new page or panel

- [ ] KPI strip (`MetricGrid`) up top; tones consistent with §3.
- [ ] Dependent list/detail merged into one `LinkedDetail` box, not two.
- [ ] Any destructive/outward action is danger-styled + confirmed + audited.
- [ ] Any AI output shows sources and requires a human approve step.
- [ ] No blank/empty states; loading shows staged progress.
- [ ] Bilingual strings added; RTL checked.
- [ ] View toggles at top/bottom; scrollbars conditional; no `min-height` on grid rows.
- [ ] Walk the actual rendered page before calling it done.
