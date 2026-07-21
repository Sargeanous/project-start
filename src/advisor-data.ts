// Advisor engine: asset economics, comparables, the advertiser media plan,
// campaign delivery KPIs, and the embedded copilot answers.
//
// Deliberately client-side and deterministic, same pattern as lifecycle-data
// and tickets-data: honest advisor logic over the seeded estate, shaped to be
// promoted to the backend later. The goal-fit tables mirror the server-side
// yield engine (dooh-store.ts) so both advisors reason the same way.
//
// Data policy (advertiser-facing paths): availability, audience, rate cards
// and aggregate demand only. Operator names and negotiated contract values
// never leave the commercial-facing functions.

import { assetAllocations, assets, type Asset, type AssetAllocation } from "./data";

/* ========================= parsing helpers ========================= */

export function parseAudienceWeekly(value: string): number {
  const m = value.match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] || "").toLowerCase();
  return Math.round(n * (unit === "m" ? 1_000_000 : unit === "k" ? 1_000 : 1));
}

export function parseBudgetAed(value: string): number {
  const m = value.replace(/,/g, "").match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] || "").toLowerCase();
  return Math.round(n * (unit === "m" ? 1_000_000 : unit === "k" ? 1_000 : 1));
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

export const money = (n: number) => `AED ${Math.round(n).toLocaleString("en-US")}`;

/* ========================= asset economics ========================= */

export interface AssetEconomics {
  asset: Asset;
  allocation?: AssetAllocation;
  rateCardWeekAed: number;
  audienceWeekly: number;
  /** Estimated CPM at rate card, AED per thousand weekly impressions. */
  estCpm: number;
  /** Weeks left on the current contract (0 when available). */
  remainingWeeks: number;
  /** Remaining contracted value at rate card (commercial-facing). */
  remainingValueAed: number;
  /** Sellable weeks inside the next 12 (available now or freed by expiry). */
  unsoldWeeksNext12: number;
  /** When the screen can next take a new campaign. */
  nextFreeLabel: string;
  /** Advertiser-safe aggregate demand signal. */
  demand: "High" | "Moderate" | "Low";
  bookable: boolean;
}

export function assetEconomics(assetId: string): AssetEconomics | null {
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const allocation = assetAllocations.find((a) => a.assetId === assetId);
  const rateCardWeekAed = allocation?.rateCardWeekAed ?? 12000;
  const audienceWeekly = parseAudienceWeekly(asset.audience);
  const estCpm = audienceWeekly ? Math.round((rateCardWeekAed / (audienceWeekly / 1000)) * 100) / 100 : 0;

  const now = Date.now();
  let remainingWeeks = 0;
  if (allocation?.expiryDate && (allocation.status === "Allocated" || allocation.status === "In bidding")) {
    const expiry = Date.parse(allocation.expiryDate);
    if (Number.isFinite(expiry) && expiry > now) remainingWeeks = Math.ceil((expiry - now) / WEEK_MS);
  }
  const remainingValueAed = remainingWeeks * rateCardWeekAed;
  const unsoldWeeksNext12 = remainingWeeks === 0 ? 12 : Math.max(0, 12 - Math.min(12, remainingWeeks));
  const nextFreeLabel = remainingWeeks === 0
    ? "Available now"
    : remainingWeeks > 12
      ? `Contracted until ${allocation?.expiryDate}`
      : `Frees up ${allocation?.expiryDate} (${remainingWeeks} wk)`;

  // Aggregate demand: audience pull + a stable per-asset jitter. Safe to show
  // to advertisers because it names no counterparty.
  const demandScore = audienceWeekly / 4000 + (hashCode(asset.id) % 40);
  const demand = demandScore > 110 ? "High" : demandScore > 70 ? "Moderate" : "Low";
  const bookable = asset.status !== "Offline" && asset.status !== "Maintenance";

  return { asset, allocation, rateCardWeekAed, audienceWeekly, estCpm, remainingWeeks, remainingValueAed, unsoldWeeksNext12, nextFreeLabel, demand, bookable };
}

/* ========================= comparables ========================= */

export interface Comparable {
  eco: AssetEconomics;
  cpmDeltaPct: number;
  reason: string;
}

