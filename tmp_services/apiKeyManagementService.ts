import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export interface ApiKey {
  id: string;
  name: string;
  description: string;
  keyType: ApiKeyType;
  provider: string;
  service: string;
  permissions: ApiKeyPermission[];
  encryptedKey: string;
  maskedKey: string;
  status: ApiKeyStatus;
  metadata: ApiKeyMetadata;
  security: SecurityConfig;
  usage: UsageStats;
  created: string;
  lastUsed: string;
  expires: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface ApiKeyPermission {
  id: string;
  resource: string;
  action: ApiKeyAction;
  scope: PermissionScope;
  conditions: PermissionCondition[];
  isActive: boolean;
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  access: AccessConfig;
  monitoring: MonitoringConfig;
  compliance: ComplianceConfig;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
  saltLength: number;
  iterations: number;
  keyLength: number;
}

export interface AccessConfig {
  ipWhitelist: string[];
  userAgentRestrictions: string[];
  referrerRestrictions: string[];
  rateLimit: RateLimit;
  timeRestrictions: TimeRestriction[];
}

export interface RateLimit {
  requests: number;
  window: number;
  burst: number;
  backoff: number;
}

export interface TimeRestriction {
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface MonitoringConfig {
  logAccess: boolean;
  logErrors: boolean;
  alertOnSuspiciousActivity: boolean;
  alertOnRateLimit: boolean;
  alertOnExpiry: boolean;
}

export interface ComplianceConfig {
  dataResidency: string;
  retentionPeriod: number;
  auditLogging: boolean;
  encryptionRequired: boolean;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestTime: string;
  averageResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  bandwidthUsed: number;
}

export interface ApiKeyMetadata {
  environment: Environment;
  version: string;
  tags: string[];
  owner: string;
  team: string;
  project: string;
  costCenter: string;
  notes: string;
}

export interface ApiKeyRequest {
  name: string;
  description: string;
  keyType: ApiKeyType;
  provider: string;
  service: string;
  permissions: ApiKeyPermission[];
  security: SecurityConfig;
  metadata: ApiKeyMetadata;
  expirationDays?: number;
}

export interface ApiKeyUpdate {
  id: string;
  name?: string;
  description?: string;
  permissions?: ApiKeyPermission[];
  security?: SecurityConfig;
  metadata?: ApiKeyMetadata;
  status?: ApiKeyStatus;
}

export interface ApiKeyRevocation {
  id: string;
  reason: RevocationReason;
  comment: string;
  immediateRevocation: boolean;
  notifyUsers: boolean;
}

export interface ApiKeyRotation {
  id: string;
  rotationType: RotationType;
  gracePeriod: number;
  notifyUsers: boolean;
  backupOldKey: boolean;
}

export interface KeyValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: ErrorSeverity;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: WarningSeverity;
}

export interface ValidationRecommendation {
  field: string;
  message: string;
  action: string;
  priority: RecommendationPriority;
}

export interface KeyAuditLog {
  id: string;
  keyId: string;
  action: AuditAction;
  actor: string;
  timestamp: string;
  details: AuditDetails;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

export interface AuditDetails {
  before?: any;
  after?: any;
  changes?: string[];
  context?: Record<string, any>;
}

export interface KeySecurityReport {
  keyId: string;
  securityScore: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  complianceStatus: ComplianceStatus;
  lastAssessed: string;
}

export interface SecurityVulnerability {
  id: string;
  type: VulnerabilityType;
  severity: VulnerabilitySeverity;
  description: string;
  impact: string;
  remediation: string;
  detected: string;
}

export interface SecurityRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  description: string;
  action: string;
  benefit: string;
  effort: EffortLevel;
}

export interface ComplianceStatus {
  overall: ComplianceLevel;
  standards: ComplianceStandard[];
  violations: ComplianceViolation[];
  lastChecked: string;
}

export interface ComplianceStandard {
  name: string;
  version: string;
  status: ComplianceLevel;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  status: RequirementStatus;
  description: string;
  evidence: string;
}

export interface ComplianceViolation {
  id: string;
  standard: string;
  requirement: string;
  severity: ViolationSeverity;
  description: string;
  remediation: string;
  deadline: string;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export type ApiKeyType = 'read_only' | 'read_write' | 'admin' | 'service' | 'integration' | 'webhook' | 'custom';
export type ApiKeyAction = 'read' | 'write' | 'delete' | 'admin' | 'execute' | 'monitor' | 'configure';
export type ApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked' | 'suspended' | 'pending';
export type Environment = 'development' | 'staging' | 'production' | 'test';
export type RevocationReason = 'security_breach' | 'key_compromise' | 'no_longer_needed' | 'policy_violation' | 'expiry' | 'rotation' | 'other';
export type RotationType = 'manual' | 'automatic' | 'scheduled' | 'emergency';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WarningSeverity = 'info' | 'warning' | 'error';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'revoke' | 'rotate' | 'suspend' | 'restore';
export type VulnerabilityType = 'weak_encryption' | 'excessive_permissions' | 'no_expiration' | 'suspicious_usage' | 'compliance_issue';
export type VulnerabilitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationType = 'security' | 'performance' | 'compliance' | 'cost' | 'maintenance';
export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high' | 'extensive';
export type ComplianceLevel = 'compliant' | 'non_compliant' | 'partial' | 'unknown';
export type RequirementStatus = 'met' | 'not_met' | 'partial' | 'not_applicable';
export type ViolationSeverity = 'minor' | 'major' | 'critical' | 'blocker';

interface PermissionScope {
  resources: string[];
  filters: Record<string, any>;
  limitations: Record<string, any>;
}

interface PermissionCondition {
  field: string;
  operator: string;
  value: any;
  logic: string;
}

const API_BASE = '/api/api-key-management';

async function fetchApiKeys(userId: string): Promise<ApiKey[]> {
  const response = await fetch(`${API_BASE}/keys?userId=${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch API keys: ${response.statusText}`);
  return response.json();
}

async function createApiKey(userId: string, request: ApiKeyRequest): Promise<ApiKey> {
  const response = await fetch(`${API_BASE}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...request }),
  });
  if (!response.ok) throw new Error(`Failed to create API key: ${response.statusText}`);
  return response.json();
}

async function updateApiKey(userId: string, update: ApiKeyUpdate): Promise<ApiKey> {
  const response = await fetch(`${API_BASE}/keys/${update.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...update }),
  });
  if (!response.ok) throw new Error(`Failed to update API key: ${response.statusText}`);
  return response.json();
}

