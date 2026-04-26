import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const animations = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 100 : direction < 0 ? -100 : 0,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -100 : direction < 0 ? 100 : 0,
  }),
};

export const AnimatedPage = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const direction = location.state?.direction === 'left' ? -1 : location.state?.direction === 'right' ? 1 : 0;

  return (
    <motion.div
      custom={direction}
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
};
