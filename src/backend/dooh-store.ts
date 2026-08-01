import { createHash } from "node:crypto";
import { assets as dataAssets, assetAllocations } from "../data";
import { distanceM, evaluateRules, type RuleContext, type RuleVerdict } from "../rules-engine";

type SubmissionStage = "Submitted" | "In review" | "Approved" | "Scheduled" | "Published" | "Changes requested";
type AlertState = "Check required" | "Checked" | "Approval required" | "Approved" | "Broadcast queued" | "Broadcasting" | "Live on network";

type Priority = "Low" | "Medium" | "High";
type CampaignStatus = "Draft" | "Bidding" | "Submitted" | "In review" | "Changes requested" | "Approved" | "Scheduled" | "Published";
type ScheduleState = "Playing" | "Queued" | "Scheduled";
type FinanceState = "Pending" | "Approved" | "On hold" | "Rejected";
type NotificationRecipient = "control-room" | "reviewer" | "finance" | "admin" | "technical" | "bidder";
type NotificationTone = "info" | "action" | "success" | "warning" | "critical";

// Content category drives the approval ceremony (RFP APP-008/009):
// routine -> one named approver; sensitive -> one senior named approver;
// high-impact -> dual-control (two distinct named approvers, MFA step-up).
export type SubmissionCategory = "routine" | "sensitive" | "high-impact";

export interface ApprovalSignature {
  name: string;
  role: string;
  at: string;
  mfa: boolean;
}

// One row per lifecycle event: the stage journal (RFP CLP-001 / APP-004).
export interface SubmissionJournalEntry {
  at: string;
  actor: string;
  role: string;
  stage: SubmissionStage;
  decision: string;
  reason?: string;
  contentHash: string;
  version: number;
  nextAssignee?: string;
  slaDueAt?: string;
  diff?: string[];
}

export interface Submission {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  owner: string;
  requestedStart: string;
  budget: string;
  priority: Priority;
  stage: SubmissionStage;
  creativeId: string;
  creativeUrl?: string;
  language: string;
  notes: string;
  version: number;
  contentHash: string;
  category: SubmissionCategory;
  journal: SubmissionJournalEntry[];
  approvals: ApprovalSignature[];
  pendingSecondApproval?: boolean;
}

export interface BidderCampaign {
  id: string;
  campaign: string;
  packageName: string;
  budget: string;
  status: CampaignStatus;
  reach: string;
  nextStep: string;
  revisionMessage?: string;
  revisionRequestedAt?: string;
  revisionFrom?: string;
}

export interface BidderCommunication {
  id: string;
  submissionId: string;
  campaign: string;
  bidder: string;
  from: string;
  message: string;
  sentAt: string;
  status: "Unread" | "Read";
}

export type AuctionLotStatus = "Open" | "Awarded" | "No fill";

export interface AuctionLot {
  id: string;
  lotName: string;
  packageName: string;
  network: string;
  flightWindow: string;
  impressions: string;
  floorPrice: number;
  currentBid: number;
  leadingBidder: string;
  minIncrement: number;
  bidCount: number;
  closesAt: string;
  creativeId: string;
  currency: string;
  status: AuctionLotStatus;
  clearingPrice?: number;
  awardedTo?: string;
  closedAt?: string;
  closeNote?: string;
}

// Commercial lifecycle per RFP FIN-202/402: award -> payment gate -> governed
// publishing handoff, with each booking tracked Booked -> Scheduled -> Played
// -> Billed -> Paid (or Released on payment failure).
export type BookingStatus = "Awaiting payment" | "Booked" | "Scheduled" | "Played" | "Billed" | "Paid" | "Released";

// Payment capture (FIN-401): how a confirmed payment was settled. Recorded on
// both the booking and its invoice so the finance ledger and the printable
// invoice agree.
export type PaymentMethod = "Bank transfer" | "Cheque" | "Corporate card";

export interface BookingRecord {
  id: string;
  lotId: string;
  lotName: string;
  packageName: string;
  campaign: string;
  bidder: string;
  amount: number;
  currency: string;
  status: BookingStatus;
  algorithm: string; // deterministic + documented per FIN-203
  awardedAt: string;
  updatedAt: string;
  invoiceId?: string;
  submissionId?: string;
  paymentRef?: string;
  paymentMethod?: PaymentMethod;
  payerEntity?: string;
  // Seeded settlement history rows (prior-quarter ledger); hidden from the
  // bidder's "my bookings" view, still counted in finance KPIs and reports.
  historySeed?: boolean;
  history: Array<{ status: BookingStatus | "Awarded"; at: string; actor: string; note?: string }>;
}

export type InvoiceStatus = "Issued" | "Paid" | "Void";

export interface InvoiceRecord {
  id: string;
  bookingId: string;
  campaign: string;
  bidder: string;
  net: number;
  vat: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string;
  receiptId?: string;
  voidReason?: string;
  paymentRef?: string;
  paymentMethod?: PaymentMethod;
  payerEntity?: string;
  historySeed?: boolean;
}

export interface BidRecord {
  id: string;
  lotId: string;
  lotName: string;
  campaign: string;
  bidder: string;
  amount: number;
  currency: string;
  submittedAt: string;
  status: "Leading" | "Outbid";
}

export interface ScheduleItem {
  id: string;
  time: string;
  asset: string;
  campaign: string;
  owner: string;
  state: ScheduleState;
  submissionId?: string;
}

// Proof-of-play ledger (Tech Spec 10.3 / RFP POP): one record per playback
// event, hash-chained so any tampering breaks verification.
export type PopKind = "commercial" | "civic" | "emergency";

export interface PopRecord {
  id: string;
  seq: number;
  assetId: string;
  campaign: string;
  creativeId: string;
  kind: PopKind;
  scheduledAt: string;
  playedAt: string;
  brightness: string;
  evidence: "TPM-signed (simulated)" | "Fallback";
  thumbnailRef: string;
  submissionId?: string;
  bookingId?: string;
  prevHash: string;
  hash: string;
}

export interface PublishedItem {
  id: string;
  campaign: string;
  asset: string;
  creativeId: string;
  started: string;
}

export type AlertScopeMode = "zone" | "citywide";

export interface EmergencyAlert {
  id: string;
  title: string;
  scope: string;
  authority: string;
  sla: string;
  audience: string;
  endTime: string;
  state: AlertState;
  criticality: "Critical" | "Major" | "Minor";
  // CAP-UAE fields (Tech Spec 10.7 / RFP NCM)
  identifier?: string;
  sender?: string;
  area?: string;
  severity?: "Extreme" | "Severe" | "Moderate" | "Minor";
  urgency?: "Immediate" | "Expected" | "Future";
  certainty?: "Observed" | "Likely" | "Possible";
  headline?: string;
  bodyEn?: string;
  bodyAr?: string;
  scopeMode?: AlertScopeMode;
  targetAssets?: string[];
  approvals?: ApprovalSignature[];
  ackBy?: string[];
  deadlineAt?: string; // preemption countdown target
  capIdentifier?: string;
}

export interface VerificationStep {
  label: string;
  owner: string;
  state: "Check required" | "Checked" | "Needs review";
}

export interface FinanceApproval {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  amount: string;
  margin: string;
  risk: "Low" | "Medium" | "Elevated";
  state: FinanceState;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  at: string;
}

export interface PlatformNotification {
  id: string;
  title: string;
  body: string;
  subject: string;
  recipients: NotificationRecipient[];
  page: string;
  tone: NotificationTone;
  createdAt: string;
  readBy: NotificationRecipient[];
}

export interface ServiceOrder {
  id: string;
  assetId: string;
  assetName: string;
  componentId: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Pending Assignment" | "Pending Execution" | "In Progress" | "Completed" | "Overdue";
  owner: string;
  due: string;
  summary: string;
  partsNeeded: string[];
  linkedPo: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  assetId: string;
  assetName: string;
  componentId: string;
  item: string;
  quantity: number;
  vendor: string;
  status: "Draft" | "Submitted" | "Confirmed" | "Received";
  eta: string;
  linkedServiceOrder?: string;
  createdAt: string;
}

export interface EnforcementEvent {
  id: string;
  at: string;
  kind: RuleContext["kind"];
  subject: string;
  outcome: "blocked" | "warned" | "overridden" | "cleared";
  reasonCodes: string[];
  firedRuleIds: string[];
  detail: string;
  actor: string;
}

export interface DoohState {
  submissions: Submission[];
  campaigns: BidderCampaign[];
  bidderMessages: BidderCommunication[];
  schedule: ScheduleItem[];
  published: PublishedItem[];
  auctions: AuctionLot[];
  bids: BidRecord[];
  bookings: BookingRecord[];
  invoices: InvoiceRecord[];
  popLedger: PopRecord[];
  enforcementEvents: EnforcementEvent[];
  killedAssetIds: string[];
  radiusBroadcasts: RadiusBroadcast[];
  alerts: EmergencyAlert[];
  verificationSteps: VerificationStep[];
  financeApprovals: FinanceApproval[];
  serviceOrders: ServiceOrder[];
  purchaseOrders: PurchaseOrder[];
  activity: ActivityItem[];
  notifications: PlatformNotification[];
}

export interface RadiusBroadcastScreen {
  assetId: string;
  name: string;
  zone: string;
  distanceM: number;
  status: "clear" | "flagged";
  flagLabel?: string;
  flagDetail?: string;
  /* Selection overlap: an existing commitment on this screen. */
  conflict?: string;
  conflictLevel?: "hard" | "soft";
}

export interface RadiusBroadcast {
  id: string;
  center: { lat: number; lng: number };
  centerLabel: string;
  radiusM: number;
  campaign: string;
  messageEn: string;
  messageAr: string;
  screens: RadiusBroadcastScreen[];
  clearCount: number;
  flaggedCount: number;
  status: "Pending approval" | "Approved and queued";
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  /* Marquee/Ctrl multi-select action reuses this record + approval flow. */
  mode?: "radius" | "selection";
  actionKind?: "display" | "schedule";
  scheduleWindow?: string;
  conflictCount?: number;
  overlapPolicy?: "exclude" | "override";
  creativeId?: string;
  creativeUrl?: string;
  visualSource?: string;
}

export interface BriefPayload {
  campaign: string;
  packageName: string;
  budget: string;
  creativeId: string;
  creativeUrl?: string;
  languages: string;
  startDate: string;
  endDate: string;
  priority: "Standard" | "High";
  objective: string;
  contactName: string;
  contactEmail: string;
  brand: string;
  vertical: string;
  audience: string;
  targetZones: string[];
  daypart: string;
  reach: string;
  compliance: { uaeMedia: boolean; arabicProof: boolean; rightsCleared: boolean; noPolitical: boolean };
  assets: Array<{ name: string; type: string; size: string; illustration: string }>;
}

export interface AlertDraft {
  title: string;
  scope: string;
  content: string;
  criticality: "Critical" | "Major" | "Minor";
  identifier?: string;
  sender?: string;
  area?: string;
  severity?: EmergencyAlert["severity"];
  urgency?: EmergencyAlert["urgency"];
  certainty?: EmergencyAlert["certainty"];
  headline?: string;
  bodyEn?: string;
  bodyAr?: string;
  scopeMode?: AlertScopeMode;
  targetAssets?: string[];
}

const initialVerificationSteps: VerificationStep[] = [
  { label: "Message payload", owner: "Policy engine", state: "Check required" },
  { label: "Arabic and English copy", owner: "Content reviewer", state: "Check required" },
  { label: "Authority approval", owner: "Duty officer", state: "Check required" },
  { label: "Edge cache route", owner: "CMS workflow", state: "Check required" },
];

// ---------------------------------------------------------------------------
// Seeded settlement history (FIN-402). Deterministic prior-quarter ledger so
// the Financials overview KPIs are computed from real records instead of
// hardcoded copy. Calibrated to the figures already shown to the client:
// booked revenue sums to AED 18.41M and open invoices to AED 3.12M at boot.
// Live session activity (close auction, confirm payment, settle) moves both.
// IDs use the 90x range so live records (BKG-909+, INV-909+) never collide.
// ---------------------------------------------------------------------------
const SEED_ALGORITHM = "First-price sealed ranking: highest valid bid >= floor wins, billed at own bid. Ties break on earliest bid time.";

function seedHistory(entries: Array<[BookingStatus | "Awarded", string, string]>): BookingRecord["history"] {
  return entries.map(([status, at, note]) => ({ status, at, actor: "ADMO Finance", note }));
}

