import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Rebalance Alert Modal
export interface RebalanceAlert {
  id: string;
  timestamp: string;
  triggeredBy: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  cooldownRemaining: number;
  estimatedDuration: number;
  affectedOverlays: AffectedOverlay[];
  summary: AlertSummary;
  warnings: string[];
  recommendations: string[];
}

export interface AffectedOverlay {
  id: string;
  name: string;
  currentWeight: number;
  targetWeight: number;
  weightChange: number;
  confidence: number;
  reason: string;
  risk: 'low' | 'medium' | 'high';
}

export interface AlertSummary {
  totalChanges: number;
  maxWeightChange: number;
  avgConfidence: number;
  riskDelta: number;
}

export interface RebalanceConfirmation {
  confirmed: boolean;
  userNotes?: string;
  overrideCooldown?: boolean;
}

export interface ModalState {
  isOpen: boolean;
  userNotes: string;
  overrideCooldown: boolean;
  countdown: number;
}

// Rebalance Alert Modal Service Class
export class RebalanceAlertModalService {
  private baseUrl = '/api/portfolio/rebalance-alert';

  // Fetch rebalance alert data
  async getRebalanceAlert(vaultId?: string): Promise<{ alert: RebalanceAlert | null }> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch rebalance alert');
    }
    
    return response.json();
  }

  // Confirm rebalance
  async confirmRebalance(
    alertId: string, 
    confirmation: RebalanceConfirmation, 
    vaultId?: string
  ): Promise<any> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-confirm?vaultId=${vaultId}`
      : '/api/portfolio/rebalance-confirm';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId,
        ...confirmation,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to confirm rebalance');
    }
    
    return response.json();
  }

  // Cancel rebalance
  async cancelRebalance(alertId: string, vaultId?: string): Promise<any> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-cancel?vaultId=${vaultId}`
      : '/api/portfolio/rebalance-cancel';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel rebalance');
    }
    
    return response.json();
  }

  // **BUSINESS LOGIC METHODS**

  // Initialize modal state
  createInitialModalState(): ModalState {
    return {
      isOpen: false,
      userNotes: '',
      overrideCooldown: false,
      countdown: 0,
    };
  }

  // Update modal state for alert
  updateModalStateForAlert(currentState: ModalState, alert: RebalanceAlert): ModalState {
    if (alert && !currentState.isOpen) {
      return {
        ...currentState,
        isOpen: true,
        countdown: alert.cooldownRemaining,
      };
    }
    return currentState;
  }

  // Update countdown
  updateCountdown(currentCountdown: number): number {
    return Math.max(0, currentCountdown - 1);
  }

  // Close modal and reset state
  closeModalAndReset(): ModalState {
    return {
      isOpen: false,
      userNotes: '',
      overrideCooldown: false,
      countdown: 0,
    };
  }

  // Get risk badge data
  getRiskBadge(risk: string): { className: string; label: string } {
    switch (risk) {
      case 'high':
        return { className: 'bg-red-100 text-red-800', label: 'High Risk' };
      case 'medium':
        return { className: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' };
      case 'low':
        return { className: 'bg-green-100 text-green-800', label: 'Low Risk' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: risk };
    }
  }

  // Get confidence color
  getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Format time (seconds to MM:SS)
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Format percentage with sign
  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Format duration in minutes
  formatDuration(seconds: number): string {
    return `${Math.round(seconds / 60)}min`;
  }

  // Validate confirmation readiness
  canConfirmRebalance(countdown: number, overrideCooldown: boolean): boolean {
    return countdown <= 0 || overrideCooldown;
  }

  // Calculate alert risk level
  calculateAlertRisk(overlays: AffectedOverlay[]): 'low' | 'medium' | 'high' {
    const highRiskCount = overlays.filter(o => o.risk === 'high').length;
    const mediumRiskCount = overlays.filter(o => o.risk === 'medium').length;
    
    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > overlays.length / 2) return 'medium';
    return 'low';
  }

  // Calculate average confidence
  calculateAverageConfidence(overlays: AffectedOverlay[]): number {
    if (overlays.length === 0) return 0;
    const total = overlays.reduce((sum, overlay) => sum + overlay.confidence, 0);
    return Math.round(total / overlays.length);
  }

  // Get risk delta color
  getRiskDeltaColor(riskDelta: number): string {
    return riskDelta > 0 ? 'text-red-600' : 'text-green-600';
  }

  // Get weight change color and icon
  getWeightChangeDisplay(weightChange: number): { 
    color: string; 
    icon: 'up' | 'down'; 
    formatted: string 
  } {
    return {
      color: weightChange > 0 ? 'text-green-600' : 'text-red-600',
      icon: weightChange > 0 ? 'up' : 'down',
      formatted: this.formatPercentage(weightChange)
    };
  }

  // Validate user notes
  validateUserNotes(notes: string): { isValid: boolean; trimmed: string } {
    const trimmed = notes.trim();
    return {
      isValid: true, // Notes are always optional and valid
      trimmed
    };
  }

  // Create confirmation object
  createConfirmation(
    userNotes: string, 
    overrideCooldown: boolean
  ): RebalanceConfirmation {
    const validatedNotes = this.validateUserNotes(userNotes);
    
    return {
      confirmed: true,
      userNotes: validatedNotes.trimmed || undefined,
      overrideCooldown,
    };
  }

  // Calculate summary statistics
  calculateSummaryStats(overlays: AffectedOverlay[]): {
    totalOverlays: number;
    highRiskOverlays: number;
    averageConfidence: number;
    maxWeightChange: number;
  } {
    return {
      totalOverlays: overlays.length,
      highRiskOverlays: overlays.filter(o => o.risk === 'high').length,
      averageConfidence: this.calculateAverageConfidence(overlays),
      maxWeightChange: Math.max(...overlays.map(o => Math.abs(o.weightChange))),
    };
  }

  // Check if alert requires immediate attention
  requiresImmediateAttention(alert: RebalanceAlert): boolean {
    return (
      alert.riskLevel === 'high' ||
      alert.confidenceScore >= 90 ||
      alert.summary.maxWeightChange >= 10 ||
      alert.warnings.length > 0
    );
  }

  // Get alert priority level
  getAlertPriority(alert: RebalanceAlert): 'low' | 'medium' | 'high' | 'critical' {
    if (alert.warnings.length > 2 || alert.summary.riskDelta > 20) return 'critical';
    if (alert.riskLevel === 'high' || alert.confidenceScore >= 85) return 'high';
    if (alert.riskLevel === 'medium' || alert.confidenceScore >= 70) return 'medium';
    return 'low';
  }

  // Get priority color
  getPriorityColor(priority: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (priority) {
      case 'critical': return 'text-red-700';
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'modal_opened' | 'rebalance_confirmed' | 'rebalance_cancelled' | 'cooldown_overridden' | 'notes_added' | 'alert_dismissed',
    alertData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-30-rebalance-alert-modal',
        timestamp: new Date().toISOString(),
        userId: alertData.userId,
        vaultId: alertData.vaultId,
        data: {
          ...alertData.metadata
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
export const rebalanceAlertModalService = new RebalanceAlertModalService();

// React Query hooks
export const useRebalanceAlert = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/portfolio/rebalance-alert', vaultId],
    queryFn: () => rebalanceAlertModalService.getRebalanceAlert(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 5000,
  });
};

export const useConfirmRebalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, confirmation, vaultId }: {
      alertId: string;
      confirmation: RebalanceConfirmation;
      vaultId?: string;
    }) => rebalanceAlertModalService.confirmRebalance(alertId, confirmation, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
    },
  });
};

export const useCancelRebalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, vaultId }: { alertId: string; vaultId?: string }) =>
      rebalanceAlertModalService.cancelRebalance(alertId, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
    },
  });
}; 