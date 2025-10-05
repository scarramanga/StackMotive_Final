// Block 94: Trust Score Badge - Hook
// React Integration for Trust Score Management

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrustScoreBadgeEngine } from '../engines/TrustScoreBadgeEngine';
import {
  TrustScoreBadge,
  TrustScore,
  TrustScoreHistory,
  UseTrustScoreBadgeReturn,
  ComponentAnalysis,
  ScoreComparison,
  ScoreInsight,
  ScoreTrend,
  TimeRange
} from '../types/trustScoreBadge';

export const useTrustScoreBadge = (): UseTrustScoreBadgeReturn => {
  // Core state
  const [badges, setBadges] = useState<TrustScoreBadge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<TrustScoreBadge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculation state
  const [calculatingBadges, setCalculatingBadges] = useState<Set<string>>(new Set());

  // Engine instance
  const engine = useMemo(() => TrustScoreBadgeEngine.getInstance(), []);

  // Initialize data
  useEffect(() => {
    loadBadges();
  }, []);

  // Auto-refresh for calculating badges
  useEffect(() => {
    if (calculatingBadges.size > 0) {
      const interval = setInterval(() => {
        refreshCalculatingBadges();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [calculatingBadges.size]);

  // Load all badges
  const loadBadges = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allBadges = engine.getBadges();
      setBadges(allBadges);

      // Set first badge as current if none selected
      if (!currentBadge && allBadges.length > 0) {
        setCurrentBadge(allBadges[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges');
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentBadge]);

  // Create new badge
  const createBadge = useCallback(async (
    config: Omit<TrustScoreBadge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<TrustScoreBadge> => {
    try {
      setIsLoading(true);
      setError(null);

      const newBadge = engine.createBadge(config);

      // Update state
      setBadges(prev => [...prev, newBadge]);
      setCurrentBadge(newBadge);

      return newBadge;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create badge';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Update badge
  const updateBadge = useCallback(async (
    id: string,
    updates: Partial<TrustScoreBadge>
  ): Promise<TrustScoreBadge> => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedBadge = engine.updateBadge(id, updates);

      // Update state
      setBadges(prev => prev.map(badge =>
        badge.id === id ? updatedBadge : badge
      ));

      // Update current badge if it's the one being updated
      if (currentBadge?.id === id) {
        setCurrentBadge(updatedBadge);
      }

      return updatedBadge;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update badge';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentBadge]);

  // Delete badge
  const deleteBadge = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      engine.deleteBadge(id);

      // Update state
      setBadges(prev => prev.filter(badge => badge.id !== id));

      // Clear current badge if it was deleted
      if (currentBadge?.id === id) {
        const remainingBadges = badges.filter(badge => badge.id !== id);
        setCurrentBadge(remainingBadges.length > 0 ? remainingBadges[0] : null);
      }

      // Remove from calculating set if it was being calculated
      setCalculatingBadges(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete badge';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [engine, currentBadge, badges]);

  // Calculate score
  const calculateScore = useCallback(async (badgeId: string): Promise<TrustScore> => {
    try {
      setIsCalculating(true);
      setError(null);

      // Add to calculating set
      setCalculatingBadges(prev => new Set(prev).add(badgeId));

      const trustScore = await engine.calculateScore(badgeId);

      // Update badge with new score
      const updatedBadge = engine.getBadge(badgeId);
      if (updatedBadge) {
        setBadges(prev => prev.map(badge =>
          badge.id === badgeId ? updatedBadge : badge
        ));

        if (currentBadge?.id === badgeId) {
          setCurrentBadge(updatedBadge);
        }
      }

      return trustScore;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate score';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCalculating(false);
      
      // Remove from calculating set
      setCalculatingBadges(prev => {
        const updated = new Set(prev);
        updated.delete(badgeId);
        return updated;
      });
    }
  }, [engine, currentBadge]);

  // Recalculate score
  const recalculateScore = useCallback(async (
    badgeId: string,
    forceRefresh?: boolean
  ): Promise<TrustScore> => {
    try {
      setError(null);

      const trustScore = await engine.recalculateScore(badgeId, forceRefresh);

      // Update badge with new score
      const updatedBadge = engine.getBadge(badgeId);
      if (updatedBadge) {
        setBadges(prev => prev.map(badge =>
          badge.id === badgeId ? updatedBadge : badge
        ));

        if (currentBadge?.id === badgeId) {
          setCurrentBadge(updatedBadge);
        }
      }

      return trustScore;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to recalculate score';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [engine, currentBadge]);

  // Analysis operations
  const analyzeScoreComponents = useCallback(async (badgeId: string): Promise<ComponentAnalysis> => {
    try {
      setError(null);

      const badge = engine.getBadge(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      // Mock component analysis
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        componentScores: badge.trustScore.componentScores,
        strengths: [
          'Strong performance consistency',
          'Excellent transparency practices',
          'Low operational risk'
        ],
        weaknesses: [
          'Moderate market validation',
          'Average risk management',
          'Limited track record'
        ],
        recommendations: [
          'Focus on improving market validation through increased market presence',
          'Enhance risk management processes',
          'Build longer performance track record'
        ],
        improvementPotential: 12.5
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze components';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [engine]);

  const compareScores = useCallback(async (
    badgeId1: string,
    badgeId2: string
  ): Promise<ScoreComparison> => {
    try {
      setError(null);

      const badge1 = engine.getBadge(badgeId1);
      const badge2 = engine.getBadge(badgeId2);

      if (!badge1 || !badge2) {
        throw new Error('One or both badges not found');
      }

      // Mock comparison
      await new Promise(resolve => setTimeout(resolve, 800));

      const scoreDifference = badge1.trustScore.overallScore - badge2.trustScore.overallScore;

      return {
        badge1,
        badge2,
        scoreDifference,
        componentComparison: {
          performance: 85 - 78,
          risk: 78 - 82,
          consistency: 82 - 80,
          transparency: 91 - 88,
          market_validation: 76 - 74
        },
        relativeStrengths: [
          'Badge 1 has stronger performance metrics',
          'Badge 2 shows better risk management',
          'Badge 1 demonstrates higher transparency'
        ],
        analysis: 'Badge 1 outperforms Badge 2 primarily due to superior performance and transparency, while Badge 2 shows marginally better risk management practices.'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare scores';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [engine]);

  const getScoreInsights = useCallback(async (badgeId: string): Promise<ScoreInsight[]> => {
    try {
      setError(null);

      // Mock insights generation
      await new Promise(resolve => setTimeout(resolve, 600));

      return [
        {
          insightId: 'insight_1',
          type: 'positive',
          category: 'Performance',
          title: 'Strong Risk-Adjusted Returns',
          description: 'The portfolio demonstrates excellent risk-adjusted performance with a Sharpe ratio of 1.24',
          impact: 8.5,
          actionable: false
        },
        {
          insightId: 'insight_2',
          type: 'negative',
          category: 'Market Validation',
          title: 'Limited Market Recognition',
          description: 'The strategy has limited market validation and peer recognition',
          impact: -4.2,
          actionable: true,
          recommendation: 'Consider increasing market exposure and seeking third-party validation'
        },
        {
          insightId: 'insight_3',
          type: 'neutral',
          category: 'Consistency',
          title: 'Moderate Performance Consistency',
          description: 'Performance shows good consistency but could be improved in certain market conditions',
          impact: 0,
          actionable: true,
          recommendation: 'Review strategy performance during different market regimes'
        }
      ];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get insights';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Historical operations
  const getScoreHistory = useCallback(async (
    badgeId: string,
    timeRange?: TimeRange
  ): Promise<TrustScoreHistory[]> => {
    try {
      setError(null);

      const history = engine.getScoreHistory(badgeId);

      // Apply time range filter if provided
      if (timeRange) {
        const now = new Date();
        let startDate: Date;

        switch (timeRange.period) {
          case '1M':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '3M':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '6M':
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case '1Y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case '2Y':
            startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
            break;
          case '5Y':
            startDate = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = timeRange.startDate || new Date(0);
        }

        const endDate = timeRange.endDate || now;

        return history.filter(item => 
          item.calculationDate >= startDate && item.calculationDate <= endDate
        );
      }

      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get score history';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [engine]);

  const getScoreTrends = useCallback(async (badgeId: string): Promise<ScoreTrend> => {
    try {
      setError(null);

      const history = engine.getScoreHistory(badgeId);

      // Mock trend analysis
      await new Promise(resolve => setTimeout(resolve, 400));

      if (history.length < 2) {
        return {
          direction: 'stable',
          strength: 0,
          duration: 0,
          projectedScore: badges.find(b => b.id === badgeId)?.trustScore.overallScore || 0,
          confidence: 0.5
        };
      }

      const recent = history.slice(-10);
      const totalChange = recent[recent.length - 1].score - recent[0].score;
      
      return {
        direction: totalChange > 1 ? 'improving' : totalChange < -1 ? 'declining' : 'stable',
        strength: Math.abs(totalChange) / 10,
        duration: recent.length * 7, // Assuming weekly calculations
        projectedScore: recent[recent.length - 1].score + (totalChange * 0.5),
        confidence: 0.75
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get score trends';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [engine, badges]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh calculating badges
  const refreshCalculatingBadges = useCallback(() => {
    const calculatingIds = Array.from(calculatingBadges);
    
    calculatingIds.forEach(id => {
      const badge = engine.getBadge(id);
      if (badge) {
        setBadges(prev => prev.map(b => b.id === id ? badge : b));
        
        if (currentBadge?.id === id) {
          setCurrentBadge(badge);
        }
      }
    });
  }, [calculatingBadges, engine, currentBadge]);

  // Set current badge
  const setCurrentBadgeCallback = useCallback((badgeId: string | null) => {
    if (badgeId) {
      const selectedBadge = badges.find(badge => badge.id === badgeId);
      if (selectedBadge) {
        setCurrentBadge(selectedBadge);
      }
    } else {
      setCurrentBadge(null);
    }
  }, [badges]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadBadges();
  }, [loadBadges]);

  // Computed values
  const badgeStats = useMemo(() => {
    if (badges.length === 0) return null;

    const averageScore = badges.reduce((sum, badge) => sum + badge.trustScore.overallScore, 0) / badges.length;
    
    const gradeDistribution = badges.reduce((acc, badge) => {
      acc[badge.trustScore.scoreGrade] = (acc[badge.trustScore.scoreGrade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highestScore = Math.max(...badges.map(b => b.trustScore.overallScore));
    const lowestScore = Math.min(...badges.map(b => b.trustScore.overallScore));

    return {
      totalBadges: badges.length,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      gradeDistribution,
      activeCalculations: calculatingBadges.size
    };
  }, [badges, calculatingBadges]);

  // Filter badges by entity type
  const getBadgesByEntityType = useCallback((entityType: string) => {
    return badges.filter(badge => badge.entityType === entityType);
  }, [badges]);

  // Get badges by score range
  const getBadgesByScoreRange = useCallback((minScore: number, maxScore: number) => {
    return badges.filter(badge => 
      badge.trustScore.overallScore >= minScore && badge.trustScore.overallScore <= maxScore
    );
  }, [badges]);

  return {
    // Data
    badges,
    currentBadge,

    // Loading states
    isLoading,
    isCalculating,

    // Badge operations
    createBadge,
    updateBadge,
    deleteBadge,

    // Score operations
    calculateScore,
    recalculateScore,

    // Analysis operations
    analyzeScoreComponents,
    compareScores,
    getScoreInsights,

    // Historical operations
    getScoreHistory,
    getScoreTrends,

    // Utility functions
    setCurrentBadge: setCurrentBadgeCallback,
    refreshData,

    // Error handling
    error,
    clearError,

    // Additional computed values
    badgeStats,

    // Utility functions
    getBadgesByEntityType,
    getBadgesByScoreRange
  };
};

export default useTrustScoreBadge; 