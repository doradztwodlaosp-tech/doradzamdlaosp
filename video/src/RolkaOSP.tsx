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
import { FONT_NAGLOWEK, FONT_TEKST, MARKA, USTAWIENIA as U } from "./marka";
import { Naczelnik } from "./Naczelnik";

// Szablon rolki w stylu doradztwodlaosp.pl.
// Dane odcinka: public/odcinki/<odcinek>/odcinek.json (opis formatu w .claude/skills/rolka/SKILL.md)

export type Slowo = { w: string; s: number; e: number };

export type ScenaOSP = {
  tekst: string;
  lektor?: string;
  akcent?: string[];
  obraz?: string;
  prompt?: string;
  start: number;
  koniec: number;
  slowa: Slowo[];
};

export type Odcinek = {
  tytul: string;
  glos: string;
  cta?: string;
  naczelnik?: boolean;
  sceny: ScenaOSP[];
};

export type RolkaProps = { odcinek: string; dane?: Odcinek; glosnosc?: number[] };

const FPS = 30;
const ZAKONCZENIE_S = 1.5;
const PRZENIKANIE = U.przenikanie;
const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const obliczRolke: CalculateMetadataFunction<RolkaProps> = async ({ props }) => {
  const odp = await fetch(staticFile(`odcinki/${props.odcinek}/odcinek.json`));
  const dane: Odcinek = await odp.json();
  const koniec = dane.sceny[dane.sceny.length - 1].koniec;
  // Głośność nagrania klatka po klatce (tworzy ją npm run render) – do ruchu ust postaci
  const glosnosc: number[] = dane.naczelnik
    ? await fetch(staticFile(`odcinki/${props.odcinek}/glosnosc.json`)).then((r) => (r.ok ? r.json() : []))
    : [];
  return {
    durationInFrames: Math.ceil((koniec + ZAKONCZENIE_S) * FPS),
    props: { ...props, dane, glosnosc },
  };
};

// Granat marki z zadaną nieprzezroczystością (0..1)
const przezroczystosc = (a: number) =>
  `${MARKA.granat}${Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, "0")}`;

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

