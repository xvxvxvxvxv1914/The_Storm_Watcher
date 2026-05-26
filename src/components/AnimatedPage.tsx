import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const variants = {
  initial: (dir: number) => ({ x: dir >= 0 ? '100%' : '-30%', opacity: dir >= 0 ? 1 : 0.6 }),
  animate: { x: '0%', opacity: 1 },
  exit:    (dir: number) => ({ x: dir >= 0 ? '-30%' : '100%', opacity: dir >= 0 ? 0.6 : 1 }),
};

const transition = { duration: 0.28, ease: 'easeOut' as const };

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
      transition={transition}
      style={{ width: '100%', willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
};
