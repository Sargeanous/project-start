// Slot-based selling granularity: every asset runs a 16-slot x 8-second
// content loop per daypart, so the commercial unit is a loop slot per
// daypart per week instead of a whole-screen week. Same pattern as
// advisor-data and audience-data: client-side, deterministic and
// hash-seeded, so two loads always show identical loops.
//
// Daypart vocabulary is reused from audience-data (the four bands that the
// rules engine and the commercial popover already speak). Occupants on sold
// and civic slots reuse the advertiser and campaign names already seeded in
// historicalCampaigns, so the loop tells the same story as the history block.
//
// Data policy: occupant names are INTERNAL ONLY, this module feeds the
// internal Commercial Map popover.

import { assetAllocations, assets, historicalCampaigns } from "./data";
import { assetAudienceBands } from "./audience-data";
import { distanceM } from "./rules-engine";

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Loop policy cited by the client: 16 spots of 8 seconds per loop. */
export const LOOP_SLOT_COUNT = 16;
export const LOOP_SLOT_SECONDS = 8;

export type LoopSlotState = "civic" | "sold" | "open";

export interface LoopSlot {
  /** 1-based position in the loop. */
  index: number;
  state: LoopSlotState;
  /** Advertiser on sold slots, issuing authority on civic slots. */
  occupant?: string;
  /** Campaign label on sold and civic slots. */
  campaign?: string;
  /** Weekly price of this slot in this daypart (0 on civic reserve). */
  priceWeekAed: number;
}

export interface DaypartLoop {
  /** Band name from the audience-data daypart vocabulary. */
  daypart: string;
  /** Clock window shown next to the band name. */
  window: string;
  /** Uniform per-slot weekly price inside this daypart. */
  slotPriceWeekAed: number;
  slots: LoopSlot[];
  openCount: number;
  soldCount: number;
  civicCount: number;
}

/* Occupant pools: commercial flights (media fee > 0) fill sold slots and the
 * seeded civic campaigns (no media fee) fill the civic reserve, so every name
 * on the strip already exists elsewhere in the demo data. */
const COMMERCIAL_POOL = historicalCampaigns
  .filter((c) => c.budgetAed > 0)
  .map((c) => ({ advertiser: c.advertiser, campaign: c.campaign }));
const CIVIC_POOL = historicalCampaigns
  .filter((c) => c.budgetAed === 0)
  .map((c) => ({ advertiser: c.advertiser, campaign: c.campaign }));

/** Existing bidders offered in the sell-slot dialog (unique commercial
 *  advertisers from the seeded flight history). */
export const LOOP_BIDDERS = [...new Set(COMMERCIAL_POOL.map((p) => p.advertiser))];

/** The four daypart loops for one asset. Deterministic per asset and daypart:
 *  the weekly rate card is split across the loop in proportion to each band's
 *  share of daily reach, two slots per loop stay in the civic reserve, and
 *  busier bands sell deeper into the loop. */
export function assetLoops(assetId: string): DaypartLoop[] {
  const rateWeek = assetAllocations.find((a) => a.assetId === assetId)?.rateCardWeekAed ?? 12000;
  return assetAudienceBands(assetId).map((band) => {
    // Rate card / week buys the whole loop across all bands; one slot in one
    // band carries its share of reach divided by the 16 positions. Rounded to
    // AED 25 steps so the figure reads like a price, not a quotient.
    const raw = (rateWeek * band.sharePct) / 100 / LOOP_SLOT_COUNT;
    const slotPriceWeekAed = Math.max(50, Math.round(raw / 25) * 25);
    // Sell-through prior tracks the band's share of reach (22% to 76%).
    const soldThreshold = Math.min(76, Math.round(22 + band.sharePct * 1.6));
    const seed = hashCode(`${assetId}|loop|${band.band}`);
    const civicA = seed % LOOP_SLOT_COUNT;
    const civicB = (civicA + 5 + ((seed >>> 5) % 7)) % LOOP_SLOT_COUNT;

    const slots: LoopSlot[] = Array.from({ length: LOOP_SLOT_COUNT }, (_, i) => {
      const h = hashCode(`${assetId}|${band.band}|slot${i + 1}`);
      if (i === civicA || i === civicB) {
        const civic = CIVIC_POOL[h % Math.max(1, CIVIC_POOL.length)];
        return { index: i + 1, state: "civic" as const, occupant: civic?.advertiser, campaign: civic?.campaign, priceWeekAed: 0 };
      }
      if (h % 100 < soldThreshold) {
        const pick = COMMERCIAL_POOL[h % Math.max(1, COMMERCIAL_POOL.length)];
        return { index: i + 1, state: "sold" as const, occupant: pick?.advertiser, campaign: pick?.campaign, priceWeekAed: slotPriceWeekAed };
      }
      return { index: i + 1, state: "open" as const, priceWeekAed: slotPriceWeekAed };
    });

    return {
      daypart: band.band,
      window: band.window,
      slotPriceWeekAed,
      slots,
      openCount: slots.filter((s) => s.state === "open").length,
      soldCount: slots.filter((s) => s.state === "sold").length,
      civicCount: slots.filter((s) => s.state === "civic").length,
    };
  });
}

