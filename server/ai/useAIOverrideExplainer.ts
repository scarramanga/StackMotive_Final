// Block 35: AI Override Explainer - Hook
// React hook for AI decision explanation and manual overrides

import { useState, useEffect, useCallback } from 'react';
import { AIOverrideExplainerEngine } from '../engines/AIOverrideExplainerEngine';
import { useAIOverrideExplainerStore } from '../store/aiOverrideExplainerStore';
import {
  AIOverrideExplainer,
  AIDecision,
  OverrideDetails,
  ExplanationData,
  OverrideValidation,
  OverrideStatus
} from '../types/aiOverrideExplainer';

export const useAIOverrideExplainer = () => {
  const engine = AIOverrideExplainerEngine.getInstance();
  const store = useAIOverrideExplainerStore();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Initialize store
  useEffect(() => {
    const initializeStore = async () => {
      try {
        setLoading(true);
        const decisions = engine.getAllAIDecisions();
        const overrides = engine.getAllOverrides();
        
        store.setAIDecisions(decisions);
        store.setOverrides(overrides);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    initializeStore();
  }, []);

  // AI Decision Management
  const registerAIDecision = useCallback(async (decision: AIDecision): Promise<AIDecision> => {
    try {
      setLoading(true);
      setError(null);

      const registeredDecision = engine.registerAIDecision(decision);
      store.addAIDecision(registeredDecision);

      return registeredDecision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register AI decision';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAIDecision = useCallback((id: string): AIDecision | undefined => {
    return engine.getAIDecision(id);
  }, []);

  // Override Management
  const createOverride = useCallback(async (
    decisionId: string,
    overrideDetails: OverrideDetails,
    userId: string
  ): Promise<AIOverrideExplainer> => {
    try {
      setLoading(true);
      setError(null);

      const override = engine.createOverride(decisionId, overrideDetails, userId);
      store.addOverride(override);

      return override;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOverride = useCallback(async (
    id: string,
    updates: Partial<AIOverrideExplainer>
  ): Promise<AIOverrideExplainer> => {
    try {
      setLoading(true);
      setError(null);

      const override = engine.updateOverride(id, updates);
      store.updateOverride(id, override);

      return override;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveOverride = useCallback(async (
    id: string,
    approverId: string,
    comment?: string
  ): Promise<AIOverrideExplainer> => {
    try {
      setLoading(true);
      setError(null);

      const override = engine.approveOverride(id, approverId, comment);
      store.updateOverride(id, override);

      return override;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const activateOverride = useCallback(async (id: string): Promise<AIOverrideExplainer> => {
    try {
      setLoading(true);
      setError(null);

      const override = engine.activateOverride(id);
      store.updateOverride(id, override);

      return override;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeOverride = useCallback(async (id: string, reason: string): Promise<AIOverrideExplainer> => {
    try {
      setLoading(true);
      setError(null);

      const override = engine.revokeOverride(id, reason);
      store.updateOverride(id, override);

      return override;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Explanation Generation
  const generateExplanation = useCallback(async (
    decision: AIDecision,
    override: OverrideDetails
  ): Promise<ExplanationData> => {
    try {
      setGenerating(true);
      setError(null);

      const explanation = engine.generateExplanation(decision, override);
      return explanation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate explanation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setGenerating(false);
    }
  }, []);

  // Validation
  const validateOverride = useCallback(async (
    decision: AIDecision,
    override: OverrideDetails
  ): Promise<OverrideValidation> => {
    try {
      setValidating(true);
      setError(null);

      // This would typically call a validation method on the engine
      // For now, we'll simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const validation: OverrideValidation = {
        isValid: true,
        warnings: [],
        requirements: [],
        approvals: []
      };

      return validation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate override';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setValidating(false);
    }
  }, []);

  // Analytics
  const getOverrideAnalytics = useCallback(() => {
    return engine.getOverrideAnalytics();
  }, []);

  // Utilities
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const decisions = engine.getAllAIDecisions();
      const overrides = engine.getAllOverrides();
      
      store.setAIDecisions(decisions);
      store.setOverrides(overrides);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Store data
  const aiDecisions = store.aiDecisions;
  const overrides = store.overrides;
  const selectedDecision = store.selectedDecision;
  const selectedOverride = store.selectedOverride;

  // Filtered data
  const pendingOverrides = overrides.filter(o => o.status === 'pending');
  const activeOverrides = overrides.filter(o => o.status === 'active');
  const approvedOverrides = overrides.filter(o => o.status === 'approved');
  const recentDecisions = aiDecisions.filter(d => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return d.context.temporal.timestamp >= dayAgo;
  });

  // Analytics
  const analytics = getOverrideAnalytics();

  return {
    // State
    loading,
    error,
    validating,
    generating,

    // Data
    aiDecisions,
    overrides,
    selectedDecision,
    selectedOverride,
    pendingOverrides,
    activeOverrides,
    approvedOverrides,
    recentDecisions,
    analytics,

    // AI Decision management
    registerAIDecision,
    getAIDecision,

    // Override management
    createOverride,
    updateOverride,
    approveOverride,
    activateOverride,
    revokeOverride,

    // Explanation and validation
    generateExplanation,
    validateOverride,

    // Analytics
    getOverrideAnalytics,

    // Utilities
    clearError,
    refreshData,

    // Store actions
    setSelectedDecision: store.setSelectedDecision,
    setSelectedOverride: store.setSelectedOverride,
    setView: store.setView,
    setFilter: store.setFilter,
    setSort: store.setSort
  };
};

// Specialized hooks
export const useAIDecisionManagement = () => {
  const {
    aiDecisions,
    selectedDecision,
    registerAIDecision,
    getAIDecision,
    setSelectedDecision,
    loading,
    error,
    clearError
  } = useAIOverrideExplainer();

  return {
    aiDecisions,
    selectedDecision,
    registerAIDecision,
    getAIDecision,
    setSelectedDecision,
    loading,
    error,
    clearError
  };
};

export const useOverrideManagement = () => {
  const {
    overrides,
    selectedOverride,
    createOverride,
    updateOverride,
    approveOverride,
    activateOverride,
    revokeOverride,
    setSelectedOverride,
    loading,
    error,
    clearError
  } = useAIOverrideExplainer();

  return {
    overrides,
    selectedOverride,
    createOverride,
    updateOverride,
    approveOverride,
    activateOverride,
    revokeOverride,
    setSelectedOverride,
    loading,
    error,
    clearError
  };
};

export const useExplanationGeneration = () => {
  const {
    generateExplanation,
    validateOverride,
    generating,
    validating,
    error,
    clearError
  } = useAIOverrideExplainer();

  return {
    generateExplanation,
    validateOverride,
    generating,
    validating,
    error,
    clearError
  };
};

export const useOverrideAnalytics = () => {
  const {
    analytics,
    getOverrideAnalytics,
    pendingOverrides,
    activeOverrides,
    approvedOverrides
  } = useAIOverrideExplainer();

  return {
    analytics,
    getOverrideAnalytics,
    pendingOverrides,
    activeOverrides,
    approvedOverrides
  };
}; 