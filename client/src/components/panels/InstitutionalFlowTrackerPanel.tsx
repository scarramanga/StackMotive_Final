import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { institutionalFlowTrackerService } from '../../services/institutionalFlowTrackerService';

interface InstitutionalFlow {
  id: string;
  timestamp: string;
  type: 'in' | 'out';
  asset: string;
  value: number;
  exchange: string;
  source: string;
  isLarge: boolean;
  confidence: number;
  transactionHash?: string;
  walletAddress?: string;
  description: string;
  category: 'purchase' | 'sale' | 'transfer' | 'staking' | 'withdrawal';
}

interface FlowSummary {
  total24h: number;
  netFlow24h: number;
  inflow24h: number;
  outflow24h: number;
  largeFlows24h: number;
  topAssets: Array<{
    asset: string;
    netFlow: number;
    inflow: number;
    outflow: number;
  }>;
  topExchanges: Array<{
    exchange: string;
    netFlow: number;
    inflow: number;
    outflow: number;
  }>;
}

interface FlowTrendPoint {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  volume: number;
}

interface InstitutionalFlowData {
  flows: InstitutionalFlow[];
  summary: FlowSummary;
  trendData: FlowTrendPoint[];
  assets: string[];
  exchanges: string[];
  lastUpdated: string;
}

export const InstitutionalFlowTrackerPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [showLargeOnly, setShowLargeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'timestamp' | 'value'>('timestamp');

  // User data for logging
  const userId = (user as any)?.id || '1';
  const vaultId = activeVaultId || undefined;

  // Fetch institutional flow data
  const { data: flowData, isLoading, error, refetch } = useQuery<InstitutionalFlowData>({
    queryKey: ['/api/flow/institutional', activeVaultId, timeRange, assetFilter, exchangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(activeVaultId && { vaultId: activeVaultId }),
        timeRange,
        ...(assetFilter !== 'all' && { asset: assetFilter }),
        ...(exchangeFilter !== 'all' && { exchange: exchangeFilter }),
      });
      
      const res = await fetch(`/api/flow/institutional?${params}`);
      if (!res.ok) throw new Error('Failed to fetch institutional flow data');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 30000,
  });

  // Handler functions with logging
  const handleTimeRangeChange = async (value: string) => {
    setTimeRange(value);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'timeRange', filterValue: value, previousValue: timeRange }
    });
  };

  const handleAssetFilterChange = async (value: string) => {
    setAssetFilter(value);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'asset', filterValue: value, previousValue: assetFilter }
    });
  };

  const handleExchangeFilterChange = async (value: string) => {
    setExchangeFilter(value);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'exchange', filterValue: value, previousValue: exchangeFilter }
    });
  };

  const handleTypeFilterChange = async (value: string) => {
    setTypeFilter(value);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'type', filterValue: value, previousValue: typeFilter }
    });
  };

  const handleSortByChange = async (value: 'timestamp' | 'value') => {
    setSortBy(value);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'sortBy', filterValue: value, previousValue: sortBy }
    });
  };

  const handleShowLargeOnlyChange = async (checked: boolean) => {
    setShowLargeOnly(checked);
    await institutionalFlowTrackerService.logAgentMemory('filter_changed', {
      userId, vaultId, metadata: { filterType: 'showLargeOnly', filterValue: checked, previousValue: showLargeOnly }
    });
  };

  const handleRefresh = async () => {
    refetch();
    await institutionalFlowTrackerService.logAgentMemory('data_refreshed', {
      userId, vaultId, metadata: { refreshType: 'manual', timeRange, activeFilters: { asset: assetFilter, exchange: exchangeFilter, type: typeFilter } }
    });
  };

  // Process and filter flows
  const filteredFlows = useMemo(() => {
    if (!flowData?.flows) return [];
    
    let filtered = flowData.flows;
    
    // Apply filters
    if (typeFilter !== 'all') {
      filtered = filtered.filter(flow => flow.type === typeFilter);
    }
    
    if (showLargeOnly) {
      filtered = filtered.filter(flow => flow.isLarge);
    }
    
    // Sort flows
    return filtered.sort((a, b) => {
      if (sortBy === 'timestamp') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else {
        return b.value - a.value;
      }
    });
  }, [flowData, typeFilter, showLargeOnly, sortBy]);

  // Process trend data for chart
  const trendChartData = useMemo(() => {
    if (!flowData?.trendData) return [];
    
    return flowData.trendData.map(point => ({
      date: new Date(point.date).toLocaleDateString(),
      inflow: point.inflow / 1000000, // Convert to millions
      outflow: point.outflow / 1000000,
      netFlow: point.netFlow / 1000000,
      volume: point.volume / 1000000,
    }));
  }, [flowData]);

  // Get flow type badge
  const getFlowTypeBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-green-100 text-green-800">Inflow</Badge>;
      case 'out':
        return <Badge className="bg-red-100 text-red-800">Outflow</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{type}</Badge>;
    }
  };

  // Get flow type icon
  const getFlowTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'purchase':
        return <Badge className="bg-blue-100 text-blue-800">Purchase</Badge>;
      case 'sale':
        return <Badge className="bg-orange-100 text-orange-800">Sale</Badge>;
      case 'transfer':
        return <Badge className="bg-purple-100 text-purple-800">Transfer</Badge>;
      case 'staking':
        return <Badge className="bg-green-100 text-green-800">Staking</Badge>;
      case 'withdrawal':
        return <Badge className="bg-red-100 text-red-800">Withdrawal</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{category}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{entry.name}:</span>
                <span className="text-sm font-medium" style={{ color: entry.color }}>
                  ${entry.value.toFixed(1)}M
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading institutional flow data: {error.message}
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
            <Building2 className="h-5 w-5" />
            Institutional Flow Tracker
            <Badge variant="secondary" className="text-xs">
              {filteredFlows.length} flows
            </Badge>
                         {flowData?.summary?.largeFlows24h && flowData.summary.largeFlows24h > 0 && (
               <Badge className="bg-orange-100 text-orange-800 text-xs">
                 {flowData?.summary?.largeFlows24h} large
               </Badge>
             )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Last: {flowData?.lastUpdated ? formatTimestamp(flowData.lastUpdated) : 'Never'}
            </div>
            <RefreshCw 
              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary"
              onClick={handleRefresh}
            />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          {flowData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{formatCurrency(flowData.summary.total24h)}</div>
                <div className="text-xs text-muted-foreground">24h Volume</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(flowData.summary.inflow24h)}</div>
                <div className="text-xs text-green-600">Inflow</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(flowData.summary.outflow24h)}</div>
                <div className="text-xs text-red-600">Outflow</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className={`text-2xl font-bold ${flowData.summary.netFlow24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(flowData.summary.netFlow24h))}
                </div>
                <div className="text-xs text-blue-600">Net Flow</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{flowData.summary.largeFlows24h}</div>
                <div className="text-xs text-orange-600">Large Flows</div>
              </div>
            </div>
          )}

          {/* Flow Trend Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Flow Volume Trend</h4>
            {trendChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="inflow" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Inflow"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="outflow" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Outflow"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netFlow" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Net Flow"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <div className="text-muted-foreground">No trend data available</div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={assetFilter} onValueChange={handleAssetFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {flowData?.assets?.map(asset => (
                  <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={exchangeFilter} onValueChange={handleExchangeFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exchanges</SelectItem>
                {flowData?.exchanges?.map(exchange => (
                  <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Inflow</SelectItem>
                <SelectItem value="out">Outflow</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={handleSortByChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">Sort by Time</SelectItem>
                <SelectItem value="value">Sort by Value</SelectItem>
              </SelectContent>
            </Select>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showLargeOnly}
                onChange={(e) => handleShowLargeOnlyChange(e.target.checked)}
                className="rounded"
              />
              Large flows only
            </label>
          </div>

          {/* Flow Events Table */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No institutional flows found</h3>
              <p className="text-muted-foreground">
                {assetFilter !== 'all' || exchangeFilter !== 'all' || typeFilter !== 'all' || showLargeOnly
                  ? 'Try adjusting your filters'
                  : 'Institutional flow data will appear here'}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 border-b border-border">
                <div className="grid grid-cols-7 gap-4 p-3 text-sm font-medium">
                  <div>Timestamp</div>
                  <div>Type</div>
                  <div>Asset</div>
                  <div>Value</div>
                  <div>Exchange</div>
                  <div>Source</div>
                  <div>Category</div>
                </div>
              </div>
              
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {filteredFlows.map((flow) => (
                  <div 
                    key={flow.id} 
                    className={`grid grid-cols-7 gap-4 p-3 hover:bg-muted/50 transition-colors ${
                      flow.isLarge ? 'bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="text-sm">
                      <div className="font-medium">{formatTimestamp(flow.timestamp)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(flow.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getFlowTypeIcon(flow.type)}
                      {getFlowTypeBadge(flow.type)}
                    </div>
                    
                    <div className="font-medium">{flow.asset}</div>
                    
                    <div className="text-sm">
                      <div className={`font-bold ${flow.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(flow.value)}
                      </div>
                      {flow.isLarge && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle className="h-3 w-3" />
                          Large
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium">{flow.exchange}</div>
                      <div className="text-xs text-muted-foreground">
                        {flow.confidence}% confidence
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium">{flow.source}</div>
                      {flow.walletAddress && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {flow.walletAddress.substring(0, 10)}...
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {getCategoryBadge(flow.category)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Assets and Exchanges */}
          {flowData?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Top Assets (24h)</h4>
                <div className="space-y-2">
                  {flowData.summary.topAssets.slice(0, 5).map((asset, index) => (
                    <div key={asset.asset} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                        <div className="font-medium">{asset.asset}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${asset.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(asset.netFlow))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(asset.inflow)} in / {formatCurrency(asset.outflow)} out
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Top Exchanges (24h)</h4>
                <div className="space-y-2">
                  {flowData.summary.topExchanges.slice(0, 5).map((exchange, index) => (
                    <div key={exchange.exchange} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                        <div className="font-medium">{exchange.exchange}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${exchange.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(exchange.netFlow))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(exchange.inflow)} in / {formatCurrency(exchange.outflow)} out
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Flow Analysis Guide */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Institutional Flow Analysis</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>Large Flows:</strong> Transactions above $10M are considered institutional-level</div>
              <div>• <strong>Inflow:</strong> Funds moving into exchanges/wallets (potential selling pressure)</div>
              <div>• <strong>Outflow:</strong> Funds moving out of exchanges (potential accumulation)</div>
              <div>• <strong>Net Flow:</strong> Positive = more inflow, Negative = more outflow</div>
              <div>• <strong>Sources:</strong> On-chain analysis, exchange APIs, and institutional reporting</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstitutionalFlowTrackerPanel; 