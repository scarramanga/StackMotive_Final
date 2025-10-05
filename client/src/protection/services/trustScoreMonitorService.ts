import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface TrustScoreComponent {
  id: string;
  name: string;
  category: 'security' | 'performance' | 'liquidity' | 'regulatory' | 'transparency';
  score: number;
  maxScore: number;
  weight: number;
  lastUpdated: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  description?: string;
  metrics?: {
    key: string;
    value: number;
    target: number;
    unit: string;
  }[];
  issues?: string[];
}

export interface TrustScoreAlert {
  id: string;
  type: 'score_drop' | 'threshold_breach' | 'metric_failure' | 'trend_warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  componentId?: string;
  resolved: boolean;
  actionRequired: boolean;
  metadata?: Record<string, any>;
}

export interface TrustScoreData {
  overallScore: number;
  grade: string;
  change: number;
  changePercentage: number;
  lastUpdated: string;
  components: TrustScoreComponent[];
  alerts: TrustScoreAlert[];
  history: TrustScoreHistoryPoint[];
  metadata?: {
    version: string;
    calculationMethod: string;
    lastCalculated: string;
  };
}

export interface TrustScoreHistoryPoint {
  timestamp: string;
  score: number;
  grade: string;
  components: {
    componentId: string;
    score: number;
  }[];
}

export interface TrustScoreFilters {
  category?: string;
  status?: string;
  severity?: string;
  timeRange?: string;
  resolved?: boolean;
}

export interface TrustScoreForecast {
  forecastScore: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  projectedGrade: string;
  factors: {
    factor: string;
    impact: number;
    description: string;
  }[];
}

export interface TrustScoreInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
}

export interface ComponentHealth {
  health: 'healthy' | 'warning' | 'critical';
  issues: string[];
  score: number;
  trend: string;
}

export interface TrustScoreState {
  selectedComponent: string | null;
  selectedAlert: string | null;
  timeRange: string;
  filters: TrustScoreFilters;
  viewMode: 'overview' | 'components' | 'alerts' | 'history';
  sortBy: 'score' | 'name' | 'category' | 'lastUpdated';
  sortOrder: 'asc' | 'desc';
}

// ================================
// CONSTANTS
// ================================

export const TRUST_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 40,
  CRITICAL: 0
} as const;

export const COMPONENT_CATEGORIES = {
  security: { label: 'Security', icon: 'shield', color: 'text-blue-600' },
  performance: { label: 'Performance', icon: 'trending-up', color: 'text-green-600' },
  liquidity: { label: 'Liquidity', icon: 'droplets', color: 'text-cyan-600' },
  regulatory: { label: 'Regulatory', icon: 'scale', color: 'text-purple-600' },
  transparency: { label: 'Transparency', icon: 'eye', color: 'text-orange-600' }
} as const;

export const ALERT_TYPES = {
  score_drop: { label: 'Score Drop', icon: 'trending-down', color: 'text-red-600' },
  threshold_breach: { label: 'Threshold Breach', icon: 'alert-triangle', color: 'text-orange-600' },
  metric_failure: { label: 'Metric Failure', icon: 'x-circle', color: 'text-red-600' },
  trend_warning: { label: 'Trend Warning', icon: 'alert-circle', color: 'text-yellow-600' }
} as const;

