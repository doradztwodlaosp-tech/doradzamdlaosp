// =====================================================================
//  Obsługa zgłoszeń ze strony doradztwodlaosp.pl  (Google Apps Script)
//  Gmail -> Arkusz Google -> Telegram -> autoresponder do klienta
// =====================================================================

// ================= KONFIGURACJA =================
// Token i chat_id trzymaj w: Ustawienia projektu -> Właściwości skryptu
// (TELEGRAM_TOKEN, TELEGRAM_CHAT_ID). Nigdy nie wklejaj ich do kodu.
// TELEGRAM_CHAT_ID może zawierać kilka numerów oddzielonych przecinkiem,
// np. 6857300116,123456789 – powiadomienie dostanie każda z tych osób.
const PROPS = PropertiesService.getScriptProperties();
const TELEGRAM_TOKEN = PROPS.getProperty("TELEGRAM_TOKEN");
const TELEGRAM_CHAT_ID = PROPS.getProperty("TELEGRAM_CHAT_ID");

// UWAGA: nazwa musi być IDENTYCZNA jak etykieta w Gmailu (wielkość liter, polskie znaki).
const ETYKIETA_ZGLOSZENIA = "ZGLOSZENIA";
const ETYKIETA_OCZEKUJE = "Status/Oczekuje";

const TELEFON_KONTAKTOWY = "720 868 902";
const STRONA_WWW = "https://doradztwodlaosp.pl";
const STREFA = "Europe/Warsaw";

// Zabezpieczenia
const MAX_WIEK_ZGLOSZENIA_H = 48;   // starsze zgłoszenia NIGDY nie dostaną autorespondera
const MAX_NA_URUCHOMIENIE = 15;     // limit wątków na jedno uruchomienie
const MAX_WIEK_PRZYPOMNIEN_DNI = 7; // starsze nie generują alarmów "minął dzień"
const QUERY = 'in:inbox newer_than:3d "PROŚBA O KONTAKT" -label:' + ETYKIETA_ZGLOSZENIA;

// Kolory firmowe (z doradztwodlaosp.pl: czerń i złoto)
const KOLOR = {
  zloto: "#D4AF37",
  czern: "#0A0A0A",
  zlotoTekst: "#9A7A12",   // ciemniejsze złoto do małych napisów na białym tle (czytelność)
  tloMaila: "#F5F0E8",
  ramkaMaila: "#EDE8DD",
  szaryCiemny: "#8A8A8A",
  krem: "#FBF6E6",
  tekst: "#222222"
};

// Arkusz
const NAGLOWKI = ["Data", "Nazwa OSP", "Imię i Nazwisko", "Telefon", "E-mail", "Temat", "Status"];
const SZEROKOSCI = [150, 260, 190, 130, 260, 200, 150];
const STATUSY = ["Nowe", "W trakcie", "Odpowiedziano", "Zamknięte", "Stare"];
const KOLORY_STATUSOW = {
  "Nowe":          { tlo: "#F6E7B0", tekst: "#6B5200" },
  "W trakcie":     { tlo: "#FDEBD0", tekst: "#9C640C" },
  "Odpowiedziano": { tlo: "#D5F5E3", tekst: "#1E8449" },
  "Zamknięte":     { tlo: "#E5E8E8", tekst: "#566573" },
  "Stare":         { tlo: "#EFEFEF", tekst: "#8A8A8A" }
};
// ================================================


