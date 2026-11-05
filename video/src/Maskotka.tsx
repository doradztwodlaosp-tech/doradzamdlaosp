import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Odcinek, ScenaOSP } from "./RolkaOSP";
import { USTAWIENIA as U } from "./marka";

// Maskotka Druh Paragraf: złoty paragraf w strażackim hełmie z § (cała sylwetka; pozy wycięte z arkusza, pliki w public/postac).
// Ustawienia sceny w odcinek.json, pole "postac":
//   { "plan": "pelny" | "obok" | "maly" | "brak", "poza": "tlumaczy",
//     "gest": { "slowo": "siedem", "plan": "obok", "poza": "ostrzega", "ruch": "kiwa" } }
// Gest z planem: postać wchodzi dokładnie na tym słowie (np. żeby wskazać coś na obrazie).

export const POZY = {
  tlumaczy: { szer: 418, wys: 495 },
  "cieszy-sie": { szer: 280, wys: 496 },
  zaskoczony: { szer: 350, wys: 495 },
  ostrzega: { szer: 309, wys: 499 },
  mysli: { szer: 278, wys: 499 },
  wskazuje: { szer: 295, wys: 504 },
} as const;

export type Poza = keyof typeof POZY;
export type Ruch = "kreci" | "kiwa" | "podskok";
export type Plan = "pelny" | "obok" | "maly" | "brak";
export type UstawieniaPostaci = {
  plan?: Plan;
  poza?: Poza;
  gest?: { slowo: string; plan?: Plan; poza?: Poza; ruch?: Ruch };
};

const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const normalizuj = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Położenie i wielkość postaci w danym planie (wysokość obrazka, środek w poziomie, górna krawędź)
const uklad = (plan: Plan, poza: Poza) => {
  const proporcja = POZY[poza].szer / POZY[poza].wys;
  if (plan === "pelny") {
    const wys = U.maskotkaPelnyWysokosc;
    return { wys, szer: wys * proporcja, srodekX: U.strefaPrawo / 2, gora: U.maskotkaPelnyOdGory };
  }
  if (plan === "obok") {
    const wys = U.maskotkaObokWysokosc;
    const szer = wys * proporcja;
    return { wys, szer, srodekX: 20 + szer / 2, gora: U.maskotkaObokOdGory };
  }
  const wys = U.maskotkaMalyWysokosc;
  const szer = wys * proporcja;
  return { wys, szer, srodekX: U.maskotkaMalyOdLewej + szer / 2, gora: 1920 - wys + (plan === "brak" ? wys + 60 : 0) };
};

// Plan, w jakim postać kończy scenę (po ewentualnym geście)
const koncowyPlan = (u: UstawieniaPostaci): Plan => u.gest?.plan ?? u.plan ?? "brak";

const czasSlowa = (scena: ScenaOSP, slowo: string) => {
  const szukane = normalizuj(slowo);
  return scena.slowa.find((s) => normalizuj(s.w).startsWith(szukane))?.s;
};

export const Maskotka: React.FC<{ dane: Odcinek; glosnosc: number[] }> = ({ dane, glosnosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const indeks = dane.sceny.reduce((ost, s, i) => (s.start <= t ? i : ost), 0);
  const scena = dane.sceny[indeks];
  const ust: UstawieniaPostaci = scena.postac ?? {};
  const poprzednie: UstawieniaPostaci = dane.sceny[indeks - 1]?.postac ?? {};
  const planSceny: Plan = ust.plan ?? "brak";
  const planPoprzedniejSceny: Plan = indeks === 0 ? "brak" : koncowyPlan(poprzednie);

  // Gest przypięty do słowa: zmiana pozy i ruch od chwili, gdy pada to słowo
  const czasGestu = ust.gest ? czasSlowa(scena, ust.gest.slowo) : undefined;
  const poGescie = czasGestu !== undefined && t >= czasGestu;
  const poza: Poza = (poGescie && ust.gest?.poza) || ust.poza || "tlumaczy";
  const pozaPoprzednia: Poza = poprzednie.poza ?? "tlumaczy";
  const zmianaPozy = poGescie && ust.gest?.poza ? czasGestu! : scena.start;

  // Plan może się zmienić na słowie gestu (postać wchodzi, żeby coś wskazać)
  const zmianaPlanu = poGescie && ust.gest?.plan !== undefined;
  const plan: Plan = zmianaPlanu ? ust.gest!.plan! : planSceny;
  const planPoprzedni: Plan = zmianaPlanu ? planSceny : planPoprzedniejSceny;
  const momentZmiany = zmianaPlanu ? czasGestu! : scena.start;
  const przejscie = plan === planPoprzedni ? 1 : spring({ frame: frame - Math.round(momentZmiany * fps), fps, config: { damping: 15 } });
  const a = uklad(planPoprzedni, pozaPoprzednia);
  const b = uklad(plan, poza);
  const wys = interpolate(przejscie, [0, 1], [a.wys, b.wys]);
  const srodekX = interpolate(przejscie, [0, 1], [a.srodekX, b.srodekX]);
  const gora = interpolate(przejscie, [0, 1], [a.gora, b.gora]);
  const szer = wys * (POZY[poza].szer / POZY[poza].wys);

  // Krótkie „wskoczenie” przy każdej zmianie pozy
  const pop = spring({ frame: frame - Math.round(zmianaPozy * fps), fps, config: { damping: 11, mass: 0.6 } });

  // Mówienie: lekkie podskoki i sprężanie w rytm głośności nagrania; oddech, gdy milczy
  const usta = glosnosc[frame] ?? 0;
  const oddech = Math.sin(frame / 28) * 0.008;

  // Ruchy przypięte do słów
  const odGestu = czasGestu !== undefined ? t - czasGestu : -1;
  const zanik = odGestu >= 0 ? interpolate(odGestu, [0, 1.2], [1, 0], zakres) : 0;
  let obrot = 0;
  let skok = 0;
  if (ust.gest?.ruch === "kreci") obrot = Math.sin(odGestu * 16) * 6 * zanik;
  if (ust.gest?.ruch === "kiwa") skok = Math.sin(odGestu * 12) * 14 * zanik;
  if (ust.gest?.ruch === "podskok") skok = -Math.abs(Math.sin(odGestu * 9)) * 40 * zanik;

  return (
    <div
      style={{
        position: "absolute",
        left: srodekX - szer / 2,
        top: gora - usta * 8 + skok,
        width: szer,
        height: wys,
        transformOrigin: "50% 100%",
        transform: `rotate(${obrot}deg) scale(${(0.94 + 0.06 * pop) * (1 + oddech)}, ${(0.94 + 0.06 * pop) * (1 + oddech + usta * 0.025)})`,
        filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55))",
      }}
    >
      <Img src={staticFile(`postac/${poza}.png`)} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