export const SEVERITY_LEVELS = {
  critical: { label: 'Critical', color: 'text-red-600 border-red-200 bg-red-50' },
  high: { label: 'High', color: 'text-orange-600 border-orange-200 bg-orange-50' },
  medium: { label: 'Medium', color: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
  low: { label: 'Low', color: 'text-blue-600 border-blue-200 bg-blue-50' }
} as const;

export const STATUS_COLORS = {
  excellent: 'text-green-600 border-green-200 bg-green-50',
  good: 'text-blue-600 border-blue-200 bg-blue-50',
  fair: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  poor: 'text-orange-600 border-orange-200 bg-orange-50',
  critical: 'text-red-600 border-red-200 bg-red-50'
} as const;

export const TREND_COLORS = {
  improving: 'text-green-600',
  stable: 'text-gray-600',
  declining: 'text-red-600'
} as const;

export const QUERY_KEYS = {
  TRUST_SCORE: 'trust-score',
  TRUST_SCORE_HISTORY: 'trust-score-history',
  TRUST_SCORE_COMPONENTS: 'trust-score-components',
  TRUST_SCORE_ALERTS: 'trust-score-alerts'
} as const;

export const DEFAULT_STATE: TrustScoreState = {
  selectedComponent: null,
  selectedAlert: null,
  timeRange: '30d',
  filters: {
    category: 'all',
    status: 'all',
    severity: 'all'
  },
  viewMode: 'overview',
  sortBy: 'score',
  sortOrder: 'desc'
};

// ================================
// TRUST SCORE MONITOR SERVICE CLASS
// ================================

export class TrustScoreMonitorService {
  // Score Calculation and Grading
  static calculateOverallScore(components: TrustScoreComponent[]): number {
    if (!components.length) return 0;
    
    const weightedSum = components.reduce((sum, comp) => {
      const normalizedScore = (comp.score / comp.maxScore) * 100;
      return sum + (normalizedScore * comp.weight / 100);
    }, 0);
    
    return Math.round(weightedSum);
  }

  static getScoreGrade(score: number): string {
    if (score >= TRUST_SCORE_THRESHOLDS.EXCELLENT) return 'A+';
    if (score >= TRUST_SCORE_THRESHOLDS.GOOD) return 'A';
    if (score >= TRUST_SCORE_THRESHOLDS.FAIR) return 'B';
    if (score >= TRUST_SCORE_THRESHOLDS.POOR) return 'C';
    return 'D';
  }

  static getTrustScoreStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= TRUST_SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= TRUST_SCORE_THRESHOLDS.GOOD) return 'good';
    if (score >= TRUST_SCORE_THRESHOLDS.FAIR) return 'fair';
    if (score >= TRUST_SCORE_THRESHOLDS.POOR) return 'poor';
    return 'critical';
  }

  // Component Analysis
  static calculateComponentHealth(component: TrustScoreComponent): ComponentHealth {
    const normalizedScore = (component.score / component.maxScore) * 100;
    const issues: string[] = [];
    
    let health: 'healthy' | 'warning' | 'critical';
    
    if (normalizedScore >= 80) {
      health = 'healthy';
    } else if (normalizedScore >= 60) {
      health = 'warning';
      issues.push('Performance below optimal level');
    } else {
      health = 'critical';
      issues.push('Critical performance issues detected');
    }

    if (component.trend === 'declining') {
      issues.push('Declining trend detected');
      if (health === 'healthy') health = 'warning';
    }

    return {
      health,
      issues: [...issues, ...(component.issues || [])],
      score: normalizedScore,
      trend: component.trend
    };
  }

  static getComponentsByCategory(components: TrustScoreComponent[]): Record<string, TrustScoreComponent[]> {
    return components.reduce((acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = [];
      }
      acc[component.category].push(component);
      return acc;
    }, {} as Record<string, TrustScoreComponent[]>);
  }

  // Filtering and Sorting
  static filterComponents(
    components: TrustScoreComponent[], 
    filters: TrustScoreFilters
  ): TrustScoreComponent[] {
    return components.filter(component => {
      if (filters.category && filters.category !== 'all' && component.category !== filters.category) {
        return false;
      }
      if (filters.status && filters.status !== 'all' && component.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  static filterAlerts(
    alerts: TrustScoreAlert[], 
    filters: TrustScoreFilters
  ): TrustScoreAlert[] {
    return alerts.filter(alert => {
      if (filters.severity && filters.severity !== 'all' && alert.severity !== filters.severity) {
        return false;
      }
      if (filters.resolved !== undefined && alert.resolved !== filters.resolved) {
        return false;
      }
      return true;
    });
  }

  static sortComponents(
    components: TrustScoreComponent[], 
    sortBy: 'score' | 'name' | 'category' | 'lastUpdated',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): TrustScoreComponent[] {
    return [...components].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'score':
          comparison = (a.score / a.maxScore) - (b.score / b.maxScore);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'lastUpdated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  static sortAlerts(
    alerts: TrustScoreAlert[], 
    sortBy: 'severity' | 'timestamp' | 'type',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): TrustScoreAlert[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return [...alerts].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'severity':
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Forecasting and Insights
  static generateScoreForecast(history: TrustScoreHistoryPoint[]): TrustScoreForecast | null {
    if (history.length < 3) return null;

    const recentHistory = history.slice(-10);
    const scores = recentHistory.map(h => h.score);
    
    // Simple linear regression for trend
    const n = scores.length;
    const x = Array.from({length: n}, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * scores[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const forecastScore = Math.max(0, Math.min(100, intercept + slope * n));
    
    let trend: 'improving' | 'stable' | 'declining';
    if (slope > 1) trend = 'improving';
    else if (slope < -1) trend = 'declining';
    else trend = 'stable';

    // Calculate confidence based on variance
    const variance = scores.reduce((sum, score, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(score - predicted, 2);
    }, 0) / n;
    
    const confidence = Math.max(50, Math.min(100, 100 - Math.sqrt(variance)));

    return {
      forecastScore,
      trend,
      confidence,
      projectedGrade: this.getScoreGrade(forecastScore),
      factors: [
        {
          factor: 'Historical Trend',
          impact: Math.abs(slope) * 10,
          description: trend === 'improving' ? 'Positive momentum detected' : 
                      trend === 'declining' ? 'Negative trend observed' : 'Stable performance'
        }
      ]
    };
  }

  static generateInsights(data: TrustScoreData): TrustScoreInsights {
    const components = data.components;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];

    // Analyze components for insights
    components.forEach(component => {
      const normalizedScore = (component.score / component.maxScore) * 100;
      
      if (normalizedScore >= 85) {
        strengths.push(`${component.name} is performing excellently (${normalizedScore.toFixed(0)}%)`);
      } else if (normalizedScore < 60) {
        weaknesses.push(`${component.name} needs attention (${normalizedScore.toFixed(0)}%)`);
        recommendations.push(`Improve ${component.name.toLowerCase()} metrics`);
      }

      if (component.trend === 'declining') {
        risks.push(`${component.name} shows declining trend`);
      } else if (component.trend === 'improving') {
        opportunities.push(`${component.name} momentum can be leveraged`);
      }
    });

    // Overall analysis
    if (data.overallScore >= 85) {
      strengths.push('Overall trust score is in excellent range');
    } else if (data.overallScore < 70) {
      recommendations.push('Focus on improving overall trust metrics');
    }

    if (data.change < -5) {
      risks.push('Recent score decline requires immediate attention');
    }

    return {
      strengths,
      weaknesses,
      recommendations,
      risks,
      opportunities
    };
  }

  // Color and Status Helpers
  static getStatusColor(status: string): string {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.fair;
  }

  static getTrendColor(trend: string): string {
    return TREND_COLORS[trend as keyof typeof TREND_COLORS] || TREND_COLORS.stable;
  }

  static getAlertSeverityColor(severity: string): string {
    return SEVERITY_LEVELS[severity as keyof typeof SEVERITY_LEVELS]?.color || SEVERITY_LEVELS.medium.color;
  }

  static getChangeColor(change: number): string {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // Formatting Helpers
  static formatScoreChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  }

  static formatPercentageChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  static formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  }

  // API Calls
  static async fetchTrustScore(vaultId: string, timeRange: string = '30d'): Promise<TrustScoreData> {
    const url = `/api/trust-score?vaultId=${vaultId}&timeRange=${timeRange}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch trust score data');
    }
    
    return response.json();
  }

  static async markAlertAsResolved(alertId: string): Promise<void> {
    const response = await fetch(`/api/trust-score/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve alert');
    }
  }

  static async refreshTrustScore(vaultId: string): Promise<TrustScoreData> {
    const response = await fetch(`/api/trust-score/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh trust score');
    }
    
    return response.json();
  }

  // Agent Memory Logging
  static async logAgentMemory(action: string, details: any): Promise<void> {
    try {
      await fetch('/api/agent/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'TrustScoreMonitorPanel',
          action,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log agent memory:', error);
    }
  }

  // State Management Helpers
  static createInitialState(): TrustScoreState {
    return { ...DEFAULT_STATE };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useTrustScore = (vaultId: string, user: any, timeRange: string = '30d') => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRUST_SCORE, vaultId, timeRange],
    queryFn: () => TrustScoreMonitorService.fetchTrustScore(vaultId, timeRange),
    enabled: !!vaultId && !!user,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const useRefreshTrustScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vaultId: string) => TrustScoreMonitorService.refreshTrustScore(vaultId),
    onSuccess: (_, vaultId) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRUST_SCORE, vaultId]);
      TrustScoreMonitorService.logAgentMemory('trust_score_refreshed', {
        vaultId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => TrustScoreMonitorService.markAlertAsResolved(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRUST_SCORE]);
      TrustScoreMonitorService.logAgentMemory('alert_resolved', {
        alertId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useTrustScoreState = () => {
  const [state, setState] = useState(() => TrustScoreMonitorService.createInitialState());

  const setTimeRange = (timeRange: string) => {
    setState(prev => ({ ...prev, timeRange }));
    TrustScoreMonitorService.logAgentMemory('time_range_changed', {
      timeRange,
      timestamp: new Date().toISOString()
    });
  };

  const setFilters = (filters: Partial<TrustScoreFilters>) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, ...filters } }));
    TrustScoreMonitorService.logAgentMemory('filters_changed', {
      filters,
      timestamp: new Date().toISOString()
    });
  };

  const selectComponent = (componentId: string | null) => {
    setState(prev => ({ ...prev, selectedComponent: componentId }));
    if (componentId) {
      TrustScoreMonitorService.logAgentMemory('component_selected', {
        componentId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const selectAlert = (alertId: string | null) => {
    setState(prev => ({ ...prev, selectedAlert: alertId }));
    if (alertId) {
      TrustScoreMonitorService.logAgentMemory('alert_selected', {
        alertId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const setViewMode = (viewMode: 'overview' | 'components' | 'alerts' | 'history') => {
    setState(prev => ({ ...prev, viewMode }));
    TrustScoreMonitorService.logAgentMemory('view_mode_changed', {
      viewMode,
      timestamp: new Date().toISOString()
    });
  };

  const setSortConfig = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortBy: sortBy as any, sortOrder }));
  };

  const resetState = () => {
    setState(TrustScoreMonitorService.createInitialState());
  };

  return {
    state,
    setTimeRange,
    setFilters,
    selectComponent,
    selectAlert,
    setViewMode,
    setSortConfig,
    resetState
  };
};

export const useFilteredComponents = (
  components: TrustScoreComponent[] = [],
  filters: TrustScoreFilters,
  sortBy: 'score' | 'name' | 'category' | 'lastUpdated' = 'score',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  return useMemo(() => {
    const filtered = TrustScoreMonitorService.filterComponents(components, filters);
    return TrustScoreMonitorService.sortComponents(filtered, sortBy, sortOrder);
  }, [components, filters, sortBy, sortOrder]);
};

export const useFilteredAlerts = (
  alerts: TrustScoreAlert[] = [],
  filters: TrustScoreFilters,
  sortBy: 'severity' | 'timestamp' | 'type' = 'severity',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  return useMemo(() => {
    const filtered = TrustScoreMonitorService.filterAlerts(alerts, filters);
    return TrustScoreMonitorService.sortAlerts(filtered, sortBy, sortOrder);
  }, [alerts, filters, sortBy, sortOrder]);
};

export const useTrustScoreInsights = (data: TrustScoreData | undefined) => {
  return useMemo(() => {
    if (!data) return null;
    return TrustScoreMonitorService.generateInsights(data);
  }, [data]);
};

export const useTrustScoreForecast = (history: TrustScoreHistoryPoint[] = []) => {
  return useMemo(() => {
    return TrustScoreMonitorService.generateScoreForecast(history);
  }, [history]);
};

// Legacy export for backwards compatibility
export const trustScoreMonitorService = TrustScoreMonitorService;

export default TrustScoreMonitorService; 