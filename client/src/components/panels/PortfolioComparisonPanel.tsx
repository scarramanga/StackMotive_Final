import React from 'react';
import { comparePortfolios, PortfolioComparisonResult } from '../../utils/performance/comparePortfolios';

interface PortfolioComparisonPanelProps {
  current: { equityCurve: number[] };
  baseline: { equityCurve: number[] };
  baselineLabel?: string;
}

// Block 36: Portfolio Comparison Tool
export const PortfolioComparisonPanel: React.FC<PortfolioComparisonPanelProps> = ({ current, baseline, baselineLabel = 'Baseline' }) => {
  const result: PortfolioComparisonResult = comparePortfolios(current, baseline);

  return (
    <section className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-2xl mx-auto my-6 transition-colors" aria-labelledby="portfolio-comparison-title">
      <h2 id="portfolio-comparison-title" className="text-lg font-semibold mb-2">Portfolio Comparison</h2>
      <table className="min-w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 px-2 text-left">Metric</th>
            <th className="py-2 px-2 text-right">Current</th>
            <th className="py-2 px-2 text-right">{baselineLabel}</th>
            <th className="py-2 px-2 text-right">Delta</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2 px-2 font-medium">CAGR</td>
            <td className="py-2 px-2 text-right">{(result.current.cagr * 100).toFixed(2)}%</td>
            <td className="py-2 px-2 text-right">{(result.baseline.cagr * 100).toFixed(2)}%</td>
            <td className={`py-2 px-2 text-right font-bold ${result.cagrDelta > 0 ? 'text-green-600' : result.cagrDelta < 0 ? 'text-red-600' : ''}`}>{(result.cagrDelta * 100).toFixed(2)}%</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2 px-2 font-medium">Volatility (Stdev)</td>
            <td className="py-2 px-2 text-right">{result.current.stdev.toFixed(2)}</td>
            <td className="py-2 px-2 text-right">{result.baseline.stdev.toFixed(2)}</td>
            <td className={`py-2 px-2 text-right font-bold ${result.stdevDelta < 0 ? 'text-green-600' : result.stdevDelta > 0 ? 'text-red-600' : ''}`}>{result.stdevDelta.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="py-2 px-2 font-medium">Tracking Error</td>
            <td colSpan={2}></td>
            <td className={`py-2 px-2 text-right font-bold ${result.trackingError > 0.05 ? 'text-red-600' : 'text-green-600'}`}>{result.trackingError.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      {/* TODO: Add comparative chart (e.g., line chart of equity curves) if charting lib available */}
      <div className="text-xs text-muted-foreground">
        <span className="font-semibold">Note:</span> Positive delta in CAGR is good; negative delta in volatility is good. Tracking error &gt; 0.05 indicates significant divergence.
      </div>
    </section>
  );
}; 