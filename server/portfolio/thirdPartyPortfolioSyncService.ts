import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Third Party Portfolio Sync
export interface ThirdPartyAccount {
  id: string;
  name: string;
  provider: 'coinbase' | 'binance' | 'kraken' | 'interactive_brokers' | 'schwab' | 'robinhood' | 'custom';
  accountId: string;
  isActive: boolean;
  lastSync: string;
  syncStatus: 'connected' | 'syncing' | 'error' | 'pending';
  errorMessage?: string;
  credentials: {
    isConfigured: boolean;
    lastUpdated: string;
  };
  syncSettings: {
    autoSync: boolean;
    syncFrequency: number; // minutes
    syncAssets: boolean;
    syncTransactions: boolean;
    syncBalances: boolean;
  };
  metadata: {
    accountType: string;
    currency: string;
    totalValue?: number;
    assetCount?: number;
  };
}

export interface SyncCredentials {
  accountId: string;
  provider: string;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  accessToken?: string;
  refreshToken?: string;
  customFields?: Record<string, string>;
}

export interface SyncedAsset {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  balance: number;
  value: number;
  currency: string;
  lastUpdated: string;
  assetType: 'crypto' | 'stock' | 'bond' | 'cash' | 'other';
}

export interface SyncedTransaction {
  id: string;
  accountId: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'dividend' | 'fee';
  symbol: string;
  amount: number;
  price: number;
  fee: number;
  timestamp: string;
  description?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface SyncSummary {
  accounts: ThirdPartyAccount[];
  syncedAssets: SyncedAsset[];
  recentTransactions: SyncedTransaction[];
  totalAccounts: number;
  activeAccounts: number;
  totalValue: number;
  lastGlobalSync: string;
  syncHealth: {
    status: 'healthy' | 'degraded' | 'error';
    connectedAccounts: number;
    failedAccounts: number;
    errorMessages: string[];
  };
}

// Third Party Portfolio Sync Service Class
export class ThirdPartyPortfolioSyncService {
  private baseUrl = '/api/sync/accounts';

  // Fetch sync summary
  async getSyncSummary(vaultId?: string): Promise<SyncSummary> {
    const url = vaultId 
      ? `${this.baseUrl}/summary?vaultId=${vaultId}`
      : `${this.baseUrl}/summary`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch sync summary');
    }
    
    return response.json();
  }

