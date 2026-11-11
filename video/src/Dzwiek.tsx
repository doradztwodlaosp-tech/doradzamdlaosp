import React, { useMemo } from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { USTAWIENIA as U } from "./marka";
import type { ZdarzenieDzwiekowe } from "./Mapy";
import { type Odcinek, ZAKRES } from "./typy";

// Ścieżka dźwiękowa: lektor, podkład muzyczny (ściszany pod głosem) i efekty przypięte do zdarzeń na ekranie.
export const Dzwiek: React.FC<{ odcinek: string; dane: Odcinek; glosnosc: number[]; zdarzenia: ZdarzenieDzwiekowe[] }> = ({ odcinek, dane, glosnosc, zdarzenia }) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Dla każdej klatki: czy w pobliżu mówi lektor (0–1, wygładzone) – pod głosem podkład jest cichszy
  const mowa = useMemo(() => {
    const surowe = Array.from({ length: durationInFrames }, (_, f) => {
      for (let i = Math.max(0, f - 8); i <= Math.min(glosnosc.length - 1, f + 8); i++) if (glosnosc[i] > 0.1) return 1;
      return 0;
    });
    return surowe.map((_, f) => {
      let suma = 0;
      let ile = 0;
      for (let i = Math.max(0, f - 7); i <= Math.min(surowe.length - 1, f + 7); i++) {
        suma += surowe[i];
        ile++;
      }
      return suma / ile;
    });
  }, [glosnosc, durationInFrames]);

  const muzyka = dane.muzyka === false ? null : dane.muzyka ? staticFile(`odcinki/${odcinek}/${dane.muzyka}`) : staticFile("dzwieki/podklad.mp3");
  const glosnoscMuzyki = (f: number) => {
    const poziom = dane.szkic ? U.muzykaGlosnosc * 1.5 : U.muzykaGlosnosc + (U.muzykaPodGlosem - U.muzykaGlosnosc) * (mowa[f] ?? 0);
    return poziom * interpolate(f, [0, 12, durationInFrames - 36, durationInFrames - 1], [0.5, 1, 1, 0], ZAKRES);
  };

  return (
    <>
      {!dane.szkic && (
        <Sequence from={Math.round((dane.wstep ?? 0) * fps)} layout="none">
          <Audio src={staticFile(`odcinki/${odcinek}/${dane.glos}`)} />
        </Sequence>
      )}
      {muzyka && <Audio src={muzyka} volume={glosnoscMuzyki} />}
      {zdarzenia.map((z, i) => {
        const od = Math.round(z.t * fps);
        if (od < 0 || od >= durationInFrames - 2) return null;
        return (
          <Sequence key={`${i}-${z.plik}`} from={od} durationInFrames={Math.min(60, durationInFrames - od)} layout="none">
            <Audio src={staticFile(`dzwieki/${z.plik}.mp3`)} volume={z.glosnosc * U.efektyGlosnosc} />
          </Sequence>
        );
      })}
    </>
  );
};
