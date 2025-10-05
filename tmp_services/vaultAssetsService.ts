import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Vault Assets
export interface Asset {
  id: string;
  name: string;
  symbol: string;
  allocation: number; // percent
  value?: number;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume?: number;
  sector?: string;
  assetClass?: 'crypto' | 'stock' | 'bond' | 'commodity' | 'cash';
  isActive: boolean;
  addedDate: string;
  lastUpdated: string;
}

export interface AssetFilters {
  search?: string;
  assetClass?: string;
  sector?: string;
  minAllocation?: number;
  maxAllocation?: number;
  isActive?: boolean;
}

export interface AssetValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VaultAssetsResponse {
  assets: Asset[];
  totalAssets: number;
  totalAllocation: number;
  totalValue: number;
  summary: {
    byAssetClass: Array<{ assetClass: string; count: number; allocation: number }>;
    bySector: Array<{ sector: string; count: number; allocation: number }>;
    topAllocations: Asset[];
  };
}

// Vault Assets Service Class
export class VaultAssetsService {
  private baseUrl = '/api/vault/assets';

  // Fetch all assets for a vault
  async getAssets(vaultId: string, filters?: AssetFilters): Promise<VaultAssetsResponse> {
    const params = new URLSearchParams({ vaultId });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch vault assets');
    }
    
