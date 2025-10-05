/**
 * Broker Manager Service
 * Central interface for managing broker connections and trading operations
 */
import { IBroker, BrokerFactory, ConnectionStatus } from './broker-interface';
import { TradingAccount } from '@shared/schema';
import { storage } from '../storage';

/**
 * Manages broker connections and provides unified access to trading functions
 */
export class BrokerManager {
  private static instance: BrokerManager;
  private activeConnections: Map<number, IBroker> = new Map();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance of BrokerManager
   */
  public static getInstance(): BrokerManager {
    if (!BrokerManager.instance) {
      BrokerManager.instance = new BrokerManager();
    }
    return BrokerManager.instance;
  }
  
  /**
   * Connect to a broker using a trading account
   * @param accountId The trading account ID
   * @returns Connection status
   */
  public async connectBroker(accountId: number): Promise<ConnectionStatus> {
    // Check if already connected
    if (this.activeConnections.has(accountId)) {
      return ConnectionStatus.CONNECTED;
    }
    
    try {
      // Get trading account details
      const account = await storage.getTradingAccount(accountId);
      
      if (!account) {
        throw new Error(`Trading account not found: ${accountId}`);
      }
      
      // Create broker instance - now async
      const broker = await BrokerFactory.createBroker(account.broker);
      
      if (!broker) {
        throw new Error(`Unsupported broker type: ${account.broker}`);
      }
      
      // Prepare credentials based on broker type
      const credentials = this.prepareCredentials(account);
      
      // Connect to the broker
      const status = await broker.connect(credentials);
      
      if (status === ConnectionStatus.CONNECTED) {
        // Store the active connection
        this.activeConnections.set(accountId, broker);
        
        // Update account connection status in database
        await storage.updateTradingAccount(accountId, {
          connectionStatus: ConnectionStatus.CONNECTED,
          lastSynced: new Date()
        });
      } else {
        // Update account connection status in database
        await storage.updateTradingAccount(accountId, {
          connectionStatus: ConnectionStatus.ERROR
        });
      }
      
      return status;
    } catch (error) {
      console.error(`Error connecting to broker for account ${accountId}:`, error);
      
      // Update account connection status in database
      await storage.updateTradingAccount(accountId, {
        connectionStatus: ConnectionStatus.ERROR
      });
      
      return ConnectionStatus.ERROR;
    }
  }
  
  /**
   * Disconnect from a broker
   * @param accountId The trading account ID
   */
  public async disconnectBroker(accountId: number): Promise<void> {
    const broker = this.activeConnections.get(accountId);
    
    if (broker) {
      await broker.disconnect();
      this.activeConnections.delete(accountId);
      
      // Update account connection status in database
      await storage.updateTradingAccount(accountId, {
        connectionStatus: ConnectionStatus.DISCONNECTED
      });
    }
  }
  
  /**
   * Get the broker instance for a trading account
   * @param accountId The trading account ID
   * @returns The broker instance
   */
  public async getBroker(accountId: number): Promise<IBroker> {
    // Check if already connected
    let broker = this.activeConnections.get(accountId);
    
    if (!broker) {
      // Try to connect
      const status = await this.connectBroker(accountId);
      
      if (status !== ConnectionStatus.CONNECTED) {
        throw new Error(`Failed to connect to broker for account ${accountId}`);
      }
      
      broker = this.activeConnections.get(accountId);
      
      if (!broker) {
        throw new Error(`Broker connection not found for account ${accountId}`);
      }
    }
    
    return broker;
  }
  
  /**
   * Sync account information from the broker
   * @param accountId The trading account ID
   */
  public async syncAccountInfo(accountId: number): Promise<void> {
    try {
      const broker = await this.getBroker(accountId);
      
      // Get account info from broker
      const accountInfo = await broker.getAccountInfo();
      
      // Update account in database
      await storage.updateTradingAccount(accountId, {
        balance: accountInfo.balance.toString(),
        lastSynced: new Date(),
        currency: accountInfo.currency
      });
      
      console.log(`Synced account info for account ${accountId}`);
    } catch (error) {
      console.error(`Error syncing account info for account ${accountId}:`, error);
      throw error;
    }
  }
  
  /**
   * Prepare broker-specific credentials from a trading account
   * @param account The trading account
   * @returns Credentials object for the broker
   */
  private prepareCredentials(account: TradingAccount): any {
    switch (account.broker.toLowerCase()) {
      case 'ibkr':
        return {
          accountId: account.accountNumber,
          apiKey: account.apiKey,
          apiSecret: account.apiSecret
        };
        
      case 'tiger':
        return {
          accountId: account.accountNumber,
          apiKey: account.apiKey,
          apiSecret: account.apiSecret
        };
        
      case 'kucoin':
        return {
          apiKey: account.apiKey,
          apiSecret: account.apiSecret,
          passphrase: account.apiPassphrase
        };
        
      case 'kraken':
        return {
          apiKey: account.apiKey,
          apiSecret: account.apiSecret
        };
        
      default:
        throw new Error(`Unsupported broker type: ${account.broker}`);
    }
  }
}