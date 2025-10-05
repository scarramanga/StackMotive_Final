// Block 95: Market Sentiment Bar - Engine
// Real-time Market Sentiment Processing and Analysis

import {
  MarketSentimentBar,
  SentimentReading,
  SentimentDataSource,
  SentimentHistory,
  ComponentSentiment,
  SourceSentimentBreakdown,
  SegmentSentiment,
  TemporalSentimentAnalysis,
  SentimentQualityMetrics,
  SentimentGrade,
  SentimentSourceType,
  TrendDirection,
  TimeRange
} from '../types/marketSentimentBar';

export class MarketSentimentBarEngine {
  private static instance: MarketSentimentBarEngine;
  private bars: Map<string, MarketSentimentBar> = new Map();
  private realtimeData: Map<string, SentimentReading> = new Map();
  private sentimentHistory: Map<string, SentimentHistory[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dataSourceConnections: Map<string, AbortController> = new Map();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): MarketSentimentBarEngine {
    if (!MarketSentimentBarEngine.instance) {
      MarketSentimentBarEngine.instance = new MarketSentimentBarEngine();
    }
    return MarketSentimentBarEngine.instance;
  }

  private initializeEngine(): void {
    this.createMockBars();
    this.startRealtimeUpdates();
  }

  // Bar Management
  public createBar(config: Omit<MarketSentimentBar, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): MarketSentimentBar {
    const newBar: MarketSentimentBar = {
      ...config,
      id: this.generateId(),
      userId: this.getCurrentUserId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    };

    // Initialize with default sentiment reading
    newBar.currentSentiment = this.createInitialSentimentReading();

    this.bars.set(newBar.id, newBar);
    this.startBarUpdates(newBar.id);
    
    return newBar;
  }

  public updateBar(id: string, updates: Partial<MarketSentimentBar>): MarketSentimentBar {
    const existingBar = this.bars.get(id);
    if (!existingBar) {
      throw new Error(`Bar with id ${id} not found`);
    }

    const updatedBar = {
      ...existingBar,
      ...updates,
      updatedAt: new Date()
    };

    this.bars.set(id, updatedBar);
    
    // Restart updates if configuration changed
    if (updates.sentimentConfig) {
      this.restartBarUpdates(id);
    }
    
    return updatedBar;
  }

  public deleteBar(id: string): void {
    if (!this.bars.has(id)) {
      throw new Error(`Bar with id ${id} not found`);
    }
    
    this.stopBarUpdates(id);
    this.bars.delete(id);
    this.realtimeData.delete(id);
    this.sentimentHistory.delete(id);
  }

  public getBar(id: string): MarketSentimentBar | undefined {
    return this.bars.get(id);
  }

  public getBars(): MarketSentimentBar[] {
    return Array.from(this.bars.values());
  }

  // Real-time Sentiment Operations
  public async getCurrentSentiment(barId: string): Promise<SentimentReading> {
    const bar = this.bars.get(barId);
    if (!bar) {
      throw new Error(`Bar with id ${barId} not found`);
    }

    // Check if we have recent data
    const cachedSentiment = this.realtimeData.get(barId);
    if (cachedSentiment && this.isSentimentFresh(cachedSentiment, bar)) {
      return cachedSentiment;
    }

    // Generate new sentiment reading
    const sentimentReading = await this.calculateSentiment(bar);
    this.realtimeData.set(barId, sentimentReading);
    
    // Update bar
    bar.currentSentiment = sentimentReading;
    bar.lastUpdated = new Date();
    this.bars.set(barId, bar);
    
    // Add to history
    this.addToHistory(barId, sentimentReading);
    
    return sentimentReading;
  }

  public async refreshSentiment(barId: string): Promise<SentimentReading> {
    const bar = this.bars.get(barId);
    if (!bar) {
      throw new Error(`Bar with id ${barId} not found`);
    }

    // Force refresh by calculating new sentiment
    const sentimentReading = await this.calculateSentiment(bar);
    this.realtimeData.set(barId, sentimentReading);
    
    // Update bar
    bar.currentSentiment = sentimentReading;
    bar.lastUpdated = new Date();
    this.bars.set(barId, bar);
    
    // Add to history
    this.addToHistory(barId, sentimentReading);
    
    return sentimentReading;
  }

