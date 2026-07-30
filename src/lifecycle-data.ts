/* ------------------------------------------------------------------ *\
   Lifecycle data: Planning (where to place assets) + Construction
   (tracking the build of the estate). This turns the platform from an
   ops console into a Plan -> Build -> Operate lifecycle that sits under
   DMT's Platform of Platforms (PoP) city digital twin.

   Data is client-side and deterministic (same pattern as the Network
   page's derived asset issues/schedule) so it renders instantly and is
   safe for a live management demo. The "AI" scoring here is deterministic
   advisor logic framed for the operator, mirroring the Yield Advisor.
   The shapes are designed to be promoted to the backend store later.
\* ------------------------------------------------------------------ */

import { assets as estateAssets } from "./data";

/* ============================ PLANNING ============================ */

export interface AgeBand {
  band: string;
  pct: number;
}

export interface ZoneSegment {
  label: string;
  pct: number;
}

export interface ZoneDemographics {
  ageBands: AgeBand[];
  affluenceIndex: number; // 0-100, DMT affluence index for the district
  dwellSeconds: number; // median dwell in the sightline
  dailyFootfall: number; // estimated unique daily audience
  dominantDaypart: string;
  segments: ZoneSegment[];
}

export interface CandidateSite {
  code: string;
  name: string;
  format: string;
  projectedReachWeekly: number;
  projectedImpressions: number;
  estCapexAed: number;
  fit: number; // 0-100 fit to the zone profile
  status: "Proposed" | "Shortlisted" | "Board approved" | "Promoted to build";
}

export interface ZoneFormatIdea {
  label: string;
  why: string;
}

export interface ZoneSuggestion {
  formats: ZoneFormatIdea[];
  dayparts: string[];
  creative: string; // recommended creative length / cadence
  categories: string[];
  rationale: string;
  confidence: number; // 0-100
}

export interface PlanningZone {
  id: string;
  name: string;
  district: string;
  tone: "prime" | "strong" | "emerging" | "utility";
  center: { lat: number; lng: number };
  polygon: Array<{ lat: number; lng: number }>;
  areaSqKm: number;
  demographics: ZoneDemographics;
  liveAssets: number; // assets already operating in the zone
  capacity: number; // planned network capacity for the zone
  candidateSites: CandidateSite[];
  note?: string;
}

export interface ZoneMetrics {
  reach: number; // 0-100
  match: number; // 0-100 audience/affluence match
  availability: number; // 0-100 (inverse of saturation)
  score: number; // 0-100 opportunity score
  saturationPct: number; // 0-100 how full the zone already is
}

const MAX_FOOTFALL = 640_000;

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

