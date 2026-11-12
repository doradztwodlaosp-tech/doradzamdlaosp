import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, USTAWIENIA as U } from "./marka";
import { Naczelnik } from "./Naczelnik";
import { Ilustracja } from "./Sceny";
import { ILUSTRACJE_PION } from "./ScenyPion";
import { type Odcinek, ZAKRES } from "./typy";

// Starsze elementy szablonu (rysowane ilustracje w panelu i rysowany Pan Naczelnik).
// Zostają, żeby dawne odcinki nadal się renderowały; w nowych rolkach używamy zdjęć, map 3D i Druha Paragrafa.

const SRODEK_X = U.strefaPrawo / 2;

export const PanelIlustracji: React.FC<{ nazwa: string; dlugosc: number; jasnosc?: number }> = ({ nazwa, dlugosc, jasnosc = 1 }) => {
  const frame = useCurrentFrame();
  const wejscie = interpolate(frame, [0, U.przenikanie], [0, 1], ZAKRES) * jasnosc;
  const Pion = ILUSTRACJE_PION[nazwa];
  const wysokosc = U.ilustracjaWysokosc;
  const szerokosc = (wysokosc * 900) / 1200;
  return (
    <div style={{ position: "absolute", top: U.ilustracjaOdGory, left: SRODEK_X - szerokosc / 2, width: szerokosc, height: wysokosc, opacity: wejscie }}>
      {Pion ? (
        <svg viewBox="0 0 900 1200" width="100%" height="100%" style={{ fontFamily: `${FONT}, Arial, sans-serif` }}>
          <Pion dlugosc={dlugosc} />
        </svg>
      ) : (
        <div style={{ marginTop: 40, width: "100%", height: (szerokosc * 760) / 900, borderRadius: 32, background: "#F4F1EA", overflow: "hidden" }}>
          <Ilustracja nazwa={nazwa} />
        </div>
      )}
    </div>
  );
};

export const PostacNaczelnika: React.FC<{ dane: Odcinek; glosnosc: number[] }> = ({ dane, glosnosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pierwsza = dane.sceny[0];
  const ostatnia = dane.sceny[dane.sceny.length - 1];
  const usta = glosnosc[frame] ?? 0;
  const mrugniecie = frame % 96 < 4 ? 1 - Math.abs((frame % 96) - 2) / 2 : 0;
  const koniecMachania = pierwsza.koniec + 0.5;
  const uniesienie = interpolate(t, [0, 0.35, koniecMachania - 0.35, koniecMachania], [0, 1, 1, 0], ZAKRES);
  const machanie = uniesienie * (0.98 + 0.02 * Math.sin(frame / 4));
  const kiwanie = t > ostatnia.start ? Math.max(0, Math.sin((t - ostatnia.start) * 5)) : 0;
  const oddech = Math.sin(frame / 25) * 3;
  const wejscie = spring({ frame, fps, config: { damping: 14 } });
  const szerokosc = U.naczelnikSzerokosc;
  const wysokosc = (szerokosc * 900) / 600;
  return (
    <div
      style={{
        position: "absolute",
        left: U.naczelnikOdLewej,
        top: 1920 - wysokosc + (1 - wejscie) * 200 + oddech,
        width: szerokosc,
        height: wysokosc,
        filter: "drop-shadow(0 -6px 24px rgba(0,0,0,0.5))",
      }}
    >
      <Naczelnik usta={usta} mrugniecie={mrugniecie} machanie={machanie} kiwanie={kiwanie} wysokosc={900} />
    </div>
  );
};
