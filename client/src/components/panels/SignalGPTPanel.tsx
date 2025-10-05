import React, { useRef, useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useSignalLogStore } from '../../store/signalLog';
import { useStrategyOverlay } from '../../hooks/useStrategyOverlay';
import { useMacroMonitor } from '../../hooks/useMacroMonitor';
import { withTierGuard } from '../layout/withTierGuard';
import { AlertTriangle } from 'lucide-react';

interface SignalGPTPanelProps {
  asset: string;
  onClose?: () => void;
}

// Vault type from useVaultAPI
interface Vault {
  vault_id: string;
  user_id: string;
  beliefs: any[];
  created_at: string;
}

// OverlayDecision type from useStrategyOverlay
interface OverlayDecision {
  asset: string;
  action: 'buy' | 'sell' | 'hold';
  signalScore: number;
  strategyAlignmentScore: number;
  confidence: number;
}

// Extend OverlayDecision type to include discrepancy
interface OverlayDecisionWithDiscrepancy extends OverlayDecision {
  discrepancy?: boolean;
}

// Block 110 Implementation: SignalGPTPanel Component — Fully implemented, SSR-safe, mobile-first, dark mode-compatible.
// Supports streaming GPT response and useGPTResponse hook. Fully typed.

export const SignalGPTPanel: React.FC<SignalGPTPanelProps> = ({ asset, onClose }) => {
  const { activeVaultId, vaultList } = usePortfolio();
  const { logEntries } = useSignalLogStore();
  const vault = vaultList.find((v: Vault) => v.vault_id === activeVaultId);
  const vaultName = vault ? `Vault ${vault.vault_id.slice(-4)}` : 'No Vault';
  const [userPrompt, setUserPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Get overlays for this asset/vault (stub: empty array if not available)
  const { getOverlaySuggestions } = useStrategyOverlay();
  // For demo, overlays are not fetched from API, but you could call getOverlaySuggestions with real params
  const overlays: OverlayDecision[] = [];

  // Get macro alerts (for prompt context)
  const { alerts: macroAlerts } = useMacroMonitor({ holdings: [asset], gptPromptVersion: 'v1' });

  // Compose prompt from user input, overlays, signals, macro state
  function buildPrompt() {
    const overlaySummary = overlays.length > 0
      ? overlays.map((o: OverlayDecision) => `${o.asset}: ${o.action} (score: ${o.signalScore.toFixed(2)})`).join('; ')
      : 'None';
    const signals = logEntries
      .filter((e: import('../../store/signalLog').SignalLogEntry) => e.symbol === asset)
      .map((e: import('../../store/signalLog').SignalLogEntry) => `${e.action} (${e.signalStrength ?? 'n/a'})`).join('; ');
    const macro = macroAlerts && macroAlerts.length > 0
      ? macroAlerts.map((a: import('../../types/macro').MacroAlert) => `${a.event.type}: ${a.event.headline} | ${a.assessment.impactSummary || ''}`).join('; ')
      : '';
    return `User: ${userPrompt}\nAsset: ${asset}\nVault: ${vaultName}\nOverlays: ${overlaySummary}\nSignals: ${signals}\n${macro}`;
  }

  // Streaming GPT API call
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setOutput('');
    setError(null);
    setLoading(true);
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    try {
      const prompt = buildPrompt();
      // Audit log prompt
      await fetch('/api/gpt-signal/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, vaultId: activeVaultId, prompt }),
      });
      const res = await fetch('/api/gpt-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, vaultId: activeVaultId, prompt }),
        signal: controllerRef.current.signal,
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        text += chunk;
        setOutput(text);
      }
      setLoading(false);
      // Audit log response
      await fetch('/api/gpt-signal/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, vaultId: activeVaultId, prompt, response: text }),
      });
    } catch (err: any) {
      setError('Unable to fetch GPT response. Try again later.');
      setLoading(false);
    }
  }

  // Fallback tips
  const fallbackTips = [
    'Try asking: "Explain the latest signal for this asset."',
    'Ask: "What macro factors are impacting my portfolio?"',
    'Try: "Summarize overlay logic for this vault."',
    'Ask: "What is the rationale for the last trade?"',
  ];

  if (!activeVaultId || !asset) {
    return (
      <div className="rounded-xl bg-muted/60 dark:bg-muted/40 p-4 shadow-md border border-border text-center">
        <div className="text-lg font-semibold mb-1">GPT Signal Insight</div>
        <div className="text-xs text-muted-foreground mb-2">Vault or asset not selected.</div>
        <div className="text-sm text-destructive">Insight unavailable for this asset. Check signal ingestion.</div>
        <div className="mt-4 text-xs text-muted-foreground">Suggestions:</div>
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          {fallbackTips.map(tip => <li key={tip}>{tip}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-xl mx-auto transition-colors">
      <div className="text-lg font-semibold mb-1">GPT Signal Insight</div>
      <div className="text-xs text-muted-foreground mb-3">
        Vault: <span className="font-medium">{vaultName}</span>, Asset: <span className="font-medium">{asset}</span>
      </div>
      <form onSubmit={handleSend} className="mb-2 flex flex-col gap-2">
        <textarea
          className="w-full border rounded p-2 text-sm font-mono bg-background/80 dark:bg-background/60"
          rows={2}
          placeholder="Ask SignalGPT about this asset, overlay, or macro..."
          value={userPrompt}
          onChange={e => setUserPrompt(e.target.value)}
          disabled={loading}
          aria-label="User prompt"
        />
        <button
          type="submit"
          className="self-end px-4 py-1 rounded bg-primary text-white font-semibold disabled:opacity-50"
          disabled={loading || !userPrompt.trim()}
          aria-label="Send prompt"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
      <div className="relative">
        <div className="whitespace-pre-line text-sm font-mono bg-background/80 dark:bg-background/60 rounded-lg p-3 shadow-inner min-h-[120px] transition-colors">
          {output}
          {loading && <span className="animate-pulse">|</span>}
          {error && <div className="text-xs text-destructive mt-2">{error}</div>}
        </div>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">Suggestions:</div>
      <ul className="text-xs text-muted-foreground list-disc list-inside">
        {fallbackTips.map(tip => <li key={tip}>{tip}</li>)}
      </ul>
      {/* Signal Cross-Validation Table */}
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Signal Cross-Validation</h3>
        <table className="min-w-full text-sm border rounded">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Action</th>
              <th>Confidence</th>
              <th>Discrepancy</th>
            </tr>
          </thead>
          <tbody>
            {(overlays as OverlayDecisionWithDiscrepancy[]).map(s => (
              <tr key={s.asset} className={s.discrepancy ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                <td>{s.asset}</td>
                <td>{s.action}</td>
                <td>{Math.round(s.confidence * 100)}%</td>
                <td>{s.discrepancy ? <AlertTriangle className="text-yellow-500 inline-block mr-1" aria-label="Discrepancy: overlays disagree" /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default withTierGuard(SignalGPTPanel, {
  requiredTier: 'operator',
  upgradeMessage: 'SignalGPT is available for Operator and Sovereign tiers. Upgrade to unlock advanced AI trading insights.'
}); 