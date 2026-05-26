import { useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const DELETE_THRESHOLD = -72;
const SNAP_WIDTH = -80;

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
}

export default function SwipeToDelete({ onDelete, children }: Props) {
  const x = useMotionValue(0);
  const hapticFired = useRef(false);

  const deleteOpacity = useTransform(x, [0, DELETE_THRESHOLD], [0, 1]);
  const deleteScale  = useTransform(x, [0, DELETE_THRESHOLD], [0.7, 1]);

  function handleDragEnd() {
    if (x.get() <= DELETE_THRESHOLD) {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      onDelete();
    } else {
      hapticFired.current = false;
    }
  }

  function handleDrag() {
    if (!hapticFired.current && x.get() <= DELETE_THRESHOLD) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      hapticFired.current = true;
    } else if (x.get() > DELETE_THRESHOLD) {
      hapticFired.current = false;
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Red delete layer underneath */}
      <AnimatePresence>
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500/20 rounded-r-xl"
          style={{ width: 80, opacity: deleteOpacity }}
          aria-hidden
        >
          <motion.div style={{ scale: deleteScale }}>
            <Trash2 className="w-5 h-5 text-red-400" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SNAP_WIDTH, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.2 }}
        style={{ x, touchAction: 'pan-y' }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
