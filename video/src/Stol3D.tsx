import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARKA } from "./marka";
import { Otoczenie, WozStrazacki } from "./Woz3D";
import { BudynekRemizy } from "./Remiza3D";
import { LaptopPro, StosDokumentow, StosyMonet, useBlat } from "./Przedmioty3D";
import { Dlugopis, Helm, Segregator, type Tekstury, useTekstury } from "./Scena3D";
import { type ScenaOSP, czasSlowa } from "./typy";
import type { PropsMapy, ZdarzenieDzwiekowe } from "./Mapy";

// „Stół OSP”: jedna makieta w prawdziwym 3D, po której spokojnie przesuwa się kamera.
// Każda scena odcinka ma pole "kamera" – nazwę miejsca na stole (STACJE niżej).
// Na stole: makieta remizy z wozem, stos papierów, tabliczka marki, laptop, segregator ze statutem, monety.

const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PLYNNIE = Easing.bezier(0.45, 0, 0.25, 1);
// Ciepłe tło „pokoju” jak w filmach instruktażowych (dalekie części stołu rozpływają się w nim)
const TLO_POKOJU = "#5E4D40";
const PRZEJAZD = 2.2; // sekundy przejazdu kamery między miejscami (spokojnie)

type Stacja = { cel: [number, number, number]; kat: number; odl: number; wys: number };
const STACJE: Record<string, Stacja> = {
  remiza: { cel: [-6.0, 0.95, -2.6], kat: 0.3, odl: 12.5, wys: 4.8 },
  papiery: { cel: [0.0, 0.25, -3.0], kat: 0.12, odl: 6.2, wys: 5.0 },
  marka: { cel: [5.55, -0.25, -2.4], kat: -0.18, odl: 5.6, wys: 2.1 },
  laptop: { cel: [6.0, 0.55, 3.5], kat: 0.36, odl: 8.6, wys: 3.8 },
  statut: { cel: [0.1, 0.15, 3.45], kat: 0.42, odl: 7.4, wys: 4.8 },
  "statut-otwarty": { cel: [-0.2, 0.1, 3.25], kat: 0.24, odl: 7.6, wys: 7.6 },
  monety: { cel: [-6.0, 0.4, 3.8], kat: 0.22, odl: 6.0, wys: 3.0 },
  protokol: { cel: [3.0, 0.2, 0.3], kat: 0.15, odl: 6.0, wys: 4.6 },
  gmina: { cel: [10.0, 0.9, 0.0], kat: -0.35, odl: 11.5, wys: 3.6 },
  woz: { cel: [-6.55, 0.35, -1.3], kat: 0.75, odl: 5.0, wys: 1.9 },
  helm: { cel: [-3.0, 0.35, 0.3], kat: 0.5, odl: 6.8, wys: 3.4 },
  calosc: { cel: [-0.5, 0.0, 0.3], kat: 0.3, odl: 19, wys: 13.5 },
};

// Gdzie stoi kamera w chwili t (sekundy filmu): płynny przejazd do miejsca bieżącej sceny + lekki dryf
const kameraW = (sceny: ScenaOSP[], t: number) => {
  const lista = sceny.map((s) => ({ t: s.start - 0.35, st: STACJE[s.kamera ?? ""] ?? STACJE.calosc }));
  // ostatnia scena, która już się zaczęła, i początek ciągu scen z tym samym miejscem
  let i = 0;
  lista.forEach((e, j) => {
    if (j > 0 && t >= e.t) i = j;
  });
  let poczatekCiagu = i;
  while (poczatekCiagu > 0 && lista[poczatekCiagu - 1].st === lista[i].st) poczatekCiagu--;
  const obecna = lista[i].st;
  const poprzednia = poczatekCiagu > 0 ? lista[poczatekCiagu - 1].st : obecna;
  const poczatek = poczatekCiagu > 0 ? lista[poczatekCiagu].t : -99;
  const p = interpolate(t, [poczatek, poczatek + PRZEJAZD], [0, 1], { ...Z, easing: PLYNNIE });
  const m = (a: number, b: number) => a + (b - a) * p;
  const dryf = Math.sin(t * 0.25) * 0.035;
  return {
    cel: [m(poprzednia.cel[0], obecna.cel[0]), m(poprzednia.cel[1], obecna.cel[1]), m(poprzednia.cel[2], obecna.cel[2])] as [number, number, number],
    kat: m(poprzednia.kat, obecna.kat) + dryf,
    odl: m(poprzednia.odl, obecna.odl) * (1 - 0.012 * Math.sin(t * 0.18)),
    wys: m(poprzednia.wys, obecna.wys),
  };
};

