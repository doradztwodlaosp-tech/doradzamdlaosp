import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARKA, USTAWIENIA as U } from "./marka";
import { Pyl, Studio } from "./Wyglad";
import { czasSlowa, type Naklejka, type UjecieCzas, ZAKRES } from "./typy";

// Ujęcia: zdjęcie z ruchem kamery, światłem i „naklejkami” przypiętymi do miejsc na zdjęciu.
// Zdjęcie pionowe wypełnia cały ekran; poziome pokazujemy jako ostry pas na rozmytej kopii (kamera jedzie w bok).

const SRODEK_X = U.strefaPrawo / 2;
const CZERWIEN = "#D8402F";
const ogranicz = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const PIGULKA: React.CSSProperties = {
  background: MARKA.zloto,
  color: MARKA.tlo,
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: 36,
  borderRadius: 999,
  padding: "10px 28px",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
};

// Punkt zaczepienia naklejki na zdjęciu (ułamki szerokości i wysokości zdjęcia)
const Punkt: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: 0, height: 0 }}>{children}</div>
);

// Złote kółko z podpisem – „spójrz tutaj”
const Znacznik: React.FC<{ tekst: string; gora?: boolean; od: number }> = ({ tekst, gora, od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const w = spring({ frame: od, fps, config: { damping: 12 } });
  const puls = (od % 36) / 36;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -65,
          top: -65,
          width: 130,
          height: 130,
          borderRadius: "50%",
          border: `6px solid ${MARKA.zloto}`,
          transform: `scale(${w})`,
          boxShadow: `0 0 0 ${puls * 36}px rgba(218,167,60,${0.35 * (1 - puls)}), 0 0 30px rgba(0,0,0,0.5)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -300,
          width: 600,
          top: gora ? -150 : 88,
          display: "flex",
          justifyContent: "center",
          opacity: w,
          transform: `translateY(${(1 - w) * (gora ? -16 : 16)}px)`,
        }}
      >
        <div style={PIGULKA}>{tekst}</div>
      </div>
    </>
  );
};

// Ciemna pigułka ze złotym „ptaszkiem” – odhaczona pozycja
const Chip: React.FC<{ tekst: string; od: number }> = ({ tekst, od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const w = spring({ frame: od, fps, config: { damping: 11, mass: 0.7 } });
  const rys = interpolate(od, [3, 10], [0, 1], ZAKRES);
  return (
    <div style={{ position: "absolute", left: -300, width: 600, top: -36, display: "flex", justifyContent: "center", transform: `scale(${w})` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "#101116ee",
          border: `3px solid ${MARKA.zloto}`,
          borderRadius: 999,
          padding: "10px 28px 10px 12px",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 36,
          color: MARKA.bialy,
          whiteSpace: "nowrap",
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r="23" fill={MARKA.zloto} />
          <path d="M12 24 L20 32 L34 16" stroke={MARKA.tlo} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="36" strokeDashoffset={36 * (1 - rys)} />
        </svg>
        {tekst}
      </div>
    </div>
  );
};

// Czerwona pieczęć, która „uderza” w dokument
const Pieczec: React.FC<{ tekst: string; od: number }> = ({ tekst, od }) => {
  if (od < 0) return null;
  const p = interpolate(od, [0, 4], [0, 1], ZAKRES);
  const odbicie = od > 4 ? 1 + 0.06 * Math.exp(-(od - 4) / 3) * Math.cos((od - 4) * 1.2) : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: -450,
        width: 900,
        top: -75,
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(od, [0, 2], [0, 1], ZAKRES),
        transform: `rotate(-11deg) scale(${interpolate(p, [0, 1], [2.6, 1]) * odbicie})`,
      }}
    >
      <div
        style={{
          border: `9px solid ${CZERWIEN}`,
          borderRadius: 14,
          padding: "4px 30px",
          color: CZERWIEN,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 86,
          letterSpacing: 5,
          whiteSpace: "nowrap",
          background: "rgba(255,255,255,0.1)",
          boxShadow: "0 0 40px rgba(0,0,0,0.35)",
        }}
      >
        {tekst}
      </div>
    </div>
  );
};

// Kartka papieru (np. lista nazwisk), opcjonalnie przekreślona
const Kartka: React.FC<{ tekst: string; krzyzyk?: number }> = ({ tekst, krzyzyk = 0 }) => {
  const k1 = Math.min(1, krzyzyk * 2);
  const k2 = Math.max(0, krzyzyk * 2 - 1);
  return (
    <div style={{ width: 150, height: 190, borderRadius: 10, background: "#F4F1EA", boxShadow: "0 14px 30px rgba(0,0,0,0.5)", position: "relative", fontFamily: FONT }}>
      <div style={{ position: "absolute", top: 12, left: 0, width: "100%", textAlign: "center", fontWeight: 800, fontSize: 24, color: MARKA.tlo }}>{tekst}</div>
      <div style={{ position: "absolute", top: 46, left: 45, width: 60, height: 4, background: MARKA.zloto }} />
      {[68, 90, 112, 134, 156].map((y, i) => (
        <div key={y} style={{ position: "absolute", top: y, left: 18, width: 114 - (i % 3) * 22, height: 8, borderRadius: 4, background: "#C9C6BE" }} />
      ))}
      {krzyzyk > 0 && (
        <svg width="150" height="190" viewBox="0 0 150 190" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <line x1="-8" y1="-8" x2={-8 + 166 * k1} y2={-8 + 206 * k1} stroke={CZERWIEN} strokeWidth="14" strokeLinecap="round" />
          {k2 > 0 && <line x1="158" y1="-8" x2={158 - 166 * k2} y2={-8 + 206 * k2} stroke={CZERWIEN} strokeWidth="14" strokeLinecap="round" />}
        </svg>
      )}
    </div>
  );
};

// Kartka leci łukiem z lewego dołu ekranu do punktu na zdjęciu (np. do drzwi sądu) i w nim znika
const KartkaLeci: React.FC<{ tekst: string; od: number }> = ({ tekst, od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const p = ogranicz(od / (0.9 * fps), 0, 1);
  if (p >= 1) {
    const blysk = interpolate(od - 0.9 * fps, [0, 8], [0, 1], ZAKRES);
    if (blysk >= 1) return null;
    return (
      <div
        style={{
          position: "absolute",
          left: -40 - blysk * 50,
          top: -40 - blysk * 50,
          width: 80 + blysk * 100,
          height: 80 + blysk * 100,
          borderRadius: "50%",
          border: `5px solid ${MARKA.zloto}`,
          opacity: 1 - blysk,
        }}
      />
    );
  }
  const e = p * p * (3 - 2 * p);
  const dx = (1 - e) * -330;
  const dy = (1 - e) * 560 - Math.sin(Math.PI * e) * 250;
  return (
    <div style={{ position: "absolute", left: dx - 75, top: dy - 95, transform: `rotate(${-18 + 26 * e}deg) scale(${1 - 0.72 * e})` }}>
      <Kartka tekst={tekst} />
    </div>
  );
};

// Kartka odbija się od punktu na zdjęciu, rośnie i zostaje przekreślona
const KartkaOdbita: React.FC<{ tekst: string; od: number; odKrzyzyka: number }> = ({ tekst, od, odKrzyzyka }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const p = ogranicz(od / (0.55 * fps), 0, 1);
  const e = 1 - (1 - p) * (1 - p);
  const dx = e * 215;
  const dy = e * 190 - Math.sin(Math.PI * e) * 110;
  const krzyzyk = interpolate(odKrzyzyka, [0, 8], [0, 1], ZAKRES);
  return (
    <div style={{ position: "absolute", left: dx - 75, top: dy - 95, transform: `rotate(${8 - 18 * e}deg) scale(${0.28 + 0.92 * e})` }}>
      <Kartka tekst={tekst} krzyzyk={krzyzyk} />
    </div>
  );
};

// Wielki napis na środku ekranu (np. „KONIEC?”)
const Napis: React.FC<{ tekst: string; od: number }> = ({ tekst, od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const w = spring({ frame: od, fps, config: { damping: 11, mass: 0.7 } });
  const pytajnik = tekst.endsWith("?");
  const tresc = pytajnik ? tekst.slice(0, -1) : tekst;
  const rozmiar = Math.min(190, Math.floor(((U.strefaPrawo - 120) * 1.3) / tekst.length));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: U.strefaPrawo,
        top: 760,
        display: "flex",
        justifyContent: "center",
        alignItems: "baseline",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: rozmiar,
        color: MARKA.bialy,
        textShadow: "0 6px 40px rgba(0,0,0,0.9)",
        transform: `scale(${0.7 + 0.3 * w})`,
        opacity: w,
      }}
    >
      {tresc}
      {pytajnik && (
        <span style={{ color: MARKA.zloto, display: "inline-block", transformOrigin: "50% 80%", transform: `rotate(${Math.sin(od / 5) * 9}deg) scale(1.1)` }}>?</span>
      )}
    </div>
  );
};

// Wielka złota liczba, która „nalicza się” do wartości docelowej
const Licznik: React.FC<{ n: Extract<Naklejka, { typ: "licznik" }>; od: number }> = ({ n, od }) => {
  const { fps } = useVideoConfig();
  if (od < 0) return null;
  const w = spring({ frame: od, fps, config: { damping: 13 } });
  const p = interpolate(od, [0, 0.9 * fps], [0, 1], ZAKRES);
  const wartosc = n.od + (n.do - n.od) * (1 - Math.pow(1 - p, 3));
  const tekst = wartosc.toFixed(n.miejsca ?? 0).replace(".", ",") + (n.sufiks ?? "");
  return (
    <div style={{ position: "absolute", left: 0, width: U.strefaPrawo, top: 620, textAlign: "center", fontFamily: FONT, opacity: w, transform: `scale(${0.8 + 0.2 * w})` }}>
      <div style={{ fontWeight: 800, fontSize: 300, lineHeight: 1, color: MARKA.zloto, textShadow: "0 10px 60px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>{tekst}</div>
      {n.podpis && <div style={{ marginTop: 14, fontWeight: 700, fontSize: 50, color: MARKA.bialy, textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>{n.podpis}</div>}
    </div>
  );
};

export const UjecieTla: React.FC<{
  u: UjecieCzas;
  odcinek: string;
  wymiary?: [number, number];
  pierwsze: boolean;
  klatkaStartu: number;
  dlugosc: number;
}> = ({ u, odcinek, wymiary, pierwsze, klatkaStartu, dlugosc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wejscie = pierwsze ? 1 : interpolate(frame, [0, U.przenikanie], [0, 1], ZAKRES);
  const tAbs = (klatkaStartu + frame) / fps;
  // Ile klatek minęło od słowa (albo od początku ujęcia, gdy słowa nie podano)
  const od = (slowo?: string) => Math.round((tAbs - ((slowo ? czasSlowa(u.scena, slowo) : undefined) ?? u.start)) * fps);

  const naklejki = u.naklejki ?? [];
  const ekranowe = naklejki.map((n, i) => {
    if (n.typ === "napis") return <Napis key={i} tekst={n.tekst} od={od(n.slowo)} />;
    if (n.typ === "licznik") return <Licznik key={i} n={n} od={od(n.slowo)} />;
    return null;
  });

  if (!u.obraz || !wymiary) {
    return (
      <AbsoluteFill style={{ opacity: wejscie, backgroundColor: MARKA.tlo }}>
        {u.studio && <Studio />}
        {ekranowe}
      </AbsoluteFill>
    );
  }

  const [W, H] = wymiary;
  const pas = (u.uklad ?? (W / H > 0.8 ? "pas" : "pelny")) === "pas";
  const kadr = u.kadr ?? { od: [0.5, 0.5] as [number, number] };
  const cel = kadr.do ?? [kadr.od[0] + 0.025, kadr.od[1]];
  const p = interpolate(frame, [0, dlugosc], [0, 1], ZAKRES);
  const fx = kadr.od[0] + (cel[0] - kadr.od[0]) * p;
  const fy = kadr.od[1] + (cel[1] - kadr.od[1]) * p;
  const zoomOd = kadr.zoomOd ?? 1;
  const zoom = zoomOd + ((kadr.zoomDo ?? zoomOd * 1.06) - zoomOd) * p;

  const ramaGora = pas ? U.pasOdGory : 0;
  const ramaWys = pas ? U.pasWysokosc : 1920;
  const baza = pas ? Math.max(ramaWys / H, 1080 / W) : Math.max(1080 / W, 1920 / H);
  const szer = W * baza * zoom;
  const wys = H * baza * zoom;

  // Drżenie kamery po uderzeniu pieczęci
  const pieczec = naklejki.find((n) => n.typ === "pieczec");
  const odUderzenia = pieczec && pieczec.typ === "pieczec" ? od(pieczec.slowo) - 4 : -1;
  const drzenie = odUderzenia >= 0 && odUderzenia < 14 ? 1 - odUderzenia / 14 : 0;
  const dx = Math.sin(odUderzenia * 2.4) * 14 * drzenie;
  const dy = Math.cos(odUderzenia * 3.1) * 10 * drzenie;

  // Punkt kadru ustawiamy na środku bezpiecznej strefy, pilnując, by zdjęcie zawsze zakrywało ramę
  const lewo = ogranicz(SRODEK_X - fx * szer, 1080 - szer, 0) + dx;
  const gora = ogranicz((pas ? ramaWys * 0.5 : 900) - fy * wys, ramaWys - wys, 0) + dy;

  const ciemno = u.przyciemnij ? u.przyciemnij[0] + (u.przyciemnij[1] - u.przyciemnij[0]) * p : 0;
  const maska = "linear-gradient(180deg, transparent 0%, #000 8%, #000 88%, transparent 100%)";
  const plik = staticFile(`odcinki/${odcinek}/${u.obraz}`);

  return (
    <AbsoluteFill style={{ opacity: wejscie, backgroundColor: MARKA.tlo, overflow: "hidden" }}>
      {pas && (
        <Img
          src={plik}
          style={{ position: "absolute", left: -130, top: -130, width: 1340, height: 2180, objectFit: "cover", filter: "blur(34px) brightness(0.4) saturate(0.85)" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ramaGora,
          width: 1080,
          height: ramaWys,
          overflow: "hidden",
          ...(pas ? { WebkitMaskImage: maska, maskImage: maska } : {}),
        }}
      >
        <div style={{ position: "absolute", left: lewo, top: gora, width: szer, height: wys }}>
          <Img src={plik} style={{ width: "100%", height: "100%", filter: "contrast(1.05) saturate(0.95)" }} />
          {(u.swiatla ?? []).map((s, i) => {
            const r = s.r ?? 180;
            const migot = 0.55 + 0.22 * Math.sin(frame / 7 + i * 2.1) + 0.13 * Math.sin(frame / 2.3 + i * 5);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${s.x * 100}%`,
                  top: `${s.y * 100}%`,
                  width: r * 2,
                  height: r * 2,
                  marginLeft: -r,
                  marginTop: -r,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,196,110,0.55) 0%, rgba(255,170,70,0.18) 45%, transparent 70%)",
                  mixBlendMode: "screen",
                  opacity: migot,
                }}
              />
            );
          })}
          {naklejki.map((n, i) => {
            switch (n.typ) {
              case "znacznik":
                return (
                  <Punkt key={i} x={n.x} y={n.y}>
                    <Znacznik tekst={n.tekst} gora={n.gora} od={od(n.slowo)} />
                  </Punkt>
                );
              case "chip":
                return (
                  <Punkt key={i} x={n.x} y={n.y}>
                    <Chip tekst={n.tekst} od={od(n.slowo)} />
                  </Punkt>
                );
              case "pieczec":
                return (
                  <Punkt key={i} x={n.x} y={n.y}>
                    <Pieczec tekst={n.tekst} od={od(n.slowo)} />
                  </Punkt>
                );
              case "kartka-leci":
                return (
                  <Punkt key={i} x={n.x} y={n.y}>
                    <KartkaLeci tekst={n.tekst ?? "LISTA"} od={od(n.slowo)} />
                  </Punkt>
                );
              case "kartka-odbita":
                return (
                  <Punkt key={i} x={n.x} y={n.y}>
                    <KartkaOdbita tekst={n.tekst ?? "LISTA"} od={od()} odKrzyzyka={od(n.krzyzyk)} />
                  </Punkt>
                );
              case "brak": {
                const o = od(n.slowo);
                if (o < 0) return null;
                const w = interpolate(o, [0, 6], [0, 1], ZAKRES);
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${(n.x - n.szer / 2) * 100}%`,
                      top: `${(n.y - n.wys / 2) * 100}%`,
                      width: `${n.szer * 100}%`,
                      height: `${n.wys * 100}%`,
                      border: `5px solid ${CZERWIEN}`,
                      borderRadius: 8,
                      background: `rgba(216,64,47,${0.2 + 0.12 * Math.sin(o / 4)})`,
                      boxShadow: "0 0 26px rgba(216,64,47,0.65)",
                      opacity: w,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        right: -34,
                        top: "50%",
                        width: 60,
                        height: 60,
                        marginTop: -30,
                        borderRadius: "50%",
                        background: CZERWIEN,
                        color: MARKA.bialy,
                        fontFamily: FONT,
                        fontWeight: 800,
                        fontSize: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `scale(${w})`,
                      }}
                    >
                      !
                    </div>
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </div>
        {u.pyl && <Pyl gora={0} wysokosc={ramaWys} ziarno={u.klucz} />}
      </div>
      {ciemno > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(13,14,18,${ciemno})` }} />}
      {!pas && <AbsoluteFill style={{ background: `linear-gradient(180deg, ${MARKA.tlo}cc 0%, transparent 30%, transparent 64%, ${MARKA.tlo}f2 84%)` }} />}
      {pas && <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent 80%, ${MARKA.tlo}e6 100%)` }} />}
      {ekranowe}
    </AbsoluteFill>
  );
};
