import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Easing, interpolate } from "remotion";
import { FONT, MARKA } from "./marka";

// Dopracowane przedmioty na stół 3D: blat z desek, stos dokumentów w teczce, laptop z klawiaturą, złote monety.

const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const los = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

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

// ───────────── Blat z desek ─────────────
export const useBlat = () =>
  useMemo(
    () =>
      plotno(
        1024,
        1024,
        (c) => {
          const DESKA = 128;
          for (let d = 0; d < 1024 / DESKA; d++) {
            const k = 0.82 + los(d) * 0.3;
            c.fillStyle = `rgb(${Math.round(96 * k)},${Math.round(72 * k)},${Math.round(56 * k)})`;
            c.fillRect(0, d * DESKA, 1024, DESKA);
            // słoje
            for (let i = 0; i < 46; i++) {
              const y0 = d * DESKA + los(d * 100 + i) * DESKA;
              c.strokeStyle = `rgba(${los(i + d) > 0.5 ? "40,24,14" : "190,150,110"},${0.05 + los(i * 3 + d) * 0.07})`;
              c.lineWidth = 1 + los(i * 7) * 2;
              c.beginPath();
              c.moveTo(0, y0);
              for (let x = 0; x <= 1024; x += 64) c.lineTo(x, y0 + Math.sin(x / 140 + i + d) * 4);
              c.stroke();
            }
            // sęk
            if (los(d * 9) > 0.55) {
              const x = los(d * 5) * 1000;
              const y = d * DESKA + DESKA / 2;
              const g = c.createRadialGradient(x, y, 2, x, y, 18);
              g.addColorStop(0, "rgba(40,22,12,0.7)");
              g.addColorStop(1, "rgba(40,22,12,0)");
              c.fillStyle = g;
              c.fillRect(x - 20, y - 14, 40, 28);
            }
            // szczelina między deskami
            c.fillStyle = "rgba(20,12,8,0.75)";
            c.fillRect(0, d * DESKA, 1024, 3);
          }
        },
        [4, 4],
      ),
    [],
  );

// ───────────── Dokumenty ─────────────
const kartkaTekstura = (wariant: number) =>
  plotno(520, 720, (c) => {
    c.fillStyle = "#F4F0E7";
    c.fillRect(0, 0, 520, 720);
    c.fillStyle = "#2B2C33";
    c.font = `800 ${wariant === 0 ? 34 : 28}px ${FONT}`;
    c.textAlign = "left";
    const naglowki = ["UCHWAŁA nr 3/2026", "SPRAWOZDANIE", "WNIOSEK KRS-Z20", "UMOWA UŻYCZENIA"];
    c.fillText(naglowki[wariant % 4], 46, 80);
    c.fillStyle = "#8C8A84";
    for (let i = 0; i < 17; i++) {
      const w = i % 5 === 4 ? 200 : 360 + los(wariant * 30 + i) * 70;
      c.fillRect(46, 130 + i * 30, w, 8);
    }
    if (wariant % 2 === 1) {
      // tabelka
      c.strokeStyle = "#8C8A84";
      c.lineWidth = 2;
      for (let r = 0; r < 4; r++) c.strokeRect(46, 650 - 4 * 22 + r * 22 - 10, 428, 22);
    } else {
      c.fillStyle = "#2B2C33";
      c.fillRect(300, 670, 170, 2);
    }
  });

