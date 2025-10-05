import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Overlay Weight Optimizer
export interface WeightOptimization {
  id: string;
  vaultId: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  duration?: number;
  currentWeights: PortfolioWeights;
  targetWeights: PortfolioWeights;
  optimizedWeights: PortfolioWeights;
  optimizationParams: OptimizationParameters;
  results: OptimizationResults;
  constraints: OptimizationConstraints;
  backtestResults?: BacktestResults;
}

export interface PortfolioWeights {
  assets: Array<{
    symbol: string;
    currentWeight: number;
    targetWeight?: number;
    optimizedWeight?: number;
    value: number;
    quantity: number;
  }>;
  totalValue: number;
  lastUpdated: string;
  riskMetrics: {
    portfolioVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number;
    beta: number;
  };
}

export interface OptimizationParameters {
  objective: 'maximize_sharpe' | 'minimize_volatility' | 'maximize_return' | 'minimize_drawdown' | 'custom';
  optimizationMethod: 'mean_variance' | 'black_litterman' | 'risk_parity' | 'equal_weight' | 'momentum' | 'mean_reversion';
  riskModel: 'historical' | 'factor' | 'garch' | 'shrinkage';
  lookbackPeriod: number; // days
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  transactionCosts: number; // percentage
  riskAversion: number; // 1-10 scale
  confidenceLevel: number; // for VaR calculations
  customObjective?: {
    returnWeight: number;
    riskWeight: number;
    stabilityWeight: number;
    liquidityWeight: number;
  };
}

export interface OptimizationConstraints {
  minWeight: number;
  maxWeight: number;
  maxTurnover: number;
  maxTradeSize: number;
  sectorConstraints: Array<{
    sector: string;
    minWeight: number;
    maxWeight: number;
  }>;
  assetConstraints: Array<{
    symbol: string;
    minWeight: number;
    maxWeight: number;
    locked?: boolean;
  }>;
  groupConstraints: Array<{
    name: string;
    assets: string[];
    minWeight: number;
    maxWeight: number;
  }>;
  riskConstraints: {
    maxVolatility?: number;
    maxBeta?: number;
    maxCorrelation?: number;
    maxConcentration?: number;
  };
}

export interface OptimizationResults {
  status: 'success' | 'partial' | 'failed';
  convergence: boolean;
  iterations: number;
  objectiveValue: number;
  improvementMetrics: {
    expectedReturnImprovement: number;
    volatilityReduction: number;
    sharpeImprovement: number;
    drawdownReduction: number;
  };
  riskMetrics: {
    portfolioVolatility: number;
    sharpeRatio: number;
    expectedReturn: number;
    maxDrawdown: number;
    var95: number;
    conditionalVar: number;
  };
  turnoverAnalysis: {
    totalTurnover: number;
    estimatedCosts: number;
    trades: Array<{
      symbol: string;
      action: 'buy' | 'sell';
      quantity: number;
      notional: number;
      percentage: number;
    }>;
  };
  sensitivityAnalysis: {
    parameterSensitivity: Array<{
      parameter: string;
      baseValue: number;
      sensitivity: number;
      impact: number;
    }>;
    scenarioAnalysis: Array<{
      scenario: string;
      probability: number;
      expectedReturn: number;
      volatility: number;
    }>;
  };
}

export interface BacktestResults {
  period: { start: string; end: string };
  performance: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    sortinoRatio: number;
  };
  benchmarkComparison: {
    benchmark: string;
    outperformance: number;
    trackingError: number;
    informationRatio: number;
    correlation: number;
  };
  monthlyReturns: Array<{
    month: string;
    return: number;
    benchmarkReturn: number;
    outperformance: number;
  }>;
  riskAnalysis: {
    worstMonth: number;
    bestMonth: number;
    downCapture: number;
    upCapture: number;
    beta: number;
    alpha: number;
  };
}

export interface OptimizationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  parameters: OptimizationParameters;
  constraints: OptimizationConstraints;
  isPublic: boolean;
  usageCount: number;
  averagePerformance: number;
  createdBy: string;
  createdAt: string;
}

