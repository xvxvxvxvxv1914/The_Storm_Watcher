import { useEffect, useState } from 'react';
import { getKpIndex, getSolarWind, getMagField, getAlerts, getKpForecast, getAuroraModel } from '../services/noaaApi';

const SPLASH_KEY = 'splash_shown';
const isNativePlatform = typeof window !== 'undefined' && 'Capacitor' in window;

function prefetchCoreData() {
  // Fire all main API calls in parallel — results warm the TTL cache so
  // home/dashboard/forecast pages render instantly after splash.
  Promise.allSettled([
    getKpIndex(),
    getSolarWind(),
    getMagField(),
    getAlerts(),
    getKpForecast(),
    getAuroraModel(),
  ]);
}

const AURORA_STYLE = `
@keyframes auroraA {
  0%   { transform: translateX(0%)   scaleY(1)    skewX(-4deg); opacity: 0.75; }
  30%  { transform: translateX(6%)   scaleY(1.08) skewX(2deg);  opacity: 1;    }
  60%  { transform: translateX(-4%)  scaleY(0.95) skewX(-6deg); opacity: 0.8;  }
  100% { transform: translateX(0%)   scaleY(1)    skewX(-4deg); opacity: 0.75; }
}
@keyframes auroraB {
  0%   { transform: translateX(0%)   scaleY(0.9)  skewX(5deg);  opacity: 0.6; }
  40%  { transform: translateX(-8%)  scaleY(1.05) skewX(-3deg); opacity: 0.9; }
  70%  { transform: translateX(5%)   scaleY(1)    skewX(6deg);  opacity: 0.65; }
  100% { transform: translateX(0%)   scaleY(0.9)  skewX(5deg);  opacity: 0.6; }
}
@keyframes auroraC {
  0%   { transform: translateX(0%)   scaleY(1.1)  skewX(2deg);  opacity: 0.5; }
  50%  { transform: translateX(10%)  scaleY(0.95) skewX(-5deg); opacity: 0.8; }
  100% { transform: translateX(0%)   scaleY(1.1)  skewX(2deg);  opacity: 0.5; }
}
@keyframes auroraD {
  0%   { transform: translateX(0%)  skewX(-6deg); opacity: 0.4; }
  45%  { transform: translateX(-6%) skewX(4deg);  opacity: 0.7; }
  100% { transform: translateX(0%)  skewX(-6deg); opacity: 0.4; }
}
`;

const SplashAnimation = () => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit' | 'done'>('enter');

  useEffect(() => {
    if (!isNativePlatform && sessionStorage.getItem(SPLASH_KEY)) {
      setPhase('done');
      return;
    }
    if (!isNativePlatform) sessionStorage.setItem(SPLASH_KEY, '1');

    prefetchCoreData();

    const exitMs  = isNativePlatform ? 2500 : 600;
    const doneMs  = isNativePlatform ? 3000 : 1100;
    const t1 = setTimeout(() => setPhase('show'), 60);
    const t2 = setTimeout(() => setPhase('exit'), exitMs);
    const t3 = setTimeout(() => setPhase('done'), doneMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const visible = phase === 'show';

  return (
    <>
      <style>{AURORA_STYLE}</style>
      <div
        className="fixed inset-0 z-[200] overflow-hidden"
        style={{
          background: '#030712',
          opacity: phase === 'exit' ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      >
        {/* Aurora curtain layer 1 — deep emerald, left-center */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-15%',
            width: '70%',
            height: '85%',
            background: 'linear-gradient(180deg, #10b981 0%, #059669 30%, transparent 100%)',
            filter: 'blur(48px)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease',
            animation: 'auroraA 5s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />

        {/* Aurora curtain layer 2 — teal/cyan, center */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '25%',
            width: '65%',
            height: '80%',
            background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 25%, transparent 100%)',
            filter: 'blur(56px)',
            opacity: visible ? 0.7 : 0,
            transition: 'opacity 1s ease 0.1s',
            animation: 'auroraB 6.5s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />

        {/* Aurora curtain layer 3 — violet/indigo hint, right */}
        <div
          style={{
            position: 'absolute',
            top: '-25%',
            left: '50%',
            width: '60%',
            height: '75%',
            background: 'linear-gradient(180deg, #7c3aed 0%, #4f46e5 20%, transparent 100%)',
            filter: 'blur(64px)',
            opacity: visible ? 0.45 : 0,
            transition: 'opacity 1.2s ease 0.2s',
            animation: 'auroraC 7s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />

        {/* Aurora curtain layer 4 — bright green streak, left */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '45%',
            height: '65%',
            background: 'linear-gradient(180deg, #34d399 0%, #10b981 20%, transparent 100%)',
            filter: 'blur(36px)',
            opacity: visible ? 0.55 : 0,
            transition: 'opacity 0.9s ease 0.15s',
            animation: 'auroraD 4.5s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />

        {/* Stars — subtle dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: visible ? 0.15 : 0,
            transition: 'opacity 1s ease',
          }}
        />

        {/* Bottom gradient to ground the text */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, #030712 0%, transparent 100%)',
          }}
        />

        {/* Logo + name — stacked */}
        <div
          style={{
            position: 'absolute',
            bottom: '12%',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
          }}
        >
          <img
            src="/logos/logo-transparent.png"
            alt="The Storm Watcher"
            style={{
              height: '72px',
              width: 'auto',
              filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.65)) drop-shadow(0 0 40px rgba(16,185,129,0.3))',
            }}
          />
          <p
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '0.65rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Space Weather Monitor
          </p>
        </div>
      </div>
    </>
  );
};

export default SplashAnimation;