/** Ranked alternative placements for an asset: similar audience economics,
 *  bookable, CPM within a band. Used by the commercial copilot ("place it
 *  elsewhere") and, without operator fields, by the advertiser paths. */
export function comparables(assetId: string, count = 3): Comparable[] {
  const base = assetEconomics(assetId);
  if (!base) return [];
  return assets
    .filter((a) => a.id !== assetId)
    .map((a) => assetEconomics(a.id))
    .filter((e): e is AssetEconomics => Boolean(e && e.bookable && e.estCpm > 0 && base.estCpm > 0))
    .map((eco) => {
      const cpmDeltaPct = Math.round(((eco.estCpm - base.estCpm) / base.estCpm) * 100);
      const sameZone = eco.asset.zone === base.asset.zone;
      const audienceRatio = eco.audienceWeekly / Math.max(1, base.audienceWeekly);
      const score =
        (sameZone ? 30 : 0) +
        (eco.unsoldWeeksNext12 >= 4 ? 25 : eco.unsoldWeeksNext12 * 5) +
        Math.max(0, 25 - Math.abs(cpmDeltaPct)) +
        Math.max(0, 20 - Math.abs(1 - audienceRatio) * 40);
      const reason = `${sameZone ? "Same zone" : eco.asset.zone}, ${(eco.audienceWeekly / 1000).toFixed(0)}k weekly, CPM ${cpmDeltaPct === 0 ? "matches" : `${Math.abs(cpmDeltaPct)}% ${cpmDeltaPct > 0 ? "higher" : "lower"}`}, ${eco.nextFreeLabel.toLowerCase()}`;
      return { eco, cpmDeltaPct, reason, score };
    })
    .filter((c) => Math.abs(c.cpmDeltaPct) <= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ score: _s, ...rest }) => rest);
}

/* ========================= advertiser media plan ========================= */
/* Goal tables mirror GOAL_ZONE_FIT / GOAL_DAYPARTS in backend/dooh-store.ts. */

const GOAL_ZONE_FIT: Record<string, Record<string, number>> = {
  retail: { Downtown: 1.35, "Abu Dhabi City": 1.15, "Yas Island": 1.2, "Industrial Zone": 0.7, "Al Ain": 1.0 },
  tourism: { "Yas Island": 1.4, "Abu Dhabi City": 1.2, Downtown: 1.1, "Al Ain": 1.05, "Industrial Zone": 0.6 },
  awareness: { "Abu Dhabi City": 1.3, "Al Ain": 1.15, Downtown: 1.1, "Yas Island": 1.1, "Industrial Zone": 1.0 },
  safety: { "Abu Dhabi City": 1.35, "Al Ain": 1.25, "Industrial Zone": 1.2, Downtown: 1.0, "Yas Island": 0.9 },
};
const GOAL_DAYPARTS: Record<string, string[]> = {
  retail: ["Evening peak (18:00-22:00)", "Weekend midday"],
  tourism: ["Evening peak (18:00-22:00)", "Late morning"],
  awareness: ["Morning peak (07:00-10:00)", "Evening peak (18:00-22:00)"],
  safety: ["Morning peak (07:00-10:00)", "Evening peak (18:00-22:00)"],
};

export const PLAN_GOALS = [
  { value: "retail", label: "Retail sales" },
  { value: "tourism", label: "Tourism and leisure" },
  { value: "awareness", label: "Brand awareness" },
  { value: "safety", label: "Civic and safety" },
];

export const PLAN_CATEGORIES = ["Retail and FMCG", "Food and beverage", "Tourism and leisure", "Finance and real estate", "Telecom and tech", "Public service"];

export interface PlanLine {
  assetId: string;
  name: string;
  zone: string;
  type: string;
  audienceWeekly: number;
  weeksAffordable: number;
  projectedImpressions: number;
  cpm: number;
  rateCardWeekAed: number;
  demand: "High" | "Moderate" | "Low";
  availability: string;
  reason: string;
}

export interface MediaPlan {
  budgetAed: number;
  goal: string;
  lines: PlanLine[];
  dayparts: string[];
  totalImpressions: number;
  avgCpm: number;
  summary: string;
}

/** Advertiser-facing plan: public fields only (no operators, no negotiated
 *  values). Rate cards are quoted because bids anchor on them. */