const settledBookingSeeds: BookingRecord[] = [
  {
    id: "BKG-901", lotId: "LOT-4327", lotName: "Airport arrivals premium - Q2 flight", packageName: "Airport and premium roadside",
    campaign: "Etihad summer routes", bidder: "Etihad Airways", amount: 4120000, currency: "AED", status: "Paid",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-04-14T09:12:00.000Z", updatedAt: "2026-06-30T10:05:00.000Z",
    invoiceId: "INV-901", paymentRef: "TRF-2026-88231", paymentMethod: "Bank transfer", payerEntity: "Etihad Airways PJSC", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-04-14T09:12:00.000Z", "Awarded first-price at AED 4,120,000."],
      ["Booked", "2026-04-18T11:30:00.000Z", "Payment TRF-2026-88231 (Bank transfer) confirmed from Etihad Airways PJSC. Receipt RCT-901."],
      ["Paid", "2026-06-30T10:05:00.000Z", "Settlement closed against receipt RCT-901; revenue recognised."],
    ]),
  },
  {
    id: "BKG-902", lotId: "LOT-4331", lotName: "Yas leisure loop - spring season", packageName: "Yas leisure loop",
    campaign: "Yas theme parks season", bidder: "Yas Tourism", amount: 3650000, currency: "AED", status: "Paid",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-04-22T08:40:00.000Z", updatedAt: "2026-06-28T09:15:00.000Z",
    invoiceId: "INV-902", paymentRef: "TRF-2026-88962", paymentMethod: "Bank transfer", payerEntity: "Yas Tourism LLC", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-04-22T08:40:00.000Z", "Awarded first-price at AED 3,650,000."],
      ["Booked", "2026-04-27T13:05:00.000Z", "Payment TRF-2026-88962 (Bank transfer) confirmed from Yas Tourism LLC. Receipt RCT-902."],
      ["Paid", "2026-06-28T09:15:00.000Z", "Settlement closed against receipt RCT-902; revenue recognised."],
    ]),
  },
  {
    id: "BKG-903", lotId: "LOT-4298", lotName: "Downtown retail loop - Ramadan nights", packageName: "Downtown retail loop",
    campaign: "Downtown Ramadan retail", bidder: "Retail Majlis", amount: 2980000, currency: "AED", status: "Paid",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-02-10T10:20:00.000Z", updatedAt: "2026-05-12T14:45:00.000Z",
    invoiceId: "INV-903", paymentRef: "CHQ-004512", paymentMethod: "Cheque", payerEntity: "Retail Majlis Holding", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-02-10T10:20:00.000Z", "Awarded first-price at AED 2,980,000."],
      ["Booked", "2026-02-16T09:55:00.000Z", "Payment CHQ-004512 (Cheque) confirmed from Retail Majlis Holding. Receipt RCT-903."],
      ["Paid", "2026-05-12T14:45:00.000Z", "Settlement closed against receipt RCT-903; revenue recognised."],
    ]),
  },
  {
    id: "BKG-904", lotId: "LOT-4342", lotName: "Corniche gateway - May rotation", packageName: "Airport and premium roadside",
    campaign: "5G network summer push", bidder: "e& Telecom", amount: 2760000, currency: "AED", status: "Paid",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-05-03T07:50:00.000Z", updatedAt: "2026-07-02T12:00:00.000Z",
    invoiceId: "INV-904", paymentRef: "TRF-2026-90114", paymentMethod: "Bank transfer", payerEntity: "e& Telecom PJSC", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-05-03T07:50:00.000Z", "Awarded first-price at AED 2,760,000."],
      ["Booked", "2026-05-07T15:10:00.000Z", "Payment TRF-2026-90114 (Bank transfer) confirmed from e& Telecom PJSC. Receipt RCT-904."],
      ["Paid", "2026-07-02T12:00:00.000Z", "Settlement closed against receipt RCT-904; revenue recognised."],
    ]),
  },
  {
    id: "BKG-905", lotId: "LOT-4351", lotName: "Marina corridor - June weekends", packageName: "Downtown retail loop",
    campaign: "Marina mall anniversary", bidder: "Marina Retail Group", amount: 1910000, currency: "AED", status: "Billed",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-05-20T09:30:00.000Z", updatedAt: "2026-07-05T10:40:00.000Z",
    invoiceId: "INV-905", paymentRef: "TRF-2026-90881", paymentMethod: "Bank transfer", payerEntity: "Marina Retail Group LLC", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-05-20T09:30:00.000Z", "Awarded first-price at AED 1,910,000."],
      ["Booked", "2026-05-24T11:00:00.000Z", "Payment TRF-2026-90881 (Bank transfer) confirmed from Marina Retail Group LLC. Receipt RCT-905."],
      ["Billed", "2026-07-05T10:40:00.000Z", "Delivery reconciled against hash-chained PoP records; settlement close pending."],
    ]),
  },
  {
    id: "BKG-906", lotId: "LOT-4356", lotName: "Corniche promenade - evening loop", packageName: "Airport and premium roadside",
    campaign: "Corniche fitness season", bidder: "Active Abu Dhabi", amount: 2990000, currency: "AED", status: "Paid",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-06-01T08:05:00.000Z", updatedAt: "2026-07-10T09:25:00.000Z",
    invoiceId: "INV-906", paymentRef: "TRF-2026-91773", paymentMethod: "Bank transfer", payerEntity: "Active Abu Dhabi Events LLC", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-06-01T08:05:00.000Z", "Awarded first-price at AED 2,990,000."],
      ["Booked", "2026-06-04T10:15:00.000Z", "Payment TRF-2026-91773 (Bank transfer) confirmed from Active Abu Dhabi Events LLC. Receipt RCT-906."],
      ["Paid", "2026-07-10T09:25:00.000Z", "Settlement closed against receipt RCT-906; revenue recognised."],
    ]),
  },
  {
    id: "BKG-907", lotId: "LOT-4361", lotName: "Galleria island loop - weekend", packageName: "Downtown retail loop",
    campaign: "Galleria weekend footfall", bidder: "Retail Majlis", amount: 1880000, currency: "AED", status: "Awaiting payment",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-07-24T09:00:00.000Z", updatedAt: "2026-07-24T09:00:00.000Z",
    invoiceId: "INV-907", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-07-24T09:00:00.000Z", "Awarded first-price at AED 1,880,000."],
      ["Awaiting payment", "2026-07-24T09:00:00.000Z", "Scheduling access is granted only after payment confirmation (FIN-202)."],
    ]),
  },
  {
    id: "BKG-908", lotId: "LOT-4363", lotName: "Airport arrivals - late summer", packageName: "Airport and premium roadside",
    campaign: "Duty-free arrivals push", bidder: "Gulf Duty Free", amount: 1090000, currency: "AED", status: "Awaiting payment",
    algorithm: SEED_ALGORITHM, awardedAt: "2026-07-26T10:30:00.000Z", updatedAt: "2026-07-26T10:30:00.000Z",
    invoiceId: "INV-908", historySeed: true,
    history: seedHistory([
      ["Awarded", "2026-07-26T10:30:00.000Z", "Awarded first-price at AED 1,090,000."],
      ["Awaiting payment", "2026-07-26T10:30:00.000Z", "Scheduling access is granted only after payment confirmation (FIN-202)."],
    ]),
  },
];

const settledInvoiceSeeds: InvoiceRecord[] = [
  { id: "INV-901", bookingId: "BKG-901", campaign: "Etihad summer routes", bidder: "Etihad Airways", net: 4120000, vat: 206000, total: 4326000, currency: "AED", status: "Paid", issuedAt: "2026-04-14T09:12:00.000Z", paidAt: "2026-04-18T11:30:00.000Z", receiptId: "RCT-901", paymentRef: "TRF-2026-88231", paymentMethod: "Bank transfer", payerEntity: "Etihad Airways PJSC", historySeed: true },
  { id: "INV-902", bookingId: "BKG-902", campaign: "Yas theme parks season", bidder: "Yas Tourism", net: 3650000, vat: 182500, total: 3832500, currency: "AED", status: "Paid", issuedAt: "2026-04-22T08:40:00.000Z", paidAt: "2026-04-27T13:05:00.000Z", receiptId: "RCT-902", paymentRef: "TRF-2026-88962", paymentMethod: "Bank transfer", payerEntity: "Yas Tourism LLC", historySeed: true },
  { id: "INV-903", bookingId: "BKG-903", campaign: "Downtown Ramadan retail", bidder: "Retail Majlis", net: 2980000, vat: 149000, total: 3129000, currency: "AED", status: "Paid", issuedAt: "2026-02-10T10:20:00.000Z", paidAt: "2026-02-16T09:55:00.000Z", receiptId: "RCT-903", paymentRef: "CHQ-004512", paymentMethod: "Cheque", payerEntity: "Retail Majlis Holding", historySeed: true },
  { id: "INV-904", bookingId: "BKG-904", campaign: "5G network summer push", bidder: "e& Telecom", net: 2760000, vat: 138000, total: 2898000, currency: "AED", status: "Paid", issuedAt: "2026-05-03T07:50:00.000Z", paidAt: "2026-05-07T15:10:00.000Z", receiptId: "RCT-904", paymentRef: "TRF-2026-90114", paymentMethod: "Bank transfer", payerEntity: "e& Telecom PJSC", historySeed: true },
  { id: "INV-905", bookingId: "BKG-905", campaign: "Marina mall anniversary", bidder: "Marina Retail Group", net: 1910000, vat: 95500, total: 2005500, currency: "AED", status: "Paid", issuedAt: "2026-05-20T09:30:00.000Z", paidAt: "2026-05-24T11:00:00.000Z", receiptId: "RCT-905", paymentRef: "TRF-2026-90881", paymentMethod: "Bank transfer", payerEntity: "Marina Retail Group LLC", historySeed: true },
  { id: "INV-906", bookingId: "BKG-906", campaign: "Corniche fitness season", bidder: "Active Abu Dhabi", net: 2990000, vat: 149500, total: 3139500, currency: "AED", status: "Paid", issuedAt: "2026-06-01T08:05:00.000Z", paidAt: "2026-06-04T10:15:00.000Z", receiptId: "RCT-906", paymentRef: "TRF-2026-91773", paymentMethod: "Bank transfer", payerEntity: "Active Abu Dhabi Events LLC", historySeed: true },
  { id: "INV-907", bookingId: "BKG-907", campaign: "Galleria weekend footfall", bidder: "Retail Majlis", net: 1880000, vat: 94000, total: 1974000, currency: "AED", status: "Issued", issuedAt: "2026-07-24T09:00:00.000Z", historySeed: true },
  { id: "INV-908", bookingId: "BKG-908", campaign: "Duty-free arrivals push", bidder: "Gulf Duty Free", net: 1090000, vat: 54500, total: 1144500, currency: "AED", status: "Issued", issuedAt: "2026-07-26T10:30:00.000Z", historySeed: true },
];

