import React, { useMemo } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Dzwiek } from "./Dzwiek";
import { FONT, MARKA, USTAWIENIA as U } from "./marka";
import { MAPY, type ZdarzenieDzwiekowe } from "./Mapy";
import { Maskotka } from "./Maskotka";
import { PanelIlustracji, PostacNaczelnika } from "./Starsze";
import { Telefon } from "./Telefon";
import { UjecieTla } from "./Ujecia";
import { Winieta, Ziarno } from "./Wyglad";
import {
  FPS,
  ZAKRES,
  czasSlowa,
  normalizuj,
  zbudujOs,
  type LiniaHasla,
  type MapaCzas,
  type Odcinek,
  type RolkaProps,
  type ScenaOSP,
  type Slowo,
  type UjecieCzas,
} from "./typy";

// Szablon rolki w stylu doradztwodlaosp.pl (grafit i złoto).
// Dane odcinka: public/odcinki/<odcinek>/odcinek.json (opis formatu w .claude/skills/rolka/SKILL.md)
//
// Warstwy od spodu: ujęcia (zdjęcia, studio) i mapy 3D → winieta → napisy u góry → porada, telefon →
// Druh Paragraf → pytanie do widza → hak (okładka) → plansza końcowa → ziarno filmowe. Dźwięk: src/Dzwiek.tsx.

const ZAKONCZENIE_S = 1.5;
const PLANSZA_S = 4;
const PRZENIKANIE = U.przenikanie;

// Środek bezpiecznej strefy w poziomie – treść centrujemy względem niej, nie całego ekranu
const SRODEK_X = U.strefaPrawo / 2;
const SZEROKOSC_TRESCI = U.strefaPrawo - 100;

const wymiaryObrazu = (src: string) =>
  new Promise<[number, number]>((resolve, reject) => {
    const obraz = new Image();
    obraz.onload = () => resolve([obraz.naturalWidth, obraz.naturalHeight]);
    obraz.onerror = () => reject(new Error(`Nie można wczytać obrazu: ${src}`));
    obraz.src = src;
  });

export const obliczRolke: CalculateMetadataFunction<RolkaProps> = async ({
  props,
}) => {
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
  // Głośność nagrania klatka po klatce (tworzy ją npm run render) – do ruchu postaci i ściszania muzyki pod głosem
  const glosnosc: number[] = dane.szkic
    ? []
    : [
        ...new Array(Math.round(w * FPS)).fill(0),
        ...(await fetch(
          staticFile(`odcinki/${props.odcinek}/glosnosc.json`),
        ).then((r) => (r.ok ? r.json() : []))),
      ];
  // Wymiary wszystkich zdjęć odcinka – potrzebne do ruchu kamery
  const pliki = new Set<string>();
  dane.sceny.forEach((s) => {
    if (s.obraz) pliki.add(s.obraz);
    (s.ujecia ?? []).forEach((u) => u.obraz && pliki.add(u.obraz));
  });
  const wymiary: Record<string, [number, number]> = {};
  await Promise.all(
    [...pliki].map(async (plik) => {
      wymiary[plik] = await wymiaryObrazu(
        staticFile(`odcinki/${props.odcinek}/${plik}`),
      );
    }),
  );
  const ostatnia = dane.sceny[dane.sceny.length - 1];
  const koniec = ostatnia.plansza
    ? ostatnia.koniec + 1.3
    : ostatnia.koniec + (dane.plansza ? 0.4 + PLANSZA_S : ZAKONCZENIE_S);
  return {
    durationInFrames: Math.ceil(koniec * FPS),
    props: { ...props, dane, glosnosc, wymiary },
  };
};

