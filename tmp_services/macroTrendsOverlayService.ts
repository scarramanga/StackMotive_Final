import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Macro Trends Overlay
export interface MacroIndicator {
  id: string;
  name: string;
  code: string;
  description: string;
  category: 'monetary' | 'fiscal' | 'economic' | 'labor' | 'inflation' | 'trade' | 'sentiment' | 'other';
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  source: string;
  country: string;
  isAvailable: boolean;
  lastUpdated: string;
  metadata: {
    aggregationType: 'sum' | 'average' | 'latest' | 'change';
    seasonallyAdjusted: boolean;
    dataStartDate: string;
    dataEndDate: string;
    releaseDelay: number; // days
    revisionPolicy: string;
  };
}

export interface IndicatorDataPoint {
  timestamp: string;
  value: number;
  originalValue: number;
  normalizedValue: number;
  isRevised?: boolean;
  isEstimate?: boolean;
  metadata: {
    source: string;
    quality: 'high' | 'medium' | 'low';
    confidence: number;
    notes?: string;
  };
}

export interface MacroEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: 'policy' | 'economic' | 'political' | 'market' | 'natural' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: 'positive' | 'negative' | 'neutral';
  affectedIndicators: string[];
  tags: string[];
  source: string;
  isSignificant: boolean;
}

export interface NormalizedTimeSeries {
  indicatorId: string;
  indicatorName: string;
  data: IndicatorDataPoint[];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    trend: 'rising' | 'falling' | 'stable';
    volatility: number;
    correlation?: Record<string, number>;
  };
  normalization: {
    method: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform';
    baseline: string;
    parameters: Record<string, number>;
  };
}

