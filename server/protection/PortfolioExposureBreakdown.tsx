import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const TAG_TYPES = [
  { id: 'region', label: 'Region' },
  { id: 'sector', label: 'Sector' },
  { id: 'volatility', label: 'Volatility Class' },
  { id: 'esg', label: 'ESG' },
];

export const PortfolioExposureBreakdown: React.FC = () => {
  const [tab, setTab] = useState('region');
  const [relative, setRelative] = useState(true);
  // TODO: Replace with real portfolio/tag data
  const isLoading = false;
  const error = false;
  const breakdown = null; // No mock data

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Portfolio Exposure Breakdown</CardTitle>
        <CardDescription>
          View your portfolio exposure by region, sector, volatility, ESG, or other tags. Toggle between relative and absolute values.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button variant={relative ? 'default' : 'outline'} size="sm" onClick={() => setRelative(true)}>Relative</Button>
          <Button variant={!relative ? 'default' : 'outline'} size="sm" onClick={() => setRelative(false)}>Absolute</Button>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList>
            {TAG_TYPES.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {TAG_TYPES.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <div className="h-64 w-full flex items-center justify-center bg-muted/20 rounded">
                {isLoading ? (
                  <span>Loading...</span>
                ) : error ? (
                  <span className="text-red-500">Error loading breakdown</span>
                ) : !breakdown ? (
                  <span className="text-muted-foreground">Connect portfolio data to view {t.label} breakdown</span>
                ) : (
                  <span>{t.label} chart goes here</span>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PortfolioExposureBreakdown; 