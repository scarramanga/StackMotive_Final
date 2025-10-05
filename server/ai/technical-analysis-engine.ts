import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for technical indicators
export interface TechnicalIndicators {
  symbol: string;
  timeframe: string;
  lastUpdated: Date;
  price: {
    current: number;
    change: number;
    changePercent: number;
  };
  indicators: {
    macd: {
      value: number;
      signal: number;
      histogram: number;
      trend: 'bullish' | 'bearish' | 'neutral';
      strength: 'strong' | 'moderate' | 'weak';
    };
    rsi: {
      value: number;
      trend: 'overbought' | 'oversold' | 'neutral';
      strength: 'strong' | 'moderate' | 'weak';
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      width: number;
      percentB: number;
      trend: 'upper-touch' | 'lower-touch' | 'middle' | 'neutral';
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
      ema20: number;
      trend: 'bullish' | 'bearish' | 'neutral';
      crossover: string | null;
    };
    volume: {
      current: number;
      average: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      volumePrice: 'accumulation' | 'distribution' | 'neutral';
    };
  };
  signals: {
    overall: 'buy' | 'sell' | 'hold' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    details: string;
  };
}

// Cache for technical indicators to reduce API calls
const technicalIndicatorsCache = new Map<string, { data: TechnicalIndicators, timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL

/**
 * Calculate MACD indicator
 */
function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): { 
  value: number, 
  signal: number, 
  histogram: number,
  trend: 'bullish' | 'bearish' | 'neutral',
  strength: 'strong' | 'moderate' | 'weak'
} {
  if (prices.length < slowPeriod + signalPeriod) {
    return { 
      value: 0, 
      signal: 0, 
      histogram: 0, 
      trend: 'neutral',
      strength: 'weak'
    };
  }

  // Calculate EMAs
  const calculateEMA = (period: number): number[] => {
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  };
  
  const fastEMA = calculateEMA(fastPeriod);
  const slowEMA = calculateEMA(slowPeriod);
  
  // Calculate MACD line
  const macdLine = fastEMA.map((fast, i) => 
    i < slowPeriod - 1 ? 0 : fast - slowEMA[i]
  ).slice(slowPeriod - 1);
  
  // Calculate signal line (EMA of MACD line)
  const signalLine = [macdLine[0]];
  const k = 2 / (signalPeriod + 1);
  
  for (let i = 1; i < macdLine.length; i++) {
    signalLine.push(macdLine[i] * k + signalLine[i - 1] * (1 - k));
  }
  
  // Calculate histogram
  const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
  
  // Determine trend and strength
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let strength: 'strong' | 'moderate' | 'weak' = 'weak';
  
  if (histogram > 0 && macdLine[macdLine.length - 1] > 0) {
    trend = 'bullish';
    strength = histogram > 0.2 ? 'strong' : 'moderate';
  } else if (histogram < 0 && macdLine[macdLine.length - 1] < 0) {
    trend = 'bearish';
    strength = histogram < -0.2 ? 'strong' : 'moderate';
  } else if (histogram > 0 && macdLine[macdLine.length - 1] < 0) {
    trend = 'bullish';
    strength = 'weak';
  } else if (histogram < 0 && macdLine[macdLine.length - 1] > 0) {
    trend = 'bearish';
    strength = 'weak';
  }
  
  return {
    value: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram,
    trend,
    strength
  };
}

/**
 * Calculate RSI indicator
 */