const Kamera: React.FC<{ sceny: ScenaOSP[]; t: number }> = ({ sceny, t }) => {
  const { camera } = useThree();
  const k = kameraW(sceny, t);
  camera.position.set(k.cel[0] + Math.sin(k.kat) * k.odl, k.cel[1] + k.wys, k.cel[2] + Math.cos(k.kat) * k.odl);
  camera.lookAt(new THREE.Vector3(...k.cel));
  return null;
};

// Czasy zdarzeń wyliczone ze słów lektora
const czasy = (sceny: ScenaOSP[]) => {
  const sc = (k: string) => sceny.find((s) => s.kamera === k);
  const slowo = (k: string, w: string, zapas = 0) => {
    const s = sc(k);
    return s ? (czasSlowa(s, w) ?? s.start + zapas) : 999;
  };
  const remiza = sc("remiza");
  const papiery = sceny.filter((s) => s.kamera === "papiery");
  return {
    wyjazd: (remiza?.start ?? 0) + 0.4,
    stos: slowo("papiery", "Papiery", 1.5),
    lista: papiery[1] ?? papiery[0],
    marka: sc("marka")?.start ?? 999,
    laptop: sc("laptop")?.start ?? 999,
    polska: slowo("laptop", "Pols", 1),
    zdalnie: slowo("laptop", "zdalnie", 2),
    statut: sc("statut")?.start ?? 999,
    otwarty: sc("statut-otwarty"),
    otwarcie: (sc("statut-otwarty")?.start ?? 999) - 0.2,
    monety: sc("monety"),
    dostawac: slowo("monety", "1,5%", 1.2),
    oddala: slowo("protokol", "oddala", 1.5),
    traci: slowo("protokol", "traci", 3.5),
    gmina: sc("gmina")?.start ?? 999,
    nie: slowo("gmina", "nie", 4),
    calosc: sc("calosc")?.start ?? 999,
  };
};

// ───────────── Tekstury z napisami ─────────────

type TeksturyStolu = { brama: THREE.Texture; szyld: THREE.Texture; tabliczka: THREE.Texture; ekran: THREE.Texture; drewno: THREE.Texture; protokol: THREE.Texture; pieczec: THREE.Texture; urzad: THREE.Texture };

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

