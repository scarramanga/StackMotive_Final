// Block 77: Risk Exposure Meter - Engine
// Comprehensive Risk Analytics with AU/NZ Market Integration

import {
  RiskExposureMeter,
  PortfolioRiskMetrics,
  RiskContribution,
  ConcentrationRisk,
  AUNZRiskFactors,
  StressTestResult,
  StressTestRequest,
  StressTestResponse,
  RiskAlert,
  RiskAlertType,
  RiskLevel,
  RiskMeterFilter,
  RiskComplianceStatus,
  RiskThreshold,
  TaxAdjustedRiskMetrics,
  RiskTrend
} from '../types/riskExposureMeter';

export class RiskExposureMeterEngine {
  private static instance: RiskExposureMeterEngine;
  private meters: Map<string, RiskExposureMeter> = new Map();
  private lastUpdate = new Date();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): RiskExposureMeterEngine {
    if (!RiskExposureMeterEngine.instance) {
      RiskExposureMeterEngine.instance = new RiskExposureMeterEngine();
    }
    return RiskExposureMeterEngine.instance;
  }

  private initializeEngine(): void {
    // Initialize with mock data
    this.createMockMeters();
  }

  // Core Meter Operations
  public createMeter(config: Omit<RiskExposureMeter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): RiskExposureMeter {
    const newMeter: RiskExposureMeter = {
      ...config,
      id: this.generateId(),
      userId: this.getCurrentUserId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate initial risk metrics
    this.calculateRiskMetrics(newMeter);
    
    this.meters.set(newMeter.id, newMeter);
    return newMeter;
  }

  public updateMeter(id: string, updates: Partial<RiskExposureMeter>): RiskExposureMeter {
    const existingMeter = this.meters.get(id);
    if (!existingMeter) {
      throw new Error(`Risk meter with id ${id} not found`);
    }

    const updatedMeter = {
      ...existingMeter,
      ...updates,
      updatedAt: new Date()
    };

    // Recalculate if portfolio data changed
    if (updates.portfolioValue || updates.riskMetrics) {
      this.calculateRiskMetrics(updatedMeter);
    }

    this.meters.set(id, updatedMeter);
    return updatedMeter;
  }

  public deleteMeter(id: string): void {
    if (!this.meters.has(id)) {
      throw new Error(`Risk meter with id ${id} not found`);
    }
    this.meters.delete(id);
  }

  public getMeter(id: string): RiskExposureMeter | undefined {
    return this.meters.get(id);
  }

  public getMeters(): RiskExposureMeter[] {
    return Array.from(this.meters.values());
  }

  // Risk Calculation Methods
  public calculateRiskMetrics(meter: RiskExposureMeter): PortfolioRiskMetrics {
    const metrics = this.computePortfolioRisk(meter);
    meter.riskMetrics = metrics;
    meter.overallRiskLevel = this.determineRiskLevel(metrics);
    meter.riskScore = this.calculateRiskScore(metrics);
    
    // Update other risk components
    meter.riskContributions = this.calculateRiskContributions(meter);
    meter.concentrationRisks = this.analyzeConcentrationRisk(meter);
    meter.auNzRiskFactors = this.analyzeAUNZRisks(meter);
    
    // Check for alerts
    meter.riskAlerts = this.checkRiskAlerts(meter);
    
    meter.lastCalculated = new Date();
    return metrics;
  }

  private computePortfolioRisk(meter: RiskExposureMeter): PortfolioRiskMetrics {
    // Simulate portfolio risk calculations
    const baseVolatility = this.calculateBaseVolatility(meter.portfolioValue);
    
    return {
      // Volatility metrics
      portfolioVolatility: baseVolatility,
      volatility1M: baseVolatility * 0.8,
      volatility3M: baseVolatility * 0.9,
      volatility1Y: baseVolatility * 1.1,
      
      // Value at Risk
      var1Day95: meter.portfolioValue * 0.025, // 2.5% daily VaR
      var1Day99: meter.portfolioValue * 0.035, // 3.5% daily VaR
      var1Week95: meter.portfolioValue * 0.055,
      var1Month95: meter.portfolioValue * 0.085,
      
      // Expected Shortfall
      cvar1Day95: meter.portfolioValue * 0.032,
      cvar1Day99: meter.portfolioValue * 0.045,
      
      // Drawdown metrics
      maxDrawdown: -12.5,
      currentDrawdown: -2.1,
      averageDrawdown: -4.8,
      drawdownDuration: 15,
      
      // Beta and correlation
      marketBeta: this.calculateMarketBeta(meter.currency),
      benchmarkCorrelation: 0.82,
      
      // Sharpe ratios
      sharpeRatio: 0.75,
      informationRatio: 0.45,
      calmarRatio: 0.68,
      sortinoRatio: 1.12,
      
      // Risk-adjusted returns
      treynorRatio: 8.2,
      jensenAlpha: 1.5,
      
      // Tail risk
      skewness: -0.25,
      kurtosis: 3.8,
      tailRisk: 0.15,
      
      // Liquidity risk
      liquidityScore: 85,
      liquidityRisk: 0.08,
      
      // Currency risk
      currencyExposure: this.calculateCurrencyExposure(meter),
      currencyRisk: 0.12
    };
  }

  private calculateBaseVolatility(portfolioValue: number): number {
    // Simulate volatility based on portfolio size and composition
    const baseVol = 0.15; // 15% base volatility
    const sizeAdjustment = Math.min(portfolioValue / 1000000, 0.02); // Larger portfolios slightly less volatile
    return Math.max(baseVol - sizeAdjustment, 0.08);
  }

  private calculateMarketBeta(currency: string): number {
    const baseBetas = {
      'AUD': 0.95, // Slightly defensive to ASX
      'NZD': 0.88, // More defensive to NZX
      'USD': 1.02  // Slightly aggressive to US markets
    };
    return baseBetas[currency as keyof typeof baseBetas] || 1.0;
  }

  private calculateCurrencyExposure(meter: RiskExposureMeter) {
    // Mock currency exposure based on portfolio currency
    const exposures = [];
    
    if (meter.currency === 'AUD') {
      exposures.push(
        { currency: 'AUD', exposure: 70, hedged: 0, unhedged: 70, currencyVolatility: 0.12, currencyBeta: 1.0 },
        { currency: 'USD', exposure: 20, hedged: 10, unhedged: 10, currencyVolatility: 0.08, currencyBeta: 0.85 },
        { currency: 'NZD', exposure: 10, hedged: 0, unhedged: 10, currencyVolatility: 0.15, currencyBeta: 1.2 }
      );
    } else if (meter.currency === 'NZD') {
      exposures.push(
        { currency: 'NZD', exposure: 60, hedged: 0, unhedged: 60, currencyVolatility: 0.15, currencyBeta: 1.0 },
        { currency: 'AUD', exposure: 25, hedged: 5, unhedged: 20, currencyVolatility: 0.12, currencyBeta: 0.9 },
        { currency: 'USD', exposure: 15, hedged: 10, unhedged: 5, currencyVolatility: 0.08, currencyBeta: 0.75 }
      );
    }
    
    return exposures;
  }

  private determineRiskLevel(metrics: PortfolioRiskMetrics): RiskLevel {
    const volatility = metrics.portfolioVolatility;
    
    if (volatility < 0.08) return 'very_low';
    if (volatility < 0.12) return 'low';
    if (volatility < 0.18) return 'moderate';
    if (volatility < 0.25) return 'high';
    if (volatility < 0.35) return 'very_high';
    return 'extreme';
  }

  private calculateRiskScore(metrics: PortfolioRiskMetrics): number {
    // Composite risk score from 0-100
    const volScore = Math.min(metrics.portfolioVolatility * 300, 50);
    const varScore = Math.min(Math.abs(metrics.var1Day95) / 10000, 25);
    const drawdownScore = Math.min(Math.abs(metrics.maxDrawdown), 15);
    const liquidityScore = Math.max(0, 10 - metrics.liquidityScore / 10);
    
    return Math.min(volScore + varScore + drawdownScore + liquidityScore, 100);
  }

  // Risk Contribution Analysis
  private calculateRiskContributions(meter: RiskExposureMeter): RiskContribution[] {
    // Mock risk contributions by asset class
    return [
      {
        id: `${meter.id}_equities_contrib`,
        contributorType: 'asset_class',
        contributorId: 'equities',
        contributorName: 'Equities',
        volatilityContribution: 0.085,
        varContribution: meter.portfolioValue * 0.018,
        marginalVar: meter.portfolioValue * 0.012,
        componentVar: meter.portfolioValue * 0.015,
        percentageOfRisk: 68,
        percentageOfPortfolio: 60,
        riskEfficiency: 1.2,
        diversificationBenefit: 0.15,
        correlationWithPortfolio: 0.95,
        averageCorrelation: 0.72
      },
      {
        id: `${meter.id}_bonds_contrib`,
        contributorType: 'asset_class',
        contributorId: 'bonds',
        contributorName: 'Bonds',
        volatilityContribution: 0.025,
        varContribution: meter.portfolioValue * 0.005,
        marginalVar: meter.portfolioValue * 0.003,
        componentVar: meter.portfolioValue * 0.004,
        percentageOfRisk: 15,
        percentageOfPortfolio: 25,
        riskEfficiency: 0.8,
        diversificationBenefit: 0.35,
        correlationWithPortfolio: 0.45,
        averageCorrelation: 0.28
      },
      {
        id: `${meter.id}_crypto_contrib`,
        contributorType: 'asset_class',
        contributorId: 'crypto',
        contributorName: 'Cryptocurrency',
        volatilityContribution: 0.045,
        varContribution: meter.portfolioValue * 0.008,
        marginalVar: meter.portfolioValue * 0.015,
        componentVar: meter.portfolioValue * 0.012,
        percentageOfRisk: 22,
        percentageOfPortfolio: 10,
        riskEfficiency: 2.8,
        diversificationBenefit: 0.02,
        correlationWithPortfolio: 0.25,
        averageCorrelation: 0.18
      }
    ];
  }

  // Concentration Risk Analysis
  private analyzeConcentrationRisk(meter: RiskExposureMeter): ConcentrationRisk[] {
    const risks: ConcentrationRisk[] = [];
    
    // Asset class concentration
    risks.push({
      concentrationType: 'asset_class',
      concentrationName: 'Equity Concentration',
      concentration: 0.42, // Herfindahl index
      topNConcentration: 60, // Top asset class
      maxSingleWeight: 60,
      concentrationRisk: 'moderate',
      diversificationScore: 75,
      isOverConcentrated: false,
      potentialLoss: meter.portfolioValue * 0.15,
      liquidationRisk: 0.05
    });
    
    // Geographic concentration (AU/NZ focus)
    if (meter.currency === 'AUD' || meter.currency === 'NZD') {
      risks.push({
        concentrationType: 'geography',
        concentrationName: 'AU/NZ Geographic Concentration',
        concentration: 0.65,
        topNConcentration: 80,
        maxSingleWeight: 80,
        concentrationRisk: 'high',
        diversificationScore: 55,
        isOverConcentrated: true,
        thresholdBreached: {
          thresholdType: 'geography',
          warningLevel: 60,
          limitLevel: 75,
          description: 'Geographic concentration in AU/NZ markets'
        },
        potentialLoss: meter.portfolioValue * 0.25,
        liquidationRisk: 0.08
      });
    }
    
    return risks;
  }

  // AU/NZ Specific Risk Analysis
  private analyzeAUNZRisks(meter: RiskExposureMeter): AUNZRiskFactors {
    const baseFactors: AUNZRiskFactors = {
      audExposure: meter.currency === 'AUD' ? 70 : 25,
      nzDollarExposure: meter.currency === 'NZD' ? 60 : 10,
      foreignCurrencyRisk: 0.12,
      taxRisks: [],
      regulatoryRisks: [],
      miningExposure: 0,
      bankingExposure: 0,
      dairyExposure: 0,
      commodityRisk: {
        ironOreExposure: 0,
        goldExposure: 0,
        coalExposure: 0,
        dairyExposure: 0,
        commodityBeta: 0.85,
        commodityVolatility: 0.28,
        commodityCorrelation: 0.45
      },
      interestRateSensitivity: {
        duration: 3.2,
        dv01: meter.portfolioValue * 0.00015,
        shortRateSensitivity: 0.15,
        mediumRateSensitivity: 0.25,
        longRateSensitivity: 0.10,
        rbaNzrbSensitivity: 0.85
      },
      marketLiquidityRisk: 0.08,
      crossListingRisk: 0.05
    };

    // AU specific risks
    if (meter.currency === 'AUD') {
      baseFactors.asxRisk = {
        asxConcentration: 0.6,
        top20Exposure: 45,
        resourcesSectorRisk: 0.15,
        financialsSectorRisk: 0.25,
        reitExposure: 0.08,
        frankingCreditRisk: 0.12
      };
      baseFactors.miningExposure = 15;
      baseFactors.bankingExposure = 25;
    }

    // NZ specific risks
    if (meter.currency === 'NZD') {
      baseFactors.nzxRisk = {
        nzxConcentration: 0.7,
        top10Exposure: 55,
        dualListingExposure: 0.3,
        economicDependencyRisk: 0.4,
        commodityDependencyRisk: 0.35
      };
      baseFactors.dairyExposure = 12;
    }

    return baseFactors;
  }

  // Stress Testing
  public runStressTest(request: StressTestRequest): StressTestResponse {
    try {
      const meter = this.meters.get(request.meterId);
      if (!meter) {
        return { success: false, errors: ['Meter not found'] };
      }

      const results: StressTestResult[] = [];
      
      // Run predefined stress scenarios
      for (const scenarioId of request.scenarioIds) {
        const scenario = this.getStressScenario(scenarioId, meter.currency);
        const result = this.executeStressTest(meter, scenario);
        results.push(result);
      }

      // Run custom scenarios if provided
      if (request.customScenarios) {
        for (const scenario of request.customScenarios) {
          const result = this.executeStressTest(meter, scenario);
          results.push(result);
        }
      }

      return {
        success: true,
        results,
        aggregateResults: this.calculateAggregateResults(results)
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Stress test failed']
      };
    }
  }

  private executeStressTest(meter: RiskExposureMeter, scenario: any): StressTestResult {
    // Simulate stress test execution
    const baseImpact = meter.portfolioValue * 0.15; // 15% base stress impact
    const scenarioMultiplier = this.getScenarioMultiplier(scenario.scenarioType);
    
    return {
      id: this.generateId(),
      testName: scenario.scenarioName,
      scenario,
      portfolioImpact: baseImpact * scenarioMultiplier,
      percentageImpact: 15 * scenarioMultiplier,
      timeToRecover: Math.round(90 * scenarioMultiplier),
      maxDrawdownInScenario: 20 * scenarioMultiplier,
      assetClassImpacts: [
        {
          assetClass: 'equities',
          baselineValue: meter.portfolioValue * 0.6,
          stressedValue: meter.portfolioValue * 0.6 * (1 - 0.2 * scenarioMultiplier),
          impact: meter.portfolioValue * 0.6 * 0.2 * scenarioMultiplier,
          percentageImpact: 20 * scenarioMultiplier,
          expectedRecoveryTime: 120,
          recoveryProbability: 0.85
        }
      ],
      stressedVaR: meter.riskMetrics.var1Day95 * (1 + scenarioMultiplier),
      stressedVolatility: meter.riskMetrics.portfolioVolatility * (1 + 0.5 * scenarioMultiplier),
      stressedCorrelations: { 'equity_bond': 0.6 },
      liquidityStress: 0.25,
      testDate: new Date(),
      testDuration: 30
    };
  }

  private getScenarioMultiplier(scenarioType: string): number {
    const multipliers: Record<string, number> = {
      'market_crash': 1.5,
      'interest_rate_shock': 0.8,
      'currency_crisis': 1.2,
      'commodity_shock': 1.0,
      'black_swan': 2.0,
      'liquidity_crisis': 1.3
    };
    return multipliers[scenarioType] || 1.0;
  }

  private getStressScenario(scenarioId: string, currency: string) {
    // Return predefined stress scenarios
    const scenarios = {
      'market_crash_2008': {
        scenarioId,
        scenarioName: 'Global Financial Crisis Replay',
        scenarioType: 'market_crash',
        description: '2008-style market crash scenario',
        marketShocks: [
          { marketIndex: currency === 'AUD' ? 'ASX200' : 'NZX50', shockType: 'percentage', shockValue: -45 }
        ],
        scenarioDuration: 180,
        probability: 'low'
      },
      'interest_rate_shock': {
        scenarioId,
        scenarioName: 'Interest Rate Shock',
        scenarioType: 'interest_rate_shock',
        description: 'Rapid interest rate increases',
        marketShocks: [
          { marketIndex: 'CASH_RATE', shockType: 'absolute', shockValue: 3.0 }
        ],
        scenarioDuration: 90,
        probability: 'medium'
      }
    };
    return scenarios[scenarioId as keyof typeof scenarios] || scenarios['market_crash_2008'];
  }

  private calculateAggregateResults(results: StressTestResult[]) {
    if (results.length === 0) return undefined;

    const losses = results.map(r => Math.abs(r.portfolioImpact));
    const worstLoss = Math.max(...losses);
    const averageLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;

    return {
      worstCaseScenario: results[losses.indexOf(worstLoss)].testName,
      worstCaseLoss: worstLoss,
      averageLoss,
      probabilityOfLoss: 0.75,
      averageRecoveryTime: 120,
      probabilityOfRecovery: 0.85,
      riskReductions: []
    };
  }

  // Risk Alerts
  private checkRiskAlerts(meter: RiskExposureMeter): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    
    // Check VaR thresholds
    if (meter.riskMetrics.var1Day95 > meter.portfolioValue * 0.03) {
      alerts.push(this.createAlert(
        'var_breach',
        'warning',
        'Daily VaR Threshold Exceeded',
        `Daily VaR of ${(meter.riskMetrics.var1Day95/1000).toFixed(0)}k exceeds 3% threshold`,
        meter.riskMetrics.var1Day95,
        meter.portfolioValue * 0.03
      ));
    }

    // Check concentration risks
    const geoConcentration = meter.concentrationRisks.find(r => r.concentrationType === 'geography');
    if (geoConcentration?.isOverConcentrated) {
      alerts.push(this.createAlert(
        'concentration_limit',
        'error',
        'Geographic Concentration Alert',
        'Portfolio is over-concentrated in AU/NZ markets',
        geoConcentration.topNConcentration,
        75
      ));
    }

    return alerts;
  }

  private createAlert(
    type: RiskAlertType,
    severity: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    currentValue: number,
    thresholdValue: number
  ): RiskAlert {
    return {
      id: this.generateId(),
      alertType: type,
      severity,
      title,
      message,
      description: message,
      currentValue,
      thresholdValue,
      variance: currentValue - thresholdValue,
      triggeredAt: new Date(),
      recommendedActions: ['Review portfolio allocation', 'Consider rebalancing'],
      autoActions: [],
      status: 'active',
      priority: severity === 'critical' ? 'urgent' : severity === 'error' ? 'high' : 'medium',
      escalationLevel: 0,
      escalationTriggered: false
    };
  }

  // Filtering and Search
  public filterMeters(meters: RiskExposureMeter[], filter: RiskMeterFilter): RiskExposureMeter[] {
    return meters.filter(meter => {
      // Risk level filter
      if (filter.riskLevels && filter.riskLevels.length > 0) {
        if (!filter.riskLevels.includes(meter.overallRiskLevel)) return false;
      }

      // Portfolio value range
      if (filter.portfolioValueRange) {
        const [min, max] = filter.portfolioValueRange;
        if (meter.portfolioValue < min || meter.portfolioValue > max) return false;
      }

      // VaR range
      if (filter.varRange) {
        const [min, max] = filter.varRange;
        const varPct = (meter.riskMetrics.var1Day95 / meter.portfolioValue) * 100;
        if (varPct < min || varPct > max) return false;
      }

      // Search term
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const matchesName = meter.meterName.toLowerCase().includes(searchLower);
        const matchesDesc = meter.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }

  // Utility Methods
  private generateId(): string {
    return `risk_meter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    // TODO: Get from auth context
    return 'user_123';
  }

  // Mock Data Creation
  private createMockMeters(): void {
    const mockMeter = this.createMockMeter();
    this.meters.set(mockMeter.id, mockMeter);
  }

  private createMockMeter(): RiskExposureMeter {
    const mockId = this.generateId();
    
    const mockMeter: RiskExposureMeter = {
      id: mockId,
      userId: 'user_123',
      portfolioId: 'portfolio_123',
      meterName: 'Conservative Growth Risk Monitor',
      description: 'Risk monitoring for balanced AU portfolio',
      portfolioValue: 250000,
      currency: 'AUD',
      overallRiskLevel: 'moderate',
      riskScore: 45,
      riskMetrics: {} as PortfolioRiskMetrics,
      riskContributions: [],
      concentrationRisks: [],
      auNzRiskFactors: {} as AUNZRiskFactors,
      stressTestResults: [],
      riskAlerts: [],
      riskThresholds: this.createDefaultThresholds(),
      riskTrends: [],
      meterConfig: this.createDefaultMeterConfig(),
      riskCompliance: this.createMockCompliance(),
      riskAdjustedMetrics: this.createMockRiskAdjustedMetrics(),
      lastCalculated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate initial metrics
    this.calculateRiskMetrics(mockMeter);
    
    return mockMeter;
  }

  private createDefaultThresholds(): RiskThreshold[] {
    return [
      {
        id: this.generateId(),
        thresholdName: 'Daily VaR Limit',
        thresholdType: 'portfolio_var',
        warningLevel: 2.5,
        limitLevel: 3.0,
        breachLevel: 4.0,
        measurementPeriod: '1D',
        calculationMethod: 'Historical simulation',
        warningActions: [],
        limitActions: [],
        breachActions: [],
        isActive: true,
        lastChecked: new Date(),
        isRegulatory: false
      }
    ];
  }

  private createDefaultMeterConfig() {
    return {
      meterType: 'gauge' as const,
      colorScheme: 'traffic_light' as const,
      displayMetrics: [],
      updateFrequency: 'daily' as const,
      realTimeUpdates: true,
      enableAlerts: true,
      alertChannels: ['in_app', 'email'] as const,
      calculationWindow: 252,
      confidenceLevel: 95,
      enableAutoStressTesting: true,
      stressTestFrequency: 'weekly' as const,
      stressScenarios: ['market_crash_2008', 'interest_rate_shock'],
      includeAUNZFactors: true,
      auNzWeighting: 0.3,
      riskModel: 'historical' as const,
      correlationModel: 'ewma' as const
    };
  }

  private createMockCompliance(): RiskComplianceStatus {
    return {
      overallStatus: 'compliant',
      lastAssessment: new Date(),
      varCompliance: {
        thresholdName: 'Daily VaR',
        isCompliant: true,
        currentValue: 2.2,
        thresholdValue: 3.0,
        violationCount: 0,
        averageExceedance: 0
      },
      concentrationCompliance: {
        thresholdName: 'Single Asset Limit',
        isCompliant: true,
        currentValue: 8.5,
        thresholdValue: 10.0,
        violationCount: 0,
        averageExceedance: 0
      },
      liquidityCompliance: {
        thresholdName: 'Liquidity Minimum',
        isCompliant: true,
        currentValue: 85,
        thresholdValue: 80,
        violationCount: 0,
        averageExceedance: 0
      },
      stressTestCompliance: {
        thresholdName: 'Stress Test Minimum',
        isCompliant: true,
        currentValue: 75,
        thresholdValue: 70,
        violationCount: 0,
        averageExceedance: 0
      },
      regulatoryCompliance: [],
      activeViolations: [],
      riskWarnings: [],
      lastReport: new Date(),
      nextReportDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  private createMockRiskAdjustedMetrics(): import('../types/riskExposureMeter').RiskAdjustedMetrics {
    return {
      sharpeRatio: 0.75,
      informationRatio: 0.45,
      calmarRatio: 0.68,
      sortinoRatio: 1.12,
      alpha: 1.5,
      beta: 0.95,
      treynorRatio: 8.2,
      jensenAlpha: 1.2,
      marRatio: 0.58,
      sterlingRatio: 0.52,
      burkeRatio: 0.48,
      varRatio: 3.2,
      cvarRatio: 2.8,
      omegaRatio: 1.35,
      upsideCapture: 95,
      downsideCapture: 88,
      captureRatio: 1.08,
      tailRatio: 0.65,
      auNzAdjustedReturn: 7.8,
      taxAdjustedRiskMetrics: {
        afterTaxSharpe: 0.68,
        afterTaxAlpha: 1.2,
        taxRiskAdjustment: 0.85,
        frankingAdjustedReturn: 8.2
      }
    };
  }
} 