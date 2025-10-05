import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface UserPreferences {
  autoTrimMode: boolean;
  rotationAggressiveness: 'low' | 'medium' | 'high';
  excludedAssets: string[];
  notificationSettings?: {
    email: boolean;
    push: boolean;
    rebalanceAlerts: boolean;
  };
  displaySettings?: {
    theme: 'light' | 'dark' | 'auto';
    currency: string;
    dateFormat: string;
  };
}

export interface AssetOption {
  id: string;
  symbol: string;
  name: string;
  currentAllocation?: number;
  sector?: string;
  marketCap?: number;
}

export interface RotationOption {
  value: 'low' | 'medium' | 'high';
  label: string;
  description: string;
  rebalanceFrequency: string;
  toleranceThreshold: number;
}

export interface PreferencesUpdateRequest {
  autoTrimMode: boolean;
  rotationAggressiveness: 'low' | 'medium' | 'high';
  excludedAssets: string[];
}

export interface ToastNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface PreferencesFormState {
  data: UserPreferences;
  hasChanges: boolean;
  isDirty: boolean;
  isValid: boolean;
  errors: Record<string, string>;
}

// ================================
// CONSTANTS
// ================================

export const ROTATION_OPTIONS: RotationOption[] = [
  { 
    value: 'low', 
    label: 'Low', 
    description: 'Conservative rebalancing with minimal turnover',
    rebalanceFrequency: 'Monthly',
    toleranceThreshold: 0.15
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    description: 'Balanced approach with moderate adjustments',
    rebalanceFrequency: 'Bi-weekly',
    toleranceThreshold: 0.10
  },
  { 
    value: 'high', 
    label: 'High', 
    description: 'Aggressive rebalancing for optimal allocation',
    rebalanceFrequency: 'Weekly',
    toleranceThreshold: 0.05
  }
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  autoTrimMode: false,
  rotationAggressiveness: 'medium',
  excludedAssets: [],
  notificationSettings: {
    email: true,
    push: false,
    rebalanceAlerts: true
  },
  displaySettings: {
    theme: 'auto',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY'
  }
};

export const TRIM_THRESHOLD = 0.01; // 1%
export const MAX_EXCLUDED_ASSETS = 10;

// ================================
// USER PREFERENCES SERVICE CLASS
// ================================

export class UserPreferencesService {
  // Form Validation
  static validatePreferences(preferences: UserPreferences): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validate excluded assets count
    if (preferences.excludedAssets.length > MAX_EXCLUDED_ASSETS) {
      errors.excludedAssets = `Maximum ${MAX_EXCLUDED_ASSETS} assets can be excluded`;
    }

    // Validate rotation aggressiveness
    if (!['low', 'medium', 'high'].includes(preferences.rotationAggressiveness)) {
      errors.rotationAggressiveness = 'Invalid rotation aggressiveness value';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Change Detection
  static hasChanges(original: UserPreferences, current: UserPreferences): boolean {
    if (original.autoTrimMode !== current.autoTrimMode) return true;
    if (original.rotationAggressiveness !== current.rotationAggressiveness) return true;
    
    // Deep comparison for arrays
    if (original.excludedAssets.length !== current.excludedAssets.length) return true;
    if (original.excludedAssets.some(asset => !current.excludedAssets.includes(asset))) return true;
    
    return false;
  }

  // Asset Management
  static toggleAssetExclusion(currentExcluded: string[], assetId: string): string[] {
    if (currentExcluded.includes(assetId)) {
      return currentExcluded.filter(id => id !== assetId);
    } else {
      return [...currentExcluded, assetId];
    }
  }

  static getExcludedAssetsInfo(excludedAssets: string[], availableAssets: AssetOption[]) {
    const excludedInfo = excludedAssets.map(assetId => 
      availableAssets.find(asset => asset.id === assetId)
    ).filter(Boolean);

    const totalExcludedAllocation = excludedInfo.reduce(
      (sum, asset) => sum + (asset?.currentAllocation || 0), 0
    );

    return {
      count: excludedAssets.length,
      assets: excludedInfo,
      totalAllocation: totalExcludedAllocation
    };
  }

  // Rotation Logic
  static getRotationSettings(aggressiveness: 'low' | 'medium' | 'high') {
    const option = ROTATION_OPTIONS.find(opt => opt.value === aggressiveness);
    return option || ROTATION_OPTIONS[1]; // Default to medium
  }

  static calculateRebalanceImpact(preferences: UserPreferences, currentPortfolio: AssetOption[]) {
    const settings = this.getRotationSettings(preferences.rotationAggressiveness);
    const excludedAssets = currentPortfolio.filter(asset => 
      preferences.excludedAssets.includes(asset.id)
    );

    const includedAllocation = currentPortfolio
      .filter(asset => !preferences.excludedAssets.includes(asset.id))
      .reduce((sum, asset) => sum + (asset.currentAllocation || 0), 0);

    return {
      frequency: settings.rebalanceFrequency,
      threshold: settings.toleranceThreshold,
      excludedAssetsCount: excludedAssets.length,
      includedAllocation,
      autoTrimEnabled: preferences.autoTrimMode
    };
  }

  // API Calls
  static async fetchUserPreferences(): Promise<UserPreferences> {
    const response = await fetch('/api/user/preferences', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user preferences');
    }

    const data = await response.json();
    return { ...DEFAULT_PREFERENCES, ...data };
  }

  static async updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error('Failed to update user preferences');
    }

