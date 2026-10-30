import { continueRender, delayRender, staticFile } from "remotion";

// Barwy i fonty z doradztwodlaosp.pl (index.html)
export const MARKA = {
  granat: "#0D1B2A",
  granatJasny: "#1E2F45",
  czerwony: "#C0392B",
  czerwonyJasny: "#e8786e",
  krem: "#F5F0E8",
  szary: "#8FA3B8",
  adres: "doradztwodlaosp.pl",
};

// ─────────────────────────────────────────────────────────────
// USTAWIENIA SZABLONU – tu możesz bezpiecznie zmieniać liczby.
// Kadr ma 1080 px szerokości i 1920 px wysokości.
// Zmieniaj tylko wartości po dwukropku, zostaw przecinki na końcu linii.
// ─────────────────────────────────────────────────────────────
export const USTAWIENIA = {
  // Napisy
  napisyOdGory: 260, // odległość napisów od górnej krawędzi (px)
  napisyRozmiar: 58, // zwykłe słowa (px)
  akcentRozmiar: 104, // wyróżnione, czerwone słowa (px)
  slowNaRaz: 4, // ile słów najwyżej widać naraz

  // Ruch obrazu (powolne przybliżanie, jak "kamera")
  zoomStart: 1.04, // 1 = bez przybliżenia
  zoomKoniec: 1.16, // większa liczba = mocniejsze przybliżenie
  przesuniecie: 30, // przesunięcie w bok w trakcie sceny (px)
  przenikanie: 8, // długość przejścia między scenami (klatki; 30 klatek = 1 s)

  // Przyciemnienie obrazu (0 = brak, 1 = całkiem ciemno)
  przyciemnienieGora: 0.93,
  przyciemnienieDol: 0.8,

  // Znaczek z adresem strony
  pokazZnaczek: true, // false = bez znaczka
  znaczekOdDolu: 470, // odległość od dolnej krawędzi (px)

  // Przycisk na końcu rolki
  przyciskOdGory: 700, // odległość od górnej krawędzi (px)
  przyciskRozmiar: 44, // wielkość tekstu (px)
};

export const FONT_NAGLOWEK = "Syne";
export const FONT_TEKST = "DM Sans";

// Fonty zapisane lokalnie w public/fonty (Google Fonts, licencja OFL), żeby render nie zależał od internetu
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FONTY = [
  { rodzina: FONT_NAGLOWEK, plik: "syne-latin.woff2", zakres: LATIN },
  { rodzina: FONT_NAGLOWEK, plik: "syne-latin-ext.woff2", zakres: LATIN_EXT },
  { rodzina: FONT_TEKST, plik: "dmsans-latin.woff2", zakres: LATIN },
  { rodzina: FONT_TEKST, plik: "dmsans-latin-ext.woff2", zakres: LATIN_EXT },
];

if (typeof document !== "undefined") {
  const uchwyt = delayRender("Ładowanie fontów marki");
  Promise.all(
    FONTY.map(async ({ rodzina, plik, zakres }) => {
      const font = new FontFace(rodzina, `url(${staticFile(`fonty/${plik}`)}) format("woff2")`, {
        weight: "400 800",
        unicodeRange: zakres,
      });
      await font.load();
      document.fonts.add(font);
    }),
  )
    .then(() => continueRender(uchwyt))
    .catch((err) => {
      console.error("Nie udało się wczytać fontów", err);
      continueRender(uchwyt);
    });
}
