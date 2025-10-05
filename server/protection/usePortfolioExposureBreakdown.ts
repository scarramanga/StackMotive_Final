// Block 97: Portfolio Exposure Breakdown - Hook
// React Hook for Portfolio Analysis and Exposure Management

import { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioExposureBreakdownEngine } from '../engines/PortfolioExposureBreakdownEngine';
import {
  PortfolioExposureBreakdown,
  ExposureAnalysis,
  RiskMetrics,
  DiversificationAnalysis,
  GeographicExposure,
  SectorExposure,
  ComparisonResult,
  StressTestResult,
  ValueAtRisk,
  OptimizationResult,
  AnalysisReport,
  StressTestScenario,
  OptimizationConstraints,
  ReportType,
  ExportFormat,
  CalculationProgress,
  UsePortfolioExposureBreakdownReturn
} from '../types/portfolioExposureBreakdown';

export const usePortfolioExposureBreakdown = (): UsePortfolioExposureBreakdownReturn => {
  // State management
  const [breakdowns, setBreakdowns] = useState<PortfolioExposureBreakdown[]>([]);
  const [currentBreakdown, setCurrentBreakdown] = useState<PortfolioExposureBreakdown | null>(null);
  const [exposureAnalysis, setExposureAnalysis] = useState<ExposureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<CalculationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and real-time updates
  const engineRef = useRef<PortfolioExposureBreakdownEngine | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Initialize engine and load data
  useEffect(() => {
    initializeEngine();
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Initialize engine
  const initializeEngine = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      engineRef.current = PortfolioExposureBreakdownEngine.getInstance();
      
      // Load existing breakdowns
      const existingBreakdowns = engineRef.current.getBreakdowns();
      if (mountedRef.current) {
        setBreakdowns(existingBreakdowns);
        
        // Set current breakdown if there's one
        if (existingBreakdowns.length > 0) {
          setCurrentBreakdown(existingBreakdowns[0]);
          
          // Load analysis for current breakdown
          try {
            const analysis = await engineRef.current.analyzePortfolio(existingBreakdowns[0].id);
            if (mountedRef.current) {
              setExposureAnalysis(analysis);
            }
          } catch (analysisError) {
            console.warn('Failed to load initial analysis:', analysisError);
          }
        }
      }
      
      // Start periodic analysis updates
      startAnalysisUpdates();
      
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to initialize portfolio exposure engine');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Start analysis updates
  const startAnalysisUpdates = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    analysisIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !currentBreakdown || !engineRef.current) return;

      try {
        // Update analysis for current breakdown
        const latestAnalysis = await engineRef.current.analyzePortfolio(currentBreakdown.id);
        
        if (mountedRef.current) {
          setExposureAnalysis(latestAnalysis);
          
          // Update current breakdown
          const updatedBreakdown = engineRef.current.getBreakdown(currentBreakdown.id);
          if (updatedBreakdown) {
            setCurrentBreakdown(updatedBreakdown);
          }
        }
        
      } catch (err) {
        if (mountedRef.current) {
          console.error('Failed to update analysis:', err);
        }
      }
    }, 300000); // Update every 5 minutes
  }, [currentBreakdown]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  }, []);

  // Update analysis interval when current breakdown changes
  useEffect(() => {
    if (currentBreakdown) {
      startAnalysisUpdates();
    } else {
      cleanup();
    }
  }, [currentBreakdown, startAnalysisUpdates, cleanup]);

  // Breakdown Operations
  const createBreakdown = useCallback(async (config: Omit<PortfolioExposureBreakdown, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PortfolioExposureBreakdown> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const newBreakdown = engineRef.current.createBreakdown(config);
      
      if (mountedRef.current) {
        setBreakdowns(prevBreakdowns => [...prevBreakdowns, newBreakdown]);
        
        // Set as current breakdown if it's the first one
        if (breakdowns.length === 0) {
          setCurrentBreakdown(newBreakdown);
        }
      }
      
      return newBreakdown;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create breakdown';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [breakdowns.length]);

  const updateBreakdown = useCallback(async (id: string, updates: Partial<PortfolioExposureBreakdown>): Promise<PortfolioExposureBreakdown> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const updatedBreakdown = engineRef.current.updateBreakdown(id, updates);
      
      if (mountedRef.current) {
        setBreakdowns(prevBreakdowns => prevBreakdowns.map(breakdown => 
          breakdown.id === id ? updatedBreakdown : breakdown
        ));
        
        // Update current breakdown if it's the one being updated
        if (currentBreakdown?.id === id) {
          setCurrentBreakdown(updatedBreakdown);
        }
      }
      
      return updatedBreakdown;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update breakdown';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentBreakdown]);

  const deleteBreakdown = useCallback(async (id: string): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      engineRef.current.deleteBreakdown(id);
      
      if (mountedRef.current) {
        setBreakdowns(prevBreakdowns => prevBreakdowns.filter(breakdown => breakdown.id !== id));
        
        // Clear current breakdown if it's the one being deleted
        if (currentBreakdown?.id === id) {
          const remainingBreakdowns = breakdowns.filter(breakdown => breakdown.id !== id);
          if (remainingBreakdowns.length > 0) {
            setCurrentBreakdown(remainingBreakdowns[0]);
          } else {
            setCurrentBreakdown(null);
            setExposureAnalysis(null);
          }
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete breakdown';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentBreakdown, breakdowns]);

  // Analysis Operations
  const analyzePortfolio = useCallback(async (breakdownId: string): Promise<ExposureAnalysis> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      // Simulate progress updates
      setCalculationProgress({
        stage: 'Initializing',
        progress: 0,
        estimatedTimeRemaining: 10000,
        currentOperation: 'Setting up analysis parameters'
      });

      // Update progress periodically
      const progressInterval = setInterval(() => {
        setCalculationProgress(prev => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + 10, 90);
          return {
            ...prev,
            progress: newProgress,
            estimatedTimeRemaining: Math.max(prev.estimatedTimeRemaining - 1000, 1000),
            currentOperation: getOperationForProgress(newProgress)
          };
        });
      }, 1000);

      const analysis = await engineRef.current.analyzePortfolio(breakdownId);
      
      clearInterval(progressInterval);
      
      if (mountedRef.current) {
        setCalculationProgress({
          stage: 'Completed',
          progress: 100,
          estimatedTimeRemaining: 0,
          currentOperation: 'Analysis complete'
        });
        
        // Update analysis if this is the current breakdown
        if (currentBreakdown?.id === breakdownId) {
          setExposureAnalysis(analysis);
        }
        
        // Clear progress after a short delay
        setTimeout(() => {
          if (mountedRef.current) {
            setCalculationProgress(null);
          }
        }, 2000);
      }
      
      return analysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze portfolio';
      if (mountedRef.current) {
        setError(errorMessage);
        setCalculationProgress(null);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [currentBreakdown]);

  const refreshAnalysis = useCallback(async (breakdownId: string): Promise<ExposureAnalysis> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const analysis = await engineRef.current.refreshAnalysis(breakdownId);
      
      if (mountedRef.current) {
        // Update analysis if this is the current breakdown
        if (currentBreakdown?.id === breakdownId) {
          setExposureAnalysis(analysis);
        }
      }
      
      return analysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh analysis';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [currentBreakdown]);

  const comparePortfolios = useCallback(async (breakdownId1: string, breakdownId2: string): Promise<ComparisonResult> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const comparison = await engineRef.current.comparePortfolios(breakdownId1, breakdownId2);
      
      return comparison;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare portfolios';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  // Exposure Calculations
  const calculateSectorExposure = useCallback(async (breakdownId: string): Promise<SectorExposure> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const sectorExposure = await engineRef.current.calculateSectorExposure(breakdownId);
      
      return sectorExposure;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate sector exposure';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const calculateGeographicExposure = useCallback(async (breakdownId: string): Promise<GeographicExposure> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const geographicExposure = await engineRef.current.calculateGeographicExposure(breakdownId);
      
      return geographicExposure;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate geographic exposure';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const calculateRiskMetrics = useCallback(async (breakdownId: string): Promise<RiskMetrics> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const riskMetrics = await engineRef.current.calculateRiskMetrics(breakdownId);
      
      return riskMetrics;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate risk metrics';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  // Risk Analysis
  const performStressTesting = useCallback(async (breakdownId: string, scenarios: StressTestScenario[]): Promise<StressTestResult[]> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const stressTestResults = await engineRef.current.performStressTesting(breakdownId, scenarios);
      
      return stressTestResults;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform stress testing';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const calculateVaR = useCallback(async (breakdownId: string, confidence: number, horizon: number): Promise<ValueAtRisk> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const var = await engineRef.current.calculateVaR(breakdownId, confidence, horizon);
      
      return var;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate VaR';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  // Diversification Analysis
  const analyzeDiversification = useCallback(async (breakdownId: string): Promise<DiversificationAnalysis> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const diversificationAnalysis = await engineRef.current.analyzeDiversification(breakdownId);
      
      return diversificationAnalysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze diversification';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const optimizePortfolio = useCallback(async (breakdownId: string, constraints: OptimizationConstraints): Promise<OptimizationResult> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const optimizationResult = await engineRef.current.optimizePortfolio(breakdownId, constraints);
      
      return optimizationResult;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize portfolio';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  // Reporting
  const generateReport = useCallback(async (breakdownId: string, reportType: ReportType): Promise<AnalysisReport> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const report = await engineRef.current.generateReport(breakdownId, reportType);
      
      return report;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  const exportAnalysis = useCallback(async (breakdownId: string, format: ExportFormat): Promise<string> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      const exportedData = await engineRef.current.exportAnalysis(breakdownId, format);
      
      return exportedData;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export analysis';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  // Utility Functions
  const setCurrentBreakdownById = useCallback((breakdownId: string | null) => {
    if (!breakdownId) {
      setCurrentBreakdown(null);
      setExposureAnalysis(null);
      return;
    }

    const breakdown = breakdowns.find(b => b.id === breakdownId);
    if (breakdown) {
      setCurrentBreakdown(breakdown);
      
      // Load analysis for the new current breakdown
      if (engineRef.current) {
        engineRef.current.analyzePortfolio(breakdownId)
          .then(analysis => {
            if (mountedRef.current) {
              setExposureAnalysis(analysis);
            }
          })
          .catch(err => {
            if (mountedRef.current) {
              setError(err instanceof Error ? err.message : 'Failed to load analysis for new current breakdown');
            }
          });
      }
    }
  }, [breakdowns]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Refresh all breakdowns
      const allBreakdowns = engineRef.current.getBreakdowns();
      if (mountedRef.current) {
        setBreakdowns(allBreakdowns);
      }
      
      // Refresh current breakdown analysis if exists
      if (currentBreakdown) {
        const analysis = await engineRef.current.analyzePortfolio(currentBreakdown.id);
        if (mountedRef.current) {
          setExposureAnalysis(analysis);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentBreakdown]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    breakdowns,
    currentBreakdown,
    exposureAnalysis,
    
    // Loading states
    isLoading,
    isAnalyzing,
    calculationProgress,
    
    // Breakdown operations
    createBreakdown,
    updateBreakdown,
    deleteBreakdown,
    
    // Analysis operations
    analyzePortfolio,
    refreshAnalysis,
    comparePortfolios,
    
    // Exposure calculations
    calculateSectorExposure,
    calculateGeographicExposure,
    calculateRiskMetrics,
    
    // Risk analysis
    performStressTesting,
    calculateVaR,
    
    // Diversification analysis
    analyzeDiversification,
    optimizePortfolio,
    
    // Reporting
    generateReport,
    exportAnalysis,
    
    // Utility functions
    setCurrentBreakdown: setCurrentBreakdownById,
    refreshData,
    
    // Error handling
    error,
    clearError
  };
};

// Helper function for progress updates
const getOperationForProgress = (progress: number): string => {
  if (progress < 20) return 'Loading portfolio data';
  if (progress < 40) return 'Calculating exposures';
  if (progress < 60) return 'Analyzing risk metrics';
  if (progress < 80) return 'Computing correlations';
  if (progress < 95) return 'Generating insights';
  return 'Finalizing analysis';
};

export default usePortfolioExposureBreakdown; 