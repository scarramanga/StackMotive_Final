import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Auto Execution Engine
export interface ExecutionConstraint {
  id: string;
  type: 'max_trade_size' | 'min_confidence' | 'max_daily_trades' | 'time_window' | 'asset_blacklist' | 'signal_whitelist';
  value: any;
  enabled: boolean;
  description: string;
}

export interface SignalToExecute {
  id: string;
  ticker: string;
  signalType: 'buy' | 'sell' | 'hold';
  signalStrength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  source: string;
  overlayName?: string;
  targetPrice?: number;
  stopLoss?: number;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  metadata: {
    timeframe: string;
    analysis: Record<string, any>;
    technicalIndicators: Record<string, number>;
  };
}

export interface ExecutionRequest {
  id: string;
  signalId: string;
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  stopLoss?: number;
  takeProfit?: number;
  maxSlippage: number;
  estimatedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  constraints: {
    passed: ExecutionConstraint[];
    failed: ExecutionConstraint[];
  };
}

export interface ExecutionResult {
  id: string;
  requestId: string;
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'failed';
  executedQuantity: number;
  averagePrice: number;
  totalValue: number;
  fees: number;
  slippage: number;
  executionTime: string;
  brokerOrderId?: string;
  error?: string;
  fills: Array<{
    price: number;
    quantity: number;
    timestamp: string;
    feeRate: number;
  }>;
}

export interface ExecutionSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalVolume: number;
  totalFees: number;
  averageSlippage: number;
  topPerformingSignals: Array<{
    source: string;
    successRate: number;
    avgReturn: number;
    executionCount: number;
  }>;
  recentExecutions: ExecutionResult[];
}

