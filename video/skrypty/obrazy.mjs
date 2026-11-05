// Generuje obrazy scen (OpenAI Images) na podstawie pola "prompt" w odcinek.json.
// Użycie: npm run obrazy -- <odcinek>   (istniejące obrazy są pomijane; usuń plik, by wygenerować ponownie)
// Wymaga: OPENAI_API_KEY; opcjonalnie OBRAZY_MODEL (domyślnie gpt-image-1)
import fs from "node:fs";
import path from "node:path";
import { katalogOdcinka, wczytajOdcinek, wymagajKlucza, zapiszOdcinek } from "./wspolne.mjs";

const klucz = wymagajKlucza("OPENAI_API_KEY");
const model = process.env.OBRAZY_MODEL || "gpt-image-1";

// Wspólny styl wszystkich obrazów: spójny z barwami doradztwodlaosp.pl (opisy po polsku – generator je rozumie)
const STYL =
  "Kinowe, fotorealistyczne zdjęcie w pionie (proporcje 2:3), polskie realia, światło zmierzchu lub niebieskiej godziny, " +
  "głęboki granat nieba i cieni z ciepłymi akcentami i odrobiną strażackiej czerwieni, płytka głębia ostrości, " +
  "najważniejszy element w środkowej i dolnej części kadru, spokojna pusta przestrzeń u góry na napisy. " +
  "Bez napisów, liter, logo i znaków wodnych.";

// Stały opis postaci, gdy pojawia się w scenie
const NACZELNIK =
  "Pan Prawnik: doświadczony polski strażak ochotnik, który jest też prawnikiem, 45–50 lat, szerokie barki, mocna, wysportowana budowa, " +
  "krótkie ciemne włosy siwiejące na skroniach, gładko ogolony, mocna szczęka, spokojny i pewny siebie wyraz twarzy, budzi zaufanie. " +
  "Ma na sobie granatowy mundur galowy polskiej Ochotniczej Straży Pożarnej: jednorzędową marynarkę z wyłogami, czterema kieszeniami " +
  "z patkami i srebrnymi guzikami, białą koszulę, czarny krawat, biało-niebieski pleciony sznur galowy na prawym ramieniu, baretki " +
  "i medale na lewej piersi oraz granatową czapkę z kwadratowym denkiem (polska rogatywka) z niebieskim otokiem, czarnym paskiem, " +
  "lakierowanym czarnym daszkiem i srebrnym orłem z przodu. Postać fikcyjna, nie przypomina żadnej znanej osoby publicznej.";

const katalog = katalogOdcinka(process.argv[2]);
const dane = wczytajOdcinek(katalog);

for (const [i, scena] of dane.sceny.entries()) {
  const plik = scena.obraz || `s${String(i + 1).padStart(2, "0")}.png`;
  if (!scena.prompt) continue;
  if (fs.existsSync(path.join(katalog, plik))) {
    scena.obraz = plik;
    continue;
  }
  const prompt = [scena.prompt, /prawnik|naczelnik/i.test(scena.prompt) ? NACZELNIK : "", STYL].filter(Boolean).join(" ");
  console.log(`Scena ${i + 1}: generuję ${plik}...`);
  const odp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${klucz}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, size: "1024x1536", n: 1 }),
  });
  if (!odp.ok) throw new Error(`OpenAI: ${odp.status} ${await odp.text()}`);
  const { data } = await odp.json();
  fs.writeFileSync(path.join(katalog, plik), Buffer.from(data[0].b64_json, "base64"));
  scena.obraz = plik;
  zapiszOdcinek(katalog, dane);
}

zapiszOdcinek(katalog, dane);
console.log("Gotowe: obrazy zapisane w folderze odcinka.");
