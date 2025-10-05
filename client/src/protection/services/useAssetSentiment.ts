import { useQuery } from '@tanstack/react-query';

export interface AssetSentiment {
  score: number;
  trend: string;
  macroImpact: string;
  lastUpdated: string;
}

export interface SentimentTrend {
  date: string;
  value: number;
}

export function useAssetSentiment(symbol: string) {
  const { data: sentiment, isLoading: loadingSentiment, error: errorSentiment } = useQuery<AssetSentiment>({
    queryKey: ['/api/sentiment-analysis', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/sentiment-analysis?asset=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error('Failed to fetch sentiment');
      return res.json();
    },
    enabled: !!symbol,
  });

  const { data: trend, isLoading: loadingTrend, error: errorTrend } = useQuery<SentimentTrend[]>({
    queryKey: ['/api/sentiment-trends', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/sentiment-trends?asset=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error('Failed to fetch sentiment trend');
      return res.json();
    },
    enabled: !!symbol,
  });

  return {
    sentiment,
    trend,
    loading: loadingSentiment || loadingTrend,
    error: errorSentiment || errorTrend,
  };
} 