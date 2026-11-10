import { useMemo } from 'react';
import * as THREE from 'three';
import { createRng } from '../../painting/math';
import { paperTex, plaster, woodFloor } from '../textures';

const Std = (p: { color: string; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }) => (
  <meshStandardMaterial color={p.color} roughness={p.roughness ?? 0.7} metalness={p.metalness ?? 0} transparent={p.transparent} opacity={p.opacity} />
);

export function Room() {
  const floor = useMemo(() => woodFloor(), []);
  const wall = useMemo(() => plaster(), []);
  const wall2 = useMemo(() => plaster('#E3DBCB'), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial map={floor} roughness={0.62} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, 2.5, -3]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, 0.06, -2.98]}><boxGeometry args={[12, 0.12, 0.03]} /><Std color="#D8CFBE" /></mesh>
      {/* left wall */}
      <mesh position={[-3.4, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[12, 5]} /><meshStandardMaterial map={wall2} roughness={0.95} /></mesh>
      {/* tall studio window on the back wall (daylight source) */}
      <group position={[-2.05, 0, -2.97]}>
        <mesh position={[0, 2.45, 0]}><planeGeometry args={[1.5, 3.1]} /><meshBasicMaterial color="#FFF7E6" toneMapped={false} /></mesh>
        <mesh position={[0, 2.45, 0.005]}><planeGeometry args={[1.5, 3.1]} /><meshBasicMaterial color="#BFD0D8" transparent opacity={0.18} /></mesh>
        {[[0, 0.88, 1.66, 0.09], [0, 4.02, 1.66, 0.09], [0, 2.45, 1.5, 0.05], [0, 1.7, 1.5, 0.035], [0, 3.22, 1.5, 0.035]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]} castShadow><boxGeometry args={[w, h, 0.08]} /><Std color="#EFEAE0" /></mesh>
        ))}
        {[[-0.79, 2.45, 0.09, 3.22], [0.79, 2.45, 0.09, 3.22], [0, 2.45, 0.04, 3.1]].map(([x, y, w, h], i) => (
          <mesh key={`v${i}`} position={[x, y, 0.03]} castShadow><boxGeometry args={[w, h, 0.08]} /><Std color="#EFEAE0" /></mesh>
        ))}
        <mesh position={[0, 0.85, 0.14]} castShadow><boxGeometry args={[1.85, 0.05, 0.3]} /><Std color="#E6DFD2" /></mesh>
        {/* soft light spill on the floor */}
        <mesh position={[0.5, 0.006, 1.8]} rotation={[-Math.PI / 2, 0, 0.35]}><planeGeometry args={[1.6, 3.2]} /><meshBasicMaterial color="#FFE9C4" transparent opacity={0.13} depthWrite={false} /></mesh>
        {/* plant on the sill */}
        <mesh position={[0.45, 0.95, 0.14]} castShadow><cylinderGeometry args={[0.07, 0.055, 0.14, 16]} /><Std color="#B0643F" /></mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`l${i}`} position={[0.45 + Math.cos(i * 1.3) * 0.06, 1.1 + i * 0.03, 0.14 + Math.sin(i * 1.3) * 0.06]} rotation={[Math.cos(i) * 0.6, i, Math.sin(i) * 0.6]} castShadow>
            <sphereGeometry args={[0.07, 10, 6]} /><Std color={i % 2 ? '#4F6B3A' : '#5F7F45'} />
          </mesh>
        ))}
      </group>
      {/* right wall */}
      <mesh position={[3.6, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[12, 5]} /><meshStandardMaterial map={wall2} roughness={0.95} /></mesh>
      {/* linen rug under easel */}
      <mesh position={[0.1, 0.004, 0.4]} rotation={[-Math.PI / 2, 0, 0.04]} receiveShadow><planeGeometry args={[2.8, 1.9]} /><Std color="#B9AC97" roughness={1} /></mesh>
    </group>
  );
}

function Brush({ pos, tilt, tip, len = 0.32 }: { pos: [number, number, number]; tilt: [number, number]; tip: string; len?: number }) {
  return (
    <group position={pos} rotation={[tilt[0], 0, tilt[1]]}>
      <mesh position={[0, len / 2, 0]} castShadow><cylinderGeometry args={[0.006, 0.009, len, 8]} /><Std color="#5C3B23" roughness={0.4} /></mesh>
      <mesh position={[0, len + 0.02, 0]}><cylinderGeometry args={[0.009, 0.007, 0.04, 8]} /><Std color="#B8B2A6" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, len + 0.055, 0]}><coneGeometry args={[0.009, 0.04, 8]} /><Std color={tip} roughness={0.9} /></mesh>
    </group>
  );
}

