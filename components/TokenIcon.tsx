import Svg, { Circle, Polygon } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
  innerColor?: string;
}

export default function TokenIcon({ size = 14, color = "#FFD700", innerColor = "rgba(0,0,0,0.6)" }: Props) {
  const r = size / 2;
  // Diamond points: top, right, bottom, left — roughly 55% of circle radius
  const d = r * 0.58;
  const pts = [
    `${r},${r - d}`,       // top
    `${r + d},${r}`,       // right
    `${r},${r + d}`,       // bottom
    `${r - d},${r}`,       // left
  ].join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={r} fill={color} />
      <Polygon points={pts} fill={innerColor} />
    </Svg>
  );
}
