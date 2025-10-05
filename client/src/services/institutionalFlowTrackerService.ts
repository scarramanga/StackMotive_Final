import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Institutional Flow Tracker
export interface InstitutionalFlow {
  id: string;
  timestamp: string;
  institution: string;
  institutionType: 'hedge_fund' | 'pension_fund' | 'bank' | 'insurance' | 'sovereign_wealth' | 'mutual_fund' | 'private_equity' | 'other';
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  price: number;
  value: number;
  flowType: 'inflow' | 'outflow';
  confidence: number;
  source: 'sec_filing' | 'dark_pool' | 'block_trade' | 'options_flow' | 'insider_trading' | 'estimated';
  impactScore: number;
  marketCap: number;
  percentOfFloat: number;
  averageVolume: number;
  metadata: {
    filingType?: string;
    reportDate?: string;
    quarterlyChange?: number;
    cumulativeFlow?: number;
    relatedPositions?: string[];
  };
}

export interface InstitutionalPosition {
  id: string;
  institution: string;
  symbol: string;
  shares: number;
  value: number;
  percentOfPortfolio: number;
  percentOfFloat: number;
  quarterlyChange: number;
  yearlyChange: number;
  averageCost: number;
  lastReported: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface InstitutionalAlert {
  id: string;
  type: 'large_flow' | 'unusual_activity' | 'position_change' | 'new_position' | 'exit_position';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  symbol: string;
  institution: string;
  value: number;
  timestamp: string;
  isRead: boolean;
  isActive: boolean;
  relatedFlows: string[];
}

export interface FlowAnalysis {
  symbol: string;
  period: string;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  flowVelocity: number;
  institutionCount: number;
  topInstitutions: Array<{
    name: string;
    flow: number;
    change: number;
  }>;
  flowByType: Array<{
    type: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
  priceImpact: {
    correlation: number;
    lag: number;
    significance: number;
  };
}

export interface InstitutionalTrackerData {
  flows: InstitutionalFlow[];
  positions: InstitutionalPosition[];
  alerts: InstitutionalAlert[];
  analysis: FlowAnalysis[];
  summary: {
    totalFlows: number;
    totalValue: number;
    netInflow: number;
    activeInstitutions: number;
    topMovers: Array<{
      symbol: string;
      flow: number;
      change: number;
    }>;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    confidenceLevel: number;
  };
}

// Institutional Flow Tracker Service Class
export class InstitutionalFlowTrackerService {
  private baseUrl = '/api/institutional/flows';

  // Fetch institutional flow data
  async getFlowData(options?: {
    vaultId?: string;
    symbols?: string[];
    institutions?: string[];
    timeRange?: { start: string; end: string };
    minValue?: number;
    flowType?: 'inflow' | 'outflow';
    source?: string;
    limit?: number;
  }): Promise<InstitutionalTrackerData> {
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
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch institutional flow data');
    }
    
    return response.json();
  }

  // Get flow analysis for specific symbol
  async getFlowAnalysis(symbol: string, period: string = '30d'): Promise<FlowAnalysis> {
    const response = await fetch(`${this.baseUrl}/analysis/${symbol}?period=${period}`);
    if (!response.ok) {
      throw new Error('Failed to fetch flow analysis');
    }
    
    return response.json();
  }

  // Get institutional positions
  async getInstitutionalPositions(options?: {
    symbol?: string;
    institution?: string;
    minValue?: number;
    sortBy?: 'value' | 'change' | 'percent';
    limit?: number;
  }): Promise<InstitutionalPosition[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/positions?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch institutional positions');
    }
    
    return response.json();
  }

  // Create flow alert
  async createAlert(alert: Omit<InstitutionalAlert, 'id' | 'timestamp' | 'isRead'>): Promise<InstitutionalAlert> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create alert');
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