    return response.json();
  }

  // Add new asset to vault
  async addAsset(vaultId: string, asset: Omit<Asset, 'id' | 'addedDate' | 'lastUpdated' | 'isActive'>): Promise<Asset> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, ...asset }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add asset');
    }
    
    return response.json();
  }

  // Update existing asset
  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update asset');
    }
    
    return response.json();
  }

  // Remove asset from vault
  async removeAsset(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove asset');
    }
  }

  // Validate asset data
  validateAsset(asset: Partial<Asset>, existingAssets: Asset[] = []): AssetValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!asset.name?.trim()) {
      errors.push('Asset name is required');
    }

    if (!asset.symbol?.trim()) {
      errors.push('Asset symbol is required');
    }

    if (asset.allocation === undefined || asset.allocation === null) {
      errors.push('Allocation percentage is required');
    } else {
      // Allocation validation
      if (asset.allocation <= 0) {
        errors.push('Allocation must be greater than 0%');
      }

      if (asset.allocation > 100) {
        errors.push('Allocation cannot exceed 100%');
      }

      // Check total allocation doesn't exceed 100%
      const otherAssetsAllocation = existingAssets
        .filter(a => a.id !== asset.id)
        .reduce((sum, a) => sum + a.allocation, 0);
      
      if (otherAssetsAllocation + asset.allocation > 100) {
        warnings.push('Total portfolio allocation will exceed 100%');
      }
    }

    // Symbol validation
    if (asset.symbol) {
      const normalizedSymbol = asset.symbol.trim().toUpperCase();
      const duplicateSymbol = existingAssets.find(a => 
        a.id !== asset.id && a.symbol.toUpperCase() === normalizedSymbol
      );
      
      if (duplicateSymbol) {
        errors.push('Asset symbol already exists in this vault');
      }

      if (asset.symbol.length > 10) {
        warnings.push('Symbol is longer than typical (>10 characters)');
      }
    }

    // Name validation
    if (asset.name && asset.name.length > 100) {
      errors.push('Asset name is too long (max 100 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Calculate portfolio metrics
  calculatePortfolioMetrics(assets: Asset[]): {
    totalAllocation: number;
    totalValue: number;
    diversificationScore: number;
    largestAllocation: number;
    assetCount: number;
    isOverAllocated: boolean;
    isUnderAllocated: boolean;
  } {
    const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const largestAllocation = Math.max(...assets.map(a => a.allocation));
    
    // Simple diversification score (inverse concentration)
    const concentration = assets.reduce((sum, asset) => 
      sum + Math.pow(asset.allocation / 100, 2), 0
    );
    const diversificationScore = Math.max(0, (1 - concentration) * 100);

    return {
      totalAllocation,
      totalValue,
      diversificationScore,
      largestAllocation,
      assetCount: assets.length,
      isOverAllocated: totalAllocation > 100,
      isUnderAllocated: totalAllocation < 95 // Allow 5% tolerance
    };
  }

  // Normalize asset symbol
  normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
  }

  // Suggest allocation rebalancing
  suggestRebalancing(assets: Asset[], targetTotal: number = 100): Array<{
    assetId: string;
    currentAllocation: number;
    suggestedAllocation: number;
    difference: number;
  }> {
    const currentTotal = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    
    if (Math.abs(currentTotal - targetTotal) < 0.01) {
      return []; // Already balanced
    }

    const scalingFactor = targetTotal / currentTotal;
    
    return assets.map(asset => {
      const suggestedAllocation = Math.round(asset.allocation * scalingFactor * 100) / 100;
      return {
        assetId: asset.id,
        currentAllocation: asset.allocation,
        suggestedAllocation,
        difference: suggestedAllocation - asset.allocation
      };
    });
  }

  // Format allocation percentage
  formatAllocation(allocation: number): string {
    return `${allocation.toFixed(2)}%`;
  }

  // Format currency value
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Get asset class color
  getAssetClassColor(assetClass?: string): string {
    const colors: { [key: string]: string } = {
      crypto: 'text-orange-600',
      stock: 'text-blue-600',
      bond: 'text-green-600',
      commodity: 'text-purple-600',
      cash: 'text-gray-600'
    };
    return colors[assetClass || ''] || 'text-gray-600';
  }

  // Get allocation status
  getAllocationStatus(allocation: number, maxAllocation: number = 20): {
    status: 'balanced' | 'overweight' | 'concentrated';
    color: string;
    warning?: string;
  } {
    if (allocation > 50) {
      return {
        status: 'concentrated',
        color: 'text-red-600',
        warning: 'High concentration risk'
      };
    } else if (allocation > maxAllocation) {
      return {
        status: 'overweight',
        color: 'text-yellow-600',
        warning: 'Consider reducing allocation'
      };
    } else {
      return {
        status: 'balanced',
        color: 'text-green-600'
      };
    }
  }

  // Filter assets
  filterAssets(assets: Asset[], filters: AssetFilters): Asset[] {
    return assets.filter(asset => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!asset.name.toLowerCase().includes(searchLower) && 
            !asset.symbol.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (filters.assetClass && asset.assetClass !== filters.assetClass) {
        return false;
      }

      if (filters.sector && asset.sector !== filters.sector) {
        return false;
      }

      if (filters.minAllocation && asset.allocation < filters.minAllocation) {
        return false;
      }

      if (filters.maxAllocation && asset.allocation > filters.maxAllocation) {
        return false;
      }

      if (filters.isActive !== undefined && asset.isActive !== filters.isActive) {
        return false;
      }

      return true;
    });
  }

  // Sort assets
  sortAssets(assets: Asset[], sortBy: 'name' | 'symbol' | 'allocation' | 'value' | 'addedDate', order: 'asc' | 'desc' = 'asc'): Asset[] {
    return [...assets].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'symbol':
          compareValue = a.symbol.localeCompare(b.symbol);
          break;
        case 'allocation':
          compareValue = a.allocation - b.allocation;
          break;
        case 'value':
          compareValue = (a.value || 0) - (b.value || 0);
          break;
        case 'addedDate':
          compareValue = new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
          break;
      }

      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get unique asset classes
  getUniqueAssetClasses(assets: Asset[]): string[] {
    return [...new Set(assets.map(asset => asset.assetClass).filter(Boolean))];
  }

  // Get unique sectors
  getUniqueSectors(assets: Asset[]): string[] {
    return [...new Set(assets.map(asset => asset.sector).filter(Boolean))];
  }

  // Export assets to CSV
  exportToCSV(assets: Asset[]): string {
    const headers = ['Name', 'Symbol', 'Allocation (%)', 'Value', 'Asset Class', 'Sector', 'Added Date'];
    const rows = assets.map(asset => [
      asset.name,
      asset.symbol,
      asset.allocation.toString(),
      (asset.value || 0).toString(),
      asset.assetClass || '',
      asset.sector || '',
      asset.addedDate
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}

// Service instance
export const vaultAssetsService = new VaultAssetsService();

// React Query hooks
export const useVaultAssets = (vaultId: string, user?: any, filters?: AssetFilters) => {
  return useQuery({
    queryKey: ['/api/vault/assets', vaultId, filters],
    queryFn: () => vaultAssetsService.getAssets(vaultId, filters),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000,
  });
};

export const useAddAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, asset }: { vaultId: string; asset: Omit<Asset, 'id' | 'addedDate' | 'lastUpdated' | 'isActive'> }) =>
      vaultAssetsService.addAsset(vaultId, asset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/assets'] });
    },
  });
};

export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Asset> }) =>
      vaultAssetsService.updateAsset(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/assets'] });
    },
  });
};

export const useRemoveAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vaultAssetsService.removeAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/assets'] });
    },
  });
}; 