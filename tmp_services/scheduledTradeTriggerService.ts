import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Scheduled Trade Trigger
export interface ScheduledTrade {
  id: string;
  vaultId: string;
  name: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  triggerConditions: TriggerCondition[];
  schedule: TradeSchedule;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'error';
  createdAt: string;
  updatedAt: string;
  lastChecked?: string;
  nextExecution?: string;
  executionHistory: TradeExecution[];
  metadata: {
    strategy?: string;
    tags: string[];
    notes?: string;
    maxExecutions?: number;
    executionCount: number;
    totalValue?: number;
    averagePrice?: number;
  };
}

export interface TriggerCondition {
  id: string;
  type: 'price' | 'volume' | 'time' | 'indicator' | 'market_cap' | 'custom';
  operator: 'greater_than' | 'less_than' | 'equals' | 'between' | 'crosses_above' | 'crosses_below';
  value: number | string;
  secondValue?: number; // For 'between' operator
  isActive: boolean;
  description: string;
  indicator?: {
    name: string;
    period: number;
    parameters: Record<string, any>;
  };
}

export interface TradeSchedule {
  type: 'immediate' | 'recurring' | 'conditional';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'hourly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  time?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  maxExecutions?: number;
  cooldownPeriod?: number; // minutes
}

export interface TradeExecution {
  id: string;
  scheduledTradeId: string;
  timestamp: string;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  quantity: number;
  price?: number;
  totalValue?: number;
  fees?: number;
  errorMessage?: string;
  executionTime?: number; // milliseconds
  orderId?: string;
  triggeredBy: string[];
  metadata: {
    marketConditions?: any;
    triggerValues?: Record<string, any>;
    slippage?: number;
    notes?: string;
  };
}

export interface TriggerAlert {
  id: string;
  scheduledTradeId: string;
  type: 'condition_met' | 'execution_failed' | 'execution_success' | 'schedule_updated' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface TriggerAnalytics {
  totalTrades: number;
  activeTrades: number;
  executedTrades: number;
  successRate: number;
  averageExecutionTime: number;
  totalVolume: number;
  totalValue: number;
  topPerformingConditions: Array<{
    type: string;
    successRate: number;
    executionCount: number;
  }>;
  executionsByDay: Array<{
    date: string;
    count: number;
    volume: number;
    value: number;
  }>;
  errorAnalysis: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

// Scheduled Trade Trigger Service Class
export class ScheduledTradeTriggerService {
  private baseUrl = '/api/trading/scheduled';

  // Fetch scheduled trades
  async getScheduledTrades(vaultId: string, options?: {
    status?: string;
    symbol?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    trades: ScheduledTrade[];
    total: number;
    analytics: TriggerAnalytics;
  }> {
    const params = new URLSearchParams();
    params.append('vaultId', vaultId);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scheduled trades');
    }
    
    return response.json();
  }

  // Get specific scheduled trade
  async getScheduledTrade(id: string): Promise<ScheduledTrade> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scheduled trade');
    }
    
    return response.json();
  }

