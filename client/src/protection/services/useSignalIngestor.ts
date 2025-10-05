// Block 98b Implementation
import { useAuth } from './useAuth';
import { usePortfolio } from '../contexts/PortfolioContext';

export interface MacroSignal {
  category: string;
  value: number;
  source: string;
  confidence: number;
  timestamp: string;
}

export interface NewsSignal {
  headline: string;
  summary: string;
  ticker?: string;
  source: string;
  sentiment: number;
  timestamp: string;
}

export interface TechnicalSignal {
  indicator: string;
  action: 'buy' | 'sell' | 'hold';
  asset: string;
  confidence: number;
  timestamp: string;
}

export interface IngestResult {
  success: boolean;
  error?: string;
}

function hasUserId(user: any): user is { userId: string } {
  return user && typeof user.userId === 'string';
}

export function useSignalIngestor() {
  // Block 98b Implementation
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();

  const ingestMacroSignal = async (signal: MacroSignal): Promise<IngestResult> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return { success: false, error: 'SSR or missing session/vault' };
    }
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hasUserId(user) ? { Authorization: user.userId } : {}),
        },
        body: JSON.stringify({ signal_type: 'macro', ...signal, vaultId: activeVaultId }),
      });
      if (!res.ok) return { success: false, error: 'Failed to ingest macro signal' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  const ingestNewsSignal = async (signal: NewsSignal): Promise<IngestResult> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return { success: false, error: 'SSR or missing session/vault' };
    }
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hasUserId(user) ? { Authorization: user.userId } : {}),
        },
        body: JSON.stringify({ signal_type: 'news', ...signal, vaultId: activeVaultId }),
      });
      if (!res.ok) return { success: false, error: 'Failed to ingest news signal' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  const ingestTechnicalSignal = async (signal: TechnicalSignal): Promise<IngestResult> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return { success: false, error: 'SSR or missing session/vault' };
    }
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hasUserId(user) ? { Authorization: user.userId } : {}),
        },
        body: JSON.stringify({ signal_type: 'technical', ...signal, vaultId: activeVaultId }),
      });
      if (!res.ok) return { success: false, error: 'Failed to ingest technical signal' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  return { ingestMacroSignal, ingestNewsSignal, ingestTechnicalSignal };
}

// Block 98d Implementation
import { useEffect, useCallback } from 'react';
import {
  MACD,
  RSI,
  SMA,
  EMA,
} from 'technicalindicators';

export interface IndicatorIngestorOptions {
  asset: string;
  source: 'twelvedata' | 'finnhub';
  interval?: string; // e.g., '1h', '1d'
  length?: number; // how many data points
}

