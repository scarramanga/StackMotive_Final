import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export interface IntegrityCheckResult {
  id: string;
  timestamp: string;
  version: string;
  status: CheckStatus;
  overallScore: number;
  blockResults: BlockResult[];
  systemChecks: SystemCheck[];
  complianceStatus: ComplianceStatus;
  remediation: RemediationPlan;
  metadata: CheckMetadata;
}

export interface BlockResult {
  blockId: string;
  blockName: string;
  blockNumber: number;
  status: BlockStatus;
  score: number;
  checks: ComponentCheck[];
  dependencies: DependencyCheck[];
  compliance: BlockCompliance;
  issues: BlockIssue[];
  recommendations: BlockRecommendation[];
}

export interface ComponentCheck {
  id: string;
  name: string;
  type: ComponentType;
  required: boolean;
  status: ComponentStatus;
  details: ComponentDetails;
  validation: ComponentValidation;
  performance: ComponentPerformance;
}

export interface ComponentDetails {
  path: string;
  size: number;
  lastModified: string;
  checksum: string;
  version: string;
  dependencies: string[];
  exports: string[];
}

export interface ComponentValidation {
  syntax: ValidationResult;
  types: ValidationResult;
  imports: ValidationResult;
  exports: ValidationResult;
  tests: ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface ComponentPerformance {
  loadTime: number;
  memoryUsage: number;
  complexity: number;
  maintainability: number;
  coverage: number;
}

export interface DependencyCheck {
  dependency: string;
  version: string;
  required: boolean;
  status: DependencyStatus;
  vulnerabilities: SecurityVulnerability[];
  license: LicenseInfo;
}

export interface SecurityVulnerability {
  id: string;
  severity: VulnerabilitySeverity;
  description: string;
  cvss: number;
  cwe: string;
  remediation: string;
}

export interface LicenseInfo {
  name: string;
  type: string;
  compatible: boolean;
  restrictions: string[];
}

export interface BlockCompliance {
  standards: ComplianceStandard[];
  score: number;
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
}

export interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  status: ComplianceLevel;
  score: number;
  requirements: string[];
}

export interface ComplianceRequirement {
  id: string;
  standard: string;
  name: string;
  status: RequirementStatus;
  evidence: string;
  notes: string;
}

export interface ComplianceViolation {
  id: string;
  standard: string;
  requirement: string;
  severity: ViolationSeverity;
  description: string;
  impact: string;
  remediation: string;
}

export interface BlockIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  component: string;
  description: string;
  impact: IssueImpact;
  resolution: IssueResolution;
  detected: string;
}

export interface IssueImpact {
  functionality: ImpactLevel;
  performance: ImpactLevel;
  security: ImpactLevel;
  usability: ImpactLevel;
  maintainability: ImpactLevel;
}

export interface IssueResolution {
  type: ResolutionType;
  description: string;
  effort: EffortLevel;
  priority: ResolutionPriority;
  deadline: string;
  responsible: string;
}

export interface BlockRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  rationale: string;
  implementation: string;
  benefits: string[];
  risks: string[];
  effort: EffortLevel;
  timeline: string;
}

export interface SystemCheck {
  id: string;
  name: string;
  category: SystemCategory;
  status: SystemStatus;
  result: SystemResult;
  metrics: SystemMetrics;
  requirements: SystemRequirement[];
}

export interface SystemResult {
  passed: boolean;
  score: number;
  details: string;
  evidence: string[];
  issues: string[];
  recommendations: string[];
}

export interface SystemMetrics {
  availability: number;
  performance: number;
  security: number;
  scalability: number;
  reliability: number;
  usability: number;
}

export interface SystemRequirement {
  id: string;
  name: string;
  type: RequirementType;
  status: RequirementStatus;
  value: any;
  threshold: any;
  unit: string;
}

export interface ComplianceStatus {
  overall: ComplianceLevel;
  standards: ComplianceStandard[];
  violations: ComplianceViolation[];
  exemptions: ComplianceExemption[];
  lastAssessed: string;
  nextAssessment: string;
}

export interface ComplianceExemption {
  id: string;
  requirement: string;
  reason: string;
  approver: string;
  expires: string;
  conditions: string[];
}

export interface RemediationPlan {
  id: string;
  summary: RemediationSummary;
  actions: RemediationAction[];
  timeline: RemediationTimeline;
  resources: RemediationResource[];
  risks: RemediationRisk[];
}

export interface RemediationSummary {
  totalActions: number;
  criticalActions: number;
  estimatedEffort: number;
  estimatedDuration: number;
  successProbability: number;
}

export interface RemediationAction {
  id: string;
  title: string;
  description: string;
  type: ActionType;
  priority: ActionPriority;
  effort: EffortLevel;
  duration: number;
  dependencies: string[];
  responsible: string;
  deadline: string;
  status: ActionStatus;
}

