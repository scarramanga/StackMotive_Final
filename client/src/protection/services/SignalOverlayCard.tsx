import React from 'react';
import clsx from 'clsx';
import type { Signal } from '@/hooks/useSignals';
import VaultGuard from './VaultGuard';
import ProvenanceTag from './ProvenanceTag';

interface SignalOverlayCardProps {
  signals: Signal[];
  asset: string;
}

const CONTEXT_LABELS: Record<string, string> = {
  technical: 'Technical',
  macro: 'Macro',
  social: 'Social',
};

const CONTEXT_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800',
  macro: 'bg-green-100 text-green-800',
  social: 'bg-pink-100 text-pink-800',
};

export const SignalOverlayCard: React.FC<SignalOverlayCardProps> = ({ signals, asset }) => {
  // Block 15 Implementation: Group by context
  const grouped = React.useMemo(() => {
    const byContext: Record<string, Signal[]> = {};
    signals.forEach(sig => {
      if (!byContext[sig.context]) byContext[sig.context] = [];
      byContext[sig.context].push(sig);
    });
    return byContext;
  }, [signals]);

  if (!signals.length) {
    return (
      <div className="p-6 rounded-lg border bg-muted text-center text-muted-foreground">No signals for {asset}</div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-white dark:bg-neutral-900 w-full max-w-xl mx-auto">
      <div className="font-semibold mb-2">Signals for {asset}</div>
      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([context, ctxSignals]) => (
          <div key={context}>
            <div className={clsx('mb-1 text-xs font-bold uppercase', CONTEXT_COLORS[context] || 'bg-gray-100 text-gray-800', 'inline-block px-2 py-1 rounded')}>
              {CONTEXT_LABELS[context] || context}
              <VaultGuard assetSymbol={asset} contextLabel={context} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {ctxSignals.map((sig, i) => (
                <div key={sig.type + i} className="flex flex-col items-center">
                  <span className="text-xs font-medium mb-1">{sig.type}</span>
                  <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-3 rounded-full',
                        sig.strength > 80 ? 'bg-green-500' : sig.strength > 50 ? 'bg-yellow-400' : 'bg-red-400')}
                      style={{ width: `${sig.strength}%` }}
                    />
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground">{sig.strength}</span>
                  <ProvenanceTag
                    source={(['gpt', 'broker', 'user'][Math.floor(Math.random() * 3)] as 'gpt' | 'broker' | 'user')}
                    confidence={Math.random()}
                    timestamp={new Date().toISOString()}
                    contextNote={sig.context}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 