export interface AutoExecutionStatus {
  isEnabled: boolean;
  isRunning: boolean;
  lastRun: string;
  nextRun: string;
  runInterval: number; // in seconds
  signalsMonitored: number;
  pendingExecutions: number;
  constraints: ExecutionConstraint[];
  performance: {
    uptime: number;
    successRate: number;
    avgExecutionTime: number;
    totalExecutions: number;
  };
  errors: Array<{
    timestamp: string;
    error: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ExecutionConfig {
  enabled: boolean;
  runInterval: number;
  maxConcurrentExecutions: number;
  defaultOrderType: 'market' | 'limit';
  defaultTimeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  maxSlippage: number;
  riskMode: 'conservative' | 'moderate' | 'aggressive';
  notifications: {
    onExecution: boolean;
    onError: boolean;
    onConstraintFailure: boolean;
  };
  constraints: ExecutionConstraint[];
}

export interface QueuedExecution {
  id: string;
  signalId: string;
  ticker: string;
  priority: 'low' | 'medium' | 'high';
  estimatedExecutionTime: string;
  constraintChecks: {
    passed: boolean;
    results: Array<{
      constraint: ExecutionConstraint;
      passed: boolean;
      message: string;
    }>;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  metadata: Record<string, any>;
}

// Auto Execution Engine Service Class
export class AutoExecutionEngineService {
  private baseUrl = '/api/auto-execution';

  // Get execution status
  async getExecutionStatus(userId: string): Promise<AutoExecutionStatus> {
    const response = await fetch(`${this.baseUrl}/status?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution status');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_status_loaded', {
      userId,
      isEnabled: result.isEnabled,
      isRunning: result.isRunning,
      signalsMonitored: result.signalsMonitored,
      pendingExecutions: result.pendingExecutions,
      successRate: result.performance.successRate,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Toggle execution engine
  async toggleExecutionEngine(userId: string, enabled: boolean): Promise<AutoExecutionStatus> {
    const response = await fetch(`${this.baseUrl}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, enabled }),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle execution engine');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_engine_toggled', {
      userId,
      enabled,
      previousState: !enabled,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get execution configuration
  async getExecutionConfig(userId: string): Promise<ExecutionConfig> {
    const response = await fetch(`${this.baseUrl}/config?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution configuration');
    }

    return response.json();
  }

  // Update execution configuration
  async updateExecutionConfig(userId: string, config: Partial<ExecutionConfig>): Promise<ExecutionConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...config }),
    });

    if (!response.ok) {
      throw new Error('Failed to update execution configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_config_updated', {
      userId,
      updatedFields: Object.keys(config),
      enabled: result.enabled,
      riskMode: result.riskMode,
      maxConcurrentExecutions: result.maxConcurrentExecutions,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get available signals for execution
  async getAvailableSignals(userId: string): Promise<SignalToExecute[]> {
    const response = await fetch(`${this.baseUrl}/signals?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch available signals');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('available_signals_loaded', {
      userId,
      signalCount: result.length,
      strongSignals: result.filter((s: SignalToExecute) => s.signalStrength === 'strong').length,
      buySignals: result.filter((s: SignalToExecute) => s.signalType === 'buy').length,
      sellSignals: result.filter((s: SignalToExecute) => s.signalType === 'sell').length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Validate execution constraints
  async validateConstraints(userId: string, signalId: string): Promise<{
    passed: boolean;
    results: Array<{
      constraint: ExecutionConstraint;
      passed: boolean;
      message: string;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/validate-constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, signalId }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate constraints');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('constraints_validated', {
      userId,
      signalId,
      overallPassed: result.passed,
      passedConstraints: result.results.filter((r: any) => r.passed).length,
      failedConstraints: result.results.filter((r: any) => !r.passed).length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Queue execution
  async queueExecution(userId: string, signalId: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<QueuedExecution> {
    const response = await fetch(`${this.baseUrl}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, signalId, priority }),
    });

    if (!response.ok) {
      throw new Error('Failed to queue execution');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_queued', {
      userId,
      signalId,
      queuedExecutionId: result.id,
      priority,
      ticker: result.ticker,
      constraintsPassed: result.constraintChecks.passed,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Execute trade (mock endpoint)
  async executeTrade(userId: string, request: ExecutionRequest): Promise<ExecutionResult> {
    const response = await fetch('/api/trade/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ticker: request.ticker,
        action: request.action,
        quantity: request.quantity,
        price: request.price,
        orderType: request.orderType,
        timeInForce: request.timeInForce,
        stopLoss: request.stopLoss,
        takeProfit: request.takeProfit,
        maxSlippage: request.maxSlippage,
        metadata: {
          signalId: request.signalId,
          autoExecution: true,
          engineVersion: '1.0.0'
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute trade');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('trade_executed', {
      userId,
      signalId: request.signalId,
      ticker: request.ticker,
      action: request.action,
      quantity: request.quantity,
      price: request.price,
      orderType: request.orderType,
      executionId: result.id,
      status: result.status,
      executedQuantity: result.executedQuantity,
      averagePrice: result.averagePrice,
      totalValue: result.totalValue,
      fees: result.fees,
      slippage: result.slippage,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get execution history
  async getExecutionHistory(userId: string, limit: number = 50): Promise<ExecutionResult[]> {
    const response = await fetch(`${this.baseUrl}/history?userId=${userId}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution history');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_history_loaded', {
      userId,
      executionCount: result.length,
      limit,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get execution summary
  async getExecutionSummary(userId: string): Promise<ExecutionSummary> {
    const response = await fetch(`${this.baseUrl}/summary?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution summary');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_summary_loaded', {
      userId,
      totalExecutions: result.totalExecutions,
      successfulExecutions: result.successfulExecutions,
      failedExecutions: result.failedExecutions,
      successRate: result.successfulExecutions / result.totalExecutions * 100,
      totalVolume: result.totalVolume,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get queue status
  async getQueueStatus(userId: string): Promise<QueuedExecution[]> {
    const response = await fetch(`${this.baseUrl}/queue/status?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch queue status');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('queue_status_loaded', {
      userId,
      queuedExecutions: result.length,
      processingExecutions: result.filter((q: QueuedExecution) => q.status === 'processing').length,
      failedExecutions: result.filter((q: QueuedExecution) => q.status === 'failed').length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Cancel queued execution
  async cancelQueuedExecution(userId: string, executionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/queue/${executionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel queued execution');
    }

    // Log agent memory
    await this.logAgentMemory('queued_execution_cancelled', {
      userId,
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  // Force run execution engine
  async forceRunEngine(userId: string): Promise<{ message: string; processed: number }> {
    const response = await fetch(`${this.baseUrl}/force-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to force run execution engine');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('execution_engine_forced', {
      userId,
      processedSignals: result.processed,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Utility Methods
  getStatusColor(status: ExecutionResult['status']): string {
    switch (status) {
      case 'filled': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      case 'cancelled': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getStatusBackground(status: ExecutionResult['status']): string {
    switch (status) {
      case 'filled': return 'bg-green-50 border-green-200';
      case 'partial': return 'bg-yellow-50 border-yellow-200';
      case 'pending': return 'bg-blue-50 border-blue-200';
      case 'cancelled': return 'bg-gray-50 border-gray-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getSignalStrengthColor(strength: SignalToExecute['signalStrength']): string {
    switch (strength) {
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'weak': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  getSignalTypeColor(type: SignalToExecute['signalType']): string {
    switch (type) {
      case 'buy': return 'text-green-600';
      case 'sell': return 'text-red-600';
      case 'hold': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  getPriorityColor(priority: QueuedExecution['priority']): string {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getRiskLevelColor(riskLevel: ExecutionRequest['riskLevel']): string {
    switch (riskLevel) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getConstraintTypeDescription(type: ExecutionConstraint['type']): string {
    switch (type) {
      case 'max_trade_size': return 'Maximum trade size per execution';
      case 'min_confidence': return 'Minimum signal confidence threshold';
      case 'max_daily_trades': return 'Maximum trades per day';
      case 'time_window': return 'Allowed trading time window';
      case 'asset_blacklist': return 'Blacklisted assets';
      case 'signal_whitelist': return 'Approved signal sources';
      default: return 'Unknown constraint type';
    }
  }

  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

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

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  calculateSuccessRate(total: number, successful: number): number {
    return total > 0 ? (successful / total) * 100 : 0;
  }

  calculateUptime(startTime: string): number {
    const now = new Date();
    const start = new Date(startTime);
    return Math.floor((now.getTime() - start.getTime()) / 1000);
  }

  // Business Logic Methods
  createDefaultConfig(): ExecutionConfig {
    return {
      enabled: false,
      runInterval: 300, // 5 minutes
      maxConcurrentExecutions: 5,
      defaultOrderType: 'limit',
      defaultTimeInForce: 'GTC',
      maxSlippage: 0.5,
      riskMode: 'moderate',
      notifications: {
        onExecution: true,
        onError: true,
        onConstraintFailure: true
      },
      constraints: [
        {
          id: 'max_trade_size',
          type: 'max_trade_size',
          value: 1000,
          enabled: true,
          description: 'Maximum $1,000 per trade'
        },
        {
          id: 'min_confidence',
          type: 'min_confidence',
          value: 0.75,
          enabled: true,
          description: 'Minimum 75% confidence'
        },
        {
          id: 'max_daily_trades',
          type: 'max_daily_trades',
          value: 20,
          enabled: true,
          description: 'Maximum 20 trades per day'
        }
      ]
    };
  }

  async handleToggleEngine(userId: string, currentState: boolean): Promise<{ success: boolean; error?: string; newState?: boolean }> {
    try {
      const result = await this.toggleExecutionEngine(userId, !currentState);
      return { success: true, newState: result.isEnabled };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle engine' };
    }
  }

  async handleConfigUpdate(userId: string, config: Partial<ExecutionConfig>): Promise<{ success: boolean; error?: string; result?: ExecutionConfig }> {
    try {
      const result = await this.updateExecutionConfig(userId, config);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update configuration' };
    }
  }

  async handleForceRun(userId: string): Promise<{ success: boolean; error?: string; processed?: number }> {
    try {
      const result = await this.forceRunEngine(userId);
      return { success: true, processed: result.processed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to force run engine' };
    }
  }

  async handleSignalExecution(userId: string, signalId: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<{ success: boolean; error?: string; result?: QueuedExecution }> {
    try {
      const result = await this.queueExecution(userId, signalId, priority);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to queue execution' };
    }
  }

  async handleCancelExecution(userId: string, executionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.cancelQueuedExecution(userId, executionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel execution' };
    }
  }

  // Validation Methods
  validateConfig(config: Partial<ExecutionConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.runInterval !== undefined && config.runInterval < 60) {
      errors.push('Run interval must be at least 60 seconds');
    }

    if (config.maxConcurrentExecutions !== undefined && config.maxConcurrentExecutions < 1) {
      errors.push('Maximum concurrent executions must be at least 1');
    }

    if (config.maxSlippage !== undefined && (config.maxSlippage < 0 || config.maxSlippage > 10)) {
      errors.push('Maximum slippage must be between 0% and 10%');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-44-auto-execution-engine',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const autoExecutionEngineService = new AutoExecutionEngineService();

// React Query hooks
export const useExecutionStatus = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/status', userId],
    queryFn: () => autoExecutionEngineService.getExecutionStatus(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // 30 seconds
  });
};

export const useExecutionConfig = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/config', userId],
    queryFn: () => autoExecutionEngineService.getExecutionConfig(userId!),
    enabled: !!userId,
  });
};

export const useToggleExecutionEngine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      autoExecutionEngineService.toggleExecutionEngine(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/status'] });
    },
  });
};

export const useUpdateExecutionConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, config }: { userId: string; config: Partial<ExecutionConfig> }) =>
      autoExecutionEngineService.updateExecutionConfig(userId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/status'] });
    },
  });
};

export const useAvailableSignals = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/signals', userId],
    queryFn: () => autoExecutionEngineService.getAvailableSignals(userId!),
    enabled: !!userId,
    refetchInterval: 60000, // 1 minute
  });
};

export const useQueueExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, signalId, priority }: { userId: string; signalId: string; priority: 'low' | 'medium' | 'high' }) =>
      autoExecutionEngineService.queueExecution(userId, signalId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/status'] });
    },
  });
};

export const useExecutionHistory = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/history', userId],
    queryFn: () => autoExecutionEngineService.getExecutionHistory(userId!),
    enabled: !!userId,
  });
};

export const useExecutionSummary = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/summary', userId],
    queryFn: () => autoExecutionEngineService.getExecutionSummary(userId!),
    enabled: !!userId,
    refetchInterval: 300000, // 5 minutes
  });
};

export const useQueueStatus = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/auto-execution/queue/status', userId],
    queryFn: () => autoExecutionEngineService.getQueueStatus(userId!),
    enabled: !!userId,
    refetchInterval: 10000, // 10 seconds
  });
};

export const useForceRunEngine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      autoExecutionEngineService.forceRunEngine(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-execution/history'] });
    },
  });
}; 