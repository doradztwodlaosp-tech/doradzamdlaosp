import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, KOLUMNA, MARKA } from "./marka";

// Klip z Blendera (public/klipy/stol.mp4) + warstwa marki: tytuł, krótkie hasła, emblemat.
// Jedno hasło na ujęcie, łagodne przenikanie, nic nie skacze.

const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const LAGODNIE = Easing.bezier(0.33, 0, 0.15, 1);
const INK = "#23242A";
const ZLOTO_C = "#A8781A";

const HASLA: { od: number; do: number; tekst: string }[] = [
  { od: 0.1, do: 2.1, tekst: "Własna *ustawa* od 2022" },
  { od: 2.1, do: 4.0, tekst: "Co wam *przysługuje*" },
];

const Haslo: React.FC<{ tekst: string; t: number; od: number; do: number }> = ({ tekst, t, od, do: koniec }) => {
  const wej = interpolate(t, [od, od + 0.45], [0, 1], { ...Z, easing: LAGODNIE });
  const wyj = interpolate(t, [koniec - 0.35, koniec], [1, 0], { ...Z, easing: LAGODNIE });
  const w = Math.min(wej, wyj);
  if (w <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 110,
        width: 860,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 72,
        lineHeight: 1.12,
        color: INK,
        opacity: w,
        textShadow: "0 2px 18px rgba(255,248,235,0.85)",
      }}
    >
      {tekst.split(/(\*[^*]+\*)/).map((cz, i) =>
        cz.startsWith("*") ? (
          <span key={i} style={{ color: ZLOTO_C }}>
            {cz.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{cz}</span>
        ),
      )}
    </div>
  );
};

export const PokazBlender: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#EDE5D6" }}>
      <OffthreadVideo src={staticFile("klipy/stol.mp4")} style={{ width: 1080, height: 1920, objectFit: "cover" }} muted />
      {/* jasne tło pod napisami u góry, żeby hasło było czytelne na drewnie */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 470,
          background: "linear-gradient(180deg, rgba(244,239,230,0.97) 0%, rgba(244,239,230,0.9) 62%, rgba(244,239,230,0) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          width: 1080,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 42,
          letterSpacing: 7,
          color: ZLOTO_C,
        }}
      >
        DORADZTWO DLA OSP
      </div>
      {HASLA.map((h) => (
        <Haslo key={h.tekst} tekst={h.tekst} t={t} od={h.od} do={h.do} />
      ))}
      {/* emblemat marki na dole kadru */}
      <div style={{ position: "absolute", top: 1640, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: MARKA.tlo,
            border: `1.5px solid ${MARKA.zloto}`,
            borderRadius: 999,
            padding: "14px 36px 14px 26px",
            fontFamily: FONT,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          }}
        >
          <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 56, lineHeight: 1 }}>§</span>
          <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 36, letterSpacing: 4 }}>DORADZTWO DLA OSP</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// KOLUMNA zostaje w użyciu do wyrównania z resztą szablonu
void KOLUMNA;
