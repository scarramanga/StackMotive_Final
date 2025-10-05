import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Layers,
  AlertTriangle,
  Target
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  useAllocationData, 
  allocationVisualiserService 
} from '../../services/allocationVisualiserService';

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="font-medium text-foreground mb-2">{data.name}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Allocation:</span>
            <span className="font-medium">{allocationVisualiserService.formatPercentage(data.percentage)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">{allocationVisualiserService.formatCurrency(data.value)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend component
const CustomLegend: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      {data.map((entry, index) => (
        <div key={index} className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate">{entry.name}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {allocationVisualiserService.formatPercentage(entry.percentage)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {allocationVisualiserService.formatCurrency(entry.value)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Allocation item component
const AllocationItem: React.FC<{ item: any }> = ({ item }) => {
  const driftColor = allocationVisualiserService.getDriftColor(item.drift);
  const driftBackground = allocationVisualiserService.getDriftBackground(item.drift);
  const allocationStatus = allocationVisualiserService.getAllocationStatus(item.drift);

  return (
    <div className={`p-3 rounded-lg border ${driftBackground}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-medium">{item.name}</span>
        </div>
        <Badge variant="outline" className={allocationStatus.color}>
          {allocationStatus.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Current</div>
          <div className="font-medium">{allocationVisualiserService.formatPercentage(item.allocation)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Target</div>
          <div className="font-medium">{allocationVisualiserService.formatPercentage(item.targetAllocation)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Value</div>
          <div className="font-medium">{allocationVisualiserService.formatCurrency(item.currentValue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Drift</div>
          <div className={`font-medium ${driftColor}`}>
            {item.drift >= 0 ? '+' : ''}{item.drift.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// Portfolio health component
const PortfolioHealth: React.FC<{ items: any[] }> = ({ items }) => {
  const healthScore = allocationVisualiserService.calculateHealthScore(items);
  const healthColor = healthScore.score > 85 ? 'text-green-600' : 
                     healthScore.score > 75 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Portfolio Health</span>
        </div>
        <Badge variant="secondary" className={`text-xs ${healthColor}`}>
          Grade {healthScore.grade}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">{healthScore.description}</div>
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Score</span>
          <span>{healthScore.score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              healthScore.score > 85 ? 'bg-green-500' : 
              healthScore.score > 75 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthScore.score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const AllocationVisualiserPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();

  // Fetch allocation data using service
  const { data: allocationData, isLoading, error } = useAllocationData(activeVaultId, user);

  // Process pie chart data
  const pieChartData = useMemo(() => {
    if (!allocationData?.visualisation?.pieChartData) return [];
    return allocationData.visualisation.pieChartData;
  }, [allocationData]);

  // Calculate rebalance suggestions
  const rebalanceSuggestions = useMemo(() => {
    if (!allocationData?.breakdown?.byAsset) return [];
    
    const suggestions = allocationVisualiserService.calculateRebalanceSuggestions(
      allocationData.breakdown.byAsset,
      allocationData.breakdown.totalValue
    );
    
    // Log when rebalance suggestions are calculated
    if (suggestions.length > 0) {
      fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'allocation-visualiser',
          userId: user?.id || undefined,
          action: 'rebalance_suggestions_calculated',
          timestamp: new Date().toISOString(),
          details: { 
            suggestionCount: suggestions.length,
            totalValue: allocationData.breakdown.totalValue,
            vaultId: activeVaultId 
          }
        })
      }).catch(console.error);
    }
    
    return suggestions;
  }, [allocationData, user, activeVaultId]);

  // Check if rebalancing is needed
  const needsRebalancing = useMemo(() => {
    if (!allocationData?.breakdown?.byAsset) return false;
    
    const isNeeded = allocationVisualiserService.isRebalanceNeeded(allocationData.breakdown.byAsset);
    
    // Log rebalancing assessment
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'allocation-visualiser',
        userId: user?.id || undefined,
        action: 'rebalance_assessment',
        timestamp: new Date().toISOString(),
        details: { 
          needsRebalancing: isNeeded,
          assetCount: allocationData.breakdown.byAsset.length,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);
    
    return isNeeded;
  }, [allocationData, user, activeVaultId]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Allocation Visualiser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Allocation Visualiser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Failed to load allocation data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!allocationData || pieChartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Allocation Visualiser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PieChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No portfolio allocations to display</p>
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
            Allocation Visualiser
            <Badge variant="secondary" className="text-xs">
              {allocationData.breakdown.byAsset.length} Assets
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Updated {allocationData.breakdown.lastUpdated 
              ? new Date(allocationData.breakdown.lastUpdated).toLocaleTimeString()
              : 'Unknown'}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <div className="text-2xl font-bold">
              {allocationVisualiserService.formatCurrency(allocationData.breakdown.totalValue)}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Asset Count</span>
            </div>
            <div className="text-2xl font-bold">{allocationData.breakdown.byAsset.length}</div>
          </div>
        </div>

        {/* Portfolio Health */}
        <div className="mb-6">
          <PortfolioHealth items={allocationData.breakdown.byAsset} />
        </div>

        {/* Donut Chart */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Legend */}
        <CustomLegend data={pieChartData} />

        {/* Allocation Details */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium">Allocation Details</h4>
          <div className="grid grid-cols-1 gap-3">
            {allocationData.breakdown.byAsset.map((item, index) => (
              <AllocationItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Rebalance Suggestions */}
        {needsRebalancing && rebalanceSuggestions.length > 0 && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-900">Rebalancing Suggestions</span>
            </div>
            <div className="space-y-2">
              {rebalanceSuggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{suggestion.asset}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.action}
                    </Badge>
                  </div>
                  <div className="text-orange-700 font-medium">
                    {allocationVisualiserService.formatCurrency(suggestion.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {allocationData.recommendations && allocationData.recommendations.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-medium">Recommendations</h4>
            <div className="space-y-2">
              {allocationData.recommendations.map((rec, index) => (
                <div key={rec.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'
                    }>
                      {rec.priority} priority
                    </Badge>
                    <span className="text-xs text-muted-foreground">{rec.type}</span>
                  </div>
                  <div className="text-sm">{rec.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">{rec.suggestedAction}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllocationVisualiserPanel; 