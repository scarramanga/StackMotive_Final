import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface OverlayInfo {
  id: string;
  name: string;
  type: OverlayType;
  category: string;
  isActive: boolean;
  priority?: number;
  parameters?: Record<string, any>;
  metadata?: {
    createdAt: string;
    lastModified: string;
    version: string;
  };
}

export interface OverlayCompatibility {
  overlay1: string;
  overlay2: string;
  status: CompatibilityStatus;
  explanation: string;
  severity: SeverityLevel;
  recommendation?: string;
  impactScore?: number;
  confidence?: number;
}

export interface OverlayData {
  overlays: OverlayInfo[];
  lastUpdated: string;
  vaultId?: string;
  metadata?: {
    totalActive: number;
    totalInactive: number;
    averagePerformance: number;
  };
}

export interface CompatibilityMatrix {
  pairs: OverlayCompatibility[];
  statistics: CompatibilityStatistics;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CompatibilityStatistics {
  total: number;
  compatible: number;
  mildConflicts: number;
  conflicts: number;
  compatibilityScore: number;
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    details: string[];
  };
}

export interface OverlayCompatibilityState {
  overlayHoverId: string | null;
  showConflictsOnly: boolean;
  showBanner: boolean;
  selectedOverlay: string | null;
  filterBy: OverlayFilterType;
  sortBy: OverlaySortType;
  sortOrder: 'asc' | 'desc';
  viewMode: 'matrix' | 'list' | 'graph';
}

export interface CompatibilityRule {
  types: OverlayType[];
  explanation: string;
  severity?: SeverityLevel;
  recommendation?: string;
  conditions?: string[];
}

export interface OverlayAnalysis {
  overlay: OverlayInfo;
  conflictCount: number;
  compatibilityScore: number;
  recommendations: string[];
  riskFactors: string[];
}

// ================================
// ENUMS & CONSTANTS
// ================================

export type OverlayType = 
  | 'momentum' 
  | 'value' 
  | 'growth' 
  | 'defensive' 
  | 'risk_management'
  | 'sector_rotation'
  | 'sentiment'
  | 'technical'
  | 'fundamental'
  | 'macro'
  | 'volatility'
  | 'arbitrage';

export type CompatibilityStatus = 'compatible' | 'mild_conflict' | 'conflict';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type OverlayFilterType = 'all' | 'active' | 'conflicts' | 'compatible';
export type OverlaySortType = 'name' | 'type' | 'conflicts' | 'compatibility';

export const OVERLAY_TYPES = {
  momentum: { label: 'Momentum', description: 'Trend-following strategies', color: 'text-blue-600' },
  value: { label: 'Value', description: 'Undervalued asset strategies', color: 'text-green-600' },
  growth: { label: 'Growth', description: 'High-growth asset strategies', color: 'text-purple-600' },
  defensive: { label: 'Defensive', description: 'Capital preservation strategies', color: 'text-gray-600' },
  risk_management: { label: 'Risk Management', description: 'Risk control overlays', color: 'text-red-600' },
  sector_rotation: { label: 'Sector Rotation', description: 'Sector-based strategies', color: 'text-orange-600' },
  sentiment: { label: 'Sentiment', description: 'Market sentiment strategies', color: 'text-cyan-600' },
  technical: { label: 'Technical', description: 'Technical analysis based', color: 'text-indigo-600' },
  fundamental: { label: 'Fundamental', description: 'Fundamental analysis based', color: 'text-emerald-600' },
  macro: { label: 'Macro', description: 'Macroeconomic strategies', color: 'text-yellow-600' },
  volatility: { label: 'Volatility', description: 'Volatility-based strategies', color: 'text-pink-600' },
  arbitrage: { label: 'Arbitrage', description: 'Market-neutral strategies', color: 'text-teal-600' }
} as const;

export const COMPATIBILITY_STATUS = {
  compatible: { 
    label: 'Compatible', 
    color: 'bg-green-50 border-green-200 text-green-800',
    icon: 'check'
  },
  mild_conflict: { 
    label: 'Mild Conflict', 
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: 'alert-triangle'
  },
  conflict: { 
    label: 'Conflict', 
    color: 'bg-red-50 border-red-200 text-red-800',
    icon: 'x'
  }
} as const;

