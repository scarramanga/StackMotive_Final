import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Post-Rebalance Summary
export interface RebalanceResult {
  id: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'partial' | 'failed';
  triggeredBy: string;
  affectedOverlays: AffectedOverlay[];
  summary: RebalanceSummary;
  performance: PerformanceMetrics;
  costs: CostBreakdown;
  isReviewed: boolean;
  userNotes: string;
}

export interface AffectedOverlay {
  id: string;
  name: string;
  previousWeight: number;
  newWeight: number;
  weightChange: number;
  executionStatus: 'completed' | 'partial' | 'failed';
  trades: number;
  value: number;
  performance: number;
}

export interface RebalanceSummary {
  totalTrades: number;
  totalValue: number;
  successRate: number;
  avgExecutionTime: number;
  riskDeltaBefore: number;
  riskDeltaAfter: number;
  riskImprovement: number;
}

export interface PerformanceMetrics {
  winningOverlays: number;
  losingOverlays: number;
  neutralOverlays: number;
  bestPerformer: string;
  worstPerformer: string;
  avgPerformance: number;
}

export interface CostBreakdown {
  tradingFees: number;
  slippage: number;
  gasFeesEth: number;
  totalCost: number;
}

export interface RebalanceSummaryData {
  result: RebalanceResult;
  lastUpdated: string;
}

export interface SummaryState {
  isExpanded: boolean;
  notes: string;
  isExporting: boolean;
}

// Post-Rebalance Summary Service Class
export class PostRebalanceSummaryService {
  private baseUrl = '/api/portfolio/rebalance-summary';

