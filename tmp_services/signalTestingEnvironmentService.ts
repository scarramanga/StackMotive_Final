import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface SignalTest {
  id: string;
  name: string;
  description: string;
  userId: string;
  signalDefinition: SignalDefinition;
  testConfiguration: TestConfiguration;
  results: TestResult[];
  metadata: SignalTestMetadata;
  status: TestStatus;
  created: string;
  modified: string;
}

export interface SignalDefinition {
  id: string;
  name: string;
  type: SignalType;
  category: SignalCategory;
  indicators: SignalIndicator[];
  conditions: SignalCondition[];
  parameters: SignalParameter[];
  triggers: SignalTrigger[];
  filters: SignalFilter[];
  validation: SignalValidation;
}

export interface SignalIndicator {
  id: string;
  name: string;
  type: IndicatorType;
  parameters: IndicatorParameter[];
  timeframe: string;
  source: DataSource;
  weight: number;
  isRequired: boolean;
  validation: IndicatorValidation;
}

export interface SignalCondition {
  id: string;
  name: string;
  type: ConditionType;
  operator: LogicalOperator;
  value: any;
  indicator: string;
  threshold: Threshold;
  timeframe: string;
  priority: number;
  isActive: boolean;
}

export interface SignalParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  description: string;
  validation: ParameterValidation;
  category: ParameterCategory;
  ui: ParameterUI;
  dependencies: string[];
}

export interface SignalTrigger {
  id: string;
  name: string;
  type: TriggerType;
  event: TriggerEvent;
  conditions: string[];
  actions: TriggerAction[];
  delay: number;
  expiration: number;
  priority: number;
  isActive: boolean;
}

export interface SignalFilter {
  id: string;
  name: string;
  type: FilterType;
  criteria: FilterCriteria;
  priority: number;
  isActive: boolean;
}

export interface SignalValidation {
  rules: ValidationRule[];
  minimumConfidence: number;
  maximumRisk: number;
  requiredIndicators: string[];
  forbiddenCombinations: string[][];
}

export interface TestConfiguration {
  timeRange: TestTimeRange;
  assets: string[];
  benchmark: string;
  frequency: TestFrequency;
  initialCapital: number;
  transactionCosts: TransactionCosts;
  slippage: number;
  maxPositionSize: number;
  riskLimits: RiskLimits;
  rebalanceFrequency: string;
  lookaheadBias: boolean;
  survivorshipBias: boolean;
  options: TestOptions;
}

export interface TestTimeRange {
  start: string;
  end: string;
  warmupPeriod: number;
  cooldownPeriod: number;
}

export interface TransactionCosts {
  fixed: number;
  variable: number;
  spread: number;
  slippage: number;
}

export interface RiskLimits {
  maxDrawdown: number;
  maxVolatility: number;
  maxConcentration: number;
  maxLeverage: number;
  stopLoss: number;
  takeProfit: number;
}

export interface TestOptions {
  includeWeekends: boolean;
  includeHolidays: boolean;
  realTimeSimulation: boolean;
  paperTrading: boolean;
  recordTrades: boolean;
  recordSignals: boolean;
  recordPerformance: boolean;
  enableLogging: boolean;
}

export interface TestResult {
  id: string;
  testId: string;
  timestamp: string;
  performance: PerformanceMetrics;
  signals: SignalResult[];
  trades: TradeResult[];
  positions: PositionResult[];
  statistics: TestStatistics;
  analysis: TestAnalysis;
  status: ResultStatus;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  drawdownDuration: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  beta: number;
  alpha: number;
  correlation: number;
  informationRatio: number;
  trackingError: number;
  treynorRatio: number;
  jensenAlpha: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  skewness: number;
  kurtosis: number;
  hitRatio: number;
  averageHoldingPeriod: number;
  turnover: number;
  transactionCosts: number;
}

export interface SignalResult {
  id: string;
  timestamp: string;
  signal: SignalStrength;
  confidence: number;
  indicators: IndicatorResult[];
  triggers: TriggerResult[];
  metadata: SignalResultMetadata;
  outcome: SignalOutcome;
}

