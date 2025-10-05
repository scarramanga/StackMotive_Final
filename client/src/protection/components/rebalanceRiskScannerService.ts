import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Rebalance Risk Scanner
export interface RebalanceRiskAssessment {
  id: string;
  vaultId: string;
  timestamp: string;
  portfolioValue: number;
  riskProfile: PortfolioRiskProfile;
  proposedChanges: ProposedChange[];
  riskMetrics: RiskMetrics;
  riskScenarios: RiskScenario[];
  warnings: RiskWarning[];
  recommendations: RiskRecommendation[];
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'requires_review';
}

export interface PortfolioRiskProfile {
  currentAllocation: AllocationBreakdown;
  proposedAllocation: AllocationBreakdown;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon: string;
  constraints: {
    maxSinglePosition: number;
    maxSectorExposure: number;
    minDiversification: number;
    maxVolatility: number;
    maxDrawdown: number;
  };
}

export interface AllocationBreakdown {
  byAsset: Array<{ symbol: string; weight: number; value: number }>;
  bySector: Array<{ sector: string; weight: number; value: number }>;
  byRegion: Array<{ region: string; weight: number; value: number }>;
  byAssetClass: Array<{ assetClass: string; weight: number; value: number }>;
  byRiskLevel: Array<{ riskLevel: string; weight: number; value: number }>;
}

export interface ProposedChange {
  symbol: string;
  currentWeight: number;
  proposedWeight: number;
  weightChange: number;
  currentValue: number;
  proposedValue: number;
  valueChange: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedCost: number;
  riskImpact: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskMetrics {
  before: PortfolioMetrics;
  after: PortfolioMetrics;
  changes: MetricChanges;
}

export interface PortfolioMetrics {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  beta: number;
  alpha: number;
  correlations: Array<{ symbol: string; correlation: number }>;
  concentrationRisk: number;
  diversificationRatio: number;
}

export interface MetricChanges {
  volatilityChange: number;
  sharpeChange: number;
  maxDrawdownChange: number;
  varChange: number;
  concentrationChange: number;
  diversificationChange: number;
}

export interface RiskScenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  marketConditions: {
    marketDirection: 'bull' | 'bear' | 'sideways';
    volatilityRegime: 'low' | 'medium' | 'high';
    correlationRegime: 'low' | 'medium' | 'high';
  };
  impactAnalysis: {
    portfolioReturn: number;
    maxDrawdown: number;
    worstAssets: Array<{ symbol: string; return: number }>;
    bestAssets: Array<{ symbol: string; return: number }>;
  };
  mitigationStrategies: string[];
}

export interface RiskWarning {
  id: string;
  type: 'concentration' | 'correlation' | 'volatility' | 'liquidity' | 'sector' | 'currency' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAssets: string[];
  riskScore: number;
  likelihood: number;
  impact: number;
  mitigationSuggestions: string[];
  isBlocking: boolean;
}

export interface RiskRecommendation {
  id: string;
  type: 'reduce_position' | 'increase_diversification' | 'hedge_risk' | 'delay_rebalance' | 'adjust_allocation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  expectedBenefit: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedCost: number;
  timeframe: string;
  alternativeOptions: string[];
}

export interface RiskScannerConfig {
  scanFrequency: 'manual' | 'before_rebalance' | 'daily' | 'weekly';
  riskThresholds: {
    maxVolatility: number;
    maxConcentration: number;
    maxDrawdown: number;
    minDiversification: number;
    maxSectorExposure: number;
  };
  scenarioTypes: string[];
  warningTypes: string[];
  autoApprovalRules: {
    enabled: boolean;
    maxRiskScore: number;
    requiresReview: string[];
  };
}

// Rebalance Risk Scanner Service Class
export class RebalanceRiskScannerService {
  private baseUrl = '/api/rebalance/risk-scanner';

  // Run risk assessment
  async runRiskAssessment(vaultId: string, proposedChanges: ProposedChange[]): Promise<RebalanceRiskAssessment> {
    const response = await fetch(`${this.baseUrl}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, proposedChanges }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to run risk assessment');
    }
    
    return response.json();
  }

  // Get existing risk assessment
  async getRiskAssessment(id: string): Promise<RebalanceRiskAssessment> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch risk assessment');
    }
    
    return response.json();
  }

  // Get risk assessments for vault
  async getRiskAssessments(vaultId: string, options?: {
    limit?: number;
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<{
    assessments: RebalanceRiskAssessment[];
    total: number;
    summary: {
      totalScans: number;
      avgRiskScore: number;
      highRiskScans: number;
      blockedRebalances: number;
    };
  }> {
    const params = new URLSearchParams();
    params.append('vaultId', vaultId);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch risk assessments');
    }
    
    return response.json();
  }

  // Approve risk assessment
  async approveRiskAssessment(id: string, comments?: string): Promise<RebalanceRiskAssessment> {
    const response = await fetch(`${this.baseUrl}/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve risk assessment');
    }
    
    return response.json();
  }

