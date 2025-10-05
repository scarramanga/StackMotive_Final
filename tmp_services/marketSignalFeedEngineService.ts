import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Market Signal Feed Engine
export interface MarketSignal {
  id: string;
  source: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold' | 'alert';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  timestamp: string;
  expiresAt?: string;
  reasoning: string;
  technicalIndicators: Record<string, number>;
  fundamentalData?: Record<string, any>;
  tags: string[];
  isActive: boolean;
}

export interface SignalSource {
  id: string;
  name: string;
  type: 'technical' | 'fundamental' | 'sentiment' | 'news' | 'social' | 'ai';
  isActive: boolean;
  priority: number;
  accuracy: number;
  latency: number; // milliseconds
  lastSignal?: string;
  signalCount: number;
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
  config: {
    symbols: string[];
    minConfidence: number;
    signalTypes: string[];
    updateFrequency: number;
  };
}

export interface SignalFilter {
  symbols?: string[];
  types?: string[];
  sources?: string[];
  minConfidence?: number;
  minStrength?: string;
  timeRange?: { start: string; end: string };
  onlyActive?: boolean;
}

export interface MarketSignalEngineData {
  signals: MarketSignal[];
  sources: SignalSource[];
  totalSignals: number;
  activeSignals: number;
  signalsByType: Record<string, number>;
  signalsByStrength: Record<string, number>;
  averageConfidence: number;
  topPerformingSources: SignalSource[];
  recentAlerts: Array<{
    id: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
}

// Market Signal Feed Engine Service Class
export class MarketSignalFeedEngineService {
  private baseUrl = '/api/signals';

