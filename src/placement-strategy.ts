import { assets, type Asset } from "./data";
import type {
  DoohRule,
  KnowledgeSource,
  LocalizedText,
  RuleSimulationContext,
} from "./intelligence-content";

export type PlacementZoneClass = 0 | 1 | 2 | 3;
export type PlacementSize = "Small" | "Medium" | "Large";
export type RoadSpeedBand = "0-40" | "41-80" | "81-100" | "101-160";
export type PlacementRoadClass = "Highway" | "Arterial" | "Boulevard" | "Waterfront promenade";
export type PlacementCarriageway = "Dual" | "Single";
export type PlacementVerdict = "Compliant" | "Review required" | "Not permitted";
export type PlacementCheckState = "pass" | "warn" | "block";

export interface PlacementFormatSpec {
  id: string;
  name: LocalizedText;
  medium: "Digital" | "Static";
  size: PlacementSize;
  aspectRatio?: "9:16" | "16:9" | "Site dependent";
  maxWidthM?: number;
  maxHeightM?: number;
  maxBridgeSpanPct?: number;
  groundClearanceM?: number;
  allowedSpeedBands: Partial<Record<RoadSpeedBand, number>>;
  sourcePage: number;
}

export interface PlacementZonePolicy {
  zone: PlacementZoneClass;
  name: LocalizedText;
  focus: LocalizedText;
  description: LocalizedText;
  densityPerKm: Record<PlacementSize, number>;
  examples: LocalizedText[];
}

export interface RegulatoryZoneShape {
  id: string;
  zone: PlacementZoneClass;
  name: LocalizedText;
  center: { lat: number; lng: number };
  polygon: Array<{ lat: number; lng: number }>;
}

export interface AssetPlacementProfile {
  assetId: string;
  formatId: string;
  zoneClass: PlacementZoneClass;
  roadSpeedKph: number;
  widthM: number;
  heightM: number;
  groundClearanceM?: number;
  bridgeSpanM?: number;
  fixedInfrastructure?: boolean;
  specialCase?: boolean;
  legacy?: boolean;
  permitStatus: "Active" | "Review due" | "Provisional";
  bearingDeg: number;
}

export interface PlacementCandidate {
  id: string;
  name: LocalizedText;
  marketArea: LocalizedText;
  lat: number;
  lng: number;
  zoneClass: PlacementZoneClass;
  roadSpeedKph: number;
  roadClass?: PlacementRoadClass;
  carriageway?: PlacementCarriageway;
  distanceToJunctionM?: number;
  formatId: string;
  widthM: number;
  heightM: number;
  groundClearanceM?: number;
  bridgeSpanM?: number;
  fixedInfrastructure?: boolean;
  publicSafety?: boolean;
  legacy?: boolean;
  projectedWeeklyReach: number;
  estimatedCapexAed: number;
  status: "Draft" | "Shortlisted" | "Approved" | "Promoted to build";
  existingAssetId?: string;
}

export interface PlacementCheck {
  id: string;
  label: LocalizedText;
  state: PlacementCheckState;
  detail: LocalizedText;
  source: string;
}

export interface PlacementEvaluation {
  verdict: PlacementVerdict;
  candidate: PlacementCandidate;
  format: PlacementFormatSpec;
  speedBand: RoadSpeedBand;
  minimumClearanceM: number | null;
  nearestAsset: { asset: Asset; distanceM: number } | null;
  nearbyAssets: Array<{ assetId: string; name: string; distanceM: number }>;
  diameterM: number;
  diameterCount: number;
  diameterLimit: number;
  zoneCountPerKm: number;
  zoneLimitPerKm: number;
  checks: PlacementCheck[];
  alternatives: PlacementFormatSpec[];
  recommendation: LocalizedText;
}

export interface PlacementIntake {
  id: string;
  candidateId: string;
  candidateName: string;
  formatName: string;
  marketArea: string;
  zoneClass: PlacementZoneClass;
  approvedAt: string;
  status: "Site approval" | "Design development" | "Promoted to build";
  compliance: "Compliant";
}

export const PLACEMENT_STRATEGY_SOURCE = "ADMO OOH Framework Placement Strategy | 23 Jul 2026";

export const digitalPlacementFormats: PlacementFormatSpec[] = [
  {
    id: "digital-small-vertical",
    name: { en: "Small vertical", ar: "شاشة رأسية صغيرة" },
    medium: "Digital",
    size: "Small",
    aspectRatio: "9:16",
    maxWidthM: 1.5,
    maxHeightM: 2.6,
    allowedSpeedBands: { "0-40": 150, "41-80": 300 },
    sourcePage: 2,
  },
  {
    id: "digital-bus-shelter",
    name: { en: "Bus shelter variant", ar: "نموذج مأوى الحافلات" },
    medium: "Digital",
    size: "Small",
    aspectRatio: "9:16",
    maxWidthM: 1.5,
    maxHeightM: 2.6,
    allowedSpeedBands: { "0-40": 150, "41-80": 300, "81-100": 300 },
    sourcePage: 2,
  },
  {
    id: "digital-medium-vertical",
    name: { en: "Medium vertical", ar: "شاشة رأسية متوسطة" },
    medium: "Digital",
    size: "Medium",
    aspectRatio: "9:16",
    maxWidthM: 4,
    maxHeightM: 7,
    allowedSpeedBands: { "41-80": 300, "81-100": 300 },
    sourcePage: 2,
  },
  {
    id: "digital-medium-horizontal",
    name: { en: "Medium horizontal", ar: "شاشة أفقية متوسطة" },
    medium: "Digital",
    size: "Medium",
    aspectRatio: "16:9",
    maxWidthM: 6,
    maxHeightM: 7,
    groundClearanceM: 4,
    allowedSpeedBands: { "41-80": 300, "81-100": 300 },
    sourcePage: 2,
  },
  {
    id: "digital-bridge-banner",
    name: { en: "Large bridge banner", ar: "لافتة جسر كبيرة" },
    medium: "Digital",
    size: "Large",
    aspectRatio: "Site dependent",
    maxHeightM: 3,
    maxBridgeSpanPct: 80,
    allowedSpeedBands: { "81-100": 500, "101-160": 500 },
    sourcePage: 2,
  },
  {
    id: "digital-large-billboard",
    name: { en: "Large billboard", ar: "لوحة إعلانية كبيرة" },
    medium: "Digital",
    size: "Large",
    aspectRatio: "16:9",
    maxWidthM: 16,
    maxHeightM: 8,
    groundClearanceM: 9,
    allowedSpeedBands: { "101-160": 500 },
    sourcePage: 2,
  },
];

