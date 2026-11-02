import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Pionowe ilustracje scen (płótno 900×1200) w barwach grafit i złoto.
// Najważniejsze elementy mieszczą się w górnych ~1000 px płótna – niżej wchodzą napisy.
// Każda ilustracja dostaje długość swojej sceny w klatkach (dlugosc), liczy klatki od początku sceny.

export type IlustracjaProps = { dlugosc: number };

const ZLOTO = "#DAA73C";
const ZLOTO_CIEMNE = "#A9802A";
const GRAFIT = "#15161B";
const PANEL = "#20222A";
const SZARY = "#2C2F3A";
const SZARY_JASNY = "#3A3D48";
const LINIA = "#5C6170";
const BIEL = "#FFFFFF";
const PAPIER = "#F4F1EA";
const LINIE_PAPIER = "#C9C6BE";
const CZERWONY = "#C0392B";
const SKORA = "#D9B89A";

const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const wejscie = (frame: number, fps: number, opoznienie = 0) =>
  spring({ frame: frame - opoznienie, fps, config: { damping: 14 } });

const Dokument: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  tytul?: string;
  linie?: number;
  obrot?: number;
  puste?: number;
  skala?: number;
}> = ({ x, y, w, h, tytul, linie = 5, obrot = 0, puste, skala = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${skala}) rotate(${obrot} ${w / 2} ${h / 2})`}>
    <rect width={w} height={h} rx="12" fill={PAPIER} />
    {tytul && (
      <>
        <text x={w / 2} y={60} textAnchor="middle" fontSize={Math.min(36, (w - 40) / (tytul.length * 0.72))} fontWeight="800" fill={GRAFIT}>
          {tytul}
        </text>
        <rect x={w / 2 - 50} y={76} width="100" height="5" fill={ZLOTO} />
      </>
    )}
    {Array.from({ length: linie }).map((_, i) => (
      <rect
        key={i}
        x={30}
        y={(tytul ? 110 : 40) + i * 40}
        width={w - 60 - (i % 3) * 50}
        height={12}
        rx={6}
        fill={i === puste ? "transparent" : LINIE_PAPIER}
      />
    ))}
  </g>
);

// Budynek sądu w polu 500×430
const Sad: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 120 L250 0 L500 120 Z" fill={SZARY} stroke={ZLOTO} strokeWidth="5" strokeLinejoin="round" />
    <text x="250" y="98" textAnchor="middle" fontSize="44" fontWeight="800" fill={ZLOTO}>
      SĄD
    </text>
    <rect x="10" y="120" width="480" height="32" fill={SZARY_JASNY} />
    {[40, 130, 330, 420].map((cx) => (
      <rect key={cx} x={cx} y="152" width="44" height="248" fill="#D9D5CC" />
    ))}
    <rect x="195" y="200" width="110" height="200" rx="6" fill={GRAFIT} stroke={LINIA} strokeWidth="4" />
    <rect x="0" y="400" width="500" height="30" fill={SZARY_JASNY} />
  </g>
);

// 1. Czołem, druhowie! – remiza nocą, okna się zapalają, flaga powiewa
const Remiza: React.FC<IlustracjaProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const okno = (i: number) => interpolate(frame, [6 + i * 5, 12 + i * 5], [0.15, 1], zakres);
  const fala = Math.sin(frame / 5) * 10;
  return (
    <g>
      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={i} cx={(i * 211) % 880 + 10} cy={40 + ((i * 97) % 220)} r={2 + (i % 3)} fill={BIEL} opacity={0.25 + 0.25 * Math.sin(frame / 9 + i)} />
      ))}
      <g transform={`translate(0 ${(1 - w) * 80})`} opacity={w}>
        {/* Wieża */}
        <rect x="110" y="250" width="140" height="440" fill={SZARY} />
        <path d="M90 262 L180 170 L270 262 Z" fill={SZARY_JASNY} />
        <rect x="150" y="300" width="60" height="80" rx="4" fill={ZLOTO} opacity={okno(0)} />
        {/* Budynek */}
        <rect x="220" y="470" width="540" height="480" fill={SZARY} />
        <path d="M190 482 L490 300 L790 482 Z" fill={SZARY_JASNY} />
        <rect x="380" y="505" width="220" height="74" rx="8" fill={GRAFIT} stroke={ZLOTO} strokeWidth="4" />
        <text x="490" y="557" textAnchor="middle" fontSize="44" fontWeight="800" fill={ZLOTO}>
          OSP
        </text>
        {[270, 510].map((x, i) => (
          <g key={x}>
            <rect x={x} y="620" width="200" height="330" fill="#7E2620" />
            {[670, 730, 790, 850, 910].map((yy) => (
              <rect key={yy} x={x} y={yy} width="200" height="6" fill="#5E1C18" />
            ))}
            <rect x={x + 20} y="640" width="160" height="22" rx="3" fill={ZLOTO} opacity={okno(i + 1) * 0.7} />
          </g>
        ))}
        {/* Maszt z flagą */}
        <rect x="800" y="200" width="8" height="750" fill={LINIA} />
        <path d={`M808 210 Q845 ${200 + fala} 880 210 L880 250 Q845 ${240 + fala} 808 250 Z`} fill={BIEL} />
        <path d={`M808 250 Q845 ${240 + fala} 880 250 L880 290 Q845 ${280 + fala} 808 290 Z`} fill="#D4213D" />
      </g>
      <rect x="0" y="950" width="900" height="10" fill={SZARY_JASNY} />
    </g>
  );
};

// 2. Walne za wami, nowy zarząd wybrany, kawa wypita – druhowie przy stole, ręce w górę, kawa paruje
const Sala: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const baner = wejscie(frame, fps);
  return (
    <g>
      <g opacity={baner} transform={`translate(0 ${(1 - baner) * -40})`}>
        <rect x="130" y="110" width="640" height="100" rx="12" fill={PANEL} stroke={ZLOTO} strokeWidth="4" />
        <text x="450" y="177" textAnchor="middle" fontSize="44" fontWeight="800" fill={ZLOTO}>
          WALNE ZEBRANIE
        </text>
      </g>
      {[170, 360, 550, 740].map((x, i) => {
        const w = wejscie(frame, fps, 4 + i * 4);
        const reka = i % 2 === 0 ? interpolate(frame, [dlugosc * 0.25 + i * 4, dlugosc * 0.25 + i * 4 + 8], [0, 1], zakres) : 0;
        return (
          <g key={x} transform={`translate(0 ${(1 - w) * 60})`} opacity={w}>
            <g transform={`rotate(${-150 * reka} ${x + 70} 560)`}>
              <rect x={x + 50} y="550" width="40" height="150" rx="20" fill="#2F3240" />
              <circle cx={x + 70} cy="710" r="24" fill={SKORA} />
            </g>
            <path d={`M${x - 90} 700 L${x - 90} 600 Q${x} 520 ${x + 90} 600 L${x + 90} 700 Z`} fill="#2F3240" />
            <circle cx={x - 30} cy="630" r="6" fill={ZLOTO} />
            <circle cx={x} cy="460" r="64" fill={SKORA} />
            <path d={`M${x - 64} 450 Q${x} 370 ${x + 64} 450 Q${x} 420 ${x - 64} 450 Z`} fill="#6E6A66" />
          </g>
        );
      })}
      <rect x="40" y="690" width="820" height="54" rx="8" fill="#5A4632" />
      <rect x="80" y="744" width="26" height="210" fill="#43341F" />
      <rect x="794" y="744" width="26" height="210" fill="#43341F" />
      {[230, 420, 610, 790].map((x, i) => (
        <g key={x}>
          <rect x={x - 32} y="612" width="64" height="78" rx="8" fill={BIEL} />
          <path d={`M${x + 32} 630 q28 0 28 22 q0 22 -28 22`} stroke={BIEL} strokeWidth="8" fill="none" />
          <path d={`M${x - 8} 598 q-12 -24 0 -48 q12 -24 0 -48`} stroke={ZLOTO} strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.35 + 0.35 * Math.sin(frame / 8 + i)} />
        </g>
      ))}
      <rect x="300" y="660" width="90" height="30" rx="3" fill={PAPIER} transform="rotate(-6 345 675)" />
    </g>
  );
};

// 3. I wielu myśli, że na tym koniec – duży dymek „KONIEC?”
const Koniec: React.FC<IlustracjaProps> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const pytajnik = 1 + Math.sin(frame / 6) * 0.08;
  return (
    <g transform={`translate(450 520) scale(${w}) translate(-450 -520)`}>
      <path
        d="M110 300 Q110 200 210 200 L690 200 Q790 200 790 300 L790 700 Q790 800 690 800 L400 800 L280 940 L300 800 L210 800 Q110 800 110 700 Z"
        fill={PANEL}
        stroke={ZLOTO}
        strokeWidth="8"
      />
      <text x="395" y="555" textAnchor="middle" fontSize="118" fontWeight="800" fill={BIEL}>
        KONIEC
      </text>
      <text x="705" y="565" textAnchor="middle" fontSize={170 * pytajnik} fontWeight="800" fill={ZLOTO}>
        ?
      </text>
    </g>
  );
};

// 4. Że wystarczy wysłać do sądu listę nowych nazwisk – lista leci łukiem do sądu
const ListaLeci: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [dlugosc * 0.15, dlugosc * 0.75], [0, 1], zakres);
  const x = interpolate(t, [0, 1], [90, 390]);
  const y = interpolate(t, [0, 1], [700, 330]) - Math.sin(t * Math.PI) * 180;
  return (
    <g>
      <Sad x={200} y={120} />
      <Dokument x={x} y={y} w={240} h={300} tytul="LISTA" linie={4} obrot={t * 30 - 12} skala={1 - t * 0.55} />
    </g>
  );
};

// 5. Niestety, druhu. Tak to nie działa – lista odbija się od drzwi i zostaje przekreślona
const Odbicie: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, dlugosc * 0.3], [0, 1], zakres);
  const x = interpolate(t, [0, 1], [390, 300]);
  const y = interpolate(t, [0, 1], [330, 600]) - Math.sin(t * Math.PI) * 120;
  const skala = interpolate(t, [0, 1], [0.45, 1]);
  const kreska = interpolate(frame, [dlugosc * 0.4, dlugosc * 0.6], [0, 1], zakres);
  return (
    <g>
      <Sad x={200} y={120} />
      <g transform={`translate(${x} ${y}) scale(${skala})`}>
        <Dokument x={0} y={0} w={300} h={370} tytul="LISTA" linie={6} obrot={-10} />
        <line x1="-20" y1="-20" x2={-20 + 340 * kreska} y2={-20 + 410 * kreska} stroke={CZERWONY} strokeWidth="24" strokeLinecap="round" />
        <line x1="320" y1="-20" x2={320 - 340 * kreska} y2={-20 + 410 * kreska} stroke={CZERWONY} strokeWidth="24" strokeLinecap="round" />
      </g>
    </g>
  );
};

// 6. Wniosek do KRS przez internet, nie na papierze – laptop z formularzem, przekreślona kartka
const Laptop: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const pola = [0, 1, 2, 3].map((i) => interpolate(frame, [dlugosc * (0.1 + i * 0.1), dlugosc * (0.18 + i * 0.1)], [0, 1], zakres));
  const papier = wejscie(frame, fps, Math.round(dlugosc * 0.62));
  const kreska = interpolate(frame, [dlugosc * 0.72, dlugosc * 0.85], [0, 1], zakres);
  return (
    <g>
      <g opacity={w} transform={`translate(450 420) scale(${0.9 + 0.1 * w}) translate(-450 -420)`}>
        <rect x="90" y="120" width="720" height="500" rx="26" fill={SZARY} />
        <rect x="118" y="148" width="664" height="444" rx="10" fill="#1A1C23" />
        <rect x="118" y="148" width="664" height="76" rx="10" fill={ZLOTO} />
        <text x="148" y="200" fontSize="36" fontWeight="800" fill={GRAFIT}>
          KRS · wniosek online
        </text>
        {pola.map((p, i) => (
          <g key={i}>
            <rect x="150" y={256 + i * 80} width="600" height="56" rx="10" fill={SZARY} stroke={LINIA} strokeWidth="2" />
            <rect x="170" y={278 + i * 80} width={420 * p} height="12" rx="6" fill={BIEL} />
          </g>
        ))}
        <path d="M40 620 L860 620 L810 690 L90 690 Z" fill={SZARY_JASNY} />
      </g>
      <g opacity={papier} transform={`translate(450 830) scale(${papier}) translate(-450 -830)`}>
        <Dokument x={360} y={730} w={180} h={220} linie={4} />
        <line x1="340" y1="720" x2={340 + 220 * kreska} y2={720 + 250 * kreska} stroke={CZERWONY} strokeWidth="18" strokeLinecap="round" />
        <line x1="560" y1="720" x2={560 - 220 * kreska} y2={720 + 250 * kreska} stroke={CZERWONY} strokeWidth="18" strokeLinecap="round" />
      </g>
    </g>
  );
};

// 7. Do wniosku dokumenty z walnego: protokół i uchwały wylatują z teczki
const Teczka: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const otw = interpolate(frame, [4, 16], [0, 1], zakres);
  const d1 = wejscie(frame, fps, Math.round(dlugosc * 0.45));
  const d2 = wejscie(frame, fps, Math.round(dlugosc * 0.7));
  return (
    <g>
      <Dokument x={110} y={560 - d1 * 430} w={320} h={430} tytul="PROTOKÓŁ" linie={7} obrot={-7 * d1} />
      <Dokument x={470} y={560 - d2 * 400} w={320} h={430} tytul="UCHWAŁY" linie={7} obrot={7 * d2} />
      <rect x="110" y="680" width="680" height="290" rx="18" fill={ZLOTO_CIEMNE} />
      <path d={`M110 680 L790 680 L${790 - 50 * otw} ${680 - 130 * otw} L${110 + 50 * otw} ${680 - 130 * otw} Z`} fill={ZLOTO} />
      <rect x="400" y="790" width="100" height="16" rx="8" fill={GRAFIT} opacity="0.35" />
    </g>
  );
};

// 8. Jeśli w protokole czegoś brakuje, sąd wniosek odrzuci – pusta linijka i pieczęć ODRZUCONO
const Brak: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const puls = interpolate(frame, [dlugosc * 0.15, dlugosc * 0.3], [0, 1], zakres) * (0.75 + 0.25 * Math.sin(frame / 4));
  const pieczec = interpolate(frame, [dlugosc * 0.62, dlugosc * 0.72], [2.2, 1], zakres);
  const pieczecWidac = frame >= dlugosc * 0.62 ? 1 : 0;
  const yLinii = 60 + 110 + 8 * 40;
  return (
    <g opacity={w}>
      <Dokument x={170} y={60} w={560} h={860} tytul="PROTOKÓŁ" linie={18} puste={8} />
      <rect x="184" y={yLinii - 14} width="532" height="40" rx="8" fill={CZERWONY} opacity={0.3 * puls} stroke={CZERWONY} strokeWidth="5" strokeOpacity={puls} />
      <g opacity={puls}>
        <circle cx="790" cy={yLinii + 6} r="46" fill={CZERWONY} />
        <text x="790" y={yLinii + 36} textAnchor="middle" fontSize="80" fontWeight="800" fill={BIEL}>
          !
        </text>
      </g>
      <g opacity={pieczecWidac} transform={`translate(450 760) rotate(-14) scale(${pieczec})`}>
        <rect x="-250" y="-62" width="500" height="124" rx="14" fill="none" stroke={CZERWONY} strokeWidth="10" />
        <text x="0" y="26" textAnchor="middle" fontSize="70" fontWeight="800" fill={CZERWONY}>
          ODRZUCONO
        </text>
      </g>
    </g>
  );
};

// 9. Tylko siedem dni od zmiany – zrywany kalendarz 7 → 1
const Kalendarz: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const naKartke = Math.min(14, (dlugosc * 0.75) / 6);
  return (
    <g>
      <rect x="170" y="110" width="560" height="800" rx="26" fill={PAPIER} />
      <rect x="170" y="110" width="560" height="160" rx="26" fill={ZLOTO} />
      <rect x="170" y="230" width="560" height="40" fill={ZLOTO} />
      {[300, 600].map((x) => (
        <rect key={x} x={x - 14} y="80" width="28" height="70" rx="14" fill={LINIA} />
      ))}
      <text x="450" y="215" textAnchor="middle" fontSize="60" fontWeight="800" fill={GRAFIT}>
        TERMIN
      </text>
      {Array.from({ length: 7 })
        .map((_, i) => {
          const dzien = 7 - i;
          const start = 10 + i * naKartke;
          const t = interpolate(frame, [start, start + naKartke], [0, 1], zakres);
          if (dzien === 1) {
            return (
              <g key={i}>
                <text x="450" y="690" textAnchor="middle" fontSize="380" fontWeight="800" fill={CZERWONY}>
                  1
                </text>
                <text x="450" y="830" textAnchor="middle" fontSize="54" fontWeight="800" fill={GRAFIT}>
                  dzień
                </text>
              </g>
            );
          }
          return (
            <g key={i} transform={`translate(${t * 320} ${t * -240}) rotate(${t * -35} 450 590)`} opacity={t > 0 ? 1 - t * t : 1} display={t >= 1 ? "none" : undefined}>
              <rect x="186" y="272" width="528" height="624" fill={PAPIER} />
              <text x="450" y="690" textAnchor="middle" fontSize="380" fontWeight="800" fill={GRAFIT}>
                {dzien}
              </text>
              <text x="450" y="830" textAnchor="middle" fontSize="54" fontWeight="800" fill={LINIA}>
                dni
              </text>
            </g>
          );
        })
        .reverse()}
    </g>
  );
};

// 10. Nowy zarząd + dobry protokół = wpis w KRS – trzy karty wchodzą po kolei
const Rownanie: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = (ulamek: number) => wejscie(frame, fps, Math.round(dlugosc * ulamek));
  const [k1, plus, k2, rowna, k3] = [k(0.05), k(0.25), k(0.32), k(0.55), k(0.62)];
  return (
    <g>
      <g opacity={k1} transform={`translate(${(1 - k1) * -120} 0)`}>
        <rect x="90" y="70" width="720" height="220" rx="26" fill={PANEL} stroke={SZARY_JASNY} strokeWidth="4" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={170 + i * 46} cy="160" r="24" fill={ZLOTO} />
            <path d={`M${140 + i * 46} 225 Q${170 + i * 46} 180 ${200 + i * 46} 225 Z`} fill={ZLOTO} />
          </g>
        ))}
        <text x="330" y="200" fontSize="54" fontWeight="800" fill={BIEL}>
          NOWY ZARZĄD
        </text>
      </g>
      <text x="450" y="390" textAnchor="middle" fontSize="110" fontWeight="800" fill={ZLOTO} opacity={plus}>
        +
      </text>
      <g opacity={k2} transform={`translate(${(1 - k2) * 120} 0)`}>
        <rect x="90" y="430" width="720" height="220" rx="26" fill={PANEL} stroke={SZARY_JASNY} strokeWidth="4" />
        <rect x="140" y="470" width="110" height="140" rx="10" fill={PAPIER} />
        {[500, 528, 556].map((y) => (
          <rect key={y} x="158" y={y} width="74" height="10" rx="5" fill={LINIE_PAPIER} />
        ))}
        <circle cx="240" cy="600" r="30" fill={ZLOTO} />
        <path d="M226 600 L237 612 L256 590" stroke={GRAFIT} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="290" y="560" fontSize="50" fontWeight="800" fill={BIEL}>
          DOBRY PROTOKÓŁ
        </text>
      </g>
      <text x="450" y="760" textAnchor="middle" fontSize="110" fontWeight="800" fill={ZLOTO} opacity={rowna}>
        =
      </text>
      <g transform={`translate(450 900) scale(${k3}) translate(-450 -900)`}>
        <rect x="90" y="800" width="720" height="200" rx="26" fill={ZLOTO} />
        <g transform="translate(190 900)">
          <rect x="-46" y="10" width="92" height="40" rx="8" fill={GRAFIT} />
          <rect x="-16" y="-50" width="32" height="64" rx="10" fill={GRAFIT} />
          <circle cx="0" cy="-58" r="22" fill={GRAFIT} />
        </g>
        <text x="300" y="922" fontSize="64" fontWeight="800" fill={GRAFIT}>
          WPIS W KRS
        </text>
      </g>
    </g>
  );
};

// 11. Zajrzyjcie na doradztwodlaosp.pl – telefon ze stroną i duży adres
const Adres: React.FC<IlustracjaProps> = ({ dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const adres = wejscie(frame, fps, Math.round(dlugosc * 0.45));
  const klik = interpolate(frame, [dlugosc * 0.3, dlugosc * 0.5], [0, 1], zakres);
  return (
    <g>
      <g transform={`translate(0 ${(1 - w) * 300})`} opacity={w}>
        <rect x="250" y="40" width="400" height="780" rx="56" fill="#0E0F13" stroke={SZARY_JASNY} strokeWidth="6" />
        <rect x="270" y="90" width="360" height="690" rx="16" fill={PAPIER} />
        <rect x="290" y="110" width="320" height="48" rx="24" fill="#E2DED4" />
        <text x="450" y="142" textAnchor="middle" fontSize="22" fontWeight="700" fill={GRAFIT}>
          doradztwodlaosp.pl
        </text>
        <rect x="270" y="180" width="360" height="150" fill={GRAFIT} />
        <text x="450" y="245" textAnchor="middle" fontSize="28" fontWeight="800" fill={ZLOTO}>
          Doradztwo
        </text>
        <text x="450" y="285" textAnchor="middle" fontSize="28" fontWeight="800" fill={BIEL}>
          dla OSP
        </text>
        {[370, 405, 440, 475, 510].map((y, i) => (
          <rect key={y} x="300" y={y} width={300 - (i % 2) * 70} height="12" rx="6" fill={LINIE_PAPIER} />
        ))}
        <rect x="310" y="640" width="280" height="70" rx="35" fill={ZLOTO} />
        <text x="450" y="684" textAnchor="middle" fontSize="24" fontWeight="800" fill={GRAFIT}>
          Umów konsultację
        </text>
        <circle cx="450" cy="675" r={20 + klik * 90} fill="none" stroke={ZLOTO} strokeWidth="6" opacity={klik > 0 && klik < 1 ? 1 - klik : 0} />
      </g>
      <text x="450" y="930" textAnchor="middle" fontSize="64" fontWeight="800" fill={ZLOTO} opacity={adres} transform={`translate(0 ${(1 - adres) * 40})`}>
        doradztwodlaosp.pl
      </text>
    </g>
  );
};

export const ILUSTRACJE_PION: Record<string, React.FC<IlustracjaProps>> = {
  remiza: Remiza,
  sala: Sala,
  koniec: Koniec,
  "lista-do-sadu": ListaLeci,
  odrzucenie: Odbicie,
  "laptop-krs": Laptop,
  teczka: Teczka,
  "brak-w-protokole": Brak,
  "kalendarz-7-dni": Kalendarz,
  "plansza-zarzad-protokol-wpis": Rownanie,
  adres: Adres,
};
