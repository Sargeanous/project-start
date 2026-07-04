export type Page =
  | "control"
  | "cms"
  | "devices"
  | "commercial"
  | "ai"
  | "reporting";

export type CmsTab = "submissions" | "media" | "reach";
export type AiTab = "agents" | "models" | "governance";

export type Tone = "good" | "watch" | "critical" | "info" | "neutral";

export interface CommandMetric {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  zone: string;
  status: "Live" | "Warning" | "Offline" | "Maintenance";
  pop: string;
  brightness: string;
  controller: string;
  network: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  audience: string;
  nextSlot: string;
  feedId: string;
  size: string;
  resolution: string;
  installed: string;
  address: string;
  uptime: string;
  cacheDays: string;
  tempC: string;
  otaRing: string;
}

export interface Ticket {
  id: string;
  title: string;
  asset: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  team: string;
  status: "Open" | "Acknowledged" | "Resolved";
  note: string;
  created: string;
  sla: string;
}

export interface AudienceProfile {
  assetId: string;
  weeklyImpressions: string;
  dwell: string;
  peakDaypart: string;
  avgSpend: string;
  recall: string;
  demographics: Array<{ label: string; value: number }>;
  dayparts: Array<{ label: string; value: number }>;
  history: Array<{ campaign: string; advertiser: string; lift: string; plays: string }>;
}

export interface AlertRecord {
  id: string;
  title: string;
  assetId: string;
  zone: string;
  severity: "Critical" | "Major" | "Minor";
  source: string;
  status: "Open" | "Acknowledged" | "Closed";
  openedAt: string;
  action: string;
}

export interface VideoFeed {
  id: string;
  asset: string;
  label: string;
  status: "Live" | "Buffered" | "Unavailable";
  tint: "city" | "road" | "coast" | "desert";
}

export interface ContentItem {
  id: string;
  title: string;
  tenant: string;
  type: "Public Notice" | "Commercial" | "Emergency" | "Civic Campaign";
  zone: string;
  stage: string;
  priority: "Normal" | "High" | "Critical";
  aiScore: number;
  due: string;
  approver: string;
  notes: string[];
}

export interface ScheduleSlot {
  time: string;
  city: string;
  civic: string;
  commercial: string;
}

export interface PushLog {
  id: string;
  message: string;
  scope: string;
  status: "Success" | "Pending" | "Rejected";
  time: string;
}

export interface Campaign {
  id: string;
  advertiser: string;
  objective: string;
  packageName: string;
  budget: string;
  status: "Draft" | "In review" | "Live" | "Settled";
  reach: string;
  pop: string;
  nextAction: string;
}

export interface Bid {
  id: string;
  buyer: string;
  zone: string;
  bid: string;
  winRate: string;
  creative: string;
}

export interface ProofRecord {
  id: string;
  campaign: string;
  asset: string;
  plays: string;
  evidence: "Signed" | "Reconciling" | "Disputed";
  settlement: string;
}

export interface FieldTask {
  id: string;
  title: string;
  column: "Pending Assignment" | "Pending Execution" | "In Progress" | "Completed" | "Overdue";
  priority: "Low" | "Medium" | "High" | "Critical";
  owner: string;
  asset: string;
  due: string;
}

export interface HistoricalCampaign {
  id: string;
  campaign: string;
  advertiser: string;
  packageName: string;
  zone: string;
  assetIds: string[];
  startDate: string;
  endDate: string;
  budgetAed: number;
  impressions: number;
  plays: number;
  pop: string;
  outcome: string;
}

export interface HistoricalBid {
  id: string;
  lotId: string;
  lotName: string;
  bidder: string;
  campaign: string;
  zone: string;
  amountAed: number;
  submittedAt: string;
  result: "Won" | "Outbid" | "Withdrawn";
}

export interface HistoricalRun {
  id: string;
  type: "Playback" | "Proof-of-play" | "Maintenance" | "AI review" | "Emergency";
  subject: string;
  assetId: string;
  startedAt: string;
  endedAt: string;
  status: "Completed" | "Issue found" | "Resolved" | "Escalated";
  summary: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  type: "Image" | "Video" | "Document" | "Live Stream";
  tags: string[];
  status: "Approved" | "Pending Review" | "Rejected";
  owner: string;
  updated: string;
}

export interface AiAudit {
  id: string;
  file: string;
  verdict: "Approved" | "Needs Human Review" | "Rejected";
  confidence: string;
  category: string;
  reviewer: string;
}

export interface DataAsset {
  id: string;
  name: string;
  type: string;
  records: string;
  owner: string;
  usage: string;
}

export interface EvidenceRecord {
  id: string;
  control: string;
  owner: string;
  status: "Ready" | "Collecting" | "Gap";
  due: string;
}

export interface Milestone {
  phase: string;
  title: string;
  window: string;
  status: "Complete" | "Active" | "Planned";
}

export const commandMetrics: CommandMetric[] = [
  { label: "Onboarded assets", value: "35", helper: "Architected for 1,000+", tone: "info" },
  { label: "Screens live", value: "31", helper: "4 require attention", tone: "good" },
  { label: "Proof-of-play", value: "99.92%", helper: "Signed evidence loop", tone: "good" },
  { label: "Open alarms", value: "7", helper: "2 critical", tone: "critical" },
  { label: "Emergency readiness", value: "<60s", helper: "Estate-wide override path", tone: "watch" },
];

export const assets: Asset[] = [
  {
    id: "AD-HWY-001",
    name: "Corniche Highway Main",
    type: "Highway billboard",
    zone: "Abu Dhabi City",
    status: "Live",
    pop: "99.96%",
    brightness: "18,800 cd",
    controller: "Edge-Orin-07",
    network: "5G primary / fiber backup",
    x: 57,
    y: 36,
    lat: 24.4664,
    lng: 54.3170,
    audience: "412k weekly",
    nextSlot: "Civic road safety",
    feedId: "vf-1",
    size: "14.0 m x 4.5 m (63 m²)",
    resolution: "3840 x 1232 px",
    installed: "Mar 2023",
    address: "Corniche Road West, opposite Nation Towers, Abu Dhabi",
    uptime: "99.96%",
    cacheDays: "7 days",
    tempC: "42°C",
    otaRing: "Ring 2",
  },
  {
    id: "AD-BRG-014",
    name: "Mussafah Bridge Banner",
    type: "Bridge display",
    zone: "Industrial Zone",
    status: "Warning",
    pop: "98.61%",
    brightness: "17,200 cd",
    controller: "Edge-AX-14",
    network: "Fiber primary",
    x: 68,
    y: 60,
    lat: 24.3617,
    lng: 54.5089,
    audience: "286k weekly",
    nextSlot: "Industrial safety notice",
    feedId: "vf-3",
    size: "10.0 m x 3.0 m (30 m²)",
    resolution: "2560 x 768 px",
    installed: "Aug 2022",
    address: "Mussafah Bridge approach, route E10, Industrial Zone",
    uptime: "98.61%",
    cacheDays: "3 days",
    tempC: "57°C",
    otaRing: "Ring 1",
  },
  {
    id: "AD-BUS-022",
    name: "Yas Island Bus Stop Pair",
    type: "Dual-sided bus stop",
    zone: "Yas Island",
    status: "Live",
    pop: "99.88%",
    brightness: "9,200 cd",
    controller: "Edge-Nano-22",
    network: "5G primary",
    x: 77,
    y: 28,
    lat: 24.4886,
    lng: 54.6030,
    audience: "121k weekly",
    nextSlot: "Tourism live stream",
    feedId: "vf-2",
    size: "1.9 m x 1.1 m, dual face (4.2 m²)",
    resolution: "1080 x 1920 px per face",
    installed: "Jan 2024",
    address: "Yas Mall north bus bay, Yas Island",
    uptime: "99.88%",
    cacheDays: "5 days",
    tempC: "38°C",
    otaRing: "Ring 3",
  },
  {
    id: "AD-HWY-009",
    name: "Al Ain Gateway",
    type: "Highway billboard",
    zone: "Al Ain",
    status: "Offline",
    pop: "92.40%",
    brightness: "0 cd",
    controller: "Edge-Orin-09",
    network: "Satellite failover",
    x: 32,
    y: 72,
    lat: 24.2236,
    lng: 55.7600,
    audience: "198k weekly",
    nextSlot: "Queued after recovery",
    feedId: "vf-1",
    size: "16.0 m x 5.0 m (80 m²)",
    resolution: "4096 x 1280 px",
    installed: "Nov 2021",
    address: "Al Ain Truck Road gateway, route E22, Al Ain",
    uptime: "92.40%",
    cacheDays: "0 days",
    tempC: "n/a (offline)",
    otaRing: "Ring 1",
  },
  {
    id: "AD-DWT-011",
    name: "Downtown Mall Entrance",
    type: "Indoor/outdoor LED",
    zone: "Downtown",
    status: "Maintenance",
    pop: "96.12%",
    brightness: "11,600 cd",
    controller: "Edge-AX-11",
    network: "Fiber primary",
    x: 48,
    y: 51,
    lat: 24.4955,
    lng: 54.3760,
    audience: "304k weekly",
    nextSlot: "Maintenance blackout",
    feedId: "vf-4",
    size: "6.0 m x 3.5 m (21 m²)",
    resolution: "2160 x 1260 px",
    installed: "Jun 2023",
    address: "Downtown Mall main entrance, Al Markaziyah, Abu Dhabi",
    uptime: "96.12%",
    cacheDays: "6 days",
    tempC: "35°C",
    otaRing: "Ring 2",
  },
];

