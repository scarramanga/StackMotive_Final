import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Vault Snapshot Viewer
export interface VaultSnapshot {
  id: string;
  vaultId: string;
  name: string;
  description?: string;
  timestamp: string;
  createdBy: string;
  type: 'manual' | 'scheduled' | 'trigger-based' | 'backup';
  status: 'completed' | 'processing' | 'failed' | 'archived';
  totalValue: number;
  currency: string;
  assetCount: number;
  positionCount: number;
  metadata: {
    triggerReason?: string;
    scheduleId?: string;
    parentSnapshotId?: string;
    tags: string[];
  };
  data: {
    positions: SnapshotPosition[];
    performance: SnapshotPerformance;
    risk: SnapshotRisk;
    allocation: SnapshotAllocation;
  };
}

export interface SnapshotPosition {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  change24h: number;
  change7d: number;
  change30d: number;
  sector?: string;
  assetClass: string;
  marketCap?: number;
  volume24h?: number;
}

export interface SnapshotPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dayReturn: number;
  dayReturnPercent: number;
  weekReturn: number;
  weekReturnPercent: number;
  monthReturn: number;
  monthReturnPercent: number;
  yearReturn: number;
  yearReturnPercent: number;
  benchmarkComparison: {
    benchmark: string;
    outperformance: number;
    correlation: number;
  };
}

export interface SnapshotRisk {
  portfolioVolatility: number;
  sharpeRatio: number;
  sortino: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
  beta: number;
  alpha: number;
  riskScore: number;
  concentrationRisk: number;
  diversificationRatio: number;
}

export interface SnapshotAllocation {
  byAssetClass: Array<{ name: string; value: number; weight: number }>;
  bySector: Array<{ name: string; value: number; weight: number }>;
  byRegion: Array<{ name: string; value: number; weight: number }>;
  byMarketCap: Array<{ name: string; value: number; weight: number }>;
  topHoldings: Array<{ symbol: string; name: string; weight: number }>;
}

export interface SnapshotComparison {
  snapshot1: VaultSnapshot;
  snapshot2: VaultSnapshot;
  comparison: {
    valueChange: number;
    valueChangePercent: number;
    positionChanges: {
      added: SnapshotPosition[];
      removed: SnapshotPosition[];
      modified: Array<{
        symbol: string;
        before: SnapshotPosition;
        after: SnapshotPosition;
        changes: string[];
      }>;
    };
    allocationChanges: {
      assetClass: Array<{ name: string; before: number; after: number; change: number }>;
      sector: Array<{ name: string; before: number; after: number; change: number }>;
    };
    performanceComparison: {
      returnDifference: number;
      riskDifference: number;
      sharpeDifference: number;
    };
  };
}

export interface SnapshotSchedule {
  id: string;
  name: string;
  vaultId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive: boolean;
  lastSnapshot?: string;
  nextSnapshot: string;
  retentionPolicy: {
    keepDaily: number;
    keepWeekly: number;
    keepMonthly: number;
    keepYearly: number;
  };
}

// Vault Snapshot Viewer Service Class
export class VaultSnapshotViewerService {
  private baseUrl = '/api/vault/snapshots';

  // Fetch snapshots for a vault
  async getSnapshots(vaultId: string, options?: {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<{
    snapshots: VaultSnapshot[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    params.append('vaultId', vaultId);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object' && 'start' in value) {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch snapshots');
    }
    
    return response.json();
  }

  // Get specific snapshot by ID
  async getSnapshot(id: string): Promise<VaultSnapshot> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch snapshot');
    }
    
