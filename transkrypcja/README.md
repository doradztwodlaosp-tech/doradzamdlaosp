# Transkrypcja nagrań z telefonu

Skrypt `transkrybuj.py` zamienia nagranie (mp3, m4a, wav...) na tekst z użyciem modelu Whisper large-v3.

## Instalacja (jednorazowo)

1. Python 3.10+ oraz ffmpeg (`winget install ffmpeg` / `brew install ffmpeg` / `sudo apt install ffmpeg`)
2. `pip install -r requirements.txt`

## Użycie

```bash
python transkrybuj.py nagranie.mp3
```

Wyniki pojawią się obok nagrania: `nagranie.txt`, `nagranie.srt`, `nagranie.json`
oraz `nagranie_do_sprawdzenia.txt` (fragmenty, które warto odsłuchać).

Przydatne opcje:

| Opcja | Kiedy użyć |
|---|---|
| `--slownik "Kowalski, OPP, KRS"` | nazwiska, nazwy i terminy – znacznie poprawia ich zapis |
| `--odszum` | wyraźny szum tła (ulica, wentylator) |
| `--mowcy --liczba-mowcow 2 --hf-token hf_...` | rozmowa kilku osób (wymaga `pip install pyannote.audio`) |
| `--model large-v3-turbo` | ok. 5x szybciej, minimalnie słabsza jakość |
| `--bez-czasow` | czysty tekst bez znaczników czasu |


## Szybkie uruchamianie

Wrzuć nagranie do podfolderu `Nagranie` (obok skryptu) i kliknij dwukrotnie `Transkrybuj.bat`
albo uruchom skrypt bez nazwy pliku:

```bash
python transkrybuj.py
```

Skrypt przetworzy wszystkie nagrania z folderu `Nagranie`, które nie mają jeszcze pliku `.txt`.
