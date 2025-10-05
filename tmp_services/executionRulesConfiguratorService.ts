import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Execution Rules Configurator
export interface ExecutionRule {
  id: string;
  userId: string;
  assetTicker: string;
  assetName: string;
  category: 'crypto' | 'stocks' | 'bonds' | 'commodities' | 'forex' | 'indices' | 'global';
  ruleType: 'delay' | 'max_trade_percentage' | 'excluded_asset' | 'execution_window' | 'stop_loss_required' | 'min_volume' | 'max_position_size';
  value: any;
  unit: string;
  description: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  metadata: {
    source: 'user' | 'system' | 'strategy';
    reason?: string;
    relatedRules?: string[];
    tags?: string[];
  };
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  ruleType: ExecutionRule['ruleType'];
  defaultValue: any;
  unit: string;
  validation: {
    min?: number;
    max?: number;
    required: boolean;
    pattern?: string;
  };
  applicableCategories: string[];
  isGlobal: boolean;
}

export interface ExecutionWindow {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  timezone: string;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  isActive: boolean;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface RuleConflict {
  ruleId: string;
  conflictingRuleId: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  resolution: string;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: ExecutionRule[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleStatistics {
  totalRules: number;
  activeRules: number;
  rulesByType: Record<string, number>;
  rulesByCategory: Record<string, number>;
  rulesByPriority: Record<string, number>;
  mostRestrictiveAssets: Array<{
    ticker: string;
    name: string;
    ruleCount: number;
    restrictionLevel: 'low' | 'medium' | 'high';
  }>;
  recentChanges: Array<{
    ruleId: string;
    action: 'created' | 'updated' | 'deleted';
    timestamp: string;
    description: string;
  }>;
}

export interface RuleApplicationResult {
  assetTicker: string;
  applicableRules: ExecutionRule[];
  conflicts: RuleConflict[];
  finalConfig: {
    canExecute: boolean;
    delay: number;
    maxTradePercentage: number;
    executionWindows: ExecutionWindow[];
    requiresStopLoss: boolean;
    minVolume: number;
    maxPositionSize: number;
  };
  reasons: string[];
}

// Execution Rules Configurator Service Class
export class ExecutionRulesConfiguratorService {
  private baseUrl = '/api/execution-rules';

  // Get all rules for user
  async getRules(userId: string): Promise<ExecutionRule[]> {
    const response = await fetch(`${this.baseUrl}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution rules');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rules_loaded', {
      userId,
      ruleCount: result.length,
      activeRules: result.filter((r: ExecutionRule) => r.isActive).length,
      ruleTypes: [...new Set(result.map((r: ExecutionRule) => r.ruleType))],
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get rule templates
  async getRuleTemplates(): Promise<RuleTemplate[]> {
    const response = await fetch(`${this.baseUrl}/templates`);
    if (!response.ok) {
      throw new Error('Failed to fetch rule templates');
    }

    return response.json();
  }

  // Create new rule
  async createRule(rule: Omit<ExecutionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionRule> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      throw new Error('Failed to create execution rule');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rule_created', {
      userId: rule.userId,
      ruleId: result.id,
      assetTicker: rule.assetTicker,
      ruleType: rule.ruleType,
      value: rule.value,
      isActive: rule.isActive,
      priority: rule.priority,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Update rule
  async updateRule(id: string, updates: Partial<ExecutionRule>): Promise<ExecutionRule> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update execution rule');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rule_updated', {
      userId: result.userId,
      ruleId: id,
      updatedFields: Object.keys(updates),
      assetTicker: result.assetTicker,
      ruleType: result.ruleType,
      newValue: result.value,
      isActive: result.isActive,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Delete rule
  async deleteRule(id: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete execution rule');
    }

    // Log agent memory
    await this.logAgentMemory('rule_deleted', {
      userId,
      ruleId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Validate rule
  async validateRule(rule: Partial<ExecutionRule>): Promise<RuleValidationResult> {
    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      throw new Error('Failed to validate rule');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rule_validated', {
      userId: rule.userId,
      ruleType: rule.ruleType,
      assetTicker: rule.assetTicker,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Check rule conflicts
  async checkConflicts(userId: string, ruleId?: string): Promise<RuleConflict[]> {
    const params = new URLSearchParams({ userId });
    if (ruleId) params.append('ruleId', ruleId);

    const response = await fetch(`${this.baseUrl}/conflicts?${params}`);
    if (!response.ok) {
      throw new Error('Failed to check rule conflicts');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('conflicts_checked', {
      userId,
      ruleId,
      conflictCount: result.length,
      errorConflicts: result.filter((c: RuleConflict) => c.severity === 'error').length,
      warningConflicts: result.filter((c: RuleConflict) => c.severity === 'warning').length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get rule statistics
  async getRuleStatistics(userId: string): Promise<RuleStatistics> {
    const response = await fetch(`${this.baseUrl}/statistics?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rule statistics');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('statistics_loaded', {
      userId,
      totalRules: result.totalRules,
      activeRules: result.activeRules,
      mostRestrictiveAssets: result.mostRestrictiveAssets.length,
      recentChanges: result.recentChanges.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Apply rules to asset
  async applyRulesToAsset(userId: string, assetTicker: string): Promise<RuleApplicationResult> {
    const response = await fetch(`${this.baseUrl}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, assetTicker }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply rules to asset');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rules_applied_to_asset', {
      userId,
      assetTicker,
      applicableRules: result.applicableRules.length,
      conflicts: result.conflicts.length,
      canExecute: result.finalConfig.canExecute,
      delay: result.finalConfig.delay,
      maxTradePercentage: result.finalConfig.maxTradePercentage,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get rule sets
  async getRuleSets(userId: string): Promise<RuleSet[]> {
    const response = await fetch(`${this.baseUrl}/sets?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rule sets');
    }

    return response.json();
  }

  // Create rule set
  async createRuleSet(userId: string, name: string, description: string, ruleIds: string[]): Promise<RuleSet> {
    const response = await fetch(`${this.baseUrl}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, description, ruleIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to create rule set');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rule_set_created', {
      userId,
      ruleSetId: result.id,
      name,
      ruleCount: ruleIds.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Bulk import rules
  async bulkImportRules(userId: string, rules: Omit<ExecutionRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]): Promise<{ created: ExecutionRule[]; errors: string[] }> {
    const response = await fetch(`${this.baseUrl}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rules }),
    });

    if (!response.ok) {
      throw new Error('Failed to bulk import rules');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('rules_bulk_imported', {
      userId,
      totalRules: rules.length,
      successfulImports: result.created.length,
      errorCount: result.errors.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Export rules
  async exportRules(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/export?userId=${userId}&format=${format}`);
    if (!response.ok) {
      throw new Error('Failed to export rules');
    }

    const result = await response.text();

    // Log agent memory
    await this.logAgentMemory('rules_exported', {
      userId,
      format,
      exportSize: result.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Utility Methods
  getRuleTypeDescription(ruleType: ExecutionRule['ruleType']): string {
    switch (ruleType) {
      case 'delay': return 'Execution delay in seconds';
      case 'max_trade_percentage': return 'Maximum trade size as percentage of portfolio';
      case 'excluded_asset': return 'Completely exclude asset from execution';
      case 'execution_window': return 'Allowed trading time window';
      case 'stop_loss_required': return 'Require stop loss for all trades';
      case 'min_volume': return 'Minimum daily volume requirement';
      case 'max_position_size': return 'Maximum position size in portfolio';
      default: return 'Unknown rule type';
    }
  }

  getRuleTypeIcon(ruleType: ExecutionRule['ruleType']): string {
    switch (ruleType) {
      case 'delay': return 'clock';
      case 'max_trade_percentage': return 'percent';
      case 'excluded_asset': return 'ban';
      case 'execution_window': return 'calendar';
      case 'stop_loss_required': return 'shield';
      case 'min_volume': return 'bar-chart';
      case 'max_position_size': return 'pie-chart';
      default: return 'settings';
    }
  }

  getPriorityColor(priority: ExecutionRule['priority']): string {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getPriorityBackground(priority: ExecutionRule['priority']): string {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getConflictSeverityColor(severity: RuleConflict['severity']): string {
    switch (severity) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'crypto': return 'text-orange-600';
      case 'stocks': return 'text-blue-600';
      case 'bonds': return 'text-green-600';
      case 'commodities': return 'text-yellow-600';
      case 'forex': return 'text-purple-600';
      case 'indices': return 'text-red-600';
      case 'global': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  formatRuleValue(rule: ExecutionRule): string {
    switch (rule.ruleType) {
      case 'delay':
        return `${rule.value} ${rule.unit}`;
      case 'max_trade_percentage':
        return `${rule.value}%`;
      case 'excluded_asset':
        return 'Excluded';
      case 'execution_window':
        return `${rule.value.startTime} - ${rule.value.endTime}`;
      case 'stop_loss_required':
        return rule.value ? 'Required' : 'Optional';
      case 'min_volume':
        return `${this.formatLargeNumber(rule.value)} ${rule.unit}`;
      case 'max_position_size':
        return `${rule.value}%`;
      default:
        return String(rule.value);
    }
  }

  formatLargeNumber(value: number): string {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
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

  // Factory Methods
  createDefaultRule(userId: string, ruleType: ExecutionRule['ruleType']): Omit<ExecutionRule, 'id' | 'createdAt' | 'updatedAt'> {
    const baseRule = {
      userId,
      assetTicker: '',
      assetName: '',
      category: 'global' as const,
      ruleType,
      value: null,
      unit: '',
      description: '',
      isActive: true,
      priority: 'medium' as const,
      metadata: {
        source: 'user' as const,
        tags: []
      }
    };

    switch (ruleType) {
      case 'delay':
        return {
          ...baseRule,
          value: 5,
          unit: 'seconds',
          description: 'Wait 5 seconds before executing trades'
        };
      case 'max_trade_percentage':
        return {
          ...baseRule,
          value: 5,
          unit: '%',
          description: 'Maximum 5% of portfolio per trade'
        };
      case 'excluded_asset':
        return {
          ...baseRule,
          value: true,
          unit: 'boolean',
          description: 'Exclude this asset from execution'
        };
      case 'execution_window':
        return {
          ...baseRule,
          value: {
            startTime: '09:00',
            endTime: '16:00',
            timezone: 'UTC',
            daysOfWeek: [1, 2, 3, 4, 5],
            isActive: true
          },
          unit: 'timeframe',
          description: 'Only execute during market hours'
        };
      case 'stop_loss_required':
        return {
          ...baseRule,
          value: true,
          unit: 'boolean',
          description: 'Always require stop loss orders'
        };
      case 'min_volume':
        return {
          ...baseRule,
          value: 1000000,
          unit: 'USD',
          description: 'Minimum $1M daily volume required'
        };
      case 'max_position_size':
        return {
          ...baseRule,
          value: 10,
          unit: '%',
          description: 'Maximum 10% position size'
        };
      default:
        return baseRule;
    }
  }

  // Validation Methods
  validateRuleSchema(rule: Partial<ExecutionRule>): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!rule.assetTicker && rule.category !== 'global') {
      errors.push('Asset ticker is required for non-global rules');
    }

    if (!rule.ruleType) {
      errors.push('Rule type is required');
    }

    if (rule.value === null || rule.value === undefined) {
      errors.push('Rule value is required');
    }

    // Type-specific validation
    if (rule.ruleType && rule.value !== null && rule.value !== undefined) {
      switch (rule.ruleType) {
        case 'delay':
          if (typeof rule.value !== 'number' || rule.value < 0) {
            errors.push('Delay must be a positive number');
          }
          if (rule.value > 300) {
            warnings.push('Delay over 5 minutes may cause execution issues');
          }
          break;
        case 'max_trade_percentage':
          if (typeof rule.value !== 'number' || rule.value <= 0 || rule.value > 100) {
            errors.push('Trade percentage must be between 0 and 100');
          }
          if (rule.value > 20) {
            warnings.push('High trade percentage may increase portfolio risk');
          }
          break;
        case 'execution_window':
          if (typeof rule.value !== 'object' || !rule.value.startTime || !rule.value.endTime) {
            errors.push('Execution window must have start and end times');
          }
          break;
        case 'min_volume':
          if (typeof rule.value !== 'number' || rule.value < 0) {
            errors.push('Minimum volume must be a positive number');
          }
          break;
        case 'max_position_size':
          if (typeof rule.value !== 'number' || rule.value <= 0 || rule.value > 100) {
            errors.push('Position size must be between 0 and 100');
          }
          break;
      }
    }

    // Suggestions
    if (rule.category === 'global' && rule.assetTicker) {
      suggestions.push('Consider using asset-specific category instead of global');
    }

    if (rule.priority === 'high' && rule.ruleType === 'delay') {
      suggestions.push('High priority delay rules may conflict with time-sensitive executions');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Business Logic Methods
  async handleRuleSubmit(
    rule: Omit<ExecutionRule, 'id' | 'createdAt' | 'updatedAt'>,
    editingId: string | null
  ): Promise<{ success: boolean; error?: string; result?: ExecutionRule }> {
    try {
      const validation = this.validateRuleSchema(rule);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      let result: ExecutionRule;
      if (editingId) {
        result = await this.updateRule(editingId, rule);
      } else {
        result = await this.createRule(rule);
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleRuleDelete(ruleId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.deleteRule(ruleId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete rule' };
    }
  }

  async handleBulkImport(
    userId: string,
    rules: Omit<ExecutionRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ success: boolean; error?: string; created?: ExecutionRule[]; errors?: string[] }> {
    try {
      const result = await this.bulkImportRules(userId, rules);
      return { success: true, created: result.created, errors: result.errors };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to import rules' };
    }
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
          blockId: 'block-45-execution-rules-configurator',
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
export const executionRulesConfiguratorService = new ExecutionRulesConfiguratorService();

// React Query hooks
export const useExecutionRules = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/execution-rules', userId],
    queryFn: () => executionRulesConfiguratorService.getRules(userId!),
    enabled: !!userId,
  });
};

export const useRuleTemplates = () => {
  return useQuery({
    queryKey: ['/api/execution-rules/templates'],
    queryFn: () => executionRulesConfiguratorService.getRuleTemplates(),
    staleTime: 300000, // 5 minutes
  });
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rule: Omit<ExecutionRule, 'id' | 'createdAt' | 'updatedAt'>) =>
      executionRulesConfiguratorService.createRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution-rules'] });
    },
  });
};

export const useUpdateRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ExecutionRule> }) =>
      executionRulesConfiguratorService.updateRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution-rules'] });
    },
  });
};

export const useDeleteRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      executionRulesConfiguratorService.deleteRule(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution-rules'] });
    },
  });
};

export const useValidateRule = () => {
  return useMutation({
    mutationFn: (rule: Partial<ExecutionRule>) =>
      executionRulesConfiguratorService.validateRule(rule),
  });
};

export const useCheckConflicts = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/execution-rules/conflicts', userId],
    queryFn: () => executionRulesConfiguratorService.checkConflicts(userId!),
    enabled: !!userId,
  });
};

export const useRuleStatistics = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/execution-rules/statistics', userId],
    queryFn: () => executionRulesConfiguratorService.getRuleStatistics(userId!),
    enabled: !!userId,
  });
};

export const useApplyRulesToAsset = () => {
  return useMutation({
    mutationFn: ({ userId, assetTicker }: { userId: string; assetTicker: string }) =>
      executionRulesConfiguratorService.applyRulesToAsset(userId, assetTicker),
  });
};

export const useBulkImportRules = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, rules }: { userId: string; rules: Omit<ExecutionRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] }) =>
      executionRulesConfiguratorService.bulkImportRules(userId, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/execution-rules'] });
    },
  });
}; 