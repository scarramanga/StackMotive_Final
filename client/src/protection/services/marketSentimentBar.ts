// Block 95: Market Sentiment Bar - Types
// Real-time Market Sentiment Tracking and Visualization

export interface MarketSentimentBar {
  id: string;
  userId: string;
  
  // Bar identification
  barName: string;
  description: string;
  
  // Configuration
  sentimentConfig: SentimentConfig;
  
  // Current sentiment
  currentSentiment: SentimentReading;
  
  // Historical data
  sentimentHistory: SentimentHistory[];
  
  // Data sources
  dataSources: SentimentDataSource[];
  
  // Visualization settings
  visualizationConfig: VisualizationConfig;
  
  // Alert settings
  alertConfig: AlertConfig;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date;
}

export interface SentimentConfig {
  // Scope configuration
  scope: SentimentScope;
  
  // Data sources
  enabledSources: SentimentSourceType[];
  
  // Aggregation settings
  aggregationMethod: AggregationMethod;
  aggregationWindow: TimeWindow;
  
  // Refresh settings
  refreshInterval: RefreshInterval;
  
  // Weighting
  sourceWeights: Record<SentimentSourceType, number>;
  
  // Filters
  filters: SentimentFilter[];
  
  // AU/NZ specific
  jurisdiction: 'AU' | 'NZ' | 'BOTH';
  marketHours: MarketHoursConfig;
  
  // Quality settings
  qualityThresholds: QualityThreshold[];
  
  // Processing settings
  processingConfig: ProcessingConfig;
}

export interface SentimentReading {
  id: string;
  
  // Overall sentiment
  overallSentiment: number; // -1 to +1
  sentimentGrade: SentimentGrade;
  confidence: number; // 0-1
  
  // Component sentiments
  componentSentiments: ComponentSentiment[];
  
  // Source breakdown
  sourceBreakdown: SourceSentimentBreakdown[];
  
  // Market segments
  segmentSentiments: SegmentSentiment[];
  
  // Temporal analysis
  temporalAnalysis: TemporalSentimentAnalysis;
  
  // Quality metrics
  qualityMetrics: SentimentQualityMetrics;
  
  // Metadata
  timestamp: Date;
  dataAsOfTime: Date;
  calculationMethod: string;
  sampleSize: number;
}

export interface ComponentSentiment {
  componentId: string;
  componentName: string;
  componentType: ComponentType;
  
  // Sentiment score
  sentiment: number; // -1 to +1
  confidence: number;
  weight: number;
  
  // Contributing factors
  factors: SentimentFactor[];
  
  // Trend analysis
  trend: SentimentTrend;
  
  // Data quality
  dataQuality: number;
  sampleSize: number;
  
  // Last updated
  lastUpdated: Date;
}

export interface SentimentDataSource {
  sourceId: string;
  sourceName: string;
  sourceType: SentimentSourceType;
  
  // Connection details
  connectionConfig: SourceConnectionConfig;
  
  // Data flow
  dataFlow: DataFlowConfig;
  
  // Processing
  processingConfig: SourceProcessingConfig;
  
  // Quality metrics
  qualityMetrics: SourceQualityMetrics;
  
  // Status
  status: SourceStatus;
  isEnabled: boolean;
  
  // Performance
  performanceMetrics: SourcePerformanceMetrics;
  
  // AU/NZ specific
  jurisdiction: 'AU' | 'NZ' | 'GLOBAL';
  marketCoverage: MarketCoverage;
  
  // Metadata
  createdAt: Date;
  lastUpdated: Date;
  lastSuccessfulUpdate: Date;
}

export interface SentimentHistory {
  id: string;
  barId: string;
  
  // Historical reading
  sentimentReading: SentimentReading;
  
  // Context
  marketContext: MarketContext;
  
  // Events
  significantEvents: SignificantEvent[];
  
  // Metadata
  recordedAt: Date;
}

export interface VisualizationConfig {
  // Display style
  displayStyle: DisplayStyle;
  