  // Fetch signal engine data
  async getSignalEngineData(vaultId?: string, filters?: SignalFilter): Promise<MarketSignalEngineData> {
    const params = new URLSearchParams();
    if (vaultId) params.append('vaultId', vaultId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const url = `${this.baseUrl}/engine?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch signal engine data');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('signals_processed', {
      totalSignals: result.totalSignals,
      activeSignals: result.activeSignals,
      hasFilters: !!filters,
      filters: filters || {},
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Create custom signal
  async createSignal(signal: Omit<MarketSignal, 'id' | 'timestamp'>, vaultId?: string): Promise<MarketSignal> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create signal');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('signal_created', {
      signalId: result.id,
      symbol: result.symbol,
      type: result.type,
      strength: result.strength,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Update signal
  async updateSignal(id: string, updates: Partial<MarketSignal>, vaultId?: string): Promise<MarketSignal> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update signal');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('signal_updated', {
      signalId: id,
      updatedFields: Object.keys(updates),
      newConfidence: result.confidence,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Delete signal
  async deleteSignal(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error('Failed to delete signal');
    }
    
    // Log agent memory
    await this.logAgentMemory('signal_deleted', {
      signalId: id,
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
  }

  // Subscribe to signal source
  async subscribeToSource(sourceId: string, vaultId?: string): Promise<{ success: boolean }> {
    const url = vaultId 
      ? `${this.baseUrl}/sources/${sourceId}/subscribe?vaultId=${vaultId}`
      : `${this.baseUrl}/sources/${sourceId}/subscribe`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      throw new Error('Failed to subscribe to signal source');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('feed_updated', {
      action: 'subscribed',
      sourceId,
      vaultId: vaultId || null,
      success: result.success,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Configure signal source
  async configureSource(sourceId: string, config: SignalSource['config'], vaultId?: string): Promise<SignalSource> {
    const url = vaultId 
      ? `${this.baseUrl}/sources/${sourceId}/config?vaultId=${vaultId}`
      : `${this.baseUrl}/sources/${sourceId}/config`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('Failed to configure signal source');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('engine_configured', {
      sourceId,
      symbols: config.symbols,
      minConfidence: config.minConfidence,
      signalTypes: config.signalTypes,
      updateFrequency: config.updateFrequency,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get signal strength color
  getSignalStrengthColor(strength: MarketSignal['strength']): string {
    switch (strength) {
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'weak': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get signal type color
  getSignalTypeColor(type: MarketSignal['type']): string {
    switch (type) {
      case 'buy': return 'text-green-600';
      case 'sell': return 'text-red-600';
      case 'hold': return 'text-gray-600';
      case 'alert': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  // Get signal type background
  getSignalTypeBackground(type: MarketSignal['type']): string {
    switch (type) {
      case 'buy': return 'bg-green-50 border-green-200';
      case 'sell': return 'bg-red-50 border-red-200';
      case 'hold': return 'bg-gray-50 border-gray-200';
      case 'alert': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get source type icon
  getSourceTypeIcon(type: SignalSource['type']): string {
    switch (type) {
      case 'technical': return 'trending-up';
      case 'fundamental': return 'file-text';
      case 'sentiment': return 'heart';
      case 'news': return 'newspaper';
      case 'social': return 'message-circle';
      case 'ai': return 'cpu';
      default: return 'signal';
    }
  }

  // Format confidence percentage
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Format price
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  }

  // Calculate signal score
  calculateSignalScore(signal: MarketSignal): number {
    const strengthWeights = { weak: 1, moderate: 2, strong: 3 };
    const strengthScore = strengthWeights[signal.strength] * 20;
    const confidenceScore = signal.confidence * 40;
    const freshnessScore = this.calculateFreshnessScore(signal.timestamp) * 40;
    
    const score = Math.round(strengthScore + confidenceScore + freshnessScore);
    
    // Log threshold breach for high-score signals
    if (score >= 85) {
      this.logAgentMemory('threshold_breached', {
        type: 'high_score_signal',
        signalId: signal.id,
        symbol: signal.symbol,
        score,
        strength: signal.strength,
        confidence: signal.confidence,
        timestamp: new Date().toISOString()
      });
    }
    
    return score;
  }

  // Calculate freshness score
  private calculateFreshnessScore(timestamp: string): number {
    const now = new Date();
    const signalTime = new Date(timestamp);
    const ageMinutes = (now.getTime() - signalTime.getTime()) / (1000 * 60);
    
    if (ageMinutes < 5) return 1;
    if (ageMinutes < 15) return 0.9;
    if (ageMinutes < 60) return 0.7;
    if (ageMinutes < 240) return 0.5;
    if (ageMinutes < 1440) return 0.3;
    return 0.1;
  }

  // Filter signals
  filterSignals(signals: MarketSignal[], filters: SignalFilter): MarketSignal[] {
    const filtered = signals.filter(signal => {
      if (filters.symbols && filters.symbols.length > 0) {
        if (!filters.symbols.includes(signal.symbol)) return false;
      }
      
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(signal.type)) return false;
      }
      
      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(signal.source)) return false;
      }
      
      if (filters.minConfidence !== undefined) {
        if (signal.confidence < filters.minConfidence) return false;
      }
      
      if (filters.minStrength) {
        const strengthOrder = { weak: 1, moderate: 2, strong: 3 };
        const minStrengthValue = strengthOrder[filters.minStrength as keyof typeof strengthOrder];
        const signalStrengthValue = strengthOrder[signal.strength];
        if (signalStrengthValue < minStrengthValue) return false;
      }
      
      if (filters.timeRange) {
        const signalTime = new Date(signal.timestamp);
        const startTime = new Date(filters.timeRange.start);
        const endTime = new Date(filters.timeRange.end);
        if (signalTime < startTime || signalTime > endTime) return false;
      }
      
      if (filters.onlyActive !== undefined) {
        if (filters.onlyActive && !signal.isActive) return false;
      }
      
      return true;
    });
    
    // Log agent memory for filtering
    this.logAgentMemory('signals_filtered', {
      originalCount: signals.length,
      filteredCount: filtered.length,
      filtersApplied: Object.keys(filters),
      timestamp: new Date().toISOString()
    });
    
    return filtered;
  }

  // Sort signals
  sortSignals(signals: MarketSignal[], sortBy: 'timestamp' | 'confidence' | 'strength' | 'score', order: 'asc' | 'desc' = 'desc'): MarketSignal[] {
    return [...signals].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'confidence':
          compareValue = a.confidence - b.confidence;
          break;
        case 'strength':
          const strengthOrder = { weak: 1, moderate: 2, strong: 3 };
          compareValue = strengthOrder[a.strength] - strengthOrder[b.strength];
          break;
        case 'score':
          compareValue = this.calculateSignalScore(a) - this.calculateSignalScore(b);
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get signal priority
  getSignalPriority(signal: MarketSignal): 'high' | 'medium' | 'low' {
    const score = this.calculateSignalScore(signal);
    
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // Check if signal is expired
  isSignalExpired(signal: MarketSignal): boolean {
    if (!signal.expiresAt) return false;
    const expired = new Date() > new Date(signal.expiresAt);
    
    // Log threshold breach for expired signals
    if (expired) {
      this.logAgentMemory('threshold_breached', {
        type: 'signal_expired',
        signalId: signal.id,
        symbol: signal.symbol,
        expiredAt: signal.expiresAt,
        timestamp: new Date().toISOString()
      });
    }
    
    return expired;
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

  // Calculate source performance
  calculateSourcePerformance(signals: MarketSignal[], sourceId: string): {
    totalSignals: number;
    avgConfidence: number;
    strongSignals: number;
    activeSignals: number;
    successRate: number;
  } {
    const sourceSignals = signals.filter(s => s.source === sourceId);
    
    if (sourceSignals.length === 0) {
      return {
        totalSignals: 0,
        avgConfidence: 0,
        strongSignals: 0,
        activeSignals: 0,
        successRate: 0
      };
    }
    
    const avgConfidence = sourceSignals.reduce((sum, s) => sum + s.confidence, 0) / sourceSignals.length;
    const strongSignals = sourceSignals.filter(s => s.strength === 'strong').length;
    const activeSignals = sourceSignals.filter(s => s.isActive).length;
    
    // Mock success rate calculation (would need historical performance data)
    const successRate = Math.random() * 0.4 + 0.5; // 50-90% range
    
    return {
      totalSignals: sourceSignals.length,
      avgConfidence,
      strongSignals,
      activeSignals,
      successRate
    };
  }

  // Get unique symbols
  getUniqueSymbols(signals: MarketSignal[]): string[] {
    return [...new Set(signals.map(s => s.symbol))].sort();
  }

  // Get unique sources
  getUniqueSources(signals: MarketSignal[]): string[] {
    return [...new Set(signals.map(s => s.source))].sort();
  }

  // Create default signal
  createDefaultSignal(): Omit<MarketSignal, 'id' | 'timestamp'> {
    return {
      source: 'custom',
      symbol: '',
      type: 'buy',
      strength: 'moderate',
      confidence: 0.5,
      price: 0,
      reasoning: '',
      technicalIndicators: {},
      tags: [],
      isActive: true
    };
  }

  // Validate signal form
  validateSignalForm(signal: Partial<MarketSignal>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!signal.symbol?.trim()) {
      errors.push('Symbol is required');
    }
    
    if (!signal.type) {
      errors.push('Signal type is required');
    }
    
    if (signal.confidence === undefined || signal.confidence < 0 || signal.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
    
    if (!signal.price || signal.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (!signal.reasoning?.trim()) {
      errors.push('Reasoning is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate signal distribution
  calculateSignalDistribution(signals: MarketSignal[]): {
    byType: Record<string, number>;
    byStrength: Record<string, number>;
    bySource: Record<string, number>;
    bySymbol: Record<string, number>;
  } {
    return {
      byType: this.groupBy(signals, 'type'),
      byStrength: this.groupBy(signals, 'strength'),
      bySource: this.groupBy(signals, 'source'),
      bySymbol: this.groupBy(signals, 'symbol')
    };
  }

  private groupBy(signals: MarketSignal[], key: keyof MarketSignal): Record<string, number> {
    return signals.reduce((acc, signal) => {
      const value = signal[key] as string;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'MarketSignalFeedEngineService',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const marketSignalFeedEngineService = new MarketSignalFeedEngineService();

// React Query hooks
export const useMarketSignalEngineData = (vaultId?: string, user?: any, filters?: SignalFilter) => {
  return useQuery({
    queryKey: ['/api/signals/engine', vaultId, filters],
    queryFn: () => marketSignalFeedEngineService.getSignalEngineData(vaultId, filters),
    enabled: !!user && !!vaultId,
    refetchInterval: 15000, // Update every 15 seconds for real-time signals
  });
};

export const useCreateSignal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ signal, vaultId }: { signal: Omit<MarketSignal, 'id' | 'timestamp'>; vaultId?: string }) => 
      marketSignalFeedEngineService.createSignal(signal, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/engine'] });
    },
  });
};

export const useUpdateSignal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, vaultId }: { id: string; updates: Partial<MarketSignal>; vaultId?: string }) => 
      marketSignalFeedEngineService.updateSignal(id, updates, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/engine'] });
    },
  });
};

export const useDeleteSignal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      marketSignalFeedEngineService.deleteSignal(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/engine'] });
    },
  });
};

export const useSubscribeToSource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceId, vaultId }: { sourceId: string; vaultId?: string }) => 
      marketSignalFeedEngineService.subscribeToSource(sourceId, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/engine'] });
    },
  });
};

export const useConfigureSource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceId, config, vaultId }: { sourceId: string; config: SignalSource['config']; vaultId?: string }) => 
      marketSignalFeedEngineService.configureSource(sourceId, config, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals/engine'] });
    },
  });
}; 