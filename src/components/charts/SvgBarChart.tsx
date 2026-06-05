interface Bar {
  label: string;
  value: number;
  color: string;
}

interface Props {
  bars: Bar[];
  height?: number;
  maxValue?: number;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
}

export default function SvgBarChart({ bars, height = 220, maxValue, formatValue, ariaLabel = 'Bar chart' }: Props) {
  if (bars.length === 0) return null;
  const max = maxValue ?? Math.max(...bars.map(b => b.value), 1);
  const barW = 68;
  const gap = 12;
  const padX = 8;
  const padTop = 24;
  const labelH = 28;
  const chartH = height - labelH;
  const totalW = bars.length * (barW + gap) - gap + padX * 2;

  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      {/* Horizontal guide lines */}
      {[0.25, 0.5, 0.75, 1].map(t => {
        const y = padTop + (chartH - padTop) * (1 - t);
        return (
          <line key={t} x1={0} y1={y} x2={totalW} y2={y}
            stroke="var(--tsw-surface-border)" strokeWidth="1" />
        );
      })}

      {bars.map((bar, i) => {
        const x = padX + i * (barW + gap);
        const barH = Math.max(2, ((bar.value / max) * (chartH - padTop)));
        const y = padTop + (chartH - padTop) - barH;

        return (
          <g key={bar.label}>
            {/* Bar */}
            <rect
              x={x} y={y} width={barW} height={barH}
              fill={bar.color} rx="4" opacity="0.85"
            />
            {/* Value label on top */}
            <text
              x={x + barW / 2} y={y - 5}
              textAnchor="middle" fontSize="11" fill={bar.color} fontWeight="600"
            >
              {formatValue ? formatValue(bar.value) : bar.value}
            </text>
            {/* X label */}
            <text
              x={x + barW / 2} y={height - 4}
              textAnchor="middle" fontSize="11" fill="var(--tsw-fg-muted)"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