  // Bar appearance
  barAppearance: BarAppearance;
  
  // Color scheme
  colorScheme: SentimentColorScheme;
  
  // Animation settings
  animationConfig: AnimationConfig;
  
  // Layout
  layoutConfig: LayoutConfig;
  
  // Interactive elements
  interactiveElements: InteractiveElement[];
  
  // Responsive design
  responsiveConfig: ResponsiveConfig;
  
  // Accessibility
  accessibilityConfig: AccessibilityConfig;
}

export interface AlertConfig {
  // Alert settings
  enableAlerts: boolean;
  
  // Threshold alerts
  thresholdAlerts: ThresholdAlert[];
  
  // Trend alerts
  trendAlerts: TrendAlert[];
  
  // Volatility alerts
  volatilityAlerts: VolatilityAlert[];
  
  // Source alerts
  sourceAlerts: SourceAlert[];
  
  // Notification settings
  notificationConfig: NotificationConfig;
  
  // Alert history
  alertHistory: AlertHistory[];
}

export interface SentimentScope {
  // Market scope
  marketScope: MarketScope;
  
  // Asset scope
  assetScope: AssetScope;
  
  // Sector scope
  sectorScope: SectorScope[];
  
  // Geographic scope
  geographicScope: GeographicScope;
  
  // Temporal scope
  temporalScope: TemporalScope;
  
  // Custom filters
  customFilters: CustomFilter[];
}

export interface SourceSentimentBreakdown {
  sourceType: SentimentSourceType;
  sourceName: string;
  
  // Sentiment metrics
  sentiment: number;
  confidence: number;
  weight: number;
  contribution: number;
  
  // Data metrics
  dataPoints: number;
  freshness: number; // hours
  reliability: number;
  
  // Status
  isActive: boolean;
  lastUpdated: Date;
}

export interface SegmentSentiment {
  segmentId: string;
  segmentName: string;
  segmentType: SegmentType;
  
  // Sentiment
  sentiment: number;
  confidence: number;
  
  // Market data
  marketData: SegmentMarketData;
  
  // Performance
  performance: SegmentPerformance;
  
  // Drivers
  sentimentDrivers: SentimentDriver[];
}

export interface TemporalSentimentAnalysis {
  // Time-based analysis
  intraday: IntradayAnalysis;
  daily: DailyAnalysis;
  weekly: WeeklyAnalysis;
  monthly: MonthlyAnalysis;
  
  // Trend analysis
  trendAnalysis: TrendAnalysis;
  
  // Volatility analysis
  volatilityAnalysis: VolatilityAnalysis;
  
  // Seasonal patterns
  seasonalPatterns: SeasonalPattern[];
  
  // Correlation analysis
  correlationAnalysis: CorrelationAnalysis;
}

export interface SentimentQualityMetrics {
  // Overall quality
  overallQuality: number; // 0-1
  
  // Data quality
  dataCompleteness: number;
  dataFreshness: number;
  dataReliability: number;
  
  // Source diversity
  sourceDiversity: number;
  sourceReliability: number;
  
  // Statistical quality
  sampleSize: number;
  confidenceInterval: ConfidenceInterval;
  standardError: number;
  
  // Validation metrics
  validationScore: number;
  crossValidationScore: number;
  
  // Bias metrics
  biasAssessment: BiasAssessment;
}

export interface SentimentFactor {
  factorId: string;
  factorName: string;
  factorType: FactorType;
  
  // Impact
  impact: number; // -1 to +1
  confidence: number;
  weight: number;
  
  // Description
  description: string;
  
  // Context
  context: FactorContext;
  
  // Temporal data
  duration: number; // hours
  intensity: number;
  
  // Source
  sources: string[];
}

export interface SentimentTrend {
  // Trend direction
  direction: TrendDirection;
  strength: number;
  duration: number; // hours
  
  // Momentum
  momentum: number;
  acceleration: number;
  
  // Projections
  projectedSentiment: number;
  projectionConfidence: number;
  
