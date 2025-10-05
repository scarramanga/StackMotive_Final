import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Rotation Engine
export interface RotationSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_signal';
  nextExecution: string;
  lastExecution?: string;
  isActive: boolean;
  overlayIds: string[];
  cooldownMinutes: number;
  cooldownEnds?: string;
  triggerConditions?: {
    type: 'signal_strength' | 'performance_threshold' | 'time_based';
    value: number;
    comparator: 'above' | 'below' | 'equals';
  }[];
}

export interface RotationTrigger {
  overlayIds: string[];
  force: boolean;
  reason: string;
  estimatedImpact: {
    affectedAssets: string[];
    estimatedValue: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface RotationStatus {
  isInProgress: boolean;
  currentStep?: string;
  progress?: number;
  estimatedCompletion?: string;
  lastRotation?: {
    id: string;
    timestamp: string;
    success: boolean;
    affectedOverlays: string[];
    duration: number;
  };
}

export interface RotationEngineResponse {
  schedules: RotationSchedule[];
  status: RotationStatus;
  nextScheduled?: string;
  conflicts: string[];
  lastUpdated: string;
}

// Rotation Engine Service Class
export class RotationEngineService {
  private baseUrl = '/api/portfolio';

  // Fetch rotation schedule and status
  async getRotationSchedule(vaultId?: string): Promise<RotationEngineResponse> {
    const url = vaultId 
      ? `${this.baseUrl}/rotation-schedule?vaultId=${vaultId}`
      : `${this.baseUrl}/rotation-schedule`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch rotation schedule');
    }
    
    return response.json();
  }

  // Trigger manual rotation
  async triggerRotation(trigger: RotationTrigger): Promise<{ 
    success: boolean; 
    rotationId: string;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/trigger-rotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trigger)
    });
    
    if (!response.ok) {
      throw new Error('Failed to trigger rotation');
    }
    
    return response.json();
  }

  // Create or update rotation schedule
  async updateSchedule(schedule: Partial<RotationSchedule>): Promise<RotationSchedule> {
    const response = await fetch(`${this.baseUrl}/rotation-schedule`, {
      method: schedule.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update rotation schedule');
    }
    
    return response.json();
  }

  // Cancel active rotation
  async cancelRotation(rotationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/cancel-rotation/${rotationId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel rotation');
    }
    
    return response.json();
  }

  // Calculate time remaining for next execution
  formatTimeRemaining(nextExecution: string): string {
    const now = new Date();
    const next = new Date(nextExecution);
    const diffMs = next.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ready to execute';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  // Format cooldown remaining
  formatCooldownRemaining(cooldownEnds?: string): string {
    if (!cooldownEnds) return 'No cooldown';
    
    const now = new Date();
    const ends = new Date(cooldownEnds);
    const diffMs = ends.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Cooldown complete';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m remaining`;
  }

  // Get rotation status color
  getRotationStatusColor(status: RotationStatus): string {
    if (status.isInProgress) return 'text-blue-600';
    if (status.lastRotation?.success === false) return 'text-red-600';
    if (status.lastRotation?.success === true) return 'text-green-600';
    return 'text-gray-600';
  }

  // Get schedule status badge
  getScheduleStatusBadge(schedule: RotationSchedule): {
    variant: string;
    label: string;
    color: string;
  } {
    if (!schedule.isActive) {
      return {
        variant: 'bg-gray-100 text-gray-800',
        label: 'Paused',
        color: 'text-gray-600'
      };
    }
    
    if (schedule.cooldownEnds && new Date(schedule.cooldownEnds) > new Date()) {
      return {
        variant: 'bg-yellow-100 text-yellow-800',
        label: 'Cooldown',
        color: 'text-yellow-600'
      };
    }
    
    const nextTime = new Date(schedule.nextExecution);
    const now = new Date();
    
    if (nextTime <= now) {
      return {
        variant: 'bg-green-100 text-green-800',
        label: 'Ready',
        color: 'text-green-600'
      };
    }
    
    return {
      variant: 'bg-blue-100 text-blue-800',
      label: 'Scheduled',
      color: 'text-blue-600'
    };
  }

  // Validate rotation trigger
  validateRotationTrigger(trigger: RotationTrigger): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!trigger.overlayIds || trigger.overlayIds.length === 0) {
      errors.push('At least one overlay must be selected');
    }
    
    if (!trigger.reason.trim()) {
      errors.push('Rotation reason is required');
    }
    
    if (trigger.estimatedImpact.riskLevel === 'high') {
      warnings.push('High risk rotation - proceed with caution');
    }
    
    if (trigger.estimatedImpact.estimatedValue > 100000) {
      warnings.push('Large value impact detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Check for schedule conflicts
  checkScheduleConflicts(
    schedules: RotationSchedule[], 
    newSchedule: Partial<RotationSchedule>
  ): string[] {
    const conflicts: string[] = [];
    
    for (const schedule of schedules) {
      if (schedule.id === newSchedule.id) continue;
      if (!schedule.isActive) continue;
      
      // Check for overlapping overlays
      const overlappingOverlays = schedule.overlayIds.filter(id => 
        newSchedule.overlayIds?.includes(id)
      );
      
      if (overlappingOverlays.length > 0) {
        conflicts.push(
          `Schedule "${schedule.name}" already manages overlays: ${overlappingOverlays.join(', ')}`
        );
      }
      
      // Check for timing conflicts
      if (schedule.frequency === newSchedule.frequency) {
        const timeDiff = Math.abs(
          new Date(schedule.nextExecution).getTime() - 
          new Date(newSchedule.nextExecution || '').getTime()
        );
        
        if (timeDiff < 30 * 60 * 1000) { // Less than 30 minutes apart
          conflicts.push(
            `Schedule "${schedule.name}" executes too close in time`
          );
        }
      }
    }
    
    return conflicts;
  }

  // Get frequency display text
  getFrequencyDisplayText(frequency: RotationSchedule['frequency']): string {
    switch (frequency) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'monthly': return 'Every month';
      case 'on_signal': return 'On signal trigger';
      default: return 'Unknown';
    }
  }

  // Calculate rotation impact
  calculateRotationImpact(overlayIds: string[], overlayData: any[]): {
    affectedAssets: string[];
    estimatedValue: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const affectedOverlays = overlayData.filter(overlay => 
      overlayIds.includes(overlay.id)
    );
    
    const affectedAssets = [...new Set(
      affectedOverlays.flatMap(overlay => overlay.assets || [])
    )];
    
    const estimatedValue = affectedOverlays.reduce(
      (sum, overlay) => sum + (overlay.totalValue || 0), 0
    );
    
    // Determine risk level based on value and asset count
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (estimatedValue > 50000 || affectedAssets.length > 10) {
      riskLevel = 'high';
    } else if (estimatedValue > 10000 || affectedAssets.length > 5) {
      riskLevel = 'medium';
    }
    
    return {
      affectedAssets,
      estimatedValue,
      riskLevel
    };
  }
}

// Service instance
export const rotationEngineService = new RotationEngineService();

// React Query hooks
export const useRotationSchedule = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/portfolio/rotation-schedule', vaultId],
    queryFn: () => rotationEngineService.getRotationSchedule(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useTriggerRotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rotationEngineService.triggerRotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/rotation-schedule'] });
    },
  });
};

export const useUpdateRotationSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rotationEngineService.updateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/rotation-schedule'] });
    },
  });
};

export const useCancelRotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rotationEngineService.cancelRotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/rotation-schedule'] });
    },
  });
}; 