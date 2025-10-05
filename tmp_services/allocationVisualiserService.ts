import { useQuery } from '@tanstack/react-query';

// Types for Allocation Visualiser
export interface AllocationItem {
  id: string;
  name: string;
  symbol: string;
  allocation: number;
  targetAllocation: number;
  currentValue: number;
  drift: number;
  category: 'crypto' | 'stocks' | 'bonds' | 'commodities' | 'cash';
  subCategory?: string;
  color: string;
  isOverweight: boolean;
  isUnderweight: boolean;
  rebalanceAmount?: number;
  performance?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface AllocationBreakdown {
  byCategory: {
    [key: string]: {
      current: number;
      target: number;
      drift: number;
      items: AllocationItem[];
    };
  };
  byAsset: AllocationItem[];
  totalValue: number;
  totalDrift: number;
  rebalanceNeeded: boolean;
  lastUpdated: string;
}

export interface AllocationVisualisationData {
  pieChartData: {
    name: string;
    value: number;
    color: string;
    percentage: number;
  }[];
  treeMapData: {
    name: string;
    value: number;
    color: string;
    category: string;
    children?: any[];
  }[];
  sankeyData: {
    nodes: { id: string; name: string; category: string }[];
    links: { source: string; target: string; value: number }[];
  };
}

export interface AllocationResponse {
  breakdown: AllocationBreakdown;
  visualisation: AllocationVisualisationData;
  recommendations: {
    id: string;
    type: 'rebalance' | 'reallocate' | 'reduce_drift';
    priority: 'high' | 'medium' | 'low';
    description: string;
    suggestedAction: string;
    potentialImpact: number;
  }[];
}

// Allocation Visualiser Service Class
export class AllocationVisualiserService {
  private baseUrl = '/api/portfolio';

  // Fetch allocation data
  async getAllocationData(vaultId?: string): Promise<AllocationResponse> {
    const url = vaultId 
      ? `${this.baseUrl}/allocation?vaultId=${vaultId}`
      : `${this.baseUrl}/allocation`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch allocation data');
    }
    
    return response.json();
  }

  // Calculate drift from target allocation
  calculateDrift(current: number, target: number): number {
    return ((current - target) / target) * 100;
  }

  // Determine if rebalancing is needed
  isRebalanceNeeded(items: AllocationItem[], threshold: number = 5): boolean {
    return items.some(item => Math.abs(item.drift) > threshold);
  }

  // Get category color mapping
  getCategoryColor(category: string): string {
    const colorMap: { [key: string]: string } = {
      crypto: '#f59e0b',
      stocks: '#3b82f6',
      bonds: '#10b981',
      commodities: '#8b5cf6',
      cash: '#6b7280',
      real_estate: '#ef4444',
      alternatives: '#f97316'
    };
    return colorMap[category] || '#6b7280';
  }

  // Format allocation percentage
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Format currency value
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Get drift color based on severity
  getDriftColor(drift: number): string {
    const absDrift = Math.abs(drift);
    if (absDrift > 10) return 'text-red-600';
    if (absDrift > 5) return 'text-orange-600';
    if (absDrift > 2) return 'text-yellow-600';
    return 'text-green-600';
  }

  // Get drift background color
  getDriftBackground(drift: number): string {
    const absDrift = Math.abs(drift);
    if (absDrift > 10) return 'bg-red-50 border-red-200';
    if (absDrift > 5) return 'bg-orange-50 border-orange-200';
    if (absDrift > 2) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  }

  // Generate pie chart data
  generatePieChartData(items: AllocationItem[]): AllocationVisualisationData['pieChartData'] {
    return items.map(item => ({
      name: item.name,
      value: item.allocation,
      color: item.color,
      percentage: item.allocation
    }));
  }

  // Generate tree map data
  generateTreeMapData(breakdown: AllocationBreakdown): AllocationVisualisationData['treeMapData'] {
    return Object.entries(breakdown.byCategory).map(([category, data]) => ({
      name: category,
      value: data.current,
      color: this.getCategoryColor(category),
      category,
      children: data.items.map(item => ({
        name: item.name,
        value: item.allocation,
        color: item.color
      }))
    }));
  }

