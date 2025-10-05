import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface ConfigChangeEntry {
  id: string;
  userId: string;
  blockId: string;
  category: ConfigCategory;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  sessionId: string;
  changeType: ChangeType;
  metadata: ConfigChangeMetadata;
}

export interface ConfigChangeMetadata {
  userAgent: string;
  ipAddress: string;
  source: ConfigChangeSource;
  version: string;
  description?: string;
  tags: string[];
  validation: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  performanceImpact: PerformanceImpact;
}

export interface PerformanceImpact {
  severity: 'low' | 'medium' | 'high';
  estimatedDelay: number;
  affectedComponents: string[];
}

export type ConfigCategory = 
  | 'strategy_weights'
  | 'thresholds'
  | 'exclusions'
  | 'display_settings'
  | 'risk_parameters'
  | 'execution_rules'
  | 'overlay_settings'
  | 'notification_preferences'
  | 'ui_preferences'
  | 'data_sources';

export type ChangeType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'revert'
  | 'bulk_update'
  | 'import'
  | 'reset';

export type ConfigChangeSource = 
  | 'manual'
  | 'import'
  | 'api'
  | 'system'
  | 'bulk_operation'
  | 'revert_operation';

export interface ConfigSnapshot {
  id: string;
  userId: string;
  timestamp: string;
  version: string;
  configState: Record<string, any>;
  hash: string;
  description: string;
  tags: string[];
  changeCount: number;
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  totalSize: number;
  compressionRatio: number;
  categories: ConfigCategory[];
  criticalChanges: number;
  performanceScore: number;
}

export interface ConfigDiff {
  id: string;
  fromVersion: string;
  toVersion: string;
  changes: DiffChange[];
  summary: DiffSummary;
  metadata: DiffMetadata;
}

export interface DiffChange {
  category: ConfigCategory;
  field: string;
  changeType: ChangeType;
  oldValue: any;
  newValue: any;
  path: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string[];
}

export interface DiffSummary {
  totalChanges: number;
  criticalChanges: number;
  categoryCounts: Record<ConfigCategory, number>;
  riskScore: number;
  estimatedImpact: string;
}

export interface DiffMetadata {
  timeDifference: number;
  conflictingChanges: string[];
  dependencies: string[];
  rollbackComplexity: 'simple' | 'moderate' | 'complex';
}

export interface ConfigRevertRequest {
  targetVersion: string;
  preserveFields: string[];
  reason: string;
  dryRun: boolean;
}

export interface ConfigRevertResult {
  success: boolean;
  version: string;
  changesApplied: number;
  warnings: string[];
  errors: string[];
  newSnapshot: ConfigSnapshot;
}

export interface ConfigChangeQuery {
  userId?: string;
  category?: ConfigCategory;
  dateRange?: {
    start: string;
    end: string;
  };
  changeType?: ChangeType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ConfigChangeResponse {
  changes: ConfigChangeEntry[];
  total: number;
  hasMore: boolean;
  summary: ConfigChangeSummary;
}

export interface ConfigChangeSummary {
  totalChanges: number;
  categoryCounts: Record<ConfigCategory, number>;
  changeTypeCounts: Record<ChangeType, number>;
  timeRange: {
    earliest: string;
    latest: string;
  };
  topFields: Array<{
    field: string;
    count: number;
  }>;
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

const API_BASE = '/api/config-change-logger';

async function fetchConfigChanges(query: ConfigChangeQuery): Promise<ConfigChangeResponse> {
  const params = new URLSearchParams();
  
  if (query.userId) params.append('userId', query.userId);
  if (query.category) params.append('category', query.category);
  if (query.changeType) params.append('changeType', query.changeType);
  if (query.search) params.append('search', query.search);
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.offset) params.append('offset', query.offset.toString());
  if (query.dateRange) {
    params.append('startDate', query.dateRange.start);
    params.append('endDate', query.dateRange.end);
  }