const useTeksturyStolu = () => {
  const [tekstury, ustaw] = useState<TeksturyStolu | null>(null);
  const [uchwyt] = useState(() => delayRender("Tekstury stołu 3D"));
  useEffect(() => {
    document.fonts.load(`800 80px ${FONT}`).then(() => {
      const brama = plotno(256, 256, (c) => {
        c.fillStyle = "#A8261C";
        c.fillRect(0, 0, 256, 256);
        for (let y = 14; y < 256; y += 22) {
          c.fillStyle = "rgba(0,0,0,0.22)";
          c.fillRect(0, y, 256, 4);
          c.fillStyle = "rgba(255,255,255,0.08)";
          c.fillRect(0, y + 4, 256, 2);
        }
      });
      const szyld = plotno(512, 128, (c) => {
        c.fillStyle = "#F2EEE6";
        c.fillRect(0, 0, 512, 128);
        c.fillStyle = "#A8261C";
        c.font = `800 92px ${FONT}`;
        c.textAlign = "center";
        c.fillText("OSP", 256, 100);
      });
      const tabliczka = plotno(1200, 300, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, "#2A2C35");
        g.addColorStop(1, "#1C1D23");
        c.fillStyle = g;
        c.fillRect(0, 0, 1200, 300);
        c.strokeStyle = MARKA.zloto;
        c.lineWidth = 6;
        c.strokeRect(18, 18, 1164, 264);
        c.fillStyle = MARKA.zloto;
        c.font = `800 190px ${FONT}`;
        c.textAlign = "center";
        c.fillText("§", 150, 215);
        c.textAlign = "left";
        c.font = `800 74px ${FONT}`;
        c.fillText("DORADZTWO DLA OSP", 270, 140);
        c.fillStyle = "#CBCBD3";
        c.font = `600 50px ${FONT}`;
        c.fillText("doradztwodlaosp.pl", 272, 220);
      });
      const ekran = plotno(800, 500, (c) => {
        c.fillStyle = "#15161B";
        c.fillRect(0, 0, 800, 500);
        c.fillStyle = "#20222A";
        c.fillRect(0, 0, 800, 70);
        c.fillStyle = MARKA.zloto;
        c.font = `800 34px ${FONT}`;
        c.fillText("§  doradztwodlaosp.pl", 34, 47);
        c.fillStyle = "white";
        c.font = `800 52px ${FONT}`;
        c.fillText("Status OPP", 50, 170);
        c.fillText("dla Twojej OSP", 50, 232);
        c.fillStyle = "#CBCBD3";
        c.font = `600 28px ${FONT}`;
        c.fillText("Statut • walne • KRS – krok po kroku", 50, 290);
        c.fillStyle = MARKA.zloto;
        c.beginPath();
        c.roundRect(50, 340, 300, 70, 35);
        c.fill();
        c.fillStyle = "#15161B";
        c.font = `800 30px ${FONT}`;
        c.fillText("Napisz do nas", 92, 386);
      });
      const drewno = plotno(1024, 1024, (c) => {
        c.fillStyle = "#3A2B21";
        c.fillRect(0, 0, 1024, 1024);
        for (let i = 0; i < 260; i++) {
          const y = (i * 977) % 1024;
          c.fillStyle = `rgba(${i % 2 ? "0,0,0" : "255,220,170"},${0.03 + ((i * 37) % 10) / 400})`;
          c.fillRect(0, y, 1024, 1 + (i % 3));
        }
      });
      const protokol = plotno(650, 900, (c) => {
        c.fillStyle = "#F1EBDD";
        c.fillRect(0, 0, 650, 900);
        c.fillStyle = "#2B2C33";
        c.textAlign = "center";
        c.font = `800 52px ${FONT}`;
        c.fillText("PROTOKÓŁ", 325, 110);
        c.font = `600 28px ${FONT}`;
        c.fillStyle = "#6A6B74";
        c.fillText("z Walnego Zebrania Członków", 325, 155);
        for (let k = 0; k < 14; k++) {
          c.fillStyle = "#B9B4A8";
          c.fillRect(60, 220 + k * 44, k % 4 === 3 ? 300 : 530, 11);
        }
        c.fillStyle = "#2B2C33";
        c.fillRect(380, 840, 200, 3);
      });
      const pieczec = plotno(600, 220, (c) => {
        c.strokeStyle = "#C0392B";
        c.lineWidth = 14;
        c.strokeRect(14, 14, 572, 192);
        c.fillStyle = "#C0392B";
        c.font = `800 82px ${FONT}`;
        c.textAlign = "center";
        c.fillText("ODDALONO", 300, 142);
      });
      const urzad = plotno(700, 120, (c) => {
        c.fillStyle = "#F4F1EA";
        c.fillRect(0, 0, 700, 120);
        c.fillStyle = "#2B2C33";
        c.font = `800 64px ${FONT}`;
        c.textAlign = "center";
        c.fillText("URZĄD GMINY", 350, 86);
      });
      drewno.wrapS = drewno.wrapT = THREE.RepeatWrapping;
      drewno.repeat.set(3, 3);
      ustaw({ brama, szyld, tabliczka, ekran, drewno, protokol, pieczec, urzad });
      continueRender(uchwyt);
    });
  }, [uchwyt]);
  return tekstury;
};

