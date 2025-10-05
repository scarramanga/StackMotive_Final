import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface SignalSource {
  id: string;
  name: string;
  type: SignalSourceType;
  category: SignalCategory;
  provider: string;
  description: string;
  isActive: boolean;
  created: string;
  modified: string;
  metadata: SignalSourceMetadata;
  configuration: SourceConfiguration;
}

export interface SignalSourceMetadata {
  version: string;
  author: string;
  complexity: ComplexityLevel;
  reliability: number;
  latency: number;
  dataRequirements: DataRequirement[];
  dependencies: string[];
  tags: string[];
  documentation: string;
}

export interface SourceConfiguration {
  frequency: string;
  lookbackPeriod: number;
  parameters: SourceParameter[];
  filters: SourceFilter[];
  validation: ValidationRules;
  thresholds: ThresholdConfig[];
}

export interface SourceParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  description: string;
  validation: ParameterValidation;
}

export interface SourceFilter {
  id: string;
  type: FilterType;
  criteria: FilterCriteria;
  isActive: boolean;
}

export interface ValidationRules {
  required: string[];
  constraints: ValidationConstraint[];
  customValidators: string[];
}

export interface ThresholdConfig {
  id: string;
  name: string;
  value: number;
  operator: ThresholdOperator;
  action: ThresholdAction;
}

export interface SignalRanking {
  id: string;
  sourceId: string;
  rank: number;
  score: number;
  scoreComponents: ScoreComponent[];
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  recency: RecencyMetrics;
  timestamp: string;
  period: RankingPeriod;
  metadata: RankingMetadata;
}

export interface ScoreComponent {
  id: string;
  name: string;
  category: ScoreCategory;
  value: number;
  weight: number;
  contribution: number;
  normalization: NormalizationMethod;
  description: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  calmarRatio: number;
  informationRatio: number;
  trackingError: number;
  beta: number;
  alpha: number;
  correlation: number;
  hitRatio: number;
  consistency: number;
}

export interface ReliabilityMetrics {
  signalAccuracy: number;
  predictionStability: number;
  dataQuality: number;
  latencyConsistency: number;
  errorRate: number;
  uptimePercentage: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
}

export interface RecencyMetrics {
  recentPerformance: number;
  recentReliability: number;
  trendDirection: TrendDirection;
  momentumScore: number;
  decayFactor: number;
  timeWeighting: number;
  adaptabilityScore: number;
  currentRelevance: number;
}

export interface RankingPeriod {
  start: string;
  end: string;
  duration: string;
  frequency: string;
  dataPoints: number;
  completeness: number;
}

export interface RankingMetadata {
  algorithm: string;
  version: string;
  parameters: RankingParameters;
  benchmarks: BenchmarkData[];
  adjustments: VolatilityAdjustment[];
  confidence: number;
  stability: number;
}

export interface RankingParameters {
  performanceWeight: number;
  reliabilityWeight: number;
  recencyWeight: number;
  consistencyWeight: number;
  riskAdjustmentFactor: number;
  volatilityNormalization: boolean;
  outlierHandling: OutlierMethod;
  minimumDataPoints: number;
}

export interface BenchmarkData {
  id: string;
  name: string;
  type: BenchmarkType;
  value: number;
  period: string;
  description: string;
}

export interface VolatilityAdjustment {
  id: string;
  method: AdjustmentMethod;
  factor: number;
  period: string;
  impact: number;
}

export interface SignalOutcome {
  id: string;
  signalId: string;
  sourceId: string;
  timestamp: string;
  prediction: PredictionData;
  outcome: OutcomeData;
  performance: OutcomePerformance;
  attribution: AttributionData;
  metadata: OutcomeMetadata;
}

export interface PredictionData {
  signal: SignalValue;
  confidence: number;
  strength: number;
  direction: SignalDirection;
  target: PredictionTarget;
  timeframe: string;
  reasoning: string[];
}

export interface SignalValue {
  value: number;
  normalized: number;
  raw: number;
  units: string;
  scale: ValueScale;
}

export interface PredictionTarget {
  asset: string;
  metric: string;
  expectedValue: number;
  range: ValueRange;
  probability: number;
}

export interface ValueRange {
  min: number;
  max: number;
  confidence: number;
}

export interface OutcomeData {
  actualValue: number;
  actualDirection: SignalDirection;
  timeTaken: number;
  maxDeviation: number;
  finalResult: OutcomeResult;
  accuracy: number;
}

export interface OutcomePerformance {
  returnGenerated: number;
  riskAdjustedReturn: number;
  transactionCosts: number;
  slippage: number;
  marketImpact: number;
  netPerformance: number;
  benchmarkOutperformance: number;
}