export const StosDokumentow: React.FC<{ t: number; stos: number; pozycja: [number, number, number] }> = ({ t, stos, pozycja }) => {
  const m = useMemo(() => {
    const krawedz = new THREE.MeshStandardMaterial({ color: "#E9E3D6", roughness: 0.95 });
    const tekstury = [0, 1, 2, 3].map((w) => new THREE.MeshStandardMaterial({ map: kartkaTekstura(w), roughness: 0.9 }));
    return { krawedz, tekstury };
  }, []);
  const kartki = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        obrot: (los(i) - 0.5) * 0.4,
        dx: (los(i + 50) - 0.5) * 0.14,
        dz: (los(i + 90) - 0.5) * 0.14,
        pochyl: (los(i + 130) - 0.5) * 0.03,
        wariant: i % 4,
      })),
    [],
  );
  return (
    <group position={pozycja}>
      {/* teczka pod spodem */}
      <mesh position={[0.02, 0.012, 0.02]} rotation={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.12, 0.02, 1.5]} />
        <meshStandardMaterial color="#C8A36A" roughness={0.85} />
      </mesh>
      <mesh position={[0.62, 0.012, 0.0]} rotation={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.06, 0.018, 0.4]} />
        <meshStandardMaterial color="#B98F55" roughness={0.85} />
      </mesh>
      {kartki.map((k, i) => {
        const odKiedy = stos - 0.6 + (i - 6) * 0.11;
        const spad = i < 6 ? 1 : interpolate(t, [odKiedy, odKiedy + 0.6], [0, 1], { ...Z, easing: Easing.out(Easing.cubic) });
        if (spad <= 0) return null;
        const mat = [m.krawedz, m.krawedz, m.tekstury[k.wariant], m.krawedz, m.krawedz, m.krawedz];
        return (
          <mesh userData={{ tekst: true }}
            key={i}
            position={[k.dx, 0.03 + i * 0.019 + (1 - spad) * 1.6, k.dz]}
            rotation={[k.pochyl * spad, k.obrot + (1 - spad) * 0.7, k.pochyl * 0.6 * spad + (1 - spad) * 0.2]}
            material={mat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.95, 0.008, 1.32]} />
          </mesh>
        );
      })}
      {/* klips biurowy */}
      <group position={[-0.3, 0.5, -0.6]} rotation={[0, 0.25, 0]}>
        <mesh>
          <boxGeometry args={[0.16, 0.05, 0.08]} />
          <meshStandardMaterial color="#141416" roughness={0.4} metalness={0.4} />
        </mesh>
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 0.06, -0.03]} rotation={[0.6, 0, 0]}>
            <torusGeometry args={[0.03, 0.006, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#C9CDD4" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ───────────── Laptop ─────────────
const klawiatura = () =>
  plotno(1024, 480, (c) => {
    c.fillStyle = "#24262C";
    c.fillRect(0, 0, 1024, 480);
    const rzedy = [14, 14, 13, 12, 11];
    rzedy.forEach((n, r) => {
      const szer = 1024 - 60;
      const kl = szer / 14;
      for (let i = 0; i < n; i++) {
        const x = 30 + i * kl + (14 - n) * kl * 0.5;
        c.fillStyle = "#121317";
        c.beginPath();
        c.roundRect(x + 4, 24 + r * 74, kl - 8, 62, 8);
        c.fill();
      }
    });
    c.fillStyle = "#121317";
    c.beginPath();
    c.roundRect(300, 24 + 5 * 74 - 8, 420, 60, 8);
    c.fill();
  });

export const LaptopPro: React.FC<{ otwarcie: number; ekran: THREE.Texture; pozycja: [number, number, number]; obrot: number }> = ({ otwarcie, ekran, pozycja, obrot }) => {
  const g = useMemo(
    () => ({
      podstawa: new RoundedBoxGeometry(1.7, 0.06, 1.15, 3, 0.025),
      klapa: new RoundedBoxGeometry(1.7, 1.12, 0.035, 3, 0.015),
      klaw: klawiatura(),
    }),
    [],
  );
  const alu = useMemo(() => new THREE.MeshStandardMaterial({ color: "#A9ADB5", metalness: 0.85, roughness: 0.32 }), []);
  const kat = -Math.PI / 2 + otwarcie * (Math.PI / 2 + 0.28);
  return (
    <group position={pozycja} rotation={[0, obrot, 0]}>
      <mesh geometry={g.podstawa} position={[0, 0.03, 0]} material={alu} castShadow receiveShadow />
      <mesh position={[0, 0.0605, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.66]} />
        <meshStandardMaterial map={g.klaw} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.0605, 0.37]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.55, 0.32]} />
        <meshStandardMaterial color="#9DA1A9" metalness={0.8} roughness={0.22} />
      </mesh>
      <group position={[0, 0.06, -0.56]} rotation={[kat, 0, 0]}>
        <mesh geometry={g.klapa} position={[0, 0.56, -0.018]} material={alu} castShadow />
        <mesh position={[0, 0.56, 0.0005]}>
          <planeGeometry args={[1.66, 1.08]} />
          <meshStandardMaterial color="#0B0C0F" roughness={0.15} metalness={0.3} />
        </mesh>
        <mesh userData={{ tekst: true }} position={[0, 0.575, 0.001]}>
          <planeGeometry args={[1.56, 0.97]} />
          <meshBasicMaterial map={ekran} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.7, 0.6]} intensity={2 * otwarcie} color="#C9D6FF" distance={3} />
    </group>
  );
};