// =====================================================================
//  1. NOWE ZGŁOSZENIA  (wyzwalacz: co 5-10 minut)
// =====================================================================
function obsluzNoweZgloszenia() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("Inne uruchomienie trwa – pomijam.");
    return;
  }

  try {
    const threads = GmailApp.search(QUERY, 0, MAX_NA_URUCHOMIENIE);
    if (threads.length === 0) return;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sformatujArkusz();

    const labelZgloszenia = pobierzLubStworzEtykiete(ETYKIETA_ZGLOSZENIA);
    const labelOczekuje = pobierzLubStworzEtykiete(ETYKIETA_OCZEKUJE);

    // Od najstarszego, żeby najnowsze zgłoszenie lądowało na górze arkusza
    for (let i = threads.length - 1; i >= 0; i--) {
      const thread = threads[i];
      try {
        // NAJPIERW "rezerwujemy" wątek etykietą – żeby nigdy nie przetworzyć go
        // dwa razy, nawet jeśli skrypt padnie w połowie.
        thread.addLabel(labelZgloszenia);

        const message = thread.getMessages()[0]; // oryginalna wiadomość z formularza
        const dataZgloszenia = message.getDate();
        const wiekGodzin = (Date.now() - dataZgloszenia.getTime()) / 3600000;
        const plainBody = message.getPlainBody();

        const nazwaOsp = wyciagnijPoleFormularza(plainBody, "Nazwa OSP");
        const imieNazwisko = wyciagnijPoleFormularza(plainBody, "Imię i Nazwisko");
        const telefon = wyciagnijPoleFormularza(plainBody, "Telefon");
        const emailKlienta = wyciagnijPoleFormularza(plainBody, "Email");
        const temat = wyciagnijPoleFormularza(plainBody, "Temat");

        const czyStare = wiekGodzin > MAX_WIEK_ZGLOSZENIA_H;

        dopiszWiersz(sheet, [dataZgloszenia, nazwaOsp, imieNazwisko, telefon, emailKlienta, temat,
                             czyStare ? "Stare" : "Nowe"]);

        // Telegram i autoresponder – tylko dla świeżych zgłoszeń
        if (!czyStare) {
          try {
            wyslijNaTelegram(
              "🔥 <b>NOWE ZGŁOSZENIE ZE STRONY</b>\n\n" +
              "🚒 <b>OSP:</b> " + esc(nazwaOsp) + "\n" +
              "👤 <b>Osoba:</b> " + esc(imieNazwisko) + "\n" +
              "📞 <b>Telefon:</b> " + esc(telefon) + "\n" +
              "✉️ <b>E-mail:</b> " + esc(emailKlienta) + "\n" +
              "📋 <b>Temat:</b> " + esc(temat) + "\n\n" +
              "⏱ <b>Status:</b> Oczekuje na odpowiedź"
            );
          } catch (e) {
            Logger.log("Telegram błąd: " + e);
          }

          if (czyPoprawnyEmail(emailKlienta)) {
            try {
              wyslijAutoresponderHTML(emailKlienta, nazwaOsp);
            } catch (e) {
              Logger.log("Autoresponder błąd (" + emailKlienta + "): " + e);
            }
          }
          thread.addLabel(labelOczekuje);
        }

      } catch (e) {
        Logger.log("Błąd wątku " + thread.getId() + ": " + e);
      } finally {
        // Porządki w Gmailu zawsze – także po błędzie, żeby wątek nie został w Odebranych
        try {
          thread.markRead();
          thread.moveToArchive();
        } catch (e2) {
          Logger.log("Archiwizacja błąd " + thread.getId() + ": " + e2);
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
}


// =====================================================================
//  2. PRZYPOMNIENIA PO 24 H  (wyzwalacz: co godzinę)
// =====================================================================
function sprawdzTerminyOczekujacych() {
  const labelOczekuje = GmailApp.getUserLabelByName(ETYKIETA_OCZEKUJE);
  if (!labelOczekuje) return;

  const mojEmail = Session.getEffectiveUser().getEmail().toLowerCase();
  const threads = labelOczekuje.getThreads(0, 50);
  const teraz = Date.now();
  const jedenDzienMs = 86400000;

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    try {
      const messages = thread.getMessages();

      // Jeśli już odpowiedzieliśmy – zdejmij etykietę "Oczekuje"
      const ostatni = messages[messages.length - 1];
      if (messages.length > 1 && ostatni.getFrom().toLowerCase().indexOf(mojEmail) !== -1) {
        thread.removeLabel(labelOczekuje);
        continue;
      }

      const wiek = teraz - thread.getLastMessageDate().getTime();

      // Zbyt stare – nie alarmujemy, tylko sprzątamy
      if (wiek > MAX_WIEK_PRZYPOMNIEN_DNI * jedenDzienMs) {
        thread.removeLabel(labelOczekuje);
        continue;
      }

      if (wiek >= jedenDzienMs && !thread.hasStarredMessages()) {
        const pierwszyMsg = messages[0].getPlainBody();
        const nazwaOsp = wyciagnijPoleFormularza(pierwszyMsg, "Nazwa OSP");
        const telefon = wyciagnijPoleFormularza(pierwszyMsg, "Telefon");

        wyslijNaTelegram(
          "⚠️ <b>PILNE: MINĄŁ 1 DZIEŃ BEZ ODPOWIEDZI!</b>\n\n" +
          "🚒 <b>OSP:</b> " + esc(nazwaOsp) + "\n" +
          "📞 <b>Telefon:</b> " + esc(telefon) + "\n\n" +
          "Klient czeka na kontakt już ponad dobę!"
        );
        messages[0].star(); // gwiazdka = przypomnienie już wysłane
      }
    } catch (e) {
      Logger.log("Błąd przypomnienia " + thread.getId() + ": " + e);
    }
  }
}


// =====================================================================
//  3. FUNKCJE JEDNORAZOWE  (uruchamiane ręcznie)
// =====================================================================

// Uruchom RAZ, ZANIM włączysz wyzwalacz. Oznacza wszystkie istniejące zgłoszenia
// etykietą, oznacza jako przeczytane i przenosi z Odebranych do archiwum
// (zostają pod etykietą). Niczego nie wysyła.
// Można uruchomić ponownie, żeby uprzątnąć wątki, które zostały w Odebranych.
function oznaczStareJakoPrzetworzone() {
  const label = pobierzLubStworzEtykiete(ETYKIETA_ZGLOSZENIA);
  let razem = 0;

  // 1) Wątki jeszcze bez etykiety
  while (true) {
    const threads = GmailApp.search('"PROŚBA O KONTAKT" -label:' + ETYKIETA_ZGLOSZENIA, 0, 100);
    if (threads.length === 0) break;
    label.addToThreads(threads);
    GmailApp.markThreadsRead(threads);
    GmailApp.moveThreadsToArchive(threads);
    razem += threads.length;
  }

  // 2) Wątki z etykietą, ale nadal w Odebranych
  while (true) {
    const threads = GmailApp.search('in:inbox "PROŚBA O KONTAKT" label:' + ETYKIETA_ZGLOSZENIA, 0, 100);
    if (threads.length === 0) break;
    GmailApp.markThreadsRead(threads);
    GmailApp.moveThreadsToArchive(threads);
    razem += threads.length;
  }
  Logger.log("Uporządkowano wątków: " + razem);
}

// Nadaje arkuszowi firmowy wygląd i naprawia istniejące dane
// (m.in. #ERROR! w telefonach). Można uruchamiać wielokrotnie.
function sformatujArkusz() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const kolumn = NAGLOWKI.length;

  // Nagłówek
  sheet.getRange(1, 1, 1, kolumn)
    .setValues([NAGLOWKI])
    .setBackground(KOLOR.czern)
    .setFontColor(KOLOR.zloto)
    .setFontWeight("bold")
    .setFontSize(11)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  sheet.setTabColor(KOLOR.zloto);
  sheet.setHiddenGridlines(true);
  for (let k = 0; k < kolumn; k++) sheet.setColumnWidth(k + 1, SZEROKOSCI[k]);

  const wierszy = Math.max(sheet.getMaxRows() - 1, 1);
  const dane = sheet.getRange(2, 1, wierszy, kolumn);

  // Wygląd danych
  dane.setFontFamily("Arial").setFontSize(10).setFontColor(KOLOR.tekst)
      .setVerticalAlignment("middle").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sheet.getRange(2, 1, wierszy, 1).setNumberFormat("dd.MM.yyyy HH:mm").setHorizontalAlignment("left");
  sheet.getRange(2, 2, wierszy, 5).setNumberFormat("@"); // B–F jako zwykły tekst
  sheet.getRange(2, 2, wierszy, 1).setFontWeight("bold");
  sheet.getRange(2, 7, wierszy, 1).setHorizontalAlignment("center").setFontWeight("bold");

  // Naprawa telefonów zapisanych jako formuła (#ERROR!) lub liczba
  const ostatni = sheet.getLastRow();
  if (ostatni > 1) {
    const zakresTel = sheet.getRange(2, 4, ostatni - 1, 1);
    const formuly = zakresTel.getFormulas();
    const wartosci = zakresTel.getDisplayValues();
    const naprawione = wartosci.map(function (w, i) {
      const f = formuly[i][0];
      return [f ? f.replace(/^=/, "") : w[0]];
    });
    zakresTel.setNumberFormat("@").setValues(naprawione);

    // "Temat: Inne" -> "Inne"
    const zakresTemat = sheet.getRange(2, 6, ostatni - 1, 1);
    zakresTemat.setValues(zakresTemat.getDisplayValues().map(function (w) {
      return [w[0].replace(/^\s*Temat\s*:\s*/i, "")];
    }));
  }

  // Naprzemienne tło wierszy
  sheet.getBandings().forEach(function (b) { b.remove(); });
  sheet.getRange(1, 1, sheet.getMaxRows(), kolumn)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(KOLOR.czern)
    .setFirstRowColor("#FFFFFF")
    .setSecondRowColor(KOLOR.krem);

  // Lista rozwijana statusów
  const zakresStatus = sheet.getRange(2, 7, wierszy, 1);
  zakresStatus.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSY, true).setAllowInvalid(true).build()
  );

  // Kolory statusów
  const reguly = STATUSY.map(function (s) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(s)
      .setBackground(KOLORY_STATUSOW[s].tlo)
      .setFontColor(KOLORY_STATUSOW[s].tekst)
      .setRanges([zakresStatus])
      .build();
  });
  sheet.setConditionalFormatRules(reguly);

  // Filtr w nagłówku
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, sheet.getMaxRows(), kolumn).createFilter();
}

