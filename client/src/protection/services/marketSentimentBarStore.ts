// Block 95: Market Sentiment Bar - Store
// Zustand State Management for Market Sentiment Tracking

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  MarketSentimentBar,
  SentimentReading,
  SentimentHistory,
  SentimentDataSource,
  MarketSentimentBarState,
  TimeRange,
  TrendAnalysis,
  SentimentComparison
} from '../types/marketSentimentBar';

interface MarketSentimentBarStore extends MarketSentimentBarState {
  // Bar Management
  addBar: (bar: MarketSentimentBar) => void;
  updateBar: (id: string, updates: Partial<MarketSentimentBar>) => void;
  removeBar: (id: string) => void;
  setCurrentBar: (id: string | null) => void;
  
  // Sentiment Data
  updateSentimentReading: (barId: string, reading: SentimentReading) => void;
  updateRealtimeData: (barId: string, reading: SentimentReading) => void;
  
  // Data Sources
  addDataSource: (barId: string, source: SentimentDataSource) => void;
  updateDataSource: (barId: string, sourceId: string, updates: Partial<SentimentDataSource>) => void;
  removeDataSource: (barId: string, sourceId: string) => void;
  
  // History Management
  addHistoryRecord: (barId: string, record: SentimentHistory) => void;
  getHistoryForTimeRange: (barId: string, timeRange: TimeRange) => SentimentHistory[];
  clearHistoryOlderThan: (barId: string, cutoffDate: Date) => void;
  
  // Analytics
  calculateTrendAnalysis: (barId: string, timeRange: TimeRange) => TrendAnalysis | null;
  compareBars: (barId1: string, barId2: string) => SentimentComparison | null;
  
  // Selection Management
  toggleBarSelection: (barId: string) => void;
  selectMultipleBars: (barIds: string[]) => void;
  clearSelection: () => void;
  
  // Cache Management
  updateCacheTimestamp: (barId: string) => void;
  isCacheValid: (barId: string) => boolean;
  invalidateCache: (barId: string) => void;
  
  // Error Handling
  setError: (barId: string, error: string) => void;
  clearError: (barId: string) => void;
  clearAllErrors: () => void;
  
  // Utility
  getBarById: (id: string) => MarketSentimentBar | undefined;
  getActiveBarIds: () => string[];
  getBarsBySource: (sourceType: string) => MarketSentimentBar[];
  
  // Cleanup
  cleanup: () => void;
  resetStore: () => void;
}

const initialState: MarketSentimentBarState = {
  bars: {},
  currentBarId: null,
  realtimeData: {},
  selectedBarIds: [],
  lastUpdated: {},
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  errors: {}
};

