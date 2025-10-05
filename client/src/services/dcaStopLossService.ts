import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for DCA configuration
export interface DCARule {
  id: string;
  userId: string;
  vaultId?: string;
  name: string;
  symbol: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  
  // DCA Configuration
  dcaType: 'time_based' | 'trigger_based';
  
  // Time-based DCA
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  amount: number;
  currency: string;
  
  // Trigger-based DCA
  trigger?: {
    type: 'price_drop' | 'rsi_oversold' | 'moving_average' | 'volatility_spike';
    condition: 'below' | 'above' | 'crosses_below' | 'crosses_above';
    value: number;
    basePrice?: number; // For price drop triggers
    timeframe?: '1h' | '4h' | '1d' | '1w';
  };
  
  // Execution settings
  executionSettings: {
    maxExecutions?: number;
    cooldownPeriod: number; // minutes
    slippageTolerance: number; // percentage
    maxAllocation?: number; // percentage of portfolio
    minOrderSize: number;
    maxOrderSize: number;
  };
  
  // Status tracking
  nextExecution?: string;
  lastExecution?: string;
  executionCount: number;
  totalInvested: number;
  avgPrice: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Types for Stop-Loss configuration
export interface StopLossRule {
  id: string;
  userId: string;
  vaultId?: string;
  name: string;
  symbol: string;
  status: 'active' | 'triggered' | 'paused' | 'cancelled';
  
  // Stop-Loss Configuration
  stopLossType: 'percentage' | 'fixed_price' | 'trailing' | 'time_based';
  
  // Trigger settings
  triggerPrice?: number;
  triggerPercent?: number;
  trailingPercent?: number;
  
  // Execution settings
  executionMethod: 'market' | 'limit' | 'alert_only';
  sellPercentage: number; // percentage of holding to sell
  limitPriceOffset?: number; // for limit orders
  
  // Time-based settings
  maxHoldTime?: number; // days
  
  // Status tracking
  entryPrice?: number;
  currentPrice?: number;
  highestPrice?: number; // for trailing stops
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Combined execution history
export interface ExecutionHistory {
  id: string;
  ruleId: string;
  ruleType: 'dca' | 'stop_loss';
  executionTime: string;
  action: 'buy' | 'sell' | 'alert';
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  fees: number;
  status: 'completed' | 'failed' | 'cancelled';
  triggerReason: string;
  slippage?: number;
  error?: string;
}

// Summary statistics
export interface DCAStopLossSummary {
  totalDCARules: number;
  activeDCARules: number;
  totalStopLossRules: number;
  activeStopLossRules: number;
  totalInvested: number;
  totalExecutions: number;
  avgDCAPrice: number;
  unrealizedPnL: number;
}

// Combined response
export interface DCAStopLossResponse {
  dcaRules: DCARule[];
  stopLossRules: StopLossRule[];
  executionHistory: ExecutionHistory[];
  summary: DCAStopLossSummary;
  lastUpdated: string;
}

// Service class for DCA and Stop-Loss operations
export class DCAStopLossService {
  private baseUrl = '/api/trade-automation';

