import {
  Activity,
  AlertTriangle,
  BadgeCheck,
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
  PlugZap,
  RadioTower,
  RefreshCcw,
  MessageSquare,
  X,
  Plus,
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
  WalletCards,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createContext, FormEvent, ReactNode, useContext, useMemo, useState } from "react";
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
import "./dooh-styles.css";

type Page =
  | "control"
  | "cms"
  | "alerts"
  | "network"
  | "mediagpt"
  | "financials"
  | "lab"
  | "campaigns"
  | "marketplace";

type ProfileId = "control-room" | "reviewer" | "finance" | "admin" | "bidder";
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
  status: "Draft" | "Bidding" | "Submitted" | "In review" | "Approved" | "Scheduled" | "Published";
  reach: string;
  nextStep: string;
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
    pages: ["control", "cms", "alerts", "network", "mediagpt", "financials", "lab"],
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
  mediagpt: { id: "mediagpt", label: "MediaGPT Suite", icon: Bot },
  financials: { id: "financials", label: "Financials", icon: WalletCards },
  lab: { id: "lab", label: "AI Lab", icon: Cpu },
  campaigns: { id: "campaigns", label: "Campaigns", icon: Megaphone },
  marketplace: { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
};

const navGroups: NavGroup[] = [
  { label: "Operations", pages: ["control", "alerts", "network"] },
  { label: "Content", pages: ["cms", "mediagpt"] },
  { label: "Commercial", pages: ["financials"] },
  { label: "Platform", pages: ["lab"] },
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
  "Emergency alert live on network": "التنبيه الطارئ مباشر على الشبكة",
  "Alert reset. Re-run checks.": "تم إعادة تعيين التنبيه. أعد تشغيل الفحوصات.",
  "Live on network": "مباشر على الشبكة",
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
  "Cancel": "إلغاء",
  "Back": "رجوع",
  "Continue": "متابعة",
  "Submit to ADMO": "إرسال إلى أدمو",
  "Close": "إغلاق",
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
  "Control Centre": "مركز التحكم",
  "CMS": "إدارة المحتوى",
  "Alerts and Emergencies": "التنبيهات والطوارئ",
  "Network and Devices": "الشبكة والأجهزة",
  "MediaGPT Suite": "حزمة MediaGPT",
  "Financials": "الماليات",
  "AI Lab": "مختبر الذكاء الاصطناعي",
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
  "Advertiser": "معلن",
  "Bidder account": "حساب مزايد",

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
  "Save output": "حفظ المخرج",
  "Export": "تصدير",
  "Ask about assets, schedules, submissions, financials or emergencies. Large outputs expand here.": "اسأل عن الأصول أو الجداول أو الطلبات أو الماليات أو الطوارئ. تتوسع المخرجات الكبيرة هنا.",
  "Here is the current campaign workflow view.": "هذه هي نظرة سير عمل الحملات الحالية.",
  "There are two active alerts. The weather broadcast needs checks before it can move to approval.": "يوجد تنبيهان نشطان. يحتاج بث تنبيه الطقس إلى فحوصات قبل الانتقال إلى الاعتماد.",
  "The estate is mostly healthy: 3 of 5 assets are live, one is under maintenance, and one is offline.": "الشبكة بحالة جيدة عموماً: 3 من 5 أصول نشطة، أصل واحد تحت الصيانة، وأصل واحد غير متصل.",

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
  "Mussafah Bridge Banner": "لوحة جسر مصفح",
  "Yas Island Bus Stop Pair": "زوج شاشات محطة حافلات جزيرة ياس",
  "Al Ain Gateway": "بوابة العين",
  "Downtown Mall Entrance": "مدخل مركز وسط المدينة التجاري",
  "Highway billboard": "لوحة طريق سريع",
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

  "LED module batch": "دفعة وحدات LED",
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
  "Archive NLQ": "استعلام أرشيفي بلغة طبيعية",
  "Workflow Composer": "منشئ تدفقات العمل",
  "Targeting Assistant": "مساعد الاستهداف",
  "DCO Adapter": "محول DCO",
  "Yield Advisor": "مستشار العائد",
  "Drift Monitor": "مراقب الانحراف",
  "Where can we lift airport-loop yield without cannibalising civic slots?": "أين يمكن رفع عائد مسار المطار دون التأثير على الفترات المدنية؟",
  "Reallocate 6 evening slots on AD-APT-{003,007} to premium retail. Projected uplift AED 42,000 / week. No civic conflict.": "إعادة توزيع 6 فترات مسائية على AD-APT-{003,007} لتجزئة مميزة. ارتفاع متوقع 42,000 درهم/أسبوع. لا يوجد تعارض مدني.",
  "Anything unusual on the network in the last 24h?": "هل من شيء غير معتاد على الشبكة خلال 24 ساعة؟",
  "2 anomalies: latency spike on AD-BRG-014 (23:04, resolved), signed model drift within tolerance on Moderator v1.4.": "شذوذان: ارتفاع زمن الاستجابة على AD-BRG-014 (23:04، تم الحل)، انحراف نموذج موقّع ضمن الحدود لمشرف v1.4."
};

