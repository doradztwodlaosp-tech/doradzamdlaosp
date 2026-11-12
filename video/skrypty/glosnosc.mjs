// Liczy głośność nagrania klatka po klatce (30 kl./s) do ruchu ust Pana Naczelnika.
// Wywoływane automatycznie przez npm run render. Zapisuje glosnosc.json w folderze odcinka.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const policzGlosnosc = (katalog, plikGlosu, fps = 30) => {
  const pcm = spawnSync("ffmpeg", ["-v", "error", "-i", path.join(katalog, plikGlosu), "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], {
    maxBuffer: 1024 * 1024 * 512,
  }).stdout;
  const probek = pcm.length / 2;
  const naKlatke = 48000 / fps;
  const wartosci = [];
  for (let i = 0; i < probek; i += naKlatke) {
    let suma = 0;
    let ile = 0;
    for (let j = i; j < Math.min(probek, i + naKlatke); j++) {
      const v = pcm.readInt16LE(j * 2) / 32768;
      suma += v * v;
      ile++;
    }
    wartosci.push(Math.sqrt(suma / ile));
  }
  const max = Math.max(...wartosci) || 1;
  const wynik = wartosci.map((v) => Math.round(Math.min(1, (v / max) * 1.4) * 100) / 100);
  fs.writeFileSync(path.join(katalog, "glosnosc.json"), JSON.stringify(wynik));
};
