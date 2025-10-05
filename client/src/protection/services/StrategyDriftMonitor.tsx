import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const StrategyDriftMonitor: React.FC = () => {
  // TODO: Replace with real strategy and portfolio data
  const isLoading = false;
  const error = false;
  const driftData = null; // No mock data

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Strategy Drift Monitor</CardTitle>
        <CardDescription>
          Monitors divergence between current portfolio and target strategy. Notifies if drift exceeds threshold.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <span>Loading...</span>
        ) : error ? (
          <span className="text-red-500">Error loading drift data</span>
        ) : !driftData ? (
          <span className="text-muted-foreground">Connect strategy and portfolio data to monitor drift</span>
        ) : (
          <div>
            {/* TODO: Render drift chart and notification */}
            <span>Drift chart and alert go here</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrategyDriftMonitor; 