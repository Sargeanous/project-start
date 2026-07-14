import { useEffect, useRef, useState } from "react";

/**
 * Native, code-rendered visuals for the DOOH platform.
 *
 * The platform prefers real demo visuals when they are available in
 * /public/demo-visuals, then falls back to generated SVG artwork. This keeps
 * the CMS library, marketplace previews, asset board and live views visually
 * credible while still allowing new mock creative IDs to render safely.
 */

function enc(svg: string): string {
  // encodeURIComponent leaves ( ) ' unescaped; those would break an unquoted
  // CSS url(...), so percent-encode them too.
  const encoded = encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim())
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/'/g, "%27");
  return `data:image/svg+xml,${encoded}`;
}

/* ------------------------------------------------------------------ *\
 * DOOH creatives - the artwork that actually plays on the screens.
 * Each entry is a self-contained bilingual billboard design.
\* ------------------------------------------------------------------ */

interface CreativeSpec {
  from: string;
  to: string;
  ink: string;
  accent: string;
  kicker: string;
  titleEn: string;
  titleAr: string;
  brand: string;
  motif: "shield" | "alert" | "calendar" | "palm" | "bag" | "tag" | "broadcast" | "doc";
}

function motifPath(motif: CreativeSpec["motif"], color: string): string {
  const c = color;
  switch (motif) {
    case "shield":
      return `<path d="M240 78 l46 18 v34 c0 32 -22 56 -46 66 c-24 -10 -46 -34 -46 -66 v-34 z" fill="none" stroke="${c}" stroke-width="6"/><path d="M222 132 l13 14 26 -30" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "alert":
      return `<path d="M240 80 l52 92 h-104 z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><rect x="236" y="120" width="8" height="30" rx="4" fill="${c}"/><circle cx="240" cy="160" r="5" fill="${c}"/>`;
    case "calendar":
      return `<rect x="196" y="86" width="88" height="80" rx="8" fill="none" stroke="${c}" stroke-width="6"/><path d="M196 110 h88" stroke="${c}" stroke-width="6"/><path d="M214 80 v14 M266 80 v14" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="240" cy="138" r="9" fill="${c}"/>`;
    case "palm":
      return `<path d="M240 168 c-4 -34 -2 -54 2 -74" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M242 96 c-20 -16 -42 -14 -58 -4 c20 -2 38 6 54 18 M242 96 c20 -16 42 -14 58 -4 c-20 -2 -38 6 -54 18 M242 96 c-8 -22 -28 -32 -48 -32 c14 10 24 26 44 46 M242 96 c8 -22 28 -32 48 -32 c-14 10 -24 26 -44 46" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    case "bag":
      return `<path d="M204 110 h72 l-6 60 h-60 z" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M222 110 c0 -18 36 -18 36 0" fill="none" stroke="${c}" stroke-width="6"/>`;
    case "tag":
      return `<path d="M198 96 h56 l40 40 -56 56 -40 -40 z" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><circle cx="224" cy="122" r="9" fill="${c}"/>`;
    case "broadcast":
      return `<circle cx="240" cy="138" r="12" fill="${c}"/><path d="M210 108 a42 42 0 0 0 0 60 M270 108 a42 42 0 0 1 0 60 M194 92 a64 64 0 0 0 0 92 M286 92 a64 64 0 0 1 0 92" fill="none" stroke="${c}" stroke-width="5"/>`;
    case "doc":
    default:
      return `<path d="M206 80 h52 l26 26 v76 h-78 z" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><path d="M258 80 v26 h26 M220 130 h40 M220 148 h40" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  }
}

export const creativeCatalog: Record<string, CreativeSpec> = {
  "road-safety": {
    from: "#063129", to: "#148455", ink: "#ffffff", accent: "#7ff0c0",
    kicker: "ABU DHABI POLICE | CIVIC", titleEn: "ARRIVE SAFELY", titleAr: "السلامة أولاً",
    brand: "DMT | ROAD SAFETY NETWORK", motif: "shield",
  },
  "weather-alert": {
    from: "#7a1a12", to: "#c0571a", ink: "#ffffff", accent: "#ffd98a",
    kicker: "NCEMA | EMERGENCY BROADCAST", titleEn: "WEATHER ALERT", titleAr: "تنبيه جوي",
    brand: "CAP-UAE | PROTECTED CACHE", motif: "alert",
  },
  "holiday-notice": {
    from: "#0b4d3c", to: "#0f8f86", ink: "#ffffff", accent: "#ffe6a3",
    kicker: "DMT COMMUNICATIONS | PUBLIC", titleEn: "EID HOLIDAY NOTICE", titleAr: "إجازة العيد المبارك",
    brand: "BILINGUAL | ARABIC-FIRST", motif: "calendar",
  },
  "yas-tourism": {
    from: "#0f6f86", to: "#e0913a", ink: "#ffffff", accent: "#ffe2b0",
    kicker: "YAS TOURISM | LEISURE", titleEn: "DISCOVER YAS ISLAND", titleAr: "اكتشف جزيرة ياس",
    brand: "TOURISM LIVE STREAM", motif: "palm",
  },
  "etihad-retail": {
    from: "#16263a", to: "#27485f", ink: "#ffffff", accent: "#d8b46a",
    kicker: "ETIHAD GUEST | AIRPORT RETAIL", titleEn: "DUTY-FREE REWARDS", titleAr: "عروض المطار الحصرية",
    brand: "AIRPORT → DOWNTOWN PREMIUM", motif: "bag",
  },
  "mall-footfall": {
    from: "#4a1d7a", to: "#a23bb0", ink: "#ffffff", accent: "#ffd1f2",
    kicker: "RETAIL MAJLIS | COMMERCIAL", titleEn: "DOWNTOWN SEASON SALE", titleAr: "تخفيضات وسط المدينة",
    brand: "DOWNTOWN COMMERCE LOOP", motif: "tag",
  },
  "live-slate": {
    from: "#101a26", to: "#1c3a4a", ink: "#ffffff", accent: "#7fd0ff",
    kicker: "MEDIA OPS | HLS STREAM", titleEn: "LIVE STREAM SLATE", titleAr: "شارة البث المباشر",
    brand: "YAS ISLAND | LIVE", motif: "broadcast",
  },
  "industrial-notice": {
    from: "#1d2a33", to: "#37606e", ink: "#ffffff", accent: "#9fe0d6",
    kicker: "MUSSAFAH | WAYFINDING", titleEn: "INDUSTRIAL SAFETY", titleAr: "سلامة المنطقة الصناعية",
    brand: "DMT | WAYFINDING NETWORK", motif: "shield",
  },
  "compliance-pack": {
    from: "#0b3a33", to: "#15605a", ink: "#ffffff", accent: "#aee9d6",
    kicker: "SECURITY PMO | GOVERNANCE", titleEn: "COMPLIANCE PACK", titleAr: "حزمة الامتثال",
    brand: "UAE IA v2.1 | EVIDENCE", motif: "doc",
  },
  "brand-guidelines": {
    from: "#15324a", to: "#2f6f9e", ink: "#ffffff", accent: "#bfe0ff",
    kicker: "BRAND STUDIO | REFERENCE", titleEn: "BRAND GUIDELINES", titleAr: "دليل الهوية البصرية",
    brand: "CREATIVE STANDARDS", motif: "doc",
  },
};

const demoCreativeBackgrounds: Record<string, string> = {
  "road-safety": "/demo-visuals/road-safety-incident.avif",
  "weather-alert": "/demo-visuals/road-safety-incident.avif",
  "holiday-notice": "/demo-visuals/eid-adha-mubarak.webp",
  "yas-tourism": "/demo-visuals/yas-island-rollercoaster.webp",
  "etihad-retail": "/demo-visuals/abu-dhabi-duty-free.png",
  "mall-footfall": "/demo-visuals/coca-cola-noor.png",
  "live-slate": "/demo-visuals/saadiyat-beach.webp",
  "industrial-notice": "/demo-visuals/experience-abu-dhabi.webp",
  "compliance-pack": "/demo-visuals/coca-cola-national-day.jpg",
  "brand-guidelines": "/demo-visuals/ramadan-kareem.jpg",
  "eid-family-retail": "/demo-visuals/eid-family-retail.jpg",
  "royal-safari": "/demo-visuals/royal-safari.jpg",
  "experience-abu-dhabi": "/demo-visuals/experience-abu-dhabi.webp",
  "ramadan-kareem": "/demo-visuals/ramadan-kareem.jpg",
  "coca-cola-national-day": "/demo-visuals/coca-cola-national-day.jpg",
  "saadiyat-beach": "/demo-visuals/saadiyat-beach.webp",
};

function creativeSvg(spec: CreativeSpec): string {
  const motif = motifPath(spec.motif, spec.accent);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 360' font-family='Segoe UI, Arial, sans-serif'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${spec.from}'/>
        <stop offset='1' stop-color='${spec.to}'/>
      </linearGradient>
    </defs>
    <rect width='480' height='360' fill='url(#bg)'/>
    <rect x='20' y='20' width='440' height='320' rx='14' fill='none' stroke='${spec.accent}' stroke-opacity='0.34' stroke-width='2'/>
    ${motif}
    <text x='240' y='214' fill='${spec.accent}' font-size='13' font-weight='700' letter-spacing='3' text-anchor='middle'>${spec.kicker}</text>
    <text x='240' y='252' fill='${spec.ink}' font-size='30' font-weight='800' letter-spacing='1' text-anchor='middle'>${spec.titleEn}</text>
    <text x='240' y='292' fill='${spec.ink}' font-size='26' font-weight='700' text-anchor='middle' direction='rtl'>${spec.titleAr}</text>
    <rect x='0' y='322' width='480' height='38' fill='rgba(0,0,0,0.28)'/>
    <text x='240' y='346' fill='${spec.accent}' font-size='12' font-weight='700' letter-spacing='2' text-anchor='middle'>${spec.brand}</text>
  </svg>`;
}

const creativeUriCache = new Map<string, string>();

// Rendered when a submission has no matching creative asset yet, so the
// detail view never shows an empty frame.
const placeholderCreativeSpec: CreativeSpec = {
  from: "#22333d", to: "#3d5a68", ink: "#ffffff", accent: "#a9d3cb",
  kicker: "ADMO CMS | AWAITING CREATIVE", titleEn: "PREVIEW PENDING", titleAr: "المعاينة قيد التجهيز",
  brand: "CREATIVE PACK NOT YET UPLOADED", motif: "doc",
};

export function creativeBackground(id: string): string {
  const demoVisual = demoCreativeBackgrounds[id];
  if (demoVisual) return demoVisual;
  const spec = creativeCatalog[id] ?? placeholderCreativeSpec;
  const cacheKey = creativeCatalog[id] ? id : "__placeholder__";
  let uri = creativeUriCache.get(cacheKey);
  if (!uri) {
    uri = enc(creativeSvg(spec));
    creativeUriCache.set(cacheKey, uri);
  }
  return uri;
}

/* ------------------------------------------------------------------ *\
 * Camera feeds - a CCTV view of a screen showing its current creative.
 * The scene gives physical context (highway, bridge, mall ...) and the
 * billboard panel shows a miniature of the live creative.
\* ------------------------------------------------------------------ */

type FeedScene = "highway" | "bridge" | "busStop" | "mall" | "gateway";

interface FeedSpec {
  scene: FeedScene;
  creative: string;
}

export const feedCatalog: Record<string, FeedSpec> = {
  "vf-1": { scene: "highway", creative: "road-safety" },
  "vf-2": { scene: "busStop", creative: "yas-tourism" },
  "vf-3": { scene: "bridge", creative: "industrial-notice" },
  "vf-4": { scene: "mall", creative: "mall-footfall" },
};

const demoFeedBackgrounds: Record<string, string> = {
  "vf-1": "/demo-visuals/road-safety-incident.avif",
  "vf-2": "/demo-visuals/yas-island-rollercoaster.webp",
  "vf-3": "/demo-visuals/experience-abu-dhabi.webp",
  "vf-4": "/demo-visuals/coca-cola-noor.png",
};

function sceneLayers(scene: FeedScene): { sky: [string, string]; ground: string; structures: string } {
  switch (scene) {
    case "highway":
      return {
        sky: ["#24445e", "#5d6f7a"], ground: "#2b3138",
        structures: `<path d="M0 232 L640 232 L640 360 L0 360 Z" fill="#22272d"/>
          <path d="M120 360 L300 232 L340 232 L210 360 Z" fill="#2c333a"/>
          <path d="M640 360 L420 232 L470 232 L640 320 Z" fill="#2c333a"/>
          <path d="M250 360 L320 244 L325 244 L300 360 Z" fill="#3a4751" opacity="0.7"/>
          <rect x="60" y="150" width="6" height="90" fill="#3a444d"/><rect x="574" y="150" width="6" height="90" fill="#3a444d"/>`,
      };
    case "bridge":
      return {
        sky: ["#2a3f54", "#6a6f70"], ground: "#30363d",
        structures: `<path d="M0 250 L640 250 L640 360 L0 360 Z" fill="#262b31"/>
          <path d="M0 250 C160 200 480 200 640 250" fill="none" stroke="#454f58" stroke-width="10"/>
          <path d="M90 250 L90 360 M250 250 L250 360 M400 250 L400 360 M560 250 L560 360" stroke="#3a434b" stroke-width="8"/>`,
      };
    case "busStop":
      return {
        sky: ["#143b46", "#c98a4a"], ground: "#2a2f33",
        structures: `<path d="M0 238 L640 238 L640 360 L0 360 Z" fill="#23282d"/>
          <rect x="380" y="150" width="210" height="92" rx="6" fill="#2d343b"/>
          <rect x="392" y="162" width="186" height="68" rx="4" fill="#384049"/>
          <circle cx="120" cy="120" r="40" fill="#e6a85a" opacity="0.5"/>`,
      };
    case "mall":
      return {
        sky: ["#241a36", "#3b2b52"], ground: "#241f2e",
        structures: `<path d="M0 244 L640 244 L640 360 L0 360 Z" fill="#1f1b2a"/>
          <rect x="40" y="150" width="120" height="94" fill="#2c2640"/><rect x="470" y="150" width="130" height="94" fill="#2c2640"/>
          <g fill="#5a4f7a" opacity="0.7"><rect x="56" y="166" width="20" height="20"/><rect x="86" y="166" width="20" height="20"/><rect x="116" y="166" width="20" height="20"/><rect x="486" y="166" width="20" height="20"/><rect x="516" y="166" width="20" height="20"/><rect x="546" y="166" width="20" height="20"/></g>`,
      };
    case "gateway":
    default:
      return {
        sky: ["#3a3326", "#8a6a3c"], ground: "#2c2a25",
        structures: `<path d="M0 250 L640 250 L640 360 L0 360 Z" fill="#26241f"/>
          <path d="M120 360 L260 250 L300 250 L200 360 Z" fill="#312d26"/>`,
      };
  }
}

function feedSvg(spec: FeedSpec): string {
  const layers = sceneLayers(spec.scene);
  const cr = creativeCatalog[spec.creative];
  const panel = cr
    ? `<defs><linearGradient id='cr' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${cr.from}'/><stop offset='1' stop-color='${cr.to}'/></linearGradient></defs>`
    : "";
  // Billboard panel showing the live creative, mounted on a pole.
  const board = cr
    ? `<rect x='222' y='150' width='12' height='96' fill='#1c2026'/>
       <rect x='414' y='150' width='12' height='96' fill='#1c2026'/>
       <rect x='196' y='66' width='256' height='104' rx='6' fill='#11151a'/>
       <rect x='204' y='74' width='240' height='88' rx='3' fill='url(#cr)'/>
       <text x='324' y='112' fill='${cr.accent}' font-size='10' font-weight='700' letter-spacing='2' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif'>${cr.kicker.split(" | ")[0]}</text>
       <text x='324' y='134' fill='#ffffff' font-size='17' font-weight='800' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif'>${cr.titleEn}</text>
       <text x='324' y='152' fill='#ffffff' font-size='13' font-weight='600' text-anchor='middle' direction='rtl' font-family='Segoe UI, Arial, sans-serif'>${cr.titleAr}</text>`
    : "";
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360' font-family='Segoe UI, Arial, sans-serif'>
    ${panel}
    <defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${layers.sky[0]}'/><stop offset='1' stop-color='${layers.sky[1]}'/></linearGradient>
      <radialGradient id='vig' cx='0.5' cy='0.5' r='0.75'><stop offset='0.55' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='0.45'/></radialGradient></defs>
    <rect width='640' height='360' fill='url(#sky)'/>
    ${layers.structures}
    ${board}
    <rect width='640' height='360' fill='url(#vig)'/>
    <g opacity='0.06'>${Array.from({ length: 60 }, (_, i) => `<rect y='${i * 6}' width='640' height='3' fill='#fff'/>`).join("")}</g>
    <path d='M16 16 h34 M16 16 v34 M624 16 h-34 M624 16 v34 M16 344 h34 M16 344 v-34 M624 344 h-34 M624 344 v-34' stroke='#e7f5ef' stroke-opacity='0.7' stroke-width='2' fill='none'/>
  </svg>`;
}

const feedUriCache = new Map<string, string>();

export function feedBackground(id: string): string {
  const demoVisual = demoFeedBackgrounds[id];
  if (demoVisual) return demoVisual;
  const spec = feedCatalog[id];
  if (!spec) return "";
  let uri = feedUriCache.get(id);
  if (!uri) {
    uri = enc(feedSvg(spec));
    feedUriCache.set(id, uri);
  }
  return uri;
}

/* ------------------------------------------------------------------ *\
 * Estate map - a stylised, interactive map of the Abu Dhabi estate.
 * Geography is drawn in SVG; screen pins are real, clickable buttons
 * positioned by each asset's coordinates and coloured by status.
\* ------------------------------------------------------------------ */

interface EstateAsset {
  id: string;
  name: string;
  zone: string;
  status: string;
  x: number;
  y: number;
}

interface EstateMapProps {
  assets: EstateAsset[];
  selectedAssetId: string;
  onSelect: (id: string) => void;
  mode: string;
  openAlarmAssetIds: string[];
  t: (value: string) => string;
}

const statusClass: Record<string, string> = {
  Live: "live",
  Warning: "warning",
  Maintenance: "maintenance",
  Offline: "offline",
};

const zoneLabels: Array<{ label: string; x: number; y: number }> = [
  { label: "Arabian Gulf", x: 24, y: 12 },
  { label: "Abu Dhabi City", x: 56, y: 44 },
  { label: "Yas Island", x: 81, y: 20 },
  { label: "Industrial Zone", x: 70, y: 68 },
  { label: "Al Ain", x: 28, y: 80 },
];

const DEPOT = { x: 46, y: 24 };

export function EstateMap({ assets, selectedAssetId, onSelect, mode, openAlarmAssetIds, t }: EstateMapProps) {
  return (
    <div className="estate-map" role="group" aria-label={t("Live GIS dispatch")}>
      <svg className="estate-map-base" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#cfe6ef" />
            <stop offset="1" stopColor="#bcdbe8" />
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef4ee" />
            <stop offset="1" stopColor="#e3ede4" />
          </linearGradient>
        </defs>
        {/* Water */}
        <rect x="0" y="0" width="100" height="70" fill="url(#water)" />
        {/* Mainland + island masses */}
        <path
          d="M0,70 L0,40 C12,36 22,42 34,40 C44,38 50,30 62,32 C72,33 78,40 88,40 L100,42 L100,70 Z"
          fill="url(#land)"
          stroke="#cdded3"
          strokeWidth="0.4"
        />
        <path
          d="M40,30 C50,22 60,20 70,22 C80,24 86,30 84,38 C72,40 58,40 48,38 C42,36 40,33 40,30 Z"
          fill="url(#land)"
          stroke="#cdded3"
          strokeWidth="0.4"
        />
        <path d="M74,14 C82,12 90,16 92,24 C86,28 78,26 74,22 C72,19 72,16 74,14 Z" fill="url(#land)" stroke="#cdded3" strokeWidth="0.4" />
        {/* Corniche + Sheikh Zayed corridors and a bridge link to Yas */}
        <path d="M6,46 C26,40 46,40 66,44 C76,46 84,48 96,48" fill="none" stroke="#9cc0d6" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M30,66 C40,52 52,42 64,34 C72,29 80,26 90,24" fill="none" stroke="#b7cdbf" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="0.1 2.4" />
        <path d="M72,32 C76,26 80,22 84,20" fill="none" stroke="#9cc0d6" strokeWidth="1.1" strokeLinecap="round" />
        {/* Subtle grid */}
        <g stroke="#0c4538" strokeOpacity="0.05" strokeWidth="0.2">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={(i + 1) * 7} x2="100" y2={(i + 1) * 7} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="70" />
          ))}
        </g>

        {/* Mode-specific overlays */}
        {mode === "Resource selection tools" &&
          assets.map((asset) => (
            <circle
              key={`reach-${asset.id}`}
              cx={asset.x}
              cy={asset.y}
              r="9"
              fill="rgba(20,132,85,0.08)"
              stroke="rgba(20,132,85,0.5)"
              strokeWidth="0.3"
              strokeDasharray="0.8 0.8"
            />
          ))}

        {mode === "Real-time surveillance" &&
          assets.map((asset) => (
            <path
              key={`fov-${asset.id}`}
              d={`M${asset.x},${asset.y} L${asset.x - 7},${asset.y - 11} A13,13 0 0 1 ${asset.x + 7},${asset.y - 11} Z`}
              fill="rgba(24,108,183,0.12)"
              stroke="rgba(24,108,183,0.45)"
              strokeWidth="0.3"
            />
          ))}

        {mode === "Dispatch interface" &&
          assets
            .filter((asset) => openAlarmAssetIds.includes(asset.id))
            .map((asset) => (
              <line
                key={`route-${asset.id}`}
                x1={DEPOT.x}
                y1={DEPOT.y}
                x2={asset.x}
                y2={asset.y}
                stroke="rgba(183,47,42,0.55)"
                strokeWidth="0.4"
                strokeDasharray="1.2 1.2"
              />
            ))}
        {mode === "Dispatch interface" && (
          <g>
            <circle cx={DEPOT.x} cy={DEPOT.y} r="1.4" fill="#186cb7" />
            <circle cx={DEPOT.x} cy={DEPOT.y} r="2.6" fill="none" stroke="#186cb7" strokeWidth="0.3" />
          </g>
        )}
      </svg>

      {zoneLabels.map((zone) => (
        <span className="estate-zone-label" key={zone.label} style={{ left: `${zone.x}%`, top: `${zone.y}%` }}>
          {t(zone.label)}
        </span>
      ))}

      {assets.map((asset) => {
        const tone = statusClass[asset.status] ?? "live";
        const isSelected = asset.id === selectedAssetId;
        const hasAlarm = openAlarmAssetIds.includes(asset.id);
        return (
          <button
            key={asset.id}
            type="button"
            className={`estate-pin ${tone} ${isSelected ? "selected" : ""}`}
            style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
            onClick={() => onSelect(asset.id)}
            aria-label={`${asset.name} - ${t(asset.status)}`}
            aria-pressed={isSelected}
            title={`${asset.id} | ${t(asset.zone)}`}
          >
            <span className="estate-pin-dot" />
            {hasAlarm && <span className="estate-pin-alarm" />}
            <span className="estate-pin-id">{asset.id}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *\
 * LiveMap - a real, satellite map (Leaflet + Google tiles) with one
 * pin per screen. Clicking a pin calls back so the parent can pop the
 * screen's live feed. Degrades to the stylised vector map if Leaflet
 * or the tile server is unavailable (e.g. offline).
\* ------------------------------------------------------------------ */

// Theme-aware basemap: the Origen design uses a near-black canvas map, so the
// dark theme gets CARTO dark_all and light gets light_all. The layer swaps in
// place when the user toggles the theme (data-theme on <html>).
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = "&copy; OpenStreetMap contributors &copy; CARTO";
const tileUrlForTheme = () =>
  typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? TILE_LIGHT : TILE_DARK;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addThemedTiles(L: any, map: any): () => void {
  const layer = L.tileLayer(tileUrlForTheme(), { subdomains: "abcd", maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
  const observer = new MutationObserver(() => layer.setUrl(tileUrlForTheme()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

// Origen status tones (Figma pin system): live green, degraded amber,
// fault alert-red, idle grey.
const statusColor: Record<string, string> = {
  Live: "#009b5d",
  Attention: "#f77e15",
  Warning: "#f77e15",
  Maintenance: "#f77e15",
  Offline: "#606060",
  Fault: "#e54d2e",
  // Commercial allocation statuses (FIN-601 map) - additive keys so the health map is unaffected.
  Allocated: "#5b9cf5",
  Available: "#009b5d",
  "In bidding": "#8b6ee0",
  "Under maintenance": "#f77e15",
  "Emergency override": "#e54d2e",
};

interface LiveMapAsset {
  id: string;
  name: string;
  zone: string;
  status: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export type PinKind = "campaign" | "asset" | "alert";

interface LiveMapProps {
  assets: LiveMapAsset[];
  selectedAssetId: string;
  onMarkerClick: (id: string) => void;
  openAlarmAssetIds: string[];
  t: (value: string) => string;
  /* Origen canvas mode: full-bleed map with hexagonal status pins. */
  variant?: "panel" | "canvas";
  pinKindFor?: (assetId: string) => PinKind;
  /* Multi-select: Ctrl/Cmd-click toggles a pin; marquee-drag (in select
     mode) rubber-bands a rectangle. The parent owns the selection set. */
  multiSelectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  marqueeMode?: boolean;
  onMarquee?: (ids: string[], additive: boolean) => void;
}

// Origen hexagonal pin (Figma components frame): hexagon fill = status tone,
// glyph = what the screen is doing (campaign / asset / alert), chevron tail.
const HEX_GLYPHS: Record<PinKind, string> = {
  campaign:
    '<circle cx="9" cy="9" r="6.4" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M2.8 9h12.4M9 2.6c2.3 1.8 2.3 11 0 12.8M9 2.6c-2.3 1.8-2.3 11 0 12.8" fill="none" stroke="#fff" stroke-width="1.1"/><text x="9" y="11.8" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff">$</text>',
  asset:
    '<rect x="3" y="4" width="12" height="7" rx="1.2" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M9 11v4M6.5 15h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
  alert:
    '<path d="M9 3.2a4.2 4.2 0 0 1 4.2 4.2c0 2.9 1 3.7 1.5 4.2H3.3c.5-.5 1.5-1.3 1.5-4.2A4.2 4.2 0 0 1 9 3.2Z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.6 14.4a1.5 1.5 0 0 0 2.8 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
};

function hexPinHtml(asset: LiveMapAsset, selected: boolean, kind: PinKind, multi = false): string {
  const color = statusColor[asset.status] ?? "#009b5d";
  return `<div class="hex-pin ${selected ? "selected" : ""} ${multi ? "multi-selected" : ""}" style="--pin:${color}">
    <svg viewBox="0 0 36 46" width="36" height="46" aria-hidden="true">
      <path d="M18 1.5 L33.5 10 V27 L18 35.5 L2.5 27 V10 Z" fill="var(--pin)" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>
      <path d="M14 36 L18 42 L22 36 Z" fill="var(--pin)"/>
      <g transform="translate(9,9.4)">${HEX_GLYPHS[kind]}</g>
    </svg>
    ${multi ? '<span class="hex-pin-check" aria-hidden="true">✓</span>' : ""}
  </div>`;
}

function pinHtml(asset: LiveMapAsset, selected: boolean): string {
  const color = statusColor[asset.status] ?? "#1f9d57";
  return `<div class="map-pin ${selected ? "selected" : ""}" style="--pin:${color}">
    <span class="map-pin-stem"></span>
    <span class="map-pin-body"></span>
    <span class="map-pin-label">${asset.id}</span>
  </div>`;
}

export function LiveMap({ assets, selectedAssetId, onMarkerClick, openAlarmAssetIds, t, variant = "panel", pinKindFor, multiSelectedIds, onToggleSelect, marqueeMode, onMarquee }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Record<string, unknown>>({});
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;
  const disposeTilesRef = useRef<(() => void) | null>(null);
  const alarmsRef = useRef(openAlarmAssetIds);
  alarmsRef.current = openAlarmAssetIds;
  const kindRef = useRef(pinKindFor);
  kindRef.current = pinKindFor;
  const multiRef = useRef(multiSelectedIds);
  multiRef.current = multiSelectedIds;
  const toggleRef = useRef(onToggleSelect);
  toggleRef.current = onToggleSelect;
  const marqueeModeRef = useRef(marqueeMode);
  marqueeModeRef.current = marqueeMode;
  const marqueeCbRef = useRef(onMarquee);
  marqueeCbRef.current = onMarquee;
  const [failed, setFailed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function iconFor(L: any, asset: LiveMapAsset, selected: boolean) {
    const multi = !!multiRef.current?.includes(asset.id);
    if (variant === "canvas") {
      const alarmed = alarmsRef.current.includes(asset.id);
      const kind: PinKind = kindRef.current?.(asset.id) ?? (alarmed ? "alert" : "asset");
      const drawn = alarmed && asset.status !== "Offline" ? { ...asset, status: "Fault" } : asset;
      return L.divIcon({ className: "hex-pin-icon", html: hexPinHtml(drawn, selected, kind, multi), iconSize: [36, 46], iconAnchor: [18, 44] });
    }
    return L.divIcon({ className: "map-pin-icon", html: pinHtml(asset, selected), iconSize: [30, 38], iconAnchor: [15, 38] });
  }

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    const init = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !containerRef.current) {
        if (tries++ < 25) {
          setTimeout(init, 150);
        } else {
          setFailed(true);
        }
        return;
      }
      try {
        map = L.map(containerRef.current, { zoomControl: variant !== "canvas", attributionControl: true, scrollWheelZoom: false }).setView([24.45, 54.42], 10);
        if (variant === "canvas") L.control.zoom({ position: "topright" }).addTo(map);
        disposeTilesRef.current = addThemedTiles(L, map);
        mapRef.current = map;
        markersRef.current = {};
        assets.forEach((asset) => {
          const icon = iconFor(L, asset, asset.id === selectedAssetId);
          const marker = L.marker([asset.lat, asset.lng], { icon, title: asset.name }).addTo(map);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          marker.on("click", (ev: any) => {
            const oe = ev?.originalEvent;
            if ((oe?.ctrlKey || oe?.metaKey) && toggleRef.current) {
              oe.preventDefault();
              toggleRef.current(asset.id);
            } else {
              clickRef.current(asset.id);
            }
          });
          markersRef.current[asset.id] = marker;
        });
        if (variant === "canvas") {
          // City-level default view (Figma): fit the dense cluster and let far
          // outliers (e.g. Al Ain) stay off-canvas until panned or filtered.
          const meanLat = assets.reduce((sum, a) => sum + a.lat, 0) / assets.length;
          const meanLng = assets.reduce((sum, a) => sum + a.lng, 0) / assets.length;
          const cluster = assets.filter((a) => Math.abs(a.lat - meanLat) < 0.6 && Math.abs(a.lng - meanLng) < 0.6);
          const fitTo = cluster.length >= 3 ? cluster : assets;
          const bounds = L.latLngBounds(fitTo.map((asset) => [asset.lat, asset.lng]));
          // Leave headroom for the KPI strip (top) and asset filmstrip (bottom).
          map.fitBounds(bounds, { paddingTopLeft: [90, 160], paddingBottomRight: [90, 300], maxZoom: 13 });
        } else {
          const bounds = L.latLngBounds(assets.map((asset) => [asset.lat, asset.lng]));
          map.fitBounds(bounds, { padding: [44, 44], maxZoom: 12 });
        }
        setTimeout(() => map && map.invalidateSize(), 220);
      } catch {
        setFailed(true);
      }
    };
    init();
    return () => {
      cancelled = true;
      disposeTilesRef.current?.();
      disposeTilesRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // Recreate markers when the parent filters the asset list by zone.
  }, [assets]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current as { panTo: (c: [number, number]) => void } | null;
    if (!L || !map) return;
    assets.forEach((asset) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = markersRef.current[asset.id] as any;
      if (marker) marker.setIcon(iconFor(L, asset, asset.id === selectedAssetId));
    });
    const selected = assets.find((asset) => asset.id === selectedAssetId);
    if (selected) map.panTo([selected.lat, selected.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetId]);

  // Repaint pins when the multi-selection set changes.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    assets.forEach((asset) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = markersRef.current[asset.id] as any;
      if (marker) marker.setIcon(iconFor(L, asset, asset.id === selectedAssetId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiSelectedIds]);

  // Marquee rubber-band selection (PPT-style). Active only in marquee mode.
  useEffect(() => {
    const container = containerRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!container || !map || !marqueeMode) return;
    if (map.dragging) map.dragging.disable();
    if (map.boxZoom) map.boxZoom.disable();
    container.classList.add("marquee-active");

    let startX = 0, startY = 0, rect: HTMLDivElement | null = null, dragging = false;
    const rel = (e: MouseEvent) => { const b = container.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      const p = rel(e); startX = p.x; startY = p.y;
      rect = document.createElement("div");
      rect.className = "map-marquee-rect";
      rect.style.left = `${startX}px`; rect.style.top = `${startY}px`;
      container.appendChild(rect);
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging || !rect) return;
      const p = rel(e);
      rect.style.left = `${Math.min(startX, p.x)}px`;
      rect.style.top = `${Math.min(startY, p.y)}px`;
      rect.style.width = `${Math.abs(p.x - startX)}px`;
      rect.style.height = `${Math.abs(p.y - startY)}px`;
    };
    const onUp = (e: MouseEvent) => {
      if (!dragging) return;
      dragging = false;
      const p = rel(e);
      const x1 = Math.min(startX, p.x), x2 = Math.max(startX, p.x);
      const y1 = Math.min(startY, p.y), y2 = Math.max(startY, p.y);
      if (rect) { rect.remove(); rect = null; }
      // A tiny drag is a click, not a marquee — ignore it.
      if (Math.abs(x2 - x1) < 6 && Math.abs(y2 - y1) < 6) return;
      const ids: string[] = [];
      assets.forEach((asset) => {
        const pt = map.latLngToContainerPoint([asset.lat, asset.lng]);
        if (pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2) ids.push(asset.id);
      });
      marqueeCbRef.current?.(ids, e.shiftKey);
    };

    container.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      container.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      container.classList.remove("marquee-active");
      if (rect) rect.remove();
      if (map.dragging) map.dragging.enable();
      if (map.boxZoom) map.boxZoom.enable();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marqueeMode, assets]);

  if (failed) {
    return (
      <div className="live-map-fallback">
        <p>{t("Live map tiles are unavailable offline - showing the schematic estate view.")}</p>
        <EstateMap
          assets={assets}
          selectedAssetId={selectedAssetId}
          onSelect={onMarkerClick}
          mode="Dispatch interface"
          openAlarmAssetIds={openAlarmAssetIds}
          t={t}
        />
      </div>
    );
  }

  return <div className={`live-map ${variant === "canvas" ? "canvas" : ""}`} ref={containerRef} role="application" aria-label={t("Live estate map")} />;
}

/* ------------------------------------------------------------------ *\
   Radius targeting map: drop a centre, draw a radius ring, and colour
   the screens inside it (clear vs rules-flagged). Click sets the centre.
\* ------------------------------------------------------------------ */

interface RadiusMapAsset { id: string; name: string; status: string; lat: number; lng: number; }
interface RadiusMapProps {
  assets: RadiusMapAsset[];
  center: { lat: number; lng: number };
  radiusM: number;
  insideIds: string[];
  flaggedIds: string[];
  onPick: (lat: number, lng: number) => void;
  t: (value: string) => string;
}

export function RadiusMap({ assets, center, radiusM, insideIds, flaggedIds, onPick, t }: RadiusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const centerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const stateRef = useRef({ center, radiusM, insideIds, flaggedIds });
  stateRef.current = { center, radiusM, insideIds, flaggedIds };
  const disposeTilesRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function dotIcon(L: any, kind: "grey" | "clear" | "flag") {
    const color = kind === "flag" ? "#c0392b" : kind === "clear" ? "#1f9d57" : "#8a94a6";
    const size = kind === "grey" ? 13 : 18;
    return L.divIcon({ className: "radius-dot-icon", html: `<span class="radius-dot ${kind}" style="--d:${color}"></span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function paint(L: any) {
    const map = mapRef.current;
    if (!map) return;
    const s = stateRef.current;
    if (circleRef.current) circleRef.current.setLatLng([s.center.lat, s.center.lng]).setRadius(s.radiusM);
    else circleRef.current = L.circle([s.center.lat, s.center.lng], { radius: s.radiusM, color: "#1f4a3d", weight: 2, fillColor: "#1f6f52", fillOpacity: 0.12 }).addTo(map);
    if (centerRef.current) centerRef.current.setLatLng([s.center.lat, s.center.lng]);
    else centerRef.current = L.marker([s.center.lat, s.center.lng], { icon: L.divIcon({ className: "radius-center-icon", html: `<span class="radius-center"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
    assets.forEach((a) => {
      const m = markersRef.current[a.id];
      if (!m) return;
      const kind = s.flaggedIds.includes(a.id) ? "flag" : s.insideIds.includes(a.id) ? "clear" : "grey";
      m.setIcon(dotIcon(L, kind));
    });
  }

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    const init = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !containerRef.current) {
        if (tries++ < 25) setTimeout(init, 150); else setFailed(true);
        return;
      }
      try {
        map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([center.lat, center.lng], 11);
        disposeTilesRef.current = addThemedTiles(L, map);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => pickRef.current(e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
        markersRef.current = {};
        assets.forEach((a) => {
          const marker = L.marker([a.lat, a.lng], { icon: dotIcon(L, "grey"), title: a.name }).addTo(map);
          markersRef.current[a.id] = marker;
        });
        setTimeout(() => map && map.invalidateSize(), 220);
        paint(L);
      } catch {
        setFailed(true);
      }
    };
    init();
    return () => {
      cancelled = true;
      disposeTilesRef.current?.();
      disposeTilesRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
      circleRef.current = null;
      centerRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (L) paint(L);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, radiusM, insideIds, flaggedIds]);

  if (failed) return <div className="live-map-fallback"><p>{t("Live map tiles are unavailable offline.")}</p></div>;
  return <div className="radius-map" ref={containerRef} role="application" aria-label={t("Radius targeting map")} />;
}

/* ------------------------------------------------------------------ *\
   Construction map: under-construction assets rendered as progress
   pins (ring encodes % complete, colour encodes delay risk). Click a
   pin to open the build dossier popup (owned by the parent page).
\* ------------------------------------------------------------------ */

export interface ConstructionMapAsset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  progress: number; // 0-100
  level: "Low" | "Medium" | "High";
}

interface ConstructionMapProps {
  assets: ConstructionMapAsset[];
  selectedId: string;
  onSelect: (id: string) => void;
  t: (value: string) => string;
}

const RISK_COLOR: Record<ConstructionMapAsset["level"], string> = {
  Low: "#46a758",
  Medium: "#f77e15",
  High: "#e54d2e",
};

function buildPinHtml(asset: ConstructionMapAsset, selected: boolean): string {
  const color = RISK_COLOR[asset.level];
  const circumference = 2 * Math.PI * 11;
  const dash = Math.max(0, Math.min(100, asset.progress)) / 100 * circumference;
  return `<div class="cx-pin ${selected ? "selected" : ""}" style="--c:${color}">
    <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
      <circle cx="15" cy="15" r="11" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3.4"/>
      <circle cx="15" cy="15" r="11" fill="none" stroke="var(--c)" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 15 15)"/>
    </svg>
    <span class="cx-pin-pct">${asset.progress}</span>
  </div>`;
}

export function ConstructionMap({ assets, selectedId, onSelect, t }: ConstructionMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  const disposeTilesRef = useRef<(() => void) | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [failed, setFailed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function iconFor(L: any, asset: ConstructionMapAsset, selected: boolean) {
    return L.divIcon({ className: "cx-pin-icon", html: buildPinHtml(asset, selected), iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    const init = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !containerRef.current) {
        if (tries++ < 25) setTimeout(init, 150); else setFailed(true);
        return;
      }
      try {
        map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([24.45, 54.45], 10);
        disposeTilesRef.current = addThemedTiles(L, map);
        mapRef.current = map;
        markersRef.current = {};
        assets.forEach((asset) => {
          const marker = L.marker([asset.lat, asset.lng], { icon: iconFor(L, asset, asset.id === selectedId), title: asset.name }).addTo(map);
          marker.on("click", () => selectRef.current(asset.id));
          markersRef.current[asset.id] = marker;
        });
        if (assets.length) {
          const bounds = L.latLngBounds(assets.map((a) => [a.lat, a.lng]));
          map.fitBounds(bounds, { padding: [70, 70], maxZoom: 12 });
        }
        setTimeout(() => map && map.invalidateSize(), 220);
      } catch {
        setFailed(true);
      }
    };
    init();
    return () => {
      cancelled = true;
      disposeTilesRef.current?.();
      disposeTilesRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current as { panTo: (c: [number, number]) => void } | null;
    if (!L || !map) return;
    assets.forEach((asset) => {
      const marker = markersRef.current[asset.id];
      if (marker) marker.setIcon(iconFor(L, asset, asset.id === selectedId));
    });
    const sel = assets.find((a) => a.id === selectedId);
    if (sel) map.panTo([sel.lat, sel.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (failed) return <div className="live-map-fallback"><p>{t("Live map tiles are unavailable offline.")}</p></div>;
  return <div className="cx-map" ref={containerRef} role="application" aria-label={t("Construction site map")} />;
}

/* ------------------------------------------------------------------ *\
   Planning zone map: demand zones drawn as opportunity-scored polygons.
   Hover raises a zone and reports it up (parent shows the intel card);
   click selects the zone for the detail panel.
\* ------------------------------------------------------------------ */

export interface PlanningZoneShape {
  id: string;
  name: string;
  score: number; // 0-100 opportunity score
  center: { lat: number; lng: number };
  polygon: Array<{ lat: number; lng: number }>;
}

interface PlanningZoneMapProps {
  zones: PlanningZoneShape[];
  selectedId: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /* Live probe: in probe mode a map click drops a pin the parent turns into
     an ad-hoc zone profile (digital-twin ready). */
  probeMode?: boolean;
  probePoint?: { lat: number; lng: number } | null;
  onProbe?: (lat: number, lng: number) => void;
  t: (value: string) => string;
}

function zoneColor(score: number): string {
  if (score >= 68) return "#12b76a";
  if (score >= 56) return "#7cb342";
  if (score >= 44) return "#f2a413";
  return "#8a94a6";
}

export function PlanningZoneMap({ zones, selectedId, onSelect, onHover, probeMode, probePoint, onProbe, t }: PlanningZoneMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapesRef = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelsRef = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const probeRef = useRef<any>(null);
  const disposeTilesRef = useRef<(() => void) | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const hoverRef = useRef(onHover);
  hoverRef.current = onHover;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const probeModeRef = useRef(probeMode);
  probeModeRef.current = probeMode;
  const onProbeRef = useRef(onProbe);
  onProbeRef.current = onProbe;
  const [failed, setFailed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function styleFor(zone: PlanningZoneShape, active: boolean) {
    const color = zoneColor(zone.score);
    return { color, weight: active ? 2.6 : 1.4, opacity: active ? 0.95 : 0.6, fillColor: color, fillOpacity: active ? 0.34 : 0.16 };
  }

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    const init = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !containerRef.current) {
        if (tries++ < 25) setTimeout(init, 150); else setFailed(true);
        return;
      }
      try {
        map = L.map(containerRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([24.47, 54.45], 10);
        disposeTilesRef.current = addThemedTiles(L, map);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => { if (probeModeRef.current && onProbeRef.current) onProbeRef.current(e.latlng.lat, e.latlng.lng); });
        mapRef.current = map;
        shapesRef.current = {};
        labelsRef.current = {};
        const allPoints: Array<[number, number]> = [];
        zones.forEach((zone) => {
          const latlngs = zone.polygon.map((p) => [p.lat, p.lng] as [number, number]);
          latlngs.forEach((pt) => allPoints.push(pt));
          const active = zone.id === selectedRef.current;
          const poly = L.polygon(latlngs, styleFor(zone, active)).addTo(map);
          poly.on("mouseover", () => {
            poly.setStyle({ weight: 2.6, fillOpacity: 0.34, opacity: 0.95 });
            hoverRef.current(zone.id);
          });
          poly.on("mouseout", () => {
            if (zone.id !== selectedRef.current) poly.setStyle(styleFor(zone, false));
            hoverRef.current(null);
          });
          poly.on("click", () => selectRef.current(zone.id));
          shapesRef.current[zone.id] = poly;
          const label = L.marker([zone.center.lat, zone.center.lng], {
            interactive: false,
            icon: L.divIcon({
              className: "pz-label-icon",
              html: `<span class="pz-label"><b>${zone.name}</b><i>${zone.score}</i></span>`,
              iconSize: [140, 26],
              iconAnchor: [70, 13],
            }),
          }).addTo(map);
          labelsRef.current[zone.id] = label;
        });
        if (allPoints.length) {
          map.fitBounds(L.latLngBounds(allPoints), { padding: [46, 46], maxZoom: 12 });
        }
        setTimeout(() => map && map.invalidateSize(), 220);
      } catch {
        setFailed(true);
      }
    };
    init();
    return () => {
      cancelled = true;
      disposeTilesRef.current?.();
      disposeTilesRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
      shapesRef.current = {};
      labelsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  useEffect(() => {
    if (!mapRef.current) return;
    zones.forEach((zone) => {
      const poly = shapesRef.current[zone.id];
      if (poly) poly.setStyle(styleFor(zone, zone.id === selectedId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Drop / move / clear the live-probe pin.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (probePoint) {
      if (probeRef.current) {
        probeRef.current.setLatLng([probePoint.lat, probePoint.lng]);
      } else {
        probeRef.current = L.marker([probePoint.lat, probePoint.lng], {
          interactive: false,
          icon: L.divIcon({ className: "pz-probe-icon", html: `<span class="pz-probe"></span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        }).addTo(map);
      }
      map.panTo([probePoint.lat, probePoint.lng]);
    } else if (probeRef.current) {
      map.removeLayer(probeRef.current);
      probeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probePoint]);

  // Crosshair cursor while pinning.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.classList.toggle("probe-mode", !!probeMode);
  }, [probeMode]);

  if (failed) return <div className="live-map-fallback"><p>{t("Live map tiles are unavailable offline.")}</p></div>;
  return <div className="pz-map" ref={containerRef} role="application" aria-label={t("Planning zone map")} />;
}