export const staticPlacementFormats: PlacementFormatSpec[] = [
  {
    id: "static-flag-default",
    name: { en: "Standard flag", ar: "علم قياسي" },
    medium: "Static",
    size: "Small",
    maxWidthM: 0.7,
    maxHeightM: 2.8,
    allowedSpeedBands: {},
    sourcePage: 10,
  },
  {
    id: "static-flag-premium",
    name: { en: "Premium flag", ar: "علم مميز" },
    medium: "Static",
    size: "Small",
    maxWidthM: 0.9,
    maxHeightM: 3.6,
    allowedSpeedBands: {},
    sourcePage: 10,
  },
  {
    id: "static-road-sign",
    name: { en: "Temporary road signage", ar: "لافتة طريق مؤقتة" },
    medium: "Static",
    size: "Medium",
    maxWidthM: 1,
    maxHeightM: 2,
    allowedSpeedBands: {},
    sourcePage: 10,
  },
  {
    id: "static-facade-fence",
    name: { en: "Building facade fence", ar: "سياج واجهة مبنى" },
    medium: "Static",
    size: "Medium",
    aspectRatio: "Site dependent",
    maxHeightM: 5,
    allowedSpeedBands: {},
    sourcePage: 10,
  },
  {
    id: "static-construction-fence",
    name: { en: "Temporary construction fence", ar: "سياج إنشاءات مؤقت" },
    medium: "Static",
    size: "Large",
    aspectRatio: "Site dependent",
    maxHeightM: 5,
    allowedSpeedBands: {},
    sourcePage: 10,
  },
  {
    id: "static-billboard",
    name: { en: "Static billboard", ar: "لوحة إعلانية ثابتة" },
    medium: "Static",
    size: "Large",
    aspectRatio: "Site dependent",
    allowedSpeedBands: {},
    sourcePage: 10,
  },
];

export const placementFormats = [...digitalPlacementFormats, ...staticPlacementFormats];

export const placementZonePolicies: PlacementZonePolicy[] = [
  {
    zone: 0,
    name: { en: "Zone 0", ar: "المنطقة 0" },
    focus: { en: "Fully restricted", ar: "محظورة بالكامل" },
    description: {
      en: "No OOH asset sizes are permitted. Safety, governance, worship and national significance take priority.",
      ar: "لا يسمح بأي حجم من أصول الإعلان الخارجي. تعطى الأولوية للسلامة والحوكمة والعبادة والأهمية الوطنية.",
    },
    densityPerKm: { Small: 0, Medium: 0, Large: 0 },
    examples: [
      { en: "Protected government and security sites", ar: "المواقع الحكومية والأمنية المحمية" },
      { en: "Protected religious and UNESCO sites", ar: "المواقع الدينية ومواقع اليونسكو المحمية" },
    ],
  },
  {
    zone: 1,
    name: { en: "Zone 1", ar: "المنطقة 1" },
    focus: { en: "Grounded focus", ar: "تركيز بيئي" },
    description: {
      en: "OOH is an exception. Natural, ecological, recreational and cultural integrity requires restrictive placement.",
      ar: "يعد الإعلان الخارجي استثناءً. تتطلب سلامة المواقع الطبيعية والبيئية والترفيهية والثقافية تقييد مواضع الأصول.",
    },
    densityPerKm: { Small: 2, Medium: 1, Large: 0 },
    examples: [
      { en: "Parks, reserves and natural landscapes", ar: "الحدائق والمحميات والمناظر الطبيعية" },
      { en: "Louvre Abu Dhabi and Qasr Al Hosn", ar: "اللوفر أبوظبي وقصر الحصن" },
    ],
  },
  {
    zone: 2,
    name: { en: "Zone 2", ar: "المنطقة 2" },
    focus: { en: "Value focus", ar: "تركيز متوازن" },
    description: {
      en: "Moderate, controlled infrastructure protects residential, educational and cultural character.",
      ar: "تحمي البنية التحتية المعتدلة والمحكومة طابع المناطق السكنية والتعليمية والثقافية.",
    },
    densityPerKm: { Small: 2, Medium: 2, Large: 1 },
    examples: [
      { en: "Residential and educational districts", ar: "الأحياء السكنية والتعليمية" },
      { en: "Corniche and community facilities", ar: "الكورنيش والمرافق المجتمعية" },
    ],
  },
  {
    zone: 3,
    name: { en: "Zone 3", ar: "المنطقة 3" },
    focus: { en: "Commercial focus", ar: "تركيز تجاري" },
    description: {
      en: "The highest density is permitted where commercial, tourism, industrial and transport conditions support it.",
      ar: "يسمح بأعلى كثافة حيث تدعمها الظروف التجارية والسياحية والصناعية وحركة النقل.",
    },
    densityPerKm: { Small: 6, Medium: 3, Large: 2 },
    examples: [
      {
        en: "Yas Island, ADGM, malls and ADNEC",
        ar: "جزيرة ياس وسوق أبوظبي العالمي والمراكز التجارية وأدنيك",
      },
      { en: "Mussafah, ICAD, KEZAD and prime routes", ar: "مصفح وآيكاد وكيزاد والطرق الرئيسية" },
    ],
  },
];

function box(
  lat: number,
  lng: number,
  dLat: number,
  dLng: number,
): Array<{ lat: number; lng: number }> {
  return [
    { lat: lat + dLat, lng: lng - dLng },
    { lat: lat + dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng - dLng },
  ];
}

// Illustrative scenario polygons. The UI labels them as scenario data until
// ADMO supplies the authoritative GIS layer.
export const regulatoryZoneShapes: RegulatoryZoneShape[] = [
  {
    id: "REG-Z0-QASR",
    zone: 0,
    name: { en: "Protected government precinct", ar: "النطاق الحكومي المحمي" },
    center: { lat: 24.4563, lng: 54.3116 },
    polygon: box(24.4563, 54.3116, 0.006, 0.008),
  },
  {
    id: "REG-Z1-SAADIYAT",
    zone: 1,
    name: { en: "Saadiyat cultural and natural district", ar: "منطقة السعديات الثقافية والطبيعية" },
    center: { lat: 24.535, lng: 54.425 },
    polygon: box(24.535, 54.425, 0.021, 0.035),
  },
  {
    id: "REG-Z2-CORNICHE",
    zone: 2,
    name: { en: "Corniche value zone", ar: "منطقة الكورنيش المتوازنة" },
    center: { lat: 24.475, lng: 54.337 },
    polygon: box(24.475, 54.337, 0.024, 0.04),
  },
  {
    id: "REG-Z2-RESIDENTIAL",
    zone: 2,
    name: { en: "Residential and education belt", ar: "حزام المناطق السكنية والتعليمية" },
    center: { lat: 24.445, lng: 54.395 },
    polygon: box(24.445, 54.395, 0.025, 0.04),
  },
  {
    id: "REG-Z3-DOWNTOWN",
    zone: 3,
    name: { en: "Downtown commercial corridor", ar: "الممر التجاري في وسط المدينة" },
    center: { lat: 24.495, lng: 54.382 },
    polygon: box(24.495, 54.382, 0.02, 0.035),
  },
  {
    id: "REG-Z3-YAS",
    zone: 3,
    name: { en: "Yas destination district", ar: "منطقة وجهات جزيرة ياس" },
    center: { lat: 24.489, lng: 54.61 },
    polygon: box(24.489, 54.61, 0.023, 0.035),
  },
  {
    id: "REG-Z3-MUSSAFAH",
    zone: 3,
    name: { en: "Mussafah industrial district", ar: "منطقة مصفح الصناعية" },
    center: { lat: 24.382, lng: 54.495 },
    polygon: box(24.382, 54.495, 0.035, 0.035),
  },
  {
    id: "REG-Z3-ALAIN",
    zone: 3,
    name: { en: "Al Ain prime route", ar: "الطريق الرئيسي في العين" },
    center: { lat: 24.23, lng: 55.75 },
    polygon: box(24.23, 55.75, 0.03, 0.05),
  },
];

