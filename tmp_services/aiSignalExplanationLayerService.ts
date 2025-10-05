import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface SignalExplanation {
  id: string;
  signalId: string;
  userId: string;
  timestamp: string;
  explanation: ExplanationContent;
  scoreBreakdown: ScoreBreakdown;
  inputAnalysis: InputAnalysis;
  confidence: number;
  complexity: ComplexityLevel;
  metadata: ExplanationMetadata;
  status: ExplanationStatus;
}

export interface ExplanationContent {
  summary: string;
  details: ExplanationDetail[];
  reasoning: string;
  implications: string[];
  confidence: string;
  recommendations: string[];
  warnings: string[];
}

export interface ExplanationDetail {
  id: string;
  type: DetailType;
  title: string;
  description: string;
  importance: ImportanceLevel;
  evidence: Evidence[];
  relatedFactors: string[];
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  value: any;
  weight: number;
  description: string;
  timestamp: string;
}

export interface ScoreBreakdown {
  overall: number;
  components: ScoreComponent[];
  factors: FactorScore[];
  confidence: number;
  reliability: number;
  validation: ValidationScore;
}

export interface ScoreComponent {
  id: string;
  name: string;
  type: ComponentType;
  score: number;
  weight: number;
  contribution: number;
  description: string;
  subComponents: ScoreComponent[];
}

export interface FactorScore {
  id: string;
  name: string;
  category: FactorCategory;
  score: number;
  impact: number;
  direction: 'positive' | 'negative' | 'neutral';
  confidence: number;
  evidence: Evidence[];
}

export interface ValidationScore {
  consistency: number;
  accuracy: number;
  completeness: number;
  timeliness: number;
  relevance: number;
}

export interface InputAnalysis {
  indicators: IndicatorAnalysis[];
  marketData: MarketDataAnalysis;
  signals: SignalAnalysis[];
  contextual: ContextualAnalysis;
  temporal: TemporalAnalysis;
}

export interface IndicatorAnalysis {
  id: string;
  name: string;
  type: IndicatorType;
  value: number;
  normalizedValue: number;
  trend: TrendDirection;
  strength: number;
  reliability: number;
  contribution: number;
  interpretation: string;
}

export interface MarketDataAnalysis {
  price: PriceAnalysis;
  volume: VolumeAnalysis;
  volatility: VolatilityAnalysis;
  momentum: MomentumAnalysis;
  sentiment: SentimentAnalysis;
}

export interface PriceAnalysis {
  current: number;
  change: number;
  changePercent: number;
  support: number;
  resistance: number;
  trend: TrendDirection;
  pattern: string;
}

export interface VolumeAnalysis {
  current: number;
  average: number;
  trend: TrendDirection;
  pattern: string;
  significance: number;
}

export interface VolatilityAnalysis {
  current: number;
  historical: number;
  implied: number;
  trend: TrendDirection;
  regime: VolatilityRegime;
}

export interface MomentumAnalysis {
  short: number;
  medium: number;
  long: number;
  direction: TrendDirection;
  strength: number;
  divergence: boolean;
}

export interface SentimentAnalysis {
  overall: number;
  technical: number;
  fundamental: number;
  news: number;
  social: number;
  institutional: number;
}

export interface SignalAnalysis {
  id: string;
  type: SignalType;
  strength: number;
  confidence: number;
  frequency: number;
  persistence: number;
  correlation: number;
  interpretation: string;
}

export interface ContextualAnalysis {
  market: MarketContext;
  sector: SectorContext;
  economic: EconomicContext;
  seasonal: SeasonalContext;
  event: EventContext;
}

export interface MarketContext {
  regime: MarketRegime;
  phase: MarketPhase;
  conditions: MarketCondition[];
  correlations: Record<string, number>;
}

export interface SectorContext {
  performance: number;
  rotation: boolean;
  leadership: boolean;
  relative: number;
}

export interface EconomicContext {
  cycle: EconomicCycle;
  indicators: EconomicIndicator[];
  policy: PolicyContext;
  outlook: string;
}

export interface SeasonalContext {
  pattern: string;
  strength: number;
  historical: number;
  expected: number;
}

export interface EventContext {
  upcoming: Event[];
  recent: Event[];
  impact: EventImpact;
}

export interface TemporalAnalysis {
  timing: TimingAnalysis;
  duration: DurationAnalysis;
  frequency: FrequencyAnalysis;
  persistence: PersistenceAnalysis;
}

export interface TimingAnalysis {
  optimal: boolean;
  score: number;
  factors: TimingFactor[];
  constraints: TimingConstraint[];
}

export interface DurationAnalysis {
  expected: number;
  range: { min: number; max: number };
  confidence: number;
  factors: DurationFactor[];
}

export interface FrequencyAnalysis {
  historical: number;
  expected: number;
  pattern: string;
  significance: number;
}

export interface PersistenceAnalysis {
  probability: number;
  strength: number;
  decay: number;
  factors: PersistenceFactor[];
}

export interface ExplanationMetadata {
  model: string;
  version: string;
  generatedAt: string;
  processingTime: number;
  inputSize: number;
  outputSize: number;
  language: string;
  style: ExplanationStyle;
  audience: AudienceLevel;
}

export interface ExplanationRequest {
  signalId: string;
  signalData: SignalData;
  options: ExplanationOptions;
}

export interface SignalData {
  id: string;
  type: SignalType;
  strength: number;
  confidence: number;
  inputs: SignalInput[];
  context: SignalContext;
  timestamp: string;
}

export interface SignalInput {
  id: string;
  type: string;
  value: any;
  source: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface SignalContext {
  asset: string;
  market: string;
  timeframe: string;
  conditions: Record<string, any>;
}

export interface ExplanationOptions {
  detail: DetailLevel;
  style: ExplanationStyle;
  audience: AudienceLevel;
  language: string;
  format: OutputFormat;
  includeScores: boolean;
  includeEvidence: boolean;
  includeRecommendations: boolean;
}

export interface ExplanationQuery {
  userId?: string;
  signalId?: string;
  dateRange?: { start: string; end: string };
  complexity?: ComplexityLevel;
  status?: ExplanationStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ExplanationResponse {
  explanations: SignalExplanation[];
  total: number;
  hasMore: boolean;
  summary: ExplanationSummary;
}

export interface ExplanationSummary {
  totalExplanations: number;
  averageConfidence: number;
  commonFactors: string[];
  topSignalTypes: string[];
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  responseTime: number;
  satisfaction: number;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export type DetailType = 'technical' | 'fundamental' | 'sentiment' | 'macro' | 'risk' | 'timing' | 'custom';
export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceType = 'indicator' | 'pattern' | 'event' | 'correlation' | 'statistical' | 'model' | 'expert';
export type ComponentType = 'indicator' | 'signal' | 'filter' | 'aggregator' | 'transformer' | 'validator';
export type FactorCategory = 'technical' | 'fundamental' | 'sentiment' | 'macro' | 'risk' | 'structural';
export type IndicatorType = 'momentum' | 'trend' | 'volatility' | 'volume' | 'sentiment' | 'custom';
export type TrendDirection = 'up' | 'down' | 'sideways' | 'unknown';
export type VolatilityRegime = 'low' | 'normal' | 'high' | 'extreme';
export type SignalType = 'buy' | 'sell' | 'hold' | 'warning' | 'information';
export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile' | 'unknown';
export type MarketPhase = 'early' | 'middle' | 'late' | 'transition';
export type MarketCondition = 'trending' | 'ranging' | 'volatile' | 'quiet' | 'stressed';
export type EconomicCycle = 'expansion' | 'peak' | 'contraction' | 'trough' | 'unknown';
export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type ExplanationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
export type DetailLevel = 'summary' | 'standard' | 'detailed' | 'comprehensive';
export type ExplanationStyle = 'technical' | 'conversational' | 'academic' | 'simplified';
export type AudienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type OutputFormat = 'text' | 'html' | 'markdown' | 'json' | 'structured';

export interface EconomicIndicator {
  name: string;
  value: number;
  trend: TrendDirection;
  impact: number;
}

export interface PolicyContext {
  monetary: string;
  fiscal: string;
  regulatory: string;
  outlook: string;
}

export interface Event {
  id: string;
  type: string;
  name: string;
  date: string;
  impact: EventImpact;
  probability: number;
}

export interface EventImpact {
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  duration: string;
  confidence: number;
}

export interface TimingFactor {
  name: string;
  value: number;
  weight: number;
  impact: string;
}

export interface TimingConstraint {
  type: string;
  description: string;
  severity: string;
}

export interface DurationFactor {
  name: string;
  contribution: number;
  description: string;
}

export interface PersistenceFactor {
  name: string;
  strength: number;
  description: string;
}

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/ai-signal-explanation';

async function fetchExplanations(query: ExplanationQuery): Promise<ExplanationResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, value.toString());
  });

  const response = await fetch(`${API_BASE}/explanations?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch explanations: ${response.statusText}`);
  return response.json();
}

