import {
  Activity,
  AlertTriangle,
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
  ShieldAlert,
  ShieldCheck,
  Eye,
  Lightbulb,
  PenTool,
  Terminal,
  ShoppingBag,
  Sparkles,
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
import { createContext, FormEvent, Fragment, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  assets as estateAssets,
  fieldTasks,
  mediaAssets as seedMediaAssets,
  scheduleSlots,
  tickets,
  type Asset,
  type MediaAsset,
} from "./data";
import { creativeBackground, feedBackground, LiveMap } from "./visuals";
import admoLogo from "./assets/admo-logo.png";
import origenGreenIcon from "./assets/origen-green-icon.png";
import "./dooh-styles.css";

type Page =
  | "control"
  | "cms"
  | "alerts"
  | "network"
  | "mediagpt"
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
  | "campaigns"
  | "marketplace";

type ProfileId = "control-room" | "reviewer" | "finance" | "admin" | "technical" | "bidder";
type Lang = "en" | "ar";
type Tone = "neutral" | "good" | "warn" | "danger" | "info";
type CmsTab = "submissions" | "library" | "scheduling";
type SubmissionStage = "Submitted" | "In review" | "Approved" | "Scheduled" | "Published" | "Changes requested";
type AlertState = "Check required" | "Checked" | "Approval required" | "Broadcast queued" | "Broadcasting" | "Live on network";

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
  language: string;
  notes: string;
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

interface DoohStatePayload {
  submissions: Submission[];
  campaigns: BidderCampaign[];
  bidderMessages: BidderCommunication[];
  schedule: ScheduleItem[];
  published: PublishedItem[];
  auctions: AuctionLot[];
  bids: BidRecord[];
  alerts: EmergencyAlert[];
  verificationSteps: VerificationStep[];
  financeApprovals: FinanceApproval[];
  activity: ActivityItem[];
  notifications: PlatformNotification[];
}

const profiles: Profile[] = [
  {
    id: "control-room",
    name: "ADMO Control Room",
    role: "Operations operator",
    organization: "Abu Dhabi Media Office",
    pages: ["control", "alerts", "network", "mediagpt"],
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
    pages: ["financials", "control"],
  },
  {
    id: "admin",
    name: "Platform Admin",
    role: "Platform governance",
    organization: "Abu Dhabi Media Office",
    pages: ["control", "cms", "alerts", "network", "financials", "mediagpt", "knowledge", "rules", "skillsCatalogue", "skillWorkflows", "skillRuns", "modelCenter", "integrations", "accessRoles", "auditLog", "edgeCompute"],
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
  mediagpt: { id: "mediagpt", label: "MediaGPT", icon: Bot },
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

const navGroups: NavGroup[] = [
  { label: "Operational", pages: ["control", "cms", "alerts", "network", "financials"] },
  { label: "Intelligence / Agentic", pages: ["mediagpt", "knowledge"] },
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
    network: "12 panels · Corniche, Airport Road",
    flightWindow: "Jul 20 - Aug 03, 2026",
    impressions: "1.4M weekly",
    floorPrice: 380000,
    currentBid: 442000,
    leadingBidder: "Yas Tourism",
    minIncrement: 5000,
    bidCount: 7,
    closesAt: "Jul 04, 2026 · 18:00",
    creativeId: "etihad-retail",
    currency: "AED",
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
    closesAt: "Jul 03, 2026 · 12:00",
    creativeId: "mall-footfall",
    currency: "AED",
  },
  {
    id: "LOT-4402",
    lotName: "Yas leisure loop - summer flight",
    packageName: "Yas leisure loop",
    network: "9 panels · Yas Island & hotel corridor",
    flightWindow: "Jul 15 - Aug 15, 2026",
    impressions: "620k weekly",
    floorPrice: 210000,
    currentBid: 210000,
    leadingBidder: "No bids yet",
    minIncrement: 5000,
    bidCount: 0,
    closesAt: "Jul 05, 2026 · 20:00",
    creativeId: "yas-tourism",
    currency: "AED",
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
  "Elevated": "مرتفع",
  "Rate card overrides": "استثناءات بطاقة الأسعار",
  "MediaGPT deep-scan": "الفحص العميق من ميديا جي بي تي",
  "Re-run scan": "إعادة تشغيل الفحص",
  "Open deep scan": "فتح الفحص العميق",
  "Hide deep scan": "إخفاء الفحص العميق",
  "AI recommendation": "توصية الذكاء الاصطناعي",
  "Request bidder changes": "طلب تعديلات من المعلن",
  "Prepare bidder message": "إعداد رسالة للمعلن",
  "Send revision request": "إرسال طلب تعديل",
  "Bidder communication": "مراسلة المعلن",
  "Message is sent to the advertiser workspace and updates the campaign status.": "يتم إرسال الرسالة إلى مساحة عمل المعلن وتحديث حالة الحملة.",
  "Message to bidder": "الرسالة إلى المعلن",
  "This will mark the campaign as Changes requested and make the bidder action visible in Campaigns.": "سيتم تغيير حالة الحملة إلى طلب تعديلات وإظهار الإجراء المطلوب في صفحة الحملات.",
  "Revision request sent": "تم إرسال طلب التعديل",
  "ADMO message": "رسالة مكتب أبوظبي الإعلامي",
  "Action required": "إجراء مطلوب",
  "Needs revision": "يتطلب تعديلاً",
  "ADMO messages": "رسائل مكتب أبوظبي الإعلامي",
  "From": "من",
  "From ADMO CMS": "من نظام إدارة المحتوى في مكتب أبوظبي الإعلامي",
  "Current status": "الحالة الحالية",
  "Bidder": "المعلن",
  "Changes requested": "تعديلات مطلوبة",
  "Waiting for bidder revision": "بانتظار تعديل المعلن",
  "Review ADMO message and upload revised creative": "مراجعة رسالة مكتب أبوظبي الإعلامي ورفع التصميم المعدل",
  "Approve with AI clearance": "اعتماد بناءً على فحص الذكاء الاصطناعي",
  "Issue detected": "تم رصد ملاحظة",
  "Cleared": "تم الفحص",
  "Low-risk change": "تعديل منخفض المخاطر",
  "MediaGPT recommends requesting a CTA-size adjustment before approval.": "يوصي MediaGPT بطلب تعديل حجم زر الدعوة للإجراء قبل الاعتماد.",
  "No blocking issue detected.": "لم يتم رصد مانع للاعتماد.",
  "Detailed MediaGPT scan": "الفحص التفصيلي من MediaGPT",
  "AI-assisted": "مدعوم بالذكاء الاصطناعي",
  "Brand safety": "أمان العلامة",
  "Cultural sensitivity": "الحساسية الثقافية",
  "Arabic accuracy": "دقة اللغة العربية",
  "Legibility at 40m": "الوضوح على مسافة 40م",
  "Copyright match": "مطابقة حقوق الملكية",
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
  "Emergency alert live on network": "التنبيه الطارئ مباشر على الشبكة",
  "Alert reset. Re-run checks.": "تم إعادة تعيين التنبيه. أعد تشغيل الفحوصات.",
  "Live on network": "مباشر على الشبكة",
  "Notifications": "الإشعارات",
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
  "Emergency broadcast queued": "تم وضع بث الطوارئ في القائمة",
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
  "Operational": "الطبقة التشغيلية",
  "Intelligence / Agentic": "الذكاء / الوكلاء",
  "Skills": "المهارات",
  "Models": "النماذج",
  "Infrastructure": "البنية التحتية",
  "Knowledge": "المعرفة",
  "Knowledge Base": "قاعدة المعرفة",
  "Rules": "القواعد",
  "Skills Catalogue": "كتالوج المهارات",
  "Skill Workflows": "سير عمل المهارات",
  "Skill Runs": "تشغيلات المهارات",
  "Model Center": "مركز النماذج",
  "Integrations": "التكاملات",
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
  "Just now": "الآن",
  "ADMO CMS": "إدارة محتوى أدمو",
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
  "14 POs": "14 أمر شراء",
  "Tracked procurement": "مشتريات متتبعة",
  "Asset registry": "سجل الأصول",
  "Maintenance workbench": "منصة عمل الصيانة",
  "BoM, service orders and POs": "قائمة المواد وأوامر الخدمة وأوامر الشراء",
  "AI recommendations enabled": "توصيات الذكاء الاصطناعي مفعلة",
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
  "12 panels · Corniche, Airport Road": "12 شاشة · الكورنيش، طريق المطار",
  "18 mall & urban panels": "18 شاشة في المولات والمناطق الحضرية",
  "9 panels · Yas Island & hotel corridor": "9 شاشات · جزيرة ياس وممر الفنادق",
  "Jul 20 - Aug 03, 2026": "20 يوليو - 3 أغسطس 2026",
  "Jul 12 - Jul 26, 2026": "12 يوليو - 26 يوليو 2026",
  "Jul 15 - Aug 15, 2026": "15 يوليو - 15 أغسطس 2026",
  "1.4M weekly": "1.4 مليون أسبوعياً",
  "790k weekly": "790 ألف أسبوعياً",
  "620k weekly": "620 ألف أسبوعياً",
  "Jul 04, 2026 · 18:00": "4 يوليو 2026 · 18:00",
  "Jul 03, 2026 · 12:00": "3 يوليو 2026 · 12:00",
  "Jul 05, 2026 · 20:00": "5 يوليو 2026 · 20:00",



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
  "Send": "إرسال",
  "Save output": "حفظ المخرج",
  "Export": "تصدير",
  "Ask about assets, schedules, submissions, financials or emergencies. Large outputs expand here.": "اسأل عن الأصول أو الجداول أو الطلبات أو الماليات أو الطوارئ. تتوسع المخرجات الكبيرة هنا.",
  "Here is the current campaign workflow view.": "هذه هي نظرة سير عمل الحملات الحالية.",
  "Open alarm summary by zone. Industrial Zone and Al Ain need the operations team first.": "ملخص الإنذارات المفتوحة حسب المنطقة. المنطقة الصناعية والعين تحتاجان فريق العمليات أولاً.",
  "Financial scenario from current demand and bid pressure.": "سيناريو مالي بناءً على الطلب الحالي وضغط العروض.",
  "There are two active alerts. The weather broadcast needs checks before it can move to approval.": "يوجد تنبيهان نشطان. يحتاج بث تنبيه الطقس إلى فحوصات قبل الانتقال إلى الاعتماد.",
  "The estate is mostly healthy: 3 of 5 assets are live, one is under maintenance, and one is offline.": "الشبكة بحالة جيدة عموماً: 3 من 5 أصول نشطة، أصل واحد تحت الصيانة، وأصل واحد غير متصل.",
  "Zone": "المنطقة",
  "Action": "الإجراء",
  "Dispatch field technician": "إرسال فني ميداني",
  "Re-route emergency content": "إعادة توجيه محتوى الطوارئ",
  "No action": "لا إجراء",
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
  "Civic": "مدني",
  "Cultural": "ثقافي",
  "Emergency": "طارئ",
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
  "Waiting for ADMO review": "بانتظار مراجعة مكتب أبوظبي الإعلامي",
  "Content screening": "فحص المحتوى",
  "Awaiting publish": "بانتظار النشر",
  "Revise creative pack": "تعديل حزمة التصميم",

  "Content lifecycle": "دورة حياة المحتوى",
  "AI Screening": "الفحص بالذكاء الاصطناعي",
  "Human Moderation": "المراجعة البشرية",
  
  "Distribution": "التوزيع",
  "Edge Play": "التشغيل على الحافة",
  "Proof-of-Play": "إثبات التشغيل",
  "Reconciliation": "التسوية",

  "Named approver": "المعتمد المحدد",
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
  "Claude / Arabic evaluator": "Claude / مقيم عربي",
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
  "Blocked": "محظور",
  "Limited": "محدود",
  "Audit events": "أحداث التدقيق",
  "AI decisions": "قرارات الذكاء الاصطناعي",
  "Cited recommendations": "توصيات موثقة بالمصادر",
  "Human overrides": "تجاوزات بشرية",
  "Governance review": "مراجعة الحوكمة",
  "Export readiness": "جاهزية التصدير",
  "Signed event chain": "سلسلة أحداث موقعة",
  "Actor": "الفاعل",
  "Evidence": "الدليل",
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
  "Summer retail launch": "إطلاق التجزئة الصيفي"
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

function translateArabic(value: string) {
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
    .replace(/\s+Â·\s+/g, " · ")
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

function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>("control");
  const [submissions, setSubmissions] = useState<Submission[]>(seedSubmissions);
  const [campaigns, setCampaigns] = useState<BidderCampaign[]>(seedBidderCampaigns);
  const [bidderMessages, setBidderMessages] = useState<BidderCommunication[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(seedSchedule);
  const [published, setPublished] = useState<PublishedItem[]>(seedPublished);
  const [auctions, setAuctions] = useState<AuctionLot[]>(seedAuctions);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(seedAlerts);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>(initialVerificationSteps);
  const [financeApprovals, setFinanceApprovals] = useState<FinanceApproval[]>(seedFinanceApprovals);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const [backendStatus, setBackendStatus] = useState<"syncing" | "online" | "offline">("syncing");

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
    setAlerts(next.alerts);
    setVerificationSteps(next.verificationSteps);
    setFinanceApprovals(next.financeApprovals);
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

  const visibleNotifications = useMemo(
    () => (profile ? notifications.filter((item) => item.recipients.includes(profile.id)) : []),
    [notifications, profile],
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

  async function submitMarketplaceCampaign(payload: { campaign: string; packageName: string; budget: string; creativeId: string }) {
    await submitBrief({
      campaign: payload.campaign,
      packageName: payload.packageName,
      budget: payload.budget,
      creativeId: payload.creativeId,
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

  async function updateSubmissionStage(id: string, stage: SubmissionStage) {
    const result = await syncMutation<{ state: DoohStatePayload; submission: Submission }>(`submissions/${id}/stage`, {
      actor: profile?.name ?? "ADMO",
      stage,
    });
    if (result) notify(`${t(result.submission.campaign)}: ${t(stage)}`);
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

  async function createEmergencyAlert(payload: { title: string; scope: string; content: string; criticality: EmergencyAlert["criticality"] }) {
    const result = await syncMutation<{ state: DoohStatePayload; alert: EmergencyAlert }>("alerts", {
      actor: profile?.name ?? "Duty officer",
      payload,
    });
    if (result) notify("Alert created and waiting for checks");
    return result?.alert ?? null;
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
        <main className="workspace">
          <Topbar
            profile={profile}
            page={page}
            lang={lang}
            setLang={setLang}
            notifications={visibleNotifications}
            onOpenNotification={openNotification}
            onMarkNotification={markNotificationRead}
            onMarkAllNotifications={markAllNotificationsRead}
            t={t}
          />
          {page === "control" && (
            <ControlCentre submissions={submissions} published={published} notify={notify} goToAlerts={() => profile?.pages.includes("alerts") && setPage("alerts")} t={t} />
          )}
          {page === "cms" && (
            <CmsPage
              submissions={submissions}
              schedule={schedule}
              published={published}
              onStage={updateSubmissionStage}
              onRequestChanges={requestBidderChanges}
              onPlaySchedule={playSchedule}
              t={t}
            />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              steps={verificationSteps}
              onCreateAlert={createEmergencyAlert}
              onRunChecks={runAlertChecks}
              onQueueBroadcast={queueAlertBroadcast}
              onBroadcastNow={broadcastAlertNow}
              onResetAlert={resetAlertChecks}
              t={t}
            />
          )}
          {page === "network" && <NetworkPage t={t} />}
          {page === "mediagpt" && <MediaGptSuite t={t} />}
          {page === "knowledge" && <KnowledgeBasePage t={t} />}
          {page === "rules" && <RulesPage t={t} />}
          {page === "skillsCatalogue" && <SkillsCataloguePage t={t} />}
          {page === "skillWorkflows" && <SkillWorkflowsPage t={t} />}
          {page === "skillRuns" && <SkillRunsPage t={t} />}
          {page === "modelCenter" && <ModelCenterPage t={t} />}
          {page === "integrations" && <IntegrationsPage t={t} />}
          {page === "accessRoles" && <AccessRolesPage t={t} />}
          {page === "auditLog" && <AuditLogPage t={t} />}
          {page === "edgeCompute" && <EdgeComputePage t={t} />}
          {page === "financials" && <FinancialsPage approvals={financeApprovals} onDecision={decideFinance} t={t} />}
          {page === "campaigns" && <CampaignsPage campaigns={campaigns} bidderMessages={bidderMessages} onNewBrief={() => setWizardOpen(true)} t={t} />}
          {page === "marketplace" && <MarketplacePage onSubmit={submitMarketplaceCampaign} onBid={placeBid} auctions={auctions} onNewBrief={() => setWizardOpen(true)} t={t} />}
        </main>
        <MediaGptChatbot t={t} />
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
      <div className="current-profile">
        <small>{t("Access profile")}</small>
        <strong>{t(profile.name)}</strong>
        <span>{t(profile.role)}</span>
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
                    <Icon size={18} />
                    <span>{t(item.label)}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </nav>
      <button className="switch-profile" type="button" onClick={onSwitch}>
        <LogOut size={17} />
        {t("Switch profile")}
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
  notifications,
  onOpenNotification,
  onMarkNotification,
  onMarkAllNotifications,
  t,
}: {
  profile: Profile;
  page: Page;
  lang: Lang;
  setLang: (lang: Lang) => void;
  notifications: PlatformNotification[];
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
              onOpen={(notification) => {
                onOpenNotification(notification);
                setNotificationOpen(false);
              }}
              onMarkRead={onMarkNotification}
              onMarkAll={onMarkAllNotifications}
            />
          ) : null}
        </div>
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
  onOpen,
  onMarkRead,
  onMarkAll,
}: {
  profile: Profile;
  notifications: PlatformNotification[];
  onOpen: (notification: PlatformNotification) => void;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
}) {
  const t = useT();
  const unreadCount = notifications.filter((notification) => !notification.readBy.includes(profile.id)).length;
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="notification-drawer" role="dialog" aria-label={t("Notification center")}>
      <header>
        <div>
          <span>{t("Notification center")}</span>
          <strong>{unreadCount ? `${unreadCount} ${t("unread")}` : t("All caught up")}</strong>
        </div>
        <button type="button" onClick={onMarkAll} disabled={!unreadCount}>
          {t("Mark all read")}
        </button>
      </header>
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

function ControlCentre({
  submissions,
  published,
  notify,
  goToAlerts,
  t,
}: {
  submissions: Submission[];
  published: PublishedItem[];
  notify: (message: string) => void;
  goToAlerts: () => void;
  t: (value: string) => string;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState(estateAssets[0].id);
  const [liveViewFullscreen, setLiveViewFullscreen] = useState(false);
  const selectedAsset = estateAssets.find((asset) => asset.id === selectedAssetId) ?? estateAssets[0];
  const liveCount = estateAssets.filter((asset) => asset.status === "Live").length;
  const queuedCount = submissions.filter((item) => item.stage === "Approved" || item.stage === "Scheduled").length;
  const zoneStats = useMemo(() => summarizeZones(estateAssets), []);
  const openAlarmAssetIds = tickets.filter((ticket) => ticket.status !== "Resolved").map((ticket) => ticket.asset);

  useEffect(() => {
    if (!liveViewFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLiveViewFullscreen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [liveViewFullscreen]);

  return (
    <PageBody>
      <div className="operator-actions">
        <div>
          <strong>{t("Operator quick actions")}</strong>
          <small>{t("One-click operational controls. All actions are logged.")}</small>
        </div>
        <div className="operator-actions-row">
          <Button icon={ShieldAlert} onClick={goToAlerts}>{t("Launch emergency alert")}</Button>
          <Button icon={Send} variant="secondary" onClick={() => notify(t("Refresh forced on all edge caches"))}>{t("Refresh edge feeds")}</Button>
          <Button icon={Wrench} variant="secondary" onClick={() => notify(t("Field team dispatched to open alarms"))}>{t("Dispatch technician")}</Button>
          <Button icon={LockKeyhole} variant="secondary" onClick={() => notify(t("Schedule frozen. New publishes are blocked."))}>{t("Freeze schedule")}</Button>
        </div>
      </div>


      <MetricGrid>
        <Metric label={t("Assets live")} value={`${liveCount}/${estateAssets.length}`} helper="Screens currently playing" tone="good" />
        <Metric label={t("Proof-of-play")} value="99.4%" helper="Signed playback evidence" tone="good" />
        <Metric label={t("Open alarms")} value={String(tickets.length)} helper="Operations follow-up" tone="danger" />
        <Metric label={t("Queued campaigns")} value={String(queuedCount)} helper="Approved or scheduled" tone="info" />
      </MetricGrid>

      <Panel icon={Layers3} title={t("Asset board")}>
        <div className="asset-board">
          {published.map((item) => (
            <article key={item.id} className="asset-tile">
              <div className="creative-frame" style={{ backgroundImage: `url("${creativeBackground(item.creativeId)}")` }} />
              <div>
                <strong>{item.asset}</strong>
                <span>{t(item.campaign)}</span>
              </div>
              <StatusPill label="Playing" tone="good" />
            </article>
          ))}
        </div>
      </Panel>

      <section className="control-estate-group" aria-label={t("Live estate map")}>
        <header className="control-estate-group-header">
          <div>
            <span className="panel-icon"><MapPinned size={18} /></span>
            <h2>{t("Live estate map")}</h2>
          </div>
          <Legend />
        </header>
        <div className="split-grid map-zones">
          <Panel icon={Building2} title={t("Zones")}>
            <div className="zone-list">
              {zoneStats.map((zone) => (
                <button key={zone.name} type="button" onClick={() => setSelectedAssetId(zone.firstAssetId)}>
                  <span>
                    <strong>{t(zone.name)}</strong>
                    <small>{zone.live} {t("live")}, {zone.issue} {t("need attention")}</small>
                  </span>
                  <em>{zone.total}</em>
                </button>
              ))}
            </div>
          </Panel>
          <Panel icon={MapPinned} title={t("Live map")}>
            <LiveMap
              assets={estateAssets}
              selectedAssetId={selectedAssetId}
              onMarkerClick={setSelectedAssetId}
              openAlarmAssetIds={openAlarmAssetIds}
              t={t}
            />
          </Panel>
          <Panel
            icon={MonitorPlay}
            title="Live view"
            action={<Button icon={Maximize2} variant="secondary" onClick={() => setLiveViewFullscreen(true)}>{t("Full screen")}</Button>}
          >
            <LiveView asset={selectedAsset} />
          </Panel>
        </div>
      </section>

      <Panel icon={AlertTriangle} title={t("Open alarms")}>
        <ObjectList
          rows={tickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            meta: `${ticket.asset} / ${ticket.team}`,
            tone: severityTone(ticket.severity),
            status: ticket.status,
          }))}
        />
      </Panel>
      {liveViewFullscreen ? (
        <LiveViewFullscreen asset={selectedAsset} onClose={() => setLiveViewFullscreen(false)} />
      ) : null}
    </PageBody>
  );
}

function CmsPage({
  submissions,
  schedule,
  published,
  onStage,
  onRequestChanges,
  onPlaySchedule,
  t,
}: {
  submissions: Submission[];
  schedule: ScheduleItem[];
  published: PublishedItem[];
  onStage: (id: string, next: SubmissionStage) => void;
  onRequestChanges: (id: string, message: string) => void;
  onPlaySchedule: (id: string) => void;
  t: (value: string) => string;
}) {
  const [tab, setTab] = useState<CmsTab>("submissions");
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? "");
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
        { id: "library", label: t("Media Library") },
        { id: "scheduling", label: t("Scheduling") },
      ]} />

      {tab === "submissions" && selected ? (
        <div className="split-grid cms-grid cms-submissions-grid">
          <Panel icon={FileCheck2} title={t("Submissions")} action={itemCountLabel(submissions.length, t)}>
            <div className="submission-list">
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
          </Panel>
          <Panel icon={ClipboardCheck} title={t(selected.campaign)} action={selected.id}>
            <SubmissionDetail submission={selected} onStage={onStage} onRequestChanges={onRequestChanges} />
          </Panel>
        </div>
      ) : null}

      {tab === "library" && <MediaLibrary t={t} />}
      {tab === "scheduling" && <SchedulingBoard schedule={schedule} onPlayNow={onPlaySchedule} t={t} />}
    </PageBody>
  );
}

function SubmissionDetail({
  submission,
  onStage,
  onRequestChanges,
}: {
  submission: Submission;
  onStage: (id: string, stage: SubmissionStage) => void;
  onRequestChanges: (id: string, message: string) => void;
}) {
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);

  function sendRevisionRequest(message: string) {
    onRequestChanges(submission.id, message);
    setRevisionDialogOpen(false);
  }

  return (
    <div className="detail-stack">
      <StageTracker stage={submission.stage} />
      <AiDeepScan
        submission={submission}
        onRequestChanges={() => setRevisionDialogOpen(true)}
        onApprove={() => onStage(submission.id, "Approved")}
      />
      <div className="submission-hero">
        <div className="creative-frame large" style={{ backgroundImage: `url("${creativeBackground(submission.creativeId)}")` }} />
        <div className="detail-cards compact">
          <Detail label="Owner" value={submission.owner} />
          <Detail label="Package" value={submission.packageName} />
          <Detail label="Budget" value={submission.budget} />
          <Detail label="Start" value={submission.requestedStart} />
          <Detail label="Language" value={submission.language} />
        </div>
      </div>

      <ReviewerNotes submissionId={submission.id} />

      <ActionRow>
        {submission.stage === "Submitted" && <Button onClick={() => onStage(submission.id, "In review")}>Start review</Button>}
        {submission.stage === "In review" && (
          <>
            <Button onClick={() => onStage(submission.id, "Approved")}>Approve</Button>
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
    </div>
  );
}

function defaultRevisionMessage(submission: Submission) {
  return [
    `Hello ${submission.bidder} team,`,
    "",
    `ADMO reviewed "${submission.campaign}" and MediaGPT flagged one required adjustment before approval:`,
    "",
    "- Enlarge the CTA by 12% for highway assets.",
    "- Keep Arabic and English copy aligned.",
    "- Re-upload the revised creative pack for CMS review.",
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

function AiDeepScan({
  submission,
  onRequestChanges,
  onApprove,
}: {
  submission: Submission;
  onRequestChanges: () => void;
  onApprove: () => void;
}) {
  const t = useT();
  const seed = submission.id.length;
  const [open, setOpen] = useState(false);
  const [rerun, setRerun] = useState(0);
  const scores = [
    { label: "Brand safety", value: 92 + (seed % 5), tone: "good" as Tone },
    { label: "Cultural sensitivity", value: 88 + (seed % 6), tone: "good" as Tone },
    { label: "Arabic accuracy", value: 94 + (seed % 4), tone: "good" as Tone },
    { label: "Legibility at 40m", value: 76 + (seed % 10), tone: "warn" as Tone },
    { label: "Copyright match", value: 100, tone: "good" as Tone },
  ];
  const findings = [
    { label: "No prohibited symbols detected", ok: true },
    { label: "Arabic RTL punctuation validated", ok: true },
    { label: "Contrast ratio 4.9:1 (min 4.5)", ok: true },
    { label: "Suggested: enlarge CTA by 12% for highway assets", ok: false },
  ];
  const issue = findings.find((finding) => !finding.ok);
  const recommendation = issue
    ? "MediaGPT recommends requesting a CTA-size adjustment before approval."
    : "No blocking issue detected.";

  return (
    <section className={`ai-review-card ${issue ? "has-issue" : "clear"}`}>
      <div className="ai-review-summary">
        <div className="ai-review-icon"><Sparkles size={18} /></div>
        <div>
          <span>{t("AI recommendation")}</span>
          <strong>{t(recommendation)}</strong>
          <small>{issue ? t(issue.label) : t("No blocking issue detected.")}</small>
        </div>
        <StatusPill label={issue ? "Issue detected" : "Cleared"} tone={issue ? "warn" : "good"} />
      </div>
      <div className="ai-review-actions">
        {issue ? (
          <Button icon={Send} onClick={onRequestChanges}>{t("Prepare bidder message")}</Button>
        ) : (
          <Button icon={CheckCircle2} onClick={onApprove}>{t("Approve with AI clearance")}</Button>
        )}
        <Button variant="secondary" icon={RefreshCcw} onClick={() => setRerun((n) => n + 1)}>{t("Re-run scan")}</Button>
        <Button variant="secondary" icon={open ? X : Sparkles} onClick={() => setOpen((value) => !value)}>
          {open ? t("Hide deep scan") : t("Open deep scan")}
        </Button>
      </div>
      {open ? (
        <div className="deepscan-panel" aria-label={t("Detailed MediaGPT scan")}>
          <div className="deepscan-grid">
            <div className="deepscan-scores">
              {scores.map((score) => (
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
              {findings.map((f) => (
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

function AlertsPage({
  alerts,
  steps,
  onCreateAlert,
  onRunChecks,
  onQueueBroadcast,
  onBroadcastNow,
  onResetAlert,
  t,
}: {
  alerts: EmergencyAlert[];
  steps: VerificationStep[];
  onCreateAlert: (payload: { title: string; scope: string; content: string; criticality: EmergencyAlert["criticality"] }) => Promise<EmergencyAlert | null>;
  onRunChecks: (id: string) => void;
  onQueueBroadcast: (id: string) => void;
  onBroadcastNow: (id: string) => void;
  onResetAlert: (id: string) => void;
  t: (value: string) => string;
}) {
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0]?.id ?? "");
  const [draft, setDraft] = useState({ title: "", scope: "", content: "", criticality: "Major" });
  const selected = alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0];
  const checked = steps.every((step) => step.state === "Checked");

  useEffect(() => {
    if (alerts.length && !alerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(alerts[0].id);
    }
  }, [alerts, selectedAlertId]);

  async function createAlert(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const created = await onCreateAlert({
      title: draft.title,
      scope: draft.scope,
      content: draft.content,
      criticality: draft.criticality as EmergencyAlert["criticality"],
    });
    if (created) setSelectedAlertId(created.id);
    setDraft({ title: "", scope: "", content: "", criticality: "Major" });
  }


  if (!selected) return null;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Ongoing alerts" value={String(alerts.length)} helper="Active or queued" tone="danger" />
        <Metric label="SLA health" value="96%" helper="Emergency response" tone="good" />
        <Metric label="Time to display" value="00:42" helper="Average last 24h" tone="info" />
        <Metric label="Awaiting checks" value={String(alerts.filter((alert) => alert.state === "Check required").length)} helper="Needs action" tone="warn" />
      </MetricGrid>

      <div className="ai-intervention-box emergency-ai-summary">
        <div>
          <strong>{t("MediaGPT emergency verification")}</strong>
          <span>{t("Checks bilingual payload, authority, SLA, and edge route before broadcast.")}</span>
        </div>
        <div className="ai-action-set">
          <StatusPill label={checked ? "Ready for approval" : "Check required"} tone={checked ? "good" : "warn"} />
          <Button icon={ShieldCheck} onClick={() => onRunChecks(selected.id)}>{t("Run MediaGPT checks")}</Button>
          <Button variant="secondary" disabled={!checked} onClick={() => onQueueBroadcast(selected.id)}>{t("Queue broadcast")}</Button>
          <Button variant="secondary" disabled={!checked} onClick={() => onBroadcastNow(selected.id)}>{t("Broadcast now")}</Button>
        </div>
      </div>

      <div className="split-grid wide-left">
        <Panel icon={Bell} title="Active alerts">
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>{t("Alert")}</th>
                  <th>{t("Scope")}</th>
                  <th>{t("Authority")}</th>
                  <th>{t("SLA")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className={alert.id === selected.id ? "selected-row" : ""} onClick={() => setSelectedAlertId(alert.id)}>
                    <td data-label={t("Alert")}><strong>{t(alert.title)}</strong><span>{t(alert.audience)}</span></td>
                    <td data-label={t("Scope")}>{t(alert.scope)}</td>
                    <td data-label={t("Authority")}>{t(alert.authority)}</td>
                    <td data-label={t("SLA")}>{t(alert.sla)}</td>
                    <td data-label={t("Status")}><StatusPill label={alert.state} tone={alertTone(alert.state)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon={Megaphone} title={t("Create alert")}>
          <form className="stack-form" onSubmit={createAlert}>
            <label>
              {t("Title")}
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={t("Weather alert broadcast")} />
            </label>
            <label>
              {t("Scope")}
              <input value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value })} placeholder={t("Al Ain gateways")} />
            </label>
            <label>
              {t("Content")}
              <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder={t("Arabic and English emergency message")} />
            </label>
            <label>
              {t("Criticality")}
              <select value={draft.criticality} onChange={(event) => setDraft({ ...draft, criticality: event.target.value })}>
                <option value="Critical">{t("Critical")}</option>
                <option value="Major">{t("Major")}</option>
                <option value="Minor">{t("Minor")}</option>
              </select>
            </label>
            <Button type="submit">{t("Create alert")}</Button>
          </form>
        </Panel>
      </div>

      <Panel icon={ShieldAlert} title={selected.title} action={<StatusPill label={selected.state} tone={alertTone(selected.state)} />}>
        <div className="verification-grid ai-intervention-box">
          {steps.map((step, index) => (
            <article key={step.label} className="verification-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{t(step.label)}</strong>
                <small>{t(step.owner)}</small>
              </div>
              <StatusPill label={step.state} tone={step.state === "Checked" ? "good" : "warn"} />
            </article>
          ))}
        </div>
        <ActionRow>
          <Button onClick={() => onRunChecks(selected.id)}>{t("Run checks")}</Button>
          <Button variant="secondary" onClick={() => checked && onQueueBroadcast(selected.id)}>{t("Queue broadcast")}</Button>
          <Button variant="secondary" onClick={() => checked && onBroadcastNow(selected.id)}>{t("Broadcast now")}</Button>
          <Button variant="secondary" onClick={() => onResetAlert(selected.id)}>{t("Reset")}</Button>
        </ActionRow>

      </Panel>
    </PageBody>
  );
}

function NetworkPage({ t }: { t: (value: string) => string }) {
  const [selectedId, setSelectedId] = useState(estateAssets[1].id);
  const selected = estateAssets.find((asset) => asset.id === selectedId) ?? estateAssets[0];
  const live = estateAssets.filter((asset) => asset.status === "Live").length;
  const connectivity = Math.round((live / estateAssets.length) * 100);

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Assets" value={String(estateAssets.length)} helper="Registered devices" tone="info" />
        <Metric label="Connectivity" value={`${connectivity}%`} helper="Live or reachable" tone={connectivity > 80 ? "good" : "warn"} />
        <Metric label="Workbench load" value={String(fieldTasks.length)} helper="Service tasks" tone="warn" />
        <Metric label="Spare parts" value="14 POs" helper="Tracked procurement" tone="neutral" />
      </MetricGrid>

      <div className="split-grid network-grid">
        <Panel icon={RadioTower} title="Asset registry">
          <div className="asset-registry">
            {estateAssets.map((asset) => (
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
        </Panel>
        <Panel icon={HardDrive} title={t(selected.name)} action={selected.id}>
          <DeviceDossier asset={selected} />
        </Panel>
      </div>

      <Panel icon={Wrench} title="Maintenance workbench">
        <KanbanBoard />
      </Panel>

      <Panel icon={ClipboardCheck} title="BoM, service orders and POs" action="AI recommendations enabled">
        <InventoryOperationsTable />
      </Panel>
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
    ],
  },
  {
    assetId: "AD-BRG-014",
    assetName: "Airport Road Premium",
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
    ],
  },
];

function InventoryOperationsTable() {
  const t = useT();
  const [expandedIds, setExpandedIds] = useState<string[]>([assetSupplyRecords[0].assetId]);

  function toggle(assetId: string) {
    setExpandedIds((items) => (items.includes(assetId) ? items.filter((id) => id !== assetId) : [...items, assetId]));
  }

  return (
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
                  <td data-label={t("Open SOs")}>{record.openSos}</td>
                  <td data-label={t("Open POs")}>{record.openPos}</td>
                  <td data-label={t("Next PO ETA")}>{record.nextPoEta}</td>
                  <td data-label={t("AI recommendation")}><span className="ai-recommendation">{t(record.recommendation)}</span></td>
                </tr>
                {expanded ? (
                  <tr className="supply-detail-row">
                    <td colSpan={7}>
                      <div className="supply-detail">
                        <div className="supply-detail-heading">
                          <strong>{t("Expanded BoM and work orders")}</strong>
                          <span>{record.assetId}</span>
                        </div>
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
                                <td data-label={t("AI recommendation")}><span className="ai-recommendation">{t(component.recommendation)}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
  );
}

function KanbanBoard() {
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
          {fieldTasks.filter((task) => column.states.includes(task.column)).slice(0, 3).map((task) => (
            <article key={task.id}>
              <span className={task.column === "Overdue" ? "danger" : ""}>{t(task.column === "Overdue" ? "Overdue" : task.priority)}</span>
              <p>{t(task.title)}</p>
              <small>{task.asset} / {t(task.owner)}</small>
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

type RunLogEntry = {
  id: string;
  agent: string;
  boundary: Boundary;
  summary: string;
  at: string;
};

function MediaGptSuite({ t }: { t: (value: string) => string }) {
  const [activeId, setActiveId] = useState<AgentId>("insights");
  const active = mediaGptAgents.find((a) => a.id === activeId)!;
  const [inputs, setInputs] = useState<AgentInputs>(() => {
    const seed: AgentInputs = {};
    active.fields.forEach((f) => (seed[f.key] = f.defaultValue));
    return seed;
  });
  const [result, setResult] = useState<AgentResult | null>(null);
  const [log, setLog] = useState<RunLogEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);

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

  function runAgent() {
    const out = active.run(inputs);
    setResult(out);
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setLog((prev) => [
      { id: `${active.id}-${Date.now()}`, agent: active.name, boundary: active.boundary, summary: out.summary, at },
      ...prev,
    ].slice(0, 6));
  }

  function performPrimary() {
    if (!result?.primaryAction) return;
    setToast(`${t(result.primaryAction)} - ${t("submitted for governance")}`);
    setTimeout(() => setToast(null), 2400);
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
            <Button icon={Zap} onClick={runAgent}>Run agent</Button>
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
            <div className="workbench-empty">{t("Set the inputs above and run the agent to see governed output.")}</div>
          )}
        </section>
      </div>

      <Panel icon={Activity} title="Recent runs">
        {log.length === 0 ? (
          <div className="workbench-empty">{t("No runs in this session yet.")}</div>
        ) : (
          <CompactTable
            columns={["Time", "Agent", "Boundary", "Result"]}
            rows={log.map((entry) => [entry.at, entry.agent, entry.boundary, entry.summary])}
          />
        )}
      </Panel>

      {toast ? <Toast>{toast}</Toast> : null}
    </PageBody>
  );
}

const knowledgeBases = [
  { id: "policy", name: "Policy and compliance", description: "UAE media policy, ADMO content standards, brand safety and Arabic copy rules.", documents: 42, chunks: "8,420", usedBy: "MediaGPT Moderator, MediaGPT Compliance Agent" },
  { id: "commercial", name: "Commercial and rate cards", description: "Packages, pricing rules, financial guardrails, proof-of-play settlement and bidder terms.", documents: 28, chunks: "4,960", usedBy: "MediaGPT Optimizer, MediaGPT Insights" },
  { id: "operations", name: "Operations and emergency", description: "Emergency SOPs, CAP-UAE templates, distribution rules, edge cache procedures and operator playbooks.", documents: 34, chunks: "6,870", usedBy: "MediaGPT Orchestrator, MediaGPT Sentinel" },
  { id: "technical", name: "Network and maintenance", description: "BoM catalogues, service manuals, edge-device runbooks, telemetry dictionaries and spare-part workflows.", documents: 51, chunks: "11,240", usedBy: "MediaGPT Sentinel, MediaGPT Maintenance" },
];

const seedKnowledgeSources = [
  { id: "KB-001", base: "policy", name: "ADMO creative review policy.pdf", type: "PDF", status: "Indexed", chunks: "1,284", owner: "Content governance", lastIndexed: "Today 09:22", usedBy: "MediaGPT Moderator" },
  { id: "KB-002", base: "policy", name: "Arabic terminology and tone guide.docx", type: "DOCX", status: "Indexed", chunks: "842", owner: "Arabic QA", lastIndexed: "Today 08:40", usedBy: "MediaGPT Compliance Agent" },
  { id: "KB-003", base: "commercial", name: "2026 DOOH rate-card rules.xlsx", type: "XLSX", status: "Indexed", chunks: "618", owner: "Finance", lastIndexed: "Yesterday", usedBy: "MediaGPT Optimizer" },
  { id: "KB-004", base: "operations", name: "Emergency broadcast SOP.pdf", type: "PDF", status: "Indexing", chunks: "390", owner: "Control room", lastIndexed: "In progress", usedBy: "MediaGPT Orchestrator" },
  { id: "KB-005", base: "technical", name: "Edge controller maintenance runbook.pdf", type: "PDF", status: "Indexed", chunks: "1,942", owner: "Network operations", lastIndexed: "Jun 30, 2026", usedBy: "MediaGPT Sentinel" },
];

function KnowledgeBasePage({ t }: { t: (value: string) => string }) {
  const [active, setActive] = useState(knowledgeBases[0].id);
  const [sources, setSources] = useState(seedKnowledgeSources);
  const selected = knowledgeBases.find((item) => item.id === active) ?? knowledgeBases[0];
  const visibleSources = sources.filter((source) => source.base === active);
  const pending = sources.filter((source) => source.status !== "Indexed").length;

  function queueSource() {
    setSources((items) => [
      {
        id: `KB-${String(items.length + 1).padStart(3, "0")}`,
        base: active,
        name: "Uploaded bidder evidence pack.pdf",
        type: "PDF",
        status: "Queued",
        chunks: "0",
        owner: "Technical Platform Owner",
        lastIndexed: "Queued now",
        usedBy: "MediaGPT Moderator",
      },
      ...items,
    ]);
  }

  function reindex() {
    setSources((items) => items.map((item) => item.base === active ? { ...item, status: "Indexed", lastIndexed: "Just now", chunks: item.chunks === "0" ? "312" : item.chunks } : item));
  }

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Knowledge bases" value={String(knowledgeBases.length)} helper="MediaGPT source corpora" tone="info" />
        <Metric label="Documents" value={String(sources.length)} helper="Uploaded or connected" tone="good" />
        <Metric label="Indexed chunks" value="33,802" helper="Retrieval-ready passages" tone="good" />
        <Metric label="Pending indexing" value={String(pending)} helper="Queued or processing" tone={pending ? "warn" : "good"} />
      </MetricGrid>
      <div className="split-grid cms-grid">
        <Panel icon={Database} title="Knowledge bases" action={<Button icon={Upload} variant="secondary" onClick={queueSource}>Add source</Button>}>
          <div className="knowledge-list">
            {knowledgeBases.map((base) => (
              <button key={base.id} type="button" className={base.id === active ? "selected" : ""} onClick={() => setActive(base.id)}>
                <strong>{t(base.name)}</strong>
                <span>{t(base.description)}</span>
                <small>{base.documents} {t("documents")} / {base.chunks} {t("chunks")}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel icon={FileText} title={t(selected.name)} action={<Button icon={RefreshCcw} variant="secondary" onClick={reindex}>Re-index selected</Button>}>
          <p className="notes">{t(selected.description)}</p>
          <CompactTable
            columns={["Source", "Type", "Status", "Chunks", "Owner", "Used by", "Last indexed"]}
            rows={visibleSources.map((source) => [source.name, source.type, source.status, source.chunks, source.owner, source.usedBy, source.lastIndexed])}
          />
        </Panel>
      </div>
    </PageBody>
  );
}

type DoohRuleStatus = "Active" | "Strict" | "Draft";
type DoohRuleMode = "Enforce" | "Recommend" | "Monitor";

interface DoohRule {
  id: string;
  title: string;
  scope: string;
  mode: DoohRuleMode;
  status: DoohRuleStatus;
  condition: string;
  action: string;
  owner: string;
  aiEffect: string;
  version: string;
}

const seedDoohRules: DoohRule[] = [
  {
    id: "RULE-01",
    title: "Arabic parity",
    scope: "CMS submissions",
    mode: "Enforce",
    status: "Active",
    condition: "Arabic copy missing or materially different",
    action: "Block submission and request bilingual revision",
    owner: "Content governance",
    aiEffect: "Hard block before MediaGPT recommendation",
    version: "v1.8",
  },
  {
    id: "RULE-02",
    title: "Restricted sector separation",
    scope: "Commercial scheduling",
    mode: "Recommend",
    status: "Active",
    condition: "Competing brands within the same takeover window",
    action: "Recommend alternate slot and protect exclusivity",
    owner: "Commercial finance",
    aiEffect: "Guides bid optimizer and scheduling assistant",
    version: "v1.4",
  },
  {
    id: "RULE-03",
    title: "Emergency authority",
    scope: "Alerts and emergencies",
    mode: "Enforce",
    status: "Strict",
    condition: "No named authority, SLA, CAP-UAE payload, or bilingual text",
    action: "Require dual approval before broadcast queue",
    owner: "Control room",
    aiEffect: "Blocks emergency orchestration until verification passes",
    version: "v2.1",
  },
  {
    id: "RULE-04",
    title: "BoM spare-part escalation",
    scope: "Network maintenance",
    mode: "Monitor",
    status: "Draft",
    condition: "Critical component below reorder point or PO ETA exceeds SLA",
    action: "Recommend substitute part, SO escalation, or technician dispatch",
    owner: "Network operations",
    aiEffect: "Feeds maintenance recommender and service-order queue",
    version: "v0.9",
  },
];

function ruleTone(status: DoohRuleStatus): Tone {
  if (status === "Strict") return "danger";
  if (status === "Draft") return "warn";
  return "good";
}

function RulesPage({ t }: { t: (value: string) => string }) {
  const [rules, setRules] = useState(seedDoohRules);
  const [selectedId, setSelectedId] = useState(seedDoohRules[0].id);
  const [creating, setCreating] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [draft, setDraft] = useState<Omit<DoohRule, "id" | "version">>({
    title: "",
    scope: "CMS submissions",
    mode: "Recommend",
    status: "Draft",
    condition: "",
    action: "",
    owner: "Platform Admin",
    aiEffect: "Available to MediaGPT after save",
  });
  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0];
  function updateSelected(patch: Partial<DoohRule>) {
    setRules((items) => items.map((rule) => rule.id === selected.id ? { ...rule, ...patch } : rule));
    setSavedNotice("");
  }
  function createRule() {
    if (!draft.title.trim() || !draft.condition.trim() || !draft.action.trim()) return;
    const next: DoohRule = {
      ...draft,
      id: `RULE-${String(rules.length + 1).padStart(2, "0")}`,
      title: draft.title.trim(),
      condition: draft.condition.trim(),
      action: draft.action.trim(),
      version: "v0.1",
    };
    setRules((items) => [next, ...items]);
    setSelectedId(next.id);
    setDraft({
      title: "",
      scope: "CMS submissions",
      mode: "Recommend",
      status: "Draft",
      condition: "",
      action: "",
      owner: "Platform Admin",
      aiEffect: "Available to MediaGPT after save",
    });
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
        <Metric label="Enforced rules" value={String(rules.filter((rule) => rule.mode === "Enforce").length)} helper="Cannot be bypassed by AI" tone="danger" />
        <Metric label="Recommendation rules" value={String(rules.filter((rule) => rule.mode === "Recommend").length)} helper="Guide AI outputs" tone="warn" />
        <Metric label="Draft rules" value={String(rules.filter((rule) => rule.status === "Draft").length)} helper="Ready for governance review" tone="info" />
      </MetricGrid>
      <div className="split-grid cms-grid">
        <Panel icon={ShieldCheck} title="Rules" action={<Button icon={Plus} variant="secondary" onClick={() => setCreating((value) => !value)}>Create rule</Button>}>
          {creating ? (
            <div className="rule-form">
              <label><span>{t("Rule name")}</span><input value={draft.title} onChange={(event) => setDraft((item) => ({ ...item, title: event.target.value }))} placeholder={t("New governance rule")} /></label>
              <label><span>{t("Scope")}</span><input value={draft.scope} onChange={(event) => setDraft((item) => ({ ...item, scope: event.target.value }))} /></label>
              <label><span>{t("Mode")}</span><select value={draft.mode} onChange={(event) => setDraft((item) => ({ ...item, mode: event.target.value as DoohRuleMode }))}><option>Enforce</option><option>Recommend</option><option>Monitor</option></select></label>
              <label><span>{t("Status")}</span><select value={draft.status} onChange={(event) => setDraft((item) => ({ ...item, status: event.target.value as DoohRuleStatus }))}><option>Draft</option><option>Active</option><option>Strict</option></select></label>
              <label className="rule-form-wide"><span>{t("Condition")}</span><textarea value={draft.condition} onChange={(event) => setDraft((item) => ({ ...item, condition: event.target.value }))} placeholder={t("When this rule should fire")} /></label>
              <label className="rule-form-wide"><span>{t("Action")}</span><textarea value={draft.action} onChange={(event) => setDraft((item) => ({ ...item, action: event.target.value }))} placeholder={t("What MediaGPT or the workflow must do")} /></label>
              <label><span>{t("Owner")}</span><input value={draft.owner} onChange={(event) => setDraft((item) => ({ ...item, owner: event.target.value }))} /></label>
              <label><span>{t("AI effect")}</span><input value={draft.aiEffect} onChange={(event) => setDraft((item) => ({ ...item, aiEffect: event.target.value }))} /></label>
              <ActionRow>
                <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
                <Button icon={Plus} onClick={createRule} disabled={!draft.title.trim() || !draft.condition.trim() || !draft.action.trim()}>Add rule</Button>
              </ActionRow>
            </div>
          ) : null}
          <div className="knowledge-list">
            {rules.map((rule) => (
              <button key={rule.id} type="button" className={selected.id === rule.id ? "selected" : ""} onClick={() => setSelectedId(rule.id)}>
                <strong>{t(rule.title)}</strong>
                <span>{t(rule.scope)} / {t(rule.mode)} / {t(rule.owner)}</span>
                <small>{rule.id} / {t(rule.status)} / {rule.version}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel icon={ClipboardCheck} title={selected.title} action={<StatusPill label={selected.status} tone={ruleTone(selected.status)} />}>
          <div className="rule-detail">
            <Detail label="Mode" value={selected.mode} />
            <Detail label="Applies to" value={selected.scope} />
            <Detail label="Owner" value={selected.owner} />
          </div>
          <Segmented value={selected.mode} onChange={(mode) => updateSelected({ mode })} items={[
            { id: "Enforce", label: t("Enforce") },
            { id: "Recommend", label: t("Recommend") },
            { id: "Monitor", label: t("Monitor") },
          ]} />
          <div className="rule-editor">
            <label><span>{t("Rule name")}</span><input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>
            <label><span>{t("Scope")}</span><input value={selected.scope} onChange={(event) => updateSelected({ scope: event.target.value })} /></label>
            <label><span>{t("Status")}</span><select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as DoohRuleStatus })}><option>Active</option><option>Strict</option><option>Draft</option></select></label>
            <label><span>{t("Owner")}</span><input value={selected.owner} onChange={(event) => updateSelected({ owner: event.target.value })} /></label>
            <label className="rule-form-wide"><span>{t("Condition")}</span><textarea value={selected.condition} onChange={(event) => updateSelected({ condition: event.target.value })} /></label>
            <label className="rule-form-wide"><span>{t("Action")}</span><textarea value={selected.action} onChange={(event) => updateSelected({ action: event.target.value })} /></label>
            <label className="rule-form-wide"><span>{t("AI effect")}</span><input value={selected.aiEffect} onChange={(event) => updateSelected({ aiEffect: event.target.value })} /></label>
          </div>
          {savedNotice ? <p className="media-notice">{t(savedNotice)}</p> : null}
          <CompactTable
            columns={["Rule", "Condition", "Action", "AI effect"]}
            rows={rules.map((rule) => [rule.title, rule.condition, rule.action, rule.aiEffect])}
          />
          <ActionRow>
            <Button icon={Save} onClick={saveRule}>Save changes</Button>
            <Button icon={Trash2} variant="secondary" onClick={() => deleteRule(selected.id)} disabled={rules.length < 2}>Delete rule</Button>
          </ActionRow>
        </Panel>
      </div>
    </PageBody>
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
      <div className="split-grid cms-grid">
        <Panel icon={Sparkles} title="Skills Catalogue">
          <div className="knowledge-list">
            {doohSkillRows.map((row) => (
              <button key={row.id} type="button" className={selected.id === row.id ? "selected" : ""} onClick={() => setSelected(row)}>
                <strong>{t(row.title)}</strong>
                <span>{row.meta.split(" / ").map(t).join(" / ")}</span>
                <small>{t(row.status)}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel icon={Workflow} title={selected.title} action={<StatusPill label={selected.status} tone={selected.tone} />}>
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
        </Panel>
      </div>
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

function FinancialsPage({
  approvals,
  onDecision,
  t,
}: {
  approvals: FinanceApproval[];
  onDecision: (id: string, state: FinanceApproval["state"]) => void;
  t: (value: string) => string;
}) {
  const [budget, setBudget] = useState(420);
  const [demand, setDemand] = useState(68);
  const [discount, setDiscount] = useState(8);
  const projectedRevenue = Math.round(budget * (0.72 + demand / 180) * (1 - discount / 100));

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Booked revenue" value="AED 18.4M" helper="Current quarter" tone="good" />
        <Metric label="Budget consumed" value="62%" helper="Against civic and commercial targets" tone="info" />
        <Metric label="Receivables" value="AED 3.1M" helper="Open invoices" tone="warn" />
        <Metric label="Pending approvals" value={String(approvals.filter((a) => a.state === "Pending").length)} helper="Finance sign-off" tone={approvals.filter((a) => a.state === "Pending").length ? "warn" : "good"} />
      </MetricGrid>

      <Panel icon={ShieldCheck} title={t("Bid approvals queue")}>
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
              {approvals.map((row) => (
                <tr key={row.id}>
                  <td data-label={t("Campaign")}><strong>{t(row.campaign)}</strong><span>{t(row.packageName)}</span></td>
                  <td data-label={t("Bidder")}>{t(row.bidder)}</td>
                  <td data-label={t("Amount")}>{t(row.amount)}</td>
                  <td data-label={t("Margin")}>{row.margin}</td>
                  <td data-label={t("Risk")}><StatusPill label={row.risk} tone={row.risk === "Low" ? "good" : row.risk === "Medium" ? "warn" : "danger"} /></td>
                  <td data-label={t("Decision")}><StatusPill label={row.state} tone={row.state === "Approved" ? "good" : row.state === "Rejected" ? "danger" : row.state === "On hold" ? "warn" : "info"} /></td>
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
            </tbody>
          </table>
        </div>
      </Panel>

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
      </Panel>
    </PageBody>
  );
}

function CampaignsPage({
  campaigns,
  bidderMessages,
  onNewBrief,
  t,
}: {
  campaigns: BidderCampaign[];
  bidderMessages: BidderCommunication[];
  onNewBrief: () => void;
  t: (value: string) => string;
}) {
  const messagesByCampaign = new Map(bidderMessages.map((message) => [message.campaign, message]));
  const revisionCount = campaigns.filter((item) => item.status === "Changes requested").length;

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Campaigns" value={String(campaigns.length)} helper="Bidder workspace" tone="info" />
        <Metric label="Needs revision" value={String(revisionCount)} helper="ADMO messages" tone={revisionCount ? "warn" : "good"} />
        <Metric label="Live or published" value={String(campaigns.filter((item) => item.status === "Published").length)} helper="On network" tone="good" />
        <Metric label="In review" value={String(campaigns.filter((item) => item.status === "Submitted" || item.status === "In review").length)} helper="ADMO action" tone="warn" />
      </MetricGrid>
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
                            {campaign.revisionRequestedAt ? ` · ${campaign.revisionRequestedAt}` : ""}
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
  onNewBrief,
  t,
}: {
  onSubmit: (payload: { campaign: string; packageName: string; budget: string; creativeId: string }) => void;
  onBid: (payload: { lotId: string; amount: number; campaign: string }) => void;
  auctions: AuctionLot[];
  onNewBrief: () => void;
  t: (value: string) => string;
}) {
  const [selected, setSelected] = useState(marketplacePackages[0]);
  const [campaign, setCampaign] = useState("Airport retail launch");
  const [budget, setBudget] = useState("AED 420,000");
  const [mode, setMode] = useState<"auction" | "fixed">("auction");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ campaign, packageName: selected.name, budget, creativeId: selected.creativeId });
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
        <Panel icon={ShoppingBag} title={t("Open auctions")}>
          <div className="auction-grid">
            {auctions.map((lot) => (
              <AuctionCard key={lot.id} lot={lot} onBid={onBid} t={t} />
            ))}
          </div>
        </Panel>
      ) : (
        <div className="split-grid wide-left">
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
          </Panel>
          <Panel icon={FileText} title={t("Submit campaign")}>
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
                {t("Creative pack")}
                <input value={t("Arabic and English creative uploaded")} readOnly />
              </label>
              <Button type="submit">{t("Submit campaign")}</Button>
            </form>
          </Panel>
        </div>
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
          <small>{t(lot.flightWindow)} · {t(lot.impressions)}</small>
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
      {error ? <p className="auction-error">{error}</p> : null}
    </form>
  );
}

function MediaGptChatbot({ t }: { t: (value: string) => string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; body: string; table?: string[][] }>>([
    { role: "assistant", body: "Ask about assets, schedules, submissions, financials or emergencies. Large outputs expand here." },
  ]);

  function ask() {
    if (!query.trim()) return;
    const response = buildMediaGptResponse(query);
    setMessages((items) => [...items, { role: "user", body: query }, response]);
    setExpanded(Boolean(response.table));
    setQuery("");
  }

  if (!open) {
    return (
      <button className="chat-fab" type="button" onClick={() => setOpen(true)}>
        <Bot size={22} />
        MediaGPT
      </button>
    );
  }

  return (
    <section className={`chat-panel ${expanded ? "expanded" : ""}`} aria-label="MediaGPT">
      <header>
        <strong>MediaGPT</strong>
        <button type="button" onClick={() => setOpen(false)}>{t("Close")}</button>
      </header>
      <div className="chat-log">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role}>
            <p>{t(message.body)}</p>
            {message.table ? (
              <table>
                <tbody>
                  {message.table.map((row) => (
                    <tr key={row.join("-")}>{row.map((cell) => <td key={cell}>{t(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </article>
        ))}
      </div>
      <footer>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Ask MediaGPT")} onKeyDown={(event) => event.key === "Enter" && ask()} />
        <button type="button" onClick={ask} aria-label={t("Send")} title={t("Send")}><Send size={17} /></button>
      </footer>
      <div className="chat-actions">
        <button type="button">{t("Save output")}</button>
        <button type="button">{t("Export")}</button>
      </div>
    </section>
  );
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
  variant?: "primary" | "secondary";
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
  const ids = ["etihad-retail", "yas-tourism", "mall-footfall", "brand-guidelines", "compliance-pack", "live-slate"];
  return ids[index % ids.length];
}


// ==================== Bidder brief types + wizard ====================

interface BriefPayload {
  campaign: string;
  packageName: string;
  budget: string;
  creativeId: string;
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

const wizardCreativeIds = ["etihad-retail", "yas-tourism", "mall-footfall", "brand-guidelines", "compliance-pack", "live-slate"];
const wizardZones = ["Corniche", "Downtown", "Yas Island", "Al Ain gateways", "Airport road", "Reem Island"];

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
  const [data, setData] = useState<BriefPayload>({
    campaign: "",
    packageName: "Downtown retail loop",
    budget: "AED 320,000",
    creativeId: wizardCreativeIds[0],
    languages: "Arabic + English",
    startDate: "Jul 15, 2026",
    endDate: "Aug 15, 2026",
    priority: "Standard",
    objective: "",
    contactName: defaultBidder,
    contactEmail: "campaigns@bidder.ae",
    brand: "",
    vertical: "Retail",
    audience: "Residents 25-45, premium spenders",
    targetZones: ["Corniche", "Downtown"],
    daypart: "Prime evening (17:00-22:00)",
    reach: "Estimated 1.2M impressions / week",
    compliance: { uaeMedia: false, arabicProof: false, rightsCleared: false, noPolitical: false },
    assets: [
      { name: "hero-landscape.mp4", type: "Video 1920x1080", size: "24 MB", illustration: wizardCreativeIds[0] },
      { name: "hero-portrait.jpg", type: "Image 1080x1920", size: "3.1 MB", illustration: wizardCreativeIds[1] },
    ],
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

  function addAsset() {
    const nextId = wizardCreativeIds[data.assets.length % wizardCreativeIds.length];
    setData((d) => ({
      ...d,
      assets: [...d.assets, { name: `asset-${d.assets.length + 1}.mp4`, type: "Video 1920x1080", size: "18 MB", illustration: nextId }],
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
    (step === 3 && data.budget.trim()) ||
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
              <label><span>{t("Primary objective")}</span><textarea value={data.objective} onChange={(e) => update("objective", e.target.value)} placeholder={t("Describe what success looks like for this campaign.")} /></label>
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
                <Button icon={Plus} variant="secondary" onClick={addAsset}>{t("Add asset")}</Button>
              </div>
              <div className="wizard-asset-grid">
                {data.assets.map((asset, i) => (
                  <article key={i} className="wizard-asset">
                    <div className="creative-frame" style={{ backgroundImage: `url("${creativeBackground(asset.illustration)}")` }} />
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
              <label><span>{t("Expected reach")}</span><input value={data.reach} onChange={(e) => update("reach", e.target.value)} /></label>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-grid">
              <label><span>{t("Package")}</span>
                <select value={data.packageName} onChange={(e) => update("packageName", e.target.value)}>
                  <option>Downtown retail loop</option><option>Airport and premium roadside</option><option>Yas leisure loop</option><option>Civic bilingual pack</option>
                </select>
              </label>
              <label><span>{t("Total budget")}</span><input value={data.budget} onChange={(e) => update("budget", e.target.value)} placeholder="AED 320,000" /></label>
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
                <Detail label="Budget" value={data.budget} />
                <Detail label="Start" value={data.startDate} />
                <Detail label="End" value={data.endDate} />
                <Detail label="Languages" value={data.languages} />
                <Detail label="Priority" value={data.priority} />
                <Detail label="Zones" value={data.targetZones.join(", ") || "-"} />
                <Detail label="Daypart" value={data.daypart} />
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
            <Button icon={Send} onClick={() => onSubmit(data)}>{t("Submit to ADMO")}</Button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;

