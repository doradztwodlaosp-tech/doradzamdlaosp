import { StolOSP, dzwiekiStolu } from "./Stol3D";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARKA, USTAWIENIA as U } from "./marka";
import {
  Blok,
  Cien,
  Dokument,
  Droga,
  IzoDefs,
  Linia,
  Odznaka,
  Pionek,
  Podloga,
  Remiza,
  Sad,
  Tabliczka,
  kameraW,
  punktNaTrasie,
  rzut,
  uporzadkuj,
  type Kamera,
} from "./Izo";
import { czasSlowa, type ScenaOSP, ZAKRES } from "./typy";

// Mapy 3D: infografiki, po których „lata” kamera. Wszystko pojawia się na konkretnych słowach lektora.
// Kolejne sceny odcinka z tym samym polem "mapa" tworzą jeden ciągły przelot.

export type PropsMapy = { sceny: ScenaOSP[]; klatkaStartu: number; pierwsze: boolean; wyglad?: "rysunek" | "makieta" | "jasny" };
export type ZdarzenieDzwiekowe = { t: number; plik: string; glosnosc: number };

const EKRAN: [number, number] = [U.strefaPrawo / 2, 940];
const EKRAN_WNIOSKU: [number, number] = [430, 1010];
const DROGA = "#262932";
const SZARY_PIONEK = "#8A90A0";

// Wartość zmieniająca się odcinkami między punktami (czas, wartość); czasy nie muszą być idealnie rosnące
const odcinkami = (t: number, punkty: [number, number][]) => {
  const p: [number, number][] = [];
  punkty.forEach(([c, v]) => p.push([p.length ? Math.max(c, p[p.length - 1][0] + 0.01) : c, v]));
  if (t <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    if (t <= p[i + 1][0]) {
      const u = (t - p[i][0]) / (p[i + 1][0] - p[i][0]);
      const e = u * u * (3 - 2 * u);
      return p[i][1] + (p[i + 1][1] - p[i][1]) * e;
    }
  }
  return p[p.length - 1][1];
};

const Plotno: React.FC<{ wejscie: number; children: React.ReactNode }> = ({ wejscie, children }) => (
  <AbsoluteFill style={{ backgroundColor: MARKA.tlo, opacity: wejscie }}>
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ fontFamily: `${FONT}, Arial, sans-serif` }}>
      <IzoDefs />
      {children}
    </svg>
  </AbsoluteFill>
);

const Ziemia: React.FC<{ k: Kamera; zakres: [number, number, number, number] }> = ({ k, zakres }) => (
  <>
    <Podloga k={k} zakres={zakres} />
    <rect x="0" y="0" width="1080" height="1920" fill="url(#izo-zanik)" />
  </>
);

// Mały dokument unoszący się nad trasą (wniosek w drodze)
const Pakiet: React.FC<{ x: number; y: number; skala: number; napis: string }> = ({ x, y, skala, napis }) => (
  <g transform={`translate(${x} ${y}) scale(${skala})`}>
    <circle cx="0" cy="62" r="26" fill={MARKA.zloto} opacity="0.5" filter="url(#izo-blask)" />
    <rect x="-34" y="-46" width="68" height="88" rx="8" fill="#F4F1EA" stroke={MARKA.zloto} strokeWidth="4" />
    <rect x="-34" y="-46" width="68" height="24" rx="8" fill={MARKA.zloto} />
    <text x="0" y="-29" textAnchor="middle" fontWeight="800" fontSize="13" fill={MARKA.tlo}>
      {napis}
    </text>
    {[-10, 4, 18].map((ly) => (
      <rect key={ly} x="-22" y={ly} width="44" height="6" rx="3" fill="#C9C6BE" />
    ))}
  </g>
);

// ───────────── Mapa: droga wniosku z remizy do KRS (przez internet) ─────────────
const czasyWniosku = (sceny: ScenaOSP[]) => {
  const s = sceny[0];
  const T = (slowo: string, zapas: number) => czasSlowa(s, slowo) ?? s.start + zapas;
  return {
    start: s.start,
    koniec: sceny[sceny.length - 1].koniec,
    zgloszenie: T("zgłaszacie", 1.0),
    wniosek: T("wnioskiem", 1.8),
    krs: T("KRS", 2.7),
    internet: T("internet", 3.7),
    papier: T("nie", 4.6),
  };
};