export function mediaPlan(budgetAed: number, goalRaw: string, category?: string): MediaPlan {
  const goal = (goalRaw || "awareness").toLowerCase();
  const fit = GOAL_ZONE_FIT[goal] ?? GOAL_ZONE_FIT.awareness;
  const lines: PlanLine[] = assets
    .map((a) => assetEconomics(a.id))
    .filter((e): e is AssetEconomics => Boolean(e && e.bookable && e.audienceWeekly > 0))
    .map((eco) => {
      const zoneFit = fit[eco.asset.zone] ?? 1;
      const weeksAffordable = Math.max(1, Math.floor(budgetAed / eco.rateCardWeekAed));
      const bookableWeeks = Math.min(weeksAffordable, Math.max(1, eco.unsoldWeeksNext12));
      const projectedImpressions = Math.round(eco.audienceWeekly * bookableWeeks * zoneFit);
      const spend = Math.min(budgetAed, eco.rateCardWeekAed * bookableWeeks);
      const cpm = projectedImpressions ? Math.round((spend / projectedImpressions) * 1000 * 100) / 100 : 0;
      const catNote = category ? `${category} fits ${eco.asset.zone === "Industrial Zone" ? "workforce" : eco.asset.zone} audiences` : "";
      const reason = [
        `${eco.asset.zone} fit x${zoneFit.toFixed(2)}`,
        `${(eco.audienceWeekly / 1000).toFixed(0)}k weekly reach`,
        `${bookableWeeks} wk within budget at ${money(eco.rateCardWeekAed)}/wk`,
        eco.nextFreeLabel.toLowerCase(),
        catNote,
      ].filter(Boolean).join(", ");
      return {
        assetId: eco.asset.id, name: eco.asset.name, zone: eco.asset.zone, type: eco.asset.type,
        audienceWeekly: eco.audienceWeekly, weeksAffordable: bookableWeeks, projectedImpressions,
        cpm, rateCardWeekAed: eco.rateCardWeekAed, demand: eco.demand, availability: eco.nextFreeLabel, reason,
      };
    })
    .sort((a, b) => b.projectedImpressions - a.projectedImpressions)
    .slice(0, 5);

  const totalImpressions = lines.reduce((s, l) => s + l.projectedImpressions, 0);
  const totalSpend = lines.reduce((s, l) => s + Math.min(budgetAed, l.rateCardWeekAed * l.weeksAffordable), 0);
  const avgCpm = totalImpressions ? Math.round((totalSpend / totalImpressions) * 1000 * 100) / 100 : 0;
  const goalLabel = PLAN_GOALS.find((g) => g.value === goal)?.label ?? goal;
  const summary = lines.length
    ? `For ${goalLabel.toLowerCase()} on ${money(budgetAed)}, the strongest placement is ${lines[0].name} (${lines[0].zone}). The top ${lines.length} screens project ${(totalImpressions / 1_000_000).toFixed(1)}M impressions at an average CPM of AED ${avgCpm.toFixed(2)}.`
    : "No bookable screens fit this budget.";
  return { budgetAed, goal, lines, dayparts: GOAL_DAYPARTS[goal] ?? GOAL_DAYPARTS.awareness, totalImpressions, avgCpm, summary };
}

/* ========================= campaign delivery KPIs ========================= */

export interface CampaignDelivery {
  campaignId: string;
  name: string;
  status: string;
  budgetAed: number;
  bookedImpressions: number;
  deliveredImpressions: number;
  deliveredPct: number;
  spendToDateAed: number;
  effectiveCpm: number;
  /** Positive = spending faster than the flight is elapsing. */
  pacingDeltaPct: number;
  pace: "On plan" | "Ahead" | "Behind";
  popPct: number;
  flightWeeks: number;
  elapsedPct: number;
}

/** Deterministic delivery series for a campaign row. Booked reach and budget
 *  come from the record; elapsed, pacing skew and proof-of-play derive from a
 *  stable hash so every render tells the same story. */