export const planningZones: PlanningZone[] = [
  {
    id: "ZN-CORN",
    name: "Corniche & Marina",
    district: "Abu Dhabi City",
    tone: "prime",
    center: { lat: 24.469, lng: 54.338 },
    polygon: box(24.469, 54.338, 0.014, 0.022),
    areaSqKm: 6.2,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 16 },
        { band: "25-34", pct: 32 },
        { band: "35-44", pct: 27 },
        { band: "45-54", pct: 15 },
        { band: "55+", pct: 10 },
      ],
      affluenceIndex: 84,
      dwellSeconds: 41,
      dailyFootfall: 384_000,
      dominantDaypart: "Evening leisure (18:00-23:00)",
      segments: [
        { label: "Leisure & dining", pct: 38 },
        { label: "Tourists", pct: 29 },
        { label: "Residents", pct: 21 },
        { label: "Commuters", pct: 12 },
      ],
    },
    liveAssets: 8,
    capacity: 14,
    candidateSites: [
      {
        code: "CS-CORN-01",
        name: "Corniche promenade tower",
        format: "Landmark tower (spectacular)",
        projectedReachWeekly: 512_000,
        projectedImpressions: 3_100_000,
        estCapexAed: 2_450_000,
        fit: 92,
        status: "Shortlisted",
      },
      {
        code: "CS-CORN-02",
        name: "Marina breakwater digital",
        format: "Double-sided pylon",
        projectedReachWeekly: 268_000,
        projectedImpressions: 1_420_000,
        estCapexAed: 940_000,
        fit: 81,
        status: "Proposed",
      },
    ],
    note: "Waterfront leisure spine, highest evening dwell in the estate.",
  },
  {
    id: "ZN-DTWN",
    name: "Downtown & Hamdan",
    district: "Abu Dhabi City",
    tone: "strong",
    center: { lat: 24.492, lng: 54.372 },
    polygon: box(24.492, 54.372, 0.016, 0.02),
    areaSqKm: 4.1,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 21 },
        { band: "25-34", pct: 34 },
        { band: "35-44", pct: 24 },
        { band: "45-54", pct: 13 },
        { band: "55+", pct: 8 },
      ],
      affluenceIndex: 68,
      dwellSeconds: 22,
      dailyFootfall: 521_000,
      dominantDaypart: "Commute peaks (07:00-10:00, 17:00-20:00)",
      segments: [
        { label: "Commuters", pct: 44 },
        { label: "Retail shoppers", pct: 31 },
        { label: "Office workers", pct: 18 },
        { label: "Tourists", pct: 7 },
      ],
    },
    liveAssets: 11,
    capacity: 16,
    candidateSites: [
      {
        code: "CS-DTWN-01",
        name: "Hamdan Street gantry",
        format: "Highway gantry",
        projectedReachWeekly: 604_000,
        projectedImpressions: 3_640_000,
        estCapexAed: 1_180_000,
        fit: 86,
        status: "Board approved",
      },
    ],
    note: "Highest raw footfall; retail and commuter mix, short dwell.",
  },
  {
    id: "ZN-MARY",
    name: "Al Maryah financial",
    district: "Abu Dhabi City",
    tone: "prime",
    center: { lat: 24.502, lng: 54.39 },
    polygon: box(24.502, 54.39, 0.008, 0.011),
    areaSqKm: 1.3,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 9 },
        { band: "25-34", pct: 30 },
        { band: "35-44", pct: 34 },
        { band: "45-54", pct: 19 },
        { band: "55+", pct: 8 },
      ],
      affluenceIndex: 96,
      dwellSeconds: 18,
      dailyFootfall: 208_000,
      dominantDaypart: "Working hours (09:00-18:00)",
      segments: [
        { label: "Finance & professional", pct: 52 },
        { label: "Luxury retail", pct: 24 },
        { label: "Hotel guests", pct: 16 },
        { label: "Residents", pct: 8 },
      ],
    },
    liveAssets: 4,
    capacity: 9,
    candidateSites: [
      {
        code: "CS-MARY-01",
        name: "Galleria concourse portrait",
        format: "Indoor portrait cluster",
        projectedReachWeekly: 190_000,
        projectedImpressions: 1_260_000,
        estCapexAed: 720_000,
        fit: 90,
        status: "Shortlisted",
      },
      {
        code: "CS-MARY-02",
        name: "ADGM footbridge banner",
        format: "Footbridge landscape",
        projectedReachWeekly: 142_000,
        projectedImpressions: 880_000,
        estCapexAed: 560_000,
        fit: 83,
        status: "Proposed",
      },
    ],
    note: "Highest affluence index in the estate; premium brand demand, under-served.",
  },
  {
    id: "ZN-SAAD",
    name: "Saadiyat cultural",
    district: "Abu Dhabi City",
    tone: "emerging",
    center: { lat: 24.535, lng: 54.41 },
    polygon: box(24.535, 54.41, 0.015, 0.02),
    areaSqKm: 5.0,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 14 },
        { band: "25-34", pct: 29 },
        { band: "35-44", pct: 28 },
        { band: "45-54", pct: 18 },
        { band: "55+", pct: 11 },
      ],
      affluenceIndex: 88,
      dwellSeconds: 36,
      dailyFootfall: 143_000,
      dominantDaypart: "Weekend culture (10:00-14:00, evenings)",
      segments: [
        { label: "Cultural tourists", pct: 41 },
        { label: "Affluent residents", pct: 27 },
        { label: "Education", pct: 19 },
        { label: "Hospitality", pct: 13 },
      ],
    },
    liveAssets: 3,
    capacity: 10,
    candidateSites: [
      {
        code: "CS-SAAD-01",
        name: "Cultural district approach",
        format: "Landmark spectacular",
        projectedReachWeekly: 176_000,
        projectedImpressions: 1_010_000,
        estCapexAed: 1_640_000,
        fit: 79,
        status: "Proposed",
      },
    ],
    note: "Emerging demand; strong for premium and tourism, low current coverage.",
  },
  {
    id: "ZN-YAS",
    name: "Yas Island leisure",
    district: "Yas Island",
    tone: "strong",
    center: { lat: 24.489, lng: 54.603 },
    polygon: box(24.489, 54.603, 0.02, 0.028),
    areaSqKm: 7.4,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 22 },
        { band: "25-34", pct: 33 },
        { band: "35-44", pct: 26 },
        { band: "45-54", pct: 12 },
        { band: "55+", pct: 7 },
      ],
      affluenceIndex: 74,
      dwellSeconds: 52,
      dailyFootfall: 612_000,
      dominantDaypart: "Weekend & evening leisure",
      segments: [
        { label: "Families & leisure", pct: 46 },
        { label: "Tourists", pct: 34 },
        { label: "Events crowd", pct: 14 },
        { label: "Staff", pct: 6 },
      ],
    },
    liveAssets: 6,
    capacity: 15,
    candidateSites: [
      {
        code: "CS-YAS-01",
        name: "Yas Bay arena approach",
        format: "Spectacular + companion",
        projectedReachWeekly: 588_000,
        projectedImpressions: 3_520_000,
        estCapexAed: 2_120_000,
        fit: 88,
        status: "Board approved",
      },
      {
        code: "CS-YAS-02",
        name: "Theme park link road",
        format: "Highway gantry",
        projectedReachWeekly: 402_000,
        projectedImpressions: 2_180_000,
        estCapexAed: 1_050_000,
        fit: 82,
        status: "Shortlisted",
      },
    ],
    note: "Longest dwell and family reach; event-driven weekend spikes.",
  },
  {
    id: "ZN-MUSS",
    name: "Mussafah industrial",
    district: "Industrial Zone",
    tone: "utility",
    center: { lat: 24.362, lng: 54.5 },
    polygon: box(24.362, 54.5, 0.024, 0.03),
    areaSqKm: 12.6,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 18 },
        { band: "25-34", pct: 39 },
        { band: "35-44", pct: 27 },
        { band: "45-54", pct: 11 },
        { band: "55+", pct: 5 },
      ],
      affluenceIndex: 41,
      dwellSeconds: 15,
      dailyFootfall: 468_000,
      dominantDaypart: "Daytime logistics (06:00-16:00)",
      segments: [
        { label: "Logistics & trade", pct: 48 },
        { label: "Workforce transit", pct: 33 },
        { label: "Fleet drivers", pct: 14 },
        { label: "Visitors", pct: 5 },
      ],
    },
    liveAssets: 5,
    capacity: 18,
    candidateSites: [
      {
        code: "CS-MUSS-01",
        name: "Mussafah industrial gateway",
        format: "Highway gantry",
        projectedReachWeekly: 356_000,
        projectedImpressions: 1_940_000,
        estCapexAed: 880_000,
        fit: 71,
        status: "Proposed",
      },
    ],
    note: "High daytime workforce reach; value inventory, public-service fit.",
  },
  {
    id: "ZN-ARPT",
    name: "Airport corridor",
    district: "Abu Dhabi City",
    tone: "emerging",
    center: { lat: 24.434, lng: 54.625 },
    polygon: box(24.434, 54.625, 0.016, 0.022),
    areaSqKm: 8.1,
    demographics: {
      ageBands: [
        { band: "18-24", pct: 13 },
        { band: "25-34", pct: 31 },
        { band: "35-44", pct: 30 },
        { band: "45-54", pct: 17 },
        { band: "55+", pct: 9 },
      ],
      affluenceIndex: 79,
      dwellSeconds: 28,
      dailyFootfall: 291_000,
      dominantDaypart: "24/7 travel flows",
      segments: [
        { label: "Departing travellers", pct: 37 },
        { label: "Arriving travellers", pct: 31 },
        { label: "Meet & greet", pct: 20 },
        { label: "Airport staff", pct: 12 },
      ],
    },
    liveAssets: 4,
    capacity: 12,
    candidateSites: [
      {
        code: "CS-ARPT-01",
        name: "Airport road welcome gantry",
        format: "Highway gantry",
        projectedReachWeekly: 318_000,
        projectedImpressions: 1_720_000,
        estCapexAed: 1_240_000,
        fit: 84,
        status: "Shortlisted",
      },
    ],
    note: "Round-the-clock traveller reach; strong for tourism and premium.",
  },
];

