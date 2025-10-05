import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface OverlayExplanation {
  id: string;
  name: string;
  rationale: string;
  impact: string;
  confidence: number;
  trustScore: number;
  isRecentlyChanged: boolean;
  lastModified?: Date;
  removalImpact?: {
    expectedReturn: number;
    riskChange: number;
    recommendation: string;
  };
  performanceMetrics?: {
    returnContribution: number;
    riskAdjustment: number;
    activeDays: number;
  };
  detailedExplanation?: string;
}

export interface SimulationPreview {
  overlayId: string;
  currentReturn: number;
  projectedReturn: number;
  currentRisk: number;
  projectedRisk: number;
  explanation: string;
  recommendation: 'keep' | 'remove' | 'modify';
  confidence: number;
  impactSummary: {
    returnChange: number;
    riskChange: number;
    recommendation: string;
  };
}

export interface StrategyOverlay {
  id: string;
  name: string;
  assets?: string[];
  enabled: boolean;
  performance?: number;
  totalValue?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  lastModified?: Date;
  configuration?: Record<string, any>;
}

export interface PortfolioSnapshot {
  totalValue: number;
  totalReturnPercent: number;
  totalReturnDollar: number;
  riskScore: number;
  volatility: number;
  assets: {
    symbol: string;
    allocation: number;
    value: number;
    returnPercent: number;
  }[];
  lastUpdated: Date;
}

export interface PerformanceData {
  timeRange: string;
  totalReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  dailyReturns: {
    date: Date;
    return: number;
  }[];
}

export interface TrustScoreMetrics {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: {
    consistency: number;
    performance: number;
    riskManagement: number;
    transparency: number;
  };
  label: string;
  color: string;
}

// ================================
// CONSTANTS
// ================================

export const RATIONALE_TEMPLATES = [
  '{name} is currently optimizing your portfolio by monitoring {assetCount} key assets and adjusting allocation based on market momentum signals.',
  'This overlay focuses on {name} strategies, helping to balance risk and return in your {assets} holdings.',
  '{name} actively manages exposure to reduce downside risk while maintaining upside potential in volatile market conditions.',
  'By analyzing technical indicators, {name} helps time entry and exit points for your key positions.'
];

export const IMPACT_TEMPLATES = [
  'Moderate positive impact on risk-adjusted returns',
  'Significant improvement in portfolio stability',
  'Enhanced downside protection with maintained upside',
  'Optimized asset allocation timing',
  'Improved diversification across market sectors',
  'Dynamic risk management during market volatility'
];

export const DETAILED_EXPLANATIONS = [
  'This overlay monitors market momentum indicators and adjusts portfolio allocation based on trend strength. When bullish momentum is detected, it increases exposure to growth assets. During bearish trends, it reduces risk by shifting to defensive positions.',
  'The strategy uses a combination of technical analysis and fundamental metrics to identify optimal entry and exit points. It continuously rebalances the portfolio to maintain target allocations while adapting to changing market conditions.',
  'This approach leverages machine learning algorithms to predict market movements and adjust position sizes accordingly. The system learns from historical patterns to improve future decision-making.',
  'The overlay employs a multi-factor model that considers volatility, momentum, value, and quality metrics to make allocation decisions. It aims to maximize risk-adjusted returns while maintaining portfolio stability.'
];

export const TRUST_SCORE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.0
} as const;

export const QUERY_KEYS = {
  OVERLAYS: 'strategy-overlays',
  PORTFOLIO_SNAPSHOT: 'portfolio-snapshot',
  PERFORMANCE: 'portfolio-performance',
  AI_ADVISOR: 'ai-advisor'
} as const;

// ================================
// AI PORTFOLIO ADVISOR SERVICE CLASS
// ================================

export class AIPortfolioAdvisorService {
  // Trust Score Calculation
  static calculateTrustScore(overlay: StrategyOverlay): TrustScoreMetrics {
    // Mock calculation based on overlay properties
    const baseScore = Math.random() * 0.4 + 0.6; // 60-100%
    const consistency = Math.random() * 0.3 + 0.7;
    const performance = Math.random() * 0.3 + 0.7;
    const riskManagement = Math.random() * 0.3 + 0.7;
    const transparency = Math.random() * 0.3 + 0.7;

    const score = (consistency + performance + riskManagement + transparency) / 4;

    let level: 'high' | 'medium' | 'low';
    let label: string;
    let color: string;

    if (score >= TRUST_SCORE_THRESHOLDS.HIGH) {
      level = 'high';
      label = 'High Trust';
      color = 'bg-green-100 text-green-800 border-green-200';
    } else if (score >= TRUST_SCORE_THRESHOLDS.MEDIUM) {
      level = 'medium';
      label = 'Medium Trust';
      color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      level = 'low';
      label = 'Low Trust';
      color = 'bg-red-100 text-red-800 border-red-200';
    }

    return {
      score,
      level,
      factors: {
        consistency,
        performance,
        riskManagement,
        transparency
      },
      label,
      color
    };
  }

