// Machine-evaluable rules for the DOOH Rules Engine (RFP SCH-003..006).
// Separate from the prose DoohRule catalogue (intelligence-content.ts): those
// describe policy for humans; these are the deterministic rules evaluateRules()
// actually enforces at booking, scheduling and emergency targeting.

// Override hierarchy (Tech Spec 10.5): Emergency > Public Safety > Civic >
// Regulatory > Commercial. Higher rank wins.
export type OverrideTier = "Emergency" | "Public Safety" | "Civic" | "Regulatory" | "Commercial";

export const OVERRIDE_RANK: Record<OverrideTier, number> = {
  Emergency: 5,
  "Public Safety": 4,
  Civic: 3,
  Regulatory: 2,
  Commercial: 1,
};

export type SensitiveKind = "mosque" | "school" | "embassy" | "military" | "hospital";

export interface SensitiveSite {
  id: string;
  name: string;
  kind: SensitiveKind;
  lat: number;
  lng: number;
  radiusM: number;
}

// Placed deliberately near the 5 real asset coordinates so proximity checks
// actually fire in the demo.
export const sensitiveSites: SensitiveSite[] = [
  { id: "SS-01", name: "Al Zahiyah Mosque", kind: "mosque", lat: 24.4962, lng: 54.3832, radiusM: 250 }, // ~80m from AD-DWT-011 (Abu Dhabi Mall)
  { id: "SS-02", name: "Yas International School", kind: "school", lat: 24.4894, lng: 54.6041, radiusM: 300 }, // ~130m from AD-BUS-022 (Yas bus stop)
  { id: "SS-03", name: "Corniche Diplomatic Mission", kind: "embassy", lat: 24.4674, lng: 54.3343, radiusM: 200 }, // ~90m from AD-HWY-001 (Corniche)
  { id: "SS-04", name: "Al Ain Industrial Security Post", kind: "military", lat: 24.0788, lng: 55.6657, radiusM: 400 }, // ~85m from AD-HWY-009 (Al Ain Truck Road)
  { id: "SS-05", name: "Rabdan Community Hospital", kind: "hospital", lat: 24.3977, lng: 54.4926, radiusM: 250 }, // ~100m from AD-BRG-014 (Mussafah corridor)
];

// Zone + content-category + time-window restrictions.
export interface ZoneContentRule {
  ruleId: string;
  reasonCode: string;
  tier: OverrideTier;
  zone?: string; // omitted = network-wide
  blockedCategories?: string[]; // matched case-insensitively against vertical/category
  restrictedDayparts?: string[]; // dayparts where this rule blocks
  message: string;
}

export const zoneContentRules: ZoneContentRule[] = [
  {
    ruleId: "RULE-ZON-001",
    reasonCode: "PROHIBITED_CATEGORY",
    tier: "Regulatory",
    blockedCategories: ["alcohol", "gambling", "tobacco", "nightlife", "beer", "wine", "betting"],
    message: "Prohibited advertising category on public roadside inventory (ADG-2.1/2.3/2.4).",
  },
  {
    ruleId: "RULE-ZON-002",
    reasonCode: "SCHOOL_DAYPART_RESTRICTED",
    tier: "Regulatory",
    zone: "Yas Island",
    restrictedDayparts: ["Morning commute", "School run"],
    blockedCategories: ["energy drink", "confectionery", "fast food"],
    message: "Age-sensitive category restricted near schools during the morning commute (ADG-4.x).",
  },
  {
    ruleId: "RULE-ZON-003",
    reasonCode: "SENSITIVE_ZONE_POLITICAL",
    tier: "Regulatory",
    blockedCategories: ["political", "religious campaign"],
    message: "Political or religious-campaign content requires competent-authority approval (MCS-02/07).",
  },
];

// Which override tier a requester acts under, by context.
export const CONTEXT_TIER: Record<string, OverrideTier> = {
  emergency: "Emergency",
  publicSafety: "Public Safety",
  civic: "Civic",
  booking: "Commercial",
  scheduling: "Commercial",
};
