// Audience by time band: a modeled per-asset audience mix for the commercial
// map detail. Same pattern as advisor-data and lifecycle-data: client-side,
// deterministic and hash-seeded, so two loads always show identical numbers.
//
// The four dormant audienceProfiles records in data.ts act as anchors: their
// demographic labels and daypart weights drive those assets. Every other
// asset gets a seeded profile from a vocabulary chosen by asset type, so the
// panel is stable for the whole estate.
//
// Data policy: audience mix is advertiser-safe, but this module currently
// feeds the internal commercial map only.

import { assets, audienceProfiles } from "./data";
import { PLAN_CATEGORIES } from "./advisor-data";

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export interface AudienceBandSegment {
  label: string;
  pct: number;
}

export interface AudienceBand {
  /** Daypart label, aligned with the daypart vocabulary used elsewhere. */
  band: string;
  /** Clock window shown next to the band name. */
  window: string;
  /** Share of the asset's daily reach; the four bands sum to 100. */
  sharePct: number;
  /** Demographic split for the band; values sum to 100. */
  demographics: AudienceBandSegment[];
  /** Top content categories for the band (share of the band's content mix). */
  categories: AudienceBandSegment[];
}

/** The four bands, mapped onto the anchor daypart labels in data.ts. */
const BANDS = [
  { band: "Morning commute", window: "06:00-10:00", anchor: "Morning" },
  { band: "Midday", window: "10:00-16:00", anchor: "Midday" },
  { band: "Evening peak", window: "16:00-21:00", anchor: "Evening" },
  { band: "Late night", window: "21:00-01:00", anchor: "Night" },
];

/** How strongly each segment leans into each band (multiplier on the base). */
const BAND_TILT: Record<string, Record<string, number>> = {
  "Morning commute": { Commuters: 1.6, Logistics: 1.5, "Fleet drivers": 1.6, Residents: 0.9, Shoppers: 0.55, Families: 0.65, Tourists: 0.6, Youth: 0.6, Leisure: 0.5 },
  Midday: { Commuters: 0.6, Logistics: 1.0, "Fleet drivers": 1.0, Residents: 1.0, Shoppers: 1.25, Families: 0.9, Tourists: 1.3, Youth: 0.9, Leisure: 1.2 },
  "Evening peak": { Commuters: 1.15, Logistics: 0.7, "Fleet drivers": 0.8, Residents: 1.2, Shoppers: 1.3, Families: 1.4, Tourists: 1.1, Youth: 1.2, Leisure: 1.3 },
  "Late night": { Commuters: 0.5, Logistics: 0.9, "Fleet drivers": 1.1, Residents: 0.8, Shoppers: 0.6, Families: 0.4, Tourists: 1.1, Youth: 1.7, Leisure: 1.5 },
};

/** Segment vocabulary for assets without an anchor record, by asset type. */
const ROAD_SEGMENTS = ["Commuters", "Residents", "Logistics", "Tourists"];
const RETAIL_SEGMENTS = ["Shoppers", "Families", "Youth", "Tourists"];
const STREET_SEGMENTS = ["Residents", "Shoppers", "Commuters", "Tourists"];

type AssetFamily = "road" | "retail" | "street";

function familyFor(type: string): AssetFamily {
  if (/mall|indoor/i.test(type)) return "retail";
  if (/pylon|bus stop/i.test(type)) return "street";
  return "road";
}

const FAMILY_SEGMENTS: Record<AssetFamily, string[]> = {
  road: ROAD_SEGMENTS,
  retail: RETAIL_SEGMENTS,
  street: STREET_SEGMENTS,
};

/** Prior share of daily reach per band, by asset family (before jitter). */
const FAMILY_SHARE: Record<AssetFamily, number[]> = {
  road: [30, 20, 32, 18],
  retail: [14, 30, 38, 18],
  street: [24, 26, 34, 16],
};

/** Content mix priors per band, in PLAN_CATEGORIES order:
 *  Retail and FMCG, Food and beverage, Tourism and leisure,
 *  Finance and real estate, Telecom and tech, Public service. */
const BAND_CATEGORY_PRIOR: Record<string, number[]> = {
  "Morning commute": [12, 10, 8, 22, 18, 30],
  Midday: [26, 24, 14, 12, 16, 8],
  "Evening peak": [26, 20, 22, 12, 12, 8],
  "Late night": [12, 30, 26, 8, 14, 10],
};

/** Largest-remainder rounding: integer percentages that sum to exactly 100. */
function roundTo100(weights: number[]): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  const exact = weights.map((w) => (w * 100) / total);
  const floored = exact.map(Math.floor);
  let left = 100 - floored.reduce((sum, v) => sum + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && left > 0; k++, left--) floored[order[k].i] += 1;
  return floored;
}

/** Per-band audience profile for one asset. Anchored assets reuse their
 *  audienceProfiles record; the rest are seeded from the asset id. */
export function assetAudienceBands(assetId: string): AudienceBand[] {
  const asset = assets.find((a) => a.id === assetId);
  const anchor = audienceProfiles.find((p) => p.assetId === assetId);
  const seed = hashCode(assetId);
  const family = familyFor(asset?.type ?? "Highway billboard");

  const baseSegments = anchor
    ? anchor.demographics.map((d) => ({ label: d.label, base: d.value }))
    : FAMILY_SEGMENTS[family].map((label, i) => ({ label, base: 18 + ((seed >>> (i * 4)) % 23) }));

  const sharePrior = BANDS.map((b, i) => {
    const anchored = anchor?.dayparts.find((d) => d.label === b.anchor)?.value;
    if (anchored != null) return anchored;
    return FAMILY_SHARE[family][i] + (hashCode(assetId + b.band) % 7) - 3;
  });
  const shares = roundTo100(sharePrior);

  return BANDS.map((b, bandIndex) => {
    const tilt = BAND_TILT[b.band];
    const demoPct = roundTo100(
      baseSegments.map(({ label, base }) => {
        const jitter = 1 + ((hashCode(assetId + b.band + label) % 11) - 5) / 100;
        return base * (tilt[label] ?? 1) * jitter;
      }),
    );
    const catPct = roundTo100(
      BAND_CATEGORY_PRIOR[b.band].map((prior, ci) => {
        const jitter = (hashCode(assetId + b.band + PLAN_CATEGORIES[ci]) % 9) - 4;
        return Math.max(2, prior + jitter);
      }),
    );
    const categories = PLAN_CATEGORIES.map((label, ci) => ({ label, pct: catPct[ci] }))
      .sort((x, y) => y.pct - x.pct || x.label.localeCompare(y.label))
      .slice(0, 3);

    return {
      band: b.band,
      window: b.window,
      sharePct: shares[bandIndex],
      demographics: baseSegments.map((s, si) => ({ label: s.label, pct: demoPct[si] })),
      categories,
    };
  });
}