export const historicalCampaigns: HistoricalCampaign[] = [
  { id: "HC-2025-001", campaign: "Coca-Cola Taste the Feeling", advertiser: "Coca-Cola", packageName: "Yas leisure loop", zone: "Yas Island", assetIds: ["AD-BUS-022"], startDate: "2025-03-01", endDate: "2025-03-21", budgetAed: 312000, impressions: 1280000, plays: 18520, pop: "99.2%", outcome: "Strong evening recall, renewed for summer route" },
  { id: "HC-2024-044", campaign: "Yas Bay activation", advertiser: "Coca-Cola", packageName: "Yas leisure loop", zone: "Yas Island", assetIds: ["AD-BUS-022"], startDate: "2024-08-04", endDate: "2024-08-24", budgetAed: 268500, impressions: 1040000, plays: 16440, pop: "98.8%", outcome: "High footfall lift near hotel corridor" },
  { id: "HC-2024-088", campaign: "Airport Duty Free summer", advertiser: "Abu Dhabi Duty Free", packageName: "Airport and premium roadside", zone: "Airport route", assetIds: ["AD-HWY-001"], startDate: "2024-06-10", endDate: "2024-07-07", budgetAed: 425000, impressions: 1710000, plays: 22180, pop: "99.5%", outcome: "Converted to annual route buy" },
  { id: "HC-2025-012", campaign: "Experience Abu Dhabi desert", advertiser: "DCT Abu Dhabi", packageName: "Full estate civic takeover", zone: "Abu Dhabi City", assetIds: ["AD-HWY-001", "AD-DWT-011"], startDate: "2025-01-15", endDate: "2025-02-15", budgetAed: 780000, impressions: 3100000, plays: 42600, pop: "99.7%", outcome: "Best performing tourism creative in Q1" },
  { id: "HC-2025-033", campaign: "Ramadan Kareem civic greetings", advertiser: "ADMO", packageName: "Civic bilingual pack", zone: "Abu Dhabi City", assetIds: ["AD-HWY-001", "AD-BUS-022", "AD-DWT-011"], startDate: "2025-03-10", endDate: "2025-04-10", budgetAed: 0, impressions: 3950000, plays: 58400, pop: "99.9%", outcome: "No commercial displacement incidents" },
  { id: "HC-2025-071", campaign: "Weekend mall offer", advertiser: "Retail Majlis", packageName: "Downtown retail loop", zone: "Downtown", assetIds: ["AD-DWT-011"], startDate: "2025-11-01", endDate: "2025-11-14", budgetAed: 184000, impressions: 810000, plays: 12600, pop: "99.1%", outcome: "Make-good issued for one camera proof gap" },
  { id: "HC-2026-002", campaign: "Road safety rotation", advertiser: "Abu Dhabi Police", packageName: "Civic emergency lane", zone: "Abu Dhabi City", assetIds: ["AD-HWY-001"], startDate: "2026-01-05", endDate: "2026-01-31", budgetAed: 0, impressions: 1620000, plays: 30400, pop: "99.96%", outcome: "Emergency priority route validated" },
  { id: "HC-2026-019", campaign: "Royal Safari winter push", advertiser: "Royal Safari", packageName: "Airport and premium roadside", zone: "Airport route", assetIds: ["AD-HWY-001", "AD-BRG-014"], startDate: "2026-02-10", endDate: "2026-03-05", budgetAed: 365000, impressions: 1390000, plays: 19700, pop: "98.9%", outcome: "Bridge asset temperature warning reduced delivered plays by 1.8%" },
];

// Long-term asset allocation register (RFP FIN-101). Explicit assetId joins;
// lotId links an asset to a live short-term auction (never parsed from lot text).
export type AllocationStatus = "Allocated" | "Available" | "In bidding" | "Under maintenance";

export interface AssetAllocation {
  assetId: string;
  status: AllocationStatus;
  operator?: string;
  contractRef?: string;
  model?: "Fixed slots" | "Variable share-of-voice";
  permittedCategories?: string;
  effectiveDate?: string;
  expiryDate?: string;
  annualValueAed?: number;
  rateCardWeekAed?: number;
  shareOfVoice?: string;
  publicSplitTarget?: string;
  publicSplitActual?: string;
  revenueToDateAed?: number;
  lotId?: string;
  note?: string;
}

export const assetAllocations: AssetAllocation[] = [
  {
    assetId: "AD-HWY-001",
    status: "Allocated",
    operator: "Abu Dhabi Duty Free",
    contractRef: "CTR-2024-088-R1",
    model: "Fixed slots",
    permittedCategories: "Retail, travel, tourism",
    effectiveDate: "2025-07-01",
    expiryDate: "2027-06-30",
    annualValueAed: 1450000,
    rateCardWeekAed: 38500,
    shareOfVoice: "40% SOV, evening fixed slots",
    publicSplitTarget: "30% public / 70% commercial",
    publicSplitActual: "32% public / 68% commercial",
    revenueToDateAed: 1180000,
    note: "Annual route buy converted from HC-2024-088; renewal review due Q1 2027.",
  },
  {
    assetId: "AD-BRG-014",
    status: "Available",
    rateCardWeekAed: 24000,
    publicSplitTarget: "30% public / 70% commercial",
    note: "Returned to pool after Royal Safari winter flight; thermal warning under monitoring.",
  },
  {
    assetId: "AD-BUS-022",
    status: "In bidding",
    lotId: "LOT-4402",
    operator: "Yas Tourism",
    contractRef: "CTR-2025-104",
    model: "Variable share-of-voice",
    permittedCategories: "Leisure, tourism, events",
    effectiveDate: "2025-09-01",
    expiryDate: "2026-08-30",
    annualValueAed: 620000,
    rateCardWeekAed: 14500,
    shareOfVoice: "25% SOV, flexible windows",
    publicSplitTarget: "35% public / 65% commercial",
    publicSplitActual: "36% public / 64% commercial",
    revenueToDateAed: 505000,
    note: "Current allocation expires Aug 30, 2026; successor flight in live auction LOT-4402.",
  },
  {
    assetId: "AD-HWY-009",
    status: "Available",
    rateCardWeekAed: 11000,
    publicSplitTarget: "40% public / 60% commercial",
    note: "Sellable subject to edge controller restoration; listed at gateway rate card.",
  },
  {
    assetId: "AD-DWT-011",
    status: "Under maintenance",
    operator: "Retail Majlis",
    contractRef: "CTR-2025-071-X",
    model: "Fixed slots",
    permittedCategories: "Retail, F&B",
    effectiveDate: "2025-11-01",
    expiryDate: "2026-10-31",
    annualValueAed: 890000,
    rateCardWeekAed: 21500,
    shareOfVoice: "30% SOV, weekend fixed slots",
    publicSplitTarget: "30% public / 70% commercial",
    publicSplitActual: "28% public / 72% commercial",
    revenueToDateAed: 610000,
    note: "LED module swap in progress; commercial delivery paused, make-good accruing.",
  },
];