  // Core Sentiment Calculation
  private async calculateSentiment(bar: MarketSentimentBar): Promise<SentimentReading> {
    try {
      // Step 1: Gather data from all sources
      const sourceData = await this.gatherSourceData(bar);
      
      // Step 2: Calculate component sentiments
      const componentSentiments = await this.calculateComponentSentiments(bar, sourceData);
      
      // Step 3: Calculate source breakdown
      const sourceBreakdown = this.calculateSourceBreakdown(bar, sourceData);
      
      // Step 4: Calculate segment sentiments
      const segmentSentiments = await this.calculateSegmentSentiments(bar, sourceData);
      
      // Step 5: Perform temporal analysis
      const temporalAnalysis = await this.performTemporalAnalysis(bar, sourceData);
      
      // Step 6: Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(sourceData);
      
      // Step 7: Aggregate overall sentiment
      const overallSentiment = this.aggregateOverallSentiment(componentSentiments, bar.sentimentConfig);
      
      // Step 8: Calculate confidence
      const confidence = this.calculateConfidence(componentSentiments, qualityMetrics);
      
      // Step 9: Determine grade
      const sentimentGrade = this.determineSentimentGrade(overallSentiment);
      
      const sentimentReading: SentimentReading = {
        id: this.generateId(),
        overallSentiment,
        sentimentGrade,
        confidence,
        componentSentiments,
        sourceBreakdown,
        segmentSentiments,
        temporalAnalysis,
        qualityMetrics,
        timestamp: new Date(),
        dataAsOfTime: new Date(),
        calculationMethod: bar.sentimentConfig.aggregationMethod,
        sampleSize: sourceData.reduce((sum, source) => sum + source.dataPoints, 0)
      };

      return sentimentReading;
    } catch (error) {
      throw new Error(`Failed to calculate sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async gatherSourceData(bar: MarketSentimentBar): Promise<SourceData[]> {
    const sourceDataPromises = bar.dataSources
      .filter(source => source.isEnabled && source.status === 'active')
      .map(source => this.gatherDataFromSource(source, bar));

    const sourceData = await Promise.allSettled(sourceDataPromises);
    
    return sourceData
      .filter((result): result is PromiseFulfilledResult<SourceData> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  private async gatherDataFromSource(source: SentimentDataSource, bar: MarketSentimentBar): Promise<SourceData> {
    // Simulate data gathering from different source types
    await this.delay(100);
    
    const baseData = this.generateMockSourceData(source.sourceType);
    
    return {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      rawSentiment: baseData.sentiment,
      confidence: baseData.confidence,
      dataPoints: baseData.dataPoints,
      freshness: Math.random() * 2, // hours
      reliability: source.qualityMetrics.reliability,
      timestamp: new Date(),
      metadata: baseData.metadata
    };
  }

  private async calculateComponentSentiments(bar: MarketSentimentBar, sourceData: SourceData[]): Promise<ComponentSentiment[]> {
    const components: ComponentSentiment[] = [];

    // Market News Component
    const newsData = sourceData.filter(s => s.sourceType === 'news');
    if (newsData.length > 0) {
      components.push(await this.calculateNewsComponent(newsData));
    }

    // Social Media Component
    const socialData = sourceData.filter(s => s.sourceType === 'social_media');
    if (socialData.length > 0) {
      components.push(await this.calculateSocialComponent(socialData));
    }

    // Options Flow Component
    const optionsData = sourceData.filter(s => s.sourceType === 'options_flow');
    if (optionsData.length > 0) {
      components.push(await this.calculateOptionsComponent(optionsData));
    }

    // VIX/Volatility Component
    const vixData = sourceData.filter(s => s.sourceType === 'vix');
    if (vixData.length > 0) {
      components.push(await this.calculateVolatilityComponent(vixData));
    }

    // Bond Sentiment Component
    const bondData = sourceData.filter(s => s.sourceType === 'bonds');
    if (bondData.length > 0) {
      components.push(await this.calculateBondComponent(bondData));
    }

    return components;
  }

  private async calculateNewsComponent(newsData: SourceData[]): Promise<ComponentSentiment> {
    await this.delay(50);
    
    const avgSentiment = newsData.reduce((sum, data) => sum + data.rawSentiment, 0) / newsData.length;
    const avgConfidence = newsData.reduce((sum, data) => sum + data.confidence, 0) / newsData.length;
    
    return {
      componentId: 'market_news',
      componentName: 'Market News',
      componentType: 'market_news',
      sentiment: avgSentiment,
      confidence: avgConfidence,
      weight: 0.3,
      factors: [
        {
          factorId: 'earnings_news',
          factorName: 'Earnings Reports',
          factorType: 'earnings',
          impact: 0.15,
          confidence: 0.85,
          weight: 0.4,
          description: 'Recent earnings announcements',
          context: {
            timeframe: '24h',
            scope: 'ASX200',
            relevance: 0.9,
            persistence: 0.7
          },
          duration: 12,
          intensity: 0.8,
          sources: ['reuters', 'bloomberg', 'asx_announcements']
        }
      ],
      trend: {
        direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
        strength: Math.abs(avgSentiment),
        duration: 6,
        momentum: 0.05,
        acceleration: 0.02,
        projectedSentiment: avgSentiment + 0.05,
        projectionConfidence: 0.65,
        historicalComparison: {
          similar1M: 0.12,
          similar3M: 0.08,
          similar1Y: 0.15,
          percentileRank: 0.68
        }
      },
      dataQuality: 0.88,
      sampleSize: newsData.reduce((sum, data) => sum + data.dataPoints, 0),
      lastUpdated: new Date()
    };
  }

  private async calculateSocialComponent(socialData: SourceData[]): Promise<ComponentSentiment> {
    await this.delay(40);
    
    const avgSentiment = socialData.reduce((sum, data) => sum + data.rawSentiment, 0) / socialData.length;
    const avgConfidence = socialData.reduce((sum, data) => sum + data.confidence, 0) / socialData.length;
    
    return {
      componentId: 'social_sentiment',
      componentName: 'Social Media Sentiment',
      componentType: 'social_sentiment',
      sentiment: avgSentiment,
      confidence: avgConfidence * 0.8, // Lower confidence for social data
      weight: 0.2,
      factors: [],
      trend: {
        direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
        strength: Math.abs(avgSentiment),
        duration: 4,
        momentum: 0.08,
        acceleration: 0.03,
        projectedSentiment: avgSentiment + 0.03,
        projectionConfidence: 0.55,
        historicalComparison: {
          similar1M: 0.05,
          similar3M: 0.02,
          similar1Y: 0.08,
          percentileRank: 0.72
        }
      },
      dataQuality: 0.72,
      sampleSize: socialData.reduce((sum, data) => sum + data.dataPoints, 0),
      lastUpdated: new Date()
    };
  }

  private async calculateOptionsComponent(optionsData: SourceData[]): Promise<ComponentSentiment> {
    await this.delay(60);
    
    const avgSentiment = optionsData.reduce((sum, data) => sum + data.rawSentiment, 0) / optionsData.length;
    const avgConfidence = optionsData.reduce((sum, data) => sum + data.confidence, 0) / optionsData.length;
    
    return {
      componentId: 'options_sentiment',
      componentName: 'Options Flow',
      componentType: 'options_sentiment',
      sentiment: avgSentiment,
      confidence: avgConfidence,
      weight: 0.25,
      factors: [],
      trend: {
        direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
        strength: Math.abs(avgSentiment),
        duration: 8,
        momentum: 0.12,
        acceleration: 0.04,
        projectedSentiment: avgSentiment + 0.08,
        projectionConfidence: 0.78,
        historicalComparison: {
          similar1M: 0.18,
          similar3M: 0.12,
          similar1Y: 0.22,
          percentileRank: 0.64
        }
      },
      dataQuality: 0.91,
      sampleSize: optionsData.reduce((sum, data) => sum + data.dataPoints, 0),
      lastUpdated: new Date()
    };
  }

  private async calculateVolatilityComponent(vixData: SourceData[]): Promise<ComponentSentiment> {
    await this.delay(30);
    
    const avgSentiment = vixData.reduce((sum, data) => sum + data.rawSentiment, 0) / vixData.length;
    const avgConfidence = vixData.reduce((sum, data) => sum + data.confidence, 0) / vixData.length;
    
    return {
      componentId: 'volatility_sentiment',
      componentName: 'Volatility Index',
      componentType: 'volatility_sentiment',
      sentiment: -avgSentiment, // Inverse relationship: high VIX = negative sentiment
      confidence: avgConfidence,
      weight: 0.15,
      factors: [],
      trend: {
        direction: avgSentiment < -0.1 ? 'bullish' : avgSentiment > 0.1 ? 'bearish' : 'neutral',
        strength: Math.abs(avgSentiment),
        duration: 3,
        momentum: -0.06,
        acceleration: -0.02,
        projectedSentiment: -avgSentiment - 0.04,
        projectionConfidence: 0.82,
        historicalComparison: {
          similar1M: -0.08,
          similar3M: -0.12,
          similar1Y: -0.06,
          percentileRank: 0.45
        }
      },
      dataQuality: 0.95,
      sampleSize: vixData.reduce((sum, data) => sum + data.dataPoints, 0),
      lastUpdated: new Date()
    };
  }

  private async calculateBondComponent(bondData: SourceData[]): Promise<ComponentSentiment> {
    await this.delay(35);
    
    const avgSentiment = bondData.reduce((sum, data) => sum + data.rawSentiment, 0) / bondData.length;
    const avgConfidence = bondData.reduce((sum, data) => sum + data.confidence, 0) / bondData.length;
    
    return {
      componentId: 'bond_sentiment',
      componentName: 'Bond Market',
      componentType: 'bond_sentiment',
      sentiment: avgSentiment,
      confidence: avgConfidence,
      weight: 0.1,
      factors: [],
      trend: {
        direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
        strength: Math.abs(avgSentiment),
        duration: 12,
        momentum: 0.03,
        acceleration: 0.01,
        projectedSentiment: avgSentiment + 0.02,
        projectionConfidence: 0.70,
        historicalComparison: {
          similar1M: 0.06,
          similar3M: 0.04,
          similar1Y: 0.09,
          percentileRank: 0.58
        }
      },
      dataQuality: 0.93,
      sampleSize: bondData.reduce((sum, data) => sum + data.dataPoints, 0),
      lastUpdated: new Date()
    };
  }

  private calculateSourceBreakdown(bar: MarketSentimentBar, sourceData: SourceData[]): SourceSentimentBreakdown[] {
    return sourceData.map(data => ({
      sourceType: data.sourceType,
      sourceName: this.getSourceDisplayName(data.sourceType),
      sentiment: data.rawSentiment,
      confidence: data.confidence,
      weight: bar.sentimentConfig.sourceWeights[data.sourceType] || 0.1,
      contribution: data.rawSentiment * (bar.sentimentConfig.sourceWeights[data.sourceType] || 0.1),
      dataPoints: data.dataPoints,
      freshness: data.freshness,
      reliability: data.reliability,
      isActive: true,
      lastUpdated: data.timestamp
    }));
  }

  private async calculateSegmentSentiments(bar: MarketSentimentBar, sourceData: SourceData[]): Promise<SegmentSentiment[]> {
    await this.delay(100);
    
    // Mock segment sentiments for different market segments
    return [
      {
        segmentId: 'tech_sector',
        segmentName: 'Technology',
        segmentType: 'sector',
        sentiment: 0.25,
        confidence: 0.82,
        marketData: {
          currentPrice: 1250.0,
          dayChange: 15.5,
          dayChangePercent: 1.26,
          volume: 2500000,
          marketCap: 125000000000
        },
        performance: {
          performance1D: 1.26,
          performance1W: 3.8,
          performance1M: 8.2,
          performance3M: 15.6,
          performance1Y: 28.4
        },
        sentimentDrivers: [
          {
            driverId: 'ai_earnings',
            description: 'Strong AI-related earnings',
            impact: 0.4,
            confidence: 0.9,
            category: 'earnings'
          }
        ]
      },
      {
        segmentId: 'financials_sector',
        segmentName: 'Financials',
        segmentType: 'sector',
        sentiment: 0.12,
        confidence: 0.75,
        marketData: {
          currentPrice: 890.0,
          dayChange: 5.2,
          dayChangePercent: 0.59,
          volume: 1800000,
          marketCap: 89000000000
        },
        performance: {
          performance1D: 0.59,
          performance1W: 2.1,
          performance1M: 4.5,
          performance3M: 9.8,
          performance1Y: 18.7
        },
        sentimentDrivers: [
          {
            driverId: 'rate_outlook',
            description: 'Positive interest rate outlook',
            impact: 0.25,
            confidence: 0.75,
            category: 'economic_data'
          }
        ]
      }
    ];
  }

  private async performTemporalAnalysis(bar: MarketSentimentBar, sourceData: SourceData[]): Promise<TemporalSentimentAnalysis> {
    await this.delay(80);
    
    return {
      intraday: {
        openingSentiment: 0.05,
        currentSentiment: 0.18,
        highSentiment: 0.22,
        lowSentiment: 0.02,
        averageSentiment: 0.12,
        volatility: 0.08
      },
      daily: {
        dailyChange: 0.13,
        dailyVolatility: 0.15,
        trendStrength: 0.68,
        reversal: false
      },
      weekly: {
        weeklyTrend: 'bullish',
        weeklyChange: 0.25,
        consistencyScore: 0.72
      },
      monthly: {
        monthlyTrend: 'bullish',
        monthlyChange: 0.45,
        seasonalAdjustment: 0.02
      },
      trendAnalysis: {
        shortTermTrend: 'bullish',
        mediumTermTrend: 'bullish',
        longTermTrend: 'neutral',
        trendStrength: 0.75,
        trendAge: 6,
        reversalProbability: 0.25
      },
      volatilityAnalysis: {
        currentVolatility: 0.12,
        averageVolatility: 0.15,
        volatilityTrend: 'bearish',
        volatilityPercentile: 0.35
      },
      seasonalPatterns: [
        {
          pattern: 'End of quarter rally',
          strength: 0.68,
          confidence: 0.82,
          description: 'Historical tendency for positive sentiment at quarter end'
        }
      ],
      correlationAnalysis: {
        marketCorrelation: 0.85,
        sectorCorrelations: {
          'technology': 0.78,
          'financials': 0.65,
          'healthcare': 0.52
        },
        assetCorrelations: {
          'ASX200': 0.89,
          'S&P500': 0.72,
          'NASDAQ': 0.81
        }
      }
    };
  }

  private calculateQualityMetrics(sourceData: SourceData[]): SentimentQualityMetrics {
    const totalDataPoints = sourceData.reduce((sum, data) => sum + data.dataPoints, 0);
    const avgFreshness = sourceData.reduce((sum, data) => sum + data.freshness, 0) / sourceData.length;
    const avgReliability = sourceData.reduce((sum, data) => sum + data.reliability, 0) / sourceData.length;
    
    return {
      overallQuality: 0.82,
      dataCompleteness: Math.min(sourceData.length / 5, 1), // Assuming 5 ideal sources
      dataFreshness: Math.max(0, 1 - (avgFreshness / 24)), // Fresher is better
      dataReliability: avgReliability / 100,
      sourceDiversity: Math.min(sourceData.length / 3, 1),
      sourceReliability: avgReliability / 100,
      sampleSize: totalDataPoints,
      confidenceInterval: {
        level: 95,
        lowerBound: 0.12,
        upperBound: 0.24
      },
      standardError: 0.03,
      validationScore: 0.85,
      crossValidationScore: 0.78,
      biasAssessment: {
        sourceBias: 0.15,
        temporalBias: 0.08,
        selectionBias: 0.12,
        overallBias: 0.12
      }
    };
  }

  private aggregateOverallSentiment(componentSentiments: ComponentSentiment[], config: any): number {
    const weightedSum = componentSentiments.reduce((sum, component) => {
      return sum + (component.sentiment * component.weight);
    }, 0);

    const totalWeight = componentSentiments.reduce((sum, component) => sum + component.weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateConfidence(componentSentiments: ComponentSentiment[], qualityMetrics: SentimentQualityMetrics): number {
    const avgComponentConfidence = componentSentiments.reduce((sum, comp) => sum + comp.confidence, 0) / componentSentiments.length;
    const qualityFactor = qualityMetrics.overallQuality;
    
    return (avgComponentConfidence + qualityFactor) / 2;
  }

  private determineSentimentGrade(sentiment: number): SentimentGrade {
    if (sentiment >= 0.6) return 'Very Positive';
    if (sentiment >= 0.3) return 'Positive';
    if (sentiment >= 0.1) return 'Slightly Positive';
    if (sentiment >= -0.1) return 'Neutral';
    if (sentiment >= -0.3) return 'Slightly Negative';
    if (sentiment >= -0.6) return 'Negative';
    return 'Very Negative';
  }

  // Data Source Management
  public async addDataSource(barId: string, source: SentimentDataSource): Promise<void> {
    const bar = this.bars.get(barId);
    if (!bar) {
      throw new Error(`Bar with id ${barId} not found`);
    }

    bar.dataSources.push(source);
    this.bars.set(barId, bar);
    
    // Test connection
    await this.testSourceConnection(source);
  }

  public async removeDataSource(barId: string, sourceId: string): Promise<void> {
    const bar = this.bars.get(barId);
    if (!bar) {
      throw new Error(`Bar with id ${barId} not found`);
    }

    bar.dataSources = bar.dataSources.filter(source => source.sourceId !== sourceId);
    this.bars.set(barId, bar);
  }

  public async updateDataSource(barId: string, sourceId: string, updates: Partial<SentimentDataSource>): Promise<void> {
    const bar = this.bars.get(barId);
    if (!bar) {
      throw new Error(`Bar with id ${barId} not found`);
    }

    const sourceIndex = bar.dataSources.findIndex(source => source.sourceId === sourceId);
    if (sourceIndex === -1) {
      throw new Error(`Data source with id ${sourceId} not found`);
    }

    bar.dataSources[sourceIndex] = { ...bar.dataSources[sourceIndex], ...updates };
    this.bars.set(barId, bar);
  }

  // Historical Data
  public getSentimentHistory(barId: string, timeRange?: TimeRange): SentimentHistory[] {
    const history = this.sentimentHistory.get(barId) || [];
    
    if (!timeRange) {
      return history;
    }

    const now = new Date();
    let startDate: Date;

    switch (timeRange.period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '4h':
        startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        break;
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = timeRange.startDate || new Date(0);
    }

    const endDate = timeRange.endDate || now;

    return history.filter(item => 
      item.recordedAt >= startDate && item.recordedAt <= endDate
    );
  }

  // Utility Methods
  private isSentimentFresh(sentiment: SentimentReading, bar: MarketSentimentBar): boolean {
    const maxAge = this.getRefreshIntervalMs(bar.sentimentConfig.refreshInterval);
    const age = Date.now() - sentiment.timestamp.getTime();
    return age < maxAge;
  }

  private getRefreshIntervalMs(interval: string): number {
    switch (interval) {
      case 'real_time': return 30 * 1000; // 30 seconds
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  private addToHistory(barId: string, sentimentReading: SentimentReading): void {
    const history = this.sentimentHistory.get(barId) || [];
    
    const historyItem: SentimentHistory = {
      id: this.generateId(),
      barId,
      sentimentReading,
      marketContext: this.getCurrentMarketContext(),
      significantEvents: [],
      recordedAt: new Date()
    };

    history.push(historyItem);
    
    // Keep only last 1000 records
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.sentimentHistory.set(barId, history);
  }

  private getCurrentMarketContext(): any {
    return {
      marketConditions: 'bull',
      volatilityLevel: 'normal',
      tradingVolume: 'normal',
      majorEvents: [],
      timeOfDay: this.getTimeOfDay()
    };
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 10) return 'market_open';
    if (hour >= 10 && hour < 15) return 'mid_day';
    if (hour >= 15 && hour < 16) return 'market_close';
    if (hour >= 16 && hour < 20) return 'after_hours';
    return 'pre_market';
  }

  // Real-time Updates
  private startRealtimeUpdates(): void {
    // Start updates for all existing bars
    this.bars.forEach((bar, barId) => {
      this.startBarUpdates(barId);
    });
  }

  private startBarUpdates(barId: string): void {
    const bar = this.bars.get(barId);
    if (!bar || !bar.isActive) return;

    const interval = this.getRefreshIntervalMs(bar.sentimentConfig.refreshInterval);
    
    const updateInterval = setInterval(async () => {
      try {
        await this.getCurrentSentiment(barId);
      } catch (error) {
        console.error(`Failed to update sentiment for bar ${barId}:`, error);
      }
    }, interval);

    this.updateIntervals.set(barId, updateInterval);
  }

  private stopBarUpdates(barId: string): void {
    const interval = this.updateIntervals.get(barId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(barId);
    }
  }

  private restartBarUpdates(barId: string): void {
    this.stopBarUpdates(barId);
    this.startBarUpdates(barId);
  }

  // Mock Data Generation
  private generateMockSourceData(sourceType: SentimentSourceType): any {
    const baseVariance = Math.random() * 0.4 - 0.2; // -0.2 to +0.2
    
    switch (sourceType) {
      case 'news':
        return {
          sentiment: 0.15 + baseVariance,
          confidence: 0.8 + Math.random() * 0.15,
          dataPoints: Math.floor(Math.random() * 100) + 50,
          metadata: { articles: 75, sources: 8 }
        };
      case 'social_media':
        return {
          sentiment: 0.1 + baseVariance,
          confidence: 0.6 + Math.random() * 0.2,
          dataPoints: Math.floor(Math.random() * 1000) + 500,
          metadata: { posts: 1250, platforms: 4 }
        };
      case 'options_flow':
        return {
          sentiment: 0.08 + baseVariance,
          confidence: 0.85 + Math.random() * 0.1,
          dataPoints: Math.floor(Math.random() * 50) + 25,
          metadata: { volume: 125000, putCallRatio: 0.85 }
        };
      case 'vix':
        return {
          sentiment: -0.05 + baseVariance, // VIX is inverse
          confidence: 0.95,
          dataPoints: 1,
          metadata: { currentVix: 18.5, change: -0.8 }
        };
      case 'bonds':
        return {
          sentiment: 0.03 + baseVariance,
          confidence: 0.9,
          dataPoints: Math.floor(Math.random() * 20) + 10,
          metadata: { yield10y: 4.25, spread: 0.15 }
        };
      default:
        return {
          sentiment: baseVariance,
          confidence: 0.7,
          dataPoints: Math.floor(Math.random() * 50) + 25,
          metadata: {}
        };
    }
  }

  private getSourceDisplayName(sourceType: SentimentSourceType): string {
    const names = {
      'news': 'Market News',
      'social_media': 'Social Media',
      'institutional': 'Institutional Flow',
      'options_flow': 'Options Activity',
      'vix': 'Volatility Index',
      'bonds': 'Bond Market',
      'currencies': 'Currency Markets',
      'commodities': 'Commodities',
      'analyst_ratings': 'Analyst Ratings',
      'earnings': 'Earnings Data',
      'economic_data': 'Economic Indicators'
    };
    return names[sourceType] || sourceType;
  }

  private async testSourceConnection(source: SentimentDataSource): Promise<void> {
    // Mock connection test
    await this.delay(500);
    // In real implementation, would test actual connection
  }

  private createInitialSentimentReading(): SentimentReading {
    return {
      id: this.generateId(),
      overallSentiment: 0.0,
      sentimentGrade: 'Neutral',
      confidence: 0.5,
      componentSentiments: [],
      sourceBreakdown: [],
      segmentSentiments: [],
      temporalAnalysis: {} as TemporalSentimentAnalysis,
      qualityMetrics: {} as SentimentQualityMetrics,
      timestamp: new Date(),
      dataAsOfTime: new Date(),
      calculationMethod: 'weighted_average',
      sampleSize: 0
    };
  }

  private generateId(): string {
    return `sentiment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    return 'user_123';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock Data Creation
  private createMockBars(): void {
    const mockBar = this.createMockBar();
    this.bars.set(mockBar.id, mockBar);
  }

  private createMockBar(): MarketSentimentBar {
    const barId = this.generateId();
    
    return {
      id: barId,
      userId: 'user_123',
      barName: 'ASX Market Sentiment',
      description: 'Real-time sentiment tracking for Australian equity markets',
      sentimentConfig: {
        scope: {
          marketScope: {
            exchanges: ['ASX'],
            indices: ['ASX200', 'ASX300'],
            assetClasses: ['equity']
          },
          assetScope: {
            symbols: [],
            excludeSymbols: [],
            marketCapRange: { min: 100000000, max: 1000000000000 },
            volumeThreshold: 100000
          },
          sectorScope: [],
          geographicScope: {
            countries: ['AU'],
            regions: ['APAC'],
            excludeCountries: []
          },
          temporalScope: {
            startTime: '09:00',
            endTime: '16:00',
            timezone: 'Australia/Sydney',
            includePremiumHours: true
          },
          customFilters: []
        },
        enabledSources: ['news', 'options_flow', 'vix', 'bonds'],
        aggregationMethod: 'weighted_average',
        aggregationWindow: '1h',
        refreshInterval: '5m',
        sourceWeights: {
          'news': 0.3,
          'social_media': 0.2,
          'institutional': 0.2,
          'options_flow': 0.25,
          'vix': 0.15,
          'bonds': 0.1,
          'currencies': 0.05,
          'commodities': 0.05,
          'analyst_ratings': 0.1,
          'earnings': 0.15,
          'economic_data': 0.2
        },
        filters: [],
        jurisdiction: 'AU',
        marketHours: {
          timezone: 'Australia/Sydney',
          marketOpen: '10:00',
          marketClose: '16:00',
          extendedHours: true,
          weekendTracking: false
        },
        qualityThresholds: [],
        processingConfig: {
          nlpConfig: {
            sentimentModel: 'finbert',
            languageSupport: ['en'],
            entityRecognition: true,
            topicModeling: true,
            keywordExtraction: true
          },
          filterConfig: {
            spamFilter: true,
            relevanceThreshold: 0.7,
            languageFilter: ['en'],
            sourceReliabilityThreshold: 0.6
          },
          normalizationConfig: {
            method: 'min_max',
            range: [-1, 1]
          },
          deduplicationConfig: {
            enabled: true,
            similarityThreshold: 0.8,
            timeWindow: 60
          }
        }
      },
      currentSentiment: this.createInitialSentimentReading(),
      sentimentHistory: [],
      dataSources: this.createMockDataSources(),
      visualizationConfig: {
        displayStyle: 'bar',
        barAppearance: {
          height: 40,
          width: 300,
          borderRadius: 8,
          gradient: true,
          showLabels: true,
          showValues: true,
          showTrend: true
        },
        colorScheme: {
          veryPositive: '#22c55e',
          positive: '#84cc16',
          slightlyPositive: '#eab308',
          neutral: '#6b7280',
          slightlyNegative: '#f97316',
          negative: '#ef4444',
          veryNegative: '#dc2626',
          background: '#ffffff',
          text: '#1f2937',
          border: '#e5e7eb'
        },
        animationConfig: {
          enableAnimations: true,
          transitionDuration: 300,
          easing: 'ease-in-out',
          updateAnimation: 'smooth'
        },
        layoutConfig: {
          orientation: 'horizontal',
          alignment: 'center',
          spacing: 8,
          padding: 16
        },
        interactiveElements: [],
        responsiveConfig: {
          breakpoints: {},
          adaptiveScaling: true,
          mobileOptimized: true
        },
        accessibilityConfig: {
          highContrast: false,
          screenReaderSupport: true,
          keyboardNavigation: true,
          alternativeText: true
        }
      },
      alertConfig: {
        enableAlerts: true,
        thresholdAlerts: [
          {
            name: 'Very Positive Sentiment',
            threshold: 0.6,
            condition: 'above',
            enabled: true,
            priority: 'medium',
            cooldownPeriod: 30
          }
        ],
        trendAlerts: [],
        volatilityAlerts: [],
        sourceAlerts: [],
        notificationConfig: {
          email: true,
          push: true,
          slack: false,
          webhook: false
        },
        alertHistory: []
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  private createMockDataSources(): SentimentDataSource[] {
    return [
      {
        sourceId: 'reuters_au',
        sourceName: 'Reuters Australia',
        sourceType: 'news',
        connectionConfig: {
          endpoint: 'https://api.reuters.com/v1/news',
          authentication: {
            type: 'api_key',
            credentials: { apiKey: 'mock_key' }
          },
          rateLimit: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            burstLimit: 10
          },
          retryConfig: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
          },
          timeout: 5000
        },
        dataFlow: {
          dataFormat: 'json',
          fieldMapping: {
            'headline': 'title',
            'body': 'content',
            'publishedAt': 'timestamp'
          },
          transformations: [],
          validationRules: []
        },
        processingConfig: {} as any,
        qualityMetrics: {
          reliability: 95,
          freshness: 0.8,
          coverage: 0.9,
          accuracy: 0.92
        },
        status: 'active',
        isEnabled: true,
        performanceMetrics: {
          averageLatency: 250,
          successRate: 0.98,
          errorRate: 0.02,
          uptimePercentage: 99.5,
          lastResponseTime: 180,
          dataFreshness: 0.9
        },
        jurisdiction: 'AU',
        marketCoverage: {
          exchanges: ['ASX'],
          assetClasses: ['equity', 'bond'],
          sectors: ['all'],
          marketCap: ['large', 'mid', 'small']
        },
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastSuccessfulUpdate: new Date()
      }
    ];
  }
}

// Supporting Types
interface SourceData {
  sourceId: string;
  sourceType: SentimentSourceType;
  rawSentiment: number;
  confidence: number;
  dataPoints: number;
  freshness: number;
  reliability: number;
  timestamp: Date;
  metadata: Record<string, any>;
} 