  // Rationale Generation
  static generateRationale(overlay: StrategyOverlay): string {
    const template = RATIONALE_TEMPLATES[Math.floor(Math.random() * RATIONALE_TEMPLATES.length)];
    return template
      .replace('{name}', overlay.name)
      .replace('{assetCount}', (overlay.assets?.length || 3).toString())
      .replace('{assets}', overlay.assets?.join(', ') || 'core');
  }

  // Impact Summary Generation
  static generateImpactSummary(overlay: StrategyOverlay): string {
    return IMPACT_TEMPLATES[Math.floor(Math.random() * IMPACT_TEMPLATES.length)];
  }

  // Detailed Explanation Generation
  static generateDetailedExplanation(): string {
    return DETAILED_EXPLANATIONS[Math.floor(Math.random() * DETAILED_EXPLANATIONS.length)];
  }

  // Performance Metrics Calculation
  static calculatePerformanceMetrics(overlay: StrategyOverlay): {
    returnContribution: number;
    riskAdjustment: number;
    activeDays: number;
  } {
    return {
      returnContribution: Math.random() * 4 - 1, // -1% to +3%
      riskAdjustment: Math.random() * 2 - 1, // -1% to +1%
      activeDays: Math.floor(Math.random() * 90) + 1 // 1-90 days
    };
  }

  // Overlay Explanation Processing
  static processOverlayExplanations(overlays: StrategyOverlay[]): OverlayExplanation[] {
    return overlays.map((overlay) => {
      const trustScore = this.calculateTrustScore(overlay);
      const isRecentlyChanged = Math.random() > 0.7; // 30% chance of recent changes
      const performanceMetrics = this.calculatePerformanceMetrics(overlay);

      return {
        id: overlay.id,
        name: overlay.name,
        rationale: this.generateRationale(overlay),
        impact: this.generateImpactSummary(overlay),
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        trustScore: trustScore.score,
        isRecentlyChanged,
        lastModified: isRecentlyChanged ? 
          new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : 
          undefined,
        removalImpact: {
          expectedReturn: Math.random() * 2 - 1, // -1% to +1%
          riskChange: Math.random() * 1 - 0.5, // -0.5% to +0.5%
          recommendation: 'Removal may reduce portfolio diversification and impact risk-adjusted returns'
        },
        performanceMetrics,
        detailedExplanation: this.generateDetailedExplanation()
      };
    });
  }

  // Simulation Preview Generation
  static generateSimulationPreview(
    overlayId: string,
    overlay: OverlayExplanation,
    portfolioSnapshot: PortfolioSnapshot | null
  ): SimulationPreview {
    const currentReturn = portfolioSnapshot?.totalReturnPercent || 0;
    const projectedReturn = currentReturn + (Math.random() * 2 - 1); // ±1%
    const currentRisk = portfolioSnapshot?.riskScore || 15.2;
    const projectedRisk = currentRisk + (Math.random() * 2 - 1); // ±1%

    const returnChange = projectedReturn - currentReturn;
    const riskChange = projectedRisk - currentRisk;

    return {
      overlayId,
      currentReturn,
      projectedReturn,
      currentRisk,
      projectedRisk,
      explanation: `Removing ${overlay.name} would eliminate its momentum-based adjustments, potentially reducing portfolio responsiveness to market trends but also decreasing volatility.`,
      recommendation: Math.random() > 0.6 ? 'keep' : Math.random() > 0.3 ? 'remove' : 'modify',
      confidence: Math.random() * 0.3 + 0.7,
      impactSummary: {
        returnChange,
        riskChange,
        recommendation: returnChange > 0 ? 'Positive impact expected' : 'Negative impact expected'
      }
    };
  }

  // API Calls
  static async fetchStrategyOverlays(vaultId?: string): Promise<{ overlays: StrategyOverlay[] }> {
    const url = vaultId 
      ? `/api/strategy/overlays?vaultId=${vaultId}`
      : '/api/strategy/overlays';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch strategy overlays');
    }
    