// ───────────── Przedmioty ─────────────

const Remiza: React.FC<{ t: number; c: ReturnType<typeof czasy>; tx: TeksturyStolu }> = ({ t, c, tx }) => {
  const otwarcie = interpolate(t, [c.wyjazd, c.wyjazd + 1.6], [0, 1], { ...Z, easing: PLYNNIE });
  const wyjazd = interpolate(t, [c.wyjazd + 1.0, c.wyjazd + 4.2], [0, 1], { ...Z, easing: PLYNNIE });
  return (
    <group position={[-6.0, 0, -3.5]}>
      <BudynekRemizy otwarcie={otwarcie} t={t} brama={tx.brama} szyld={tx.szyld} />
      {/* światło z wnętrza */}
      <pointLight position={[-0.55, 0.5, 1.4]} intensity={3 * otwarcie + 0.6} color="#FFB45A" distance={4} />
      {/* wóz strażacki (src/Woz3D.tsx) */}
      <group position={[-0.55, 0, -0.05 + wyjazd * 2.2]} scale={0.57}>
        <WozStrazacki t={t} droga={wyjazd * 2.2 / 0.57} />
      </group>
    </group>
  );
};


// Tabliczka marki na biurku
const Tabliczka: React.FC<{ t: number; c: ReturnType<typeof czasy>; tx: TeksturyStolu }> = ({ t, c, tx }) => {
  const blask = interpolate(t, [c.marka, c.marka + 1.4], [0, 1], Z);
  return (
    <group position={[5.5, 0, -2.5]} rotation={[0, -0.18, 0]} scale={0.6}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.12, 0.55]} />
        <meshStandardMaterial color="#17181D" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.42, 0.02]} rotation={[-0.22, 0, 0]} castShadow>
        <boxGeometry args={[2.4, 0.62, 0.06]} />
        <meshStandardMaterial color="#1C1D23" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.42, 0.056]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[2.36, 0.59]} />
        <meshStandardMaterial map={tx.tabliczka} roughness={0.35} metalness={0.15} emissive="#ffffff" emissiveMap={tx.tabliczka} emissiveIntensity={0.08 + 0.22 * blask} />
      </mesh>
      <spotLight position={[0.4, 2.4, 2.2]} angle={0.5} penumbra={0.8} intensity={14 * blask} color="#FFE3B0" distance={8} />
    </group>
  );
};



// Protokół z walnego: na „oddala” spada czerwona pieczęć, na „traci” moneta toczy się ze stołu
const Protokol: React.FC<{ t: number; c: ReturnType<typeof czasy>; tx: TeksturyStolu }> = ({ t, c, tx }) => {
  const st = interpolate(t, [c.oddala - 0.05, c.oddala + 0.18], [0, 1], { ...Z, easing: Easing.in(Easing.quad) });
  const tocz = interpolate(t, [c.traci - 0.2, c.traci + 2.4], [0, 1], { ...Z, easing: Easing.inOut(Easing.quad) });
  return (
    <group position={[3.0, 0, 0.3]} rotation={[0, 0.12, 0]}>
      <mesh position={[0, 0.012, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.3, 0.012, 1.8]} />
        <meshStandardMaterial color="#E7DFCC" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.0195, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.28, 1.77]} />
        <meshStandardMaterial map={tx.protokol} roughness={0.9} />
      </mesh>
      {st > 0 ? (
        <mesh position={[0.05, 0.022 + (1 - st) * 0.8, 0.1]} rotation={[-Math.PI / 2, 0, -0.18]} scale={1 + (1 - st) * 0.5}>
          <planeGeometry args={[1.05, 0.385]} />
          <meshBasicMaterial map={tx.pieczec} transparent opacity={0.92 * st} depthWrite={false} />
        </mesh>
      ) : null}
      <mesh position={[0.95 + tocz * 1.6, 0.21, 0.55 + tocz * 0.9]} rotation={[Math.PI / 2, 0, -tocz * 14]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 40]} />
        <meshStandardMaterial color={MARKA.zloto} metalness={0.45} roughness={0.35} emissive="#5a3c08" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
};