// ───────────── Monety ─────────────
export const useMonety = () =>
  useMemo(() => {
    const awers = plotno(256, 256, (c) => {
      const g = c.createRadialGradient(110, 100, 10, 128, 128, 128);
      g.addColorStop(0, "#F6D27A");
      g.addColorStop(0.7, "#D9A63C");
      g.addColorStop(1, "#A97A22");
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = "rgba(110,72,12,0.7)";
      c.lineWidth = 6;
      c.beginPath();
      c.arc(128, 128, 110, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        c.fillStyle = "rgba(110,72,12,0.6)";
        c.beginPath();
        c.arc(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96, 3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgba(120,80,14,0.85)";
      c.font = `800 120px ${FONT}`;
      c.textAlign = "center";
      c.fillText("§", 128, 168);
    });
    const rant = plotno(
      256,
      32,
      (c) => {
        c.fillStyle = "#C8962F";
        c.fillRect(0, 0, 256, 32);
        for (let x = 0; x < 256; x += 4) {
          c.fillStyle = "rgba(90,58,10,0.55)";
          c.fillRect(x, 0, 2, 32);
        }
      },
      [8, 1],
    );
    const bok = new THREE.MeshStandardMaterial({ map: rant, metalness: 0.75, roughness: 0.32, color: "#FFFFFF" });
    const twarz = new THREE.MeshStandardMaterial({ map: awers, metalness: 0.7, roughness: 0.28, emissive: "#4a3008", emissiveIntensity: 0.25 });
    return [bok, twarz, twarz];
  }, []);

export const StosyMonet: React.FC<{ t: number; od: number; pozycja: [number, number, number] }> = ({ t, od, pozycja }) => {
  const mat = useMonety();
  const stosy: [number, number][] = [
    [-0.55, 0.1],
    [0.1, -0.25],
    [0.65, 0.25],
    [0.05, 0.55],
  ];
  const wysokosci = [9, 14, 7, 4];
  return (
    <group position={pozycja}>
      {stosy.map((p, s) =>
        Array.from({ length: wysokosci[s] }, (_, i) => {
          const kiedy = od + s * 0.25 + i * 0.07;
          const w = i < 2 ? 1 : interpolate(t, [kiedy, kiedy + 0.35], [0, 1], { ...Z, easing: Easing.out(Easing.cubic) });
          if (w <= 0) return null;
          return (
            <mesh
              key={`${s}-${i}`}
              position={[p[0] + (los(i + s * 20) - 0.5) * 0.03, 0.03 + i * 0.062 + (1 - w) * 0.9, p[1] + (los(i + s * 40) - 0.5) * 0.03]}
              rotation={[0, los(i * 3 + s) * 6, 0]}
              material={mat}
              userData={{ zloty: true }}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.26, 0.26, 0.055, 48]} />
            </mesh>
          );
        }),
      )}
      {/* moneta oparta o stos */}
      <mesh position={[1.05, 0.22, -0.2]} rotation={[0.2, 0.6, 1.2]} material={mat} userData={{ zloty: true }} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.055, 48]} />
      </mesh>
      <pointLight position={[0, 1.6, 1.2]} intensity={3} distance={4} color={MARKA.zloto} />
    </group>
  );
};