  // Reject risk assessment
  async rejectRiskAssessment(id: string, reason: string): Promise<RebalanceRiskAssessment> {
    const response = await fetch(`${this.baseUrl}/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to reject risk assessment');
    }
    
    return response.json();
  }

  // Get risk scanner configuration
  async getRiskScannerConfig(vaultId: string): Promise<RiskScannerConfig> {
    const response = await fetch(`${this.baseUrl}/config?vaultId=${vaultId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch risk scanner configuration');
    }
    
    return response.json();
  }

  // Update risk scanner configuration
  async updateRiskScannerConfig(vaultId: string, config: RiskScannerConfig): Promise<RiskScannerConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, config }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update risk scanner configuration');
    }
    
    return response.json();
  }

  // Run scenario analysis
  async runScenarioAnalysis(vaultId: string, scenarios: string[]): Promise<RiskScenario[]> {
    const response = await fetch(`${this.baseUrl}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, scenarios }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to run scenario analysis');
    }
    
    return response.json();
  }

  // Get risk level color
  getRiskLevelColor(riskLevel: RebalanceRiskAssessment['riskLevel']): string {
    switch (riskLevel) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'extreme': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get risk level background
  getRiskLevelBackground(riskLevel: RebalanceRiskAssessment['riskLevel']): string {
    switch (riskLevel) {
      case 'low': return 'bg-green-50 border-green-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'extreme': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get warning severity color
  getWarningSeverityColor(severity: RiskWarning['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get approval status color
  getApprovalStatusColor(status: RebalanceRiskAssessment['approvalStatus']): string {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'requires_review': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  }

  // Format risk score
  formatRiskScore(score: number): string {
    return `${score.toFixed(1)}/100`;
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  }

  // Calculate risk score
  calculateRiskScore(metrics: RiskMetrics, warnings: RiskWarning[]): number {
    let baseScore = 0;
    
    // Volatility component (0-25 points)
    const volatilityScore = Math.min(25, metrics.after.volatility * 100);
    baseScore += volatilityScore;
    
    // Concentration component (0-25 points)
    const concentrationScore = Math.min(25, metrics.after.concentrationRisk * 100);
    baseScore += concentrationScore;
    
    // Drawdown component (0-25 points)
    const drawdownScore = Math.min(25, Math.abs(metrics.after.maxDrawdown) * 100);
    baseScore += drawdownScore;
    
    // Warnings component (0-25 points)
    const warningScore = Math.min(25, warnings.length * 5);
    baseScore += warningScore;
    
    return Math.min(100, baseScore);
  }

  // Determine risk level
  determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'extreme';
  }

  // Get change impact color
  getChangeImpactColor(change: number): string {
    if (Math.abs(change) < 0.01) return 'text-gray-600';
    return change > 0 ? 'text-red-600' : 'text-green-600';
  }

  // Categorize warnings
  categorizeWarnings(warnings: RiskWarning[]): {
    critical: RiskWarning[];
    high: RiskWarning[];
    medium: RiskWarning[];
    low: RiskWarning[];
    blocking: RiskWarning[];
  } {
    return {
      critical: warnings.filter(w => w.severity === 'critical'),
      high: warnings.filter(w => w.severity === 'high'),
      medium: warnings.filter(w => w.severity === 'medium'),
      low: warnings.filter(w => w.severity === 'low'),
      blocking: warnings.filter(w => w.isBlocking)
    };
  }

  // Calculate concentration risk
  calculateConcentrationRisk(allocation: AllocationBreakdown): {
    singleAssetRisk: number;
    sectorRisk: number;
    regionRisk: number;
    overallRisk: number;
    topConcentrations: Array<{ type: string; name: string; weight: number }>;
  } {
    // Single asset concentration
    const maxAssetWeight = Math.max(...allocation.byAsset.map(a => a.weight));
    const singleAssetRisk = maxAssetWeight > 0.2 ? (maxAssetWeight - 0.2) * 5 : 0;
    
    // Sector concentration
    const maxSectorWeight = Math.max(...allocation.bySector.map(s => s.weight));
    const sectorRisk = maxSectorWeight > 0.3 ? (maxSectorWeight - 0.3) * 3 : 0;
    
    // Region concentration
    const maxRegionWeight = Math.max(...allocation.byRegion.map(r => r.weight));
    const regionRisk = maxRegionWeight > 0.6 ? (maxRegionWeight - 0.6) * 2 : 0;
    
    const overallRisk = (singleAssetRisk + sectorRisk + regionRisk) / 3;
    
    // Top concentrations
    const topConcentrations = [
      ...allocation.byAsset.filter(a => a.weight > 0.1).map(a => ({ type: 'Asset', name: a.symbol, weight: a.weight })),
      ...allocation.bySector.filter(s => s.weight > 0.25).map(s => ({ type: 'Sector', name: s.sector, weight: s.weight })),
      ...allocation.byRegion.filter(r => r.weight > 0.5).map(r => ({ type: 'Region', name: r.region, weight: r.weight }))
    ].sort((a, b) => b.weight - a.weight).slice(0, 5);
    
    return {
      singleAssetRisk,
      sectorRisk,
      regionRisk,
      overallRisk,
      topConcentrations
    };
  }

  // Generate risk summary
  generateRiskSummary(assessment: RebalanceRiskAssessment): {
    overallAssessment: string;
    keyRisks: string[];
    mitigationPriorities: string[];
    recommendedActions: string[];
  } {
    const { riskLevel, overallRiskScore, warnings, recommendations } = assessment;
    
    let overallAssessment = '';
    switch (riskLevel) {
      case 'low':
        overallAssessment = 'Low risk rebalancing with manageable exposure';
        break;
      case 'medium':
        overallAssessment = 'Moderate risk requiring careful monitoring';
        break;
      case 'high':
        overallAssessment = 'High risk rebalancing requiring immediate attention';
        break;
      case 'extreme':
        overallAssessment = 'Extreme risk - consider delaying or modifying rebalancing';
        break;
    }
    
    const keyRisks = warnings
      .filter(w => w.severity === 'high' || w.severity === 'critical')
      .map(w => w.title)
      .slice(0, 3);
    
    const mitigationPriorities = warnings
      .filter(w => w.isBlocking)
      .map(w => w.mitigationSuggestions[0])
      .filter(Boolean)
      .slice(0, 3);
    
    const recommendedActions = recommendations
      .filter(r => r.priority === 'high')
      .map(r => r.title)
      .slice(0, 3);
    
    return {
      overallAssessment,
      keyRisks,
      mitigationPriorities,
      recommendedActions
    };
  }

  // Validate risk thresholds
  validateRiskThresholds(config: RiskScannerConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const { riskThresholds } = config;
    
    if (riskThresholds.maxVolatility <= 0 || riskThresholds.maxVolatility > 1) {
      errors.push('Max volatility must be between 0 and 1');
    }
    
    if (riskThresholds.maxConcentration <= 0 || riskThresholds.maxConcentration > 1) {
      errors.push('Max concentration must be between 0 and 1');
    }
    
    if (riskThresholds.maxDrawdown >= 0 || riskThresholds.maxDrawdown < -1) {
      errors.push('Max drawdown must be between -1 and 0');
    }
    
    if (riskThresholds.minDiversification < 0 || riskThresholds.minDiversification > 1) {
      errors.push('Min diversification must be between 0 and 1');
    }
    
    if (riskThresholds.maxSectorExposure <= 0 || riskThresholds.maxSectorExposure > 1) {
      errors.push('Max sector exposure must be between 0 and 1');
    }
    
    // Warnings for potentially problematic thresholds
    if (riskThresholds.maxVolatility > 0.3) {
      warnings.push('High volatility threshold may allow excessive risk');
    }
    
    if (riskThresholds.maxConcentration > 0.3) {
      warnings.push('High concentration threshold may reduce diversification');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
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

  // Create default risk scanner config
  createDefaultRiskScannerConfig(): RiskScannerConfig {
    return {
      scanFrequency: 'before_rebalance',
      riskThresholds: {
        maxVolatility: 0.25,
        maxConcentration: 0.2,
        maxDrawdown: -0.15,
        minDiversification: 0.7,
        maxSectorExposure: 0.3
      },
      scenarioTypes: ['market_crash', 'sector_rotation', 'interest_rate_shock', 'liquidity_crisis'],
      warningTypes: ['concentration', 'correlation', 'volatility', 'liquidity', 'sector'],
      autoApprovalRules: {
        enabled: false,
        maxRiskScore: 25,
        requiresReview: ['concentration', 'liquidity']
      }
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'risk_scan_triggered' | 'risk_scan_filtered' | 'risk_scan_refreshed' | 'risk_threshold_breach',
    riskData: {
      userId?: string;
      vaultId?: string;
      riskCount?: number;
      highRiskCount?: number;
      filterApplied?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-21-rebalance-risk-scanner',
        timestamp: new Date().toISOString(),
        userId: riskData.userId,
        vaultId: riskData.vaultId,
        data: {
          riskCount: riskData.riskCount,
          highRiskCount: riskData.highRiskCount,
          filterApplied: riskData.filterApplied,
          ...riskData.metadata
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

  // Transform backend response to frontend format
  transformRiskData(backendData: any): {
    risks: Array<{
      id: string;
      overlay: string;
      riskType: 'drift' | 'trust' | 'signal';
      severity: 'low' | 'medium' | 'high';
      signalStatus: 'bullish' | 'bearish' | 'neutral';
      daysSinceLastRotation: number;
      currentWeight: number;
      targetWeight: number;
      weightDrift: number;
      trustScore: number;
      signalStrength: number;
      riskScore: number;
      description: string;
      recommendedAction: string;
      lastUpdated: string;
    }>;
    lastUpdated: string;
    totalRiskScore: number;
    riskLevel: string;
  } {
    return {
      risks: backendData.risks?.map((risk: any) => ({
        id: risk.id,
        overlay: risk.affectedAssets?.join(', ') || risk.label,
        riskType: risk.category === 'allocation' ? 'drift' : 
                 risk.category === 'strategy' ? 'trust' : 
                 risk.category === 'timing' ? 'signal' : 'drift',
        severity: risk.severity >= 70 ? 'high' : 
                 risk.severity >= 40 ? 'medium' : 'low',
        signalStatus: 'neutral' as const,
        daysSinceLastRotation: Math.floor(Math.random() * 30),
        currentWeight: Math.random() * 100,
        targetWeight: Math.random() * 100,
        weightDrift: Math.random() * 20 - 10,
        trustScore: Math.random() * 100,
        signalStrength: Math.random() * 100,
        riskScore: risk.severity,
        description: risk.description,
        recommendedAction: risk.recommendedAction,
        lastUpdated: risk.detectedAt
      })) || [],
      lastUpdated: backendData.lastUpdated,
      totalRiskScore: backendData.totalRiskScore,
      riskLevel: backendData.riskLevel
    };
  }

  // Get rebalance risks for a user
  async getRebalanceRisks(userId: string): Promise<any> {
    const response = await fetch(`/api/portfolio/rebalance-risks/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch rebalance risks');
    const data = await response.json();
    return this.transformRiskData(data);
  }

  // Filter risks based on criteria
  filterRisks(
    risks: any[],
    filters: {
      riskType?: string;
      severity?: string;
    }
  ): any[] {
    let filtered = [...risks];
    
    if (filters.riskType && filters.riskType !== 'all') {
      filtered = filtered.filter(risk => risk.riskType === filters.riskType);
    }
    
    if (filters.severity && filters.severity !== 'all') {
      filtered = filtered.filter(risk => risk.severity === filters.severity);
    }
    
    return filtered.sort((a, b) => b.riskScore - a.riskScore);
  }

  // Calculate summary statistics
  calculateSummaryStats(risks: any[]): {
    total: number;
    high: number;
    medium: number;
    low: number;
    drift: number;
    trust: number;
    signal: number;
  } {
    if (!risks || risks.length === 0) {
      return { total: 0, high: 0, medium: 0, low: 0, drift: 0, trust: 0, signal: 0 };
    }
    
    const total = risks.length;
    const high = risks.filter(r => r.severity === 'high').length;
    const medium = risks.filter(r => r.severity === 'medium').length;
    const low = risks.filter(r => r.severity === 'low').length;
    const drift = risks.filter(r => r.riskType === 'drift').length;
    const trust = risks.filter(r => r.riskType === 'trust').length;
    const signal = risks.filter(r => r.riskType === 'signal').length;
    
    return { total, high, medium, low, drift, trust, signal };
  }

  // Get severity badge configuration
  getSeverityBadgeConfig(severity: string): { className: string; label: string } {
    switch (severity) {
      case 'high':
        return { className: 'bg-red-100 text-red-800', label: 'High Risk' };
      case 'medium':
        return { className: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' };
      case 'low':
        return { className: 'bg-blue-100 text-blue-800', label: 'Low Risk' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: severity };
    }
  }

  // Get risk type badge configuration
  getRiskTypeBadgeConfig(riskType: string): { className: string; label: string } {
    switch (riskType) {
      case 'drift':
        return { className: 'bg-orange-100 text-orange-800', label: 'Weight Drift' };
      case 'trust':
        return { className: 'bg-purple-100 text-purple-800', label: 'Trust Score' };
      case 'signal':
        return { className: 'bg-green-100 text-green-800', label: 'Signal Sync' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: riskType };
    }
  }

  // Get signal icon configuration
  getSignalIconConfig(signal: string): { type: 'trending-up' | 'trending-down' | 'neutral'; className: string } {
    switch (signal) {
      case 'bullish':
        return { type: 'trending-up', className: 'h-4 w-4 text-green-600' };
      case 'bearish':
        return { type: 'trending-down', className: 'h-4 w-4 text-red-600' };
      default:
        return { type: 'neutral', className: 'h-4 w-4 rounded-full bg-gray-400' };
    }
  }

  // Get days since rotation color
  getDaysColor(days: number): string {
    if (days > 30) return 'text-red-600';
    if (days > 14) return 'text-yellow-600';
    return 'text-green-600';
  }

  // Get weight drift color
  getWeightDriftColor(drift: number): string {
    const absDrift = Math.abs(drift);
    if (absDrift > 5) return 'text-red-600';
    if (absDrift > 2) return 'text-yellow-600';
    return 'text-green-600';
  }

  // Get risk score color
  getRiskScoreColor(score: number): string {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-green-600';
  }
}

// Service instance
export const rebalanceRiskScannerService = new RebalanceRiskScannerService();

// React Query hooks
export const useRunRiskAssessment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, proposedChanges }: { vaultId: string; proposedChanges: ProposedChange[] }) => 
      rebalanceRiskScannerService.runRiskAssessment(vaultId, proposedChanges),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rebalance/risk-scanner'] });
    },
  });
};

