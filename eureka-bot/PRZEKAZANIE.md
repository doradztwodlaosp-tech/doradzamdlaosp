# Przekazanie wiedzy z budowy bota EUREKA (listopad 2026)

Ten plik jest dla nowej rozmowy z Claude (np. o bocie CBOSA). Zawiera wszystko,
co ustaliliśmy przy bocie EUREKA: cel, decyzje użytkownika, architekturę, wdrożenie
na serwerze i błędy, które wyszły dopiero na prawdziwych danych.

Kod bota EUREKA: repozytorium `doradztwodlaosp-tech/doradzamdlaosp`,
gałąź `claude/wonderful-meitner-mtq5au`, folder `eureka-bot/`.
Nowa sesja może go dołączyć do odczytu (narzędzie add_repo) i skopiować moduły.

---

## 1. Kim jest użytkownik i jak z nim pracować

- Doradca podatkowy. Buduje **bazę wiedzy dla doradcy podatkowego o ulgach podatkowych**
  (B+R, IP Box CIT/PIT, estoński CIT, robotyzacja, prototyp, innowacyjni pracownicy,
  prowzrostowa, termomodernizacyjna, konsolidacyjna, CSR, IPO). VAT i akcyza go nie interesują.
- Nie jest programistą. Pisze po polsku. Odpowiadamy po polsku.
- **Chce iść krok po kroku i rozumieć, co się zmienia.** Najgorzej przyjął sytuację, gdy
  przebudowałem bota bez jego zgody i nie było wiadomo, co zmieniłem. Zasady:
  - przed większą zmianą: opisz plan, poczekaj na zgodę;
  - po zmianie: napisz dokładnie, co zmieniłeś i dlaczego (tabela „było / jest / dlaczego”);
  - nie zmieniaj profili (fraz) bez jego decyzji.
- **Profile są szerokie celowo**: „nie pominąć żadnej interpretacji z dziedziny”. Problemem
  nie są frazy, tylko śmieci, które frazy łapią przy okazji (np. interpretacja VAT, w której
  kilka razy pada „działalność badawczo-rozwojowa”). Rozwiązanie: **filtrować wyniki, nie frazy.**
- **Limity serwera są święte.** Przerwa ~15 s między każdym zapytaniem i 15 minut czekania po
  403/429 to oficjalne zalecenia administratora (KIS/MF). Nie skracać, nie „optymalizować”.
- Chce **mieć pliki u siebie** (PDF-y pobrane, nie same linki) i **dobre streszczenie**, żeby
  od razu wiedzieć, co bot pobrał.
- Pracuje na Windowsie: FileZilla (SFTP) do plików, PowerShell + SSH do poleceń.
  Instrukcje dawaj jako gotowe polecenia do skopiowania, każde w osobnym bloku, i mów,
  **w którym oknie** je wpisać (serwer `root@…#` czy Windows `PS C:\…>`).
- Lubi dostać od razu plik do podmiany (wysłany jako załącznik) + polecenie do sprawdzenia.

## 2. Jak działa bot EUREKA (ostateczna wersja)

1. **Wyszukiwanie frazami z profili** (`profiles.py`, 78 unikalnych fraz), z filtrem daty
   wydania z ostatnich 45 dni. Ta sama fraza w kilku profilach idzie raz.
   EUREKA nie pozwala filtrować po dacie publikacji (filtr `DATA_REJESTRACJI` zwraca 0 —
   sprawdzone w DevTools), stąd okno 45 dni + deduplikacja po ID w rejestrze SQLite.
2. **Ocena na metadanych, przed pobraniem** (`matcher.py` + `tematy.py` — autorstwa
   użytkownika), względem WSZYSTKICH profili, nie tylko tego, którego fraza znalazła rekord:
   - POTWIERDZONE: artykuł ulgi w polu PRZEPISY (właściwa ustawa CIT/PIT);
   - DO_WERYFIKACJI: temat profilu w tezie/słowach kluczowych/zagadnieniach albo przepis
     pomocniczy (definicja B+R); także rekord bez czytelnego opisu;
   - ODRZUCONE: nic z powyższego → bez pobierania, wpis w rejestrze + arkusz „Odrzucone”;
   - **frazy jednoznaczne** (`tematy.FRAZY_JEDNOZNACZNE`): rekord znaleziony taką frazą
     (np. „ryczałt od dochodów spółek”, „IP Box”) nigdy nie jest odrzucany na metadanych —
     idzie do oceny treści. Powód: interpretacja PIT o wypłacie zysku ze spółki na estońskim
     CIT miała w metadanych same przepisy PIT.
   - sygnatura KIS wskazuje podatek: `.4010.` CIT, `.4011.` PIT, `.4012.`+ VAT/akcyza/PCC.
