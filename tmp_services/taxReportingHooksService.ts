import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxIntelligenceModuleService, TaxJurisdiction, TaxClassificationRequest, TaxClassificationResult } from './taxIntelligenceModuleService';

// Types for Tax Reporting Hooks
export interface TaxEvent {
  id: string;
  type: 'snapshot' | 'rebalance' | 'trade' | 'dividend' | 'split' | 'merger' | 'user_triggered';
  timestamp: string;
  userId: string;
  vaultId: string;
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  data: Record<string, any>;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  error?: string;
}

export interface TaxCalculationTrigger {
  id: string;
  eventType: TaxEvent['type'];
  triggerConditions: TriggerCondition[];
  actions: TriggerAction[];
  isActive: boolean;
  priority: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerCondition {
  id: string;
  type: 'event_threshold' | 'time_based' | 'value_based' | 'user_setting' | 'jurisdiction_rule';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'matches';
  value: any;
  description: string;
}

export interface TriggerAction {
  id: string;
  type: 'classify_transactions' | 'generate_report' | 'calculate_liability' | 'update_summary' | 'notify_user' | 'export_data';
  parameters: Record<string, any>;
  description: string;
}

export interface TaxReportRequest {
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  userId: string;
  vaultId: string;
  reportType: 'summary' | 'detailed' | 'compliance' | 'audit_trail' | 'classification_breakdown';
  format: 'pdf' | 'csv' | 'json' | 'xml';
  includeAttachments: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  filters?: {
    assetClasses?: string[];
    transactionTypes?: string[];
    minAmount?: number;
    maxAmount?: number;
    classifications?: string[];
  };
}

export interface TaxReportResult {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  metadata: {
    generatedAt: string;
    userId: string;
    jurisdiction: TaxJurisdiction['code'];
    taxYear: string;
    reportType: string;
    format: string;
    fileSize?: number;
    recordCount?: number;
  };
  error?: string;
}

export interface TaxLiabilityCalculation {
  id: string;
  userId: string;
  vaultId: string;
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  calculatedAt: string;
  transactions: TaxableTransaction[];
  totalLiability: number;
  breakdown: {
    capitalGains: number;
    businessIncome: number;
    tradingIncome: number;
    withholdingTax: number;
    deductions: number;
    netLiability: number;
  };
  summary: {
    totalTransactions: number;
    totalGains: number;
    totalLosses: number;
    netPosition: number;
    effectiveRate: number;
  };
  complianceStatus: 'compliant' | 'attention_required' | 'review_needed' | 'missing_data';
  warnings: string[];
  recommendations: string[];
}

export interface TaxableTransaction {
  id: string;
  eventId: string;
  userId: string;
  vaultId: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'transfer' | 'conversion';
  assetClass: string;
  assetType: string;
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  costs: number;
  netAmount: number;
  classification: TaxClassificationResult;
  taxLiability: number;
  isProcessed: boolean;
  processedAt?: string;
  notes?: string;
}

export interface HookConfiguration {
  id: string;
  userId: string;
  vaultId: string;
  jurisdiction: TaxJurisdiction['code'];
  enabledEvents: TaxEvent['type'][];
  autoCalculation: boolean;
  autoReporting: boolean;
  reportingFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  notificationSettings: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    threshold: number;
  };
  retentionPeriod: number; // days
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxEventProcessingResult {
  eventId: string;
  status: 'success' | 'partial' | 'failed';
  processedTransactions: number;
  failedTransactions: number;
  totalLiability: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
  nextActions: string[];
}

// Tax Reporting Hooks Service Class
export class TaxReportingHooksService {
  private baseUrl = '/api/tax/reporting';

