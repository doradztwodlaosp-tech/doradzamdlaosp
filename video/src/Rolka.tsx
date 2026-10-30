import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Naczelnik } from "./Naczelnik";
import { Scena } from "./Sceny";
import { DLUGOSC_S, KWESTIE } from "./scenariusz";
import glosnosc from "./dane/glosnosc.json";

const zakres = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Napis: React.FC<{ tekst: string }> = ({ tekst }) => {
  const frame = useCurrentFrame();
  const wejscie = interpolate(frame, [0, 6], [0, 1], zakres);
  return (
    <div
      style={{
        opacity: wejscie,
        transform: `translateY(${(1 - wejscie) * 20}px)`,
        fontSize: 56,
        fontWeight: 800,
        lineHeight: 1.2,
        color: "#1f2a44",
        textAlign: "center",
      }}
    >
      {tekst}
    </div>
  );
};

export const Rolka: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Usta poruszają się w rytm głośności nagrania
  const usta = glosnosc[frame] ?? 0;
  const mrugniecie = frame % 96 < 4 ? 1 - Math.abs(frame % 96 - 2) / 2 : 0;
  const machanie = t < 1.6 ? Math.sin((t / 1.6) * Math.PI) * (0.75 + 0.15 * Math.sin(frame / 3)) : 0;
  const kiwanie = t > KWESTIE[10].start ? Math.max(0, Math.sin((t - KWESTIE[10].start) * 5)) : 0;

  const klatka = (s: number) => Math.round(s * fps);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #fbf4ea 0%, #f2dcc3 100%)", fontFamily: "Inter, Arial, sans-serif" }}>
      <Audio src={staticFile("lektor.mp3")} />

      {/* Ilustracja sceny */}
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 190,
          width: 880,
          height: 743,
          borderRadius: 40,
          background: "#ffffff",
          boxShadow: "0 20px 50px rgba(31,42,68,0.15)",
          overflow: "hidden",
        }}
      >
        {KWESTIE.map((k, i) => {
          const od = klatka(k.start);
          const nastepny = i + 1 < KWESTIE.length ? klatka(KWESTIE[i + 1].start) : klatka(DLUGOSC_S);
          return (
            <Sequence key={i} from={od} durationInFrames={nastepny - od} layout="none">
              <Scena numer={i} />
            </Sequence>
          );
        })}
      </div>

      {/* Napisy */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 965, height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {KWESTIE.map((k, i) => {
          const od = klatka(k.start);
          const nastepny = i + 1 < KWESTIE.length ? klatka(KWESTIE[i + 1].start) : klatka(DLUGOSC_S);
          return (
            <Sequence key={i} from={od} durationInFrames={nastepny - od} layout="none">
              <Napis tekst={k.tekst} />
            </Sequence>
          );
        })}
      </div>

      {/* Pan Naczelnik */}
      <div style={{ position: "absolute", left: 227, top: 1200, width: 626, height: 730 }}>
        <Naczelnik usta={usta} mrugniecie={mrugniecie} machanie={machanie} kiwanie={kiwanie} />
      </div>
    </AbsoluteFill>
  );
};