export const useMarketSentimentBarStore = create<MarketSentimentBarStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Bar Management
        addBar: (bar) => {
          set((state) => {
            state.bars[bar.id] = bar;
            state.lastUpdated[bar.id] = new Date();
            
            // Set as current bar if it's the first one
            if (Object.keys(state.bars).length === 1) {
              state.currentBarId = bar.id;
            }
          });
        },
        
        updateBar: (id, updates) => {
          set((state) => {
            if (state.bars[id]) {
              state.bars[id] = { ...state.bars[id], ...updates, updatedAt: new Date() };
              state.lastUpdated[id] = new Date();
            }
          });
        },
        
        removeBar: (id) => {
          set((state) => {
            delete state.bars[id];
            delete state.realtimeData[id];
            delete state.lastUpdated[id];
            delete state.errors[id];
            
            // Remove from selection
            state.selectedBarIds = state.selectedBarIds.filter(barId => barId !== id);
            
            // Clear current bar if it's the one being removed
            if (state.currentBarId === id) {
              const remainingBarIds = Object.keys(state.bars);
              state.currentBarId = remainingBarIds.length > 0 ? remainingBarIds[0] : null;
            }
          });
        },
        
        setCurrentBar: (id) => {
          set((state) => {
            state.currentBarId = id;
          });
        },
        
        // Sentiment Data
        updateSentimentReading: (barId, reading) => {
          set((state) => {
            if (state.bars[barId]) {
              state.bars[barId].currentSentiment = reading;
              state.bars[barId].lastUpdated = new Date();
              state.realtimeData[barId] = reading;
              state.lastUpdated[barId] = new Date();
            }
          });
        },
        
        updateRealtimeData: (barId, reading) => {
          set((state) => {
            state.realtimeData[barId] = reading;
            state.lastUpdated[barId] = new Date();
          });
        },
        
        // Data Sources
        addDataSource: (barId, source) => {
          set((state) => {
            if (state.bars[barId]) {
              state.bars[barId].dataSources.push(source);
              state.lastUpdated[barId] = new Date();
            }
          });
        },
        
        updateDataSource: (barId, sourceId, updates) => {
          set((state) => {
            if (state.bars[barId]) {
              const sourceIndex = state.bars[barId].dataSources.findIndex(
                source => source.sourceId === sourceId
              );
              if (sourceIndex !== -1) {
                state.bars[barId].dataSources[sourceIndex] = {
                  ...state.bars[barId].dataSources[sourceIndex],
                  ...updates
                };
                state.lastUpdated[barId] = new Date();
              }
            }
          });
        },
        
        removeDataSource: (barId, sourceId) => {
          set((state) => {
            if (state.bars[barId]) {
              state.bars[barId].dataSources = state.bars[barId].dataSources.filter(
                source => source.sourceId !== sourceId
              );
              state.lastUpdated[barId] = new Date();
            }
          });
        },
        
        // History Management
        addHistoryRecord: (barId, record) => {
          set((state) => {
            if (state.bars[barId]) {
              if (!state.bars[barId].sentimentHistory) {
                state.bars[barId].sentimentHistory = [];
              }
              
              state.bars[barId].sentimentHistory.push(record);
              
              // Keep only last 1000 records
              if (state.bars[barId].sentimentHistory.length > 1000) {
                state.bars[barId].sentimentHistory = state.bars[barId].sentimentHistory.slice(-1000);
              }
              
              state.lastUpdated[barId] = new Date();
            }
          });
        },
        
        getHistoryForTimeRange: (barId, timeRange) => {
          const state = get();
          const bar = state.bars[barId];
          
          if (!bar || !bar.sentimentHistory) {
            return [];
          }
          
          const now = new Date();
          let startDate: Date;
          
          switch (timeRange.period) {
            case '1h':
              startDate = new Date(now.getTime() - 60 * 60 * 1000);
              break;
            case '4h':
              startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
              break;
            case '1d':
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '1w':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '1m':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case '3m':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case '1y':
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            default:
              startDate = timeRange.startDate || new Date(0);
          }
          
          const endDate = timeRange.endDate || now;
          
          return bar.sentimentHistory.filter(record => 
            record.recordedAt >= startDate && record.recordedAt <= endDate
          );
        },
        
        clearHistoryOlderThan: (barId, cutoffDate) => {
          set((state) => {
            if (state.bars[barId] && state.bars[barId].sentimentHistory) {
              state.bars[barId].sentimentHistory = state.bars[barId].sentimentHistory.filter(
                record => record.recordedAt >= cutoffDate
              );
              state.lastUpdated[barId] = new Date();
            }
          });
        },
        
        // Analytics
        calculateTrendAnalysis: (barId, timeRange) => {
          const state = get();
          const history = state.getHistoryForTimeRange(barId, timeRange);
          
          if (history.length < 2) {
            return null;
          }
          
          // Sort by timestamp
          const sortedHistory = [...history].sort((a, b) => 
            a.recordedAt.getTime() - b.recordedAt.getTime()
          );
          
          // Extract sentiment values
          const sentiments = sortedHistory.map(record => record.sentimentReading.overallSentiment);
          
          // Calculate linear regression for trend
          const n = sentiments.length;
          const sumX = (n * (n - 1)) / 2;
          const sumY = sentiments.reduce((sum, val) => sum + val, 0);
          const sumXY = sentiments.reduce((sum, val, idx) => sum + val * idx, 0);
          const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
          
          const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
          
          // Calculate volatility
          const mean = sumY / n;
          const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
          const volatility = Math.sqrt(variance);
          
          // Determine trend direction
          let shortTermTrend: 'bullish' | 'bearish' | 'neutral' | 'volatile';
          if (volatility > 0.3) {
            shortTermTrend = 'volatile';
          } else if (slope > 0.05) {
            shortTermTrend = 'bullish';
          } else if (slope < -0.05) {
            shortTermTrend = 'bearish';
          } else {
            shortTermTrend = 'neutral';
          }
          
          // Calculate trend strength
          const trendStrength = Math.min(Math.abs(slope) * 10, 1);
          
          // Calculate trend age (hours since trend started)
          const trendAge = (sortedHistory[sortedHistory.length - 1].recordedAt.getTime() - 
                           sortedHistory[0].recordedAt.getTime()) / (1000 * 60 * 60);
          
          // Calculate reversal probability
          const recentSentiments = sentiments.slice(-3);
          let reversalProbability = 0.5;
          
          if (recentSentiments.length >= 3) {
            const isIncreasing = recentSentiments[1] > recentSentiments[0] && 
                                recentSentiments[2] > recentSentiments[1];
            const isDecreasing = recentSentiments[1] < recentSentiments[0] && 
                                recentSentiments[2] < recentSentiments[1];
            
            if (isIncreasing && recentSentiments[2] > 0.5) {
              reversalProbability = 0.7;
            } else if (isDecreasing && recentSentiments[2] < -0.5) {
              reversalProbability = 0.7;
            } else {
              reversalProbability = Math.min(volatility * 2, 0.8);
            }
          }
          
          return {
            shortTermTrend,
            mediumTermTrend: shortTermTrend, // Simplified for now
            longTermTrend: shortTermTrend,   // Simplified for now
            trendStrength,
            trendAge,
            reversalProbability
          };
        },
        
        compareBars: (barId1, barId2) => {
          const state = get();
          const bar1 = state.bars[barId1];
          const bar2 = state.bars[barId2];
          
          if (!bar1 || !bar2) {
            return null;
          }
          
          const sentiment1 = bar1.currentSentiment.overallSentiment;
          const sentiment2 = bar2.currentSentiment.overallSentiment;
          
          // Calculate correlation (simplified)
          const correlation = Math.abs(sentiment1 - sentiment2) < 0.1 ? 0.8 : 0.3;
          const divergence = Math.abs(sentiment1 - sentiment2);
          
          // Find common and unique factors
          const factors1 = bar1.currentSentiment.componentSentiments.flatMap(c => 
            c.factors.map(f => f.factorName)
          );
          const factors2 = bar2.currentSentiment.componentSentiments.flatMap(c => 
            c.factors.map(f => f.factorName)
          );
          
          const commonFactors = factors1.filter(f => factors2.includes(f));
          const uniqueFactors = {
            bar1: factors1.filter(f => !factors2.includes(f)),
            bar2: factors2.filter(f => !factors1.includes(f))
          };
          
          const analysis = `${bar1.barName} sentiment: ${sentiment1 > 0 ? 'positive' : 'negative'} (${sentiment1.toFixed(3)}), ${bar2.barName} sentiment: ${sentiment2 > 0 ? 'positive' : 'negative'} (${sentiment2.toFixed(3)}). Correlation: ${correlation.toFixed(2)}`;
          
          return {
            bar1,
            bar2,
            correlation,
            divergence,
            commonFactors,
            uniqueFactors,
            analysis
          };
        },
        
        // Selection Management
        toggleBarSelection: (barId) => {
          set((state) => {
            const index = state.selectedBarIds.indexOf(barId);
            if (index === -1) {
              state.selectedBarIds.push(barId);
            } else {
              state.selectedBarIds.splice(index, 1);
            }
          });
        },
        
        selectMultipleBars: (barIds) => {
          set((state) => {
            state.selectedBarIds = barIds.filter(id => state.bars[id]);
          });
        },
        
        clearSelection: () => {
          set((state) => {
            state.selectedBarIds = [];
          });
        },
        
        // Cache Management
        updateCacheTimestamp: (barId) => {
          set((state) => {
            state.lastUpdated[barId] = new Date();
          });
        },
        
        isCacheValid: (barId) => {
          const state = get();
          const lastUpdated = state.lastUpdated[barId];
          
          if (!lastUpdated) return false;
          
          const now = new Date();
          const age = now.getTime() - lastUpdated.getTime();
          
          return age < state.cacheExpiry;
        },
        
        invalidateCache: (barId) => {
          set((state) => {
            delete state.lastUpdated[barId];
          });
        },
        
        // Error Handling
        setError: (barId, error) => {
          set((state) => {
            state.errors[barId] = error;
          });
        },
        
        clearError: (barId) => {
          set((state) => {
            delete state.errors[barId];
          });
        },
        
        clearAllErrors: () => {
          set((state) => {
            state.errors = {};
          });
        },
        
        // Utility
        getBarById: (id) => {
          const state = get();
          return state.bars[id];
        },
        
        getActiveBarIds: () => {
          const state = get();
          return Object.keys(state.bars).filter(id => state.bars[id].isActive);
        },
        
        getBarsBySource: (sourceType) => {
          const state = get();
          return Object.values(state.bars).filter(bar => 
            bar.dataSources.some(source => source.sourceType === sourceType)
          );
        },
        
        // Cleanup
        cleanup: () => {
          set((state) => {
            const now = new Date();
            const cutoffTime = now.getTime() - 24 * 60 * 60 * 1000; // 24 hours ago
            
            // Clean up old history records
            Object.keys(state.bars).forEach(barId => {
              if (state.bars[barId].sentimentHistory) {
                state.bars[barId].sentimentHistory = state.bars[barId].sentimentHistory.filter(
                  record => record.recordedAt.getTime() > cutoffTime
                );
              }
            });
            
            // Clean up old cache entries
            Object.keys(state.lastUpdated).forEach(barId => {
              if (state.lastUpdated[barId].getTime() < cutoffTime) {
                delete state.lastUpdated[barId];
              }
            });
            
            // Clean up old errors
            Object.keys(state.errors).forEach(barId => {
              if (!state.bars[barId]) {
                delete state.errors[barId];
              }
            });
          });
        },
        
        resetStore: () => {
          set(() => ({ ...initialState }));
        }
      })),
      {
        name: 'market-sentiment-bar-store',
        version: 1,
        partialize: (state) => ({
          bars: state.bars,
          currentBarId: state.currentBarId,
          selectedBarIds: state.selectedBarIds,
          cacheExpiry: state.cacheExpiry
        }),
        onRehydrateStorage: () => (state) => {
          // Clean up after rehydration
          if (state) {
            state.cleanup();
          }
        }
      }
    )
  )
);

// Selectors for optimized performance
export const selectCurrentBar = (state: MarketSentimentBarStore) => 
  state.currentBarId ? state.bars[state.currentBarId] : null;

export const selectCurrentBarSentiment = (state: MarketSentimentBarStore) => 
  state.currentBarId ? state.realtimeData[state.currentBarId] : null;

export const selectActiveBarCount = (state: MarketSentimentBarStore) => 
  Object.values(state.bars).filter(bar => bar.isActive).length;

export const selectBarsByStatus = (isActive: boolean) => (state: MarketSentimentBarStore) => 
  Object.values(state.bars).filter(bar => bar.isActive === isActive);

export const selectRealtimeDataForBar = (barId: string) => (state: MarketSentimentBarStore) => 
  state.realtimeData[barId];

export const selectBarErrors = (state: MarketSentimentBarStore) => state.errors;

export const selectSelectedBars = (state: MarketSentimentBarStore) => 
  state.selectedBarIds.map(id => state.bars[id]).filter(Boolean);

export const selectBarDataSources = (barId: string) => (state: MarketSentimentBarStore) => 
  state.bars[barId]?.dataSources || [];

export const selectBarSentimentHistory = (barId: string) => (state: MarketSentimentBarStore) => 
  state.bars[barId]?.sentimentHistory || [];

