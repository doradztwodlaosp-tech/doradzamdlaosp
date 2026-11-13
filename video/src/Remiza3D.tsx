import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Makieta remizy OSP z detalami: tynk, dachówka, cokół z cegły, okna w ramach, rynny, lampy, wieża z syreną.
// Front (bramy) w stronę +z. Wymiary bryły: 2,6 × 1,1 × 1,6.

const plotno = (w: number, h: number, rysuj: (c: CanvasRenderingContext2D) => void, powt?: [number, number]) => {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  rysuj(el.getContext("2d")!);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (powt) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(powt[0], powt[1]);
  }
  return t;
};

// deterministyczny „losowy” szum
const los = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const useTekstury = () =>
  useMemo(() => {
    const tynk = plotno(
      512,
      512,
      (c) => {
        c.fillStyle = "#D9CDB6";
        c.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 9000; i++) {
          const v = los(i) > 0.5 ? 255 : 0;
          c.fillStyle = `rgba(${v},${v},${v},${0.035 + los(i + 7) * 0.05})`;
          c.fillRect(los(i + 1) * 512, los(i + 2) * 512, 2, 2);
        }
      },
      [3, 2],
    );
    const dachowka = plotno(
      512,
      512,
      (c) => {
        c.fillStyle = "#6E2A1E";
        c.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 32) {
          for (let x = (y / 32) % 2 ? -16 : 0; x < 512; x += 32) {
            const g = c.createLinearGradient(0, y, 0, y + 32);
            const k = 0.85 + los(x * 3 + y) * 0.3;
            g.addColorStop(0, `rgb(${Math.round(150 * k)},${Math.round(62 * k)},${Math.round(44 * k)})`);
            g.addColorStop(1, `rgb(${Math.round(95 * k)},${Math.round(36 * k)},${Math.round(26 * k)})`);
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(x + 1, y);
            c.lineTo(x + 31, y);
            c.lineTo(x + 31, y + 22);
            c.quadraticCurveTo(x + 16, y + 34, x + 1, y + 22);
            c.closePath();
            c.fill();
          }
        }
      },
      [5, 2],
    );
    const cegla = plotno(
      512,
      128,
      (c) => {
        c.fillStyle = "#9B9387";
        c.fillRect(0, 0, 512, 128);
        for (let y = 0; y < 128; y += 21) {
          for (let x = (y / 21) % 2 ? -24 : 0; x < 512; x += 48) {
            const k = 0.85 + los(x + y * 7) * 0.3;
            c.fillStyle = `rgb(${Math.round(140 * k)},${Math.round(58 * k)},${Math.round(40 * k)})`;
            c.fillRect(x + 2, y + 2, 44, 17);
          }
        }
      },
      [6, 1],
    );
    const beton = plotno(
      256,
      256,
      (c) => {
        c.fillStyle = "#77746F";
        c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 3000; i++) {
          c.fillStyle = `rgba(${los(i) > 0.5 ? "255,255,255" : "0,0,0"},0.05)`;
          c.fillRect(los(i + 3) * 256, los(i + 4) * 256, 2, 2);
        }
        c.fillStyle = "rgba(0,0,0,0.25)";
        c.fillRect(126, 0, 3, 256);
      },
      [2, 1],
    );
    const zaluzja = plotno(128, 128, (c) => {
      c.fillStyle = "#2A2420";
      c.fillRect(0, 0, 128, 128);
      for (let y = 6; y < 128; y += 16) {
        c.fillStyle = "#6E6255";
        c.fillRect(6, y, 116, 7);
      }
    });
    return { tynk, dachowka, cegla, beton, zaluzja };
  }, []);

