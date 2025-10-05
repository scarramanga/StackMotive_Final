// Block 44: Signal Change Monitor - Hook
import { useState, useEffect, useCallback } from 'react';
import { 
  SignalChange, 
  TradingSignal, 
  SignalMonitorRule,
  SignalAlert,
  SignalTrend,
  SignalStats,
  SignalChangeMonitorState,
  SignalFilter
} from '../types/signalChangeMonitor';
import { signalChangeMonitorEngine } from '../engines/SignalChangeMonitorEngine';

export function useSignalChangeMonitor() {
  const [state, setState] = useState<SignalChangeMonitorState>({
    changes: [],
    rules: [],
    alerts: [],
    trends: [],
    selectedChange: null,
    selectedRule: null,
    filter: {},
    isLoading: false,
    error: null,
    stats: null,
    isMonitoring: false,
    lastUpdate: null
  });

  // Initialize data
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const changes = signalChangeMonitorEngine.getAllChanges();
      const rules = signalChangeMonitorEngine.getAllRules();
      const alerts = signalChangeMonitorEngine.getAllAlerts();
      const trends = signalChangeMonitorEngine.getActiveTrends();
      const stats = signalChangeMonitorEngine.getSignalStats();

      setState(prev => ({
        ...prev,
        changes,
        rules,
        alerts,
        trends,
        stats,
        isLoading: false,
        error: null,
        lastUpdate: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh data'
      }));
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(async (intervalSeconds: number = 30) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await signalChangeMonitorEngine.startMonitoring(intervalSeconds);
      setState(prev => ({ ...prev, isMonitoring: true, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start monitoring'
      }));
    }
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await signalChangeMonitorEngine.stopMonitoring();
      setState(prev => ({ ...prev, isMonitoring: false, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop monitoring'
      }));
    }
  }, []);

  // Process signal
  const processSignal = useCallback((symbolId: string, signal: TradingSignal) => {
    try {
      const change = signalChangeMonitorEngine.processSignal(symbolId, signal);
      if (change) {
        refreshData();
      }
      return change;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process signal'
      }));
      return null;
    }
  }, [refreshData]);

  // Create rule
  const createRule = useCallback(async (rule: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const newRule = signalChangeMonitorEngine.createRule(rule);
      await refreshData();
      return newRule;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create rule'
      }));
      throw error;
    }
  }, [refreshData]);

  // Update rule
  const updateRule = useCallback(async (ruleId: string, updates: Partial<SignalMonitorRule>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const success = signalChangeMonitorEngine.updateRule(ruleId, updates);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update rule'
      }));
      return false;
    }
  }, [refreshData]);

  // Delete rule
  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const success = signalChangeMonitorEngine.deleteRule(ruleId);
      if (success) {
        setState(prev => ({
          ...prev,
          selectedRule: prev.selectedRule?.id === ruleId ? null : prev.selectedRule
        }));
        await refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete rule'
      }));
      return false;
    }
  }, [refreshData]);

  // Acknowledge change
  const acknowledgeChange = useCallback(async (changeId: string, userId?: string) => {
    try {
      const success = signalChangeMonitorEngine.acknowledgeChange(changeId, userId);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to acknowledge change'
      }));
      return false;
    }
  }, [refreshData]);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string, userId?: string) => {
    try {
      const success = signalChangeMonitorEngine.dismissAlert(alertId, userId);
      if (success) {
        await refreshData();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to dismiss alert'
      }));
      return false;
    }
  }, [refreshData]);

  // Get signal history
  const getSignalHistory = useCallback(async (symbolId: string, hours: number = 24) => {
    try {
      const history = signalChangeMonitorEngine.getSignalHistory(symbolId, hours);
      return history;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get signal history'
      }));
      return [];
    }
  }, []);

  // Analyze trend
  const analyzeTrend = useCallback(async (symbolId: string) => {
    try {
      const trend = signalChangeMonitorEngine.analyzeTrend(symbolId);
      if (trend) {
        await refreshData();
      }
      return trend;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to analyze trend'
      }));
      return null;
    }
  }, [refreshData]);

  // Get filtered changes
  const getFilteredChanges = useCallback(() => {
    let filtered = [...state.changes];

    if (state.filter.symbolId) {
      filtered = filtered.filter(change => change.symbolId === state.filter.symbolId);
    }

    if (state.filter.strategyId) {
      filtered = filtered.filter(change => change.strategyId === state.filter.strategyId);
    }

    if (state.filter.userId) {
      filtered = filtered.filter(change => change.userId === state.filter.userId);
    }

    if (state.filter.changeType) {
      filtered = filtered.filter(change => change.changeType === state.filter.changeType);
    }

    if (state.filter.impactLevel) {
      filtered = filtered.filter(change => change.impact.level === state.filter.impactLevel);
    }

    if (state.filter.acknowledged !== undefined) {
      filtered = filtered.filter(change => change.acknowledged === state.filter.acknowledged);
    }

    if (state.filter.minConfidence !== undefined) {
      filtered = filtered.filter(change => change.confidence >= state.filter.minConfidence!);
    }

    if (state.filter.source) {
      filtered = filtered.filter(change => change.source === state.filter.source);
    }

    if (state.filter.searchQuery) {
      const query = state.filter.searchQuery.toLowerCase();
      filtered = filtered.filter(change =>
        change.symbolName.toLowerCase().includes(query) ||
        change.description.toLowerCase().includes(query) ||
        change.reasonCode.toLowerCase().includes(query)
      );
    }

    if (state.filter.dateFrom || state.filter.dateTo) {
      filtered = filtered.filter(change => {
        if (state.filter.dateFrom && change.changeTimestamp < state.filter.dateFrom) return false;
        if (state.filter.dateTo && change.changeTimestamp > state.filter.dateTo) return false;
        return true;
      });
    }

    return filtered;
  }, [state.changes, state.filter]);

  // Get filtered alerts
  const getFilteredAlerts = useCallback(() => {
    let filtered = [...state.alerts];

    if (state.filter.symbolId) {
      filtered = filtered.filter(alert => alert.symbolId === state.filter.symbolId);
    }

    if (state.filter.dismissed !== undefined) {
      filtered = filtered.filter(alert => alert.dismissed === state.filter.dismissed);
    }

    if (state.filter.tags && state.filter.tags.length > 0) {
      filtered = filtered.filter(alert => 
        state.filter.tags!.some(tag => alert.tags.includes(tag))
      );
    }

    if (state.filter.dateFrom || state.filter.dateTo) {
      filtered = filtered.filter(alert => {
        if (state.filter.dateFrom && alert.createdAt < state.filter.dateFrom) return false;
        if (state.filter.dateTo && alert.createdAt > state.filter.dateTo) return false;
        return true;
      });
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [state.alerts, state.filter]);

  // Get filtered trends
  const getFilteredTrends = useCallback(() => {
    let filtered = [...state.trends];

    if (state.filter.symbolId) {
      filtered = filtered.filter(trend => trend.symbolId === state.filter.symbolId);
    }

    return filtered.sort((a, b) => b.strength - a.strength);
  }, [state.trends, state.filter]);

  // Get active alerts
  const getActiveAlerts = useCallback(() => {
    return state.alerts.filter(alert => !alert.dismissed);
  }, [state.alerts]);

  // Get high impact changes
  const getHighImpactChanges = useCallback(() => {
    return state.changes.filter(change => 
      change.impact.level === 'high' || change.impact.level === 'critical'
    );
  }, [state.changes]);

  // Get recent changes
  const getRecentChanges = useCallback((hours: number = 24) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return state.changes.filter(change => change.changeTimestamp >= cutoff);
  }, [state.changes]);

  // Get changes by symbol
  const getChangesBySymbol = useCallback((symbolId: string) => {
    return state.changes.filter(change => change.symbolId === symbolId);
  }, [state.changes]);

  // Get change by ID
  const getChange = useCallback((changeId: string) => {
    return signalChangeMonitorEngine.getChange(changeId);
  }, []);

  // Get alert by ID
  const getAlert = useCallback((alertId: string) => {
    return signalChangeMonitorEngine.getAlert(alertId);
  }, []);

  // Get trend by ID
  const getTrend = useCallback((trendId: string) => {
    return signalChangeMonitorEngine.getTrend(trendId);
  }, []);

  // Set filter
  const setFilter = useCallback((filter: SignalFilter) => {
    setState(prev => ({ ...prev, filter }));
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setState(prev => ({ ...prev, filter: {} }));
  }, []);

  // Set selected change
  const setSelectedChange = useCallback((change: SignalChange | null) => {
    setState(prev => ({ ...prev, selectedChange: change }));
  }, []);

  // Set selected rule
  const setSelectedRule = useCallback((rule: SignalMonitorRule | null) => {
    setState(prev => ({ ...prev, selectedRule: rule }));
  }, []);

  // Validate signal change
  const validateSignalChange = useCallback((change: SignalChange) => {
    return signalChangeMonitorEngine.validateSignalChange(change);
  }, []);

  // Bulk operations
  const bulkAcknowledgeChanges = useCallback(async (changeIds: string[], userId?: string) => {
    let successCount = 0;
    for (const id of changeIds) {
      if (await acknowledgeChange(id, userId)) {
        successCount++;
      }
    }
    return successCount;
  }, [acknowledgeChange]);

  const bulkDismissAlerts = useCallback(async (alertIds: string[], userId?: string) => {
    let successCount = 0;
    for (const id of alertIds) {
      if (await dismissAlert(id, userId)) {
        successCount++;
      }
    }
    return successCount;
  }, [dismissAlert]);

  const bulkDeleteRules = useCallback(async (ruleIds: string[]) => {
    let successCount = 0;
    for (const id of ruleIds) {
      if (await deleteRule(id)) {
        successCount++;
      }
    }
    return successCount;
  }, [deleteRule]);

  // Get signal stats
  const getSignalStats = useCallback(() => {
    return signalChangeMonitorEngine.getSignalStats();
  }, []);

  return {
    // State
    changes: state.changes,
    filteredChanges: getFilteredChanges(),
    rules: state.rules,
    alerts: state.alerts,
    filteredAlerts: getFilteredAlerts(),
    trends: state.trends,
    filteredTrends: getFilteredTrends(),
    selectedChange: state.selectedChange,
    selectedRule: state.selectedRule,
    filter: state.filter,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,
    isMonitoring: state.isMonitoring,
    lastUpdate: state.lastUpdate,

    // Actions
    startMonitoring,
    stopMonitoring,
    processSignal,
    createRule,
    updateRule,
    deleteRule,
    acknowledgeChange,
    dismissAlert,
    getSignalHistory,
    analyzeTrend,
    refreshData,

    // Getters
    getChange,
    getAlert,
    getTrend,
    getActiveAlerts,
    getHighImpactChanges,
    getRecentChanges,
    getChangesBySymbol,
    getSignalStats,

    // Filters
    setFilter,
    clearFilter,
    setSelectedChange,
    setSelectedRule,

    // Utilities
    validateSignalChange,

    // Bulk operations
    bulkAcknowledgeChanges,
    bulkDismissAlerts,
    bulkDeleteRules
  };
} 