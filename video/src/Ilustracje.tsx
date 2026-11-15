import React from "react";
import { FONT } from "./marka";

/** Remiza OSP: ilustracja w barwach marki (jasne ściany, grafitowy dach, czerwone bramy, wieża z syreną). */
export const RemizaIlustracja: React.FC<{ szer?: number; otwarte?: number }> = ({ szer = 940, otwarte = 0 }) => {
  const h = (szer * 780) / 1000;
  const brama = (x: number) => (
    <g key={x}>
      <rect x={x - 8} y={448} width={236} height={262} rx={6} fill="#F4F0E6" stroke="#CFC7B3" strokeWidth={2} />
      <rect x={x} y={456} width={220} height={254} rx={3} fill="url(#brama)" />
      {Array.from({ length: 11 }).map((_, i) => (
        <rect key={i} x={x} y={462 + i * 22 * (1 - otwarte * 0.0)} width={220} height={3} fill="rgba(0,0,0,0.22)" />
      ))}
      <rect x={x + 18} y={472} width={184} height={34} rx={4} fill="#2A2C33" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 24 + i * 45} y={478} width={38} height={22} rx={2} fill="#7C8FA8" opacity={0.85} />
      ))}
      <rect x={x} y={700} width={220} height={10} fill="#8C7A5A" />
    </g>
  );
  return (
    <svg width={szer} height={h} viewBox="0 0 1000 780" style={{ overflow: "visible", fontFamily: FONT }}>
      <defs>
        <linearGradient id="sciana" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3EEE2" />
          <stop offset="1" stopColor="#E3DAC6" />
        </linearGradient>
        <linearGradient id="brama" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C8161F" />
          <stop offset="1" stopColor="#8F0F16" />
        </linearGradient>
        <linearGradient id="dach" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3D47" />
          <stop offset="1" stopColor="#23252B" />
        </linearGradient>
        <linearGradient id="wieza" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#EDE6D6" />
          <stop offset="1" stopColor="#D6CCB5" />
        </linearGradient>
        <filter id="cien" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {/* cień pod budynkiem */}
      <ellipse cx={500} cy={742} rx={470} ry={26} fill="rgba(35,28,18,0.38)" filter="url(#cien)" />
      {/* wieża z syreną */}
      <rect x={742} y={150} width={170} height={560} fill="url(#wieza)" />
      <rect x={742} y={150} width={14} height={560} fill="rgba(255,255,255,0.35)" />
      <rect x={898} y={150} width={14} height={560} fill="rgba(0,0,0,0.10)" />
      <polygon points="722,152 927,152 827,60" fill="url(#dach)" />
      <rect x={780} y={196} width={94} height={14} fill="#2A2C33" />
      <rect x={806} y={232} width={42} height={82} rx={6} fill="#2A2C33" />
      <rect x={812} y={238} width={30} height={70} rx={3} fill="#7C8FA8" opacity={0.85} />
      <rect x={806} y={420} width={42} height={82} rx={6} fill="#2A2C33" />
      <rect x={812} y={426} width={30} height={70} rx={3} fill="#7C8FA8" opacity={0.85} />
      {/* syrena */}
      <circle cx={827} cy={118} r={20} fill="#C9962F" />
      <circle cx={827} cy={118} r={11} fill="#6B4E12" />
      {/* korpus budynku */}
      <rect x={60} y={340} width={700} height={370} fill="url(#sciana)" />
      <rect x={60} y={340} width={700} height={12} fill="rgba(255,255,255,0.5)" />
      <rect x={60} y={690} width={700} height={20} fill="#B8AD94" />
      {/* dach */}
      <polygon points="38,342 782,342 740,272 80,272" fill="url(#dach)" />
      <polygon points="38,342 782,342 782,352 38,352" fill="#1B1D22" />
      <polygon points="80,272 740,272 735,282 85,282" fill="rgba(255,255,255,0.12)" />
      {/* tablica */}
      <rect x={290} y={372} width={240} height={58} rx={10} fill="#1E1F25" stroke="#C9962F" strokeWidth={3} />
      <text x={410} y={414} textAnchor="middle" fontSize={40} fontWeight={800} letterSpacing={6} fill="#E6B54A">
        OSP
      </text>
      {/* bramy */}
      {brama(120)}
      {brama(420)}
      {/* okna z boku */}
      {[640].map((x) => (
        <g key={x}>
          <rect x={x} y={470} width={90} height={110} rx={4} fill="#F4F0E6" stroke="#CFC7B3" strokeWidth={2} />
          <rect x={x + 8} y={478} width={74} height={94} rx={2} fill="#7C8FA8" opacity={0.9} />
          <rect x={x + 44} y={478} width={3} height={94} fill="#F4F0E6" />
          <rect x={x + 8} y={522} width={74} height={3} fill="#F4F0E6" />
        </g>
      ))}
      {/* rynna */}
      <rect x={760} y={342} width={10} height={368} fill="#9A9078" />
      {/* maszt z flagą */}
      <rect x={32} y={220} width={6} height={490} fill="#8A8A8E" />
      <rect x={38} y={226} width={70} height={24} fill="#FFFFFF" />
      <rect x={38} y={250} width={70} height={24} fill="#D4213D" />
    </svg>
  );
};

/** „Filar ochrony ludności”: kolumna ze złotą głowicą i tarczą z znakiem § (ilustracja w barwach marki). */
export const FilarIlustracja: React.FC<{ wys?: number }> = ({ wys = 900 }) => {
  const w = (wys * 560) / 900;
  return (
    <svg width={w} height={wys} viewBox="0 0 560 900" style={{ overflow: "visible", fontFamily: FONT }}>
      <defs>
        <linearGradient id="kolumna" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CFC6B0" />
          <stop offset="0.3" stopColor="#F6F1E5" />
          <stop offset="0.7" stopColor="#E7DFCB" />
          <stop offset="1" stopColor="#BFB59B" />
        </linearGradient>
        <linearGradient id="zloto" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0C86A" />
          <stop offset="0.5" stopColor="#C9962F" />
          <stop offset="1" stopColor="#8C6516" />
        </linearGradient>
        <linearGradient id="tarcza" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E3038" />
          <stop offset="1" stopColor="#16171B" />
        </linearGradient>
        <filter id="cien2" x="-30%" y="-10%" width="160%" height="140%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <ellipse cx={280} cy={870} rx={250} ry={22} fill="rgba(35,28,18,0.4)" filter="url(#cien2)" />
      {/* cokół */}
      <rect x={70} y={820} width={420} height={44} rx={6} fill="url(#kolumna)" />
      <rect x={100} y={784} width={360} height={40} rx={6} fill="url(#kolumna)" />
      {/* trzon z rowkami */}
      <rect x={140} y={300} width={280} height={490} fill="url(#kolumna)" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={160 + i * 38} y={306} width={4} height={480} fill="rgba(0,0,0,0.10)" />
      ))}
      {/* głowica */}
      <rect x={110} y={262} width={340} height={44} rx={6} fill="url(#zloto)" />
      <rect x={90} y={226} width={380} height={42} rx={8} fill="url(#kolumna)" />
      {/* tarcza z § */}
      <path d="M280 20 L400 66 L400 150 C400 210 340 246 280 268 C220 246 160 210 160 150 L160 66 Z" fill="url(#tarcza)" stroke="url(#zloto)" strokeWidth={9} />
      <text x={280} y={178} textAnchor="middle" fontSize={140} fontWeight={800} fill="url(#zloto)">
        §
      </text>
    </svg>
  );
};