export interface AttributionData {
  factors: AttributionFactor[];
  marketContribution: number;
  specificContribution: number;
  noiseComponent: number;
  explainedVariance: number;
}

export interface AttributionFactor {
  id: string;
  name: string;
  contribution: number;
  significance: number;
  confidence: number;
}

export interface OutcomeMetadata {
  marketConditions: MarketCondition[];
  environmentalFactors: EnvironmentalFactor[];
  executionQuality: ExecutionQuality;
  dataQuality: DataQualityMetric[];
}

export interface MarketCondition {
  type: string;
  value: number;
  impact: string;
  description: string;
}

export interface EnvironmentalFactor {
  category: string;
  factor: string;
  influence: number;
  direction: string;
}

export interface ExecutionQuality {
  fillRate: number;
  slippageImpact: number;
  timingAccuracy: number;
  costEfficiency: number;
}

export interface DataQualityMetric {
  dimension: string;
  score: number;
  issues: string[];
  impact: string;
}

export interface RankingConfiguration {
  id: string;
  name: string;
  description: string;
  userId: string;
  parameters: RankingParameters;
  includedSources: string[];
  excludedSources: string[];
  customWeights: CustomWeight[];
  filters: RankingFilter[];
  benchmarks: string[];
  isActive: boolean;
  created: string;
  modified: string;
}

export interface CustomWeight {
  sourceId: string;
  weight: number;
  reason: string;
  isOverride: boolean;
}

export interface RankingFilter {
  id: string;
  type: FilterType;
  criteria: FilterCriteria;
  isActive: boolean;
}

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface RankingRequest {
  configurationId?: string;
  period: RankingPeriod;
  sources: string[];
  parameters: RankingParameters;
  benchmarks: string[];
  options: RankingOptions;
}

export interface RankingOptions {
  includeOutcomes: boolean;
  includeAttribution: boolean;
  exportFormat: string;
  realTimeUpdates: boolean;
  cacheResults: boolean;
}

export interface RankingResult {
  id: string;
  requestId: string;
  rankings: SignalRanking[];
  summary: RankingSummary;
  benchmarks: BenchmarkComparison[];
  metadata: ResultMetadata;
  timestamp: string;
  status: RankingStatus;
}

export interface RankingSummary {
  totalSources: number;
  rankedSources: number;
  topPerformer: string;
  worstPerformer: string;
  averageScore: number;
  scoreRange: ValueRange;
  performanceSpread: number;
  reliabilityRange: ValueRange;
}

export interface BenchmarkComparison {
  benchmarkId: string;
  sourceComparisons: SourceComparison[];
  overallStats: ComparisonStats;
}

export interface SourceComparison {
  sourceId: string;
  benchmarkReturn: number;
  sourceReturn: number;
  outperformance: number;
  significance: number;
}

export interface ComparisonStats {
  averageOutperformance: number;
  outperformanceVolatility: number;
  winRate: number;
  informationRatio: number;
}

