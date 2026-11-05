// Odcinek próbny: "Nowy zarząd? Sąd sam się nie dowie"
// Czasy (w sekundach) dopasowane do pauz w nagraniu public/lektor.mp3.
// "tekst" to napis na ekranie (poprawna pisownia, np. KRS), nie tekst dla lektora.

export type Kwestia = {
  start: number;
  koniec: number;
  tekst: string;
};

export const KWESTIE: Kwestia[] = [
  { start: 0.0, koniec: 1.2, tekst: "Czołem, druhowie!" },
  { start: 1.59, koniec: 5.37, tekst: "Walne za wami, nowy zarząd wybrany, kawa wypita." },
  { start: 5.83, koniec: 7.65, tekst: "I wielu myśli, że na tym koniec." },
  { start: 8.15, koniec: 10.98, tekst: "Że wystarczy wysłać do sądu listę nowych nazwisk." },
  { start: 11.55, koniec: 13.96, tekst: "Niestety, druhu. Tak to nie działa." },
  { start: 14.49, koniec: 20.5, tekst: "Zmianę zarządu zgłaszacie wnioskiem do KRS. Przez internet, nie na papierze." },
  { start: 21.19, koniec: 26.43, tekst: "A do wniosku dołączacie dokumenty z walnego, przede wszystkim protokół i uchwały." },
  { start: 27.18, koniec: 31.22, tekst: "Jeśli w protokole czegoś brakuje, sąd wniosek odrzuci." },
  { start: 32.07, koniec: 35.68, tekst: "I jeszcze jedno: macie na to tylko siedem dni od zmiany." },
  { start: 36.27, koniec: 42.1, tekst: "Pamiętajcie: nowy zarząd plus dobry protokół równa się wpis w KRS." },
  { start: 42.52, koniec: 48.92, tekst: "A jak nie wiecie, od czego zacząć, zajrzyjcie na doradztwodlaosp.pl." },
];

export const DLUGOSC_S = 50;