async function fetchExplanation(explanationId: string): Promise<SignalExplanation> {
  const response = await fetch(`${API_BASE}/explanations/${explanationId}`);
  if (!response.ok) throw new Error(`Failed to fetch explanation: ${response.statusText}`);
  return response.json();
}

async function generateExplanation(userId: string, request: ExplanationRequest): Promise<SignalExplanation> {
  const response = await fetch(`${API_BASE}/explanations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, userId, timestamp: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Failed to generate explanation: ${response.statusText}`);
  return response.json();
}

async function regenerateExplanation(explanationId: string, options: Partial<ExplanationOptions>): Promise<SignalExplanation> {
  const response = await fetch(`${API_BASE}/explanations/${explanationId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error(`Failed to regenerate explanation: ${response.statusText}`);
  return response.json();
}

async function deleteExplanation(explanationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/explanations/${explanationId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete explanation: ${response.statusText}`);
}

async function exportExplanation(explanationId: string, format: OutputFormat): Promise<Blob> {
  const response = await fetch(`${API_BASE}/explanations/${explanationId}/export?format=${format}`);
  if (!response.ok) throw new Error(`Failed to export explanation: ${response.statusText}`);
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

export function useExplanations(query: ExplanationQuery) {
  return useQuery({
    queryKey: ['explanations', query],
    queryFn: () => fetchExplanations(query),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useExplanation(explanationId: string) {
  return useQuery({
    queryKey: ['explanation', explanationId],
    queryFn: () => fetchExplanation(explanationId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: !!explanationId,
  });
}

export function useGenerateExplanation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ExplanationRequest) => generateExplanation(userId, request),
    onSuccess: (explanation) => {
      logAgentAction({
        blockId: 'block-54',
        userId,
        action: 'generate_explanation',
        timestamp: new Date().toISOString(),
        details: {
          explanationId: explanation.id,
          signalId: explanation.signalId,
          confidence: explanation.confidence,
          complexity: explanation.complexity,
          processingTime: explanation.metadata.processingTime,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['explanations'] });
    },
  });
}

export function useRegenerateExplanation(explanationId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options: Partial<ExplanationOptions>) => regenerateExplanation(explanationId, options),
    onSuccess: (explanation) => {
      logAgentAction({
        blockId: 'block-54',
        userId,
        action: 'regenerate_explanation',
        timestamp: new Date().toISOString(),
        details: {
          explanationId: explanation.id,
          signalId: explanation.signalId,
          confidence: explanation.confidence,
        },
      });
      queryClient.setQueryData(['explanation', explanationId], explanation);
      queryClient.invalidateQueries({ queryKey: ['explanations'] });
    },
  });
}

