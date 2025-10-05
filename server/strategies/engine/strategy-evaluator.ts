import { 
  Strategy, 
  TradingSignal, 
  SentimentAnalysis, 
  NewsArticle, 
  TechnicalIndicator,
  InsertTradingSignal
} from '@shared/schema';
import { CandleData, indicatorCalculator } from './indicator-calculator';
import { db } from '../../db';

/**
 * Strategy Evaluator
 * This class evaluates a strategy against market data to generate trading signals
 */

export interface SignalCriteria {
  strategyId: number;
  userId: number;
  symbol: string;
  technicalIndicators?: Partial<TechnicalIndicator>[];
  sentimentAnalyses?: SentimentAnalysis[];
  newsArticles?: NewsArticle[];
  marketData: CandleData[];
}

export enum SignalStrength {
  WEAK = "weak",
  MODERATE = "moderate",
  STRONG = "strong",
  VERY_STRONG = "very_strong"
}

export enum SignalAction {
  BUY = "buy",
  SELL = "sell",
  HOLD = "hold"
}

export interface SignalResult {
  symbol: string;
  strategyId: number;
  userId: number;
  action: SignalAction;
  signalStrength: SignalStrength;
  technicalIndicators: any; // Store key indicators that triggered
  newsIds: number[] | null;
  sentimentIds: number[] | null;
  notes: string;
}