  const response = await fetch(`${API_BASE}/changes?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch config changes: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchConfigSnapshots(userId: string): Promise<ConfigSnapshot[]> {
  const response = await fetch(`${API_BASE}/snapshots?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch config snapshots: ${response.statusText}`);
  }
  
  return response.json();
}

async function createConfigSnapshot(
  userId: string,
  description: string,
  tags: string[]
): Promise<ConfigSnapshot> {
  const response = await fetch(`${API_BASE}/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      description,
      tags,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create config snapshot: ${response.statusText}`);
  }
  
  return response.json();
}

async function generateConfigDiff(
  fromVersion: string,
  toVersion: string,
  userId: string
): Promise<ConfigDiff> {
  const response = await fetch(`${API_BASE}/diff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fromVersion,
      toVersion,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate config diff: ${response.statusText}`);
  }
  
  return response.json();
}

async function revertToVersion(
  userId: string,
  request: ConfigRevertRequest
): Promise<ConfigRevertResult> {
  const response = await fetch(`${API_BASE}/revert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      ...request,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to revert config: ${response.statusText}`);
  }
  
  return response.json();
}

async function logConfigChange(
  userId: string,
  category: ConfigCategory,
  field: string,
  oldValue: any,
  newValue: any,
  changeType: ChangeType,
  metadata: Partial<ConfigChangeMetadata>
): Promise<ConfigChangeEntry> {
  const changeEntry = {
    userId,
    blockId: 'block-50',
    category,
    field,
    oldValue,
    newValue,
    changeType,
    timestamp: new Date().toISOString(),
    sessionId: `session-${Date.now()}`,
    metadata: {
      userAgent: navigator.userAgent,
      ipAddress: 'unknown',
      source: 'manual' as ConfigChangeSource,
      version: '1.0.0',
      tags: [],
      validation: {
        isValid: true,
        warnings: [],
        errors: [],
        performanceImpact: {
          severity: 'low' as const,
          estimatedDelay: 0,
          affectedComponents: [],
        },
      },
      ...metadata,
    },
  };

  const response = await fetch(`${API_BASE}/changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changeEntry),
  });

  if (!response.ok) {
    throw new Error(`Failed to log config change: ${response.statusText}`);
  }
  
  return response.json();
}

