interface Props {
  kp: number;
}

// Horizontal Kp severity scale (0–9) with G-level zones and a glowing marker.
// Aurora-green = calm (the signature colour); colour escalates with storm level.
// Zone breakpoints follow the NOAA G-scale: Kp5=G1, 6=G2, 7=G3, 8=G4, 9=G5.
const TRACK = `linear-gradient(to right,
  #10b981 0%, #10b981 55.56%,
  #eab308 55.56%, #eab308 66.67%,
  #f97316 66.67%, #f97316 88.89%,
  #ef4444 88.89%, #ef4444 100%)`;

export default function KpGauge({ kp }: Props) {
  const clamped = Math.max(0, Math.min(9, kp));
  const pct = (clamped / 9) * 100;
  const markerColor =
    kp >= 8 ? '#ef4444' : kp >= 6 ? '#f97316' : kp >= 5 ? '#eab308' : '#10b981';

  return (
    <div className="w-full max-w-sm mx-auto mt-8" aria-hidden="true">
      {/* track */}
      <div className="relative h-2.5 rounded-full" style={{ background: TRACK }}>
        {/* G-level divider ticks */}
        {[5, 6, 7, 8].map((k) => (
          <span
            key={k}
            className="absolute top-0 h-full w-px bg-[#0a0a1a]/40"
            style={{ left: `${(k / 9) * 100}%` }}
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
      {/* scale */}
      <div className="flex justify-between mt-2.5 px-px text-[10px] font-mono text-[#475569]">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className={n === 5 || n === 8 ? 'text-[#64748b]' : ''}>
            {n}
          </span>
        ))}
      </div>
      {/* zone legend */}
      <div className="flex justify-between mt-1 text-[9px] uppercase tracking-wider font-semibold">
        <span className="text-[#10b981]">Calm</span>
        <span className="text-[#eab308]">G1</span>
        <span className="text-[#f97316]">G2–G3</span>
        <span className="text-[#ef4444]">G4–G5</span>
      </div>
    </div>
  );
}
