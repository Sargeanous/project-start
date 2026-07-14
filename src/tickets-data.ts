/* ------------------------------------------------------------------ *\
   Tickets: escalation + team collaboration. A ticket is anchored to a
   main OBJECT (asset, PO, SO, device, zone, ...) and can carry extra
   linked objects. It is assigned to a team AND a person, carries a full
   history (every change + comment), and can be cancelled (never deleted).

   Client-side external store (useSyncExternalStore) shared across pages;
   v1 to iterate on (in-memory, resets on hard reload). Shaped to move to
   the backend store later.
\* ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

export type TicketStatus = "Open" | "In progress" | "Blocked" | "Resolved" | "Cancelled";
export type TicketPriority = "Critical" | "High" | "Medium" | "Low";
export type TicketSource = "Delay risk" | "Maintenance" | "Digital twin" | "Planning" | "Manual";
export type TicketObjectKind = "Asset" | "Device" | "Purchase order" | "Service order" | "Work order" | "Zone" | "Campaign";
export type TicketEventKind = "created" | "comment" | "status" | "priority" | "assignee" | "team" | "object" | "cancelled";

export const TICKET_TEAMS = [
  "Procurement",
  "Field dispatch",
  "Network operations",
  "Maintenance planning",
  "Civil & structures",
  "Permits & authorities",
] as const;

export const TICKET_PEOPLE = [
  "Unassigned",
  "N. Aziz",
  "R. Haddad",
  "S. Al Mansoori",
  "L. Fernandes",
  "H. Saeed",
  "NOC operator",
] as const;

export const TICKET_OBJECT_KINDS: TicketObjectKind[] = ["Asset", "Device", "Purchase order", "Service order", "Work order", "Zone", "Campaign"];

export interface TicketObject {
  kind: TicketObjectKind;
  ref: string;
  label?: string;
}

export interface TicketEvent {
  id: string;
  kind: TicketEventKind;
  at: string;
  actor: string;
  role?: string;
  detail?: string; // system events, e.g. "Status: Open -> In progress"
  body?: string; // comments
}

export interface Ticket {
  id: string;
  title: string;
  body: string;
  object: TicketObject;
  linkedObjects: TicketObject[];
  team: string;
  assignee: string;
  raisedBy: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  createdAt: string;
  createdAtISO: string;
  updatedAt: string;
  closedAtISO?: string;
  history: TicketEvent[];
}

let evtSeq = 0;
function ev(kind: TicketEventKind, at: string, actor: string, extra: Partial<TicketEvent> = {}): TicketEvent {
  evtSeq += 1;
  return { id: `ev${evtSeq}`, kind, at, actor, ...extra };
}

const SEED: Ticket[] = [
  {
    id: "TKT-101",
    title: "LED module shipment held at customs",
    body: "Absen LED consignment for the Yas Bay arena build is stuck at Khalifa Port. The 42-day lead is already consumed; the screen-install phase cannot start until it clears. Need Procurement to expedite clearance or line up a parallel supplier.",
    object: { kind: "Purchase order", ref: "PO-031-2", label: "Absen LED cabinet modules" },
    linkedObjects: [{ kind: "Asset", ref: "AD-YAS-031", label: "Yas Bay arena approach" }],
    team: "Procurement",
    assignee: "N. Aziz",
    raisedBy: "S. Al Mansoori",
    priority: "Critical",
    status: "Blocked",
    source: "Delay risk",
    createdAt: "03 Jul, 09:12",
    createdAtISO: "2026-07-03T09:12:00",
    updatedAt: "05 Jul, 14:40",
    history: [
      ev("created", "03 Jul, 09:12", "S. Al Mansoori", { role: "Project manager", detail: "Raised from the construction delay-risk monitor on PO-031-2." }),
      ev("comment", "03 Jul, 09:13", "S. Al Mansoori", { role: "Project manager", body: "Go-live already slipped 14 days. This is the critical-path blocker." }),
      ev("assignee", "03 Jul, 10:02", "Control room", { detail: "Assignee: Unassigned -> N. Aziz" }),
      ev("comment", "05 Jul, 14:40", "N. Aziz", { role: "Procurement", body: "Chasing the broker for clearance. Sourcing a backup batch from Daktronics as a hedge; will confirm ETA tomorrow." }),
    ],
  },
  {
    id: "TKT-102",
    title: "Cooling fan replacement - Mussafah Bridge Banner",
    body: "Cabinet C05R01 fan reading 0 RPM with the internal sensor at 71 degrees C, above the 65 degrees C ceiling. Surrounding modules will auto-dim to shed heat. Dispatch a technician to replace the fan module.",
    object: { kind: "Service order", ref: "SO-8837", label: "Cooling fan replacement" },
    linkedObjects: [
      { kind: "Asset", ref: "AD-BRG-014", label: "Mussafah Bridge Banner" },
      { kind: "Device", ref: "C05R01", label: "Cabinet 05 R01" },
    ],
    team: "Field dispatch",
    assignee: "R. Haddad",
    raisedBy: "NOC operator",
    priority: "High",
    status: "In progress",
    source: "Digital twin",
    createdAt: "07 Jul, 08:20",
    createdAtISO: "2026-07-07T08:20:00",
    updatedAt: "07 Jul, 11:05",
    history: [
      ev("created", "07 Jul, 08:20", "NOC operator", { role: "Network operations", detail: "Escalated from the 3D twin fault popup. Service order SO-8837 opened." }),
      ev("status", "07 Jul, 10:40", "R. Haddad", { detail: "Status: Open -> In progress" }),
      ev("comment", "07 Jul, 11:05", "R. Haddad", { role: "Field dispatch", body: "Technician assigned, fan kit reserved in depot. On site this afternoon." }),
    ],
  },
  {
    id: "TKT-103",
    title: "Road-closure permit pending DMT",
    body: "Night-work lane closure on Hamdan Street needs municipal sign-off before the mast lift can be scheduled. Blocking the structure phase.",
    object: { kind: "Work order", ref: "WO-004", label: "Hamdan Street gantry - structure" },
    linkedObjects: [{ kind: "Asset", ref: "AD-DTWN-031", label: "Hamdan Street gantry" }],
    team: "Permits & authorities",
    assignee: "H. Saeed",
    raisedBy: "R. Haddad",
    priority: "Medium",
    status: "Open",
    source: "Delay risk",
    createdAt: "28 Jun, 16:02",
    createdAtISO: "2026-06-28T16:02:00",
    updatedAt: "28 Jun, 16:02",
    history: [
      ev("created", "28 Jun, 16:02", "R. Haddad", { role: "Project manager", detail: "Permit application submitted to DMT. Awaiting a closure slot." }),
    ],
  },
  {
    id: "TKT-104",
    title: "Power distribution unit backorder",
    body: "Schneider PDU on a 21-day lead for the Mussafah industrial gateway. Energisation cannot start until the units land on site.",
    object: { kind: "Purchase order", ref: "PO-031-3", label: "Schneider power distribution unit" },
    linkedObjects: [{ kind: "Asset", ref: "AD-MUSS-031", label: "Mussafah industrial gateway" }],
    team: "Procurement",
    assignee: "N. Aziz",
    raisedBy: "N. Aziz",
    priority: "Medium",
    status: "In progress",
    source: "Delay risk",
    createdAt: "01 Jul, 10:30",
    createdAtISO: "2026-07-01T10:30:00",
    updatedAt: "04 Jul, 09:15",
    history: [
      ev("created", "01 Jul, 10:30", "N. Aziz", { role: "Procurement", detail: "PO raised for the Schneider PDU." }),
      ev("comment", "04 Jul, 09:15", "N. Aziz", { role: "Procurement", body: "Checking whether an ex-stock unit can be pulled forward from the Yas order." }),
    ],
  },
  {
    id: "TKT-105",
    title: "Q3 rollout crew scheduling",
    body: "Three builds enter the structure phase in the same week. Confirm crew availability with Trojan and Al Fara'a so we do not double-book lifts.",
    object: { kind: "Zone", ref: "ZN-YAS", label: "Yas Island leisure" },
    linkedObjects: [],
    team: "Maintenance planning",
    assignee: "L. Fernandes",
    raisedBy: "L. Fernandes",
    priority: "Low",
    status: "Resolved",
    source: "Manual",
    createdAt: "20 Jun, 13:45",
    createdAtISO: "2026-06-20T13:45:00",
    updatedAt: "24 Jun, 17:20",
    closedAtISO: "2026-06-24T17:20:00",
    history: [
      ev("created", "20 Jun, 13:45", "L. Fernandes", { role: "Planner", detail: "Drafting the combined lift schedule." }),
      ev("status", "24 Jun, 17:20", "S. Al Mansoori", { detail: "Status: In progress -> Resolved" }),
      ev("comment", "24 Jun, 17:20", "S. Al Mansoori", { role: "Project manager", body: "Schedule agreed with both contractors. Closing this out." }),
    ],
  },
];

let tickets: Ticket[] = SEED;
const listeners = new Set<() => void>();
let seq = 105;

function emit() {
  tickets = [...tickets];
  listeners.forEach((l) => l());
}

function stamp(): string {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

function touch(id: string, event: TicketEvent, patch: Partial<Ticket> = {}) {
  tickets = tickets.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: event.at, history: [...t.history, event] } : t));
  emit();
}

export function getTickets(): Ticket[] {
  return tickets;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTickets(): Ticket[] {
  return useSyncExternalStore(subscribe, getTickets, getTickets);
}

export function createTicket(input: {
  title: string;
  body: string;
  object: TicketObject;
  linkedObjects?: TicketObject[];
  team: string;
  assignee?: string;
  raisedBy?: string;
  priority?: TicketPriority;
  source?: TicketSource;
}): Ticket {
  seq += 1;
  const now = stamp();
  const ticket: Ticket = {
    id: `TKT-${seq}`,
    title: input.title.trim(),
    body: input.body.trim(),
    object: input.object,
    linkedObjects: input.linkedObjects ?? [],
    team: input.team,
    assignee: input.assignee || "Unassigned",
    raisedBy: input.raisedBy || "Control room",
    priority: input.priority || "Medium",
    status: "Open",
    source: input.source || "Manual",
    createdAt: now,
    createdAtISO: new Date().toISOString(),
    updatedAt: now,
    history: [ev("created", now, input.raisedBy || "Control room", { detail: `Ticket created on ${input.object.kind} ${input.object.ref}.` })],
  };
  tickets = [ticket, ...tickets];
  emit();
  return ticket;
}

export function addTicketComment(id: string, body: string, author = "Control room", role = "Control room") {
  const trimmed = body.trim();
  if (!trimmed) return;
  touch(id, ev("comment", stamp(), author, { role, body: trimmed }));
}

export function setTicketStatus(id: string, status: TicketStatus, actor = "Control room") {
  const current = tickets.find((t) => t.id === id);
  if (!current || current.status === status) return;
  const kind: TicketEventKind = status === "Cancelled" ? "cancelled" : "status";
  const detail = status === "Cancelled" ? `Ticket cancelled (was ${current.status})` : `Status: ${current.status} -> ${status}`;
  const patch: Partial<Ticket> = { status };
  // Stamp closure time when a ticket is resolved (used for avg-time-to-closure).
  if (status === "Resolved" && !current.closedAtISO) patch.closedAtISO = new Date().toISOString();
  touch(id, ev(kind, stamp(), actor, { detail }), patch);
}

export function cancelTicket(id: string, reason?: string, actor = "Control room") {
  setTicketStatus(id, "Cancelled", actor);
  if (reason && reason.trim()) addTicketComment(id, `Cancelled: ${reason.trim()}`, actor, "Control room");
}

export function setTicketPriority(id: string, priority: TicketPriority, actor = "Control room") {
  const current = tickets.find((t) => t.id === id);
  if (!current || current.priority === priority) return;
  touch(id, ev("priority", stamp(), actor, { detail: `Criticality: ${current.priority} -> ${priority}` }), { priority });
}

export function setTicketAssignee(id: string, assignee: string, actor = "Control room") {
  const current = tickets.find((t) => t.id === id);
  if (!current || current.assignee === assignee) return;
  touch(id, ev("assignee", stamp(), actor, { detail: `Assignee: ${current.assignee} -> ${assignee}` }), { assignee });
}

export function setTicketTeam(id: string, team: string, actor = "Control room") {
  const current = tickets.find((t) => t.id === id);
  if (!current || current.team === team) return;
  touch(id, ev("team", stamp(), actor, { detail: `Team: ${current.team} -> ${team}` }), { team });
}

export function addLinkedObject(id: string, object: TicketObject, actor = "Control room") {
  const current = tickets.find((t) => t.id === id);
  if (!current) return;
  if (current.linkedObjects.some((o) => o.kind === object.kind && o.ref === object.ref)) return;
  touch(id, ev("object", stamp(), actor, { detail: `Linked ${object.kind} ${object.ref}` }), { linkedObjects: [...current.linkedObjects, object] });
}

export function lastComment(t: Ticket): string | null {
  for (let i = t.history.length - 1; i >= 0; i--) {
    if (t.history[i].kind === "comment") return t.history[i].body ?? null;
  }
  return null;
}

export function ticketSummary() {
  const active = tickets.filter((t) => t.status !== "Cancelled");
  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In progress").length,
    blocked: tickets.filter((t) => t.status === "Blocked").length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
    cancelled: tickets.filter((t) => t.status === "Cancelled").length,
    active: active.length,
  };
}

/** Headline metrics for the tab: recent inflow + closure performance. */
export function ticketMetrics() {
  const now = Date.now();
  const openedLast14 = tickets.filter((t) => now - new Date(t.createdAtISO).getTime() <= 14 * 86400000).length;
  const closed = tickets.filter((t) => t.closedAtISO);
  const avgMs = closed.length
    ? closed.reduce((s, t) => s + (new Date(t.closedAtISO as string).getTime() - new Date(t.createdAtISO).getTime()), 0) / closed.length
    : 0;
  const avgDays = avgMs / 86400000;
  const avgClosureLabel = closed.length ? (avgDays >= 1 ? `${avgDays.toFixed(1)}d` : `${Math.max(1, Math.round(avgDays * 24))}h`) : "—";
  return { openedLast14, avgClosureLabel, closedCount: closed.length };
}