  // Create new scheduled trade
  async createScheduledTrade(trade: Omit<ScheduledTrade, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'>): Promise<ScheduledTrade> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create scheduled trade');
    }
    
    return response.json();
  }

  // Update scheduled trade
  async updateScheduledTrade(id: string, updates: Partial<ScheduledTrade>): Promise<ScheduledTrade> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update scheduled trade');
    }
    
    return response.json();
  }

  // Delete scheduled trade
  async deleteScheduledTrade(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete scheduled trade');
    }
  }

  // Pause/Resume scheduled trade
  async toggleScheduledTrade(id: string, paused: boolean): Promise<ScheduledTrade> {
    const response = await fetch(`${this.baseUrl}/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle scheduled trade');
    }
    
    return response.json();
  }

  // Test trigger conditions
  async testTriggerConditions(id: string): Promise<{
    conditionResults: Array<{
      conditionId: string;
      met: boolean;
      currentValue: any;
      targetValue: any;
      description: string;
    }>;
    wouldExecute: boolean;
    reason: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${id}/test`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to test trigger conditions');
    }
    
    return response.json();
  }

  // Get execution history
  async getExecutionHistory(id: string, limit: number = 100): Promise<TradeExecution[]> {
    const response = await fetch(`${this.baseUrl}/${id}/executions?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution history');
    }
    
    return response.json();
  }

  // Get trigger alerts
  async getTriggerAlerts(vaultId: string, options?: {
    unreadOnly?: boolean;
    severity?: string;
    limit?: number;
  }): Promise<TriggerAlert[]> {
    const params = new URLSearchParams();
    params.append('vaultId', vaultId);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/alerts?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch trigger alerts');
    }
    
    return response.json();
  }

  // Mark alert as read
  async markAlertAsRead(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}/read`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark alert as read');
    }
  }

  // Get trade status color
  getTradeStatusColor(status: ScheduledTrade['status']): string {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'completed': return 'text-blue-600';
      case 'cancelled': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get trade status background
  getTradeStatusBackground(status: ScheduledTrade['status']): string {
    switch (status) {
      case 'active': return 'bg-green-50 border-green-200';
      case 'paused': return 'bg-yellow-50 border-yellow-200';
      case 'completed': return 'bg-blue-50 border-blue-200';
      case 'cancelled': return 'bg-gray-50 border-gray-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get execution status color
  getExecutionStatusColor(status: TradeExecution['status']): string {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'executed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get condition type icon
  getConditionTypeIcon(type: TriggerCondition['type']): string {
    switch (type) {
      case 'price': return 'dollar-sign';
      case 'volume': return 'bar-chart';
      case 'time': return 'clock';
      case 'indicator': return 'trending-up';
      case 'market_cap': return 'pie-chart';
      case 'custom': return 'settings';
      default: return 'help-circle';
    }
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Format volume
  formatVolume(volume: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(volume);
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

  // Calculate next execution time
  calculateNextExecution(schedule: TradeSchedule): Date | null {
    const now = new Date();
    
    if (schedule.type === 'immediate') {
      return now;
    }
    
    if (schedule.type === 'conditional') {
      return null; // Depends on conditions
    }
    
    if (schedule.type === 'recurring') {
      const next = new Date();
      
      switch (schedule.frequency) {
        case 'hourly':
          next.setHours(next.getHours() + (schedule.interval || 1));
          break;
        case 'daily':
          next.setDate(next.getDate() + (schedule.interval || 1));
          if (schedule.time) {
            const [hours, minutes] = schedule.time.split(':').map(Number);
            next.setHours(hours, minutes, 0, 0);
          }
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7 * (schedule.interval || 1));
          if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
            // Find next day in the week
            const currentDay = next.getDay();
            const nextDay = schedule.daysOfWeek.find(day => day > currentDay) || 
                           schedule.daysOfWeek[0] + 7;
            next.setDate(next.getDate() + (nextDay - currentDay));
          }
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + (schedule.interval || 1));
          if (schedule.daysOfMonth && schedule.daysOfMonth.length > 0) {
            next.setDate(schedule.daysOfMonth[0]);
          }
          break;
      }
      
      return next;
    }
    
    return null;
  }

  // Validate trigger condition
  validateTriggerCondition(condition: TriggerCondition): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!condition.type) {
      errors.push('Condition type is required');
    }
    
    if (!condition.operator) {
      errors.push('Operator is required');
    }
    
    if (condition.value === undefined || condition.value === null) {
      errors.push('Value is required');
    }
    
    if (condition.operator === 'between' && condition.secondValue === undefined) {
      errors.push('Second value is required for between operator');
    }
    
    if (condition.type === 'indicator' && !condition.indicator) {
      errors.push('Indicator configuration is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate trade schedule
  validateTradeSchedule(schedule: TradeSchedule): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!schedule.type) {
      errors.push('Schedule type is required');
    }
    
    if (schedule.type === 'recurring' && !schedule.frequency) {
      errors.push('Frequency is required for recurring schedules');
    }
    
    if (schedule.startDate && schedule.endDate) {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      if (start >= end) {
        errors.push('End date must be after start date');
      }
    }
    
    if (schedule.maxExecutions && schedule.maxExecutions <= 0) {
      errors.push('Max executions must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create default scheduled trade
  createDefaultScheduledTrade(vaultId: string): Omit<ScheduledTrade, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'> {
    return {
      vaultId,
      name: '',
      symbol: '',
      side: 'buy',
      orderType: 'market',
      quantity: 0,
      triggerConditions: [],
      schedule: {
        type: 'conditional',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      status: 'active',
      metadata: {
        tags: [],
        executionCount: 0
      }
    };
  }

  // Create default trigger condition
  createDefaultTriggerCondition(): TriggerCondition {
    return {
      id: crypto.randomUUID(),
      type: 'price',
      operator: 'greater_than',
      value: 0,
      isActive: true,
      description: ''
    };
  }

  // Filter scheduled trades
  filterScheduledTrades(trades: ScheduledTrade[], filters: {
    status?: string;
    symbol?: string;
    orderType?: string;
    search?: string;
  }): ScheduledTrade[] {
    return trades.filter(trade => {
      if (filters.status && filters.status !== 'all' && trade.status !== filters.status) {
        return false;
      }
      
      if (filters.symbol && trade.symbol !== filters.symbol) {
        return false;
      }
      
      if (filters.orderType && trade.orderType !== filters.orderType) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return trade.name.toLowerCase().includes(searchLower) ||
               trade.symbol.toLowerCase().includes(searchLower) ||
               trade.metadata.notes?.toLowerCase().includes(searchLower) ||
               trade.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower));
      }
      
      return true;
    });
  }

  // Sort scheduled trades
  sortScheduledTrades(trades: ScheduledTrade[], sortBy: 'name' | 'symbol' | 'status' | 'nextExecution' | 'createdAt', order: 'asc' | 'desc' = 'asc'): ScheduledTrade[] {
    return [...trades].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'symbol':
          compareValue = a.symbol.localeCompare(b.symbol);
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'nextExecution':
          const aNext = a.nextExecution ? new Date(a.nextExecution).getTime() : 0;
          const bNext = b.nextExecution ? new Date(b.nextExecution).getTime() : 0;
          compareValue = aNext - bNext;
          break;
        case 'createdAt':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Calculate trade success rate
  calculateSuccessRate(executions: TradeExecution[]): number {
    if (executions.length === 0) return 0;
    
    const successfulExecutions = executions.filter(exec => exec.status === 'executed').length;
    return (successfulExecutions / executions.length) * 100;
  }

  // Get unique symbols
  getUniqueSymbols(trades: ScheduledTrade[]): string[] {
    return [...new Set(trades.map(trade => trade.symbol))].sort();
  }

  // Get unique strategies
  getUniqueStrategies(trades: ScheduledTrade[]): string[] {
    const strategies = trades.map(trade => trade.metadata.strategy).filter(Boolean);
    return [...new Set(strategies)].sort();
  }

  // Generate trade summary
  generateTradeSummary(trades: ScheduledTrade[]): {
    totalTrades: number;
    activeTrades: number;
    pausedTrades: number;
    completedTrades: number;
    totalExecutions: number;
    totalValue: number;
    avgSuccessRate: number;
    topSymbols: Array<{ symbol: string; count: number }>;
  } {
    const activeTrades = trades.filter(t => t.status === 'active').length;
    const pausedTrades = trades.filter(t => t.status === 'paused').length;
    const completedTrades = trades.filter(t => t.status === 'completed').length;
    
    const totalExecutions = trades.reduce((sum, trade) => 
      sum + trade.metadata.executionCount, 0);
    
    const totalValue = trades.reduce((sum, trade) => 
      sum + (trade.metadata.totalValue || 0), 0);
    
    const avgSuccessRate = trades.length > 0 
      ? trades.reduce((sum, trade) => {
          const executions = trade.executionHistory;
          const successRate = executions.length > 0 
            ? executions.filter(e => e.status === 'executed').length / executions.length 
            : 0;
          return sum + successRate;
        }, 0) / trades.length
      : 0;
    
    const symbolCounts = trades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSymbols = Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalTrades: trades.length,
      activeTrades,
      pausedTrades,
      completedTrades,
      totalExecutions,
      totalValue,
      avgSuccessRate,
      topSymbols
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'trade_status_toggled' | 'trade_edited' | 'trade_deleted' | 'trades_filtered' | 'trigger_tested' | 'trade_created',
    tradeData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-23-scheduled-trade-trigger',
        timestamp: new Date().toISOString(),
        userId: tradeData.userId,
        vaultId: tradeData.vaultId,
        data: {
          ...tradeData.metadata
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

  // Business Logic Extraction Methods

  // Trade Status Operations
  async handleStatusToggle(
    tradeId: string,
    currentStatus: string,
    activeVaultId?: string,
    userId?: string,
    vaultId?: string
  ): Promise<{
    success: boolean;
    newStatus: string;
    error?: string;
  }> {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      
      const url = activeVaultId 
        ? `/api/user/scheduled-trades?vaultId=${activeVaultId}`
        : '/api/user/scheduled-trades';
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tradeId, status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to update trade');

      // Log the status toggle
      if (userId) {
        await this.logAgentMemory('trade_status_toggled', {
          userId,
          vaultId,
          metadata: {
            tradeId,
            oldStatus: currentStatus,
            newStatus
          }
        });
      }

      return {
        success: true,
        newStatus,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        newStatus: currentStatus,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Trade Update Operations
  async handleTradeUpdate(
    update: any,
    activeVaultId?: string,
    userId?: string,
    vaultId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const url = activeVaultId 
        ? `/api/user/scheduled-trades?vaultId=${activeVaultId}`
        : '/api/user/scheduled-trades';
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      
      if (!res.ok) throw new Error('Failed to update trade');

      // Log the trade edit
      if (userId) {
        await this.logAgentMemory('trade_edited', {
          userId,
          vaultId,
          metadata: {
            tradeId: update.id,
            updatedFields: Object.keys(update).filter(key => key !== 'id'),
            triggerType: update.triggerType
          }
        });
      }

      return {
        success: true,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Trade Delete Operations
  async handleTradeDelete(
    tradeId: string,
    activeVaultId?: string,
    userId?: string,
    vaultId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const url = activeVaultId 
        ? `/api/user/scheduled-trades/${tradeId}?vaultId=${activeVaultId}`
        : `/api/user/scheduled-trades/${tradeId}`;
      
      const res = await fetch(url, { method: 'DELETE' });
      
      if (!res.ok) throw new Error('Failed to delete trade');

      // Log the trade deletion
      if (userId) {
        await this.logAgentMemory('trade_deleted', {
          userId,
          vaultId,
          metadata: {
            tradeId,
            action: 'delete_confirmed'
          }
        });
      }

      return {
        success: true,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Filter Management
  async handleFilterChange(
    filterType: 'status' | 'action',
    filterValue: string,
    totalTrades: number,
    filteredCount: number,
    userId?: string,
    vaultId?: string
  ): Promise<void> {
    // Log the filter change
    if (userId) {
      await this.logAgentMemory('trades_filtered', {
        userId,
        vaultId,
        metadata: {
          filterType,
          filterValue,
          totalTrades,
          filteredCount
        }
      });
    }
  }

  // Trade Form Validation
  validateTradeForm(trade: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!trade.asset?.trim()) {
      errors.push('Asset is required');
    }
    
    if (!trade.action) {
      errors.push('Action (buy/sell) is required');
    }
    
    if (!trade.triggerType) {
      errors.push('Trigger type is required');
    }
    
    if (trade.triggerType === 'price' && (!trade.targetPrice || trade.targetPrice <= 0)) {
      errors.push('Target price must be greater than 0');
    }
    
    if (trade.triggerType === 'indicator' && (!trade.indicator || !trade.indicatorValue)) {
      errors.push('Indicator and value are required');
    }
    
    if (trade.triggerType === 'date' && !trade.scheduledFor) {
      errors.push('Scheduled date is required');
    }
    
    if (!trade.amount || trade.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Trade Form Management
  prepareTradeForEdit(trade: any): any {
    return {
      id: trade.id,
      triggerType: trade.triggerType,
      targetPrice: trade.targetPrice,
      condition: trade.condition,
      indicator: trade.indicator,
      indicatorValue: trade.indicatorValue,
      amount: trade.amount,
      scheduledFor: trade.scheduledFor,
    };
  }

  // Delete Confirmation Management
  handleDeleteConfirmation(tradeId: string, tradeAsset: string): {
    confirmed: boolean;
    message: string;
  } {
    const confirmed = window.confirm(`Are you sure you want to delete the scheduled trade for ${tradeAsset}? This action cannot be undone.`);
    
    return {
      confirmed,
      message: confirmed ? 'Trade will be deleted' : 'Deletion cancelled'
    };
  }

  // Summary Statistics Calculation
  calculateSummaryStats(trades: any[]): {
    total: number;
    active: number;
    triggered: number;
    paused: number;
    cancelled: number;
    expired: number;
  } {
    return {
      total: trades.length,
      active: trades.filter(t => t.status === 'active').length,
      triggered: trades.filter(t => t.status === 'triggered').length,
      paused: trades.filter(t => t.status === 'paused').length,
      cancelled: trades.filter(t => t.status === 'cancelled').length,
      expired: trades.filter(t => t.status === 'expired').length
    };
  }

  // Filter Application
  applyFilters(trades: any[], statusFilter: string, actionFilter: string): any[] {
    return trades.filter(trade => {
      const statusMatch = statusFilter === 'all' || trade.status === statusFilter;
      const actionMatch = actionFilter === 'all' || trade.action === actionFilter;
      return statusMatch && actionMatch;
    });
  }

  // Price Analysis
  getPriceComparison(trade: any): {
    diff: string;
    percentDiff: string;
    isClose: boolean;
    willTrigger: boolean;
  } | null {
    if (trade.triggerType !== 'price' || !trade.targetPrice || !trade.currentPrice) {
      return null;
    }
    
    const diff = trade.currentPrice - trade.targetPrice;
    const percentDiff = (diff / trade.targetPrice) * 100;
    const isClose = Math.abs(percentDiff) < 5; // Within 5%
    
    return {
      diff: diff.toFixed(2),
      percentDiff: percentDiff.toFixed(1),
      isClose,
      willTrigger: trade.action === 'buy' ? diff <= 0 : diff >= 0
    };
  }

  // Condition Formatting
  formatCondition(trade: any): string {
    switch (trade.triggerType) {
      case 'price':
        return `${trade.action === 'buy' ? 'When price ≤' : 'When price ≥'} ${this.formatCurrency(trade.targetPrice || 0)}`;
      case 'indicator':
        return `When ${trade.indicator} ${trade.condition} ${trade.indicatorValue}`;
      case 'date':
        return `On ${trade.scheduledFor ? new Date(trade.scheduledFor).toLocaleDateString() : 'N/A'}`;
      default:
        return 'Unknown condition';
    }
  }

  // UI Badge Helpers
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'triggered': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Format Price Helper
  formatPrice(price: number | undefined): string {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  }
}

// Service instance
export const scheduledTradeTriggerService = new ScheduledTradeTriggerService();

// React Query hooks
export const useScheduledTrades = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/trading/scheduled', vaultId, options],
    queryFn: () => scheduledTradeTriggerService.getScheduledTrades(vaultId, options),
    enabled: !!vaultId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useScheduledTrade = (id: string) => {
  return useQuery({
    queryKey: ['/api/trading/scheduled', id],
    queryFn: () => scheduledTradeTriggerService.getScheduledTrade(id),
    enabled: !!id,
  });
};

export const useCreateScheduledTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trade: Omit<ScheduledTrade, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'>) => 
      scheduledTradeTriggerService.createScheduledTrade(trade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/scheduled'] });
    },
  });
};

export const useUpdateScheduledTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduledTrade> }) => 
      scheduledTradeTriggerService.updateScheduledTrade(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/scheduled'] });
    },
  });
};

export const useDeleteScheduledTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      scheduledTradeTriggerService.deleteScheduledTrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/scheduled'] });
    },
  });
};

export const useToggleScheduledTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => 
      scheduledTradeTriggerService.toggleScheduledTrade(id, paused),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/scheduled'] });
    },
  });
};

export const useTestTriggerConditions = () => {
  return useMutation({
    mutationFn: (id: string) => 
      scheduledTradeTriggerService.testTriggerConditions(id),
  });
};

export const useExecutionHistory = (id: string, limit: number = 100) => {
  return useQuery({
    queryKey: ['/api/trading/scheduled', id, 'executions', limit],
    queryFn: () => scheduledTradeTriggerService.getExecutionHistory(id, limit),
    enabled: !!id,
  });
};

export const useTriggerAlerts = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/trading/scheduled/alerts', vaultId, options],
    queryFn: () => scheduledTradeTriggerService.getTriggerAlerts(vaultId, options),
    enabled: !!vaultId,
    refetchInterval: 30000,
  });
};

export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      scheduledTradeTriggerService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/scheduled/alerts'] });
    },
  });
}; 