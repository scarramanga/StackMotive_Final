// scoreSignals.ts - Signal scoring engine for filtering/ranking
// SSR-safe, standalone utility

/**
 * Scoring Weights:
 * - Signal confidence: 50%
 * - Vault alignment: 30%
 * - User trust bias: 20%
 *
 * Vault alignment is mock: +1 (aligned), 0 (neutral), -1 (contradictory)
 * User trust bias: 0-1 (from userPrefs)
 */

export interface Signal {
  symbol: string;
  action: 'buy' | 'sell' | 'short' | 'long';
  confidence: number; // 0-1
}

export interface UserPrefs {
  trustBias: number; // 0-1
}

export interface VaultBelief {
  id: string;
  statement: string;
  confidence: number; // 1-5
}

export function scoreSignal(
  signal: Signal,
  userPrefs: UserPrefs,
  vaultBeliefs: VaultBelief[]
): { score: number; breakdown: { confidence: number; vault: number; trust: number } } {
  // 1. Signal confidence (0-1)
  const confidenceScore = signal.confidence * 100;

  // 2. Vault alignment (mock logic)
  // Example: if action contradicts a strong belief, penalize
  let vaultAlignment = 0; // neutral
  if (signal.symbol === 'BTC' && signal.action === 'short' && vaultBeliefs.some(b => b.id === 'btc-sov-store' && b.confidence >= 4)) {
    vaultAlignment = -1;
  } else if (signal.symbol === 'USD' && signal.action === 'buy' && vaultBeliefs.some(b => b.id === 'usd-debase' && b.confidence >= 4)) {
    vaultAlignment = -1;
  } else if (vaultBeliefs.some(b => b.id === signal.symbol.toLowerCase() && b.confidence >= 3)) {
    vaultAlignment = 1;
  }
  // Map alignment to score: +100 (aligned), 0 (neutral), -100 (contradictory)
  const vaultScore = vaultAlignment === 1 ? 100 : vaultAlignment === -1 ? 0 : 50;

  // 3. User trust bias (0-1)
  const trustScore = (userPrefs.trustBias ?? 0.5) * 100;

  // Weighted sum
  const score = Math.round(
    confidenceScore * 0.5 +
    vaultScore * 0.3 +
    trustScore * 0.2
  );

  return {
    score,
    breakdown: {
      confidence: Math.round(confidenceScore * 0.5),
      vault: Math.round(vaultScore * 0.3),
      trust: Math.round(trustScore * 0.2),
    },
  };
} 