// Wysyła testowy autoresponder na Twój własny adres – do podglądu wyglądu.
function testAutorespondera() {
  wyslijAutoresponderHTML(Session.getEffectiveUser().getEmail(), "OSP Testowa");
}


// =====================================================================
//  4. POMOCNICZE
// =====================================================================
function pobierzLubStworzEtykiete(nazwa) {
  return GmailApp.getUserLabelByName(nazwa) || GmailApp.createLabel(nazwa);
}

// Wstawia zgłoszenie na górze arkusza (pod nagłówkiem). Pola tekstowe są
// zapisywane jako tekst, więc "+48 ..." nie zamieni się w #ERROR!.
function dopiszWiersz(sheet, wiersz) {
  if (sheet.getLastRow() >= 2) {
    sheet.insertRowBefore(2);
  }
  sheet.getRange(2, 2, 1, 5).setNumberFormat("@");
  sheet.getRange(2, 1, 1, wiersz.length).setValues([wiersz]);
  SpreadsheetApp.flush();
}

function czyPoprawnyEmail(email) {
  if (!email || email === "Nie podano") return false;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return false;
  const moj = Session.getEffectiveUser().getEmail().toLowerCase();
  return email.toLowerCase() !== moj; // nigdy nie odpowiadaj sam sobie
}

