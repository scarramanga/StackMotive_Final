import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Alternative Signal Aggregator
export interface AltSignal {
  id: string;
  source: AltDataSource;
  symbol: string;
  signalType: 'satellite' | 'social' | 'patent' | 'insider' | 'options_flow' | 'credit' | 'weather' | 'supply_chain' | 'esg' | 'sentiment' | 'custom';
  timestamp: string;
  value: number;
  normalizedValue: number; // -1 to 1
  confidence: number;
  weight: number;
  metadata: {
    rawData?: any;
    processingMethod: string;
    dataQuality: number;
    latency: number; // milliseconds
    region?: string;
    sector?: string;
    tags: string[];
  };
  prediction: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    timeHorizon: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
    probability: number;
  };
  isActive: boolean;
  expiresAt?: string;
}

export interface AltDataSource {
  id: string;
  name: string;
  provider: string;
  type: 'satellite' | 'social' | 'patent' | 'insider' | 'options_flow' | 'credit' | 'weather' | 'supply_chain' | 'esg' | 'sentiment' | 'custom';
  description: string;
  isActive: boolean;
  reliability: number;
  coverage: string[];
  updateFrequency: number; // minutes
  historicalPerformance: {
    accuracy: number;
    precision: number;
    recall: number;
    sharpeRatio: number;
  };
  pricing: {
    model: 'subscription' | 'pay_per_use' | 'enterprise';
    cost: number;
    currency: string;
  };
  apiEndpoint?: string;
  lastUpdate: string;
}

export interface SignalAggregation {
  id: string;
  symbol: string;
  timestamp: string;
  aggregatedScore: number;
  confidence: number;
  consensus: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  signals: AltSignal[];
  weights: Record<string, number>;
  methodology: {
    aggregationMethod: 'weighted_average' | 'ensemble' | 'ml_model' | 'voting';
    outlierHandling: 'remove' | 'cap' | 'weight_down';
    conflictResolution: 'majority' | 'weighted' | 'confidence_based';
  };
  breakdown: {
    byType: Record<string, number>;
    bySource: Record<string, number>;
    byTimeHorizon: Record<string, number>;
    byConfidence: Record<string, number>;
  };
  riskFactors: string[];
  opportunities: string[];
}

export interface SignalAlert {
  id: string;
  type: 'new_signal' | 'signal_change' | 'consensus_shift' | 'outlier_detected' | 'source_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol: string;
  source?: string;
  title: string;
  description: string;
  currentValue: number;
  previousValue?: number;
  change?: number;
  timestamp: string;
  isRead: boolean;
  actionRequired: boolean;
  relatedSignals: string[];
}

export interface SignalPerformance {
  sourceId: string;
  signalType: string;
  period: string;
  metrics: {
    totalSignals: number;
    accuracy: number;
    precision: number;
    recall: number;
    falsePositiveRate: number;
    averageReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    hitRate: number;
  };
  attribution: {
    totalAlpha: number;
    informationRatio: number;
    trackingError: number;
    correlation: number;
  };
  timeSeriesPerformance: Array<{
    date: string;
    cumulativeReturn: number;
    accuracy: number;
    signalCount: number;
  }>;
}

export interface SignalConfiguration {
  id: string;
  name: string;
  description: string;
  sources: Array<{
    sourceId: string;
    weight: number;
    isActive: boolean;
    filters: {
      minConfidence?: number;
      maxAge?: number; // hours
      signalTypes?: string[];
      symbols?: string[];
    };
  }>;
  aggregationSettings: {
    method: 'weighted_average' | 'ensemble' | 'ml_model' | 'voting';
    rebalanceFrequency: number; // hours
    outlierThreshold: number;
    conflictResolution: 'majority' | 'weighted' | 'confidence_based';
    decayFunction: 'linear' | 'exponential' | 'none';
    decayRate?: number;
  };
  alertSettings: {
    thresholds: {
      newSignal: number;
      signalChange: number;
      consensusShift: number;
    };
    notifications: {
      email: boolean;
      sms: boolean;
      webhook?: string;
    };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Alternative Signal Aggregator Service Class
export class AltSignalAggregatorService {
  private baseUrl = '/api/signals/alternative';

  // Get aggregated signals
  async getAggregatedSignals(options?: {
    symbols?: string[];
    signalTypes?: string[];
    sources?: string[];
    minConfidence?: number;
    timeHorizon?: string;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<{
    aggregations: SignalAggregation[];
    total: number;
    summary: {
      totalSignals: number;
      activeSources: number;
      averageConfidence: number;
      consensusDistribution: Record<string, number>;
    };
  }> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/aggregated?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch aggregated signals');
    }
    
    return response.json();
  }

  // Get raw alternative signals
  async getRawSignals(options?: {
    symbols?: string[];
    sources?: string[];
    signalTypes?: string[];
    dateRange?: { start: string; end: string };
    minConfidence?: number;
    limit?: number;
  }): Promise<{
    signals: AltSignal[];
    total: number;
    metadata: {
      sourceBreakdown: Record<string, number>;
      typeBreakdown: Record<string, number>;
      averageLatency: number;
      dataQuality: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/raw?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch raw signals');
    }
    
    return response.json();
  }

  // Get available data sources
  async getDataSources(options?: {
    type?: string;
    isActive?: boolean;
    minReliability?: number;
  }): Promise<AltDataSource[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/sources?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch data sources');
    }
    
    return response.json();
  }

  // Create signal configuration
  async createSignalConfiguration(config: Omit<SignalConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<SignalConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create signal configuration');
    }
    
    return response.json();
  }