function calculateRSI(prices: number[], period = 14): { 
  value: number, 
  trend: 'overbought' | 'oversold' | 'neutral',
  strength: 'strong' | 'moderate' | 'weak'
} {
  if (prices.length <= period) {
    return { value: 50, trend: 'neutral', strength: 'weak' };
  }
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let gain = 0;
  let loss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      gain += changes[i];
    } else {
      loss -= changes[i];
    }
  }
  
  gain /= period;
  loss /= period;
  
  for (let i = period; i < changes.length; i++) {
    if (changes[i] >= 0) {
      gain = (gain * (period - 1) + changes[i]) / period;
      loss = (loss * (period - 1)) / period;
    } else {
      gain = (gain * (period - 1)) / period;
      loss = (loss * (period - 1) - changes[i]) / period;
    }
  }
  
  const rs = gain / (loss === 0 ? 0.001 : loss);
  const rsi = 100 - (100 / (1 + rs));
  
  // Determine trend and strength
  let trend: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  let strength: 'strong' | 'moderate' | 'weak' = 'moderate';
  
  if (rsi > 70) {
    trend = 'overbought';
    strength = rsi > 80 ? 'strong' : 'moderate';
  } else if (rsi < 30) {
    trend = 'oversold';
    strength = rsi < 20 ? 'strong' : 'moderate';
  } else if (rsi > 60) {
    trend = 'overbought';
    strength = 'weak';
  } else if (rsi < 40) {
    trend = 'oversold';
    strength = 'weak';
  }
  
  return { value: rsi, trend, strength };
}

/**
 * Calculate Bollinger Bands indicator
 */
function calculateBollingerBands(prices: number[], period = 20, multiplier = 2): {
  upper: number,
  middle: number,
  lower: number,
  width: number,
  percentB: number,
  trend: 'upper-touch' | 'lower-touch' | 'middle' | 'neutral'
} {
  if (prices.length < period) {
    return { upper: 0, middle: 0, lower: 0, width: 0, percentB: 0.5, trend: 'neutral' };
  }
  
  // Calculate SMA
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  const sma = sum / period;
  
  // Calculate standard deviation
  const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  // Calculate bands
  const upper = sma + (multiplier * stdDev);
  const lower = sma - (multiplier * stdDev);
  
  // Calculate bandwidth and %B
  const bandwidth = (upper - lower) / sma;
  const currentPrice = prices[prices.length - 1];
  const percentB = (currentPrice - lower) / (upper - lower || 1);
  
  // Determine trend
  let trend: 'upper-touch' | 'lower-touch' | 'middle' | 'neutral' = 'neutral';
  
  if (currentPrice >= upper * 0.98) {
    trend = 'upper-touch';
  } else if (currentPrice <= lower * 1.02) {
    trend = 'lower-touch';
  } else if (Math.abs(currentPrice - sma) / sma < 0.01) {
    trend = 'middle';
  }
  
  return {
    upper,
    middle: sma,
    lower,
    width: bandwidth,
    percentB,
    trend
  };
}

/**
 * Calculate Moving Averages
 */
function calculateMovingAverages(prices: number[]): {
  sma20: number,
  sma50: number,
  sma200: number,
  ema20: number,
  trend: 'bullish' | 'bearish' | 'neutral',
  crossover: string | null
} {
  // Need at least 200 data points for SMA200
  if (prices.length < 200) {
    return {
      sma20: 0,
      sma50: 0,
      sma200: 0,
      ema20: 0,
      trend: 'neutral',
      crossover: null
    };
  }
  
  // Calculate SMAs
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const sma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
  
  // Calculate EMA20
  const k = 2 / (20 + 1);
  let ema20 = prices[prices.length - 20];
  
  for (let i = prices.length - 19; i < prices.length; i++) {
    ema20 = prices[i] * k + ema20 * (1 - k);
  }
  
  // Determine trend and crossover
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let crossover: string | null = null;
  
  if (sma20 > sma50 && sma50 > sma200) {
    trend = 'bullish';
  } else if (sma20 < sma50 && sma50 < sma200) {
    trend = 'bearish';
  }
  
  // Check for golden cross
  const prevSma50 = prices.slice(-51, -1).reduce((a, b) => a + b, 0) / 50;
  const prevSma200 = prices.slice(-201, -1).reduce((a, b) => a + b, 0) / 200;
  
  if (sma50 > sma200 && prevSma50 <= prevSma200) {
    crossover = 'Golden Cross';
    trend = 'bullish';
  } else if (sma50 < sma200 && prevSma50 >= prevSma200) {
    crossover = 'Death Cross';
    trend = 'bearish';
  }
  
  return { sma20, sma50, sma200, ema20, trend, crossover };
}

