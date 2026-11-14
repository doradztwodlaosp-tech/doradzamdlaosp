---
name: rolka
description: Tworzy pionową rolkę (9:16, Facebook Reels) w stylu doradztwodlaosp.pl z Druhem Paragrafem na podstawie tematu lub scenariusza. Użyj, gdy użytkownik podaje temat rolki, wkleja scenariusz, przysyła nagranie lektora albo obrazy do odcinka, albo pisze /rolka.
---

# Rolka doradztwodlaosp.pl

Użytkownik jest prawnikiem, nie informatykiem. Pisz po polsku, prostym językiem, krok po kroku.
Pytaj o zgodę przed instalowaniem czegokolwiek nowego. Nigdy nie proś o wklejanie kluczy API do czatu
(klucze podaje się w bezpiecznym formularzu środowiska).

Projekt Remotion jest w folderze `video/`. Szablon: kompozycja `RolkaOSP` (`video/src/RolkaOSP.tsx`),
typy i format odcinka: `video/src/typy.ts`, barwy, fonty i ustawienia: `video/src/marka.ts`.
Szablonu nie zmieniaj dla pojedynczego odcinka – odcinek to tylko plik `odcinek.json` i obrazy.

## 0. Przeczytaj wytyczne marki

Zanim cokolwiek zrobisz, przeczytaj w `video/marka/`: `PRZEWODNIK.md` (jak pracujemy i decyzje strategiczne),
`ZASADY-FILMU.md` (10 obowiązkowych zasad), `BRANDBOOK.md`, `POSTAC.md`, `MOODBOARD.md`, `SLOWNIK-ANIMACJI.md`.
Gdy użytkownik używa nazwy ze słownika (np. „najazd”, „przenikanie”), zrób dokładnie ten efekt.

## WZÓR FILMU (zatwierdzony 14.11.2026) – stosuj w każdej nowej rolce

Wzorcowy odcinek: `video/public/odcinki/kim-jestesmy/odcinek.json`. Nową rolkę zaczynaj od kopii jego ustawień.

- **Wygląd:** jasna, ciepła „kancelaryjna” makieta 3D na jednym stole (`"wyglad3d": "jasny"`, `"styl": "makieta"`,
  wszystkie sceny `"mapa": "stol-osp"` z polem `"kamera"`). Barwy marki: grafit, złoto, biel; tło kremowe, blat z jasnego dębu.
  Ma być profesjonalnie i spokojnie – nie „bajkowo”.
- **Bez twarzy autora** (jak BazaOSP). Druh Paragraf tylko na końcu (scena z pytaniem w studiu + plansza), stoi spokojnie;
  `"hakPostac": false`.
- **Góra kadru:** tylko „DORADZTWO DLA OSP” na środku (`"nadtytul": "DORADZTWO DLA OSP"`).
- **Dół kadru:** emblemat marki (`"emblemat"`: plik logo w `public/`; bez pliku – pigułka „§ DORADZTWO DLA OSP”).
- **Napisy:** grafitowa pigułka nad emblematem z CAŁĄ wypowiedzią dla danego obrazu; słowa podświetlają się za lektorem
  (bieżące złote, powiedziane białe, kolejne szare). Nie dzielić zdań na kawałki.
- **Układ:** wszystko w jednej kolumnie (`KOLUMNA` w `marka.ts`) – równe brzegi kart, napisów i znacznika części.
- **Karty** (`"karta"` w scenie): grafitowe ze złotą ramką, wiersze wchodzą na słowa lektora.
- **Części filmu** (`"czesc": {"numer": "1/2", "tytul": "JEDNOSTKI"}`, koniec: `null`) – gdy film ma bloki.
- **Duże liczby** dla konkretów (np. licznik 1,5% przy monetach). Tylko prawdziwe, sprawdzalne liczby.
- **Tempo:** spokojne, kamera płynie między przedmiotami (2,2 s), jeden przedmiot naraz. Szkic: `TEMPO=14 PAUZA=0.55 npm run szkic -- <slug>`.
- **Zakończenie:** pytanie do widza (pigułka) + plansza „Pomagamy tym, którzy pomagają innym.” z prośbą o obserwowanie.
- **Przedmioty na stole** (`src/Stol3D.tsx`, `Remiza3D.tsx`, `Woz3D.tsx`, `Przedmioty3D.tsx`, `Scena3D.tsx`):
  remiza z wozem, stos dokumentów, protokół z pieczęcią, tabliczka marki, statut, monety, urząd gminy, wóz w zbliżeniu,
  hełm, laptop. Miejsca kamery: `remiza, papiery, protokol, marka, statut, statut-otwarty, monety, gmina, woz, helm,
  laptop, calosc`. Nowy temat bez pasującego przedmiotu = dobuduj przedmiot w tym samym stylu (detale, zaokrąglone krawędzie).