export function useIndicatorIngestor() {
  // Block 98d Implementation
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();

  // API keys: You must securely provide these via env or config in production
  const TWELVEDATA_API_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';
  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';

  // Helper: Fetch OHLCV data from TwelveData
  const fetchTwelveData = async (symbol: string, interval = '1h', length = 100) => {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${length}&apikey=${TWELVEDATA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('TwelveData fetch failed');
    const data = await res.json();
    if (!data.values) throw new Error('No data from TwelveData');
    return data.values.map((v: any) => ({
      close: parseFloat(v.close),
      time: v.datetime,
    })).reverse(); // oldest first
  };

  // Helper: Fetch OHLCV data from Finnhub
  const fetchFinnhub = async (symbol: string, interval = '60', length = 100) => {
    // Finnhub uses UNIX timestamps for from/to
    const now = Math.floor(Date.now() / 1000);
    const from = now - length * 60 * parseInt(interval, 10);
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${interval}&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Finnhub fetch failed');
    const data = await res.json();
    if (!data.c) throw new Error('No data from Finnhub');
    return data.c.map((close: number, i: number) => ({
      close,
      time: new Date(data.t[i] * 1000).toISOString(),
    }));
  };

  // Main ingestion function
  const ingestIndicators = useCallback(
    async (
      { asset, source, interval = '1h', length = 100 }: IndicatorIngestorOptions
    ): Promise<IngestResult[]> => {
      if (!user || !activeVaultId) {
        return [{ success: false, error: 'Missing session or vault context' }];
      }
      let priceData: { close: number; time: string }[] = [];
      try {
        priceData =
          source === 'twelvedata'
            ? await fetchTwelveData(asset, interval, length)
            : await fetchFinnhub(asset, interval === '1h' ? '60' : interval, length);
      } catch (err: any) {
        return [{ success: false, error: err.message || 'Data fetch error' }];
      }
      if (priceData.length < 50) {
        return [{ success: false, error: 'Insufficient data for indicators' }];
      }
      const closes = priceData.map((d) => d.close);
      const times = priceData.map((d) => d.time);
      // Calculate indicators
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      const rsi = RSI.calculate({ period: 14, values: closes });
      const sma20 = SMA.calculate({ period: 20, values: closes });
      const sma50 = SMA.calculate({ period: 50, values: closes });
      const ema20 = EMA.calculate({ period: 20, values: closes });
      const ema50 = EMA.calculate({ period: 50, values: closes });
      // Helper to get latest value and time
      const latestIdx = priceData.length - 1;
      // Defensive: get last value or fallback
      const lastMacd = macd.length > 0 ? macd[macd.length - 1] : { MACD: 0, signal: 0 };
      const lastRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
      const lastSma20 = sma20.length > 0 ? sma20[sma20.length - 1] : closes[latestIdx];
      const lastSma50 = sma50.length > 0 ? sma50[sma50.length - 1] : closes[latestIdx];
      const lastEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : closes[latestIdx];
      const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : closes[latestIdx];
      const signals: TechnicalSignal[] = [
        {
          indicator: 'MACD',
          action:
            (lastMacd.MACD ?? 0) > (lastMacd.signal ?? 0)
              ? 'buy'
              : (lastMacd.MACD ?? 0) < (lastMacd.signal ?? 0)
              ? 'sell'
              : 'hold',
          asset,
          confidence: Math.abs((lastMacd.MACD ?? 0) - (lastMacd.signal ?? 0)),
          timestamp: times[latestIdx],
        },
        {
          indicator: 'RSI',
          action:
            lastRsi > 70
              ? 'sell'
              : lastRsi < 30
              ? 'buy'
              : 'hold',
          asset,
          confidence: Math.abs(lastRsi - 50) / 50,
          timestamp: times[latestIdx],
        },
        {
          indicator: 'SMA20',
          action:
            closes[latestIdx] > lastSma20
              ? 'buy'
              : closes[latestIdx] < lastSma20
              ? 'sell'
              : 'hold',
          asset,
          confidence: Math.abs(closes[latestIdx] - lastSma20) / closes[latestIdx],
          timestamp: times[latestIdx],
        },
        {
          indicator: 'SMA50',
          action:
            closes[latestIdx] > lastSma50
              ? 'buy'
              : closes[latestIdx] < lastSma50
              ? 'sell'
              : 'hold',
          asset,
          confidence: Math.abs(closes[latestIdx] - lastSma50) / closes[latestIdx],
          timestamp: times[latestIdx],
        },
        {
          indicator: 'EMA20',
          action:
            closes[latestIdx] > lastEma20
              ? 'buy'
              : closes[latestIdx] < lastEma20
              ? 'sell'
              : 'hold',
          asset,
          confidence: Math.abs(closes[latestIdx] - lastEma20) / closes[latestIdx],
          timestamp: times[latestIdx],
        },
        {
          indicator: 'EMA50',
          action:
            closes[latestIdx] > lastEma50
              ? 'buy'
              : closes[latestIdx] < lastEma50
              ? 'sell'
              : 'hold',
          asset,
          confidence: Math.abs(closes[latestIdx] - lastEma50) / closes[latestIdx],
          timestamp: times[latestIdx],
        },
      ];
      // POST each signal
      const results: IngestResult[] = [];
      for (const signal of signals) {
        try {
          const res = await fetch('/api/signal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(hasUserId(user) ? { Authorization: user.userId } : {}),
            },
            body: JSON.stringify({ signal_type: 'technical', ...signal, vaultId: activeVaultId }),
          });
          if (!res.ok) {
            results.push({ success: false, error: `Failed to ingest ${signal.indicator}` });
          } else {
            results.push({ success: true });
          }
        } catch (err: any) {
          results.push({ success: false, error: err.message || `Error ingesting ${signal.indicator}` });
        }
      }
      return results;
    },
    [user, activeVaultId]
  );

  return { ingestIndicators };
}
// End Block 98d Implementation 

