import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const MarketSentimentBar: React.FC = () => {
  // TODO: Replace with real sentiment data
  const isLoading = false;
  const error = false;
  const sentiment = null; // No mock data

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Market Sentiment Bar</CardTitle>
        <CardDescription>
          Shows live market sentiment index or summary bar (Fear/Greed, VIX, Twitter AI scan).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-12 w-full flex items-center justify-center bg-muted/20 rounded">
          {isLoading ? (
            <span>Loading...</span>
          ) : error ? (
            <span className="text-red-500">Error loading sentiment data</span>
          ) : !sentiment ? (
            <span className="text-muted-foreground">Connect sentiment sources to view market sentiment</span>
          ) : (
            <span>Sentiment bar goes here</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketSentimentBar; 