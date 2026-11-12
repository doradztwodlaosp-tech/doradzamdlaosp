# -*- coding: utf-8 -*-
"""
wysylka.py — mail przez Gmail (SMTP, hasło aplikacji) i kopia na Dysk (rclone)
================================================================================
Oba kroki są opcjonalne: jeśli nie skonfigurowano (brak zmiennych w
/etc/eureka-bot.env albo brak rclone), bot wypisze to i pójdzie dalej —
nie przerwie biegu.
"""
from __future__ import annotations

import mimetypes
import shutil
import smtplib
import subprocess
from email.message import EmailMessage
from pathlib import Path

import config


def wyslij_mail(temat: str, tresc_html: str, zalaczniki: list[Path]) -> bool:
    if not (config.SMTP_UZYTKOWNIK and config.SMTP_HASLO and config.MAIL_DO):
        print("Mail: pominięto (brak EUREKA_SMTP_UZYTKOWNIK / EUREKA_SMTP_HASLO / EUREKA_MAIL_DO).")
        return False
    wiadomosc = EmailMessage()
    wiadomosc["Subject"] = temat
    wiadomosc["From"] = config.SMTP_UZYTKOWNIK
    wiadomosc["To"] = ", ".join(config.MAIL_DO)
    wiadomosc.set_content("Raport EUREKA — otwórz wiadomość w wersji HTML albo załączone pliki Excel.")
    wiadomosc.add_alternative(tresc_html, subtype="html")
    for sciezka in zalaczniki:
        typ, _ = mimetypes.guess_type(sciezka.name)
        glowny, pod = (typ or "application/octet-stream").split("/", 1)
        wiadomosc.add_attachment(sciezka.read_bytes(), maintype=glowny, subtype=pod, filename=sciezka.name)
    try:
        with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=60) as smtp:
            smtp.login(config.SMTP_UZYTKOWNIK, config.SMTP_HASLO)
            smtp.send_message(wiadomosc)
        print(f"Mail: wysłano do {', '.join(config.MAIL_DO)}.")
        return True
    except (smtplib.SMTPException, OSError) as e:
        print(f"Mail: BŁĄD wysyłki: {e}")
        return False


def synchronizuj_dysk() -> bool | None:
    """Kopiuje folder bazy (PDF-y i raporty, bez rejestru SQLite) na Dysk Google.
    `rclone copy` niczego nie kasuje na Dysku i wysyła tylko nowe/zmienione
    pliki. Zwraca None, gdy nie skonfigurowano."""
    if not config.RCLONE_CEL:
        print("Dysk: pominięto (brak EUREKA_RCLONE_CEL).")
        return None
    rclone = shutil.which("rclone")
    if not rclone:
        print("Dysk: BŁĄD — rclone nie jest zainstalowany (patrz INSTALACJA.md).")
        return False
    polecenie = [rclone, "copy", str(config.BAZA_DANYCH), config.RCLONE_CEL,
                 "--exclude", "_rejestr/**", "--transfers", "4", "--log-level", "NOTICE"]
    try:
        wynik = subprocess.run(polecenie, capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        print("Dysk: BŁĄD — rclone nie skończył w ciągu godziny.")
        return False
    if wynik.returncode != 0:
        print(f"Dysk: BŁĄD rclone (kod {wynik.returncode}):\n{wynik.stderr[-2000:]}")
        return False
    print(f"Dysk: zsynchronizowano z {config.RCLONE_CEL}.")
    return True