// Block 98e Implementation
import { useCallback } from 'react';

export interface VIXMacroSignal extends MacroSignal {
  subtype: 'vix';
  asset: string;
}

export function useVIXIngestor() {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';

  // Fetch VIX historical data (daily close for last 2 days)
  const fetchVIXData = async () => {
    // Finnhub symbol for VIX is '^VIX' (sometimes 'VIX')
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    const from = now - 3 * oneDay; // get a few days for safety
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=^VIX&resolution=D&from=${from}&to=${now}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Finnhub VIX fetch failed');
    const data = await res.json();
    if (!data.c || data.c.length < 2) throw new Error('Insufficient VIX data');
    return {
      closes: data.c,
      times: data.t.map((t: number) => new Date(t * 1000).toISOString()),
    };
  };

  // Main ingestion function
  const ingestVIX = useCallback(async (): Promise<IngestResult> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return { success: false, error: 'SSR or missing session/vault' };
    }
    let closes: number[] = [];
    let times: string[] = [];
    try {
      const vix = await fetchVIXData();
      closes = vix.closes;
      times = vix.times;
    } catch (err: any) {
      return { success: false, error: err.message || 'VIX fetch error' };
    }
    // Compute daily % change and volatility range
    const latest = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const pctChange = ((latest - prev) / prev) * 100;
    const range = Math.max(...closes) - Math.min(...closes);
    // Confidence: higher for large % change or high VIX
    let confidence = Math.min(1, Math.abs(pctChange) / 10 + (latest > 25 ? 0.5 : 0.2));
    // Construct MacroSignal
    const signal: VIXMacroSignal = {
      category: 'macro',
      subtype: 'vix',
      value: latest,
      confidence,
      asset: '^VIX',
      source: 'finnhub',
      timestamp: times[times.length - 1],
    };
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user && (user as any).userId ? { Authorization: (user as any).userId } : {}),
        },
        body: JSON.stringify({ signal_type: 'macro', ...signal, vaultId: activeVaultId }),
      });
      if (!res.ok) return { success: false, error: 'Failed to ingest VIX macro signal' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }, [user, activeVaultId]);

  return { ingestVIX };
}
// End Block 98e Implementation 

// Block 98f Implementation
import { useState, useRef } from 'react';

export interface NewsSentimentSignal extends NewsSignal {
  subtype: 'news';
  url: string;
  sentimentScore: number;
  asset: string;
}

const SENTIMENT_WORDS: Record<string, number> = {
  good: 1,
  great: 2,
  positive: 1,
  gain: 1,
  up: 1,
  strong: 1,
  bullish: 2,
  bad: -1,
  negative: -1,
  loss: -1,
  down: -1,
  weak: -1,
  bearish: -2,
  crash: -2,
  rally: 1,
  surge: 1,
  drop: -1,
  fall: -1,
  risk: -1,
  uncertainty: -1,
  stable: 1,
  volatile: -1,
};

