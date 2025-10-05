import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Execution Delay Buffer
export interface DelayBuffer {
  id: string;
  vaultId: string;
  name: string;
  description: string;
  isActive: boolean;
  delayType: 'fixed' | 'dynamic' | 'market_condition' | 'volatility_based' | 'custom';
  bufferSettings: BufferSettings;
  conditions: DelayCondition[];
  executionRules: ExecutionRule[];
  statistics: DelayStatistics;
  createdAt: string;
  updatedAt: string;
}

export interface BufferSettings {
  baseDelay: number; // minutes
  maxDelay: number; // minutes
  minDelay: number; // minutes
  scalingFactor: number;
  randomization: {
    enabled: boolean;
    maxVariation: number; // percentage
  };
  timeWindows: Array<{
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
    delayMultiplier: number;
  }>;
  marketConditions: {
    highVolatility: { threshold: number; delayMultiplier: number };
    lowLiquidity: { threshold: number; delayMultiplier: number };
    marketOpen: { delayMultiplier: number };
    marketClose: { delayMultiplier: number };
  };
}

export interface DelayCondition {
  id: string;
  name: string;
  type: 'symbol' | 'order_size' | 'volatility' | 'spread' | 'volume' | 'time' | 'price_change' | 'custom';
  operator: 'greater_than' | 'less_than' | 'equals' | 'between' | 'in_list';
  value: any;
  secondValue?: any; // For 'between' operator
  action: 'extend_delay' | 'reduce_delay' | 'cancel_order' | 'split_order' | 'alert';
  delayAdjustment: number; // minutes or percentage
  isActive: boolean;
  priority: number;
}

export interface ExecutionRule {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[]; // DelayCondition IDs
  executionStrategy: 'immediate' | 'twap' | 'vwap' | 'iceberg' | 'pov' | 'custom';
  parameters: {
    participationRate?: number; // percentage
    timeHorizon?: number; // minutes
    maxSlice?: number; // percentage of total order
    priceImprovement?: number; // basis points
    aggressiveness?: 'passive' | 'neutral' | 'aggressive';
  };
  riskLimits: {
    maxSlippage: number; // percentage
    maxImpact: number; // percentage
    maxOrderValue: number; // USD
    maxPositionSize: number; // percentage of portfolio
  };
  isActive: boolean;
}

export interface PendingExecution {
  id: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  originalDelay: number;
  adjustedDelay: number;
  remainingDelay: number;
  status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed';
  scheduledTime: string;
  submittedTime?: string;
  completedTime?: string;
  appliedConditions: string[];
  executionStrategy: string;
  metadata: {
    originalPrice?: number;
    executionPrice?: number;
    slippage?: number;
    impact?: number;
    fees?: number;
    partialFills?: Array<{
      quantity: number;
      price: number;
      timestamp: string;
    }>;
  };
}

export interface DelayStatistics {
  totalExecutions: number;
  averageDelay: number;
  medianDelay: number;
  delayDistribution: Array<{ range: string; count: number; percentage: number }>;
  executionSuccess: {
    completed: number;
    cancelled: number;
    failed: number;
    successRate: number;
  };
  performanceMetrics: {
    averageSlippage: number;
    averageImpact: number;
    averageFees: number;
    timeWeightedReturn: number;
    informationRatio: number;
  };
  conditionTriggers: Array<{
    conditionId: string;
    triggerCount: number;
    avgAdjustment: number;
    successRate: number;
  }>;
}

export interface DelayAlert {
  id: string;
  type: 'delay_exceeded' | 'condition_triggered' | 'execution_failed' | 'high_slippage' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  executionId: string;
  title: string;
  description: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  isRead: boolean;
  isActive: boolean;
  actionTaken?: string;
}

export interface MarketCondition {
  timestamp: string;
  symbol: string;
  volatility: number;
  spread: number;
  volume: number;
  price: number;
  marketPhase: 'pre_market' | 'open' | 'regular' | 'close' | 'after_hours';
  liquidityScore: number;
  impactCost: number;
}

