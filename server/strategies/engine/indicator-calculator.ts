import { TechnicalIndicator } from '@shared/schema';

/**
 * Technical Indicator Calculator
 * This service handles the calculation of various technical indicators
 * used for strategy signals and backtesting
 */

// Interface for price/volume data used in indicator calculations
export interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  interval: string; // 1m, 5m, 15m, 1h, 4h, 1d
}

// Partial indicator results for calculations
export interface IndicatorResult {
  symbol: string;
  timestamp: Date;
  interval: string;
  [key: string]: any; // Flexible structure for different indicators
}

export class IndicatorCalculator {
  /**
   * Calculate Relative Strength Index (RSI)
   * @param data Array of candle data sorted by timestamp ascending
   * @param period The period for calculation (default: 14)
   * @returns RSI values
   */
  calculateRSI(data: CandleData[], period: number = 14): IndicatorResult[] {
    if (data.length < period + 1) {
      throw new Error(`Need at least ${period + 1} data points to calculate RSI`);
    }

    const results: IndicatorResult[] = [];
    let gains = 0;
    let losses = 0;

    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for each data point after the initial period
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      
      // Update average gain and loss using smoothing method
      avgGain = ((avgGain * (period - 1)) + (change > 0 ? change : 0)) / period;
      avgLoss = ((avgLoss * (period - 1)) + (change < 0 ? Math.abs(change) : 0)) / period;
      
      // Calculate RS and RSI
      const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
      const rsi = 100 - (100 / (1 + rs));

      results.push({
        symbol: data[i].symbol,
        timestamp: data[i].timestamp,
        interval: data[i].interval,
        rsi: rsi
      });
    }

