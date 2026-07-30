// Pure, deterministic rules evaluator shared by the server (dooh-store enforcement)
// and the client (RulesPage simulator + wizard preview), so both always agree.
import { assets } from "./data";
import {
  OVERRIDE_RANK,
  sensitiveSites,
  zoneContentRules,
  type OverrideTier,
  type SensitiveKind,
} from "./rules-data";

export interface RuleContext {
  kind: "booking" | "scheduling" | "emergency";
  zones?: string[];
  assetIds?: string[];
  coords?: Array<{ lat: number; lng: number }>;
  daypart?: string;
  category?: string; // vertical / creative category
  requesterTier?: OverrideTier;
}

export interface RuleHit {
  ruleId: string;
  reasonCode: string;
  tier: OverrideTier;
  severity: "block" | "warn";
  label: string; // short, translation-key-friendly
  detail: string; // dynamic (distances, names)
  overriddenBy?: OverrideTier;
}

export interface RuleVerdict {
  blocked: boolean;
  hits: RuleHit[]; // effective blocks (after override)
  warnings: RuleHit[]; // warn-level, incl. downgraded blocks
  reasonCodes: string[];
  firedRuleIds: string[];
}

const KIND_LABEL: Record<SensitiveKind, string> = {
  mosque: "Proximity to mosque",
  school: "Proximity to school",
  embassy: "Proximity to diplomatic site",
  military: "Proximity to military site",
  hospital: "Proximity to hospital",
};

// Haversine distance in metres.
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Normalized daypart matching: UI composers emit labels like
// "Morning commute (07:00-10:00)" while rules name the daypart alone
// ("Morning commute"), so compare case-insensitively and accept a prefix or
// containment match instead of exact string equality.
export function daypartMatches(contextDaypart: string | undefined, ruleDaypart: string): boolean {
  const ctx = (contextDaypart ?? "").trim().toLowerCase();
  const rule = ruleDaypart.trim().toLowerCase();
  if (!ctx || !rule) return false;
  return ctx === rule || ctx.startsWith(rule) || ctx.includes(rule);
}

function resolveCoords(context: RuleContext): Array<{ id: string; lat: number; lng: number }> {
  const out: Array<{ id: string; lat: number; lng: number }> = [];
  if (context.assetIds?.length) {
    for (const id of context.assetIds) {
      const asset = assets.find((a) => a.id === id);
      if (asset) out.push({ id, lat: asset.lat, lng: asset.lng });
    }
  }
  if (context.zones?.length) {
    for (const asset of assets) {
      if (context.zones.some((z) => asset.zone.toLowerCase() === z.toLowerCase()) && !out.some((o) => o.id === asset.id)) {
        out.push({ id: asset.id, lat: asset.lat, lng: asset.lng });
      }
    }
  }
  (context.coords ?? []).forEach((c, i) => out.push({ id: `coord-${i}`, lat: c.lat, lng: c.lng }));
  return out;
}

export function evaluateRules(context: RuleContext): RuleVerdict {
  const raw: RuleHit[] = [];
  const targets = resolveCoords(context);

  // 1. Proximity exclusions around sensitive sites.
  for (const target of targets) {
    for (const site of sensitiveSites) {
      const d = distanceM(target, site);
      if (d <= site.radiusM) {
        raw.push({
          ruleId: `RULE-PROX-${site.id}`,
          reasonCode: `PROX_${site.kind.toUpperCase()}`,
          tier: site.kind === "military" || site.kind === "embassy" ? "Regulatory" : "Regulatory",
          severity: "block",
          label: KIND_LABEL[site.kind],
          detail: `${target.id} is ${d}m from ${site.name} (limit ${site.radiusM}m).`,
        });
      }
    }
  }

  // 2. Zone / content-category / time-window rules.
  const category = (context.category ?? "").toLowerCase();
  // Zone-scoped rules also cover explicitly targeted screens: each targeted
  // asset contributes its own zone, so per-screen previews (radius preflight,
  // bulk apply) agree with zone-wide booking checks. Coordinates are NOT
  // expanded to the zone, so proximity flags stay per-screen.
  const contextZones = new Set((context.zones ?? []).map((z) => z.toLowerCase()));
  for (const id of context.assetIds ?? []) {
    const asset = assets.find((a) => a.id === id);
    if (asset) contextZones.add(asset.zone.toLowerCase());
  }
  for (const rule of zoneContentRules) {
    if (rule.zone && !contextZones.has(rule.zone.toLowerCase())) continue;
    const categoryHit = rule.blockedCategories?.some((c) => category.includes(c.toLowerCase())) ?? false;
    const daypartHit = rule.restrictedDayparts?.some((d) => daypartMatches(context.daypart, d)) ?? false;
    // A rule with both category and daypart fires only when both match; a
    // category-only rule fires on category; a daypart-only rule on daypart.
    const bothRequired = rule.blockedCategories && rule.restrictedDayparts;
    const fired = bothRequired ? categoryHit && daypartHit : categoryHit || daypartHit;
    if (fired) {
      raw.push({
        ruleId: rule.ruleId,
        reasonCode: rule.reasonCode,
        tier: rule.tier,
        severity: "block",
        label: rule.reasonCode === "PROHIBITED_CATEGORY" ? "Prohibited category" : rule.reasonCode === "SCHOOL_DAYPART_RESTRICTED" ? "School-hours restriction" : rule.reasonCode === "RESIDENTIAL_LOCAL_TIER" ? "Residential belt policy" : "Sensitive content",
        detail: rule.message,
      });
    }
  }

  // 3. Override hierarchy: a higher-tier requester downgrades lower-tier blocks
  // to warnings (Tech Spec 10.5).
  const requesterRank = context.requesterTier ? OVERRIDE_RANK[context.requesterTier] : OVERRIDE_RANK.Commercial;
  const hits: RuleHit[] = [];
  const warnings: RuleHit[] = [];
  for (const hit of raw) {
    if (context.requesterTier && requesterRank > OVERRIDE_RANK[hit.tier]) {
      warnings.push({ ...hit, severity: "warn", overriddenBy: context.requesterTier });
    } else if (hit.severity === "block") {
      hits.push(hit);
    } else {
      warnings.push(hit);
    }
  }

  const all = [...hits, ...warnings];
  return {
    blocked: hits.length > 0,
    hits,
    warnings,
    reasonCodes: [...new Set(all.map((h) => (h.overriddenBy ? `OVERRIDDEN_BY_${h.overriddenBy.toUpperCase().replace(/\s+/g, "_")}` : h.reasonCode)))],
    firedRuleIds: [...new Set(all.map((h) => h.ruleId))],
  };
}
