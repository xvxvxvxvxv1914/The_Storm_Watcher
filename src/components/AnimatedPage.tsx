import { motion } from 'framer-motion';

const transition = { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const };

export const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ y: '100%', opacity: 0 }}
    animate={{ y: '0%', opacity: 1 }}
    exit={{ y: '6%', opacity: 0 }}
    transition={transition}
    style={{ width: '100%', willChange: 'transform' }}
  >
    {children}
  </motion.div>
);