const initialState: DoohState = {
  submissions: [
    {
      id: "SUB-1052",
      campaign: "Louvre summer exhibition",
      bidder: "Louvre Abu Dhabi",
      packageName: "Cultural district loop",
      owner: "Sara Al Mansouri",
      requestedStart: "Jul 18, 2026",
      budget: "AED 210,000",
      priority: "Medium",
      stage: "Submitted",
      creativeId: "saadiyat-beach",
      language: "Arabic and English",
      notes: "Museum exhibition flight targeting the cultural district and Corniche panels.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1051",
      campaign: "5G family bundle",
      bidder: "e& Telecom",
      packageName: "Downtown retail loop",
      owner: "Omar Rashed",
      requestedStart: "Jul 15, 2026",
      budget: "AED 340,000",
      priority: "High",
      stage: "In review",
      creativeId: "mall-footfall",
      language: "Arabic and English",
      notes: "Telecom bundle creative; CTA legibility under review for highway variants.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1050",
      campaign: "Eid family staycation",
      bidder: "Emirates Palace",
      packageName: "Leisure loop",
      owner: "Latifa Al Suwaidi",
      requestedStart: "Jul 25, 2026",
      budget: "AED 180,000",
      priority: "Low",
      stage: "Changes requested",
      creativeId: "eid-family-retail",
      language: "Arabic and English",
      notes: "Arabic copy revision requested; imagery approved by CMS review.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1049",
      campaign: "National reading month",
      bidder: "ADMO",
      packageName: "Civic bilingual pack",
      owner: "Khalid Al Marri",
      requestedStart: "Jul 10, 2026",
      budget: "Non-billed",
      priority: "Medium",
      stage: "Published",
      creativeId: "experience-abu-dhabi",
      language: "Arabic and English",
      notes: "Civic awareness rotation live across community panels.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1048",
      campaign: "Airport retail launch",
      bidder: "Advertiser",
      packageName: "Airport and premium roadside",
      owner: "Maya Haddad",
      requestedStart: "Jul 08, 2026",
      budget: "AED 420,000",
      priority: "Low",
      stage: "In review",
      creativeId: "etihad-retail",
      language: "Arabic and English",
      notes: "Airport retail creative with bilingual copy and weekend flight targeting.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1047",
      campaign: "Yas summer promotion",
      bidder: "Yas Tourism",
      packageName: "Leisure loop",
      owner: "Hamad Al Ketbi",
      requestedStart: "Jul 12, 2026",
      budget: "AED 285,000",
      priority: "Low",
      stage: "Approved",
      creativeId: "yas-tourism",
      language: "Arabic and English",
      notes: "Tourism campaign approved for Yas and airport routes.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1046",
      campaign: "Coastal road closure",
      bidder: "DMT",
      packageName: "Civic emergency lane",
      owner: "Noura Salem",
      requestedStart: "Today",
      budget: "Public notice",
      priority: "Medium",
      stage: "Scheduled",
      creativeId: "weather-alert",
      language: "Arabic first",
      notes: "Public notice scheduled after dual-control approval.",
      version: 1,
      contentHash: "",
      category: "sensitive",
      journal: [],
      approvals: [],
    },
    {
      id: "SUB-1045",
      campaign: "National observance takeover",
      bidder: "ADMO",
      packageName: "Full estate civic takeover",
      owner: "Khaled Mansoor",
      requestedStart: "Jul 18, 2026",
      budget: "Civic allocation",
      priority: "High",
      stage: "Submitted",
      creativeId: "holiday-notice",
      language: "Arabic and English",
      notes: "Awaiting cultural review and schedule lock.",
      version: 1,
      contentHash: "",
      category: "high-impact",
      journal: [],
      approvals: [],
    },
  ],
  campaigns: [
    {
      id: "CMP-221",
      campaign: "Airport retail launch",
      packageName: "Airport and premium roadside",
      budget: "AED 420,000",
      status: "In review",
      reach: "1.4M est.",
      nextStep: "ADMO content review",
    },
    {
      id: "CMP-219",
      campaign: "Weekend mall offer",
      packageName: "Downtown retail loop",
      budget: "AED 160,000",
      status: "Published",
      reach: "790k delivered",
      nextStep: "Proof-of-play reconciliation",
    },
  ],
  bidderMessages: [],
  schedule: [
    { id: "SCH-001", time: "08:00", asset: "AD-HWY-001", campaign: "Road safety rotation", owner: "ADMO", state: "Playing" },
    { id: "SCH-002", time: "09:30", asset: "AD-BUS-022", campaign: "Yas summer promotion", owner: "Yas Tourism", state: "Queued" },
    { id: "SCH-003", time: "11:00", asset: "AD-DWT-011", campaign: "Weekend mall offer", owner: "Retail Majlis", state: "Scheduled" },
    { id: "SCH-004", time: "14:00", asset: "AD-BRG-014", campaign: "Industrial safety notice", owner: "DMT", state: "Scheduled" },
  ],
  published: [
    { id: "PUB-001", campaign: "Road safety rotation", asset: "AD-HWY-001", creativeId: "road-safety", started: "08:00" },
    { id: "PUB-002", campaign: "Yas summer promotion", asset: "AD-BUS-022", creativeId: "yas-tourism", started: "09:30" },
    { id: "PUB-003", campaign: "Weekend mall offer", asset: "AD-DWT-011", creativeId: "mall-footfall", started: "11:00" },
    { id: "PUB-004", campaign: "Industrial safety notice", asset: "AD-BRG-014", creativeId: "industrial-notice", started: "14:00" },
  ],
  auctions: [
    {
      id: "LOT-4411",
      lotName: "Corniche prime - evening rotation",
      packageName: "Airport and premium roadside",
      network: "12 panels - Corniche, Airport Road",
      flightWindow: "Jul 20 - Aug 03, 2026",
      impressions: "1.4M weekly",
      floorPrice: 380000,
      currentBid: 442000,
      leadingBidder: "Yas Tourism",
      minIncrement: 5000,
      bidCount: 7,
      closesAt: "Jul 04, 2026 - 18:00",
      creativeId: "etihad-retail",
      currency: "AED",
      status: "Open",
    },
    {
      id: "LOT-4408",
      lotName: "Downtown retail loop - weekend",
      packageName: "Downtown retail loop",
      network: "18 mall and urban panels",
      flightWindow: "Jul 12 - Jul 26, 2026",
      impressions: "790k weekly",
      floorPrice: 150000,
      currentBid: 168500,
      leadingBidder: "Retail Majlis",
      minIncrement: 2500,
      bidCount: 4,
      closesAt: "Jul 03, 2026 - 12:00",
      creativeId: "mall-footfall",
      currency: "AED",
      status: "Open",
    },
    {
      id: "LOT-4402",
      lotName: "Yas leisure loop - summer flight",
      packageName: "Yas leisure loop",
      network: "9 panels - Yas Island and hotel corridor",
      flightWindow: "Jul 15 - Aug 15, 2026",
      impressions: "620k weekly",
      floorPrice: 210000,
      currentBid: 210000,
      leadingBidder: "No bids yet",
      minIncrement: 5000,
      bidCount: 0,
      closesAt: "Jul 05, 2026 - 20:00",
      creativeId: "yas-tourism",
      currency: "AED",
      status: "Open",
    },
  ],
  bids: [],
  bookings: [...settledBookingSeeds],
  invoices: [...settledInvoiceSeeds],
  enforcementEvents: [],
  killedAssetIds: [],
  radiusBroadcasts: [],
  popLedger: [],
  alerts: [
    {
      id: "ALT-901",
      title: "Weather alert broadcast",
      scope: "Al Ain and highway gateways",
      authority: "NCEMA",
      sla: "Display within 60s",
      audience: "Drivers and commuters",
      endTime: "Today 18:00",
      state: "Check required",
      criticality: "Critical",
    },
    {
      id: "ALT-884",
      title: "Road closure notice",
      scope: "Corniche westbound",
      authority: "DMT",
      sla: "Display within 5m",
      audience: "City traffic",
      endTime: "Jul 02, 08:00",
      state: "Approval required",
      criticality: "Major",
    },
  ],
  verificationSteps: initialVerificationSteps,
  financeApprovals: [
    {
      id: "FIN-1200",
      campaign: "Airport retail launch",
      bidder: "Advertiser",
      packageName: "Airport and premium roadside",
      amount: "AED 420,000",
      margin: "24%",
      risk: "Low",
      state: "Pending",
    },
  ],
  serviceOrders: [
    {
      id: "SO-8828",
      assetId: "AD-BRG-014",
      assetName: "Mussafah Bridge Banner",
      componentId: "C05R01",
      title: "Cooling fan stalled",
      severity: "High",
      status: "In Progress",
      owner: "Maintenance team",
      due: "Today 16:00",
      summary: "Thermal remediation visit active. Fan kit reserved from depot stock.",
      partsNeeded: ["Cooling fan kit", "Cabinet ventilation filter"],
      linkedPo: "PO-4484",
      createdAt: "2026-07-02T14:12:00.000Z",
    },
    {
      id: "SO-8837",
      assetId: "AD-AIN-052",
      assetName: "Al Ain Civic",
      componentId: "PSU-01",
      title: "Power supply replacement",
      severity: "Critical",
      status: "Pending Execution",
      owner: "Field dispatch",
      due: "Jul 05, 2026",
      summary: "Power supply and breaker replacement waiting for PO confirmation.",
      partsNeeded: ["Power supply", "Main breaker", "Surge protector"],
      linkedPo: "PO-4512",
      createdAt: "2026-07-01T09:20:00.000Z",
    },
  ],
  purchaseOrders: [
    {
      id: "PO-4484",
      assetId: "AD-BRG-014",
      assetName: "Mussafah Bridge Banner",
      componentId: "C05R01",
      item: "Cooling fan kit",
      quantity: 2,
      vendor: "NovaStar UAE distributor",
      status: "Confirmed",
      eta: "Jul 04, 2026",
      linkedServiceOrder: "SO-8828",
      createdAt: "2026-07-02T14:20:00.000Z",
    },
    {
      id: "PO-4520",
      assetId: "AD-BRG-014",
      assetName: "Mussafah Bridge Banner",
      componentId: "C05R01",
      item: "Cabinet ventilation filter",
      quantity: 6,
      vendor: "Abu Dhabi LED Parts",
      status: "Submitted",
      eta: "Jul 09, 2026",
      linkedServiceOrder: "SO-8828",
      createdAt: "2026-07-02T15:10:00.000Z",
    },
    {
      id: "PO-4512",
      assetId: "AD-AIN-052",
      assetName: "Al Ain Civic",
      componentId: "PSU-01",
      item: "Power supply",
      quantity: 1,
      vendor: "Delta power systems",
      status: "Submitted",
      eta: "Jul 15, 2026",
      linkedServiceOrder: "SO-8837",
      createdAt: "2026-07-01T09:35:00.000Z",
    },
  ],
  activity: [
    { id: "ACT-001", actor: "System", action: "Seeded demo state", subject: "DOOH platform", at: new Date().toISOString() },
  ],
  notifications: [
    {
      id: "NOT-001",
      title: "CMS review waiting",
      body: "Airport retail launch is ready for ADMO content review.",
      subject: "Airport retail launch",
      recipients: ["reviewer", "admin"],
      page: "cms",
      tone: "action",
      createdAt: new Date().toISOString(),
      readBy: [],
    },
    {
      id: "NOT-002",
      title: "Emergency checks required",
      body: "Weather alert broadcast must pass MediaGPT checks before queueing.",
      subject: "Weather alert broadcast",
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: "critical",
      createdAt: new Date().toISOString(),
      readBy: [],
    },
    {
      id: "NOT-003",
      title: "Finance approval pending",
      body: "Airport retail launch needs finance sign-off.",
      subject: "Airport retail launch",
      recipients: ["finance", "admin"],
      page: "financials",
      tone: "action",
      createdAt: new Date().toISOString(),
      readBy: [],
    },
  ],
};

declare global {
  // eslint-disable-next-line no-var
  var __doohBackendState: DoohState | undefined;
}

function cloneState(state: DoohState): DoohState {
  return JSON.parse(JSON.stringify(state)) as DoohState;
}

function cloneInitialState(): DoohState {
  return cloneState(initialState);
}

// Eval harnesses (promptfoo, QA scripts) exercise the real API, so their
// synthetic submissions would otherwise accumulate in the persisted demo
// state and flood the CMS list. They are swept when the state is first
// loaded from disk (so a running eval can still triage what it just
// created) and always hidden from the UI state payload.
const TEST_BIDDERS = new Set(["promptfoo", "Codex QA", "QA"]);
export function isRealSubmission(submission: Submission): boolean {
  if (TEST_BIDDERS.has(submission.bidder)) return false;
  return !/^(QA |Injection attempt|Test )/i.test(submission.campaign);
}

function normalizeSubmissions(persisted: Submission[], sweepTestData: boolean): Submission[] {
  const kept = (sweepTestData ? persisted.filter(isRealSubmission) : persisted).map(withGovernanceDefaults);
  const existingIds = new Set(kept.map((submission) => submission.id));
  const missingSeeds = cloneState(initialState).submissions.filter((submission) => !existingIds.has(submission.id));
  return [...missingSeeds, ...kept];
}

// Backfill the seeded settlement history into persisted states that predate
// it (idempotent: only ids that are missing are appended, after live records).
function withLedgerSeeds<T extends { id: string }>(existing: T[], seeds: T[]): T[] {
  const ids = new Set(existing.map((item) => item.id));
  const missing = seeds.filter((seed) => !ids.has(seed.id));
  return missing.length ? [...existing, ...(JSON.parse(JSON.stringify(missing)) as T[])] : existing;
}

function normalizeState(state: DoohState, opts?: { sweepTestData?: boolean }): DoohState {
  return {
    ...state,
    bidderMessages: state.bidderMessages ?? [],
    bookings: withLedgerSeeds(state.bookings ?? [], settledBookingSeeds),
    invoices: withLedgerSeeds(state.invoices ?? [], settledInvoiceSeeds),
    popLedger: state.popLedger ?? [],
    enforcementEvents: state.enforcementEvents ?? [],
    killedAssetIds: state.killedAssetIds ?? [],
    radiusBroadcasts: state.radiusBroadcasts ?? [],
    auctions: (state.auctions ?? []).map((lot) => ({ ...lot, status: lot.status ?? "Open" })),
    submissions: normalizeSubmissions(state.submissions ?? [], opts?.sweepTestData ?? false),
    serviceOrders: state.serviceOrders ?? cloneState(initialState).serviceOrders,
    purchaseOrders: state.purchaseOrders ?? cloneState(initialState).purchaseOrders,
    notifications: (state.notifications?.length ? state.notifications : cloneState(initialState).notifications).map((notification) => ({
      ...notification,
      readBy: notification.readBy ?? [],
    })),
    campaigns: state.campaigns.map((campaign) => ({ ...campaign })),
  };
}

function formatNow() {
  return new Date().toISOString();
}

function addActivity(state: DoohState, actor: string, action: string, subject: string) {
  state.activity = [
    {
      id: nextId("ACT", state.activity),
      actor,
      action,
      subject,
      at: formatNow(),
    },
    ...state.activity,
  ].slice(0, 80);
}

function addNotification(
  state: DoohState,
  notification: Omit<PlatformNotification, "id" | "createdAt" | "readBy">,
) {
  state.notifications = [
    {
      id: nextId("NOT", state.notifications ?? []),
      createdAt: formatNow(),
      readBy: [],
      ...notification,
    },
    ...(state.notifications ?? []),
  ].slice(0, 120);
}

function nextId(prefix: string, items: Array<{ id: string }>) {
  const highest = items.reduce((max, item) => {
    const numeric = Number.parseInt(item.id.replace(/\D/g, ""), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

function campaignStatusFromStage(stage: SubmissionStage): CampaignStatus {
  if (stage === "Changes requested") return "Changes requested";
  if (stage === "In review") return "In review";
  if (stage === "Approved") return "Approved";
  if (stage === "Scheduled") return "Scheduled";
  if (stage === "Published") return "Published";
  return "Submitted";
}

function campaignNextStep(stage: SubmissionStage) {
  if (stage === "Submitted") return "ADMO intake review";
  if (stage === "In review") return "Human moderation";
  if (stage === "Approved") return "Schedule slot selection";
  if (stage === "Scheduled") return "Awaiting publish";
  if (stage === "Published") return "Proof-of-play reconciliation";
  return "Bidder revision required";
}

async function readPersistedState(): Promise<DoohState | null> {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return null;
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), ".dooh-data", "state.json"), "utf8");
    return JSON.parse(raw) as DoohState;
  } catch {
    return null;
  }
}

async function writePersistedState(state: DoohState) {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return;
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), ".dooh-data");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch {
    // The app still runs in environments without filesystem persistence.
  }
}

export async function getState(): Promise<DoohState> {
  if (!globalThis.__doohBackendState) {
    globalThis.__doohBackendState = normalizeState((await readPersistedState()) ?? cloneInitialState(), { sweepTestData: true });
    await writePersistedState(globalThis.__doohBackendState);
  }
  globalThis.__doohBackendState = normalizeState(globalThis.__doohBackendState);
  return cloneState(globalThis.__doohBackendState);
}

async function commit(mutator: (state: DoohState) => void | Promise<void>): Promise<DoohState> {
  const state = await getState();
  await mutator(state);
  globalThis.__doohBackendState = cloneState(state);
  await writePersistedState(state);
  return cloneState(state);
}

export async function resetState(): Promise<DoohState> {
  const state = cloneInitialState();
  globalThis.__doohBackendState = cloneState(state);
  await writePersistedState(state);
  return cloneState(state);
}

export async function markNotificationRead(id: string, profileId: NotificationRecipient): Promise<DoohState> {
  return commit((draft) => {
    const notification = draft.notifications.find((item) => item.id === id);
    if (!notification) throw new Error("Notification not found");
    if (!notification.readBy.includes(profileId)) notification.readBy = [...notification.readBy, profileId];
  });
}

export async function markAllNotificationsRead(profileId: NotificationRecipient): Promise<DoohState> {
  return commit((draft) => {
    draft.notifications = draft.notifications.map((notification) =>
      notification.recipients.includes(profileId) && !notification.readBy.includes(profileId)
        ? { ...notification, readBy: [...notification.readBy, profileId] }
        : notification,
    );
  });
}

