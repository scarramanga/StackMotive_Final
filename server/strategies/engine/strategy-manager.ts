import { db } from '../../db';
import { storage } from '../../storage';
import { 
  Strategy, 
  AutomationPreference, 
  TradingSignal, 
  InsertTradingSignal, 
  TradingAccount
} from '@shared/schema';
import { indicatorCalculator, CandleData } from './indicator-calculator';
import { strategyEvaluator, SignalResult, SignalAction } from './strategy-evaluator';

/**
 * Strategy Manager
 * Handles the execution of strategies, signals, and automated trading
 */

export interface MarketDataProvider {
  getHistoricalData(symbol: string, interval: string, limit: number): Promise<CandleData[]>;
  getCurrentPrice(symbol: string): Promise<number>;
}

export enum AutomationLevel {
  NOTIFICATION = 'notification',
  SEMI_AUTO = 'semi',
  FULL_AUTO = 'full'
}

export class StrategyManager {
  private marketDataProvider: MarketDataProvider;
  
  constructor(marketDataProvider: MarketDataProvider) {
    this.marketDataProvider = marketDataProvider;
  }
  
  /**
   * Run all active strategies for a user
   * @param userId User to run strategies for
   * @returns Generated signals
   */
  async runUserStrategies(userId: number): Promise<TradingSignal[]> {
    try {
      // Fetch user's active strategies
      const strategies = await storage.getStrategies(userId);
      if (!strategies || strategies.length === 0) {
        console.log(`No active strategies found for user ${userId}`);
        return [];
      }
      
      const signals: TradingSignal[] = [];
      
      for (const strategy of strategies) {
        try {
          if (strategy.status !== 'active') {
            console.log(`Skipping inactive strategy ${strategy.id}`);
            continue;
          }
          
          const strategySignals = await this.runStrategy(strategy);
          signals.push(...strategySignals);
        } catch (error) {
          console.error(`Error running strategy ${strategy.id}:`, error);
        }
      }
      
      return signals;
    } catch (error) {
      console.error(`Error running strategies for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Run a specific strategy
   * @param strategy Strategy to evaluate
   * @returns Generated signals
   */
  async runStrategy(strategy: Strategy): Promise<TradingSignal[]> {
    try {
      console.log(`Running strategy ${strategy.id}: ${strategy.name}`);
      
      // Get strategy symbol
      const symbol = strategy.symbol;
      if (!symbol) {
        console.error(`Strategy ${strategy.id} has no symbol`);
        return [];
      }
      
      // Fetch relevant market data
      const marketData = await this.marketDataProvider.getHistoricalData(
        symbol, 
        '1d', // Default to daily interval
        100 // Fetch enough data for indicators
      );
      
      if (!marketData || marketData.length === 0) {
        console.error(`No market data available for ${symbol}`);
        return [];
      }
      
      // Evaluate the strategy
      const signalResult = await strategyEvaluator.evaluateStrategy(strategy, {
        strategyId: strategy.id,
        userId: strategy.userId,
        symbol,
        marketData
      });
      
      if (!signalResult || signalResult.action === SignalAction.HOLD) {
        console.log(`No actionable signal generated for strategy ${strategy.id}`);
        return [];
      }
      
      // Persist the signal
      const signal = await this.persistSignal(signalResult);
      if (!signal) {
        console.error(`Failed to persist signal for strategy ${strategy.id}`);
        return [];
      }
      
      // Check for automation preferences and execute if needed
      await this.handleAutomation(signal, strategy);
      
      return [signal];
    } catch (error) {
      console.error(`Error running strategy ${strategy.id}:`, error);
      return [];
    }
  }
  
  /**
   * Persist a signal to the database
   * @param signalResult Signal to persist
   * @returns Persisted signal
   */
  private async persistSignal(signalResult: SignalResult): Promise<TradingSignal | null> {
    try {
      // Create the trading signal
      const newSignal: InsertTradingSignal = {
        userId: signalResult.userId,
        strategyId: signalResult.strategyId,
        symbol: signalResult.symbol,
        action: signalResult.action,
        signalStrength: signalResult.signalStrength,
        status: 'pending',
        technicalIndicators: signalResult.technicalIndicators,
        newsIds: signalResult.newsIds,
        sentimentIds: signalResult.sentimentIds,
        notes: signalResult.notes,
      };
      
      // Insert into database
      return await storage.createTradingSignal(newSignal);
    } catch (error) {
      console.error('Error persisting signal:', error);
      return null;
    }
  }
  
  /**
   * Handle automation based on user preferences
   * @param signal Signal to potentially automate
   * @param strategy Strategy that generated the signal
   */
  private async handleAutomation(signal: TradingSignal, strategy: Strategy): Promise<void> {
    try {
      // Get automation preferences for this strategy
      const automationPrefs = await storage.getAutomationPreferences(strategy.userId, strategy.id);
      if (!automationPrefs) {
        console.log(`No automation preferences for strategy ${strategy.id}`);
        return;
      }
      
      const automationLevel = automationPrefs.automationLevel;
      
      // Check signal strength against minimum requirement
      if (automationPrefs.minSignalStrength) {
        const minStrength = parseFloat(automationPrefs.minSignalStrength);
        const signalStrengthValue = this.signalStrengthToNumber(signal.signalStrength);
        
        if (signalStrengthValue < minStrength) {
          console.log(`Signal strength ${signalStrengthValue} below minimum ${minStrength}`);
          return;
        }
      }
      
      // Handle based on automation level
      switch (automationLevel) {
        case AutomationLevel.NOTIFICATION:
          await this.sendNotification(signal, automationPrefs);
          break;
          
        case AutomationLevel.SEMI_AUTO:
          // Set up for semi-automated approval
          await this.prepareForApproval(signal, automationPrefs);
          break;
          
        case AutomationLevel.FULL_AUTO:
          // Execute the trade automatically
          if (strategy.accountId) {
            await this.executeTrade(signal, strategy.accountId, automationPrefs);
          } else {
            console.error(`Strategy ${strategy.id} has no account for automated trading`);
          }
          break;
          
        default:
          console.log(`Unknown automation level: ${automationLevel}`);
      }
    } catch (error) {
      console.error(`Error handling automation for signal ${signal.id}:`, error);
    }
  }
  
  /**
   * Send notification about a signal
   * @param signal Signal to notify about
   * @param automationPrefs User's automation preferences
   */
  private async sendNotification(signal: TradingSignal, automationPrefs: AutomationPreference): Promise<void> {
    try {
      const channels = automationPrefs.notificationChannels || [];
      
      if (channels.length === 0) {
        console.log(`No notification channels configured for user ${signal.userId}`);
        return;
      }
      
      const message = `Trading Signal: ${signal.action.toUpperCase()} ${signal.symbol} - ${signal.signalStrength} strength`;
      
      // For each configured channel, send notification
      for (const channel of channels) {
        switch (channel) {
          case 'email':
            console.log(`Sending email notification for signal ${signal.id}`);
            // TODO: Implement email notification
            break;
            
          case 'sms':
            console.log(`Sending SMS notification for signal ${signal.id}`);
            // TODO: Implement SMS notification
            break;
            
          case 'push':
            console.log(`Sending push notification for signal ${signal.id}`);
            // TODO: Implement push notification
            break;
            
          case 'in-app':
            // Already done by creating the signal
            console.log(`In-app notification ready for signal ${signal.id}`);
            break;
            
          default:
            console.warn(`Unknown notification channel: ${channel}`);
        }
      }
      
      // Update signal status
      await storage.updateTradingSignal(signal.id, { status: 'notified' });
    } catch (error) {
      console.error(`Error sending notification for signal ${signal.id}:`, error);
    }
  }
  
  /**
   * Prepare a signal for semi-automated approval
   * @param signal Signal to prepare
   * @param automationPrefs User's automation preferences
   */
  private async prepareForApproval(signal: TradingSignal, automationPrefs: AutomationPreference): Promise<void> {
    try {
      // Set status as awaiting approval
      await storage.updateTradingSignal(signal.id, { status: 'awaiting_approval' });
      
      // Send notification about approval needed
      const channels = automationPrefs.notificationChannels || [];
      
      if (channels.length === 0) {
        console.log(`No notification channels configured for user ${signal.userId}`);
        return;
      }
      
      const message = `ACTION REQUIRED: ${signal.action.toUpperCase()} ${signal.symbol} - ${signal.signalStrength} strength`;
      
      // Similar notification logic as above
      // TODO: Implement notification for approval
    } catch (error) {
      console.error(`Error preparing signal ${signal.id} for approval:`, error);
    }
  }
  
  /**
   * Execute a trade based on a signal
   * @param signal Signal to execute
   * @param accountId Trading account to use
   * @param automationPrefs User's automation preferences
   */
  private async executeTrade(
    signal: TradingSignal, 
    accountId: number, 
    automationPrefs: AutomationPreference
  ): Promise<void> {
    try {
      console.log(`Executing automated trade for signal ${signal.id}`);
      
      // Get trading account
      const account = await storage.getTradingAccount(accountId);
      if (!account) {
        console.error(`Trading account ${accountId} not found`);
        return;
      }
      
      // In this implementation we'll simulate trade execution
      // In a real system, this would connect to a broker API
      
      // Get current price
      const currentPrice = await this.marketDataProvider.getCurrentPrice(signal.symbol);
      
      // Determine trade amount
      const maxAmount = automationPrefs.maxTradeAmount ? 
        parseFloat(automationPrefs.maxTradeAmount) : 0;
      
      // Default to a small percentage of account balance if not specified
      let tradeAmount = maxAmount;
      if (!maxAmount && account.balance) {
        tradeAmount = parseFloat(account.balance) * 0.02; // 2% of account by default
      }
      
      if (!tradeAmount) {
        console.error(`Could not determine trade amount for signal ${signal.id}`);
        return;
      }
      
      // Calculate quantity based on price
      const quantity = (tradeAmount / currentPrice).toFixed(8);
      
      // Create a trade record
      const trade = await storage.createTrade({
        userId: signal.userId,
        symbol: signal.symbol,
        type: signal.action,
        status: 'executed',
        entryPrice: currentPrice.toString(),
        amount: tradeAmount.toString(),
        entryTime: new Date(),
        exchange: account.broker,
        strategyId: signal.strategyId,
        signalId: signal.id,
        notes: `Automated trade from signal ${signal.id}`,
      });
      
      if (!trade) {
        console.error(`Failed to create trade record for signal ${signal.id}`);
        return;
      }
      
      // Update signal status
      await storage.updateTradingSignal(signal.id, { 
        status: 'executed',
        executedAt: new Date()
      });
      
      console.log(`Successfully executed trade ${trade.id} for signal ${signal.id}`);
    } catch (error) {
      console.error(`Error executing trade for signal ${signal.id}:`, error);
      
      // Update signal status to indicate error
      await storage.updateTradingSignal(signal.id, { 
        status: 'error',
        notes: `${signal.notes || ''} Error: ${error.message}`
      });
    }
  }
  
  /**
   * Convert signal strength enum to numeric value
   * @param strength Signal strength as enum
   * @returns Numeric value (0-1)
   */
  private signalStrengthToNumber(strength: string): number {
    switch (strength) {
      case 'very_strong': return 0.9;
      case 'strong': return 0.75;
      case 'moderate': return 0.6;
      case 'weak': return 0.4;
      default: return 0.5;
    }
  }
}

// For historical and current market data
export class MarketDataService implements MarketDataProvider {
  /**
   * Get historical price/volume data
   * @param symbol Symbol to fetch
   * @param interval Time interval (e.g., 1m, 5m, 1h, 1d)
   * @param limit Number of candles to fetch
   * @returns Array of candle data
   */
  async getHistoricalData(
    symbol: string, 
    interval: string = '1d', 
    limit: number = 100
  ): Promise<CandleData[]> {
    try {
      // For the prototype, we'll use mock data
      // In production, this would fetch from an API or database
      
      // TODO: Replace with real data service
      // This would connect to an external API like Alpha Vantage, Yahoo Finance, etc.
      
      const now = new Date();
      const mockData: CandleData[] = [];
      
      // Generate mock data
      for (let i = 0; i < limit; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        
        // Generate somewhat realistic price data
        const basePrice = symbol.includes('BTC') ? 60000 : 150;
        const randomFactor = 0.01 * (Math.random() - 0.5);
        const dayFactor = 0.001 * (limit - i);
        
        const close = basePrice * (1 + randomFactor + dayFactor);
        const open = close * (1 + 0.005 * (Math.random() - 0.5));
        const high = Math.max(open, close) * (1 + 0.01 * Math.random());
        const low = Math.min(open, close) * (1 - 0.01 * Math.random());
        const volume = basePrice * 1000 * (1 + Math.random());
        
        mockData.push({
          timestamp: date,
          open,
          high,
          low,
          close,
          volume,
          symbol,
          interval
        });
      }
      
      // Sort by timestamp ascending (oldest first)
      return mockData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get current price for a symbol
   * @param symbol Symbol to fetch price for
   * @returns Current price
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // For prototype, we'll use mock data
      // In production, this would fetch from a real-time API
      
      // Generate realistic price based on symbol
      if (symbol.includes('BTC')) {
        return 60000 + (Math.random() - 0.5) * 1000;
      } else if (symbol.includes('ETH')) {
        return 2500 + (Math.random() - 0.5) * 50;
      } else {
        return 150 + (Math.random() - 0.5) * 5;
      }
    } catch (error) {
      console.error(`Error fetching current price for ${symbol}:`, error);
      throw error;
    }
  }
}

// Export services
export const marketDataService = new MarketDataService();
export const strategyManager = new StrategyManager(marketDataService);