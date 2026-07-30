import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  ClipboardCheck,
  Expand,
  Eye,
  FileCheck2,
  Gauge,
  Layers3,
  Map,
  MapPin,
  Move,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ClientOnlyPlacementFormatTwin } from "./ClientOnlyPlacementFormatTwin";
import { PlacementComplianceMap } from "./PlacementComplianceMap";
import {
  PLACEMENT_STRATEGY_SOURCE,
  assetPlacementProfiles,
  digitalPlacementFormats,
  evaluateExistingPlacement,
  evaluatePlacement,
  placementCandidates,
  placementCarriagewayLabels,
  placementFormat,
  placementRoadClassLabels,
  placementZonePolicies,
  portfolioMix,
  readPlacementIntakes,
  regulatoryZoneShapes,
  savePlacementIntake,
  subscribePlacementIntakes,
  type PlacementCandidate,
  type PlacementCheckState,
  type PlacementEvaluation,
  type PlacementFormatSpec,
  type PlacementIntake,
  type PlacementSize,
  type PlacementZoneClass,
} from "./placement-strategy";
import { assets } from "./data";
import { createTicket } from "./tickets-data";

type PlanningTab = "map" | "validation" | "portfolio";

type PlacementPlanningPageProps = {
  t: (value: string) => string;
  isArabic: boolean;
};

const ZONE_COLORS: Record<PlacementZoneClass, string> = {
  0: "#d94a43",
  1: "#7f9f76",
  2: "#c98e27",
  3: "#16875b",
};

const FORMAT_DEFAULTS: Record<
  string,
  { widthM: number; heightM: number; clearance?: number; speed: number }
