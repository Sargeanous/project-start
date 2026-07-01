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
  Search,
  Send,
  ShieldAlert,
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
type AlertState = "Check required" | "Checked" | "Approval required" | "Broadcast queued" | "Broadcasting";

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
    name: "Etihad Retail",
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

const seedSubmissions: Submission[] = [
  {
    id: "SUB-1048",
    campaign: "Airport retail launch",
    bidder: "Etihad Retail",
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
    lotName: "Corniche prime — evening rotation",
    packageName: "Airport and premium roadside",
    network: "12 panels · Corniche, Airport Road",
    flightWindow: "Jul 20 – Aug 03, 2026",
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
    lotName: "Downtown retail loop — weekend",
    packageName: "Downtown retail loop",
    network: "18 mall & urban panels",
    flightWindow: "Jul 12 – Jul 26, 2026",
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
    lotName: "Yas leisure loop — summer flight",
    packageName: "Yas leisure loop",
    network: "9 panels · Yas Island & hotel corridor",
    flightWindow: "Jul 15 – Aug 15, 2026",
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
  "Etihad Retail": "اتحاد ريتيل",
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
  "Approve": "اعتماد",
  "Request changes": "طلب تعديلات",
  "Add to schedule": "إضافة إلى الجدول",
  "Publish": "نشر",
  "Published to network": "تم النشر على الشبكة",
  "Waiting for bidder revision": "بانتظار تعديل المزايد",
  "Owner": "المالك",
  "Package": "الباقة",
  "Budget": "الميزانية",
  "Start": "البداية",
  "Language": "اللغة",
  "Submitted": "مقدم",
  "In review": "قيد المراجعة",
  "Approved": "معتمد",
  "Scheduled": "مجدول",
  "Published": "منشور",
  "Changes requested": "تم طلب تعديلات",
  "Low": "منخفض",
  "Medium": "متوسط",
  "High": "مرتفع",
  "All": "الكل",
  "Image": "صورة",
  "Video": "فيديو",
  "Document": "مستند",
  "Live Stream": "بث مباشر",
  "Upload media": "رفع وسائط",
  "Pending Review": "بانتظار المراجعة",
  "Rejected": "مرفوض",
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
  "Al Ain gateways": "بوابات العين",
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
  "Creative pack": "حزمة التصميم",
  "Campaign name": "اسم الحملة",
  "Submit campaign": "إرسال الحملة",
  "Arabic and English creative uploaded": "تم رفع تصميم عربي وإنجليزي",
  "From AED 380,000": "ابتداءً من 380,000 درهم",
  "From AED 150,000": "ابتداءً من 150,000 درهم",
  "From AED 210,000": "ابتداءً من 210,000 درهم",

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
  "Close": "إغلاق",
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
  "Yas Island": "جزيرة ياس",
  "Al Ain": "العين",
  "Downtown": "وسط المدينة",
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
  "Revise creative pack": "تعديل حزمة التصميم"
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

  function submitMarketplaceCampaign(payload: { campaign: string; packageName: string; budget: string; creativeId: string }) {
    const suffix = String(submissions.length + 1049);
    const submission: Submission = {
      id: `SUB-${suffix}`,
      campaign: payload.campaign,
      bidder: profile?.name ?? "Bidder",
      packageName: payload.packageName,
      owner: profile?.name ?? "Bidder account",
      requestedStart: "Jul 15, 2026",
      budget: payload.budget,
      priority: "Low",
      stage: "Submitted",
      creativeId: payload.creativeId,
      language: "Arabic and English",
      notes: "Submitted from the bidder marketplace and waiting for ADMO CMS review.",
    };
    const campaign: BidderCampaign = {
      id: `CMP-${campaigns.length + 222}`,
      campaign: payload.campaign,
      packageName: payload.packageName,
      budget: payload.budget,
      status: "Submitted",
      reach: "Pending ADMO estimate",
      nextStep: "ADMO content review",
    };
    setSubmissions((items) => [submission, ...items]);
    setCampaigns((items) => [campaign, ...items]);
    notify("Campaign submitted to ADMO CMS");
    setPage("campaigns");
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
      <div className="app" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Sidebar profile={profile} page={page} goTo={goTo} onSwitch={() => setProfile(null)} t={t} />
        <main className="workspace">
          <Topbar profile={profile} page={page} lang={lang} setLang={setLang} t={t} />
          {page === "control" && (
            <ControlCentre submissions={submissions} published={published} t={t} />
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
          {page === "financials" && <FinancialsPage t={t} />}
          {page === "lab" && <AiLabPage t={t} />}
          {page === "campaigns" && <CampaignsPage campaigns={campaigns} t={t} />}
          {page === "marketplace" && <MarketplacePage onSubmit={submitMarketplaceCampaign} onBid={placeBid} auctions={auctions} t={t} />}
        </main>
        <MediaGptChatbot t={t} />
        {toast ? <Toast>{toast}</Toast> : null}
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
  t,
}: {
  submissions: Submission[];
  published: PublishedItem[];
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
      <ActionRow>
        {submission.stage === "Submitted" && <Button onClick={() => onStage(submission.id, "In review")}>Start review</Button>}
        {submission.stage === "In review" && (
          <>
            <Button onClick={() => onStage(submission.id, "Approved")}>Approve</Button>
            <Button variant="secondary" onClick={() => onStage(submission.id, "Changes requested")}>Request changes</Button>
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

function MediaGptSuite({ t }: { t: (value: string) => string }) {
  const agents = [
    ["MediaGPT Moderator", "Screens creative, flags OCR, deepfake and cultural risks.", "Mandatory"],
    ["MediaGPT Compliance Agent", "Routes named approvers and policy checks.", "Mandatory"],
    ["MediaGPT Studio", "Creates and adapts panel formats in Arabic and English.", "Advanced"],
    ["MediaGPT Sentinel", "Detects edge, CMS and network anomalies.", "Mandatory"],
    ["MediaGPT Optimizer", "Optimizes yield, slot allocation and dynamic pricing.", "Optional"],
    ["MediaGPT Insights", "Answers natural-language questions across campaigns and assets.", "Advanced"],
  ];

  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Agents active" value="8" helper="Governed platform agents" tone="good" />
        <Metric label="Saved outputs" value="42" helper="Dashboards, tables, drafts" tone="info" />
        <Metric label="Human approvals" value="11" helper="Required before execution" tone="warn" />
        <Metric label="Arabic QA" value="98%" helper="Copy parity checks" tone="good" />
      </MetricGrid>

      <Panel icon={Bot} title="Agents">
        <div className="agent-grid">
          {agents.map(([name, body, badge]) => (
            <article key={name} className="agent-card">
              <div>
                <Sparkles size={18} />
                <StatusPill label={badge} tone={badge === "Mandatory" ? "good" : "info"} />
              </div>
              <strong>{t(name)}</strong>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </Panel>

      <div className="split-grid equal">
        <Panel icon={Search} title="Discover">
          <MediaGptPrompt
            prompt="When did Coca-Cola last advertise on Yas Island, and what was the contract value?"
            output="Last Yas Island placement: Aug 2024. Contract value AED 268,500. Most recent estate placement: Mar 2025, Maqta Bridge."
          />
        </Panel>
        <Panel icon={Workflow} title="Command">
          <MediaGptPrompt
            prompt="Select all parking assets within 1 km of ADNEC and push a weekday morning campaign."
            output="Workflow prepared: resolve geography, select approved creative, set schedule, run governance check, save reusable task."
          />
        </Panel>
      </div>
      <div className="split-grid equal">
        <Panel icon={Zap} title="Create">
          <MediaGptPrompt
            prompt="Make-it-in-the-Emirates, desert sunrise, Arabic first, civic tone."
            output="Three bilingual concepts generated and adapted to 6:1, 9:16, 1:1 and 3:4 panels."
          />
        </Panel>
        <Panel icon={BadgeCheck} title="Protect">
          <MediaGptPrompt
            prompt="Check authenticity, rights and cultural soundness for CR-90421."
            output="Integrity score 97%. No manipulation detected. Copyright match requires named approver review."
          />
        </Panel>
      </div>
    </PageBody>
  );
}

function FinancialsPage({ t }: { t: (value: string) => string }) {
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
        <Metric label="Yield gap" value="7.8%" helper="Scenario target" tone="neutral" />
      </MetricGrid>
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

function CampaignsPage({ campaigns, t }: { campaigns: BidderCampaign[]; t: (value: string) => string }) {
  return (
    <PageBody>
      <MetricGrid>
        <Metric label="Campaigns" value={String(campaigns.length)} helper="Bidder workspace" tone="info" />
        <Metric label="Live or published" value={String(campaigns.filter((item) => item.status === "Published").length)} helper="On network" tone="good" />
        <Metric label="In review" value={String(campaigns.filter((item) => item.status === "Submitted" || item.status === "In review").length)} helper="ADMO action" tone="warn" />
        <Metric label="Estimated reach" value="2.2M" helper="Current portfolio" tone="neutral" />
      </MetricGrid>
      <Panel icon={Megaphone} title={t("Campaigns")}>
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
  t,
}: {
  onSubmit: (payload: { campaign: string; packageName: string; budget: string; creativeId: string }) => void;
  t: (value: string) => string;
}) {
  const [selected, setSelected] = useState(marketplacePackages[0]);
  const [campaign, setCampaign] = useState("Airport retail launch");
  const [budget, setBudget] = useState("AED 420,000");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ campaign, packageName: selected.name, budget, creativeId: selected.creativeId });
  }

  return (
    <PageBody>
      <div className="split-grid wide-left">
        <Panel icon={ShoppingBag} title={t("Marketplace")}>
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
    </PageBody>
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
  const currentIndex = stageOrder.indexOf(stage);
  return (
    <div className="stage-tracker">
      {stageOrder.map((item, index) => (
        <span key={item} className={index <= currentIndex ? "complete" : ""}>
          {t(item)}
        </span>
      ))}
    </div>
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
  if (state === "Broadcasting" || state === "Checked") return "good";
  if (state === "Broadcast queued") return "info";
  if (state === "Approval required" || state === "Check required") return "warn";
  return "neutral";
}

function campaignStatusTone(status: BidderCampaign["status"]): Tone {
  if (status === "Published") return "good";
  if (status === "Approved" || status === "Scheduled") return "info";
  if (status === "Submitted" || status === "In review") return "warn";
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

export default App;
