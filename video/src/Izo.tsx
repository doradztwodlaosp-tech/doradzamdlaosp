import React from "react";
import { FONT, MARKA } from "./marka";

// „Silnik” map 3D: rzut równoległy (izometryczny) rysowany w SVG.
// Świat: x i y to podłoga (jednostka ≈ 1 m), z to wysokość. Kamera patrzy z góry pod kątem i może się obracać.
// Przy obrocie (yaw) 45°: +x biegnie na ekranie w prawo w dół, +y w prawo w górę.
// Widoczne są zawsze: góra bryły, jej ściana południowa (lewa na ekranie) i wschodnia (prawa) – dla yaw od 0° do 90°.

export type V3 = [number, number, number];
export type Kamera = { yaw: number; elew: number; skala: number; cel: V3; ekran: [number, number] };
export type KlatkaKamery = { t: number; cel: V3; skala: number; yaw: number };

const STOPNIE = Math.PI / 180;
const ogranicz = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const rzut = (k: Kamera, p: V3) => {
  const x = p[0] - k.cel[0];
  const y = p[1] - k.cel[1];
  const z = p[2] - k.cel[2];
  const c = Math.cos(k.yaw * STOPNIE);
  const s = Math.sin(k.yaw * STOPNIE);
  const xr = x * c + y * s;
  const yr = -x * s + y * c;
  const e = k.elew * STOPNIE;
  return { x: k.ekran[0] + xr * k.skala, y: k.ekran[1] - (yr * Math.sin(e) + z * Math.cos(e)) * k.skala, d: yr };
};

const pkty = (k: Kamera, ps: V3[]) =>
  ps
    .map((p) => {
      const r = rzut(k, p);
      return `${r.x.toFixed(1)},${r.y.toFixed(1)}`;
    })
    .join(" ");

// Jaśniejszy lub ciemniejszy odcień koloru (f > 1 rozjaśnia)
export const odcien = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const k = (v: number) => ogranicz(Math.round(v * f), 0, 255);
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
};

// Płynny ruch kamery między klatkami kluczowymi (z lekkim „oddechem”, żeby obraz nigdy nie stał)
export const kameraW = (klatki: KlatkaKamery[], t: number, ekran: [number, number], elew = 42): Kamera => {
  let i = 0;
  while (i < klatki.length - 2 && t > klatki[i + 1].t) i++;
  const a = klatki[i];
  const b = klatki[Math.min(i + 1, klatki.length - 1)];
  const u = b.t > a.t ? ogranicz((t - a.t) / (b.t - a.t), 0, 1) : 0;
  const e = u * u * (3 - 2 * u);
  const m = (p: number, q: number) => p + (q - p) * e;
  return {
    yaw: m(a.yaw, b.yaw) + Math.sin(t * 0.6) * 1.1,
    elew,
    skala: m(a.skala, b.skala) * (1 + 0.012 * Math.sin(t * 0.8)),
    cel: [m(a.cel[0], b.cel[0]), m(a.cel[1], b.cel[1]), m(a.cel[2], b.cel[2])],
    ekran,
  };
};

// Porządkuje klatki kluczowe tak, żeby czasy rosły (słowa lektora mogą paść bardzo blisko siebie)
export const uporzadkuj = (klatki: KlatkaKamery[]): KlatkaKamery[] => {
  const wynik: KlatkaKamery[] = [];
  klatki.forEach((kl) => wynik.push({ ...kl, t: wynik.length ? Math.max(kl.t, wynik[wynik.length - 1].t + 0.05) : kl.t }));
  return wynik;
};

// Macierz SVG układająca płaski rysunek na płaszczyźnie świata: 100 jednostek rysunku = 1 jednostka świata.
// o – lewy górny róg, u – kierunek „w prawo”, v – kierunek „w dół” rysunku.
export const naPlaszczyznie = (k: Kamera, o: V3, u: V3, v: V3) => {
  const O = rzut(k, o);
  const A = rzut(k, [o[0] + u[0], o[1] + u[1], o[2] + u[2]]);
  const B = rzut(k, [o[0] + v[0], o[1] + v[1], o[2] + v[2]]);
  return `matrix(${(A.x - O.x) / 100} ${(A.y - O.y) / 100} ${(B.x - O.x) / 100} ${(B.y - O.y) / 100} ${O.x} ${O.y})`;
};

