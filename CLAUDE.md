# Projekt: rolki „Doradztwo dla OSP” (doradztwodlaosp.pl)

Właściciel: prawnik (nie programista). **Pisz po polsku, prostym językiem, krok po kroku.** Przed instalacją czegokolwiek pytaj o zgodę. Nie proś o wklejanie kluczy API na czacie. Nie twórz PR bez prośby. Nie obchodź blokad sieci ani odmów systemu – wyjaśnij i zapytaj.

## Cel i marka
Pionowe rolki (1080×1920, 30 fps) na Facebooka: usługi prawne dla OSP i strażaków. Zasięg → obserwujący. Ton: poważny, ekspercki, zaufanie. Kolory: grafit #15161B, złoto #DAA73C (na jasnym #A8781A), kremowe tło #F2ECE1, Montserrat. Hasło: „Pomagamy tym, którzy pomagają innym.” Telefon: 720 868 902. Bez twarzy autora, bez Druha Paragrafa.

## Stałe zasady każdej rolki
1. **Plansza końcowa** zawsze ta sama (`PlanszaJasna` w `video/src/RolkaOSP.tsx`).
2. **Hasło u góry sceny** (chwytliwe, jedno słowo na złoto) + **złote napisy lektora na dole** (`video/src/NapisyLektora.tsx`), nad czarną plakietką „§ DORADZTWO DLA OSP”.
3. Obrazy: realne zdjęcia wycięte (wóz), prawdziwe strony ustaw z Sejmu ze złotym podkreśleniem i zbliżeniem, ilustracje w stylu marki; **nie zdjęcia remiz** (właściciel nie lubi), 3D/ilustracje.
4. Bez herbu gminy i nazwy miejscowości na wozie; tablica rejestracyjna zamazana.
5. Zdjęcia CC BY: podać autora w opisie (`video/marka/ZRODLA-ZDJEC.md`).

## Gdzie co jest (wszystko w `video/`)
- Aktualna wzorcowa rolka: kompozycja `RolkaFoto` (`src/RolkaFoto.tsx`), render: `npx remotion render RolkaFoto out/x.mp4 --muted --crf=18 --concurrency=4 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --gl=swangle --timeout=180000` (~6 min). Ostatni plik: `out/rolka-foto-v5.mp4` (nie w git).
- Dane odcinka (scenariusz, czasy słów): `public/odcinki/kim-jest-strazak/odcinek.json`. Czasy są robocze, **po nagraniu lektora przeliczyć**: `npm run czasy -- <slug>`.
- Wycięcia wozu: `public/foto/woz-bok-wyciety.png`, `woz-przod-wyciety.png`; skrypty ręcznych obrysów `skrypty/wytnij_bok.py`, `wytnij_przod.py`.
- Ustawy z Sejmu: `public/foto/ustawy/` (API `https://api.sejm.gov.pl/eli/acts/DU/<rok>/<poz>/text.pdf`).
- Mapa Polski: `src/MapaPolski.tsx` (uproszczony obrys, punkty losowe). Ilustracje remizy i filaru: `src/Ilustracje.tsx`.
- Blender (pip `bpy`, wolny render CPU ~14 s/klatka): `blender/` (starsza droga, model wozu Scania `woz_scania.py`).
- Przewodnik marki i zasady: `marka/PRZEWODNIK.md`, `marka/ZDJECIA-INSTRUKCJA.md`; kampania: `scenariusze/kampania-propozycja.md`; umiejętność `.claude/skills/rolka/SKILL.md`.
- Remotion + Chromium: bez internetu dla Chrome; użyj ścieżki lokalnej jak wyżej.

## Co jeszcze brakuje
- Lektor (właściciel nagra w ElevenLabs) i muzyka/efekty (serwisy z dźwiękiem zwracają 403 z tego środowiska).
- Logo marki (PNG), zdjęcie wozu z tyłu, nowoczesna remiza 3D, biblioteka obrazów 3D.
- Weryfikacja prawna treści przez właściciela (m.in. liczba 16 000, nowelizacje Prawa o stowarzyszeniach 2026).
- Canva: usuwanie tła wymaga planu płatnego; OpenCV nie zainstalowane (system zablokował `npm i`/pip bez zgody).
- Schemat produkcji kolejnych rolek z jednego tematu (plan w kampanii).

## Sieć
Dozwolone przez właściciela: Poly Haven, ambientCG, Openverse/Wikimedia (zdjęcia), api.sejm.gov.pl, eli.gov.pl, isap.sejm.gov.pl, Canva. Sprawdzaj `curl` przed założeniem, że coś działa.