export const assetPlacementProfiles: AssetPlacementProfile[] = [
  {
    assetId: "AD-HWY-001",
    formatId: "digital-large-billboard",
    zoneClass: 2,
    roadSpeedKph: 80,
    widthM: 14,
    heightM: 4.5,
    groundClearanceM: 9,
    legacy: true,
    permitStatus: "Review due",
    bearingDeg: 72,
  },
  {
    assetId: "AD-BRG-014",
    formatId: "digital-bridge-banner",
    zoneClass: 3,
    roadSpeedKph: 100,
    widthM: 10,
    heightM: 3,
    bridgeSpanM: 14,
    permitStatus: "Active",
    bearingDeg: 94,
  },
  {
    assetId: "AD-BUS-022",
    formatId: "digital-bus-shelter",
    zoneClass: 3,
    roadSpeedKph: 40,
    widthM: 1.1,
    heightM: 1.9,
    fixedInfrastructure: true,
    specialCase: true,
    permitStatus: "Active",
    bearingDeg: 18,
  },
  {
    assetId: "AD-HWY-009",
    formatId: "digital-large-billboard",
    zoneClass: 3,
    roadSpeedKph: 120,
    widthM: 16,
    heightM: 5,
    groundClearanceM: 9,
    permitStatus: "Active",
    bearingDeg: 104,
  },
  {
    assetId: "AD-DWT-011",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 60,
    widthM: 6,
    heightM: 3.5,
    specialCase: true,
    permitStatus: "Active",
    bearingDeg: 14,
  },
  {
    assetId: "AD-CRN-003",
    formatId: "digital-medium-horizontal",
    zoneClass: 2,
    roadSpeedKph: 60,
    widthM: 8,
    heightM: 4,
    legacy: true,
    permitStatus: "Review due",
    bearingDeg: 62,
  },
  {
    assetId: "AD-ARP-006",
    formatId: "digital-bridge-banner",
    zoneClass: 3,
    roadSpeedKph: 100,
    widthM: 12,
    heightM: 3.5,
    bridgeSpanM: 17,
    legacy: true,
    permitStatus: "Review due",
    bearingDeg: 86,
  },
  {
    assetId: "AD-DWT-004",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 60,
    widthM: 6,
    heightM: 3,
    permitStatus: "Active",
    bearingDeg: 26,
  },
  {
    assetId: "AD-DWT-021",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 40,
    widthM: 5,
    heightM: 2.8,
    specialCase: true,
    permitStatus: "Provisional",
    bearingDeg: 12,
  },
  {
    assetId: "AD-YAS-005",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 40,
    widthM: 9,
    heightM: 5,
    specialCase: true,
    permitStatus: "Provisional",
    bearingDeg: 42,
  },
  {
    assetId: "AD-YAS-018",
    formatId: "digital-large-billboard",
    zoneClass: 3,
    roadSpeedKph: 120,
    widthM: 14,
    heightM: 4,
    groundClearanceM: 9,
    permitStatus: "Active",
    bearingDeg: 108,
  },
  {
    assetId: "AD-MSF-007",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 80,
    widthM: 7,
    heightM: 3.5,
    legacy: true,
    permitStatus: "Review due",
    bearingDeg: 74,
  },
  {
    assetId: "AD-ALN-002",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 80,
    widthM: 6.5,
    heightM: 3.2,
    legacy: true,
    permitStatus: "Review due",
    bearingDeg: 33,
  },
  {
    assetId: "AD-ALN-013",
    formatId: "digital-medium-horizontal",
    zoneClass: 3,
    roadSpeedKph: 40,
    widthM: 5.5,
    heightM: 3,
    specialCase: true,
    permitStatus: "Provisional",
    bearingDeg: 4,
  },
];

// Display labels for the hand-authored road attributes on candidate sites.
export const placementRoadClassLabels: Record<PlacementRoadClass, LocalizedText> = {
  Highway: { en: "Highway", ar: "طريق سريع" },
  Arterial: { en: "Arterial", ar: "طريق شرياني" },
  Boulevard: { en: "Boulevard", ar: "شارع رئيسي" },
  "Waterfront promenade": { en: "Waterfront promenade", ar: "ممشى الواجهة البحرية" },
};

export const placementCarriagewayLabels: Record<PlacementCarriageway, LocalizedText> = {
  Dual: { en: "Dual carriageway", ar: "طريق مزدوج" },
  Single: { en: "Single carriageway", ar: "طريق مفرد" },
};

export const placementCandidates: PlacementCandidate[] = [
  {
    id: "PLS-CORN-01",
    name: { en: "Corniche promenade tower", ar: "برج ممشى الكورنيش" },
    marketArea: { en: "Corniche and Marina", ar: "الكورنيش والمارينا" },
    lat: 24.478,
    lng: 54.347,
    zoneClass: 2,
    roadSpeedKph: 60,
    roadClass: "Waterfront promenade",
    carriageway: "Dual",
    distanceToJunctionM: 210,
    formatId: "digital-large-billboard",
    widthM: 14,
    heightM: 6,
    groundClearanceM: 9,
    projectedWeeklyReach: 512_000,
    estimatedCapexAed: 2_450_000,
    status: "Draft",
  },
  {
    id: "PLS-YAS-01",
    name: { en: "Yas leisure gateway", ar: "بوابة ياس الترفيهية" },
    marketArea: { en: "Yas Island", ar: "جزيرة ياس" },
    lat: 24.491,
    lng: 54.62,
    zoneClass: 3,
    roadSpeedKph: 120,
    roadClass: "Highway",
    carriageway: "Dual",
    distanceToJunctionM: 640,
    formatId: "digital-large-billboard",
    widthM: 16,
    heightM: 8,
    groundClearanceM: 9,
    projectedWeeklyReach: 474_000,
    estimatedCapexAed: 2_180_000,
    status: "Shortlisted",
  },
  {
    id: "PLS-SAAD-01",
    name: { en: "Louvre arrival portrait", ar: "شاشة الوصول إلى اللوفر" },
    marketArea: { en: "Saadiyat cultural district", ar: "منطقة السعديات الثقافية" },
    lat: 24.5336853,
    lng: 54.4018796,
    zoneClass: 1,
    roadSpeedKph: 40,
    roadClass: "Boulevard",
    carriageway: "Single",
    distanceToJunctionM: 90,
    formatId: "digital-small-vertical",
    widthM: 1.5,
    heightM: 2.6,
    projectedWeeklyReach: 186_000,
    estimatedCapexAed: 340_000,
    status: "Shortlisted",
  },
  {
    id: "PLS-DTWN-01",
    name: { en: "Al Maryah retail panel", ar: "شاشة جزيرة المارية التجارية" },
    marketArea: { en: "Al Maryah financial district", ar: "منطقة جزيرة المارية المالية" },
    lat: 24.5019,
    lng: 54.3889,
    zoneClass: 3,
    roadSpeedKph: 60,
    roadClass: "Boulevard",
    carriageway: "Dual",
    distanceToJunctionM: 140,
    formatId: "digital-medium-horizontal",
    widthM: 6,
    heightM: 3.4,
    groundClearanceM: 4,
    projectedWeeklyReach: 392_000,
    estimatedCapexAed: 1_040_000,
    status: "Shortlisted",
  },
  {
    id: "PLS-QASR-01",
    name: { en: "Government precinct proposal", ar: "مقترح النطاق الحكومي" },
    marketArea: { en: "Government precinct", ar: "النطاق الحكومي" },
    lat: 24.4562667,
    lng: 54.3115749,
    zoneClass: 0,
    roadSpeedKph: 40,
    roadClass: "Arterial",
    carriageway: "Dual",
    distanceToJunctionM: 75,
    formatId: "digital-small-vertical",
    widthM: 1.4,
    heightM: 2.4,
    projectedWeeklyReach: 122_000,
    estimatedCapexAed: 280_000,
    status: "Draft",
  },
  {
    id: "PLS-MSF-01",
    name: { en: "Mussafah arterial approach", ar: "مدخل محور مصفح" },
    marketArea: { en: "Rabdan and Mussafah corridor", ar: "محور ربدان ومصفح" },
    lat: 24.4034569,
    lng: 54.4864576,
    zoneClass: 3,
    roadSpeedKph: 100,
    roadClass: "Arterial",
    carriageway: "Dual",
    distanceToJunctionM: 380,
    formatId: "digital-bridge-banner",
    widthM: 11,
    heightM: 3,
    bridgeSpanM: 15,
    projectedWeeklyReach: 308_000,
    estimatedCapexAed: 1_360_000,
    status: "Shortlisted",
  },
];

