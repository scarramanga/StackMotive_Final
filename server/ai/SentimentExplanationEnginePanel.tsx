import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Brain, TrendingUp, TrendingDown, BarChart3, Filter, Info, RefreshCw, Eye, Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { sentimentExplanationEngineService } from '../../services/sentimentExplanationEngineService';

interface SentimentPoint {
  timestamp: string;
  assetSentiment: number;
  overlaySentiment: number;
  asset: string;
  overlay: string;
  explanation: string;
  drivers: string[];
  confidenceLevel: number;
  marketEvents: string[];
}

interface SentimentExplanation {
  id: string;
  timestamp: string;
  asset: string;
  overlay: string;
  sentimentScore: number;
  previousScore: number;
  changePercent: number;
  explanation: string;
  drivers: {
    macro: number;
    news: number;
    technical: number;
    flow: number;
  };
  rationale: string;
  confidence: number;
  impactLevel: 'high' | 'medium' | 'low';
  relatedEvents: string[];
}

interface SentimentData {
  timeSeries: SentimentPoint[];
  explanations: SentimentExplanation[];
  assets: string[];
  overlays: string[];
  lastUpdated: string;
  summary: {
    averageAssetSentiment: number;
    averageOverlaySentiment: number;
    volatilityIndex: number;
    trendDirection: 'bullish' | 'bearish' | 'neutral';
  };
}

export const SentimentExplanationEnginePanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [overlayFilter, setOverlayFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [selectedPoint, setSelectedPoint] = useState<SentimentPoint | null>(null);
  const [showComparison, setShowComparison] = useState(true);

  // User data for logging
  const userId = (user as any)?.id || '1';
  const vaultId = activeVaultId || undefined;

  // Fetch sentiment data
  const { data: sentimentData, isLoading, error, refetch } = useQuery<SentimentData>({
    queryKey: ['/api/sentiment/explanations', activeVaultId, timeRange, assetFilter, overlayFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(activeVaultId && { vaultId: activeVaultId }),
        timeRange,
        ...(assetFilter !== 'all' && { asset: assetFilter }),
        ...(overlayFilter !== 'all' && { overlay: overlayFilter }),
      });
      
      const res = await fetch(`/api/sentiment/explanations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sentiment data');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 60000, // Update every minute
  });

  // Handle time range change with logging
  const handleTimeRangeChange = async (value: string) => {
    setTimeRange(value);
    
    await sentimentExplanationEngineService.logAgentMemory('filter_changed', {
      userId, vaultId,
      metadata: { filterType: 'timeRange', filterValue: value, previousValue: timeRange }
    });
  };

  // Handle asset filter change with logging
  const handleAssetFilterChange = async (value: string) => {
    setAssetFilter(value);
    
    await sentimentExplanationEngineService.logAgentMemory('filter_changed', {
      userId, vaultId,
      metadata: { filterType: 'asset', filterValue: value, previousValue: assetFilter }
    });
  };

  // Handle overlay filter change with logging
  const handleOverlayFilterChange = async (value: string) => {
    setOverlayFilter(value);
    
    await sentimentExplanationEngineService.logAgentMemory('filter_changed', {
      userId, vaultId,
      metadata: { filterType: 'overlay', filterValue: value, previousValue: overlayFilter }
    });
  };

  // Handle chart type change with logging
  const handleChartTypeChange = async (value: 'area' | 'line') => {
    setChartType(value);
    
    await sentimentExplanationEngineService.logAgentMemory('chart_type_changed', {
      userId, vaultId,
      metadata: { newChartType: value, previousChartType: chartType }
    });
  };

  // Handle comparison toggle with logging
  const handleComparisonToggle = async () => {
    const newValue = !showComparison;
    setShowComparison(newValue);
    
    await sentimentExplanationEngineService.logAgentMemory('comparison_toggled', {
      userId, vaultId,
      metadata: { showComparison: newValue }
    });
  };

  // Handle manual refresh with logging
  const handleRefresh = async () => {
    refetch();
    
    await sentimentExplanationEngineService.logAgentMemory('data_refreshed', {
      userId, vaultId,
      metadata: { refreshType: 'manual', timeRange, activeFilters: { asset: assetFilter, overlay: overlayFilter } }
    });
  };

  // Handle point click with logging
  const handlePointClick = async (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const point = data.activePayload[0].payload;
      setSelectedPoint(point);
      
      await sentimentExplanationEngineService.logAgentMemory('point_selected', {
        userId, vaultId,
        metadata: { 
          asset: point.asset, 
          overlay: point.overlay, 
          timestamp: point.timestamp,
          assetSentiment: point.assetSentiment,
          overlaySentiment: point.overlaySentiment
        }
      });
    }
  };

  // Process chart data
  const chartData = useMemo(() => {
    if (!sentimentData?.timeSeries) return [];
    
    return sentimentData.timeSeries.map(point => ({
      time: new Date(point.timestamp).toLocaleDateString(),
      timestamp: point.timestamp,
      assetSentiment: point.assetSentiment,
      overlaySentiment: point.overlaySentiment,
      asset: point.asset,
      overlay: point.overlay,
      explanation: point.explanation,
      drivers: point.drivers,
      confidence: point.confidenceLevel,
      marketEvents: point.marketEvents,
    }));
  }, [sentimentData]);

  // Process recent explanations
  const recentExplanations = useMemo(() => {
    if (!sentimentData?.explanations) return [];
    
    return sentimentData.explanations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [sentimentData]);

  // Get sentiment color
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.6) return '#10b981'; // Green
    if (sentiment >= 0.4) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Get sentiment badge
  const getSentimentBadge = (sentiment: number) => {
    if (sentiment >= 0.6) return <Badge className="bg-green-100 text-green-800">Bullish</Badge>;
    if (sentiment >= 0.4) return <Badge className="bg-yellow-100 text-yellow-800">Neutral</Badge>;
    return <Badge className="bg-red-100 text-red-800">Bearish</Badge>;
  };

  // Get impact level badge
  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low Impact</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{impact}</Badge>;
    }
  };

  // Get driver badge
  const getDriverBadge = (driver: string, value: number) => {
    const intensity = value > 0.7 ? 'high' : value > 0.4 ? 'medium' : 'low';
    const colorClass = intensity === 'high' ? 'bg-red-100 text-red-800' : 
                      intensity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800';
    
    return (
      <Badge className={`${colorClass} text-xs`}>
        {driver}: {(value * 100).toFixed(0)}%
      </Badge>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Asset Sentiment:</span>
              <span className={`text-sm font-medium`} style={{ color: getSentimentColor(data.assetSentiment) }}>
                {(data.assetSentiment * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Overlay Sentiment:</span>
              <span className={`text-sm font-medium`} style={{ color: getSentimentColor(data.overlaySentiment) }}>
                {(data.overlaySentiment * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <span className="text-sm font-medium">{(data.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Click for details</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading sentiment data: {error.message}
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
            <Brain className="h-5 w-5" />
            Sentiment Explanation Engine
            <Badge variant="secondary" className="text-xs">
              {chartData.length} points
            </Badge>
            {sentimentData?.summary && (
              <Badge className={`text-xs ${
                sentimentData.summary.trendDirection === 'bullish' ? 'bg-green-100 text-green-800' :
                sentimentData.summary.trendDirection === 'bearish' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {sentimentData.summary.trendDirection}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Last: {sentimentData?.lastUpdated ? formatTimestamp(sentimentData.lastUpdated) : 'Never'}
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
          {sentimentData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{(sentimentData.summary.averageAssetSentiment * 100).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Avg Asset Sentiment</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{(sentimentData.summary.averageOverlaySentiment * 100).toFixed(0)}%</div>
                <div className="text-xs text-blue-600">Avg Overlay Sentiment</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{(sentimentData.summary.volatilityIndex * 100).toFixed(0)}%</div>
                <div className="text-xs text-purple-600">Volatility Index</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 capitalize">{sentimentData.summary.trendDirection}</div>
                <div className="text-xs text-green-600">Trend Direction</div>
              </div>
            </div>
          )}

          {/* Controls */}
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
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={assetFilter} onValueChange={handleAssetFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {sentimentData?.assets?.map(asset => (
                  <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={overlayFilter} onValueChange={handleOverlayFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Overlays</SelectItem>
                {sentimentData?.overlays?.map(overlay => (
                  <SelectItem key={overlay} value={overlay}>{overlay}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={handleChartTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleComparisonToggle}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showComparison ? 'Hide' : 'Show'} Comparison
            </Button>
          </div>

          {/* Sentiment Chart */}
          {isLoading ? (
            <div className="h-80 animate-pulse bg-muted rounded-lg flex items-center justify-center">
              <div className="text-muted-foreground">Loading sentiment data...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No sentiment data found</h3>
              <p className="text-muted-foreground">
                {assetFilter !== 'all' || overlayFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Sentiment data will appear here'}
              </p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} onClick={handlePointClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="assetSentiment" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name="Asset Sentiment"
                    />
                    {showComparison && (
                      <Area 
                        type="monotone" 
                        dataKey="overlaySentiment" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                        name="Overlay Sentiment"
                      />
                    )}
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} onClick={handlePointClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="assetSentiment" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      name="Asset Sentiment"
                    />
                    {showComparison && (
                      <Line 
                        type="monotone" 
                        dataKey="overlaySentiment" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                        name="Overlay Sentiment"
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Point Details */}
          {selectedPoint && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Sentiment Analysis</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatTimestamp(selectedPoint.timestamp)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Asset: {selectedPoint.asset}</div>
                  <div className="flex items-center gap-2">
                    {getSentimentBadge(selectedPoint.assetSentiment)}
                    <span className="text-sm font-medium">{(selectedPoint.assetSentiment * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Overlay: {selectedPoint.overlay}</div>
                  <div className="flex items-center gap-2">
                    {getSentimentBadge(selectedPoint.overlaySentiment)}
                    <span className="text-sm font-medium">{(selectedPoint.overlaySentiment * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Explanation</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedPoint.explanation}
                  </div>
                </div>
                
                {selectedPoint.drivers && selectedPoint.drivers.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Sentiment Drivers</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPoint.drivers.map(driver => (
                        <Badge key={driver} variant="outline" className="text-xs">
                          {driver}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedPoint.marketEvents && selectedPoint.marketEvents.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Market Events</div>
                    <div className="space-y-1">
                      {selectedPoint.marketEvents.map((event, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {event}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Explanations */}
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Sentiment Changes</h4>
            <div className="space-y-3">
              {recentExplanations.map((explanation) => (
                <div key={explanation.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{explanation.asset}</div>
                      <div className="text-sm text-muted-foreground">•</div>
                      <div className="text-sm text-muted-foreground">{explanation.overlay}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${
                        explanation.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {explanation.changePercent > 0 ? '+' : ''}{explanation.changePercent.toFixed(1)}%
                      </div>
                      {getImpactBadge(explanation.impactLevel)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {explanation.explanation}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {getDriverBadge('Macro', explanation.drivers.macro)}
                    {getDriverBadge('News', explanation.drivers.news)}
                    {getDriverBadge('Technical', explanation.drivers.technical)}
                    {getDriverBadge('Flow', explanation.drivers.flow)}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(explanation.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(explanation.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment Guide */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Sentiment Analysis Guide</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>Asset Sentiment:</strong> Overall market sentiment for the specific asset</div>
              <div>• <strong>Overlay Sentiment:</strong> Strategy-specific sentiment based on signals and performance</div>
              <div>• <strong>Drivers:</strong> Macro (economic), News (events), Technical (charts), Flow (institutional)</div>
              <div>• <strong>Bullish:</strong> 60%+ sentiment, <strong>Neutral:</strong> 40-59%, <strong>Bearish:</strong> &lt;40%</div>
              <div>• Click on chart points to see detailed explanations and market events</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentExplanationEnginePanel; 