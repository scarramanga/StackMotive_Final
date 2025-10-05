import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Manual Trade Tagger
export interface TradeTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  category: 'strategy' | 'reason' | 'outcome' | 'sentiment' | 'custom';
  isActive: boolean;
  createdAt: string;
  usageCount: number;
}

export interface TaggedTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
  tags: TradeTag[];
  notes?: string;
  confidence?: number;
  isManual: boolean;
  strategy?: string;
  reasoning?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  profitLoss?: number;
}

export interface TaggingRule {
  id: string;
  name: string;
  isActive: boolean;
  conditions: {
    symbol?: string;
    side?: 'buy' | 'sell';
    minAmount?: number;
    maxAmount?: number;
    priceRange?: { min: number; max: number };
    timeRange?: { start: string; end: string };
    strategy?: string;
  };
  actions: {
    addTags: string[];
    setNotes?: string;
    setConfidence?: number;
  };
  priority: number;
}

export interface TradeAnalytics {
  totalTrades: number;
  taggedTrades: number;
  untaggedTrades: number;
  topTags: Array<{ tag: TradeTag; count: number; performance: number }>;
  tagPerformance: Array<{ 
    tagId: string; 
    winRate: number; 
    avgReturn: number; 
    totalTrades: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgPerformance: number;
  }>;
}

export interface ManualTradeTaggerData {
  trades: TaggedTrade[];
  tags: TradeTag[];
  rules: TaggingRule[];
  analytics: TradeAnalytics;
  recentActivity: Array<{
    id: string;
    type: 'tag_added' | 'tag_removed' | 'trade_noted' | 'rule_applied';
    description: string;
    timestamp: string;
  }>;
}

// Manual Trade Tagger Service Class
export class ManualTradeTaggerService {
  private baseUrl = '/api/trading/tagger';

