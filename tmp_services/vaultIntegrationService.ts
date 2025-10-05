import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Vault Integration
export interface VaultExportType {
  id: 'snapshot_json' | 'strategy_config' | 'notes';
  name: string;
  description: string;
  fileExtension: string;
  mimeType: string;
}

export interface VaultConnectionMethod {
  id: 'local_filesystem' | 'obsidian_api' | 'webdav';
  name: string;
  description: string;
  requiresAuth: boolean;
  supportedFormats: string[];
}

export interface VaultConfiguration {
  id: string;
  name: string;
  method: VaultConnectionMethod['id'];
  settings: {
    localPath?: string;
    apiUrl?: string;
    apiKey?: string;
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
    defaultFolder?: string;
    autoSync?: boolean;
  };
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRequest {
  vaultId: string;
  exportType: VaultExportType['id'];
  fileName?: string;
  includeMetadata: boolean;
  customPath?: string;
}

export interface ExportHistory {
  id: string;
  vaultId: string;
  exportType: VaultExportType['id'];
  fileName: string;
  filePath: string;
  fileSize: number;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  exportedAt: string;
  metadata: {
    dataRange?: { start: string; end: string };
    recordCount?: number;
    compressionUsed?: boolean;
    customSettings?: Record<string, any>;
  };
}

export interface VaultSyncStatus {
  isConnected: boolean;
  lastSync: string;
  totalExports: number;
  failedExports: number;
  pendingExports: number;
  storageUsed: number;
  connectionHealth: 'healthy' | 'warning' | 'error';
  lastError?: string;
}

export interface SnapshotData {
  timestamp: string;
  portfolioValue: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    value: number;
    allocation: number;
  }>;
  performance: {
    totalReturn: number;
    todayChange: number;
    weekChange: number;
    monthChange: number;
  };
  metadata: {
    vaultId: string;
    snapshotType: 'manual' | 'scheduled' | 'rebalance';
    tags?: string[];
  };
}

