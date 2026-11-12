import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARKA } from "./marka";
import { Winieta, Ziarno } from "./Wyglad";

// Scena próbna w prawdziwym 3D (three.js): segregator „STATUT” na stole w remizie.
// Kamera najeżdża, okładka się otwiera, nad segregatorem wyskakuje złota karta.

const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const plynnie = Easing.bezier(0.45, 0, 0.2, 1);

// Tekstury z napisami rysowane na płótnie (po wczytaniu fontu marki)
const useTekstury = () => {
  const [tekstury, ustaw] = useState<{ okladka: THREE.Texture; strona: THREE.Texture; grzbiet: THREE.Texture } | null>(null);
  const [uchwyt] = useState(() => delayRender("Tekstury 3D"));
  useEffect(() => {
    document.fonts.load(`800 80px ${FONT}`).then(() => {
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
      const okladka = plotno(700, 950, (c) => {
        c.fillStyle = "#24262E";
        c.fillRect(0, 0, 700, 950);
        c.strokeStyle = MARKA.zloto;
        c.lineWidth = 6;
        c.strokeRect(40, 40, 620, 870);
        c.lineWidth = 2;
        c.strokeRect(58, 58, 584, 834);
        c.fillStyle = MARKA.zloto;
        c.textAlign = "center";
        c.font = `800 210px ${FONT}`;
        c.fillText("§", 350, 380);
        c.font = `800 104px ${FONT}`;
        c.fillText("STATUT", 350, 560);
        c.fillStyle = "#CBCBD3";
        c.font = `600 34px ${FONT}`;
        c.fillText("OCHOTNICZEJ STRAŻY", 350, 640);
        c.fillText("POŻARNEJ", 350, 688);
        c.fillStyle = MARKA.zloto;
        c.fillRect(290, 760, 120, 4);
      });
      const strona = plotno(650, 900, (c) => {
        c.fillStyle = "#F1EBDD";
        c.fillRect(0, 0, 650, 900);
        c.fillStyle = "#2B2C33";
        c.textAlign = "left";
        c.font = `800 46px ${FONT}`;
        c.fillText("Rozdział IV", 60, 110);
        c.font = `600 30px ${FONT}`;
        c.fillStyle = "#6A6B74";
        c.fillText("Organy Stowarzyszenia", 60, 158);
        const linia = (y: number, dl: number, kolor = "#B9B4A8") => {
          c.fillStyle = kolor;
          c.fillRect(60, y, dl, 12);
        };
        let y = 230;
        for (let i = 0; i < 13; i++) {
          if (i === 4 || i === 9) {
            c.fillStyle = "#2B2C33";
            c.font = `800 32px ${FONT}`;
            c.fillText(i === 4 ? "§ 24" : "§ 25", 60, y + 12);
            y += 52;
            continue;
          }
          linia(y, i % 3 === 2 ? 330 : 530);
          y += 46;
        }
      });
      const grzbiet = plotno(256, 64, (c) => {
        c.fillStyle = "#1C1D23";
        c.fillRect(0, 0, 256, 64);
        c.fillStyle = MARKA.zloto;
        c.fillRect(0, 26, 256, 12);
      });
      ustaw({ okladka, strona, grzbiet });
      continueRender(uchwyt);
    });
  }, [uchwyt]);
  return tekstury;
};

// Ruch kamery zależny od klatki
const Kamera: React.FC<{ klatka: number }> = ({ klatka }) => {
  const { camera } = useThree();
  const najazd = interpolate(klatka, [0, 120], [0, 1], { ...Z, easing: plynnie });
  const nad = interpolate(klatka, [150, 260], [0, 1], { ...Z, easing: plynnie });
  const kat = interpolate(najazd, [0, 1], [0.95, 0.42]) + interpolate(nad, [0, 1], [0, -0.22]);
  const odl = interpolate(najazd, [0, 1], [14, 8.6]) + interpolate(nad, [0, 1], [0, -0.6]);
  const wys = interpolate(najazd, [0, 1], [8.5, 5.2]) + interpolate(nad, [0, 1], [0, 2.2]);
  const cel = new THREE.Vector3(interpolate(nad, [0, 1], [0.35, -0.3]), 0.1, interpolate(nad, [0, 1], [-0.9, -1.25]));
  camera.position.set(cel.x + Math.sin(kat) * odl, wys, cel.z + Math.cos(kat) * odl);
  camera.lookAt(cel);
  return null;
};

