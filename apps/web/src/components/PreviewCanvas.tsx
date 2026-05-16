"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ShowTimeline, TeslaModel } from "@tesla-light-show/shared";

const FRAME_INTERVAL_MS = 20;

interface Props {
  timeline: ShowTimeline;
  model: TeslaModel;
  playbackRef?: React.MutableRefObject<number>;
}

// ---------------------------------------------------------------------------
// Channel layout — derived from our internal generator ordering (0-indexed).
// NOTE: This is our app-internal channel order used consistently between
// timeline_generator.py and this preview.  The official Tesla xLights order
// (from Tesla Model S.xmodel) uses a different per-side layout; that
// reconciliation is tracked in docs/architecture.md.
//
// Per-channel light colour, based on real Tesla lamp function:
//   AMBER  – front/rear turn signals, side markers / aux park
//   WHITE  – headlamps (outer/inner main beam, signature, DRL / Ch4-6, fog, reverse)
//   RED    – rear brake / tail / rear fog
// ---------------------------------------------------------------------------

/** RGB colour [0-1] for each channel's emissive material. */
const CHANNEL_COLOR: Record<number, [number, number, number]> = {
  // Front turn signals → AMBER
  0: [1.0, 0.55, 0.0], 1: [1.0, 0.55, 0.0], 2: [1.0, 0.55, 0.0], 3: [1.0, 0.55, 0.0],
  // Front DRL / Ch4-6 → COOL WHITE
  4: [0.85, 0.95, 1.0], 5: [0.85, 0.95, 1.0], 6: [0.85, 0.95, 1.0], 7: [0.85, 0.95, 1.0],
  // Front fog → WARM WHITE
  8: [1.0, 0.92, 0.75], 9: [1.0, 0.92, 0.75], 10: [1.0, 0.92, 0.75], 11: [1.0, 0.92, 0.75],
  // Front main beams → BRIGHT WHITE
  12: [1.0, 1.0, 1.0], 13: [1.0, 1.0, 1.0], 14: [1.0, 1.0, 1.0], 15: [1.0, 1.0, 1.0],
  // Rear turn signals → AMBER
  16: [1.0, 0.55, 0.0], 17: [1.0, 0.55, 0.0], 18: [1.0, 0.55, 0.0], 19: [1.0, 0.55, 0.0],
  // Rear brake / tail → RED
  20: [1.0, 0.04, 0.04], 21: [1.0, 0.04, 0.04], 22: [1.0, 0.04, 0.04], 23: [1.0, 0.04, 0.04],
  // Rear fog → DEEP RED
  24: [0.75, 0.0, 0.0], 25: [0.75, 0.0, 0.0], 26: [0.75, 0.0, 0.0], 27: [0.75, 0.0, 0.0],
  // Reverse → WHITE
  28: [1.0, 1.0, 0.9], 29: [1.0, 1.0, 0.9], 30: [1.0, 1.0, 0.9], 31: [1.0, 1.0, 0.9],
};

/** Maps channel index → [x, y, z] position on a generic car silhouette.
 *  Z positive = front, Z negative = rear.  X negative = driver/left side.
 *
 *  Car body box extends ±2.20 on the Z axis; bumper face meshes sit at ±2.22.
 *  All light spheres are placed at z=±2.26 so they appear ON the bumper face
 *  rather than being hidden inside the body geometry. */
const CHANNEL_POSITIONS: Record<number, [number, number, number]> = {
  // ── Front turn signals (outermost, mid-height) ──────────────────────────
  0: [-0.88, 0.38, 2.26],   // L front turn
  1: [-0.55, 0.38, 2.26],   // L-inner front turn (Model S/X only)
  2: [ 0.55, 0.38, 2.26],   // R-inner front turn
  3: [ 0.88, 0.38, 2.26],   // R front turn

  // ── Front DRL / Ch4-6 (signature strip, upper) ──────────────────────────
  4: [-0.72, 0.50, 2.26],   // L outer DRL
  5: [-0.42, 0.50, 2.26],   // L mid DRL
  6: [ 0.42, 0.50, 2.26],   // R mid DRL
  7: [ 0.72, 0.50, 2.26],   // R outer DRL

  // ── Front fog (lower bumper) ─────────────────────────────────────────────
  8: [-0.65, 0.12, 2.26],   // L fog
  9: [-0.35, 0.12, 2.26],   // L-inner fog / aux park
  10: [ 0.35, 0.12, 2.26],  // R-inner fog / aux park
  11: [ 0.65, 0.12, 2.26],  // R fog

  // ── Front main beams (inner headlamp, high) ──────────────────────────────
  12: [-0.58, 0.44, 2.26],  // L outer main beam
  13: [-0.32, 0.44, 2.26],  // L inner main beam
  14: [ 0.32, 0.44, 2.26],  // R inner main beam
  15: [ 0.58, 0.44, 2.26],  // R outer main beam

  // ── Rear turn signals (outermost tail-lamp) ──────────────────────────────
  16: [-0.88, 0.44, -2.26], // L rear turn
  17: [-0.55, 0.44, -2.26], // L-inner rear turn
  18: [ 0.55, 0.44, -2.26], // R-inner rear turn
  19: [ 0.88, 0.44, -2.26], // R rear turn

  // ── Rear brake / tail (inner tail-lamp area) ─────────────────────────────
  20: [-0.70, 0.48, -2.26], // L tail
  21: [-0.40, 0.48, -2.26], // L brake
  22: [ 0.40, 0.48, -2.26], // R brake
  23: [ 0.70, 0.48, -2.26], // R tail

  // ── Rear fog (lower bumper) ───────────────────────────────────────────────
  24: [-0.45, 0.12, -2.26], // L rear fog
  25: [-0.20, 0.12, -2.26], // L inner rear fog
  26: [ 0.20, 0.12, -2.26], // R inner rear fog
  27: [ 0.45, 0.12, -2.26], // R rear fog

  // ── Reverse lights (lower bumper, centre-out) ────────────────────────────
  28: [-0.30, 0.10, -2.26], // L reverse
  29: [-0.12, 0.10, -2.26], // L-inner reverse
  30: [ 0.12, 0.10, -2.26], // R-inner reverse
  31: [ 0.30, 0.10, -2.26], // R reverse
};


