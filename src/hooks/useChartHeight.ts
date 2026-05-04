import { useState, useEffect } from 'react';

export function useChartHeight(mobile: number, desktop: number): number {
  const [height, setHeight] = useState(() =>
    window.innerWidth < 640 ? mobile : desktop
  );
  useEffect(() => {
    const handler = () => setHeight(window.innerWidth < 640 ? mobile : desktop);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [mobile, desktop]);
  return height;
}
