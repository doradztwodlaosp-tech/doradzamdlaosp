import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropsMapy, ZdarzenieDzwiekowe } from "./Mapy";
import { LicznikOgolny } from "./Stol3D";
import type { ScenaOSP } from "./typy";

// Scena „klip z Blendera”: zamiast liczyć 3D w przeglądarce, odtwarza gotowy klip wyrenderowany w Blenderze
// (public/klipy/<odcinek>.mp4, patrz blender/rolka.py). Hasła, części, emblemat i plansza dochodzą z szablonu.
// Pole "liczba" w scenie rysuje dużą liczbę nad klipem.

export const KlipBlender: React.FC<PropsMapy> = ({ sceny, klatkaStartu, odcinek, wyglad }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (klatkaStartu + frame) / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#EDE5D6" }}>
      <OffthreadVideo src={staticFile(`klipy/${odcinek}.mp4`)} startFrom={klatkaStartu} style={{ width: 1080, height: 1920, objectFit: "cover" }} muted />
      {sceny.map((s, i) =>
        s.liczba ? (
          <LicznikOgolny key={i} t={t} od={(s.slowa.find((w) => w.w.replace(/[^\p{L}\p{N}]/gu, "").startsWith(s.liczba!.slowo))?.s ?? s.start) - 0.1} do={s.koniec + 0.3} l={s.liczba} jasny={wyglad === "jasny"} />
        ) : null,
      )}
    </AbsoluteFill>
  );
};

export const dzwiekiKlipu = (sceny: ScenaOSP[]): ZdarzenieDzwiekowe[] => {
  const z: ZdarzenieDzwiekowe[] = [];
  sceny.slice(1).forEach((s) => z.push({ t: s.start - 0.3, plik: "swist", glosnosc: 0.2 }));
  return z.filter((e) => e.t > 0);
};
