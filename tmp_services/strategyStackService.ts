import { useQuery } from '@tanstack/react-query';

// Types for the Strategy Stack Service
export interface StrategyOverlay {
  id: string;
  name: string;
  assets: string[];
  totalValue: number;
  performance: number;
  isActive: boolean;
  weight?: number;
  overlayType?: 'momentum' | 'risk_management' | 'value' | 'growth' | 'defensive';
  signal?: 'bullish' | 'bearish' | 'neutral';
  priority?: number;
}

export interface OverlayStackData {
  overlays: StrategyOverlay[];
  activeCount: number;
  totalValue: number;
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
}

export interface StrategyStackResponse {
  overlays: StrategyOverlay[];
  totalValue: number;
  activeCount: number;
  lastUpdated: string;
}

// Strategy Stack Service Class
export class StrategyStackService {
  private baseUrl = '/api/strategy';

  // Fetch strategy overlays
  async getOverlays(vaultId?: string): Promise<StrategyStackResponse> {
    const url = vaultId 
      ? `${this.baseUrl}/overlays?vaultId=${vaultId}`
      : `${this.baseUrl}/overlays`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch strategy overlays');
    }
    
    return response.json();
  }

  // Process overlay data to include weights and signals
  processOverlayData(overlayData: StrategyStackResponse): OverlayStackData {
    if (!overlayData?.overlays) {
      return {
        overlays: [],
        activeCount: 0,
        totalValue: 0,
        overallSignal: 'neutral',
        signalStrength: 0
      };
    }

    const totalValue = overlayData.totalValue || 0;
    
    // Calculate weights and add signals
    const processedOverlays = overlayData.overlays.map((overlay, index) => ({
      ...overlay,
      weight: totalValue > 0 ? (overlay.totalValue / totalValue) * 100 : 0,
      overlayType: this.determineOverlayType(overlay.name),
      signal: this.calculateSignal(overlay.performance),
      priority: index + 1
    }));

    // Calculate overall signal
    const bullishCount = processedOverlays.filter(o => o.signal === 'bullish').length;
    const bearishCount = processedOverlays.filter(o => o.signal === 'bearish').length;
    const totalSignals = processedOverlays.length;
    
    let overallSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let signalStrength = 0;

    if (totalSignals > 0) {
      if (bullishCount > bearishCount) {
        overallSignal = 'bullish';
        signalStrength = bullishCount / totalSignals;
      } else if (bearishCount > bullishCount) {
        overallSignal = 'bearish';
        signalStrength = bearishCount / totalSignals;
      } else {
        overallSignal = 'neutral';
        signalStrength = 0.5;
      }
    }

    return {
      overlays: processedOverlays,
      activeCount: overlayData.activeCount || 0,
      totalValue,
      overallSignal,
      signalStrength
    };
  }

  // Determine overlay type based on name
  private determineOverlayType(name: string): StrategyOverlay['overlayType'] {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('risk')) return 'risk_management';
    if (lowerName.includes('momentum')) return 'momentum';
    if (lowerName.includes('value')) return 'value';
    if (lowerName.includes('growth')) return 'growth';
    return 'defensive';
  }

  // Calculate signal based on performance
  private calculateSignal(performance: number): StrategyOverlay['signal'] {
    if (performance > 2) return 'bullish';
    if (performance < -1) return 'bearish';
    return 'neutral';
  }

  // Get overlay type icon name
  getOverlayIconType(type?: string): string {
    switch (type) {
      case 'momentum': return 'trending-up';
      case 'risk_management': return 'shield';
      case 'value': return 'target';
      case 'growth': return 'activity';
      case 'defensive': return 'shield';
      default: return 'layers';
    }
  }

  // Get signal colors and styling
  getSignalStyling(signal: 'bullish' | 'bearish' | 'neutral'): {
    color: string;
    bgColor: string;
    borderColor: string;
  } {
    switch (signal) {
      case 'bullish':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'bearish':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100', 
          borderColor: 'border-red-200'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  }

  // Get performance color
  getPerformanceColor(performance: number): string {
    return performance >= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Format performance display
  formatPerformance(performance: number): string {
    return `${performance >= 0 ? '+' : ''}${performance.toFixed(1)}%`;
  }

  // Calculate weight percentage for display
  calculateWeightPercentage(overlay: StrategyOverlay, totalValue: number): number {
    return overlay.weight || (overlay.totalValue / totalValue) * 100;
  }
}

// Service instance
export const strategyStackService = new StrategyStackService();

// React Query hooks
export const useStrategyOverlays = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/strategy/overlays', vaultId],
    queryFn: () => strategyStackService.getOverlays(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 60000, // Refresh every minute
  });
}; 