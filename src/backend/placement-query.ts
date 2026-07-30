import {
  digitalPlacementFormats,
  placementZonePolicies,
  roadSpeedBand,
  type PlacementFormatSpec,
  type PlacementZoneClass,
} from "../placement-strategy";

export type GovernedPlacementAnswer = {
  answer: string;
  table: string[][];
  suggestedActions: string[];
  summary: string;
};

const FORMAT_MATCHERS: Array<{ id: string; pattern: RegExp }> = [
  {
    id: "digital-bus-shelter",
    pattern: /\bbus shelter\b|\btransit shelter\b|مأوى الحافلات|محطة حافلات/,
  },
  {
    id: "digital-medium-vertical",
    pattern: /\bmedium vertical\b|\bmedium portrait\b|شاشة رأسية متوسطة|لوحة رأسية متوسطة/,
  },
  {
    id: "digital-medium-horizontal",
    pattern: /\bmedium horizontal\b|\bmedium landscape\b|شاشة أفقية متوسطة|لوحة أفقية متوسطة/,
  },
  {
    id: "digital-bridge-banner",
    pattern: /\bbridge banner\b|\bbridge display\b|لافتة جسر|لوحة جسر/,
  },
  {
    id: "digital-large-billboard",
    pattern: /\blarge billboard\b|\blarge format\b|\bbillboard\b|لوحة إعلانية كبيرة|لوحة كبيرة/,
  },
  {
    id: "digital-small-vertical",
    pattern: /\bsmall vertical\b|\bsmall portrait\b|شاشة رأسية صغيرة|لوحة رأسية صغيرة/,
  },
];

function formatFromQuestion(normalized: string) {
  const match = FORMAT_MATCHERS.find((candidate) => candidate.pattern.test(normalized));
  return match ? digitalPlacementFormats.find((format) => format.id === match.id) : undefined;
}

function speedFromQuestion(normalized: string) {
  const match = normalized.match(
    /(?:\b|^)(40|60|80|100|120|140|160)\s*(?:km\s*\/?\s*h|kmh|kph|كم\s*\/?\s*س)/,
  );
  return match ? Number(match[1]) : undefined;
}

function zoneFromQuestion(normalized: string) {
  const match = normalized.match(/\bzone\s*([0-3])\b|(?:المنطقة|منطقة)\s*([0-3])/);
  return match ? (Number(match[1] ?? match[2]) as PlacementZoneClass) : undefined;
}

function isPlacementQuestion(normalized: string) {
  return (
    /\b(place|placement|site|billboard|screen format|road speed|clearance|buffer|density|zone [0-3]|asset format)\b/.test(
      normalized,
    ) ||
    /تمركز|موضع|موقع|لوحة إعلانية|نوع الأصل|صيغة الأصل|سرعة الطريق|مسافة الفصل|الكثافة|منطقة [0-3]|المنطقة [0-3]/.test(
      normalized,
    )
  );
}

function dimensionLabel(format: PlacementFormatSpec) {
  if (format.maxWidthM && format.maxHeightM) return `${format.maxWidthM} x ${format.maxHeightM} m`;
  if (format.maxHeightM) return `Maximum height ${format.maxHeightM} m`;
  return "Site dependent";
}

function allowedBands(format: PlacementFormatSpec) {
  return Object.entries(format.allowedSpeedBands)
    .map(([band, clearance]) => `${band} km/h | ${clearance} m`)
    .join(", ");
}