    return results;
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * @param data Array of candle data sorted by timestamp ascending
   * @param fastPeriod The fast EMA period (default: 12)
   * @param slowPeriod The slow EMA period (default: 26)
   * @param signalPeriod The signal line period (default: 9)
   * @returns MACD, Signal, and Histogram values
   */
  calculateMACD(
    data: CandleData[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): IndicatorResult[] {
    if (data.length < slowPeriod + signalPeriod) {
      throw new Error(`Need at least ${slowPeriod + signalPeriod} data points to calculate MACD`);
    }

    const results: IndicatorResult[] = [];
    const closes = data.map(d => d.close);
    
    // Calculate EMAs
    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - 1;
    
    for (let i = startIndex; i < closes.length; i++) {
      const fastEMAvalue = fastEMA[i - (slowPeriod - fastPeriod)];
      const slowEMAvalue = slowEMA[i - startIndex];
      macdLine.push(fastEMAvalue - slowEMAvalue);
    }
    
    // Calculate Signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // Calculate Histogram
    for (let i = signalPeriod - 1; i < macdLine.length; i++) {
      const macdValue = macdLine[i];
      const signalValue = signalLine[i - (signalPeriod - 1)];
      const histogramValue = macdValue - signalValue;
      
      const dataIndex = i + startIndex;
      results.push({
        symbol: data[dataIndex].symbol,
        timestamp: data[dataIndex].timestamp,
        interval: data[dataIndex].interval,
        macd: macdValue,
        macdSignal: signalValue,
        macdHistogram: histogramValue
      });
    }
    
    return results;
  }

  /**
   * Calculate Moving Averages (MA)
   * @param data Array of candle data sorted by timestamp ascending
   * @param periods Array of periods to calculate (e.g., [20, 50, 200])
   * @returns Moving average values for each period
   */
  calculateMA(data: CandleData[], periods: number[] = [20, 50]): IndicatorResult[] {
    const results: IndicatorResult[] = [];
    const maxPeriod = Math.max(...periods);
    
    if (data.length < maxPeriod) {
      throw new Error(`Need at least ${maxPeriod} data points to calculate MA`);
    }
    
    for (let i = maxPeriod - 1; i < data.length; i++) {
      const result: IndicatorResult = {
        symbol: data[i].symbol,
        timestamp: data[i].timestamp,
        interval: data[i].interval
      };
      
      // Calculate MA for each period
      for (const period of periods) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        result[`ma${period}`] = sum / period;
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Calculate Bollinger Bands
   * @param data Array of candle data sorted by timestamp ascending
   * @param period The period for calculation (default: 20)
   * @param multiplier Standard deviation multiplier (default: 2)
   * @returns Middle, Upper, and Lower band values
   */
  calculateBollingerBands(
    data: CandleData[], 
    period: number = 20, 
    multiplier: number = 2
  ): IndicatorResult[] {
    if (data.length < period) {
      throw new Error(`Need at least ${period} data points to calculate Bollinger Bands`);
    }
    
    const results: IndicatorResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      // Calculate simple moving average (middle band)
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      const middleBand = sum / period;
      
      // Calculate standard deviation
      let sumSquaredDiff = 0;
      for (let j = 0; j < period; j++) {
        const diff = data[i - j].close - middleBand;
        sumSquaredDiff += diff * diff;
      }
      const standardDeviation = Math.sqrt(sumSquaredDiff / period);
      
      // Calculate upper and lower bands
      const upperBand = middleBand + (multiplier * standardDeviation);
      const lowerBand = middleBand - (multiplier * standardDeviation);
      
      results.push({
        symbol: data[i].symbol,
        timestamp: data[i].timestamp,
        interval: data[i].interval,
        bbMiddle: middleBand,
        bbUpper: upperBand,
        bbLower: lowerBand
      });
    }
    
    return results;
  }

  /**
   * Calculate Volume Metrics
   * @param data Array of candle data sorted by timestamp ascending
   * @param period The period for volume average (default: 20)
   * @returns Volume and Average Volume
   */
  calculateVolumeMetrics(data: CandleData[], period: number = 20): IndicatorResult[] {
    if (data.length < period) {
      throw new Error(`Need at least ${period} data points to calculate Volume Metrics`);
    }
    
    const results: IndicatorResult[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      // Calculate average volume
      let sumVolume = 0;
      for (let j = 0; j < period; j++) {
        sumVolume += data[i - j].volume;
      }
      const avgVolume = sumVolume / period;
      
      results.push({
        symbol: data[i].symbol,
        timestamp: data[i].timestamp,
        interval: data[i].interval,
        volume: data[i].volume,
        volumeAvg20: avgVolume
      });
    }
    
    return results;
  }

  /**
   * Calculate NVT Ratio (Network Value to Transactions Ratio) - Crypto specific
   * @param data Array of candle data with additional transaction value
   * @param transactionValues Array of daily transaction values in USD
   * @param period The period for calculation (default: 28 days)
   * @returns NVT Ratio values
   */
  calculateNVT(
    data: CandleData[], 
    transactionValues: {timestamp: Date, value: number}[], 
    period: number = 28
  ): IndicatorResult[] {
    if (data.length < period || transactionValues.length < period) {
      throw new Error(`Need at least ${period} data points to calculate NVT Ratio`);
    }
    
    const results: IndicatorResult[] = [];
    
    // Map transaction values to match data timestamps
    const transactionMap = new Map<string, number>();
    for (const tv of transactionValues) {
      transactionMap.set(tv.timestamp.toISOString().split('T')[0], tv.value);
    }
    
    for (let i = period - 1; i < data.length; i++) {
      // Calculate moving average of transaction value
      let sumTransactionValue = 0;
      let validDays = 0;
      
      for (let j = 0; j < period; j++) {
        const date = data[i - j].timestamp.toISOString().split('T')[0];
        if (transactionMap.has(date)) {
          sumTransactionValue += transactionMap.get(date) || 0;
          validDays++;
        }
      }
      
      if (validDays < period / 2) {
        // Skip if we don't have enough transaction data
        continue;
      }
      
      const avgTransactionValue = sumTransactionValue / validDays;
      
      // Market cap = price * circulating supply (simplified as just price here)
      const marketCap = data[i].close; // This is simplified, would need actual supply data
      const nvtRatio = avgTransactionValue > 0 ? marketCap / avgTransactionValue : 0;
      
      results.push({
        symbol: data[i].symbol,
        timestamp: data[i].timestamp,
        interval: data[i].interval,
        nvtRatio: nvtRatio
      });
    }
    
    return results;
  }

  /**
   * Helper method to calculate Exponential Moving Average (EMA)
   * @param data Array of values
   * @param period The period for calculation
   * @returns EMA values
   */
  private calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaData: number[] = [];
    
    // Initialize EMA with SMA for first data point
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    emaData.push(sum / period);
    
    // Calculate EMA for remaining data points
    for (let i = period; i < data.length; i++) {
      const ema = (data[i] * k) + (emaData[emaData.length - 1] * (1 - k));
      emaData.push(ema);
    }
    
    return emaData;
  }

  /**
   * Combines all technical indicators into a single result
   * @param data Array of candle data sorted by timestamp ascending
   * @returns Combined technical indicators
   */
  calculateAllIndicators(data: CandleData[]): Partial<TechnicalIndicator>[] {
    if (data.length < 50) { // At least 50 data points for reliable indicators
      throw new Error('Need at least 50 data points to calculate indicators');
    }

    try {
      // Calculate individual indicators
      const rsiResults = this.calculateRSI(data);
      const macdResults = this.calculateMACD(data);
      const maResults = this.calculateMA(data, [20, 50]);
      const bbResults = this.calculateBollingerBands(data);
      const volumeResults = this.calculateVolumeMetrics(data);
      
      // Create a map to merge results by timestamp
      const resultMap = new Map<string, Partial<TechnicalIndicator>>();
      
      // Process all result sets and merge
      const allResults = [rsiResults, macdResults, maResults, bbResults, volumeResults];
      
      for (const resultSet of allResults) {
        for (const result of resultSet) {
          const key = `${result.symbol}_${result.timestamp.toISOString()}_${result.interval}`;
          
          if (!resultMap.has(key)) {
            resultMap.set(key, {
              symbol: result.symbol,
              timestamp: result.timestamp,
              interval: result.interval,
              open: this.findPriceData(data, result.timestamp)?.open,
              high: this.findPriceData(data, result.timestamp)?.high,
              low: this.findPriceData(data, result.timestamp)?.low,
              close: this.findPriceData(data, result.timestamp)?.close,
            });
          }
          
          // Merge this result with existing data
          const existingData = resultMap.get(key)!;
          resultMap.set(key, { ...existingData, ...result });
        }
      }
      
      // Convert map to array
      return Array.from(resultMap.values());
    } catch (error) {
      console.error('Error calculating indicators:', error);
      return [];
    }
  }

  /**
   * Find price data for a specific timestamp
   */
  private findPriceData(data: CandleData[], timestamp: Date): CandleData | undefined {
    return data.find(d => d.timestamp.getTime() === timestamp.getTime());
  }
}

// Export singleton instance
export const indicatorCalculator = new IndicatorCalculator();