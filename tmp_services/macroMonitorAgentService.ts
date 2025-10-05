import { useQuery } from '@tanstack/react-query';

// Types for Macro Monitor Agent
export interface MacroIndicator {
  id: string;
  name: string;
  symbol: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  lastUpdated: string;
  alertLevel: 'hot' | 'warning' | 'calm';
  category: 'monetary' | 'economic' | 'market' | 'currency';
  unit: string;
  thresholds: {
    hot: { min: number; max: number };
    warning: { min: number; max: number };
    calm: { min: number; max: number };
  };
  description: string;
  trend: 'rising' | 'falling' | 'stable';
  significance: 'high' | 'medium' | 'low';
  source: string;
  updateFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
}

export interface AlertStatus {
  id: string;
  indicatorId: string;
  level: 'hot' | 'warning' | 'calm';
  message: string;
  timestamp: string;
  isActive: boolean;
  priority: number;
  actionRequired: boolean;
  relatedIndicators: string[];
}

export interface MacroIndicatorFilters {
  category?: string;
  alertLevel?: string;
  significance?: string;
  search?: string;
  timeRange?: string;
}

export interface MacroSummaryStats {
  total: number;
  hot: number;
  warning: number;
  calm: number;
  avgTrendDirection: number;
  mostVolatileIndicator: MacroIndicator | null;
  recentChanges: number;
}

export interface MacroIndicatorsResponse {
  indicators: MacroIndicator[];
  total: number;
  summary: MacroSummaryStats;
  lastUpdated: string;
  systemStatus: 'online' | 'degraded' | 'offline';
}

export interface AlertsResponse {
  alerts: AlertStatus[];
  activeCount: number;
  criticalCount: number;
  lastCheck: string;
}

// Macro Monitor Agent Service Class
export class MacroMonitorAgentService {
  private baseUrl = '/api/macro';

  // Fetch macro indicators
  async getMacroIndicators(timeRange: string = '1d', filters?: MacroIndicatorFilters): Promise<MacroIndicatorsResponse> {
    const params = new URLSearchParams({ timeRange });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all') {
          params.append(key, value);
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/indicators?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch macro indicators');
    }
    