/* -------- MediaGPT ticket awareness -------- */

export function isTicketQuery(q: string): boolean {
  return /ticket|escalat|backlog/i.test(q);
}

export function answerTicketQuery(q: string): string {
  const s = ticketSummary();
  const lower = q.toLowerCase();
  const byTeam = () => {
    const map: Record<string, number> = {};
    tickets.filter((t) => t.status !== "Cancelled" && t.status !== "Resolved").forEach((t) => { map[t.team] = (map[t.team] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(", ") || "none";
  };
  if (/blocked/.test(lower)) {
    const list = tickets.filter((t) => t.status === "Blocked").map((t) => `${t.id} (${t.team})`).join(", ");
    return `${s.blocked} ticket(s) are blocked${list ? `: ${list}` : ""}.`;
  }
  if (/critical/.test(lower)) {
    const crit = tickets.filter((t) => t.priority === "Critical" && t.status !== "Resolved" && t.status !== "Cancelled");
    return `${crit.length} open critical ticket(s)${crit.length ? `: ${crit.map((t) => `${t.id} - ${t.title}`).join("; ")}` : ""}.`;
  }
  if (/resolv|clos|evolution|trend|progress/.test(lower)) {
    return `${s.resolved} resolved and ${s.cancelled} cancelled so far. Currently ${s.open} open, ${s.inProgress} in progress, ${s.blocked} blocked (${s.active} active in total). Close rate is trending up as procurement and field dispatch items clear.`;
  }
  if (/team/.test(lower)) {
    return `Active tickets by team - ${byTeam()}.`;
  }
  if (/how many|count|open|total|status/.test(lower)) {
    return `${s.total} tickets in total: ${s.open} open, ${s.inProgress} in progress, ${s.blocked} blocked, ${s.resolved} resolved, ${s.cancelled} cancelled.`;
  }
  return `Ticket board: ${s.active} active (${s.open} open, ${s.inProgress} in progress, ${s.blocked} blocked), ${s.resolved} resolved. Ask about blocked, critical, closing evolution, or by team.`;
}
