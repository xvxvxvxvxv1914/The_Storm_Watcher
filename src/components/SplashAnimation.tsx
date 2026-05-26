import { useEffect, useState } from 'react';

const SPLASH_KEY = 'splash_shown';

const SplashAnimation = () => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'done'>('enter');

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) {
      setPhase('done');
      return;
    }
    sessionStorage.setItem(SPLASH_KEY, '1');
    // Native Capacitor splash auto-hides after launchShowDuration (1200ms) — no manual hide needed.

    const t1 = setTimeout(() => setPhase('show'), 60);
    const t2 = setTimeout(() => setPhase('exit'), 900);
    const t3 = setTimeout(() => setPhase('done'), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const visible = phase === 'show';

  return (
    <div
      className={`fixed inset-0 z-[200] bg-[#0a0a1a] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full bg-[#f97316]/8 blur-3xl transition-all duration-700"
        style={{
          width: 280,
          height: 280,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.4)',
        }}
      />

      {/* Inner glow */}
      <div
        className="absolute rounded-full bg-[#f97316]/15 blur-2xl transition-all duration-500"
        style={{
          width: 160,
          height: 160,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.3)',
        }}
      />

      {/* App icon */}
      <div
        className="relative transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.3)',
        }}
      >
        <img src="/icons/icon-192.png" alt="" width={96} height={96} className="rounded-[22px]" />
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-full border border-[#f97316]/30 animate-ping"
          style={{ animationDuration: '1.5s' }}
        />
      </div>

      {/* Text */}
      <div
        className="mt-8 text-center transition-all duration-700 delay-200"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        <p className="text-white font-bold text-2xl tracking-widest gradient-solar">
          The Storm Watcher
        </p>
        <p className="text-white/30 text-xs mt-2 tracking-[0.25em] uppercase">
          Space Weather Monitor
        </p>
      </div>
    </div>
  );
};

export default SplashAnimation;
