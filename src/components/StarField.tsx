import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Star {
  x: number;
  y: number;
  phase: number;
  period: number;
}

interface Particle {
  y: number;
  delay: number;
  duration: number;
}

const NUM_STARS = 100;
const NUM_PARTICLES = 20;

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (theme === 'light') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: Star[] = [];
    const particles: Particle[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      stars.length = 0;
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          phase: Math.random() * Math.PI * 2,
          period: 2 + Math.random() * 4,
        });
      }

      particles.length = 0;
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push({
          y: Math.random() * canvas.height,
          delay: Math.random() * 20,
          duration: 15 + Math.random() * 10,
        });
      }
    };

    init();

    const onResize = () => init();
    window.addEventListener('resize', onResize);

    const startTime = performance.now();
    let rafId: number;

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        const alpha = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin((t * Math.PI * 2) / s.period + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of particles) {
        const elapsed = t - p.delay;
        if (elapsed < 0) continue;
        const cycle = elapsed % p.duration;
        const progress = cycle / p.duration;
        const x = -100 + progress * (canvas.width + 200);
        let alpha = 0;
        if (progress < 0.1) alpha = (progress / 0.1) * 0.5;
        else if (progress < 0.9) alpha = 0.5;
        else alpha = ((1 - progress) / 0.1) * 0.5;
        ctx.fillStyle = `rgba(249,115,22,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [theme]);

  if (theme === 'light') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh', zIndex: 0 }}
    />
  );
}
