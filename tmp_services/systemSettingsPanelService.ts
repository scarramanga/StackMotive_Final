import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface SystemSettings {
  id: string;
  userId: string;
  categories: SettingCategory[];
  metadata: SettingsMetadata;
  version: string;
  lastUpdated: string;
  syncStatus: SyncStatus;
}

export interface SettingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  isCollapsed: boolean;
  settings: Setting[];
  permissions: CategoryPermissions;
}

export interface Setting {
  id: string;
  key: string;
  name: string;
  description: string;
  type: SettingType;
  value: any;
  defaultValue: any;
  validation: SettingValidation;
  ui: SettingUI;
  dependencies: SettingDependency[];
  impact: SettingImpact;
  isVisible: boolean;
  isEnabled: boolean;
  isReadOnly: boolean;
  lastModified: string;
  modifiedBy: string;
  changeHistory: SettingChange[];
}

export interface SettingValidation {
  required: boolean;
  type: SettingType;
  constraints: ValidationConstraint[];
  customValidators: CustomValidator[];
  errorMessages: Record<string, string>;
}

export interface ValidationConstraint {
  type: ConstraintType;
  value: any;
  message: string;
  severity: ConstraintSeverity;
}

export interface CustomValidator {
  id: string;
  name: string;
  function: string;
  parameters: Record<string, any>;
  errorMessage: string;
}

export interface SettingUI {
  component: UIComponent;
  props: UIComponentProps;
  layout: UILayout;
  styling: UIStyle;
  behavior: UIBehavior;
}

export interface UIComponentProps {
  placeholder?: string;
  helpText?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  format?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  hidden?: boolean;
}

export interface SelectOption {
  value: any;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  group?: string;
}

export interface UILayout {
  grid: GridLayout;
  spacing: SpacingConfig;
  alignment: AlignmentConfig;
  responsive: ResponsiveConfig;
}

export interface GridLayout {
  columns: number;
  rows: number;
  span: GridSpan;
  order: number;
}

export interface GridSpan {
  columns: number;
  rows: number;
}

export interface SpacingConfig {
  margin: SpacingValue;
  padding: SpacingValue;
}

export interface SpacingValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AlignmentConfig {
  horizontal: HorizontalAlignment;
  vertical: VerticalAlignment;
}

export interface ResponsiveConfig {
  breakpoints: BreakpointConfig[];
  behavior: ResponsiveBehavior;
}

export interface BreakpointConfig {
  name: string;
  minWidth: number;
  layout: Partial<UILayout>;
}

export interface UIStyle {
  theme: ThemeConfig;
  colors: ColorConfig;
  typography: TypographyConfig;
  borders: BorderConfig;
  shadows: ShadowConfig;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface ColorConfig {
  background: string;
  foreground: string;
  border: string;
  accent: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
}

export interface TypographyConfig {
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface BorderConfig {
  width: string;
  style: BorderStyle;
  color: string;
  radius: string;
}

export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface UIBehavior {
  validation: ValidationBehavior;
  persistence: PersistenceBehavior;
  interaction: InteractionBehavior;
  animation: AnimationBehavior;
}

export interface ValidationBehavior {
  trigger: ValidationTrigger;
  debounce: number;
  showErrors: boolean;
  showWarnings: boolean;
  blockSubmit: boolean;
}

export interface PersistenceBehavior {
  autoSave: boolean;
  saveDelay: number;
  saveOnChange: boolean;
  saveOnBlur: boolean;
}

export interface InteractionBehavior {
  focusable: boolean;
  hoverable: boolean;
  clickable: boolean;
  draggable: boolean;
  resizable: boolean;
}

export interface AnimationBehavior {
  enabled: boolean;
  duration: number;
  easing: EasingFunction;
  delays: AnimationDelays;
}

export interface AnimationDelays {
  enter: number;
  exit: number;
  change: number;
}

export interface SettingDependency {
  settingId: string;
  type: DependencyType;
  condition: DependencyCondition;
  action: DependencyAction;
}

export interface DependencyCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
  logic: LogicalOperator;
}

export interface DependencyAction {
  type: ActionType;
  parameters: Record<string, any>;
  message?: string;
}

export interface SettingImpact {
  performance: ImpactLevel;
  security: ImpactLevel;
  user_experience: ImpactLevel;
  data_privacy: ImpactLevel;
  compliance: ImpactLevel;
  cost: ImpactLevel;
  description: string;
  affected_features: string[];
  restart_required: boolean;
  sync_required: boolean;
}

export interface SettingChange {
  id: string;
  timestamp: string;
  userId: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  impact: ChangeImpact;
  validation: ChangeValidation;
}

export interface ChangeImpact {
  affected_settings: string[];
  affected_features: string[];
  performance_delta: number;
  risk_level: RiskLevel;
  rollback_complexity: ComplexityLevel;
}

export interface ChangeValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
  requirements: string[];
}