export const DrogaWniosku: React.FC<PropsMapy> = ({ sceny, klatkaStartu, pierwsze }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (klatkaStartu + frame) / fps;
  const c = czasyWniosku(sceny);
  const wej = (od: number, damping = 14) => spring({ frame: Math.round((t - od) * fps), fps, config: { damping } });
  const k = kameraW(
    uporzadkuj([
      { t: c.start - 0.4, cel: [-2.3, 0.0, 0.7], skala: 138, yaw: 38 },
      { t: c.krs + 0.6, cel: [-2.7, 3.5, 0.9], skala: 95, yaw: 46 },
      { t: c.koniec + 0.8, cel: [-2.7, 3.5, 0.9], skala: 100, yaw: 49 },
    ]),
    t,
    EKRAN_WNIOSKU,
  );
  const wezly: [number, number][] = [
    [0, 0],
    [0, 5],
    [-5.3, 5],
  ];
  const dotarcie = c.krs + 0.5;
  const postep = interpolate(t, [c.zgloszenie, dotarcie], [0, 1], ZAKRES);
  const lot = interpolate(t, [c.wniosek, dotarcie], [0, 1], ZAKRES);
  const [px, py] = punktNaTrasie(wezly, Math.min(lot, postep));
  const pk = rzut(k, [px, py, 1.0 + Math.sin(t * 6) * 0.06]);
  const wPakiet = wej(c.wniosek, 11) * interpolate(t, [dotarcie, dotarcie + 0.25], [1, 0], ZAKRES);
  const wDotarl = wej(dotarcie, 10);
  const drzwi = rzut(k, [-5.3, 6.5, 0.8]);
  const puls = interpolate(t, [dotarcie, dotarcie + 0.7], [0, 1], ZAKRES);

  return (
    <Plotno wejscie={pierwsze ? 1 : interpolate(frame, [0, U.przenikanie], [0, 1], ZAKRES)}>
      <Ziemia k={k} zakres={[-12, -6, 6, 13]} />
      <Droga k={k} wezly={wezly} szer={0.95} kolor={DROGA} />
      <Linia k={k} wezly={wezly} postep={1} kolor="#4A4E5B" grubosc={5} kreski="2 20" />
      <Linia k={k} wezly={wezly} postep={postep} kolor={MARKA.zloto} grubosc={9} blask />
      <Sad k={k} poz={[-7.0, 5.8]} w={wej(c.zgloszenie - 0.25)} />
      <Remiza k={k} poz={[-3.9, -1.3]} w={wej(c.start - 0.15)} czas={t} />
      {puls > 0 && puls < 1 && <circle cx={drzwi.x} cy={drzwi.y} r={30 + puls * 130} fill="none" stroke={MARKA.zloto} strokeWidth="7" opacity={1 - puls} />}
      {wPakiet > 0.01 && <Pakiet x={pk.x} y={pk.y} skala={wPakiet * (k.skala / 120) * 1.6} napis="WNIOSEK" />}
      <Tabliczka k={k} p={[-5.3, 5.8, 2.85]} tekst="WNIOSEK W KRS" w={wDotarl} zlota slupek={0.55} />
      <Tabliczka k={k} p={[0, 5, 0]} tekst="PRZEZ INTERNET" w={wej(c.internet, 11)} zlota slupek={1.5} />
      <Tabliczka
        k={k}
        p={[2.6, 1.6, 0]}
        tekst="NA PAPIERZE"
        w={wej(c.papier, 11)}
        slupek={0.9}
        skreslenie={interpolate(t, [c.papier + 0.3, c.papier + 0.6], [0, 1], ZAKRES)}
      />
    </Plotno>
  );
};

const dzwiekiWniosku = (sceny: ScenaOSP[]): ZdarzenieDzwiekowe[] => {
  const c = czasyWniosku(sceny);
  return [
    { t: c.wniosek, plik: "pop", glosnosc: 0.5 },
    { t: c.krs + 0.5, plik: "dzwonek", glosnosc: 0.4 },
    { t: c.internet, plik: "pop", glosnosc: 0.5 },
    { t: c.papier, plik: "pop", glosnosc: 0.4 },
    { t: c.papier + 0.3, plik: "blad", glosnosc: 0.5 },
  ];
};

