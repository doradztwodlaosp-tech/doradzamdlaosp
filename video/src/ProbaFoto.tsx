import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, MARKA } from "./marka";

const ZLOTO = "#A8781A";
const GRAFIT = "#1E1F25";
const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Haslo: React.FC<{ linie: { t: string; z?: boolean }[]; rozmiar?: number; top?: number }> = ({ linie, rozmiar = 96, top = 250 }) => (
  <div style={{ position: "absolute", top, left: 70, width: 940, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: rozmiar, lineHeight: 1.04, color: GRAFIT, textShadow: "0 2px 18px rgba(255,255,255,0.65)" }}>
    {linie.map((l, i) => (
      <span key={i} style={{ color: l.z ? ZLOTO : GRAFIT }}>
        {l.t}
        <br />
      </span>
    ))}
  </div>
);

const Scena: React.FC<{ od: number; do_: number; children: React.ReactNode }> = ({ od, do_, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [od, od + 12, do_ - 12, do_], [0, 1, 1, 0], Z);
  if (f < od || f > do_) return null;
  return <AbsoluteFill style={{ opacity: od === 0 ? Math.min(1, o + (f < 12 ? 1 : 0)) : o }}>{children}</AbsoluteFill>;
};

/** Próbka rolki ze zdjęć prawdziwego wozu OSP (herb gminy usunięty ze zdjęć). */
export const ProbaFoto: React.FC = () => {
  const f = useCurrentFrame();
  // scena A: najazd na przód wozu (zdjęcie pionowe)
  const zoomA = interpolate(f, [0, 112], [1.0, 1.14], { ...Z, easing: Easing.inOut(Easing.cubic) });
  const panA = interpolate(f, [0, 112], [0, -40], Z);
  // scena B: przejazd wzdłuż boku (od kabiny do zabudowy)
  const panB = interpolate(f, [98, 210], [0, -1380], { ...Z, easing: Easing.inOut(Easing.cubic) });
  const zoomB = interpolate(f, [98, 210], [1.0, 1.05], Z);
  const nap = interpolate(f, [8, 22, 88, 100], [0, 1, 1, 0], Z);
  const napB = interpolate(f, [112, 126], [0, 1], Z);
  return (
    <AbsoluteFill style={{ backgroundColor: "#F2ECE1" }}>
      <Scena od={0} do_={112}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img src={staticFile("foto/woz-przod.jpg")} style={{ position: "absolute", left: -183 + panA, top: 0, width: 1447, height: 1920, transform: `scale(${zoomA})`, transformOrigin: "42% 66%" }} />
        </AbsoluteFill>
        <div style={{ opacity: nap }}>
          <Haslo linie={[{ t: "STRAŻAK", z: false }, { t: "OCHOTNIK", z: true }]} rozmiar={128} top={210} />
          <div style={{ position: "absolute", top: 520, left: 70, width: 940, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 52, color: GRAFIT, textShadow: "0 2px 16px rgba(255,255,255,0.7)" }}>Kim jest w świetle prawa?</div>
        </div>
      </Scena>
      <Scena od={98} do_={210}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img src={staticFile("foto/woz-bok.jpg")} style={{ position: "absolute", left: panB, top: 0, width: 2550, height: 1920, transform: `scale(${zoomB})`, transformOrigin: "30% 50%" }} />
        </AbsoluteFill>
        <div style={{ opacity: napB }}>
          <Haslo linie={[{ t: "Nie tylko " }, { t: "remiza", z: true }, { t: " i wóz" }].map((l) => ({ ...l, t: l.t }))} rozmiar={92} top={250} />
        </div>
      </Scena>
      {/* górny napis i znak marki */}
      <div style={{ position: "absolute", top: 110, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 42, letterSpacing: 6, color: ZLOTO, textShadow: "0 2px 12px rgba(255,255,255,0.7)" }}>DORADZTWO DLA OSP</div>
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(21,22,27,0.55) 0%, rgba(21,22,27,0) 22%)" }} />
      <div style={{ position: "absolute", top: 1660, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: MARKA.tlo, border: `3px solid ${MARKA.zloto}`, borderRadius: 999, padding: "14px 36px" }}>
          <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 48, lineHeight: 1, fontFamily: FONT }}>§</span>
          <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 32, letterSpacing: 4, fontFamily: FONT }}>DORADZTWO DLA OSP</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
