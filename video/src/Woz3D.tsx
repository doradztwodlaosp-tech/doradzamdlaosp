import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FONT } from "./marka";

// Szczegółowy wóz strażacki (średni samochód gaśniczy) zbudowany z brył w three.js.
// Wymiary w „metrach makiety”: długość ok. 2,7, szerokość 0,92, wysokość 1,35; przód w stronę +z.

// Oświetlenie „studyjne”: odbicia na lakierze, metalu i szybach (bez pobierania plików)
export const Otoczenie: React.FC<{ sila?: number }> = ({ sila = 0.55 }) => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = sila;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, sila]);
  return null;
};

const zaokr = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);

const plotno = (w: number, h: number, rysuj: (c: CanvasRenderingContext2D) => void) => {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  rysuj(el.getContext("2d")!);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const useMaterialy = () =>
  useMemo(() => {
    const roleta = plotno(256, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, "#9EA3AC");
      g.addColorStop(0.5, "#D5D8DE");
      g.addColorStop(1, "#A3A8B1");
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 512);
      for (let y = 0; y < 512; y += 16) {
        c.fillStyle = "rgba(40,44,52,0.55)";
        c.fillRect(0, y, 256, 3);
        c.fillStyle = "rgba(255,255,255,0.35)";
        c.fillRect(0, y + 3, 256, 2);
      }
      c.fillStyle = "#5B606A";
      c.fillRect(0, 470, 256, 42);
      c.fillStyle = "#2B2E35";
      c.fillRect(100, 480, 56, 14);
    });
    const drzwi = plotno(512, 256, (c) => {
      c.fillStyle = "#B5150F";
      c.fillRect(0, 0, 512, 256);
      c.fillStyle = "#F4F4F4";
      c.font = `800 120px ${FONT}`;
      c.textAlign = "center";
      c.fillText("OSP", 256, 150);
      c.fillStyle = "#F4F4F4";
      c.fillRect(0, 200, 512, 18);
    });
    const pas = plotno(512, 64, (c) => {
      for (let x = -64; x < 512; x += 64) {
        c.fillStyle = "#F2D21B";
        c.beginPath();
        c.moveTo(x, 64);
        c.lineTo(x + 32, 64);
        c.lineTo(x + 64, 0);
        c.lineTo(x + 32, 0);
        c.fill();
        c.fillStyle = "#C21B12";
        c.beginPath();
        c.moveTo(x + 32, 64);
        c.lineTo(x + 64, 64);
        c.lineTo(x + 96, 0);
        c.lineTo(x + 64, 0);
        c.fill();
      }
    });
    pas.wrapS = THREE.RepeatWrapping;
    pas.repeat.set(4, 1);
    const krata = plotno(256, 128, (c) => {
      c.fillStyle = "#16171B";
      c.fillRect(0, 0, 256, 128);
      for (let y = 8; y < 128; y += 14) {
        c.fillStyle = "#3A3D45";
        c.fillRect(8, y, 240, 6);
      }
    });
    return {
      lakier: new THREE.MeshPhysicalMaterial({ color: "#B5150F", roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 }),
      lakierCiemny: new THREE.MeshPhysicalMaterial({ color: "#7E0E0A", roughness: 0.45, clearcoat: 0.6 }),
      bialy: new THREE.MeshStandardMaterial({ color: "#F1F1EF", roughness: 0.4 }),
      czarny: new THREE.MeshStandardMaterial({ color: "#17181C", roughness: 0.75 }),
      grafit: new THREE.MeshStandardMaterial({ color: "#2C2F36", roughness: 0.55, metalness: 0.3 }),
      guma: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.92 }),
      chrom: new THREE.MeshStandardMaterial({ color: "#E4E7EC", roughness: 0.12, metalness: 1 }),
      aluminium: new THREE.MeshStandardMaterial({ color: "#C3C7CE", roughness: 0.35, metalness: 0.85 }),
      szyba: new THREE.MeshPhysicalMaterial({ color: "#2A3a4C", roughness: 0.03, metalness: 0.6, clearcoat: 1 }),
      roleta: new THREE.MeshStandardMaterial({ map: roleta, roughness: 0.45, metalness: 0.45 }),
      drzwi: new THREE.MeshPhysicalMaterial({ map: drzwi, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
      pas: new THREE.MeshStandardMaterial({ map: pas, roughness: 0.5, emissive: "#ffffff", emissiveMap: pas, emissiveIntensity: 0.08 }),
      krata: new THREE.MeshStandardMaterial({ map: krata, roughness: 0.6, metalness: 0.4 }),
      reflektor: new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFF6E0", emissiveIntensity: 1.6, roughness: 0.1 }),
      tylne: new THREE.MeshStandardMaterial({ color: "#FF2A1A", emissive: "#FF2010", emissiveIntensity: 1.2 }),
      pomaranczowy: new THREE.MeshStandardMaterial({ color: "#FF9A1F", emissive: "#FF8A00", emissiveIntensity: 0.6 }),
    };
  }, []);

