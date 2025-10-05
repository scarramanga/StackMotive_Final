import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Tax Intelligence Module
export interface TaxJurisdiction {
  code: 'NZ' | 'AUS' | 'US' | 'UK';
  name: string;
  currency: string;
  taxAuthority: string;
  currentTaxYear: string;
  timezone: string;
}

export interface TaxYear {
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  filingDeadline: string;
  version: string;
  lastUpdated: string;
}

export interface TradingStyle {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  taxImplications: Record<string, string>;
}

export interface AssetClass {
  id: string;
  name: string;
  category: 'equities' | 'crypto' | 'forex' | 'commodities' | 'bonds' | 'derivatives' | 'property' | 'other';
  description: string;
  jurisdictionRules: Record<string, AssetClassRule>;
}

export interface AssetClassRule {
  jurisdiction: TaxJurisdiction['code'];
  classification: 'capital' | 'revenue' | 'hybrid' | 'special';
  holdingPeriodRequirement?: number; // days
  exemptions: string[];
  specialRules: string[];
  taxRates: {
    shortTerm?: number;
    longTerm?: number;
    businessRate?: number;
  };
}

export interface TaxRule {
  id: string;
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  category: 'capital_gains' | 'income_tax' | 'withholding_tax' | 'deductions' | 'exemptions';
  ruleType: 'trading_classification' | 'holding_period' | 'business_test' | 'asset_treatment' | 'rate_calculation';
  title: string;
  description: string;
  conditions: TaxCondition[];
  consequences: TaxConsequence[];
  examples: TaxExample[];
  references: string[];
  version: string;
  lastUpdated: string;
  isActive: boolean;
}

export interface TaxCondition {
  id: string;
  type: 'holding_period' | 'trading_frequency' | 'intent' | 'asset_type' | 'amount_threshold' | 'business_activity';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'matches';
  value: any;
  description: string;
}

export interface TaxConsequence {
  id: string;
  type: 'tax_rate' | 'classification' | 'exemption' | 'deduction' | 'withholding';
  result: any;
  description: string;
  calculations?: string[];
}

export interface TaxExample {
  id: string;
  scenario: string;
  inputs: Record<string, any>;
  outcome: string;
  taxLiability: number;
  explanation: string;
}

export interface TaxClassificationRequest {
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  userProfile: {
    residencyStatus: 'resident' | 'non_resident' | 'temporary';
    tradingExperience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    occupation: string;
    tradingIntent: 'investment' | 'speculation' | 'business' | 'mixed';
    averageHoldingPeriod: number; // days
    tradingFrequency: 'occasional' | 'regular' | 'frequent' | 'day_trading';
  };
  transaction: {
    assetClass: string;
    assetType: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    purchaseDate: string;
    saleDate: string;
    holdingPeriod: number; // days
    transactionCosts: number;
    purpose: string;
  };
  additionalFactors: {
    partOfBusiness: boolean;
    systematicActivity: boolean;
    borrowedFunds: boolean;
    professionalAdvice: boolean;
    marketResearch: boolean;
    stopLosses: boolean;
    technicalAnalysis: boolean;
  };
}

export interface TaxClassificationResult {
  classification: 'capital_gain' | 'business_income' | 'trading_income' | 'exempt' | 'special_treatment';
  taxableAmount: number;
  taxRate: number;
  taxLiability: number;
  confidence: number; // 0-1
  reasoning: string[];
  applicableRules: TaxRule[];
  deductions: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  warnings: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface TaxSummaryReport {
  jurisdiction: TaxJurisdiction['code'];
  taxYear: string;
  userId: string;
  generatedAt: string;
  totalTransactions: number;
  totalGains: number;
  totalLosses: number;
  netPosition: number;
  totalTaxLiability: number;
  effectiveRate: number;
  classifications: {
    capitalGains: number;
    businessIncome: number;
    tradingIncome: number;
    exempt: number;
  };
  deductionsSummary: {
    totalDeductions: number;
    types: Record<string, number>;
  };
  recommendations: string[];
  complianceStatus: 'compliant' | 'attention_required' | 'review_needed';
}

// Tax Intelligence Module Service Class
export class TaxIntelligenceModuleService {
  private baseUrl = '/api/tax/intelligence';