const Wielokat: React.FC<{ k: Kamera; p: V3[]; kolor: string; obrys?: string; grubosc?: number; opacity?: number }> = ({ k, p, kolor, obrys, grubosc = 1, opacity }) => (
  <polygon points={pkty(k, p)} fill={kolor} stroke={obrys ?? kolor} strokeWidth={grubosc} strokeLinejoin="round" opacity={opacity} />
);

export const IzoDefs: React.FC = () => (
  <defs>
    <filter id="izo-cien" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
    <filter id="izo-blask" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="20" />
    </filter>
    <radialGradient id="izo-zanik" cx="43%" cy="47%" r="60%">
      <stop offset="52%" stopColor={MARKA.tlo} stopOpacity="0" />
      <stop offset="100%" stopColor={MARKA.tlo} stopOpacity="1" />
    </radialGradient>
    <radialGradient id="izo-swiatlo" cx="43%" cy="46%" r="46%">
      <stop offset="0%" stopColor="#2E313D" stopOpacity="1" />
      <stop offset="100%" stopColor={MARKA.tlo} stopOpacity="0" />
    </radialGradient>
  </defs>
);

// Podłoga: siatka linii, która rozpływa się ku brzegom ekranu
export const Podloga: React.FC<{ k: Kamera; zakres: [number, number, number, number] }> = ({ k, zakres: [x0, y0, x1, y1] }) => {
  const linie: React.ReactNode[] = [];
  for (let x = Math.ceil(x0); x <= x1; x++) {
    const a = rzut(k, [x, y0, 0]);
    const b = rzut(k, [x, y1, 0]);
    linie.push(<line key={`x${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />);
  }
  for (let y = Math.ceil(y0); y <= y1; y++) {
    const a = rzut(k, [x0, y, 0]);
    const b = rzut(k, [x1, y, 0]);
    linie.push(<line key={`y${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />);
  }
  return (
    <>
      <rect x="0" y="0" width="1080" height="1920" fill="url(#izo-swiatlo)" />
      <g stroke="#343846" strokeWidth="2">
        {linie}
      </g>
    </>
  );
};

// Miękki cień bryły na podłodze
export const Cien: React.FC<{ k: Kamera; poz: [number, number]; roz: [number, number]; sila?: number }> = ({ k, poz: [x, y], roz: [w, d], sila = 0.42 }) => (
  <polygon
    points={pkty(k, [
      [x - 0.1, y - 0.25, 0],
      [x + w + 0.45, y - 0.25, 0],
      [x + w + 0.45, y + d + 0.15, 0],
      [x - 0.1, y + d + 0.15, 0],
    ])}
    fill="#000000"
    opacity={sila}
    filter="url(#izo-cien)"
  />
);

// Prostopadłościan: trzy widoczne ściany w trzech odcieniach
export const Blok: React.FC<{ k: Kamera; poz: V3; roz: V3; kolor: string; gora?: string; lewa?: string; prawa?: string; rant?: string }> = ({
  k,
  poz: [x, y, z],
  roz: [w, d, h],
  kolor,
  gora,
  lewa,
  prawa,
  rant,
}) => (
  <g>
    <Wielokat
      k={k}
      kolor={lewa ?? odcien(kolor, 0.8)}
      p={[
        [x, y, z],
        [x + w, y, z],
        [x + w, y, z + h],
        [x, y, z + h],
      ]}
    />
    <Wielokat
      k={k}
      kolor={prawa ?? odcien(kolor, 0.58)}
      p={[
        [x + w, y, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x + w, y, z + h],
      ]}
    />
    <Wielokat
      k={k}
      kolor={gora ?? kolor}
      obrys={rant}
      grubosc={rant ? 3 : 1}
      p={[
        [x, y, z + h],
        [x + w, y, z + h],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ]}
    />
  </g>
);

// Droga na podłodze: ciąg prostokątów wzdłuż odcinków równoległych do osi
export const Droga: React.FC<{ k: Kamera; wezly: [number, number][]; szer: number; kolor: string }> = ({ k, wezly, szer, kolor }) => {
  const h = szer / 2;
  return (
    <g>
      {wezly.slice(0, -1).map(([ax, ay], i) => {
        const [bx, by] = wezly[i + 1];
        const x0 = Math.min(ax, bx) - h;
        const x1 = Math.max(ax, bx) + h;
        const y0 = Math.min(ay, by) - h;
        const y1 = Math.max(ay, by) + h;
        return (
          <Wielokat
            key={i}
            k={k}
            kolor={kolor}
            p={[
              [x0, y0, 0],
              [x1, y0, 0],
              [x1, y1, 0],
              [x0, y1, 0],
            ]}
          />
        );
      })}
    </g>
  );
};

const dlugosci = (wezly: [number, number][]) => wezly.slice(0, -1).map(([ax, ay], i) => Math.hypot(wezly[i + 1][0] - ax, wezly[i + 1][1] - ay));

// Punkt na trasie dla postępu 0–1
export const punktNaTrasie = (wezly: [number, number][], postep: number): [number, number] => {
  const dl = dlugosci(wezly);
  let reszta = ogranicz(postep, 0, 1) * dl.reduce((a, b) => a + b, 0);
  for (let i = 0; i < dl.length; i++) {
    if (reszta <= dl[i] || i === dl.length - 1) {
      const u = dl[i] ? ogranicz(reszta / dl[i], 0, 1) : 0;
      return [wezly[i][0] + (wezly[i + 1][0] - wezly[i][0]) * u, wezly[i][1] + (wezly[i + 1][1] - wezly[i][1]) * u];
    }
    reszta -= dl[i];
  }
  return wezly[wezly.length - 1];
};

// Linia trasy rysująca się wraz z postępem (0–1)
export const Linia: React.FC<{ k: Kamera; wezly: [number, number][]; postep: number; kolor: string; grubosc?: number; kreski?: string; blask?: boolean }> = ({
  k,
  wezly,
  postep,
  kolor,
  grubosc = 8,
  kreski,
  blask,
}) => {
  if (postep <= 0) return null;
  const dl = dlugosci(wezly);
  let reszta = ogranicz(postep, 0, 1) * dl.reduce((a, b) => a + b, 0);
  const punkty: V3[] = [[wezly[0][0], wezly[0][1], 0.02]];
  for (let i = 0; i < dl.length && reszta > 0; i++) {
    const u = dl[i] ? ogranicz(reszta / dl[i], 0, 1) : 0;
    punkty.push([wezly[i][0] + (wezly[i + 1][0] - wezly[i][0]) * u, wezly[i][1] + (wezly[i + 1][1] - wezly[i][1]) * u, 0.02]);
    reszta -= dl[i];
  }
  const p = pkty(k, punkty);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {blask && <polyline points={p} stroke={kolor} strokeWidth={grubosc * 3} opacity="0.35" filter="url(#izo-blask)" />}
      <polyline points={p} stroke={kolor} strokeWidth={grubosc} strokeDasharray={kreski} />
    </g>
  );
};

// Tabliczka z podpisem na słupku, zawsze zwrócona do widza. w – wejście 0–1.
export const Tabliczka: React.FC<{
  k: Kamera;
  p: V3;
  tekst: string;
  w: number;
  zlota?: boolean;
  rozmiar?: number;
  slupek?: number;
  skreslenie?: number;
}> = ({ k, p, tekst, w, zlota, rozmiar = 34, slupek = 1.3, skreslenie = 0 }) => {
  if (w <= 0.001) return null;
  const a = rzut(k, p);
  const t = rzut(k, [p[0], p[1], p[2] + slupek * w]);
  const szer = tekst.length * rozmiar * 0.7 + 46;
  const wys = rozmiar * 1.75;
  return (
    <g opacity={Math.min(1, w * 1.5)}>
      <line x1={a.x} y1={a.y} x2={t.x} y2={t.y} stroke={zlota ? MARKA.zloto : "#7F8594"} strokeWidth="3" />
      <circle cx={a.x} cy={a.y} r="6" fill={zlota ? MARKA.zloto : "#7F8594"} />
      <g transform={`translate(${t.x} ${t.y - wys / 2}) scale(${w})`}>
        <rect x={-szer / 2} y={-wys / 2} width={szer} height={wys} rx={wys / 2} fill={zlota ? MARKA.zloto : "#0E0F13"} stroke={MARKA.zloto} strokeWidth="3" />
        <text x="0" y={rozmiar * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={rozmiar} fill={zlota ? MARKA.tlo : MARKA.bialy}>
          {tekst}
        </text>
        {skreslenie > 0 && <line x1={-szer / 2 + 14} y1="0" x2={-szer / 2 + 14 + (szer - 28) * skreslenie} y2="0" stroke="#D8402F" strokeWidth="8" strokeLinecap="round" />}
      </g>
    </g>
  );
};

// Pionek – uproszczona postać (członek zarządu, komisji, druh na zebraniu)
export const Pionek: React.FC<{ k: Kamera; p: [number, number]; z?: number; kolor: string; w?: number }> = ({ k, p, z = 0, kolor, w = 1 }) => {
  if (w <= 0.001) return null;
  const a = rzut(k, [p[0], p[1], z]);
  const s = k.skala * 0.62 * w;
  return (
    <g>
      <ellipse cx={a.x + 0.08 * s} cy={a.y} rx={0.36 * s} ry={0.15 * s} fill="rgba(0,0,0,0.4)" />
      <path
        d={`M ${a.x - 0.27 * s} ${a.y} Q ${a.x - 0.3 * s} ${a.y - 0.86 * s} ${a.x} ${a.y - 0.96 * s} Q ${a.x + 0.3 * s} ${a.y - 0.86 * s} ${a.x + 0.27 * s} ${a.y} Q ${a.x} ${a.y + 0.13 * s} ${a.x - 0.27 * s} ${a.y} Z`}
        fill={kolor}
      />
      <path
        d={`M ${a.x + 0.05 * s} ${a.y + 0.06 * s} Q ${a.x + 0.3 * s} ${a.y - 0.86 * s} ${a.x} ${a.y - 0.96 * s} Q ${a.x + 0.3 * s} ${a.y - 0.86 * s} ${a.x + 0.27 * s} ${a.y} Q ${a.x + 0.16 * s} ${a.y + 0.06 * s} ${a.x + 0.05 * s} ${a.y + 0.06 * s} Z`}
        fill="rgba(0,0,0,0.22)"
      />
      <circle cx={a.x} cy={a.y - 1.16 * s} r={0.27 * s} fill={odcien(kolor, 1.12)} />
      <circle cx={a.x + 0.07 * s} cy={a.y - 1.13 * s} r={0.2 * s} fill="rgba(0,0,0,0.14)" />
    </g>
  );
};

const SCIANA_JASNA = "#DDD6C8";
const SCIANA_CIEMNA = "#A69F91";

// Remiza OSP: bryła z dwuspadowym dachem, czerwonymi bramami, wieżą i flagą. w – „wyrastanie” 0–1.
export const Remiza: React.FC<{ k: Kamera; poz: [number, number]; w: number; czas?: number }> = ({ k, poz: [x, y], w, czas = 0 }) => {
  if (w <= 0.001) return null;
  const H = (v: number) => v * w;
  const wx = x + 2.45;
  const wy = y + 2.3;
  const szczyt: V3 = [wx + 0.42, wy + 0.42, H(3.45)];
  const fala = Math.sin(czas * 4) * 0.06;
  return (
    <g>
      <Cien k={k} poz={[x, y]} roz={[3.2, 3.0]} />
      {/* Wieża (stoi za budynkiem) */}
      <Blok k={k} poz={[wx, wy, 0]} roz={[0.85, 0.85, H(2.9)]} kolor={SCIANA_JASNA} lewa={SCIANA_JASNA} prawa={SCIANA_CIEMNA} />
      <Wielokat
        k={k}
        kolor={MARKA.zloto}
        p={[
          [wx + 0.22, wy, H(2.15)],
          [wx + 0.63, wy, H(2.15)],
          [wx + 0.63, wy, H(2.65)],
          [wx + 0.22, wy, H(2.65)],
        ]}
      />
      <Wielokat
        k={k}
        kolor="#9A3229"
        p={[
          [wx - 0.08, wy - 0.08, H(2.9)],
          [wx + 0.93, wy - 0.08, H(2.9)],
          szczyt,
        ]}
      />
      <Wielokat
        k={k}
        kolor="#7A251E"
        p={[
          [wx + 0.93, wy - 0.08, H(2.9)],
          [wx + 0.93, wy + 0.93, H(2.9)],
          szczyt,
        ]}
      />
      {/* Flaga */}
      <polyline points={pkty(k, [szczyt, [szczyt[0], szczyt[1], H(4.5)]])} stroke="#9AA0AD" strokeWidth="4" fill="none" />
      <Wielokat
        k={k}
        kolor="#FFFFFF"
        p={[
          [szczyt[0], szczyt[1], H(4.5)],
          [szczyt[0] + 0.7, szczyt[1], H(4.5) + fala],
          [szczyt[0] + 0.7, szczyt[1], H(4.27) + fala],
          [szczyt[0], szczyt[1], H(4.27)],
        ]}
      />
      <Wielokat
        k={k}
        kolor="#D4213D"
        p={[
          [szczyt[0], szczyt[1], H(4.27)],
          [szczyt[0] + 0.7, szczyt[1], H(4.27) + fala],
          [szczyt[0] + 0.7, szczyt[1], H(4.04) + fala],
          [szczyt[0], szczyt[1], H(4.04)],
        ]}
      />
      {/* Budynek */}
      <Blok k={k} poz={[x, y, 0]} roz={[3.2, 2.2, H(1.5)]} kolor={SCIANA_JASNA} lewa={SCIANA_JASNA} prawa={SCIANA_CIEMNA} />
      <Wielokat
        k={k}
        kolor="#7A251E"
        p={[
          [x - 0.1, y + 1.1, H(2.25)],
          [x + 3.3, y + 1.1, H(2.25)],
          [x + 3.3, y + 2.3, H(1.5)],
          [x - 0.1, y + 2.3, H(1.5)],
        ]}
      />
      <Wielokat
        k={k}
        kolor={SCIANA_CIEMNA}
        p={[
          [x + 3.2, y, H(1.5)],
          [x + 3.2, y + 2.2, H(1.5)],
          [x + 3.2, y + 1.1, H(2.25)],
        ]}
      />
      <Wielokat
        k={k}
        kolor="#9A3229"
        p={[
          [x - 0.1, y - 0.1, H(1.5)],
          [x + 3.3, y - 0.1, H(1.5)],
          [x + 3.3, y + 1.1, H(2.25)],
          [x - 0.1, y + 1.1, H(2.25)],
        ]}
      />
      {/* Bramy garażowe i napis na ścianie frontowej */}
      <g transform={naPlaszczyznie(k, [x, y, H(1.5)], [1, 0, 0], [0, 0, -w])}>
        {[30, 180].map((bx) => (
          <g key={bx}>
            <rect x={bx} y="48" width="110" height="102" fill="#B5352A" />
            {[66, 84, 102, 120, 138].map((ly) => (
              <rect key={ly} x={bx} y={ly} width="110" height="3" fill="#8C2620" />
            ))}
            <rect x={bx + 12} y="56" width="86" height="12" fill="#F3D58A" />
          </g>
        ))}
        <text x="160" y="36" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="30" fill="#B5352A">
          OSP
        </text>
      </g>
    </g>
  );
};

// Sąd rejestrowy (KRS): gmach z kolumnami i trójkątnym szczytem
export const Sad: React.FC<{ k: Kamera; poz: [number, number]; w: number; napis?: string }> = ({ k, poz: [x, y], w, napis = "KRS" }) => {
  if (w <= 0.001) return null;
  const H = (v: number) => v * w;
  return (
    <g>
      <Cien k={k} poz={[x, y]} roz={[3.4, 2.5]} />
      <Blok k={k} poz={[x, y + 0.7, 0]} roz={[3.4, 1.8, H(2.0)]} kolor={SCIANA_JASNA} lewa="#CFC8B9" prawa={SCIANA_CIEMNA} gora="#BEB7A7" />
      {/* Dach */}
      <Wielokat
        k={k}
        kolor="#9E9788"
        p={[
          [x, y, H(2.06)],
          [x + 1.7, y, H(2.85)],
          [x + 1.7, y + 2.5, H(2.85)],
          [x, y + 2.5, H(2.06)],
        ]}
      />
      <Wielokat
        k={k}
        kolor="#857E70"
        p={[
          [x + 3.4, y, H(2.06)],
          [x + 1.7, y, H(2.85)],
          [x + 1.7, y + 2.5, H(2.85)],
          [x + 3.4, y + 2.5, H(2.06)],
        ]}
      />
      {/* Podest, drzwi, kolumny */}
      <Blok k={k} poz={[x - 0.15, y - 0.25, 0]} roz={[3.7, 0.95, H(0.22)]} kolor="#CFC8B9" />
      <Wielokat
        k={k}
        kolor="#15161B"
        p={[
          [x + 1.3, y + 0.7, H(0.22)],
          [x + 2.1, y + 0.7, H(0.22)],
          [x + 2.1, y + 0.7, H(1.3)],
          [x + 1.3, y + 0.7, H(1.3)],
        ]}
      />
      {[0, 1, 2, 3].map((i) => (
        <Blok key={i} k={k} poz={[x + 0.2 + i * 0.9, y + 0.1, H(0.22)]} roz={[0.3, 0.3, H(1.5)]} kolor="#F1ECE0" lewa="#F1ECE0" prawa="#BDB6A7" />
      ))}
      {/* Belka z napisem i szczyt */}
      <Blok k={k} poz={[x, y, H(1.72)]} roz={[3.4, 0.7, H(0.34)]} kolor={SCIANA_JASNA} lewa="#E6E0D2" prawa={SCIANA_CIEMNA} />
      <Wielokat
        k={k}
        kolor="#EDE7DA"
        p={[
          [x, y, H(2.06)],
          [x + 3.4, y, H(2.06)],
          [x + 1.7, y, H(2.85)],
        ]}
      />
      <g transform={naPlaszczyznie(k, [x, y, H(2.06)], [1, 0, 0], [0, 0, -w])}>
        <text x="170" y="27" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="26" letterSpacing="6" fill="#15161B">
          {napis}
        </text>
      </g>
    </g>
  );
};

// Stojący dokument na cokole (np. STATUT)
export const Dokument: React.FC<{ k: Kamera; poz: [number, number]; w: number; tytul: string }> = ({ k, poz: [x, y], w, tytul }) => {
  if (w <= 0.001) return null;
  const H = (v: number) => v * w;
  return (
    <g>
      <Cien k={k} poz={[x, y]} roz={[1.7, 1.1]} />
      <Blok k={k} poz={[x, y, 0]} roz={[1.7, 1.1, H(0.28)]} kolor="#2F323E" rant={MARKA.zloto} />
      <Blok k={k} poz={[x + 0.25, y + 0.5, H(0.28)]} roz={[1.2, 0.1, H(1.6)]} kolor="#FFFFFF" lewa="#F4F1EA" prawa="#BDB9B0" />
      <g transform={naPlaszczyznie(k, [x + 0.25, y + 0.5, H(1.88)], [1, 0, 0], [0, 0, -w])}>
        <text x="60" y="30" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="21" fill="#15161B">
          {tytul}
        </text>
        <rect x="42" y="38" width="36" height="3.5" fill={MARKA.zloto} />
        {[54, 68, 82, 96, 110, 124, 138].map((ly, i) => (
          <rect key={ly} x="14" y={ly} width={92 - (i % 3) * 20} height="5" rx="2.5" fill="#C9C6BE" />
        ))}
      </g>
    </g>
  );
};

// Odznaka (np. STATUS OPP) na cokole: szara z kłódką albo złota z promieniami. zloto – stopień odblokowania 0–1.
export const Odznaka: React.FC<{ k: Kamera; poz: [number, number]; w: number; zloto: number; napis: string; czas: number }> = ({ k, poz: [x, y], w, zloto, napis, czas }) => {
  if (w <= 0.001) return null;
  const H = (v: number) => v * w;
  const podstawa = rzut(k, [x + 0.7, y + 0.7, H(0.55)]);
  const c = rzut(k, [x + 0.7, y + 0.7, H(0.55) + 1.35 * w]);
  const r = k.skala * 0.92 * w;
  return (
    <g>
      <Cien k={k} poz={[x, y]} roz={[1.4, 1.4]} />
      <Blok k={k} poz={[x, y, 0]} roz={[1.4, 1.4, H(0.55)]} kolor="#2F323E" rant={zloto > 0.5 ? MARKA.zloto : "#5C6170"} />
      <line x1={podstawa.x} y1={podstawa.y} x2={c.x} y2={c.y} stroke="#5C6170" strokeWidth="8" />
      {zloto > 0.01 && (
        <g opacity={zloto}>
          <circle cx={c.x} cy={c.y} r={r * 1.5} fill={MARKA.zloto} opacity="0.45" filter="url(#izo-blask)" />
          {Array.from({ length: 12 }).map((_, i) => {
            const kat = (i * 30 + czas * 25) * STOPNIE;
            const r1 = r * 1.18;
            const r2 = r * (1.42 + 0.08 * Math.sin(czas * 5 + i));
            return (
              <line
                key={i}
                x1={c.x + Math.cos(kat) * r1}
                y1={c.y + Math.sin(kat) * r1}
                x2={c.x + Math.cos(kat) * r2}
                y2={c.y + Math.sin(kat) * r2}
                stroke={MARKA.zloto}
                strokeWidth="7"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}
      {/* Wstążki */}
      <path d={`M ${c.x - r * 0.45} ${c.y + r * 0.6} L ${c.x - r * 0.7} ${c.y + r * 1.5} L ${c.x - r * 0.35} ${c.y + r * 1.3} L ${c.x - r * 0.05} ${c.y + r * 1.5} L ${c.x} ${c.y + r * 0.7} Z`} fill={zloto > 0.5 ? "#B5352A" : "#3A3D48"} />
      <path d={`M ${c.x + r * 0.45} ${c.y + r * 0.6} L ${c.x + r * 0.7} ${c.y + r * 1.5} L ${c.x + r * 0.35} ${c.y + r * 1.3} L ${c.x + r * 0.05} ${c.y + r * 1.5} L ${c.x} ${c.y + r * 0.7} Z`} fill={zloto > 0.5 ? "#8C2620" : "#2F323E"} />
      {/* Tarcza: wersja szara, a na niej złota o rosnącej widoczności */}
      <circle cx={c.x} cy={c.y} r={r} fill="#3A3D48" stroke="#6C7282" strokeWidth={r * 0.1} />
      <circle cx={c.x} cy={c.y} r={r} fill={MARKA.zloto} stroke="#F3D58A" strokeWidth={r * 0.1} opacity={zloto} />
      <circle cx={c.x} cy={c.y} r={r * 0.74} fill="none" stroke={zloto > 0.5 ? "#A9802A" : "#565B69"} strokeWidth={r * 0.04} />
      <text x={c.x} y={c.y + r * 0.2} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={r * 0.58} fill={zloto > 0.5 ? MARKA.tlo : "#A9AFBD"}>
        {napis}
      </text>
      {/* Kłódka, dopóki odznaka jest zablokowana */}
      {zloto < 0.5 && (
        <g transform={`translate(${c.x + r * 0.62} ${c.y + r * 0.62}) scale(${(r / 100) * (1 - zloto * 2)})`}>
          <circle cx="0" cy="0" r="46" fill="#15161B" stroke="#6C7282" strokeWidth="5" />
          <path d="M -14 -6 L -14 -18 A 14 14 0 0 1 14 -18 L 14 -6" fill="none" stroke="#CBCBD3" strokeWidth="8" strokeLinecap="round" />
          <rect x="-22" y="-8" width="44" height="34" rx="6" fill="#CBCBD3" />
        </g>
      )}
    </g>
  );
};
