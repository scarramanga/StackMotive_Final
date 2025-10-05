import { useMemo } from 'react';

// Block 15 Implementation: Signal type
export type Signal = {
  asset: string;
  type: 'MACD' | 'RSI' | 'WhaleAlert' | 'VolumeSpike' | string;
  strength: number; // 0–100
  context: 'technical' | 'macro' | 'social';
};

// Block 15 Implementation: Mock signals array
const MOCK_SIGNALS: Signal[] = [
  { asset: 'BTC', type: 'MACD', strength: 80, context: 'technical' },
  { asset: 'BTC', type: 'RSI', strength: 65, context: 'technical' },
  { asset: 'BTC', type: 'WhaleAlert', strength: 90, context: 'social' },
  { asset: 'ETH', type: 'VolumeSpike', strength: 70, context: 'macro' },
  { asset: 'ETH', type: 'RSI', strength: 55, context: 'technical' },
  { asset: 'TSLA', type: 'MACD', strength: 40, context: 'technical' },
];

export function useSignals(asset?: string) {
  // Block 15 Implementation: Filter and group signals
  const signals = useMemo(() => {
    let filtered = MOCK_SIGNALS;
    if (asset) filtered = filtered.filter(s => s.asset === asset);
    // Group by type
    const byType: Record<string, Signal[]> = {};
    filtered.forEach(sig => {
      if (!byType[sig.type]) byType[sig.type] = [];
      byType[sig.type].push(sig);
    });
    // Group by context
    const byContext: Record<string, Signal[]> = {};
    filtered.forEach(sig => {
      if (!byContext[sig.context]) byContext[sig.context] = [];
      byContext[sig.context].push(sig);
    });
    return { all: filtered, byType, byContext };
  }, [asset]);

  return signals;
} 