export const historicalBids: HistoricalBid[] = [
  { id: "HB-9001", lotId: "LOT-4411", lotName: "Corniche prime - evening rotation", bidder: "Yas Tourism", campaign: "Yas Bay summer", zone: "Corniche", amountAed: 442000, submittedAt: "2026-06-22T15:40:00Z", result: "Won" },
  { id: "HB-9002", lotId: "LOT-4411", lotName: "Corniche prime - evening rotation", bidder: "Coca-Cola", campaign: "Noor summer", zone: "Corniche", amountAed: 437000, submittedAt: "2026-06-22T15:18:00Z", result: "Outbid" },
  { id: "HB-9003", lotId: "LOT-4408", lotName: "Downtown retail loop - weekend", bidder: "Retail Majlis", campaign: "Weekend mall offer", zone: "Downtown", amountAed: 168500, submittedAt: "2026-06-20T12:12:00Z", result: "Won" },
  { id: "HB-9004", lotId: "LOT-4402", lotName: "Yas leisure loop - summer flight", bidder: "Yas Tourism", campaign: "Yas leisure flight", zone: "Yas Island", amountAed: 225000, submittedAt: "2026-05-28T10:24:00Z", result: "Won" },
  { id: "HB-9005", lotId: "LOT-4402", lotName: "Yas leisure loop - summer flight", bidder: "Royal Safari", campaign: "Desert evening", zone: "Yas Island", amountAed: 220000, submittedAt: "2026-05-28T09:56:00Z", result: "Outbid" },
  { id: "HB-9006", lotId: "LOT-4397", lotName: "Airport gantry arrival", bidder: "Abu Dhabi Duty Free", campaign: "Arrival retail", zone: "Airport route", amountAed: 398000, submittedAt: "2026-04-18T13:05:00Z", result: "Won" },
];

export const historicalRuns: HistoricalRun[] = [
  { id: "HR-001", type: "Playback", subject: "Road safety rotation", assetId: "AD-HWY-001", startedAt: "2026-07-02T08:00:00Z", endedAt: "2026-07-02T20:00:00Z", status: "Completed", summary: "12,480 plays completed with signed proof packets" },
  { id: "HR-002", type: "Proof-of-play", subject: "Weekend mall offer", assetId: "AD-DWT-011", startedAt: "2026-07-01T00:00:00Z", endedAt: "2026-07-01T23:59:00Z", status: "Issue found", summary: "Camera angle drift created one evidence gap, make-good recommended" },
  { id: "HR-003", type: "Maintenance", subject: "Cooling fan stalled", assetId: "AD-BRG-014", startedAt: "2026-07-02T14:12:00Z", endedAt: "2026-07-02T16:45:00Z", status: "Escalated", summary: "Technician requested fan kit and controller thermal review" },
  { id: "HR-004", type: "AI review", subject: "Airport retail launch", assetId: "CMS", startedAt: "2026-07-02T11:05:00Z", endedAt: "2026-07-02T11:07:00Z", status: "Completed", summary: "MediaGPT found bilingual copy acceptable, CTA legibility needs human check" },
  { id: "HR-005", type: "Emergency", subject: "Weather alert broadcast", assetId: "Al Ain gateways", startedAt: "2026-07-01T17:30:00Z", endedAt: "2026-07-01T18:00:00Z", status: "Resolved", summary: "CAP payload validated and cached on highway assets" },
  { id: "HR-006", type: "Playback", subject: "Yas summer promotion", assetId: "AD-BUS-022", startedAt: "2026-06-29T09:30:00Z", endedAt: "2026-06-29T23:00:00Z", status: "Completed", summary: "Tourism creative delivered 9,840 paired-panel plays" },
];

export const tickets: Ticket[] = [
  {
    id: "ESC-20260623-001",
    title: "Edge controller offline",
    asset: "AD-HWY-009",
    severity: "Critical",
    team: "Field Engineering",
    status: "Open",
    note: "Controller unreachable after a power event. Satellite failover is active and the screen is dark. Site visit required.",
    created: "08:14",
    sla: "Restore within 2 hours",
  },
];

export const alerts: AlertRecord[] = [
  {
    id: "ARM-20260622-001",
    title: "Temperature sensor threshold breach",
    assetId: "AD-BRG-014",
    zone: "Industrial Zone",
    severity: "Critical",
    source: "Sensor AI",
    status: "Open",
    openedAt: "00:18",
    action: "Dispatch field inspection and throttle brightness",
  },
  {
    id: "ARM-20260622-002",
    title: "Proof-of-play camera mismatch",
    assetId: "AD-DWT-011",
    zone: "Downtown",
    severity: "Major",
    source: "Playback verification",
    status: "Open",
    openedAt: "00:24",
    action: "Review camera feed and reconcile signed logs",
  },
  {
    id: "ARM-20260622-003",
    title: "Edge controller offline",
    assetId: "AD-HWY-009",
    zone: "Al Ain",
    severity: "Critical",
    source: "Device management",
    status: "Open",
    openedAt: "00:31",
    action: "Failover, restart controller, create work order",
  },
  {
    id: "ARM-20260622-004",
    title: "Scheduled content awaiting dual control",
    assetId: "AD-HWY-001",
    zone: "Abu Dhabi City",
    severity: "Minor",
    source: "CMS workflow",
    status: "Acknowledged",
    openedAt: "00:36",
    action: "Second reviewer due before 01:00",
  },
];

export const videoFeeds: VideoFeed[] = [
  { id: "vf-1", asset: "AD-HWY-001", label: "Corniche Highway", status: "Live", tint: "road" },
  { id: "vf-2", asset: "AD-BUS-022", label: "Yas Island shelter", status: "Live", tint: "city" },
  { id: "vf-3", asset: "AD-BRG-014", label: "Mussafah bridge", status: "Buffered", tint: "desert" },
  { id: "vf-4", asset: "AD-DWT-011", label: "Downtown mall", status: "Live", tint: "coast" },
];

export const workflowStages = [
  "Submit",
  "AI screen",
  "Agency review",
  "Dual control",
  "Approved",
  "Scheduled",
  "Playing",
  "PoP",
];

export const contentItems: ContentItem[] = [
  {
    id: "CNT-2026-0614",
    title: "Holiday public notice",
    tenant: "DMT Communications",
    type: "Public Notice",
    zone: "All Regions",
    stage: "Dual control",
    priority: "High",
    aiScore: 98,
    due: "00:58",
    approver: "MRO reviewer",
    notes: ["Arabic first layout verified", "No sensitive content detected", "Secondary review pending"],
  },
  {
    id: "CNT-2026-0615",
    title: "New product launch",
    tenant: "Retail advertiser",
    type: "Commercial",
    zone: "Yas Island",
    stage: "Agency review",
    priority: "Normal",
    aiScore: 91,
    due: "02:20",
    approver: "Commercial reviewer",
    notes: ["Brand safety passed", "Landing page URL pending finance tag"],
  },
  {
    id: "CNT-2026-0616",
    title: "Weather alert broadcast",
    tenant: "NCEMA gateway",
    type: "Emergency",
    zone: "Al Ain",
    stage: "Approved",
    priority: "Critical",
    aiScore: 100,
    due: "Immediate",
    approver: "Dual-control authority",
    notes: ["CAP-UAE payload validated", "Protected edge cache ready"],
  },
  {
    id: "CNT-2026-0617",
    title: "Road safety campaign",
    tenant: "Abu Dhabi Police",
    type: "Civic Campaign",
    zone: "Abu Dhabi City",
    stage: "Scheduled",
    priority: "High",
    aiScore: 97,
    due: "01:30",
    approver: "DMT content lead",
    notes: ["Geo-fenced to highway inventory", "PoP watermark enabled"],
  },
];