async function validateConfig(
  userId: string,
  config: Record<string, any>
): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      config,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to validate config: ${response.statusText}`);
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

export function useConfigChanges(query: ConfigChangeQuery) {
  return useQuery({
    queryKey: ['config-changes', query],
    queryFn: () => fetchConfigChanges(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useConfigSnapshots(userId: string) {
  return useQuery({
    queryKey: ['config-snapshots', userId],
    queryFn: () => fetchConfigSnapshots(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useCreateConfigSnapshot(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ description, tags }: { description: string; tags: string[] }) =>
      createConfigSnapshot(userId, description, tags),
    onSuccess: (newSnapshot) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-50',
        userId,
        action: 'create_snapshot',
        timestamp: new Date().toISOString(),
        details: {
          snapshotId: newSnapshot.id,
          description: newSnapshot.description,
          tags: newSnapshot.tags,
          version: newSnapshot.version,
        },
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['config-snapshots', userId] });
    },
  });
}

export function useGenerateConfigDiff() {
  return useMutation({
    mutationFn: ({ fromVersion, toVersion, userId }: {
      fromVersion: string;
      toVersion: string;
      userId: string;
    }) => generateConfigDiff(fromVersion, toVersion, userId),
    onSuccess: (diff, variables) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-50',
        userId: variables.userId,
        action: 'generate_diff',
        timestamp: new Date().toISOString(),
        details: {
          diffId: diff.id,
          fromVersion: diff.fromVersion,
          toVersion: diff.toVersion,
          totalChanges: diff.summary.totalChanges,
          criticalChanges: diff.summary.criticalChanges,
          riskScore: diff.summary.riskScore,
        },
      });
    },
  });
}

export function useRevertToVersion(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: ConfigRevertRequest) => revertToVersion(userId, request),
    onSuccess: (result, variables) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-50',
        userId,
        action: 'revert_config',
        timestamp: new Date().toISOString(),
        details: {
          targetVersion: variables.targetVersion,
          success: result.success,
          changesApplied: result.changesApplied,
          warnings: result.warnings,
          errors: result.errors,
          newVersion: result.version,
          reason: variables.reason,
          dryRun: variables.dryRun,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['config-snapshots', userId] });
      queryClient.invalidateQueries({ queryKey: ['config-changes'] });
    },
  });
}

export function useLogConfigChange(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      category,
      field,
      oldValue,
      newValue,
      changeType,
      metadata,
    }: {
      category: ConfigCategory;
      field: string;
      oldValue: any;
      newValue: any;
      changeType: ChangeType;
      metadata?: Partial<ConfigChangeMetadata>;
    }) => logConfigChange(userId, category, field, oldValue, newValue, changeType, metadata),
    onSuccess: (changeEntry) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-50',
        userId,
        action: 'log_config_change',
        timestamp: new Date().toISOString(),
        details: {
          changeId: changeEntry.id,
          category: changeEntry.category,
          field: changeEntry.field,
          changeType: changeEntry.changeType,
          validationResult: changeEntry.metadata.validation,
          source: changeEntry.metadata.source,
        },
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['config-changes'] });
    },
  });
}

export function useValidateConfig(userId: string) {
  return useMutation({
    mutationFn: (config: Record<string, any>) => validateConfig(userId, config),
    onSuccess: (validationResult) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-50',
        userId,
        action: 'validate_config',
        timestamp: new Date().toISOString(),
        details: {
          isValid: validationResult.isValid,
          warnings: validationResult.warnings,
          errors: validationResult.errors,
          performanceImpact: validationResult.performanceImpact,
        },
      });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useConfigChangeLoggerUtils(userId: string) {
  const formatTimestamp = useCallback((timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const formatChangeValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }, []);

  const getCategoryLabel = useCallback((category: ConfigCategory): string => {
    const labels: Record<ConfigCategory, string> = {
      strategy_weights: 'Strategy Weights',
      thresholds: 'Thresholds',
      exclusions: 'Exclusions',
      display_settings: 'Display Settings',
      risk_parameters: 'Risk Parameters',
      execution_rules: 'Execution Rules',
      overlay_settings: 'Overlay Settings',
      notification_preferences: 'Notification Preferences',
      ui_preferences: 'UI Preferences',
      data_sources: 'Data Sources',
    };
    return labels[category] || category;
  }, []);

  const getChangeTypeLabel = useCallback((changeType: ChangeType): string => {
    const labels: Record<ChangeType, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      revert: 'Reverted',
      bulk_update: 'Bulk Updated',
      import: 'Imported',
      reset: 'Reset',
    };
    return labels[changeType] || changeType;
  }, []);

  const getSeverityColor = useCallback((severity: string): string => {
    const colors: Record<string, string> = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12',
    };
    return colors[severity] || '#6B7280';
  }, []);

  const calculateRiskScore = useCallback((changes: DiffChange[]): number => {
    let score = 0;
    changes.forEach(change => {
      switch (change.severity) {
        case 'low':
          score += 1;
          break;
        case 'medium':
          score += 3;
          break;
        case 'high':
          score += 7;
          break;
        case 'critical':
          score += 15;
          break;
      }
    });
    return Math.min(score, 100);
  }, []);

  const groupChangesByCategory = useCallback((changes: ConfigChangeEntry[]): Record<ConfigCategory, ConfigChangeEntry[]> => {
    return changes.reduce((acc, change) => {
      if (!acc[change.category]) {
        acc[change.category] = [];
      }
      acc[change.category].push(change);
      return acc;
    }, {} as Record<ConfigCategory, ConfigChangeEntry[]>);
  }, []);

  const filterChanges = useCallback((
    changes: ConfigChangeEntry[],
    filters: {
      search?: string;
      category?: ConfigCategory;
      changeType?: ChangeType;
      dateRange?: { start: string; end: string };
    }
  ): ConfigChangeEntry[] => {
    return changes.filter(change => {
      if (filters.search && !change.field.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.category && change.category !== filters.category) {
        return false;
      }
      if (filters.changeType && change.changeType !== filters.changeType) {
        return false;
      }
      if (filters.dateRange) {
        const changeDate = new Date(change.timestamp);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (changeDate < startDate || changeDate > endDate) {
          return false;
        }
      }
      return true;
    });
  }, []);

  const exportChanges = useCallback((changes: ConfigChangeEntry[], format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(changes, null, 2);
    }
    
    // CSV format
    const headers = [
      'Timestamp',
      'Category',
      'Field',
      'Change Type',
      'Old Value',
      'New Value',
      'Source',
      'Validation Status',
    ];
    
    const rows = changes.map(change => [
      change.timestamp,
      change.category,
      change.field,
      change.changeType,
      formatChangeValue(change.oldValue),
      formatChangeValue(change.newValue),
      change.metadata.source,
      change.metadata.validation.isValid ? 'Valid' : 'Invalid',
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }, [formatChangeValue]);

  const compareSnapshots = useCallback((
    snapshot1: ConfigSnapshot,
    snapshot2: ConfigSnapshot
  ): DiffSummary => {
    const changes = Object.keys(snapshot1.configState).reduce((acc, key) => {
      if (snapshot1.configState[key] !== snapshot2.configState[key]) {
        acc++;
      }
      return acc;
    }, 0);

    return {
      totalChanges: changes,
      criticalChanges: 0,
      categoryCounts: {} as Record<ConfigCategory, number>,
      riskScore: 0,
      estimatedImpact: 'Low',
    };
  }, []);

  return useMemo(() => ({
    formatTimestamp,
    formatChangeValue,
    getCategoryLabel,
    getChangeTypeLabel,
    getSeverityColor,
    calculateRiskScore,
    groupChangesByCategory,
    filterChanges,
    exportChanges,
    compareSnapshots,
  }), [
    formatTimestamp,
    formatChangeValue,
    getCategoryLabel,
    getChangeTypeLabel,
    getSeverityColor,
    calculateRiskScore,
    groupChangesByCategory,
    filterChanges,
    exportChanges,
    compareSnapshots,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const configChangeLoggerService = {
  // API functions
  fetchConfigChanges,
  fetchConfigSnapshots,
  createConfigSnapshot,
  generateConfigDiff,
  revertToVersion,
  logConfigChange,
  validateConfig,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    changes: (query: ConfigChangeQuery) => ['config-changes', query],
    snapshots: (userId: string) => ['config-snapshots', userId],
  },
  
  // Utility functions
  utils: {
    formatTimestamp: (timestamp: string) => new Date(timestamp).toLocaleString(),
    formatChangeValue: (value: any) => {
      if (value === null || value === undefined) return 'null';
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      return String(value);
    },
    getCategoryLabel: (category: ConfigCategory) => {
      const labels: Record<ConfigCategory, string> = {
        strategy_weights: 'Strategy Weights',
        thresholds: 'Thresholds',
        exclusions: 'Exclusions',
        display_settings: 'Display Settings',
        risk_parameters: 'Risk Parameters',
        execution_rules: 'Execution Rules',
        overlay_settings: 'Overlay Settings',
        notification_preferences: 'Notification Preferences',
        ui_preferences: 'UI Preferences',
        data_sources: 'Data Sources',
      };
      return labels[category] || category;
    },
    getChangeTypeLabel: (changeType: ChangeType) => {
      const labels: Record<ChangeType, string> = {
        create: 'Created',
        update: 'Updated',
        delete: 'Deleted',
        revert: 'Reverted',
        bulk_update: 'Bulk Updated',
        import: 'Imported',
        reset: 'Reset',
      };
      return labels[changeType] || changeType;
    },
  },
}; 