  // Generate sankey diagram data
  generateSankeyData(breakdown: AllocationBreakdown): AllocationVisualisationData['sankeyData'] {
    const nodes: { id: string; name: string; category: string }[] = [
      { id: 'portfolio', name: 'Portfolio', category: 'root' }
    ];

    const links: { source: string; target: string; value: number }[] = [];

    // Add category nodes and links
    Object.entries(breakdown.byCategory).forEach(([category, data]) => {
      nodes.push({ id: category, name: category, category: 'category' });
      links.push({
        source: 'portfolio',
        target: category,
        value: data.current
      });

      // Add asset nodes and links
      data.items.forEach(item => {
        nodes.push({ id: item.id, name: item.name, category: 'asset' });
        links.push({
          source: category,
          target: item.id,
          value: item.allocation
        });
      });
    });

    return { nodes, links };
  }

  // Calculate rebalance suggestions
  calculateRebalanceSuggestions(
    items: AllocationItem[],
    totalValue: number
  ): { asset: string; action: 'buy' | 'sell'; amount: number; percentage: number }[] {
    return items
      .filter(item => Math.abs(item.drift) > 2)
      .map(item => {
        const targetValue = (item.targetAllocation / 100) * totalValue;
        const currentValue = (item.allocation / 100) * totalValue;
        const difference = targetValue - currentValue;
        
        return {
          asset: item.name,
          action: difference > 0 ? 'buy' as const : 'sell' as const,
          amount: Math.abs(difference),
          percentage: Math.abs(difference / totalValue) * 100
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  // Get allocation status
  getAllocationStatus(drift: number): {
    status: 'overweight' | 'underweight' | 'balanced';
    severity: 'high' | 'medium' | 'low';
    color: string;
  } {
    const absDrift = Math.abs(drift);
    
    if (absDrift < 2) {
      return {
        status: 'balanced',
        severity: 'low',
        color: 'text-green-600'
      };
    }
    
    const status = drift > 0 ? 'overweight' : 'underweight';
    const severity = absDrift > 10 ? 'high' : absDrift > 5 ? 'medium' : 'low';
    const color = absDrift > 10 ? 'text-red-600' : 
                 absDrift > 5 ? 'text-orange-600' : 'text-yellow-600';
    
    return { status, severity, color };
  }

  // Calculate portfolio health score
  calculateHealthScore(items: AllocationItem[]): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    description: string;
  } {
    const totalDrift = items.reduce((sum, item) => sum + Math.abs(item.drift), 0);
    const avgDrift = totalDrift / items.length;
    
    let score = 100;
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    let description = 'Excellent allocation balance';
    
    if (avgDrift > 15) {
      score = 40;
      grade = 'F';
      description = 'Significant rebalancing needed';
    } else if (avgDrift > 10) {
      score = 60;
      grade = 'D';
      description = 'Poor allocation balance';
    } else if (avgDrift > 5) {
      score = 75;
      grade = 'C';
      description = 'Moderate rebalancing needed';
    } else if (avgDrift > 2) {
      score = 85;
      grade = 'B';
      description = 'Good allocation balance';
    } else {
      score = 95;
      grade = 'A';
      description = 'Excellent allocation balance';
    }
    
    return { score, grade, description };
  }

  // Filter items by category
  filterByCategory(items: AllocationItem[], category: string): AllocationItem[] {
    return items.filter(item => item.category === category);
  }

  // Sort items by allocation
  sortByAllocation(items: AllocationItem[], order: 'asc' | 'desc' = 'desc'): AllocationItem[] {
    return [...items].sort((a, b) => 
      order === 'desc' ? b.allocation - a.allocation : a.allocation - b.allocation
    );
  }

  // Sort items by drift
  sortByDrift(items: AllocationItem[], order: 'asc' | 'desc' = 'desc'): AllocationItem[] {
    return [...items].sort((a, b) => 
      order === 'desc' ? Math.abs(b.drift) - Math.abs(a.drift) : Math.abs(a.drift) - Math.abs(b.drift)
    );
  }

  // Get unique categories
  getUniqueCategories(items: AllocationItem[]): string[] {
    return [...new Set(items.map(item => item.category))];
  }

  // Calculate category totals
  calculateCategoryTotals(items: AllocationItem[]): { [category: string]: number } {
    const totals: { [category: string]: number } = {};
    
    items.forEach(item => {
      if (!totals[item.category]) {
        totals[item.category] = 0;
      }
      totals[item.category] += item.allocation;
    });
    
    return totals;
  }
}

// Service instance
export const allocationVisualiserService = new AllocationVisualiserService();

// React Query hooks
export const useAllocationData = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/portfolio/allocation', vaultId],
    queryFn: () => allocationVisualiserService.getAllocationData(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000, // Refresh every minute
  });
}; 