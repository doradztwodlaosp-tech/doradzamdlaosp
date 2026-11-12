# -*- coding: utf-8 -*-
"""
profiles.py — definicje profili wyszukiwania
=============================================
Struktura danych, nie logika. Dodanie nowego profilu = dopisanie nowego
wpisu do PROFILE; nic innego w kodzie nie trzeba zmieniać (patrz scraper.py,
który iteruje po PROFILE generycznie).

Każdy Profil ma: nazwę, opis, podstawę prawną, podatek (CIT/PIT/CIT+PIT),
folder docelowy (None => bucketowanie wg roku), priorytet oraz listę Regul.

Każda Regula to PARA: fraza wysyłana do wyszukiwarki EUREKA + wzorzec regex
potwierdzający dopasowanie względem pola PRZEPISY zwracanego rekordu.
Rozróżnienie `typ`:
  - "obowiazkowa" — fraza wprost odpowiadająca przepisowi (np. "art. 18d");
    to jest trzon profilu, zawsze uruchamiany.
  - "dodatkowa"   — szersza fraza tematyczna/słownikowa (np. "wskaźnik
    nexus"), również ZAWSZE uruchamiana, ale służy zwiększeniu recall,
    zwłaszcza dla interpretacji przeniesionych ze starego SIP (2019–2021),
    które bywają opisane mniej precyzyjnymi metadanymi PRZEPISY (patrz
    README, pkt. „Migracja z SIP”). Rozróżnienie typu wpływa TYLKO na
    raportowanie i ewentualne przyszłe filtrowanie (`--tylko-obowiazkowe`),
    NIE osłabia progu potwierdzenia.

System pewności dopasowania (patrz matcher.py):
  - POTWIERDZONE    — wzorzec regex trafił w pole PRZEPISY danego rekordu.
  - DO_WERYFIKACJI  — rekord znaleziony przez frazę profilu w wyszukiwarce
    EUREKA, ale regex NIE potwierdził go w PRZEPISY (może to być rekord
    migrowany z SIP bez precyzyjnych metadanych, albo fałszywe trafienie).
    Taki rekord NADAL trafia do bazy i raportu — nigdy nie jest po cichu
    pomijany — tylko z niższą pewnością, do ręcznego przejrzenia.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


# ===========================================================================
# BUDOWA WZORCÓW ARTYKUŁÓW
# ===========================================================================
def wzorzec_artykulu(numer: str) -> str:
    """Buduje wzorzec regex dla numeru artykułu, tolerancyjny na warianty
    zapisu: 'art. 18d', 'art.18d', 'art 18d', a także 'art. 18 d' (spacja
    przed literą przyrostka — wariant zaobserwowany w praktyce, patrz
    README). Ujemny lookahead (?![a-z0-9]) pilnuje, by np. '18d' nie
    złapało '18da' / '18db' (sprawdzone na istniejących profilach v6).

    >>> bool(re.search(wzorzec_artykulu("18d"), "art. 18d-ust. 3", re.I))
    True
    >>> bool(re.search(wzorzec_artykulu("18d"), "art. 18da-ust. 1", re.I))
    False
    >>> bool(re.search(wzorzec_artykulu("18d"), "art. 18 d ust. 3", re.I))
    True
    """
    m = re.match(r"^(\d+)([a-z]*)$", numer.strip().lower())
    if not m:
        raise ValueError(f"Nieprawidłowy numer artykułu: {numer!r}")
    cyfry, litery = m.group(1), m.group(2)
    rdzen = cyfry
    if litery:
        rdzen += r"\s*" + r"\s*".join(litery)
    return rf"art\.?\s*{rdzen}(?![a-z0-9])"


def wzorzec_zakresu(prefiks: str, litera_od: str, litera_do: str) -> str:
    """Wzorzec dla zakresu liter przy tym samym prefiksie cyfrowym, np.
    art. 28c..28t (estoński CIT). Tolerancyjny na spację jak wyżej."""
    return rf"art\.?\s*{prefiks}\s*[{litera_od}-{litera_do}](?![a-z0-9])"


# ===========================================================================
# MODELE
# ===========================================================================
@dataclass(frozen=True)
class Regula:
    fraza: str            # dokładny tekst wysyłany jako searchQuery do EUREKI
    wzorzec: str           # regex potwierdzający względem pola PRZEPISY
    ustawa: str            # "CIT" | "PIT"
    typ: str = "obowiazkowa"   # "obowiazkowa" | "dodatkowa"
    szukaj_w_tresci: bool = False  # searchInContent=True (szersze, wolniejsze)


@dataclass(frozen=True)
class Profil:
    klucz: str
    nazwa: str
    opis: str
    podstawa_prawna: str
    podatek: str                     # "CIT" | "PIT" | "CIT+PIT"
    folder: str | None               # None => folder wg roku publikacji/wydania
    priorytet: int                   # 1 = najwyższy
    reguly: tuple[Regula, ...]
    frazy_wykluczajace: tuple[str, ...] = field(default_factory=tuple)

    def frazy(self, typ: str | None = None) -> list[str]:
        """Unikalna lista fraz (opcjonalnie tylko danego typu), zachowując
        kolejność — do iterowania po zapytaniach bez duplikowania tej samej
        frazy współdzielonej przez kilka reguł."""
        widziane: list[str] = []
        for r in self.reguly:
            if typ is not None and r.typ != typ:
                continue
            if r.fraza not in widziane:
                widziane.append(r.fraza)
        return widziane


# ===========================================================================
# PROFILE — 8 istniejących (zweryfikowane/rozbudowane) + 4 nowe
# ===========================================================================
# Wszystkie numery artykułów w tym pliku zweryfikowane wyszukiwaniem w toku
# przygotowania tej wersji (lipiec 2026) — źródła: objaśnienia MF z 15 lipca
# 2019 r. (IP Box), oraz przeglądy Polskiego Ładu dla ulg z 2022 r. Rozbieżność
# znaleziona w jednym źródle (pit.pl sugerował art. 18db CIT = ulga na
# terminal) została odrzucona jako błąd tamtej strony — 10 innych, w tym
# komentarze PwC/EY/Grant Thornton oraz Twój już działający kod v6, zgodnie
# potwierdzają art. 18db CIT / 26eb PIT = ulga na innowacyjnych pracowników.

PROFILE: dict[str, Profil] = {

    # -----------------------------------------------------------------
    "ulga_br": Profil(
        klucz="ulga_br",
        nazwa="Ulga B+R (badawczo-rozwojowa)",
        opis="Koszty kwalifikowane działalności badawczo-rozwojowej, w tym "
             "zwrot gotówkowy i obowiązek wykazania w zeznaniu.",
        podstawa_prawna="art. 18d, 18da, 18e ustawy o CIT; art. 26e, 26ea, 26f ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=1,
        reguly=(
            Regula("art. 18d", wzorzec_artykulu("18d"), "CIT"),
            Regula("art. 18da", wzorzec_artykulu("18da"), "CIT"),
            Regula("art. 18e", wzorzec_artykulu("18e"), "CIT"),
            Regula("art. 26e", wzorzec_artykulu("26e"), "PIT"),
            Regula("art. 26ea", wzorzec_artykulu("26ea"), "PIT"),
            Regula("art. 26f", wzorzec_artykulu("26f"), "PIT"),
            # --- dodatkowe (recall, zwłaszcza rekordy migrowane z SIP) ---
            Regula("ulga badawczo-rozwojowa", wzorzec_artykulu("18d"), "CIT", typ="dodatkowa"),
            Regula("działalność badawczo-rozwojowa", wzorzec_artykulu("18d"), "CIT", typ="dodatkowa"),
            Regula("koszty kwalifikowane działalności badawczo-rozwojowej", wzorzec_artykulu("18d"), "CIT", typ="dodatkowa"),
            Regula("centrum badawczo-rozwojowe", wzorzec_artykulu("18d"), "CIT", typ="dodatkowa"),
            Regula("zwrot gotówkowy ulgi B+R", wzorzec_artykulu("18da"), "CIT", typ="dodatkowa"),
            Regula("prace rozwojowe", wzorzec_artykulu("26e"), "PIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "innowacyjni_pracownicy": Profil(
        klucz="innowacyjni_pracownicy",
        nazwa="Ulga na innowacyjnych pracowników",
        opis="Pomniejszenie zaliczek na PIT od wynagrodzeń pracowników "
             "zaangażowanych w B+R — dla podatników z nieodliczoną ulgą B+R.",
        podstawa_prawna="art. 18db ustawy o CIT; art. 26eb ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=2,
        reguly=(
            Regula("art. 18db", wzorzec_artykulu("18db"), "CIT"),
            Regula("art. 26eb", wzorzec_artykulu("26eb"), "PIT"),
            Regula("ulga na innowacyjnych pracowników", wzorzec_artykulu("18db"), "CIT", typ="dodatkowa"),
            Regula("pomniejszenie zaliczek na podatek dochodowy", wzorzec_artykulu("18db"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_prototyp": Profil(
        klucz="ulga_prototyp",
        nazwa="Ulga na prototyp",
        opis="Koszty produkcji próbnej nowego produktu i wprowadzenia go na rynek.",
        podstawa_prawna="art. 18ea ustawy o CIT; art. 26ga ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=3,
        reguly=(
            Regula("art. 18ea", wzorzec_artykulu("18ea"), "CIT"),
            Regula("art. 26ga", wzorzec_artykulu("26ga"), "PIT"),
            Regula("ulga na prototyp", wzorzec_artykulu("18ea"), "CIT", typ="dodatkowa"),
            Regula("produkcja próbna nowego produktu", wzorzec_artykulu("18ea"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_prowzrostowa": Profil(
        klucz="ulga_prowzrostowa",
        nazwa="Ulga prowzrostowa (na ekspansję)",
        opis="Koszty zwiększenia przychodów ze sprzedaży produktów (targi, "
             "certyfikacja, działania promocyjne, dostosowanie opakowań).",
        podstawa_prawna="art. 18eb ustawy o CIT; art. 26gb ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=3,
        reguly=(
            Regula("art. 18eb", wzorzec_artykulu("18eb"), "CIT"),
            Regula("art. 26gb", wzorzec_artykulu("26gb"), "PIT"),
            Regula("ulga na ekspansję", wzorzec_artykulu("18eb"), "CIT", typ="dodatkowa"),
            Regula("ulga prowzrostowa", wzorzec_artykulu("18eb"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_termomodernizacyjna": Profil(
        klucz="ulga_termomodernizacyjna",
        nazwa="Ulga termomodernizacyjna",
        opis="Wydatki na przedsięwzięcie termomodernizacyjne w budynku "
             "mieszkalnym jednorodzinnym — ulga wyłącznie w PIT.",
        podstawa_prawna="art. 26h ustawy o PIT",
        podatek="PIT",
        folder=None,
        priorytet=5,
        reguly=(
            Regula("art. 26h", wzorzec_artykulu("26h"), "PIT"),
            Regula("ulga termomodernizacyjna", wzorzec_artykulu("26h"), "PIT", typ="dodatkowa"),
            Regula("przedsięwzięcie termomodernizacyjne", wzorzec_artykulu("26h"), "PIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_konsolidacyjna": Profil(
        klucz="ulga_konsolidacyjna",
        nazwa="Ulga konsolidacyjna",
        opis="Odliczenie wydatków na nabycie udziałów/akcji spółki z "
             "osobowością prawną. WYŁĄCZNIE CIT — potwierdzone w kilku "
             "niezależnych źródłach (dostępna tylko dla „podatnika będącego "
             "przedsiębiorcą” nabywającego udziały w spółce kapitałowej; brak "
             "odpowiednika w PIT), więc profil celowo nie ma reguł PIT.",
        podstawa_prawna="art. 18ec ustawy o CIT",
        podatek="CIT",
        folder=None,
        priorytet=4,
        reguly=(
            Regula("art. 18ec", wzorzec_artykulu("18ec"), "CIT"),
            Regula("ulga konsolidacyjna", wzorzec_artykulu("18ec"), "CIT", typ="dodatkowa"),
            Regula("nabycie udziałów lub akcji w spółce", wzorzec_artykulu("18ec"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_csr": Profil(
        klucz="ulga_csr",
        nazwa="Ulga na CSR (sponsoringowa: sport, kultura, nauka)",
        opis="Koszty wsparcia działalności sportowej, kulturalnej oraz "
             "wspierającej szkolnictwo wyższe i naukę.",
        podstawa_prawna="art. 18ee ustawy o CIT; art. 26ha ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=4,
        reguly=(
            Regula("art. 18ee", wzorzec_artykulu("18ee"), "CIT"),
            Regula("art. 26ha", wzorzec_artykulu("26ha"), "PIT"),
            Regula("ulga sponsoringowa", wzorzec_artykulu("18ee"), "CIT", typ="dodatkowa"),
            Regula("ulga na działalność sportową kulturalną", wzorzec_artykulu("18ee"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "estonski_cit": Profil(
        klucz="estonski_cit",
        nazwa="Estoński CIT (ryczałt od dochodów spółek, rozdział 6b)",
        opis="Ryczałt od dochodów spółek — warunki wejścia/wyjścia, ukryte "
             "zyski, dochód z tytułu podzielonego zysku, korekta wstępna. "
             "Zakres art. 28c–28t obejmuje z definicji każdy artykuł "
             "rozdziału, więc dodatkowe frazy tematyczne poniżej służą "
             "wyłącznie zwiększeniu recall na starszych/niedoprecyzowanych "
             "rekordach — nie zawężają zakresu wzorca głównego.",
        podstawa_prawna="art. 28c–28t ustawy o CIT (rozdział 6b)",
        podatek="CIT",
        folder="Estoński CIT",   # <- OSOBNY FOLDER, niezależnie od roku (zgodnie z Twoją instrukcją)
        priorytet=1,
        reguly=(
            Regula("ryczałt od dochodów spółek", wzorzec_zakresu("28", "c", "t"), "CIT"),
            Regula("estoński CIT", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("ukryte zyski", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("dochód z tytułu ukrytych zysków", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("dochód z tytułu podzielonego zysku", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("wstępna korekta przychodów i kosztów", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("dochód z tytułu zmiany wartości składników majątku", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("wydatki niezwiązane z działalnością gospodarczą", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
            Regula("warunki opodatkowania ryczałtem od dochodów spółek", wzorzec_zakresu("28", "c", "t"), "CIT", typ="dodatkowa"),
        ),
        # "ryczałt od przychodów ewidencjonowanych" to CAŁKOWICIE inny reżim
        # (zryczałtowany PIT osób fizycznych) — samo słowo "ryczałt" bywa
        # niejednoznaczne, więc dodatkowe zabezpieczenie na poziomie treści.
        frazy_wykluczajace=("ryczałt od przychodów ewidencjonowanych", "karta podatkowa"),
    ),

    # -----------------------------------------------------------------
    # NOWE PROFILE PONIŻEJ
    # -----------------------------------------------------------------
    "ulga_robotyzacja": Profil(
        klucz="ulga_robotyzacja",
        nazwa="Ulga na robotyzację",
        opis="Odliczenie 50% kosztów uzyskania przychodów poniesionych na "
             "robotyzację (roboty przemysłowe, urządzenia peryferyjne, "
             "oprogramowanie, szkolenia). Rozwiązanie CZASOWE: dotyczy "
             "kosztów poniesionych w latach podatkowych 2022–2026, więc "
             "obecnie (2026) jest to bardzo aktualny temat — spodziewaj się "
             "wzmożonego orzecznictwa/interpretacji o zamykającym charakter "
             "uldze w tym i przyszłym roku.",
        podstawa_prawna="art. 38eb ustawy o CIT; art. 52jb ustawy o PIT",
        podatek="CIT+PIT",
        folder=None,
        priorytet=2,
        reguly=(
            Regula("art. 38eb", wzorzec_artykulu("38eb"), "CIT"),
            Regula("art. 52jb", wzorzec_artykulu("52jb"), "PIT"),
            Regula("ulga na robotyzację", wzorzec_artykulu("38eb"), "CIT", typ="dodatkowa"),
            Regula("robot przemysłowy", wzorzec_artykulu("38eb"), "CIT", typ="dodatkowa"),
            Regula("urządzenia peryferyjne robota przemysłowego", wzorzec_artykulu("38eb"), "CIT", typ="dodatkowa"),
            Regula("koszty poniesione na robotyzację", wzorzec_artykulu("38eb"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ulga_ipo": Profil(
        klucz="ulga_ipo",
        nazwa="Ulga na IPO (emisyjna)",
        opis="Odliczenie wydatków na przygotowanie prospektu emisyjnego i "
             "doradztwo prawne/finansowe związane z pierwszą ofertą "
             "publiczną akcji. Dotyczy spółek akcyjnych wchodzących na "
             "giełdę — WYŁĄCZNIE CIT, bez odpowiednika w PIT.",
        podstawa_prawna="art. 18ed ustawy o CIT",
        podatek="CIT",
        folder=None,
        priorytet=5,
        reguly=(
            Regula("art. 18ed", wzorzec_artykulu("18ed"), "CIT"),
            Regula("ulga na pierwszą ofertę publiczną", wzorzec_artykulu("18ed"), "CIT", typ="dodatkowa"),
            Regula("ulga na IPO", wzorzec_artykulu("18ed"), "CIT", typ="dodatkowa"),
            Regula("ulga emisyjna", wzorzec_artykulu("18ed"), "CIT", typ="dodatkowa"),
            Regula("prospekt emisyjny", wzorzec_artykulu("18ed"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ip_box_cit": Profil(
        klucz="ip_box_cit",
        nazwa="IP Box — CIT (kwalifikowane prawa własności intelektualnej)",
        opis="Opodatkowanie 5% stawką kwalifikowanego dochodu z kwalifikowanych "
             "praw własności intelektualnej (patenty, wzory użytkowe/przemysłowe, "
             "autorskie prawo do programu komputerowego itd.) oraz obowiązek "
             "prowadzenia odrębnej ewidencji. Numery artykułów potwierdzone "
             "objaśnieniami podatkowymi MF z 15 lipca 2019 r.",
        podstawa_prawna="art. 24d, 24e ustawy o CIT",
        podatek="CIT",
        folder=None,
        priorytet=1,
        reguly=(
            # --- obowiązkowe: cytaty wprost ---
            Regula("art. 24d", wzorzec_artykulu("24d"), "CIT"),
            Regula("art. 24e", wzorzec_artykulu("24e"), "CIT"),
            # --- dodatkowe: terminologia IP Box (ogólna) ---
            Regula("IP Box", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("Innovation Box", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("kwalifikowane prawo własności intelektualnej", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("kwalifikowane prawa własności intelektualnej", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("kwalifikowany dochód z kwalifikowanego prawa własności intelektualnej", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("wskaźnik nexus", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("preferencyjna stawka 5%", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("opodatkowanie stawką 5% dochodu z kwalifikowanych praw własności intelektualnej", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("odrębna ewidencja kwalifikowanych praw własności intelektualnej", wzorzec_artykulu("24e"), "CIT", typ="dodatkowa"),
            # --- dodatkowe: katalog kwalifikowanych IP (art. 24d ust. 2) ---
            Regula("autorskie prawo do programu komputerowego", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("prawo ochronne na wzór użytkowy", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("prawo z rejestracji wzoru przemysłowego", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("dodatkowe prawo ochronne dla patentu", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("wyłączne prawo hodowcy do odmiany rośliny", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            # --- dodatkowe: typowe branże/podmioty (programiści, gry) ---
            Regula("działalność programistyczna", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("wytwarzanie oprogramowania komputerowego", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("gra komputerowa", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
            Regula("sprzedaż licencji do programu komputerowego", wzorzec_artykulu("24d"), "CIT", typ="dodatkowa"),
        ),
    ),

    # -----------------------------------------------------------------
    "ip_box_pit": Profil(
        klucz="ip_box_pit",
        nazwa="IP Box — PIT (kwalifikowane prawa własności intelektualnej)",
        opis="Odpowiednik ulgi IP Box w PIT — najczęściej programiści na "
             "jednoosobowej działalności gospodarczej (kontrakty B2B). "
             "Numery artykułów potwierdzone objaśnieniami podatkowymi MF "
             "z 15 lipca 2019 r. (art. 30ca i 30cb ustawy o PIT).",
        podstawa_prawna="art. 30ca, 30cb ustawy o PIT",
        podatek="PIT",
        folder=None,
        priorytet=1,
        reguly=(
            Regula("art. 30ca", wzorzec_artykulu("30ca"), "PIT"),
            Regula("art. 30cb", wzorzec_artykulu("30cb"), "PIT"),
            Regula("IP Box", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("kwalifikowane prawo własności intelektualnej", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("kwalifikowane prawa własności intelektualnej", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("wskaźnik nexus", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("preferencyjna stawka 5%", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("odrębna ewidencja kwalifikowanych praw własności intelektualnej", wzorzec_artykulu("30cb"), "PIT", typ="dodatkowa"),
            Regula("autorskie prawo do programu komputerowego", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("programista jednoosobowa działalność gospodarcza", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("działalność programistyczna", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("umowa B2B programista", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("wytwarzanie oprogramowania komputerowego", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
            Regula("gra komputerowa", wzorzec_artykulu("30ca"), "PIT", typ="dodatkowa"),
        ),
    ),
}


# Kolejność domyślna (używana, gdy uruchomisz bota bez wskazania profilu) —
# priorytet rosnąco, potem klucz alfabetycznie, dla stabilnej kolejności.
PROFILE_DO_PRZETWORZENIA: list[str] = [
    k for k, _ in sorted(PROFILE.items(), key=lambda kv: (kv[1].priorytet, kv[0]))
]


def sprawdz_profile() -> list[str]:
    """Samokontrola definicji na starcie: unikalne klucze regul (fraza,
    wzorzec musi się kompilować), niepuste nazwy/podstawy prawnej. Zwraca
    listę ostrzeżeń (pusta = wszystko OK). Wołane raz z main.py."""
    ostrzezenia: list[str] = []
    for klucz, profil in PROFILE.items():
        if klucz != profil.klucz:
            ostrzezenia.append(f"{klucz}: klucz słownika != profil.klucz ({profil.klucz})")
        if not profil.reguly:
            ostrzezenia.append(f"{klucz}: brak reguł wyszukiwania")
        for r in profil.reguly:
            try:
                re.compile(r.wzorzec)
            except re.error as e:
                ostrzezenia.append(f"{klucz}: nieprawidłowy regex w regule '{r.fraza}': {e}")
            if r.ustawa not in ("CIT", "PIT"):
                ostrzezenia.append(f"{klucz}: nieznana ustawa '{r.ustawa}' w regule '{r.fraza}'")
    return ostrzezenia