export const SEVERITY_LEVELS = {
  low: { label: 'Low', color: 'text-blue-600', priority: 1 },
  medium: { label: 'Medium', color: 'text-yellow-600', priority: 2 },
  high: { label: 'High', color: 'text-orange-600', priority: 3 },
  critical: { label: 'Critical', color: 'text-red-600', priority: 4 }
} as const;

export const OVERLAY_COMPATIBILITY_RULES = {
  // High compatibility combinations
  compatible: [
    {
      types: ['momentum', 'risk_management'],
      explanation: 'Momentum strategies benefit from risk management overlays to control drawdowns',
      severity: 'low' as SeverityLevel,
      recommendation: 'Maintain current allocation'
    },
    {
      types: ['value', 'defensive'],
      explanation: 'Value investing pairs well with defensive strategies for steady returns',
      severity: 'low' as SeverityLevel,
      recommendation: 'Consider increasing allocation'
    },
    {
      types: ['growth', 'momentum'],
      explanation: 'Growth and momentum strategies are naturally complementary',
      severity: 'low' as SeverityLevel,
      recommendation: 'Optimal combination for bull markets'
    },
    {
      types: ['defensive', 'risk_management'],
      explanation: 'Both focus on capital preservation and downside protection',
      severity: 'low' as SeverityLevel,
      recommendation: 'Excellent for risk-averse portfolios'
    },
    {
      types: ['technical', 'momentum'],
      explanation: 'Technical analysis enhances momentum strategy effectiveness',
      severity: 'low' as SeverityLevel,
      recommendation: 'Strong synergy for trend identification'
    },
    {
      types: ['fundamental', 'value'],
      explanation: 'Fundamental analysis is core to value investing strategies',
      severity: 'low' as SeverityLevel,
      recommendation: 'Natural pairing for long-term investing'
    },
    {
      types: ['sector_rotation', 'macro'],
      explanation: 'Macroeconomic analysis enhances sector rotation timing',
      severity: 'low' as SeverityLevel,
      recommendation: 'Powerful combination for economic cycle investing'
    }
  ],
  
  // Mild conflict combinations
  mild_conflicts: [
    {
      types: ['momentum', 'defensive'],
      explanation: 'Momentum seeks volatility while defensive avoids it - may reduce effectiveness',
      severity: 'medium' as SeverityLevel,
      recommendation: 'Monitor performance and consider adjusting allocation ratios'
    },
    {
      types: ['value', 'growth'],
      explanation: 'Different time horizons and selection criteria may cause allocation conflicts',
      severity: 'medium' as SeverityLevel,
      recommendation: 'Use separate allocations or time-based rotation'
    },
    {
      types: ['risk_management', 'growth'],
      explanation: 'Risk controls may limit growth potential in bull markets',
      severity: 'medium' as SeverityLevel,
      recommendation: 'Adjust risk parameters based on market conditions'
    },
    {
      types: ['technical', 'fundamental'],
      explanation: 'Different analysis timeframes may generate conflicting signals',
      severity: 'medium' as SeverityLevel,
      recommendation: 'Use weighted approach or separate time horizons'
    },
    {
      types: ['sentiment', 'fundamental'],
      explanation: 'Short-term sentiment may conflict with long-term fundamentals',
      severity: 'medium' as SeverityLevel,
      recommendation: 'Balance sentiment signals with fundamental analysis'
    }
  ],
  
  // Strong conflict combinations
  conflicts: [
    {
      types: ['momentum', 'value'],
      explanation: 'Momentum chases trends while value seeks undervalued assets - opposite approaches',
      severity: 'high' as SeverityLevel,
      recommendation: 'Consider removing one strategy or using time-based alternation'
    },
    {
      types: ['growth', 'defensive'],
      explanation: 'Aggressive growth conflicts with conservative defensive positioning',
      severity: 'high' as SeverityLevel,
      recommendation: 'Choose one primary strategy or use market-condition switching'
    },
    {
      types: ['arbitrage', 'momentum'],
      explanation: 'Market-neutral arbitrage conflicts with directional momentum strategies',
      severity: 'high' as SeverityLevel,
      recommendation: 'Separate portfolios or reduce conflicting allocations'
    },
    {
      types: ['volatility', 'defensive'],
      explanation: 'Volatility strategies thrive on market stress while defensive avoids it',
      severity: 'critical' as SeverityLevel,
      recommendation: 'Fundamental strategy conflict - consider portfolio separation'
    }
  ]
} as const;

