/**
 * Kraken API connector
 * Implements the IBroker interface for Kraken cryptocurrency exchange
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
import crypto from 'crypto';
import querystring from 'querystring';

/**
 * Kraken API credentials
 */
export interface KrakenCredentials {
  apiKey: string;
  apiSecret: string;
}

/**
 * Kraken API Connector
 */
export class KrakenConnector extends BaseBroker {
  private client: AxiosInstance;
  
  constructor() {
    super();
    const config = getBrokerConfig('kraken');
    
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'StackMotive Trading Platform'
      }
    });
  }
  
  async connect(credentials: KrakenCredentials): Promise<ConnectionStatus> {
    try {
      this.credentials = credentials;
      
      // Make a test request to validate connection
      const balanceResponse = await this.makeAuthenticatedRequest('/0/private/Balance', {});
      
      if (balanceResponse.error && balanceResponse.error.length > 0) {
        console.error('Kraken connection error:', balanceResponse.error);
        this.connectionStatus = ConnectionStatus.ERROR;
        return ConnectionStatus.ERROR;
      }
      
      this.connectionStatus = ConnectionStatus.CONNECTED;
      return ConnectionStatus.CONNECTED;
    } catch (error) {
      console.error('Kraken connection error:', error);
      this.connectionStatus = ConnectionStatus.ERROR;
      return ConnectionStatus.ERROR;
    }
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    await this.ensureConnected();
    
    try {
      // Get account balance
      const balanceResponse = await this.makeAuthenticatedRequest('/0/private/Balance', {});
      
      if (balanceResponse.error && balanceResponse.error.length > 0) {
        throw new Error(`Failed to get account balance: ${balanceResponse.error.join(', ')}`);
      }
      
      // Calculate total balance in USD
      let totalBalance = 0;
      const balances = balanceResponse.result || {};
      
      // Get positions (including current prices)
      const positions = await this.getPositions();
      
      // Sum up market values to get equity
      const equity = positions.reduce((sum, position) => sum + position.marketValue, 0);
      
      // Format to standardized account info structure
      return {
        accountId: 'kraken', // Kraken doesn't have account IDs
        balance: totalBalance,
        currency: 'USD',
        equity,
        positions,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting Kraken account info:', error);
      throw new Error('Failed to retrieve account information');
    }
  }
  
  async getPositions(): Promise<Position[]> {
    await this.ensureConnected();
    
    try {
      // Get account balance
      const balanceResponse = await this.makeAuthenticatedRequest('/0/private/Balance', {});
      
      if (balanceResponse.error && balanceResponse.error.length > 0) {
        throw new Error(`Failed to get account balance: ${balanceResponse.error.join(', ')}`);
      }
      
      const balances = balanceResponse.result || {};
      const nonEmptyBalances = Object.entries(balances)
        .filter(([_, balance]) => parseFloat(balance as string) > 0)
        .map(([asset, balance]) => ({
          asset: this.normalizeKrakenAsset(asset),
          balance: parseFloat(balance as string)
        }));
      
      // Get ticker info for all assets
      let allTickers: Record<string, any> = {};
      
      if (nonEmptyBalances.length > 0) {
        // Create pairs like "XXBTZUSD" for each asset
        const pairs = nonEmptyBalances
          .map(item => `${item.asset}USD`)
          .join(',');
        
        const tickerResponse = await this.client.get('/0/public/Ticker', {
          params: { pair: pairs }
        });
        
        if (!tickerResponse.data.error || tickerResponse.data.error.length === 0) {
          allTickers = tickerResponse.data.result || {};
        }
      }
      
      // Format to standardized positions structure
      return nonEmptyBalances.map(item => {
        const symbol = `${item.asset}USD`;
        const ticker = allTickers[symbol];
        const markPrice = ticker ? parseFloat(ticker.c[0]) : 0; // c[0] is last trade closed price
        const marketValue = item.balance * markPrice;
        
        return {
          symbol: item.asset,
          assetType: AssetType.CRYPTO,
          quantity: item.balance,
          entryPrice: 0, // Kraken doesn't provide average entry price
          markPrice,
          unrealizedPnl: 0, // Not available without entry price
          unrealizedPnlPercent: 0,
          marketValue,
          lastUpdated: new Date()
        };
      });
    } catch (error) {
      console.error('Error getting Kraken positions:', error);
      throw new Error('Failed to retrieve positions');
    }
  }
  
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    await this.ensureConnected();
    
    if (!this.validateOrderRequest(order)) {
      throw new Error('Invalid order request');
    }
    
    try {
      // Format order for Kraken API
      const krakenOrder = this.formatOrderForKraken(order);
      
      // Place order
      const response = await this.makeAuthenticatedRequest('/0/private/AddOrder', krakenOrder);
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Failed to place order: ${response.error.join(', ')}`);
      }
      
      const orderData = response.result;
      const orderId = orderData.txid[0]; // Kraken returns an array of transaction IDs
      
      // Format to standardized order response
      return {
        orderId,
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
      console.error('Error placing Kraken order:', error);
      throw new Error('Failed to place order');
    }
  }
  
  async cancelOrder(orderId: string): Promise<boolean> {
    await this.ensureConnected();
    
    try {
      // Cancel order
      const response = await this.makeAuthenticatedRequest('/0/private/CancelOrder', {
        txid: orderId
      });
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Failed to cancel order: ${response.error.join(', ')}`);
      }
      
      return response.result.count > 0;
    } catch (error) {
      console.error('Error canceling Kraken order:', error);
      throw new Error('Failed to cancel order');
    }
  }
  
  async getOrder(orderId: string): Promise<OrderResponse | null> {
    await this.ensureConnected();
    
    try {
      // Get order details
      const response = await this.makeAuthenticatedRequest('/0/private/QueryOrders', {
        txid: orderId,
        trades: true
      });
      
      if (response.error && response.error.length > 0) {
        console.error(`Error querying Kraken order: ${response.error.join(', ')}`);
        return null;
      }
      
      const orderData = response.result[orderId];
      
      if (!orderData) {
        return null;
      }
      
      // Format to standardized order response
      return {
        orderId,
        symbol: this.getSymbolFromKrakenPair(orderData.descr.pair),
        side: orderData.descr.type === 'buy' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapKrakenOrderType(orderData.descr.ordertype),
        quantity: parseFloat(orderData.vol),
        price: parseFloat(orderData.descr.price || 0),
        stopPrice: parseFloat(orderData.descr.price2 || 0),
        status: this.mapKrakenOrderStatus(orderData.status),
        filledQuantity: parseFloat(orderData.vol_exec || 0),
        remainingQuantity: parseFloat(orderData.vol) - parseFloat(orderData.vol_exec || 0),
        createdTime: new Date(orderData.opentm * 1000),
        updatedTime: new Date(orderData.opentm * 1000),
        clientOrderId: orderData.userref?.toString()
      };
    } catch (error) {
      console.error('Error getting Kraken order:', error);
      return null;
    }
  }
  
  async getOpenOrders(): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get open orders
      const response = await this.makeAuthenticatedRequest('/0/private/OpenOrders', {
        trades: true
      });
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Failed to get open orders: ${response.error.join(', ')}`);
      }
      
      const openOrders = response.result.open || {};
      
      // Format to standardized order responses
      return Object.entries(openOrders).map(([orderId, orderData]: [string, any]) => ({
        orderId,
        symbol: this.getSymbolFromKrakenPair(orderData.descr.pair),
        side: orderData.descr.type === 'buy' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapKrakenOrderType(orderData.descr.ordertype),
        quantity: parseFloat(orderData.vol),
        price: parseFloat(orderData.descr.price || 0),
        stopPrice: parseFloat(orderData.descr.price2 || 0),
        status: this.mapKrakenOrderStatus(orderData.status),
        filledQuantity: parseFloat(orderData.vol_exec || 0),
        remainingQuantity: parseFloat(orderData.vol) - parseFloat(orderData.vol_exec || 0),
        createdTime: new Date(orderData.opentm * 1000),
        updatedTime: new Date(orderData.opentm * 1000),
        clientOrderId: orderData.userref?.toString()
      }));
    } catch (error) {
      console.error('Error getting Kraken open orders:', error);
      throw new Error('Failed to retrieve open orders');
    }
  }
  
  async getOrderHistory(symbol?: string, limit?: number): Promise<OrderResponse[]> {
    await this.ensureConnected();
    
    try {
      // Get closed orders
      const params: any = {
        trades: true,
        ofs: 0
      };
      
      if (limit) {
        params.count = limit;
      }
      
      const response = await this.makeAuthenticatedRequest('/0/private/ClosedOrders', params);
      
      if (response.error && response.error.length > 0) {
        throw new Error(`Failed to get order history: ${response.error.join(', ')}`);
      }
      
      const closedOrders = response.result.closed || {};
      
      // Filter by symbol if provided
      let filteredOrders = Object.entries(closedOrders);
      
      if (symbol) {
        const krakenPair = this.getKrakenPair(symbol);
        filteredOrders = filteredOrders.filter(([_, orderData]: [string, any]) => 
          orderData.descr.pair === krakenPair);
      }
      
      // Format to standardized order responses
      return filteredOrders.map(([orderId, orderData]: [string, any]) => ({
        orderId,
        symbol: this.getSymbolFromKrakenPair(orderData.descr.pair),
        side: orderData.descr.type === 'buy' ? OrderSide.BUY : OrderSide.SELL,
        type: this.mapKrakenOrderType(orderData.descr.ordertype),
        quantity: parseFloat(orderData.vol),
        price: parseFloat(orderData.descr.price || 0),
        stopPrice: parseFloat(orderData.descr.price2 || 0),
        status: this.mapKrakenOrderStatus(orderData.status),
        filledQuantity: parseFloat(orderData.vol_exec || 0),
        remainingQuantity: parseFloat(orderData.vol) - parseFloat(orderData.vol_exec || 0),
        createdTime: new Date(orderData.opentm * 1000),
        updatedTime: new Date(orderData.closetm * 1000),
        clientOrderId: orderData.userref?.toString()
      }));
    } catch (error) {
      console.error('Error getting Kraken order history:', error);
      throw new Error('Failed to retrieve order history');
    }
  }
  
  async getQuote(symbol: string): Promise<MarketQuote> {
    await this.ensureConnected();
    
    try {
      // Convert symbol to Kraken pair format
      const krakenPair = this.getKrakenPair(symbol);
      
      // Get ticker info
      const response = await this.client.get('/0/public/Ticker', {
        params: { pair: krakenPair }
      });
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Failed to get quote for ${symbol}: ${response.data.error.join(', ')}`);
      }
      
      const tickerData = response.data.result[krakenPair];
      
      if (!tickerData) {
        throw new Error(`No quote data found for symbol: ${symbol} (${krakenPair})`);
      }
      
      // Format to standardized market quote
      return {
        symbol,
        bid: parseFloat(tickerData.b[0]),
        ask: parseFloat(tickerData.a[0]),
        last: parseFloat(tickerData.c[0]),
        volume: parseFloat(tickerData.v[1]), // 24h volume
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting Kraken quote for ${symbol}:`, error);
      throw new Error(`Failed to retrieve quote for ${symbol}`);
    }
  }
  
  async getHistoricalData(symbol: string, interval: string, from: Date, to: Date): Promise<any[]> {
    await this.ensureConnected();
    
    try {
      // Convert symbol to Kraken pair format
      const krakenPair = this.getKrakenPair(symbol);
      
      // Convert interval to Kraken format
      const krakenInterval = this.mapIntervalToKraken(interval);
      
      // Convert dates to Unix timestamps (seconds)
      const fromTimestamp = Math.floor(from.getTime() / 1000);
      const toTimestamp = Math.floor(to.getTime() / 1000);
      
      // Get OHLC data
      const response = await this.client.get('/0/public/OHLC', {
        params: {
          pair: krakenPair,
          interval: krakenInterval,
          since: fromTimestamp
        }
      });
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Failed to get historical data for ${symbol}: ${response.data.error.join(', ')}`);
      }
      
      const ohlcData = response.data.result[krakenPair] || [];
      
      // Filter data to match the requested time range
      // Format: [time, open, high, low, close, vwap, volume, count]
      const filteredData = ohlcData.filter((candle: any) => 
        candle[0] >= fromTimestamp && candle[0] <= toTimestamp);
      
      // Format to a more standard structure
      return filteredData.map((candle: any) => ({
        time: candle[0] * 1000, // Convert to milliseconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        vwap: parseFloat(candle[5]),
        volume: parseFloat(candle[6]),
        count: parseInt(candle[7])
      }));
    } catch (error) {
      console.error(`Error getting Kraken historical data for ${symbol}:`, error);
      throw new Error(`Failed to retrieve historical data for ${symbol}`);
    }
  }
  
  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      // Convert symbol to Kraken pair format
      const krakenPair = this.getKrakenPair(symbol);
      
      // Get asset pairs info
      const response = await this.client.get('/0/public/AssetPairs', {
        params: { pair: krakenPair }
      });
      
      if (response.data.error && response.data.error.length > 0) {
        return false;
      }
      
      return Object.keys(response.data.result).length > 0;
    } catch (error) {
      console.error(`Error validating Kraken symbol ${symbol}:`, error);
      return false;
    }
  }
  
  // Helper methods
  private async ensureConnected(): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Not connected to Kraken. Call connect() first.');
    }
  }
  
  private formatOrderForKraken(order: OrderRequest): any {
    // Format the order for Kraken API
    const krakenPair = this.getKrakenPair(order.symbol);
    
    const krakenOrder: any = {
      pair: krakenPair,
      type: order.side === OrderSide.BUY ? 'buy' : 'sell',
      ordertype: this.krakenOrderType(order.type),
      volume: order.quantity.toString()
    };
    
    // Add price for limit orders
    if (order.type === OrderType.LIMIT || order.type === OrderType.STOP_LIMIT) {
      krakenOrder.price = order.price!.toString();
    }
    
    // Add stop price for stop orders
    if (order.type === OrderType.STOP || order.type === OrderType.STOP_LIMIT) {
      krakenOrder.price2 = order.stopPrice!.toString();
    }
    
    // Add client order ID if provided
    if (order.clientOrderId) {
      krakenOrder.userref = order.clientOrderId;
    }
    
    // Add time in force
    if (order.timeInForce) {
      krakenOrder.timeinforce = this.mapTimeInForce(order.timeInForce);
    }
    
    return krakenOrder;
  }
  
  private mapKrakenOrderType(orderType: string): OrderType {
    switch (orderType) {
      case 'limit': return OrderType.LIMIT;
      case 'market': return OrderType.MARKET;
      case 'stop-loss': return OrderType.STOP;
      case 'take-profit': return OrderType.STOP;
      case 'stop-loss-limit': return OrderType.STOP_LIMIT;
      case 'take-profit-limit': return OrderType.STOP_LIMIT;
      case 'trailing-stop': return OrderType.TRAILING_STOP;
      default: return OrderType.MARKET;
    }
  }
  
  private krakenOrderType(orderType: OrderType): string {
    switch (orderType) {
      case OrderType.LIMIT: return 'limit';
      case OrderType.MARKET: return 'market';
      case OrderType.STOP: return 'stop-loss';
      case OrderType.STOP_LIMIT: return 'stop-loss-limit';
      case OrderType.TRAILING_STOP: return 'trailing-stop';
      default: return 'market';
    }
  }
  
  private mapKrakenOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'open': return OrderStatus.NEW;
      case 'closed': return OrderStatus.FILLED;
      case 'canceled': return OrderStatus.CANCELED;
      case 'pending': return OrderStatus.NEW;
      case 'expired': return OrderStatus.EXPIRED;
      default: return OrderStatus.NEW;
    }
  }
  
  private mapTimeInForce(timeInForce: string): string {
    switch (timeInForce) {
      case 'GTC': return 'GTC';
      case 'IOC': return 'IOC';
      case 'FOK': return 'FOK';
      default: return 'GTC';
    }
  }
  
  private mapIntervalToKraken(interval: string): number {
    switch (interval) {
      case '1m': return 1;
      case '5m': return 5;
      case '15m': return 15;
      case '30m': return 30;
      case '1h': return 60;
      case '4h': return 240;
      case '1d': return 1440;
      case '1w': return 10080;
      case '2w': return 21600;
      default: return 1;
    }
  }
  
  private async makeAuthenticatedRequest(endpoint: string, params: any): Promise<any> {
    if (!this.credentials) {
      throw new Error('API credentials not set');
    }
    
    const { apiKey, apiSecret } = this.credentials as KrakenCredentials;
    
    // Add nonce to protect against replay attacks
    const nonce = Date.now().toString();
    const requestParams = {
      ...params,
      nonce
    };
    
    // Create signature
    const postData = querystring.stringify(requestParams);
    const path = endpoint;
    const secret = Buffer.from(apiSecret, 'base64');
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secret);
    const hashDigest = hash.update(nonce + postData).digest('binary');
    const signature = hmac.update(path + hashDigest, 'binary').digest('base64');
    
    try {
      const response = await this.client.post(path, postData, {
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Kraken API error:', error);
      throw error;
    }
  }
  
  private getKrakenPair(symbol: string): string {
    // Convert standard symbol to Kraken format
    // For example: 'BTC-USD' -> 'XXBTZUSD'
    // This is a simplification; actual mapping depends on the asset
    
    // Extract base and quote currency
    let [baseCurrency, quoteCurrency] = symbol.split('-');
    
    if (!quoteCurrency) {
      // If the symbol is not in the format 'BTC-USD', assume it's already in Kraken format
      return symbol;
    }
    
    // Map to Kraken asset names (this would need to be expanded for all assets)
    const assetMap: Record<string, string> = {
      'BTC': 'XXBT',
      'ETH': 'XETH',
      'XRP': 'XXRP',
      'LTC': 'XLTC',
      'USD': 'ZUSD',
      'EUR': 'ZEUR',
      'JPY': 'ZJPY',
      'GBP': 'ZGBP'
    };
    
    const baseAsset = assetMap[baseCurrency] || baseCurrency;
    const quoteAsset = assetMap[quoteCurrency] || quoteCurrency;
    
    return baseAsset + quoteAsset;
  }
  
  private getSymbolFromKrakenPair(krakenPair: string): string {
    // Convert Kraken pair format to standard symbol
    // For example: 'XXBTZUSD' -> 'BTC-USD'
    // This is a simplification; actual mapping depends on the asset
    
    // Map from Kraken asset names (this would need to be expanded for all assets)
    const assetMap: Record<string, string> = {
      'XXBT': 'BTC',
      'XETH': 'ETH',
      'XXRP': 'XRP',
      'XLTC': 'LTC',
      'ZUSD': 'USD',
      'ZEUR': 'EUR',
      'ZJPY': 'JPY',
      'ZGBP': 'GBP'
    };
    
    // Try to match known patterns
    for (const [krakenAsset, standardAsset] of Object.entries(assetMap)) {
      if (krakenPair.startsWith(krakenAsset)) {
        const quoteAsset = krakenPair.slice(krakenAsset.length);
        const standardQuoteAsset = assetMap[quoteAsset] || quoteAsset;
        return `${standardAsset}-${standardQuoteAsset}`;
      }
    }
    
    // If no patterns match, return the original pair
    return krakenPair;
  }
  
  private normalizeKrakenAsset(krakenAsset: string): string {
    // Convert Kraken asset name to standard name
    // For example: 'XXBT' -> 'BTC'
    const assetMap: Record<string, string> = {
      'XXBT': 'BTC',
      'XETH': 'ETH',
      'XXRP': 'XRP',
      'XLTC': 'LTC',
      'ZUSD': 'USD',
      'ZEUR': 'EUR',
      'ZJPY': 'JPY',
      'ZGBP': 'GBP'
    };
    
    return assetMap[krakenAsset] || krakenAsset;
  }
}