    return response.json();
  }

  static async fetchAvailableAssets(): Promise<AssetOption[]> {
    const response = await fetch('/api/portfolio/assets', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available assets');
    }

    return response.json();
  }

  static async resetPreferencesToDefault(): Promise<UserPreferences> {
    const response = await fetch('/api/user/preferences/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to reset preferences');
    }

    return response.json();
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
          component: 'UserPreferencesPanel',
          action,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log agent memory:', error);
    }
  }

  // Toast Notifications
  static createToast(type: ToastNotification['type'], message: string, duration = 3000): ToastNotification {
    return { type, message, duration };
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useUserPreferences = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: UserPreferencesService.fetchUserPreferences,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useAvailableAssets = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['available-assets'],
    queryFn: UserPreferencesService.fetchAvailableAssets,
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: UserPreferencesService.updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences'], data);
      queryClient.invalidateQueries(['user-preferences']);
      UserPreferencesService.logAgentMemory('preferences_updated', {
        preferences: data,
        timestamp: new Date().toISOString()
      });
    },
    onError: (error) => {
      UserPreferencesService.logAgentMemory('preferences_update_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useResetPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: UserPreferencesService.resetPreferencesToDefault,
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences'], data);
      queryClient.invalidateQueries(['user-preferences']);
      UserPreferencesService.logAgentMemory('preferences_reset', {
        resetToDefaults: data,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// CUSTOM HOOKS FOR FORM MANAGEMENT
// ================================

export const usePreferencesForm = (initialPreferences?: UserPreferences) => {
  const [formState, setFormState] = useState<PreferencesFormState>(() => ({
    data: initialPreferences || DEFAULT_PREFERENCES,
    hasChanges: false,
    isDirty: false,
    isValid: true,
    errors: {}
  }));

  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Update form data
  const updateFormData = (updates: Partial<UserPreferences>) => {
    setFormState(prev => {
      const newData = { ...prev.data, ...updates };
      const hasChanges = initialPreferences ? 
        UserPreferencesService.hasChanges(initialPreferences, newData) : 
        false;
      
      const validation = UserPreferencesService.validatePreferences(newData);

      return {
        ...prev,
        data: newData,
        hasChanges,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      };
    });
  };

  // Handle auto-trim toggle
  const toggleAutoTrim = (enabled: boolean) => {
    updateFormData({ autoTrimMode: enabled });
    UserPreferencesService.logAgentMemory('auto_trim_toggled', {
      enabled,
      timestamp: new Date().toISOString()
    });
  };

  // Handle rotation aggressiveness change
  const setRotationAggressiveness = (level: 'low' | 'medium' | 'high') => {
    updateFormData({ rotationAggressiveness: level });
    UserPreferencesService.logAgentMemory('rotation_aggressiveness_changed', {
      level,
      timestamp: new Date().toISOString()
    });
  };

  // Handle asset exclusion toggle
  const toggleAssetExclusion = (assetId: string) => {
    const newExcluded = UserPreferencesService.toggleAssetExclusion(
      formState.data.excludedAssets, 
      assetId
    );
    updateFormData({ excludedAssets: newExcluded });
    UserPreferencesService.logAgentMemory('asset_exclusion_toggled', {
      assetId,
      isExcluded: newExcluded.includes(assetId),
      totalExcluded: newExcluded.length,
      timestamp: new Date().toISOString()
    });
  };

  // Reset form to initial state
  const resetForm = () => {
    if (initialPreferences) {
      setFormState({
        data: initialPreferences,
        hasChanges: false,
        isDirty: false,
        isValid: true,
        errors: {}
      });
    }
  };

  // Show toast notification
  const showToast = (type: ToastNotification['type'], message: string, duration?: number) => {
    const toastData = UserPreferencesService.createToast(type, message, duration);
    setToast(toastData);
    
    setTimeout(() => setToast(null), toastData.duration);
  };

  // Update initial preferences when they change
  useEffect(() => {
    if (initialPreferences && !formState.isDirty) {
      setFormState(prev => ({
        ...prev,
        data: initialPreferences
      }));
    }
  }, [initialPreferences, formState.isDirty]);

  return {
    formState,
    updateFormData,
    toggleAutoTrim,
    setRotationAggressiveness,
    toggleAssetExclusion,
    resetForm,
    toast,
    showToast,
    clearToast: () => setToast(null)
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const getRotationOptionByValue = (value: string): RotationOption | undefined => {
  return ROTATION_OPTIONS.find(option => option.value === value);
};

export const formatExcludedAssetsText = (count: number): string => {
  if (count === 0) return 'No assets excluded';
  if (count === 1) return '1 asset excluded';
  return `${count} assets excluded`;
};

export const calculatePortfolioImpact = (
  preferences: UserPreferences, 
  assets: AssetOption[]
): {
  activeAllocation: number;
  excludedAllocation: number;
  totalAssets: number;
  excludedAssets: number;
} => {
  const excludedAssets = assets.filter(asset => 
    preferences.excludedAssets.includes(asset.id)
  );

  const excludedAllocation = excludedAssets.reduce(
    (sum, asset) => sum + (asset.currentAllocation || 0), 0
  );

  const totalAllocation = assets.reduce(
    (sum, asset) => sum + (asset.currentAllocation || 0), 0
  );

  return {
    activeAllocation: totalAllocation - excludedAllocation,
    excludedAllocation,
    totalAssets: assets.length,
    excludedAssets: excludedAssets.length
  };
};

export default UserPreferencesService; 