/**
 * Calculate Volume indicators
 */
function calculateVolumeIndicators(prices: number[], volumes: number[]): {
  current: number,
  average: number,
  trend: 'increasing' | 'decreasing' | 'stable',
  volumePrice: 'accumulation' | 'distribution' | 'neutral'
} {
  if (volumes.length < 20) {
    return {
      current: 0,
      average: 0,
      trend: 'stable',
      volumePrice: 'neutral'
    };
  }
  
  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  
  // Determine volume trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  
  if (currentVolume > avgVolume * 1.2) {
    trend = 'increasing';
  } else if (currentVolume < avgVolume * 0.8) {
    trend = 'decreasing';
  }
  
  // Determine price-volume relationship
  let volumePrice: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
  
  const priceChange = prices[prices.length - 1] - prices[prices.length - 2];
  
  if (priceChange > 0 && currentVolume > avgVolume) {
    volumePrice = 'accumulation';
  } else if (priceChange < 0 && currentVolume > avgVolume) {
    volumePrice = 'distribution';
  }
  
  return {
    current: currentVolume,
    average: avgVolume,
    trend,
    volumePrice
  };
}

/**
 * Generate trading signals based on technical indicators
 */
function generateSignals(indicators: {
  macd: {
    value: number;
    signal: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
  };
  rsi: ReturnType<typeof calculateRSI>;
  bollinger: ReturnType<typeof calculateBollingerBands>;
  movingAverages: ReturnType<typeof calculateMovingAverages>;
  volume: ReturnType<typeof calculateVolumeIndicators>;
}): {
  overall: 'buy' | 'sell' | 'hold' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  details: string;
} {
  let buySignals = 0;
  let sellSignals = 0;
  let neutralSignals = 0;
  let signalStrength = 0;
  const details: string[] = [];
  
  // MACD signal
  if (indicators.macd.trend === 'bullish') {
    buySignals++;
    signalStrength += indicators.macd.strength === 'strong' ? 2 : 1;
    details.push(`MACD shows ${indicators.macd.strength} bullish momentum`);
  } else if (indicators.macd.trend === 'bearish') {
    sellSignals++;
    signalStrength += indicators.macd.strength === 'strong' ? 2 : 1;
    details.push(`MACD shows ${indicators.macd.strength} bearish momentum`);
  } else {
    neutralSignals++;
    details.push('MACD is neutral');
  }
  
  // RSI signal
  if (indicators.rsi.trend === 'oversold') {
    buySignals++;
    signalStrength += indicators.rsi.strength === 'strong' ? 2 : 1;
    details.push(`RSI indicates ${indicators.rsi.strength} oversold conditions (${Math.round(indicators.rsi.value)})`);
  } else if (indicators.rsi.trend === 'overbought') {
    sellSignals++;
    signalStrength += indicators.rsi.strength === 'strong' ? 2 : 1;
    details.push(`RSI indicates ${indicators.rsi.strength} overbought conditions (${Math.round(indicators.rsi.value)})`);
  } else {
    neutralSignals++;
    details.push(`RSI is neutral (${Math.round(indicators.rsi.value)})`);
  }
  
  // Bollinger Bands signal
  if (indicators.bollinger.trend === 'lower-touch') {
    buySignals++;
    signalStrength += 1;
    details.push('Price is at lower Bollinger Band (potential reversal)');
  } else if (indicators.bollinger.trend === 'upper-touch') {
    sellSignals++;
    signalStrength += 1;
    details.push('Price is at upper Bollinger Band (potential resistance)');
  } else {
    neutralSignals++;
    details.push('Price is within Bollinger Bands');
  }
  
  // Moving Averages signal
  if (indicators.movingAverages.trend === 'bullish') {
    buySignals++;
    signalStrength += indicators.movingAverages.crossover === 'Golden Cross' ? 2 : 1;
    let maDetails = 'Moving averages are aligned bullishly';
    if (indicators.movingAverages.crossover === 'Golden Cross') {
      maDetails += ' with recent Golden Cross';
    }
    details.push(maDetails);
  } else if (indicators.movingAverages.trend === 'bearish') {
    sellSignals++;
    signalStrength += indicators.movingAverages.crossover === 'Death Cross' ? 2 : 1;
    let maDetails = 'Moving averages are aligned bearishly';
    if (indicators.movingAverages.crossover === 'Death Cross') {
      maDetails += ' with recent Death Cross';
    }
    details.push(maDetails);
  } else {
    neutralSignals++;
    details.push('Moving averages are mixed');
  }
  
  // Volume signal
  if (indicators.volume.volumePrice === 'accumulation') {
    buySignals++;
    signalStrength += indicators.volume.trend === 'increasing' ? 2 : 1;
    details.push('Volume suggests accumulation (buying pressure)');
  } else if (indicators.volume.volumePrice === 'distribution') {
    sellSignals++;
    signalStrength += indicators.volume.trend === 'increasing' ? 2 : 1;
    details.push('Volume suggests distribution (selling pressure)');
  } else {
    neutralSignals++;
    details.push('Volume analysis is neutral');
  }
  
  // Determine overall signal
  let overall: 'buy' | 'sell' | 'hold' | 'neutral' = 'neutral';
  if (buySignals > sellSignals && buySignals > neutralSignals) {
    overall = 'buy';
  } else if (sellSignals > buySignals && sellSignals > neutralSignals) {
    overall = 'sell';
  } else if (neutralSignals > buySignals && neutralSignals > sellSignals) {
    overall = 'neutral';
  } else if (buySignals === sellSignals && buySignals > neutralSignals) {
    overall = 'hold';
  }
  
  // Determine signal strength
  let strength: 'strong' | 'moderate' | 'weak' = 'moderate';
  const maxPossibleStrength = 10; // 5 indicators * max 2 points
  const strengthPercentage = signalStrength / maxPossibleStrength;
  
  if (strengthPercentage > 0.6) {
    strength = 'strong';
  } else if (strengthPercentage < 0.3) {
    strength = 'weak';
  }
  
  return {
    overall,
    strength,
    details: details.join('. ')
  };
}

