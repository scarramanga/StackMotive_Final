import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for User Action History
export interface UserAction {
  id: string;
  userId: string;
  vaultId?: string;
  actionType: 'trade' | 'rebalance' | 'setting_change' | 'view' | 'export' | 'import' | 'alert' | 'analysis' | 'sync' | 'other';
  category: 'portfolio' | 'trading' | 'settings' | 'analysis' | 'sync' | 'security' | 'system';
  subCategory?: string;
  title: string;
  description: string;
  timestamp: string;
  duration?: number; // milliseconds
  status: 'success' | 'error' | 'cancelled' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isUndoable: boolean;
  isReversible: boolean;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    location?: string;
    sessionId?: string;
    affectedResources?: string[];
    beforeState?: any;
    afterState?: any;
    errorMessage?: string;
    stackTrace?: string;
    relatedActions?: string[];
    tags?: string[];
  };
}

export interface ActionFilter {
  actionTypes?: string[];
  categories?: string[];
  status?: string[];
  severity?: string[];
  dateRange?: { start: string; end: string };
  search?: string;
  userId?: string;
  vaultId?: string;
  limit?: number;
  offset?: number;
}

export interface ActionAnalytics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByCategory: Record<string, number>;
  actionsByStatus: Record<string, number>;
  actionsByHour: Array<{ hour: number; count: number }>;
  actionsByDay: Array<{ date: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  errorRate: number;
  averageDuration: number;
  mostActiveUsers: Array<{ userId: string; count: number }>;
  securityEvents: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
}

export interface ActionSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  actions: UserAction[];
  totalActions: number;
  errorCount: number;
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screen: string;
  };
  location: {
    country: string;
    city: string;
    timezone: string;
  };
  isActive: boolean;
}

export interface ActionAudit {
  id: string;
  actionId: string;
  auditType: 'security' | 'compliance' | 'performance' | 'error';
  findings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

// User Action History Service Class
export class UserActionHistoryService {
  private baseUrl = '/api/user/actions';

  // Fetch user actions
  async getUserActions(filters?: ActionFilter): Promise<{
    actions: UserAction[];
    total: number;
    hasMore: boolean;
    analytics: ActionAnalytics;
  }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user actions');
    }
    