export interface ResultMetadata {
  algorithm: string;
  version: string;
  processingTime: number;
  dataQuality: number;
  confidence: number;
  limitations: string[];
  assumptions: string[];
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

// Type definitions
export type SignalSourceType = 'technical' | 'fundamental' | 'sentiment' | 'macro' | 'alternative' | 'composite' | 'custom';
export type SignalCategory = 'momentum' | 'mean_reversion' | 'trend' | 'volatility' | 'volume' | 'news' | 'social' | 'economic' | 'other';
export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type ParameterType = 'number' | 'string' | 'boolean' | 'select' | 'range' | 'date' | 'asset' | 'custom';
export type FilterType = 'performance' | 'reliability' | 'recency' | 'category' | 'provider' | 'custom';
export type ThresholdOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'between' | 'outside';
export type ThresholdAction = 'include' | 'exclude' | 'flag' | 'adjust' | 'notify';
export type ScoreCategory = 'performance' | 'reliability' | 'recency' | 'consistency' | 'risk' | 'composite';
export type NormalizationMethod = 'zscore' | 'minmax' | 'robust' | 'quantile' | 'none';
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'volatile' | 'unknown';
export type OutlierMethod = 'remove' | 'cap' | 'transform' | 'flag' | 'ignore';
export type BenchmarkType = 'market' | 'sector' | 'factor' | 'custom' | 'peer';
export type AdjustmentMethod = 'garch' | 'ewma' | 'historical' | 'regime' | 'adaptive';
export type SignalDirection = 'buy' | 'sell' | 'hold' | 'neutral' | 'strong_buy' | 'strong_sell';
export type ValueScale = 'linear' | 'logarithmic' | 'percentile' | 'normalized';
export type OutcomeResult = 'success' | 'failure' | 'partial' | 'timeout' | 'error';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in';
export type RankingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface DataRequirement {
  type: string;
  frequency: string;
  history: string;
  quality: string;
}

export interface ParameterValidation {
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
}

export interface ValidationConstraint {
  field: string;
  rule: string;
  value: any;
  message: string;
}

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/signal-ranking-optimizer';

async function fetchSignalSources(): Promise<SignalSource[]> {
  const response = await fetch(`${API_BASE}/sources`);
  if (!response.ok) throw new Error(`Failed to fetch signal sources: ${response.statusText}`);
  return response.json();
}

async function fetchSignalRankings(period?: RankingPeriod): Promise<SignalRanking[]> {
  const params = period ? `?start=${period.start}&end=${period.end}` : '';
  const response = await fetch(`${API_BASE}/rankings${params}`);
  if (!response.ok) throw new Error(`Failed to fetch signal rankings: ${response.statusText}`);
  return response.json();
}

async function fetchSignalOutcomes(sourceId: string, period: RankingPeriod): Promise<SignalOutcome[]> {
  const params = new URLSearchParams({
    sourceId,
    start: period.start,
    end: period.end,
  });
  const response = await fetch(`${API_BASE}/outcomes?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch signal outcomes: ${response.statusText}`);
  return response.json();
}

async function calculateRankings(request: RankingRequest): Promise<RankingResult> {
  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Failed to calculate rankings: ${response.statusText}`);
  return response.json();
}

async function updateSourceInclusion(sourceId: string, isIncluded: boolean, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sources/${sourceId}/inclusion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isIncluded, userId }),
  });
  if (!response.ok) throw new Error(`Failed to update source inclusion: ${response.statusText}`);
}

async function saveRankingConfiguration(config: RankingConfiguration): Promise<RankingConfiguration> {
  const response = await fetch(`${API_BASE}/configurations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error(`Failed to save ranking configuration: ${response.statusText}`);
  return response.json();
}

async function exportRankings(rankingId: string, format: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/rankings/${rankingId}/export?format=${format}`);
  if (!response.ok) throw new Error(`Failed to export rankings: ${response.statusText}`);
  return response.blob();
}

async function logAgentAction(payload: AgentLogPayload): Promise<void> {
  const response = await fetch('/api/agent/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to log agent action: ${response.statusText}`);
}

// ================================================
// REACT QUERY HOOKS
// ================================================

export function useSignalSources() {
  return useQuery({
    queryKey: ['signal-sources'],
    queryFn: fetchSignalSources,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

export function useSignalRanks(period?: RankingPeriod) {
  return useQuery({
    queryKey: ['signal-rankings', period],
    queryFn: () => fetchSignalRankings(period),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useSignalSourcePerformance(sourceId: string, period: RankingPeriod) {
  return useQuery({
    queryKey: ['signal-outcomes', sourceId, period],
    queryFn: () => fetchSignalOutcomes(sourceId, period),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    enabled: !!sourceId && !!period.start && !!period.end,
  });
}

export function useCalculateRankings(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: RankingRequest) => calculateRankings(request),
    onSuccess: (result, request) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-55',
        userId,
        action: 'calculate_rankings',
        timestamp: new Date().toISOString(),
        details: {
          resultId: result.id,
          requestId: result.requestId,
          sourcesRanked: result.summary.rankedSources,
          topPerformer: result.summary.topPerformer,
          averageScore: result.summary.averageScore,
          processingTime: result.metadata.processingTime,
          period: request.period,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['signal-rankings'] });
    },
  });
}

export function useUpdateSourceInclusion(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceId, isIncluded }: { sourceId: string; isIncluded: boolean }) =>
      updateSourceInclusion(sourceId, isIncluded, userId),
    onSuccess: (_, { sourceId, isIncluded }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-55',
        userId,
        action: 'update_source_inclusion',
        timestamp: new Date().toISOString(),
        details: {
          sourceId,
          isIncluded,
          action: isIncluded ? 'include' : 'exclude',
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['signal-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['signal-sources'] });
    },
  });
}

export function useSaveRankingConfiguration(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: RankingConfiguration) => saveRankingConfiguration(config),
    onSuccess: (savedConfig) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-55',
        userId,
        action: 'save_ranking_config',
        timestamp: new Date().toISOString(),
        details: {
          configId: savedConfig.id,
          configName: savedConfig.name,
          includedSources: savedConfig.includedSources.length,
          excludedSources: savedConfig.excludedSources.length,
          parameters: savedConfig.parameters,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ranking-configurations'] });
    },
  });
}

