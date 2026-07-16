# Changelog

Unified DOOH Platform (ADMO / DMT). Notable changes, most recent first.

## 2026-07-14 to 2026-07-16

Window: from Monday 13 Jul 20:30 UAE through Thu 16 Jul. 18 commits, all on `main`.

Note on scope: the Planning and Construction tabs themselves were added earlier
(Monday 19:00 UAE, commit `5270c5a`) and are therefore not listed here. The items
below that touch Planning/Construction are enhancements to those existing tabs. The
only new tab in this window is Tickets.

### New capability

**Tickets system (new tab): escalation and collaboration**
`8e54555`, `e90988f`, `0d9b211`, `bddbc15`, `4d09e4b`

- New Tickets tab plus new client-side store `src/tickets-data.ts`
  (`useSyncExternalStore`, in-memory).
- Table-first board: criticality-first columns, show/hide columns, inline
  criticality/status editing per row, an editable right-side detail drawer, and a
  centered new-ticket modal.
- Tickets anchor to a main object (Asset / Device / Purchase order / Service order /
  Work order / Zone / Campaign) plus linked objects; assigned to a person and a team;
  carry a unified history timeline of every change. Status includes Cancelled
  (tickets are cancelled, never deleted).
- Six-way filter bar (criticality, status, team, assignee, created by, date window).
- Escalation wired from the Construction delay-risk card ("Escalate to <team>").
- MediaGPT answers ticket questions (open counts, closing evolution, by team) from
  the live store.
- KPIs: Active tickets, Opened last 14 days, Avg time to closure.

### Enhancements to the existing Planning / Construction tabs

- **Planning live-probe** (`91759c5`): pin any point on the Planning map and get a
  full synthesized zone profile (same intel panel as predefined zones). Driven by
  `zoneFromPoint`, a placeholder for real DMT digital-twin telemetry.
- **Planning save-as-candidate** (`b9f2bfe`): a pinned probe can be saved as a
  candidate site (tagged "Live pin"), flowing into the existing Candidate sites to
  Promote-to-build pipeline.
- **Construction Procurement and BOM** (`5eaaacc`): rebuilt into two stacked
  full-width tables (Purchase Orders and Bill of Materials), each with filters and
  10-row pagination.
- **Lifecycle map fixes**: white-flicker on hover/select fixed via memoized arrays
  (`21602f3`); Leaflet tile-seam grid lines removed (`8e54555`); selected
  Construction pin enlarged on click (`3b4cdcf`).

### Feature changes (other pages)

- **Network 3D twin** (`5bfc1a9`): the fault popup can now dispatch a technician
  (raises a service order and jumps to the maintenance workbench); deselecting an
  issue clears the highlighted 3D part; notification bell recolored from blue to
  neutral grey; badges restyled.
- **Alerts / Emergencies** (`b263dac`): added a 5-stage lifecycle timeline (Checks,
  Approval, Queued, Broadcasting, Live) with distinct done/current/pending steps;
  removed the boxed Sender/Severity/SLA/Targets bar.
- **Alert creative preview** (`d3c53a6`): enlarged so content fills the frame.
- **Control Centre** (`41737bd`): alert toast shrunk about 20%, second critical
  notification stacked beneath it.

### UI system and polish

- **Status pills and chips refined app-wide** (`9408c99`, `62a687c`): smaller, softer
  fills, hairline borders, consistent geometry.
- **Maintenance task cards** (`6e4ec73`): flattened from a box-in-box gradient to a
  clean flat card with an inline Owner/Due row.
- **Filters** (`4d09e4b`, `0d9b211`, `bddbc15`): filters flow inline in one row;
  self-labeling dropdowns; distinct gradient status pill; compact centered chips.
- **Text cleanup** (`2715e2c`): removed em/en dashes from all rendered UI text.

### Notes for the technical team

- Data is client-side for now. `tickets-data.ts` is an in-memory store (resets on
  hard reload) and the Planning/Construction data is deterministic fixtures. Both are
  shaped to be promoted to a backend store plus API with the same types.
- The "AI" is deterministic advisor logic (zone suggestions, delay-risk, ticket Q&A),
  ready to swap for real models.
- `zoneFromPoint` is the digital-twin seam: swap it for the DMT PoP telemetry feed and
  the whole probe flow works unchanged with live data.
- Stack unchanged (TanStack Start + React + Vite). Zero new type errors introduced.
  Each change verified in-browser before commit.