    return response.json();
  }

  // Get specific action details
  async getActionDetails(id: string): Promise<UserAction> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch action details');
    }
    
    return response.json();
  }

  // Create new action (for manual logging)
  async createAction(action: Omit<UserAction, 'id' | 'timestamp'>): Promise<UserAction> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create action');
    }
    
    return response.json();
  }

  // Update action (for status changes, etc.)
  async updateAction(id: string, updates: Partial<UserAction>): Promise<UserAction> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update action');
    }
    
    return response.json();
  }

  // Undo action (if possible)
  async undoAction(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}/undo`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to undo action');
    }
    
    return response.json();
  }

  // Get user sessions
  async getUserSessions(userId?: string, limit: number = 50): Promise<ActionSession[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('limit', limit.toString());
    
    const response = await fetch(`${this.baseUrl}/sessions?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user sessions');
    }
    
    return response.json();
  }

  // Get audit results
  async getAuditResults(filters?: {
    actionId?: string;
    auditType?: string;
    riskLevel?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<ActionAudit[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/audit?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch audit results');
    }
    
    return response.json();
  }

  // Export action history
  async exportActionHistory(filters?: ActionFilter, format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/export?${params}`);
    if (!response.ok) {
      throw new Error('Failed to export action history');
    }
    
    return response.blob();
  }

  // Get action status color
  getActionStatusColor(status: UserAction['status']): string {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  // Get action severity color
  getActionSeverityColor(severity: UserAction['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get action type icon
  getActionTypeIcon(actionType: UserAction['actionType']): string {
    switch (actionType) {
      case 'trade': return 'trending-up';
      case 'rebalance': return 'refresh-cw';
      case 'setting_change': return 'settings';
      case 'view': return 'eye';
      case 'export': return 'download';
      case 'import': return 'upload';
      case 'alert': return 'bell';
      case 'analysis': return 'bar-chart';
      case 'sync': return 'sync';
      default: return 'activity';
    }
  }

  // Get category color
  getCategoryColor(category: UserAction['category']): string {
    switch (category) {
      case 'portfolio': return 'bg-blue-50 text-blue-700';
      case 'trading': return 'bg-green-50 text-green-700';
      case 'settings': return 'bg-gray-50 text-gray-700';
      case 'analysis': return 'bg-purple-50 text-purple-700';
      case 'sync': return 'bg-yellow-50 text-yellow-700';
      case 'security': return 'bg-red-50 text-red-700';
      case 'system': return 'bg-indigo-50 text-indigo-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  }

  // Format duration
  formatDuration(duration?: number): string {
    if (!duration) return 'N/A';
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    if (duration < 3600000) return `${(duration / 60000).toFixed(1)}m`;
    return `${(duration / 3600000).toFixed(1)}h`;
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

  // Filter actions
  filterActions(actions: UserAction[], filters: ActionFilter): UserAction[] {
    return actions.filter(action => {
      if (filters.actionTypes && !filters.actionTypes.includes(action.actionType)) {
        return false;
      }
      
      if (filters.categories && !filters.categories.includes(action.category)) {
        return false;
      }
      
      if (filters.status && !filters.status.includes(action.status)) {
        return false;
      }
      
      if (filters.severity && !filters.severity.includes(action.severity)) {
        return false;
      }
      
      if (filters.dateRange) {
        const actionTime = new Date(action.timestamp);
        const startTime = new Date(filters.dateRange.start);
        const endTime = new Date(filters.dateRange.end);
        if (actionTime < startTime || actionTime > endTime) {
          return false;
        }
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return action.title.toLowerCase().includes(searchLower) ||
               action.description.toLowerCase().includes(searchLower) ||
               action.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      }
      
      if (filters.userId && action.userId !== filters.userId) {
        return false;
      }
      
      if (filters.vaultId && action.vaultId !== filters.vaultId) {
        return false;
      }
      
      return true;
    });
  }

  // Sort actions
  sortActions(actions: UserAction[], sortBy: 'timestamp' | 'duration' | 'severity' | 'status', order: 'asc' | 'desc' = 'desc'): UserAction[] {
    return [...actions].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'duration':
          compareValue = (a.duration || 0) - (b.duration || 0);
          break;
        case 'severity':
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          compareValue = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Calculate action statistics
  calculateActionStats(actions: UserAction[]): {
    totalActions: number;
    successRate: number;
    errorRate: number;
    averageDuration: number;
    mostCommonAction: string;
    mostCommonCategory: string;
    actionsPerDay: number;
    criticalActions: number;
  } {
    if (actions.length === 0) {
      return {
        totalActions: 0,
        successRate: 0,
        errorRate: 0,
        averageDuration: 0,
        mostCommonAction: '',
        mostCommonCategory: '',
        actionsPerDay: 0,
        criticalActions: 0
      };
    }
    
    const totalActions = actions.length;
    const successActions = actions.filter(a => a.status === 'success').length;
    const errorActions = actions.filter(a => a.status === 'error').length;
    const criticalActions = actions.filter(a => a.severity === 'critical').length;
    
    const successRate = (successActions / totalActions) * 100;
    const errorRate = (errorActions / totalActions) * 100;
    
    const durationsWithValues = actions.filter(a => a.duration).map(a => a.duration!);
    const averageDuration = durationsWithValues.length > 0 
      ? durationsWithValues.reduce((sum, d) => sum + d, 0) / durationsWithValues.length 
      : 0;
    
    // Find most common action type
    const actionTypeCounts = actions.reduce((acc, action) => {
      acc[action.actionType] = (acc[action.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonAction = Object.entries(actionTypeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
    
    // Find most common category
    const categoryCounts = actions.reduce((acc, action) => {
      acc[action.category] = (acc[action.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
    
    // Calculate actions per day
    const dateRange = this.getDateRange(actions);
    const daysDiff = Math.max(1, Math.ceil(dateRange.diffMs / (1000 * 60 * 60 * 24)));
    const actionsPerDay = totalActions / daysDiff;
    
    return {
      totalActions,
      successRate,
      errorRate,
      averageDuration,
      mostCommonAction,
      mostCommonCategory,
      actionsPerDay,
      criticalActions
    };
  }

  // Get date range from actions
  private getDateRange(actions: UserAction[]): { 
    start: Date; 
    end: Date; 
    diffMs: number; 
  } {
    const timestamps = actions.map(a => new Date(a.timestamp));
    const start = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const end = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const diffMs = end.getTime() - start.getTime();
    
    return { start, end, diffMs };
  }

  // Get actions by time period
  getActionsByTimePeriod(actions: UserAction[], period: 'hour' | 'day' | 'week' | 'month'): Array<{
    period: string;
    count: number;
    successCount: number;
    errorCount: number;
  }> {
    const groups: Record<string, UserAction[]> = {};
    
    actions.forEach(action => {
      const date = new Date(action.timestamp);
      let key: string;
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(action);
    });
    
    return Object.entries(groups).map(([period, actions]) => ({
      period,
      count: actions.length,
      successCount: actions.filter(a => a.status === 'success').length,
      errorCount: actions.filter(a => a.status === 'error').length
    }));
  }

  // Get security-related actions
  getSecurityActions(actions: UserAction[]): UserAction[] {
    return actions.filter(action => 
      action.category === 'security' ||
      action.severity === 'critical' ||
      action.actionType === 'alert' ||
      action.metadata.tags?.includes('security')
    );
  }

  // Get performance insights
  getPerformanceInsights(actions: UserAction[]): {
    slowActions: UserAction[];
    errorPatterns: Array<{ pattern: string; count: number }>;
    peakUsageHours: number[];
    recommendations: string[];
  } {
    const slowActions = actions
      .filter(a => a.duration && a.duration > 5000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    const errorActions = actions.filter(a => a.status === 'error');
    const errorPatterns = errorActions.reduce((acc, action) => {
      const pattern = action.metadata.errorMessage || 'Unknown error';
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const errorPatternsList = Object.entries(errorPatterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
    
    const hourlyActivity = actions.reduce((acc, action) => {
      const hour = new Date(action.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const peakUsageHours = Object.entries(hourlyActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    const recommendations: string[] = [];
    
    if (slowActions.length > 0) {
      recommendations.push(`Optimize performance for ${slowActions.length} slow actions`);
    }
    
    if (errorPatternsList.length > 0) {
      recommendations.push(`Address ${errorPatternsList.length} error patterns`);
    }
    
    const errorRate = (errorActions.length / actions.length) * 100;
    if (errorRate > 5) {
      recommendations.push(`Reduce error rate from ${errorRate.toFixed(1)}%`);
    }
    
    return {
      slowActions: slowActions.slice(0, 10),
      errorPatterns: errorPatternsList,
      peakUsageHours,
      recommendations
    };
  }

  // Download file helper
  downloadFile(blob: Blob, filename: string): void {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'actions_viewed' | 'action_created' | 'action_updated' | 'action_undone' | 'action_exported' | 'action_filtered' | 'action_sorted' | 'action_details_viewed' | 'sessions_viewed' | 'audit_results_viewed',
    actionData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-36-user-action-history',
        timestamp: new Date().toISOString(),
        userId: actionData.userId,
        vaultId: actionData.vaultId,
        data: {
          ...actionData.metadata
        }
      };

      await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      console.warn('Failed to log agent memory:', error);
    }
  }
}

// Service instance
export const userActionHistoryService = new UserActionHistoryService();

// React Query hooks
export const useUserActions = (filters?: ActionFilter) => {
  return useQuery({
    queryKey: ['/api/user/actions', filters],
    queryFn: () => userActionHistoryService.getUserActions(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useActionDetails = (id: string) => {
  return useQuery({
    queryKey: ['/api/user/actions', id],
    queryFn: () => userActionHistoryService.getActionDetails(id),
    enabled: !!id,
  });
};

export const useCreateAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (action: Omit<UserAction, 'id' | 'timestamp'>) => 
      userActionHistoryService.createAction(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/actions'] });
    },
  });
};

export const useUpdateAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UserAction> }) => 
      userActionHistoryService.updateAction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/actions'] });
    },
  });
};

export const useUndoAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      userActionHistoryService.undoAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/actions'] });
    },
  });
};

export const useUserSessions = (userId?: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['/api/user/actions/sessions', userId, limit],
    queryFn: () => userActionHistoryService.getUserSessions(userId, limit),
  });
};

export const useAuditResults = (filters?: any) => {
  return useQuery({
    queryKey: ['/api/user/actions/audit', filters],
    queryFn: () => userActionHistoryService.getAuditResults(filters),
  });
}; 