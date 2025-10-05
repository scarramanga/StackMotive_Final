// Block 99 Implementation

// Input types
export type SignalType = 'macro' | 'news' | 'technical';

export interface MacroSignal {
  signal_type: 'macro';
  category: string;
  value: number;
  source: string;
  confidence: number;
  timestamp: string;
}

export interface NewsSignal {
  signal_type: 'news';
  headline: string;
  summary: string;
  ticker?: string;
  source: string;
  sentiment: number;
  timestamp: string;
}

export interface TechnicalSignal {
  signal_type: 'technical';
  indicator: string;
  action: 'buy' | 'sell' | 'hold';
  asset: string;
  confidence: number;
  timestamp: string;
}

export type Signal = MacroSignal | NewsSignal | TechnicalSignal;

// Output type
export interface InterpretedSignal {
  id: string;
  type: SignalType;
  asset: string;
  confidence: number; // 0-1, normalized and weighted
  timestamp: string;
  tags: string[];
  original: Signal;
}

// Helper: Recency weighting (exponential decay, 1.0 for now, <1 for older)
function weightByRecency(timestamp: string): number {
  const now = Date.now();
  const t = new Date(timestamp).getTime();
  const hours = Math.max(0, (now - t) / (1000 * 60 * 60));
  // Decay: 1.0 if <1h, 0.8 if <6h, 0.6 if <24h, 0.4 if <48h, 0.2 if older
  if (hours < 1) return 1.0;
  if (hours < 6) return 0.8;
  if (hours < 24) return 0.6;
  if (hours < 48) return 0.4;
  return 0.2;
}

// Helper: Type priority weighting
function weightByType(type: SignalType): number {
  switch (type) {
    case 'macro': return 1.0;
    case 'news': return 0.8;
    case 'technical': return 0.6;
    default: return 0.5;
  }
}

// Helper: Source weighting (if known)
function weightBySource(source: string): number {
  if (!source) return 1.0;
  const s = source.toLowerCase();
  if (s.includes('macro')) return 1.0;
  if (s.includes('news')) return 0.9;
  if (s.includes('macd') || s.includes('rsi') || s.includes('technical')) return 0.8;
  return 1.0;
}

// Helper: Normalize confidence to 0-1
function normalizeConfidence(conf: number): number {
  if (typeof conf !== 'number' || isNaN(conf)) return 0.5;
  if (conf > 1) return Math.min(conf / 100, 1);
  if (conf < 0) return 0;
  return conf;
}

// Helper: Asset extraction
function extractAsset(signal: Signal): string {
  if ('symbol' in signal && typeof signal.symbol === 'string') return signal.symbol;
  if ('ticker' in signal && typeof signal.ticker === 'string' && signal.ticker) return signal.ticker;
  if ('asset' in signal && typeof signal.asset === 'string') return signal.asset;
  return 'UNKNOWN';
}

// Helper: Tag extraction
function extractTags(signal: Signal): string[] {
  const tags: string[] = [];
  if ('category' in signal && signal.category) tags.push(signal.category);
  if ('indicator' in signal && signal.indicator) tags.push(signal.indicator);
  if ('headline' in signal && signal.headline) tags.push('news');
  if ('action' in signal && signal.action) tags.push(signal.action);
  return tags;
}

export function useSignalInterpreter() {
  // Block 99 Implementation
  function interpretSignals(signals: Signal[]): InterpretedSignal[] {
    return signals.map((signal, idx) => {
      const type: SignalType = signal.signal_type;
      const asset = extractAsset(signal);
      const baseConfidence =
        'confidence' in signal
          ? normalizeConfidence(signal.confidence)
          : 'sentiment' in signal
          ? normalizeConfidence(signal.sentiment)
          : 0.5;
      const recencyWeight = weightByRecency(signal.timestamp);
      const typeWeight = weightByType(type);
      const sourceWeight = 'source' in signal && typeof signal.source === 'string' ? weightBySource(signal.source) : 1.0;
      const weightedConfidence = Math.max(0, Math.min(1, baseConfidence * recencyWeight * typeWeight * sourceWeight));
      return {
        id: `${type}-${asset}-${signal.timestamp}-${idx}`,
        type,
        asset,
        confidence: weightedConfidence,
        timestamp: signal.timestamp,
        tags: extractTags(signal),
        original: signal,
      };
    });
  }
  return { interpretSignals };
} 