  // Historical comparison
  historicalComparison: HistoricalComparison;
}

// State and Hook Types
export interface MarketSentimentBarState {
  bars: Record<string, MarketSentimentBar>;
  currentBarId: string | null;
  realtimeData: Record<string, SentimentReading>;
  selectedBarIds: string[];
  
  // Cache
  lastUpdated: Record<string, Date>;
  cacheExpiry: number;
  
  // Error handling
  errors: Record<string, string>;
}

export interface UseMarketSentimentBarReturn {
  // Data
  bars: MarketSentimentBar[];
  currentBar: MarketSentimentBar | null;
  realtimeData: SentimentReading | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Bar operations
  createBar: (config: Omit<MarketSentimentBar, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<MarketSentimentBar>;
  updateBar: (id: string, updates: Partial<MarketSentimentBar>) => Promise<MarketSentimentBar>;
  deleteBar: (id: string) => Promise<void>;
  
  // Sentiment operations
  getCurrentSentiment: (barId: string) => Promise<SentimentReading>;
  refreshSentiment: (barId: string) => Promise<SentimentReading>;
  
  // Data source operations
  addDataSource: (barId: string, source: SentimentDataSource) => Promise<void>;
  removeDataSource: (barId: string, sourceId: string) => Promise<void>;
  updateDataSource: (barId: string, sourceId: string, updates: Partial<SentimentDataSource>) => Promise<void>;
  
  // Analysis operations
  analyzeSentimentTrends: (barId: string, timeRange: TimeRange) => Promise<TrendAnalysis>;
  getSentimentHistory: (barId: string, timeRange: TimeRange) => Promise<SentimentHistory[]>;
  compareSentiments: (barId1: string, barId2: string) => Promise<SentimentComparison>;
  
  // Utility functions
  setCurrentBar: (barId: string | null) => void;
  refreshData: () => Promise<void>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

// Enums and Union Types
export type SentimentGrade = 'Very Positive' | 'Positive' | 'Slightly Positive' | 'Neutral' | 'Slightly Negative' | 'Negative' | 'Very Negative';
export type SentimentSourceType = 'news' | 'social_media' | 'institutional' | 'options_flow' | 'vix' | 'bonds' | 'currencies' | 'commodities' | 'analyst_ratings' | 'earnings' | 'economic_data';
export type ComponentType = 'market_news' | 'social_sentiment' | 'options_sentiment' | 'bond_sentiment' | 'currency_sentiment' | 'volatility_sentiment' | 'flow_sentiment';
export type AggregationMethod = 'weighted_average' | 'median' | 'mode' | 'exponential_smoothing' | 'kalman_filter';
export type TimeWindow = '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type RefreshInterval = 'real_time' | '1m' | '5m' | '15m' | '1h';
export type SourceStatus = 'active' | 'inactive' | 'error' | 'maintenance' | 'rate_limited';
export type DisplayStyle = 'bar' | 'gauge' | 'line' | 'area' | 'heatmap' | 'radial';
export type SegmentType = 'sector' | 'market_cap' | 'geographic' | 'asset_class' | 'style';
export type FactorType = 'news_event' | 'economic_data' | 'earnings' | 'technical' | 'flow' | 'sentiment_shift';
export type TrendDirection = 'bullish' | 'bearish' | 'neutral' | 'volatile';

// Supporting Types
export interface MarketHoursConfig {
  timezone: string;
  marketOpen: string; // HH:mm format
  marketClose: string;
  extendedHours: boolean;
  weekendTracking: boolean;
}

export interface QualityThreshold {
  metric: string;
  threshold: number;
  action: 'warn' | 'exclude' | 'weight_reduce';
}

export interface ProcessingConfig {
  // NLP settings
  nlpConfig: NLPConfig;
  
  // Filtering
  filterConfig: FilterConfig;
  
  // Normalization
  normalizationConfig: NormalizationConfig;
  
  // Deduplication
  deduplicationConfig: DeduplicationConfig;
}

export interface NLPConfig {
  sentimentModel: string;
  languageSupport: string[];
  entityRecognition: boolean;
  topicModeling: boolean;
  keywordExtraction: boolean;
}

export interface FilterConfig {
  spamFilter: boolean;
  relevanceThreshold: number;
  languageFilter: string[];
  sourceReliabilityThreshold: number;
}

export interface SourceConnectionConfig {
  endpoint: string;
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
  retryConfig: RetryConfig;
  timeout: number;
}

export interface AuthConfig {
  type: 'api_key' | 'oauth' | 'bearer' | 'basic';
  credentials: Record<string, string>;
  refreshToken?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface DataFlowConfig {
  dataFormat: 'json' | 'xml' | 'csv' | 'text';
  fieldMapping: Record<string, string>;
  transformations: DataTransformation[];
  validationRules: ValidationRule[];
}

export interface DataTransformation {
  field: string;
  operation: string;
  parameters: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  rule: string;
  parameters: Record<string, any>;
}

export interface SourcePerformanceMetrics {
  averageLatency: number;
  successRate: number;
  errorRate: number;
  uptimePercentage: number;
  lastResponseTime: number;
  dataFreshness: number;
}

export interface MarketCoverage {
  exchanges: string[];
  assetClasses: string[];
  sectors: string[];
  marketCap: string[];
}

export interface MarketContext {
  marketConditions: MarketConditions;
  volatilityLevel: VolatilityLevel;
  tradingVolume: TradingVolumeLevel;
  majorEvents: string[];
  timeOfDay: TimeOfDay;
}

export interface SignificantEvent {
  eventId: string;
  eventType: string;
  description: string;
  impact: number;
  timestamp: Date;
  relevance: number;
}

export interface BarAppearance {
  height: number;
  width: number;
  borderRadius: number;
  gradient: boolean;
  showLabels: boolean;
  showValues: boolean;
  showTrend: boolean;
}

export interface SentimentColorScheme {
  veryPositive: string;
  positive: string;
  slightlyPositive: string;
  neutral: string;
  slightlyNegative: string;
  negative: string;
  veryNegative: string;
  background: string;
  text: string;
  border: string;
}

export interface ThresholdAlert {
  name: string;
  threshold: number;
  condition: 'above' | 'below' | 'equals';
  enabled: boolean;
  priority: AlertPriority;
  cooldownPeriod: number; // minutes
}

export interface TrendAlert {
  name: string;
  trendDirection: TrendDirection;
  minDuration: number; // minutes
  minStrength: number;
  enabled: boolean;
  priority: AlertPriority;
}

export interface VolatilityAlert {
  name: string;
  volatilityThreshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  priority: AlertPriority;
}

export interface SourceAlert {
  sourceType: SentimentSourceType;
  alertType: 'offline' | 'poor_quality' | 'stale_data';
  enabled: boolean;
  priority: AlertPriority;
}

export interface NotificationConfig {
  email: boolean;
  push: boolean;
  slack: boolean;
  webhook: boolean;
  webhookUrl?: string;
}

export interface MarketScope {
  exchanges: string[];
  indices: string[];
  assetClasses: string[];
}

export interface AssetScope {
  symbols: string[];
  excludeSymbols: string[];
  marketCapRange: MarketCapRange;
  volumeThreshold: number;
}

export interface SectorScope {
  sector: string;
  weight: number;
  includeSubsectors: boolean;
}

export interface GeographicScope {
  countries: string[];
  regions: string[];
  excludeCountries: string[];
}

export interface TemporalScope {
  startTime: string; // HH:mm
  endTime: string;
  timezone: string;
  includePremiumHours: boolean;
}

export interface CustomFilter {
  name: string;
  criteria: FilterCriteria;
  isActive: boolean;
}

export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SegmentMarketData {
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  marketCap: number;
}

export interface SegmentPerformance {
  performance1D: number;
  performance1W: number;
  performance1M: number;
  performance3M: number;
  performance1Y: number;
}

export interface SentimentDriver {
  driverId: string;
  description: string;
  impact: number;
  confidence: number;
  category: string;
}

export interface IntradayAnalysis {
  openingSentiment: number;
  currentSentiment: number;
  highSentiment: number;
  lowSentiment: number;
  averageSentiment: number;
  volatility: number;
}

export interface DailyAnalysis {
  dailyChange: number;
  dailyVolatility: number;
  trendStrength: number;
  reversal: boolean;
}

export interface WeeklyAnalysis {
  weeklyTrend: TrendDirection;
  weeklyChange: number;
  consistencyScore: number;
}

export interface MonthlyAnalysis {
  monthlyTrend: TrendDirection;
  monthlyChange: number;
  seasonalAdjustment: number;
}

export interface TrendAnalysis {
  shortTermTrend: TrendDirection;
  mediumTermTrend: TrendDirection;
  longTermTrend: TrendDirection;
  trendStrength: number;
  trendAge: number; // hours
  reversalProbability: number;
}

export interface VolatilityAnalysis {
  currentVolatility: number;
  averageVolatility: number;
  volatilityTrend: TrendDirection;
  volatilityPercentile: number;
}

export interface SeasonalPattern {
  pattern: string;
  strength: number;
  confidence: number;
  description: string;
}

export interface CorrelationAnalysis {
  marketCorrelation: number;
  sectorCorrelations: Record<string, number>;
  assetCorrelations: Record<string, number>;
}

export interface ConfidenceInterval {
  level: number;
  lowerBound: number;
  upperBound: number;
}

export interface BiasAssessment {
  sourceBias: number;
  temporalBias: number;
  selectionBias: number;
  overallBias: number;
}

export interface FactorContext {
  timeframe: string;
  scope: string;
  relevance: number;
  persistence: number;
}

export interface HistoricalComparison {
  similar1M: number;
  similar3M: number;
  similar1Y: number;
  percentileRank: number;
}

// Additional Analysis Types
export interface SentimentComparison {
  bar1: MarketSentimentBar;
  bar2: MarketSentimentBar;
  correlation: number;
  divergence: number;
  commonFactors: string[];
  uniqueFactors: {
    bar1: string[];
    bar2: string[];
  };
  analysis: string;
}

export interface TimeRange {
  period: '1h' | '4h' | '1d' | '1w' | '1m' | '3m' | '1y';
  startDate?: Date;
  endDate?: Date;
}

// Utility Types
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type MarketConditions = 'bull' | 'bear' | 'sideways' | 'volatile';
export type VolatilityLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
export type TradingVolumeLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
export type TimeOfDay = 'pre_market' | 'market_open' | 'mid_day' | 'market_close' | 'after_hours';

export interface MarketCapRange {
  min: number;
  max: number;
}

export interface AlertHistory {
  alertId: string;
  alertType: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface AnimationConfig {
  enableAnimations: boolean;
  transitionDuration: number;
  easing: string;
  updateAnimation: string;
}

export interface LayoutConfig {
  orientation: 'horizontal' | 'vertical';
  alignment: 'left' | 'center' | 'right';
  spacing: number;
  padding: number;
}

export interface InteractiveElement {
  elementType: string;
  action: string;
  enabled: boolean;
}

export interface ResponsiveConfig {
  breakpoints: Record<string, number>;
  adaptiveScaling: boolean;
  mobileOptimized: boolean;
}

export interface AccessibilityConfig {
  highContrast: boolean;
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  alternativeText: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export interface NormalizationConfig {
  method: 'min_max' | 'z_score' | 'robust';
  range: [number, number];
}

export interface DeduplicationConfig {
  enabled: boolean;
  similarityThreshold: number;
  timeWindow: number; // minutes
}

export interface SourceQualityMetrics {
  reliability: number;
  freshness: number;
  coverage: number;
  accuracy: number;
}

export default MarketSentimentBar; 