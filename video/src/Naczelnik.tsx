import React from "react";

// Postać Pana Prawnika (rysunek wektorowy; komponent nazywa się Naczelnik z pierwszej wersji): strażak OSP i prawnik, ok. 45–50 lat, mocnej budowy,
// w mundurze galowym OSP z rogatywką i medalami.
// usta: 0 = zamknięte, 1 = szeroko otwarte; mrugniecie: 0..1; machanie/kiwanie: 0..1

const MUNDUR = "#1f2a44";
const MUNDUR_CIEMNY = "#151d31";
const SKORA = "#f1c7a3";
const SKORA_CIEN = "#e0ab85";
const SIWE = "#b9b9b9";
const WLOSY = "#3b2f28";
const ZLOTY = "#e8b84a";
const SREBRNY = "#c9ced6";
const NIEBIESKI = "#2f6fd0";
const OTOK = "#2b5aa6";

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
      <path d="M38 900 L52 590 C68 505 165 466 300 466 C435 466 532 505 548 590 L562 900 Z" fill={MUNDUR} />
      <path d="M255 470 L300 600 L345 470 Z" fill="#ffffff" />
      <path d="M290 488 L310 488 L306 590 L300 602 L294 590 Z" fill="#111111" />
      <path d="M255 470 L205 486 L232 560 L212 574 L300 690 Z" fill={MUNDUR_CIEMNY} />
      <path d="M345 470 L395 486 L368 560 L388 574 L300 690 Z" fill={MUNDUR_CIEMNY} />
      {[720, 790, 860].map((y) => (
        <circle key={y} cx="300" cy={y} r="9" fill={SREBRNY} />
      ))}

      {/* Naramienniki */}
      <rect x="88" y="502" width="84" height="22" rx="11" fill={MUNDUR_CIEMNY} transform="rotate(-16 130 513)" />
      <circle cx="160" cy="504" r="6" fill={SREBRNY} />
      <rect x="428" y="502" width="84" height="22" rx="11" fill={MUNDUR_CIEMNY} transform="rotate(16 470 513)" />
      <circle cx="440" cy="504" r="6" fill={SREBRNY} />

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
        "M132 508 C130 635 220 684 298 650",
        "M152 506 C166 604 232 632 292 618",
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
      <g transform={`rotate(${ramie} 482 522)`}>
        <rect x="448" y="505" width="70" height="330" rx="34" fill={MUNDUR} />
        <rect x="448" y="800" width="70" height="12" fill={MUNDUR_CIEMNY} />
        <circle cx="483" cy="862" r="38" fill={SKORA} />
      </g>

      {/* Głowa: mężczyzna ok. 45–50 lat, krótko ostrzyżony, ogolony, mocna szczęka, spokojny wyraz twarzy */}
      <g transform={`translate(0 ${glowa})`}>
        <path d="M242 388 L358 388 L366 482 L234 482 Z" fill={SKORA_CIEN} />
        <ellipse cx="174" cy="306" rx="17" ry="30" fill={SKORA_CIEN} />
        <ellipse cx="426" cy="306" rx="17" ry="30" fill={SKORA_CIEN} />
        <path
          d="M176 250 C176 178 230 148 300 148 C370 148 424 178 424 250 L424 332 C424 388 386 428 340 440 L260 440 C214 428 176 388 176 332 Z"
          fill={SKORA}
        />
        {/* Krótkie ciemne włosy z siwiejącymi skroniami */}
        <path d="M180 240 C180 214 186 200 198 192 L200 292 C190 286 182 276 180 262 Z" fill={WLOSY} />
        <path d="M420 240 C420 214 414 200 402 192 L400 292 C410 286 418 276 420 262 Z" fill={WLOSY} />
        <path d="M184 250 L198 250 L198 290 C190 284 185 274 184 262 Z" fill={SIWE} opacity="0.7" />
        <path d="M416 250 L402 250 L402 290 C410 284 415 274 416 262 Z" fill={SIWE} opacity="0.7" />
        {/* Cień zarostu */}
        <path d="M188 338 C198 400 240 434 300 438 C360 434 402 400 412 338 C398 384 360 412 300 414 C240 412 202 384 188 338 Z" fill="#8a6a58" opacity="0.2" />

        {/* Oczy i proste, ciemne brwi */}
        {[250, 350].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="302" rx="15" ry={12 * (1 - mrugniecie) + 1} fill="#ffffff" />
            <circle cx={x} cy="303" r={8 * (1 - mrugniecie)} fill="#3a2c22" />
            <path
              d={x < 300 ? `M${x - 28} 276 L${x + 24} 280` : `M${x - 24} 280 L${x + 28} 276`}
              stroke={WLOSY}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* Nos */}
        <path d="M300 304 Q318 348 302 360 Q290 362 286 354" stroke={SKORA_CIEN} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Bruzdy nosowo-wargowe */}
        <path d="M258 362 Q250 386 260 406" stroke={SKORA_CIEN} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M342 362 Q350 386 340 406" stroke={SKORA_CIEN} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* Usta: spokojny, lekki uśmiech; otwierają się w rytm głosu */}
        <path d={`M272 392 Q300 ${396 + otwarcie} 328 392 Q300 397 272 392 Z`} fill="#7a3a32" />
        <path d="M268 390 Q300 400 332 390" stroke="#a8604f" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* Rogatywka OSP: kwadratowy denko, niebieski otok, czarny pasek, lakierowany daszek, srebrny orzeł */}
        <path d="M172 174 L150 132 L450 132 L428 174 Z" fill={MUNDUR} />
        <path d="M150 132 L300 92 L450 132 L300 168 Z" fill="#26345a" />
        <path d="M150 132 L300 168 L450 132" stroke={MUNDUR_CIEMNY} strokeWidth="3" fill="none" />
        <path d="M300 92 L300 168" stroke={MUNDUR_CIEMNY} strokeWidth="2" opacity="0.6" />
        <rect x="172" y="172" width="256" height="62" fill={OTOK} />
        <rect x="172" y="222" width="256" height="12" fill="#1f4785" />
        <rect x="178" y="208" width="244" height="11" rx="4" fill="#111111" />
        <circle cx="184" cy="213" r="7" fill={SREBRNY} stroke="#6f757d" strokeWidth="1.5" />
        <circle cx="416" cy="213" r="7" fill={SREBRNY} stroke="#6f757d" strokeWidth="1.5" />
        <path d="M172 232 Q300 286 428 232 L430 244 Q300 302 170 244 Z" fill="#0b0f1a" />
        <path d="M200 246 Q300 284 400 246" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
        <g transform="translate(300 158) scale(1.3)" fill={SREBRNY} stroke="#7d838c" strokeWidth="1.2">
          <path d="M-2 -6 C-12 -14 -26 -12 -30 2 C-23 -1 -18 1 -16 8 C-12 3 -7 5 -4 12 Z" />
          <path d="M2 -6 C12 -14 26 -12 30 2 C23 -1 18 1 16 8 C12 3 7 5 4 12 Z" />
          <ellipse cx="0" cy="4" rx="6.5" ry="13" />
          <circle cx="0" cy="-13" r="5.5" />
          <path d="M-6 -20 L-6 -25 L-3 -22 L0 -26 L3 -22 L6 -25 L6 -20 Z" />
          <path d="M-7 15 L0 26 L7 15 Z" />
        </g>
      </g>
    </svg>
  );
};
