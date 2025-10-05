import React from 'react';
import { usePortfolioHealthStore } from '../../store/portfolioHealth';
import { Line } from 'react-chartjs-2';

// Block 31: Portfolio Health Score
export const PortfolioHealthPanel: React.FC = () => {
  const { healthScore, breakdown, trend } = usePortfolioHealthStore();

  const breakdownData = {
    labels: ['Diversification', 'Drawdown', 'Correlation', 'Risk'],
    datasets: [
      {
        data: [breakdown.diversification, breakdown.drawdown, breakdown.correlation, breakdown.risk],
        backgroundColor: ['#2563eb', '#eab308', '#f59e42', '#e11d48'],
      },
    ],
  };

  const trendData = {
    labels: trend.map((_, i) => i + 1),
    datasets: [
      {
        label: 'Health Score',
        data: trend,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        fill: true,
      },
    ],
  };

  return (
    <section className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-2xl mx-auto my-6 transition-colors">
      <h2 className="text-lg font-semibold mb-2">Portfolio Health</h2>
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <div className="flex-1 min-w-[120px] text-center">
          <div className="text-xs text-muted-foreground">Health Score</div>
          <div className={`text-4xl font-bold ${healthScore < 40 ? 'text-red-600' : healthScore < 70 ? 'text-yellow-600' : 'text-green-600'}`}>{healthScore}</div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Breakdown</div>
          <div className="w-full h-32">
            {/* Donut/bar chart for breakdown */}
            <Line data={breakdownData} options={{ plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 1 } } }} />
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Health Trend</div>
          <div className="w-full h-32">
            <Line data={trendData} options={{ plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }} />
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Diversification, drawdown, correlation, and risk are recalculated on every rebalance or asset change. Lower scores may trigger auto-rebalance.
      </div>
    </section>
  );
}; 