export function useDeleteExplanation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (explanationId: string) => deleteExplanation(explanationId),
    onSuccess: (_, explanationId) => {
      logAgentAction({
        blockId: 'block-54',
        userId,
        action: 'delete_explanation',
        timestamp: new Date().toISOString(),
        details: { explanationId },
      });
      queryClient.removeQueries({ queryKey: ['explanation', explanationId] });
      queryClient.invalidateQueries({ queryKey: ['explanations'] });
    },
  });
}

export function useExportExplanation(userId: string) {
  return useMutation({
    mutationFn: ({ explanationId, format }: { explanationId: string; format: OutputFormat }) =>
      exportExplanation(explanationId, format),
    onSuccess: (blob, { explanationId, format }) => {
      logAgentAction({
        blockId: 'block-54',
        userId,
        action: 'export_explanation',
        timestamp: new Date().toISOString(),
        details: { explanationId, format, size: blob.size },
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `explanation-${explanationId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useAISignalExplanationUtils(userId: string) {
  const formatComplexity = useCallback((complexity: ComplexityLevel): string => {
    const labels: Record<ComplexityLevel, string> = {
      basic: 'Basic',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    };
    return labels[complexity] || complexity;
  }, []);

  const formatExplanationStatus = useCallback((status: ExplanationStatus): string => {
    const labels: Record<ExplanationStatus, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      expired: 'Expired',
    };
    return labels[status] || status;
  }, []);

  const getConfidenceColor = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.6) return '#F59E0B';
    if (confidence >= 0.4) return '#EF4444';
    return '#6B7280';
  }, []);

  const formatTrendDirection = useCallback((trend: TrendDirection): string => {
    const labels: Record<TrendDirection, string> = {
      up: 'Bullish',
      down: 'Bearish',
      sideways: 'Neutral',
      unknown: 'Unclear',
    };
    return labels[trend] || trend;
  }, []);

  const calculateExplanationScore = useCallback((explanation: SignalExplanation): number => {
    const weights = {
      confidence: 0.3,
      completeness: 0.2,
      clarity: 0.2,
      relevance: 0.15,
      timeliness: 0.15,
    };
    
    const confidenceScore = explanation.confidence;
    const completenessScore = explanation.scoreBreakdown.validation.completeness;
    const clarityScore = explanation.scoreBreakdown.validation.accuracy;
    const relevanceScore = explanation.scoreBreakdown.validation.relevance;
    const timelinessScore = explanation.scoreBreakdown.validation.timeliness;
    
    return (
      confidenceScore * weights.confidence +
      completenessScore * weights.completeness +
      clarityScore * weights.clarity +
      relevanceScore * weights.relevance +
      timelinessScore * weights.timeliness
    ) * 100;
  }, []);

  return useMemo(() => ({
    formatComplexity,
    formatExplanationStatus,
    getConfidenceColor,
    formatTrendDirection,
    calculateExplanationScore,
  }), [formatComplexity, formatExplanationStatus, getConfidenceColor, formatTrendDirection, calculateExplanationScore]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const aiSignalExplanationLayerService = {
  fetchExplanations,
  fetchExplanation,
  generateExplanation,
  regenerateExplanation,
  deleteExplanation,
  exportExplanation,
  logAgentAction,
  
  queryKeys: {
    explanations: (query: ExplanationQuery) => ['explanations', query],
    explanation: (explanationId: string) => ['explanation', explanationId],
  },
  
  utils: {
    formatComplexity: (complexity: ComplexityLevel) => {
      const labels: Record<ComplexityLevel, string> = {
        basic: 'Basic',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Expert',
      };
      return labels[complexity] || complexity;
    },
    formatExplanationStatus: (status: ExplanationStatus) => {
      const labels: Record<ExplanationStatus, string> = {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        expired: 'Expired',
      };
      return labels[status] || status;
    },
  },
}; 