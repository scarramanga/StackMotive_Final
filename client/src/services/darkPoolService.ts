import { useQuery, useMutation } from '@tanstack/react-query';

export interface DarkPoolTrade {
    id: string;
    symbol: string;
    timestamp: string;
    volume: number;
    price: number;
    side: 'buy' | 'sell';
    exchange: string;
    confidence: number;
    marketImpact: number;
}

export interface DarkPoolAnalytics {
    totalVolume: number;
    averageTradeSize: number;
    largestTrade: DarkPoolTrade;
    volumeByExchange: Record<string, number>;
    sentimentScore: number;
    recentActivity: DarkPoolTrade[];
}

export class DarkPoolService {
    private baseUrl = '/api/dark-pool';

    async fetchDarkPoolTrades(options: {
        symbols?: string[];
        startDate?: string;
        endDate?: string;
        minVolume?: number;
        confidence?: number;
    }): Promise<DarkPoolTrade[]> {
        const response = await fetch(`${this.baseUrl}/trades?${new URLSearchParams(options as any)}`);
        if (!response.ok) throw new Error('Failed to fetch dark pool trades');
        return response.json();
    }

    async getAnalytics(symbol: string): Promise<DarkPoolAnalytics> {
        const response = await fetch(`${this.baseUrl}/analytics/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch dark pool analytics');
        return response.json();
    }

    async getVolumeProfile(symbol: string, period: string = '1d'): Promise<Record<string, number>> {
        const response = await fetch(`${this.baseUrl}/volume-profile/${symbol}?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch volume profile');
        return response.json();
    }
}

export const darkPoolService = new DarkPoolService();

// React Query hooks
export function useDarkPoolTrades(options: Parameters<DarkPoolService['fetchDarkPoolTrades']>[0]) {
    return useQuery({
        queryKey: ['darkPoolTrades', options],
        queryFn: () => darkPoolService.fetchDarkPoolTrades(options),
    });
}

export function useDarkPoolAnalytics(symbol: string) {
    return useQuery({
        queryKey: ['darkPoolAnalytics', symbol],
        queryFn: () => darkPoolService.getAnalytics(symbol),
        enabled: Boolean(symbol),
    });
}

export function useDarkPoolVolumeProfile(symbol: string, period: string = '1d') {
    return useQuery({
        queryKey: ['darkPoolVolume', symbol, period],
        queryFn: () => darkPoolService.getVolumeProfile(symbol, period),
        enabled: Boolean(symbol),
    });
}