export interface CategoryPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
  roles: string[];
  restrictions: PermissionRestriction[];
}

export interface PermissionRestriction {
  type: RestrictionType;
  condition: string;
  message: string;
}

export interface SettingsMetadata {
  version: string;
  schema_version: string;
  last_backup: string;
  total_settings: number;
  modified_settings: number;
  validation_status: ValidationStatus;
  sync_status: SyncStatus;
  integrity: IntegrityCheck;
}

export interface ValidationStatus {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  last_validated: string;
}

export interface ValidationError {
  settingId: string;
  message: string;
  severity: ErrorSeverity;
  code: string;
}

export interface ValidationWarning {
  settingId: string;
  message: string;
  severity: WarningSeverity;
  code: string;
}

export interface SyncStatus {
  last_sync: string;
  status: SyncState;
  conflicts: SyncConflict[];
  pending_changes: number;
}

export interface SyncConflict {
  settingId: string;
  local_value: any;
  remote_value: any;
  resolution: ConflictResolution;
}

export interface IntegrityCheck {
  passed: boolean;
  score: number;
  issues: IntegrityIssue[];
  last_checked: string;
}

export interface IntegrityIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  recommendation: string;
}

export interface SettingUpdate {
  settingId: string;
  value: any;
  reason?: string;
  validate: boolean;
  sync: boolean;
}

export interface BulkSettingUpdate {
  updates: SettingUpdate[];
  transaction: boolean;
  rollback_on_error: boolean;
  validation_mode: ValidationMode;
}

export interface SettingExport {
  format: ExportFormat;
  categories?: string[];
  settings?: string[];
  include_metadata: boolean;
  include_history: boolean;
  encryption: EncryptionConfig;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  key_source: string;
  options: Record<string, any>;
}

