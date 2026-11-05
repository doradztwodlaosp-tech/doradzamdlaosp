// Dopasowuje sceny do gotowego nagrania (lektor.mp3 w folderze odcinka) na podstawie pauz.
// Użycie: npm run czasy -- <odcinek>
// Przydatne, gdy nagranie zrobiono ręcznie w ElevenLabs (bez API).
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { katalogOdcinka, slowaProporcjonalnie, wczytajOdcinek, zapiszOdcinek } from "./wspolne.mjs";

const katalog = katalogOdcinka(process.argv[2]);
const dane = wczytajOdcinek(katalog);
const plik = path.join(katalog, dane.glos || "lektor.mp3");

const log = spawnSync("ffmpeg", ["-hide_banner", "-i", plik, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"], {
  encoding: "utf8",
}).stderr;
const wyjscie = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", plik], { encoding: "utf8" });
const dlugosc = parseFloat(wyjscie);

// Odcinki mowy pomiędzy pauzami
const pauzy = [];
let start = null;
for (const linia of log.split("\n")) {
  const s = linia.match(/silence_start: ([\d.]+)/);
  const e = linia.match(/silence_end: ([\d.]+)/);
  if (s) start = parseFloat(s[1]);
  if (e && start !== null) {
    pauzy.push({ s: start, e: parseFloat(e[1]) });
    start = null;
  }
}
if (start !== null) pauzy.push({ s: start, e: dlugosc });

const mowaStart = pauzy.length && pauzy[0].s < 0.05 ? pauzy[0].e : 0;
const mowaKoniec = pauzy.length && pauzy[pauzy.length - 1].e >= dlugosc - 0.05 ? pauzy[pauzy.length - 1].s : dlugosc;
const wewnetrzne = pauzy.filter((p) => p.s > mowaStart + 0.05 && p.e < mowaKoniec - 0.05);

// Oczekiwane granice scen wg długości tekstu; każdą przypisujemy do najbliższej pauzy (kolejno, bez cofania)
const dlugosci = dane.sceny.map((s) => (s.lektor || s.tekst).length);
const suma = dlugosci.reduce((a, b) => a + b, 0);
const granice = [];
let narastajaco = 0;
let ostatniIndeks = -1;
for (let i = 0; i < dane.sceny.length - 1; i++) {
  narastajaco += dlugosci[i];
  const oczekiwany = mowaStart + ((mowaKoniec - mowaStart) * narastajaco) / suma;
  const pozostaleGranice = dane.sceny.length - 2 - i;
  let najlepszy = -1;
  for (let j = ostatniIndeks + 1; j < wewnetrzne.length - pozostaleGranice; j++) {
    const srodek = (wewnetrzne[j].s + wewnetrzne[j].e) / 2;
    const ocena = Math.abs(srodek - oczekiwany) - 0.8 * (wewnetrzne[j].e - wewnetrzne[j].s);
    if (najlepszy === -1 || ocena < najlepszy.ocena) najlepszy = { j, ocena };
  }
  if (najlepszy === -1) throw new Error("Za mało pauz w nagraniu, by rozdzielić sceny. Dodaj puste linie między zdaniami.");
  granice.push(wewnetrzne[najlepszy.j]);
  ostatniIndeks = najlepszy.j;
}

dane.sceny = dane.sceny.map((scena, i) => {
  const s = i === 0 ? mowaStart : granice[i - 1].e;
  const k = i === dane.sceny.length - 1 ? mowaKoniec : granice[i].s;
  return { ...scena, start: Math.round(s * 1000) / 1000, koniec: Math.round(k * 1000) / 1000, slowa: slowaProporcjonalnie(scena.tekst, s, k) };
});

delete dane.szkic;
zapiszOdcinek(katalog, dane);
dane.sceny.forEach((s, i) => console.log(`${String(i + 1).padStart(2)}. ${s.start.toFixed(2)}–${s.koniec.toFixed(2)}  ${s.tekst}`));
