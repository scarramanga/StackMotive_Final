import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface BacktestStrategy {
  id: string;
  name: string;
  description: string;
  userId: string;
  strategyType: StrategyType;
  components: StrategyComponent[];
  parameters: StrategyParameter[];
  configuration: BacktestConfiguration;
  results: BacktestResult[];
  status: BacktestStatus;
  created: string;
  modified: string;
}

export interface StrategyComponent {
  id: string;
  type: ComponentType;
  name: string;
  weight: number;
  parameters: Record<string, any>;
  isActive: boolean;
  dependencies: string[];
}

export interface StrategyParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  description: string;
  validation: ParameterValidation;
  category: string;
}

export interface BacktestConfiguration {
  timeRange: { start: string; end: string };
  assets: string[];
  benchmark: string;
  frequency: string;
  initialCapital: number;
  rebalanceFrequency: string;
  transactionCosts: { fixed: number; variable: number };
  riskLimits: { maxDrawdown: number; maxVolatility: number };
  options: BacktestOptions;
}

export interface BacktestOptions {
  includeWeekends: boolean;
  includeHolidays: boolean;
  lookaheadBias: boolean;
  survivorshipBias: boolean;
  warmupPeriod: number;
  cooldownPeriod: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  timestamp: string;
  performance: PerformanceMetrics;
  trades: TradeRecord[];
  positions: PositionRecord[];
  analytics: BacktestAnalytics;
  status: ResultStatus;
  duration: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  var95: number;
  var99: number;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  asset: string;
  action: string;
  quantity: number;
  price: number;
  commission: number;
  pnl: number;
  reason: string;
}

export interface PositionRecord {
  id: string;
  timestamp: string;
  asset: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  unrealizedPnl: number;
}

export interface BacktestAnalytics {
  riskMetrics: RiskMetrics;
  attributionAnalysis: AttributionAnalysis;
  seasonalityAnalysis: SeasonalityAnalysis;
  drawdownAnalysis: DrawdownAnalysis;
  rollingMetrics: RollingMetrics;
  recommendations: AnalysisRecommendation[];
}

export interface RiskMetrics {
  volatility: number;
  downside: number;
  tracking: number;
  concentration: number;
  leverage: number;
}

export interface AttributionAnalysis {
  factorReturns: Record<string, number>;
  specificReturn: number;
  activeReturn: number;
  residualRisk: number;
}

export interface SeasonalityAnalysis {
  monthlyReturns: Record<string, number>;
  dayOfWeekReturns: Record<string, number>;
  quarterlyReturns: Record<string, number>;
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  averageDrawdown: number;
  drawdownDuration: number;
  recoveryTime: number;
  drawdownPeriods: DrawdownPeriod[];
}

export interface DrawdownPeriod {
  start: string;
  end: string;
  peak: number;
  trough: number;
  duration: number;
  recovery: number;
}

export interface RollingMetrics {
  returns: number[];
  volatility: number[];
  sharpe: number[];
  drawdown: number[];
  periods: string[];
}

export interface AnalysisRecommendation {
  type: string;
  priority: string;
  description: string;
  impact: string;
  implementation: string;
}

export interface BacktestRequest {
  name: string;
  description: string;
  strategyType: StrategyType;
  components: StrategyComponent[];
  configuration: BacktestConfiguration;
}

export interface BacktestQuery {
  userId?: string;
  status?: BacktestStatus;
  strategyType?: StrategyType;
  dateRange?: { start: string; end: string };
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BacktestResponse {
  strategies: BacktestStrategy[];
  total: number;
  hasMore: boolean;
  summary: BacktestSummary;
}

export interface BacktestSummary {
  totalStrategies: number;
  completedBacktests: number;
  runningBacktests: number;
  averageReturn: number;
  bestPerformingStrategy: string;
  worstPerformingStrategy: string;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export type StrategyType = 'equity_long_short' | 'momentum' | 'mean_reversion' | 'pairs_trading' | 'multi_factor' | 'custom';
export type ComponentType = 'signal' | 'filter' | 'risk_manager' | 'position_sizer' | 'execution' | 'overlay';
export type ParameterType = 'number' | 'string' | 'boolean' | 'select' | 'range' | 'date' | 'asset';
export type BacktestStatus = 'draft' | 'configured' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ResultStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ParameterValidation {
  required: boolean;
  min?: number;
  max?: number;
  enumValues?: string[];
  pattern?: string;
}

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/strategy-backtest';

async function fetchBacktests(query: BacktestQuery): Promise<BacktestResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, value.toString());
  });

  const response = await fetch(`${API_BASE}/strategies?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch backtests: ${response.statusText}`);
  return response.json();
}

async function fetchBacktest(strategyId: string): Promise<BacktestStrategy> {
  const response = await fetch(`${API_BASE}/strategies/${strategyId}`);
  if (!response.ok) throw new Error(`Failed to fetch backtest: ${response.statusText}`);
  return response.json();
}

async function createBacktest(userId: string, request: BacktestRequest): Promise<BacktestStrategy> {
  const response = await fetch(`${API_BASE}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, userId, timestamp: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Failed to create backtest: ${response.statusText}`);
  return response.json();
}