  // Event Management
  async createTaxEvent(event: Omit<TaxEvent, 'id' | 'processingStatus'>): Promise<TaxEvent> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error('Failed to create tax event');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_event_created', {
      eventId: result.id,
      eventType: result.type,
      userId: result.userId,
      vaultId: result.vaultId,
      jurisdiction: result.jurisdiction,
      taxYear: result.taxYear,
      timestamp: result.timestamp
    });

    return result;
  }

  async getTaxEvents(userId: string, vaultId: string, filters?: {
    eventType?: TaxEvent['type'];
    jurisdiction?: TaxJurisdiction['code'];
    taxYear?: string;
    status?: TaxEvent['processingStatus'];
    startDate?: string;
    endDate?: string;
  }): Promise<TaxEvent[]> {
    const params = new URLSearchParams({ userId, vaultId });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await fetch(`${this.baseUrl}/events?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tax events');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_events_loaded', {
      userId,
      vaultId,
      eventCount: result.length,
      filters: filters || {},
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async processTaxEvent(eventId: string): Promise<TaxEventProcessingResult> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to process tax event');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_event_processed', {
      eventId,
      status: result.status,
      processedTransactions: result.processedTransactions,
      failedTransactions: result.failedTransactions,
      totalLiability: result.totalLiability,
      processingTime: result.processingTime,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Tax Calculation
  async calculateTaxLiability(
    userId: string,
    vaultId: string,
    jurisdiction: TaxJurisdiction['code'],
    taxYear: string,
    eventId?: string
  ): Promise<TaxLiabilityCalculation> {
    const params = new URLSearchParams({ userId, vaultId, jurisdiction, taxYear });
    if (eventId) params.append('eventId', eventId);

    const response = await fetch(`${this.baseUrl}/calculate?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to calculate tax liability');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_liability_calculated', {
      userId,
      vaultId,
      jurisdiction,
      taxYear,
      eventId,
      calculationId: result.id,
      totalLiability: result.totalLiability,
      totalTransactions: result.transactions.length,
      complianceStatus: result.complianceStatus,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Integration with Block 61
  async classifyTransactionsFromEvent(
    eventId: string,
    transactions: Array<{
      id: string;
      type: string;
      assetClass: string;
      symbol: string;
      quantity: number;
      price: number;
      purchaseDate: string;
      saleDate: string;
      costs: number;
    }>
  ): Promise<TaxableTransaction[]> {
    const response = await fetch(`${this.baseUrl}/classify-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, transactions }),
    });

    if (!response.ok) {
      throw new Error('Failed to classify transactions');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('transactions_classified', {
      eventId,
      transactionCount: transactions.length,
      classifiedCount: result.length,
      totalLiability: result.reduce((sum: number, t: TaxableTransaction) => sum + t.taxLiability, 0),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Reporting
  async generateTaxReport(request: TaxReportRequest): Promise<TaxReportResult> {
    const response = await fetch(`${this.baseUrl}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to generate tax report');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_report_generated', {
      reportId: result.reportId,
      jurisdiction: request.jurisdiction,
      taxYear: request.taxYear,
      userId: request.userId,
      vaultId: request.vaultId,
      reportType: request.reportType,
      format: request.format,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async getTaxReportStatus(reportId: string): Promise<TaxReportResult> {
    const response = await fetch(`${this.baseUrl}/report/${reportId}/status`);
    if (!response.ok) {
      throw new Error('Failed to get report status');
    }

    return response.json();
  }

  async downloadTaxReport(reportId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/report/${reportId}/download`);
    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();

    // Log agent memory
    await this.logAgentMemory('tax_report_downloaded', {
      reportId,
      fileSize: blob.size,
      timestamp: new Date().toISOString()
    });

    return blob;
  }

  // Hook Configuration
  async getHookConfiguration(userId: string, vaultId: string): Promise<HookConfiguration | null> {
    const params = new URLSearchParams({ userId, vaultId });
    const response = await fetch(`${this.baseUrl}/configuration?${params}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Failed to get hook configuration');
    }

    return response.json();
  }

  async updateHookConfiguration(config: Partial<HookConfiguration>): Promise<HookConfiguration> {
    const response = await fetch(`${this.baseUrl}/configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to update hook configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('hook_configuration_updated', {
      userId: config.userId,
      vaultId: config.vaultId,
      jurisdiction: config.jurisdiction,
      enabledEvents: config.enabledEvents,
      autoCalculation: config.autoCalculation,
      autoReporting: config.autoReporting,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Trigger Management
  async getTriggers(): Promise<TaxCalculationTrigger[]> {
    const response = await fetch(`${this.baseUrl}/triggers`);
    if (!response.ok) {
      throw new Error('Failed to get triggers');
    }

    return response.json();
  }

  async createTrigger(trigger: Omit<TaxCalculationTrigger, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaxCalculationTrigger> {
    const response = await fetch(`${this.baseUrl}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trigger),
    });

    if (!response.ok) {
      throw new Error('Failed to create trigger');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_trigger_created', {
      triggerId: result.id,
      eventType: result.eventType,
      priority: result.priority,
      isActive: result.isActive,
      actionsCount: result.actions.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Business Logic Methods
  async handleSnapshotEvent(userId: string, vaultId: string, snapshotData: any): Promise<TaxEventProcessingResult> {
    try {
      const event = await this.createTaxEvent({
        type: 'snapshot',
        timestamp: new Date().toISOString(),
        userId,
        vaultId,
        jurisdiction: 'NZ', // Default, should be user preference
        taxYear: '2024-2025',
        data: snapshotData
      });

      return await this.processTaxEvent(event.id);
    } catch (error) {
      throw new Error(`Failed to handle snapshot event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleRebalanceEvent(userId: string, vaultId: string, rebalanceData: any): Promise<TaxEventProcessingResult> {
    try {
      const event = await this.createTaxEvent({
        type: 'rebalance',
        timestamp: new Date().toISOString(),
        userId,
        vaultId,
        jurisdiction: 'NZ',
        taxYear: '2024-2025',
        data: rebalanceData
      });

      return await this.processTaxEvent(event.id);
    } catch (error) {
      throw new Error(`Failed to handle rebalance event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleTradeEvent(userId: string, vaultId: string, tradeData: any): Promise<TaxEventProcessingResult> {
    try {
      const event = await this.createTaxEvent({
        type: 'trade',
        timestamp: new Date().toISOString(),
        userId,
        vaultId,
        jurisdiction: 'NZ',
        taxYear: '2024-2025',
        data: tradeData
      });

      return await this.processTaxEvent(event.id);
    } catch (error) {
      throw new Error(`Failed to handle trade event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleUserTriggeredReport(
    userId: string,
    vaultId: string,
    jurisdiction: TaxJurisdiction['code'],
    taxYear: string,
    reportType: TaxReportRequest['reportType'],
    format: TaxReportRequest['format'] = 'pdf'
  ): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      const request: TaxReportRequest = {
        jurisdiction,
        taxYear,
        userId,
        vaultId,
        reportType,
        format,
        includeAttachments: true
      };

      const result = await this.generateTaxReport(request);
      return { success: true, reportId: result.reportId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Report generation failed' };
    }
  }

  // Utility Methods
  createDefaultHookConfiguration(userId: string, vaultId: string, jurisdiction: TaxJurisdiction['code'] = 'NZ'): HookConfiguration {
    return {
      id: '',
      userId,
      vaultId,
      jurisdiction,
      enabledEvents: ['trade', 'rebalance', 'snapshot'],
      autoCalculation: true,
      autoReporting: false,
      reportingFrequency: 'monthly',
      notificationSettings: {
        email: true,
        inApp: true,
        sms: false,
        threshold: 1000
      },
      retentionPeriod: 2555, // 7 years
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  createDefaultReportRequest(
    userId: string,
    vaultId: string,
    jurisdiction: TaxJurisdiction['code'] = 'NZ',
    taxYear: string = '2024-2025'
  ): TaxReportRequest {
    return {
      jurisdiction,
      taxYear,
      userId,
      vaultId,
      reportType: 'summary',
      format: 'pdf',
      includeAttachments: true
    };
  }

  formatEventType(eventType: TaxEvent['type']): string {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatProcessingStatus(status: TaxEvent['processingStatus']): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getEventTypeColor(eventType: TaxEvent['type']): string {
    switch (eventType) {
      case 'trade': return 'text-blue-600';
      case 'rebalance': return 'text-green-600';
      case 'snapshot': return 'text-purple-600';
      case 'dividend': return 'text-yellow-600';
      case 'user_triggered': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  getStatusColor(status: TaxEvent['processingStatus']): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getComplianceStatusColor(status: TaxLiabilityCalculation['complianceStatus']): string {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'attention_required': return 'text-yellow-600';
      case 'review_needed': return 'text-orange-600';
      case 'missing_data': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  formatCurrency(amount: number, jurisdiction: TaxJurisdiction['code']): string {
    return taxIntelligenceModuleService.formatCurrency(amount, jurisdiction);
  }

  formatPercentage(value: number): string {
    return taxIntelligenceModuleService.formatPercentage(value);
  }

  formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  validateReportRequest(request: TaxReportRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.jurisdiction) {
      errors.push('Jurisdiction is required');
    }

    if (!request.taxYear) {
      errors.push('Tax year is required');
    }

    if (!request.userId) {
      errors.push('User ID is required');
    }

    if (!request.vaultId) {
      errors.push('Vault ID is required');
    }

    if (!request.reportType) {
      errors.push('Report type is required');
    }

    if (!request.format) {
      errors.push('Format is required');
    }

    return {
      isValid: errors.length === 0,
      errors
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
          blockId: 'block-48-tax-reporting-hooks',
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
export const taxReportingHooksService = new TaxReportingHooksService();

// React Query hooks
export const useTaxEvents = (userId: string, vaultId: string, filters?: any) => {
  return useQuery({
    queryKey: ['/api/tax/reporting/events', userId, vaultId, filters],
    queryFn: () => taxReportingHooksService.getTaxEvents(userId, vaultId, filters),
    enabled: !!userId && !!vaultId,
    refetchInterval: 30000, // 30 seconds
  });
};

export const useProcessTaxEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: string) => taxReportingHooksService.processTaxEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax/reporting/events'] });
    },
  });
};

export const useCalculateTaxLiability = () => {
  return useMutation({
    mutationFn: ({ userId, vaultId, jurisdiction, taxYear, eventId }: {
      userId: string;
      vaultId: string;
      jurisdiction: TaxJurisdiction['code'];
      taxYear: string;
      eventId?: string;
    }) => taxReportingHooksService.calculateTaxLiability(userId, vaultId, jurisdiction, taxYear, eventId),
  });
};

export const useGenerateTaxReport = () => {
  return useMutation({
    mutationFn: (request: TaxReportRequest) => taxReportingHooksService.generateTaxReport(request),
  });
};

export const useTaxReportStatus = (reportId: string) => {
  return useQuery({
    queryKey: ['/api/tax/reporting/report', reportId, 'status'],
    queryFn: () => taxReportingHooksService.getTaxReportStatus(reportId),
    enabled: !!reportId,
    refetchInterval: 5000, // 5 seconds
  });
};

export const useHookConfiguration = (userId: string, vaultId: string) => {
  return useQuery({
    queryKey: ['/api/tax/reporting/configuration', userId, vaultId],
    queryFn: () => taxReportingHooksService.getHookConfiguration(userId, vaultId),
    enabled: !!userId && !!vaultId,
  });
};

export const useUpdateHookConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Partial<HookConfiguration>) => taxReportingHooksService.updateHookConfiguration(config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax/reporting/configuration', data.userId, data.vaultId] });
    },
  });
};

export const useTriggers = () => {
  return useQuery({
    queryKey: ['/api/tax/reporting/triggers'],
    queryFn: () => taxReportingHooksService.getTriggers(),
    staleTime: 300000, // 5 minutes
  });
};

export const useCreateTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (trigger: Omit<TaxCalculationTrigger, 'id' | 'createdAt' | 'updatedAt'>) => 
      taxReportingHooksService.createTrigger(trigger),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax/reporting/triggers'] });
    },
  });
}; 