import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Sentiment Explanation Engine
export interface SentimentAnalysis {
  id: string;
  symbol: string;
  timestamp: string;
  overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  confidenceScore: number;
  sentimentScore: number; // -1 to 1
  sources: SentimentSource[];
  explanation: SentimentExplanation;
  historicalTrend: SentimentTrend;
  marketImpact: MarketImpact;
  keyDrivers: SentimentDriver[];
}

export interface SentimentSource {
  id: string;
  type: 'news' | 'social' | 'analyst' | 'insider' | 'options' | 'institutional' | 'retail';
  name: string;
  weight: number;
  sentiment: number;
  confidence: number;
  volume: number;
  timestamp: string;
  url?: string;
  content?: string;
  relevanceScore: number;
  credibilityScore: number;
}

export interface SentimentExplanation {
  summary: string;
  keyPoints: string[];
  reasonsForBullish: string[];
  reasonsForBearish: string[];
  riskFactors: string[];
  opportunities: string[];
  technicalFactors: string[];
  fundamentalFactors: string[];
  marketConditions: string[];
  catalysts: Array<{
    type: 'positive' | 'negative' | 'neutral';
    description: string;
    impact: 'high' | 'medium' | 'low';
    probability: number;
  }>;
}

export interface SentimentTrend {
  period: string;
  dataPoints: Array<{
    timestamp: string;
    sentiment: number;
    volume: number;
    confidence: number;
  }>;
  trendDirection: 'improving' | 'stable' | 'declining';
  volatility: number;
  momentum: number;
  cyclePosition: 'peak' | 'trough' | 'rising' | 'falling';
}

export interface MarketImpact {
  priceCorrelation: number;
  volumeCorrelation: number;
  volatilityImpact: number;
  expectedPriceMove: {
    direction: 'up' | 'down' | 'sideways';
    magnitude: number;
    timeframe: string;
    probability: number;
  };
  sectorImpact: Array<{
    sector: string;
    impact: number;
    reasoning: string;
  }>;
}

export interface SentimentDriver {
  id: string;
  type: 'earnings' | 'news' | 'economic' | 'technical' | 'regulatory' | 'competitive' | 'social';
  description: string;
  impact: number;
  weight: number;
  sentiment: number;
  confidence: number;
  isActive: boolean;
  sources: string[];
  timeframe: string;
  relatedSymbols: string[];
}

export interface SentimentAlert {
  id: string;
  symbol: string;
  type: 'sentiment_spike' | 'sentiment_drop' | 'volume_anomaly' | 'conflicting_signals' | 'new_catalyst';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentSentiment: number;
  previousSentiment: number;
  change: number;
  timestamp: string;
  isRead: boolean;
  triggers: string[];
  metadata: {
    sources: string[];
    timeframe: string;
    confidence: number;
    relatedEvents: string[];
  };
}

export interface SentimentComparison {
  symbols: string[];
  period: string;
  comparison: Array<{
    symbol: string;
    currentSentiment: number;
    averageSentiment: number;
    sentimentRank: number;
    keyDifferences: string[];
    relativeStrength: number;
  }>;
  insights: {
    topPerformers: string[];
    bottomPerformers: string[];
    mostVolatile: string[];
    strongestMomentum: string[];
    recommendations: string[];
  };
}

// Sentiment Explanation Engine Service Class
export class SentimentExplanationEngineService {
  private baseUrl = '/api/sentiment/analysis';

  // Get sentiment analysis for symbol
  async getSentimentAnalysis(symbol: string, options?: {
    timeframe?: string;
    includeHistory?: boolean;
    includeSources?: boolean;
    includeExplanation?: boolean;
  }): Promise<SentimentAnalysis> {
    const params = new URLSearchParams();
    params.append('symbol', symbol);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment analysis');
    }
    