export async function createSubmission(payload: BriefPayload, actor: string): Promise<{ state: DoohState; submission: Submission }> {
  let created!: Submission;
  const state = await commit((draft) => {
    // Rules engine at booking (RFP SCH-003/005): category and zoning rules hard-block;
    // proximity is recorded as a warning here (bookings target broad zones, so
    // per-asset proximity is enforced at explicit targeting/scheduling instead).
    const verdict = evaluateRules({
      kind: "booking",
      zones: payload.targetZones,
      category: payload.vertical,
      daypart: payload.daypart,
      requesterTier: "Commercial",
    });
    recordEnforcement(draft, { kind: "booking", subject: payload.campaign.trim(), verdict, actor });
    const hardBlocks = verdict.hits.filter((hit) => !hit.reasonCode.startsWith("PROX_"));
    if (hardBlocks.length) {
      throw new Error(`Booking blocked by the rules engine: ${hardBlocks.map((hit) => `${hit.label} (${hit.reasonCode})`).join("; ")}`);
    }
    created = {
      id: nextId("SUB", draft.submissions),
      campaign: payload.campaign.trim(),
      bidder: actor || payload.brand || "Bidder",
      packageName: payload.packageName,
      owner: payload.contactName || actor || "Bidder account",
      requestedStart: payload.startDate || "Jul 15, 2026",
      budget: payload.budget,
      priority: payload.priority === "High" ? "High" : "Medium",
      stage: "Submitted",
      creativeId: payload.creativeId,
      creativeUrl: payload.creativeUrl,
      language: payload.languages,
      notes: payload.objective || "Submitted from the bidder workspace and waiting for ADMO CMS review.",
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    };
    created.category = inferSubmissionCategory(created.packageName);
    created.contentHash = submissionContentHash(created);
    created = withGovernanceDefaults(created);
    draft.submissions = [created, ...draft.submissions];
    draft.campaigns = [
      {
        id: nextId("CMP", draft.campaigns),
        campaign: created.campaign,
        packageName: created.packageName,
        budget: created.budget,
        status: "Submitted",
        reach: payload.reach || "Pending ADMO estimate",
        nextStep: "ADMO content review",
      },
      ...draft.campaigns.filter((campaign) => campaign.campaign !== created.campaign),
    ];
    draft.financeApprovals = [
      {
        id: nextId("FIN", draft.financeApprovals),
        campaign: created.campaign,
        bidder: created.bidder,
        packageName: created.packageName,
        amount: created.budget,
        margin: "Model pending",
        risk: created.priority === "High" ? "Elevated" : "Medium",
        state: "Pending",
      },
      ...draft.financeApprovals,
    ];
    addNotification(draft, {
      title: "New CMS submission",
      body: `${created.campaign} from ${created.bidder} is ready for content review.`,
      subject: created.campaign,
      recipients: ["reviewer", "admin"],
      page: "cms",
      tone: "action",
    });
    addNotification(draft, {
      title: "Finance approval pending",
      body: `${created.campaign} needs finance sign-off for ${created.budget}.`,
      subject: created.campaign,
      recipients: ["finance", "admin"],
      page: "financials",
      tone: "action",
    });
    addNotification(draft, {
      title: "Campaign submitted",
      body: `${created.campaign} was submitted to ADMO CMS.`,
      subject: created.campaign,
      recipients: ["bidder"],
      page: "campaigns",
      tone: "info",
    });
    addActivity(draft, actor, "Submitted campaign brief", created.campaign);
  });
  return { state, submission: created };
}

export async function placeBid(payload: { lotId: string; amount: number; campaign: string }, actor: string): Promise<{ state: DoohState; bid: BidRecord }> {
  let bid!: BidRecord;
  const state = await commit((draft) => {
    const lot = draft.auctions.find((item) => item.id === payload.lotId);
    if (!lot) throw new Error("Auction lot not found");
    const minNext = lot.currentBid + lot.minIncrement;
    if (!Number.isFinite(payload.amount) || payload.amount < minNext) {
      throw new Error(`Minimum bid is ${lot.currency} ${minNext}`);
    }

    draft.bids = draft.bids.map((item) => (item.lotId === lot.id && item.status === "Leading" ? { ...item, status: "Outbid" } : item));
    lot.currentBid = payload.amount;
    lot.leadingBidder = actor || "Bidder";
    lot.bidCount += 1;
    bid = {
      id: nextId("BID", draft.bids),
      lotId: lot.id,
      lotName: lot.lotName,
      campaign: payload.campaign.trim() || `Bid on ${lot.lotName}`,
      bidder: actor || "Bidder",
      amount: payload.amount,
      currency: lot.currency,
      submittedAt: formatNow(),
      status: "Leading",
    };
    draft.bids = [bid, ...draft.bids];
    draft.campaigns = [
      {
        id: nextId("CMP", draft.campaigns),
        campaign: bid.campaign,
        packageName: lot.packageName,
        budget: `${lot.currency} ${payload.amount.toLocaleString("en-US")}`,
        status: "Bidding",
        reach: lot.impressions,
        nextStep: `Auction closes ${lot.closesAt}`,
      },
      ...draft.campaigns.filter((campaign) => !(campaign.campaign === bid.campaign && campaign.status === "Bidding")),
    ];
    draft.financeApprovals = [
      {
        id: nextId("FIN", draft.financeApprovals),
        campaign: bid.campaign,
        bidder: bid.bidder,
        packageName: lot.packageName,
        amount: `${lot.currency} ${payload.amount.toLocaleString("en-US")}`,
        margin: "Auction",
        risk: "Medium",
        state: "Pending",
      },
      ...draft.financeApprovals,
    ];
    addNotification(draft, {
      title: "Auction bid submitted",
      body: `${bid.bidder} placed ${bid.currency} ${bid.amount.toLocaleString("en-US")} on ${lot.lotName}.`,
      subject: bid.campaign,
      recipients: ["finance", "admin"],
      page: "financials",
      tone: "action",
    });
    addNotification(draft, {
      title: "Bid recorded",
      body: `${bid.campaign} is now leading on ${lot.lotName}.`,
      subject: bid.campaign,
      recipients: ["bidder"],
      page: "campaigns",
      tone: "success",
    });
    addActivity(draft, actor, "Placed bid", lot.lotName);
  });
  return { state, bid };
}

/* ---- Loop slot sales (slot-based selling granularity) ---- */

export interface LoopSlotSalePayload {
  assetId: string;
  assetName?: string;
  /** Daypart band name from the audience-data vocabulary. */
  daypart: string;
  /** 1-based slot position in the 16-slot loop. */
  slotIndex: number;
  advertiser: string;
  campaign: string;
  priceWeekAed: number;
}

/**
 * Sell one loop slot (16 x 8s loop per daypart). The sale enters the SAME
 * governed money chain as campaign submissions and auction bids: it raises a
 * pending FinanceApproval that finance decides on the Financials approvals
 * queue (decideFinanceApproval), with the usual notifications and audit
 * activity. Invoicing follows finance sign-off exactly as it does for the
 * other booking paths; nothing here bypasses that gate.
 */
export async function sellLoopSlot(payload: LoopSlotSalePayload, actor: string): Promise<{ state: DoohState; approval: FinanceApproval }> {
  let approval!: FinanceApproval;
  const state = await commit((draft) => {
    const assetId = payload.assetId.trim();
    const daypart = payload.daypart.trim();
    const advertiser = payload.advertiser.trim();
    if (!assetId || !daypart || !advertiser) throw new Error("Asset, daypart and advertiser are required");
    if (!Number.isInteger(payload.slotIndex) || payload.slotIndex < 1 || payload.slotIndex > 16) {
      throw new Error("Slot index must be between 1 and 16");
    }
    const packageName = `Loop slot ${payload.slotIndex}/16 | ${daypart} | ${assetId}`;
    if (draft.financeApprovals.some((item) => item.packageName === packageName && item.state === "Pending")) {
      throw new Error(`${packageName} already has a pending finance approval`);
    }
    const campaign = payload.campaign.trim() || `${advertiser} slot buy`;
    const price = Number.isFinite(payload.priceWeekAed) && payload.priceWeekAed > 0 ? Math.round(payload.priceWeekAed) : 0;
    approval = {
      id: nextId("FIN", draft.financeApprovals),
      campaign,
      bidder: advertiser,
      packageName,
      amount: price ? `AED ${price.toLocaleString("en-US")} / week` : "Rate card pending",
      margin: "Rate card",
      risk: "Low",
      state: "Pending",
    };
    draft.financeApprovals = [approval, ...draft.financeApprovals];
    addNotification(draft, {
      title: "Loop slot sale pending approval",
      body: `${advertiser} reserved slot ${payload.slotIndex} of 16 (${daypart}) on ${payload.assetName || assetId} at ${approval.amount}. Finance sign-off required before invoicing.`,
      subject: campaign,
      recipients: ["finance", "admin"],
      page: "financials",
      tone: "action",
    });
    addActivity(draft, actor, "Reserved loop slot for sale", `${assetId} ${daypart} slot ${payload.slotIndex}`);
  });
  return { state, approval };
}

/* ---- Submission governance: content hash, journal, named approvers ---- */

