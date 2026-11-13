import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { USTAWIENIA as U } from "./marka";
import { czasSlowa, POZY, type Odcinek, type Plan, type Poza, type UstawieniaPostaci, ZAKRES } from "./typy";

// Maskotka Druh Paragraf: złoty paragraf w strażackim hełmie z § (cała sylwetka; pozy wycięte z arkusza, pliki w public/postac).
// Ustawienia sceny w odcinek.json, pole "postac":
//   { "plan": "pelny" | "obok" | "prawo" | "maly" | "brak", "poza": "tlumaczy",
//     "gest": { "slowo": "siedem", "plan": "obok", "poza": "ostrzega", "ruch": "kiwa" } }
// Gest z planem: postać wchodzi dokładnie na tym słowie (np. żeby wskazać coś na obrazie).

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
  if (plan === "prawo") {
    const wys = U.maskotkaPrawoWysokosc;
    const szer = wys * proporcja;
    return { wys, szer, srodekX: U.strefaPrawo - 16 - szer / 2, gora: U.maskotkaPrawoOdGory };
  }
  const wys = U.maskotkaMalyWysokosc;
  const szer = wys * proporcja;
  return { wys, szer, srodekX: U.maskotkaMalyOdLewej + szer / 2, gora: 1920 - wys + (plan === "brak" ? wys + 60 : 0) };
};

// Plan, w jakim postać kończy scenę (po ewentualnym geście)
const koncowyPlan = (u: UstawieniaPostaci): Plan => u.gest?.plan ?? u.plan ?? "brak";

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
  const pozaPoprzednia: Poza = (poGescie ? ust.poza : (poprzednie.gest?.poza ?? poprzednie.poza)) ?? "tlumaczy";
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
  if (gora > 1920) return null;

  // Krótkie „wskoczenie” przy każdej zmianie pozy
  const pop = spring({ frame: frame - Math.round(zmianaPozy * fps), fps, config: { damping: 20, mass: 0.8 } });

  // Postać stoi spokojnie: bez podskakiwania w rytm głosu, tylko bardzo powolny oddech.
  // (glosnosc zostaje w parametrach na przyszłość – do ruchu ust, gdy będzie arkusz mówienia)
  void glosnosc;
  const oddech = Math.sin(frame / 45) * 0.004;

  // Ruchy przypięte do słów
  const odGestu = czasGestu !== undefined ? t - czasGestu : -1;
  const zanik = odGestu >= 0 ? interpolate(odGestu, [0, 1.2], [1, 0], ZAKRES) : 0;
  let obrot = 0;
  let skok = 0;
  // Gesty są spokojne i krótkie (marka: poważny ekspert)
  if (ust.gest?.ruch === "kreci") obrot = Math.sin(odGestu * 8) * 2 * zanik;
  if (ust.gest?.ruch === "kiwa") skok = Math.sin(odGestu * 7) * 5 * zanik;
  if (ust.gest?.ruch === "podskok") skok = -Math.abs(Math.sin(odGestu * 5)) * 12 * zanik;

  // Na połyskującej podłodze (studio, mokry bruk) postać ma delikatne odbicie
  const zOdbiciem = plan === "pelny" || plan === "prawo";
  const plik = staticFile(`postac/${poza}.png`);
  const lewo = srodekX - szer / 2;
  const dol = gora + wys;

  return (
    <>
      {/* Cień pod stopami – im wyżej podskok, tym mniejszy */}
      <div
        style={{
          position: "absolute",
          left: lewo - szer * 0.05,
          top: dol - szer * 0.11,
          width: szer * 1.1,
          height: szer * 0.24,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 70%)",
          transform: `scale(${1 + skok / 200})`,
        }}
      />
      {zOdbiciem && (
        <Img
          src={plik}
          style={{
            position: "absolute",
            left: lewo,
            top: dol - wys * 0.035,
            width: szer,
            height: wys,
            transform: "scaleY(-1)",
            opacity: 0.2 * przejscie,
            filter: "blur(2px)",
            WebkitMaskImage: "linear-gradient(0deg, #000 0%, transparent 36%)",
            maskImage: "linear-gradient(0deg, #000 0%, transparent 36%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: lewo,
          top: gora + skok,
          width: szer,
          height: wys,
          transformOrigin: "50% 100%",
          transform: `rotate(${obrot}deg) scale(${(0.97 + 0.03 * pop) * (1 + oddech)}, ${(0.97 + 0.03 * pop) * (1 + oddech)})`,
          filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.5))",
        }}
      >
        <Img src={plik} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
};
