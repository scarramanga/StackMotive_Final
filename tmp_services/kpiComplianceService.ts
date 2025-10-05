import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for KPI Compliance
export interface ComplianceKPI {
  id: string;
  name: string;
  category: 'risk' | 'performance' | 'regulatory' | 'operational' | 'custom';
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'compliant' | 'warning' | 'critical' | 'unknown';
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  isActive: boolean;
  automatedCheck: boolean;
  source: string;
  historicalData: Array<{
    date: string;
    value: number;
    status: string;
  }>;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  kpiId: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'range';
  value: number | { min: number; max: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'log' | 'notify';
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export interface ComplianceViolation {
  id: string;
  ruleId: string;
  kpiId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  title: string;
  period: { start: string; end: string };
  kpis: ComplianceKPI[];
  violations: ComplianceViolation[];
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    totalKPIs: number;
    compliantKPIs: number;
    warningKPIs: number;
    criticalKPIs: number;
    openViolations: number;
    resolvedViolations: number;
  };
  generatedAt: string;
  generatedBy: string;
}

export interface ComplianceMetrics {
  overallScore: number;
  riskLevel: string;
  totalKPIs: number;
  compliantKPIs: number;
  warningKPIs: number;
  criticalKPIs: number;
  openViolations: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  lastAssessment: string;
  nextAssessment: string;
}

// Enhanced types for KPI Compliance Panel
export interface KPIThreshold {
  id: string;
  name: string;
  description: string;
  threshold: number;
  unit: string;
  type: 'max' | 'min' | 'exact';
  category: 'risk' | 'performance' | 'portfolio' | 'strategy';
  priority: 'high' | 'medium' | 'low';
}

export interface KPIResult {
  kpi: KPIThreshold;
  currentValue: number;
  status: 'pass' | 'fail' | 'warning';
  rationale: string;
  lastChecked: Date;
  trend?: 'improving' | 'deteriorating' | 'stable';
}

export interface ComplianceOverview {
  totalKPIs: number;
  passing: number;
  failing: number;
  warnings: number;
  overallScore: number;
  lastUpdated: Date;
}

// Default KPI thresholds
const DEFAULT_KPIS: KPIThreshold[] = [
  {
    id: 'max_drawdown',
    name: 'Maximum Drawdown',
    description: 'Portfolio should not exceed maximum drawdown threshold',
    threshold: 15,
    unit: '%',
    type: 'max',
    category: 'risk',
    priority: 'high'
  },
  {
    id: 'rebalance_frequency',
    name: 'Rebalance Frequency',
    description: 'Portfolio should be rebalanced at least every 45 days',
    threshold: 45,
    unit: 'days',
    type: 'max',
    category: 'portfolio',
    priority: 'medium'
  },
  {
    id: 'signal_drift',
    name: 'Signal Drift',
    description: 'Strategy signal drift should remain below threshold',
    threshold: 5,
    unit: '%',
    type: 'max',
    category: 'strategy',
    priority: 'high'
  },
  {
    id: 'trust_score',
    name: 'Overlay Trust Score',
    description: 'All active overlays should maintain minimum trust score',
    threshold: 0.6,
    unit: 'score',
    type: 'min',
    category: 'strategy',
    priority: 'medium'
  },
  {
    id: 'volatility_control',
    name: 'Volatility Control',
    description: 'Portfolio volatility should remain within acceptable range',
    threshold: 25,
    unit: '%',
    type: 'max',
    category: 'risk',
    priority: 'medium'
  },
  {
    id: 'diversification',
    name: 'Portfolio Diversification',
    description: 'No single overlay should exceed 40% allocation',
    threshold: 40,
    unit: '%',
    type: 'max',
    category: 'portfolio',
    priority: 'high'
  }
];

// KPI Compliance Service Class
export class KPIComplianceService {
  private baseUrl = '/api/compliance';

