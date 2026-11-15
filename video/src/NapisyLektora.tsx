import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT } from "./marka";

export type SlowoCzas = { w: string; s: number; e: number };
type Scena = { slowa?: SlowoCzas[] };
type Fraza = { od: number; slowa: SlowoCzas[] };

const ZLOTO = "#A8781A";

/** Dzieli słowa lektora na krótkie frazy (do 5 słów lub do znaku interpunkcyjnego). Czasy w sekundach od początku rolki. */
export const zbudujFrazy = (sceny: Scena[], przesuniecie: number): Fraza[] => {
  const frazy: Fraza[] = [];
  for (const sc of sceny) {
    if (!sc.slowa?.length) continue;
    let bieżąca: SlowoCzas[] = [];
    const zamknij = () => {
      if (bieżąca.length) frazy.push({ od: bieżąca[0].s, slowa: bieżąca });
      bieżąca = [];
    };
    for (const sl of sc.slowa) {
      bieżąca.push({ w: sl.w, s: sl.s + przesuniecie, e: sl.e + przesuniecie });
      if (/[.,?!;:]$/.test(sl.w) || bieżąca.length >= 5) zamknij();
    }
    zamknij();
  }
  return frazy;
};

/** Złote napisy z tego, co mówi lektor: aktualna fraza, słowa już wypowiedziane pełnym złotem, następne przygaszone. */
export const NapisyLektora: React.FC<{ frazy: Fraza[]; fps?: number; top?: number }> = ({ frazy, fps = 30, top = 1500 }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  let idx = -1;
  for (let i = 0; i < frazy.length; i++) if (frazy[i].od - 0.05 <= t) idx = i;
  if (idx < 0) return null;
  const fr = frazy[idx];
  const koniec = fr.slowa[fr.slowa.length - 1].e;
  const nastepna = frazy[idx + 1]?.od ?? Infinity;
  if (t > koniec + 0.45 && nastepna - koniec > 0.45) return null; // po dłuższej przerwie chowamy
  const wej = interpolate(t, [fr.od - 0.05, fr.od + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top, left: 0, width: 1080, display: "flex", justifyContent: "center", opacity: wej, transform: `translateY(${(1 - wej) * 10}px)` }}>
      <div style={{ maxWidth: 940, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 48, lineHeight: 1.15, background: "rgba(242,236,225,0.88)", borderRadius: 26, padding: "12px 28px" }}>
        {fr.slowa.map((sl, i) => (
          <span key={i} style={{ color: t >= sl.s - 0.02 ? ZLOTO : "rgba(168,120,26,0.38)" }}>
            {sl.w}
            {i < fr.slowa.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
