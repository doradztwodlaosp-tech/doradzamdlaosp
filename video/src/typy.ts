// Wspólne typy i pomocnicze funkcje szablonu rolek.
// Format pliku odcinka (public/odcinki/<odcinek>/odcinek.json) jest opisany w .claude/skills/rolka/SKILL.md

export type Slowo = { w: string; s: number; e: number };

// Pozy Druha Paragrafa (pliki w public/postac; wymiary wyciętych obrazów)
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
export type Plan = "pelny" | "obok" | "prawo" | "maly" | "brak";
export type UstawieniaPostaci = {
  plan?: Plan;
  poza?: Poza;
  gest?: { slowo: string; plan?: Plan; poza?: Poza; ruch?: Ruch };
};

// Ruch kamery po zdjęciu: punkt (0–1), na który patrzy kamera na początku i na końcu ujęcia, oraz przybliżenie
export type Kadr = { od: [number, number]; do?: [number, number]; zoomOd?: number; zoomDo?: number };

// Naklejki: grafiki przypięte do miejsca na zdjęciu (x, y w ułamkach zdjęcia) – poruszają się razem z kamerą.
// Każda pojawia się dokładnie na wskazanym słowie lektora.
export type Naklejka =
  | { typ: "znacznik"; x: number; y: number; slowo: string; tekst: string; gora?: boolean }
  | { typ: "chip"; x: number; y: number; slowo: string; tekst: string }
  | { typ: "pieczec"; x: number; y: number; slowo: string; tekst: string }
  | { typ: "brak"; x: number; y: number; szer: number; wys: number; slowo: string }
  | { typ: "kartka-leci"; x: number; y: number; slowo: string; tekst?: string }
  | { typ: "kartka-odbita"; x: number; y: number; krzyzyk: string; tekst?: string }
  | { typ: "napis"; slowo: string; tekst: string }
  | { typ: "licznik"; slowo: string; od: number; do: number; miejsca?: number; sufiks?: string; podpis?: string };

// Ujęcie: jeden „kadr” filmu. Scena (zdanie lektora) może mieć kilka ujęć – kolejne zaczyna się na słowie "od".
export type Ujecie = {
  od?: string;
  obraz?: string; // zdjęcie z folderu odcinka
  uklad?: "pelny" | "pas"; // pelny = zdjęcie na cały ekran; pas = ostre zdjęcie w pasie, rozmyta kopia w tle (domyślnie dla poziomych)
  kadr?: Kadr;
  przyciemnij?: [number, number]; // przyciemnienie zdjęcia na początku i na końcu ujęcia (0–1)
  swiatla?: { x: number; y: number; r?: number }[]; // migoczące ciepłe światła (okna, lampy)
  pyl?: boolean; // drobinki kurzu w świetle
  naklejki?: Naklejka[];
  studio?: boolean; // tło marki („studio” Druha Paragrafa) zamiast zdjęcia
};

export type ScenaOSP = {
  tekst: string;
  lektor?: string;
  akcent?: string[];
  ujecia?: Ujecie[];
  // Skróty dla sceny z jednym ujęciem:
  obraz?: string;
  uklad?: "pelny" | "pas";
  kadr?: Kadr;
  znacznik?: { x: number; y: number; slowo: string; tekst: string };
  studio?: boolean;
  mapa?: string; // mapa 3D (src/Mapy.tsx); kolejne sceny z tą samą mapą tworzą jeden przelot kamery
  karta?: { tytul?: string; wiersze: { tekst: string; slowo: string }[] }; // przy mapach 3D: karta nad przedmiotem, wiersze wchodzą na słowa
  czesc?: { numer: string; tytul: string } | null; // od tej sceny: znacznik części filmu, np. 1/2 JEDNOSTKI (null = koniec znacznika)
  liczba?: { slowo: string; do: number; miejsca?: number; sufiks?: string; podpis: string }; // duża liczba nad przedmiotem (od słowa)
  haslo?: string; // krótkie hasło sceny (do 6 słów); słowo w *gwiazdkach* jest złote
  kamera?: string;
  // przy mapach 3D: dodatkowe ujęcia kamery w tej scenie, każde od wskazanego słowa (nazwa miejsca i/lub własne liczby)
  ujeciaKamery?: { slowo: string; kamera?: string; cel?: [number, number, number]; kat?: number; odl?: number; wys?: number }[];
  // przy mapach 3D: przedmioty, które „dzieją się” na słowo lektora (kartka wjeżdża, pieczątka uderza, moneta spada)
  akcje?: { slowo: string; typ: "kartka" | "pieczec" | "moneta"; tekst?: string; poz: [number, number]; obrot?: number; opoznienie?: number; rozmiar?: number }[]; // przy mapach 3D: nazwa miejsca, do którego kamera płynie w tej scenie (np. "remiza")
  ilustracja?: string; // starsze rysowane ilustracje (src/ScenyPion.tsx)
  prompt?: string;
  postac?: UstawieniaPostaci;
  etykieta?: string;
  porada?: { tekst?: string; zlote?: string[]; wiersze?: { tekst: string; slowo?: string; zloty?: boolean }[] };
  telefon?: { slowo?: string }; // telefon ze stroną doradztwodlaosp.pl
  plansza?: boolean; // ta scena to plansza końcowa (lektor mówi na planszy)
  start: number;
  koniec: number;
  slowa: Slowo[];
};

