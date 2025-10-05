/**
 * Tiger Brokers API connector
 * Implements the IBroker interface for Tiger Brokers
 */
import { 
  BaseBroker, 
  ConnectionStatus, 
  OrderRequest, 
  OrderResponse,
  MarketQuote,
  AccountInfo,
  Position,
  AssetType,
  OrderSide,
  OrderStatus,
  OrderType
} from '../broker-interface';
import { getBrokerConfig } from '../../config/environment';
import axios, { AxiosInstance } from 'axios';

/**
 * Tiger API credentials
 */
export interface TigerCredentials {
  accountId: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Tiger Brokers API Connector
 */
export class TigerConnector extends BaseBroker {
  private client: AxiosInstance;
  private accountId: string = '';
  
  constructor() {
    super();
    const config = getBrokerConfig('tiger');
    
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  async connect(credentials: TigerCredentials): Promise<ConnectionStatus> {
    try {
      this.accountId = credentials.accountId;
      this.credentials = credentials;
      
      // Set up authentication headers for all requests
      this.client.interceptors.request.use(config => {
        // Using Axios v1.x headers format
        const headers = new axios.AxiosHeaders();
        
        // Add the existing headers if any
        if (config.headers) {
          Object.entries(config.headers).forEach(([key, value]) => {
            if (value !== undefined) headers.set(key, value);
          });
        }
        
        // Add Tiger specific headers
        headers.set('Authorization', `Bearer ${credentials.apiKey}`);
        headers.set('Tiger-Timestamp', Date.now().toString());
        
        config.headers = headers;
        
        // In a real implementation, we would also sign the request
        // using the API secret and append the signature to the headers
        
        return config;
      });
      
      // Make a test request to validate connection
      const response = await this.client.get('/account/summary');
      
      if (response.status === 200) {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        return ConnectionStatus.CONNECTED;
      } else {
        this.connectionStatus = ConnectionStatus.ERROR;
        return ConnectionStatus.ERROR;
      }
    } catch (error) {
      console.error('Tiger connection error:', error);
      this.connectionStatus = ConnectionStatus.ERROR;
      return ConnectionStatus.ERROR;
    }
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    await this.ensureConnected();
    
    try {
      // Get account summary
      const summaryResponse = await this.client.get(`/account/${this.accountId}/summary`);
      const accountData = summaryResponse.data;
      
      // Get positions
      const positions = await this.getPositions();
      
      // Format to standardized account info structure
      return {
        accountId: this.accountId,
        balance: accountData.cashBalance,
        currency: accountData.currency || 'USD',
        equity: accountData.netLiquidation,
        marginUsed: accountData.maintenanceMargin,
        marginAvailable: accountData.excessLiquidity,
        positions,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting Tiger account info:', error);
      throw new Error('Failed to retrieve account information');
    }
  }
  
  async getPositions(): Promise<Position[]> {
    await this.ensureConnected();
    
    try {
      // Get positions
      const response = await this.client.get(`/account/${this.accountId}/positions`);
      const positionsData = response.data.items || [];
      
      // Format to standardized positions structure
      return positionsData.map((position: any) => ({
        symbol: position.symbol,
        assetType: this.mapAssetType(position.assetType),
        quantity: position.quantity,
        entryPrice: position.averageCost,
        markPrice: position.marketPrice,
        unrealizedPnl: position.unrealizedPnl,
        unrealizedPnlPercent: position.unrealizedPnlPercent,
        marketValue: position.marketValue,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error getting Tiger positions:', error);
      throw new Error('Failed to retrieve positions');
    }
  }
  
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    await this.ensureConnected();
    
    if (!this.validateOrderRequest(order)) {
      throw new Error('Invalid order request');
    }
    
    try {
      // Format order for Tiger API
      const tigerOrder = this.formatOrderForTiger(order);
      
      // Place order
      const response = await this.client.post(`/order`, tigerOrder);
      const orderData = response.data;
      
      // Format to standardized order response
      return {
        orderId: orderData.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        status: OrderStatus.NEW,
        filledQuantity: 0,
        remainingQuantity: order.quantity,
        createdTime: new Date(),
        updatedTime: new Date(),
        clientOrderId: order.clientOrderId
      };
    } catch (error) {
      console.error('Error placing Tiger order:', error);
      throw new Error('Failed to place order');
    }
  }
  
  async cancelOrder(orderId: string): Promise<boolean> {
    await this.ensureConnected();
    
    try {
      // Cancel order
      const response = await this.client.delete(`/order/${orderId}`);
      return response.status === 200;
    } catch (error) {
      console.error('Error canceling Tiger order:', error);
      throw new Error('Failed to cancel order');
    }
  }
  
  async getOrder(orderId: string): Promise<OrderResponse | null> {
    await this.ensureConnected();
    
    try {
      // Get order details
      const response = await this.client.get(`/order/${orderId}`);
      const orderData = response.data;
      
      if (!orderData) {
        return null;
      }
      
      // Format to standardized order response
      return {
        orderId: orderData.orderId,
        symbol: orderData.symbol,
        side: this.mapOrderSide(orderData.action),
        type: this.mapOrderType(orderData.orderType),
        quantity: orderData.totalQuantity,
        price: orderData.limitPrice,
        stopPrice: orderData.stopPrice,
        status: this.mapOrderStatus(orderData.status),
        filledQuantity: orderData.filledQuantity || 0,
        remainingQuantity: orderData.remainingQuantity || orderData.totalQuantity,
        createdTime: new Date(orderData.createdTime),
        updatedTime: new Date(orderData.updatedTime || orderData.createdTime),
        clientOrderId: orderData.clientOrderId
      };
    } catch (error) {
      console.error('Error getting Tiger order:', error);
      return null;
    }
  }
  
  async getOpenOrders(): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get open orders
      const response = await this.client.get(`/account/${this.accountId}/orders/active`);
      const ordersData = response.data.items || [];
      
      // Format to standardized order responses
      return ordersData.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: this.mapOrderSide(order.action),
        type: this.mapOrderType(order.orderType),
        quantity: order.totalQuantity,
        price: order.limitPrice,
        stopPrice: order.stopPrice,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filledQuantity || 0,
        remainingQuantity: order.remainingQuantity || order.totalQuantity,
        createdTime: new Date(order.createdTime),
        updatedTime: new Date(order.updatedTime || order.createdTime),
        clientOrderId: order.clientOrderId
      }));
    } catch (error) {
      console.error('Error getting Tiger open orders:', error);
      throw new Error('Failed to retrieve open orders');
    }
  }
  
