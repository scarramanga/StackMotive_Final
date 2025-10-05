// Block 98a Implementation
import { useAuth } from './useAuth';
import { usePortfolio } from '../contexts/PortfolioContext';

export type SignalType = 'macro' | 'news' | 'technical';

export interface MockSignal {
  signal_type: SignalType;
  symbol: string;
  confidence: number;
  source: string;
  timestamp: string;
}

export interface IngestResult {
  success: boolean;
  error?: string;
}

function hasUserId(user: any): user is { userId: string } {
  return user && typeof user.userId === 'string';
}

export function useMockSignalIngestor() {
  // Block 98a Implementation
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();

  const ingestMockSignals = async (): Promise<IngestResult> => {
    if (typeof window === 'undefined' || !user || !activeVaultId) {
      return { success: false, error: 'SSR or missing session/vault' };
    }
    const now = new Date();
    const signals: MockSignal[] = [
      {
        signal_type: 'macro',
        symbol: 'USD',
        confidence: 0.85,
        source: 'macro-feed',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      },
      {
        signal_type: 'news',
        symbol: 'AAPL',
        confidence: 0.7,
        source: 'news-api',
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      },
      {
        signal_type: 'technical',
        symbol: 'BTC',
        confidence: 0.92,
        source: 'macd',
        timestamp: now.toISOString(),
      },
    ];
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hasUserId(user) ? { Authorization: user.userId } : {}),
        },
        body: JSON.stringify({ signals, vaultId: activeVaultId }),
      });
      if (!res.ok) {
        return { success: false, error: 'Failed to ingest signals' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  };

  return { ingestMockSignals };
} 