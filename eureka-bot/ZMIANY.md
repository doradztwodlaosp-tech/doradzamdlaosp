# Co zmieniło się względem Twojej wersji bota

## Bez zmian
- **`profiles.py`** — te same 12 profili, frazy i wzorce artykułów. Kalibracja profili
  jeszcze przed nami (na Twoich przykładowych PDF-ach).
- **Sposób wyszukiwania** — jak u Ciebie: każda fraza z profili jest wysyłana do EUREKI.
- **Limity** — przerwa 15 s (±30%) między zapytaniami, 15 minut czekania po 403/429.
- **Rejestr SQLite** (`db.py`) — te same tabele; dodana tylko nowa tabela `wyniki_biegu`
  (do raportów). Istniejąca baza nie jest ruszana.
- **Nazwy plików PDF** — `<data>_<sygnatura>_ID<id>.pdf`, jak w v6.

## Zmienione
| Co | Było | Jest | Dlaczego |
|---|---|---|---|
| Zakres dat | całe lata 2019..dziś | ostatnie 45 dni (`EUREKA_OKNO_DNI`) | archiwum już masz; bot ma łapać nowe |
| Frazy w profilach | szerokie, żeby nic nie pominąć | **bez zmian** — filtrujemy wyniki, nie frazy | profile mają łapać wszystko z dziedziny |
| Filtr przed pobraniem | brak | jeśli PRZEPISY powołują się **wyłącznie** na inne ustawy niż CIT/PIT (np. tylko VAT) → bez pobierania; lista w Excelu (arkusz „Pominięte – inna ustawa”) z linkiem | interpretacja wyłącznie z VAT nie może dotyczyć ulgi z CIT/PIT; puste PRZEPISY → pobieramy |
| Ocena trafności | regex na metadanych PRZEPISY; wszystko inne „do weryfikacji” i też pobierane | pełna treść PDF: liczba wzmianek artykułu i fraz, CIT/PIT czy VAT; wyliczenia „z zastrzeżeniem art. …” (cytat art. 7 ust. 2 CIT) nie liczą się | Twoje przykłady: interpretacje SSE/PSI złapane frazą „art. 24d” tylko przez ten cytat |
| Względem których profili oceniamy | profil, którego fraza znalazła | **wszystkie** profile; plik w folderze najsilniejszego dopasowania | fraza B+R często znajduje IP Box — ma trafić do IP Box, nie do odrzuconych |
| Data publikacji | brak | odczytywana z nagłówka PDF, w raporcie i rejestrze | API jej nie udostępnia, PDF tak |
| Foldery | wg roku | trafne: `<profil>/<rok>`; nietrafne: `_odrzucone/<profil>/<rok>`; estoński CIT osobno | żeby dało się sprawdzić odrzucone |
| Ta sama fraza w kilku profilach | wysyłana kilka razy | wysyłana raz | mniej zapytań do EUREKI |
| Raport | JSON + CSV + TXT dziennie | Excel na bieg: ulgi i estoński CIT osobno; arkusze Trafne / Odrzucone (z liczbą wzmianek i powodem) / Błędy | czytelność + materiał do kalibracji |
| Uruchamianie | ręcznie / Harmonogram zadań Windows | systemd na serwerze, sobota 00:00 | serwer |
| Ścieżki | `C:\Users\...\EUREKA` | `~/eureka-dane` (Linux) | serwer |

## Poprawione błędy
1. `--podglad` zapisywał interpretacje do bazy jako pobrane — prawdziwy bieg by ich potem nie pobrał.
   Teraz podgląd tylko wyszukuje i niczego nie zapisuje.
2. Blokada 403/429 wywracała bieg z błędem i zostawiała go w stanie „w toku”. Teraz bieg kończy
   się czysto ze statusem „przerwany”, raportem i mailem.
3. Pole `TEZA` = null wywracało bota (`TypeError`).
4. Pusta lista przepisów była wysyłana jako `"PRZEPISY": []` — strona EUREKA tego nie robi.
5. Kolumna `DATA_PUBLIKACJI` (nieistniejąca w API) usunięta z zapytania.

## Dodane
- `wysylka.py` — mail przez Gmail i kopia na Dysk Google (rclone).
- `sprawdz_api.py` — test na prawdziwej EUREKA (1 wyszukiwanie + 1 PDF).
- `uruchom.sh`, `serwer/` (usługa i harmonogram), `INSTALACJA.md`, testy w `tests/`.

## Usunięte
- `scraper.py`, `matcher.py` → zastąpione przez `przeglad.py` i `klasyfikator.py`.
- `migracja_v6.py`, `calosc.py`, `nauka.py` — niepotrzebne na serwerze.
- Opcje `--rok`, `--automatyczny`, `--raport`, plik `harmonogram.json` — zastąpione przez
  `--okno` / `--od` / `--do` i harmonogram systemd. `--profil` zostało.