// Computed selectors
export const selectBarsWithSourceType = (sourceType: string) => (state: MarketSentimentBarStore) => 
  Object.values(state.bars).filter(bar => 
    bar.dataSources.some(source => source.sourceType === sourceType)
  );

export const selectBarsByJurisdiction = (jurisdiction: 'AU' | 'NZ' | 'BOTH') => (state: MarketSentimentBarStore) => 
  Object.values(state.bars).filter(bar => 
    bar.sentimentConfig.jurisdiction === jurisdiction
  );

export const selectAverageSentiment = (state: MarketSentimentBarStore) => {
  const activeBars = Object.values(state.bars).filter(bar => bar.isActive);
  if (activeBars.length === 0) return 0;
  
  const totalSentiment = activeBars.reduce((sum, bar) => 
    sum + bar.currentSentiment.overallSentiment, 0
  );
  
  return totalSentiment / activeBars.length;
};

export const selectMostPositiveBar = (state: MarketSentimentBarStore) => {
  const activeBars = Object.values(state.bars).filter(bar => bar.isActive);
  if (activeBars.length === 0) return null;
  
  return activeBars.reduce((mostPositive, bar) => 
    bar.currentSentiment.overallSentiment > mostPositive.currentSentiment.overallSentiment 
      ? bar 
      : mostPositive
  );
};

