import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  usePortfolioOverview, 
  portfolioOverviewService,
  type PortfolioAsset 
} from '../../services/portfolioOverviewService';

// Color palette for overlays
const OVERLAY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', 
  '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#14b8a6'
];

export const PortfolioOverviewPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const [, setLocation] = useLocation();
  
  // State for UI controls
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [showOverlayDetails, setShowOverlayDetails] = useState(false);
  const [highlightedStrategy, setHighlightedStrategy] = useState<string | null>(null);

  // Fetch all portfolio data using service
  const { data: portfolioData, isLoading, error } = usePortfolioOverview(activeVaultId, user);

  // Process chart data using service
  const donutChartData = useMemo(() => {
    if (!portfolioData?.charts?.allocation) return [];
    return portfolioData.charts.allocation.map((allocation, index) => ({
      ...allocation,
      color: allocation.color || OVERLAY_COLORS[index % OVERLAY_COLORS.length]
    }));
  }, [portfolioData]);

  const lineChartData = useMemo(() => {
    if (!portfolioData?.charts?.performance) return [];
    return portfolioData.charts.performance.map(point => ({
      ...point,
      timestamp: new Date(point.date).getTime()
    }));
  }, [portfolioData]);

  // Handle asset click for drilldown
  const handleAssetClick = (assetId: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'portfolio-overview',
        userId: user?.id,
        action: 'asset_drilldown',
        timestamp: new Date().toISOString(),
        details: { assetId, vaultId: activeVaultId }
      })
    }).catch(console.error);
    
    setLocation(`/asset/${assetId}`);
  };

  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: '7d' | '30d') => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'portfolio-overview',
        userId: user?.id,
        action: 'timerange_change',
        timestamp: new Date().toISOString(),
        details: { from: timeRange, to: newTimeRange, vaultId: activeVaultId }
      })
    }).catch(console.error);
    
    setTimeRange(newTimeRange);
  };

  // DonutChart component
  const DonutChart: React.FC<{ data: any[]; onSliceClick?: (strategyId: string) => void }> = ({ 
    data, 
    onSliceClick 
  }) => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          onClick={(data) => onSliceClick?.(data.strategyId)}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
              stroke={highlightedStrategy === entry.strategyId ? '#000' : 'none'}
              strokeWidth={highlightedStrategy === entry.strategyId ? 2 : 0}
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)}%`, 
            name
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  // LineChart component for returns
  const ReturnsLineChart: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <Tooltip 
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // MiniStatsRow component
  const MiniStatsRow: React.FC<{ snapshot: any }> = ({ snapshot }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {portfolioOverviewService.formatCurrency(snapshot.totalValue)}
        </div>
        <div className="text-sm text-muted-foreground">Total Value</div>
      </div>
      <div className="text-center">
        <div className={`text-2xl font-bold ${portfolioOverviewService.getPerformanceColor(snapshot.totalGainPercentage)}`}>
          {portfolioOverviewService.formatPercentage(snapshot.totalGainPercentage)}
        </div>
        <div className="text-sm text-muted-foreground">Total Return</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {portfolioData?.assets?.length || 0}
        </div>
        <div className="text-sm text-muted-foreground">Active Assets</div>
      </div>
    </div>
  );

  // AlertBadge component
  const AlertBadge: React.FC<{ assets: PortfolioAsset[] }> = ({ assets }) => {
    const riskAssets = assets.filter(asset => Math.abs(asset.gainPercentage) > 10);
    if (riskAssets.length === 0) return null;

    return (
      <Badge 
        variant="outline" 
        className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1"
      >
        <AlertTriangle className="h-3 w-3" />
        {riskAssets.length} High Volatility Asset{riskAssets.length > 1 ? 's' : ''}
      </Badge>
    );
  };

  // Loading states
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error states
  if (error || !portfolioData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load portfolio data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Portfolio Overview
          </div>
          {portfolioData.assets && (
            <AlertBadge assets={portfolioData.assets} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mini Stats Row */}
        <MiniStatsRow snapshot={portfolioData.snapshot} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart - Asset Allocation */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Asset Allocation</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverlayDetails(!showOverlayDetails)}
              >
                {showOverlayDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>
            <DonutChart 
              data={donutChartData} 
              onSliceClick={setHighlightedStrategy}
            />
            {showOverlayDetails && (
              <div className="mt-4 space-y-2">
                {donutChartData.map((allocation, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: allocation.color }}
                      />
                      <span className="font-medium">{allocation.name}</span>
                    </div>
                    <span className="text-sm font-medium">{allocation.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Chart - Performance */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="7d">7D</TabsTrigger>
                  <TabsTrigger value="30d">30D</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ReturnsLineChart data={lineChartData} />
          </div>
        </div>

        {/* Asset Details Table */}
        {showOverlayDetails && portfolioData.assets && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Portfolio Assets</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Asset</th>
                    <th className="border border-border p-2 text-left">Allocation</th>
                    <th className="border border-border p-2 text-left">Value</th>
                    <th className="border border-border p-2 text-left">P&L</th>
                    <th className="border border-border p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.assets.slice(0, 10).map((asset) => (
                    <tr key={asset.id} className="hover:bg-muted/50">
                      <td className="border border-border p-2">
                        <div>
                          <div className="font-medium">{asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                      </td>
                      <td className="border border-border p-2">{asset.allocation.toFixed(1)}%</td>
                      <td className="border border-border p-2">
                        {portfolioOverviewService.formatCurrency(asset.value)}
                      </td>
                      <td className="border border-border p-2">
                        <span className={portfolioOverviewService.getPerformanceColor(asset.gainPercentage)}>
                          {portfolioOverviewService.formatPercentage(asset.gainPercentage)}
                        </span>
                      </td>
                      <td className="border border-border p-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAssetClick(asset.id)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioOverviewPanel; 