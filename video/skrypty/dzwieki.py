#!/usr/bin/env python3
"""Generuje tymczasowy podkład muzyczny i efekty dźwiękowe do rolek (czysta synteza, nic nie jest pobierane).

Użycie:  python3 skrypty/dzwieki.py        → pliki MP3 w public/dzwieki/
Podkład to spokojne akordy w pętli (ok. 69 s). Docelowo warto go podmienić na utwór z biblioteki
z licencją (np. Pixabay) – wystarczy wgrać plik MP3 do folderu odcinka i wpisać go w polu "muzyka".
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
KATALOG = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "dzwieki"))
rng = np.random.default_rng(11)


def zapisz(nazwa: str, x: np.ndarray, szczyt: float, bitrate: str = "128k") -> None:
    """Normalizuje do zadanego szczytu i zapisuje MP3."""
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) or 1.0) * szczyt
    dane = (np.clip(x, -1, 1) * 32767).astype("<i2")
    wav = os.path.join(KATALOG, nazwa + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2 if dane.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(dane.tobytes())
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", bitrate, os.path.join(KATALOG, nazwa + ".mp3")],
        check=True,
    )
    os.remove(wav)
    rms = 20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-12)
    mono = x.mean(axis=1) if x.ndim == 2 else x
    widmo = np.abs(np.fft.rfft(mono[: min(len(mono), SR * 8)]))
    czest = np.fft.rfftfreq(min(len(mono), SR * 8), 1 / SR)
    srodek = float((widmo * czest).sum() / (widmo.sum() or 1))
    print(f"{nazwa:12s} {len(x) / SR:6.2f} s   szczyt {20 * np.log10(szczyt):6.1f} dB   średnio {rms:6.1f} dB   środek widma {srodek:6.0f} Hz")


def czas(dl: float) -> np.ndarray:
    return np.arange(int(dl * SR)) / SR


def szum(n: int) -> np.ndarray:
    return rng.standard_normal(n)


def dolnoprzepustowy(x: np.ndarray, fc: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def pasmowy(x: np.ndarray, fc: np.ndarray, q: float) -> np.ndarray:
    """Filtr pasmowy o zmiennej częstotliwości (do świstów i narastania)."""
    y = np.zeros_like(x)
    low = band = 0.0
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6.5) / SR)
        low += f * band
        high = x[i] - low - band / q
        band += f * high
        y[i] = band
    return y


def zanik_koncowy(x: np.ndarray, ms: float = 12) -> np.ndarray:
    n = int(SR * ms / 1000)
    x = x.copy()
    x[-n:] *= np.linspace(1, 0, n)
    return x


# ───────────────────────── Podkład muzyczny ─────────────────────────
BPM = 84
BEAT = 60 / BPM
TAKT = 4 * BEAT
DL_AKORDU = 2 * TAKT
CYKLE = 3
# (tony tła od basu w górę, tony „dzwonków”)
AKORDY = [
    ([73.42, 110.00, 146.83, 174.61, 220.00, 329.63], [587.33, 698.46, 880.00, 659.25]),  # d-moll 9
    ([58.27, 116.54, 146.83, 174.61, 220.00, 293.66], [587.33, 698.46, 880.00, 932.33]),  # B-dur 7+
    ([87.31, 130.81, 174.61, 220.00, 261.63, 329.63], [523.25, 659.25, 880.00, 698.46]),  # F-dur 7+
    ([65.41, 130.81, 164.81, 196.00, 261.63, 293.66], [523.25, 587.33, 783.99, 659.25]),  # C-dur 9
]
WAGI = [0.42, 0.5, 0.55, 0.55, 0.5, 0.42]
# Zdwojenia o oktawę wyżej dla górnych tonów – żeby podkład było słychać na głośniku telefonu
OKTAWY = [0.0, 0.0, 0.34, 0.34, 0.3, 0.24]
WZOR_DZWONKOW = [0, None, 2, None, 1, None, None, 3, None, None, 2, None, 1, None, None, None]


def dodaj(buf: np.ndarray, start: int, syg: np.ndarray, pan: float) -> None:
    """Dodaje sygnał do bufora stereo z zawijaniem (pętla bez szwu)."""
    idx = (start + np.arange(len(syg))) % len(buf)
    buf[idx, 0] += syg * np.cos((pan + 1) * np.pi / 4)
    buf[idx, 1] += syg * np.sin((pan + 1) * np.pi / 4)


def podklad() -> np.ndarray:
    n = int(round(len(AKORDY) * DL_AKORDU * CYKLE * SR))
    buf = np.zeros((n, 2))
    narost, wybrzm = 1.8, 2.6
    t = czas(DL_AKORDU + wybrzm)
    obw = np.ones_like(t)
    na = int(narost * SR)
    nw = int(wybrzm * SR)
    obw[:na] = 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    obw[-nw:] = 0.5 + 0.5 * np.cos(np.pi * np.arange(nw) / nw)
    for c in range(CYKLE):
        for a, (tony, dzwonki) in enumerate(AKORDY):
            start = int(round((c * len(AKORDY) + a) * DL_AKORDU * SR))
            # Tło: każdy ton to trzy lekko rozstrojone sinusy z wolnym falowaniem głośności
            glosy = [(f, w) for f, w in zip(tony, WAGI)] + [(2 * f, w) for f, w in zip(tony, OKTAWY) if w > 0]
            for f, waga in glosy:
                for rozstroj, amp, pan in ((-0.0025, 0.5, -0.5), (0.0, 1.0, 0.0), (0.003, 0.5, 0.5)):
                    faza = rng.uniform(0, 2 * np.pi)
                    syg = amp * np.sin(2 * np.pi * f * (1 + rozstroj) * t + faza)
                    if rozstroj == 0.0:
                        syg += 0.16 * np.sin(2 * np.pi * 2 * f * t + rng.uniform(0, 6.28))
                        syg += 0.05 * np.sin(2 * np.pi * 3 * f * t + rng.uniform(0, 6.28))
                    fal = 1 + 0.12 * np.sin(2 * np.pi * rng.uniform(0.07, 0.19) * t + rng.uniform(0, 6.28))
                    dodaj(buf, start, syg * obw * fal * waga * 0.2, pan * 0.7)
            # Dzwonki: pojedyncze ciche tony akordu z echem
            for k, ton in enumerate(WZOR_DZWONKOW):
                if ton is None:
                    continue
                f = dzwonki[ton]
                td = czas(3.2)
                syg = (
                    np.sin(2 * np.pi * f * td) * np.exp(-td / 0.9)
                    + 0.32 * np.sin(2 * np.pi * 2 * f * td) * np.exp(-td / 0.42)
                    + 0.1 * np.sin(2 * np.pi * 3 * f * td) * np.exp(-td / 0.22)
                )
                syg[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
                sila = rng.uniform(0.5, 0.8) * 0.3
                pan = -0.45 if k % 4 < 2 else 0.45
                s0 = start + int(round(k * BEAT / 2 * SR))
                dodaj(buf, s0, syg * sila, pan)
                dodaj(buf, s0 + int(0.536 * SR), syg * sila * 0.4, -pan)
                dodaj(buf, s0 + int(1.072 * SR), syg * sila * 0.17, pan)
            # Lekki puls w basie co dwa uderzenia
            for b in range(0, 8, 2):
                tp = czas(0.5)
                faza = 2 * np.pi * np.cumsum(88 + 60 * np.exp(-tp / 0.04)) / SR
                dodaj(buf, start + int(round(b * BEAT * SR)), np.sin(faza) * np.exp(-tp / 0.13) * 0.13, 0.0)
    # Pogłos: splot kołowy z zanikającym szumem (ogon zawija się, więc pętla nie ma szwu)
    dl = int(2.2 * SR)
    wynik = np.empty_like(buf)
    for kan in range(2):
        odp = szum(dl) * np.exp(-np.arange(dl) / SR / 0.55)
        odp = np.convolve(odp, np.ones(10) / 10, mode="same")
        odp /= np.sqrt(np.sum(odp**2))
        pelna = np.zeros(n)
        pelna[:dl] = odp
        mokry = np.fft.irfft(np.fft.rfft(buf[:, kan]) * np.fft.rfft(pelna), n)
        wynik[:, kan] = buf[:, kan] + 0.3 * mokry
    wynik /= np.max(np.abs(wynik))
    return np.tanh(wynik * 1.15) / np.tanh(1.15)


# ───────────────────────── Efekty ─────────────────────────
def swist() -> np.ndarray:
    t = czas(0.55)
    fc = 260 * (11.0 ** (t / t[-1]))
    obw = np.sin(np.pi * (t / t[-1]) ** 0.75) ** 2
    return zanik_koncowy(pasmowy(szum(len(t)), fc, 1.3) * obw)


def pop() -> np.ndarray:
    t = czas(0.16)
    f = 430 + 520 * (1 - np.exp(-t / 0.02))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.036)
    x[: int(0.003 * SR)] += szum(int(0.003 * SR)) * 0.25
    return zanik_koncowy(x)


def tik() -> np.ndarray:
    t = czas(0.05)
    return zanik_koncowy(np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.006) + szum(len(t)) * np.exp(-t / 0.002) * 0.3, 4)


def stempel() -> np.ndarray:
    t = czas(0.42)
    f = 46 + 70 * np.exp(-t / 0.05)
    lup = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * 0.45
    s = szum(len(t))
    trzask = (dolnoprzepustowy(s, 2600) - dolnoprzepustowy(s, 250)) * np.exp(-t / 0.03) * 3.0
    puk = (np.sin(2 * np.pi * 310 * t) + 0.6 * np.sin(2 * np.pi * 520 * t)) * np.exp(-t / 0.03) * 1.1
    return zanik_koncowy(np.tanh((lup + trzask + puk) * 1.2))


def papier() -> np.ndarray:
    t = czas(0.5)
    s = szum(len(t))
    wysokie = s - dolnoprzepustowy(s, 900)
    trzepot = 0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 21 * t + np.cumsum(szum(len(t))) * 0.02))
    obw = np.sin(np.pi * t / t[-1]) ** 1.5
    return zanik_koncowy(dolnoprzepustowy(dolnoprzepustowy(wysokie, 3800), 3800) * trzepot * obw)


def blad() -> np.ndarray:
    def ton(f: float) -> np.ndarray:
        t = czas(0.2)
        x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.3 * np.sin(2 * np.pi * 3 * f * t)
        return x * np.exp(-t / 0.07)

    x = np.zeros(int(0.36 * SR))
    a, b = ton(293.66), ton(220.0)
    x[: len(a)] += a
    x[int(0.15 * SR) : int(0.15 * SR) + len(b)] += b
    return zanik_koncowy(x)


def dzwonek() -> np.ndarray:
    x = np.zeros(int(1.5 * SR))
    for f, op, sila in ((880.0, 0.0, 1.0), (1318.51, 0.09, 0.85)):
        t = czas(1.3)
        nuta = sum(
            amp * np.sin(2 * np.pi * f * k * t) * np.exp(-t / tau)
            for k, amp, tau in ((1, 1.0, 0.5), (2.0, 0.42, 0.33), (3.0, 0.2, 0.2), (4.2, 0.1, 0.12))
        )
        nuta[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
        p = int(op * SR)
        x[p : p + len(nuta)] += nuta * sila
    return zanik_koncowy(x, 30)


def uderzenie() -> np.ndarray:
    t = czas(1.1)
    f = 36 + 70 * np.exp(-t / 0.22)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.33) * 0.55
    x += np.sin(2 * np.pi * np.cumsum(120 + 160 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.16) * 0.8
    s = szum(len(t))
    x += (dolnoprzepustowy(s, 1400) - dolnoprzepustowy(s, 200)) * np.exp(-t / 0.09) * 2.4
    return zanik_koncowy(np.tanh(x * 1.2), 40)


def narastanie() -> np.ndarray:
    t = czas(1.3)
    u = t / t[-1]
    x = pasmowy(szum(len(t)), 250 * (11.0**u), 1.6) * u**2
    x += 0.5 * np.sin(2 * np.pi * np.cumsum(220 * (3.0**u)) / SR) * u**2.5 * 0.5
    return zanik_koncowy(x, 30)


if __name__ == "__main__":
    os.makedirs(KATALOG, exist_ok=True)
    zapisz("podklad", podklad(), 0.8)
    zapisz("swist", swist(), 0.7)
    zapisz("pop", pop(), 0.7)
    zapisz("tik", tik(), 0.6)
    zapisz("stempel", stempel(), 0.85)
    zapisz("papier", papier(), 0.6)
    zapisz("blad", blad(), 0.6)
    zapisz("dzwonek", dzwonek(), 0.7)
    zapisz("uderzenie", uderzenie(), 0.85)
    zapisz("narastanie", narastanie(), 0.7)