/**
 * Generate simulated price history when real data is not available
 */
function generateSimulatedPriceHistory(currentPrice: number, volatility = 0.02, days = 200): {
  prices: number[];
  volumes: number[];
} {
  const prices = [currentPrice];
  const volumes = [Math.round(Math.random() * 1000000 + 500000)];
  
  // Generate historical prices with a slight upward bias
  for (let i = 1; i < days; i++) {
    const change = (Math.random() - 0.48) * volatility * prices[i - 1];
    const newPrice = Math.max(0.01, prices[i - 1] + change);
    prices.unshift(newPrice);
    
    // Generate random volume with occasional spikes
    const volumeChange = (Math.random() - 0.5) * 0.3;
    const hasSpike = Math.random() > 0.95;
    const volumeMultiplier = hasSpike ? (Math.random() * 2 + 1.5) : 1;
    const newVolume = Math.max(100000, volumes[0] * (1 + volumeChange) * volumeMultiplier);
    volumes.unshift(Math.round(newVolume));
  }
  
  return { prices, volumes };
}

/**
 * Read the combined portfolio data
 */
async function getPortfolioData(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: {
      userId: userId
    },
    include: {
      asset: true
    }
  });
  
  return holdings;
}

/**
 * Read the watchlist data
 */
async function getWatchlist() {
  try {
    // This would typically come from a database, but for simplicity we'll use mock data
    return [
      { id: 1, userId: 1, symbol: "AAPL", exchange: "NASDAQ" },
      { id: 2, userId: 1, symbol: "MSFT", exchange: "NASDAQ" },
      { id: 3, userId: 1, symbol: "GOOGL", exchange: "NASDAQ" },
      { id: 4, userId: 1, symbol: "AMZN", exchange: "NASDAQ" }
    ];
  } catch (error) {
    console.error('Error reading watchlist:', error);
    return [];
  }
}