// Execution Delay Buffer Service Class
export class ExecutionDelayBufferService {
  private baseUrl = '/api/execution/delay-buffer';

  // Get delay buffers for vault
  async getDelayBuffers(vaultId: string): Promise<{
    buffers: DelayBuffer[];
    activeBuffer?: DelayBuffer;
    summary: {
      totalBuffers: number;
      activeBuffers: number;
      averageDelay: number;
      totalPendingExecutions: number;
    };
  }> {
    const response = await fetch(`${this.baseUrl}?vaultId=${vaultId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch delay buffers');
    }
    
    return response.json();
  }

  // Get specific delay buffer
  async getDelayBuffer(id: string): Promise<DelayBuffer> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch delay buffer');
    }
    
    return response.json();
  }

  // Create delay buffer
  async createDelayBuffer(buffer: Omit<DelayBuffer, 'id' | 'statistics' | 'createdAt' | 'updatedAt'>): Promise<DelayBuffer> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buffer),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create delay buffer');
    }
    
    return response.json();
  }

  // Update delay buffer
  async updateDelayBuffer(id: string, updates: Partial<DelayBuffer>): Promise<DelayBuffer> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update delay buffer');
    }
    
    return response.json();
  }

  // Delete delay buffer
  async deleteDelayBuffer(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete delay buffer');
    }
  }

  // Get pending executions
  async getPendingExecutions(vaultId: string, options?: {
    status?: string;
    symbol?: string;
    limit?: number;
  }): Promise<{
    executions: PendingExecution[];
    total: number;
    summary: {
      totalPending: number;
      avgRemainingDelay: number;
      nextExecution?: string;
      urgentExecutions: number;
    };
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
    
    const response = await fetch(`${this.baseUrl}/executions?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pending executions');
    }
    
    return response.json();
  }