export function answerPlacementQuestion(
  query: string,
  locale = "en",
): GovernedPlacementAnswer | null {
  const normalized = query.toLowerCase();
  if (!isPlacementQuestion(normalized)) return null;

  const format = formatFromQuestion(normalized);
  const speed = speedFromQuestion(normalized);
  const zone = zoneFromQuestion(normalized);
  const isArabic = locale.toLowerCase().startsWith("ar");

  if (format && speed) {
    const speedBand = roadSpeedBand(speed);
    const clearance = format.allowedSpeedBands[speedBand];
    const zonePolicy =
      zone === undefined ? undefined : placementZonePolicies.find((policy) => policy.zone === zone);
    const zoneCapacity = zonePolicy?.densityPerKm[format.size];
    const zoneAllowed = zoneCapacity === undefined ? true : zoneCapacity > 0;
    const permitted = clearance !== undefined && zoneAllowed;
    const formatName = isArabic ? format.name.ar : format.name.en;
    const zoneEvidence = zonePolicy
      ? isArabic
        ? `${zonePolicy.name.ar} | ${zoneCapacity} من فئة ${format.size === "Small" ? "الصغيرة" : format.size === "Medium" ? "المتوسطة" : "الكبيرة"} لكل كم`
        : `${zonePolicy.name.en} | ${zoneCapacity} ${format.size.toLowerCase()} asset${zoneCapacity === 1 ? "" : "s"} per km`
      : isArabic
        ? "تحقق من منطقة ADMO المحددة"
        : "Validate the selected ADMO zone";

    if (isArabic) {
      return {
        answer: permitted
          ? `${formatName} مؤهل مبدئياً على طريق بسرعة ${speed} كم/س وفق مصفوفة التمركز. يلزم بعد ذلك التحقق من مسافة الفصل ${clearance} م، وكثافة المنطقة، والأبعاد، ثم الحصول على موافقة مستخدم مخول.`
          : `${formatName} غير مسموح به على طريق بسرعة ${speed} كم/س وفق مصفوفة التمركز لدى مكتب أبوظبي الإعلامي. الخلايا الفارغة في المصفوفة تعامل كتركيبات محظورة ولا يجوز للذكاء الاصطناعي تجاوزها.`,
        table: [
          ["الفحص", "النتيجة", "المرجع"],
          [
            "صيغة الأصل وسرعة الطريق",
            permitted ? "مؤهل مبدئياً" : "غير مسموح",
            "استراتيجية التمركز | ص.3",
          ],
          [
            "الأبعاد القصوى",
            dimensionLabel(format)
              .replace("Maximum height", "أقصى ارتفاع")
              .replace("Site dependent", "حسب الموقع")
              .replace(/ m\b/g, " م"),
            `استراتيجية التمركز | ص.${format.sourcePage}`,
          ],
          [
            "مسافة الفصل الخطية",
            clearance ? `${clearance} م` : "غير مطبق لأن الصيغة محظورة",
            "استراتيجية التمركز | ص.4",
          ],
          ["كثافة المنطقة", zoneEvidence, "استراتيجية التمركز | ص.9"],
        ],
        suggestedActions: permitted
          ? ["فتح التخطيط", "التحقق من الموقع المرشح", "الإرسال للموافقة المسماة"]
          : ["فتح التخطيط", "اختبار صيغة متوافقة", "عرض قواعد التمركز"],
        summary: permitted
          ? `${formatName} eligible at ${speed} km/h`
          : `${formatName} blocked at ${speed} km/h`,
      };
    }

    return {
      answer: permitted
        ? `${formatName} is eligible at matrix level on a ${speed} km/h road. The site must still pass the ${clearance} m linear buffer, diameter density, zone capacity, dimension and mounting checks before named approval.`
        : `${formatName} is not permitted on a ${speed} km/h road under the ADMO placement matrix. Empty matrix cells are prohibited combinations and MediaGPT cannot override them.`,
      table: [
        ["Check", "Result", "ADMO source"],
        [
          "Format and road speed",
          permitted ? "Eligible at matrix level" : "Not permitted",
          "Placement Strategy | p.3",
        ],
        [
          "Maximum dimensions",
          dimensionLabel(format),
          `Placement Strategy | p.${format.sourcePage}`,
        ],
        [
          "Linear clearance",
          clearance ? `${clearance} m` : "Not applicable | format prohibited",
          "Placement Strategy | p.4",
        ],
        ["Zone capacity", zoneEvidence, "Placement Strategy | p.9"],
      ],
      suggestedActions: permitted
        ? ["Open Planning", "Validate candidate site", "Submit for named approval"]
        : ["Open Planning", "Test compliant alternative", "View placement rules"],
      summary: permitted
        ? `${formatName} eligible at ${speed} km/h`
        : `${formatName} blocked at ${speed} km/h`,
    };
  }

  if (isArabic) {
    return {
      answer:
        "تتحقق مساحة التخطيط من أهلية المنطقة، ومصفوفة سرعة الطريق والصيغة، والأبعاد، ومسافات الفصل، وكثافة التقاطعات، وعدد الأصول لكل كيلومتر. الخلايا الفارغة في مصفوفة العميل محظورة. يقترح MediaGPT البدائل، بينما تبقى الموافقة النهائية لمستخدم مخول.",
      table: [
        ["الصيغة الرقمية", "نطاقات السرعة المسموحة | مسافة الفصل"],
        ...digitalPlacementFormats.map((item) => [item.name.en, allowedBands(item)]),
      ],
      suggestedActions: ["فتح التخطيط", "التحقق من موقع مرشح", "مقارنة النماذج ثلاثية الأبعاد"],
      summary: "ADMO placement matrix explained",
    };
  }

  return {
    answer:
      "Planning validates ADMO zone eligibility, the road-speed format matrix, dimension envelopes, linear buffers, intersection density and assets per kilometre. Empty cells in the client matrix are prohibited. MediaGPT can explain and rank alternatives, but a named user approves the site.",
    table: [
      ["Digital format", "Permitted speed bands | linear clearance"],
      ...digitalPlacementFormats.map((item) => [item.name.en, allowedBands(item)]),
    ],
    suggestedActions: ["Open Planning", "Validate candidate site", "Compare format twins"],
    summary: "ADMO placement matrix explained",
  };
}
