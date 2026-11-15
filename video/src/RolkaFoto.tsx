import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT, MARKA } from "./marka";
import { PlanszaJasna } from "./RolkaOSP";
import { FilarIlustracja, RemizaIlustracja } from "./Ilustracje";
import odcinek from "../public/odcinki/kim-jest-strazak/odcinek.json";
import { NapisyLektora, zbudujFrazy } from "./NapisyLektora";

const ZLOTO = "#A8781A";
const GRAFIT = "#1E1F25";
const Z = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const E = { ...Z, easing: Easing.inOut(Easing.cubic) };
const S = (sek: number) => Math.round(sek * 30);

/** Okna scen (sekundy) – jak w scenariuszu „Strażak ochotnik”; między scenami jest przerwa 0,5 s (bez nakładania). */
const SCENY = [
  [0, 4.63],
  [5.13, 8.49],
  [8.99, 13.49],
  [13.99, 19.27],
  [19.77, 24.13],
  [24.63, 28.2],
  [28.7, 31.63],
  [32.13, 34.49],
  [34.99, 38.49],
].map(([a, b]) => [S(a), S(b)] as const);
const KONIEC_TRESCI = S(38.99);
const FRAZY = zbudujFrazy(odcinek.sceny as { slowa?: { w: string; s: number; e: number }[] }[], odcinek.wstep);
const DLUGOSC = S(42.7) + 20;

/** Wejście i wyjście sceny (8 klatek), pierwsza scena nie zaczyna od zera. */
const okno = (f: number, i: number) => {
  const [a, b] = SCENY[i];
  return interpolate(f, [a, a + 8, b - 8, b], [i === 0 ? 1 : 0, 1, 1, 0], Z);
};

const Slowa: React.FC<{ tekst: string; rozmiar?: number; top?: number; kolor?: string }> = ({ tekst, rozmiar = 96, top = 230, kolor = GRAFIT }) => (
  <div style={{ position: "absolute", top, left: 60, width: 960, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: rozmiar, lineHeight: 1.05, color: kolor }}>
    {tekst.split("|").map((linia, li) => (
      <div key={li}>
        {linia.split("*").map((cz, i) => (
          <span key={i} style={{ color: i % 2 ? ZLOTO : kolor }}>{cz}</span>
        ))}
      </div>
    ))}
  </div>
);

const Tlo: React.FC<{ podloga?: boolean }> = ({ podloga }) => (
  <>
    <AbsoluteFill style={{ backgroundColor: "#F2ECE1" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 40% at 50% 30%, #FBF8F2 0%, rgba(242,236,225,0) 75%)" }} />
    {podloga ? (
      <>
        <div style={{ position: "absolute", left: 0, top: 1250, width: 1080, height: 670, background: "linear-gradient(to bottom, #E8DEC9 0%, #D8CAAE 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 1246, width: 1080, height: 6, background: "rgba(168,120,26,0.35)" }} />
      </>
    ) : null}
  </>
);

const Woz: React.FC<{ plik: string; proporcja: number; szer: number; lewo: number; dol: number }> = ({ plik, proporcja, szer, lewo, dol }) => {
  const wys = szer * proporcja;
  return (
    <>
      <div style={{ position: "absolute", left: lewo + szer * 0.04, top: dol - szer * 0.03, width: szer * 0.9, height: szer * 0.05, borderRadius: "50%", background: "rgba(25,20,15,0.5)", filter: `blur(${szer * 0.02}px)` }} />
      <Img src={staticFile(plik)} style={{ position: "absolute", left: lewo, top: dol - wys, width: szer, height: wys }} />
    </>
  );
};
const PRZOD = { plik: "foto/woz-przod-wyciety.png", proporcja: 1008 / 1290 };
const BOK = { plik: "foto/woz-bok-wyciety.png", proporcja: 782 / 1870 };

/** Zdjęcie w ramce (jak okładka) z powolnym najazdem i podpisem autora. */
const FotoKarta: React.FC<{ plik: string; autor: string; od: number; do_: number; f: number }> = ({ plik, autor, od, do_, f }) => {
  const zoom = interpolate(f, [od, do_], [1.0, 1.14], E);
  return (
    <div style={{ position: "absolute", left: 40, top: 640, width: 1000, height: 700 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 32, overflow: "hidden", border: `4px solid ${MARKA.zloto}`, boxShadow: "0 28px 60px rgba(35,36,40,0.28)", background: "#ddd" }}>
        <Img src={staticFile(plik)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: "50% 60%" }} />
      </div>
      <div style={{ position: "absolute", top: 716, left: 0, width: 1000, textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: 24, color: "#7A7468" }}>Fot. {autor} (CC BY)</div>
    </div>
  );
};

/** Prawdziwa strona ustawy (render PDF z publicznego serwisu Sejmu) ze złotym podkreśleniem kluczowego zdania. */
const StronaUstawy: React.FC<{ plik: string; x: number; y: number; w: number; obrot: number; zoom: number; pod: { x0: number; y0: number; x1: number; y1: number }; postep: number }> = ({ plik, x, y, w, obrot, zoom, pod, postep }) => {
  const sk = w / 910;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 1287 * sk, transform: `rotate(${obrot}deg) scale(${zoom})`, transformOrigin: "50% 40%", boxShadow: "0 26px 56px rgba(40,34,24,0.34), 0 2px 6px rgba(40,34,24,0.22)", background: "#fff" }}>
      <Img src={staticFile(plik)} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", left: pod.x0 * sk, top: pod.y0 * sk, width: (pod.x1 - pod.x0) * sk * postep, height: (pod.y1 - pod.y0) * sk, background: "rgba(232,176,48,0.55)", mixBlendMode: "multiply", borderRadius: 3 }} />
    </div>
  );
};

