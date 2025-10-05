import React, { useEffect, useRef } from 'react';
import { StrategyResponse } from '../../hooks/useStrategyAgent';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelAnimator } from '../animation/PanelAnimator';

interface Props {
  response: StrategyResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

export const StrategySummaryPanel: React.FC<Props> = ({ response, isLoading, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape-to-close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Trap focus
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus panel on mount
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <PanelAnimator isVisible={true} onClose={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl flex flex-col outline-none"
      >
        {/* Sticky Title Bar */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
          <h2 className="text-lg font-semibold">Strategy Summary</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 animate-pulse">
              <span className="mb-2">Generating strategy...</span>
              <div className="w-2/3 h-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          ) : response ? (
            <>
              {/* Summary */}
              <p className="text-base text-gray-700 dark:text-gray-200 mb-2">{response.summary}</p>
              {/* Confidence Meter */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Confidence</label>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.round(response.confidence * 100)}%` }}
                    aria-valuenow={Math.round(response.confidence * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">{Math.round(response.confidence * 100)}%</span>
              </div>
              {/* Recommendations */}
              <div>
                <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                <ul className="space-y-2">
                  {response.recommendations.map((rec, i) => (
                    <li
                      key={rec.asset + i}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded px-3 py-2"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-100">{rec.asset}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                        {rec.action.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{rec.percentage}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">No strategy data available.</div>
          )}
        </div>
      </div>
    </PanelAnimator>
  );
}; 