export function campaignDelivery(c: { id: string; campaign?: string; budget: string; status: string; reach: string }): CampaignDelivery | null {
  const active = ["Live", "Published", "Scheduled", "Settled", "Approved"].includes(c.status);
  if (!active) return null;
  const seed = hashCode(c.id);
  const budgetAed = parseBudgetAed(c.budget);
  const bookedImpressions = parseAudienceWeekly(c.reach);
  if (!budgetAed || !bookedImpressions) return null;
  const flightWeeks = 4 + (seed % 5); // 4-8 week flights
  const elapsedPct = c.status === "Settled" ? 100 : c.status === "Approved" || c.status === "Scheduled" ? 0 : 35 + (seed % 46); // live: 35-80%
  const popPct = Math.round((97.2 + ((seed >> 3) % 26) / 10) * 10) / 10; // 97.2-99.7
  const deliveredImpressions = Math.round((bookedImpressions * elapsedPct * (popPct / 100)) / 100);
  const skew = (((seed >> 5) % 21) - 10) / 100; // -10%..+10% spend skew
  const spendPct = Math.min(100, Math.max(0, elapsedPct * (1 + skew)));
  const spendToDateAed = Math.round((budgetAed * spendPct) / 100);
  const effectiveCpm = deliveredImpressions ? Math.round((spendToDateAed / deliveredImpressions) * 1000 * 100) / 100 : 0;
  const pacingDeltaPct = Math.round(spendPct - elapsedPct);
  const pace = Math.abs(pacingDeltaPct) <= 5 ? "On plan" : pacingDeltaPct > 5 ? "Ahead" : "Behind";
  return {
    campaignId: c.id, name: c.campaign ?? c.id, status: c.status, budgetAed,
    bookedImpressions, deliveredImpressions, deliveredPct: Math.round((deliveredImpressions / bookedImpressions) * 100),
    spendToDateAed, effectiveCpm, pacingDeltaPct, pace, popPct, flightWeeks, elapsedPct,
  };
}

/* ========================= embedded copilot answers ========================= */

const fmtM = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${Math.round(n / 1000)}k`;

/** Commercial-role answers, anchored to one asset. May name operators and
 *  contract values: this path renders only inside internal roles. */
export function answerAssetCommercialQuery(assetId: string, q: string): string {
  const eco = assetEconomics(assetId);
  if (!eco) return "I could not find that asset.";
  const n = q.toLowerCase();
  const alloc = eco.allocation;

  if (/budget|left|remain|value|worth|contract/.test(n)) {
    if (eco.remainingWeeks > 0 && alloc) {
      return `${eco.asset.id} is contracted to ${alloc.operator ?? "the current operator"} until ${alloc.expiryDate}. Remaining value at rate card: ${money(eco.remainingValueAed)} (${eco.remainingWeeks} weeks at ${money(eco.rateCardWeekAed)}/wk). Revenue to date on this contract: ${alloc.revenueToDateAed ? money(alloc.revenueToDateAed) : "not recorded"}.`;
    }
    return `${eco.asset.id} is not under contract. It sells at ${money(eco.rateCardWeekAed)}/wk; the next 12 weeks are open, worth up to ${money(12 * eco.rateCardWeekAed)}.`;
  }
  if (/free|available|when|window|open/.test(n)) {
    return `${eco.asset.id}: ${eco.nextFreeLabel}. ${eco.unsoldWeeksNext12} of the next 12 weeks are sellable. Demand for this location reads ${eco.demand.toLowerCase()}.`;
  }
  if (/elsewhere|place|move|relocat|alternative|similar|instead/.test(n)) {
    const alts = comparables(assetId);
    if (!alts.length) return "No comparable placements clear the audience and CPM band right now.";
    const rows = alts.map((c, i) => `${i + 1}. ${c.eco.asset.name} (${c.eco.asset.id}): ${c.reason}`).join("\n");
    return `Closest placements by audience economics:\n${rows}\nUse "Draft relocation proposal" on a match to route it through approval.`;
  }
  if (/cpm|impression|audience|reach/.test(n)) {
    return `${eco.asset.id} reaches ${fmtM(eco.audienceWeekly)} weekly. At ${money(eco.rateCardWeekAed)}/wk the estimated CPM is AED ${eco.estCpm.toFixed(2)}.`;
  }
  if (/rate|price|cost/.test(n)) {
    return `Rate card for ${eco.asset.id} is ${money(eco.rateCardWeekAed)}/wk${alloc?.annualValueAed ? `; the current contract carries ${money(alloc.annualValueAed)}/yr` : ""}.`;
  }
  return `I can answer about this asset's remaining contract value, availability windows, CPM and audience, rate card, or comparable placements. Try "how much is left on this contract" or "can I place this campaign elsewhere".`;
}

