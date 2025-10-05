import React, { useEffect, useRef } from 'react';
import { PanelAnimator } from '../animation/PanelAnimator';

export interface AlertPanelProps {
  isVisible: boolean;
  onClose: () => void;
  alerts: {
    id: string;
    type: 'signal' | 'macro' | 'gpt';
    message: string;
    timestamp: string;
  }[];
}

function formatTimeAgo(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ALERT_LABELS: Record<'signal' | 'macro' | 'gpt', string> = {
  signal: 'Signal Alerts',
  macro: 'Macro Events',
  gpt: 'GPT Messages',
};

const ALERT_COLORS: Record<'signal' | 'macro' | 'gpt', string> = {
  signal: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
  macro: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
  gpt: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
};

export const AlertPanel: React.FC<AlertPanelProps> = ({ isVisible, onClose, alerts }) => {
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

  // Group alerts by type
  const grouped: Record<'signal' | 'macro' | 'gpt', typeof alerts> = {
    signal: [],
    macro: [],
    gpt: [],
  };
  for (const alert of alerts) {
    grouped[alert.type].push(alert);
  }

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
          <h2 className="text-lg font-semibold truncate">Alerts</h2>
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
          {(['signal', 'macro', 'gpt'] as const).map(type =>
            grouped[type].length > 0 && (
              <div key={type}>
                <h3 className="text-sm font-medium mb-2">{ALERT_LABELS[type]}</h3>
                <ul className="space-y-3">
                  {grouped[type].map(alert => (
                    <li
                      key={alert.id}
                      className={`rounded px-3 py-2 flex items-start gap-3 shadow-sm ${ALERT_COLORS[type]}`}
                    >
                      <span className="flex-1 text-sm leading-snug">{alert.message}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mt-0.5">{formatTimeAgo(alert.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          {alerts.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500">No recent alerts.</div>
          )}
        </div>
      </div>
    </PanelAnimator>
  );
}; 