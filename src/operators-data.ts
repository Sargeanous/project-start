/* ------------------------------------------------------------------ *\
   Operator registry + configurable asset ownership models.

   Two hand-authored registers, client-side and fully deterministic
   (same pattern as advisor-data / lifecycle-data: no randomness, no
   wall clock in the demo values):

   1. operators: the screen-owning companies behind the estate. These
      are OPERATOR companies (media infrastructure firms plus ADMO and
      one municipal asset office), deliberately distinct from the
      advertiser / contract-holder names that appear on allocations
      (Abu Dhabi Duty Free, Yas Tourism, Retail Majlis, DCT Abu Dhabi).

   2. assetOwnershipRegister: one record per estate asset stating the
      ownership model, the owning company, the date the arrangement
      started, and (for a few assets) the transition history between
      models. Shown on the Commercial Map popover and register.

   Ownership changes are approval-gated: the UI never mutates these
   records. A "change ownership model" action raises a Commercial desk
   ticket and this module only tracks the session-scoped PENDING state
   so the button reflects the open proposal (tickets-data pattern:
   in-memory external store, resets on hard reload).
\* ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

export type OperatorKind = "Government" | "Private operator";

export interface OperatorCompany {
  id: string;
  /** English display name; also the translation key for t(). */
  name: string;
  /** Arabic display name, mirrored in the App translation record. */
  nameAr: string;
  kind: OperatorKind;
  /** Short positioning line for detail views. */
  focus: string;
}

export const operators: OperatorCompany[] = [
  { id: "OP-ADMO", name: "ADMO", nameAr: "مكتب أبوظبي الإعلامي", kind: "Government", focus: "Sovereign estate holder and platform operator" },
  { id: "OP-ALAM", name: "Al Ain City Media Assets", nameAr: "أصول الإعلام لمدينة العين", kind: "Government", focus: "Municipal screen structures in the Al Ain region" },
  { id: "OP-GVO", name: "Gulf Vision Outdoor", nameAr: "غلف فيجن للإعلان الخارجي", kind: "Private operator", focus: "Highway billboards and gantry structures" },
  { id: "OP-ETM", name: "Emirates Transit Media", nameAr: "الإمارات لإعلانات النقل", kind: "Private operator", focus: "Transit furniture and bus stop networks" },
  { id: "OP-LDS", name: "Liwa Digital Structures", nameAr: "ليوا للهياكل الرقمية", kind: "Private operator", focus: "Digital pylons and street unipoles" },
  { id: "OP-OMH", name: "Oasis Media Holdings", nameAr: "واحة الإعلام القابضة", kind: "Private operator", focus: "Mall facade and retail destination screens" },
  { id: "OP-AWI", name: "Al Wathba Media Infrastructure", nameAr: "الوثبة للبنية التحتية الإعلامية", kind: "Private operator", focus: "Industrial corridor and bridge structures" },
];

const operatorIndex = new Map(operators.map((op) => [op.id, op]));

export function operatorById(id: string): OperatorCompany | undefined {
  return operatorIndex.get(id);
}

export type OwnershipModel =
  | "Government-owned, rented to operator"
  | "Operator-owned"
  | "Under management contract";

export const OWNERSHIP_MODELS: OwnershipModel[] = [
  "Government-owned, rented to operator",
  "Operator-owned",
  "Under management contract",
];

/** Compact model labels for tight table cells. */
export const OWNERSHIP_MODEL_SHORT: Record<OwnershipModel, string> = {
  "Government-owned, rented to operator": "Government rental",
  "Operator-owned": "Operator-owned",
  "Under management contract": "Management contract",
};

/** One-line explanations for the change-model dialog options. */
export const OWNERSHIP_MODEL_HINTS: Record<OwnershipModel, string> = {
  "Government-owned, rented to operator": "The government owns the structure and rents it to an operator",
  "Operator-owned": "The operator owns the structure outright",
  "Under management contract": "A firm runs the site for a fee; ownership does not move",
};

export interface OwnershipTransition {
  from: OwnershipModel;
  to: OwnershipModel;
  /** Effective date, or the planned window for future transitions. */
  on: string;
  note: string;
  /** True when the transition is agreed but not yet effective. */
  planned?: boolean;
}

export interface AssetOwnership {
  assetId: string;
  model: OwnershipModel;
  /** The company that owns the structure. */
  ownerOperatorId: string;
  /** Renting operator (Government rental) or managing firm (management contract). */
  counterpartyId?: string;
  /** When the current arrangement took effect. */
  since: string;
  transitions?: OwnershipTransition[];
}