export interface WeightOptimizationAnalytics {
  totalOptimizations: number;
  averageImprovement: number;
  successRate: number;
  mostUsedObjective: string;
  averageRuntime: number;
  optimizationsByMethod: Array<{
    method: string;
    count: number;
    avgPerformance: number;
  }>;
  performanceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  constraintViolations: Array<{
    constraint: string;
    violations: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// Overlay Weight Optimizer Service Class
export class OverlayWeightOptimizerService {
  private baseUrl = '/api/optimization/weights';

  // Run weight optimization
  async runOptimization(vaultId: string, params: {
    name: string;
    description?: string;
    parameters: OptimizationParameters;
    constraints: OptimizationConstraints;
    runBacktest?: boolean;
  }): Promise<WeightOptimization> {
    const response = await fetch(`${this.baseUrl}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, ...params }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start optimization');
    }
    
    return response.json();
  }

  // Get optimization result
  async getOptimization(id: string): Promise<WeightOptimization> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch optimization');
    }
    
    return response.json();
  }

  // Get optimizations for vault
  async getOptimizations(vaultId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    includeBacktest?: boolean;
  }): Promise<{
    optimizations: WeightOptimization[];
    total: number;
    analytics: WeightOptimizationAnalytics;
  }> {
    const params = new URLSearchParams();
    params.append('vaultId', vaultId);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch optimizations');
    }
    
    return response.json();
  }

  // Cancel running optimization
  async cancelOptimization(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}/cancel`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel optimization');
    }
  }

  // Apply optimization results
  async applyOptimization(id: string, confirm: boolean = false): Promise<{
    success: boolean;
    tradesExecuted: number;
    totalCost: number;
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to apply optimization');
    }
    
    return response.json();
  }

  // Get optimization templates
  async getOptimizationTemplates(category?: string): Promise<OptimizationTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    
    const response = await fetch(`${this.baseUrl}/templates?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch optimization templates');
    }
    
    return response.json();
  }

  // Create optimization template
  async createOptimizationTemplate(template: Omit<OptimizationTemplate, 'id' | 'usageCount' | 'averagePerformance' | 'createdAt'>): Promise<OptimizationTemplate> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create optimization template');
    }
    
    return response.json();
  }

  // Run scenario analysis
  async runScenarioAnalysis(vaultId: string, scenarios: Array<{
    name: string;
    marketConditions: any;
    parameters: OptimizationParameters;
  }>): Promise<Array<{
    scenario: string;
    results: OptimizationResults;
    riskMetrics: any;
  }>> {
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

  // Get current portfolio weights
  async getCurrentWeights(vaultId: string): Promise<PortfolioWeights> {
    const response = await fetch(`${this.baseUrl}/current?vaultId=${vaultId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch current weights');
    }
    
    return response.json();
  }

  // Get optimization status color
  getOptimizationStatusColor(status: WeightOptimization['status']): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get optimization status background
  getOptimizationStatusBackground(status: WeightOptimization['status']): string {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'failed': return 'bg-red-50 border-red-200';
      case 'cancelled': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get objective color
  getObjectiveColor(objective: OptimizationParameters['objective']): string {
    switch (objective) {
      case 'maximize_sharpe': return 'text-green-600';
      case 'minimize_volatility': return 'text-blue-600';
      case 'maximize_return': return 'text-purple-600';
      case 'minimize_drawdown': return 'text-orange-600';
      case 'custom': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Format percentage
  formatPercentage(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  }

  // Format weight
  formatWeight(weight: number): string {
    return `${(weight * 100).toFixed(2)}%`;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  }

  // Calculate weight change impact
  calculateWeightChangeImpact(currentWeights: PortfolioWeights, optimizedWeights: PortfolioWeights): {
    totalTurnover: number;
    largestIncrease: { symbol: string; change: number };
    largestDecrease: { symbol: string; change: number };
    newPositions: string[];
    eliminatedPositions: string[];
  } {
    const currentMap = new Map(currentWeights.assets.map(a => [a.symbol, a.currentWeight]));
    const optimizedMap = new Map(optimizedWeights.assets.map(a => [a.symbol, a.optimizedWeight || 0]));
    
    let totalTurnover = 0;
    let largestIncrease = { symbol: '', change: 0 };
    let largestDecrease = { symbol: '', change: 0 };
    const newPositions: string[] = [];
    const eliminatedPositions: string[] = [];
    
    // Check all assets in optimized weights
    optimizedMap.forEach((optimizedWeight, symbol) => {
      const currentWeight = currentMap.get(symbol) || 0;
      const change = optimizedWeight - currentWeight;
      
      totalTurnover += Math.abs(change);
      
      if (change > largestIncrease.change) {
        largestIncrease = { symbol, change };
      }
      
      if (change < largestDecrease.change) {
        largestDecrease = { symbol, change };
      }
      
      if (currentWeight === 0 && optimizedWeight > 0) {
        newPositions.push(symbol);
      }
    });
    
    // Check for eliminated positions
    currentMap.forEach((currentWeight, symbol) => {
      if (currentWeight > 0 && !optimizedMap.has(symbol)) {
        eliminatedPositions.push(symbol);
        totalTurnover += currentWeight;
      }
    });
    
    return {
      totalTurnover,
      largestIncrease,
      largestDecrease,
      newPositions,
      eliminatedPositions
    };
  }

  // Validate optimization parameters
  validateOptimizationParameters(params: OptimizationParameters): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (params.lookbackPeriod < 30) {
      warnings.push('Short lookback period may lead to unstable results');
    }
    
    if (params.lookbackPeriod > 1000) {
      warnings.push('Very long lookback period may include stale data');
    }
    
    if (params.transactionCosts < 0 || params.transactionCosts > 0.1) {
      errors.push('Transaction costs must be between 0% and 10%');
    }
    
    if (params.riskAversion < 1 || params.riskAversion > 10) {
      errors.push('Risk aversion must be between 1 and 10');
    }
    
    if (params.confidenceLevel < 0.5 || params.confidenceLevel > 0.999) {
      errors.push('Confidence level must be between 50% and 99.9%');
    }
    
    if (params.objective === 'custom' && !params.customObjective) {
      errors.push('Custom objective parameters are required when using custom objective');
    }
    
    if (params.customObjective) {
      const total = params.customObjective.returnWeight + params.customObjective.riskWeight + 
                   params.customObjective.stabilityWeight + params.customObjective.liquidityWeight;
      if (Math.abs(total - 1) > 0.01) {
        errors.push('Custom objective weights must sum to 1');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate optimization constraints
  validateOptimizationConstraints(constraints: OptimizationConstraints): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (constraints.minWeight < 0 || constraints.minWeight > 1) {
      errors.push('Minimum weight must be between 0 and 1');
    }
    
    if (constraints.maxWeight < 0 || constraints.maxWeight > 1) {
      errors.push('Maximum weight must be between 0 and 1');
    }
    
    if (constraints.minWeight > constraints.maxWeight) {
      errors.push('Minimum weight cannot be greater than maximum weight');
    }
    
    if (constraints.maxTurnover < 0 || constraints.maxTurnover > 2) {
      errors.push('Maximum turnover must be between 0 and 200%');
    }
    
    if (constraints.maxTradeSize < 0 || constraints.maxTradeSize > 1) {
      errors.push('Maximum trade size must be between 0 and 100%');
    }
    
    // Validate sector constraints
    constraints.sectorConstraints.forEach((constraint, index) => {
      if (constraint.minWeight < 0 || constraint.minWeight > 1) {
        errors.push(`Sector constraint ${index + 1}: minimum weight must be between 0 and 1`);
      }
      if (constraint.maxWeight < 0 || constraint.maxWeight > 1) {
        errors.push(`Sector constraint ${index + 1}: maximum weight must be between 0 and 1`);
      }
      if (constraint.minWeight > constraint.maxWeight) {
        errors.push(`Sector constraint ${index + 1}: minimum weight cannot be greater than maximum weight`);
      }
    });
    
    // Validate asset constraints
    constraints.assetConstraints.forEach((constraint, index) => {
      if (constraint.minWeight < 0 || constraint.minWeight > 1) {
        errors.push(`Asset constraint ${index + 1}: minimum weight must be between 0 and 1`);
      }
      if (constraint.maxWeight < 0 || constraint.maxWeight > 1) {
        errors.push(`Asset constraint ${index + 1}: maximum weight must be between 0 and 1`);
      }
      if (constraint.minWeight > constraint.maxWeight) {
        errors.push(`Asset constraint ${index + 1}: minimum weight cannot be greater than maximum weight`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create default optimization parameters
  createDefaultOptimizationParameters(): OptimizationParameters {
    return {
      objective: 'maximize_sharpe',
      optimizationMethod: 'mean_variance',
      riskModel: 'historical',
      lookbackPeriod: 252, // 1 year
      rebalanceFrequency: 'monthly',
      transactionCosts: 0.001, // 0.1%
      riskAversion: 5,
      confidenceLevel: 0.95
    };
  }

  // Create default optimization constraints
  createDefaultOptimizationConstraints(): OptimizationConstraints {
    return {
      minWeight: 0,
      maxWeight: 0.3,
      maxTurnover: 0.5,
      maxTradeSize: 0.1,
      sectorConstraints: [],
      assetConstraints: [],
      groupConstraints: [],
      riskConstraints: {
        maxVolatility: 0.25,
        maxBeta: 2,
        maxCorrelation: 0.8,
        maxConcentration: 0.3
      }
    };
  }

  // Calculate optimization score
  calculateOptimizationScore(results: OptimizationResults): number {
    const { sharpeImprovement, volatilityReduction, drawdownReduction } = results.improvementMetrics;
    
    // Weighted score based on improvements
    let score = 0;
    score += sharpeImprovement * 40; // 40% weight on Sharpe improvement
    score += Math.max(0, volatilityReduction) * 30; // 30% weight on volatility reduction
    score += Math.max(0, drawdownReduction) * 20; // 20% weight on drawdown reduction
    score += (results.convergence ? 10 : 0); // 10% for successful convergence
    
    return Math.min(100, Math.max(0, score));
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

  // Format duration
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Generate optimization summary
  generateOptimizationSummary(optimization: WeightOptimization): {
    overallAssessment: string;
    keyImprovements: string[];
    riskAssessment: string;
    implementationComplexity: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const results = optimization.results;
    const improvements = results.improvementMetrics;
    
    // Overall assessment
    let overallAssessment = 'neutral';
    if (improvements.sharpeImprovement > 0.1 && improvements.volatilityReduction > 0.05) {
      overallAssessment = 'excellent';
    } else if (improvements.sharpeImprovement > 0.05 || improvements.volatilityReduction > 0.02) {
      overallAssessment = 'good';
    } else if (improvements.sharpeImprovement < -0.05 || improvements.volatilityReduction < -0.05) {
      overallAssessment = 'poor';
    }
    
    // Key improvements
    const keyImprovements: string[] = [];
    if (improvements.sharpeImprovement > 0.05) {
      keyImprovements.push(`${this.formatPercentage(improvements.sharpeImprovement * 100)} Sharpe ratio improvement`);
    }
    if (improvements.volatilityReduction > 0.02) {
      keyImprovements.push(`${this.formatPercentage(improvements.volatilityReduction * 100)} volatility reduction`);
    }
    if (improvements.drawdownReduction > 0.02) {
      keyImprovements.push(`${this.formatPercentage(improvements.drawdownReduction * 100)} drawdown reduction`);
    }
    if (improvements.expectedReturnImprovement > 0.02) {
      keyImprovements.push(`${this.formatPercentage(improvements.expectedReturnImprovement * 100)} expected return increase`);
    }
    
    // Risk assessment
    let riskAssessment = 'moderate';
    if (results.turnoverAnalysis.totalTurnover > 0.8) {
      riskAssessment = 'high';
    } else if (results.turnoverAnalysis.totalTurnover < 0.2) {
      riskAssessment = 'low';
    }
    
    // Implementation complexity
    let implementationComplexity: 'low' | 'medium' | 'high' = 'medium';
    const tradesCount = results.turnoverAnalysis.trades.length;
    if (tradesCount < 5) {
      implementationComplexity = 'low';
    } else if (tradesCount > 15) {
      implementationComplexity = 'high';
    }
    
    // Recommendations
    const recommendations: string[] = [];
    if (results.turnoverAnalysis.totalTurnover > 0.5) {
      recommendations.push('Consider implementing changes gradually to reduce transaction costs');
    }
    if (results.riskMetrics.sharpeRatio < 0.5) {
      recommendations.push('Low Sharpe ratio indicates risk-adjusted returns may need improvement');
    }
    if (results.turnoverAnalysis.estimatedCosts > 0.02) {
      recommendations.push('High estimated transaction costs - consider cost-optimization strategies');
    }
    
    return {
      overallAssessment,
      keyImprovements,
      riskAssessment,
      implementationComplexity,
      recommendations
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'weight_changed' | 'optimization_triggered' | 'weights_reset' | 'weights_saved' | 'template_applied',
    optimizationData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-20-overlay-weight-optimizer',
        timestamp: new Date().toISOString(),
        userId: optimizationData.userId,
        vaultId: optimizationData.vaultId,
        data: {
          ...optimizationData.metadata
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

  // Business Logic Extraction Methods

  // Weight State Management
  initializeWeights(overlayData: any): Record<string, number> {
    if (!overlayData?.overlays) return {};
    
    const initialWeights: Record<string, number> = {};
    overlayData.overlays.forEach((overlay: any) => {
      initialWeights[overlay.id] = overlay.targetWeight || overlay.currentWeight;
    });
    return initialWeights;
  }

  // Weight Change Handler with Validation
  async handleWeightChange(
    overlayId: string,
    newWeight: number,
    currentWeights: Record<string, number>,
    userId: string,
    vaultId?: string
  ): Promise<{
    updatedWeights: Record<string, number>;
    hasChanges: boolean;
    error?: string;
  }> {
    // Validate weight range
    if (newWeight < 0 || newWeight > 100) {
      return {
        updatedWeights: currentWeights,
        hasChanges: false,
        error: 'Weight must be between 0% and 100%'
      };
    }

    const oldWeight = currentWeights[overlayId] || 0;
    const updatedWeights = { ...currentWeights, [overlayId]: newWeight };
    
    // Log significant weight changes (>1%)
    if (Math.abs(newWeight - oldWeight) > 1) {
      await this.logAgentMemory('weight_changed', {
        userId,
        vaultId,
        metadata: {
          overlayId,
          oldWeight: oldWeight.toFixed(2),
          newWeight: newWeight.toFixed(2),
          change: (newWeight - oldWeight).toFixed(2)
        }
      });
    }

    return {
      updatedWeights,
      hasChanges: true,
      error: undefined
    };
  }

  // Auto-optimization Handler
  async handleAutoOptimization(
    activeVaultId?: string,
    userId?: string,
    vaultId?: string
  ): Promise<{
    success: boolean;
    suggestions?: any[];
    error?: string;
  }> {
    try {
      const url = activeVaultId 
        ? `/api/strategy/overlays/optimize?vaultId=${activeVaultId}`
        : '/api/strategy/overlays/optimize';
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) throw new Error('Failed to optimize weights');
      
      const data = await res.json();
      
      // Log optimization
      if (userId) {
        await this.logAgentMemory('optimization_triggered', {
          userId,
          vaultId,
          metadata: {
            totalSuggestions: data.suggestions?.length || 0,
            optimizationType: 'auto',
            overlaysAffected: data.suggestions?.map((s: any) => s.overlayId) || []
          }
        });
      }
      
      return {
        success: true,
        suggestions: data.suggestions,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Apply optimization suggestions to weights
  applyOptimizationSuggestions(
    currentWeights: Record<string, number>,
    suggestions: any[]
  ): Record<string, number> {
    const newWeights = { ...currentWeights };
    suggestions.forEach(suggestion => {
      newWeights[suggestion.overlayId] = suggestion.suggestedWeight;
    });
    return newWeights;
  }

  // Weight validation
  validateWeights(weights: Record<string, number>): {
    isValid: boolean;
    totalWeight: number;
    error?: string;
  } {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const isValid = Math.abs(totalWeight - 100) < 0.1;
    
    return {
      isValid,
      totalWeight,
      error: !isValid ? `Total weight must equal 100% (currently ${totalWeight.toFixed(1)}%)` : undefined
    };
  }

  // Save weights operation
  async handleSaveWeights(
    weights: Record<string, number>,
    overlayData: any,
    activeVaultId?: string,
    userId?: string,
    vaultId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!overlayData?.overlays) {
        return { success: false, error: 'No overlay data available' };
      }

      // Validate weights before saving
      const validation = this.validateWeights(weights);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Calculate updates
      const updates = overlayData.overlays
        .filter((overlay: any) => weights[overlay.id] !== overlay.targetWeight)
        .map((overlay: any) => ({
          overlayId: overlay.id,
          newWeight: weights[overlay.id]
        }));

      if (updates.length === 0) {
        return { success: false, error: 'No changes to save' };
      }

      // Make API call
      const url = activeVaultId 
        ? `/api/strategy/overlays/weights?vaultId=${activeVaultId}`
        : '/api/strategy/overlays/weights';
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      if (!res.ok) throw new Error('Failed to update weights');

      // Log save operation
      if (userId) {
        await this.logAgentMemory('weights_saved', {
          userId,
          vaultId,
          metadata: {
            updatesCount: updates.length,
            overlaysModified: updates.map(u => u.overlayId),
            totalWeightChange: updates.reduce((sum, u) => sum + Math.abs(u.newWeight), 0)
          }
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Reset weights operation
  async handleResetWeights(
    overlayData: any,
    userId?: string,
    vaultId?: string
  ): Promise<{
    resetWeights: Record<string, number>;
    hasChanges: boolean;
  }> {
    const resetWeights = this.initializeWeights(overlayData);
    
    // Log reset operation
    if (userId) {
      await this.logAgentMemory('weights_reset', {
        userId,
        vaultId,
        metadata: {
          overlaysReset: overlayData?.overlays?.length || 0,
          action: 'reset_to_original'
        }
      });
    }

    return {
      resetWeights,
      hasChanges: false
    };
  }

  // Status message management
  createStatusMessage(
    type: 'success' | 'error',
    message: string
  ): { type: 'success' | 'error'; message: string } {
    return { type, message };
  }

  // Check if weights have changes from original
  hasWeightChanges(
    currentWeights: Record<string, number>,
    overlayData: any
  ): boolean {
    if (!overlayData?.overlays) return false;
    
    return overlayData.overlays.some((overlay: any) => {
      const currentWeight = currentWeights[overlay.id] || 0;
      const originalWeight = overlay.targetWeight || overlay.currentWeight;
      return Math.abs(currentWeight - originalWeight) > 0.1;
    });
  }

  // Get weight change summary
  getWeightChangeSummary(
    currentWeights: Record<string, number>,
    overlayData: any
  ): {
    totalChanges: number;
    largestChange: { overlayId: string; change: number } | null;
    changedOverlays: string[];
  } {
    if (!overlayData?.overlays) {
      return { totalChanges: 0, largestChange: null, changedOverlays: [] };
    }

    let totalChanges = 0;
    let largestChange: { overlayId: string; change: number } | null = null;
    const changedOverlays: string[] = [];

    overlayData.overlays.forEach((overlay: any) => {
      const currentWeight = currentWeights[overlay.id] || 0;
      const originalWeight = overlay.targetWeight || overlay.currentWeight;
      const change = Math.abs(currentWeight - originalWeight);
      
      if (change > 0.1) {
        totalChanges += change;
        changedOverlays.push(overlay.id);
        
        if (!largestChange || change > largestChange.change) {
          largestChange = { overlayId: overlay.id, change };
        }
      }
    });

    return { totalChanges, largestChange, changedOverlays };
  }
}

// Service instance
export const overlayWeightOptimizerService = new OverlayWeightOptimizerService();

// React Query hooks
export const useRunOptimization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, params }: { vaultId: string; params: any }) => 
      overlayWeightOptimizerService.runOptimization(vaultId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/weights'] });
    },
  });
};

export const useOptimization = (id: string) => {
  return useQuery({
    queryKey: ['/api/optimization/weights', id],
    queryFn: () => overlayWeightOptimizerService.getOptimization(id),
    enabled: !!id,
    refetchInterval: (data) => {
      // Refetch more frequently for running optimizations
      return data?.status === 'running' ? 5000 : false;
    },
  });
};

export const useOptimizations = (vaultId: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/optimization/weights', vaultId, options],
    queryFn: () => overlayWeightOptimizerService.getOptimizations(vaultId, options),
    enabled: !!vaultId,
  });
};

export const useCancelOptimization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      overlayWeightOptimizerService.cancelOptimization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/weights'] });
    },
  });
};

export const useApplyOptimization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) => 
      overlayWeightOptimizerService.applyOptimization(id, confirm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/weights'] });
    },
  });
};

export const useOptimizationTemplates = (category?: string) => {
  return useQuery({
    queryKey: ['/api/optimization/weights/templates', category],
    queryFn: () => overlayWeightOptimizerService.getOptimizationTemplates(category),
  });
};

export const useCreateOptimizationTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (template: any) => 
      overlayWeightOptimizerService.createOptimizationTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/weights/templates'] });
    },
  });
};

export const useRunScenarioAnalysis = () => {
  return useMutation({
    mutationFn: ({ vaultId, scenarios }: { vaultId: string; scenarios: any[] }) => 
      overlayWeightOptimizerService.runScenarioAnalysis(vaultId, scenarios),
  });
};

export const useCurrentWeights = (vaultId: string) => {
  return useQuery({
    queryKey: ['/api/optimization/weights/current', vaultId],
    queryFn: () => overlayWeightOptimizerService.getCurrentWeights(vaultId),
    enabled: !!vaultId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}; 