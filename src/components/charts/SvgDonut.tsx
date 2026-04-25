interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
}

export default function SvgDonut({ slices, size = 180, thickness = 36 }: Props) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map(sl => {
    const fraction = sl.value / total;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const seg = { ...sl, dash, gap, offset };
    offset += dash;
    return seg;
  });

  // Rotate so first segment starts at top (-90°)
  const rotate = -90;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={thickness - 2}
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={-seg.offset}
          transform={`rotate(${rotate} ${cx} ${cy})`}
          opacity="0.9"
        />
      ))}
      {/* Center hole */}
      <circle cx={cx} cy={cy} r={r - thickness / 2 + 2} fill="transparent" />
    </svg>
  );
}