export function useExportRankings(userId: string) {
  return useMutation({
    mutationFn: ({ rankingId, format }: { rankingId: string; format: string }) =>
      exportRankings(rankingId, format),
    onSuccess: (blob, { rankingId, format }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-55',
        userId,
        action: 'export_rankings',
        timestamp: new Date().toISOString(),
        details: {
          rankingId,
          format,
          size: blob.size,
        },
      });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signal-rankings-${rankingId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useSignalRankingOptimizerUtils(userId: string) {
  const formatSignalSourceType = useCallback((type: SignalSourceType): string => {
    const labels: Record<SignalSourceType, string> = {
      technical: 'Technical',
      fundamental: 'Fundamental',
      sentiment: 'Sentiment',
      macro: 'Macro',
      alternative: 'Alternative',
      composite: 'Composite',
      custom: 'Custom',
    };
    return labels[type] || type;
  }, []);

  const formatSignalCategory = useCallback((category: SignalCategory): string => {
    const labels: Record<SignalCategory, string> = {
      momentum: 'Momentum',
      mean_reversion: 'Mean Reversion',
      trend: 'Trend',
      volatility: 'Volatility',
      volume: 'Volume',
      news: 'News',
      social: 'Social',
      economic: 'Economic',
      other: 'Other',
    };
    return labels[category] || category;
  }, []);

  const calculateOverallScore = useCallback((ranking: SignalRanking): number => {
    return ranking.scoreComponents.reduce((total, component) => {
      return total + (component.value * component.weight);
    }, 0);
  }, []);

  const getPerformanceColor = useCallback((value: number): string => {
    if (value >= 0.8) return '#10B981';
    if (value >= 0.6) return '#F59E0B';
    if (value >= 0.4) return '#EF4444';
    return '#6B7280';
  }, []);

  const formatPerformanceMetric = useCallback((value: number, type: 'percentage' | 'ratio' | 'currency'): string => {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(3);
      case 'currency':
        return `$${value.toLocaleString()}`;
      default:
        return value.toString();
    }
  }, []);

  const generateRankingReport = useCallback((result: RankingResult): string => {
    const topPerformers = result.rankings.slice(0, 5);
    const report = `
# Signal Ranking Report

## Summary
- Total Sources Analyzed: ${result.summary.totalSources}
- Sources Ranked: ${result.summary.rankedSources}
- Average Score: ${result.summary.averageScore.toFixed(2)}
- Performance Spread: ${(result.summary.performanceSpread * 100).toFixed(1)}%

## Top Performers
${topPerformers.map((ranking, index) => `
${index + 1}. Source ID: ${ranking.sourceId}
   - Rank: ${ranking.rank}
   - Score: ${ranking.score.toFixed(2)}
   - Sharpe Ratio: ${ranking.performance.sharpeRatio.toFixed(3)}
   - Win Rate: ${(ranking.performance.winRate * 100).toFixed(1)}%
   - Reliability: ${(ranking.reliability.signalAccuracy * 100).toFixed(1)}%
`).join('')}

## Analysis Period
- Start: ${result.rankings[0]?.period.start}
- End: ${result.rankings[0]?.period.end}
- Data Points: ${result.rankings[0]?.period.dataPoints}
- Completeness: ${(result.rankings[0]?.period.completeness * 100).toFixed(1)}%

Generated: ${new Date(result.timestamp).toLocaleString()}
`;
    return report;
  }, []);

  return useMemo(() => ({
    formatSignalSourceType,
    formatSignalCategory,
    calculateOverallScore,
    getPerformanceColor,
    formatPerformanceMetric,
    generateRankingReport,
  }), [
    formatSignalSourceType,
    formatSignalCategory,
    calculateOverallScore,
    getPerformanceColor,
    formatPerformanceMetric,
    generateRankingReport,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const signalRankingOptimizerService = {
  // API functions
  fetchSignalSources,
  fetchSignalRankings,
  fetchSignalOutcomes,
  calculateRankings,
  updateSourceInclusion,
  saveRankingConfiguration,
  exportRankings,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    sources: () => ['signal-sources'],
    rankings: (period?: RankingPeriod) => ['signal-rankings', period],
    outcomes: (sourceId: string, period: RankingPeriod) => ['signal-outcomes', sourceId, period],
  },
  
  // Utility functions
  utils: {
    formatSignalSourceType: (type: SignalSourceType) => {
      const labels: Record<SignalSourceType, string> = {
        technical: 'Technical',
        fundamental: 'Fundamental',
        sentiment: 'Sentiment',
        macro: 'Macro',
        alternative: 'Alternative',
        composite: 'Composite',
        custom: 'Custom',
      };
      return labels[type] || type;
    },
    formatSignalCategory: (category: SignalCategory) => {
      const labels: Record<SignalCategory, string> = {
        momentum: 'Momentum',
        mean_reversion: 'Mean Reversion',
        trend: 'Trend',
        volatility: 'Volatility',
        volume: 'Volume',
        news: 'News',
        social: 'Social',
        economic: 'Economic',
        other: 'Other',
      };
      return labels[category] || category;
    },
  },
}; 