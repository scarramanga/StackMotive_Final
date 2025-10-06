import type { Variants } from 'framer-motion';

export const slideX: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1, 
    transition: { 
      duration: 0.32, 
      ease: 'easeOut' 
    } 
  },
  exit: { x: '100%', opacity: 0 }
};

export const slideXReduced: Variants = {
  initial: { x: 0, opacity: 1 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 0, opacity: 1 }
};