export const QUERY_KEYS = {
  OVERLAY_DATA: 'overlay-data',
  OVERLAY_COMPATIBILITY: 'overlay-compatibility',
  OVERLAY_ANALYSIS: 'overlay-analysis'
} as const;

export const DEFAULT_STATE: OverlayCompatibilityState = {
  overlayHoverId: null,
  showConflictsOnly: false,
  showBanner: true,
  selectedOverlay: null,
  filterBy: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'matrix'
};

// ================================
// OVERLAY COMPATIBILITY ENGINE SERVICE CLASS
// ================================

export class OverlayCompatibilityEngineService {
  // Overlay Type Classification
  static classifyOverlayType(name: string, metadata?: any): OverlayType {
    const lowerName = name.toLowerCase();
    
    // Priority-based classification
    if (lowerName.includes('risk') || lowerName.includes('stop') || lowerName.includes('protection')) {
      return 'risk_management';
    }
    if (lowerName.includes('momentum') || lowerName.includes('trend')) {
      return 'momentum';
    }
    if (lowerName.includes('value') || lowerName.includes('undervalued')) {
      return 'value';
    }
    if (lowerName.includes('growth') || lowerName.includes('aggressive')) {
      return 'growth';
    }
    if (lowerName.includes('defensive') || lowerName.includes('conservative')) {
      return 'defensive';
    }
    if (lowerName.includes('sector') || lowerName.includes('rotation')) {
      return 'sector_rotation';
    }
    if (lowerName.includes('sentiment') || lowerName.includes('emotion')) {
      return 'sentiment';
    }
    if (lowerName.includes('technical') || lowerName.includes('chart')) {
      return 'technical';
    }
    if (lowerName.includes('fundamental') || lowerName.includes('analysis')) {
      return 'fundamental';
    }
    if (lowerName.includes('macro') || lowerName.includes('economic')) {
      return 'macro';
    }
    if (lowerName.includes('volatility') || lowerName.includes('vol')) {
      return 'volatility';
    }
    if (lowerName.includes('arbitrage') || lowerName.includes('neutral')) {
      return 'arbitrage';
    }
    
    // Default classification
    return 'defensive';
  }

  // Overlay Processing
  static processOverlayData(rawData: any): OverlayInfo[] {
    if (!rawData?.overlays) return [];

    return rawData.overlays.map((overlay: any) => ({
      id: overlay.id,
      name: overlay.name,
      type: this.classifyOverlayType(overlay.name, overlay.metadata),
      category: overlay.name.includes('Strategy') 
        ? overlay.name.replace(' Strategy', '') 
        : overlay.name,
      isActive: overlay.isActive || false,
      priority: overlay.priority || 1,
      parameters: overlay.parameters || {},
      metadata: overlay.metadata
    }));
  }

  // Compatibility Matrix Generation
  static generateCompatibilityMatrix(overlays: OverlayInfo[]): CompatibilityMatrix {
    const pairs: OverlayCompatibility[] = [];
    
    // Generate all unique pairs
    for (let i = 0; i < overlays.length; i++) {
      for (let j = i + 1; j < overlays.length; j++) {
        const overlay1 = overlays[i];
        const overlay2 = overlays[j];
        
        const compatibility = this.analyzeCompatibility(overlay1, overlay2);
        pairs.push(compatibility);
      }
    }
    
    const statistics = this.calculateCompatibilityStatistics(pairs);
    const recommendations = this.generateRecommendations(pairs, overlays);
    const riskLevel = this.assessOverallRisk(statistics);
    
    return {
      pairs,
      statistics,
      recommendations,
      riskLevel
    };
  }