// Hash only the stable content fields (never stage/version), so the hash
// identifies WHAT was approved and changes only when the content changes.
export function submissionContentHash(submission: Pick<Submission, "campaign" | "packageName" | "creativeId" | "language" | "notes" | "budget">): string {
  const payload = [submission.campaign, submission.packageName, submission.creativeId, submission.language, submission.notes, submission.budget].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function inferSubmissionCategory(packageName: string): SubmissionCategory {
  const name = packageName.toLowerCase();
  if (name.includes("takeover") || name.includes("estate")) return "high-impact";
  if (name.includes("civic") || name.includes("emergency")) return "sensitive";
  return "routine";
}

// Named-approver registry per content category (RFP APP-008). Appointments
// are demo-seeded; in production these come from the tenant admin workflow.
export interface NamedApprover {
  name: string;
  role: string;
  canApprove: SubmissionCategory[];
}

export const namedApprovers: NamedApprover[] = [
  { name: "Maya Haddad", role: "reviewer", canApprove: ["routine", "sensitive"] },
  { name: "Noura Salem", role: "reviewer", canApprove: ["routine", "sensitive"] },
  { name: "Hamad Al Ketbi", role: "reviewer", canApprove: ["routine"] },
  { name: "Khaled Nasser", role: "control-room", canApprove: ["sensitive", "high-impact"] },
  { name: "Sara Al Mansoori", role: "admin", canApprove: ["routine", "sensitive", "high-impact"] },
  { name: "Khaled Mansoor", role: "admin", canApprove: ["high-impact"] },
];

const SLA_HOURS: Record<SubmissionCategory, number> = { routine: 24, sensitive: 12, "high-impact": 4 };

function slaDueFrom(category: SubmissionCategory): string {
  return new Date(Date.now() + SLA_HOURS[category] * 3_600_000).toISOString();
}

function appendJournal(
  submission: Submission,
  entry: { actor: string; role: string; decision: string; reason?: string; nextAssignee?: string; diff?: string[]; sla?: boolean },
): void {
  submission.journal = [
    ...submission.journal,
    {
      at: formatNow(),
      actor: entry.actor,
      role: entry.role,
      stage: submission.stage,
      decision: entry.decision,
      reason: entry.reason,
      contentHash: submission.contentHash,
      version: submission.version,
      nextAssignee: entry.nextAssignee,
      slaDueAt: entry.sla ? slaDueFrom(submission.category) : undefined,
      diff: entry.diff,
    },
  ];
}

function withGovernanceDefaults(submission: Submission): Submission {
  const category = submission.category || inferSubmissionCategory(submission.packageName);
  const contentHash = submission.contentHash || submissionContentHash(submission);
  return {
    ...submission,
    version: submission.version ?? 1,
    contentHash,
    category,
    approvals: submission.approvals ?? [],
    journal: submission.journal?.length
      ? submission.journal
      : [{
          at: formatNow(),
          actor: submission.bidder,
          role: "bidder",
          stage: submission.stage,
          decision: "Submitted",
          contentHash,
          version: submission.version ?? 1,
          nextAssignee: submission.owner,
          slaDueAt: slaDueFrom(category),
        }],
  };
}

/* ---- Rules engine enforcement (RFP SCH-003..006) ---- */

function recordEnforcement(
  draft: DoohState,
  entry: { kind: RuleContext["kind"]; subject: string; verdict: RuleVerdict; actor: string },
): void {
  const overridden = entry.verdict.warnings.some((hit) => hit.overriddenBy);
  const outcome: EnforcementEvent["outcome"] = entry.verdict.blocked
    ? "blocked"
    : overridden
      ? "overridden"
      : entry.verdict.warnings.length
        ? "warned"
        : "cleared";
  if (outcome === "cleared") return; // only log non-trivial evaluations
  draft.enforcementEvents = [
    {
      id: nextId("ENF", draft.enforcementEvents),
      at: formatNow(),
      kind: entry.kind,
      subject: entry.subject,
      outcome,
      reasonCodes: entry.verdict.reasonCodes,
      firedRuleIds: entry.verdict.firedRuleIds,
      detail: [...entry.verdict.hits, ...entry.verdict.warnings].map((hit) => `${hit.label}: ${hit.detail}${hit.overriddenBy ? ` (overridden by ${hit.overriddenBy})` : ""}`).join(" | "),
      actor: entry.actor,
    },
    ...draft.enforcementEvents,
  ].slice(0, 60);
}

// Public stateless evaluation for the RulesPage simulator (no state write).
export async function evaluateRulesPreview(context: RuleContext): Promise<RuleVerdict> {
  return evaluateRules(context);
}

/* ---- Proof-of-play hash chain (Tech Spec 10.3) ---- */

// Canonical payload: hashed fields are explicit so verification recomputes
// exactly what was signed, independent of record key order.
function popPayload(record: Omit<PopRecord, "hash">) {
  return [record.prevHash, record.id, record.seq, record.assetId, record.campaign, record.creativeId, record.kind, record.scheduledAt, record.playedAt].join("|");
}

function appendPopRecord(
  draft: DoohState,
  entry: { assetId: string; campaign: string; creativeId: string; kind: PopKind; scheduledAt: string; submissionId?: string; bookingId?: string },
): PopRecord {
  const prevHash = draft.popLedger.length ? draft.popLedger[draft.popLedger.length - 1].hash : "GENESIS";
  const base: Omit<PopRecord, "hash"> = {
    id: nextId("POP", draft.popLedger),
    seq: draft.popLedger.length + 1,
    assetId: entry.assetId,
    campaign: entry.campaign,
    creativeId: entry.creativeId,
    kind: entry.kind,
    scheduledAt: entry.scheduledAt,
    playedAt: formatNow(),
    brightness: "Auto day profile",
    evidence: "TPM-signed (simulated)",
    thumbnailRef: entry.creativeId,
    submissionId: entry.submissionId,
    bookingId: entry.bookingId,
    prevHash,
  };
  const record: PopRecord = { ...base, hash: createHash("sha256").update(popPayload(base)).digest("hex") };
  draft.popLedger = [...draft.popLedger, record];
  return record;
}

function verifyLedger(ledger: PopRecord[]): { valid: boolean; length: number; brokenAt: string | null } {
  let prevHash = "GENESIS";
  for (const record of ledger) {
    if (record.prevHash !== prevHash) return { valid: false, length: ledger.length, brokenAt: record.id };
    const recomputed = createHash("sha256").update(popPayload(record)).digest("hex");
    if (recomputed !== record.hash) return { valid: false, length: ledger.length, brokenAt: record.id };
    prevHash = record.hash;
  }
  return { valid: true, length: ledger.length, brokenAt: null };
}

export async function verifyPopChain(): Promise<{ valid: boolean; length: number; brokenAt: string | null; verifiedAt: string }> {
  const state = await getState();
  return { ...verifyLedger(state.popLedger), verifiedAt: formatNow() };
}

/**
 * Reconciliation (RFP FIN-402/404): "bill" verifies delivery against the
 * hash-chained PoP ledger and moves a Played booking to Billed; "settle"
 * closes the settlement and moves it to Paid.
 */
export async function reconcileBooking(payload: { bookingId: string; step: "bill" | "settle" }, actor: string): Promise<{ state: DoohState; booking: BookingRecord }> {
  let booking!: BookingRecord;
  const state = await commit((draft) => {
    const target = draft.bookings.find((item) => item.id === payload.bookingId);
    if (!target) throw new Error("Booking not found");
    const now = formatNow();

    if (payload.step === "bill") {
      if (target.status !== "Played") throw new Error(`Booking ${target.id} is ${target.status}; reconciliation requires Played`);
      const plays = draft.popLedger.filter((record) => record.bookingId === target.id);
      const chain = verifyLedger(draft.popLedger);
      if (!chain.valid) throw new Error(`PoP chain verification failed at ${chain.brokenAt}; reconciliation blocked`);
      target.status = "Billed";
      target.updatedAt = now;
      target.history = [...target.history, { status: "Billed", at: now, actor, note: `Delivery reconciled against ${plays.length} hash-chained PoP record(s); chain verified (${chain.length} entries).` }];
      addNotification(draft, {
        title: "Delivery reconciled",
        body: `${target.campaign}: ${plays.length} signed playback record(s) verified against invoice ${target.invoiceId ?? ""}.`,
        subject: target.campaign,
        recipients: ["finance", "bidder", "admin"],
        page: "financials",
        tone: "info",
      });
      addActivity(draft, actor, "Reconciled booking against PoP", target.campaign);
    } else {
      if (target.status !== "Billed") throw new Error(`Booking ${target.id} is ${target.status}; settlement requires Billed`);
      const invoice = draft.invoices.find((item) => item.id === target.invoiceId);
      target.status = "Paid";
      target.updatedAt = now;
      target.history = [...target.history, { status: "Paid", at: now, actor, note: `Settlement closed${invoice?.receiptId ? ` against receipt ${invoice.receiptId}` : ""}; revenue recognised.` }];
      addNotification(draft, {
        title: "Settlement closed",
        body: `${target.campaign}: booking ${target.id} fully settled and revenue recognised.`,
        subject: target.campaign,
        recipients: ["finance", "bidder", "admin"],
        page: "financials",
        tone: "success",
      });
      addActivity(draft, actor, "Closed settlement", target.campaign);
    }
    booking = { ...target };
  });
  return { state, booking };
}

/**
 * Close an auction lot (RFP FIN-202/203). Deterministic first-price award per
 * Technology Specification 10.6.2: the highest valid bid at or above the floor
 * wins and is billed at its own bid. No valid bid -> "No fill" and the slot
 * returns to the pool (no dark screen; operator/city content backfills).
 */
export async function closeAuction(payload: { lotId: string }, actor: string): Promise<{ state: DoohState; lot: AuctionLot; booking: BookingRecord | null }> {
  let lot!: AuctionLot;
  let booking: BookingRecord | null = null;
  const state = await commit((draft) => {
    const target = draft.auctions.find((item) => item.id === payload.lotId);
    if (!target) throw new Error("Auction lot not found");
    if (target.status !== "Open") throw new Error(`Auction ${target.id} is already ${target.status}`);
    const now = formatNow();
    target.closedAt = now;

    const recorded = draft.bids.find((item) => item.lotId === target.id && item.status === "Leading");
    // Seeded lots carry a leading bid without a BidRecord; treat that state as the standing bid.
    const leading = recorded
      ?? (target.bidCount > 0 && target.leadingBidder && target.currentBid > 0
        ? { campaign: `${target.leadingBidder} - ${target.lotName}`, bidder: target.leadingBidder, amount: target.currentBid }
        : undefined);
    const valid = leading && leading.amount >= target.floorPrice;

    if (!valid) {
      target.status = "No fill";
      target.closeNote = leading
        ? `Leading bid ${target.currency} ${leading.amount.toLocaleString("en-US")} is below the floor ${target.currency} ${target.floorPrice.toLocaleString("en-US")}. Slot returned to pool; operator/city content backfills (no dark screen).`
        : "No bids received. Slot returned to pool; operator/city content backfills (no dark screen).";
      addNotification(draft, {
        title: "Auction closed with no fill",
        body: `${target.lotName}: ${target.closeNote}`,
        subject: target.lotName,
        recipients: ["finance", "admin"],
        page: "financials",
        tone: "warning",
      });
      addActivity(draft, actor, "Closed auction (no fill)", target.lotName);
      lot = { ...target };
      return;
    }

    // First-price award: winner pays their own bid (deterministic, documented).
    target.status = "Awarded";
    target.clearingPrice = leading.amount;
    target.awardedTo = leading.bidder;
    target.closeNote = `Awarded first-price to ${leading.bidder} at ${target.currency} ${leading.amount.toLocaleString("en-US")} (floor ${target.currency} ${target.floorPrice.toLocaleString("en-US")}, ${target.bidCount} bids).`;

    const created: BookingRecord = {
      id: nextId("BKG", draft.bookings),
      lotId: target.id,
      lotName: target.lotName,
      packageName: target.packageName,
      campaign: leading.campaign,
      bidder: leading.bidder,
      amount: leading.amount,
      currency: target.currency,
      status: "Awaiting payment",
      algorithm: "First-price sealed ranking: highest valid bid >= floor wins, billed at own bid. Ties break on earliest bid time.",
      awardedAt: now,
      updatedAt: now,
      history: [
        { status: "Awarded", at: now, actor, note: target.closeNote },
        { status: "Awaiting payment", at: now, actor, note: "Scheduling access is granted only after payment confirmation (FIN-202)." },
      ],
    };
    const invoice: InvoiceRecord = {
      id: nextId("INV", draft.invoices),
      bookingId: created.id,
      campaign: leading.campaign,
      bidder: leading.bidder,
      net: leading.amount,
      vat: Math.round(leading.amount * 0.05),
      total: Math.round(leading.amount * 1.05),
      currency: target.currency,
      status: "Issued",
      issuedAt: now,
    };
    created.invoiceId = invoice.id;
    draft.bookings = [created, ...draft.bookings];
    draft.invoices = [invoice, ...draft.invoices];
    booking = created;

    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === leading.campaign
        ? { ...campaign, nextStep: `Won at ${target.currency} ${leading.amount.toLocaleString("en-US")}. Pay invoice ${invoice.id} to unlock scheduling.` }
        : campaign,
    );
    addNotification(draft, {
      title: "Auction won - payment required",
      body: `${leading.bidder} won ${target.lotName} at ${target.currency} ${leading.amount.toLocaleString("en-US")}. Invoice ${invoice.id} issued; scheduling unlocks after payment.`,
      subject: leading.campaign,
      recipients: ["bidder", "finance", "admin"],
      page: "financials",
      tone: "action",
    });
    addActivity(draft, actor, "Closed auction (awarded)", target.lotName);
    lot = { ...target };
  });
  return { state, lot, booking };
}

// Deterministic fallback reference when the capture modal sends none (older
// clients, API callers): derived from the booking identity, never the clock.
function fallbackPaymentRef(booking: BookingRecord): string {
  let h = 0;
  const seed = `${booking.id}|${booking.bidder}|${booking.amount}`;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `PAY-${booking.id.replace(/\D/g, "")}-${String(h % 100000).padStart(5, "0")}`;
}

const PAYMENT_METHODS: PaymentMethod[] = ["Bank transfer", "Cheque", "Corporate card"];

/**
 * Payment confirmation gate (RFP FIN-202/401/402). Success books the slot,
 * marks the invoice paid with a receipt plus the captured payment details
 * (method, reference, payer entity), and hands the winning creative into
 * the governed CMS pipeline (no auction win skips content governance, FIN-502).
 * Failure voids the invoice and releases the slot back to the pool.
 * The capture fields are optional so pre-existing callers keep working.
 */
export async function confirmBookingPayment(payload: { bookingId: string; outcome: "paid" | "failed"; method?: PaymentMethod; reference?: string; payerEntity?: string }, actor: string): Promise<{ state: DoohState; booking: BookingRecord }> {
  let booking!: BookingRecord;
  const state = await commit((draft) => {
    const target = draft.bookings.find((item) => item.id === payload.bookingId);
    if (!target) throw new Error("Booking not found");
    if (target.status !== "Awaiting payment") throw new Error(`Booking ${target.id} is ${target.status}, not awaiting payment`);
    const now = formatNow();
    const invoice = draft.invoices.find((item) => item.id === target.invoiceId);
    const lot = draft.auctions.find((item) => item.id === target.lotId);
    target.updatedAt = now;

    if (payload.outcome === "failed") {
      target.status = "Released";
      target.history = [...target.history, { status: "Released", at: now, actor, note: "Payment failed. Slot released automatically (FIN-202)." }];
      if (invoice) {
        invoice.status = "Void";
        invoice.voidReason = "Payment failed; booking released";
      }
      if (lot) {
        lot.status = "Open";
        lot.closeNote = `Relisted after payment failure by ${target.bidder}.`;
        lot.clearingPrice = undefined;
        lot.awardedTo = undefined;
      }
      addNotification(draft, {
        title: "Payment failed - slot released",
        body: `${target.campaign}: payment for ${target.lotName} failed. Invoice ${invoice?.id ?? ""} voided and the slot returned to auction.`,
        subject: target.campaign,
        recipients: ["bidder", "finance", "admin"],
        page: "financials",
        tone: "warning",
      });
      addActivity(draft, actor, "Released booking (payment failed)", target.lotName);
      booking = { ...target };
      return;
    }

    const method: PaymentMethod = payload.method && PAYMENT_METHODS.includes(payload.method) ? payload.method : "Bank transfer";
    const reference = payload.reference?.trim() || fallbackPaymentRef(target);
    const payerEntity = payload.payerEntity?.trim() || target.bidder;
    target.status = "Booked";
    target.paymentRef = reference;
    target.paymentMethod = method;
    target.payerEntity = payerEntity;
    if (invoice) {
      invoice.status = "Paid";
      invoice.paidAt = now;
      invoice.receiptId = `RCT-${invoice.id.replace("INV-", "")}`;
      invoice.paymentRef = reference;
      invoice.paymentMethod = method;
      invoice.payerEntity = payerEntity;
    }

    // Governed publishing handoff: the winning creative enters the CMS pipeline
    // as a normal submission and must pass AI screening + human moderation.
    const submission: Submission = {
      id: nextId("SUB", draft.submissions),
      campaign: target.campaign,
      bidder: target.bidder,
      packageName: target.packageName,
      owner: "ADMO CMS",
      requestedStart: lot?.flightWindow ?? "Next window",
      budget: `${target.currency} ${target.amount.toLocaleString("en-US")}`,
      priority: "High",
      stage: "Submitted",
      creativeId: lot?.creativeId ?? "etihad-retail",
      language: "Arabic + English",
      notes: `Auction win handoff: ${target.lotName} awarded first-price at ${target.currency} ${target.amount.toLocaleString("en-US")} (booking ${target.id}, invoice ${target.invoiceId}). Entered the governed pipeline; scheduling requires content approval.`,
      version: 1,
      contentHash: "",
      category: "routine",
      journal: [],
      approvals: [],
    };
    submission.category = inferSubmissionCategory(submission.packageName);
    submission.contentHash = submissionContentHash(submission);
    Object.assign(submission, withGovernanceDefaults(submission));
    draft.submissions = [submission, ...draft.submissions];
    target.submissionId = submission.id;
    target.history = [
      ...target.history,
      { status: "Booked", at: now, actor, note: `Payment ${reference} (${method}) confirmed from ${payerEntity}. Receipt ${invoice?.receiptId ?? ""}. Creative handed to CMS as ${submission.id}.` },
    ];
    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === target.campaign
        ? { ...campaign, status: "Submitted", nextStep: `Creative in governed review as ${submission.id}` }
        : campaign,
    );
    addNotification(draft, {
      title: "Booking confirmed - creative in review",
      body: `${target.campaign} paid ${target.currency} ${target.amount.toLocaleString("en-US")} for ${target.lotName}. Creative entered the governed pipeline as ${submission.id}.`,
      subject: target.campaign,
      recipients: ["bidder", "finance", "reviewer", "admin"],
      page: "cms",
      tone: "success",
    });
    addActivity(draft, actor, "Confirmed booking payment", target.lotName);
    booking = { ...target };
  });
  return { state, booking };
}

const SUBMISSION_STAGES: SubmissionStage[] = ["Submitted", "In review", "Approved", "Scheduled", "Published", "Changes requested"];

