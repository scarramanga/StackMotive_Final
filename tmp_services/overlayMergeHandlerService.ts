import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface OverlayConfiguration {
  id: string;
  name: string;
  description: string;
  type: OverlayType;
  category: OverlayCategory;
  version: string;
  isActive: boolean;
  priority: number;
  weight: number;
  signals: OverlaySignal[];
  rules: OverlayRule[];
  filters: OverlayFilter[];
  parameters: OverlayParameter[];
  metadata: OverlayMetadata;
  dependencies: string[];
  conflicts: string[];
  created: string;
  modified: string;
}

export interface OverlaySignal {
  id: string;
  name: string;
  type: SignalType;
  strength: number;
  confidence: number;
  direction: SignalDirection;
  timeframe: string;
  assets: string[];
  conditions: SignalCondition[];
  triggers: SignalTrigger[];
  outputs: SignalOutput[];
  validation: SignalValidation;
}

export interface OverlayRule {
  id: string;
  name: string;
  type: RuleType;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  isActive: boolean;
  exceptions: RuleException[];
}

export interface OverlayFilter {
  id: string;
  type: FilterType;
  criteria: FilterCriteria;
  operator: FilterOperator;
  value: any;
  isActive: boolean;
}

export interface OverlayParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  description: string;
  validation: ParameterValidation;
  dependencies: string[];
}

export interface OverlayMetadata {
  author: string;
  version: string;
  complexity: ComplexityLevel;
  performance: PerformanceStats;
  reliability: ReliabilityStats;
  tags: string[];
  documentation: string;
  lastTested: string;
}

export interface MergeRequest {
  id: string;
  name: string;
  description: string;
  userId: string;
  overlays: string[];
  strategy: MergeStrategy;
  resolution: ConflictResolution;
  options: MergeOptions;
  timestamp: string;
  status: MergeStatus;
}

export interface MergeStrategy {
  type: MergeType;
  weighting: WeightingMethod;
  aggregation: AggregationMethod;
  prioritization: PriorityMethod;
  normalization: NormalizationMethod;
  parameters: MergeParameters;
}

export interface MergeParameters {
  weightThreshold: number;
  signalThreshold: number;
  confidenceThreshold: number;
  timeAlignment: TimeAlignment;
  assetAlignment: AssetAlignment;
  riskLimits: RiskLimits;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  rules: ResolutionRule[];
  overrides: ResolutionOverride[];
  fallback: FallbackAction;
  validation: ResolutionValidation;
}

export interface MergeOptions {
  preserveOriginals: boolean;
  validateOutput: boolean;
  generateReport: boolean;
  realTimeUpdates: boolean;
  backfillHistory: boolean;
  enableMonitoring: boolean;
}

export interface MergeResult {
  id: string;
  requestId: string;
  mergedOverlay: OverlayConfiguration;
  conflicts: DetectedConflict[];
  resolutions: AppliedResolution[];
  preview: MergePreview;
  validation: MergeValidation;
  metadata: MergeMetadata;
  timestamp: string;
  status: MergeResultStatus;
}

export interface DetectedConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  overlays: string[];
  description: string;
  impact: ConflictImpact;
  suggestions: ResolutionSuggestion[];
  autoResolvable: boolean;
  requiresAttention: boolean;
}

export interface ConflictImpact {
  performance: number;
  reliability: number;
  complexity: number;
  riskIncrease: number;
  affectedAssets: string[];
  affectedSignals: string[];
}

export interface ResolutionSuggestion {
  id: string;
  type: SuggestionType;
  description: string;
  implementation: string;
  confidence: number;
  tradeoffs: string[];
  estimated_impact: ImpactEstimate;
}

export interface ImpactEstimate {
  performance: number;
  risk: number;
  complexity: number;
  maintenance: number;
}

export interface AppliedResolution {
  id: string;
  conflictId: string;
  method: ResolutionMethod;
  parameters: ResolutionParameters;
  result: ResolutionResult;
  validation: ResolutionValidationResult;
}

export interface ResolutionParameters {
  weights: Record<string, number>;
  thresholds: Record<string, number>;
  overrides: Record<string, any>;
  constraints: Record<string, any>;
}

export interface ResolutionResult {
  success: boolean;
  outcome: string;
  changes: ChangeRecord[];
  warnings: string[];
  errors: string[];
  metrics: ResolutionMetrics;
}

export interface ChangeRecord {
  id: string;
  type: ChangeType;
  target: string;
  before: any;
  after: any;
  reason: string;
}

export interface ResolutionMetrics {
  processingTime: number;
  complexity: number;
  confidence: number;
  stability: number;
  performance_impact: number;
}

export interface MergePreview {
  summary: PreviewSummary;
  signalComparison: SignalComparison[];
  weightDistribution: WeightDistribution[];
  riskProfile: RiskProfile;
  expectedPerformance: PerformanceProjection;
  recommendations: PreviewRecommendation[];
}

export interface PreviewSummary {
  totalSignals: number;
  activeSignals: number;
  conflictCount: number;
  unresolvedConflicts: number;
  overallScore: number;
  complexityIncrease: number;
}

export interface SignalComparison {
  signalId: string;
  beforeMerge: SignalMetrics;
  afterMerge: SignalMetrics;
  change: SignalChange;
}

export interface SignalMetrics {
  strength: number;
  confidence: number;
  weight: number;
  coverage: number;
  reliability: number;
}

export interface SignalChange {
  strengthDelta: number;
  confidenceDelta: number;
  weightDelta: number;
  coverageDelta: number;
  reliabilityDelta: number;
}

export interface WeightDistribution {
  overlayId: string;
  originalWeight: number;
  mergedWeight: number;
  allocation: AssetAllocation[];
  normalization: NormalizationInfo;
}

export interface AssetAllocation {
  asset: string;
  weight: number;
  confidence: number;
  sources: string[];
}

export interface NormalizationInfo {
  method: string;
  factor: number;
  adjustments: Record<string, number>;
}

export interface RiskProfile {
  overall: RiskMetrics;
  byAsset: AssetRiskProfile[];
  correlations: CorrelationMatrix;
  concentrations: ConcentrationRisk[];
  limits: RiskLimitStatus[];
}

export interface RiskMetrics {
  volatility: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface AssetRiskProfile {
  asset: string;
  weight: number;
  volatility: number;
  beta: number;
  tracking_error: number;
  concentration: number;
}

export interface CorrelationMatrix {
  assets: string[];
  correlations: number[][];
  eigenvalues: number[];
  diversification: number;
}

export interface ConcentrationRisk {
  type: string;
  value: number;
  threshold: number;
  excess: number;
  mitigation: string;
}

export interface RiskLimitStatus {
  limit: string;
  current: number;
  threshold: number;
  status: LimitStatus;
  action: string;
}

export interface PerformanceProjection {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  information_ratio: number;
  tracking_error: number;
  confidence_interval: ConfidenceInterval;
  scenarios: PerformanceScenario[];
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number;
}

export interface PerformanceScenario {
  name: string;
  probability: number;
  return: number;
  volatility: number;
  conditions: string[];
}

export interface PreviewRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  description: string;
  rationale: string;
  implementation: string;
  impact: RecommendationImpact;
}

export interface RecommendationImpact {
  performance: number;
  risk: number;
  complexity: number;
  maintenance: number;
}

export interface MergeValidation {
  isValid: boolean;
  score: number;
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
  errors: ValidationError[];
  recommendations: ValidationRecommendation[];
}

export interface ValidationCheck {
  id: string;
  name: string;
  passed: boolean;
  score: number;
  details: string;
  critical: boolean;
}

export interface ValidationWarning {
  id: string;
  type: WarningType;
  message: string;
  severity: WarningSeverity;
  recommendation: string;
}

export interface ValidationError {
  id: string;
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  resolution: string;
}

export interface ValidationRecommendation {
  id: string;
  type: string;
  description: string;
  benefit: string;
  effort: string;
}

export interface MergeMetadata {
  algorithm: string;
  version: string;
  processingTime: number;
  memoryUsage: number;
  complexity: number;
  confidence: number;
  stability: number;
  performance_estimate: number;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

// Type definitions
export type OverlayType = 'signal' | 'filter' | 'transformer' | 'aggregator' | 'composite';
export type OverlayCategory = 'technical' | 'fundamental' | 'sentiment' | 'macro' | 'risk' | 'execution';
export type SignalType = 'buy' | 'sell' | 'hold' | 'strength' | 'momentum' | 'volatility' | 'custom';
export type SignalDirection = 'bullish' | 'bearish' | 'neutral' | 'mixed';
export type RuleType = 'inclusion' | 'exclusion' | 'modification' | 'validation' | 'trigger';
export type FilterType = 'asset' | 'time' | 'value' | 'correlation' | 'volatility' | 'custom';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'between';
export type ParameterType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'date' | 'custom';
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very_high';
export type MergeType = 'union' | 'intersection' | 'weighted_average' | 'prioritized' | 'custom';
export type WeightingMethod = 'equal' | 'performance' | 'confidence' | 'reliability' | 'custom';
export type AggregationMethod = 'sum' | 'average' | 'median' | 'max' | 'min' | 'weighted' | 'custom';
export type PriorityMethod = 'fifo' | 'lifo' | 'weight' | 'performance' | 'reliability' | 'custom';
export type NormalizationMethod = 'none' | 'zscore' | 'minmax' | 'quantile' | 'custom';
export type TimeAlignment = 'strict' | 'flexible' | 'interpolated' | 'nearest';
export type AssetAlignment = 'strict' | 'flexible' | 'mapped' | 'expanded';
export type ResolutionStrategy = 'automatic' | 'manual' | 'hybrid' | 'escalate';
export type FallbackAction = 'use_default' | 'use_best' | 'merge_partial' | 'abort' | 'escalate';
export type MergeStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type MergeResultStatus = 'success' | 'partial' | 'failed' | 'warning';
export type ConflictType = 'weight_overlap' | 'asset_contention' | 'signal_collision' | 'rule_conflict' | 'dependency_cycle' | 'parameter_mismatch';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionType = 'automatic' | 'weighted' | 'priority' | 'manual' | 'custom';
export type ResolutionMethod = 'override' | 'merge' | 'average' | 'prioritize' | 'exclude' | 'modify';
export type ChangeType = 'add' | 'remove' | 'modify' | 'merge' | 'split';
export type LimitStatus = 'within' | 'approaching' | 'exceeded' | 'critical';
export type RecommendationType = 'optimization' | 'risk_mitigation' | 'simplification' | 'enhancement';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type WarningType = 'performance' | 'risk' | 'complexity' | 'maintenance';
export type WarningSeverity = 'info' | 'warning' | 'error';
export type ErrorType = 'validation' | 'conflict' | 'dependency' | 'constraint';
export type ErrorSeverity = 'minor' | 'major' | 'critical' | 'blocking';

// Supporting interfaces
export interface SignalCondition {
  field: string;
  operator: string;
  value: any;
  logic: string;
}

export interface SignalTrigger {
  event: string;
  condition: SignalCondition;
  action: string;
}

export interface SignalOutput {
  name: string;
  type: string;
  format: string;
  destination: string;
}

export interface SignalValidation {
  rules: string[];
  thresholds: Record<string, number>;
  dependencies: string[];
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  context: string;
}

export interface RuleAction {
  type: string;
  parameters: Record<string, any>;
  target: string;
}

export interface RuleException {
  condition: RuleCondition;
  action: string;
  reason: string;
}

export interface FilterCriteria {
  field: string;
  conditions: FilterCondition[];
  logic: string;
}

export interface FilterCondition {
  operator: string;
  value: any;
  weight: number;
}

export interface ParameterValidation {
  required: boolean;
  type: string;
  constraints: Record<string, any>;
  dependencies: string[];
}

export interface PerformanceStats {
  latency: number;
  throughput: number;
  accuracy: number;
  efficiency: number;
}

export interface ReliabilityStats {
  uptime: number;
  error_rate: number;
  consistency: number;
  stability: number;
}

export interface RiskLimits {
  maxWeight: number;
  maxConcentration: number;
  maxVolatility: number;
  maxDrawdown: number;
  maxLeverage: number;
}

export interface ResolutionRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
}

export interface ResolutionOverride {
  conflictId: string;
  method: string;
  parameters: Record<string, any>;
  reason: string;
}

export interface ResolutionValidation {
  required: boolean;
  strictness: string;
  tolerances: Record<string, number>;
}

export interface ResolutionValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/overlay-merge-handler';

async function fetchOverlayConfigurations(): Promise<OverlayConfiguration[]> {
  const response = await fetch(`${API_BASE}/overlays`);
  if (!response.ok) throw new Error(`Failed to fetch overlay configurations: ${response.statusText}`);
  return response.json();
}

async function generateMergePreview(overlayIds: string[], strategy: MergeStrategy): Promise<MergePreview> {
  const response = await fetch(`${API_BASE}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overlayIds, strategy }),
  });
  if (!response.ok) throw new Error(`Failed to generate merge preview: ${response.statusText}`);
  return response.json();
}

async function detectConflicts(overlayIds: string[]): Promise<DetectedConflict[]> {
  const response = await fetch(`${API_BASE}/conflicts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overlayIds }),
  });
  if (!response.ok) throw new Error(`Failed to detect conflicts: ${response.statusText}`);
  return response.json();
}

async function resolveMergeConflict(conflictId: string, resolution: AppliedResolution): Promise<ResolutionResult> {
  const response = await fetch(`${API_BASE}/conflicts/${conflictId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolution),
  });
  if (!response.ok) throw new Error(`Failed to resolve conflict: ${response.statusText}`);
  return response.json();
}

async function executeMerge(request: MergeRequest): Promise<MergeResult> {
  const response = await fetch(`${API_BASE}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Failed to execute merge: ${response.statusText}`);
  return response.json();
}

async function validateMergeResult(resultId: string): Promise<MergeValidation> {
  const response = await fetch(`${API_BASE}/results/${resultId}/validate`);
  if (!response.ok) throw new Error(`Failed to validate merge result: ${response.statusText}`);
  return response.json();
}

async function saveMergedOverlay(overlay: OverlayConfiguration): Promise<OverlayConfiguration> {
  const response = await fetch(`${API_BASE}/overlays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(overlay),
  });
  if (!response.ok) throw new Error(`Failed to save merged overlay: ${response.statusText}`);
  return response.json();
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

export function useOverlayConfigurations() {
  return useQuery({
    queryKey: ['overlay-configurations'],
    queryFn: fetchOverlayConfigurations,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useOverlayMergePreview(userId: string) {
  return useMutation({
    mutationFn: ({ overlayIds, strategy }: { overlayIds: string[]; strategy: MergeStrategy }) =>
      generateMergePreview(overlayIds, strategy),
    onSuccess: (preview, { overlayIds, strategy }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'generate_merge_preview',
        timestamp: new Date().toISOString(),
        details: {
          overlayIds,
          strategy: strategy.type,
          totalSignals: preview.summary.totalSignals,
          conflictCount: preview.summary.conflictCount,
          overallScore: preview.summary.overallScore,
        },
      });
    },
  });
}

export function useDetectConflicts(userId: string) {
  return useMutation({
    mutationFn: (overlayIds: string[]) => detectConflicts(overlayIds),
    onSuccess: (conflicts, overlayIds) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'detect_conflicts',
        timestamp: new Date().toISOString(),
        details: {
          overlayIds,
          conflictCount: conflicts.length,
          severityBreakdown: conflicts.reduce((acc, conflict) => {
            acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          autoResolvableCount: conflicts.filter(c => c.autoResolvable).length,
        },
      });
    },
  });
}

export function useResolveConflict(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conflictId, resolution }: { conflictId: string; resolution: AppliedResolution }) =>
      resolveMergeConflict(conflictId, resolution),
    onSuccess: (result, { conflictId, resolution }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'resolve_conflict',
        timestamp: new Date().toISOString(),
        details: {
          conflictId,
          resolutionMethod: resolution.method,
          success: result.success,
          outcome: result.outcome,
          warnings: result.warnings.length,
          errors: result.errors.length,
          processingTime: result.metrics.processingTime,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['overlay-merge-preview'] });
    },
  });
}

export function useApplyMerge(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: MergeRequest) => executeMerge(request),
    onSuccess: (result, request) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'apply_merge',
        timestamp: new Date().toISOString(),
        details: {
          requestId: request.id,
          resultId: result.id,
          overlaysCount: request.overlays.length,
          mergeStrategy: request.strategy.type,
          conflictsResolved: result.resolutions.length,
          validationScore: result.validation.score,
          status: result.status,
          processingTime: result.metadata.processingTime,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['overlay-configurations'] });
    },
  });
}

export function useValidateMergeResult(userId: string) {
  return useMutation({
    mutationFn: (resultId: string) => validateMergeResult(resultId),
    onSuccess: (validation, resultId) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'validate_merge_result',
        timestamp: new Date().toISOString(),
        details: {
          resultId,
          isValid: validation.isValid,
          score: validation.score,
          checksCount: validation.checks.length,
          warningsCount: validation.warnings.length,
          errorsCount: validation.errors.length,
        },
      });
    },
  });
}

