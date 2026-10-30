// Renderuje odcinek do pliku out/<odcinek>.mp4
// Użycie: npm run render -- <odcinek>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { policzGlosnosc } from "./glosnosc.mjs";
import { KATALOG_VIDEO, katalogOdcinka, wczytajOdcinek } from "./wspolne.mjs";

const nazwa = process.argv[2];
const katalog = katalogOdcinka(nazwa);
const dane = wczytajOdcinek(katalog);
if (dane.naczelnik) policzGlosnosc(katalog, dane.glos || "lektor.mp3");

// W chmurze Claude Code używamy przeglądarki zainstalowanej w systemie (Remotion nie może pobrać własnej)
const PRZEGLADARKA = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const opcje = fs.existsSync(PRZEGLADARKA) ? [`--browser-executable=${PRZEGLADARKA}`] : [];

const wyjscie = path.join("out", `${nazwa}.mp4`);
execFileSync("npx", ["remotion", "render", "RolkaOSP", wyjscie, `--props=${JSON.stringify({ odcinek: nazwa })}`, ...opcje], {
  cwd: KATALOG_VIDEO,
  stdio: "inherit",
});
console.log(`Gotowe: video/${wyjscie}`);
