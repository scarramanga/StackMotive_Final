// Block 44: Signal Change Monitor - Engine
import { 
  SignalChange, 
  TradingSignal, 
  SignalChangeType, 
  SignalImpact,
  SignalMonitorRule,
  SignalAlert,
  SignalTrend,
  SignalStats,
  SignalComparison,
  SignalValidation,
  SignalSource,
  SignalEvent
} from '../types/signalChangeMonitor';

export class SignalChangeMonitorEngine {
  private changes: Map<string, SignalChange> = new Map();
  private rules: Map<string, SignalMonitorRule> = new Map();
  private alerts: Map<string, SignalAlert> = new Map();
  private trends: Map<string, SignalTrend> = new Map();
  private sources: Map<string, SignalSource> = new Map();
  private signals: Map<string, TradingSignal[]> = new Map(); // symbolId -> signal history
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultSources();
  }

  /**
   * Start monitoring for signal changes
   */
  async startMonitoring(intervalSeconds: number = 30): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.processSignalUpdates();
    }, intervalSeconds * 1000);

    console.log(`[SignalMonitor] Started monitoring with ${intervalSeconds}s interval`);
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[SignalMonitor] Stopped monitoring');
  }

  /**
   * Process new signal and detect changes
   */
  processSignal(symbolId: string, signal: TradingSignal): SignalChange | null {
    // Get signal history for this symbol
    const history = this.signals.get(symbolId) || [];
    
    // If no history, just store the signal
    if (history.length === 0) {
      this.signals.set(symbolId, [signal]);
      return null;
    }

    // Get the most recent signal
    const previousSignal = history[history.length - 1];
    
    // Check if this is a significant change
    const changeType = this.detectChangeType(previousSignal, signal);
    
    if (changeType) {
      // Create signal change
      const change = this.createSignalChange(symbolId, previousSignal, signal, changeType);
      
      // Store the change
      this.changes.set(change.id, change);
      
      // Update signal history
      history.push(signal);
      
      // Keep only last 100 signals per symbol
      if (history.length > 100) {
        history.shift();
      }
      
      this.signals.set(symbolId, history);
      
      // Process rules
      this.processRules(change);
      
      // Update trends
      this.updateTrends(symbolId, change);
      
      return change;
    } else {
      // No significant change, just update history
      history.push(signal);
      if (history.length > 100) {
        history.shift();
      }
      this.signals.set(symbolId, history);
      return null;
    }
  }

  /**
   * Create monitoring rule
   */
  createRule(rule: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>): SignalMonitorRule {
    const fullRule: SignalMonitorRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(fullRule.id, fullRule);
    return fullRule;
  }

  /**
   * Update monitoring rule
   */
  updateRule(ruleId: string, updates: Partial<SignalMonitorRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    rule.updatedAt = new Date();
    
    return true;
  }

  /**
   * Delete monitoring rule
   */
  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all signal changes
   */
  getAllChanges(): SignalChange[] {
    return Array.from(this.changes.values())
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime());
  }

  /**
   * Get changes for specific symbol
   */
  getChangesForSymbol(symbolId: string): SignalChange[] {
    return this.getAllChanges().filter(change => change.symbolId === symbolId);
  }

  /**
   * Get signal history for symbol
   */
  getSignalHistory(symbolId: string, hours: number = 24): SignalChange[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.getChangesForSymbol(symbolId)
      .filter(change => change.changeTimestamp >= cutoff);
  }

  /**
   * Get all monitoring rules
   */
  getAllRules(): SignalMonitorRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): SignalAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SignalAlert[] {
    return this.getAllAlerts().filter(alert => !alert.dismissed);
  }

  /**
   * Acknowledge signal change
   */
  acknowledgeChange(changeId: string, userId?: string): boolean {
    const change = this.changes.get(changeId);
    if (!change) return false;

    change.acknowledged = true;
    change.acknowledgedAt = new Date();
    change.acknowledgedBy = userId;

    return true;
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.dismissed = true;
    alert.dismissedAt = new Date();
    alert.dismissedBy = userId;

    return true;
  }

  /**
   * Analyze trend for symbol
   */
  analyzeTrend(symbolId: string): SignalTrend | null {
    const changes = this.getChangesForSymbol(symbolId);
    
    if (changes.length < 2) {
      return null;
    }

    // Get recent changes (last 24 hours)
    const recentChanges = changes.slice(0, 10);
    
    // Analyze direction
    let bullishCount = 0;
    let bearishCount = 0;
    
    recentChanges.forEach(change => {
      if (['buy_to_sell', 'hold_to_sell', 'strength_decrease'].includes(change.changeType)) {
        bearishCount++;
      } else if (['sell_to_buy', 'hold_to_buy', 'strength_increase'].includes(change.changeType)) {
        bullishCount++;
      }
    });

    const direction = bullishCount > bearishCount ? 'bullish' : 
                     bearishCount > bullishCount ? 'bearish' : 'neutral';

    const strength = Math.abs(bullishCount - bearishCount) / recentChanges.length;
    const confidence = recentChanges.reduce((sum, c) => sum + c.confidence, 0) / recentChanges.length;

    const trend: SignalTrend = {
      id: this.generateId(),
      symbolId,
      direction,
      strength,
      duration: this.calculateTrendDuration(recentChanges),
      changes: recentChanges,
      confidence,
      startedAt: recentChanges[recentChanges.length - 1].changeTimestamp,
      lastUpdated: new Date(),
      isActive: true
    };

    this.trends.set(trend.id, trend);
    return trend;
  }

  /**
   * Get signal statistics
   */
  getSignalStats(): SignalStats {
    const changes = this.getAllChanges();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last24h = changes.filter(c => c.changeTimestamp >= oneDayAgo);
    const last7d = changes.filter(c => c.changeTimestamp >= sevenDaysAgo);

    // Find most active symbol
    const symbolCounts = changes.reduce((counts, change) => {
      counts[change.symbolId] = (counts[change.symbolId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostActiveSymbol = Object.entries(symbolCounts)
      .reduce((max, [symbol, count]) => 
        count > max.count ? { symbol, count } : max,
        { symbol: null as string | null, count: 0 }
      ).symbol;

    return {
      totalChanges: changes.length,
      changesLast24h: last24h.length,
      changesLast7d: last7d.length,
      mostActiveSymbol,
      averageConfidence: changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length || 0,
      highImpactChanges: changes.filter(c => c.impact.level === 'high' || c.impact.level === 'critical').length,
      reversalCount: changes.filter(c => c.changeType === 'reversal').length,
      confirmationCount: changes.filter(c => c.changeType === 'confirmation').length,
      accuracyRate: this.calculateAccuracyRate(changes),
      trendsActive: Array.from(this.trends.values()).filter(t => t.isActive).length
    };
  }

  /**
   * Get change by ID
   */
  getChange(changeId: string): SignalChange | undefined {
    return this.changes.get(changeId);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): SignalAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get trend by ID
   */
  getTrend(trendId: string): SignalTrend | undefined {
    return this.trends.get(trendId);
  }

  /**
   * Get all active trends
   */
  getActiveTrends(): SignalTrend[] {
    return Array.from(this.trends.values())
      .filter(trend => trend.isActive)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Validate signal change
   */
  validateSignalChange(change: SignalChange): SignalValidation {
    // Mock validation logic - in production, this would use more sophisticated analysis
    const isValid = change.confidence > 0.5;
    const reasons = [];
    const contradictions = [];

    if (change.confidence < 0.5) {
      contradictions.push('Low confidence signal');
    }

    if (change.impact.level === 'high' || change.impact.level === 'critical') {
      reasons.push('High impact change detected');
    }

    return {
      changeId: change.id,
      isValid,
      confidence: change.confidence,
      reasons,
      contradictions,
      correlations: [], // Would analyze correlations with other symbols
      marketContext: {
        trend: 'bull', // Mock data
        volatility: 'medium',
        volume: 'medium'
      }
    };
  }

  /**
   * Process signal updates (called by monitoring loop)
   */
  private async processSignalUpdates(): Promise<void> {
    try {
      // In production, this would fetch real-time signal data
      // For now, we'll generate mock signal updates
      const mockSignals = this.generateMockSignals();
      
      mockSignals.forEach(({ symbolId, signal }) => {
        this.processSignal(symbolId, signal);
      });
    } catch (error) {
      console.error('[SignalMonitor] Error processing signal updates:', error);
    }
  }

  /**
   * Detect change type between two signals
   */
  private detectChangeType(previous: TradingSignal, current: TradingSignal): SignalChangeType | null {
    if (previous.type === current.type) {
      // Same signal type, check strength changes
      const strengthDiff = Math.abs(current.strength - previous.strength);
      if (strengthDiff > 0.2) {
        return current.strength > previous.strength ? 'strength_increase' : 'strength_decrease';
      }
      return null; // No significant change
    }

    // Different signal types
    if (previous.type === 'buy' && current.type === 'sell') return 'buy_to_sell';
    if (previous.type === 'sell' && current.type === 'buy') return 'sell_to_buy';
    if (previous.type === 'hold' && current.type === 'buy') return 'hold_to_buy';
    if (previous.type === 'hold' && current.type === 'sell') return 'hold_to_sell';
    if (previous.type === 'buy' && current.type === 'hold') return 'buy_to_hold';
    if (previous.type === 'sell' && current.type === 'hold') return 'sell_to_hold';

    // Check for reversal patterns
    if ((previous.type === 'strong_buy' && current.type === 'sell') ||
        (previous.type === 'strong_sell' && current.type === 'buy')) {
      return 'reversal';
    }

    return 'confirmation';
  }

  /**
   * Create signal change object
   */
  private createSignalChange(
    symbolId: string,
    previousSignal: TradingSignal,
    currentSignal: TradingSignal,
    changeType: SignalChangeType
  ): SignalChange {
    const impact = this.calculateImpact(previousSignal, currentSignal, changeType);
    
    return {
      id: this.generateId(),
      symbolId,
      symbolName: this.getSymbolName(symbolId),
      changeType,
      previousSignal,
      currentSignal,
      changeTimestamp: new Date(),
      confidence: currentSignal.confidence,
      source: currentSignal.source,
      reasonCode: this.generateReasonCode(changeType),
      description: this.generateDescription(changeType, symbolId),
      impact,
      acknowledged: false,
      metadata: {
        strengthDiff: currentSignal.strength - previousSignal.strength,
        priceChange: ((currentSignal.price - previousSignal.price) / previousSignal.price) * 100
      }
    };
  }

  /**
   * Calculate impact of signal change
   */
  private calculateImpact(
    previous: TradingSignal,
    current: TradingSignal,
    changeType: SignalChangeType
  ): SignalImpact {
    const strengthDiff = Math.abs(current.strength - previous.strength);
    const priceChange = Math.abs((current.price - previous.price) / previous.price);

    let level: SignalImpact['level'];
    if (strengthDiff > 0.7 || priceChange > 0.1) {
      level = 'critical';
    } else if (strengthDiff > 0.5 || priceChange > 0.05) {
      level = 'high';
    } else if (strengthDiff > 0.3 || priceChange > 0.02) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      level,
      portfolioEffect: priceChange * 100,
      riskChange: strengthDiff * (changeType === 'reversal' ? 2 : 1),
      actionRequired: level === 'critical' || level === 'high',
      urgency: level === 'critical' ? 'high' : level === 'high' ? 'medium' : 'low',
      timeframe: level === 'critical' ? 'immediate' : level === 'high' ? '1 hour' : '1 day'
    };
  }

  /**
   * Process rules for signal change
   */
  private processRules(change: SignalChange): void {
    this.getAllRules()
      .filter(rule => rule.enabled)
      .forEach(rule => {
        if (this.ruleMatches(rule, change)) {
          this.executeRule(rule, change);
        }
      });
  }

  /**
   * Check if rule matches signal change
   */
  private ruleMatches(rule: SignalMonitorRule, change: SignalChange): boolean {
    const { conditions } = rule;

    if (conditions.symbols && !conditions.symbols.includes(change.symbolId)) {
      return false;
    }

    if (conditions.changeTypes && !conditions.changeTypes.includes(change.changeType)) {
      return false;
    }

    if (conditions.minConfidence && change.confidence < conditions.minConfidence) {
      return false;
    }

    if (conditions.maxConfidence && change.confidence > conditions.maxConfidence) {
      return false;
    }

    if (conditions.minImpact) {
      const impactLevels = ['low', 'medium', 'high', 'critical'];
      const minIndex = impactLevels.indexOf(conditions.minImpact);
      const changeIndex = impactLevels.indexOf(change.impact.level);
      if (changeIndex < minIndex) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute rule actions
   */
  private executeRule(rule: SignalMonitorRule, change: SignalChange): void {
    const { actions } = rule;

    if (actions.createAlert) {
      this.createAlert(change, rule);
    }

    if (actions.sendNotification) {
      this.sendNotification(change, rule);
    }

    if (actions.logToFile) {
      this.logToFile(change, rule);
    }

    console.log(`[SignalMonitor] Executed rule "${rule.name}" for change ${change.id}`);
  }

  /**
   * Create alert for signal change
   */
  private createAlert(change: SignalChange, rule: SignalMonitorRule): void {
    const alert: SignalAlert = {
      id: this.generateId(),
      signalChangeId: change.id,
      symbolId: change.symbolId,
      type: change.impact.level === 'critical' ? 'critical' : 
            change.impact.level === 'high' ? 'alert' : 'notification',
      title: `Signal Change: ${change.symbolName}`,
      message: `${change.description} - Impact: ${change.impact.level}`,
      actionRequired: change.impact.actionRequired,
      createdAt: new Date(),
      dismissed: false,
      priority: rule.priority,
      tags: [change.changeType, change.impact.level]
    };

    this.alerts.set(alert.id, alert);
  }

  /**
   * Send notification
   */
  private sendNotification(change: SignalChange, rule: SignalMonitorRule): void {
    // Mock notification - in production, this would send real notifications
    console.log(`[SignalMonitor] Notification: ${change.description}`);
  }

  /**
   * Log to file
   */
  private logToFile(change: SignalChange, rule: SignalMonitorRule): void {
    // Mock logging - in production, this would write to actual log files
    console.log(`[SignalMonitor] Log: ${JSON.stringify(change, null, 2)}`);
  }

  /**
   * Update trends
   */
  private updateTrends(symbolId: string, change: SignalChange): void {
    // Find existing trend for this symbol
    const existingTrend = Array.from(this.trends.values())
      .find(t => t.symbolId === symbolId && t.isActive);

    if (existingTrend) {
      existingTrend.changes.unshift(change);
      existingTrend.lastUpdated = new Date();
      
      // Keep only last 20 changes
      if (existingTrend.changes.length > 20) {
        existingTrend.changes = existingTrend.changes.slice(0, 20);
      }
    }
  }

  /**
   * Calculate trend duration
   */
  private calculateTrendDuration(changes: SignalChange[]): number {
    if (changes.length < 2) return 0;
    
    const start = changes[changes.length - 1].changeTimestamp;
    const end = changes[0].changeTimestamp;
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Hours
  }

  /**
   * Calculate accuracy rate
   */
  private calculateAccuracyRate(changes: SignalChange[]): number {
    // Mock accuracy calculation
    return 0.85; // 85% accuracy
  }

  /**
   * Generate mock signals for testing
   */
  private generateMockSignals(): Array<{symbolId: string, signal: TradingSignal}> {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    const signals: Array<{symbolId: string, signal: TradingSignal}> = [];

    symbols.forEach(symbolId => {
      if (Math.random() < 0.3) { // 30% chance of signal update
        signals.push({
          symbolId,
          signal: {
            type: ['buy', 'sell', 'hold'][Math.floor(Math.random() * 3)] as any,
            strength: Math.random(),
            price: 100 + Math.random() * 200,
            timestamp: new Date(),
            indicators: {
              rsi: Math.random() * 100,
              macd: Math.random() * 2 - 1,
              bb: Math.random()
            },
            confidence: Math.random(),
            source: 'mock'
          }
        });
      }
    });

    return signals;
  }

  /**
   * Get symbol name
   */
  private getSymbolName(symbolId: string): string {
    const symbolNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'TSLA': 'Tesla Inc.',
      'AMZN': 'Amazon.com Inc.'
    };
    return symbolNames[symbolId] || symbolId;
  }

  /**
   * Generate reason code
   */
  private generateReasonCode(changeType: SignalChangeType): string {
    return `SC_${changeType.toUpperCase()}`;
  }

  /**
   * Generate description
   */
  private generateDescription(changeType: SignalChangeType, symbolId: string): string {
    const descriptions: Record<SignalChangeType, string> = {
      'buy_to_sell': `Signal reversed from BUY to SELL for ${symbolId}`,
      'sell_to_buy': `Signal reversed from SELL to BUY for ${symbolId}`,
      'hold_to_buy': `Signal upgraded from HOLD to BUY for ${symbolId}`,
      'hold_to_sell': `Signal downgraded from HOLD to SELL for ${symbolId}`,
      'buy_to_hold': `Signal downgraded from BUY to HOLD for ${symbolId}`,
      'sell_to_hold': `Signal upgraded from SELL to HOLD for ${symbolId}`,
      'strength_increase': `Signal strength increased for ${symbolId}`,
      'strength_decrease': `Signal strength decreased for ${symbolId}`,
      'reversal': `Strong reversal signal detected for ${symbolId}`,
      'confirmation': `Signal confirmation for ${symbolId}`
    };
    return descriptions[changeType] || `Signal change detected for ${symbolId}`;
  }

  /**
   * Initialize default rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Impact Changes',
        description: 'Alert on all high impact signal changes',
        enabled: true,
        conditions: {
          minImpact: 'high',
          minConfidence: 0.7
        },
        actions: {
          sendNotification: true,
          createAlert: true,
          emailAlert: false,
          smsAlert: false,
          logToFile: true
        },
        priority: 1,
        cooldownMinutes: 5
      },
      {
        name: 'Reversal Signals',
        description: 'Track signal reversals',
        enabled: true,
        conditions: {
          changeTypes: ['reversal', 'buy_to_sell', 'sell_to_buy'],
          minConfidence: 0.6
        },
        actions: {
          sendNotification: true,
          createAlert: true,
          emailAlert: false,
          smsAlert: false,
          logToFile: true
        },
        priority: 2,
        cooldownMinutes: 10
      }
    ];

    defaultRules.forEach(rule => this.createRule(rule));
  }

  /**
   * Initialize default signal sources
   */
  private initializeDefaultSources(): void {
    const defaultSources: Omit<SignalSource, 'lastUpdate' | 'errorCount' | 'successRate'>[] = [
      {
        id: 'technical_analysis',
        name: 'Technical Analysis',
        type: 'technical',
        reliability: 0.8,
        latency: 1000,
        enabled: true
      },
      {
        id: 'sentiment_analysis',
        name: 'Sentiment Analysis',
        type: 'sentiment',
        reliability: 0.7,
        latency: 2000,
        enabled: true
      },
      {
        id: 'ai_predictions',
        name: 'AI Predictions',
        type: 'ai',
        reliability: 0.85,
        latency: 500,
        enabled: true
      }
    ];

    defaultSources.forEach(source => {
      this.sources.set(source.id, {
        ...source,
        lastUpdate: new Date(),
        errorCount: 0,
        successRate: 0.95
      });
    });
  }

  private generateId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const signalChangeMonitorEngine = new SignalChangeMonitorEngine(); 