export const selectMostNegativeBar = (state: MarketSentimentBarStore) => {
  const activeBars = Object.values(state.bars).filter(bar => bar.isActive);
  if (activeBars.length === 0) return null;
  
  return activeBars.reduce((mostNegative, bar) => 
    bar.currentSentiment.overallSentiment < mostNegative.currentSentiment.overallSentiment 
      ? bar 
      : mostNegative
  );
};

// Action creators for common operations
export const createBarActions = (store: typeof useMarketSentimentBarStore) => ({
  
  // Bulk operations
  createMultipleBars: (bars: Omit<MarketSentimentBar, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => {
    bars.forEach(barConfig => {
      const newBar: MarketSentimentBar = {
        ...barConfig,
        id: `bar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      store.getState().addBar(newBar);
    });
  },
  
  // Batch updates
  updateMultipleBars: (updates: Array<{ id: string; updates: Partial<MarketSentimentBar> }>) => {
    updates.forEach(({ id, updates }) => {
      store.getState().updateBar(id, updates);
    });
  },
  
  // Advanced analytics
  calculatePortfolioSentiment: () => {
    const state = store.getState();
    const activeBars = Object.values(state.bars).filter(bar => bar.isActive);
    
    if (activeBars.length === 0) return null;
    
    const weightedSentiment = activeBars.reduce((sum, bar) => {
      const weight = bar.dataSources.length / 10; // Weight by number of sources
      return sum + (bar.currentSentiment.overallSentiment * weight);
    }, 0);
    
    const totalWeight = activeBars.reduce((sum, bar) => {
      return sum + (bar.dataSources.length / 10);
    }, 0);
    
    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  },
  
  // Health monitoring
  getSystemHealth: () => {
    const state = store.getState();
    const totalBars = Object.keys(state.bars).length;
    const activeBars = Object.values(state.bars).filter(bar => bar.isActive).length;
    const barsWithErrors = Object.keys(state.errors).length;
    const barsWithFreshData = Object.keys(state.lastUpdated).filter(barId => 
      state.isCacheValid(barId)
    ).length;
    
    return {
      totalBars,
      activeBars,
      barsWithErrors,
      barsWithFreshData,
      healthScore: totalBars > 0 ? ((activeBars - barsWithErrors) / totalBars) * 100 : 100
    };
  }
});

// Subscribe to store changes for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  useMarketSentimentBarStore.subscribe(
    (state) => state.bars,
    (bars) => {
      console.log('Market Sentiment Bars updated:', Object.keys(bars).length);
    }
  );
}

export default useMarketSentimentBarStore; 