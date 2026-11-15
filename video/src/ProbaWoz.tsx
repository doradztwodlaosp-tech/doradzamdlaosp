import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { PlanszaJasna } from "./RolkaOSP";
import { FONT, MARKA } from "./marka";

const ZLOTO = "#A8781A";
const GRAFIT = "#1E1F25";
const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WYS_OBR = 782 / 1870; // proporcje wyciętego zdjęcia wozu

const Haslo: React.FC<{ linie: { t: string; z?: boolean }[]; rozmiar: number; top: number }> = ({ linie, rozmiar, top }) => (
  <div style={{ position: "absolute", top, left: 70, width: 940, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: rozmiar, lineHeight: 1.04, color: GRAFIT }}>
    {linie.map((l, i) => (
      <React.Fragment key={i}>
        <span style={{ color: l.z ? ZLOTO : GRAFIT }}>{l.t}</span>
        <br />
      </React.Fragment>
    ))}
  </div>
);

/** Wóz wycięty ze zdjęcia, położony na tle marki, z cieniem pod kołami. */
const Woz: React.FC<{ plik: string; proporcja: number; szer: number; lewo: number; dol: number; opacity: number }> = ({ plik, proporcja, szer, lewo, dol, opacity }) => {
  const wys = szer * proporcja;
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity }}>
      <div style={{ position: "absolute", left: lewo + szer * 0.04, top: dol - szer * 0.03, width: szer * 0.9, height: szer * 0.05, borderRadius: "50%", background: "rgba(25,20,15,0.5)", filter: `blur(${szer * 0.02}px)` }} />
      <Img src={staticFile(plik)} style={{ position: "absolute", left: lewo, top: dol - wys, width: szer, height: wys }} />
    </div>
  );
};

export const ProbaWoz: React.FC = () => {
  const f = useCurrentFrame();
  const E = { ...Z, easing: Easing.inOut(Easing.cubic) };
  // ujęcie 1: przód pod kątem (cały wóz)
  const szP = interpolate(f, [0, 90], [1000, 1060], E);
  const dolP = 1470;
  // ujęcie 2: bok – cały wóz, najazd i przejazd wzdłuż boku
  const T2 = [92, 112, 130, 192];
  const szB = interpolate(f, T2, [1000, 1000, 2300, 2300], E);
  const lewoB = interpolate(f, T2, [40, 40, 80, -1260], E);
  const dolB = interpolate(f, T2, [1400, 1400, 1500, 1500], E);
  // ujęcie 3: przód z bliska (światła), potem odjazd na cały wóz
  const T3 = [202, 262, 296];
  const szC = interpolate(f, T3, [2400, 2500, 1000], E);
  const lewoC = interpolate(f, T3, [60, 40, 40], E);
  const dolC = interpolate(f, T3, [2295, 2400, 1470], E);
  const opP = interpolate(f, [0, 1, 78, 90], [1, 1, 1, 0], Z);
  const opB = interpolate(f, [92, 104, 188, 200], [0, 1, 1, 0], Z);
  const opC = interpolate(f, [202, 214], [0, 1], Z);
  const nap = interpolate(f, [8, 22, 62, 74], [0, 1, 1, 0], Z);
  const napB = interpolate(f, [112, 126, 178, 190], [0, 1, 1, 0], Z);
  const napC = interpolate(f, [214, 228, 255, 266], [0, 1, 1, 0], Z);
  return (
    <AbsoluteFill style={{ backgroundColor: "#F2ECE1" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 40% at 50% 30%, #FBF8F2 0%, rgba(242,236,225,0) 75%)" }} />
      {/* podłoga */}
      <div style={{ position: "absolute", left: 0, top: 1250, width: 1080, height: 670, background: "linear-gradient(to bottom, #E8DEC9 0%, #D8CAAE 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 1246, width: 1080, height: 6, background: "rgba(168,120,26,0.35)" }} />
      <Woz plik="foto/woz-przod-wyciety.png" proporcja={1008 / 1290} szer={szP} lewo={540 - szP / 2} dol={dolP} opacity={opP} />
      <Woz plik="foto/woz-bok-wyciety.png" proporcja={782 / 1870} szer={szB} lewo={lewoB} dol={dolB} opacity={opB} />
      <Woz plik="foto/woz-przod-wyciety.png" proporcja={1008 / 1290} szer={szC} lewo={lewoC} dol={dolC} opacity={opC} />
      <div style={{ opacity: nap }}>
        <Haslo linie={[{ t: "STRAŻAK" }, { t: "OCHOTNIK", z: true }]} rozmiar={128} top={230} />
        <div style={{ position: "absolute", top: 540, left: 70, width: 940, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 52, color: GRAFIT }}>Kim jest w świetle prawa?</div>
      </div>
      <div style={{ opacity: napB }}>
        <Haslo linie={[{ t: "Nie tylko remiza" }, { t: "i wóz", z: true }]} rozmiar={96} top={230} />
      </div>
      <div style={{ opacity: napC }}>
        <Haslo linie={[{ t: "Własna ustawa" }, { t: "od 2022", z: true }]} rozmiar={100} top={230} />
      </div>
      <div style={{ position: "absolute", top: 110, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 42, letterSpacing: 6, color: ZLOTO }}>DORADZTWO DLA OSP</div>
      <div style={{ position: "absolute", top: 1660, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: MARKA.tlo, border: `3px solid ${MARKA.zloto}`, borderRadius: 999, padding: "14px 36px" }}>
          <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 48, lineHeight: 1, fontFamily: FONT }}>§</span>
          <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 32, letterSpacing: 4, fontFamily: FONT }}>DORADZTWO DLA OSP</span>
        </div>
      </div>
      <Sequence from={300} durationInFrames={105}>
        <PlanszaJasna
          haslo={[{ tekst: "Pomagamy tym," }, { tekst: "którzy pomagają innym.", zloty: true }]}
          pigulka="Zaobserwuj nas"
          kontakt="Zadzwoń lub napisz: 720 868 902"
          stopka="Materiał informacyjny. Nie zastępuje indywidualnej analizy."
        />
      </Sequence>
    </AbsoluteFill>
  );
};
