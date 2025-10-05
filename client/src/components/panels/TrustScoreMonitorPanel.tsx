import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { 
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Eye,
  Scale,
  Droplets,
  Info,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import TrustScoreMonitorService, {
  useTrustScore,
  useTrustScoreState,
  useFilteredComponents,
  useFilteredAlerts,
  useTrustScoreInsights,
  useTrustScoreForecast,
  type TrustScoreComponent,
  type TrustScoreAlert
} from '../../services/trustScoreMonitorService';

// Component icon helper using service
const ComponentIcon: React.FC<{ category: string }> = ({ category }) => {
  switch (category) {
    case 'security': return <Shield className="h-4 w-4" />;
    case 'performance': return <TrendingUp className="h-4 w-4" />;
    case 'liquidity': return <Droplets className="h-4 w-4" />;
    case 'regulatory': return <Scale className="h-4 w-4" />;
    case 'transparency': return <Eye className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

// Alert icon helper using service
const AlertIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'score_drop': return <TrendingDown className="h-4 w-4" />;
    case 'threshold_breach': return <AlertTriangle className="h-4 w-4" />;
    case 'metric_failure': return <XCircle className="h-4 w-4" />;
    case 'trend_warning': return <AlertCircle className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
};

// Trend icon helper using service
const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  switch (trend) {
    case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
    case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
    default: return <Minus className="h-4 w-4 text-gray-600" />;
  }
};

export const TrustScoreMonitorPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // Using service hooks for data fetching and state management
  const {
    state,
    setTimeRange,
    setFilters,
    selectComponent,
    selectAlert
  } = useTrustScoreState();
  
  const { data: trustScoreData, isLoading, error } = useTrustScore(
    activeVaultId || '',
    user,
    state.timeRange
  );

  // Using service hooks for business logic
  const filteredComponents = useFilteredComponents(
    trustScoreData?.components || [],
    state.filters,
    state.sortBy,
    state.sortOrder
  );

  const filteredAlerts = useFilteredAlerts(
    trustScoreData?.alerts || [],
    state.filters,
    'severity',
    'desc'
  );

  const insights = useTrustScoreInsights(trustScoreData);
  const forecast = useTrustScoreForecast(trustScoreData?.history || []);

  // Event handlers using service
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value === 'all' ? undefined : value });
  };

  const handleComponentClick = (componentId: string) => {
    selectComponent(componentId);
  };

  const handleAlertClick = (alertId: string) => {
    selectAlert(alertId);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust Score Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="h-48 bg-muted rounded-lg"></div>
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
            <Shield className="h-5 w-5" />
            Trust Score Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <p className="text-red-600">Failed to load trust score data</p>
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
            <Shield className="h-5 w-5" />
            Trust Score Monitor
            {trustScoreData && (
              <Badge variant="outline" className={TrustScoreMonitorService.getStatusColor(TrustScoreMonitorService.getTrustScoreStatus(trustScoreData.overallScore))}>
                {trustScoreData.grade}
              </Badge>
            )}
          </div>
          <Select value={state.timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score */}
          {trustScoreData && (
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <div className="text-4xl font-bold mb-2">
                {trustScoreData.overallScore}
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Trust Score
              </div>
              <div className={`flex items-center justify-center gap-2 ${TrustScoreMonitorService.getChangeColor(trustScoreData.change)}`}>
                {trustScoreData.change > 0 ? <TrendingUp className="h-4 w-4" /> : 
                 trustScoreData.change < 0 ? <TrendingDown className="h-4 w-4" /> : 
                 <Minus className="h-4 w-4" />}
                <span className="text-sm">
                  {TrustScoreMonitorService.formatScoreChange(trustScoreData.change)} ({TrustScoreMonitorService.formatPercentageChange(trustScoreData.changePercentage)})
                </span>
              </div>
            </div>
          )}

          {/* Forecast */}
          {forecast && (
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Score Forecast</h3>
                <Badge variant="outline" className={TrustScoreMonitorService.getTrendColor(forecast.trend)}>
                  <TrendIcon trend={forecast.trend} />
                  {forecast.trend}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Projected Score:</span>
                <span className="font-medium">{forecast.forecastScore.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Confidence:</span>
                <span className="font-medium">{forecast.confidence.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Active Alerts */}
          {filteredAlerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Active Alerts</h3>
                <Badge variant="outline" className="text-red-600">
                  {filteredAlerts.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredAlerts.slice(0, 5).map((alert: TrustScoreAlert) => (
                  <div
                    key={alert.id}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleAlertClick(alert.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={TrustScoreMonitorService.getAlertSeverityColor(alert.severity)}>
                          <AlertIcon type={alert.type} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{alert.title}</div>
                          <div className="text-xs text-muted-foreground">{alert.message}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {TrustScoreMonitorService.formatRelativeTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={state.filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="liquidity">Liquidity</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
                <SelectItem value="transparency">Transparency</SelectItem>
              </SelectContent>
            </Select>

            <Select value={state.filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={state.filters.severity || 'all'} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredComponents.map((component: TrustScoreComponent) => {
              const health = TrustScoreMonitorService.calculateComponentHealth(component);
              const score = (component.score / component.maxScore) * 100;
              
              return (
                <div
                  key={component.id}
                  className="p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleComponentClick(component.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ComponentIcon category={component.category} />
                      <div>
                        <div className="font-medium">{component.name}</div>
                        <div className="text-sm text-muted-foreground">{component.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{score.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Health:</span>
                      <Badge variant="outline" className={
                        health.health === 'healthy' ? 'text-green-600' :
                        health.health === 'warning' ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {health.health}
                      </Badge>
                    </div>
                    
                    <Progress value={score} className="h-2" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{component.score} / {component.maxScore}</span>
                      <span>Weight: {component.weight}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insights */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths
                </h3>
                <ul className="space-y-1">
                  {insights.strengths.map((strength: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-1">
                  {insights.weaknesses.map((weakness: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustScoreMonitorPanel; 