function esc(t) {
  return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wyciagnijPoleFormularza(tekst, nazwaPola) {
  const nazwaRegex = nazwaPola.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const POLA = "Nazwa OSP|Imię i Nazwisko|Telefon|E-?mail|Temat|Wiadomość|Wysłano";
  let wynik = "";

  // 1) Format liniowy: "Pole: wartość"
  const liniowy = tekst.match(new RegExp("^\\s*" + nazwaRegex + "\\s*:\\s*(.+)$", "im"));
  if (liniowy) wynik = liniowy[1];

  // 2) Wszystko w jednej linii albo wartość w kolejnej linii
  if (!wynik.trim()) {
    const match = tekst.match(new RegExp(
      nazwaRegex + "[:\\s]+(.*?)(?=\\s+(?:" + POLA + ")(?=[\\s:]|$)|$)", "is"));
    if (match) wynik = match[1];
  }

  // Sprzątanie: znaki nowej linii i przyklejone nazwy pól ("Temat: Inne" -> "Inne")
  wynik = wynik.replace(/[\r\n]+/g, " ")
               .replace(new RegExp("^\\s*(?:" + POLA + ")\\s*:\\s*", "i"), "")
               .trim();
  return wynik || "Nie podano";
}

function wyslijNaTelegram(wiadomosc) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    Logger.log("Brak TELEGRAM_TOKEN lub TELEGRAM_CHAT_ID we właściwościach skryptu!");
    return;
  }
  const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
  const odbiorcy = TELEGRAM_CHAT_ID.split(",").map(function (x) { return x.trim(); }).filter(Boolean);

  // Każdy odbiorca osobno – błąd u jednego (np. nie uruchomił bota) nie blokuje pozostałych
  odbiorcy.forEach(function (chatId) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ chat_id: chatId, text: wiadomosc, parse_mode: "HTML" }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) {
        Logger.log("Telegram (" + chatId + ") HTTP " + res.getResponseCode() + ": " + res.getContentText());
      }
    } catch (e) {
      Logger.log("Telegram (" + chatId + ") błąd: " + e);
    }
  });
}


