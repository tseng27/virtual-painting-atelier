import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Lighting } from '../Lighting/Lighting';
import { Easel } from '../Easel/Easel';
import { LeaningCanvases, Room, Shelf, SideTable, Stool } from './Props';

export interface StudioSceneProps {
  preview?: string;
  aspect: number;
  lite: boolean;
  entering: boolean;
  onEaselClick: () => void;
  onEntered: () => void;
}

const LOOK = new THREE.Vector3(0, 1.32, 0);
const START = new THREE.Vector3(0.9, 2.0, 7.4);
const REST = new THREE.Vector3(0.25, 1.62, 4.6);
const CLOSE = new THREE.Vector3(0, 1.42, 1.45);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Intro dolly, gentle mouse parallax, and the push-in to the easel when entering. */
function CameraRig({ entering, onEntered }: { entering: boolean; onEntered: () => void }) {
  const { camera, pointer } = useThree();
  const t0 = useRef(performance.now());
  const enterT = useRef<number | null>(null);
  const from = useRef(new THREE.Vector3());
  const look = useRef(LOOK.clone());
  const done = useRef(false);
  useEffect(() => {
    if (entering && enterT.current === null) { enterT.current = performance.now(); from.current.copy(camera.position); }
  }, [entering, camera]);
  useFrame(() => {
    const now = performance.now();
    if (enterT.current !== null) {
      const k = Math.min(1, (now - enterT.current) / 1200);
      camera.position.lerpVectors(from.current, CLOSE, ease(k));
      look.current.lerp(new THREE.Vector3(0, 1.42, 0), 0.12);
      camera.lookAt(look.current);
      if (k >= 1 && !done.current) { done.current = true; onEntered(); }
      return;
    }
    const k = ease(Math.min(1, (now - t0.current) / 2600));
    const base = START.clone().lerp(REST, k);
    const target = base.add(new THREE.Vector3(pointer.x * 0.35, pointer.y * 0.16, 0));
    camera.position.lerp(target, k < 1 ? 1 : 0.05);
    camera.lookAt(look.current);
  });
  return null;
}

export default function StudioScene(p: StudioSceneProps) {
  return (
    <Canvas
      shadows={!p.lite}
      dpr={p.lite ? 1 : [1, 1.75]}
      camera={{ position: START.toArray(), fov: 38, near: 0.05, far: 40 }}
      gl={{ antialias: !p.lite, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      data-testid="studio-canvas"
    >
      <color attach="background" args={['#1a1714']} />
      <fog attach="fog" args={['#2a241e', 9, 18]} />
      <CameraRig entering={p.entering} onEntered={p.onEntered} />
      <Lighting lite={p.lite} />
      <Room />
      <Easel preview={p.preview} aspect={p.aspect} onClick={p.onEaselClick} />
      <SideTable />
      <Shelf />
      <LeaningCanvases />
      <Stool />
    </Canvas>
  );
}
