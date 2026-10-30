import React from "react";

// Postać Pana Naczelnika (rysunek wektorowy) w mundurze galowym OSP z medalami.
// usta: 0 = zamknięte, 1 = szeroko otwarte; mrugniecie: 0..1; machanie/kiwanie: 0..1

const MUNDUR = "#1f2a44";
const MUNDUR_CIEMNY = "#151d31";
const SKORA = "#f1c7a3";
const SKORA_CIEN = "#e0ab85";
const SIWE = "#d9d9d9";
const ZLOTY = "#e8b84a";
const CZERWONY = "#c8102e";
const SREBRNY = "#c9ced6";
const NIEBIESKI = "#2f6fd0";

export const Naczelnik: React.FC<{
  usta: number;
  mrugniecie: number;
  machanie: number;
  kiwanie: number;
  wysokosc?: number; // wysokość kadru postaci: 700 = do piersi, 900 = z kieszeniami
}> = ({ usta, mrugniecie, machanie, kiwanie, wysokosc = 700 }) => {
  const otwarcie = 4 + usta * 34;
  const ramie = -machanie * 150;
  const glowa = kiwanie * 8;

  return (
    <svg viewBox={`0 0 600 ${wysokosc}`} width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* Mundur galowy OSP: marynarka z wyłogami, biała koszula, krawat, srebrne guziki */}
      <path d="M70 900 L85 600 C95 520 170 470 300 470 C430 470 505 520 515 600 L530 900 Z" fill={MUNDUR} />
      <path d="M255 470 L300 600 L345 470 Z" fill="#ffffff" />
      <path d="M290 488 L310 488 L306 590 L300 602 L294 590 Z" fill="#111111" />
      <path d="M255 470 L205 486 L232 560 L212 574 L300 690 Z" fill={MUNDUR_CIEMNY} />
      <path d="M345 470 L395 486 L368 560 L388 574 L300 690 Z" fill={MUNDUR_CIEMNY} />
      {[720, 790, 860].map((y) => (
        <circle key={y} cx="300" cy={y} r="9" fill={SREBRNY} />
      ))}

      {/* Naramienniki */}
      <rect x="112" y="500" width="78" height="22" rx="11" fill={MUNDUR_CIEMNY} transform="rotate(-18 151 511)" />
      <circle cx="176" cy="502" r="6" fill={SREBRNY} />
      <rect x="410" y="500" width="78" height="22" rx="11" fill={MUNDUR_CIEMNY} transform="rotate(18 449 511)" />
      <circle cx="424" cy="502" r="6" fill={SREBRNY} />

      {/* Kieszenie piersiowe i dolne z patkami */}
      {[
        [138, 650, 100, 80],
        [362, 650, 100, 80],
        [112, 820, 120, 80],
        [368, 820, 120, 80],
      ].map(([x, y, w, h]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} rx="6" fill={MUNDUR} stroke={MUNDUR_CIEMNY} strokeWidth="4" />
          <path d={`M${x - 4} ${y} L${x + w + 4} ${y} L${x + w + 4} ${y + 24} L${x + w / 2} ${y + 34} L${x - 4} ${y + 24} Z`} fill={MUNDUR_CIEMNY} />
          <circle cx={x + w / 2} cy={y + 24} r="6" fill={SREBRNY} />
        </g>
      ))}

      {/* Sznur galowy (biało-niebieski) z prawego ramienia */}
      {[
        "M150 505 C145 630 225 680 298 650",
        "M168 505 C180 600 235 630 292 618",
      ].map((d) => (
        <g key={d}>
          <path d={d} stroke="#ffffff" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d={d} stroke={NIEBIESKI} strokeWidth="13" fill="none" strokeDasharray="7 9" />
        </g>
      ))}
      <rect x="290" y="640" width="10" height="34" rx="4" fill={SREBRNY} transform="rotate(-20 295 657)" />

      {/* Baretki i medale na lewej piersi */}
      {[
        ["#c8102e", "#ffffff"],
        ["#1f4fa8", "#f2c230"],
        ["#2e7d32", "#c8102e"],
      ].map(([a, b], i) => (
        <g key={i}>
          <rect x={331 + i * 30} y="560" width="28" height="12" fill={a} />
          <rect x={341 + i * 30} y="560" width="8" height="12" fill={b} />
        </g>
      ))}
      {[
        ["#c8102e", "#ffffff", ZLOTY],
        ["#1f4fa8", "#ffffff", SREBRNY],
        ["#c8102e", "#1f4fa8", "#c98a4b"],
      ].map(([a, b, metal], i) => {
        const x = 335 + i * 30;
        return (
          <g key={i}>
            <path d={`M${x} 578 L${x + 22} 578 L${x + 20} 610 L${x + 2} 610 Z`} fill={a} />
            <rect x={x + 8} y="578" width="6" height="32" fill={b} />
            <circle cx={x + 11} cy="624" r="13" fill={metal} stroke="#00000033" strokeWidth="2" />
            <path
              d={`M${x + 11} 614 L${x + 14} 621 L${x + 21} 621 L${x + 15} 626 L${x + 17} 633 L${x + 11} 629 L${x + 5} 633 L${x + 7} 626 L${x + 1} 621 L${x + 8} 621 Z`}
              fill="#ffffff"
              opacity="0.55"
            />
          </g>
        );
      })}

      {/* Prawe ramię (macha) */}
      <g transform={`rotate(${ramie} 455 520)`}>
        <rect x="425" y="505" width="62" height="330" rx="30" fill={MUNDUR} />
        <rect x="425" y="800" width="62" height="12" fill={MUNDUR_CIEMNY} />
        <circle cx="456" cy="860" r="36" fill={SKORA} />
      </g>

      {/* Głowa */}
      <g transform={`rotate(0) translate(0 ${glowa})`}>
        <rect x="262" y="400" width="76" height="80" fill={SKORA_CIEN} />
        <ellipse cx="300" cy="300" rx="125" ry="140" fill={SKORA} />
        <ellipse cx="176" cy="310" rx="18" ry="30" fill={SKORA_CIEN} />
        <ellipse cx="424" cy="310" rx="18" ry="30" fill={SKORA_CIEN} />
        {/* Siwe skronie */}
        <path d="M178 250 C180 300 185 320 192 340 L200 250 Z" fill={SIWE} />
        <path d="M422 250 C420 300 415 320 408 340 L400 250 Z" fill={SIWE} />

        {/* Oczy */}
        {[250, 350].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="300" rx="16" ry={14 * (1 - mrugniecie) + 1} fill="#ffffff" />
            <circle cx={x} cy="301" r={9 * (1 - mrugniecie)} fill="#2b2b2b" />
            <path d={`M${x - 28} ${270} Q${x} ${258} ${x + 28} ${270}`} stroke={SIWE} strokeWidth="11" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* Nos */}
        <path d="M300 300 Q318 345 300 358 Q288 360 284 352" stroke={SKORA_CIEN} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Rumieńce i zmarszczki od uśmiechu */}
        <ellipse cx="225" cy="350" rx="26" ry="16" fill="#e89a8a" opacity="0.45" />
        <ellipse cx="375" cy="350" rx="26" ry="16" fill="#e89a8a" opacity="0.45" />
        <path d="M212 296 Q205 306 212 316" stroke={SKORA_CIEN} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M388 296 Q395 306 388 316" stroke={SKORA_CIEN} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M262 236 Q300 228 338 236" stroke={SKORA_CIEN} strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Usta: uśmiech, otwierają się w rytm głosu */}
        <path d={`M268 386 Q300 ${398 + otwarcie} 332 386 Q300 392 268 386 Z`} fill="#7a2e2e" />
        <path d="M262 384 Q300 404 338 384" stroke="#a5523f" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Wąs */}
        <path d="M300 366 C270 356 230 362 218 388 C245 384 270 386 300 378 C330 386 355 384 382 388 C370 362 330 356 300 366 Z" fill={SIWE} />

        {/* Czapka */}
        <path d="M168 225 C170 140 230 110 300 110 C370 110 430 140 432 225 Z" fill={MUNDUR} />
        <rect x="168" y="205" width="264" height="34" fill={MUNDUR_CIEMNY} />
        <rect x="168" y="216" width="264" height="10" fill={CZERWONY} />
        <path d="M175 238 Q300 280 425 238 L425 246 Q300 296 175 246 Z" fill="#0b0f1a" />
        <circle cx="300" cy="170" r="24" fill={ZLOTY} />
        <path d="M300 152 L306 166 L320 166 L309 175 L313 189 L300 180 L287 189 L291 175 L280 166 L294 166 Z" fill={CZERWONY} />
      </g>
    </svg>
  );
};
