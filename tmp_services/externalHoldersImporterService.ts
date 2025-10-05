import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for External Holdings Importer
export interface ExternalAsset {
  id: string;
  label: string;
  type: 'crypto' | 'stocks' | 'bonds' | 'cash' | 'real_estate' | 'commodities' | 'other';
  value: number;
  currency: string;
  snapshotDate: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExternalAssetInput {
  label: string;
  type: 'crypto' | 'stocks' | 'bonds' | 'cash' | 'real_estate' | 'commodities' | 'other';
  value: number;
  currency: string;
  snapshotDate: string;
  notes: string;
  tags: string[];
}

export interface ValueSnapshot {
  date: string;
  value: number;
}

export interface ExternalAssetsData {
  assets: ExternalAsset[];
  totalValue: number;
  totalAssets: number;
  valueHistory: ValueSnapshot[];
  availableTags: string[];
  assetTypes: Array<{
    id: string;
    name: string;
    count: number;
    totalValue: number;
  }>;
}

export interface AssetFilters {
  type: string;
  tag: string;
}

// External Holdings Importer Service Class
export class ExternalHoldersImporterService {
  private baseUrl = '/api/user/external-assets';

  // Fetch external assets data
  async getExternalAssets(vaultId?: string): Promise<ExternalAssetsData> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch external assets');
    }
    
