import { useQuery } from '@tanstack/react-query';

export interface InsiderTrade {
    id: string;
    symbol: string;
    companyName: string;
    insiderName: string;
    title: string;
    tradeDate: string;
    sharesPurchased: number;
    sharesSold: number;
    pricePerShare: number;
    totalValue: number;
    sharesOwned: number;
    percentOwned: number;
    formType: string;
}

export interface InsiderAnalytics {
    buyCount: number;
    sellCount: number;
    netShares: number;
    netValue: number;
    largestTrade: InsiderTrade;
    topInsiders: Array<{
        name: string;
        totalValue: number;
        netShares: number;
    }>;
}

export class InsiderTradingService {
    private baseUrl = '/api/insider';

    async fetchInsiderTrades(options: {
        symbol?: string;
        startDate?: string;
        endDate?: string;
        minValue?: number;
    }): Promise<InsiderTrade[]> {
        const response = await fetch(`${this.baseUrl}/trades?${new URLSearchParams(options as any)}`);
        if (!response.ok) throw new Error('Failed to fetch insider trades');
        return response.json();
    }

    async getAnalytics(symbol: string): Promise<InsiderAnalytics> {
        const response = await fetch(`${this.baseUrl}/analytics/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch insider analytics');
        return response.json();
    }

    async getTraderPerformance(insiderName: string): Promise<{
        totalTrades: number;
        successRate: number;
        averageReturn: number;
        trades: InsiderTrade[];
    }> {
        const response = await fetch(`${this.baseUrl}/trader/${encodeURIComponent(insiderName)}`);
        if (!response.ok) throw new Error('Failed to fetch trader performance');
        return response.json();
    }
}

export const insiderTradingService = new InsiderTradingService();

// React Query hooks
export function useInsiderTrades(options: Parameters<InsiderTradingService['fetchInsiderTrades']>[0]) {
    return useQuery({
        queryKey: ['insiderTrades', options],
        queryFn: () => insiderTradingService.fetchInsiderTrades(options),
    });
}

export function useInsiderAnalytics(symbol: string) {
    return useQuery({
        queryKey: ['insiderAnalytics', symbol],
        queryFn: () => insiderTradingService.getAnalytics(symbol),
        enabled: Boolean(symbol),
    });
}

export function useTraderPerformance(insiderName: string) {
    return useQuery({
        queryKey: ['traderPerformance', insiderName],
        queryFn: () => insiderTradingService.getTraderPerformance(insiderName),
        enabled: Boolean(insiderName),
    });
}
