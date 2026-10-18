import Svg, { Circle, Path, Rect } from "react-native-svg";

// The same lucide-style paths as the Paper frames, drawn with react-native-svg.
const PATHS = {
  back: ["M15 6l-6 6 6 6"],
  close: ["M6 6l12 12M18 6L6 18"],
  chevron: ["M9 6l6 6-6 6"],
  check: ["M5 12l5 5L19 7"],
  pencil: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"],
  landmark: ["M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M2 10l10-6 10 6z"],
  book: [
    "M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2z",
    "M22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z",
  ],
  phone: [
    "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2",
  ],
  bell: [
    "M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9",
    "M10.3 21a1.94 1.94 0 003.4 0",
  ],
  scan: [
    "M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2",
    "M8 12h8",
  ],
  user: ["M4 21a8 8 0 0116 0"],
  alert: ["M12 8v5M12 16.5v.01"],
  dash: ["M7 12h10"],
} as const;

export type IconName =
  | keyof typeof PATHS
  | "badgeCheck"
  | "circleDashed"
  | "monitor";

type Props = { name: IconName; size?: number; color?: string; stroke?: number };

export function Icon({
  name,
  size = 20,
  color = "#0B1B2B",
  stroke = 1.75,
}: Props) {
  const common = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === "user" ? <Circle cx={12} cy={8} r={4} {...common} /> : null}
      {name === "alert" ? <Circle cx={12} cy={12} r={9} {...common} /> : null}
      {name === "badgeCheck" ? (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M8.5 12l2.5 2.5 4.5-5" {...common} />
        </>
      ) : null}
      {name === "circleDashed" ? (
        <Circle cx={12} cy={12} r={9} strokeDasharray="3 3" {...common} />
      ) : null}
      {name === "monitor" ? (
        <>
          <Rect x={3} y={4} width={18} height={14} rx={2} {...common} />
          <Path d="M8 21h8M12 18v3" {...common} />
        </>
      ) : null}
      {name in PATHS
        ? PATHS[name as keyof typeof PATHS].map((d) => (
            <Path key={d} d={d} {...common} />
          ))
        : null}
    </Svg>
  );
}
