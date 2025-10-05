import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface SignalAlert {
  id: string;
  timestamp: string;
  overlay: string;
  asset: string;
  signalType: 'buy' | 'sell' | 'hold' | 'rebalance';
  severity: 'low' | 'medium' | 'high';
  message: string;
  confidence: number;
  isDispatched: boolean;
  dispatchedAt?: string;
  userId?: string;
  vaultId?: string;
  metadata?: {
    source: string;
    version: string;
    calculatedAt: string;
  };
}

export interface DispatchResponse {
  success: boolean;
  message: string;
  dispatchedCount: number;
  cooldownUntil?: string;
  failedDispatches?: string[];
  metadata?: {
    dispatchedAt: string;
    batchId: string;
    totalProcessed: number;
  };
}

export interface AlertsData {
  alerts: SignalAlert[];
  cooldownUntil?: string;
  lastFetchedAt: string;
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    undispatched: number;
    dispatchedToday: number;
  };
}

export interface SignalAlertFilters {
  severity?: 'low' | 'medium' | 'high';
  signalType?: 'buy' | 'sell' | 'hold' | 'rebalance';
  overlay?: string;
  asset?: string;
  isDispatched?: boolean;
  timeRange?: string;
  minConfidence?: number;
}

export interface SignalAlertSummaryStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  undispatched: number;
  dispatchedToday: number;
  averageConfidence: number;
  bySignalType: Record<string, number>;
  byOverlay: Record<string, number>;
  recentTrends: {
    hourly: number[];
    daily: number[];
  };
}

export interface SignalAlertState {
  onlyHighSeverity: boolean;
  filters: SignalAlertFilters;
  sortBy: 'timestamp' | 'severity' | 'confidence' | 'overlay';
  sortOrder: 'asc' | 'desc';
  selectedAlert: string | null;
  viewMode: 'table' | 'grid' | 'timeline';
  autoRefresh: boolean;
  dispatchFeedback: {
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null;
}

export interface CooldownStatus {
  active: boolean;
  timeRemaining: string;
  nextDispatchAt: string;
}

export interface DispatchConfig {
  cooldownMinutes: number;
  maxBatchSize: number;
  minConfidenceThreshold: number;
  highSeverityOnly: boolean;
  channels: string[];
}

// ================================
// CONSTANTS
// ================================

export const SIGNAL_TYPES = {
  buy: { label: 'Buy', color: 'text-green-600', icon: 'trending-up' },
  sell: { label: 'Sell', color: 'text-red-600', icon: 'trending-down' },
  hold: { label: 'Hold', color: 'text-gray-600', icon: 'minus' },
  rebalance: { label: 'Rebalance', color: 'text-blue-600', icon: 'zap' }
} as const;

export const SEVERITY_LEVELS = {
  low: { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { label: 'High', color: 'bg-red-100 text-red-800 border-red-200' }
} as const;

export const DISPATCH_CHANNELS = {
  email: { label: 'Email', enabled: true },
  sms: { label: 'SMS', enabled: true },
  webhook: { label: 'Webhook', enabled: true },
  push: { label: 'Push Notification', enabled: true }
} as const;

export const QUERY_KEYS = {
  SIGNAL_ALERTS: 'signal-alerts',
  DISPATCH_CONFIG: 'dispatch-config',
  ALERT_HISTORY: 'alert-history'
} as const;

export const DEFAULT_STATE: SignalAlertState = {
  onlyHighSeverity: false,
  filters: {},
  sortBy: 'timestamp',
  sortOrder: 'desc',
  selectedAlert: null,
  viewMode: 'table',
  autoRefresh: true,
  dispatchFeedback: null
};

export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  cooldownMinutes: 15,
  maxBatchSize: 50,
  minConfidenceThreshold: 70,
  highSeverityOnly: false,
  channels: ['email', 'webhook']
};

// ================================
// SIGNAL ALERT DISPATCHER SERVICE CLASS
// ================================

export class SignalAlertDispatcherService {
  // Alert Processing and Filtering
  static filterAlerts(alerts: SignalAlert[], filters: SignalAlertFilters): SignalAlert[] {
    return alerts.filter(alert => {
      if (filters.severity && alert.severity !== filters.severity) return false;
      if (filters.signalType && alert.signalType !== filters.signalType) return false;
      if (filters.overlay && alert.overlay !== filters.overlay) return false;
      if (filters.asset && alert.asset !== filters.asset) return false;
      if (filters.isDispatched !== undefined && alert.isDispatched !== filters.isDispatched) return false;
      if (filters.minConfidence && alert.confidence < filters.minConfidence) return false;
      
      if (filters.timeRange) {
        const now = new Date();
        const alertTime = new Date(alert.timestamp);
        const diffHours = (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);
        
        switch (filters.timeRange) {
          case '1h': return diffHours <= 1;
          case '6h': return diffHours <= 6;
          case '24h': return diffHours <= 24;
          case '7d': return diffHours <= 168;
          default: return true;
        }
      }
      
      return true;
    });
  }

