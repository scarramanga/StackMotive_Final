import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Watchlist Engine
export interface WatchlistAsset {
  id: string;
  ticker: string;
  name: string;
  category: 'crypto' | 'stocks' | 'bonds' | 'commodities' | 'forex' | 'indices' | 'other';
  currentPrice: number;
  currency: string;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  addedAt: string;
  signals: WatchlistSignal[];
  performance: {
    week: number;
    month: number;
    quarter: number;
    year: number;
  };
  technicals: {
    rsi: number;
    ma20: number;
    ma50: number;
    ma200: number;
    support: number;
    resistance: number;
  };
  metadata: {
    sector?: string;
    industry?: string;
    description?: string;
    website?: string;
    tags: string[];
  };
}

export interface WatchlistSignal {
  id: string;
  source: string;
  type: 'buy' | 'sell' | 'hold' | 'alert';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  description: string;
  timestamp: string;
  overlayName?: string;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: '1h' | '4h' | '1d' | '1w' | '1m';
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
  assets: WatchlistAsset[];
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  settings: {
    showSignals: boolean;
    showPerformance: boolean;
    showTechnicals: boolean;
    sortBy: 'name' | 'price' | 'change' | 'volume' | 'marketCap' | 'addedAt';
    sortOrder: 'asc' | 'desc';
    alertThreshold: number;
  };
}

export interface AssetSearchResult {
  ticker: string;
  name: string;
  category: 'crypto' | 'stocks' | 'bonds' | 'commodities' | 'forex' | 'indices' | 'other';
  currentPrice: number;
  currency: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  description?: string;
  marketCap?: number;
  volume24h?: number;
}

export interface WatchlistSummary {
  totalWatchlists: number;
  totalAssets: number;
  uniqueAssets: number;
  topPerformers: WatchlistAsset[];
  bottomPerformers: WatchlistAsset[];
  recentSignals: WatchlistSignal[];
  categoryDistribution: Record<string, number>;
  signalDistribution: Record<string, number>;
}

export interface WatchlistFilter {
  category?: string;
  hasSignals?: boolean;
  priceRange?: { min: number; max: number };
  changeRange?: { min: number; max: number };
  signalTypes?: string[];
  tags?: string[];
}

// Watchlist Engine Service Class
export class WatchlistEngineService {
  private baseUrl = '/api/watchlists';

