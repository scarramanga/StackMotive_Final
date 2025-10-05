import { useQuery } from '@tanstack/react-query';

export interface OptionsFlow {
    id: string;
    symbol: string;
    timestamp: string;
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    premium: number;
    volume: number;
    openInterest: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    unusualActivity: boolean;
}

export interface SmartMoneySignal {
    id: string;
    symbol: string;
    timestamp: string;
    type: 'options' | 'dark_pool' | 'institutional';
    action: string;
    confidence: number;
    value: number;
    details: Record<string, any>;
}

export interface FlowAnalytics {
    putCallRatio: number;
    totalPremium: number;
    topSymbols: Array<{
        symbol: string;
        premium: number;
        sentiment: string;
    }>;
    unusualActivityCount: number;
    sentimentScore: number;
}

export class SmartMoneyTrackerService {
    private baseUrl = '/api/smart-money';

    async fetchOptionsFlow(options: {
        symbols?: string[];
        minPremium?: number;
        unusualOnly?: boolean;
    }): Promise<OptionsFlow[]> {
        const response = await fetch(`${this.baseUrl}/options-flow?${new URLSearchParams(options as any)}`);
        if (!response.ok) throw new Error('Failed to fetch options flow');
        return response.json();
    }

    async getSignals(symbol: string): Promise<SmartMoneySignal[]> {
        const response = await fetch(`${this.baseUrl}/signals/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch smart money signals');
        return response.json();
    }

    async getAnalytics(): Promise<FlowAnalytics> {
        const response = await fetch(`${this.baseUrl}/analytics`);
        if (!response.ok) throw new Error('Failed to fetch flow analytics');
        return response.json();
    }

    async getSymbolSentiment(symbol: string): Promise<{
        score: number;
        signals: SmartMoneySignal[];
        trends: Record<string, number>;
    }> {
        const response = await fetch(`${this.baseUrl}/sentiment/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch symbol sentiment');
        return response.json();
    }
}

export const smartMoneyTrackerService = new SmartMoneyTrackerService();

// React Query hooks
export function useOptionsFlow(options: Parameters<SmartMoneyTrackerService['fetchOptionsFlow']>[0]) {
    return useQuery({
        queryKey: ['optionsFlow', options],
        queryFn: () => smartMoneyTrackerService.fetchOptionsFlow(options),
    });
}

export function useSmartMoneySignals(symbol: string) {
    return useQuery({
        queryKey: ['smartMoneySignals', symbol],
        queryFn: () => smartMoneyTrackerService.getSignals(symbol),
        enabled: Boolean(symbol),
    });
}

export function useFlowAnalytics() {
    return useQuery({
        queryKey: ['flowAnalytics'],
        queryFn: () => smartMoneyTrackerService.getAnalytics(),
    });
}

export function useSymbolSentiment(symbol: string) {
    return useQuery({
        queryKey: ['symbolSentiment', symbol],
        queryFn: () => smartMoneyTrackerService.getSymbolSentiment(symbol),
        enabled: Boolean(symbol),
    });
}