  static sortAlerts(
    alerts: SignalAlert[], 
    sortBy: 'timestamp' | 'severity' | 'confidence' | 'overlay',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): SignalAlert[] {
    const severityOrder = { low: 1, medium: 2, high: 3 };
    
    return [...alerts].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'severity':
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'overlay':
          comparison = a.overlay.localeCompare(b.overlay);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Statistics and Analytics
  static calculateSummaryStats(alerts: SignalAlert[]): SignalAlertSummaryStats {
    const total = alerts.length;
    const high = alerts.filter(a => a.severity === 'high').length;
    const medium = alerts.filter(a => a.severity === 'medium').length;
    const low = alerts.filter(a => a.severity === 'low').length;
    const undispatched = alerts.filter(a => !a.isDispatched).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dispatchedToday = alerts.filter(a => 
      a.isDispatched && 
      a.dispatchedAt && 
      new Date(a.dispatchedAt) >= today
    ).length;

    const averageConfidence = total > 0 
      ? Math.round(alerts.reduce((sum, a) => sum + a.confidence, 0) / total) 
      : 0;

    const bySignalType = alerts.reduce((acc, alert) => {
      acc[alert.signalType] = (acc[alert.signalType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byOverlay = alerts.reduce((acc, alert) => {
      acc[alert.overlay] = (acc[alert.overlay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate hourly trends for the last 24 hours
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      const nextHour = new Date(hour);
      nextHour.setHours(nextHour.getHours() + 1);
      
      return alerts.filter(a => {
        const alertTime = new Date(a.timestamp);
        return alertTime >= hour && alertTime < nextHour;
      }).length;
    }).reverse();

    // Calculate daily trends for the last 7 days
    const daily = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      
      return alerts.filter(a => {
        const alertTime = new Date(a.timestamp);
        return alertTime >= day && alertTime < nextDay;
      }).length;
    }).reverse();

    return {
      total,
      high,
      medium,
      low,
      undispatched,
      dispatchedToday,
      averageConfidence,
      bySignalType,
      byOverlay,
      recentTrends: { hourly, daily }
    };
  }

  // Cooldown Management
  static calculateCooldownStatus(cooldownUntil?: string): CooldownStatus {
    if (!cooldownUntil) {
      return {
        active: false,
        timeRemaining: '',
        nextDispatchAt: ''
      };
    }

    const now = new Date();
    const cooldownEnd = new Date(cooldownUntil);
    const diff = cooldownEnd.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        active: false,
        timeRemaining: '',
        nextDispatchAt: ''
      };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let timeRemaining: string;
    if (hours > 0) {
      timeRemaining = `${hours}h ${remainingMinutes}m`;
    } else {
      timeRemaining = `${minutes}m`;
    }

    return {
      active: true,
      timeRemaining,
      nextDispatchAt: cooldownEnd.toISOString()
    };
  }

  // Dispatch Logic
  static canDispatch(
    alerts: SignalAlert[], 
    cooldownStatus: CooldownStatus,
    config: DispatchConfig
  ): boolean {
    const undispatched = alerts.filter(a => !a.isDispatched);
    const highSeverityUndispatched = undispatched.filter(a => a.severity === 'high');
    
    if (cooldownStatus.active) return false;
    if (config.highSeverityOnly && highSeverityUndispatched.length === 0) return false;
    if (!config.highSeverityOnly && undispatched.length === 0) return false;
    
    return true;
  }

  static getDispatchableAlerts(
    alerts: SignalAlert[], 
    config: DispatchConfig
  ): SignalAlert[] {
    let dispatchable = alerts.filter(a => 
      !a.isDispatched && 
      a.confidence >= config.minConfidenceThreshold
    );

    if (config.highSeverityOnly) {
      dispatchable = dispatchable.filter(a => a.severity === 'high');
    }

    // Sort by severity (high first) then by confidence (high first)
    dispatchable.sort((a, b) => {
      const severityOrder = { low: 1, medium: 2, high: 3 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    return dispatchable.slice(0, config.maxBatchSize);
  }

  // Formatting and Display Helpers
  static formatTimeSince(timestamp: string): string {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diff = now.getTime() - alertTime.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  static formatConfidence(confidence: number): string {
    return `${confidence.toFixed(1)}%`;
  }

  static getSeverityColor(severity: string): string {
    return SEVERITY_LEVELS[severity as keyof typeof SEVERITY_LEVELS]?.color || 
           SEVERITY_LEVELS.medium.color;
  }

  static getSignalTypeColor(signalType: string): string {
    return SIGNAL_TYPES[signalType as keyof typeof SIGNAL_TYPES]?.color || 
           SIGNAL_TYPES.hold.color;
  }

  static getSignalTypeIcon(signalType: string): string {
    return SIGNAL_TYPES[signalType as keyof typeof SIGNAL_TYPES]?.icon || 
           SIGNAL_TYPES.hold.icon;
  }

  // Validation and Error Handling
  static validateAlert(alert: Partial<SignalAlert>): string[] {
    const errors: string[] = [];
    
    if (!alert.overlay) errors.push('Overlay is required');
    if (!alert.asset) errors.push('Asset is required');
    if (!alert.signalType) errors.push('Signal type is required');
    if (!alert.severity) errors.push('Severity is required');
    if (!alert.message) errors.push('Message is required');
    if (alert.confidence === undefined || alert.confidence < 0 || alert.confidence > 100) {
      errors.push('Confidence must be between 0 and 100');
    }
    
    return errors;
  }

  static validateDispatchConfig(config: Partial<DispatchConfig>): string[] {
    const errors: string[] = [];
    
    if (config.cooldownMinutes !== undefined && config.cooldownMinutes < 0) {
      errors.push('Cooldown minutes must be non-negative');
    }
    if (config.maxBatchSize !== undefined && config.maxBatchSize < 1) {
      errors.push('Max batch size must be at least 1');
    }
    if (config.minConfidenceThreshold !== undefined && 
        (config.minConfidenceThreshold < 0 || config.minConfidenceThreshold > 100)) {
      errors.push('Min confidence threshold must be between 0 and 100');
    }
    
    return errors;
  }

  // API Calls
  static async fetchSignalAlerts(): Promise<AlertsData> {
    const response = await fetch('/api/strategy/alerts');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch signal alerts: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async dispatchAlerts(alertIds?: string[]): Promise<DispatchResponse> {
    const response = await fetch('/api/strategy/alerts/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alertIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to dispatch alerts: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async updateDispatchConfig(config: Partial<DispatchConfig>): Promise<DispatchConfig> {
    const response = await fetch('/api/strategy/alerts/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update dispatch config: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await fetch(`/api/strategy/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
    }
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
          component: 'SignalAlertDispatcherPanel',
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
  static createInitialState(): SignalAlertState {
    return { ...DEFAULT_STATE };
  }

  static updateState(
    currentState: SignalAlertState, 
    updates: Partial<SignalAlertState>
  ): SignalAlertState {
    return { ...currentState, ...updates };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useSignalAlerts = (autoRefresh: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SIGNAL_ALERTS],
    queryFn: SignalAlertDispatcherService.fetchSignalAlerts,
    refetchInterval: autoRefresh ? 15000 : false, // 15 seconds
    staleTime: 10000, // 10 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const useDispatchAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertIds?: string[]) => SignalAlertDispatcherService.dispatchAlerts(alertIds),
    onSuccess: (data: DispatchResponse) => {
      queryClient.invalidateQueries([QUERY_KEYS.SIGNAL_ALERTS]);
      SignalAlertDispatcherService.logAgentMemory('alerts_dispatched', {
        dispatchedCount: data.dispatchedCount,
        success: data.success,
        timestamp: new Date().toISOString()
      });
    },
    onError: (error: Error) => {
      SignalAlertDispatcherService.logAgentMemory('dispatch_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => SignalAlertDispatcherService.acknowledgeAlert(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries([QUERY_KEYS.SIGNAL_ALERTS]);
      SignalAlertDispatcherService.logAgentMemory('alert_acknowledged', {
        alertId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useSignalAlertState = () => {
  const [state, setState] = useState(() => SignalAlertDispatcherService.createInitialState());

  const updateState = (updates: Partial<SignalAlertState>) => {
    setState(prev => SignalAlertDispatcherService.updateState(prev, updates));
  };

  const setOnlyHighSeverity = (onlyHighSeverity: boolean) => {
    updateState({ onlyHighSeverity });
    SignalAlertDispatcherService.logAgentMemory('filter_changed', {
      filter: 'onlyHighSeverity',
      value: onlyHighSeverity,
      timestamp: new Date().toISOString()
    });
  };

  const setFilters = (filters: Partial<SignalAlertFilters>) => {
    updateState({ filters: { ...state.filters, ...filters } });
    SignalAlertDispatcherService.logAgentMemory('filters_updated', {
      filters,
      timestamp: new Date().toISOString()
    });
  };

  const setDispatchFeedback = (feedback: SignalAlertState['dispatchFeedback']) => {
    updateState({ dispatchFeedback: feedback });
    if (feedback) {
      setTimeout(() => updateState({ dispatchFeedback: null }), 5000);
    }
  };

  const selectAlert = (alertId: string | null) => {
    updateState({ selectedAlert: alertId });
    if (alertId) {
      SignalAlertDispatcherService.logAgentMemory('alert_selected', {
        alertId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const resetState = () => {
    setState(SignalAlertDispatcherService.createInitialState());
  };

  return {
    state,
    updateState,
    setOnlyHighSeverity,
    setFilters,
    setDispatchFeedback,
    selectAlert,
    resetState
  };
};

export const useProcessedAlerts = (
  alerts: SignalAlert[] = [],
  filters: SignalAlertFilters,
  onlyHighSeverity: boolean = false,
  sortBy: 'timestamp' | 'severity' | 'confidence' | 'overlay' = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  return useMemo(() => {
    let processed = alerts;

    // Apply high severity filter
    if (onlyHighSeverity) {
      processed = processed.filter(alert => alert.severity === 'high');
    }

    // Apply other filters
    processed = SignalAlertDispatcherService.filterAlerts(processed, filters);

    // Apply sorting
    processed = SignalAlertDispatcherService.sortAlerts(processed, sortBy, sortOrder);

    return processed;
  }, [alerts, filters, onlyHighSeverity, sortBy, sortOrder]);
};

export const useAlertSummaryStats = (alerts: SignalAlert[] = []) => {
  return useMemo(() => {
    return SignalAlertDispatcherService.calculateSummaryStats(alerts);
  }, [alerts]);
};

export const useCooldownStatus = (cooldownUntil?: string) => {
  return useMemo(() => {
    return SignalAlertDispatcherService.calculateCooldownStatus(cooldownUntil);
  }, [cooldownUntil]);
};

export const useDispatchConfig = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.DISPATCH_CONFIG],
    queryFn: async () => {
      const response = await fetch('/api/strategy/alerts/config');
      if (!response.ok) {
        throw new Error('Failed to fetch dispatch config');
      }
      return response.json();
    },
    initialData: DEFAULT_DISPATCH_CONFIG,
    staleTime: 300000, // 5 minutes
  });
};

// Legacy export for backwards compatibility
export const signalAlertDispatcherService = SignalAlertDispatcherService;

export default SignalAlertDispatcherService; 