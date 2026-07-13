import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Asset digital twin for the transparent technical LED billboard
 * (blender/build_billboard_technical.py -> billboard-technical.glb).
 * A 12 x 4 m, 48-cabinet outdoor LED wall: semi-transparent casing reveals the
 * internal electronics. Faulty / degrading parts across the wall are tinted,
 * hovering shows a small label + unique ID, clicking opens a detail window that
 * explains what is wrong, and the explode slider scrubs the baked GLB animation.
 */

const URL = "/models/billboard-technical.glb";
useGLTF.preload(URL);

type Health = "healthy" | "degrading" | "fault";

const HEALTH_COLORS: Record<Health, string> = { healthy: "#1f9d57", degrading: "#d98a10", fault: "#d43f35" };
const HEALTH_LABEL: Record<Health, string> = { healthy: "Healthy", degrading: "Degrading", fault: "Fault" };

const ASSET_ID = "AD-HWY-001";
const HERO_PREFIX = "Cabinet_05_01_"; // the cabinet the explode animation opens up

export type BillboardTwinProps = {
  variant?: "embedded" | "fullscreen" | "stage";
  // "CODE:family" (e.g. "C05R01:cooling_fan") to focus/select that part; null clears.
  focusPart?: string | null;
};

const BOARD_TECH_STACK = [
  "LED Screen 12x4 m - 48 cabinets",
  "LED Module 250x250 mm",
  "Front Mask + Protective",
  "HUB / Adapter Board",
  "Receiving Card - NovaStar MRV432",
  "Power Supply 5 V DC",
  "Aluminium Cabinet 1x1 m IP66",
  "Rear Service Door + Gasket",
  "Data / DC Power daisy-chain",
  "Cooling: fans + heat sink",
  "Steel Back Frame + Platform",
  "Controller Box + Breakers",
];

// Map a raw mesh "component" tag to a health family we track.
function familyOf(component: string | undefined): string | null {
  if (!component) return null;
  if (component.startsWith("cooling_fan")) return "cooling_fan";
  if (component.startsWith("power_supply")) return "power_supply";
  if (component.startsWith("receiving_card")) return "receiving_card";
  if (component === "hub_board") return "hub_board";
  if (component === "rear_door") return "rear_door";
  if (component === "cabinet_skin") return "casing";
  if (component === "gasket") return "gasket";
  if (component.startsWith("led") || component.startsWith("module")) return "led";
  return null;
}

function isBakedAnnotation(o: THREE.Object3D) {
  const name = o.name.toLowerCase();
  const component = String(o.userData.component || "").toLowerCase();
  return (
    name.startsWith("lbl_") ||
    name.includes("label") ||
    name.includes("annotation") ||
    name.includes("text") ||
    component.includes("label") ||
    component.includes("annotation")
  );
}

interface Fault {
  state: Exclude<Health, "healthy">;
  part: string;
  title: string;
  detail: string;
  action: string;
}

// Mock-but-plausible live health, spread across the wall and keyed by
// `${cabinetCode}:${family}`. Several sit on the rear service doors / casing so
// they are visible (and hover/clickable) straight away, without exploding; the
// two hero-cabinet faults sit inside and are revealed by the Explode slider.
const FAULTS: Record<string, Fault> = {
  "C05R01:cooling_fan": {
    state: "fault",
    part: "Cooling fan",
    title: "Cooling fan stalled",
    detail:
      "The cabinet fan is reading 0 RPM while the internal sensor holds 71 °C - above the 65 °C safe ceiling. Left unattended, the surrounding modules will auto-dim to shed heat.",
    action: "Dispatch a technician to replace the fan module.",
  },
  "C05R01:power_supply": {
    state: "degrading",
    part: "Power supply",
    title: "Power supply ageing",
    detail:
      "Ripple on the 5 V rail is trending up and efficiency has slipped ~6%. The N+1 redundant supply is carrying the load, so the screen is unaffected for now.",
    action: "Schedule a PSU replacement within 14 days.",
  },
  "C02R00:rear_door": {
    state: "fault",
    part: "Rear service door",
    title: "Service door unlatched",
    detail:
      "This cabinet's rear maintenance door is reading open with both quarter-turn locks disengaged, exposing the electronics to dust and rain on the E10 gantry.",
    action: "Re-seat and lock the door on the next site visit.",
  },
  "C11R02:rear_door": {
    state: "fault",
    part: "Rear service door",
    title: "Water ingress detected",
    detail:
      "The moisture sensor behind this door tripped after the last wash cycle - the seal is no longer watertight. Corrosion risk to the receiving card inside.",
    action: "Replace the door gasket and dry the cabinet out.",
  },
  "C09R03:rear_door": {
    state: "degrading",
    part: "Rear service door",
    title: "Door gasket perished",
    detail:
      "The weather gasket around this door is cracking with age. Still sealing today, but it will start letting water through within a season.",
    action: "Add gasket replacement to the next planned maintenance.",
  },
  "C07R00:casing": {
    state: "degrading",
    part: "Cabinet casing",
    title: "Cabinet running hot",
    detail:
      "This cabinet is averaging 8 °C hotter than its neighbours across the day - likely a partly blocked vent. No throttling yet, but it is trending toward the limit.",
    action: "Inspect and clear the ventilation grille.",
  },
};