// =====================================================================
//  5. AUTORESPONDER W KOLORACH FIRMOWYCH
// =====================================================================
function wyslijAutoresponderHTML(odbiorca, nazwaOsp) {
  const teraz = new Date();
  const godzina = parseInt(Utilities.formatDate(teraz, STREFA, "H"), 10);
  const dzienTygodnia = parseInt(Utilities.formatDate(teraz, STREFA, "u"), 10); // 1=pon … 7=niedz

  const czyDzienRoboczy = dzienTygodnia >= 1 && dzienTygodnia <= 5;
  const czyGodzinyPracy = godzina >= 8 && godzina < 18;
  const czyWPracy = czyDzienRoboczy && czyGodzinyPracy && !czyPolskieSwieto(teraz);

  const maNazwe = nazwaOsp && nazwaOsp !== "Nie podano";
  const dlaKogoHtml = maNazwe ? " dla jednostki <strong>" + esc(nazwaOsp) + "</strong>" : "";
  const dlaKogoTxt = maNazwe ? " dla jednostki " + nazwaOsp : "";

  const tematZwrotny = czyWPracy
    ? "Potwierdzenie otrzymania zgłoszenia – Doradztwo dla OSP"
    : "Otrzymaliśmy Wasze zgłoszenie – Doradztwo dla OSP";

  const zdanie = czyWPracy
    ? "Potwierdzamy, że zgłoszenie dotarło do nas pomyślnie. Zapoznajemy się ze szczegółami i odpowiemy najszybciej, jak to możliwe."
    : "Dotarła ona do nas poza standardowymi godzinami pracy lub w dzień świąteczny, dlatego wrócimy do Państwa z odpowiedzią na początku najbliższego dnia roboczego.";

  const plainBody =
    "Dzień dobry,\n\n" +
    "Dziękujemy za wiadomość" + dlaKogoTxt + ". " + zdanie + "\n\n" +
    "Pilna sprawa? Zadzwoń: " + TELEFON_KONTAKTOWY + "\n\n" +
    "Pozdrawiamy,\n" +
    "Zespół Doradztwo dla OSP\n" +
    STRONA_WWW;

  const telBezSpacji = TELEFON_KONTAKTOWY.replace(/\s+/g, "");
  const czcionka = "font-family:'Segoe UI',Helvetica,Arial,sans-serif;";
  const naglowek = czyWPracy ? "Zgłoszenie dotarło" : "Mamy Wasze zgłoszenie";

  const htmlBody =
    '<div style="margin:0;padding:0;background-color:' + KOLOR.tloMaila + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + KOLOR.tloMaila + '" style="background-color:' + KOLOR.tloMaila + ';">' +
    '<tr><td align="center" style="padding:28px 12px;">' +

      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ' + KOLOR.ramkaMaila + ';">' +

        // Złoty pasek
        '<tr><td style="height:5px;line-height:5px;font-size:0;background-color:' + KOLOR.zloto + ';">&nbsp;</td></tr>' +

        // Czarny nagłówek
        '<tr><td bgcolor="' + KOLOR.czern + '" style="background-color:' + KOLOR.czern + ';padding:26px 32px;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td style="background-color:' + KOLOR.zloto + ';color:' + KOLOR.czern + ';' + czcionka + 'font-size:13px;font-weight:bold;letter-spacing:1px;padding:5px 10px;border-radius:5px;">OSP</td>' +
            '<td style="padding-left:12px;color:#ffffff;' + czcionka + 'font-size:19px;font-weight:bold;">Doradztwo dla OSP</td>' +
          '</tr></table>' +
        '</td></tr>' +

        // Treść
        '<tr><td style="padding:34px 32px 10px 32px;' + czcionka + 'color:' + KOLOR.tekst + ';font-size:15px;line-height:1.65;">' +
          '<div style="color:' + KOLOR.zlotoTekst + ';font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Potwierdzenie</div>' +
          '<h1 style="margin:0 0 20px 0;' + czcionka + 'font-size:24px;line-height:1.25;color:' + KOLOR.czern + ';">' + naglowek + '</h1>' +
          '<p style="margin:0 0 14px 0;">Dzień dobry,</p>' +
          '<p style="margin:0 0 14px 0;">Dziękujemy za wiadomość' + dlaKogoHtml + '. ' + zdanie + '</p>' +
        '</td></tr>' +

        // Ramka "pilny kontakt"
        '<tr><td style="padding:10px 32px 8px 32px;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + KOLOR.tloMaila + '" style="background-color:' + KOLOR.tloMaila + ';border-left:4px solid ' + KOLOR.zloto + ';border-radius:8px;">' +
            '<tr><td style="padding:18px 20px;' + czcionka + 'font-size:14px;line-height:1.5;color:' + KOLOR.tekst + ';">' +
              '<strong style="color:' + KOLOR.czern + ';">Pilna sprawa?</strong><br>Zadzwoń — chętnie porozmawiamy od razu.' +
            '</td>' +
            '<td align="right" style="padding:18px 20px;white-space:nowrap;">' +
              '<a href="tel:' + telBezSpacji + '" style="display:inline-block;background-color:' + KOLOR.zloto + ';color:' + KOLOR.czern + ';' + czcionka + 'font-size:15px;font-weight:bold;text-decoration:none;padding:11px 20px;border-radius:8px;">' + TELEFON_KONTAKTOWY + '</a>' +
            '</td></tr>' +
          '</table>' +
        '</td></tr>' +

        // Podpis
        '<tr><td style="padding:22px 32px 34px 32px;' + czcionka + 'color:' + KOLOR.tekst + ';font-size:15px;line-height:1.6;">' +
          'Pozdrawiamy,<br><strong style="color:' + KOLOR.czern + ';">Zespół Doradztwo dla OSP</strong>' +
        '</td></tr>' +

        // Czarna stopka
        '<tr><td bgcolor="' + KOLOR.czern + '" style="background-color:' + KOLOR.czern + ';padding:20px 32px;' + czcionka + 'font-size:12px;line-height:1.6;color:' + KOLOR.szaryCiemny + ';">' +
          '<a href="' + STRONA_WWW + '" style="color:' + KOLOR.zloto + ';text-decoration:none;font-weight:bold;">doradztwodlaosp.pl</a>' +
          ' &nbsp;·&nbsp; tel. <a href="tel:' + telBezSpacji + '" style="color:#ffffff;text-decoration:none;">' + TELEFON_KONTAKTOWY + '</a><br>' +
          'Wiadomość wysłana automatycznie w odpowiedzi na formularz kontaktowy.' +
        '</td></tr>' +

      '</table>' +

    '</td></tr></table></div>';

  GmailApp.sendEmail(odbiorca, tematZwrotny, plainBody, {
    htmlBody: htmlBody,
    name: "Zespół Doradztwo dla OSP"
  });
}

function czyPolskieSwieto(date) {
  const dataTekst = Utilities.formatDate(date, STREFA, "yyyy-MM-dd");
  const miesiacDzien = dataTekst.substring(5);

  // Stałe święta (MM-dd), w tym Wigilia – wolna od 2025 r.
  const staleSwieta = ["01-01", "01-06", "05-01", "05-03", "08-15", "11-01", "11-11", "12-24", "12-25", "12-26"];
  if (staleSwieta.indexOf(miesiacDzien) !== -1) return true;

  // Ruchome: Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki, Boże Ciało
  const ruchomeSwieta = [
    "2026-04-05", "2026-04-06", "2026-05-24", "2026-06-04",
    "2027-03-28", "2027-03-29", "2027-05-16", "2027-05-27",
    "2028-04-16", "2028-04-17", "2028-06-04", "2028-06-15",
    "2029-04-01", "2029-04-02", "2029-05-20", "2029-05-31",
    "2030-04-21", "2030-04-22", "2030-06-09", "2030-06-20"
  ];
  return ruchomeSwieta.indexOf(dataTekst) !== -1;
}
