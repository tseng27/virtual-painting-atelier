/** Window daylight (key), warm bounce and soft sky fill. */
export function Lighting({ lite }: { lite: boolean }) {
  return (
    <>
      <hemisphereLight args={['#F4EEE2', '#5A4330', 0.65]} />
      <ambientLight intensity={0.18} color="#FFF4E2" />
      <directionalLight
        position={[-4.5, 5.2, 3.2]}
        intensity={2.4}
        color="#FFF2DC"
        castShadow={!lite}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[2.4, 2.6, 2.5]} intensity={6} distance={9} color="#FFD9A8" />
      <spotLight position={[0.2, 3.4, 2.2]} angle={0.42} penumbra={0.8} intensity={14} distance={8} color="#FFF0D8" target-position={[0, 1.3, 0]} castShadow={false} />
    </>
  );
}