const Tlo: React.FC<{ scena: ScenaOSP; numer: number; odcinek: string }> = ({ scena, numer, odcinek }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dlugosc = (scena.koniec - scena.start + 1) * fps;
  const zoom = interpolate(frame, [0, dlugosc], [U.zoomStart, U.zoomKoniec], zakres);
  const kierunek = numer % 2 === 0 ? 1 : -1;
  const przesuniecie = interpolate(frame, [0, dlugosc], [0, U.przesuniecie * kierunek], zakres);
  const wejscie = interpolate(frame, [0, PRZENIKANIE], [0, 1], zakres);

  return (
    <AbsoluteFill style={{ opacity: numer === 0 ? 1 : wejscie }}>
      {scena.obraz ? (
        <Img
          src={staticFile(`odcinki/${odcinek}/${scena.obraz}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom}) translateX(${przesuniecie}px)`,
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${50 + przesuniecie}% 60%, ${MARKA.czerwony}55 0%, transparent 45%), linear-gradient(180deg, ${MARKA.granatJasny} 0%, ${MARKA.granat} 100%)`,
          }}
        />
      )}
      {/* Przyciemnienie u góry i u dołu, żeby napisy były czytelne */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${przezroczystosc(U.przyciemnienieGora)} 0%, ${przezroczystosc(U.przyciemnienieGora / 2)} 22%, transparent 45%, transparent 70%, ${przezroczystosc(U.przyciemnienieDol)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

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
        left: 80,
        right: 80,
        top: U.napisyOdGory,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 20,
        rowGap: 4,
        textAlign: "center",
      }}
    >
      {aktywna.map((s, i) => {
        const wyrozniony = akcent.has(normalizuj(s.w));
        const pojawienie = spring({ frame: frame - Math.round((s.s - scena.start) * fps), fps, config: { damping: 16, mass: 0.6 } });
        return (
          <span
            key={`${s.s}-${i}`}
            style={{
              fontFamily: wyrozniony ? FONT_NAGLOWEK : FONT_TEKST,
              fontWeight: wyrozniony ? 800 : 500,
              // Syne jest szeroki: długie wyróżnione słowa zmniejszamy, by mieściły się w kadrze
              fontSize: wyrozniony ? Math.min(U.akcentRozmiar, Math.floor(1100 / s.w.length)) : U.napisyRozmiar,
              lineHeight: 1.15,
              color: wyrozniony ? MARKA.czerwony : MARKA.krem,
              textShadow: "0 4px 24px rgba(0,0,0,0.55)",
              opacity: pojawienie,
              transform: `translateY(${(1 - pojawienie) * 24}px) scale(${0.9 + 0.1 * pojawienie})`,
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

const Znaczek: React.FC<{ odDolu: number }> = ({ odDolu }) => (
  <div
    style={{
      position: "absolute",
      bottom: odDolu,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT_NAGLOWEK,
        fontWeight: 700,
        fontSize: 30,
        color: MARKA.krem,
        background: `${MARKA.granat}cc`,
        border: `2px solid ${MARKA.czerwony}`,
        borderRadius: 999,
        padding: "10px 28px",
      }}
    >
      {MARKA.adres}
    </div>
  </div>
);

const Wezwanie: React.FC<{ tekst: string }> = ({ tekst }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame, fps, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: U.przyciskOdGory, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${w})`,
          fontFamily: FONT_NAGLOWEK,
          fontWeight: 800,
          fontSize: U.przyciskRozmiar,
          color: "#ffffff",
          background: MARKA.czerwony,
          borderRadius: 999,
          padding: "22px 48px",
          boxShadow: `0 10px 40px ${MARKA.czerwony}88`,
        }}
      >
        {tekst}
      </div>
    </div>
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
  // Machanie na powitanie: ręka szybko w górę, kilka machnięć, w dół
  const koniecMachania = pierwsza.koniec + 0.5;
  const uniesienie = interpolate(t, [0, 0.35, koniecMachania - 0.35, koniecMachania], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const machanie = uniesienie * (0.97 + 0.07 * Math.sin(frame / 2.5));
  const kiwanie = t > ostatnia.start ? Math.max(0, Math.sin((t - ostatnia.start) * 5)) : 0;
  const oddech = Math.sin(frame / 25) * 4;
  const wejscie = spring({ frame, fps, config: { damping: 14 } });
  const szerokosc = U.naczelnikSzerokosc;
  const wysokosc = (szerokosc * 900) / 600;
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - szerokosc) / 2,
        top: 1920 - wysokosc + (1 - wejscie) * 300 + oddech,
        width: szerokosc,
        height: wysokosc,
        filter: "drop-shadow(0 -10px 40px rgba(0,0,0,0.5))",
      }}
    >
      <Naczelnik usta={usta} mrugniecie={mrugniecie} machanie={machanie} kiwanie={kiwanie} wysokosc={900} />
    </div>
  );
};

export const RolkaOSP: React.FC<RolkaProps> = ({ odcinek, dane, glosnosc = [] }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!dane) return null;
  const klatka = (s: number) => Math.round(s * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.granat }}>
      <Audio src={staticFile(`odcinki/${odcinek}/${dane.glos}`)} />

      {dane.sceny.map((scena, i) => {
        const od = i === 0 ? 0 : klatka(scena.start) - PRZENIKANIE;
        const nastepna = dane.sceny[i + 1];
        const doKlatki = nastepna ? klatka(nastepna.start) : durationInFrames;
        return (
          <Sequence key={i} from={od} durationInFrames={doKlatki - od} layout="none">
            <Tlo scena={scena} numer={i} odcinek={odcinek} />
          </Sequence>
        );
      })}

      {dane.sceny.map((scena, i) => {
        const od = klatka(scena.start);
        const nastepna = dane.sceny[i + 1];
        const doKlatki = nastepna ? klatka(nastepna.start) : durationInFrames;
        return (
          <Sequence key={i} from={od} durationInFrames={doKlatki - od} layout="none">
            <Napisy scena={scena} />
          </Sequence>
        );
      })}

      {dane.naczelnik && <PostacNaczelnika dane={dane} glosnosc={glosnosc} />}

      {U.pokazZnaczek && <Znaczek odDolu={dane.naczelnik ? U.znaczekOdDoluZPostacia : U.znaczekOdDolu} />}

      {dane.cta && (
        <Sequence from={klatka(dane.sceny[dane.sceny.length - 1].start)} layout="none">
          <Wezwanie tekst={dane.cta} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
