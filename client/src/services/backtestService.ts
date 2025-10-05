import { useQuery, useMutation } from '@tanstack/react-query';

export interface BacktestConfig {
    strategyId: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    symbols: string[];
    parameters: Record<string, any>;
}

export interface BacktestResult {
    id: string;
    config: BacktestConfig;
    performance: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        winRate: number;
        profitFactor: number;
    };
    trades: Array<{
        timestamp: string;
        symbol: string;
        side: 'buy' | 'sell';
        price: number;
        quantity: number;
        pnl: number;
    }>;
    equity: Array<{
        timestamp: string;
        value: number;
    }>;
    metrics: {
        averageWin: number;
        averageLoss: number;
        largestWin: number;
        largestLoss: number;
        averageHoldingPeriod: number;
    };
}

export class BacktestService {
    private baseUrl = '/api/backtest';

    async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
        const response = await fetch(`${this.baseUrl}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (!response.ok) throw new Error('Failed to run backtest');
        return response.json();
    }

    async getBacktestResult(id: string): Promise<BacktestResult> {
        const response = await fetch(`${this.baseUrl}/results/${id}`);
        if (!response.ok) throw new Error('Failed to fetch backtest result');
        return response.json();
    }

    async getBacktestHistory(): Promise<BacktestResult[]> {
        const response = await fetch(`${this.baseUrl}/history`);
        if (!response.ok) throw new Error('Failed to fetch backtest history');
        return response.json();
    }
}

export const backtestService = new BacktestService();

// React Query hooks
export function useRunBacktest() {
    return useMutation({
        mutationFn: (config: BacktestConfig) => backtestService.runBacktest(config),
    });
}

export function useBacktestResult(id: string) {
    return useQuery({
        queryKey: ['backtestResult', id],
        queryFn: () => backtestService.getBacktestResult(id),
        enabled: Boolean(id),
    });
}

export function useBacktestHistory() {
    return useQuery({
        queryKey: ['backtestHistory'],
        queryFn: () => backtestService.getBacktestHistory(),
    });
}
