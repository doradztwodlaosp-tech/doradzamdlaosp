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

// ── Ilustracje do odcinka "Komunikat z Brzostku" ──

// Tablica ogłoszeń z komunikatem, pinezka wbija się, kartka lekko się kołysze
const Komunikat: React.FC = () => {
  const frame = useCurrentFrame();
  const w = useWejscie();
  const kolysanie = Math.sin(frame / 12) * 1.5;
  return (
    <g>
      <rect x="120" y="90" width="660" height="560" rx="18" fill="#a9774a" />
      <rect x="140" y="110" width="620" height="520" rx="10" fill="#c99a68" />
      <g transform={`translate(450 140) rotate(${kolysanie}) translate(-450 -140) translate(0 ${(1 - w) * -300})`}>
        <rect x="230" y="150" width="440" height="430" rx="8" fill={PAPIER} stroke="#d6d0c0" strokeWidth="3" />
        <text x="450" y="235" textAnchor="middle" fontSize="58" fontWeight="900" fill={CZERWONY}>
          KOMUNIKAT
        </text>
        <rect x="290" y="262" width="320" height="6" fill={CZERWONY} />
        <text x="450" y="340" textAnchor="middle" fontSize="44" fontWeight="800" fill={GRANAT}>
          z Brzostku
        </text>
        {[390, 430, 470, 510].map((y, i) => (
          <rect key={y} x="290" y={y} width={320 - (i % 2) * 70} height="12" rx="6" fill="#c9cfd9" />
        ))}
        <circle cx="450" cy="152" r="16" fill={CZERWONY} />
      </g>
    </g>
  );
};

// Pożary, powodzie, walne do trzeciej w nocy: trzy ikony wchodzą po kolei
const Doswiadczenie: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ikony = [0, 1, 2].map((i) => wejscie(frame, fps, Math.round(i * 0.7 * fps)));
  const plomien = 1 + Math.sin(frame / 3) * 0.06;
  const fala = Math.sin(frame / 6) * 12;
  const wskazowka = interpolate(frame, [2 * fps, 3 * fps], [0, 90], zakres);
  return (
    <g>
      <g transform={`translate(160 330) scale(${ikony[0] * plomien})`}>
        <path d="M0 110 C-80 110 -95 30 -40 -40 C-35 0 -10 10 0 -10 C10 -60 -5 -100 20 -130 C40 -60 100 -30 90 40 C85 90 50 110 0 110 Z" fill={CZERWONY} />
        <path d="M0 110 C-40 110 -45 60 -15 20 C-5 50 15 40 15 20 C45 50 50 110 0 110 Z" fill="#f2a33a" />
      </g>
      <g transform={`translate(450 360) scale(${ikony[1]})`}>
        <path d={`M-110 0 Q-55 ${-40 + fala} 0 0 T110 0 L110 120 L-110 120 Z`} fill="#2f6fd0" />
        <path d={`M-110 50 Q-55 ${10 - fala} 0 50 T110 50 L110 120 L-110 120 Z`} fill="#1f4fa8" />
        <path d="M-30 -140 C-30 -100 -60 -80 -60 -50 A30 30 0 0 0 0 -50 C0 -80 -30 -100 -30 -140 Z" fill="#2f6fd0" />
      </g>
      <g transform={`translate(740 340) scale(${ikony[2]})`}>
        <circle r="110" fill={PAPIER} stroke={GRANAT} strokeWidth="12" />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="-4" y="-98" width="8" height="18" fill={GRANAT} transform={`rotate(${i * 30})`} />
        ))}
        <rect x="-6" y="-70" width="12" height="74" rx="6" fill={GRANAT} transform={`rotate(${wskazowka})`} />
        <rect x="-5" y="-55" width="10" height="60" rx="5" fill={CZERWONY} transform="rotate(0)" />
        <circle r="12" fill={CZERWONY} />
        <text y="170" textAnchor="middle" fontSize="44" fontWeight="900" fill={GRANAT}>
          3:00
        </text>
      </g>
      <text x="160" y="570" textAnchor="middle" fontSize="38" fontWeight="800" fill={GRANAT} opacity={ikony[0]}>
        pożary
      </text>
      <text x="450" y="570" textAnchor="middle" fontSize="38" fontWeight="800" fill={GRANAT} opacity={ikony[1]}>
        powodzie
      </text>
    </g>
  );
};