// ───────────── Mapa: droga do statusu OPP (statut → walne → KRS → status) ─────────────
// Skrót czterech zakazów z art. 20 ust. 1 pkt 6 ustawy o działalności pożytku publicznego (do sprawdzenia przez prawnika)
const ZAKAZY = ["Pożyczki i poręczenia", "Przekazywanie majątku", "Korzystanie z majątku", "Zakupy od powiązanych firm"];

const czasyOpp = (sceny: ScenaOSP[]) => {
  const g = (i: number) => sceny[Math.min(i, sceny.length - 1)];
  const T = (i: number, slowo: string, zapas: number) => czasSlowa(g(i), slowo) ?? g(i).start + zapas;
  return {
    start: g(0).start,
    pokaze: T(0, "Pokażę", 1.6),
    statut: g(1).start,
    statutSlowo: T(1, "statutu", 0.6),
    komisja: g(2).start,
    niezalezna: T(2, "niezależną", 0.6),
    komisjaSlowo: T(2, "komisję", 1.2),
    zakazy: T(3, "cztery", 0.3),
    ale: g(4).start,
    walne: T(5, "walne", 1.0),
    uchwala: T(5, "uchwala", 0.7),
    krs: T(5, "KRS", 3.0),
    dopiero: g(6).start,
    status: T(6, "status", 1.4),
    koniec: g(6).koniec,
  };
};