const Kolo: React.FC<{ x: number; z: number; obrot: number; m: ReturnType<typeof useMaterialy> }> = ({ x, z, obrot, m }) => {
  const opona = useMemo(() => {
    // profil opony obracany wokół osi: zaokrąglone barki
    const p: THREE.Vector2[] = [];
    const R = 0.21;
    const r = 0.125;
    const s = 0.075;
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      p.push(new THREE.Vector2(R - 0.025 + Math.cos(a) * 0.025, Math.sin(a) * s));
    }
    p.unshift(new THREE.Vector2(r, -s));
    p.push(new THREE.Vector2(r, s));
    return new THREE.LatheGeometry(p, 40);
  }, []);
  const strona = x > 0 ? 1 : -1;
  return (
    <group position={[x, 0.21, z]} rotation={[obrot, 0, 0]}>
      <mesh geometry={opona} rotation={[0, 0, Math.PI / 2]} material={m.guma} castShadow />
      <mesh rotation={[0, 0, Math.PI / 2]} position={[strona * 0.005, 0, 0]} material={m.aluminium}>
        <cylinderGeometry args={[0.125, 0.125, 0.13, 32]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[strona * 0.07, 0, 0]} material={m.chrom}>
        <cylinderGeometry args={[0.05, 0.06, 0.03, 24]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[strona * 0.068, Math.cos(a) * 0.088, Math.sin(a) * 0.088]} rotation={[0, 0, Math.PI / 2]} material={m.grafit}>
            <cylinderGeometry args={[0.011, 0.011, 0.012, 10]} />
          </mesh>
        );
      })}
    </group>
  );
};