const DIAMETER_BY_SIZE: Record<PlacementSize, number> = {
  Small: 150,
  Medium: 300,
  Large: 500,
};

const DIAMETER_LIMIT_BY_SIZE: Record<PlacementSize, number> = {
  Small: 2,
  Medium: 1,
  Large: 1,
};

export function roadSpeedBand(kph: number): RoadSpeedBand {
  if (kph <= 40) return "0-40";
  if (kph <= 80) return "41-80";
  if (kph <= 100) return "81-100";
  return "101-160";
}

export function placementFormat(id: string): PlacementFormatSpec {
  return placementFormats.find((format) => format.id === id) ?? digitalPlacementFormats[0];
}

export function placementZonePolicy(zone: PlacementZoneClass): PlacementZonePolicy {
  return placementZonePolicies.find((policy) => policy.zone === zone) ?? placementZonePolicies[0];
}

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadiusM = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadiusM * Math.asin(Math.sqrt(haversine)));
}

function profileAsset(profile: AssetPlacementProfile): Asset | null {
  return assets.find((asset) => asset.id === profile.assetId) ?? null;
}

function existingFormatClearance(profile: AssetPlacementProfile): number {
  const spec = placementFormat(profile.formatId);
  return spec.allowedSpeedBands[roadSpeedBand(profile.roadSpeedKph)] ?? DIAMETER_BY_SIZE[spec.size];
}

function check(
  id: string,
  label: LocalizedText,
  state: PlacementCheckState,
  detail: LocalizedText,
  page: number,
): PlacementCheck {
  return {
    id,
    label,
    state,
    detail,
    source: `${PLACEMENT_STRATEGY_SOURCE} | p.${page}`,
  };
}