export interface RemediationTimeline {
  phases: RemediationPhase[];
  milestones: RemediationMilestone[];
  critical_path: string[];
  buffer_time: number;
}

export interface RemediationPhase {
  id: string;
  name: string;
  description: string;
  duration: number;
  actions: string[];
  dependencies: string[];
  deliverables: string[];
}

export interface RemediationMilestone {
  id: string;
  name: string;
  description: string;
  date: string;
  criteria: string[];
  dependencies: string[];
}

export interface RemediationResource {
  id: string;
  type: ResourceType;
  name: string;
  availability: number;
  cost: number;
  skills: string[];
  allocation: ResourceAllocation[];
}

export interface ResourceAllocation {
  action: string;
  effort: number;
  start_date: string;
  end_date: string;
}

export interface RemediationRisk {
  id: string;
  description: string;
  probability: number;
  impact: number;
  score: number;
  mitigation: string;
  contingency: string;
}

export interface CheckMetadata {
  version: string;
  checksum: string;
  duration: number;
  environment: string;
  configuration: CheckConfiguration;
  statistics: CheckStatistics;
}

export interface CheckConfiguration {
  standards: string[];
  strictness: StrictnessLevel;
  include_patterns: string[];
  exclude_patterns: string[];
  custom_rules: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: RuleSeverity;
  enabled: boolean;
}

export interface CheckStatistics {
  blocks_checked: number;
  components_checked: number;
  files_analyzed: number;
  lines_of_code: number;
  test_coverage: number;
  security_scan_duration: number;
}

export interface AuditRequest {
  includeBlocks?: string[];
  excludeBlocks?: string[];
  standards?: string[];
  strictness?: StrictnessLevel;
  generateReport?: boolean;
  includeRemediation?: boolean;
}

export interface BlockMetadata {
  id: string;
  name: string;
  number: number;
  category: string;
  description: string;
  dependencies: string[];
  files: string[];
  tests: string[];
  documentation: string[];
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export type CheckStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BlockStatus = 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_checked' | 'error';
export type ComponentType = 'service' | 'panel' | 'hook' | 'engine' | 'store' | 'util' | 'type' | 'test';
export type ComponentStatus = 'valid' | 'invalid' | 'warning' | 'missing' | 'deprecated';
export type DependencyStatus = 'up_to_date' | 'outdated' | 'vulnerable' | 'missing' | 'incompatible';
export type VulnerabilitySeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceLevel = 'compliant' | 'non_compliant' | 'partial' | 'unknown';
export type RequirementStatus = 'met' | 'not_met' | 'partial' | 'not_applicable' | 'exempted';
export type ViolationSeverity = 'minor' | 'major' | 'critical' | 'blocking';
export type IssueType = 'bug' | 'performance' | 'security' | 'compliance' | 'design' | 'documentation';
export type IssueSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ResolutionType = 'fix' | 'workaround' | 'configuration' | 'refactor' | 'document';
export type ResolutionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EffortLevel = 'trivial' | 'small' | 'medium' | 'large' | 'epic';
export type RecommendationType = 'enhancement' | 'optimization' | 'security' | 'compliance' | 'refactoring';
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type SystemCategory = 'infrastructure' | 'database' | 'api' | 'frontend' | 'security' | 'monitoring';
export type SystemStatus = 'healthy' | 'warning' | 'error' | 'critical' | 'unknown';
export type RequirementType = 'functional' | 'non_functional' | 'technical' | 'business' | 'compliance';
export type ActionType = 'code_change' | 'configuration' | 'deployment' | 'testing' | 'documentation';
export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type ResourceType = 'developer' | 'tester' | 'devops' | 'security' | 'manager' | 'external';
export type StrictnessLevel = 'lenient' | 'standard' | 'strict' | 'pedantic';
export type RuleSeverity = 'info' | 'warning' | 'error' | 'critical';

const API_BASE = '/api/mvp-final-integrity-checker';

async function runMvpAudit(userId: string, request: AuditRequest): Promise<IntegrityCheckResult> {
  const response = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...request }),
  });
  if (!response.ok) throw new Error(`Failed to run MVP audit: ${response.statusText}`);
  return response.json();
}

async function getIntegrityCheckResults(userId: string): Promise<IntegrityCheckResult[]> {
  const response = await fetch(`${API_BASE}/results?userId=${userId}`);
  if (!response.ok) throw new Error(`Failed to get integrity check results: ${response.statusText}`);
  return response.json();
}

async function getBlockMetadata(): Promise<BlockMetadata[]> {
  const response = await fetch(`${API_BASE}/blocks`);
  if (!response.ok) throw new Error(`Failed to get block metadata: ${response.statusText}`);
  return response.json();
}

