// Uzupełnia szacunkowe czasy scen i słów w odcinku, który nie ma jeszcze nagrania lektora.
// Dzięki temu rolkę można obejrzeć jako „szkic” (animacje, muzyka i efekty, bez głosu).
// Użycie: npm run szkic -- <odcinek>
// Gdy pojawi się nagranie (lektor.mp3 w folderze odcinka): npm run czasy -- <odcinek>
import { katalogOdcinka, slowaProporcjonalnie, wczytajOdcinek, zapiszOdcinek } from "./wspolne.mjs";

const ZNAKOW_NA_SEKUNDE = 15.5; // tempo żwawego lektora
const PAUZA = 0.42; // przerwa między zdaniami (s)

const katalog = katalogOdcinka(process.argv[2]);
const dane = wczytajOdcinek(katalog);
const zaokr = (x) => Math.round(x * 1000) / 1000;

let t = 0;
dane.sceny = dane.sceny.map((scena) => {
  const dlugosc = Math.max(0.9, (scena.lektor || scena.tekst).length / ZNAKOW_NA_SEKUNDE);
  const start = t;
  const koniec = t + dlugosc;
  t = koniec + PAUZA;
  return { ...scena, start: zaokr(start), koniec: zaokr(koniec), slowa: slowaProporcjonalnie(scena.tekst, start, koniec) };
});
dane.szkic = `Czasy szacunkowe (bez lektora). Po dodaniu lektor.mp3 uruchom: npm run czasy -- ${process.argv[2]}`;
zapiszOdcinek(katalog, dane);
dane.sceny.forEach((s, i) => console.log(`${String(i + 1).padStart(2)}. ${s.start.toFixed(2)}–${s.koniec.toFixed(2)}  ${s.tekst}`));