3. **Pobranie PDF** każdej potwierdzonej i do weryfikacji.
4. **Ocena pełnej treści PDF** (`klasyfikator.py`) dla DO_WERYFIKACJI: liczba wzmianek
   artykułu ulgi (bez wyliczeń „z zastrzeżeniem art. …” — cytat art. 7 ust. 2 CIT jest
   w setkach interpretacji i łapał frazę „art. 24d”), fraz profilu z odmianą, odwołań
   CIT/PIT vs VAT. Progi w `config.py`/`eureka.env` (`EUREKA_PROG_*`).
   Trafna → folder profilu; nie → `_do_weryfikacji/<profil>/<rok>`. Nic nie jest kasowane.
5. **Streszczenie z PDF** (`streszczenie.py`): rozstrzygnięcie (prawidłowe/nieprawidłowe),
   pytania podatnika, stan faktyczny, ocena KIS, konkluzja (zdania „Tym samym…”),
   kluczowe zdania z artykułem ulgi. Tylko część KIS, nigdy zdania wnioskodawcy.
6. **Raporty** (`reports.py`): Excel na bieg (Podsumowanie / Potwierdzone / Do weryfikacji /
   Odrzucone / Błędy, ze streszczeniami, kolumną „Twoja ocena”) + `STRESZCZENIA_*.txt`;
   **osobno ulgi i estoński CIT** (osobny folder i osobny raport dla estońskiego CIT —
   wymóg użytkownika).
7. **Wysyłka** (`wysylka.py`): mail przez Gmail (SMTP, hasło aplikacji) ze streszczeniami
   w treści i Excelami w załączniku; kopia na Dysk Google przez `rclone copy`
   (bez rejestru SQLite).
8. **Uruchamianie**: systemd timer (sobota 00:00) + ręcznie `./uruchom.sh` z opcjami
   `--profil`, `--okno N`, `--od/--do`, `--podglad`, `--bez-wysylki`, `--tylko-raport N`,
   `--test-maila`. Blokada przed dwoma biegami naraz (`fcntl`).

## 3. Co przenieść do bota CBOSA prawie 1:1

| Moduł EUREKA | Do CBOSA | Uwagi |
|---|---|---|
| `wysylka.py` (Gmail + rclone) | 1:1 | zmienić tylko nazwy zmiennych/prefiks, np. `CEBOSA_` |
| `reports.py` (Excel + STRESZCZENIA + mail HTML) | prawie 1:1 | inne kolumny: sygnatura, sąd, data orzeczenia, rodzaj (wyrok/postanowienie), skład |
| `main.py` (opcje, blokada, `--tylko-raport`) | prawie 1:1 | |
| `uruchom.sh`, `serwer/*.service`, `*.timer`, `eureka.env.przyklad` | 1:1 | inna godzina timera, żeby nie nakładać się z EUREKĄ |
| `db.py` (rejestr, dedup, biegi, wyniki_biegu) | prawie 1:1 | |
| `klasyfikator.py` (ocena treści, `bez_zastrzezen`) | do adaptacji | orzeczenia mają inną strukturę niż interpretacje |
| `streszczenie.py` | **do napisania od nowa** | sekcje orzeczenia: sentencja, uzasadnienie, „Naczelny Sąd Administracyjny zważył, co następuje” |
| `eureka_client.py`, `przeglad.py` | **inne** | CBOSA to strona HTML (orzeczenia.nsa.gov.pl), nie API JSON |
| `profiles.py`, `matcher.py`, `tematy.py` | do decyzji z użytkownikiem | orzeczenia też cytują przepisy — można użyć tych samych profili ulg |

Co wiadomo o CBOSA z wcześniejszego kodu użytkownika: skrobanie HTML z orzeczenia.nsa.gov.pl
(BeautifulSoup), formularz z polami typu `wszystkieSlowa`, `dataOd`; był problem
„serwer zrywa połączenie po zbyt wielu requestach bez sesji” — rozwiązany wspólną sesją HTTP;
z CBOSA pochodzi drabinka cooldownów 45/120/300 s. **Limitów CBOSA nie znamy — zapytać
użytkownika, zanim cokolwiek się uruchomi.**

## 4. Błędy, które wyszły dopiero na prawdziwych danych (nie powtarzać)

1. **Pola z API bywają listą** (EUREKA: `AUTOR` = `["Dyrektor KIS"]`) → SQLite: „type 'list'
   is not supported”. Normalizować pola tekstowe zaraz po pobraniu; w testach używać danych
   w kształcie z prawdziwego API.
2. **Streszczenie**: KIS czasem odstępuje od uzasadnienia (art. 14c Op) — brak nagłówka
   „Uzasadnienie…”, konkluzja brała „Podstawa prawna dla wydania interpretacji”. Kończyć sekcje
   na pouczeniach/podstawie prawnej; odfiltrować zdania wnioskodawcy i pytania.
3. **Znacznik pomocniczy „§”** przy dzieleniu na zdania zjadał prawdziwe „§” („art. 13 § 2a”).
   Używać `\x00`. Dodać „Ad.” do skrótów. Usuwać numery stron (osobne linie z cyfrą).