export function evaluatePlacement(candidate: PlacementCandidate): PlacementEvaluation {
  const format = placementFormat(candidate.formatId);
  const speedBand = roadSpeedBand(candidate.roadSpeedKph);
  const policy = placementZonePolicy(candidate.zoneClass);
  const exemptDensity = Boolean(
    candidate.fixedInfrastructure || candidate.publicSafety || candidate.legacy,
  );
  const checks: PlacementCheck[] = [];

  const zoneLimit = policy.densityPerKm[format.size];
  checks.push(
    check(
      "zone-size",
      { en: "Zone and asset size", ar: "المنطقة وحجم الأصل" },
      zoneLimit > 0 ? "pass" : "block",
      zoneLimit > 0
        ? {
            en: `${format.size} assets are permitted in Zone ${candidate.zoneClass}, up to ${zoneLimit} per kilometre.`,
            ar: `يسمح بالأصول ${format.size === "Small" ? "الصغيرة" : format.size === "Medium" ? "المتوسطة" : "الكبيرة"} في المنطقة ${candidate.zoneClass} بحد أقصى ${zoneLimit} لكل كيلومتر.`,
          }
        : {
            en: `${format.size} assets are not permitted in Zone ${candidate.zoneClass}.`,
            ar: `لا يسمح بالأصول ${format.size === "Small" ? "الصغيرة" : format.size === "Medium" ? "المتوسطة" : "الكبيرة"} في المنطقة ${candidate.zoneClass}.`,
          },
      9,
    ),
  );

  const minimumClearanceM =
    format.medium === "Static" ? null : (format.allowedSpeedBands[speedBand] ?? null);
  const speedPermitted = format.medium === "Static" || minimumClearanceM != null;
  checks.push(
    check(
      "speed-format",
      { en: "Road speed and format", ar: "سرعة الطريق ونوع الأصل" },
      speedPermitted ? "pass" : "block",
      format.medium === "Static"
        ? {
            en: "The digital road-speed matrix does not apply to this static format; permit review remains required.",
            ar: "لا تنطبق مصفوفة سرعات الطرق الرقمية على هذا النوع الثابت، وتبقى مراجعة التصريح مطلوبة.",
          }
        : minimumClearanceM
          ? {
              en: `${format.name.en} is permitted at ${candidate.roadSpeedKph} km/h with ${minimumClearanceM} m minimum clearance.`,
              ar: `يسمح بنوع ${format.name.ar} عند سرعة ${candidate.roadSpeedKph} كم/س مع مسافة فصل لا تقل عن ${minimumClearanceM} م.`,
            }
          : {
              en: `${format.name.en} is not permitted in the ${speedBand} km/h speed band.`,
              ar: `لا يسمح بنوع ${format.name.ar} ضمن نطاق السرعة ${speedBand} كم/س.`,
            },
      3,
    ),
  );

  const widthPass = format.maxWidthM == null || candidate.widthM <= format.maxWidthM;
  const heightPass = format.maxHeightM == null || candidate.heightM <= format.maxHeightM;
  const bridgePass =
    format.maxBridgeSpanPct == null ||
    candidate.bridgeSpanM == null ||
    candidate.widthM <= candidate.bridgeSpanM * (format.maxBridgeSpanPct / 100);
  const dimensionalPass = widthPass && heightPass && bridgePass;
  checks.push(
    check(
      "dimensions",
      { en: "Dimensions", ar: "الأبعاد" },
      dimensionalPass ? "pass" : candidate.legacy ? "warn" : "block",
      dimensionalPass
        ? {
            en: `${candidate.widthM} x ${candidate.heightM} m is within the ${format.name.en.toLowerCase()} envelope.`,
            ar: `تقع أبعاد ${candidate.widthM} × ${candidate.heightM} م ضمن الحدود المسموحة لنوع ${format.name.ar}.`,
          }
        : {
            en: `The proposed dimensions exceed the ADMO envelope for ${format.name.en.toLowerCase()}.`,
            ar: `تتجاوز الأبعاد المقترحة الحدود المعتمدة لنوع ${format.name.ar}.`,
          },
      format.sourcePage,
    ),
  );

  if (format.groundClearanceM != null) {
    const groundPass = (candidate.groundClearanceM ?? 0) >= format.groundClearanceM;
    checks.push(
      check(
        "ground-clearance",
        { en: "Mounting clearance", ar: "ارتفاع التركيب" },
        groundPass ? "pass" : "block",
        groundPass
          ? {
              en: `${candidate.groundClearanceM} m mounting clearance meets the ${format.groundClearanceM} m requirement.`,
              ar: `يحقق ارتفاع التركيب ${candidate.groundClearanceM} م الحد المطلوب البالغ ${format.groundClearanceM} م.`,
            }
          : {
              en: `Mounting clearance must be at least ${format.groundClearanceM} m.`,
              ar: `يجب ألا يقل ارتفاع التركيب عن ${format.groundClearanceM} م.`,
            },
        2,
      ),
    );
  }

  const nearby = assetPlacementProfiles
    .filter((profile) => profile.assetId !== candidate.existingAssetId)
    .map((profile) => {
      const asset = profileAsset(profile);
      return asset ? { asset, profile, distanceM: distanceM(candidate, asset) } : null;
    })
    .filter((row): row is { asset: Asset; profile: AssetPlacementProfile; distanceM: number } =>
      Boolean(row),
    )
    .sort((a, b) => a.distanceM - b.distanceM);
  const nearest = nearby[0] ?? null;
  const mixedClearanceM =
    minimumClearanceM && nearest
      ? Math.max(minimumClearanceM, existingFormatClearance(nearest.profile))
      : minimumClearanceM;
  const linearPass =
    exemptDensity ||
    mixedClearanceM == null ||
    nearest == null ||
    nearest.distanceM >= mixedClearanceM;
  checks.push(
    check(
      "linear-buffer",
      { en: "Linear buffer", ar: "مسافة الفصل الخطية" },
      exemptDensity ? "warn" : linearPass ? "pass" : "block",
      exemptDensity
        ? {
            en: "A documented public-infrastructure, public-safety or legacy exception applies. Named approval is required.",
            ar: "ينطبق استثناء موثق للبنية التحتية العامة أو السلامة العامة أو الأصل القائم. يلزم اعتماد مستخدم مسمى.",
          }
        : nearest && mixedClearanceM
          ? linearPass
            ? {
                en: `${nearest.distanceM} m to ${nearest.asset.name}; required clearance is ${mixedClearanceM} m.`,
                ar: `المسافة إلى ${nearest.asset.name} هي ${nearest.distanceM} م، والحد المطلوب ${mixedClearanceM} م.`,
              }
            : {
                en: `${nearest.asset.name} is only ${nearest.distanceM} m away; ${mixedClearanceM} m is required.`,
                ar: `يبعد ${nearest.asset.name} مسافة ${nearest.distanceM} م فقط، بينما يلزم ${mixedClearanceM} م.`,
              }
          : {
              en: "No conflicting asset was found in the applicable linear buffer.",
              ar: "لم يتم العثور على أصل متعارض ضمن مسافة الفصل المطلوبة.",
            },
      4,
    ),
  );

  const diameterM = DIAMETER_BY_SIZE[format.size];
  const diameterLimit = DIAMETER_LIMIT_BY_SIZE[format.size];
  const diameterCount = nearby.filter(
    (row) =>
      placementFormat(row.profile.formatId).size === format.size && row.distanceM <= diameterM / 2,
  ).length;
  const diameterPass = exemptDensity || diameterCount + 1 <= diameterLimit;
  checks.push(
    check(
      "diameter-density",
      { en: "Diameter density", ar: "الكثافة ضمن القطر" },
      exemptDensity ? "warn" : diameterPass ? "pass" : "block",
      exemptDensity
        ? {
            en: "The density exception is recorded and must remain visible in the approval dossier.",
            ar: "تم تسجيل استثناء الكثافة ويجب أن يبقى ظاهراً في ملف الاعتماد.",
          }
        : {
            en: `${diameterCount + 1} ${format.size.toLowerCase()} asset(s) would sit inside the ${diameterM} m diameter; the limit is ${diameterLimit}.`,
            ar: `سيصبح عدد الأصول من هذا الحجم داخل قطر ${diameterM} م هو ${diameterCount + 1}، بينما الحد الأقصى ${diameterLimit}.`,
          },
      5,
    ),
  );

  const zoneCountPerKm = nearby.filter(
    (row) =>
      row.profile.zoneClass === candidate.zoneClass &&
      placementFormat(row.profile.formatId).size === format.size &&
      row.distanceM <= 500,
  ).length;
  const zoneDensityPass = exemptDensity || zoneCountPerKm + 1 <= zoneLimit;
  checks.push(
    check(
      "zone-density",
      { en: "Zone density", ar: "كثافة المنطقة" },
      exemptDensity ? "warn" : zoneDensityPass ? "pass" : "block",
      zoneLimit === 0
        ? {
            en: `Zone ${candidate.zoneClass} permits no ${format.size.toLowerCase()} assets.`,
            ar: `لا تسمح المنطقة ${candidate.zoneClass} بأصول من هذا الحجم.`,
          }
        : {
            en: `${zoneCountPerKm + 1} of ${zoneLimit} permitted ${format.size.toLowerCase()} assets per kilometre would be used.`,
            ar: `سيتم استخدام ${zoneCountPerKm + 1} من أصل ${zoneLimit} أصول مسموحة من هذا الحجم لكل كيلومتر.`,
          },
      9,
    ),
  );

  const hasBlock = checks.some((item) => item.state === "block");
  const hasWarning = checks.some((item) => item.state === "warn");
  const verdict: PlacementVerdict = hasBlock
    ? "Not permitted"
    : hasWarning
      ? "Review required"
      : "Compliant";

  const alternatives = digitalPlacementFormats.filter((alternative) => {
    if (alternative.id === format.id) return false;
    if (policy.densityPerKm[alternative.size] <= 0) return false;
    return Boolean(alternative.allowedSpeedBands[speedBand]);
  });

  const failed = checks.filter((item) => item.state === "block");
  const recommendation: LocalizedText = hasBlock
    ? alternatives.length
      ? {
          en: `${failed[0]?.label.en ?? "Placement"} fails. Use ${alternatives[0].name.en.toLowerCase()} here or move the site until all buffers clear.`,
          ar: `لم يجتز المقترح فحص ${failed[0]?.label.ar ?? "الموضع"}. استخدم ${alternatives[0].name.ar} هنا أو انقل الموقع حتى تمر جميع فحوصات الفصل.`,
        }
      : {
          en: "No standard format is permitted at this point. Cancel the proposal or seek a documented special-case decision.",
          ar: "لا يسمح بأي نوع قياسي في هذه النقطة. ألغ المقترح أو اطلب قرار استثناء موثقاً.",
        }
    : hasWarning
      ? {
          en: "The placement is technically feasible, but its exception and named approval must be recorded before construction.",
          ar: "الموضع ممكن تقنياً، لكن يجب تسجيل الاستثناء والاعتماد المسمى قبل الإنشاء.",
        }
      : {
          en: "The proposal meets the encoded ADMO placement strategy and can be submitted for named approval.",
          ar: "يتوافق المقترح مع استراتيجية مواضع أصول ADMO ويمكن إرساله للاعتماد المسمى.",
        };

  return {
    verdict,
    candidate,
    format,
    speedBand,
    minimumClearanceM,
    nearestAsset: nearest ? { asset: nearest.asset, distanceM: nearest.distanceM } : null,
    nearbyAssets: nearby.slice(0, 3).map((row) => ({
      assetId: row.asset.id,
      name: row.asset.name,
      distanceM: row.distanceM,
    })),
    diameterM,
    diameterCount,
    diameterLimit,
    zoneCountPerKm,
    zoneLimitPerKm: zoneLimit,
    checks,
    alternatives,
    recommendation,
  };
}

