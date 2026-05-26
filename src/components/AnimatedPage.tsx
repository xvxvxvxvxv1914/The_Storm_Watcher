import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// iOS-style: incoming slides in from 100%, outgoing pulls back to -28% (depth parallax).
// Reverse direction for back navigation.
const variants = {
  initial: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-28%',
    boxShadow: dir >= 0 ? '-8px 0 24px rgba(0,0,0,0.35)' : 'none',
  }),
  animate: {
    x: '0%',
    boxShadow: '0px 0 0px rgba(0,0,0,0)',
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-28%' : '100%',
    boxShadow: dir >= 0 ? 'none' : '-8px 0 24px rgba(0,0,0,0.35)',
    transition: { duration: 0.3, ease: 'easeIn' as const },
  }),
};

export const AnimatedPage = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const dir = location.state?.direction === 'left' ? -1 : 1;

  return (
    <motion.div
      custom={dir}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ position: 'absolute', width: '100%', top: 0, left: 0, minHeight: '100dvh', willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
};
