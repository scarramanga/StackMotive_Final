// Block 5: useAISignalEngine Hook
import { useEffect, useState } from 'react';
import { useSessionStore } from '../store/session';
import { generateAISignals } from '../engines/AISignalEngine';
import type { Signal } from '../types/signal';

export function useAISignalEngine({ assetData, overlays, macroSignals, marketSentiment, promptVersion }: any) {
  const user = useSessionStore(s => s.user);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const isPremium = user?.isPremium;

  useEffect(() => {
    if (!isPremium) return;
    setLoading(true);
    generateAISignals({ assetData, overlays, macroSignals, marketSentiment, promptVersion })
      .then(setSignals)
      .finally(() => setLoading(false));
    // Poll every 5 minutes
    const interval = setInterval(() => {
      generateAISignals({ assetData, overlays, macroSignals, marketSentiment, promptVersion })
        .then(setSignals);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [assetData, overlays, macroSignals, marketSentiment, promptVersion, isPremium]);

  return { signals, loading };
} 