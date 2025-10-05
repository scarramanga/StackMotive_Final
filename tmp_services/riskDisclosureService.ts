import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Risk Disclosure
export interface RiskDisclosure {
  id: string;
  category: 'strategy' | 'asset_class' | 'signal_type' | 'market_risk' | 'operational' | 'regulatory';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  lastUpdated: string;
  version: string;
  isRequired: boolean;
  applicableStrategies: string[];
  applicableAssets: string[];
  regulatoryReference?: string;
  estimatedReadTime: number; // in minutes
}

export interface UserAcknowledgment {
  disclosureId: string;
  acknowledgedAt: string;
  version: string;
  userAgent: string;
  ipAddress: string;
}

export interface AcknowledgmentHistory {
  id: string;
  disclosureId: string;
  disclosureTitle: string;
  category: string;
  acknowledgedAt: string;
  version: string;
  isCurrentVersion: boolean;
}

export interface ComplianceStatus {
  isCompliant: boolean;
  requiredAcknowledgments: number;
  completedAcknowledgments: number;
  lastComplianceCheck: string;
  blockedActions: string[];
}

export interface RiskDisclosureData {
  disclosures: RiskDisclosure[];
  acknowledgments: UserAcknowledgment[];
  complianceStatus: ComplianceStatus;
  categories: Array<{
    category: string;
    displayName: string;
    count: number;
    requiredCount: number;
  }>;
}

export interface AcknowledgmentRequest {
  disclosureIds: string[];
  userConsent: boolean;
  timestamp: string;
}

export interface DisclosureFilter {
  category: string;
  severity?: string;
  isRequired?: boolean;
  acknowledgedStatus?: 'acknowledged' | 'pending' | 'all';
}

export interface PDFExportRequest {
  vaultId?: string;
  category?: string;
  includeHistory?: boolean;
  format: 'standard' | 'detailed' | 'summary';
}

// Risk Disclosure Service Class
export class RiskDisclosureService {
  private baseUrl = '/api/compliance';