export const WozStrazacki: React.FC<{ t: number; droga?: number; sygnaly?: boolean }> = ({ t, droga = 0, sygnaly = true }) => {
  const m = useMaterialy();
  const obrotKol = -droga / 0.21;
  const g = useMemo(
    () => ({
      kabina: zaokr(0.92, 0.82, 0.92, 0.07),
      zabudowa: zaokr(0.94, 0.94, 1.72, 0.05),
      dach: zaokr(0.9, 0.05, 1.68, 0.02),
      zderzak: zaokr(0.96, 0.12, 0.12, 0.03),
      blotnik: zaokr(0.2, 0.06, 0.52, 0.025),
      lampa: zaokr(0.16, 0.08, 0.04, 0.015),
      lusterko: zaokr(0.035, 0.2, 0.09, 0.012),
      belka: zaokr(0.72, 0.06, 0.16, 0.025),
      kogut: zaokr(0.15, 0.07, 0.12, 0.02),
    }),
    [],
  );
  // spokojne pulsowanie zamiast szybkiego migania (szybkie błyski męczą wzrok na ekranie telefonu)
  const blysk = sygnaly ? 0.5 + 0.5 * Math.sin(t * 3.2) : 0;
  const nieb = (on: number) => new THREE.MeshStandardMaterial({ color: "#2F6BFF", emissive: "#2F6BFF", emissiveIntensity: 0.25 + on * 3.2, roughness: 0.2, transparent: true, opacity: 0.95 });
  const n1 = useMemo(() => nieb(blysk), [blysk]);
  const n2 = useMemo(() => nieb(sygnaly ? 1 - blysk : 0), [blysk, sygnaly]);
  const strony = [-1, 1];
  const ROLETY: [number, number][] = [
    [-1.22, -0.7],
    [-0.66, -0.13],
    [-0.09, 0.37],
  ];
  return (
    <group>
      {/* rama i podwozie */}
      <mesh position={[0, 0.27, -0.1]} material={m.czarny} castShadow>
        <boxGeometry args={[0.7, 0.12, 2.5]} />
      </mesh>
      {/* kabina załogowa */}
      <mesh geometry={g.kabina} position={[0, 0.74, 0.89]} material={m.lakier} castShadow receiveShadow />
      {/* szyba przednia i boczne */}
      <mesh position={[0, 0.94, 1.352]} material={m.szyba}>
        <planeGeometry args={[0.8, 0.3]} />
      </mesh>
      {strony.map((s) => (
        <group key={s}>
          {[1.16, 0.74].map((z, i) => (
            <mesh key={z} position={[s * 0.461, 0.95, z]} rotation={[0, s * Math.PI / 2, 0]} material={m.szyba}>
              <planeGeometry args={[i === 0 ? 0.3 : 0.4, 0.24]} />
            </mesh>
          ))}
          <mesh position={[s * 0.462, 0.62, 1.12]} rotation={[0, s * Math.PI / 2, 0]} material={m.drzwi}>
            <planeGeometry args={[0.36, 0.18]} />
          </mesh>
          {/* linie drzwi */}
          {[0.96, 0.53].map((z) => (
            <mesh key={z} position={[s * 0.462, 0.73, z]} rotation={[0, s * Math.PI / 2, 0]} material={m.lakierCiemny}>
              <planeGeometry args={[0.008, 0.62]} />
            </mesh>
          ))}
          {/* klamki */}
          {[0.99, 0.56].map((z) => (
            <mesh key={z} position={[s * 0.467, 0.82, z]} material={m.chrom}>
              <boxGeometry args={[0.01, 0.018, 0.07]} />
            </mesh>
          ))}
          {/* lusterko na ramieniu */}
          <mesh position={[s * 0.53, 0.98, 1.27]} material={m.czarny}>
            <boxGeometry args={[0.13, 0.015, 0.015]} />
          </mesh>
          <mesh geometry={g.lusterko} position={[s * 0.6, 0.94, 1.27]} material={m.czarny} castShadow />
          {/* rolety skrytek */}
          {ROLETY.map(([a, b]) => (
            <mesh key={a} position={[s * 0.472, 0.83, (a + b) / 2]} rotation={[0, s * Math.PI / 2, 0]} material={m.roleta}>
              <planeGeometry args={[b - a, 0.72]} />
            </mesh>
          ))}
          {/* pas ostrzegawczy */}
          <mesh position={[s * 0.473, 0.39, -0.42]} rotation={[0, s * Math.PI / 2, 0]} material={m.pas}>
            <planeGeometry args={[1.66, 0.06]} />
          </mesh>
          <mesh position={[s * 0.463, 0.39, 0.89]} rotation={[0, s * Math.PI / 2, 0]} material={m.bialy}>
            <planeGeometry args={[0.88, 0.045]} />
          </mesh>
          {/* stopnie */}
          <mesh position={[s * 0.44, 0.3, 0.75]} material={m.aluminium}>
            <boxGeometry args={[0.1, 0.02, 0.3]} />
          </mesh>
          {/* błotniki */}
          {[1.02, -0.78].map((z) => (
            <mesh key={z} geometry={g.blotnik} position={[s * 0.4, 0.45, z]} material={m.czarny} />
          ))}
          {/* boczne światła obrysowe */}
          {[-1.0, -0.4, 0.2].map((z) => (
            <mesh key={z} position={[s * 0.474, 0.33, z]} material={m.pomaranczowy}>
              <boxGeometry args={[0.005, 0.025, 0.05]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* zabudowa */}
      <mesh geometry={g.zabudowa} position={[0, 0.81, -0.42]} material={m.lakier} castShadow receiveShadow />
      <mesh geometry={g.dach} position={[0, 1.3, -0.42]} material={m.aluminium} />
      {/* drabina na dachu */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 1.38, -0.2]} material={m.aluminium} castShadow>
          <boxGeometry args={[0.035, 0.035, 2.0]} />
        </mesh>
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[0, 1.38, -1.15 + i * 0.16]} material={m.aluminium}>
          <boxGeometry args={[0.4, 0.018, 0.022]} />
        </mesh>
      ))}
      {[-0.9, 0.5].map((z) => (
        <mesh key={z} position={[0, 1.34, z]} material={m.czarny}>
          <boxGeometry args={[0.5, 0.05, 0.05]} />
        </mesh>
      ))}
      {/* belka sygnalizacyjna na kabinie */}
      <mesh geometry={g.belka} position={[0, 1.18, 1.05]} material={m.czarny} castShadow />
      <mesh geometry={g.kogut} position={[-0.25, 1.24, 1.05]} material={n1} />
      <mesh geometry={g.kogut} position={[0.25, 1.24, 1.05]} material={n2} />
      <mesh position={[0, 1.235, 1.05]} material={m.bialy}>
        <boxGeometry args={[0.28, 0.05, 0.1]} />
      </mesh>
      {/* przód: krata, reflektory, zderzak, niebieskie światła w kracie */}
      <mesh position={[0, 0.55, 1.352]} material={m.krata}>
        <planeGeometry args={[0.5, 0.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={g.lampa} position={[s * 0.33, 0.5, 1.345]} material={m.reflektor} />
          <mesh position={[s * 0.33, 0.44, 1.352]} material={m.pomaranczowy}>
            <boxGeometry args={[0.1, 0.025, 0.01]} />
          </mesh>
          <mesh position={[s * 0.15, 0.68, 1.356]} material={s < 0 ? n1 : n2}>
            <boxGeometry args={[0.08, 0.03, 0.01]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={g.zderzak} position={[0, 0.33, 1.37]} material={m.grafit} castShadow />
      <mesh position={[0, 0.33, 1.432]} material={m.bialy}>
        <planeGeometry args={[0.2, 0.05]} />
      </mesh>
      {/* tył: światła, drabinka */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, 0.45, -1.285]} material={m.tylne}>
          <boxGeometry args={[0.12, 0.08, 0.01]} />
        </mesh>
      ))}
      <mesh position={[0, 0.8, -1.288]} rotation={[0, Math.PI, 0]} material={m.roleta}>
        <planeGeometry args={[0.7, 0.75]} />
      </mesh>
      <mesh position={[0, 0.39, -1.286]} rotation={[0, Math.PI, 0]} material={m.pas}>
        <planeGeometry args={[0.92, 0.07]} />
      </mesh>
      {/* koła */}
      {[1.02, -0.78].map((z) => strony.map((s) => <Kolo key={`${z}${s}`} x={s * 0.39} z={z} obrot={obrotKol} m={m} />))}
      {/* światło reflektorów na ziemi */}
      {sygnaly ? <pointLight position={[0, 0.5, 1.8]} intensity={1.6} distance={2.5} color="#FFF3DA" /> : null}
    </group>
  );
};
