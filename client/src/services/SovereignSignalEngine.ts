import { useQuery } from '@tanstack/react-query';

export interface MacroSignal {
    id: string;
    type: 'economic' | 'market' | 'sentiment' | 'technical';
    indicator: string;
    value: number;
    threshold: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    timestamp: string;
    impact: 'high' | 'medium' | 'low';
}

export interface SignalRationale {
    primary: string;
    supporting: string[];
    risks: string[];
    timeframe: string;
    confidence: number;
}

export interface PortfolioRecommendation {
    id: string;
    type: 'allocation' | 'hedge' | 'rebalance' | 'risk';
    action: string;
    priority: 'high' | 'medium' | 'low';
    rationale: SignalRationale;
    affectedSymbols: string[];
    expectedImpact: number;
}

export class SovereignSignalEngine {
    private baseUrl = '/api/sovereign';

    async getMacroSignals(): Promise<MacroSignal[]> {
        const response = await fetch(`${this.baseUrl}/macro`);
        if (!response.ok) throw new Error('Failed to fetch macro signals');
        return response.json();
    }

    async getPortfolioRecommendations(vaultId: string): Promise<PortfolioRecommendation[]> {
        const response = await fetch(`${this.baseUrl}/recommendations/${vaultId}`);
        if (!response.ok) throw new Error('Failed to fetch portfolio recommendations');
        return response.json();
    }

    async getRationale(signalId: string): Promise<SignalRationale> {
        const response = await fetch(`${this.baseUrl}/rationale/${signalId}`);
        if (!response.ok) throw new Error('Failed to fetch signal rationale');
        return response.json();
    }

    async auditAction(action: {
        recommendationId: string;
        accepted: boolean;
        reason?: string;
    }): Promise<void> {
        const response = await fetch(`${this.baseUrl}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action),
        });
        if (!response.ok) throw new Error('Failed to audit action');
    }
}

export const sovereignSignalEngine = new SovereignSignalEngine();

// React Query hooks
export function useMacroSignals() {
    return useQuery({
        queryKey: ['macroSignals'],
        queryFn: () => sovereignSignalEngine.getMacroSignals(),
    });
}

export function usePortfolioRecommendations(vaultId: string) {
    return useQuery({
        queryKey: ['portfolioRecommendations', vaultId],
        queryFn: () => sovereignSignalEngine.getPortfolioRecommendations(vaultId),
        enabled: Boolean(vaultId),
    });
}

export function useSignalRationale(signalId: string) {
    return useQuery({
        queryKey: ['signalRationale', signalId],
        queryFn: () => sovereignSignalEngine.getRationale(signalId),
        enabled: Boolean(signalId),
    });
}