/* ================= Competitive separation buffers (RULE-COM-002) =================
 *
 * Client optimization: competing brands must not appear directly next to each
 * other, and "next to" is meant in BOTH dimensions.
 *
 *   SPATIAL  - two neighbouring screens inside the same approach corridor.
 *   TEMPORAL - two adjacent slots inside the same 16-slot loop.
 *
 * RULE-COM-002 "Competitive separation" already carries the policy prose in
 * the rule catalogue (intelligence-content.ts); it runs in Recommend mode with
 * a commercial-lead override, so both legs here are ADVISORY. They name the
 * collision and cite the rule, they never block a reservation: a named human
 * on the commercial desk decides.
 *
 * Same house rules as the rest of this module: client-side, deterministic,
 * no randomness and no wall clock. Distances use the shared haversine helper
 * (rules-engine.distanceM), the same one placement-strategy and the radius
 * preflight already measure with, so every metre figure on the platform is
 * computed the same way.
 */

export type BrandVertical =
  | "Automotive"
  | "Finance"
  | "Food and beverage"
  | "Government"
  | "Real estate"
  | "Retail"
  | "Telecom"
  | "Tourism";

/** Rule cited by both legs. Defined in intelligence-content.ts. */
export const COMPETITIVE_SEPARATION_RULE = "RULE-COM-002";

/** Competitive buffer between neighbouring screens, in metres.
 *
 *  750 m is one approach corridor: at 60 km/h the same viewer clears both
 *  structures inside roughly 45 seconds, so two same-vertical brands read as
 *  adjacent even though the screens are separate sites. Named and exported so
 *  the figure moves in one place once the client fixes their own buffer. */
export const COMPETITIVE_BUFFER_M = 750;

/* Brand vertical lookup. Every advertiser, bidder and contract holder already
 * seeded in the demo appears here: historicalCampaigns and historicalBids in
 * data.ts, the settlement ledger and auction bidders in the backend store, the
 * seeded flight pool in advisor-data, and the allocation holders below.
 * "Automotive" carries no seeded brand yet; it stays in the vocabulary because
 * the catalogue rule is written against the full vertical list. */
const BRAND_VERTICALS: Record<string, BrandVertical> = {
  "Coca-Cola": "Food and beverage",
  "Abu Dhabi Duty Free": "Retail",
  "Gulf Duty Free": "Retail",
  "Retail Majlis": "Retail",
  "Marina Retail Group": "Retail",
  "Aldar Yas Mall": "Retail",
  "Lulu Hypermarket": "Retail",
  Noon: "Retail",
  "DCT Abu Dhabi": "Tourism",
  "Yas Tourism": "Tourism",
  "Royal Safari": "Tourism",
  "Ferrari World": "Tourism",
  "Louvre Abu Dhabi": "Tourism",
  "Emirates Palace": "Tourism",
  "Etihad Airways": "Tourism",
  "e& Telecom": "Telecom",
  "e& UAE": "Telecom",
  ADCB: "Finance",
  "Aldar Properties": "Real estate",
  ADMO: "Government",
  DMT: "Government",
  "Abu Dhabi Police": "Government",
  "Active Abu Dhabi": "Government",
};