export type LiniaHasla = { tekst: string; zloty?: boolean };

export type Odcinek = {
  tytul: string;
  nadtytul?: string;
  glos: string;
  muzyka?: string | false; // plik w folderze odcinka; brak = wspólny podkład public/dzwieki/podklad.mp3; false = bez muzyki
  cta?: string;
  naczelnik?: boolean;
  maskotka?: boolean;
  wyglad3d?: "rysunek" | "makieta" | "jasny"; // wygląd scen 3D: rysunek techniczny (domyślnie makieta)
  emblemat?: string; // plik z logo w public/ (np. "marka/emblemat.png"); brak = emblemat z elementów marki
  napisy?: "pigulka" | "haslo"; // „haslo”: zamiast zapisu lektora krótkie hasło sceny u góry (jak BazaOSP)
  styl?: "makieta"; // „makieta”: napisy w ciemnej pigułce nad dolną strefą (jak w filmach instruktażowych 3D)
  szkic?: string; // odcinek bez nagrania lektora: czasy szacunkowe
  wstep?: number; // sekundy z hasłem-hakiem przed pierwszym słowem lektora
  hak?: LiniaHasla[];
  hakPostac?: boolean; // false = na pierwszej klatce bez Druha Paragrafa // hasło na pierwszej klatce (działa też jako okładka)
  plansza?: { haslo: LiniaHasla[]; pigulka: string; kontakt: string; stopka: string };
  sceny: ScenaOSP[];
};

export type RolkaProps = {
  odcinek: string;
  dane?: Odcinek;
  glosnosc?: number[];
  wymiary?: Record<string, [number, number]>;
  strefy?: boolean;
  tylkoDzwiek?: boolean; // tylko ścieżka dźwiękowa (bez obrazu)
};

export const FPS = 30;
export const ZAKRES = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const normalizuj = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Czas (w sekundach filmu), w którym pada słowo zaczynające się od podanego fragmentu
export const czasSlowa = (scena: ScenaOSP, slowo: string): number | undefined => {
  const szukane = normalizuj(slowo);
  if (!szukane) return undefined;
  // Dokładne dopasowanie ma pierwszeństwo (np. „nie” nie może trafić w „Niestety”)
  const dokladne = scena.slowa.find((s) => normalizuj(s.w) === szukane);
  return (dokladne ?? scena.slowa.find((s) => normalizuj(s.w).startsWith(szukane)))?.s;
};

export type UjecieCzas = Ujecie & { start: number; koniec: number; scena: ScenaOSP; numer: number; klucz: string };
export type MapaCzas = { nazwa: string; start: number; koniec: number; sceny: ScenaOSP[]; klucz: string };

// Rozkłada sceny na oś czasu ujęć i map. Każde ujęcie trwa do początku następnego ujęcia lub mapy.
export const zbudujOs = (dane: Odcinek, koniecFilmu: number): { ujecia: UjecieCzas[]; mapy: MapaCzas[] } => {
  const ujecia: UjecieCzas[] = [];
  const mapy: (MapaCzas & { ostatni: number })[] = [];
  dane.sceny.forEach((scena, i) => {
    if (scena.plansza) return;
    const poczatek = i === 0 ? 0 : scena.start;
    if (scena.mapa) {
      const ost = mapy[mapy.length - 1];
      if (ost && ost.nazwa === scena.mapa && ost.ostatni === i - 1) {
        ost.sceny.push(scena);
        ost.ostatni = i;
      } else {
        mapy.push({ nazwa: scena.mapa, start: poczatek, koniec: 0, sceny: [scena], klucz: `m${i}`, ostatni: i });
      }
      return;
    }
    const lista: Ujecie[] =
      scena.ujecia ??
      (scena.obraz
        ? [
            {
              obraz: scena.obraz,
              uklad: scena.uklad,
              kadr: scena.kadr,
              naklejki: scena.znacznik ? [{ typ: "znacznik", ...scena.znacznik }] : undefined,
            },
          ]
        : [{ studio: scena.studio }]);
    lista.forEach((u, j) => {
      const start = j === 0 ? poczatek : (czasSlowa(scena, u.od ?? "") ?? scena.start);
      ujecia.push({ ...u, start, koniec: 0, scena, numer: ujecia.length, klucz: `${i}-${j}` });
    });
  });
  const poczatki = [...ujecia.map((u) => u.start), ...mapy.map((m) => m.start)].sort((a, b) => a - b);
  const nastepny = (t: number) => poczatki.find((p) => p > t + 1e-6) ?? koniecFilmu;
  ujecia.forEach((u) => (u.koniec = nastepny(u.start)));
  mapy.forEach((m) => (m.koniec = nastepny(m.sceny[m.sceny.length - 1].start)));
  return { ujecia, mapy };
};
