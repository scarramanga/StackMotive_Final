import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for rebalance scheduler
export interface RebalanceSchedule {
  id: string;
  name: string;
  description: string;
  userId: string;
  vaultId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Scheduling configuration
  scheduleType: 'time_based' | 'signal_based' | 'event_based';
  
  // Time-based scheduling
  interval?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  timeOfDay?: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  
  // Signal-based triggers
  signalTriggers?: {
    type: 'rsi' | 'macd' | 'bollinger' | 'custom';
    symbol: string;
    operator: 'above' | 'below' | 'crosses_above' | 'crosses_below';
    threshold: number;
    timeframe: '1h' | '4h' | '1d' | '1w';
  }[];
  
  // Event-based triggers
  eventTriggers?: {
    type: 'macro_event' | 'earnings' | 'fed_meeting' | 'volatility_spike';
    parameters: Record<string, any>;
  }[];
  
  // Asset thresholds
  assetThresholds?: {
    symbol: string;
    condition: 'price_above' | 'price_below' | 'allocation_drift' | 'volatility_high';
    value: number;
    tolerance: number;
  }[];
  
  // Rebalance configuration
  rebalanceConfig: {
    method: 'proportional' | 'equal_weight' | 'target_allocation' | 'risk_parity';
    targetAllocations?: Record<string, number>;
    maxAllocationChange?: number;
    minTradeSize?: number;
    tradingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  
  // Execution settings
  executionSettings: {
    autoExecute: boolean;
    requireConfirmation: boolean;
    maxExecutions?: number;
    executionWindow?: number; // minutes
    dryRun: boolean;
  };
  
  // Status tracking
  nextExecution?: string;
  lastExecution?: string;
  executionCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RebalanceExecution {
  id: string;
  scheduleId: string;
  executionTime: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  triggerReason: string;
  
  // Execution details
  trades: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    value: number;
    timestamp: string;
  }[];
  
  // Results
  results?: {
    totalTrades: number;
    totalValue: number;
    executionTime: number; // seconds
    slippage: number;
    fees: number;
    success: boolean;
    error?: string;
  };
  
  // Before/after snapshots
  portfolioBefore: Record<string, number>;
  portfolioAfter?: Record<string, number>;
}

export interface SchedulerSummary {
  totalSchedules: number;
  activeSchedules: number;
  pendingExecutions: number;
  completedExecutions: number;
  nextExecutionTime?: string;
  avgExecutionTime: number;
}

export interface RebalanceSchedulerResponse {
  schedules: RebalanceSchedule[];
  executions: RebalanceExecution[];
  summary: SchedulerSummary;
  lastUpdated: string;
}

// Service class for rebalance scheduler operations
export class RebalanceSchedulerService {
  private baseUrl = '/api/rebalance';

  // Form management utilities
  createDefaultFormData(): Partial<RebalanceSchedule> {
    return {
      name: '',
      description: '',
      scheduleType: 'time_based',
      interval: 'weekly',
      timeOfDay: '09:00',
      rebalanceConfig: {
        method: 'proportional',
        maxAllocationChange: 10,
        minTradeSize: 100
      },
      executionSettings: {
        autoExecute: false,
        requireConfirmation: true,
        dryRun: false
      }
    };
  }

  // Form validation with detailed error messages
  validateFormData(formData: Partial<RebalanceSchedule>): { 
    isValid: boolean; 
    errors: Record<string, string>;
    warnings: string[];
  } {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    // Required field validation
    if (!formData.name?.trim()) {
      errors.name = 'Schedule name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Schedule name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      errors.name = 'Schedule name must be less than 50 characters';
    }

    if (!formData.scheduleType) {
      errors.scheduleType = 'Schedule type is required';
    }

    // Schedule type specific validation
    if (formData.scheduleType === 'time_based') {
      if (!formData.interval) {
        errors.interval = 'Interval is required for time-based schedules';
      }
      if (!formData.timeOfDay) {
        errors.timeOfDay = 'Time of day is required for time-based schedules';
      } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.timeOfDay)) {
        errors.timeOfDay = 'Invalid time format (use HH:MM)';
      }
    }