async function getComplianceReport(resultId: string): Promise<ComplianceStatus> {
  const response = await fetch(`${API_BASE}/results/${resultId}/compliance`);
  if (!response.ok) throw new Error(`Failed to get compliance report: ${response.statusText}`);
  return response.json();
}

async function generateRemediationPlan(resultId: string): Promise<RemediationPlan> {
  const response = await fetch(`${API_BASE}/results/${resultId}/remediation`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Failed to generate remediation plan: ${response.statusText}`);
  return response.json();
}

async function exportAuditReport(resultId: string, format: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/results/${resultId}/export?format=${format}`);
  if (!response.ok) throw new Error(`Failed to export audit report: ${response.statusText}`);
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

export function useIntegrityCheckResults(userId: string) {
  return useQuery({
    queryKey: ['integrity-check-results', userId],
    queryFn: () => getIntegrityCheckResults(userId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useRunMvpAudit(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: AuditRequest) => runMvpAudit(userId, request),
    onSuccess: (result, request) => {
      logAgentAction({
        blockId: 'block-60',
        userId,
        action: 'run_mvp_audit',
        timestamp: new Date().toISOString(),
        details: {
          resultId: result.id,
          overallScore: result.overallScore,
          status: result.status,
          blocksChecked: result.blockResults.length,
          systemChecks: result.systemChecks.length,
          totalIssues: result.blockResults.reduce((sum, block) => sum + block.issues.length, 0),
          criticalIssues: result.blockResults.reduce((sum, block) => 
            sum + block.issues.filter(issue => issue.severity === 'critical').length, 0
          ),
          complianceLevel: result.complianceStatus.overall,
          duration: result.metadata.duration,
          includeBlocks: request.includeBlocks?.length || 'all',
          standards: request.standards?.length || 'default',
          strictness: request.strictness || 'standard',
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['integrity-check-results', userId] });
    },
  });
}

export function useBlockMetadata() {
  return useQuery({
    queryKey: ['block-metadata'],
    queryFn: getBlockMetadata,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

export function useComplianceReport(resultId: string, userId: string) {
  return useQuery({
    queryKey: ['compliance-report', resultId],
    queryFn: () => getComplianceReport(resultId),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    enabled: !!resultId,
    onSuccess: (report) => {
      logAgentAction({
        blockId: 'block-60',
        userId,
        action: 'view_compliance_report',
        timestamp: new Date().toISOString(),
        details: {
          resultId,
          overallCompliance: report.overall,
          standards: report.standards.length,
          violations: report.violations.length,
          exemptions: report.exemptions.length,
          criticalViolations: report.violations.filter(v => v.severity === 'critical').length,
        },
      });
    },
  });
}

export function useGenerateRemediationPlan(userId: string) {
  return useMutation({
    mutationFn: (resultId: string) => generateRemediationPlan(resultId),
    onSuccess: (plan, resultId) => {
      logAgentAction({
        blockId: 'block-60',
        userId,
        action: 'generate_remediation_plan',
        timestamp: new Date().toISOString(),
        details: {
          resultId,
          planId: plan.id,
          totalActions: plan.summary.totalActions,
          criticalActions: plan.summary.criticalActions,
          estimatedEffort: plan.summary.estimatedEffort,
          estimatedDuration: plan.summary.estimatedDuration,
          successProbability: plan.summary.successProbability,
          phases: plan.timeline.phases.length,
          milestones: plan.timeline.milestones.length,
          resources: plan.resources.length,
          risks: plan.risks.length,
        },
      });
    },
  });
}

export function useExportAuditReport(userId: string) {
  return useMutation({
    mutationFn: ({ resultId, format }: { resultId: string; format: string }) =>
      exportAuditReport(resultId, format),
    onSuccess: (blob, { resultId, format }) => {
      logAgentAction({
        blockId: 'block-60',
        userId,
        action: 'export_audit_report',
        timestamp: new Date().toISOString(),
        details: {
          resultId,
          format,
          size: blob.size,
        },
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mvp-audit-report-${resultId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useMvpFinalIntegrityCheckerUtils(userId: string) {
  const formatComplianceLevel = useCallback((level: ComplianceLevel): string => {
    const labels: Record<ComplianceLevel, string> = {
      compliant: 'Compliant',
      non_compliant: 'Non-Compliant',
      partial: 'Partially Compliant',
      unknown: 'Unknown',
    };
    return labels[level] || level;
  }, []);

  const getComplianceColor = useCallback((level: ComplianceLevel): string => {
    const colors: Record<ComplianceLevel, string> = {
      compliant: '#10B981',
      non_compliant: '#EF4444',
      partial: '#F59E0B',
      unknown: '#6B7280',
    };
    return colors[level] || '#6B7280';
  }, []);

  const formatBlockStatus = useCallback((status: BlockStatus): string => {
    const labels: Record<BlockStatus, string> = {
      compliant: 'Compliant',
      non_compliant: 'Non-Compliant',
      partially_compliant: 'Partially Compliant',
      not_checked: 'Not Checked',
      error: 'Error',
    };
    return labels[status] || status;
  }, []);

  const getBlockStatusColor = useCallback((status: BlockStatus): string => {
    const colors: Record<BlockStatus, string> = {
      compliant: '#10B981',
      non_compliant: '#EF4444',
      partially_compliant: '#F59E0B',
      not_checked: '#6B7280',
      error: '#7C2D12',
    };
    return colors[status] || '#6B7280';
  }, []);

  const calculateOverallHealth = useCallback((result: IntegrityCheckResult): number => {
    const blockScores = result.blockResults.map(block => block.score);
    const systemScores = result.systemChecks.map(check => check.result.score);
    const allScores = [...blockScores, ...systemScores];
    
    return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  }, []);

  const generateExecutiveSummary = useCallback((result: IntegrityCheckResult): string => {
    const totalBlocks = result.blockResults.length;
    const compliantBlocks = result.blockResults.filter(b => b.status === 'compliant').length;
    const criticalIssues = result.blockResults.reduce((sum, block) => 
      sum + block.issues.filter(issue => issue.severity === 'critical').length, 0
    );
    
    return `
# MVP Integrity Check - Executive Summary

## Overall Status
- **Score**: ${result.overallScore.toFixed(1)}/100
- **Status**: ${result.status}
- **Compliance**: ${result.complianceStatus.overall}
- **Timestamp**: ${new Date(result.timestamp).toLocaleString()}

## Block Summary
- **Total Blocks**: ${totalBlocks}
- **Compliant Blocks**: ${compliantBlocks}
- **Compliance Rate**: ${((compliantBlocks / totalBlocks) * 100).toFixed(1)}%
- **Critical Issues**: ${criticalIssues}

## System Health
- **System Checks**: ${result.systemChecks.length}
- **Passed**: ${result.systemChecks.filter(c => c.result.passed).length}
- **Failed**: ${result.systemChecks.filter(c => !c.result.passed).length}

## Compliance Overview
- **Standards Evaluated**: ${result.complianceStatus.standards.length}
- **Violations**: ${result.complianceStatus.violations.length}
- **Exemptions**: ${result.complianceStatus.exemptions.length}

## Remediation
${result.remediation ? `
- **Total Actions**: ${result.remediation.summary.totalActions}
- **Critical Actions**: ${result.remediation.summary.criticalActions}
- **Estimated Effort**: ${result.remediation.summary.estimatedEffort} hours
- **Success Probability**: ${(result.remediation.summary.successProbability * 100).toFixed(1)}%
` : '- No remediation plan generated'}

## Recommendations
${result.blockResults.slice(0, 5).map(block => 
  block.recommendations.slice(0, 1).map(rec => `- **${block.blockName}**: ${rec.title}`).join('\n')
).join('\n')}

*Report generated on ${new Date().toLocaleString()}*
`;
  }, []);

  return useMemo(() => ({
    formatComplianceLevel,
    getComplianceColor,
    formatBlockStatus,
    getBlockStatusColor,
    calculateOverallHealth,
    generateExecutiveSummary,
  }), [
    formatComplianceLevel,
    getComplianceColor,
    formatBlockStatus,
    getBlockStatusColor,
    calculateOverallHealth,
    generateExecutiveSummary,
  ]);
}

export const mvpFinalIntegrityCheckerService = {
  runMvpAudit,
  getIntegrityCheckResults,
  getBlockMetadata,
  getComplianceReport,
  generateRemediationPlan,
  exportAuditReport,
  logAgentAction,
  
  queryKeys: {
    results: (userId: string) => ['integrity-check-results', userId],
    blocks: () => ['block-metadata'],
    compliance: (resultId: string) => ['compliance-report', resultId],
    remediation: (resultId: string) => ['remediation-plan', resultId],
  },
  
  utils: {
    formatComplianceLevel: (level: ComplianceLevel) => {
      const labels: Record<ComplianceLevel, string> = {
        compliant: 'Compliant',
        non_compliant: 'Non-Compliant',
        partial: 'Partially Compliant',
        unknown: 'Unknown',
      };
      return labels[level] || level;
    },
    formatBlockStatus: (status: BlockStatus) => {
      const labels: Record<BlockStatus, string> = {
        compliant: 'Compliant',
        non_compliant: 'Non-Compliant',
        partially_compliant: 'Partially Compliant',
        not_checked: 'Not Checked',
        error: 'Error',
      };
      return labels[status] || status;
    },
  },
}; 