export interface TradeResult {
  id: string;
  timestamp: string;
  asset: string;
  action: TradeAction;
  quantity: number;
  price: number;
  value: number;
  commission: number;
  slippage: number;
  reason: string;
  signalId: string;
  pnl: number;
  holdingPeriod: number;
  metadata: TradeResultMetadata;
}

export interface PositionResult {
  id: string;
  timestamp: string;
  asset: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  weight: number;
  risk: number;
  metadata: PositionResultMetadata;
}

export interface TestStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalSignals: number;
  validSignals: number;
  falseSignals: number;
  missedSignals: number;
  avgSignalStrength: number;
  avgSignalConfidence: number;
  signalAccuracy: number;
  signalPrecision: number;
  signalRecall: number;
  signalF1Score: number;
  executionRate: number;
  fillRate: number;
  latency: number;
  uptime: number;
  errorRate: number;
  stability: number;
}

export interface TestAnalysis {
  bestPerformingPeriods: PerformancePeriod[];
  worstPerformingPeriods: PerformancePeriod[];
  correlationAnalysis: CorrelationAnalysis;
  regressionAnalysis: RegressionAnalysis;
  seasonalityAnalysis: SeasonalityAnalysis;
  riskAnalysis: RiskAnalysis;
  attributionAnalysis: AttributionAnalysis;
  recommendations: AnalysisRecommendation[];
  warnings: AnalysisWarning[];
}

export interface SignalTestMetadata {
  author: string;
  version: string;
  tags: string[];
  complexity: ComplexityLevel;
  computationTime: number;
  memoryUsage: number;
  dataRequirements: DataRequirement[];
  dependencies: string[];
  validationStatus: ValidationStatus;
  lastTested: string;
  testCount: number;
  averageScore: number;
}

export type SignalType = 
  | 'momentum'
  | 'reversal'
  | 'trend_following'
  | 'mean_reversion'
  | 'volatility'
  | 'volume'
  | 'sentiment'
  | 'fundamental'
  | 'technical'
  | 'macro'
  | 'custom';

export type SignalCategory = 
  | 'entry'
  | 'exit'
  | 'risk'
  | 'timing'
  | 'sizing'
  | 'filtering'
  | 'confirmation'
  | 'alert';

export type IndicatorType = 
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'stochastic'
  | 'atr'
  | 'adx'
  | 'cci'
  | 'williams'
  | 'roc'
  | 'momentum'
  | 'volume'
  | 'custom';

export type ConditionType = 
  | 'greater_than'
  | 'less_than'
  | 'equal_to'
  | 'not_equal_to'
  | 'between'
  | 'outside'
  | 'crossover'
  | 'crossunder'
  | 'rising'
  | 'falling'
  | 'divergence'
  | 'confluence'
  | 'custom';

export type LogicalOperator = 'and' | 'or' | 'not' | 'xor';

export type ParameterType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'range'
  | 'date'
  | 'time'
  | 'asset'
  | 'indicator'
  | 'custom';

export type ParameterCategory = 
  | 'input'
  | 'calculation'
  | 'output'
  | 'display'
  | 'behavior'
  | 'validation'
  | 'optimization';

export type TriggerType = 
  | 'immediate'
  | 'delayed'
  | 'conditional'
  | 'scheduled'
  | 'recurring'
  | 'event_based';

export type TriggerEvent = 
  | 'signal_generated'
  | 'condition_met'
  | 'threshold_crossed'
  | 'pattern_detected'
  | 'anomaly_detected'
  | 'time_elapsed'
  | 'market_open'
  | 'market_close'
  | 'custom';

export type FilterType = 
  | 'time'
  | 'asset'
  | 'market'
  | 'volatility'
  | 'volume'
  | 'liquidity'
  | 'risk'
  | 'confidence'
  | 'strength'
  | 'custom';

export type TestFrequency = 
  | 'tick'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

export type TestStatus = 
  | 'draft'
  | 'configured'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'archived';