- **Długie filmy renderuj w kawałkach:** `bash skrypty/render-czesci.sh <slug> <liczba_klatek>` (odporne na restart).

## 1. Kolejność pracy (zawsze ta sama)

1. **Temat → scenariusz.** Z tematu napisz scenariusz według `ZASADY-FILMU.md`: hak (hasło na pierwszą klatkę),
   obietnica do 10. sekundy, 2–3 bloki konkretu, zdanie-łącznik („Ale to nie wszystko.”), Porada Druha Paragrafa,
   pytanie na koniec, plansza z prośbą o obserwowanie. 9–12 zdań, 35–50 s. Zapisz go w `video/scenariusze/<slug>.md`
   razem z podstawami prawnymi i pokaż do akceptacji. Nie wymyślaj przepisów; numery artykułów oznacz jako
   „do sprawdzenia” – użytkownik jest prawnikiem i to on je zatwierdza.
2. **Pisz pod obraz.** Do każdego zdania od razu zdecyduj, co widać: zdjęcie z ruchem kamery i naklejkami, mapa 3D,
   studio z Druhem Paragrafem, karta Porady, telefon. Zdanie, do którego nie da się nic pokazać, przepisz.
3. **Szkic bez lektora.** Zbuduj `odcinek.json`, uruchom `npm run szkic -- <slug>` i `npm run render -- <slug>`,
   obejrzyj klatki i wyślij MP4. Powiedz wyraźnie: to szkic, bez głosu, tempo szacunkowe.
4. **Paczka dla użytkownika.** Jedna wiadomość: (a) tekst dla lektora do wklejenia w ElevenLabs (pola `lektor`
   lub `tekst`, zdania oddzielone pustą linią), (b) lista brakujących obrazów z gotowymi opisami po polsku.
5. **Wersja pełna.** Po otrzymaniu MP3: skopiuj jako `video/public/odcinki/<slug>/lektor.mp3`,
   `npm run czasy -- <slug>` (sprawdź, czy każda scena zaczyna się od właściwego zdania), popraw słowa-kotwice,
   `npm run render -- <slug>`, obejrzyj klatki, wyślij MP4 i okładkę.
6. **Opakowanie.** Dodaj opis pod film (2–3 zdania + pytanie) i 3–5 hashtagów.

