import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';

export interface PageTransition3DProps {
  children: React.ReactNode;
  transitionKey: string | number;
  direction?: 'forward' | 'backward' | 'tab';
  type?: 'turn' | 'depth' | 'fade';
  className?: string;
}

export const PageTransition3D: React.FC<PageTransition3DProps> = ({
  children,
  transitionKey,
  direction = 'forward',
  type = 'turn',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  // If user prefers reduced motion or explicit fade, provide an elegant minimal fade
  if (shouldReduceMotion || type === 'fade') {
    return (
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`w-full ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  // 3D Perspective Depth & Card-turn Variants
  const variants: Variants = {
    initial: {
      opacity: 0,
      rotateY: type === 'depth' ? 0 : direction === 'forward' ? 5 : -5,
      z: type === 'depth' ? -45 : -35,
      scale: 0.985,
      y: type === 'depth' ? 6 : 0,
    },
    animate: {
      opacity: 1,
      rotateY: 0,
      z: 0,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      rotateY: type === 'depth' ? 0 : direction === 'forward' ? -5 : 5,
      z: -40,
      scale: 0.985,
      y: type === 'depth' ? -6 : 0,
      transition: {
        duration: 0.22,
        ease: [0.7, 0, 0.84, 0] as [number, number, number, number],
      },
    },
  };

  return (
    <div 
      className="w-full perspective-1200"
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`w-full ${className}`}
        style={{ transformOrigin: '50% 50%', backfaceVisibility: 'hidden' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