> = {
  "digital-small-vertical": { widthM: 1.5, heightM: 2.6, speed: 40 },
  "digital-bus-shelter": { widthM: 1.5, heightM: 2.6, speed: 40 },
  "digital-medium-vertical": { widthM: 4, heightM: 7, speed: 60 },
  "digital-medium-horizontal": { widthM: 6, heightM: 3.4, clearance: 4, speed: 60 },
  "digital-bridge-banner": { widthM: 11, heightM: 3, speed: 100 },
  "digital-large-billboard": { widthM: 16, heightM: 8, clearance: 9, speed: 120 },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function verdictTone(verdict: PlacementEvaluation["verdict"]) {
  if (verdict === "Compliant") return "good";
  if (verdict === "Review required") return "warn";
  return "danger";
}

function checkIcon(state: PlacementCheckState) {
  if (state === "pass") return Check;
  if (state === "warn") return AlertTriangle;
  return X;
}

function cloneCandidates() {
  return placementCandidates.map((candidate) => ({ ...candidate }));
}

function mixTone(size: PlacementSize) {
  if (size === "Small") return "small";
  if (size === "Medium") return "medium";
  return "large";
}

export function PlacementPlanningPage({ t, isArabic }: PlacementPlanningPageProps) {
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const localized = (value: { en: string; ar: string }) => (isArabic ? value.ar : value.en);

  const [tab, setTab] = useState<PlanningTab>("map");
  const [candidateRows, setCandidateRows] = useState<PlacementCandidate[]>(cloneCandidates);
  const [selectedId, setSelectedId] = useState(candidateRows[0].id);
  const [showZones, setShowZones] = useState(true);
  const [showEstate, setShowEstate] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);
  const [relocationMode, setRelocationMode] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [intakes, setIntakes] = useState<PlacementIntake[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState(digitalPlacementFormats[5].id);
  const twinHostRef = useRef<HTMLDivElement | null>(null);

  const selected =
    candidateRows.find((candidate) => candidate.id === selectedId) ?? candidateRows[0];
  const evaluation = useMemo(() => evaluatePlacement(selected), [selected]);
  const selectedFormat = placementFormat(selectedFormatId);
  const selectedFormatDefaults = FORMAT_DEFAULTS[selectedFormat.id] ?? {
    widthM: selectedFormat.maxWidthM ?? 6,
    heightM: selectedFormat.maxHeightM ?? 3,
    speed: 60,
  };

  useEffect(() => {
    setIntakes(readPlacementIntakes());
    return subscribePlacementIntakes(setIntakes);
  }, []);

  const evaluatedCandidates = useMemo(
    () =>
      candidateRows.map((candidate) => ({ candidate, evaluation: evaluatePlacement(candidate) })),
    [candidateRows],
  );
  const compliantCount = evaluatedCandidates.filter(
    (row) => row.evaluation.verdict === "Compliant",
  ).length;
  const legacyCount = assetPlacementProfiles.filter((profile) => profile.legacy).length;
  const currentMix = portfolioMix();

  function updateSelected(patch: Partial<PlacementCandidate>) {
    setCandidateRows((current) =>
      current.map((candidate) =>
        candidate.id === selected.id ? { ...candidate, ...patch } : candidate,
      ),
    );
    setSubmittedId(null);
  }

  function chooseCandidate(id: string, nextTab?: PlanningTab) {
    setSelectedId(id);
    setRelocationMode(false);
    setShowChecks(false);
    if (nextTab) setTab(nextTab);
  }

  function applyFormat(format: PlacementFormatSpec) {
    const defaults = FORMAT_DEFAULTS[format.id] ?? {
      widthM: format.maxWidthM ?? selected.widthM,
      heightM: format.maxHeightM ?? selected.heightM,
      speed: selected.roadSpeedKph,
    };
    updateSelected({
      formatId: format.id,
      widthM: defaults.widthM,
      heightM: defaults.heightM,
      roadSpeedKph: defaults.speed,
      groundClearanceM: defaults.clearance,
      bridgeSpanM:
        format.id === "digital-bridge-banner" ? Math.max(15, defaults.widthM / 0.8) : undefined,
    });
  }

  function applyRecommendedRemedy() {
    if (evaluation.alternatives[0]) {
      applyFormat(evaluation.alternatives[0]);
      return;
    }
    const large = evaluation.format.size === "Large";
    updateSelected({
      zoneClass: 3,
      lat: 24.491,
      lng: 54.62,
      roadSpeedKph: large ? 120 : 60,
      marketArea: { en: "Yas commercial corridor", ar: "الممر التجاري في ياس" },
    });
  }

  function moveCandidate(lat: number, lng: number, zone: PlacementZoneClass | null) {
    updateSelected({ lat, lng, ...(zone == null ? {} : { zoneClass: zone }) });
    setRelocationMode(false);
  }

  function submitPlacement() {
    if (evaluation.verdict !== "Compliant") return;
    const intake = savePlacementIntake(evaluation, isArabic ? "ar" : "en");
    createTicket({
      title: `${evaluation.candidate.name.en}: placement approval`,
      body: `${evaluation.format.name.en} passed the encoded ADMO placement strategy. Create the site survey and authority submission dossier.`,
      object: {
        kind: "Zone",
        ref: evaluation.candidate.id,
        label: evaluation.candidate.marketArea.en,
      },
      linkedObjects: [
        {
          kind: "Asset",
          ref: intake.id,
          label: evaluation.candidate.name.en,
        },
      ],
      team: "Estate planning",
      assignee: "DMT planning desk",
      raisedBy: "ADMO estate planner",
      priority: "High",
      source: "Planning",
    });
    setSubmittedId(evaluation.candidate.id);
  }

  async function openTwinFullscreen() {
    const host = twinHostRef.current;
    if (!host) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await host.requestFullscreen();
  }

  const tabs: Array<{ id: PlanningTab; label: string; labelAr: string; icon: typeof Map }> = [
    { id: "map", label: "Placement map", labelAr: "خريطة المواضع", icon: Map },
    {
      id: "validation",
      label: "Site validation",
      labelAr: "التحقق من الموقع",
      icon: ClipboardCheck,
    },
    {
      id: "portfolio",
      label: "Portfolio and legacy",
      labelAr: "المحفظة والأصول القائمة",
      icon: BarChart3,
    },
  ];

  return (
    <div className="page-body placement-page">
      <section
        className="placement-kpis"
        aria-label={text("Placement overview", "نظرة عامة على المواضع")}
      >
        <div>
          <Target size={23} />
          <span>
            <strong>800</strong>
            <small>{text("Projected estate", "المحفظة المستهدفة")}</small>
          </span>
        </div>
        <div>
          <Layers3 size={23} />
          <span>
            <strong>75 / 15 / 10</strong>
            <small>{text("Small | Medium | Large", "صغير | متوسط | كبير")}</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={23} />
          <span>
            <strong>
              {compliantCount}/{candidateRows.length}
            </strong>
            <small>{text("Candidate sites compliant", "مواقع مقترحة متوافقة")}</small>
          </span>
        </div>
        <div>
          <RotateCcw size={23} />
          <span>
            <strong>{legacyCount}</strong>
            <small>{text("Legacy assets for review", "أصول قائمة للمراجعة")}</small>
          </span>
        </div>
      </section>

      <nav
        className="placement-tabs"
        role="tablist"
        aria-label={text("Planning views", "واجهات التخطيط")}
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <Icon size={17} />
              <span>{text(item.label, item.labelAr)}</span>
            </button>
          );
        })}
      </nav>

      {tab === "map" ? (
        <section className="placement-map-workspace">
          <header className="placement-section-header">
            <div>
              <span className="placement-eyebrow">
                {text("ADMO placement framework", "إطار مواضع ADMO")}
              </span>
              <h2>
                {text("See where each format is permitted", "اعرف أين يسمح بكل نوع من الأصول")}
              </h2>
            </div>
            <div
              className="placement-layer-toggles"
              aria-label={text("Map layers", "طبقات الخريطة")}
            >
              <button
                type="button"
                className={showZones ? "active" : ""}
                onClick={() => setShowZones((value) => !value)}
              >
                <Layers3 size={14} />
                {text("Zones", "المناطق")}
              </button>
              <button
                type="button"
                className={showEstate ? "active" : ""}
                onClick={() => setShowEstate((value) => !value)}
              >
                <Building2 size={14} />
                {text("Estate", "الأصول")}
              </button>
              <button
                type="button"
                className={showBuffers ? "active" : ""}
                onClick={() => setShowBuffers((value) => !value)}
              >
                <Ruler size={14} />
                {text("Buffers", "مسافات الفصل")}
              </button>
            </div>
          </header>

          <div className="placement-map-layout">
            <aside className="placement-zone-rail">
              <div className="placement-subhead">
                <strong>{text("Regulatory zones", "المناطق التنظيمية")}</strong>
                <small>
                  {text("Maximum assets per kilometre", "الحد الأقصى للأصول لكل كيلومتر")}
                </small>
              </div>
              <div className="placement-zone-list">
                {placementZonePolicies.map((policy) => (
                  <article
                    key={policy.zone}
                    style={{ "--zone-color": ZONE_COLORS[policy.zone] } as CSSProperties}
                  >
                    <span className="placement-zone-number">{policy.zone}</span>
                    <div>
                      <strong>{localized(policy.focus)}</strong>
                      <small>
                        {text("S", "ص")} {policy.densityPerKm.Small}
                        <i /> {text("M", "م")} {policy.densityPerKm.Medium}
                        <i /> {text("L", "ك")} {policy.densityPerKm.Large}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              <p className="placement-scenario-note">
                {text(
                  "Zone polygons are illustrative scenario data until the authoritative ADMO GIS layer is connected.",
                  "مضلعات المناطق بيانات توضيحية إلى حين ربط طبقة نظم المعلومات الجغرافية المعتمدة من ADMO.",
                )}
              </p>
            </aside>

            <div className="placement-map-stage">
              <PlacementComplianceMap
                zones={regulatoryZoneShapes}
                candidate={selected}
                evaluation={evaluation}
                showZones={showZones}
                showEstate={showEstate}
                showBuffers={showBuffers}
                relocationMode={relocationMode}
                onMoveCandidate={moveCandidate}
                t={(value) => {
                  const labels: Record<string, string> = {
                    "Map unavailable": "الخريطة غير متاحة",
                    "The placement checks remain available without map tiles.":
                      "تبقى فحوصات المواضع متاحة دون خرائط أساسية.",
                    "ADMO placement compliance map": "خريطة التحقق من مواضع ADMO",
                  };
                  return isArabic ? (labels[value] ?? value) : t(value);
                }}
              />
              {relocationMode ? (
                <div className="placement-map-instruction">
                  <MapPin size={16} />
                  <span>
                    {text(
                      "Click the map to test a new position",
                      "انقر على الخريطة لاختبار موقع جديد",
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRelocationMode(false)}
                    aria-label={text("Cancel", "إلغاء")}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
              <div className="placement-map-legend">
                <span>
                  <i className="zone-0" />
                  {text("Restricted", "محظورة")}
                </span>
                <span>
                  <i className="zone-1" />
                  {text("Grounded", "بيئية")}
                </span>
                <span>
                  <i className="zone-2" />
                  {text("Value", "متوازنة")}
                </span>
                <span>
                  <i className="zone-3" />
                  {text("Commercial", "تجارية")}
                </span>
              </div>
            </div>

            <aside className="placement-candidate-rail">
              <div className="placement-subhead">
                <strong>{text("Candidate sites", "المواقع المقترحة")}</strong>
                <small>
                  {text("Select one to inspect its constraints", "اختر موقعاً لفحص ضوابطه")}
                </small>
              </div>
              <div className="placement-candidate-list">
                {evaluatedCandidates.map((row) => (
                  <button
                    type="button"
                    key={row.candidate.id}
                    className={selected.id === row.candidate.id ? "selected" : ""}
                    onClick={() => chooseCandidate(row.candidate.id)}
                  >
                    <span
                      className={`placement-verdict-dot ${verdictTone(row.evaluation.verdict)}`}
                    />
                    <span>
                      <strong>{localized(row.candidate.name)}</strong>
                      <small>
                        {localized(row.candidate.marketArea)} |{" "}
                        {localized(row.evaluation.format.name)}
                      </small>
                      <span className="placement-row-chips">
                        {row.candidate.roadClass ? (
                          <i>{localized(placementRoadClassLabels[row.candidate.roadClass])}</i>
                        ) : null}
                        {row.evaluation.nearestAsset ? (
                          <i>
                            {row.evaluation.nearestAsset.asset.id} |{" "}
                            {row.evaluation.nearestAsset.distanceM} {text("m", "م")}
                          </i>
                        ) : null}
                      </span>
                    </span>
                    <em>
                      {text(
                        row.evaluation.verdict,
                        row.evaluation.verdict === "Compliant"
                          ? "متوافق"
                          : row.evaluation.verdict === "Review required"
                            ? "يتطلب مراجعة"
                            : "غير مسموح",
                      )}
                    </em>
                  </button>
                ))}
              </div>
              <div className={`placement-map-decision ${verdictTone(evaluation.verdict)}`}>
                <div>
                  {evaluation.verdict === "Compliant" ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <AlertTriangle size={19} />
                  )}
                  <span>
                    <small>{text("Selected result", "نتيجة الموقع المحدد")}</small>
                    <strong>
                      {text(
                        evaluation.verdict,
                        evaluation.verdict === "Compliant"
                          ? "متوافق"
                          : evaluation.verdict === "Review required"
                            ? "يتطلب مراجعة"
                            : "غير مسموح",
                      )}
                    </strong>
                  </span>
                </div>
                <p>{localized(evaluation.recommendation)}</p>
                <div>
                  <button type="button" onClick={() => setRelocationMode(true)}>
                    <Move size={14} />
                    {text("Test another point", "اختبار نقطة أخرى")}
                  </button>
                  <button type="button" className="primary" onClick={() => setTab("validation")}>
                    {text("Open validation", "فتح التحقق")}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {tab === "validation" ? (
        <section className="placement-validation-workspace">
          <aside className="placement-validation-list">
            <div className="placement-subhead">
              <strong>{text("Candidate queue", "قائمة المواقع المقترحة")}</strong>
              <small>
                {candidateRows.length} {text("sites", "مواقع")}
              </small>
            </div>
            {evaluatedCandidates.map((row) => (
              <button
                type="button"
                key={row.candidate.id}
                className={selected.id === row.candidate.id ? "selected" : ""}
                onClick={() => chooseCandidate(row.candidate.id)}
              >
                <span className={`placement-verdict-dot ${verdictTone(row.evaluation.verdict)}`} />
                <span>
                  <strong>{localized(row.candidate.name)}</strong>
                  <small>
                    {row.candidate.id} | {localized(row.candidate.marketArea)}
                  </small>
                  <span className="placement-row-chips">
                    {row.candidate.roadClass ? (
                      <i>{localized(placementRoadClassLabels[row.candidate.roadClass])}</i>
                    ) : null}
                    {row.evaluation.nearestAsset ? (
                      <i>
                        {row.evaluation.nearestAsset.asset.id} |{" "}
                        {row.evaluation.nearestAsset.distanceM} {text("m", "م")}
                      </i>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <div className="placement-validator">
            <header className="placement-validator-head">
              <div>
                <span className="placement-eyebrow">
                  {selected.id} | {localized(selected.marketArea)}
                </span>
                <h2>{localized(selected.name)}</h2>
              </div>
              <span className={`placement-verdict ${verdictTone(evaluation.verdict)}`}>
                {evaluation.verdict === "Compliant" ? (
                  <BadgeCheck size={17} />
                ) : (
                  <CircleOff size={17} />
                )}
                {text(
                  evaluation.verdict,
                  evaluation.verdict === "Compliant"
                    ? "متوافق"
                    : evaluation.verdict === "Review required"
                      ? "يتطلب مراجعة"
                      : "غير مسموح",
                )}
              </span>
            </header>

            <div
              className="placement-workflow-line"
              aria-label={text("Approval workflow", "مسار الاعتماد")}
            >
              {[
                [text("Site", "الموقع"), true],
                [text("Format", "النوع"), true],
                [
                  text("Spatial checks", "الفحوصات المكانية"),
                  evaluation.verdict !== "Not permitted",
                ],
                [text("Named approval", "اعتماد مسمى"), submittedId === selected.id],
              ].map(([label, done], index) => (
                <span key={String(label)} className={done ? "done" : index === 2 ? "current" : ""}>
                  <i>{done ? <Check size={11} /> : index + 1}</i>
                  <small>{label}</small>
                </span>
              ))}
            </div>

            <div className="placement-config">
              <label>
                <span>{text("Asset format", "نوع الأصل")}</span>
                <select
                  value={selected.formatId}
                  onChange={(event) => applyFormat(placementFormat(event.target.value))}
                >
                  {digitalPlacementFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {localized(format.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("ADMO zone", "منطقة ADMO")}</span>
                <select
                  value={selected.zoneClass}
                  onChange={(event) =>
                    updateSelected({ zoneClass: Number(event.target.value) as PlacementZoneClass })
                  }
                >
                  {placementZonePolicies.map((policy) => (
                    <option key={policy.zone} value={policy.zone}>
                      {localized(policy.name)} | {localized(policy.focus)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("Road speed", "سرعة الطريق")}</span>
                <select
                  value={selected.roadSpeedKph}
                  onChange={(event) => updateSelected({ roadSpeedKph: Number(event.target.value) })}
                >
                  {[40, 60, 80, 100, 120, 140].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed} {text("km/h", "كم/س")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("Width", "العرض")}</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={selected.widthM}
                  onChange={(event) => updateSelected({ widthM: Number(event.target.value) })}
                />
                <em>{text("metres", "متر")}</em>
              </label>
              <label>
                <span>{text("Height", "الارتفاع")}</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  value={selected.heightM}
                  onChange={(event) => updateSelected({ heightM: Number(event.target.value) })}
                />
                <em>{text("metres", "متر")}</em>
              </label>
            </div>

            <div className="placement-validation-main">
              <div ref={twinHostRef} className="placement-format-twin">
                <header>
                  <span>
                    <Eye size={16} />
                    {text("Placement twin", "توأم الموضع")}
                  </span>
                  <button
                    type="button"
                    onClick={openTwinFullscreen}
                    title={text("Full screen", "ملء الشاشة")}
                  >
                    <Expand size={16} />
                  </button>
                </header>
                <ClientOnlyPlacementFormatTwin
                  format={evaluation.format}
                  widthM={selected.widthM}
                  heightM={selected.heightM}
                />
                <div className="placement-twin-specs">
                  <span>
                    <small>{text("Envelope", "الحدود")}</small>
                    <strong>
                      {evaluation.format.maxWidthM ?? text("Site", "حسب الموقع")} x{" "}
                      {evaluation.format.maxHeightM ?? text("Site", "حسب الموقع")} {text("m", "م")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Speed band", "نطاق السرعة")}</small>
                    <strong>
                      {evaluation.speedBand} {text("km/h", "كم/س")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Clearance", "مسافة الفصل")}</small>
                    <strong>
                      {evaluation.minimumClearanceM
                        ? `${evaluation.minimumClearanceM} ${text("m", "م")}`
                        : text("Not allowed", "غير مسموح")}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="placement-decision-panel">
                <div className="placement-ai-summary">
                  <Sparkles size={19} />
                  <div>
                    <span>{text("MediaGPT placement advisor", "مستشار المواضع MediaGPT")}</span>
                    <strong>{localized(evaluation.recommendation)}</strong>
                  </div>
                </div>

                <div className="placement-result-facts">
                  <span>
                    <small>{text("Nearest asset", "أقرب أصل")}</small>
                    <strong>
                      {evaluation.nearestAsset
                        ? `${evaluation.nearestAsset.asset.id} | ${evaluation.nearestAsset.distanceM} ${text("m", "م")}`
                        : text("Clear", "لا يوجد تعارض")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Density diameter", "قطر الكثافة")}</small>
                    <strong>
                      {evaluation.diameterCount + 1}/{evaluation.diameterLimit} |{" "}
                      {evaluation.diameterM} {text("m", "م")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Zone capacity", "سعة المنطقة")}</small>
                    <strong>
                      {evaluation.zoneCountPerKm + 1}/{evaluation.zoneLimitPerKm}{" "}
                      {text("per km", "لكل كم")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Road class", "تصنيف الطريق")}</small>
                    <strong>
                      {selected.roadClass
                        ? localized(placementRoadClassLabels[selected.roadClass])
                        : text("Survey pending", "بانتظار المسح")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Carriageway", "نوع المسار")}</small>
                    <strong>
                      {selected.carriageway
                        ? localized(placementCarriagewayLabels[selected.carriageway])
                        : text("Survey pending", "بانتظار المسح")}
                    </strong>
                  </span>
                  <span>
                    <small>{text("Junction distance", "المسافة إلى التقاطع")}</small>
                    <strong>
                      {selected.distanceToJunctionM != null
                        ? `${selected.distanceToJunctionM} ${text("m", "م")}`
                        : text("Survey pending", "بانتظار المسح")}
                    </strong>
                  </span>
                </div>

                <div className="placement-nearby">
                  <strong>{text("Nearby placements", "المواضع القريبة")}</strong>
                  {evaluation.nearbyAssets.length ? (
                    <div className="placement-nearby-table">
                      {evaluation.nearbyAssets.map((row) => (
                        <div key={row.assetId}>
                          <span>{row.assetId}</span>
                          <strong>{row.name}</strong>
                          <em>
                            {row.distanceM} {text("m", "م")}
                          </em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <small>
                      {text(
                        "No estate assets are registered near this point.",
                        "لا توجد أصول مسجلة قرب هذه النقطة.",
                      )}
                    </small>
                  )}
                </div>

                <button
                  type="button"
                  className="placement-disclosure"
                  onClick={() => setShowChecks((value) => !value)}
                >
                  <span>
                    <ClipboardCheck size={15} />
                    {evaluation.checks.filter((item) => item.state === "pass").length}/
                    {evaluation.checks.length} {text("checks passed", "فحوصات ناجحة")}
                  </span>
                  <ChevronDown size={15} className={showChecks ? "open" : ""} />
                </button>
                {showChecks ? (
                  <div className="placement-check-list">
                    {evaluation.checks.map((item) => {
                      const Icon = checkIcon(item.state);
                      return (
                        <article key={item.id} className={item.state}>
                          <Icon size={15} />
                          <span>
                            <strong>{localized(item.label)}</strong>
                            <small>{localized(item.detail)}</small>
                          </span>
                          <em>{item.source.split("|").at(-1)}</em>
                        </article>
                      );
                    })}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="placement-disclosure sources"
                  onClick={() => setShowSources((value) => !value)}
                >
                  <span>
                    <FileCheck2 size={15} />
                    {text("Source and governance", "المصدر والحوكمة")}
                  </span>
                  <ChevronDown size={15} className={showSources ? "open" : ""} />
                </button>
                {showSources ? (
                  <div className="placement-source-detail">
                    <strong>{PLACEMENT_STRATEGY_SOURCE}</strong>
                    <span>
                      {text(
                        "Rules PLC-001 to PLC-006 plus sensitive frontage exclusions (RULE-PROX, exact distances pending ADMO confirmation) | Evidence retained with the approval record",
                        "القواعد PLC-001 إلى PLC-006 مع استبعادات الواجهات الحساسة (RULE-PROX، والمسافات الدقيقة بانتظار تأكيد ADMO) | تحفظ الأدلة مع سجل الاعتماد",
                      )}
                    </span>
                  </div>
                ) : null}

                <div className="placement-actions">
                  {evaluation.verdict === "Not permitted" ? (
                    <button type="button" className="primary" onClick={applyRecommendedRemedy}>
                      <Sparkles size={15} />
                      {evaluation.alternatives[0]
                        ? `${text("Use", "استخدام")} ${localized(evaluation.alternatives[0].name)}`
                        : text("Move to eligible corridor", "النقل إلى ممر مؤهل")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("map");
                      setRelocationMode(true);
                    }}
                  >
                    <MapPin size={15} />
                    {text("Relocate on map", "النقل على الخريطة")}
                  </button>
                  <button
                    type="button"
                    className="approve"
                    disabled={evaluation.verdict !== "Compliant" || submittedId === selected.id}
                    onClick={submitPlacement}
                  >
                    {submittedId === selected.id ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    {submittedId === selected.id
                      ? text("Sent to Construction", "تم الإرسال إلى الإنشاء")
                      : text("Submit for named approval", "إرسال للاعتماد المسمى")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "portfolio" ? (
        <section className="placement-portfolio">
          <div className="placement-portfolio-top">
            <article className="placement-mix-panel">
              <header>
                <div>
                  <span className="placement-eyebrow">
                    {text("Target estate", "المحفظة المستهدفة")}
                  </span>
                  <h2>800 {text("assets", "أصل")}</h2>
                </div>
                <Target size={25} />
              </header>
              <div
                className="placement-mix-bar"
                aria-label={text("Target portfolio mix", "المزيج المستهدف للمحفظة")}
              >
                {currentMix.map((row) => (
                  <span
                    key={row.size}
                    className={mixTone(row.size)}
                    style={{ width: `${row.targetPct}%` }}
                  />
                ))}
              </div>
              <div className="placement-mix-legend">
                {currentMix.map((row) => (
                  <div key={row.size}>
                    <i className={mixTone(row.size)} />
                    <span>
                      <small>
                        {text(
                          row.size,
                          row.size === "Small" ? "صغير" : row.size === "Medium" ? "متوسط" : "كبير",
                        )}
                      </small>
                      <strong>
                        {row.targetPct}% | {row.projectedTarget}
                      </strong>
                      <em>
                        {text("Current", "الحالي")} {row.currentPct}%
                      </em>
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="placement-density-panel">
              <header>
                <span>
                  <span className="placement-eyebrow">
                    {text("Density schedule", "جدول الكثافة")}
                  </span>
                  <h2>{text("Assets per kilometre", "الأصول لكل كيلومتر")}</h2>
                </span>
                <Gauge size={25} />
              </header>
              <div className="placement-density-table">
                <div className="head">
                  <span>{text("Zone", "المنطقة")}</span>
                  <span>{text("Small", "صغير")}</span>
                  <span>{text("Medium", "متوسط")}</span>
                  <span>{text("Large", "كبير")}</span>
                </div>
                {placementZonePolicies.map((policy) => (
                  <div key={policy.zone}>
                    <span>
                      <i style={{ background: ZONE_COLORS[policy.zone] }} />
                      {policy.zone} | {localized(policy.focus)}
                    </span>
                    <strong>{policy.densityPerKm.Small || "—"}</strong>
                    <strong>{policy.densityPerKm.Medium || "—"}</strong>
                    <strong>{policy.densityPerKm.Large || "—"}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <section className="placement-format-catalogue">
            <header className="placement-section-header">
              <div>
                <span className="placement-eyebrow">
                  {text("Digital format catalogue", "كتالوج الأنواع الرقمية")}
                </span>
                <h2>
                  {text(
                    "One reusable twin for every approved structure",
                    "توأم قابل لإعادة الاستخدام لكل هيكل معتمد",
                  )}
                </h2>
              </div>
              <small>
                {text(
                  "Select a format to inspect its geometry and operating envelope",
                  "اختر نوعاً لفحص هندسته وحدوده التشغيلية",
                )}
              </small>
            </header>
            <div className="placement-format-layout">
              <div className="placement-format-picker">
                {digitalPlacementFormats.map((format) => (
                  <button
                    type="button"
                    key={format.id}
                    className={selectedFormat.id === format.id ? "selected" : ""}
                    onClick={() => setSelectedFormatId(format.id)}
                  >
                    <span
                      className={`format-shape ${format.size.toLowerCase()} ${format.aspectRatio === "9:16" ? "portrait" : ""}`}
                    />
                    <span>
                      <strong>{localized(format.name)}</strong>
                      <small>
                        {format.aspectRatio} |{" "}
                        {text(
                          format.size,
                          format.size === "Small"
                            ? "صغير"
                            : format.size === "Medium"
                              ? "متوسط"
                              : "كبير",
                        )}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="placement-catalogue-twin">
                <ClientOnlyPlacementFormatTwin
                  format={selectedFormat}
                  widthM={selectedFormatDefaults.widthM}
                  heightM={selectedFormatDefaults.heightM}
                />
              </div>
              <div className="placement-format-spec">
                <span className="placement-eyebrow">
                  {text("Approved envelope", "الحدود المعتمدة")}
                </span>
                <h3>{localized(selectedFormat.name)}</h3>
                <dl>
                  <div>
                    <dt>{text("Size", "الحجم")}</dt>
                    <dd>
                      {text(
                        selectedFormat.size,
                        selectedFormat.size === "Small"
                          ? "صغير"
                          : selectedFormat.size === "Medium"
                            ? "متوسط"
                            : "كبير",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{text("Aspect ratio", "نسبة العرض")}</dt>
                    <dd>{selectedFormat.aspectRatio}</dd>
                  </div>
                  <div>
                    <dt>{text("Maximum width", "أقصى عرض")}</dt>
                    <dd>
                      {selectedFormat.maxWidthM
                        ? `${selectedFormat.maxWidthM} ${text("m", "م")}`
                        : text("Site dependent", "حسب الموقع")}
                    </dd>
                  </div>
                  <div>
                    <dt>{text("Maximum height", "أقصى ارتفاع")}</dt>
                    <dd>
                      {selectedFormat.maxHeightM
                        ? `${selectedFormat.maxHeightM} ${text("m", "م")}`
                        : text("Site dependent", "حسب الموقع")}
                    </dd>
                  </div>
                  {selectedFormat.groundClearanceM ? (
                    <div>
                      <dt>{text("Ground clearance", "ارتفاع التركيب")}</dt>
                      <dd>
                        {selectedFormat.groundClearanceM} {text("m", "م")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="placement-speed-chips">
                  <small>{text("Permitted road-speed bands", "نطاقات سرعة الطريق المسموحة")}</small>
                  {(["0-40", "41-80", "81-100", "101-160"] as const).map((band) => (
                    <span
                      key={band}
                      className={selectedFormat.allowedSpeedBands[band] ? "allowed" : "blocked"}
                    >
                      {selectedFormat.allowedSpeedBands[band] ? (
                        <Check size={11} />
                      ) : (
                        <X size={11} />
                      )}
                      {band}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="placement-estate-audit">
            <header className="placement-section-header">
              <div>
                <span className="placement-eyebrow">
                  {text("Existing estate review", "مراجعة الأصول القائمة")}
                </span>
                <h2>{text("Permit and placement exceptions", "استثناءات التصاريح والمواضع")}</h2>
              </div>
              <small>
                {legacyCount}{" "}
                {text("legacy records require named disposition", "سجلات قائمة تتطلب قراراً مسمى")}
              </small>
            </header>
            <div className="placement-audit-table">
              <div className="head">
                <span>{text("Asset", "الأصل")}</span>
                <span>{text("Format", "النوع")}</span>
                <span>{text("Zone", "المنطقة")}</span>
                <span>{text("Permit", "التصريح")}</span>
                <span>{text("Placement result", "نتيجة الموضع")}</span>
              </div>
              <div className="body">
                {assetPlacementProfiles.map((profile) => {
                  const asset = assets.find((row) => row.id === profile.assetId);
                  const audit = evaluateExistingPlacement(profile);
                  return (
                    <article key={profile.assetId}>
                      <span>
                        <strong>{asset?.name ?? profile.assetId}</strong>
                        <small>
                          {profile.assetId} | {asset?.zone}
                        </small>
                      </span>
                      <span>{localized(placementFormat(profile.formatId).name)}</span>
                      <span>{profile.zoneClass}</span>
                      <span>
                        {text(
                          profile.permitStatus,
                          profile.permitStatus === "Active"
                            ? "ساري"
                            : profile.permitStatus === "Review due"
                              ? "تستحق المراجعة"
                              : "مؤقت",
                        )}
                      </span>
                      <span
                        className={`placement-audit-result ${profile.legacy ? "warn" : verdictTone(audit.verdict)}`}
                      >
                        {profile.legacy
                          ? text("Legacy review", "مراجعة أصل قائم")
                          : text(
                              audit.verdict,
                              audit.verdict === "Compliant"
                                ? "متوافق"
                                : audit.verdict === "Review required"
                                  ? "يتطلب مراجعة"
                                  : "غير مسموح",
                            )}
                      </span>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {intakes.length ? (
            <section className="placement-handoff-strip">
              <FileCheck2 size={20} />
              <span>
                <strong>
                  {intakes.length} {text("approved site intake", "ملف موقع معتمد")}
                  {intakes.length === 1 ? "" : text("s", "ات")}
                </strong>
                <small>
                  {text(
                    "Visible in Construction | Site approval",
                    "ظاهر في الإنشاء | اعتماد الموقع",
                  )}
                </small>
              </span>
            </section>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
