import { useAuth } from '../contexts/AuthContext';
import { useContext } from 'react';
import { PortfolioContext } from '../contexts/PortfolioContext';

export interface GPTSignal {
  asset: string;
  type: string;
  confidence?: number;
  source?: string;
  timestamp?: string;
}

export function useGPTSignalLogger() {
  const { session } = useAuth();
  const portfolioCtx = useContext(PortfolioContext);
  const activeVaultId = portfolioCtx?.activeVaultId;

  if (typeof window === 'undefined' || !activeVaultId) {
    return {
      logGPTSignalForSessionVault: async () => {},
    };
  }

  async function logGPTSignalForSessionVault(signal: GPTSignal): Promise<void> {
    if (!session) return;
    try {
      await fetch('/api/gpt-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.userId}`,
        },
        body: JSON.stringify({ ...signal, vault_id: activeVaultId }),
      });
    } catch (err) {
      // Block 71 Implementation: Silent fail
    }
  }

  return { logGPTSignalForSessionVault };
} 