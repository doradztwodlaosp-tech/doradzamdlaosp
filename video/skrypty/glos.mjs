// Generuje głos lektora w ElevenLabs i zapisuje czasy scen i słów do odcinek.json.
// Użycie: npm run glos -- <odcinek>
// Wymaga: ELEVENLABS_API_KEY; opcjonalnie ELEVENLABS_VOICE (nazwa lub ID głosu, domyślnie "Pan Prawnik OSP")
import fs from "node:fs";
import path from "node:path";
import { katalogOdcinka, slowaZCzasow, wczytajOdcinek, wymagajKlucza, zapiszOdcinek } from "./wspolne.mjs";

const API = "https://api.elevenlabs.io/v1";
const klucz = wymagajKlucza("ELEVENLABS_API_KEY");
const nazwaGlosu = process.env.ELEVENLABS_VOICE || "Pan Prawnik OSP";
const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

const katalog = katalogOdcinka(process.argv[2]);
const dane = wczytajOdcinek(katalog);

const zapytanie = async (url, opcje = {}) => {
  const odp = await fetch(url, { ...opcje, headers: { "xi-api-key": klucz, "Content-Type": "application/json", ...opcje.headers } });
  if (!odp.ok) throw new Error(`ElevenLabs: ${odp.status} ${await odp.text()}`);
  return odp.json();
};

const znajdzGlos = async () => {
  const { voices } = await zapytanie(`${API}/voices`);
  const glos = voices.find((v) => v.voice_id === nazwaGlosu) ?? voices.find((v) => v.name === nazwaGlosu);
  if (!glos) throw new Error(`Nie znaleziono głosu "${nazwaGlosu}". Dostępne: ${voices.map((v) => v.name).join(", ")}`);
  return glos.voice_id;
};

const idGlosu = await znajdzGlos();

// Cały tekst lektora w jednym nagraniu; pusta linia między scenami daje naturalną pauzę
const ODSTEP = "\n\n";
const zakresy = [];
let tekst = "";
for (const scena of dane.sceny) {
  if (tekst) tekst += ODSTEP;
  const mowa = scena.lektor || scena.tekst;
  zakresy.push({ od: tekst.length, mowa });
  tekst += mowa;
}

console.log(`Generuję głos (${dane.sceny.length} scen, ${tekst.length} znaków)...`);
const wynik = await zapytanie(`${API}/text-to-speech/${idGlosu}/with-timestamps`, {
  method: "POST",
  body: JSON.stringify({ text: tekst, model_id: model }),
});

fs.writeFileSync(path.join(katalog, "lektor.mp3"), Buffer.from(wynik.audio_base64, "base64"));
const { character_start_times_seconds: poczatki, character_end_times_seconds: konce } = wynik.alignment;

dane.glos = "lektor.mp3";
delete dane.szkic;
dane.sceny = dane.sceny.map((scena, i) => {
  const { od, mowa } = zakresy[i];
  // Słowa wypowiedzi lektora z czasami pierwszego i ostatniego znaku
  const slowaLektora = [...mowa.matchAll(/\S+/g)].map((m) => ({
    s: poczatki[od + m.index],
    e: konce[od + m.index + m[0].length - 1],
  }));
  const start = slowaLektora[0].s;
  const koniec = slowaLektora[slowaLektora.length - 1].e;
  return { ...scena, start, koniec, slowa: slowaZCzasow(scena.tekst, slowaLektora, start, koniec) };
});

zapiszOdcinek(katalog, dane);
console.log(`Gotowe: lektor.mp3 (${dane.sceny[dane.sceny.length - 1].koniec.toFixed(1)} s) i czasy w odcinek.json`);