  // Cancel pending execution
  async cancelPendingExecution(id: string, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/executions/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel pending execution');
    }
  }

  // Force execute pending execution
  async forceExecutePending(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/executions/${id}/force`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to force execute pending execution');
    }
  }

  // Test delay calculation
  async testDelayCalculation(bufferId: string, testOrder: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: string;
    currentPrice: number;
  }): Promise<{
    baseDelay: number;
    adjustedDelay: number;
    appliedConditions: Array<{
      conditionId: string;
      conditionName: string;
      adjustment: number;
      reason: string;
    }>;
    finalDelay: number;
    executionStrategy: string;
    estimatedSlippage: number;
    riskAssessment: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${bufferId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrder),
    });
    
    if (!response.ok) {
      throw new Error('Failed to test delay calculation');
    }
    
    return response.json();
  }

  // Get delay alerts
  async getDelayAlerts(vaultId: string, options?: {
    unreadOnly?: boolean;
    severity?: string;
    type?: string;
    limit?: number;
  }): Promise<DelayAlert[]> {
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
      throw new Error('Failed to fetch delay alerts');
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

  // Get market conditions
  async getMarketConditions(symbol: string): Promise<MarketCondition> {
    const response = await fetch(`${this.baseUrl}/market-conditions?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market conditions');
    }
    
    return response.json();
  }

  // Get delay type color
  getDelayTypeColor(type: DelayBuffer['delayType']): string {
    switch (type) {
      case 'fixed': return 'text-blue-600';
      case 'dynamic': return 'text-green-600';
      case 'market_condition': return 'text-orange-600';
      case 'volatility_based': return 'text-red-600';
      case 'custom': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  }

  // Get execution status color
  getExecutionStatusColor(status: PendingExecution['status']): string {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'executing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get condition action color
  getConditionActionColor(action: DelayCondition['action']): string {
    switch (action) {
      case 'extend_delay': return 'text-orange-600';
      case 'reduce_delay': return 'text-green-600';
      case 'cancel_order': return 'text-red-600';
      case 'split_order': return 'text-blue-600';
      case 'alert': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  // Get alert severity color
  getAlertSeverityColor(severity: DelayAlert['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format delay time
  formatDelayTime(minutes: number): string {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Calculate delay adjustment
  calculateDelayAdjustment(baseDelay: number, conditions: DelayCondition[], marketCondition: MarketCondition): {
    adjustedDelay: number;
    appliedConditions: string[];
    adjustments: Array<{ conditionId: string; adjustment: number; reason: string }>;
  } {
    let adjustedDelay = baseDelay;
    const appliedConditions: string[] = [];
    const adjustments: Array<{ conditionId: string; adjustment: number; reason: string }> = [];
    
    // Sort conditions by priority
    const sortedConditions = [...conditions]
      .filter(c => c.isActive)
      .sort((a, b) => a.priority - b.priority);
    
    for (const condition of sortedConditions) {
      const { shouldApply, reason } = this.evaluateCondition(condition, marketCondition);
      
      if (shouldApply) {
        let adjustment = 0;
        
        if (condition.action === 'extend_delay') {
          adjustment = condition.delayAdjustment;
          adjustedDelay += adjustment;
        } else if (condition.action === 'reduce_delay') {
          adjustment = -condition.delayAdjustment;
          adjustedDelay = Math.max(0, adjustedDelay - condition.delayAdjustment);
        }
        
        appliedConditions.push(condition.id);
        adjustments.push({
          conditionId: condition.id,
          adjustment,
          reason
        });
      }
    }
    
    return { adjustedDelay, appliedConditions, adjustments };
  }

  // Evaluate delay condition
  private evaluateCondition(condition: DelayCondition, marketCondition: MarketCondition): {
    shouldApply: boolean;
    reason: string;
  } {
    let currentValue: any;
    let reason = '';
    
    switch (condition.type) {
      case 'volatility':
        currentValue = marketCondition.volatility;
        reason = `Volatility: ${(currentValue * 100).toFixed(2)}%`;
        break;
      case 'spread':
        currentValue = marketCondition.spread;
        reason = `Spread: ${(currentValue * 100).toFixed(2)}%`;
        break;
      case 'volume':
        currentValue = marketCondition.volume;
        reason = `Volume: ${currentValue.toLocaleString()}`;
        break;
      case 'time':
        currentValue = new Date().getHours();
        reason = `Time: ${currentValue}:00`;
        break;
      default:
        return { shouldApply: false, reason: 'Unknown condition type' };
    }
    
    let shouldApply = false;
    
    switch (condition.operator) {
      case 'greater_than':
        shouldApply = currentValue > condition.value;
        break;
      case 'less_than':
        shouldApply = currentValue < condition.value;
        break;
      case 'equals':
        shouldApply = currentValue === condition.value;
        break;
      case 'between':
        shouldApply = currentValue >= condition.value && currentValue <= (condition.secondValue || 0);
        break;
    }
    
    return { shouldApply, reason };
  }

  // Validate delay buffer configuration
  validateDelayBuffer(buffer: DelayBuffer): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!buffer.name.trim()) {
      errors.push('Buffer name is required');
    }
    
    if (buffer.bufferSettings.baseDelay < 0) {
      errors.push('Base delay cannot be negative');
    }
    
    if (buffer.bufferSettings.maxDelay < buffer.bufferSettings.baseDelay) {
      errors.push('Max delay cannot be less than base delay');
    }
    
    if (buffer.bufferSettings.minDelay > buffer.bufferSettings.baseDelay) {
      errors.push('Min delay cannot be greater than base delay');
    }
    
    if (buffer.bufferSettings.scalingFactor < 0 || buffer.bufferSettings.scalingFactor > 10) {
      errors.push('Scaling factor must be between 0 and 10');
    }
    
    if (buffer.bufferSettings.randomization.enabled && 
        (buffer.bufferSettings.randomization.maxVariation < 0 || 
         buffer.bufferSettings.randomization.maxVariation > 100)) {
      errors.push('Max variation must be between 0% and 100%');
    }
    
    // Validate conditions
    buffer.conditions.forEach((condition, index) => {
      if (!condition.name.trim()) {
        errors.push(`Condition ${index + 1}: Name is required`);
      }
      
      if (condition.delayAdjustment < 0) {
        errors.push(`Condition ${index + 1}: Delay adjustment cannot be negative`);
      }
    });
    
    // Validate execution rules
    buffer.executionRules.forEach((rule, index) => {
      if (!rule.name.trim()) {
        errors.push(`Execution rule ${index + 1}: Name is required`);
      }
      
      if (rule.parameters.participationRate && 
          (rule.parameters.participationRate <= 0 || rule.parameters.participationRate > 100)) {
        errors.push(`Execution rule ${index + 1}: Participation rate must be between 0% and 100%`);
      }
      
      if (rule.riskLimits.maxSlippage < 0) {
        errors.push(`Execution rule ${index + 1}: Max slippage cannot be negative`);
      }
    });
    
    // Warnings
    if (buffer.bufferSettings.baseDelay > 60) {
      warnings.push('Base delay is quite long (over 1 hour)');
    }
    
    if (buffer.conditions.length === 0) {
      warnings.push('No delay conditions configured');
    }
    
    if (buffer.executionRules.length === 0) {
      warnings.push('No execution rules configured');
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Create default delay buffer
  createDefaultDelayBuffer(vaultId: string): Omit<DelayBuffer, 'id' | 'statistics' | 'createdAt' | 'updatedAt'> {
    return {
      vaultId,
      name: '',
      description: '',
      isActive: false,
      delayType: 'dynamic',
      bufferSettings: {
        baseDelay: 5, // 5 minutes
        maxDelay: 60, // 1 hour
        minDelay: 1, // 1 minute
        scalingFactor: 1.5,
        randomization: {
          enabled: false,
          maxVariation: 10
        },
        timeWindows: [],
        marketConditions: {
          highVolatility: { threshold: 0.02, delayMultiplier: 2 },
          lowLiquidity: { threshold: 0.1, delayMultiplier: 1.5 },
          marketOpen: { delayMultiplier: 1.2 },
          marketClose: { delayMultiplier: 1.3 }
        }
      },
      conditions: [],
      executionRules: []
    };
  }

  // Create default delay condition
  createDefaultDelayCondition(): DelayCondition {
    return {
      id: crypto.randomUUID(),
      name: '',
      type: 'volatility',
      operator: 'greater_than',
      value: 0.02,
      action: 'extend_delay',
      delayAdjustment: 5,
      isActive: true,
      priority: 1
    };
  }

  // Create default execution rule
  createDefaultExecutionRule(): ExecutionRule {
    return {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      triggerConditions: [],
      executionStrategy: 'twap',
      parameters: {
        participationRate: 10,
        timeHorizon: 30,
        maxSlice: 5,
        aggressiveness: 'neutral'
      },
      riskLimits: {
        maxSlippage: 0.5,
        maxImpact: 1,
        maxOrderValue: 10000,
        maxPositionSize: 5
      },
      isActive: true
    };
  }

  // Calculate execution efficiency
  calculateExecutionEfficiency(executions: PendingExecution[]): {
    completionRate: number;
    averageSlippage: number;
    averageDelayTime: number;
    costEfficiency: number;
    timeEfficiency: number;
    overallScore: number;
  } {
    if (executions.length === 0) {
      return {
        completionRate: 0,
        averageSlippage: 0,
        averageDelayTime: 0,
        costEfficiency: 0,
        timeEfficiency: 0,
        overallScore: 0
      };
    }
    
    const completedExecutions = executions.filter(e => e.status === 'completed');
    const completionRate = (completedExecutions.length / executions.length) * 100;
    
    const averageSlippage = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.metadata.slippage || 0), 0) / completedExecutions.length
      : 0;
    
    const averageDelayTime = executions.reduce((sum, e) => sum + e.adjustedDelay, 0) / executions.length;
    
    // Calculate efficiency scores (0-100)
    const costEfficiency = Math.max(0, 100 - (averageSlippage * 1000)); // Convert to basis points
    const timeEfficiency = Math.max(0, 100 - (averageDelayTime / 60 * 10)); // Penalize long delays
    
    const overallScore = (completionRate * 0.4) + (costEfficiency * 0.3) + (timeEfficiency * 0.3);
    
    return {
      completionRate,
      averageSlippage,
      averageDelayTime,
      costEfficiency,
      timeEfficiency,
      overallScore
    };
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

  // Get unique symbols from executions
  getUniqueSymbols(executions: PendingExecution[]): string[] {
    return [...new Set(executions.map(e => e.symbol))];
  }

  // Get available execution strategies
  getExecutionStrategies(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'immediate', label: 'Immediate', description: 'Execute immediately without delay' },
      { value: 'twap', label: 'TWAP', description: 'Time-weighted average price execution' },
      { value: 'vwap', label: 'VWAP', description: 'Volume-weighted average price execution' },
      { value: 'iceberg', label: 'Iceberg', description: 'Break large orders into smaller chunks' },
      { value: 'pov', label: 'POV', description: 'Participate in percentage of volume' },
      { value: 'custom', label: 'Custom', description: 'User-defined execution strategy' }
    ];
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'delay_configured' | 'execution_delayed' | 'buffer_bypassed' | 'delay_cancelled' | 'buffer_settings_changed' | 'filter_changed' | 'view_mode_changed' | 'data_refreshed',
    delayData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-26-execution-delay-buffer',
        timestamp: new Date().toISOString(),
        userId: delayData.userId,
        vaultId: delayData.vaultId,
        data: {
          ...delayData.metadata
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
export const executionDelayBufferService = new ExecutionDelayBufferService();

// React Query hooks
export const useDelayBuffers = (vaultId: string) => {
  return useQuery({
    queryKey: ['/api/execution/delay-buffer', vaultId],
    queryFn: () => executionDelayBufferService.getDelayBuffers(vaultId),
    enabled: !!vaultId,
  });
};

export const useDelayBuffer = (id: string) => {
  return useQuery({
    queryKey: ['/api/execution/delay-buffer', id],
    queryFn: () => executionDelayBufferService.getDelayBuffer(id),
    enabled: !!id,
  });
};

export const useCreateDelayBuffer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (buffer: any) => 
      executionDelayBufferService.createDelayBuffer(buffer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer'] });
    },
  });
};

export const useUpdateDelayBuffer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DelayBuffer> }) => 
      executionDelayBufferService.updateDelayBuffer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer'] });
    },
  });
};