async function runBacktest(strategyId: string): Promise<BacktestResult> {
  const response = await fetch(`${API_BASE}/strategies/${strategyId}/run`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to run backtest: ${response.statusText}`);
  return response.json();
}

async function stopBacktest(strategyId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/strategies/${strategyId}/stop`, { method: 'POST' });
  if (!response.ok) throw new Error(`Failed to stop backtest: ${response.statusText}`);
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

export function useBacktests(query: BacktestQuery) {
  return useQuery({
    queryKey: ['backtests', query],
    queryFn: () => fetchBacktests(query),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useBacktest(strategyId: string) {
  return useQuery({
    queryKey: ['backtest', strategyId],
    queryFn: () => fetchBacktest(strategyId),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    enabled: !!strategyId,
  });
}

export function useCreateBacktest(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BacktestRequest) => createBacktest(userId, request),
    onSuccess: (newStrategy) => {
      logAgentAction({
        blockId: 'block-53',
        userId,
        action: 'create_backtest',
        timestamp: new Date().toISOString(),
        details: {
          strategyId: newStrategy.id,
          name: newStrategy.name,
          strategyType: newStrategy.strategyType,
          components: newStrategy.components.length,
          timeRange: newStrategy.configuration.timeRange,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['backtests'] });
    },
  });
}

export function useRunBacktest(strategyId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runBacktest(strategyId),
    onSuccess: (result) => {
      logAgentAction({
        blockId: 'block-53',
        userId,
        action: 'run_backtest',
        timestamp: new Date().toISOString(),
        details: {
          strategyId,
          resultId: result.id,
          performance: result.performance,
          duration: result.duration,
          status: result.status,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['backtest', strategyId] });
    },
  });
}

export function useStopBacktest(strategyId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stopBacktest(strategyId),
    onSuccess: () => {
      logAgentAction({
        blockId: 'block-53',
        userId,
        action: 'stop_backtest',
        timestamp: new Date().toISOString(),
        details: { strategyId },
      });
      queryClient.invalidateQueries({ queryKey: ['backtest', strategyId] });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useStrategyBacktestUtils(userId: string) {
  const formatStrategyType = useCallback((type: StrategyType): string => {
    const labels: Record<StrategyType, string> = {
      equity_long_short: 'Equity Long/Short',
      momentum: 'Momentum',
      mean_reversion: 'Mean Reversion',
      pairs_trading: 'Pairs Trading',
      multi_factor: 'Multi-Factor',
      custom: 'Custom',
    };
    return labels[type] || type;
  }, []);

  const formatBacktestStatus = useCallback((status: BacktestStatus): string => {
    const labels: Record<BacktestStatus, string> = {
      draft: 'Draft',
      configured: 'Configured',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }, []);

  const calculatePerformanceScore = useCallback((performance: PerformanceMetrics): number => {
    const weights = {
      sharpeRatio: 0.3,
      totalReturn: 0.25,
      maxDrawdown: 0.2,
      volatility: 0.15,
      winRate: 0.1,
    };
    
    const normalizedSharpe = Math.max(0, Math.min(1, (performance.sharpeRatio + 1) / 3));
    const normalizedReturn = Math.max(0, Math.min(1, (performance.totalReturn + 0.5) / 1.5));
    const normalizedDrawdown = Math.max(0, Math.min(1, (0.5 - performance.maxDrawdown) / 0.5));
    const normalizedVolatility = Math.max(0, Math.min(1, (0.5 - performance.volatility) / 0.5));
    const normalizedWinRate = performance.winRate || 0;
    
    return (
      normalizedSharpe * weights.sharpeRatio +
      normalizedReturn * weights.totalReturn +
      normalizedDrawdown * weights.maxDrawdown +
      normalizedVolatility * weights.volatility +
      normalizedWinRate * weights.winRate
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

  return useMemo(() => ({
    formatStrategyType,
    formatBacktestStatus,
    calculatePerformanceScore,
    formatPerformanceMetric,
  }), [formatStrategyType, formatBacktestStatus, calculatePerformanceScore, formatPerformanceMetric]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const strategyBacktestEngineService = {
  fetchBacktests,
  fetchBacktest,
  createBacktest,
  runBacktest,
  stopBacktest,
  logAgentAction,
  
  queryKeys: {
    backtests: (query: BacktestQuery) => ['backtests', query],
    backtest: (strategyId: string) => ['backtest', strategyId],
  },
  
  utils: {
    formatStrategyType: (type: StrategyType) => {
      const labels: Record<StrategyType, string> = {
        equity_long_short: 'Equity Long/Short',
        momentum: 'Momentum',
        mean_reversion: 'Mean Reversion',
        pairs_trading: 'Pairs Trading',
        multi_factor: 'Multi-Factor',
        custom: 'Custom',
      };
      return labels[type] || type;
    },
    formatBacktestStatus: (status: BacktestStatus) => {
      const labels: Record<BacktestStatus, string> = {
        draft: 'Draft',
        configured: 'Configured',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
      };
      return labels[status] || status;
    },
  },
}; 