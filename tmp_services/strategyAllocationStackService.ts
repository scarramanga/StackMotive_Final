import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface StrategyOverlay {
  id: string;
  name: string;
  weight: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  performance: number;
  totalValue: number;
  isActive: boolean;
  category: string;
  lastUpdated: string;
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  assets?: string[];
  configuration?: Record<string, any>;
}

export interface AllocationData {
  overlays: StrategyOverlay[];
  totalPortfolioValue: number;
  totalStrategyCoverage: number;
  lastUpdated: string;
  metadata?: {
    version: string;
    lastCalculated: string;
    source: string;
  };
}

export interface ProcessedAllocationData {
  overlays: StrategyOverlay[];
  totalWeight: number;
  totalValue: number;
  strategyCoverage: number;
  strategyCount: number;
  uncoveredPercentage: number;
  averageSignalStrength: number;
  averagePerformance: number;
  topPerformer?: StrategyOverlay;
  worstPerformer?: StrategyOverlay;
  signalDistribution: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}

export interface SignalConfig {
  signal: 'bullish' | 'bearish' | 'neutral';
  icon: string;
  color: string;
  className: string;
}

export interface AllocationColor {
  index: number;
  className: string;
  hex: string;
  name: string;
}

export interface StrategyDetail {
  id: string;
  name: string;
  expanded: boolean;
  metadata: {
    category: string;
    performance: number;
    signalStrength: number;
    lastUpdated: string;
    weight: number;
    totalValue: number;
  };
}

export interface AllocationStackState {
  expandedStrategies: Set<string>;
  selectedStrategy: string | null;
  viewMode: 'overview' | 'detailed' | 'performance';
  sortBy: 'weight' | 'performance' | 'signal' | 'name';
  sortOrder: 'asc' | 'desc';
  filterSignal: 'all' | 'bullish' | 'bearish' | 'neutral';
}

// ================================
// CONSTANTS
// ================================

export const SIGNAL_CONFIGS: Record<string, SignalConfig> = {
  bullish: {
    signal: 'bullish',
    icon: 'trending-up',
    color: 'green',
    className: 'text-green-600'
  },
  bearish: {
    signal: 'bearish',
    icon: 'trending-down',
    color: 'red',
    className: 'text-red-600'
  },
  neutral: {
    signal: 'neutral',
    icon: 'circle',
    color: 'gray',
    className: 'text-gray-400'
  }
};

export const ALLOCATION_COLORS: AllocationColor[] = [
  { index: 0, className: 'bg-blue-500', hex: '#3B82F6', name: 'Blue' },
  { index: 1, className: 'bg-green-500', hex: '#10B981', name: 'Green' },
  { index: 2, className: 'bg-purple-500', hex: '#8B5CF6', name: 'Purple' },
  { index: 3, className: 'bg-orange-500', hex: '#F97316', name: 'Orange' },
  { index: 4, className: 'bg-pink-500', hex: '#EC4899', name: 'Pink' },
  { index: 5, className: 'bg-indigo-500', hex: '#6366F1', name: 'Indigo' },
  { index: 6, className: 'bg-teal-500', hex: '#14B8A6', name: 'Teal' },
  { index: 7, className: 'bg-red-500', hex: '#EF4444', name: 'Red' }
];

export const SIGNAL_STRENGTH_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
} as const;

export const QUERY_KEYS = {
  STRATEGY_OVERLAYS: 'strategy-overlays',
  ALLOCATION_DATA: 'allocation-data',
  STRATEGY_PERFORMANCE: 'strategy-performance'
} as const;

export const DEFAULT_STATE: AllocationStackState = {
  expandedStrategies: new Set(),
  selectedStrategy: null,
  viewMode: 'overview',
  sortBy: 'weight',
  sortOrder: 'desc',
  filterSignal: 'all'
};

// ================================
// STRATEGY ALLOCATION STACK SERVICE CLASS
// ================================

