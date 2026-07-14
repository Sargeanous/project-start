/* ------------------------------------------------------------------ *\
   Tickets: a lightweight escalation + collaboration store so an AI
   recommendation ("escalate this to procurement") becomes a real, doable
   action inside the platform. Any page can raise a ticket (construction
   delay-risk, maintenance, the 3D twin, planning) and teams collaborate
   on it via a comment thread.

   Client-side external store (useSyncExternalStore) so the Tickets page and
   the pages that raise tickets share one live list without prop threading.
   Shaped to be promoted to the backend store later; this is a v1 to iterate on.
\* ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

export type TicketStatus = "Open" | "In progress" | "Blocked" | "Resolved";
export type TicketPriority = "Critical" | "High" | "Medium" | "Low";
export type TicketSource = "Delay risk" | "Maintenance" | "Digital twin" | "Planning" | "Manual";

export const TICKET_TEAMS = [
  "Procurement",
  "Field dispatch",
  "Network operations",
  "Maintenance planning",
  "Civil & structures",
  "Permits & authorities",
] as const;

export interface TicketComment {
  id: string;
  author: string;
  role: string;
  at: string;
  body: string;
}

export interface Ticket {
  id: string;
  title: string;
  body: string;
  team: string;
  raisedBy: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assetId?: string;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
}

const SEED: Ticket[] = [
  {
    id: "TKT-101",
    title: "LED module shipment held at customs",
    body: "Absen LED consignment for the Yas Bay arena build is stuck at Khalifa Port. The 42-day lead is already consumed; the screen-install phase cannot start until it clears. Need Procurement to expedite clearance or line up a parallel supplier.",
    team: "Procurement",
    raisedBy: "S. Al Mansoori",
    priority: "Critical",
    status: "Blocked",
    source: "Delay risk",
    assetId: "AD-YAS-031",
    createdAt: "03 Jul, 09:12",
    updatedAt: "05 Jul, 14:40",
    comments: [
      { id: "c1", author: "S. Al Mansoori", role: "Project manager", at: "03 Jul, 09:12", body: "Raised from the construction delay-risk monitor. Go-live already slipped 14 days." },
      { id: "c2", author: "N. Aziz", role: "Procurement", at: "05 Jul, 14:40", body: "Chasing the broker for clearance. Sourcing a backup batch from Daktronics as a hedge; will confirm ETA tomorrow." },
    ],
  },
  {
    id: "TKT-102",
    title: "Cooling fan replacement - Mussafah Bridge Banner",
    body: "Cabinet C05R01 fan reading 0 RPM with the internal sensor at 71 degrees C, above the 65 degrees C ceiling. Surrounding modules will auto-dim to shed heat. Dispatch a technician to replace the fan module.",
    team: "Field dispatch",
    raisedBy: "NOC operator",
    priority: "High",
    status: "In progress",
    source: "Digital twin",
    assetId: "AD-BRG-014",
    createdAt: "07 Jul, 08:20",
    updatedAt: "07 Jul, 11:05",
    comments: [
      { id: "c1", author: "NOC operator", role: "Network operations", at: "07 Jul, 08:20", body: "Escalated from the 3D twin fault popup. Service order SO-8837 opened." },
      { id: "c2", author: "R. Haddad", role: "Field dispatch", at: "07 Jul, 11:05", body: "Technician assigned, fan kit is reserved in depot. On site this afternoon." },
    ],
  },
  {
    id: "TKT-103",
    title: "Road-closure permit pending DMT",
    body: "Night-work lane closure on Hamdan Street needs municipal sign-off before the mast lift can be scheduled. Blocking the structure phase.",
    team: "Permits & authorities",
    raisedBy: "R. Haddad",
    priority: "Medium",
    status: "Open",
    source: "Delay risk",
    assetId: "AD-DTWN-031",
    createdAt: "28 Jun, 16:02",
    updatedAt: "28 Jun, 16:02",
    comments: [
      { id: "c1", author: "R. Haddad", role: "Project manager", at: "28 Jun, 16:02", body: "Permit application submitted to DMT. Awaiting a slot for the closure window." },
    ],
  },
  {
    id: "TKT-104",
    title: "Power distribution unit backorder",
    body: "Schneider PDU on a 21-day lead for the Mussafah industrial gateway. Energisation cannot start until the units land on site.",
    team: "Procurement",
    raisedBy: "N. Aziz",
    priority: "Medium",
    status: "In progress",
    source: "Delay risk",
    assetId: "AD-MUSS-031",
    createdAt: "01 Jul, 10:30",
    updatedAt: "04 Jul, 09:15",
    comments: [
      { id: "c1", author: "N. Aziz", role: "Procurement", at: "01 Jul, 10:30", body: "PO raised. Checking whether an ex-stock unit can be pulled forward." },
    ],
  },
  {
    id: "TKT-105",
    title: "Q3 rollout crew scheduling",
    body: "Three builds enter the structure phase in the same week. Confirm crew availability with Trojan and Al Fara'a so we do not double-book lifts.",
    team: "Maintenance planning",
    raisedBy: "L. Fernandes",
    priority: "Low",
    status: "Resolved",
    source: "Manual",
    createdAt: "20 Jun, 13:45",
    updatedAt: "24 Jun, 17:20",
    comments: [
      { id: "c1", author: "L. Fernandes", role: "Planner", at: "20 Jun, 13:45", body: "Drafting the combined lift schedule." },
      { id: "c2", author: "S. Al Mansoori", role: "Project manager", at: "24 Jun, 17:20", body: "Schedule agreed with both contractors. Closing this out." },
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
  const d = new Date();
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

export function getTickets(): Ticket[] {
  return tickets;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Live ticket list; re-renders subscribers on any mutation. */
export function useTickets(): Ticket[] {
  return useSyncExternalStore(subscribe, getTickets, getTickets);
}

export function createTicket(input: {
  title: string;
  body: string;
  team: string;
  raisedBy?: string;
  priority?: TicketPriority;
  source?: TicketSource;
  assetId?: string;
}): Ticket {
  seq += 1;
  const now = stamp();
  const ticket: Ticket = {
    id: `TKT-${seq}`,
    title: input.title.trim(),
    body: input.body.trim(),
    team: input.team,
    raisedBy: input.raisedBy || "Operator",
    priority: input.priority || "Medium",
    status: "Open",
    source: input.source || "Manual",
    assetId: input.assetId,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
  tickets = [ticket, ...tickets];
  emit();
  return ticket;
}

export function addTicketComment(id: string, body: string, author = "Operator", role = "Control room") {
  const trimmed = body.trim();
  if (!trimmed) return;
  const now = stamp();
  tickets = tickets.map((t) =>
    t.id === id
      ? { ...t, updatedAt: now, comments: [...t.comments, { id: `c${t.comments.length + 1}-${seq++}`, author, role, at: now, body: trimmed }] }
      : t,
  );
  emit();
}

export function setTicketStatus(id: string, status: TicketStatus) {
  tickets = tickets.map((t) => (t.id === id ? { ...t, status, updatedAt: stamp() } : t));
  emit();
}

export function setTicketTeam(id: string, team: string) {
  tickets = tickets.map((t) => (t.id === id ? { ...t, team, updatedAt: stamp() } : t));
  emit();
}

export function ticketSummary() {
  const open = tickets.filter((t) => t.status === "Open").length;
  const inProgress = tickets.filter((t) => t.status === "In progress").length;
  const blocked = tickets.filter((t) => t.status === "Blocked").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;
  return { total: tickets.length, open, inProgress, blocked, resolved };
}
