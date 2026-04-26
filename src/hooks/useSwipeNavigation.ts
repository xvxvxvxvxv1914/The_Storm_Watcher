import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const navOrder = [
  '/',
  '/dashboard',
  '/forecast',
  '/aurora',
  '/alerts',
  '/mood',
];

export function useSwipeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Игнорираме "swipe from edge" за системното връщане на iOS 
      if (e.touches[0].clientX < 30) return;
      
      const target = e.target as HTMLElement;
      // Игнорираме слайда, ако сме върху карта, графика или таб бар
      // (ако елементът или неговият родител имат class 'no-swipe', или е canvas/input) 
      if (target.closest('.no-swipe') || target.closest('canvas') || target.tagName.toLowerCase() === 'input' || target.closest('.recharts-wrapper') || target.closest('.tv-lightweight-charts')) {
        return;
      }

      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStart.current.x;
      const dy = touchEndY - touchStart.current.y;

      // Засичаме категорично плъзгане по хоризонтала (dx > 80), което не е случайно скролване (dy < 60)
      if (Math.abs(dx) > 80 && Math.abs(dy) < 60) {
        const currentIndex = navOrder.indexOf(location.pathname);
        
        if (currentIndex !== -1) {
          if (dx > 0 && currentIndex > 0) {
            // Плъзгане надясно -> предишна страница
            navigate(navOrder[currentIndex - 1]);
          } else if (dx < 0 && currentIndex < navOrder.length - 1) {
            // Плъзгане наляво -> следваща страница
            navigate(navOrder[currentIndex + 1]);
          }
        }
      }

      touchStart.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location, navigate]);
}