export class StrategyAllocationStackService {
  // Data Processing
  static processAllocationData(allocationData: AllocationData | null): ProcessedAllocationData | null {
    if (!allocationData?.overlays) return null;
    
    const overlays = allocationData.overlays;
    const activeOverlays = overlays.filter(overlay => overlay.isActive);
    
    // Sort by weight descending by default
    const sortedOverlays = this.sortOverlays(activeOverlays, 'weight', 'desc');
    
    const totalWeight = sortedOverlays.reduce((sum, overlay) => sum + overlay.weight, 0);
    const totalValue = sortedOverlays.reduce((sum, overlay) => sum + overlay.totalValue, 0);
    const strategyCoverage = Math.min(totalWeight, 100);
    const uncoveredPercentage = Math.max(100 - strategyCoverage, 0);
    
    // Calculate averages
    const averageSignalStrength = sortedOverlays.length > 0 
      ? sortedOverlays.reduce((sum, overlay) => sum + overlay.signalStrength, 0) / sortedOverlays.length
      : 0;
    
    const averagePerformance = sortedOverlays.length > 0
      ? sortedOverlays.reduce((sum, overlay) => sum + overlay.performance, 0) / sortedOverlays.length
      : 0;
    
    // Find top and worst performers
    const sortedByPerformance = [...sortedOverlays].sort((a, b) => b.performance - a.performance);
    const topPerformer = sortedByPerformance[0];
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];
    
    // Signal distribution
    const signalDistribution = {
      bullish: sortedOverlays.filter(o => o.signal === 'bullish').length,
      bearish: sortedOverlays.filter(o => o.signal === 'bearish').length,
      neutral: sortedOverlays.filter(o => o.signal === 'neutral').length
    };