/** Deterministic opportunity scoring - blends reach, audience match, and
 *  remaining availability so the score is defensible, not a vanity number. */
export function zoneMetrics(zone: PlanningZone): ZoneMetrics {
  const reach = Math.round(
    Math.min(100, (zone.demographics.dailyFootfall / MAX_FOOTFALL) * 100),
  );
  const match = zone.demographics.affluenceIndex;
  const saturationPct = Math.round((zone.liveAssets / zone.capacity) * 100);
  const availability = 100 - saturationPct;
  const score = Math.round(0.45 * reach + 0.3 * match + 0.25 * availability);
  return { reach, match, availability, score, saturationPct };
}

/** Deterministic "AI site planner" recommendation derived from the zone
 *  audience profile. Same idea as the Yield Advisor: transparent advisor
 *  logic surfaced to the operator, ready to be swapped for a live model. */
export function zoneSuggestion(zone: PlanningZone): ZoneSuggestion {
  const d = zone.demographics;
  const formats: ZoneFormatIdea[] = [];
  const categories: string[] = [];
  const dayparts: string[] = [];

  if (d.dwellSeconds >= 34) {
    formats.push({
      label: "Motion-led hero (10-15s)",
      why: `Median dwell of ${d.dwellSeconds}s lets a story land, not just a logo.`,
    });
  } else {
    formats.push({
      label: "Bold static / 6s burst",
      why: `Short ${d.dwellSeconds}s dwell rewards one message and a strong end-frame.`,
    });
  }

  if (d.affluenceIndex >= 80) {
    formats.push({
      label: "Premium brand canvas",
      why: `Affluence index ${d.affluenceIndex} supports luxury, finance, and destination brands.`,
    });
    categories.push("Luxury retail", "Finance & real estate", "Destination tourism");
  } else if (d.affluenceIndex >= 60) {
    categories.push("Retail & FMCG", "Telecom", "Entertainment");
  } else {
    formats.push({
      label: "Public-service & value retail",
      why: `Workforce-heavy audience fits civic messaging and value offers.`,
    });
    categories.push("Public service", "Value retail", "Logistics & trade");
  }

  const topSegment = d.segments[0]?.label ?? "";
  if (/tourist|leisure|families|culture/i.test(topSegment)) {
    formats.push({
      label: "Bilingual welcome creative",
      why: `${topSegment} lead the audience; Arabic-first with English support performs best.`,
    });
  }

  dayparts.push(d.dominantDaypart);
  if (d.dailyFootfall > 450_000) dayparts.push("Sustain a base loop off-peak to hold share of voice.");

  const creative = d.dwellSeconds >= 34 ? "10-15s motion, 6-8 spot rotation" : "6-8s static or short motion, 8-10 spot rotation";
  const confidence = Math.min(96, 68 + Math.round(zoneMetrics(zone).score / 5));

  const rationale = `${zone.name} skews ${topSegment.toLowerCase()} with a ${d.dominantDaypart.toLowerCase().replace(/\s*\(.*\)/, "")} peak. With an affluence index of ${d.affluenceIndex} and ${(d.dailyFootfall / 1000).toFixed(0)}k daily audience, lead with ${formats[0].label.toLowerCase()} and weight delivery to the peak window.`;

  return { formats, dayparts, creative, categories, rationale, confidence };
}

