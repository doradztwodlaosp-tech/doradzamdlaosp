import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { FONT, MARKA } from "./marka";
import { ZAKRES } from "./typy";

// Telefon ze stroną doradztwodlaosp.pl: wjeżdża z lewej, strona się przewija, palec „klika” przycisk.
// od – liczba klatek od słowa, na którym telefon ma się pojawić.
export const Telefon: React.FC<{ od: number }> = ({ od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const w = spring({ frame: od, fps, config: { damping: 15 } });
  const przewijanie = interpolate(od, [10, 40], [0, -46], ZAKRES);
  const klik = interpolate(od, [46, 64], [0, 1], ZAKRES);
  const wcisniecie = od >= 46 && od < 54 ? 0.94 : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 600,
        width: 384,
        height: 780,
        transform: `translateX(${(1 - w) * -520}px) rotate(${-2 - (1 - w) * 8}deg)`,
        borderRadius: 58,
        background: "#0B0C10",
        border: "4px solid #3A3D48",
        boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
        padding: 14,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 42, background: "#F4F1EA", overflow: "hidden", position: "relative", fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 12, left: "50%", width: 104, height: 24, marginLeft: -52, borderRadius: 12, background: "#0B0C10", zIndex: 2 }} />
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 18,
            right: 18,
            height: 44,
            borderRadius: 22,
            background: "#E2DED4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 19,
            color: MARKA.tlo,
            zIndex: 2,
          }}
        >
          {MARKA.adres}
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 104, background: "#F4F1EA", zIndex: 1 }} />
        <div style={{ position: "absolute", top: 108, left: 0, right: 0, transform: `translateY(${przewijanie}px)` }}>
          <div style={{ background: MARKA.tlo, padding: "34px 26px 30px" }}>
            <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.1, color: MARKA.zloto }}>Doradztwo</div>
            <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.1, color: MARKA.bialy }}>dla OSP</div>
            <div style={{ marginTop: 12, fontWeight: 600, fontSize: 15, lineHeight: 1.3, color: MARKA.tekstPomocniczy }}>Pomagamy tym, którzy pomagają innym.</div>
          </div>
          <div style={{ padding: "26px 26px 0" }}>
            {[100, 86, 94, 62].map((s, i) => (
              <div key={i} style={{ width: `${s}%`, height: 12, borderRadius: 6, background: "#CFCBC2", marginBottom: 14 }} />
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              {["KRS", "Statut", "OPP"].map((t) => (
                <div key={t} style={{ flex: 1, height: 70, borderRadius: 14, background: "#FFFFFF", border: "2px solid #DDD8CD", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: MARKA.tlo }}>
                  {t}
                </div>
              ))}
            </div>
            <div
              style={{
                position: "relative",
                marginTop: 26,
                height: 72,
                borderRadius: 36,
                background: MARKA.zloto,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 23,
                color: MARKA.tlo,
                transform: `scale(${wcisniecie})`,
              }}
            >
              Umów konsultację
              {klik > 0 && klik < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 40 + klik * 220,
                    height: 40 + klik * 220,
                    marginLeft: -(20 + klik * 110),
                    marginTop: -(20 + klik * 110),
                    borderRadius: "50%",
                    border: `5px solid ${MARKA.tlo}`,
                    opacity: 1 - klik,
                  }}
                />
              )}
            </div>
            {[78, 92].map((s, i) => (
              <div key={i} style={{ width: `${s}%`, height: 12, borderRadius: 6, background: "#CFCBC2", marginTop: 22 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