    if (formData.scheduleType === 'signal_based') {
      if (!formData.signalTriggers || formData.signalTriggers.length === 0) {
        errors.signalTriggers = 'At least one signal trigger is required';
      }
    }

    if (formData.scheduleType === 'event_based') {
      if (!formData.eventTriggers || formData.eventTriggers.length === 0) {
        errors.eventTriggers = 'At least one event trigger is required';
      }
    }

    // Rebalance config validation
    if (!formData.rebalanceConfig) {
      errors.rebalanceConfig = 'Rebalance configuration is required';
    } else {
      const { method, maxAllocationChange, minTradeSize, targetAllocations } = formData.rebalanceConfig;
      
      if (!method) {
        errors.rebalanceMethod = 'Rebalance method is required';
      }

      if (maxAllocationChange && (maxAllocationChange < 1 || maxAllocationChange > 100)) {
        errors.maxAllocationChange = 'Max allocation change must be between 1-100%';
      }

      if (minTradeSize && minTradeSize < 0) {
        errors.minTradeSize = 'Minimum trade size must be positive';
      }

      // Target allocation validation
      if (method === 'target_allocation') {
        if (!targetAllocations || Object.keys(targetAllocations).length === 0) {
          errors.targetAllocations = 'Target allocations are required for target allocation method';
        } else {
          const totalAllocation = Object.values(targetAllocations).reduce((sum, allocation) => sum + allocation, 0);
          if (Math.abs(totalAllocation - 100) > 0.01) {
            errors.targetAllocations = 'Target allocations must sum to 100%';
          }
        }
      }
    }

    // Execution settings validation
    if (formData.executionSettings) {
      const { maxExecutions, executionWindow } = formData.executionSettings;
      
      if (maxExecutions && maxExecutions < 1) {
        errors.maxExecutions = 'Maximum executions must be greater than 0';
      }

      if (executionWindow && (executionWindow < 1 || executionWindow > 1440)) {
        errors.executionWindow = 'Execution window must be between 1-1440 minutes';
      }

      // Warnings for risky configurations
      if (formData.executionSettings.autoExecute && !formData.executionSettings.requireConfirmation) {
        warnings.push('Auto-execute without confirmation is risky');
      }

      if (formData.executionSettings.dryRun && formData.executionSettings.autoExecute) {
        warnings.push('Dry run mode with auto-execute will not make actual trades');
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  // Form data transformation for submission
  prepareFormDataForSubmission(
    formData: Partial<RebalanceSchedule>, 
    userId: string, 
    vaultId?: string,
    editingSchedule?: RebalanceSchedule
  ): Omit<RebalanceSchedule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'> {
    const baseData = {
      ...formData,
      userId,
      vaultId,
      status: 'active' as const,
      createdBy: userId,
      executionCount: 0,
    };

    // Generate next execution time for time-based schedules
    if (formData.scheduleType === 'time_based' && formData.interval && formData.timeOfDay) {
      baseData.nextExecution = this.calculateNextExecution(formData.interval, formData.timeOfDay).toISOString();
    }

    return baseData as Omit<RebalanceSchedule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>;
  }

  // Calculate next execution time
  private calculateNextExecution(interval: string, timeOfDay: string): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    
    const nextExecution = new Date(now);
    nextExecution.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for next interval
    if (nextExecution <= now) {
      switch (interval) {
        case 'daily':
          nextExecution.setDate(nextExecution.getDate() + 1);
          break;
        case 'weekly':
          nextExecution.setDate(nextExecution.getDate() + 7);
          break;
        case 'monthly':
          nextExecution.setMonth(nextExecution.getMonth() + 1);
          break;
        case 'quarterly':
          nextExecution.setMonth(nextExecution.getMonth() + 3);
          break;
      }
    }
    
    return nextExecution;
  }