// Bilans co do grosza: kolumny liczb, na końcu "0,00 zł" i zielony znak
const Bilans: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wiersze = [
    ["Aktywa", "4 812 377,15"],
    ["Pasywa", "4 812 377,15"],
  ];
  const roznica = wejscie(frame, fps, Math.round(1.4 * fps));
  return (
    <g>
      <Kartka x={130} y={70} w={640} h={620} />
      <text x="450" y="145" textAnchor="middle" fontSize="50" fontWeight="900" fill={GRANAT}>
        BILANS
      </text>
      {wiersze.map(([nazwa, kwota], i) => {
        const w = wejscie(frame, fps, Math.round((0.3 + i * 0.5) * fps));
        return (
          <g key={nazwa} opacity={w} transform={`translate(${(1 - w) * 40} 0)`}>
            <text x="180" y={250 + i * 90} fontSize="40" fontWeight="600" fill={TEKST}>
              {nazwa}
            </text>
            <text x="720" y={250 + i * 90} textAnchor="end" fontSize="40" fontWeight="800" fill={TEKST}>
              {kwota}
            </text>
          </g>
        );
      })}
      <rect x="180" y="370" width="540" height="6" fill={GRANAT} />
      <g opacity={roznica}>
        <text x="180" y="450" fontSize="40" fontWeight="600" fill={TEKST}>
          Różnica
        </text>
        <text x="720" y="450" textAnchor="end" fontSize="48" fontWeight="900" fill="#1e8e3e">
          0,00 zł
        </text>
      </g>
      <g transform={`translate(450 560) scale(${roznica})`}>
        <circle r="70" fill="#1e8e3e" />
        <path d="M-32 0 L-8 26 L36 -24" stroke="#ffffff" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
};

// Półka wypoziomowana bilansem: segregator pod nogą, pęcherzyk poziomicy wędruje na środek
const Poziomica: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [0.3 * fps, 1.5 * fps], [0, 1], zakres);
  const kat = interpolate(t, [0, 1], [-7, 0]);
  const pecherzyk = interpolate(t, [0, 1], [-70, 0]) + Math.sin(frame / 5) * (1 - t) * 6;
  const segregator = wejscie(frame, fps);
  return (
    <g>
      <rect x="140" y="590" width="620" height="16" fill="#8a5a35" />
      <g transform={`rotate(${kat} 640 420)`}>
        <rect x="170" y="400" width="560" height="34" rx="6" fill="#a8743f" />
        <rect x="190" y="434" width="26" height="160" fill="#6b4428" />
        <rect x="684" y="434" width="26" height="160" fill="#6b4428" />
        {[230, 300, 370].map((x, i) => (
          <rect key={x} x={x} y={330 - i * 8} width="56" height={70 + i * 8} rx="4" fill={[CZERWONY, GRANAT, "#d79b3b"][i]} />
        ))}
        {/* Poziomica */}
        <rect x="430" y="350" width="260" height="50" rx="10" fill="#f2c230" stroke="#b8901c" strokeWidth="4" />
        <rect x="520" y="360" width="80" height="30" rx="15" fill="#d8f0c8" stroke="#7aa35a" strokeWidth="3" />
        <line x1="545" y1="360" x2="545" y2="390" stroke="#7aa35a" strokeWidth="3" />
        <line x1="575" y1="360" x2="575" y2="390" stroke="#7aa35a" strokeWidth="3" />
        <circle cx={560 + pecherzyk / 3} cy="375" r="10" fill="#ffffff" opacity="0.9" />
      </g>
      {/* Segregator z bilansem pod nogą półki */}
      <g transform={`translate(${(1 - segregator) * -300} 0)`}>
        <rect x="150" y="560" width="110" height="34" rx="4" fill={GRANAT} />
        <text x="205" y="584" textAnchor="middle" fontSize="20" fontWeight="900" fill="#ffffff">
          BILANS
        </text>
      </g>
    </g>
  );
};