export async function updateSubmissionStage(id: string, stage: SubmissionStage, actor: string, options?: { role?: string; viaApproval?: boolean; reason?: string }): Promise<{ state: DoohState; submission: Submission }> {
  let submission!: Submission;
  const state = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === id);
    if (!item) throw new Error("Submission not found");
    if (!SUBMISSION_STAGES.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
    // Governance gates (RFP APP-006/009). Approval must go through the named-
    // approver workflow (SoD + dual control); nothing schedules unapproved
    // content. Guards live in the store so the REST route, the agent tools and
    // any future caller are all covered - no bypass path.
    if (stage === "Approved" && !options?.viaApproval) {
      throw new Error("Direct approval is disabled. Use the approval workflow: named approver, segregation of duties, and dual control for high-impact content.");
    }
    if (stage === "Scheduled" && item.stage !== "Approved") {
      throw new Error(`Cannot schedule ${item.id}: content is ${item.stage}, not Approved.`);
    }
    const previousStage = item.stage;
    item.stage = stage;
    if (stage !== "Approved" && previousStage !== stage) {
      appendJournal(item, {
        actor,
        role: options?.role ?? "operator",
        decision: stage === "Changes requested" ? "Changes requested" : `Moved to ${stage}`,
        reason: options?.reason,
        nextAssignee: campaignNextStep(stage),
        sla: stage === "In review" || stage === "Submitted",
      });
    }
    submission = { ...item };
    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === item.campaign
        ? {
            ...campaign,
            status: campaignStatusFromStage(stage),
            nextStep: campaignNextStep(stage),
            ...(stage === "Changes requested" ? {} : { revisionMessage: undefined, revisionRequestedAt: undefined, revisionFrom: undefined }),
          }
        : campaign,
    );
    if (stage === "Scheduled" && !draft.schedule.some((slot) => slot.campaign === item.campaign)) {
      draft.schedule = [
        ...draft.schedule,
        {
          id: nextId("SCH", draft.schedule),
          time: "16:00",
          asset: "AD-HWY-001",
          campaign: item.campaign,
          owner: item.bidder,
          state: "Queued",
          submissionId: item.id,
        },
      ];
    }
    if (stage === "Scheduled") {
      const booking = draft.bookings.find((entry) => entry.submissionId === item.id);
      if (booking && booking.status === "Booked") {
        const now = formatNow();
        booking.status = "Scheduled";
        booking.updatedAt = now;
        booking.history = [...booking.history, { status: "Scheduled", at: now, actor, note: "Approved creative entered the playout schedule." }];
      }
    }
    if (stage === "Published" && !draft.published.some((published) => published.campaign === item.campaign)) {
      draft.published = [
        {
          id: nextId("PUB", draft.published),
          campaign: item.campaign,
          asset: "AD-HWY-001",
          creativeId: item.creativeId,
          started: "Now",
        },
        ...draft.published,
      ];
    }
    if (stage === "In review") {
      addNotification(draft, {
        title: "ADMO review started",
        body: `${item.campaign} is now under CMS review.`,
        subject: item.campaign,
        recipients: ["bidder"],
        page: "campaigns",
        tone: "info",
      });
    }
    if (stage === "Approved") {
      addNotification(draft, {
        title: "Campaign approved",
        body: `${item.campaign} was approved by ADMO CMS and is ready for scheduling.`,
        subject: item.campaign,
        recipients: ["bidder", "admin"],
        page: "campaigns",
        tone: "success",
      });
    }
    if (stage === "Scheduled") {
      addNotification(draft, {
        title: "Campaign scheduled",
        body: `${item.campaign} is queued for playback on the network.`,
        subject: item.campaign,
        recipients: ["control-room", "reviewer", "admin"],
        page: "control",
        tone: "info",
      });
      addNotification(draft, {
        title: "Campaign scheduled",
        body: `${item.campaign} is queued for playback on the network.`,
        subject: item.campaign,
        recipients: ["bidder"],
        page: "campaigns",
        tone: "info",
      });
    }
    if (stage === "Published") {
      addNotification(draft, {
        title: "Campaign live",
        body: `${item.campaign} is now published to the DOOH estate.`,
        subject: item.campaign,
        recipients: ["control-room", "admin"],
        page: "control",
        tone: "success",
      });
      addNotification(draft, {
        title: "Campaign live",
        body: `${item.campaign} is now published to the DOOH estate.`,
        subject: item.campaign,
        recipients: ["bidder"],
        page: "campaigns",
        tone: "success",
      });
    }
    addActivity(draft, actor, `Moved submission to ${stage}`, item.campaign);
  });
  return { state, submission };
}

/**
 * Named-approver workflow (RFP APP-006/008/009). Segregation of duties: the
 * uploader/owner can never approve their own submission. High-impact content
 * requires DUAL CONTROL: two distinct named approvers, each MFA-verified.
 * The store is the single enforcement point for every caller (UI, agent, API).
 */
export async function approveSubmission(
  payload: { id: string; approverName: string; role: string; reason?: string; mfaVerified?: boolean },
  actor: string,
): Promise<{ state: DoohState; submission: Submission; pendingSecondApproval: boolean }> {
  let submission!: Submission;
  let finalize = false;
  const firstState = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === payload.id);
    if (!item) throw new Error("Submission not found");
    if (item.stage !== "In review" && item.stage !== "Submitted") {
      throw new Error(`${item.id} is ${item.stage}; approval requires an item in review`);
    }
    const approver = namedApprovers.find((entry) => entry.name === payload.approverName);
    if (!approver) throw new Error(`${payload.approverName} is not a named approver (APP-008)`);
    if (!approver.canApprove.includes(item.category)) {
      throw new Error(`${approver.name} is not appointed for ${item.category} content`);
    }
    if (payload.approverName === item.owner || payload.approverName === item.bidder) {
      throw new Error(`Segregation of duties: ${payload.approverName} owns or submitted ${item.id} and cannot approve it (APP-006)`);
    }
    const mfaRequired = item.category !== "routine";
    if (mfaRequired && !payload.mfaVerified) {
      throw new Error(`MFA step-up required to approve ${item.category} content`);
    }
    if (item.approvals.some((signature) => signature.name === payload.approverName)) {
      throw new Error(`${payload.approverName} has already signed ${item.id}; dual control requires a different approver`);
    }
    item.approvals = [...item.approvals, { name: payload.approverName, role: approver.role, at: formatNow(), mfa: Boolean(payload.mfaVerified) }];

    if (item.category === "high-impact" && item.approvals.length < 2) {
      item.pendingSecondApproval = true;
      appendJournal(item, {
        actor: payload.approverName,
        role: approver.role,
        decision: "First approval recorded (dual control 1 of 2)",
        reason: payload.reason,
        nextAssignee: "Second named approver (MFA)",
        sla: true,
      });
      addNotification(draft, {
        title: "Second approval required",
        body: `${item.campaign} (${item.category}) has one of two required approvals. A different named approver must complete dual control.`,
        subject: item.campaign,
        recipients: ["reviewer", "admin"],
        page: "cms",
        tone: "action",
      });
      addActivity(draft, actor, "Recorded first dual-control approval", item.campaign);
      submission = { ...item };
      return;
    }
    item.pendingSecondApproval = false;
    finalize = true;
    submission = { ...item };
  });
  if (!finalize) return { state: firstState, submission, pendingSecondApproval: true };

  await updateSubmissionStage(payload.id, "Approved", payload.approverName, { viaApproval: true, role: payload.role });
  let approved!: Submission;
  const state = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === payload.id);
    if (!item) throw new Error("Submission not found");
    const ceremony = item.category === "high-impact"
      ? `Dual control complete: ${item.approvals.map((signature) => signature.name).join(" + ")}, both MFA-verified (simulated step-up).`
      : item.category === "sensitive"
        ? "Named approver signed with MFA step-up (simulated)."
        : "Named approver signed.";
    appendJournal(item, {
      actor: payload.approverName,
      role: payload.role,
      decision: item.category === "high-impact" ? "Approved (dual control 2 of 2)" : "Approved",
      reason: [payload.reason, ceremony].filter(Boolean).join(" "),
      nextAssignee: "Scheduling",
    });
    addActivity(draft, actor, "Approved submission", item.campaign);
    approved = { ...item };
  });
  return { state, submission: approved, pendingSecondApproval: false };
}

/**
 * Bidder resubmission (RFP APP-005): applies the revised fields, bumps the
 * version, records a field-level diff in the journal, resets approvals and
 * returns the item to the head of the review pipeline.
 */
export async function resubmitSubmission(
  payload: { id: string; creativeId?: string; language?: string; notes?: string; budget?: string; message?: string },
  actor: string,
): Promise<{ state: DoohState; submission: Submission }> {
  let submission!: Submission;
  const state = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === payload.id);
    if (!item) throw new Error("Submission not found");
    if (item.stage !== "Changes requested") {
      throw new Error(`${item.id} is ${item.stage}; resubmission requires Changes requested`);
    }
    const diff: string[] = [];
    const apply = (field: "creativeId" | "language" | "notes" | "budget", value?: string) => {
      if (value !== undefined && value !== item[field]) {
        diff.push(`${field}: "${item[field]}" -> "${value}"`);
        item[field] = value;
      }
    };
    apply("creativeId", payload.creativeId);
    apply("language", payload.language);
    apply("notes", payload.notes);
    apply("budget", payload.budget);
    const previousHash = item.contentHash;
    item.version += 1;
    item.contentHash = submissionContentHash(item);
    item.approvals = [];
    item.pendingSecondApproval = false;
    item.stage = "Submitted";
    appendJournal(item, {
      actor,
      role: "bidder",
      decision: `Resubmitted (v${item.version})`,
      reason: payload.message,
      nextAssignee: item.owner,
      diff: diff.length ? diff : [`content unchanged (hash ${previousHash.slice(0, 10)}... retained history)`],
      sla: true,
    });
    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === item.campaign
        ? { ...campaign, status: "Submitted", nextStep: "ADMO content review", revisionMessage: undefined, revisionRequestedAt: undefined, revisionFrom: undefined }
        : campaign,
    );
    addNotification(draft, {
      title: "Revision resubmitted",
      body: `${item.campaign} v${item.version} is back in review (${diff.length} field change${diff.length === 1 ? "" : "s"}).`,
      subject: item.campaign,
      recipients: ["reviewer", "admin"],
      page: "cms",
      tone: "action",
    });
    addActivity(draft, actor, `Resubmitted revision v${item.version}`, item.campaign);
    submission = { ...item };
  });
  return { state, submission };
}

export async function requestSubmissionChanges(
  id: string,
  message: string,
  actor: string,
): Promise<{ state: DoohState; submission: Submission; communication: BidderCommunication }> {
  let submission!: Submission;
  let communication!: BidderCommunication;
  const cleanMessage = message.trim();
  if (!cleanMessage) throw new Error("Revision message is required");

  const state = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === id);
    if (!item) throw new Error("Submission not found");
    item.stage = "Changes requested";
    submission = { ...item };
    const sentAt = formatNow();
    communication = {
      id: nextId("MSG", draft.bidderMessages ?? []),
      submissionId: item.id,
      campaign: item.campaign,
      bidder: item.bidder,
      from: actor || "ADMO Content Reviewer",
      message: cleanMessage,
      sentAt,
      status: "Unread",
    };
    draft.bidderMessages = [communication, ...(draft.bidderMessages ?? [])].slice(0, 80);
    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === item.campaign
        ? {
            ...campaign,
            status: "Changes requested",
            nextStep: "Review ADMO message and upload revised creative",
            revisionMessage: cleanMessage,
            revisionRequestedAt: sentAt,
            revisionFrom: actor || "ADMO Content Reviewer",
          }
        : campaign,
    );
    addNotification(draft, {
      title: "Revision requested",
      body: `ADMO sent required changes for ${item.campaign}. Open the campaign and upload the revised pack.`,
      subject: item.campaign,
      recipients: ["bidder"],
      page: "campaigns",
      tone: "warning",
    });
    addNotification(draft, {
      title: "Bidder revision requested",
      body: `${item.campaign} is waiting for advertiser changes.`,
      subject: item.campaign,
      recipients: ["reviewer", "admin"],
      page: "cms",
      tone: "info",
    });
    addActivity(draft, actor, "Sent bidder revision request", item.campaign);
  });
  return { state, submission, communication };
}

export async function createServiceOrder(
  payload: {
    assetId: string;
    assetName?: string;
    componentId?: string;
    title: string;
    severity: ServiceOrder["severity"];
    summary?: string;
    partsNeeded?: string[];
  },
  actor: string,
): Promise<{ state: DoohState; serviceOrder: ServiceOrder }> {
  let serviceOrder!: ServiceOrder;
  const state = await commit((draft) => {
    serviceOrder = {
      id: nextId("SO", draft.serviceOrders ?? []),
      assetId: payload.assetId,
      assetName: payload.assetName || payload.assetId,
      componentId: payload.componentId || "Asset unit",
      title: payload.title.trim(),
      severity: payload.severity,
      status: "Pending Assignment",
      owner: "Maintenance dispatch",
      due: payload.severity === "Critical" ? "Today" : "Next service window",
      summary: payload.summary || "Created from the Network and Devices digital twin.",
      partsNeeded: (payload.partsNeeded ?? []).filter(Boolean).slice(0, 6),
      linkedPo: payload.partsNeeded?.length ? "PO pending" : "No PO required",
      createdAt: formatNow(),
    };
    draft.serviceOrders = [serviceOrder, ...(draft.serviceOrders ?? [])].slice(0, 120);
    addNotification(draft, {
      title: "Service order created",
      body: `${serviceOrder.id} created for ${serviceOrder.assetName}.`,
      subject: serviceOrder.assetName,
      recipients: ["technical", "admin", "control-room"],
      page: "network",
      tone: payload.severity === "Critical" ? "critical" : "action",
    });
    addActivity(draft, actor, "Created service order", `${serviceOrder.id} | ${serviceOrder.assetName}`);
  });
  return { state, serviceOrder };
}

export async function createPurchaseOrder(
  payload: {
    assetId: string;
    assetName?: string;
    componentId?: string;
    item: string;
    quantity?: number;
    vendor?: string;
    eta?: string;
    linkedServiceOrder?: string;
  },
  actor: string,
): Promise<{ state: DoohState; purchaseOrder: PurchaseOrder }> {
  let purchaseOrder!: PurchaseOrder;
  const state = await commit((draft) => {
    purchaseOrder = {
      id: nextId("PO", draft.purchaseOrders ?? []),
      assetId: payload.assetId,
      assetName: payload.assetName || payload.assetId,
      componentId: payload.componentId || "Asset unit",
      item: payload.item.trim(),
      quantity: Math.max(1, Math.min(Number(payload.quantity) || 1, 50)),
      vendor: payload.vendor?.trim() || "Preferred DOOH spares supplier",
      status: "Submitted",
      eta: payload.eta?.trim() || "Next supplier window",
      linkedServiceOrder: payload.linkedServiceOrder,
      createdAt: formatNow(),
    };
    draft.purchaseOrders = [purchaseOrder, ...(draft.purchaseOrders ?? [])].slice(0, 160);
    if (payload.linkedServiceOrder) {
      const order = draft.serviceOrders.find((item) => item.id === payload.linkedServiceOrder);
      if (order && (!order.linkedPo || order.linkedPo === "PO pending" || order.linkedPo === "No PO required")) {
        order.linkedPo = purchaseOrder.id;
      }
    }
    addNotification(draft, {
      title: "Purchase order submitted",
      body: `${purchaseOrder.id} submitted for ${purchaseOrder.item} on ${purchaseOrder.assetName}.`,
      subject: purchaseOrder.assetName,
      recipients: ["technical", "admin", "control-room"],
      page: "network",
      tone: "action",
    });
    addActivity(draft, actor, "Created purchase order", `${purchaseOrder.id} | ${purchaseOrder.assetName}`);
  });
  return { state, purchaseOrder };
}

