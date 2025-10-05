// Block 89 Implementation
import React, { useEffect, useState } from 'react';
import { useSignalAPI, Signal } from '../../hooks/useSignalAPI';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const GPTSignalChart: React.FC = () => {
  // Block 89 Implementation
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

  const chartData = gptSignals
    .filter(s => s.timestamp && typeof s.confidence === 'number')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(s => ({
      time: s.timestamp,
      confidence: Math.round((s.confidence ?? 0) * 100),
      symbol: s.symbol,
    }));

  return (
    <section className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">GPT Signal Confidence Over Time</h2>
      {loading ? (
        <div className="text-gray-500">Loading chart...</div>
      ) : chartData.length === 0 ? (
        <div className="text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <span className="block text-3xl mb-2">📉</span>
          <span>No GPT signals to chart for this Vault.</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="time"
              tickFormatter={t => format(new Date(t), 'MMM d, HH:mm')}
              className="text-xs text-gray-500 dark:text-gray-400"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              className="text-xs text-gray-500 dark:text-gray-400"
            />
            <Tooltip
              labelFormatter={t => format(new Date(t), 'PPpp')}
              formatter={(value: number, name: string) => [`${value}%`, name === 'confidence' ? 'Confidence' : name]}
              contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', color: '#111' }}
              wrapperStyle={{ zIndex: 50 }}
            />
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
              name="Confidence"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
};

export default GPTSignalChart; 