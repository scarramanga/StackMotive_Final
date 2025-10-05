import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for rotation overlay data
export interface RotationOverlay {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'cooling_down' | 'triggered' | 'paused';
  currentWeight: number;
  targetWeight: number;
  signalStrength: number;
  trustScore: number;
  rotationTiming: {
    lastRotation: string;
    nextRotation: string | null;
    cooldownEnds: string | null;
    frequency: 'daily' | 'weekly' | 'monthly' | 'signal_based';
  };
  performance: {
    totalReturn: number;
    winRate: number;
    avgRotationReturn: number;
    maxDrawdown: number;
  };
  assets: {
    symbol: string;
    allocation: number;
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
  }[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    rotationCount: number;
    isUserDefined: boolean;
  };
}

export interface OverlayComparison {
  portfolioValue: number;
  overlayValue: number;
  difference: number;
  differencePercent: number;
  recommendation: 'rotate' | 'hold' | 'pause';
}

export interface RotationOverlayResponse {
  overlays: RotationOverlay[];
  summary: {
    totalOverlays: number;
    activeOverlays: number;
    avgTrustScore: number;
    pendingRotations: number;
    totalPerformance: number;
  };
  comparison: OverlayComparison;
  lastUpdated: string;
}

// Service class for rotation overlay operations
export class RotationOverlayService {
  private baseUrl = '/api/rotation';

  // Fetch all overlays for a user
  async getOverlays(userId: string, vaultId?: string): Promise<RotationOverlayResponse> {
    const params = new URLSearchParams({ userId });
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/overlays?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch overlays: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get specific overlay details
  async getOverlayDetails(overlayId: string): Promise<RotationOverlay> {
    const response = await fetch(`${this.baseUrl}/overlays/${overlayId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch overlay details: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update overlay status (pause/resume)
  async updateOverlayStatus(overlayId: string, status: RotationOverlay['status']): Promise<void> {
    const response = await fetch(`${this.baseUrl}/overlays/${overlayId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update overlay status: ${response.statusText}`);
    }
  }

  // Trigger manual rotation for an overlay
  async triggerRotation(overlayId: string, force: boolean = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/overlays/${overlayId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger rotation: ${response.statusText}`);
    }
  }

  // Get rotation history for an overlay
  async getRotationHistory(overlayId: string, limit: number = 20): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/overlays/${overlayId}/history?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rotation history: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Calculate overlay trust score based on performance
  calculateTrustScore(overlay: RotationOverlay): number {
    const { performance, metadata } = overlay;
    
    // Base score from win rate (0-40 points)
    const winRateScore = (performance.winRate / 100) * 40;
    
    // Return performance score (0-30 points)
    const returnScore = Math.min(Math.max(performance.totalReturn, -10), 50) / 50 * 30;
    
    // Drawdown penalty (0-20 points, inverted)
    const drawdownScore = Math.max(0, 20 - Math.abs(performance.maxDrawdown));
    
    // Experience bonus based on rotation count (0-10 points)
    const experienceScore = Math.min(metadata.rotationCount / 50, 1) * 10;
    
    return Math.round(winRateScore + returnScore + drawdownScore + experienceScore);
  }

  // Determine overlay status color
  getStatusColor(status: RotationOverlay['status']): string {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'triggered': return 'text-blue-600';
      case 'cooling_down': return 'text-yellow-600';
      case 'paused': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  }

  // Get status badge variant
  getStatusBadge(status: RotationOverlay['status']): { variant: string; label: string } {
    switch (status) {
      case 'active':
        return { variant: 'bg-green-100 text-green-800', label: 'Active' };
      case 'triggered':
        return { variant: 'bg-blue-100 text-blue-800', label: 'Triggered' };
      case 'cooling_down':
        return { variant: 'bg-yellow-100 text-yellow-800', label: 'Cooling Down' };
      case 'paused':
        return { variant: 'bg-gray-100 text-gray-800', label: 'Paused' };
      default:
        return { variant: 'bg-gray-100 text-gray-600', label: 'Unknown' };
    }
  }

  // Format time remaining for cooldown/next rotation
  formatTimeRemaining(targetTime: string): string {
    const now = new Date();
    const target = new Date(targetTime);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ready';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'overlay_status_changed' | 'rotation_triggered' | 'overlay_details_viewed' | 'overlays_filtered' | 'overlays_refreshed',
    overlayData: {
      overlayId?: string;
      overlayName?: string;
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-7-rotation-overlay-summary',
        timestamp: new Date().toISOString(),
        userId: overlayData.userId,
        vaultId: overlayData.vaultId,
        data: {
          overlayId: overlayData.overlayId,
          overlayName: overlayData.overlayName,
          ...overlayData.metadata
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
export const rotationOverlayService = new RotationOverlayService();

// React Query hooks for rotation overlay operations
export const useRotationOverlays = (userId: string, vaultId?: string) => {
  return useQuery({
    queryKey: ['rotation-overlays', userId, vaultId],
    queryFn: () => rotationOverlayService.getOverlays(userId, vaultId),
    enabled: !!userId,
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

export const useOverlayDetails = (overlayId: string) => {
  return useQuery({
    queryKey: ['overlay-details', overlayId],
    queryFn: () => rotationOverlayService.getOverlayDetails(overlayId),
    enabled: !!overlayId,
    refetchInterval: 60000,
  });
};

export const useUpdateOverlayStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ overlayId, status }: { overlayId: string; status: RotationOverlay['status'] }) =>
      rotationOverlayService.updateOverlayStatus(overlayId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotation-overlays'] });
      queryClient.invalidateQueries({ queryKey: ['overlay-details'] });
    },
  });
};

export const useTriggerRotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ overlayId, force }: { overlayId: string; force?: boolean }) =>
      rotationOverlayService.triggerRotation(overlayId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotation-overlays'] });
      queryClient.invalidateQueries({ queryKey: ['overlay-details'] });
    },
  });
};

export const useRotationHistory = (overlayId: string, limit?: number) => {
  return useQuery({
    queryKey: ['rotation-history', overlayId, limit],
    queryFn: () => rotationOverlayService.getRotationHistory(overlayId, limit),
    enabled: !!overlayId,
  });
}; 