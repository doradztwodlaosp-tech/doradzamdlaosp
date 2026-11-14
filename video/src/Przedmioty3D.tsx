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
export const useBlat = (jasny = false) =>
  useMemo(
    () =>
      plotno(
        1024,
        1024,
        (c) => {
          const DESKA = 128;
          for (let d = 0; d < 1024 / DESKA; d++) {
            const k = 0.82 + los(d) * 0.3;
            c.fillStyle = jasny
              ? `rgb(${Math.round(190 * k)},${Math.round(156 * k)},${Math.round(116 * k)})`
              : `rgb(${Math.round(96 * k)},${Math.round(72 * k)},${Math.round(56 * k)})`;
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
            if (!jasny && los(d * 9) > 0.55) {
              const x = los(d * 5) * 1000;
              const y = d * DESKA + DESKA / 2;
              const g = c.createRadialGradient(x, y, 2, x, y, 18);
              g.addColorStop(0, "rgba(40,22,12,0.7)");
              g.addColorStop(1, "rgba(40,22,12,0)");
              c.fillStyle = g;
              c.fillRect(x - 20, y - 14, 40, 28);
            }
            // szczelina między deskami
            c.fillStyle = jasny ? "rgba(90,64,40,0.35)" : "rgba(20,12,8,0.75)";
            c.fillRect(0, d * DESKA, 1024, 3);
          }
        },
        [4, 4],
      ),
    [jasny],
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

// ───────────── Księgi ustaw ─────────────
const okladkaKsiegi = (gora: string, tytul: string[], dol: string) =>
  plotno(640, 900, (c) => {
    c.fillStyle = "#24262E";
    c.fillRect(0, 0, 640, 900);
    c.strokeStyle = MARKA.zloto;
    c.lineWidth = 4;
    c.strokeRect(34, 34, 572, 832);
    c.fillStyle = MARKA.zloto;
    c.textAlign = "center";
    c.font = `600 30px ${FONT}`;
    c.fillText(gora, 320, 150);
    c.fillRect(250, 180, 140, 3);
    c.fillStyle = "#F2F0EA";
    let rozmiar = 60;
    c.font = `800 ${rozmiar}px ${FONT}`;
    while (Math.max(...tytul.map((l) => c.measureText(l).width)) > 500 && rozmiar > 30) c.font = `800 ${--rozmiar}px ${FONT}`;
    tytul.forEach((l, i) => c.fillText(l, 320, 330 + i * (rozmiar + 16)));
    c.fillStyle = "#CBCBD3";
    c.font = `600 28px ${FONT}`;
    c.fillText(dol, 320, 790);
  });

const Ksiega: React.FC<{ okladka: THREE.Texture; pozycja: [number, number, number]; obrot: number; grubosc?: number }> = ({ okladka, pozycja, obrot, grubosc = 0.24 }) => {
  const m = useMemo(() => {
    const opr = new THREE.MeshStandardMaterial({ color: "#23252D", roughness: 0.55 });
    const kartki = new THREE.MeshStandardMaterial({ color: "#EDE6D6", roughness: 0.9 });
    const wierzch = new THREE.MeshStandardMaterial({ map: okladka, roughness: 0.5 });
    return { opr, kartki, wierzch };
  }, [okladka]);
  const g = useMemo(() => new RoundedBoxGeometry(1.3, grubosc, 1.8, 3, 0.03), [grubosc]);
  return (
    <group position={pozycja} rotation={[0, obrot, 0]}>
      <mesh geometry={g} position={[0, grubosc / 2, 0]} material={m.opr} castShadow receiveShadow />
      <mesh position={[0.02, grubosc / 2, 0]} material={m.kartki}>
        <boxGeometry args={[1.26, grubosc - 0.05, 1.72]} />
      </mesh>
      <mesh userData={{ tekst: true }} position={[0, grubosc + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.wierzch}>
        <planeGeometry args={[1.26, 1.76]} />
      </mesh>
      {/* złota zakładka */}
      <mesh position={[0.35, grubosc * 0.6, 0.93]} castShadow>
        <boxGeometry args={[0.06, 0.01, 0.22]} />
        <meshStandardMaterial color={MARKA.zloto} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
};

// Na dole „Prawo o stowarzyszeniach”, na wierzch na wskazane słowo spada „Ustawa o OSP”
export const KsiegiUstaw: React.FC<{ t: number; spadek: number; pozycja: [number, number, number] }> = ({ t, spadek, pozycja }) => {
  const okl = useMemo(
    () => ({
      stow: okladkaKsiegi("USTAWA", ["PRAWO", "O STOWARZYSZENIACH"], "z 7 kwietnia 1989 r."),
      osp: okladkaKsiegi("USTAWA", ["O OCHOTNICZYCH", "STRAŻACH", "POŻARNYCH"], "z 17 grudnia 2021 r."),
    }),
    [],
  );
  const s = interpolate(t, [spadek - 0.1, spadek + 0.55], [0, 1], { ...Z, easing: Easing.out(Easing.cubic) });
  return (
    <group position={pozycja}>
      <Ksiega okladka={okl.stow} pozycja={[0, 0, 0]} obrot={0.1} grubosc={0.26} />
      {s > 0 ? <Ksiega okladka={okl.osp} pozycja={[0.06, 0.26 + (1 - s) * 1.6, -0.04]} obrot={-0.06 + (1 - s) * 0.5} grubosc={0.22} /> : null}
    </group>
  );
};

// ───────────── Akcje na słowa lektora ─────────────
const kartkaZTytulem = (tytul: string) =>
  plotno(520, 720, (c) => {
    c.fillStyle = "#F6F2EA";
    c.fillRect(0, 0, 520, 720);
    c.fillStyle = MARKA.zloto;
    c.fillRect(0, 0, 520, 14);
    c.fillStyle = "#23242A";
    c.textAlign = "center";
    let r = 52;
    c.font = `800 ${r}px ${FONT}`;
    const linie = tytul.split("|");
    while (Math.max(...linie.map((l) => c.measureText(l).width)) > 440 && r > 24) c.font = `800 ${--r}px ${FONT}`;
    linie.forEach((l, i) => c.fillText(l, 260, 120 + i * (r + 12)));
    c.fillStyle = "#A9A59C";
    for (let i = 0; i < 12; i++) c.fillRect(50, 240 + i * 34, i % 4 === 3 ? 220 : 420, 9);
    c.fillStyle = "#23242A";
    c.fillRect(290, 680, 180, 2);
  });

const odciskPieczeci = (tekst: string) =>
  plotno(600, 240, (c) => {
    c.strokeStyle = "#B22A1E";
    c.lineWidth = 12;
    c.strokeRect(16, 16, 568, 208);
    c.fillStyle = "#B22A1E";
    c.textAlign = "center";
    let r = 84;
    c.font = `800 ${r}px ${FONT}`;
    while (c.measureText(tekst).width > 520 && r > 30) c.font = `800 ${--r}px ${FONT}`;
    c.fillText(tekst, 300, 120 + r * 0.36);
  });

type Akcja = NonNullable<import("./typy").ScenaOSP["akcje"]>[number];

const KartkaWjezdza: React.FC<{ a: Akcja; t: number; od: number }> = ({ a, t, od }) => {
  const tex = useMemo(() => kartkaZTytulem(a.tekst ?? ""), [a.tekst]);
  const p = interpolate(t, [od, od + 0.9], [0, 1], { ...Z, easing: Easing.inOut(Easing.cubic) });
  if (p <= 0) return null;
  const s = (a.rozmiar ?? 1) * (0.9 + 0.1 * p);
  return (
    <group position={[a.poz[0], 0.012 + (1 - p) * 0.9, a.poz[1] - (1 - p) * 1.2]} rotation={[0, (a.obrot ?? 0) + (1 - p) * 0.5, 0]} scale={s}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.008, 1.0]} />
        <meshStandardMaterial color="#ECE6DA" roughness={0.9} />
      </mesh>
      <mesh userData={{ tekst: true }} position={[0, 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.72, 1.0]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  );
};

const PieczecUderza: React.FC<{ a: Akcja; t: number; od: number }> = ({ a, t, od }) => {
  const tex = useMemo(() => odciskPieczeci(a.tekst ?? ""), [a.tekst]);
  const zejscie = interpolate(t, [od - 0.35, od], [1, 0], { ...Z, easing: Easing.in(Easing.quad) });
  const powrot = interpolate(t, [od + 0.25, od + 0.8], [0, 1], { ...Z, easing: Easing.out(Easing.quad) });
  const wys = t < od ? zejscie : powrot * 1.3;
  const widac = t > od - 0.4 && t < od + 0.9;
  return (
    <group position={[a.poz[0], 0, a.poz[1]]} rotation={[0, a.obrot ?? 0, 0]}>
      {widac ? (
        <group position={[0, 0.03 + wys * 0.9, 0]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.42, 0.12, 0.2]} />
            <meshStandardMaterial color="#2A2C33" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.18, 20]} />
            <meshStandardMaterial color="#6B4429" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.33, 0]} castShadow>
            <sphereGeometry args={[0.08, 20, 14]} />
            <meshStandardMaterial color="#6B4429" roughness={0.6} />
          </mesh>
        </group>
      ) : null}
      {t >= od ? (
        <mesh userData={{ bezRysunku: true }} position={[0, 0.0215, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.62, 0.25]} />
          <meshBasicMaterial map={tex} transparent opacity={interpolate(t, [od, od + 0.12], [0, 0.92], Z)} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const MonetaSpada: React.FC<{ a: Akcja; t: number; od: number }> = ({ a, t, od }) => {
  const mat = useMonety();
  const lot = interpolate(t, [od, od + 0.45], [1, 0], { ...Z, easing: Easing.in(Easing.quad) });
  const odbicie = t > od + 0.45 ? Math.abs(Math.sin((t - od - 0.45) * 9)) * 0.12 * Math.exp(-(t - od - 0.45) * 4) : 0;
  const wir = t > od + 0.45 ? Math.exp(-(t - od - 0.45) * 1.6) : 1;
  if (t < od) return null;
  return (
    <mesh
      position={[a.poz[0], 0.03 + lot * 1.6 + odbicie, a.poz[1]]}
      rotation={[wir * Math.sin(t * 7) * 0.5, t * 3 * wir, 0]}
      material={mat}
      userData={{ zloty: true }}
      castShadow
    >
      <cylinderGeometry args={[0.26 * (a.rozmiar ?? 1), 0.26 * (a.rozmiar ?? 1), 0.055, 48]} />
    </mesh>
  );
};

export const AkcjeNaSlowa: React.FC<{ sceny: import("./typy").ScenaOSP[]; t: number }> = ({ sceny, t }) => (
  <>
    {sceny.flatMap((s, i) =>
      (s.akcje ?? []).map((a, j) => {
        const slowo = s.slowa.find((w) => w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").startsWith(a.slowo.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")));
        const od = (slowo?.s ?? s.start) + (a.opoznienie ?? 0);
        const k = `${i}-${j}`;
        if (a.typ === "kartka") return <KartkaWjezdza key={k} a={a} t={t} od={od} />;
        if (a.typ === "pieczec") return <PieczecUderza key={k} a={a} t={t} od={od} />;
        return <MonetaSpada key={k} a={a} t={t} od={od} />;
      }),
    )}
  </>
);