// Urząd gminy: makieta z kolumnami i flagą
const Gmina: React.FC<{ t: number; c: ReturnType<typeof czasy>; tx: TeksturyStolu }> = ({ t, c, tx }) => {
  const fronton = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-1.35, 0);
    sh.lineTo(1.35, 0);
    sh.lineTo(0, 0.55);
    sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false });
  }, []);
  const fala = Math.sin(t * 2.2) * 0.12;
  const swiatlo = interpolate(t, [c.nie - 0.2, c.nie + 0.6], [0, 1], Z);
  return (
    <group position={[10.0, 0, 0.0]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.06, 0.25]} receiveShadow castShadow>
        <boxGeometry args={[3.1, 0.12, 2.3]} />
        <meshStandardMaterial color="#CFC8BA" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.3, 1.5]} />
        <meshStandardMaterial color="#CFC8BB" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.48, -0.85]} castShadow>
        <boxGeometry args={[2.7, 0.12, 1.75]} />
        <meshStandardMaterial color="#C4BDB0" roughness={0.85} />
      </mesh>
      <mesh geometry={fronton} position={[0, 1.54, 0.76]} castShadow>
        <meshStandardMaterial color="#CFC8BB" roughness={0.85} />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.78, 0.86]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 1.3, 16]} />
          <meshStandardMaterial color="#DCD7CD" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0.885]}>
        <planeGeometry args={[1.05, 0.18]} />
        <meshStandardMaterial map={tx.urzad} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0.651]}>
        <planeGeometry args={[0.42, 0.72]} />
        <meshStandardMaterial color="#5A3B26" roughness={0.6} />
      </mesh>
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.651]}>
          <planeGeometry args={[0.3, 0.38]} />
          <meshBasicMaterial color="#FFD08A" />
        </mesh>
      ))}
      {/* maszt z flagą */}
      <mesh position={[1.45, 1.35, 1.1]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 2.6, 10]} />
        <meshStandardMaterial color="#B8BBC4" metalness={0.7} roughness={0.3} />
      </mesh>
      <group position={[1.47, 2.42, 1.1]} rotation={[0, fala, 0]}>
        <mesh position={[0.3, 0.09, 0]}>
          <planeGeometry args={[0.6, 0.18]} />
          <meshStandardMaterial color="#F4F4F4" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.3, -0.09, 0]}>
          <planeGeometry args={[0.6, 0.18]} />
          <meshStandardMaterial color="#D4213D" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <pointLight position={[0, 1.2, 2.4]} intensity={6 * swiatlo} color={MARKA.zloto} distance={5} />
    </group>
  );
};

