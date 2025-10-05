import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Obsidian Sync Settings
export interface ObsidianVault {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
  lastSync: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface SyncDataType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastSync: string;
  conflictCount: number;
  fileCount: number;
  path: string;
}

export interface SyncSettings {
  selectedVaultId: string;
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: 'manual' | 'local' | 'remote';
  fileNameFormat: string;
  includeMetadata: boolean;
  dataTypes: SyncDataType[];
}

export interface ObsidianSyncData {
  vaults: ObsidianVault[];
  settings: SyncSettings;
  lastSyncStatus: {
    timestamp: string;
    success: boolean;
    filesProcessed: number;
    errors: string[];
  };
}

export interface SyncSettingsState {
  tempSettings: Partial<SyncSettings>;
  isManualSyncing: boolean;
  newVaultPath: string;
  showConflicts: boolean;
}

// Obsidian Sync Settings Service Class
export class ObsidianSyncSettingsService {
  private baseUrl = '/api/obsidian/sync-settings';

  // Fetch sync settings data
  async getSyncSettings(vaultId?: string): Promise<ObsidianSyncData> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Obsidian sync settings');
    }
    
    return response.json();
  }

  // Update sync settings
  async updateSyncSettings(
    settings: Partial<SyncSettings>, 
    vaultId?: string
  ): Promise<any> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update sync settings');
    }
    
    return response.json();
  }

  // Manual sync operation
  async manualSync(vaultId?: string, dataTypes?: string[]): Promise<any> {
    const url = vaultId 
      ? `/api/obsidian/sync-manual?vaultId=${vaultId}`
      : '/api/obsidian/sync-manual';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataTypes }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to trigger manual sync');
    }
    
    return response.json();
  }

  // Add new vault
  async addVault(path: string, vaultId?: string): Promise<any> {
    const url = vaultId 
      ? `/api/obsidian/add-vault?vaultId=${vaultId}`
      : '/api/obsidian/add-vault';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add vault');
    }
    
    return response.json();
  }

  // **BUSINESS LOGIC METHODS**

  // Initialize sync settings state
  createInitialState(): SyncSettingsState {
    return {
      tempSettings: {},
      isManualSyncing: false,
      newVaultPath: '',
      showConflicts: false,
    };
  }

  // Update temp settings
  updateTempSettings(
    currentState: SyncSettingsState, 
    key: keyof SyncSettings, 
    value: any
  ): SyncSettingsState {
    return {
      ...currentState,
      tempSettings: {
        ...currentState.tempSettings,
        [key]: value,
      },
    };
  }

  // Handle data type toggle
  handleDataTypeToggle(
    currentState: SyncSettingsState,
    syncData: ObsidianSyncData,
    dataTypeId: string,
    enabled: boolean
  ): SyncSettingsState {
    const currentDataTypes = syncData.settings.dataTypes || [];
    const updatedDataTypes = currentDataTypes.map(dt => 
      dt.id === dataTypeId ? { ...dt, enabled } : dt
    );
    
    return {
      ...currentState,
      tempSettings: {
        ...currentState.tempSettings,
        dataTypes: updatedDataTypes,
      },
    };
  }

  // Set manual syncing state
  setManualSyncing(currentState: SyncSettingsState, isManualSyncing: boolean): SyncSettingsState {
    return { ...currentState, isManualSyncing };
  }

  // Update new vault path
  updateNewVaultPath(currentState: SyncSettingsState, newVaultPath: string): SyncSettingsState {
    return { ...currentState, newVaultPath };
  }

  // Clear new vault path
  clearNewVaultPath(currentState: SyncSettingsState): SyncSettingsState {
    return { ...currentState, newVaultPath: '' };
  }

  // Clear temp settings
  clearTempSettings(currentState: SyncSettingsState): SyncSettingsState {
    return { ...currentState, tempSettings: {} };
  }

  // Toggle conflicts view
  toggleConflictsView(currentState: SyncSettingsState): SyncSettingsState {
    return { ...currentState, showConflicts: !currentState.showConflicts };
  }

  // Get current settings (with temp overrides)
  getCurrentSettings(syncData: ObsidianSyncData, tempSettings: Partial<SyncSettings>): SyncSettings {
    return {
      ...syncData.settings,
      ...tempSettings,
    };
  }

  // Get selected vault
  getSelectedVault(vaults: ObsidianVault[], selectedVaultId: string): ObsidianVault | null {
    return vaults.find(v => v.id === selectedVaultId) || null;
  }

  // Check if has unsaved changes
  hasUnsavedChanges(tempSettings: Partial<SyncSettings>): boolean {
    return Object.keys(tempSettings).length > 0;
  }

  // Get status badge data
  getStatusBadge(status: string): { className: string; label: string } {
    switch (status) {
      case 'connected':
        return { className: 'bg-green-100 text-green-800', label: 'Connected' };
      case 'disconnected':
        return { className: 'bg-gray-100 text-gray-800', label: 'Disconnected' };
      case 'error':
        return { className: 'bg-red-100 text-red-800', label: 'Error' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  }

  // Get data type icon name
  getDataTypeIcon(dataType: SyncDataType): string {
    switch (dataType.id) {
      case 'trades':
        return 'BarChart3';
      case 'tags':
        return 'Tag';
      case 'logs':
        return 'FileText';
      case 'overlays':
        return 'Database';
      default:
        return 'FileText';
    }
  }

  // Format timestamp
  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  // Validate vault path
  validateVaultPath(path: string): { isValid: boolean; error?: string } {
    const trimmedPath = path.trim();
    
    if (!trimmedPath) {
      return { isValid: false, error: 'Path cannot be empty' };
    }
    
    if (trimmedPath.length < 3) {
      return { isValid: false, error: 'Path too short' };
    }
    
    // Basic path validation
    if (!/^[a-zA-Z0-9\-_\/\\.:]+$/.test(trimmedPath)) {
      return { isValid: false, error: 'Invalid characters in path' };
    }
    
    return { isValid: true };
  }

  // Generate file path preview
  generateFilePathPreview(
    vaultPath: string, 
    fileNameFormat: string
  ): { [key: string]: string } {
    const formatFile = (type: string, extension: string = 'md') => {
      const filename = fileNameFormat
        .replace('{type}', type)
        .replace('{date}', '2024-01-15');
      return `${vaultPath}/${type}s/SM_${filename}.${extension}`;
    };
    
    return {
      trades: formatFile('trade'),
      tags: formatFile('tag'),
      logs: formatFile('log'),
      overlays: formatFile('overlay'),
    };
  }

  // Calculate sync statistics
  calculateSyncStats(dataTypes: SyncDataType[]): {
    totalFiles: number;
    totalConflicts: number;
    enabledTypes: number;
    lastSyncedTypes: number;
  } {
    const enabledTypes = dataTypes.filter(dt => dt.enabled);
    
    return {
      totalFiles: enabledTypes.reduce((sum, dt) => sum + dt.fileCount, 0),
      totalConflicts: enabledTypes.reduce((sum, dt) => sum + dt.conflictCount, 0),
      enabledTypes: enabledTypes.length,
      lastSyncedTypes: enabledTypes.filter(dt => dt.lastSync).length,
    };
  }

  // Get sync health status
  getSyncHealthStatus(
    lastSyncStatus: ObsidianSyncData['lastSyncStatus'],
    dataTypes: SyncDataType[]
  ): 'healthy' | 'warning' | 'error' {
    const stats = this.calculateSyncStats(dataTypes);
    
    if (!lastSyncStatus.success || stats.totalConflicts > 5) {
      return 'error';
    }
    
    if (stats.totalConflicts > 0 || stats.lastSyncedTypes < stats.enabledTypes) {
      return 'warning';
    }
    
    return 'healthy';
  }

  // Get conflict resolution strategy description
  getConflictResolutionDescription(strategy: string): string {
    switch (strategy) {
      case 'manual':
        return 'Prompt you to resolve each conflict manually';
      case 'local':
        return 'Always keep the local (StackMotive) version';
      case 'remote':
        return 'Always keep the remote (Obsidian) version';
      default:
        return 'Unknown strategy';
    }
  }

  // Validate sync interval
  validateSyncInterval(interval: number): { isValid: boolean; error?: string } {
    if (interval < 1) {
      return { isValid: false, error: 'Interval must be at least 1 minute' };
    }
    
    if (interval > 60) {
      return { isValid: false, error: 'Interval cannot exceed 60 minutes' };
    }
    
    return { isValid: true };
  }

  // Get default file name format
  getDefaultFileNameFormat(): string {
    return 'SM_{type}_{date}';
  }

  // Check if vault needs attention
  vaultNeedsAttention(vault: ObsidianVault, lastSyncStatus: ObsidianSyncData['lastSyncStatus']): boolean {
    return (
      vault.status === 'error' ||
      !lastSyncStatus.success ||
      lastSyncStatus.errors.length > 0
    );
  }

  // Get vault attention level
  getVaultAttentionLevel(vault: ObsidianVault, lastSyncStatus: ObsidianSyncData['lastSyncStatus']): 'none' | 'low' | 'medium' | 'high' {
    if (vault.status === 'error' || lastSyncStatus.errors.length > 3) return 'high';
    if (vault.status === 'disconnected' || !lastSyncStatus.success) return 'medium';
    if (lastSyncStatus.errors.length > 0) return 'low';
    return 'none';
  }

  // Get sync frequency recommendation
  getSyncFrequencyRecommendation(totalFiles: number): number {
    if (totalFiles > 1000) return 30; // 30 minutes for large vaults
    if (totalFiles > 500) return 15;  // 15 minutes for medium vaults
    return 5; // 5 minutes for small vaults
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'settings_viewed' | 'settings_updated' | 'vault_added' | 'vault_selected' | 'manual_sync_triggered' | 'data_type_toggled' | 'conflicts_viewed',
    settingsData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-33-obsidian-sync-settings',
        timestamp: new Date().toISOString(),
        userId: settingsData.userId,
        vaultId: settingsData.vaultId,
        data: {
          ...settingsData.metadata
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
export const obsidianSyncSettingsService = new ObsidianSyncSettingsService();

// React Query hooks
export const useObsidianSyncSettings = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/obsidian/sync-settings', vaultId],
    queryFn: () => obsidianSyncSettingsService.getSyncSettings(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useUpdateSyncSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ settings, vaultId }: {
      settings: Partial<SyncSettings>;
      vaultId?: string;
    }) => obsidianSyncSettingsService.updateSyncSettings(settings, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/obsidian/sync-settings'] });
    },
  });
};

export const useManualSync = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId, dataTypes }: {
      vaultId?: string;
      dataTypes?: string[];
    }) => obsidianSyncSettingsService.manualSync(vaultId, dataTypes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/obsidian/sync-settings'] });
    },
  });
};

export const useAddVault = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ path, vaultId }: { path: string; vaultId?: string }) =>
      obsidianSyncSettingsService.addVault(path, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/obsidian/sync-settings'] });
    },
  });
}; 