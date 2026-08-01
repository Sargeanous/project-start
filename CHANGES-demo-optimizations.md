# Demo optimizations: change notes

Branch: `feat/demo-optimizations` (16 commits off `main`)

These changes implement the client optimization list captured after the demo
review session of 29 July 2026. Each item below maps to a numbered row of that
list, names the commit, and states what is real versus modeled so nothing is
oversold in front of the client.

All new data modules follow the existing convention of the codebase: client
side, deterministic and hash seeded, so the demo shows identical numbers on
every load and the modules are shaped for promotion to backend services.
Nothing depends on wall clock time except the availability windows that already
did. No new dependencies were added.

## What changed, by optimization row

### Row 5, objective based buying (`8ffb3bf`)
Three new modes on the advertiser Media Planner beside the existing budget
plan: citywide coverage (best bookable screen per zone, reports zones covered),
target views (solves for the budget required to reach an impressions target),
and traffic corridors (ranks by audience as an honest, labeled proxy). All modes
use advertiser safe data only: availability, audience, public rate cards.

### Row 8, local advertising tier (`9859801`)
A fourth marketplace package, "Community and local businesses", scoped to the
residential belt, unlocked by a local advertiser toggle. Adds RULE-ZON-004
restricting national commercial categories inside the residential belt; the rule
appears on the Rules page and fires in the brief wizard and the rules simulator.

### Row 10, placement rulebook, sensitive sites (`13e98e6`)
Mosque and diplomatic exclusion radii are now enforced inside the placement
engine, not only at broadcast time. A candidate inside a radius fails with the
site named and the distance against the limit; the compliance map draws the
exclusion circles under the Buffers layer. Exact separation distances are
labeled as pending ADMO confirmation in the citation.

### Row 11, flexible flight weeks (`a34ad38`)
A 16 week availability grid per screen and a week picker on the Media Planner.
Selecting a non contiguous pattern prices and projects only those weeks, drops
screens that cannot serve any of them, and narrates the split flight in the
summary. Clearing the selection returns to the previous automatic behavior.

### Row 12, historical advertiser insights (`d129b97`)
Past advertisers per screen, surfaced in the Commercial Map asset detail and
through a copilot question. Budgets are shown as bands, never exact figures.
Internal roles only: the advertiser facing query paths were not touched.

### Row 13, slot based selling (`784849e`)
Every screen carries a 16 slot by 8 second loop per daypart with civic, sold and
open slots priced from the weekly rate card. Selling an open slot raises a
pending finance approval through the existing money chain, so a slot buy follows
the same approval and invoicing path as any other booking. New endpoint:
`POST /api/dooh/loop/sell`. Loop policy and slot lengths are labeled as pending
operator integration.

### Row 14, audience per site and time band (`b823060`)
Four dayparts per screen with a demographic split and a content category mix,
on the Commercial Map asset detail. Anchored on the existing audience records
where they exist, hash seeded elsewhere. Labeled as a modeled mix with depth
pending client data confirmation.

### Row 15, richer candidate site metrics (`fa09676`)
The placement evaluator now exposes the three nearest assets with distances
(previously computed and discarded), and candidates carry road class,
carriageway and junction distance. Surfaced in the validation facts, a nearby
placements table, and chips on the candidate feed.

### Row 16, zone day parting (`1813088`)
Daypart matching in the rules engine is normalized, so the existing school hours
rule now actually fires from the composers: a restricted category targeted at
the school zone during the morning band is flagged, and clean in the evening.
Adds a per zone day parting grid on the CMS scheduling tab. Time windows are
labeled as pending ADMO confirmation.

### Row 4, finance and payment data capture (`ae32bf7`)
Confirming a payment now captures method, reference and payer, persisted on the
booking and the invoice. The three Financials header figures are computed from
the ledger instead of being hardcoded, seeded so they open at the values shown
previously and move as deals close in session. Invoice rows open a print
friendly detail drawer.

### Row 7, approval turnaround visibility (`15519e2`)
A turnaround card on the CMS queue comparing AI verdict time against the manual
baseline, and a guideline pack card listing the ingested policy sources. The
official ADMO guideline corpus is still pending and slots into the same pack.

### Row 3, configurable ownership models (`3750387`)
New operator registry with seven companies. Every asset carries an ownership
model (government owned and rented, operator owned, or under management
contract), an owner, and a transition history where relevant. Proposing a change
raises a Commercial desk ticket; the register never mutates without approval.

### Row 1, operator scoped access (`5753892`)
Two operator login profiles whose estate, device registry, allocations and
tickets are filtered to the assets their company owns. Internal ADMO views are
unchanged, verified page by page. Tickets raised by an operator are attributed
to their company.

### Row 2, cross operator pools and transfer (`8e48f39`)
Pooled screens where the owning company and the selling company differ, with the
revenue split shown. Initiating a transfer raises a Commercial desk ticket and
marks the row pending; operators see their own pooled entries with their role
labeled and cannot initiate transfers.

### Row 6, competitive separation buffers (`0ea1ea5`)
Brand verticals mapped across the seeded advertisers, and a two leg separation
check: spatial (a neighboring screen within 750 m holding the same vertical) and
temporal (an adjacent sold slot in the same loop holding the same vertical,
wrapping slot 16 to slot 1). Surfaced as advisories in the slot sale dialog and
the bulk apply preflight, citing RULE-COM-002. Advisory by design: a named human
decides.

## Supporting commits

- `9000aae` baseline: placement planning workspace, plus a fix for a map defect
  where React rewrote the Leaflet container class list and broke tile rendering
  after entering relocation mode.
- `da5862f` two pre existing strict mode type errors fixed so the branch builds
  clean.

## Not included, and why

- **Brand templates and automated design checks** (row 9). Template registry and
  typography or margin validation do not exist yet, and building a credible
  version needs the ADMO design system first.
- **Full content guideline integration** (row 7, corpus half). The moderation
  pipeline runs today against a stand in rulebook. The official guide is a
  scanned image only PDF and needs OCR and legal sign off before ingestion.

## Verification

Every commit was verified before landing: `tsc --noEmit` clean, and the affected
surface exercised in a real browser against the running build. A final sweep
covered 126 page loads, all eight login profiles across both themes, with zero
page or console errors.

## Notes for demonstrating this work

- Pending records (tickets, approvals, slot holds) live in memory on the dev
  server. Re-selling the same slot returns a duplicate error, which is the
  governance guard working as intended; pick a different slot when demonstrating
  live after a rehearsal.
- Zone polygons remain illustrative until the authoritative ADMO GIS layer is
  connected, and the Model Center, Skills and Audit figures remain curated to
  show the target operating model.