  // Add new account
  async addAccount(account: Omit<ThirdPartyAccount, 'id' | 'lastSync' | 'syncStatus'>, vaultId?: string): Promise<ThirdPartyAccount> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add account');
    }
    
    return response.json();
  }

  // Update account
  async updateAccount(id: string, updates: Partial<ThirdPartyAccount>, vaultId?: string): Promise<ThirdPartyAccount> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update account');
    }
    
    return response.json();
  }

  // Delete account
  async deleteAccount(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
  }

  // Set account credentials
  async setCredentials(credentials: SyncCredentials, vaultId?: string): Promise<{ success: boolean }> {
    const url = vaultId 
      ? `${this.baseUrl}/credentials?vaultId=${vaultId}`
      : `${this.baseUrl}/credentials`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      throw new Error('Failed to set credentials');
    }
    
    return response.json();
  }

  // Test account connection
  async testConnection(accountId: string, vaultId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const url = vaultId 
      ? `${this.baseUrl}/${accountId}/test?vaultId=${vaultId}`
      : `${this.baseUrl}/${accountId}/test`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      throw new Error('Failed to test connection');
    }
    
    return response.json();
  }

  // Sync account data
  async syncAccount(accountId: string, vaultId?: string): Promise<{ success: boolean; syncedData: any }> {
    const url = vaultId 
      ? `${this.baseUrl}/${accountId}/sync?vaultId=${vaultId}`
      : `${this.baseUrl}/${accountId}/sync`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      throw new Error('Failed to sync account');
    }
    
    return response.json();
  }

  // Sync all accounts
  async syncAllAccounts(vaultId?: string): Promise<{ success: boolean; results: any[] }> {
    const url = vaultId 
      ? `${this.baseUrl}/sync-all?vaultId=${vaultId}`
      : `${this.baseUrl}/sync-all`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      throw new Error('Failed to sync all accounts');
    }
    
    return response.json();
  }

  // Get provider configuration
  getProviderConfig(provider: ThirdPartyAccount['provider']): {
    name: string;
    icon: string;
    color: string;
    requiredFields: string[];
    supportedFeatures: string[];
    documentationUrl: string;
  } {
    const configs = {
      coinbase: {
        name: 'Coinbase',
        icon: 'bitcoin',
        color: 'bg-blue-500',
        requiredFields: ['apiKey', 'apiSecret', 'passphrase'],
        supportedFeatures: ['assets', 'transactions', 'balances'],
        documentationUrl: 'https://docs.coinbase.com'
      },
      binance: {
        name: 'Binance',
        icon: 'trending-up',
        color: 'bg-yellow-500',
        requiredFields: ['apiKey', 'apiSecret'],
        supportedFeatures: ['assets', 'transactions', 'balances'],
        documentationUrl: 'https://binance-docs.github.io'
      },
      kraken: {
        name: 'Kraken',
        icon: 'activity',
        color: 'bg-purple-500',
        requiredFields: ['apiKey', 'apiSecret'],
        supportedFeatures: ['assets', 'transactions', 'balances'],
        documentationUrl: 'https://docs.kraken.com'
      },
      interactive_brokers: {
        name: 'Interactive Brokers',
        icon: 'bar-chart',
        color: 'bg-green-500',
        requiredFields: ['accessToken'],
        supportedFeatures: ['assets', 'transactions'],
        documentationUrl: 'https://interactivebrokers.github.io'
      },
      schwab: {
        name: 'Charles Schwab',
        icon: 'briefcase',
        color: 'bg-red-500',
        requiredFields: ['accessToken'],
        supportedFeatures: ['assets', 'transactions'],
        documentationUrl: 'https://developer.schwab.com'
      },
      robinhood: {
        name: 'Robinhood',
        icon: 'smartphone',
        color: 'bg-emerald-500',
        requiredFields: ['accessToken'],
        supportedFeatures: ['assets', 'transactions'],
        documentationUrl: 'https://robinhood.com/us/en/support/articles/robinhood-api'
      },
      custom: {
        name: 'Custom Provider',
        icon: 'settings',
        color: 'bg-gray-500',
        requiredFields: ['apiKey'],
        supportedFeatures: ['assets'],
        documentationUrl: ''
      }
    };
    
    return configs[provider] || configs.custom;
  }

  // Get sync status color
  getSyncStatusColor(status: ThirdPartyAccount['syncStatus']): string {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  // Get sync status background
  getSyncStatusBackground(status: ThirdPartyAccount['syncStatus']): string {
    switch (status) {
      case 'connected': return 'bg-green-50 border-green-200';
      case 'syncing': return 'bg-blue-50 border-blue-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Format currency
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
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

  // Validate account form
  validateAccountForm(account: Partial<ThirdPartyAccount>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!account.name?.trim()) {
      errors.push('Account name is required');
    }
    
    if (!account.provider) {
      errors.push('Provider is required');
    }
    
    if (!account.accountId?.trim()) {
      errors.push('Account ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate sync health score
  calculateSyncHealthScore(accounts: ThirdPartyAccount[]): number {
    if (accounts.length === 0) return 100;
    
    const connectedAccounts = accounts.filter(acc => acc.syncStatus === 'connected').length;
    const errorAccounts = accounts.filter(acc => acc.syncStatus === 'error').length;
    
    const healthScore = ((connectedAccounts / accounts.length) * 80) + 
                       (((accounts.length - errorAccounts) / accounts.length) * 20);
    
    return Math.round(healthScore);
  }

  // Get asset type distribution
  calculateAssetDistribution(assets: SyncedAsset[]): Array<{
    type: string;
    count: number;
    totalValue: number;
    percentage: number;
  }> {
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const typeGroups = assets.reduce((groups, asset) => {
      if (!groups[asset.assetType]) {
        groups[asset.assetType] = { count: 0, totalValue: 0 };
      }
      groups[asset.assetType].count++;
      groups[asset.assetType].totalValue += asset.value;
      return groups;
    }, {} as Record<string, { count: number; totalValue: number }>);
    
    return Object.entries(typeGroups).map(([type, data]) => ({
      type,
      count: data.count,
      totalValue: data.totalValue,
      percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0
    }));
  }

  // Format sync frequency
  formatSyncFrequency(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  }

  // Create default account
  createDefaultAccount(): Omit<ThirdPartyAccount, 'id' | 'lastSync' | 'syncStatus'> {
    return {
      name: '',
      provider: 'coinbase',
      accountId: '',
      isActive: true,
      errorMessage: undefined,
      credentials: {
        isConfigured: false,
        lastUpdated: new Date().toISOString()
      },
      syncSettings: {
        autoSync: true,
        syncFrequency: 60,
        syncAssets: true,
        syncTransactions: true,
        syncBalances: true
      },
      metadata: {
        accountType: 'trading',
        currency: 'USD'
      }
    };
  }

  // Filter accounts by provider
  filterAccountsByProvider(accounts: ThirdPartyAccount[], provider: string): ThirdPartyAccount[] {
    if (provider === 'all') return accounts;
    return accounts.filter(account => account.provider === provider);
  }

  // Filter accounts by status
  filterAccountsByStatus(accounts: ThirdPartyAccount[], status: string): ThirdPartyAccount[] {
    if (status === 'all') return accounts;
    return accounts.filter(account => account.syncStatus === status);
  }

  // Sort accounts
  sortAccounts(accounts: ThirdPartyAccount[], sortBy: 'name' | 'provider' | 'lastSync' | 'status', order: 'asc' | 'desc' = 'asc'): ThirdPartyAccount[] {
    return [...accounts].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'provider':
          compareValue = a.provider.localeCompare(b.provider);
          break;
        case 'lastSync':
          compareValue = new Date(a.lastSync).getTime() - new Date(b.lastSync).getTime();
          break;
        case 'status':
          compareValue = a.syncStatus.localeCompare(b.syncStatus);
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'sync_panel_viewed' | 'account_added' | 'account_updated' | 'account_deleted' | 'account_synced' | 'credentials_set' | 'connection_tested' | 'sync_all_triggered' | 'provider_selected' | 'sync_settings_changed',
    syncData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-34-third-party-portfolio-sync',
        timestamp: new Date().toISOString(),
        userId: syncData.userId,
        vaultId: syncData.vaultId,
        data: {
          ...syncData.metadata
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
export const thirdPartyPortfolioSyncService = new ThirdPartyPortfolioSyncService();

// React Query hooks
export const useSyncSummary = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/sync/accounts/summary', vaultId],
    queryFn: () => thirdPartyPortfolioSyncService.getSyncSummary(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useAddAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ account, vaultId }: { account: Omit<ThirdPartyAccount, 'id' | 'lastSync' | 'syncStatus'>; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.addAccount(account, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, vaultId }: { id: string; updates: Partial<ThirdPartyAccount>; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.updateAccount(id, updates, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.deleteAccount(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
};

export const useSetCredentials = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ credentials, vaultId }: { credentials: SyncCredentials; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.setCredentials(credentials, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
};

export const useTestConnection = () => {
  return useMutation({
    mutationFn: ({ accountId, vaultId }: { accountId: string; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.testConnection(accountId, vaultId),
  });
};

export const useSyncAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, vaultId }: { accountId: string; vaultId?: string }) => 
      thirdPartyPortfolioSyncService.syncAccount(accountId, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
};

export const useSyncAllAccounts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId }: { vaultId?: string }) => 
      thirdPartyPortfolioSyncService.syncAllAccounts(vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync/accounts/summary'] });
    },
  });
}; 