export function evaluateExistingPlacement(profile: AssetPlacementProfile): PlacementEvaluation {
  const asset = profileAsset(profile);
  const format = placementFormat(profile.formatId);
  const fallbackAsset = asset ?? assets[0];
  return evaluatePlacement({
    id: `AUDIT-${profile.assetId}`,
    name: { en: fallbackAsset.name, ar: fallbackAsset.name },
    marketArea: { en: fallbackAsset.zone, ar: fallbackAsset.zone },
    lat: fallbackAsset.lat,
    lng: fallbackAsset.lng,
    zoneClass: profile.zoneClass,
    roadSpeedKph: profile.roadSpeedKph,
    formatId: profile.formatId,
    widthM: profile.widthM,
    heightM: profile.heightM,
    groundClearanceM: profile.groundClearanceM,
    bridgeSpanM: profile.bridgeSpanM,
    fixedInfrastructure: profile.fixedInfrastructure,
    legacy: profile.legacy,
    projectedWeeklyReach: 0,
    estimatedCapexAed: 0,
    status: "Approved",
    existingAssetId: profile.assetId,
  });
}

export function portfolioMix() {
  const countBySize = assetPlacementProfiles.reduce(
    (acc, profile) => {
      acc[placementFormat(profile.formatId).size] += 1;
      return acc;
    },
    { Small: 0, Medium: 0, Large: 0 } as Record<PlacementSize, number>,
  );
  const total = assetPlacementProfiles.length || 1;
  return (["Small", "Medium", "Large"] as PlacementSize[]).map((size) => ({
    size,
    current: countBySize[size],
    currentPct: Math.round((countBySize[size] / total) * 100),
    targetPct: size === "Small" ? 75 : size === "Medium" ? 15 : 10,
    projectedTarget: size === "Small" ? 600 : size === "Medium" ? 120 : 80,
  }));
}

const PLACEMENT_INTAKES_KEY = "dooh-placement-intakes-v1";
const PLACEMENT_INTAKES_EVENT = "dooh:placement-intakes";

export function readPlacementIntakes(): PlacementIntake[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(PLACEMENT_INTAKES_KEY);
    return value ? (JSON.parse(value) as PlacementIntake[]) : [];
  } catch {
    return [];
  }
}

export function savePlacementIntake(
  evaluation: PlacementEvaluation,
  locale: "en" | "ar" = "en",
): PlacementIntake {
  const current = readPlacementIntakes();
  const existing = current.find((row) => row.candidateId === evaluation.candidate.id);
  if (existing) return existing;
  const intake: PlacementIntake = {
    id: `INT-${Date.now().toString(36).toUpperCase()}`,
    candidateId: evaluation.candidate.id,
    candidateName: evaluation.candidate.name[locale],
    formatName: evaluation.format.name[locale],
    marketArea: evaluation.candidate.marketArea[locale],
    zoneClass: evaluation.candidate.zoneClass,
    approvedAt: new Date().toISOString(),
    status: "Site approval",
    compliance: "Compliant",
  };
  const next = [intake, ...current];
  window.localStorage.setItem(PLACEMENT_INTAKES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PLACEMENT_INTAKES_EVENT, { detail: next }));
  return intake;
}

export function updatePlacementIntakeStatus(
  id: string,
  status: PlacementIntake["status"],
): PlacementIntake[] {
  const next = readPlacementIntakes().map((row) => (row.id === id ? { ...row, status } : row));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PLACEMENT_INTAKES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLACEMENT_INTAKES_EVENT, { detail: next }));
  }
  return next;
}