export interface ChartConfiguration {
  id: string;
  name: string;
  selectedIndicators: string[];
  timeRange: {
    start: string;
    end: string;
    preset: 'ytd' | '1y' | '3y' | '5y' | '10y' | 'all' | 'custom';
  };
  normalization: {
    enabled: boolean;
    method: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform';
    baseline: string;
  };
  visualization: {
    chartType: 'line' | 'area' | 'bar' | 'scatter';
    showEvents: boolean;
    showAnnotations: boolean;
    showCorrelations: boolean;
    yAxisScale: 'linear' | 'logarithmic';
    smoothing: 'none' | 'moving-average' | 'exponential';
  };
  filters: {
    countries: string[];
    categories: string[];
    minDataQuality: 'low' | 'medium' | 'high';
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MacroAnalysis {
  summary: {
    trendAnalysis: string;
    keyInsights: string[];
    riskFactors: string[];
    opportunities: string[];
  };
  correlations: Array<{
    indicator1: string;
    indicator2: string;
    correlation: number;
    significance: number;
    period: string;
  }>;
  forecasts: Array<{
    indicatorId: string;
    forecast: IndicatorDataPoint[];
    confidence: number;
    methodology: string;
    horizon: string;
  }>;
  anomalies: Array<{
    indicatorId: string;
    timestamp: string;
    value: number;
    expectedValue: number;
    deviation: number;
    description: string;
  }>;
}

export interface MacroDashboardData {
  indicators: MacroIndicator[];
  recentEvents: MacroEvent[];
  chartConfigurations: ChartConfiguration[];
  analysis: MacroAnalysis;
  summary: {
    totalIndicators: number;
    activeIndicators: number;
    lastUpdated: string;
    dataQuality: number;
    coverageByCategory: Record<string, number>;
    topCorrelations: Array<{
      indicator1: string;
      indicator2: string;
      correlation: number;
    }>;
  };
}

// Macro Trends Overlay Service Class
export class MacroTrendsOverlayService {
  private baseUrl = '/api/macro/indicators';

  // Get available indicators
  async getIndicators(): Promise<MacroIndicator[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch macro indicators');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('indicators_loaded', {
      indicatorCount: result.length,
      availableIndicators: result.filter((i: MacroIndicator) => i.isAvailable).length,
      categories: [...new Set(result.map((i: MacroIndicator) => i.category))],
      countries: [...new Set(result.map((i: MacroIndicator) => i.country))],
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get indicator data
  async getIndicatorData(
    indicatorIds: string[], 
    startDate: string, 
    endDate: string
  ): Promise<Record<string, IndicatorDataPoint[]>> {
    const params = new URLSearchParams({
      indicators: indicatorIds.join(','),
      startDate,
      endDate
    });

    const response = await fetch(`${this.baseUrl}/data?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch indicator data');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('indicator_data_loaded', {
      indicatorIds,
      startDate,
      endDate,
      dataPoints: Object.values(result).reduce((sum, data) => sum + (data as any[]).length, 0),
      timeSpan: this.calculateTimeSpan(startDate, endDate),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get normalized time series
  async getNormalizedTimeSeries(
    indicatorIds: string[],
    startDate: string,
    endDate: string,
    normalizationMethod: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform' = 'z-score',
    baseline?: string
  ): Promise<NormalizedTimeSeries[]> {
    const params = new URLSearchParams({
      indicators: indicatorIds.join(','),
      startDate,
      endDate,
      normalization: normalizationMethod
    });
    
    if (baseline) {
      params.append('baseline', baseline);
    }

    const response = await fetch(`${this.baseUrl}/normalized?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch normalized time series');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('normalized_data_loaded', {
      indicatorIds,
      normalizationMethod,
      baseline,
      dataSeriesCount: result.length,
      totalDataPoints: result.reduce((sum: number, series: NormalizedTimeSeries) => sum + series.data.length, 0),
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get macro events
  async getMacroEvents(startDate: string, endDate: string, categories?: string[]): Promise<MacroEvent[]> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    
    if (categories) {
      params.append('categories', categories.join(','));
    }

    const response = await fetch(`${this.baseUrl}/events?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch macro events');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('macro_events_loaded', {
      startDate,
      endDate,
      categories: categories || 'all',
      eventCount: result.length,
      significantEvents: result.filter((e: MacroEvent) => e.isSignificant).length,
      eventCategories: [...new Set(result.map((e: MacroEvent) => e.category))],
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get dashboard data
  async getDashboardData(): Promise<MacroDashboardData> {
    const response = await fetch(`${this.baseUrl}/dashboard`);
    if (!response.ok) {
      throw new Error('Failed to fetch macro dashboard data');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('dashboard_loaded', {
      totalIndicators: result.summary.totalIndicators,
      activeIndicators: result.summary.activeIndicators,
      recentEventsCount: result.recentEvents.length,
      configurationsCount: result.chartConfigurations.length,
      dataQuality: result.summary.dataQuality,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Save chart configuration
  async saveChartConfiguration(config: Omit<ChartConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChartConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save chart configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('chart_configuration_saved', {
      configurationId: result.id,
      configurationName: result.name,
      selectedIndicators: result.selectedIndicators,
      timeRange: result.timeRange.preset,
      normalizationEnabled: result.normalization.enabled,
      chartType: result.visualization.chartType,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Load chart configuration
  async loadChartConfiguration(configId: string): Promise<ChartConfiguration> {
    const response = await fetch(`${this.baseUrl}/configurations/${configId}`);
    if (!response.ok) {
      throw new Error('Failed to load chart configuration');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('chart_configuration_loaded', {
      configurationId: configId,
      configurationName: result.name,
      selectedIndicators: result.selectedIndicators,
      timeRange: result.timeRange.preset,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Get analysis
  async getAnalysis(indicatorIds: string[], startDate: string, endDate: string): Promise<MacroAnalysis> {
    const params = new URLSearchParams({
      indicators: indicatorIds.join(','),
      startDate,
      endDate
    });

    const response = await fetch(`${this.baseUrl}/analysis?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch macro analysis');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('analysis_generated', {
      indicatorIds,
      startDate,
      endDate,
      correlationCount: result.correlations.length,
      forecastCount: result.forecasts.length,
      anomalyCount: result.anomalies.length,
      keyInsights: result.summary.keyInsights.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Utility Methods
  getCategoryColor(category: MacroIndicator['category']): string {
    switch (category) {
      case 'monetary': return 'text-blue-600';
      case 'fiscal': return 'text-green-600';
      case 'economic': return 'text-purple-600';
      case 'labor': return 'text-orange-600';
      case 'inflation': return 'text-red-600';
      case 'trade': return 'text-teal-600';
      case 'sentiment': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  }

  getCategoryIcon(category: MacroIndicator['category']): string {
    switch (category) {
      case 'monetary': return 'dollar-sign';
      case 'fiscal': return 'receipt';
      case 'economic': return 'trending-up';
      case 'labor': return 'users';
      case 'inflation': return 'arrow-up-circle';
      case 'trade': return 'package';
      case 'sentiment': return 'heart';
      default: return 'bar-chart';
    }
  }

  getEventSeverityColor(severity: MacroEvent['severity']): string {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  getEventImpactColor(impact: MacroEvent['impact']): string {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  getFrequencyLabel(frequency: MacroIndicator['frequency']): string {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'yearly': return 'Yearly';
      default: return 'Unknown';
    }
  }

  formatIndicatorValue(value: number, unit: string): string {
    switch (unit) {
      case 'percent':
      case '%':
        return `${value.toFixed(2)}%`;
      case 'basis_points':
      case 'bps':
        return `${value.toFixed(0)} bps`;
      case 'index':
        return value.toFixed(1);
      case 'rate':
        return `${value.toFixed(3)}%`;
      case 'millions':
        return `${value.toFixed(1)}M`;
      case 'billions':
        return `${value.toFixed(1)}B`;
      case 'trillions':
        return `${value.toFixed(2)}T`;
      default:
        return value.toLocaleString();
    }
  }

  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
  }

  calculateTimeSpan(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }

  generateTimeRangeOptions(): Array<{ value: string; label: string; start: string; end: string }> {
    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    return [
      {
        value: 'ytd',
        label: 'Year to Date',
        start: `${now.getFullYear()}-01-01`,
        end: formatDate(now)
      },
      {
        value: '1y',
        label: 'Last 1 Year',
        start: formatDate(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)),
        end: formatDate(now)
      },
      {
        value: '3y',
        label: 'Last 3 Years',
        start: formatDate(new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)),
        end: formatDate(now)
      },
      {
        value: '5y',
        label: 'Last 5 Years',
        start: formatDate(new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)),
        end: formatDate(now)
      },
      {
        value: '10y',
        label: 'Last 10 Years',
        start: formatDate(new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)),
        end: formatDate(now)
      }
    ];
  }

  // Factory Methods
  createDefaultChartConfiguration(): Omit<ChartConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
    const timeRange = this.generateTimeRangeOptions().find(option => option.value === '1y')!;
    
    return {
      name: 'New Chart',
      selectedIndicators: [],
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
        preset: '1y'
      },
      normalization: {
        enabled: true,
        method: 'z-score',
        baseline: timeRange.start
      },
      visualization: {
        chartType: 'line',
        showEvents: true,
        showAnnotations: true,
        showCorrelations: false,
        yAxisScale: 'linear',
        smoothing: 'none'
      },
      filters: {
        countries: [],
        categories: [],
        minDataQuality: 'medium'
      },
      isDefault: false
    };
  }

  // Data Processing Methods
  processTimeSeriesData(
    rawData: Record<string, IndicatorDataPoint[]>,
    normalizationMethod: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform'
  ): NormalizedTimeSeries[] {
    return Object.entries(rawData).map(([indicatorId, data]) => {
      const values = data.map(d => d.value);
      const normalizedData = this.normalizeData(data, normalizationMethod);
      
      return {
        indicatorId,
        indicatorName: indicatorId, // Would be looked up from indicators list
        data: normalizedData,
        statistics: this.calculateStatistics(values),
        normalization: {
          method: normalizationMethod,
          baseline: data[0]?.timestamp || '',
          parameters: this.getNormalizationParameters(values, normalizationMethod)
        }
      };
    });
  }

  private normalizeData(
    data: IndicatorDataPoint[],
    method: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform'
  ): IndicatorDataPoint[] {
    const values = data.map(d => d.value);
    
    switch (method) {
      case 'z-score': {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return data.map(d => ({
          ...d,
          normalizedValue: stdDev > 0 ? (d.value - mean) / stdDev : 0
        }));
      }
      case 'min-max': {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        return data.map(d => ({
          ...d,
          normalizedValue: range > 0 ? (d.value - min) / range : 0
        }));
      }
      case 'percentage-change': {
        const baseline = values[0];
        return data.map(d => ({
          ...d,
          normalizedValue: baseline !== 0 ? ((d.value - baseline) / baseline) * 100 : 0
        }));
      }
      case 'log-transform': {
        return data.map(d => ({
          ...d,
          normalizedValue: d.value > 0 ? Math.log(d.value) : 0
        }));
      }
      default:
        return data.map(d => ({ ...d, normalizedValue: d.value }));
    }
  }

  private calculateStatistics(values: number[]): NormalizedTimeSeries['statistics'] {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        trend: 'stable',
        volatility: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = values.length % 2 === 0 
      ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
      : sorted[Math.floor(values.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Simple trend calculation
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    const change = (secondMean - firstMean) / firstMean;
    if (change > 0.05) trend = 'rising';
    else if (change < -0.05) trend = 'falling';
    
    return {
      mean,
      median,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      trend,
      volatility: stdDev / mean
    };
  }

  private getNormalizationParameters(
    values: number[],
    method: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform'
  ): Record<string, number> {
    switch (method) {
      case 'z-score': {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return { mean, stdDev };
      }
      case 'min-max': {
        return { min: Math.min(...values), max: Math.max(...values) };
      }
      case 'percentage-change': {
        return { baseline: values[0] || 0 };
      }
      default:
        return {};
    }
  }

  // Business Logic Methods
  async handleChartRender(
    indicatorIds: string[],
    timeRange: { start: string; end: string },
    config: Partial<ChartConfiguration>
  ): Promise<{ success: boolean; error?: string; data?: NormalizedTimeSeries[] }> {
    try {
      const data = await this.getNormalizedTimeSeries(
        indicatorIds,
        timeRange.start,
        timeRange.end,
        config.normalization?.method || 'z-score',
        config.normalization?.baseline
      );

      // Log chart render
      await this.logAgentMemory('chart_rendered', {
        indicatorIds,
        timeRangeStart: timeRange.start,
        timeRangeEnd: timeRange.end,
        normalizationMethod: config.normalization?.method || 'z-score',
        chartType: config.visualization?.chartType || 'line',
        showEvents: config.visualization?.showEvents || false,
        dataSeriesCount: data.length,
        timestamp: new Date().toISOString()
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to render chart' };
    }
  }

  async handleIndicatorSelection(
    indicatorIds: string[]
  ): Promise<{ success: boolean; error?: string; indicators?: MacroIndicator[] }> {
    try {
      const allIndicators = await this.getIndicators();
      const selectedIndicators = allIndicators.filter(indicator => indicatorIds.includes(indicator.id));

      // Log indicator selection
      await this.logAgentMemory('indicators_selected', {
        selectedIndicatorIds: indicatorIds,
        selectedIndicatorNames: selectedIndicators.map(i => i.name),
        selectedCategories: [...new Set(selectedIndicators.map(i => i.category))],
        selectedCountries: [...new Set(selectedIndicators.map(i => i.country))],
        timestamp: new Date().toISOString()
      });

      return { success: true, indicators: selectedIndicators };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to select indicators' };
    }
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-46-macro-trends-overlay',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const macroTrendsOverlayService = new MacroTrendsOverlayService();

// React Query hooks
export const useMacroIndicators = () => {
  return useQuery({
    queryKey: ['/api/macro/indicators'],
    queryFn: () => macroTrendsOverlayService.getIndicators(),
    staleTime: 300000, // 5 minutes
  });
};

export const useIndicatorData = (indicatorIds: string[], startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['/api/macro/indicators/data', indicatorIds, startDate, endDate],
    queryFn: () => macroTrendsOverlayService.getIndicatorData(indicatorIds, startDate, endDate),
    enabled: indicatorIds.length > 0 && !!startDate && !!endDate,
    staleTime: 60000, // 1 minute
  });
};

export const useNormalizedTimeSeries = (
  indicatorIds: string[],
  startDate: string,
  endDate: string,
  normalizationMethod: 'z-score' | 'min-max' | 'percentage-change' | 'log-transform' = 'z-score'
) => {
  return useQuery({
    queryKey: ['/api/macro/indicators/normalized', indicatorIds, startDate, endDate, normalizationMethod],
    queryFn: () => macroTrendsOverlayService.getNormalizedTimeSeries(indicatorIds, startDate, endDate, normalizationMethod),
    enabled: indicatorIds.length > 0 && !!startDate && !!endDate,
    staleTime: 60000, // 1 minute
  });
};

export const useMacroEvents = (startDate: string, endDate: string, categories?: string[]) => {
  return useQuery({
    queryKey: ['/api/macro/indicators/events', startDate, endDate, categories],
    queryFn: () => macroTrendsOverlayService.getMacroEvents(startDate, endDate, categories),
    enabled: !!startDate && !!endDate,
    staleTime: 300000, // 5 minutes
  });
};

export const useMacroDashboard = () => {
  return useQuery({
    queryKey: ['/api/macro/indicators/dashboard'],
    queryFn: () => macroTrendsOverlayService.getDashboardData(),
    refetchInterval: 300000, // 5 minutes
  });
};

export const useSaveChartConfiguration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Omit<ChartConfiguration, 'id' | 'createdAt' | 'updatedAt'>) =>
      macroTrendsOverlayService.saveChartConfiguration(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/macro/indicators/dashboard'] });
    },
  });
};

export const useLoadChartConfiguration = () => {
  return useMutation({
    mutationFn: (configId: string) =>
      macroTrendsOverlayService.loadChartConfiguration(configId),
  });
};

export const useMacroAnalysis = (indicatorIds: string[], startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['/api/macro/indicators/analysis', indicatorIds, startDate, endDate],
    queryFn: () => macroTrendsOverlayService.getAnalysis(indicatorIds, startDate, endDate),
    enabled: indicatorIds.length > 0 && !!startDate && !!endDate,
    staleTime: 600000, // 10 minutes
  });
}; 