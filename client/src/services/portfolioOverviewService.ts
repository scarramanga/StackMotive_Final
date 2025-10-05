import { useQuery } from '@tanstack/react-query';

// Types for Portfolio Overview
export interface PortfolioSnapshot {
  id: string;
  totalValue: number;
  totalGain: number;
  totalGainPercentage: number;
  dailyChange: number;
  dailyChangePercentage: number;
  lastUpdated: string;
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  allocation: number;
  value: number;
  gain: number;
  gainPercentage: number;
  price: number;
  quantity: number;
  category: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalGain: number;
  totalGainPercentage: number;
  dailyChange: number;
  dailyChangePercentage: number;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  bestPerformer: PortfolioAsset | null;
  worstPerformer: PortfolioAsset | null;
  topAllocations: PortfolioAsset[];
  riskScore: number;
}

export interface PortfolioOverviewResponse {
  snapshot: PortfolioSnapshot;
  assets: PortfolioAsset[];
  metrics: PortfolioMetrics;
  charts: {
    performance: Array<{ date: string; value: number }>;
    allocation: Array<{ name: string; value: number; color: string }>;
  };
}

// Portfolio Overview Service Class
export class PortfolioOverviewService {
  private baseUrl = '/api/portfolio';

  // Fetch portfolio overview data
  async getPortfolioOverview(vaultId?: string): Promise<PortfolioOverviewResponse> {
    const url = vaultId 
      ? `${this.baseUrl}/overview?vaultId=${vaultId}`
      : `${this.baseUrl}/overview`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio overview');
    }
    
    return response.json();
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Get performance color
  getPerformanceColor(value: number): string {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Get performance background
  getPerformanceBackground(value: number): string {
    return value >= 0 ? 'bg-green-50' : 'bg-red-50';
  }

  // Calculate portfolio metrics
  calculatePortfolioMetrics(assets: PortfolioAsset[]): PortfolioMetrics {
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalGain = assets.reduce((sum, asset) => sum + asset.gain, 0);
    const totalGainPercentage = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;
    
    const bestPerformer = assets.reduce((best, asset) => 
      asset.gainPercentage > (best?.gainPercentage || -Infinity) ? asset : best, null as PortfolioAsset | null
    );
    
    const worstPerformer = assets.reduce((worst, asset) => 
      asset.gainPercentage < (worst?.gainPercentage || Infinity) ? asset : worst, null as PortfolioAsset | null
    );
    
    const topAllocations = [...assets]
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 5);
    
    const riskScore = this.calculateRiskScore(assets);
    
    return {
      totalValue,
      totalGain,
      totalGainPercentage,
      dailyChange: 0, // Would be calculated from historical data
      dailyChangePercentage: 0,
      weeklyChange: 0,
      monthlyChange: 0,
      yearlyChange: 0,
      bestPerformer,
      worstPerformer,
      topAllocations,
      riskScore
    };
  }

  // Calculate risk score
  calculateRiskScore(assets: PortfolioAsset[]): number {
    // Simple risk calculation based on volatility and allocation
    const assetRisks = assets.map(asset => {
      const volatility = Math.abs(asset.gainPercentage) / 100;
      const weight = asset.allocation / 100;
      return volatility * weight;
    });
    
    const portfolioRisk = assetRisks.reduce((sum, risk) => sum + risk, 0);
    return Math.min(portfolioRisk * 100, 100);
  }

  // Get risk level
  getRiskLevel(riskScore: number): {
    level: 'low' | 'medium' | 'high';
    color: string;
    description: string;
  } {
    if (riskScore < 30) {
      return {
        level: 'low',
        color: 'text-green-600',
        description: 'Conservative portfolio with low volatility'
      };
    } else if (riskScore < 70) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        description: 'Moderate risk with balanced allocation'
      };
    } else {
      return {
        level: 'high',
        color: 'text-red-600',
        description: 'High risk portfolio with potential for large gains/losses'
      };
    }
  }

  // Sort assets by performance
  sortAssetsByPerformance(assets: PortfolioAsset[], order: 'asc' | 'desc' = 'desc'): PortfolioAsset[] {
    return [...assets].sort((a, b) => 
      order === 'desc' ? b.gainPercentage - a.gainPercentage : a.gainPercentage - b.gainPercentage
    );
  }

  // Sort assets by allocation
  sortAssetsByAllocation(assets: PortfolioAsset[], order: 'asc' | 'desc' = 'desc'): PortfolioAsset[] {
    return [...assets].sort((a, b) => 
      order === 'desc' ? b.allocation - a.allocation : a.allocation - b.allocation
    );
  }

  // Filter assets by category
  filterAssetsByCategory(assets: PortfolioAsset[], category: string): PortfolioAsset[] {
    return assets.filter(asset => asset.category === category);
  }

  // Get unique categories
  getUniqueCategories(assets: PortfolioAsset[]): string[] {
    return [...new Set(assets.map(asset => asset.category))];
  }

  // Format large numbers
  formatLargeNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  // Generate allocation chart data
  generateAllocationChartData(assets: PortfolioAsset[]): Array<{ name: string; value: number; color: string }> {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
    
    return assets.map((asset, index) => ({
      name: asset.symbol,
      value: asset.allocation,
      color: colors[index % colors.length]
    }));
  }

  // Calculate diversification score
  calculateDiversificationScore(assets: PortfolioAsset[]): number {
    const categories = this.getUniqueCategories(assets);
    const categoryCount = categories.length;
    const maxAllocation = Math.max(...assets.map(a => a.allocation));
    
    // Simple diversification score
    const categoryScore = Math.min(categoryCount * 20, 60);
    const concentrationScore = Math.max(40 - maxAllocation, 0);
    
    return Math.min(categoryScore + concentrationScore, 100);
  }
}

// Service instance
export const portfolioOverviewService = new PortfolioOverviewService();

// React Query hooks
export const usePortfolioOverview = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/portfolio/overview', vaultId],
    queryFn: () => portfolioOverviewService.getPortfolioOverview(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}; 