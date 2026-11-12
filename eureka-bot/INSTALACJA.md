# Bot EUREKA — instalacja na serwerze (Ubuntu)

Poniżej `TWOJ_UZYTKOWNIK` to nazwa użytkownika, którym logujesz się na serwer
(tym samym, co w FileZilli). Polecenia wpisujesz w terminalu serwera
(SSH, np. PuTTY albo `ssh uzytkownik@serwer` w Windows Terminal).

## 1. Wgranie plików (FileZilla)

1. Połącz się z serwerem w FileZilli (protokół **SFTP**).
2. Po prawej stronie wejdź do `/home/TWOJ_UZYTKOWNIK/`.
3. Przeciągnij cały folder `eureka-bot` (z plikami `main.py`, `config.py` itd.).

## 2. Python i biblioteki (jednorazowo)

```bash
sudo apt update && sudo apt install -y python3 python3-venv
```

```bash
cd ~/eureka-bot && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
```

```bash
chmod +x ~/eureka-bot/uruchom.sh
```

## 3. Ustawienia

```bash
cp ~/eureka-bot/serwer/eureka.env.przyklad ~/eureka-bot/eureka.env && chmod 600 ~/eureka-bot/eureka.env
```

```bash
nano ~/eureka-bot/eureka.env
```

Uzupełnij adresy Gmail (hasło aplikacji w kroku 5). Zapis w nano: `Ctrl+O`, `Enter`, wyjście: `Ctrl+X`.
`chmod 600` sprawia, że plik z hasłem może czytać tylko Twój użytkownik.

## 4. Test na prawdziwej EUREKA (najważniejszy krok)

```bash
~/eureka-bot/uruchom.sh sprawdz_api.py
```

Dwa żądania (wyszukiwanie „art. 18d” i jeden PDF), nic nie zapisuje. **Wyślij mi wynik** —
pokaże, jak wygląda pole `PRZEPISY`, czy z PDF-a da się odczytać tekst i jak bot
ocenił tę interpretację. Inną frazę/profil sprawdzisz tak:

```bash
~/eureka-bot/uruchom.sh sprawdz_api.py "IP Box" ip_box_pit
```

Potem podgląd jednego profilu (tylko wyszukiwanie, nic nie pobiera i nie zapisuje):

```bash
~/eureka-bot/uruchom.sh --podglad --profil ulga_br
```

## 5. Gmail — hasło aplikacji

1. Konto Google, z którego mają wychodzić maile → **Bezpieczeństwo** →
   włącz **Weryfikację dwuetapową** (jeśli nie jest włączona).
2. Wejdź na https://myaccount.google.com/apppasswords, nazwij np. „bot EUREKA”, kliknij **Utwórz**.
3. Skopiuj 16-znakowe hasło **bez spacji** do `EUREKA_SMTP_HASLO=` w `eureka.env`.
   Nie wklejaj go nigdzie indziej (ani do czatu).
4. Test:

```bash
~/eureka-bot/uruchom.sh --test-maila
```

## 6. Dysk Google — rclone

Instalacja na serwerze:

```bash
sudo apt install -y rclone
```

Serwer nie ma przeglądarki, więc logowanie do Google robi się na komputerze z Windows:

1. Na Windows pobierz rclone (https://rclone.org/downloads/, wersja Windows), rozpakuj.
2. Na serwerze uruchom `rclone config` i odpowiadaj:
   - `n` (nowy zdalny), nazwa: `gdrive`
   - typ: `drive` (Google Drive)
   - `client_id` i `client_secret`: zostaw puste (Enter)
   - `scope`: wybierz **`drive.file`** (rclone widzi tylko pliki, które sam utworzył — bezpieczniej)
   - pozostałe pytania: Enter
   - „Use web browser to automatically authenticate?”: **`n`**
3. rclone pokaże polecenie w stylu `rclone authorize "drive" "..."`. Uruchom je na
   **Windows** (w folderze z rclone.exe, w PowerShell), zaloguj się w przeglądarce, a otrzymany
   token wklej z powrotem na serwerze.
4. Test i utworzenie folderu:

```bash
rclone mkdir gdrive:EUREKA && rclone lsd gdrive:
```

5. Na https://drive.google.com znajdź folder **EUREKA**, kliknij **Udostępnij** i dodaj
   osoby, które mają mieć dostęp. Link do folderu wpisz w `EUREKA_DRIVE_LINK=` w `eureka.env`.

## 7. Pierwszy prawdziwy bieg

```bash
~/eureka-bot/uruchom.sh
```

Po zakończeniu:
- potwierdzone PDF-y: `~/eureka-dane/<profil>/<rok>/`, estoński CIT: `~/eureka-dane/Estoński CIT/<rok>/`
- do weryfikacji (pobrane, treść nie potwierdza tematu): `~/eureka-dane/_do_weryfikacji/<profil>/<rok>/`
- raporty Excel i pliki STRESZCZENIA: `~/eureka-dane/_raporty/` i `~/eureka-dane/Estoński CIT/_raporty/`
- kopia wszystkiego na Dysku, mail z podsumowaniem.

Pierwszy bieg sprawdza 45 dni wstecz, więc pobierze więcej (limit 400 PDF-ów na bieg,
przy przerwach 15 s to ok. 2 godziny). Kolejne biegi pobierają tylko to, czego jeszcze nie ma.

## 8. Automatyczne uruchamianie (sobota 00:00)

Wstaw swoją nazwę użytkownika do plików usługi i zainstaluj je:

```bash
cd ~/eureka-bot/serwer && sed -i "s/TWOJ_UZYTKOWNIK/$USER/g" eureka-bot.service
```

```bash
sudo cp ~/eureka-bot/serwer/eureka-bot.service ~/eureka-bot/serwer/eureka-bot.timer /etc/systemd/system/
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now eureka-bot.timer
```

Sprawdzenie, kiedy następny bieg:

```bash
systemctl list-timers eureka-bot.timer
```

Podgląd logów ostatniego biegu:

```bash
journalctl -u eureka-bot.service -n 100 --no-pager
```

Uruchomienie biegu od razu (poza harmonogramem):

```bash
sudo systemctl start eureka-bot.service
```

Upewnij się, że strefa czasowa serwera to Polska (`timedatectl`); jeśli nie:

```bash
sudo timedatectl set-timezone Europe/Warsaw
```

## Jak działa bot

Patrz `ZMIANY.md` (przebieg biegu, foldery, uruchamianie ręczne).
