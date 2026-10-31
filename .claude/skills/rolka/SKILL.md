---
name: rolka
description: Tworzy pionową rolkę (9:16, Facebook Reels) z Panem Prawnikiem w stylu doradztwodlaosp.pl na podstawie scenariusza lub tematu. Użyj, gdy użytkownik wkleja scenariusz rolki, podaje temat odcinka albo pisze /rolka.
---

# Rolka z Panem Prawnikiem

Użytkownik jest prawnikiem, nie informatykiem. Pisz po polsku, prostym językiem, krok po kroku.
Pytaj o zgodę przed instalowaniem czegokolwiek nowego. Nie proś o wklejanie kluczy API do czatu.

Projekt Remotion jest w folderze `video/`. Szablon: kompozycja `RolkaOSP` (`video/src/RolkaOSP.tsx`),
barwy i fonty marki: `video/src/marka.ts`. Szablonu nie zmieniaj dla pojedynczego odcinka.

## 0. Przeczytaj wytyczne marki

Zanim cokolwiek zrobisz, przeczytaj `video/marka/BRANDBOOK.md`, `video/marka/POSTAC.md`,
`video/marka/MOODBOARD.md` (i obrazy w `video/marka/moodboard/`) oraz `video/marka/SLOWNIK-ANIMACJI.md`.
Trzymaj się ich. Gdy użytkownik używa nazwy ze słownika (np. „najazd”, „przenikanie”), zrób dokładnie ten efekt.

## 1. Przygotuj odcinek

Nazwa odcinka: krótki slug bez polskich znaków, np. `nowy-zarzad`. Utwórz
`video/public/odcinki/<slug>/odcinek.json`:

```json
{
  "tytul": "Tytuł odcinka",
  "glos": "lektor.mp3",
  "cta": "Napiszcie w komentarzu",
  "naczelnik": true,
  "sceny": [
    {
      "tekst": "Zdanie na ekranie (poprawna pisownia, np. KRS)",
      "lektor": "Zdanie dla lektora, tylko gdy trzeba zapisać wymowę, np. ka-er-es",
      "akcent": ["słowo"],
      "prompt": "Opis obrazu sceny po angielsku"
    }
  ]
}
```

Zasady:
- Jedna scena = jedno zdanie lub krótka myśl (zwykle 8–12 scen, rolka 30–60 s).
- Postać: Pan Prawnik – doświadczony strażak OSP (ok. 45–50 lat) i prawnik od przepisów ochrony przeciwpożarowej,
  działalności OSP i praw strażaków ochotników. Spokojny, opanowany, rzeczowy i konkretny; mówi wiedzą i argumentami,
  nie emocjami. Tłumaczy prawo przystępnie, prostuje nieporozumienia, staje w obronie ochotników. Budzi zaufanie.
- Jeśli użytkownik podał tylko temat, napisz scenariusz w stylu Pana Prawnika (rzeczowo, po druhowsku,
  zaczyna od "Czołem, druhowie!", kończy odesłaniem do doradztwodlaosp.pl) i pokaż go do akceptacji,
  zanim wygenerujesz głos.
- Treść prawną (terminy, przepisy) sprawdź z użytkownikiem; nie wymyślaj przepisów.
- `lektor`: skróty i adresy zapisuj fonetycznie: KRS → "ka-er-es", doradztwodlaosp.pl → "doradztwo dla o-es-pe kropka pe-el".
- `naczelnik`: `true` pokazuje rysowaną postać Pana Prawnika (nazwa pola została z pierwszej wersji) (mundur galowy, medale) na dole kadru; usta ruszają się
  w rytm głosu, macha na powitanie i kiwa głową na końcu. Ustaw `false`, gdy obrazy same pokazują postać.
- `ilustracja` (opcjonalnie): animowana ilustracja na karcie nad postacią. Dostępne: remiza, sala, koniec,
  lista-do-sadu, odrzucenie, laptop-krs, teczka, brak-w-protokole, kalendarz-7-dni, plansza-zarzad-protokol-wpis, adres
  (`video/src/Sceny.tsx`, mapa `ILUSTRACJE`). Gdy żadna nie pasuje do zdania, dopisz nową ilustrację w tym pliku
  (prosty SVG w barwach marki, animacja od początku sceny) i dodaj ją do mapy.
- `akcent`: 1–3 kluczowe słowa sceny, zapisane dokładnie jak w `tekst` (wielkość liter i interpunkcja nie mają znaczenia).
  Wyświetlą się duże i czerwone.
- `prompt` (po polsku): konkretna, realistyczna scena (miejsce, przedmiot, nastrój). Bez napisów na obrazie.
  Zacznij prompt od "Pan Prawnik", gdy ma wystąpić postać – skrypt dołoży jej stały opis. Wspólny styl (granat, czerwień,
  zmierzch, kinowo) dokłada `video/skrypty/obrazy.mjs`.

## 2. Głos

Uruchamiaj polecenia w folderze `video/`.

- Jest `ELEVENLABS_API_KEY`: `npm run glos -- <slug>` (głos "Pan Prawnik" – wystarczy fragment nazwy; inny: zmienna `ELEVENLABS_VOICE`).
  Zapisuje `lektor.mp3` oraz dokładne czasy scen i słów.
- Użytkownik przysłał gotowe MP3: skopiuj je jako `video/public/odcinki/<slug>/lektor.mp3`,
  potem `npm run czasy -- <slug>`. Sprawdź wypisane czasy: każda scena powinna zaczynać się od właściwego zdania.
- Brak klucza i brak MP3: daj użytkownikowi tekst do wklejenia w ElevenLabs (pole `lektor` lub `tekst` każdej sceny,
  oddzielone pustą linią) i poproś o plik MP3.

## 3. Obrazy

- Jest `OPENAI_API_KEY`: `npm run obrazy -- <slug>`. Gotowe obrazy są pomijane; żeby wygenerować jeden ponownie,
  usuń jego plik `sNN.png`.
- Brak klucza: daj użytkownikowi prompty (z dopiskiem stylu z `obrazy.mjs`) do wklejenia w generator obrazów
  i poproś o pliki; zapisz je jako `s01.png`, `s02.png`… i wpisz nazwy w pole `obraz` scen.
- Bez obrazów szablon pokaże ciemne tło marki – można tak zrobić szybki podgląd.

Obejrzyj każdy obraz (Read) przed renderem. Odrzuć te z napisami, zniekształconymi twarzami lub dłońmi.

## 4. Render i sprawdzenie

```bash
npm run render -- <slug>
```

Wynik: `video/out/<slug>.mp4` (1080×1920, 30 kl./s). Wyciągnij kilka klatek ffmpeg-iem i obejrzyj je
(czy napisy mieszczą się w kadrze, czy obrazy pasują do zdań). Potem wyślij MP4 użytkownikowi (SendUserFile).

## 5. Zapis

Zrób commit (folder odcinka razem z obrazami i lektor.mp3; `out/` nie trafia do repozytorium) i wypchnij go.
Jeśli wypchnięcie się nie uda, wyślij użytkownikowi kopię ZIP (`git archive`).

## Uwagi techniczne

- Sieć: skrypty łączą się z api.elevenlabs.io i api.openai.com (muszą być dozwolone w ustawieniach sieci środowiska).
- Font DM Sans jest w `video/public/fonty` (render nie potrzebuje internetu).
- Pierwszy test z rysowaną postacią to kompozycja `NowyZarzad` (`video/src/Rolka.tsx`), nie używaj jej do nowych odcinków.
