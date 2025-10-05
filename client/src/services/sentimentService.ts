import { useQuery } from '@tanstack/react-query';

// Enhanced types for Sentiment Dashboard Panel
export interface SentimentSnapshot {
  id: string;
  name: string;
  type: 'overlay' | 'asset' | 'macro';
  sentiment: number; // -100 to 100
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number;
  change24h: number;
  drivers: Array<{
    type: 'macro' | 'news' | 'technical' | 'flow';
    weight: number;
    description: string;
  }>;
  lastUpdated: string;
}

export interface SentimentTimelinePoint {
  timestamp: string;
  sentiment: number;
  confidence: number;
  volume: number;
}

export interface SentimentDriver {
  id: string;
  type: 'macro' | 'news' | 'technical' | 'flow';
  name: string;
  description: string;
  weight: number;
  impact: number;
  confidence: number;
}

export interface SentimentDashboardData {
  snapshots: SentimentSnapshot[];
  timeline: {
    [timeframe: string]: SentimentTimelinePoint[];
  };
  drivers: SentimentDriver[];
  summary: {
    overallSentiment: number;
    strongestPositive: string;
    strongestNegative: string;
    mostVolatile: string;
    totalSignals: number;
  };
}

// Original types remain the same...
export interface SentimentIndicator {
  symbol: string;
  name: string;
  category: 'crypto' | 'stocks' | 'commodities' | 'forex' | 'indices';
  sentiment: {
    score: number; // -100 to 100
    label: 'extremely_bearish' | 'bearish' | 'neutral' | 'bullish' | 'extremely_bullish';
    confidence: number; // 0-100
  };
  metrics: {
    bullishPercent: number;
    bearishPercent: number;
    neutralPercent: number;
    fearGreedIndex?: number;
    socialVolume: number;
    newsVolume: number;
  };
  trends: {
    hour1: number;
    hour24: number;
    week1: number;
    sparkline: number[]; // Last 24 hours
  };
  sources: {
    reddit: number;
    twitter: number;
    news: number;
    technical: number;
  };
  lastUpdated: string;
}

export interface SentimentHeatmap {
  categories: {
    [key: string]: {
      name: string;
      avgSentiment: number;
      indicators: SentimentIndicator[];
    };
  };
  globalSentiment: {
    score: number;
    trend: 'up' | 'down' | 'flat';
    change24h: number;
  };
}

export interface SentimentHistory {
  timestamp: string;
  sentiment: number;
  volume: number;
  events?: string[];
}

export interface SentimentResponse {
  indicators: SentimentIndicator[];
  heatmap: SentimentHeatmap;
  history: SentimentHistory[];
  summary: {
    totalIndicators: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    avgSentiment: number;
    volatilityIndex: number;
  };
  lastUpdated: string;
}

// Service class for sentiment operations
export class SentimentService {
  private baseUrl = '/api/sentiment';