  // Handle form field updates with validation
  updateFormField(
    currentFormData: Partial<RebalanceSchedule>,
    field: string,
    value: any
  ): Partial<RebalanceSchedule> {
    const updatedData = { ...currentFormData, [field]: value };
    
    // Auto-adjustments based on field changes
    if (field === 'scheduleType') {
      // Clear type-specific fields when schedule type changes
      if (value === 'time_based') {
        updatedData.signalTriggers = undefined;
        updatedData.eventTriggers = undefined;
      } else if (value === 'signal_based') {
        updatedData.interval = undefined;
        updatedData.timeOfDay = undefined;
        updatedData.eventTriggers = undefined;
      } else if (value === 'event_based') {
        updatedData.interval = undefined;
        updatedData.timeOfDay = undefined;
        updatedData.signalTriggers = undefined;
      }
    }

    if (field === 'rebalanceConfig.method' && value === 'target_allocation') {
      // Initialize target allocations if switching to target allocation method
      if (!updatedData.rebalanceConfig?.targetAllocations) {
        updatedData.rebalanceConfig = {
          ...updatedData.rebalanceConfig,
          targetAllocations: {}
        };
      }
    }

    return updatedData;
  }

  // Handle nested form field updates
  updateNestedFormField(
    currentFormData: Partial<RebalanceSchedule>,
    parent: string,
    field: string,
    value: any
  ): Partial<RebalanceSchedule> {
    const updatedData = { ...currentFormData };
    
    if (!updatedData[parent as keyof RebalanceSchedule]) {
      updatedData[parent as keyof RebalanceSchedule] = {} as any;
    }
    
    (updatedData[parent as keyof RebalanceSchedule] as any)[field] = value;
    
    return updatedData;
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'schedule_created' | 'schedule_updated' | 'schedule_deleted' | 'execution_triggered' | 'status_changed',
    scheduleData: {
      scheduleId?: string;
      scheduleName?: string;
      scheduleType?: string;
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-9-rebalance-scheduler',
        timestamp: new Date().toISOString(),
        userId: scheduleData.userId,
        vaultId: scheduleData.vaultId,
        data: {
          scheduleId: scheduleData.scheduleId,
          scheduleName: scheduleData.scheduleName,
          scheduleType: scheduleData.scheduleType,
          ...scheduleData.metadata
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

  // Fetch all schedules for a user
  async getSchedules(userId: string, vaultId?: string): Promise<RebalanceSchedulerResponse> {
    const params = new URLSearchParams({ userId });
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/schedule?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schedules: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Create a new schedule
  async createSchedule(schedule: Omit<RebalanceSchedule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): Promise<RebalanceSchedule> {
    const response = await fetch(`${this.baseUrl}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create schedule: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update an existing schedule
  async updateSchedule(scheduleId: string, updates: Partial<RebalanceSchedule>): Promise<RebalanceSchedule> {
    const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update schedule: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Delete a schedule
  async deleteSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete schedule: ${response.statusText}`);
    }
  }

  // Trigger manual execution
  async triggerExecution(scheduleId: string, force: boolean = false): Promise<RebalanceExecution> {
    const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger execution: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Check for trigger conditions
  async checkTriggers(scheduleId: string): Promise<{ shouldTrigger: boolean; reasons: string[] }> {
    const response = await fetch(`${this.baseUrl}/trigger-check/${scheduleId}`);
    if (!response.ok) {
      throw new Error(`Failed to check triggers: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get execution history
  async getExecutionHistory(scheduleId: string, limit: number = 50): Promise<RebalanceExecution[]> {
    const response = await fetch(`${this.baseUrl}/schedule/${scheduleId}/history?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch execution history: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Validate schedule configuration
  validateSchedule(schedule: Partial<RebalanceSchedule>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!schedule.name) errors.push('Schedule name is required');
    if (!schedule.scheduleType) errors.push('Schedule type is required');
    if (!schedule.rebalanceConfig) errors.push('Rebalance configuration is required');
    
    // Schedule type validation
    if (schedule.scheduleType === 'time_based' && !schedule.interval) {
      errors.push('Interval is required for time-based schedules');
    }
    
    if (schedule.scheduleType === 'signal_based' && (!schedule.signalTriggers || schedule.signalTriggers.length === 0)) {
      errors.push('Signal triggers are required for signal-based schedules');
    }
    
    if (schedule.scheduleType === 'event_based' && (!schedule.eventTriggers || schedule.eventTriggers.length === 0)) {
      errors.push('Event triggers are required for event-based schedules');
    }
    
    // Target allocation validation
    if (schedule.rebalanceConfig?.method === 'target_allocation') {
      if (!schedule.rebalanceConfig.targetAllocations) {
        errors.push('Target allocations are required for target allocation method');
      } else {
        const totalAllocation = Object.values(schedule.rebalanceConfig.targetAllocations).reduce((sum, allocation) => sum + allocation, 0);
        if (Math.abs(totalAllocation - 100) > 0.01) {
          errors.push('Target allocations must sum to 100%');
        }
      }
    }
    
    // Execution settings validation
    if (schedule.executionSettings?.maxExecutions && schedule.executionSettings.maxExecutions < 1) {
      errors.push('Maximum executions must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format next execution time
  formatNextExecution(schedule: RebalanceSchedule): string {
    if (!schedule.nextExecution) return 'Not scheduled';
    
    const nextTime = new Date(schedule.nextExecution);
    const now = new Date();
    const diffMs = nextTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 48) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  // Get schedule status color
  getStatusColor(status: RebalanceSchedule['status']): string {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'completed': return 'text-blue-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  // Get schedule status badge
  getStatusBadge(status: RebalanceSchedule['status']): { variant: string; label: string } {
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

  // Generate cron expression for time-based schedules
  generateCronExpression(schedule: RebalanceSchedule): string {
    if (schedule.scheduleType !== 'time_based') return '';
    
    const { interval, timeOfDay, daysOfWeek, dayOfMonth } = schedule;
    const [hours, minutes] = timeOfDay?.split(':').map(Number) || [9, 0];
    
    switch (interval) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        const dayOfWeek = daysOfWeek?.[0] || 1; // Default to Monday
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      case 'monthly':
        const day = dayOfMonth || 1;
        return `${minutes} ${hours} ${day} * *`;
      case 'quarterly':
        const quarterDay = dayOfMonth || 1;
        return `${minutes} ${hours} ${quarterDay} */3 *`;
      default:
        return '';
    }
  }

  // Check for schedule conflicts
  checkConflicts(schedules: RebalanceSchedule[], newSchedule: Partial<RebalanceSchedule>): string[] {
    const conflicts: string[] = [];
    
    for (const schedule of schedules) {
      if (schedule.id === newSchedule.id) continue;
      if (schedule.status === 'cancelled' || schedule.status === 'completed') continue;
      
      // Check for overlapping execution windows
      if (schedule.vaultId === newSchedule.vaultId && 
          schedule.scheduleType === 'time_based' && 
          newSchedule.scheduleType === 'time_based') {
        
        // Simple conflict check for same interval and time
        if (schedule.interval === newSchedule.interval && 
            schedule.timeOfDay === newSchedule.timeOfDay) {
          conflicts.push(`Conflicts with existing schedule: ${schedule.name}`);
        }
      }
    }
    
    return conflicts;
  }
}

// Service instance
export const rebalanceSchedulerService = new RebalanceSchedulerService();

// React Query hooks
export const useRebalanceSchedules = (userId: string, vaultId?: string) => {
  return useQuery({
    queryKey: ['rebalance-schedules', userId, vaultId],
    queryFn: () => rebalanceSchedulerService.getSchedules(userId, vaultId),
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rebalanceSchedulerService.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalance-schedules'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scheduleId, updates }: { scheduleId: string; updates: Partial<RebalanceSchedule> }) =>
      rebalanceSchedulerService.updateSchedule(scheduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalance-schedules'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rebalanceSchedulerService.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalance-schedules'] });
    },
  });
};

export const useTriggerExecution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scheduleId, force }: { scheduleId: string; force?: boolean }) =>
      rebalanceSchedulerService.triggerExecution(scheduleId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalance-schedules'] });
    },
  });
};

export const useExecutionHistory = (scheduleId: string, limit?: number) => {
  return useQuery({
    queryKey: ['execution-history', scheduleId, limit],
    queryFn: () => rebalanceSchedulerService.getExecutionHistory(scheduleId, limit),
    enabled: !!scheduleId,
  });
}; 