const Segregator: React.FC<{ klatka: number; t: NonNullable<ReturnType<typeof useTekstury>> }> = ({ klatka, t }) => {
  const otwarcie = interpolate(klatka, [118, 172], [0, 1], { ...Z, easing: Easing.bezier(0.55, 0, 0.25, 1) });
  const SZ = 1.4;
  const GL = 1.9;
  const okladkaMat = useMemo(() => {
    const ciemny = new THREE.MeshStandardMaterial({ color: "#23252D", roughness: 0.6 });
    const gora = new THREE.MeshStandardMaterial({ map: t.okladka, roughness: 0.55, metalness: 0.05 });
    const spod = new THREE.MeshStandardMaterial({ color: "#2B2D36", roughness: 0.8 });
    return [ciemny, ciemny, gora, spod, ciemny, ciemny];
  }, [t]);
  const stronaMat = useMemo(() => {
    const krawedz = new THREE.MeshStandardMaterial({ color: "#E4DCC9", roughness: 0.9 });
    const gora = new THREE.MeshStandardMaterial({ map: t.strona, roughness: 0.85 });
    return [krawedz, krawedz, gora, krawedz, krawedz, krawedz];
  }, [t]);
  // złoty połysk na stronie po otwarciu
  const blask = interpolate(klatka, [175, 200, 240], [0, 1, 0.55], Z);
  return (
    <group position={[0, 0.06, 0]} rotation={[0, 0.38, 0]}>
      {/* tylna okładka */}
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[SZ, 0.03, GL]} />
        <meshStandardMaterial color="#23252D" roughness={0.6} />
      </mesh>
      {/* blok kartek */}
      <mesh position={[0.02, 0.13, 0]} castShadow receiveShadow material={stronaMat}>
        <boxGeometry args={[SZ - 0.1, 0.2, GL - 0.1]} />
      </mesh>
      {/* podkreślenie paragrafu */}
      <mesh position={[0.02, 0.232, -0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.06, 0.07]} />
        <meshBasicMaterial color={MARKA.zloto} transparent opacity={0.55 * blask} />
      </mesh>
      {/* grzbiet */}
      <mesh position={[-SZ / 2 - 0.02, 0.135, 0]} castShadow material={new THREE.MeshStandardMaterial({ map: t.grzbiet, roughness: 0.5 })}>
        <boxGeometry args={[0.05, 0.27, GL]} />
      </mesh>
      {/* przednia okładka na zawiasie przy grzbiecie */}
      <group position={[-SZ / 2, 0.27, 0]} rotation={[0, 0, otwarcie * Math.PI * 0.96]}>
        <mesh position={[SZ / 2, 0.015, 0]} castShadow receiveShadow material={okladkaMat}>
          <boxGeometry args={[SZ, 0.03, GL]} />
        </mesh>
      </group>
    </group>
  );
};

const Helm: React.FC = () => (
  <group position={[2.05, 0.06, -1.25]} rotation={[0, 0.7, 0]}>
    <mesh position={[0, 0.02, 0]} scale={[1, 1, 1.18]} castShadow receiveShadow>
      <cylinderGeometry args={[0.72, 0.78, 0.04, 48]} />
      <meshStandardMaterial color="#9E1E16" roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.04, 0]} scale={[1, 1.15, 1.12]} castShadow>
      <sphereGeometry args={[0.55, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#C0392B" roughness={0.28} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.04, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.12, 1.15, 1]}>
      <torusGeometry args={[0.56, 0.05, 12, 48, Math.PI]} />
      <meshStandardMaterial color="#8E1A13" roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.3, 0.6]} rotation={[-0.5, 0, 0]}>
      <cylinderGeometry args={[0.13, 0.13, 0.02, 32]} />
      <meshStandardMaterial color={MARKA.zloto} metalness={0.8} roughness={0.3} />
    </mesh>
  </group>
);

const Dlugopis: React.FC = () => (
  <group position={[1.15, 0.1, 0.55]} rotation={[0, 0.5, Math.PI / 2]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.035, 0.035, 1.0, 16]} />
      <meshStandardMaterial color={MARKA.zloto} metalness={0.7} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.56, 0]} castShadow>
      <coneGeometry args={[0.035, 0.12, 16]} />
      <meshStandardMaterial color="#1C1D23" />
    </mesh>
  </group>
);

