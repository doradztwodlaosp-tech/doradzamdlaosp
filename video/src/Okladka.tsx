import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { FONT, MARKA } from "./marka";

const ZLOTO = "#A8781A";
const GRAFIT = "#23242A";

/** Okładka rolki (nieruchomy obraz 1080×1920) w stylu planszy końcowej: kremowe tło, grafit i złoto. */
export const Okladka: React.FC<{ zdjecie?: string }> = ({ zdjecie = "okladka-woz.png" }) => (
  <AbsoluteFill style={{ backgroundColor: "#F2ECE1", fontFamily: FONT }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 40% at 50% 35%, #FBF8F2 0%, rgba(242,236,225,0) 75%)" }} />
    <div style={{ position: "absolute", top: 120, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: MARKA.tlo, border: `3px solid ${MARKA.zloto}`, borderRadius: 999, padding: "16px 40px" }}>
        <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 52, lineHeight: 1 }}>§</span>
        <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 34, letterSpacing: 4 }}>DORADZTWO DLA OSP</span>
      </div>
    </div>
    <div style={{ position: "absolute", top: 290, left: 70, width: 940, textAlign: "center", fontWeight: 800, fontSize: 112, lineHeight: 1.02, color: GRAFIT }}>
      STRAŻAK <span style={{ color: ZLOTO }}>OCHOTNIK</span>
    </div>
    <div style={{ position: "absolute", top: 560, left: 70, width: 940, textAlign: "center", fontWeight: 700, fontSize: 60, lineHeight: 1.15, color: GRAFIT }}>
      Kim jest w świetle <span style={{ color: ZLOTO }}>prawa</span>?
    </div>
    <div style={{ position: "absolute", top: 720, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 160, height: 4, background: MARKA.zloto, borderRadius: 2 }} />
    </div>
    <div style={{ position: "absolute", top: 800, left: 90, width: 900, height: 760, borderRadius: 36, overflow: "hidden", border: `4px solid ${MARKA.zloto}`, boxShadow: "0 24px 60px rgba(35,36,42,0.25)" }}>
      <Img src={staticFile(zdjecie)} style={{ width: 900, height: 1600, objectFit: "cover", marginTop: -330 }} />
    </div>
    <div style={{ position: "absolute", top: 1620, left: 70, width: 940, textAlign: "center", fontWeight: 700, fontSize: 44, color: GRAFIT }}>
      Pomagamy tym, <span style={{ color: ZLOTO }}>którzy pomagają</span> innym.
    </div>
  </AbsoluteFill>
);