const Kartka: React.FC<{ napis: string; x: number; y: number; obrot: number; wejscie: number }> = ({ napis, x, y, obrot, wejscie }) => (
  <div style={{ position: "absolute", left: x, top: y + (1 - wejscie) * 60, width: 440, height: 300, transform: `rotate(${obrot}deg)`, opacity: wejscie, background: "#FFFEFA", borderRadius: 14, boxShadow: "0 20px 44px rgba(40,34,24,0.28)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 46, lineHeight: 1.15, color: GRAFIT, padding: 24, boxSizing: "border-box", border: `3px solid ${MARKA.zloto}` }}>
    <div>{napis.split("|").map((l, i) => <div key={i}>{l}</div>)}</div>
  </div>
);

export const RolkaFoto: React.FC = () => {
  const f = useCurrentFrame();
  // ── ruch wozu w poszczególnych scenach ──
  const t = (i: number) => interpolate(f, [SCENY[i][0], SCENY[i][1]], [0, 1], Z);
  // S3: bok – najazd i przejazd wzdłuż
  const k3 = interpolate(t(3), [0, 0.15, 0.85, 1], [0, 0, 1, 1], E);
  const szBok = interpolate(k3, [0, 1], [1000, 2300]);
  const lewoBok = interpolate(t(3), [0, 0.2, 0.9, 1], [40, 80, -1260, -1260], E) + 0;
  const dolBok = interpolate(k3, [0, 1], [1400, 1500]);
  // S5: bok wąski (z liczbą) – delikatny najazd
  const sz5 = interpolate(t(5), [0, 1], [1000, 1060], E);
  // S7: przód pod kątem – odjazd
  const sz7 = interpolate(t(7), [0, 1], [1100, 1000], E);
  // S8: przód z bliska
  const sz8 = interpolate(t(8), [0, 1], [2400, 2500], E);
  const licz = Math.round(interpolate(f, [SCENY[5][0] + 14, SCENY[5][0] + 72], [16, 16000], E));
  const liczTxt = licz >= 1000 ? `${Math.floor(licz / 1000)} ${String(licz % 1000).padStart(3, "0")}` : String(licz);
  const hak = interpolate(f, [S(2.2) - 10, S(2.2)], [1, 0], Z);
  const hakWejscie = interpolate(f, [8, 22], [0, 1], Z);
  const wydzielone = f >= KONIEC_TRESCI;
  const kart = (i: number) => interpolate(f, [SCENY[4][0] + 12 + i * 12, SCENY[4][0] + 28 + i * 12], [0, 1], { ...Z, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#F2ECE1" }}>
      <Tlo podloga={[3, 5, 7, 8].some((i) => f >= SCENY[i][0] - 2 && f <= SCENY[i][1] + 2)} />
      {/* S0 remiza z wozami */}
      {f < SCENY[0][1] + 2 ? (
        <div style={{ opacity: okno(f, 0) }}>
          <div style={{ position: "absolute", left: 70, top: 700 - t(0) * 20, transform: `scale(${1 + t(0) * 0.05})`, transformOrigin: "50% 60%" }}>
            <RemizaIlustracja szer={940} />
          </div>
          <div style={{ opacity: hak * hakWejscie }}>
            <Slowa tekst={"*STRAŻAK|OCHOTNIK*"} rozmiar={120} top={250} />
          </div>
          <div style={{ opacity: hak * hakWejscie, position: "absolute", top: 520, left: 60, width: 960, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 50, color: GRAFIT }}>Kim jest w świetle prawa?</div>
          <div style={{ opacity: 1 - hak }}>
            <Slowa tekst={"Nie tylko *remiza*|i wóz"} />
          </div>
        </div>
      ) : null}
      {/* S1 Prawo o stowarzyszeniach */}
      {f >= SCENY[1][0] - 1 && f <= SCENY[1][1] + 1 ? (
        <div style={{ opacity: okno(f, 1) }}>
          <Slowa tekst={"*Stowarzyszenie*|w KRS"} />
          <StronaUstawy plik="foto/ustawy/stow-2261-03.png" x={220} y={520 - t(1) * 20} w={640} obrot={-2 + t(1) * 1.5} zoom={1 + t(1) * 0.04} pod={{ x0: 108, y0: 571, x1: 836, y1: 593 }} postep={interpolate(f, [SCENY[1][0] + 28, SCENY[1][0] + 58], [0, 1], E)} />
        </div>
      ) : null}
      {/* S2 ustawa o OSP */}
      {f >= SCENY[2][0] - 1 && f <= SCENY[2][1] + 1 ? (
        <div style={{ opacity: okno(f, 2) }}>
          <Slowa tekst={"Własna *ustawa*|od 2022"} />
          <StronaUstawy plik="foto/ustawy/osp-2490-01.png" x={220} y={520 - t(2) * 20} w={640} obrot={1.5 - t(2) * 1.2} zoom={1 + t(2) * 0.04} pod={{ x0: 108, y0: 619, x1: 836, y1: 654 }} postep={interpolate(f, [SCENY[2][0] + 34, SCENY[2][0] + 70], [0, 1], E)} />
        </div>
      ) : null}
      {/* S3 uprawnienia – bok wozu */}
      {f >= SCENY[3][0] - 1 && f <= SCENY[3][1] + 1 ? (
        <div style={{ opacity: okno(f, 3) }}>
          <div style={{ position: "absolute", top: 205, left: 0, width: 1080, textAlign: "center", fontFamily: FONT }}>
            <span style={{ fontWeight: 800, fontSize: 60, color: ZLOTO }}>1/2 </span>
            <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: 4, color: GRAFIT }}>UPRAWNIENIA</span>
          </div>
          <Slowa tekst={"Co wam|*przysługuje*"} top={290} rozmiar={92} />
          <Woz {...BOK} szer={szBok} lewo={lewoBok} dol={dolBok} />
        </div>
      ) : null}
      {/* S4 obowiązki – kartki */}
      {f >= SCENY[4][0] - 1 && f <= SCENY[4][1] + 1 ? (
        <div style={{ opacity: okno(f, 4) }}>
          <div style={{ position: "absolute", top: 205, left: 0, width: 1080, textAlign: "center", fontFamily: FONT }}>
            <span style={{ fontWeight: 800, fontSize: 60, color: ZLOTO }}>2/2 </span>
            <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: 4, color: GRAFIT }}>OBOWIĄZKI</span>
          </div>
          <Slowa tekst={"Czego się od was|*wymaga*"} top={290} rozmiar={84} />
          <Kartka napis="SZKOLENIA" x={80} y={700} obrot={-4} wejscie={kart(0)} />
          <Kartka napis={"BADANIA|LEKARSKIE"} x={560} y={730} obrot={3.5} wejscie={kart(1)} />
          <Kartka napis="GOTOWOŚĆ" x={90} y={1060} obrot={3} wejscie={kart(2)} />
          <Kartka napis="DOKUMENTY" x={550} y={1080} obrot={-3.5} wejscie={kart(3)} />
        </div>
      ) : null}
      {/* S5 w całej Polsce – liczba */}
      {f >= SCENY[5][0] - 1 && f <= SCENY[5][1] + 1 ? (
        <div style={{ opacity: okno(f, 5) }}>
          <Slowa tekst={"W całej *Polsce*"} rozmiar={96} top={250} />
          <div style={{ position: "absolute", top: 440, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 210, color: ZLOTO, lineHeight: 1 }}>{liczTxt}</div>
          <div style={{ position: "absolute", top: 680, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 52, color: GRAFIT }}>jednostek OSP</div>
          <Woz {...PRZOD} szer={sz5} lewo={540 - sz5 / 2} dol={1520} />
        </div>
      ) : null}
      {/* S6 filar – remiza */}
      {f >= SCENY[6][0] - 1 && f <= SCENY[6][1] + 1 ? (
        <div style={{ opacity: okno(f, 6) }}>
          <Slowa tekst={"*Filar*|ochrony ludności"} />
          <div style={{ position: "absolute", left: 270, top: 620 - t(6) * 18, transform: `scale(${1 + t(6) * 0.05})`, transformOrigin: "50% 60%" }}>
            <FilarIlustracja wys={900} />
          </div>
        </div>
      ) : null}
      {/* S7 my pilnujemy prawa – bok */}
      {f >= SCENY[7][0] - 1 && f <= SCENY[7][1] + 1 ? (
        <div style={{ opacity: okno(f, 7) }}>
          <Slowa tekst={"My pilnujemy|*prawa*"} />
          <Woz {...BOK} szer={sz7} lewo={540 - sz7 / 2} dol={1420} />
        </div>
      ) : null}
      {/* S8 pytanie – przód z bliska */}
      {f >= SCENY[8][0] - 1 && f <= SCENY[8][1] + 1 ? (
        <div style={{ opacity: okno(f, 8) }}>
          <Slowa tekst={"Znacie swoje|*uprawnienia*?"} rozmiar={100} />
          <Woz {...PRZOD} szer={sz8} lewo={60} dol={2295} />
        </div>
      ) : null}
      {/* stałe elementy marki */}
      {!wydzielone ? (
        <>
          <NapisyLektora frazy={FRAZY} top={1500} />
          <div style={{ position: "absolute", top: 110, left: 0, width: 1080, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 42, letterSpacing: 6, color: ZLOTO }}>DORADZTWO DLA OSP</div>
          <div style={{ position: "absolute", top: 1660, left: 0, width: 1080, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: MARKA.tlo, border: `3px solid ${MARKA.zloto}`, borderRadius: 999, padding: "14px 36px" }}>
              <span style={{ color: MARKA.zloto, fontWeight: 800, fontSize: 48, lineHeight: 1, fontFamily: FONT }}>§</span>
              <span style={{ color: MARKA.bialy, fontWeight: 800, fontSize: 32, letterSpacing: 4, fontFamily: FONT }}>DORADZTWO DLA OSP</span>
            </div>
          </div>
        </>
      ) : null}
      <Sequence from={KONIEC_TRESCI} durationInFrames={DLUGOSC - KONIEC_TRESCI}>
        <PlanszaJasna
          haslo={[{ tekst: "Pomagamy tym," }, { tekst: "którzy pomagają innym.", zloty: true }]}
          pigulka="Zaobserwuj nas"
          kontakt="Zadzwoń lub napisz: 720 868 902"
          stopka="Materiał informacyjny. Nie zastępuje indywidualnej analizy."
        />
      </Sequence>
    </AbsoluteFill>
  );
};
export const DLUGOSC_ROLKI_FOTO = DLUGOSC;