// Efekty dźwiękowe wynikające z tego, co dzieje się na ekranie
const zbierzDzwieki = (
  dane: Odcinek,
  os: { ujecia: UjecieCzas[]; mapy: MapaCzas[] },
  planszaOdS: number | null,
): ZdarzenieDzwiekowe[] => {
  const z: ZdarzenieDzwiekowe[] = [];
  if (dane.hak) z.push({ t: 0.02, plik: "uderzenie", glosnosc: 0.6 });
  os.ujecia.forEach((u) => {
    if (u.start > 0)
      z.push({ t: u.start - 0.15, plik: "swist", glosnosc: 0.18 });
    const czas = (slowo?: string) =>
      (slowo ? czasSlowa(u.scena, slowo) : undefined) ?? u.start;
    (u.naklejki ?? []).forEach((n) => {
      switch (n.typ) {
        case "znacznik":
        case "chip":
          z.push({ t: czas(n.slowo), plik: "pop", glosnosc: 0.5 });
          break;
        case "pieczec":
          z.push({
            t: czas(n.slowo) + 4 / FPS,
            plik: "stempel",
            glosnosc: 0.95,
          });
          break;
        case "brak":
          z.push({ t: czas(n.slowo), plik: "blad", glosnosc: 0.45 });
          break;
        case "kartka-leci":
          z.push({ t: czas(n.slowo), plik: "papier", glosnosc: 0.7 });
          break;
        case "kartka-odbita":
          z.push(
            { t: u.start, plik: "papier", glosnosc: 0.5 },
            { t: czas(n.krzyzyk), plik: "blad", glosnosc: 0.5 },
          );
          break;
        case "napis":
          z.push({ t: czas(n.slowo), plik: "pop", glosnosc: 0.55 });
          break;
        case "licznik":
          for (let i = 0; i < 6; i++)
            z.push({ t: czas(n.slowo) + i * 0.14, plik: "tik", glosnosc: 0.5 });
          z.push({ t: czas(n.slowo) + 0.9, plik: "dzwonek", glosnosc: 0.35 });
          break;
      }
    });
  });
  os.mapy.forEach((m) => {
    if (m.start > 0)
      z.push({ t: m.start - 0.15, plik: "swist", glosnosc: 0.3 });
    z.push(...(MAPY[m.nazwa]?.dzwieki(m.sceny) ?? []));
  });
  dane.sceny.forEach((s) => {
    if (s.porada) z.push({ t: s.start + 0.1, plik: "dzwonek", glosnosc: 0.45 });
    if (s.telefon) {
      const t0 = czasSlowa(s, s.telefon.slowo ?? "") ?? s.start;
      z.push(
        { t: t0, plik: "swist", glosnosc: 0.3 },
        { t: t0 + 46 / FPS, plik: "pop", glosnosc: 0.5 },
      );
    }
    const gest = s.postac?.gest;
    const tGestu = gest?.plan ? czasSlowa(s, gest.slowo) : undefined;
    if (tGestu !== undefined) z.push({ t: tGestu, plik: "pop", glosnosc: 0.3 });
  });
  if (planszaOdS !== null)
    z.push(
      { t: planszaOdS - 1.15, plik: "narastanie", glosnosc: 0.3 },
      { t: planszaOdS + 0.1, plik: "dzwonek", glosnosc: 0.4 },
    );
  return z;
};

// Dzieli słowa sceny na krótkie porcje (2-4 słowa), łamiąc po przecinkach i kropkach
const porcje = (slowa: Slowo[]): Slowo[][] => {
  const wynik: Slowo[][] = [];
  let biezaca: Slowo[] = [];
  slowa.forEach((s, i) => {
    biezaca.push(s);
    const koniecZdania = /[.,:;!?]$/.test(s.w);
    const ostatnie = i === slowa.length - 1;
    if (
      ostatnie ||
      biezaca.length >= U.slowNaRaz ||
      (koniecZdania && biezaca.length >= 2)
    ) {
      wynik.push(biezaca);
      biezaca = [];
    }
  });
  return wynik;
};