/**
 * Get technical indicators for a symbol
 */
export async function getTechnicalIndicators(symbol: string, timeframe: string = '1d'): Promise<TechnicalIndicators> {
  try {
    const cacheKey = `${symbol}-${timeframe}`;
    const cachedData = technicalIndicatorsCache.get(cacheKey);
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      return cachedData.data;
    }
    
    // For now, let's use our simulated data generation
    // In a real implementation, we would fetch this from an API
    const portfolio = await getPortfolioData(userId);
    
    // Find the asset in the portfolio
    const equityAsset = portfolio.find((asset: any) => asset.Symbol === symbol);
    const cryptoAsset = portfolio.find((asset: any) => asset.Symbol === symbol);
    const asset = equityAsset || cryptoAsset;
    
    // If asset is not in portfolio, it might be a watchlist item
    // Generate simulated data for it
    let currentPrice: number;
    let previousPrice: number;
    
    if (!asset) {
      // Check if it's a known watchlist item
      const watchlist = await getWatchlist();
      const isWatchlistItem = watchlist.some((item: any) => item.symbol === symbol);
      
      if (!isWatchlistItem) {
        throw new Error(`Asset ${symbol} not found in portfolio or watchlist`);
      }
      
      // Generate a default price for watchlist items
      currentPrice = 100 + (Math.random() * 50);
      previousPrice = currentPrice * (1 - ((Math.random() - 0.5) * 0.03));
    } else {
      currentPrice = asset.price;
      // Simulate a 3% change from previous day
      previousPrice = currentPrice * (1 - ((Math.random() - 0.5) * 0.03));
    }
    
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;
    
    // Generate simulated price history
    const { prices, volumes } = generateSimulatedPriceHistory(currentPrice);
    
    // Calculate technical indicators
    const macd = calculateMACD(prices);
    const rsi = calculateRSI(prices);
    const bollinger = calculateBollingerBands(prices);
    const movingAverages = calculateMovingAverages(prices);
    const volume = calculateVolumeIndicators(prices, volumes);
    
    // Generate trading signals
    const signals = generateSignals({ macd, rsi, bollinger, movingAverages, volume });
    
    // Create technical indicators object
    const technicalIndicators: TechnicalIndicators = {
      symbol,
      timeframe,
      lastUpdated: new Date(),
      price: {
        current: currentPrice,
        change: priceChange,
        changePercent: priceChangePercent,
      },
      indicators: {
        macd,
        rsi,
        bollinger,
        movingAverages,
        volume,
      },
      signals,
    };
    
    // Cache the results
    technicalIndicatorsCache.set(cacheKey, { data: technicalIndicators, timestamp: now });
    
    return technicalIndicators;
  } catch (error) {
    console.error(`Error getting technical indicators for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get technical indicators for all portfolio and watchlist assets
 */
export async function getAllTechnicalIndicators(timeframe: string = '1d'): Promise<TechnicalIndicators[]> {
  try {
    const portfolio = await getPortfolioData(userId);
    const watchlist = await getWatchlist();
    
    // Combine symbols from portfolio and watchlist
    const portfolioSymbols = [
      ...portfolio.map((asset: any) => asset.Symbol),
    ];
    const watchlistSymbols = watchlist.map((item: any) => item.symbol);
    const allSymbols = Array.from(new Set([...portfolioSymbols, ...watchlistSymbols]));
    
    // Get technical indicators for all symbols
    const technicalIndicatorsPromises = allSymbols.map(async (symbol) => {
      try {
        return await getTechnicalIndicators(symbol, timeframe);
      } catch (error) {
        // Handle case where asset isn't in portfolio but is in watchlist
        // Create a simulated technical indicator with basic data
        if (portfolioSymbols.includes(symbol)) {
          // If it's a portfolio asset that failed for some reason, rethrow
          throw error;
        }
        
        console.log(`Generating simulated technical indicators for watchlist item: ${symbol}`);
        
        // Generate a default price for watchlist items
        const currentPrice = 100 + (Math.random() * 50);
        const previousPrice = currentPrice * (1 - ((Math.random() - 0.5) * 0.03));
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = (priceChange / previousPrice) * 100;
        
        // Generate simulated price history
        const { prices, volumes } = generateSimulatedPriceHistory(currentPrice);
        
        // Calculate technical indicators
        const macd = calculateMACD(prices);
        const rsi = calculateRSI(prices);
        const bollinger = calculateBollingerBands(prices);
        const movingAverages = calculateMovingAverages(prices);
        const volume = calculateVolumeIndicators(prices, volumes);
        
        // Generate trading signals
        const signals = generateSignals({ macd, rsi, bollinger, movingAverages, volume });
        
        // Return simulated technical indicators
        return {
          symbol,
          timeframe,
          lastUpdated: new Date(),
          price: {
            current: currentPrice,
            change: priceChange,
            changePercent: priceChangePercent,
          },
          indicators: {
            macd,
            rsi,
            bollinger,
            movingAverages,
            volume,
          },
          signals,
        };
      }
    });
    
    const technicalIndicators = await Promise.all(technicalIndicatorsPromises);
    return technicalIndicators;
  } catch (error) {
    console.error(`Error getting all technical indicators:`, error);
    throw error;
  }
}

/**
 * Get trading signals for all portfolio and watchlist assets
 */
export async function getTradingSignals(timeframe: string = '1d'): Promise<any[]> {
  try {
    const technicalIndicators = await getAllTechnicalIndicators(timeframe);
    
    // Extract trading signals
    const tradingSignals = technicalIndicators.map(indicator => {
      // Determine which indicators contributed to the signal
      const contributingIndicators = [];
      
      if (indicator.indicators.macd.trend !== 'neutral') {
        contributingIndicators.push('MACD');
      }
      if (indicator.indicators.rsi.trend !== 'neutral') {
        contributingIndicators.push('RSI');
      }
      if (indicator.indicators.bollinger.trend !== 'neutral') {
        contributingIndicators.push('Bollinger');
      }
      if (indicator.indicators.movingAverages.trend !== 'neutral') {
        contributingIndicators.push('Moving Avg');
      }
      if (indicator.indicators.volume.volumePrice !== 'neutral') {
        contributingIndicators.push('Volume');
      }
      
      return {
        id: `${indicator.symbol}-${Date.now()}`,
        symbol: indicator.symbol,
        name: indicator.symbol, // In a real implementation, we would fetch the company name
        indicators: contributingIndicators,
        signal: indicator.signals.overall,
        strength: indicator.signals.strength,
        price: indicator.price.current,
        priceChange: indicator.price.changePercent.toFixed(2) + '%',
        timestamp: new Date().toISOString(),
        details: indicator.signals.details
      };
    });
    
    // Sort by signal strength (strong signals first)
    return tradingSignals.sort((a, b) => {
      const strengthOrder = { 'strong': 0, 'moderate': 1, 'weak': 2 };
      return strengthOrder[a.strength] - strengthOrder[b.strength];
    });
  } catch (error) {
    console.error(`Error getting trading signals:`, error);
    throw error;
  }
}