/** Advertiser-scoped answers: own campaigns + public availability only.
 *  Never names operators or negotiated contract values. */
export function answerAdvertiserQuery(q: string, campaigns: Array<{ id: string; campaign?: string; budget: string; status: string; reach: string }>): string {
  const n = q.toLowerCase();
  const deliveries = campaigns.map(campaignDelivery).filter((d): d is CampaignDelivery => Boolean(d));

  if (/budget|left|remain|spen[dt]/.test(n)) {
    if (!deliveries.length) return "None of your campaigns are in flight yet, so no budget has been consumed.";
    const rows = deliveries.map((d) => `${d.name}: ${money(d.budgetAed - d.spendToDateAed)} left of ${money(d.budgetAed)} (${Math.round(100 - (d.spendToDateAed / d.budgetAed) * 100)}%), pacing ${d.pace.toLowerCase()}${d.pace === "On plan" ? "" : ` by ${Math.abs(d.pacingDeltaPct)}%`}`).join("\n");
    return `Budget position:\n${rows}`;
  }
  if (/pac(e|ing)|on plan|burn/.test(n)) {
    if (!deliveries.length) return "No campaigns in flight to pace yet.";
    const rows = deliveries.map((d) => `${d.name}: ${d.elapsedPct}% of flight elapsed, ${Math.round((d.spendToDateAed / d.budgetAed) * 100)}% of budget spent: ${d.pace}${d.pace === "On plan" ? "" : ` (${d.pacingDeltaPct > 0 ? "+" : ""}${d.pacingDeltaPct}%)`}`).join("\n");
    return `Pacing:\n${rows}`;
  }
  if (/cpm|perform|deliver|impression|kpi/.test(n)) {
    if (!deliveries.length) return "Delivery KPIs appear once a campaign goes live.";
    const rows = deliveries.map((d) => `${d.name}: ${fmtM(d.deliveredImpressions)} of ${fmtM(d.bookedImpressions)} impressions (${d.deliveredPct}%), effective CPM AED ${d.effectiveCpm.toFixed(2)}, proof of play ${d.popPct}%`).join("\n");
    return `Delivery so far:\n${rows}`;
  }
  if (/where|spend|place|elsewhere|recommend|suggest|plan/.test(n)) {
    const budgetM = n.match(/(\d[\d,.]*)\s*(k|m)?/);
    const budget = budgetM ? parseBudgetAed(budgetM[0]) : 250000;
    const goal = /touris|leisure/.test(n) ? "tourism" : /aware|brand/.test(n) ? "awareness" : /safe|civic/.test(n) ? "safety" : "retail";
    const plan = mediaPlan(budget >= 10000 ? budget : 250000, goal);
    const rows = plan.lines.slice(0, 3).map((l, i) => `${i + 1}. ${l.name} (${l.zone}): ${fmtM(l.projectedImpressions)} impressions, CPM AED ${l.cpm.toFixed(2)}, ${l.availability.toLowerCase()}, demand ${l.demand.toLowerCase()}`).join("\n");
    return `${plan.summary}\n${rows}\nOpen the Media Planner for the full ranked plan; booking still runs through bidding and approval.`;
  }
  if (/available|free|screen|inventory/.test(n)) {
    const open = assets.map((a) => assetEconomics(a.id)).filter((e): e is AssetEconomics => Boolean(e && e.bookable && e.remainingWeeks === 0)).slice(0, 4);
    if (!open.length) return "Nothing is immediately open; the Media Planner can rank screens that free up soon.";
    const rows = open.map((e) => `${e.asset.name} (${e.asset.zone}): ${fmtM(e.audienceWeekly)} weekly, ${money(e.rateCardWeekAed)}/wk, demand ${e.demand.toLowerCase()}`).join("\n");
    return `Available now:\n${rows}`;
  }
  return `I can answer about your budget left, pacing, delivered impressions and CPM, proof of play, current availability, or where to spend next. Try "how much budget is left" or "where should I spend 300k".`;
}