export const useRiskAssessment = (id: string) => {
  return useQuery({
    queryKey: ['/api/rebalance/risk-scanner', id],
    queryFn: () => rebalanceRiskScannerService.getRiskAssessment(id),
    enabled: !!id,
  });
};

export const useRiskAssessments = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/rebalance/risk-scanner', vaultId, options],
    queryFn: () => rebalanceRiskScannerService.getRiskAssessments(vaultId, options),
    enabled: !!vaultId,
  });
};

export const useApproveRiskAssessment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => 
      rebalanceRiskScannerService.approveRiskAssessment(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rebalance/risk-scanner'] });
    },
  });
};

export const useRejectRiskAssessment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      rebalanceRiskScannerService.rejectRiskAssessment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rebalance/risk-scanner'] });
    },
  });
};

export const useRiskScannerConfig = (vaultId: string) => {
  return useQuery({
    queryKey: ['/api/rebalance/risk-scanner/config', vaultId],
    queryFn: () => rebalanceRiskScannerService.getRiskScannerConfig(vaultId),
    enabled: !!vaultId,
  });
};

export const useUpdateRiskScannerConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, config }: { vaultId: string; config: RiskScannerConfig }) => 
      rebalanceRiskScannerService.updateRiskScannerConfig(vaultId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rebalance/risk-scanner/config'] });
    },
  });
};

export const useRunScenarioAnalysis = () => {
  return useMutation({
    mutationFn: ({ vaultId, scenarios }: { vaultId: string; scenarios: string[] }) => 
      rebalanceRiskScannerService.runScenarioAnalysis(vaultId, scenarios),
  });
};

// React Query hook for fetching rebalance risks
export const useRebalanceRisks = (userId: string, vaultId?: string) => {
  return useQuery({
    queryKey: ['/api/portfolio/rebalance-risks', userId, vaultId],
    queryFn: () => rebalanceRiskScannerService.getRebalanceRisks(userId),
    enabled: !!userId && !!vaultId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// React Query hook for manual refresh
export const useRiskRefresh = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, vaultId }: { userId: string; vaultId?: string }) => 
      rebalanceRiskScannerService.getRebalanceRisks(userId),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['/api/portfolio/rebalance-risks', variables.userId, variables.vaultId], data);
    },
  });
}; 