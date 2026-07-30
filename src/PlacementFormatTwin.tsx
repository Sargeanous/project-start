import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { PlacementFormatSpec } from "./placement-strategy";

export type PlacementFormatTwinProps = {
  format: PlacementFormatSpec;
  widthM: number;
  heightM: number;
  variant?: "embedded" | "fullscreen";
};

const METAL = "#303a37";
const DARK_METAL = "#18211f";
const LED_FACE = "#0f7150";
const LED_GLOW = "#28bd7d";
const GLASS = "#9bc9bf";

function Box({
  position,
  scale,
  color = METAL,
  metalness = 0.72,
  roughness = 0.38,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function LedPanel({
  width,
  height,
  y,
  z = 0,
}: {
  width: number;
  height: number;
  y: number;
  z?: number;
}) {
  const verticals = Math.max(4, Math.min(12, Math.round(width * 1.2)));
  const horizontals = Math.max(3, Math.min(8, Math.round(height * 1.1)));

  return (
    <group position={[0, y, z]}>
      <Box
        position={[0, 0, -0.16]}
        scale={[width + 0.22, height + 0.22, 0.28]}
        color={DARK_METAL}
      />
      <mesh position={[0, 0, 0.005]} castShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial
          color={LED_FACE}
          emissive={LED_GLOW}
          emissiveIntensity={0.22}
          metalness={0.18}
          roughness={0.3}
        />
      </mesh>
      {Array.from({ length: verticals - 1 }, (_, index) => {
        const x = -width / 2 + (width / verticals) * (index + 1);
        return (
          <Box
            key={`v-${index}`}
            position={[x, 0, 0.075]}
            scale={[0.018, height, 0.012]}
            color="#91b5ab"
            metalness={0.2}
            roughness={0.5}
          />
        );
      })}
      {Array.from({ length: horizontals - 1 }, (_, index) => {
        const py = -height / 2 + (height / horizontals) * (index + 1);
        return (
          <Box
            key={`h-${index}`}
            position={[0, py, 0.075]}
            scale={[width, 0.018, 0.012]}
            color="#91b5ab"
            metalness={0.2}
            roughness={0.5}
          />
        );
      })}
    </group>
  );
}

function Pole({ x, height, width = 0.28 }: { x: number; height: number; width?: number }) {
  return (
    <group>
      <Box position={[x, height / 2, -0.12]} scale={[width, height, width]} color={METAL} />
      <Box position={[x, 0.1, -0.12]} scale={[width * 2.2, 0.2, width * 2.2]} color={DARK_METAL} />
    </group>
  );
}

function StandardBillboard({
  width,
  height,
  clearance,
  poles,
}: {
  width: number;
  height: number;
  clearance: number;
  poles: number;
}) {
  const panelY = clearance + height / 2;
  const poleXs = poles === 1 ? [0] : [-width * 0.28, width * 0.28];
  return (
    <group>
      {poleXs.map((x) => (
        <Pole key={x} x={x} height={clearance + 0.2} width={poles === 1 ? 0.34 : 0.3} />
      ))}
      <LedPanel width={width} height={height} y={panelY} />
      {poles === 2 ? (
        <>
          <Box position={[0, clearance - 0.45, -0.12]} scale={[width * 0.72, 0.14, 0.18]} />
          <Box position={[0, clearance - 0.9, -0.12]} scale={[width * 0.6, 0.1, 0.14]} />
        </>
      ) : null}
    </group>
  );
}

function BusShelter({ width, height }: { width: number; height: number }) {
  const shelterWidth = Math.max(3.8, width * 2.8);
  const roofY = height + 0.42;
  return (
    <group>
      <LedPanel width={width} height={height} y={height / 2 + 0.18} z={0.06} />
      <Box position={[0, roofY, -0.18]} scale={[shelterWidth, 0.16, 1.28]} color={METAL} />
      <Pole x={-shelterWidth / 2 + 0.16} height={roofY} width={0.12} />
      <Pole x={shelterWidth / 2 - 0.16} height={roofY} width={0.12} />
      <Box
        position={[0.72, 1.05, -0.5]}
        scale={[shelterWidth * 0.5, 0.12, 0.58]}
        color={DARK_METAL}
      />
      <mesh position={[0.72, height * 0.5, -0.62]}>
        <boxGeometry args={[shelterWidth * 0.54, height * 0.9, 0.04]} />
        <meshPhysicalMaterial
          color={GLASS}
          transparent
          opacity={0.22}
          transmission={0.55}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}

function BridgeBanner({ width, height }: { width: number; height: number }) {
  const span = Math.max(width * 1.25, 13);
  const deckY = height + 2.35;
  return (
    <group>
      <Box position={[0, deckY, -0.45]} scale={[span, 0.42, 1.15]} color="#59615f" />
      <Box
        position={[0, deckY + 0.34, -0.45]}
        scale={[span, 0.12, 1.02]}
        color="#858d89"
        metalness={0.25}
      />
      <Pole x={-span * 0.36} height={deckY} width={0.42} />
      <Pole x={span * 0.36} height={deckY} width={0.42} />
      <LedPanel width={width} height={height} y={deckY - height / 2 - 0.25} z={0.12} />
      <Box position={[0, 0.07, 0.15]} scale={[span * 0.9, 0.14, 2.9]} color="#26312e" />
      <Box position={[0, 0.08, 0.16]} scale={[0.1, 0.018, 2.85]} color="#e7eee9" metalness={0} />
    </group>
  );
}

function FormatModel({ format, widthM, heightM }: PlacementFormatTwinProps) {
  const normalized = useMemo(() => {
    const largest = Math.max(widthM, heightM, 4);
    const scale = 7.2 / largest;
    return {
      width: widthM * scale,
      height: heightM * scale,
      clearance: Math.min((format.groundClearanceM ?? Math.max(0.4, heightM * 0.18)) * scale, 4.8),
      scale,
    };
  }, [format.groundClearanceM, heightM, widthM]);

  const content =
    format.id === "digital-bus-shelter" ? (
      <BusShelter width={normalized.width} height={normalized.height} />
    ) : format.id === "digital-bridge-banner" ? (
      <BridgeBanner width={normalized.width} height={normalized.height} />
    ) : (
      <StandardBillboard
        width={normalized.width}
        height={normalized.height}
        clearance={normalized.clearance}
        poles={
          format.id === "digital-small-vertical" || format.id === "digital-medium-vertical" ? 1 : 2
        }
      />
    );

  const totalHeight =
    format.id === "digital-bridge-banner"
      ? normalized.height + 2.8
      : normalized.height + normalized.clearance;

  return <group position={[0, -Math.min(totalHeight * 0.46, 3.6), 0]}>{content}</group>;
}

function Scene(props: PlacementFormatTwinProps) {
  const controls = useRef(null);
  return (
    <>
      <color attach="background" args={["#d8e5e1"]} />
      <fog attach="fog" args={["#d8e5e1", 18, 34]} />
      <ambientLight intensity={1.05} />
      <hemisphereLight args={["#f6fffc", "#66736e", 1.35]} />
      <directionalLight
        position={[7, 10, 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-7, 4, -6]} intensity={0.72} color="#9ed9c4" />
      <Suspense fallback={null}>
        <FormatModel {...props} />
      </Suspense>
      <Grid
        position={[0, -3.65, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor="#94a6a0"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#789089"
        fadeDistance={22}
        fadeStrength={1.4}
        infiniteGrid
      />
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={7}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate
        autoRotateSpeed={0.55}
        target={[0, 0.3, 0]}
      />
    </>
  );
}

export default function PlacementFormatTwin(props: PlacementFormatTwinProps) {
  return (
    <div className={`placement-twin-canvas ${props.variant === "fullscreen" ? "fullscreen" : ""}`}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [9, 5.7, 10.5], fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
