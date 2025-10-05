// Block 102 Implementation

import { InterpretedSignal, SignalType } from '../hooks/useSignalInterpreter';

export interface SignalStats {
  count: number;
  avgConfidence: number;
  topAssets: string[];
}

export interface GPTContextPayload {
  vaultId: string;
  summary: string;
  timestamp: string;
  signalOverview: {
    macro: SignalStats;
    news: SignalStats;
    technical: SignalStats;
  };
  topSignals: InterpretedSignal[];
}

function computeSignalStats(signals: InterpretedSignal[]): SignalStats {
  const count = signals.length;
  const avgConfidence = count > 0 ? signals.reduce((sum, s) => sum + s.confidence, 0) / count : 0;
  // Top assets by summed confidence
  const assetMap: Record<string, number> = {};
  for (const s of signals) {
    assetMap[s.asset] = (assetMap[s.asset] || 0) + s.confidence;
  }
  const topAssets = Object.entries(assetMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([asset]) => asset);
  return { count, avgConfidence, topAssets };
}

export function buildGPTSignalContext(signals: InterpretedSignal[], vaultId: string): GPTContextPayload {
  // Block 102 Implementation
  const macroSignals = signals.filter(s => s.type === 'macro');
  const newsSignals = signals.filter(s => s.type === 'news');
  const technicalSignals = signals.filter(s => s.type === 'technical');

  // Top signals: highest confidence, up to 10
  const topSignals = [...signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  // Summary: simple deterministic summary
  const summary = `Signals: ${signals.length} (macro: ${macroSignals.length}, news: ${newsSignals.length}, technical: ${technicalSignals.length})`;

  return {
    vaultId,
    summary,
    timestamp: new Date().toISOString(),
    signalOverview: {
      macro: computeSignalStats(macroSignals),
      news: computeSignalStats(newsSignals),
      technical: computeSignalStats(technicalSignals),
    },
    topSignals,
  };
} 