async function revokeApiKey(userId: string, revocation: ApiKeyRevocation): Promise<void> {
  const response = await fetch(`${API_BASE}/keys/${revocation.id}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...revocation }),
  });
  if (!response.ok) throw new Error(`Failed to revoke API key: ${response.statusText}`);
}

async function rotateApiKey(userId: string, rotation: ApiKeyRotation): Promise<ApiKey> {
  const response = await fetch(`${API_BASE}/keys/${rotation.id}/rotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...rotation }),
  });
  if (!response.ok) throw new Error(`Failed to rotate API key: ${response.statusText}`);
  return response.json();
}

async function validateApiKey(keyId: string): Promise<KeyValidation> {
  const response = await fetch(`${API_BASE}/keys/${keyId}/validate`);
  if (!response.ok) throw new Error(`Failed to validate API key: ${response.statusText}`);
  return response.json();
}

async function getKeyAuditLog(keyId: string): Promise<KeyAuditLog[]> {
  const response = await fetch(`${API_BASE}/keys/${keyId}/audit`);
  if (!response.ok) throw new Error(`Failed to get audit log: ${response.statusText}`);
  return response.json();
}

async function getKeySecurityReport(keyId: string): Promise<KeySecurityReport> {
  const response = await fetch(`${API_BASE}/keys/${keyId}/security`);
  if (!response.ok) throw new Error(`Failed to get security report: ${response.statusText}`);
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

export function useApiKeys(userId: string) {
  return useQuery({
    queryKey: ['api-keys', userId],
    queryFn: () => fetchApiKeys(userId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useAddApiKey(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: ApiKeyRequest) => createApiKey(userId, request),
    onSuccess: (newKey, request) => {
      logAgentAction({
        blockId: 'block-59',
        userId,
        action: 'create_api_key',
        timestamp: new Date().toISOString(),
        details: {
          keyId: newKey.id,
          keyName: newKey.name,
          keyType: newKey.keyType,
          provider: newKey.provider,
          service: newKey.service,
          permissions: newKey.permissions.length,
          environment: newKey.metadata.environment,
          hasExpiration: !!newKey.expires,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['api-keys', userId] });
    },
  });
}

export function useUpdateApiKey(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (update: ApiKeyUpdate) => updateApiKey(userId, update),
    onSuccess: (updatedKey, update) => {
      logAgentAction({
        blockId: 'block-59',
        userId,
        action: 'update_api_key',
        timestamp: new Date().toISOString(),
        details: {
          keyId: update.id,
          keyName: updatedKey.name,
          changes: Object.keys(update).filter(key => key !== 'id'),
          newStatus: updatedKey.status,
          permissions: updatedKey.permissions.length,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['api-keys', userId] });
    },
  });
}

export function useRevokeApiKey(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (revocation: ApiKeyRevocation) => revokeApiKey(userId, revocation),
    onSuccess: (_, revocation) => {
      logAgentAction({
        blockId: 'block-59',
        userId,
        action: 'revoke_api_key',
        timestamp: new Date().toISOString(),
        details: {
          keyId: revocation.id,
          reason: revocation.reason,
          comment: revocation.comment,
          immediateRevocation: revocation.immediateRevocation,
          notifyUsers: revocation.notifyUsers,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['api-keys', userId] });
    },
  });
}

export function useRotateApiKey(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rotation: ApiKeyRotation) => rotateApiKey(userId, rotation),
    onSuccess: (rotatedKey, rotation) => {
      logAgentAction({
        blockId: 'block-59',
        userId,
        action: 'rotate_api_key',
        timestamp: new Date().toISOString(),
        details: {
          keyId: rotation.id,
          rotationType: rotation.rotationType,
          gracePeriod: rotation.gracePeriod,
          notifyUsers: rotation.notifyUsers,
          backupOldKey: rotation.backupOldKey,
          newKeyId: rotatedKey.id,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['api-keys', userId] });
    },
  });
}

