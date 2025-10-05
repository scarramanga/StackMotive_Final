/**
 * Base interface for all broker connections
 * This defines the contract that all specific broker implementations must follow
 */

// Order types
export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT',
  TRAILING_STOP = 'TRAILING_STOP',
}

// Order side
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

// Time in force
export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancelled
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
  DAY = 'DAY', // Day only
}

// Order status
export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// Asset type
export enum AssetType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  FUTURES = 'FUTURES',
  OPTIONS = 'OPTIONS',
}

// Order request
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // Required for LIMIT and STOP_LIMIT orders
  stopPrice?: number; // Required for STOP and STOP_LIMIT orders
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

// Order response
export interface OrderResponse {
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  createdTime: Date;
  updatedTime: Date;
  clientOrderId?: string;
}

// Position
export interface Position {
  symbol: string;
  assetType: AssetType;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  marketValue: number;
  lastUpdated: Date;
}

// Account information
export interface AccountInfo {
  accountId: string;
  balance: number;
  currency: string;
  equity: number;
  marginUsed?: number;
  marginAvailable?: number;
  positions: Position[];
  lastUpdated: Date;
}

// Connection status
export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

// Market data quote
export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: Date;
}

// Broker interface
export interface IBroker {
  // Connection
  connect(credentials: any): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Account and positions
  getAccountInfo(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  
  // Order management
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<boolean>;
  getOrder(orderId: string): Promise<OrderResponse | null>;
  getOpenOrders(): Promise<OrderResponse[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]>;
  
  // Market data
  getQuote(symbol: string): Promise<MarketQuote>;
  getHistoricalData(symbol: string, interval: string, from: Date, to: Date): Promise<any[]>;
  
  // Utils
  validateSymbol(symbol: string): Promise<boolean>;
}

/**
 * Base class with common functionality for brokers
 */
export abstract class BaseBroker implements IBroker {
  protected connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  protected credentials: any;
  
  // Connection methods
  abstract connect(credentials: any): Promise<ConnectionStatus>;
  
  async disconnect(): Promise<void> {
    this.connectionStatus = ConnectionStatus.DISCONNECTED;
  }
  
  async isConnected(): Promise<boolean> {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }
  
  // Must be implemented by each broker
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getPositions(): Promise<Position[]>;
  abstract placeOrder(order: OrderRequest): Promise<OrderResponse>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract getOrder(orderId: string): Promise<OrderResponse | null>;
  abstract getOpenOrders(): Promise<OrderResponse[]>;
  abstract getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]>;
  abstract getQuote(symbol: string): Promise<MarketQuote>;
  abstract getHistoricalData(symbol: string, interval: string, from: Date, to: Date): Promise<any[]>;
  abstract validateSymbol(symbol: string): Promise<boolean>;
  
  // Helper methods
  protected validateOrderRequest(order: OrderRequest): boolean {
    // Basic validation
    if (!order.symbol || !order.quantity || !order.side || !order.type) {
      return false;
    }
    
    // Type-specific validation
    if ((order.type === OrderType.LIMIT || order.type === OrderType.STOP_LIMIT) && !order.price) {
      return false;
    }
    
    if ((order.type === OrderType.STOP || order.type === OrderType.STOP_LIMIT) && !order.stopPrice) {
      return false;
    }
    
    return true;
  }
}

// Factory to create broker instances
export class BrokerFactory {
  static async createBroker(brokerType: string): Promise<IBroker | null> {
    try {
      switch (brokerType.toLowerCase()) {
        case 'ibkr': {
          // Lazy-load the IBKR connector
          const IBKRModule = await import('./connectors/ibkr-connector');
          return new IBKRModule.IBKRConnector();
        }
        
        case 'tiger': {
          // Lazy-load the Tiger connector
          const TigerModule = await import('./connectors/tiger-connector');
          return new TigerModule.TigerConnector();
        }
          
        case 'kucoin': {
          // Lazy-load the KuCoin connector
          const KuCoinModule = await import('./connectors/kucoin-connector');
          return new KuCoinModule.KuCoinConnector();
        }
          
        case 'kraken': {
          // Lazy-load the Kraken connector
          const KrakenModule = await import('./connectors/kraken-connector');
          return new KrakenModule.KrakenConnector();
        }
          
        default:
          console.error(`Unsupported broker type: ${brokerType}`);
          return null;
      }
    } catch (error) {
      console.error(`Error loading broker connector for ${brokerType}:`, error);
      return null;
    }
  }
}