const Swiat: React.FC<{ sceny: ScenaOSP[]; t: number; tx: TeksturyStolu; ts: Tekstury }> = ({ sceny, t, tx, ts }) => {
  const c = czasy(sceny);
  const blat = useBlat();
  const otw = c.otwarty ? interpolate(t, [c.otwarcie, c.otwarcie + 2.0], [0, 1], { ...Z, easing: Easing.bezier(0.55, 0, 0.25, 1) }) : 0;
  const blask = c.otwarty ? interpolate(t, [c.otwarcie + 2.0, c.otwarcie + 3.0], [0, 0.8], Z) : 0;
  return (
    <>
      <Kamera sceny={sceny} t={t} />
      <Otoczenie sila={0.6} />
      <color attach="background" args={[TLO_POKOJU]} />
      <fog attach="fog" args={[TLO_POKOJU, 30, 75]} />
      <ambientLight intensity={0.9} color="#B8B0A4" />
      <directionalLight position={[-6, 9, 12]} intensity={1.1} color="#FFE6C4" />
      <hemisphereLight args={["#ffe2b0", "#15161B", 1.1]} />
      <spotLight
        position={[3, 26, 14]}
        angle={0.7}
        penumbra={0.75}
        intensity={3400}
        decay={2}
        color="#FFD9A0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-7, 3, -5]} intensity={10} color={MARKA.zloto} />
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[60, 0.1, 40]} />
        <meshStandardMaterial map={blat} roughness={0.62} />
      </mesh>
      <Remiza t={t} c={c} tx={tx} />
      <StosDokumentow t={t} stos={c.stos} pozycja={[0.0, 0, -3.0]} />
      <Tabliczka t={t} c={c} tx={tx} />
      <LaptopPro otwarcie={interpolate(t, [c.laptop - 0.3, c.laptop + 1.6], [0.15, 1], { ...Z, easing: PLYNNIE })} ekran={tx.ekran} pozycja={[6.0, 0, 3.5]} obrot={-0.25} />
      <Segregator t={ts} otwarcie={otw} blask={blask} pozycja={[0.1, 0.06, 3.5]} obrot={0.42} />
      <StosyMonet t={t} od={c.dostawac} pozycja={[-6.0, 0, 3.8]} />
      <Protokol t={t} c={c} tx={tx} />
      <Gmina t={t} c={c} tx={tx} />
      <Helm pozycja={[-3.0, 0.06, 0.3]} obrot={0.75} />
      <Dlugopis pozycja={[1.7, 0.1, 4.6]} obrot={0.9} />
    </>
  );
};

// ───────────── Karty nad sceną (HTML) ─────────────

