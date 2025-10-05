import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Rss, Search, Filter, ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, Clock, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { altSignalAggregatorService } from '../../services/altSignalAggregatorService';

interface AltSignal {
  id: string;
  source: string;
  asset: string;
  signalType: 'buy' | 'sell' | 'hold' | 'neutral';
  severity: 'strong' | 'moderate' | 'weak';
  timestamp: string;
  title: string;
  description: string;
  sourceLink?: string;
  explanation?: string;
  confidence: number;
  tags: string[];
  metadata: {
    author?: string;
    platform?: string;
    followers?: number;
    engagement?: number;
  };
}

interface AltSignalData {
  signals: AltSignal[];
  lastUpdated: string;
  sources: string[];
  totalSignals: number;
  signalsBySource: Record<string, number>;
  signalsBySeverity: Record<string, number>;
}

export const AltSignalAggregatorPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<string>('24h');

  // User data for logging
  const userId = (user as any)?.id || '1';
  const vaultId = activeVaultId || undefined;

  // Fetch alt signals
  const { data: signalData, isLoading, error, refetch } = useQuery<AltSignalData>({
    queryKey: ['/api/strategy/alt-signals', activeVaultId, timeRange],
    queryFn: async () => {
      const url = activeVaultId 
        ? `/api/strategy/alt-signals?vaultId=${activeVaultId}&timeRange=${timeRange}`
        : `/api/strategy/alt-signals?timeRange=${timeRange}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch alt signals');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 30000,
  });

  // Handle search with logging
  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    
    // Log agent memory for substantial searches (>2 characters)
    if (value.length > 2) {
      await altSignalAggregatorService.logAgentMemory('search_performed', {
        userId,
        vaultId,
        metadata: {
          searchTerm: value,
          searchLength: value.length
        }
      });
    }
  };

  // Handle time range change with logging
  const handleTimeRangeChange = async (value: string) => {
    setTimeRange(value);
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('signal_filtered', {
      userId,
      vaultId,
      metadata: {
        filterType: 'timeRange',
        filterValue: value,
        previousValue: timeRange
      }
    });
  };

  // Handle source filter change with logging
  const handleSourceFilterChange = async (value: string) => {
    setSourceFilter(value);
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('signal_filtered', {
      userId,
      vaultId,
      metadata: {
        filterType: 'source',
        filterValue: value,
        previousValue: sourceFilter
      }
    });
  };

  // Handle severity filter change with logging
  const handleSeverityFilterChange = async (value: string) => {
    setSeverityFilter(value);
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('signal_filtered', {
      userId,
      vaultId,
      metadata: {
        filterType: 'severity',
        filterValue: value,
        previousValue: severityFilter
      }
    });
  };

  // Handle manual refresh with logging
  const handleRefresh = async () => {
    refetch();
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('data_refreshed', {
      userId,
      vaultId,
      metadata: {
        refreshType: 'manual',
        timeRange,
        activeFilters: {
          source: sourceFilter,
          severity: severityFilter,
          search: searchTerm
        }
      }
    });
  };

  // Toggle expanded signal with logging
  const toggleExpanded = async (signalId: string) => {
    const newExpanded = new Set(expandedSignals);
    const isExpanding = !newExpanded.has(signalId);
    
    if (isExpanding) {
      newExpanded.add(signalId);
    } else {
      newExpanded.delete(signalId);
    }
    setExpandedSignals(newExpanded);
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('signal_expanded', {
      userId,
      vaultId,
      metadata: {
        signalId,
        action: isExpanding ? 'expanded' : 'collapsed'
      }
    });
  };

  // Handle external link click with logging
  const handleExternalLinkClick = async (signalId: string, sourceLink: string) => {
    window.open(sourceLink, '_blank');
    
    // Log agent memory
    await altSignalAggregatorService.logAgentMemory('source_link_clicked', {
      userId,
      vaultId,
      metadata: {
        signalId,
        sourceLink
      }
    });
  };

  // Filter and group signals
  const { filteredSignals, groupedSignals } = useMemo(() => {
    if (!signalData?.signals) return { filteredSignals: [], groupedSignals: {} };
    
    let filtered = signalData.signals;
    
    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(signal => 
        signal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(signal => signal.source === sourceFilter);
    }
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(signal => signal.severity === severityFilter);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Group by source
    const grouped = filtered.reduce((acc, signal) => {
      if (!acc[signal.source]) {
        acc[signal.source] = [];
      }
      acc[signal.source].push(signal);
      return acc;
    }, {} as Record<string, AltSignal[]>);
    
    return { filteredSignals: filtered, groupedSignals: grouped };
  }, [signalData, searchTerm, sourceFilter, severityFilter]);

  // Toggle expanded signal
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'strong':
        return <Badge className="bg-red-100 text-red-800">Strong</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
      case 'weak':
        return <Badge className="bg-blue-100 text-blue-800">Weak</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{severity}</Badge>;
    }
  };

  // Get signal type icon
  const getSignalTypeIcon = (signalType: string) => {
    switch (signalType) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'hold':
        return <div className="h-4 w-4 rounded-full bg-yellow-500" />;
      case 'neutral':
        return <div className="h-4 w-4 rounded-full bg-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get signal type badge
  const getSignalTypeBadge = (signalType: string) => {
    switch (signalType) {
      case 'buy':
        return <Badge className="bg-green-100 text-green-800">Buy</Badge>;
      case 'sell':
        return <Badge className="bg-red-100 text-red-800">Sell</Badge>;
      case 'hold':
        return <Badge className="bg-yellow-100 text-yellow-800">Hold</Badge>;
      case 'neutral':
        return <Badge className="bg-gray-100 text-gray-800">Neutral</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{signalType}</Badge>;
    }
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

  // Summary statistics
  const summaryStats = {
    total: filteredSignals.length,
    strong: filteredSignals.filter(s => s.severity === 'strong').length,
    moderate: filteredSignals.filter(s => s.severity === 'moderate').length,
    weak: filteredSignals.filter(s => s.severity === 'weak').length,
    sources: Object.keys(groupedSignals).length,
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading alt signals: {error.message}
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
            <Rss className="h-5 w-5" />
            Alt Signal Aggregator
            <Badge variant="secondary" className="text-xs">
              {summaryStats.total} signals
            </Badge>
            <Badge variant="outline" className="text-xs">
              {summaryStats.sources} sources
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Last updated: {signalData?.lastUpdated ? formatTimestamp(signalData.lastUpdated) : 'Never'}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{summaryStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Signals</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summaryStats.strong}</div>
              <div className="text-xs text-red-600">Strong</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summaryStats.moderate}</div>
              <div className="text-xs text-yellow-600">Moderate</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.weak}</div>
              <div className="text-xs text-blue-600">Weak</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summaryStats.sources}</div>
              <div className="text-xs text-green-600">Sources</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search signals, assets, or sources..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
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
            
            <Select value={sourceFilter} onValueChange={handleSourceFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {signalData?.sources?.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={handleSeverityFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="weak">Weak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Signals Feed */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : Object.keys(groupedSignals).length === 0 ? (
            <div className="text-center py-8">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No signals found</h3>
              <p className="text-muted-foreground">
                {searchTerm || sourceFilter !== 'all' || severityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Alternative signals will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSignals).map(([source, signals]) => (
                <div key={source} className="border border-border rounded-lg">
                  <div className="bg-muted/50 p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{source}</h3>
                        <Badge variant="outline" className="text-xs">
                          {signals.length} signals
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {signals.filter(s => s.severity === 'strong').length > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {signals.filter(s => s.severity === 'strong').length} strong
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-border">
                    {signals.map((signal) => (
                      <div key={signal.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getSignalTypeIcon(signal.signalType)}
                            <div>
                              <div className="font-medium">{signal.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {signal.asset} • {formatTimestamp(signal.timestamp)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(signal.severity)}
                            {getSignalTypeBadge(signal.signalType)}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {signal.description}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <div className="text-xs text-muted-foreground">Confidence:</div>
                              <div className="text-xs font-medium">{signal.confidence}%</div>
                            </div>
                            {signal.metadata.author && (
                              <div className="flex items-center gap-1">
                                <div className="text-xs text-muted-foreground">By:</div>
                                <div className="text-xs font-medium">{signal.metadata.author}</div>
                              </div>
                            )}
                            {signal.metadata.followers && (
                              <div className="flex items-center gap-1">
                                <div className="text-xs text-muted-foreground">Followers:</div>
                                <div className="text-xs font-medium">{signal.metadata.followers.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {signal.sourceLink && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExternalLinkClick(signal.id, signal.sourceLink!)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Source
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleExpanded(signal.id)}
                            >
                              {expandedSignals.has(signal.id) ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {expandedSignals.has(signal.id) && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <div className="space-y-3">
                              {signal.explanation && (
                                <div>
                                  <div className="text-sm font-medium mb-2">Explanation</div>
                                  <div className="text-sm text-muted-foreground">
                                    {signal.explanation}
                                  </div>
                                </div>
                              )}
                              
                              {signal.tags.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium mb-2">Tags</div>
                                  <div className="flex flex-wrap gap-1">
                                    {signal.tags.map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {signal.metadata.platform && (
                                <div>
                                  <div className="text-sm font-medium mb-2">Platform Details</div>
                                  <div className="text-sm text-muted-foreground">
                                    Platform: {signal.metadata.platform}
                                    {signal.metadata.engagement && (
                                      <span> • Engagement: {signal.metadata.engagement.toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Signal Sources Guide */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Signal Sources</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>TradingView:</strong> Technical analysis signals from top traders</div>
              <div>• <strong>Twitter/X:</strong> Social sentiment from crypto influencers</div>
              <div>• <strong>Glassnode:</strong> On-chain metrics and institutional flow data</div>
              <div>• <strong>News Feeds:</strong> Market-moving news and announcements</div>
              <div>• <strong>Severity Levels:</strong> Strong (high confidence), Moderate (medium confidence), Weak (low confidence)</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AltSignalAggregatorPanel; 