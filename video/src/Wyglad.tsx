import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import { MARKA, USTAWIENIA as U } from "./marka";

// Wspólny „filmowy” wygląd wszystkich scen: ziarno, winieta, studio marki, drobinki w świetle.

// Ziarno filmowe: cztery kafelki szumu zmieniane co klatkę (public/wyglad, tworzy je skrypty/ziarno.py)
export const Ziarno: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: U.ziarno, pointerEvents: "none" }}>
      <Img src={staticFile(`wyglad/ziarno-${frame % 4}.jpg`)} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

// Winieta: przyciemnione rogi kadru, wzrok zostaje w środku bezpiecznej strefy
export const Winieta: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 78% 62% at 43% 45%, transparent 52%, rgba(0,0,0,${U.winieta}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

// Drobinki kurzu unoszące się w świetle (w zadanym prostokącie ekranu)
export const Pyl: React.FC<{ gora: number; wysokosc: number; ile?: number; ziarno?: string }> = ({ gora, wysokosc, ile = 26, ziarno = "pyl" }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: ile }).map((_, i) => {
        const x0 = random(`${ziarno}-x-${i}`) * 1080;
        const y0 = random(`${ziarno}-y-${i}`) * wysokosc;
        const tempo = 0.25 + random(`${ziarno}-t-${i}`) * 0.55;
        const rozmiar = 3 + random(`${ziarno}-r-${i}`) * 5;
        const y = (((y0 - frame * tempo) % wysokosc) + wysokosc) % wysokosc;
        const x = x0 + Math.sin(frame / 38 + i * 1.7) * 22;
        const migot = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(frame / 11 + i * 2.3));
        // Drobinki znikają przy górnej i dolnej krawędzi prostokąta
        const brzeg = Math.min(1, y / 120, (wysokosc - y) / 120);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: gora + y,
              width: rozmiar,
              height: rozmiar,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#FFFFFF" : "#F3D58A",
              opacity: migot * brzeg,
              filter: "blur(1px)",
            }}
          />
        );
      })}
    </>
  );
};

// Studio marki: ciemne tło z miękkim światłem i połyskującą podłogą – tu występuje Druh Paragraf
export const Studio: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: MARKA.tlo }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 72% 40% at 43% 44%, #343846 0%, #23252E 45%, rgba(21,22,27,0) 80%)" }} />
    {/* Podłoga: jaśniejszy pas z delikatną linią horyzontu */}
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: U.studioPodloga,
        height: 1920 - U.studioPodloga,
        background: "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.02) 28%, rgba(0,0,0,0) 60%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: U.studioPodloga,
        height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${MARKA.zloto}55 35%, ${MARKA.zloto}55 55%, transparent 100%)`,
      }}
    />
    <Pyl gora={380} wysokosc={1000} ile={18} ziarno="studio" />
  </AbsoluteFill>
);
