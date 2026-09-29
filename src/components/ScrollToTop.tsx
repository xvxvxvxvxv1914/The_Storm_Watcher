import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  // Desktop only. Below lg the bottom tab bar is on screen, this button floated
  // over the content just above it, and re-tapping the current tab does the same job.

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="hidden lg:flex fixed bottom-8 right-4 z-50 w-11 h-11 rounded-full bg-gradient-to-br from-[#f97316] to-[#ef4444] text-white items-center justify-center shadow-lg shadow-[#f97316]/30 hover:scale-110 active:scale-95 transition-all duration-200 animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

export default ScrollToTop;