// Biegły rewident: łza, chusteczka i parująca kawa
const Rewident: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lza = (frame % 40) / 40;
  const kawa = wejscie(frame, fps, Math.round(1.6 * fps));
  return (
    <g>
      <Kartka x={110} y={110} w={330} h={430} tytul="RAPORT" linie={8} obrot={-6} />
      <g transform="translate(620 200)">
        <circle r="95" fill="#f1c7a3" />
        <path d="M-55 -15 Q-35 -30 -15 -15" stroke="#3b2f28" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M15 -15 Q35 -30 55 -15" stroke="#3b2f28" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M-30 45 Q0 25 30 45" stroke="#7a3a32" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={`M-35 ${-5 + lza * 70} q-9 16 0 22 q9 -6 0 -22 Z`} fill="#4aa3f0" opacity={1 - lza * 0.6} />
        <path d={`M35 ${-5 + ((lza + 0.5) % 1) * 70} q-9 16 0 22 q9 -6 0 -22 Z`} fill="#4aa3f0" opacity={1 - ((lza + 0.5) % 1) * 0.6} />
      </g>
      <g transform={`translate(640 520) scale(${kawa})`}>
        <rect x="-60" y="-50" width="120" height="110" rx="12" fill="#ffffff" stroke="#ccc" strokeWidth="4" />
        <path d="M60 -25 q38 0 38 30 q0 30 -38 30" stroke="#ccc" strokeWidth="10" fill="none" />
        <rect x="-50" y="-40" width="100" height="18" rx="6" fill="#6b4428" />
        {[-25, 0, 25].map((x, i) => (
          <path key={x} d={`M${x} -70 q-12 -22 0 -44 q12 -22 0 -44`} stroke="#b9b9b9" strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.4 + 0.4 * Math.sin(frame / 7 + i)} />
        ))}
      </g>
    </g>
  );
};

