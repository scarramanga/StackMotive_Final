import React, { useState, useEffect } from 'react';
// import { PanelAnimator } from '@/components/ui/panel-animator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, RefreshCw, Activity } from 'lucide-react';

interface MacroIndicator {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  importance: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

interface MacroInsight {
  id: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  relevance: number;
  aiConfidence: number;
  category: string;
  createdAt: string;
}

interface MacroAlert {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  indicator: string;
  threshold: number;
  currentValue: number;
  triggeredAt: string;
}

interface MacroMonitorAgentProps {
  userId: string;
}

export const MacroMonitorAgent: React.FC<MacroMonitorAgentProps> = ({ userId }) => {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [insights, setInsights] = useState<MacroInsight[]>([]);
  const [alerts, setAlerts] = useState<MacroAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchMacroData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMacroData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchMacroData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/macro/insights/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch macro data');
      const data = await response.json();
      
      setIndicators(data.indicators || []);
      setInsights(data.insights || []);
      setAlerts(data.alerts || []);
      setLastRefresh(new Date());
      
      // Log to Agent Memory
      await fetch('/api/agent-memory/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'VIEW_MACRO_MONITOR',
          blockId: 8,
          data: { 
            indicatorsCount: data.indicators?.length || 0,
            insightsCount: data.insights?.length || 0,
            alertsCount: data.alerts?.length || 0
          }
        })
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load macro data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      const response = await fetch(`/api/macro/refresh/${userId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to refresh data');
      
      // Log to Agent Memory
      await fetch('/api/agent-memory/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'REFRESH_MACRO_DATA',
          blockId: 8,
          data: { timestamp: new Date().toISOString() }
        })
      });
      
      await fetchMacroData();
    } catch (err) {
      console.error('Failed to refresh macro data:', err);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Mock chart data for demonstration
  const chartData = [
    { date: '2023-01', fedRate: 0.25, cpi: 2.1, vix: 18.5 },
    { date: '2023-02', fedRate: 0.50, cpi: 2.3, vix: 20.2 },
    { date: '2023-03', fedRate: 0.75, cpi: 2.8, vix: 22.1 },
    { date: '2023-04', fedRate: 1.00, cpi: 3.2, vix: 19.8 },
    { date: '2023-05', fedRate: 1.25, cpi: 3.1, vix: 17.9 },
    { date: '2023-06', fedRate: 1.50, cpi: 2.9, vix: 16.2 },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Macro Monitor Agent
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && indicators.length === 0 ? (
            <div className="text-center py-8">Loading macro data...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">Error: {error}</div>
          ) : (
            <div className="space-y-6">
              {/* Alerts Section */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Active Alerts
                  </h3>
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <strong>{alert.indicator}:</strong> {alert.message}
                          </div>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Key Indicators Grid */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Key Economic Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {indicators.map((indicator) => (
                    <Card key={indicator.name} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{indicator.name}</div>
                        {getTrendIcon(indicator.trend)}
                      </div>
                      <div className="text-2xl font-bold">{indicator.value.toFixed(2)}</div>
                      <div className={`text-sm ${indicator.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)} 
                        ({indicator.changePercent >= 0 ? '+' : ''}{indicator.changePercent.toFixed(1)}%)
                      </div>
                      <div className="mt-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            indicator.importance === 'high' ? 'bg-red-100 text-red-800' :
                            indicator.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {indicator.importance} priority
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Trend Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Economic Trends</h3>
                <Card className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="fedRate" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Fed Funds Rate (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cpi" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="CPI (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="vix" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          name="VIX"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* AI Insights */}
              <div>
                <h3 className="text-lg font-semibold mb-4">AI Market Insights</h3>
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{insight.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={getImpactColor(insight.impact)}
                            >
                              {insight.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Relevance: {insight.relevance}%</span>
                            <span>AI Confidence: {insight.aiConfidence}%</span>
                            <span>Category: {insight.category}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-xs text-gray-500 mb-1">Relevance</div>
                          <Progress value={insight.relevance} className="w-20" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Strategy Impact Summary */}
              <Card className="p-4 bg-blue-50">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Strategy Impact Summary</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Based on current macro conditions, here are the key strategic considerations:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Rising rates may favor defensive positions and shorter duration assets</li>
                  <li>• Elevated VIX suggests increased allocation to volatility hedges</li>
                  <li>• CPI trends indicate potential commodity exposure opportunities</li>
                  <li>• DXY strength may impact international equity allocations</li>
                </ul>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MacroMonitorAgent; 