  // Fetch compliance dashboard data
  async getComplianceData(vaultId?: string): Promise<{
    kpis: ComplianceKPI[];
    rules: ComplianceRule[];
    violations: ComplianceViolation[];
    metrics: ComplianceMetrics;
    recentActivity: Array<{ id: string; type: string; message: string; timestamp: string }>;
  }> {
    const url = vaultId 
      ? `${this.baseUrl}/dashboard?vaultId=${vaultId}`
      : `${this.baseUrl}/dashboard`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch compliance data');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('compliance_data_fetched', {
      totalKPIs: result.kpis.length,
      activeKPIs: result.kpis.filter((kpi: ComplianceKPI) => kpi.isActive).length,
      openViolations: result.violations.filter((v: ComplianceViolation) => v.status === 'open').length,
      overallScore: result.metrics.overallScore,
      riskLevel: result.metrics.riskLevel,
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Enhanced KPI Panel Methods
  async getKPIComplianceResults(vaultId?: string, kpiThresholds: KPIThreshold[] = DEFAULT_KPIS): Promise<{
    results: KPIResult[];
    overview: ComplianceOverview;
  }> {
    // Fetch all required data
    const [performanceData, rebalanceData, overlayData] = await Promise.all([
      this.fetchPerformanceData(vaultId),
      this.fetchRebalanceData(vaultId),
      this.fetchOverlayData(vaultId)
    ]);
    
    // Calculate KPI results
    const results: KPIResult[] = kpiThresholds.map(kpi => {
      const result = this.calculateKPIResult(kpi, performanceData, rebalanceData, overlayData);
      return result;
    });
    
    // Generate overview
    const overview: ComplianceOverview = {
      totalKPIs: results.length,
      passing: results.filter(r => r.status === 'pass').length,
      failing: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      overallScore: this.calculateOverallScore(results.map(r => ({ status: r.status === 'pass' ? 'compliant' : r.status === 'warning' ? 'warning' : 'critical' } as ComplianceKPI))),
      lastUpdated: new Date()
    };
    
    // Log agent memory
    await this.logAgentMemory('kpi_compliance_calculated', {
      totalKPIs: overview.totalKPIs,
      passingKPIs: overview.passing,
      failingKPIs: overview.failing,
      warningKPIs: overview.warnings,
      overallScore: overview.overallScore,
      timestamp: new Date().toISOString()
    });
    
    return { results, overview };
  }

  private async fetchPerformanceData(vaultId?: string): Promise<any> {
    const url = vaultId 
      ? `/api/portfolio/performance?vaultId=${vaultId}&timeRange=30d`
      : '/api/portfolio/performance?timeRange=30d';
    
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
  }

  private async fetchRebalanceData(vaultId?: string): Promise<any> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-recommendations?vaultId=${vaultId}`
      : '/api/portfolio/rebalance-recommendations';
    
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
  }

  private async fetchOverlayData(vaultId?: string): Promise<any> {
    const url = vaultId 
      ? `/api/strategy/overlays?vaultId=${vaultId}`
      : '/api/strategy/overlays';
    
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
  }

  private calculateKPIResult(kpi: KPIThreshold, performanceData: any, rebalanceData: any, overlayData: any): KPIResult {
    let currentValue = 0;
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    let rationale = '';
    let trend: 'improving' | 'deteriorating' | 'stable' = 'stable';

    switch (kpi.id) {
      case 'max_drawdown':
        currentValue = this.calculateMaxDrawdown(performanceData);
        status = currentValue <= kpi.threshold ? 'pass' : 'fail';
        rationale = status === 'pass' 
          ? `Drawdown of ${currentValue.toFixed(1)}% is within acceptable range`
          : `Drawdown of ${currentValue.toFixed(1)}% exceeds threshold of ${kpi.threshold}%`;
        trend = Math.random() > 0.5 ? 'improving' : 'stable';
        break;

      case 'rebalance_frequency':
        currentValue = Math.floor(Math.random() * 60) + 10; // 10-70 days
        status = currentValue <= kpi.threshold ? 'pass' : currentValue <= kpi.threshold * 1.2 ? 'warning' : 'fail';
        rationale = status === 'pass' 
          ? `Last rebalanced ${currentValue} days ago, within schedule`
          : status === 'warning'
          ? `${currentValue} days since rebalance, approaching threshold`
          : `${currentValue} days since rebalance exceeds ${kpi.threshold} day requirement`;
        break;

      case 'signal_drift':
        currentValue = this.calculateSignalDrift(overlayData);
        status = currentValue <= kpi.threshold ? 'pass' : currentValue <= kpi.threshold * 1.5 ? 'warning' : 'fail';
        rationale = status === 'pass'
          ? `Signal drift of ${currentValue.toFixed(1)}% is acceptable`
          : `Signal drift of ${currentValue.toFixed(1)}% indicates strategy misalignment`;
        trend = 'deteriorating';
        break;

      case 'trust_score':
        currentValue = this.calculateMinTrustScore(overlayData);
        status = currentValue >= kpi.threshold ? 'pass' : currentValue >= kpi.threshold * 0.8 ? 'warning' : 'fail';
        rationale = status === 'pass'
          ? `All overlays meet trust score requirements`
          : `Some overlays fall below minimum trust score of ${(kpi.threshold * 100).toFixed(0)}%`;
        trend = 'improving';
        break;

      case 'volatility_control':
        currentValue = this.calculateVolatility(performanceData);
        status = currentValue <= kpi.threshold ? 'pass' : currentValue <= kpi.threshold * 1.1 ? 'warning' : 'fail';
        rationale = status === 'pass'
          ? `Portfolio volatility of ${currentValue.toFixed(1)}% is well controlled`
          : `Portfolio volatility of ${currentValue.toFixed(1)}% exceeds target range`;
        break;

      case 'diversification':
        currentValue = this.calculateMaxAllocation(overlayData);
        status = currentValue <= kpi.threshold ? 'pass' : currentValue <= kpi.threshold * 1.1 ? 'warning' : 'fail';
        rationale = status === 'pass'
          ? `Portfolio is well diversified with max allocation of ${currentValue.toFixed(1)}%`
          : `Portfolio concentration risk with ${currentValue.toFixed(1)}% in single overlay`;
        break;

      default:
        rationale = 'KPI evaluation not implemented';
    }

    return {
      kpi,
      currentValue,
      status,
      rationale,
      lastChecked: new Date(),
      trend
    };
  }

  // Helper calculation methods
  private calculateMaxDrawdown(data: any[]): number {
    if (!Array.isArray(data) || data.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    
    for (const point of data) {
      cumulative += (point.value || 0);
      if (cumulative > peak) peak = cumulative;
      const drawdown = (peak - cumulative) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  private calculateSignalDrift(overlays: any): number {
    if (!overlays || !Array.isArray(overlays)) return 0;
    return Math.random() * 10; // Mock implementation
  }

  private calculateMinTrustScore(overlays: any): number {
    if (!overlays || !Array.isArray(overlays)) return 0.5;
    return Math.random() * 0.4 + 0.6; // Mock implementation
  }

  private calculateVolatility(data: any[]): number {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return Math.random() * 30 + 10; // Mock implementation
  }

  private calculateMaxAllocation(overlays: any): number {
    if (!overlays || !Array.isArray(overlays)) return 0;
    return Math.random() * 50 + 20; // Mock implementation
  }

  // Status and formatting methods
  getKPIStatusColor(status: 'pass' | 'fail' | 'warning'): string {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  getKPIStatusBackground(status: 'pass' | 'fail' | 'warning'): string {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'fail': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getPriorityBadgeClass(priority: 'high' | 'medium' | 'low'): string {
    const priorityColors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return priorityColors[priority];
  }

  getCategoryIcon(category: 'risk' | 'performance' | 'portfolio' | 'strategy'): string {
    switch (category) {
      case 'risk': return 'shield';
      case 'performance': return 'bar-chart-3';
      case 'portfolio': return 'target';
      case 'strategy': return 'trending-down';
      default: return 'help-circle';
    }
  }

  getTrendIndicator(trend: 'improving' | 'deteriorating' | 'stable'): { text: string; color: string } {
    switch (trend) {
      case 'improving':
        return { text: '↗ Improving', color: 'text-green-600' };
      case 'deteriorating':
        return { text: '↘ Deteriorating', color: 'text-red-600' };
      case 'stable':
        return { text: '→ Stable', color: 'text-gray-600' };
      default:
        return { text: '? Unknown', color: 'text-gray-600' };
    }
  }

  formatKPIValue(value: number, unit: string): string {
    if (unit === 'score') {
      return (value * 100).toFixed(0) + '%';
    }
    return value.toFixed(1) + unit;
  }

  formatThreshold(threshold: number, unit: string, type: 'max' | 'min' | 'exact'): string {
    const formattedValue = unit === 'score' ? (threshold * 100).toFixed(0) + '%' : threshold.toFixed(0) + unit;
    switch (type) {
      case 'max': return `≤ ${formattedValue}`;
      case 'min': return `≥ ${formattedValue}`;
      case 'exact': return `= ${formattedValue}`;
    }
  }

  getOverallStatusText(score: number): { text: string; color: string } {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 75) return { text: 'Good', color: 'text-blue-600' };
    if (score >= 60) return { text: 'Fair', color: 'text-yellow-600' };
    return { text: 'Poor', color: 'text-red-600' };
  }

  // Create new KPI
  async createKPI(kpi: Omit<ComplianceKPI, 'id' | 'currentValue' | 'status' | 'lastUpdated' | 'historicalData'>, vaultId?: string): Promise<ComplianceKPI> {
    const url = vaultId 
      ? `${this.baseUrl}/kpis?vaultId=${vaultId}`
      : `${this.baseUrl}/kpis`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kpi),
    });
    
    if (!response.ok) {
      await this.logAgentMemory('kpi_creation_failed', {
        error: `Failed to create KPI: ${response.status}`,
        kpiName: kpi.name,
        category: kpi.category,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to create KPI');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('kpi_created', {
      kpiId: result.id,
      kpiName: result.name,
      category: result.category,
      targetValue: result.targetValue,
      isActive: result.isActive,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Update KPI
  async updateKPI(id: string, updates: Partial<ComplianceKPI>, vaultId?: string): Promise<ComplianceKPI> {
    const url = vaultId 
      ? `${this.baseUrl}/kpis/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/kpis/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      await this.logAgentMemory('kpi_update_failed', {
        error: `Failed to update KPI: ${response.status}`,
        kpiId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to update KPI');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('kpi_updated', {
      kpiId: id,
      updatedFields: Object.keys(updates),
      newStatus: result.status,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Delete KPI
  async deleteKPI(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/kpis/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/kpis/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      await this.logAgentMemory('kpi_deletion_failed', {
        error: `Failed to delete KPI: ${response.status}`,
        kpiId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to delete KPI');
    }
    
    // Log agent memory
    await this.logAgentMemory('kpi_deleted', {
      kpiId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Create compliance rule
  async createRule(rule: Omit<ComplianceRule, 'id' | 'triggerCount'>, vaultId?: string): Promise<ComplianceRule> {
    const url = vaultId 
      ? `${this.baseUrl}/rules?vaultId=${vaultId}`
      : `${this.baseUrl}/rules`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create rule');
    }
    
    return response.json();
  }

  // Resolve violation
  async resolveViolation(id: string, resolution: string, vaultId?: string): Promise<ComplianceViolation> {
    const url = vaultId 
      ? `${this.baseUrl}/violations/${id}/resolve?vaultId=${vaultId}`
      : `${this.baseUrl}/violations/${id}/resolve`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve violation');
    }
    
    return response.json();
  }

  // Generate compliance report
  async generateReport(period: { start: string; end: string }, vaultId?: string): Promise<ComplianceReport> {
    const url = vaultId 
      ? `${this.baseUrl}/reports/generate?vaultId=${vaultId}`
      : `${this.baseUrl}/reports/generate`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate compliance report');
    }
    
    return response.json();
  }

  // Run compliance check
  async runComplianceCheck(vaultId?: string): Promise<{ 
    checkId: string; 
    status: string; 
    results: { kpiId: string; status: string; value: number }[] 
  }> {
    const url = vaultId 
      ? `${this.baseUrl}/check?vaultId=${vaultId}`
      : `${this.baseUrl}/check`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      await this.logAgentMemory('compliance_check_failed', {
        error: `Failed to run compliance check: ${response.status}`,
        vaultId: vaultId || null,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to run compliance check');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('compliance_check_completed', {
      checkId: result.checkId,
      status: result.status,
      resultsCount: result.results.length,
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get KPI status color
  getKPIStatusColor(status: ComplianceKPI['status']): string {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'unknown': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get KPI status background
  getKPIStatusBackground(status: ComplianceKPI['status']): string {
    switch (status) {
      case 'compliant': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
      case 'unknown': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get violation severity color
  getViolationSeverityColor(severity: ComplianceViolation['severity']): string {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get trend icon
  getTrendIcon(trend: ComplianceKPI['trend']): string {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'stable': return 'minus';
      case 'declining': return 'trending-down';
      default: return 'help-circle';
    }
  }

  // Calculate KPI compliance percentage
  calculateCompliancePercentage(current: number, target: number): number {
    if (target === 0) return 100;
    return Math.min(100, Math.max(0, (current / target) * 100));
  }

  // Calculate overall compliance score
  calculateOverallScore(kpis: ComplianceKPI[]): number {
    if (kpis.length === 0) return 0;
    
    const activeKPIs = kpis.filter(kpi => kpi.isActive);
    if (activeKPIs.length === 0) return 0;
    
    const scoreMap = { compliant: 100, warning: 60, critical: 20, unknown: 0 };
    const totalScore = activeKPIs.reduce((sum, kpi) => sum + scoreMap[kpi.status], 0);
    
    return Math.round(totalScore / activeKPIs.length);
  }

  // Determine risk level from score
  determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  // Format KPI value
  formatKPIValue(value: number, unit: string): string {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === '$') return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
    return `${value.toFixed(2)} ${unit}`;
  }

  // Check if KPI is within threshold
  checkKPIThreshold(kpi: ComplianceKPI): 'compliant' | 'warning' | 'critical' {
    const { currentValue, targetValue, threshold } = kpi;
    const deviation = Math.abs(currentValue - targetValue);
    const percentDeviation = targetValue !== 0 ? (deviation / Math.abs(targetValue)) * 100 : 0;
    
    if (percentDeviation <= threshold.warning) return 'compliant';
    if (percentDeviation <= threshold.critical) return 'warning';
    return 'critical';
  }

  // Filter KPIs by category
  filterKPIsByCategory(kpis: ComplianceKPI[], category: string): ComplianceKPI[] {
    if (category === 'all') return kpis;
    return kpis.filter(kpi => kpi.category === category);
  }

  // Filter KPIs by status
  filterKPIsByStatus(kpis: ComplianceKPI[], status: string): ComplianceKPI[] {
    if (status === 'all') return kpis;
    return kpis.filter(kpi => kpi.status === status);
  }

  // Sort KPIs
  sortKPIs(kpis: ComplianceKPI[], sortBy: 'name' | 'status' | 'category' | 'lastUpdated', order: 'asc' | 'desc' = 'asc'): ComplianceKPI[] {
    return [...kpis].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'status':
          const statusOrder = { compliant: 1, warning: 2, critical: 3, unknown: 4 };
          compareValue = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'category':
          compareValue = a.category.localeCompare(b.category);
          break;
        case 'lastUpdated':
          compareValue = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get unique categories
  getUniqueCategories(kpis: ComplianceKPI[]): string[] {
    return [...new Set(kpis.map(kpi => kpi.category))];
  }

  // Calculate category performance
  calculateCategoryPerformance(kpis: ComplianceKPI[]): Array<{
    category: string;
    total: number;
    compliant: number;
    warning: number;
    critical: number;
    score: number;
  }> {
    const categories = this.getUniqueCategories(kpis);
    
    return categories.map(category => {
      const categoryKPIs = kpis.filter(kpi => kpi.category === category && kpi.isActive);
      const total = categoryKPIs.length;
      const compliant = categoryKPIs.filter(kpi => kpi.status === 'compliant').length;
      const warning = categoryKPIs.filter(kpi => kpi.status === 'warning').length;
      const critical = categoryKPIs.filter(kpi => kpi.status === 'critical').length;
      const score = this.calculateOverallScore(categoryKPIs);
      
      return { category, total, compliant, warning, critical, score };
    });
  }

  // Create default KPI
  createDefaultKPI(): Omit<ComplianceKPI, 'id' | 'currentValue' | 'status' | 'lastUpdated' | 'historicalData'> {
    return {
      name: '',
      category: 'custom',
      description: '',
      targetValue: 100,
      unit: '%',
      threshold: {
        warning: 10,
        critical: 20
      },
      trend: 'stable',
      frequency: 'daily',
      isActive: true,
      automatedCheck: false,
      source: 'manual'
    };
  }

  // Validate KPI form
  validateKPIForm(kpi: Partial<ComplianceKPI>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!kpi.name?.trim()) {
      errors.push('KPI name is required');
    }
    
    if (!kpi.description?.trim()) {
      errors.push('KPI description is required');
    }
    
    if (kpi.targetValue === undefined || kpi.targetValue <= 0) {
      errors.push('Target value must be greater than 0');
    }
    
    if (!kpi.unit?.trim()) {
      errors.push('Unit is required');
    }
    
    if (!kpi.threshold?.warning || kpi.threshold.warning < 0) {
      errors.push('Warning threshold must be greater than or equal to 0');
    }
    
    if (!kpi.threshold?.critical || kpi.threshold.critical < 0) {
      errors.push('Critical threshold must be greater than or equal to 0');
    }
    
    if (kpi.threshold?.warning && kpi.threshold?.critical && kpi.threshold.warning > kpi.threshold.critical) {
      errors.push('Warning threshold must be less than or equal to critical threshold');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format relative time
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  }

  // Generate compliance summary
  generateComplianceSummary(kpis: ComplianceKPI[], violations: ComplianceViolation[]): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    criticalIssues: number;
    recommendations: string[];
    nextActions: string[];
  } {
    const score = this.calculateOverallScore(kpis);
    const openViolations = violations.filter(v => v.status === 'open');
    const criticalViolations = openViolations.filter(v => v.severity === 'critical');
    
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90 && criticalViolations.length === 0) overallHealth = 'excellent';
    else if (score >= 70 && criticalViolations.length <= 1) overallHealth = 'good';
    else if (score >= 50 && criticalViolations.length <= 3) overallHealth = 'fair';
    else overallHealth = 'poor';
    
    const recommendations: string[] = [];
    const nextActions: string[] = [];
    
    if (criticalViolations.length > 0) {
      recommendations.push(`Address ${criticalViolations.length} critical violations immediately`);
      nextActions.push('Review and resolve critical compliance violations');
    }
    
    const criticalKPIs = kpis.filter(kpi => kpi.status === 'critical' && kpi.isActive);
    if (criticalKPIs.length > 0) {
      recommendations.push(`Monitor ${criticalKPIs.length} critical KPIs closely`);
      nextActions.push('Investigate root causes of critical KPI failures');
    }
    
    if (score < 70) {
      recommendations.push('Review and update compliance thresholds');
      nextActions.push('Schedule compliance strategy review meeting');
    }
    
    return {
      overallHealth,
      criticalIssues: criticalViolations.length + criticalKPIs.length,
      recommendations,
      nextActions
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'KPIComplianceService',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const kpiComplianceService = new KPIComplianceService();

// React Query hooks
export const useComplianceData = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/compliance/dashboard', vaultId],
    queryFn: () => kpiComplianceService.getComplianceData(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useCreateKPI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ kpi, vaultId }: { kpi: Omit<ComplianceKPI, 'id' | 'currentValue' | 'status' | 'lastUpdated' | 'historicalData'>; vaultId?: string }) => 
      kpiComplianceService.createKPI(kpi, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
};

export const useUpdateKPI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, vaultId }: { id: string; updates: Partial<ComplianceKPI>; vaultId?: string }) => 
      kpiComplianceService.updateKPI(id, updates, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
};

export const useDeleteKPI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      kpiComplianceService.deleteKPI(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ rule, vaultId }: { rule: Omit<ComplianceRule, 'id' | 'triggerCount'>; vaultId?: string }) => 
      kpiComplianceService.createRule(rule, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
};

export const useResolveViolation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, resolution, vaultId }: { id: string; resolution: string; vaultId?: string }) => 
      kpiComplianceService.resolveViolation(id, resolution, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
};

export const useGenerateReport = () => {
  return useMutation({
    mutationFn: ({ period, vaultId }: { period: { start: string; end: string }; vaultId?: string }) => 
      kpiComplianceService.generateReport(period, vaultId),
  });
};

export const useRunComplianceCheck = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId }: { vaultId?: string }) => 
      kpiComplianceService.runComplianceCheck(vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/dashboard'] });
    },
  });
}; 