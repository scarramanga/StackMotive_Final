import React, { useEffect, useRef } from 'react';
import { PanelAnimator } from '../animation/PanelAnimator';

export interface StrategyRationalePanelProps {
  strategy: {
    name: string;
    description: string;
    macroContext: string[];
    assets: { symbol: string; weight: number }[];
  } | null;
  isVisible: boolean;
  onClose: () => void;
}

export const StrategyRationalePanel: React.FC<StrategyRationalePanelProps> = ({ strategy, isVisible, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus panel and handle Escape key
  useEffect(() => {
    if (!isVisible) return;
    panelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <PanelAnimator isVisible={isVisible} onClose={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl flex flex-col outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
          <h2 className="text-lg font-semibold truncate">{strategy?.name || 'Strategy Rationale'}</h2>
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
          {strategy ? (
            <>
              {/* Description */}
              <p className="text-base text-gray-700 dark:text-gray-200 mb-2">{strategy.description}</p>
              {/* Macro Context */}
              <div>
                <h3 className="text-sm font-medium mb-1">Macro Thesis</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {strategy.macroContext.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              {/* Asset Weights */}
              <div>
                <h3 className="text-sm font-medium mb-2">Asset Weights</h3>
                <table className="min-w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-1 px-2 font-semibold">Asset</th>
                      <th className="text-right py-1 px-2 font-semibold">Weight %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.assets.map((a) => (
                      <tr key={a.symbol} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-1 px-2 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{a.symbol}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{a.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">No strategy rationale available.</div>
          )}
        </div>
      </div>
    </PanelAnimator>
  );
}; 