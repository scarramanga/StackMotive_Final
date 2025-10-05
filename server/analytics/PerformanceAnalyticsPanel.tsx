import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertTriangle, 
  Info,
  Target,
  Trophy,
  Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  usePerformanceAnalytics,
  performanceAnalyticsService
} from '../../services/performanceAnalyticsService';

export const PerformanceAnalyticsPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State for UI controls
  const [period, setPeriod] = useState('1y');
  const [activeChart, setActiveChart] = useState<'returns' | 'drawdown' | 'rollingVolatility' | 'monthlyReturns'>('returns');

  // Fetch performance analytics using service
  const { data: performanceData, isLoading, error } = usePerformanceAnalytics(activeVaultId || '', user, period);

  // Calculate performance grade using service
  const performanceGrade = useMemo(() => {
    if (!performanceData?.metrics) return null;
    return performanceAnalyticsService.generatePerformanceGrade(performanceData.metrics);
  }, [performanceData]);

  // Calculate benchmark comparison using service
  const benchmarkComparison = useMemo(() => {
    if (!performanceData?.metrics || !performanceData?.comparison?.benchmarkData) return null;
    return performanceAnalyticsService.compareWithBenchmark(
      performanceData.metrics, 
      performanceData.comparison.benchmarkData
    );
  }, [performanceData]);

  // Handle period change
  const handlePeriodChange = (value: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'performance-analytics',
        userId: user?.id || undefined,
        action: 'period_change',
        timestamp: new Date().toISOString(),
        details: { period: value, vaultId: activeVaultId }
      })
    }).catch(console.error);
    
    setPeriod(value);
  };

  // Handle chart change
  const handleChartChange = (chartType: 'returns' | 'drawdown' | 'rollingVolatility' | 'monthlyReturns') => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'performance-analytics',
        userId: user?.id || undefined,
        action: 'chart_view',
        timestamp: new Date().toISOString(),
        details: { chartType, vaultId: activeVaultId }
      })
    }).catch(console.error);
    
    setActiveChart(chartType);
  };

  // Handle metric click
  const handleMetricClick = (metricName: string) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'performance-analytics',
        userId: user?.id || undefined,
        action: 'metric_view',
        timestamp: new Date().toISOString(),
        details: { metricName, vaultId: activeVaultId }
      })
    }).catch(console.error);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
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
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <p className="text-red-600">Failed to load performance analytics</p>
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
            <BarChart3 className="h-5 w-5" />
            Performance Analytics
            {performanceGrade && (
              <Badge variant="outline" className={
                performanceGrade.grade === 'A' ? 'text-green-600' :
                performanceGrade.grade === 'B' ? 'text-blue-600' :
                performanceGrade.grade === 'C' ? 'text-yellow-600' :
                performanceGrade.grade === 'D' ? 'text-orange-600' : 'text-red-600'
              }>
                Grade: {performanceGrade.grade}
              </Badge>
            )}
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="2y">2 Years</SelectItem>
              <SelectItem value="5y">5 Years</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Performance Grade */}
          {performanceGrade && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium">Performance Grade</h3>
                </div>
                <div className="text-2xl font-bold">
                  {performanceGrade.score}/100
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {performanceGrade.description}
              </p>
            </div>
          )}

          {/* Key Metrics */}
          {performanceData?.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className="text-center p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleMetricClick('totalReturn')}
              >
                <div className={`text-2xl font-bold ${performanceAnalyticsService.getPerformanceColor(performanceData.metrics.totalReturnPercentage)}`}>
                  {performanceAnalyticsService.formatPercentage(performanceData.metrics.totalReturnPercentage)}
                </div>
                <div className="text-xs text-muted-foreground">Total Return</div>
              </div>
              
              <div 
                className="text-center p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleMetricClick('sharpeRatio')}
              >
                <div className={`text-2xl font-bold ${performanceAnalyticsService.getMetricColor(performanceData.metrics.sharpeRatio, 'efficiency')}`}>
                  {performanceAnalyticsService.formatRatio(performanceData.metrics.sharpeRatio)}
                </div>
                <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
              </div>
              
              <div 
                className="text-center p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleMetricClick('maxDrawdown')}
              >
                <div className={`text-2xl font-bold ${performanceAnalyticsService.getMetricColor(performanceData.metrics.maxDrawdown, 'drawdown')}`}>
                  {performanceAnalyticsService.formatPercentage(performanceData.metrics.maxDrawdown)}
                </div>
                <div className="text-xs text-muted-foreground">Max Drawdown</div>
              </div>
              
              <div 
                className="text-center p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleMetricClick('volatility')}
              >
                <div className={`text-2xl font-bold ${performanceAnalyticsService.getMetricColor(performanceData.metrics.volatility, 'risk')}`}>
                  {performanceAnalyticsService.formatPercentage(performanceData.metrics.volatility)}
                </div>
                <div className="text-xs text-muted-foreground">Volatility</div>
              </div>
            </div>
          )}

          {/* Benchmark Comparison */}
          {benchmarkComparison && performanceData?.comparison && (
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium">vs {performanceData.comparison.benchmark}</h3>
                </div>
                <div className={`text-lg font-bold ${performanceAnalyticsService.getPerformanceColor(benchmarkComparison.outperformance)}`}>
                  {performanceAnalyticsService.formatPercentage(benchmarkComparison.outperformance)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {benchmarkComparison.summary}
              </p>
            </div>
          )}

          {/* Chart Controls */}
          <div className="flex items-center gap-2 border-b border-border">
            {(['returns', 'drawdown', 'rollingVolatility', 'monthlyReturns'] as const).map((chartType) => (
              <button
                key={chartType}
                onClick={() => handleChartChange(chartType)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeChart === chartType
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {chartType === 'returns' && 'Returns'}
                {chartType === 'drawdown' && 'Drawdown'}
                {chartType === 'rollingVolatility' && 'Rolling Volatility'}
                {chartType === 'monthlyReturns' && 'Monthly Returns'}
              </button>
            ))}
          </div>

          {/* Performance Chart */}
          {performanceData?.charts && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'returns' && (
                  <LineChart data={performanceData.charts.returns.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    {performanceData.charts.returns.data[0]?.benchmark && (
                      <Line type="monotone" dataKey="benchmark" stroke="#64748b" strokeWidth={1} strokeDasharray="5 5" />
                    )}
                  </LineChart>
                )}
                
                {activeChart === 'drawdown' && (
                  <AreaChart data={performanceData.charts.drawdown.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </AreaChart>
                )}
                
                {activeChart === 'rollingVolatility' && (
                  <LineChart data={performanceData.charts.rollingVolatility.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                )}
                
                {activeChart === 'monthlyReturns' && (
                  <BarChart data={performanceData.charts.monthlyReturns.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Metrics */}
          {performanceData?.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Return Metrics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Annualized Return</span>
                    <span className={performanceAnalyticsService.getPerformanceColor(performanceData.metrics.annualizedReturn)}>
                      {performanceAnalyticsService.formatPercentage(performanceData.metrics.annualizedReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Alpha</span>
                    <span className={performanceAnalyticsService.getPerformanceColor(performanceData.metrics.alpha)}>
                      {performanceAnalyticsService.formatPercentage(performanceData.metrics.alpha)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Beta</span>
                    <span>{performanceAnalyticsService.formatRatio(performanceData.metrics.beta)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Win Rate</span>
                    <span className={performanceAnalyticsService.getMetricColor(performanceData.metrics.winRate, 'efficiency')}>
                      {performanceAnalyticsService.formatPercentage(performanceData.metrics.winRate)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Risk Metrics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sortino Ratio</span>
                    <span className={performanceAnalyticsService.getMetricColor(performanceData.metrics.sortinoRatio, 'efficiency')}>
                      {performanceAnalyticsService.formatRatio(performanceData.metrics.sortinoRatio)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Calmar Ratio</span>
                    <span className={performanceAnalyticsService.getMetricColor(performanceData.metrics.calmarRatio, 'efficiency')}>
                      {performanceAnalyticsService.formatRatio(performanceData.metrics.calmarRatio)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Profit Factor</span>
                    <span className={performanceAnalyticsService.getMetricColor(performanceData.metrics.profitFactor, 'efficiency')}>
                      {performanceAnalyticsService.formatRatio(performanceData.metrics.profitFactor)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Information Ratio</span>
                    <span className={performanceAnalyticsService.getMetricColor(performanceData.metrics.informationRatio, 'efficiency')}>
                      {performanceAnalyticsService.formatRatio(performanceData.metrics.informationRatio)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Metrics */}
          {performanceData?.riskMetrics && (
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium mb-3">Advanced Risk Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {performanceAnalyticsService.formatPercentage(performanceData.riskMetrics.var95)}
                  </div>
                  <div className="text-xs text-muted-foreground">VaR 95%</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {performanceAnalyticsService.formatPercentage(performanceData.riskMetrics.var99)}
                  </div>
                  <div className="text-xs text-muted-foreground">VaR 99%</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {performanceAnalyticsService.formatPercentage(performanceData.riskMetrics.expectedShortfall)}
                  </div>
                  <div className="text-xs text-muted-foreground">Expected Shortfall</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 