export const useDeleteDelayBuffer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      executionDelayBufferService.deleteDelayBuffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer'] });
    },
  });
};

export const usePendingExecutions = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/execution/delay-buffer/executions', vaultId, options],
    queryFn: () => executionDelayBufferService.getPendingExecutions(vaultId, options),
    enabled: !!vaultId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCancelPendingExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      executionDelayBufferService.cancelPendingExecution(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer/executions'] });
    },
  });
};

export const useForceExecutePending = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      executionDelayBufferService.forceExecutePending(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer/executions'] });
    },
  });
};

export const useTestDelayCalculation = () => {
  return useMutation({
    mutationFn: ({ bufferId, testOrder }: { bufferId: string; testOrder: any }) => 
      executionDelayBufferService.testDelayCalculation(bufferId, testOrder),
  });
};

export const useDelayAlerts = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/execution/delay-buffer/alerts', vaultId, options],
    queryFn: () => executionDelayBufferService.getDelayAlerts(vaultId, options),
    enabled: !!vaultId,
    refetchInterval: 30000,
  });
};

export const useMarkDelayAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      executionDelayBufferService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution/delay-buffer/alerts'] });
    },
  });
};

export const useMarketConditions = (symbol: string) => {
  return useQuery({
    queryKey: ['/api/execution/delay-buffer/market-conditions', symbol],
    queryFn: () => executionDelayBufferService.getMarketConditions(symbol),
    enabled: !!symbol,
    refetchInterval: 60000, // Refresh every minute
  });
}; 