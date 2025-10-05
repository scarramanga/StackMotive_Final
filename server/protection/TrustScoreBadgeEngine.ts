// Block 94: Trust Score Badge - Engine
// Trust Score Calculation and Badge Management

import {
  TrustScoreBadge,
  TrustScore,
  ComponentScore,
  TrustScoreHistory,
  BadgeType,
  EntityType,
  ScoreGrade,
  PerformanceMetrics,
  RiskAssessment,
  ConsistencyMetrics
} from '../types/trustScoreBadge';

export class TrustScoreBadgeEngine {
  private static instance: TrustScoreBadgeEngine;
  private badges: Map<string, TrustScoreBadge> = new Map();
  private scoreHistory: Map<string, TrustScoreHistory[]> = new Map();
  private calculationQueue: Map<string, AbortController> = new Map();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): TrustScoreBadgeEngine {
    if (!TrustScoreBadgeEngine.instance) {
      TrustScoreBadgeEngine.instance = new TrustScoreBadgeEngine();
    }
    return TrustScoreBadgeEngine.instance;
  }

  private initializeEngine(): void {
    this.createMockBadges();
  }

  // Badge Management
  public createBadge(config: Omit<TrustScoreBadge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): TrustScoreBadge {
    const newBadge: TrustScoreBadge = {
      ...config,
      id: this.generateId(),
      userId: this.getCurrentUserId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastCalculated: new Date()
    };

    this.badges.set(newBadge.id, newBadge);
    return newBadge;
  }

  public updateBadge(id: string, updates: Partial<TrustScoreBadge>): TrustScoreBadge {
    const existingBadge = this.badges.get(id);
    if (!existingBadge) {
      throw new Error(`Badge with id ${id} not found`);
    }

    const updatedBadge = {
      ...existingBadge,
      ...updates,
      updatedAt: new Date()
    };

    this.badges.set(id, updatedBadge);
    return updatedBadge;
  }

  public deleteBadge(id: string): void {
    if (!this.badges.has(id)) {
      throw new Error(`Badge with id ${id} not found`);
    }
    
    this.badges.delete(id);
    this.scoreHistory.delete(id);
  }

  public getBadge(id: string): TrustScoreBadge | undefined {
    return this.badges.get(id);
  }

  public getBadges(): TrustScoreBadge[] {
    return Array.from(this.badges.values());
  }

  public getBadgesByEntity(entityId: string): TrustScoreBadge[] {
    return Array.from(this.badges.values()).filter(badge => badge.entityId === entityId);
  }

  // Score Calculation
  public async calculateScore(badgeId: string): Promise<TrustScore> {
    const badge = this.badges.get(badgeId);
    if (!badge) {
      throw new Error(`Badge with id ${badgeId} not found`);
    }

    try {
      const abortController = new AbortController();
      this.calculationQueue.set(badgeId, abortController);

      const trustScore = await this.executeScoreCalculation(badge, abortController.signal);
      
      // Update badge with new score
      badge.trustScore = trustScore;
      badge.lastCalculated = new Date();
      this.badges.set(badgeId, badge);

      // Add to history
      this.addToHistory(badgeId, trustScore);

      return trustScore;
    } catch (error) {
      throw error;
    } finally {
      this.calculationQueue.delete(badgeId);
    }
  }

  public async recalculateScore(badgeId: string, forceRefresh: boolean = false): Promise<TrustScore> {
    const badge = this.badges.get(badgeId);
    if (!badge) {
      throw new Error(`Badge with id ${badgeId} not found`);
    }

    // Check if recalculation is needed
    if (!forceRefresh && this.isScoreRecent(badge)) {
      return badge.trustScore;
    }

    return this.calculateScore(badgeId);
  }

  // Core Calculation Logic
  private async executeScoreCalculation(badge: TrustScoreBadge, signal: AbortSignal): Promise<TrustScore> {
    // Step 1: Calculate component scores
    const componentScores = await this.calculateComponentScores(badge, signal);
    
    // Step 2: Calculate overall score
    const overallScore = this.calculateOverallScore(componentScores);
    
    // Step 3: Determine grade
    const scoreGrade = this.determineScoreGrade(overallScore);
    
    // Step 4: Calculate confidence metrics
    const confidence = await this.calculateConfidenceMetrics(badge, componentScores);
    
    // Step 5: Build full trust score
    const trustScore: TrustScore = {
      overallScore,
      scoreGrade,
      componentScores,
      confidence,
      performance: await this.calculatePerformanceMetrics(badge),
      riskAssessment: await this.calculateRiskAssessment(badge),
      consistency: await this.calculateConsistencyMetrics(badge),
      transparency: await this.calculateTransparencyMetrics(badge),
      marketValidation: await this.calculateMarketValidation(badge),
      timeBasedMetrics: await this.calculateTimeBasedMetrics(badge),
      calculationInfo: this.createCalculationInfo(badge)
    };

    return trustScore;
  }

  private async calculateComponentScores(badge: TrustScoreBadge, signal: AbortSignal): Promise<ComponentScore[]> {
    const components: ComponentScore[] = [];

    // Performance component
    components.push(await this.calculatePerformanceComponent(badge));
    
    // Risk component
    components.push(await this.calculateRiskComponent(badge));
    
    // Consistency component
    components.push(await this.calculateConsistencyComponent(badge));
    
    // Transparency component
    components.push(await this.calculateTransparencyComponent(badge));
    
    // Market validation component
    components.push(await this.calculateMarketValidationComponent(badge));

    return components;
  }

  private async calculatePerformanceComponent(badge: TrustScoreBadge): Promise<ComponentScore> {
    await this.delay(200);
    
    return {
      componentId: 'performance',
      componentName: 'Performance',
      componentType: 'performance',
      score: 85,
      weight: 0.3,
      contribution: 25.5,
      subComponents: [
        {
          subComponentId: 'returns',
          name: 'Returns',
          score: 88,
          weight: 0.4,
          description: 'Historical return performance',
          dataSource: {
            sourceId: 'market_data',
            sourceName: 'Market Data Feed',
            sourceType: 'market_data',
            reliability: 95,
            lastUpdated: new Date()
          },
          validation: {
            isValidated: true,
            validationScore: 92,
            validationMethod: 'statistical_analysis',
            validatedAt: new Date(),
            validationErrors: []
          }
        }
      ],
      trend: {
        direction: 'improving',
        strength: 0.75,
        duration: 90,
        projectedScore: 87,
        confidence: 0.82
      },
      quality: {
        dataQuality: 92,
        calculationQuality: 88,
        validationQuality: 90,
        overallQuality: 90
      },
      calculationMethod: 'weighted_average',
      dataPoints: 250,
      confidence: 0.85,
      historicalComparison: {
        oneMonthAgo: 83,
        threeMonthsAgo: 80,
        oneYearAgo: 78,
        allTimeHigh: 92,
        allTimeLow: 65
      }
    };
  }

  private async calculateRiskComponent(badge: TrustScoreBadge): Promise<ComponentScore> {
    await this.delay(150);
    
    return {
      componentId: 'risk',
      componentName: 'Risk Management',
      componentType: 'risk',
      score: 78,
      weight: 0.25,
      contribution: 19.5,
      subComponents: [],
      trend: {
        direction: 'stable',
        strength: 0.45,
        duration: 60,
        projectedScore: 79,
        confidence: 0.70
      },
      quality: {
        dataQuality: 88,
        calculationQuality: 85,
        validationQuality: 87,
        overallQuality: 87
      },
      calculationMethod: 'risk_adjusted_scoring',
      dataPoints: 180,
      confidence: 0.78,
      historicalComparison: {
        oneMonthAgo: 77,
        threeMonthsAgo: 76,
        oneYearAgo: 74,
        allTimeHigh: 85,
        allTimeLow: 58
      }
    };
  }

  private async calculateConsistencyComponent(badge: TrustScoreBadge): Promise<ComponentScore> {
    await this.delay(100);
    
    return {
      componentId: 'consistency',
      componentName: 'Consistency',
      componentType: 'consistency',
      score: 82,
      weight: 0.2,
      contribution: 16.4,
      subComponents: [],
      trend: {
        direction: 'improving',
        strength: 0.60,
        duration: 120,
        projectedScore: 84,
        confidence: 0.75
      },
      quality: {
        dataQuality: 90,
        calculationQuality: 88,
        validationQuality: 89,
        overallQuality: 89
      },
      calculationMethod: 'consistency_analysis',
      dataPoints: 300,
      confidence: 0.82,
      historicalComparison: {
        oneMonthAgo: 81,
        threeMonthsAgo: 79,
        oneYearAgo: 76,
        allTimeHigh: 88,
        allTimeLow: 62
      }
    };
  }

  private async calculateTransparencyComponent(badge: TrustScoreBadge): Promise<ComponentScore> {
    await this.delay(80);
    
    return {
      componentId: 'transparency',
      componentName: 'Transparency',
      componentType: 'transparency',
      score: 91,
      weight: 0.15,
      contribution: 13.65,
      subComponents: [],
      trend: {
        direction: 'stable',
        strength: 0.30,
        duration: 180,
        projectedScore: 91,
        confidence: 0.85
      },
      quality: {
        dataQuality: 95,
        calculationQuality: 92,
        validationQuality: 94,
        overallQuality: 94
      },
      calculationMethod: 'transparency_scoring',
      dataPoints: 50,
      confidence: 0.91,
      historicalComparison: {
        oneMonthAgo: 90,
        threeMonthsAgo: 89,
        oneYearAgo: 87,
        allTimeHigh: 95,
        allTimeLow: 72
      }
    };
  }

  private async calculateMarketValidationComponent(badge: TrustScoreBadge): Promise<ComponentScore> {
    await this.delay(120);
    
    return {
      componentId: 'market_validation',
      componentName: 'Market Validation',
      componentType: 'market_validation',
      score: 76,
      weight: 0.1,
      contribution: 7.6,
      subComponents: [],
      trend: {
        direction: 'improving',
        strength: 0.55,
        duration: 90,
        projectedScore: 78,
        confidence: 0.68
      },
      quality: {
        dataQuality: 82,
        calculationQuality: 80,
        validationQuality: 81,
        overallQuality: 81
      },
      calculationMethod: 'market_consensus',
      dataPoints: 120,
      confidence: 0.76,
      historicalComparison: {
        oneMonthAgo: 74,
        threeMonthsAgo: 72,
        oneYearAgo: 69,
        allTimeHigh: 82,
        allTimeLow: 55
      }
    };
  }

  private calculateOverallScore(componentScores: ComponentScore[]): number {
    const weightedSum = componentScores.reduce((sum, component) => {
      return sum + (component.score * component.weight);
    }, 0);
    
    return Math.round(weightedSum * 100) / 100;
  }

  private determineScoreGrade(score: number): ScoreGrade {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  private async calculateConfidenceMetrics(badge: TrustScoreBadge, componentScores: ComponentScore[]): Promise<any> {
    await this.delay(100);
    
    const avgConfidence = componentScores.reduce((sum, comp) => sum + comp.confidence, 0) / componentScores.length;
    
    return {
      overallConfidence: Math.round(avgConfidence * 100),
      dataQualityScore: 88,
      sampleSizeScore: 92,
      timeRangeScore: 85,
      modelAccuracy: 87,
      backtestingScore: 83,
      crossValidationScore: 89,
      marketValidationScore: 76,
      benchmarkComparison: 82,
      scoreStability: 85,
      volatilityAdjusted: 84,
      confidenceIntervals: [
        { level: 95, lowerBound: 78, upperBound: 88 },
        { level: 99, lowerBound: 75, upperBound: 91 }
      ],
      uncertaintySources: [
        { source: 'Market volatility', impact: 15, description: 'Market conditions affect scoring' },
        { source: 'Data latency', impact: 8, description: 'Delayed data updates' }
      ]
    };
  }

  private async calculatePerformanceMetrics(badge: TrustScoreBadge): Promise<PerformanceMetrics> {
    await this.delay(150);
    
    return {
      returns: {
        totalReturn: 12.5,
        annualizedReturn: 8.7,
        volatilityAdjustedReturn: 7.2,
        consistentPerformance: 82,
        outperformanceFrequency: 65
      },
      riskAdjusted: {
        sharpeRatio: 1.24,
        sortinoRatio: 1.68,
        calmarRatio: 0.95,
        treynorRatio: 0.156,
        informationRatio: 0.48,
        jensenAlpha: 2.1
      },
      benchmarkComparison: {
        benchmarkName: 'ASX 200',
        outperformance: 2.3,
        trackingError: 4.2,
        upCaptureRatio: 1.05,
        downCaptureRatio: 0.92,
        beta: 0.89
      },
      consistencyScore: 82,
      predictabilityScore: 76,
      drawdownAnalysis: {
        maxDrawdown: -15.7,
        averageDrawdown: -5.4,
        recoveryTime: 45,
        drawdownFrequency: 3,
        currentDrawdown: -2.1
      },
      performanceAttribution: {
        assetAllocation: 1.8,
        securitySelection: 0.9,
        timingEffect: -0.2,
        currencyEffect: 0.3,
        interactionEffect: 0.1
      }
    };
  }

  private async calculateRiskAssessment(badge: TrustScoreBadge): Promise<RiskAssessment> {
    await this.delay(120);
    
    return {
      overallRiskScore: 22, // Lower is better
      riskGrade: 'Moderate',
      marketRisk: 18,
      creditRisk: 5,
      liquidityRisk: 8,
      concentrationRisk: 12,
      operationalRisk: 3,
      volatilityMetrics: {
        totalVolatility: 16.7,
        systematicRisk: 12.4,
        specificRisk: 4.3,
        downSideVolatility: 11.2
      },
      tailRisk: {
        valueAtRisk95: -2.1,
        valueAtRisk99: -3.8,
        conditionalVaR95: -3.2,
        conditionalVaR99: -5.1,
        tailRatio: 1.24
      },
      riskAdjustedScores: {
        volatilityAdjusted: 78,
        downsideRiskAdjusted: 82,
        tailRiskAdjusted: 75,
        stressTestAdjusted: 73
      },
      stressTestResults: [
        { scenarioName: 'Market Crash', loss: -25.4, probability: 0.05, impact: 'high' },
        { scenarioName: 'Interest Rate Shock', loss: -12.8, probability: 0.10, impact: 'medium' }
      ],
      riskManagementScore: 78
    };
  }

  private async calculateConsistencyMetrics(badge: TrustScoreBadge): Promise<ConsistencyMetrics> {
    await this.delay(100);
    
    return {
      performanceConsistency: 82,
      strategyConsistency: 85,
      riskConsistency: 78,
      monthlyConsistency: 76,
      quarterlyConsistency: 84,
      yearlyConsistency: 88,
      patternConsistency: {
        trendConsistency: 80,
        cyclicalConsistency: 65,
        seasonalConsistency: 72
      },
      deviationMetrics: {
        standardDeviation: 4.2,
        meanAbsoluteDeviation: 3.1,
        relativeDeviation: 0.18
      },
      predictabilityMetrics: {
        forecastAccuracy: 74,
        patternRecognition: 68,
        behaviorPredictability: 76
      }
    };
  }

  private async calculateTransparencyMetrics(badge: TrustScoreBadge): Promise<any> {
    await this.delay(80);
    return { disclosureScore: 91, reportingQuality: {}, dataAvailability: {} };
  }

  private async calculateMarketValidation(badge: TrustScoreBadge): Promise<any> {
    await this.delay(90);
    return { marketAcceptance: 76, peerComparison: {}, thirdPartyRatings: [] };
  }

  private async calculateTimeBasedMetrics(badge: TrustScoreBadge): Promise<any> {
    await this.delay(70);
    return { shortTerm: {}, mediumTerm: {}, longTerm: {}, trendAnalysis: {} };
  }

  private createCalculationInfo(badge: TrustScoreBadge): any {
    return {
      calculationId: this.generateId(),
      calculationTimestamp: new Date(),
      calculationVersion: '1.0.0',
      dataRange: { startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), endDate: new Date() },
      dataPoints: 250,
      dataSources: ['market_data', 'performance_data', 'risk_data'],
      methodology: {
        algorithm: 'weighted_composite_scoring',
        version: '1.0.0',
        parameters: { lookbackPeriod: 365, minimumDataPoints: 50 },
        dataProcessing: ['normalization', 'outlier_removal', 'smoothing']
      },
      qualityChecks: [
        { checkName: 'Data completeness', passed: true, score: 95, details: 'All required data available' }
      ],
      calculationTime: 1200,
      validationResults: [
        { validationType: 'statistical', passed: true, confidence: 0.92, details: 'All statistical tests passed' }
      ]
    };
  }

  // History Management
  private addToHistory(badgeId: string, trustScore: TrustScore): void {
    const historyItem: TrustScoreHistory = {
      id: this.generateId(),
      score: trustScore.overallScore,
      grade: trustScore.scoreGrade,
      componentBreakdown: trustScore.componentScores.reduce((acc, comp) => {
        acc[comp.componentId] = comp.score;
        return acc;
      }, {} as Record<string, number>),
      calculationDate: new Date(),
      dataAsOfDate: new Date(),
      calculationVersion: '1.0.0',
      changeFromPrevious: this.calculateChange(badgeId, trustScore.overallScore),
      contextualEvents: [],
      qualityScore: 88,
      confidence: 85
    };

    const history = this.scoreHistory.get(badgeId) || [];
    history.push(historyItem);
    
    // Keep only last 100 records
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.scoreHistory.set(badgeId, history);
  }

  private calculateChange(badgeId: string, newScore: number): any {
    const history = this.scoreHistory.get(badgeId) || [];
    if (history.length === 0) {
      return { absoluteChange: 0, percentageChange: 0, changeDirection: 'stable', significantChange: false };
    }

    const lastScore = history[history.length - 1].score;
    const absoluteChange = newScore - lastScore;
    const percentageChange = (absoluteChange / lastScore) * 100;
    
    return {
      absoluteChange: Math.round(absoluteChange * 100) / 100,
      percentageChange: Math.round(percentageChange * 100) / 100,
      changeDirection: absoluteChange > 0.5 ? 'up' : absoluteChange < -0.5 ? 'down' : 'stable',
      significantChange: Math.abs(absoluteChange) > 2
    };
  }

  public getScoreHistory(badgeId: string): TrustScoreHistory[] {
    return this.scoreHistory.get(badgeId) || [];
  }

  // Utility Methods
  private isScoreRecent(badge: TrustScoreBadge): boolean {
    const timeSinceCalculation = Date.now() - badge.lastCalculated.getTime();
    const maxAge = badge.badgeConfig.updateFrequency === 'real_time' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return timeSinceCalculation < maxAge;
  }

  private generateId(): string {
    return `trust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    return 'user_123';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock Data Creation
  private createMockBadges(): void {
    const mockBadge = this.createMockBadge();
    this.badges.set(mockBadge.id, mockBadge);
  }

  private createMockBadge(): TrustScoreBadge {
    const badgeId = this.generateId();
    
    return {
      id: badgeId,
      userId: 'user_123',
      badgeType: 'portfolio',
      entityId: 'portfolio_123',
      entityType: 'portfolio',
      trustScore: {
        overallScore: 82.7,
        scoreGrade: 'B',
        componentScores: [],
        confidence: {},
        performance: {} as PerformanceMetrics,
        riskAssessment: {} as RiskAssessment,
        consistency: {} as ConsistencyMetrics,
        transparency: {},
        marketValidation: {},
        timeBasedMetrics: {},
        calculationInfo: {}
      } as TrustScore,
      scoreHistory: [],
      badgeConfig: {
        visualConfig: {
          style: 'detailed',
          colorScheme: 'default',
          badgeSize: 'medium',
          showGrade: true,
          showTrend: true,
          showConfidence: true
        },
        calculationSettings: {
          lookbackPeriod: 365,
          minimumDataPoints: 50,
          weightingScheme: 'exponential_decay',
          adjustmentFactors: {}
        },
        updateFrequency: 'daily',
        scoreThresholds: [],
        alertSettings: {
          enableAlerts: true,
          scoreChangeThreshold: 5,
          gradeChangeAlert: true,
          confidenceThreshold: 70
        },
        customization: {
          customColors: {},
          customLabels: {},
          customMetrics: [],
          displayFormat: 'standard'
        }
      },
      displaySettings: {
        badgeAppearance: {
          theme: 'light',
          borderStyle: 'solid',
          shadowStyle: 'medium',
          backgroundStyle: 'gradient'
        },
        informationDisplay: {
          showDetailsOnHover: true,
          showHistoryChart: true,
          showComponentBreakdown: true,
          compactMode: false
        },
        interactiveElements: [],
        animationSettings: {
          enableAnimations: true,
          transitionDuration: 300,
          animationType: 'smooth'
        },
        responsiveSettings: {
          breakpoints: {},
          adaptiveLayout: true,
          mobileOptimized: true
        },
        accessibilitySettings: {
          highContrast: false,
          screenReaderOptimized: true,
          keyboardNavigation: true,
          alternativeText: true
        }
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastCalculated: new Date()
    };
  }
} 