const ISSUE_LIST = Object.entries(FAULTS)
  .map(([key, f]) => {
    const [code, family] = key.split(":");
    return { code, family, ...f };
  })
  .sort((a, b) => (a.state === b.state ? 0 : a.state === "fault" ? -1 : 1));

interface PartInfo {
  id: string;
  code: string;
  label: string;
  component: string;
  family: string | null;
  health: Health;
  fault?: Fault;
}

interface Hover extends PartInfo {
  point: [number, number, number];
}

// Derive a unique, human-readable identity + live health for any tagged mesh.
function partInfo(o: THREE.Object3D): PartInfo | null {
  const label = String(o.userData.label || "");
  if (!label) return null;
  const component = String(o.userData.component || "");
  const family = familyOf(component);
  const m = o.name.match(/Cabinet_(\d+)_(\d+)/);
  const code = m ? `C${m[1]}R${m[2]}` : (component || o.name || "part").toUpperCase();
  const fault = m && family ? FAULTS[`${code}:${family}`] : undefined;
  const health: Health = fault ? fault.state : "healthy";
  const slug = (family || component || o.name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `${ASSET_ID} | ${code}${m ? `-${slug}` : ""}`;
  return { id, code, label, component, family, health, fault };
}

/* ---- helpers reused from the platform twin ---- */
function Kick() {
  const { invalidate } = useThree();
  useEffect(() => {
    const timers = [0, 150, 400, 900, 1600].map((d) => setTimeout(() => invalidate(), d));
    return () => timers.forEach(clearTimeout);
  });
  return null;
}

class EnvBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Loader() {
  return (
    <Html center>
      <div className="twin-loading">Loading model…</div>
    </Html>
  );
}

// Non-destructive box outline around the selected mesh; follows the explode pose.
function SelectionBox({ object, explode }: { object: THREE.Object3D; explode: number }) {
  const { invalidate } = useThree();
  const helper = useMemo(() => new THREE.BoxHelper(object, new THREE.Color("#2b6cff")), [object]);
  useEffect(() => {
    helper.update();
    invalidate();
  }, [explode, helper, invalidate]);
  useEffect(() => () => helper.geometry.dispose(), [helper]);
  return <primitive object={helper} />;
}

function Billboard({
  explode,
  onHover,
  onSelect,
  onReady,
  selectedObj,
}: {
  explode: number;
  onHover: (h: Hover | null) => void;
  onSelect: (sel: { info: PartInfo; obj: THREE.Object3D } | null) => void;
  onReady: (scene: THREE.Object3D) => void;
  selectedObj: THREE.Object3D | null;
}) {
  const { scene, animations } = useGLTF(URL);
  const { invalidate } = useThree();

  useEffect(() => onReady(scene), [scene, onReady]);

  // Manually-controlled mixer (no per-frame auto-tick) so the slider scrubs cleanly.
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const duration = useMemo(
    () => Math.max(0.001, ...(animations.length ? animations.map((a) => a.duration) : [0.001])),
    [animations],
  );
  useEffect(() => {
    animations.forEach((clip) => mixer.clipAction(clip).play());
    return () => {
      animations.forEach((clip) => mixer.uncacheClip(clip));
    };
  }, [animations, mixer]);

  useEffect(() => {
    // clamp just below duration so explode=1 holds the final pose instead of looping to 0
    mixer.setTime(Math.min(explode * duration, duration - 0.001));
    invalidate();
  }, [explode, duration, mixer, invalidate]);

  // Health overlay + per-mesh material prep. The GLB shares ~21 materials across
  // hundreds of meshes, so we clone one material per mesh (needed to fade parts
  // individually), tint the degrading/faulty ones, and stash each mesh's base
  // look on userData for the focus/restore pass below.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (isBakedAnnotation(mesh)) {
        mesh.visible = false;
        return;
      }
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      const info = partInfo(mesh);
      if (info && info.health !== "healthy") {
        const color = new THREE.Color(HEALTH_COLORS[info.health]);
        mat.color = color.clone();
        mat.emissive = color.clone();
        mat.emissiveIntensity = info.health === "fault" ? 0.8 : 0.5;
        mat.transparent = false;
        mat.opacity = 1;
      }
      mesh.material = mat;
      mesh.userData._base = {
        opacity: mat.opacity,
        transparent: mat.transparent,
        depthWrite: mat.depthWrite,
        emissiveIntensity: mat.emissiveIntensity,
      };
    });
    invalidate();
  }, [scene, invalidate]);

  // Focus mode: when a part is selected, keep it fully lit and fade everything
  // else to a ghost so the selection is unmistakable; restore all on deselect.
  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const base = mesh.userData?._base as
        | { opacity: number; transparent: boolean; depthWrite: boolean; emissiveIntensity: number }
        | undefined;
      if (!mesh.isMesh || !base) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedObj && mesh !== selectedObj) {
        mat.transparent = true;
        mat.opacity = Math.min(base.opacity, 1) * 0.12;
        mat.depthWrite = false;
        mat.emissiveIntensity = base.emissiveIntensity * 0.15;
      } else {
        mat.transparent = base.transparent;
        mat.opacity = base.opacity;
        mat.depthWrite = base.depthWrite;
        mat.emissiveIntensity =
          selectedObj && mesh === selectedObj ? Math.max(base.emissiveIntensity, 0.3) : base.emissiveIntensity;
      }
      mat.needsUpdate = true;
    });
    invalidate();
  }, [scene, selectedObj, invalidate]);

  return (
    <>
      <primitive
        object={scene}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          const info = partInfo(e.object);
          if (!info) return;
          onHover({ ...info, point: [e.point.x, e.point.y, e.point.z] });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const info = partInfo(e.object);
          if (!info) return;
          onSelect({ info, obj: e.object });
        }}
      />
      {selectedObj ? <SelectionBox object={selectedObj} explode={explode} /> : null}
    </>
  );
}

