import React from 'react';
import { SovereignSignalPanel } from './SovereignSignalPanel';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useStrategyOverlay } from '../../hooks/useStrategyOverlay';

// Block 34: Market Overview Panel with Sovereign Signal Dashboard
export const MarketOverviewPanel: React.FC = () => {
  const portfolio = usePortfolio();
  const { getOverlaySuggestions } = useStrategyOverlay();
  // TODO: Replace with real signals, userIntent, marketSentiment, vaultBeliefs
  const overlays = getOverlaySuggestions ? getOverlaySuggestions([], {} as any, {} as any, []) : [];

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Market Overview</h1>
      {/* Other dashboard sections here */}
      <SovereignSignalPanel portfolio={portfolio} overlays={overlays} />
    </div>
  );
}; 