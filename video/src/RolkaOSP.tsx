import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, MARKA, USTAWIENIA as U } from "./marka";
import { Naczelnik } from "./Naczelnik";
import { Ilustracja } from "./Sceny";
import { ILUSTRACJE_PION } from "./ScenyPion";
import { Maskotka, type UstawieniaPostaci } from "./Maskotka";

// Szablon rolki w stylu doradztwodlaosp.pl (grafit i złoto).
// Dane odcinka: public/odcinki/<odcinek>/odcinek.json (opis formatu w .claude/skills/rolka/SKILL.md)

export type Slowo = { w: string; s: number; e: number };

export type ScenaOSP = {
  tekst: string;
  lektor?: string;
  akcent?: string[];
  obraz?: string;
  ilustracja?: string;
  prompt?: string;
  postac?: UstawieniaPostaci; // maskotka w tej scenie
  etykieta?: string; // złota pigułka nad maskotką na pełnym planie
  start: number;
  koniec: number;
  slowa: Slowo[];
};

export type Odcinek = {
  tytul: string;
  nadtytul?: string;
  glos: string;
  cta?: string;
  naczelnik?: boolean;
  maskotka?: boolean;
  szkic?: string; // odcinek bez nagrania: czasy szacunkowe, render bez dźwięku
  wstep?: number; // sekundy z hasłem-hakiem przed pierwszym słowem lektora
  hak?: { tekst: string; zloty?: boolean }[]; // linie hasła na pierwszej klatce (działa też jako okładka)
  plansza?: { haslo: { tekst: string; zloty?: boolean }[]; pigulka: string; kontakt: string; stopka: string };
  sceny: ScenaOSP[];
};

export type RolkaProps = { odcinek: string; dane?: Odcinek; glosnosc?: number[]; strefy?: boolean };

const FPS = 30;
const ZAKONCZENIE_S = 1.5;
const PLANSZA_S = 4;
const PRZENIKANIE = U.przenikanie;
const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Środek bezpiecznej strefy w poziomie – treść centrujemy względem niej, nie całego ekranu
const SRODEK_X = U.strefaPrawo / 2;
const SZEROKOSC_TRESCI = U.strefaPrawo - 100;

export const obliczRolke: CalculateMetadataFunction<RolkaProps> = async ({ props }) => {
  const odp = await fetch(staticFile(`odcinki/${props.odcinek}/odcinek.json`));
  const surowe: Odcinek = await odp.json();
  // Przesuwamy cały odcinek o czas wstępu (hak), żeby głos i animacje zostały zsynchronizowane
  const w = surowe.wstep ?? 0;
  const dane: Odcinek = {
    ...surowe,
    sceny: surowe.sceny.map((s) => ({
      ...s,
      start: s.start + w,
      koniec: s.koniec + w,
      slowa: s.slowa.map((sl) => ({ ...sl, s: sl.s + w, e: sl.e + w })),
    })),
  };
  const koniec = dane.sceny[dane.sceny.length - 1].koniec;
  // Głośność nagrania klatka po klatce (tworzy ją npm run render) – do ruchu ust postaci
  const glosnosc: number[] =
    (dane.naczelnik || dane.maskotka) && !dane.szkic
      ? [
          ...new Array(Math.round(w * FPS)).fill(0),
          ...(await fetch(staticFile(`odcinki/${props.odcinek}/glosnosc.json`)).then((r) => (r.ok ? r.json() : []))),
        ]
      : [];
  return {
    durationInFrames: Math.ceil((koniec + (dane.plansza ? 0.4 + PLANSZA_S : ZAKONCZENIE_S)) * FPS),
    props: { ...props, dane, glosnosc },
  };
};