    return response.json();
  }

  // Get sentiment analysis for multiple symbols
  async getBatchSentimentAnalysis(symbols: string[], options?: {
    timeframe?: string;
    limit?: number;
  }): Promise<SentimentAnalysis[]> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, ...options }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch batch sentiment analysis');
    }
    
    return response.json();
  }

  // Get sentiment comparison
  async getSentimentComparison(symbols: string[], period: string = '7d'): Promise<SentimentComparison> {
    const response = await fetch(`${this.baseUrl}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, period }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment comparison');
    }
    
    return response.json();
  }

  // Get sentiment alerts
  async getSentimentAlerts(options?: {
    symbol?: string;
    type?: string;
    severity?: string;
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<SentimentAlert[]> {
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
      throw new Error('Failed to fetch sentiment alerts');
    }
    
    return response.json();
  }

  // Create custom sentiment alert
  async createSentimentAlert(alert: {
    symbol: string;
    type: string;
    conditions: any;
    severity: string;
  }): Promise<SentimentAlert> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create sentiment alert');
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

  // Get sentiment drivers
  async getSentimentDrivers(symbol: string, options?: {
    timeframe?: string;
    limit?: number;
    type?: string;
  }): Promise<SentimentDriver[]> {
    const params = new URLSearchParams();
    params.append('symbol', symbol);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/drivers?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment drivers');
    }
    
    return response.json();
  }

  // Get sentiment explanation
  async getSentimentExplanation(symbol: string, timestamp?: string): Promise<SentimentExplanation> {
    const params = new URLSearchParams();
    params.append('symbol', symbol);
    if (timestamp) params.append('timestamp', timestamp);
    
    const response = await fetch(`${this.baseUrl}/explanation?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment explanation');
    }
    
    return response.json();
  }

  // Get sentiment color
  getSentimentColor(sentiment: SentimentAnalysis['overallSentiment']): string {
    switch (sentiment) {
      case 'very_positive': return 'text-green-700';
      case 'positive': return 'text-green-600';
      case 'neutral': return 'text-gray-600';
      case 'negative': return 'text-red-600';
      case 'very_negative': return 'text-red-700';
      default: return 'text-gray-600';
    }
  }

  // Get sentiment background
  getSentimentBackground(sentiment: SentimentAnalysis['overallSentiment']): string {
    switch (sentiment) {
      case 'very_positive': return 'bg-green-100 border-green-300';
      case 'positive': return 'bg-green-50 border-green-200';
      case 'neutral': return 'bg-gray-50 border-gray-200';
      case 'negative': return 'bg-red-50 border-red-200';
      case 'very_negative': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get sentiment score color
  getSentimentScoreColor(score: number): string {
    if (score >= 0.3) return 'text-green-600';
    if (score >= 0.1) return 'text-green-500';
    if (score >= -0.1) return 'text-gray-600';
    if (score >= -0.3) return 'text-red-500';
    return 'text-red-600';
  }

  // Get trend direction icon
  getTrendDirectionIcon(direction: SentimentTrend['trendDirection']): string {
    switch (direction) {
      case 'improving': return 'trending-up';
      case 'stable': return 'minus';
      case 'declining': return 'trending-down';
      default: return 'help-circle';
    }
  }

  // Get source type icon
  getSourceTypeIcon(type: SentimentSource['type']): string {
    switch (type) {
      case 'news': return 'newspaper';
      case 'social': return 'message-circle';
      case 'analyst': return 'user';
      case 'insider': return 'shield';
      case 'options': return 'bar-chart';
      case 'institutional': return 'building';
      case 'retail': return 'users';
      default: return 'info';
    }
  }

  // Get alert severity color
  getAlertSeverityColor(severity: SentimentAlert['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Format sentiment score
  formatSentimentScore(score: number): string {
    const percentage = Math.round(score * 100);
    return `${percentage >= 0 ? '+' : ''}${percentage}%`;
  }

  // Format confidence score
  formatConfidenceScore(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Calculate sentiment momentum
  calculateSentimentMomentum(dataPoints: SentimentTrend['dataPoints']): {
    momentum: number;
    direction: 'accelerating' | 'stable' | 'decelerating';
    strength: 'strong' | 'moderate' | 'weak';
  } {
    if (dataPoints.length < 3) {
      return { momentum: 0, direction: 'stable', strength: 'weak' };
    }
    
    const recent = dataPoints.slice(-3);
    const velocities = recent.slice(1).map((point, i) => 
      point.sentiment - recent[i].sentiment
    );
    
    const acceleration = velocities.length > 1 ? 
      velocities[1] - velocities[0] : 0;
    
    const momentum = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    
    let direction: 'accelerating' | 'stable' | 'decelerating';
    if (Math.abs(acceleration) < 0.01) direction = 'stable';
    else if (acceleration > 0) direction = 'accelerating';
    else direction = 'decelerating';
    
    let strength: 'strong' | 'moderate' | 'weak';
    const absAcceleration = Math.abs(acceleration);
    if (absAcceleration > 0.05) strength = 'strong';
    else if (absAcceleration > 0.02) strength = 'moderate';
    else strength = 'weak';
    
    return { momentum, direction, strength };
  }

  // Get sentiment strength
  getSentimentStrength(score: number): 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' {
    const abs = Math.abs(score);
    if (abs >= 0.8) return 'very_strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.3) return 'moderate';
    if (abs >= 0.1) return 'weak';
    return 'very_weak';
  }

  // Filter sentiment sources
  filterSentimentSources(sources: SentimentSource[], filters: {
    type?: string;
    minConfidence?: number;
    minRelevance?: number;
    minCredibility?: number;
  }): SentimentSource[] {
    return sources.filter(source => {
      if (filters.type && source.type !== filters.type) return false;
      if (filters.minConfidence && source.confidence < filters.minConfidence) return false;
      if (filters.minRelevance && source.relevanceScore < filters.minRelevance) return false;
      if (filters.minCredibility && source.credibilityScore < filters.minCredibility) return false;
      return true;
    });
  }

  // Sort sentiment sources
  sortSentimentSources(sources: SentimentSource[], sortBy: 'relevance' | 'confidence' | 'credibility' | 'timestamp' | 'weight', order: 'asc' | 'desc' = 'desc'): SentimentSource[] {
    return [...sources].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'relevance':
          compareValue = a.relevanceScore - b.relevanceScore;
          break;
        case 'confidence':
          compareValue = a.confidence - b.confidence;
          break;
        case 'credibility':
          compareValue = a.credibilityScore - b.credibilityScore;
          break;
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'weight':
          compareValue = a.weight - b.weight;
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Generate sentiment summary
  generateSentimentSummary(analysis: SentimentAnalysis): {
    overallAssessment: string;
    keyInsights: string[];
    riskAssessment: string;
    timeframe: string;
    nextUpdate: string;
  } {
    const { overallSentiment, sentimentScore, explanation, historicalTrend } = analysis;
    
    let overallAssessment = '';
    switch (overallSentiment) {
      case 'very_positive':
        overallAssessment = 'Extremely bullish sentiment with strong positive momentum';
        break;
      case 'positive':
        overallAssessment = 'Positive sentiment with upward bias';
        break;
      case 'neutral':
        overallAssessment = 'Balanced sentiment with no clear directional bias';
        break;
      case 'negative':
        overallAssessment = 'Negative sentiment with downward pressure';
        break;
      case 'very_negative':
        overallAssessment = 'Extremely bearish sentiment with strong negative momentum';
        break;
    }
    
    const keyInsights = [
      `Sentiment score: ${this.formatSentimentScore(sentimentScore)}`,
      `Trend: ${historicalTrend.trendDirection}`,
      `Confidence: ${this.formatConfidenceScore(analysis.confidenceScore)}`,
      ...explanation.keyPoints.slice(0, 3)
    ];
    
    const riskLevel = analysis.explanation.riskFactors.length > 3 ? 'High' : 
                     analysis.explanation.riskFactors.length > 1 ? 'Medium' : 'Low';
    
    const riskAssessment = `${riskLevel} risk profile with ${analysis.explanation.riskFactors.length} identified risk factors`;
    
    return {
      overallAssessment,
      keyInsights,
      riskAssessment,
      timeframe: '1 hour',
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  // Calculate weighted sentiment
  calculateWeightedSentiment(sources: SentimentSource[]): {
    weightedSentiment: number;
    totalWeight: number;
    sourceCount: number;
    averageConfidence: number;
  } {
    if (sources.length === 0) {
      return { weightedSentiment: 0, totalWeight: 0, sourceCount: 0, averageConfidence: 0 };
    }
    
    const totalWeight = sources.reduce((sum, source) => sum + source.weight, 0);
    const weightedSentiment = sources.reduce((sum, source) => 
      sum + (source.sentiment * source.weight), 0) / totalWeight;
    
    const averageConfidence = sources.reduce((sum, source) => 
      sum + source.confidence, 0) / sources.length;
    
    return {
      weightedSentiment,
      totalWeight,
      sourceCount: sources.length,
      averageConfidence
    };
  }

  // Get sentiment distribution
  getSentimentDistribution(sources: SentimentSource[]): {
    positive: number;
    negative: number;
    neutral: number;
    polarization: number;
  } {
    const positive = sources.filter(s => s.sentiment > 0.1).length;
    const negative = sources.filter(s => s.sentiment < -0.1).length;
    const neutral = sources.filter(s => s.sentiment >= -0.1 && s.sentiment <= 0.1).length;
    
    const total = sources.length;
    const polarization = total > 0 ? (positive + negative) / total : 0;
    
    return {
      positive: total > 0 ? positive / total : 0,
      negative: total > 0 ? negative / total : 0,
      neutral: total > 0 ? neutral / total : 0,
      polarization
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

  // Get unique source types
  getUniqueSourceTypes(sources: SentimentSource[]): string[] {
    return [...new Set(sources.map(source => source.type))];
  }

  // Generate action recommendations
  generateActionRecommendations(analysis: SentimentAnalysis): {
    primaryAction: string;
    secondaryActions: string[];
    timeframe: string;
    confidence: number;
  } {
    const { overallSentiment, sentimentScore, marketImpact, explanation } = analysis;
    
    let primaryAction = '';
    const secondaryActions: string[] = [];
    
    if (overallSentiment === 'very_positive' || overallSentiment === 'positive') {
      primaryAction = 'Consider long positions or increasing exposure';
      secondaryActions.push('Monitor for profit-taking opportunities');
      secondaryActions.push('Set stop-losses to protect gains');
    } else if (overallSentiment === 'very_negative' || overallSentiment === 'negative') {
      primaryAction = 'Consider reducing exposure or short positions';
      secondaryActions.push('Monitor for oversold conditions');
      secondaryActions.push('Look for potential reversal signals');
    } else {
      primaryAction = 'Maintain current position and monitor';
      secondaryActions.push('Wait for clearer sentiment signals');
      secondaryActions.push('Focus on risk management');
    }
    
    if (explanation.riskFactors.length > 3) {
      secondaryActions.push('Implement additional risk controls');
    }
    
    const timeframe = marketImpact.expectedPriceMove.timeframe || '1-3 days';
    const confidence = analysis.confidenceScore;
    
    return {
      primaryAction,
      secondaryActions,
      timeframe,
      confidence
    };
  }
}

// Agent memory logging
async logAgentMemory(
  action: 'explanation_generated' | 'explanation_viewed' | 'explanation_exported' | 'sentiment_analyzed' | 'explanation_customized' | 'filter_changed' | 'chart_type_changed' | 'comparison_toggled' | 'data_refreshed' | 'point_selected',
  explanationData: {
    userId?: string;
    vaultId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const logData = {
      action,
      blockId: 'block-28-sentiment-explanation-engine',
      timestamp: new Date().toISOString(),
      userId: explanationData.userId,
      vaultId: explanationData.vaultId,
      data: {
        ...explanationData.metadata
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
export const sentimentExplanationEngineService = new SentimentExplanationEngineService();

// React Query hooks
export const useSentimentAnalysis = (symbol: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis', symbol, options],
    queryFn: () => sentimentExplanationEngineService.getSentimentAnalysis(symbol, options),
    enabled: !!symbol,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

export const useBatchSentimentAnalysis = (symbols: string[], options?: any) => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis/batch', symbols, options],
    queryFn: () => sentimentExplanationEngineService.getBatchSentimentAnalysis(symbols, options),
    enabled: symbols.length > 0,
    refetchInterval: 300000,
  });
};

export const useSentimentComparison = (symbols: string[], period: string = '7d') => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis/compare', symbols, period],
    queryFn: () => sentimentExplanationEngineService.getSentimentComparison(symbols, period),
    enabled: symbols.length > 0,
  });
};

export const useSentimentAlerts = (options?: any) => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis/alerts', options],
    queryFn: () => sentimentExplanationEngineService.getSentimentAlerts(options),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useCreateSentimentAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alert: any) => 
      sentimentExplanationEngineService.createSentimentAlert(alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sentiment/analysis/alerts'] });
    },
  });
};

export const useMarkSentimentAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      sentimentExplanationEngineService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sentiment/analysis/alerts'] });
    },
  });
};

export const useSentimentDrivers = (symbol: string, options?: any) => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis/drivers', symbol, options],
    queryFn: () => sentimentExplanationEngineService.getSentimentDrivers(symbol, options),
    enabled: !!symbol,
  });
};

export const useSentimentExplanation = (symbol: string, timestamp?: string) => {
  return useQuery({
    queryKey: ['/api/sentiment/analysis/explanation', symbol, timestamp],
    queryFn: () => sentimentExplanationEngineService.getSentimentExplanation(symbol, timestamp),
    enabled: !!symbol,
  });
}; 