const Okno: React.FC<{ p: [number, number, number]; ry?: number; w?: number; h?: number; swieci?: number }> = ({ p, ry = 0, w = 0.28, h = 0.34, swieci = 1 }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh position={[0, 0, 0.012]}>
      <boxGeometry args={[w + 0.05, h + 0.05, 0.025]} />
      <meshStandardMaterial color="#F3F1EC" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.026]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#FFCF86" emissive="#FFB65C" emissiveIntensity={0.55 * swieci} roughness={0.1} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0, 0.03]}>
      <boxGeometry args={[0.018, h, 0.01]} />
      <meshStandardMaterial color="#F3F1EC" />
    </mesh>
    <mesh position={[0, h * 0.18, 0.03]}>
      <boxGeometry args={[w, 0.018, 0.01]} />
      <meshStandardMaterial color="#F3F1EC" />
    </mesh>
    <mesh position={[0, -h / 2 - 0.03, 0.04]}>
      <boxGeometry args={[w + 0.08, 0.025, 0.06]} />
      <meshStandardMaterial color="#C9C4BA" roughness={0.6} />
    </mesh>
  </group>
);

export const BudynekRemizy: React.FC<{ otwarcie: number; t: number; brama: THREE.Texture; szyld: THREE.Texture }> = ({ otwarcie, t, brama, szyld }) => {
  const tx = useTekstury();
  const g = useMemo(() => {
    const SPAD = Math.atan2(0.62, 0.95);
    const DL = Math.hypot(0.95, 0.62) + 0.14;
    const szczyt = new THREE.Shape();
    szczyt.moveTo(-0.8, 0);
    szczyt.lineTo(0.8, 0);
    szczyt.lineTo(0, 0.52);
    szczyt.closePath();
    return {
      SPAD,
      DL,
      sciany: new RoundedBoxGeometry(2.6, 1.1, 1.6, 2, 0.015),
      szczyt: new THREE.ExtrudeGeometry(szczyt, { depth: 0.02, bevelEnabled: false }),
      wieza: new RoundedBoxGeometry(0.52, 1.6, 0.52, 2, 0.015),
    };
  }, []);
  const tynk = useMemo(() => new THREE.MeshStandardMaterial({ map: tx.tynk, roughness: 0.92 }), [tx]);
  const dach = useMemo(() => new THREE.MeshStandardMaterial({ map: tx.dachowka, roughness: 0.65 }), [tx]);
  const blacha = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5B5F66", roughness: 0.35, metalness: 0.8 }), []);
  const syrena = 0.5 + 0.5 * Math.sin(t * 3);
  return (
    <group>
      {/* plac przed bramami */}
      <mesh position={[0, 0.006, 1.45]} receiveShadow>
        <boxGeometry args={[2.9, 0.012, 1.3]} />
        <meshStandardMaterial map={tx.beton} roughness={0.9} />
      </mesh>
      {/* cokół i ściany */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.64, 0.16, 1.64]} />
        <meshStandardMaterial map={tx.cegla} roughness={0.85} />
      </mesh>
      <mesh geometry={g.sciany} position={[0, 0.63, 0]} material={tynk} castShadow receiveShadow />
      <mesh position={[0, 1.19, 0]} castShadow>
        <boxGeometry args={[2.68, 0.06, 1.68]} />
        <meshStandardMaterial color="#EEEAE2" roughness={0.6} />
      </mesh>
      {/* szczyty pod dachem */}
      {[-1.3, 1.28].map((x) => (
        <mesh key={x} geometry={g.szczyt} position={[x, 1.22, 0]} rotation={[0, Math.PI / 2, 0]} material={tynk} castShadow />
      ))}
      {/* połacie dachu z dachówką */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 1.22 + 0.31, s * 0.475]} rotation={[s * g.SPAD, 0, 0]} material={dach} castShadow receiveShadow>
          <boxGeometry args={[2.9, 0.05, g.DL]} />
        </mesh>
      ))}
      <mesh position={[0, 1.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 2.92, 16]} />
        <meshStandardMaterial color="#5A2117" roughness={0.6} />
      </mesh>
      {/* rynny i rury spustowe */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[0, 1.17, s * 0.98]} rotation={[0, 0, Math.PI / 2]} material={blacha}>
            <cylinderGeometry args={[0.03, 0.03, 2.9, 12]} />
          </mesh>
          <mesh position={[s * 1.33, 0.6, 0.83]} material={blacha}>
            <cylinderGeometry args={[0.018, 0.018, 1.15, 10]} />
          </mesh>
        </group>
      ))}
      {/* bramy w ościeżnicach */}
      {[-0.55, 0.55].map((x, i) => {
        const o = i === 0 ? otwarcie : 0;
        return (
          <group key={x}>
            <mesh position={[x, 0.585, 0.81]}>
              <boxGeometry args={[0.9, 0.95, 0.03]} />
              <meshStandardMaterial color="#EFECE6" roughness={0.55} />
            </mesh>
            <mesh position={[x, 0.54, 0.826]}>
              <planeGeometry args={[0.8, 0.84]} />
              <meshBasicMaterial color="#120C08" />
            </mesh>
            <mesh position={[x, 0.54 + 0.42 * o, 0.83]} scale={[1, 1 - 0.95 * o, 1]}>
              <planeGeometry args={[0.8, 0.84]} />
              <meshStandardMaterial map={brama} roughness={0.4} metalness={0.25} />
            </mesh>
            {/* lampa nad bramą */}
            <mesh position={[x, 1.07, 0.85]}>
              <boxGeometry args={[0.1, 0.035, 0.07]} />
              <meshStandardMaterial color="#2B2D33" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[x, 1.05, 0.86]}>
              <boxGeometry args={[0.07, 0.01, 0.05]} />
              <meshStandardMaterial color="#FFF2D6" emissive="#FFE2A8" emissiveIntensity={2} />
            </mesh>
          </group>
        );
      })}
      <pointLight position={[-0.55, 0.95, 1.05]} intensity={0.9} distance={1.6} color="#FFE2A8" />
      <pointLight position={[0.55, 0.95, 1.05]} intensity={0.9} distance={1.6} color="#FFE2A8" />
      {/* szyld */}
      <mesh position={[0, 1.1, 0.82]}>
        <boxGeometry args={[0.5, 0.13, 0.02]} />
        <meshStandardMaterial color="#F2EEE6" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0.832]}>
        <planeGeometry args={[0.46, 0.115]} />
        <meshStandardMaterial map={szyld} roughness={0.5} />
      </mesh>
      {/* okna */}
      <Okno p={[-1.13, 0.72, 0.8]} w={0.18} h={0.3} />
      <Okno p={[1.13, 0.72, 0.8]} w={0.18} h={0.3} />
      {[-0.75, 0, 0.75].map((x) => (
        <Okno key={x} p={[x, 0.7, -0.8]} ry={Math.PI} />
      ))}
      <Okno p={[-1.3, 0.7, 0.2]} ry={-Math.PI / 2} />
      <Okno p={[-1.3, 0.7, -0.4]} ry={-Math.PI / 2} />
      {/* drzwi boczne */}
      <mesh position={[1.305, 0.45, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.26, 0.56]} />
        <meshStandardMaterial color="#6B4429" roughness={0.6} />
      </mesh>
      <Okno p={[1.3, 0.75, -0.35]} ry={Math.PI / 2} />
      {/* wieża z żaluzjami i syreną */}
      <group position={[1.02, 0, -0.32]}>
        <mesh geometry={g.wieza} position={[0, 1.9, 0]} material={tynk} castShadow />
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
          <mesh key={r} position={[Math.sin(r) * 0.263, 2.38, Math.cos(r) * 0.263]} rotation={[0, r, 0]}>
            <planeGeometry args={[0.24, 0.32]} />
            <meshStandardMaterial map={tx.zaluzja} roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 2.74, 0]} castShadow>
          <boxGeometry args={[0.6, 0.05, 0.6]} />
          <meshStandardMaterial color="#EEEAE2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 4, 0]} material={dach} castShadow>
          <coneGeometry args={[0.46, 0.48, 4]} />
        </mesh>
        <mesh position={[0, 3.32, 0]} material={blacha}>
          <cylinderGeometry args={[0.012, 0.012, 0.25, 8]} />
        </mesh>
        <mesh position={[0, 3.46, 0]} rotation={[0, t * 0.6, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.06, 16]} />
          <meshStandardMaterial color="#C9CDD4" metalness={0.8} roughness={0.3} emissive="#C0392B" emissiveIntensity={0.15 * syrena} />
        </mesh>
        <Okno p={[0, 1.95, 0.262]} w={0.16} h={0.24} />
      </group>
    </group>
  );
};