const normalizuj = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Dzieli słowa sceny na krótkie porcje (2-4 słowa), łamiąc po przecinkach i kropkach
const porcje = (slowa: Slowo[]): Slowo[][] => {
  const wynik: Slowo[][] = [];
  let biezaca: Slowo[] = [];
  slowa.forEach((s, i) => {
    biezaca.push(s);
    const koniecZdania = /[.,:;!?]$/.test(s.w);
    const ostatnie = i === slowa.length - 1;
    if (ostatnie || biezaca.length >= U.slowNaRaz || (koniecZdania && biezaca.length >= 2)) {
      wynik.push(biezaca);
      biezaca = [];
    }
  });
  return wynik;
};

// Tło sceny: zdjęcie z powolnym najazdem albo nic (jednolity grafit)
const Tlo: React.FC<{ scena: ScenaOSP; numer: number; odcinek: string }> = ({ scena, numer, odcinek }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dlugosc = (scena.koniec - scena.start + 1) * fps;
  const zoom = interpolate(frame, [0, dlugosc], [U.zoomStart, U.zoomKoniec], zakres);
  const kierunek = numer % 2 === 0 ? 1 : -1;
  const przesuniecie = interpolate(frame, [0, dlugosc], [0, U.przesuniecie * kierunek], zakres);
  const wejscie = interpolate(frame, [0, PRZENIKANIE], [0, 1], zakres);
  if (!scena.obraz) return null;
  return (
    <AbsoluteFill style={{ opacity: numer === 0 ? 1 : wejscie }}>
      <Img
        src={staticFile(`odcinki/${odcinek}/${scena.obraz}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom}) translateX(${przesuniecie}px)` }}
      />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${MARKA.tlo}cc 0%, transparent 30%, transparent 55%, ${MARKA.tlo}ee 75%)` }} />
    </AbsoluteFill>
  );
};

// Duży pionowy panel z ilustracją (ok. 60% wysokości ekranu, w bezpiecznej strefie)
const PanelIlustracji: React.FC<{ nazwa: string; dlugosc: number; jasnosc?: number }> = ({ nazwa, dlugosc, jasnosc = 1 }) => {
  const frame = useCurrentFrame();
  const wejscie = interpolate(frame, [0, PRZENIKANIE], [0, 1], zakres) * jasnosc;
  const Pion = ILUSTRACJE_PION[nazwa];
  const wysokosc = U.ilustracjaWysokosc;
  const szerokosc = (wysokosc * 900) / 1200;
  return (
    <div
      style={{
        position: "absolute",
        top: U.ilustracjaOdGory,
        left: SRODEK_X - szerokosc / 2,
        width: szerokosc,
        height: wysokosc,
        opacity: wejscie,
      }}
    >
      {Pion ? (
        <svg viewBox="0 0 900 1200" width="100%" height="100%" style={{ fontFamily: `${FONT}, Arial, sans-serif` }}>
          <Pion dlugosc={dlugosc} />
        </svg>
      ) : (
        // Starsze, poziome ilustracje: na jasnej karcie w górnej części panelu
        <div style={{ marginTop: 40, width: "100%", height: (szerokosc * 760) / 900, borderRadius: 32, background: "#F4F1EA", overflow: "hidden" }}>
          <Ilustracja nazwa={nazwa} />
        </div>
      )}
    </div>
  );
};

// Napisy słowo po słowie; słowo wypowiadane w tej chwili świeci na złoto
const Napisy: React.FC<{ scena: ScenaOSP }> = ({ scena }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = scena.start + frame / fps;
  const akcent = new Set((scena.akcent ?? []).map(normalizuj));
  const grupy = porcje(scena.slowa);
  const aktywna = [...grupy].reverse().find((g) => g[0].s <= t) ?? grupy[0];

  return (
    <div
      style={{
        position: "absolute",
        left: SRODEK_X - SZEROKOSC_TRESCI / 2,
        width: SZEROKOSC_TRESCI,
        top: U.napisySrodek - 130,
        height: 260,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "center",
        alignItems: "baseline",
        columnGap: 22,
        rowGap: 0,
        textAlign: "center",
      }}
    >
      {aktywna.map((s, i) => {
        const wyrozniony = akcent.has(normalizuj(s.w));
        const mowione = t >= s.s && t < s.e + 0.08;
        const pojawienie = spring({ frame: frame - Math.round((s.s - scena.start) * fps), fps, config: { damping: 16, mass: 0.6 } });
        const rozmiar = wyrozniony ? U.akcentRozmiar : U.napisyRozmiar;
        return (
          <span
            key={`${s.s}-${i}`}
            style={{
              fontFamily: FONT,
              fontWeight: wyrozniony ? 800 : 700,
              // Długie słowa zmniejszamy, by mieściły się w bezpiecznej strefie
              fontSize: Math.min(rozmiar, Math.floor((SZEROKOSC_TRESCI * 1.55) / s.w.length)),
              lineHeight: 1.18,
              color: mowione ? MARKA.zloto : MARKA.bialy,
              textShadow: "0 3px 0 rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.85)",
              opacity: pojawienie,
              transform: `translateY(${(1 - pojawienie) * 22}px) scale(${0.92 + 0.08 * pojawienie})`,
              display: "inline-block",
            }}
          >
            {s.w}
          </span>
        );
      })}
    </div>
  );
};

const Nadtytul: React.FC<{ tekst: string }> = ({ tekst }) => (
  <div
    style={{
      position: "absolute",
      top: U.nadtytulOdGory,
      left: SRODEK_X - SZEROKOSC_TRESCI / 2,
      width: SZEROKOSC_TRESCI,
      textAlign: "center",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: U.nadtytulRozmiar,
      letterSpacing: 5,
      color: MARKA.nadtytul,
      textTransform: "uppercase",
    }}
  >
    {tekst}
  </div>
);

const Etykieta: React.FC<{ tekst: string }> = ({ tekst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame: frame - 6, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: U.nadtytulOdGory + 60, left: 0, width: U.strefaPrawo, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${w})`,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 46,
          color: MARKA.tlo,
          background: MARKA.zloto,
          borderRadius: 999,
          padding: "14px 40px",
        }}
      >
        {tekst}
      </div>
    </div>
  );
};