const I18nContext = createContext<Translator>((value) => value);

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

function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>("control");
  const [submissions, setSubmissions] = useState<Submission[]>(seedSubmissions);
  const [campaigns, setCampaigns] = useState<BidderCampaign[]>(seedBidderCampaigns);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(seedSchedule);
  const [published, setPublished] = useState<PublishedItem[]>(seedPublished);
  const [auctions, setAuctions] = useState<AuctionLot[]>(seedAuctions);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState("");

  const t = (value: string) => (lang === "ar" ? translations[value] ?? value : value);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function chooseProfile(next: Profile) {
    setProfile(next);
    setPage(next.pages[0]);
  }

  function goTo(next: Page) {
    if (!profile?.pages.includes(next)) return;
    setPage(next);
  }

  function submitBrief(payload: BriefPayload) {
    const suffix = String(submissions.length + 1049);
    const submission: Submission = {
      id: `SUB-${suffix}`,
      campaign: payload.campaign,
      bidder: profile?.name ?? "Bidder",
      packageName: payload.packageName,
      owner: payload.contactName || profile?.name || "Bidder account",
      requestedStart: payload.startDate || "Jul 15, 2026",
      budget: payload.budget,
      priority: payload.priority === "High" ? "High" : "Medium",
      stage: "Submitted",
      creativeId: payload.creativeId,
      language: payload.languages,
      notes: payload.objective || "Submitted from the bidder workspace and waiting for ADMO CMS review.",
    };
    const campaign: BidderCampaign = {
      id: `CMP-${campaigns.length + 222}`,
      campaign: payload.campaign,
      packageName: payload.packageName,
      budget: payload.budget,
      status: "Submitted",
      reach: payload.reach || "Pending ADMO estimate",
      nextStep: "ADMO content review",
    };
    setSubmissions((items) => [submission, ...items]);
    setCampaigns((items) => [campaign, ...items]);
    setWizardOpen(false);
    notify("Campaign submitted to ADMO CMS");
    setPage("campaigns");
  }

  function submitMarketplaceCampaign(payload: { campaign: string; packageName: string; budget: string; creativeId: string }) {
    submitBrief({
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

  function placeBid(payload: { lotId: string; amount: number; campaign: string }) {
    const lot = auctions.find((item) => item.id === payload.lotId);
    if (!lot) return;
    const bidderName = profile?.name ?? "Bidder";
    setAuctions((items) =>
      items.map((item) =>
        item.id === payload.lotId
          ? {
              ...item,
              currentBid: payload.amount,
              leadingBidder: bidderName,
              bidCount: item.bidCount + 1,
            }
          : item,
      ),
    );
    const campaign: BidderCampaign = {
      id: `CMP-${campaigns.length + 260}`,
      campaign: payload.campaign,
      packageName: lot.packageName,
      budget: `${lot.currency} ${payload.amount.toLocaleString("en-US")}`,
      status: "Bidding",
      reach: lot.impressions,
      nextStep: `Auction closes ${lot.closesAt}`,
    };
    setCampaigns((items) => [campaign, ...items.filter((c) => !(c.campaign === payload.campaign && c.status === "Bidding"))]);
    notify(`Bid placed on ${lot.lotName}`);
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
          <Topbar profile={profile} page={page} lang={lang} setLang={setLang} t={t} />
          {page === "control" && (
            <ControlCentre submissions={submissions} published={published} notify={notify} goToAlerts={() => profile?.pages.includes("alerts") && setPage("alerts")} t={t} />
          )}
          {page === "cms" && (
            <CmsPage
              submissions={submissions}
              setSubmissions={setSubmissions}
              schedule={schedule}
              setSchedule={setSchedule}
              published={published}
              setPublished={setPublished}
              setCampaigns={setCampaigns}
              notify={notify}
              t={t}
            />
          )}
          {page === "alerts" && <AlertsPage notify={notify} t={t} />}
          {page === "network" && <NetworkPage t={t} />}
          {page === "mediagpt" && <MediaGptSuite t={t} />}
          {page === "financials" && <FinancialsPage submissions={submissions} notify={notify} t={t} />}
          {page === "lab" && <AiLabPage t={t} />}
          {page === "campaigns" && <CampaignsPage campaigns={campaigns} onNewBrief={() => setWizardOpen(true)} t={t} />}
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
    </main>
  );
}

function Sidebar({
  profile,
  page,
  goTo,
  onSwitch,
  t,
}: {
  profile: Profile;
  page: Page;
  goTo: (page: Page) => void;
  onSwitch: () => void;
  t: (value: string) => string;
}) {
  const allowed = new Set(profile.pages);
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="brand-mark" src={admoLogo} alt="ADMO" />
        <div>
          <strong>{t("DOOH")}</strong>
          <span>{t("Unified Platform")}</span>
        </div>
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
    </aside>
  );
}

function Topbar({
  profile,
  page,
  lang,
  setLang,
  t,
}: {
  profile: Profile;
  page: Page;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (value: string) => string;
}) {
  const meta = navItems[page];
  return (
    <header className="topbar">
      <div>
        <p>{t(profile.organization)}</p>
        <h1>{t(meta.label)}</h1>
      </div>
      <div className="topbar-actions">
        <span className="session-pill"><LockKeyhole size={15} />{t(profile.role)}</span>
        <button className="icon-button" type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
          <Globe2 size={18} />
          {lang === "en" ? "AR" : "EN"}
        </button>
      </div>
    </header>
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
  const selectedAsset = estateAssets.find((asset) => asset.id === selectedAssetId) ?? estateAssets[0];
  const liveCount = estateAssets.filter((asset) => asset.status === "Live").length;
  const queuedCount = submissions.filter((item) => item.stage === "Approved" || item.stage === "Scheduled").length;
  const zoneStats = useMemo(() => summarizeZones(estateAssets), []);
  const openAlarmAssetIds = tickets.filter((ticket) => ticket.status !== "Resolved").map((ticket) => ticket.asset);

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
        <Panel icon={MapPinned} title={t("Live map")} action={<Legend />}>
          <LiveMap
            assets={estateAssets}
            selectedAssetId={selectedAssetId}
            onMarkerClick={setSelectedAssetId}
            openAlarmAssetIds={openAlarmAssetIds}
            t={t}
          />
        </Panel>
        <Panel icon={MonitorPlay} title="Live view">
          <LiveView asset={selectedAsset} />
        </Panel>
      </div>

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
    </PageBody>
  );
}

function CmsPage({
  submissions,
  setSubmissions,
  schedule,
  setSchedule,
  published,
  setPublished,
  setCampaigns,
  notify,
  t,
}: {
  submissions: Submission[];
  setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  published: PublishedItem[];
  setPublished: React.Dispatch<React.SetStateAction<PublishedItem[]>>;
  setCampaigns: React.Dispatch<React.SetStateAction<BidderCampaign[]>>;
  notify: (message: string) => void;
  t: (value: string) => string;
}) {
  const [tab, setTab] = useState<CmsTab>("submissions");
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? "");
  const selected = submissions.find((item) => item.id === selectedId) ?? submissions[0];
  const approved = submissions.filter((item) => ["Approved", "Scheduled", "Published"].includes(item.stage)).length;
  const pending = submissions.filter((item) => item.stage === "Submitted" || item.stage === "In review").length;
  const approvalRate = submissions.length ? Math.round((approved / submissions.length) * 100) : 0;

  function updateStage(id: string, next: SubmissionStage) {
    const item = submissions.find((submission) => submission.id === id);
    if (!item) return;
    setSubmissions((items) => items.map((submission) => (submission.id === id ? { ...submission, stage: next } : submission)));
    setCampaigns((items) =>
      items.map((campaign) =>
        campaign.campaign === item.campaign
          ? { ...campaign, status: mapCampaignStatus(next), nextStep: campaignNextStep(next) }
          : campaign,
      ),
    );
    if (next === "Scheduled" && !schedule.some((slot) => slot.campaign === item.campaign)) {
      setSchedule((items) => [
        ...items,
        {
          id: `SCH-${items.length + 1}`.padStart(7, "0"),
          time: "16:00",
          asset: "AD-HWY-001",
          campaign: item.campaign,
          owner: item.bidder,
          state: "Queued",
        },
      ]);
    }
    if (next === "Published" && !published.some((publishedItem) => publishedItem.campaign === item.campaign)) {
      setPublished((items) => [
        {
          id: `PUB-${items.length + 1}`.padStart(7, "0"),
          campaign: item.campaign,
          asset: "AD-HWY-001",
          creativeId: item.creativeId,
          started: "Now",
        },
        ...items,
      ]);
    }
    notify(`${t(item.campaign)}: ${t(next)}`);
  }

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
        <div className="split-grid cms-grid">
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
            <SubmissionDetail submission={selected} onStage={updateStage} />
          </Panel>
        </div>
      ) : null}

      {tab === "library" && <MediaLibrary t={t} />}
      {tab === "scheduling" && <SchedulingBoard schedule={schedule} setSchedule={setSchedule} t={t} />}
    </PageBody>
  );
}

