import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface ManualTrade {
  id: string;
  timestamp: string;
  asset: string;
  assetType: 'crypto' | 'fiat' | 'stock' | 'commodity';
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  totalValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewTradeForm {
  asset: string;
  assetType: 'crypto' | 'fiat' | 'stock' | 'commodity';
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  notes: string;
}

export interface TradeFilters {
  searchTerm: string;
  assetType: string;
  action: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TradeSummaryStats {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  totalValue: number;
  totalBuyValue: number;
  totalSellValue: number;
  netValue: number;
  averageTradeSize: number;
  uniqueAssets: number;
}

export interface AssetTypeConfig {
  value: 'crypto' | 'fiat' | 'stock' | 'commodity';
  label: string;
  color: string;
  icon?: string;
}

export interface TradeActionConfig {
  value: 'buy' | 'sell';
  label: string;
  color: string;
}

export interface TradeFormState {
  data: NewTradeForm;
  isValid: boolean;
  errors: Record<string, string>;
  isDirty: boolean;
}

export interface TradeJournalState {
  isAdding: boolean;
  isEditing: boolean;
  editingTrade: ManualTrade | null;
  selectedTrades: string[];
  viewMode: 'list' | 'grid' | 'chart';
}

// ================================
// CONSTANTS
// ================================

export const ASSET_TYPES: AssetTypeConfig[] = [
  { value: 'crypto', label: 'Cryptocurrency', color: 'bg-orange-100 text-orange-800' },
  { value: 'fiat', label: 'Fiat Currency', color: 'bg-blue-100 text-blue-800' },
  { value: 'stock', label: 'Stock', color: 'bg-purple-100 text-purple-800' },
  { value: 'commodity', label: 'Commodity', color: 'bg-green-100 text-green-800' }
];

export const TRADE_ACTIONS: TradeActionConfig[] = [
  { value: 'buy', label: 'Buy', color: 'text-green-600' },
  { value: 'sell', label: 'Sell', color: 'text-red-600' }
];

export const COMMON_ASSETS = {
  crypto: ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC', 'DOT', 'LINK', 'AVAX', 'UNI', 'AAVE'],
  fiat: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD', 'CNY', 'INR'],
  stock: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'CRM', 'ADBE'],
  commodity: ['GOLD', 'SILVER', 'OIL', 'COPPER', 'WHEAT', 'CORN', 'SUGAR', 'COFFEE', 'CRUDE', 'NATGAS']
} as const;

export const QUERY_KEYS = {
  TRADES: 'user-trades',
  TRADE_SUMMARY: 'trade-summary',
  TRADE_ANALYTICS: 'trade-analytics'
} as const;

export const DEFAULT_FORM_STATE: NewTradeForm = {
  asset: '',
  assetType: 'crypto',
  action: 'buy',
  amount: 0,
  price: 0,
  notes: ''
};

export const DEFAULT_FILTERS: TradeFilters = {
  searchTerm: '',
  assetType: 'all',
  action: 'all'
};

// ================================
// MANUAL TRADE JOURNAL SERVICE CLASS
// ================================

export class ManualTradeJournalService {
  // Form Validation
  static validateTradeForm(form: NewTradeForm): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!form.asset || form.asset.trim().length === 0) {
      errors.asset = 'Asset symbol is required';
    }

    if (form.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (form.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (!form.assetType) {
      errors.assetType = 'Asset type is required';
    }

    if (!form.action) {
      errors.action = 'Trade action is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Trade Calculations
  static calculateTotalValue(amount: number, price: number): number {
    return amount * price;
  }

  static calculateTradeSummary(trades: ManualTrade[]): TradeSummaryStats {
    if (!trades.length) {
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        totalValue: 0,
        totalBuyValue: 0,
        totalSellValue: 0,
        netValue: 0,
        averageTradeSize: 0,
        uniqueAssets: 0
      };
    }

    const buyTrades = trades.filter(t => t.action === 'buy');
    const sellTrades = trades.filter(t => t.action === 'sell');
    
    const totalBuyValue = buyTrades.reduce((sum, trade) => sum + trade.totalValue, 0);
    const totalSellValue = sellTrades.reduce((sum, trade) => sum + trade.totalValue, 0);
    const totalValue = trades.reduce((sum, trade) => sum + trade.totalValue, 0);
    
    const uniqueAssets = new Set(trades.map(t => t.asset)).size;
    const averageTradeSize = totalValue / trades.length;

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalValue,
      totalBuyValue,
      totalSellValue,
      netValue: totalSellValue - totalBuyValue,
      averageTradeSize,
      uniqueAssets
    };
  }

  // Filtering and Sorting
  static filterTrades(trades: ManualTrade[], filters: TradeFilters): ManualTrade[] {
    let filtered = [...trades];

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(trade =>
        trade.asset.toLowerCase().includes(searchLower) ||
        trade.notes.toLowerCase().includes(searchLower)
      );
    }

    // Asset type filter
    if (filters.assetType !== 'all') {
      filtered = filtered.filter(trade => trade.assetType === filters.assetType);
    }

    // Action filter
    if (filters.action !== 'all') {
      filtered = filtered.filter(trade => trade.action === filters.action);
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        return tradeDate >= filters.dateRange!.start && tradeDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }

  static sortTrades(trades: ManualTrade[], sortBy: 'timestamp' | 'asset' | 'amount' | 'totalValue', order: 'asc' | 'desc' = 'desc'): ManualTrade[] {
    return [...trades].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'asset':
          comparison = a.asset.localeCompare(b.asset);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'totalValue':
          comparison = a.totalValue - b.totalValue;
          break;
        default:
          comparison = 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  // Badge Generation
  static getAssetTypeBadge(assetType: string): { label: string; className: string } {
    const config = ASSET_TYPES.find(type => type.value === assetType);
    return {
      label: config?.label || assetType,
      className: config?.color || 'bg-gray-100 text-gray-800'
    };
  }

  static getActionBadge(action: string): { label: string; className: string } {
    const config = TRADE_ACTIONS.find(a => a.value === action);
    return {
      label: config?.label || action,
      className: action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    };
  }

  // Trade Data Processing
  static prepareTradeForSubmission(form: NewTradeForm): Omit<ManualTrade, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      ...form,
      timestamp: new Date().toISOString(),
      totalValue: this.calculateTotalValue(form.amount, form.price),
      asset: form.asset.toUpperCase()
    };
  }

  // API Calls
  static async fetchTrades(): Promise<{ trades: ManualTrade[] }> {
    const response = await fetch('/api/user/trades');
    if (!response.ok) {
      throw new Error('Failed to fetch trades');
    }
    return response.json();
  }

  static async addTrade(tradeData: Omit<ManualTrade, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManualTrade> {
    const response = await fetch('/api/user/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add trade');
    }
    
    return response.json();
  }

  static async updateTrade(tradeId: string, tradeData: Partial<ManualTrade>): Promise<ManualTrade> {
    const response = await fetch(`/api/user/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update trade');
    }
    
    return response.json();
  }

  static async deleteTrade(tradeId: string): Promise<void> {
    const response = await fetch(`/api/user/trades/${tradeId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete trade');
    }
  }

  static async bulkDeleteTrades(tradeIds: string[]): Promise<void> {
    const response = await fetch('/api/user/trades/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeIds }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete trades');
    }
  }

  // Agent Memory Logging
  static async logAgentMemory(action: string, details: any): Promise<void> {
    try {
      await fetch('/api/agent/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'ManualTradeJournalPanel',
          action,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log agent memory:', error);
    }
  }

  // State Management Helpers
  static createInitialState(): TradeJournalState {
    return {
      isAdding: false,
      isEditing: false,
      editingTrade: null,
      selectedTrades: [],
      viewMode: 'list'
    };
  }

  static createInitialFormState(): TradeFormState {
    return {
      data: { ...DEFAULT_FORM_STATE },
      isValid: false,
      errors: {},
      isDirty: false
    };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useManualTrades = (enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRADES],
    queryFn: ManualTradeJournalService.fetchTrades,
    enabled,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const useAddTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ManualTradeJournalService.addTrade,
    onSuccess: (newTrade) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRADES]);
      queryClient.invalidateQueries([QUERY_KEYS.TRADE_SUMMARY]);
      ManualTradeJournalService.logAgentMemory('trade_added', {
        tradeId: newTrade.id,
        asset: newTrade.asset,
        action: newTrade.action,
        amount: newTrade.amount,
        totalValue: newTrade.totalValue,
        timestamp: new Date().toISOString()
      });
    },
    onError: (error) => {
      ManualTradeJournalService.logAgentMemory('trade_add_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useUpdateTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tradeId, tradeData }: { tradeId: string; tradeData: Partial<ManualTrade> }) =>
      ManualTradeJournalService.updateTrade(tradeId, tradeData),
    onSuccess: (updatedTrade) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRADES]);
      queryClient.invalidateQueries([QUERY_KEYS.TRADE_SUMMARY]);
      ManualTradeJournalService.logAgentMemory('trade_updated', {
        tradeId: updatedTrade.id,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useDeleteTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ManualTradeJournalService.deleteTrade,
    onSuccess: (_, tradeId) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRADES]);
      queryClient.invalidateQueries([QUERY_KEYS.TRADE_SUMMARY]);
      ManualTradeJournalService.logAgentMemory('trade_deleted', {
        tradeId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useBulkDeleteTrades = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ManualTradeJournalService.bulkDeleteTrades,
    onSuccess: (_, tradeIds) => {
      queryClient.invalidateQueries([QUERY_KEYS.TRADES]);
      queryClient.invalidateQueries([QUERY_KEYS.TRADE_SUMMARY]);
      ManualTradeJournalService.logAgentMemory('trades_bulk_deleted', {
        tradeIds,
        count: tradeIds.length,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// CUSTOM HOOKS FOR BUSINESS LOGIC
// ================================

export const useTradeFilters = () => {
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_FILTERS);

  const updateFilter = (key: keyof TradeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  };
};

export const useFilteredTrades = (trades: ManualTrade[] = [], filters: TradeFilters) => {
  return useMemo(() => {
    const filtered = ManualTradeJournalService.filterTrades(trades, filters);
    return ManualTradeJournalService.sortTrades(filtered, 'timestamp', 'desc');
  }, [trades, filters]);
};

export const useTradeSummary = (trades: ManualTrade[] = []) => {
  return useMemo(() => {
    return ManualTradeJournalService.calculateTradeSummary(trades);
  }, [trades]);
};

export const useTradeForm = (initialTrade?: ManualTrade) => {
  const [formState, setFormState] = useState<TradeFormState>(() => {
    if (initialTrade) {
      return {
        data: {
          asset: initialTrade.asset,
          assetType: initialTrade.assetType,
          action: initialTrade.action,
          amount: initialTrade.amount,
          price: initialTrade.price,
          notes: initialTrade.notes
        },
        isValid: true,
        errors: {},
        isDirty: false
      };
    }
    return ManualTradeJournalService.createInitialFormState();
  });

  const updateForm = (updates: Partial<NewTradeForm>) => {
    setFormState(prev => {
      const newData = { ...prev.data, ...updates };
      const validation = ManualTradeJournalService.validateTradeForm(newData);
      
      return {
        data: newData,
        isValid: validation.isValid,
        errors: validation.errors,
        isDirty: true
      };
    });
  };

  const resetForm = () => {
    setFormState(ManualTradeJournalService.createInitialFormState());
  };

  const prepareForSubmission = () => {
    return ManualTradeJournalService.prepareTradeForSubmission(formState.data);
  };

  return {
    formState,
    updateForm,
    resetForm,
    prepareForSubmission
  };
};

export const useTradeJournalState = () => {
  const [state, setState] = useState(() => ManualTradeJournalService.createInitialState());

  const openAddDialog = () => {
    setState(prev => ({ ...prev, isAdding: true }));
    ManualTradeJournalService.logAgentMemory('add_dialog_opened', {
      timestamp: new Date().toISOString()
    });
  };

  const closeAddDialog = () => {
    setState(prev => ({ ...prev, isAdding: false }));
  };

  const startEditing = (trade: ManualTrade) => {
    setState(prev => ({
      ...prev,
      isEditing: true,
      editingTrade: trade
    }));
    ManualTradeJournalService.logAgentMemory('edit_started', {
      tradeId: trade.id,
      timestamp: new Date().toISOString()
    });
  };

  const stopEditing = () => {
    setState(prev => ({
      ...prev,
      isEditing: false,
      editingTrade: null
    }));
  };

  const toggleTradeSelection = (tradeId: string) => {
    setState(prev => ({
      ...prev,
      selectedTrades: prev.selectedTrades.includes(tradeId)
        ? prev.selectedTrades.filter(id => id !== tradeId)
        : [...prev.selectedTrades, tradeId]
    }));
  };

  const clearSelection = () => {
    setState(prev => ({ ...prev, selectedTrades: [] }));
  };

  const setViewMode = (mode: 'list' | 'grid' | 'chart') => {
    setState(prev => ({ ...prev, viewMode: mode }));
    ManualTradeJournalService.logAgentMemory('view_mode_changed', {
      mode,
      timestamp: new Date().toISOString()
    });
  };

  return {
    state,
    openAddDialog,
    closeAddDialog,
    startEditing,
    stopEditing,
    toggleTradeSelection,
    clearSelection,
    setViewMode
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const formatTradeValue = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

export const formatTradeAmount = (amount: number, precision: number = 6): string => {
  return amount.toFixed(precision);
};

export const formatTradeDate = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

export const getCommonAssetsForType = (assetType: 'crypto' | 'fiat' | 'stock' | 'commodity'): string[] => {
  return COMMON_ASSETS[assetType] || [];
};

export const validateAssetSymbol = (symbol: string): boolean => {
  return symbol.length >= 2 && symbol.length <= 10 && /^[A-Z0-9]+$/.test(symbol);
};

export const calculateProfitLoss = (buyTrades: ManualTrade[], sellTrades: ManualTrade[], asset: string): number => {
  const assetBuys = buyTrades.filter(t => t.asset === asset);
  const assetSells = sellTrades.filter(t => t.asset === asset);
  
  const totalBought = assetBuys.reduce((sum, t) => sum + t.totalValue, 0);
  const totalSold = assetSells.reduce((sum, t) => sum + t.totalValue, 0);
  
  return totalSold - totalBought;
};

export default ManualTradeJournalService; 