const Wezwanie: React.FC<{ tekst: string }> = ({ tekst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: U.przyciskSrodek - 45, left: 0, width: U.strefaPrawo, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${w})`,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: U.przyciskRozmiar,
          color: MARKA.tlo,
          background: MARKA.zloto,
          borderRadius: 999,
          padding: "18px 44px",
        }}
      >
        {tekst}
      </div>
    </div>
  );
};

// Hak: duże hasło od pierwszej klatki (bez wejścia z zera – klatka 0 jest okładką rolki)
const Hak: React.FC<{ linie: { tekst: string; zloty?: boolean }[] }> = ({ linie }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const koniecHaka = durationInFrames;
  const zanik = interpolate(frame, [koniecHaka - PRZENIKANIE * 2, koniecHaka], [1, 0], zakres);
  const najazd = interpolate(frame, [0, koniecHaka], [1, 1.06], zakres);
  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo, opacity: zanik }}>
      <div
        style={{
          position: "absolute",
          left: SRODEK_X - SZEROKOSC_TRESCI / 2,
          width: SZEROKOSC_TRESCI,
          top: 300,
          transform: `scale(${najazd})`,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          lineHeight: 1.08,
        }}
      >
        {linie.map((l, i) => (
          <div key={i} style={{ fontSize: Math.min(120, Math.floor((SZEROKOSC_TRESCI * 1.22) / l.tekst.length)), whiteSpace: "nowrap", color: l.zloty ? MARKA.zloto : MARKA.bialy }}>
            {l.tekst}
          </div>
        ))}
        <div style={{ width: 160, height: 8, background: MARKA.zloto, margin: "44px auto 0", borderRadius: 4 }} />
      </div>
      <div style={{ position: "absolute", left: SRODEK_X - 230, width: 460, top: 860, height: 560, display: "flex", justifyContent: "center" }}>
        <Img
          src={staticFile("postac/zaskoczony.png")}
          style={{
            height: 560,
            transform: `scale(${najazd})`,
            transformOrigin: "50% 100%",
            WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent 100%)",
            maskImage: "linear-gradient(180deg, #000 80%, transparent 100%)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// Plansza końcowa: nic na siebie nie nachodzi, wszystko w bezpiecznej strefie
const Plansza: React.FC<NonNullable<Odcinek["plansza"]>> = ({ haslo, pigulka, kontakt, stopka }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tlo = interpolate(frame, [0, PRZENIKANIE], [0, 1], zakres);
  const w = (opoznienie: number) => spring({ frame: frame - opoznienie, fps, config: { damping: 14 } });
  const kolumna: React.CSSProperties = {
    position: "absolute",
    left: SRODEK_X - SZEROKOSC_TRESCI / 2,
    width: SZEROKOSC_TRESCI,
    textAlign: "center",
    fontFamily: FONT,
  };
  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo, opacity: tlo }}>
      <div style={{ ...kolumna, top: 300, fontWeight: 800, lineHeight: 1.1, opacity: w(4), transform: `translateY(${(1 - w(4)) * 40}px)` }}>
        {haslo.map((l, i) => (
          <div key={i} style={{ fontSize: Math.min(110, Math.floor((SZEROKOSC_TRESCI * 1.22) / l.tekst.length)), whiteSpace: "nowrap", color: l.zloty ? MARKA.zloto : MARKA.bialy }}>
            {l.tekst}
          </div>
        ))}
      </div>
      <div style={{ ...kolumna, top: 640, display: "flex", justifyContent: "center", transform: `scale(${w(14)})` }}>
        <div style={{ background: MARKA.zloto, color: MARKA.tlo, fontWeight: 800, fontSize: 34, whiteSpace: "nowrap", borderRadius: 999, padding: "18px 36px" }}>{pigulka}</div>
      </div>
      <div style={{ ...kolumna, top: 790, fontWeight: 700, fontSize: 52, color: MARKA.bialy, opacity: w(22) }}>{kontakt}</div>
      <div style={{ ...kolumna, top: 920, height: 380, display: "flex", justifyContent: "center", opacity: w(28) }}>
        <Img src={staticFile("postac/stoi.png")} style={{ height: 380 }} />
      </div>
      <div style={{ ...kolumna, top: 1350, fontWeight: 700, fontSize: 26, color: MARKA.tekstPomocniczy, opacity: w(30) }}>{stopka}</div>
    </AbsoluteFill>
  );
};

const PostacNaczelnika: React.FC<{ dane: Odcinek; glosnosc: number[] }> = ({ dane, glosnosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pierwsza = dane.sceny[0];
  const ostatnia = dane.sceny[dane.sceny.length - 1];
  const usta = glosnosc[frame] ?? 0;
  const mrugniecie = frame % 96 < 4 ? 1 - Math.abs((frame % 96) - 2) / 2 : 0;
  // Spokojne powitanie: uniesiona dłoń, bez energicznego machania
  const koniecMachania = pierwsza.koniec + 0.5;
  const uniesienie = interpolate(t, [0, 0.35, koniecMachania - 0.35, koniecMachania], [0, 1, 1, 0], zakres);
  const machanie = uniesienie * (0.98 + 0.02 * Math.sin(frame / 4));
  const kiwanie = t > ostatnia.start ? Math.max(0, Math.sin((t - ostatnia.start) * 5)) : 0;
  const oddech = Math.sin(frame / 25) * 3;
  const wejscie = spring({ frame, fps, config: { damping: 14 } });
  const szerokosc = U.naczelnikSzerokosc;
  const wysokosc = (szerokosc * 900) / 600;
  return (
    <div
      style={{
        position: "absolute",
        left: U.naczelnikOdLewej,
        top: 1920 - wysokosc + (1 - wejscie) * 200 + oddech,
        width: szerokosc,
        height: wysokosc,
        filter: "drop-shadow(0 -6px 24px rgba(0,0,0,0.5))",
      }}
    >
      <Naczelnik usta={usta} mrugniecie={mrugniecie} machanie={machanie} kiwanie={kiwanie} wysokosc={900} />
    </div>
  );
};

// Linie bezpiecznych stref – tylko do podglądu (props "strefy": true)
const Strefy: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, top: U.strefaDol, width: 1080, height: 1920 - U.strefaDol, background: "rgba(192,57,43,0.28)", borderTop: "4px dashed #ff5a4a" }} />
    <div style={{ position: "absolute", left: U.strefaPrawo, top: 0, width: 1080 - U.strefaPrawo, height: 1920, background: "rgba(192,57,43,0.28)", borderLeft: "4px dashed #ff5a4a" }} />
  </>
);

export const RolkaOSP: React.FC<RolkaProps> = ({ odcinek, dane, glosnosc = [], strefy = false }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!dane) return null;
  const klatka = (s: number) => Math.round(s * fps);
  const zakresSceny = (i: number) => {
    const od = klatka(dane.sceny[i].start);
    const nastepna = dane.sceny[i + 1];
    return { od, doKlatki: nastepna ? klatka(nastepna.start) : durationInFrames };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo }}>
      {!dane.szkic && (
        <Sequence from={Math.round((dane.wstep ?? 0) * fps)} layout="none">
          <Audio src={staticFile(`odcinki/${odcinek}/${dane.glos}`)} />
        </Sequence>
      )}

      {dane.sceny.map((scena, i) => {
        const { od, doKlatki } = zakresSceny(i);
        const start = i === 0 ? 0 : od - PRZENIKANIE;
        return (
          <Sequence key={i} from={start} durationInFrames={doKlatki - start} layout="none">
            <Tlo scena={scena} numer={i} odcinek={odcinek} />
          </Sequence>
        );
      })}

      {dane.sceny.map((scena, i) => {
        if (!scena.ilustracja) return null;
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence key={i} from={od} durationInFrames={doKlatki - od} layout="none">
            <PanelIlustracji
              nazwa={scena.ilustracja}
              dlugosc={doKlatki - od}
              jasnosc={dane.maskotka && scena.postac?.plan === "pelny" ? U.ilustracjaPrzyMaskotce : 1}
            />
          </Sequence>
        );
      })}

      {/* Przyciemnienie pod napisami, żeby były czytelne na każdej ilustracji */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: U.napisySrodek - 200,
          height: 400,
          background: `linear-gradient(180deg, transparent 0%, ${MARKA.tlo}d9 35%, ${MARKA.tlo}d9 65%, transparent 100%)`,
        }}
      />

      {dane.sceny.map((scena, i) => {
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence key={i} from={od} durationInFrames={doKlatki - od} layout="none">
            <Napisy scena={scena} />
          </Sequence>
        );
      })}

      {dane.nadtytul && <Nadtytul tekst={dane.nadtytul} />}

      {dane.naczelnik && <PostacNaczelnika dane={dane} glosnosc={glosnosc} />}

      {dane.maskotka && <Maskotka dane={dane} glosnosc={glosnosc} />}

      {dane.sceny.map((scena, i) => {
        if (!scena.etykieta) return null;
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence key={i} from={od} durationInFrames={doKlatki - od} layout="none">
            <Etykieta tekst={scena.etykieta} />
          </Sequence>
        );
      })}

      {dane.cta && (
        <Sequence from={klatka(dane.sceny[dane.sceny.length - 1].start)} layout="none">
          <Wezwanie tekst={dane.cta} />
        </Sequence>
      )}

      {dane.hak && (
        <Sequence from={0} durationInFrames={Math.round((dane.wstep ?? 1.5) * fps) + PRZENIKANIE} layout="none">
          <Hak linie={dane.hak} />
        </Sequence>
      )}

      {dane.plansza && (
        <Sequence from={klatka(dane.sceny[dane.sceny.length - 1].koniec + 0.4)} layout="none">
          <Plansza {...dane.plansza} />
        </Sequence>
      )}

      {strefy && <Strefy />}
    </AbsoluteFill>
  );
};