export const scheduleSlots: ScheduleSlot[] = [
  { time: "00:00", city: "Road safety", civic: "Holiday notice", commercial: "Airport retail" },
  { time: "01:00", city: "Weather alert standby", civic: "Traffic update", commercial: "Tourism teaser" },
  { time: "02:00", city: "Road safety", civic: "Public health", commercial: "Luxury retail" },
  { time: "03:00", city: "Maintenance window", civic: "Mosque area routing", commercial: "Paused" },
];

export const pushLogs: PushLog[] = [
  { id: "LOG-001", message: "Holiday public notice", scope: "All Regions", status: "Pending", time: "00:36" },
  { id: "LOG-002", message: "Road safety campaign", scope: "Abu Dhabi City", status: "Success", time: "00:12" },
  { id: "LOG-003", message: "Weather alert broadcast", scope: "Al Ain", status: "Success", time: "23:54" },
  { id: "LOG-004", message: "Retail product launch", scope: "Yas Island", status: "Rejected", time: "23:42" },
];

export const campaigns: Campaign[] = [
  {
    id: "CMP-4910",
    advertiser: "Etihad Guest Retail",
    objective: "Airport route conversion",
    packageName: "Airport to Downtown Premium",
    budget: "AED 420k",
    status: "Live",
    reach: "1.8M",
    pop: "99.9%",
    nextAction: "Settle signed PoP batch",
  },
  {
    id: "CMP-4911",
    advertiser: "Yas Tourism",
    objective: "Weekend event attendance",
    packageName: "Leisure District Network",
    budget: "AED 275k",
    status: "In review",
    reach: "940k",
    pop: "Pending",
    nextAction: "Approve creative variation",
  },
  {
    id: "CMP-4912",
    advertiser: "Retail Majlis",
    objective: "Mall footfall lift",
    packageName: "Downtown Commerce Loop",
    budget: "AED 188k",
    status: "Settled",
    reach: "612k",
    pop: "100%",
    nextAction: "Archive reconciliation",
  },
];

export const bids: Bid[] = [
  { id: "BID-921", buyer: "Premium DSP", zone: "Airport route", bid: "AED 83 CPM", winRate: "62%", creative: "Approved" },
  { id: "BID-922", buyer: "Tourism desk", zone: "Yas Island", bid: "AED 71 CPM", winRate: "49%", creative: "Review" },
  { id: "BID-923", buyer: "Retail network", zone: "Downtown", bid: "AED 58 CPM", winRate: "54%", creative: "Approved" },
  { id: "BID-924", buyer: "Civic reserve", zone: "All Regions", bid: "Priority", winRate: "100%", creative: "Approved" },
];

export const proofRecords: ProofRecord[] = [
  { id: "POP-3021", campaign: "Airport route conversion", asset: "AD-HWY-001", plays: "18,420", evidence: "Signed", settlement: "AED 92,800" },
  { id: "POP-3022", campaign: "Weekend event attendance", asset: "AD-BUS-022", plays: "8,117", evidence: "Reconciling", settlement: "AED 31,400" },
  { id: "POP-3023", campaign: "Mall footfall lift", asset: "AD-DWT-011", plays: "12,004", evidence: "Disputed", settlement: "Hold" },
];

export const fieldTasks: FieldTask[] = [
  { id: "TSK-4401", title: "Thermal inspection", column: "Pending Assignment", priority: "Critical", owner: "Field dispatch", asset: "AD-BRG-014", due: "01:20" },
  { id: "TSK-4402", title: "Camera calibration", column: "Pending Execution", priority: "Medium", owner: "Verification team", asset: "AD-DWT-011", due: "03:00" },
  { id: "TSK-4403", title: "Edge controller restart", column: "In Progress", priority: "High", owner: "NOC operator", asset: "AD-HWY-009", due: "00:55" },
  { id: "TSK-4404", title: "Monthly brightness audit", column: "Completed", priority: "Low", owner: "Maintenance team", asset: "AD-HWY-001", due: "Yesterday" },
  { id: "TSK-4405", title: "Backup power test", column: "Overdue", priority: "High", owner: "O&M admin", asset: "AD-BUS-022", due: "Yesterday" },
  { id: "TSK-4406", title: "Fan kit replacement", column: "Pending Assignment", priority: "High", owner: "Maintenance planner", asset: "AD-HWY-001", due: "02:10" },
  { id: "TSK-4407", title: "Moisture sensor verification", column: "Pending Assignment", priority: "Medium", owner: "NOC operator", asset: "AD-HWY-009", due: "04:30" },
  { id: "TSK-4408", title: "Door gasket replacement", column: "Pending Execution", priority: "Medium", owner: "Field technician", asset: "AD-BRG-014", due: "Today 18:00" },
  { id: "TSK-4409", title: "PSU ripple measurement", column: "Pending Execution", priority: "Critical", owner: "Electrical team", asset: "AD-HWY-001", due: "Today 20:00" },
  { id: "TSK-4410", title: "Router warranty swap", column: "In Progress", priority: "Medium", owner: "Vendor manager", asset: "AD-DWT-011", due: "Tomorrow" },
  { id: "TSK-4411", title: "Panel pixel batch test", column: "In Progress", priority: "Low", owner: "Depot QA", asset: "AD-AIN-052", due: "Tomorrow" },
  { id: "TSK-4412", title: "Night luminance validation", column: "Completed", priority: "Low", owner: "Verification team", asset: "AD-HWY-001", due: "Yesterday" },
  { id: "TSK-4413", title: "Emergency UPS runtime test", column: "Completed", priority: "Medium", owner: "O&M admin", asset: "AD-BRG-014", due: "Jun 30" },
  { id: "TSK-4414", title: "Unlatched cabinet closure", column: "Overdue", priority: "Critical", owner: "Field dispatch", asset: "AD-HWY-001", due: "2h overdue" },
  { id: "TSK-4415", title: "Signal loss root-cause review", column: "Overdue", priority: "High", owner: "Network operations", asset: "AD-HWY-009", due: "Yesterday" },
];

export const mediaAssets: MediaAsset[] = [
  { id: "MED-001", title: "Holiday notice master", type: "Image", tags: ["public", "arabic-ready", "holiday"], status: "Pending Review", owner: "DMT Communications", updated: "00:16" },
  { id: "MED-002", title: "Weather alert video loop", type: "Video", tags: ["emergency", "cap-uae"], status: "Approved", owner: "NCEMA gateway", updated: "23:49" },
  { id: "MED-003", title: "Retail launch hero", type: "Image", tags: ["commercial", "airport"], status: "Rejected", owner: "Retail advertiser", updated: "22:30" },
  { id: "MED-004", title: "Yas live stream slate", type: "Live Stream", tags: ["tourism", "hls"], status: "Approved", owner: "Yas Tourism", updated: "21:14" },
  { id: "MED-005", title: "CSC evidence pack", type: "Document", tags: ["governance", "security"], status: "Approved", owner: "Security PMO", updated: "20:04" },
  { id: "MED-006", title: "Eid family retail banner", type: "Image", tags: ["retail", "holiday", "family"], status: "Approved", owner: "Retail Majlis", updated: "19:42" },
  { id: "MED-007", title: "Abu Dhabi duty free logo pack", type: "Image", tags: ["airport", "brand", "bilingual"], status: "Approved", owner: "Airport Retail", updated: "18:36" },
  { id: "MED-008", title: "Yas Island coaster creative", type: "Image", tags: ["tourism", "yas", "leisure"], status: "Approved", owner: "Yas Tourism", updated: "18:05" },
  { id: "MED-009", title: "Coca-Cola national day creative", type: "Image", tags: ["commercial", "national-day", "beverage"], status: "Pending Review", owner: "Beverage advertiser", updated: "17:44" },
  { id: "MED-010", title: "Experience Abu Dhabi desert visual", type: "Image", tags: ["tourism", "destination", "desert"], status: "Approved", owner: "Tourism partner", updated: "16:10" },
  { id: "MED-011", title: "Ramadan Kareem campaign board", type: "Image", tags: ["ramadan", "cultural", "bilingual"], status: "Pending Review", owner: "Civic studio", updated: "15:52" },
  { id: "MED-012", title: "Royal safari destination banner", type: "Image", tags: ["tourism", "desert", "premium"], status: "Approved", owner: "Destination partner", updated: "14:20" },
];

