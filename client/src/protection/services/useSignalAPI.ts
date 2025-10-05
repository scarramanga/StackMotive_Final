import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import { PortfolioContext } from '../contexts/PortfolioContext';

export interface Signal {
  signal_id: string;
  user_id: string;
  vault_id: string;
  symbol: string;
  signal_type: string;
  confidence?: number;
  action?: string;
  headline?: string;
  source?: string;
  timestamp: string;
}

export function useSignalAPI() {
  const { session } = useAuth();
  const portfolioCtx = useContext(PortfolioContext);
  const activeVaultId = portfolioCtx?.activeVaultId;

  if (typeof window === 'undefined' || !activeVaultId) {
    return {
      fetchSignalsForSessionVault: async () => [],
      addSignalForSessionVault: async () => {},
      deleteSignalsForSessionVault: async () => {},
    };
  }

  async function fetchSignalsForSessionVault(): Promise<Signal[]> {
    if (!session) return [];
    const res = await fetch(`/api/signal?vaultId=${activeVaultId}`, {
      headers: { Authorization: `Bearer ${session.userId}` },
    });
    if (!res.ok) return [];
    return await res.json();
  }

  async function addSignalForSessionVault(signal: Partial<Signal>): Promise<void> {
    if (!session) return;
    await fetch('/api/signal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify({ ...signal, vaultId: activeVaultId }),
    });
  }

  async function deleteSignalsForSessionVault(): Promise<void> {
    if (!session) return;
    await fetch('/api/signal', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify({ vaultId: activeVaultId }),
    });
  }

  return { fetchSignalsForSessionVault, addSignalForSessionVault, deleteSignalsForSessionVault };
} 