    return response.json();
  }

  // Create new snapshot
  async createSnapshot(vaultId: string, data: {
    name: string;
    description?: string;
    type: 'manual' | 'scheduled' | 'trigger-based' | 'backup';
    tags?: string[];
  }): Promise<VaultSnapshot> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, ...data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create snapshot');
    }
    
    return response.json();
  }

  // Update snapshot
  async updateSnapshot(id: string, updates: {
    name?: string;
    description?: string;
    tags?: string[];
  }): Promise<VaultSnapshot> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update snapshot');
    }
    
    return response.json();
  }

  // Delete snapshot
  async deleteSnapshot(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete snapshot');
    }
  }

  // Compare two snapshots
  async compareSnapshots(id1: string, id2: string): Promise<SnapshotComparison> {
    const response = await fetch(`${this.baseUrl}/compare?id1=${id1}&id2=${id2}`);
    if (!response.ok) {
      throw new Error('Failed to compare snapshots');
    }
    
    return response.json();
  }

  // Export snapshot
  async exportSnapshot(id: string, format: 'json' | 'csv' | 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${id}/export?format=${format}`);
    if (!response.ok) {
      throw new Error('Failed to export snapshot');
    }
    
    return response.blob();
  }

  // Get snapshot schedules
  async getSchedules(vaultId: string): Promise<SnapshotSchedule[]> {
    const response = await fetch(`${this.baseUrl}/schedules?vaultId=${vaultId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch schedules');
    }
    
    return response.json();
  }

  // Create snapshot schedule
  async createSchedule(schedule: Omit<SnapshotSchedule, 'id' | 'nextSnapshot'>): Promise<SnapshotSchedule> {
    const response = await fetch(`${this.baseUrl}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create schedule');
    }
    
    return response.json();
  }

  // Get snapshot status color
  getSnapshotStatusColor(status: VaultSnapshot['status']): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'archived': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get snapshot type icon
  getSnapshotTypeIcon(type: VaultSnapshot['type']): string {
    switch (type) {
      case 'manual': return 'camera';
      case 'scheduled': return 'clock';
      case 'trigger-based': return 'zap';
      case 'backup': return 'shield';
      default: return 'file';
    }
  }

  // Format currency
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Format percentage
  formatPercentage(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  }

  // Get performance color
  getPerformanceColor(value: number): string {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Calculate snapshot health score
  calculateHealthScore(snapshot: VaultSnapshot): number {
    const risk = snapshot.data.risk;
    const performance = snapshot.data.performance;
    
    // Risk score (0-40 points)
    const riskScore = Math.max(0, 40 - risk.riskScore);
    
    // Performance score (0-30 points)
    const performanceScore = Math.max(0, Math.min(30, performance.yearReturnPercent * 3));
    
    // Diversification score (0-30 points)
    const diversificationScore = Math.max(0, Math.min(30, risk.diversificationRatio * 30));
    
    return Math.round(riskScore + performanceScore + diversificationScore);
  }

  // Get risk level
  getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (riskScore <= 25) return 'low';
    if (riskScore <= 50) return 'medium';
    if (riskScore <= 75) return 'high';
    return 'extreme';
  }

  // Filter snapshots
  filterSnapshots(snapshots: VaultSnapshot[], filters: {
    type?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    search?: string;
  }): VaultSnapshot[] {
    return snapshots.filter(snapshot => {
      if (filters.type && filters.type !== 'all' && snapshot.type !== filters.type) {
        return false;
      }
      
      if (filters.status && filters.status !== 'all' && snapshot.status !== filters.status) {
        return false;
      }
      
      if (filters.dateRange) {
        const snapshotDate = new Date(snapshot.timestamp);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (snapshotDate < startDate || snapshotDate > endDate) {
          return false;
        }
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return snapshot.name.toLowerCase().includes(searchLower) ||
               snapshot.description?.toLowerCase().includes(searchLower) ||
               snapshot.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower));
      }
      
      return true;
    });
  }

  // Sort snapshots
  sortSnapshots(snapshots: VaultSnapshot[], sortBy: 'timestamp' | 'name' | 'value' | 'performance', order: 'asc' | 'desc' = 'desc'): VaultSnapshot[] {
    return [...snapshots].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'value':
          compareValue = a.totalValue - b.totalValue;
          break;
        case 'performance':
          compareValue = a.data.performance.totalReturnPercent - b.data.performance.totalReturnPercent;
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
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

  // Get unique tags
  getUniqueTags(snapshots: VaultSnapshot[]): string[] {
    const allTags = snapshots.flatMap(snapshot => snapshot.metadata.tags);
    return [...new Set(allTags)].sort();
  }

  // Calculate portfolio metrics
  calculatePortfolioMetrics(snapshot: VaultSnapshot): {
    concentration: number;
    diversification: number;
    volatility: number;
    performance: number;
  } {
    const { positions } = snapshot.data;
    
    // Concentration (Herfindahl index)
    const concentration = positions.reduce((sum, pos) => sum + Math.pow(pos.weight / 100, 2), 0);
    
    // Diversification (inverse concentration)
    const diversification = Math.max(0, 1 - concentration);
    
    // Volatility (weighted average of position volatilities)
    const volatility = snapshot.data.risk.portfolioVolatility;
    
    // Performance (annualized return)
    const performance = snapshot.data.performance.yearReturnPercent;
    
    return {
      concentration: concentration * 100,
      diversification: diversification * 100,
      volatility,
      performance
    };
  }

  // Generate snapshot summary
  generateSnapshotSummary(snapshot: VaultSnapshot): {
    topPerformers: SnapshotPosition[];
    topLosers: SnapshotPosition[];
    largestPositions: SnapshotPosition[];
    riskFactors: string[];
    insights: string[];
  } {
    const { positions, risk } = snapshot.data;
    
    // Top performers (by day change)
    const topPerformers = [...positions]
      .sort((a, b) => b.change24h - a.change24h)
      .slice(0, 3);
    
    // Top losers (by day change)
    const topLosers = [...positions]
      .sort((a, b) => a.change24h - b.change24h)
      .slice(0, 3);
    
    // Largest positions (by weight)
    const largestPositions = [...positions]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
    
    // Risk factors
    const riskFactors: string[] = [];
    if (risk.concentrationRisk > 0.3) riskFactors.push('High concentration risk');
    if (risk.portfolioVolatility > 0.25) riskFactors.push('High volatility');
    if (risk.maxDrawdown > 0.2) riskFactors.push('Significant drawdown risk');
    if (risk.sharpeRatio < 0.5) riskFactors.push('Low risk-adjusted returns');
    
    // Insights
    const insights: string[] = [];
    if (risk.diversificationRatio > 0.8) insights.push('Well-diversified portfolio');
    if (risk.sharpeRatio > 1.5) insights.push('Excellent risk-adjusted performance');
    if (snapshot.data.performance.totalReturnPercent > 10) insights.push('Strong overall performance');
    
    return {
      topPerformers,
      topLosers,
      largestPositions,
      riskFactors,
      insights
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

  // Validate snapshot name
  validateSnapshotName(name: string): { isValid: boolean; error?: string } {
    if (!name.trim()) {
      return { isValid: false, error: 'Snapshot name is required' };
    }
    
    if (name.length > 100) {
      return { isValid: false, error: 'Snapshot name must be 100 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return { isValid: false, error: 'Snapshot name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    
    return { isValid: true };
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'snapshots_viewed' | 'snapshot_created' | 'snapshot_updated' | 'snapshot_deleted' | 'snapshot_exported' | 'snapshots_compared' | 'snapshot_filtered' | 'snapshot_sorted' | 'schedule_created' | 'snapshot_details_viewed',
    snapshotData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-35-vault-snapshot-viewer',
        timestamp: new Date().toISOString(),
        userId: snapshotData.userId,
        vaultId: snapshotData.vaultId,
        data: {
          ...snapshotData.metadata
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
export const vaultSnapshotViewerService = new VaultSnapshotViewerService();

// React Query hooks
export const useVaultSnapshots = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/vault/snapshots', vaultId, options],
    queryFn: () => vaultSnapshotViewerService.getSnapshots(vaultId, options),
    enabled: !!vaultId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useSnapshot = (id: string) => {
  return useQuery({
    queryKey: ['/api/vault/snapshots', id],
    queryFn: () => vaultSnapshotViewerService.getSnapshot(id),
    enabled: !!id,
  });
};

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: any }) => 
      vaultSnapshotViewerService.createSnapshot(vaultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/snapshots'] });
    },
  });
};

export const useUpdateSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      vaultSnapshotViewerService.updateSnapshot(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/snapshots'] });
    },
  });
};

export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      vaultSnapshotViewerService.deleteSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/snapshots'] });
    },
  });
};

export const useCompareSnapshots = (id1?: string, id2?: string) => {
  return useQuery({
    queryKey: ['/api/vault/snapshots/compare', id1, id2],
    queryFn: () => vaultSnapshotViewerService.compareSnapshots(id1!, id2!),
    enabled: !!id1 && !!id2,
  });
};

export const useSnapshotSchedules = (vaultId: string) => {
  return useQuery({
    queryKey: ['/api/vault/snapshots/schedules', vaultId],
    queryFn: () => vaultSnapshotViewerService.getSchedules(vaultId),
    enabled: !!vaultId,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (schedule: Omit<SnapshotSchedule, 'id' | 'nextSnapshot'>) => 
      vaultSnapshotViewerService.createSchedule(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/snapshots/schedules'] });
    },
  });
}; 