4. **Fraza artykułowa łapie cytaty** („art. 24d” w cytacie art. 7 ust. 2 CIT) → nie liczyć
   wyliczeń „z zastrzeżeniem art. …”; fraz artykułowych nie traktować jako jednoznacznych.
5. **Interpretacje PIT o estońskim CIT** (strona wspólnika) — profil „tylko CIT” je gubił.
6. **Podgląd (`--podglad`)** w starej wersji zapisywał do bazy → prawdziwy bieg pomijał.
   Podgląd nie może niczego zapisywać.
7. **Bieg w tle przez `nohup`**: Python buforuje wyjście do pliku → log pusty przez długi czas.
   `export PYTHONUNBUFFERED=1` w `uruchom.sh`.
8. **Zamknięcie okna SSH** przerywa `./uruchom.sh`; do długich biegów: `nohup … &` albo
   `systemctl start --no-block`.

## 5. Wdrożenie na serwerze (Mikrus, Ubuntu 24.04, użytkownik root)

Dane dostępowe serwera (host, port SSH) zna użytkownik — nie zapisujemy ich w repozytorium.

- Katalog domowy to `/root`. Bot EUREKA: kod `/root/eureka-bot`, dane `/root/eureka-dane`.
  Dla CBOSA proponuj osobno: `/root/cebosa-bot` i `/root/cebosa-dane`.
- Instalacja: `apt install -y python3 python3-venv`, `python3 -m venv venv`,
  `./venv/bin/pip install -r requirements.txt`.
- Ustawienia i sekrety w `eureka.env` (`chmod 600`), nigdy w repozytorium.
  **Gmail**: hasło aplikacji (wymaga weryfikacji dwuetapowej) — to samo konto i hasło
  aplikacji można użyć w drugim bocie.
- **Dysk Google**: rclone już skonfigurowany na serwerze jako remote `gdrive`
  (zakres `drive.file`). Drugi bot używa tego samego remote, innego folderu,
  np. `EUREKA_RCLONE_CEL`-odpowiednik = `gdrive:CEBOSA`. Nie trzeba ponownie logować.
- **systemd**: pliki usług pisane wprost w `/etc/systemd/system/` (heredoc `cat > … <<'EOF'`),
  `User=root`, `WorkingDirectory=/root/…`, `EnvironmentFile=/root/…/….env`.
  Strefa czasowa ustawiona na `Europe/Warsaw`. Godzinę zmienia się w `OnCalendar=`
  + `systemctl daemon-reload && systemctl restart …timer`.
- Pułapki z sesji wdrożenia:
  - polecenia dla Windowsa wpisywane w oknie serwera i odwrotnie — zawsze mówić, które okno;
  - w nano przy zapisie wpisało się polecenie w pole nazwy pliku → instrukcja Ctrl+C,
    Ctrl+O, sprawdzić nazwę, Enter, Ctrl+X;
  - w `.env` zginęło `=` przy kluczu → `uruchom.sh` z `set -e` przerywał start;
    naprawa poleceniem `sed`, a nie ręczną edycją;
  - rclone: przy `config_token>` trzeba wkleić linię `{"access_token":…}`, nie ścieżkę;
  - FileZilla: ukryte pliki (`.env`) — Serwer → Wymuś pokazywanie ukrytych plików.

## 6. Kolejność pracy, która się sprawdziła

1. Przegląd wgranego kodu użytkownika → lista błędów, bez zmian.
2. Uzgodnienie celu i decyzji (co wyszukiwać, co odsiewać) — pytać, nie zakładać.
3. Test na żywym serwisie jednym skryptem (`sprawdz_api.py`: 1 wyszukiwanie + 1 dokument),
   wynik od użytkownika → dopiero wtedy reszta. Z sesji Claude serwisy MF/NSA są zwykle
   niedostępne (proxy), więc wszystko na żywo uruchamia użytkownik.
4. Podgląd jednego profilu (`--podglad`), potem mały prawdziwy bieg (`--okno 14`,
   jeden profil, `--bez-wysylki`), potem Gmail, Dysk, harmonogram, pełny bieg w tle.
5. Każdy błąd z serwera → test, który go odtwarza, poprawka, plik do podmiany.

## 7. Otwarte sprawy w bocie EUREKA

- Brakujące ulgi bez profilu (bot je słusznie odrzuca): ulga na złe długi (art. 18f CIT,
  art. 26i PIT — 8 interpretacji w 45 dniach), ulga prorodzinna (art. 27f PIT), SSE/PSI.
- Kopia rejestru `eureka.sqlite3` na Dysk (obecnie tylko na serwerze).
- Połączenie dużej lokalnej bazy użytkownika (~25 tys. interpretacji) z rejestrem na serwerze.
- Kalibracja progów oceny treści na arkuszach „Do weryfikacji” z kolejnych biegów.
