import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { 
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  DollarSign,
  BarChart3,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  useMacroIndicators, 
  useAlertStatus,
  macroMonitorAgentService,
  type MacroIndicatorFilters 
} from '../../services/macroMonitorAgentService';

export const MacroMonitorAgentPanel: React.FC = () => {
  const { user } = useAuth();
  
  // State for UI controls
  const [timeRange, setTimeRange] = useState('1d');
  const [filters, setFilters] = useState<MacroIndicatorFilters>({
    category: 'all',
    alertLevel: 'all',
    significance: 'all',
    search: ''
  });

  // Fetch macro indicators and alerts using service
  const { data: indicatorsData, isLoading: loadingIndicators, error: indicatorsError } = useMacroIndicators(timeRange, user, filters);
  const { data: alertsData, isLoading: loadingAlerts, error: alertsError } = useAlertStatus(user);

  // Process indicators using service
  const processedIndicators = useMemo(() => {
    if (!indicatorsData?.indicators) return [];
    return macroMonitorAgentService.sortIndicators(indicatorsData.indicators, 'alertLevel', 'desc');
  }, [indicatorsData]);

  // Calculate summary stats using service
  const summaryStats = useMemo(() => {
    if (!processedIndicators.length) return null;
    return macroMonitorAgentService.calculateSummaryStats(processedIndicators);
  }, [processedIndicators]);

  // Calculate risk assessment using service
  const riskAssessment = useMemo(() => {
    if (!summaryStats) return null;
    return macroMonitorAgentService.calculateRiskAssessment(summaryStats);
  }, [summaryStats]);

  // Get system status using service
  const systemStatus = useMemo(() => {
    if (!processedIndicators.length) return null;
    return macroMonitorAgentService.generateSystemStatus(processedIndicators);
  }, [processedIndicators]);

  // Handle filter changes
  const handleFilterChange = (key: keyof MacroIndicatorFilters, value: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'macro-monitor-agent',
        userId: user?.id || undefined,
        action: 'filter_change',
        timestamp: new Date().toISOString(),
        details: { filterKey: key, filterValue: value, timeRange }
      })
    }).catch(console.error);
    
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? undefined : value }));
  };

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'macro-monitor-agent',
        userId: user?.id || undefined,
        action: 'time_range_change',
        timestamp: new Date().toISOString(),
        details: { timeRange: value }
      })
    }).catch(console.error);
    
    setTimeRange(value);
  };

  // Handle indicator click
  const handleIndicatorClick = (indicatorId: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'macro-monitor-agent',
        userId: user?.id || undefined,
        action: 'indicator_view',
        timestamp: new Date().toISOString(),
        details: { indicatorId }
      })
    }).catch(console.error);
  };

  // Get icon component for trend
  const getTrendIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (changePercent < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  // Get alert icon component
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'hot': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'calm': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get category icon component
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'monetary': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'economic': return <BarChart3 className="h-4 w-4 text-blue-600" />;
      case 'market': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'currency': return <Globe className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Loading state
  if (loadingIndicators || loadingAlerts) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Macro Monitor Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (indicatorsError || alertsError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Macro Monitor Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <p className="text-red-600">Failed to load macro indicators</p>
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
            Macro Monitor Agent
            <Badge variant="secondary" className="text-xs">
              {processedIndicators.length} indicators
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="1w">1 Week</SelectItem>
                <SelectItem value="1m">1 Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* System Status */}
          {systemStatus && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemStatus.status === 'healthy' ? 'bg-green-500' :
                    systemStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium">System Status</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Uptime: {systemStatus.uptime}
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {systemStatus.message}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summaryStats.hot}</div>
                <div className="text-xs text-muted-foreground">Hot Alerts</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.warning}</div>
                <div className="text-xs text-muted-foreground">Warning Alerts</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summaryStats.calm}</div>
                <div className="text-xs text-muted-foreground">Calm Indicators</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{summaryStats.recentChanges}</div>
                <div className="text-xs text-muted-foreground">Recent Changes</div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {riskAssessment && (
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Risk Assessment</h3>
                <Badge variant="outline" className={
                  riskAssessment.riskLevel === 'low' ? 'text-green-600' :
                  riskAssessment.riskLevel === 'medium' ? 'text-yellow-600' :
                  riskAssessment.riskLevel === 'high' ? 'text-orange-600' : 'text-red-600'
                }>
                  {riskAssessment.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {riskAssessment.description}
              </div>
              <div className="text-xs text-muted-foreground">
                Risk Score: {riskAssessment.riskScore}/100
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="monetary">Monetary</SelectItem>
                <SelectItem value="economic">Economic</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.alertLevel || 'all'} onValueChange={(value) => handleFilterChange('alertLevel', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="calm">Calm</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.significance || 'all'} onValueChange={(value) => handleFilterChange('significance', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Significance</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search indicators..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-48"
            />
          </div>

          {/* Indicators List */}
          {processedIndicators.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No indicators found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processedIndicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleIndicatorClick(indicator.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(indicator.category)}
                      <div>
                        <div className="font-medium">{indicator.name}</div>
                        <div className="text-sm text-muted-foreground">{indicator.symbol}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-mono text-sm">
                          {macroMonitorAgentService.formatValue(indicator.currentValue, indicator.unit)}
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${macroMonitorAgentService.getChangeColor(indicator.changePercent)}`}>
                          {getTrendIcon(indicator.changePercent)}
                          {macroMonitorAgentService.formatChangePercent(indicator.changePercent)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={macroMonitorAgentService.getAlertBadgeClass(indicator.alertLevel)}>
                          {getAlertIcon(indicator.alertLevel)}
                          {indicator.alertLevel.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={
                          indicator.significance === 'high' ? 'text-red-600' :
                          indicator.significance === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }>
                          {indicator.significance}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>{indicator.description}</div>
                      <div>Updated: {macroMonitorAgentService.formatRelativeTime(indicator.lastUpdated)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 