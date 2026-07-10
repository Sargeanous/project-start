import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Cpu,
  Database,
  FileCheck2,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPinned,
  Megaphone,
  MonitorPlay,
  Maximize2,
  PlugZap,
  Power,
  RadioTower,
  RefreshCcw,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  X,
  Plus,
  Save,
  Palette,
  Target,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Lightbulb,
  PenTool,
  Terminal,
  ShoppingBag,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  ChevronsUpDown,
  CalendarClock,
  CornerDownRight,
  Upload,
  UserRound,
  UserPlus,
  WalletCards,
  Workflow,
  Wrench,
  Zap,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { createContext, FormEvent, Fragment, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  alerts,
  assetAllocations,
  assets as estateAssets,
  fieldTasks,
  mediaAssets as seedMediaAssets,
  scheduleSlots,
  tickets,
  type Asset,
  type AssetAllocation,
  type MediaAsset,
} from "./data";
import { creativeBackground, feedBackground, LiveMap, RadiusMap } from "./visuals";
import { sensitiveSites, zoneContentRules, type OverrideTier, type SensitiveKind } from "./rules-data";
import { distanceM, evaluateRules, type RuleVerdict } from "./rules-engine";
import {
  demoScenarios,
  doohOntology,
  knowledgeCollections,
  ruleSimulationContexts,
  seedDoohRules,
  seedKnowledgeSources,
  type DoohRule,
  type DoohRuleMode,
  type DoohRuleStatus,
  type KnowledgeCollectionId,
  type KnowledgeSource,
  type LocalizedText,
} from "./intelligence-content";
import {
  extendedDemoScenarios,
  extendedDoohOntology,
  extendedDoohRules,
  extendedKnowledgeSources,
  extendedRuleSimulationContexts,
} from "./intelligence-extensions";
import {
  aiStatus,
  askMediaGPT as aiAskMediaGPT,
  approveAgentAction as aiApproveAgentAction,
  draftTicket as aiDraftTicket,
  explainYield as aiExplainYield,
  generateBroadcast as aiGenerateBroadcast,
  generateCreativeCopy as aiGenerateCreativeCopy,
  generateVisual as aiGenerateVisual,
  reviewVisual as aiReviewVisual,
  listAgentActions as aiListAgentActions,
  opsDigest as aiOpsDigest,
  parseEstateQuery as aiParseEstateQuery,
  rejectAgentAction as aiRejectAgentAction,
  runMediaGPTAgent as aiRunMediaGPTAgent,
  summarizeReport as aiSummarizeReport,
  tagSubmission as aiTagSubmission,
  triageSubmission as aiTriageSubmission,
  type CreativeCopy,
  type VisualReview,
  type ChatAnswer,
  type EstateFilter,
  type AgentToolTrace,
  type PendingAgentAction,
  type SubmissionTriageResponse,
  type SubmissionTags,
  type TicketDraft,
} from "./ai-client";
import { ClientOnlyBillboardTwin } from "./ClientOnlyBillboardTwin";
import admoLogo from "./assets/admo-logo.png";
import origenGreenIcon from "./assets/origen-green-icon.png";
import "./dooh-styles.css";

type Page =
  | "control"
  | "cms"
  | "alerts"
  | "network"
  | "mediagpt"
  | "radiusBroadcast"
  | "yieldAdvisor"
  | "knowledge"
  | "rules"
  | "skillsCatalogue"
  | "skillWorkflows"
  | "skillRuns"
  | "modelCenter"
  | "integrations"
  | "accessRoles"
  | "auditLog"
  | "edgeCompute"
  | "financials"
  | "allocations"
  | "reports"
  | "campaigns"
  | "marketplace";

type ProfileId = "control-room" | "reviewer" | "finance" | "admin" | "technical" | "bidder";
type Lang = "en" | "ar";
type Tone = "neutral" | "good" | "warn" | "danger" | "info";
type NotificationPreferenceKey = Page | "critical";
type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;
type CmsTab = "submissions" | "create" | "library" | "scheduling";
type NetworkTab = "assetOperations" | "maintenanceWorkbench" | "supplyChain";
type SubmissionStage = "Submitted" | "In review" | "Approved" | "Scheduled" | "Published" | "Changes requested";
type AlertState = "Check required" | "Checked" | "Approval required" | "Approved" | "Broadcast queued" | "Broadcasting" | "Live on network";

interface Profile {
  id: ProfileId;
  name: string;
  role: string;
  organization: string;
  pages: Page[];
}

interface NavItem {
  id: Page;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  pages: Page[];
}

type SubmissionCategory = "routine" | "sensitive" | "high-impact";

interface ApprovalSignature {
  name: string;
  role: string;
  at: string;
  mfa: boolean;
}

interface SubmissionJournalEntry {
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

interface NamedApprover {
  name: string;
  role: string;
  canApprove: SubmissionCategory[];
}

// Mirror of backend namedApprovers (dooh-store.ts) for the approver picker.
const namedApprovers: NamedApprover[] = [
  { name: "Maya Haddad", role: "reviewer", canApprove: ["routine", "sensitive"] },
  { name: "Noura Salem", role: "reviewer", canApprove: ["routine", "sensitive"] },
  { name: "Hamad Al Ketbi", role: "reviewer", canApprove: ["routine"] },
  { name: "Khaled Nasser", role: "control-room", canApprove: ["sensitive", "high-impact"] },
  { name: "Sara Al Mansoori", role: "admin", canApprove: ["routine", "sensitive", "high-impact"] },
  { name: "Khaled Mansoor", role: "admin", canApprove: ["high-impact"] },
];

interface Submission {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  owner: string;
  requestedStart: string;
  budget: string;
  priority: "Low" | "Medium" | "High";
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

interface BidderCampaign {
  id: string;
  campaign: string;
  packageName: string;
  budget: string;
  status: "Draft" | "Bidding" | "Submitted" | "In review" | "Changes requested" | "Approved" | "Scheduled" | "Published";
  reach: string;
  nextStep: string;
  revisionMessage?: string;
  revisionRequestedAt?: string;
  revisionFrom?: string;
}

interface BidderCommunication {
  id: string;
  submissionId: string;
  campaign: string;
  bidder: string;
  from: string;
  message: string;
  sentAt: string;
  status: "Unread" | "Read";
}

type AuctionLotStatus = "Open" | "Awarded" | "No fill";

interface AuctionLot {
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

type BookingStatus = "Awaiting payment" | "Booked" | "Scheduled" | "Played" | "Billed" | "Paid" | "Released";

interface BookingRecord {
  id: string;
  lotId: string;
  lotName: string;
  packageName: string;
  campaign: string;
  bidder: string;
  amount: number;
  currency: string;
  status: BookingStatus;
  algorithm: string;
  awardedAt: string;
  updatedAt: string;
  invoiceId?: string;
  submissionId?: string;
  paymentRef?: string;
  history: Array<{ status: BookingStatus | "Awarded"; at: string; actor: string; note?: string }>;
}

interface InvoiceRecord {
  id: string;
  bookingId: string;
  campaign: string;
  bidder: string;
  net: number;
  vat: number;
  total: number;
  currency: string;
  status: "Issued" | "Paid" | "Void";
  issuedAt: string;
  paidAt?: string;
  receiptId?: string;
  voidReason?: string;
}

interface PopRecord {
  id: string;
  seq: number;
  assetId: string;
  campaign: string;
  creativeId: string;
  kind: "commercial" | "civic" | "emergency";
  scheduledAt: string;
  playedAt: string;
  brightness: string;
  evidence: string;
  thumbnailRef: string;
  submissionId?: string;
  bookingId?: string;
  prevHash: string;
  hash: string;
}

interface EnforcementEvent {
  id: string;
  at: string;
  kind: "booking" | "scheduling" | "emergency";
  subject: string;
  outcome: "blocked" | "warned" | "overridden" | "cleared";
  reasonCodes: string[];
  firedRuleIds: string[];
  detail: string;
  actor: string;
}

interface ScheduleItem {
  id: string;
  time: string;
  asset: string;
  campaign: string;
  owner: string;
  state: "Playing" | "Queued" | "Scheduled";
}

interface PublishedItem {
  id: string;
  campaign: string;
  asset: string;
  creativeId: string;
  started: string;
}

interface BidRecord {
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

type AlertScopeMode = "zone" | "citywide";

interface EmergencyAlert {
  id: string;
  title: string;
  scope: string;
  authority: string;
  sla: string;
  audience: string;
  endTime: string;
  state: AlertState;
  criticality: "Critical" | "Major" | "Minor";
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
  deadlineAt?: string;
  capIdentifier?: string;
}

interface VerificationStep {
  label: string;
  owner: string;
  state: "Check required" | "Checked" | "Needs review";
}

interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  at: string;
}

interface PlatformNotification {
  id: string;
  title: string;
  body: string;
  subject: string;
  recipients: ProfileId[];
  page: Page;
  tone: "info" | "action" | "success" | "warning" | "critical";
  createdAt: string;
  readBy: ProfileId[];
}

interface ServiceOrder {
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

interface PurchaseOrder {
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

interface DoohStatePayload {
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
  alerts: EmergencyAlert[];
  verificationSteps: VerificationStep[];
  financeApprovals: FinanceApproval[];
  serviceOrders: ServiceOrder[];
  purchaseOrders: PurchaseOrder[];
  activity: ActivityItem[];
  notifications: PlatformNotification[];
}

const profiles: Profile[] = [
  {
    id: "control-room",
    name: "ADMO Control Room",
    role: "Operations operator",
    organization: "Abu Dhabi Media Office",
    pages: ["control", "alerts", "network", "mediagpt", "radiusBroadcast", "yieldAdvisor"],
  },
  {
    id: "reviewer",
    name: "ADMO Content Reviewer",
    role: "CMS reviewer",
    organization: "Abu Dhabi Media Office",
    pages: ["cms", "control", "mediagpt"],
  },
  {
    id: "finance",
    name: "ADMO Finance",
    role: "Commercial finance",
    organization: "Abu Dhabi Media Office",
    pages: ["financials", "allocations", "reports", "control", "yieldAdvisor"],
  },
  {
    id: "admin",
    name: "Platform Admin",
    role: "Platform governance",
    organization: "Abu Dhabi Media Office",
    pages: ["control", "cms", "alerts", "network", "financials", "allocations", "reports", "mediagpt", "radiusBroadcast", "yieldAdvisor", "knowledge", "rules", "skillsCatalogue", "skillWorkflows", "skillRuns", "modelCenter", "integrations", "accessRoles", "auditLog", "edgeCompute"],
  },
  {
    id: "technical",
    name: "Technical Platform Owner",
    role: "Technical layers",
    organization: "Abu Dhabi Media Office",
    pages: ["mediagpt", "knowledge", "rules", "skillsCatalogue", "skillWorkflows", "skillRuns", "modelCenter", "integrations", "accessRoles", "auditLog", "edgeCompute"],
  },
  {
    id: "bidder",
    name: "Advertiser",
    role: "Bidder account",
    organization: "External partner",
    pages: ["campaigns", "marketplace"],
  },
];

const navItems: Record<Page, NavItem> = {
  control: { id: "control", label: "Control Centre", icon: LayoutDashboard },
  cms: { id: "cms", label: "CMS", icon: ClipboardCheck },
  alerts: { id: "alerts", label: "Alerts and Emergencies", icon: ShieldAlert },
  network: { id: "network", label: "Network and Devices", icon: RadioTower },
  financials: { id: "financials", label: "Financials", icon: WalletCards },
  allocations: { id: "allocations", label: "Commercial Map", icon: MapPinned },
  reports: { id: "reports", label: "Reports & BI", icon: BarChart3 },
  mediagpt: { id: "mediagpt", label: "MediaGPT", icon: Bot },
  radiusBroadcast: { id: "radiusBroadcast", label: "Radius Broadcast", icon: Target },
  yieldAdvisor: { id: "yieldAdvisor", label: "Yield Advisor", icon: Gauge },
  knowledge: { id: "knowledge", label: "Knowledge", icon: Database },
  rules: { id: "rules", label: "Rules", icon: ShieldCheck },
  skillsCatalogue: { id: "skillsCatalogue", label: "Skills Catalogue", icon: Sparkles },
  skillWorkflows: { id: "skillWorkflows", label: "Skill Workflows", icon: Workflow },
  skillRuns: { id: "skillRuns", label: "Skill Runs", icon: Activity },
  modelCenter: { id: "modelCenter", label: "Model Center", icon: Cpu },
  integrations: { id: "integrations", label: "Integrations", icon: PlugZap },
  accessRoles: { id: "accessRoles", label: "Access & Roles", icon: LockKeyhole },
  auditLog: { id: "auditLog", label: "Audit Log", icon: FileText },
  edgeCompute: { id: "edgeCompute", label: "Edge & Compute", icon: HardDrive },
  campaigns: { id: "campaigns", label: "Campaigns", icon: Megaphone },
  marketplace: { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
};

const notificationPreferenceOptions: Array<{ key: NotificationPreferenceKey; label: string; helper: string }> = [
  { key: "critical", label: "Critical alerts", helper: "Safety, emergency, and urgent operator action" },
  { key: "control", label: "Control Centre", helper: "Live estate, proof-of-play, and schedule operations" },
  { key: "cms", label: "CMS", helper: "Submissions, moderation, scheduling, and bidder revisions" },
  { key: "alerts", label: "Alerts and Emergencies", helper: "Emergency checks, approvals, and broadcasts" },
  { key: "network", label: "Network and Devices", helper: "Asset health, service orders, and purchase orders" },
  { key: "financials", label: "Financials", helper: "Approvals, budget risks, and commercial decisions" },
  { key: "allocations", label: "Commercial Map", helper: "Asset allocations, availability, and commercial KPIs" },
  { key: "reports", label: "Reports & BI", helper: "Executive dashboards, exports, and regulatory reports" },
  { key: "mediagpt", label: "MediaGPT", helper: "Agent outputs and approved AI actions" },
  { key: "radiusBroadcast", label: "Radius Broadcast", helper: "Radius targeting and bulk broadcast approvals" },
  { key: "yieldAdvisor", label: "Yield Advisor", helper: "Budget placement recommendations" },
  { key: "knowledge", label: "Knowledge", helper: "Source ingestion and knowledge-base changes" },
  { key: "rules", label: "Rules", helper: "Rule changes and governance decisions" },
  { key: "campaigns", label: "Campaigns", helper: "Bidder campaign status and ADMO messages" },
  { key: "marketplace", label: "Marketplace", helper: "Bid lots, bids, and auction changes" },
  { key: "skillsCatalogue", label: "Skills Catalogue", helper: "MediaGPT skill coverage changes" },
  { key: "skillWorkflows", label: "Skill Workflows", helper: "Workflow design and approval updates" },
  { key: "skillRuns", label: "Skill Runs", helper: "Agent run completion and failures" },
  { key: "modelCenter", label: "Model Center", helper: "Model usage, cost, and routing changes" },
  { key: "integrations", label: "Integrations", helper: "API, ERP, and file-source health" },
  { key: "accessRoles", label: "Access & Roles", helper: "Access changes and role governance" },
  { key: "auditLog", label: "Audit Log", helper: "High-risk audit events" },
  { key: "edgeCompute", label: "Edge & Compute", helper: "Edge nodes, compute health, and capacity" },
];

const defaultNotificationPreferences = notificationPreferenceOptions.reduce((preferences, option) => {
  preferences[option.key] = true;
  return preferences;
}, {} as NotificationPreferences);

const navGroups: NavGroup[] = [
  { label: "Operational", pages: ["control", "cms", "alerts", "network", "financials", "allocations", "reports"] },
  { label: "Intelligence / Agentic", pages: ["mediagpt", "radiusBroadcast", "yieldAdvisor", "knowledge"] },
  { label: "Skills", pages: ["rules", "skillsCatalogue", "skillWorkflows", "skillRuns"] },
  { label: "Models", pages: ["modelCenter"] },
  { label: "Infrastructure", pages: ["integrations", "accessRoles", "auditLog", "edgeCompute"] },
  { label: "Bidder Workspace", pages: ["campaigns", "marketplace"] },
];

const stageOrder: SubmissionStage[] = ["Submitted", "In review", "Approved", "Scheduled", "Published"];

const lifecycleStages = [
  "Submission",
  "AI Screening",
  "Human Moderation",
  "Scheduling",
  "Distribution",
  "Edge Play",
  "Proof-of-Play",
  "Reconciliation",
] as const;

function lifecycleIndex(stage: SubmissionStage): number {
  if (stage === "Submitted") return 0;
  if (stage === "In review") return 2;
  if (stage === "Changes requested") return 2;
  if (stage === "Approved") return 3;
  if (stage === "Scheduled") return 4;
  if (stage === "Published") return 6;
  return 0;
}

function shortHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0").slice(0, 8);
}

const seedSubmissions: Submission[] = [
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
    contentHash: "seed",
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
    contentHash: "seed",
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
    contentHash: "seed",
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
    contentHash: "seed",
    category: "high-impact",
    journal: [],
    approvals: [],
  },
];

const seedBidderCampaigns: BidderCampaign[] = [
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
];

const seedAuctions: AuctionLot[] = [
  {
    id: "LOT-4411",
    lotName: "Corniche prime - evening rotation",
    packageName: "Airport and premium roadside",
    network: "12 panels | Corniche, Airport Road",
    flightWindow: "Jul 20 - Aug 03, 2026",
    impressions: "1.4M weekly",
    floorPrice: 380000,
    currentBid: 442000,
    leadingBidder: "Yas Tourism",
    minIncrement: 5000,
    bidCount: 7,
    closesAt: "Jul 04, 2026 | 18:00",
    creativeId: "etihad-retail",
    currency: "AED",
    status: "Open",
  },
  {
    id: "LOT-4408",
    lotName: "Downtown retail loop - weekend",
    packageName: "Downtown retail loop",
    network: "18 mall & urban panels",
    flightWindow: "Jul 12 - Jul 26, 2026",
    impressions: "790k weekly",
    floorPrice: 150000,
    currentBid: 168500,
    leadingBidder: "Retail Majlis",
    minIncrement: 2500,
    bidCount: 4,
    closesAt: "Jul 03, 2026 | 12:00",
    creativeId: "mall-footfall",
    currency: "AED",
    status: "Open",
  },
  {
    id: "LOT-4402",
    lotName: "Yas leisure loop - summer flight",
    packageName: "Yas leisure loop",
    network: "9 panels | Yas Island & hotel corridor",
    flightWindow: "Jul 15 - Aug 15, 2026",
    impressions: "620k weekly",
    floorPrice: 210000,
    currentBid: 210000,
    leadingBidder: "No bids yet",
    minIncrement: 5000,
    bidCount: 0,
    closesAt: "Jul 05, 2026 | 20:00",
    creativeId: "yas-tourism",
    currency: "AED",
    status: "Open",
  },
];



const seedSchedule: ScheduleItem[] = [
  { id: "SCH-001", time: "08:00", asset: "AD-HWY-001", campaign: "Road safety rotation", owner: "ADMO", state: "Playing" },
  { id: "SCH-002", time: "09:30", asset: "AD-BUS-022", campaign: "Yas summer promotion", owner: "Yas Tourism", state: "Queued" },
  { id: "SCH-003", time: "11:00", asset: "AD-DWT-011", campaign: "Weekend mall offer", owner: "Retail Majlis", state: "Scheduled" },
  { id: "SCH-004", time: "14:00", asset: "AD-BRG-014", campaign: "Industrial safety notice", owner: "DMT", state: "Scheduled" },
];

const seedPublished: PublishedItem[] = [
  { id: "PUB-001", campaign: "Road safety rotation", asset: "AD-HWY-001", creativeId: "road-safety", started: "08:00" },
  { id: "PUB-002", campaign: "Yas summer promotion", asset: "AD-BUS-022", creativeId: "yas-tourism", started: "09:30" },
  { id: "PUB-003", campaign: "Weekend mall offer", asset: "AD-DWT-011", creativeId: "mall-footfall", started: "11:00" },
  { id: "PUB-004", campaign: "Industrial safety notice", asset: "AD-BRG-014", creativeId: "industrial-notice", started: "14:00" },
];

const seedFinanceApprovals: FinanceApproval[] = [
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
];

const seedAlerts: EmergencyAlert[] = [
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
];

const initialVerificationSteps: VerificationStep[] = [
  { label: "Message payload", owner: "Policy engine", state: "Check required" },
  { label: "Arabic and English copy", owner: "Content reviewer", state: "Check required" },
  { label: "Authority approval", owner: "Duty officer", state: "Check required" },
  { label: "Edge cache route", owner: "CMS workflow", state: "Check required" },
];

const marketplacePackages = [
  {
    id: "airport",
    name: "Airport and premium roadside",
    reach: "1.4M weekly impressions",
    price: "From AED 380,000",
    assets: "Airport, Corniche, Yas",
    creativeId: "etihad-retail",
  },
  {
    id: "retail",
    name: "Downtown retail loop",
    reach: "790k weekly impressions",
    price: "From AED 150,000",
    assets: "Malls, parking, urban panels",
    creativeId: "mall-footfall",
  },
  {
    id: "leisure",
    name: "Yas leisure loop",
    reach: "620k weekly impressions",
    price: "From AED 210,000",
    assets: "Yas, airport route, hotels",
    creativeId: "yas-tourism",
  },
];

type Translator = (value: string) => string;

const translations: Record<string, string> = {
  // Yield advisor page
  "Screens in estate": "الشاشات في الأسطول",
  "live now": "مباشر الآن",
  "Zones covered": "المناطق المغطاة",
  "City, airport and leisure": "المدينة والمطار والترفيه",
  "Weekly reach": "الوصول الأسبوعي",
  "Estate-wide audience": "جمهور الأسطول بالكامل",
  "Working budget": "الميزانية الحالية",
  "How the advisor decides": "كيف يقرر المستشار",
  "Footfall and audience": "الحركة والجمهور",
  "Weekly reach per screen, by daypart": "الوصول الأسبوعي لكل شاشة حسب الفترة",
  "Dwell time": "زمن المكوث",
  "Slow traffic and waiting areas rank higher": "تتقدم مناطق الازدحام والانتظار في الترتيب",
  "Zone saturation": "تشبع المنطقة",
  "Budget spreads away from crowded zones": "توزع الميزانية بعيدا عن المناطق المزدحمة",
  "Rate card": "بطاقة الأسعار",
  "Projected impressions per dirham": "الانطباعات المتوقعة لكل درهم",
  "The advisor only proposes. Booking still flows through bid approvals and the standard checks, and every run is logged in the audit trail.": "المستشار يقترح فقط. يمر الحجز عبر موافقات العطاءات والفحوصات المعتادة، وتسجل كل عملية في سجل التدقيق.",
  // Knowledge and rules governance
  "Ontology entities": "كيانات النموذج المفاهيمي",
  "Shared DOOH vocabulary": "قاموس موحد للإعلانات الخارجية الرقمية",
  "Show coverage": "إظهار التغطية",
  "Hide coverage": "إخفاء التغطية",
  "Show ontology": "إظهار النموذج المفاهيمي",
  "Hide ontology": "إخفاء النموذج المفاهيمي",
  "Show details": "إظهار التفاصيل",
  "Hide details": "إخفاء التفاصيل",
  "Show tests": "إظهار الاختبارات",
  "Hide tests": "إخفاء الاختبارات",
  "Show simulator": "إظهار المحاكي",
  "Hide simulator": "إخفاء المحاكي",
  "Scenario library": "مكتبة السيناريوهات",
  "DOOH ontology": "النموذج المفاهيمي للمنصة",
  "Blocks 1-2": "الكتلتان 1-2",
  "Search sources, tags, owners": "البحث في المصادر والوسوم والمالكين",
  "Sensitivity": "الحساسية",
  "Linked entities": "الكيانات المرتبطة",
  "Citations": "الاستشهادات",
  "Tags": "الوسوم",
  "Title EN": "العنوان بالإنجليزية",
  "Title AR": "العنوان بالعربية",
  "Summary EN": "الملخص بالإنجليزية",
  "Summary AR": "الملخص بالعربية",
  "Save source": "حفظ المصدر",
  "Index source": "فهرسة المصدر",
  "Rule families": "عائلات القواعد",
  "Enabled rules": "القواعد المفعلة",
  "Drafts": "المسودات",
  "Simulation scenarios": "سيناريوهات المحاكاة",
  "Ready to test rule firing": "جاهزة لاختبار تفعيل القواعد",
  "Create rule": "إنشاء قاعدة",
  "Rule title EN": "عنوان القاعدة بالإنجليزية",
  "Rule title AR": "عنوان القاعدة بالعربية",
  "Family": "العائلة",
  "Condition EN": "الشرط بالإنجليزية",
  "Condition AR": "الشرط بالعربية",
  "Action EN": "الإجراء بالإنجليزية",
  "Save rule": "حفظ القاعدة",
  "Delete rule": "حذف القاعدة",
  "Rule simulator": "محاكي القواعد",
  "Simulation input": "مدخل المحاكاة",
  "Test input": "مدخل الاختبار",
  "Expected result": "النتيجة المتوقعة",
  "Recommendation": "التوصية",
  "Demo scenarios": "سيناريوهات العرض",
  "Rules fired": "القواعد المفعلة",
  "Knowledge cited": "المعرفة المستشهد بها",
  "Allowed action": "الإجراء المسموح",
  "Save changes": "حفظ التغييرات",
  "MediaGPT governance": "حوكمة MediaGPT",
  "Block": "منع",
  "Pass": "اجتياز",
  "English headline present, Arabic headline missing": "العنوان الإنجليزي موجود والعنوان العربي مفقود",
  "Arabic and English same message, same visual weight": "العربية والإنجليزية تحملان الرسالة نفسها وبالوزن البصري نفسه",
  "CTA 12% below highway threshold": "دعوة الإجراء أقل من حد الطريق السريع بنسبة 12%",
  "CTA passes 40m threshold": "دعوة الإجراء تتجاوز معيار الوضوح على 40 متراً",
  "Recommend bidder revision": "التوصية بطلب تعديل من المزايد",
  "No issue": "لا توجد مشكلة",
  "Motion pack without music license": "حزمة حركة من دون ترخيص موسيقى",
  "Hold approval": "تعليق الاعتماد",
  "Premium package bid below floor": "عرض الحزمة المميزة أقل من الحد الأدنى",
  "Finance review": "مراجعة مالية",
  "Two perfume brands on same highway loop 18:00": "علامتا عطور على مسار الطريق نفسه الساعة 18:00",
  "Alert has scope but no authority": "التنبيه له نطاق من دون جهة مخولة",
  "Block broadcast": "منع البث",
  "Major alert with no expiry": "تنبيه رئيسي من دون وقت انتهاء",
  "Generate default expiry": "توليد وقت انتهاء افتراضي",
  "PSU degraded on live highway asset": "مزود الطاقة متدهور على أصل طريق سريع يعمل حالياً",
  "Urgent SO recommendation": "توصية أمر خدمة عاجل",
  "PO ETA after service SLA": "موعد وصول أمر الشراء بعد مستوى خدمة الإصلاح",
  "Escalate PO": "تصعيد أمر الشراء",
  "Schedule played but edge ledger missing": "تم تشغيل الجدول لكن سجل الحافة مفقود",
  "Audit exception": "استثناء تدقيق",
  "Recommendation without source citation": "توصية من دون استشهاد بالمصدر",
  "Hide action": "إخفاء الإجراء",
  "Video with strobe effect on 100 km/h corridor": "فيديو بتأثير وميض على ممر سرعة 100 كم/س",
  "Block highway playback": "منع التشغيل على الطريق السريع",
  "Image has no rights expiry": "الصورة لا تحتوي تاريخ انتهاء الحقوق",
  "Block scheduling": "منع الجدولة",
  "Bidder tries to approve emergency broadcast": "المزايد يحاول اعتماد بث طارئ",
  "Road closure message says limited-time now": "رسالة إغلاق الطريق تستخدم صياغة تجارية عاجلة",
  "Recommend rewrite": "التوصية بإعادة الصياغة",
  "Bid has budget but no creative rights declaration": "العرض يتضمن ميزانية من دون تصريح حقوق للتصميم",
  "Draft only": "مسودة فقط",
  "Recommended target AED 300k with no objective": "هدف مقترح 300 ألف درهم من دون هدف واضح",
  "Authority contact not updated for 120 days": "جهة الاتصال المخولة غير محدثة منذ 120 يوماً",
  "Manual validation": "تحقق يدوي",
  "Critical alert shown in minor template": "تنبيه حرج معروض في قالب منخفض الأهمية",
  "Apply critical template": "تطبيق قالب حرج",
  "No telemetry for 25 minutes on live asset": "لا توجد قياسات لمدة 25 دقيقة على أصل يعمل",
  "Low confidence and refresh": "ثقة منخفضة وتحديث مطلوب",
  "5G router failed under warranty": "تعطل راوتر 5G وهو ضمن الضمان",
  "97% proof coverage against 99% contract": "تغطية إثبات 97% مقابل عقد 99%",
  "ERP changes PO ETA": "نظام ERP يغير موعد وصول أمر الشراء",
  "Notify O&M admin": "إخطار مسؤول التشغيل والصيانة",
  "Playback event has no signature": "حدث التشغيل لا يحتوي توقيعاً",
  "Reject proof event": "رفض حدث الإثبات",
  "Skill output has no model version": "مخرج المهارة لا يحتوي إصدار النموذج",
  "Route to approver": "توجيه إلى المعتمد",
  "Rewrite copy": "إعادة صياغة النص",
  "Complete bid packet": "استكمال ملف العرض",
  "Regenerate scenario": "إعادة توليد السيناريو",
  "Validate authority": "التحقق من الجهة",
  "Apply emergency template": "تطبيق قالب الطوارئ",
  "Refresh edge telemetry": "تحديث قياسات الحافة",
  "Use warranty exchange": "استخدام استبدال الضمان",
  "Open telemetry exception": "فتح استثناء قياس",
  "Notify owner": "إخطار المالك",
  "Complete AI run metadata": "استكمال بيانات تشغيل الذكاء",
  "Complete media metadata": "استكمال بيانات الأصل الإعلامي",
  "Proof-of-play settlement controls": "ضوابط تسوية إثبات التشغيل",
  "Proof coverage": "تغطية الإثبات",
  "Exception": "الاستثناء",
  "Settlement state": "حالة التسوية",
  "Ready to settle": "جاهز للتسوية",
  "Make-good recommended": "تعويض إعلاني مقترح",
  "Not yet published": "لم ينشر بعد",
  "Not started": "لم يبدأ",
  "Offer make-good": "تقديم تعويض إعلاني",
  "Send finance review": "إرسال مراجعة مالية",
  "Adjust schedule": "تعديل الجدول",
  "Create service order": "إنشاء أمر خدمة",
  "assets need action": "أصول تحتاج إلى إجراء",
  "Standard cycle": "الدورة القياسية",
  "AI actions": "إجراءات الذكاء الاصطناعي",
  "Create SO": "إنشاء أمر خدمة",
  "Notify supplier": "إخطار المورد",
  "service order drafted": "تم إعداد مسودة أمر الخدمة",
  "supplier notification queued": "تم إدراج إخطار المورد",
  "Knowledge coverage": "تغطية المعرفة",
  "Knowledge base": "قاعدة المعرفة",
  "Indexed sources": "المصادر المفهرسة",
  "Rules linked": "القواعد المرتبطة",
  "MediaGPT consumers": "مستهلكو MediaGPT",
  "Indexing queue": "قائمة الفهرسة",
  "No pending sources": "لا توجد مصادر معلقة",
  "Not mapped yet": "غير مربوط بعد",
  "Rule coverage by workflow": "تغطية القواعد حسب سير العمل",
  "Workflow stage": "مرحلة سير العمل",
  "Enforced": "إلزامية",
  "Recommended": "توصية",
  "Monitored": "مراقبة",
  "Sources linked": "المصادر المرتبطة",
  // Persona flow additions
  "Operator quick actions": "إجراءات المشغل السريعة",
  "One-click operational controls. All actions are logged.": "أدوات تشغيلية بضغطة واحدة. يتم تسجيل كل الإجراءات.",
  "Launch emergency alert": "إطلاق تنبيه طارئ",
  "Refresh edge feeds": "تحديث بث الحافة",
  "Dispatch technician": "إرسال فني",
  "Freeze schedule": "تجميد الجدول",
  "Refresh forced on all edge caches": "تم فرض التحديث على جميع ذواكر الحافة",
  "Field team dispatched to open alarms": "تم إرسال الفريق الميداني للتنبيهات المفتوحة",
  "Schedule frozen. New publishes are blocked.": "تم تجميد الجدول. النشر الجديد محظور.",
  "Bid approvals queue": "قائمة اعتماد العروض",
  "Search": "بحث",
  "Campaign or bidder": "الحملة أو المزايد",
  "of": "من",
  "No approvals match the current filters.": "لا توجد اعتمادات مطابقة للمرشحات الحالية.",
  "Previous": "السابق",
  "Next": "التالي",
  "Page": "صفحة",
  "Elevated": "مرتفع",
  "Amount": "المبلغ",
  "Margin": "الهامش",
  "Risk": "المخاطرة",
  "Decision": "القرار",
  "Approve": "اعتماد",
  "Hold": "تعليق",
  "Reject": "رفض",
  "Re-open": "إعادة فتح",
  "Pending": "قيد الانتظار",
  "Approved": "معتمد",
  "On hold": "معلّق",
  "Rejected": "مرفوض",
  "Low": "منخفض",
  "Medium": "متوسط",
  "Rate card overrides": "استثناءات بطاقة الأسعار",
  "MediaGPT deep-scan": "الفحص العميق من ميديا جي بي تي",
  "Re-run scan": "إعادة تشغيل الفحص",
  "Open deep scan": "فتح الفحص العميق",
  "Hide deep scan": "إخفاء الفحص العميق",
  "Request bidder changes": "طلب تعديلات من المعلن",
  "Prepare bidder message": "إعداد رسالة للمعلن",
  "Send revision request": "إرسال طلب تعديل",
  "Bidder communication": "مراسلة المعلن",
  "Message is sent to the advertiser workspace and updates the campaign status.": "يتم إرسال الرسالة إلى مساحة عمل المعلن وتحديث حالة الحملة.",
  "Message to bidder": "الرسالة إلى المعلن",
  "This will mark the campaign as Changes requested and make the bidder action visible in Campaigns.": "سيتم تغيير حالة الحملة إلى طلب تعديلات وإظهار الإجراء المطلوب في صفحة الحملات.",
  "Revision request sent": "تم إرسال طلب التعديل",
  "ADMO message": "رسالة مكتب أبوظبي الإعلامي",
  "action required": "إجراء مطلوب",
  "Review request": "مراجعة الطلب",
  "Upload revision": "رفع التعديل",
  "Opened request": "تم فتح الطلب",
  "Revision staged": "تم تجهيز التعديل",
  "Action required": "إجراء مطلوب",
  "Needs revision": "يتطلب تعديلاً",
  "ADMO messages": "رسائل مكتب أبوظبي الإعلامي",
  "From": "من",
  "From ADMO CMS": "من نظام إدارة المحتوى في مكتب أبوظبي الإعلامي",
  "Current status": "الحالة الحالية",
  "Bidder": "المعلن",
  "Review ADMO message and upload revised creative": "مراجعة رسالة مكتب أبوظبي الإعلامي ورفع التصميم المعدل",
  "Approve with AI clearance": "اعتماد بناءً على فحص الذكاء الاصطناعي",
  "Issue detected": "تم رصد ملاحظة",
  "Cleared": "تم الفحص",
  "Low-risk change": "تعديل منخفض المخاطر",
  "MediaGPT recommends requesting a CTA-size adjustment before approval.": "يوصي MediaGPT بطلب تعديل حجم زر الدعوة للإجراء قبل الاعتماد.",
  "No blocking issue detected.": "لم يتم رصد مانع للاعتماد.",
  "MediaGPT recommends requesting rights evidence and a bilingual copy correction before approval.": "يوصي MediaGPT بطلب إثبات الحقوق وتصحيح النص ثنائي اللغة قبل الاعتماد.",
  "MediaGPT recommends moving this approved campaign into the Yas evening leisure slot.": "يوصي MediaGPT بنقل هذه الحملة المعتمدة إلى خانة ياس المسائية الترفيهية.",
  "MediaGPT confirms the public notice is ready for protected edge distribution.": "يؤكد MediaGPT أن الإشعار العام جاهز للتوزيع المحمي على الحافة.",
  "MediaGPT is reconciling proof-of-play before final settlement.": "يطابق MediaGPT إثبات التشغيل قبل التسوية النهائية.",
  "Rights declaration missing for one image": "تصريح الحقوق مفقود لصورة واحدة",
  "Arabic copy is weaker than English headline": "النص العربي أضعف من العنوان الإنجليزي",
  "Suggested: add talent and image rights evidence": "مقترح: إضافة إثبات حقوق الصور والمواهب",
  "Yas Island inventory has clean category separation": "مخزون جزيرة ياس يحقق الفصل التصنيفي",
  "Best slot: 19:00-22:00 leisure traffic peak": "أفضل خانة: 19:00-22:00 ذروة حركة الترفيه",
  "No finance floor conflict detected": "لم يتم رصد تعارض مع حد المالية",
  "CAP-style payload complete": "حمولة بصيغة CAP مكتملة",
  "Protected edge route is available": "مسار الحافة المحمي متاح",
  "Publish window is still inside SLA": "نافذة النشر ما زالت ضمن مستوى الخدمة",
  "Signed playback events are arriving": "أحداث التشغيل الموقعة تصل",
  "One proof bundle pending reconciliation": "حزمة إثبات واحدة بانتظار المطابقة",
  "Settlement remains blocked until ledger closes": "تبقى التسوية معلقة حتى إغلاق السجل",
  "Show AI details": "إظهار تفاصيل الذكاء",
  "Hide AI details": "إخفاء تفاصيل الذكاء",
  "Run MediaGPT check": "تشغيل فحص MediaGPT",
  "View proof status": "عرض حالة الإثبات",
  "Scheduling recommendation": "توصية الجدولة",
  "Distribution readiness": "جاهزية التوزيع",
  "Proof reconciliation": "مطابقة إثبات التشغيل",
  "Detailed MediaGPT scan": "الفحص التفصيلي من MediaGPT",
  "AI-assisted": "مدعوم بالذكاء الاصطناعي",
  "Brand safety": "أمان العلامة",
  "Cultural sensitivity": "الحساسية الثقافية",
  "Arabic accuracy": "دقة اللغة العربية",
  "Legibility at 40m": "الوضوح على مسافة 40م",
  "Copyright match": "مطابقة حقوق الملكية",
  "Rights evidence": "إثبات الحقوق",
  "Audience fit": "ملاءمة الجمهور",
  "Package fit": "ملاءمة الحزمة",
  "Budget floor": "الحد الأدنى للميزانية",
  "Category separation": "الفصل بين الفئات",
  "Authority match": "مطابقة الجهة المعتمدة",
  "SLA readiness": "جاهزية مستوى الخدمة",
  "Edge route": "مسار الحافة",
  "Ledger integrity": "سلامة السجل",
  "Playback match": "مطابقة التشغيل",
  "No prohibited symbols detected": "لا توجد رموز محظورة",
  "Arabic RTL punctuation validated": "تم التحقق من علامات الترقيم العربية",
  "Contrast ratio 4.9:1 (min 4.5)": "نسبة التباين 4.9:1 (الحد الأدنى 4.5)",
  "Suggested: enlarge CTA by 12% for highway assets": "مقترح: تكبير زر الإجراء بنسبة 12% لأصول الطرق السريعة",
  "Reviewer notes": "ملاحظات المراجع",
  "Add a note for the bidder or ops team": "أضف ملاحظة للمعلن أو فريق العمليات",
  "Post note": "نشر الملاحظة",
  "Return to intake": "إعادة إلى الاستقبال",
  "Broadcast now": "بث الآن",
  "Reset": "إعادة تعيين",
  "MediaGPT emergency verification": "تحقق MediaGPT للطوارئ",
  "Checks bilingual payload, authority, SLA, and edge route before broadcast.": "يفحص الرسالة باللغتين، والجهة المعتمدة، ومستوى الخدمة، ومسار الحافة قبل البث.",
  "Ready for approval": "جاهز للاعتماد",
  "Run MediaGPT checks": "تشغيل فحوصات MediaGPT",
  "Reports & BI": "التقارير وذكاء الأعمال",
  "Regulatory and operational reports": "تقارير تنظيمية وتشغيلية",
  "Export for CSC, ADMO, MRO, NCEMA": "تصدير لـ CSC وADMO وMRO وNCEMA",
  "Report": "التقرير",
  "Rows": "الصفوف",
  "Export": "تصدير",
  "Reports respect RBAC and tenant scoping; exports reflect the current live platform state.": "تحترم التقارير صلاحيات الوصول ونطاق المستأجر؛ وتعكس الصادرات الحالة الحية للمنصة.",
  "Remote display control (kill switch)": "التحكم عن بُعد بالشاشات (مفتاح الإيقاف)",
  "blanked": "معطّلة",
  "All live": "الكل يعمل",
  "Per asset": "لكل أصل",
  "Per zone": "لكل منطقة",
  "Emirate-wide": "على مستوى الإمارة",
  "Reason code": "رمز السبب",
  "Maintenance / incident / directive": "صيانة / حادث / توجيه",
  "Target SLA": "مستوى الخدمة المستهدف",
  "I confirm dual-control authorisation for an emirate-wide blackout": "أؤكد التفويض بالرقابة المزدوجة لإيقاف على مستوى الإمارة",
  "Blank displays": "تعطيل الشاشات",
  "Re-enable all": "إعادة تفعيل الكل",
  "Re-enable": "إعادة تفعيل",
  "Emergency alert live on network": "التنبيه الطارئ مباشر على الشبكة",
  "Alert reset. Re-run checks.": "تم إعادة تعيين التنبيه. أعد تشغيل الفحوصات.",
  "Live on network": "مباشر على الشبكة",
  "Notifications": "الإشعارات",
  "Switch to light mode": "التبديل إلى الوضع الفاتح",
  "Switch to dark mode": "التبديل إلى الوضع الداكن",
  "Fleet online": "الأسطول المتصل",
  "Proof of play": "إثبات العرض",
  "min ago": "دقيقة مضت",
  "Handle": "معالجة",
  "More": "المزيد",
  "Now": "الآن",
  "Queue": "قائمة الانتظار",
  "Start time": "وقت البدء",
  "End time": "وقت الانتهاء",
  "Server": "الخادم",
  "New Chat": "محادثة جديدة",
  "New dialog": "حوار جديد",
  "Fault": "عطل",
  "Killed": "موقوف",
  "Summarize shift": "تلخيص المناوبة",
  "Show latest alert": "عرض آخر تنبيه",
  "Civic road safety rotation": "تناوب السلامة المرورية المدنية",
  "Nothing queued. Approved campaigns appear here before playout.": "لا توجد حملات في الانتظار. تظهر الحملات المعتمدة هنا قبل العرض.",
  "Open live view": "فتح العرض المباشر",
  "Ask MediaGPT anything, or type @ to mention": "اسأل MediaGPT أي شيء، أو اكتب @ للإشارة",
  "Notification center": "مركز الإشعارات",
  "unread": "غير مقروء",
  "All caught up": "لا توجد إشعارات جديدة",
  "Mark all read": "تعليم الكل كمقروء",
  "Mark read": "تعليم كمقروء",
  "No notifications yet": "لا توجد إشعارات بعد",
  "Workflow events will appear here.": "ستظهر أحداث سير العمل هنا.",
  "Open notification": "فتح الإشعار",
  "Notifications marked read": "تم تعليم الإشعارات كمقروءة",
  "This notification belongs to another workspace": "هذا الإشعار مرتبط بمساحة عمل أخرى",
  "New CMS submission": "طلب جديد في إدارة المحتوى",
  "Finance approval pending": "اعتماد مالي معلق",
  "Campaign submitted": "تم إرسال الحملة",
  "Auction bid submitted": "تم إرسال عرض مزايدة",
  "Bid recorded": "تم تسجيل العرض",
  "ADMO review started": "بدأت مراجعة مكتب أبوظبي الإعلامي",
  "Campaign approved": "تم اعتماد الحملة",
  "Campaign scheduled": "تمت جدولة الحملة",
  "Campaign live": "الحملة مباشرة",
  "Revision requested": "تعديلات مطلوبة",
  "Bidder revision requested": "تم طلب تعديل من المعلن",
  "Schedule item playing": "تم تشغيل عنصر الجدولة",
  "Emergency alert created": "تم إنشاء تنبيه طارئ",
  "Emergency checks complete": "اكتملت فحوصات الطوارئ",
  "Emergency live": "الطوارئ مباشرة",
  "Emergency checks reset": "تمت إعادة فحوصات الطوارئ",
  "Finance decision posted": "تم نشر القرار المالي",
  "CMS review waiting": "مراجعة إدارة المحتوى بانتظار الإجراء",
  "Emergency checks required": "فحوصات الطوارئ مطلوبة",
  "notification.body.New CMS submission": "{subject} جاهزة لمراجعة المحتوى.",
  "notification.body.Finance approval pending": "{subject} بانتظار الاعتماد المالي.",
  "notification.body.Campaign submitted": "تم إرسال {subject} إلى إدارة المحتوى في مكتب أبوظبي الإعلامي.",
  "notification.body.Auction bid submitted": "تم إرسال عرض مزايدة جديد مرتبط بـ {subject}.",
  "notification.body.Bid recorded": "تم تسجيل عرض {subject} في مساحة المعلن.",
  "notification.body.ADMO review started": "بدأت مراجعة إدارة المحتوى للحملة {subject}.",
  "notification.body.Campaign approved": "تم اعتماد {subject} وهي جاهزة للجدولة.",
  "notification.body.Campaign scheduled": "تمت جدولة {subject} للتشغيل على الشبكة.",
  "notification.body.Campaign live": "{subject} أصبحت مباشرة على شبكة الإعلانات الخارجية.",
  "notification.body.Revision requested": "أرسل مكتب أبوظبي الإعلامي تعديلات مطلوبة للحملة {subject}.",
  "notification.body.Bidder revision requested": "{subject} بانتظار تعديلات المعلن.",
  "notification.body.Schedule item playing": "بدأ تشغيل {subject} على أحد الأصول.",
  "notification.body.Emergency alert created": "{subject} بانتظار فحوصات MediaGPT.",
  "notification.body.Emergency checks complete": "{subject} جاهز للاعتماد أو البث.",
  "notification.body.Emergency broadcast queued": "تم وضع {subject} في قائمة بث الطوارئ.",
  "notification.body.Emergency live": "{subject} مباشر الآن على شبكة الإعلانات الخارجية.",
  "notification.body.Emergency checks reset": "يجب إعادة فحص {subject} قبل البث.",
  "notification.body.Finance decision posted": "تم نشر القرار المالي الخاص بـ {subject}.",
  "notification.body.CMS review waiting": "{subject} يحتاج إلى مراجعة إدارة المحتوى.",
  "notification.body.Emergency checks required": "{subject} يتطلب تشغيل فحوصات الطوارئ.",
  // Wizard
  "Submit a complete bid packet to ADMO CMS": "إرسال ملف عرض متكامل إلى نظام إدارة المحتوى",
  "Brand": "العلامة التجارية",
  "Creative pack": "الحزمة الإبداعية",
  "Targeting": "الاستهداف",
  "Schedule and budget": "الجدولة والميزانية",
  "Compliance": "الامتثال",
  "Review": "المراجعة",
  "Campaign name": "اسم الحملة",
  "Vertical": "القطاع",
  "Primary objective": "الهدف الرئيسي",
  "Describe what success looks like for this campaign.": "صف كيف يبدو النجاح لهذه الحملة.",
  "Contact": "جهة الاتصال",
  "Email": "البريد الإلكتروني",
  "Illustrations, motion, and static assets. Arabic + English required.": "الرسوم والحركة والأصول الثابتة. اللغتان العربية والإنجليزية مطلوبتان.",
  "Add asset": "إضافة أصل",
  "Remove": "إزالة",
  "Preview illustration for CMS": "معاينة الرسم لنظام إدارة المحتوى",
  "Languages": "اللغات",
  "Target audience": "الجمهور المستهدف",
  "Target zones": "المناطق المستهدفة",
  "Daypart": "الفترة اليومية",
  "Expected reach": "الوصول المتوقع",
  "Package": "الحزمة",
  "Total budget": "الميزانية الإجمالية",
  "Start": "البداية",
  "End": "النهاية",
  "Priority": "الأولوية",
  "UAE Media Council compliant": "متوافق مع مجلس الإعلام الإماراتي",
  "Arabic copy proof-read by native reviewer": "تدقيق النص العربي من قبل مراجع أصلي",
  "Music, imagery and talent rights cleared": "حقوق الموسيقى والصور والمواهب مصفاة",
  "No political or restricted content": "لا يوجد محتوى سياسي أو مقيد",
  "All items must be confirmed. ADMO will re-verify via MediaGPT deep-scan.": "يجب تأكيد جميع البنود. سيقوم أدمو بالتحقق مجدداً عبر الفحص العميق.",
  "Campaign name and brand are required before continuing.": "اسم الحملة والعلامة التجارية مطلوبان قبل المتابعة.",
  "Confirm all compliance items to continue.": "أكد جميع بنود الامتثال للمتابعة.",
  "Cancel": "إلغاء",
  "Back": "رجوع",
  "Continue": "متابعة",
  "Submit to ADMO": "إرسال إلى أدمو",
  "Close": "إغلاق",
  "Full screen": "ملء الشاشة",
  "Close full screen": "إغلاق ملء الشاشة",
  "Corniche": "الكورنيش",
  "Downtown": "وسط المدينة",
  "Yas Island": "جزيرة ياس",
  "Al Ain gateways": "بوابات العين",
  "Airport road": "طريق المطار",
  "Reem Island": "جزيرة الريم",

  "Unified DOOH Platform": "منصة الإعلانات الخارجية الرقمية الموحدة",
  "DOOH": "الإعلانات الخارجية الرقمية",
  "Unified Platform": "المنصة الموحدة",
  "Access profile": "ملف الدخول",
  "Choose who is using the platform. The sidebar and workflow are permissioned from this point.": "اختر ملف المستخدم. ستظهر القوائم وسير العمل حسب الصلاحيات من هذه النقطة.",
  "Switch profile": "تغيير الملف",
  "Powered by": "مشغّل بواسطة",
  "Control Centre": "مركز التحكم",
  "CMS": "إدارة المحتوى",
  "Alerts and Emergencies": "التنبيهات والطوارئ",
  "Network and Devices": "الشبكة والأجهزة",
  "MediaGPT Suite": "حزمة MediaGPT",
  "MediaGPT": "MediaGPT",
  "Financials": "الماليات",
  "Campaigns": "الحملات",
  "Marketplace": "السوق",
  "Operations": "العمليات",
  "Content": "المحتوى",
  "Commercial": "التجاري",
  "Platform": "المنصة",
  "Bidder Workspace": "مساحة المزايد",
  "Bidder workspace": "مساحة المزايد",
  "Primary": "القائمة الرئيسية",
  "Abu Dhabi Media Office": "مكتب أبوظبي الإعلامي",
  "External partner": "شريك خارجي",
  "ADMO Control Room": "غرفة تحكم مكتب أبوظبي الإعلامي",
  "Operations operator": "مشغل العمليات",
  "ADMO Content Reviewer": "مراجع محتوى مكتب أبوظبي الإعلامي",
  "CMS reviewer": "مراجع إدارة المحتوى",
  "ADMO Finance": "فريق مالية مكتب أبوظبي الإعلامي",
  "Commercial finance": "المالية التجارية",
  "Platform Admin": "مدير المنصة",
  "Platform governance": "حوكمة المنصة",
  "Technical Platform Owner": "مالك المنصة التقني",
  "Technical layers": "الطبقات التقنية",
  "Advertiser": "معلن",
  "Bidder account": "حساب مزايد",
  "Intelligence / Agentic": "الذكاء / الوكلاء",
  "Models": "النماذج",
  "Infrastructure": "البنية التحتية",
  "Knowledge": "المعرفة",
  "Knowledge Base": "قاعدة المعرفة",
  "Rules": "القواعد",
  "Skills Catalogue": "كتالوج المهارات",
  "Skill Workflows": "سير عمل المهارات",
  "Skill Runs": "تشغيلات المهارات",
  "Model Center": "مركز النماذج",
  "Access & Roles": "الصلاحيات والأدوار",
  "Audit Log": "سجل التدقيق",
  "Edge & Compute": "الحافة والحوسبة",

  "Assets live": "الأصول النشطة",
  "Screens currently playing": "الشاشات التي تعمل الآن",
  "Proof-of-play": "إثبات التشغيل",
  "Signed playback evidence": "أدلة تشغيل موقعة",
  "Open alarms": "الإنذارات المفتوحة",
  "Operations follow-up": "متابعة العمليات",
  "Queued campaigns": "الحملات في قائمة الانتظار",
  "Approved or scheduled": "معتمدة أو مجدولة",
  "Live map": "الخريطة المباشرة",
  "Live view": "العرض المباشر",
  "Healthy": "سليم",
  "Degraded": "متدهور",
  "Faulty": "متعطل",
  "Zones": "المناطق",
  "Asset board": "لوحة الأصول",
  "Asset": "الأصل",
  "Status": "الحالة",
  "Next slot": "الخانة التالية",
  "live": "نشطة",
  "need attention": "تحتاج متابعة",
  "Playing": "قيد التشغيل",
  "Live": "نشط",
  "Warning": "تحذير",
  "Offline": "غير متصل",
  "Maintenance": "صيانة",
  "Resolved": "مغلق",
  "Open": "مفتوح",
  "Acknowledged": "تمت المتابعة",
  "Live estate map": "خريطة الأصول المباشرة",
  "Live map tiles are unavailable offline - showing the schematic estate view.": "تعذر تحميل الخريطة المباشرة دون اتصال. يتم عرض مخطط الأصول.",

  "Submissions": "الطلبات",
  "Active CMS queue": "قائمة إدارة المحتوى النشطة",
  "Approval rate": "معدل الاعتماد",
  "Approved or beyond": "معتمد أو في مرحلة لاحقة",
  "Last 7 days": "آخر 7 أيام",
  "New bidder files": "ملفات مزايدين جديدة",
  "Needs review": "يتطلب مراجعة",
  "Reviewer action required": "إجراء مطلوب من المراجع",
  "Media Library": "مكتبة الوسائط",
  "Scheduling": "الجدولة",
  "items": "عناصر",
  "Start review": "بدء المراجعة",
  "Request changes": "طلب تعديلات",
  "Add to schedule": "إضافة إلى الجدول",
  "Publish": "نشر",
  "Published to network": "تم النشر على الشبكة",
  "Waiting for bidder revision": "بانتظار تعديل المزايد",
  "Owner": "المالك",
  "Budget": "الميزانية",
  "Language": "اللغة",
  "Submitted": "مقدم",
  "In review": "قيد المراجعة",
  "Scheduled": "مجدول",
  "Published": "منشور",
  "Changes requested": "تم طلب تعديلات",
  "High": "مرتفع",
  "All": "الكل",
  "Image": "صورة",
  "Video": "فيديو",
  "Document": "مستند",
  "Live Stream": "بث مباشر",
  "Upload media": "رفع وسائط",
  "Uploaded creative pack": "حزمة إبداعية مرفوعة",
  "Media upload staged for CMS review.": "تم تجهيز الوسائط المرفوعة لمراجعة إدارة المحتوى.",
  "Pending Review": "بانتظار المراجعة",
  "Play now": "تشغيل الآن",
  "Queued": "في الانتظار",

  "Ongoing alerts": "التنبيهات الجارية",
  "Active or queued": "نشطة أو في الانتظار",
  "SLA health": "التزام مستوى الخدمة",
  "Emergency response": "استجابة الطوارئ",
  "Time to display": "زمن العرض",
  "Average last 24h": "متوسط آخر 24 ساعة",
  "Awaiting checks": "بانتظار الفحوصات",
  "Needs action": "يتطلب إجراء",
  "Active alerts": "التنبيهات النشطة",
  "Alert": "التنبيه",
  "Scope": "النطاق",
  "Authority": "الجهة",
  "SLA": "مستوى الخدمة",
  "Create alert": "إنشاء تنبيه",
  "Title": "العنوان",
  "Weather alert broadcast": "بث تنبيه الطقس",
  "Arabic and English emergency message": "رسالة طوارئ بالعربية والإنجليزية",
  "Criticality": "درجة الأهمية",
  "Critical": "حرج",
  "Major": "كبير",
  "Minor": "ثانوي",
  "Run checks": "تشغيل الفحوصات",
  "Queue broadcast": "إدراج البث",
  "Check required": "يتطلب فحصاً",
  "Checked": "تم الفحص",
  "Approval required": "يتطلب اعتماداً",
  "Broadcast queued": "البث في قائمة الانتظار",
  "Broadcasting": "جار البث",
  "Message payload": "حمولة الرسالة",
  "Policy engine": "محرك السياسات",
  "Arabic and English copy": "النص العربي والإنجليزي",
  "Content reviewer": "مراجع المحتوى",
  "Authority approval": "اعتماد الجهة",
  "Duty officer": "ضابط المناوبة",
  "Edge cache route": "مسار التخزين الطرفي",
  "CMS workflow": "سير عمل إدارة المحتوى",
  "Estate-wide": "على كامل الشبكة",
  "Public": "الجمهور",
  "Default 2 hours": "الافتراضي ساعتان",

  "Assets": "الأصول",
  "Registered devices": "الأجهزة المسجلة",
  "Connectivity": "الاتصال",
  "Live or reachable": "نشط أو قابل للوصول",
  "Workbench load": "حمل منصة العمل",
  "Service tasks": "مهام الخدمة",
  "Spare parts": "قطع الغيار",
  "Open purchase orders": "أوامر شراء مفتوحة",
  "14 POs": "14 أمر شراء",
  "Tracked procurement": "مشتريات متتبعة",
  "Asset registry": "سجل الأصول",
  "Asset digital twin (3D)": "التوأم الرقمي للأصل (ثلاثي الأبعاد)",
  "Asset operations": "عمليات الأصول",
  "Registry and 3D digital twin": "السجل والتوأم الرقمي ثلاثي الأبعاد",
  "Maintenance workbench": "منصة عمل الصيانة",
  "Field tasks and repair lanes": "مهام الميدان ومسارات الإصلاح",
  "Supply chain": "سلسلة الإمداد",
  "BoM, POs and SOs": "قائمة المواد وأوامر الشراء وأوامر الخدمة",
  "BoM, service orders and POs": "قائمة المواد وأوامر الخدمة وأوامر الشراء",
  "AI recommendations enabled": "توصيات الذكاء الاصطناعي مفعلة",
  "service tasks": "مهام خدمة",
  "BOM items": "عناصر قائمة المواد",
  "Open SOs": "أوامر الخدمة المفتوحة",
  "Open POs": "أوامر الشراء المفتوحة",
  "Next PO ETA": "موعد وصول أمر الشراء التالي",
  "AI recommendation": "توصية الذكاء الاصطناعي",
  "Expanded BoM and work orders": "قائمة المواد وأوامر العمل المفصلة",
  "Component": "المكوّن",
  "Qty": "الكمية",
  "PO / ETA": "أمر الشراء / الوصول المتوقع",
  "SO / step": "أمر الخدمة / المرحلة",
  "Operational": "تشغيلي",
  "Attention": "يتطلب متابعة",
  "Procurement risk": "مخاطر توريد",
  "Available in depot": "متاح في المستودع",
  "Ordered from supplier": "مطلوب من المورد",
  "Reserved for field team": "محجوز للفريق الميداني",
  "Warranty exchange": "استبدال ضمن الضمان",
  "No PO required": "لا يتطلب أمر شراء",
  "N/A": "غير منطبق",
  "Panel health inspection": "فحص حالة اللوحة",
  "Preventive maintenance scheduled": "صيانة وقائية مجدولة",
  "Thermal inspection in progress": "فحص حراري قيد التنفيذ",
  "Controller replacement queued": "استبدال وحدة التحكم في قائمة الانتظار",
  "Awaiting vendor confirmation": "بانتظار تأكيد المورد",
  "Technician dispatch": "إرسال فني",
  "Part received": "تم استلام القطعة",
  "Close-out evidence": "أدلة الإغلاق",
  "Keep current preventive plan. Bundle LED cabinet checks with next quarterly visit.": "الإبقاء على خطة الوقاية الحالية ودمج فحص خزائن LED مع الزيارة الفصلية التالية.",
  "Prioritize controller swap before weekend campaigns; PO date is the delivery risk.": "إعطاء أولوية لاستبدال وحدة التحكم قبل حملات نهاية الأسبوع؛ تاريخ أمر الشراء هو نقطة المخاطر.",
  "Dispatch technician after router arrives; keep asset in maintenance rotation until SO close-out.": "إرسال الفني بعد وصول الموجه؛ إبقاء الأصل ضمن دورة الصيانة حتى إغلاق أمر الخدمة.",
  "Group power supply replacement with adjacent Al Ain asset to reduce truck roll.": "تجميع استبدال مزود الطاقة مع أصل العين المجاور لتقليل الزيارات الميدانية.",
  "No action: keep in standard preventive cycle.": "لا إجراء: الإبقاء ضمن دورة الوقاية القياسية.",
  "Replace during next low-traffic window.": "الاستبدال خلال نافذة حركة منخفضة قادمة.",
  "Escalate PO confirmation if supplier does not acknowledge by 17:00.": "تصعيد تأكيد أمر الشراء إذا لم يؤكد المورد قبل 17:00.",
  "Use reserved stock; avoid opening a new PO.": "استخدام المخزون المحجوز وتجنب فتح أمر شراء جديد.",
  "Attach thermal images before closing SO.": "إرفاق الصور الحرارية قبل إغلاق أمر الخدمة.",
  "Run remote diagnostics before technician dispatch.": "تشغيل التشخيص عن بعد قبل إرسال الفني.",
  "Hold publish-heavy schedule until controller replacement is complete.": "تعليق الجدولة كثيفة النشر حتى اكتمال استبدال وحدة التحكم.",
  "Keep vendor replacement under warranty claim.": "إبقاء الاستبدال لدى المورد ضمن مطالبة الضمان.",
  "Device model": "نموذج الجهاز",
  "Selected part": "الجزء المحدد",
  "Network": "الشبكة",
  "Resolution": "الدقة",
  "Temperature": "درجة الحرارة",
  "Cache": "التخزين المؤقت",
  "Address": "العنوان",
  "Item": "البند",
  "State": "الحالة",
  "PO": "أمر الشراء",
  "Order": "الأمر",
  "Available": "متاح",
  "Ordered": "تم طلبه",
  "Reserved": "محجوز",
  "Technician assigned": "تم تعيين فني",
  "Awaiting controller": "بانتظار وحدة التحكم",
  "Completed": "مكتمل",
  "Pending Assignment": "بانتظار الإسناد",
  "Pending Execution": "بانتظار التنفيذ",
  "In Progress": "قيد التنفيذ",
  "Overdue": "متأخر",
  "LED cabinet": "خزانة LED",
  "Edge controller": "وحدة التحكم الطرفية",
  "Power supply": "مزود الطاقة",
  "5G router": "موجه الجيل الخامس",
  "LED module batch": "دفعة وحدات LED",
  "Thermal sensor kit": "حزمة حساس حراري",
  "Main breaker": "قاطع رئيسي",
  "Router antenna": "هوائي الموجه",
  "Cooling fan kit": "حزمة مراوح تبريد",
  "Media player": "مشغل الوسائط",
  "Asset unit": "وحدة الأصل",

  "Agents active": "الوكلاء النشطون",
  "Governed platform agents": "وكلاء المنصة المحكومون",
  "Saved outputs": "المخرجات المحفوظة",
  "Dashboards, tables, drafts": "لوحات، جداول، مسودات",
  "Human approvals": "الاعتمادات البشرية",
  "Required before execution": "مطلوبة قبل التنفيذ",
  "Arabic QA": "ضمان جودة العربية",
  "Copy parity checks": "فحوصات تطابق النص",
  "Agents": "الوكلاء",
  "Mandatory": "إلزامي",
  "Advanced": "متقدم",
  "Optional": "اختياري",
  "Discover": "استكشاف",
  "Command": "أمر",
  "Create": "إنشاء",
  "Protect": "حماية",

  "Booked revenue": "الإيرادات المحجوزة",
  "Current quarter": "الربع الحالي",
  "Budget consumed": "الميزانية المستهلكة",
  "Against civic and commercial targets": "مقارنة بالأهداف المدنية والتجارية",
  "Receivables": "المستحقات",
  "Open invoices": "الفواتير المفتوحة",
  "Yield gap": "فجوة العائد",
  "Scenario target": "هدف السيناريو",
  "Budget and revenue breakdown": "تفصيل الميزانية والإيرادات",
  "Bid scenario": "سيناريو المزايدة",
  "Segment": "الشريحة",
  "Actual": "الفعلي",
  "Variance": "الانحراف",
  "Campaign budget": "ميزانية الحملة",
  "Demand pressure": "ضغط الطلب",
  "Strategic discount": "الخصم الاستراتيجي",
  "Recommended target": "الهدف المقترح",
  "Current portfolio": "المحفظة الحالية",
  "Live or published": "نشط أو منشور",
  "On network": "على الشبكة",
  "ADMO action": "إجراء مكتب أبوظبي الإعلامي",
  "Estimated reach": "الوصول المتوقع",
  "Next step": "الخطوة التالية",
  "Budget target": "الميزانية المستهدفة",
  "Submit campaign": "إرسال الحملة",
  "New campaign brief": "موجز حملة جديد",
  "Arabic and English creative uploaded": "تم رفع تصميم عربي وإنجليزي",
  "From AED 380,000": "ابتداءً من 380,000 درهم",
  "From AED 150,000": "ابتداءً من 150,000 درهم",
  "From AED 210,000": "ابتداءً من 210,000 درهم",

  "Open auctions": "المزادات المفتوحة",
  "Fixed-rate packages": "الباقات بسعر ثابت",
  "Buy without bidding": "شراء دون مزايدة",
  "Live inventory lots": "لوطات معروضة مباشرة",
  "Across current lots": "عبر اللوطات الحالية",
  "Total bids": "إجمالي المزايدات",
  "This bidding cycle": "دورة المزايدة الحالية",
  "Highest bid": "أعلى مزايدة",
  "Current bid": "المزايدة الحالية",
  "Leading": "المتصدر",
  "Floor": "السعر الأدنى",
  "bids": "مزايدات",
  "Closes": "ينتهي",
  "Min increment": "أدنى زيادة",
  "Minimum bid": "الحد الأدنى للمزايدة",
  "Your bid": "مزايدتك",
  "Place bid": "تقديم مزايدة",
  "Bidding": "قيد المزايدة",
  "Active bids": "المزايدات النشطة",
  "Auctions in progress": "مزادات جارية",
  "No bids yet": "لا توجد مزايدات بعد",
  "Corniche prime - evening rotation": "الكورنيش الرئيسي - دورة المساء",
  "Downtown retail loop - weekend": "مسار التجزئة في وسط المدينة - نهاية الأسبوع",
  "Yas leisure loop - summer flight": "مسار ياس الترفيهي - الرحلة الصيفية",
  "12 panels | Corniche, Airport Road": "12 شاشة | الكورنيش، طريق المطار",
  "18 mall & urban panels": "18 شاشة في المولات والمناطق الحضرية",
  "9 panels | Yas Island & hotel corridor": "9 شاشات | جزيرة ياس وممر الفنادق",
  "Jul 20 - Aug 03, 2026": "20 يوليو - 3 أغسطس 2026",
  "Jul 12 - Jul 26, 2026": "12 يوليو - 26 يوليو 2026",
  "Jul 15 - Aug 15, 2026": "15 يوليو - 15 أغسطس 2026",
  "1.4M weekly": "1.4 مليون أسبوعياً",
  "790k weekly": "790 ألف أسبوعياً",
  "620k weekly": "620 ألف أسبوعياً",
  "Jul 04, 2026 | 18:00": "4 يوليو 2026 | 18:00",
  "Jul 03, 2026 | 12:00": "3 يوليو 2026 | 12:00",
  "Jul 05, 2026 | 20:00": "5 يوليو 2026 | 20:00",



  "Models online": "النماذج المتصلة",
  "Vision, language, anomaly": "رؤية، لغة، شذوذ",
  "Token spend": "استهلاك الرموز",
  "Month to date": "من بداية الشهر",
  "Skills deployed": "المهارات المنشورة",
  "Agent capabilities": "قدرات الوكلاء",
  "Integrations": "التكاملات",
  "APIs, ERP, files": "واجهات API، أنظمة ERP، ملفات",
  "Model consumption": "استهلاك النماذج",
  "Model": "النموذج",
  "Use": "الاستخدام",
  "Tokens": "الرموز",
  "Cost": "التكلفة",
  "Skills": "المهارات",
  "Data integrations": "تكاملات البيانات",
  "Source": "المصدر",
  "Type": "النوع",

  "Ask MediaGPT": "اسأل MediaGPT",
  "Live AI": "ذكاء اصطناعي مباشر",
  "Offline fallback": "إجابة احتياطية دون اتصال",
  "Auction desk": "مكتب المزادات",
  "First-price, deterministic, audited": "بالسعر الأول، حتمي، مدقق",
  "Close auction": "إغلاق المزاد",
  "Confirm payment": "تأكيد الدفع",
  "Simulate failure": "محاكاة فشل الدفع",
  "Leading bid": "العرض المتصدر",
  "Cleared at": "رسا عند",
  "Awarded": "تمت الترسية",
  "Awarded to": "رست على",
  "No fill": "بدون ترسية",
  "Closed with no fill": "أغلق دون ترسية",
  "Awaiting payment": "بانتظار الدفع",
  "Booked": "محجوز",
  "Released": "أفرج عنه",
  "Billed": "تمت الفوترة",
  "Paid": "مدفوع",
  "Issued": "صادرة",
  "Void": "ملغاة",
  "Booking": "الحجز",
  "Bookings": "الحجوزات",
  "Invoice": "الفاتورة",
  "Invoices": "الفواتير",
  "Receipt": "إيصال",
  "Net": "الصافي",
  "VAT 5%": "ضريبة القيمة المضافة 5%",
  "Total": "الإجمالي",
  "Pipeline": "خط النشر",
  "Scheduling locked until payment": "الجدولة مقفلة حتى الدفع",
  "Slot returned to auction": "أعيدت الفترة إلى المزاد",
  "Creative in governed review as": "التصميم قيد المراجعة المحوكمة برقم",
  "My bookings and invoices": "حجوزاتي وفواتيري",
  "Booked to Paid, reconciled against proof-of-play": "من الحجز إلى الدفع، مطابقة مع إثبات العرض",
  "Pay the invoice to unlock scheduling": "ادفع الفاتورة لفتح الجدولة",
  "Awaiting playout": "بانتظار العرض",
  "Lot": "الفترة المعروضة",
  "Flight window": "نافذة الحملة",
  "Commercial Map": "الخريطة التجارية",
  "Commercial operations map": "خريطة العمليات التجارية",
  "Allocation status by asset": "حالة التخصيص حسب الأصل",
  "Allocated": "مخصص",
  "In bidding": "قيد المزايدة",
  "Under maintenance": "قيد الصيانة",
  "Allocation register": "سجل التخصيصات",
  "Long-term contracts per RFP FIN-101": "عقود طويلة الأجل وفق متطلب FIN-101",
  "Contracted value": "القيمة المتعاقد عليها",
  "Allocated assets": "الأصول المخصصة",
  "Available now": "متاح الآن",
  "Sellable at rate card": "قابل للبيع بسعر التعرفة",
  "Live auction": "مزاد مباشر",
  "Operator": "المشغل",
  "Contract": "العقد",
  "Annual value": "القيمة السنوية",
  "Revenue to date": "الإيرادات حتى الآن",
  "Rate card / week": "التعرفة الأسبوعية",
  "Share of voice": "حصة الظهور",
  "Public split target": "النسبة العامة المستهدفة",
  "Public split actual": "النسبة العامة الفعلية",
  "Permitted categories": "الفئات المسموح بها",
  "Fixed slots": "فترات ثابتة",
  "Variable share-of-voice": "حصة ظهور مرنة",
  "Open faults": "الأعطال المفتوحة",
  "floor": "الحد الأدنى",
  "week": "أسبوع",
  "Active allocation contracts": "عقود التخصيص النشطة",
  "Reconcile against PoP": "مطابقة مع إثبات العرض",
  "Close settlement": "إغلاق التسوية",
  "Verify hash chain": "التحقق من سلسلة التجزئة",
  "Verifying chain": "جارٍ التحقق من السلسلة",
  "Chain verified": "تم التحقق من السلسلة",
  "Chain broken at": "السلسلة مكسورة عند",
  "signed records": "سجلات موقعة",
  "Seq": "التسلسل",
  "Kind": "النوع",
  "Played at": "وقت العرض",
  "Evidence": "الدليل",
  "Hash": "التجزئة",
  "commercial": "تجاري",
  "civic": "مدني",
  "emergency": "طوارئ",
  "TPM-signed (simulated)": "موقع عبر TPM (محاكاة)",
  "Scheduled for playout": "مجدول للعرض",
  "Played, awaiting PoP reconciliation": "تم العرض، بانتظار مطابقة الإثبات",
  "Delivery reconciled, settlement closing": "تمت مطابقة التسليم، التسوية قيد الإغلاق",
  "Settled and revenue recognised": "تمت التسوية والاعتراف بالإيراد",
  "Long-term operator contracts": "عقود المشغلين طويلة الأجل",
  "Live auction lots on assets": "فترات مزاد مباشرة على الأصول",
  "Rules engine simulator": "محاكي محرك القواعد",
  "Server-enforced, deterministic": "مُطبّق على الخادم، حتمي",
  "Content category": "فئة المحتوى",
  "Requester tier": "مستوى مقدّم الطلب",
  "Evaluate booking": "تقييم الحجز",
  "Evaluating": "جارٍ التقييم",
  "Blocked": "محظور",
  "Allowed with warnings": "مسموح مع تحذيرات",
  "overridden by": "تم تجاوزه بواسطة",
  "No rules fired for this context.": "لم تُفعّل أي قاعدة لهذا السياق.",
  "Choose a context and evaluate to see live enforcement.": "اختر سياقاً وقيّمه لعرض التطبيق المباشر.",
  "Live ruleset": "مجموعة القواعد الحية",
  "machine rules": "قواعد آلية",
  "Proximity exclusions": "استثناءات القرب",
  "Category and zoning": "الفئة والتقسيم",
  "Network-wide": "على مستوى الشبكة",
  "Recent enforcement events": "أحداث التطبيق الأخيرة",
  "Outcome": "النتيجة",
  "Reason codes": "رموز الأسباب",
  "Mosque": "مسجد",
  "School": "مدرسة",
  "Diplomatic site": "موقع دبلوماسي",
  "Military site": "موقع عسكري",
  "Hospital": "مستشفى",
  "Emergency": "طوارئ",
  "Public Safety": "السلامة العامة",
  "Civic": "مدني",
  "Regulatory": "تنظيمي",
  "Alcohol": "كحول",
  "Gambling": "مقامرة",
  "Energy drink": "مشروب طاقة",
  "Political": "سياسي",
  "Civic notice": "إشعار مدني",
  "PROHIBITED_CATEGORY": "فئة محظورة",
  "SCHOOL_DAYPART_RESTRICTED": "قيود ساعات الدراسة",
  "SENSITIVE_ZONE_POLITICAL": "منطقة حساسة سياسياً",
  "NCEMA CAP alerts": "تنبيهات NCEMA (CAP)",
  "Ingest CAP alert": "استيراد تنبيه CAP",
  "CAP identifier": "معرّف CAP",
  "CAP ID": "معرّف CAP",
  "CAP": "CAP",
  "Sender": "المُرسِل",
  "Area": "المنطقة",
  "Zone or Citywide": "منطقة أو المدينة كاملة",
  "Citywide": "المدينة كاملة",
  "Severity": "الخطورة",
  "Urgency": "الإلحاح",
  "Certainty": "اليقين",
  "Extreme": "أقصى",
  "Severe": "شديد",
  "Moderate": "متوسط",
  "Immediate": "فوري",
  "Expected": "متوقع",
  "Future": "مستقبلي",
  "Observed": "مُلاحَظ",
  "Likely": "مرجّح",
  "Possible": "ممكن",
  "Headline": "العنوان الرئيسي",
  "Severe dust storm - reduce speed": "عاصفة غبارية شديدة - خفّض السرعة",
  "Body (English)": "النص (إنجليزي)",
  "Body (Arabic)": "النص (عربي)",
  "Ingest alert": "استيراد التنبيه",
  "Targets": "الأهداف",
  "Alert content originates from NCEMA and is never modified by AI.": "محتوى التنبيه صادر عن NCEMA ولا يُعدّله الذكاء الاصطناعي إطلاقاً.",
  "AI dissemination assist (read-only)": "مساعدة النشر بالذكاء الاصطناعي (قراءة فقط)",
  "Run AI assist": "تشغيل مساعدة الذكاء الاصطناعي",
  "Translation parity OK": "تطابق الترجمة سليم",
  "Parity issues": "مشاكل في التطابق",
  "Routing": "التوجيه",
  "Layout": "التنسيق",
  "AI proposes targets, checks EN/AR parity, and suggests layout. It never edits the alert content.": "يقترح الذكاء الاصطناعي الأهداف، ويتحقق من تطابق العربية والإنجليزية، ويقترح التنسيق. لا يعدّل محتوى التنبيه أبداً.",
  "Named-approver gate": "بوابة المعتمد المُسمّى",
  "Citywide requires dual control (2 approvers + MFA)": "المدينة كاملة تتطلب رقابة مزدوجة (معتمدان + تحقق ثنائي)",
  "Zone requires one named approver + MFA": "المنطقة تتطلب معتمداً واحداً + تحقق ثنائي",
  "Broadcast now (preempt)": "بثّ الآن (تجاوز)",
  "Display within": "العرض خلال",
  "Preempting content on": "يتجاوز المحتوى على",
  "Acknowledge": "إقرار",
  "Acknowledged by": "أقرّه",
  "Stage journal": "سجل المراحل",
  "Named-approver decision": "قرار المعتمد المُسمّى",
  "Category": "الفئة",
  "routine": "اعتيادي",
  "sensitive": "حساس",
  "high-impact": "عالي التأثير",
  "Dual control (2 approvers + MFA)": "رقابة مزدوجة (معتمدان + تحقق ثنائي)",
  "Named approver + MFA": "معتمد مُسمّى + تحقق ثنائي",
  "Named approver": "معتمد مُسمّى",
  "approved": "معتمد",
  "Approving as": "الاعتماد باسم",
  "Select a named approver": "اختر معتمداً مُسمّى",
  "Approve with MFA": "اعتماد بالتحقق الثنائي",
  "Second approval (MFA)": "الاعتماد الثاني (تحقق ثنائي)",
  "Segregation of duties: the owner and the bidder cannot approve their own submission.": "الفصل بين المهام: لا يمكن للمالك أو مقدّم الطلب اعتماد طلبه.",
  "No further eligible approvers. Dual control requires two distinct named approvers.": "لا يوجد معتمدون مؤهلون إضافيون. تتطلب الرقابة المزدوجة معتمدَين مختلفين.",
  "MFA step-up verification": "التحقق الثنائي المعزّز",
  "High-impact and sensitive content require multi-factor step-up. Enter the 6-digit authenticator code.": "يتطلب المحتوى الحساس وعالي التأثير تحققاً ثنائياً. أدخل رمز المصادقة المكوّن من 6 أرقام.",
  "Authenticator code": "رمز المصادقة",
  "Demo: any 6-digit code verifies.": "عرض توضيحي: أي رمز من 6 أرقام يُقبل.",
  "Verify and approve": "تحقق واعتمد",
  "first approval recorded, second approver required": "تم تسجيل الاعتماد الأول، يلزم معتمد ثانٍ",
  "Revision resubmitted": "أُعيد تقديم التعديل",
  "MFA": "تحقق ثنائي",
  "SLA due": "استحقاق مستوى الخدمة",
  "v": "إصدار ",
  "hash": "بصمة",
  "Send": "إرسال",
  "Save output": "حفظ المخرج",
  "Ask about assets, schedules, submissions, financials or emergencies. Large outputs expand here.": "اسأل عن الأصول أو الجداول أو الطلبات أو الماليات أو الطوارئ. تتوسع المخرجات الكبيرة هنا.",
  "Here is the current campaign workflow view.": "هذه هي نظرة سير عمل الحملات الحالية.",
  "Open alarm summary by zone. Industrial Zone and Al Ain need the operations team first.": "ملخص الإنذارات المفتوحة حسب المنطقة. المنطقة الصناعية والعين تحتاجان فريق العمليات أولاً.",
  "Financial scenario from current demand and bid pressure.": "سيناريو مالي بناءً على الطلب الحالي وضغط العروض.",
  "There are two active alerts. The weather broadcast needs checks before it can move to approval.": "يوجد تنبيهان نشطان. يحتاج بث تنبيه الطقس إلى فحوصات قبل الانتقال إلى الاعتماد.",
  "The estate is mostly healthy: 3 of 5 assets are live, one is under maintenance, and one is offline.": "الشبكة بحالة جيدة عموماً: 3 من 5 أصول نشطة، أصل واحد تحت الصيانة، وأصل واحد غير متصل.",
  "Dispatch field technician": "إرسال فني ميداني",
  "Re-route emergency content": "إعادة توجيه محتوى الطوارئ",
  "Recommended bid": "العرض المقترح",
  "Expected margin": "الهامش المتوقع",
  "Budget guardrail": "حد الميزانية",
  "AED 447,000": "447,000 درهم",
  "Do not exceed AED 465,000": "لا تتجاوز 465,000 درهم",

  "Airport retail launch": "إطلاق حملة متاجر المطار",
  "Airport and premium roadside": "المطار والطرق المميزة",
  "Maya Haddad": "مايا حداد",
  "Jul 08, 2026": "08 يوليو 2026",
  "AED 420,000": "420,000 درهم",
  "Arabic and English": "العربية والإنجليزية",
  "Airport retail creative with bilingual copy and weekend flight targeting.": "تصميم متاجر المطار بنص ثنائي اللغة واستهداف رحلات نهاية الأسبوع.",
  "Yas summer promotion": "عرض صيف ياس",
  "Yas Tourism": "سياحة ياس",
  "Leisure loop": "حلقة الترفيه",
  "Hamad Al Ketbi": "حمد الكتبي",
  "Jul 12, 2026": "12 يوليو 2026",
  "AED 285,000": "285,000 درهم",
  "Tourism campaign approved for Yas and airport routes.": "تم اعتماد حملة السياحة لمسارات ياس والمطار.",
  "Coastal road closure": "إغلاق الطريق الساحلي",
  "DMT": "دائرة البلديات والنقل",
  "Civic emergency lane": "مسار الطوارئ المدنية",
  "Noura Salem": "نورة سالم",
  "Today": "اليوم",
  "Public notice": "إشعار عام",
  "Arabic first": "العربية أولاً",
  "Public notice scheduled after dual-control approval.": "تمت جدولة الإشعار العام بعد اعتماد التحكم المزدوج.",
  "National observance takeover": "تغطية المناسبة الوطنية",
  "ADMO": "مكتب أبوظبي الإعلامي",
  "Full estate civic takeover": "تغطية مدنية لكامل الشبكة",
  "Khaled Mansoor": "خالد منصور",
  "Jul 18, 2026": "18 يوليو 2026",
  "Civic allocation": "مخصص مدني",
  "Awaiting cultural review and schedule lock.": "بانتظار المراجعة الثقافية وتثبيت الجدول.",
  "Weekend mall offer": "عرض نهاية الأسبوع للمراكز التجارية",
  "Downtown retail loop": "حلقة تجارة وسط المدينة",
  "AED 160,000": "160,000 درهم",
  "1.4M est.": "1.4 مليون تقديري",
  "790k delivered": "790 ألف تم تسليمها",
  "Pending ADMO estimate": "بانتظار تقدير مكتب أبوظبي الإعلامي",
  "ADMO content review": "مراجعة محتوى مكتب أبوظبي الإعلامي",
  "Proof-of-play reconciliation": "مطابقة إثبات التشغيل",
  "Road safety rotation": "دورة السلامة المرورية",
  "Industrial safety notice": "إشعار السلامة الصناعية",
  "Retail Majlis": "مجلس التجزئة",

  "Al Ain and highway gateways": "العين وبوابات الطرق السريعة",
  "NCEMA": "الهيئة الوطنية لإدارة الطوارئ والأزمات والكوارث",
  "Display within 60s": "العرض خلال 60 ثانية",
  "Drivers and commuters": "السائقون ومستخدمو الطريق",
  "Today 18:00": "اليوم 18:00",
  "Road closure notice": "إشعار إغلاق طريق",
  "Corniche westbound": "الكورنيش باتجاه الغرب",
  "Display within 5m": "العرض خلال 5 دقائق",
  "City traffic": "حركة المرور داخل المدينة",
  "Jul 02, 08:00": "02 يوليو، 08:00",
  "Alert created and waiting for checks": "تم إنشاء التنبيه وهو بانتظار الفحوصات",
  "Emergency checks completed": "اكتملت فحوصات الطوارئ",
  "Emergency broadcast queued": "تم إدراج بث الطوارئ في قائمة الانتظار",

  "1.4M weekly impressions": "1.4 مليون ظهور أسبوعياً",
  "Airport, Corniche, Yas": "المطار، الكورنيش، ياس",
  "790k weekly impressions": "790 ألف ظهور أسبوعياً",
  "Malls, parking, urban panels": "المراكز التجارية، المواقف، اللوحات الحضرية",
  "Yas leisure loop": "حلقة ياس الترفيهية",
  "620k weekly impressions": "620 ألف ظهور أسبوعياً",
  "Yas, airport route, hotels": "ياس، مسار المطار، الفنادق",
  "Submitted from the bidder marketplace and waiting for ADMO CMS review.": "تم الإرسال من سوق المزايدين وهو بانتظار مراجعة إدارة المحتوى في مكتب أبوظبي الإعلامي.",
  "Campaign submitted to ADMO CMS": "تم إرسال الحملة إلى إدارة المحتوى في مكتب أبوظبي الإعلامي",

  "Corniche Highway Main": "لوحة طريق الكورنيش الرئيسية",
  "Airport Road Premium": "لوحة طريق المطار المميزة",
  "Downtown Retail Loop": "حلقة وسط المدينة التجارية",
  "Al Ain Civic": "لوحة العين المدنية",
  "Mussafah Bridge Banner": "لوحة جسر مصفح",
  "Yas Island Bus Stop Pair": "زوج شاشات محطة حافلات جزيرة ياس",
  "Al Ain Gateway": "بوابة العين",
  "Downtown Mall Entrance": "مدخل مركز وسط المدينة التجاري",
  "Highway billboard": "لوحة طريق سريع",
  "Premium roadside LED": "شاشة LED مميزة على جانب الطريق",
  "Urban LED totem": "عمود LED حضري",
  "Highway gateway billboard": "لوحة بوابة طريق سريع",
  "Bridge display": "شاشة جسر",
  "Dual-sided bus stop": "محطة حافلات مزدوجة الجهة",
  "Indoor/outdoor LED": "شاشة LED داخلية وخارجية",
  "Abu Dhabi City": "مدينة أبوظبي",
  "Industrial Zone": "المنطقة الصناعية",
  "Al Ain": "العين",
  "Fiber primary": "ألياف ضوئية رئيسية",
  "5G primary": "اتصال 5G رئيسي",
  "5G primary / fiber backup": "اتصال 5G رئيسي مع ألياف احتياطية",
  "Satellite failover": "تحويل احتياطي عبر الأقمار الصناعية",
  "Civic road safety": "سلامة مرورية مدنية",
  "Tourism live stream": "بث مباشر سياحي",
  "Queued after recovery": "في الانتظار بعد الاستعادة",
  "Maintenance blackout": "إيقاف للصيانة",
  "Corniche Road West, opposite Nation Towers, Abu Dhabi": "طريق الكورنيش الغربي، مقابل أبراج نيشن، أبوظبي",
  "Mussafah Bridge approach, route E10, Industrial Zone": "مدخل جسر مصفح، طريق E10، المنطقة الصناعية",
  "Yas Mall north bus bay, Yas Island": "موقف الحافلات الشمالي في ياس مول، جزيرة ياس",
  "Al Ain Truck Road gateway, route E22, Al Ain": "بوابة طريق شاحنات العين، طريق E22، العين",
  "Downtown Mall main entrance, Al Markaziyah, Abu Dhabi": "المدخل الرئيسي لمركز وسط المدينة، المركزية، أبوظبي",
  "n/a (offline)": "غير متاح (غير متصل)",
  "0 days": "0 يوم",
  "3 days": "3 أيام",
  "5 days": "5 أيام",
  "6 days": "6 أيام",
  "7 days": "7 أيام",
  "Edge controller offline": "وحدة التحكم الطرفية غير متصلة",
  "Field Engineering": "هندسة الميدان",

  "Holiday notice master": "النسخة الرئيسية لإشعار العطلة",
  "Weather alert video loop": "حلقة فيديو تنبيه الطقس",
  "Retail launch hero": "تصميم رئيسي لإطلاق التجزئة",
  "Yas live stream slate": "لوحة بث ياس المباشر",
  "CSC evidence pack": "حزمة أدلة الحوكمة الأمنية",
  "DMT Communications": "اتصالات دائرة البلديات والنقل",
  "NCEMA gateway": "بوابة الهيئة الوطنية لإدارة الطوارئ",
  "Retail advertiser": "معلن تجزئة",
  "Security PMO": "مكتب إدارة برنامج الأمن",

  "Thermal inspection": "فحص حراري",
  "Camera calibration": "معايرة الكاميرا",
  "Edge controller restart": "إعادة تشغيل وحدة التحكم الطرفية",
  "Monthly brightness audit": "تدقيق السطوع الشهري",
  "Backup power test": "اختبار الطاقة الاحتياطية",
  "Field dispatch": "إرسال الفريق الميداني",
  "Verification team": "فريق التحقق",
  "NOC operator": "مشغل مركز الشبكة",
  "Maintenance team": "فريق الصيانة",
  "O&M admin": "مدير التشغيل والصيانة",

  "Power supply 48V": "مزود طاقة 48 فولت",
  "Commercial premium": "تجاري مميز",
  "Emergency reserve": "احتياطي الطوارئ",
  "Maintenance reserve": "احتياطي الصيانة",
  "+67% remaining": "+67% متبقية",
  "+19% remaining": "+19% متبقية",
  "AED 18.4M": "18.4 مليون درهم",
  "AED 3.1M": "3.1 مليون درهم",
  "AED 42k": "42 ألف درهم",
  "AED 7.2M": "7.2 مليون درهم",
  "AED 6.8M": "6.8 مليون درهم",
  "AED 11.4M": "11.4 مليون درهم",
  "AED 12.1M": "12.1 مليون درهم",
  "AED 1.8M": "1.8 مليون درهم",
  "AED 0.6M": "0.6 مليون درهم",
  "AED 2.6M": "2.6 مليون درهم",
  "AED 2.1M": "2.1 مليون درهم",
  "k AED": " ألف درهم",
  "18.2M": "18.2 مليون",
  "12.6M": "12.6 مليون",
  "7.9M": "7.9 مليون",
  "21.4M": "21.4 مليون",
  "AED 8.4k": "8.4 ألف درهم",
  "AED 5.1k": "5.1 ألف درهم",
  "AED 3.7k": "3.7 ألف درهم",
  "AED 9.8k": "9.8 ألف درهم",

  "Vision moderation": "مراجعة الرؤية",
  "Creative review": "مراجعة التصميم",
  "Arabic language QA": "ضمان جودة اللغة العربية",
  "Copy parity": "تطابق النص",
  "Demand optimizer": "محسن الطلب",
  "Bid planning": "تخطيط المزايدات",
  "Network sentinel": "حارس الشبكة",
  "Telemetry": "القياسات التشغيلية",
  "Creative risk classifier": "مصنف مخاطر التصميم",
  "OCR, logo, claim, cultural policy": "قراءة نصية، شعار، ادعاء، سياسة ثقافية",
  "Emergency route builder": "منشئ مسار الطوارئ",
  "Scope, cache, edge override": "النطاق، التخزين المؤقت، التجاوز الطرفي",
  "Yield scenario planner": "مخطط سيناريو العائد",
  "Demand, budget, price floors": "الطلب، الميزانية، حدود السعر الدنيا",
  "Maintenance triage": "فرز الصيانة",
  "Sensor anomalies to work orders": "تحويل شذوذ المستشعرات إلى أوامر عمل",
  "Beta": "تجريبي",
  "ADMO CMS": "إدارة محتوى مكتب أبوظبي الإعلامي",
  "API": "واجهة API",
  "Synced": "متزامن",
  "Content operations": "عمليات المحتوى",
  "Finance ERP": "نظام المالية ERP",
  "ERP": "نظام ERP",
  "Daily batch": "دفعة يومية",
  "Finance": "المالية",
  "Edge telemetry": "قياسات الطرف",
  "Streaming API": "واجهة بث مباشر",
  "Network operations": "عمليات الشبكة",
  "Bidder creative packs": "حزم تصاميم المزايدين",
  "Plain files": "ملفات عادية",
  "Validated": "تم التحقق",
  "CMS reviewers": "مراجعو إدارة المحتوى",

  "Agent families": "عائلات الوكلاء",
  "Run agent": "تشغيل الوكيل",
  "Common asks": "طلبات شائعة",
  "Find campaign history": "البحث في تاريخ الحملات",
  "Prepare a governed schedule": "إعداد جدول محكوم",
  "Review a submitted creative": "مراجعة تصميم مقدم",
  "Set the inputs above and run the agent to see governed output.": "حدد المدخلات أعلاه وشغل الوكيل لعرض المخرجات المحكومة.",
  "No runs in this session yet.": "لا توجد عمليات تشغيل في هذه الجلسة بعد.",
  "Recent runs": "أحدث العمليات",
  "Runs today": "عمليات اليوم",
  "This session": "الجلسة الحالية",
  "Query": "الاستعلام",
  "Zone": "المنطقة",
  "Approved creative ID": "معرف التصميم المعتمد",
  "Brief": "الملخص",
  "Tone": "النبرة",
  "Submission": "الطلب",
  "Check depth": "عمق الفحص",
  "Asset group": "مجموعة الأصول",
  "Target uplift": "نسبة النمو المستهدفة",
  "Window": "النطاق الزمني",
  "Surface": "السطح",
  "Archive": "الأرشيف",
  "Morning peak": "ذروة الصباح",
  "Midday": "منتصف النهار",
  "Evening peak": "ذروة المساء",
  "Overnight": "الليل",
  "English first": "الإنجليزية أولاً",
  "Bilingual": "ثنائي اللغة",
  "Cultural": "ثقافي",
  "Standard": "قياسي",
  "Deep": "معمق",
  "Cultural review": "مراجعة ثقافية",
  "Last 1 hour": "آخر ساعة",
  "Last 24 hours": "آخر 24 ساعة",
  "Edge": "الطرف",
  "Export results": "تصدير النتائج",
  "Queue for approval": "إضافة إلى قائمة الاعتماد",
  "Send to CMS Library": "إرسال إلى مكتبة إدارة المحتوى",
  "Escalate to reviewer": "تصعيد إلى المراجع",
  "Send to Financials": "إرسال إلى الماليات",
  "Open audit log": "فتح سجل التدقيق",
  "submitted for governance": "تم الإرسال للحوكمة",
  "Boundary": "الحدود",
  "Result": "النتيجة",
  "Time": "الوقت",
  "Agent": "الوكيل",

  "MediaGPT Moderator": "مشرف MediaGPT",
  "Screens creative, flags OCR, deepfake and cultural risks.": "يفحص التصميم ويرفع مؤشرات القراءة النصية والتزييف العميق والمخاطر الثقافية.",
  "MediaGPT Compliance Agent": "وكيل امتثال MediaGPT",
  "Routes named approvers and policy checks.": "يوجه المعتمدين المحددين وفحوصات السياسات.",
  "MediaGPT Studio": "استوديو MediaGPT",
  "Creates and adapts panel formats in Arabic and English.": "ينشئ ويكيف صيغ اللوحات بالعربية والإنجليزية.",
  "MediaGPT Sentinel": "حارس MediaGPT",
  "Detects edge, CMS and network anomalies.": "يرصد شذوذ الطرف وإدارة المحتوى والشبكة.",
  "MediaGPT Optimizer": "محسن MediaGPT",
  "Optimizes yield, slot allocation and dynamic pricing.": "يحسن العائد وتوزيع الخانات والتسعير الديناميكي.",
  "MediaGPT Insights": "رؤى MediaGPT",
  "MediaGPT Archive": "أرشيف MediaGPT",
  "MediaGPT Workflow Composer": "منشئ تدفقات MediaGPT",
  "MediaGPT Targeting Assistant": "مساعد الاستهداف MediaGPT",
  "MediaGPT DCO Adapter": "محول DCO من MediaGPT",
  "MediaGPT Yield Advisor": "مستشار العائد MediaGPT",
  "MediaGPT Drift Monitor": "مراقب الانحراف MediaGPT",
  "MediaGPT Orchestrator": "منسق MediaGPT",
  "MediaGPT Maintenance": "صيانة MediaGPT",
  "MediaGPT Proof-of-Play Reconciler": "مطابق إثبات التشغيل MediaGPT",
  "MediaGPT Emergency Orchestrator": "منسق الطوارئ MediaGPT",
  "MediaGPT Moderator Cache": "ذاكرة مشرف MediaGPT",
  "MediaGPT Optimizer Cache": "ذاكرة محسن MediaGPT",
  "MediaGPT Sentinel Fallback": "مسار احتياطي حارس MediaGPT",
  "MediaGPT PoP": "إثبات التشغيل MediaGPT",
  "MediaGPT Moderator Vision": "رؤية مشرف MediaGPT",
  "MediaGPT Arabic Copy QA": "فحص النص العربي MediaGPT",
  "MediaGPT CAP-UAE Orchestrator": "منسق CAP الإمارات من MediaGPT",
  "MediaGPT Yield Optimizer Model": "نموذج محسن العائد MediaGPT",
  "MediaGPT Asset Risk Model": "نموذج مخاطر الأصول MediaGPT",
  "MediaGPT Edge Sentinel": "حارس الحافة MediaGPT",
  "MediaGPT Studio Generator": "مولد استوديو MediaGPT",
  "MediaGPT Rights Matcher": "مطابق الحقوق MediaGPT",
  "MediaGPT Local Gateway": "بوابة MediaGPT المحلية",
  "MediaGPT Ledger": "سجل MediaGPT",
  "Used by MediaGPT Moderator": "يستخدمه مشرف MediaGPT",
  "Used by MediaGPT Compliance Agent": "يستخدمه وكيل امتثال MediaGPT",
  "Used by MediaGPT Orchestrator": "يستخدمه منسق MediaGPT",
  "Used by MediaGPT Optimizer": "يستخدمه محسن MediaGPT",
  "Used by MediaGPT Sentinel": "يستخدمه حارس MediaGPT",
  "Used by MediaGPT Maintenance": "تستخدمه صيانة MediaGPT",
  "Answers natural-language questions across campaigns and assets.": "يجيب عن أسئلة اللغة الطبيعية عبر الحملات والأصول.",
  "When did Coca-Cola last advertise on Yas Island, and what was the contract value?": "متى أعلنت كوكاكولا آخر مرة على جزيرة ياس، وما قيمة العقد؟",
  "Last Yas Island placement: Aug 2024. Contract value AED 268,500. Most recent estate placement: Mar 2025, Maqta Bridge.": "آخر ظهور على جزيرة ياس: أغسطس 2024. قيمة العقد 268,500 درهم. آخر ظهور على الشبكة: مارس 2025، جسر المقطع.",
  "Select all parking assets within 1 km of ADNEC and push a weekday morning campaign.": "اختر كل أصول المواقف ضمن كيلومتر واحد من أدنيك وادفع حملة صباحية خلال أيام العمل.",
  "Workflow prepared: resolve geography, select approved creative, set schedule, run governance check, save reusable task.": "تم تجهيز سير العمل: تحديد النطاق الجغرافي، اختيار التصميم المعتمد، ضبط الجدول، تشغيل فحص الحوكمة، وحفظ مهمة قابلة لإعادة الاستخدام.",
  "Make-it-in-the-Emirates, desert sunrise, Arabic first, civic tone.": "اصنعها في الإمارات، شروق صحراوي، العربية أولاً، بنبرة مدنية.",
  "Three bilingual concepts generated and adapted to 6:1, 9:16, 1:1 and 3:4 panels.": "تم إنشاء ثلاثة مفاهيم ثنائية اللغة وتكييفها مع لوحات 6:1 و9:16 و1:1 و3:4.",
  "Check authenticity, rights and cultural soundness for CR-90421.": "افحص الأصالة والحقوق والسلامة الثقافية للتصميم CR-90421.",
  "Integrity score 97%. No manipulation detected. Copyright match requires named approver review.": "درجة السلامة 97%. لم يتم اكتشاف تلاعب. يتطلب تطابق حقوق النشر مراجعة معتمد محدد.",

  "Campaign": "الحملة",
  "Stage": "المرحلة",
  "2.2M": "2.2 مليون",
  "Live GIS dispatch": "إرسال الخريطة الحية",
  "Awaiting publish": "بانتظار النشر",

  "Content lifecycle": "دورة حياة المحتوى",
  "AI Screening": "الفحص بالذكاء الاصطناعي",
  "Human Moderation": "المراجعة البشرية",
  
  "Distribution": "التوزيع",
  "Edge Play": "التشغيل على الحافة",
  "Proof-of-Play": "إثبات التشغيل",
  "Reconciliation": "التسوية",

  "Approval hash": "بصمة الاعتماد",
  "Content hash": "بصمة المحتوى",
  "Dual-control": "تحكم مزدوج",
  "AI screening": "فحص الذكاء الاصطناعي",
  "Cleared by MediaGPT Moderator": "تم الفحص بواسطة مشرف MediaGPT",
  "Integrity": "السلامة",
  "OCR AR/EN": "التعرف الضوئي عربي/إنجليزي",
  "Passed": "ناجح",
  "Deepfake scan": "فحص التزييف العميق",
  "Clean": "نظيف",
  "Proof-of-Play ledger": "سجل إثبات التشغيل",
  "Evidence appears after Edge Play.": "تظهر الأدلة بعد التشغيل على الحافة.",

  "Families": "العائلات",
  "Discover, Command, Create, Protect, Optimize, Safeguard": "الاكتشاف، التنفيذ، الإنشاء، الحماية، التحسين، الحراسة",
  "Arabic parity": "التكافؤ العربي",
  "Bilingual QA on outputs": "فحص ثنائي اللغة للمخرجات",
  
  "Optimize": "التحسين",
  "Safeguard": "الحراسة",
  "Natural-language search across campaigns, assets, and archives.": "بحث بلغة طبيعية عبر الحملات والأصول والأرشيف.",
  "Compose workflows across scheduling, targeting, and distribution.": "بناء تدفقات العمل عبر الجدولة والاستهداف والتوزيع.",
  "Generative studio for civic messaging in Arabic and English.": "استوديو توليدي للرسائل المدنية بالعربية والإنجليزية.",
  "Content moderation, deepfake detection, and rights checks.": "الإشراف على المحتوى، الكشف عن التزييف العميق، وفحص الحقوق.",
  "Yield, slot allocation, and dynamic pricing recommendations.": "توصيات العائد وتوزيع الفترات والتسعير الديناميكي.",
  "Edge, CMS and network anomaly detection with audit trails.": "كشف الشذوذ في الحافة وإدارة المحتوى والشبكة مع سجلات التدقيق.",
  "Read-only": "قراءة فقط",
  "Recommend": "توصية",
  "Execute with approval": "تنفيذ بعد الاعتماد",
  "Never modify": "لا يعدل أبداً",
  "Where can we lift airport-loop yield without cannibalising civic slots?": "أين يمكن رفع عائد مسار المطار دون التأثير على الفترات المدنية؟",
  "Reallocate 6 evening slots on AD-APT-{003,007} to premium retail. Projected uplift AED 42,000 / week. No civic conflict.": "إعادة توزيع 6 فترات مسائية على AD-APT-{003,007} لتجزئة مميزة. ارتفاع متوقع 42,000 درهم/أسبوع. لا يوجد تعارض مدني.",
  "Anything unusual on the network in the last 24h?": "هل من شيء غير معتاد على الشبكة خلال 24 ساعة؟",
  "2 anomalies: latency spike on AD-BRG-014 (23:04, resolved), signed model drift within tolerance on MediaGPT Moderator v1.4.": "شذوذان: ارتفاع زمن الاستجابة على AD-BRG-014 (23:04، تم الحل)، وانحراف نموذج موقّع ضمن الحدود لمشرف MediaGPT v1.4.",
  "Rule packs": "حزم القواعد",
  "Condition AI reasoning": "تقييد استدلال الذكاء الاصطناعي",
  "Reusable skills": "مهارات قابلة لإعادة الاستخدام",
  "Agent callable capabilities": "قدرات يمكن للوكلاء استدعاؤها",
  "Live skills": "مهارات مفعلة",
  "Available in workflows": "متاحة في سير العمل",
  "Beta skills": "مهارات تجريبية",
  "Admin-enabled only": "تفعيلها من المدير فقط",
  "Rule-bound": "مرتبطة بالقواعد",
  "Governed by DOOH rules": "محكومة بقواعد الإعلانات الخارجية الرقمية",
  "Hard blocks": "قواعد حظر صارمة",
  "Cannot be bypassed by AI": "لا يمكن للذكاء الاصطناعي تجاوزها",
  "Recommendation rules": "قواعد التوصية",
  "Guide AI outputs": "توجه مخرجات الذكاء الاصطناعي",
  "Creative policy rules": "قواعد سياسة المحتوى الإبداعي",
  "Prohibited symbols": "الرموز المحظورة",
  "claims": "الادعاءات",
  "brand safety": "سلامة العلامة التجارية",
  "Commercial eligibility rules": "قواعد الأهلية التجارية",
  "Rate-card floor": "الحد الأدنى لبطاقة الأسعار",
  "exclusivity": "الحصرية",
  "sector separation": "فصل القطاعات",
  "Emergency override rules": "قواعد تجاوز الطوارئ",
  "CAP-UAE": "بروتوكول CAP الإمارات",
  "dual control": "تحكم مزدوج",
  "default end time": "وقت انتهاء افتراضي",
  "Network maintenance rules": "قواعد صيانة الشبكة",
  "Fault severity": "درجة خطورة العطل",
  "spare-part risk": "مخاطر قطع الغيار",
  "PO/SO escalation": "تصعيد أوامر الشراء والخدمة",
  "Strict": "صارمة",
  "Draft": "مسودة",
  "Mode": "النمط",
  "Applies to": "ينطبق على",
  "AI effect": "تأثير الذكاء الاصطناعي",
  "Enforce": "تطبيق إلزامي",
  "Monitor": "مراقبة",
  "AI can recommend, but these internal rules condition the answer, citations, and allowed next actions.": "يمكن للذكاء الاصطناعي أن يوصي، لكن هذه القواعد الداخلية تضبط الإجابة والاستشهادات والإجراءات التالية المسموح بها.",
  "Rule": "القاعدة",
  "Condition": "الشرط",
  "Action": "الإجراء",
  "Arabic copy missing or materially different": "النص العربي مفقود أو مختلف جوهرياً",
  "Block submission": "حظر الطلب",
  "Restricted sector separation": "فصل القطاعات المقيدة",
  "Competing brands within the same takeover window": "علامات متنافسة ضمن فترة استحواذ واحدة",
  "Recommend alternate slot": "اقتراح فترة بديلة",
  "Emergency authority": "جهة الطوارئ",
  "No named authority or SLA": "لا توجد جهة معتمدة أو مستوى خدمة محدد",
  "Require dual approval": "طلب اعتماد مزدوج",
  "Arabic parity checker": "مدقق التكافؤ العربي",
  "Terminology, tone, RTL proofing": "المصطلحات والنبرة وتدقيق الاتجاه من اليمين إلى اليسار",
  "BoM and PO recommender": "موصي قائمة المواد وأوامر الشراء",
  "Spare-part availability, SO timing": "توفر قطع الغيار وتوقيت أوامر الخدمة",
  "Runtime": "بيئة التشغيل",
  "Inputs": "المدخلات",
  "Knowledge, rules, workflow context": "المعرفة والقواعد وسياق سير العمل",
  "Output": "المخرج",
  "Recommendation with citations": "توصية مع استشهادات",
  "Capability": "القدرة",
  "Used by": "يستخدم بواسطة",
  "Governance": "الحوكمة",
  "Policy-aware analysis": "تحليل واع بالسياسات",
  "MediaGPT agents": "وكلاء MediaGPT",
  "Cites Knowledge and Rules": "يستشهد بالمعرفة والقواعد",
  "Action recommendation": "توصية بإجراء",
  "Workflow runners": "مشغلات سير العمل",
  "Requires allowed profile": "يتطلب ملفاً مصرحاً",
  "Audit event creation": "إنشاء حدث تدقيق",
  "Platform infrastructure": "بنية المنصة",
  "Signed and exportable": "موقع وقابل للتصدير",
  "Agents available": "الوكلاء المتاحون",
  "MediaGPT agent catalogue": "كتالوج وكلاء MediaGPT",
  "Mandatory agents": "الوكلاء الإلزاميون",
  "Required for production flows": "مطلوبة لتدفقات التشغيل الفعلية",
  "Optional agents": "الوكلاء الاختياريون",
  "Can be enabled per workflow": "يمكن تفعيلها حسب سير العمل",
  "Approval boundary": "حدود الاعتماد",
  "High-impact actions gated": "الإجراءات عالية الأثر محكومة",
  "Knowledge bases": "قواعد المعرفة",
  "MediaGPT source corpora": "مصادر MediaGPT المعرفية",
  "Documents": "المستندات",
  "Uploaded or connected": "مرفوعة أو متصلة",
  "Indexed chunks": "مقاطع مفهرسة",
  "Retrieval-ready passages": "مقاطع جاهزة للاسترجاع",
  "Pending indexing": "بانتظار الفهرسة",
  "Queued or processing": "في الانتظار أو قيد المعالجة",
  "Add source": "إضافة مصدر",
  "documents": "مستندات",
  "chunks": "مقاطع",
  "Re-index selected": "إعادة فهرسة المحدد",
  "Chunks": "المقاطع",
  "Last indexed": "آخر فهرسة",
  "Policy and compliance": "السياسات والامتثال",
  "UAE media policy, ADMO content standards, brand safety and Arabic copy rules.": "سياسة الإعلام في الإمارات، ومعايير محتوى مكتب أبوظبي الإعلامي، وسلامة العلامة، وقواعد النص العربي.",
  "Commercial and rate cards": "التجاري وبطاقات الأسعار",
  "Packages, pricing rules, financial guardrails, proof-of-play settlement and bidder terms.": "الحزم، وقواعد التسعير، والضوابط المالية، وتسوية إثبات التشغيل، وشروط المزايدين.",
  "Operations and emergency": "العمليات والطوارئ",
  "Emergency SOPs, CAP-UAE templates, distribution rules, edge cache procedures and operator playbooks.": "إجراءات الطوارئ، وقوالب CAP الإمارات، وقواعد التوزيع، وإجراءات تخزين الحافة، وأدلة المشغلين.",
  "Network and maintenance": "الشبكة والصيانة",
  "BoM catalogues, service manuals, edge-device runbooks, telemetry dictionaries and spare-part workflows.": "كتالوجات قائمة المواد، وأدلة الخدمة، وأدلة أجهزة الحافة، وقواميس القياسات، وسير عمل قطع الغيار.",
  "Indexed": "مفهرس",
  "Indexing": "قيد الفهرسة",
  "In progress": "قيد التنفيذ",
  "Just now": "الآن",
  "Queued now": "أضيف الآن إلى الانتظار",
  "Uploaded bidder evidence pack.pdf": "حزمة أدلة المزايد المرفوعة.pdf",
  "Content governance": "حوكمة المحتوى",
  "Control room": "غرفة التحكم",
  "Active workflows": "سير العمل النشط",
  "Reusable MediaGPT workflows": "سير عمل MediaGPT قابل لإعادة الاستخدام",
  "Approval gates": "بوابات الاعتماد",
  "Human checkpoints": "نقاط تحقق بشرية",
  "Source-bound steps": "خطوات مرتبطة بالمصادر",
  "Knowledge-backed decisions": "قرارات مدعومة بالمعرفة",
  "Avg cycle time": "متوسط زمن الدورة",
  "Skill workflows": "سير عمل المهارات",
  "Workflow": "سير العمل",
  "Trigger": "المحفز",
  "Submission deep review": "مراجعة معمقة للطلب",
  "New bidder submission": "طلب جديد من مزايد",
  "Approve / changes / reject recommendation": "توصية بالاعتماد أو التعديل أو الرفض",
  "Emergency broadcast readiness": "جاهزية بث الطوارئ",
  "Alert created": "تم إنشاء التنبيه",
  "Verified broadcast packet": "حزمة بث تم التحقق منها",
  "Bid optimization": "تحسين العرض",
  "Marketplace bid": "عرض في السوق",
  "Bid floor and budget recommendation": "توصية بحد العرض والميزانية",
  "SO / PO recommendation": "توصية بأمر خدمة أو أمر شراء",
  "Skill executions": "تشغيلات المهارات",
  "Finished with audit": "مكتمل مع التدقيق",
  "Waiting approval": "بانتظار الاعتماد",
  "Human gate": "بوابة بشرية",
  "Failures": "الإخفاقات",
  "Skill runs": "تشغيلات المهارات",
  "Run sample check": "تشغيل فحص تجريبي",
  "Subject": "الموضوع",
  "Changes recommended": "تمت التوصية بتعديلات",
  "Ready for dual control": "جاهز للتحكم المزدوج",
  "Open PO risk": "مخاطر أمر شراء مفتوح",
  "Running": "قيد التشغيل",
  "Applying rules": "تطبيق القواعد",
  "Avg latency": "متوسط زمن الاستجابة",
  "Fallback routes": "مسارات احتياطية",
  "Governed model routing": "توجيه نماذج محكوم",
  "Provider": "المزود",
  "Fallback": "البديل",
  "OpenAI vision": "رؤية OpenAI",
  "Local OCR": "تعرف نصي محلي",
  "Rules engine": "محرك القواعد",
  "Forecast model": "نموذج التنبؤ",
  "Static rate card": "بطاقة أسعار ثابتة",
  "Anomaly model": "نموذج الشذوذ",
  "Threshold rules": "قواعد الحدود",
  "Live APIs": "واجهات API مباشرة",
  "Connected systems": "أنظمة متصلة",
  "File drops": "ملفات واردة",
  "Knowledge ingestion": "استيعاب المعرفة",
  "Failed syncs": "مزامنات فاشلة",
  "Needs attention": "يتطلب انتباهاً",
  "Profiles": "الملفات",
  "Role-based entry points": "نقاط دخول حسب الدور",
  "Admin profiles": "ملفات الإدارة",
  "Admin and technical": "إداري وتقني",
  "External roles": "أدوار خارجية",
  "Bidder access": "وصول المزايد",
  "Restricted tabs": "تبويبات مقيدة",
  "Technical layer controls": "ضوابط الطبقة التقنية",
  "Profile": "الملف",
  "All layers": "كل الطبقات",
  "Technical layers only": "الطبقات التقنية فقط",
  "Allowed": "مسموح",
  "Limited": "محدود",
  "Audit events": "أحداث التدقيق",
  "AI decisions": "قرارات الذكاء الاصطناعي",
  "Cited recommendations": "توصيات موثقة بالمصادر",
  "Human overrides": "تجاوزات بشرية",
  "Governance review": "مراجعة الحوكمة",
  "Export readiness": "جاهزية التصدير",
  "Signed event chain": "سلسلة أحداث موقعة",
  "Actor": "الفاعل",
  "Policy citations attached": "استشهادات السياسة مرفقة",
  "Approved emergency queue": "اعتمد قائمة بث الطوارئ",
  "Dual-control hash": "بصمة التحكم المزدوج",
  "Opened service recommendation": "فتح توصية خدمة",
  "Telemetry and BoM row": "قياسات وصف قائمة مواد",
  "Indexed knowledge source": "فهرس مصدر معرفة",
  "Chunk manifest": "بيان المقاطع",
  "Edge nodes": "عقد الحافة",
  "Registered controllers": "وحدات تحكم مسجلة",
  "Healthy nodes": "عقد سليمة",
  "Live and reachable": "مباشرة ويمكن الوصول إليها",
  "Model cache": "ذاكرة النماذج",
  "On-device readiness": "جاهزية على الجهاز",
  "Compute alerts": "تنبيهات الحوسبة",
  "Controller attention": "تتطلب انتباه وحدة التحكم",
  "Node": "العقدة",
  "Next action": "الإجراء التالي",
  "No action": "لا إجراء",
  "Controller swap": "استبدال وحدة التحكم",
  "Patch tonight": "تحديث الليلة",
  "QA browser campaign": "حملة اختبار المتصفح",
  "QA retail launch": "إطلاق اختبار التجزئة",
  "QA flood warning": "تحذير فيضان اختباري",
  "Drive awareness and proof-of-play for a QA campaign.": "رفع الوعي ومطابقة إثبات التشغيل لحملة اختبارية.",
  "Estimated 1.2M impressions / week": "متوقع 1.2 مليون ظهور أسبوعياً",
  "Bidder revision required": "مطلوب تعديل من المزايد",
  "Waiting for ADMO review": "بانتظار مراجعة مكتب أبوظبي الإعلامي",
  "Content screening": "فحص المحتوى",
  "Revise creative pack": "تعديل الحزمة الإبداعية",
  "Human moderation": "مراجعة بشرية",
  "Schedule slot selection": "اختيار خانة الجدولة",
  "ADMO intake review": "مراجعة استقبال مكتب أبوظبي الإعلامي",
  "Model pending": "بانتظار النموذج",
  "Auction": "مزاد",
  "Auction closes Jul 04, 2026 - 18:00": "ينتهي المزاد 04 يوليو 2026 - 18:00",
  "Jul 04, 2026 - 18:00": "04 يوليو 2026 - 18:00",
  "Jul 03, 2026 - 12:00": "03 يوليو 2026 - 12:00",
  "Jul 05, 2026 - 20:00": "05 يوليو 2026 - 20:00",
  "12 panels - Corniche, Airport Road": "12 شاشة - الكورنيش، طريق المطار",
  "18 mall and urban panels": "18 شاشة في المراكز التجارية والمناطق الحضرية",
  "9 panels - Yas Island and hotel corridor": "9 شاشات - جزيرة ياس وممر الفنادق",
  "Bid on Corniche prime - evening rotation": "مزايدة على الكورنيش الرئيسي - دورة المساء",
  "Corniche and downtown loop": "حلقة الكورنيش ووسط المدينة",
  "Started scheduled campaign": "بدأ تشغيل الحملة المجدولة",
  "Submitted campaign brief": "تم إرسال موجز الحملة",
  "Moved submission to Submitted": "نقل الطلب إلى مقدم",
  "Moved submission to In review": "نقل الطلب إلى قيد المراجعة",
  "Moved submission to Approved": "نقل الطلب إلى معتمد",
  "Moved submission to Scheduled": "نقل الطلب إلى مجدول",
  "Moved submission to Published": "نقل الطلب إلى منشور",
  "Moved submission to Changes requested": "نقل الطلب إلى مطلوب تعديل",
  "Summer retail launch": "إطلاق التجزئة الصيفي",
  "Kill switch": "مفتاح الإيقاف",
  "Restricted": "صلاحية مقيدة",
  "Blanks live displays in the field within seconds. Password confirmation is required and every activation is written to the audit trail.": "يقوم بتعتيم الشاشات الحية في الميدان خلال ثوانٍ. يتطلب تأكيد كلمة المرور، ويُسجَّل كل تفعيل في سجل التدقيق.",
  "Confirm display blackout": "تأكيد تعتيم الشاشات",
  "Takes effect immediately on live screens": "يسري فورًا على الشاشات الحية",
  "Target": "الهدف",
  "Displays affected": "الشاشات المتأثرة",
  "Every display in the emirate": "جميع الشاشات في الإمارة",
  "Operator password": "كلمة مرور المشغل",
  "Demo: any password of 6+ characters verifies.": "تجريبي: أي كلمة مرور من 6 أحرف فأكثر تُقبل.",
  "Blank displays now": "تعتيم الشاشات الآن",
  "Dispatch technicians": "إرسال الفنيين",
  "Review where field crews will be sent before confirming.": "راجع المواقع التي سترسل إليها الفرق الميدانية قبل التأكيد.",
  "No open alarms. Nothing to dispatch.": "لا توجد إنذارات مفتوحة. لا حاجة لإرسال فنيين.",
  "Dispatch to": "إرسال إلى",
  "site": "موقع",
  "sites": "مواقع",
  "Technicians dispatched to": "تم إرسال الفنيين إلى",
  "Corniche Beach Gateway": "بوابة شاطئ الكورنيش",
  "Airport Road Gantry East": "جسر شارع المطار الشرقي",
  "Hamdan Street Digital": "شاشة شارع حمدان الرقمية",
  "WTC Souk Panel": "لوحة سوق المركز التجاري العالمي",
  "Yas Mall North Face": "واجهة ياس مول الشمالية",
  "Ferrari World Approach": "مدخل عالم فيراري",
  "Mussafah Gate Pylon": "برج بوابة مصفح",
  "Al Ain Clock Tower Gateway": "بوابة برج ساعة العين",
  "Jimi Mall Corridor": "ممر الجيمي مول",
  "Digital pylon": "برج رقمي",
  "Highway gantry": "جسر طريق سريع",
  "Street unipole": "عمود شارع إعلاني",
  "Mall facade LED": "واجهة مركز تجاري LED",
  "Louvre summer exhibition": "معرض اللوفر الصيفي",
  "5G family bundle": "باقة العائلة 5G",
  "Eid family staycation": "إقامة العيد العائلية",
  "National reading month": "شهر القراءة الوطني",
  "Louvre Abu Dhabi": "اللوفر أبوظبي",
  "e& Telecom": "اتصالات e&",
  "Emirates Palace": "قصر الإمارات",
  "Sara Al Mansouri": "سارة المنصوري",
  "Omar Rashed": "عمر راشد",
  "Latifa Al Suwaidi": "لطيفة السويدي",
  "Khalid Al Marri": "خالد المري",
  "Cultural district loop": "حلقة المنطقة الثقافية",
  "Civic bilingual pack": "الحزمة المدنية ثنائية اللغة",
  "Non-billed": "غير مفوتر",
  "Museum exhibition flight targeting the cultural district and Corniche panels.": "حملة معرض متحفي تستهدف شاشات المنطقة الثقافية والكورنيش.",
  "Telecom bundle creative; CTA legibility under review for highway variants.": "إعلان باقة اتصالات؛ وضوح عبارة الحث قيد المراجعة لنسخ الطرق السريعة.",
  "Arabic copy revision requested; imagery approved by CMS review.": "طُلب تعديل النص العربي؛ تمت الموافقة على الصور من مراجعة نظام المحتوى.",
  "Civic awareness rotation live across community panels.": "دورة توعية مدنية تعمل على الشاشات المجتمعية."
};

const I18nContext = createContext<Translator>((value) => value);

const arabicMonthNames: Record<string, string> = {
  Jan: "يناير",
  Feb: "فبراير",
  Mar: "مارس",
  Apr: "أبريل",
  May: "مايو",
  Jun: "يونيو",
  Jul: "يوليو",
  Aug: "أغسطس",
  Sep: "سبتمبر",
  Oct: "أكتوبر",
  Nov: "نوفمبر",
  Dec: "ديسمبر",
};

const arabicFallbackTerms: Array<[string, string]> = [
  ["QA browser campaign", "حملة اختبار المتصفح"],
  ["QA retail launch", "إطلاق اختبار التجزئة"],
  ["QA flood warning", "تحذير فيضان اختباري"],
  ["Corniche prime", "الكورنيش الرئيسي"],
  ["evening rotation", "دورة المساء"],
  ["Airport Road", "طريق المطار"],
  ["Corniche", "الكورنيش"],
  ["Downtown", "وسط المدينة"],
  ["Yas Island", "جزيرة ياس"],
  ["hotel corridor", "ممر الفنادق"],
  ["airport route", "مسار المطار"],
  ["highway gateways", "بوابات الطرق السريعة"],
  ["premium roadside", "الطرق المميزة"],
  ["retail loop", "حلقة التجزئة"],
  ["leisure loop", "حلقة الترفيه"],
  ["roadside", "جانب الطريق"],
  ["campaign", "حملة"],
  ["launch", "إطلاق"],
  ["browser", "المتصفح"],
  ["retail", "التجزئة"],
  ["Airport", "المطار"],
  ["weekly impressions", "ظهور أسبوعياً"],
  ["weekly", "أسبوعياً"],
  ["impressions", "ظهور"],
  ["Estimated", "متوقع"],
  ["Submitted", "مقدم"],
  ["Bidding", "قيد المزايدة"],
  ["Published", "منشور"],
  ["Scheduled", "مجدول"],
  ["Approved", "معتمد"],
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateArabicDate(value: string) {
  return value
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/g, (_, month: string, day: string, year: string) =>
      `${day.padStart(2, "0")} ${arabicMonthNames[month]} ${year}`,
    )
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+-\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/g, (_, monthA: string, dayA: string, monthB: string, dayB: string, year: string) =>
      `${dayA.padStart(2, "0")} ${arabicMonthNames[monthA]} - ${dayB.padStart(2, "0")} ${arabicMonthNames[monthB]} ${year}`,
    )
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+-\s+(\d{1,2}),\s+(\d{4})/g, (_, month: string, dayA: string, dayB: string, year: string) =>
      `${dayA.padStart(2, "0")} - ${dayB.padStart(2, "0")} ${arabicMonthNames[month]} ${year}`,
    );
}

function translateArabic(value: string): string {
  if (!value) return value;
  const direct = translations[value];
  if (direct) return direct;

  const bidMatch = value.match(/^Bid on (.+)$/);
  if (bidMatch) return `مزايدة على ${translateArabic(bidMatch[1])}`;

  const auctionMatch = value.match(/^Auction closes (.+)$/);
  if (auctionMatch) return `ينتهي المزاد ${translateArabicDate(auctionMatch[1])}`;

  let result = translateArabicDate(value)
    .replace(/\bAED\s*([0-9,]+)/g, "$1 درهم")
    .replace(/\b(\d+(?:\.\d+)?)M\s+impressions\s*\/\s*week\b/g, "$1 مليون ظهور أسبوعياً")
    .replace(/\b(\d+(?:\.\d+)?)M\s+weekly\b/g, "$1 مليون أسبوعياً")
    .replace(/\b(\d+)k\s+weekly\b/g, "$1 ألف أسبوعياً")
    .replace(/\s+\|\s+/g, " | ")
    .replace(/\s+and\s+/g, " و ")
    .replace(/\s+&\s+/g, " و ");

  for (const [source, target] of arabicFallbackTerms) {
    result = result.replace(new RegExp(escapeRegExp(source), "g"), target);
  }

  return result;
}

function useT() {
  return useContext(I18nContext);
}

function isArabicInterface(t: Translator) {
  return t("Notifications") === "الإشعارات";
}

function localized(value: LocalizedText | string, t: Translator) {
  if (typeof value === "string") return t(value);
  return isArabicInterface(t) ? value.ar : value.en;
}

const ontologyCatalogue = [...doohOntology, ...extendedDoohOntology];
const knowledgeSourceCatalogue = [...seedKnowledgeSources, ...extendedKnowledgeSources];
const ruleCatalogue = [...seedDoohRules, ...extendedDoohRules];
const simulationCatalogue = [...ruleSimulationContexts, ...extendedRuleSimulationContexts];
const scenarioCatalogue = [...demoScenarios, ...extendedDemoScenarios];

function sourceById(id: string) {
  return knowledgeSourceCatalogue.find((source) => source.id === id);
}

function ruleById(id: string) {
  return ruleCatalogue.find((rule) => rule.id === id);
}

function translateNode(node: ReactNode, t: Translator): ReactNode {
  if (typeof node === "string") return t(node);
  if (Array.isArray(node)) return node.map((child, index) => <span key={index}>{translateNode(child, t)}</span>);
  return node;
}

function itemCountLabel(count: number, t: Translator) {
  return `${count} ${t("items")}`;
}

function langMoney(value: number, t: Translator) {
  return `${value}${t("k AED")}`;
}

async function doohGetState(): Promise<DoohStatePayload> {
  const response = await fetch("/api/dooh/state");
  return parseDoohResponse<DoohStatePayload>(response);
}

async function doohPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/dooh/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseDoohResponse<T>(response);
}

async function parseDoohResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Backend request failed";
    throw new Error(message);
  }
  return payload as T;
}

function notificationPreferenceStorageKey(profileId: ProfileId) {
  return `dooh-notification-preferences:${profileId}`;
}

function loadNotificationPreferences(profileId: ProfileId): NotificationPreferences {
  if (typeof window === "undefined") return defaultNotificationPreferences;
  try {
    const raw = window.localStorage.getItem(notificationPreferenceStorageKey(profileId));
    if (!raw) return defaultNotificationPreferences;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...defaultNotificationPreferences, ...parsed };
  } catch {
    return defaultNotificationPreferences;
  }
}

function saveNotificationPreferences(profileId: ProfileId, preferences: NotificationPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notificationPreferenceStorageKey(profileId), JSON.stringify(preferences));
}

function isNotificationAllowed(notification: PlatformNotification, preferences: NotificationPreferences) {
  if (notification.tone === "critical") return preferences.critical;
  return preferences[notification.page] ?? true;
}

function App() {
  const [lang, setLang] = useState<Lang>("en");
  // Origen theme: dark is the designed default; light is the derived mode.
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("dooh-theme") === "light" ? "light" : "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("dooh-theme", theme);
  }, [theme]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>("control");
  const [submissions, setSubmissions] = useState<Submission[]>(seedSubmissions);
  const [campaigns, setCampaigns] = useState<BidderCampaign[]>(seedBidderCampaigns);
  const [bidderMessages, setBidderMessages] = useState<BidderCommunication[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(seedSchedule);
  const [published, setPublished] = useState<PublishedItem[]>(seedPublished);
  const [auctions, setAuctions] = useState<AuctionLot[]>(seedAuctions);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [popLedger, setPopLedger] = useState<PopRecord[]>([]);
  const [enforcementEvents, setEnforcementEvents] = useState<EnforcementEvent[]>([]);
  const [killedAssetIds, setKilledAssetIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(seedAlerts);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>(initialVerificationSteps);
  const [financeApprovals, setFinanceApprovals] = useState<FinanceApproval[]>(seedFinanceApprovals);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const [backendStatus, setBackendStatus] = useState<"syncing" | "online" | "offline">("syncing");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);

  const t = (value: string) => (lang === "ar" ? translateArabic(value) : value);

  useEffect(() => {
    let active = true;
    async function loadBackendState() {
      try {
        const next = await doohGetState();
        if (!active) return;
        applyBackendState(next);
        setBackendStatus("online");
      } catch {
        if (active) setBackendStatus("offline");
      }
    }
    void loadBackendState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    aiStatus().then((status) => {
      if (active) setAiAvailable(Boolean(status.available));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setNotificationPreferences(loadNotificationPreferences(profile.id));
  }, [profile?.id]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function applyBackendState(next: DoohStatePayload) {
    setSubmissions(next.submissions);
    setCampaigns(next.campaigns);
    setBidderMessages(next.bidderMessages ?? []);
    setSchedule(next.schedule);
    setPublished(next.published);
    setAuctions(next.auctions);
    setBids(next.bids);
    setBookings(next.bookings ?? []);
    setInvoices(next.invoices ?? []);
    setPopLedger(next.popLedger ?? []);
    setEnforcementEvents(next.enforcementEvents ?? []);
    setKilledAssetIds(next.killedAssetIds ?? []);
    setAlerts(next.alerts);
    setVerificationSteps(next.verificationSteps);
    setFinanceApprovals(next.financeApprovals);
    setServiceOrders(next.serviceOrders ?? []);
    setPurchaseOrders(next.purchaseOrders ?? []);
    setActivity(next.activity);
    setNotifications(next.notifications ?? []);
  }

  async function syncMutation<T extends { state: DoohStatePayload }>(path: string, body: unknown): Promise<T | null> {
    setBackendStatus("syncing");
    try {
      const result = await doohPost<T>(path, body);
      applyBackendState(result.state);
      setBackendStatus("online");
      return result;
    } catch (error) {
      setBackendStatus("offline");
      notify(error instanceof Error ? error.message : "Backend request failed");
      return null;
    }
  }

  function chooseProfile(next: Profile) {
    setProfile(next);
    setPage(next.pages[0]);
  }

  function goTo(next: Page) {
    if (!profile?.pages.includes(next)) return;
    setPage(next);
  }

  function updateNotificationPreference(key: NotificationPreferenceKey, enabled: boolean) {
    if (!profile) return;
    setNotificationPreferences((previous) => {
      const next = { ...previous, [key]: enabled };
      saveNotificationPreferences(profile.id, next);
      return next;
    });
  }

  const visibleNotifications = useMemo(
    () => (profile ? notifications.filter((item) => item.recipients.includes(profile.id) && isNotificationAllowed(item, notificationPreferences)) : []),
    [notifications, notificationPreferences, profile],
  );

  async function markNotificationRead(id: string) {
    if (!profile) return;
    await syncMutation<{ state: DoohStatePayload }>(`notifications/${id}/read`, {
      actor: profile.name,
      profileId: profile.id,
    });
  }

  async function markAllNotificationsRead() {
    if (!profile) return;
    const result = await syncMutation<{ state: DoohStatePayload }>("notifications/read-all", {
      actor: profile.name,
      profileId: profile.id,
    });
    if (result) notify(t("Notifications marked read"));
  }

  async function openNotification(notification: PlatformNotification) {
    if (!profile) return;
    await markNotificationRead(notification.id);
    if (profile.pages.includes(notification.page)) {
      setPage(notification.page);
    } else {
      notify(t("This notification belongs to another workspace"));
    }
  }

  async function submitBrief(payload: BriefPayload) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission }>("submissions", {
      actor: profile?.name ?? "Bidder",
      payload,
    });
    if (!result) return;
    setWizardOpen(false);
    notify("Campaign submitted to ADMO CMS");
    if (profile?.pages.includes("campaigns")) setPage("campaigns");
  }

  async function submitCivicCreative(payload: BriefPayload) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission }>("submissions", {
      actor: profile?.name ?? "ADMO Creative Officer",
      payload,
    });
    if (!result) return null;
    notify(t("Creative sent to CMS review"));
    return result.submission;
  }

  async function submitMarketplaceCampaign(payload: { campaign: string; packageName: string; budget: string; creativeId: string; creativeUrl?: string }) {
    await submitBrief({
      campaign: payload.campaign,
      packageName: payload.packageName,
      budget: payload.budget,
      creativeId: payload.creativeId,
      creativeUrl: payload.creativeUrl,
      priority: "Standard",
      brand: profile?.name ?? "Bidder",
      vertical: "Retail",
      audience: "Marketplace default",
      targetZones: [],
      daypart: "Full day rotation",
      endDate: "Aug 15, 2026",
      contactEmail: "campaigns@bidder.ae",
      compliance: { uaeMedia: true, arabicProof: true, rightsCleared: true, noPolitical: true },
      assets: [],
      languages: "Arabic and English",
      startDate: "Jul 15, 2026",
      contactName: profile?.name ?? "Bidder account",
      objective: "Submitted from the bidder marketplace and waiting for ADMO CMS review.",
      reach: "Pending ADMO estimate",
    });
  }

  async function placeBid(payload: { lotId: string; amount: number; campaign: string }) {
    const result = await syncMutation<{ state: DoohStatePayload; bid: BidRecord }>("bids", {
      actor: profile?.name ?? "Bidder",
      payload,
    });
    if (result) notify(`Bid placed on ${result.bid.lotName}`);
  }

  async function closeAuctionLot(lotId: string) {
    const result = await syncMutation<{ state: DoohStatePayload; lot: AuctionLot; booking: BookingRecord | null }>(`auctions/${lotId}/close`, {
      actor: profile?.name ?? "ADMO Finance",
    });
    if (result) notify(result.lot.status === "Awarded" ? `${result.lot.lotName}: awarded to ${result.lot.awardedTo}` : `${result.lot.lotName}: closed with no fill`);
  }

  async function settleBookingPayment(bookingId: string, outcome: "paid" | "failed") {
    const result = await syncMutation<{ state: DoohStatePayload; booking: BookingRecord }>(`bookings/${bookingId}/payment`, {
      actor: profile?.name ?? "ADMO Finance",
      payload: { outcome },
    });
    if (result) notify(outcome === "paid" ? `${result.booking.campaign}: payment confirmed, creative in review` : `${result.booking.campaign}: payment failed, slot released`);
  }

  async function reconcileBookingChain(bookingId: string, step: "bill" | "settle") {
    const result = await syncMutation<{ state: DoohStatePayload; booking: BookingRecord }>(`bookings/${bookingId}/reconcile`, {
      actor: profile?.name ?? "ADMO Finance",
      payload: { step },
    });
    if (result) notify(step === "bill" ? `${result.booking.campaign}: delivery reconciled against PoP` : `${result.booking.campaign}: settlement closed`);
  }

  async function updateSubmissionStage(id: string, stage: SubmissionStage) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission }>(`submissions/${id}/stage`, {
      actor: profile?.name ?? "ADMO",
      role: profile?.id ?? "reviewer",
      stage,
    });
    if (result) notify(`${t(result.submission.campaign)}: ${t(stage)}`);
  }

  async function approveSubmissionAction(id: string, approverName: string, reason: string, mfaCode: string) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission; pendingSecondApproval: boolean }>(`submissions/${id}/approve`, {
      actor: profile?.name ?? "ADMO",
      role: profile?.id ?? "reviewer",
      approverName,
      reason,
      mfaCode,
    });
    if (result) {
      notify(result.pendingSecondApproval
        ? `${t(result.submission.campaign)}: ${t("first approval recorded, second approver required")}`
        : `${t(result.submission.campaign)}: ${t("Approved")}`);
    }
  }

  async function resubmitSubmissionAction(id: string, payload: { creativeId?: string; language?: string; notes?: string; budget?: string; message?: string }) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission }>(`submissions/${id}/resubmit`, {
      actor: profile?.name ?? "Advertiser",
      role: profile?.id ?? "bidder",
      payload,
    });
    if (result) notify(`${t(result.submission.campaign)}: ${t("Revision resubmitted")} v${result.submission.version}`);
  }

  async function requestBidderChanges(id: string, message: string) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission; communication: BidderCommunication }>(`submissions/${id}/request-changes`, {
      actor: profile?.name ?? "ADMO Content Reviewer",
      message,
    });
    if (result) notify(`${t(result.submission.campaign)}: ${t("Revision request sent")}`);
  }

  async function playSchedule(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`schedule/${id}/play`, {
      actor: profile?.name ?? "ADMO",
    });
    if (result) notify("Schedule item is now playing");
  }

  async function createEmergencyAlert(payload: Record<string, unknown>) {
    const result = await syncMutation<{ state: DoohStatePayload; alert: EmergencyAlert }>("alerts", {
      actor: profile?.name ?? "Duty officer",
      role: profile?.id ?? "control-room",
      payload,
    });
    if (result) notify("CAP alert ingested and waiting for checks");
    return result?.alert ?? null;
  }

  async function approveAlert(id: string, approverName: string, mfaCode: string) {
    const result = await syncMutation<{ state: DoohStatePayload; alert: EmergencyAlert; pendingSecondApproval: boolean }>(`alerts/${id}/approve`, {
      actor: profile?.name ?? "Duty officer",
      role: profile?.id ?? "control-room",
      approverName,
      mfaCode,
    });
    if (result) notify(result.pendingSecondApproval ? "First approval recorded, second approver required" : "Emergency alert approved");
  }

  async function ackAlert(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`alerts/${id}/ack`, {
      actor: profile?.name ?? "Duty officer",
    });
    if (result) notify("Emergency acknowledged");
  }

  async function remoteKill(payload: { scope: "asset" | "zone" | "emirate"; target?: string; reason: string; confirm?: boolean }) {
    const result = await syncMutation<{ state: DoohStatePayload; affected: number }>("control/kill", {
      actor: profile?.name ?? "Supervisor",
      role: profile?.id ?? "control-room",
      payload,
    });
    if (result) notify(result.affected + " display(s) blanked");
  }

  async function restoreDisplays(payload: { scope: "asset" | "zone" | "emirate"; target?: string }) {
    const result = await syncMutation<{ state: DoohStatePayload }>("control/restore", {
      actor: profile?.name ?? "Supervisor",
      role: profile?.id ?? "control-room",
      payload,
    });
    if (result) notify("Displays re-enabled");
  }

  async function runAlertChecks(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`alerts/${id}/checks`, {
      actor: profile?.name ?? "Duty officer",
    });
    if (result) notify("Emergency checks completed");
  }

  async function queueAlertBroadcast(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`alerts/${id}/queue`, {
      actor: profile?.name ?? "Duty officer",
    });
    if (result) notify("Emergency broadcast queued");
  }

  async function broadcastAlertNow(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`alerts/${id}/broadcast`, {
      actor: profile?.name ?? "Duty officer",
    });
    if (result) notify("Emergency alert live on network");
  }

  async function resetAlertChecks(id: string) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`alerts/${id}/reset`, {
      actor: profile?.name ?? "Duty officer",
    });
    if (result) notify("Alert reset. Re-run checks.");
  }

  async function decideFinance(id: string, state: FinanceApproval["state"]) {
    const result = await syncMutation<{ state: DoohStatePayload }>(`finance/${id}/decision`, {
      actor: profile?.name ?? "Finance",
      state,
    });
    if (result) {
      const item = result.state.financeApprovals.find((approval) => approval.id === id);
      if (item) notify(`${t(item.campaign)}: ${t(state)}`);
    }
  }

  async function createServiceOrder(payload: {
    assetId: string;
    assetName: string;
    componentId: string;
    title: string;
    severity: ServiceOrder["severity"];
    summary: string;
    partsNeeded: string[];
  }) {
    const result = await syncMutation<{ state: DoohStatePayload; serviceOrder: ServiceOrder }>("service-orders", {
      actor: profile?.name ?? "Maintenance operator",
      payload,
    });
    if (result) notify(`${t("Service order created")}: ${result.serviceOrder.id}`);
    return result?.serviceOrder ?? null;
  }

  async function createPurchaseOrder(payload: {
    assetId: string;
    assetName: string;
    componentId: string;
    item: string;
    quantity: number;
    vendor?: string;
    eta?: string;
    linkedServiceOrder?: string;
  }) {
    const result = await syncMutation<{ state: DoohStatePayload; purchaseOrder: PurchaseOrder }>("purchase-orders", {
      actor: profile?.name ?? "O&M procurement",
      payload,
    });
    if (result) notify(`${t("Purchase order submitted")}: ${result.purchaseOrder.id}`);
    return result?.purchaseOrder ?? null;
  }

  if (!profile) {
    return (
      <I18nContext.Provider value={t}>
        <LoginScreen
          lang={lang}
          setLang={setLang}
          profiles={profiles}
          onChoose={chooseProfile}
          t={t}
        />
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={t}>
      <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <Sidebar profile={profile} page={page} goTo={goTo} onSwitch={() => setProfile(null)} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((v) => !v)} t={t} />
        <main className={`workspace ${page === "control" ? "map-canvas" : ""}`}>
          <Topbar
            profile={profile}
            page={page}
            lang={lang}
            setLang={setLang}
            theme={theme}
            onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
            notifications={visibleNotifications}
            notificationPreferences={notificationPreferences}
            onToggleNotificationPreference={updateNotificationPreference}
            onOpenNotification={openNotification}
            onMarkNotification={markNotificationRead}
            onMarkAllNotifications={markAllNotificationsRead}
            t={t}
          />
          {page === "control" && (
            <ControlCentre submissions={submissions} published={published} killedAssetIds={killedAssetIds} aiAvailable={aiAvailable} notify={notify} onKill={remoteKill} onRestore={restoreDisplays} goToAlerts={() => profile?.pages.includes("alerts") && setPage("alerts")} goToNetwork={() => profile?.pages.includes("network") && setPage("network")} t={t} />
          )}
          {page === "cms" && (
            <CmsPage
              submissions={submissions}
              schedule={schedule}
              published={published}
              profile={profile}
              onStage={updateSubmissionStage}
              onRequestChanges={requestBidderChanges}
              onApprove={approveSubmissionAction}
              onPlaySchedule={playSchedule}
              onCreateCreative={submitCivicCreative}
              aiAvailable={aiAvailable}
              t={t}
            />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              steps={verificationSteps}
              onCreateAlert={createEmergencyAlert}
              onRunChecks={runAlertChecks}
              onApproveAlert={approveAlert}
              onQueueBroadcast={queueAlertBroadcast}
              onBroadcastNow={broadcastAlertNow}
              onAckAlert={ackAlert}
              onResetAlert={resetAlertChecks}
              aiAvailable={aiAvailable}
              t={t}
            />
          )}
          {page === "network" && (
            <NetworkPage
              aiAvailable={aiAvailable}
              serviceOrders={serviceOrders}
              purchaseOrders={purchaseOrders}
              onCreateServiceOrder={createServiceOrder}
              onCreatePurchaseOrder={createPurchaseOrder}
              t={t}
            />
          )}
          {page === "mediagpt" && <MediaGptSuite aiAvailable={aiAvailable} t={t} />}
          {page === "radiusBroadcast" && <RadiusBroadcastPage profile={profile} aiAvailable={aiAvailable} notify={notify} t={t} />}
          {page === "yieldAdvisor" && <YieldAdvisorPage notify={notify} t={t} />}
          {page === "knowledge" && <KnowledgeBasePage t={t} />}
          {page === "rules" && <RulesPage enforcementEvents={enforcementEvents} t={t} />}
          {page === "skillsCatalogue" && <SkillsCataloguePage t={t} />}
          {page === "skillWorkflows" && <SkillWorkflowsPage t={t} />}
          {page === "skillRuns" && <SkillRunsPage t={t} />}
          {page === "modelCenter" && <ModelCenterPage t={t} />}
          {page === "integrations" && <IntegrationsPage t={t} />}
          {page === "accessRoles" && <AccessRolesPage t={t} />}
          {page === "auditLog" && <AuditLogPage t={t} />}
          {page === "edgeCompute" && <EdgeComputePage t={t} />}
          {page === "financials" && <FinancialsPage approvals={financeApprovals} auctions={auctions} bookings={bookings} invoices={invoices} popLedger={popLedger} aiAvailable={aiAvailable} onDecision={decideFinance} onCloseAuction={closeAuctionLot} onSettlePayment={settleBookingPayment} onReconcile={reconcileBookingChain} t={t} />}
          {page === "allocations" && <CommercialMapPage auctions={auctions} schedule={schedule} t={t} />}
          {page === "reports" && <ReportsPage submissions={submissions} bookings={bookings} invoices={invoices} popLedger={popLedger} enforcementEvents={enforcementEvents} alerts={alerts} auctions={auctions} t={t} />}
          {page === "campaigns" && <CampaignsPage campaigns={campaigns} bidderMessages={bidderMessages} submissions={submissions} onNewBrief={() => setWizardOpen(true)} onResubmit={resubmitSubmissionAction} t={t} />}
          {page === "marketplace" && <MarketplacePage onSubmit={submitMarketplaceCampaign} onBid={placeBid} auctions={auctions} bookings={bookings} invoices={invoices} onNewBrief={() => setWizardOpen(true)} t={t} />}
        </main>
        <MediaGptChatbot profile={profile} t={t} />
        {toast ? <Toast>{toast}</Toast> : null}
        {wizardOpen ? (
          <NewCampaignWizard
            defaultBidder={profile?.name ?? "Bidder account"}
            onClose={() => setWizardOpen(false)}
            onSubmit={submitBrief}
            t={t}
          />
        ) : null}
      </div>
    </I18nContext.Provider>
  );
}


function LoginScreen({
  lang,
  setLang,
  profiles,
  onChoose,
  t,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  profiles: Profile[];
  onChoose: (profile: Profile) => void;
  t: (value: string) => string;
}) {
  return (
    <main className="login-screen" dir={lang === "ar" ? "rtl" : "ltr"}>
      <section className="login-panel">
        <div className="login-brand">
          <img className="brand-mark" src={admoLogo} alt="ADMO" />
          <div>
            <h1>{t("Unified DOOH Platform")}</h1>
          </div>
          <button className="icon-button" type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            <Globe2 size={18} />
            {lang === "en" ? "AR" : "EN"}
          </button>
        </div>
        <p className="login-intro">{t("Choose who is using the platform. The sidebar and workflow are permissioned from this point.")}</p>
        <div className="profile-grid">
          {profiles.map((item) => (
            <button key={item.id} className="profile-card" type="button" onClick={() => onChoose(item)}>
              <span className="profile-icon"><UserRound size={20} /></span>
              <span>
                <strong>{t(item.name)}</strong>
                <small>{t(item.role)}</small>
                <em>{t(item.organization)}</em>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
      <div className="powered-by powered-by--login">
        <span>{t("Powered by")}</span>
        <img src={origenGreenIcon} alt="Origen" width={18} height={18} loading="lazy" />
        <strong>Origen</strong>
      </div>
    </main>
  );
}

function Sidebar({
  profile,
  page,
  goTo,
  onSwitch,
  collapsed,
  onToggleCollapsed,
  t,
}: {
  profile: Profile;
  page: Page;
  goTo: (page: Page) => void;
  onSwitch: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  t: (value: string) => string;
}) {
  const allowed = new Set(profile.pages);
  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <img className="brand-mark" src={admoLogo} alt="ADMO" />
        <div className="sidebar-brand-text">
          <strong>{t("DOOH")}</strong>
          <span>{t("Unified Platform")}</span>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
          title={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <nav className="nav-groups" aria-label={t("Primary")}>
        {navGroups.map((group) => {
          const items = group.pages.filter((id) => allowed.has(id));
          if (!items.length) return null;
          return (
            <section key={group.label} className="nav-group">
              <p>{t(group.label)}</p>
              {items.map((id) => {
                const item = navItems[id];
                const Icon = item.icon;
                return (
                  <button key={id} className={page === id ? "active" : ""} type="button" onClick={() => goTo(id)}>
                    <Icon size={20} />
                    <span>{t(item.label)}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </nav>
      {/* Figma footer card (224x60, r8, darker well): avatar + name/role +
          up/down arrows; the whole card is the profile switcher. */}
      <button className="sidebar-profile" type="button" onClick={onSwitch} title={t("Switch profile")} aria-label={t("Switch profile")}>
        <span className="sidebar-avatar" aria-hidden="true">{t(profile.name).split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
        <span className="sidebar-profile-text">
          <strong>{t(profile.name)}</strong>
          <small>{t(profile.role)}</small>
        </span>
        <ChevronsUpDown size={16} className="sidebar-profile-arrows" />
      </button>
      <div className="powered-by powered-by--sidebar">
        <span>{t("Powered by")}</span>
        <img src={origenGreenIcon} alt="Origen" width={16} height={16} loading="lazy" />
        <strong>Origen</strong>
      </div>
    </aside>
  );
}

function Topbar({
  profile,
  page,
  lang,
  setLang,
  theme,
  onToggleTheme,
  notifications,
  notificationPreferences,
  onToggleNotificationPreference,
  onOpenNotification,
  onMarkNotification,
  onMarkAllNotifications,
  t,
}: {
  profile: Profile;
  page: Page;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  notifications: PlatformNotification[];
  notificationPreferences: NotificationPreferences;
  onToggleNotificationPreference: (key: NotificationPreferenceKey, enabled: boolean) => void;
  onOpenNotification: (notification: PlatformNotification) => void;
  onMarkNotification: (id: string) => void;
  onMarkAllNotifications: () => void;
  t: (value: string) => string;
}) {
  const meta = navItems[page];
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.readBy.includes(profile.id)).length;

  return (
    <header className="topbar">
      <div>
        <p>{t(profile.organization)}</p>
        <h1>{t(meta.label)}</h1>
      </div>
      <div className="topbar-actions">
        {page === "control" ? (
          <span className="weather-chip">
            <Sun size={14} /> {Math.round(estateAssets.reduce((sum, asset) => sum + (parseInt(asset.tempC) || 40), 0) / estateAssets.length - 6)}°C, {fmtGst(new Date())}
          </span>
        ) : null}
        <span className="session-pill"><LockKeyhole size={15} />{t(profile.role)}</span>
        <div className="notification-shell">
          <button
            className={`icon-button notification-trigger ${unreadCount ? "has-unread" : ""}`}
            type="button"
            onClick={() => setNotificationOpen((open) => !open)}
            aria-label={t("Notifications")}
            aria-expanded={notificationOpen}
          >
            <Bell size={18} />
            {unreadCount ? <span className="notification-badge">{unreadCount}</span> : null}
          </button>
          {notificationOpen ? (
            <NotificationDrawer
              profile={profile}
              notifications={notifications}
              preferences={notificationPreferences}
              onTogglePreference={onToggleNotificationPreference}
              onOpen={(notification) => {
                onOpenNotification(notification);
                setNotificationOpen(false);
              }}
              onMarkRead={onMarkNotification}
              onMarkAll={onMarkAllNotifications}
            />
          ) : null}
        </div>
        <button className="icon-button" type="button" onClick={onToggleTheme} aria-label={t(theme === "dark" ? "Switch to light mode" : "Switch to dark mode")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-button" type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
          <Globe2 size={18} />
          {lang === "en" ? "AR" : "EN"}
        </button>
      </div>
    </header>
  );
}

function NotificationDrawer({
  profile,
  notifications,
  preferences,
  onTogglePreference,
  onOpen,
  onMarkRead,
  onMarkAll,
}: {
  profile: Profile;
  notifications: PlatformNotification[];
  preferences: NotificationPreferences;
  onTogglePreference: (key: NotificationPreferenceKey, enabled: boolean) => void;
  onOpen: (notification: PlatformNotification) => void;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
}) {
  const t = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.readBy.includes(profile.id)).length;
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const scopedPreferenceOptions = notificationPreferenceOptions.filter((option) => option.key === "critical" || profile.pages.includes(option.key as Page));

  return (
    <div className="notification-drawer" role="dialog" aria-label={t("Notification center")}>
      <header>
        <div>
          <span>{t("Notification center")}</span>
          <strong>{unreadCount ? `${unreadCount} ${t("unread")}` : t("All caught up")}</strong>
        </div>
        <div className="notification-header-actions">
          <button type="button" onClick={() => setSettingsOpen((open) => !open)}>
            <Settings size={14} /> {t("Settings")}
          </button>
          <button type="button" onClick={onMarkAll} disabled={!unreadCount}>
            {t("Mark all read")}
          </button>
        </div>
      </header>
      {settingsOpen ? (
        <section className="notification-settings" aria-label={t("Notification settings")}>
          {scopedPreferenceOptions.map((option) => (
            <label key={option.key}>
              <input
                type="checkbox"
                checked={preferences[option.key]}
                onChange={(event) => onTogglePreference(option.key, event.currentTarget.checked)}
              />
              <span>
                <strong>{t(option.label)}</strong>
                <small>{t(option.helper)}</small>
              </span>
            </label>
          ))}
        </section>
      ) : null}
      <div className="notification-list">
        {sortedNotifications.length ? (
          sortedNotifications.map((notification) => {
            const unread = !notification.readBy.includes(profile.id);
            const canOpen = profile.pages.includes(notification.page);
            return (
              <article key={notification.id} className={`notification-card tone-${notification.tone} ${unread ? "unread" : ""}`}>
                <span className="notification-dot" aria-hidden="true" />
                <div className="notification-copy">
                  <div>
                    <strong>{t(notification.title)}</strong>
                    <time>{formatNotificationTime(notification.createdAt, t)}</time>
                  </div>
                  <p>{notificationBody(notification, t)}</p>
                  <small>{t(notification.subject)}</small>
                  <div className="notification-actions">
                    <button type="button" onClick={() => onOpen(notification)} disabled={!canOpen}>
                      {t("Open notification")}
                    </button>
                    {unread ? (
                      <button type="button" onClick={() => onMarkRead(notification.id)}>
                        {t("Mark read")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="notification-empty">
            <Bell size={18} />
            <strong>{t("No notifications yet")}</strong>
            <span>{t("Workflow events will appear here.")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const KILL_ZONES = ["Abu Dhabi City", "Yas Island", "Industrial Zone", "Al Ain", "Downtown"];

function KillSwitchPanel({
  killedAssetIds,
  onKill,
  onRestore,
  onClose,
  t,
}: {
  killedAssetIds: string[];
  onKill: (payload: { scope: "asset" | "zone" | "emirate"; target?: string; reason: string; confirm?: boolean }) => void;
  onRestore: (payload: { scope: "asset" | "zone" | "emirate"; target?: string }) => void;
  onClose: () => void;
  t: (value: string) => string;
}) {
  const [scope, setScope] = useState<"asset" | "zone" | "emirate">("asset");
  const [target, setTarget] = useState(estateAssets[0].id);
  const [zoneTarget, setZoneTarget] = useState(KILL_ZONES[0]);
  const [reason, setReason] = useState("");
  const [confirmEmirate, setConfirmEmirate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const slaLabel = scope === "asset" ? "<=10s" : scope === "zone" ? "<=30s" : "<=60s, dual-control";
  const affectedCount = scope === "asset" ? 1 : scope === "zone" ? estateAssets.filter((asset) => asset.zone === zoneTarget).length : estateAssets.length;
  const selectedAsset = estateAssets.find((asset) => asset.id === target);
  const targetLabel = scope === "asset" ? `${target} - ${t(selectedAsset?.name ?? "")}` : scope === "zone" ? t(zoneTarget) : t("Every display in the emirate");

  function executeKill() {
    onKill({ scope, target: scope === "asset" ? target : scope === "zone" ? zoneTarget : undefined, reason, confirm: confirmEmirate });
    setConfirmOpen(false);
    setReason("");
    setConfirmEmirate(false);
  }

  return (
    <div className="wizard-backdrop revision-backdrop" role="presentation" onClick={onClose}>
    <section className="revision-dialog panel kill-panel kill-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <header className="panel-header kill-header">
        <div>
          <span className="panel-icon"><Power size={18} /></span>
          <h2>{t("Kill switch")}</h2>
          <span className="kill-tag">{t("Restricted")}</span>
        </div>
        <div className="panel-action">
          <StatusPill label={killedAssetIds.length ? String(killedAssetIds.length) + " " + t("blanked") : t("All live")} tone={killedAssetIds.length ? "danger" : "good"} />
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close")}>×</button>
        </div>
      </header>
      <p className="kill-caution">
        <ShieldAlert size={14} />
        {t("Blanks live displays in the field within seconds. Password confirmation is required and every activation is written to the audit trail.")}
      </p>
      <div className="kill-form">
        <label>{t("Scope")}
          <select value={scope} onChange={(e) => setScope(e.target.value as "asset" | "zone" | "emirate")}>
            <option value="asset">{t("Per asset")}</option>
            <option value="zone">{t("Per zone")}</option>
            <option value="emirate">{t("Emirate-wide")}</option>
          </select>
        </label>
        {scope === "asset" ? (
          <label>{t("Asset")}<select value={target} onChange={(e) => setTarget(e.target.value)}>{estateAssets.map((a) => <option key={a.id} value={a.id}>{a.id} - {t(a.name)}</option>)}</select></label>
        ) : scope === "zone" ? (
          <label>{t("Zone")}<select value={zoneTarget} onChange={(e) => setZoneTarget(e.target.value)}>{KILL_ZONES.map((z) => <option key={z} value={z}>{t(z)}</option>)}</select></label>
        ) : null}
        <label>{t("Reason code")}<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Maintenance / incident / directive")} /></label>
        <span className="kill-sla">{t("Target SLA")}: {slaLabel}</span>
      </div>
      {scope === "emirate" ? (
        <label className="kill-confirm"><input type="checkbox" checked={confirmEmirate} onChange={(e) => setConfirmEmirate(e.target.checked)} /> {t("I confirm dual-control authorisation for an emirate-wide blackout")}</label>
      ) : null}
      <ActionRow>
        <Button icon={Power} variant="danger" disabled={!reason.trim() || (scope === "emirate" && !confirmEmirate)} onClick={() => setConfirmOpen(true)}>{t("Blank displays")}</Button>
        {killedAssetIds.length ? <Button variant="secondary" onClick={() => onRestore({ scope: "emirate" })}>{t("Re-enable all")}</Button> : null}
      </ActionRow>
      {killedAssetIds.length ? (
        <div className="kill-list">
          {killedAssetIds.map((id) => (
            <span key={id} className="kill-chip">{id}<button type="button" onClick={() => onRestore({ scope: "asset", target: id })} aria-label={t("Re-enable")}>×</button></span>
          ))}
        </div>
      ) : null}
      {confirmOpen ? (
        <KillConfirmDialog
          scopeLabel={scope === "asset" ? t("Per asset") : scope === "zone" ? t("Per zone") : t("Emirate-wide")}
          targetLabel={targetLabel}
          affectedCount={affectedCount}
          slaLabel={slaLabel}
          reason={reason}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={executeKill}
          t={t}
        />
      ) : null}
    </section>
    </div>
  );
}

function KillConfirmDialog({
  scopeLabel,
  targetLabel,
  affectedCount,
  slaLabel,
  reason,
  onCancel,
  onConfirm,
  t,
}: {
  scopeLabel: string;
  targetLabel: string;
  affectedCount: number;
  slaLabel: string;
  reason: string;
  onCancel: () => void;
  onConfirm: () => void;
  t: (value: string) => string;
}) {
  const [password, setPassword] = useState("");
  const valid = password.length >= 6;
  return (
    <div className="wizard-backdrop revision-backdrop mfa-backdrop" role="presentation" onClick={onCancel}>
      <section className="revision-dialog kill-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="revision-header kill-dialog-header">
          <span className="panel-icon"><Power size={18} /></span>
          <div>
            <strong>{t("Confirm display blackout")}</strong>
            <small>{t("Takes effect immediately on live screens")}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={t("Close")}>×</button>
        </header>
        <div className="revision-body">
          <dl className="kill-summary">
            <div><dt>{t("Scope")}</dt><dd>{scopeLabel}</dd></div>
            <div><dt>{t("Target")}</dt><dd>{targetLabel}</dd></div>
            <div><dt>{t("Displays affected")}</dt><dd>{String(affectedCount)}</dd></div>
            <div><dt>{t("Target SLA")}</dt><dd>{slaLabel}</dd></div>
            <div><dt>{t("Reason code")}</dt><dd>{reason}</dd></div>
          </dl>
          <label className="revision-field">
            {t("Operator password")}
            <input type="password" value={password} placeholder="••••••••" onChange={(event) => setPassword(event.target.value)} />
          </label>
          <p className="mfa-hint">{t("Demo: any password of 6+ characters verifies.")}</p>
        </div>
        <footer className="revision-footer">
          <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
          <Button icon={Power} variant="danger" disabled={!valid} onClick={onConfirm}>{t("Blank displays now")}</Button>
        </footer>
      </section>
    </div>
  );
}

type DispatchItem = {
  id: string;
  asset: string;
  zone: string;
  title: string;
  severity: string;
  team: string;
  action: string;
};

function buildDispatchItems(): DispatchItem[] {
  const items: DispatchItem[] = tickets
    .filter((ticket) => ticket.status !== "Resolved")
    .map((ticket) => ({
      id: ticket.id,
      asset: ticket.asset,
      zone: estateAssets.find((asset) => asset.id === ticket.asset)?.zone ?? "",
      title: ticket.title,
      severity: ticket.severity,
      team: ticket.team,
      action: ticket.sla,
    }));
  for (const alert of alerts) {
    if (alert.status !== "Open") continue;
    if (items.some((item) => item.asset === alert.assetId && item.title === alert.title)) continue;
    items.push({
      id: alert.id,
      asset: alert.assetId,
      zone: alert.zone,
      title: alert.title,
      severity: alert.severity,
      team: "Field Engineering",
      action: alert.action,
    });
  }
  return items;
}

function DispatchDialog({
  onCancel,
  onDispatch,
  t,
}: {
  onCancel: () => void;
  onDispatch: (items: DispatchItem[]) => void;
  t: (value: string) => string;
}) {
  const items = useMemo(buildDispatchItems, []);
  const [selected, setSelected] = useState<string[]>(items.map((item) => item.id));
  const chosen = items.filter((item) => selected.includes(item.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }

  return (
    <div className="wizard-backdrop revision-backdrop" role="presentation" onClick={onCancel}>
      <section className="revision-dialog dispatch-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="revision-header">
          <span className="panel-icon"><Wrench size={18} /></span>
          <div>
            <strong>{t("Dispatch technicians")}</strong>
            <small>{t("Review where field crews will be sent before confirming.")}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={t("Close")}>×</button>
        </header>
        <div className="revision-body">
          {items.length ? (
            <div className="dispatch-list">
              {items.map((item) => (
                <label key={item.id} className="dispatch-item">
                  <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                  <span className="dispatch-main">
                    <strong>{item.asset} - {t(item.title)}</strong>
                    <small>{t(item.zone)} · {t(item.team)} · {t(item.action)}</small>
                  </span>
                  <StatusPill label={item.severity} tone={item.severity === "Critical" ? "danger" : item.severity === "Major" ? "warn" : "info"} />
                </label>
              ))}
            </div>
          ) : (
            <p className="mfa-hint">{t("No open alarms. Nothing to dispatch.")}</p>
          )}
        </div>
        <footer className="revision-footer">
          <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
          <Button icon={Wrench} disabled={!chosen.length} onClick={() => onDispatch(chosen)}>
            {t("Dispatch to")} {String(chosen.length)} {chosen.length === 1 ? t("site") : t("sites")}
          </Button>
        </footer>
      </section>
    </div>
  );
}

// Origen Control Centre (Figma DOOH Page 4): the page IS the map. A full-bleed
// dark basemap carries floating overlays - zone pill + KPI strip (top-left),
// alert toast + More actions (top-right), a click-popover per asset, and the
// Asset board filmstrip along the bottom. All safety actions stay reachable
// from the More menu (kill switch keeps its danger styling and confirms).
function fmtGst(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} GST`;
}

// Photographic context shots for the Asset board (Figma cards are billboards
// photographed in situ, not flat creatives). Generated once with gpt-image-1
// into public/billboards/, mapped by asset type.
const BOARD_PHOTOS: Record<string, string> = {
  "Highway billboard": "highway-billboard",
  "Highway gantry": "highway-gantry",
  "Digital pylon": "digital-pylon",
  "Bridge display": "bridge-display",
  "Dual-sided bus stop": "bus-stop",
  "Mall facade LED": "mall-facade",
  "Indoor/outdoor LED": "indoor-led",
  "Street unipole": "street-unipole",
};
const boardPhoto = (type?: string) => `/billboards/${BOARD_PHOTOS[type ?? ""] ?? "highway-billboard"}.jpg`;

function ControlCentre({
  submissions,
  published,
  killedAssetIds,
  aiAvailable,
  notify,
  onKill,
  onRestore,
  goToAlerts,
  goToNetwork,
  t,
}: {
  submissions: Submission[];
  published: PublishedItem[];
  killedAssetIds: string[];
  aiAvailable: boolean;
  notify: (message: string) => void;
  onKill: (payload: { scope: "asset" | "zone" | "emirate"; target?: string; reason: string; confirm?: boolean }) => void;
  onRestore: (payload: { scope: "asset" | "zone" | "emirate"; target?: string }) => void;
  goToAlerts: () => void;
  goToNetwork: () => void;
  t: (value: string) => string;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [zone, setZone] = useState("All zones");
  const [zoneOpen, setZoneOpen] = useState(false);
  const [boardTab, setBoardTab] = useState<"now" | "queue">("now");
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [liveViewFullscreen, setLiveViewFullscreen] = useState(false);
  const [digest, setDigest] = useState<{ en: string; ar: string; source?: string } | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);

  const zoneStats = useMemo(() => summarizeZones(estateAssets), []);
  const visibleAssets = useMemo(
    () => (zone === "All zones" ? estateAssets : estateAssets.filter((asset) => asset.zone === zone)),
    [zone],
  );
  const openAlarmAssetIds = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "Resolved").map((ticket) => ticket.asset),
    [],
  );
  const allocatedIds = useMemo(
    () => new Set(assetAllocations.filter((allocation) => allocation.status === "Allocated").map((allocation) => allocation.assetId)),
    [],
  );
  const liveCount = estateAssets.filter((asset) => asset.status === "Live").length;
  const fleetOnline = estateAssets.filter((asset) => asset.status !== "Offline").length;
  const queued = submissions.filter((item) => item.stage === "Approved" || item.stage === "Scheduled");
  const headlineTicket = tickets.find((ticket) => ticket.status !== "Resolved") ?? null;
  const selectedAsset = estateAssets.find((asset) => asset.id === selectedAssetId) ?? null;

  // Popover facts for the selected screen.
  const selectedPublished = selectedAsset ? published.find((item) => item.asset === selectedAsset.id) ?? null : null;
  const selectedAlarmed = selectedAsset ? openAlarmAssetIds.includes(selectedAsset.id) : false;
  const selectedKilled = selectedAsset ? killedAssetIds.includes(selectedAsset.id) : false;
  const nextQueued = queued[0] ?? null;
  const now = new Date();
  // Current playback slot: a 2.5h window that started on the last half hour
  // minus an hour, so the remaining time always reads 1h to 1.5h.
  const slotStart = new Date(now.getTime() - (((now.getMinutes() % 30) + 60) * 60000));
  const slotEnd = new Date(slotStart.getTime() + 150 * 60000);
  const remainMin = Math.max(1, Math.round((slotEnd.getTime() - now.getTime()) / 60000));
  const remainLabel = `${Math.floor(remainMin / 60)}h ${String(remainMin % 60).padStart(2, "0")}m`;
  const slotProgress = Math.min(96, Math.max(4, Math.round(((now.getTime() - slotStart.getTime()) / (slotEnd.getTime() - slotStart.getTime())) * 100)));

  const pinKindFor = (assetId: string): "campaign" | "asset" | "alert" => {
    if (openAlarmAssetIds.includes(assetId)) return "alert";
    if (allocatedIds.has(assetId)) return "campaign";
    return "asset";
  };

  useEffect(() => {
    if (!liveViewFullscreen) return;
    // Restore unconditionally: capturing the previous value can re-lock the
    // page if two opens interleave or a hot reload orphans the inline style.
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLiveViewFullscreen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [liveViewFullscreen]);

  async function summarizeEstate() {
    setMoreOpen(false);
    setDigestLoading(true);
    const result = await aiOpsDigest();
    setDigest({ en: result.en, ar: result.ar, source: result.source });
    setDigestLoading(false);
    if (result.source === "offline") notify(t("MediaGPT is offline. Showing fallback summary."));
  }

  function handleDispatch(items: DispatchItem[]) {
    setDispatchOpen(false);
    notify(t("Technicians dispatched to") + " " + items.map((item) => item.asset).join(", "));
  }

  const kpis: Array<{ icon: LucideIcon; value: string; label: string }> = [
    { icon: MonitorPlay, value: `${liveCount}/${estateAssets.length}`, label: "Assets live" },
    { icon: Globe2, value: `${fleetOnline}/${estateAssets.length}`, label: "Fleet online" },
    { icon: ShieldCheck, value: "99.62%", label: "Proof of play" },
    { icon: Bell, value: String(tickets.filter((ticket) => ticket.status !== "Resolved").length), label: "Active alerts" },
    { icon: CalendarClock, value: queued.length ? `${queued.length} · ${t("next")} ${fmtGst(slotEnd).slice(0, 5)}` : "0", label: "Queued campaigns" },
  ];

  return (
    <div className="cc-page">
      <LiveMap
        assets={visibleAssets}
        selectedAssetId={selectedAssetId}
        onMarkerClick={(id) => setSelectedAssetId(id === selectedAssetId ? "" : id)}
        openAlarmAssetIds={openAlarmAssetIds}
        variant="canvas"
        pinKindFor={pinKindFor}
        t={t}
      />

      <div className="cc-top">
        <div className="cc-zone">
          <button type="button" className="cc-zone-pill" onClick={() => setZoneOpen((open) => !open)} aria-expanded={zoneOpen}>
            {t(zone === "All zones" ? "Abu Dhabi City" : zone)} <ChevronDown size={15} />
          </button>
          {zoneOpen ? (
            <div className="cc-zone-menu" role="menu">
              <button type="button" onClick={() => { setZone("All zones"); setZoneOpen(false); }}>{t("Abu Dhabi City")} <em>{estateAssets.length}</em></button>
              {zoneStats.map((item) => (
                <button key={item.name} type="button" onClick={() => { setZone(item.name); setZoneOpen(false); }}>
                  {t(item.name)} <em>{item.total}</em>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="cc-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="cc-kpi">
              <span className="cc-kpi-icon"><kpi.icon size={17} /></span>
              <div>
                <strong>{kpi.value}</strong>
                <small>{t(kpi.label)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-right">
        {headlineTicket && !toastDismissed ? (
          <div className="cc-toast" role="status">
            {/* The alert glyph is the design's own exported asset (node 127:3743),
                blur bounds included: 112.6x116.8 render around a 40x40 layout box. */}
            <span className="cc-toast-glyph-box"><img src="/icons/alert-bell.png" alt="" /></span>
            <div>
              <strong>{t(headlineTicket.title)}</strong>
              <small>{headlineTicket.asset} • {t(estateAssets.find((asset) => asset.id === headlineTicket.asset)?.name ?? headlineTicket.team)}</small>
              <small className="cc-toast-time">12 {t("min ago")}</small>
            </div>
            <button type="button" className="cc-handle" onClick={goToAlerts}>{t("Handle")}</button>
          </div>
        ) : null}
        <div className="cc-more">
          <button type="button" className="cc-more-btn" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>
            {t("More")} <ChevronDown size={14} />
          </button>
          {moreOpen ? (
            <div className="cc-more-menu" role="menu">
              <button type="button" onClick={() => { setMoreOpen(false); goToAlerts(); }}><ShieldAlert size={15} /> {t("Launch emergency alert")}</button>
              <button type="button" className="danger" onClick={() => { setMoreOpen(false); setKillOpen(true); }}><Power size={15} /> {killedAssetIds.length ? `${t("Kill switch")} (${killedAssetIds.length})` : t("Kill switch")}</button>
              <button type="button" onClick={() => { setMoreOpen(false); setDispatchOpen(true); }}><Wrench size={15} /> {t("Dispatch technician")}</button>
              <button type="button" onClick={() => { setMoreOpen(false); notify(t("Refresh forced on all edge caches")); }}><Send size={15} /> {t("Refresh edge feeds")}</button>
              <button type="button" onClick={() => { setMoreOpen(false); notify(t("Schedule frozen. New publishes are blocked.")); }}><LockKeyhole size={15} /> {t("Freeze schedule")}</button>
              <button type="button" disabled={!aiAvailable || digestLoading} onClick={summarizeEstate}><Sparkles size={15} /> {digestLoading ? t("Summarizing") : t("Summarize shift")}</button>
              {toastDismissed && headlineTicket ? <button type="button" onClick={() => { setToastDismissed(false); setMoreOpen(false); }}><Bell size={15} /> {t("Show latest alert")}</button> : null}
            </div>
          ) : null}
        </div>
        {digest ? (
          <div className="cc-digest">
            <span className="cc-toast-icon good"><Sparkles size={16} /></span>
            <div>
              <strong>{t("MediaGPT shift handover")}</strong>
              <small>{isArabicInterface(t) ? digest.ar : digest.en}</small>
            </div>
            <button type="button" className="icon-btn" onClick={() => setDigest(null)} aria-label={t("Close")}>×</button>
          </div>
        ) : null}
      </div>

      <div className="cc-kill">
        <button
          type="button"
          onClick={() => setKillOpen(true)}
          title={t("Kill switch")}
          aria-label={t("Kill switch")}
        >
          <Power size={17} />
          {killedAssetIds.length ? <em>{killedAssetIds.length}</em> : null}
        </button>
      </div>

      {selectedAsset ? (
        <section className="cc-popover" role="dialog" aria-label={selectedAsset.id}>
          <header>
            <div>
              <strong>{selectedAsset.id}</strong>
              <small><MapPinned size={13} /> {t(selectedAsset.name)}</small>
            </div>
            <button type="button" className="icon-btn" onClick={() => setSelectedAssetId("")} aria-label={t("Close")}>×</button>
          </header>
          <button
            type="button"
            className="cc-popover-media"
            style={{ backgroundImage: `url("${creativeBackground(selectedPublished?.creativeId ?? published[0]?.creativeId ?? "etihad-retail")}")` }}
            onClick={() => setLiveViewFullscreen(true)}
            aria-label={t("Open live view")}
          />
          <div className="cc-timeline">
            <div className="cc-timeline-head">
              <small>{t("Start time")}</small>
              <span className="cc-remaining">{remainLabel}</span>
              <small>{t("End time")}</small>
            </div>
            <div className="cc-timeline-track"><span style={{ width: `${slotProgress}%` }} /></div>
            <div className="cc-timeline-foot">
              <strong>{fmtGst(slotStart).slice(0, 5)}</strong>
              <strong>{fmtGst(slotEnd).slice(0, 5)}</strong>
            </div>
          </div>
          <div className="cc-rows">
            <div className="cc-row"><small>{t("Server")}</small><span>{t(allocatedIds.has(selectedAsset.id) ? "Commercial" : "Civic")}</span></div>
            <div className="cc-row">
              <small>{t("Status")}</small>
              <StatusPill
                label={selectedKilled ? "Killed" : selectedAlarmed ? "Fault" : selectedAsset.status}
                tone={selectedKilled || selectedAlarmed || selectedAsset.status === "Offline" ? "danger" : selectedAsset.status === "Live" ? "good" : "warn"}
              />
            </div>
            <div className="cc-row"><small>{t("Next slot")}</small><span>{nextQueued ? `${t(nextQueued.campaign)} · ${nextQueued.requestedStart}` : t("Civic road safety rotation")}</span></div>
          </div>
          <footer>
            <Button variant="secondary" icon={HardDrive} onClick={goToNetwork}>{t("View digital twin")}</Button>
            <Button icon={Wrench} onClick={() => setDispatchOpen(true)}>{t("Dispatch technician")}</Button>
          </footer>
        </section>
      ) : null}

      <div className="cc-board">
        <div className="cc-board-inner">
          <div className="cc-board-head">
            <strong>{t("Asset board")}</strong>
            <div className="cc-board-tabs" role="tablist">
              <button type="button" className={boardTab === "now" ? "active" : ""} onClick={() => setBoardTab("now")}>{t("Now")}</button>
              <button type="button" className={boardTab === "queue" ? "active" : ""} onClick={() => setBoardTab("queue")}>{t("Queue")}</button>
            </div>
          </div>
          <div className="cc-strip">
            {boardTab === "now"
              ? estateAssets.map((asset) => {
                  // Full estate, one card per screen (Figma). Status tag rides
                  // inside the image; the asset id sits below the card.
                  const alarmed = openAlarmAssetIds.includes(asset.id);
                  const killed = killedAssetIds.includes(asset.id);
                  const tag = killed
                    ? { label: "Killed", cls: "danger" }
                    : alarmed
                      ? { label: "Fault", cls: "danger" }
                      : asset.status === "Live"
                        ? { label: "Live", cls: "live" }
                        : asset.status === "Offline"
                          ? { label: "Offline", cls: "idle" }
                          : { label: asset.status, cls: "warn" };
                  return (
                    <button key={asset.id} type="button" className="cc-card" onClick={() => setSelectedAssetId(asset.id)}>
                      <span className="cc-card-media" style={{ backgroundImage: `url("${boardPhoto(asset.type)}")` }}>
                        <em className={`cc-tag ${tag.cls}`}>{t(tag.label)}</em>
                        <span className="cc-card-foot">
                          <span><MapPinned size={12} /> {t(asset.name)}</span>
                          <span>{fmtGst(now)}</span>
                        </span>
                      </span>
                      <small>{asset.id}</small>
                    </button>
                  );
                })
              : queued.map((item) => (
                  <button key={item.id} type="button" className="cc-card" onClick={goToAlerts}>
                    <span className="cc-card-media" style={{ backgroundImage: `url("${item.creativeUrl || creativeBackground(item.creativeId)}")` }}>
                      <em className="cc-tag warn">{t("Queued")}</em>
                      <span className="cc-card-foot">
                        <span>{t(item.campaign)}</span>
                        <span>{item.requestedStart}</span>
                      </span>
                    </span>
                    <small>{item.id}</small>
                  </button>
                ))}
            {boardTab === "queue" && !queued.length ? <p className="cc-empty">{t("Nothing queued. Approved campaigns appear here before playout.")}</p> : null}
          </div>
        </div>
      </div>

      {killOpen ? <KillSwitchPanel killedAssetIds={killedAssetIds} onKill={onKill} onRestore={onRestore} onClose={() => setKillOpen(false)} t={t} /> : null}
      {dispatchOpen ? <DispatchDialog onCancel={() => setDispatchOpen(false)} onDispatch={handleDispatch} t={t} /> : null}
      {liveViewFullscreen && selectedAsset ? (
        <LiveViewFullscreen asset={selectedAsset} onClose={() => setLiveViewFullscreen(false)} />
      ) : null}
    </div>
  );
}

// ADMO creative-officer studio: generate a civic visual + bilingual copy
// from a brief, or upload a visual and get an AI creative review. Either
// path sends a governed high-impact submission into the CMS pipeline.
const CREATIVE_GEN_STAGES = [
  "Reading the national brand book",
  "Selecting the UAE flag palette",
  "Composing a landscape layout",
  "Reserving the lower third for wording",
  "Rendering the visual",
];

function CreativeStudio({ onCreateCreative, aiAvailable, t }: { onCreateCreative: (payload: BriefPayload) => Promise<Submission | null>; aiAvailable: boolean; t: (value: string) => string }) {
  const [mode, setMode] = useState<"generate" | "review">("generate");
  const [campaign, setCampaign] = useState("National Day tribute");
  const [brief, setBrief] = useState("UAE National Day, 2 December. Unity, pride and gratitude. Official and warm, bilingual.");
  // The exact wording burned onto the visual. Kept as an editable field, and
  // composited server-side, so the Arabic is always right by construction and
  // never left to the image model to render.
  const [titleAr, setTitleAr] = useState("اليوم الوطني لدولة الإمارات");
  const [titleEn, setTitleEn] = useState("UAE National Day");
  const [dateEn, setDateEn] = useState("2 December");
  const [dateAr, setDateAr] = useState("٢ ديسمبر");
  const [visual, setVisual] = useState("");
  const [visualSource, setVisualSource] = useState("");
  const [busy, setBusy] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [review, setReview] = useState<VisualReview | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function generate() {
    setBusy("generate"); setSent(null); setVisual(""); setStageIndex(0);
    // Walk the "thinking" stages on a timer so the officer always sees progress,
    // whether the background comes back instantly (cached) or after the model
    // renders. Reveal is held to a short minimum so it never flashes.
    const start = performance.now();
    const timer = window.setInterval(() => setStageIndex((value) => Math.min(CREATIVE_GEN_STAGES.length - 1, value + 1)), 2600);
    try {
      const image = await aiGenerateVisual({
        brief: `${campaign}. ${brief}`,
        headline: campaign,
        overlay: { kicker: "ABU DHABI MEDIA OFFICE", en: titleEn, ar: titleAr, sub: dateEn, subAr: dateAr },
      }).catch(() => null);
      const elapsed = performance.now() - start;
      if (elapsed < 9000) await new Promise((resolve) => setTimeout(resolve, 9000 - elapsed));
      if (image?.image) { setVisual(image.image); setVisualSource(image.source ?? ""); }
    } finally {
      window.clearInterval(timer);
      setStageIndex(CREATIVE_GEN_STAGES.length - 1);
      setBusy("");
    }
  }

  function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setVisual(String(reader.result)); setVisualSource("upload"); setReview(null); setSent(null); };
    reader.readAsDataURL(file);
  }

  async function runReview() {
    if (!visual) return;
    setBusy("review");
    try { setReview(await aiReviewVisual({ image: visual, brief: `${campaign}. ${brief}` })); }
    finally { setBusy(""); }
  }

  async function sendToCms() {
    setBusy("send");
    try {
      const submission = await onCreateCreative({
        campaign: campaign.trim() || "Civic creative",
        packageName: "Full estate civic takeover",
        budget: "Non-billed",
        creativeId: "civic-studio",
        creativeUrl: visual || undefined,
        languages: "Arabic and English",
        startDate: "Dec 02, 2026",
        endDate: "Dec 03, 2026",
        priority: "High",
        objective: `${titleEn} | ${titleAr}`,
        contactName: "ADMO Creative Officer",
        contactEmail: "creative@admo.gov.ae",
        brand: "Abu Dhabi Media Office",
        vertical: "Civic",
        audience: "Residents and visitors",
        targetZones: ["Abu Dhabi City"],
        daypart: "Evening peak",
        reach: "Estate-wide",
        compliance: { uaeMedia: true, arabicProof: true, rightsCleared: true, noPolitical: true },
        assets: [],
      });
      if (submission) setSent(submission.id);
    } finally { setBusy(""); }
  }

  return (
    <Panel icon={PenTool} title={t("Creative studio")} action={<StatusPill label={t("ADMO civic creative")} tone="good" />}>
      <Segmented value={mode} onChange={(m) => { setMode(m); setReview(null); setSent(null); }} items={[
        { id: "generate", label: t("Generate a visual") },
        { id: "review", label: t("Review my visual") },
      ]} />

      <div className="studio-grid">
        <div className="studio-controls">
          <label><span>{t("Campaign name")}</span><input value={campaign} onChange={(event) => setCampaign(event.target.value)} /></label>
          <label><span>{t("Creative brief")}</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={3} /></label>
          {mode === "generate" ? (
            <>
              <div className="studio-wording">
                <label dir="rtl"><span>{t("Headline (Arabic)")}</span><input dir="rtl" value={titleAr} onChange={(event) => setTitleAr(event.target.value)} /></label>
                <label><span>{t("Headline (English)")}</span><input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} /></label>
                <label><span>{t("Date line")}</span><input value={`${dateEn} · ${dateAr}`} onChange={(event) => { const [en, ar] = event.target.value.split("·"); setDateEn((en || "").trim()); setDateAr((ar || "").trim()); }} /></label>
              </div>
              <small className="cell-note">{t("MediaGPT paints the background and locks this exact wording on top, so the Arabic is always correct.")}</small>
              <Button icon={Sparkles} disabled={!aiAvailable || busy === "generate"} onClick={generate}>{busy === "generate" ? t("Generating") : t("Generate with MediaGPT")}</Button>
            </>
          ) : (
            <ActionRow>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => onFile(event.target.files)} />
              <Button icon={Upload} variant="secondary" onClick={() => fileRef.current?.click()}>{t("Upload a visual")}</Button>
              <Button icon={Sparkles} disabled={!aiAvailable || !visual || busy === "review"} onClick={runReview}>{busy === "review" ? t("Reviewing") : t("Review with MediaGPT")}</Button>
            </ActionRow>
          )}
        </div>

        <div className="studio-visual">
          {visual ? (
            <div className="creative-frame large" style={{ backgroundImage: `url("${visual}")` }} />
          ) : busy === "generate" ? (
            <div className="studio-thinking">
              <div className="studio-thinking-head"><Sparkles size={16} /><strong>{t("MediaGPT is composing")}</strong></div>
              <ul>
                {CREATIVE_GEN_STAGES.map((stage, index) => (
                  <li key={stage} className={index < stageIndex ? "done" : index === stageIndex ? "active" : ""}>
                    {index < stageIndex ? <CheckCircle2 size={14} /> : <span className="studio-dot" />}
                    <span>{t(stage)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="studio-visual-empty"><ImageIcon size={26} /><span>{mode === "generate" ? t("Your generated visual will appear here.") : t("Upload a visual to review it.")}</span></div>
          )}
          {visualSource === "offline" ? <small className="cell-note">{t("Image model offline. Showing a branded template with the correct wording.")}</small> : null}
        </div>
      </div>

      {review ? (
        <div className="linked-detail">
          <div className="linked-detail-head">
            <span className="panel-icon"><Sparkles size={18} /></span>
            <strong>{t("MediaGPT creative review")}</strong>
            <StatusPill label={review.verdict === "clear" ? t("Clear") : t("Recommendations")} tone={review.verdict === "clear" ? "good" : "warn"} />
          </div>
          <div className="deepscan-grid">
            <div className="deepscan-scores">
              {review.scores.map((score) => (
                <div key={score.label} className="deepscan-bar">
                  <div className="deepscan-bar-head"><span>{t(score.label)}</span><strong>{score.value}%</strong></div>
                  <div className="deepscan-track"><div className={`deepscan-fill tone-${score.tone === "danger" ? "danger" : score.tone === "warn" ? "warn" : "good"}`} style={{ width: `${score.value}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="studio-recos">
              <strong>{t("Recommendations")}</strong>
              <ul>{review.recommendations.map((r) => <li key={r}>{t(r)}</li>)}</ul>
            </div>
          </div>
        </div>
      ) : null}

      {sent ? (
        <div className="radius-result good"><ShieldCheck size={16} /><div><strong>{t("Sent to CMS review")}</strong><small>{sent}: {t("routed to governed approval as a high-impact civic creative.")}</small></div></div>
      ) : (
        <ActionRow>
          <Button icon={Send} disabled={!visual || busy === "send"} onClick={sendToCms}>{busy === "send" ? t("Sending") : t("Send to CMS review")}</Button>
        </ActionRow>
      )}
    </Panel>
  );
}

function CmsPage({
  submissions,
  schedule,
  published,
  profile,
  onStage,
  onRequestChanges,
  onApprove,
  onPlaySchedule,
  onCreateCreative,
  aiAvailable,
  t,
}: {
  submissions: Submission[];
  schedule: ScheduleItem[];
  published: PublishedItem[];
  profile: Profile | null;
  onStage: (id: string, next: SubmissionStage) => void;
  onRequestChanges: (id: string, message: string) => void;
  onApprove: (id: string, approverName: string, reason: string, mfaCode: string) => void;
  onPlaySchedule: (id: string) => void;
  onCreateCreative: (payload: BriefPayload) => Promise<Submission | null>;
  aiAvailable: boolean;
  t: (value: string) => string;
}) {
  const [tab, setTab] = useState<CmsTab>("submissions");
  const [selectedId, setSelectedId] = useState(submissions[0]?.id || "");
  const selected = submissions.find((item) => item.id === selectedId) ?? submissions[0];
  const approved = submissions.filter((item) => ["Approved", "Scheduled", "Published"].includes(item.stage)).length;
  const pending = submissions.filter((item) => item.stage === "Submitted" || item.stage === "In review").length;
  const approvalRate = submissions.length ? Math.round((approved / submissions.length) * 100) : 0;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Submissions" value={String(submissions.length)} helper="Active CMS queue" tone="info" />
        <Metric label="Approval rate" value={`${approvalRate}%`} helper="Approved or beyond" tone="good" />
        <Metric label="Last 7 days" value="18" helper="New bidder files" tone="neutral" />
        <Metric label="Needs review" value={String(pending)} helper="Reviewer action required" tone={pending ? "warn" : "good"} />
      </MetricGrid>

      <Segmented value={tab} onChange={setTab} items={[
        { id: "submissions", label: t("Submissions") },
        { id: "create", label: t("Create with AI") },
        { id: "library", label: t("Media Library") },
        { id: "scheduling", label: t("Scheduling") },
      ]} />

      {tab === "create" ? <CreativeStudio onCreateCreative={onCreateCreative} aiAvailable={aiAvailable} t={t} /> : null}

      {tab === "submissions" && selected ? (
        <Panel icon={FileCheck2} title={t("Submissions")} action={itemCountLabel(submissions.length, t)}>
            <div className="submission-list submissions-catalogue">
              {submissions.map((item) => (
                <button key={item.id} className={item.id === selected.id ? "selected" : ""} type="button" onClick={() => setSelectedId(item.id)}>
                  <span className={`dot ${priorityTone(item.priority)}`} />
                  <span>
                    <strong>{t(item.campaign)}</strong>
                    <small>{t(item.bidder)} / {t(item.stage)}</small>
                  </span>
                  <StatusPill label={item.priority} tone={priorityTone(item.priority)} />
                </button>
              ))}
            </div>
          <LinkedDetail icon={ClipboardCheck} title={t(selected.campaign)} action={<span className="head-meta">{selected.id}</span>}>
            <SubmissionDetail submission={selected} profile={profile} aiAvailable={aiAvailable} onStage={onStage} onRequestChanges={onRequestChanges} onApprove={onApprove} />
          </LinkedDetail>
        </Panel>
      ) : null}

      {tab === "library" && <MediaLibrary t={t} />}
      {tab === "scheduling" && <SchedulingBoard schedule={schedule} onPlayNow={onPlaySchedule} t={t} />}
    </PageBody>
  );
}

function SubmissionDetail({
  submission,
  profile,
  aiAvailable,
  onStage,
  onRequestChanges,
  onApprove,
}: {
  submission: Submission;
  profile: Profile | null;
  aiAvailable: boolean;
  onStage: (id: string, stage: SubmissionStage) => void;
  onRequestChanges: (id: string, message: string) => void;
  onApprove: (id: string, approverName: string, reason: string, mfaCode: string) => void;
}) {
  const t = useT();
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [tags, setTags] = useState<SubmissionTags | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [triage, setTriage] = useState<SubmissionTriageResponse | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [mfaDialog, setMfaDialog] = useState<{ approverName: string; reason: string } | null>(null);

  // Triage/tag results belong to one submission; clear them when the reviewer
  // switches items so a stale proposal can never be acted on against the wrong one.
  useEffect(() => {
    setTriage(null);
    setTriageLoading(false);
    setTags(null);
    setTagLoading(false);
    setMfaDialog(null);
  }, [submission.id]);

  function sendRevisionRequest(message: string) {
    onRequestChanges(submission.id, message);
    setRevisionDialogOpen(false);
  }

  async function runTagging() {
    setTagLoading(true);
    const result = await aiTagSubmission({ submission });
    setTags(result);
    setTagLoading(false);
  }

  async function runTriage() {
    setTriageLoading(true);
    const result = await aiTriageSubmission({ submissionId: submission.id, actor: "ADMO CMS", role: "reviewer" });
    if ("proposal" in result) setTriage(result);
    setTriageLoading(false);
  }

  async function decideTriageAction(action: PendingAgentAction, decision: "approve" | "reject") {
    const result = decision === "approve"
      ? await aiApproveAgentAction({ id: action.id, actor: "ADMO CMS", role: "reviewer" })
      : await aiRejectAgentAction({ id: action.id, actor: "ADMO CMS", role: "reviewer", reason: "Rejected from CMS triage" });
    if ("action" in result && triage) setTriage({ ...triage, action: result.action });
  }

  return (
    <div className="detail-stack">
      <StageTracker stage={submission.stage} />
      <section className="ai-mini-panel">
        <div>
          <span>{tags ? "MediaGPT routing" : "MediaGPT tagging"}</span>
          <strong>
            {tags
              ? `${tags.industry} | ${tags.riskTier} risk | ${tags.suggestedApprover}`
              : "Classify submission risk, route and review window"}
          </strong>
          {tags ? (
            <small>{tags.suggestedWindow}</small>
          ) : (
            <small>{aiAvailable ? "Uses submission metadata and platform rules." : "AI key unavailable."}</small>
          )}
        </div>
        <div className="chip-row">
          {tags?.tags.map((tag) => <span key={tag}>{tag}</span>)}
          <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || tagLoading} onClick={runTagging}>{tagLoading ? "Tagging" : "Auto-tag"}</Button>
          <Button icon={Workflow} variant="secondary" disabled={!aiAvailable || triageLoading} onClick={runTriage}>{triageLoading ? "Triaging" : "Run agent triage"}</Button>
        </div>
      </section>
      {triage ? (
        <section className="ai-mini-panel agent-triage-panel">
          <div>
            <span>MediaGPT triage</span>
            <strong>{triage.proposal.summary}</strong>
            <small>{triage.proposal.reasons?.slice(0, 2).join(" | ")}</small>
            {triage.proposal.citations?.length ? (
              <div className="citation-row">
                {triage.proposal.citations.slice(0, 4).map((citation) => <span key={citation}>{citation}</span>)}
              </div>
            ) : null}
          </div>
          {triage.action ? (
            <AgentActionCard
              action={triage.action}
              onApprove={() => decideTriageAction(triage.action as PendingAgentAction, "approve")}
              onReject={() => decideTriageAction(triage.action as PendingAgentAction, "reject")}
              t={t}
            />
          ) : (
            <StatusPill label="No stage change proposed" tone="neutral" />
          )}
        </section>
      ) : null}
      <AiDeepScan
        submission={submission}
        onRequestChanges={() => setRevisionDialogOpen(true)}
        onStage={(stage) => onStage(submission.id, stage)}
      />
      <div className="submission-hero">
        <div className="creative-frame large" style={{ backgroundImage: `url("${submission.creativeUrl || creativeBackground(submission.creativeId)}")` }} />
        <div className="detail-cards compact">
          <Detail label="Owner" value={submission.owner} />
          <Detail label="Package" value={submission.packageName} />
          <Detail label="Budget" value={submission.budget} />
          <Detail label="Start" value={submission.requestedStart} />
          <Detail label="Language" value={submission.language} />
        </div>
      </div>

      <ReviewerNotes submissionId={submission.id} />

      {submission.stage === "In review" ? (
        <SubmissionApprovals
          submission={submission}
          onRequestApproval={(approverName) => {
            if (submission.category === "routine") {
              onApprove(submission.id, approverName, "Named approver signed", "");
            } else {
              setMfaDialog({ approverName, reason: "Named approver signed with MFA step-up" });
            }
          }}
          t={t}
        />
      ) : null}

      <SubmissionJournal submission={submission} t={t} />

      <ActionRow>
        {submission.stage === "Submitted" && <Button onClick={() => onStage(submission.id, "In review")}>Start review</Button>}
        {submission.stage === "In review" && (
          <>
            <Button variant="secondary" icon={Send} onClick={() => setRevisionDialogOpen(true)}>Prepare bidder message</Button>
            <Button variant="secondary" onClick={() => onStage(submission.id, "Submitted")}>Return to intake</Button>
          </>
        )}
        {submission.stage === "Approved" && <Button onClick={() => onStage(submission.id, "Scheduled")}>Add to schedule</Button>}
        {submission.stage === "Scheduled" && <Button onClick={() => onStage(submission.id, "Published")}>Publish</Button>}
        {submission.stage === "Published" && <StatusPill label="Published to network" tone="good" />}
        {submission.stage === "Changes requested" && <StatusPill label="Waiting for bidder revision" tone="warn" />}
      </ActionRow>
      {revisionDialogOpen ? (
        <RevisionRequestDialog
          submission={submission}
          initialMessage={defaultRevisionMessage(submission)}
          onCancel={() => setRevisionDialogOpen(false)}
          onSend={sendRevisionRequest}
        />
      ) : null}
      {mfaDialog ? (
        <MfaStepUpDialog
          approverName={mfaDialog.approverName}
          onCancel={() => setMfaDialog(null)}
          onVerify={(code) => {
            onApprove(submission.id, mfaDialog.approverName, mfaDialog.reason, code);
            setMfaDialog(null);
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}

const CATEGORY_TONE: Record<SubmissionCategory, Tone> = { routine: "neutral", sensitive: "warn", "high-impact": "danger" };

function hashPrefix(hash: string) {
  return hash && hash !== "seed" ? `${hash.slice(0, 10)}…` : "—";
}

function SubmissionJournal({ submission, t }: { submission: Submission; t: (value: string) => string }) {
  const entries = [...(submission.journal ?? [])].reverse();
  if (!entries.length) return null;
  return (
    <section className="journal-panel">
      <div className="journal-head">
        <strong>{t("Stage journal")}</strong>
        <span>{t("v")}{submission.version} · {t("hash")} {hashPrefix(submission.contentHash)}</span>
      </div>
      <ol className="journal-timeline">
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="journal-entry">
            <span className="journal-dot" />
            <div className="journal-body">
              <div className="journal-row">
                <strong>{t(entry.decision)}</strong>
                <em>{entry.at.replace("T", " ").slice(0, 16)}</em>
              </div>
              <span className="journal-meta">{t(entry.actor)} · {t(entry.role)} · {t(entry.stage)}{entry.version ? ` · v${entry.version}` : ""}</span>
              {entry.reason ? <p className="journal-reason">{t(entry.reason)}</p> : null}
              {entry.diff?.length ? (
                <ul className="journal-diff">
                  {entry.diff.map((line) => <li key={line}>{line}</li>)}
                </ul>
              ) : null}
              <span className="journal-next">
                {entry.nextAssignee ? `${t("Next")}: ${t(entry.nextAssignee)}` : ""}
                {entry.slaDueAt ? ` · ${t("SLA due")} ${entry.slaDueAt.replace("T", " ").slice(0, 16)}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SubmissionApprovals({
  submission,
  onRequestApproval,
  t,
}: {
  submission: Submission;
  onRequestApproval: (approverName: string) => void;
  t: (value: string) => string;
}) {
  const eligible = namedApprovers.filter((approver) => approver.canApprove.includes(submission.category));
  const alreadySigned = new Set(submission.approvals.map((signature) => signature.name));
  const [approverName, setApproverName] = useState("");
  const dualControl = submission.category === "high-impact";
  const needed = dualControl ? 2 : 1;
  const have = submission.approvals.length;

  const options = eligible.filter(
    (approver) => approver.name !== submission.owner && approver.name !== submission.bidder && !alreadySigned.has(approver.name),
  );

  return (
    <section className="approvals-panel">
      <div className="approvals-head">
        <div>
          <strong>{t("Named-approver decision")}</strong>
          <span>
            {t("Category")}: <StatusPill label={submission.category} tone={CATEGORY_TONE[submission.category]} />
            {" · "}{dualControl ? t("Dual control (2 approvers + MFA)") : submission.category === "sensitive" ? t("Named approver + MFA") : t("Named approver")}
          </span>
        </div>
        <StatusPill label={`${have} / ${needed} ${t("approved")}`} tone={have >= needed ? "good" : "warn"} />
      </div>

      {submission.approvals.length ? (
        <div className="approvals-signatures">
          {submission.approvals.map((signature) => (
            <span key={signature.name} className="approval-sig">
              <ShieldCheck size={14} /> {t(signature.name)} · {t(signature.role)}{signature.mfa ? ` · ${t("MFA")}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <p className="approvals-sod">{t("Segregation of duties: the owner and the bidder cannot approve their own submission.")}</p>

      <div className="approvals-action">
        <label>
          {t("Approving as")}
          <select value={approverName} onChange={(event) => setApproverName(event.target.value)}>
            <option value="">{t("Select a named approver")}</option>
            {options.map((approver) => (
              <option key={approver.name} value={approver.name}>{approver.name} ({t(approver.role)})</option>
            ))}
          </select>
        </label>
        <Button
          icon={ShieldCheck}
          disabled={!approverName}
          onClick={() => onRequestApproval(approverName)}
        >
          {submission.category === "routine" ? t("Approve") : dualControl && have >= 1 ? t("Second approval (MFA)") : t("Approve with MFA")}
        </Button>
      </div>
      {!options.length ? <p className="approvals-empty">{t("No further eligible approvers. Dual control requires two distinct named approvers.")}</p> : null}
    </section>
  );
}

function MfaStepUpDialog({
  approverName,
  onCancel,
  onVerify,
  t,
}: {
  approverName: string;
  onCancel: () => void;
  onVerify: (code: string) => void;
  t: (value: string) => string;
}) {
  const [code, setCode] = useState("");
  const valid = /^[0-9]{6}$/.test(code);
  return (
    <div className="wizard-backdrop revision-backdrop mfa-backdrop" role="presentation" onClick={onCancel}>
      <section className="revision-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="revision-header">
          <span className="panel-icon"><ShieldCheck size={18} /></span>
          <div>
            <strong>{t("MFA step-up verification")}</strong>
            <small>{t("Approving as")} {t(approverName)}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={t("Close")}>×</button>
        </header>
        <div className="revision-body">
          <p className="revision-impact">{t("High-impact and sensitive content require multi-factor step-up. Enter the 6-digit authenticator code.")}</p>
          <label className="revision-field">
            {t("Authenticator code")}
            <input inputMode="numeric" maxLength={6} value={code} placeholder="••••••" onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} />
          </label>
          <p className="mfa-hint">{t("Demo: any 6-digit code verifies.")}</p>
        </div>
        <footer className="revision-footer">
          <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
          <Button icon={ShieldCheck} disabled={!valid} onClick={() => onVerify(code)}>{t("Verify and approve")}</Button>
        </footer>
      </section>
    </div>
  );
}

function defaultRevisionMessage(submission: Submission) {
  const review = getSubmissionAiReview(submission);
  const findings = review?.findings.filter((finding) => !finding.ok).map((finding) => `- ${finding.label}`) || [
    "- Enlarge the CTA by 12% for highway assets.",
    "- Keep Arabic and English copy aligned.",
    "- Re-upload the revised creative pack for CMS review.",
  ];
  return [
    `Hello ${submission.bidder} team,`,
    "",
    `ADMO reviewed "${submission.campaign}" and MediaGPT flagged the following before approval:`,
    "",
    ...findings,
    "",
    "This campaign will remain in Changes requested until the revised pack is submitted.",
    "",
    "Thank you,",
    "ADMO CMS",
  ].join("\n");
}

function RevisionRequestDialog({
  submission,
  initialMessage,
  onCancel,
  onSend,
}: {
  submission: Submission;
  initialMessage: string;
  onCancel: () => void;
  onSend: (message: string) => void;
}) {
  const t = useT();
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage, submission.id]);

  return (
    <div className="wizard-backdrop revision-backdrop" role="presentation">
      <section className="revision-dialog" role="dialog" aria-modal="true" aria-label={t("Send revision request")}>
        <header className="revision-header">
          <div>
            <span>{t("Bidder communication")}</span>
            <strong>{t("Send revision request")}</strong>
            <small>{t("Message is sent to the advertiser workspace and updates the campaign status.")}</small>
          </div>
          <button className="icon-btn" type="button" onClick={onCancel} aria-label={t("Close")}>
            <X size={16} />
          </button>
        </header>
        <div className="revision-body">
          <div className="revision-meta">
            <Detail label="Campaign" value={submission.campaign} />
            <Detail label="Bidder" value={submission.bidder} />
            <Detail label="Current status" value={submission.stage} />
          </div>
          <label className="revision-field">
            <span>{t("Message to bidder")}</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <div className="revision-impact">
            <Sparkles size={16} />
            <span>{t("This will mark the campaign as Changes requested and make the bidder action visible in Campaigns.")}</span>
          </div>
        </div>
        <footer className="revision-footer">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button icon={Send} onClick={() => onSend(message)} disabled={!message.trim()}>Send revision request</Button>
        </footer>
      </section>
    </div>
  );
}

type SubmissionAiAction = "requestChanges" | "approve" | "schedule" | "publish" | "proof";

interface SubmissionAiReview {
  tone: Tone;
  status: string;
  title: string;
  helper: string;
  action: SubmissionAiAction;
  actionLabel: string;
  ruleIds: string[];
  sourceIds: string[];
  scores: Array<{ label: string; value: number; tone: Tone }>;
  findings: Array<{ label: string; ok: boolean }>;
}

function getSubmissionAiReview(submission: Submission): SubmissionAiReview | null {
  if (submission.stage === "Submitted" || submission.stage === "Changes requested") return null;

  if (submission.stage === "In review") {
    if (submission.id === "SUB-1048") {
      return {
        tone: "warn",
        status: "Issue detected",
        title: "MediaGPT recommends requesting rights evidence and a bilingual copy correction before approval.",
        helper: "Rights declaration missing for one image",
        action: "requestChanges",
        actionLabel: "Prepare bidder message",
        ruleIds: ["RULE-CMS-001", "RULE-CMS-003", "RULE-AI-001"],
        sourceIds: ["KB-CRE-002", "KB-CRE-003", "KB-AI-001"],
        scores: [
          { label: "Brand safety", value: 96, tone: "good" },
          { label: "Cultural sensitivity", value: 91, tone: "good" },
          { label: "Arabic accuracy", value: 78, tone: "warn" },
          { label: "Rights evidence", value: 62, tone: "warn" },
          { label: "Legibility at 40m", value: 88, tone: "good" },
        ],
        findings: [
          { label: "No prohibited symbols detected", ok: true },
          { label: "Arabic copy is weaker than English headline", ok: false },
          { label: "Suggested: add talent and image rights evidence", ok: false },
          { label: "Contrast ratio 4.9:1 (min 4.5)", ok: true },
        ],
      };
    }

    return {
      tone: "warn",
      status: "Issue detected",
      title: "MediaGPT recommends requesting a CTA-size adjustment before approval.",
      helper: "Suggested: enlarge CTA by 12% for highway assets",
      action: "requestChanges",
      actionLabel: "Prepare bidder message",
      ruleIds: ["RULE-CMS-002", "RULE-AI-001"],
      sourceIds: ["KB-CRE-001", "KB-AI-001"],
      scores: [
        { label: "Brand safety", value: 94, tone: "good" },
        { label: "Cultural sensitivity", value: 92, tone: "good" },
        { label: "Arabic accuracy", value: 95, tone: "good" },
        { label: "Legibility at 40m", value: 76, tone: "warn" },
        { label: "Copyright match", value: 100, tone: "good" },
      ],
      findings: [
        { label: "No prohibited symbols detected", ok: true },
        { label: "Arabic RTL punctuation validated", ok: true },
        { label: "Contrast ratio 4.9:1 (min 4.5)", ok: true },
        { label: "Suggested: enlarge CTA by 12% for highway assets", ok: false },
      ],
    };
  }

  if (submission.stage === "Approved") {
    return {
      tone: "info",
      status: "Scheduling recommendation",
      title: "MediaGPT recommends moving this approved campaign into the Yas evening leisure slot.",
      helper: "Best slot: 19:00-22:00 leisure traffic peak",
      action: "schedule",
      actionLabel: "Add to schedule",
      ruleIds: ["RULE-COM-002", "RULE-AI-001"],
      sourceIds: ["KB-COM-002", "KB-AI-001"],
      scores: [
        { label: "Audience fit", value: 94, tone: "good" },
        { label: "Package fit", value: 97, tone: "good" },
        { label: "Budget floor", value: 91, tone: "good" },
        { label: "Category separation", value: 96, tone: "good" },
      ],
      findings: [
        { label: "Yas Island inventory has clean category separation", ok: true },
        { label: "Best slot: 19:00-22:00 leisure traffic peak", ok: true },
        { label: "No finance floor conflict detected", ok: true },
      ],
    };
  }

  if (submission.stage === "Scheduled") {
    return {
      tone: "good",
      status: "Distribution readiness",
      title: "MediaGPT confirms the public notice is ready for protected edge distribution.",
      helper: "Publish window is still inside SLA",
      action: "publish",
      actionLabel: "Publish",
      ruleIds: ["RULE-EMG-002", "RULE-EMG-004", "RULE-AI-001"],
      sourceIds: ["KB-EMG-002", "KB-EMG-004", "KB-AI-001"],
      scores: [
        { label: "Authority match", value: 99, tone: "good" },
        { label: "SLA readiness", value: 97, tone: "good" },
        { label: "Edge route", value: 95, tone: "good" },
        { label: "Arabic accuracy", value: 93, tone: "good" },
      ],
      findings: [
        { label: "CAP-style payload complete", ok: true },
        { label: "Protected edge route is available", ok: true },
        { label: "Publish window is still inside SLA", ok: true },
      ],
    };
  }

  if (submission.stage === "Published") {
    return {
      tone: "warn",
      status: "Proof reconciliation",
      title: "MediaGPT is reconciling proof-of-play before final settlement.",
      helper: "One proof bundle pending reconciliation",
      action: "proof",
      actionLabel: "View proof status",
      ruleIds: ["RULE-POP-001", "RULE-POP-002", "RULE-AI-001"],
      sourceIds: ["KB-POP-001", "KB-POP-002", "KB-AI-001"],
      scores: [
        { label: "Proof coverage", value: 84, tone: "warn" },
        { label: "Ledger integrity", value: 98, tone: "good" },
        { label: "Playback match", value: 91, tone: "good" },
        { label: "Settlement state", value: 72, tone: "warn" },
      ],
      findings: [
        { label: "Signed playback events are arriving", ok: true },
        { label: "One proof bundle pending reconciliation", ok: false },
        { label: "Settlement remains blocked until ledger closes", ok: false },
      ],
    };
  }

  return null;
}

function AiDeepScan({
  submission,
  onRequestChanges,
  onStage,
}: {
  submission: Submission;
  onRequestChanges: () => void;
  onStage: (stage: SubmissionStage) => void;
}) {
  const t = useT();
  const review = getSubmissionAiReview(submission);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rerun, setRerun] = useState(0);

  if (!review) return null;

  function runPrimaryAction() {
    if (!review) return;
    if (review.action === "requestChanges") {
      onRequestChanges();
      return;
    }
    if (review.action === "schedule") {
      onStage("Scheduled");
      return;
    }
    if (review.action === "publish") {
      onStage("Published");
      return;
    }
    if (review.action === "approve") {
      onStage("Approved");
    }
  }

  const hasPrimaryAction = review.action !== "proof";

  return (
    <section className={`ai-review-card ${review.tone === "warn" || review.tone === "danger" ? "has-issue" : "clear"}`}>
      <div className="ai-review-summary">
        <div className="ai-review-icon"><Sparkles size={18} /></div>
        <div>
          <span>{t("AI recommendation")}</span>
          <strong>{t(review.title)}</strong>
          <small>{t(review.helper)}</small>
        </div>
        <StatusPill label={review.status} tone={review.tone} />
      </div>
      <div className="ai-review-actions">
        {hasPrimaryAction ? (
          <Button icon={review.action === "requestChanges" ? Send : CheckCircle2} onClick={runPrimaryAction}>
            {t(review.actionLabel)}
          </Button>
        ) : (
          <Button variant="secondary" icon={FileCheck2} onClick={() => setDetailsOpen(true)}>{t(review.actionLabel)}</Button>
        )}
        <Button variant="secondary" icon={RefreshCcw} onClick={() => setRerun((n) => n + 1)}>{t("Run MediaGPT check")}</Button>
        <Button variant="secondary" icon={detailsOpen ? X : Sparkles} onClick={() => setDetailsOpen((value) => !value)}>
          {detailsOpen ? t("Hide AI details") : t("Show AI details")}
        </Button>
      </div>
      {detailsOpen ? (
        <div className="deepscan-panel" aria-label={t("Detailed MediaGPT scan")}>
          <IntelligenceCitations
            ruleIds={review.ruleIds}
            sourceIds={review.sourceIds}
            action={review.actionLabel}
          />
          <div className="deepscan-grid">
            <div className="deepscan-scores">
              {review.scores.map((score) => (
                <div key={score.label} className="deepscan-bar">
                  <div className="deepscan-bar-head">
                    <span>{t(score.label)}</span>
                    <strong>{Math.min(100, score.value + rerun)}%</strong>
                  </div>
                  <div className="deepscan-track"><div className={`deepscan-fill tone-${score.tone}`} style={{ width: `${Math.min(100, score.value + rerun)}%` }} /></div>
                </div>
              ))}
            </div>
            <ul className="deepscan-findings">
              {review.findings.map((f) => (
                <li key={f.label} className={f.ok ? "ok" : "warn"}>
                  {f.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <span>{t(f.label)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewerNotes({ submissionId }: { submissionId: string }) {
  const t = useT();
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Array<{ author: string; time: string; body: string }>>([
    { author: "L. Fahim", time: "10:12", body: "Creative aligns with sovereign guidelines. Awaiting Arabic proof-read." },
  ]);
  function post() {
    if (!note.trim()) return;
    const now = new Date();
    setNotes([{ author: "You", time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, body: note.trim() }, ...notes]);
    setNote("");
  }
  return (
    <Panel icon={MessageSquare} title={t("Reviewer notes")}>
      <div className="reviewer-notes">
        <div className="reviewer-composer">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add a note for the bidder or ops team")} />
          <Button onClick={post} icon={Send}>{t("Post note")}</Button>
        </div>
        <ul className="reviewer-thread">
          {notes.map((n, i) => (
            <li key={`${submissionId}-${i}`}>
              <div className="reviewer-avatar">{n.author.charAt(0)}</div>
              <div><strong>{n.author}</strong> <span>{n.time}</span><p>{t(n.body)}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}


function MediaLibrary({ t }: { t: (value: string) => string }) {
  const [category, setCategory] = useState<MediaAsset["type"] | "All">("All");
  const [assets, setAssets] = useState(seedMediaAssets);
  const [uploadNotice, setUploadNotice] = useState("");
  const items = assets.filter((item) => category === "All" || item.type === category);
  const categories: Array<MediaAsset["type"] | "All"> = ["All", "Image", "Video", "Document", "Live Stream"];
  function uploadMedia() {
    const type: MediaAsset["type"] = category === "All" ? "Image" : category;
    const uploaded: MediaAsset = {
      id: `MED-UP-${Date.now()}`,
      title: "Uploaded creative pack",
      type,
      tags: ["uploaded", "cms-review"],
      status: "Pending Review",
      owner: "ADMO CMS",
      updated: "Just now",
    };
    setAssets((current) => [uploaded, ...current]);
    setCategory(type);
    setUploadNotice("Media upload staged for CMS review.");
  }

  return (
    <div className="media-layout">
      <aside className="subsidebar">
        {categories.map((item) => (
          <button key={item} className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)}>
            <MediaTypeIcon type={item === "All" ? "Image" : item} />
            <span>{t(item)}</span>
          </button>
        ))}
      </aside>
      <Panel icon={ImageIcon} title={t("Media Library")} action={<Button icon={Upload} onClick={uploadMedia}>{t("Upload media")}</Button>}>
        {uploadNotice ? <p className="media-notice">{t(uploadNotice)}</p> : null}
        <div className="media-grid">
          {items.map((item, index) => (
            <article key={item.id} className="media-card">
              <div className="creative-frame" style={{ backgroundImage: `url("${creativeBackground(mediaCreative(index))}")` }}>
                <StatusPill label={item.type} tone="info" />
              </div>
              <strong>{t(item.title)}</strong>
              <span>{t(item.owner)} / {item.updated}</span>
              <StatusPill label={item.status} tone={item.status === "Approved" ? "good" : item.status === "Rejected" ? "danger" : "warn"} />
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SchedulingBoard({
  schedule,
  onPlayNow,
  t,
}: {
  schedule: ScheduleItem[];
  onPlayNow: (id: string) => void;
  t: (value: string) => string;
}) {
  return (
    <Panel icon={CalendarDays} title={t("Scheduling")}>
      <div className="schedule-list">
        {schedule.map((slot) => (
          <article key={slot.id} className="schedule-row">
            <time>{slot.time}</time>
            <div>
              <strong>{t(slot.campaign)}</strong>
              <span>{slot.asset} / {t(slot.owner)}</span>
            </div>
            <StatusPill label={slot.state} tone={slot.state === "Playing" ? "good" : "info"} />
            {slot.state !== "Playing" ? <Button variant="secondary" onClick={() => onPlayNow(slot.id)}>Play now</Button> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

interface EmergencyAssist {
  parity: boolean;
  parityIssues: string[];
  layoutNote: string;
  routeRationale: string;
  proposedAssets: Array<{ id: string; name: string; zone: string }>;
  source?: string;
}

const emptyAlertDraft = {
  identifier: "", sender: "NCEMA", area: "", scopeMode: "zone" as AlertScopeMode,
  severity: "Severe", urgency: "Immediate", certainty: "Observed",
  headline: "", bodyEn: "", bodyAr: "", criticality: "Critical",
};

function CountdownBadge({ deadlineAt, t }: { deadlineAt: string; t: (v: string) => string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return <span className={`emg-countdown ${remaining === 0 ? "done" : ""}`}>{remaining === 0 ? t("On network") : `${t("Display within")} ${mm}:${ss}`}</span>;
}

function AlertsPage({
  alerts,
  steps,
  onCreateAlert,
  onRunChecks,
  onApproveAlert,
  onQueueBroadcast,
  onBroadcastNow,
  onAckAlert,
  onResetAlert,
  aiAvailable,
  t,
}: {
  alerts: EmergencyAlert[];
  steps: VerificationStep[];
  onCreateAlert: (payload: Record<string, unknown>) => Promise<EmergencyAlert | null>;
  onRunChecks: (id: string) => void;
  onApproveAlert: (id: string, approverName: string, mfaCode: string) => void;
  onQueueBroadcast: (id: string) => void;
  onBroadcastNow: (id: string) => void;
  onAckAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  aiAvailable: boolean;
  t: (value: string) => string;
}) {
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0]?.id ?? "");
  const [draft, setDraft] = useState({ ...emptyAlertDraft });
  const [assist, setAssist] = useState<EmergencyAssist | null>(null);
  const [assisting, setAssisting] = useState(false);
  const [mfaApprover, setMfaApprover] = useState<string | null>(null);
  const [pickApprover, setPickApprover] = useState("");
  const selected = alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0];
  const checked = steps.every((step) => step.state === "Checked");

  useEffect(() => {
    if (alerts.length && !alerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(alerts[0].id);
    }
  }, [alerts, selectedAlertId]);
  useEffect(() => { setAssist(null); setPickApprover(""); setMfaApprover(null); }, [selectedAlertId]);

  async function ingestCap(event: FormEvent) {
    event.preventDefault();
    if (!draft.headline.trim()) return;
    const created = await onCreateAlert({
      title: draft.headline,
      headline: draft.headline,
      scope: draft.area,
      area: draft.area,
      scopeMode: draft.scopeMode,
      identifier: draft.identifier || `NCEMA-${Date.now().toString().slice(-6)}`,
      sender: draft.sender,
      severity: draft.severity,
      urgency: draft.urgency,
      certainty: draft.certainty,
      bodyEn: draft.bodyEn,
      bodyAr: draft.bodyAr,
      content: draft.bodyEn,
      criticality: draft.criticality as EmergencyAlert["criticality"],
    });
    if (created) setSelectedAlertId(created.id);
    setDraft({ ...emptyAlertDraft });
  }

  // Read-only AI assist: routing + translation parity + layout. Never edits content.
  async function runAssist() {
    if (!selected) return;
    setAssisting(true);
    try {
      const response = await fetch("/api/dooh/ai/emergencyAssist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: selected.area || selected.scope, bodyEn: selected.bodyEn, bodyAr: selected.bodyAr }),
      });
      setAssist(await response.json());
    } catch {
      setAssist(null);
    }
    setAssisting(false);
  }

  if (!selected) return null;
  const approvals = selected.approvals ?? [];
  const neededApprovals = selected.scopeMode === "citywide" ? 2 : 1;
  const canBroadcast = selected.state === "Approved" || selected.state === "Broadcast queued";
  const approverOptions = namedApprovers.filter((a) => !approvals.some((s) => s.name === a.name));

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Ongoing alerts" value={String(alerts.length)} helper="Active or queued" tone="danger" />
        <Metric label="Live broadcasts" value={String(alerts.filter((a) => a.state === "Broadcasting" || a.state === "Live on network").length)} helper="Preempting content" tone="info" />
        <Metric label="Awaiting approval" value={String(alerts.filter((a) => a.state === "Approval required").length)} helper="Named approver gate" tone="warn" />
        <Metric label="Awaiting checks" value={String(alerts.filter((a) => a.state === "Check required").length)} helper="Needs action" tone="warn" />
      </MetricGrid>

      <Panel icon={Bell} title={t("NCEMA CAP alerts")}>
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>{t("Alert")}</th>
                  <th>{t("CAP ID")}</th>
                  <th>{t("Scope")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className={alert.id === selected.id ? "selected-row" : ""} onClick={() => setSelectedAlertId(alert.id)}>
                    <td data-label={t("Alert")}><strong>{t(alert.title)}</strong><span>{t(alert.sender ?? alert.authority)}</span></td>
                    <td data-label={t("CAP ID")}><span className="cell-note">{alert.capIdentifier ?? alert.identifier ?? "-"}</span></td>
                    <td data-label={t("Scope")}>{alert.scopeMode === "citywide" ? t("Citywide") : t(alert.scope)}</td>
                    <td data-label={t("Status")}><StatusPill label={alert.state} tone={alertTone(alert.state)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        <LinkedDetail icon={ShieldAlert} title={t(selected.title)} action={<StatusPill label={selected.state} tone={alertTone(selected.state)} />}>
        <div className="selected-alert-summary">
          <div><span>{t("CAP ID")}</span><strong>{selected.capIdentifier ?? selected.identifier ?? "-"}</strong></div>
          <div><span>{t("Sender")}</span><strong>{t(selected.sender ?? selected.authority)}</strong></div>
          <div><span>{t("Scope")}</span><strong>{selected.scopeMode === "citywide" ? t("Citywide") : t(selected.scope)}</strong></div>
          <div><span>{t("Severity")}</span><strong>{t(selected.severity ?? selected.criticality)}</strong></div>
          <div><span>{t("SLA")}</span><strong>{t(selected.sla)}</strong></div>
          <div><span>{t("Targets")}</span><strong>{selected.targetAssets?.length ?? 0} {t("assets")}</strong></div>
        </div>

        {selected.bodyEn || selected.bodyAr ? (
          <div className="cap-bodies">
            {selected.bodyEn ? <blockquote>{selected.bodyEn}</blockquote> : null}
            {selected.bodyAr ? <blockquote dir="rtl">{selected.bodyAr}</blockquote> : null}
            <small>{t("Alert content originates from NCEMA and is never modified by AI.")}</small>
          </div>
        ) : null}

        <div className="emg-assist">
          <div className="emg-assist-head">
            <strong>{t("AI dissemination assist (read-only)")}</strong>
            <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || assisting} onClick={runAssist}>{assisting ? t("Analyzing") : t("Run AI assist")}</Button>
          </div>
          {assist ? (
            <div className="emg-assist-body">
              <div className="emg-assist-row">
                <StatusPill label={assist.parity ? t("Translation parity OK") : t("Parity issues")} tone={assist.parity ? "good" : "warn"} />
                {assist.parityIssues?.length ? <span className="cell-note">{assist.parityIssues.join("; ")}</span> : null}
              </div>
              <p className="cell-note"><strong>{t("Routing")}:</strong> {assist.routeRationale} ({assist.proposedAssets?.length ?? 0} {t("assets")})</p>
              <p className="cell-note"><strong>{t("Layout")}:</strong> {assist.layoutNote}</p>
            </div>
          ) : <p className="cell-note">{t("AI proposes targets, checks EN/AR parity, and suggests layout. It never edits the alert content.")}</p>}
        </div>

        <div className="verification-grid ai-intervention-box">
          {steps.map((step, index) => (
            <article key={step.label} className="verification-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{t(step.label)}</strong><small>{t(step.owner)}</small></div>
              <StatusPill label={step.state} tone={step.state === "Checked" ? "good" : "warn"} />
            </article>
          ))}
        </div>

        {selected.state === "Approval required" || approvals.length ? (
          <div className="approvals-panel">
            <div className="approvals-head">
              <div>
                <strong>{t("Named-approver gate")}</strong>
                <span>{selected.scopeMode === "citywide" ? t("Citywide requires dual control (2 approvers + MFA)") : t("Zone requires one named approver + MFA")}</span>
              </div>
              <StatusPill label={`${approvals.length} / ${neededApprovals} ${t("approved")}`} tone={approvals.length >= neededApprovals ? "good" : "warn"} />
            </div>
            {approvals.length ? (
              <div className="approvals-signatures">
                {approvals.map((s) => <span key={s.name} className="approval-sig"><ShieldCheck size={14} /> {t(s.name)} · {t(s.role)} · {t("MFA")}</span>)}
              </div>
            ) : null}
            {selected.state === "Approval required" ? (
              <div className="approvals-action">
                <label>{t("Approving as")}
                  <select value={pickApprover} onChange={(e) => setPickApprover(e.target.value)}>
                    <option value="">{t("Select a named approver")}</option>
                    {approverOptions.map((a) => <option key={a.name} value={a.name}>{a.name} ({t(a.role)})</option>)}
                  </select>
                </label>
                <Button icon={ShieldCheck} disabled={!pickApprover} onClick={() => setMfaApprover(pickApprover)}>{t("Approve with MFA")}</Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {selected.state === "Broadcasting" && selected.deadlineAt ? (
          <div className="emg-live">
            <CountdownBadge deadlineAt={selected.deadlineAt} t={t} />
            <span className="cell-note">{t("Preempting content on")} {selected.targetAssets?.length ?? 0} {t("assets")} · {t("CAP")} {selected.capIdentifier}</span>
            <Button icon={ShieldCheck} onClick={() => onAckAlert(selected.id)}>{t("Acknowledge")}</Button>
          </div>
        ) : null}
        {selected.ackBy?.length ? <p className="cell-note">{t("Acknowledged by")}: {selected.ackBy.map((a) => t(a)).join(", ")}</p> : null}

        <ActionRow>
          {selected.state === "Check required" ? <Button icon={ShieldCheck} onClick={() => onRunChecks(selected.id)}>{t("Run MediaGPT checks")}</Button> : null}
          {canBroadcast ? <Button icon={Megaphone} onClick={() => onBroadcastNow(selected.id)}>{t("Broadcast now (preempt)")}</Button> : null}
          <Button variant="secondary" onClick={() => onResetAlert(selected.id)}>{t("Reset")}</Button>
        </ActionRow>
        </LinkedDetail>
      </Panel>

      <Panel icon={Megaphone} title={t("Ingest CAP alert")}>
        <form className="stack-form" onSubmit={ingestCap}>
          <div className="cap-grid">
            <label>{t("CAP identifier")}<input value={draft.identifier} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} placeholder="NCEMA-2026-..." /></label>
            <label>{t("Sender")}<input value={draft.sender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })} /></label>
            <label>{t("Area")}<input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder={t("Zone or Citywide")} /></label>
            <label>{t("Scope")}<select value={draft.scopeMode} onChange={(e) => setDraft({ ...draft, scopeMode: e.target.value as AlertScopeMode })}><option value="zone">{t("Zone")}</option><option value="citywide">{t("Citywide")}</option></select></label>
            <label>{t("Severity")}<select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{["Extreme","Severe","Moderate","Minor"].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></label>
            <label>{t("Urgency")}<select value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: e.target.value })}>{["Immediate","Expected","Future"].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></label>
          </div>
          <label>{t("Headline")}<input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} placeholder={t("Severe dust storm - reduce speed")} /></label>
          <div className="cap-bilingual">
            <label>{t("Body (English)")}<textarea value={draft.bodyEn} onChange={(e) => setDraft({ ...draft, bodyEn: e.target.value })} /></label>
            <label dir="rtl">{t("Body (Arabic)")}<textarea value={draft.bodyAr} onChange={(e) => setDraft({ ...draft, bodyAr: e.target.value })} /></label>
          </div>
          <ActionRow>
            <Button type="submit" icon={ShieldAlert}>{t("Ingest alert")}</Button>
          </ActionRow>
        </form>
      </Panel>

      {mfaApprover ? (
        <MfaStepUpDialog
          approverName={mfaApprover}
          onCancel={() => setMfaApprover(null)}
          onVerify={(code) => { onApproveAlert(selected.id, mfaApprover, code); setMfaApprover(null); setPickApprover(""); }}
          t={t}
        />
      ) : null}
    </PageBody>
  );
}

function NetworkPage({
  aiAvailable,
  serviceOrders,
  purchaseOrders,
  onCreateServiceOrder,
  onCreatePurchaseOrder,
  t,
}: {
  aiAvailable: boolean;
  serviceOrders: ServiceOrder[];
  purchaseOrders: PurchaseOrder[];
  onCreateServiceOrder: (payload: {
    assetId: string;
    assetName: string;
    componentId: string;
    title: string;
    severity: ServiceOrder["severity"];
    summary: string;
    partsNeeded: string[];
  }) => Promise<ServiceOrder | null>;
  onCreatePurchaseOrder: (payload: {
    assetId: string;
    assetName: string;
    componentId: string;
    item: string;
    quantity: number;
    vendor?: string;
    eta?: string;
    linkedServiceOrder?: string;
  }) => Promise<PurchaseOrder | null>;
  t: (value: string) => string;
}) {
  const [selectedId, setSelectedId] = useState(estateAssets[1].id);
  const [networkTab, setNetworkTab] = useState<NetworkTab>("assetOperations");
  const [twinFullscreen, setTwinFullscreen] = useState(false);
  // Escape closes the fullscreen twin, like every other overlay.
  useEffect(() => {
    if (!twinFullscreen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setTwinFullscreen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [twinFullscreen]);
  const [estateQuery, setEstateQuery] = useState("");
  const [estateFilter, setEstateFilter] = useState<EstateFilter | null>(null);
  const [estateFiltering, setEstateFiltering] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const selected = estateAssets.find((asset) => asset.id === selectedId) || estateAssets[0];
  const visibleAssets = useMemo(() => applyEstateFilter(estateAssets, estateFilter), [estateFilter]);
  const live = estateAssets.filter((asset) => asset.status === "Live").length;
  const connectivity = Math.round((live / estateAssets.length) * 100);
  const openPurchaseOrders = assetSupplyRecords.reduce((sum, record) => sum + record.openPos, 0) + purchaseOrders.filter((order) => order.status !== "Received").length;
  const existingServiceOrder = serviceOrders.find((order) => order.assetId === selected.id && order.status !== "Completed");
  const linkedPurchaseOrders = purchaseOrders.filter((order) => order.assetId === selected.id && order.status !== "Received");
  const orderableItem = ticketDraft?.partsNeeded.find(Boolean) || existingServiceOrder?.partsNeeded.find(Boolean) || defaultProcurementItem(selected);
  const hasOpenPoForItem = linkedPurchaseOrders.some((order) => order.item.toLowerCase() === orderableItem.toLowerCase());
  const networkTabs: Array<{ id: NetworkTab; label: string }> = [
    { id: "assetOperations", label: "Asset operations" },
    { id: "maintenanceWorkbench", label: "Maintenance workbench" },
    { id: "supplyChain", label: "Supply chain" },
  ];

  useEffect(() => {
    setTicketDraft(null);
  }, [selectedId]);

  async function askEstateFilter() {
    if (!estateQuery.trim()) {
      setEstateFilter(null);
      return;
    }
    setEstateFiltering(true);
    const result = await aiParseEstateQuery({ query: estateQuery });
    setEstateFilter(result);
    setEstateFiltering(false);
  }

  async function createTicketDraft() {
    setTicketLoading(true);
    const result = await aiDraftTicket({
      asset: `${selected.id} | ${selected.name}`,
      componentId: selected.controller,
      symptom: `${selected.status} status, temperature ${selected.tempC}`,
      severity: selected.status === "Offline" ? "Critical" : selected.status === "Warning" ? "High" : "Medium",
    });
    setTicketDraft(result);
    setTicketLoading(false);
  }

  async function createOrderFromDraft() {
    if (existingServiceOrder) return;
    const severity: ServiceOrder["severity"] = selected.status === "Offline" ? "Critical" : selected.status === "Warning" ? "High" : "Medium";
    const fallbackTitle = selected.status === "Warning" ? "Thermal inspection and component check" : "Asset health follow-up";
    const created = await onCreateServiceOrder({
      assetId: selected.id,
      assetName: selected.name,
      componentId: selected.controller,
      title: ticketDraft?.title || fallbackTitle,
      severity,
      summary: ticketDraft?.summary || `${selected.name} requires operational follow-up from the digital twin.`,
      partsNeeded: ticketDraft?.partsNeeded || [],
    });
    if (created) {
      setNetworkTab("maintenanceWorkbench");
      setTicketDraft(null);
    }
  }

  async function createPurchaseOrderFromIssue(linkedServiceOrder?: ServiceOrder) {
    const created = await onCreatePurchaseOrder({
      assetId: selected.id,
      assetName: selected.name,
      componentId: linkedServiceOrder?.componentId || selected.controller,
      item: orderableItem,
      quantity: orderableItem.toLowerCase().includes("filter") || orderableItem.toLowerCase().includes("gasket") ? 4 : 1,
      linkedServiceOrder: linkedServiceOrder?.id,
    });
    if (created) {
      setNetworkTab("supplyChain");
      setTicketDraft(null);
    }
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Assets" value={String(estateAssets.length)} helper="Registered devices" tone="info" />
        <Metric label="Connectivity" value={`${connectivity}%`} helper="Live or reachable" tone={connectivity > 80 ? "good" : "warn"} />
        <Metric label="Workbench load" value={String(fieldTasks.length)} helper="Service tasks" tone="warn" />
        <Metric label="Spare parts" value={String(openPurchaseOrders)} helper="Open purchase orders" tone="neutral" />
      </MetricGrid>

      <div className="network-tabs" role="tablist" aria-label={t("Network and Devices")}>
        {networkTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={networkTab === tab.id}
            className={networkTab === tab.id ? "active" : ""}
            onClick={() => setNetworkTab(tab.id)}
          >
            <strong>{t(tab.label)}</strong>
          </button>
        ))}
      </div>

      {networkTab === "assetOperations" ? (
        <section className="asset-operations-group" aria-label={t("Asset operations")}>
          <div className="asset-operations-header">
            <strong>{t("Asset operations")}</strong>
          </div>
          <div className="asset-operations-workspace">
            <section className="asset-operations-pane asset-registry-pane" aria-label={t("Asset registry")}>
              <header className="asset-pane-header">
                <div>
                  <span className="panel-icon"><RadioTower size={18} /></span>
                  <h2>{t("Asset registry")}</h2>
                </div>
              </header>
              <div className="ai-search-row">
                <input value={estateQuery} onChange={(event) => setEstateQuery(event.target.value)} placeholder={t("Ask in words, e.g. show warning highway assets")} />
                <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || estateFiltering} onClick={askEstateFilter}>{estateFiltering ? t("Searching") : t("Ask")}</Button>
                {estateFilter ? <button type="button" onClick={() => { setEstateFilter(null); setEstateQuery(""); }}>{t("Clear")}</button> : null}
              </div>
              <div className="asset-registry">
                {visibleAssets.map((asset) => (
                  <button key={asset.id} className={asset.id === selected.id ? "selected" : ""} type="button" onClick={() => setSelectedId(asset.id)}>
                    <span className={`dot ${assetTone(asset.status)}`} />
                    <span>
                      <strong>{t(asset.name)}</strong>
                      <small>{asset.id} / {t(asset.type)} / {asset.controller}</small>
                    </span>
                    <StatusPill label={asset.status} tone={assetTone(asset.status)} />
                  </button>
                ))}
              </div>
            </section>
            <section className="asset-operations-pane asset-twin-pane" aria-label={t("Asset digital twin (3D)")}>
              <header className="asset-pane-header">
                <div>
                  <span className="panel-icon"><HardDrive size={18} /></span>
                  <h2>{t("Asset digital twin (3D)")}</h2>
                </div>
                <div className="asset-pane-actions">
                  <span>{selected.id}</span>
                  {existingServiceOrder ? (
                    <Button icon={Wrench} variant="secondary" onClick={() => setNetworkTab("maintenanceWorkbench")}>
                      {t("Open work order")} {existingServiceOrder.id}
                    </Button>
                  ) : (
                    <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || ticketLoading} onClick={createTicketDraft}>{ticketLoading ? t("Drafting") : t("Draft ticket")}</Button>
                  )}
                  <Button icon={Maximize2} variant="secondary" onClick={() => setTwinFullscreen(true)}>{t("Full screen")}</Button>
                </div>
              </header>
              <div className="asset-twin-stack">
                <ClientOnlyBillboardTwin />
                {existingServiceOrder ? (
                  <section className="ai-mini-panel existing-work-order-panel">
                    <div>
                      <span>{t("Existing work order")}</span>
                      <strong>{existingServiceOrder.id} | {t(existingServiceOrder.title)}</strong>
                      <small>{t(existingServiceOrder.status)} / {t(existingServiceOrder.owner)} / {t(existingServiceOrder.due)}</small>
                    </div>
                    <div className="chip-row">
                      {existingServiceOrder.partsNeeded.slice(0, 3).map((part) => <span key={part}>{t(part)}</span>)}
                      {linkedPurchaseOrders.slice(0, 2).map((order) => <span key={order.id}>{order.id} / {t(order.status)}</span>)}
                    </div>
                    <div className="mini-panel-actions">
                      <Button icon={Wrench} variant="secondary" onClick={() => setNetworkTab("maintenanceWorkbench")}>{t("View workbench")}</Button>
                      {hasOpenPoForItem ? (
                        <Button icon={ShoppingBag} variant="secondary" onClick={() => setNetworkTab("supplyChain")}>{t("View purchase order")}</Button>
                      ) : (
                        <Button icon={ShoppingBag} onClick={() => createPurchaseOrderFromIssue(existingServiceOrder)}>{t("Create purchase order")}</Button>
                      )}
                    </div>
                  </section>
                ) : ticketDraft ? (
                  <section className="ai-mini-panel">
                    <div>
                      <span>{t("MediaGPT ticket draft")}</span>
                      <strong>{ticketDraft.title}</strong>
                      <small>{ticketDraft.summary}</small>
                    </div>
                    <div className="chip-row">
                      <span>{ticketDraft.slaSuggestion}</span>
                      {ticketDraft.partsNeeded.slice(0, 3).map((part) => <span key={part}>{part}</span>)}
                    </div>
                    <div className="mini-panel-actions">
                      <Button icon={Wrench} onClick={createOrderFromDraft}>{t("Create service order")}</Button>
                      {hasOpenPoForItem ? (
                        <Button icon={ShoppingBag} variant="secondary" onClick={() => setNetworkTab("supplyChain")}>{t("View purchase order")}</Button>
                      ) : (
                        <Button icon={ShoppingBag} variant="secondary" onClick={() => createPurchaseOrderFromIssue()}>{t("Create purchase order")}</Button>
                      )}
                    </div>
                  </section>
                ) : null}
                <div className="detail-cards compact">
                  <Detail label="Selected asset" value={selected.name} />
                  <Detail label="Network" value={selected.network} />
                  <Detail label="Controller" value={selected.controller} />
                  <Detail label="Temperature" value={selected.tempC} />
                </div>
              </div>
            </section>
          </div>
          {twinFullscreen ? (
            <div
              className="twin-fullscreen"
              role="dialog"
              aria-modal="true"
              aria-label={t("Asset digital twin (3D)")}
              onClick={(event) => {
                if (event.currentTarget === event.target) setTwinFullscreen(false);
              }}
            >
              <section className="twin-fullscreen-panel">
                <header className="twin-fullscreen-header">
                  <div>
                    <span>{t("Asset digital twin (3D)")}</span>
                    <h2>{t(selected.name)}</h2>
                    <p>{selected.id} / {t(selected.type)} / {selected.controller}</p>
                  </div>
                  <button type="button" className="icon-button" onClick={() => setTwinFullscreen(false)} aria-label={t("Close full screen")}>
                    <X size={18} />
                  </button>
                </header>
                <ClientOnlyBillboardTwin variant="fullscreen" />
              </section>
            </div>
          ) : null}
        </section>
      ) : null}

      {networkTab === "maintenanceWorkbench" ? (
        <Panel icon={Wrench} title="Maintenance workbench" action={`${fieldTasks.length} ${t("service tasks")}`}>
          <KanbanBoard serviceOrders={serviceOrders} />
        </Panel>
      ) : null}

      {networkTab === "supplyChain" ? (
        <Panel icon={ClipboardCheck} title="Supply chain" action={`${assetSupplyRecords.filter((record) => record.tone !== "good").length} ${t("assets need action")}`}>
          <InventoryOperationsTable serviceOrders={serviceOrders} purchaseOrders={purchaseOrders} />
        </Panel>
      ) : null}
    </PageBody>
  );
}

function DeviceDossier({ asset }: { asset: Asset }) {
  const t = useT();
  const [part, setPart] = useState("LED cabinet");
  const parts = [
    { label: "LED cabinet", state: asset.status === "Live" ? "Healthy" : "Degraded" },
    { label: "Edge controller", state: asset.status === "Offline" ? "Faulty" : "Healthy" },
    { label: "Power supply", state: asset.status === "Warning" ? "Degraded" : "Healthy" },
    { label: "5G router", state: "Healthy" },
  ];
  const activePart = parts.find((item) => item.label === part) ?? parts[0];

  return (
    <div className="device-dossier">
      <div className="device-model" aria-label={t("Device model")}>
        {parts.map((item, index) => (
          <button
            key={item.label}
            className={`device-part ${item.state.toLowerCase()} p${index + 1}`}
            type="button"
            onMouseEnter={() => setPart(item.label)}
            onFocus={() => setPart(item.label)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <div className="detail-cards">
        <Detail label="Selected part" value={`${t(activePart.label)} / ${t(activePart.state)}`} />
        <Detail label="Network" value={asset.network} />
        <Detail label="Resolution" value={asset.resolution} />
        <Detail label="Temperature" value={asset.tempC} />
        <Detail label="Cache" value={asset.cacheDays} />
        <Detail label="Address" value={asset.address} />
      </div>
    </div>
  );
}
type SupplyComponent = {
  component: string;
  quantity: string;
  state: string;
  stateTone: Tone;
  po: string;
  poEta: string;
  so: string;
  soStep: string;
  owner: string;
  recommendation: string;
};

type AssetSupplyRecord = {
  assetId: string;
  assetName: string;
  assetType: string;
  health: string;
  tone: Tone;
  openSos: number;
  openPos: number;
  nextPoEta: string;
  recommendation: string;
  components: SupplyComponent[];
};

const assetSupplyRecords: AssetSupplyRecord[] = [
  {
    assetId: "AD-HWY-001",
    assetName: "Corniche Highway Main",
    assetType: "Highway billboard",
    health: "Operational",
    tone: "good",
    openSos: 1,
    openPos: 1,
    nextPoEta: "12 Jul 2026",
    recommendation: "Keep current preventive plan. Bundle LED cabinet checks with next quarterly visit.",
    components: [
      { component: "Asset unit", quantity: "1", state: "Operational", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8840", soStep: "Preventive maintenance scheduled", owner: "Maintenance team", recommendation: "No action: keep in standard preventive cycle." },
      { component: "LED cabinet", quantity: "2", state: "Available in depot", stateTone: "good", po: "PO-4471", poEta: "12 Jul 2026", so: "SO-8840", soStep: "Panel health inspection", owner: "Field dispatch", recommendation: "Replace during next low-traffic window." },
      { component: "Thermal sensor kit", quantity: "1", state: "Reserved for field team", stateTone: "warn", po: "PO-4452", poEta: "08 Jul 2026", so: "SO-8840", soStep: "Close-out evidence", owner: "Verification team", recommendation: "Attach thermal images before closing SO." },
      { component: "Cooling fan kit", quantity: "2", state: "Field stock available", stateTone: "good", po: "No PO required", poEta: "Depot stock", so: "SO-8846", soStep: "Dispatch pending access permit", owner: "Field dispatch", recommendation: "Combine with cabinet closure visit to avoid a second truck roll." },
      { component: "Rear door latch set", quantity: "4", state: "Reserved for field team", stateTone: "warn", po: "PO-4522", poEta: "05 Jul 2026", so: "SO-8847", soStep: "Unlatched cabinet closure", owner: "Maintenance planner", recommendation: "Replace all latches on the affected column, not only the failed door." },
    ],
  },
  {
    assetId: "AD-BRG-014",
    assetName: "Mussafah Bridge Banner",
    assetType: "Premium roadside LED",
    health: "Attention",
    tone: "warn",
    openSos: 2,
    openPos: 2,
    nextPoEta: "06 Jul 2026",
    recommendation: "Prioritize controller swap before weekend campaigns; PO date is the delivery risk.",
    components: [
      { component: "Asset unit", quantity: "1", state: "Attention", stateTone: "warn", po: "No PO required", poEta: "N/A", so: "SO-8821", soStep: "Thermal inspection in progress", owner: "NOC operator", recommendation: "Run remote diagnostics before technician dispatch." },
      { component: "Edge controller", quantity: "1", state: "Ordered from supplier", stateTone: "warn", po: "PO-4490", poEta: "06 Jul 2026", so: "SO-8821", soStep: "Controller replacement queued", owner: "Field dispatch", recommendation: "Hold publish-heavy schedule until controller replacement is complete." },
      { component: "Cooling fan kit", quantity: "2", state: "Reserved for field team", stateTone: "good", po: "PO-4484", poEta: "04 Jul 2026", so: "SO-8828", soStep: "Technician dispatch", owner: "Maintenance team", recommendation: "Use reserved stock; avoid opening a new PO." },
      { component: "Ambient light sensor", quantity: "1", state: "Available in depot", stateTone: "good", po: "No PO required", poEta: "Depot stock", so: "SO-8821", soStep: "Brightness validation", owner: "Verification team", recommendation: "Swap sensor during controller visit if calibration drift remains above 8%." },
      { component: "Cabinet ventilation filter", quantity: "6", state: "Below reorder point", stateTone: "warn", po: "PO-4520", poEta: "09 Jul 2026", so: "SO-8828", soStep: "Thermal remediation", owner: "O&M admin", recommendation: "Approve replenishment because two bridge assets share the same filter batch." },
    ],
  },
  {
    assetId: "AD-DWT-011",
    assetName: "Downtown Retail Loop",
    assetType: "Urban LED totem",
    health: "Operational",
    tone: "good",
    openSos: 1,
    openPos: 0,
    nextPoEta: "N/A",
    recommendation: "Dispatch technician after router arrives; keep asset in maintenance rotation until SO close-out.",
    components: [
      { component: "5G router", quantity: "1", state: "Warranty exchange", stateTone: "warn", po: "No PO required", poEta: "N/A", so: "SO-8816", soStep: "Awaiting vendor confirmation", owner: "O&M admin", recommendation: "Keep vendor replacement under warranty claim." },
      { component: "Router antenna", quantity: "2", state: "Available in depot", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8816", soStep: "Part received", owner: "Field dispatch", recommendation: "Dispatch technician after router arrives." },
      { component: "Media player", quantity: "1", state: "Operational", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8794", soStep: "Completed", owner: "Verification team", recommendation: "No action: keep in standard preventive cycle." },
      { component: "PoP camera", quantity: "1", state: "Calibration required", stateTone: "warn", po: "No PO required", poEta: "N/A", so: "SO-8851", soStep: "Camera calibration", owner: "Verification team", recommendation: "Do not close the monthly proof audit until camera alignment is confirmed." },
      { component: "Indoor humidity sensor", quantity: "1", state: "Operational", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8794", soStep: "Completed", owner: "Maintenance team", recommendation: "Keep as baseline telemetry for retail-loop anomaly detection." },
    ],
  },
  {
    assetId: "AD-AIN-052",
    assetName: "Al Ain Civic",
    assetType: "Highway gateway billboard",
    health: "Procurement risk",
    tone: "danger",
    openSos: 1,
    openPos: 1,
    nextPoEta: "15 Jul 2026",
    recommendation: "Group power supply replacement with adjacent Al Ain asset to reduce truck roll.",
    components: [
      { component: "Power supply", quantity: "1", state: "Ordered from supplier", stateTone: "danger", po: "PO-4512", poEta: "15 Jul 2026", so: "SO-8837", soStep: "Awaiting vendor confirmation", owner: "O&M admin", recommendation: "Escalate PO confirmation if supplier does not acknowledge by 17:00." },
      { component: "Main breaker", quantity: "1", state: "Reserved for field team", stateTone: "warn", po: "PO-4509", poEta: "09 Jul 2026", so: "SO-8837", soStep: "Technician dispatch", owner: "Field dispatch", recommendation: "Group power supply replacement with adjacent Al Ain asset to reduce truck roll." },
      { component: "LED module batch", quantity: "4", state: "Available in depot", stateTone: "good", po: "PO-4471", poEta: "12 Jul 2026", so: "SO-8837", soStep: "Panel health inspection", owner: "Maintenance team", recommendation: "Use reserved stock; avoid opening a new PO." },
      { component: "Surge protector", quantity: "1", state: "Supplier delay", stateTone: "danger", po: "PO-4518", poEta: "18 Jul 2026", so: "SO-8837", soStep: "Procurement escalation", owner: "O&M admin", recommendation: "Escalate to alternate supplier because gateway assets share lightning-risk exposure." },
      { component: "Fiber media converter", quantity: "1", state: "Reserved for field team", stateTone: "good", po: "PO-4499", poEta: "Depot stock", so: "SO-8849", soStep: "Connectivity restoration", owner: "Network operations", recommendation: "Install only if packet loss remains after breaker replacement." },
    ],
  },
  {
    assetId: "AD-BUS-022",
    assetName: "Yas Island Bus Stop Pair",
    assetType: "Dual-sided bus stop",
    health: "Operational",
    tone: "good",
    openSos: 2,
    openPos: 1,
    nextPoEta: "08 Jul 2026",
    recommendation: "Run UPS test before the next tourism takeover; no publishing freeze required.",
    components: [
      { component: "Asset unit", quantity: "2", state: "Operational", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8834", soStep: "Routine paired-stop audit", owner: "Maintenance team", recommendation: "Keep both sides in the same service order for proof consistency." },
      { component: "UPS battery pack", quantity: "2", state: "Ordered from supplier", stateTone: "warn", po: "PO-4519", poEta: "08 Jul 2026", so: "SO-8834", soStep: "Backup power test", owner: "O&M admin", recommendation: "Replace both battery packs together to avoid asymmetric runtime." },
      { component: "Passenger-facing glass", quantity: "1", state: "Available in depot", stateTone: "good", po: "No PO required", poEta: "Depot stock", so: "SO-8843", soStep: "Cosmetic inspection", owner: "Field dispatch", recommendation: "Defer until night service window; no ad playback impact." },
      { component: "Edge nano controller", quantity: "1", state: "Operational", stateTone: "good", po: "No PO required", poEta: "N/A", so: "SO-8834", soStep: "Runtime test", owner: "NOC operator", recommendation: "Keep controller firmware pinned until paired stop test completes." },
    ],
  },
  {
    assetId: "AD-HWY-009",
    assetName: "Al Ain Gateway",
    assetType: "Highway billboard",
    health: "Offline",
    tone: "danger",
    openSos: 3,
    openPos: 2,
    nextPoEta: "07 Jul 2026",
    recommendation: "Treat as a service restoration chain: controller restart, moisture check, then replacement if telemetry remains stale.",
    components: [
      { component: "Edge controller", quantity: "1", state: "Restart failed", stateTone: "danger", po: "PO-4524", poEta: "07 Jul 2026", so: "SO-8854", soStep: "Signal loss root-cause review", owner: "Network operations", recommendation: "Keep offline until controller heartbeat returns for 30 consecutive minutes." },
      { component: "Rear door gasket", quantity: "4", state: "Water ingress risk", stateTone: "danger", po: "PO-4526", poEta: "10 Jul 2026", so: "SO-8855", soStep: "Moisture sensor verification", owner: "Field dispatch", recommendation: "Replace gasket before powering the receiving-card bay." },
      { component: "Receiving card", quantity: "2", state: "Reserved for field team", stateTone: "warn", po: "PO-4496", poEta: "Depot stock", so: "SO-8854", soStep: "Fallback replacement ready", owner: "Maintenance planner", recommendation: "Hold receiving cards in reserve; do not consume unless diagnostics confirm damage." },
      { component: "Fiber patch lead", quantity: "2", state: "Available in depot", stateTone: "good", po: "No PO required", poEta: "Depot stock", so: "SO-8854", soStep: "Connectivity restoration", owner: "Network operations", recommendation: "Replace patch lead during site visit to eliminate a low-cost failure point." },
    ],
  },
];

function InventoryOperationsTable({ serviceOrders, purchaseOrders }: { serviceOrders: ServiceOrder[]; purchaseOrders: PurchaseOrder[] }) {
  const t = useT();
  const [expandedIds, setExpandedIds] = useState<string[]>([assetSupplyRecords[0].assetId]);
  const [supplyNotice, setSupplyNotice] = useState("");

  function toggle(assetId: string) {
    setExpandedIds((items) => (items.includes(assetId) ? items.filter((id) => id !== assetId) : [...items, assetId]));
  }

  function hasActionableRecommendation(text: string) {
    const normalized = text.toLowerCase();
    return Boolean(text.trim()) && !normalized.startsWith("no action:");
  }

  return (
    <div className="inventory-operations">
      <div className="table-card asset-supply-table">
        <table>
          <thead>
            <tr>
              <th>{t("Asset")}</th>
              <th>{t("Status")}</th>
              <th>{t("BOM items")}</th>
              <th>{t("Open SOs")}</th>
              <th>{t("Open POs")}</th>
              <th>{t("Next PO ETA")}</th>
              <th>{t("AI recommendation")}</th>
            </tr>
          </thead>
          <tbody>
            {assetSupplyRecords.map((record) => {
              const expanded = expandedIds.includes(record.assetId);
              const actionableComponents = record.components.filter((component) => hasActionableRecommendation(component.recommendation));
              const linkedOrders = serviceOrders.filter((order) => order.assetId === record.assetId);
              const linkedPurchaseOrders = purchaseOrders.filter((order) => order.assetId === record.assetId);
              return (
                <Fragment key={record.assetId}>
                  <tr className={`supply-asset-row ${expanded ? "expanded" : ""}`}>
                    <td data-label={t("Asset")}>
                      <button type="button" className="supply-toggle" aria-expanded={expanded} onClick={() => toggle(record.assetId)}>
                        <ChevronRight size={16} />
                        <span>
                          <strong>{t(record.assetName)}</strong>
                          <small>{record.assetId} / {t(record.assetType)}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label={t("Status")}><StatusPill label={record.health} tone={record.tone} /></td>
                    <td data-label={t("BOM items")}>{record.components.length}</td>
                    <td data-label={t("Open SOs")}>{record.openSos + linkedOrders.filter((order) => order.status !== "Completed").length}</td>
                    <td data-label={t("Open POs")}>{record.openPos + linkedPurchaseOrders.filter((order) => order.status !== "Received").length}</td>
                    <td data-label={t("Next PO ETA")}>{record.nextPoEta}</td>
                    <td data-label={t("AI recommendation")}><span className="ai-recommendation supply-ai-recommendation">{t(record.recommendation)}</span></td>
                  </tr>
                  {expanded ? (
                    <tr className="supply-detail-row">
                      <td colSpan={7}>
                        <div className="supply-detail">
                          <table className="bom-detail-table">
                            <thead>
                              <tr>
                                <th>{t("Component")}</th>
                                <th>{t("Qty")}</th>
                                <th>{t("State")}</th>
                                <th>{t("PO / ETA")}</th>
                                <th>{t("SO / step")}</th>
                                <th>{t("Owner")}</th>
                                <th>{t("AI recommendation")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.components.map((component) => (
                                <tr key={`${record.assetId}-${component.component}`}>
                                  <td data-label={t("Component")}><strong>{t(component.component)}</strong></td>
                                  <td data-label={t("Qty")}>{component.quantity}</td>
                                  <td data-label={t("State")}><StatusPill label={component.state} tone={component.stateTone} /></td>
                                  <td data-label={t("PO / ETA")}>
                                    <strong>{t(component.po)}</strong>
                                    <span>{t(component.poEta)}</span>
                                  </td>
                                  <td data-label={t("SO / step")}>
                                    <strong>{component.so}</strong>
                                    <span>{t(component.soStep)}</span>
                                  </td>
                                  <td data-label={t("Owner")}>{t(component.owner)}</td>
                                  <td data-label={t("AI recommendation")}>
                                    {hasActionableRecommendation(component.recommendation) ? (
                                      <span className="ai-recommendation supply-ai-recommendation">{t(component.recommendation)}</span>
                                    ) : (
                                      <span className="muted">{t("Standard cycle")}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {linkedOrders.map((order) => (
                                <tr key={`${record.assetId}-${order.id}`} className="service-order-linked-row">
                                  <td data-label={t("Component")}><strong>{order.componentId}</strong></td>
                                  <td data-label={t("Qty")}>1</td>
                                  <td data-label={t("State")}><StatusPill label={order.status} tone={order.severity === "Critical" ? "danger" : order.severity === "High" ? "warn" : "info"} /></td>
                                  <td data-label={t("PO / ETA")}>
                                    <strong>{t(order.linkedPo)}</strong>
                                    <span>{t(order.due)}</span>
                                  </td>
                                  <td data-label={t("SO / step")}>
                                    <strong>{order.id}</strong>
                                    <span>{t(order.title)}</span>
                                  </td>
                                  <td data-label={t("Owner")}>{t(order.owner)}</td>
                                  <td data-label={t("AI recommendation")}><span className="ai-recommendation supply-ai-recommendation">{t(order.summary)}</span></td>
                                </tr>
                              ))}
                              {linkedPurchaseOrders.map((order) => (
                                <tr key={`${record.assetId}-${order.id}`} className="purchase-order-linked-row">
                                  <td data-label={t("Component")}><strong>{t(order.item)}</strong></td>
                                  <td data-label={t("Qty")}>{order.quantity}</td>
                                  <td data-label={t("State")}><StatusPill label={order.status} tone={order.status === "Confirmed" || order.status === "Received" ? "good" : "warn"} /></td>
                                  <td data-label={t("PO / ETA")}>
                                    <strong>{order.id}</strong>
                                    <span>{t(order.eta)}</span>
                                  </td>
                                  <td data-label={t("SO / step")}>
                                    <strong>{order.linkedServiceOrder || t("Direct procurement")}</strong>
                                    <span>{t("Supplier follow-up")}</span>
                                  </td>
                                  <td data-label={t("Owner")}>{t(order.vendor)}</td>
                                  <td data-label={t("AI recommendation")}><span className="ai-recommendation supply-ai-recommendation">{t("Track supplier ETA and update maintenance plan if delivery moves.")}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="supply-actions-strip">
                            <span>{actionableComponents.length} {t("AI actions")}</span>
                            <div>
                              <Button variant="secondary" icon={Wrench} onClick={() => setSupplyNotice(`${record.assetId}: ${t("service order drafted")}`)}>{t("Create SO")}</Button>
                              <Button variant="secondary" icon={Send} onClick={() => setSupplyNotice(`${record.assetId}: ${t("supplier notification queued")}`)}>{t("Notify supplier")}</Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {supplyNotice ? <p className="media-notice">{supplyNotice}</p> : null}
      <CollapsibleIntelligenceCitations
        ruleIds={["RULE-NET-001", "RULE-NET-002", "RULE-NET-003", "RULE-NET-004"]}
        sourceIds={["KB-NET-001", "KB-NET-002", "KB-NET-003", "KB-NET-004"]}
        action="Create service order"
      />
    </div>
  );
}

function KanbanBoard({ serviceOrders }: { serviceOrders: ServiceOrder[] }) {
  const t = useT();
  const columns: Array<{ label: string; states: Array<(typeof fieldTasks)[number]["column"]> }> = [
    { label: "Pending Assignment", states: ["Pending Assignment"] },
    { label: "Pending Execution", states: ["Pending Execution", "Overdue"] },
    { label: "In Progress", states: ["In Progress"] },
    { label: "Completed", states: ["Completed"] },
  ];
  return (
    <div className="kanban">
      {columns.map((column) => (
        <section key={column.label}>
          <strong>{t(column.label)}</strong>
          {serviceOrders.filter((order) => column.states.includes(order.status)).map((order) => (
            <article key={order.id} className="service-order-card">
              <span className={order.severity === "Critical" ? "danger" : ""}>{t(order.severity)}</span>
              <p>{order.id} | {t(order.title)}</p>
              <small>{order.assetId} / {t(order.owner)} / {t(order.due)}</small>
            </article>
          ))}
          {fieldTasks.filter((task) => column.states.includes(task.column)).map((task) => (
            <article key={task.id}>
              <span className={task.column === "Overdue" ? "danger" : ""}>{t(task.column === "Overdue" ? "Overdue" : task.priority)}</span>
              <p>{t(task.title)}</p>
              <small>{task.asset} / {t(task.owner)} / {t(task.due)}</small>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

type Boundary = "Read-only" | "Recommend" | "Execute with approval" | "Never modify";

type AgentId = string;

type AgentResult = {
  summary: string;
  columns?: string[];
  rows?: string[][];
  notes?: string[];
  primaryAction?: string;
  primaryTone?: Tone;
};

type AgentInputs = Record<string, string>;

type AgentSpec = {
  id: AgentId;
  name: string;
  family: string;
  icon: LucideIcon;
  tagline: string;
  boundary: Boundary;
  fields: Array<
    | { key: string; kind: "text"; label: string; placeholder: string; defaultValue: string }
    | { key: string; kind: "textarea"; label: string; placeholder: string; defaultValue: string }
    | { key: string; kind: "select"; label: string; options: string[]; defaultValue: string }
  >;
  run: (input: AgentInputs) => AgentResult;
};

const zoneOptions = ["Abu Dhabi City", "Yas Island", "Airport route", "Downtown", "Al Ain", "Industrial Zone"];
const daypartOptions = ["Morning peak", "Midday", "Evening peak", "Overnight"];
const languageOptions = ["Arabic first", "English first", "Bilingual"];
const toneOptions = ["Civic", "Commercial", "Cultural", "Emergency"];
const windowOptions = ["Last 1 hour", "Last 24 hours", "Last 7 days"];

function fmtAed(n: number): string {
  return `AED ${n.toLocaleString("en-US")}`;
}

const mediaGptAgents: AgentSpec[] = [
  {
    id: "insights",
    family: "Discover",
    name: "MediaGPT Insights",
    icon: Search,
    tagline: "Natural-language search across campaigns, assets, and archives.",
    boundary: "Read-only",
    fields: [
      { key: "q", kind: "text", label: "Query", placeholder: "e.g. Coca-Cola placements on Yas Island last year", defaultValue: "Coca-Cola placements on Yas Island last year" },
      { key: "scope", kind: "select", label: "Scope", options: ["Campaigns", "Assets", "Archive"], defaultValue: "Campaigns" },
    ],
    run: (input) => {
      const q = input.q.trim() || "recent placements";
      return {
        summary: `${input.scope} matching "${q}" - 3 results found.`,
        columns: ["Campaign", "Advertiser", "Zone", "Ran", "Value"],
        rows: [
          ["Yas summer promo", "Coca-Cola", "Yas Island", "Aug 2024", "AED 268,500"],
          ["Retail activation", "Coca-Cola", "Downtown", "Nov 2024", "AED 142,000"],
          ["Airport refresh", "Coca-Cola", "Airport route", "Mar 2025", "AED 318,900"],
        ],
        primaryAction: "Export results",
        primaryTone: "info",
      };
    },
  },
  {
    id: "archive-nlq",
    family: "Discover",
    name: "MediaGPT Archive",
    icon: Search,
    tagline: "Natural-language search across campaigns, assets, and archives.",
    boundary: "Read-only",
    fields: [
      { key: "q", kind: "text", label: "Query", placeholder: "e.g. Coca-Cola placements on Yas Island last year", defaultValue: "Coca-Cola placements on Yas Island last year" },
      { key: "scope", kind: "select", label: "Scope", options: ["Campaigns", "Assets", "Archive"], defaultValue: "Campaigns" },
    ],
    run: (input) => {
      const q = input.q.trim() || "recent placements";
      return {
        summary: `${input.scope} matching "${q}" - 3 results found.`,
        columns: ["Campaign", "Advertiser", "Zone", "Ran", "Value"],
        rows: [
          ["Yas summer promo", "Coca-Cola", "Yas Island", "Aug 2024", "AED 268,500"],
          ["Retail activation", "Coca-Cola", "Downtown", "Nov 2024", "AED 142,000"],
          ["Airport refresh", "Coca-Cola", "Airport route", "Mar 2025", "AED 318,900"],
        ],
        primaryAction: "Export results",
        primaryTone: "info",
      };
    },
  },
  {
    id: "workflow-composer",
    family: "Command",
    name: "MediaGPT Workflow Composer",
    icon: Terminal,
    tagline: "Compose workflows across scheduling, targeting, and distribution.",
    boundary: "Execute with approval",
    fields: [
      { key: "zone", kind: "select", label: "Zone", options: zoneOptions, defaultValue: "Airport route" },
      { key: "daypart", kind: "select", label: "Daypart", options: daypartOptions, defaultValue: "Morning peak" },
      { key: "creative", kind: "text", label: "Approved creative ID", placeholder: "CR-90421", defaultValue: "CR-90421" },
    ],
    run: (input) => {
      const matches = estateAssets.filter((a) => a.zone === input.zone).slice(0, 6);
      const count = matches.length || 4;
      return {
        summary: `Workflow prepared: ${count} assets in ${input.zone}, ${input.daypart}, creative ${input.creative || "CR-90421"}.`,
        columns: ["Asset", "Type", "Status"],
        rows: matches.length
          ? matches.map((a) => [a.id, a.type ?? "Panel", a.status])
          : [
              ["AD-APT-003", "Roadside", "Live"],
              ["AD-APT-007", "Roadside", "Live"],
              ["AD-APT-011", "Roadside", "Standby"],
              ["AD-APT-014", "Roadside", "Live"],
            ],
        notes: ["Governance check pending", "Requires named approver before push"],
        primaryAction: "Queue for approval",
        primaryTone: "warn",
      };
    },
  },
  {
    id: "targeting-assistant",
    family: "Command",
    name: "MediaGPT Targeting Assistant",
    icon: Terminal,
    tagline: "Compose workflows across scheduling, targeting, and distribution.",
    boundary: "Execute with approval",
    fields: [
      { key: "zone", kind: "select", label: "Zone", options: zoneOptions, defaultValue: "Airport route" },
      { key: "daypart", kind: "select", label: "Daypart", options: daypartOptions, defaultValue: "Morning peak" },
      { key: "creative", kind: "text", label: "Approved creative ID", placeholder: "CR-90421", defaultValue: "CR-90421" },
    ],
    run: (input) => {
      const matches = estateAssets.filter((a) => a.zone === input.zone).slice(0, 6);
      const count = matches.length || 4;
      return {
        summary: `Workflow prepared: ${count} assets in ${input.zone}, ${input.daypart}, creative ${input.creative || "CR-90421"}.`,
        columns: ["Asset", "Type", "Status"],
        rows: matches.length
          ? matches.map((a) => [a.id, a.type ?? "Panel", a.status])
          : [
              ["AD-APT-003", "Roadside", "Live"],
              ["AD-APT-007", "Roadside", "Live"],
              ["AD-APT-011", "Roadside", "Standby"],
              ["AD-APT-014", "Roadside", "Live"],
            ],
        notes: ["Governance check pending", "Requires named approver before push"],
        primaryAction: "Queue for approval",
        primaryTone: "warn",
      };
    },
  },
  {
    id: "studio",
    family: "Create",
    name: "MediaGPT Studio",
    icon: PenTool,
    tagline: "Generative studio for civic messaging in Arabic and English.",
    boundary: "Recommend",
    fields: [
      { key: "brief", kind: "textarea", label: "Brief", placeholder: "e.g. Make-it-in-the-Emirates, desert sunrise, civic tone", defaultValue: "Make-it-in-the-Emirates, desert sunrise, civic tone" },
      { key: "language", kind: "select", label: "Language", options: languageOptions, defaultValue: "Arabic first" },
      { key: "tone", kind: "select", label: "Tone", options: toneOptions, defaultValue: "Civic" },
    ],
    run: (input) => {
      const brief = input.brief.trim() || "civic campaign";
      return {
        summary: `3 concepts generated for "${brief.slice(0, 60)}" - ${input.language}, ${input.tone} tone.`,
        columns: ["Concept", "Headline", "Formats"],
        rows: [
          ["Concept A", "Made here. Made for tomorrow.", "6:1, 9:16, 1:1"],
          ["Concept B", "The future is manufactured here.", "6:1, 9:16, 3:4"],
          ["Concept C", "From our sands, to the world.", "6:1, 1:1, 3:4"],
        ],
        notes: ["Arabic parity verified", "Awaiting reviewer sign-off before publish"],
        primaryAction: "Send to CMS Library",
        primaryTone: "info",
      };
    },
  },
  {
    id: "dco-adapter",
    family: "Create",
    name: "MediaGPT DCO Adapter",
    icon: PenTool,
    tagline: "Generative studio for civic messaging in Arabic and English.",
    boundary: "Recommend",
    fields: [
      { key: "brief", kind: "textarea", label: "Brief", placeholder: "e.g. Make-it-in-the-Emirates, desert sunrise, civic tone", defaultValue: "Make-it-in-the-Emirates, desert sunrise, civic tone" },
      { key: "language", kind: "select", label: "Language", options: languageOptions, defaultValue: "Arabic first" },
      { key: "tone", kind: "select", label: "Tone", options: toneOptions, defaultValue: "Civic" },
    ],
    run: (input) => {
      const brief = input.brief.trim() || "civic campaign";
      return {
        summary: `3 concepts generated for "${brief.slice(0, 60)}" - ${input.language}, ${input.tone} tone.`,
        columns: ["Concept", "Headline", "Formats"],
        rows: [
          ["Concept A", "Made here. Made for tomorrow.", "6:1, 9:16, 1:1"],
          ["Concept B", "The future is manufactured here.", "6:1, 9:16, 3:4"],
          ["Concept C", "From our sands, to the world.", "6:1, 1:1, 3:4"],
        ],
        notes: ["Arabic parity verified", "Awaiting reviewer sign-off before publish"],
        primaryAction: "Send to CMS Library",
        primaryTone: "info",
      };
    },
  },
  {
    id: "moderator",
    family: "Protect",
    name: "MediaGPT Moderator",
    icon: ShieldCheck,
    tagline: "Content moderation, deepfake detection, and rights checks.",
    boundary: "Never modify",
    fields: [
      { key: "submission", kind: "select", label: "Submission", options: seedSubmissions.map((s) => `${s.id} - ${s.campaign}`), defaultValue: `${seedSubmissions[0].id} - ${seedSubmissions[0].campaign}` },
      { key: "check", kind: "select", label: "Check depth", options: ["Standard", "Deep", "Cultural review"], defaultValue: "Deep" },
    ],
    run: (input) => {
      const id = input.submission.split(" ")[0];
      return {
        summary: `${input.check} check complete for ${id}. Cleared with 1 flag.`,
        columns: ["Check", "Result", "Confidence"],
        rows: [
          ["Integrity scan", "Pass", "97%"],
          ["Deepfake detection", "No manipulation", "99%"],
          ["Rights and licensing", "Match found - review", "84%"],
          ["Cultural soundness", "Pass", "96%"],
        ],
        notes: ["Rights match requires named approver review"],
        primaryAction: "Escalate to reviewer",
        primaryTone: "warn",
      };
    },
  },
  {
    id: "compliance",
    family: "Protect",
    name: "MediaGPT Compliance Agent",
    icon: ShieldCheck,
    tagline: "Content moderation, deepfake detection, and rights checks.",
    boundary: "Never modify",
    fields: [
      { key: "submission", kind: "select", label: "Submission", options: seedSubmissions.map((s) => `${s.id} - ${s.campaign}`), defaultValue: `${seedSubmissions[0].id} - ${seedSubmissions[0].campaign}` },
      { key: "check", kind: "select", label: "Check depth", options: ["Standard", "Deep", "Cultural review"], defaultValue: "Deep" },
    ],
    run: (input) => {
      const id = input.submission.split(" ")[0];
      return {
        summary: `${input.check} check complete for ${id}. Cleared with 1 flag.`,
        columns: ["Check", "Result", "Confidence"],
        rows: [
          ["Integrity scan", "Pass", "97%"],
          ["Deepfake detection", "No manipulation", "99%"],
          ["Rights and licensing", "Match found - review", "84%"],
          ["Cultural soundness", "Pass", "96%"],
        ],
        notes: ["Rights match requires named approver review"],
        primaryAction: "Escalate to reviewer",
        primaryTone: "warn",
      };
    },
  },
  {
    id: "optimizer",
    family: "Optimize",
    name: "MediaGPT Optimizer",
    icon: Lightbulb,
    tagline: "Yield, slot allocation, and dynamic pricing recommendations.",
    boundary: "Recommend",
    fields: [
      { key: "zone", kind: "select", label: "Asset group", options: zoneOptions, defaultValue: "Airport route" },
      { key: "target", kind: "select", label: "Target uplift", options: ["+5%", "+10%", "+15%", "+20%"], defaultValue: "+10%" },
    ],
    run: (input) => {
      const uplift = parseInt(input.target.replace(/[^0-9]/g, ""), 10) || 10;
      const base = 32000 + uplift * 900;
      return {
        summary: `${input.zone}: ${input.target} uplift plan - projected ${fmtAed(base)} / week, no civic conflict.`,
        columns: ["Action", "Asset", "Impact"],
        rows: [
          ["Reallocate 6 evening slots", "AD-APT-003", `+${fmtAed(Math.round(base * 0.4))}`],
          ["Reallocate 4 evening slots", "AD-APT-007", `+${fmtAed(Math.round(base * 0.35))}`],
          ["Raise floor CPM", "Airport-loop pool", `+${fmtAed(Math.round(base * 0.25))}`],
        ],
        notes: ["No civic slot cannibalisation detected"],
        primaryAction: "Send to Financials",
        primaryTone: "good",
      };
    },
  },
  {
    id: "yield-advisor",
    family: "Optimize",
    name: "MediaGPT Yield Advisor",
    icon: Lightbulb,
    tagline: "Yield, slot allocation, and dynamic pricing recommendations.",
    boundary: "Recommend",
    fields: [
      { key: "zone", kind: "select", label: "Asset group", options: zoneOptions, defaultValue: "Airport route" },
      { key: "target", kind: "select", label: "Target uplift", options: ["+5%", "+10%", "+15%", "+20%"], defaultValue: "+10%" },
    ],
    run: (input) => {
      const uplift = parseInt(input.target.replace(/[^0-9]/g, ""), 10) || 10;
      const base = 32000 + uplift * 900;
      return {
        summary: `${input.zone}: ${input.target} uplift plan - projected ${fmtAed(base)} / week, no civic conflict.`,
        columns: ["Action", "Asset", "Impact"],
        rows: [
          ["Reallocate 6 evening slots", "AD-APT-003", `+${fmtAed(Math.round(base * 0.4))}`],
          ["Reallocate 4 evening slots", "AD-APT-007", `+${fmtAed(Math.round(base * 0.35))}`],
          ["Raise floor CPM", "Airport-loop pool", `+${fmtAed(Math.round(base * 0.25))}`],
        ],
        notes: ["No civic slot cannibalisation detected"],
        primaryAction: "Send to Financials",
        primaryTone: "good",
      };
    },
  },
  {
    id: "sentinel",
    family: "Safeguard",
    name: "MediaGPT Sentinel",
    icon: Eye,
    tagline: "Edge, CMS and network anomaly detection with audit trails.",
    boundary: "Read-only",
    fields: [
      { key: "window", kind: "select", label: "Window", options: windowOptions, defaultValue: "Last 24 hours" },
      { key: "surface", kind: "select", label: "Surface", options: ["All", "Edge", "CMS", "Network"], defaultValue: "All" },
    ],
    run: (input) => ({
      summary: `${input.surface} surface, ${input.window}: 2 anomalies, 1 resolved.`,
      columns: ["Time", "Signal", "Severity", "Status"],
      rows: [
        ["23:04", "Latency spike AD-BRG-014", "Medium", "Resolved"],
        ["09:12", "Model drift - MediaGPT Moderator v1.4", "Low", "Within tolerance"],
      ],
      notes: ["Signed audit trail available for both events"],
      primaryAction: "Open audit log",
      primaryTone: "info",
    }),
  },
  {
    id: "drift-monitor",
    family: "Safeguard",
    name: "MediaGPT Drift Monitor",
    icon: Eye,
    tagline: "Edge, CMS and network anomaly detection with audit trails.",
    boundary: "Read-only",
    fields: [
      { key: "window", kind: "select", label: "Window", options: windowOptions, defaultValue: "Last 24 hours" },
      { key: "surface", kind: "select", label: "Surface", options: ["All", "Edge", "CMS", "Network"], defaultValue: "All" },
    ],
    run: (input) => ({
      summary: `${input.surface} surface, ${input.window}: 2 anomalies, 1 resolved.`,
      columns: ["Time", "Signal", "Severity", "Status"],
      rows: [
        ["23:04", "Latency spike AD-BRG-014", "Medium", "Resolved"],
        ["09:12", "Model drift - MediaGPT Moderator v1.4", "Low", "Within tolerance"],
      ],
      notes: ["Signed audit trail available for both events"],
      primaryAction: "Open audit log",
      primaryTone: "info",
    }),
  },
];

function boundaryTone(boundary: Boundary): Tone {
  if (boundary === "Read-only") return "info";
  if (boundary === "Recommend") return "neutral";
  if (boundary === "Execute with approval") return "warn";
  return "danger";
}

function creativeCopyToAgentResult(copy: CreativeCopy & { source?: string }): AgentResult {
  const concepts = copy.concepts?.length ? copy.concepts : [];
  return {
    summary: concepts.length
      ? `${concepts.length} bilingual concepts generated ${copy.source === "openai" ? "with OpenAI" : "from offline fallback"}.`
      : "No concepts generated.",
    columns: ["Ratio", "Headline EN", "Headline AR", "Body EN", "Body AR"],
    rows: concepts.map((concept) => [concept.ratio, concept.headline_en, concept.headline_ar, concept.body_en, concept.body_ar]),
    notes: ["All concepts must re-enter CMS moderation before publishing", "Arabic and English copy remain reviewer-approved, not automatically published"],
    primaryAction: "Send to CMS Library",
    primaryTone: copy.source === "openai" ? "good" : "warn",
  };
}

type RunLogEntry = {
  id: string;
  agent: string;
  boundary: Boundary;
  summary: string;
  at: string;
};

function MediaGptSuite({ aiAvailable, t }: { aiAvailable: boolean; t: (value: string) => string }) {
  const [activeId, setActiveId] = useState<AgentId>("insights");
  const active = mediaGptAgents.find((a) => a.id === activeId)!;
  const [inputs, setInputs] = useState<AgentInputs>(() => {
    const seed: AgentInputs = {};
    active.fields.forEach((f) => (seed[f.key] = f.defaultValue));
    return seed;
  });
  const [result, setResult] = useState<AgentResult | null>(null);
  const [log, setLog] = useState<RunLogEntry[]>([
    { id: "run-seed-1", agent: "MediaGPT Moderator", boundary: "Never modify", summary: "Rights evidence requested for Airport retail launch.", at: "10:42" },
    { id: "run-seed-2", agent: "MediaGPT Sentinel", boundary: "Read-only", summary: "AD-BRG-014 controller risk linked to open PO.", at: "10:18" },
    { id: "run-seed-3", agent: "MediaGPT Optimizer", boundary: "Recommend", summary: "Yas evening slots recommended for leisure campaign.", at: "09:57" },
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  function selectAgent(id: AgentId) {
    const spec = mediaGptAgents.find((a) => a.id === id)!;
    const seed: AgentInputs = {};
    spec.fields.forEach((f) => (seed[f.key] = f.defaultValue));
    setActiveId(id);
    setInputs(seed);
    setResult(null);
  }

  function updateInput(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function runAgent() {
    setRunning(true);
    const out = active.id === "studio" || active.id === "dco-adapter"
      ? creativeCopyToAgentResult(await aiGenerateCreativeCopy({
          brief: inputs.brief || "Civic DOOH campaign",
          tone: inputs.tone || "Civic",
          ratios: ["6:1", "9:16", "1:1", "3:4"],
        }))
      : active.run(inputs);
    setResult(out);
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setLog((prev) => [
      { id: `${active.id}-${Date.now()}`, agent: active.name, boundary: active.boundary, summary: out.summary, at },
      ...prev,
    ].slice(0, 6));
    setRunning(false);
  }

  function performPrimary() {
    if (!result?.primaryAction) return;
    setToast(`${t(result.primaryAction)} - ${t("submitted for governance")}`);
    setTimeout(() => setToast(null), 2400);
  }

  function applyStarter(agentId: AgentId, patch: AgentInputs) {
    const spec = mediaGptAgents.find((a) => a.id === agentId)!;
    const seed: AgentInputs = {};
    spec.fields.forEach((f) => (seed[f.key] = patch[f.key] ?? f.defaultValue));
    setActiveId(agentId);
    setInputs(seed);
    setResult(null);
  }

  const ActiveIcon = active.icon;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Agents active" value={String(mediaGptAgents.length)} helper="Governed platform agents" tone="good" />
        <Metric label="Runs today" value={String(log.length)} helper="This session" tone="info" />
        <Metric label="Human approvals" value="11" helper="Required before execution" tone="warn" />
        <Metric label="Arabic parity" value="98%" helper="Bilingual QA on outputs" tone="good" />
      </MetricGrid>

      <div className="workbench-grid">
        <aside className="agent-rail" aria-label={t("Agents")}>
          <div className="agent-rail-title">{t("Agents")}</div>
          {mediaGptAgents.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                className={`agent-rail-item ${a.id === activeId ? "active" : ""}`}
                onClick={() => selectAgent(a.id)}
              >
                <span className="family-icon"><Icon size={16} /></span>
                <span className="agent-rail-body">
                  <strong>{t(a.name)}</strong>
                  <small>{t(a.tagline)}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="workbench">
          <header className="workbench-header">
            <div className="workbench-title">
              <span className="family-icon"><ActiveIcon size={18} /></span>
              <div>
                <strong>{t(active.name)}</strong>
                <small>{t(active.family)}</small>
              </div>
            </div>
            <span className={`boundary-badge tone-${boundaryTone(active.boundary)}`}>{t(active.boundary)}</span>
          </header>

          <div className="workbench-form">
            {active.fields.map((field) => (
              <label key={field.key} className="workbench-field">
                <span>{t(field.label)}</span>
                {field.kind === "text" && (
                  <input
                    type="text"
                    value={inputs[field.key] ?? ""}
                    placeholder={t(field.placeholder)}
                    onChange={(e) => updateInput(field.key, e.target.value)}
                  />
                )}
                {field.kind === "textarea" && (
                  <textarea
                    rows={3}
                    value={inputs[field.key] ?? ""}
                    placeholder={t(field.placeholder)}
                    onChange={(e) => updateInput(field.key, e.target.value)}
                  />
                )}
                {field.kind === "select" && (
                  <select value={inputs[field.key] ?? ""} onChange={(e) => updateInput(field.key, e.target.value)}>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{t(opt)}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>

          <ActionRow>
            <Button icon={Zap} disabled={running || (!aiAvailable && (active.id === "studio" || active.id === "dco-adapter"))} onClick={runAgent}>
              {running ? t("Running") : t("Run agent")}
            </Button>
            {result?.primaryAction ? (
              <Button icon={Send} variant="secondary" onClick={performPrimary}>{result.primaryAction}</Button>
            ) : null}
          </ActionRow>

          {result ? (
            <div className="workbench-result">
              <div className="workbench-summary">{t(result.summary)}</div>
              {result.columns && result.rows ? (
                <CompactTable columns={result.columns} rows={result.rows} />
              ) : null}
              {result.notes?.length ? (
                <ul className="workbench-notes">
                  {result.notes.map((note) => <li key={note}>{t(note)}</li>)}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="workbench-empty workbench-starters">
              <strong>{t("Common asks")}</strong>
              <button type="button" onClick={() => applyStarter("insights", { q: "Coca-Cola placements on Yas Island last year", scope: "Campaigns" })}>
                {t("Find campaign history")}
              </button>
              <button type="button" onClick={() => applyStarter("workflow-composer", { zone: "Airport route", daypart: "Morning peak", creative: "CR-90421" })}>
                {t("Prepare a governed schedule")}
              </button>
              <button type="button" onClick={() => applyStarter("moderator", { check: "Deep" })}>
                {t("Review a submitted creative")}
              </button>
            </div>
          )}
        </section>
      </div>

      <Panel icon={Activity} title="Recent runs">
        <CompactTable
          columns={["Time", "Agent", "Boundary", "Result"]}
          rows={log.map((entry) => [entry.at, entry.agent, entry.boundary, entry.summary])}
        />
      </Panel>

      {toast ? <Toast>{toast}</Toast> : null}
    </PageBody>
  );
}

function KnowledgeBasePage({ t }: { t: (value: string) => string }) {
  const [active, setActive] = useState<KnowledgeCollectionId>(knowledgeCollections[0].id);
  const [sources, setSources] = useState<KnowledgeSource[]>(knowledgeSourceCatalogue);
  const [selectedSourceId, setSelectedSourceId] = useState(knowledgeSourceCatalogue[0].id);
  const [query, setQuery] = useState("");
  const [opsOpen, setOpsOpen] = useState(false);
  const [ontologyOpen, setOntologyOpen] = useState(false);
  const [sourceDetailsOpen, setSourceDetailsOpen] = useState(false);
  const selected = knowledgeCollections.find((item) => item.id === active) || knowledgeCollections[0];
  const visibleSources = sources
    .filter((source) => source.collectionId === active)
    .filter((source) => {
      const haystack = [
        localized(source.title, t),
        localized(source.summary, t),
        source.owner,
        source.tags.join(" "),
        source.usedBy.join(" "),
      ].join(" ").toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  const selectedSource = sources.find((source) => source.id === selectedSourceId) || visibleSources[0] || sources[0];
  const pending = sources.filter((source) => source.status !== "Indexed").length;
  const indexedChunks = sources.reduce((sum, source) => sum + source.chunks, 0);
  const coverageRows = knowledgeCollections.map((collection) => {
    const collectionSources = sources.filter((source) => source.collectionId === collection.id);
    const indexedCount = collectionSources.filter((source) => source.status === "Indexed").length;
    const rulesUsingCollection = ruleCatalogue.filter((rule) => collectionSources.some((source) => source.id === rule.sourceId)).length;
    const agents = Array.from(new Set(collectionSources.flatMap((source) => source.usedBy))).slice(0, 3).join(", ");
    return [
      localized(collection.name, t),
      `${indexedCount}/${collectionSources.length}`,
      String(rulesUsingCollection),
      agents || t("Not mapped yet"),
    ];
  });
  const ingestionRows = sources
    .filter((source) => source.status !== "Indexed")
    .map((source) => [
      source.id,
      localized(source.title, t),
      t(source.status),
      source.lastIndexed,
      t(source.owner),
    ]);

  useEffect(() => {
    if (visibleSources.length && !visibleSources.some((source) => source.id === selectedSourceId)) {
      setSelectedSourceId(visibleSources[0].id);
    }
  }, [visibleSources, selectedSourceId]);

  function queueSource() {
    const id = `KB-UP-${String(sources.length + 1).padStart(3, "0")}`;
    setSources((items) => [
      {
        id,
        collectionId: active,
        title: { en: "Uploaded bidder evidence pack", ar: "حزمة أدلة معلن مرفوعة" },
        type: "Dataset",
        status: "Queued",
        owner: "Technical Platform Owner",
        version: "v0.1",
        effectiveDate: "Draft",
        sensitivity: "Internal",
        chunks: 0,
        lastIndexed: "Queued now",
        summary: { en: "New mock source waiting for indexing and governance review.", ar: "مصدر تجريبي جديد بانتظار الفهرسة ومراجعة الحوكمة." },
        body: { en: "This placeholder represents a future upload flow for local files, bid packets, contracts and operating notes.", ar: "يمثل هذا العنصر مسار رفع لاحق للملفات المحلية وحزم العروض والعقود والملاحظات التشغيلية." },
        linkedEntities: ["ONT-KNOWLEDGE", "ONT-SUBMISSION"],
        tags: ["uploaded", "mock"],
        citations: ["Draft upload"],
        usedBy: ["MediaGPT Moderator"],
      },
      ...items,
    ]);
    setSelectedSourceId(id);
  }

  function reindex() {
    setSources((items) =>
      items.map((item) =>
        item.collectionId === active
          ? { ...item, status: "Indexed", lastIndexed: "Just now", chunks: item.chunks === 0 ? 312 : item.chunks }
          : item,
      ),
    );
  }

  function updateSource(id: string, patch: Partial<KnowledgeSource>) {
    setSources((items) => items.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }

  function updateSourceText(id: string, field: "title" | "summary" | "body", lang: keyof LocalizedText, value: string) {
    setSources((items) =>
      items.map((source) =>
        source.id === id ? { ...source, [field]: { ...source[field], [lang]: value } } : source,
      ),
    );
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Ontology entities" value={String(ontologyCatalogue.length)} helper="Shared DOOH vocabulary" tone="info" />
        <Metric label="Knowledge bases" value={String(knowledgeCollections.length)} helper="MediaGPT source corpora" tone="info" />
        <Metric label="Documents" value={String(sources.length)} helper="Uploaded or connected" tone="good" />
        <Metric label="Indexed chunks" value={indexedChunks.toLocaleString("en-US")} helper="Retrieval-ready passages" tone="good" />
        <Metric label="Pending indexing" value={String(pending)} helper="Queued or processing" tone={pending ? "warn" : "good"} />
      </MetricGrid>

      <div className="utility-action-strip">
        <Button icon={Upload} variant="secondary" onClick={queueSource}>Add source</Button>
        <Button icon={RefreshCcw} variant="secondary" onClick={reindex}>Re-index selected</Button>
        <Button icon={Layers3} variant="secondary" onClick={() => setOpsOpen((value) => !value)}>{opsOpen ? "Hide coverage" : "Show coverage"}</Button>
        <Button icon={Database} variant="secondary" onClick={() => setOntologyOpen((value) => !value)}>{ontologyOpen ? "Hide ontology" : "Show ontology"}</Button>
      </div>

      {opsOpen ? (
        <div className="split-grid">
          <Panel icon={Layers3} title="Knowledge coverage">
            <CompactTable
              columns={["Knowledge base", "Indexed sources", "Rules linked", "MediaGPT consumers"]}
              rows={coverageRows}
            />
          </Panel>
          <Panel icon={RefreshCcw} title="Indexing queue">
            <CompactTable
              columns={["Source", "Title", "Status", "Last indexed", "Owner"]}
              rows={ingestionRows.length ? ingestionRows : [["-", t("No pending sources"), t("Indexed"), "-", "-"]]}
            />
          </Panel>
        </div>
      ) : null}

      {ontologyOpen ? (
        <Panel icon={Database} title="DOOH ontology">
          <div className="ontology-grid">
            {ontologyCatalogue.map((entity) => (
              <article key={entity.id} className="ontology-card">
                <span>{entity.id}</span>
                <strong>{localized(entity.name, t)}</strong>
                <p>{localized(entity.definition, t)}</p>
                <div className="chip-row">
                  <span>{localized(entity.layer, t)}</span>
                  {entity.relationships.slice(0, 2).map((relationship) => <span key={relationship}>{t(relationship)}</span>)}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel icon={Database} title="Knowledge bases">
          <div className="knowledge-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search sources, tags, owners")} />
          </div>
          <div className="knowledge-list rules-catalogue">
            {knowledgeCollections.map((base) => (
              <button key={base.id} type="button" className={base.id === active ? "selected" : ""} onClick={() => setActive(base.id)}>
                <strong>{localized(base.name, t)}</strong>
                <span>{localized(base.description, t)}</span>
                <small>{base.documents} {t("documents")} / {base.chunks.toLocaleString("en-US")} {t("chunks")} / {t(base.sensitivity)}</small>
              </button>
            ))}
          </div>
        <LinkedDetail icon={FileText} title={localized(selected.name, t)}>
          <div className="source-summary-card">
            <p>{localized(selected.description, t)}</p>
            <div className="chip-row">
              <span>{t("Owner")}: {t(selected.owner)}</span>
              <span>{t("Sensitivity")}: {t(selected.sensitivity)}</span>
              {selected.domains.map((domain) => <span key={domain}>{t(domain)}</span>)}
            </div>
          </div>
          <div className="knowledge-list source-list rules-catalogue">
            {visibleSources.map((source) => (
              <button key={source.id} type="button" className={source.id === selectedSource.id ? "selected" : ""} onClick={() => setSelectedSourceId(source.id)}>
                <strong>{localized(source.title, t)}</strong>
                <span>{localized(source.summary, t)}</span>
                <small>{source.id} / {t(source.type)} / {t(source.status)} / {source.chunks.toLocaleString("en-US")} {t("chunks")}</small>
              </button>
            ))}
          </div>
        </LinkedDetail>

      {selectedSource ? (
        <LinkedDetail
          icon={FileCheck2}
          title={localized(selectedSource.title, t)}
          action={
            <>
              <StatusPill label={selectedSource.status} tone={selectedSource.status === "Indexed" ? "good" : "warn"} />
              <Button icon={sourceDetailsOpen ? X : Eye} variant="secondary" onClick={() => setSourceDetailsOpen((value) => !value)}>
                {sourceDetailsOpen ? "Hide details" : "Show details"}
              </Button>
            </>
          }
        >
          <div className="knowledge-detail-grid">
            <section className="source-detail">
              <div className="rule-detail">
                <Detail label="Owner" value={selectedSource.owner} />
                <Detail label="Version" value={selectedSource.version} />
                <Detail label="Effective date" value={selectedSource.effectiveDate} />
                <Detail label="Sensitivity" value={selectedSource.sensitivity} />
                <Detail label="Last indexed" value={selectedSource.lastIndexed} />
                <Detail label="Used by" value={selectedSource.usedBy.join(", ")} />
              </div>
              {sourceDetailsOpen ? (
                <>
                  <p className="notes">{localized(selectedSource.body, t)}</p>
                  <div className="citation-grid">
                    <div>
                      <span>{t("Linked entities")}</span>
                      <div className="chip-row">{selectedSource.linkedEntities.map((entity) => <span key={entity}>{entity}</span>)}</div>
                    </div>
                    <div>
                      <span>{t("Citations")}</span>
                      <div className="chip-row">{selectedSource.citations.map((citation) => <span key={citation}>{t(citation)}</span>)}</div>
                    </div>
                    <div>
                      <span>{t("Tags")}</span>
                      <div className="chip-row">{selectedSource.tags.map((tag) => <span key={tag}>{t(tag)}</span>)}</div>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
            <section className="rule-editor source-editor">
              <label><span>{t("Title EN")}</span><input value={selectedSource.title.en} onChange={(event) => updateSourceText(selectedSource.id, "title", "en", event.target.value)} /></label>
              <label><span>{t("Title AR")}</span><input value={selectedSource.title.ar} onChange={(event) => updateSourceText(selectedSource.id, "title", "ar", event.target.value)} /></label>
              <label><span>{t("Type")}</span><input value={selectedSource.type} onChange={(event) => updateSource(selectedSource.id, { type: event.target.value as KnowledgeSource["type"] })} /></label>
              <label><span>{t("Status")}</span><select value={selectedSource.status} onChange={(event) => updateSource(selectedSource.id, { status: event.target.value as KnowledgeSource["status"] })}><option>Indexed</option><option>Indexing</option><option>Queued</option><option>Needs review</option></select></label>
              <label><span>{t("Owner")}</span><input value={selectedSource.owner} onChange={(event) => updateSource(selectedSource.id, { owner: event.target.value })} /></label>
              <label><span>{t("Version")}</span><input value={selectedSource.version} onChange={(event) => updateSource(selectedSource.id, { version: event.target.value })} /></label>
              <label className="rule-form-wide"><span>{t("Summary EN")}</span><textarea value={selectedSource.summary.en} onChange={(event) => updateSourceText(selectedSource.id, "summary", "en", event.target.value)} /></label>
              <label className="rule-form-wide"><span>{t("Summary AR")}</span><textarea value={selectedSource.summary.ar} onChange={(event) => updateSourceText(selectedSource.id, "summary", "ar", event.target.value)} /></label>
              <ActionRow>
                <Button icon={Save} onClick={() => updateSource(selectedSource.id, { lastIndexed: "Saved just now" })}>Save source</Button>
                <Button icon={RefreshCcw} variant="secondary" onClick={() => updateSource(selectedSource.id, { status: "Indexed", lastIndexed: "Just now", chunks: selectedSource.chunks || 312 })}>Index source</Button>
              </ActionRow>
            </section>
          </div>
        </LinkedDetail>
      ) : null}
      </Panel>
    </PageBody>
  );
}

function ruleTone(status: DoohRuleStatus): Tone {
  if (status === "Strict") return "danger";
  if (status === "Draft") return "warn";
  return "good";
}

function emptyRuleDraft(): DoohRule {
  return {
    id: "",
    title: { en: "", ar: "" },
    family: "Creative policy",
    scope: "CMS submissions",
    workflowStage: "AI Screening",
    mode: "Recommend",
    status: "Draft",
    severity: "Medium",
    enabled: true,
    condition: { en: "", ar: "" },
    action: { en: "", ar: "" },
    recommendedAction: "Prepare governed action",
    owner: "Platform Admin",
    sourceId: knowledgeSourceCatalogue[0].id,
    overridePolicy: { en: "Requires named owner approval.", ar: "يتطلب اعتماد المالك المسمى." },
    effectiveDate: "Draft",
    version: "v0.1",
    aiEffect: { en: "Available to MediaGPT after save.", ar: "يتاح لـ MediaGPT بعد الحفظ." },
    linkedEntities: ["ONT-RULE", "ONT-ACTION"],
    testCases: [{ input: "Sample input", expected: "Expected result" }],
  };
}

const ENFORCEMENT_TONE: Record<EnforcementEvent["outcome"], Tone> = { blocked: "danger", overridden: "info", warned: "warn", cleared: "good" };
const SENSITIVE_LABEL: Record<SensitiveKind, string> = { mosque: "Mosque", school: "School", embassy: "Diplomatic site", military: "Military site", hospital: "Hospital" };
const RULE_ZONES = ["Abu Dhabi City", "Yas Island", "Industrial Zone", "Al Ain", "Downtown"];
const RULE_CATEGORIES = ["Retail", "Tourism", "Alcohol", "Gambling", "Energy drink", "Political", "Civic notice"];
const RULE_TIERS: OverrideTier[] = ["Commercial", "Regulatory", "Civic", "Public Safety", "Emergency"];

function RulesEnforcementPanel({ enforcementEvents, t }: { enforcementEvents: EnforcementEvent[]; t: (value: string) => string }) {
  const [zone, setZone] = useState(RULE_ZONES[0]);
  const [category, setCategory] = useState(RULE_CATEGORIES[2]); // Alcohol - fires by default for a clear demo
  const [tier, setTier] = useState<OverrideTier>("Commercial");
  const [verdict, setVerdict] = useState<RuleVerdict | null>(null);
  const [running, setRunning] = useState(false);

  async function runCheck() {
    setRunning(true);
    try {
      const response = await fetch("/api/dooh/rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: { kind: "booking", zones: [zone], category, requesterTier: tier } }),
      });
      const data = await response.json();
      setVerdict(data.verdict ?? null);
    } catch {
      setVerdict(null);
    }
    setRunning(false);
  }

  return (
    <div className="split-grid wide-left">
      <Panel icon={ShieldCheck} title={t("Rules engine simulator")} action={t("Server-enforced, deterministic")}>
        <div className="rules-sim-form">
          <label>{t("Zone")}
            <select value={zone} onChange={(e) => setZone(e.target.value)}>{RULE_ZONES.map((z) => <option key={z} value={z}>{t(z)}</option>)}</select>
          </label>
          <label>{t("Content category")}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{RULE_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
          </label>
          <label>{t("Requester tier")}
            <select value={tier} onChange={(e) => setTier(e.target.value as OverrideTier)}>{RULE_TIERS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</select>
          </label>
          <Button icon={Zap} disabled={running} onClick={runCheck}>{running ? t("Evaluating") : t("Evaluate booking")}</Button>
        </div>
        {verdict ? (
          <div className={`rules-verdict ${verdict.blocked ? "blocked" : verdict.warnings.length ? "warned" : "cleared"}`}>
            <StatusPill label={verdict.blocked ? t("Blocked") : verdict.warnings.length ? t("Allowed with warnings") : t("Cleared")} tone={verdict.blocked ? "danger" : verdict.warnings.length ? "warn" : "good"} />
            {[...verdict.hits, ...verdict.warnings].map((hit, i) => (
              <div key={`${hit.ruleId}-${i}`} className={`rules-hit ${hit.severity}`}>
                <strong>{t(hit.label)}</strong>
                <span>{hit.detail}</span>
                <em>{hit.ruleId} · {hit.reasonCode}{hit.overriddenBy ? ` · ${t("overridden by")} ${t(hit.overriddenBy)}` : ""}</em>
              </div>
            ))}
            {!verdict.hits.length && !verdict.warnings.length ? <p className="cell-note">{t("No rules fired for this context.")}</p> : null}
          </div>
        ) : <p className="cell-note">{t("Choose a context and evaluate to see live enforcement.")}</p>}
      </Panel>

      <Panel icon={MapPinned} title={t("Live ruleset")} action={`${sensitiveSites.length + zoneContentRules.length} ${t("machine rules")}`}>
        <div className="rules-list">
          <div className="rules-list-head">{t("Proximity exclusions")}</div>
          {sensitiveSites.map((site) => (
            <div key={site.id} className="rules-list-row">
              <span>{t(SENSITIVE_LABEL[site.kind])}: {t(site.name)}</span>
              <em>{site.radiusM}m</em>
            </div>
          ))}
          <div className="rules-list-head">{t("Category and zoning")}</div>
          {zoneContentRules.map((rule) => (
            <div key={rule.ruleId} className="rules-list-row">
              <span>{rule.ruleId} · {t(rule.reasonCode)}</span>
              <em>{rule.zone ? t(rule.zone) : t("Network-wide")}</em>
            </div>
          ))}
        </div>
      </Panel>

      {enforcementEvents.length ? (
        <Panel icon={FileText} title={t("Recent enforcement events")} action={String(enforcementEvents.length)}>
          <div className="table-card">
            <table>
              <thead>
                <tr><th>{t("Subject")}</th><th>{t("Stage")}</th><th>{t("Outcome")}</th><th>{t("Reason codes")}</th></tr>
              </thead>
              <tbody>
                {enforcementEvents.slice(0, 8).map((event) => (
                  <tr key={event.id}>
                    <td data-label={t("Subject")}><strong>{t(event.subject)}</strong><span>{event.at.replace("T", " ").slice(0, 16)} · {t(event.actor)}</span></td>
                    <td data-label={t("Stage")}>{t(event.kind)}</td>
                    <td data-label={t("Outcome")}><StatusPill label={event.outcome} tone={ENFORCEMENT_TONE[event.outcome]} /></td>
                    <td data-label={t("Reason codes")}><span className="cell-note">{event.reasonCodes.join(", ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const RADIUS_PRESETS = [
  { label: "Corniche, Abu Dhabi", lat: 24.4664, lng: 54.3170 },
  { label: "Downtown Abu Dhabi", lat: 24.485, lng: 54.360 },
  { label: "Yas Island", lat: 24.4887, lng: 54.6030 },
  { label: "Al Ain", lat: 24.2244, lng: 55.7628 },
];

type RadiusScreen = { id: string; name: string; zone: string; distanceM: number; status: "clear" | "flagged"; flagLabel?: string; flagDetail?: string };
type QueuedBroadcast = { id: string; campaign: string; clearCount: number; flaggedCount: number; status: string; approvedBy?: string };

function RadiusBroadcastPage({ profile, aiAvailable, notify, t }: { profile: Profile | null; aiAvailable: boolean; notify: (message: string) => void; t: (value: string) => string }) {
  const [center, setCenter] = useState({ lat: 24.485, lng: 54.360 });
  const [centerLabel, setCenterLabel] = useState("Downtown Abu Dhabi");
  const [radiusKm, setRadiusKm] = useState(3.5);
  const [campaign, setCampaign] = useState("Strong wind safety notice");
  const [brief, setBrief] = useState("Reduce speed, strong winds this evening. Calm, official tone.");
  const [messageEn, setMessageEn] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pending, setPending] = useState<QueuedBroadcast | null>(null);
  const [approved, setApproved] = useState<QueuedBroadcast | null>(null);
  const [approver, setApprover] = useState("");
  const radiusM = Math.round(radiusKm * 1000);

  const screens = useMemo<RadiusScreen[]>(() => {
    return estateAssets
      .map((a) => ({ a, d: distanceM(center, { lat: a.lat, lng: a.lng }) }))
      .filter((row) => row.d <= radiusM)
      .sort((x, y) => x.d - y.d)
      .map(({ a, d }) => {
        const verdict = evaluateRules({ kind: "scheduling", assetIds: [a.id] });
        const flag = verdict.hits[0] ?? verdict.warnings[0];
        return { id: a.id, name: a.name, zone: a.zone, distanceM: d, status: flag ? "flagged" : "clear", flagLabel: flag?.label, flagDetail: flag?.detail };
      });
  }, [center.lat, center.lng, radiusM]);

  const insideIds = screens.map((s) => s.id);
  const flaggedIds = screens.filter((s) => s.status === "flagged").map((s) => s.id);
  const clearCount = screens.length - flaggedIds.length;
  const approverOptions = namedApprovers.filter((a) => a.name !== (profile?.name ?? ""));

  function resetQueue() { setPending(null); setApproved(null); }
  function pickPreset(preset: (typeof RADIUS_PRESETS)[number]) {
    setCenter({ lat: preset.lat, lng: preset.lng });
    setCenterLabel(preset.label);
    resetQueue();
  }
  function onPick(lat: number, lng: number) {
    setCenter({ lat, lng });
    setCenterLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    resetQueue();
  }

  async function generate() {
    setGenerating(true);
    try {
      const copy = await aiGenerateCreativeCopy({ brief: `${campaign}. ${brief}`, tone: "official, calm, roadside", ratios: ["landscape"] });
      const concept = copy.concepts?.[0];
      if (concept) { setMessageEn(concept.headline_en); setMessageAr(concept.headline_ar); }
      else notify(t("MediaGPT could not generate copy right now."));
    } catch {
      notify(t("MediaGPT could not generate copy right now."));
    } finally {
      setGenerating(false);
    }
  }

  async function queue() {
    const res = await fetch("/api/dooh/mediagpt/radius/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ center, centerLabel, radiusM, campaign, messageEn, messageAr, actor: profile?.name ?? "Operator", role: profile?.id ?? "control-room" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.broadcast) { setPending(data.broadcast); notify(t("Radius broadcast queued for approval")); }
    else notify(data.error ?? t("Could not queue the broadcast"));
  }

  async function approve() {
    if (!pending || !approver) return;
    const res = await fetch(`/api/dooh/mediagpt/radius/${pending.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: approver, role: "admin" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.broadcast) { setApproved(data.broadcast); setPending(null); notify(t("Broadcast approved and queued")); }
    else notify(data.error ?? t("Could not approve the broadcast"));
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label={t("Screens in range")} value={String(screens.length)} helper={`${(radiusKm).toFixed(1)} km of ${t(centerLabel)}`} tone="info" />
        <Metric label={t("Clear to run")} value={String(clearCount)} helper="Pass all rules" tone="good" />
        <Metric label={t("Flagged by rules")} value={String(flaggedIds.length)} helper="Held for review" tone={flaggedIds.length ? "warn" : "good"} />
        <Metric label={t("Radius")} value={`${radiusKm.toFixed(1)} km`} helper="Adjustable" tone="neutral" />
      </MetricGrid>

      <Panel icon={Target} title={t("Radius broadcast")} action={<StatusPill label={t("AI proposes, humans approve")} tone="good" />}>
        <RadiusMap assets={estateAssets} center={center} radiusM={radiusM} insideIds={insideIds} flaggedIds={flaggedIds} onPick={onPick} t={t} />
        <div className="radius-presets">
          <span className="radius-presets-label">{t("Centre on")}:</span>
          {RADIUS_PRESETS.map((preset) => (
            <button key={preset.label} type="button" className={centerLabel === preset.label ? "active" : ""} onClick={() => pickPreset(preset)}>{t(preset.label)}</button>
          ))}
          <label className="radius-slider">
            {t("Radius")}: <strong>{radiusKm.toFixed(1)} km</strong>
            <input type="range" min={1} max={8} step={0.5} value={radiusKm} onChange={(event) => { setRadiusKm(Number(event.target.value)); resetQueue(); }} />
          </label>
        </div>

        <div className="linked-detail">
          <div className="linked-detail-head">
            <span className="panel-icon"><Sparkles size={18} /></span>
            <strong>{t("Compose the message")}</strong>
          </div>
          <div className="radius-compose">
            <label><span>{t("Campaign name")}</span><input value={campaign} onChange={(event) => { setCampaign(event.target.value); resetQueue(); }} /></label>
            <label><span>{t("Brief")}</span><input value={brief} onChange={(event) => setBrief(event.target.value)} /></label>
            <ActionRow>
              <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || generating} onClick={generate}>{generating ? t("Generating") : t("Generate with MediaGPT")}</Button>
            </ActionRow>
            {messageEn ? (
              <div className="radius-message">
                <div><span>{t("English")}</span><strong>{messageEn}</strong></div>
                <div dir="rtl"><span>{t("Arabic")}</span><strong>{messageAr}</strong></div>
              </div>
            ) : <p className="cell-note">{t("Generate a bilingual message, or type one, then queue it across the screens in range.")}</p>}
          </div>
        </div>

        <div className="linked-detail">
          <div className="linked-detail-head">
            <span className="panel-icon"><ShieldCheck size={18} /></span>
            <strong>{t("Screens in range")} ({screens.length})</strong>
            <span className="head-meta">{clearCount} {t("clear")} · {flaggedIds.length} {t("flagged")}</span>
          </div>
          <div className="radius-screens">
            {screens.map((screen) => (
              <div key={screen.id} className={`radius-screen ${screen.status}`}>
                <span className="radius-screen-dot" />
                <span className="radius-screen-main">
                  <strong>{screen.id} · {t(screen.name)}</strong>
                  <small>{t(screen.zone)} · {(screen.distanceM / 1000).toFixed(1)} km{screen.flagDetail ? ` · ${t(screen.flagDetail)}` : ""}</small>
                </span>
                <StatusPill label={screen.status === "flagged" ? (screen.flagLabel ?? "Flagged") : "Clear"} tone={screen.status === "flagged" ? "warn" : "good"} />
              </div>
            ))}
            {!screens.length ? <p className="cell-note">{t("No screens fall inside this area. Widen the radius or move the centre.")}</p> : null}
          </div>
        </div>

        <div className="linked-detail">
          <div className="linked-detail-head">
            <span className="panel-icon"><Send size={18} /></span>
            <strong>{t("Queue and approve")}</strong>
          </div>
          {approved ? (
            <div className="radius-result good">
              <ShieldCheck size={16} />
              <div>
                <strong>{t("Approved and queued")}</strong>
                <small>{approved.campaign}: {approved.clearCount} {t("screens queued")}, {approved.flaggedCount} {t("held for review")}. {t("Approved by")} {t(approved.approvedBy ?? "")}.</small>
              </div>
            </div>
          ) : pending ? (
            <div className="radius-approve">
              <div className="radius-result warn">
                <AlertTriangle size={16} />
                <div>
                  <strong>{t("Pending approval")}</strong>
                  <small>{pending.campaign}: {pending.clearCount} {t("clear screens")}, {pending.flaggedCount} {t("flagged")}. {t("One approval queues them all.")}</small>
                </div>
              </div>
              <div className="approvals-action">
                <label>{t("Approving as")}
                  <select value={approver} onChange={(event) => setApprover(event.target.value)}>
                    <option value="">{t("Select a named approver")}</option>
                    {approverOptions.map((a) => <option key={a.name} value={a.name}>{a.name} ({t(a.role)})</option>)}
                  </select>
                </label>
                <Button icon={ShieldCheck} disabled={!approver} onClick={approve}>{t("Approve and queue")}</Button>
              </div>
              <p className="approvals-sod">{t("Segregation of duties: the operator who proposed the broadcast cannot approve it.")}</p>
            </div>
          ) : (
            <ActionRow>
              <Button icon={Send} disabled={!messageEn.trim() || !clearCount} onClick={queue}>
                {t("Queue")} {clearCount} {t("clear screens for approval")}
              </Button>
            </ActionRow>
          )}
        </div>
      </Panel>
    </PageBody>
  );
}

type YieldRec = { assetId: string; name: string; zone: string; audienceWeekly: number; rateCardWeekAed: number; weeksAffordable: number; projectedImpressions: number; costPerThousand: number; rationale: string };
type YieldAdvice = { budgetAed: number; goal: string; recommendations: YieldRec[]; dayparts: string[]; summary: string };
const YIELD_GOALS = [
  { value: "retail", label: "Retail sales" },
  { value: "tourism", label: "Tourism and leisure" },
  { value: "awareness", label: "Brand awareness" },
  { value: "safety", label: "Civic and safety" },
];

function YieldAdvisorPage({ notify, t }: { notify: (message: string) => void; t: (value: string) => string }) {
  const [budget, setBudget] = useState("200000");
  const [goal, setGoal] = useState("retail");
  const [advice, setAdvice] = useState<YieldAdvice | null>(null);
  const [loading, setLoading] = useState(false);

  async function recommend() {
    const budgetAed = Number(budget.replace(/[^\d]/g, ""));
    if (!budgetAed) { notify(t("Enter a budget first")); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/dooh/mediagpt/yield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetAed, goal, actor: "Operator", role: "control-room" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setAdvice(data);
      else notify(data?.error ?? t("Could not compute recommendation"));
    } finally {
      setLoading(false);
    }
  }

  const maxImpr = advice ? Math.max(...advice.recommendations.map((r) => r.projectedImpressions), 1) : 1;
  const liveScreens = estateAssets.filter((asset) => asset.status === "Live").length;
  const zoneCount = new Set(estateAssets.map((asset) => asset.zone)).size;
  const weeklyReach = estateAssets.reduce((sum, asset) => sum + (parseInt(asset.audience) || 0), 0);

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Screens in estate" value={String(estateAssets.length)} helper={`${liveScreens} ${t("live now")}`} tone="good" />
        <Metric label="Zones covered" value={String(zoneCount)} helper={t("City, airport and leisure")} tone="neutral" />
        <Metric label="Weekly reach" value={`${(weeklyReach / 1000).toFixed(1)}M`} helper={t("Estate-wide audience")} tone="info" />
        <Metric label="Working budget" value={`AED ${Number(budget.replace(/[^\d]/g, "") || 0).toLocaleString()}`} helper={t(YIELD_GOALS.find((g) => g.value === goal)?.label ?? "Retail sales")} tone="neutral" />
      </MetricGrid>
      <div className="split-grid wide-left">
      <Panel icon={Gauge} title={t("Yield advisor")} action={<StatusPill label={t("Where the budget works hardest")} tone="good" />}>
        <div className="yield-form">
          <label><span>{t("Budget")} (AED)</span><input value={budget} onChange={(event) => setBudget(event.target.value)} inputMode="numeric" /></label>
          <label><span>{t("Goal")}</span><select value={goal} onChange={(event) => setGoal(event.target.value)}>{YIELD_GOALS.map((g) => <option key={g.value} value={g.value}>{t(g.label)}</option>)}</select></label>
          <Button icon={Sparkles} disabled={loading} onClick={recommend}>{loading ? t("Analyzing") : t("Ask MediaGPT where to spend")}</Button>
        </div>

        {advice ? (
          <div className="linked-detail">
            <div className="linked-detail-head">
              <span className="panel-icon"><Sparkles size={18} /></span>
              <strong>{t("MediaGPT recommendation")}</strong>
            </div>
            <section className="ai-mini-panel">
              <div>
                <span>{t("Summary")}</span>
                <strong>{advice.summary}</strong>
                <small>{t("Recommended dayparts")}: {advice.dayparts.map((d) => t(d)).join(" · ")}</small>
              </div>
              <StatusPill label="MediaGPT" tone="good" />
            </section>
            <div className="yield-list">
              {advice.recommendations.map((rec, index) => (
                <div key={rec.assetId} className="yield-row">
                  <span className="yield-rank">{index + 1}</span>
                  <span className="yield-main">
                    <strong>{rec.assetId} · {t(rec.name)}</strong>
                    <small>{t(rec.zone)} · {t(rec.rationale)}</small>
                    <span className="yield-bar"><span className="yield-fill" style={{ width: `${Math.round((rec.projectedImpressions / maxImpr) * 100)}%` }} /></span>
                  </span>
                  <span className="yield-metric">
                    <strong>{(rec.projectedImpressions / 1_000_000).toFixed(2)}M</strong>
                    <small>{t("impressions")} · AED {rec.costPerThousand} {t("CPM")}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="cell-note">{t("Set a budget and goal, and MediaGPT ranks the screens where it will perform best, with the reasoning.")}</p>
        )}
      </Panel>
      <Panel icon={Sparkles} title={t("How the advisor decides")}>
        <div className="detail-cards yield-factors">
          <Detail label={t("Footfall and audience")} value={t("Weekly reach per screen, by daypart")} />
          <Detail label={t("Dwell time")} value={t("Slow traffic and waiting areas rank higher")} />
          <Detail label={t("Zone saturation")} value={t("Budget spreads away from crowded zones")} />
          <Detail label={t("Rate card")} value={t("Projected impressions per dirham")} />
        </div>
        <p className="cell-note">{t("The advisor only proposes. Booking still flows through bid approvals and the standard checks, and every run is logged in the audit trail.")}</p>
      </Panel>
      </div>
    </PageBody>
  );
}

function RulesPage({ enforcementEvents, t }: { enforcementEvents: EnforcementEvent[]; t: (value: string) => string }) {
  const [rules, setRules] = useState<DoohRule[]>(ruleCatalogue);
  const [selectedId, setSelectedId] = useState(ruleCatalogue[0].id);
  const [creating, setCreating] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [draft, setDraft] = useState<DoohRule>(emptyRuleDraft);
  const [simulationId, setSimulationId] = useState(simulationCatalogue[0].id);
  const [familyFilter, setFamilyFilter] = useState("All");
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [ruleDetailsOpen, setRuleDetailsOpen] = useState(false);
  const [ruleTestsOpen, setRuleTestsOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const families = ["All", ...Array.from(new Set(rules.map((rule) => rule.family)))];
  const selected = rules.find((rule) => rule.id === selectedId) || rules[0];
  const filteredRules = rules.filter((rule) => familyFilter === "All" || rule.family === familyFilter);
  const simulation = simulationCatalogue.find((item) => item.id === simulationId) || simulationCatalogue[0];
  const simulationRules = simulation.matchingRuleIds.map(ruleById).filter(Boolean) as DoohRule[];
  const simulationSources = simulation.citedSourceIds.map(sourceById).filter(Boolean) as KnowledgeSource[];
  const workflowCoverageRows = Array.from(new Set(rules.map((rule) => rule.workflowStage))).map((stage) => {
    const stageRules = rules.filter((rule) => rule.workflowStage === stage);
    const enforced = stageRules.filter((rule) => rule.mode === "Enforce").length;
    const recommended = stageRules.filter((rule) => rule.mode === "Recommend").length;
    const monitored = stageRules.filter((rule) => rule.mode === "Monitor").length;
    const sourcesLinked = new Set(stageRules.map((rule) => rule.sourceId)).size;
    return [t(stage), String(stageRules.length), String(enforced), String(recommended), String(monitored), String(sourcesLinked)];
  });

  function updateSelected(patch: Partial<DoohRule>) {
    setRules((items) => items.map((rule) => rule.id === selected.id ? { ...rule, ...patch } : rule));
    setSavedNotice("");
  }

  function updateSelectedText(field: "title" | "condition" | "action" | "overridePolicy" | "aiEffect", lang: keyof LocalizedText, value: string) {
    updateSelected({ [field]: { ...selected[field], [lang]: value } } as Partial<DoohRule>);
  }

  function updateDraftText(field: "title" | "condition" | "action" | "overridePolicy" | "aiEffect", lang: keyof LocalizedText, value: string) {
    setDraft((item) => ({ ...item, [field]: { ...item[field], [lang]: value } }));
  }

  function createRule() {
    if (!draft.title.en.trim() || !draft.condition.en.trim() || !draft.action.en.trim()) return;
    const next: DoohRule = {
      ...draft,
      id: `RULE-CUSTOM-${String(rules.length + 1).padStart(3, "0")}`,
      title: { en: draft.title.en.trim(), ar: draft.title.ar.trim() || draft.title.en.trim() },
      condition: { en: draft.condition.en.trim(), ar: draft.condition.ar.trim() || draft.condition.en.trim() },
      action: { en: draft.action.en.trim(), ar: draft.action.ar.trim() || draft.action.en.trim() },
    };
    setRules((items) => [next, ...items]);
    setSelectedId(next.id);
    setDraft(emptyRuleDraft());
    setCreating(false);
    setSavedNotice("Rule created and added to MediaGPT governance.");
  }
  function deleteRule(id: string) {
    const remaining = rules.filter((rule) => rule.id !== id);
    if (!remaining.length) return;
    setRules(remaining);
    setSelectedId(remaining[0].id);
    setSavedNotice("Rule removed from active governance.");
  }
  function saveRule() {
    setSavedNotice("Rule changes saved for MediaGPT reasoning.");
  }
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Rule packs" value={String(rules.length)} helper="Condition AI reasoning" tone="good" />
        <Metric label="Enforced rules" value={String(rules.filter((rule) => rule.mode === "Enforce" && rule.enabled).length)} helper="Cannot be bypassed by AI" tone="danger" />
        <Metric label="Recommendation rules" value={String(rules.filter((rule) => rule.mode === "Recommend" && rule.enabled).length)} helper="Guide AI outputs" tone="warn" />
        <Metric label="Simulation scenarios" value={String(simulationCatalogue.length)} helper="Ready to test rule firing" tone="info" />
      </MetricGrid>

      <RulesEnforcementPanel enforcementEvents={enforcementEvents} t={t} />

      <Panel icon={ShieldCheck} title="Rules" action={<Button icon={Plus} variant="secondary" onClick={() => setCreating((value) => !value)}>Create rule</Button>}>
          {creating ? (
            <div className="rule-form">
              <label><span>{t("Rule name EN")}</span><input value={draft.title.en} onChange={(event) => updateDraftText("title", "en", event.target.value)} placeholder={t("New governance rule")} /></label>
              <label><span>{t("Rule name AR")}</span><input value={draft.title.ar} onChange={(event) => updateDraftText("title", "ar", event.target.value)} /></label>
              <label><span>{t("Scope")}</span><input value={draft.scope} onChange={(event) => setDraft((item) => ({ ...item, scope: event.target.value }))} /></label>
              <label><span>{t("Family")}</span><input value={draft.family} onChange={(event) => setDraft((item) => ({ ...item, family: event.target.value }))} /></label>
              <label><span>{t("Mode")}</span><select value={draft.mode} onChange={(event) => setDraft((item) => ({ ...item, mode: event.target.value as DoohRuleMode }))}><option>Enforce</option><option>Recommend</option><option>Monitor</option></select></label>
              <label><span>{t("Status")}</span><select value={draft.status} onChange={(event) => setDraft((item) => ({ ...item, status: event.target.value as DoohRuleStatus }))}><option>Draft</option><option>Active</option><option>Strict</option></select></label>
              <label className="rule-form-wide"><span>{t("Condition EN")}</span><textarea value={draft.condition.en} onChange={(event) => updateDraftText("condition", "en", event.target.value)} placeholder={t("When this rule should fire")} /></label>
              <label className="rule-form-wide"><span>{t("Action EN")}</span><textarea value={draft.action.en} onChange={(event) => updateDraftText("action", "en", event.target.value)} placeholder={t("What MediaGPT or the workflow must do")} /></label>
              <label><span>{t("Owner")}</span><input value={draft.owner} onChange={(event) => setDraft((item) => ({ ...item, owner: event.target.value }))} /></label>
              <label><span>{t("Source")}</span><select value={draft.sourceId} onChange={(event) => setDraft((item) => ({ ...item, sourceId: event.target.value }))}>{knowledgeSourceCatalogue.map((source) => <option key={source.id} value={source.id}>{localized(source.title, t)}</option>)}</select></label>
              <ActionRow>
                <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
                <Button icon={Plus} onClick={createRule} disabled={!draft.title.en.trim() || !draft.condition.en.trim() || !draft.action.en.trim()}>Add rule</Button>
              </ActionRow>
            </div>
          ) : null}
          <div className="filter-row">
            {families.map((family) => (
              <button key={family} type="button" className={familyFilter === family ? "active" : ""} onClick={() => setFamilyFilter(family)}>
                {t(family)}
              </button>
            ))}
          </div>
          <div className="knowledge-list rules-catalogue">
            {filteredRules.map((rule) => (
              <button key={rule.id} type="button" className={selected.id === rule.id ? "selected" : ""} onClick={() => setSelectedId(rule.id)}>
                <strong>{localized(rule.title, t)}</strong>
                <span>{t(rule.family)} / {t(rule.scope)} / {t(rule.mode)} / {t(rule.owner)}</span>
                <small>{rule.id} / {t(rule.status)} / {rule.version} / {rule.enabled ? t("Enabled") : t("Disabled")}</small>
              </button>
            ))}
          </div>
          <div className="linked-detail">
            <div className="linked-detail-head">
              <span className="panel-icon"><ClipboardCheck size={18} /></span>
              <strong>{localized(selected.title, t)}</strong>
              <div className="panel-action-row">
                <StatusPill label={selected.status} tone={ruleTone(selected.status)} />
                <Button icon={ruleDetailsOpen ? X : Eye} variant="secondary" onClick={() => setRuleDetailsOpen((value) => !value)}>
                  {ruleDetailsOpen ? "Hide details" : "Show details"}
                </Button>
              </div>
            </div>
          {ruleDetailsOpen ? (
            <div className="rule-detail">
              <Detail label="Mode" value={selected.mode} />
              <Detail label="Applies to" value={selected.scope} />
              <Detail label="Owner" value={selected.owner} />
              <Detail label="Severity" value={selected.severity} />
              <Detail label="Workflow stage" value={selected.workflowStage} />
              <Detail label="Source" value={sourceById(selected.sourceId)?.id || selected.sourceId} />
            </div>
          ) : null}
          <Segmented value={selected.mode} onChange={(mode) => updateSelected({ mode })} items={[
            { id: "Enforce", label: t("Enforce") },
            { id: "Recommend", label: t("Recommend") },
            { id: "Monitor", label: t("Monitor") },
          ]} />
          <div className="rule-editor">
            <label><span>{t("Rule name EN")}</span><input value={selected.title.en} onChange={(event) => updateSelectedText("title", "en", event.target.value)} /></label>
            <label><span>{t("Rule name AR")}</span><input value={selected.title.ar} onChange={(event) => updateSelectedText("title", "ar", event.target.value)} /></label>
            <label><span>{t("Family")}</span><input value={selected.family} onChange={(event) => updateSelected({ family: event.target.value })} /></label>
            <label><span>{t("Scope")}</span><input value={selected.scope} onChange={(event) => updateSelected({ scope: event.target.value })} /></label>
            <label><span>{t("Status")}</span><select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as DoohRuleStatus })}><option>Active</option><option>Strict</option><option>Draft</option></select></label>
            <label><span>{t("Severity")}</span><select value={selected.severity} onChange={(event) => updateSelected({ severity: event.target.value as DoohRule["severity"] })}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label><span>{t("Owner")}</span><input value={selected.owner} onChange={(event) => updateSelected({ owner: event.target.value })} /></label>
            <label><span>{t("Enabled")}</span><select value={selected.enabled ? "Enabled" : "Disabled"} onChange={(event) => updateSelected({ enabled: event.target.value === "Enabled" })}><option>Enabled</option><option>Disabled</option></select></label>
            <label><span>{t("Source")}</span><select value={selected.sourceId} onChange={(event) => updateSelected({ sourceId: event.target.value })}>{knowledgeSourceCatalogue.map((source) => <option key={source.id} value={source.id}>{source.id} - {localized(source.title, t)}</option>)}</select></label>
            <label className="rule-form-wide"><span>{t("Condition EN")}</span><textarea value={selected.condition.en} onChange={(event) => updateSelectedText("condition", "en", event.target.value)} /></label>
            <label className="rule-form-wide"><span>{t("Condition AR")}</span><textarea value={selected.condition.ar} onChange={(event) => updateSelectedText("condition", "ar", event.target.value)} /></label>
            <label className="rule-form-wide"><span>{t("Action EN")}</span><textarea value={selected.action.en} onChange={(event) => updateSelectedText("action", "en", event.target.value)} /></label>
            <label className="rule-form-wide"><span>{t("Override policy")}</span><textarea value={localized(selected.overridePolicy, t)} readOnly /></label>
            <label className="rule-form-wide"><span>{t("AI effect")}</span><input value={localized(selected.aiEffect, t)} readOnly /></label>
          </div>
          {ruleDetailsOpen ? (
            <CollapsibleIntelligenceCitations ruleIds={[selected.id]} sourceIds={[selected.sourceId]} action={selected.recommendedAction} />
          ) : null}
          {savedNotice ? <p className="media-notice">{t(savedNotice)}</p> : null}
          <div className="inline-toggle-row">
            <Button icon={ruleTestsOpen ? X : FileCheck2} variant="secondary" onClick={() => setRuleTestsOpen((value) => !value)}>
              {ruleTestsOpen ? "Hide tests" : "Show tests"}
            </Button>
          </div>
          {ruleTestsOpen ? (
            <CompactTable
              columns={["Test input", "Expected result"]}
              rows={selected.testCases.map((test) => [test.input, test.expected])}
            />
          ) : null}
          <ActionRow>
            <Button icon={Save} onClick={saveRule}>Save changes</Button>
            <Button icon={Trash2} variant="secondary" onClick={() => deleteRule(selected.id)} disabled={rules.length < 2}>Delete rule</Button>
          </ActionRow>
          </div>
      </Panel>

      <div className="utility-action-strip">
        <Button icon={Layers3} variant="secondary" onClick={() => setCoverageOpen((value) => !value)}>{coverageOpen ? "Hide coverage" : "Show coverage"}</Button>
        <Button icon={Zap} variant="secondary" onClick={() => setSimulationOpen((value) => !value)}>{simulationOpen ? "Hide simulator" : "Show simulator"}</Button>
      </div>
      {coverageOpen ? (
        <Panel icon={Layers3} title="Rule coverage by workflow">
          <CompactTable
            columns={["Workflow stage", "Rules", "Enforced", "Recommended", "Monitored", "Sources linked"]}
            rows={workflowCoverageRows}
          />
        </Panel>
      ) : null}

      {simulationOpen ? (
        <div className="split-grid cms-grid">
        <Panel icon={Zap} title="Rule simulator">
          <label className="rule-simulator-select">
            <span>{t("Scenario")}</span>
            <select value={simulationId} onChange={(event) => setSimulationId(event.target.value)}>
              {simulationCatalogue.map((context) => (
                <option key={context.id} value={context.id}>{localized(context.label, t)}</option>
              ))}
            </select>
          </label>
          <div className="simulator-output">
            <p>{localized(simulation.input, t)}</p>
            <StatusPill label={simulation.tone === "danger" ? "Issue detected" : "AI-assisted"} tone={simulation.tone} />
            <strong>{localized(simulation.recommendation, t)}</strong>
            <span>{t("Next action")}: {localized(simulation.action, t)}</span>
          </div>
          <CollapsibleIntelligenceCitations
            ruleIds={simulationRules.map((rule) => rule.id)}
            sourceIds={simulationSources.map((source) => source.id)}
            action={localized(simulation.action, t)}
          />
        </Panel>
        <Panel icon={Workflow} title="Scenario library">
          <CompactTable
            columns={["Scenario", "Workflow", "Rules", "Outcome", "Next action"]}
            rows={scenarioCatalogue.map((scenario) => [
              localized(scenario.title, t),
              scenario.workflow,
              scenario.rules.join(", "),
              localized(scenario.outcome, t),
              localized(scenario.nextAction, t),
            ])}
          />
        </Panel>
      </div>
      ) : null}
    </PageBody>
  );
}

function CollapsibleIntelligenceCitations({
  ruleIds,
  sourceIds,
  action,
}: {
  ruleIds: string[];
  sourceIds: string[];
  action: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className={`intelligence-citations-toggle ${open ? "open" : ""}`}>
      <Button variant="secondary" icon={open ? X : Sparkles} onClick={() => setOpen((value) => !value)}>
        {open ? t("Hide AI details") : t("Show AI details")}
      </Button>
      {open ? <IntelligenceCitations ruleIds={ruleIds} sourceIds={sourceIds} action={action} /> : null}
    </div>
  );
}

function IntelligenceCitations({
  ruleIds,
  sourceIds,
  action,
}: {
  ruleIds: string[];
  sourceIds: string[];
  action: string;
}) {
  const t = useT();
  const rules = ruleIds.map(ruleById).filter(Boolean) as DoohRule[];
  const sources = sourceIds.map(sourceById).filter(Boolean) as KnowledgeSource[];
  return (
    <div className="intelligence-citations">
      <span className="citations-kicker">{t("MediaGPT governance")}</span>
      <div className="citation-columns">
        <div>
          <strong>{t("Rules fired")}</strong>
          {rules.map((rule) => (
            <small key={rule.id}>{rule.id} / {localized(rule.title, t)} / {t(rule.mode)}</small>
          ))}
        </div>
        <div>
          <strong>{t("Knowledge cited")}</strong>
          {sources.map((source) => (
            <small key={source.id}>{source.id} / {localized(source.title, t)}</small>
          ))}
        </div>
        <div>
          <strong>{t("Allowed action")}</strong>
          <small>{t(action)}</small>
        </div>
      </div>
    </div>
  );
}

const doohSkillRows = [
  { id: "SK-01", title: "Creative risk classifier", meta: "OCR, logo, claim, cultural policy / Used by MediaGPT Moderator", tone: "good" as Tone, status: "Live" },
  { id: "SK-02", title: "Arabic parity checker", meta: "Terminology, tone, RTL proofing / Used by MediaGPT Compliance Agent", tone: "good" as Tone, status: "Live" },
  { id: "SK-03", title: "Emergency route builder", meta: "Scope, cache, edge override / Used by MediaGPT Orchestrator", tone: "warn" as Tone, status: "Live" },
  { id: "SK-04", title: "Yield scenario planner", meta: "Demand, budget, price floors / Used by MediaGPT Optimizer", tone: "info" as Tone, status: "Beta" },
  { id: "SK-05", title: "Maintenance triage", meta: "Sensor anomalies to work orders / Used by MediaGPT Sentinel", tone: "good" as Tone, status: "Live" },
  { id: "SK-06", title: "BoM and PO recommender", meta: "Spare-part availability, SO timing / Used by MediaGPT Maintenance", tone: "info" as Tone, status: "Beta" },
];

function SkillsCataloguePage({ t }: { t: (value: string) => string }) {
  const [selected, setSelected] = useState(doohSkillRows[0]);
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Reusable skills" value={String(doohSkillRows.length)} helper="Agent callable capabilities" tone="good" />
        <Metric label="Live skills" value={String(doohSkillRows.filter((row) => row.status === "Live").length)} helper="Available in workflows" tone="info" />
        <Metric label="Beta skills" value={String(doohSkillRows.filter((row) => row.status === "Beta").length)} helper="Admin-enabled only" tone="warn" />
        <Metric label="Rule-bound" value="100%" helper="Governed by DOOH rules" tone="good" />
      </MetricGrid>
      <Panel icon={Sparkles} title="Skills Catalogue">
          <div className="knowledge-list rules-catalogue">
            {doohSkillRows.map((row) => (
              <button key={row.id} type="button" className={selected.id === row.id ? "selected" : ""} onClick={() => setSelected(row)}>
                <strong>{t(row.title)}</strong>
                <span>{row.meta.split(" / ").map(t).join(" / ")}</span>
                <small>{t(row.status)}</small>
              </button>
            ))}
          </div>
        <LinkedDetail icon={Workflow} title={t(selected.title)} action={<StatusPill label={selected.status} tone={selected.tone} />}>
          <div className="rule-detail">
            <Detail label="Runtime" value={selected.status === "Beta" ? "Approval required" : "Available"} />
            <Detail label="Inputs" value="Knowledge, rules, workflow context" />
            <Detail label="Output" value="Recommendation with citations" />
          </div>
          <CompactTable
            columns={["Capability", "Used by", "Governance"]}
            rows={[
              ["Policy-aware analysis", "MediaGPT agents", "Cites Knowledge and Rules"],
              ["Action recommendation", "Workflow runners", "Requires allowed profile"],
              ["Audit event creation", "Platform infrastructure", "Signed and exportable"],
            ]}
          />
        </LinkedDetail>
      </Panel>
    </PageBody>
  );
}

function SkillWorkflowsPage({ t }: { t: (value: string) => string }) {
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Active workflows" value="9" helper="Reusable MediaGPT workflows" tone="good" />
        <Metric label="Approval gates" value="14" helper="Human checkpoints" tone="warn" />
        <Metric label="Source-bound steps" value="26" helper="Knowledge-backed decisions" tone="info" />
        <Metric label="Avg cycle time" value="01:42" helper="Last 24 hours" tone="neutral" />
      </MetricGrid>
      <Panel icon={Workflow} title="Skill workflows">
        <CompactTable
          columns={["Workflow", "Trigger", "Rules", "Agents", "Output"]}
          rows={[
            ["Submission deep review", "New bidder submission", "Creative policy rules", "MediaGPT Moderator, MediaGPT Compliance Agent", "Approve / changes / reject recommendation"],
            ["Emergency broadcast readiness", "Alert created", "Emergency override rules", "MediaGPT Orchestrator, MediaGPT Sentinel", "Verified broadcast packet"],
            ["Bid optimization", "Marketplace bid", "Commercial eligibility rules", "MediaGPT Optimizer, MediaGPT Insights", "Bid floor and budget recommendation"],
            ["Maintenance triage", "Telemetry anomaly", "Network maintenance rules", "MediaGPT Sentinel, MediaGPT Maintenance", "SO / PO recommendation"],
          ]}
        />
      </Panel>
    </PageBody>
  );
}

function SkillRunsPage({ t }: { t: (value: string) => string }) {
  const [runs, setRuns] = useState([
    ["10:42", "Submission deep review", "CNT-2026-0614", "Completed", "Changes recommended"],
    ["10:18", "Emergency broadcast readiness", "AL-104", "Waiting approval", "Ready for dual control"],
    ["09:57", "Maintenance triage", "AD-BRG-014", "Completed", "Open PO risk"],
  ]);
  function runSample() {
    setRuns((items) => [["Now", "Submission deep review", "CNT-2026-0617", "Running", "Applying rules"], ...items].slice(0, 6));
  }
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Runs today" value={String(runs.length)} helper="Skill executions" tone="info" />
        <Metric label="Completed" value={String(runs.filter((row) => row[3] === "Completed").length)} helper="Finished with audit" tone="good" />
        <Metric label="Waiting approval" value={String(runs.filter((row) => row[3] === "Waiting approval").length)} helper="Human gate" tone="warn" />
        <Metric label="Failures" value="0" helper="Last 24 hours" tone="good" />
      </MetricGrid>
      <Panel icon={Activity} title="Skill runs" action={<Button icon={Zap} variant="secondary" onClick={runSample}>Run sample check</Button>}>
        <CompactTable columns={["Time", "Workflow", "Subject", "Status", "Result"]} rows={runs} />
      </Panel>
    </PageBody>
  );
}

const doohModels = [
  { id: "moderator-vision", name: "MediaGPT Moderator Vision", provider: "OpenAI vision route", family: "Multimodal screening", latency: "1.4s", cost: "AED 0.92", context: "images/video frames", status: "Active", residency: "Provider region", tokens: "18.2M", usedBy: ["MediaGPT Moderator", "MediaGPT Compliance Agent"], fallback: "Local OCR + rules", evaluation: "98.4% precision on policy flags", guardrail: "Human review for high-impact flags" },
  { id: "arabic-parity", name: "MediaGPT Arabic Copy QA", provider: "Arabic evaluator", family: "Language / RTL", latency: "0.9s", cost: "AED 0.38", context: "32k", status: "Active", residency: "Controlled route", tokens: "12.6M", usedBy: ["MediaGPT Compliance Agent"], fallback: "Terminology rules", evaluation: "96.7% tone and parity match", guardrail: "Native reviewer required for civic alerts" },
  { id: "cap-orchestrator", name: "MediaGPT CAP-UAE Orchestrator", provider: "Private workflow model", family: "Emergency reasoning", latency: "1.1s", cost: "Private", context: "alert packet", status: "Active", residency: "Private runtime", tokens: "4.8M", usedBy: ["MediaGPT Orchestrator", "MediaGPT Sentinel"], fallback: "Static CAP checklist", evaluation: "100% schema compliance", guardrail: "Dual-control before broadcast" },
  { id: "yield-optimizer", name: "MediaGPT Yield Optimizer Model", provider: "Commercial forecast model", family: "Bid optimization", latency: "1.8s", cost: "AED 0.21", context: "rate card + demand", status: "Active", residency: "Private analytics", tokens: "7.9M", usedBy: ["MediaGPT Optimizer", "Financials"], fallback: "Rate-card floor", evaluation: "AED 42k weekly uplift simulation", guardrail: "Never violate civic priority slots" },
  { id: "pop-reconciler", name: "MediaGPT Proof-of-Play Reconciler", provider: "Ledger matching model", family: "Evidence reconciliation", latency: "0.7s", cost: "AED 0.12", context: "playback ledger", status: "Active", residency: "Private runtime", tokens: "9.4M", usedBy: ["MediaGPT Insights", "Financials"], fallback: "Signed ledger rules", evaluation: "99.6% ledger match", guardrail: "Mismatch creates audit event" },
  { id: "asset-risk", name: "MediaGPT Asset Risk Model", provider: "Reliability model", family: "Predictive maintenance", latency: "1.6s", cost: "Private", context: "telemetry history", status: "Active", residency: "Edge + private cloud", tokens: "21.4M", usedBy: ["MediaGPT Sentinel", "MediaGPT Maintenance"], fallback: "Threshold rules", evaluation: "82% early fault recall", guardrail: "SO recommendation requires operator approval" },
  { id: "edge-anomaly", name: "MediaGPT Edge Sentinel", provider: "On-device anomaly model", family: "Edge runtime", latency: "120ms", cost: "Edge", context: "local telemetry", status: "Active", residency: "On-device", tokens: "N/A", usedBy: ["MediaGPT Sentinel"], fallback: "Device health thresholds", evaluation: "Sub-second local detection", guardrail: "No autonomous field dispatch" },
  { id: "creative-studio", name: "MediaGPT Studio Generator", provider: "Generative creative route", family: "Creative generation", latency: "8.2s", cost: "AED 4.10", context: "prompt + brand pack", status: "Available", residency: "Provider region", tokens: "3.2M", usedBy: ["MediaGPT Studio"], fallback: "Template renderer", evaluation: "4 aspect ratios generated", guardrail: "All outputs re-enter moderation" },
  { id: "rights-matcher", name: "MediaGPT Rights Matcher", provider: "Reverse-match model", family: "IP / brand safety", latency: "1.5s", cost: "AED 0.46", context: "asset library", status: "Active", residency: "Controlled route", tokens: "6.1M", usedBy: ["MediaGPT Moderator"], fallback: "Known marks registry", evaluation: "93.1% logo match recall", guardrail: "Possible match blocks auto-approval" },
  { id: "local-gateway", name: "MediaGPT Local Gateway", provider: "Private AI cabin", family: "Sensitive routing", latency: "0.8s", cost: "Private", context: "128k", status: "Available", residency: "ADMO private runtime", tokens: "2.7M", usedBy: ["Platform Admin", "Technical Owner"], fallback: "Approved cloud route", evaluation: "Private-route smoke passed", guardrail: "Used for confidential evidence only" },
];

const doohModelRoutes = [
  ["Emergency alert created", "MediaGPT CAP-UAE Orchestrator", "Validate schema, bilingual payload, SLA and dual-control readiness"],
  ["Bidder creative submitted", "MediaGPT Moderator Vision", "Classify policy risk, rights issues, language coverage and cultural sensitivity"],
  ["Arabic text differs from English", "MediaGPT Arabic Copy QA", "Score parity, terminology and RTL punctuation before human review"],
  ["Auction bid requested", "MediaGPT Yield Optimizer Model", "Calculate rate-card floor, margin and civic-slot conflict"],
  ["Telemetry anomaly detected", "MediaGPT Asset Risk Model", "Recommend SO/PO path with confidence and spare-part risk"],
  ["Proof-of-play reconciliation", "MediaGPT Proof-of-Play Reconciler", "Match playback evidence to campaign, asset and settlement ledger"],
];

const doohTokenBars = [
  { label: "MediaGPT Moderator", value: 82 },
  { label: "MediaGPT Arabic QA", value: 58 },
  { label: "MediaGPT Optimizer", value: 44 },
  { label: "MediaGPT Sentinel", value: 76 },
  { label: "MediaGPT Studio", value: 28 },
  { label: "MediaGPT Ledger", value: 36 },
];

function ModelCenterPage({ t }: { t: (value: string) => string }) {
  const [selectedId, setSelectedId] = useState(doohModels[0].id);
  const [routeMode, setRouteMode] = useState<"Balanced" | "Private first" | "Lowest cost">("Balanced");
  const selected = doohModels.find((model) => model.id === selectedId) ?? doohModels[0];
  const activeCount = doohModels.filter((model) => model.status === "Active").length;
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Active models" value={String(activeCount)} helper="Runtime registry" tone="good" />
        <Metric label="Tokens today" value="86.3M" helper="MediaGPT routes" tone="info" />
        <Metric label="Cost today" value="AED 612" helper="Budget guardrails active" tone="warn" />
        <Metric label="Routing decisions" value="3,842" helper="Audited model routes" tone="neutral" />
      </MetricGrid>
      <div className="technical-grid wide">
        <Panel icon={Cpu} title="Model registry" action={<Segmented value={routeMode} onChange={setRouteMode} items={[{ id: "Balanced", label: t("Balanced") }, { id: "Private first", label: t("Private first") }, { id: "Lowest cost", label: t("Lowest cost") }]} />}>
          <div className="technical-table">
            <table>
              <thead><tr><th>{t("Model")}</th><th>{t("Provider")}</th><th>{t("Latency")}</th><th>{t("Cost")}</th><th>{t("Context")}</th><th>{t("Status")}</th></tr></thead>
              <tbody>
                {doohModels.map((model) => (
                  <tr key={model.id} className={selected.id === model.id ? "selected" : ""} onClick={() => setSelectedId(model.id)}>
                    <td><strong>{t(model.name)}</strong><small>{t(model.family)}</small></td>
                    <td>{t(model.provider)}</td>
                    <td>{model.latency}</td>
                    <td>{model.cost}</td>
                    <td>{t(model.context)}</td>
                    <td><StatusPill label={model.status} tone={model.status === "Active" ? "good" : "info"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel icon={FileText} title={selected.name} action={<StatusPill label={selected.status} tone={selected.status === "Active" ? "good" : "info"} />}>
          <div className="detail-cards compact">
            <Detail label="Residency" value={selected.residency} />
            <Detail label="Tokens" value={selected.tokens} />
            <Detail label="Fallback" value={selected.fallback} />
            <Detail label="Guardrail" value={selected.guardrail} />
          </div>
          <p className="notes">{t(selected.evaluation)}</p>
          <div className="chip-row">{selected.usedBy.map((agent) => <span key={agent}>{t(agent)}</span>)}</div>
        </Panel>
      </div>
      <div className="technical-grid equal">
        <Panel icon={Gauge} title="Token consumption">
          <div className="bar-stack">
            {doohTokenBars.map((bar) => (
              <div key={bar.label} className="bar-row">
                <span>{t(bar.label)}</span>
                <div><i style={{ width: `${bar.value}%` }} /></div>
                <strong>{bar.value}%</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel icon={Workflow} title="Routing rules">
          <CompactTable columns={["Trigger", "Model", "Reason"]} rows={doohModelRoutes} />
        </Panel>
      </div>
    </PageBody>
  );
}

const seedIntegrations = [
  { id: "admo-cms", name: "ADMO CMS Workflow API", vendor: "ADMO", category: "Content", status: "Connected", calls: 1284, errorRate: "0.1%", last: "2 min ago", owner: "CMS operations", usedBy: "CMS, MediaGPT Moderator, Knowledge" },
  { id: "cap-uae", name: "CAP-UAE Emergency Gateway", vendor: "NCEMA gateway", category: "Emergency", status: "Connected", calls: 82, errorRate: "0.0%", last: "8 min ago", owner: "Control room", usedBy: "Alerts, MediaGPT Orchestrator" },
  { id: "edge-telemetry", name: "Edge Telemetry Stream", vendor: "Origen edge runtime", category: "Telemetry", status: "Connected", calls: 9824, errorRate: "0.4%", last: "Live", owner: "Network operations", usedBy: "MediaGPT Sentinel, MediaGPT Maintenance" },
  { id: "erp-finance", name: "Finance ERP and Billing", vendor: "ADMO finance", category: "Commercial", status: "Connected", calls: 214, errorRate: "0.2%", last: "17 min ago", owner: "Finance", usedBy: "Financials, MediaGPT Optimizer" },
  { id: "bidder-portal", name: "Bidder Portal Submissions", vendor: "External partners", category: "Commercial", status: "Connected", calls: 446, errorRate: "0.3%", last: "5 min ago", owner: "Marketplace ops", usedBy: "CMS, Knowledge" },
  { id: "asset-library", name: "Media Asset Object Store", vendor: "Private storage", category: "Content", status: "Connected", calls: 2401, errorRate: "0.0%", last: "Live", owner: "CMS operations", usedBy: "Media Library, MediaGPT Studio" },
  { id: "map-gis", name: "GIS and Asset Registry", vendor: "Abu Dhabi GIS", category: "Operations", status: "Available", calls: 0, errorRate: "0.0%", last: "Not connected", owner: "Platform admin", usedBy: "Control Centre, Network" },
  { id: "proof-ledger", name: "Proof-of-Play Ledger Export", vendor: "Audit lake", category: "Evidence", status: "Warning", calls: 312, errorRate: "2.1%", last: "1h ago", owner: "Audit office", usedBy: "Financials, Audit Log" },
];

function IntegrationsPage({ t }: { t: (value: string) => string }) {
  const [integrations, setIntegrations] = useState(seedIntegrations);
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const categories = ["All", ...Array.from(new Set(integrations.map((item) => item.category)))];
  const visible = integrations.filter((item) => category === "All" || item.category === category);
  function syncIntegration(id: string) {
    setIntegrations((items) => items.map((item) => item.id === id ? { ...item, status: "Connected", last: "Just now", calls: item.calls + 1, errorRate: "0.0%" } : item));
    setNotice("Integration sync completed.");
  }
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Integrations" value={String(integrations.length)} helper="APIs, ERP, files" tone="good" />
        <Metric label="Connected" value={String(integrations.filter((item) => item.status === "Connected").length)} helper="Live data routes" tone="good" />
        <Metric label="Warnings" value={String(integrations.filter((item) => item.status === "Warning").length)} helper="Needs technical follow-up" tone="warn" />
        <Metric label="Calls today" value="14.5k" helper="Across connected systems" tone="info" />
      </MetricGrid>
      <div className="filter-row">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)}>{t(item)}</button>)}</div>
      {notice ? <p className="media-notice">{t(notice)}</p> : null}
      <div className="integration-grid">
        {visible.map((item) => (
          <article key={item.id} className="integration-card">
            <header><PlugZap size={16} /><StatusPill label={item.status} tone={item.status === "Connected" ? "good" : item.status === "Warning" ? "warn" : "info"} /></header>
            <strong>{t(item.name)}</strong>
            <p>{t(item.vendor)} / {t(item.category)} / {t(item.owner)}</p>
            <dl>
              <div><dt>{t("Calls")}</dt><dd>{item.calls.toLocaleString()}</dd></div>
              <div><dt>{t("Error rate")}</dt><dd>{item.errorRate}</dd></div>
              <div><dt>{t("Last sync")}</dt><dd>{t(item.last)}</dd></div>
            </dl>
            <small>{t("Used by")}: {item.usedBy.split(", ").map(t).join(", ")}</small>
            <Button variant="secondary" icon={RefreshCcw} onClick={() => syncIntegration(item.id)}>Sync now</Button>
          </article>
        ))}
      </div>
      <Panel icon={Database} title="Data contracts">
        <CompactTable
          columns={["Contract", "Payload", "Frequency", "Owner", "Governance"]}
          rows={[
            ["Creative submission packet", "Assets, rights, bilingual text, bidder metadata", "Event-driven", "CMS operations", "Rules + Knowledge indexed"],
            ["Emergency broadcast packet", "CAP-UAE, authority, scope, SLA, message", "Event-driven", "Control room", "Dual-control required"],
            ["Edge telemetry envelope", "Health, proof-of-play, sensor anomalies", "Streaming", "Network operations", "Device signed"],
            ["Commercial settlement export", "Campaign, bid, PoP ledger, invoice status", "Daily batch", "Finance", "Audit lake export"],
          ]}
        />
      </Panel>
    </PageBody>
  );
}

const accessResources = ["Operational", "CMS", "Emergency", "Commercial", "MediaGPT", "Rules", "Models", "Integrations", "Edge Compute", "Audit Log"];
const accessActions = ["View", "Edit", "Approve", "Export"] as const;
const seedAccessRoles = [
  { id: "platform-admin", name: "Platform Admin", short: "ADM", desc: "Full platform governance and operational visibility.", members: 3 },
  { id: "technical-owner", name: "Technical Platform Owner", short: "TECH", desc: "Technical layers only: MediaGPT, rules, models, integrations, edge and audit.", members: 2 },
  { id: "control-room", name: "ADMO Control Room", short: "OPS", desc: "Operational control centre, emergency and network workflows.", members: 8 },
  { id: "content-reviewer", name: "ADMO Content Reviewer", short: "CMS", desc: "Submissions, media library and scheduling governance.", members: 12 },
  { id: "bidder", name: "Advertiser", short: "BID", desc: "External campaigns and marketplace submissions only.", members: 24 },
];
const seedMembers = [
  { name: "Maya Haddad", email: "maya.haddad@admo.gov.ae", team: "CMS", roleId: "content-reviewer", status: "Active", lastSeen: "11 min ago" },
  { name: "Khaled Nasser", email: "khaled.nasser@admo.gov.ae", team: "Control room", roleId: "control-room", status: "Active", lastSeen: "Live" },
  { name: "Sara Al Mansoori", email: "sara.mansoori@admo.gov.ae", team: "Platform", roleId: "platform-admin", status: "Active", lastSeen: "33 min ago" },
  { name: "Origen NOC", email: "noc@origen.ae", team: "Technical", roleId: "technical-owner", status: "Active", lastSeen: "5 min ago" },
];

function initialPermissionState() {
  const state: Record<string, Record<string, Record<string, boolean>>> = {};
  seedAccessRoles.forEach((role) => {
    state[role.id] = {};
    accessResources.forEach((resource) => {
      state[role.id][resource] = {};
      accessActions.forEach((action) => {
        const admin = role.id === "platform-admin";
        const technical = role.id === "technical-owner" && ["MediaGPT", "Rules", "Models", "Integrations", "Edge Compute", "Audit Log"].includes(resource);
        const ops = role.id === "control-room" && ["Operational", "Emergency", "Edge Compute", "MediaGPT"].includes(resource);
        const cms = role.id === "content-reviewer" && ["CMS", "MediaGPT", "Rules"].includes(resource) && action !== "Export";
        const bidder = role.id === "bidder" && resource === "Commercial" && action === "View";
        state[role.id][resource][action] = admin || technical || ops || cms || bidder;
      });
    });
  });
  return state;
}

function AccessRolesPage({ t }: { t: (value: string) => string }) {
  const [roles, setRoles] = useState(seedAccessRoles);
  const [members, setMembers] = useState(seedMembers);
  const [permissions, setPermissions] = useState(initialPermissionState);
  const [activeRole, setActiveRole] = useState(seedAccessRoles[0].id);
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", short: "", desc: "" });
  const active = roles.find((role) => role.id === activeRole) ?? roles[0];
  function addRole() {
    if (!newRole.name.trim() || !newRole.short.trim()) return;
    const id = newRole.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const role = { id, name: newRole.name.trim(), short: newRole.short.trim().toUpperCase(), desc: newRole.desc.trim() || "Custom DOOH platform role.", members: 0 };
    setRoles((items) => [...items, role]);
    setPermissions((current) => ({ ...current, [id]: Object.fromEntries(accessResources.map((resource) => [resource, Object.fromEntries(accessActions.map((action) => [action, false]))])) }));
    setActiveRole(id);
    setNewRole({ name: "", short: "", desc: "" });
    setAddingRole(false);
  }
  function updateRole(id: string, patch: Partial<typeof seedAccessRoles[number]>) {
    setRoles((items) => items.map((role) => role.id === id ? { ...role, ...patch } : role));
  }
  function deleteRole(id: string) {
    if (roles.length < 2) return;
    const next = roles.filter((role) => role.id !== id);
    setRoles(next);
    setActiveRole(next[0].id);
    setMembers((items) => items.map((member) => member.roleId === id ? { ...member, roleId: next[0].id } : member));
  }
  function toggleGrant(resource: string, action: string) {
    setPermissions((current) => ({
      ...current,
      [active.id]: {
        ...current[active.id],
        [resource]: {
          ...current[active.id]?.[resource],
          [action]: !current[active.id]?.[resource]?.[action],
        },
      },
    }));
  }
  function addMember() {
    const next = { name: "New ADMO user", email: `user${members.length + 1}@admo.gov.ae`, team: "Platform", roleId: active.id, status: "Active", lastSeen: "Invited" };
    setMembers((items) => [next, ...items]);
  }
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Roles" value={String(roles.length)} helper="Platform and app scoped" tone="info" />
        <Metric label="Members" value={String(members.length)} helper="Human accounts" tone="good" />
        <Metric label="Permission domains" value={String(accessResources.length)} helper="Operational and technical" tone="neutral" />
        <Metric label="Pending policy changes" value="Local" helper="Mock policy matrix" tone="warn" />
      </MetricGrid>
      <Panel icon={LockKeyhole} title="Roles" action={<Button icon={Plus} variant="secondary" onClick={() => setAddingRole((value) => !value)}>Add role</Button>}>
        {addingRole ? (
          <div className="rule-form role-form">
            <label><span>{t("Role name")}</span><input value={newRole.name} onChange={(event) => setNewRole((role) => ({ ...role, name: event.target.value }))} /></label>
            <label><span>{t("Short name")}</span><input value={newRole.short} onChange={(event) => setNewRole((role) => ({ ...role, short: event.target.value }))} /></label>
            <label className="rule-form-wide"><span>{t("Description")}</span><input value={newRole.desc} onChange={(event) => setNewRole((role) => ({ ...role, desc: event.target.value }))} /></label>
            <ActionRow><Button variant="secondary" onClick={() => setAddingRole(false)}>Cancel</Button><Button icon={Plus} onClick={addRole}>Add role</Button></ActionRow>
          </div>
        ) : null}
        <div className="role-grid">
          {roles.map((role) => (
            <article key={role.id} className={active.id === role.id ? "selected" : ""} onClick={() => setActiveRole(role.id)}>
              <span>{role.short}</span>
              <input value={role.name} onChange={(event) => updateRole(role.id, { name: event.target.value })} onClick={(event) => event.stopPropagation()} />
              <textarea value={role.desc} onChange={(event) => updateRole(role.id, { desc: event.target.value })} onClick={(event) => event.stopPropagation()} />
              <small>{members.filter((member) => member.roleId === role.id).length} {t("members")}</small>
              <button type="button" onClick={(event) => { event.stopPropagation(); deleteRole(role.id); }} aria-label={t("Delete role")}><Trash2 size={14} /></button>
            </article>
          ))}
        </div>
      </Panel>
      <div className="technical-grid wide">
        <Panel icon={ShieldCheck} title="Permission matrix" action={<StatusPill label={active.name} tone="info" />}>
          <div className="permission-matrix">
            <table>
              <thead><tr><th>{t("Domain")}</th>{accessActions.map((action) => <th key={action}>{t(action)}</th>)}</tr></thead>
              <tbody>
                {accessResources.map((resource) => (
                  <tr key={resource}>
                    <td>{t(resource)}</td>
                    {accessActions.map((action) => (
                      <td key={action}>
                        <input type="checkbox" checked={!!permissions[active.id]?.[resource]?.[action]} onChange={() => toggleGrant(resource, action)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel icon={UserPlus} title="Members" action={<Button icon={UserPlus} variant="secondary" onClick={addMember}>Add member</Button>}>
          <CompactTable
            columns={["Name", "Email", "Team", "Role", "Status", "Last seen"]}
            rows={members.map((member) => [member.name, member.email, member.team, roles.find((role) => role.id === member.roleId)?.name ?? "Unknown", member.status, member.lastSeen])}
          />
        </Panel>
      </div>
    </PageBody>
  );
}

function AuditLogPage({ t }: { t: (value: string) => string }) {
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Audit events" value="1,284" helper="Last 30 days" tone="info" />
        <Metric label="AI decisions" value="312" helper="Cited recommendations" tone="good" />
        <Metric label="Human overrides" value="18" helper="Governance review" tone="warn" />
        <Metric label="Export readiness" value="100%" helper="Signed event chain" tone="good" />
      </MetricGrid>
      <Panel icon={FileText} title="Audit Log">
        <CompactTable
          columns={["Time", "Actor", "Action", "Subject", "Evidence"]}
          rows={[
            ["10:42", "MediaGPT Moderator", "Recommended changes", "CNT-2026-0614", "Policy citations attached"],
            ["10:18", "Duty officer", "Approved emergency queue", "AL-104", "Dual-control hash"],
            ["09:57", "MediaGPT Sentinel", "Opened service recommendation", "AD-BRG-014", "Telemetry and BoM row"],
            ["09:22", "Technical Platform Owner", "Indexed knowledge source", "ADMO creative review policy.pdf", "Chunk manifest"],
          ]}
        />
      </Panel>
    </PageBody>
  );
}

const doohEdgeZones = [
  {
    id: "edge-corniche",
    name: "Corniche Edge Zone",
    location: "AD-HWY-001 / AD-HWY-009 / roadside cluster",
    status: "Healthy",
    cpu: 42,
    gpu: 58,
    memory: 61,
    storage: 48,
    latency: "42ms",
    runtime: "DOOH Edge Runtime 1.8.4",
    assets: ["Corniche Highway Main", "Downtown Civic Panel", "Bridge LED"],
    agents: ["MediaGPT Sentinel", "MediaGPT Proof-of-Play Reconciler", "MediaGPT Emergency Orchestrator"],
    models: ["MediaGPT Edge Sentinel", "MediaGPT Proof-of-Play Reconciler"],
    alerts: ["Brightness profile recalibrated at 09:42", "Model cache refreshed successfully"],
  },
  {
    id: "edge-airport",
    name: "Airport Premium Zone",
    location: "AD-014 / premium roadside LED / Edge C07",
    status: "Degraded",
    cpu: 64,
    gpu: 72,
    memory: 78,
    storage: 69,
    latency: "87ms",
    runtime: "DOOH Edge Runtime 1.8.2",
    assets: ["Airport Road Premium", "Airport Gantry West"],
    agents: ["MediaGPT Sentinel", "MediaGPT Maintenance", "MediaGPT Moderator Cache"],
    models: ["MediaGPT Asset Risk Model", "MediaGPT Edge Sentinel"],
    alerts: ["Thermal envelope above threshold", "Spare fan PO ETA exceeds SLA"],
  },
  {
    id: "edge-yas",
    name: "Yas Island Zone",
    location: "AD-027 / dual-sided panel / Edge B04",
    status: "Healthy",
    cpu: 38,
    gpu: 44,
    memory: 53,
    storage: 41,
    latency: "39ms",
    runtime: "DOOH Edge Runtime 1.8.4",
    assets: ["Yas Island Loop", "Leisure Arrival Panel"],
    agents: ["MediaGPT Proof-of-Play Reconciler", "MediaGPT Optimizer Cache"],
    models: ["MediaGPT Proof-of-Play Reconciler", "MediaGPT Yield Optimizer Model"],
    alerts: ["No active compute alarms"],
  },
  {
    id: "edge-alain",
    name: "Al Ain Gateway Zone",
    location: "AD-052 / highway gateway / recovery shell",
    status: "Faulty",
    cpu: 88,
    gpu: 24,
    memory: 82,
    storage: 91,
    latency: "218ms",
    runtime: "Recovery shell",
    assets: ["Al Ain Civic", "Industrial Zone Panel"],
    agents: ["MediaGPT Sentinel Fallback"],
    models: ["Threshold rules only"],
    alerts: ["Primary edge controller offline", "Dispatch technician already recommended"],
  },
];

function EdgeComputePage({ t }: { t: (value: string) => string }) {
  const [activeId, setActiveId] = useState(doohEdgeZones[0].id);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const active = doohEdgeZones.find((zone) => zone.id === activeId) ?? doohEdgeZones[0];
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Edge zones" value={String(doohEdgeZones.length)} helper="Registered runtime zones" tone="info" />
        <Metric label="Healthy zones" value={String(doohEdgeZones.filter((zone) => zone.status === "Healthy").length)} helper="Live and reachable" tone="good" />
        <Metric label="Model cache" value="92%" helper="On-device readiness" tone="good" />
        <Metric label="Compute alerts" value={String(doohEdgeZones.flatMap((zone) => zone.alerts).filter((alert) => !alert.includes("No active")).length)} helper="Controller attention" tone="warn" />
      </MetricGrid>
      <div className="edge-zone-grid">
        {doohEdgeZones.map((zone) => (
          <button key={zone.id} type="button" className={active.id === zone.id ? "selected" : ""} onClick={() => setActiveId(zone.id)}>
            <HardDrive size={16} />
            <span>
              <strong>{t(zone.name)}</strong>
              <small>{t(zone.location)}</small>
            </span>
            <StatusPill label={zone.status} tone={zone.status === "Healthy" ? "good" : zone.status === "Faulty" ? "danger" : "warn"} />
          </button>
        ))}
      </div>
      <div className="technical-grid wide">
        <Panel icon={HardDrive} title={active.name} action={<Button icon={Wrench} variant="secondary" onClick={() => setMaintenanceMode((value) => !value)}>{maintenanceMode ? "Exit maintenance" : "Maintenance mode"}</Button>}>
          <p className="notes">{t(active.location)} / {t(active.runtime)}</p>
          <div className="edge-gauges">
            <EdgeGauge label="CPU" value={active.cpu} />
            <EdgeGauge label="GPU / NPU" value={active.gpu} />
            <EdgeGauge label="Memory" value={active.memory} />
            <EdgeGauge label="Storage" value={active.storage} />
            <Detail label="Latency" value={active.latency} />
          </div>
          <div className="edge-lists">
            <div><strong>{t("Assets")}</strong><div className="chip-row">{active.assets.map((item) => <span key={item}>{t(item)}</span>)}</div></div>
            <div><strong>{t("Resident agents")}</strong><div className="chip-row">{active.agents.map((item) => <span key={item}>{t(item)}</span>)}</div></div>
            <div><strong>{t("Resident models")}</strong><div className="chip-row">{active.models.map((item) => <span key={item}>{t(item)}</span>)}</div></div>
          </div>
        </Panel>
        <Panel icon={AlertTriangle} title="Recent zone alerts">
          <ObjectList rows={active.alerts.map((alert, index) => ({ id: `${active.id}-${index}`, title: alert, meta: active.name, tone: active.status === "Faulty" ? "danger" : active.status === "Degraded" ? "warn" : "good", status: index === 0 && active.status !== "Healthy" ? "Action" : "Logged" }))} />
        </Panel>
      </div>
      <Panel icon={Workflow} title="Runtime deployments">
        <CompactTable
          columns={["Runtime", "Zone", "Assets", "Models", "Status", "Next action"]}
          rows={[
            ["DOOH Edge Runtime 1.8.4", "Corniche Edge Zone", "3", "MediaGPT Sentinel, MediaGPT PoP", "Healthy", "No action"],
            ["DOOH Edge Runtime 1.8.2", "Airport Premium Zone", "2", "MediaGPT Sentinel, MediaGPT Moderator Cache", "Degraded", "Fan PO / thermal inspection"],
            ["DOOH Edge Runtime 1.8.4", "Yas Island Zone", "2", "MediaGPT PoP, MediaGPT Optimizer Cache", "Healthy", "Patch tonight"],
            ["Recovery shell", "Al Ain Gateway Zone", "2", "Threshold rules only", "Faulty", "Dispatch technician"],
          ]}
        />
      </Panel>
    </PageBody>
  );
}

function EdgeGauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="edge-gauge">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

// Client-side export (RFP REP-004): downloads live state, no backend needed.
function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

// Executive reporting + BI (RFP REP-001..007): KPIs computed from live state,
// with CSV/JSON export of the operational datasets.
function ReportsPage({
  submissions,
  bookings,
  invoices,
  popLedger,
  enforcementEvents,
  alerts,
  auctions,
  t,
}: {
  submissions: Submission[];
  bookings: BookingRecord[];
  invoices: InvoiceRecord[];
  popLedger: PopRecord[];
  enforcementEvents: EnforcementEvent[];
  alerts: EmergencyAlert[];
  auctions: AuctionLot[];
  t: (value: string) => string;
}) {
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const revenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const awarded = auctions.filter((a) => a.status === "Awarded").length;
  const fillRate = auctions.length ? Math.round((awarded / auctions.length) * 100) : 0;
  const approvedSubs = submissions.filter((s) => ["Approved", "Scheduled", "Published"].includes(s.stage)).length;
  const complianceRate = submissions.length ? Math.round((approvedSubs / submissions.length) * 100) : 0;
  const commercialPop = popLedger.filter((p) => p.kind === "commercial").length;
  const civicPop = popLedger.filter((p) => p.kind !== "commercial").length;
  const publicShare = popLedger.length ? Math.round((civicPop / popLedger.length) * 100) : 0;
  const blocked = enforcementEvents.filter((e) => e.outcome === "blocked").length;
  const overridden = enforcementEvents.filter((e) => e.outcome === "overridden").length;

  const kpis: Array<{ label: string; value: string; helper: string; tone: Tone }> = [
    { label: "Recognised revenue", value: `AED ${revenue.toLocaleString("en-US")}`, helper: "Paid invoices", tone: "good" },
    { label: "Auction fill rate", value: `${fillRate}%`, helper: `${awarded}/${auctions.length} lots awarded`, tone: fillRate > 50 ? "good" : "warn" },
    { label: "Proof-of-play records", value: String(popLedger.length), helper: "Hash-chained", tone: "info" },
    { label: "Public vs commercial", value: `${publicShare}% / ${100 - publicShare}%`, helper: "Playback split", tone: "neutral" },
    { label: "Compliance rate", value: `${complianceRate}%`, helper: "Approved submissions", tone: complianceRate > 60 ? "good" : "warn" },
    { label: "Rules blocked", value: String(blocked), helper: "Bookings stopped", tone: blocked ? "danger" : "good" },
    { label: "Emergency overrides", value: String(overridden), helper: "Hierarchy applied", tone: "info" },
    { label: "Active alerts", value: String(alerts.filter((a) => a.state !== "Live on network").length), helper: "In the NCEMA lane", tone: "warn" },
  ];

  const reports: Array<{ id: string; title: string; helper: string; rows: () => Array<Record<string, unknown>> }> = [
    { id: "pop", title: "Proof-of-play ledger", helper: "Per-play evidence, hash-chained", rows: () => popLedger.map((p) => ({ seq: p.seq, asset: p.assetId, campaign: p.campaign, kind: p.kind, playedAt: p.playedAt, evidence: p.evidence, hash: p.hash })) },
    { id: "financial", title: "Financial reconciliation", helper: "Bookings and invoices", rows: () => bookings.map((b) => ({ id: b.id, campaign: b.campaign, bidder: b.bidder, amount: b.amount, currency: b.currency, status: b.status, invoice: b.invoiceId ?? "" })) },
    { id: "compliance", title: "Compliance and enforcement", helper: "Rules engine events", rows: () => enforcementEvents.map((e) => ({ id: e.id, at: e.at, stage: e.kind, subject: e.subject, outcome: e.outcome, reasonCodes: e.reasonCodes, actor: e.actor })) },
    { id: "moderation", title: "Content moderation pipeline", helper: "Submissions and stages", rows: () => submissions.map((s) => ({ id: s.id, campaign: s.campaign, bidder: s.bidder, category: s.category, stage: s.stage, version: s.version, approvals: (s.approvals ?? []).map((a) => a.name) })) },
  ];

  return (
    <PageBody>
      <MetricGrid>
        {kpis.slice(0, 4).map((k) => <Metric key={k.label} label={k.label} value={k.value} helper={k.helper} tone={k.tone} />)}
      </MetricGrid>
      <MetricGrid>
        {kpis.slice(4).map((k) => <Metric key={k.label} label={k.label} value={k.value} helper={k.helper} tone={k.tone} />)}
      </MetricGrid>

      <Panel icon={BarChart3} title={t("Regulatory and operational reports")} action={t("Export for CSC, ADMO, MRO, NCEMA")}>
        <div className="table-card">
          <table>
            <thead>
              <tr><th>{t("Report")}</th><th>{t("Rows")}</th><th>{t("Export")}</th></tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const rows = report.rows();
                return (
                  <tr key={report.id}>
                    <td data-label={t("Report")}><strong>{t(report.title)}</strong><span>{t(report.helper)}</span></td>
                    <td data-label={t("Rows")}>{rows.length}</td>
                    <td data-label={t("Export")}>
                      <div className="row-actions">
                        <Button variant="secondary" disabled={!rows.length} onClick={() => downloadFile(`${report.id}-report.csv`, toCsv(rows), "text/csv")}>CSV</Button>
                        <Button variant="secondary" disabled={!rows.length} onClick={() => downloadFile(`${report.id}-report.json`, JSON.stringify(rows, null, 2), "application/json")}>JSON</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="cell-note">{t("Reports respect RBAC and tenant scoping; exports reflect the current live platform state.")}</p>
      </Panel>
    </PageBody>
  );
}

const ALLOCATION_TONE: Record<AssetAllocation["status"], Tone> = {
  Allocated: "info",
  Available: "good",
  "In bidding": "neutral",
  "Under maintenance": "warn",
};
const ALLOCATION_PIN: Record<AssetAllocation["status"], string> = {
  Allocated: "#185fa5",
  Available: "#1f9d57",
  "In bidding": "#7c4ab7",
  "Under maintenance": "#d08400",
};

// Map-based commercial operations dashboard (RFP FIN-601/602/603): per-asset
// markers colour-coded by allocation status, click -> commercial detail panel.
function CommercialMapPage({
  auctions,
  schedule,
  t,
}: {
  auctions: AuctionLot[];
  schedule: ScheduleItem[];
  t: (value: string) => string;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState(estateAssets[0].id);

  const records = useMemo(
    () =>
      estateAssets.map((asset) => {
        const allocation = assetAllocations.find((item) => item.assetId === asset.id);
        const lot = allocation?.lotId ? auctions.find((item) => item.id === allocation.lotId) : undefined;
        return { asset, allocation, lot };
      }),
    [auctions],
  );
  const mapAssets = useMemo(
    () =>
      records.map(({ asset, allocation }) => ({
        id: asset.id,
        name: asset.name,
        zone: asset.zone,
        status: allocation?.status ?? "Available",
        lat: asset.lat,
        lng: asset.lng,
        x: asset.x,
        y: asset.y,
      })),
    [records],
  );
  const selected = records.find((record) => record.asset.id === selectedAssetId) ?? records[0];
  const { asset, allocation, lot } = selected;
  const money = (value: number) => `AED ${value.toLocaleString("en-US")}`;

  const contractedValue = records.reduce((sum, r) => sum + (r.allocation?.annualValueAed ?? 0), 0);
  const allocatedCount = records.filter((r) => r.allocation?.status === "Allocated" || r.allocation?.status === "Under maintenance").length;
  const inBidding = records.filter((r) => r.allocation?.status === "In bidding").length;
  const available = records.filter((r) => (r.allocation?.status ?? "Available") === "Available").length;

  const assetSchedule = schedule.filter((slot) => slot.asset === asset.id);
  const openTickets = tickets.filter((ticket) => ticket.asset === asset.id && ticket.status !== "Resolved").length;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Contracted value" value={money(contractedValue)} helper="Active allocation contracts" tone="good" />
        <Metric label="Allocated assets" value={`${allocatedCount} / ${records.length}`} helper="Long-term operator contracts" tone="info" />
        <Metric label="In bidding" value={String(inBidding)} helper="Live auction lots on assets" tone="neutral" />
        <Metric label="Available now" value={String(available)} helper="Sellable at rate card" tone={available ? "warn" : "good"} />
      </MetricGrid>

      <Panel icon={MapPinned} title={t("Commercial operations map")} action={t("Allocation status by asset")}>
        <LiveMap assets={mapAssets} selectedAssetId={selectedAssetId} onMarkerClick={setSelectedAssetId} openAlarmAssetIds={[]} t={t} />
        <div className="alloc-legend">
          {(Object.keys(ALLOCATION_PIN) as Array<AssetAllocation["status"]>).map((status) => (
            <span key={status}><i style={{ background: ALLOCATION_PIN[status] }} />{t(status)}</span>
          ))}
        </div>

        <div className="linked-detail">
          <div className="linked-detail-head">
            <span className="panel-icon"><HardDrive size={18} /></span>
            <strong>{t(asset.name)}</strong>
            <StatusPill label={allocation?.status ?? "Available"} tone={ALLOCATION_TONE[allocation?.status ?? "Available"]} />
          </div>
          <div className="detail-cards compact">
            <Detail label="Type" value={t(asset.type)} />
            <Detail label="Size" value={asset.size} />
            <Detail label="Resolution" value={asset.resolution} />
            <Detail label="Installed" value={asset.installed} />
            <Detail label="Uptime" value={asset.uptime} />
            <Detail label="Open faults" value={String(openTickets)} />
          </div>

          {allocation?.operator ? (
            <div className="detail-cards compact">
              <Detail label="Operator" value={t(allocation.operator)} />
              <Detail label="Contract" value={allocation.contractRef ?? "-"} />
              <Detail label="Model" value={t(allocation.model ?? "-")} />
              <Detail label="Window" value={`${allocation.effectiveDate ?? "-"} → ${allocation.expiryDate ?? "-"}`} />
              <Detail label="Annual value" value={allocation.annualValueAed ? money(allocation.annualValueAed) : "-"} />
              <Detail label="Revenue to date" value={allocation.revenueToDateAed ? money(allocation.revenueToDateAed) : "-"} />
            </div>
          ) : null}

          <div className="detail-cards compact">
            <Detail label="Rate card / week" value={allocation?.rateCardWeekAed ? money(allocation.rateCardWeekAed) : "-"} />
            <Detail label="Share of voice" value={t(allocation?.shareOfVoice ?? "-")} />
            <Detail label="Public split target" value={allocation?.publicSplitTarget ?? "-"} />
            <Detail label="Public split actual" value={allocation?.publicSplitActual ?? "-"} />
            <Detail label="Audience" value={t(asset.audience)} />
            <Detail label="Proof-of-play" value={asset.pop} />
          </div>

          {lot ? (
            <div className={`twin-detail tone-${lot.status === "Open" ? "degrading" : "fault"}`}>
              <strong>{t("Live auction")}: {t(lot.lotName)}</strong>
              <p>{lot.status === "Open" ? `${t("Leading bid")} ${lot.currency} ${lot.currentBid.toLocaleString("en-US")} (${t(lot.leadingBidder)}) · ${t("floor")} ${lot.currency} ${lot.floorPrice.toLocaleString("en-US")}` : t(lot.closeNote ?? lot.status)}</p>
            </div>
          ) : null}

          {assetSchedule.length ? (
            <CompactTable
              columns={["Time", "Campaign", "State"]}
              rows={assetSchedule.slice(0, 4).map((slot) => [slot.time, slot.campaign, slot.state])}
            />
          ) : (
            <p className="notes">{t("Next slot")}: {t(asset.nextSlot)}</p>
          )}
        </div>
      </Panel>

      <Panel icon={FileText} title={t("Allocation register")} action={t("Long-term contracts per RFP FIN-101")}>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t("Asset")}</th>
                <th>{t("Status")}</th>
                <th>{t("Operator")}</th>
                <th>{t("Contract")}</th>
                <th>{t("Window")}</th>
                <th>{t("Annual value")}</th>
                <th>{t("Permitted categories")}</th>
              </tr>
            </thead>
            <tbody>
              {records.map(({ asset: rowAsset, allocation: rowAlloc }) => (
                <tr key={rowAsset.id} className={rowAsset.id === selectedAssetId ? "selected" : ""} onClick={() => setSelectedAssetId(rowAsset.id)}>
                  <td data-label={t("Asset")}><strong>{t(rowAsset.name)}</strong><span>{rowAsset.id} · {t(rowAsset.zone)}</span></td>
                  <td data-label={t("Status")}><StatusPill label={rowAlloc?.status ?? "Available"} tone={ALLOCATION_TONE[rowAlloc?.status ?? "Available"]} /></td>
                  <td data-label={t("Operator")}>{rowAlloc?.operator ? t(rowAlloc.operator) : "-"}</td>
                  <td data-label={t("Contract")}>{rowAlloc?.contractRef ?? "-"}</td>
                  <td data-label={t("Window")}>{rowAlloc?.effectiveDate ? `${rowAlloc.effectiveDate} → ${rowAlloc.expiryDate ?? "-"}` : "-"}</td>
                  <td data-label={t("Annual value")}>{rowAlloc?.annualValueAed ? money(rowAlloc.annualValueAed) : rowAlloc?.rateCardWeekAed ? `${money(rowAlloc.rateCardWeekAed)} / ${t("week")}` : "-"}</td>
                  <td data-label={t("Permitted categories")}>{rowAlloc?.permittedCategories ? t(rowAlloc.permittedCategories) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageBody>
  );
}

const LOT_TONE: Record<AuctionLotStatus, "info" | "good" | "warn"> = { Open: "info", Awarded: "good", "No fill": "warn" };
const BOOKING_TONE: Record<BookingStatus, "info" | "good" | "warn" | "danger"> = {
  "Awaiting payment": "warn",
  Booked: "good",
  Scheduled: "info",
  Played: "info",
  Billed: "warn",
  Paid: "good",
  Released: "danger",
};

function AuctionDesk({
  auctions,
  bookings,
  invoices,
  onCloseAuction,
  onSettlePayment,
  onReconcile,
  t,
}: {
  auctions: AuctionLot[];
  bookings: BookingRecord[];
  invoices: InvoiceRecord[];
  onCloseAuction: (lotId: string) => void;
  onSettlePayment: (bookingId: string, outcome: "paid" | "failed") => void;
  onReconcile: (bookingId: string, step: "bill" | "settle") => void;
  t: (value: string) => string;
}) {
  const money = (value: number, currency: string) => `${currency} ${value.toLocaleString("en-US")}`;
  return (
    <Panel icon={ShoppingBag} title={t("Auction desk")} action={t("First-price, deterministic, audited")}>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>{t("Lot")}</th>
              <th>{t("Flight window")}</th>
              <th>{t("Floor")}</th>
              <th>{t("Leading bid")}</th>
              <th>{t("Status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((lot) => (
              <tr key={lot.id}>
                <td data-label={t("Lot")}><strong>{t(lot.lotName)}</strong><span>{lot.id} · {t(lot.network)}</span></td>
                <td data-label={t("Flight window")}>{t(lot.flightWindow)}</td>
                <td data-label={t("Floor")}>{money(lot.floorPrice, lot.currency)}</td>
                <td data-label={t("Leading bid")}>
                  {lot.bidCount ? <><strong>{money(lot.currentBid, lot.currency)}</strong><span>{t(lot.leadingBidder)} · {lot.bidCount} {t("bids")}</span></> : t("No bids yet")}
                </td>
                <td data-label={t("Status")}>
                  <StatusPill label={lot.status} tone={LOT_TONE[lot.status]} />
                  {lot.closeNote ? <span className="cell-note">{t(lot.closeNote)}</span> : null}
                </td>
                <td>
                  {lot.status === "Open" ? (
                    <Button onClick={() => onCloseAuction(lot.id)}>{t("Close auction")}</Button>
                  ) : lot.status === "Awarded" && lot.clearingPrice ? (
                    <span className="cell-note">{t("Cleared at")} {money(lot.clearingPrice, lot.currency)}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bookings.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t("Booking")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Status")}</th>
                <th>{t("Pipeline")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td data-label={t("Booking")}><strong>{t(booking.campaign)}</strong><span>{booking.id} · {t(booking.bidder)} · {t(booking.lotName)}</span></td>
                  <td data-label={t("Amount")}>{money(booking.amount, booking.currency)}</td>
                  <td data-label={t("Status")}><StatusPill label={booking.status} tone={BOOKING_TONE[booking.status]} /></td>
                  <td data-label={t("Pipeline")}>
                    {booking.submissionId ? <span className="cell-note">{t("Creative in governed review as")} {booking.submissionId}</span> : booking.status === "Awaiting payment" ? <span className="cell-note">{t("Scheduling locked until payment")}</span> : booking.status === "Released" ? <span className="cell-note">{t("Slot returned to auction")}</span> : null}
                  </td>
                  <td>
                    {booking.status === "Awaiting payment" ? (
                      <div className="row-actions">
                        <Button onClick={() => onSettlePayment(booking.id, "paid")}>{t("Confirm payment")}</Button>
                        <Button variant="secondary" onClick={() => onSettlePayment(booking.id, "failed")}>{t("Simulate failure")}</Button>
                      </div>
                    ) : booking.status === "Played" ? (
                      <Button onClick={() => onReconcile(booking.id, "bill")}>{t("Reconcile against PoP")}</Button>
                    ) : booking.status === "Billed" ? (
                      <Button onClick={() => onReconcile(booking.id, "settle")}>{t("Close settlement")}</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {invoices.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t("Invoice")}</th>
                <th>{t("Net")}</th>
                <th>{t("VAT 5%")}</th>
                <th>{t("Total")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td data-label={t("Invoice")}><strong>{invoice.id}</strong><span>{t(invoice.campaign)} · {t(invoice.bidder)}{invoice.receiptId ? ` · ${t("Receipt")} ${invoice.receiptId}` : ""}</span></td>
                  <td data-label={t("Net")}>{money(invoice.net, invoice.currency)}</td>
                  <td data-label={t("VAT 5%")}>{money(invoice.vat, invoice.currency)}</td>
                  <td data-label={t("Total")}><strong>{money(invoice.total, invoice.currency)}</strong></td>
                  <td data-label={t("Status")}><StatusPill label={invoice.status} tone={invoice.status === "Paid" ? "good" : invoice.status === "Void" ? "danger" : "warn"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

const APPROVALS_PER_PAGE = 10;
const RISK_TONE_MAP: Record<string, Tone> = { Low: "good", Medium: "warn", Elevated: "danger" };
const APPROVAL_STATE_TONE: Record<string, Tone> = { Approved: "good", Rejected: "danger", "On hold": "warn", Pending: "info" };

function BidApprovalsQueue({
  approvals,
  onDecision,
  t,
}: {
  approvals: FinanceApproval[];
  onDecision: (id: string, state: FinanceApproval["state"]) => void;
  t: (value: string) => string;
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = approvals.filter((row) => {
    if (statusFilter !== "All" && row.state !== statusFilter) return false;
    if (riskFilter !== "All" && row.risk !== riskFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!`${row.campaign} ${row.bidder} ${row.packageName}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / APPROVALS_PER_PAGE));
  const current = Math.min(page, pageCount);
  const pageRows = filtered.slice((current - 1) * APPROVALS_PER_PAGE, current * APPROVALS_PER_PAGE);
  const pendingCount = approvals.filter((r) => r.state === "Pending").length;

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [statusFilter, riskFilter, search]);

  return (
    <Panel icon={ShieldCheck} title={t("Bid approvals queue")} action={<StatusPill label={`${pendingCount} ${t("pending")}`} tone={pendingCount ? "warn" : "good"} />}>
      <div className="queue-filters">
        <label>{t("Status")}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {["All", "Pending", "Approved", "On hold", "Rejected"].map((o) => <option key={o} value={o}>{t(o)}</option>)}
          </select>
        </label>
        <label>{t("Risk")}
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            {["All", "Low", "Medium", "Elevated"].map((o) => <option key={o} value={o}>{t(o)}</option>)}
          </select>
        </label>
        <label className="queue-search">{t("Search")}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Campaign or bidder")} />
        </label>
        <span className="queue-count">{filtered.length} {t("of")} {approvals.length}</span>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>{t("Campaign")}</th>
              <th>{t("Bidder")}</th>
              <th>{t("Amount")}</th>
              <th>{t("Margin")}</th>
              <th>{t("Risk")}</th>
              <th>{t("Decision")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id}>
                <td data-label={t("Campaign")}><strong>{t(row.campaign)}</strong><span>{t(row.packageName)}</span></td>
                <td data-label={t("Bidder")}>{t(row.bidder)}</td>
                <td data-label={t("Amount")}>{t(row.amount)}</td>
                <td data-label={t("Margin")}>{row.margin}</td>
                <td data-label={t("Risk")}><StatusPill label={row.risk} tone={RISK_TONE_MAP[row.risk] ?? "warn"} /></td>
                <td data-label={t("Decision")}><StatusPill label={row.state} tone={APPROVAL_STATE_TONE[row.state] ?? "info"} /></td>
                <td>
                  {row.state === "Pending" ? (
                    <div className="row-actions">
                      <Button onClick={() => onDecision(row.id, "Approved")}>{t("Approve")}</Button>
                      <Button variant="secondary" onClick={() => onDecision(row.id, "On hold")}>{t("Hold")}</Button>
                      <Button variant="secondary" onClick={() => onDecision(row.id, "Rejected")}>{t("Reject")}</Button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={() => onDecision(row.id, "Pending")}>{t("Re-open")}</Button>
                  )}
                </td>
              </tr>
            ))}
            {!pageRows.length ? (
              <tr><td colSpan={7}><p className="cell-note">{t("No approvals match the current filters.")}</p></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="pager">
          <Button variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>{t("Previous")}</Button>
          <span>{t("Page")} {current} {t("of")} {pageCount}</span>
          <Button variant="secondary" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>{t("Next")}</Button>
        </div>
      ) : null}
      <CollapsibleIntelligenceCitations
        ruleIds={["RULE-COM-001", "RULE-COM-002", "RULE-COM-003", "RULE-AI-001"]}
        sourceIds={["KB-COM-001", "KB-COM-002", "KB-COM-003", "KB-AI-001"]}
        action="Send finance review"
      />
    </Panel>
  );
}

function FinancialsPage({
  approvals,
  auctions,
  bookings,
  invoices,
  popLedger,
  aiAvailable,
  onDecision,
  onCloseAuction,
  onSettlePayment,
  onReconcile,
  t,
}: {
  approvals: FinanceApproval[];
  auctions: AuctionLot[];
  bookings: BookingRecord[];
  invoices: InvoiceRecord[];
  popLedger: PopRecord[];
  aiAvailable: boolean;
  onDecision: (id: string, state: FinanceApproval["state"]) => void;
  onCloseAuction: (lotId: string) => void;
  onSettlePayment: (bookingId: string, outcome: "paid" | "failed") => void;
  onReconcile: (bookingId: string, step: "bill" | "settle") => void;
  t: (value: string) => string;
}) {
  const [budget, setBudget] = useState(420);
  const [demand, setDemand] = useState(68);
  const [discount, setDiscount] = useState(8);
  const [yieldNote, setYieldNote] = useState<{ explanation: string; adjustment: string; source?: string } | null>(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState<{ summary: string; source?: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [chainStatus, setChainStatus] = useState<{ valid: boolean; length: number; brokenAt: string | null; verifiedAt: string } | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  async function verifyChain() {
    setChainLoading(true);
    try {
      const response = await fetch("/api/dooh/pop/verify");
      setChainStatus(await response.json());
    } catch {
      setChainStatus(null);
    }
    setChainLoading(false);
  }
  const projectedRevenue = Math.round(budget * (0.72 + demand / 180) * (1 - discount / 100));

  async function explainScenario() {
    setYieldLoading(true);
    const result = await aiExplainYield({ budget, demand, discount, computedTarget: projectedRevenue });
    setYieldNote({ explanation: result.explanation, adjustment: result.adjustment, source: result.source });
    setYieldLoading(false);
  }

  async function summarizeProofAndFinance() {
    setReportLoading(true);
    const result = await aiSummarizeReport({ scope: "proof-of-play settlement controls and financial approvals" });
    setReportSummary({ summary: result.summary, source: result.source });
    setReportLoading(false);
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Booked revenue" value="AED 18.4M" helper="Current quarter" tone="good" />
        <Metric label="Budget consumed" value="62%" helper="Against civic and commercial targets" tone="info" />
        <Metric label="Receivables" value="AED 3.1M" helper="Open invoices" tone="warn" />
        <Metric label="Pending approvals" value={String(approvals.filter((a) => a.state === "Pending").length)} helper="Finance sign-off" tone={approvals.filter((a) => a.state === "Pending").length ? "warn" : "good"} />
      </MetricGrid>

      <BidApprovalsQueue approvals={approvals} onDecision={onDecision} t={t} />

      <AuctionDesk auctions={auctions} bookings={bookings} invoices={invoices} onCloseAuction={onCloseAuction} onSettlePayment={onSettlePayment} onReconcile={onReconcile} t={t} />

      <div className="split-grid wide-left">
        <Panel icon={CircleDollarSign} title="Budget and revenue breakdown">
          <CompactTable
            columns={["Segment", "Budget", "Actual", "Variance"]}
            rows={[
              ["Civic allocation", "AED 7.2M", "AED 6.8M", "-6%"],
              ["Commercial premium", "AED 11.4M", "AED 12.1M", "+6%"],
              ["Emergency reserve", "AED 1.8M", "AED 0.6M", "+67% remaining"],
              ["Maintenance reserve", "AED 2.6M", "AED 2.1M", "+19% remaining"],
            ]}
          />
        </Panel>
        <Panel icon={Gauge} title="Bid scenario">
          <div className="scenario-form">
            <Range label="Campaign budget" value={budget} suffix="k AED" min={100} max={900} onChange={setBudget} />
            <Range label="Demand pressure" value={demand} suffix="%" min={20} max={100} onChange={setDemand} />
            <Range label="Strategic discount" value={discount} suffix="%" min={0} max={30} onChange={setDiscount} />
            <div className="scenario-result">
              <span>{t("Recommended target")}</span>
              <strong>{langMoney(projectedRevenue, t)}</strong>
            </div>
          </div>
          <ActionRow>
            <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || yieldLoading} onClick={explainScenario}>{yieldLoading ? t("Explaining") : t("Explain yield")}</Button>
          </ActionRow>
          {yieldNote ? (
            <section className="ai-mini-panel">
              <div>
                <span>{t("MediaGPT yield explanation")}</span>
                <strong>{yieldNote.explanation}</strong>
                <small>{yieldNote.adjustment}</small>
              </div>
              <StatusPill label={yieldNote.source === "openai" ? "OpenAI" : "Offline"} tone={yieldNote.source === "openai" ? "good" : "warn"} />
            </section>
          ) : null}
          <CollapsibleIntelligenceCitations
            ruleIds={["RULE-COM-001", "RULE-COM-004", "RULE-AI-001"]}
            sourceIds={["KB-COM-001", "KB-COM-004", "KB-AI-001"]}
            action="Regenerate scenario"
          />
        </Panel>
      </div>

      <Panel icon={WalletCards} title={t("Rate card overrides")}>
        <CompactTable
          columns={["Package", "Base rate", "Override", "Approver", "Expiry"]}
          rows={[
            ["Airport and premium roadside", "AED 32 CPM", "AED 28 CPM", "Finance director", "Jul 31, 2026"],
            ["Downtown retail loop", "AED 24 CPM", "-", "-", "-"],
            ["Civic emergency lane", "Non-billed", "Non-billed", "Policy", "Standing"],
            ["Yas leisure loop", "AED 26 CPM", "AED 24 CPM", "Finance director", "Aug 15, 2026"],
          ]}
        />
        <CollapsibleIntelligenceCitations
          ruleIds={["RULE-COM-001", "RULE-COM-002"]}
          sourceIds={["KB-COM-001", "KB-COM-002"]}
          action="Adjust schedule"
        />
      </Panel>

      <Panel icon={FileCheck2} title="Proof-of-play settlement controls" action={popLedger.length ? `${popLedger.length} ${t("signed records")}` : undefined}>
        <ActionRow>
          <Button icon={Sparkles} variant="secondary" disabled={!aiAvailable || reportLoading} onClick={summarizeProofAndFinance}>{reportLoading ? t("Summarizing") : t("Summarize report")}</Button>
          <Button variant="secondary" disabled={chainLoading} onClick={verifyChain}>{chainLoading ? t("Verifying chain") : t("Verify hash chain")}</Button>
          {chainStatus ? (
            <StatusPill
              label={chainStatus.valid ? `${t("Chain verified")} (${chainStatus.length})` : `${t("Chain broken at")} ${chainStatus.brokenAt}`}
              tone={chainStatus.valid ? "good" : "danger"}
            />
          ) : null}
        </ActionRow>
        {reportSummary ? (
          <section className="ai-mini-panel">
            <div>
              <span>{t("MediaGPT report summary")}</span>
              <strong>{reportSummary.summary}</strong>
            </div>
            <StatusPill label={reportSummary.source === "openai" ? "OpenAI" : "Offline"} tone={reportSummary.source === "openai" ? "good" : "warn"} />
          </section>
        ) : null}
        {popLedger.length ? (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>{t("Seq")}</th>
                  <th>{t("Asset")}</th>
                  <th>{t("Campaign")}</th>
                  <th>{t("Kind")}</th>
                  <th>{t("Played at")}</th>
                  <th>{t("Evidence")}</th>
                  <th>{t("Hash")}</th>
                </tr>
              </thead>
              <tbody>
                {[...popLedger].reverse().slice(0, 8).map((record) => (
                  <tr key={record.id}>
                    <td data-label={t("Seq")}>#{record.seq}</td>
                    <td data-label={t("Asset")}>{record.assetId}</td>
                    <td data-label={t("Campaign")}><strong>{t(record.campaign)}</strong>{record.bookingId ? <span>{record.bookingId}</span> : null}</td>
                    <td data-label={t("Kind")}><StatusPill label={record.kind} tone={record.kind === "emergency" ? "danger" : record.kind === "commercial" ? "info" : "good"} /></td>
                    <td data-label={t("Played at")}>{record.playedAt.replace("T", " ").slice(0, 16)}</td>
                    <td data-label={t("Evidence")}><span className="cell-note">{t(record.evidence)}</span></td>
                    <td data-label={t("Hash")}><code className="hash-chip" title={record.hash}>{record.hash.slice(0, 10)}…</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CompactTable
            columns={["Campaign", "Proof coverage", "Exception", "Settlement state"]}
            rows={[
              ["Weekend mall offer", "99.7%", "None", "Ready to settle"],
              ["Yas summer promotion", "97.0%", "AD-BUS-022 missing signed event", "Make-good recommended"],
              ["Airport retail launch", "Pending", "Not yet published", "Not started"],
            ]}
          />
        )}
        <CollapsibleIntelligenceCitations
          ruleIds={["RULE-POP-001", "RULE-POP-002", "RULE-AI-001"]}
          sourceIds={["KB-POP-001", "KB-POP-002", "KB-AI-001"]}
          action="Offer make-good"
        />
      </Panel>
    </PageBody>
  );
}

function CampaignsPage({
  campaigns,
  bidderMessages,
  submissions,
  onNewBrief,
  onResubmit,
  t,
}: {
  campaigns: BidderCampaign[];
  bidderMessages: BidderCommunication[];
  submissions: Submission[];
  onNewBrief: () => void;
  onResubmit: (id: string, payload: { notes?: string; message?: string }) => void;
  t: (value: string) => string;
}) {
  const messagesByCampaign = new Map(bidderMessages.map((message) => [message.campaign, message]));
  const revisionCount = campaigns.filter((item) => item.status === "Changes requested").length;
  const [messageNotice, setMessageNotice] = useState("");
  const actionMessages = campaigns
    .map((campaign) => {
      const communication = messagesByCampaign.get(campaign.campaign);
      const message = campaign.revisionMessage ?? communication?.message;
      return message ? { campaign, message } : null;
    })
    .filter(Boolean) as Array<{ campaign: BidderCampaign; message: string }>;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Campaigns" value={String(campaigns.length)} helper="Bidder workspace" tone="info" />
        <Metric label="Needs revision" value={String(revisionCount)} helper="ADMO messages" tone={revisionCount ? "warn" : "good"} />
        <Metric label="Live or published" value={String(campaigns.filter((item) => item.status === "Published").length)} helper="On network" tone="good" />
        <Metric label="In review" value={String(campaigns.filter((item) => item.status === "Submitted" || item.status === "In review").length)} helper="ADMO action" tone="warn" />
      </MetricGrid>
      {actionMessages.length ? (
        <Panel icon={Bell} title="ADMO messages" action={`${actionMessages.length} ${t("action required")}`}>
          <div className="bidder-message-queue">
            {actionMessages.map(({ campaign, message }) => (
              <article key={campaign.id}>
                <div>
                  <strong>{t(campaign.campaign)}</strong>
                  <p>{message}</p>
                  <small>{campaign.revisionFrom ? `${t("From")}: ${t(campaign.revisionFrom)}` : t("From ADMO CMS")}</small>
                </div>
                <div className="row-actions">
                  <Button variant="secondary" icon={Eye} onClick={() => setMessageNotice(`${t("Opened request")}: ${t(campaign.campaign)}`)}>{t("Review request")}</Button>
                  <Button
                    icon={Upload}
                    onClick={() => {
                      const submission = submissions.find((item) => item.campaign === campaign.campaign);
                      if (!submission) { setMessageNotice(`${t("Revision staged")}: ${t(campaign.campaign)}`); return; }
                      onResubmit(submission.id, {
                        notes: `Revised pack v${(submission.version ?? 1) + 1}: addressed ADMO review notes, enlarged CTA, Arabic and English aligned.`,
                        message: "Revised creative pack uploaded per ADMO review notes.",
                      });
                    }}
                  >{t("Upload revision")}</Button>
                </div>
              </article>
            ))}
          </div>
          {messageNotice ? <p className="media-notice">{messageNotice}</p> : null}
        </Panel>
      ) : null}
      <Panel
        icon={Megaphone}
        title={t("Campaigns")}
        action={<Button icon={FileText} onClick={onNewBrief}>{t("New campaign brief")}</Button>}
      >
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t("Campaign")}</th>
                <th>{t("Package")}</th>
                <th>{t("Budget")}</th>
                <th>{t("Status")}</th>
                <th>{t("Next step")}</th>
                <th>{t("ADMO message")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const communication = messagesByCampaign.get(campaign.campaign);
                const message = campaign.revisionMessage ?? communication?.message;
                return (
                  <tr key={campaign.id}>
                    <td data-label={t("Campaign")}><strong>{t(campaign.campaign)}</strong><span>{t(campaign.reach)}</span></td>
                    <td data-label={t("Package")}>{t(campaign.packageName)}</td>
                    <td data-label={t("Budget")}>{t(campaign.budget)}</td>
                    <td data-label={t("Status")}><StatusPill label={campaign.status} tone={campaignStatusTone(campaign.status)} /></td>
                    <td data-label={t("Next step")}>{t(campaign.nextStep)}</td>
                    <td data-label={t("ADMO message")}>
                      {message ? (
                        <div className="campaign-message">
                          <strong>{t("Action required")}</strong>
                          <p>{message}</p>
                          <small>
                            {campaign.revisionFrom ? `${t("From")}: ${t(campaign.revisionFrom)}` : t("From ADMO CMS")}
                            {campaign.revisionRequestedAt ? ` | ${campaign.revisionRequestedAt}` : ""}
                          </small>
                        </div>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageBody>
  );
}


function MarketplacePage({
  onSubmit,
  onBid,
  auctions,
  bookings,
  invoices,
  onNewBrief,
  t,
}: {
  onSubmit: (payload: { campaign: string; packageName: string; budget: string; creativeId: string; creativeUrl?: string }) => void;
  onBid: (payload: { lotId: string; amount: number; campaign: string }) => void;
  auctions: AuctionLot[];
  bookings: BookingRecord[];
  invoices: InvoiceRecord[];
  onNewBrief: () => void;
  t: (value: string) => string;
}) {
  const [selected, setSelected] = useState(marketplacePackages[0]);
  const [campaign, setCampaign] = useState("Airport retail launch");
  const [budget, setBudget] = useState("AED 420,000");
  const [mode, setMode] = useState<"auction" | "fixed">("auction");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeName, setCreativeName] = useState("");
  const creativeRef = useRef<HTMLInputElement | null>(null);

  function onCreativeFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setCreativeName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCreativeUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!creativeUrl) return;
    onSubmit({ campaign, packageName: selected.name, budget, creativeId: selected.creativeId, creativeUrl });
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Open auctions" value={String(auctions.length)} helper="Live inventory lots" tone="info" />
        <Metric
          label="Highest bid"
          value={`AED ${Math.max(...auctions.map((a) => a.currentBid)).toLocaleString("en-US")}`}
          helper="Across current lots"
          tone="good"
        />
        <Metric
          label="Total bids"
          value={String(auctions.reduce((sum, a) => sum + a.bidCount, 0))}
          helper="This bidding cycle"
          tone="neutral"
        />
        <Metric label="Fixed-rate packages" value={String(marketplacePackages.length)} helper="Buy without bidding" tone="warn" />
      </MetricGrid>

      <div className="marketplace-toolbar">
        <div className="segmented-tabs">
          <button type="button" className={mode === "auction" ? "active" : ""} onClick={() => setMode("auction")}>
            {t("Open auctions")}
          </button>
          <button type="button" className={mode === "fixed" ? "active" : ""} onClick={() => setMode("fixed")}>
            {t("Fixed-rate packages")}
          </button>
        </div>
        <Button icon={FileText} onClick={onNewBrief}>{t("New campaign brief")}</Button>
      </div>


      {mode === "auction" ? (
        <>
        <Panel icon={ShoppingBag} title={t("Open auctions")}>
          <div className="auction-grid">
            {auctions.map((lot) => (
              <AuctionCard key={lot.id} lot={lot} onBid={onBid} t={t} />
            ))}
          </div>
        </Panel>
        {bookings.length ? (
          <Panel icon={FileText} title={t("My bookings and invoices")} action={t("Booked to Paid, reconciled against proof-of-play")}>
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>{t("Booking")}</th>
                    <th>{t("Amount")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Invoice")}</th>
                    <th>{t("Next step")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const invoice = invoices.find((item) => item.id === booking.invoiceId);
                    return (
                      <tr key={booking.id}>
                        <td data-label={t("Booking")}><strong>{t(booking.campaign)}</strong><span>{booking.id} · {t(booking.lotName)}</span></td>
                        <td data-label={t("Amount")}>{booking.currency} {booking.amount.toLocaleString("en-US")}</td>
                        <td data-label={t("Status")}><StatusPill label={booking.status} tone={BOOKING_TONE[booking.status]} /></td>
                        <td data-label={t("Invoice")}>{invoice ? <><strong>{invoice.id}</strong><span>{invoice.currency} {invoice.total.toLocaleString("en-US")} · {t(invoice.status)}{invoice.receiptId ? ` · ${invoice.receiptId}` : ""}</span></> : "-"}</td>
                        <td data-label={t("Next step")}>
                          <span className="cell-note">
                            {booking.status === "Awaiting payment" ? t("Pay the invoice to unlock scheduling")
                              : booking.status === "Released" ? t("Slot returned to auction")
                              : booking.status === "Scheduled" ? t("Scheduled for playout")
                              : booking.status === "Played" ? t("Played, awaiting PoP reconciliation")
                              : booking.status === "Billed" ? t("Delivery reconciled, settlement closing")
                              : booking.status === "Paid" ? t("Settled and revenue recognised")
                              : booking.submissionId ? `${t("Creative in governed review as")} ${booking.submissionId}`
                              : t("Awaiting playout")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}
        </>
      ) : (
        <Panel icon={ShoppingBag} title={t("Fixed-rate packages")}>
            <div className="package-grid">
              {marketplacePackages.map((item) => (
                <button key={item.id} className={selected.id === item.id ? "selected" : ""} type="button" onClick={() => setSelected(item)}>
                  <div className="creative-frame" style={{ backgroundImage: `url("${creativeBackground(item.creativeId)}")` }} />
                  <strong>{t(item.name)}</strong>
                  <span>{t(item.reach)}</span>
                  <small>{t(item.assets)}</small>
                  <em>{t(item.price)}</em>
                </button>
              ))}
            </div>
          <LinkedDetail icon={FileText} title={t("Submit campaign")} action={<span className="head-meta">{t(selected.name)}</span>}>
            <form className="stack-form" onSubmit={submit}>
              <label>
                {t("Campaign name")}
                <input value={t(campaign)} onChange={(event) => setCampaign(event.target.value)} />
              </label>
              <label>
                {t("Package")}
                <input value={t(selected.name)} readOnly />
              </label>
              <label>
                {t("Budget target")}
                <input value={t(budget)} onChange={(event) => setBudget(event.target.value)} />
              </label>
              <label>
                {t("Your creative")}
                <input ref={creativeRef} type="file" accept="image/*,video/*" hidden onChange={(event) => onCreativeFile(event.target.files)} />
                <button type="button" className="creative-upload-btn" onClick={() => creativeRef.current?.click()}>
                  <Upload size={15} /> {creativeName ? creativeName : t("Upload your creative (Arabic + English)")}
                </button>
              </label>
              {creativeUrl ? (
                <div className="marketplace-creative-preview">
                  <div className="creative-frame" style={{ backgroundImage: `url("${creativeUrl}")` }} />
                  <small className="cell-note">{t("Your creative will be reviewed by MediaGPT and ADMO before it can run.")}</small>
                </div>
              ) : null}
              <Button type="submit" disabled={!creativeUrl}>{t("Submit campaign")}</Button>
            </form>
          </LinkedDetail>
        </Panel>
      )}
    </PageBody>
  );
}

function AuctionCard({
  lot,
  onBid,
  t,
}: {
  lot: AuctionLot;
  onBid: (payload: { lotId: string; amount: number; campaign: string }) => void;
  t: (value: string) => string;
}) {
  const minNext = lot.currentBid + lot.minIncrement;
  const [amount, setAmount] = useState<number>(minNext);
  const [campaign, setCampaign] = useState(`Bid on ${lot.lotName}`);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (amount < minNext) {
      setError(`${t("Minimum bid")}: ${lot.currency} ${minNext.toLocaleString("en-US")}`);
      return;
    }
    setError("");
    onBid({ lotId: lot.id, amount, campaign });
  }

  return (
    <form className="auction-card" onSubmit={submit}>
      <div className="auction-card-head">
        <div className="creative-frame" style={{ backgroundImage: `url("${creativeBackground(lot.creativeId)}")` }} />
        <div>
          <strong>{t(lot.lotName)}</strong>
          <span>{t(lot.network)}</span>
          <small>{t(lot.flightWindow)} | {t(lot.impressions)}</small>
        </div>
      </div>
      <div className="auction-stats">
        <div>
          <span>{t("Current bid")}</span>
          <strong>{lot.currency} {lot.currentBid.toLocaleString("en-US")}</strong>
          <small>{t("Leading")}: {t(lot.leadingBidder)}</small>
        </div>
        <div>
          <span>{t("Floor")}</span>
          <strong>{lot.currency} {lot.floorPrice.toLocaleString("en-US")}</strong>
          <small>{lot.bidCount} {t("bids")}</small>
        </div>
        <div>
          <span>{t("Closes")}</span>
          <strong>{t(lot.closesAt)}</strong>
          <small>{t("Min increment")}: {lot.currency} {lot.minIncrement.toLocaleString("en-US")}</small>
        </div>
      </div>
      {lot.status === "Open" ? (
        <div className="auction-form">
          <label>
            {t("Campaign name")}
            <input value={t(campaign)} onChange={(event) => setCampaign(event.target.value)} />
          </label>
          <label>
            {t("Your bid")} ({lot.currency})
            <input
              type="number"
              min={minNext}
              step={lot.minIncrement}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </label>
          <Button type="submit">{t("Place bid")}</Button>
        </div>
      ) : (
        <div className="auction-closed">
          <StatusPill label={lot.status} tone={LOT_TONE[lot.status]} />
          <p>{lot.closeNote ? t(lot.closeNote) : lot.status === "Awarded" ? `${t("Awarded to")} ${t(lot.awardedTo ?? "")}` : t("Closed with no fill")}</p>
        </div>
      )}
      {error ? <p className="auction-error">{error}</p> : null}
    </form>
  );
}

type ChatMessage = {
  role: "user" | "assistant";
  body: string;
  table?: string[][];
  chart?: ChatAnswer["chart"];
  actions?: string[];
  source?: string;
  toolTrace?: AgentToolTrace[];
  proposedActions?: PendingAgentAction[];
};

function MediaGptChatbot({ profile, t }: { profile: Profile; t: (value: string) => string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAgentAction[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", body: "Ask about assets, schedules, submissions, financials or emergencies. Large outputs expand here." },
  ]);

  useEffect(() => {
    if (!open) return;
    void refreshPendingActions();
  }, [open]);

  async function refreshPendingActions() {
    const result = await aiListAgentActions("pending");
    if ("actions" in result && Array.isArray(result.actions)) setPendingActions(result.actions);
  }

  async function ask(text?: string) {
    const nextQuery = (text ?? query).trim();
    if (!nextQuery) return;
    setQuery("");
    setLoading(true);
    setMessages((items) => [...items, { role: "user", body: nextQuery }]);
    const result = await aiRunMediaGPTAgent({
      message: nextQuery,
      role: profile.id,
      actor: profile.name,
    });
    const fallback = buildMediaGptResponse(nextQuery);
    const richAnswer = shouldRequestRichAnswer(nextQuery)
      ? await aiAskMediaGPT({
          query: nextQuery,
          locale: isArabicInterface(t) ? "ar" : "en",
          history: messages.slice(-6).map((message) => ({ role: message.role, body: message.body })),
        })
      : null;
    const response: ChatMessage = result.source === "offline"
      ? { ...fallback, source: "offline" }
      : {
          role: "assistant" as const,
          body: result.reply,
          table: richAnswer?.table,
          chart: richAnswer?.chart,
          actions: richAnswer?.suggestedActions,
          toolTrace: result.toolTrace,
          proposedActions: result.proposedActions,
          source: result.source,
        };
    setMessages((items) => [...items, response]);
    if (response.proposedActions?.length) setPendingActions((items) => mergeActions(response.proposedActions || [], items));
    setExpanded(Boolean(response.table || response.chart || response.proposedActions?.length));
    setLoading(false);
  }

  async function decideAction(action: PendingAgentAction, decision: "approve" | "reject") {
    const result = decision === "approve"
      ? await aiApproveAgentAction({ id: action.id, actor: profile.name, role: profile.id })
      : await aiRejectAgentAction({ id: action.id, actor: profile.name, role: profile.id, reason: "Rejected from MediaGPT chat" });
    if ("action" in result) {
      const next = result.action;
      setPendingActions((items) => items.map((item) => item.id === next.id ? next : item).filter((item) => item.status === "pending"));
      setMessages((items) => items.map((message) => ({
        ...message,
        proposedActions: message.proposedActions?.map((item) => item.id === next.id ? next : item),
      })));
    }
  }

  if (!open) {
    return (
      <button className="chat-fab" type="button" onClick={() => setOpen(true)}>
        <Bot size={22} />
        MediaGPT
      </button>
    );
  }

  // Figma "Chat Floating": contextual prompt hints shown on a fresh thread,
  // each firing a real MediaGPT capability.
  const chatHints = [
    "Draft a maintenance ticket for AD-HWY-009 with high severity.",
    "Generate a shift handover summary.",
    "Which assets are offline or need attention right now?",
  ];

  return (
    <section className={`chat-panel ${expanded ? "expanded" : ""}`} aria-label="MediaGPT">
      <header>
        <div className="chat-title">
          <strong>{t("New Chat")}</strong>
          <ChevronDown size={15} />
        </div>
        <div className="chat-head-actions">
          <button type="button" className="chat-icon-btn" onClick={() => { setMessages((items) => items.slice(0, 1)); setQuery(""); }} aria-label={t("New dialog")} title={t("New dialog")}><Plus size={16} /></button>
          <button type="button" className="chat-icon-btn" onClick={() => setOpen(false)} aria-label={t("Close")} title={t("Close")}><X size={16} /></button>
        </div>
      </header>
      <div className="chat-log">
        {messages.length <= 1 ? (
          <div className="chat-hints">
            {chatHints.map((hint) => (
              <button key={hint} type="button" onClick={() => ask(hint)} disabled={loading}>
                <CornerDownRight size={14} /> {t(hint)}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role}>
            {message.role === "assistant" && message.source === "openai" ? (
              <small className="chat-source live">{t("Live AI")}</small>
            ) : null}
            {message.role === "assistant" ? <MarkdownLite text={t(message.body)} /> : <p>{t(message.body)}</p>}
            {message.table ? (
              <table>
                <tbody>
                  {message.table.map((row) => (
                    <tr key={row.join("-")}>{row.map((cell) => <td key={cell}>{t(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {message.chart ? <ChatChart chart={message.chart} /> : null}
            {message.actions?.length ? (
              <div className="chat-suggestions">
                {message.actions.map((action) => <span key={action}>{t(action)}</span>)}
              </div>
            ) : null}
            {message.toolTrace?.length ? <ToolTrace trace={message.toolTrace} t={t} /> : null}
            {message.proposedActions?.length ? (
              <div className="agent-action-list">
                {message.proposedActions.map((action) => (
                  <AgentActionCard key={action.id} action={action} onApprove={() => decideAction(action, "approve")} onReject={() => decideAction(action, "reject")} t={t} />
                ))}
              </div>
            ) : null}
            {message.source === "offline" ? <small className="chat-source">{t("Offline fallback")}</small> : null}
          </article>
        ))}
        {loading ? (
          <article className="assistant">
            <p>{t("MediaGPT is thinking")}</p>
          </article>
        ) : null}
      </div>
      <footer>
        <div className="chat-input-area">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Ask MediaGPT anything, or type @ to mention")} onKeyDown={(event) => event.key === "Enter" && !loading && ask()} />
          <div className="chat-function-bar">
            <small>MediaGPT</small>
            <button type="button" className="chat-send" onClick={() => ask()} disabled={loading} aria-label={t("Send")} title={t("Send")}><Send size={15} /></button>
          </div>
        </div>
      </footer>
      {pendingActions.length ? (
        <details className="approval-inbox" open={expanded}>
          <summary>{t("Pending MediaGPT approvals")} <span>{pendingActions.length}</span></summary>
          <div className="agent-action-list">
            {pendingActions.map((action) => (
              <AgentActionCard key={action.id} action={action} onApprove={() => decideAction(action, "approve")} onReject={() => decideAction(action, "reject")} t={t} />
            ))}
          </div>
        </details>
      ) : null}
      <div className="chat-actions">
        <button type="button">{t("Save output")}</button>
        <button type="button">{t("Export")}</button>
      </div>
    </section>
  );
}

function ToolTrace({ trace, t }: { trace: AgentToolTrace[]; t: (value: string) => string }) {
  return (
    <div className="tool-trace">
      {trace.map((item, index) => (
        <span key={`${item.tool}-${index}`} className={`tool-trace-item ${item.kind}`}>
          {t(item.tool)} | {t(item.status)}
        </span>
      ))}
    </div>
  );
}

function AgentActionCard({
  action,
  onApprove,
  onReject,
  t,
}: {
  action: PendingAgentAction;
  onApprove: () => void;
  onReject: () => void;
  t: (value: string) => string;
}) {
  return (
    <article className={`agent-action-card status-${action.status}`}>
      <div>
        <span>{t("Approval required")}</span>
        <strong>{t(action.preview)}</strong>
        <small>{action.tool} | {action.id}</small>
      </div>
      {action.status === "pending" ? (
        <div className="agent-action-buttons">
          <button type="button" onClick={onReject}>{t("Reject")}</button>
          <button type="button" onClick={onApprove}>{t("Approve")}</button>
        </div>
      ) : (
        <StatusPill label={action.status} tone={action.status === "executed" ? "good" : "warn"} />
      )}
    </article>
  );
}

function shouldRequestRichAnswer(query: string) {
  return /chart|graph|barplot|plot|trend|month|monthly|table|dashboard|revenue|financial|compare|breakdown/i.test(query);
}

// Render the model's lightweight markdown (headings, bold, bullet/numbered
// lists) as clean structured content instead of raw #, * and - characters.
function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushPara = (key: string) => {
    if (para.length) { blocks.push(<p key={key}>{renderInlineMarkdown(para.join(" "))}</p>); para = []; }
  };
  const flushList = (key: string) => {
    if (list.length) {
      blocks.push(<ul key={key} className="chat-md-list">{list.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) { flushPara(`p${index}`); flushList(`l${index}`); return; }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) { flushPara(`p${index}`); flushList(`l${index}`); blocks.push(<h4 key={`h${index}`} className="chat-md-head">{renderInlineMarkdown(heading[1])}</h4>); return; }
    const item = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (item) { flushPara(`p${index}`); list.push(item[1]); return; }
    flushList(`l${index}`); para.push(line);
  });
  flushPara("pend"); flushList("lend");
  return <div className="chat-md">{blocks}</div>;
}

function mergeActions(next: PendingAgentAction[], existing: PendingAgentAction[]) {
  const byId = new Map(existing.map((action) => [action.id, action]));
  next.forEach((action) => byId.set(action.id, action));
  return Array.from(byId.values()).filter((action) => action.status === "pending");
}

function buildMediaGptResponse(query: string): { role: "assistant"; body: string; table?: string[][] } {
  const normalized = query.toLowerCase();
  const asksEmergency = /emergency|alert|alarm|sla|criticality|zone|fault|faulty|طوارئ|تنبيه|إنذار|انذار|منطقة|عطل|أعطال/.test(normalized);
  const asksFinance = /financial|finance|budget|bid|margin|revenue|cost|مال|مالية|ميزانية|عرض|هامش|إيراد/.test(normalized);
  const asksCampaign = normalized.includes("table") || normalized.includes("campaign") || normalized.includes("submission") || /حملة|حملات|طلب|طلبات|جدول/.test(query);
  if (asksEmergency) {
    return {
      role: "assistant",
      body: "Open alarm summary by zone. Industrial Zone and Al Ain need the operations team first.",
      table: [
        ["Zone", "Open alarms", "Status", "Action"],
        ["Industrial Zone", "1", "Attention", "Dispatch field technician"],
        ["Al Ain", "1", "Offline", "Re-route emergency content"],
        ["Abu Dhabi City", "0", "Healthy", "No action"],
      ],
    };
  }
  if (asksFinance) {
    return {
      role: "assistant",
      body: "Financial scenario from current demand and bid pressure.",
      table: [
        ["Recommended bid", "Expected margin", "Budget guardrail"],
        ["AED 447,000", "31%", "Do not exceed AED 465,000"],
      ],
    };
  }
  if (asksCampaign) {
    return {
      role: "assistant",
      body: "Here is the current campaign workflow view.",
      table: [
        ["Campaign", "Stage", "Owner"],
        ["Airport retail launch", "In review", "ADMO CMS"],
        ["Yas summer promotion", "Approved", "ADMO CMS"],
        ["National observance takeover", "Submitted", "ADMO"],
      ],
    };
  }
  return { role: "assistant", body: "The estate is mostly healthy: 3 of 5 assets are live, one is under maintenance, and one is offline." };
}

function ChatChart({ chart }: { chart: ChatAnswer["chart"] }) {
  if (!chart?.data?.length || !chart.xKey || !chart.yKey) return null;
  const data = chart.data.map((item) => ({
    ...item,
    [chart.yKey]: typeof item[chart.yKey] === "number" ? item[chart.yKey] : Number(String(item[chart.yKey]).replace(/[^0-9.-]/g, "")) || 0,
  }));
  const formatter = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? `AED ${numeric.toLocaleString("en-US")}` : String(value);
  };

  return (
    <div className="chat-chart" aria-label={chart.title}>
      <strong>{chart.title}</strong>
      <ResponsiveContainer width="100%" height={210}>
        {chart.type === "line" ? (
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 2 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={formatter} />
            <Line type="monotone" dataKey={chart.yKey} stroke="#214f3f" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 2 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={formatter} />
            <Bar dataKey={chart.yKey} fill="#214f3f" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function PageBody({ children }: { children: ReactNode }) {
  return <div className="page-body">{children}</div>;
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="metric-grid">{children}</section>;
}

function Metric({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: Tone }) {
  const t = useT();
  return (
    <article className={`metric tone-${tone}`}>
      <span>{t(label)}</span>
      <strong>{t(value)}</strong>
      <small>{t(helper)}</small>
    </article>
  );
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <span className="panel-icon"><Icon size={18} /></span>
          <h2>{t(title)}</h2>
        </div>
        {action ? <div className="panel-action">{translateNode(action, t)}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Button({
  children,
  icon: Icon,
  variant = "primary",
  ...props
}: {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = useT();
  return (
    <button className={`button ${variant}`} type={props.type ?? "button"} {...props}>
      {Icon ? <Icon size={16} /> : null}
      {translateNode(children, t)}
    </button>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return <div className="action-row">{children}</div>;
}

// One-box pattern for dependent list->detail blocks: the detail renders inside
// the same panel as its source list, below a divider, instead of a sibling box.
function LinkedDetail({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="linked-detail">
      <div className="linked-detail-head">
        <span className="panel-icon"><Icon size={18} /></span>
        <strong>{title}</strong>
        {action ? <div className="panel-action-row">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const t = useT();
  return <span className={`status-pill tone-${tone}`}>{t(label)}</span>;
}

function StageTracker({ stage }: { stage: SubmissionStage }) {
  const t = useT();
  const current = lifecycleIndex(stage);
  return (
    <ol className="lifecycle-strip" aria-label={t("Content lifecycle")}>
      {lifecycleStages.map((item, index) => {
        const state = index < current ? "done" : index === current ? "active" : "pending";
        return (
          <li key={item} className={`lifecycle-step ${state}`}>
            <span className="lifecycle-num">{index + 1}</span>
            <span className="lifecycle-label">{t(item)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="segmented">
      {items.map((item) => (
        <button key={item.id} className={value === item.id ? "active" : ""} type="button" onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const t = useT();
  return (
    <div className="detail">
      <span>{t(label)}</span>
      <strong>{t(value)}</strong>
    </div>
  );
}

function CompactTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  const t = useT();
  return (
    <div className="table-card compact-table">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{t(column)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>{row.map((cell, index) => <td key={`${cell}-${index}`} data-label={t(columns[index])}>{t(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ObjectList({
  rows,
}: {
  rows: Array<{ id: string; title: string; meta: string; tone: Tone; status: string }>;
}) {
  const t = useT();
  return (
    <div className="object-list">
      {rows.map((row) => (
        <article key={row.id}>
          <span className={`dot ${row.tone}`} />
          <div>
            <strong>{t(row.title)}</strong>
            <small>{row.meta.split(" / ").map(t).join(" / ")}</small>
          </div>
          <StatusPill label={row.status} tone={row.tone} />
        </article>
      ))}
    </div>
  );
}

function LiveView({ asset }: { asset: Asset }) {
  return (
    <div className="live-view">
      <div className="feed-frame" style={{ backgroundImage: `url("${feedBackground(asset.feedId)}")` }} />
      <div className="detail-cards">
        <Detail label="Asset" value={asset.name} />
        <Detail label="Status" value={asset.status} />
        <Detail label="POP" value={asset.pop} />
        <Detail label="Next slot" value={asset.nextSlot} />
      </div>
    </div>
  );
}

function LiveViewFullscreen({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const t = useT();

  return (
    <div
      className="live-view-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={t("Live view")}
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="live-view-fullscreen-panel">
        <header className="live-view-fullscreen-header">
          <div>
            <span>{t("Live view")}</span>
            <h2>{t(asset.name)}</h2>
            <p>{asset.id} / {t(asset.type)} / {asset.controller}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("Close full screen")}>
            <X size={18} />
          </button>
        </header>
        <LiveView asset={asset} />
      </section>
    </div>
  );
}

function Legend() {
  const t = useT();
  return (
    <div className="legend">
      <span><i className="good" /> {t("Healthy")}</span>
      <span><i className="warn" /> {t("Degraded")}</span>
      <span><i className="danger" /> {t("Faulty")}</span>
    </div>
  );
}

function MediaTypeIcon({ type }: { type: MediaAsset["type"] }) {
  if (type === "Video" || type === "Live Stream") return <MonitorPlay size={18} />;
  if (type === "Document") return <FileText size={18} />;
  return <ImageIcon size={18} />;
}

function MediaGptPrompt({ prompt, output }: { prompt: string; output: string }) {
  const t = useT();
  return (
    <div className="mediagpt-prompt">
      <div>{t(prompt)}</div>
      <p>{t(output)}</p>
    </div>
  );
}

function Range({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const t = useT();
  return (
    <label className="range-row">
      <span>{t(label)}</span>
      <strong>{value}{t(suffix)}</strong>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Toast({ children }: { children: ReactNode }) {
  const t = useT();
  return <div className="toast" role="status">{translateNode(children, t)}</div>;
}

function summarizeZones(items: Asset[]) {
  const grouped = new Map<string, { name: string; total: number; live: number; issue: number; firstAssetId: string }>();
  items.forEach((asset) => {
    const current = grouped.get(asset.zone) ?? { name: asset.zone, total: 0, live: 0, issue: 0, firstAssetId: asset.id };
    current.total += 1;
    current.live += asset.status === "Live" ? 1 : 0;
    current.issue += asset.status === "Live" ? 0 : 1;
    grouped.set(asset.zone, current);
  });
  return Array.from(grouped.values());
}

function applyEstateFilter(items: Asset[], filter: EstateFilter | null) {
  if (!filter) return items;
  const freeText = filter.freeText?.toLowerCase().trim();
  const hasStructuredFilter = Boolean(filter.status || filter.zone || filter.type || filter.controller);
  return items.filter((asset) => {
    if (filter.status && asset.status.toLowerCase() !== filter.status.toLowerCase()) return false;
    if (filter.zone && !asset.zone.toLowerCase().includes(filter.zone.toLowerCase())) return false;
    if (filter.type && !asset.type.toLowerCase().includes(filter.type.toLowerCase())) return false;
    if (filter.controller && !asset.controller.toLowerCase().includes(filter.controller.toLowerCase())) return false;
    if (freeText && !hasStructuredFilter) {
      const haystack = `${asset.id} ${asset.name} ${asset.type} ${asset.zone} ${asset.status} ${asset.controller}`.toLowerCase();
      const usefulWords = freeText.split(/\s+/).filter((word) => word.length > 2 && !["show", "find", "with", "assets", "asset"].includes(word));
      if (usefulWords.length && !usefulWords.some((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

function priorityTone(priority: Submission["priority"]): Tone {
  if (priority === "High") return "danger";
  if (priority === "Medium") return "warn";
  return "good";
}

function severityTone(severity: string): Tone {
  if (severity === "Critical" || severity === "High") return "danger";
  if (severity === "Medium" || severity === "Major") return "warn";
  return "info";
}

function assetTone(status: Asset["status"]): Tone {
  if (status === "Live") return "good";
  if (status === "Offline") return "danger";
  if (status === "Warning" || status === "Maintenance") return "warn";
  return "neutral";
}

function defaultProcurementItem(asset: Asset) {
  if (asset.status === "Offline") return "Edge controller";
  if (asset.status === "Warning") return asset.tempC.includes("57") ? "Cooling fan kit" : "Thermal sensor kit";
  if (asset.status === "Maintenance") return "Rear door gasket";
  return "LED module batch";
}

function alertTone(state: AlertState): Tone {
  if (state === "Broadcasting" || state === "Checked" || state === "Live on network") return "good";
  if (state === "Broadcast queued") return "info";
  if (state === "Approval required" || state === "Check required") return "warn";
  return "neutral";
}

function campaignStatusTone(status: BidderCampaign["status"]): Tone {
  if (status === "Published") return "good";
  if (status === "Approved" || status === "Scheduled") return "info";
  if (status === "Changes requested") return "warn";
  if (status === "Submitted" || status === "In review") return "warn";
  if (status === "Bidding") return "info";
  return "neutral";
}

function mapCampaignStatus(stage: SubmissionStage): BidderCampaign["status"] {
  if (stage === "Submitted") return "Submitted";
  if (stage === "In review") return "In review";
  if (stage === "Changes requested") return "Changes requested";
  if (stage === "Approved") return "Approved";
  if (stage === "Scheduled") return "Scheduled";
  if (stage === "Published") return "Published";
  return "In review";
}

function campaignNextStep(stage: SubmissionStage) {
  if (stage === "Submitted") return "Waiting for ADMO review";
  if (stage === "In review") return "Content screening";
  if (stage === "Changes requested") return "Review ADMO message and upload revised creative";
  if (stage === "Approved") return "Scheduling";
  if (stage === "Scheduled") return "Awaiting publish";
  if (stage === "Published") return "Proof-of-play reconciliation";
  return "Revise creative pack";
}

function formatNotificationTime(value: string, t: Translator) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Just now";
  const locale = t("Notifications") === "الإشعارات" ? "ar-AE" : undefined;
  return date.toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function notificationBody(notification: PlatformNotification, t: Translator) {
  const key = `notification.body.${notification.title}`;
  const template = t(key);
  if (template !== key) return template.replaceAll("{subject}", t(notification.subject));
  return t(notification.body);
}

function mediaCreative(index: number) {
  const ids = [
    "holiday-notice",
    "weather-alert",
    "etihad-retail",
    "yas-tourism",
    "mall-footfall",
    "live-slate",
    "eid-family-retail",
    "coca-cola-national-day",
    "experience-abu-dhabi",
    "ramadan-kareem",
    "royal-safari",
    "compliance-pack",
  ];
  return ids[index % ids.length];
}


// ==================== Bidder brief types + wizard ====================

interface BriefPayload {
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
  assets: Array<{ name: string; type: string; size: string; illustration: string; previewUrl?: string }>;
}

interface FinanceApproval {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  amount: string;
  margin: string;
  risk: "Low" | "Medium" | "Elevated";
  state: "Pending" | "Approved" | "On hold" | "Rejected";
}

const wizardCreativeIds = [
  "etihad-retail",
  "yas-tourism",
  "mall-footfall",
  "eid-family-retail",
  "coca-cola-national-day",
  "experience-abu-dhabi",
  "ramadan-kareem",
  "royal-safari",
  "holiday-notice",
  "live-slate",
];
const wizardZones = ["Corniche", "Downtown", "Yas Island", "Al Ain gateways", "Airport road", "Reem Island"];
const wizardObjectives = ["Awareness", "Footfall", "Sales activation", "Tourism visitation", "Public information", "Event attendance"];

function NewCampaignWizard({
  defaultBidder,
  onClose,
  onSubmit,
  t,
}: {
  defaultBidder: string;
  onClose: () => void;
  onSubmit: (payload: BriefPayload) => void;
  t: (v: string) => string;
}) {
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<BriefPayload>({
    campaign: "",
    packageName: "Downtown retail loop",
    budget: "320000",
    creativeId: wizardCreativeIds[0],
    languages: "Arabic + English",
    startDate: "Jul 15, 2026",
    endDate: "Aug 15, 2026",
    priority: "Standard",
    objective: "Awareness",
    contactName: defaultBidder,
    contactEmail: "campaigns@bidder.ae",
    brand: "",
    vertical: "Retail",
    audience: "Residents 25-45, premium spenders",
    targetZones: ["Corniche", "Downtown"],
    daypart: "Prime evening (17:00-22:00)",
    reach: "1200000",
    compliance: { uaeMedia: false, arabicProof: false, rightsCleared: false, noPolitical: false },
    assets: [],
  });

  const steps = [
    t("Brand"),
    t("Creative pack"),
    t("Targeting"),
    t("Schedule and budget"),
    t("Compliance"),
    t("Review"),
  ];

  function update<K extends keyof BriefPayload>(key: K, value: BriefPayload[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleZone(zone: string) {
    setData((d) => ({
      ...d,
      targetZones: d.targetZones.includes(zone) ? d.targetZones.filter((z) => z !== zone) : [...d.targetZones, zone],
    }));
  }

  function addAssetFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    setData((d) => ({
      ...d,
      creativeId: d.assets[0]?.illustration ?? d.creativeId,
      assets: [
        ...d.assets,
        ...selectedFiles.map((file, index) => ({
          name: file.name,
          type: file.type || "Creative file",
          size: formatFileSize(file.size),
          illustration: wizardCreativeIds[(d.assets.length + index) % wizardCreativeIds.length],
          previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
        })),
      ],
    }));
  }

  function removeAsset(idx: number) {
    setData((d) => ({ ...d, assets: d.assets.filter((_, i) => i !== idx) }));
  }

  const basicsComplete = Boolean(data.campaign.trim() && data.brand.trim());
  const complianceComplete = Object.values(data.compliance).every(Boolean);
  const canNext = Boolean(
    (step === 0 && basicsComplete) ||
    (step === 1 && data.assets.length > 0) ||
    (step === 2 && data.targetZones.length > 0) ||
    (step === 3 && Number(data.budget) > 0 && Number(data.reach) > 0) ||
    (step === 4 && complianceComplete) ||
    step === 5,
  );

  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true">
      <div className="wizard-shell">
        <header className="wizard-header">
          <div>
            <strong>{t("New campaign brief")}</strong>
            <small>{t("Submit a complete bid packet to ADMO CMS")}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close")}><X size={16} /></button>
        </header>

        <ol className="wizard-steps">
          {steps.map((label, i) => (
            <li key={label} className={i === step ? "active" : i < step ? "done" : ""}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <em>{label}</em>
            </li>
          ))}
        </ol>

        <div className="wizard-body">
          {step === 0 && (
            <div className="wizard-grid">
              <label><span>{t("Campaign name")}</span><input value={data.campaign} onChange={(e) => update("campaign", e.target.value)} placeholder={t("Summer retail launch")} /></label>
              <label><span>{t("Brand")}</span><input value={data.brand} onChange={(e) => update("brand", e.target.value)} placeholder={t("Advertiser")} /></label>
              <label><span>{t("Vertical")}</span>
                <select value={data.vertical} onChange={(e) => update("vertical", e.target.value)}>
                  <option>Retail</option><option>Tourism</option><option>Government</option><option>Finance</option><option>Automotive</option><option>Real estate</option>
                </select>
              </label>
              <label><span>{t("Primary objective")}</span>
                <select value={data.objective} onChange={(e) => update("objective", e.target.value)}>
                  {wizardObjectives.map((objective) => <option key={objective}>{objective}</option>)}
                </select>
              </label>
              <label><span>{t("Contact")}</span><input value={data.contactName} onChange={(e) => update("contactName", e.target.value)} /></label>
              <label><span>{t("Email")}</span><input value={data.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></label>
              {!basicsComplete ? <p className="wizard-hint wizard-full">{t("Campaign name and brand are required before continuing.")}</p> : null}
            </div>
          )}

          {step === 1 && (
            <div className="wizard-creative">
              <div className="wizard-creative-head">
                <div>
                  <strong>{t("Creative pack")}</strong>
                  <small>{t("Illustrations, motion, and static assets. Arabic + English required.")}</small>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf"
                  hidden
                  onChange={(event) => addAssetFiles(event.target.files)}
                />
                <Button icon={Upload} variant="secondary" onClick={() => fileInputRef.current?.click()}>{t("Upload files")}</Button>
              </div>
              <div className="wizard-asset-grid">
                {!data.assets.length ? (
                  <div className="wizard-upload-empty">
                    <Upload size={24} />
                    <strong>{t("No creative files uploaded")}</strong>
                    <span>{t("Upload image, video or PDF creative files from your laptop.")}</span>
                  </div>
                ) : null}
                {data.assets.map((asset, i) => (
                  <article key={i} className="wizard-asset">
                    <div className="creative-frame" style={{ backgroundImage: `url("${asset.previewUrl || creativeBackground(asset.illustration)}")` }} />
                    <div className="wizard-asset-meta">
                      <strong>{asset.name}</strong>
                      <span>{asset.type} / {asset.size}</span>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removeAsset(i)} aria-label={t("Remove")}><X size={14} /></button>
                  </article>
                ))}
              </div>
              <label className="wizard-inline"><span>{t("Preview illustration for CMS")}</span>
                <select value={data.creativeId} onChange={(e) => update("creativeId", e.target.value)}>
                  {wizardCreativeIds.map((id) => <option key={id} value={id}>{id}</option>)}
                </select>
              </label>
              <label className="wizard-inline"><span>{t("Languages")}</span>
                <select value={data.languages} onChange={(e) => update("languages", e.target.value)}>
                  <option>Arabic + English</option><option>Arabic only</option><option>English only</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-grid">
              <label className="wizard-full"><span>{t("Target audience")}</span><input value={data.audience} onChange={(e) => update("audience", e.target.value)} /></label>
              <div className="wizard-full">
                <span className="wizard-label">{t("Target zones")}</span>
                <div className="wizard-chips">
                  {wizardZones.map((zone) => (
                    <button key={zone} type="button" className={`wizard-chip ${data.targetZones.includes(zone) ? "on" : ""}`} onClick={() => toggleZone(zone)}>
                      <MapPinned size={12} /> {t(zone)}
                    </button>
                  ))}
                </div>
              </div>
              <label><span>{t("Daypart")}</span>
                <select value={data.daypart} onChange={(e) => update("daypart", e.target.value)}>
                  <option>Prime evening (17:00-22:00)</option><option>Morning commute (07:00-10:00)</option><option>Full day rotation</option><option>Weekend leisure</option>
                </select>
              </label>
              <label><span>{t("Expected weekly impressions")}</span><input type="number" min={1} step={1000} value={data.reach} onChange={(e) => update("reach", e.target.value)} /></label>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-grid">
              <label><span>{t("Package")}</span>
                <select value={data.packageName} onChange={(e) => update("packageName", e.target.value)}>
                  <option>Downtown retail loop</option><option>Airport and premium roadside</option><option>Yas leisure loop</option><option>Civic bilingual pack</option>
                </select>
              </label>
              <label><span>{t("Total budget (AED)")}</span><input type="number" min={1} step={1000} value={data.budget} onChange={(e) => update("budget", e.target.value)} placeholder="320000" /></label>
              <label><span>{t("Start")}</span><input value={data.startDate} onChange={(e) => update("startDate", e.target.value)} /></label>
              <label><span>{t("End")}</span><input value={data.endDate} onChange={(e) => update("endDate", e.target.value)} /></label>
              <label><span>{t("Priority")}</span>
                <select value={data.priority} onChange={(e) => update("priority", e.target.value as "Standard" | "High")}>
                  <option value="Standard">Standard</option><option value="High">High</option>
                </select>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-compliance">
              {([
                ["uaeMedia", "UAE Media Council compliant"],
                ["arabicProof", "Arabic copy proof-read by native reviewer"],
                ["rightsCleared", "Music, imagery and talent rights cleared"],
                ["noPolitical", "No political or restricted content"],
              ] as const).map(([key, label]) => (
                <label key={key} className="wizard-check">
                  <input type="checkbox" checked={data.compliance[key]} onChange={(e) => update("compliance", { ...data.compliance, [key]: e.target.checked })} />
                  <span>{t(label)}</span>
                </label>
              ))}
              <p className="wizard-hint">{t("All items must be confirmed. ADMO will re-verify via MediaGPT deep-scan.")}</p>
              {!complianceComplete ? <p className="wizard-hint">{t("Confirm all compliance items to continue.")}</p> : null}
            </div>
          )}

          {step === 5 && (
            <div className="wizard-review">
              <div className="wizard-review-grid">
                <Detail label="Campaign" value={data.campaign || "-"} />
                <Detail label="Brand" value={data.brand || "-"} />
                <Detail label="Package" value={data.packageName} />
                <Detail label="Budget" value={`AED ${Number(data.budget || 0).toLocaleString("en-US")}`} />
                <Detail label="Start" value={data.startDate} />
                <Detail label="End" value={data.endDate} />
                <Detail label="Languages" value={data.languages} />
                <Detail label="Priority" value={data.priority} />
                <Detail label="Zones" value={data.targetZones.join(", ") || "-"} />
                <Detail label="Daypart" value={data.daypart} />
                <Detail label="Reach" value={`${Number(data.reach || 0).toLocaleString("en-US")} weekly impressions`} />
                <Detail label="Assets" value={`${data.assets.length} files`} />
                <Detail label="Compliance" value={Object.values(data.compliance).every(Boolean) ? "All confirmed" : "Incomplete"} />
              </div>
              <div className="creative-frame large" style={{ backgroundImage: `url("${creativeBackground(data.creativeId)}")` }} />
            </div>
          )}
        </div>

        <footer className="wizard-footer">
          <Button variant="secondary" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? t("Cancel") : t("Back")}
          </Button>
          <div className="wizard-progress">{step + 1} / {steps.length}</div>
          {step < steps.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)}>{t("Continue")}</Button>
          ) : (
            <Button icon={Send} onClick={() => onSubmit({
              ...data,
              budget: `AED ${Number(data.budget || 0).toLocaleString("en-US")}`,
              reach: `${Number(data.reach || 0).toLocaleString("en-US")} weekly impressions`,
              assets: data.assets.map(({ previewUrl, ...asset }) => asset),
            })}>{t("Submit to ADMO")}</Button>
          )}
        </footer>
      </div>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default App;