export async function playScheduleItem(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const slot = draft.schedule.find((item) => item.id === id);
    if (!slot) throw new Error("Schedule item not found");
    slot.state = "Playing";
    const submission = slot.submissionId
      ? draft.submissions.find((item) => item.id === slot.submissionId)
      : draft.submissions.find((item) => item.campaign === slot.campaign);
    if (!draft.published.some((item) => item.campaign === slot.campaign && item.asset === slot.asset)) {
      draft.published = [
        {
          id: nextId("PUB", draft.published),
          campaign: slot.campaign,
          asset: slot.asset,
          creativeId: submission?.creativeId ?? "live-slate",
          started: "Now",
        },
        ...draft.published,
      ];
    }
    // Every playback event mints a hash-chained PoP record; a commercial
    // booking advances Scheduled -> Played exactly once (Tech Spec 10.3).
    const booking = draft.bookings.find((entry) => entry.submissionId && entry.submissionId === (slot.submissionId ?? submission?.id));
    const record = appendPopRecord(draft, {
      assetId: slot.asset,
      campaign: slot.campaign,
      creativeId: submission?.creativeId ?? "live-slate",
      kind: booking ? "commercial" : "civic",
      scheduledAt: slot.time,
      submissionId: submission?.id,
      bookingId: booking?.id,
    });
    if (booking && booking.status === "Scheduled") {
      const now = formatNow();
      booking.status = "Played";
      booking.updatedAt = now;
      booking.history = [...booking.history, { status: "Played", at: now, actor, note: `Playout attested by PoP record ${record.id} (${record.hash.slice(0, 12)}...).` }];
    }
    addNotification(draft, {
      title: "Schedule item playing",
      body: `${slot.campaign} started on ${slot.asset}.`,
      subject: slot.campaign,
      recipients: ["control-room", "reviewer", "admin"],
      page: "control",
      tone: "success",
    });
    addActivity(draft, actor, "Started scheduled campaign", slot.campaign);
  });
}

// Map a CAP area / scope text to concrete asset IDs (routing input for the
// operator to accept or adjust; AI only explains, never auto-applies).
export function zonesToAssetIds(areaOrZone: string): string[] {
  const needle = (areaOrZone || "").toLowerCase();
  if (!needle || needle.includes("estate") || needle.includes("citywide") || needle.includes("all")) {
    return dataAssets.map((asset) => asset.id);
  }
  return dataAssets
    .filter((asset) => needle.includes(asset.zone.toLowerCase()) || asset.zone.toLowerCase().includes(needle) || needle.includes(asset.id.toLowerCase()))
    .map((asset) => asset.id);
}

export async function createAlert(payload: AlertDraft, actor: string): Promise<{ state: DoohState; alert: EmergencyAlert }> {
  let alert!: EmergencyAlert;
  const state = await commit((draft) => {
    const scopeMode: AlertScopeMode = payload.scopeMode ?? (/(citywide|estate|all)/i.test(payload.area || payload.scope || "") ? "citywide" : "zone");
    const targets = payload.targetAssets?.length ? payload.targetAssets : zonesToAssetIds(payload.area || payload.scope || "");
    alert = {
      id: nextId("ALT", draft.alerts),
      title: (payload.headline || payload.title).trim(),
      scope: payload.scope || payload.area || "Estate-wide",
      authority: payload.sender || actor || "NCEMA",
      sla: scopeMode === "citywide" ? "Citywide display within 5m" : "Zone display within 2m",
      audience: "Public",
      endTime: "Default 2 hours",
      state: "Check required",
      criticality: payload.criticality,
      identifier: payload.identifier,
      capIdentifier: payload.identifier,
      sender: payload.sender || "NCEMA",
      area: payload.area || payload.scope,
      severity: payload.severity,
      urgency: payload.urgency,
      certainty: payload.certainty,
      headline: payload.headline || payload.title,
      bodyEn: payload.bodyEn || payload.content,
      bodyAr: payload.bodyAr,
      scopeMode,
      targetAssets: targets,
      approvals: [],
      ackBy: [],
    };
    draft.alerts = [alert, ...draft.alerts];
    draft.verificationSteps = cloneState({ ...initialState, verificationSteps: initialVerificationSteps }).verificationSteps;
    addNotification(draft, {
      title: "Emergency alert created",
      body: `${alert.title} is waiting for MediaGPT verification.`,
      subject: alert.title,
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: alert.criticality === "Critical" ? "critical" : "warning",
    });
    addActivity(draft, actor, "Created emergency alert", alert.title);
  });
  return { state, alert };
}

export async function runEmergencyChecks(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    draft.verificationSteps = draft.verificationSteps.map((step) => ({ ...step, state: "Checked" }));
    alert.state = "Approval required";
    addNotification(draft, {
      title: "Emergency checks complete",
      body: `${alert.title} is ready for queueing or broadcast approval.`,
      subject: alert.title,
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: "action",
    });
    addActivity(draft, actor, "Completed emergency checks", alert.title);
  });
}

// Human-gated approval of an emergency alert (RFP NCM + APP-009). NCEMA content
// is never modified; a NAMED approver signs off, and citywide scope requires
// DUAL CONTROL (two distinct MFA-verified approvers) before go-live.
export async function approveEmergencyAlert(
  payload: { id: string; approverName: string; role: string; mfaVerified?: boolean },
  actor: string,
): Promise<{ state: DoohState; alert: EmergencyAlert; pendingSecondApproval: boolean }> {
  let alert!: EmergencyAlert;
  let pendingSecondApproval = false;
  const state = await commit((draft) => {
    const item = draft.alerts.find((entry) => entry.id === payload.id);
    if (!item) throw new Error("Alert not found");
    if (item.state !== "Approval required" && item.state !== "Checked") {
      throw new Error(`Alert ${item.id} is ${item.state}; approval requires completed checks`);
    }
    const approver = namedApprovers.find((entry) => entry.name === payload.approverName);
    if (!approver) throw new Error(`${payload.approverName} is not a named approver`);
    if (!payload.mfaVerified) throw new Error("MFA step-up required to approve an emergency broadcast");
    item.approvals = item.approvals ?? [];
    if (item.approvals.some((signature) => signature.name === payload.approverName)) {
      throw new Error(`${payload.approverName} has already signed; dual control requires a different approver`);
    }
    item.approvals = [...item.approvals, { name: payload.approverName, role: approver.role, at: formatNow(), mfa: true }];
    const needed = item.scopeMode === "citywide" ? 2 : 1;
    if (item.approvals.length < needed) {
      pendingSecondApproval = true;
      addNotification(draft, {
        title: "Second emergency approval required",
        body: `${item.title} (citywide) has 1 of 2 required approvals.`,
        subject: item.title,
        recipients: ["control-room", "admin"],
        page: "alerts",
        tone: "action",
      });
      addActivity(draft, actor, "Recorded first emergency approval", item.title);
      alert = { ...item };
      return;
    }
    item.state = "Approved";
    addNotification(draft, {
      title: "Emergency alert approved",
      body: `${item.title} approved by ${item.approvals.map((s) => s.name).join(" + ")}. Ready to broadcast.`,
      subject: item.title,
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: "warning",
    });
    addActivity(draft, actor, "Approved emergency alert", item.title);
    alert = { ...item };
  });
  return { state, alert, pendingSecondApproval };
}

export async function queueEmergencyBroadcast(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    if (alert.state !== "Approved") throw new Error("Alert must be approved by a named approver before queueing");
    alert.state = "Broadcast queued";
    addNotification(draft, {
      title: "Emergency broadcast queued",
      body: `${alert.title} is queued for the selected network scope.`,
      subject: alert.title,
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: "warning",
    });
    addActivity(draft, actor, "Queued emergency broadcast", alert.title);
  });
}

export async function broadcastEmergencyNow(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    if (alert.state !== "Approved" && alert.state !== "Broadcast queued") {
      throw new Error("Emergency broadcast requires named-approver sign-off first");
    }
    const targets = alert.targetAssets?.length ? alert.targetAssets : zonesToAssetIds(alert.area || alert.scope);
    // Rules engine at emergency targeting: Emergency tier outranks commercial
    // proximity/zoning blocks (Tech Spec 10.5) - recorded as an override event.
    const verdict = evaluateRules({ kind: "emergency", assetIds: targets, requesterTier: "Emergency" });
    recordEnforcement(draft, { kind: "emergency", subject: alert.title, verdict, actor });

    alert.state = "Broadcasting";
    const deadlineMs = (alert.scopeMode === "citywide" ? 5 : 2) * 60_000;
    alert.deadlineAt = new Date(Date.now() + deadlineMs).toISOString();

    for (const assetId of targets) {
      draft.published = [
        { id: nextId("PUB", draft.published), campaign: alert.title, asset: assetId, creativeId: "weather-alert", started: "Now" },
        ...draft.published,
      ];
      appendPopRecord(draft, {
        assetId,
        campaign: `${alert.title} [${alert.capIdentifier ?? alert.id}]`,
        creativeId: "weather-alert",
        kind: "emergency",
        scheduledAt: "Immediate override",
      });
    }
    addNotification(draft, {
      title: "Emergency live - preempting content",
      body: `${alert.title} is live on ${targets.length} asset(s), approved by ${(alert.approvals ?? []).map((s) => s.name).join(" + ") || actor}. CAP ${alert.capIdentifier ?? alert.id}.`,
      subject: alert.title,
      recipients: ["control-room", "admin", "reviewer"],
      page: "alerts",
      tone: "critical",
    });
    addActivity(draft, actor, "Broadcast emergency alert", alert.title);
  });
}

// Remote display control / kill switch (Tech Spec 12.7). Three escalating
// scopes with response-time targets; emirate-wide requires dual-control
// confirmation. Kill commands override all content except NCEMA alerts.
export async function remoteKill(
  payload: { scope: "asset" | "zone" | "emirate"; target?: string; reason: string; confirm?: boolean },
  actor: string,
): Promise<{ state: DoohState; affected: number }> {
  let affected = 0;
  const state = await commit((draft) => {
    if (!payload.reason?.trim()) throw new Error("A reason code is required for remote display control");
    let ids: string[] = [];
    let sla = "";
    if (payload.scope === "asset") {
      if (!payload.target) throw new Error("Select an asset to disable");
      ids = [payload.target];
      sla = "<=10s";
    } else if (payload.scope === "zone") {
      if (!payload.target) throw new Error("Select a zone to disable");
      ids = dataAssets.filter((a) => a.zone === payload.target).map((a) => a.id);
      sla = "<=30s for up to 100 assets";
    } else {
      if (!payload.confirm) throw new Error("Emirate-wide kill requires dual-control confirmation");
      ids = dataAssets.map((a) => a.id);
      sla = "<=60s for the full fleet";
    }
    const set = new Set(draft.killedAssetIds);
    ids.forEach((id) => set.add(id));
    affected = ids.length;
    draft.killedAssetIds = [...set];
    addNotification(draft, {
      title: `Remote kill: ${payload.scope}`,
      body: `${affected} display(s) blanked (${payload.reason}). Target SLA ${sla}. Command signed by ${actor}.`,
      subject: payload.target ?? "Emirate-wide",
      recipients: ["control-room", "admin", "technical"],
      page: "control",
      tone: "critical",
    });
    addActivity(draft, actor, `Remote kill (${payload.scope}, ${sla})`, payload.target ?? "Emirate-wide");
  });
  return { state, affected };
}

export async function restoreDisplays(payload: { scope: "asset" | "zone" | "emirate"; target?: string }, actor: string): Promise<DoohState> {
  return commit((draft) => {
    let ids: string[] = [];
    if (payload.scope === "asset" && payload.target) ids = [payload.target];
    else if (payload.scope === "zone" && payload.target) ids = dataAssets.filter((a) => a.zone === payload.target).map((a) => a.id);
    else ids = draft.killedAssetIds;
    const remove = new Set(ids);
    draft.killedAssetIds = draft.killedAssetIds.filter((id) => !remove.has(id));
    addActivity(draft, actor, "Re-enabled displays", payload.target ?? "All");
  });
}

// Pure: the screens inside a radius, each with its per-screen rules verdict.
// Same distanceM + evaluateRules the rest of the platform uses, so the
// preview and the governed queue always agree.
export function computeRadiusScreens(
  center: { lat: number; lng: number },
  radiusM: number,
  opts: { category?: string; daypart?: string } = {},
): RadiusBroadcastScreen[] {
  return dataAssets
    .map((asset) => ({ asset, d: distanceM(center, { lat: asset.lat, lng: asset.lng }) }))
    .filter((row) => row.d <= radiusM)
    .sort((a, b) => a.d - b.d)
    .map(({ asset, d }) => {
      // Per-screen check: only this screen's own coordinates. Passing its
      // zone would expand evaluateRules to every asset in the zone and
      // attribute a neighbour's proximity flag to this screen.
      const verdict = evaluateRules({
        kind: "scheduling",
        assetIds: [asset.id],
        category: opts.category,
        daypart: opts.daypart,
      });
      const flag = verdict.hits[0] ?? verdict.warnings[0];
      return {
        assetId: asset.id,
        name: asset.name,
        zone: asset.zone,
        distanceM: d,
        status: flag ? "flagged" : "clear",
        flagLabel: flag?.label,
        flagDetail: flag?.detail,
      } as RadiusBroadcastScreen;
    });
}

