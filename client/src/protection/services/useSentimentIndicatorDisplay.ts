// Block 39: Sentiment Indicator Display - Hook
// React hook for sentiment indicator display management

import { useState, useEffect, useCallback } from 'react';
import { SentimentIndicatorDisplayEngine } from '../engines/SentimentIndicatorDisplayEngine';
import { useSentimentIndicatorDisplayStore } from '../store/sentimentIndicatorDisplayStore';
import {
  SentimentIndicatorDisplay,
  SentimentData,
  SentimentDataSource,
  IndicatorConfig,
  DisplaySettings,
  AlertSettings,
  AlertThreshold,
  SentimentHistoryPoint,
  SentimentPrediction,
  PerformanceMetrics
} from '../types/sentimentIndicatorDisplay';

export const useSentimentIndicatorDisplay = () => {
  const engine = SentimentIndicatorDisplayEngine.getInstance();
  const store = useSentimentIndicatorDisplayStore();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [predicting, setPredicting] = useState(false);

  // Initialize store
  useEffect(() => {
    const initializeStore = async () => {
      try {
        setLoading(true);
        const displays = engine.getAllDisplays();
        store.setDisplays(displays);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    initializeStore();
  }, []);

  // Display Management
  const createDisplay = useCallback(async (
    userId: string,
    config: IndicatorConfig,
    displaySettings: DisplaySettings,
    alertSettings?: Partial<AlertSettings>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.createDisplay(userId, config, displaySettings, alertSettings);
      store.addDisplay(display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create display';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDisplay = useCallback(async (
    id: string,
    updates: Partial<SentimentIndicatorDisplay>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateDisplay(id, updates);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDisplay = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = engine.deleteDisplay(id);
      if (success) {
        store.removeDisplay(id);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete display';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Configuration Management
  const updateConfig = useCallback(async (
    id: string,
    config: Partial<IndicatorConfig>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateConfig(id, config);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update config';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDisplaySettings = useCallback(async (
    id: string,
    settings: Partial<DisplaySettings>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateDisplaySettings(id, settings);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAlertSettings = useCallback(async (
    id: string,
    settings: Partial<AlertSettings>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateAlertSettings(id, settings);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update alert settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sentiment Data Management
  const updateSentimentData = useCallback(async (id: string): Promise<SentimentData> => {
    try {
      setUpdating(true);
      setError(null);

      const sentimentData = await engine.updateSentimentData(id);
      
      // Update store with latest display data
      const display = engine.getDisplay(id);
      if (display) {
        store.updateDisplay(id, display);
      }

      return sentimentData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sentiment data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  const getCurrentSentiment = useCallback((id: string): SentimentData | undefined => {
    return engine.getCurrentSentiment(id);
  }, []);

  const getSentimentHistory = useCallback((id: string, limit?: number): SentimentHistoryPoint[] => {
    return engine.getSentimentHistory(id, limit);
  }, []);

  // Data Source Management
  const addDataSource = useCallback(async (
    id: string,
    source: SentimentDataSource
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.addDataSource(id, source);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add data source';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDataSource = useCallback(async (
    id: string,
    sourceId: string
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.removeDataSource(id, sourceId);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove data source';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDataSource = useCallback(async (
    id: string,
    sourceId: string,
    updates: Partial<SentimentDataSource>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateDataSource(id, sourceId, updates);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data source';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Alert Management
  const addAlertThreshold = useCallback(async (
    id: string,
    threshold: AlertThreshold
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.addAlertThreshold(id, threshold);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add alert threshold';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeAlertThreshold = useCallback(async (
    id: string,
    thresholdId: string
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.removeAlertThreshold(id, thresholdId);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove alert threshold';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAlertThreshold = useCallback(async (
    id: string,
    thresholdId: string,
    updates: Partial<AlertThreshold>
  ): Promise<SentimentIndicatorDisplay> => {
    try {
      setLoading(true);
      setError(null);

      const display = engine.updateAlertThreshold(id, thresholdId, updates);
      store.updateDisplay(id, display);

      return display;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update alert threshold';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Prediction and Analysis
  const generatePredictions = useCallback(async (
    id: string,
    timeHorizons: number[]
  ): Promise<SentimentPrediction[]> => {
    try {
      setPredicting(true);
      setError(null);

      const predictions = await engine.generatePredictions(id, timeHorizons);
      return predictions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate predictions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setPredicting(false);
    }
  }, []);

  const analyzePatterns = useCallback(async (id: string): Promise<any[]> => {
    try {
      setLoading(true);
      setError(null);

      const patterns = await engine.analyzePatterns(id);
      return patterns;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze patterns';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Performance and Monitoring
  const getPerformanceMetrics = useCallback((id: string): PerformanceMetrics | undefined => {
    return engine.getPerformanceMetrics(id);
  }, []);

  const resetPerformanceMetrics = useCallback((id: string): void => {
    engine.resetPerformanceMetrics(id);
  }, []);

  // Real-time Updates
  const startRealTimeUpdates = useCallback((id: string, callback: (data: any) => void): () => void => {
    const handleDisplayUpdate = (data: any) => {
      if (data.displayId === id || data.id === id) {
        callback(data);
        
        // Update store if display data changed
        if (data.displayId === id && data.display) {
          store.updateDisplay(id, data.display);
        }
      }
    };

    const handleSentimentUpdate = (data: any) => {
      if (data.displayId === id) {
        callback(data);
        
        // Update current sentiment in store
        const display = store.getDisplay(id);
        if (display && data.sentiment) {
          store.updateDisplay(id, {
            ...display,
            currentSentiment: data.sentiment,
            lastRefresh: new Date()
          });
        }
      }
    };

    const handleAlertTriggered = (data: any) => {
      if (data.displayId === id) {
        callback(data);
      }
    };

    engine.on('displayUpdated', handleDisplayUpdate);
    engine.on('sentimentUpdated', handleSentimentUpdate);
    engine.on('alertTriggered', handleAlertTriggered);

    // Return cleanup function
    return () => {
      engine.off('displayUpdated', handleDisplayUpdate);
      engine.off('sentimentUpdated', handleSentimentUpdate);
      engine.off('alertTriggered', handleAlertTriggered);
    };
  }, []);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Store selectors
  const {
    displays,
    selectedDisplay,
    getDisplay,
    getFilteredDisplays,
    getSortedDisplays,
    getActiveDisplays
  } = store;

  return {
    // Data
    displays,
    selectedDisplay,
    
    // Getters
    getDisplay,
    getFilteredDisplays,
    getSortedDisplays,
    getActiveDisplays,
    getCurrentSentiment,
    getSentimentHistory,
    getPerformanceMetrics,
    
    // Display Management
    createDisplay,
    updateDisplay,
    deleteDisplay,
    
    // Configuration
    updateConfig,
    updateDisplaySettings,
    updateAlertSettings,
    
    // Sentiment Data
    updateSentimentData,
    
    // Data Sources
    addDataSource,
    removeDataSource,
    updateDataSource,
    
    // Alerts
    addAlertThreshold,
    removeAlertThreshold,
    updateAlertThreshold,
    
    // Analysis
    generatePredictions,
    analyzePatterns,
    
    // Performance
    resetPerformanceMetrics,
    
    // Real-time
    startRealTimeUpdates,
    
    // State
    loading,
    error,
    updating,
    predicting,
    
    // Utilities
    clearError,
    
    // Store actions
    setSelectedDisplay: store.setSelectedDisplay,
    setFilter: store.setFilter,
    setSort: store.setSort,
    setDisplaySettings: store.setDisplaySettings
  };
};

// Specialized hooks for specific functionality
export const useSentimentDisplay = (displayId: string) => {
  const {
    getDisplay,
    getCurrentSentiment,
    updateSentimentData,
    startRealTimeUpdates,
    updating,
    error
  } = useSentimentIndicatorDisplay();

  const display = getDisplay(displayId);
  const currentSentiment = getCurrentSentiment(displayId);

  const refresh = useCallback(() => {
    if (displayId) {
      return updateSentimentData(displayId);
    }
    return Promise.reject(new Error('No display ID provided'));
  }, [displayId, updateSentimentData]);

  return {
    display,
    currentSentiment,
    refresh,
    startRealTimeUpdates: (callback: (data: any) => void) => 
      startRealTimeUpdates(displayId, callback),
    updating,
    error
  };
};

export const useSentimentConfiguration = (displayId: string) => {
  const {
    getDisplay,
    updateConfig,
    updateDisplaySettings,
    updateAlertSettings,
    addDataSource,
    removeDataSource,
    updateDataSource,
    loading,
    error
  } = useSentimentIndicatorDisplay();

  const display = getDisplay(displayId);

  return {
    display,
    updateConfig: (config: Partial<IndicatorConfig>) => updateConfig(displayId, config),
    updateDisplaySettings: (settings: Partial<DisplaySettings>) => 
      updateDisplaySettings(displayId, settings),
    updateAlertSettings: (settings: Partial<AlertSettings>) => 
      updateAlertSettings(displayId, settings),
    addDataSource: (source: SentimentDataSource) => addDataSource(displayId, source),
    removeDataSource: (sourceId: string) => removeDataSource(displayId, sourceId),
    updateDataSource: (sourceId: string, updates: Partial<SentimentDataSource>) => 
      updateDataSource(displayId, sourceId, updates),
    loading,
    error
  };
};

export const useSentimentAnalytics = (displayId: string) => {
  const {
    getSentimentHistory,
    generatePredictions,
    analyzePatterns,
    getPerformanceMetrics,
    predicting,
    loading,
    error
  } = useSentimentIndicatorDisplay();

  const history = getSentimentHistory(displayId);
  const performance = getPerformanceMetrics(displayId);

  return {
    history,
    performance,
    generatePredictions: (timeHorizons: number[]) => generatePredictions(displayId, timeHorizons),
    analyzePatterns: () => analyzePatterns(displayId),
    predicting,
    loading,
    error
  };
};

export const useSentimentAlerts = (displayId: string) => {
  const {
    getDisplay,
    addAlertThreshold,
    removeAlertThreshold,
    updateAlertThreshold,
    loading,
    error
  } = useSentimentIndicatorDisplay();

  const display = getDisplay(displayId);
  const alertSettings = display?.alertSettings;

  return {
    alertSettings,
    addThreshold: (threshold: AlertThreshold) => addAlertThreshold(displayId, threshold),
    removeThreshold: (thresholdId: string) => removeAlertThreshold(displayId, thresholdId),
    updateThreshold: (thresholdId: string, updates: Partial<AlertThreshold>) => 
      updateAlertThreshold(displayId, thresholdId, updates),
    loading,
    error
  };
}; 