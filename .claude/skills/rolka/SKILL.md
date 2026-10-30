---
name: rolka
description: Tworzy pionową rolkę (9:16, Facebook Reels) z Panem Naczelnikiem w stylu doradztwodlaosp.pl na podstawie scenariusza lub tematu. Użyj, gdy użytkownik wkleja scenariusz rolki, podaje temat odcinka albo pisze /rolka.
---

# Rolka z Panem Naczelnikiem

Użytkownik jest prawnikiem, nie informatykiem. Pisz po polsku, prostym językiem, krok po kroku.
Pytaj o zgodę przed instalowaniem czegokolwiek nowego. Nie proś o wklejanie kluczy API do czatu.

Projekt Remotion jest w folderze `video/`. Szablon: kompozycja `RolkaOSP` (`video/src/RolkaOSP.tsx`),
barwy i fonty marki: `video/src/marka.ts`. Szablonu nie zmieniaj dla pojedynczego odcinka.

## 1. Przygotuj odcinek

Nazwa odcinka: krótki slug bez polskich znaków, np. `nowy-zarzad`. Utwórz
`video/public/odcinki/<slug>/odcinek.json`:

```json
{
  "tytul": "Tytuł odcinka",
  "glos": "lektor.mp3",
  "cta": "Napiszcie w komentarzu",
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
- Jeśli użytkownik podał tylko temat, napisz scenariusz w stylu Pana Naczelnika (ciepło, po druhowsku,
  zaczyna od "Czołem, druhowie!", kończy odesłaniem do doradztwodlaosp.pl) i pokaż go do akceptacji,
  zanim wygenerujesz głos.
- Treść prawną (terminy, przepisy) sprawdź z użytkownikiem; nie wymyślaj przepisów.
- `lektor`: skróty i adresy zapisuj fonetycznie: KRS → "ka-er-es", doradztwodlaosp.pl → "doradztwo dla o-es-pe kropka pe-el".
- `akcent`: 1–3 kluczowe słowa sceny, zapisane dokładnie jak w `tekst` (wielkość liter i interpunkcja nie mają znaczenia).
  Wyświetlą się duże i czerwone.
- `prompt`: konkretna, realistyczna scena (miejsce, przedmiot, nastrój). Bez napisów na obrazie.
  Wpisz słowo "Naczelnik", gdy ma wystąpić postać – skrypt dołoży jej stały opis. Wspólny styl (granat, czerwień,
  zmierzch, kinowo) dokłada `video/skrypty/obrazy.mjs`.

## 2. Głos

Uruchamiaj polecenia w folderze `video/`.

- Jest `ELEVENLABS_API_KEY`: `npm run glos -- <slug>` (głos "Pan Naczelnik"; inny: zmienna `ELEVENLABS_VOICE`).
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
- Fonty Syne i DM Sans są w `video/public/fonty` (render nie potrzebuje internetu).
- Pierwszy test z rysowaną postacią to kompozycja `NowyZarzad` (`video/src/Rolka.tsx`), nie używaj jej do nowych odcinków.