  // Fetch rebalance summary data
  async getRebalanceSummary(vaultId?: string): Promise<RebalanceSummaryData> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch rebalance summary');
    }
    
    return response.json();
  }

  // Mark rebalance as reviewed
  async markAsReviewed(
    rebalanceId: string, 
    userNotes: string, 
    vaultId?: string
  ): Promise<any> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-review?vaultId=${vaultId}`
      : '/api/portfolio/rebalance-review';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rebalanceId,
        userNotes,
        reviewed: true,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark as reviewed');
    }
    
    return response.json();
  }

  // Export rebalance summary to PDF
  async exportToPDF(rebalanceId: string, vaultId?: string): Promise<Blob> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-export?vaultId=${vaultId}&rebalanceId=${rebalanceId}&format=pdf`
      : `/api/portfolio/rebalance-export?rebalanceId=${rebalanceId}&format=pdf`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }
    
    return response.blob();
  }

  // **BUSINESS LOGIC METHODS**

  // Initialize summary state
  createInitialState(): SummaryState {
    return {
      isExpanded: true,
      notes: '',
      isExporting: false,
    };
  }

  // Update state for notes from existing data
  updateNotesFromData(currentState: SummaryState, result: RebalanceResult): SummaryState {
    if (result.userNotes && !currentState.notes) {
      return { ...currentState, notes: result.userNotes };
    }
    return currentState;
  }

  // Toggle expanded view
  toggleExpanded(currentState: SummaryState): SummaryState {
    return { ...currentState, isExpanded: !currentState.isExpanded };
  }

  // Update notes
  updateNotes(currentState: SummaryState, notes: string): SummaryState {
    return { ...currentState, notes };
  }

  // Set exporting state
  setExporting(currentState: SummaryState, isExporting: boolean): SummaryState {
    return { ...currentState, isExporting };
  }

  // Get status badge data
  getStatusBadge(status: string): { className: string; label: string } {
    switch (status) {
      case 'completed':
        return { className: 'bg-green-100 text-green-800', label: 'Completed' };
      case 'partial':
        return { className: 'bg-yellow-100 text-yellow-800', label: 'Partial' };
      case 'failed':
        return { className: 'bg-red-100 text-red-800', label: 'Failed' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  }

  // Get performance badge data
  getPerformanceBadge(performance: number): { className: string; label: string } {
    if (performance > 0) {
      return { 
        className: 'bg-green-100 text-green-800', 
        label: `+${performance.toFixed(2)}%` 
      };
    } else if (performance < 0) {
      return { 
        className: 'bg-red-100 text-red-800', 
        label: `${performance.toFixed(2)}%` 
      };
    } else {
      return { 
        className: 'bg-gray-100 text-gray-800', 
        label: '0.00%' 
      };
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

  // Format percentage with sign
  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Format duration (seconds to readable format)
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  // Get risk improvement color
  getRiskImprovementColor(improvement: number): string {
    if (improvement > 0) return 'text-green-600';
    if (improvement < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // Get weight change color
  getWeightChangeColor(change: number): string {
    return change > 0 ? 'text-green-600' : 'text-red-600';
  }

  // Calculate overall performance rating
  calculatePerformanceRating(result: RebalanceResult): 'excellent' | 'good' | 'fair' | 'poor' {
    const successRate = result.summary.successRate;
    const riskImprovement = result.summary.riskImprovement;
    const avgPerformance = result.performance.avgPerformance;
    
    const score = (successRate / 100) * 0.4 + 
                  (Math.max(0, riskImprovement) / 10) * 0.3 + 
                  (Math.max(0, avgPerformance) / 10) * 0.3;
    
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  // Get performance rating color
  getPerformanceRatingColor(rating: 'excellent' | 'good' | 'fair' | 'poor'): string {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
    }
  }

  // Calculate cost efficiency
  calculateCostEfficiency(costs: CostBreakdown, totalValue: number): number {
    return (costs.totalCost / totalValue) * 100;
  }

  // Get cost efficiency rating
  getCostEfficiencyRating(efficiency: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (efficiency <= 0.5) return 'excellent';
    if (efficiency <= 1.0) return 'good';
    if (efficiency <= 2.0) return 'fair';
    return 'poor';
  }

  // Validate review notes
  validateReviewNotes(notes: string): { isValid: boolean; trimmed: string } {
    const trimmed = notes.trim();
    return {
      isValid: true, // Notes are optional
      trimmed
    };
  }

  // Create export filename
  createExportFilename(rebalanceId: string, format: 'pdf' | 'csv' = 'pdf'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `rebalance-summary-${rebalanceId}-${timestamp}.${format}`;
  }

  // Handle PDF download
  async handlePDFDownload(blob: Blob, filename: string): Promise<void> {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Calculate summary statistics
  calculateSummaryStats(result: RebalanceResult): {
    totalOverlays: number;
    successfulOverlays: number;
    winRate: number;
    avgCostPerTrade: number;
    riskReduction: number;
  } {
    const totalOverlays = result.affectedOverlays.length;
    const successfulOverlays = result.affectedOverlays.filter(o => o.executionStatus === 'completed').length;
    const winRate = totalOverlays > 0 ? (successfulOverlays / totalOverlays) * 100 : 0;
    const avgCostPerTrade = result.summary.totalTrades > 0 ? result.costs.totalCost / result.summary.totalTrades : 0;
    const riskReduction = result.summary.riskDeltaBefore - result.summary.riskDeltaAfter;

    return {
      totalOverlays,
      successfulOverlays,
      winRate,
      avgCostPerTrade,
      riskReduction,
    };
  }

  // Get best and worst performing overlays
  getPerformanceExtremes(overlays: AffectedOverlay[]): {
    best: AffectedOverlay | null;
    worst: AffectedOverlay | null;
  } {
    if (overlays.length === 0) return { best: null, worst: null };
    
    const sorted = [...overlays].sort((a, b) => b.performance - a.performance);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
    };
  }

  // Check if rebalance needs attention
  needsAttention(result: RebalanceResult): boolean {
    return (
      result.status === 'failed' ||
      result.summary.successRate < 80 ||
      result.summary.riskImprovement < 0 ||
      result.costs.totalCost > result.summary.totalValue * 0.02 // More than 2% in costs
    );
  }

  // Get attention level
  getAttentionLevel(result: RebalanceResult): 'none' | 'low' | 'medium' | 'high' {
    if (!this.needsAttention(result)) return 'none';
    
    if (result.status === 'failed' || result.summary.riskImprovement < -5) return 'high';
    if (result.summary.successRate < 60 || result.summary.riskImprovement < -2) return 'medium';
    return 'low';
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'summary_viewed' | 'summary_expanded' | 'summary_exported' | 'rebalance_reviewed' | 'notes_added' | 'performance_analyzed',
    summaryData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-31-post-rebalance-summary',
        timestamp: new Date().toISOString(),
        userId: summaryData.userId,
        vaultId: summaryData.vaultId,
        data: {
          ...summaryData.metadata
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
export const postRebalanceSummaryService = new PostRebalanceSummaryService();

// React Query hooks
export const useRebalanceSummary = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/portfolio/rebalance-summary', vaultId],
    queryFn: () => postRebalanceSummaryService.getRebalanceSummary(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useMarkAsReviewed = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ rebalanceId, userNotes, vaultId }: {
      rebalanceId: string;
      userNotes: string;
      vaultId?: string;
    }) => postRebalanceSummaryService.markAsReviewed(rebalanceId, userNotes, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/rebalance-summary'] });
    },
  });
}; 