export default function BillboardTwin({ variant = "embedded", focusPart = null }: BillboardTwinProps) {
  const [explode, setExplode] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const [sel, setSel] = useState<{ info: PartInfo; obj: THREE.Object3D } | null>(null);
  const [showSpec, setShowSpec] = useState(false);
  const sceneRef = useRef<THREE.Object3D | null>(null);
  // 3D stage backdrop follows the app theme (dark studio vs daylight).
  const [sceneBg, setSceneBg] = useState(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "#dce7f1" : "#242827",
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setSceneBg(document.documentElement.dataset.theme === "light" ? "#dce7f1" : "#242827");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const faultCount = ISSUE_LIST.filter((i) => i.state === "fault").length;
  const degCount = ISSUE_LIST.filter((i) => i.state === "degrading").length;

  const onReady = useCallback((scene: THREE.Object3D) => {
    sceneRef.current = scene;
  }, []);

  // Select a part from the issue list: find its mesh in the loaded scene.
  const selectByKey = useCallback((code: string, family: string) => {
    const scene = sceneRef.current;
    if (!scene) return;
    let found: THREE.Object3D | null = null;
    scene.traverse((o) => {
      if (found || !(o as THREE.Mesh).isMesh) return;
      const info = partInfo(o);
      if (info && info.code === code && info.family === family) found = o;
    });
    if (found) {
      const info = partInfo(found);
      if (info) setSel({ info, obj: found });
    }
  }, []);

  // Focus a part when a parent (e.g. the Active issues panel) requests it.
  // Poll for the scene so it lands even if the model is still loading at click.
  useEffect(() => {
    if (!focusPart) return;
    const idx = focusPart.indexOf(":");
    if (idx < 0) return;
    const code = focusPart.slice(0, idx);
    const family = focusPart.slice(idx + 1);
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (sceneRef.current) { selectByKey(code, family); return; }
      if (tries++ < 24) timer = setTimeout(attempt, 280);
    };
    attempt();
    return () => { if (timer) clearTimeout(timer); };
  }, [focusPart, selectByKey]);

  const info = sel?.info;

  return (
    <div className={`twin-wrap twin-wrap-${variant}`}>
      <div className="twin-stage">
        <Canvas
          frameloop="demand"
          camera={{ position: [10, 8.5, -18], fov: 40 }}
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          onPointerMissed={() => setSel(null)}
        >
          <color attach="background" args={[sceneBg]} />
          <hemisphereLight intensity={0.95} color="#eaf2fb" groundColor="#7d8a6f" />
          <directionalLight position={[14, 20, -10]} intensity={1.5} />
          <directionalLight position={[-12, 8, 12]} intensity={0.4} />
          <EnvBoundary>
            <Suspense fallback={null}>
              <Environment preset="city" />
            </Suspense>
          </EnvBoundary>
          <Suspense fallback={<Loader />}>
            <Billboard explode={explode} onHover={setHover} onSelect={setSel} onReady={onReady} selectedObj={sel?.obj || null} />
          </Suspense>
          {hover ? (
            <Html position={hover.point} center zIndexRange={[100, 0]} style={{ pointerEvents: "none" }}>
              <div className={`twin-tip tone-${hover.health}`}>
                <i style={{ background: HEALTH_COLORS[hover.health] }} />
                <b>{hover.fault ? hover.fault.title : hover.label}</b>
                <span>{hover.code}</span>
              </div>
            </Html>
          ) : null}
          <OrbitControls makeDefault enablePan enableZoom minDistance={4} maxDistance={60} target={[0, 6.8, 0]} />
          <Kick />
        </Canvas>

        {variant !== "stage" ? (
          <div className="twin-legend">
            <span><i style={{ background: HEALTH_COLORS.healthy }} />Healthy</span>
            <span><i style={{ background: HEALTH_COLORS.degrading }} />Degrading</span>
            <span><i style={{ background: HEALTH_COLORS.fault }} />Fault</span>
          </div>
        ) : null}

        {variant !== "stage" ? (
          <button type="button" className="twin-spec-trigger" onClick={() => setShowSpec(true)}>
            Board specification
          </button>
        ) : null}

        {showSpec && variant !== "stage" ? (
          <div className="twin-spec-window" role="dialog" aria-label="Board specification">
            <div className="twin-spec-head">
              <strong>Technical stack</strong>
              <button type="button" className="twin-window-close" onClick={() => setShowSpec(false)} aria-label="Close">×</button>
            </div>
            <ul>
              {BOARD_TECH_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Click-to-open detail window: the title states what is wrong. */}
        {info ? (
          <div className={`twin-window tone-${info.health}`} role="dialog" aria-label="Component detail">
            <div className="twin-window-head">
              <i style={{ background: HEALTH_COLORS[info.health] }} />
              <div className="twin-window-title">
                <strong>{info.fault ? info.fault.title : info.label}</strong>
                <span>{info.fault ? `${info.fault.part} | ${info.code}` : `${info.label} | ${info.code}`}</span>
              </div>
              <button type="button" className="twin-window-close" onClick={() => setSel(null)} aria-label="Close">×</button>
            </div>
            <span className={`twin-window-badge tone-${info.health}`}>{HEALTH_LABEL[info.health]}</span>
            <p className="twin-window-detail">
              {info.fault ? info.fault.detail : "Operating normally - telemetry is within the expected range."}
            </p>
            {info.fault ? (
              <div className="twin-window-action">
                <span>Recommended</span>
                {info.fault.action}
              </div>
            ) : null}
            <code className="twin-window-id">{info.id}</code>
          </div>
        ) : null}
      </div>

      {variant === "stage" ? null : (
      <aside className="twin-controls">
        <header>
          <strong>Asset digital twin</strong>
          <span>AD-HWY-001 | 12×4 m LED billboard | 48 cabinets</span>
        </header>

        <div className="twin-summary">
          <span className={faultCount ? "bad" : "ok"}>{faultCount} fault</span>
          <span className={degCount ? "warn" : "ok"}>{degCount} degrading</span>
        </div>

        <label className="twin-explode">
          Explode view
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
        </label>

        <p className="twin-hint">Hover for a label, click any part for its detail window. Faulty parts are tinted on the model - drag Explode to open the hero cabinet (C05R01) and reveal its internal fan and power supply.</p>

        <div className="twin-issues">
          <div className="twin-issues-head">Active issues</div>
          {ISSUE_LIST.map((iss) => {
            const active = info?.code === iss.code && info?.family === iss.family;
            return (
              <button
                key={`${iss.code}:${iss.family}`}
                type="button"
                className={`twin-issue tone-${iss.state} ${active ? "active" : ""}`}
                onClick={() => selectByKey(iss.code, iss.family)}
              >
                <i style={{ background: HEALTH_COLORS[iss.state] }} />
                <span className="twin-issue-title">{iss.title}</span>
                <em>{iss.code}</em>
              </button>
            );
          })}
        </div>
      </aside>
      )}
    </div>
  );
}