  // Fetch trade tagger data
  async getTradeTaggerData(vaultId?: string): Promise<ManualTradeTaggerData> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch trade tagger data');
    }
    
    return response.json();
  }

  // Create new tag
  async createTag(tag: Omit<TradeTag, 'id' | 'createdAt' | 'usageCount'>, vaultId?: string): Promise<TradeTag> {
    const url = vaultId 
      ? `${this.baseUrl}/tags?vaultId=${vaultId}`
      : `${this.baseUrl}/tags`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create tag');
    }
    
    return response.json();
  }

  // Update tag
  async updateTag(id: string, updates: Partial<TradeTag>, vaultId?: string): Promise<TradeTag> {
    const url = vaultId 
      ? `${this.baseUrl}/tags/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/tags/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tag');
    }
    
    return response.json();
  }

  // Delete tag
  async deleteTag(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/tags/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/tags/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error('Failed to delete tag');
    }
  }

  // Tag trade
  async tagTrade(tradeId: string, tagIds: string[], vaultId?: string): Promise<TaggedTrade> {
    const url = vaultId 
      ? `${this.baseUrl}/trades/${tradeId}/tags?vaultId=${vaultId}`
      : `${this.baseUrl}/trades/${tradeId}/tags`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to tag trade');
    }
    
    return response.json();
  }

  // Remove tag from trade
  async untagTrade(tradeId: string, tagId: string, vaultId?: string): Promise<TaggedTrade> {
    const url = vaultId 
      ? `${this.baseUrl}/trades/${tradeId}/tags/${tagId}?vaultId=${vaultId}`
      : `${this.baseUrl}/trades/${tradeId}/tags/${tagId}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error('Failed to remove tag from trade');
    }
    
    return response.json();
  }

  // Add notes to trade
  async addTradeNotes(tradeId: string, notes: string, vaultId?: string): Promise<TaggedTrade> {
    const url = vaultId 
      ? `${this.baseUrl}/trades/${tradeId}/notes?vaultId=${vaultId}`
      : `${this.baseUrl}/trades/${tradeId}/notes`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add trade notes');
    }
    
    return response.json();
  }

  // Create tagging rule
  async createTaggingRule(rule: Omit<TaggingRule, 'id'>, vaultId?: string): Promise<TaggingRule> {
    const url = vaultId 
      ? `${this.baseUrl}/rules?vaultId=${vaultId}`
      : `${this.baseUrl}/rules`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create tagging rule');
    }
    
    return response.json();
  }

  // Apply tagging rules to trades
  async applyTaggingRules(vaultId?: string): Promise<{ appliedCount: number; rulesUsed: number }> {
    const url = vaultId 
      ? `${this.baseUrl}/rules/apply?vaultId=${vaultId}`
      : `${this.baseUrl}/rules/apply`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      throw new Error('Failed to apply tagging rules');
    }
    
    return response.json();
  }

  // Get predefined tag colors
  getPredefinedColors(): string[] {
    return [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
    ];
  }

  // Get category color
  getCategoryColor(category: TradeTag['category']): string {
    const colors = {
      strategy: '#3b82f6',
      reason: '#10b981',
      outcome: '#f59e0b',
      sentiment: '#ef4444',
      custom: '#8b5cf6'
    };
    return colors[category] || colors.custom;
  }

  // Get tag usage statistics
  calculateTagUsageStats(tags: TradeTag[], trades: TaggedTrade[]): Array<{
    tag: TradeTag;
    usageCount: number;
    winRate: number;
    avgReturn: number;
    lastUsed: string;
  }> {
    return tags.map(tag => {
      const taggedTrades = trades.filter(trade => 
        trade.tags.some(t => t.id === tag.id)
      );
      
      const usageCount = taggedTrades.length;
      const profitableTrades = taggedTrades.filter(trade => 
        (trade.profitLoss || 0) > 0
      );
      const winRate = usageCount > 0 ? (profitableTrades.length / usageCount) * 100 : 0;
      
      const totalReturn = taggedTrades.reduce((sum, trade) => 
        sum + (trade.profitLoss || 0), 0
      );
      const avgReturn = usageCount > 0 ? totalReturn / usageCount : 0;
      
      const lastUsed = taggedTrades.length > 0 
        ? Math.max(...taggedTrades.map(t => new Date(t.timestamp).getTime()))
        : 0;
      
      return {
        tag,
        usageCount,
        winRate,
        avgReturn,
        lastUsed: new Date(lastUsed).toISOString()
      };
    });
  }

  // Filter trades by tags
  filterTradesByTags(trades: TaggedTrade[], tagIds: string[]): TaggedTrade[] {
    if (tagIds.length === 0) return trades;
    
    return trades.filter(trade => 
      tagIds.every(tagId => trade.tags.some(tag => tag.id === tagId))
    );
  }

  // Filter trades by category
  filterTradesByCategory(trades: TaggedTrade[], category: string): TaggedTrade[] {
    if (category === 'all') return trades;
    
    return trades.filter(trade => 
      trade.tags.some(tag => tag.category === category)
    );
  }

  // Search trades
  searchTrades(trades: TaggedTrade[], query: string): TaggedTrade[] {
    const lowerQuery = query.toLowerCase();
    
    return trades.filter(trade => 
      trade.symbol.toLowerCase().includes(lowerQuery) ||
      trade.notes?.toLowerCase().includes(lowerQuery) ||
      trade.strategy?.toLowerCase().includes(lowerQuery) ||
      trade.reasoning?.toLowerCase().includes(lowerQuery) ||
      trade.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery))
    );
  }

  // Sort trades
  sortTrades(trades: TaggedTrade[], sortBy: 'timestamp' | 'symbol' | 'total' | 'profitLoss', order: 'asc' | 'desc' = 'desc'): TaggedTrade[] {
    return [...trades].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'symbol':
          compareValue = a.symbol.localeCompare(b.symbol);
          break;
        case 'total':
          compareValue = a.total - b.total;
          break;
        case 'profitLoss':
          compareValue = (a.profitLoss || 0) - (b.profitLoss || 0);
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Validate tag form
  validateTagForm(tag: Partial<TradeTag>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!tag.name?.trim()) {
      errors.push('Tag name is required');
    }
    
    if (!tag.color?.trim()) {
      errors.push('Tag color is required');
    } else if (!/^#[0-9A-F]{6}$/i.test(tag.color)) {
      errors.push('Invalid color format (use hex format: #RRGGBB)');
    }
    
    if (!tag.category) {
      errors.push('Tag category is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create default tag
  createDefaultTag(): Omit<TradeTag, 'id' | 'createdAt' | 'usageCount'> {
    return {
      name: '',
      color: this.getPredefinedColors()[0],
      category: 'custom',
      isActive: true,
      description: ''
    };
  }

  // Format P&L
  formatProfitLoss(pnl: number): string {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(pnl));
    
    return pnl >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  // Get P&L color
  getProfitLossColor(pnl: number): string {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Format confidence percentage
  formatConfidence(confidence?: number): string {
    if (confidence === undefined) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  }

  // Calculate tag performance
  calculateTagPerformance(trades: TaggedTrade[], tagId: string): {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    totalReturn: number;
    bestTrade: TaggedTrade | null;
    worstTrade: TaggedTrade | null;
  } {
    const taggedTrades = trades.filter(trade => 
      trade.tags.some(tag => tag.id === tagId)
    );
    
    if (taggedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgReturn: 0,
        totalReturn: 0,
        bestTrade: null,
        worstTrade: null
      };
    }
    
    const profitableTrades = taggedTrades.filter(trade => (trade.profitLoss || 0) > 0);
    const winRate = (profitableTrades.length / taggedTrades.length) * 100;
    
    const totalReturn = taggedTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
    const avgReturn = totalReturn / taggedTrades.length;
    
    const bestTrade = taggedTrades.reduce((best, trade) => 
      (trade.profitLoss || 0) > (best?.profitLoss || -Infinity) ? trade : best, null as TaggedTrade | null
    );
    
    const worstTrade = taggedTrades.reduce((worst, trade) => 
      (trade.profitLoss || 0) < (worst?.profitLoss || Infinity) ? trade : worst, null as TaggedTrade | null
    );
    
    return {
      totalTrades: taggedTrades.length,
      winRate,
      avgReturn,
      totalReturn,
      bestTrade,
      worstTrade
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

  // Get unique symbols
  getUniqueSymbols(trades: TaggedTrade[]): string[] {
    return [...new Set(trades.map(trade => trade.symbol))].sort();
  }

  // Get unique strategies
  getUniqueStrategies(trades: TaggedTrade[]): string[] {
    const strategies = trades.map(trade => trade.strategy).filter(Boolean);
    return [...new Set(strategies)].sort();
  }

  // **EXTRACTED BUSINESS LOGIC FROM PANEL**

  // Panel-specific interfaces
  interface PanelTradeTag {
    strategyMatch: string;
    intent: string;
    marketCondition: string;
    confidenceLevel: string;
  }

  interface PanelManualTrade {
    id: string;
    asset: string;
    assetType: 'stock' | 'crypto' | 'commodity' | 'forex';
    action: 'buy' | 'sell';
    amount: number;
    price: number;
    date: string;
    totalValue: number;
    tags: PanelTradeTag;
    description?: string;
    source: 'manual' | 'automatic';
  }

  interface PanelTradeTagUpdate {
    tradeId: string;
    tags: PanelTradeTag;
  }

  // Tag options constants
  readonly STRATEGY_MATCH_OPTIONS = [
    { value: '', label: 'Select strategy...' },
    { value: 'momentum', label: 'Momentum Trading' },
    { value: 'mean-reversion', label: 'Mean Reversion' },
    { value: 'breakout', label: 'Breakout Strategy' },
    { value: 'dca', label: 'Dollar Cost Averaging' },
    { value: 'swing', label: 'Swing Trading' },
    { value: 'scalping', label: 'Scalping' },
    { value: 'position', label: 'Position Trading' },
    { value: 'arbitrage', label: 'Arbitrage' },
    { value: 'other', label: 'Other' },
  ];

  readonly INTENT_OPTIONS = [
    { value: '', label: 'Select intent...' },
    { value: 'profit-taking', label: 'Profit Taking' },
    { value: 'loss-cutting', label: 'Loss Cutting' },
    { value: 'rebalancing', label: 'Rebalancing' },
    { value: 'speculation', label: 'Speculation' },
    { value: 'hedging', label: 'Hedging' },
    { value: 'diversification', label: 'Diversification' },
    { value: 'tax-optimization', label: 'Tax Optimization' },
    { value: 'emergency', label: 'Emergency' },
  ];

  readonly MARKET_CONDITION_OPTIONS = [
    { value: '', label: 'Select condition...' },
    { value: 'bullish', label: 'Bullish Market' },
    { value: 'bearish', label: 'Bearish Market' },
    { value: 'sideways', label: 'Sideways Market' },
    { value: 'volatile', label: 'High Volatility' },
    { value: 'stable', label: 'Stable Market' },
    { value: 'uncertain', label: 'Uncertain' },
    { value: 'crisis', label: 'Crisis/Panic' },
    { value: 'recovery', label: 'Recovery' },
  ];

  readonly CONFIDENCE_LEVEL_OPTIONS = [
    { value: '', label: 'Select confidence...' },
    { value: 'very-high', label: 'Very High (90%+)' },
    { value: 'high', label: 'High (75-89%)' },
    { value: 'medium', label: 'Medium (50-74%)' },
    { value: 'low', label: 'Low (25-49%)' },
    { value: 'very-low', label: 'Very Low (<25%)' },
  ];

  // Filter trades with business logic
  filterPanelTrades(trades: PanelManualTrade[], filters: {
    searchTerm?: string;
    assetFilter?: string;
    actionFilter?: string;
  }): PanelManualTrade[] {
    return trades.filter(trade => {
      // Search term filter
      if (filters.searchTerm && !trade.asset.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Asset type filter
      if (filters.assetFilter && filters.assetFilter !== 'all' && trade.assetType !== filters.assetFilter) {
        return false;
      }
      
      // Action filter
      if (filters.actionFilter && filters.actionFilter !== 'all' && trade.action !== filters.actionFilter) {
        return false;
      }
      
      return true;
    });
  }

  // Update trade tag with business logic
  updateTradeTag(
    tradeTags: Record<string, PanelTradeTag>,
    tradeId: string,
    tagType: keyof PanelTradeTag,
    value: string
  ): Record<string, PanelTradeTag> {
    return {
      ...tradeTags,
      [tradeId]: {
        ...tradeTags[tradeId],
        [tagType]: value
      }
    };
  }

  // Get changed trades with business logic
  getChangedTrades(
    originalTrades: PanelManualTrade[],
    currentTradeTags: Record<string, PanelTradeTag>
  ): PanelTradeTagUpdate[] {
    return originalTrades
      .filter(trade => {
        const currentTags = currentTradeTags[trade.id];
        const originalTags = trade.tags || { strategyMatch: '', intent: '', marketCondition: '', confidenceLevel: '' };
        return JSON.stringify(currentTags) !== JSON.stringify(originalTags);
      })
      .map(trade => ({
        tradeId: trade.id,
        tags: currentTradeTags[trade.id]
      }));
  }

  // Reset trade tags with business logic
  resetTradeTags(trades: PanelManualTrade[]): Record<string, PanelTradeTag> {
    const originalTags: Record<string, PanelTradeTag> = {};
    trades.forEach(trade => {
      originalTags[trade.id] = trade.tags || {
        strategyMatch: '',
        intent: '',
        marketCondition: '',
        confidenceLevel: '',
      };
    });
    return originalTags;
  }

  // Get action badge with business logic
  getActionBadge(action: string): { className: string; label: string } {
    switch (action) {
      case 'buy':
        return { className: 'bg-green-100 text-green-800', label: 'Buy' };
      case 'sell':
        return { className: 'bg-red-100 text-red-800', label: 'Sell' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: action };
    }
  }

  // Calculate tag completeness with business logic
  calculateTagCompleteness(tags: PanelTradeTag): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const totalTags = 4;
    const completedTags = Object.values(tags).filter(tag => tag && tag.trim() !== '').length;
    return {
      completed: completedTags,
      total: totalTags,
      percentage: (completedTags / totalTags) * 100
    };
  }

  // Get confidence badge with business logic
  getConfidenceBadge(confidence: string): { className: string; label: string } {
    switch (confidence) {
      case 'very-high':
        return { className: 'bg-green-100 text-green-800', label: 'Very High' };
      case 'high':
        return { className: 'bg-green-100 text-green-800', label: 'High' };
      case 'medium':
        return { className: 'bg-yellow-100 text-yellow-800', label: 'Medium' };
      case 'low':
        return { className: 'bg-red-100 text-red-800', label: 'Low' };
      case 'very-low':
        return { className: 'bg-red-100 text-red-800', label: 'Very Low' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: 'Not Set' };
    }
  }

  // Calculate summary statistics with business logic
  calculateSummaryStats(
    filteredTrades: PanelManualTrade[],
    tradeTags: Record<string, PanelTradeTag>
  ): {
    total: number;
    tagged: number;
    complete: number;
  } {
    const total = filteredTrades.length;
    
    const tagged = filteredTrades.filter(trade => {
      const tags = tradeTags[trade.id];
      return tags && Object.values(tags).some(tag => tag && tag.trim() !== '');
    }).length;
    
    const complete = filteredTrades.filter(trade => {
      const tags = tradeTags[trade.id];
      return tags && Object.values(tags).every(tag => tag && tag.trim() !== '');
    }).length;

    return { total, tagged, complete };
  }

  // Initialize trade tags with business logic
  initializeTradeTags(trades: PanelManualTrade[]): Record<string, PanelTradeTag> {
    const initialTags: Record<string, PanelTradeTag> = {};
    trades.forEach(trade => {
      initialTags[trade.id] = trade.tags || {
        strategyMatch: '',
        intent: '',
        marketCondition: '',
        confidenceLevel: '',
      };
    });
    return initialTags;
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'trade_tagged' | 'trade_updated' | 'tags_saved' | 'tags_reset' | 'trade_analyzed' | 'filter_changed' | 'search_performed' | 'data_refreshed',
    tagData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-25-manual-trade-tagger',
        timestamp: new Date().toISOString(),
        userId: tagData.userId,
        vaultId: tagData.vaultId,
        data: {
          ...tagData.metadata
        }
      };

      await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      console.warn('Failed to log agent memory:', error);
    }
  }
}

// Service instance
export const manualTradeTaggerService = new ManualTradeTaggerService();

// React Query hooks
export const useTradeTaggerData = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/trading/tagger', vaultId],
    queryFn: () => manualTradeTaggerService.getTradeTaggerData(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tag, vaultId }: { tag: Omit<TradeTag, 'id' | 'createdAt' | 'usageCount'>; vaultId?: string }) => 
      manualTradeTaggerService.createTag(tag, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, vaultId }: { id: string; updates: Partial<TradeTag>; vaultId?: string }) => 
      manualTradeTaggerService.updateTag(id, updates, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      manualTradeTaggerService.deleteTag(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useTagTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tradeId, tagIds, vaultId }: { tradeId: string; tagIds: string[]; vaultId?: string }) => 
      manualTradeTaggerService.tagTrade(tradeId, tagIds, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useUntagTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tradeId, tagId, vaultId }: { tradeId: string; tagId: string; vaultId?: string }) => 
      manualTradeTaggerService.untagTrade(tradeId, tagId, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useAddTradeNotes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tradeId, notes, vaultId }: { tradeId: string; notes: string; vaultId?: string }) => 
      manualTradeTaggerService.addTradeNotes(tradeId, notes, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useCreateTaggingRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ rule, vaultId }: { rule: Omit<TaggingRule, 'id'>; vaultId?: string }) => 
      manualTradeTaggerService.createTaggingRule(rule, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
};

export const useApplyTaggingRules = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId }: { vaultId?: string }) => 
      manualTradeTaggerService.applyTaggingRules(vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/tagger'] });
    },
  });
}; 