export const aiAudits: AiAudit[] = [
  { id: "AI-771", file: "holiday-notice-master.png", verdict: "Needs Human Review", confidence: "98.1%", category: "Public messaging", reviewer: "MRO reviewer" },
  { id: "AI-772", file: "weather-alert-loop.mp4", verdict: "Approved", confidence: "100%", category: "Emergency", reviewer: "Auto + dual control" },
  { id: "AI-773", file: "retail-launch-hero.jpg", verdict: "Rejected", confidence: "72.3%", category: "Sensitive claim", reviewer: "Commercial reviewer" },
  { id: "AI-774", file: "yas-live-stream.m3u8", verdict: "Approved", confidence: "96.8%", category: "Live stream", reviewer: "Media ops" },
];

export const dataAssets: DataAsset[] = [
  { id: "DATA-001", name: "Playback evidence lake", type: "Iceberg table", records: "48.2M", owner: "Data platform", usage: "PoP reconciliation" },
  { id: "DATA-002", name: "Audience aggregate stream", type: "Anonymized events", records: "9.8M", owner: "AI platform", usage: "Yield optimization" },
  { id: "DATA-003", name: "Asset telemetry catalog", type: "Time-series", records: "86.4M", owner: "NOC", usage: "Alarm analysis" },
  { id: "DATA-004", name: "Media metadata graph", type: "Knowledge graph", records: "15.8k", owner: "CMS", usage: "Search and compliance" },
];

export const processTemplates = [
  { title: "Content approval process", used: "98", status: "Active" },
  { title: "Scheduled publishing", used: "76", status: "Active" },
  { title: "Emergency content update", used: "15", status: "Locked" },
  { title: "Media transcoding and publishing", used: "124", status: "Active" },
];

export const milestones: Milestone[] = [
  { phase: "Phase 1", title: "CMS core and content lifecycle", window: "M1-M8", status: "Active" },
  { phase: "Phase 1", title: "Control centre fit-out and video wall", window: "M3-M8", status: "Active" },
  { phase: "Phase 2", title: "Edge AI rollout and camera PoP", window: "M9-M14", status: "Planned" },
  { phase: "Phase 2", title: "CAP-UAE gateway and audience analytics", window: "M11-M15", status: "Planned" },
  { phase: "Phase 3", title: "TAMM, DSP, CSC and full handover", window: "M15-M20", status: "Planned" },
];

export const evidenceRecords: EvidenceRecord[] = [
  { id: "EV-001", control: "UAE IA v2.1 control matrix", owner: "Security PMO", status: "Collecting", due: "M14" },
  { id: "EV-002", control: "CSC sensitive component approval", owner: "Architecture", status: "Gap", due: "M16" },
  { id: "EV-003", control: "Source code and IP transfer pack", owner: "Delivery office", status: "Ready", due: "M18" },
  { id: "EV-004", control: "Training and onboarding evidence", owner: "Capability team", status: "Collecting", due: "M19" },
  { id: "EV-005", control: "Operational life records retention", owner: "Governance", status: "Ready", due: "M20" },
];

export const trainingRows = [
  { audience: "Command operators", duration: "5 days", objective: "Estate monitoring, GIS dispatch, emergency override" },
  { audience: "Content reviewers", duration: "4 days", objective: "AI audit, dual-control approvals, Arabic-ready publishing" },
  { audience: "Field and NOC teams", duration: "6 days", objective: "Edge health, alarms, OTA, sensor-driven tasks" },
  { audience: "Advertiser operations", duration: "2 days", objective: "Campaign setup, proof-of-play, settlement evidence" },
];

/* ------------------------------------------------------------------ *\
 * Reach & Audience - the value-of-exposure profile for each placement.
\* ------------------------------------------------------------------ */
export const audienceProfiles: AudienceProfile[] = [
  {
    assetId: "AD-HWY-001",
    weeklyImpressions: "412k",
    dwell: "8.4s avg dwell",
    peakDaypart: "07:00-09:00",
    avgSpend: "AED 86 CPM",
    recall: "62% aided recall",
    demographics: [
      { label: "Commuters", value: 44 },
      { label: "Residents", value: 31 },
      { label: "Tourists", value: 25 },
    ],
    dayparts: [
      { label: "Morning", value: 86 },
      { label: "Midday", value: 58 },
      { label: "Evening", value: 92 },
      { label: "Night", value: 41 },
    ],
    history: [
      { campaign: "Airport route conversion", advertiser: "Etihad Guest", lift: "+18%", plays: "18,420" },
      { campaign: "Road safety civic", advertiser: "Abu Dhabi Police", lift: "+9%", plays: "12,900" },
    ],
  },
  {
    assetId: "AD-DWT-011",
    weeklyImpressions: "304k",
    dwell: "12.1s avg dwell",
    peakDaypart: "17:00-21:00",
    avgSpend: "AED 74 CPM",
    recall: "57% aided recall",
    demographics: [
      { label: "Shoppers", value: 52 },
      { label: "Families", value: 28 },
      { label: "Youth", value: 20 },
    ],
    dayparts: [
      { label: "Morning", value: 40 },
      { label: "Midday", value: 70 },
      { label: "Evening", value: 96 },
      { label: "Night", value: 64 },
    ],
    history: [
      { campaign: "Mall footfall lift", advertiser: "Retail Majlis", lift: "+22%", plays: "12,004" },
      { campaign: "Season sale", advertiser: "Downtown Commerce", lift: "+14%", plays: "9,560" },
    ],
  },
  {
    assetId: "AD-BUS-022",
    weeklyImpressions: "121k",
    dwell: "21.5s avg dwell",
    peakDaypart: "10:00-14:00",
    avgSpend: "AED 58 CPM",
    recall: "49% aided recall",
    demographics: [
      { label: "Tourists", value: 48 },
      { label: "Leisure", value: 33 },
      { label: "Residents", value: 19 },
    ],
    dayparts: [
      { label: "Morning", value: 52 },
      { label: "Midday", value: 88 },
      { label: "Evening", value: 76 },
      { label: "Night", value: 60 },
    ],
    history: [
      { campaign: "Weekend event attendance", advertiser: "Yas Tourism", lift: "+27%", plays: "8,117" },
    ],
  },
  {
    assetId: "AD-BRG-014",
    weeklyImpressions: "286k",
    dwell: "6.2s avg dwell",
    peakDaypart: "06:00-08:00",
    avgSpend: "AED 64 CPM",
    recall: "44% aided recall",
    demographics: [
      { label: "Logistics", value: 46 },
      { label: "Commuters", value: 38 },
      { label: "Fleet drivers", value: 16 },
    ],
    dayparts: [
      { label: "Morning", value: 94 },
      { label: "Midday", value: 62 },
      { label: "Evening", value: 70 },
      { label: "Night", value: 48 },
    ],
    history: [
      { campaign: "Industrial safety", advertiser: "DMT", lift: "+11%", plays: "10,210" },
    ],
  },
];

