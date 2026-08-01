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

import { assetAllocations, historicalCampaigns } from "./data";
import { assetAudienceBands } from "./audience-data";

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