const Karta: React.FC<{ t: number; od: number; do: number; tytul?: string; wiersze: { tekst: string; t: number }[] }> = ({ t, od, do: koniec, tytul, wiersze }) => {
  const { fps } = useVideoConfig();
  if (t < od - 0.05 || t > koniec + 0.6) return null;
  const wejscie = spring({ frame: (t - od) * fps, fps, config: { damping: 18, mass: 1 } });
  const rozmiar = Math.min(38, Math.floor(600 / (Math.max(...wiersze.map((w) => w.tekst.length)) * 0.6)));
  const wyjscie = interpolate(t, [koniec, koniec + 0.5], [1, 0], Z);
  return (
    <div
      style={{
        position: "absolute",
        top: 440,
        left: 459 - 380,
        width: 760,
        padding: "30px 38px 34px",
        borderRadius: 22,
        background: "rgba(32,34,42,0.94)",
        border: `2px solid ${MARKA.zloto}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        fontFamily: FONT,
        transform: `translateY(${(1 - wejscie) * 30}px)`,
        opacity: Math.min(1, wejscie * 1.3) * wyjscie,
      }}
    >
      {tytul ? <div style={{ color: MARKA.nadtytul, fontWeight: 700, fontSize: 26, letterSpacing: 3, marginBottom: 4 }}>{tytul}</div> : null}
      {wiersze.map((w) => {
        const p = spring({ frame: (t - w.t) * fps, fps, config: { damping: 20 } });
        return (
          <div key={w.tekst} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16, opacity: t < w.t ? 0 : p, transform: `translateX(${(1 - p) * -24}px)` }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: MARKA.zloto, color: MARKA.tlo, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, flexShrink: 0 }}>✓</div>
            <div style={{ color: "white", fontWeight: 700, fontSize: rozmiar, whiteSpace: "nowrap" }}>{w.tekst}</div>
          </div>
        );
      })}
    </div>
  );
};

const Licznik: React.FC<{ t: number; od: number; do: number }> = ({ t, od, do: koniec }) => {
  if (t < od - 0.05 || t > koniec + 0.6) return null;
  const w = interpolate(t, [od, od + 0.6], [0, 1], Z) * interpolate(t, [koniec, koniec + 0.5], [1, 0], Z);
  const liczba = interpolate(t, [od, od + 1.6], [0, 1.5], { ...Z, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", top: 450, width: 918, textAlign: "center", fontFamily: FONT, opacity: w, transform: `translateY(${(1 - w) * 20}px)` }}>
      <div style={{ fontWeight: 800, fontSize: 150, color: MARKA.zloto, lineHeight: 1, textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>{liczba.toFixed(1).replace(".", ",")}%</div>
      <div style={{ marginTop: 12, fontWeight: 700, fontSize: 38, color: "white", textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>podatku od mieszkańców co roku</div>
    </div>
  );
};

export const StolOSP: React.FC<PropsMapy> = ({ sceny, klatkaStartu }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (klatkaStartu + frame) / fps;
  const tx = useTeksturyStolu();
  const ts = useTekstury();
  const c = czasy(sceny);
  const wejscie = interpolate(frame, [0, 10], [0, 1], Z);
  const sl = (s: ScenaOSP | undefined, w: string) => (s ? (czasSlowa(s, w) ?? s.start) : 999);
  return (
    <AbsoluteFill style={{ opacity: klatkaStartu === 0 ? 1 : wejscie }}>
      {tx && ts ? (
        <ThreeCanvas width={width} height={height} shadows camera={{ fov: 32, near: 0.1, far: 120 }} gl={{ antialias: true }}>
          <Swiat sceny={sceny} t={t} tx={tx} ts={ts} />
        </ThreeCanvas>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: "linear-gradient(rgba(21,22,27,0.72), rgba(21,22,27,0) 85%)" }} />
      {sceny.map((s, i) =>
        s.karta ? (
          <Karta
            key={i}
            t={t}
            od={Math.min(...s.karta.wiersze.map((w) => sl(s, w.slowo))) - 0.2}
            do={s.koniec + 0.3}
            tytul={s.karta.tytul}
            wiersze={s.karta.wiersze.map((w) => ({ tekst: w.tekst, t: sl(s, w.slowo) }))}
          />
        ) : null,
      )}
      {c.monety ? <Licznik t={t} od={sl(c.monety, "1,5%")} do={c.monety.koniec + 0.4} /> : null}
    </AbsoluteFill>
  );
};

export const dzwiekiStolu = (sceny: ScenaOSP[]): ZdarzenieDzwiekowe[] => {
  const c = czasy(sceny);
  const z: ZdarzenieDzwiekowe[] = [];
  sceny.slice(1).forEach((s, i) => {
    if (s.kamera && s.kamera !== sceny[i].kamera) z.push({ t: s.start - 0.35, plik: "swist", glosnosc: 0.22 });
  });
  z.push({ t: c.stos - 0.2, plik: "papier", glosnosc: 0.55 });
  sceny.forEach((s) => s.karta?.wiersze.forEach((w) => z.push({ t: (czasSlowa(s, w.slowo) ?? s.start) + 0.05, plik: "tik", glosnosc: 0.35 })));
  z.push({ t: c.oddala, plik: "stempel", glosnosc: 0.4 }, { t: c.traci + 0.2, plik: "blad", glosnosc: 0.25 });
  if (c.otwarty) z.push({ t: c.otwarcie + 0.3, plik: "papier", glosnosc: 0.5 });
  if (c.monety) z.push({ t: c.dostawac + 0.3, plik: "dzwonek", glosnosc: 0.4 });
  return z.filter((e) => e.t > 0 && e.t < 900);
};
