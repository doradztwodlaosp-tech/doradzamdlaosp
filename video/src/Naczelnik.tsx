import React from "react";

// Tymczasowa postać Pana Naczelnika (rysunek wektorowy).
// usta: 0 = zamknięte, 1 = szeroko otwarte; mrugniecie: 0..1; machanie/kiwanie: 0..1

const MUNDUR = "#1f2a44";
const MUNDUR_CIEMNY = "#151d31";
const SKORA = "#f1c7a3";
const SKORA_CIEN = "#e0ab85";
const SIWE = "#d9d9d9";
const ZLOTY = "#e8b84a";
const CZERWONY = "#c8102e";

export const Naczelnik: React.FC<{
  usta: number;
  mrugniecie: number;
  machanie: number;
  kiwanie: number;
}> = ({ usta, mrugniecie, machanie, kiwanie }) => {
  const otwarcie = 4 + usta * 34;
  const ramie = -machanie * 150;
  const glowa = kiwanie * 8;

  return (
    <svg viewBox="0 0 600 700" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* Tułów */}
      <path d="M90 700 C100 540 170 470 300 470 C430 470 500 540 510 700 Z" fill={MUNDUR} />
      <path d="M300 470 L250 470 L300 560 L350 470 Z" fill="#ffffff" />
      <path d="M285 490 L315 490 L308 600 L300 615 L292 600 Z" fill={MUNDUR_CIEMNY} />
      <path d="M250 470 L215 480 L300 590 Z" fill={MUNDUR_CIEMNY} />
      <path d="M350 470 L385 480 L300 590 Z" fill={MUNDUR_CIEMNY} />
      <rect x="215" y="520" width="34" height="16" rx="3" fill={CZERWONY} />
      <rect x="351" y="520" width="34" height="16" rx="3" fill={CZERWONY} />
      {[620, 670].map((y) => (
        <circle key={y} cx="300" cy={y} r="9" fill={ZLOTY} />
      ))}
      <rect x="120" y="500" width="70" height="14" rx="7" fill={ZLOTY} />
      <rect x="410" y="500" width="70" height="14" rx="7" fill={ZLOTY} />

      {/* Prawe ramię (macha) */}
      <g transform={`rotate(${ramie} 455 520)`}>
        <rect x="425" y="505" width="62" height="200" rx="30" fill={MUNDUR} />
        <rect x="425" y="680" width="62" height="14" fill={ZLOTY} />
        <circle cx="456" cy="725" r="36" fill={SKORA} />
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
