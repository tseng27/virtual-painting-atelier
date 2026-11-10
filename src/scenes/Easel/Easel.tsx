import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { canvasWeave } from '../textures';

const WOOD = '#8A6544';

function Beam({ from, to, w = 0.05, color = WOOD }: { from: [number, number, number]; to: [number, number, number]; w?: number; color?: string }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow receiveShadow>
      <boxGeometry args={[w, len, w * 0.8]} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
  );
}

/**
 * Wooden studio easel. The board shows the latest artwork (texture from the saved preview),
 * or a blank primed canvas. Clicking it enters the studio workflow.
 */
export function Easel({ preview, aspect, onClick }: { preview?: string; aspect: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const blank = useMemo(() => canvasWeave(), []);
  const glow = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!preview) { setTex(null); return; }
    let alive = true;
    new THREE.TextureLoader().load(preview, (t) => { if (!alive) return; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; setTex(t); });
    return () => { alive = false; };
  }, [preview]);

  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);

  const W = aspect >= 1 ? Math.min(1.5, 1.15 * aspect) : 1.15 * aspect;
  const H = W / aspect;
  const ledgeY = 0.82;
  const cy = ledgeY + 0.03 + H / 2;
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); };

  return (
    <group onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)} onClick={click}>
      {/* legs */}
      <Beam from={[-0.56, 0, 0.12]} to={[-0.1, 2.25, -0.1]} />
      <Beam from={[0.56, 0, 0.12]} to={[0.1, 2.25, -0.1]} />
      <Beam from={[0, 0, -0.85]} to={[0, 2.05, -0.12]} w={0.045} />
      {/* mast */}
      <Beam from={[0, 0.55, 0.0]} to={[0, 2.35, -0.07]} w={0.06} />
      {/* lower crossbar & ledge */}
      <Beam from={[-0.47, 0.42, 0.07]} to={[0.47, 0.42, 0.07]} w={0.04} />
      <mesh position={[0, ledgeY, 0.16]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(1.1, W + 0.2), 0.04, 0.14]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, ledgeY + 0.035, 0.225]} castShadow>
        <boxGeometry args={[Math.max(1.1, W + 0.2), 0.04, 0.015]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {/* canvas board */}
      <group position={[0, cy, 0.17]} rotation={[-0.04, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[W, H, 0.035]} />
          <meshStandardMaterial color="#E8E1D2" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.0185]}>
          <planeGeometry args={[W * 0.985, H * 0.985]} />
          <meshStandardMaterial ref={glow} map={tex ?? blank} roughness={0.85} emissive={hover ? '#C7A875' : '#000000'} emissiveIntensity={hover ? 0.12 : 0} />
        </mesh>
      </group>
      {/* top clamp */}
      <mesh position={[0, cy + H / 2 + 0.035, 0.13]} castShadow>
        <boxGeometry args={[0.22, 0.05, 0.1]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
    </group>
  );
}