  // Get supported jurisdictions
  async getJurisdictions(): Promise<TaxJurisdiction[]> {
    const response = await fetch(`${this.baseUrl}/jurisdictions`);
    if (!response.ok) {
      throw new Error('Failed to fetch jurisdictions');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('jurisdictions_loaded', {
      jurisdictionCount: result.length,
      supportedCodes: result.map((j: TaxJurisdiction) => j.code),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get tax years for jurisdiction
  async getTaxYears(jurisdiction: TaxJurisdiction['code']): Promise<TaxYear[]> {
    const response = await fetch(`${this.baseUrl}/tax-years/${jurisdiction}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tax years');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_years_loaded', {
      jurisdiction,
      taxYearCount: result.length,
      activeTaxYears: result.filter((ty: TaxYear) => ty.isActive).length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get tax rules for jurisdiction and year
  async getTaxRules(jurisdiction: TaxJurisdiction['code'], taxYear: string): Promise<TaxRule[]> {
    const params = new URLSearchParams({ taxYear });
    const response = await fetch(`${this.baseUrl}/rules/${jurisdiction}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tax rules');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_rules_loaded', {
      jurisdiction,
      taxYear,
      ruleCount: result.length,
      categories: [...new Set(result.map((r: TaxRule) => r.category))],
      ruleTypes: [...new Set(result.map((r: TaxRule) => r.ruleType))],
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get asset classes and their rules
  async getAssetClasses(): Promise<AssetClass[]> {
    const response = await fetch(`${this.baseUrl}/asset-classes`);
    if (!response.ok) {
      throw new Error('Failed to fetch asset classes');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('asset_classes_loaded', {
      assetClassCount: result.length,
      categories: [...new Set(result.map((ac: AssetClass) => ac.category))],
      jurisdictionCoverage: this.calculateJurisdictionCoverage(result),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get trading styles
  async getTradingStyles(): Promise<TradingStyle[]> {
    const response = await fetch(`${this.baseUrl}/trading-styles`);
    if (!response.ok) {
      throw new Error('Failed to fetch trading styles');
    }

    return response.json();
  }

  // Classify tax treatment
  async classifyTaxTreatment(request: TaxClassificationRequest): Promise<TaxClassificationResult> {
    const response = await fetch(`${this.baseUrl}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to classify tax treatment');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_classification_performed', {
      jurisdiction: request.jurisdiction,
      taxYear: request.taxYear,
      assetClass: request.transaction.assetClass,
      classification: result.classification,
      taxLiability: result.taxLiability,
      confidence: result.confidence,
      holdingPeriod: request.transaction.holdingPeriod,
      tradingFrequency: request.userProfile.tradingFrequency,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Generate tax summary report
  async generateTaxSummary(
    jurisdiction: TaxJurisdiction['code'],
    taxYear: string,
    userId: string
  ): Promise<TaxSummaryReport> {
    const params = new URLSearchParams({ taxYear, userId });
    const response = await fetch(`${this.baseUrl}/summary/${jurisdiction}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to generate tax summary');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('tax_summary_generated', {
      jurisdiction,
      taxYear,
      userId,
      totalTransactions: result.totalTransactions,
      netPosition: result.netPosition,
      totalTaxLiability: result.totalTaxLiability,
      effectiveRate: result.effectiveRate,
      complianceStatus: result.complianceStatus,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Export tax data
  async exportTaxData(
    jurisdiction: TaxJurisdiction['code'],
    taxYear: string,
    userId: string,
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<Blob> {
    const params = new URLSearchParams({ taxYear, userId, format });
    const response = await fetch(`${this.baseUrl}/export/${jurisdiction}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to export tax data');
    }

    const blob = await response.blob();

    // Log agent memory
    await this.logAgentMemory('tax_data_exported', {
      jurisdiction,
      taxYear,
      userId,
      format,
      fileSize: blob.size,
      timestamp: new Date().toISOString()
    });

    return blob;
  }

  // Built-in Tax Rules (Structured data for 2022-2025)
  getTaxRuleDatabase(): Record<string, TaxRule[]> {
    return {
      'NZ': [
        {
          id: 'nz-trading-intent-test',
          jurisdiction: 'NZ',
          taxYear: '2024-2025',
          category: 'capital_gains',
          ruleType: 'trading_classification',
          title: 'Trading Intent Test',
          description: 'Determines if shares were acquired for the dominant purpose of disposal',
          conditions: [
            {
              id: 'intent-condition',
              type: 'intent',
              operator: 'equals',
              value: 'disposal',
              description: 'Dominant purpose was disposal for profit'
            }
          ],
          consequences: [
            {
              id: 'income-treatment',
              type: 'classification',
              result: 'trading_income',
              description: 'Gains taxed as ordinary income'
            }
          ],
          examples: [
            {
              id: 'day-trader-example',
              scenario: 'Frequent day trading with intent to profit',
              inputs: { frequency: 'daily', holdingPeriod: 1, intent: 'profit' },
              outcome: 'Trading income - fully taxable',
              taxLiability: 0.33,
              explanation: 'High frequency and short holding period indicates trading activity'
            }
          ],
          references: ['Income Tax Act 2007', 'IS 24/10'],
          version: '2024.1',
          lastUpdated: '2024-01-01',
          isActive: true
        },
        {
          id: 'nz-crypto-treatment',
          jurisdiction: 'NZ',
          taxYear: '2024-2025',
          category: 'capital_gains',
          ruleType: 'asset_treatment',
          title: 'Cryptocurrency Treatment',
          description: 'Crypto assets treated as property, taxable if acquired for disposal',
          conditions: [
            {
              id: 'crypto-asset',
              type: 'asset_type',
              operator: 'equals',
              value: 'cryptocurrency',
              description: 'Asset is a cryptocurrency or crypto token'
            }
          ],
          consequences: [
            {
              id: 'property-treatment',
              type: 'classification',
              result: 'property',
              description: 'Treated as property for tax purposes'
            }
          ],
          examples: [],
          references: ['IRD Cryptoassets Guidance'],
          version: '2024.1',
          lastUpdated: '2024-01-01',
          isActive: true
        }
      ],
      'AUS': [
        {
          id: 'aus-cgt-discount',
          jurisdiction: 'AUS',
          taxYear: '2024-2025',
          category: 'capital_gains',
          ruleType: 'holding_period',
          title: 'CGT Discount Method',
          description: '50% discount on capital gains for assets held over 12 months',
          conditions: [
            {
              id: 'holding-period',
              type: 'holding_period',
              operator: 'greater_than',
              value: 365,
              description: 'Asset held for more than 12 months'
            }
          ],
          consequences: [
            {
              id: 'discount-applied',
              type: 'tax_rate',
              result: 0.5,
              description: '50% discount on capital gain'
            }
          ],
          examples: [],
          references: ['ITAA 1997'],
          version: '2024.1',
          lastUpdated: '2024-01-01',
          isActive: true
        }
      ],
      'US': [
        {
          id: 'us-long-term-rates',
          jurisdiction: 'US',
          taxYear: '2024',
          category: 'capital_gains',
          ruleType: 'holding_period',
          title: 'Long-term Capital Gains Rates',
          description: 'Preferential rates for assets held over 12 months',
          conditions: [
            {
              id: 'long-term-holding',
              type: 'holding_period',
              operator: 'greater_than',
              value: 365,
              description: 'Asset held for more than 12 months'
            }
          ],
          consequences: [
            {
              id: 'preferential-rates',
              type: 'tax_rate',
              result: [0, 0.15, 0.20],
              description: 'Rates: 0%, 15%, or 20% based on income'
            }
          ],
          examples: [],
          references: ['IRC Section 1222'],
          version: '2024.1',
          lastUpdated: '2024-01-01',
          isActive: true
        }
      ],
      'UK': [
        {
          id: 'uk-annual-exemption',
          jurisdiction: 'UK',
          taxYear: '2024-2025',
          category: 'exemptions',
          ruleType: 'rate_calculation',
          title: 'Annual CGT Exemption',
          description: 'Annual exempt amount for capital gains',
          conditions: [
            {
              id: 'annual-gains',
              type: 'amount_threshold',
              operator: 'less_than',
              value: 3000,
              description: 'Total gains less than annual exemption'
            }
          ],
          consequences: [
            {
              id: 'no-tax',
              type: 'exemption',
              result: 'exempt',
              description: 'No CGT liability within annual exemption'
            }
          ],
          examples: [],
          references: ['TCGA 1992'],
          version: '2024.1',
          lastUpdated: '2024-01-01',
          isActive: true
        }
      ]
    };
  }

  // Get pre-defined asset classes
  getAssetClassDatabase(): AssetClass[] {
    return [
      {
        id: 'equities',
        name: 'Equities/Shares',
        category: 'equities',
        description: 'Listed and unlisted company shares',
        jurisdictionRules: {
          'NZ': {
            jurisdiction: 'NZ',
            classification: 'capital',
            exemptions: ['Main home exemption'],
            specialRules: ['Intent test applies', 'No general CGT'],
            taxRates: { businessRate: 0.33 }
          },
          'AUS': {
            jurisdiction: 'AUS',
            classification: 'capital',
            holdingPeriodRequirement: 365,
            exemptions: ['Principal residence', 'Small business'],
            specialRules: ['CGT discount applies'],
            taxRates: { shortTerm: 0.45, longTerm: 0.225 }
          },
          'US': {
            jurisdiction: 'US',
            classification: 'capital',
            holdingPeriodRequirement: 365,
            exemptions: ['Qualified small business stock'],
            specialRules: ['Wash sale rules'],
            taxRates: { shortTerm: 0.37, longTerm: 0.20 }
          },
          'UK': {
            jurisdiction: 'UK',
            classification: 'capital',
            exemptions: ['ISA wrapper', 'Annual exemption'],
            specialRules: ['30-day rule'],
            taxRates: { shortTerm: 0.20, longTerm: 0.20 }
          }
        }
      },
      {
        id: 'cryptocurrency',
        name: 'Cryptocurrency',
        category: 'crypto',
        description: 'Digital assets and tokens',
        jurisdictionRules: {
          'NZ': {
            jurisdiction: 'NZ',
            classification: 'capital',
            exemptions: [],
            specialRules: ['Treated as property', 'Intent test applies'],
            taxRates: { businessRate: 0.33 }
          },
          'AUS': {
            jurisdiction: 'AUS',
            classification: 'capital',
            holdingPeriodRequirement: 365,
            exemptions: ['Personal use asset under $10k'],
            specialRules: ['CGT discount applies'],
            taxRates: { shortTerm: 0.45, longTerm: 0.225 }
          },
          'US': {
            jurisdiction: 'US',
            classification: 'capital',
            holdingPeriodRequirement: 365,
            exemptions: [],
            specialRules: ['Like-kind exchanges suspended'],
            taxRates: { shortTerm: 0.37, longTerm: 0.20 }
          },
          'UK': {
            jurisdiction: 'UK',
            classification: 'capital',
            exemptions: ['Annual exemption'],
            specialRules: ['Same-day and 30-day rules'],
            taxRates: { shortTerm: 0.20, longTerm: 0.20 }
          }
        }
      },
      {
        id: 'forex',
        name: 'Foreign Exchange',
        category: 'forex',
        description: 'Currency trading and FX derivatives',
        jurisdictionRules: {
          'NZ': {
            jurisdiction: 'NZ',
            classification: 'revenue',
            exemptions: ['Personal travel exemption'],
            specialRules: ['FIF rules may apply'],
            taxRates: { businessRate: 0.33 }
          },
          'AUS': {
            jurisdiction: 'AUS',
            classification: 'capital',
            exemptions: ['Foreign currency gains under $250'],
            specialRules: ['Translation rules apply'],
            taxRates: { shortTerm: 0.45, longTerm: 0.225 }
          },
          'US': {
            jurisdiction: 'US',
            classification: 'revenue',
            exemptions: [],
            specialRules: ['Section 988 treatment'],
            taxRates: { businessRate: 0.37 }
          },
          'UK': {
            jurisdiction: 'UK',
            classification: 'capital',
            exemptions: ['Annual exemption'],
            specialRules: ['Matching rules apply'],
            taxRates: { shortTerm: 0.20, longTerm: 0.20 }
          }
        }
      }
    ];
  }

  // Utility Methods
  calculateJurisdictionCoverage(assetClasses: AssetClass[]): Record<string, number> {
    const jurisdictions = ['NZ', 'AUS', 'US', 'UK'];
    const coverage: Record<string, number> = {};
    
    jurisdictions.forEach(jurisdiction => {
      const covered = assetClasses.filter(ac => 
        ac.jurisdictionRules[jurisdiction]
      ).length;
      coverage[jurisdiction] = assetClasses.length > 0 ? covered / assetClasses.length : 0;
    });
    
    return coverage;
  }

  formatCurrency(amount: number, jurisdiction: TaxJurisdiction['code']): string {
    const currencies = {
      'NZ': 'NZD',
      'AUS': 'AUD', 
      'US': 'USD',
      'UK': 'GBP'
    };
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencies[jurisdiction],
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatTaxYear(jurisdiction: TaxJurisdiction['code'], taxYear: string): string {
    switch (jurisdiction) {
      case 'NZ':
      case 'AUS':
      case 'UK':
        return `${taxYear} tax year`;
      case 'US':
        return `Tax year ${taxYear}`;
      default:
        return taxYear;
    }
  }

  getJurisdictionIcon(jurisdiction: TaxJurisdiction['code']): string {
    switch (jurisdiction) {
      case 'NZ': return 'map-pin';
      case 'AUS': return 'globe';
      case 'US': return 'flag';
      case 'UK': return 'crown';
      default: return 'building';
    }
  }

  getClassificationColor(classification: TaxClassificationResult['classification']): string {
    switch (classification) {
      case 'capital_gain': return 'text-green-600';
      case 'business_income': return 'text-blue-600';
      case 'trading_income': return 'text-orange-600';
      case 'exempt': return 'text-gray-600';
      case 'special_treatment': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  }

  getConfidenceLevel(confidence: number): { level: string; color: string } {
    if (confidence >= 0.8) return { level: 'High', color: 'text-green-600' };
    if (confidence >= 0.6) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-red-600' };
  }

  // Business Logic Methods
  async handleTaxClassification(
    request: TaxClassificationRequest
  ): Promise<{ success: boolean; error?: string; result?: TaxClassificationResult }> {
    try {
      const validation = this.validateClassificationRequest(request);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const result = await this.classifyTaxTreatment(request);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Classification failed' };
    }
  }

  async handleReportGeneration(
    jurisdiction: TaxJurisdiction['code'],
    taxYear: string,
    userId: string,
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<{ success: boolean; error?: string; filename?: string }> {
    try {
      const blob = await this.exportTaxData(jurisdiction, taxYear, userId, format);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `tax-report-${jurisdiction}-${taxYear}-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  }

  createDefaultClassificationRequest(jurisdiction: TaxJurisdiction['code'] = 'NZ'): TaxClassificationRequest {
    return {
      jurisdiction,
      taxYear: '2024-2025',
      userProfile: {
        residencyStatus: 'resident',
        tradingExperience: 'intermediate',
        occupation: '',
        tradingIntent: 'investment',
        averageHoldingPeriod: 365,
        tradingFrequency: 'occasional'
      },
      transaction: {
        assetClass: 'equities',
        assetType: 'shares',
        quantity: 0,
        purchasePrice: 0,
        salePrice: 0,
        purchaseDate: '',
        saleDate: '',
        holdingPeriod: 0,
        transactionCosts: 0,
        purpose: ''
      },
      additionalFactors: {
        partOfBusiness: false,
        systematicActivity: false,
        borrowedFunds: false,
        professionalAdvice: false,
        marketResearch: false,
        stopLosses: false,
        technicalAnalysis: false
      }
    };
  }

  validateClassificationRequest(request: TaxClassificationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.jurisdiction) {
      errors.push('Jurisdiction is required');
    }

    if (!request.taxYear) {
      errors.push('Tax year is required');
    }

    if (!request.transaction.assetClass) {
      errors.push('Asset class is required');
    }

    if (request.transaction.purchasePrice <= 0) {
      errors.push('Purchase price must be greater than 0');
    }

    if (request.transaction.salePrice <= 0) {
      errors.push('Sale price must be greater than 0');
    }

    if (!request.transaction.purchaseDate) {
      errors.push('Purchase date is required');
    }

    if (!request.transaction.saleDate) {
      errors.push('Sale date is required');
    }

    if (new Date(request.transaction.saleDate) <= new Date(request.transaction.purchaseDate)) {
      errors.push('Sale date must be after purchase date');
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
          blockId: 'block-61-tax-intelligence-module',
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
export const taxIntelligenceModuleService = new TaxIntelligenceModuleService();

// React Query hooks
export const useJurisdictions = () => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/jurisdictions'],
    queryFn: () => taxIntelligenceModuleService.getJurisdictions(),
    staleTime: 3600000, // 1 hour
  });
};

export const useTaxYears = (jurisdiction: TaxJurisdiction['code']) => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/tax-years', jurisdiction],
    queryFn: () => taxIntelligenceModuleService.getTaxYears(jurisdiction),
    enabled: !!jurisdiction,
    staleTime: 1800000, // 30 minutes
  });
};

export const useTaxRules = (jurisdiction: TaxJurisdiction['code'], taxYear: string) => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/rules', jurisdiction, taxYear],
    queryFn: () => taxIntelligenceModuleService.getTaxRules(jurisdiction, taxYear),
    enabled: !!jurisdiction && !!taxYear,
    staleTime: 1800000, // 30 minutes
  });
};

export const useAssetClasses = () => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/asset-classes'],
    queryFn: () => taxIntelligenceModuleService.getAssetClasses(),
    staleTime: 3600000, // 1 hour
  });
};

export const useTradingStyles = () => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/trading-styles'],
    queryFn: () => taxIntelligenceModuleService.getTradingStyles(),
    staleTime: 3600000, // 1 hour
  });
};

export const useClassifyTaxTreatment = () => {
  return useMutation({
    mutationFn: (request: TaxClassificationRequest) =>
      taxIntelligenceModuleService.classifyTaxTreatment(request),
  });
};

export const useTaxSummary = (jurisdiction: TaxJurisdiction['code'], taxYear: string, userId: string) => {
  return useQuery({
    queryKey: ['/api/tax/intelligence/summary', jurisdiction, taxYear, userId],
    queryFn: () => taxIntelligenceModuleService.generateTaxSummary(jurisdiction, taxYear, userId),
    enabled: !!jurisdiction && !!taxYear && !!userId,
    staleTime: 300000, // 5 minutes
  });
};

export const useExportTaxData = () => {
  return useMutation({
    mutationFn: ({ jurisdiction, taxYear, userId, format }: { 
      jurisdiction: TaxJurisdiction['code']; 
      taxYear: string; 
      userId: string; 
      format?: 'pdf' | 'csv' | 'json' 
    }) =>
      taxIntelligenceModuleService.exportTaxData(jurisdiction, taxYear, userId, format),
  });
}; 