/** Zones ranked by opportunity, with under-served high-value zones flagged. */
export function coverageGaps(): Array<{ zone: PlanningZone; metrics: ZoneMetrics; priority: "High" | "Medium" }> {
  return planningZones
    .map((zone) => ({ zone, metrics: zoneMetrics(zone) }))
    .filter((row) => row.metrics.match >= 70 && row.metrics.availability >= 40)
    .sort((a, b) => b.metrics.score - a.metrics.score)
    .map((row) => ({ ...row, priority: row.metrics.score >= 70 ? "High" : "Medium" as "High" | "Medium" }));
}

/** Synthesize a full zone profile for ANY pinned point on the map. This is the
 *  "live probe" - a deterministic estimate derived from the nearest known zone,
 *  standing in for the DMT digital twin until the technical team connects it for
 *  real-time telemetry. Returns a PlanningZone so it reuses the same intel panel. */
function hashPoint(lat: number, lng: number): number {
  const s = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pseudo(seed: number, salt: number): number {
  const x = Math.sin(seed * 0.0001 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function zoneFromPoint(lat: number, lng: number): PlanningZone {
  const seed = hashPoint(lat, lng);
  let nearest = planningZones[0];
  let best = Infinity;
  for (const z of planningZones) {
    const d = (z.center.lat - lat) ** 2 + (z.center.lng - lng) ** 2;
    if (d < best) { best = d; nearest = z; }
  }
  const jitter = (salt: number, amp: number) => Math.round((pseudo(seed, salt) - 0.5) * 2 * amp);
  const nd = nearest.demographics;
  const affluenceIndex = Math.max(32, Math.min(97, nd.affluenceIndex + jitter(1, 12)));
  const dwellSeconds = Math.max(11, nd.dwellSeconds + jitter(2, 10));
  const dailyFootfall = Math.max(60_000, nd.dailyFootfall + jitter(3, 90_000));
  const ageBands = nd.ageBands.map((b, i) => ({ band: b.band, pct: Math.max(4, b.pct + jitter(10 + i, 5)) }));
  const ageTotal = ageBands.reduce((s, b) => s + b.pct, 0);
  ageBands.forEach((b) => (b.pct = Math.round((b.pct / ageTotal) * 100)));
  const capacity = 8 + (seed % 8);
  const liveAssets = seed % Math.max(1, Math.floor(capacity * 0.6));
  return {
    id: "PROBE",
    name: "Live-probe zone",
    district: nearest.district,
    tone: "emerging",
    center: { lat, lng },
    polygon: box(lat, lng, 0.012, 0.018),
    areaSqKm: Math.round((2 + pseudo(seed, 4) * 6) * 10) / 10,
    demographics: {
      ageBands,
      affluenceIndex,
      dwellSeconds,
      dailyFootfall,
      dominantDaypart: nd.dominantDaypart,
      segments: nd.segments,
    },
    liveAssets,
    capacity,
    candidateSites: [],
    note: `Live probe near ${nearest.name}. Profile estimated from the DMT digital twin model; connect the twin for real-time telemetry.`,
  };
}

/** Turn a pinned live-probe zone into a candidate site, so a promising ad-hoc
 *  point flows into the Plan -> Build pipeline (Candidate sites -> Promote to
 *  build). Projections are deterministic from the probed zone profile, same
 *  advisor logic as the rest of planning. */
export function candidateFromProbe(zone: PlanningZone, seq: number): CandidateSite {
  const m = zoneMetrics(zone);
  const s = zoneSuggestion(zone);
  const weeklyFootfall = zone.demographics.dailyFootfall * 7;
  const reach = Math.round((weeklyFootfall * (0.24 + m.match / 500)) / 1000) * 1000;
  const impressions = Math.round((weeklyFootfall * (3.2 + m.score / 45)) / 10_000) * 10_000;
  const capex = Math.round(((1.4 + (100 - m.availability) / 60 + m.score / 120) * 1_000_000) / 50_000) * 50_000;
  return {
    code: `SITE-LP${String(seq).padStart(2, "0")}`,
    name: `Pinned site ${zone.center.lat.toFixed(3)}, ${zone.center.lng.toFixed(3)}`,
    format: s.formats[0]?.label ?? "Large-format digital",
    projectedReachWeekly: reach,
    projectedImpressions: impressions,
    estCapexAed: capex,
    fit: m.score,
    status: "Proposed",
  };
}

/* ========================= CONSTRUCTION ========================= */

export interface BuildPhase {
  key: string;
  label: string;
  short: string;
}

export const BUILD_PHASES: BuildPhase[] = [
  { key: "sitePrep", label: "Site preparation", short: "Site prep" },
  { key: "civil", label: "Civil & foundation", short: "Civil" },
  { key: "structure", label: "Structure & mounting", short: "Structure" },
  { key: "power", label: "Power & network", short: "Power/net" },
  { key: "install", label: "Screen installation", short: "Install" },
  { key: "commissioning", label: "Commissioning & test", short: "Commission" },
  { key: "liveReady", label: "Live-ready", short: "Live-ready" },
];

export interface WorkOrderLifecycle {
  code: string;
  scope: string;
  contractor: string;
  status: "Issued" | "In progress" | "On hold" | "Complete";
  crew: number;
}

export interface PurchaseOrderLifecycle {
  code: string;
  vendor: string;
  item: string;
  amountAed: number;
  status: "Raised" | "Approved" | "Dispatched" | "Received";
  eta?: string;
}

export interface BomLine {
  part: string;
  sku: string;
  qtyRequired: number;
  qtyReceived: number;
  unitCostAed: number;
  leadTimeDays: number;
  status: "Pending" | "Ordered" | "In transit" | "On site" | "Installed";
}

export interface ConstructionMilestone {
  phaseKey: string;
  label: string;
  targetDate: string;
  actualDate?: string;
  status: "Complete" | "In progress" | "Planned" | "At risk";
}

export interface ConstructionBlocker {
  title: string;
  severity: "High" | "Medium" | "Low";
  owner: string;
  since: string;
  note: string;
}

export interface ConstructionRecord {
  id: string;
  assetId: string;
  name: string;
  district: string;
  zoneId: string;
  type: string;
  lat: number;
  lng: number;
  phaseIndex: number;
  progress: number; // 0-100
  plannedStart: string;
  plannedGoLive: string;
  projectedGoLive: string;
  varianceDays: number; // negative = behind schedule, positive = ahead
  contractor: string;
  projectManager: string;
  capexAed: number;
  committedAed: number;
  workOrder: WorkOrderLifecycle;
  purchaseOrders: PurchaseOrderLifecycle[];
  bom: BomLine[];
  milestones: ConstructionMilestone[];
  blockers: ConstructionBlocker[];
}

export interface DelayRisk {
  score: number; // 0-100
  level: "Low" | "Medium" | "High";
  drivers: string[];
  mitigation: string;
}

// Compact specs; a builder expands each into a full record so the seed is
// varied where it matters (phase, variance, blockers, vendors) and consistent
// in structure (milestones, BOM). Dates are fixed strings (demo is set in 2026).
interface BuildSpec {
  assetId: string;
  name: string;
  district: string;
  zoneId: string;
  type: string;
  lat: number;
  lng: number;
  phaseIndex: number;
  progress: number;
  plannedStart: string;
  plannedGoLive: string;
  projectedGoLive: string;
  varianceDays: number;
  contractor: string;
  projectManager: string;
  capexAed: number;
  committedPct: number;
  crew: number;
  vendors: Array<{ vendor: string; item: string; amountAed: number }>;
  blockers: ConstructionBlocker[];
}

const PARTS_TEMPLATE: Array<{ part: string; sku: string; qty: number; unit: number; lead: number; phase: number }> = [
  { part: "Foundation steel & anchors", sku: "CIV-STL-14", qty: 1, unit: 68_000, lead: 18, phase: 1 },
  { part: "Structural mast & frame", sku: "STR-MST-09", qty: 1, unit: 142_000, lead: 34, phase: 2 },
  { part: "Power distribution unit", sku: "PWR-PDU-22", qty: 2, unit: 21_500, lead: 21, phase: 3 },
  { part: "Fibre + 5G backhaul kit", sku: "NET-BHL-05", qty: 1, unit: 34_000, lead: 26, phase: 3 },
  { part: "LED cabinet modules", sku: "LED-CAB-48", qty: 48, unit: 5_400, lead: 42, phase: 4 },
  { part: "Edge media controller", sku: "EDG-ORN-07", qty: 1, unit: 47_000, lead: 24, phase: 4 },
  { part: "Cooling & climate pack", sku: "CLM-PCK-11", qty: 2, unit: 18_800, lead: 30, phase: 4 },
  { part: "Commissioning & calibration", sku: "CMS-CAL-01", qty: 1, unit: 26_000, lead: 7, phase: 5 },
];

function bomStatusFor(partPhase: number, phaseIndex: number): BomLine["status"] {
  if (partPhase < phaseIndex - 1) return "Installed";
  if (partPhase < phaseIndex) return "On site";
  if (partPhase === phaseIndex) return "In transit";
  if (partPhase === phaseIndex + 1) return "Ordered";
  return "Pending";
}

function milestonesFor(spec: BuildSpec): ConstructionMilestone[] {
  return BUILD_PHASES.map((phase, index) => {
    let status: ConstructionMilestone["status"];
    if (index < spec.phaseIndex) status = "Complete";
    else if (index === spec.phaseIndex) status = spec.varianceDays < -5 ? "At risk" : "In progress";
    else status = "Planned";
    // Spread target dates evenly across the planned window (label only; demo dates).
    const target = index <= spec.phaseIndex
      ? spec.plannedStart
      : spec.projectedGoLive;
    return {
      phaseKey: phase.key,
      label: phase.label,
      targetDate: target,
      actualDate: index < spec.phaseIndex ? spec.plannedStart : undefined,
      status,
    };
  });
}

function bomFor(spec: BuildSpec): BomLine[] {
  return PARTS_TEMPLATE.map((tpl) => {
    const status = bomStatusFor(tpl.phase, spec.phaseIndex);
    const received = status === "Installed" || status === "On site" ? tpl.qty : status === "In transit" ? Math.floor(tpl.qty / 2) : 0;
    return {
      part: tpl.part,
      sku: tpl.sku,
      qtyRequired: tpl.qty,
      qtyReceived: received,
      unitCostAed: tpl.unit,
      leadTimeDays: tpl.lead,
      status,
    };
  });
}

function posFor(spec: BuildSpec): PurchaseOrderLifecycle[] {
  return spec.vendors.map((v, index) => {
    const status: PurchaseOrderLifecycle["status"] =
      index === 0 ? "Received" : index === 1 ? (spec.phaseIndex >= 4 ? "Received" : "Dispatched") : spec.phaseIndex >= 3 ? "Approved" : "Raised";
    return {
      code: `PO-${spec.assetId.replace(/[^0-9]/g, "").slice(-3) || "000"}-${index + 1}`,
      vendor: v.vendor,
      item: v.item,
      amountAed: v.amountAed,
      status,
      eta: status === "Dispatched" ? "5 days" : status === "Approved" ? "3 weeks" : undefined,
    };
  });
}

function expand(spec: BuildSpec, index: number): ConstructionRecord {
  const committedAed = Math.round((spec.capexAed * spec.committedPct) / 100);
  const woStatus: WorkOrderLifecycle["status"] =
    spec.blockers.some((b) => b.severity === "High") ? "On hold" : spec.phaseIndex >= 6 ? "Complete" : "In progress";
  return {
    id: `CNS-${String(index + 1).padStart(3, "0")}`,
    assetId: spec.assetId,
    name: spec.name,
    district: spec.district,
    zoneId: spec.zoneId,
    type: spec.type,
    lat: spec.lat,
    lng: spec.lng,
    phaseIndex: spec.phaseIndex,
    progress: spec.progress,
    plannedStart: spec.plannedStart,
    plannedGoLive: spec.plannedGoLive,
    projectedGoLive: spec.projectedGoLive,
    varianceDays: spec.varianceDays,
    contractor: spec.contractor,
    projectManager: spec.projectManager,
    capexAed: spec.capexAed,
    committedAed,
    workOrder: {
      code: `WO-${String(index + 1).padStart(3, "0")}`,
      scope: `${BUILD_PHASES[spec.phaseIndex].label} - ${spec.type}`,
      contractor: spec.contractor,
      status: woStatus,
      crew: spec.crew,
    },
    purchaseOrders: posFor(spec),
    bom: bomFor(spec),
    milestones: milestonesFor(spec),
    blockers: spec.blockers,
  };
}

const BUILD_SPECS: BuildSpec[] = [
  {
    assetId: "AD-CORN-031",
    name: "Corniche promenade tower",
    district: "Abu Dhabi City",
    zoneId: "ZN-CORN",
    type: "Landmark spectacular",
    lat: 24.4712,
    lng: 54.3268,
    phaseIndex: 4,
    progress: 62,
    plannedStart: "12 May 2026",
    plannedGoLive: "28 Aug 2026",
    projectedGoLive: "28 Aug 2026",
    varianceDays: 2,
    contractor: "Al Fara'a Structures",
    projectManager: "R. Haddad",
    capexAed: 2_450_000,
    committedPct: 74,
    crew: 14,
    vendors: [
      { vendor: "Al Fara'a Structures", item: "Mast, frame & civil", amountAed: 640_000 },
      { vendor: "Daktronics MEA", item: "LED cabinet modules (48)", amountAed: 259_200 },
      { vendor: "Etisalat Enterprise", item: "5G + fibre backhaul", amountAed: 34_000 },
    ],
    blockers: [],
  },
  {
    assetId: "AD-YAS-031",
    name: "Yas Bay arena approach",
    district: "Yas Island",
    zoneId: "ZN-YAS",
    type: "Spectacular + companion",
    lat: 24.4841,
    lng: 54.6008,
    phaseIndex: 3,
    progress: 44,
    plannedStart: "02 Jun 2026",
    plannedGoLive: "20 Sep 2026",
    projectedGoLive: "04 Oct 2026",
    varianceDays: -14,
    contractor: "Trojan General Contracting",
    projectManager: "S. Al Mansoori",
    capexAed: 2_120_000,
    committedPct: 66,
    crew: 18,
    vendors: [
      { vendor: "Trojan General Contracting", item: "Foundation & structure", amountAed: 710_000 },
      { vendor: "Absen Middle East", item: "LED cabinet modules (48)", amountAed: 259_200 },
      { vendor: "Schneider Electric", item: "Power distribution units", amountAed: 43_000 },
    ],
    blockers: [
      {
        title: "LED module shipment held at customs",
        severity: "High",
        owner: "Procurement - N. Aziz",
        since: "03 Jul 2026",
        note: "Absen consignment awaiting clearance at Khalifa Port; 42-day lead already consumed.",
      },
    ],
  },
  {
    assetId: "AD-MARY-031",
    name: "Galleria concourse portrait",
    district: "Abu Dhabi City",
    zoneId: "ZN-MARY",
    type: "Indoor portrait cluster",
    lat: 24.5019,
    lng: 54.3889,
    phaseIndex: 5,
    progress: 81,
    plannedStart: "20 Apr 2026",
    plannedGoLive: "05 Aug 2026",
    projectedGoLive: "01 Aug 2026",
    varianceDays: 4,
    contractor: "Depa Interiors",
    projectManager: "L. Fernandes",
    capexAed: 720_000,
    committedPct: 88,
    crew: 8,
    vendors: [
      { vendor: "Depa Interiors", item: "Fit-out & mounting", amountAed: 214_000 },
      { vendor: "LG Business Solutions", item: "Fine-pitch LED", amountAed: 198_000 },
      { vendor: "Edge Compute AE", item: "Media controllers", amountAed: 47_000 },
    ],
    blockers: [],
  },
  {
    assetId: "AD-DTWN-031",
    name: "Hamdan Street gantry",
    district: "Abu Dhabi City",
    zoneId: "ZN-DTWN",
    type: "Highway gantry",
    lat: 24.489,
    lng: 54.362,
    phaseIndex: 2,
    progress: 28,
    plannedStart: "18 Jun 2026",
    plannedGoLive: "30 Sep 2026",
    projectedGoLive: "30 Sep 2026",
    varianceDays: 0,
    contractor: "Al Fara'a Structures",
    projectManager: "R. Haddad",
    capexAed: 1_180_000,
    committedPct: 52,
    crew: 11,
    vendors: [
      { vendor: "Al Fara'a Structures", item: "Gantry structure & civil", amountAed: 320_000 },
      { vendor: "Daktronics MEA", item: "LED cabinet modules", amountAed: 259_200 },
    ],
    blockers: [
      {
        title: "Road-closure permit pending DMT",
        severity: "Medium",
        owner: "Permits - H. Saeed",
        since: "28 Jun 2026",
        note: "Night-work lane closure needs municipal sign-off before mast lift can be scheduled.",
      },
    ],
  },
  {
    assetId: "AD-ARPT-031",
    name: "Airport road welcome gantry",
    district: "Abu Dhabi City",
    zoneId: "ZN-ARPT",
    type: "Highway gantry",
    lat: 24.4338,
    lng: 54.625,
    phaseIndex: 1,
    progress: 15,
    plannedStart: "01 Jul 2026",
    plannedGoLive: "22 Oct 2026",
    projectedGoLive: "22 Oct 2026",
    varianceDays: 1,
    contractor: "Trojan General Contracting",
    projectManager: "S. Al Mansoori",
    capexAed: 1_240_000,
    committedPct: 34,
    crew: 9,
    vendors: [
      { vendor: "Trojan General Contracting", item: "Foundation package", amountAed: 210_000 },
      { vendor: "Etisalat Enterprise", item: "Backhaul reservation", amountAed: 34_000 },
    ],
    blockers: [],
  },
  {
    assetId: "AD-SAAD-031",
    name: "Cultural district approach",
    district: "Abu Dhabi City",
    zoneId: "ZN-SAAD",
    type: "Landmark spectacular",
    lat: 24.5368283,
    lng: 54.411748,
    phaseIndex: 0,
    progress: 6,
    plannedStart: "08 Jul 2026",
    plannedGoLive: "18 Nov 2026",
    projectedGoLive: "18 Nov 2026",
    varianceDays: 0,
    contractor: "Trojan General Contracting",
    projectManager: "L. Fernandes",
    capexAed: 1_640_000,
    committedPct: 22,
    crew: 6,
    vendors: [
      { vendor: "Trojan General Contracting", item: "Site enabling works", amountAed: 128_000 },
    ],
    blockers: [],
  },
  {
    assetId: "AD-YAS-032",
    name: "Theme park link road",
    district: "Yas Island",
    zoneId: "ZN-YAS",
    type: "Highway gantry",
    lat: 24.4903,
    lng: 54.6072,
    phaseIndex: 6,
    progress: 96,
    plannedStart: "10 Mar 2026",
    plannedGoLive: "18 Jul 2026",
    projectedGoLive: "16 Jul 2026",
    varianceDays: 2,
    contractor: "Trojan General Contracting",
    projectManager: "S. Al Mansoori",
    capexAed: 1_050_000,
    committedPct: 97,
    crew: 5,
    vendors: [
      { vendor: "Trojan General Contracting", item: "Structure & civil", amountAed: 288_000 },
      { vendor: "Absen Middle East", item: "LED cabinet modules", amountAed: 259_200 },
      { vendor: "Schneider Electric", item: "Power distribution", amountAed: 43_000 },
    ],
    blockers: [],
  },
  {
    assetId: "AD-MUSS-031",
    name: "Mussafah industrial gateway",
    district: "Industrial Zone",
    zoneId: "ZN-MUSS",
    type: "Highway gantry",
    lat: 24.3641,
    lng: 54.5012,
    phaseIndex: 3,
    progress: 39,
    plannedStart: "26 May 2026",
    plannedGoLive: "12 Sep 2026",
    projectedGoLive: "24 Sep 2026",
    varianceDays: -12,
    contractor: "Al Fara'a Structures",
    projectManager: "R. Haddad",
    capexAed: 880_000,
    committedPct: 58,
    crew: 10,
    vendors: [
      { vendor: "Al Fara'a Structures", item: "Gantry & foundation", amountAed: 246_000 },
      { vendor: "Daktronics MEA", item: "LED cabinet modules", amountAed: 259_200 },
    ],
    blockers: [
      {
        title: "Power distribution unit backorder",
        severity: "Medium",
        owner: "Procurement - N. Aziz",
        since: "01 Jul 2026",
        note: "Schneider PDU on 21-day lead; energisation cannot start until units land on site.",
      },
    ],
  },
];

export const constructionRecords: ConstructionRecord[] = BUILD_SPECS.map(expand);

/** Deterministic delay-risk prediction (framed as the AI build monitor).
 *  Blends schedule variance, open blockers, and parts lead-time exposure. */
export function delayRisk(record: ConstructionRecord): DelayRisk {
  const drivers: string[] = [];
  let score = 0;

  if (record.varianceDays < 0) {
    const behind = Math.abs(record.varianceDays);
    score += Math.min(45, behind * 3);
    drivers.push(`${behind} days behind the planned go-live`);
  }

  for (const blocker of record.blockers) {
    if (blocker.severity === "High") {
      score += 32;
      drivers.push(`High-severity blocker: ${blocker.title}`);
    } else if (blocker.severity === "Medium") {
      score += 16;
      drivers.push(`Open blocker: ${blocker.title}`);
    } else {
      score += 6;
    }
  }

  const criticalParts = record.bom.filter(
    (line) => line.leadTimeDays >= 30 && line.qtyReceived < line.qtyRequired && record.phaseIndex >= 3,
  );
  if (criticalParts.length) {
    score += 18;
    drivers.push(`${criticalParts.length} long-lead part(s) not yet on site`);
  }

  score = Math.min(100, score);
  const level: DelayRisk["level"] = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";

  let mitigation = "On track. Hold cadence and keep the commissioning slot reserved.";
  if (level === "High") {
    const topBlocker = record.blockers.find((b) => b.severity === "High") ?? record.blockers[0];
    mitigation = topBlocker
      ? `Escalate "${topBlocker.title}" to ${topBlocker.owner.split(" - ")[0]} and pull a parallel supplier; re-baseline the go-live once cleared.`
      : "Add a second crew shift and expedite the outstanding long-lead parts to recover the slip.";
  } else if (level === "Medium") {
    mitigation = record.blockers.length
      ? `Clear "${record.blockers[0].title}" this week and expedite outstanding parts to protect the go-live.`
      : "Expedite the next long-lead delivery and confirm the crew booking to protect the date.";
  }

  return { score, level, drivers, mitigation };
}

/* --------------------------- aggregates --------------------------- */

export function constructionSummary() {
  const total = constructionRecords.length;
  const risks = constructionRecords.map((r) => ({ r, risk: delayRisk(r) }));
  const atRisk = risks.filter((x) => x.risk.level !== "Low").length;
  const committedAed = constructionRecords.reduce((sum, r) => sum + r.committedAed, 0);
  const goingLiveSoon = constructionRecords.filter((r) => r.phaseIndex >= 5).length;
  const avgProgress = Math.round(
    constructionRecords.reduce((sum, r) => sum + r.progress, 0) / Math.max(1, total),
  );
  return { total, atRisk, committedAed, goingLiveSoon, avgProgress };
}

export function openPurchaseOrders(): number {
  return constructionRecords.reduce(
    (sum, r) => sum + r.purchaseOrders.filter((po) => po.status !== "Received").length,
    0,
  );
}

/** Count of live assets in a district, using the operating estate registry. */
export function liveAssetsInDistrict(district: string): number {
  return estateAssets.filter((a) => a.zone === district && a.status !== "Offline").length;
}
