# Jak działa bot i co jest skąd

## Cel
Baza wiedzy dla doradcy podatkowego o ulgach podatkowych. Bot raz w tygodniu (sobota 00:00)
albo na żądanie wyszukuje w EUREKA nowe interpretacje z dziedziny każdego profilu, pobiera
PDF-y **tylko tych, które dotyczą ulg**, segreguje je po profilach (estoński CIT osobno),
robi streszczenia i wysyła raport na Gmaila, a pliki na Dysk Google.

## Przebieg jednego biegu
1. **Wyszukiwanie** — każda fraza z `profiles.py` (78 unikalnych fraz, szerokie celowo),
   z filtrem daty wydania z ostatnich 45 dni. Interpretacje znane z rejestru są pomijane.
2. **Ocena na metadanych, przed pobraniem** — Twój `matcher.py` + `tematy.py`, względem
   WSZYSTKICH profili:
   - **POTWIERDZONE** — artykuł ulgi w polu PRZEPISY (np. art. 30ca PIT → IP Box PIT, nawet
     jeśli znalazła go fraza B+R);
   - **DO WERYFIKACJI** — temat profilu w tezie / słowach kluczowych / zagadnieniach albo
     przepis pomocniczy (definicja B+R); także rekord bez czytelnego opisu;
   - **ODRZUCONE** — nic z powyższych (np. interpretacja VAT, w której pada „działalność
     badawczo-rozwojowa”). **Bez pobierania.** Zostaje wpis w rejestrze i wiersz w arkuszu
     „Odrzucone (bez PDF)”, żeby dało się sprawdzić, że nic nie ginie.
   - **wyjątek — frazy jednoznaczne** (`tematy.FRAZY_JEDNOZNACZNE`, np. „ryczałt od dochodów
     spółek”, „IP Box”, „ulga na robotyzację”): rekord znaleziony taką frazą nie jest odrzucany
     na metadanych, tylko trafia do DO WERYFIKACJI (chyba że sygnatura wskazuje VAT/akcyzę/PCC).
     Powód: interpretacja PIT o wypłacie zysku ze spółki na estońskim CIT miała w metadanych
     same przepisy PIT, a dotyczy estońskiego CIT.
3. **Pobranie PDF** każdej potwierdzonej i każdej do weryfikacji — plik zawsze leży u Ciebie.
4. **Ocena treści PDF** (`klasyfikator.py`) tylko dla DO WERYFIKACJI: liczy wzmianki
   artykułu ulgi (bez wyliczeń „z zastrzeżeniem art. …” z art. 7 ust. 2 CIT), fraz profilu
   (z odmianą), odwołania do CIT/PIT i VAT. Treść potwierdza → folder profilu jak
   potwierdzona. Nie potwierdza → folder `_do_weryfikacji/<profil>/<rok>`.
5. **Streszczenie** (`streszczenie.py`) z treści PDF: rozstrzygnięcie (prawidłowe /
   nieprawidłowe), pytania podatnika, początek stanu faktycznego, ocena KIS, konkluzja
   uzasadnienia, kluczowe zdania z artykułem ulgi.
6. **Raporty** — osobno ulgi i estoński CIT: Excel (Podsumowanie / Potwierdzone /
   Do weryfikacji / Odrzucone (bez PDF) / Błędy, ze streszczeniami) i czytelny plik
   `STRESZCZENIA_*.txt`. Mail ze streszczeniami i załącznikami, pliki na Dysk (rclone).

## Foldery
```
eureka-dane/
  Ulga B+R (badawczo-rozwojowa)/2026/…pdf        potwierdzone
  IP Box — PIT (…)/2026/…pdf
  _do_weryfikacji/<profil>/2026/…pdf             pobrane, treść nie potwierdza — oceń sam
  _raporty/RAPORT_<data>_bieg<id>_ulgi.xlsx
  _raporty/STRESZCZENIA_<data>_bieg<id>_ulgi.txt
  Estoński CIT/2026/…pdf                          osobne drzewo
  Estoński CIT/_do_weryfikacji/2026/…pdf
  Estoński CIT/_raporty/RAPORT_…_estonski_cit.xlsx, STRESZCZENIA_…txt
  _rejestr/eureka.sqlite3                         rejestr (nie trafia na Dysk)
```

## Skąd co pochodzi
| Plik | Źródło |
|---|---|
| `profiles.py` | Twój, bez zmian |
| `matcher.py`, `tematy.py` | Twoje z 12.11.2026; jedna zmiana w `matcher.py`: frazy wykluczające sprawdzane tylko w stopniu 2 (interpretacja z art. 28j w PRZEPISY to estoński CIT, nawet gdy teza wspomina ryczałt ewidencjonowany) |
| `db.py` | Twój z 12.11.2026 + tabela `wyniki_biegu` i dwie funkcje do raportów |
| `eureka_client.py` | Twój kształt żądań; przerwa 15 s, po 403/429 czekanie 15 min i jedna próba |
| `przeglad.py` | nowy: okno dat zamiast lat, spina kroki 1-5 (zastępuje `scraper.py` na serwerze) |
| `klasyfikator.py`, `streszczenie.py`, `reports.py`, `wysylka.py`, `main.py` | nowe |
| `scraper.py` (Twój, po latach) | nadal do uzupełniania archiwum na Twoim komputerze — nie wchodzi na serwer |

## Uruchamianie ręczne (na serwerze, z folderu `~/eureka-bot`)
```
./uruchom.sh                               # pełny bieg jak w sobotę (45 dni, wszystkie profile, raport, Dysk, mail)
./uruchom.sh --profil estonski_cit         # tylko wybrane profile
./uruchom.sh --okno 7                      # ostatnie 7 dni
./uruchom.sh --od 2026-10-01 --do 2026-10-31
./uruchom.sh --podglad --profil ulga_br    # tylko wyszukiwanie i werdykty matchera, nic nie pobiera
./uruchom.sh --bez-wysylki                 # bieg bez maila i Dysku
./uruchom.sh --tylko-raport 7              # odtwórz raporty i mail z biegu nr 7
./uruchom.sh --test-maila
./uruchom.sh sprawdz_api.py "IP Box" ip_box_pit   # test na żywej EUREKA: 1 wyszukiwanie + 1 PDF
sudo systemctl start eureka-bot.service    # bieg jak z harmonogramu, w tle; log: journalctl -u eureka-bot -f
```
Dwa biegi naraz się nie uruchomią (blokada w `_rejestr/bot.lock`).

## Progi oceny treści (do kalibracji na Twoich przykładach)
`EUREKA_PROG_ART=2`, `EUREKA_PROG_FRAZ_Z_ART=2`, `EUREKA_PROG_FRAZ=5` w `eureka.env`.
Materiał do kalibracji: arkusz „Do weryfikacji” (kolumny z liczbą wzmianek, Twoja ocena TAK/NIE)
i folder `_do_weryfikacji`.
