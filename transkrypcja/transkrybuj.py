#!/usr/bin/env python3
"""
Transkrypcja nagrań z telefonu (MP3 / M4A / WAV ...) w wysokiej jakości.

Co robi skrypt:
  1. Przygotowuje dźwięk przez ffmpeg: mono 16 kHz, filtr górnoprzepustowy
     (usuwa buczenie i stuki), normalizacja głośności, opcjonalnie łagodne
     odszumianie. Whisper i tak pracuje na 16 kHz mono, więc nic nie tracimy.
  2. Transkrybuje modelem Whisper large-v3 (faster-whisper) z językiem
     polskim, beam search i filtrem VAD (pomija ciszę, ogranicza "halucynacje").
  3. Opcjonalnie rozpoznaje mówców (pyannote) – "Mówca 1", "Mówca 2" ...
  4. Zapisuje wynik jako .txt (czytelny tekst ze znacznikami czasu),
     .srt (napisy) oraz .json (pełne dane, także czasy słów).

Przykłady:
  python transkrybuj.py nagranie.mp3
  python transkrybuj.py nagranie.mp3 --odszum
  python transkrybuj.py nagranie.mp3 --slownik "OPP, KRS, sprawozdanie merytoryczne"
  python transkrybuj.py nagranie.mp3 --mowcy --hf-token hf_xxx
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from dataclasses import dataclass, field
from pathlib import Path

# Na Windows bez trybu dewelopera huggingface_hub wypisuje mylące ostrzeżenia o symlinkach.
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


# --------------------------------------------------------------------------- #
# Struktury danych
# --------------------------------------------------------------------------- #
@dataclass
class Slowo:
    start: float
    end: float
    tekst: str
    pewnosc: float


@dataclass
class Segment:
    start: float
    end: float
    tekst: str
    slowa: list[Slowo] = field(default_factory=list)
    mowca: str | None = None


# --------------------------------------------------------------------------- #
# 1. Przygotowanie audio
# --------------------------------------------------------------------------- #
def przygotuj_audio(wejscie: Path, wyjscie: Path, odszum: bool) -> None:
    """Konwertuje plik do WAV 16 kHz mono i poprawia jakość pod rozpoznawanie mowy."""
    if shutil.which("ffmpeg") is None:
        sys.exit(
            "Brak programu ffmpeg. Zainstaluj go:\n"
            "  Windows: winget install ffmpeg\n"
            "  macOS:   brew install ffmpeg\n"
            "  Linux:   sudo apt install ffmpeg"
        )

    filtry = [
        "highpass=f=80",          # usuwa buczenie, stuki, szum wiatru o niskiej częstotliwości
        "lowpass=f=7800",         # powyżej ~8 kHz i tak nie ma informacji dla 16 kHz
    ]
    if odszum:
        # Łagodne odszumianie FFT. Celowo delikatne – agresywne odszumianie
        # zniekształca głoski i POGARSZA wynik Whispera.
        filtry.append("afftdn=nr=12:nf=-30:tn=1")
    filtry += [
        "dynaudnorm=f=250:g=15:p=0.9:m=10",  # wyrównuje cichych i głośnych mówców
        "loudnorm=I=-18:TP=-2:LRA=11",       # docelowa głośność
    ]

    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(wejscie),
        "-vn",                      # ignoruj ewentualną okładkę/wideo
        "-af", ",".join(filtry),
        "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le",
        str(wyjscie),
    ]
    wynik = subprocess.run(cmd, capture_output=True, text=True)
    if wynik.returncode != 0:
        sys.exit(f"ffmpeg zgłosił błąd:\n{wynik.stderr}")


# --------------------------------------------------------------------------- #
# 2. Transkrypcja
# --------------------------------------------------------------------------- #
def wybierz_urzadzenie(wymuszone: str) -> tuple[str, str]:
    """Zwraca (device, compute_type) – GPU jeśli dostępne, inaczej CPU."""
    if wymuszone == "cpu":
        return "cpu", "int8"
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass
    if wymuszone == "cuda":
        sys.exit("Wybrano --urzadzenie cuda, ale nie wykryto karty NVIDIA z CUDA.")
    return "cpu", "int8"


def transkrybuj(
    plik_wav: Path,
    model_nazwa: str,
    jezyk: str | None,
    slownik: str | None,
    urzadzenie: str,
) -> tuple[list[Segment], dict]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Brak biblioteki faster-whisper. Uruchom: pip install -r requirements.txt")

    device, compute_type = wybierz_urzadzenie(urzadzenie)
    print(f"→ Ładuję model '{model_nazwa}' ({device}, {compute_type}). "
          "Za pierwszym razem model zostanie pobrany (~3 GB).")
    model = WhisperModel(
        model_nazwa,
        device=device,
        compute_type=compute_type,
        cpu_threads=os.cpu_count() or 4,
    )

    # Podpowiedź na start: pokazuje modelowi styl (polska interpunkcja,
    # wielkie litery) oraz trudne nazwy własne / fachowe słownictwo.
    podpowiedz = "Poniżej znajduje się dokładna transkrypcja rozmowy, z poprawną interpunkcją i polskimi znakami."
    if slownik:
        podpowiedz += f" Występujące nazwy i terminy: {slownik}."

    # Wczytujemy WAV samodzielnie (16 kHz, mono, 16 bit) zamiast przez bibliotekę "av",
    # bo niektóre jej wersje są niezgodne z faster-whisper (błąd "metadata_errors").
    import numpy as np

    with wave.open(str(plik_wav), "rb") as w:
        probki = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    audio = probki.astype(np.float32) / 32768.0

    segmenty_gen, info = model.transcribe(
        audio,
        language=jezyk,
        task="transcribe",
        beam_size=5,                    # dokładniej niż wyszukiwanie zachłanne
        best_of=5,
        temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],  # powrót do próbkowania, gdy dekodowanie "utknie"
        initial_prompt=podpowiedz,
        condition_on_previous_text=False,  # zapobiega zapętlaniu się i powtórzeniom
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        no_speech_threshold=0.6,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=400,          # zapas, by nie ucinać początków/końców słów
        ),
    )

    print(f"→ Język: {info.language} (pewność {info.language_probability:.0%}), "
          f"długość nagrania: {formatuj_czas(info.duration)}")

    segmenty: list[Segment] = []
    for s in segmenty_gen:  # generator – transkrypcja dzieje się tutaj
        slowa = [
            Slowo(w.start, w.end, w.word, w.probability) for w in (s.words or [])
        ]
        segmenty.append(Segment(s.start, s.end, s.text.strip(), slowa))
        postep = min(s.end / info.duration, 1.0) if info.duration else 0
        print(f"\r  [{postep:6.1%}] {formatuj_czas(s.end)} / {formatuj_czas(info.duration)}",
              end="", flush=True)
    print()

    meta = {
        "jezyk": info.language,
        "pewnosc_jezyka": info.language_probability,
        "dlugosc_s": info.duration,
        "model": model_nazwa,
        "urzadzenie": device,
    }
    return segmenty, meta


# --------------------------------------------------------------------------- #
# 3. Rozpoznawanie mówców (opcjonalne)
# --------------------------------------------------------------------------- #
def rozpoznaj_mowcow(
    plik_wav: Path,
    segmenty: list[Segment],
    hf_token: str | None,
    liczba_mowcow: int | None,
) -> list[Segment]:
    try:
        import torch
        from pyannote.audio import Pipeline
    except ImportError:
        sys.exit("Rozpoznawanie mówców wymaga: pip install pyannote.audio")

    token = hf_token or os.environ.get("HF_TOKEN")
    if not token:
        sys.exit(
            "Rozpoznawanie mówców wymaga tokenu Hugging Face (--hf-token lub zmienna HF_TOKEN).\n"
            "Zaakceptuj warunki modelu na https://huggingface.co/pyannote/speaker-diarization-3.1"
        )

    print("→ Rozpoznaję mówców (pyannote)...")
    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=token)
    if torch.cuda.is_available():
        pipeline.to(torch.device("cuda"))

    kwargs = {"num_speakers": liczba_mowcow} if liczba_mowcow else {}
    diaryzacja = pipeline(str(plik_wav), **kwargs)
    tury = [(t.start, t.end, mowca) for t, _, mowca in diaryzacja.itertracks(yield_label=True)]

    # Ładne nazwy w kolejności pojawienia się: SPEAKER_00 -> Mówca 1
    nazwy: dict[str, str] = {}
    for _, _, m in sorted(tury):
        nazwy.setdefault(m, f"Mówca {len(nazwy) + 1}")

    def mowca_dla(start: float, end: float) -> str | None:
        nakladanie: dict[str, float] = {}
        for ts, te, m in tury:
            n = min(end, te) - max(start, ts)
            if n > 0:
                nakladanie[m] = nakladanie.get(m, 0) + n
        if not nakladanie:
            return None
        return nazwy[max(nakladanie, key=nakladanie.get)]

    # Przypisujemy mówcę do każdego SŁOWA, a potem dzielimy segmenty tam,
    # gdzie zmienia się mówca – dokładniej niż przypisanie całego segmentu.
    wynik: list[Segment] = []
    for seg in segmenty:
        if not seg.slowa:
            seg.mowca = mowca_dla(seg.start, seg.end)
            wynik.append(seg)
            continue
        biezacy: Segment | None = None
        for w in seg.slowa:
            m = mowca_dla(w.start, w.end) or (biezacy.mowca if biezacy else None)
            if biezacy is None or m != biezacy.mowca:
                if biezacy:
                    biezacy.tekst = "".join(x.tekst for x in biezacy.slowa).strip()
                    wynik.append(biezacy)
                biezacy = Segment(w.start, w.end, "", [], m)
            biezacy.slowa.append(w)
            biezacy.end = w.end
        if biezacy:
            biezacy.tekst = "".join(x.tekst for x in biezacy.slowa).strip()
            wynik.append(biezacy)
    return wynik


# --------------------------------------------------------------------------- #
# 4. Zapis wyników
# --------------------------------------------------------------------------- #
def formatuj_czas(sek: float, srt: bool = False) -> str:
    ms = int(round(sek * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    if srt:
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    return f"{h:02d}:{m:02d}:{s:02d}"


def zapisz_txt(segmenty: list[Segment], sciezka: Path, ze_znacznikami: bool) -> None:
    """Łączy segmenty w akapity: nowy akapit przy zmianie mówcy lub dłuższej pauzie."""
    akapity: list[tuple[float, str | None, list[str]]] = []
    poprzedni_koniec = -1e9
    for seg in segmenty:
        if not seg.tekst:
            continue
        nowy = (
            not akapity
            or seg.mowca != akapity[-1][1]
            or seg.start - poprzedni_koniec > 2.0
        )
        if nowy:
            akapity.append((seg.start, seg.mowca, [seg.tekst]))
        else:
            akapity[-1][2].append(seg.tekst)
        poprzedni_koniec = seg.end

    linie = []
    for start, mowca, teksty in akapity:
        naglowek = []
        if ze_znacznikami:
            naglowek.append(f"[{formatuj_czas(start)}]")
        if mowca:
            naglowek.append(f"{mowca}:")
        prefix = " ".join(naglowek)
        linie.append(f"{prefix} {' '.join(teksty)}".strip())
    sciezka.write_text("\n\n".join(linie) + "\n", encoding="utf-8")


def zapisz_srt(segmenty: list[Segment], sciezka: Path) -> None:
    bloki = []
    for i, seg in enumerate((s for s in segmenty if s.tekst), start=1):
        tekst = f"{seg.mowca}: {seg.tekst}" if seg.mowca else seg.tekst
        bloki.append(
            f"{i}\n{formatuj_czas(seg.start, True)} --> {formatuj_czas(seg.end, True)}\n{tekst}\n"
        )
    sciezka.write_text("\n".join(bloki), encoding="utf-8")


def zapisz_json(segmenty: list[Segment], meta: dict, sciezka: Path) -> None:
    dane = {
        "meta": meta,
        "segmenty": [
            {
                "start": round(s.start, 3),
                "end": round(s.end, 3),
                "mowca": s.mowca,
                "tekst": s.tekst,
                "slowa": [
                    {"start": round(w.start, 3), "end": round(w.end, 3),
                     "slowo": w.tekst.strip(), "pewnosc": round(w.pewnosc, 3)}
                    for w in s.slowa
                ],
            }
            for s in segmenty
        ],
    }
    sciezka.write_text(json.dumps(dane, ensure_ascii=False, indent=2), encoding="utf-8")


def zapisz_niepewne(segmenty: list[Segment], sciezka: Path, prog: float = 0.5) -> int:
    """Lista fragmentów z niepewnymi słowami – warto je odsłuchać i poprawić ręcznie."""
    linie = []
    for seg in segmenty:
        niepewne = [w.tekst.strip() for w in seg.slowa if w.pewnosc < prog]
        if niepewne:
            linie.append(f"[{formatuj_czas(seg.start)}] {seg.tekst}\n"
                         f"    niepewne: {', '.join(niepewne)}")
    if linie:
        sciezka.write_text("\n".join(linie) + "\n", encoding="utf-8")
    return len(linie)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> None:
    p = argparse.ArgumentParser(
        description="Transkrypcja nagrań z telefonu w wysokiej jakości (Whisper large-v3).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("plik", type=Path, help="plik audio (mp3, m4a, wav, ogg, ...)")
    p.add_argument("--model", default="large-v3",
                   help="model Whisper (domyślnie large-v3 – najlepsza jakość; "
                        "szybciej: large-v3-turbo, medium)")
    p.add_argument("--jezyk", default="pl", help="kod języka (domyślnie pl; 'auto' = wykryj)")
    p.add_argument("--slownik", help="nazwy własne i terminy, np. \"Kowalski, OPP, KRS\"")
    p.add_argument("--odszum", action="store_true",
                   help="łagodne odszumianie (używaj tylko przy wyraźnym szumie tła)")
    p.add_argument("--bez-przetwarzania", action="store_true",
                   help="pomiń filtry ffmpeg (tylko konwersja do 16 kHz mono)")
    p.add_argument("--mowcy", action="store_true", help="rozpoznawaj mówców (pyannote)")
    p.add_argument("--liczba-mowcow", type=int, help="znana liczba mówców (poprawia wynik)")
    p.add_argument("--hf-token", help="token Hugging Face (lub zmienna środowiskowa HF_TOKEN)")
    p.add_argument("--urzadzenie", choices=["auto", "cpu", "cuda"], default="auto")
    p.add_argument("--bez-czasow", action="store_true", help="plik .txt bez znaczników czasu")
    p.add_argument("--wyjscie", type=Path, help="katalog wyników (domyślnie obok nagrania)")
    p.add_argument("--zachowaj-wav", action="store_true",
                   help="zapisz też przetworzony plik WAV (do odsłuchu)")
    a = p.parse_args()

    if not a.plik.is_file():
        sys.exit(f"Nie znaleziono pliku: {a.plik}")

    katalog = a.wyjscie or a.plik.parent
    katalog.mkdir(parents=True, exist_ok=True)
    baza = katalog / a.plik.stem
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "audio_16k.wav"
        print("→ Przygotowuję audio (ffmpeg)...")
        if a.bez_przetwarzania:
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(a.plik),
                 "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav)],
                check=True,
            )
        else:
            przygotuj_audio(a.plik, wav, a.odszum)
        if a.zachowaj_wav:
            shutil.copy(wav, baza.with_name(baza.name + "_przetworzony.wav"))

        segmenty, meta = transkrybuj(
            wav, a.model, None if a.jezyk == "auto" else a.jezyk, a.slownik, a.urzadzenie
        )
        if a.mowcy:
            segmenty = rozpoznaj_mowcow(wav, segmenty, a.hf_token, a.liczba_mowcow)

    txt = baza.with_suffix(".txt")
    srt = baza.with_suffix(".srt")
    js = baza.with_suffix(".json")
    niep = baza.with_name(baza.name + "_do_sprawdzenia.txt")

    zapisz_txt(segmenty, txt, not a.bez_czasow)
    zapisz_srt(segmenty, srt)
    zapisz_json(segmenty, meta, js)
    ile_niepewnych = zapisz_niepewne(segmenty, niep)

    print(f"\n✔ Gotowe w {formatuj_czas(time.time() - t0)}")
    print(f"  Tekst:    {txt}")
    print(f"  Napisy:   {srt}")
    print(f"  JSON:     {js}")
    if ile_niepewnych:
        print(f"  Do sprawdzenia ({ile_niepewnych} fragm.): {niep}")


if __name__ == "__main__":
    main()
