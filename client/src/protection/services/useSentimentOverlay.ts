import { useState, useEffect } from 'react';
import { fetchTwitterSentiment, fetchNewsSentiment, fetchSubstackSentiment, fetchRedditSentiment, fetchKeywordSentiment } from '../api/sentimentFeeds';

export interface SentimentOverlayInput {
  symbol: string;
  overlays: string[];
}

export interface SentimentOverlayResult {
  refinedSentiment: number; // -1 to 1
  overlayWeights: Record<string, number>;
  logs: Array<{ source: string; score: number; correlatedSignal?: string }>;
  loading: boolean;
  error: string | null;
}

// Block 41: Sentiment Overlay Enhancer
export function useSentimentOverlay({ symbol, overlays }: SentimentOverlayInput): SentimentOverlayResult {
  const [refinedSentiment, setRefinedSentiment] = useState(0);
  const [overlayWeights, setOverlayWeights] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<Array<{ source: string; score: number; correlatedSignal?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchAll() {
      setLoading(true);
      try {
        const [tw, news, substack, reddit, kw] = await Promise.all([
          fetchTwitterSentiment(symbol),
          fetchNewsSentiment(symbol),
          fetchSubstackSentiment(symbol),
          fetchRedditSentiment(symbol),
          fetchKeywordSentiment(symbol),
        ]);
        // NLP filtering and confidence weighting
        const sources = [
          { source: 'Twitter', ...tw },
          { source: 'News', ...news },
          { source: 'Substack', ...substack },
          { source: 'Reddit', ...reddit },
          { source: 'Keyword', ...kw },
        ];
        // Filter out low-confidence or noisy sources
        const filtered = sources.filter(s => s.confidence > 0.5);
        const weightedSum = filtered.reduce((sum, s) => sum + s.score * s.confidence, 0);
        const totalWeight = filtered.reduce((sum, s) => sum + s.confidence, 0) || 1;
        const refined = weightedSum / totalWeight;
        // Overlay weight adjustment
        const weights: Record<string, number> = {};
        overlays.forEach(overlay => {
          // Example: boost overlay if sentiment is strongly positive/negative
          weights[overlay] = 1 + (Math.abs(refined) > 0.7 ? refined * 0.2 : 0);
        });
        // Logs for audit/signal correlation
        const logs = filtered.map(s => ({ source: s.source, score: s.score, correlatedSignal: s.signal }));
        if (!ignore) {
          setRefinedSentiment(refined);
          setOverlayWeights(weights);
          setLogs(logs);
          setError(null);
        }
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Failed to fetch sentiment feeds');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchAll();
    return () => { ignore = true; };
  }, [symbol, overlays]);

  return { refinedSentiment, overlayWeights, logs, loading, error };
} 