// Napisy w stylu „makieta”: ciemna pigułka, słowa wypowiedziane białe, bieżące złote, kolejne szare
const NapisyPigulka: React.FC<{ scena: ScenaOSP; gora: boolean }> = ({
  scena,
  gora,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = scena.start + frame / fps;
  const grupy = porcje(scena.slowa);
  const aktywna = [...grupy].reverse().find((g) => g[0].s <= t) ?? grupy[0];
  const wejscie = spring({
    frame: frame - Math.round((aktywna[0].s - scena.start) * fps),
    fps,
    config: { damping: 18, mass: 0.6 },
  });
  const dlugosc = aktywna.reduce((a, s) => a + s.w.length + 1, 0);
  const rozmiar = Math.min(50, Math.floor(1500 / Math.max(dlugosc, 12)));
  return (
    <div
      style={{
        position: "absolute",
        left: SRODEK_X - 430,
        width: 860,
        top: gora ? 215 : 1268,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(28,29,35,0.9)",
          borderRadius: 16,
          padding: "12px 26px 14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: rozmiar,
          lineHeight: 1.2,
          textAlign: "center",
          opacity: Math.min(1, wejscie * 1.5),
          transform: `translateY(${(1 - wejscie) * 10}px)`,
        }}
      >
        {aktywna.map((s, i) => {
          const powiedziane = t >= s.e;
          const mowione = t >= s.s && t < s.e + 0.05;
          return (
            <span
              key={`${s.s}-${i}`}
              style={{
                color: mowione
                  ? MARKA.zloto
                  : powiedziane
                    ? MARKA.bialy
                    : "#8D8E97",
              }}
            >
              {s.w}
              {i < aktywna.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
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
        top: U.napisyOdGory,
        height: U.napisyWysokosc,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "center",
        alignItems: "baseline",
        columnGap: 16,
        rowGap: 0,
        textAlign: "center",
      }}
    >
      {aktywna.map((s, i) => {
        const wyrozniony = akcent.has(normalizuj(s.w));
        const mowione = t >= s.s && t < s.e + 0.08;
        const pojawienie = spring({
          frame: frame - Math.round((s.s - scena.start) * fps),
          fps,
          config: { damping: 16, mass: 0.6 },
        });
        const rozmiar = wyrozniony ? U.akcentRozmiar : U.napisyRozmiar;
        return (
          <span
            key={`${s.s}-${i}`}
            style={{
              fontFamily: FONT,
              fontWeight: wyrozniony || mowione ? 800 : 500,
              // Długie słowa zmniejszamy, by mieściły się w bezpiecznej strefie
              fontSize: Math.min(
                rozmiar,
                Math.floor((SZEROKOSC_TRESCI * 1.55) / s.w.length),
              ),
              lineHeight: 1.22,
              color: mowione ? MARKA.zloto : MARKA.bialy,
              textShadow: "0 2px 14px rgba(0,0,0,0.85)",
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
    <div
      style={{
        position: "absolute",
        top: U.maskotkaPelnyOdGory - 90,
        left: 0,
        width: U.strefaPrawo,
        display: "flex",
        justifyContent: "center",
      }}
    >
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

// Karta „Porada Druha Paragrafa” – stały, rozpoznawalny moment w każdej rolce.
// Wiersze mogą pojawiać się po kolei, każdy na swoim słowie lektora.
const Porada: React.FC<{ scena: ScenaOSP }> = ({ scena }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const porada = scena.porada!;
  const t = scena.start + frame / fps;
  const w = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const ikona = spring({ frame: frame - 12, fps, config: { damping: 10 } });
  const zlote = new Set((porada.zlote ?? []).map(normalizuj));
  const wiersze = porada.wiersze ?? [{ tekst: porada.tekst ?? "" }];
  // Wielkość liter dobrana tak, żeby najdłuższy wiersz zmieścił się w karcie
  const najdluzszy = Math.max(...wiersze.map((wr) => wr.tekst.length));
  const rozmiar = porada.wiersze
    ? Math.min(66, Math.floor(700 / (najdluzszy * 0.62)))
    : 58;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        width: U.strefaPrawo - 100,
        top: 640,
        borderRadius: 36,
        background: `${MARKA.tloJasne}f2`,
        border: `3px solid ${MARKA.zloto}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        padding: "150px 56px 60px",
        boxSizing: "border-box",
        fontFamily: FONT,
        opacity: w,
        transform: `translateY(${(1 - w) * 60}px)`,
      }}
    >
      <Img
        src={staticFile("postac/wskazuje.png")}
        style={{
          position: "absolute",
          top: -150,
          left: 30,
          height: 260,
          transform: `scale(${ikona})`,
          transformOrigin: "50% 100%",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 58,
          left: 236,
          right: 30,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 3,
          whiteSpace: "nowrap",
          color: MARKA.nadtytul,
        }}
      >
        PORADA DRUHA PARAGRAFA
      </div>
      {wiersze.map((wiersz, i) => {
        const czas = wiersz.slowo ? czasSlowa(scena, wiersz.slowo) : undefined;
        const ww =
          czas === undefined
            ? 1
            : spring({
                frame: Math.round((t - czas) * fps),
                fps,
                config: { damping: 13 },
              });
        return (
          <div
            key={i}
            style={{
              fontSize: rozmiar,
              fontWeight: 800,
              lineHeight: 1.2,
              whiteSpace: porada.wiersze ? "nowrap" : "normal",
              opacity: ww,
              transform: `translateX(${(1 - ww) * -30}px)`,
            }}
          >
            {wiersz.tekst.split(" ").map((slowo, j) => (
              <span
                key={j}
                style={{
                  color:
                    wiersz.zloty || zlote.has(normalizuj(slowo))
                      ? MARKA.zloto
                      : MARKA.bialy,
                }}
              >
                {slowo}{" "}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// Pytanie do widza w złotej pigułce
const Wezwanie: React.FC<{ tekst: string; srodek: number }> = ({
  tekst,
  srodek,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        position: "absolute",
        top: srodek - 45,
        left: 0,
        width: U.strefaPrawo,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${w})`,
          fontFamily: FONT,
          fontWeight: 800,
          // długie pytanie zmniejszamy, żeby pigułka mieściła się w bezpiecznej strefie
          fontSize: Math.min(
            U.przyciskRozmiar,
            Math.floor((U.strefaPrawo - 120) / (tekst.length * 0.6)),
          ),
          color: MARKA.tlo,
          background: MARKA.zloto,
          borderRadius: 999,
          padding: "18px 40px",
          whiteSpace: "nowrap",
          boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
        }}
      >
        {tekst}
      </div>
    </div>
  );
};

const TelefonOdSlowa: React.FC<{ opoznienie: number }> = ({ opoznienie }) => {
  const frame = useCurrentFrame();
  return <Telefon od={frame - opoznienie} />;
};

const Haslo: React.FC<{ linie: LiniaHasla[]; najwiecej: number }> = ({
  linie,
  najwiecej,
}) => (
  <>
    {linie.map((l, i) => (
      <div
        key={i}
        style={{
          fontSize: Math.min(
            najwiecej,
            Math.floor((SZEROKOSC_TRESCI * 1.22) / l.tekst.length),
          ),
          whiteSpace: "nowrap",
          color: l.zloty ? MARKA.zloto : MARKA.bialy,
        }}
      >
        {l.tekst}
      </div>
    ))}
  </>
);

// Hak: duże hasło od pierwszej klatki (bez wejścia z zera – klatka 0 jest okładką rolki)
const Hak: React.FC<{ linie: LiniaHasla[]; postac?: boolean }> = ({
  linie,
  postac = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zanik = interpolate(
    frame,
    [durationInFrames - PRZENIKANIE * 2, durationInFrames],
    [1, 0],
    ZAKRES,
  );
  const najazd = interpolate(frame, [0, durationInFrames], [1, 1.06], ZAKRES);
  return (
    <AbsoluteFill style={{ backgroundColor: `${MARKA.tlo}9c`, opacity: zanik }}>
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
          textShadow: "0 6px 40px rgba(0,0,0,0.8)",
        }}
      >
        <Haslo linie={linie} najwiecej={120} />
        <div
          style={{
            width: 160,
            height: 8,
            background: MARKA.zloto,
            margin: "44px auto 0",
            borderRadius: 4,
          }}
        />
      </div>
      {postac ? (
        <>
          <div
            style={{
              position: "absolute",
              left: SRODEK_X - 200,
              top: 1375,
              width: 400,
              height: 84,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: SRODEK_X - 230,
              width: 460,
              top: 860,
              height: 560,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile("postac/zaskoczony.png")}
              style={{
                height: 560,
                transform: `scale(${najazd})`,
                transformOrigin: "50% 100%",
                filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// Plansza końcowa: nic na siebie nie nachodzi, wszystko w bezpiecznej strefie
const Plansza: React.FC<NonNullable<Odcinek["plansza"]>> = ({
  haslo,
  pigulka,
  kontakt,
  stopka,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tlo = interpolate(frame, [0, PRZENIKANIE], [0, 1], ZAKRES);
  const w = (opoznienie: number) =>
    spring({ frame: frame - opoznienie, fps, config: { damping: 14 } });
  const kolumna: React.CSSProperties = {
    position: "absolute",
    left: SRODEK_X - SZEROKOSC_TRESCI / 2,
    width: SZEROKOSC_TRESCI,
    textAlign: "center",
    fontFamily: FONT,
  };
  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo, opacity: tlo }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 72% 42% at 43% 52%, #2B2E3A 0%, rgba(21,22,27,0) 75%)",
        }}
      />
      <div
        style={{
          ...kolumna,
          top: 300,
          fontWeight: 800,
          lineHeight: 1.1,
          opacity: w(4),
          transform: `translateY(${(1 - w(4)) * 40}px)`,
        }}
      >
        <Haslo linie={haslo} najwiecej={110} />
      </div>
      <div
        style={{
          ...kolumna,
          top: 640,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${w(14)})`,
        }}
      >
        <div
          style={{
            background: MARKA.zloto,
            color: MARKA.tlo,
            fontWeight: 800,
            fontSize: 34,
            whiteSpace: "nowrap",
            borderRadius: 999,
            padding: "18px 36px",
          }}
        >
          {pigulka}
        </div>
      </div>
      <div
        style={{
          ...kolumna,
          top: 790,
          fontWeight: 700,
          fontSize: 52,
          color: MARKA.bialy,
          opacity: w(22),
        }}
      >
        {kontakt}
      </div>
      <div
        style={{
          position: "absolute",
          left: SRODEK_X - 150,
          top: 1262,
          width: 300,
          height: 64,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)",
          opacity: w(28),
        }}
      />
      <div
        style={{
          ...kolumna,
          top: 920,
          height: 380,
          display: "flex",
          justifyContent: "center",
          opacity: w(28),
          transform: `translateY(${(1 - w(28)) * 30}px)`,
        }}
      >
        <Img
          src={staticFile("postac/cieszy-sie.png")}
          style={{ height: 380 }}
        />
      </div>
      <div
        style={{
          ...kolumna,
          top: 1350,
          fontWeight: 700,
          fontSize: 26,
          color: MARKA.tekstPomocniczy,
          opacity: w(30),
        }}
      >
        {stopka}
      </div>
    </AbsoluteFill>
  );
};

// Linie bezpiecznych stref – tylko do podglądu (props "strefy": true)
const Strefy: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: U.strefaDol,
        width: 1080,
        height: 1920 - U.strefaDol,
        background: "rgba(192,57,43,0.28)",
        borderTop: "4px dashed #ff5a4a",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: U.strefaPrawo,
        top: 0,
        width: 1080 - U.strefaPrawo,
        height: 1920,
        background: "rgba(192,57,43,0.28)",
        borderLeft: "4px dashed #ff5a4a",
      }}
    />
  </>
);

type Warstwa = {
  start: number;
  koniec: number;
  klucz: string;
  ujecie?: UjecieCzas;
  mapa?: MapaCzas;
};

export const RolkaOSP: React.FC<RolkaProps> = ({
  odcinek,
  dane,
  glosnosc = [],
  wymiary = {},
  strefy = false,
  tylkoDzwiek = false,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const klatka = (s: number) => Math.round(s * fps);

  const ostatnia = dane?.sceny[dane.sceny.length - 1];
  const planszaOd =
    !dane?.plansza || !ostatnia
      ? null
      : ostatnia.plansza
        ? Math.max(0, klatka(ostatnia.start) - 6)
        : klatka(ostatnia.koniec + 0.4);

  const os = useMemo(
    () => (dane ? zbudujOs(dane, durationInFrames / fps) : null),
    [dane, durationInFrames, fps],
  );
  const zdarzenia = useMemo(
    () =>
      dane && os
        ? zbierzDzwieki(dane, os, planszaOd === null ? null : planszaOd / fps)
        : [],
    [dane, os, planszaOd, fps],
  );
  const warstwy = useMemo<Warstwa[]>(
    () =>
      os
        ? [
            ...os.ujecia.map((u) => ({
              start: u.start,
              koniec: u.koniec,
              klucz: u.klucz,
              ujecie: u,
            })),
            ...os.mapy.map((m) => ({
              start: m.start,
              koniec: m.koniec,
              klucz: m.klucz,
              mapa: m,
            })),
          ].sort((a, b) => a.start - b.start)
        : [],
    [os],
  );
  if (!dane || !os || !ostatnia) return null;

  const zakresSceny = (i: number) => {
    const od = klatka(dane.sceny[i].start);
    const nastepna = dane.sceny[i + 1];
    return {
      od,
      doKlatki: nastepna ? klatka(nastepna.start) : durationInFrames,
    };
  };
  // Pytanie do widza pada w ostatniej scenie przed planszą końcową
  const scenaPytania: ScenaOSP | undefined =
    dane.sceny[
      ostatnia.plansza ? dane.sceny.length - 2 : dane.sceny.length - 1
    ];

  // Tryb „tylko dźwięk” (render ścieżki dźwiękowej bez przeliczania obrazu, np. przy renderze w kawałkach)
  if (tylkoDzwiek) {
    return (
      <AbsoluteFill>
        <Dzwiek
          odcinek={odcinek}
          dane={dane}
          glosnosc={glosnosc}
          zdarzenia={zdarzenia}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: MARKA.tlo }}>
      <Dzwiek
        odcinek={odcinek}
        dane={dane}
        glosnosc={glosnosc}
        zdarzenia={zdarzenia}
      />

      {/* Ujęcia i mapy: każde wchodzi przenikaniem na poprzednie */}
      {warstwy.map((w) => {
        const od =
          w.start <= 0 ? 0 : Math.max(0, klatka(w.start) - PRZENIKANIE);
        const dlugosc = Math.max(
          1,
          Math.min(durationInFrames, klatka(w.koniec)) - od,
        );
        if (w.ujecie) {
          return (
            <Sequence
              key={w.klucz}
              from={od}
              durationInFrames={dlugosc}
              layout="none"
            >
              <UjecieTla
                u={w.ujecie}
                odcinek={odcinek}
                wymiary={w.ujecie.obraz ? wymiary[w.ujecie.obraz] : undefined}
                pierwsze={od === 0}
                klatkaStartu={od}
                dlugosc={dlugosc}
              />
            </Sequence>
          );
        }
        const Mapa = w.mapa ? MAPY[w.mapa.nazwa]?.Widok : undefined;
        if (!Mapa || !w.mapa) return null;
        return (
          <Sequence
            key={w.klucz}
            from={od}
            durationInFrames={dlugosc}
            layout="none"
          >
            <Mapa sceny={w.mapa.sceny} klatkaStartu={od} pierwsze={od === 0} />
          </Sequence>
        );
      })}

      {/* Starsze rysowane ilustracje w panelu */}
      {dane.sceny.map((scena, i) => {
        if (!scena.ilustracja) return null;
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence
            key={i}
            from={od}
            durationInFrames={doKlatki - od}
            layout="none"
          >
            <PanelIlustracji
              nazwa={scena.ilustracja}
              dlugosc={doKlatki - od}
              jasnosc={
                dane.maskotka && scena.postac?.plan === "pelny"
                  ? U.ilustracjaPrzyMaskotce
                  : 1
              }
            />
          </Sequence>
        );
      })}

      <Winieta />

      {/* Przyciemnienie pod napisami, żeby były czytelne na każdym obrazie */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: 0,
          height: dane.styl === "makieta" ? 300 : U.ilustracjaOdGory + 80,
          background: `linear-gradient(180deg, ${MARKA.tlo}f2 0%, ${MARKA.tlo}e0 70%, transparent 100%)`,
        }}
      />

      {dane.sceny.map((scena, i) => {
        if (scena.plansza) return null;
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence
            key={i}
            from={od}
            durationInFrames={doKlatki - od}
            layout="none"
          >
            {dane.styl === "makieta" ? null : <Napisy scena={scena} />}
          </Sequence>
        );
      })}

      {dane.nadtytul && <Nadtytul tekst={dane.nadtytul} />}

      {dane.naczelnik && <PostacNaczelnika dane={dane} glosnosc={glosnosc} />}

      {dane.sceny.map((scena, i) => {
        if (!scena.porada && !scena.telefon) return null;
        const { od, doKlatki } = zakresSceny(i);
        const tTelefonu = scena.telefon
          ? (czasSlowa(scena, scena.telefon.slowo ?? "") ?? scena.start)
          : 0;
        return (
          <Sequence
            key={i}
            from={od}
            durationInFrames={doKlatki - od}
            layout="none"
          >
            {scena.porada && <Porada scena={scena} />}
            {scena.telefon && (
              <TelefonOdSlowa opoznienie={klatka(tTelefonu) - od} />
            )}
          </Sequence>
        );
      })}

      {dane.maskotka && <Maskotka dane={dane} glosnosc={glosnosc} />}

      {/* Napisy-pigułki („makieta”) leżą nad maskotką; w studiu z pełną postacią przechodzą na górę */}
      {dane.styl === "makieta"
        ? dane.sceny.map((scena, i) => {
            if (scena.plansza) return null;
            const { od, doKlatki } = zakresSceny(i);
            return (
              <Sequence
                key={`p${i}`}
                from={od}
                durationInFrames={doKlatki - od}
                layout="none"
              >
                <NapisyPigulka
                  scena={scena}
                  gora={!!scena.studio || scena.postac?.plan === "pelny"}
                />
              </Sequence>
            );
          })
        : null}

      {dane.sceny.map((scena, i) => {
        if (!scena.etykieta) return null;
        const { od, doKlatki } = zakresSceny(i);
        return (
          <Sequence
            key={i}
            from={od}
            durationInFrames={doKlatki - od}
            layout="none"
          >
            <Etykieta tekst={scena.etykieta} />
          </Sequence>
        );
      })}

      {dane.cta && scenaPytania && (
        <Sequence
          from={klatka(
            scenaPytania.telefon
              ? (czasSlowa(scenaPytania, scenaPytania.telefon.slowo ?? "") ??
                  scenaPytania.start) + 0.5
              : scenaPytania.start,
          )}
          layout="none"
        >
          <Wezwanie
            tekst={dane.cta}
            srodek={scenaPytania.telefon ? 500 : U.przyciskSrodek}
          />
        </Sequence>
      )}

      {dane.hak && (
        <Sequence
          from={0}
          durationInFrames={Math.round((dane.wstep ?? 1.5) * fps) + PRZENIKANIE}
          layout="none"
        >
          <Hak linie={dane.hak} postac={dane.hakPostac !== false} />
        </Sequence>
      )}

      {dane.plansza && planszaOd !== null && (
        <Sequence from={planszaOd} layout="none">
          <Plansza {...dane.plansza} />
        </Sequence>
      )}

      <Ziarno />

      {strefy && <Strefy />}
    </AbsoluteFill>
  );
};
