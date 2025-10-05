// Block 44: Signal Change Monitor - Types
export interface SignalChange {
  id: string;
  symbolId: string;
  symbolName: string;
  changeType: SignalChangeType;
  previousSignal: TradingSignal;
  currentSignal: TradingSignal;
  changeTimestamp: Date;
  confidence: number;
  source: string;
  userId?: string;
  strategyId?: string;
  reasonCode: string;
  description: string;
  impact: SignalImpact;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  strength: number; // 0-1 scale
  price: number;
  volume?: number;
  timestamp: Date;
  indicators: Record<string, number>;
  confidence: number;
  source: string;
}

export type SignalChangeType = 
  | 'buy_to_sell'
  | 'sell_to_buy'
  | 'hold_to_buy'
  | 'hold_to_sell'
  | 'buy_to_hold'
  | 'sell_to_hold'
  | 'strength_increase'
  | 'strength_decrease'
  | 'reversal'
  | 'confirmation';

export interface SignalImpact {
  level: 'low' | 'medium' | 'high' | 'critical';
  portfolioEffect: number; // Percentage impact
  riskChange: number; // Change in risk score
  actionRequired: boolean;
  urgency: 'low' | 'medium' | 'high';
  recommendedAction?: string;
  timeframe: string;
}

export interface SignalMonitorRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: SignalConditions;
  actions: SignalRuleActions;
  priority: number;
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignalConditions {
  symbols?: string[];
  strategies?: string[];
  changeTypes?: SignalChangeType[];
  minConfidence?: number;
  maxConfidence?: number;
  minImpact?: 'low' | 'medium' | 'high' | 'critical';
  strengthThreshold?: number;
  timeWindow?: number; // Minutes
  marketConditions?: ('bull' | 'bear' | 'sideways')[];
  excludeWeakSignals?: boolean;
}

export interface SignalRuleActions {
  sendNotification: boolean;
  createAlert: boolean;
  emailAlert: boolean;
  smsAlert: boolean;
  webhookUrl?: string;
  autoRebalance?: boolean;
  pauseStrategy?: boolean;
  logToFile?: boolean;
  customAction?: string;
}

export interface SignalAlert {
  id: string;
  signalChangeId: string;
  symbolId: string;
  type: 'notification' | 'alert' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  dismissedBy?: string;
  priority: number;
  tags: string[];
}

export interface SignalTrend {
  id: string;
  symbolId: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  duration: number; // Hours
  changes: SignalChange[];
  confidence: number;
  startedAt: Date;
  lastUpdated: Date;
  isActive: boolean;
}

export interface SignalStats {
  totalChanges: number;
  changesLast24h: number;
  changesLast7d: number;
  mostActiveSymbol: string | null;
  averageConfidence: number;
  highImpactChanges: number;
  reversalCount: number;
  confirmationCount: number;
  accuracyRate: number;
  trendsActive: number;
}

export interface SignalChangeMonitorState {
  changes: SignalChange[];
  rules: SignalMonitorRule[];
  alerts: SignalAlert[];
  trends: SignalTrend[];
  selectedChange: SignalChange | null;
  selectedRule: SignalMonitorRule | null;
  filter: SignalFilter;
  isLoading: boolean;
  error: string | null;
  stats: SignalStats | null;
  isMonitoring: boolean;
  lastUpdate: Date | null;
}

export interface SignalFilter {
  symbolId?: string;
  strategyId?: string;
  userId?: string;
  changeType?: SignalChangeType;
  impactLevel?: 'low' | 'medium' | 'high' | 'critical';
  acknowledged?: boolean;
  dismissed?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  minConfidence?: number;
  source?: string;
  tags?: string[];
}

export interface SignalActions {
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  createRule: (rule: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SignalMonitorRule>;
  updateRule: (ruleId: string, updates: Partial<SignalMonitorRule>) => Promise<boolean>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  acknowledgeChange: (changeId: string, userId?: string) => Promise<boolean>;
  dismissAlert: (alertId: string, userId?: string) => Promise<boolean>;
  getSignalHistory: (symbolId: string, hours?: number) => Promise<SignalChange[]>;
  analyzeTrend: (symbolId: string) => Promise<SignalTrend | null>;
  getSignalStats: () => Promise<SignalStats>;
  refreshData: () => Promise<void>;
}

export interface SignalEvent {
  id: string;
  type: 'change_detected' | 'alert_created' | 'rule_triggered' | 'trend_started' | 'trend_ended';
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
  processed: boolean;
}

export interface SignalMonitorConfig {
  updateInterval: number; // Seconds
  historyRetention: number; // Days
  maxChangesPerSymbol: number;
  defaultConfidenceThreshold: number;
  enableAutoRebalance: boolean;
  enableNotifications: boolean;
  webhookEndpoints: string[];
  emailSettings: {
    enabled: boolean;
    recipients: string[];
    template: string;
  };
  smsSettings: {
    enabled: boolean;
    recipients: string[];
    provider: string;
  };
}

export interface SignalComparison {
  symbolId: string;
  timeframe: '1h' | '4h' | '1d' | '1w';
  current: TradingSignal;
  previous: TradingSignal;
  change: SignalChange;
  metrics: {
    volatility: number;
    momentum: number;
    strength: number;
    consistency: number;
  };
}

export interface SignalSource {
  id: string;
  name: string;
  type: 'technical' | 'fundamental' | 'sentiment' | 'ai' | 'hybrid';
  reliability: number;
  latency: number; // Milliseconds
  enabled: boolean;
  lastUpdate: Date;
  errorCount: number;
  successRate: number;
}

export interface SignalValidation {
  changeId: string;
  isValid: boolean;
  confidence: number;
  reasons: string[];
  contradictions: string[];
  correlations: Array<{
    symbolId: string;
    correlation: number;
    direction: 'same' | 'opposite';
  }>;
  marketContext: {
    trend: 'bull' | 'bear' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume: 'low' | 'medium' | 'high';
  };
}

export interface SignalAlert {
  id: string;
  signalChangeId: string;
  symbolId: string;
  type: 'notification' | 'alert' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  dismissedBy?: string;
  priority: number;
  tags: string[];
  metadata?: Record<string, any>;
} 