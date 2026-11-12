import { Composition } from "remotion";
import { Rolka } from "./Rolka";
import { RolkaOSP, obliczRolke } from "./RolkaOSP";
import { DLUGOSC_S } from "./scenariusz";

// Pionowe rolki 9:16 (Facebook Reels): 1080x1920, 30 kl./s
export const MyComposition = () => {
  return (
    <>
      {/* Szablon docelowy: odcinek wybierany przez props, np. --props='{"odcinek":"nowy-zarzad"}' */}
      <Composition
        id="RolkaOSP"
        component={RolkaOSP}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ odcinek: "nowy-zarzad" }}
        calculateMetadata={obliczRolke}
      />
      {/* Pierwszy test z rysowaną postacią */}
      <Composition
        id="NowyZarzad"
        component={Rolka}
        durationInFrames={DLUGOSC_S * 30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