/* ------------------------------------------------------------------ *\
 * Settings - users, roles and module access.
\* ------------------------------------------------------------------ */
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
}

export const platformUsers: PlatformUser[] = [
  { id: "USR-01", name: "Layla Al Mansoori", email: "l.mansoori@dmt.gov.ae", role: "Administrator", department: "DMT Communications", status: "Active", lastActive: "2 min ago" },
  { id: "USR-02", name: "Omar Haddad", email: "o.haddad@noc.dooh.ae", role: "Operations", department: "Network Operations", status: "Active", lastActive: "18 min ago" },
  { id: "USR-03", name: "Sara Khalil", email: "s.khalil@dmt.gov.ae", role: "Content Reviewer", department: "Content Assurance", status: "Active", lastActive: "1 hr ago" },
  { id: "USR-04", name: "Yousef Karam", email: "y.karam@commercial.dooh.ae", role: "Commercial", department: "Commercial Desk", status: "Active", lastActive: "3 hr ago" },
  { id: "USR-05", name: "Mariam Nasser", email: "m.nasser@ncema.gov.ae", role: "Emergency Officer", department: "NCEMA Gateway", status: "Invited", lastActive: "Pending" },
  { id: "USR-06", name: "Field Audit Bot", email: "audit@ai.dooh.ae", role: "Viewer", department: "AI Platform", status: "Suspended", lastActive: "Yesterday" },
];

export interface RoleDef {
  name: string;
  description: string;
  access: Page[];
  manageUsers: boolean;
}

export const roleDefs: RoleDef[] = [
  { name: "Administrator", description: "Full platform control and user management", access: ["control", "cms", "devices", "commercial", "ai"], manageUsers: true },
  { name: "Operations", description: "Control centre, devices and live monitoring", access: ["control", "devices"], manageUsers: false },
  { name: "Content Reviewer", description: "Submissions, media and approval workflow", access: ["cms"], manageUsers: false },
  { name: "Commercial", description: "Campaigns, bidding and settlement", access: ["commercial", "cms"], manageUsers: false },
  { name: "Emergency Officer", description: "Control centre and emergency broadcast", access: ["control"], manageUsers: false },
  { name: "Viewer", description: "Read-only access to monitoring dashboards", access: ["control"], manageUsers: false },
];

/* ------------------------------------------------------------------ *\
 * AI Monitoring - models, skills, audit and token consumption.
\* ------------------------------------------------------------------ */
export interface AiModel {
  id: string;
  name: string;
  purpose: string;
  version: string;
  status: "Serving" | "Shadow" | "Retraining";
  latency: string;
  accuracy: string;
}

export const aiModels: AiModel[] = [
  { id: "MDL-01", name: "Content Safety Classifier", purpose: "Brand-safety and sensitive content screening", version: "v3.2", status: "Serving", latency: "120 ms", accuracy: "98.1%" },
  { id: "MDL-02", name: "Arabic Copy Reviewer", purpose: "Bilingual layout and copy compliance", version: "v2.4", status: "Serving", latency: "180 ms", accuracy: "96.4%" },
  { id: "MDL-03", name: "PoP Camera Matcher", purpose: "Proof-of-play camera-to-log reconciliation", version: "v1.9", status: "Serving", latency: "95 ms", accuracy: "99.2%" },
  { id: "MDL-04", name: "Audience Estimator", purpose: "Anonymised reach and dwell estimation", version: "v4.1", status: "Shadow", latency: "60 ms", accuracy: "92.7%" },
  { id: "MDL-05", name: "Yield Optimiser", purpose: "Programmatic bid and inventory pricing", version: "v2.0", status: "Retraining", latency: "-", accuracy: "-" },
];

export interface AiSkill {
  id: string;
  name: string;
  trigger: string;
  autonomy: "Auto" | "Human-in-loop" | "Locked";
  runs: string;
  status: "Active" | "Paused";
}

export const aiSkills: AiSkill[] = [
  { id: "SK-01", name: "Submission triage", trigger: "On new submission", autonomy: "Auto", runs: "1,284", status: "Active" },
  { id: "SK-02", name: "Bilingual proofing", trigger: "Before dual control", autonomy: "Human-in-loop", runs: "942", status: "Active" },
  { id: "SK-03", name: "Emergency payload check", trigger: "On CAP-UAE alert", autonomy: "Human-in-loop", runs: "37", status: "Active" },
  { id: "SK-04", name: "Anomaly alarm correlation", trigger: "On sensor spike", autonomy: "Auto", runs: "6,401", status: "Active" },
  { id: "SK-05", name: "Auto-settlement draft", trigger: "On signed PoP batch", autonomy: "Locked", runs: "0", status: "Paused" },
];

export const tokenSeries = [
  { label: "Mon", value: 58 },
  { label: "Tue", value: 72 },
  { label: "Wed", value: 64 },
  { label: "Thu", value: 88 },
  { label: "Fri", value: 95 },
  { label: "Sat", value: 47 },
  { label: "Sun", value: 39 },
];

/* ------------------------------------------------------------------ *\
 * Commercial - invoicing and payments.
\* ------------------------------------------------------------------ */
export interface Invoice {
  id: string;
  advertiser: string;
  period: string;
  amount: string;
  status: "Paid" | "Due" | "Overdue";
  issued: string;
}

export const invoices: Invoice[] = [
  { id: "INV-2026-0412", advertiser: "Etihad Guest Retail", period: "Jun 2026", amount: "AED 92,800", status: "Paid", issued: "Jun 18" },
  { id: "INV-2026-0413", advertiser: "Yas Tourism", period: "Jun 2026", amount: "AED 31,400", status: "Due", issued: "Jun 19" },
  { id: "INV-2026-0414", advertiser: "Retail Majlis", period: "May 2026", amount: "AED 24,600", status: "Overdue", issued: "Jun 02" },
  { id: "INV-2026-0415", advertiser: "Downtown Commerce", period: "Jun 2026", amount: "AED 18,250", status: "Due", issued: "Jun 20" },
];


/* ------------------------------------------------------------------ *\
 * AI-native architecture (deck slide: "One AI Architecture, End to End")
\* ------------------------------------------------------------------ */
export interface AiTier {
  name: string;
  tagline: string;
  icon: string;
}
export const aiTiers: AiTier[] = [
  { name: "Sensor AI", tagline: "Perception at the source", icon: "sensor" },
  { name: "Edge AI", tagline: "Local inference & safety", icon: "edge" },
  { name: "Platform AI", tagline: "Moderation, optimisation & insight", icon: "platform" },
  { name: "Control AI", tagline: "Autonomous ops & dispatch", icon: "control" },
];

export interface AiCapability {
  n: number;
  title: string;
  tech: string;
  desc: string;
  tier: string;
}
export const aiCapabilities: AiCapability[] = [
  { n: 1, title: "Generative Studio", tech: "VLM", desc: "Generates and localises creative", tier: "Platform AI" },
  { n: 2, title: "Zero-Trust Screening", tech: "VLM", desc: "Brand safety and deepfake content defence", tier: "Platform AI" },
  { n: 3, title: "Cognitive Scheduling", tech: "AI Agents", desc: "Slots content by context and yield", tier: "Control AI" },
  { n: 4, title: "Predictive Distribution", tech: "AI Agents", desc: "Just-in-time edge pre-cache", tier: "Edge AI" },
  { n: 5, title: "Context-Aware Playback", tech: "Edge VLM", desc: "Adapts to scene, speed and light", tier: "Edge AI" },
  { n: 6, title: "Autonomous Alerting", tech: "AI Agents", desc: "Routes and translates CAP-UAE fast", tier: "Control AI" },
  { n: 7, title: "Audience Intelligence", tech: "Edge VLM", desc: "Anonymised reach and dwell", tier: "Sensor AI" },
  { n: 8, title: "Yield Autopilot", tech: "Self-learning", desc: "Maximises revenue per screen", tier: "Platform AI" },
];