export function useNewsIngestor() {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWSAPI_KEY || process.env.NEXT_PUBLIC_NEWSDATA_KEY || '';
  const [status, setStatus] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle');
  const lastIngest = useRef<number>(0);

  // Minimal sentiment analyzer
  function analyzeSentiment(text: string): number {
    let score = 0;
    const words = text.toLowerCase().split(/\W+/);
    for (const word of words) {
      if (SENTIMENT_WORDS[word]) score += SENTIMENT_WORDS[word];
    }
    return Math.max(-3, Math.min(3, score));
  }

  // Main ingestion function
  const ingestNewsSentiment = async (asset: string): Promise<IngestResult[]> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return [{ success: false, error: 'SSR or missing session/vault' }];
    }
    setStatus('fetching');
    let articles: any[] = [];
    try {
      // Prefer NewsAPI, fallback to NewsData
      let url = '';
      if (process.env.NEXT_PUBLIC_NEWSAPI_KEY) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(asset)}&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;
      } else {
        url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=${encodeURIComponent(asset)}&language=en`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('News API fetch failed');
      const data = await res.json();
      articles = data.articles || data.results || [];
      if (!Array.isArray(articles) || articles.length === 0) throw new Error('No news articles found');
    } catch (err: any) {
      setStatus('error');
      return [{ success: false, error: err.message || 'News fetch error' }];
    }
    // Analyze and ingest
    const results: IngestResult[] = [];
    for (const article of articles.slice(0, 5)) { // Limit to 5 most recent
      const headline = article.title || article.headline || '';
      const url = article.url || article.link || '';
      const timestamp = article.publishedAt || article.pubDate || new Date().toISOString();
      const sentimentScore = analyzeSentiment(headline + ' ' + (article.description || ''));
      const signal: NewsSentimentSignal = {
        asset,
        subtype: 'news',
        sentimentScore,
        headline,
        url,
        timestamp,
        source: process.env.NEXT_PUBLIC_NEWSAPI_KEY ? 'newsapi' : 'newsdata',
        summary: article.description || '',
        sentiment: sentimentScore,
      };
      try {
        const res = await fetch('/api/signal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user && (user as any).userId ? { Authorization: (user as any).userId } : {}),
          },
          body: JSON.stringify({ signal_type: 'news', ...signal, vaultId: activeVaultId }),
        });
        if (!res.ok) {
          results.push({ success: false, error: `Failed to ingest news signal for ${asset}` });
        } else {
          results.push({ success: true });
        }
      } catch (err: any) {
        results.push({ success: false, error: err.message || `Error ingesting news signal for ${asset}` });
      }
    }
    setStatus('done');
    lastIngest.current = Date.now();
    return results;
  };

  return { ingestNewsSentiment, status, lastIngest };
}
// End Block 98f Implementation 

// Block 98g Implementation
export interface CompanySignal {
  subtype: 'earnings';
  asset: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  timestamp: string;
  source: string;
}

export function useEarningsIngestor() {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
  const TWELVEDATA_API_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';

  // Fetch earnings data from Finnhub
  const fetchFinnhubEarnings = async (symbol: string) => {
    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Finnhub earnings fetch failed');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No earnings data found');
    return data;
  };

  // Fetch earnings data from TwelveData (if needed)
  const fetchTwelveDataEarnings = async (symbol: string) => {
    const url = `https://api.twelvedata.com/earnings?symbol=${symbol}&apikey=${TWELVEDATA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('TwelveData earnings fetch failed');
    const data = await res.json();
    if (!data.earnings || !Array.isArray(data.earnings) || data.earnings.length === 0) throw new Error('No earnings data found');
    return data.earnings;
  };

  // Main ingestion function
  const ingestEarningsForAsset = async (asset: string): Promise<IngestResult[]> => {
    if (!user || !activeVaultId) {
      return [{ success: false, error: 'Missing session or vault context' }];
    }
    let earnings: any[] = [];
    let source = '';
    try {
      if (FINNHUB_API_KEY) {
        earnings = await fetchFinnhubEarnings(asset);
        source = 'finnhub';
      } else if (TWELVEDATA_API_KEY) {
        earnings = await fetchTwelveDataEarnings(asset);
        source = 'twelvedata';
      } else {
        throw new Error('No earnings API key available');
      }
    } catch (err: any) {
      return [{ success: false, error: err.message || 'Earnings fetch error' }];
    }
    // Parse and ingest
    const results: IngestResult[] = [];
    for (const e of earnings.slice(0, 3)) { // Limit to 3 most recent/upcoming
      const signal: CompanySignal = {
        subtype: 'earnings',
        asset,
        epsActual: e.actual || e.eps_actual || null,
        epsEstimate: e.estimate || e.eps_estimate || null,
        revenueActual: e.revenueActual || e.revenue_actual || null,
        revenueEstimate: e.revenueEstimate || e.revenue_estimate || null,
        timestamp: e.date || e.datetime || e.reportDate || new Date().toISOString(),
        source,
      };
      try {
        const res = await fetch('/api/signal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user && (user as any).userId ? { Authorization: (user as any).userId } : {}),
          },
          body: JSON.stringify({ signal_type: 'company', ...signal, vaultId: activeVaultId }),
        });
        if (!res.ok) {
          results.push({ success: false, error: `Failed to ingest earnings signal for ${asset}` });
        } else {
          results.push({ success: true });
        }
      } catch (err: any) {
        results.push({ success: false, error: err.message || `Error ingesting earnings signal for ${asset}` });
      }
    }
    return results;
  };

  return { ingestEarningsForAsset };
}
// End Block 98g Implementation 