  // Core Compatibility Analysis
  static analyzeCompatibility(overlay1: OverlayInfo, overlay2: OverlayInfo): OverlayCompatibility {
    let status: CompatibilityStatus = 'compatible';
    let explanation = 'These overlays work well together';
    let severity: SeverityLevel = 'low';
    let recommendation: string | undefined;
    let impactScore = 0;
    let confidence = 0.8;

    // Check for explicit conflicts
    const conflictRule = OVERLAY_COMPATIBILITY_RULES.conflicts.find(rule =>
      this.typesMatch(rule.types, [overlay1.type, overlay2.type])
    );
    
    if (conflictRule) {
      status = 'conflict';
      explanation = conflictRule.explanation;
      severity = conflictRule.severity || 'high';
      recommendation = conflictRule.recommendation;
      impactScore = -3;
      confidence = 0.9;
    } else {
      // Check for mild conflicts
      const mildConflictRule = OVERLAY_COMPATIBILITY_RULES.mild_conflicts.find(rule =>
        this.typesMatch(rule.types, [overlay1.type, overlay2.type])
      );
      
      if (mildConflictRule) {
        status = 'mild_conflict';
        explanation = mildConflictRule.explanation;
        severity = mildConflictRule.severity || 'medium';
        recommendation = mildConflictRule.recommendation;
        impactScore = -1;
        confidence = 0.75;
      } else {
        // Check for explicit compatibility
        const compatibleRule = OVERLAY_COMPATIBILITY_RULES.compatible.find(rule =>
          this.typesMatch(rule.types, [overlay1.type, overlay2.type])
        );
        
        if (compatibleRule) {
          explanation = compatibleRule.explanation;
          recommendation = compatibleRule.recommendation;
          impactScore = 2;
          confidence = 0.85;
        } else {
          // Default neutral compatibility
          explanation = 'No specific interactions detected between these overlay types';
          impactScore = 0;
          confidence = 0.6;
        }
      }
    }

    return {
      overlay1: overlay1.name,
      overlay2: overlay2.name,
      status,
      explanation,
      severity,
      recommendation,
      impactScore,
      confidence
    };
  }

  // Helper method to match overlay types
  private static typesMatch(ruleTypes: OverlayType[], overlayTypes: OverlayType[]): boolean {
    return ruleTypes.every(type => overlayTypes.includes(type)) ||
           ruleTypes.every(type => overlayTypes.includes(type));
  }

  // Statistics and Analytics
  static calculateCompatibilityStatistics(pairs: OverlayCompatibility[]): CompatibilityStatistics {
    const total = pairs.length;
    const compatible = pairs.filter(p => p.status === 'compatible').length;
    const mildConflicts = pairs.filter(p => p.status === 'mild_conflict').length;
    const conflicts = pairs.filter(p => p.status === 'conflict').length;
    
    // Calculate overall compatibility score (0-100)
    const compatibilityScore = total > 0 
      ? Math.round(((compatible * 3 + mildConflicts * 1 + conflicts * -2) / (total * 3)) * 100)
      : 100;
    
    // Risk assessment
    let overall: 'low' | 'medium' | 'high' = 'low';
    const details: string[] = [];
    
    if (conflicts > 0) {
      overall = 'high';
      details.push(`${conflicts} critical conflict${conflicts > 1 ? 's' : ''} detected`);
    } else if (mildConflicts > total * 0.5) {
      overall = 'medium';
      details.push(`${mildConflicts} mild conflict${mildConflicts > 1 ? 's' : ''} may reduce effectiveness`);
    } else {
      details.push('No significant conflicts detected');
    }
    
    if (compatibilityScore < 50) {
      overall = 'high';
      details.push('Low overall compatibility score');
    } else if (compatibilityScore < 75) {
      overall = overall === 'high' ? 'high' : 'medium';
    }
    
    return {
      total,
      compatible,
      mildConflicts,
      conflicts,
      compatibilityScore,
      riskAssessment: { overall, details }
    };
  }

  // Recommendations Generation
  static generateRecommendations(
    pairs: OverlayCompatibility[], 
    overlays: OverlayInfo[]
  ): string[] {
    const recommendations: string[] = [];
    
    const criticalConflicts = pairs.filter(p => p.status === 'conflict');
    const mildConflicts = pairs.filter(p => p.status === 'mild_conflict');
    
    if (criticalConflicts.length > 0) {
      recommendations.push(
        `Resolve ${criticalConflicts.length} critical conflict${criticalConflicts.length > 1 ? 's' : ''} to improve portfolio performance`
      );
    }
    
    if (mildConflicts.length > pairs.length * 0.3) {
      recommendations.push(
        'Consider rebalancing overlay allocations to reduce mild conflicts'
      );
    }
    
    if (overlays.length > 8) {
      recommendations.push(
        'Large number of overlays may increase complexity - consider consolidation'
      );
    }
    
    // Type-specific recommendations
    const types = new Set(overlays.map(o => o.type));
    if (types.has('momentum') && types.has('value')) {
      recommendations.push(
        'Consider time-based rotation between momentum and value strategies'
      );
    }
    
    if (types.has('growth') && types.has('defensive')) {
      recommendations.push(
        'Growth and defensive strategies may benefit from market-condition switching'
      );
    }
    
    return recommendations;
  }