const Swiat: React.FC<{ klatka: number; t: NonNullable<ReturnType<typeof useTekstury>> }> = ({ klatka, t }) => {
  return (
    <>
      <Kamera klatka={klatka} />
      <color attach="background" args={[MARKA.tlo]} />
      <fog attach="fog" args={[MARKA.tlo, 14, 30]} />
      <ambientLight intensity={0.55} color="#9aa0b8" />
      <hemisphereLight args={["#ffe2b0", "#15161B", 0.5]} />
      <spotLight
        position={[2.5, 6, 2.5]}
        angle={0.55}
        penumbra={0.7}
        intensity={90}
        decay={2}
        color="#ffd9a0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-3, 1.6, -2]} intensity={6} color={MARKA.zloto} />
      {/* blat stołu */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[40, 0.1, 30]} />
        <meshStandardMaterial color="#3A2C22" roughness={0.75} />
      </mesh>
      {/* ściana w tle */}
      <mesh position={[0, 4, -9]} receiveShadow>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color="#1E2027" roughness={1} />
      </mesh>
      <Segregator klatka={klatka} t={t} />
      <Helm />
      <Dlugopis />
    </>
  );
};

// Napis u góry (styl szablonu: słowo wypowiadane na złoto)
const NAPIS = ["Zaczyna", "się", "od", "statutu."];
const Napis: React.FC<{ klatka: number }> = ({ klatka }) => (
  <div style={{ position: "absolute", top: 210, left: 60, width: 800, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 58, color: "white", textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
    {NAPIS.map((s, i) => {
      const start = 20 + i * 14;
      const wid = interpolate(klatka, [start, start + 6], [0, 1], Z);
      const zloty = i === 3;
      return (
        <span key={s} style={{ opacity: wid, color: zloty ? MARKA.zloto : "white", fontWeight: zloty ? 800 : 700, fontSize: zloty ? 68 : 58 }}>
          {s}{" "}
        </span>
      );
    })}
  </div>
);

const WIERSZE = [
  { tekst: "niezależna komisja rewizyjna", od: 205 },
  { tekst: "4 zakazy dotyczące majątku", od: 228 },
];
const Karta: React.FC<{ klatka: number }> = ({ klatka }) => {
  const { fps } = useVideoConfig();
  const wejscie = spring({ frame: klatka - 182, fps, config: { damping: 13, mass: 0.7 } });
  if (klatka < 182) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 400,
        left: 459 - 380,
        width: 760,
        padding: "30px 38px 34px",
        borderRadius: 22,
        background: "rgba(32,34,42,0.94)",
        border: `2px solid ${MARKA.zloto}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        fontFamily: FONT,
        transform: `translateY(${(1 - wejscie) * 40}px) scale(${0.85 + 0.15 * wejscie})`,
        opacity: Math.min(1, wejscie * 1.4),
      }}
    >
      <div style={{ color: MARKA.nadtytul, fontWeight: 700, fontSize: 26, letterSpacing: 3 }}>STATUT MUSI ZAWIERAĆ</div>
      {WIERSZE.map((w) => {
        const p = spring({ frame: klatka - w.od, fps, config: { damping: 15 } });
        return (
          <div key={w.tekst} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 20, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: MARKA.zloto, color: MARKA.tlo, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26 }}>✓</div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 36, whiteSpace: "nowrap" }}>{w.tekst}</div>
          </div>
        );
      })}
    </div>
  );
};

export const ProbaStatut3D: React.FC = () => {
  const klatka = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = useTekstury();
  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo }}>
      {t ? (
        <ThreeCanvas width={width} height={height} shadows camera={{ fov: 32, near: 0.1, far: 80 }} gl={{ antialias: true }}>
          <Swiat klatka={klatka} t={t} />
        </ThreeCanvas>
      ) : null}
      <Winieta />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, background: "linear-gradient(rgba(21,22,27,0.85), rgba(21,22,27,0))" }} />
      <div style={{ position: "absolute", top: 100, width: 918, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: MARKA.nadtytul }}>
        PORADNIK OSP • STATUS OPP
      </div>
      <Napis klatka={klatka} />
      <Karta klatka={klatka} />
      <Ziarno />
      <Audio src={staticFile("dzwieki/podklad.mp3")} volume={0.3} />
      {[
        { od: 0, plik: "narastanie", g: 0.35 },
        { od: 116, plik: "papier", g: 0.6 },
        { od: 182, plik: "pop", g: 0.45 },
        { od: 205, plik: "tik", g: 0.5 },
        { od: 228, plik: "tik", g: 0.5 },
      ].map((z) => (
        <Sequence key={z.od} from={z.od} layout="none">
          <Audio src={staticFile(`dzwieki/${z.plik}.mp3`)} volume={z.g} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