export const assetOwnershipRegister: AssetOwnership[] = [
  {
    assetId: "AD-HWY-001",
    model: "Government-owned, rented to operator",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-GVO",
    since: "2024-06-01",
    transitions: [
      {
        from: "Under management contract",
        to: "Government-owned, rented to operator",
        on: "2024-06-01",
        note: "Management contract converted to a rental concession at renewal; Gulf Vision Outdoor stayed on as renting operator.",
      },
    ],
  },
  {
    assetId: "AD-BRG-014",
    model: "Operator-owned",
    ownerOperatorId: "OP-AWI",
    since: "2022-08-09",
  },
  {
    assetId: "AD-BUS-022",
    model: "Operator-owned",
    ownerOperatorId: "OP-ETM",
    since: "2024-01-15",
    transitions: [
      {
        from: "Operator-owned",
        to: "Government-owned, rented to operator",
        on: "Q1 2027",
        note: "Transfer to the sovereign estate agreed at contract renewal; Emirates Transit Media stays as renting operator.",
        planned: true,
      },
    ],
  },
  {
    assetId: "AD-HWY-009",
    model: "Government-owned, rented to operator",
    ownerOperatorId: "OP-ALAM",
    counterpartyId: "OP-GVO",
    since: "2021-11-30",
  },
  {
    assetId: "AD-DWT-011",
    model: "Under management contract",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-OMH",
    since: "2023-06-20",
  },
  {
    assetId: "AD-CRN-003",
    model: "Government-owned, rented to operator",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-LDS",
    since: "2024-02-12",
  },
  {
    assetId: "AD-ARP-006",
    model: "Operator-owned",
    ownerOperatorId: "OP-GVO",
    since: "2025-04-01",
    transitions: [
      {
        from: "Government-owned, rented to operator",
        to: "Operator-owned",
        on: "2025-04-01",
        note: "Structure sold to Gulf Vision Outdoor under the asset-light program; media rights stay with ADMO.",
      },
    ],
  },
  {
    assetId: "AD-DWT-004",
    model: "Government-owned, rented to operator",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-LDS",
    since: "2024-04-22",
  },
  {
    assetId: "AD-DWT-021",
    model: "Under management contract",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-OMH",
    since: "2024-11-01",
    transitions: [
      {
        from: "Operator-owned",
        to: "Under management contract",
        on: "2024-11-01",
        note: "Bought back from the mall operator; Oasis Media Holdings retained to run the site for a management fee.",
      },
    ],
  },
  {
    assetId: "AD-YAS-005",
    model: "Operator-owned",
    ownerOperatorId: "OP-OMH",
    since: "2023-12-11",
  },
  {
    assetId: "AD-YAS-018",
    model: "Government-owned, rented to operator",
    ownerOperatorId: "OP-ADMO",
    counterpartyId: "OP-GVO",
    since: "2023-05-25",
  },
  {
    assetId: "AD-MSF-007",
    model: "Operator-owned",
    ownerOperatorId: "OP-AWI",
    since: "2022-07-14",
  },
  {
    assetId: "AD-ALN-002",
    model: "Under management contract",
    ownerOperatorId: "OP-ALAM",
    counterpartyId: "OP-ADMO",
    since: "2024-03-08",
  },
  {
    assetId: "AD-ALN-013",
    model: "Operator-owned",
    ownerOperatorId: "OP-OMH",
    since: "2025-01-20",
  },
];

const ownershipIndex = new Map(assetOwnershipRegister.map((record) => [record.assetId, record]));

export function assetOwnership(assetId: string): AssetOwnership | undefined {
  return ownershipIndex.get(assetId);
}

export function assetsOwnedBy(operatorId: string): AssetOwnership[] {
  return assetOwnershipRegister.filter((record) => record.ownerOperatorId === operatorId);
}

/* -------- Session-scoped pending ownership-change proposals -------- *\
   The approval-gated pattern: proposing a change creates a Commercial
   desk ticket (done by the caller via tickets-data createTicket) and
   registers the pending proposal here so the popover shows a Pending
   state instead of an instant switch. In-memory, resets on reload.
\* ------------------------------------------------------------------ */

export interface PendingOwnershipChange {
  assetId: string;
  toModel: OwnershipModel;
  ticketId: string;
  raisedBy: string;
}

let pendingChanges: Record<string, PendingOwnershipChange> = {};
const pendingListeners = new Set<() => void>();

function getPendingOwnershipChanges(): Record<string, PendingOwnershipChange> {
  return pendingChanges;
}

function subscribePending(fn: () => void): () => void {
  pendingListeners.add(fn);
  return () => pendingListeners.delete(fn);
}

export function usePendingOwnershipChanges(): Record<string, PendingOwnershipChange> {
  return useSyncExternalStore(subscribePending, getPendingOwnershipChanges, getPendingOwnershipChanges);
}

export function registerOwnershipProposal(change: PendingOwnershipChange) {
  pendingChanges = { ...pendingChanges, [change.assetId]: change };
  pendingListeners.forEach((fn) => fn());
}
