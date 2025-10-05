// Block 95: Market Sentiment Bar - Hook
// React Hook for Real-time Market Sentiment Management

import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketSentimentBarEngine } from '../engines/MarketSentimentBarEngine';
import {
  MarketSentimentBar,
  SentimentReading,
  SentimentDataSource,
  SentimentHistory,
  TrendAnalysis,
  SentimentComparison,
  TimeRange,
  UseMarketSentimentBarReturn
} from '../types/marketSentimentBar';

export const useMarketSentimentBar = (): UseMarketSentimentBarReturn => {
  // State management
  const [bars, setBars] = useState<MarketSentimentBar[]>([]);
  const [currentBar, setCurrentBar] = useState<MarketSentimentBar | null>(null);
  const [realtimeData, setRealtimeData] = useState<SentimentReading | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and real-time updates
  const engineRef = useRef<MarketSentimentBarEngine | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      
      engineRef.current = MarketSentimentBarEngine.getInstance();
      
      // Load existing bars
      const existingBars = engineRef.current.getBars();
      if (mountedRef.current) {
        setBars(existingBars);
        
        // Set current bar if there's one
        if (existingBars.length > 0) {
          setCurrentBar(existingBars[0]);
        }
      }
      
      // Start real-time updates
      startRealtimeUpdates();
      
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to initialize sentiment engine');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Start real-time updates
  const startRealtimeUpdates = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
    }

    realtimeIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !currentBar || !engineRef.current) return;

      try {
        setIsUpdating(true);
        
        // Get latest sentiment reading
        const latestSentiment = await engineRef.current.getCurrentSentiment(currentBar.id);
        
        if (mountedRef.current) {
          setRealtimeData(latestSentiment);
          
          // Update current bar
          const updatedBar = engineRef.current.getBar(currentBar.id);
          if (updatedBar) {
            setCurrentBar(updatedBar);
          }
        }
        
      } catch (err) {
        if (mountedRef.current) {
          console.error('Failed to update sentiment:', err);
        }
      } finally {
        if (mountedRef.current) {
          setIsUpdating(false);
        }
      }
    }, 30000); // Update every 30 seconds
  }, [currentBar]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }
  }, []);

  // Update real-time interval when current bar changes
  useEffect(() => {
    if (currentBar) {
      startRealtimeUpdates();
    } else {
      cleanup();
    }
  }, [currentBar, startRealtimeUpdates, cleanup]);

  // Bar Operations
  const createBar = useCallback(async (config: Omit<MarketSentimentBar, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<MarketSentimentBar> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const newBar = engineRef.current.createBar(config);
      
      if (mountedRef.current) {
        setBars(prevBars => [...prevBars, newBar]);
        
        // Set as current bar if it's the first one
        if (bars.length === 0) {
          setCurrentBar(newBar);
        }
      }
      
      return newBar;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sentiment bar';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [bars.length]);

  const updateBar = useCallback(async (id: string, updates: Partial<MarketSentimentBar>): Promise<MarketSentimentBar> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedBar = engineRef.current.updateBar(id, updates);
      
      if (mountedRef.current) {
        setBars(prevBars => prevBars.map(bar => 
          bar.id === id ? updatedBar : bar
        ));
        
        // Update current bar if it's the one being updated
        if (currentBar?.id === id) {
          setCurrentBar(updatedBar);
        }
      }
      
      return updatedBar;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sentiment bar';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  const deleteBar = useCallback(async (id: string): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      engineRef.current.deleteBar(id);
      
      if (mountedRef.current) {
        setBars(prevBars => prevBars.filter(bar => bar.id !== id));
        
        // Clear current bar if it's the one being deleted
        if (currentBar?.id === id) {
          setCurrentBar(null);
          setRealtimeData(null);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sentiment bar';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentBar]);

  // Sentiment Operations
  const getCurrentSentiment = useCallback(async (barId: string): Promise<SentimentReading> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const sentiment = await engineRef.current.getCurrentSentiment(barId);
      
      if (mountedRef.current) {
        // Update realtime data if this is the current bar
        if (currentBar?.id === barId) {
          setRealtimeData(sentiment);
        }
        
        // Update the bar in the list
        const updatedBar = engineRef.current.getBar(barId);
        if (updatedBar) {
          setBars(prevBars => prevBars.map(bar => 
            bar.id === barId ? updatedBar : bar
          ));
          
          if (currentBar?.id === barId) {
            setCurrentBar(updatedBar);
          }
        }
      }
      
      return sentiment;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current sentiment';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  const refreshSentiment = useCallback(async (barId: string): Promise<SentimentReading> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const sentiment = await engineRef.current.refreshSentiment(barId);
      
      if (mountedRef.current) {
        // Update realtime data if this is the current bar
        if (currentBar?.id === barId) {
          setRealtimeData(sentiment);
        }
        
        // Update the bar in the list
        const updatedBar = engineRef.current.getBar(barId);
        if (updatedBar) {
          setBars(prevBars => prevBars.map(bar => 
            bar.id === barId ? updatedBar : bar
          ));
          
          if (currentBar?.id === barId) {
            setCurrentBar(updatedBar);
          }
        }
      }
      
      return sentiment;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh sentiment';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  // Data Source Operations
  const addDataSource = useCallback(async (barId: string, source: SentimentDataSource): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      await engineRef.current.addDataSource(barId, source);
      
      if (mountedRef.current) {
        // Update the bar in the list
        const updatedBar = engineRef.current.getBar(barId);
        if (updatedBar) {
          setBars(prevBars => prevBars.map(bar => 
            bar.id === barId ? updatedBar : bar
          ));
          
          if (currentBar?.id === barId) {
            setCurrentBar(updatedBar);
          }
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add data source';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  const removeDataSource = useCallback(async (barId: string, sourceId: string): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      await engineRef.current.removeDataSource(barId, sourceId);
      
      if (mountedRef.current) {
        // Update the bar in the list
        const updatedBar = engineRef.current.getBar(barId);
        if (updatedBar) {
          setBars(prevBars => prevBars.map(bar => 
            bar.id === barId ? updatedBar : bar
          ));
          
          if (currentBar?.id === barId) {
            setCurrentBar(updatedBar);
          }
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove data source';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  const updateDataSource = useCallback(async (barId: string, sourceId: string, updates: Partial<SentimentDataSource>): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      await engineRef.current.updateDataSource(barId, sourceId, updates);
      
      if (mountedRef.current) {
        // Update the bar in the list
        const updatedBar = engineRef.current.getBar(barId);
        if (updatedBar) {
          setBars(prevBars => prevBars.map(bar => 
            bar.id === barId ? updatedBar : bar
          ));
          
          if (currentBar?.id === barId) {
            setCurrentBar(updatedBar);
          }
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data source';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [currentBar]);

  // Analysis Operations
  const analyzeSentimentTrends = useCallback(async (barId: string, timeRange: TimeRange): Promise<TrendAnalysis> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      // Get sentiment history for the time range
      const history = engineRef.current.getSentimentHistory(barId, timeRange);
      
      // Analyze trends from historical data
      const trendAnalysis = await analyzeTrendsFromHistory(history);
      
      return trendAnalysis;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze sentiment trends';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, []);

  const getSentimentHistory = useCallback(async (barId: string, timeRange: TimeRange): Promise<SentimentHistory[]> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const history = engineRef.current.getSentimentHistory(barId, timeRange);
      
      return history;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get sentiment history';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, []);

  const compareSentiments = useCallback(async (barId1: string, barId2: string): Promise<SentimentComparison> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsUpdating(true);
      setError(null);
      
      const bar1 = engineRef.current.getBar(barId1);
      const bar2 = engineRef.current.getBar(barId2);
      
      if (!bar1 || !bar2) {
        throw new Error('One or both bars not found');
      }
      
      // Calculate correlation and comparison metrics
      const comparison = await performSentimentComparison(bar1, bar2);
      
      return comparison;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare sentiments';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, []);

  // Utility Functions
  const setCurrentBarById = useCallback((barId: string | null) => {
    if (!barId) {
      setCurrentBar(null);
      setRealtimeData(null);
      return;
    }

    const bar = bars.find(b => b.id === barId);
    if (bar) {
      setCurrentBar(bar);
      
      // Get latest sentiment for the new current bar
      if (engineRef.current) {
        engineRef.current.getCurrentSentiment(barId)
          .then(sentiment => {
            if (mountedRef.current) {
              setRealtimeData(sentiment);
            }
          })
          .catch(err => {
            if (mountedRef.current) {
              setError(err instanceof Error ? err.message : 'Failed to get sentiment for new current bar');
            }
          });
      }
    }
  }, [bars]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Refresh all bars
      const allBars = engineRef.current.getBars();
      if (mountedRef.current) {
        setBars(allBars);
      }
      
      // Refresh current bar sentiment if exists
      if (currentBar) {
        const sentiment = await engineRef.current.getCurrentSentiment(currentBar.id);
        if (mountedRef.current) {
          setRealtimeData(sentiment);
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
  }, [currentBar]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    bars,
    currentBar,
    realtimeData,
    
    // Loading states
    isLoading,
    isUpdating,
    
    // Bar operations
    createBar,
    updateBar,
    deleteBar,
    
    // Sentiment operations
    getCurrentSentiment,
    refreshSentiment,
    
    // Data source operations
    addDataSource,
    removeDataSource,
    updateDataSource,
    
    // Analysis operations
    analyzeSentimentTrends,
    getSentimentHistory,
    compareSentiments,
    
    // Utility functions
    setCurrentBar: setCurrentBarById,
    refreshData,
    
    // Error handling
    error,
    clearError
  };
};

// Helper Functions
const analyzeTrendsFromHistory = async (history: SentimentHistory[]): Promise<TrendAnalysis> => {
  if (history.length < 2) {
    return {
      shortTermTrend: 'neutral',
      mediumTermTrend: 'neutral',
      longTermTrend: 'neutral',
      trendStrength: 0,
      trendAge: 0,
      reversalProbability: 0.5
    };
  }

  // Sort by timestamp
  const sortedHistory = [...history].sort((a, b) => 
    a.recordedAt.getTime() - b.recordedAt.getTime()
  );

  // Calculate trends for different time periods
  const shortTermData = sortedHistory.slice(-12); // Last 12 readings
  const mediumTermData = sortedHistory.slice(-48); // Last 48 readings
  const longTermData = sortedHistory.slice(-168); // Last 168 readings

  const shortTermTrend = calculateTrendDirection(shortTermData);
  const mediumTermTrend = calculateTrendDirection(mediumTermData);
  const longTermTrend = calculateTrendDirection(longTermData);

  const trendStrength = calculateTrendStrength(shortTermData);
  const trendAge = calculateTrendAge(shortTermData);
  const reversalProbability = calculateReversalProbability(shortTermData);

  return {
    shortTermTrend,
    mediumTermTrend,
    longTermTrend,
    trendStrength,
    trendAge,
    reversalProbability
  };
};

const calculateTrendDirection = (data: SentimentHistory[]): 'bullish' | 'bearish' | 'neutral' | 'volatile' => {
  if (data.length < 2) return 'neutral';

  const sentiments = data.map(d => d.sentimentReading.overallSentiment);
  
  // Calculate linear regression slope
  const n = sentiments.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = sentiments.reduce((sum, val) => sum + val, 0);
  const sumXY = sentiments.reduce((sum, val, idx) => sum + val * idx, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate volatility
  const mean = sumY / n;
  const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const volatility = Math.sqrt(variance);
  
  // Determine trend
  if (volatility > 0.3) return 'volatile';
  if (slope > 0.05) return 'bullish';
  if (slope < -0.05) return 'bearish';
  return 'neutral';
};

const calculateTrendStrength = (data: SentimentHistory[]): number => {
  if (data.length < 2) return 0;

  const sentiments = data.map(d => d.sentimentReading.overallSentiment);
  const changes = sentiments.slice(1).map((val, idx) => val - sentiments[idx]);
  const avgChange = changes.reduce((sum, val) => sum + Math.abs(val), 0) / changes.length;
  
  return Math.min(avgChange * 2, 1); // Normalize to 0-1
};

const calculateTrendAge = (data: SentimentHistory[]): number => {
  if (data.length < 2) return 0;

  const latestTimestamp = data[data.length - 1].recordedAt;
  const oldestTimestamp = data[0].recordedAt;
  
  return (latestTimestamp.getTime() - oldestTimestamp.getTime()) / (1000 * 60 * 60); // Hours
};

const calculateReversalProbability = (data: SentimentHistory[]): number => {
  if (data.length < 3) return 0.5;

  const sentiments = data.map(d => d.sentimentReading.overallSentiment);
  const recent = sentiments.slice(-3);
  
  // Check for reversal patterns
  const isIncreasing = recent[1] > recent[0] && recent[2] > recent[1];
  const isDecreasing = recent[1] < recent[0] && recent[2] < recent[1];
  
  if (isIncreasing && recent[2] > 0.5) return 0.7; // High positive, likely reversal
  if (isDecreasing && recent[2] < -0.5) return 0.7; // High negative, likely reversal
  
  // Check volatility
  const volatility = recent.reduce((sum, val, idx) => {
    if (idx === 0) return sum;
    return sum + Math.abs(val - recent[idx - 1]);
  }, 0) / (recent.length - 1);
  
  return Math.min(volatility * 2, 0.8); // Higher volatility = higher reversal probability
};

const performSentimentComparison = async (bar1: MarketSentimentBar, bar2: MarketSentimentBar): Promise<SentimentComparison> => {
  // Calculate correlation between sentiments
  const sentiment1 = bar1.currentSentiment.overallSentiment;
  const sentiment2 = bar2.currentSentiment.overallSentiment;
  
  const correlation = Math.abs(sentiment1 - sentiment2) < 0.1 ? 0.8 : 0.3; // Simplified correlation
  const divergence = Math.abs(sentiment1 - sentiment2);
  
  // Find common and unique factors
  const factors1 = bar1.currentSentiment.componentSentiments.flatMap(c => c.factors.map(f => f.factorName));
  const factors2 = bar2.currentSentiment.componentSentiments.flatMap(c => c.factors.map(f => f.factorName));
  
  const commonFactors = factors1.filter(f => factors2.includes(f));
  const uniqueFactors = {
    bar1: factors1.filter(f => !factors2.includes(f)),
    bar2: factors2.filter(f => !factors1.includes(f))
  };
  
  const analysis = `Bar "${bar1.barName}" shows ${sentiment1 > 0 ? 'positive' : 'negative'} sentiment (${sentiment1.toFixed(3)}), while "${bar2.barName}" shows ${sentiment2 > 0 ? 'positive' : 'negative'} sentiment (${sentiment2.toFixed(3)}). Correlation: ${correlation.toFixed(2)}`;
  
  return {
    bar1,
    bar2,
    correlation,
    divergence,
    commonFactors,
    uniqueFactors,
    analysis
  };
};

export default useMarketSentimentBar; 