  // Risk Assessment
  static assessOverallRisk(statistics: CompatibilityStatistics): 'low' | 'medium' | 'high' {
    if (statistics.conflicts > 0 || statistics.compatibilityScore < 50) {
      return 'high';
    }
    if (statistics.mildConflicts > statistics.total * 0.4 || statistics.compatibilityScore < 75) {
      return 'medium';
    }
    return 'low';
  }

  // Individual Overlay Analysis
  static analyzeOverlay(overlay: OverlayInfo, allPairs: OverlayCompatibility[]): OverlayAnalysis {
    const relatedPairs = allPairs.filter(p => 
      p.overlay1 === overlay.name || p.overlay2 === overlay.name
    );
    
    const conflictCount = relatedPairs.filter(p => 
      p.status === 'conflict' || p.status === 'mild_conflict'
    ).length;
    
    const compatibilityScore = relatedPairs.length > 0
      ? Math.round(
          relatedPairs
            .map(p => p.impactScore || 0)
            .reduce((sum, score) => sum + score, 0) / relatedPairs.length * 25 + 50
        )
      : 75;
    
    const recommendations: string[] = [];
    const riskFactors: string[] = [];
    
    relatedPairs.forEach(pair => {
      if (pair.status === 'conflict' && pair.recommendation) {
        recommendations.push(pair.recommendation);
      }
      if (pair.status === 'conflict') {
        riskFactors.push(pair.explanation);
      }
    });
    
    return {
      overlay,
      conflictCount,
      compatibilityScore,
      recommendations: [...new Set(recommendations)],
      riskFactors: [...new Set(riskFactors)]
    };
  }

  // Filtering and Sorting
  static filterOverlays(
    overlays: OverlayInfo[], 
    filterBy: OverlayFilterType
  ): OverlayInfo[] {
    switch (filterBy) {
      case 'active':
        return overlays.filter(o => o.isActive);
      case 'all':
      default:
        return overlays;
    }
  }

  static filterCompatibilityPairs(
    pairs: OverlayCompatibility[],
    filterBy: OverlayFilterType
  ): OverlayCompatibility[] {
    switch (filterBy) {
      case 'conflicts':
        return pairs.filter(p => p.status === 'conflict' || p.status === 'mild_conflict');
      case 'compatible':
        return pairs.filter(p => p.status === 'compatible');
      case 'all':
      default:
        return pairs;
    }
  }