export function useValidateApiKey(userId: string) {
  return useMutation({
    mutationFn: (keyId: string) => validateApiKey(keyId),
    onSuccess: (validation, keyId) => {
      logAgentAction({
        blockId: 'block-59',
        userId,
        action: 'validate_api_key',
        timestamp: new Date().toISOString(),
        details: {
          keyId,
          isValid: validation.isValid,
          errors: validation.errors.length,
          warnings: validation.warnings.length,
          recommendations: validation.recommendations.length,
          criticalErrors: validation.errors.filter(e => e.severity === 'critical').length,
        },
      });
    },
  });
}

export function useKeyAuditLog(keyId: string) {
  return useQuery({
    queryKey: ['api-key-audit', keyId],
    queryFn: () => getKeyAuditLog(keyId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: !!keyId,
  });
}

export function useKeySecurityReport(keyId: string) {
  return useQuery({
    queryKey: ['api-key-security', keyId],
    queryFn: () => getKeySecurityReport(keyId),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    enabled: !!keyId,
  });
}

export function useApiKeyManagementUtils(userId: string) {
  const formatApiKeyType = useCallback((type: ApiKeyType): string => {
    const labels: Record<ApiKeyType, string> = {
      read_only: 'Read Only',
      read_write: 'Read/Write',
      admin: 'Admin',
      service: 'Service',
      integration: 'Integration',
      webhook: 'Webhook',
      custom: 'Custom',
    };
    return labels[type] || type;
  }, []);

  const formatApiKeyStatus = useCallback((status: ApiKeyStatus): string => {
    const labels: Record<ApiKeyStatus, string> = {
      active: 'Active',
      inactive: 'Inactive',
      expired: 'Expired',
      revoked: 'Revoked',
      suspended: 'Suspended',
      pending: 'Pending',
    };
    return labels[status] || status;
  }, []);

  const getStatusColor = useCallback((status: ApiKeyStatus): string => {
    const colors: Record<ApiKeyStatus, string> = {
      active: '#10B981',
      inactive: '#6B7280',
      expired: '#F59E0B',
      revoked: '#EF4444',
      suspended: '#F59E0B',
      pending: '#3B82F6',
    };
    return colors[status] || '#6B7280';
  }, []);

  const maskApiKey = useCallback((key: string): string => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  }, []);

  const calculateSecurityScore = useCallback((apiKey: ApiKey): number => {
    let score = 100;
    
    // Check expiration
    if (!apiKey.expires) score -= 20;
    else if (new Date(apiKey.expires) < new Date()) score -= 30;
    
    // Check permissions
    if (apiKey.permissions.length > 5) score -= 10;
    if (apiKey.permissions.some(p => p.action === 'admin')) score -= 15;
    
    // Check usage
    if (apiKey.usage.errorRate > 0.1) score -= 10;
    if (apiKey.usage.rateLimitHits > 10) score -= 5;
    
    // Check security config
    if (!apiKey.security.monitoring.logAccess) score -= 10;
    if (apiKey.security.access.ipWhitelist.length === 0) score -= 15;
    
    return Math.max(0, score);
  }, []);

  return useMemo(() => ({
    formatApiKeyType,
    formatApiKeyStatus,
    getStatusColor,
    maskApiKey,
    calculateSecurityScore,
  }), [
    formatApiKeyType,
    formatApiKeyStatus,
    getStatusColor,
    maskApiKey,
    calculateSecurityScore,
  ]);
}

export const apiKeyManagementService = {
  fetchApiKeys,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
  validateApiKey,
  getKeyAuditLog,
  getKeySecurityReport,
  logAgentAction,
  
  queryKeys: {
    keys: (userId: string) => ['api-keys', userId],
    audit: (keyId: string) => ['api-key-audit', keyId],
    security: (keyId: string) => ['api-key-security', keyId],
  },
  
  utils: {
    formatApiKeyType: (type: ApiKeyType) => {
      const labels: Record<ApiKeyType, string> = {
        read_only: 'Read Only',
        read_write: 'Read/Write',
        admin: 'Admin',
        service: 'Service',
        integration: 'Integration',
        webhook: 'Webhook',
        custom: 'Custom',
      };
      return labels[type] || type;
    },
    maskApiKey: (key: string) => {
      if (key.length <= 8) return '*'.repeat(key.length);
      return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
    },
  },
}; 