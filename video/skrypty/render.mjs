// Renderuje odcinek do pliku out/<odcinek>.mp4 oraz okładkę out/<odcinek>-okladka.png (pierwsza klatka).
// Użycie: npm run render -- <odcinek>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { policzGlosnosc } from "./glosnosc.mjs";
import { KATALOG_VIDEO, katalogOdcinka, wczytajOdcinek } from "./wspolne.mjs";

const nazwa = process.argv[2];
const katalog = katalogOdcinka(nazwa);
const dane = wczytajOdcinek(katalog);
// Głośność lektora klatka po klatce: do ruchu postaci i ściszania muzyki pod głosem
if (!dane.szkic) policzGlosnosc(katalog, dane.glos || "lektor.mp3");

// W chmurze Claude Code używamy przeglądarki zainstalowanej w systemie (Remotion nie może pobrać własnej)
const PRZEGLADARKA = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const przegladarka = fs.existsSync(PRZEGLADARKA) ? [`--browser-executable=${PRZEGLADARKA}`] : [];
const props = `--props=${JSON.stringify({ odcinek: nazwa })}`;
const uruchom = (argumenty) => execFileSync("npx", ["remotion", ...argumenty], { cwd: KATALOG_VIDEO, stdio: "inherit" });

// crf 24: dobra jakość przy rozsądnej wielkości pliku (ziarno filmowe mocno powiększa pliki przy niższych wartościach)
const wyjscie = path.join("out", `${nazwa}.mp4`);
uruchom(["render", "RolkaOSP", wyjscie, props, "--crf=24", `--concurrency=${os.cpus().length}`, ...przegladarka]);

const okladka = path.join("out", `${nazwa}-okladka.png`);
uruchom(["still", "RolkaOSP", okladka, props, "--frame=0", ...przegladarka]);

console.log(`Gotowe: video/${wyjscie} i video/${okladka}`);
