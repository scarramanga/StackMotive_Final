import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMountGuard } from '../../hooks/useMountGuard';
import { slideX, slideXReduced } from '../../lib/animation/variants';

export interface PanelAnimatorProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const PanelAnimator: React.FC<PanelAnimatorProps> = ({ 
  isVisible, 
  onClose, 
  children 
}) => {
  const mounted = useMountGuard();
  
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const variants = prefersReducedMotion ? slideXReduced : slideX;
  
  if (!mounted) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative z-50"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