    return {
      overlays: sortedOverlays,
      totalWeight,
      totalValue,
      strategyCoverage,
      strategyCount: sortedOverlays.length,
      uncoveredPercentage,
      averageSignalStrength,
      averagePerformance,
      topPerformer,
      worstPerformer,
      signalDistribution
    };
  }

  // Sorting and Filtering
  static sortOverlays(
    overlays: StrategyOverlay[], 
    sortBy: 'weight' | 'performance' | 'signal' | 'name' = 'weight',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): StrategyOverlay[] {
    return [...overlays].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'performance':
          comparison = a.performance - b.performance;
          break;
        case 'signal':
          comparison = a.signalStrength - b.signalStrength;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  static filterOverlaysBySignal(
    overlays: StrategyOverlay[], 
    signalFilter: 'all' | 'bullish' | 'bearish' | 'neutral'
  ): StrategyOverlay[] {
    if (signalFilter === 'all') return overlays;
    return overlays.filter(overlay => overlay.signal === signalFilter);
  }

  // Signal Analysis
  static getSignalConfig(signal: string): SignalConfig {
    return SIGNAL_CONFIGS[signal] || SIGNAL_CONFIGS.neutral;
  }

  static getSignalStrengthColor(strength: number): string {
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.HIGH) return 'bg-green-500';
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.MEDIUM) return 'bg-yellow-500';
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.LOW) return 'bg-orange-500';
    return 'bg-red-500';
  }

  static getSignalStrengthLevel(strength: number): 'high' | 'medium' | 'low' | 'very-low' {
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.HIGH) return 'high';
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.MEDIUM) return 'medium';
    if (strength >= SIGNAL_STRENGTH_THRESHOLDS.LOW) return 'low';
    return 'very-low';
  }

  // Color Management
  static getAllocationColor(index: number): AllocationColor {
    return ALLOCATION_COLORS[index % ALLOCATION_COLORS.length];
  }

  static getAllocationColorClass(index: number): string {
    return this.getAllocationColor(index).className;
  }

  // Performance Analysis
  static calculatePerformanceMetrics(overlays: StrategyOverlay[]): {
    totalReturn: number;
    weightedReturn: number;
    bestPerforming: StrategyOverlay | null;
    worstPerforming: StrategyOverlay | null;
    riskScore: number;
  } {
    if (!overlays.length) {
      return {
        totalReturn: 0,
        weightedReturn: 0,
        bestPerforming: null,
        worstPerforming: null,
        riskScore: 0
      };
    }

    const totalReturn = overlays.reduce((sum, overlay) => sum + overlay.performance, 0);
    
    const totalWeight = overlays.reduce((sum, overlay) => sum + overlay.weight, 0);
    const weightedReturn = totalWeight > 0 
      ? overlays.reduce((sum, overlay) => sum + (overlay.performance * overlay.weight / 100), 0)
      : 0;

    const sortedByPerformance = [...overlays].sort((a, b) => b.performance - a.performance);
    const bestPerforming = sortedByPerformance[0];
    const worstPerforming = sortedByPerformance[sortedByPerformance.length - 1];

    // Simple risk score based on performance variance
    const avgPerformance = totalReturn / overlays.length;
    const variance = overlays.reduce((sum, overlay) => 
      sum + Math.pow(overlay.performance - avgPerformance, 2), 0) / overlays.length;
    const riskScore = Math.sqrt(variance);

    return {
      totalReturn,
      weightedReturn,
      bestPerforming,
      worstPerforming,
      riskScore
    };
  }

  // Allocation Analysis
  static calculateAllocationInsights(data: ProcessedAllocationData): {
    diversificationScore: number;
    concentrationRisk: number;
    signalConsistency: number;
    recommendations: string[];
  } {
    const { overlays, strategyCoverage } = data;
    
    // Diversification: how evenly distributed are the weights
    const expectedWeight = 100 / overlays.length;
    const weightVariance = overlays.reduce((sum, overlay) => 
      sum + Math.pow(overlay.weight - expectedWeight, 2), 0) / overlays.length;
    const diversificationScore = Math.max(0, 100 - (weightVariance / expectedWeight * 100));

    // Concentration risk: percentage of portfolio in top 3 strategies
    const sortedByWeight = [...overlays].sort((a, b) => b.weight - a.weight);
    const top3Weight = sortedByWeight.slice(0, 3).reduce((sum, overlay) => sum + overlay.weight, 0);
    const concentrationRisk = top3Weight;

    // Signal consistency: how aligned are the signals
    const signals = overlays.map(o => o.signal);
    const dominantSignal = signals.reduce((acc, signal) => {
      acc[signal] = (acc[signal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const maxSignalCount = Math.max(...Object.values(dominantSignal));
    const signalConsistency = (maxSignalCount / overlays.length) * 100;

    // Generate recommendations
    const recommendations: string[] = [];
    if (strategyCoverage < 80) {
      recommendations.push('Consider increasing strategy coverage to optimize portfolio management');
    }
    if (concentrationRisk > 60) {
      recommendations.push('High concentration risk detected - consider rebalancing top strategies');
    }
    if (diversificationScore < 50) {
      recommendations.push('Portfolio could benefit from better diversification across strategies');
    }
    if (signalConsistency < 60) {
      recommendations.push('Mixed signals detected - review strategy alignment');
    }

    return {
      diversificationScore,
      concentrationRisk,
      signalConsistency,
      recommendations
    };
  }

  // API Calls
  static async fetchStrategyOverlays(vaultId?: string): Promise<AllocationData> {
    const url = vaultId 
      ? `/api/strategy/overlays?vaultId=${vaultId}`
      : '/api/strategy/overlays';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch strategy overlays');
    }
    
    return response.json();
  }

  static async updateStrategyWeight(strategyId: string, newWeight: number): Promise<void> {
    const response = await fetch(`/api/strategy/overlays/${strategyId}/weight`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: newWeight }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update strategy weight');
    }
  }

  static async toggleStrategyActive(strategyId: string, isActive: boolean): Promise<void> {
    const response = await fetch(`/api/strategy/overlays/${strategyId}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle strategy active state');
    }
  }

  // Agent Memory Logging
  static async logAgentMemory(action: string, details: any): Promise<void> {
    try {
      await fetch('/api/agent/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'StrategyAllocationStackPanel',
          action,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log agent memory:', error);
    }
  }

  // State Management Helpers
  static createInitialState(): AllocationStackState {
    return { ...DEFAULT_STATE };
  }

  static toggleStrategyExpansion(
    currentSet: Set<string>, 
    strategyId: string
  ): Set<string> {
    const newSet = new Set(currentSet);
    if (newSet.has(strategyId)) {
      newSet.delete(strategyId);
    } else {
      newSet.add(strategyId);
    }
    return newSet;
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useStrategyOverlays = (vaultId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.STRATEGY_OVERLAYS, vaultId],
    queryFn: () => StrategyAllocationStackService.fetchStrategyOverlays(vaultId),
    enabled,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const useProcessedAllocationData = (allocationData: AllocationData | undefined) => {
  return useMemo(() => {
    return StrategyAllocationStackService.processAllocationData(allocationData || null);
  }, [allocationData]);
};

export const useAllocationInsights = (processedData: ProcessedAllocationData | null) => {
  return useMemo(() => {
    if (!processedData) return null;
    return StrategyAllocationStackService.calculateAllocationInsights(processedData);
  }, [processedData]);
};

export const usePerformanceMetrics = (overlays: StrategyOverlay[] = []) => {
  return useMemo(() => {
    return StrategyAllocationStackService.calculatePerformanceMetrics(overlays);
  }, [overlays]);
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useAllocationStackState = () => {
  const [state, setState] = useState(() => StrategyAllocationStackService.createInitialState());

  const toggleStrategyDetail = (strategyId: string) => {
    setState(prev => ({
      ...prev,
      expandedStrategies: StrategyAllocationStackService.toggleStrategyExpansion(
        prev.expandedStrategies, 
        strategyId
      )
    }));
    
    StrategyAllocationStackService.logAgentMemory('strategy_detail_toggled', {
      strategyId,
      expanded: !state.expandedStrategies.has(strategyId),
      timestamp: new Date().toISOString()
    });
  };

  const selectStrategy = (strategyId: string | null) => {
    setState(prev => ({ ...prev, selectedStrategy: strategyId }));
    
    if (strategyId) {
      StrategyAllocationStackService.logAgentMemory('strategy_selected', {
        strategyId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const setViewMode = (mode: 'overview' | 'detailed' | 'performance') => {
    setState(prev => ({ ...prev, viewMode: mode }));
    
    StrategyAllocationStackService.logAgentMemory('view_mode_changed', {
      mode,
      timestamp: new Date().toISOString()
    });
  };

  const setSortConfig = (sortBy: 'weight' | 'performance' | 'signal' | 'name', sortOrder: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const setSignalFilter = (filterSignal: 'all' | 'bullish' | 'bearish' | 'neutral') => {
    setState(prev => ({ ...prev, filterSignal }));
  };

  const resetState = () => {
    setState(StrategyAllocationStackService.createInitialState());
  };

  return {
    state,
    toggleStrategyDetail,
    selectStrategy,
    setViewMode,
    setSortConfig,
    setSignalFilter,
    resetState
  };
};

export const useSortedAndFilteredOverlays = (
  overlays: StrategyOverlay[] = [],
  sortBy: 'weight' | 'performance' | 'signal' | 'name' = 'weight',
  sortOrder: 'asc' | 'desc' = 'desc',
  signalFilter: 'all' | 'bullish' | 'bearish' | 'neutral' = 'all'
) => {
  return useMemo(() => {
    const filtered = StrategyAllocationStackService.filterOverlaysBySignal(overlays, signalFilter);
    return StrategyAllocationStackService.sortOverlays(filtered, sortBy, sortOrder);
  }, [overlays, sortBy, sortOrder, signalFilter]);
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString()}`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatSignalStrength = (strength: number): string => {
  return `${strength}%`;
};

export const formatPerformance = (performance: number): string => {
  const sign = performance >= 0 ? '+' : '';
  return `${sign}${performance.toFixed(2)}%`;
};

export const formatLastUpdated = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const getSignalIcon = (signal: string): string => {
  return StrategyAllocationStackService.getSignalConfig(signal).icon;
};

export const getSignalColor = (signal: string): string => {
  return StrategyAllocationStackService.getSignalConfig(signal).className;
};

export const getAllocationColorClass = (index: number): string => {
  return StrategyAllocationStackService.getAllocationColorClass(index);
};

export const getSignalStrengthColorClass = (strength: number): string => {
  return StrategyAllocationStackService.getSignalStrengthColor(strength);
};

export default StrategyAllocationStackService; 