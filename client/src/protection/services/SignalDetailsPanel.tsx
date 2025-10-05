import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMountGuard } from '../../hooks/useMountGuard';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';

export interface SignalDetailsPanelProps {
  asset: string;
  rationale?: string;
  confidence?: number;
  chartData?: number[];
  onClose: () => void;
}

const confidenceColor = (confidence: number | undefined) => {
  if (confidence === undefined) return 'bg-gray-300';
  if (confidence >= 80) return 'bg-green-500';
  if (confidence >= 60) return 'bg-yellow-400';
  if (confidence >= 40) return 'bg-orange-400';
  return 'bg-red-500';
};

export const SignalDetailsPanel: React.FC<SignalDetailsPanelProps> = ({ asset, rationale, confidence, chartData, onClose }) => {
  const mounted = useMountGuard();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape key
  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, mounted]);

  if (!mounted) return null;

  return (
    <motion.div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-card shadow-2xl border-l border-border flex flex-col focus:outline-none"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="text-lg font-bold truncate">{asset}</div>
        <button
          className="ml-2 text-sm px-2 py-1 rounded bg-muted hover:bg-accent focus-visible:ring focus:outline-none"
          aria-label="Close details panel"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {confidence !== undefined && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Confidence</span>
              <ConfidenceBadge score={confidence} rationale={rationale} />
            </div>
          </div>
        )}
        {chartData && chartData.length > 1 && (
          <div className="mb-2">
            <svg width={160} height={48} className="block mx-auto">
              <polyline
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                points={chartData.map((v, i) => `${(i / (chartData.length - 1)) * 160},${48 - ((v - Math.min(...chartData)) / ((Math.max(...chartData) - Math.min(...chartData)) || 1)) * 48}`).join(' ')}
              />
            </svg>
          </div>
        )}
        {rationale && (
          <div className="bg-muted/40 rounded p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto shadow-inner">
            {rationale}
          </div>
        )}
      </div>
    </motion.div>
  );
}; 