export interface AiService {
  name: string;
  icon: string;
  desc: string;
  tags: string[];
}
export const coreAiServices: AiService[] = [
  {
    name: "AI Agents",
    icon: "agents",
    desc: "Autonomous agents triage incidents, orchestrate emergency alerts and dispatch field teams - and answer operators in natural language against live data.",
    tags: ["Autonomous ops", "Emergency orchestration", "NLQ ask-data"],
  },
  {
    name: "Vision-Language Models",
    icon: "vlm",
    desc: "Context-aware understanding of image, video and bilingual text powers moderation, brand and scene compliance, and content generation.",
    tags: ["Moderation", "Deepfake defence", "Generative creative"],
  },
];
export const foundationalAi: AiService[] = [
  {
    name: "AI Governance",
    icon: "governance",
    desc: "Model registry, training-data provenance, adversarial-AI testing, human-in-the-loop approval and 100% in-country inference for UAE data.",
    tags: ["Registry", "Provenance", "Adversarial test", "In-country"],
  },
  {
    name: "AI Model Management",
    icon: "modelmgmt",
    desc: "Versioning, canary rollout and zero-downtime hot-upgrade across the fleet, with federated continuous learning so models keep improving.",
    tags: ["Versioning", "Canary rollout", "Hot-upgrade", "Federated learning"],
  },
];

/* ------------------------------------------------------------------ *\
 * Programmatic marketplace closed loop (deck slide: "Audited DOOH")
\* ------------------------------------------------------------------ */
export interface LoopStep {
  step: string;
  title: string;
  desc: string;
  icon: string;
}
export const marketplaceLoop: LoopStep[] = [
  { step: "1", title: "Bid", desc: "SSP / DSP real-time bidding", icon: "bid" },
  { step: "2", title: "Play", desc: "Edge-rendered, rules-governed", icon: "play" },
  { step: "3", title: "Prove", desc: "TPM-signed Proof-of-Play", icon: "prove" },
  { step: "4", title: "Attribute", desc: "Audience-measured exposure", icon: "attribute" },
];

export interface Unlock {
  title: string;
  desc: string;
  icon: string;
}
export const marketplaceUnlocks: Unlock[] = [
  { title: "New revenue stream", desc: "Region-first programmatic public-screen inventory", icon: "revenue" },
  { title: "Real-time yield", desc: "AI pricing lifts revenue per screen", icon: "yield" },
  { title: "Dispute-proof settlement", desc: "Billing reconciled on cryptographic evidence", icon: "settle" },
  { title: "Advertiser-grade proof", desc: "Transparent, audience-standard measurement", icon: "proof" },
];

export interface TimeAllocation {
  commercial: number;
  publicReserve: number;
  pricingModels: string[];
}
export const timeAllocation: TimeAllocation = {
  commercial: 78,
  publicReserve: 22,
  pricingModels: ["Fixed-rate time-slot", "Auction / RTB", "Guaranteed delivery"],
};

/* ------------------------------------------------------------------ *\
 * 3rd-party integrations and E2E security (deck slide: architecture)
\* ------------------------------------------------------------------ */
export interface Integration {
  name: string;
  category: string;
  status: "Connected" | "Provisioned" | "Planned";
}
export const integrations: Integration[] = [
  { name: "UAE PASS (Government IAM / SSO)", category: "Identity", status: "Connected" },
  { name: "NCEMA CAP-UAE Alert Origination", category: "Emergency", status: "Connected" },
  { name: "DMT Platform of Platforms", category: "Government", status: "Connected" },
  { name: "TAMM Services", category: "Government", status: "Provisioned" },
  { name: "Finance / ERP Systems", category: "Finance", status: "Connected" },
  { name: "Enterprise ITSM", category: "Operations", status: "Connected" },
  { name: "National SOC (NSOC)", category: "Security", status: "Provisioned" },
  { name: "SIEM", category: "Security", status: "Connected" },
  { name: "National Cyber Index (NCI)", category: "Security", status: "Planned" },
  { name: "Permits / Licensing Systems", category: "Government", status: "Provisioned" },
];

export const securityControls: string[] = [
  "RBAC",
  "MFA",
  "Least Privilege",
  "Duty Segregation",
  "Data Encryption",
  "Tamper-evident Audit",
  "WAF",
  "IPSec IKEv2 VPN",
  "HSM Key Infrastructure",
  "UAE CSC Compliance Pack",
  "Privacy-by-design",
  "Container Security",
  "Threat Intelligence",
  "Coordinated Disclosure",
];

/* ------------------------------------------------------------------ *\
 * AI activity - a live log of the actions AI takes across the platform.
\* ------------------------------------------------------------------ */
export interface AiAction {
  id: string;
  action: string;
  target: string;
  tier: string;
  confidence: string;
  time: string;
  tone: Tone;
}
export const aiActivity: AiAction[] = [
  { id: "AIA-1", action: "Screened submission", target: "Holiday public notice - brand-safe, Arabic-first verified", tier: "Platform AI", confidence: "98%", time: "Just now", tone: "good" },
  { id: "AIA-2", action: "Flagged deepfake risk", target: "Retail launch hero - routed to human review", tier: "Platform AI", confidence: "72%", time: "2 min ago", tone: "watch" },
  { id: "AIA-3", action: "Translated CAP-UAE alert", target: "Weather alert - AR/EN generated in 1.2s", tier: "Control AI", confidence: "100%", time: "6 min ago", tone: "critical" },
  { id: "AIA-4", action: "Pre-cached creative", target: "Yas tourism loop - pushed to 6 edge nodes", tier: "Edge AI", confidence: "-", time: "11 min ago", tone: "info" },
  { id: "AIA-5", action: "Optimised yield", target: "Airport route - CPM raised +7% on forecast fill", tier: "Platform AI", confidence: "91%", time: "18 min ago", tone: "good" },
  { id: "AIA-6", action: "Correlated alarm", target: "Mussafah temp sensor - dispatch recommended", tier: "Sensor AI", confidence: "96%", time: "24 min ago", tone: "watch" },
  { id: "AIA-7", action: "Estimated audience", target: "Downtown Mall - 304k weekly, 12.1s dwell", tier: "Edge AI", confidence: "93%", time: "31 min ago", tone: "info" },
];

/* ------------------------------------------------------------------ *\
 * Reporting - dashboards, SLA, compliance and report generation.
\* ------------------------------------------------------------------ */
export interface ReportDef {
  id: string;
  name: string;
  type: string;
  cadence: string;
  status: "Ready" | "Scheduled" | "Generating";
  updated: string;
}
export const reports: ReportDef[] = [
  { id: "RPT-01", name: "Operational health summary", type: "Operations", cadence: "Daily", status: "Ready", updated: "06:00" },
  { id: "RPT-02", name: "Executive performance brief", type: "Executive", cadence: "Weekly", status: "Ready", updated: "Mon 08:00" },
  { id: "RPT-03", name: "SLA compliance report", type: "Operations", cadence: "Monthly", status: "Scheduled", updated: "Jul 01" },
  { id: "RPT-04", name: "Regulatory compliance pack", type: "Compliance", cadence: "Monthly", status: "Generating", updated: "In progress" },
  { id: "RPT-05", name: "Proof-of-play evidence export", type: "Commercial", cadence: "Ad-hoc", status: "Ready", updated: "Yesterday" },
  { id: "RPT-06", name: "Audience & reach analytics", type: "Commercial", cadence: "Weekly", status: "Ready", updated: "Sun 20:00" },
];

export const reportMetrics = [
  { label: "Reports this month", value: "184", helper: "Across 6 templates", tone: "info" as Tone },
  { label: "SLA compliance", value: "99.4%", helper: "Against operational SLAs", tone: "good" as Tone },
  { label: "Regulatory status", value: "On track", helper: "UAE IA v2.1 evidence", tone: "good" as Tone },
  { label: "Pending reviews", value: "3", helper: "Awaiting sign-off", tone: "watch" as Tone },
];

