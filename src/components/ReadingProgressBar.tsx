import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

interface ReadingProgressBarProps {
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({ targetRef, className = '' }) => {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.onChange(v => {
      // Show when we start reading, hide when done or before starting
      setIsVisible(v > 0 && v < 0.99);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  if (!isVisible && scrollYProgress.get() <= 0) return null;

  return (
    <div className={`sticky top-0 left-0 right-0 z-50 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-blue-500 origin-left"
        style={{ scaleX }}
      />
    </div>
  );
};