  static sortOverlays(
    overlays: OverlayInfo[],
    sortBy: OverlaySortType,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): OverlayInfo[] {
    return [...overlays].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Matrix Utilities
  static getCompatibilityForPair(
    overlay1: OverlayInfo,
    overlay2: OverlayInfo,
    matrix: CompatibilityMatrix
  ): OverlayCompatibility | null {
    return matrix.pairs.find(pair =>
      (pair.overlay1 === overlay1.name && pair.overlay2 === overlay2.name) ||
      (pair.overlay1 === overlay2.name && pair.overlay2 === overlay1.name)
    ) || null;
  }

  // Display Helpers
  static getStatusColor(status: CompatibilityStatus): string {
    return COMPATIBILITY_STATUS[status]?.color || COMPATIBILITY_STATUS.compatible.color;
  }

  static getStatusLabel(status: CompatibilityStatus): string {
    return COMPATIBILITY_STATUS[status]?.label || 'Unknown';
  }

  static getSeverityColor(severity: SeverityLevel): string {
    return SEVERITY_LEVELS[severity]?.color || SEVERITY_LEVELS.low.color;
  }

  static getTypeColor(type: OverlayType): string {
    return OVERLAY_TYPES[type]?.color || 'text-gray-600';
  }

  static getTypeLabel(type: OverlayType): string {
    return OVERLAY_TYPES[type]?.label || type;
  }

  // API Calls
  static async fetchOverlayData(vaultId?: string): Promise<OverlayData> {
    const url = vaultId 
      ? `/api/strategy/overlays?vaultId=${vaultId}`
      : '/api/strategy/overlays';
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch overlay data: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async updateOverlayConfiguration(
    overlayId: string, 
    configuration: any
  ): Promise<void> {
    const response = await fetch(`/api/strategy/overlays/${overlayId}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configuration),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update overlay configuration: ${response.statusText}`);
    }
  }

  static async toggleOverlay(overlayId: string, isActive: boolean): Promise<void> {
    const response = await fetch(`/api/strategy/overlays/${overlayId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to toggle overlay: ${response.statusText}`);
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
          component: 'OverlayCompatibilityPanel',
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
  static createInitialState(): OverlayCompatibilityState {
    return { ...DEFAULT_STATE };
  }

  static updateState(
    currentState: OverlayCompatibilityState,
    updates: Partial<OverlayCompatibilityState>
  ): OverlayCompatibilityState {
    return { ...currentState, ...updates };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useOverlayData = (vaultId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.OVERLAY_DATA, vaultId],
    queryFn: () => OverlayCompatibilityEngineService.fetchOverlayData(vaultId),
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const useToggleOverlay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ overlayId, isActive }: { overlayId: string; isActive: boolean }) =>
      OverlayCompatibilityEngineService.toggleOverlay(overlayId, isActive),
    onSuccess: (_, { overlayId, isActive }) => {
      queryClient.invalidateQueries([QUERY_KEYS.OVERLAY_DATA]);
      OverlayCompatibilityEngineService.logAgentMemory('overlay_toggled', {
        overlayId,
        isActive,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useUpdateOverlayConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ overlayId, configuration }: { overlayId: string; configuration: any }) =>
      OverlayCompatibilityEngineService.updateOverlayConfiguration(overlayId, configuration),
    onSuccess: (_, { overlayId }) => {
      queryClient.invalidateQueries([QUERY_KEYS.OVERLAY_DATA]);
      OverlayCompatibilityEngineService.logAgentMemory('overlay_config_updated', {
        overlayId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useOverlayCompatibilityState = () => {
  const [state, setState] = useState(() => OverlayCompatibilityEngineService.createInitialState());

  const updateState = (updates: Partial<OverlayCompatibilityState>) => {
    setState(prev => OverlayCompatibilityEngineService.updateState(prev, updates));
  };

  const setOverlayHover = (overlayId: string | null) => {
    updateState({ overlayHoverId: overlayId });
  };

  const setShowConflictsOnly = (showConflictsOnly: boolean) => {
    updateState({ showConflictsOnly });
    OverlayCompatibilityEngineService.logAgentMemory('filter_changed', {
      filter: 'showConflictsOnly',
      value: showConflictsOnly,
      timestamp: new Date().toISOString()
    });
  };

  const setShowBanner = (showBanner: boolean) => {
    updateState({ showBanner });
  };

  const selectOverlay = (overlayId: string | null) => {
    updateState({ selectedOverlay: overlayId });
    if (overlayId) {
      OverlayCompatibilityEngineService.logAgentMemory('overlay_selected', {
        overlayId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const resetState = () => {
    setState(OverlayCompatibilityEngineService.createInitialState());
  };

  return {
    state,
    updateState,
    setOverlayHover,
    setShowConflictsOnly,
    setShowBanner,
    selectOverlay,
    resetState
  };
};

export const useProcessedOverlays = (rawData: OverlayData | undefined) => {
  return useMemo(() => {
    if (!rawData) return [];
    return OverlayCompatibilityEngineService.processOverlayData(rawData);
  }, [rawData]);
};

export const useCompatibilityMatrix = (overlays: OverlayInfo[]) => {
  return useMemo(() => {
    return OverlayCompatibilityEngineService.generateCompatibilityMatrix(overlays);
  }, [overlays]);
};

export const useFilteredMatrix = (
  matrix: CompatibilityMatrix,
  filterBy: OverlayFilterType
) => {
  return useMemo(() => {
    const filteredPairs = OverlayCompatibilityEngineService.filterCompatibilityPairs(
      matrix.pairs,
      filterBy
    );
    
    return {
      ...matrix,
      pairs: filteredPairs
    };
  }, [matrix, filterBy]);
};

export const useOverlayAnalyses = (overlays: OverlayInfo[], matrix: CompatibilityMatrix) => {
  return useMemo(() => {
    return overlays.map(overlay =>
      OverlayCompatibilityEngineService.analyzeOverlay(overlay, matrix.pairs)
    );
  }, [overlays, matrix]);
};

// Legacy export for backwards compatibility
export const overlayCompatibilityEngineService = OverlayCompatibilityEngineService;

export default OverlayCompatibilityEngineService; 