  // Get watchlist flow analysis
  async getWatchlistFlowAnalysis(symbols: string[], period: string = '7d'): Promise<Array<{
    symbol: string;
    netFlow: number;
    flowVelocity: number;
    institutionCount: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>> {
    const response = await fetch(`${this.baseUrl}/watchlist/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, period }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch watchlist flow analysis');
    }
    
    return response.json();
  }

  // Get flow type color
  getFlowTypeColor(flowType: InstitutionalFlow['flowType']): string {
    switch (flowType) {
      case 'inflow': return 'text-green-600';
      case 'outflow': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get flow type background
  getFlowTypeBackground(flowType: InstitutionalFlow['flowType']): string {
    switch (flowType) {
      case 'inflow': return 'bg-green-50 border-green-200';
      case 'outflow': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get institution type icon
  getInstitutionTypeIcon(type: InstitutionalFlow['institutionType']): string {
    switch (type) {
      case 'hedge_fund': return 'trending-up';
      case 'pension_fund': return 'shield';
      case 'bank': return 'building';
      case 'insurance': return 'umbrella';
      case 'sovereign_wealth': return 'crown';
      case 'mutual_fund': return 'users';
      case 'private_equity': return 'briefcase';
      default: return 'building-2';
    }
  }

  // Get alert severity color
  getAlertSeverityColor(severity: InstitutionalAlert['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  // Format volume
  formatVolume(volume: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(volume);
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Calculate flow velocity
  calculateFlowVelocity(flows: InstitutionalFlow[], period: number = 7): number {
    if (flows.length === 0) return 0;
    
    const now = new Date();
    const periodStart = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    
    const recentFlows = flows.filter(flow => 
      new Date(flow.timestamp) >= periodStart
    );
    
    const totalValue = recentFlows.reduce((sum, flow) => sum + flow.value, 0);
    return totalValue / period; // Average daily flow
  }

  // Calculate impact score
  calculateImpactScore(flow: InstitutionalFlow): number {
    const volumeScore = Math.min(10, (flow.volume / flow.averageVolume) * 2);
    const percentOfFloatScore = Math.min(10, flow.percentOfFloat * 100);
    const confidenceScore = flow.confidence * 10;
    
    return (volumeScore + percentOfFloatScore + confidenceScore) / 3;
  }

  // Get trend direction
  getTrendDirection(change: number): 'up' | 'down' | 'stable' {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  // Get trend color
  getTrendColor(trend: 'increasing' | 'decreasing' | 'stable'): string {
    switch (trend) {
      case 'increasing': return 'text-green-600';
      case 'decreasing': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Filter flows by criteria
  filterFlows(flows: InstitutionalFlow[], filters: {
    symbol?: string;
    institution?: string;
    flowType?: 'inflow' | 'outflow';
    minValue?: number;
    minConfidence?: number;
    source?: string;
    timeRange?: { start: string; end: string };
  }): InstitutionalFlow[] {
    return flows.filter(flow => {
      if (filters.symbol && flow.symbol !== filters.symbol) return false;
      if (filters.institution && flow.institution !== filters.institution) return false;
      if (filters.flowType && flow.flowType !== filters.flowType) return false;
      if (filters.minValue && flow.value < filters.minValue) return false;
      if (filters.minConfidence && flow.confidence < filters.minConfidence) return false;
      if (filters.source && flow.source !== filters.source) return false;
      
      if (filters.timeRange) {
        const flowTime = new Date(flow.timestamp);
        const startTime = new Date(filters.timeRange.start);
        const endTime = new Date(filters.timeRange.end);
        if (flowTime < startTime || flowTime > endTime) return false;
      }
      
      return true;
    });
  }

  // Sort flows
  sortFlows(flows: InstitutionalFlow[], sortBy: 'timestamp' | 'value' | 'impact' | 'confidence', order: 'asc' | 'desc' = 'desc'): InstitutionalFlow[] {
    return [...flows].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'value':
          compareValue = a.value - b.value;
          break;
        case 'impact':
          compareValue = a.impactScore - b.impactScore;
          break;
        case 'confidence':
          compareValue = a.confidence - b.confidence;
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get unique institutions
  getUniqueInstitutions(flows: InstitutionalFlow[]): string[] {
    return [...new Set(flows.map(flow => flow.institution))].sort();
  }

  // Get unique symbols
  getUniqueSymbols(flows: InstitutionalFlow[]): string[] {
    return [...new Set(flows.map(flow => flow.symbol))].sort();
  }

  // Calculate market sentiment
  calculateMarketSentiment(flows: InstitutionalFlow[]): {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    reasoning: string;
  } {
    if (flows.length === 0) {
      return { sentiment: 'neutral', confidence: 0, reasoning: 'No data available' };
    }
    
    const totalInflow = flows.filter(f => f.flowType === 'inflow').reduce((sum, f) => sum + f.value, 0);
    const totalOutflow = flows.filter(f => f.flowType === 'outflow').reduce((sum, f) => sum + f.value, 0);
    const netFlow = totalInflow - totalOutflow;
    
    const flowRatio = totalInflow / (totalInflow + totalOutflow);
    const avgConfidence = flows.reduce((sum, f) => sum + f.confidence, 0) / flows.length;
    
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    let reasoning: string;
    
    if (flowRatio > 0.6) {
      sentiment = 'bullish';
      reasoning = `Strong institutional buying (${this.formatPercentage((flowRatio - 0.5) * 200)} net inflow)`;
    } else if (flowRatio < 0.4) {
      sentiment = 'bearish';
      reasoning = `Strong institutional selling (${this.formatPercentage((0.5 - flowRatio) * 200)} net outflow)`;
    } else {
      sentiment = 'neutral';
      reasoning = 'Balanced institutional activity';
    }
    
    return {
      sentiment,
      confidence: avgConfidence,
      reasoning
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

  // Calculate flow concentration
  calculateFlowConcentration(flows: InstitutionalFlow[]): {
    herfindahlIndex: number;
    topInstitutionShare: number;
    diversificationScore: number;
  } {
    const institutionFlows = flows.reduce((acc, flow) => {
      acc[flow.institution] = (acc[flow.institution] || 0) + flow.value;
      return acc;
    }, {} as Record<string, number>);
    
    const totalValue = Object.values(institutionFlows).reduce((sum, value) => sum + value, 0);
    const shares = Object.values(institutionFlows).map(value => value / totalValue);
    
    const herfindahlIndex = shares.reduce((sum, share) => sum + share * share, 0);
    const topInstitutionShare = Math.max(...shares);
    const diversificationScore = 1 - herfindahlIndex;
    
    return {
      herfindahlIndex,
      topInstitutionShare,
      diversificationScore
    };
  }

  // Get risk assessment
  getRiskAssessment(flows: InstitutionalFlow[]): {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  } {
    const factors: string[] = [];
    let riskScore = 0;
    
    // Check for concentration risk
    const concentration = this.calculateFlowConcentration(flows);
    if (concentration.herfindahlIndex > 0.3) {
      factors.push('High concentration in few institutions');
      riskScore += 20;
    }
    
    // Check for unusual volume
    const avgVolume = flows.reduce((sum, f) => sum + f.volume, 0) / flows.length;
    const unusualVolume = flows.filter(f => f.volume > avgVolume * 3).length;
    if (unusualVolume > flows.length * 0.1) {
      factors.push('Unusual volume activity detected');
      riskScore += 15;
    }
    
    // Check for low confidence flows
    const lowConfidenceFlows = flows.filter(f => f.confidence < 0.5).length;
    if (lowConfidenceFlows > flows.length * 0.3) {
      factors.push('Many low-confidence data points');
      riskScore += 10;
    }
    
    // Check for rapid changes
    const recentFlows = flows.filter(f => 
      new Date(f.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (recentFlows.length > flows.length * 0.5) {
      factors.push('High recent activity');
      riskScore += 15;
    }
    
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 20) riskLevel = 'low';
    else if (riskScore < 40) riskLevel = 'medium';
    else riskLevel = 'high';
    
    return { riskLevel, factors, score: riskScore };
  }
}

// Agent memory logging
async logAgentMemory(
  action: 'flow_tracked' | 'flow_filtered' | 'flow_analyzed' | 'alert_configured' | 'flow_exported' | 'data_refreshed' | 'filter_changed' | 'flow_drilldown',
  flowData: {
    userId?: string;
    vaultId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const logData = {
      action,
      blockId: 'block-29-institutional-flow-tracker',
      timestamp: new Date().toISOString(),
      userId: flowData.userId,
      vaultId: flowData.vaultId,
      data: {
        ...flowData.metadata
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

// Service instance
export const institutionalFlowTrackerService = new InstitutionalFlowTrackerService();

// React Query hooks
export const useInstitutionalFlowData = (vaultId?: string, user?: any, options?: any) => {
  return useQuery({
    queryKey: ['/api/institutional/flows', vaultId, options],
    queryFn: () => institutionalFlowTrackerService.getFlowData({ vaultId, ...options }),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useFlowAnalysis = (symbol: string, period: string = '30d') => {
  return useQuery({
    queryKey: ['/api/institutional/flows/analysis', symbol, period],
    queryFn: () => institutionalFlowTrackerService.getFlowAnalysis(symbol, period),
    enabled: !!symbol,
  });
};

export const useInstitutionalPositions = (options?: any) => {
  return useQuery({
    queryKey: ['/api/institutional/flows/positions', options],
    queryFn: () => institutionalFlowTrackerService.getInstitutionalPositions(options),
  });
};

export const useCreateAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alert: Omit<InstitutionalAlert, 'id' | 'timestamp' | 'isRead'>) => 
      institutionalFlowTrackerService.createAlert(alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institutional/flows'] });
    },
  });
};

export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      institutionalFlowTrackerService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institutional/flows'] });
    },
  });
};

export const useWatchlistFlowAnalysis = (symbols: string[], period: string = '7d') => {
  return useQuery({
    queryKey: ['/api/institutional/flows/watchlist/analysis', symbols, period],
    queryFn: () => institutionalFlowTrackerService.getWatchlistFlowAnalysis(symbols, period),
    enabled: symbols.length > 0,
  });
}; 