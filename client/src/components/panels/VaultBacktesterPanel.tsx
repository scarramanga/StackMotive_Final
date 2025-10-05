import React, { useState } from 'react';
import { PanelAnimator } from '../animation/PanelAnimator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface VaultBacktesterPanelProps {
  isVisible: boolean;
  onClose: () => void;
  vaultAlloc: Record<string, number>;
  strategyAlloc: Record<string, number>;
}

const MOCK_TIMEFRAMES = ['1Y', '3Y', '5Y'] as const;
type Timeframe = typeof MOCK_TIMEFRAMES[number];

// Mock backtest data generator
function getMockBacktestData(timeframe: Timeframe) {
  // 1Y: 12 points, 3Y: 36, 5Y: 60
  const points = timeframe === '1Y' ? 12 : timeframe === '3Y' ? 36 : 60;
  const data = Array.from({ length: points }, (_, i) => ({
    date: `${i + 1}/${timeframe}`,
    vault: 100 + i * (Math.random() * 2 + 1),
    strategy: 100 + i * (Math.random() * 2.5 + 1.2),
  }));
  return data;
}

const MOCK_METRICS = {
  '1Y': { cagr: 7.2, mdd: -8.5, sharpe: 1.1 },
  '3Y': { cagr: 6.1, mdd: -12.3, sharpe: 0.95 },
  '5Y': { cagr: 8.4, mdd: -15.7, sharpe: 1.18 },
};

export const VaultBacktesterPanel: React.FC<VaultBacktesterPanelProps> = ({ isVisible, onClose, vaultAlloc, strategyAlloc }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const data = getMockBacktestData(timeframe);
  const metrics = MOCK_METRICS[timeframe];

  if (!isVisible) return null;

  return (
    <PanelAnimator isVisible={isVisible} onClose={onClose}>
      <div
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl flex flex-col outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10">
          <h2 className="text-lg font-semibold truncate">Vault Backtester</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        {/* Controls */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Timeframe:</span>
          <div className="flex gap-1">
            {MOCK_TIMEFRAMES.map(tf => (
              <button
                key={tf}
                type="button"
                className={`px-2 py-1 rounded text-xs font-semibold border focus:outline-none focus:ring transition-colors ${
                  tf === timeframe
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-accent'
                }`}
                onClick={() => setTimeframe(tf)}
                aria-pressed={tf === timeframe}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        {/* Chart */}
        <div className="flex-1 px-4 py-6">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={v => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                labelStyle={{ color: '#374151', fontWeight: 500 }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
              />
              <Legend
                verticalAlign="top"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 8, fontSize: 13 }}
              />
              <Line
                type="monotone"
                dataKey="vault"
                name="Your Vault"
                stroke="#0072B2"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="strategy"
                name="Selected Strategy"
                stroke="#D55E00"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Metrics */}
        <div className="px-4 pb-6 flex flex-col gap-2">
          <div className="flex gap-4 justify-between text-sm">
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">CAGR</span>
              <span className="font-semibold">{metrics.cagr}%</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Max Drawdown</span>
              <span className="font-semibold">{metrics.mdd}%</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Sharpe</span>
              <span className="font-semibold">{metrics.sharpe}</span>
            </div>
          </div>
        </div>
      </div>
    </PanelAnimator>
  );
}; 