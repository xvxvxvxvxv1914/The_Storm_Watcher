interface Props {
  kp: number;
}

// Colour zones on the Kp 0–9 axis — the single source of truth mirrored by the
// big number, the storm button and the iOS widget. Warm colours start early:
// green <4 (calm), yellow 4–5 (active), orange 5–7 (storm G1–G2), red 7–9 (severe G3–G5).
// Aurora-green = calm (the signature colour); colour escalates with storm level.
const ZONES = [
  { label: 'Calm', from: 0, to: 4, color: '#10b981' },
  { label: '', from: 4, to: 5, color: '#eab308' },
  { label: 'G1–G2', from: 5, to: 7, color: '#f97316' },
  { label: 'G3–G5', from: 7, to: 9, color: '#ef4444' },
];

// Kp value → percentage along the 0–9 track.
const pos = (kp: number) => (kp / 9) * 100;

// Hard-stop gradient built straight from the zones above.
const TRACK = `linear-gradient(to right, ${ZONES.map(
  (z) => `${z.color} ${pos(z.from).toFixed(2)}%, ${z.color} ${pos(z.to).toFixed(2)}%`,
).join(', ')})`;

export default function KpGauge({ kp }: Props) {
  const clamped = Math.max(0, Math.min(9, kp));
  const pct = pos(clamped);
  const markerColor =
    kp >= 7 ? '#ef4444' : kp >= 5 ? '#f97316' : kp >= 4 ? '#eab308' : '#10b981';

  return (
    <div className="w-full max-w-sm mx-auto mt-8" aria-hidden="true">
      {/* track */}
      <div className="relative h-2.5 rounded-full" style={{ background: TRACK }}>
        {/* divider ticks at the colour-band boundaries (4, 5, 7) */}
        {[4, 5, 7].map((k) => (
          <span
            key={k}
            className="absolute top-0 h-full w-px bg-[#0a0a1a]/40"
            style={{ left: `${pos(k)}%` }}
          />
        ))}
        {/* marker */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white transition-[left] duration-700 ease-out"
          style={{
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            background: markerColor,
            boxShadow: `0 0 14px ${markerColor}`,
          }}
        />
      </div>
      {/* number scale */}
      <div className="flex justify-between mt-2.5 px-px text-[10px] font-mono text-[#475569]">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className={n === 5 || n === 7 ? 'text-[#64748b]' : ''}>
            {n}
          </span>
        ))}
      </div>
      {/* zone legend — each label centred under its own colour band */}
      <div className="relative mt-1 h-3 text-[9px] uppercase tracking-wider font-semibold">
        {ZONES.map((z) => (
          <span
            key={z.label}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${pos((z.from + z.to) / 2)}%`, color: z.color }}
          >
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