export function subscribePlacementIntakes(listener: (rows: PlacementIntake[]) => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener(readPlacementIntakes());
  window.addEventListener(PLACEMENT_INTAKES_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PLACEMENT_INTAKES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const placementKnowledgeSources: KnowledgeSource[] = [
  {
    id: "KB-PLC-001",
    collectionId: "governance",
    title: {
      en: "ADMO OOH Framework Placement Strategy",
      ar: "استراتيجية مواضع إطار إعلانات ADMO الخارجية",
    },
    type: "Policy",
    status: "Indexed",
    owner: "ADMO estate planning",
    version: "23 Jul 2026",
    effectiveDate: "2026-07-23",
    sensitivity: "Internal",
    chunks: 186,
    lastIndexed: "Today 14:40",
    summary: {
      en: "Client placement framework covering permitted formats, speed bands, clearances, density, zones and static assets.",
      ar: "إطار العميل لمواضع الأصول ويغطي الأنواع المسموحة ونطاقات السرعة ومسافات الفصل والكثافة والمناطق والأصول الثابتة.",
    },
    body: {
      en: "ADMO defines small, medium and large digital formats, a 75/15/10 projected portfolio mix, linear and diameter density controls, four placement zones and static-format envelopes.",
      ar: "تحدد ADMO أنواعاً رقمية صغيرة ومتوسطة وكبيرة ومزيجاً مستهدفاً بنسبة 75/15/10 وضوابط للكثافة الخطية والقطرية وأربع مناطق للمواضع وحدوداً للأصول الثابتة.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE", "ONT-ACTION"],
    tags: ["placement", "ADMO", "zoning", "density"],
    citations: ["Pages 2-10"],
    usedBy: ["MediaGPT Placement Advisor", "Planning", "Rules"],
  },
  {
    id: "KB-PLC-002",
    collectionId: "governance",
    title: { en: "Digital format and speed matrix", ar: "مصفوفة الأنواع الرقمية وسرعات الطرق" },
    type: "Dataset",
    status: "Indexed",
    owner: "ADMO estate planning",
    version: "v1.0",
    effectiveDate: "2026-07-23",
    sensitivity: "Internal",
    chunks: 74,
    lastIndexed: "Today 14:41",
    summary: {
      en: "Six digital asset formats with dimensions, aspect ratios, road-speed eligibility and minimum clearance.",
      ar: "ستة أنواع رقمية مع الأبعاد ونسب العرض إلى الارتفاع وأهلية سرعة الطريق والحد الأدنى لمسافة الفصل.",
    },
    body: {
      en: "Empty cells in the client matrix are encoded as disallowed combinations. Permitted combinations carry a 150 m, 300 m or 500 m minimum clearance.",
      ar: "تم ترميز الخلايا الفارغة في مصفوفة العميل كتركيبات غير مسموحة. وتحمل التركيبات المسموحة مسافة فصل دنيا قدرها 150 أو 300 أو 500 متر.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    tags: ["format", "road speed", "clearance", "dimensions"],
    citations: ["Page 2 Digital portfolio", "Page 3 Formats per road speeds"],
    usedBy: ["MediaGPT Placement Advisor", "MediaGPT Studio"],
  },
  {
    id: "KB-PLC-003",
    collectionId: "governance",
    title: { en: "Linear and diameter density controls", ar: "ضوابط الكثافة الخطية والقطرية" },
    type: "Policy",
    status: "Indexed",
    owner: "ADMO estate planning",
    version: "v1.0",
    effectiveDate: "2026-07-23",
    sensitivity: "Internal",
    chunks: 88,
    lastIndexed: "Today 14:42",
    summary: {
      en: "Placement controls designed to preserve 12-15 seconds between messages and reduce visual clutter at intersections.",
      ar: "ضوابط مواضع تهدف إلى الحفاظ على 12 إلى 15 ثانية بين الرسائل وتقليل الفوضى البصرية عند التقاطعات.",
    },
    body: {
      en: "Small, medium and large assets use 150 m, 300 m and 500 m density diameters. Intersections use the diameter rule in addition to linear spacing.",
      ar: "تستخدم الأصول الصغيرة والمتوسطة والكبيرة أقطار كثافة قدرها 150 و300 و500 متر. وتطبق التقاطعات قاعدة القطر بالإضافة إلى الفصل الخطي.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    tags: ["linear buffer", "diameter", "intersection", "livability"],
    citations: ["Page 4 Linear buffer rule", "Page 5 Diameter rule", "Page 6 Intersections"],
    usedBy: ["MediaGPT Placement Advisor", "Planning"],
  },
  {
    id: "KB-PLC-004",
    collectionId: "governance",
    title: {
      en: "ADMO placement zones and density schedule",
      ar: "مناطق مواضع ADMO وجدول الكثافة",
    },
    type: "Dataset",
    status: "Indexed",
    owner: "ADMO estate planning",
    version: "v1.0",
    effectiveDate: "2026-07-23",
    sensitivity: "Internal",
    chunks: 112,
    lastIndexed: "Today 14:43",
    summary: {
      en: "Zone 0-3 purpose, priority, typical locations and maximum assets by size per kilometre.",
      ar: "غرض المناطق 0 إلى 3 وأولويتها والمواقع النموذجية والحد الأقصى للأصول حسب الحجم لكل كيلومتر.",
    },
    body: {
      en: "Zone 0 permits no OOH. Zone 1 permits small and medium only. Zones 2 and 3 permit all sizes at progressively higher density.",
      ar: "لا تسمح المنطقة 0 بأي أصول إعلانية. تسمح المنطقة 1 بالأصول الصغيرة والمتوسطة فقط. وتسمح المنطقتان 2 و3 بجميع الأحجام بكثافة متزايدة.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    tags: ["Zone 0", "Zone 1", "Zone 2", "Zone 3", "density"],
    citations: ["Page 7 Rule structure", "Page 8 Major zones", "Page 9 Zone asset experience"],
    usedBy: ["MediaGPT Placement Advisor", "Planning", "Marketplace"],
  },
  {
    id: "KB-PLC-005",
    collectionId: "governance",
    title: { en: "Static asset format schedule", ar: "جدول أنواع الأصول الثابتة" },
    type: "Dataset",
    status: "Indexed",
    owner: "ADMO estate planning",
    version: "v1.0",
    effectiveDate: "2026-07-23",
    sensitivity: "Internal",
    chunks: 54,
    lastIndexed: "Today 14:44",
    summary: {
      en: "Dimension envelopes for flags, temporary road signage, facade fences, construction fences and static billboards.",
      ar: "حدود الأبعاد للأعلام ولافتات الطرق المؤقتة وأسوار الواجهات وأسوار الإنشاءات واللوحات الثابتة.",
    },
    body: {
      en: "Static assets are retained as a special-case planning and permit portfolio. The source leaves static billboard dimensions unspecified.",
      ar: "تدار الأصول الثابتة كمحفظة خاصة للتخطيط والتصاريح. ولا يحدد المصدر أبعاد اللوحة الإعلانية الثابتة.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    tags: ["static", "flag", "fence", "temporary"],
    citations: ["Page 10 Static portfolio"],
    usedBy: ["MediaGPT Placement Advisor", "Planning"],
  },
];

export const placementCatalogueRules: DoohRule[] = [
  {
    id: "RULE-PLC-001",
    title: { en: "Zone asset-size eligibility", ar: "أهلية حجم الأصل حسب المنطقة" },
    family: "Placement governance",
    scope: "Planning and estate",
    workflowStage: "Candidate validation",
    mode: "Enforce",
    status: "Strict",
    severity: "Critical",
    enabled: true,
    condition: {
      en: "The proposed asset size is not permitted in its ADMO placement zone.",
      ar: "حجم الأصل المقترح غير مسموح في منطقة مواضع ADMO المحددة.",
    },
    action: {
      en: "Block submission and offer a permitted format.",
      ar: "منع الإرسال واقتراح نوع مسموح.",
    },
    recommendedAction: "Change format",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-004",
    overridePolicy: {
      en: "No commercial override. A documented special-case authority is required.",
      ar: "لا يسمح بتجاوز تجاري. يلزم قرار استثناء موثق من الجهة المختصة.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT explains the failure and ranks permitted formats.",
      ar: "يشرح MediaGPT سبب عدم الاجتياز ويرتب الأنواع المسموحة.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [
      { input: "Large billboard in Zone 1", expected: "Block placement" },
      { input: "Medium horizontal in Zone 2", expected: "Pass zone eligibility" },
    ],
  },
  {
    id: "RULE-PLC-002",
    title: { en: "Road-speed format eligibility", ar: "أهلية النوع حسب سرعة الطريق" },
    family: "Placement governance",
    scope: "Planning and estate",
    workflowStage: "Candidate validation",
    mode: "Enforce",
    status: "Strict",
    severity: "Critical",
    enabled: true,
    condition: {
      en: "The format matrix cell for the road-speed band is empty.",
      ar: "خلية نوع الأصل ضمن نطاق سرعة الطريق فارغة.",
    },
    action: {
      en: "Block the format at this road speed.",
      ar: "منع هذا النوع عند سرعة الطريق المحددة.",
    },
    recommendedAction: "Choose permitted format",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-002",
    overridePolicy: {
      en: "Only an approved public-infrastructure or public-safety exception may proceed.",
      ar: "لا يسمح بالمتابعة إلا باستثناء معتمد للبنية التحتية العامة أو السلامة العامة.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT proposes the closest compliant format or another road segment.",
      ar: "يقترح MediaGPT أقرب نوع متوافق أو مقطع طريق بديل.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [
      { input: "Large billboard at 60 km/h", expected: "Block placement" },
      { input: "Bridge banner at 100 km/h", expected: "Pass speed rule" },
    ],
  },
  {
    id: "RULE-PLC-003",
    title: { en: "Asset dimension envelope", ar: "حدود أبعاد الأصل" },
    family: "Placement governance",
    scope: "Planning and design",
    workflowStage: "Design validation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: {
      en: "Width, height, bridge-span coverage or mounting clearance exceeds the format envelope.",
      ar: "يتجاوز العرض أو الارتفاع أو نسبة تغطية الجسر أو ارتفاع التركيب حدود النوع.",
    },
    action: { en: "Hold design and resize the structure.", ar: "تعليق التصميم وتعديل حجم الهيكل." },
    recommendedAction: "Resize design",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-002",
    overridePolicy: {
      en: "Legacy assets enter relocation review. New assets require compliant dimensions.",
      ar: "تدخل الأصول القائمة في مراجعة النقل. ويجب أن تلتزم الأصول الجديدة بالأبعاد.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT calculates the compliant envelope and updates the placement twin.",
      ar: "يحسب MediaGPT الحدود المتوافقة ويحدث التوأم الرقمي للموضع.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [{ input: "Bridge banner covers 85% of span", expected: "Block design" }],
  },
  {
    id: "RULE-PLC-004",
    title: { en: "Linear clearance between assets", ar: "مسافة الفصل الخطية بين الأصول" },
    family: "Placement governance",
    scope: "Planning and estate",
    workflowStage: "Spatial validation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: {
      en: "The nearest asset is inside the applicable 150 m, 300 m or 500 m clearance.",
      ar: "يقع أقرب أصل داخل مسافة الفصل المطبقة البالغة 150 أو 300 أو 500 متر.",
    },
    action: {
      en: "Move the site or use another permitted format.",
      ar: "نقل الموقع أو استخدام نوع مسموح آخر.",
    },
    recommendedAction: "Relocate candidate",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-003",
    overridePolicy: {
      en: "Fixed public infrastructure may proceed with a recorded exception.",
      ar: "يمكن للبنية التحتية العامة الثابتة المتابعة باستثناء مسجل.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT identifies the conflict and proposes the shortest compliant move.",
      ar: "يحدد MediaGPT التعارض ويقترح أقصر مسافة نقل تحقق الامتثال.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [
      { input: "Medium panel 220 m from another medium asset", expected: "Block placement" },
    ],
  },
  {
    id: "RULE-PLC-005",
    title: { en: "Diameter density control", ar: "ضبط الكثافة ضمن القطر" },
    family: "Placement governance",
    scope: "Planning and intersections",
    workflowStage: "Spatial validation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: {
      en: "The proposal exceeds the screen allotment inside its 150 m, 300 m or 500 m density diameter.",
      ar: "يتجاوز المقترح عدد الشاشات المسموح داخل قطر الكثافة البالغ 150 أو 300 أو 500 متر.",
    },
    action: {
      en: "Reduce the number of assets around the site.",
      ar: "خفض عدد الأصول حول الموقع.",
    },
    recommendedAction: "Reduce local density",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-003",
    overridePolicy: {
      en: "Public infrastructure, public safety and recorded legacy cases require named review.",
      ar: "تتطلب حالات البنية التحتية العامة والسلامة العامة والأصول القائمة المسجلة مراجعة مسماة.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT shows the diameter and compares current versus compliant layouts.",
      ar: "يعرض MediaGPT القطر ويقارن بين التخطيط الحالي والمتوافق.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [
      { input: "Two medium screens inside a 300 m diameter", expected: "Block second screen" },
    ],
  },
  {
    id: "RULE-PLC-006",
    title: { en: "Zone density per kilometre", ar: "كثافة المنطقة لكل كيلومتر" },
    family: "Placement governance",
    scope: "Planning and estate",
    workflowStage: "Portfolio validation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: {
      en: "The number of assets by size exceeds the Zone 0-3 schedule per kilometre.",
      ar: "يتجاوز عدد الأصول حسب الحجم جدول المناطق 0 إلى 3 لكل كيلومتر.",
    },
    action: {
      en: "Block additional inventory or retire a lower-value site.",
      ar: "منع مخزون إضافي أو إيقاف موقع أقل قيمة.",
    },
    recommendedAction: "Rebalance portfolio",
    owner: "ADMO estate planning",
    sourceId: "KB-PLC-004",
    overridePolicy: {
      en: "No commercial override. Special cases require an authority decision and permit.",
      ar: "لا يسمح بتجاوز تجاري. تتطلب الحالات الخاصة قراراً وتصريحاً من الجهة المختصة.",
    },
    effectiveDate: "2026-07-23",
    version: "v1.0",
    aiEffect: {
      en: "MediaGPT identifies the lowest-value conflicting site and explains the trade-off.",
      ar: "يحدد MediaGPT الموقع المتعارض الأقل قيمة ويشرح المفاضلة.",
    },
    linkedEntities: ["ONT-ASSET", "ONT-RULE"],
    testCases: [
      { input: "Third large asset per kilometre in Zone 3", expected: "Block placement" },
    ],
  },
];

export const placementRuleSimulationContexts: RuleSimulationContext[] = [
  {
    id: "SIM-PLC-ZONE0",
    label: { en: "Placement: proposal inside Zone 0", ar: "المواضع: مقترح داخل المنطقة 0" },
    type: "Asset",
    input: {
      en: "A small vertical screen is proposed inside a protected government precinct.",
      ar: "تم اقتراح شاشة رأسية صغيرة داخل نطاق حكومي محمي.",
    },
    matchingRuleIds: ["RULE-PLC-001"],
    citedSourceIds: ["KB-PLC-004"],
    recommendation: {
      en: "Reject the site. No OOH asset size is permitted in Zone 0.",
      ar: "رفض الموقع. لا يسمح بأي حجم من أصول الإعلان الخارجي في المنطقة 0.",
    },
    action: { en: "Cancel proposal", ar: "إلغاء المقترح" },
    tone: "danger",
  },
  {
    id: "SIM-PLC-SPEED",
    label: {
      en: "Placement: large billboard on 60 km/h road",
      ar: "المواضع: لوحة كبيرة على طريق بسرعة 60 كم/س",
    },
    type: "Asset",
    input: {
      en: "A 14 x 6 m large billboard is proposed on a Zone 2 road with a 60 km/h limit.",
      ar: "تم اقتراح لوحة كبيرة بأبعاد 14 × 6 م على طريق في المنطقة 2 بسرعة 60 كم/س.",
    },
    matchingRuleIds: ["RULE-PLC-002"],
    citedSourceIds: ["KB-PLC-002"],
    recommendation: {
      en: "Use a medium horizontal format or move the proposal to an eligible high-speed corridor.",
      ar: "استخدم نوعاً أفقياً متوسطاً أو انقل المقترح إلى ممر سريع مؤهل.",
    },
    action: { en: "Change format", ar: "تغيير النوع" },
    tone: "warn",
  },
  {
    id: "SIM-PLC-DENSITY",
    label: { en: "Placement: intersection density conflict", ar: "المواضع: تعارض كثافة عند تقاطع" },
    type: "Asset",
    input: {
      en: "A second medium asset is proposed inside the same 300 m intersection diameter.",
      ar: "تم اقتراح أصل متوسط ثان داخل قطر التقاطع نفسه البالغ 300 م.",
    },
    matchingRuleIds: ["RULE-PLC-005", "RULE-PLC-006"],
    citedSourceIds: ["KB-PLC-003", "KB-PLC-004"],
    recommendation: {
      en: "Keep the higher-value sightline and relocate the competing proposal outside the diameter.",
      ar: "احتفظ بخط الرؤية الأعلى قيمة وانقل المقترح المتعارض إلى خارج القطر.",
    },
    action: { en: "Relocate candidate", ar: "نقل الموقع المقترح" },
    tone: "warn",
  },
];