export async function queueRadiusBroadcast(
  payload: { center: { lat: number; lng: number }; centerLabel?: string; radiusM: number; campaign: string; messageEn: string; messageAr?: string; category?: string; daypart?: string },
  actor: string,
): Promise<{ state: DoohState; broadcast: RadiusBroadcast }> {
  if (!payload.campaign?.trim()) throw new Error("A campaign or message name is required");
  if (!payload.messageEn?.trim()) throw new Error("A message is required");
  if (!(payload.radiusM > 0)) throw new Error("A positive radius is required");
  const screens = computeRadiusScreens(payload.center, payload.radiusM, { category: payload.category, daypart: payload.daypart });
  if (!screens.length) throw new Error("No screens fall inside the selected area");
  const flaggedCount = screens.filter((s) => s.status === "flagged").length;
  const broadcast: RadiusBroadcast = {
    id: `RB-${Date.now().toString().slice(-6)}`,
    center: payload.center,
    centerLabel: payload.centerLabel?.trim() || `${payload.center.lat.toFixed(4)}, ${payload.center.lng.toFixed(4)}`,
    radiusM: payload.radiusM,
    campaign: payload.campaign.trim(),
    messageEn: payload.messageEn.trim(),
    messageAr: (payload.messageAr ?? "").trim(),
    screens,
    clearCount: screens.length - flaggedCount,
    flaggedCount,
    status: "Pending approval",
    createdBy: actor,
    createdAt: formatNow(),
  };
  const state = await commit((draft) => {
    draft.radiusBroadcasts = [broadcast, ...draft.radiusBroadcasts];
    addNotification(draft, {
      title: "Radius broadcast awaiting approval",
      body: `${broadcast.campaign}: ${screens.length} screen(s) within ${(payload.radiusM / 1000).toFixed(1)} km of ${broadcast.centerLabel}${flaggedCount ? `, ${flaggedCount} flagged by rules` : ""}. Proposed by ${actor}.`,
      subject: broadcast.id,
      recipients: ["control-room", "admin"],
      page: "radius",
      tone: flaggedCount ? "warning" : "info",
    });
    addActivity(draft, actor, `Proposed radius broadcast (${screens.length} screens)`, broadcast.centerLabel);
  });
  return { state, broadcast };
}

export async function approveRadiusBroadcast(id: string, approver: string): Promise<{ state: DoohState; broadcast: RadiusBroadcast }> {
  let updated: RadiusBroadcast | null = null;
  const state = await commit((draft) => {
    const broadcast = draft.radiusBroadcasts.find((b) => b.id === id);
    if (!broadcast) throw new Error("Radius broadcast not found");
    if (broadcast.createdBy === approver) throw new Error("Segregation of duties: the proposer cannot approve their own broadcast");
    broadcast.status = "Approved and queued";
    broadcast.approvedBy = approver;
    updated = broadcast;
    // Queue the message onto the clear screens (flagged ones are held out).
    const queued = broadcast.screens.filter((s) => s.status === "clear").map((s) => s.assetId);
    for (const item of draft.schedule) {
      if (queued.includes(item.asset)) item.campaign = broadcast.campaign;
    }
    addActivity(draft, approver, `Approved radius broadcast to ${broadcast.clearCount} screens`, broadcast.campaign);
  });
  return { state, broadcast: updated! };
}

// ---- Map multi-select (marquee / Ctrl-click) bulk action ----
// Overlap is read from the commercial allocation state: an Allocated screen
// or one Under maintenance is a hard conflict; In bidding is a soft conflict.
const allocationById = new Map(assetAllocations.map((a) => [a.assetId, a]));

function selectionConflict(assetId: string): { conflict?: string; conflictLevel?: "hard" | "soft" } {
  const alloc = allocationById.get(assetId);
  if (!alloc) return {};
  if (alloc.status === "Allocated") {
    const until = alloc.expiryDate ? ` until ${alloc.expiryDate}` : "";
    return { conflict: `Committed to ${alloc.operator ?? "an operator"}${until} (${alloc.contractRef ?? "contract"})`, conflictLevel: "hard" };
  }
  if (alloc.status === "Under maintenance") return { conflict: "Screen is under maintenance", conflictLevel: "hard" };
  if (alloc.status === "In bidding") return { conflict: `Live auction in progress${alloc.lotId ? ` (${alloc.lotId})` : ""}`, conflictLevel: "soft" };
  return {};
}

export function computeSelectionScreens(assetIds: string[], opts: { category?: string; daypart?: string } = {}): RadiusBroadcastScreen[] {
  const ids = new Set(assetIds);
  return dataAssets
    .filter((asset) => ids.has(asset.id))
    .map((asset) => {
      const verdict = evaluateRules({ kind: "scheduling", assetIds: [asset.id], category: opts.category, daypart: opts.daypart });
      const flag = verdict.hits[0] ?? verdict.warnings[0];
      const overlap = selectionConflict(asset.id);
      return {
        assetId: asset.id,
        name: asset.name,
        zone: asset.zone,
        distanceM: 0,
        status: flag || overlap.conflictLevel === "hard" ? "flagged" : "clear",
        flagLabel: flag?.label,
        flagDetail: flag?.detail,
        conflict: overlap.conflict,
        conflictLevel: overlap.conflictLevel,
      } as RadiusBroadcastScreen;
    });
}

export async function queueSelectionAction(
  payload: {
    assetIds: string[];
    campaign: string;
    messageEn: string;
    messageAr?: string;
    actionKind?: "display" | "schedule";
    scheduleWindow?: string;
    category?: string;
    daypart?: string;
    overlapPolicy?: "exclude" | "override";
    creativeId?: string;
    creativeUrl?: string;
    visualSource?: string;
  },
  actor: string,
): Promise<{ state: DoohState; broadcast: RadiusBroadcast }> {
  if (!payload.assetIds?.length) throw new Error("Select at least one screen");
  if (!payload.campaign?.trim()) throw new Error("A campaign or message name is required");
  if (!payload.messageEn?.trim()) throw new Error("A message is required");
  const screens = computeSelectionScreens(payload.assetIds, { category: payload.category, daypart: payload.daypart });
  if (!screens.length) throw new Error("None of the selected screens were found");
  const overlapPolicy = payload.overlapPolicy === "exclude" ? "exclude" : "override";
  const hardConflicts = screens.filter((s) => s.conflictLevel === "hard");
  const ruleFlaggedCount = screens.filter((s) => s.status === "flagged" && !s.conflict).length;
  const flaggedCount = ruleFlaggedCount + (overlapPolicy === "exclude" ? hardConflicts.length : 0);
  const conflictCount = screens.filter((s) => s.conflict).length;
  const zones = [...new Set(screens.map((s) => s.zone))];
  const kind = payload.actionKind ?? "display";
  const broadcast: RadiusBroadcast = {
    id: `SEL-${Date.now().toString().slice(-6)}`,
    center: { lat: 0, lng: 0 },
    centerLabel: `${screens.length} selected screen(s) · ${zones.slice(0, 3).join(", ")}${zones.length > 3 ? "…" : ""}`,
    radiusM: 0,
    mode: "selection",
    actionKind: kind,
    scheduleWindow: payload.scheduleWindow,
    campaign: payload.campaign.trim(),
    messageEn: payload.messageEn.trim(),
    messageAr: (payload.messageAr ?? "").trim(),
    screens,
    clearCount: screens.length - flaggedCount,
    flaggedCount,
    conflictCount,
    overlapPolicy,
    creativeId: payload.creativeId,
    creativeUrl: payload.creativeUrl,
    visualSource: payload.visualSource,
    status: "Pending approval",
    createdBy: actor,
    createdAt: formatNow(),
  };
  const state = await commit((draft) => {
    draft.radiusBroadcasts = [broadcast, ...draft.radiusBroadcasts];
    addNotification(draft, {
      title: kind === "schedule" ? "Bulk schedule awaiting approval" : "Bulk display awaiting approval",
      body: `${broadcast.campaign}: ${screens.length} selected screen(s)${payload.scheduleWindow ? `, ${payload.scheduleWindow}` : ""}${conflictCount ? `, ${conflictCount} with existing commitments (${overlapPolicy})` : ""}${flaggedCount ? `, ${flaggedCount} held for review` : ""}. Proposed by ${actor}.`,
      subject: broadcast.id,
      recipients: ["control-room", "admin"],
      page: "radius",
      tone: flaggedCount || conflictCount ? "warning" : "info",
    });
    addActivity(draft, actor, `Proposed ${kind} to ${screens.length} selected screens`, broadcast.campaign);
  });
  return { state, broadcast };
}

// Yield / where-to-spend advisor. Deterministic ranking from audience,
// rate card and goal fit, so the recommendation is explainable and stable.
export interface YieldRecommendation {
  assetId: string;
  name: string;
  zone: string;
  audienceWeekly: number;
  rateCardWeekAed: number;
  weeksAffordable: number;
  projectedImpressions: number;
  costPerThousand: number;
  rationale: string;
}

export interface YieldAdvice {
  budgetAed: number;
  goal: string;
  recommendations: YieldRecommendation[];
  dayparts: string[];
  summary: string;
}

const GOAL_ZONE_FIT: Record<string, Record<string, number>> = {
  retail: { Downtown: 1.35, "Abu Dhabi City": 1.15, "Yas Island": 1.2, "Industrial Zone": 0.7, "Al Ain": 1.0 },
  tourism: { "Yas Island": 1.4, "Abu Dhabi City": 1.2, Downtown: 1.1, "Al Ain": 1.05, "Industrial Zone": 0.6 },
  awareness: { "Abu Dhabi City": 1.3, "Al Ain": 1.15, Downtown: 1.1, "Yas Island": 1.1, "Industrial Zone": 1.0 },
  safety: { "Abu Dhabi City": 1.35, "Al Ain": 1.25, "Industrial Zone": 1.2, Downtown: 1.0, "Yas Island": 0.9 },
};
const GOAL_DAYPARTS: Record<string, string[]> = {
  retail: ["Evening peak (18:00-22:00)", "Weekend midday"],
  tourism: ["Evening peak (18:00-22:00)", "Late morning"],
  awareness: ["Morning peak (07:00-10:00)", "Evening peak (18:00-22:00)"],
  safety: ["Morning peak (07:00-10:00)", "Evening peak (18:00-22:00)"],
};

function parseAudienceWeekly(value: string): number {
  const m = value.match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] || "").toLowerCase();
  return Math.round(n * (unit === "m" ? 1_000_000 : unit === "k" ? 1_000 : 1));
}

export function yieldRecommendation(budgetAed: number, goalRaw: string): YieldAdvice {
  const goal = (goalRaw || "awareness").toLowerCase();
  const fit = GOAL_ZONE_FIT[goal] ?? GOAL_ZONE_FIT.awareness;
  const rows: YieldRecommendation[] = dataAssets
    .filter((asset) => asset.status !== "Offline")
    .map((asset) => {
      const audienceWeekly = parseAudienceWeekly(asset.audience);
      const alloc = assetAllocations.find((a) => a.assetId === asset.id);
      const rateCardWeekAed = alloc?.rateCardWeekAed ?? 12000;
      const zoneFit = fit[asset.zone] ?? 1;
      const weeksAffordable = Math.max(1, Math.floor(budgetAed / rateCardWeekAed));
      const projectedImpressions = Math.round(audienceWeekly * weeksAffordable * zoneFit);
      const spend = Math.min(budgetAed, rateCardWeekAed * weeksAffordable);
      const costPerThousand = spend > 0 ? Math.round((spend / projectedImpressions) * 1000 * 100) / 100 : 0;
      return {
        assetId: asset.id,
        name: asset.name,
        zone: asset.zone,
        audienceWeekly,
        rateCardWeekAed,
        weeksAffordable,
        projectedImpressions,
        costPerThousand,
        rationale: `${asset.zone} fit x${zoneFit.toFixed(2)}, ${(audienceWeekly / 1000).toFixed(0)}k weekly reach, ${weeksAffordable} week(s) within budget at AED ${rateCardWeekAed.toLocaleString("en-US")}/week.`,
      };
    })
    .sort((a, b) => b.projectedImpressions - a.projectedImpressions)
    .slice(0, 5);

  const totalImpr = rows.reduce((s, r) => s + r.projectedImpressions, 0);
  const summary = rows.length
    ? `For a ${goal} goal on AED ${budgetAed.toLocaleString("en-US")}, MediaGPT ranks ${rows.length} screens led by ${rows[0].name} (${rows[0].zone}). Projected reach across the top set is ${(totalImpr / 1_000_000).toFixed(1)}M impressions.`
    : "No eligible screens for this budget.";
  return { budgetAed, goal, recommendations: rows, dayparts: GOAL_DAYPARTS[goal] ?? GOAL_DAYPARTS.awareness, summary };
}

export async function acknowledgeAlert(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    alert.ackBy = alert.ackBy ?? [];
    if (!alert.ackBy.includes(actor)) alert.ackBy = [...alert.ackBy, actor];
    if (alert.state === "Broadcasting") alert.state = "Live on network";
    addActivity(draft, actor, "Acknowledged emergency alert", alert.title);
  });
}

export async function resetEmergencyAlert(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    alert.state = "Check required";
    draft.verificationSteps = initialVerificationSteps.map((step) => ({ ...step }));
    addNotification(draft, {
      title: "Emergency checks reset",
      body: `${alert.title} must be checked again before broadcast.`,
      subject: alert.title,
      recipients: ["control-room", "admin"],
      page: "alerts",
      tone: "warning",
    });
    addActivity(draft, actor, "Reset emergency checks", alert.title);
  });
}

export async function decideFinanceApproval(id: string, state: FinanceState, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const approval = draft.financeApprovals.find((item) => item.id === id);
    if (!approval) throw new Error("Finance approval not found");
    approval.state = state;
    addNotification(draft, {
      title: "Finance decision posted",
      body: `${approval.campaign} is now ${state}.`,
      subject: approval.campaign,
      recipients: ["bidder", "admin"],
      page: "campaigns",
      tone: state === "Approved" ? "success" : state === "Rejected" ? "warning" : "info",
    });
    addActivity(draft, actor, `Finance decision: ${state}`, approval.campaign);
  });
}