export interface SettingImport {
  data: string;
  format: ExportFormat;
  merge_strategy: MergeStrategy;
  validation_mode: ValidationMode;
  backup_before_import: boolean;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

// Type definitions
export type SettingType = 'boolean' | 'string' | 'number' | 'select' | 'multiselect' | 'range' | 'color' | 'date' | 'time' | 'json' | 'array' | 'object';
export type ConstraintType = 'min' | 'max' | 'length' | 'pattern' | 'enum' | 'custom' | 'unique' | 'format';
export type ConstraintSeverity = 'info' | 'warning' | 'error' | 'critical';
export type UIComponent = 'toggle' | 'input' | 'textarea' | 'select' | 'multiselect' | 'slider' | 'range' | 'colorpicker' | 'datepicker' | 'timepicker' | 'jsoneditor' | 'custom';
export type HorizontalAlignment = 'left' | 'center' | 'right' | 'stretch';
export type VerticalAlignment = 'top' | 'center' | 'bottom' | 'stretch';
export type ResponsiveBehavior = 'stack' | 'wrap' | 'scroll' | 'collapse' | 'hide';
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | 'none';
export type ValidationTrigger = 'change' | 'blur' | 'submit' | 'manual';
export type EasingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
export type DependencyType = 'visibility' | 'enablement' | 'validation' | 'value' | 'ui';
export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
export type LogicalOperator = 'and' | 'or' | 'not' | 'xor';
export type ActionType = 'show' | 'hide' | 'enable' | 'disable' | 'set_value' | 'clear_value' | 'validate' | 'focus' | 'blur';
export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';
export type RestrictionType = 'role' | 'permission' | 'feature' | 'time' | 'location' | 'custom';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type WarningSeverity = 'low' | 'medium' | 'high';
export type SyncState = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';
export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';
export type IssueType = 'missing' | 'invalid' | 'corrupted' | 'outdated' | 'conflicting';
export type IssueSeverity = 'minor' | 'moderate' | 'major' | 'critical';
export type ValidationMode = 'strict' | 'lenient' | 'skip' | 'warn_only';
export type ExportFormat = 'json' | 'yaml' | 'xml' | 'csv' | 'sql' | 'env';
export type MergeStrategy = 'overwrite' | 'merge' | 'skip_conflicts' | 'prompt';

// ================================================
// API FUNCTIONS
// ================================================

const API_BASE = '/api/system-settings';

async function fetchSystemSettings(userId: string): Promise<SystemSettings> {
  const response = await fetch(`${API_BASE}?userId=${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch system settings: ${response.statusText}`);
  return response.json();
}

async function updateSystemSetting(userId: string, update: SettingUpdate): Promise<Setting> {
  const response = await fetch(`${API_BASE}/setting`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...update }),
  });
  if (!response.ok) throw new Error(`Failed to update setting: ${response.statusText}`);
  return response.json();
}

async function bulkUpdateSettings(userId: string, bulkUpdate: BulkSettingUpdate): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/bulk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...bulkUpdate }),
  });
  if (!response.ok) throw new Error(`Failed to bulk update settings: ${response.statusText}`);
  return response.json();
}

