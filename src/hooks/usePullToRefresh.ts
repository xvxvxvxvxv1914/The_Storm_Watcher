import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72; // px pulled before triggering
const RESIST = 0.4;   // rubber-band factor

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef<number | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('.no-pull') || target.closest('canvas') || target.closest('.overflow-y-auto') || target.closest('.overflow-x-auto')) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { startY.current = null; return; }
      setPulling(true);
      setPullY(Math.min(dy * RESIST, THRESHOLD + 20));
    };

    const onTouchEnd = async () => {
      if (!pulling || refreshing.current) { startY.current = null; setPulling(false); setPullY(0); return; }
      if (pullY >= THRESHOLD * RESIST) {
        refreshing.current = true;
        try { await onRefresh(); } finally { refreshing.current = false; }
      }
      startY.current = null;
      setPulling(false);
      setPullY(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pulling, pullY, onRefresh]);

  return { pulling, pullY };
}
