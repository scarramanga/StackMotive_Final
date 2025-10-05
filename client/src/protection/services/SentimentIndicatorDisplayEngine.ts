// Block 39: Sentiment Indicator Display - Engine
// Core engine for sentiment indicator processing and display management

import {
  SentimentIndicatorDisplay,
  SentimentData,
  SentimentComponent,
  SentimentFactor,
  SourceSentimentData,
  SentimentTrend,
  SentimentHistoryPoint,
  SentimentDataSource,
  IndicatorConfig,
  DisplaySettings,
  AlertSettings,
  AlertThreshold,
  DataQuality,
  SentimentPrediction,
  PerformanceMetrics,
  SentimentIndicatorError,
  SentimentLabel,
  TrendDirection,
  ComponentType,
  SourceType,
  AggregationMethod,
  WeightingStrategy
} from '../types/sentimentIndicatorDisplay';

export class SentimentIndicatorDisplayEngine {
  private static instance: SentimentIndicatorDisplayEngine;
  private displays: Map<string, SentimentIndicatorDisplay> = new Map();
  private realtimeData: Map<string, SentimentData> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dataConnections: Map<string, AbortController> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private performanceMonitor: Map<string, PerformanceMetrics> = new Map();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): SentimentIndicatorDisplayEngine {
    if (!SentimentIndicatorDisplayEngine.instance) {
      SentimentIndicatorDisplayEngine.instance = new SentimentIndicatorDisplayEngine();
    }
    return SentimentIndicatorDisplayEngine.instance;
  }

  private initializeEngine(): void {
    this.startPerformanceMonitoring();
    console.log('Sentiment Indicator Display Engine initialized');
  }

  // Display Management
  public createDisplay(
    userId: string,
    config: IndicatorConfig,
    displaySettings: DisplaySettings,
    alertSettings?: Partial<AlertSettings>
  ): SentimentIndicatorDisplay {
    const display: SentimentIndicatorDisplay = {
      id: this.generateId(),
      userId,
      config,
      currentSentiment: this.createInitialSentimentData(),
      displaySettings,
      alertSettings: this.createDefaultAlertSettings(alertSettings),
      sentimentHistory: [],
      isActive: true,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRefresh: new Date(),
      performance: this.createInitialPerformanceMetrics()
    };

    this.displays.set(display.id, display);
    this.startRealTimeUpdates(display.id);
    
    this.emit('displayCreated', display);
    return display;
  }

  public getDisplay(id: string): SentimentIndicatorDisplay | undefined {
    return this.displays.get(id);
  }

  public getAllDisplays(): SentimentIndicatorDisplay[] {
    return Array.from(this.displays.values());
  }

  public getDisplaysByUser(userId: string): SentimentIndicatorDisplay[] {
    return Array.from(this.displays.values()).filter(d => d.userId === userId);
  }

  public updateDisplay(id: string, updates: Partial<SentimentIndicatorDisplay>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedDisplay = {
      ...display,
      ...updates,
      updatedAt: new Date()
    };

    this.displays.set(id, updatedDisplay);
    this.emit('displayUpdated', updatedDisplay);
    
    return updatedDisplay;
  }

  public deleteDisplay(id: string): boolean {
    const display = this.displays.get(id);
    if (!display) {
      return false;
    }

    // Stop real-time updates
    this.stopRealTimeUpdates(id);
    
    // Clean up data
    this.realtimeData.delete(id);
    this.performanceMonitor.delete(id);
    
    const success = this.displays.delete(id);
    if (success) {
      this.emit('displayDeleted', { id });
    }
    
    return success;
  }

  // Configuration Management
  public updateConfig(id: string, config: Partial<IndicatorConfig>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedConfig = { ...display.config, ...config };
    const updatedDisplay = this.updateDisplay(id, { config: updatedConfig });

    // Restart real-time updates if interval changed
    if (config.updateInterval && config.updateInterval !== display.config.updateInterval) {
      this.restartRealTimeUpdates(id);
    }

    return updatedDisplay;
  }

  public updateDisplaySettings(id: string, settings: Partial<DisplaySettings>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedSettings = { ...display.displaySettings, ...settings };
    return this.updateDisplay(id, { displaySettings: updatedSettings });
  }

  public updateAlertSettings(id: string, settings: Partial<AlertSettings>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedSettings = { ...display.alertSettings, ...settings };
    return this.updateDisplay(id, { alertSettings: updatedSettings });
  }

  // Sentiment Data Processing
  public updateSentimentData(id: string): Promise<SentimentData> {
    return new Promise(async (resolve, reject) => {
      try {
        const display = this.displays.get(id);
        if (!display) {
          throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
        }

        const startTime = Date.now();
        
        // Fetch data from all sources
        const sourceData = await this.fetchSourceData(display.config.dataSources);
        
        // Process and aggregate sentiment
        const sentimentData = await this.processSentimentData(sourceData, display.config);
        
        // Update quality metrics
        sentimentData.quality = this.calculateDataQuality(sourceData);
        
        // Calculate trend
        sentimentData.trend = this.calculateTrend(id, sentimentData);
        
        // Store data
        this.realtimeData.set(id, sentimentData);
        
        // Update display
        this.updateDisplay(id, { 
          currentSentiment: sentimentData,
          lastRefresh: new Date()
        });
        
        // Add to history
        this.addToHistory(id, sentimentData);
        
        // Check alerts
        this.checkAlerts(id, sentimentData);
        
        // Update performance metrics
        this.updatePerformanceMetrics(id, Date.now() - startTime);
        
        this.emit('sentimentUpdated', { displayId: id, sentiment: sentimentData });
        resolve(sentimentData);
        
      } catch (error) {
        this.emit('sentimentUpdateFailed', { displayId: id, error });
        reject(error);
      }
    });
  }

  public getCurrentSentiment(id: string): SentimentData | undefined {
    return this.realtimeData.get(id);
  }

  public getSentimentHistory(id: string, limit?: number): SentimentHistoryPoint[] {
    const display = this.displays.get(id);
    if (!display) {
      return [];
    }

    let history = display.sentimentHistory;
    if (limit) {
      history = history.slice(-limit);
    }

    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Data Source Management
  public addDataSource(id: string, source: SentimentDataSource): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedSources = [...display.config.dataSources, source];
    return this.updateConfig(id, { dataSources: updatedSources });
  }

  public removeDataSource(id: string, sourceId: string): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedSources = display.config.dataSources.filter(s => s.id !== sourceId);
    return this.updateConfig(id, { dataSources: updatedSources });
  }

  public updateDataSource(id: string, sourceId: string, updates: Partial<SentimentDataSource>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedSources = display.config.dataSources.map(source => 
      source.id === sourceId ? { ...source, ...updates } : source
    );
    
    return this.updateConfig(id, { dataSources: updatedSources });
  }

  // Alert Management
  public addAlertThreshold(id: string, threshold: AlertThreshold): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedThresholds = [...display.alertSettings.thresholds, threshold];
    return this.updateAlertSettings(id, { thresholds: updatedThresholds });
  }

  public removeAlertThreshold(id: string, thresholdId: string): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedThresholds = display.alertSettings.thresholds.filter(t => t.id !== thresholdId);
    return this.updateAlertSettings(id, { thresholds: updatedThresholds });
  }

  public updateAlertThreshold(id: string, thresholdId: string, updates: Partial<AlertThreshold>): SentimentIndicatorDisplay {
    const display = this.displays.get(id);
    if (!display) {
      throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
    }

    const updatedThresholds = display.alertSettings.thresholds.map(threshold => 
      threshold.id === thresholdId ? { ...threshold, ...updates } : threshold
    );
    
    return this.updateAlertSettings(id, { thresholds: updatedThresholds });
  }

  // Prediction and Analysis
  public generatePredictions(id: string, timeHorizons: number[]): Promise<SentimentPrediction[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const display = this.displays.get(id);
        if (!display) {
          throw new SentimentIndicatorError('Display not found', 'DISPLAY_NOT_FOUND', { id });
        }

        const history = this.getSentimentHistory(id, 100);
        const predictions: SentimentPrediction[] = [];

        for (const horizon of timeHorizons) {
          const prediction = await this.predictSentiment(history, horizon);
          predictions.push(prediction);
        }

        resolve(predictions);
      } catch (error) {
        reject(error);
      }
    });
  }

  public analyzePatterns(id: string): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const history = this.getSentimentHistory(id, 200);
        const patterns = this.detectPatterns(history);
        resolve(patterns);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Performance and Monitoring
  public getPerformanceMetrics(id: string): PerformanceMetrics | undefined {
    return this.performanceMonitor.get(id);
  }

  public resetPerformanceMetrics(id: string): void {
    const initialMetrics = this.createInitialPerformanceMetrics();
    this.performanceMonitor.set(id, initialMetrics);
  }

  // Real-time Updates
  private startRealTimeUpdates(id: string): void {
    const display = this.displays.get(id);
    if (!display) {
      return;
    }

    // Clear existing interval
    this.stopRealTimeUpdates(id);

    // Start new interval
    const interval = setInterval(async () => {
      try {
        await this.updateSentimentData(id);
      } catch (error) {
        console.error(`Failed to update sentiment for display ${id}:`, error);
      }
    }, display.config.updateInterval);

    this.updateIntervals.set(id, interval);
  }

  private stopRealTimeUpdates(id: string): void {
    const interval = this.updateIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(id);
    }

    // Stop data connections
    const connection = this.dataConnections.get(id);
    if (connection) {
      connection.abort();
      this.dataConnections.delete(id);
    }
  }

  private restartRealTimeUpdates(id: string): void {
    this.stopRealTimeUpdates(id);
    this.startRealTimeUpdates(id);
  }

  // Data Processing
  private async fetchSourceData(sources: SentimentDataSource[]): Promise<SourceSentimentData[]> {
    const sourceData: SourceSentimentData[] = [];

    for (const source of sources) {
      if (!source.isEnabled || !source.isConnected) {
        continue;
      }

      try {
        const data = await this.fetchFromSource(source);
        sourceData.push(data);
      } catch (error) {
        console.error(`Failed to fetch from source ${source.id}:`, error);
        // Add error data
        sourceData.push(this.createErrorSourceData(source, error));
      }
    }

    return sourceData;
  }

  private async fetchFromSource(source: SentimentDataSource): Promise<SourceSentimentData> {
    // Simulate API call - replace with actual implementation
    const simulatedData: SourceSentimentData = {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      sentiment: (Math.random() - 0.5) * 2, // -1 to 1
      confidence: 0.7 + Math.random() * 0.3, // 0.7 to 1
      weight: source.weight,
      contribution: 0,
      dataPoints: Math.floor(100 + Math.random() * 900),
      freshness: Math.random() * 3600000, // 0 to 1 hour
      reliability: source.reliability,
      isActive: true,
      isConnected: true,
      lastUpdate: new Date(),
      dataQuality: this.generateDataQuality(),
      errors: []
    };

    // Calculate contribution based on sentiment and weight
    simulatedData.contribution = simulatedData.sentiment * simulatedData.weight * simulatedData.confidence;

    return simulatedData;
  }

  private async processSentimentData(sourceData: SourceSentimentData[], config: IndicatorConfig): Promise<SentimentData> {
    // Filter valid sources
    const validSources = sourceData.filter(s => s.isActive && s.errors.length === 0);

    if (validSources.length === 0) {
      throw new SentimentIndicatorError('No valid sources available', 'NO_VALID_SOURCES');
    }

    // Calculate overall sentiment
    const overallSentiment = this.aggregateSentiment(validSources, config.aggregationMethod, config.weightingStrategy);
    
    // Generate components
    const components = this.generateSentimentComponents(validSources);
    
    // Create sentiment data
    const sentimentData: SentimentData = {
      overallSentiment,
      sentimentLabel: this.getSentimentLabel(overallSentiment),
      confidence: this.calculateOverallConfidence(validSources),
      components,
      sourceBreakdown: validSources,
      trend: {
        direction: 'sideways',
        strength: 0,
        confidence: 0,
        shortTermChange: 0,
        mediumTermChange: 0,
        longTermChange: 0,
        momentum: 0,
        acceleration: 0,
        volatility: 0,
        patterns: [],
        predictions: []
      },
      quality: this.generateDataQuality(),
      timestamp: new Date(),
      dataAge: 0
    };

    return sentimentData;
  }

  private aggregateSentiment(sources: SourceSentimentData[], method: AggregationMethod, strategy: WeightingStrategy): number {
    if (sources.length === 0) return 0;

    let totalSentiment = 0;
    let totalWeight = 0;

    for (const source of sources) {
      let weight = 1;

      switch (strategy) {
        case 'confidence':
          weight = source.confidence;
          break;
        case 'reliability':
          weight = source.reliability;
          break;
        case 'recency':
          weight = Math.max(0, 1 - (source.freshness / (24 * 60 * 60 * 1000))); // Decay over 24 hours
          break;
        case 'custom':
          weight = source.weight;
          break;
        case 'equal':
        default:
          weight = 1;
          break;
      }

      totalSentiment += source.sentiment * weight;
      totalWeight += weight;
    }

    switch (method) {
      case 'weighted_average':
        return totalWeight > 0 ? totalSentiment / totalWeight : 0;
      case 'simple_average':
        return sources.reduce((sum, s) => sum + s.sentiment, 0) / sources.length;
      case 'median':
        const sorted = sources.map(s => s.sentiment).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      case 'mode':
        // Simplified mode calculation
        return this.calculateMode(sources.map(s => s.sentiment));
      default:
        return totalWeight > 0 ? totalSentiment / totalWeight : 0;
    }
  }

  private generateSentimentComponents(sources: SourceSentimentData[]): SentimentComponent[] {
    const componentTypes: ComponentType[] = ['news', 'social', 'technical', 'fundamental', 'macro', 'market'];
    const components: SentimentComponent[] = [];

    for (const type of componentTypes) {
      const typeSources = sources.filter(s => this.getComponentTypeForSource(s.sourceType) === type);
      
      if (typeSources.length > 0) {
        const avgSentiment = typeSources.reduce((sum, s) => sum + s.sentiment, 0) / typeSources.length;
        const avgConfidence = typeSources.reduce((sum, s) => sum + s.confidence, 0) / typeSources.length;

        components.push({
          id: this.generateId(),
          name: this.getComponentName(type),
          type,
          sentiment: avgSentiment,
          confidence: avgConfidence,
          weight: 1 / componentTypes.length,
          factors: this.generateSentimentFactors(typeSources),
          trend: this.generateComponentTrend(),
          dataQuality: avgConfidence,
          sampleSize: typeSources.reduce((sum, s) => sum + s.dataPoints, 0),
          lastUpdated: new Date(),
          source: 'aggregated'
        });
      }
    }

    return components;
  }

  private calculateTrend(displayId: string, currentData: SentimentData): SentimentTrend {
    const history = this.getSentimentHistory(displayId, 24); // Last 24 points
    
    if (history.length < 2) {
      return currentData.trend; // Return existing trend if not enough history
    }

    const values = history.map(h => h.sentiment);
    const timestamps = history.map(h => h.timestamp.getTime());

    // Calculate trend direction and strength
    const { slope, correlation } = this.calculateLinearRegression(timestamps, values);
    
    const trend: SentimentTrend = {
      direction: this.getTrendDirection(slope),
      strength: Math.abs(correlation),
      confidence: Math.abs(correlation),
      shortTermChange: this.calculateChange(values, 1),
      mediumTermChange: this.calculateChange(values, 6),
      longTermChange: this.calculateChange(values, 24),
      momentum: this.calculateMomentum(values),
      acceleration: this.calculateAcceleration(values),
      volatility: this.calculateVolatility(values),
      patterns: [],
      predictions: []
    };

    return trend;
  }

  private checkAlerts(displayId: string, sentimentData: SentimentData): void {
    const display = this.displays.get(displayId);
    if (!display || !display.alertSettings.enabledAlerts.length) {
      return;
    }

    for (const threshold of display.alertSettings.thresholds) {
      if (!threshold.isActive) continue;

      const shouldTrigger = this.evaluateThreshold(threshold, sentimentData);
      
      if (shouldTrigger) {
        this.triggerAlert(displayId, threshold, sentimentData);
      }
    }
  }

  private addToHistory(displayId: string, sentimentData: SentimentData): void {
    const display = this.displays.get(displayId);
    if (!display) return;

    const historyPoint: SentimentHistoryPoint = {
      timestamp: sentimentData.timestamp,
      sentiment: sentimentData.overallSentiment,
      confidence: sentimentData.confidence,
      quality: sentimentData.quality.overall,
      dataPoints: sentimentData.sourceBreakdown.reduce((sum, s) => sum + s.dataPoints, 0),
      sources: sentimentData.sourceBreakdown.map(s => s.sourceName)
    };

    const updatedHistory = [...display.sentimentHistory, historyPoint];
    
    // Limit history size for performance
    const maxHistoryPoints = display.displaySettings.performance?.maxHistoryPoints || 1000;
    if (updatedHistory.length > maxHistoryPoints) {
      updatedHistory.splice(0, updatedHistory.length - maxHistoryPoints);
    }

    this.updateDisplay(displayId, { sentimentHistory: updatedHistory });
  }

  // Utility Methods
  private createInitialSentimentData(): SentimentData {
    return {
      overallSentiment: 0,
      sentimentLabel: 'Neutral',
      confidence: 0.5,
      components: [],
      sourceBreakdown: [],
      trend: {
        direction: 'sideways',
        strength: 0,
        confidence: 0,
        shortTermChange: 0,
        mediumTermChange: 0,
        longTermChange: 0,
        momentum: 0,
        acceleration: 0,
        volatility: 0,
        patterns: [],
        predictions: []
      },
      quality: this.generateDataQuality(),
      timestamp: new Date(),
      dataAge: 0
    };
  }

  private createDefaultAlertSettings(settings?: Partial<AlertSettings>): AlertSettings {
    return {
      enabledAlerts: ['sentiment_change', 'threshold_breach'],
      thresholds: [
        {
          id: this.generateId(),
          name: 'High Positive Sentiment',
          description: 'Alert when sentiment exceeds 0.7',
          condition: 'above',
          value: 0.7,
          duration: 300000, // 5 minutes
          severity: 'medium',
          actions: [{ type: 'notify', config: {} }],
          isActive: true,
          triggerCount: 0
        },
        {
          id: this.generateId(),
          name: 'High Negative Sentiment',
          description: 'Alert when sentiment falls below -0.7',
          condition: 'below',
          value: -0.7,
          duration: 300000, // 5 minutes
          severity: 'medium',
          actions: [{ type: 'notify', config: {} }],
          isActive: true,
          triggerCount: 0
        }
      ],
      notifications: {
        enableNotifications: true,
        channels: [],
        preferences: {
          frequency: 'immediate',
          includeDetails: true,
          includeChart: false,
          includeHistory: false
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
          allowCritical: true,
          allowedTypes: ['threshold_breach']
        }
      },
      escalation: {
        enableEscalation: false,
        escalationRules: [],
        escalationDelay: 1800000, // 30 minutes
        maxEscalationLevel: 3
      },
      customRules: [],
      ...settings
    };
  }

  private createInitialPerformanceMetrics(): PerformanceMetrics {
    return {
      averageUpdateTime: 0,
      updateReliability: 1,
      averageDataQuality: 0.8,
      dataCompleteness: 1,
      viewTime: 0,
      interactionCount: 0,
      renderTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      connectionIssues: 0
    };
  }

  private generateDataQuality(): DataQuality {
    return {
      overall: 0.8 + Math.random() * 0.2,
      accuracy: 0.85 + Math.random() * 0.15,
      completeness: 0.9 + Math.random() * 0.1,
      consistency: 0.8 + Math.random() * 0.2,
      timeliness: 0.9 + Math.random() * 0.1,
      relevance: 0.85 + Math.random() * 0.15,
      issues: [],
      recommendations: []
    };
  }

  private getSentimentLabel(sentiment: number): SentimentLabel {
    if (sentiment >= 0.7) return 'Very Positive';
    if (sentiment >= 0.3) return 'Positive';
    if (sentiment >= 0.1) return 'Slightly Positive';
    if (sentiment >= -0.1) return 'Neutral';
    if (sentiment >= -0.3) return 'Slightly Negative';
    if (sentiment >= -0.7) return 'Negative';
    return 'Very Negative';
  }

  private calculateOverallConfidence(sources: SourceSentimentData[]): number {
    if (sources.length === 0) return 0;
    return sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  }

  private getComponentTypeForSource(sourceType: SourceType): ComponentType {
    switch (sourceType) {
      case 'news': return 'news';
      case 'twitter': 
      case 'reddit': 
      case 'forum': return 'social';
      case 'research': return 'fundamental';
      case 'api': return 'technical';
      default: return 'market';
    }
  }

  private getComponentName(type: ComponentType): string {
    switch (type) {
      case 'news': return 'News Sentiment';
      case 'social': return 'Social Media Sentiment';
      case 'technical': return 'Technical Analysis';
      case 'fundamental': return 'Fundamental Analysis';
      case 'macro': return 'Macroeconomic Factors';
      case 'market': return 'Market Sentiment';
      default: return 'Custom Component';
    }
  }

  private generateSentimentFactors(sources: SourceSentimentData[]): SentimentFactor[] {
    // Simplified factor generation
    return sources.map(source => ({
      id: this.generateId(),
      name: `${source.sourceName} Factor`,
      description: `Sentiment factor from ${source.sourceName}`,
      impact: source.sentiment * source.weight,
      confidence: source.confidence,
      weight: source.weight,
      category: 'social',
      duration: source.freshness,
      intensity: Math.abs(source.sentiment),
      source: source.sourceName,
      reliability: source.reliability,
      context: {}
    }));
  }

  private generateComponentTrend(): any {
    return {
      direction: 'sideways' as TrendDirection,
      strength: Math.random() * 0.5,
      duration: Math.random() * 3600000,
      reliability: 0.7 + Math.random() * 0.3
    };
  }

  private calculateLinearRegression(x: number[], y: number[]): { slope: number; correlation: number } {
    const n = x.length;
    if (n < 2) return { slope: 0, correlation: 0 };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope, correlation: isNaN(correlation) ? 0 : correlation };
  }

  private getTrendDirection(slope: number): TrendDirection {
    if (slope > 0.01) return 'up';
    if (slope < -0.01) return 'down';
    return 'sideways';
  }

  private calculateChange(values: number[], periods: number): number {
    if (values.length <= periods) return 0;
    const current = values[values.length - 1];
    const previous = values[values.length - 1 - periods];
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  private calculateMomentum(values: number[]): number {
    if (values.length < 3) return 0;
    const recent = values.slice(-3);
    return recent[2] - recent[0];
  }

  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;
    const recent = values.slice(-3);
    const velocity1 = recent[1] - recent[0];
    const velocity2 = recent[2] - recent[1];
    return velocity2 - velocity1;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateMode(values: number[]): number {
    // Simplified mode calculation with rounding
    const rounded = values.map(v => Math.round(v * 10) / 10);
    const frequency: Record<number, number> = {};
    
    for (const val of rounded) {
      frequency[val] = (frequency[val] || 0) + 1;
    }
    
    let maxCount = 0;
    let mode = 0;
    
    for (const [val, count] of Object.entries(frequency)) {
      if (count > maxCount) {
        maxCount = count;
        mode = parseFloat(val);
      }
    }
    
    return mode;
  }

  private evaluateThreshold(threshold: AlertThreshold, sentimentData: SentimentData): boolean {
    const value = sentimentData.overallSentiment;
    
    switch (threshold.condition) {
      case 'above':
        return value > threshold.value;
      case 'below':
        return value < threshold.value;
      case 'crosses_above':
        // Would need historical comparison
        return value > threshold.value;
      case 'crosses_below':
        // Would need historical comparison
        return value < threshold.value;
      case 'equals':
        return Math.abs(value - threshold.value) < 0.01;
      case 'change_exceeds':
        // Would need change calculation
        return Math.abs(value) > threshold.value;
      default:
        return false;
    }
  }

  private triggerAlert(displayId: string, threshold: AlertThreshold, sentimentData: SentimentData): void {
    threshold.lastTriggered = new Date();
    threshold.triggerCount++;
    
    this.emit('alertTriggered', {
      displayId,
      threshold,
      sentimentData,
      timestamp: new Date()
    });
  }

  private async predictSentiment(history: SentimentHistoryPoint[], timeHorizon: number): Promise<SentimentPrediction> {
    // Simplified prediction using linear regression
    const values = history.map(h => h.sentiment);
    const timestamps = history.map(h => h.timestamp.getTime());
    
    const { slope } = this.calculateLinearRegression(timestamps, values);
    const lastValue = values[values.length - 1] || 0;
    const predictedSentiment = Math.max(-1, Math.min(1, lastValue + slope * timeHorizon));
    
    return {
      timeHorizon,
      predictedSentiment,
      confidence: 0.6, // Simplified confidence
      scenarios: [],
      riskFactors: [],
      modelType: 'linear_regression',
      modelVersion: '1.0.0',
      trainedOn: new Date()
    };
  }

  private detectPatterns(history: SentimentHistoryPoint[]): any[] {
    // Simplified pattern detection
    return [];
  }

  private createErrorSourceData(source: SentimentDataSource, error: any): SourceSentimentData {
    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      sentiment: 0,
      confidence: 0,
      weight: 0,
      contribution: 0,
      dataPoints: 0,
      freshness: Date.now(),
      reliability: 0,
      isActive: false,
      isConnected: false,
      lastUpdate: new Date(),
      dataQuality: {
        overall: 0,
        accuracy: 0,
        completeness: 0,
        consistency: 0,
        timeliness: 0,
        relevance: 0,
        issues: [],
        recommendations: []
      },
      errors: [{
        type: 'connection_error',
        message: error.message || 'Unknown error',
        timestamp: new Date(),
        severity: 'error',
        autoRetry: true,
        resolved: false
      }]
    };
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      for (const [displayId, metrics] of this.performanceMonitor) {
        // Update performance metrics periodically
        this.updatePerformanceMetrics(displayId, 0);
      }
    }, 60000); // Update every minute
  }

  private updatePerformanceMetrics(displayId: string, updateTime: number): void {
    const current = this.performanceMonitor.get(displayId) || this.createInitialPerformanceMetrics();
    
    // Update metrics
    current.averageUpdateTime = (current.averageUpdateTime + updateTime) / 2;
    current.viewTime += 1000; // Increment view time
    
    this.performanceMonitor.set(displayId, current);
  }

  // Event Management
  public on(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  // Utility
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public destroy(): void {
    // Stop all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    
    // Abort all connections
    this.dataConnections.forEach(connection => connection.abort());
    this.dataConnections.clear();
    
    // Clear data
    this.displays.clear();
    this.realtimeData.clear();
    this.performanceMonitor.clear();
    this.eventHandlers.clear();
  }
} 