Gdy w środowisku są klucze (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`), kroki 4–5 zrób samodzielnie:
`npm run glos -- <slug>` (głos + dokładne czasy słów) i `npm run obrazy -- <slug>`.

## 2. Plik odcinka

`video/public/odcinki/<slug>/odcinek.json` (slug bez polskich znaków, np. `status-opp`). Wzory: `nowy-zarzad`
(zdjęcia, naklejki, mapa, telefon) i `status-opp` (długi przelot po mapie 3D, plansza z lektorem).

```json
{
  "tytul": "1,5% dla Twojej OSP? Najpierw statut.",
  "nadtytul": "PORADNIK OSP • STATUS OPP",
  "glos": "lektor.mp3",
  "maskotka": true,
  "wstep": 1.8,
  "hak": [{ "tekst": "1,5% PODATKU", "zloty": true }, { "tekst": "DLA TWOJEJ OSP?" }],
  "cta": "Czy Wasza OSP ma już status OPP?",
  "plansza": {
    "haslo": [{ "tekst": "POMAGAMY TYM,", "zloty": true }, { "tekst": "KTÓRZY POMAGAJĄ INNYM." }],
    "pigulka": "Zaobserwuj nas • doradztwodlaosp.pl",
    "kontakt": "WhatsApp: …",
    "stopka": "Materiał informacyjny. Nie zastępuje indywidualnej analizy."
  },
  "sceny": [
    {
      "tekst": "Zdanie na ekranie (poprawna pisownia, np. KRS)",
      "lektor": "Tylko gdy trzeba zapisać wymowę, np. ka-er-esu",
      "akcent": ["KRS."],
      "ujecia": [
        {
          "obraz": "remiza.jpg",
          "kadr": { "od": [0.4, 0.5], "do": [0.56, 0.5], "zoomOd": 1, "zoomDo": 1.06 },
          "swiatla": [{ "x": 0.58, "y": 0.56, "r": 150 }],
          "naklejki": [{ "typ": "chip", "x": 0.56, "y": 0.44, "slowo": "Walne", "tekst": "Walne zebranie" }]
        },
        { "od": "kawa", "obraz": "biuro.jpg", "pyl": true }
      ],
      "postac": { "plan": "brak", "gest": { "slowo": "cztery", "plan": "obok", "poza": "ostrzega" } }
    }
  ]
}
```

Pola odcinka:
- `hak` + `wstep`: hasło na pierwszej klatce (to także okładka) i ile sekund trwa przed pierwszym słowem lektora.
- `cta`: pytanie do widza w złotej pigułce w ostatniej scenie przed planszą. Zawsze pytanie, nigdy „napisz w komentarzu”.
- `plansza`: plansza końcowa. Gdy ostatnia scena ma `"plansza": true`, lektor mówi ją na planszy.
- `muzyka`: plik w folderze odcinka; brak pola = wspólny `public/dzwieki/podklad.mp3`; `false` = bez muzyki.
- `szkic`: ustawiane przez `npm run szkic`; oznacza czasy szacunkowe i brak głosu. `npm run czasy` je usuwa.
- `start`, `koniec`, `slowa` w scenach wpisują skrypty – nie wypełniaj ich ręcznie.

Co może pokazać scena (jedno z poniższych):
- **`ujecia`** – lista kadrów. Pierwszy zaczyna się ze sceną, kolejne na słowie `od` (cięcie na słowo).
  - `obraz`: plik z folderu odcinka. Pionowe zdjęcie wypełnia ekran (`uklad: "pelny"`), poziome trafia w ostry pas
    na rozmytej kopii (`"pas"`, domyślnie).
  - `kadr`: ruch kamery – punkt (ułamki zdjęcia 0–1), na który patrzy na początku i na końcu, oraz przybliżenie.
    Ruch ma być powolny; zoom powyżej ok. 1,6 rozmywa zdjęcie.
  - `swiatla` (migoczące okna/lampy), `pyl`, `przyciemnij: [początek, koniec]`.
  - `naklejki` – grafiki przypięte do miejsca na zdjęciu, pojawiają się na słowie `slowo`:
    `znacznik` (kółko z podpisem), `chip` (pigułka z tekstem), `pieczec` (stempel, np. „BRAK”), `brak` (ramka wokół
    brakującego miejsca), `kartka-leci`, `kartka-odbita` (z polem `krzyzyk` = słowo, na którym pojawia się krzyżyk),
    `napis` (duże słowo na środku), `licznik` (liczba od–do z `sufiks` i `podpis`).
  - `studio: true` – ciemne tło marki zamiast zdjęcia.
- **`mapa`** – mapa 3D z `video/src/Mapy.tsx`. Kolejne sceny z tą samą mapą tworzą jeden przelot kamery.
  Gotowe: `droga-wniosku` (remiza → sąd, wniosek przez internet) i `droga-opp` (statut → komisja → cztery zakazy →
  walne → KRS → odznaka OPP). Mapa reaguje na konkretne słowa lektora zapisane w jej kodzie – nowy temat zwykle
  wymaga nowej mapy (klocki w `video/src/Izo.tsx`: budynki, drogi, tabliczki, pionki, dokumenty, odznaka).
- **`studio: true`** – scena w studiu marki, zwykle z Druhem Paragrafem w pełnym planie.
- **`porada`** – karta „Porada Druha Paragrafa”: `wiersze: [{ "tekst": "…", "slowo": "…", "zloty": true }]`
  (wiersz wchodzi na słowie; najwyżej 3 krótkie wiersze).
- **`telefon: { "slowo": "…" }`** – telefon ze stroną doradztwodlaosp.pl wjeżdża na słowie.

Druh Paragraf (`"maskotka": true` na poziomie odcinka, potem `postac` w scenie):
- `plan`: `pelny` (gospodarz, środek), `obok` (z boku przy zdjęciu), `prawo`, `maly`, `brak`.
- `poza`: `tlumaczy`, `cieszy-sie`, `zaskoczony`, `ostrzega`, `mysli`, `wskazuje`.
- `gest`: `{ "slowo": "…", "plan": "…", "poza": "…", "ruch": "kreci" | "kiwa" | "podskok" }` – zmiana na słowie.
- Zasada: pełny plan na wejściu i wyjściu, wejście z boku w 1–2 kluczowych momentach, poza tym `brak`.
  Nie stawiaj go na naklejkach ani na karcie Porady.

Pozostałe zasady:
- `akcent`: 1–3 słowa zapisane dokładnie jak w `tekst` – wyświetlą się na złoto.
- `lektor`: skróty fonetycznie (KRS → „ka-er-es”, OSP → „o-es-pe”, OPP → „o-pe-pe”, 1,5% → „półtora procent”).
- Słowa-kotwice (`od`, `slowo`, `krzyzyk`) dopasowują się do słów z `tekst`: najpierw dokładnie, potem po początku słowa.
- Strefy bezpieczne: nic ważnego poniżej y=1440 ani na prawo od x=918 (przyciski Facebooka). Podgląd stref:
  props `"strefy": true`.
- Obrazy: realistyczne, bez napisów, w barwach marki (grafit, ciepłe złote światło), najlepiej pionowe 1024×1536.
  Opisy pisz po polsku. Obejrzyj każdy obraz (Read) przed użyciem; odrzuć te z napisami, zniekształconymi twarzami lub dłońmi.

## 3. Polecenia (w folderze `video/`)

```bash
npm run szkic -- <slug>     # szacunkowe czasy, gdy nie ma jeszcze lektora
npm run czasy -- <slug>     # dokładne czasy z lektor.mp3
npm run glos -- <slug>      # głos z ElevenLabs (wymaga klucza)
npm run obrazy -- <slug>    # obrazy z OpenAI (wymaga klucza)
npm run render -- <slug>    # out/<slug>.mp4 + out/<slug>-okladka.png
```

W chmurze render potrzebuje przeglądarki z obrazu: skrypt `render.mjs` sam podaje ścieżkę
`/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`.
Szybki podgląd: `npx remotion render RolkaOSP out/p.mp4 --props='{"odcinek":"<slug>"}' --scale=0.4 --concurrency=4
--browser-executable=<ścieżka>`; potem wytnij klatki ffmpeg-iem i obejrzyj je.

## 4. Sprawdzenie przed wysłaniem

Obejrzyj klatki z całego filmu (co ok. 2 s) i sprawdź: napisy mieszczą się i nic ich nie zasłania; nic ważnego
w strefach Facebooka; naklejki trafiają we właściwe miejsca zdjęcia; Druh Paragraf niczego nie zasłania;
pierwsza klatka działa jako okładka; film kończy się planszą. Potem przejdź 10 punktów z `ZASADY-FILMU.md`.
Wyślij MP4 (SendUserFile) i napisz wprost, czego nie dało się sprawdzić – dźwięku nie słyszysz, więc poproś
użytkownika o ocenę głośności muzyki i efektów.

## 5. Zapis

Commit (folder odcinka z obrazami i `lektor.mp3`; `out/` nie trafia do repozytorium) i push.

## Uwagi techniczne

- Sieć: `glos` i `obrazy` łączą się z api.elevenlabs.io i api.openai.com – działają dopiero, gdy użytkownik poda
  klucze w bezpiecznym formularzu środowiska.
- Fonty Montserrat są w `video/public/fonty` (render nie potrzebuje internetu).
- Muzyka i efekty w `video/public/dzwieki` są na razie syntetyczne (`skrypty/dzwieki.py`). Docelowo podkład
  z licencją (np. Pixabay) zapisany jako `public/dzwieki/podklad.mp3`.
- `NowyZarzad` (`video/src/Rolka.tsx`) i `video/src/Starsze.tsx` to stare wersje – nie używaj ich w nowych odcinkach.
