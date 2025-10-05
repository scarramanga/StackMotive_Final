// Block 78: Portfolio Sync Engine - Hook
// React Integration for Portfolio Synchronization

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioSyncEngineManager } from '../engines/PortfolioSyncEngine';
import {
  PortfolioSyncEngine,
  SyncOperationRequest,
  SyncOperationResponse,
  BrokerConnection,
  SyncStatus,
  SyncRecord,
  SyncConflict,
  SyncIssue,
  PortfolioSyncFilter,
  UsePortfolioSyncEngineReturn,
  ConflictStrategy,
  SyncStatusType
} from '../types/portfolioSyncEngine';

export const usePortfolioSyncEngine = (): UsePortfolioSyncEngineReturn => {
  // Core state
  const [engines, setEngines] = useState<PortfolioSyncEngine[]>([]);
  const [currentEngine, setCurrentEngine] = useState<PortfolioSyncEngine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<PortfolioSyncFilter>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Engine manager instance
  const manager = useMemo(() => PortfolioSyncEngineManager.getInstance(), []);

  // Monitoring state
  const [monitoringEngines, setMonitoringEngines] = useState<Set<string>>(new Set());
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize data
  useEffect(() => {
    loadEngines();
  }, []);

  // Auto-refresh for monitoring
  useEffect(() => {
    if (monitoringEngines.size > 0) {
      const interval = setInterval(() => {
        refreshMonitoredEngines();
      }, 30000); // 30 second refresh

      setMonitoringInterval(interval);
      return () => clearInterval(interval);
    } else if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringEngines.size]);

  // Load all engines
  const loadEngines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allEngines = manager.getEngines();
      setEngines(allEngines);

      // Set first engine as current if none selected
      if (!currentEngine && allEngines.length > 0) {
        setCurrentEngine(allEngines[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load engines');
    } finally {
      setIsLoading(false);
    }
  }, [manager, currentEngine]);

  // Create new engine
  const createEngine = useCallback(async (
    config: Omit<PortfolioSyncEngine, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<PortfolioSyncEngine> => {
    try {
      setIsLoading(true);
      setError(null);

      const newEngine = manager.createEngine(config);

      // Update state
      setEngines(prev => [...prev, newEngine]);
      setCurrentEngine(newEngine);

      return newEngine;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create engine';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  // Update engine
  const updateEngine = useCallback(async (
    id: string,
    updates: Partial<PortfolioSyncEngine>
  ): Promise<PortfolioSyncEngine> => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedEngine = manager.updateEngine(id, updates);

      // Update state
      setEngines(prev => prev.map(engine =>
        engine.id === id ? updatedEngine : engine
      ));

      // Update current engine if it's the one being updated
      if (currentEngine?.id === id) {
        setCurrentEngine(updatedEngine);
      }

      return updatedEngine;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update engine';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [manager, currentEngine]);

  // Delete engine
  const deleteEngine = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      manager.deleteEngine(id);

      // Update state
      setEngines(prev => prev.filter(engine => engine.id !== id));

      // Clear current engine if it was deleted
      if (currentEngine?.id === id) {
        const remainingEngines = engines.filter(engine => engine.id !== id);
        setCurrentEngine(remainingEngines.length > 0 ? remainingEngines[0] : null);
      }

      // Stop monitoring if it was being monitored
      if (monitoringEngines.has(id)) {
        stopMonitoring(id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete engine';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [manager, currentEngine, engines, monitoringEngines]);

  // Start sync operation
  const startSync = useCallback(async (request: SyncOperationRequest): Promise<SyncOperationResponse> => {
    try {
      setIsSyncing(true);
      setError(null);

      const response = await manager.startSync(request);

      if (response.success) {
        // Update engine status in state
        const engine = engines.find(e => e.id === request.engineId);
        if (engine) {
          engine.syncStatus.overallStatus = 'syncing';
          engine.syncStatus.statusMessage = 'Sync started';
          setEngines(prev => prev.map(e => e.id === request.engineId ? engine : e));
          
          if (currentEngine?.id === request.engineId) {
            setCurrentEngine(engine);
          }
        }
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start sync';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [manager, engines, currentEngine]);

  // Pause sync
  const pauseSync = useCallback(async (engineId: string): Promise<void> => {
    try {
      setError(null);
      await manager.pauseSync(engineId);
      
      // Update engine status
      updateEngineStatusInState(engineId, 'paused', 'Sync paused');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause sync';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [manager]);

  // Resume sync
  const resumeSync = useCallback(async (engineId: string): Promise<void> => {
    try {
      setError(null);
      await manager.resumeSync(engineId);
      
      // Update engine status
      updateEngineStatusInState(engineId, 'syncing', 'Sync resumed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume sync';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [manager]);

  // Cancel sync
  const cancelSync = useCallback(async (engineId: string): Promise<void> => {
    try {
      setError(null);
      await manager.cancelSync(engineId);
      
      // Update engine status
      updateEngineStatusInState(engineId, 'cancelled', 'Sync cancelled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel sync';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [manager]);

  // Connect broker
  const connectBroker = useCallback(async (
    engineId: string,
    brokerConfig: BrokerConnection
  ): Promise<BrokerConnection> => {
    try {
      setIsConnecting(true);
      setError(null);

      const connectedBroker = await manager.connectBroker(engineId, brokerConfig);

      // Update engine in state
      const engine = engines.find(e => e.id === engineId);
      if (engine) {
        engine.brokerConnections.push(connectedBroker);
        setEngines(prev => prev.map(e => e.id === engineId ? engine : e));
        
        if (currentEngine?.id === engineId) {
          setCurrentEngine(engine);
        }
      }

      return connectedBroker;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect broker';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [manager, engines, currentEngine]);

  // Disconnect broker
  const disconnectBroker = useCallback(async (engineId: string, brokerId: string): Promise<void> => {
    try {
      setError(null);
      await manager.disconnectBroker(engineId, brokerId);

      // Update engine in state
      const engine = engines.find(e => e.id === engineId);
      if (engine) {
        engine.brokerConnections = engine.brokerConnections.filter(b => b.id !== brokerId);
        setEngines(prev => prev.map(e => e.id === engineId ? engine : e));
        
        if (currentEngine?.id === engineId) {
          setCurrentEngine(engine);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect broker';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [manager, engines, currentEngine]);

  // Test broker connection
  const testBrokerConnection = useCallback(async (brokerId: string): Promise<boolean> => {
    try {
      setError(null);
      const broker = findBrokerById(brokerId);
      if (!broker) {
        throw new Error('Broker not found');
      }

      const result = await manager.testBrokerConnection(broker);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test broker connection';
      setError(errorMessage);
      return false;
    }
  }, []);

  // Get sync status
  const getSyncStatus = useCallback((engineId: string): SyncStatus => {
    try {
      return manager.getSyncStatus(engineId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync status');
      throw err;
    }
  }, [manager]);

  // Get sync history
  const getSyncHistory = useCallback((engineId: string, limit?: number): SyncRecord[] => {
    try {
      return manager.getSyncHistory(engineId, limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync history');
      return [];
    }
  }, [manager]);

  // Get active issues
  const getActiveIssues = useCallback((engineId: string): SyncIssue[] => {
    try {
      return manager.getActiveIssues(engineId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get active issues');
      return [];
    }
  }, [manager]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: ConflictStrategy
  ): Promise<void> => {
    try {
      setError(null);
      await manager.resolveConflict(conflictId, resolution);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve conflict';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [manager]);

  // Get pending conflicts
  const getPendingConflicts = useCallback((engineId: string): SyncConflict[] => {
    try {
      return manager.getPendingConflicts(engineId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get pending conflicts');
      return [];
    }
  }, [manager]);

  // Filter engines
  const filterEngines = useCallback((newFilter: PortfolioSyncFilter) => {
    setFilter(newFilter);
  }, []);

  // Search engines
  const searchEngines = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Start monitoring
  const startMonitoring = useCallback((engineId: string) => {
    setMonitoringEngines(prev => new Set(prev).add(engineId));
    manager.startMonitoring(engineId);
  }, [manager]);

  // Stop monitoring
  const stopMonitoring = useCallback((engineId: string) => {
    setMonitoringEngines(prev => {
      const updated = new Set(prev);
      updated.delete(engineId);
      return updated;
    });
    manager.stopMonitoring(engineId);
  }, [manager]);

  // Refresh monitored engines
  const refreshMonitoredEngines = useCallback(async () => {
    try {
      const monitoredIds = Array.from(monitoringEngines);
      for (const engineId of monitoredIds) {
        const engine = manager.getEngine(engineId);
        if (engine) {
          // Update engine in state
          setEngines(prev => prev.map(e => e.id === engineId ? engine : e));
          
          if (currentEngine?.id === engineId) {
            setCurrentEngine(engine);
          }
        }
      }
    } catch (err) {
      // Don't set error for background refresh failures
      console.error('Failed to refresh monitored engines:', err);
    }
  }, [monitoringEngines, manager, currentEngine]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper functions
  const updateEngineStatusInState = useCallback((
    engineId: string,
    status: SyncStatusType,
    message: string
  ) => {
    setEngines(prev => prev.map(engine => {
      if (engine.id === engineId) {
        return {
          ...engine,
          syncStatus: {
            ...engine.syncStatus,
            overallStatus: status,
            statusMessage: message
          }
        };
      }
      return engine;
    }));

    if (currentEngine?.id === engineId) {
      setCurrentEngine(prev => prev ? {
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          overallStatus: status,
          statusMessage: message
        }
      } : null);
    }
  }, [currentEngine]);

  const findBrokerById = useCallback((brokerId: string): BrokerConnection | null => {
    for (const engine of engines) {
      const broker = engine.brokerConnections.find(b => b.id === brokerId);
      if (broker) return broker;
    }
    return null;
  }, [engines]);

  // Computed values
  const filteredEngines = useMemo(() => {
    let filtered = engines;

    // Apply manager filtering
    if (Object.keys(filter).length > 0) {
      filtered = manager.filterEngines(filtered, filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const searchFilter: PortfolioSyncFilter = { searchTerm: searchQuery.trim() };
      filtered = manager.filterEngines(filtered, searchFilter);
    }

    return filtered;
  }, [engines, filter, searchQuery, manager]);

  // Engine statistics
  const engineStats = useMemo(() => {
    if (filteredEngines.length === 0) return null;

    const activeEngines = filteredEngines.filter(e => e.isActive).length;
    const syncingEngines = filteredEngines.filter(e => e.syncStatus.overallStatus === 'syncing').length;
    const enginesWithIssues = filteredEngines.filter(e => e.syncStatus.activeIssues.length > 0).length;
    
    const totalBrokers = filteredEngines.reduce((sum, engine) => sum + engine.brokerConnections.length, 0);
    const connectedBrokers = filteredEngines.reduce((sum, engine) => 
      sum + engine.brokerConnections.filter(b => b.connectionStatus === 'connected').length, 0
    );

    const avgSyncRate = filteredEngines.reduce((sum, engine) => 
      sum + engine.performanceMetrics.syncSuccessRate, 0
    ) / filteredEngines.length;

    return {
      totalEngines: filteredEngines.length,
      activeEngines,
      syncingEngines,
      enginesWithIssues,
      totalBrokers,
      connectedBrokers,
      avgSyncRate
    };
  }, [filteredEngines]);

  // Quick actions
  const quickActions = useMemo(() => ({
    // Start sync for all engines
    syncAllEngines: async () => {
      for (const engine of filteredEngines.filter(e => e.isActive)) {
        try {
          await startSync({
            engineId: engine.id,
            operationType: 'incremental_sync'
          });
        } catch (error) {
          console.error(`Failed to sync engine ${engine.id}:`, error);
        }
      }
    },

    // Get engines by status
    getEnginesByStatus: (status: SyncStatusType) => {
      return filteredEngines.filter(engine => engine.syncStatus.overallStatus === status);
    },

    // Get engines with issues
    getEnginesWithIssues: () => {
      return filteredEngines.filter(engine => engine.syncStatus.activeIssues.length > 0);
    },

    // Get connected brokers across all engines
    getConnectedBrokers: () => {
      const allBrokers: BrokerConnection[] = [];
      filteredEngines.forEach(engine => {
        engine.brokerConnections.forEach(broker => {
          if (broker.connectionStatus === 'connected') {
            allBrokers.push(broker);
          }
        });
      });
      return allBrokers;
    },

    // Get sync performance summary
    getPerformanceSummary: () => {
      const totalRecords = filteredEngines.reduce((sum, engine) => 
        sum + engine.syncStatus.stats.totalRecords, 0
      );
      const successfulSyncs = filteredEngines.reduce((sum, engine) => 
        sum + engine.syncStatus.stats.successfulSyncs, 0
      );
      const failedSyncs = filteredEngines.reduce((sum, engine) => 
        sum + engine.syncStatus.stats.failedSyncs, 0
      );

      return {
        totalRecords,
        successfulSyncs,
        failedSyncs,
        successRate: totalRecords > 0 ? (successfulSyncs / (successfulSyncs + failedSyncs)) * 100 : 0
      };
    }
  }), [filteredEngines, startSync]);

  return {
    // Data
    engines: filteredEngines,
    currentEngine,

    // Loading states
    isLoading,
    isSyncing,
    isConnecting,

    // Engine operations
    createEngine,
    updateEngine,
    deleteEngine,

    // Sync operations
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,

    // Broker operations
    connectBroker,
    disconnectBroker,
    testBrokerConnection,

    // Monitoring
    getSyncStatus,
    getSyncHistory,
    getActiveIssues,

    // Conflict resolution
    resolveConflict,
    getPendingConflicts,

    // Filtering and search
    filterEngines,
    searchEngines,

    // Real-time monitoring
    startMonitoring,
    stopMonitoring,

    // Error handling
    error,
    clearError,

    // Additional computed values
    engineStats,
    quickActions,

    // Current filter state
    currentFilter: filter,
    currentSearchQuery: searchQuery,

    // Monitoring state
    monitoringEngines: Array.from(monitoringEngines),

    // Utility functions
    setCurrentEngine,
    refreshData: loadEngines
  };
};

export default usePortfolioSyncEngine; 