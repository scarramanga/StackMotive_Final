// Block 90 Implementation
import React, { useEffect, useState } from 'react';
import { useSignalAPI, Signal } from '../../hooks/useSignalAPI';
import { usePortfolio } from '../../contexts/PortfolioContext';

function getSparklinePoints(confidences: number[], width = 120, height = 32) {
  if (confidences.length === 0) return '';
  const max = 1;
  const min = 0;
  const step = width / (confidences.length - 1 || 1);
  return confidences
    .map((c, i) => {
      const x = i * step;
      const y = height - (c - min) / (max - min) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

const GPTSignalInsights: React.FC = () => {
  // Block 90 Implementation
  const { fetchSignalsForSessionVault } = useSignalAPI();
  const { activeVaultId } = usePortfolio();
  const [gptSignals, setGptSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      if (typeof window === 'undefined' || !activeVaultId) {
        setGptSignals([]);
        setLoading(false);
        return;
      }
      const data = await fetchSignalsForSessionVault();
      const filtered = data.filter(
        s => s.source?.toLowerCase() === 'gpt' || s.signal_type?.toLowerCase() === 'gpt'
      );
      if (!ignore) setGptSignals(filtered);
      setLoading(false);
    }
    load();
    return () => { ignore = true; };
  }, [fetchSignalsForSessionVault, activeVaultId]);

  if (typeof window === 'undefined' || !activeVaultId) return null;

  const total = gptSignals.length;
  const confidences = gptSignals
    .map(s => typeof s.confidence === 'number' ? s.confidence : undefined)
    .filter((c): c is number => c !== undefined);
  const avgConfidence = confidences.length
    ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100
    : 0;
  const uniqueAssets = new Set(gptSignals.map(s => s.symbol)).size;
  const sparklinePoints = confidences.length > 1 ? getSparklinePoints(confidences) : '';

  return (
    <section className="w-full max-w-xs bg-white dark:bg-gray-900 rounded-xl shadow p-4 flex flex-col gap-2">
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">GPT Signal Insights</h2>
      {loading ? (
        <div className="text-gray-500">Loading insights...</div>
      ) : total === 0 ? (
        <div className="text-gray-400 py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <span className="block text-2xl mb-1">🤖</span>
          <span>No GPT signals for this Vault.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Signals</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Avg. Confidence</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{avgConfidence.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Unique Assets</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{uniqueAssets}</span>
          </div>
          {sparklinePoints && (
            <div className="mt-2">
              <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  points={sparklinePoints}
                />
              </svg>
              <div className="text-xs text-gray-400 text-center">Confidence trend</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default GPTSignalInsights; 