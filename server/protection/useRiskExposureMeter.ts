// Block 77: Risk Exposure Meter - Hook
// React Integration for Comprehensive Risk Analytics

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RiskExposureMeterEngine } from '../engines/RiskExposureMeterEngine';
import {
  RiskExposureMeter,
  RiskAlert,
  RiskMeterFilter,
  StressTestRequest,
  StressTestResponse,
  RiskThreshold,
  RiskComplianceStatus,
  UseRiskExposureMeterReturn,
  PortfolioRiskMetrics,
  RiskLevel
} from '../types/riskExposureMeter';

export const useRiskExposureMeter = (): UseRiskExposureMeterReturn => {
  // Core state
  const [meters, setMeters] = useState<RiskExposureMeter[]>([]);
  const [currentMeter, setCurrentMeter] = useState<RiskExposureMeter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filter, setFilter] = useState<RiskMeterFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Engine instance
  const engine = useMemo(() => RiskExposureMeterEngine.getInstance(), []);
  
  // Monitoring state
  const [monitoringMeters, setMonitoringMeters] = useState<Set<string>>(new Set());
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize data
  useEffect(() => {
    loadMeters();
  }, []);

  // Auto-refresh for monitoring
  useEffect(() => {
    if (monitoringMeters.size > 0) {
      const interval = setInterval(() => {
        refreshMonitoredMeters();
      }, 30000); // 30 second refresh
      
      setMonitoringInterval(interval);
      return () => clearInterval(interval);
    } else if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringMeters.size]);

  // Load all meters
  const loadMeters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allMeters = engine.getMeters();
      setMeters(allMeters);
      
      // Set first meter as current if none selected
      if (!currentMeter && allMeters.length > 0) {
        setCurrentMeter(allMeters[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meters');
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentMeter]);

  // Create new meter
  const createMeter = useCallback(async (
    config: Omit<RiskExposureMeter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<RiskExposureMeter> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newMeter = engine.createMeter(config);
      
      // Update state
      setMeters(prev => [...prev, newMeter]);
      setCurrentMeter(newMeter);
      
      return newMeter;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meter';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Update meter
  const updateMeter = useCallback(async (
    id: string, 
    updates: Partial<RiskExposureMeter>
  ): Promise<RiskExposureMeter> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedMeter = engine.updateMeter(id, updates);
      
      // Update state
      setMeters(prev => prev.map(meter => 
        meter.id === id ? updatedMeter : meter
      ));
      
      // Update current meter if it's the one being updated
      if (currentMeter?.id === id) {
        setCurrentMeter(updatedMeter);
      }
      
      return updatedMeter;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update meter';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentMeter]);

  // Delete meter
  const deleteMeter = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      engine.deleteMeter(id);
      
      // Update state
      setMeters(prev => prev.filter(meter => meter.id !== id));
      
      // Clear current meter if it was deleted
      if (currentMeter?.id === id) {
        const remainingMeters = meters.filter(meter => meter.id !== id);
        setCurrentMeter(remainingMeters.length > 0 ? remainingMeters[0] : null);
      }
      
      // Stop monitoring if it was being monitored
      if (monitoringMeters.has(id)) {
        stopMonitoring(id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete meter';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentMeter, meters, monitoringMeters]);

  // Calculate risk metrics
  const calculateRisk = useCallback(async (meterId: string): Promise<PortfolioRiskMetrics> => {
    try {
      setIsCalculating(true);
      setError(null);
      
      const meter = meters.find(m => m.id === meterId);
      if (!meter) {
        throw new Error('Meter not found');
      }
      
      const metrics = engine.calculateRiskMetrics(meter);
      
      // Update meter in state
      setMeters(prev => prev.map(m => 
        m.id === meterId ? { ...m, riskMetrics: metrics, lastCalculated: new Date() } : m
      ));
      
      // Update current meter if it's the one being calculated
      if (currentMeter?.id === meterId) {
        setCurrentMeter(prev => prev ? { ...prev, riskMetrics: metrics, lastCalculated: new Date() } : null);
      }
      
      return metrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate risk';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  }, [engine, meters, currentMeter]);

  // Run stress test
  const runStressTest = useCallback(async (request: StressTestRequest): Promise<StressTestResponse> => {
    try {
      setIsStressTesting(true);
      setError(null);
      
      const response = engine.runStressTest(request);
      
      // Update meter with stress test results
      if (response.success && response.results) {
        const meter = meters.find(m => m.id === request.meterId);
        if (meter) {
          const updatedMeter = {
            ...meter,
            stressTestResults: [...meter.stressTestResults, ...response.results],
            lastCalculated: new Date()
          };
          
          setMeters(prev => prev.map(m => 
            m.id === request.meterId ? updatedMeter : m
          ));
          
          if (currentMeter?.id === request.meterId) {
            setCurrentMeter(updatedMeter);
          }
        }
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run stress test';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsStressTesting(false);
    }
  }, [engine, meters, currentMeter]);

  // Get active alerts for a meter
  const getActiveAlerts = useCallback((meterId: string): RiskAlert[] => {
    const meter = meters.find(m => m.id === meterId);
    return meter?.riskAlerts.filter(alert => alert.status === 'active') || [];
  }, [meters]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      setError(null);
      
      // Find and update the alert
      const updatedMeters = meters.map(meter => ({
        ...meter,
        riskAlerts: meter.riskAlerts.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'acknowledged' as const, acknowledgedAt: new Date() }
            : alert
        )
      }));
      
      setMeters(updatedMeters);
      
      // Update current meter if needed
      if (currentMeter) {
        const updatedCurrentMeter = updatedMeters.find(m => m.id === currentMeter.id);
        if (updatedCurrentMeter) {
          setCurrentMeter(updatedCurrentMeter);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [meters, currentMeter]);

  // Resolve alert
  const resolveAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      setError(null);
      
      // Find and update the alert
      const updatedMeters = meters.map(meter => ({
        ...meter,
        riskAlerts: meter.riskAlerts.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'resolved' as const, resolvedAt: new Date() }
            : alert
        )
      }));
      
      setMeters(updatedMeters);
      
      // Update current meter if needed
      if (currentMeter) {
        const updatedCurrentMeter = updatedMeters.find(m => m.id === currentMeter.id);
        if (updatedCurrentMeter) {
          setCurrentMeter(updatedCurrentMeter);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [meters, currentMeter]);

  // Update thresholds
  const updateThresholds = useCallback(async (
    meterId: string, 
    thresholds: RiskThreshold[]
  ): Promise<void> => {
    try {
      setError(null);
      
      const updatedMeter = await updateMeter(meterId, { riskThresholds: thresholds });
      
      // Recalculate risk to check new thresholds
      await calculateRisk(meterId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update thresholds';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [updateMeter, calculateRisk]);

  // Check compliance
  const checkCompliance = useCallback(async (meterId: string): Promise<RiskComplianceStatus> => {
    try {
      setError(null);
      
      const meter = meters.find(m => m.id === meterId);
      if (!meter) {
        throw new Error('Meter not found');
      }
      
      // Return current compliance status
      return meter.riskCompliance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check compliance';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [meters]);

  // Filter meters
  const filterMeters = useCallback((newFilter: RiskMeterFilter) => {
    setFilter(newFilter);
  }, []);

  // Search meters
  const searchMeters = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Start monitoring
  const startMonitoring = useCallback((meterId: string) => {
    setMonitoringMeters(prev => new Set(prev).add(meterId));
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback((meterId: string) => {
    setMonitoringMeters(prev => {
      const updated = new Set(prev);
      updated.delete(meterId);
      return updated;
    });
  }, []);

  // Refresh monitored meters
  const refreshMonitoredMeters = useCallback(async () => {
    try {
      const meterIds = Array.from(monitoringMeters);
      for (const meterId of meterIds) {
        await calculateRisk(meterId);
      }
    } catch (err) {
      // Don't set error for background refresh failures
      console.error('Failed to refresh monitored meters:', err);
    }
  }, [monitoringMeters, calculateRisk]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const filteredMeters = useMemo(() => {
    let filtered = meters;
    
    // Apply engine filtering
    if (Object.keys(filter).length > 0) {
      filtered = engine.filterMeters(filtered, filter);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const searchFilter: RiskMeterFilter = { searchTerm: searchQuery.trim() };
      filtered = engine.filterMeters(filtered, searchFilter);
    }
    
    return filtered;
  }, [meters, filter, searchQuery, engine]);

  // Risk statistics
  const riskStats = useMemo(() => {
    if (filteredMeters.length === 0) return null;
    
    const totalValue = filteredMeters.reduce((sum, meter) => sum + meter.portfolioValue, 0);
    const avgRiskScore = filteredMeters.reduce((sum, meter) => sum + meter.riskScore, 0) / filteredMeters.length;
    
    const riskLevelCounts = filteredMeters.reduce((counts, meter) => {
      counts[meter.overallRiskLevel] = (counts[meter.overallRiskLevel] || 0) + 1;
      return counts;
    }, {} as Record<RiskLevel, number>);
    
    const activeAlertCount = filteredMeters.reduce((count, meter) => {
      return count + meter.riskAlerts.filter(alert => alert.status === 'active').length;
    }, 0);
    
    return {
      totalValue,
      avgRiskScore,
      riskLevelCounts,
      activeAlertCount,
      meterCount: filteredMeters.length
    };
  }, [filteredMeters]);

  // Quick actions
  const quickActions = useMemo(() => ({
    // Calculate risk for all meters
    calculateAllRisk: async () => {
      for (const meter of meters) {
        await calculateRisk(meter.id);
      }
    },
    
    // Get meters by risk level
    getMetersByRiskLevel: (level: RiskLevel) => {
      return filteredMeters.filter(meter => meter.overallRiskLevel === level);
    },
    
    // Get meters with active alerts
    getMetersWithAlerts: () => {
      return filteredMeters.filter(meter => 
        meter.riskAlerts.some(alert => alert.status === 'active')
      );
    },
    
    // Get compliance issues
    getComplianceIssues: () => {
      return filteredMeters.filter(meter => 
        meter.riskCompliance.overallStatus !== 'compliant'
      );
    }
  }), [meters, filteredMeters, calculateRisk]);

  return {
    // Data
    meters: filteredMeters,
    currentMeter,
    
    // Loading states
    isLoading,
    isCalculating,
    isStressTesting,
    
    // Meter operations
    createMeter,
    updateMeter,
    deleteMeter,
    
    // Risk calculations
    calculateRisk,
    runStressTest,
    
    // Alert management
    getActiveAlerts,
    acknowledgeAlert,
    resolveAlert,
    
    // Threshold management
    updateThresholds,
    
    // Compliance monitoring
    checkCompliance,
    
    // Filtering and search
    filterMeters,
    searchMeters,
    
    // Real-time monitoring
    startMonitoring,
    stopMonitoring,
    
    // Error handling
    error,
    clearError,
    
    // Additional computed values
    riskStats,
    quickActions,
    
    // Current filter state
    currentFilter: filter,
    currentSearchQuery: searchQuery,
    
    // Monitoring state
    monitoringMeters: Array.from(monitoringMeters),
    
    // Utility functions
    setCurrentMeter,
    refreshData: loadMeters
  };
};

export default useRiskExposureMeter; 