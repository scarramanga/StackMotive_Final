import { indicatorCalculator } from './indicator-calculator';
import { strategyEvaluator } from './strategy-evaluator';
import { strategyManager, marketDataService } from './strategy-manager';

import { 
  Strategy, 
  InsertStrategy, 
  TradingSignal, 
  BacktestSession, 
  InsertBacktestSession,
  BacktestTrade,
  InsertBacktestTrade,
  InsertTechnicalIndicator,
  PaperTradingTransaction
} from '@shared/schema';

/**
 * Strategies Engine 
 * Main interface for strategy operations and execution
 */

export interface StrategyCreateOptions {
  name: string;
  symbol: string;
  userId: number;
  exchange: string;
  accountId?: number | null;
  description?: string | null;
  indicators: {
    rsi?: {
      enabled: boolean;
      overbought: number;
      oversold: number;
    };
    macd?: {
      enabled: boolean;
      fast: number;
      slow: number;
      signal: number;
    };
    movingAverages?: {
      enabled: boolean;
      periods: number[];
    };
    bollingerBands?: {
      enabled: boolean;
      period: number;
      deviations: number;
    };
    volume?: {
      enabled: boolean;
      threshold: number;
    };
  };
  entryConditions: {
    and?: string[][];
    or?: string[][];
  };
  exitConditions: {
    and?: string[][];
    or?: string[][];
  };
  stopLoss?: {
    enabled: boolean;
    percent: number;
    trailing: boolean;
  };
  takeProfit?: {
    enabled: boolean;
    percent: number;
    trailing: boolean;
  };
  riskManagement?: {
    maxPositionSize: number;
    maxPositionSizeUnit: 'percent' | 'fixed';
    maxPositionsPerAccount: number;
  };
  timeframes: string[]; // Timeframes to analyze (1m, 5m, 15m, 1h, 4h, 1d)
}

export interface BacktestOptions {
  strategyId: number;
  startDate: Date;
  endDate: Date;
  symbol: string;
  initialCapital: number;
  interval: string;
}

export class StrategyEngine {
  /**
   * Create a new strategy
   */
  async createStrategy(options: StrategyCreateOptions): Promise<Strategy> {
    const newStrategy: InsertStrategy = {
      name: options.name,
      symbol: options.symbol,
      userId: options.userId,
      exchange: options.exchange,
      accountId: options.accountId || null,
      description: options.description || null,
      status: 'active',
      indicators: {
        rsi: options.indicators.rsi || null,
        macd: options.indicators.macd || null,
        movingAverages: options.indicators.movingAverages || null,
        bollingerBands: options.indicators.bollingerBands || null,
        volume: options.indicators.volume || null
      },
      entryConditions: options.entryConditions,
      exitConditions: options.exitConditions,
      stopLoss: options.stopLoss,
      takeProfit: options.takeProfit,
      riskManagement: options.riskManagement,
      timeframes: options.timeframes
    };
    
    // We would use the storage service here
    // This is a placeholder for now
    return { id: 1, ...newStrategy, createdAt: new Date() } as Strategy;
  }

  /**
   * Evaluate a strategy once against current data
   */
  async evaluateStrategy(strategyId: number, userId: number): Promise<TradingSignal | null> {
    // We would use the strategy evaluator here
    // This is a placeholder for now
    return null as unknown as TradingSignal;
  }

  /**
   * Run backtest for a strategy
   */
  async runBacktest(options: BacktestOptions): Promise<BacktestSession> {
    // Create a backtest session
    const newSession: InsertBacktestSession = {
      userId: 1, // This should be determined from the strategy
      strategyId: options.strategyId,
      name: `Backtest ${options.symbol} ${options.startDate.toISOString().split('T')[0]} to ${options.endDate.toISOString().split('T')[0]}`,
      startDate: options.startDate,
      endDate: options.endDate,
      symbol: options.symbol,
      interval: options.interval,
      initialCapital: options.initialCapital.toString(),
      status: 'running',
      configuration: {
        strategyId: options.strategyId,
        symbol: options.symbol,
        interval: options.interval,
        initialCapital: options.initialCapital,
      }
    };
    
    // We would save this to the database and implement backtest logic
    // This is a placeholder for now
    return {
      id: 1,
      ...newSession,
      finalCapital: (options.initialCapital * 1.05).toString(),
      profitLoss: (options.initialCapital * 0.05).toString(),
      profitLossPercentage: "5.0",
      maxDrawdown: "3.2",
      winRate: "62.5",
      totalTrades: 8,
      winningTrades: 5,
      losingTrades: 3,
      sharpeRatio: "1.8",
      createdAt: new Date(),
      completedAt: new Date(),
      resultSummary: {
        performance: "Good",
        tradeBreakdown: "5 winning, 3 losing trades",
        recommendations: [
          "Consider adjusting stop-loss to reduce drawdown",
          "Strategy performs best in trending markets"
        ]
      }
    } as BacktestSession;
  }

  /**
   * Create a paper trading account for testing strategies
   */
  async createPaperTradingAccount(
    userId: number, 
    name: string, 
    initialBalance: number,
    currency: string = 'USD'
  ): Promise<any> {
    // We would use the storage service here
    // This is a placeholder for now
    return {
      id: 1,
      userId,
      name,
      initialBalance: initialBalance.toString(),
      currentBalance: initialBalance.toString(),
      currency,
      createdAt: new Date(),
      isActive: true,
      resetCount: 0
    };
  }

  /**
   * Execute a paper trade for a strategy
   */
  async executePaperTrade(
    accountId: number,
    userId: number,
    strategyId: number | null,
    symbol: string,
    type: 'buy' | 'sell' | 'deposit' | 'withdrawal',
    quantity: number,
    price: number | null = null,
    notes: string | null = null
  ): Promise<PaperTradingTransaction> {
    // For buy/sell, require price and calculate amount
    let amount = 0;
    if (type === 'buy' || type === 'sell') {
      if (price === null) {
        throw new Error('Price is required for buy/sell transactions');
      }
      amount = quantity * price;
    } else {
      // For deposit/withdrawal, amount is the quantity
      amount = quantity;
    }
    
    // We would save this to the database and implement paper trading logic
    // This is a placeholder for now
    return {
      id: 1,
      accountId,
      userId,
      strategyId,
      symbol,
      type,
      quantity: quantity.toString(),
      price: price?.toString() || null,
      amount: amount.toString(),
      fees: "0",
      timestamp: new Date(),
      notes: notes || null
    } as unknown as PaperTradingTransaction;
  }
  
  /**
   * Calculate technical indicators for a symbol
   */
  async calculateIndicators(
    symbol: string, 
    interval: string = '1d',
    limit: number = 100
  ): Promise<any[]> {
    // Get market data
    const marketData = await marketDataService.getHistoricalData(symbol, interval, limit);
    
    // Calculate indicators
    return indicatorCalculator.calculateAllIndicators(marketData);
  }
}

// Export singleton instance
export const strategyEngine = new StrategyEngine();

// Export sub-components for direct access if needed
export {
  indicatorCalculator,
  strategyEvaluator,
  strategyManager,
  marketDataService
};