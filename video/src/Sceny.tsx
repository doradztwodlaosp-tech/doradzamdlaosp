import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Ilustracje do 11 scen. Każda scena liczy klatki od swojego początku.

const CZERWONY = "#c8102e";
const GRANAT = "#1f2a44";
const PAPIER = "#fffdf6";
const TEKST = "#1a1a1a";
const SZARY = "#9aa3b2";

const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const wejscie = (frame: number, fps: number, opoznienie = 0) =>
  spring({ frame: frame - opoznienie, fps, config: { damping: 14 } });

const useWejscie = (opoznienie = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return wejscie(frame, fps, opoznienie);
};

const Kartka: React.FC<{ x: number; y: number; w: number; h: number; tytul?: string; linie?: number; obrot?: number; puste?: number }> = ({
  x, y, w, h, tytul, linie = 4, obrot = 0, puste,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${obrot} ${w / 2} ${h / 2})`}>
    <rect width={w} height={h} rx="10" fill={PAPIER} stroke="#d6d0c0" strokeWidth="3" />
    {tytul && (
      <text x={w / 2} y={44} textAnchor="middle" fontSize="30" fontWeight="800" fill={GRANAT}>
        {tytul}
      </text>
    )}
    {Array.from({ length: linie }).map((_, i) => (
      <rect
        key={i}
        x={24}
        y={(tytul ? 74 : 30) + i * 34}
        width={w - 48 - (i % 2) * 40}
        height={12}
        rx={6}
        fill={i === puste ? "transparent" : "#c9cfd9"}
      />
    ))}
  </g>
);

const Sad: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 90 L150 20 L300 90 Z" fill="#e7e2d6" stroke="#b9b2a0" strokeWidth="4" />
    <rect x="10" y="90" width="280" height="24" fill="#d8d1c1" />
    {[30, 95, 160, 225].map((cx) => (
      <rect key={cx} x={cx} y="114" width="40" height="190" fill="#efeadf" stroke="#b9b2a0" strokeWidth="3" />
    ))}
    <rect x="0" y="304" width="300" height="30" fill="#d8d1c1" />
    <text x="150" y="80" textAnchor="middle" fontSize="34" fontWeight="800" fill={GRANAT}>
      SĄD
    </text>
  </g>
);

// 1. Przed remizą
const Remiza: React.FC = () => {
  const w = useWejscie();
  return (
    <g transform={`translate(0 ${(1 - w) * 60})`} opacity={w}>
      <rect x="150" y="260" width="600" height="380" fill="#f3e6d3" stroke="#c9b79c" strokeWidth="5" />
      <path d="M120 270 L450 120 L780 270 Z" fill="#8c2f2f" />
      <rect x="230" y="380" width="200" height="260" fill={CZERWONY} />
      <rect x="470" y="380" width="200" height="260" fill={CZERWONY} />
      {[420, 470, 520, 570].map((yy) => (
        <g key={yy}>
          <rect x="230" y={yy} width="200" height="6" fill="#a10d24" />
          <rect x="470" y={yy} width="200" height="6" fill="#a10d24" />
        </g>
      ))}
      <rect x="330" y="290" width="240" height="64" rx="8" fill={GRANAT} />
      <text x="450" y="335" textAnchor="middle" fontSize="40" fontWeight="800" fill="#ffffff">
        OSP
      </text>
      <rect x="760" y="100" width="8" height="540" fill="#777" />
      <rect x="768" y="110" width="110" height="36" fill="#ffffff" />
      <rect x="768" y="146" width="110" height="36" fill={CZERWONY} />
    </g>
  );
};

// 2. Sala w remizie, druhowie przy stole, kawa
const Sala: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = useWejscie();
  return (
    <g opacity={w}>
      {[150, 330, 510, 690].map((x, i) => (
        <g key={x} transform={`translate(0 ${(1 - wejscie(frame, fps, i * 4)) * 40})`}>
          <circle cx={x} cy="300" r="55" fill="#f1c7a3" />
          <path d={`M${x - 80} 480 L${x - 80} 405 Q${x} 345 ${x + 80} 405 L${x + 80} 480 Z`} fill={GRANAT} />
        </g>
      ))}
      <rect x="60" y="480" width="780" height="40" rx="10" fill="#8a5a35" />
      <rect x="90" y="520" width="24" height="160" fill="#6b4428" />
      <rect x="786" y="520" width="24" height="160" fill="#6b4428" />
      {[190, 370, 550, 730].map((x, i) => (
        <g key={x}>
          <rect x={x - 26} y="420" width="52" height="60" rx="6" fill="#ffffff" stroke="#ccc" strokeWidth="3" />
          <path d={`M${x + 26} 435 q22 0 22 18 q0 18 -22 18`} stroke="#ccc" strokeWidth="6" fill="none" />
          <path
            d={`M${x - 8} 410 q-10 -20 0 -40 q10 -20 0 -40`}
            stroke="#b9b9b9"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            opacity={0.4 + 0.4 * Math.sin(frame / 8 + i)}
          />
        </g>
      ))}
    </g>
  );
};

// 3. Dymek "Koniec?"
const Koniec: React.FC = () => {
  const w = useWejscie();
  return (
    <g transform={`translate(450 360) scale(${w}) translate(-450 -360)`}>
      <path d="M150 180 Q150 100 240 100 L660 100 Q750 100 750 180 L750 470 Q750 550 660 550 L380 550 L280 660 L300 550 L240 550 Q150 550 150 470 Z" fill="#ffffff" stroke={GRANAT} strokeWidth="8" />
      <text x="450" y="370" textAnchor="middle" fontSize="130" fontWeight="900" fill={GRANAT}>
        Koniec?
      </text>
    </g>
  );
};

// 4. Lista nazwisk leci do sądu
const ListaLeci: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [0, 2 * fps], [0, 1], zakres);
  const x = interpolate(t, [0, 1], [40, 470]);
  const y = 380 - Math.sin(t * Math.PI) * 220;
  return (
    <g>
      <Sad x={560} y={300} />
      <Kartka x={x} y={y} w={180} h={230} tytul="Lista" linie={4} obrot={t * 25 - 10} />
    </g>
  );
};

// 5. Kartka odbija się od sądu, lista przekreślona
const Odbicie: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [0, 0.8 * fps], [0, 1], zakres);
  const x = interpolate(t, [0, 1], [470, 120]);
  const y = 380 + Math.sin(t * Math.PI) * -120 + t * 60;
  const kreska = interpolate(frame, [0.9 * fps, 1.4 * fps], [0, 1], zakres);
  return (
    <g>
      <Sad x={560} y={300} />
      <g transform={`translate(${x} ${y})`}>
        <Kartka x={0} y={0} w={220} h={280} tytul="Lista" linie={5} obrot={-12} />
        <line x1="-10" y1="-10" x2={-10 + 250 * kreska} y2={-10 + 310 * kreska} stroke={CZERWONY} strokeWidth="18" strokeLinecap="round" />
        <line x1="240" y1="-10" x2={240 - 250 * kreska} y2={-10 + 310 * kreska} stroke={CZERWONY} strokeWidth="18" strokeLinecap="round" />
      </g>
    </g>
  );
};

// 6. Laptop z formularzem online
const Laptop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = useWejscie();
  const pola = [0, 1, 2, 3].map((i) => interpolate(frame, [(0.8 + i * 0.7) * fps, (1.3 + i * 0.7) * fps], [0, 1], zakres));
  return (
    <g transform={`translate(450 380) scale(${0.85 + 0.15 * w}) translate(-450 -380)`} opacity={w}>
      <rect x="130" y="110" width="640" height="430" rx="24" fill="#2b2f3a" />
      <rect x="160" y="140" width="580" height="370" rx="8" fill="#ffffff" />
      <rect x="160" y="140" width="580" height="60" fill={GRANAT} />
      <text x="190" y="182" fontSize="30" fontWeight="800" fill="#ffffff">
        KRS · wniosek online
      </text>
      {pola.map((p, i) => (
        <g key={i}>
          <rect x="190" y={230 + i * 66} width="520" height="44" rx="8" fill="#f1f3f7" stroke="#d3d8e2" strokeWidth="2" />
          <rect x="204" y={246 + i * 66} width={380 * p} height="12" rx="6" fill={SZARY} />
        </g>
      ))}
      <path d="M70 540 L830 540 L790 600 L110 600 Z" fill="#3b404d" />
    </g>
  );
};

// 7. Teczka, z której wylatują protokół i uchwały
const Teczka: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const otw = interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], zakres);
  const d1 = useWejscie(Math.round(0.9 * fps));
  const d2 = useWejscie(Math.round(1.6 * fps));
  return (
    <g>
      <Kartka x={130} y={400 - d1 * 300} w={260} h={330} tytul="PROTOKÓŁ" linie={6} obrot={-10 * d1} />
      <Kartka x={510} y={400 - d2 * 300} w={260} h={330} tytul="UCHWAŁY" linie={6} obrot={10 * d2} />
      <rect x="140" y="470" width="620" height="230" rx="16" fill="#d79b3b" />
      <path d={`M140 470 L760 470 L${760 - 40 * otw} ${470 - 120 * otw} L${140 + 40 * otw} ${470 - 120 * otw} Z`} fill="#e9b25a" />
    </g>
  );
};

// 8. Protokół z brakującą linijką
const Brak: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = useWejscie();
  const puls = interpolate(frame, [0.6 * fps, 1.1 * fps], [0, 1], zakres) * (0.75 + 0.25 * Math.sin(frame / 4));
  return (
    <g opacity={w}>
      <Kartka x={230} y={60} w={440} h={600} tytul="PROTOKÓŁ" linie={13} puste={6} />
      <rect x="244" y={60 + 74 + 6 * 34 - 14} width="412" height="40" rx="8" fill={CZERWONY} opacity={0.35 * puls} stroke={CZERWONY} strokeWidth="5" strokeOpacity={puls} />
      <g opacity={puls}>
        <circle cx="760" cy="310" r="50" fill={CZERWONY} />
        <text x="760" y="340" textAnchor="middle" fontSize="80" fontWeight="900" fill="#ffffff">
          !
        </text>
      </g>
    </g>
  );
};

// 9. Kalendarz: 7 kartek zrywa się jedna po drugiej
const Kalendarz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const naKartke = 0.42 * fps;
  return (
    <g>
      <rect x="250" y="130" width="400" height="460" rx="20" fill="#ffffff" stroke="#d3d8e2" strokeWidth="4" />
      <rect x="250" y="130" width="400" height="100" rx="20" fill={CZERWONY} />
      <text x="450" y="200" textAnchor="middle" fontSize="44" fontWeight="800" fill="#ffffff">
        DNI NA WNIOSEK
      </text>
      {Array.from({ length: 7 }).map((_, i) => {
        const dzien = 7 - i;
        const start = 0.3 * fps + i * naKartke;
        const t = interpolate(frame, [start, start + naKartke], [0, 1], zakres);
        if (dzien === 1) {
          return (
            <text key={i} x="450" y="500" textAnchor="middle" fontSize="240" fontWeight="900" fill={CZERWONY}>
              1
            </text>
          );
        }
        return (
          <g key={i} transform={`translate(${t * 260} ${t * 420}) rotate(${t * 40} 450 420)`} opacity={1 - t}>
            <rect x="262" y="236" width="376" height="342" fill="#ffffff" />
            <text x="450" y="500" textAnchor="middle" fontSize="240" fontWeight="900" fill={GRANAT}>
              {dzien}
            </text>
          </g>
        );
      }).reverse()}
    </g>
  );
};

// 10. Plansza: Zarząd + protokół = wpis
const Plansza: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elementy = ["Zarząd", "+", "protokół", "=", "wpis"];
  return (
    <g>
      {elementy.map((tekst, i) => {
        const w = wejscie(frame, fps, Math.round(i * 0.6 * fps));
        const wpis = tekst === "wpis";
        return (
          <g key={tekst} transform={`translate(450 ${130 + i * 120}) scale(${w})`} opacity={w}>
            {wpis && <rect x="-170" y="-80" width="340" height="110" rx="20" fill="#1e8e3e" />}
            <text textAnchor="middle" fontSize={tekst.length === 1 ? 90 : 84} fontWeight="900" fill={wpis ? "#ffffff" : GRANAT}>
              {tekst}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// 11. Adres strony
const Adres: React.FC = () => {
  const w = useWejscie(10);
  return (
    <g transform={`translate(450 360) scale(${w}) translate(-450 -360)`}>
      <rect x="40" y="250" width="820" height="200" rx="30" fill={CZERWONY} />
      <text x="450" y="375" textAnchor="middle" fontSize="64" fontWeight="900" fill="#ffffff">
        doradztwodlaosp.pl
      </text>
    </g>
  );
};

const SCENY: React.FC[] = [Remiza, Sala, Koniec, ListaLeci, Odbicie, Laptop, Teczka, Brak, Kalendarz, Plansza, Adres];

// Biblioteka ilustracji dla szablonu RolkaOSP (pole "ilustracja" w odcinek.json)
export const ILUSTRACJE: Record<string, React.FC> = {
  remiza: Remiza,
  sala: Sala,
  koniec: Koniec,
  "lista-do-sadu": ListaLeci,
  odrzucenie: Odbicie,
  "laptop-krs": Laptop,
  teczka: Teczka,
  "brak-w-protokole": Brak,
  "kalendarz-7-dni": Kalendarz,
  "plansza-zarzad-protokol-wpis": Plansza,
  adres: Adres,
};

export const Ilustracja: React.FC<{ nazwa: string }> = ({ nazwa }) => {
  const Komponent = ILUSTRACJE[nazwa];
  if (!Komponent) return null;
  return (
    <svg viewBox="0 0 900 760" width="100%" height="100%" style={{ fontFamily: "DM Sans, Arial, sans-serif", color: TEKST }}>
      <Komponent />
    </svg>
  );
};

export const Scena: React.FC<{ numer: number }> = ({ numer }) => {
  const Komponent = SCENY[numer];
  return (
    <svg viewBox="0 0 900 760" width="100%" height="100%" style={{ fontFamily: "Inter, Arial, sans-serif", color: TEKST }}>
      <Komponent />
    </svg>
  );
};