function LightBulb({
  position,
  channelIndex,
  channelValues,
  frameRef,
}: {
  position: [number, number, number];
  channelIndex: number;
  channelValues: number[][];
  frameRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Each channel has its own fixed colour; stable — created once.
  const rgb = CHANNEL_COLOR[channelIndex] ?? [1, 1, 1];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const color = useMemo(() => new THREE.Color(...rgb as [number, number, number]), [channelIndex]);

  useFrame(() => {
    if (!meshRef.current) return;
    const fi = frameRef.current;
    const frame = channelValues[Math.min(fi, channelValues.length - 1)] ?? [];
    const raw = (frame[channelIndex] ?? 0) / 255;
    // Use a light minimum so dim/off channels are visible as dark resting state
    const intensity = raw > 0.01 ? raw * 6.0 : 0.0;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.09, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} />
    </mesh>
  );
}

/** Simple multi-piece car body — silver/slate so it reads clearly against the dark background. */
function CarBody() {
  return (
    <group>
      {/* Main body — medium slate silver */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.82, 0.64, 4.4]} />
        <meshStandardMaterial color="#6b7280" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Cabin / glasshouse — slightly darker tinted */}
      <mesh position={[0, 0.88, -0.25]}>
        <boxGeometry args={[1.65, 0.52, 2.3]} />
        <meshStandardMaterial color="#374151" metalness={0.3} roughness={0.55} />
      </mesh>
      {/* Front bumper face — blue tint: clear FRONT indicator */}
      <mesh position={[0, 0.28, 2.22]}>
        <boxGeometry args={[1.82, 0.56, 0.05]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Rear bumper face — red tint: clear REAR indicator */}
      <mesh position={[0, 0.28, -2.22]}>
        <boxGeometry args={[1.82, 0.56, 0.05]} />
        <meshStandardMaterial color="#991b1b" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Thin FRONT stripe (bright blue) above bumper */}
      <mesh position={[0, 0.63, 2.23]}>
        <boxGeometry args={[1.82, 0.04, 0.05]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.4} />
      </mesh>
      {/* Thin REAR stripe (bright red) above bumper */}
      <mesh position={[0, 0.63, -2.23]}>
        <boxGeometry args={[1.82, 0.04, 0.05]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** Advances the frame index and renders all animated light bulbs. */
function Scene({
  timeline,
  playbackRef,
}: {
  timeline: ShowTimeline;
  playbackRef?: React.MutableRefObject<number>;
}) {
  const frameRef = useRef(0);
  const totalFrames = timeline.channel_values.length;

  useFrame((state) => {
    // Use audio playback time when available, otherwise loop with R3F clock.
    const audioTime = playbackRef?.current ?? 0;
    const t = audioTime > 0 ? audioTime : state.clock.getElapsedTime();
    const fi = Math.floor((t * 1000) / FRAME_INTERVAL_MS);
    frameRef.current = audioTime > 0 ? Math.min(fi, totalFrames - 1) : fi % totalFrames;
  });

  return (
    <>
      {/* Scene background — dark navy, clearly not pitch-black */}
      <color attach="background" args={["#1a2035"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 7]} intensity={1.1} />
      <directionalLight position={[-5, 4, -7]} intensity={0.45} color="#c7d2fe" />
      <pointLight position={[0, 4, 0]} intensity={0.6} color="#ffffff" />
      <CarBody />
      {Object.entries(CHANNEL_POSITIONS).map(([chStr, pos]) => (
        <LightBulb
          key={chStr}
          position={pos}
          channelIndex={Number(chStr)}
          channelValues={timeline.channel_values}
          frameRef={frameRef}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={3} maxDistance={14} />
      <gridHelper args={[20, 20, "#334155", "#1e293b"]} />
    </>
  );
}

export default function PreviewCanvas({ timeline, model: _model, playbackRef }: Props) {
  return (
    <div className="space-y-2">
      <div className="w-full h-80 rounded-lg overflow-hidden bg-[#1a2035]">
        <Canvas camera={{ position: [3.5, 2.5, 6], fov: 42 }}>
          <Scene timeline={timeline} playbackRef={playbackRef} />
        </Canvas>
      </div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-white ring-1 ring-zinc-600" />
          Headlights / DRL / Reverse
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
          Turn signals / Side markers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
          Brake / Tail / Rear fog
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-zinc-500">
          Drag to orbit · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