/* ------------------------------------------------------------------ *\
 * AI agents - first-class autonomous workers across the DOOH estate.
\* ------------------------------------------------------------------ */
export interface AiAgent {
  id: string;
  name: string;
  role: string;
  tier: "Sensor AI" | "Edge AI" | "Platform AI" | "Control AI";
  autonomy: "Auto" | "Human-in-loop" | "Locked";
  model: string;
  tools: string[];
  runs: string;
  accuracy: string;
  escalations: string;
  status: "Active" | "Paused";
  lastAction: string;
}

export const aiAgents: AiAgent[] = [
  {
    id: "AG-TRIAGE",
    name: "Submission Triage Agent",
    role: "Screens every incoming ad submission for brand safety, sensitive content and policy fit, then routes it down the publishing lifecycle.",
    tier: "Platform AI",
    autonomy: "Auto",
    model: "Content Safety Classifier v3.2",
    tools: ["Brand-safety scan", "Sensitive-content detector", "Policy matcher", "Stage router"],
    runs: "1,284",
    accuracy: "98.1%",
    escalations: "31 to human",
    status: "Active",
    lastAction: "Screened ‘Holiday public notice’ - brand-safe, routed to Agency review",
  },
  {
    id: "AG-PROOF",
    name: "Bilingual Proofing Agent",
    role: "Verifies Arabic-first layout, bidirectional text and copy compliance before dual-control approval.",
    tier: "Platform AI",
    autonomy: "Human-in-loop",
    model: "Arabic Copy Reviewer v2.4",
    tools: ["RTL layout check", "Glyph shaping", "Copy compliance", "Translation parity"],
    runs: "942",
    accuracy: "96.4%",
    escalations: "58 to human",
    status: "Active",
    lastAction: "Flagged truncation risk on ‘New product launch’ - sent to content reviewer",
  },
  {
    id: "AG-EMERGENCY",
    name: "Emergency Orchestration Agent",
    role: "Ingests NCEMA CAP-UAE alerts, translates AR/EN, validates authority and arms the protected estate-wide broadcast path.",
    tier: "Control AI",
    autonomy: "Human-in-loop",
    model: "CAP-UAE Orchestrator v1.6",
    tools: ["CAP-UAE parser", "AR/EN generator", "Authority validator", "Edge broadcast"],
    runs: "37",
    accuracy: "100%",
    escalations: "37 dual-control",
    status: "Active",
    lastAction: "Translated weather alert AR/EN in 1.2s - awaiting dual-control authority",
  },
  {
    id: "AG-ALARM",
    name: "Alarm Correlation Agent",
    role: "Correlates edge sensor telemetry into alarms, deduplicates noise and recommends field dispatch.",
    tier: "Sensor AI",
    autonomy: "Auto",
    model: "Anomaly Correlator v2.0",
    tools: ["Telemetry stream", "Anomaly model", "Dedup engine", "Dispatch recommender"],
    runs: "6,401",
    accuracy: "96.0%",
    escalations: "12 to NOC",
    status: "Active",
    lastAction: "Correlated Mussafah temperature spike - recommended field inspection",
  },
  {
    id: "AG-EDGE",
    name: "Edge Distribution Agent",
    role: "Predicts demand and pre-caches approved creatives to edge nodes just-in-time, and drives OTA canary rollouts.",
    tier: "Edge AI",
    autonomy: "Auto",
    model: "Distribution Planner v1.9",
    tools: ["Demand forecast", "Edge pre-cache", "OTA canary", "Rollback guard"],
    runs: "3,920",
    accuracy: "99.0%",
    escalations: "4 to field",
    status: "Active",
    lastAction: "Pre-cached ‘Yas tourism loop’ to 6 edge nodes ahead of peak",
  },
  {
    id: "AG-AUDIENCE",
    name: "Audience Intelligence Agent",
    role: "Estimates anonymised reach, dwell and demographics at the edge - zero PII leaves the device.",
    tier: "Edge AI",
    autonomy: "Auto",
    model: "Audience Estimator v4.1",
    tools: ["Anonymised vision", "Dwell model", "Reach aggregator", "Privacy filter"],
    runs: "12,540",
    accuracy: "92.7%",
    escalations: "0",
    status: "Active",
    lastAction: "Estimated Downtown Mall reach - 304k weekly, 12.1s dwell",
  },
  {
    id: "AG-YIELD",
    name: "Yield Autopilot Agent",
    role: "Optimises programmatic pricing and inventory fill per screen, with civic-reserve protection.",
    tier: "Platform AI",
    autonomy: "Locked",
    model: "Yield Optimiser v2.0",
    tools: ["Bid forecaster", "CPM optimiser", "Civic-reserve guard", "Settlement drafter"],
    runs: "0",
    accuracy: "-",
    escalations: "-",
    status: "Paused",
    lastAction: "Retraining on Q2 fill data - awaiting governance sign-off",
  },
];

export interface AgentDecision {
  id: string;
  agentId: string;
  trigger: string;
  status: "Completed" | "Awaiting approval" | "Failed" | "Running";
  confidence: string;
  steps: Array<{ tool: string; state: "ok" | "pending" | "error" }>;
  tokens: string;
  latency: string;
  time: string;
}

export const agentDecisions: AgentDecision[] = [
  { id: "DEC-9001", agentId: "AG-TRIAGE", trigger: "New submission | Holiday public notice", status: "Completed", confidence: "98%", steps: [{ tool: "Brand-safety scan", state: "ok" }, { tool: "Sensitive-content detector", state: "ok" }, { tool: "Stage router", state: "ok" }], tokens: "2,450", latency: "120 ms", time: "Just now" },
  { id: "DEC-9002", agentId: "AG-TRIAGE", trigger: "New submission | Retail launch hero", status: "Awaiting approval", confidence: "72%", steps: [{ tool: "Brand-safety scan", state: "ok" }, { tool: "Sensitive-content detector", state: "error" }, { tool: "Stage router", state: "pending" }], tokens: "2,980", latency: "180 ms", time: "2 min ago" },
  { id: "DEC-9003", agentId: "AG-PROOF", trigger: "Pre dual-control | New product launch", status: "Awaiting approval", confidence: "88%", steps: [{ tool: "RTL layout check", state: "ok" }, { tool: "Copy compliance", state: "error" }], tokens: "1,910", latency: "210 ms", time: "8 min ago" },
  { id: "DEC-9004", agentId: "AG-EMERGENCY", trigger: "CAP-UAE alert | Weather warning", status: "Awaiting approval", confidence: "100%", steps: [{ tool: "CAP-UAE parser", state: "ok" }, { tool: "AR/EN generator", state: "ok" }, { tool: "Authority validator", state: "pending" }], tokens: "3,120", latency: "1.2 s", time: "6 min ago" },
  { id: "DEC-9005", agentId: "AG-ALARM", trigger: "Sensor spike | Mussafah AD-BRG-014", status: "Completed", confidence: "96%", steps: [{ tool: "Anomaly model", state: "ok" }, { tool: "Dedup engine", state: "ok" }, { tool: "Dispatch recommender", state: "ok" }], tokens: "1,240", latency: "95 ms", time: "24 min ago" },
  { id: "DEC-9006", agentId: "AG-EDGE", trigger: "Peak forecast | Yas Island", status: "Completed", confidence: "99%", steps: [{ tool: "Demand forecast", state: "ok" }, { tool: "Edge pre-cache", state: "ok" }], tokens: "880", latency: "60 ms", time: "11 min ago" },
  { id: "DEC-9007", agentId: "AG-AUDIENCE", trigger: "Hourly estimate | Downtown Mall", status: "Completed", confidence: "93%", steps: [{ tool: "Anonymised vision", state: "ok" }, { tool: "Privacy filter", state: "ok" }, { tool: "Reach aggregator", state: "ok" }], tokens: "1,020", latency: "70 ms", time: "31 min ago" },
];
