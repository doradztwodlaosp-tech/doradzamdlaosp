// Generuje obrazy scen (OpenAI Images) na podstawie pola "prompt" w odcinek.json.
// Użycie: npm run obrazy -- <odcinek>   (istniejące obrazy są pomijane; usuń plik, by wygenerować ponownie)
// Wymaga: OPENAI_API_KEY; opcjonalnie OBRAZY_MODEL (domyślnie gpt-image-1)
import fs from "node:fs";
import path from "node:path";
import { katalogOdcinka, wczytajOdcinek, wymagajKlucza, zapiszOdcinek } from "./wspolne.mjs";

const klucz = wymagajKlucza("OPENAI_API_KEY");
const model = process.env.OBRAZY_MODEL || "gpt-image-1";

// Wspólny styl wszystkich obrazów: spójny z barwami doradztwodlaosp.pl
const STYL =
  "Cinematic, photorealistic, vertical 2:3 composition, Polish countryside setting, dusk or night blue hour lighting, " +
  "deep navy blue sky and shadows with warm accents and touches of fire-red, soft depth of field, " +
  "important subject in the middle and lower part of the frame, empty calm space at the top for captions. " +
  "No text, no letters, no logos, no watermarks.";

// Stały opis postaci, gdy pojawia się w scenie
const NACZELNIK =
  "Pan Naczelnik: a kind, trustworthy Polish man about 65 years old, retired volunteer firefighter, grey hair and grey moustache, " +
  "warm grandfatherly smile, wearing a dark navy Polish fire brigade (OSP) dress uniform with silver buttons and a peaked cap.";

const katalog = katalogOdcinka(process.argv[2]);
const dane = wczytajOdcinek(katalog);

for (const [i, scena] of dane.sceny.entries()) {
  const plik = scena.obraz || `s${String(i + 1).padStart(2, "0")}.png`;
  if (!scena.prompt) continue;
  if (fs.existsSync(path.join(katalog, plik))) {
    scena.obraz = plik;
    continue;
  }
  const prompt = [scena.prompt, /naczelnik/i.test(scena.prompt) ? NACZELNIK : "", STYL].filter(Boolean).join(" ");
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