    return response.json();
  }

  static async fetchPortfolioSnapshot(vaultId?: string): Promise<PortfolioSnapshot> {
    const url = vaultId 
      ? `/api/portfolio/snapshot?vaultId=${vaultId}`
      : '/api/portfolio/snapshot';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio snapshot');
    }
    
    return response.json();
  }

  static async fetchPerformanceData(vaultId?: string, timeRange: string = '30d'): Promise<PerformanceData> {
    const url = vaultId 
      ? `/api/portfolio/performance?vaultId=${vaultId}&timeRange=${timeRange}`
      : `/api/portfolio/performance?timeRange=${timeRange}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch performance data');
    }
    
    return response.json();
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
          component: 'AIPortfolioAdvisorPanel',
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
  static createInitialState() {
    return {
      expandedOverlayId: null as string | null,
      simulateWithoutOverlayId: null as string | null,
      selectedOverlayId: null as string | null,
      viewMode: 'overview' as 'overview' | 'detailed' | 'simulation'
    };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useStrategyOverlays = (vaultId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.OVERLAYS, vaultId],
    queryFn: () => AIPortfolioAdvisorService.fetchStrategyOverlays(vaultId),
    enabled,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const usePortfolioSnapshot = (vaultId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PORTFOLIO_SNAPSHOT, vaultId],
    queryFn: () => AIPortfolioAdvisorService.fetchPortfolioSnapshot(vaultId),
    enabled,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const usePerformanceData = (vaultId?: string, timeRange: string = '30d', enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERFORMANCE, vaultId, timeRange],
    queryFn: () => AIPortfolioAdvisorService.fetchPerformanceData(vaultId, timeRange),
    enabled,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useOverlayExplanations = (overlayData: { overlays: StrategyOverlay[] } | undefined) => {
  return useMemo(() => {
    if (!overlayData?.overlays) return [];
    return AIPortfolioAdvisorService.processOverlayExplanations(overlayData.overlays);
  }, [overlayData]);
};

export const useSimulationPreview = (
  simulateWithoutOverlayId: string | null,
  overlayExplanations: OverlayExplanation[],
  portfolioSnapshot: PortfolioSnapshot | null
) => {
  return useMemo(() => {
    if (!simulateWithoutOverlayId) return null;
    
    const overlay = overlayExplanations.find(o => o.id === simulateWithoutOverlayId);
    if (!overlay) return null;

    return AIPortfolioAdvisorService.generateSimulationPreview(
      simulateWithoutOverlayId,
      overlay,
      portfolioSnapshot
    );
  }, [simulateWithoutOverlayId, overlayExplanations, portfolioSnapshot]);
};

export const useAIAdvisorState = () => {
  const [state, setState] = useState(() => AIPortfolioAdvisorService.createInitialState());

  const handleToggleExpand = (overlayId: string) => {
    setState(prev => ({
      ...prev,
      expandedOverlayId: prev.expandedOverlayId === overlayId ? null : overlayId
    }));
    
    AIPortfolioAdvisorService.logAgentMemory('overlay_expanded', {
      overlayId,
      expanded: state.expandedOverlayId !== overlayId,
      timestamp: new Date().toISOString()
    });
  };

  const handleSimulate = (overlayId: string) => {
    setState(prev => ({
      ...prev,
      simulateWithoutOverlayId: prev.simulateWithoutOverlayId === overlayId ? null : overlayId
    }));
    
    AIPortfolioAdvisorService.logAgentMemory('simulation_triggered', {
      overlayId,
      action: state.simulateWithoutOverlayId === overlayId ? 'close' : 'open',
      timestamp: new Date().toISOString()
    });
  };

  const handleCloseSimulation = () => {
    setState(prev => ({
      ...prev,
      simulateWithoutOverlayId: null
    }));
  };

  const handleViewModeChange = (mode: 'overview' | 'detailed' | 'simulation') => {
    setState(prev => ({
      ...prev,
      viewMode: mode
    }));
    
    AIPortfolioAdvisorService.logAgentMemory('view_mode_changed', {
      mode,
      timestamp: new Date().toISOString()
    });
  };

  const resetState = () => {
    setState(AIPortfolioAdvisorService.createInitialState());
  };

  return {
    state,
    handleToggleExpand,
    handleSimulate,
    handleCloseSimulation,
    handleViewModeChange,
    resetState
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const getTrustScoreDisplay = (score: number) => {
  return AIPortfolioAdvisorService.calculateTrustScore({ 
    id: '', 
    name: '', 
    enabled: true 
  });
};

export const formatConfidenceScore = (confidence: number): string => {
  return `${(confidence * 100).toFixed(0)}%`;
};

export const formatReturnChange = (change: number): string => {
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
};

export const formatPerformanceMetric = (value: number, type: 'return' | 'risk' | 'days'): string => {
  switch (type) {
    case 'return':
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'risk':
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'days':
      return `${Math.floor(value)} days`;
    default:
      return value.toString();
  }
};

export const getRecommendationBadgeVariant = (recommendation: string) => {
  switch (recommendation) {
    case 'keep':
      return 'default';
    case 'remove':
      return 'destructive';
    case 'modify':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const isOverlayRecentlyChanged = (lastModified?: Date): boolean => {
  if (!lastModified) return false;
  const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceModified <= 7;
};

export default AIPortfolioAdvisorService; 