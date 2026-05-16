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

/** Maps channel index → approximate 3D position for a generic car silhouette. */
const CHANNEL_POSITIONS: Record<number, [number, number, number]> = {
  // Front turn signals
  0: [-0.9, 0.3, 2.1],
  1: [-0.5, 0.3, 2.1],
  2: [0.5, 0.3, 2.1],
  3: [0.9, 0.3, 2.1],
  // Front DRLs
  4: [-0.8, 0.35, 2.1],
  5: [-0.4, 0.35, 2.1],
  6: [0.4, 0.35, 2.1],
  7: [0.8, 0.35, 2.1],
  // Front fog
  8: [-0.7, 0.1, 2.1],
  9: [-0.35, 0.1, 2.1],
  10: [0.35, 0.1, 2.1],
  11: [0.7, 0.1, 2.1],
  // Front main beams
  12: [-0.6, 0.3, 2.15],
  13: [-0.3, 0.3, 2.15],
  14: [0.3, 0.3, 2.15],
  15: [0.6, 0.3, 2.15],
  // Rear turn signals
  16: [-0.9, 0.3, -2.1],
  17: [-0.5, 0.3, -2.1],
  18: [0.5, 0.3, -2.1],
  19: [0.9, 0.3, -2.1],
  // Rear brake/position
  20: [-0.8, 0.35, -2.15],
  21: [-0.4, 0.35, -2.15],
  22: [0.4, 0.35, -2.15],
  23: [0.8, 0.35, -2.15],
  // Rear fog
  24: [-0.7, 0.2, -2.15],
  25: [-0.35, 0.2, -2.15],
  26: [0.35, 0.2, -2.15],
  27: [0.7, 0.2, -2.15],
  // Reverse
  28: [-0.5, 0.2, -2.2],
  29: [-0.25, 0.2, -2.2],
  30: [0.25, 0.2, -2.2],
  31: [0.5, 0.2, -2.2],
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
  // Stable color — created once, not recreated per frame
  const color = useMemo(() => new THREE.Color(1, 0.9, 0.5), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const fi = frameRef.current;
    const frame = channelValues[Math.min(fi, channelValues.length - 1)] ?? [];
    const intensity = (frame[channelIndex] ?? 0) / 255;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} />
    </mesh>
  );
}

function CarBody() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[1.8, 0.6, 4.2]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.4} />
    </mesh>
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
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
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
      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
      <gridHelper args={[20, 20, "#333", "#222"]} />
    </>
  );
}

export default function PreviewCanvas({ timeline, model: _model, playbackRef }: Props) {
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden bg-zinc-950">
      <Canvas camera={{ position: [0, 2, 6], fov: 45 }}>
        <Scene timeline={timeline} playbackRef={playbackRef} />
      </Canvas>
    </div>
  );
}
