import React, { useMemo } from "react";
import { FONT } from "./marka";

/** Uproszczony obrys Polski (długość, szerokość geograficzna), zgodnie z ruchem wskazówek zegara od Świnoujścia. */
const OBRYS: [number, number][] = [
  [14.22, 53.92], [14.45, 53.93], [14.75, 54.03], [15.2, 54.1], [15.58, 54.18], [16.0, 54.3], [16.4, 54.43], [16.85, 54.58],
  [17.2, 54.7], [17.55, 54.76], [18.0, 54.8], [18.33, 54.83], [18.8, 54.62], [18.45, 54.6], [18.55, 54.52], [18.7, 54.37],
  [19.4, 54.37], [19.64, 54.45], [20.5, 54.38], [21.2, 54.33], [22.0, 54.35], [22.8, 54.36], [23.1, 54.25], [23.4, 54.15],
  [23.51, 53.94], [23.55, 53.55], [23.95, 53.1], [24.15, 52.8], [23.9, 52.4], [23.6, 52.08], [23.65, 51.65], [23.55, 51.5],
  [24.05, 51.3], [24.1, 50.85], [23.65, 50.4], [23.2, 50.05], [22.9, 49.8], [22.7, 49.55], [22.56, 49.08], [21.9, 49.35],
  [21.4, 49.4], [20.9, 49.35], [20.5, 49.4], [20.1, 49.2], [19.8, 49.2], [19.5, 49.6], [19.15, 49.4], [18.95, 49.5],
  [18.62, 49.75], [18.3, 49.9], [18.2, 50.1], [17.7, 50.3], [17.35, 50.3], [16.9, 50.45], [16.65, 50.1], [16.35, 50.4],
  [16.2, 50.65], [15.85, 50.78], [15.3, 50.85], [15.0, 50.98], [14.82, 50.87], [14.9, 51.05], [14.97, 51.15], [14.8, 51.45],
  [14.72, 51.55], [14.73, 51.95], [14.55, 52.35], [14.65, 52.6], [14.2, 52.85], [14.45, 53.25], [14.55, 53.4], [14.35, 53.7],
];

const MIN_LON = 14.1, MAX_LON = 24.2, MIN_LAT = 48.95, MAX_LAT = 54.9;
const KOS = Math.cos((52 * Math.PI) / 180);

const wewnatrz = (x: number, y: number) => {
  let w = false;
  for (let i = 0, j = OBRYS.length - 1; i < OBRYS.length; j = i++) {
    const [xi, yi] = OBRYS[i], [xj, yj] = OBRYS[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w;
  }
  return w;
};

const los = (i: number) => {
  const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};

/** Mapa Polski z remizami OSP pojawiającymi się jako czerwone punkty (postęp 0–1). */
export const MapaPolski: React.FC<{ wys?: number; postep: number; punkty?: number }> = ({ wys = 840, postep, punkty = 520 }) => {
  const sk = wys / (MAX_LAT - MIN_LAT);
  const szer = (MAX_LON - MIN_LON) * KOS * sk;
  const px = (lon: number, lat: number): [number, number] => [(lon - MIN_LON) * KOS * sk, (MAX_LAT - lat) * sk];
  const pts = useMemo(() => {
    const out: [number, number][] = [];
    let i = 1;
    while (out.length < punkty && i < 20000) {
      const lon = MIN_LON + los(i) * (MAX_LON - MIN_LON);
      const lat = MIN_LAT + los(i + 7777) * (MAX_LAT - MIN_LAT);
      if (wewnatrz(lon, lat)) out.push([lon, lat]);
      i++;
    }
    return out;
  }, [punkty]);
  const d = OBRYS.map(([lo, la], i) => `${i ? "L" : "M"}${px(lo, la)[0].toFixed(1)},${px(lo, la)[1].toFixed(1)}`).join(" ") + " Z";
  const widoczne = Math.floor(pts.length * postep);
  return (
    <svg width={szer} height={wys} viewBox={`0 0 ${szer} ${wys}`} style={{ overflow: "visible", fontFamily: FONT }}>
      <defs>
        <linearGradient id="mapaWyp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6F0E2" />
          <stop offset="1" stopColor="#E7DCC4" />
        </linearGradient>
        <filter id="mapaCien" x="-10%" y="-10%" width="120%" height="125%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <path d={d} fill="rgba(35,28,18,0.35)" filter="url(#mapaCien)" transform="translate(0,16)" />
      <path d={d} fill="url(#mapaWyp)" stroke="#C9962F" strokeWidth={5} strokeLinejoin="round" />
      {pts.slice(0, widoczne).map(([lo, la], i) => {
        const [x, y] = px(lo, la);
        const wiek = Math.min(1, (widoczne - i) / 14);
        return (
          <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${0.4 + 0.6 * wiek})`}>
            <circle r={9} fill="#C9101A" stroke="#FFFFFF" strokeWidth={2.5} />
          </g>
        );
      })}
    </svg>
  );
};