async function validateSettings(userId: string, settingIds?: string[]): Promise<ValidationStatus> {
  const params = settingIds ? `?settingIds=${settingIds.join(',')}` : '';
  const response = await fetch(`${API_BASE}/validate${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error(`Failed to validate settings: ${response.statusText}`);
  return response.json();
}

async function resetSettings(userId: string, settingIds: string[]): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, settingIds }),
  });
  if (!response.ok) throw new Error(`Failed to reset settings: ${response.statusText}`);
  return response.json();
}

async function exportSettings(userId: string, exportConfig: SettingExport): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...exportConfig }),
  });
  if (!response.ok) throw new Error(`Failed to export settings: ${response.statusText}`);
  return response.blob();
}

async function importSettings(userId: string, importConfig: SettingImport): Promise<SystemSettings> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...importConfig }),
  });
  if (!response.ok) throw new Error(`Failed to import settings: ${response.statusText}`);
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

export function useSystemSettings(userId: string) {
  return useQuery({
    queryKey: ['system-settings', userId],
    queryFn: () => fetchSystemSettings(userId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    enabled: !!userId,
  });
}

export function useUpdateSystemSetting(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (update: SettingUpdate) => updateSystemSetting(userId, update),
    onSuccess: (updatedSetting, update) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'update_setting',
        timestamp: new Date().toISOString(),
        details: {
          settingId: update.settingId,
          oldValue: updatedSetting.changeHistory[updatedSetting.changeHistory.length - 2]?.oldValue,
          newValue: update.value,
          reason: update.reason,
          impact: updatedSetting.impact,
          restart_required: updatedSetting.impact.restart_required,
          sync_required: updatedSetting.impact.sync_required,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['system-settings', userId] });
    },
  });
}

export function useBulkUpdateSettings(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bulkUpdate: BulkSettingUpdate) => bulkUpdateSettings(userId, bulkUpdate),
    onSuccess: (updatedSettings, bulkUpdate) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'bulk_update_settings',
        timestamp: new Date().toISOString(),
        details: {
          settingsCount: bulkUpdate.updates.length,
          transaction: bulkUpdate.transaction,
          validation_mode: bulkUpdate.validation_mode,
          updatedSettings: updatedSettings.map(s => s.id),
          impact_summary: {
            restart_required: updatedSettings.some(s => s.impact.restart_required),
            sync_required: updatedSettings.some(s => s.impact.sync_required),
            high_impact: updatedSettings.filter(s => s.impact.performance === 'high' || s.impact.performance === 'critical').length,
          },
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['system-settings', userId] });
    },
  });
}

export function useValidateSettings(userId: string) {
  return useMutation({
    mutationFn: (settingIds?: string[]) => validateSettings(userId, settingIds),
    onSuccess: (validation, settingIds) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'validate_settings',
        timestamp: new Date().toISOString(),
        details: {
          settingIds: settingIds || 'all',
          valid: validation.valid,
          errors: validation.errors.length,
          warnings: validation.warnings.length,
          critical_errors: validation.errors.filter(e => e.severity === 'critical').length,
        },
      });
    },
  });
}

export function useResetSettings(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settingIds: string[]) => resetSettings(userId, settingIds),
    onSuccess: (resetSettings, settingIds) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'reset_settings',
        timestamp: new Date().toISOString(),
        details: {
          settingIds,
          resetCount: resetSettings.length,
          impact_summary: {
            restart_required: resetSettings.some(s => s.impact.restart_required),
            sync_required: resetSettings.some(s => s.impact.sync_required),
            affected_features: [...new Set(resetSettings.flatMap(s => s.impact.affected_features))],
          },
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['system-settings', userId] });
    },
  });
}

export function useExportSettings(userId: string) {
  return useMutation({
    mutationFn: (exportConfig: SettingExport) => exportSettings(userId, exportConfig),
    onSuccess: (blob, exportConfig) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'export_settings',
        timestamp: new Date().toISOString(),
        details: {
          format: exportConfig.format,
          categories: exportConfig.categories?.length || 'all',
          settings: exportConfig.settings?.length || 'all',
          include_metadata: exportConfig.include_metadata,
          include_history: exportConfig.include_history,
          encrypted: exportConfig.encryption.enabled,
          size: blob.size,
        },
      });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-settings-${new Date().toISOString().split('T')[0]}.${exportConfig.format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportSettings(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (importConfig: SettingImport) => importSettings(userId, importConfig),
    onSuccess: (importedSettings, importConfig) => {
      // Log agent action
      logAgentAction({
        blockId: 'block-57',
        userId,
        action: 'import_settings',
        timestamp: new Date().toISOString(),
        details: {
          format: importConfig.format,
          merge_strategy: importConfig.merge_strategy,
          validation_mode: importConfig.validation_mode,
          backup_created: importConfig.backup_before_import,
          total_settings: importedSettings.metadata.total_settings,
          modified_settings: importedSettings.metadata.modified_settings,
          sync_status: importedSettings.metadata.sync_status.status,
        },
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['system-settings', userId] });
    },
  });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function useSystemSettingsUtils(userId: string) {
  const formatSettingType = useCallback((type: SettingType): string => {
    const labels: Record<SettingType, string> = {
      boolean: 'Toggle',
      string: 'Text',
      number: 'Number',
      select: 'Dropdown',
      multiselect: 'Multi-select',
      range: 'Range',
      color: 'Color',
      date: 'Date',
      time: 'Time',
      json: 'JSON',
      array: 'Array',
      object: 'Object',
    };
    return labels[type] || type;
  }, []);

  const formatImpactLevel = useCallback((impact: ImpactLevel): string => {
    const labels: Record<ImpactLevel, string> = {
      none: 'None',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    };
    return labels[impact] || impact;
  }, []);

  const getImpactColor = useCallback((impact: ImpactLevel): string => {
    const colors: Record<ImpactLevel, string> = {
      none: '#6B7280',
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12',
    };
    return colors[impact] || '#6B7280';
  }, []);

  const calculateSettingsHealth = useCallback((settings: SystemSettings): number => {
    const allSettings = settings.categories.flatMap(cat => cat.settings);
    const validSettings = allSettings.filter(setting => {
      // Check if setting has valid value
      if (setting.validation.required && (setting.value === null || setting.value === undefined)) {
        return false;
      }
      return true;
    });
    
    return validSettings.length / allSettings.length;
  }, []);

  const generateSettingsReport = useCallback((settings: SystemSettings): string => {
    const allSettings = settings.categories.flatMap(cat => cat.settings);
    const modifiedSettings = allSettings.filter(s => s.value !== s.defaultValue);
    const highImpactSettings = allSettings.filter(s => s.impact.performance === 'high' || s.impact.performance === 'critical');
    
    const report = `
# System Settings Report

## Overview
- Total Settings: ${allSettings.length}
- Modified Settings: ${modifiedSettings.length}
- High Impact Settings: ${highImpactSettings.length}
- Last Updated: ${new Date(settings.lastUpdated).toLocaleString()}
- Version: ${settings.version}

## Categories
${settings.categories.map(cat => `
### ${cat.name}
- Settings: ${cat.settings.length}
- Modified: ${cat.settings.filter(s => s.value !== s.defaultValue).length}
- Description: ${cat.description}
`).join('')}

## High Impact Settings
${highImpactSettings.map(setting => `
- **${setting.name}**: ${setting.value}
  - Impact: ${setting.impact.performance} (${setting.impact.description})
  - Restart Required: ${setting.impact.restart_required ? 'Yes' : 'No'}
  - Affected Features: ${setting.impact.affected_features.join(', ')}
`).join('')}

## Validation Status
- Valid: ${settings.metadata.validation_status.valid ? 'Yes' : 'No'}
- Errors: ${settings.metadata.validation_status.errors.length}
- Warnings: ${settings.metadata.validation_status.warnings.length}
- Last Validated: ${new Date(settings.metadata.validation_status.last_validated).toLocaleString()}

## Sync Status
- Status: ${settings.metadata.sync_status.status}
- Last Sync: ${new Date(settings.metadata.sync_status.last_sync).toLocaleString()}
- Conflicts: ${settings.metadata.sync_status.conflicts.length}
- Pending Changes: ${settings.metadata.sync_status.pending_changes}
`;
    return report;
  }, []);

  return useMemo(() => ({
    formatSettingType,
    formatImpactLevel,
    getImpactColor,
    calculateSettingsHealth,
    generateSettingsReport,
  }), [
    formatSettingType,
    formatImpactLevel,
    getImpactColor,
    calculateSettingsHealth,
    generateSettingsReport,
  ]);
}

// ================================================
// SERVICE INSTANCE
// ================================================

export const systemSettingsPanelService = {
  // API functions
  fetchSystemSettings,
  updateSystemSetting,
  bulkUpdateSettings,
  validateSettings,
  resetSettings,
  exportSettings,
  importSettings,
  logAgentAction,
  
  // Query keys for cache management
  queryKeys: {
    settings: (userId: string) => ['system-settings', userId],
    validation: (userId: string, settingIds?: string[]) => ['settings-validation', userId, settingIds],
  },
  
  // Utility functions
  utils: {
    formatSettingType: (type: SettingType) => {
      const labels: Record<SettingType, string> = {
        boolean: 'Toggle',
        string: 'Text',
        number: 'Number',
        select: 'Dropdown',
        multiselect: 'Multi-select',
        range: 'Range',
        color: 'Color',
        date: 'Date',
        time: 'Time',
        json: 'JSON',
        array: 'Array',
        object: 'Object',
      };
      return labels[type] || type;
    },
    formatImpactLevel: (impact: ImpactLevel) => {
      const labels: Record<ImpactLevel, string> = {
        none: 'None',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
      };
      return labels[impact] || impact;
    },
  },
}; 