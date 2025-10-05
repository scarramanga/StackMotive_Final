import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Trade List
export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  timestamp: string;
  strategy?: string;
  notes?: string;
  pnl?: number;
  executionType: 'market' | 'limit' | 'stop' | 'stop_limit';
  triggerPrice?: number;
  expiryTime?: string;
}

export interface TradeFilters {
  symbol?: string;
  side?: 'buy' | 'sell';
  status?: string;
  strategy?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface TradeListResponse {
  trades: Trade[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
    totalPnL: number;
    winRate: number;
    avgTradeSize: number;
  };
}

export interface TradeStats {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalPnL: number;
  winRate: number;
  avgTradeSize: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  tradingFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Trade List Service Class
export class TradeListService {
  private baseUrl = '/api/trading';

  // Fetch trade list
  async getTrades(
    vaultId?: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: TradeFilters
  ): Promise<TradeListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(vaultId && { vaultId }),
      ...(filters && this.buildFilterParams(filters))
    });
    
    const response = await fetch(`${this.baseUrl}/trades?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch trades');
    }
    
    return response.json();
  }

  // Cancel trade
  async cancelTrade(tradeId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/trades/${tradeId}/cancel`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel trade');
    }
    
    return response.json();
  }

  // Modify trade
  async modifyTrade(tradeId: string, updates: Partial<Trade>): Promise<Trade> {
    const response = await fetch(`${this.baseUrl}/trades/${tradeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to modify trade');
    }
    
    return response.json();
  }

  // Build filter parameters
  private buildFilterParams(filters: TradeFilters): Record<string, string> {
    const params: Record<string, string> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value.toString();
      }
    });
    
    return params;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Get trade status color
  getTradeStatusColor(status: Trade['status']): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get trade status background
  getTradeStatusBackground(status: Trade['status']): string {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'cancelled': return 'bg-gray-50 border-gray-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get trade side color
  getTradeSideColor(side: Trade['side']): string {
    return side === 'buy' ? 'text-green-600' : 'text-red-600';
  }

  // Get P&L color
  getPnLColor(pnl: number): string {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Format trade size
  formatTradeSize(quantity: number, symbol: string): string {
    return `${quantity.toFixed(8)} ${symbol}`;
  }

  // Format execution type
  formatExecutionType(type: Trade['executionType']): string {
    switch (type) {
      case 'market': return 'Market';
      case 'limit': return 'Limit';
      case 'stop': return 'Stop';
      case 'stop_limit': return 'Stop Limit';
      default: return 'Unknown';
    }
  }

  // Calculate trade statistics
  calculateTradeStats(trades: Trade[]): TradeStats {
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + trade.total, 0);
    const totalFees = trades.reduce((sum, trade) => sum + trade.fee, 0);
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    const completedTrades = trades.filter(t => t.status === 'completed');
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
    
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    const bestTrade = trades.reduce((best, trade) => 
      (trade.pnl || 0) > (best?.pnl || -Infinity) ? trade : best, null as Trade | null
    );
    
    const worstTrade = trades.reduce((worst, trade) => 
      (trade.pnl || 0) < (worst?.pnl || Infinity) ? trade : worst, null as Trade | null
    );
    
    return {
      totalTrades,
      totalVolume,
      totalFees,
      totalPnL,
      winRate,
      avgTradeSize,
      bestTrade,
      worstTrade,
      tradingFrequency: {
        daily: this.calculateTradingFrequency(trades, 'daily'),
        weekly: this.calculateTradingFrequency(trades, 'weekly'),
        monthly: this.calculateTradingFrequency(trades, 'monthly')
      }
    };
  }

  // Calculate trading frequency
  private calculateTradingFrequency(trades: Trade[], period: 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    return trades.filter(trade => new Date(trade.timestamp) >= startDate).length;
  }

  // Sort trades by date
  sortTradesByDate(trades: Trade[], order: 'asc' | 'desc' = 'desc'): Trade[] {
    return [...trades].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }

  // Sort trades by P&L
  sortTradesByPnL(trades: Trade[], order: 'asc' | 'desc' = 'desc'): Trade[] {
    return [...trades].sort((a, b) => {
      const pnlA = a.pnl || 0;
      const pnlB = b.pnl || 0;
      return order === 'desc' ? pnlB - pnlA : pnlA - pnlB;
    });
  }

  // Sort trades by size
  sortTradesBySize(trades: Trade[], order: 'asc' | 'desc' = 'desc'): Trade[] {
    return [...trades].sort((a, b) => 
      order === 'desc' ? b.total - a.total : a.total - b.total
    );
  }

  // Filter trades by date range
  filterTradesByDateRange(trades: Trade[], startDate: string, endDate: string): Trade[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return trades.filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      return tradeDate >= start && tradeDate <= end;
    });
  }

  // Filter trades by symbol
  filterTradesBySymbol(trades: Trade[], symbol: string): Trade[] {
    return trades.filter(trade => 
      trade.symbol.toLowerCase().includes(symbol.toLowerCase())
    );
  }

  // Filter trades by side
  filterTradesBySide(trades: Trade[], side: Trade['side']): Trade[] {
    return trades.filter(trade => trade.side === side);
  }

  // Filter trades by status
  filterTradesByStatus(trades: Trade[], status: Trade['status']): Trade[] {
    return trades.filter(trade => trade.status === status);
  }

  // Get unique symbols
  getUniqueSymbols(trades: Trade[]): string[] {
    return [...new Set(trades.map(trade => trade.symbol))];
  }

  // Get unique strategies
  getUniqueStrategies(trades: Trade[]): string[] {
    return [...new Set(trades.map(trade => trade.strategy).filter((strategy): strategy is string => Boolean(strategy)))];
  }

  // Format relative time
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const tradeDate = new Date(timestamp);
    const diffMs = now.getTime() - tradeDate.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return tradeDate.toLocaleDateString();
    }
  }

  // Validate trade data
  validateTrade(trade: Partial<Trade>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!trade.symbol) errors.push('Symbol is required');
    if (!trade.side) errors.push('Side is required');
    if (!trade.quantity || trade.quantity <= 0) errors.push('Quantity must be positive');
    if (!trade.price || trade.price <= 0) errors.push('Price must be positive');
    if (!trade.executionType) errors.push('Execution type is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Service instance
export const tradeListService = new TradeListService();

// React Query hooks
export const useTrades = (vaultId?: string, user?: any, page: number = 1, filters?: TradeFilters) => {
  return useQuery({
    queryKey: ['/api/trading/trades', vaultId, page, filters],
    queryFn: () => tradeListService.getTrades(vaultId, page, 20, filters),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useCancelTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: tradeListService.cancelTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/trades'] });
    },
  });
};

export const useModifyTrade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tradeId, updates }: { tradeId: string; updates: Partial<Trade> }) => 
      tradeListService.modifyTrade(tradeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading/trades'] });
    },
  });
}; 