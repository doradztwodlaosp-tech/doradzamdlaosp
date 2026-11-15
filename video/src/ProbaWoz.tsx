import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
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
const Woz: React.FC<{ szer: number; lewo: number; dol: number; opacity: number }> = ({ szer, lewo, dol, opacity }) => {
  const wys = szer * WYS_OBR;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity }}>
      <div style={{ position: "absolute", left: lewo + szer * 0.03, top: dol - szer * 0.035, width: szer * 0.94, height: szer * 0.06, borderRadius: "50%", background: "rgba(25,20,15,0.55)", filter: `blur(${szer * 0.02}px)` }} />
      <Img src={staticFile("foto/woz-bok-wyciety.png")} style={{ position: "absolute", left: lewo, top: dol - wys, width: szer, height: wys }} />
    </div>
  );
};

export const ProbaWoz: React.FC = () => {
  const f = useCurrentFrame();
  const o = (od: number, do_: number) => interpolate(f, [od, od + 12, do_ - 12, do_], [od === 0 ? 1 : 0, 1, 1, 0], Z);
  // A: cały wóz, powolny najazd
  const szA = interpolate(f, [0, 112], [1000, 1150], { ...Z, easing: Easing.inOut(Easing.cubic) });
  const lewoA = 540 - szA / 2;
  // B: bliżej, przejazd od kabiny do zabudowy
  const szB = 2300;
  const lewoB = interpolate(f, [98, 210], [80, -1260], { ...Z, easing: Easing.inOut(Easing.cubic) });
  const nap = interpolate(f, [8, 22, 88, 100], [0, 1, 1, 0], Z);
  const napB = interpolate(f, [112, 126], [0, 1], Z);
  return (
    <AbsoluteFill style={{ backgroundColor: "#F2ECE1" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 40% at 50% 30%, #FBF8F2 0%, rgba(242,236,225,0) 75%)" }} />
      {/* podłoga */}
      <div style={{ position: "absolute", left: 0, top: 1250, width: 1080, height: 670, background: "linear-gradient(to bottom, #E8DEC9 0%, #D8CAAE 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 1246, width: 1080, height: 6, background: "rgba(168,120,26,0.35)" }} />
      <Woz szer={szA} lewo={lewoA} dol={1380} opacity={f <= 112 ? o(0, 112) : 0} />
      <Woz szer={szB} lewo={lewoB} dol={1480} opacity={f >= 98 ? o(98, 210) : 0} />
      <div style={{ opacity: nap }}>
        <Haslo linie={[{ t: "STRAŻAK" }, { t: "OCHOTNIK", z: true }]} rozmiar={128} top={230} />
        <div style={{ position: "absolute", top: 540, left: 70, width: 940, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 52, color: GRAFIT }}>Kim jest w świetle prawa?</div>
      </div>
      <div style={{ opacity: napB }}>
        <Haslo linie={[{ t: "Nie tylko remiza" }, { t: "i wóz", z: true }]} rozmiar={96} top={230} />
      </div>
      <div style={{ position: "absolute", top: 110, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 42, letterSpacing: 6, color: ZLOTO }}>DORADZTWO DLA OSP</div>
      <div style={{ position: "absolute", top: 1660, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: MARKA.tlo, border: `3px solid ${MARKA.zloto}`, borderRadius: 999, padding: "14px 36px" }}>
          <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 48, lineHeight: 1, fontFamily: FONT }}>§</span>
          <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 32, letterSpacing: 4, fontFamily: FONT }}>DORADZTWO DLA OSP</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