// Bilans kalorii po festynie: talerz z kiełbaską i ciastem, licznik kalorii się kręci
const Festyn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = useWejscie();
  const kalorie = Math.round(interpolate(frame, [0.5 * fps, 2.5 * fps], [0, 4350], zakres));
  const drgania = kalorie >= 4350 ? Math.sin(frame) * 3 : 0;
  return (
    <g>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${60 + i * 120} 60 L${120 + i * 120} 60 L${90 + i * 120} 120 Z`} fill={i % 2 ? CZERWONY : "#ffffff"} stroke="#ddd" />
      ))}
      <g transform={`translate(300 430) scale(${w})`}>
        <ellipse rx="190" ry="70" fill="#ffffff" stroke="#d6d0c0" strokeWidth="5" />
        <rect x="-150" y="-30" width="170" height="44" rx="22" fill="#a0522d" />
        <path d="M-130 -20 L-120 0 M-90 -20 L-80 0 M-50 -20 L-40 0" stroke="#7a3a1d" strokeWidth="5" />
        <path d="M40 10 L150 10 L120 -60 Z" fill="#f2d48a" />
        <path d="M40 10 L150 10 L145 -5 L45 -5 Z" fill="#e8a0b0" />
      </g>
      <g transform={`translate(${680 + drgania} 400)`}>
        <rect x="-130" y="-120" width="260" height="240" rx="24" fill={GRANAT} />
        <text y="-50" textAnchor="middle" fontSize="34" fontWeight="700" fill={SZARY}>
          kcal
        </text>
        <text y="30" textAnchor="middle" fontSize="80" fontWeight="900" fill={kalorie >= 4350 ? CZERWONY : "#ffffff"}>
          {kalorie}
        </text>
        <text y="90" textAnchor="middle" fontSize="30" fontWeight="800" fill={CZERWONY} opacity={kalorie >= 4350 ? 1 : 0}>
          ERROR
        </text>
      </g>
    </g>
  );
};

// Gmina działa: kropla wody płynie, śmieciarka jedzie, bilans z zielonym znakiem
const Gmina: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elementy = [0, 1, 2].map((i) => wejscie(frame, fps, Math.round(i * 0.8 * fps)));
  const jazda = (frame * 4) % 300;
  return (
    <g>
      <g transform={`translate(160 230) scale(${elementy[0]})`}>
        <path d="M0 -90 C0 -40 -60 0 -60 40 A60 60 0 0 0 60 40 C60 0 0 -40 0 -90 Z" fill="#2f6fd0" />
        <path d="M-25 30 A30 30 0 0 0 10 70" stroke="#ffffff" strokeWidth="8" fill="none" opacity="0.6" strokeLinecap="round" />
      </g>
      <g transform={`translate(${300 + jazda} 230) scale(${elementy[1]})`}>
        <rect x="-110" y="-60" width="150" height="100" rx="10" fill="#2e7d32" />
        <rect x="40" y="-30" width="70" height="70" rx="8" fill="#43a047" />
        <rect x="55" y="-20" width="40" height="28" rx="4" fill="#cfe8ff" />
        <circle cx="-70" cy="50" r="22" fill="#222" />
        <circle cx="70" cy="50" r="22" fill="#222" />
      </g>
      <rect x="60" y="300" width="780" height="10" fill="#c9cfd9" />
      <g transform={`translate(450 500) scale(${elementy[2]})`}>
        <rect x="-220" y="-90" width="440" height="180" rx="24" fill={GRANAT} />
        <text x="-40" y="22" textAnchor="middle" fontSize="56" fontWeight="900" fill="#ffffff">
          BILANS
        </text>
        <circle cx="140" cy="0" r="52" fill="#1e8e3e" />
        <path d="M115 0 L133 20 L166 -18" stroke="#ffffff" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
};

// Czołem, Mateuszu! – medal "za bilans" opada na wstędze, konfetti
const Medal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = wejscie(frame, fps);
  const kolysanie = Math.sin(frame / 10) * 4 * w;
  return (
    <g>
      {Array.from({ length: 24 }).map((_, i) => {
        const x = (i * 137) % 900;
        const y = ((frame * (3 + (i % 4)) + i * 60) % 820) - 60;
        return <rect key={i} x={x} y={y} width="14" height="8" fill={[CZERWONY, "#f2c230", "#2f6fd0", "#ffffff"][i % 4]} transform={`rotate(${frame * 5 + i * 30} ${x + 7} ${y + 4})`} />;
      })}
      <g transform={`translate(450 ${-200 + w * 260}) rotate(${kolysanie} 0 0)`}>
        <path d="M-60 0 L60 0 L40 220 L-40 220 Z" fill={CZERWONY} />
        <rect x="-15" y="0" width="30" height="220" fill="#ffffff" />
        <circle cx="0" cy="300" r="110" fill="#e8b84a" stroke="#b8901c" strokeWidth="8" />
        <circle cx="0" cy="300" r="82" fill="none" stroke="#b8901c" strokeWidth="4" />
        <text x="0" y="290" textAnchor="middle" fontSize="34" fontWeight="900" fill={GRANAT}>
          ZA BILANS
        </text>
        <text x="0" y="334" textAnchor="middle" fontSize="28" fontWeight="800" fill={GRANAT}>
          co do grosza
        </text>
      </g>
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
  komunikat: Komunikat,
  doswiadczenie: Doswiadczenie,
  bilans: Bilans,
  poziomica: Poziomica,
  rewident: Rewident,
  festyn: Festyn,
  gmina: Gmina,
  medal: Medal,
};

export const Ilustracja: React.FC<{ nazwa: string }> = ({ nazwa }) => {
  const Komponent = ILUSTRACJE[nazwa];
  if (!Komponent) return null;
  return (
    <svg viewBox="0 0 900 760" width="100%" height="100%" style={{ fontFamily: "Montserrat, Arial, sans-serif", color: TEKST }}>
      <Komponent />
    </svg>
  );
};

export const Scena: React.FC<{ numer: number }> = ({ numer }) => {
  const Komponent = SCENY[numer];
  return (
    <svg viewBox="0 0 900 760" width="100%" height="100%" style={{ fontFamily: "Montserrat, Arial, sans-serif", color: TEKST }}>
      <Komponent />
    </svg>
  );
};
