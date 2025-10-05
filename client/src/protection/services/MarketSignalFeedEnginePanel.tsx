import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Settings,
  Loader2,
  SortAsc,
  SortDesc,
  Group,
  Monitor,
  Eye,
  CheckCircle,
  XCircle,
  Minus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface MarketSignal {
  id: string;
  type: 'momentum' | 'volatility' | 'volume' | 'sentiment' | 'technical' | 'economic' | 'arbitrage' | 'other';
  source: string;
  asset: string;
  overlay?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  threshold: number;
  currentValue: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  title: string;
  description: string;
  context: string;
  metadata: {
    timeframe: string;
    indicator: string;
    dataPoints: number;
    lastCalculated: string;
  };
  isActive: boolean;
  triggeredAt: string;
  expiresAt?: string;
  actions: Array<{
    type: 'buy' | 'sell' | 'hold' | 'alert';
    priority: number;
    message: string;
  }>;
}

interface SignalConfig {
  id: string;
  type: string;
  source: string;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  weights: {
    confidence: number;
    recency: number;
    volume: number;
  };
  enabled: boolean;
  parameters: Record<string, any>;
}

interface MarketSignalData {
  signals: MarketSignal[];
  config: SignalConfig[];
  summary: {
    total: number;
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    avgConfidence: number;
  };
  lastUpdated: string;
}

export const MarketSignalFeedEnginePanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'source' | 'severity'>('none');
  const [sortBy, setSortBy] = useState<'confidence' | 'severity' | 'time' | 'asset'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch market signals
  const { data: signalData, isLoading, error } = useQuery<MarketSignalData>({
    queryKey: ['/api/signals/live', activeVaultId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeVaultId) params.append('vaultId', activeVaultId);
      
      const res = await fetch(`/api/signals/live?${params}`);
      if (!res.ok) throw new Error('Failed to fetch market signals');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 15000,
  });

  // Fetch signal configuration
  const { data: configData } = useQuery<{ config: SignalConfig[] }>({
    queryKey: ['/api/signals/config', activeVaultId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeVaultId) params.append('vaultId', activeVaultId);
      
      const res = await fetch(`/api/signals/config?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signal config');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
  });

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/signals/live'] });
    queryClient.invalidateQueries({ queryKey: ['/api/signals/config'] });
  };

  // Filter and sort signals
  const filteredAndSortedSignals = React.useMemo(() => {
    if (!signalData?.signals) return [];

    let filtered = signalData.signals.filter(signal => {
      if (showActiveOnly && !signal.isActive) return false;
      if (searchTerm && !signal.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !signal.asset.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (typeFilter !== 'all' && signal.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && signal.source !== sourceFilter) return false;
      if (severityFilter !== 'all' && signal.severity !== severityFilter) return false;
      if (directionFilter !== 'all' && signal.direction !== directionFilter) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'severity':
          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'time':
          aValue = new Date(a.triggeredAt).getTime();
          bValue = new Date(b.triggeredAt).getTime();
          break;
        case 'asset':
          aValue = a.asset;
          bValue = b.asset;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [signalData?.signals, searchTerm, typeFilter, sourceFilter, severityFilter, directionFilter, showActiveOnly, sortBy, sortOrder]);

  // Group signals
  const groupedSignals = React.useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Signals': filteredAndSortedSignals };
    }

    const grouped: Record<string, MarketSignal[]> = {};
    
    filteredAndSortedSignals.forEach(signal => {
      let key: string;
      
      switch (groupBy) {
        case 'type':
          key = signal.type.charAt(0).toUpperCase() + signal.type.slice(1);
          break;
        case 'source':
          key = signal.source;
          break;
        case 'severity':
          key = signal.severity.charAt(0).toUpperCase() + signal.severity.slice(1);
          break;
        default:
          key = 'Other';
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(signal);
    });

    return grouped;
  }, [filteredAndSortedSignals, groupBy]);

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">CRITICAL</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">HIGH</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">MEDIUM</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">LOW</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{severity}</Badge>;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  // Get direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'momentum':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'volatility':
        return <Activity className="h-4 w-4 text-purple-600" />;
      case 'volume':
        return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'sentiment':
        return <Eye className="h-4 w-4 text-pink-600" />;
      case 'technical':
        return <Target className="h-4 w-4 text-orange-600" />;
      case 'economic':
        return <Monitor className="h-4 w-4 text-indigo-600" />;
      case 'arbitrage':
        return <Zap className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get unique sources and types
  const uniqueSources = React.useMemo(() => {
    if (!signalData?.signals) return [];
    return Array.from(new Set(signalData.signals.map(s => s.source)));
  }, [signalData?.signals]);

  const uniqueTypes = React.useMemo(() => {
    if (!signalData?.signals) return [];
    return Array.from(new Set(signalData.signals.map(s => s.type)));
  }, [signalData?.signals]);

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading market signals: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
            Loading market signals...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signalData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No signal data available
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
            <Activity className="h-5 w-5" />
            Market Signal Feed Engine
            <Badge className="bg-blue-100 text-blue-800">
              {signalData.summary.active} active
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {signalData.summary.critical}
              </div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {signalData.summary.high}
              </div>
              <div className="text-sm text-orange-700">High</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {signalData.summary.medium}
              </div>
              <div className="text-sm text-yellow-700">Medium</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {signalData.summary.low}
              </div>
              <div className="text-sm text-green-700">Low</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {signalData.summary.avgConfidence.toFixed(1)}%
              </div>
              <div className="text-sm text-blue-700">Avg Confidence</div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search signals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={groupBy} onValueChange={(value: 'none' | 'type' | 'source' | 'severity') => setGroupBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
                <SelectItem value="source">By Source</SelectItem>
                <SelectItem value="severity">By Severity</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'confidence' | 'severity' | 'time' | 'asset') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant={showActiveOnly ? "default" : "outline"}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              {showActiveOnly ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Active Only
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Signals List */}
          <div className="space-y-6">
            {Object.entries(groupedSignals).map(([groupName, signals]) => (
              <div key={groupName}>
                {groupBy !== 'none' && (
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Group className="h-5 w-5 text-muted-foreground" />
                    {groupName} ({signals.length})
                  </h3>
                )}
                
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <div 
                      key={signal.id} 
                      className={`border rounded-lg p-4 ${
                        signal.isActive ? 'border-l-4 border-l-blue-500' : 'border-dashed opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(signal.type)}
                            <span className="text-sm font-medium">{signal.type.toUpperCase()}</span>
                            {getSeverityBadge(signal.severity)}
                            {getDirectionIcon(signal.direction)}
                            <span className="text-xs text-muted-foreground">
                              {signal.source}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold mb-1">{signal.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{signal.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span className="font-medium">{signal.asset}</span>
                            </div>
                            {signal.overlay && (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  {signal.overlay}
                                </Badge>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(signal.triggeredAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="mb-2">
                            <div className="text-sm font-medium">
                              {signal.confidence.toFixed(1)}% confidence
                            </div>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${signal.confidence}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            <div>Value: {signal.currentValue.toFixed(2)}</div>
                            <div>Threshold: {signal.threshold.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {signal.actions.length > 0 && (
                        <div className="border-t pt-3">
                          <div className="flex flex-wrap gap-2">
                            {signal.actions.map((action, index) => (
                              <Badge 
                                key={index}
                                className={`text-xs ${
                                  action.type === 'buy' ? 'bg-green-100 text-green-800' :
                                  action.type === 'sell' ? 'bg-red-100 text-red-800' :
                                  action.type === 'hold' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {action.type.toUpperCase()}: {action.message}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Timeframe: {signal.metadata.timeframe}</span>
                          <span>Indicator: {signal.metadata.indicator}</span>
                          <span>Data Points: {signal.metadata.dataPoints}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredAndSortedSignals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No signals found matching your filters
            </div>
          )}

          {/* Information */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Signal Feed Information</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>Auto-refresh:</strong> Signal feed updates every 15 seconds</div>
              <div>• <strong>Confidence:</strong> Algorithmic certainty in signal accuracy (0-100%)</div>
              <div>• <strong>Severity:</strong> Impact assessment based on configured thresholds</div>
              <div>• <strong>Actions:</strong> Recommended trading actions based on signal type</div>
              <div>• <strong>Last Updated:</strong> {formatTime(signalData.lastUpdated)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketSignalFeedEnginePanel; 