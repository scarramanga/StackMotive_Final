import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface OverlayBlock {
  id: string;
  type: OverlayBlockType;
  name: string;
  description: string;
  category: OverlayCategory;
  version: string;
  inputs: OverlayInput[];
  outputs: OverlayOutput[];
  parameters: OverlayParameter[];
  metadata: OverlayBlockMetadata;
  isActive: boolean;
  position: Position;
  size: Size;
  connections: Connection[];
}

export interface OverlayBlockMetadata {
  author: string;
  created: string;
  modified: string;
  tags: string[];
  complexity: ComplexityLevel;
  performance: PerformanceMetrics;
  validation: ValidationStatus;
  documentation: string;
  examples: string[];
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  reliability: number;
  scalability: number;
}

export interface ValidationStatus {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  lastValidated: string;
  validator: string;
}

export type OverlayBlockType = 
  | 'signal_generator'
  | 'filter'
  | 'transformer'
  | 'combiner'
  | 'weight_calculator'
  | 'risk_manager'
  | 'execution_trigger'
  | 'data_source'
  | 'output_formatter'
  | 'custom_logic';

export type OverlayCategory = 
  | 'technical_analysis'
  | 'fundamental_analysis'
  | 'sentiment_analysis'
  | 'macro_economic'
  | 'risk_management'
  | 'execution_control'
  | 'data_processing'
  | 'utility'
  | 'custom';

export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export interface OverlayInput {
  id: string;
  name: string;
  type: DataType;
  required: boolean;
  description: string;
  validation: InputValidation;
  defaultValue?: any;
  examples: any[];
}

export interface OverlayOutput {
  id: string;
  name: string;
  type: DataType;
  description: string;
  format: OutputFormat;
  metadata: OutputMetadata;
}

export interface OutputMetadata {
  unit: string;
  range: { min: number; max: number };
  precision: number;
  updateFrequency: string;
}

export interface OverlayParameter {
  id: string;
  name: string;
  type: ParameterType;
  value: any;
  description: string;
  validation: ParameterValidation;
  ui: ParameterUI;
  isAdvanced: boolean;
  dependencies: string[];
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
  component: UIComponent;
  props: Record<string, any>;
  label: string;
  placeholder?: string;
  helpText?: string;
  group?: string;
}

export type DataType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'array'
  | 'object'
  | 'price_series'
  | 'volume_series'
  | 'signal'
  | 'weight'
  | 'timestamp';

export type ParameterType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'range'
  | 'date'
  | 'time'
  | 'color'
  | 'asset'
  | 'strategy';

export type UIComponent = 
  | 'input'
  | 'select'
  | 'multiselect'
  | 'slider'
  | 'range'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'datepicker'
  | 'colorpicker'
  | 'assetpicker'
  | 'strategypicker';

export type OutputFormat = 
  | 'scalar'
  | 'series'
  | 'signal'
  | 'weight_vector'
  | 'action'
  | 'notification'
  | 'custom';

export interface InputValidation {
  required: boolean;
  type: DataType;
  format?: string;
  constraints: ValidationConstraint[];
}

export interface ValidationConstraint {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: any;
  message: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  sourceBlockId: string;
  sourceOutputId: string;
  targetBlockId: string;
  targetInputId: string;
  type: ConnectionType;
  weight: number;
  isActive: boolean;
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  created: string;
  modified: string;
  latency: number;
  throughput: number;
  reliability: number;
  dataFlow: DataFlowInfo;
}

export interface DataFlowInfo {
  sampleRate: number;
  bufferSize: number;
  compression: boolean;
  encryption: boolean;
}

export type ConnectionType = 
  | 'data'
  | 'signal'
  | 'control'
  | 'trigger'
  | 'feedback';

export interface OverlayCanvas {
  id: string;
  name: string;
  description: string;
  userId: string;
  blocks: OverlayBlock[];
  connections: Connection[];
  metadata: CanvasMetadata;
  configuration: CanvasConfiguration;
  version: string;
  isActive: boolean;
  tags: string[];
}

export interface CanvasMetadata {
  created: string;
  modified: string;
  author: string;
  version: string;
  complexity: ComplexityLevel;
  performance: CanvasPerformance;
  validation: CanvasValidation;
  deployment: DeploymentInfo;
}

export interface CanvasPerformance {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  reliability: number;
  scalability: number;
}

export interface CanvasValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  lastValidated: string;
  validator: string;
}

export interface ValidationError {
  id: string;
  type: ErrorType;
  message: string;
  blockId?: string;
  connectionId?: string;
  severity: ErrorSeverity;
  suggestions: string[];
}

export interface ValidationWarning {
  id: string;
  type: WarningType;
  message: string;
  blockId?: string;
  connectionId?: string;
  impact: ImpactLevel;
  recommendation: string;
}

export type ErrorType = 
  | 'missing_connection'
  | 'invalid_parameter'
  | 'type_mismatch'
  | 'circular_dependency'
  | 'resource_conflict'
  | 'performance_issue'
  | 'security_violation'
  | 'compliance_violation';

export type WarningType = 
  | 'performance_degradation'
  | 'resource_usage'
  | 'deprecated_feature'
  | 'suboptimal_configuration'
  | 'missing_optimization';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface DeploymentInfo {
  environment: string;
  status: DeploymentStatus;
  lastDeployed: string;
  version: string;
  health: HealthStatus;
}

export type DeploymentStatus = 'draft' | 'testing' | 'staging' | 'production' | 'archived';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface CanvasConfiguration {
  grid: GridConfiguration;
  zoom: ZoomConfiguration;
  theme: ThemeConfiguration;
  behavior: BehaviorConfiguration;
  constraints: ConstraintConfiguration;
}

export interface GridConfiguration {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snapToGrid: boolean;
}

export interface ZoomConfiguration {
  min: number;
  max: number;
  default: number;
  step: number;
  wheelEnabled: boolean;
  touchEnabled: boolean;
}

export interface ThemeConfiguration {
  background: string;
  foreground: string;
  accent: string;
  border: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

export interface BehaviorConfiguration {
  autoSave: boolean;
  autoValidate: boolean;
  showTooltips: boolean;
  enableAnimations: boolean;
  dragEnabled: boolean;
  multiSelect: boolean;
  contextMenu: boolean;
  keyboardShortcuts: boolean;
}

export interface ConstraintConfiguration {
  maxBlocks: number;
  maxConnections: number;
  maxNesting: number;
  allowCircularDependencies: boolean;
  enforceTypes: boolean;
  requireValidation: boolean;
}

export interface OverlaySimulationRequest {
  canvasId: string;
  timeRange: TimeRange;
  assets: string[];
  parameters: Record<string, any>;
  options: SimulationOptions;
}

export interface TimeRange {
  start: string;
  end: string;
  interval: string;
}

export interface SimulationOptions {
  mode: SimulationMode;
  resolution: number;
  includeMetrics: boolean;
  includeVisualization: boolean;
  realtime: boolean;
  caching: boolean;
}

export type SimulationMode = 'historical' | 'realtime' | 'hybrid';

export interface OverlaySimulationResult {
  id: string;
  canvasId: string;
  request: OverlaySimulationRequest;
  results: SimulationData;
  metrics: SimulationMetrics;
  visualization: VisualizationData;
  status: SimulationStatus;
  timestamp: string;
  duration: number;
}

export interface SimulationData {
  signals: SignalData[];
  weights: WeightData[];
  actions: ActionData[];
  performance: PerformanceData[];
  events: EventData[];
}

export interface SignalData {
  timestamp: string;
  blockId: string;
  signal: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface WeightData {
  timestamp: string;
  asset: string;
  weight: number;
  change: number;
  reason: string;
}

export interface ActionData {
  timestamp: string;
  type: ActionType;
  asset: string;
  amount: number;
  price: number;
  metadata: Record<string, any>;
}

export interface PerformanceData {
  timestamp: string;
  returns: number;
  volatility: number;
  sharpe: number;
  drawdown: number;
  alpha: number;
  beta: number;
}

export interface EventData {
  timestamp: string;
  type: EventType;
  message: string;
  severity: EventSeverity;
  metadata: Record<string, any>;
}

export type ActionType = 'buy' | 'sell' | 'hold' | 'rebalance' | 'hedge';
export type EventType = 'signal' | 'warning' | 'error' | 'info' | 'debug';
export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SimulationMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  dataProcessed: number;
  signalsGenerated: number;
  actionsExecuted: number;
  accuracy: number;
  reliability: number;
}

export interface VisualizationData {
  charts: ChartData[];
  tables: TableData[];
  indicators: IndicatorData[];
  annotations: AnnotationData[];
}

export interface ChartData {
  id: string;
  type: ChartType;
  data: any[];
  config: ChartConfig;
}

export interface TableData {
  id: string;
  columns: ColumnDefinition[];
  data: any[];
  config: TableConfig;
}

export interface IndicatorData {
  id: string;
  type: IndicatorType;
  value: number;
  change: number;
  status: IndicatorStatus;
  config: IndicatorConfig;
}

export interface AnnotationData {
  id: string;
  type: AnnotationType;
  position: Position;
  text: string;
  style: AnnotationStyle;
}

export type ChartType = 'line' | 'bar' | 'candlestick' | 'heatmap' | 'scatter';
export type IndicatorType = 'gauge' | 'progress' | 'metric' | 'status';
export type AnnotationType = 'text' | 'arrow' | 'box' | 'line' | 'marker';
export type IndicatorStatus = 'success' | 'warning' | 'error' | 'neutral';
export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ChartConfig {
  title: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  colors: string[];
  theme: string;
}

export interface AxisConfig {
  label: string;
  type: AxisType;
  format: string;
  min?: number;
  max?: number;
}

export type AxisType = 'linear' | 'logarithmic' | 'datetime' | 'category';

export interface TableConfig {
  title: string;
  pageSize: number;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
}

export interface ColumnDefinition {
  id: string;
  header: string;
  type: ColumnType;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  formatter?: string;
}

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';

export interface IndicatorConfig {
  title: string;
  unit: string;
  format: string;
  min?: number;
  max?: number;
  thresholds?: Threshold[];
}

export interface Threshold {
  value: number;
  color: string;
  label: string;
}

export interface AnnotationStyle {
  color: string;
  size: number;
  font: string;
  opacity: number;
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

const API_BASE = '/api/overlay-builder';

async function fetchAvailableBlocks(category?: OverlayCategory): Promise<OverlayBlock[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  
  const response = await fetch(`${API_BASE}/blocks?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch overlay blocks: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchCanvas(canvasId: string): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchUserCanvases(userId: string): Promise<OverlayCanvas[]> {
  const response = await fetch(`${API_BASE}/canvas?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user canvases: ${response.statusText}`);
  }
  
  return response.json();
}

async function createCanvas(userId: string, name: string, description: string): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      userId,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateCanvas(canvasId: string, updates: Partial<OverlayCanvas>): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}`, {
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
    throw new Error(`Failed to update canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function deleteCanvas(canvasId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete canvas: ${response.statusText}`);
  }
}

async function addBlockToCanvas(canvasId: string, block: OverlayBlock): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(block),
  });

  if (!response.ok) {
    throw new Error(`Failed to add block to canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function removeBlockFromCanvas(canvasId: string, blockId: string): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/blocks/${blockId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to remove block from canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateBlockInCanvas(
  canvasId: string,
  blockId: string,
  updates: Partial<OverlayBlock>
): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/blocks/${blockId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update block in canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function createConnection(canvasId: string, connection: Connection): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(connection),
  });

  if (!response.ok) {
    throw new Error(`Failed to create connection: ${response.statusText}`);
  }
  
  return response.json();
}

async function deleteConnection(canvasId: string, connectionId: string): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/connections/${connectionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete connection: ${response.statusText}`);
  }
  
  return response.json();
}

async function validateCanvas(canvasId: string): Promise<CanvasValidation> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/validate`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to validate canvas: ${response.statusText}`);
  }
  
  return response.json();
}

