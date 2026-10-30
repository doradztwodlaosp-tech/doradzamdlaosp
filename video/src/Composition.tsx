import { CalculateMetadataFunction, Composition, AbsoluteFill } from "remotion";

type Props = {};

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

// Pionowa rolka 9:16 (Facebook Reels): 1080x1920, 30 kl./s, 5 sekund
export const MyComposition = () => {
  return (
    <Composition
      id="Rolka"
      component={MyComponent}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const MyComponent: React.FC<Props> = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
        fontSize: 80,
        color: "#1a1a1a",
      }}
    >
      Pan Naczelnik
    </AbsoluteFill>
  );
};