export const DrogaOPP: React.FC<PropsMapy> = ({ sceny, klatkaStartu, pierwsze }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (klatkaStartu + frame) / fps;
  const c = czasyOpp(sceny);
  const wej = (od: number, damping = 14) => spring({ frame: Math.round((t - od) * fps), fps, config: { damping } });

  const k = kameraW(
    uporzadkuj([
      // Zbliżenie na zablokowaną odznakę – cel podróży
      { t: c.start - 0.4, cel: [-6, 13.1, 1.7], skala: 215, yaw: 40 },
      { t: c.pokaze - 0.1, cel: [-6, 13.1, 1.7], skala: 228, yaw: 42 },
      // Odjazd: widać całą drogę z góry, potem kamera schodzi na jej początek
      { t: c.pokaze + 0.55, cel: [-2.53, 5.91, 1.9], skala: 68, yaw: 45 },
      { t: c.pokaze + 0.95, cel: [-2.53, 5.91, 1.9], skala: 71, yaw: 45 },
      { t: c.statut - 0.15, cel: [0.9, -0.5, 0.8], skala: 200, yaw: 44 },
      { t: c.statut + 0.5, cel: [1.75, -0.45, 1.05], skala: 255, yaw: 46 },
      { t: c.komisja, cel: [1.75, -0.45, 1.05], skala: 262, yaw: 47 },
      { t: c.komisja + 0.7, cel: [-2.0, 1.4, 0.75], skala: 200, yaw: 43 },
      { t: c.zakazy - 0.15, cel: [-2.0, 1.4, 0.75], skala: 206, yaw: 44 },
      { t: c.zakazy + 0.5, cel: [-0.2, 1.2, 0.4], skala: 150, yaw: 45 },
      { t: c.ale, cel: [-0.2, 1.2, 0.4], skala: 152, yaw: 46 },
      { t: c.walne, cel: [2.3, 5.4, 0.8], skala: 210, yaw: 47 },
      { t: c.krs - 0.45, cel: [2.3, 5.4, 0.8], skala: 216, yaw: 48 },
      { t: c.krs + 0.45, cel: [-8.2, 7.5, 1.3], skala: 180, yaw: 42 },
      { t: c.dopiero, cel: [-8.2, 7.5, 1.3], skala: 185, yaw: 43 },
      // Finał: odznaka zmienia się w złotą, kamera powoli się do niej zbliża
      { t: c.status, cel: [-6, 13.1, 1.7], skala: 215, yaw: 44 },
      { t: c.koniec + 0.6, cel: [-6, 13.1, 1.7], skala: 240, yaw: 46 },
    ]),
    t,
    EKRAN,
  );

  const wezly: [number, number][] = [
    [0, -1.5],
    [0, 6],
    [-6, 6],
    [-6, 12],
  ];
  const postep = odcinkami(t, [
    [c.statut, 0.0],
    [c.statut + 0.6, 0.07],
    [c.ale, 0.1],
    [c.walne, 0.385],
    [c.krs - 0.45, 0.4],
    [c.krs + 0.45, 0.692],
    [c.dopiero, 0.72],
    [c.status, 1.0],
  ]);
  const [czoloX, czoloY] = punktNaTrasie(wezly, postep);
  const czolo = rzut(k, [czoloX, czoloY, 0.05]);
  const zloto = interpolate(t, [c.status, c.status + 0.5], [0, 1], ZAKRES);
  const rozmiarTabliczki = Math.max(25, Math.min(36, (k.skala / 190) * 36));

  // Wszystkie stacje stoją od początku, ale przygaszone; każda „zapala się”, gdy lektor do niej dochodzi
  const wstaje = wej(c.start - 0.3);
  const jasnosc = (od: number) => 0.28 + 0.72 * interpolate(t, [od - 0.15, od + 0.25], [0, 1], ZAKRES);
  const wZarzad = wej(c.komisja + 0.15);
  const wKomisja = wej(c.komisjaSlowo - 0.1);
  const wMur = wej(c.niezalezna, 12);
  // Podpisy szczegółów (zarząd, komisja) znikają, gdy pojawiają się karty zakazów
  const szczegoly = interpolate(t, [c.zakazy - 0.2, c.zakazy + 0.1], [1, 0], ZAKRES);
  const przyciemnienie = interpolate(t, [c.zakazy - 0.1, c.zakazy + 0.3, c.ale - 0.05, c.ale + 0.3], [0, 0.6, 0.6, 0], ZAKRES);

  return (
    <AbsoluteFill>
      <Plotno wejscie={pierwsze ? 1 : interpolate(frame, [0, U.przenikanie], [0, 1], ZAKRES)}>
        <Ziemia k={k} zakres={[-16, -8, 9, 20]} />
        <Droga k={k} wezly={wezly} szer={0.95} kolor={DROGA} />
        <Linia k={k} wezly={wezly} postep={1} kolor="#4A4E5B" grubosc={5} kreski="2 20" />
        <Linia k={k} wezly={wezly} postep={postep} kolor={MARKA.zloto} grubosc={9} blask />
        {postep > 0.001 && postep < 0.999 && (
          <>
            <circle cx={czolo.x} cy={czolo.y} r="26" fill={MARKA.zloto} opacity="0.6" filter="url(#izo-blask)" />
            <circle cx={czolo.x} cy={czolo.y} r="11" fill="#FFF3CF" />
          </>
        )}

        {/* Numery stacji na drodze */}
        {(
          [
            [0, -1.5, "1"],
            [0, 6, "2"],
            [-6, 6, "3"],
          ] as [number, number, string][]
        ).map(([x, y, numer]) => {
          const p = rzut(k, [x, y, 0.03]);
          const r = 0.42 * k.skala;
          return (
            <g key={numer}>
              <ellipse cx={p.x} cy={p.y} rx={r} ry={r * 0.669} fill={MARKA.tlo} stroke={MARKA.zloto} strokeWidth="4" />
              <text x={p.x} y={p.y + r * 0.26} textAnchor="middle" fontWeight="800" fontSize={r * 0.8} fill={MARKA.zloto}>
                {numer}
              </text>
            </g>
          );
        })}

        {/* Od najdalszych do najbliższych */}
        <Odznaka k={k} poz={[-6.7, 12.4]} w={wstaje} zloto={zloto} napis="OPP" czas={t} />
        <g opacity={jasnosc(c.krs - 0.35)}>
          <Sad k={k} poz={[-9.9, 6.7]} w={wstaje} />
        </g>

        {wZarzad > 0.01 && (
          <g>
            <Cien k={k} poz={[-3.7, 0.6]} roz={[1.6, 1.6]} sila={0.3} />
            <Blok k={k} poz={[-3.7, 0.6, 0]} roz={[1.6, 1.6, 0.16 * wZarzad]} kolor="#2F323E" rant="#5C6170" />
            <Pionek k={k} p={[-3.25, 1.75]} z={0.16} kolor={SZARY_PIONEK} w={wZarzad} />
            <Pionek k={k} p={[-2.55, 1.6]} z={0.16} kolor={SZARY_PIONEK} w={wZarzad} />
            <Pionek k={k} p={[-3.1, 1.0]} z={0.16} kolor={SZARY_PIONEK} w={wZarzad} />
          </g>
        )}
        {wMur > 0.01 && <Blok k={k} poz={[-2.07, 0.4, 0]} roz={[0.14, 2.0, 1.05 * wMur]} kolor={MARKA.zloto} />}
        {wKomisja > 0.01 && (
          <g>
            <Cien k={k} poz={[-1.9, 0.6]} roz={[1.6, 1.6]} sila={0.3} />
            <Blok k={k} poz={[-1.9, 0.6, 0]} roz={[1.6, 1.6, 0.16 * wKomisja]} kolor="#2F323E" rant={MARKA.zloto} />
            <Pionek k={k} p={[-1.45, 1.75]} z={0.16} kolor={MARKA.zloto} w={wKomisja} />
            <Pionek k={k} p={[-0.75, 1.6]} z={0.16} kolor={MARKA.zloto} w={wKomisja} />
            <Pionek k={k} p={[-1.3, 1.0]} z={0.16} kolor={MARKA.zloto} w={wKomisja} />
          </g>
        )}

        <g opacity={jasnosc(c.walne - 0.3)}>
          <Cien k={k} poz={[0.9, 4.3]} roz={[2.8, 2.2]} sila={0.3} />
          <Blok k={k} poz={[0.9, 4.3, 0]} roz={[2.8, 2.2, 0.16 * wstaje]} kolor="#2F323E" rant={MARKA.zloto} />
          <Pionek k={k} p={[1.8, 6.05]} z={0.16} kolor={SZARY_PIONEK} w={wstaje} />
          <Pionek k={k} p={[2.8, 6.05]} z={0.16} kolor={SZARY_PIONEK} w={wstaje} />
          <Blok k={k} poz={[1.4, 5.2, 0.16]} roz={[1.8, 0.5, 0.42 * wstaje]} kolor="#7A5A3B" />
          {[1.4, 2.3, 3.2].map((x, i) => (
            <Pionek key={x} k={k} p={[x, 4.72]} z={0.16} kolor={i === 1 ? MARKA.zloto : SZARY_PIONEK} w={wstaje} />
          ))}
          {/* Karty do głosowania unoszone nad głowami */}
          {[
            [1.8, 6.05],
            [2.8, 6.05],
            [1.4, 4.72],
            [2.3, 4.72],
            [3.2, 4.72],
          ].map(([x, y], i) => {
            const w = wej(c.uchwala + i * 0.07, 10);
            if (w <= 0.01) return null;
            const a = rzut(k, [x + 0.22, y, 0.16 + 1.2 + 0.45 * w]);
            const s = (k.skala / 150) * w;
            return <rect key={i} x={a.x - 13 * s} y={a.y - 19 * s} width={26 * s} height={34 * s} rx={4 * s} fill={MARKA.zloto} stroke="#F3D58A" strokeWidth="2" />;
          })}
        </g>

        <g opacity={jasnosc(c.pokaze + 0.7)}>
          <Dokument k={k} poz={[0.9, -1.0]} w={wstaje} tytul="STATUT" />
        </g>

        {/* Podpisy – zaczepione nad obiektami, żeby słupek nie przecinał rysunku */}
        <Tabliczka k={k} p={[-6, 13.1, 3.25]} tekst="STATUS OPP" w={wej(c.start + 0.2, 11)} zlota={zloto > 0.5} slupek={0.35} rozmiar={rozmiarTabliczki} />
        <Tabliczka k={k} p={[-8.2, 6.7, 2.85]} tekst="3. WPIS DO KRS" w={wej(c.krs, 11)} zlota slupek={0.55} rozmiar={rozmiarTabliczki} />
        <Tabliczka k={k} p={[2.3, 5.4, 0.16]} tekst="2. UCHWAŁA WALNEGO" w={wej(c.walne, 11)} zlota slupek={2.35} rozmiar={rozmiarTabliczki} />
        <Tabliczka k={k} p={[1.5, -0.45, 1.88]} tekst="1. STATUT" w={wej(c.statutSlowo, 11)} zlota slupek={0.5} rozmiar={rozmiarTabliczki} />
        <Tabliczka k={k} p={[-2.9, 1.4, 0.16]} tekst="ZARZĄD" w={wej(c.komisja + 0.35, 11) * szczegoly} slupek={2.55} rozmiar={32} />
        <Tabliczka k={k} p={[-1.1, 1.4, 0.16]} tekst="KOMISJA REWIZYJNA" w={wej(c.komisjaSlowo, 11) * szczegoly} zlota slupek={1.4} rozmiar={32} />
        {przyciemnienie > 0 && <rect x="0" y="0" width="1080" height="1920" fill={MARKA.tlo} opacity={przyciemnienie} />}
      </Plotno>

      {/* Cztery zakazy – karty nad mapą */}
      {t >= c.zakazy - 0.1 && t < c.ale + 0.5 && (
        <div style={{ position: "absolute", left: 404, top: 462, width: 500, fontFamily: FONT, opacity: interpolate(t, [c.ale, c.ale + 0.35], [1, 0], ZAKRES) }}>
          <div style={{ fontWeight: 800, fontSize: 23, lineHeight: 1.25, letterSpacing: 1.5, color: MARKA.nadtytul, marginBottom: 14, opacity: wej(c.zakazy - 0.05) }}>
            STATUT ZAKAZUJE PREFERENCJI DLA CZŁONKÓW, WŁADZ I ICH BLISKICH:
          </div>
          {ZAKAZY.map((tekst, i) => {
            const w = wej(c.zakazy + i * 0.16, 12);
            return (
              <div
                key={tekst}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  height: 116,
                  marginBottom: 16,
                  padding: "0 22px",
                  boxSizing: "border-box",
                  borderRadius: 24,
                  background: `${MARKA.tloJasne}f5`,
                  border: `3px solid ${MARKA.zloto}`,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  opacity: w,
                  transform: `translateX(${(1 - w) * 120}px)`,
                }}
              >
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#D8402F" strokeWidth="8" />
                  <line x1="14" y1="50" x2="50" y2="14" stroke="#D8402F" strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div style={{ fontWeight: 800, fontSize: 33, lineHeight: 1.12, color: MARKA.bialy }}>{tekst}</div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const dzwiekiOpp = (sceny: ScenaOSP[]): ZdarzenieDzwiekowe[] => {
  const c = czasyOpp(sceny);
  return [
    { t: c.pokaze, plik: "swist", glosnosc: 0.5 },
    { t: c.statutSlowo, plik: "pop", glosnosc: 0.5 },
    { t: c.komisja + 0.35, plik: "pop", glosnosc: 0.35 },
    { t: c.niezalezna, plik: "stempel", glosnosc: 0.3 },
    { t: c.komisjaSlowo, plik: "pop", glosnosc: 0.45 },
    ...ZAKAZY.map((_, i) => ({ t: c.zakazy + i * 0.16, plik: "tik", glosnosc: 0.6 })),
    { t: c.ale, plik: "swist", glosnosc: 0.5 },
    { t: c.walne, plik: "pop", glosnosc: 0.5 },
    { t: c.krs - 0.45, plik: "swist", glosnosc: 0.45 },
    { t: c.krs, plik: "pop", glosnosc: 0.5 },
    { t: c.status, plik: "dzwonek", glosnosc: 0.6 },
    { t: c.status + 0.9, plik: "swist", glosnosc: 0.35 },
  ];
};

export const MAPY: Record<string, { Widok: React.FC<PropsMapy>; dzwieki: (sceny: ScenaOSP[]) => ZdarzenieDzwiekowe[] }> = {
  "stol-osp": { Widok: StolOSP, dzwieki: dzwiekiStolu },
  "droga-wniosku": { Widok: DrogaWniosku, dzwieki: dzwiekiWniosku },
  "droga-opp": { Widok: DrogaOPP, dzwieki: dzwiekiOpp },
};