  // Update signal configuration
  async updateSignalConfiguration(id: string, updates: Partial<SignalConfiguration>): Promise<SignalConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update signal configuration');
    }
    
    return response.json();
  }

  // Get signal performance
  async getSignalPerformance(options?: {
    sourceId?: string;
    signalType?: string;
    period?: string;
    symbols?: string[];
  }): Promise<SignalPerformance[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/performance?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch signal performance');
    }
    
    return response.json();
  }

  // Get signal alerts
  async getSignalAlerts(options?: {
    unreadOnly?: boolean;
    severity?: string;
    type?: string;
    symbol?: string;
    limit?: number;
  }): Promise<SignalAlert[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/alerts?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch signal alerts');
    }
    
    return response.json();
  }

  // Mark alert as read
  async markAlertAsRead(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}/read`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark alert as read');
    }
  }

  // Run signal backtest
  async runSignalBacktest(config: {
    symbols: string[];
    sources: string[];
    period: { start: string; end: string };
    aggregationMethod: string;
    rebalanceFrequency: number;
  }): Promise<{
    performance: {
      totalReturn: number;
      annualizedReturn: number;
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
    attribution: {
      sourceContributions: Record<string, number>;
      typeContributions: Record<string, number>;
    };
    trades: Array<{
      date: string;
      symbol: string;
      action: 'buy' | 'sell';
      quantity: number;
      price: number;
      signal: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('Failed to run signal backtest');
    }
    
    return response.json();
  }

  // Get signal type color
  getSignalTypeColor(type: AltSignal['signalType']): string {
    switch (type) {
      case 'satellite': return 'text-blue-600';
      case 'social': return 'text-purple-600';
      case 'patent': return 'text-green-600';
      case 'insider': return 'text-orange-600';
      case 'options_flow': return 'text-red-600';
      case 'credit': return 'text-yellow-600';
      case 'weather': return 'text-cyan-600';
      case 'supply_chain': return 'text-indigo-600';
      case 'esg': return 'text-emerald-600';
      case 'sentiment': return 'text-pink-600';
      case 'custom': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get consensus color
  getConsensusColor(consensus: SignalAggregation['consensus']): string {
    switch (consensus) {
      case 'strong_buy': return 'text-green-700';
      case 'buy': return 'text-green-600';
      case 'hold': return 'text-gray-600';
      case 'sell': return 'text-red-600';
      case 'strong_sell': return 'text-red-700';
      default: return 'text-gray-600';
    }
  }

  // Get prediction direction color
  getPredictionDirectionColor(direction: AltSignal['prediction']['direction']): string {
    switch (direction) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get alert severity color
  getAlertSeverityColor(severity: SignalAlert['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format signal value
  formatSignalValue(value: number, type: string): string {
    switch (type) {
      case 'satellite':
      case 'supply_chain':
        return `${value.toFixed(2)} units`;
      case 'social':
      case 'sentiment':
        return `${(value * 100).toFixed(1)}%`;
      case 'options_flow':
      case 'insider':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
        }).format(value);
      case 'credit':
        return `${(value * 100).toFixed(2)}bps`;
      case 'weather':
        return `${value.toFixed(1)}°`;
      default:
        return value.toFixed(3);
    }
  }

  // Format confidence
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Format normalized value
  formatNormalizedValue(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  }

  // Calculate signal strength
  calculateSignalStrength(signal: AltSignal): 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong' {
    const absValue = Math.abs(signal.normalizedValue);
    const weightedValue = absValue * signal.confidence * signal.weight;
    
    if (weightedValue >= 0.8) return 'very_strong';
    if (weightedValue >= 0.6) return 'strong';
    if (weightedValue >= 0.4) return 'moderate';
    if (weightedValue >= 0.2) return 'weak';
    return 'very_weak';
  }

  // Get signal strength color
  getSignalStrengthColor(strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong'): string {
    switch (strength) {
      case 'very_strong': return 'text-green-700';
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'weak': return 'text-orange-600';
      case 'very_weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Filter signals
  filterSignals(signals: AltSignal[], filters: {
    signalTypes?: string[];
    sources?: string[];
    minConfidence?: number;
    minValue?: number;
    timeHorizon?: string;
    direction?: string;
    isActive?: boolean;
  }): AltSignal[] {
    return signals.filter(signal => {
      if (filters.signalTypes && !filters.signalTypes.includes(signal.signalType)) {
        return false;
      }
      
      if (filters.sources && !filters.sources.includes(signal.source.id)) {
        return false;
      }
      
      if (filters.minConfidence && signal.confidence < filters.minConfidence) {
        return false;
      }
      
      if (filters.minValue && Math.abs(signal.normalizedValue) < filters.minValue) {
        return false;
      }
      
      if (filters.timeHorizon && signal.prediction.timeHorizon !== filters.timeHorizon) {
        return false;
      }
      
      if (filters.direction && signal.prediction.direction !== filters.direction) {
        return false;
      }
      
      if (filters.isActive !== undefined && signal.isActive !== filters.isActive) {
        return false;
      }
      
      return true;
    });
  }

  // Sort signals
  sortSignals(signals: AltSignal[], sortBy: 'timestamp' | 'confidence' | 'value' | 'weight' | 'strength', order: 'asc' | 'desc' = 'desc'): AltSignal[] {
    return [...signals].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'confidence':
          compareValue = a.confidence - b.confidence;
          break;
        case 'value':
          compareValue = Math.abs(a.normalizedValue) - Math.abs(b.normalizedValue);
          break;
        case 'weight':
          compareValue = a.weight - b.weight;
          break;
        case 'strength':
          const aStrength = Math.abs(a.normalizedValue) * a.confidence * a.weight;
          const bStrength = Math.abs(b.normalizedValue) * b.confidence * b.weight;
          compareValue = aStrength - bStrength;
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Calculate aggregation consensus
  calculateConsensus(signals: AltSignal[]): {
    consensus: SignalAggregation['consensus'];
    score: number;
    confidence: number;
  } {
    if (signals.length === 0) {
      return { consensus: 'hold', score: 0, confidence: 0 };
    }
    
    const weightedSum = signals.reduce((sum, signal) => {
      return sum + (signal.normalizedValue * signal.confidence * signal.weight);
    }, 0);
    
    const totalWeight = signals.reduce((sum, signal) => {
      return sum + (signal.confidence * signal.weight);
    }, 0);
    
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    const confidence = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length;
    
    let consensus: SignalAggregation['consensus'];
    if (score >= 0.6) consensus = 'strong_buy';
    else if (score >= 0.2) consensus = 'buy';
    else if (score >= -0.2) consensus = 'hold';
    else if (score >= -0.6) consensus = 'sell';
    else consensus = 'strong_sell';
    
    return { consensus, score, confidence };
  }

  // Get unique signal types
  getUniqueSignalTypes(signals: AltSignal[]): string[] {
    return [...new Set(signals.map(signal => signal.signalType))];
  }

  // Get unique sources
  getUniqueSources(signals: AltSignal[]): AltDataSource[] {
    const sourceMap = new Map<string, AltDataSource>();
    signals.forEach(signal => {
      sourceMap.set(signal.source.id, signal.source);
    });
    return Array.from(sourceMap.values());
  }

  // Calculate signal correlation
  calculateSignalCorrelation(signals1: AltSignal[], signals2: AltSignal[]): number {
    const commonSymbols = new Set([
      ...signals1.map(s => s.symbol),
      ...signals2.map(s => s.symbol)
    ].filter(symbol => 
      signals1.some(s => s.symbol === symbol) && 
      signals2.some(s => s.symbol === symbol)
    ));
    
    if (commonSymbols.size === 0) return 0;
    
    const pairs: Array<[number, number]> = [];
    
    commonSymbols.forEach(symbol => {
      const signal1 = signals1.find(s => s.symbol === symbol);
      const signal2 = signals2.find(s => s.symbol === symbol);
      
      if (signal1 && signal2) {
        pairs.push([signal1.normalizedValue, signal2.normalizedValue]);
      }
    });
    
    if (pairs.length === 0) return 0;
    
    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
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

  // Validate signal configuration
  validateSignalConfiguration(config: SignalConfiguration): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.name.trim()) {
      errors.push('Configuration name is required');
    }
    
    if (config.sources.length === 0) {
      errors.push('At least one source must be configured');
    }
    
    const totalWeight = config.sources.reduce((sum, source) => sum + source.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      errors.push('Source weights must sum to 1');
    }
    
    if (config.aggregationSettings.rebalanceFrequency < 1) {
      errors.push('Rebalance frequency must be at least 1 hour');
    }
    
    if (config.aggregationSettings.outlierThreshold < 0 || config.aggregationSettings.outlierThreshold > 1) {
      errors.push('Outlier threshold must be between 0 and 1');
    }
    
    if (config.sources.length < 3) {
      warnings.push('Consider using more sources for better diversification');
    }
    
    const activeSourceCount = config.sources.filter(s => s.isActive).length;
    if (activeSourceCount < config.sources.length * 0.8) {
      warnings.push('Many sources are inactive');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Create default signal configuration
  createDefaultSignalConfiguration(): Omit<SignalConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'Default Signal Configuration',
      description: 'Default aggregation configuration for alternative signals',
      sources: [],
      aggregationSettings: {
        method: 'weighted_average',
        rebalanceFrequency: 24,
        outlierThreshold: 2.0,
        conflictResolution: 'confidence_based',
        decayFunction: 'exponential',
        decayRate: 0.1
      },
      alertSettings: {
        thresholds: {
          newSignal: 0.7,
          signalChange: 0.3,
          consensusShift: 0.5
        },
        notifications: {
          email: true,
          sms: false
        }
      },
      isActive: true
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'signal_aggregated' | 'signal_filtered' | 'signal_weighted' | 'aggregation_method_changed' | 'signal_source_toggled' | 'search_performed' | 'signal_expanded' | 'data_refreshed' | 'source_link_clicked',
    signalData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-27-alt-signal-aggregator',
        timestamp: new Date().toISOString(),
        userId: signalData.userId,
        vaultId: signalData.vaultId,
        data: {
          ...signalData.metadata
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
export const altSignalAggregatorService = new AltSignalAggregatorService();

// React Query hooks
export const useAggregatedSignals = (options?: any) => {
  return useQuery({
    queryKey: ['/api/signals/alternative/aggregated', options],
    queryFn: () => altSignalAggregatorService.getAggregatedSignals(options),
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useRawSignals = (options?: any) => {
  return useQuery({
    queryKey: ['/api/signals/alternative/raw', options],
    queryFn: () => altSignalAggregatorService.getRawSignals(options),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAltDataSources = (options?: any) => {
  return useQuery({
    queryKey: ['/api/signals/alternative/sources', options],
    queryFn: () => altSignalAggregatorService.getDataSources(options),
  });
};

export const useCreateSignalConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: any) => 
      altSignalAggregatorService.createSignalConfiguration(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/alternative/configurations'] });
    },
  });
};

export const useUpdateSignalConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SignalConfiguration> }) => 
      altSignalAggregatorService.updateSignalConfiguration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/alternative/configurations'] });
    },
  });
};

export const useSignalPerformance = (options?: any) => {
  return useQuery({
    queryKey: ['/api/signals/alternative/performance', options],
    queryFn: () => altSignalAggregatorService.getSignalPerformance(options),
  });
};

export const useSignalAlerts = (options?: any) => {
  return useQuery({
    queryKey: ['/api/signals/alternative/alerts', options],
    queryFn: () => altSignalAggregatorService.getSignalAlerts(options),
    refetchInterval: 30000,
  });
};

export const useMarkSignalAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      altSignalAggregatorService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/alternative/alerts'] });
    },
  });
};

export const useRunSignalBacktest = () => {
  return useMutation({
    mutationFn: (config: any) => 
      altSignalAggregatorService.runSignalBacktest(config),
  });
}; 