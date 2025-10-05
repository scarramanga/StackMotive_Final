import { useQuery } from '@tanstack/react-query';

// Types for Performance Analytics
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercentage: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  benchmark?: number;
  category: 'return' | 'risk' | 'efficiency' | 'drawdown';
}

export interface PerformanceData {
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  calmarRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
}

export interface PerformanceChart {
  type: 'line' | 'bar' | 'area';
  data: Array<{
    date: string;
    value: number;
    benchmark?: number;
    drawdown?: number;
  }>;
  title: string;
  yAxisLabel: string;
}

export interface PerformanceResponse {
  metrics: PerformanceData;
  charts: {
    returns: PerformanceChart;
    drawdown: PerformanceChart;
    rollingVolatility: PerformanceChart;
    monthlyReturns: PerformanceChart;
  };
  comparison: {
    benchmark: string;
    benchmarkData: PerformanceData;
    outperformance: number;
  };
  riskMetrics: {
    var95: number;
    var99: number;
    expectedShortfall: number;
    skewness: number;
    kurtosis: number;
    downside_deviation: number;
  };
}

// Performance Analytics Service Class
export class PerformanceAnalyticsService {
  private baseUrl = '/api/analytics';

  // Fetch performance analytics
  async getPerformanceAnalytics(vaultId?: string, period?: string): Promise<PerformanceResponse> {
    const params = new URLSearchParams({
      ...(vaultId && { vaultId }),
      ...(period && { period })
    });
    
    const response = await fetch(`${this.baseUrl}/performance?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch performance analytics');
    }
    
    return response.json();
  }

  // Calculate Sharpe ratio
  calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (meanReturn - riskFreeRate) / stdDev : 0;
  }

  // Calculate Sortino ratio
  calculateSortinoRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return Infinity;
    
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    
    return downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
  }

  // Calculate maximum drawdown
  calculateMaxDrawdown(values: number[]): number {
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
      }
      
      const drawdown = (peak - values[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  // Calculate volatility
  calculateVolatility(returns: number[]): number {
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  // Calculate beta
  calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, marketReturns.length);
    const portfolioMean = portfolioReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    const marketMean = marketReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < n; i++) {
      covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
      marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
    }
    
    covariance /= n;
    marketVariance /= n;
    
    return marketVariance > 0 ? covariance / marketVariance : 0;
  }

  // Calculate alpha
  calculateAlpha(portfolioReturns: number[], marketReturns: number[], riskFreeRate: number = 0.02): number {
    const beta = this.calculateBeta(portfolioReturns, marketReturns);
    const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const marketReturn = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    
    return portfolioReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  // Calculate Value at Risk (VaR)
  calculateVaR(returns: number[], confidence: number = 0.95): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  // Calculate Expected Shortfall (CVaR)
  calculateExpectedShortfall(returns: number[], confidence: number = 0.95): number {
    const var95 = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(r => r <= var95);
    
    if (tailReturns.length === 0) return 0;
    
    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  // Calculate Calmar ratio
  calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }

  // Calculate profit factor
  calculateProfitFactor(returns: number[]): number {
    const profits = returns.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
    const losses = Math.abs(returns.filter(r => r < 0).reduce((sum, r) => sum + r, 0));
    
    return losses > 0 ? profits / losses : Infinity;
  }

  // Calculate win rate
  calculateWinRate(returns: number[]): number {
    const winningTrades = returns.filter(r => r > 0).length;
    return returns.length > 0 ? winningTrades / returns.length : 0;
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Format ratio
  formatRatio(value: number): string {
    return value.toFixed(2);
  }

  // Get performance color
  getPerformanceColor(value: number): string {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Get metric color based on category
  getMetricColor(value: number, category: 'return' | 'risk' | 'efficiency' | 'drawdown'): string {
    switch (category) {
      case 'return':
        return value >= 0 ? 'text-green-600' : 'text-red-600';
      case 'risk':
        return value <= 0.15 ? 'text-green-600' : value <= 0.25 ? 'text-yellow-600' : 'text-red-600';
      case 'efficiency':
        return value >= 1 ? 'text-green-600' : value >= 0.5 ? 'text-yellow-600' : 'text-red-600';
      case 'drawdown':
        return value <= 0.05 ? 'text-green-600' : value <= 0.15 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  // Get metric description
  getMetricDescription(metricName: string): string {
    const descriptions: { [key: string]: string } = {
      'sharpeRatio': 'Risk-adjusted return measure',
      'sortinoRatio': 'Downside risk-adjusted return',
      'maxDrawdown': 'Maximum peak-to-trough decline',
      'calmarRatio': 'Annual return divided by max drawdown',
      'profitFactor': 'Gross profit divided by gross loss',
      'winRate': 'Percentage of profitable trades',
      'volatility': 'Standard deviation of returns',
      'beta': 'Sensitivity to market movements',
      'alpha': 'Excess return over benchmark',
      'informationRatio': 'Active return per unit of tracking error'
    };
    
    return descriptions[metricName] || 'Performance metric';
  }

  // Generate performance grade
  generatePerformanceGrade(metrics: PerformanceData): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    description: string;
  } {
    let score = 0;
    
    // Sharpe ratio (30%)
    if (metrics.sharpeRatio > 2) score += 30;
    else if (metrics.sharpeRatio > 1) score += 20;
    else if (metrics.sharpeRatio > 0.5) score += 10;
    
    // Max drawdown (25%)
    if (metrics.maxDrawdown < 0.05) score += 25;
    else if (metrics.maxDrawdown < 0.15) score += 15;
    else if (metrics.maxDrawdown < 0.25) score += 5;
    
    // Win rate (20%)
    if (metrics.winRate > 0.6) score += 20;
    else if (metrics.winRate > 0.5) score += 15;
    else if (metrics.winRate > 0.4) score += 10;
    
    // Volatility (15%)
    if (metrics.volatility < 0.15) score += 15;
    else if (metrics.volatility < 0.25) score += 10;
    else if (metrics.volatility < 0.35) score += 5;
    
    // Profit factor (10%)
    if (metrics.profitFactor > 2) score += 10;
    else if (metrics.profitFactor > 1.5) score += 7;
    else if (metrics.profitFactor > 1) score += 5;
    
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let description: string;
    
    if (score >= 85) {
      grade = 'A';
      description = 'Excellent performance with strong risk-adjusted returns';
    } else if (score >= 70) {
      grade = 'B';
      description = 'Good performance with reasonable risk management';
    } else if (score >= 55) {
      grade = 'C';
      description = 'Average performance with room for improvement';
    } else if (score >= 40) {
      grade = 'D';
      description = 'Below average performance with high risk concerns';
    } else {
      grade = 'F';
      description = 'Poor performance requiring significant strategy revision';
    }
    
    return { grade, score, description };
  }

  // Calculate rolling metrics
  calculateRollingMetrics(returns: number[], windowSize: number): Array<{
    date: string;
    sharpe: number;
    volatility: number;
    maxDrawdown: number;
  }> {
    const rollingMetrics: Array<{
      date: string;
      sharpe: number;
      volatility: number;
      maxDrawdown: number;
    }> = [];
    
    for (let i = windowSize; i < returns.length; i++) {
      const window = returns.slice(i - windowSize, i);
      const date = new Date(Date.now() - (returns.length - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      rollingMetrics.push({
        date,
        sharpe: this.calculateSharpeRatio(window),
        volatility: this.calculateVolatility(window),
        maxDrawdown: this.calculateMaxDrawdown(window)
      });
    }
    
    return rollingMetrics;
  }

  // Compare with benchmark
  compareWithBenchmark(portfolioMetrics: PerformanceData, benchmarkMetrics: PerformanceData): {
    outperformance: number;
    betterMetrics: string[];
    worseMetrics: string[];
    summary: string;
  } {
    const outperformance = portfolioMetrics.annualizedReturn - benchmarkMetrics.annualizedReturn;
    const betterMetrics: string[] = [];
    const worseMetrics: string[] = [];
    
    if (portfolioMetrics.sharpeRatio > benchmarkMetrics.sharpeRatio) {
      betterMetrics.push('Sharpe Ratio');
    } else {
      worseMetrics.push('Sharpe Ratio');
    }
    
    if (portfolioMetrics.maxDrawdown < benchmarkMetrics.maxDrawdown) {
      betterMetrics.push('Max Drawdown');
    } else {
      worseMetrics.push('Max Drawdown');
    }
    
    if (portfolioMetrics.volatility < benchmarkMetrics.volatility) {
      betterMetrics.push('Volatility');
    } else {
      worseMetrics.push('Volatility');
    }
    
    const summary = outperformance > 0 
      ? `Portfolio outperformed benchmark by ${this.formatPercentage(outperformance)}`
      : `Portfolio underperformed benchmark by ${this.formatPercentage(Math.abs(outperformance))}`;
    
    return {
      outperformance,
      betterMetrics,
      worseMetrics,
      summary
    };
  }
}

// Service instance
export const performanceAnalyticsService = new PerformanceAnalyticsService();

// React Query hooks
export const usePerformanceAnalytics = (vaultId?: string, user?: any, period?: string) => {
  return useQuery({
    queryKey: ['/api/analytics/performance', vaultId, period],
    queryFn: () => performanceAnalyticsService.getPerformanceAnalytics(vaultId, period),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000,
  });
}; 