  // Enhanced Dashboard Methods
  async getSentimentDashboard(vaultId?: string, type: 'overlay' | 'asset' | 'macro' = 'overlay'): Promise<SentimentDashboardData> {
    const url = vaultId 
      ? `${this.baseUrl}/dashboard?vaultId=${vaultId}&type=${type}`
      : `${this.baseUrl}/dashboard?type=${type}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment dashboard');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('sentiment_dashboard_loaded', {
      vaultId: vaultId || null,
      type,
      snapshotCount: result.snapshots.length,
      overallSentiment: result.summary.overallSentiment,
      totalSignals: result.summary.totalSignals,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  async getSentimentTimeline(vaultId?: string, timeframe: '1D' | '1W' | '1M' = '1D', itemId?: string): Promise<{ timeline: SentimentTimelinePoint[] }> {
    const params = new URLSearchParams({
      timeframe,
      ...(vaultId && { vaultId }),
      ...(itemId && { itemId }),
    });
    
    const response = await fetch(`${this.baseUrl}/timeline?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment timeline');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('sentiment_timeline_loaded', {
      vaultId: vaultId || null,
      timeframe,
      itemId: itemId || null,
      dataPointCount: result.timeline.length,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  async getSentimentDrivers(vaultId?: string, itemId?: string): Promise<SentimentDriver[]> {
    const params = new URLSearchParams({
      ...(vaultId && { vaultId }),
      ...(itemId && { itemId }),
    });
    
    const response = await fetch(`${this.baseUrl}/drivers?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch sentiment drivers');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('sentiment_drivers_loaded', {
      vaultId: vaultId || null,
      itemId: itemId || null,
      driverCount: result.length,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  async exportSentimentData(vaultId?: string, type: 'overlay' | 'asset' | 'macro' = 'overlay', format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const url = vaultId 
      ? `${this.baseUrl}/dashboard/export?vaultId=${vaultId}&type=${type}&format=${format}`
      : `${this.baseUrl}/dashboard/export?type=${type}&format=${format}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to export sentiment data');
    }
    
    const blob = await response.blob();
    
    // Log agent memory
    await this.logAgentMemory('sentiment_data_exported', {
      vaultId: vaultId || null,
      type,
      format,
      fileSize: blob.size,
      timestamp: new Date().toISOString()
    });
    
    return blob;
  }

  // Data Processing Methods
  filterSentimentSnapshots(snapshots: SentimentSnapshot[], viewMode: 'overlay' | 'asset' | 'macro', searchTerm: string): SentimentSnapshot[] {
    const filtered = snapshots
      .filter(snapshot => snapshot.type === viewMode)
      .filter(snapshot => 
        searchTerm === '' || 
        snapshot.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment));
    
    // Log agent memory
    this.logAgentMemory('sentiment_filtered', {
      originalCount: snapshots.length,
      filteredCount: filtered.length,
      viewMode,
      searchTerm,
      timestamp: new Date().toISOString()
    });
    
    return filtered;
  }