export function useSaveMergedOverlay(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (overlay: OverlayConfiguration) => saveMergedOverlay(overlay),
    onSuccess: (savedOverlay) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-56',
        userId,
        action: 'save_merged_overlay',
        timestamp: new Date().toISOString(),
        details: {
          overlayId: savedOverlay.id,
          overlayName: savedOverlay.name,
          overlayType: savedOverlay.type,
          signalsCount: savedOverlay.signals.length,
          rulesCount: savedOverlay.rules.length,
          complexity: savedOverlay.metadata.complexity,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['overlay-configurations'] });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useOverlayMergeHandlerUtils(userId: string) {
  const formatOverlayType = useCallback((type: OverlayType): string => {
    const labels: Record<OverlayType, string> = {
      signal: 'Signal',
      filter: 'Filter',
      transformer: 'Transformer',
      aggregator: 'Aggregator',
      composite: 'Composite',
    };
    return labels[type] || type;
  }, []);

  const formatConflictSeverity = useCallback((severity: ConflictSeverity): string => {
    const labels: Record<ConflictSeverity, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    };
    return labels[severity] || severity;
  }, []);

  const getConflictSeverityColor = useCallback((severity: ConflictSeverity): string => {
    const colors: Record<ConflictSeverity, string> = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12',
    };
    return colors[severity] || '#6B7280';
  }, []);

  const calculateMergeComplexity = useCallback((overlays: OverlayConfiguration[]): number => {
    return overlays.reduce((total, overlay) => {
      const complexityValue = overlay.metadata.complexity === 'low' ? 1 :
                             overlay.metadata.complexity === 'medium' ? 2 :
                             overlay.metadata.complexity === 'high' ? 3 : 4;
      return total + complexityValue * overlay.signals.length;
    }, 0);
  }, []);

  const generateMergeReport = useCallback((result: MergeResult): string => {
    const report = `
# Overlay Merge Report

## Summary
- Merge ID: ${result.id}
- Status: ${result.status}
- Timestamp: ${new Date(result.timestamp).toLocaleString()}
- Processing Time: ${result.metadata.processingTime}ms

## Merged Overlay Details
- Name: ${result.mergedOverlay.name}
- Type: ${result.mergedOverlay.type}
- Signals: ${result.mergedOverlay.signals.length}
- Rules: ${result.mergedOverlay.rules.length}
- Complexity: ${result.mergedOverlay.metadata.complexity}

## Conflicts & Resolutions
- Total Conflicts: ${result.conflicts.length}
- Resolved Conflicts: ${result.resolutions.length}
- Auto-resolved: ${result.conflicts.filter(c => c.autoResolvable).length}

${result.conflicts.map((conflict, index) => `
### Conflict ${index + 1}: ${conflict.type}
- Severity: ${conflict.severity}
- Description: ${conflict.description}
- Impact: Performance ${(conflict.impact.performance * 100).toFixed(1)}%, Risk ${(conflict.impact.riskIncrease * 100).toFixed(1)}%
- Resolution: ${result.resolutions.find(r => r.conflictId === conflict.id)?.method || 'Pending'}
`).join('')}

## Validation Results
- Valid: ${result.validation.isValid ? 'Yes' : 'No'}
- Score: ${result.validation.score.toFixed(2)}
- Checks Passed: ${result.validation.checks.filter(c => c.passed).length}/${result.validation.checks.length}
- Warnings: ${result.validation.warnings.length}
- Errors: ${result.validation.errors.length}

## Performance Estimates
- Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%
- Stability: ${(result.metadata.stability * 100).toFixed(1)}%
- Performance Estimate: ${(result.metadata.performance_estimate * 100).toFixed(1)}%
`;
    return report;
  }, []);

  return useMemo(() => ({
    formatOverlayType,
    formatConflictSeverity,
    getConflictSeverityColor,
    calculateMergeComplexity,
    generateMergeReport,
  }), [
    formatOverlayType,
    formatConflictSeverity,
    getConflictSeverityColor,
    calculateMergeComplexity,
    generateMergeReport,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const overlayMergeHandlerService = {
  // API functions
  fetchOverlayConfigurations,
  generateMergePreview,
  detectConflicts,
  resolveMergeConflict,
  executeMerge,
  validateMergeResult,
  saveMergedOverlay,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    overlays: () => ['overlay-configurations'],
    preview: (overlayIds: string[], strategy: MergeStrategy) => ['overlay-merge-preview', overlayIds, strategy],
    conflicts: (overlayIds: string[]) => ['overlay-conflicts', overlayIds],
    validation: (resultId: string) => ['merge-validation', resultId],
  },
  
  // Utility functions
  utils: {
    formatOverlayType: (type: OverlayType) => {
      const labels: Record<OverlayType, string> = {
        signal: 'Signal',
        filter: 'Filter',
        transformer: 'Transformer',
        aggregator: 'Aggregator',
        composite: 'Composite',
      };
      return labels[type] || type;
    },
    formatConflictSeverity: (severity: ConflictSeverity) => {
      const labels: Record<ConflictSeverity, string> = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
      };
      return labels[severity] || severity;
    },
  },
}; 