import { continueRender, delayRender, staticFile } from "remotion";

// Barwy marki doradztwodlaosp.pl (wersja „grafit i złoto”)
export const MARKA = {
  tlo: "#15161B", // grafitowe tło
  tloJasne: "#20222A", // karty i panele na tle
  zloto: "#DAA73C", // wszystkie akcenty
  bialy: "#FFFFFF", // tekst główny
  tekstPomocniczy: "#CBCBD3",
  nadtytul: "#C5AB6E", // małe nadtytuły
  czerwony: "#C0392B", // tylko znaki ostrzeżenia (przekreślenie, „!”)
  adres: "doradztwodlaosp.pl",
};

// ─────────────────────────────────────────────────────────────
// USTAWIENIA SZABLONU – tu możesz bezpiecznie zmieniać liczby.
// Kadr ma 1080 px szerokości i 1920 px wysokości.
// Zmieniaj tylko wartości po dwukropku, zostaw przecinki na końcu linii.
// ─────────────────────────────────────────────────────────────
export const USTAWIENIA = {
  // Bezpieczna strefa (Facebook, Instagram): nic ważnego niżej ani bardziej w prawo
  strefaDol: 1440, // dolne 25% ekranu zasłaniają opisy i przyciski
  strefaPrawo: 918, // prawy pas ok. 15% zasłaniają polubienia i komentarze

  // Nadtytuł u góry
  nadtytulOdGory: 100, // odległość od górnej krawędzi (px)
  nadtytulRozmiar: 30, // wielkość liter (px)

  // Ilustracja sceny (pionowy panel)
  ilustracjaOdGory: 430, // górna krawędź panelu (px) – pod napisami
  ilustracjaWysokosc: 1010, // wysokość panelu (px) – do granicy bezpiecznej strefy

  // Napisy
  napisyOdGory: 190, // górna krawędź bloku napisów (px) – napisy są u góry, jak we wzorach
  napisyWysokosc: 220, // wysokość bloku napisów (px)
  napisyRozmiar: 54, // zwykłe słowa (px)
  akcentRozmiar: 64, // słowa kluczowe (px)
  slowNaRaz: 4, // ile słów najwyżej widać naraz

  // Zdjęcia: przejścia i układ
  przenikanie: 8, // długość przejścia między ujęciami (klatki; 30 klatek = 1 s)
  pasOdGory: 400, // zdjęcia poziome: górna krawędź ostrego pasa (px); w tle rozmyta kopia zdjęcia
  pasWysokosc: 1180, // wysokość tego pasa (px)

  // Filmowy wygląd
  ziarno: 0.14, // siła ziarna filmowego (0 = brak)
  winieta: 0.5, // przyciemnienie rogów kadru (0 = brak)
  studioPodloga: 1250, // linia podłogi w studiu Druha Paragrafa (px od góry)

  // Dźwięk (1 = pełna głośność pliku)
  muzykaGlosnosc: 0.3, // podkład, gdy lektor milczy
  muzykaPodGlosem: 0.14, // podkład pod głosem lektora
  efektyGlosnosc: 0.5, // efekty dźwiękowe

  // Maskotka – złoty paragraf (gdy w odcinek.json jest "maskotka": true)
  maskotkaPelnyWysokosc: 860, // wysokość na pełnym planie (px)
  maskotkaPelnyOdGory: 470, // górna krawędź na pełnym planie (px)
  maskotkaMalyWysokosc: 430, // wysokość w rogu (px)
  maskotkaMalyOdLewej: 10, // odległość od lewej krawędzi w rogu (px)
  maskotkaObokWysokosc: 600, // wysokość, gdy wchodzi obok obrazu, żeby coś wskazać (px)
  maskotkaObokOdGory: 820, // górna krawędź w tym planie (px)
  ilustracjaPrzyMaskotce: 0.22, // jasność ilustracji za maskotką na pełnym planie (0–1)
  maskotkaPrawoWysokosc: 620, // wysokość, gdy stoi po prawej i pokazuje telefon (px)
  maskotkaPrawoOdGory: 800, // górna krawędź w tym planie (px)

  // Pan Naczelnik (gdy w odcinek.json jest "naczelnik": true)
  naczelnikSzerokosc: 300, // szerokość postaci (px); wysokość dopasuje się sama
  naczelnikOdLewej: 10, // odległość od lewej krawędzi (px)

  // Przycisk na końcu rolki
  przyciskSrodek: 1392, // środek pigułki z pytaniem od górnej krawędzi (px) – tuż pod stopami postaci
  przyciskRozmiar: 42, // wielkość tekstu (px)
};

export const FONT = "Montserrat";

// Montserrat (Google Fonts, licencja OFL) zapisany lokalnie w public/fonty, żeby render nie zależał od internetu
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FONTY = [
  { plik: "montserrat-latin.woff2", zakres: LATIN },
  { plik: "montserrat-latin-ext.woff2", zakres: LATIN_EXT },
];

if (typeof document !== "undefined") {
  const uchwyt = delayRender("Ładowanie czcionki marki");
  Promise.all(
    FONTY.map(async ({ plik, zakres }) => {
      const font = new FontFace(FONT, `url(${staticFile(`fonty/${plik}`)}) format("woff2")`, {
        weight: "100 900",
        unicodeRange: zakres,
      });
      await font.load();
      document.fonts.add(font);
    }),
  )
    .then(() => continueRender(uchwyt))
    .catch((err) => {
      console.error("Nie udało się wczytać czcionki", err);
      continueRender(uchwyt);
    });
}