export type ResultStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export type SignalStrength = 
  | 'very_weak'
  | 'weak'
  | 'neutral'
  | 'strong'
  | 'very_strong';

export type TradeAction = 
  | 'buy'
  | 'sell'
  | 'hold'
  | 'close'
  | 'hedge'
  | 'rebalance';

export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export interface IndicatorParameter {
  name: string;
  value: any;
  type: ParameterType;
}

export interface IndicatorValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Threshold {
  value: number;
  type: 'absolute' | 'percentage' | 'percentile' | 'zscore';
  direction: 'above' | 'below' | 'equal';
}

export interface ParameterValidation {
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  customValidator?: string;
}

export interface ParameterUI {
  component: string;
  props: Record<string, any>;
  label: string;
  placeholder?: string;
  helpText?: string;
  group?: string;
}

export interface TriggerAction {
  type: string;
  parameters: Record<string, any>;
  priority: number;
  isActive: boolean;
}

export interface FilterCriteria {
  field: string;
  operator: string;
  value: any;
  caseSensitive?: boolean;
  regex?: boolean;
}

export interface ValidationRule {
  type: string;
  parameters: Record<string, any>;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface DataSource {
  provider: string;
  endpoint: string;
  apiKey?: string;
  parameters: Record<string, any>;
}

export interface IndicatorResult {
  id: string;
  value: number;
  timestamp: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface TriggerResult {
  id: string;
  triggered: boolean;
  timestamp: string;
  conditions: Record<string, boolean>;
  metadata: Record<string, any>;
}

export interface SignalResultMetadata {
  computationTime: number;
  dataPoints: number;
  reliability: number;
  version: string;
}

export interface SignalOutcome {
  success: boolean;
  profitLoss: number;
  holdingPeriod: number;
  maxDrawdown: number;
  reason: string;
}

export interface TradeResultMetadata {
  executionTime: number;
  slippageAmount: number;
  commissionAmount: number;
  marketImpact: number;
  fillQuality: number;
}

export interface PositionResultMetadata {
  entryTime: string;
  exitTime?: string;
  entryReason: string;
  exitReason?: string;
  riskScore: number;
  correlation: number;
}

export interface PerformancePeriod {
  start: string;
  end: string;
  return: number;
  volatility: number;
  sharpe: number;
  reason: string;
}

export interface CorrelationAnalysis {
  assetCorrelations: Record<string, number>;
  factorCorrelations: Record<string, number>;
  timeSeriesCorrelations: Record<string, number>;
  rollingCorrelations: Record<string, number[]>;
}

export interface RegressionAnalysis {
  alpha: number;
  beta: number;
  rSquared: number;
  pValue: number;
  standardError: number;
  residuals: number[];
  coefficients: Record<string, number>;
}

export interface SeasonalityAnalysis {
  monthlyReturns: Record<string, number>;
  dayOfWeekReturns: Record<string, number>;
  seasonalPatterns: Record<string, number>;
  cyclicalPatterns: Record<string, number>;
}

export interface RiskAnalysis {
  var: Record<string, number>;
  cvar: Record<string, number>;
  maxDrawdown: number;
  volatility: number;
  downside: number;
  tracking: number;
  concentration: number;
}

export interface AttributionAnalysis {
  factorReturns: Record<string, number>;
  specificReturn: number;
  activeReturn: number;
  residualRisk: number;
  attribution: Record<string, number>;
}

export interface AnalysisRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  implementation: string;
}

export interface AnalysisWarning {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  context: string;
  mitigation: string;
}

export interface DataRequirement {
  type: string;
  provider: string;
  frequency: string;
  history: string;
  fields: string[];
}

export interface ValidationStatus {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  lastValidated: string;
}

export interface TestRequest {
  name: string;
  description: string;
  signalDefinition: SignalDefinition;
  testConfiguration: TestConfiguration;
  saveResults: boolean;
}

export interface TestQuery {
  userId?: string;
  status?: TestStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TestResponse {
  tests: SignalTest[];
  total: number;
  hasMore: boolean;
  summary: TestSummary;
}

export interface TestSummary {
  totalTests: number;
  completedTests: number;
  runningTests: number;
  failedTests: number;
  averageScore: number;
  bestPerformingTest: string;
  worstPerformingTest: string;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/signal-testing';

async function fetchTests(query: TestQuery): Promise<TestResponse> {
  const params = new URLSearchParams();
  
  if (query.userId) params.append('userId', query.userId);
  if (query.status) params.append('status', query.status);
  if (query.search) params.append('search', query.search);
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.offset) params.append('offset', query.offset.toString());
  if (query.dateRange) {
    params.append('startDate', query.dateRange.start);
    params.append('endDate', query.dateRange.end);
  }

