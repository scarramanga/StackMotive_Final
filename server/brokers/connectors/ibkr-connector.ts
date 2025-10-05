/**
 * Interactive Brokers (IBKR) API connector
 * Implements the IBroker interface for Interactive Brokers
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
  OrderStatus
} from '../broker-interface';
import { getBrokerConfig } from '../../config/environment';
import axios, { AxiosInstance } from 'axios';

/**
 * IBKR API credentials
 */
export interface IBKRCredentials {
  accountId: string;
  apiKey?: string;
  apiSecret?: string;
}

/**
 * Interactive Brokers API Connector
 */
export class IBKRConnector extends BaseBroker {
  private client: AxiosInstance;
  private accountId: string = '';
  
  constructor() {
    super();
    const config = getBrokerConfig('ibkr');
    
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  async connect(credentials: IBKRCredentials): Promise<ConnectionStatus> {
    try {
      this.accountId = credentials.accountId;
      this.credentials = credentials;
      
      // In a real implementation, we would validate the connection
      // by making a test request to the IBKR API
      const response = await this.client.get('/portfolio/accounts');
      
      if (response.status === 200) {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        return ConnectionStatus.CONNECTED;
      } else {
        this.connectionStatus = ConnectionStatus.ERROR;
        return ConnectionStatus.ERROR;
      }
    } catch (error) {
      console.error('IBKR connection error:', error);
      this.connectionStatus = ConnectionStatus.ERROR;
      return ConnectionStatus.ERROR;
    }
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    await this.ensureConnected();
    
    try {
      // Make a request to get account info
      const response = await this.client.get(`/portfolio/accounts/${this.accountId}/summary`);
      const accountData = response.data;
      
      // Get positions to include in account info
      const positions = await this.getPositions();
      
      // Format to standardized account info structure
      return {
        accountId: this.accountId,
        balance: accountData.totalCashValue || 0,
        currency: accountData.currency || 'USD',
        equity: accountData.netLiquidation || 0,
        marginUsed: accountData.maintenanceMargin || 0,
        marginAvailable: accountData.availableFunds || 0,
        positions,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting IBKR account info:', error);
      throw new Error('Failed to retrieve account information');
    }
  }
  
  async getPositions(): Promise<Position[]> {
    await this.ensureConnected();
    
    try {
      // Make request to get positions
      const response = await this.client.get(`/portfolio/accounts/${this.accountId}/positions`);
      const positionsData = response.data;
      
      // Format to standardized positions structure
      return positionsData.map((position: any) => ({
        symbol: position.contract.symbol,
        assetType: this.mapAssetType(position.contract.secType),
        quantity: position.position,
        entryPrice: position.avgCost,
        markPrice: position.marketPrice,
        unrealizedPnl: position.unrealizedPnL,
        unrealizedPnlPercent: position.position !== 0 ? (position.unrealizedPnL / (position.avgCost * Math.abs(position.position))) * 100 : 0,
        marketValue: position.marketValue,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error getting IBKR positions:', error);
      throw new Error('Failed to retrieve positions');
    }
  }
  
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    await this.ensureConnected();
    
    if (!this.validateOrderRequest(order)) {
      throw new Error('Invalid order request');
    }
    
    try {
      // Format the order for IBKR API
      const ibkrOrder = this.formatOrderForIBKR(order);
      
      // Send the order request
      const response = await this.client.post(`/iserver/account/${this.accountId}/orders`, ibkrOrder);
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
      console.error('Error placing IBKR order:', error);
      throw new Error('Failed to place order');
    }
  }
  
  async cancelOrder(orderId: string): Promise<boolean> {
    await this.ensureConnected();
    
    try {
      // Send cancel order request
      const response = await this.client.delete(`/iserver/account/${this.accountId}/orders/${orderId}`);
      return response.status === 200;
    } catch (error) {
      console.error('Error canceling IBKR order:', error);
      throw new Error('Failed to cancel order');
    }
  }
  
  async getOrder(orderId: string): Promise<OrderResponse | null> {
    await this.ensureConnected();
    
    try {
      // Get order details
      const response = await this.client.get(`/iserver/account/${this.accountId}/orders/${orderId}`);
      const orderData = response.data;
      
      if (!orderData) {
        return null;
      }
      
      // Format to standardized order response
      return {
        orderId: orderData.orderId,
        symbol: orderData.contract.symbol,
        side: orderData.side === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapOrderType(orderData.orderType),
        quantity: orderData.totalQuantity,
        price: orderData.lmtPrice,
        stopPrice: orderData.auxPrice,
        status: this.mapOrderStatus(orderData.status),
        filledQuantity: orderData.filledQuantity || 0,
        remainingQuantity: orderData.remainingQuantity || orderData.totalQuantity,
        createdTime: new Date(orderData.createdTime),
        updatedTime: new Date(orderData.updatedTime || orderData.createdTime),
        clientOrderId: orderData.clientOrderId
      };
    } catch (error) {
      console.error('Error getting IBKR order:', error);
      return null;
    }
  }
  
  async getOpenOrders(): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get open orders
      const response = await this.client.get(`/iserver/account/${this.accountId}/orders`);
      const ordersData = response.data;
      
      // Format to standardized order responses
      return ordersData.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.contract.symbol,
        side: order.side === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapOrderType(order.orderType),
        quantity: order.totalQuantity,
        price: order.lmtPrice,
        stopPrice: order.auxPrice,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filledQuantity || 0,
        remainingQuantity: order.remainingQuantity || order.totalQuantity,
        createdTime: new Date(order.createdTime),
        updatedTime: new Date(order.updatedTime || order.createdTime),
        clientOrderId: order.clientOrderId
      }));
    } catch (error) {
      console.error('Error getting IBKR open orders:', error);
      throw new Error('Failed to retrieve open orders');
    }
  }
  
  async getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get order history
      const response = await this.client.get(`/iserver/account/${this.accountId}/orders/history`, {
        params: {
          symbol,
          limit
        }
      });
      const ordersData = response.data;
      
      // Format to standardized order responses
      return ordersData.map((order: any) => ({
        orderId: order.orderId,
        symbol: order.contract.symbol,
        side: order.side === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapOrderType(order.orderType),
        quantity: order.totalQuantity,
        price: order.lmtPrice,
        stopPrice: order.auxPrice,
        status: this.mapOrderStatus(order.status),
        filledQuantity: order.filledQuantity || 0,
        remainingQuantity: order.remainingQuantity || 0,
        createdTime: new Date(order.createdTime),
        updatedTime: new Date(order.updatedTime || order.createdTime),
        clientOrderId: order.clientOrderId
      }));
    } catch (error) {
      console.error('Error getting IBKR order history:', error);
      throw new Error('Failed to retrieve order history');
    }
  }
  
  async getQuote(symbol: string): Promise<MarketQuote> {
    await this.ensureConnected();
    
    try {
      // Get market data for symbol
      const response = await this.client.get('/iserver/marketdata/snapshot', {
        params: {
          conids: await this.getContractId(symbol)
        }
      });
      const quoteData = response.data[0];
      
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
      console.error(`Error getting IBKR quote for ${symbol}:`, error);
      throw new Error(`Failed to retrieve quote for ${symbol}`);
    }
  }
  
  async getHistoricalData(symbol: string, interval: string, from: Date, to: Date): Promise<any[]> {
    await this.ensureConnected();
    
    try {
      // Format time parameters
      const startTime = Math.floor(from.getTime() / 1000);
      const endTime = Math.floor(to.getTime() / 1000);
      
      // Map interval to IBKR bar size
      const barSize = this.mapIntervalToBarSize(interval);
      
      // Get contract ID for the symbol
      const conid = await this.getContractId(symbol);
      
      // Get historical data
      const response = await this.client.get('/iserver/marketdata/history', {
        params: {
          conid,
          period: `${startTime}-${endTime}`,
          bar: barSize
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`Error getting IBKR historical data for ${symbol}:`, error);
      throw new Error(`Failed to retrieve historical data for ${symbol}`);
    }
  }
  
  async validateSymbol(symbol: string): Promise<boolean> {
    await this.ensureConnected();
    
    try {
      // Search for the symbol
      const response = await this.client.get('/iserver/secdef/search', {
        params: {
          symbol
        }
      });
      
      // If we get results, the symbol is valid
      return response.data.length > 0;
    } catch (error) {
      console.error(`Error validating IBKR symbol ${symbol}:`, error);
      return false;
    }
  }
  
  // Helper methods
  private async ensureConnected(): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Not connected to IBKR. Call connect() first.');
    }
  }
  
  private formatOrderForIBKR(order: OrderRequest): any {
    // Format the order for IBKR API
    return {
      acctId: this.accountId,
      conid: 0, // Would be obtained from symbol in real implementation
      secType: 'STK', // Default to stock
      side: order.side,
      orderType: order.type,
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
      tif: order.timeInForce || 'GTC',
      outsideRth: false
    };
  }
  
  private async getContractId(symbol: string): Promise<string> {
    // In a real implementation, this would search for the contract ID
    // For now, return a placeholder
    const response = await this.client.get('/iserver/secdef/search', {
      params: {
        symbol
      }
    });
    
    if (response.data.length > 0) {
      return response.data[0].conid;
    }
    
    throw new Error(`Could not find contract ID for symbol ${symbol}`);
  }
  
  private mapAssetType(secType: string): AssetType {
    switch (secType) {
      case 'STK': return AssetType.STOCK;
      case 'CRYPTO': return AssetType.CRYPTO;
      case 'CASH': return AssetType.FOREX;
      case 'FUT': return AssetType.FUTURES;
      case 'OPT': return AssetType.OPTIONS;
      default: return AssetType.STOCK;
    }
  }
  
  private mapOrderType(orderType: string): any {
    // Map IBKR order types to our standardized types
    // Implementation would depend on IBKR's specific order type strings
    return orderType;
  }
  
  private mapOrderStatus(status: string): OrderStatus {
    // Map IBKR order status to our standardized status
    // Implementation would depend on IBKR's specific status strings
    switch (status.toUpperCase()) {
      case 'SUBMITTED': return OrderStatus.NEW;
      case 'PENDINGSUBMIT': return OrderStatus.NEW;
      case 'PRESUBMITTED': return OrderStatus.NEW;
      case 'FILLED': return OrderStatus.FILLED;
      case 'PARTIALLYEXECUTED': return OrderStatus.PARTIALLY_FILLED;
      case 'CANCELLED': return OrderStatus.CANCELED;
      case 'PENDINGCANCEL': return OrderStatus.CANCELED;
      case 'REJECTED': return OrderStatus.REJECTED;
      case 'EXPIRED': return OrderStatus.EXPIRED;
      default: return OrderStatus.NEW;
    }
  }
  
  private mapIntervalToBarSize(interval: string): string {
    // Map our interval format to IBKR bar size
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