    return response.json();
  }

  // Fetch alert status
  async getAlertStatus(): Promise<AlertsResponse> {
    const response = await fetch(`${this.baseUrl}/alert-status`);
    if (!response.ok) {
      throw new Error('Failed to fetch alert status');
    }
    
    return response.json();
  }

  // Process and filter indicators
  processIndicators(indicators: MacroIndicator[], filters: MacroIndicatorFilters): MacroIndicator[] {
    return indicators.filter(indicator => {
      if (filters.category && filters.category !== 'all' && indicator.category !== filters.category) {
        return false;
      }
      
      if (filters.alertLevel && filters.alertLevel !== 'all' && indicator.alertLevel !== filters.alertLevel) {
        return false;
      }
      
      if (filters.significance && filters.significance !== 'all' && indicator.significance !== filters.significance) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return indicator.name.toLowerCase().includes(searchLower) ||
               indicator.symbol.toLowerCase().includes(searchLower) ||
               indicator.description.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }

  // Calculate summary statistics
  calculateSummaryStats(indicators: MacroIndicator[]): MacroSummaryStats {
    const total = indicators.length;
    const hot = indicators.filter(i => i.alertLevel === 'hot').length;
    const warning = indicators.filter(i => i.alertLevel === 'warning').length;
    const calm = indicators.filter(i => i.alertLevel === 'calm').length;
    
    // Calculate average trend direction (-1 to 1)
    const trendValues = indicators.map(i => {
      switch (i.trend) {
        case 'rising': return 1;
        case 'falling': return -1;
        default: return 0;
      }
    });
    const avgTrendDirection = total > 0 ? trendValues.reduce((sum, val) => sum + val, 0) / total : 0;
    
    // Find most volatile indicator
    const mostVolatileIndicator = indicators.reduce((most, current) => 
      Math.abs(current.changePercent) > Math.abs(most?.changePercent || 0) ? current : most, 
      null as MacroIndicator | null
    );
    
    // Count recent significant changes (>5% change)
    const recentChanges = indicators.filter(i => Math.abs(i.changePercent) > 5).length;
    
    return {
      total,
      hot,
      warning,
      calm,
      avgTrendDirection,
      mostVolatileIndicator,
      recentChanges
    };
  }

  // Get trend icon name
  getTrendIcon(changePercent: number): string {
    if (changePercent > 0) return 'trending-up';
    if (changePercent < 0) return 'trending-down';
    return 'minus';
  }

  // Get alert badge styling
  getAlertBadgeClass(level: 'hot' | 'warning' | 'calm'): string {
    switch (level) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'calm': return 'bg-green-100 text-green-800 border-green-200';
    }
  }

  // Get alert icon name
  getAlertIcon(level: 'hot' | 'warning' | 'calm'): string {
    switch (level) {
      case 'hot': return 'alert-triangle';
      case 'warning': return 'alert-circle';
      case 'calm': return 'check-circle';
    }
  }

  // Get category icon and color
  getCategoryInfo(category: string): { icon: string; color: string } {
    const categoryMap: { [key: string]: { icon: string; color: string } } = {
      monetary: { icon: 'dollar-sign', color: 'text-green-600' },
      economic: { icon: 'bar-chart-3', color: 'text-blue-600' },
      market: { icon: 'trending-up', color: 'text-purple-600' },
      currency: { icon: 'globe', color: 'text-orange-600' }
    };
    return categoryMap[category] || { icon: 'info', color: 'text-gray-600' };
  }

  // Format value with unit
  formatValue(value: number, unit: string): string {
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    } else if (unit === 'bps') {
      return `${value.toFixed(0)} bps`;
    } else if (unit === 'index') {
      return value.toFixed(2);
    } else {
      return `${value.toFixed(2)} ${unit}`;
    }
  }

  // Format change percentage
  formatChangePercent(changePercent: number): string {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  // Get change color
  getChangeColor(changePercent: number): string {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // Get frequency display text
  getFrequencyDisplayText(frequency: string): string {
    const frequencyMap: { [key: string]: string } = {
      '1h': '1 Hour',
      '4h': '4 Hours', 
      '1d': '1 Day',
      '1w': '1 Week',
      '1m': '1 Month'
    };
    return frequencyMap[frequency] || frequency;
  }

  // Get threshold description for tooltip
  getThresholdDescription(indicator: MacroIndicator): {
    hot: string;
    warning: string;
    calm: string;
  } {
    const { thresholds, unit } = indicator;
    return {
      hot: `${this.formatValue(thresholds.hot.min, unit)} - ${this.formatValue(thresholds.hot.max, unit)}`,
      warning: `${this.formatValue(thresholds.warning.min, unit)} - ${this.formatValue(thresholds.warning.max, unit)}`,
      calm: `${this.formatValue(thresholds.calm.min, unit)} - ${this.formatValue(thresholds.calm.max, unit)}`
    };
  }

  // Sort indicators
  sortIndicators(indicators: MacroIndicator[], sortBy: 'name' | 'alertLevel' | 'changePercent' | 'lastUpdated', order: 'asc' | 'desc' = 'desc'): MacroIndicator[] {
    return [...indicators].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'alertLevel':
          const levelOrder = { hot: 3, warning: 2, calm: 1 };
          compareValue = levelOrder[a.alertLevel] - levelOrder[b.alertLevel];
          break;
        case 'changePercent':
          compareValue = Math.abs(a.changePercent) - Math.abs(b.changePercent);
          break;
        case 'lastUpdated':
          compareValue = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Filter alerts by status
  filterActiveAlerts(alerts: AlertStatus[]): AlertStatus[] {
    return alerts.filter(alert => alert.isActive);
  }

  // Get alert severity color
  getAlertSeverityColor(level: string): string {
    switch (level) {
      case 'hot': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'calm': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  // Format relative time
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  }

  // Get unique categories from indicators
  getUniqueCategories(indicators: MacroIndicator[]): string[] {
    return [...new Set(indicators.map(indicator => indicator.category))];
  }

  // Calculate risk assessment
  calculateRiskAssessment(summaryStats: MacroSummaryStats): {
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    riskScore: number;
    description: string;
    recommendations: string[];
  } {
    const hotRatio = summaryStats.total > 0 ? summaryStats.hot / summaryStats.total : 0;
    const warningRatio = summaryStats.total > 0 ? summaryStats.warning / summaryStats.total : 0;
    
    // Calculate risk score (0-100)
    let riskScore = 0;
    riskScore += hotRatio * 60; // Hot alerts contribute most
    riskScore += warningRatio * 30; // Warning alerts contribute moderately
    riskScore += (summaryStats.recentChanges / summaryStats.total) * 10; // Volatility contributes
    
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    let description: string;
    const recommendations: string[] = [];
    
    if (riskScore >= 75) {
      riskLevel = 'extreme';
      description = 'Extreme market stress detected across multiple indicators';
      recommendations.push('Consider defensive positioning');
      recommendations.push('Monitor liquidity closely');
      recommendations.push('Review risk exposure');
    } else if (riskScore >= 50) {
      riskLevel = 'high';
      description = 'High market stress with multiple warning signals';
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Consider reducing leverage');
    } else if (riskScore >= 25) {
      riskLevel = 'medium';
      description = 'Moderate market stress with some concerns';
      recommendations.push('Monitor key indicators closely');
    } else {
      riskLevel = 'low';
      description = 'Stable market conditions with minimal stress';
      recommendations.push('Normal monitoring protocols');
    }
    
    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      description,
      recommendations
    };
  }

  // Generate system status
  generateSystemStatus(indicators: MacroIndicator[]): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    uptime: string;
  } {
    const hotCount = indicators.filter(i => i.alertLevel === 'hot').length;
    const recentUpdates = indicators.filter(i => {
      const updateTime = new Date(i.lastUpdated);
      const now = new Date();
      return (now.getTime() - updateTime.getTime()) < 10 * 60 * 1000; // Within 10 minutes
    }).length;
    
    const dataFreshness = indicators.length > 0 ? recentUpdates / indicators.length : 0;
    
    let status: 'healthy' | 'warning' | 'critical';
    let message: string;
    
    if (hotCount > 5 || dataFreshness < 0.3) {
      status = 'critical';
      message = 'Multiple critical alerts or stale data detected';
    } else if (hotCount > 2 || dataFreshness < 0.7) {
      status = 'warning';
      message = 'Some alerts active or data latency detected';
    } else {
      status = 'healthy';
      message = 'All systems operating normally';
    }
    
    return {
      status,
      message,
      uptime: '99.9%' // Mock uptime - would come from actual monitoring
    };
  }
}

// Service instance
export const macroMonitorAgentService = new MacroMonitorAgentService();

// React Query hooks
export const useMacroIndicators = (timeRange: string = '1d', user?: any, filters?: MacroIndicatorFilters) => {
  return useQuery({
    queryKey: ['/api/macro/indicators', timeRange, filters],
    queryFn: () => macroMonitorAgentService.getMacroIndicators(timeRange, filters),
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAlertStatus = (user?: any) => {
  return useQuery({
    queryKey: ['/api/macro/alert-status'],
    queryFn: () => macroMonitorAgentService.getAlertStatus(),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}; 