  // Get risk disclosures and compliance status
  async getRiskDisclosures(vaultId?: string): Promise<RiskDisclosureData> {
    const params = new URLSearchParams();
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/disclosures?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch risk disclosures');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('disclosures_loaded', {
      vaultId,
      disclosureCount: result.disclosures.length,
      complianceStatus: result.complianceStatus.isCompliant,
      requiredAcknowledgments: result.complianceStatus.requiredAcknowledgments,
      completedAcknowledgments: result.complianceStatus.completedAcknowledgments,
      blockedActions: result.complianceStatus.blockedActions.length,
      categories: result.categories.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get acknowledgment history
  async getAcknowledgmentHistory(vaultId?: string): Promise<{ history: AcknowledgmentHistory[] }> {
    const params = new URLSearchParams();
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/history?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch acknowledgment history');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('history_loaded', {
      vaultId,
      historyCount: result.history.length,
      currentVersionCount: result.history.filter((h: AcknowledgmentHistory) => h.isCurrentVersion).length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Submit acknowledgments
  async submitAcknowledgments(request: AcknowledgmentRequest, vaultId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (vaultId) params.append('vaultId', vaultId);
    
    const response = await fetch(`${this.baseUrl}/acknowledge?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit acknowledgment');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('acknowledgments_submitted', {
      vaultId,
      disclosureIds: request.disclosureIds,
      acknowledgedCount: request.disclosureIds.length,
      userConsent: request.userConsent,
      timestamp: request.timestamp
    });

    return result;
  }

  // Download PDF report
  async downloadPDFReport(request: PDFExportRequest): Promise<Blob> {
    const params = new URLSearchParams();
    if (request.vaultId) params.append('vaultId', request.vaultId);
    if (request.category && request.category !== 'all') params.append('category', request.category);
    if (request.includeHistory) params.append('includeHistory', 'true');
    params.append('format', request.format);
    
    const response = await fetch(`${this.baseUrl}/pdf?${params}`);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    const blob = await response.blob();

    // Log agent memory
    await this.logAgentMemory('pdf_downloaded', {
      vaultId: request.vaultId,
      category: request.category || 'all',
      format: request.format,
      includeHistory: request.includeHistory,
      fileSize: blob.size,
      timestamp: new Date().toISOString()
    });

    return blob;
  }

  // Utility Methods
  getSeverityColor(severity: RiskDisclosure['severity']): string {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getSeverityBackground(severity: RiskDisclosure['severity']): string {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryIcon(category: RiskDisclosure['category']): string {
    switch (category) {
      case 'strategy': return 'shield';
      case 'asset_class': return 'file-text';
      case 'signal_type': return 'alert-triangle';
      case 'market_risk': return 'alert-circle';
      case 'operational': return 'info';
      case 'regulatory': return 'archive';
      default: return 'shield';
    }
  }

  getCategoryColor(category: RiskDisclosure['category']): string {
    switch (category) {
      case 'strategy': return 'text-blue-600';
      case 'asset_class': return 'text-green-600';
      case 'signal_type': return 'text-orange-600';
      case 'market_risk': return 'text-red-600';
      case 'operational': return 'text-purple-600';
      case 'regulatory': return 'text-indigo-600';
      default: return 'text-gray-600';
    }
  }

  formatCategoryName(category: string): string {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

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

  // Filtering and Processing Methods
  filterDisclosures(disclosures: RiskDisclosure[], filter: DisclosureFilter, acknowledgments: UserAcknowledgment[]): RiskDisclosure[] {
    return disclosures.filter(disclosure => {
      // Category filter
      if (filter.category !== 'all' && disclosure.category !== filter.category) {
        return false;
      }

      // Severity filter
      if (filter.severity && disclosure.severity !== filter.severity) {
        return false;
      }

      // Required filter
      if (filter.isRequired !== undefined && disclosure.isRequired !== filter.isRequired) {
        return false;
      }

      // Acknowledgment status filter
      if (filter.acknowledgedStatus && filter.acknowledgedStatus !== 'all') {
        const isAcknowledged = this.isDisclosureAcknowledged(disclosure.id, disclosure.version, acknowledgments);
        if (filter.acknowledgedStatus === 'acknowledged' && !isAcknowledged) {
          return false;
        }
        if (filter.acknowledgedStatus === 'pending' && isAcknowledged) {
          return false;
        }
      }

      return true;
    });
  }

  isDisclosureAcknowledged(disclosureId: string, version: string, acknowledgments: UserAcknowledgment[]): boolean {
    return acknowledgments.some(
      ack => ack.disclosureId === disclosureId && ack.version === version
    );
  }

  calculateComplianceMetrics(disclosures: RiskDisclosure[], acknowledgments: UserAcknowledgment[]): {
    totalRequired: number;
    acknowledgedRequired: number;
    totalOptional: number;
    acknowledgedOptional: number;
    overallCompliance: number;
    criticalCompliance: number;
  } {
    const requiredDisclosures = disclosures.filter(d => d.isRequired);
    const optionalDisclosures = disclosures.filter(d => !d.isRequired);
    const criticalDisclosures = disclosures.filter(d => d.severity === 'critical');
    
    const acknowledgedRequired = requiredDisclosures.filter(d => 
      this.isDisclosureAcknowledged(d.id, d.version, acknowledgments)
    ).length;
    
    const acknowledgedOptional = optionalDisclosures.filter(d => 
      this.isDisclosureAcknowledged(d.id, d.version, acknowledgments)
    ).length;
    
    const acknowledgedCritical = criticalDisclosures.filter(d => 
      this.isDisclosureAcknowledged(d.id, d.version, acknowledgments)
    ).length;

    return {
      totalRequired: requiredDisclosures.length,
      acknowledgedRequired,
      totalOptional: optionalDisclosures.length,
      acknowledgedOptional,
      overallCompliance: disclosures.length > 0 ? (acknowledgedRequired + acknowledgedOptional) / disclosures.length * 100 : 0,
      criticalCompliance: criticalDisclosures.length > 0 ? acknowledgedCritical / criticalDisclosures.length * 100 : 100
    };
  }

  validateAcknowledgmentRequest(request: AcknowledgmentRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.disclosureIds || request.disclosureIds.length === 0) {
      errors.push('At least one disclosure must be selected');
    }

    if (!request.userConsent) {
      errors.push('User consent is required');
    }

    if (!request.timestamp) {
      errors.push('Timestamp is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Business Logic Methods
  async handlePDFDownload(
    vaultId?: string,
    category: string = 'all',
    format: 'standard' | 'detailed' | 'summary' = 'standard'
  ): Promise<{ success: boolean; error?: string; filename?: string }> {
    try {
      const blob = await this.downloadPDFReport({
        vaultId,
        category,
        format,
        includeHistory: format === 'detailed'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `risk-disclosures-${category}-${format}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
    }
  }

  async handleAcknowledgmentSubmission(
    disclosureIds: string[],
    vaultId?: string
  ): Promise<{ success: boolean; error?: string; acknowledgedCount?: number }> {
    try {
      const request: AcknowledgmentRequest = {
        disclosureIds,
        userConsent: true,
        timestamp: new Date().toISOString()
      };

      const validation = this.validateAcknowledgmentRequest(request);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      await this.submitAcknowledgments(request, vaultId);
      return { success: true, acknowledgedCount: disclosureIds.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Submission failed' };
    }
  }

  createDisclosureFilter(category: string = 'all'): DisclosureFilter {
    return {
      category,
      acknowledgedStatus: 'all'
    };
  }

  createPDFExportRequest(
    vaultId?: string,
    category: string = 'all',
    format: 'standard' | 'detailed' | 'summary' = 'standard'
  ): PDFExportRequest {
    return {
      vaultId,
      category,
      format,
      includeHistory: format === 'detailed'
    };
  }

  processDisclosuresForDisplay(
    disclosures: RiskDisclosure[],
    acknowledgments: UserAcknowledgment[],
    filter: DisclosureFilter
  ): {
    filtered: RiskDisclosure[];
    metrics: ReturnType<typeof this.calculateComplianceMetrics>;
    categoryCounts: Record<string, { total: number; acknowledged: number }>;
  } {
    const filtered = this.filterDisclosures(disclosures, filter, acknowledgments);
    const metrics = this.calculateComplianceMetrics(disclosures, acknowledgments);
    
    // Calculate category counts
    const categoryCounts: Record<string, { total: number; acknowledged: number }> = {};
    
    disclosures.forEach(disclosure => {
      if (!categoryCounts[disclosure.category]) {
        categoryCounts[disclosure.category] = { total: 0, acknowledged: 0 };
      }
      categoryCounts[disclosure.category].total++;
      
      if (this.isDisclosureAcknowledged(disclosure.id, disclosure.version, acknowledgments)) {
        categoryCounts[disclosure.category].acknowledged++;
      }
    });

    return {
      filtered,
      metrics,
      categoryCounts
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-49-risk-disclosure-panel',
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
export const riskDisclosureService = new RiskDisclosureService();

// React Query hooks
export const useRiskDisclosures = (vaultId?: string) => {
  return useQuery({
    queryKey: ['/api/compliance/disclosures', vaultId],
    queryFn: () => riskDisclosureService.getRiskDisclosures(vaultId),
    enabled: !!vaultId,
    refetchInterval: 60000, // 1 minute
  });
};

export const useAcknowledgmentHistory = (vaultId?: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['/api/compliance/history', vaultId],
    queryFn: () => riskDisclosureService.getAcknowledgmentHistory(vaultId),
    enabled: !!vaultId && enabled,
  });
};

export const useSubmitAcknowledgments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ request, vaultId }: { request: AcknowledgmentRequest; vaultId?: string }) =>
      riskDisclosureService.submitAcknowledgments(request, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/disclosures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/history'] });
    },
  });
};

export const useDownloadPDF = () => {
  return useMutation({
    mutationFn: (request: PDFExportRequest) =>
      riskDisclosureService.downloadPDFReport(request),
  });
}; 