export class StrategyEvaluator {
  /**
   * Evaluates a strategy against the provided data to generate trading signals
   * @param strategy The strategy to evaluate
   * @param criteria The data for evaluation
   * @returns Signal result if a signal is generated, null otherwise
   */
  async evaluateStrategy(strategy: Strategy, criteria: SignalCriteria): Promise<SignalResult | null> {
    try {
      // Calculate indicators if not provided
      let indicators = criteria.technicalIndicators;
      if (!indicators || indicators.length === 0) {
        // Calculate fresh indicators
        indicators = indicatorCalculator.calculateAllIndicators(criteria.marketData);
      }
      
      // Get the most recent indicator values
      const latestIndicator = this.getLatestIndicator(indicators);
      if (!latestIndicator) {
        console.warn(`No indicators available for symbol ${criteria.symbol}`);
        return null;
      }
      
      // Evaluate technical criteria
      const technicalSignal = this.evaluateTechnicalCriteria(strategy, latestIndicator);
      
      // Evaluate sentiment criteria if available
      const sentimentSignal = criteria.sentimentAnalyses && criteria.sentimentAnalyses.length > 0
        ? this.evaluateSentimentCriteria(strategy, criteria.sentimentAnalyses)
        : null;
      
      // Evaluate news criteria if available
      const newsSignal = criteria.newsArticles && criteria.newsArticles.length > 0
        ? this.evaluateNewsCriteria(strategy, criteria.newsArticles)
        : null;
      
      // Combine signals to determine final action
      const finalSignal = this.combineSignals(
        technicalSignal, 
        sentimentSignal, 
        newsSignal
      );
      
      if (finalSignal && finalSignal.action !== SignalAction.HOLD) {
        return {
          symbol: criteria.symbol,
          strategyId: strategy.id,
          userId: criteria.userId,
          action: finalSignal.action,
          signalStrength: finalSignal.strength,
          technicalIndicators: this.extractTriggeringIndicators(latestIndicator, strategy),
          newsIds: newsSignal?.newsIds || null,
          sentimentIds: sentimentSignal?.sentimentIds || null,
          notes: finalSignal.notes
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error evaluating strategy ${strategy.id}:`, error);
      return null;
    }
  }

  /**
   * Gets the latest indicator for a symbol
   */
  private getLatestIndicator(indicators: Partial<TechnicalIndicator>[]): Partial<TechnicalIndicator> | null {
    if (!indicators || indicators.length === 0) {
      return null;
    }
    
    // Sort by timestamp descending and return the most recent
    return [...indicators].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    })[0];
  }

  /**
   * Evaluates technical indicators against strategy criteria
   */
  private evaluateTechnicalCriteria(
    strategy: Strategy, 
    indicator: Partial<TechnicalIndicator>
  ): { action: SignalAction, strength: SignalStrength, notes: string } | null {
    try {
      const strategyIndicators = strategy.indicators as any;
      if (!strategyIndicators) {
        return null;
      }
      
      let buySignals = 0;
      let sellSignals = 0;
      let totalSignals = 0;
      let notes = [];
      
      // Evaluate RSI
      if (indicator.rsi14 !== undefined && strategyIndicators.rsi) {
        totalSignals++;
        const { overbought, oversold } = strategyIndicators.rsi;
        
        if (indicator.rsi14 <= oversold) {
          buySignals++;
          notes.push(`RSI is oversold (${indicator.rsi14.toFixed(2)})`);
        } else if (indicator.rsi14 >= overbought) {
          sellSignals++;
          notes.push(`RSI is overbought (${indicator.rsi14.toFixed(2)})`);
        }
      }
      
      // Evaluate MACD
      if (indicator.macd !== undefined && 
          indicator.macdSignal !== undefined && 
          strategyIndicators.macd) {
        totalSignals++;
        
        // MACD crossover (MACD line crosses above signal line)
        if (indicator.macd > indicator.macdSignal && 
            indicator.macdHistogram !== undefined && 
            indicator.macdHistogram > 0) {
          buySignals++;
          notes.push('MACD bullish crossover');
        } 
        // MACD crossunder (MACD line crosses below signal line)
        else if (indicator.macd < indicator.macdSignal && 
                indicator.macdHistogram !== undefined && 
                indicator.macdHistogram < 0) {
          sellSignals++;
          notes.push('MACD bearish crossunder');
        }
      }
      
      // Evaluate Moving Averages
      if (indicator.ma20 !== undefined && 
          indicator.ma50 !== undefined && 
          strategyIndicators.movingAverages) {
        totalSignals++;
        
        // MA crossover (faster MA crosses above slower MA)
        if (indicator.ma20 > indicator.ma50) {
          buySignals++;
          notes.push('MA20 crossed above MA50');
        }
        // MA crossunder (faster MA crosses below slower MA)
        else if (indicator.ma20 < indicator.ma50) {
          sellSignals++;
          notes.push('MA20 crossed below MA50');
        }
      }
      
      // Evaluate Bollinger Bands
      if (indicator.bbLower !== undefined && 
          indicator.bbUpper !== undefined && 
          indicator.close !== undefined && 
          strategyIndicators.bollingerBands) {
        totalSignals++;
        
        // Price breaks below lower band (potential buy)
        if (indicator.close <= indicator.bbLower) {
          buySignals++;
          notes.push('Price at/below lower Bollinger Band');
        }
        // Price breaks above upper band (potential sell)
        else if (indicator.close >= indicator.bbUpper) {
          sellSignals++;
          notes.push('Price at/above upper Bollinger Band');
        }
      }
      
      // Evaluate Volume
      if (indicator.volume !== undefined && 
          indicator.volumeAvg20 !== undefined && 
          strategyIndicators.volume) {
        totalSignals++;
        const volumeThreshold = strategyIndicators.volume.threshold || 1.5;
        
        // Volume spike (volume is significantly higher than average)
        if (indicator.volume > indicator.volumeAvg20 * volumeThreshold) {
          // Volume confirmation for existing signals
          if (buySignals > sellSignals) {
            buySignals += 0.5;
            notes.push('High volume confirming buy signal');
          } else if (sellSignals > buySignals) {
            sellSignals += 0.5;
            notes.push('High volume confirming sell signal');
          }
        }
      }
      
      // Determine signal strength and action
      if (totalSignals === 0) {
        return null;
      }
      
      const buyScore = buySignals / totalSignals;
      const sellScore = sellSignals / totalSignals;
      
      if (buyScore > 0.6) {
        const strength = this.determineSignalStrength(buyScore);
        return { action: SignalAction.BUY, strength, notes: notes.join('; ') };
      } else if (sellScore > 0.6) {
        const strength = this.determineSignalStrength(sellScore);
        return { action: SignalAction.SELL, strength, notes: notes.join('; ') };
      }
      
      return { action: SignalAction.HOLD, strength: SignalStrength.WEAK, notes: 'No clear signal' };
    } catch (error) {
      console.error('Error evaluating technical criteria:', error);
      return null;
    }
  }

  /**
   * Evaluates sentiment analysis against strategy criteria
   */
  private evaluateSentimentCriteria(
    strategy: Strategy, 
    sentimentAnalyses: SentimentAnalysis[]
  ): { action: SignalAction, strength: SignalStrength, notes: string, sentimentIds: number[] } | null {
    if (!sentimentAnalyses || sentimentAnalyses.length === 0) {
      return null;
    }
    
    try {
      // Get recent sentiment analyses (last 24 hours)
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 24);
      
      const recentSentiment = sentimentAnalyses.filter(sa => 
        sa.createdAt && sa.createdAt > recentCutoff
      );
      
      if (recentSentiment.length === 0) {
        return null;
      }
      
      // Calculate average sentiment
      let sentimentSum = 0;
      let confidenceSum = 0;
      
      for (const sa of recentSentiment) {
        // Convert sentiment to numeric score (typically -1 to 1)
        const sentimentScore = parseFloat(sa.sentimentScore);
        const confidence = parseFloat(sa.confidence);
        
        // Weight by confidence
        sentimentSum += sentimentScore * confidence;
        confidenceSum += confidence;
      }
      
      // Get weighted average sentiment
      const averageSentiment = sentimentSum / confidenceSum;
      
      // Determine action based on sentiment
      let action = SignalAction.HOLD;
      let strength = SignalStrength.WEAK;
      let notes = '';
      
      if (averageSentiment >= 0.25) {
        action = SignalAction.BUY;
        notes = `Positive sentiment (score: ${averageSentiment.toFixed(2)})`;
        
        if (averageSentiment >= 0.7) {
          strength = SignalStrength.VERY_STRONG;
        } else if (averageSentiment >= 0.5) {
          strength = SignalStrength.STRONG;
        } else {
          strength = SignalStrength.MODERATE;
        }
      } else if (averageSentiment <= -0.25) {
        action = SignalAction.SELL;
        notes = `Negative sentiment (score: ${averageSentiment.toFixed(2)})`;
        
        if (averageSentiment <= -0.7) {
          strength = SignalStrength.VERY_STRONG;
        } else if (averageSentiment <= -0.5) {
          strength = SignalStrength.STRONG;
        } else {
          strength = SignalStrength.MODERATE;
        }
      } else {
        notes = `Neutral sentiment (score: ${averageSentiment.toFixed(2)})`;
      }
      
      return { 
        action, 
        strength, 
        notes,
        sentimentIds: recentSentiment.map(sa => sa.id)
      };
    } catch (error) {
      console.error('Error evaluating sentiment criteria:', error);
      return null;
    }
  }

  /**
   * Evaluates news articles against strategy criteria
   */
  private evaluateNewsCriteria(
    strategy: Strategy, 
    newsArticles: NewsArticle[]
  ): { action: SignalAction, strength: SignalStrength, notes: string, newsIds: number[] } | null {
    if (!newsArticles || newsArticles.length === 0) {
      return null;
    }
    
    try {
      // Get recent news (last 24 hours)
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 24);
      
      const recentNews = newsArticles.filter(news => 
        news.publishedAt > recentCutoff
      );
      
      if (recentNews.length === 0) {
        return null;
      }
      
      // For now, just return a neutral signal based on news volume
      // This would ideally be integrated with the sentiment analysis
      // or contain more sophisticated news analysis
      
      const newsCount = recentNews.length;
      let action = SignalAction.HOLD;
      let strength = SignalStrength.WEAK;
      let notes = `${newsCount} recent news articles found`;
      
      // More news typically means more potential volatility
      if (newsCount >= 5) {
        notes = `High news volume (${newsCount} articles)`;
        strength = SignalStrength.MODERATE;
      }
      
      return { 
        action,
        strength,
        notes,
        newsIds: recentNews.map(news => news.id)
      };
    } catch (error) {
      console.error('Error evaluating news criteria:', error);
      return null;
    }
  }

  /**
   * Combines different signal sources to determine the final signal
   */
  private combineSignals(
    technicalSignal: { action: SignalAction, strength: SignalStrength, notes: string } | null,
    sentimentSignal: { action: SignalAction, strength: SignalStrength, notes: string, sentimentIds: number[] } | null,
    newsSignal: { action: SignalAction, strength: SignalStrength, notes: string, newsIds: number[] } | null
  ): { action: SignalAction, strength: SignalStrength, notes: string } | null {
    if (!technicalSignal && !sentimentSignal) {
      return null;
    }
    
    // Default to technical signal if that's all we have
    if (technicalSignal && !sentimentSignal) {
      return technicalSignal;
    }
    
    // Default to sentiment signal if that's all we have
    if (!technicalSignal && sentimentSignal) {
      return {
        action: sentimentSignal.action,
        strength: sentimentSignal.strength,
        notes: sentimentSignal.notes
      };
    }
    
    // We have both technical and sentiment signals, so combine them
    const technicalAction = technicalSignal!.action;
    const sentimentAction = sentimentSignal!.action;
    
    // If both suggest the same action, strengthen the signal
    if (technicalAction === sentimentAction && technicalAction !== SignalAction.HOLD) {
      const techStrength = this.strengthToScore(technicalSignal!.strength);
      const sentStrength = this.strengthToScore(sentimentSignal!.strength);
      
      // Calculate combined strength
      const combinedStrength = Math.min(
        Math.max(techStrength, sentStrength) + 0.2,
        1.0
      );
      
      return {
        action: technicalAction,
        strength: this.scoreToStrength(combinedStrength),
        notes: `Both technical and sentiment signal ${technicalAction}: ${technicalSignal!.notes}; ${sentimentSignal!.notes}`
      };
    }
    
    // If they conflict, use the stronger signal, but reduce confidence
    if (technicalAction !== sentimentAction && 
        technicalAction !== SignalAction.HOLD && 
        sentimentAction !== SignalAction.HOLD) {
      
      const techStrength = this.strengthToScore(technicalSignal!.strength);
      const sentStrength = this.strengthToScore(sentimentSignal!.strength);
      
      if (techStrength > sentStrength) {
        return {
          action: technicalAction,
          strength: this.scoreToStrength(techStrength * 0.8), // Reduce confidence
          notes: `Technical (${technicalAction}) contradicts sentiment (${sentimentAction}): ${technicalSignal!.notes}`
        };
      } else {
        return {
          action: sentimentAction,
          strength: this.scoreToStrength(sentStrength * 0.8), // Reduce confidence
          notes: `Sentiment (${sentimentAction}) contradicts technical (${technicalAction}): ${sentimentSignal!.notes}`
        };
      }
    }
    
    // If one is HOLD, use the other
    if (technicalAction === SignalAction.HOLD && sentimentAction !== SignalAction.HOLD) {
      return {
        action: sentimentAction,
        strength: this.scoreToStrength(
          this.strengthToScore(sentimentSignal!.strength) * 0.9
        ), // Slight reduction
        notes: `Sentiment signal (${sentimentAction}) with neutral technical: ${sentimentSignal!.notes}`
      };
    }
    
    if (sentimentAction === SignalAction.HOLD && technicalAction !== SignalAction.HOLD) {
      return {
        action: technicalAction,
        strength: this.scoreToStrength(
          this.strengthToScore(technicalSignal!.strength) * 0.9
        ), // Slight reduction
        notes: `Technical signal (${technicalAction}) with neutral sentiment: ${technicalSignal!.notes}`
      };
    }
    
    // Both are HOLD
    return {
      action: SignalAction.HOLD,
      strength: SignalStrength.WEAK,
      notes: 'No actionable signals'
    };
  }

  /**
   * Converts a signal score to a strength enum
   */
  private scoreToStrength(score: number): SignalStrength {
    if (score >= 0.9) return SignalStrength.VERY_STRONG;
    if (score >= 0.75) return SignalStrength.STRONG;
    if (score >= 0.6) return SignalStrength.MODERATE;
    return SignalStrength.WEAK;
  }

  /**
   * Converts a strength enum to a numeric score
   */
  private strengthToScore(strength: SignalStrength): number {
    switch (strength) {
      case SignalStrength.VERY_STRONG: return 0.95;
      case SignalStrength.STRONG: return 0.8;
      case SignalStrength.MODERATE: return 0.65;
      case SignalStrength.WEAK: 
      default: return 0.5;
    }
  }

  /**
   * Determines signal strength based on the confidence score
   */
  private determineSignalStrength(score: number): SignalStrength {
    if (score >= 0.9) return SignalStrength.VERY_STRONG;
    if (score >= 0.75) return SignalStrength.STRONG;
    if (score >= 0.6) return SignalStrength.MODERATE;
    return SignalStrength.WEAK;
  }

  /**
   * Extracts the indicators that triggered the signal
   */
  private extractTriggeringIndicators(
    indicator: Partial<TechnicalIndicator>, 
    strategy: Strategy
  ): any {
    const result: any = {};
    const strategyIndicators = strategy.indicators as any;
    
    // Extract only the indicators that were used in the strategy
    if (strategyIndicators.rsi && indicator.rsi14 !== undefined) {
      result.rsi14 = indicator.rsi14;
    }
    
    if (strategyIndicators.macd) {
      if (indicator.macd !== undefined) result.macd = indicator.macd;
      if (indicator.macdSignal !== undefined) result.macdSignal = indicator.macdSignal;
      if (indicator.macdHistogram !== undefined) result.macdHistogram = indicator.macdHistogram;
    }
    
    if (strategyIndicators.movingAverages) {
      if (indicator.ma20 !== undefined) result.ma20 = indicator.ma20;
      if (indicator.ma50 !== undefined) result.ma50 = indicator.ma50;
    }
    
    if (strategyIndicators.bollingerBands) {
      if (indicator.bbUpper !== undefined) result.bbUpper = indicator.bbUpper;
      if (indicator.bbMiddle !== undefined) result.bbMiddle = indicator.bbMiddle;
      if (indicator.bbLower !== undefined) result.bbLower = indicator.bbLower;
    }
    
    if (strategyIndicators.volume) {
      if (indicator.volume !== undefined) result.volume = indicator.volume;
      if (indicator.volumeAvg20 !== undefined) result.volumeAvg20 = indicator.volumeAvg20;
    }
    
    // Add price data
    if (indicator.open !== undefined) result.open = indicator.open;
    if (indicator.high !== undefined) result.high = indicator.high;
    if (indicator.low !== undefined) result.low = indicator.low;
    if (indicator.close !== undefined) result.close = indicator.close;
    
    return result;
  }

  /**
   * Generates a trading signal in the database
   */
  async generateSignal(signalResult: SignalResult): Promise<TradingSignal | null> {
    try {
      // TODO: Replace with proper storage method
      // This would insert a new signal into the database
      return null;
    } catch (error) {
      console.error('Error generating signal:', error);
      return null;
    }
  }
}

// Export singleton instance
export const strategyEvaluator = new StrategyEvaluator();