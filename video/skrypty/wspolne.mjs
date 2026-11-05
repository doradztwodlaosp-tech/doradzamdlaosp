// Wspólne funkcje skryptów rolek.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const KATALOG_VIDEO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const katalogOdcinka = (nazwa) => {
  if (!nazwa) {
    console.error("Podaj nazwę odcinka, np.: npm run glos -- nowy-zarzad");
    process.exit(1);
  }
  return path.join(KATALOG_VIDEO, "public", "odcinki", nazwa);
};

export const wczytajOdcinek = (katalog) => JSON.parse(fs.readFileSync(path.join(katalog, "odcinek.json"), "utf8"));

export const zapiszOdcinek = (katalog, dane) =>
  fs.writeFileSync(path.join(katalog, "odcinek.json"), JSON.stringify(dane, null, 2) + "\n");

export const wymagajKlucza = (nazwa) => {
  const klucz = process.env[nazwa];
  if (!klucz) {
    console.error(`Brak zmiennej ${nazwa}. Dodaj ją w ustawieniach środowiska (sekrety) i otwórz nową sesję.`);
    process.exit(1);
  }
  return klucz;
};

const zaokr = (x) => Math.round(x * 1000) / 1000;

// Słowa z napisu (tekst) z czasami rozłożonymi proporcjonalnie do długości.
// Używane, gdy nie ma dokładnych czasów znaków (np. nagranie dostarczone jako MP3).
export const slowaProporcjonalnie = (tekst, start, koniec) => {
  const slowa = tekst.split(/\s+/).filter(Boolean);
  const wagi = slowa.map((w) => w.length + 2 + (/[.,:;!?]$/.test(w) ? 3 : 0));
  const suma = wagi.reduce((a, b) => a + b, 0);
  let t = start;
  return slowa.map((w, i) => {
    const d = ((koniec - start) * wagi[i]) / suma;
    const s = { w, s: zaokr(t), e: zaokr(t + d) };
    t += d;
    return s;
  });
};

// Słowa napisu z czasami wziętymi z wypowiedzi lektora (np. z ElevenLabs).
// lektorSlowa: [{s, e}] w kolejności; gdy liczba słów się różni (np. "KRS" vs "ka-er-es"), dzielimy proporcjonalnie.
export const slowaZCzasow = (tekst, lektorSlowa, start, koniec) => {
  const slowa = tekst.split(/\s+/).filter(Boolean);
  if (lektorSlowa.length !== slowa.length) return slowaProporcjonalnie(tekst, start, koniec);
  return slowa.map((w, i) => ({ w, s: zaokr(lektorSlowa[i].s), e: zaokr(lektorSlowa[i].e) }));
};