  const response = await fetch(`${API_BASE}/tests?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tests: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchTest(testId: string): Promise<SignalTest> {
  const response = await fetch(`${API_BASE}/tests/${testId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch test: ${response.statusText}`);
  }
  
  return response.json();
}

async function createTest(userId: string, request: TestRequest): Promise<SignalTest> {
  const response = await fetch(`${API_BASE}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      userId,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateTest(testId: string, updates: Partial<SignalTest>): Promise<SignalTest> {
  const response = await fetch(`${API_BASE}/tests/${testId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...updates,
      modified: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update test: ${response.statusText}`);
  }
  
  return response.json();
}

async function deleteTest(testId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tests/${testId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete test: ${response.statusText}`);
  }
}

async function runTest(testId: string): Promise<TestResult> {
  const response = await fetch(`${API_BASE}/tests/${testId}/run`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to run test: ${response.statusText}`);
  }
  
  return response.json();
}

async function stopTest(testId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tests/${testId}/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to stop test: ${response.statusText}`);
  }
}

async function validateSignal(signalDefinition: SignalDefinition): Promise<ValidationStatus> {
  const response = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signalDefinition),
  });

  if (!response.ok) {
    throw new Error(`Failed to validate signal: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchAvailableIndicators(): Promise<IndicatorType[]> {
  const response = await fetch(`${API_BASE}/indicators`);
  if (!response.ok) {
    throw new Error(`Failed to fetch available indicators: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchHistoricalData(
  asset: string,
  timeRange: TestTimeRange,
  frequency: TestFrequency
): Promise<any[]> {
  const params = new URLSearchParams({
    asset,
    start: timeRange.start,
    end: timeRange.end,
    frequency,
  });

  const response = await fetch(`${API_BASE}/historical-data?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch historical data: ${response.statusText}`);
  }
  
  return response.json();
}

async function exportTestResults(testId: string, format: 'json' | 'csv' | 'xlsx'): Promise<Blob> {
  const response = await fetch(`${API_BASE}/tests/${testId}/export?format=${format}`);
  if (!response.ok) {
    throw new Error(`Failed to export test results: ${response.statusText}`);
  }
  
  return response.blob();
}

async function cloneTest(testId: string, name: string): Promise<SignalTest> {
  const response = await fetch(`${API_BASE}/tests/${testId}/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to clone test: ${response.statusText}`);
  }
  
  return response.json();
}

async function logAgentAction(payload: AgentLogPayload): Promise<void> {
  const response = await fetch('/api/agent/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to log agent action: ${response.statusText}`);
  }
}

// ================================================
// REACT QUERY HOOKS
// ================================================

export function useTests(query: TestQuery) {
  return useQuery({
    queryKey: ['signal-tests', query],
    queryFn: () => fetchTests(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useTest(testId: string) {
  return useQuery({
    queryKey: ['signal-test', testId],
    queryFn: () => fetchTest(testId),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!testId,
  });
}

export function useCreateTest(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: TestRequest) => createTest(userId, request),
    onSuccess: (newTest) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'create_test',
        timestamp: new Date().toISOString(),
        details: {
          testId: newTest.id,
          name: newTest.name,
          signalType: newTest.signalDefinition.type,
          timeRange: newTest.testConfiguration.timeRange,
          assets: newTest.testConfiguration.assets,
        },
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

export function useUpdateTest(testId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: Partial<SignalTest>) => updateTest(testId, updates),
    onSuccess: (updatedTest) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'update_test',
        timestamp: new Date().toISOString(),
        details: {
          testId: updatedTest.id,
          updates: Object.keys(updates),
        },
      });
      
      // Update cache
      queryClient.setQueryData(['signal-test', testId], updatedTest);
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

export function useDeleteTest(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (testId: string) => deleteTest(testId),
    onSuccess: (_, testId) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'delete_test',
        timestamp: new Date().toISOString(),
        details: {
          testId,
        },
      });
      
      // Update cache
      queryClient.removeQueries({ queryKey: ['signal-test', testId] });
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

export function useRunTest(testId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => runTest(testId),
    onSuccess: (result) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'run_test',
        timestamp: new Date().toISOString(),
        details: {
          testId,
          resultId: result.id,
          performance: result.performance,
          statistics: result.statistics,
          status: result.status,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['signal-test', testId] });
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

export function useStopTest(testId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => stopTest(testId),
    onSuccess: () => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'stop_test',
        timestamp: new Date().toISOString(),
        details: {
          testId,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['signal-test', testId] });
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

export function useValidateSignal(userId: string) {
  return useMutation({
    mutationFn: (signalDefinition: SignalDefinition) => validateSignal(signalDefinition),
    onSuccess: (validationResult, signalDefinition) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'validate_signal',
        timestamp: new Date().toISOString(),
        details: {
          signalId: signalDefinition.id,
          signalType: signalDefinition.type,
          validationResult: validationResult,
        },
      });
    },
  });
}

export function useAvailableIndicators() {
  return useQuery({
    queryKey: ['available-indicators'],
    queryFn: fetchAvailableIndicators,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
  });
}

export function useHistoricalData(
  asset: string,
  timeRange: TestTimeRange,
  frequency: TestFrequency
) {
  return useQuery({
    queryKey: ['historical-data', asset, timeRange, frequency],
    queryFn: () => fetchHistoricalData(asset, timeRange, frequency),
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!asset && !!timeRange.start && !!timeRange.end,
  });
}

export function useExportTestResults(userId: string) {
  return useMutation({
    mutationFn: ({ testId, format }: { testId: string; format: 'json' | 'csv' | 'xlsx' }) =>
      exportTestResults(testId, format),
    onSuccess: (blob, { testId, format }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'export_test_results',
        timestamp: new Date().toISOString(),
        details: {
          testId,
          format,
          size: blob.size,
        },
      });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-results-${testId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useCloneTest(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ testId, name }: { testId: string; name: string }) =>
      cloneTest(testId, name),
    onSuccess: (clonedTest, { testId, name }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-52',
        userId,
        action: 'clone_test',
        timestamp: new Date().toISOString(),
        details: {
          originalTestId: testId,
          clonedTestId: clonedTest.id,
          name,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['signal-tests'] });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useSignalTestingUtils(userId: string) {
  const formatSignalType = useCallback((type: SignalType): string => {
    const labels: Record<SignalType, string> = {
      momentum: 'Momentum',
      reversal: 'Reversal',
      trend_following: 'Trend Following',
      mean_reversion: 'Mean Reversion',
      volatility: 'Volatility',
      volume: 'Volume',
      sentiment: 'Sentiment',
      fundamental: 'Fundamental',
      technical: 'Technical',
      macro: 'Macro',
      custom: 'Custom',
    };
    return labels[type] || type;
  }, []);

  const formatTestStatus = useCallback((status: TestStatus): string => {
    const labels: Record<TestStatus, string> = {
      draft: 'Draft',
      configured: 'Configured',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      archived: 'Archived',
    };
    return labels[status] || status;
  }, []);

  const getStatusColor = useCallback((status: TestStatus): string => {
    const colors: Record<TestStatus, string> = {
      draft: '#6B7280',
      configured: '#3B82F6',
      running: '#F59E0B',
      completed: '#10B981',
      failed: '#EF4444',
      cancelled: '#6B7280',
      archived: '#9CA3AF',
    };
    return colors[status] || '#6B7280';
  }, []);

  const calculatePerformanceScore = useCallback((performance: PerformanceMetrics): number => {
    const weights = {
      sharpeRatio: 0.3,
      totalReturn: 0.2,
      maxDrawdown: 0.2,
      winRate: 0.15,
      volatility: 0.15,
    };
    
    const normalizedSharpe = Math.max(0, Math.min(1, (performance.sharpeRatio + 1) / 3));
    const normalizedReturn = Math.max(0, Math.min(1, (performance.totalReturn + 0.5) / 1.5));
    const normalizedDrawdown = Math.max(0, Math.min(1, (0.5 - performance.maxDrawdown) / 0.5));
    const normalizedWinRate = performance.winRate;
    const normalizedVolatility = Math.max(0, Math.min(1, (0.5 - performance.volatility) / 0.5));
    
    return (
      normalizedSharpe * weights.sharpeRatio +
      normalizedReturn * weights.totalReturn +
      normalizedDrawdown * weights.maxDrawdown +
      normalizedWinRate * weights.winRate +
      normalizedVolatility * weights.volatility
    ) * 100;
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

  const generateTestReport = useCallback((test: SignalTest): string => {
    const latestResult = test.results[test.results.length - 1];
    if (!latestResult) return '';

    const report = `
# Signal Test Report: ${test.name}

## Test Configuration
- Signal Type: ${formatSignalType(test.signalDefinition.type)}
- Time Range: ${test.testConfiguration.timeRange.start} to ${test.testConfiguration.timeRange.end}
- Assets: ${test.testConfiguration.assets.join(', ')}
- Initial Capital: ${formatPerformanceMetric(test.testConfiguration.initialCapital, 'currency')}

## Performance Metrics
- Total Return: ${formatPerformanceMetric(latestResult.performance.totalReturn, 'percentage')}
- Annualized Return: ${formatPerformanceMetric(latestResult.performance.annualizedReturn, 'percentage')}
- Sharpe Ratio: ${formatPerformanceMetric(latestResult.performance.sharpeRatio, 'ratio')}
- Max Drawdown: ${formatPerformanceMetric(latestResult.performance.maxDrawdown, 'percentage')}
- Win Rate: ${formatPerformanceMetric(latestResult.performance.winRate, 'percentage')}
- Volatility: ${formatPerformanceMetric(latestResult.performance.volatility, 'percentage')}

## Trade Statistics
- Total Trades: ${latestResult.statistics.totalTrades}
- Winning Trades: ${latestResult.statistics.winningTrades}
- Losing Trades: ${latestResult.statistics.losingTrades}
- Signal Accuracy: ${formatPerformanceMetric(latestResult.statistics.signalAccuracy, 'percentage')}

## Analysis
${latestResult.analysis.recommendations.map(r => `- ${r.description}`).join('\n')}

## Warnings
${latestResult.analysis.warnings.map(w => `- ${w.message}`).join('\n')}
`;

    return report;
  }, [formatSignalType, formatPerformanceMetric]);

  const validateTestConfiguration = useCallback((config: TestConfiguration): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.timeRange.start || !config.timeRange.end) {
      errors.push('Time range is required');
    }

    if (new Date(config.timeRange.start) >= new Date(config.timeRange.end)) {
      errors.push('Start date must be before end date');
    }

    if (config.assets.length === 0) {
      errors.push('At least one asset is required');
    }

    if (config.initialCapital <= 0) {
      errors.push('Initial capital must be positive');
    }

    if (config.riskLimits.maxDrawdown <= 0 || config.riskLimits.maxDrawdown > 1) {
      warnings.push('Max drawdown should be between 0 and 1');
    }

    if (config.transactionCosts.fixed < 0 || config.transactionCosts.variable < 0) {
      warnings.push('Transaction costs should be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  const compareTestResults = useCallback((
    result1: TestResult,
    result2: TestResult
  ): {
    better: 'result1' | 'result2' | 'equal';
    metrics: Record<string, { value1: number; value2: number; better: 'result1' | 'result2' | 'equal' }>;
  } => {
    const metrics = {
      sharpeRatio: {
        value1: result1.performance.sharpeRatio,
        value2: result2.performance.sharpeRatio,
        better: result1.performance.sharpeRatio > result2.performance.sharpeRatio ? 'result1' as const :
                result1.performance.sharpeRatio < result2.performance.sharpeRatio ? 'result2' as const : 'equal' as const,
      },
      totalReturn: {
        value1: result1.performance.totalReturn,
        value2: result2.performance.totalReturn,
        better: result1.performance.totalReturn > result2.performance.totalReturn ? 'result1' as const :
                result1.performance.totalReturn < result2.performance.totalReturn ? 'result2' as const : 'equal' as const,
      },
      maxDrawdown: {
        value1: result1.performance.maxDrawdown,
        value2: result2.performance.maxDrawdown,
        better: result1.performance.maxDrawdown < result2.performance.maxDrawdown ? 'result1' as const :
                result1.performance.maxDrawdown > result2.performance.maxDrawdown ? 'result2' as const : 'equal' as const,
      },
      winRate: {
        value1: result1.performance.winRate,
        value2: result2.performance.winRate,
        better: result1.performance.winRate > result2.performance.winRate ? 'result1' as const :
                result1.performance.winRate < result2.performance.winRate ? 'result2' as const : 'equal' as const,
      },
    };

    const score1 = calculatePerformanceScore(result1.performance);
    const score2 = calculatePerformanceScore(result2.performance);

    const better = score1 > score2 ? 'result1' :
                  score1 < score2 ? 'result2' : 'equal';

    return { better, metrics };
  }, [calculatePerformanceScore]);

  return useMemo(() => ({
    formatSignalType,
    formatTestStatus,
    getStatusColor,
    calculatePerformanceScore,
    formatPerformanceMetric,
    generateTestReport,
    validateTestConfiguration,
    compareTestResults,
  }), [
    formatSignalType,
    formatTestStatus,
    getStatusColor,
    calculatePerformanceScore,
    formatPerformanceMetric,
    generateTestReport,
    validateTestConfiguration,
    compareTestResults,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const signalTestingEnvironmentService = {
  // API functions
  fetchTests,
  fetchTest,
  createTest,
  updateTest,
  deleteTest,
  runTest,
  stopTest,
  validateSignal,
  fetchAvailableIndicators,
  fetchHistoricalData,
  exportTestResults,
  cloneTest,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    tests: (query: TestQuery) => ['signal-tests', query],
    test: (testId: string) => ['signal-test', testId],
    indicators: () => ['available-indicators'],
    historicalData: (asset: string, timeRange: TestTimeRange, frequency: TestFrequency) => 
      ['historical-data', asset, timeRange, frequency],
  },
  
  // Utility functions
  utils: {
    formatSignalType: (type: SignalType) => {
      const labels: Record<SignalType, string> = {
        momentum: 'Momentum',
        reversal: 'Reversal',
        trend_following: 'Trend Following',
        mean_reversion: 'Mean Reversion',
        volatility: 'Volatility',
        volume: 'Volume',
        sentiment: 'Sentiment',
        fundamental: 'Fundamental',
        technical: 'Technical',
        macro: 'Macro',
        custom: 'Custom',
      };
      return labels[type] || type;
    },
    formatTestStatus: (status: TestStatus) => {
      const labels: Record<TestStatus, string> = {
        draft: 'Draft',
        configured: 'Configured',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        archived: 'Archived',
      };
      return labels[status] || status;
    },
    getStatusColor: (status: TestStatus) => {
      const colors: Record<TestStatus, string> = {
        draft: '#6B7280',
        configured: '#3B82F6',
        running: '#F59E0B',
        completed: '#10B981',
        failed: '#EF4444',
        cancelled: '#6B7280',
        archived: '#9CA3AF',
      };
      return colors[status] || '#6B7280';
    },
  },
}; 