    return response.json();
  }

  // Add new external asset
  async addExternalAsset(asset: ExternalAssetInput, vaultId?: string): Promise<ExternalAsset> {
    const url = vaultId 
      ? `${this.baseUrl}?vaultId=${vaultId}`
      : this.baseUrl;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add external asset');
    }
    
    return response.json();
  }

  // Update existing external asset
  async updateExternalAsset(id: string, asset: Partial<ExternalAssetInput>, vaultId?: string): Promise<ExternalAsset> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update external asset');
    }
    
    return response.json();
  }

  // Delete external asset
  async deleteExternalAsset(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error('Failed to delete external asset');
    }
  }

  // Export assets to file
  async exportAssets(format: 'json' | 'csv', vaultId?: string): Promise<Blob> {
    const url = vaultId 
      ? `${this.baseUrl}/export?format=${format}&vaultId=${vaultId}`
      : `${this.baseUrl}/export?format=${format}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to export ${format.toUpperCase()}`);
    }
    
    return response.blob();
  }

  // Import assets from file
  async importAssets(file: File, vaultId?: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = vaultId 
      ? `${this.baseUrl}/import?vaultId=${vaultId}`
      : `${this.baseUrl}/import`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to import assets');
    }
  }

  // Create default asset form
  createDefaultAssetForm(): ExternalAssetInput {
    return {
      label: '',
      type: 'crypto',
      value: 0,
      currency: 'USD',
      snapshotDate: new Date().toISOString().split('T')[0],
      notes: '',
      tags: [],
    };
  }

  // Validate asset form
  validateAssetForm(form: ExternalAssetInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!form.label.trim()) {
      errors.push('Asset label is required');
    }
    
    if (form.value <= 0) {
      errors.push('Asset value must be greater than 0');
    }
    
    if (!form.snapshotDate) {
      errors.push('Snapshot date is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Filter assets by type and tag
  filterAssets(assets: ExternalAsset[], filters: AssetFilters): ExternalAsset[] {
    return assets.filter(asset => {
      const typeMatch = filters.type === 'all' || asset.type === filters.type;
      const tagMatch = filters.tag === 'all' || asset.tags.includes(filters.tag);
      return typeMatch && tagMatch;
    });
  }

  // Sort assets by various criteria
  sortAssets(assets: ExternalAsset[], sortBy: 'label' | 'value' | 'date' | 'type', order: 'asc' | 'desc' = 'desc'): ExternalAsset[] {
    return [...assets].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'label':
          compareValue = a.label.localeCompare(b.label);
          break;
        case 'value':
          compareValue = a.value - b.value;
          break;
        case 'date':
          compareValue = new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime();
          break;
        case 'type':
          compareValue = a.type.localeCompare(b.type);
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get type badge styling
  getTypeBadgeClass(type: ExternalAsset['type']): string {
    const typeColors = {
      crypto: 'bg-orange-100 text-orange-800',
      stocks: 'bg-blue-100 text-blue-800',
      bonds: 'bg-green-100 text-green-800',
      cash: 'bg-gray-100 text-gray-800',
      real_estate: 'bg-purple-100 text-purple-800',
      commodities: 'bg-yellow-100 text-yellow-800',
      other: 'bg-pink-100 text-pink-800',
    };
    
    return typeColors[type] || typeColors.other;
  }

  // Format currency value
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  }

  // Format date
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  // Format relative date
  formatRelativeDate(date: string): string {
    const now = new Date();
    const assetDate = new Date(date);
    const diffMs = now.getTime() - assetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  // Calculate asset type distribution
  calculateTypeDistribution(assets: ExternalAsset[]): Array<{
    type: string;
    count: number;
    totalValue: number;
    percentage: number;
  }> {
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const typeGroups = assets.reduce((groups, asset) => {
      if (!groups[asset.type]) {
        groups[asset.type] = { count: 0, totalValue: 0 };
      }
      groups[asset.type].count++;
      groups[asset.type].totalValue += asset.value;
      return groups;
    }, {} as Record<string, { count: number; totalValue: number }>);
    
    return Object.entries(typeGroups).map(([type, data]) => ({
      type,
      count: data.count,
      totalValue: data.totalValue,
      percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0
    }));
  }

  // Calculate portfolio diversification score
  calculateDiversificationScore(assets: ExternalAsset[]): number {
    const typeDistribution = this.calculateTypeDistribution(assets);
    const typeCount = typeDistribution.length;
    
    // Calculate concentration (Herfindahl index)
    const concentration = typeDistribution.reduce((sum, item) => {
      const weight = item.percentage / 100;
      return sum + (weight * weight);
    }, 0);
    
    // Diversification score (inverse of concentration, adjusted for type count)
    const diversificationIndex = (1 - concentration) * Math.min(typeCount / 6, 1);
    return Math.round(diversificationIndex * 100);
  }

  // Get asset performance color
  getPerformanceColor(value: number, benchmark?: number): string {
    if (!benchmark) return 'text-gray-600';
    
    const performance = ((value - benchmark) / benchmark) * 100;
    
    if (performance > 5) return 'text-green-600';
    if (performance > 0) return 'text-green-500';
    if (performance > -5) return 'text-yellow-600';
    return 'text-red-600';
  }

  // Generate summary statistics
  generateSummaryStats(assets: ExternalAsset[]): {
    totalValue: number;
    totalAssets: number;
    avgAssetValue: number;
    largestAsset: ExternalAsset | null;
    smallestAsset: ExternalAsset | null;
    newestAsset: ExternalAsset | null;
    oldestAsset: ExternalAsset | null;
    diversificationScore: number;
  } {
    if (assets.length === 0) {
      return {
        totalValue: 0,
        totalAssets: 0,
        avgAssetValue: 0,
        largestAsset: null,
        smallestAsset: null,
        newestAsset: null,
        oldestAsset: null,
        diversificationScore: 0
      };
    }
    
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const avgAssetValue = totalValue / assets.length;
    
    const largestAsset = assets.reduce((largest, asset) => 
      asset.value > (largest?.value || 0) ? asset : largest, null as ExternalAsset | null
    );
    
    const smallestAsset = assets.reduce((smallest, asset) => 
      asset.value < (smallest?.value || Infinity) ? asset : smallest, null as ExternalAsset | null
    );
    
    const newestAsset = assets.reduce((newest, asset) => 
      new Date(asset.snapshotDate) > new Date(newest?.snapshotDate || '1970-01-01') ? asset : newest, null as ExternalAsset | null
    );
    
    const oldestAsset = assets.reduce((oldest, asset) => 
      new Date(asset.snapshotDate) < new Date(oldest?.snapshotDate || '2100-01-01') ? asset : oldest, null as ExternalAsset | null
    );
    
    const diversificationScore = this.calculateDiversificationScore(assets);
    
    return {
      totalValue,
      totalAssets: assets.length,
      avgAssetValue,
      largestAsset,
      smallestAsset,
      newestAsset,
      oldestAsset,
      diversificationScore
    };
  }

  // Handle tag operations
  addTagToAsset(tags: string[], newTag: string): string[] {
    if (newTag && !tags.includes(newTag)) {
      return [...tags, newTag];
    }
    return tags;
  }

  removeTagFromAsset(tags: string[], tagToRemove: string): string[] {
    return tags.filter(tag => tag !== tagToRemove);
  }

  // Get unique tags from all assets
  getUniqueTags(assets: ExternalAsset[]): string[] {
    const allTags = assets.flatMap(asset => asset.tags);
    return [...new Set(allTags)].sort();
  }

  // Download file helper
  downloadFile(blob: Blob, filename: string): void {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Format type display name
  formatTypeDisplayName(type: ExternalAsset['type']): string {
    return type.replace('_', ' ').toUpperCase();
  }

  // Get asset icon class
  getAssetIconClass(type: ExternalAsset['type']): string {
    const iconMap = {
      crypto: 'currency-bitcoin',
      stocks: 'trending-up',
      bonds: 'file-text',
      cash: 'dollar-sign',
      real_estate: 'home',
      commodities: 'package',
      other: 'folder'
    };
    
    return iconMap[type] || iconMap.other;
  }

  // Business Logic Extraction Methods

  // Form Management
  async handleAssetSubmit(
    form: ExternalAssetInput,
    editingId: string | null,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.validateAssetForm(form);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      if (editingId) {
        await this.updateExternalAsset(editingId, form, vaultId);
        
        // Log agent memory
        await this.logAgentMemory('asset_updated', {
          userId,
          vaultId,
          metadata: {
            assetId: editingId,
            assetLabel: form.label,
            assetType: form.type,
            value: form.value,
            currency: form.currency
          }
        });
      } else {
        await this.addExternalAsset(form, vaultId);
        
        // Log agent memory
        await this.logAgentMemory('asset_created', {
          userId,
          vaultId,
          metadata: {
            assetLabel: form.label,
            assetType: form.type,
            value: form.value,
            currency: form.currency,
            tags: form.tags
          }
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete Asset Handler
  async handleAssetDelete(
    assetId: string,
    assetLabel: string,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this asset?');
      if (!confirmed) {
        return { success: false, error: 'Action cancelled by user' };
      }

      await this.deleteExternalAsset(assetId, vaultId);
      
      // Log agent memory
      await this.logAgentMemory('asset_deleted', {
        userId,
        vaultId,
        metadata: {
          assetId,
          assetLabel,
          action: 'delete_confirmed'
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Export Handler
  async handleExport(
    format: 'json' | 'csv',
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const blob = await this.exportAssets(format, vaultId);
      this.downloadFile(blob, `external-assets.${format}`);
      
      // Log agent memory
      await this.logAgentMemory('assets_exported', {
        userId,
        vaultId,
        metadata: {
          format,
          exportSize: blob.size
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Import Handler
  async handleImport(
    file: File,
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.importAssets(file, vaultId);
      
      // Log agent memory
      await this.logAgentMemory('assets_imported', {
        userId,
        vaultId,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Form State Management
  updateFormField(form: ExternalAssetInput, field: keyof ExternalAssetInput, value: any): ExternalAssetInput {
    return {
      ...form,
      [field]: value,
    };
  }

  // Tag Management
  handleAddTag(form: ExternalAssetInput, newTag: string): ExternalAssetInput {
    if (newTag && !form.tags.includes(newTag)) {
      return {
        ...form,
        tags: [...form.tags, newTag],
      };
    }
    return form;
  }

  handleRemoveTag(form: ExternalAssetInput, tagToRemove: string): ExternalAssetInput {
    return {
      ...form,
      tags: form.tags.filter(tag => tag !== tagToRemove),
    };
  }

  // Filter State Management
  async handleFilterChange(
    filterType: 'type' | 'tag',
    value: string,
    currentFilters: AssetFilters,
    totalAssets: number,
    userId: string,
    vaultId?: string
  ): Promise<AssetFilters> {
    const newFilters = {
      ...currentFilters,
      [filterType]: value
    };
    
    // Log agent memory
    await this.logAgentMemory('assets_filtered', {
      userId,
      vaultId,
      metadata: {
        filterType,
        filterValue: value,
        totalAssets
      }
    });

    return newFilters;
  }

  // Modal State Management
  prepareAssetForEdit(asset: ExternalAsset): {
    form: ExternalAssetInput;
    editingId: string;
  } {
    return {
      form: {
        label: asset.label,
        type: asset.type,
        value: asset.value,
        currency: asset.currency,
        snapshotDate: asset.snapshotDate.split('T')[0],
        notes: asset.notes || '',
        tags: asset.tags,
      },
      editingId: asset.id
    };
  }

  // UI State Utilities
  getFilteredAssetCount(assets: ExternalAsset[], filters: AssetFilters): number {
    return this.filterAssets(assets, filters).length;
  }

  // Agent memory logging
  async logAgentMemory(
    action: 'asset_created' | 'asset_updated' | 'asset_deleted' | 'assets_exported' | 'assets_imported' | 'assets_filtered' | 'modal_opened' | 'modal_closed',
    assetData: {
      userId?: string;
      vaultId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const logData = {
        action,
        blockId: 'block-39-external-holdings-importer',
        timestamp: new Date().toISOString(),
        userId: assetData.userId,
        vaultId: assetData.vaultId,
        data: {
          ...assetData.metadata
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

  // Enhanced Validation
  validateAssetFormEnhanced(form: ExternalAssetInput): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!form.label.trim()) {
      errors.push('Asset label is required');
    } else if (form.label.length < 2) {
      warnings.push('Asset label is very short');
    }
    
    if (form.value <= 0) {
      errors.push('Asset value must be greater than 0');
    } else if (form.value > 1000000) {
      warnings.push('Large asset value - please verify');
    }
    
    if (!form.snapshotDate) {
      errors.push('Snapshot date is required');
    } else {
      const snapshotDate = new Date(form.snapshotDate);
      const now = new Date();
      if (snapshotDate > now) {
        warnings.push('Snapshot date is in the future');
      }
    }
    
    if (form.tags.length > 10) {
      warnings.push('Consider using fewer tags for better organization');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Bulk Operations
  async handleBulkDelete(
    assetIds: string[],
    userId: string,
    vaultId?: string
  ): Promise<{ success: boolean; error?: string; deletedCount: number }> {
    try {
      const confirmed = window.confirm(`Are you sure you want to delete ${assetIds.length} assets?`);
      if (!confirmed) {
        return { success: false, error: 'Action cancelled by user', deletedCount: 0 };
      }

      let deletedCount = 0;
      for (const assetId of assetIds) {
        try {
          await this.deleteExternalAsset(assetId, vaultId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete asset ${assetId}:`, error);
        }
      }
      
      // Log agent memory
      await this.logAgentMemory('asset_deleted', {
        userId,
        vaultId,
        metadata: {
          action: 'bulk_delete',
          totalAssets: assetIds.length,
          deletedCount,
          assetIds
        }
      });

      return { success: true, deletedCount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', deletedCount: 0 };
    }
  }

  // Modal Management Utilities
  getModalState(isAddingAsset: boolean, editingId: string | null): {
    isOpen: boolean;
    mode: 'create' | 'edit';
    title: string;
  } {
    return {
      isOpen: isAddingAsset,
      mode: editingId ? 'edit' : 'create',
      title: editingId ? 'Edit Asset' : 'Add New Asset'
    };
  }
}

// Service instance
export const externalHoldersImporterService = new ExternalHoldersImporterService();

// React Query hooks
export const useExternalAssets = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/user/external-assets', vaultId],
    queryFn: () => externalHoldersImporterService.getExternalAssets(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useAddExternalAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ asset, vaultId }: { asset: ExternalAssetInput; vaultId?: string }) => 
      externalHoldersImporterService.addExternalAsset(asset, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/external-assets'] });
    },
  });
};

export const useUpdateExternalAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, asset, vaultId }: { id: string; asset: Partial<ExternalAssetInput>; vaultId?: string }) => 
      externalHoldersImporterService.updateExternalAsset(id, asset, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/external-assets'] });
    },
  });
};

export const useDeleteExternalAsset = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      externalHoldersImporterService.deleteExternalAsset(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/external-assets'] });
    },
  });
}; 