  // DCA Operations
  async getDCARules(userId: string, vaultId?: string): Promise<DCARule[]> {
    const params = new URLSearchParams({ userId });
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/dca?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch DCA rules: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createDCARule(rule: Omit<DCARule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'totalInvested' | 'avgPrice'>): Promise<DCARule> {
    const response = await fetch(`${this.baseUrl}/dca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create DCA rule: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateDCARule(ruleId: string, updates: Partial<DCARule>): Promise<DCARule> {
    const response = await fetch(`${this.baseUrl}/dca/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update DCA rule: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteDCARule(ruleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/dca/${ruleId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete DCA rule: ${response.statusText}`);
    }
  }

  // Stop-Loss Operations
  async getStopLossRules(userId: string, vaultId?: string): Promise<StopLossRule[]> {
    const params = new URLSearchParams({ userId });
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/stoploss?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stop-loss rules: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createStopLossRule(rule: Omit<StopLossRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<StopLossRule> {
    const response = await fetch(`${this.baseUrl}/stoploss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create stop-loss rule: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateStopLossRule(ruleId: string, updates: Partial<StopLossRule>): Promise<StopLossRule> {
    const response = await fetch(`${this.baseUrl}/stoploss/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update stop-loss rule: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteStopLossRule(ruleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/stoploss/${ruleId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete stop-loss rule: ${response.statusText}`);
    }
  }

  // Combined operations
  async getAllRules(userId: string, vaultId?: string): Promise<DCAStopLossResponse> {
    const params = new URLSearchParams({ userId });
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/all?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rules: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getExecutionHistory(userId: string, limit: number = 50): Promise<ExecutionHistory[]> {
    const params = new URLSearchParams({ userId, limit: limit.toString() });
    
    const response = await fetch(`${this.baseUrl}/history?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch execution history: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Manual execution
  async executeDCA(ruleId: string, force: boolean = false): Promise<ExecutionHistory> {
    const response = await fetch(`${this.baseUrl}/dca/${ruleId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute DCA: ${response.statusText}`);
    }
    
    return response.json();
  }

  async executeStopLoss(ruleId: string, force: boolean = false): Promise<ExecutionHistory> {
    const response = await fetch(`${this.baseUrl}/stoploss/${ruleId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute stop-loss: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Utility methods
  validateDCARule(rule: Partial<DCARule>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.symbol) errors.push('Symbol is required');
    if (!rule.dcaType) errors.push('DCA type is required');
    if (!rule.amount || rule.amount <= 0) errors.push('Amount must be greater than 0');
    
    if (rule.dcaType === 'time_based' && !rule.frequency) {
      errors.push('Frequency is required for time-based DCA');
    }
    
    if (rule.dcaType === 'trigger_based' && !rule.trigger) {
      errors.push('Trigger configuration is required for trigger-based DCA');
    }
    
    if (rule.executionSettings?.maxAllocation && rule.executionSettings.maxAllocation > 100) {
      errors.push('Maximum allocation cannot exceed 100%');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateStopLossRule(rule: Partial<StopLossRule>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.symbol) errors.push('Symbol is required');
    if (!rule.stopLossType) errors.push('Stop-loss type is required');
    if (!rule.executionMethod) errors.push('Execution method is required');
    
    if (rule.stopLossType === 'percentage' && (!rule.triggerPercent || rule.triggerPercent <= 0)) {
      errors.push('Trigger percentage must be greater than 0');
    }
    
    if (rule.stopLossType === 'fixed_price' && (!rule.triggerPrice || rule.triggerPrice <= 0)) {
      errors.push('Trigger price must be greater than 0');
    }
    
    if (rule.stopLossType === 'trailing' && (!rule.trailingPercent || rule.trailingPercent <= 0)) {
      errors.push('Trailing percentage must be greater than 0');
    }
    
    if (rule.sellPercentage && (rule.sellPercentage <= 0 || rule.sellPercentage > 100)) {
      errors.push('Sell percentage must be between 0 and 100');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // Status formatting
  getDCAStatusColor(status: DCARule['status']): string {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'completed': return 'text-blue-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  getStopLossStatusColor(status: StopLossRule['status']): string {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'triggered': return 'text-red-600';
      case 'paused': return 'text-yellow-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  }

  getDCAStatusBadge(status: DCARule['status']): { variant: string; label: string } {
    switch (status) {
      case 'active':
        return { variant: 'bg-green-100 text-green-800', label: 'Active' };
      case 'paused':
        return { variant: 'bg-yellow-100 text-yellow-800', label: 'Paused' };
      case 'completed':
        return { variant: 'bg-blue-100 text-blue-800', label: 'Completed' };
      case 'cancelled':
        return { variant: 'bg-red-100 text-red-800', label: 'Cancelled' };
      default:
        return { variant: 'bg-gray-100 text-gray-600', label: 'Unknown' };
    }
  }

  getStopLossStatusBadge(status: StopLossRule['status']): { variant: string; label: string } {
    switch (status) {
      case 'active':
        return { variant: 'bg-green-100 text-green-800', label: 'Active' };
      case 'triggered':
        return { variant: 'bg-red-100 text-red-800', label: 'Triggered' };
      case 'paused':
        return { variant: 'bg-yellow-100 text-yellow-800', label: 'Paused' };
      case 'cancelled':
        return { variant: 'bg-gray-100 text-gray-800', label: 'Cancelled' };
      default:
        return { variant: 'bg-gray-100 text-gray-600', label: 'Unknown' };
    }
  }

  // Price formatting
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  }

  // Time formatting
  formatNextExecution(rule: DCARule): string {
    if (!rule.nextExecution) return 'Not scheduled';
    
    const nextTime = new Date(rule.nextExecution);
    const now = new Date();
    const diffMs = nextTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  // Calculate PnL
  calculatePnL(rule: DCARule, currentPrice: number): { pnl: number; pnlPercent: number } {
    if (rule.avgPrice === 0 || rule.totalInvested === 0) {
      return { pnl: 0, pnlPercent: 0 };
    }
    
    const currentValue = (rule.totalInvested / rule.avgPrice) * currentPrice;
    const pnl = currentValue - rule.totalInvested;
    const pnlPercent = (pnl / rule.totalInvested) * 100;
    
    return { pnl, pnlPercent };
  }

  // Form Management Methods
  getDefaultDCAForm(): Partial<DCARule> {
    return {
      name: '',
      symbol: '',
      dcaType: 'time_based',
      frequency: 'weekly',
      amount: 100,
      currency: 'USD',
      executionSettings: {
        cooldownPeriod: 60,
        slippageTolerance: 1,
        minOrderSize: 10,
        maxOrderSize: 1000
      },
      status: 'active'
    };
  }

  getDefaultStopLossForm(): Partial<StopLossRule> {
    return {
      name: '',
      symbol: '',
      stopLossType: 'percentage',
      triggerPercent: 10,
      executionMethod: 'market',
      sellPercentage: 100,
      status: 'active'
    };
  }

  // Business Logic Handlers
  async handleCreateDCARule(
    formData: Partial<DCARule>,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; rule?: DCARule; error?: string }> {
    try {
      const validation = this.validateDCARule(formData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const ruleData = {
        ...formData,
        userId,
        vaultId,
        executionCount: 0,
        totalInvested: 0,
        avgPrice: 0,
        isActive: true
      };

      const rule = await this.createDCARule(ruleData as any);
      
      // Log agent memory
      await this.logAgentMemory('dca_rule_created', {
        userId,
        vaultId,
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          symbol: rule.symbol,
          dcaType: rule.dcaType,
          amount: rule.amount,
          frequency: rule.frequency
        }
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleUpdateDCARule(
    ruleId: string,
    formData: Partial<DCARule>,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; rule?: DCARule; error?: string }> {
    try {
      const validation = this.validateDCARule(formData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const rule = await this.updateDCARule(ruleId, formData);
      
      // Log agent memory
      await this.logAgentMemory('dca_rule_updated', {
        userId,
        vaultId,
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          symbol: rule.symbol,
          updates: Object.keys(formData)
        }
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleCreateStopLossRule(
    formData: Partial<StopLossRule>,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; rule?: StopLossRule; error?: string }> {
    try {
      const validation = this.validateStopLossRule(formData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const ruleData = {
        ...formData,
        userId,
        vaultId,
        isActive: true
      };

      const rule = await this.createStopLossRule(ruleData as any);
      
      // Log agent memory
      await this.logAgentMemory('stop_loss_rule_created', {
        userId,
        vaultId,
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          symbol: rule.symbol,
          stopLossType: rule.stopLossType,
          triggerPercent: rule.triggerPercent,
          executionMethod: rule.executionMethod
        }
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleUpdateStopLossRule(
    ruleId: string,
    formData: Partial<StopLossRule>,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; rule?: StopLossRule; error?: string }> {
    try {
      const validation = this.validateStopLossRule(formData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const rule = await this.updateStopLossRule(ruleId, formData);
      
      // Log agent memory
      await this.logAgentMemory('stop_loss_rule_updated', {
        userId,
        vaultId,
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          symbol: rule.symbol,
          updates: Object.keys(formData)
        }
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleDeleteRule(
    rule: DCARule | StopLossRule,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isConfirmed = window.confirm('Are you sure you want to delete this rule?');
      if (!isConfirmed) {
        return { success: false, error: 'Action cancelled by user' };
      }

      if ('dcaType' in rule) {
        await this.deleteDCARule(rule.id);
        
        // Log agent memory
        await this.logAgentMemory('dca_rule_deleted', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            dcaType: rule.dcaType
          }
        });
      } else {
        await this.deleteStopLossRule(rule.id);
        
        // Log agent memory
        await this.logAgentMemory('stop_loss_rule_deleted', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            stopLossType: rule.stopLossType
          }
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleToggleRuleStatus(
    rule: DCARule | StopLossRule,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active';
      
      if ('dcaType' in rule) {
        await this.updateDCARule(rule.id, { status: newStatus });
        
        // Log agent memory
        await this.logAgentMemory('dca_rule_status_toggled', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            oldStatus: rule.status,
            newStatus
          }
        });
      } else {
        await this.updateStopLossRule(rule.id, { status: newStatus });
        
        // Log agent memory
        await this.logAgentMemory('stop_loss_rule_status_toggled', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            oldStatus: rule.status,
            newStatus
          }
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleExecuteRule(
    rule: DCARule | StopLossRule,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; execution?: ExecutionHistory; error?: string }> {
    try {
      let execution: ExecutionHistory;
      
      if ('dcaType' in rule) {
        execution = await this.executeDCA(rule.id);
        
        // Log agent memory
        await this.logAgentMemory('dca_rule_executed', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            executionId: execution.id,
            trigger: 'manual'
          }
        });
      } else {
        execution = await this.executeStopLoss(rule.id);
        
        // Log agent memory
        await this.logAgentMemory('stop_loss_rule_executed', {
          userId,
          vaultId,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            symbol: rule.symbol,
            executionId: execution.id,
            trigger: 'manual'
          }
        });
      }

      return { success: true, execution };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'dca_rule_created' | 'dca_rule_updated' | 'dca_rule_deleted' | 'dca_rule_status_toggled' | 'dca_rule_executed' | 
           'stop_loss_rule_created' | 'stop_loss_rule_updated' | 'stop_loss_rule_deleted' | 'stop_loss_rule_status_toggled' | 'stop_loss_rule_executed' |
           'tab_changed' | 'modal_opened' | 'modal_closed',
    dcaData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-10-dca-stop-loss-assistant',
        timestamp: new Date().toISOString(),
        userId: dcaData.userId,
        vaultId: dcaData.vaultId,
        data: {
          ...dcaData.metadata
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

  // Form Utilities
  prepareRuleForEdit(rule: DCARule | StopLossRule): { 
    ruleType: 'dca' | 'stop_loss';
    formData: Partial<DCARule> | Partial<StopLossRule>;
  } {
    if ('dcaType' in rule) {
      return {
        ruleType: 'dca',
        formData: rule
      };
    } else {
      return {
        ruleType: 'stop_loss',
        formData: rule
      };
    }
  }

  getEmptyFormStates(): {
    dcaForm: Partial<DCARule>;
    stopLossForm: Partial<StopLossRule>;
  } {
    return {
      dcaForm: this.getDefaultDCAForm(),
      stopLossForm: this.getDefaultStopLossForm()
    };
  }
}

// Service instance
export const dcaStopLossService = new DCAStopLossService();

// React Query hooks
export const useDCAStopLossData = (userId: string, vaultId?: string) => {
  return useQuery({
    queryKey: ['dca-stoploss', userId, vaultId],
    queryFn: () => dcaStopLossService.getAllRules(userId, vaultId),
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateDCARule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: dcaStopLossService.createDCARule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useUpdateDCARule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: Partial<DCARule> }) =>
      dcaStopLossService.updateDCARule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useDeleteDCARule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: dcaStopLossService.deleteDCARule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useCreateStopLossRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: dcaStopLossService.createStopLossRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useUpdateStopLossRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: Partial<StopLossRule> }) =>
      dcaStopLossService.updateStopLossRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useDeleteStopLossRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: dcaStopLossService.deleteStopLossRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useExecuteDCA = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ruleId, force }: { ruleId: string; force?: boolean }) =>
      dcaStopLossService.executeDCA(ruleId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
};

export const useExecuteStopLoss = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ruleId, force }: { ruleId: string; force?: boolean }) =>
      dcaStopLossService.executeStopLoss(ruleId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dca-stoploss'] });
    },
  });
}; 