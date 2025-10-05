import { useMemo } from 'react';

export interface SignalArchiveEntry {
  timestamp: string;
  symbol: string;
  signalType: string;
  confidence: number;
  action: 'buy' | 'sell' | 'hold';
  source: 'GPT' | 'Indicator' | 'User';
}

const MOCK_ARCHIVE: SignalArchiveEntry[] = [
  { timestamp: '2025-06-01T10:00:00Z', symbol: 'BTC', signalType: 'Momentum', confidence: 0.92, action: 'buy', source: 'GPT' },
  { timestamp: '2025-06-01T11:00:00Z', symbol: 'ETH', signalType: 'MACD', confidence: 0.75, action: 'hold', source: 'Indicator' },
  { timestamp: '2025-06-01T12:00:00Z', symbol: 'AAPL', signalType: 'Earnings', confidence: 0.6, action: 'sell', source: 'User' },
  { timestamp: '2025-06-02T09:30:00Z', symbol: 'BTC', signalType: 'Whale', confidence: 0.85, action: 'buy', source: 'Indicator' },
  { timestamp: '2025-06-02T10:15:00Z', symbol: 'SOL', signalType: 'GPT Overlay', confidence: 0.7, action: 'buy', source: 'GPT' },
  { timestamp: '2025-06-03T08:00:00Z', symbol: 'TSLA', signalType: 'News', confidence: 0.55, action: 'hold', source: 'User' },
  { timestamp: '2025-06-03T09:00:00Z', symbol: 'BTC', signalType: 'Narrative', confidence: 0.95, action: 'buy', source: 'GPT' },
  { timestamp: '2025-06-03T10:00:00Z', symbol: 'ETH', signalType: 'MACD', confidence: 0.8, action: 'buy', source: 'Indicator' },
];

export function useSignalArchive({ dateRange, symbol, type }: { dateRange?: [string, string]; symbol?: string; type?: string } = {}) {
  return useMemo(() => {
    let data = MOCK_ARCHIVE;
    if (dateRange) {
      data = data.filter(entry => entry.timestamp >= dateRange[0] && entry.timestamp <= dateRange[1]);
    }
    if (symbol) {
      data = data.filter(entry => entry.symbol === symbol);
    }
    if (type) {
      data = data.filter(entry => entry.signalType === type);
    }
    return data;
  }, [dateRange, symbol, type]);
} 