/** Vertical for an advertiser, bidder or contract holder. Null when the name
 *  is outside the seeded brand book (a free-typed campaign owner, say), which
 *  is what turns both legs off rather than guessing a collision. */
export function brandVertical(name?: string): BrandVertical | null {
  const key = (name ?? "").trim();
  return key ? BRAND_VERTICALS[key] ?? null : null;
}

/** The vertical a screen currently carries, read from its allocation holder in
 *  assetAllocations. Available and unallocated screens carry none. */
export function assetHolderVertical(assetId: string): { holder: string; vertical: BrandVertical } | null {
  const holder = assetAllocations.find((a) => a.assetId === assetId)?.operator;
  const vertical = brandVertical(holder);
  return holder && vertical ? { holder, vertical } : null;
}

export interface CompetitiveNeighbour {
  assetId: string;
  assetName: string;
  /** Haversine metres from the target screen. */
  distanceM: number;
  /** Contract holder on the neighbouring screen. */
  holder: string;
  vertical: BrandVertical;
}

/** Every allocated screen inside the buffer of one screen, nearest first.
 *  This is the raw spatial picture: which verticals are already locked in the
 *  corridor around this site, whoever is being sold. */
export function competitiveNeighbours(assetId: string): CompetitiveNeighbour[] {
  const target = assets.find((a) => a.id === assetId);
  if (!target) return [];
  return assets
    .filter((asset) => asset.id !== assetId)
    .map((asset) => ({ asset, metres: distanceM(target, asset), held: assetHolderVertical(asset.id) }))
    .filter((row) => row.held !== null && row.metres <= COMPETITIVE_BUFFER_M)
    .sort((a, b) => a.metres - b.metres)
    .map((row) => ({
      assetId: row.asset.id,
      assetName: row.asset.name,
      distanceM: row.metres,
      holder: row.held!.holder,
      vertical: row.held!.vertical,
    }));
}

/** SPATIAL leg: neighbouring screens inside the buffer that already carry the
 *  proposed advertiser's vertical under a DIFFERENT holder. A brand sitting
 *  beside itself is a rotation, not a competitive collision, so the same name
 *  never flags. */
export function spatialCompetitiveFlags(assetId: string, advertiser: string): CompetitiveNeighbour[] {
  const vertical = brandVertical(advertiser);
  if (!vertical) return [];
  const name = advertiser.trim();
  return competitiveNeighbours(assetId).filter((n) => n.vertical === vertical && n.holder !== name);
}

export interface AdjacentSlotFlag {
  /** 1-based position of the colliding neighbour slot. */
  slotIndex: number;
  /** Where it sits relative to the slot being sold. */
  position: "before" | "after";
  occupant: string;
  campaign?: string;
  vertical: BrandVertical;
}

/** TEMPORAL leg: the slot immediately before and immediately after the target
 *  position, wrapping the 16-slot loop (slot 1 follows slot 16), flagged when
 *  a sold neighbour carries the proposed advertiser's vertical under a
 *  different brand. */
export function temporalCompetitiveFlags(
  assetId: string,
  daypart: string,
  slotIndex: number,
  advertiser: string,
): AdjacentSlotFlag[] {
  const vertical = brandVertical(advertiser);
  if (!vertical) return [];
  const loop = assetLoops(assetId).find((l) => l.daypart === daypart);
  if (!loop) return [];
  const name = advertiser.trim();
  // 1-based wrap: position 0 becomes 16 and position 17 becomes 1.
  const wrap = (i: number) => ((i - 1 + LOOP_SLOT_COUNT) % LOOP_SLOT_COUNT) + 1;
  const neighbours: Array<{ index: number; position: "before" | "after" }> = [
    { index: wrap(slotIndex - 1), position: "before" },
    { index: wrap(slotIndex + 1), position: "after" },
  ];
  return neighbours
    .map((n) => ({ slot: loop.slots[n.index - 1], position: n.position }))
    .filter(
      (row) =>
        row.slot?.state === "sold" &&
        !!row.slot.occupant &&
        row.slot.occupant !== name &&
        brandVertical(row.slot.occupant) === vertical,
    )
    .map((row) => ({
      slotIndex: row.slot.index,
      position: row.position,
      occupant: row.slot.occupant!,
      campaign: row.slot.campaign,
      vertical,
    }));
}