  // Get all watchlists for user
  async getWatchlists(userId: string): Promise<Watchlist[]> {
    const response = await fetch(`${this.baseUrl}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch watchlists');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('watchlists_loaded', {
      userId,
      watchlistCount: result.length,
      totalAssets: result.reduce((sum: number, w: Watchlist) => sum + w.assetCount, 0),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get specific watchlist
  async getWatchlist(id: string, userId: string): Promise<Watchlist> {
    const response = await fetch(`${this.baseUrl}/${id}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch watchlist');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('watchlist_viewed', {
      userId,
      watchlistId: id,
      watchlistName: result.name,
      assetCount: result.assetCount,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Create new watchlist
  async createWatchlist(watchlist: Omit<Watchlist, 'id' | 'assets' | 'totalValue' | 'totalChange' | 'totalChangePercent' | 'assetCount' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Watchlist> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...watchlist, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create watchlist');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('watchlist_created', {
      userId,
      watchlistId: result.id,
      watchlistName: result.name,
      isDefault: result.isDefault,
      isPublic: result.isPublic,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Update watchlist
  async updateWatchlist(id: string, updates: Partial<Watchlist>, userId: string): Promise<Watchlist> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update watchlist');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('watchlist_updated', {
      userId,
      watchlistId: id,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Delete watchlist
  async deleteWatchlist(id: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete watchlist');
    }

    // Log agent memory
    await this.logAgentMemory('watchlist_deleted', {
      userId,
      watchlistId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Search assets
  async searchAssets(query: string, category?: string): Promise<AssetSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (category) params.append('category', category);

    const response = await fetch(`${this.baseUrl}/search/assets?${params}`);
    if (!response.ok) {
      throw new Error('Failed to search assets');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('assets_searched', {
      query,
      category: category || 'all',
      resultCount: result.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Add asset to watchlist
  async addAssetToWatchlist(watchlistId: string, ticker: string, userId: string): Promise<WatchlistAsset> {
    const response = await fetch(`${this.baseUrl}/${watchlistId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to add asset to watchlist');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('asset_added_to_watchlist', {
      userId,
      watchlistId,
      ticker,
      assetName: result.name,
      category: result.category,
      currentPrice: result.currentPrice,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Remove asset from watchlist
  async removeAssetFromWatchlist(watchlistId: string, assetId: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${watchlistId}/assets/${assetId}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove asset from watchlist');
    }

    // Log agent memory
    await this.logAgentMemory('asset_removed_from_watchlist', {
      userId,
      watchlistId,
      assetId,
      timestamp: new Date().toISOString()
    });
  }

  // Get signal overlays for asset
  async getAssetSignals(ticker: string, timeframe: '1h' | '4h' | '1d' | '1w' | '1m' = '1d'): Promise<WatchlistSignal[]> {
    const response = await fetch(`${this.baseUrl}/signals/${ticker}?timeframe=${timeframe}`);
    if (!response.ok) {
      throw new Error('Failed to fetch asset signals');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('asset_signals_loaded', {
      ticker,
      timeframe,
      signalCount: result.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get watchlist summary
  async getWatchlistSummary(userId: string): Promise<WatchlistSummary> {
    const response = await fetch(`${this.baseUrl}/summary?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch watchlist summary');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('watchlist_summary_loaded', {
      userId,
      totalWatchlists: result.totalWatchlists,
      totalAssets: result.totalAssets,
      uniqueAssets: result.uniqueAssets,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Utility Methods
  getSignalTypeColor(type: WatchlistSignal['type']): string {
    switch (type) {
      case 'buy': return 'text-green-600';
      case 'sell': return 'text-red-600';
      case 'hold': return 'text-gray-600';
      case 'alert': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  getSignalTypeBackground(type: WatchlistSignal['type']): string {
    switch (type) {
      case 'buy': return 'bg-green-50 border-green-200';
      case 'sell': return 'bg-red-50 border-red-200';
      case 'hold': return 'bg-gray-50 border-gray-200';
      case 'alert': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getSignalStrengthBadge(strength: WatchlistSignal['strength']): { className: string; text: string } {
    switch (strength) {
      case 'strong':
        return { className: 'bg-green-100 text-green-800', text: 'Strong' };
      case 'moderate':
        return { className: 'bg-yellow-100 text-yellow-800', text: 'Moderate' };
      case 'weak':
        return { className: 'bg-gray-100 text-gray-800', text: 'Weak' };
      default:
        return { className: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  }

  getCategoryIcon(category: WatchlistAsset['category']): string {
    switch (category) {
      case 'crypto': return 'bitcoin';
      case 'stocks': return 'trending-up';
      case 'bonds': return 'file-text';
      case 'commodities': return 'package';
      case 'forex': return 'globe';
      case 'indices': return 'bar-chart';
      default: return 'folder';
    }
  }

  getCategoryColor(category: WatchlistAsset['category']): string {
    switch (category) {
      case 'crypto': return 'text-orange-600';
      case 'stocks': return 'text-blue-600';
      case 'bonds': return 'text-green-600';
      case 'commodities': return 'text-yellow-600';
      case 'forex': return 'text-purple-600';
      case 'indices': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getPerformanceColor(changePercent: number): string {
    if (changePercent > 5) return 'text-green-600';
    if (changePercent > 0) return 'text-green-500';
    if (changePercent > -5) return 'text-yellow-600';
    return 'text-red-600';
  }

  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  formatLargeNumber(value: number): string {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
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

  // Filtering and Sorting Methods
  filterAssets(assets: WatchlistAsset[], filter: WatchlistFilter): WatchlistAsset[] {
    return assets.filter(asset => {
      if (filter.category && asset.category !== filter.category) return false;
      
      if (filter.hasSignals !== undefined) {
        const hasSignals = asset.signals.length > 0;
        if (filter.hasSignals !== hasSignals) return false;
      }
      
      if (filter.priceRange) {
        if (asset.currentPrice < filter.priceRange.min || asset.currentPrice > filter.priceRange.max) return false;
      }
      
      if (filter.changeRange) {
        if (asset.changePercent24h < filter.changeRange.min || asset.changePercent24h > filter.changeRange.max) return false;
      }
      
      if (filter.signalTypes && filter.signalTypes.length > 0) {
        const hasMatchingSignal = asset.signals.some(signal => filter.signalTypes!.includes(signal.type));
        if (!hasMatchingSignal) return false;
      }
      
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => asset.metadata.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      return true;
    });
  }

  sortAssets(assets: WatchlistAsset[], sortBy: Watchlist['settings']['sortBy'], order: 'asc' | 'desc' = 'desc'): WatchlistAsset[] {
    return [...assets].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'price':
          compareValue = a.currentPrice - b.currentPrice;
          break;
        case 'change':
          compareValue = a.changePercent24h - b.changePercent24h;
          break;
        case 'volume':
          compareValue = a.volume24h - b.volume24h;
          break;
        case 'marketCap':
          compareValue = (a.marketCap || 0) - (b.marketCap || 0);
          break;
        case 'addedAt':
          compareValue = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Validation Methods
  validateWatchlist(watchlist: Partial<Watchlist>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!watchlist.name?.trim()) {
      errors.push('Watchlist name is required');
    }

    if (watchlist.name && watchlist.name.length > 50) {
      errors.push('Watchlist name must be 50 characters or less');
    }

    if (watchlist.description && watchlist.description.length > 200) {
      errors.push('Description must be 200 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateAssetAddition(ticker: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ticker?.trim()) {
      errors.push('Asset ticker is required');
    }

    if (ticker && ticker.length > 10) {
      errors.push('Ticker must be 10 characters or less');
    }

    if (ticker && !/^[A-Za-z0-9.-]+$/.test(ticker)) {
      errors.push('Ticker contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Business Logic Methods
  createDefaultWatchlist(): Omit<Watchlist, 'id' | 'assets' | 'totalValue' | 'totalChange' | 'totalChangePercent' | 'assetCount' | 'createdAt' | 'updatedAt'> {
    return {
      name: '',
      description: '',
      color: '#3B82F6',
      isDefault: false,
      isPublic: false,
      tags: [],
      settings: {
        showSignals: true,
        showPerformance: true,
        showTechnicals: false,
        sortBy: 'name',
        sortOrder: 'asc',
        alertThreshold: 5
      }
    };
  }

  async handleWatchlistSubmit(
    watchlist: Omit<Watchlist, 'id' | 'assets' | 'totalValue' | 'totalChange' | 'totalChangePercent' | 'assetCount' | 'createdAt' | 'updatedAt'>,
    editingId: string | null,
    userId: string
  ): Promise<{ success: boolean; error?: string; result?: Watchlist }> {
    try {
      const validation = this.validateWatchlist(watchlist);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      let result: Watchlist;
      if (editingId) {
        result = await this.updateWatchlist(editingId, watchlist, userId);
      } else {
        result = await this.createWatchlist(watchlist, userId);
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleAssetAddition(
    watchlistId: string,
    ticker: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; result?: WatchlistAsset }> {
    try {
      const validation = this.validateAssetAddition(ticker);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const result = await this.addAssetToWatchlist(watchlistId, ticker.toUpperCase(), userId);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add asset' };
    }
  }

  async handleAssetRemoval(
    watchlistId: string,
    assetId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.removeAssetFromWatchlist(watchlistId, assetId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove asset' };
    }
  }

  async handleWatchlistDelete(
    watchlistId: string,
    watchlistName: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const confirmed = window.confirm(`Are you sure you want to delete "${watchlistName}"?`);
      if (!confirmed) {
        return { success: false, error: 'Deletion cancelled by user' };
      }

      await this.deleteWatchlist(watchlistId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete watchlist' };
    }
  }

  getAssetStats(watchlist: Watchlist): {
    totalValue: number;
    totalChange: number;
    totalChangePercent: number;
    topPerformer: WatchlistAsset | null;
    bottomPerformer: WatchlistAsset | null;
    signalCount: number;
  } {
    if (watchlist.assets.length === 0) {
      return {
        totalValue: 0,
        totalChange: 0,
        totalChangePercent: 0,
        topPerformer: null,
        bottomPerformer: null,
        signalCount: 0
      };
    }

    const totalValue = watchlist.assets.reduce((sum, asset) => sum + asset.currentPrice, 0);
    const totalChange = watchlist.assets.reduce((sum, asset) => sum + asset.change24h, 0);
    const totalChangePercent = watchlist.assets.reduce((sum, asset) => sum + asset.changePercent24h, 0) / watchlist.assets.length;
    
    const topPerformer = watchlist.assets.reduce((best, asset) => 
      asset.changePercent24h > (best?.changePercent24h || -Infinity) ? asset : best, null as WatchlistAsset | null
    );
    
    const bottomPerformer = watchlist.assets.reduce((worst, asset) => 
      asset.changePercent24h < (worst?.changePercent24h || Infinity) ? asset : worst, null as WatchlistAsset | null
    );
    
    const signalCount = watchlist.assets.reduce((count, asset) => count + asset.signals.length, 0);

    return {
      totalValue,
      totalChange,
      totalChangePercent,
      topPerformer,
      bottomPerformer,
      signalCount
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
          blockId: 'block-32-watchlist-engine',
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
export const watchlistEngineService = new WatchlistEngineService();

// React Query hooks
export const useWatchlists = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/watchlists', userId],
    queryFn: () => watchlistEngineService.getWatchlists(userId!),
    enabled: !!userId,
    refetchInterval: 300000, // 5 minutes
  });
};

export const useWatchlist = (id?: string, userId?: string) => {
  return useQuery({
    queryKey: ['/api/watchlists', id, userId],
    queryFn: () => watchlistEngineService.getWatchlist(id!, userId!),
    enabled: !!id && !!userId,
    refetchInterval: 60000, // 1 minute
  });
};

export const useCreateWatchlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ watchlist, userId }: { watchlist: Omit<Watchlist, 'id' | 'assets' | 'totalValue' | 'totalChange' | 'totalChangePercent' | 'assetCount' | 'createdAt' | 'updatedAt'>; userId: string }) =>
      watchlistEngineService.createWatchlist(watchlist, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
    },
  });
};

export const useUpdateWatchlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, userId }: { id: string; updates: Partial<Watchlist>; userId: string }) =>
      watchlistEngineService.updateWatchlist(id, updates, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
    },
  });
};

export const useDeleteWatchlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      watchlistEngineService.deleteWatchlist(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
    },
  });
};

export const useSearchAssets = (query: string, category?: string) => {
  return useQuery({
    queryKey: ['/api/watchlists/search/assets', query, category],
    queryFn: () => watchlistEngineService.searchAssets(query, category),
    enabled: query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
};

export const useAddAssetToWatchlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ watchlistId, ticker, userId }: { watchlistId: string; ticker: string; userId: string }) =>
      watchlistEngineService.addAssetToWatchlist(watchlistId, ticker, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
    },
  });
};

export const useRemoveAssetFromWatchlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ watchlistId, assetId, userId }: { watchlistId: string; assetId: string; userId: string }) =>
      watchlistEngineService.removeAssetFromWatchlist(watchlistId, assetId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlists'] });
    },
  });
};

export const useAssetSignals = (ticker?: string, timeframe: '1h' | '4h' | '1d' | '1w' | '1m' = '1d') => {
  return useQuery({
    queryKey: ['/api/watchlists/signals', ticker, timeframe],
    queryFn: () => watchlistEngineService.getAssetSignals(ticker!, timeframe),
    enabled: !!ticker,
    refetchInterval: 300000, // 5 minutes
  });
};

export const useWatchlistSummary = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/watchlists/summary', userId],
    queryFn: () => watchlistEngineService.getWatchlistSummary(userId!),
    enabled: !!userId,
    refetchInterval: 300000, // 5 minutes
  });
}; 