  async getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get order history
      const params: any = {
        limit: limit || 50
      };
      
      if (symbol) {
        params.symbol = symbol;
      }
      
      const response = await this.client.get(`/account/${this.accountId}/orders/history`, {
        params
      });
      
      const ordersData = response.data.items || [];
      
      // Format to standardized order responses
      return ordersData.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: this.mapOrderSide(order.action),
        type: this.mapOrderType(order.orderType),
        quantity: order.totalQuantity,
        price: order.limitPrice,
        stopPrice: order.stopPrice,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filledQuantity || 0,
        remainingQuantity: order.remainingQuantity || 0,
        createdTime: new Date(order.createdTime),
        updatedTime: new Date(order.updatedTime || order.createdTime),
        clientOrderId: order.clientOrderId
      }));
    } catch (error) {
      console.error('Error getting Tiger order history:', error);
      throw new Error('Failed to retrieve order history');
    }
  }
  
  async getQuote(symbol: string): Promise<MarketQuote> {
    await this.ensureConnected();
    
    try {
      // Get market data for symbol
      const response = await this.client.get('/market/quote', {
        params: {
          symbols: symbol
        }
      });
      
      const quoteData = response.data.items?.[0];
      
      if (!quoteData) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }
      
      // Format to standardized market quote
      return {
        symbol,
        bid: quoteData.bid || 0,
        ask: quoteData.ask || 0,
        last: quoteData.last || 0,
        volume: quoteData.volume || 0,
        timestamp: new Date(quoteData.timestamp || Date.now())
      };
    } catch (error) {
      console.error(`Error getting Tiger quote for ${symbol}:`, error);
      throw new Error(`Failed to retrieve quote for ${symbol}`);
    }
  }
  
  async getHistoricalData(symbol: string, interval: string, from: Date, to: Date): Promise<any[]> {
    await this.ensureConnected();
    
    try {
      // Format time parameters
      const startTime = from.toISOString();
      const endTime = to.toISOString();
      
      // Map interval to Tiger bar size
      const period = this.mapIntervalToPeriod(interval);
      
      // Get historical data
      const response = await this.client.get('/market/history', {
        params: {
          symbol,
          period,
          startTime,
          endTime
        }
      });
      
      return response.data.items || [];
    } catch (error) {
      console.error(`Error getting Tiger historical data for ${symbol}:`, error);
      throw new Error(`Failed to retrieve historical data for ${symbol}`);
    }
  }
  
  async validateSymbol(symbol: string): Promise<boolean> {
    await this.ensureConnected();
    
    try {
      // Search for the symbol
      const response = await this.client.get('/market/symbols/search', {
        params: {
          keyword: symbol
        }
      });
      
      // If we get results, the symbol is valid
      const results = response.data.items || [];
      return results.some((item: any) => item.symbol === symbol);
    } catch (error) {
      console.error(`Error validating Tiger symbol ${symbol}:`, error);
      return false;
    }
  }
  
  // Helper methods
  private async ensureConnected(): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Not connected to Tiger. Call connect() first.');
    }
  }
  
  private formatOrderForTiger(order: OrderRequest): any {
    // Format the order for Tiger API
    return {
      accountId: this.accountId,
      symbol: order.symbol,
      action: order.side === OrderSide.BUY ? 'BUY' : 'SELL',
      orderType: this.tigerOrderType(order.type),
      totalQuantity: order.quantity,
      limitPrice: order.price,
      stopPrice: order.stopPrice,
      timeInForce: order.timeInForce || 'GTC',
      clientOrderId: order.clientOrderId
    };
  }
  
  private mapAssetType(assetType: string): AssetType {
    switch (assetType?.toUpperCase()) {
      case 'STK': return AssetType.STOCK;
      case 'CRYPTO': return AssetType.CRYPTO;
      case 'FOREX': return AssetType.FOREX;
      case 'FUT': return AssetType.FUTURES;
      case 'OPT': return AssetType.OPTIONS;
      default: return AssetType.STOCK;
    }
  }
  
  private mapOrderSide(action: string): OrderSide {
    return action?.toUpperCase() === 'BUY' ? OrderSide.BUY : OrderSide.SELL;
  }
  
  private mapOrderType(orderType: string): OrderType {
    switch (orderType?.toUpperCase()) {
      case 'LIMIT': return OrderType.LIMIT;
      case 'MARKET': return OrderType.MARKET;
      case 'STOP': return OrderType.STOP;
      case 'STOP_LIMIT': return OrderType.STOP_LIMIT;
      case 'TRAILING_STOP': return OrderType.TRAILING_STOP;
      default: return OrderType.MARKET;
    }
  }
  
  private tigerOrderType(orderType: OrderType): string {
    switch (orderType) {
      case OrderType.LIMIT: return 'LMT';
      case OrderType.MARKET: return 'MKT';
      case OrderType.STOP: return 'STP';
      case OrderType.STOP_LIMIT: return 'STP LMT';
      case OrderType.TRAILING_STOP: return 'TRAIL';
      default: return 'MKT';
    }
  }
  
  private mapOrderStatus(status: string): OrderStatus {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED': return OrderStatus.NEW;
      case 'PENDING_SUBMIT': return OrderStatus.NEW;
      case 'FILLED': return OrderStatus.FILLED;
      case 'PARTIALLY_FILLED': return OrderStatus.PARTIALLY_FILLED;
      case 'CANCELLED': return OrderStatus.CANCELED;
      case 'PENDING_CANCEL': return OrderStatus.CANCELED;
      case 'REJECTED': return OrderStatus.REJECTED;
      case 'EXPIRED': return OrderStatus.EXPIRED;
      default: return OrderStatus.NEW;
    }
  }
  
  private mapIntervalToPeriod(interval: string): string {
    switch (interval) {
      case '1m': return '1min';
      case '5m': return '5min';
      case '15m': return '15min';
      case '30m': return '30min';
      case '1h': return '1hour';
      case '4h': return '4hour';
      case '1d': return '1day';
      case '1w': return '1week';
      case '1M': return '1month';
      default: return '1min';
    }
  }
}