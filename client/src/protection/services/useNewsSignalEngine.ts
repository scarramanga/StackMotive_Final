import { useEffect, useRef, useState } from 'react';
import { useNewsFeed, NewsItem } from './useNewsFeedAPI';

export interface NewsSignal {
  asset: string;
  headline: string;
  signalType: 'news';
  confidence: number;
  action: 'watch' | 'buy' | 'sell';
  timestamp: string;
}

function randomAction(): 'watch' | 'buy' | 'sell' {
  const arr = ['watch', 'buy', 'sell'] as const;
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConfidence() {
  return Math.floor(Math.random() * 31) + 60; // 60-90
}

export function useNewsSignalEngine() {
  const { newsItems } = useNewsFeed();
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const triggered = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (signals.length >= 3) return;
    for (const item of newsItems) {
      if (!triggered.current.has(item.id) && signals.length < 3) {
        // Simulate async trigger delay
        setTimeout(() => {
          setSignals(prev => {
            if (prev.length >= 3) return prev;
            return [
              ...prev,
              {
                asset: item.asset,
                headline: item.headline,
                signalType: 'news',
                confidence: randomConfidence(),
                action: randomAction(),
                timestamp: new Date().toISOString(),
              },
            ];
          });
        }, 300 + Math.random() * 700);
        triggered.current.add(item.id);
      }
    }
  }, [newsItems, signals.length]);

  return signals;
} 