function SubmissionDetail({ submission, onStage }: { submission: Submission; onStage: (id: string, stage: SubmissionStage) => void }) {
  const t = useT();
  const approvalHash = shortHash(`${submission.id}-approval`);
  const contentHash = shortHash(`${submission.id}-content`);
  const highImpact = submission.priority === "High" || submission.budget.includes("civic") || submission.campaign.toLowerCase().includes("takeover");
  const published = submission.stage === "Published";

  return (
    <div className="detail-stack">
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
      <StageTracker stage={submission.stage} />
      <p className="notes">{t(submission.notes)}</p>

      <div className="governance-row">
        <article className="governance-card">
          <header>
            <BadgeCheck size={15} />
            <span>{t("Named approver")}</span>
          </header>
          <strong>{t(submission.owner)}</strong>
          <div className="gov-chips">
            <span className="gov-chip">UAE PASS</span>
            <span className="gov-chip">MFA</span>
            {highImpact ? <span className="gov-chip dual">{t("Dual-control")}</span> : null}
          </div>
          <dl>
            <div><dt>{t("Approval hash")}</dt><dd><code>{approvalHash}</code></dd></div>
            <div><dt>{t("Content hash")}</dt><dd><code>{contentHash}</code></dd></div>
          </dl>
        </article>
        <article className="governance-card">
          <header>
            <ShieldCheck size={15} />
            <span>{t("AI screening")}</span>
          </header>
          <strong>{t("Cleared by MediaGPT Moderator")}</strong>
          <ul className="gov-list">
            <li><span>{t("Integrity")}</span><em>97%</em></li>
            <li><span>{t("OCR AR/EN")}</span><em>{t("Passed")}</em></li>
            <li><span>{t("Deepfake scan")}</span><em>{t("Clean")}</em></li>
          </ul>
        </article>
        <article className="governance-card">
          <header>
            <FileCheck2 size={15} />
            <span>{t("Proof-of-Play ledger")}</span>
          </header>
          {published ? (
            <ul className="pop-ledger">
              {[0, 1, 2].map((offset) => {
                const block = shortHash(`${submission.id}-pop-${offset}`);
                return (
                  <li key={block}>
                    <span className="pop-time">{`16:${(30 + offset * 4).toString().padStart(2, "0")}`}</span>
                    <span className="pop-asset">AD-HWY-{(1 + offset).toString().padStart(3, "0")}</span>
                    <code>{block}</code>
                    <span className="pop-sig">TPM</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="gov-empty">{t("Evidence appears after Edge Play.")}</p>
          )}
        </article>
      </div>

      <AiDeepScan submission={submission} />

      <ReviewerNotes submissionId={submission.id} />

      <ActionRow>
        {submission.stage === "Submitted" && <Button onClick={() => onStage(submission.id, "In review")}>Start review</Button>}
        {submission.stage === "In review" && (
          <>
            <Button onClick={() => onStage(submission.id, "Approved")}>Approve</Button>
            <Button variant="secondary" onClick={() => onStage(submission.id, "Changes requested")}>Request changes</Button>
            <Button variant="secondary" onClick={() => onStage(submission.id, "Submitted")}>Return to intake</Button>
          </>
        )}
        {submission.stage === "Approved" && <Button onClick={() => onStage(submission.id, "Scheduled")}>Add to schedule</Button>}
        {submission.stage === "Scheduled" && <Button onClick={() => onStage(submission.id, "Published")}>Publish</Button>}
        {submission.stage === "Published" && <StatusPill label="Published to network" tone="good" />}
        {submission.stage === "Changes requested" && <StatusPill label="Waiting for bidder revision" tone="warn" />}
      </ActionRow>
    </div>
  );
}

function AiDeepScan({ submission }: { submission: Submission }) {
  const t = useT();
  const seed = submission.id.length;
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
  const [rerun, setRerun] = useState(0);

  return (
    <Panel icon={Sparkles} title={t("MediaGPT deep-scan")} action={<Button variant="secondary" icon={RefreshCcw} onClick={() => setRerun((n) => n + 1)}>{t("Re-run scan")}</Button>}>
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
    </Panel>
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
  const items = seedMediaAssets.filter((item) => category === "All" || item.type === category);
  const categories: Array<MediaAsset["type"] | "All"> = ["All", "Image", "Video", "Document", "Live Stream"];

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
      <Panel icon={ImageIcon} title={t("Media Library")} action={<Button icon={Upload}>{t("Upload media")}</Button>}>
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
  setSchedule,
  t,
}: {
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  t: (value: string) => string;
}) {
  function promote(id: string) {
    setSchedule((items) => items.map((item) => (item.id === id ? { ...item, state: "Playing" } : item)));
  }

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
            {slot.state !== "Playing" ? <Button variant="secondary" onClick={() => promote(slot.id)}>Play now</Button> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function AlertsPage({ notify, t }: { notify: (message: string) => void; t: (value: string) => string }) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(seedAlerts);
  const [selectedAlertId, setSelectedAlertId] = useState(seedAlerts[0].id);
  const [steps, setSteps] = useState<VerificationStep[]>(initialVerificationSteps);
  const [draft, setDraft] = useState({ title: "", scope: "", content: "", criticality: "Major" });
  const selected = alerts.find((alert) => alert.id === selectedAlertId) ?? alerts[0];
  const checked = steps.every((step) => step.state === "Checked");

  function createAlert(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const alert: EmergencyAlert = {
      id: `ALT-${alerts.length + 902}`,
      title: draft.title,
      scope: draft.scope || "Estate-wide",
      authority: "Duty officer",
      sla: "Display within 60s",
      audience: "Public",
      endTime: "Default 2 hours",
      state: "Check required",
      criticality: draft.criticality as EmergencyAlert["criticality"],
    };
    setAlerts((items) => [alert, ...items]);
    setSelectedAlertId(alert.id);
    setSteps(initialVerificationSteps);
    setDraft({ title: "", scope: "", content: "", criticality: "Major" });
    notify("Alert created and waiting for checks");
  }

  function runChecks() {
    setSteps((items) => items.map((item) => ({ ...item, state: "Checked" })));
    setAlerts((items) => items.map((item) => (item.id === selected.id ? { ...item, state: "Approval required" } : item)));
    notify("Emergency checks completed");
  }

  function queueBroadcast() {
    if (!checked) return;
    setAlerts((items) => items.map((item) => (item.id === selected.id ? { ...item, state: "Broadcast queued" } : item)));
    notify("Emergency broadcast queued");
  }

  function broadcastNow() {
    if (!checked) return;
    setAlerts((items) => items.map((item) => (item.id === selected.id ? { ...item, state: "Live on network" } : item)));
    notify("Emergency alert live on network");
  }

  function resetAlert() {
    setAlerts((items) => items.map((item) => (item.id === selected.id ? { ...item, state: "Check required" } : item)));
    notify("Alert reset. Re-run checks.");
  }


  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Ongoing alerts" value={String(alerts.length)} helper="Active or queued" tone="danger" />
        <Metric label="SLA health" value="96%" helper="Emergency response" tone="good" />
        <Metric label="Time to display" value="00:42" helper="Average last 24h" tone="info" />
        <Metric label="Awaiting checks" value={String(alerts.filter((alert) => alert.state === "Check required").length)} helper="Needs action" tone="warn" />
      </MetricGrid>

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
        <div className="verification-grid">
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
          <Button onClick={runChecks}>{t("Run checks")}</Button>
          <Button variant="secondary" onClick={queueBroadcast}>{t("Queue broadcast")}</Button>
          <Button variant="secondary" onClick={broadcastNow}>{t("Broadcast now")}</Button>
          <Button variant="secondary" onClick={resetAlert}>{t("Reset")}</Button>
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

      <div className="split-grid equal">
        <Panel icon={Wrench} title="Maintenance workbench">
          <KanbanBoard />
        </Panel>
        <Panel icon={ClipboardCheck} title="BoM, service orders and POs">
          <InventoryTables />
        </Panel>
      </div>
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

function InventoryTables() {
  return (
    <div className="inventory-stack">
      <CompactTable
        columns={["Item", "State", "PO"]}
        rows={[
          ["LED module batch", "Available", "PO-4471"],
          ["Edge controller", "Ordered", "PO-4490"],
          ["Power supply 48V", "Reserved", "PO-4452"],
        ]}
      />
      <CompactTable
        columns={["Order", "Asset", "Status"]}
        rows={[
          ["SO-8821", "AD-BRG-014", "Technician assigned"],
          ["SO-8816", "AD-HWY-009", "Awaiting controller"],
          ["SO-8794", "AD-DWT-011", "Completed"],
        ]}
      />
    </div>
  );
}

function KanbanBoard() {
  const t = useT();
  const columns = ["Pending Assignment", "Pending Execution", "In Progress", "Completed", "Overdue"];
  return (
    <div className="kanban">
      {columns.map((column) => (
        <section key={column}>
          <strong>{t(column)}</strong>
          {fieldTasks.filter((task) => task.column === column).slice(0, 2).map((task) => (
            <article key={task.id}>
              <span>{t(task.priority)}</span>
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
    name: "Archive NLQ",
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
    name: "Workflow Composer",
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
    name: "Targeting Assistant",
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
    name: "DCO Adapter",
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
    name: "Yield Advisor",
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
        ["09:12", "Model drift - Moderator v1.4", "Low", "Within tolerance"],
      ],
      notes: ["Signed audit trail available for both events"],
      primaryAction: "Open audit log",
      primaryTone: "info",
    }),
  },
  {
    id: "drift-monitor",
    family: "Safeguard",
    name: "Drift Monitor",
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
        ["09:12", "Model drift - Moderator v1.4", "Low", "Within tolerance"],
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

function FinancialsPage({ submissions, notify, t }: { submissions: Submission[]; notify: (message: string) => void; t: (value: string) => string }) {
  const [budget, setBudget] = useState(420);
  const [demand, setDemand] = useState(68);
  const [discount, setDiscount] = useState(8);
  const projectedRevenue = Math.round(budget * (0.72 + demand / 180) * (1 - discount / 100));

  const seedApprovals: FinanceApproval[] = useMemo(() => {
    const base: FinanceApproval[] = submissions
      .filter((s) => s.stage === "Submitted" || s.stage === "In review")
      .slice(0, 4)
      .map((s, i) => ({
        id: `FIN-${1200 + i}`,
        campaign: s.campaign,
        bidder: s.bidder,
        packageName: s.packageName,
        amount: s.budget,
        margin: `${18 + i * 3}%`,
        risk: i === 0 ? "Elevated" : i === 1 ? "Low" : "Medium",
        state: "Pending",
      }));
    if (base.length === 0) {
      base.push({
        id: "FIN-1200",
        campaign: "Airport retail launch",
        bidder: "Advertiser",
        packageName: "Airport and premium roadside",
        amount: "AED 420,000",
        margin: "24%",
        risk: "Low",
        state: "Pending",
      });
    }
    return base;
  }, [submissions]);

  const [approvals, setApprovals] = useState<FinanceApproval[]>(seedApprovals);
  // reset when underlying submissions change (persona switch)
  const approvalsKey = seedApprovals.map((a) => a.id).join("|");
  useMemo(() => setApprovals(seedApprovals), [approvalsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function decide(id: string, state: FinanceApproval["state"]) {
    setApprovals((items) => items.map((item) => (item.id === id ? { ...item, state } : item)));
    const item = approvals.find((a) => a.id === id);
    if (item) notify(`${t(item.campaign)}: ${t(state)}`);
  }

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
                        <Button onClick={() => decide(row.id, "Approved")}>{t("Approve")}</Button>
                        <Button variant="secondary" onClick={() => decide(row.id, "On hold")}>{t("Hold")}</Button>
                        <Button variant="secondary" onClick={() => decide(row.id, "Rejected")}>{t("Reject")}</Button>
                      </div>
                    ) : (
                      <Button variant="secondary" onClick={() => decide(row.id, "Pending")}>{t("Re-open")}</Button>
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



function AiLabPage({ t }: { t: (value: string) => string }) {
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Models online" value="12" helper="Vision, language, anomaly" tone="good" />
        <Metric label="Token spend" value="AED 42k" helper="Month to date" tone="info" />
        <Metric label="Skills deployed" value="34" helper="Agent capabilities" tone="good" />
        <Metric label="Integrations" value="18" helper="APIs, ERP, files" tone="neutral" />
      </MetricGrid>
      <div className="split-grid equal">
        <Panel icon={Cpu} title="Model consumption">
          <CompactTable
            columns={["Model", "Use", "Tokens", "Cost"]}
            rows={[
              ["Vision moderation", "Creative review", "18.2M", "AED 8.4k"],
              ["Arabic language QA", "Copy parity", "12.6M", "AED 5.1k"],
              ["Demand optimizer", "Bid planning", "7.9M", "AED 3.7k"],
              ["Network sentinel", "Telemetry", "21.4M", "AED 9.8k"],
            ]}
          />
        </Panel>
        <Panel icon={Workflow} title="Skills">
          <ObjectList
            rows={[
              { id: "SK-01", title: "Creative risk classifier", meta: "OCR, logo, claim, cultural policy", tone: "good", status: "Live" },
              { id: "SK-02", title: "Emergency route builder", meta: "Scope, cache, edge override", tone: "good", status: "Live" },
              { id: "SK-03", title: "Yield scenario planner", meta: "Demand, budget, price floors", tone: "info", status: "Beta" },
              { id: "SK-04", title: "Maintenance triage", meta: "Sensor anomalies to work orders", tone: "good", status: "Live" },
            ]}
          />
        </Panel>
      </div>
      <Panel icon={Database} title="Data integrations">
        <CompactTable
          columns={["Source", "Type", "State", "Owner"]}
          rows={[
            ["ADMO CMS", "API", "Synced", "Content operations"],
            ["Finance ERP", "ERP", "Daily batch", "Finance"],
            ["Edge telemetry", "Streaming API", "Live", "Network operations"],
            ["Bidder creative packs", "Plain files", "Validated", "CMS reviewers"],
          ]}
        />
      </Panel>
    </PageBody>
  );
}

function CampaignsPage({ campaigns, onNewBrief, t }: { campaigns: BidderCampaign[]; onNewBrief: () => void; t: (value: string) => string }) {
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Campaigns" value={String(campaigns.length)} helper="Bidder workspace" tone="info" />
        <Metric label="Live or published" value={String(campaigns.filter((item) => item.status === "Published").length)} helper="On network" tone="good" />
        <Metric label="In review" value={String(campaigns.filter((item) => item.status === "Submitted" || item.status === "In review").length)} helper="ADMO action" tone="warn" />
        <Metric label="Active bids" value={String(campaigns.filter((item) => item.status === "Bidding").length)} helper="Auctions in progress" tone="info" />
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
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td data-label={t("Campaign")}><strong>{t(campaign.campaign)}</strong><span>{t(campaign.reach)}</span></td>
                  <td data-label={t("Package")}>{t(campaign.packageName)}</td>
                  <td data-label={t("Budget")}>{t(campaign.budget)}</td>
                  <td data-label={t("Status")}><StatusPill label={campaign.status} tone={campaignStatusTone(campaign.status)} /></td>
                  <td data-label={t("Next step")}>{t(campaign.nextStep)}</td>
                </tr>
              ))}
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
        <button type="button" onClick={ask}><Send size={17} /></button>
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
  const asksCampaign = normalized.includes("table") || normalized.includes("campaign") || normalized.includes("submission") || /حملة|حملات|طلب|طلبات|جدول/.test(query);
  const asksEmergency = normalized.includes("emergency") || normalized.includes("alert") || /طوارئ|تنبيه|إنذار|انذار/.test(query);
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
  if (asksEmergency) {
    return { role: "assistant", body: "There are two active alerts. The weather broadcast needs checks before it can move to approval." };
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
  if (status === "Submitted" || status === "In review") return "warn";
  if (status === "Bidding") return "info";
  return "neutral";
}

function mapCampaignStatus(stage: SubmissionStage): BidderCampaign["status"] {
  if (stage === "Submitted") return "Submitted";
  if (stage === "In review" || stage === "Changes requested") return "In review";
  if (stage === "Approved") return "Approved";
  if (stage === "Scheduled") return "Scheduled";
  if (stage === "Published") return "Published";
  return "In review";
}

function campaignNextStep(stage: SubmissionStage) {
  if (stage === "Submitted") return "Waiting for ADMO review";
  if (stage === "In review") return "Content screening";
  if (stage === "Approved") return "Scheduling";
  if (stage === "Scheduled") return "Awaiting publish";
  if (stage === "Published") return "Proof-of-play reconciliation";
  return "Revise creative pack";
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

  const canNext =
    (step === 0 && data.campaign.trim() && data.brand.trim()) ||
    (step === 1 && data.assets.length > 0) ||
    (step === 2 && data.targetZones.length > 0) ||
    (step === 3 && data.budget.trim()) ||
    (step === 4 && Object.values(data.compliance).every(Boolean)) ||
    step === 5;

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
            <Button onClick={() => canNext && setStep(step + 1)}>{t("Continue")}</Button>
          ) : (
            <Button icon={Send} onClick={() => onSubmit(data)}>{t("Submit to ADMO")}</Button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;