export interface StrategyConfig {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, any>;
  overlays: Array<{
    id: string;
    name: string;
    weight: number;
    settings: Record<string, any>;
  }>;
  riskSettings: {
    maxDrawdown: number;
    positionSize: number;
    rebalanceFrequency: string;
  };
  backtest: {
    startDate: string;
    endDate: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserNotes {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: 'strategy' | 'analysis' | 'research' | 'journal' | 'other';
  linkedAssets?: string[];
  linkedStrategies?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultDashboardData {
  configurations: VaultConfiguration[];
  recentExports: ExportHistory[];
  syncStatus: VaultSyncStatus;
  exportTypes: VaultExportType[];
  connectionMethods: VaultConnectionMethod[];
  storageStats: {
    totalExports: number;
    totalSize: number;
    averageExportSize: number;
    exportsByType: Record<string, number>;
  };
}

// Vault Integration Service Class
export class VaultIntegrationService {
  private baseUrl = '/api/vault/integration';

  // Get vault dashboard data
  async getVaultDashboard(userId: string): Promise<VaultDashboardData> {
    const response = await fetch(`${this.baseUrl}/dashboard?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch vault dashboard data');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('vault_dashboard_loaded', {
      userId,
      configurationCount: result.configurations.length,
      recentExportCount: result.recentExports.length,
      connectionHealth: result.syncStatus.connectionHealth,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Create vault configuration
  async createVaultConfiguration(config: Omit<VaultConfiguration, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<VaultConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create vault configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('vault_configuration_created', {
      userId,
      configurationId: result.id,
      configurationName: result.name,
      method: result.method,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Update vault configuration
  async updateVaultConfiguration(id: string, updates: Partial<VaultConfiguration>, userId: string): Promise<VaultConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update vault configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('vault_configuration_updated', {
      userId,
      configurationId: id,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Delete vault configuration
  async deleteVaultConfiguration(id: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/configurations/${id}?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete vault configuration');
    }

    // Log agent memory
    await this.logAgentMemory('vault_configuration_deleted', {
      userId,
      configurationId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Test vault connection
  async testVaultConnection(configId: string, userId: string): Promise<{ success: boolean; message: string; latency?: number }> {
    const response = await fetch(`${this.baseUrl}/configurations/${configId}/test?userId=${userId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to test vault connection');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('vault_connection_tested', {
      userId,
      configurationId: configId,
      success: result.success,
      latency: result.latency,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Export data to vault
  async exportToVault(request: ExportRequest, userId: string): Promise<ExportHistory> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to export to vault');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('vault_export_initiated', {
      userId,
      vaultId: request.vaultId,
      exportType: request.exportType,
      fileName: request.fileName || 'auto-generated',
      includeMetadata: request.includeMetadata,
      exportId: result.id,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get export history
  async getExportHistory(userId: string, limit: number = 50): Promise<ExportHistory[]> {
    const response = await fetch(`${this.baseUrl}/exports?userId=${userId}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch export history');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('export_history_loaded', {
      userId,
      exportCount: result.length,
      limit,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get snapshot data for export
  async getSnapshotData(userId: string, vaultId: string): Promise<SnapshotData> {
    const response = await fetch(`${this.baseUrl}/data/snapshot?userId=${userId}&vaultId=${vaultId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch snapshot data');
    }

    return response.json();
  }

  // Get strategy configuration for export
  async getStrategyConfig(userId: string, strategyId: string): Promise<StrategyConfig> {
    const response = await fetch(`${this.baseUrl}/data/strategy?userId=${userId}&strategyId=${strategyId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch strategy configuration');
    }

    return response.json();
  }

  // Get user notes for export
  async getUserNotes(userId: string, category?: string): Promise<UserNotes[]> {
    const params = new URLSearchParams({ userId });
    if (category) params.append('category', category);

    const response = await fetch(`${this.baseUrl}/data/notes?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user notes');
    }

    return response.json();
  }

  // Utility Methods
  getExportTypes(): VaultExportType[] {
    return [
      {
        id: 'snapshot_json',
        name: 'Portfolio Snapshot',
        description: 'Complete portfolio holdings and performance data',
        fileExtension: '.json',
        mimeType: 'application/json'
      },
      {
        id: 'strategy_config',
        name: 'Strategy Configuration',
        description: 'Strategy settings, overlays, and backtest results',
        fileExtension: '.json',
        mimeType: 'application/json'
      },
      {
        id: 'notes',
        name: 'User Notes',
        description: 'Research notes, analysis, and journal entries',
        fileExtension: '.md',
        mimeType: 'text/markdown'
      }
    ];
  }

  getConnectionMethods(): VaultConnectionMethod[] {
    return [
      {
        id: 'local_filesystem',
        name: 'Local Filesystem',
        description: 'Save files directly to local computer (Electron app)',
        requiresAuth: false,
        supportedFormats: ['json', 'md', 'csv']
      },
      {
        id: 'obsidian_api',
        name: 'Obsidian API',
        description: 'Sync directly with Obsidian vault via API',
        requiresAuth: true,
        supportedFormats: ['md', 'json']
      },
      {
        id: 'webdav',
        name: 'WebDAV',
        description: 'Upload to WebDAV-compatible cloud storage',
        requiresAuth: true,
        supportedFormats: ['json', 'md', 'csv']
      }
    ];
  }

  // Validation Methods
  validateVaultConfiguration(config: Partial<VaultConfiguration>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name?.trim()) {
      errors.push('Vault name is required');
    }

    if (!config.method) {
      errors.push('Connection method is required');
    }

    if (config.method === 'local_filesystem' && !config.settings?.localPath?.trim()) {
      errors.push('Local path is required for filesystem method');
    }

    if (config.method === 'obsidian_api') {
      if (!config.settings?.apiUrl?.trim()) {
        errors.push('API URL is required for Obsidian API method');
      }
      if (!config.settings?.apiKey?.trim()) {
        errors.push('API key is required for Obsidian API method');
      }
    }

    if (config.method === 'webdav') {
      if (!config.settings?.webdavUrl?.trim()) {
        errors.push('WebDAV URL is required');
      }
      if (!config.settings?.webdavUsername?.trim()) {
        errors.push('WebDAV username is required');
      }
      if (!config.settings?.webdavPassword?.trim()) {
        errors.push('WebDAV password is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateExportRequest(request: ExportRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.vaultId?.trim()) {
      errors.push('Vault configuration is required');
    }

    if (!request.exportType) {
      errors.push('Export type is required');
    }

    const validExportTypes = this.getExportTypes().map(t => t.id);
    if (request.exportType && !validExportTypes.includes(request.exportType)) {
      errors.push('Invalid export type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Status and Formatting Methods
  getConnectionStatusColor(health: VaultSyncStatus['connectionHealth']): string {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getConnectionStatusBackground(health: VaultSyncStatus['connectionHealth']): string {
    switch (health) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getExportStatusColor(status: ExportHistory['status']): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getMethodIcon(method: VaultConnectionMethod['id']): string {
    switch (method) {
      case 'local_filesystem': return 'folder';
      case 'obsidian_api': return 'link';
      case 'webdav': return 'cloud';
      default: return 'settings';
    }
  }

  getExportTypeIcon(type: VaultExportType['id']): string {
    switch (type) {
      case 'snapshot_json': return 'camera';
      case 'strategy_config': return 'settings';
      case 'notes': return 'file-text';
      default: return 'download';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  generateFileName(exportType: VaultExportType['id'], customName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const prefix = customName || 'export';
    
    switch (exportType) {
      case 'snapshot_json':
        return `${prefix}-snapshot-${timestamp}.json`;
      case 'strategy_config':
        return `${prefix}-strategy-${timestamp}.json`;
      case 'notes':
        return `${prefix}-notes-${timestamp}.md`;
      default:
        return `${prefix}-${timestamp}.json`;
    }
  }

  createDefaultConfiguration(): Omit<VaultConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: '',
      method: 'local_filesystem',
      settings: {
        localPath: '',
        defaultFolder: 'StackMotive',
        autoSync: false
      },
      isActive: true
    };
  }

  createDefaultExportRequest(vaultId: string): ExportRequest {
    return {
      vaultId,
      exportType: 'snapshot_json',
      includeMetadata: true
    };
  }

  // Business Logic Methods
  async handleConfigurationSubmit(
    config: Omit<VaultConfiguration, 'id' | 'createdAt' | 'updatedAt'>,
    editingId: string | null,
    userId: string
  ): Promise<{ success: boolean; error?: string; result?: VaultConfiguration }> {
    try {
      const validation = this.validateVaultConfiguration(config);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      let result: VaultConfiguration;
      if (editingId) {
        result = await this.updateVaultConfiguration(editingId, config, userId);
      } else {
        result = await this.createVaultConfiguration(config, userId);
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleExportSubmit(
    request: ExportRequest,
    userId: string
  ): Promise<{ success: boolean; error?: string; result?: ExportHistory }> {
    try {
      const validation = this.validateExportRequest(request);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const result = await this.exportToVault(request, userId);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleConnectionTest(
    configId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; message?: string; latency?: number }> {
    try {
      const result = await this.testVaultConnection(configId, userId);
      return { 
        success: result.success, 
        message: result.message,
        latency: result.latency,
        error: result.success ? undefined : result.message
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection test failed' };
    }
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
          blockId: 'block-24-vault-integration',
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
export const vaultIntegrationService = new VaultIntegrationService();

// React Query hooks
export const useVaultDashboard = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/vault/integration/dashboard', userId],
    queryFn: () => vaultIntegrationService.getVaultDashboard(userId!),
    enabled: !!userId,
    refetchInterval: 300000, // 5 minutes
  });
};

export const useCreateVaultConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ config, userId }: { config: Omit<VaultConfiguration, 'id' | 'createdAt' | 'updatedAt'>; userId: string }) =>
      vaultIntegrationService.createVaultConfiguration(config, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/integration/dashboard'] });
    },
  });
};

export const useUpdateVaultConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, userId }: { id: string; updates: Partial<VaultConfiguration>; userId: string }) =>
      vaultIntegrationService.updateVaultConfiguration(id, updates, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/integration/dashboard'] });
    },
  });
};

export const useDeleteVaultConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      vaultIntegrationService.deleteVaultConfiguration(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/integration/dashboard'] });
    },
  });
};

export const useTestVaultConnection = () => {
  return useMutation({
    mutationFn: ({ configId, userId }: { configId: string; userId: string }) =>
      vaultIntegrationService.testVaultConnection(configId, userId),
  });
};

export const useExportToVault = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ request, userId }: { request: ExportRequest; userId: string }) =>
      vaultIntegrationService.exportToVault(request, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/integration/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vault/integration/exports'] });
    },
  });
};

export const useExportHistory = (userId?: string) => {
  return useQuery({
    queryKey: ['/api/vault/integration/exports', userId],
    queryFn: () => vaultIntegrationService.getExportHistory(userId!),
    enabled: !!userId,
    refetchInterval: 60000, // 1 minute
  });
}; 