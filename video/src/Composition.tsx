import { Composition } from "remotion";
import { Rolka } from "./Rolka";
import { DLUGOSC_S } from "./scenariusz";

// Pionowa rolka 9:16 (Facebook Reels): 1080x1920, 30 kl./s
export const MyComposition = () => {
  return (
    <Composition
      id="NowyZarzad"
      component={Rolka}
      durationInFrames={DLUGOSC_S * 30}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
