// Block 28: Market Overview Dashboard
import { useEffect, useState } from 'react';
import { getMarketOverview } from '../api/marketData';

export function useMarketSentiment() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getMarketOverview()
      .then((d) => { if (!ignore) setData(d); })
      .catch((e) => { if (!ignore) setError(e.message || 'Failed to fetch market data'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  return { data, loading, error };
} 