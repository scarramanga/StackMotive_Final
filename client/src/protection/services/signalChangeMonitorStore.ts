// Block 44: Signal Change Monitor - Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  SignalChange, 
  TradingSignal, 
  SignalMonitorRule,
  SignalAlert,
  SignalTrend,
  SignalStats,
  SignalFilter
} from '../types/signalChangeMonitor';
import { signalChangeMonitorEngine } from '../engines/SignalChangeMonitorEngine';

interface SignalChangeMonitorStore {
  // State
  changes: SignalChange[];
  rules: SignalMonitorRule[];
  alerts: SignalAlert[];
  trends: SignalTrend[];
  selectedChange: SignalChange | null;
  selectedRule: SignalMonitorRule | null;
  filter: SignalFilter;
  isLoading: boolean;
  error: string | null;
  stats: SignalStats | null;
  isMonitoring: boolean;
  lastUpdate: Date | null;
  
  // Actions
  initialize: () => Promise<void>;
  startMonitoring: (intervalSeconds?: number) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  processSignal: (symbolId: string, signal: TradingSignal) => SignalChange | null;
  createRule: (rule: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SignalMonitorRule>;
  updateRule: (ruleId: string, updates: Partial<SignalMonitorRule>) => Promise<boolean>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  acknowledgeChange: (changeId: string, userId?: string) => Promise<boolean>;
  dismissAlert: (alertId: string, userId?: string) => Promise<boolean>;
  getSignalHistory: (symbolId: string, hours?: number) => SignalChange[];
  analyzeTrend: (symbolId: string) => SignalTrend | null;
  refreshData: () => Promise<void>;
  
  // Getters
  getChange: (changeId: string) => SignalChange | undefined;
  getAlert: (alertId: string) => SignalAlert | undefined;
  getTrend: (trendId: string) => SignalTrend | undefined;
  getFilteredChanges: () => SignalChange[];
  getFilteredAlerts: () => SignalAlert[];
  getFilteredTrends: () => SignalTrend[];
  getActiveAlerts: () => SignalAlert[];
  getHighImpactChanges: () => SignalChange[];
  getRecentChanges: (hours?: number) => SignalChange[];
  getChangesBySymbol: (symbolId: string) => SignalChange[];
  getSignalStats: () => SignalStats;
  
  // Filters
  setFilter: (filter: SignalFilter) => void;
  clearFilter: () => void;
  setSelectedChange: (change: SignalChange | null) => void;
  setSelectedRule: (rule: SignalMonitorRule | null) => void;
  
  // Bulk operations
  bulkAcknowledgeChanges: (changeIds: string[], userId?: string) => Promise<number>;
  bulkDismissAlerts: (alertIds: string[], userId?: string) => Promise<number>;
  bulkDeleteRules: (ruleIds: string[]) => Promise<number>;
  
  // Utilities
  validateSignalChange: (change: SignalChange) => any;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSignalChangeMonitorStore = create<SignalChangeMonitorStore>()(
  persist(
    (set, get) => ({
      // Initial state
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
      lastUpdate: null,
      
      // Initialize store
      initialize: async () => {
        try {
          set({ isLoading: true });
          await get().refreshData();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isLoading: false
          });
        }
      },
      
      // Start monitoring
      startMonitoring: async (intervalSeconds: number = 30) => {
        try {
          set({ isLoading: true });
          await signalChangeMonitorEngine.startMonitoring(intervalSeconds);
          set({ isMonitoring: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to start monitoring',
            isLoading: false
          });
        }
      },
      
      // Stop monitoring
      stopMonitoring: async () => {
        try {
          set({ isLoading: true });
          await signalChangeMonitorEngine.stopMonitoring();
          set({ isMonitoring: false, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to stop monitoring',
            isLoading: false
          });
        }
      },
      
      // Process signal
      processSignal: (symbolId: string, signal: TradingSignal) => {
        try {
          const change = signalChangeMonitorEngine.processSignal(symbolId, signal);
          if (change) {
            get().refreshData();
          }
          return change;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to process signal'
          });
          return null;
        }
      },
      
      // Create rule
      createRule: async (rule: Omit<SignalMonitorRule, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
          set({ isLoading: true });
          const newRule = signalChangeMonitorEngine.createRule(rule);
          await get().refreshData();
          return newRule;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create rule',
            isLoading: false
          });
          throw error;
        }
      },
      
      // Update rule
      updateRule: async (ruleId: string, updates: Partial<SignalMonitorRule>) => {
        try {
          set({ isLoading: true });
          const success = signalChangeMonitorEngine.updateRule(ruleId, updates);
          if (success) {
            await get().refreshData();
          }
          return success;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update rule',
            isLoading: false
          });
          return false;
        }
      },
      
      // Delete rule
      deleteRule: async (ruleId: string) => {
        try {
          set({ isLoading: true });
          const success = signalChangeMonitorEngine.deleteRule(ruleId);
          if (success) {
            set(state => ({
              selectedRule: state.selectedRule?.id === ruleId ? null : state.selectedRule
            }));
            await get().refreshData();
          }
          return success;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete rule',
            isLoading: false
          });
          return false;
        }
      },
      
      // Acknowledge change
      acknowledgeChange: async (changeId: string, userId?: string) => {
        try {
          const success = signalChangeMonitorEngine.acknowledgeChange(changeId, userId);
          if (success) {
            await get().refreshData();
          }
          return success;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to acknowledge change'
          });
          return false;
        }
      },
      
      // Dismiss alert
      dismissAlert: async (alertId: string, userId?: string) => {
        try {
          const success = signalChangeMonitorEngine.dismissAlert(alertId, userId);
          if (success) {
            await get().refreshData();
          }
          return success;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to dismiss alert'
          });
          return false;
        }
      },
      
      // Get signal history
      getSignalHistory: (symbolId: string, hours: number = 24) => {
        return signalChangeMonitorEngine.getSignalHistory(symbolId, hours);
      },
      
      // Analyze trend
      analyzeTrend: (symbolId: string) => {
        const trend = signalChangeMonitorEngine.analyzeTrend(symbolId);
        if (trend) {
          get().refreshData();
        }
        return trend;
      },
      
      // Refresh data
      refreshData: async () => {
        try {
          set({ isLoading: true });
          
          const changes = signalChangeMonitorEngine.getAllChanges();
          const rules = signalChangeMonitorEngine.getAllRules();
          const alerts = signalChangeMonitorEngine.getAllAlerts();
          const trends = signalChangeMonitorEngine.getActiveTrends();
          const stats = signalChangeMonitorEngine.getSignalStats();
          
          set({
            changes,
            rules,
            alerts,
            trends,
            stats,
            isLoading: false,
            error: null,
            lastUpdate: new Date()
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh data',
            isLoading: false
          });
        }
      },
      
      // Get change by ID
      getChange: (changeId: string) => {
        return signalChangeMonitorEngine.getChange(changeId);
      },
      
      // Get alert by ID
      getAlert: (alertId: string) => {
        return signalChangeMonitorEngine.getAlert(alertId);
      },
      
      // Get trend by ID
      getTrend: (trendId: string) => {
        return signalChangeMonitorEngine.getTrend(trendId);
      },
      
      // Get filtered changes
      getFilteredChanges: () => {
        const { changes, filter } = get();
        let filtered = [...changes];

        if (filter.symbolId) {
          filtered = filtered.filter(change => change.symbolId === filter.symbolId);
        }

        if (filter.strategyId) {
          filtered = filtered.filter(change => change.strategyId === filter.strategyId);
        }

        if (filter.userId) {
          filtered = filtered.filter(change => change.userId === filter.userId);
        }

        if (filter.changeType) {
          filtered = filtered.filter(change => change.changeType === filter.changeType);
        }

        if (filter.impactLevel) {
          filtered = filtered.filter(change => change.impact.level === filter.impactLevel);
        }

        if (filter.acknowledged !== undefined) {
          filtered = filtered.filter(change => change.acknowledged === filter.acknowledged);
        }

        if (filter.minConfidence !== undefined) {
          filtered = filtered.filter(change => change.confidence >= filter.minConfidence!);
        }

        if (filter.source) {
          filtered = filtered.filter(change => change.source === filter.source);
        }

        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          filtered = filtered.filter(change =>
            change.symbolName.toLowerCase().includes(query) ||
            change.description.toLowerCase().includes(query) ||
            change.reasonCode.toLowerCase().includes(query)
          );
        }

        if (filter.dateFrom || filter.dateTo) {
          filtered = filtered.filter(change => {
            if (filter.dateFrom && change.changeTimestamp < filter.dateFrom) return false;
            if (filter.dateTo && change.changeTimestamp > filter.dateTo) return false;
            return true;
          });
        }

        return filtered;
      },
      
      // Get filtered alerts
      getFilteredAlerts: () => {
        const { alerts, filter } = get();
        let filtered = [...alerts];

        if (filter.symbolId) {
          filtered = filtered.filter(alert => alert.symbolId === filter.symbolId);
        }

        if (filter.dismissed !== undefined) {
          filtered = filtered.filter(alert => alert.dismissed === filter.dismissed);
        }

        if (filter.tags && filter.tags.length > 0) {
          filtered = filtered.filter(alert => 
            filter.tags!.some(tag => alert.tags.includes(tag))
          );
        }

        if (filter.dateFrom || filter.dateTo) {
          filtered = filtered.filter(alert => {
            if (filter.dateFrom && alert.createdAt < filter.dateFrom) return false;
            if (filter.dateTo && alert.createdAt > filter.dateTo) return false;
            return true;
          });
        }

        return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      
      // Get filtered trends
      getFilteredTrends: () => {
        const { trends, filter } = get();
        let filtered = [...trends];

        if (filter.symbolId) {
          filtered = filtered.filter(trend => trend.symbolId === filter.symbolId);
        }

        return filtered.sort((a, b) => b.strength - a.strength);
      },
      
      // Get active alerts
      getActiveAlerts: () => {
        const { alerts } = get();
        return alerts.filter(alert => !alert.dismissed);
      },
      
      // Get high impact changes
      getHighImpactChanges: () => {
        const { changes } = get();
        return changes.filter(change => 
          change.impact.level === 'high' || change.impact.level === 'critical'
        );
      },
      
      // Get recent changes
      getRecentChanges: (hours: number = 24) => {
        const { changes } = get();
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return changes.filter(change => change.changeTimestamp >= cutoff);
      },
      
      // Get changes by symbol
      getChangesBySymbol: (symbolId: string) => {
        const { changes } = get();
        return changes.filter(change => change.symbolId === symbolId);
      },
      
      // Get signal stats
      getSignalStats: () => {
        return signalChangeMonitorEngine.getSignalStats();
      },
      
      // Set filter
      setFilter: (filter: SignalFilter) => {
        set({ filter });
      },
      
      // Clear filter
      clearFilter: () => {
        set({ filter: {} });
      },
      
      // Set selected change
      setSelectedChange: (change: SignalChange | null) => {
        set({ selectedChange: change });
      },
      
      // Set selected rule
      setSelectedRule: (rule: SignalMonitorRule | null) => {
        set({ selectedRule: rule });
      },
      
      // Bulk acknowledge changes
      bulkAcknowledgeChanges: async (changeIds: string[], userId?: string) => {
        let successCount = 0;
        for (const id of changeIds) {
          if (await get().acknowledgeChange(id, userId)) {
            successCount++;
          }
        }
        return successCount;
      },
      
      // Bulk dismiss alerts
      bulkDismissAlerts: async (alertIds: string[], userId?: string) => {
        let successCount = 0;
        for (const id of alertIds) {
          if (await get().dismissAlert(id, userId)) {
            successCount++;
          }
        }
        return successCount;
      },
      
      // Bulk delete rules
      bulkDeleteRules: async (ruleIds: string[]) => {
        let successCount = 0;
        for (const id of ruleIds) {
          if (await get().deleteRule(id)) {
            successCount++;
          }
        }
        return successCount;
      },
      
      // Validate signal change
      validateSignalChange: (change: SignalChange) => {
        return signalChangeMonitorEngine.validateSignalChange(change);
      },
      
      // Set loading
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      // Set error
      setError: (error: string | null) => {
        set({ error });
      },
      
      // Reset store
      reset: () => {
        set({
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
      }
    }),
    {
      name: 'signal-change-monitor-store',
      partialize: (state) => ({
        filter: state.filter,
        selectedChange: state.selectedChange,
        selectedRule: state.selectedRule,
        isMonitoring: state.isMonitoring
      })
    }
  )
);

// Auto-refresh data every 30 seconds when monitoring is active
let autoRefreshInterval: NodeJS.Timeout;

// Start auto-refresh
export const startAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(() => {
    const store = useSignalChangeMonitorStore.getState();
    if (store.isMonitoring) {
      store.refreshData();
    }
  }, 30000); // Refresh every 30 seconds
};

// Stop auto-refresh
export const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
};

// Initialize auto-refresh on store creation
startAutoRefresh(); 