export function SideTable() {
  const paper = useMemo(() => paperTex('#F4EFE4'), []);
  const blobs = useMemo(() => {
    const rng = createRng(5);
    const colors = ['#B5523B', '#E9C46A', '#2F5D8A', '#3B4A2A', '#F5F1E8', '#1B1A19', '#C97B9B', '#E07A3F'];
    return colors.map((c, i) => ({ c, a: (i / colors.length) * Math.PI * 1.6 + 0.4, r: 0.16 + rng() * 0.03, s: 0.018 + rng() * 0.01 }));
  }, []);
  return (
    <group position={[1.35, 0, 0.55]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow><boxGeometry args={[0.95, 0.04, 0.58]} /><Std color="#7A5638" roughness={0.6} /></mesh>
      {[[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} castShadow><boxGeometry args={[0.04, 0.74, 0.04]} /><Std color="#6B4A30" /></mesh>
      ))}
      {/* palette with paint */}
      <group position={[-0.12, 0.785, 0.04]} rotation={[0, 0.3, 0]}>
        <mesh scale={[1, 1, 0.72]} castShadow receiveShadow><cylinderGeometry args={[0.24, 0.24, 0.012, 40]} /><Std color="#B98D5F" roughness={0.45} /></mesh>
        {blobs.map((b, i) => (
          <mesh key={i} position={[Math.cos(b.a) * b.r, 0.012, Math.sin(b.a) * b.r * 0.72]} scale={[1, 0.45, 1]}><sphereGeometry args={[b.s, 12, 8]} /><Std color={b.c} roughness={0.25} /></mesh>
        ))}
        <mesh position={[0.02, 0.009, 0.02]} scale={[1.6, 0.25, 1]}><sphereGeometry args={[0.04, 16, 8]} /><Std color="#7E8F6C" roughness={0.25} /></mesh>
      </group>
      {/* brush jar */}
      <group position={[0.3, 0.78, -0.12]}>
        <mesh castShadow><cylinderGeometry args={[0.055, 0.05, 0.16, 24, 1, true]} /><meshStandardMaterial color="#8C8577" roughness={0.35} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.075, 0]}><cylinderGeometry args={[0.05, 0.05, 0.01, 24]} /><Std color="#8C8577" /></mesh>
        <Brush pos={[0.01, -0.06, 0]} tilt={[0.08, 0.12]} tip="#2a2522" />
        <Brush pos={[-0.015, -0.06, 0.01]} tilt={[-0.1, -0.1]} tip="#C8A27A" len={0.36} />
        <Brush pos={[0.0, -0.06, -0.015]} tilt={[0.16, -0.02]} tip="#1b1a19" len={0.29} />
        <Brush pos={[0.02, -0.06, 0.015]} tilt={[-0.05, 0.2]} tip="#B5523B" len={0.34} />
      </group>
      {/* water glass */}
      <mesh position={[0.32, 0.84, 0.15]}><cylinderGeometry args={[0.045, 0.04, 0.12, 24]} /><meshStandardMaterial color="#cfe0e6" transparent opacity={0.35} roughness={0.05} /></mesh>
      {/* pencils */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.12 + i * 0.03, 0.787, 0.2]} rotation={[0, 0.2 + i * 0.08, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0045, 0.0045, 0.18, 6]} /><Std color={['#2F5D3A', '#C79A3A', '#1D1D1D'][i]} roughness={0.5} />
        </mesh>
      ))}
      {/* paper stack */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`p${i}`} position={[-0.25 + i * 0.006, 0.785 + i * 0.004, -0.17]} rotation={[0, 0.05 * i - 0.08, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.3, 0.003, 0.22]} /><meshStandardMaterial map={paper} color={['#F4EFE4', '#EDE3CF', '#C9C5BC', '#F7F3EA'][i]} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function Shelf() {
  const tubes = ['#B5523B', '#2F5D8A', '#E9C46A', '#3B4A2A', '#F5F1E8', '#5E4B8B'];
  return (
    <group position={[1.15, 0.45, -2.85]}>
      {[1.35, 1.85].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow><boxGeometry args={[1.3, 0.04, 0.26]} /><Std color="#7A5638" /></mesh>
      ))}
      {tubes.map((c, i) => (
        <group key={i} position={[-0.5 + i * 0.12, 1.43, 0.02]} rotation={[0, 0, Math.PI / 2 - 0.1 + i * 0.03]}>
          <mesh castShadow><capsuleGeometry args={[0.022, 0.1, 4, 10]} /><Std color="#E8E3D8" roughness={0.4} metalness={0.3} /></mesh>
          <mesh position={[0, 0, 0]} scale={[1.02, 0.5, 1.02]}><cylinderGeometry args={[0.023, 0.023, 0.06, 12]} /><Std color={c} /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`j${i}`} position={[-0.35 + i * 0.25, 1.95, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.14 + i * 0.03, 20]} /><Std color={['#6E5A44', '#A9A294', '#3D4A52'][i]} roughness={0.5} /></mesh>
      ))}
      <mesh position={[0.35, 1.94, 0]} rotation={[0, 0.2, 0]} castShadow><boxGeometry args={[0.28, 0.14, 0.18]} /><Std color="#4A3A2C" /></mesh>
    </group>
  );
}

export function LeaningCanvases() {
  return (
    <group>
      {[[2.4, 0.62, -2.72, 1.0, 1.24, -0.16, '#E6DFD0'], [2.05, 0.48, -2.6, 0.8, 0.95, -0.2, '#D9CDB5'], [2.85, 0.42, -2.55, 0.62, 0.84, -0.22, '#EFE9DD']].map(([x, y, z, w, h, r, c], i) => (
        <group key={i} position={[x as number, y as number, z as number]} rotation={[r as number, 0.1 * i - 0.2, 0]}>
          <mesh castShadow receiveShadow><boxGeometry args={[w as number, h as number, 0.03]} /><Std color={c as string} roughness={0.9} /></mesh>
          <mesh position={[0, 0, -0.02]}><boxGeometry args={[(w as number) - 0.04, (h as number) - 0.04, 0.012]} /><Std color="#9E8463" /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Stool() {
  return (
    <group position={[-1.05, 0, 1.05]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow><cylinderGeometry args={[0.2, 0.2, 0.05, 28]} /><Std color="#6B4A30" roughness={0.55} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.13, 0.3, Math.sin(a) * 0.13]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.62, 10]} /><Std color="#5C3F28" /></mesh>;
      })}
      <mesh position={[0.06, 0.66, 0.02]} rotation={[0, 0.4, 0]} castShadow><boxGeometry args={[0.24, 0.03, 0.18]} /><Std color="#3E4A3C" /></mesh>
    </group>
  );
}
