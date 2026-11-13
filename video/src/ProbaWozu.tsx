import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MARKA } from "./marka";
import { Otoczenie, WozStrazacki } from "./Woz3D";

// Próba: szczegółowy wóz strażacki na stole, kamera powoli go okrąża
const Kamera: React.FC<{ k: number }> = ({ k }) => {
  const { camera } = useThree();
  const kat = interpolate(k, [0, 240], [0.9, -0.5]);
  const odl = 5.2;
  camera.position.set(Math.sin(kat) * odl, 2.0, Math.cos(kat) * odl);
  camera.lookAt(new THREE.Vector3(0, 0.6, 0));
  return null;
};

export const ProbaWozu: React.FC = () => {
  const k = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 32, near: 0.1, far: 80 }}>
        <Kamera k={k} />
        <Otoczenie sila={0.6} />
        <color attach="background" args={["#24252C"]} />
        <ambientLight intensity={0.35} />
        <spotLight position={[3, 7, 4]} angle={0.6} penumbra={0.9} intensity={160} color="#FFE2B8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0003} shadow-radius={6} />
        <directionalLight position={[-4, 3, -2]} intensity={0.8} color="#BFCBFF" />
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[30, 0.1, 30]} />
          <meshStandardMaterial color="#6B5443" roughness={0.7} />
        </mesh>
        <WozStrazacki t={k / 30} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