// Block 98h Implementation
export interface SocialSignal {
  asset: string;
  subtype: 'social';
  sentimentScore: number;
  mentionsCount: number;
  timestamp: string;
  source?: string;
}

export function useSocialSentimentIngestor() {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWSAPI_KEY || process.env.NEXT_PUBLIC_NEWSDATA_KEY || '';

  // Minimal sentiment analyzer (reuse from news ingestor)
  const SENTIMENT_WORDS: Record<string, number> = {
    good: 1, great: 2, positive: 1, gain: 1, up: 1, strong: 1, bullish: 2,
    bad: -1, negative: -1, loss: -1, down: -1, weak: -1, bearish: -2, crash: -2,
    rally: 1, surge: 1, drop: -1, fall: -1, risk: -1, uncertainty: -1, stable: 1, volatile: -1,
  };
  function analyzeSentiment(text: string): number {
    let score = 0;
    const words = text.toLowerCase().split(/\W+/);
    for (const word of words) {
      if (SENTIMENT_WORDS[word]) score += SENTIMENT_WORDS[word];
    }
    return Math.max(-3, Math.min(3, score));
  }

  async function ingestSocialSentiment(asset: string): Promise<void> {
    if (typeof window === 'undefined' || !user || !activeVaultId) return;
    try {
      // Simulate social sentiment via NewsAPI as a proxy (if no aggregator available)
      let url = '';
      if (process.env.NEXT_PUBLIC_NEWSAPI_KEY) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(asset)}&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;
      } else {
        url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=${encodeURIComponent(asset)}&language=en`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('Social sentiment fetch failed');
        return;
      }
      const data = await res.json();
      const articles = data.articles || data.results || [];
      if (!Array.isArray(articles) || articles.length === 0) {
        console.warn('No social sentiment data found');
        return;
      }
      // Aggregate sentiment and mentions
      let totalScore = 0;
      let mentions = 0;
      let latestTimestamp = new Date().toISOString();
      for (const article of articles.slice(0, 10)) { // Limit to 10
        const text = (article.title || '') + ' ' + (article.description || '');
        totalScore += analyzeSentiment(text);
        mentions++;
        if (article.publishedAt || article.pubDate) {
          latestTimestamp = article.publishedAt || article.pubDate;
        }
      }
      const avgScore = mentions > 0 ? totalScore / mentions : 0;
      const signal: SocialSignal = {
        asset,
        subtype: 'social',
        sentimentScore: avgScore,
        mentionsCount: mentions,
        timestamp: latestTimestamp,
        source: process.env.NEXT_PUBLIC_NEWSAPI_KEY ? 'newsapi' : 'newsdata',
      };
      await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user && (user as any).userId ? { Authorization: (user as any).userId } : {}),
        },
        body: JSON.stringify({ signal_type: 'social', ...signal, vaultId: activeVaultId }),
      });
    } catch (err) {
      console.warn('Error ingesting social sentiment:', err);
    }
  }

  return { ingestSocialSentiment };
}
// End Block 98h Implementation 

// Block 98i Implementation
export interface GeopoliticalMacroSignal extends MacroSignal {
  subtype: 'geopolitical';
  asset: string;
  confidence: number;
  source: string;
  summary: string;
  timestamp: string;
}

const GEOPOLITICAL_KEYWORDS = [
  'war', 'conflict', 'election', 'sanctions', 'nuclear', 'missile', 'protest', 'coup', 'military', 'strike', 'embargo', 'treaty', 'summit', 'border', 'attack', 'terror', 'ceasefire', 'referendum', 'regime', 'revolt', 'uprising', 'blockade', 'hostage', 'diplomat', 'espionage', 'cyber', 'hack', 'unrest', 'martial law', 'mobilization', 'occupation', 'partition', 'partition', 'separatist', 'autonomy', 'sovereignty', 'annex', 'airstrike', 'shelling', 'evacuation', 'sanction', 'boycott', 'alliance', 'tension', 'peace talks', 'negotiation', 'treaty', 'resolution', 'UN', 'NATO', 'EU', 'US', 'Russia', 'China', 'Ukraine', 'Israel', 'Palestine', 'Iran', 'North Korea', 'Taiwan', 'South China Sea', 'Baltics', 'Africa', 'Middle East', 'Asia', 'Europe', 'America', 'global'
];

export function useGeopoliticalIngestor() {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWSAPI_KEY || process.env.NEXT_PUBLIC_NEWSDATA_KEY || '';

  function keywordDensity(text: string): number {
    const lower = text.toLowerCase();
    let count = 0;
    for (const kw of GEOPOLITICAL_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) count++;
    }
    return count;
  }

  async function ingestGeopoliticalSignal(): Promise<IngestResult[]> {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return [{ success: false, error: 'SSR or missing session/vault' }];
    }
    let articles: any[] = [];
    try {
      let url = '';
      if (process.env.NEXT_PUBLIC_NEWSAPI_KEY) {
        url = `https://newsapi.org/v2/top-headlines?q=war+conflict+election+sanctions+nuclear&language=en&apiKey=${NEWS_API_KEY}`;
      } else {
        url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=war,conflict,election,sanctions,nuclear&language=en`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geopolitical news fetch failed');
      const data = await res.json();
      articles = data.articles || data.results || [];
      if (!Array.isArray(articles) || articles.length === 0) throw new Error('No geopolitical news found');
    } catch (err: any) {
      return [{ success: false, error: err.message || 'Geopolitical news fetch error' }];
    }
    const results: IngestResult[] = [];
    for (const article of articles.slice(0, 5)) { // Limit to 5
      const summary = article.description || article.summary || '';
      const headline = article.title || article.headline || '';
      const timestamp = article.publishedAt || article.pubDate || new Date().toISOString();
      const text = headline + ' ' + summary;
      const density = keywordDensity(text);
      if (density === 0) continue;
      const confidence = Math.min(1, 0.1 + 0.15 * density);
      const regionMatch = GEOPOLITICAL_KEYWORDS.find(kw => text.toLowerCase().includes(kw.toLowerCase()));
      const asset = regionMatch && [
        'US', 'Russia', 'China', 'Ukraine', 'Israel', 'Palestine', 'Iran', 'North Korea', 'Taiwan', 'South China Sea', 'Baltics', 'Africa', 'Middle East', 'Asia', 'Europe', 'America', 'global'
      ].includes(regionMatch) ? regionMatch : 'global';
      const signal: GeopoliticalMacroSignal = {
        category: 'macro',
        subtype: 'geopolitical',
        asset,
        confidence,
        source: process.env.NEXT_PUBLIC_NEWSAPI_KEY ? 'newsapi' : 'newsdata',
        summary,
        timestamp,
        value: density, // for compatibility with MacroSignal
      };
      try {
        const res = await fetch('/api/signal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user && (user as any).userId ? { Authorization: (user as any).userId } : {}),
          },
          body: JSON.stringify({ signal_type: 'macro', ...signal, vaultId: activeVaultId }),
        });
        if (!res.ok) {
          results.push({ success: false, error: `Failed to ingest geopolitical signal` });
        } else {
          results.push({ success: true });
        }
      } catch (err: any) {
        results.push({ success: false, error: err.message || `Error ingesting geopolitical signal` });
      }
    }
    return results;
  }

  return { ingestGeopoliticalSignal };
}
// End Block 98i Implementation 