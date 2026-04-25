export interface DataRow {
  [key: string]: string | number;
}

interface Series {
  key: string;
  color: string;
  label: string;
}

interface Props {
  data: DataRow[];
  series: Series[];
  xKey: string;
  height?: number;
}

export default function SvgStackedBars({ data, series, xKey, height = 280 }: Props) {
  if (data.length === 0) return null;

  const labelH = 28;
  const legendH = 24;
  const padX = 4;
  const chartH = height - labelH - legendH;

  const maxTotal = Math.max(
    ...data.map(row => series.reduce((s, sr) => s + (Number(row[sr.key]) || 0), 0)),
    1
  );

  const barW = Math.max(6, Math.floor((600 - padX * 2) / data.length) - 4);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${data.length * (barW + 4) + padX * 2} ${height}`}
        className="w-full"
        style={{ minWidth: Math.min(data.length * (barW + 4) + padX * 2, 360) }}
      >
        {data.map((row, i) => {
          const x = padX + i * (barW + 4);
          let yOffset = chartH;
          const total = series.reduce((s, sr) => s + (Number(row[sr.key]) || 0), 0);
          if (total === 0) return null;

          return (
            <g key={i}>
              {series.map(sr => {
                const val = Number(row[sr.key]) || 0;
                if (val === 0) return null;
                const segH = (val / maxTotal) * chartH;
                yOffset -= segH;
                return (
                  <rect
                    key={sr.key}
                    x={x} y={yOffset} width={barW} height={segH}
                    fill={sr.color} opacity="0.85"
                    rx={sr === series[series.length - 1] ? 2 : 0}
                  />
                );
              })}
              <text
                x={x + barW / 2} y={height - legendH - 4}
                textAnchor="middle" fontSize="10" fill="#6b7280"
              >
                {String(row[xKey])}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {series.map((sr, i) => (
          <g key={sr.key} transform={`translate(${i * 70 + padX}, ${height - legendH + 8})`}>
            <rect width="10" height="10" fill={sr.color} rx="2" />
            <text x="13" y="9" fontSize="10" fill="#94a3b8">{sr.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