  refreshSentimentData(queryClient: any, vaultId?: string): void {
    queryClient.invalidateQueries({ queryKey: ['/api/sentiment/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sentiment/timeline'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sentiment/drivers'] });
    
    // Log agent memory
    this.logAgentMemory('sentiment_refreshed', {
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
  }

  // Utility Methods
  getSentimentColor(sentiment: number): string {
    if (sentiment >= 60) return '#22c55e'; // green
    if (sentiment >= 20) return '#84cc16'; // lime
    if (sentiment >= -20) return '#6b7280'; // gray
    if (sentiment >= -60) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  getSentimentBadge(label: string): { className: string; text: string } {
    switch (label) {
      case 'very_positive':
        return { className: 'bg-green-100 text-green-800', text: 'Very Positive' };
      case 'positive':
        return { className: 'bg-lime-100 text-lime-800', text: 'Positive' };
      case 'neutral':
        return { className: 'bg-gray-100 text-gray-800', text: 'Neutral' };
      case 'negative':
        return { className: 'bg-orange-100 text-orange-800', text: 'Negative' };
      case 'very_negative':
        return { className: 'bg-red-100 text-red-800', text: 'Very Negative' };
      default:
        return { className: 'bg-gray-100 text-gray-800', text: label };
    }
  }

  getDriverIcon(type: string): string {
    switch (type) {
      case 'macro':
        return 'bar-chart-3';
      case 'news':
        return 'file-spreadsheet';
      case 'technical':
        return 'trending-up';
      case 'flow':
        return 'target';
      default:
        return 'info';
    }
  }

  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  createDownloadLink(blob: Blob, filename: string): void {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Legacy Methods - Enhanced with logging
  async getLiveSentiment(symbols?: string[]): Promise<SentimentResponse> {
    const params = new URLSearchParams();
    if (symbols && symbols.length > 0) {
      params.append('symbols', symbols.join(','));
    }
    
    const response = await fetch(`${this.baseUrl}/live?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch live sentiment: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('live_sentiment_fetched', {
      symbolsRequested: symbols || [],
      totalIndicators: result.indicators.length,
      avgSentiment: result.summary.avgSentiment,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  async getSentimentHistory(
    symbol: string, 
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d',
    limit: number = 100
  ): Promise<SentimentHistory[]> {
    const params = new URLSearchParams({
      symbol,
      timeframe,
      limit: limit.toString()
    });
    
    const response = await fetch(`${this.baseUrl}/history?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sentiment history: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('sentiment_history_fetched', {
      symbol,
      timeframe,
      limit,
      dataPointCount: result.length,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  async getSymbolSentiment(symbol: string): Promise<SentimentIndicator> {
    const response = await fetch(`${this.baseUrl}/symbol/${symbol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch symbol sentiment: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('symbol_sentiment_fetched', {
      symbol,
      sentiment: result.sentiment.score,
      confidence: result.sentiment.confidence,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Original utility methods remain the same...
  getSentimentBgColor(score: number): string {
    if (score >= 60) return 'bg-green-500';
    if (score >= 20) return 'bg-green-400';
    if (score >= -20) return 'bg-gray-400';
    if (score >= -60) return 'bg-red-400';
    return 'bg-red-500';
  }

  getSentimentLabel(score: number): string {
    if (score >= 60) return 'Extremely Bullish';
    if (score >= 20) return 'Bullish';
    if (score >= -20) return 'Neutral';
    if (score >= -60) return 'Bearish';
    return 'Extremely Bearish';
  }

  formatSentimentScore(score: number): string {
    const sign = score > 0 ? '+' : '';
    return `${sign}${score.toFixed(0)}`;
  }

  formatTrendChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  getTrendIcon(change: number): string {
    if (change > 5) return '🚀';
    if (change > 1) return '📈';
    if (change > -1) return '➡️';
    if (change > -5) return '📉';
    return '💥';
  }

  getFearGreedColor(index: number): string {
    if (index >= 75) return 'text-green-600';
    if (index >= 55) return 'text-green-400';
    if (index >= 45) return 'text-yellow-500';
    if (index >= 25) return 'text-orange-500';
    return 'text-red-600';
  }

  getFearGreedLabel(index: number): string {
    if (index >= 75) return 'Extreme Greed';
    if (index >= 55) return 'Greed';
    if (index >= 45) return 'Neutral';
    if (index >= 25) return 'Fear';
    return 'Extreme Fear';
  }

  formatVolume(volume: number): string {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  }

  // Generate demo sentiment data - same as before
  generateDemoSentiment(): SentimentResponse {
    const symbols = [
      { symbol: 'BTC', name: 'Bitcoin', category: 'crypto' as const },
      { symbol: 'ETH', name: 'Ethereum', category: 'crypto' as const },
      { symbol: 'SPY', name: 'S&P 500', category: 'indices' as const },
      { symbol: 'AAPL', name: 'Apple', category: 'stocks' as const },
      { symbol: 'TSLA', name: 'Tesla', category: 'stocks' as const },
      { symbol: 'GOLD', name: 'Gold', category: 'commodities' as const },
      { symbol: 'VIX', name: 'VIX', category: 'indices' as const },
      { symbol: 'EURUSD', name: 'EUR/USD', category: 'forex' as const }
    ];

    const indicators: SentimentIndicator[] = symbols.map(({ symbol, name, category }) => {
      const baseScore = Math.random() * 160 - 80;
      const bullishPercent = Math.max(0, Math.min(100, 50 + baseScore * 0.5));
      const bearishPercent = Math.max(0, Math.min(100, 50 - baseScore * 0.5));
      const neutralPercent = 100 - bullishPercent - bearishPercent;
      
      return {
        symbol,
        name,
        category,
        sentiment: {
          score: baseScore,
          label: this.getSentimentLabel(baseScore) as any,
          confidence: Math.random() * 40 + 60
        },
        metrics: {
          bullishPercent,
          bearishPercent,
          neutralPercent,
          fearGreedIndex: symbol === 'BTC' ? Math.random() * 100 : undefined,
          socialVolume: Math.random() * 10000,
          newsVolume: Math.random() * 500
        },
        trends: {
          hour1: Math.random() * 10 - 5,
          hour24: Math.random() * 20 - 10,
          week1: Math.random() * 40 - 20,
          sparkline: Array.from({ length: 24 }, () => Math.random() * 160 - 80)
        },
        sources: {
          reddit: Math.random() * 100,
          twitter: Math.random() * 100,
          news: Math.random() * 100,
          technical: Math.random() * 100
        },
        lastUpdated: new Date().toISOString()
      };
    });

    const categories = indicators.reduce((acc, indicator) => {
      if (!acc[indicator.category]) {
        acc[indicator.category] = {
          name: indicator.category.charAt(0).toUpperCase() + indicator.category.slice(1),
          avgSentiment: 0,
          indicators: []
        };
      }
      acc[indicator.category].indicators.push(indicator);
      return acc;
    }, {} as any);

    Object.keys(categories).forEach(category => {
      const categoryData = categories[category];
      categoryData.avgSentiment = categoryData.indicators.reduce((sum: number, ind: SentimentIndicator) => 
        sum + ind.sentiment.score, 0) / categoryData.indicators.length;
    });

    const avgSentiment = indicators.reduce((sum, ind) => sum + ind.sentiment.score, 0) / indicators.length;
    const globalTrend = avgSentiment > 10 ? 'up' : avgSentiment < -10 ? 'down' : 'flat';

    return {
      indicators,
      heatmap: {
        categories,
        globalSentiment: {
          score: avgSentiment,
          trend: globalTrend,
          change24h: Math.random() * 20 - 10
        }
      },
      history: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        sentiment: Math.random() * 160 - 80,
        volume: Math.random() * 1000,
        events: Math.random() > 0.8 ? ['Market news event'] : undefined
      })).reverse(),
      summary: {
        totalIndicators: indicators.length,
        bullishCount: indicators.filter(i => i.sentiment.score > 20).length,
        bearishCount: indicators.filter(i => i.sentiment.score < -20).length,
        neutralCount: indicators.filter(i => i.sentiment.score >= -20 && i.sentiment.score <= 20).length,
        avgSentiment,
        volatilityIndex: Math.random() * 100
      },
      lastUpdated: new Date().toISOString()
    };
  }

  // Enhanced agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'SentimentService',
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
export const sentimentService = new SentimentService();

// React Query hooks - Enhanced with new dashboard methods
export const useSentimentDashboard = (vaultId?: string, user?: any, type: 'overlay' | 'asset' | 'macro' = 'overlay') => {
  return useQuery({
    queryKey: ['/api/sentiment/dashboard', vaultId, type],
    queryFn: () => sentimentService.getSentimentDashboard(vaultId, type),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useSentimentTimeline = (vaultId?: string, user?: any, timeframe: '1D' | '1W' | '1M' = '1D', itemId?: string) => {
  return useQuery({
    queryKey: ['/api/sentiment/timeline', vaultId, timeframe, itemId],
    queryFn: () => sentimentService.getSentimentTimeline(vaultId, timeframe, itemId),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000,
  });
};

export const useSentimentDrivers = (vaultId?: string, user?: any, itemId?: string) => {
  return useQuery({
    queryKey: ['/api/sentiment/drivers', vaultId, itemId],
    queryFn: () => sentimentService.getSentimentDrivers(vaultId, itemId),
    enabled: !!user && !!vaultId && !!itemId,
    refetchInterval: 120000,
  });
};

// Original hooks remain the same
export const useLiveSentiment = (symbols?: string[]) => {
  return useQuery({
    queryKey: ['live-sentiment', symbols],
    queryFn: () => sentimentService.getLiveSentiment(symbols),
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useSentimentHistory = (symbol: string, timeframe: '1h' | '4h' | '1d' | '1w' = '1d') => {
  return useQuery({
    queryKey: ['sentiment-history', symbol, timeframe],
    queryFn: () => sentimentService.getSentimentHistory(symbol, timeframe),
    enabled: !!symbol,
    refetchInterval: 300000,
  });
};

export const useSymbolSentiment = (symbol: string) => {
  return useQuery({
    queryKey: ['symbol-sentiment', symbol],
    queryFn: () => sentimentService.getSymbolSentiment(symbol),
    enabled: !!symbol,
    refetchInterval: 60000,
  });
}; 