async function simulateOverlay(request: OverlaySimulationRequest): Promise<OverlaySimulationResult> {
  const response = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to simulate overlay: ${response.statusText}`);
  }
  
  return response.json();
}

async function saveCanvas(canvasId: string, userId: string): Promise<OverlayCanvas> {
  const response = await fetch(`${API_BASE}/canvas/${canvasId}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save canvas: ${response.statusText}`);
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

export function useAvailableBlocks(category?: OverlayCategory) {
  return useQuery({
    queryKey: ['overlay-blocks', category],
    queryFn: () => fetchAvailableBlocks(category),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useCanvas(canvasId: string) {
  return useQuery({
    queryKey: ['overlay-canvas', canvasId],
    queryFn: () => fetchCanvas(canvasId),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!canvasId,
  });
}

export function useUserCanvases(userId: string) {
  return useQuery({
    queryKey: ['overlay-canvases', userId],
    queryFn: () => fetchUserCanvases(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useCreateCanvas(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      createCanvas(userId, name, description),
    onSuccess: (newCanvas) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'create_canvas',
        timestamp: new Date().toISOString(),
        details: {
          canvasId: newCanvas.id,
          name: newCanvas.name,
          description: newCanvas.description,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['overlay-canvases', userId] });
    },
  });
}

export function useUpdateCanvas(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: Partial<OverlayCanvas>) => updateCanvas(canvasId, updates),
    onSuccess: (updatedCanvas) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'update_canvas',
        timestamp: new Date().toISOString(),
        details: {
          canvasId: updatedCanvas.id,
          updates: Object.keys(updates),
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
      queryClient.invalidateQueries({ queryKey: ['overlay-canvases', userId] });
    },
  });
}

export function useDeleteCanvas(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (canvasId: string) => deleteCanvas(canvasId),
    onSuccess: (_, canvasId) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'delete_canvas',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
        },
      });
      
      // Update cache
      queryClient.removeQueries({ queryKey: ['overlay-canvas', canvasId] });
      queryClient.invalidateQueries({ queryKey: ['overlay-canvases', userId] });
    },
  });
}

export function useAddBlockToCanvas(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (block: OverlayBlock) => addBlockToCanvas(canvasId, block),
    onSuccess: (updatedCanvas, block) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'add_block',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          blockId: block.id,
          blockType: block.type,
          blockName: block.name,
          position: block.position,
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
    },
  });
}

export function useRemoveBlockFromCanvas(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (blockId: string) => removeBlockFromCanvas(canvasId, blockId),
    onSuccess: (updatedCanvas, blockId) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'remove_block',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          blockId,
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
    },
  });
}

export function useUpdateBlockInCanvas(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ blockId, updates }: { blockId: string; updates: Partial<OverlayBlock> }) =>
      updateBlockInCanvas(canvasId, blockId, updates),
    onSuccess: (updatedCanvas, { blockId, updates }) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'update_block',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          blockId,
          updates: Object.keys(updates),
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
    },
  });
}

export function useCreateConnection(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (connection: Connection) => createConnection(canvasId, connection),
    onSuccess: (updatedCanvas, connection) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'create_connection',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          connectionId: connection.id,
          sourceBlockId: connection.sourceBlockId,
          targetBlockId: connection.targetBlockId,
          connectionType: connection.type,
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
    },
  });
}

export function useDeleteConnection(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (connectionId: string) => deleteConnection(canvasId, connectionId),
    onSuccess: (updatedCanvas, connectionId) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'delete_connection',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          connectionId,
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], updatedCanvas);
    },
  });
}

export function useValidateCanvas(canvasId: string, userId: string) {
  return useMutation({
    mutationFn: () => validateCanvas(canvasId),
    onSuccess: (validation) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'validate_canvas',
        timestamp: new Date().toISOString(),
        details: {
          canvasId,
          isValid: validation.isValid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length,
        },
      });
    },
  });
}

export function useSimulateOverlay(userId: string) {
  return useMutation({
    mutationFn: (request: OverlaySimulationRequest) => simulateOverlay(request),
    onSuccess: (result, request) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'simulate_overlay',
        timestamp: new Date().toISOString(),
        details: {
          simulationId: result.id,
          canvasId: request.canvasId,
          timeRange: request.timeRange,
          assets: request.assets,
          status: result.status,
          duration: result.duration,
        },
      });
    },
  });
}

export function useSaveCanvas(canvasId: string, userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => saveCanvas(canvasId, userId),
    onSuccess: (savedCanvas) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-51',
        userId,
        action: 'save_canvas',
        timestamp: new Date().toISOString(),
        details: {
          canvasId: savedCanvas.id,
          version: savedCanvas.version,
          blockCount: savedCanvas.blocks.length,
          connectionCount: savedCanvas.connections.length,
        },
      });
      
      // Update cache
      queryClient.setQueryData(['overlay-canvas', canvasId], savedCanvas);
      queryClient.invalidateQueries({ queryKey: ['overlay-canvases', userId] });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useOverlayBuilderUtils(userId: string) {
  const formatBlockType = useCallback((type: OverlayBlockType): string => {
    const labels: Record<OverlayBlockType, string> = {
      signal_generator: 'Signal Generator',
      filter: 'Filter',
      transformer: 'Transformer',
      combiner: 'Combiner',
      weight_calculator: 'Weight Calculator',
      risk_manager: 'Risk Manager',
      execution_trigger: 'Execution Trigger',
      data_source: 'Data Source',
      output_formatter: 'Output Formatter',
      custom_logic: 'Custom Logic',
    };
    return labels[type] || type;
  }, []);

  const formatCategory = useCallback((category: OverlayCategory): string => {
    const labels: Record<OverlayCategory, string> = {
      technical_analysis: 'Technical Analysis',
      fundamental_analysis: 'Fundamental Analysis',
      sentiment_analysis: 'Sentiment Analysis',
      macro_economic: 'Macro Economic',
      risk_management: 'Risk Management',
      execution_control: 'Execution Control',
      data_processing: 'Data Processing',
      utility: 'Utility',
      custom: 'Custom',
    };
    return labels[category] || category;
  }, []);

  const getComplexityColor = useCallback((complexity: ComplexityLevel): string => {
    const colors: Record<ComplexityLevel, string> = {
      basic: '#10B981',
      intermediate: '#F59E0B',
      advanced: '#EF4444',
      expert: '#7C2D12',
    };
    return colors[complexity] || '#6B7280';
  }, []);

  const validateConnection = useCallback((
    sourceBlock: OverlayBlock,
    sourceOutputId: string,
    targetBlock: OverlayBlock,
    targetInputId: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if output exists
    const sourceOutput = sourceBlock.outputs.find(o => o.id === sourceOutputId);
    if (!sourceOutput) {
      errors.push('Source output not found');
    }
    
    // Check if input exists
    const targetInput = targetBlock.inputs.find(i => i.id === targetInputId);
    if (!targetInput) {
      errors.push('Target input not found');
    }
    
    // Check type compatibility
    if (sourceOutput && targetInput && sourceOutput.type !== targetInput.type) {
      errors.push('Type mismatch between output and input');
    }
    
    // Check if input is already connected
    if (targetInput && !targetInput.required) {
      errors.push('Input already has a connection');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const findCircularDependencies = useCallback((canvas: OverlayCanvas): string[] => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];
    
    const dfs = (blockId: string, path: string[]): void => {
      if (recursionStack.has(blockId)) {
        cycles.push(path.join(' → '));
        return;
      }
      
      if (visited.has(blockId)) return;
      
      visited.add(blockId);
      recursionStack.add(blockId);
      
      const connections = canvas.connections.filter(c => c.sourceBlockId === blockId);
      for (const connection of connections) {
        dfs(connection.targetBlockId, [...path, connection.targetBlockId]);
      }
      
      recursionStack.delete(blockId);
    };
    
    for (const block of canvas.blocks) {
      if (!visited.has(block.id)) {
        dfs(block.id, [block.id]);
      }
    }
    
    return cycles;
  }, []);

  const calculateCanvasMetrics = useCallback((canvas: OverlayCanvas): CanvasPerformance => {
    const totalBlocks = canvas.blocks.length;
    const totalConnections = canvas.connections.length;
    const complexity = Math.max(totalBlocks, totalConnections);
    
    return {
      executionTime: complexity * 10, // Estimated in ms
      memoryUsage: totalBlocks * 1024 + totalConnections * 512, // Estimated in bytes
      cpuUsage: complexity * 0.1, // Estimated percentage
      throughput: Math.max(1, 1000 / complexity), // Estimated ops/sec
      reliability: Math.max(0, 1 - (complexity * 0.01)), // Estimated reliability
      scalability: Math.max(0, 1 - (complexity * 0.005)), // Estimated scalability
    };
  }, []);

  const exportCanvas = useCallback((canvas: OverlayCanvas, format: 'json' | 'yaml'): string => {
    const exportData = {
      id: canvas.id,
      name: canvas.name,
      description: canvas.description,
      version: canvas.version,
      blocks: canvas.blocks.map(block => ({
        id: block.id,
        type: block.type,
        name: block.name,
        position: block.position,
        parameters: block.parameters,
      })),
      connections: canvas.connections.map(conn => ({
        id: conn.id,
        source: conn.sourceBlockId,
        target: conn.targetBlockId,
        type: conn.type,
      })),
      metadata: {
        exported: new Date().toISOString(),
        version: canvas.version,
      },
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    // Basic YAML conversion
    return Object.entries(exportData).map(([key, value]) => 
      `${key}: ${JSON.stringify(value)}`
    ).join('\n');
  }, []);

  return useMemo(() => ({
    formatBlockType,
    formatCategory,
    getComplexityColor,
    validateConnection,
    findCircularDependencies,
    calculateCanvasMetrics,
    exportCanvas,
  }), [
    formatBlockType,
    formatCategory,
    getComplexityColor,
    validateConnection,
    findCircularDependencies,
    calculateCanvasMetrics,
    exportCanvas,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const overlayBuilderInterfaceService = {
  // API functions
  fetchAvailableBlocks,
  fetchCanvas,
  fetchUserCanvases,
  createCanvas,
  updateCanvas,
  deleteCanvas,
  addBlockToCanvas,
  removeBlockFromCanvas,
  updateBlockInCanvas,
  createConnection,
  deleteConnection,
  validateCanvas,
  simulateOverlay,
  saveCanvas,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    blocks: (category?: OverlayCategory) => ['overlay-blocks', category],
    canvas: (canvasId: string) => ['overlay-canvas', canvasId],
    canvases: (userId: string) => ['overlay-canvases', userId],
  },
  
  // Utility functions
  utils: {
    formatBlockType: (type: OverlayBlockType) => {
      const labels: Record<OverlayBlockType, string> = {
        signal_generator: 'Signal Generator',
        filter: 'Filter',
        transformer: 'Transformer',
        combiner: 'Combiner',
        weight_calculator: 'Weight Calculator',
        risk_manager: 'Risk Manager',
        execution_trigger: 'Execution Trigger',
        data_source: 'Data Source',
        output_formatter: 'Output Formatter',
        custom_logic: 'Custom Logic',
      };
      return labels[type] || type;
    },
    formatCategory: (category: OverlayCategory) => {
      const labels: Record<OverlayCategory, string> = {
        technical_analysis: 'Technical Analysis',
        fundamental_analysis: 'Fundamental Analysis',
        sentiment_analysis: 'Sentiment Analysis',
        macro_economic: 'Macro Economic',
        risk_management: 'Risk Management',
        execution_control: 'Execution Control',
        data_processing: 'Data Processing',
        utility: 'Utility',
        custom: 'Custom',
      };
      return labels[category] || category;
    },
    getComplexityColor: (complexity: ComplexityLevel) => {
      const colors: Record<ComplexityLevel, string> = {
        basic: '#10B981',
        intermediate: '#F59E0B',
        advanced: '#EF4444',
        expert: '#7C2D12',
      };
      return colors[complexity] || '#6B7280';
    },
  },
}; 