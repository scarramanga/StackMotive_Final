import React, { useEffect, useState } from 'react';
import { getSovereignSignals, SovereignSignal } from '../../engines/SovereignSignalEngine';
import { auditAdvisorAction } from '../../lib/advisorAudit';

// Block 34: Sovereign Signal Dashboard
export const SovereignSignalPanel: React.FC<{ portfolio: any; overlays: any[] }> = ({ portfolio, overlays }) => {
  const [signals, setSignals] = useState<SovereignSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSovereignSignals({ portfolio, overlays })
      .then(sigs => {
        setSignals(sigs);
        auditAdvisorAction({
          id: `sovereign-panel-view-${Date.now()}`,
          tab: 'macro',
          asset: undefined,
          action: 'view',
          rationale: 'User viewed Sovereign Signal Dashboard',
          markdown: '',
          timestamp: new Date().toISOString(),
          completed: true,
          accepted: false,
          declined: false,
        });
      })
      .catch(e => setError(e.message || 'Failed to fetch sovereign signals'))
      .finally(() => setLoading(false));
  }, [portfolio, overlays]);

  const handleExpand = (asset: string) => {
    setExpanded(expanded === asset ? null : asset);
    if (expanded !== asset) {
      auditAdvisorAction({
        id: `sovereign-rationale-expand-${asset}-${Date.now()}`,
        tab: 'macro',
        asset,
        action: 'expand-rationale',
        rationale: `User expanded rationale for ${asset}`,
        markdown: '',
        timestamp: new Date().toISOString(),
        completed: true,
        accepted: false,
        declined: false,
      });
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground" aria-live="polite">Loading sovereign signals…</div>;
  if (error) return <div className="p-6 text-center text-destructive" role="alert">{error}</div>;

  return (
    <section className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-2xl mx-auto my-6 transition-colors" aria-labelledby="sovereign-signal-dashboard-title">
      <h2 id="sovereign-signal-dashboard-title" className="text-lg font-semibold mb-2">{'Sovereign Signal Dashboard' /* t('sovereignSignalDashboard.title') */}</h2>
      <div className="flex flex-col gap-3">
        {signals.length === 0 && <div className="text-xs text-muted-foreground">{'No sovereign hedges signaled at this time.' /* t('sovereignSignalDashboard.noSignals') */}</div>}
        {signals.map(sig => {
          const userHas = portfolio.holdings.some((h: any) => h.symbol === sig.asset);
          return (
            <div key={sig.asset} className="flex flex-col border rounded p-2 bg-muted/40" aria-label={`Sovereign signal for ${sig.asset}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg min-w-[48px]">{sig.asset}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sig.signalStrength > 0.7 ? 'bg-green-500 text-white' : sig.signalStrength > 0.4 ? 'bg-yellow-400 text-yellow-900' : 'bg-red-200 text-red-800'}`}>{(sig.signalStrength * 100).toFixed(0)}%</span>
                <button
                  className="ml-2 text-xs underline text-primary hover:text-primary/80 focus:outline-none"
                  aria-expanded={expanded === sig.asset}
                  aria-controls={`rationale-${sig.asset}`}
                  onClick={() => handleExpand(sig.asset)}
                  title="Show rationale breakdown"
                >
                  {'Rationale' /* t('sovereignSignalDashboard.rationale') */}
                </button>
                <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${userHas ? 'bg-primary text-white' : 'bg-muted text-foreground border'}`}>{userHas ? 'In Portfolio' /* t('sovereignSignalDashboard.inPortfolio') */ : 'Recommended Hedge' /* t('sovereignSignalDashboard.recommendedHedge') */}</span>
              </div>
              {expanded === sig.asset && (
                <div id={`rationale-${sig.asset}`} className="mt-2 text-xs bg-background/80 rounded p-2 border" role="region" aria-label={`Rationale breakdown for ${sig.asset}`}>
                  <div className="mb-1 font-semibold">{sig.rationale.summary}</div>
                  <ul className="flex flex-wrap gap-2">
                    <li><span className={`px-2 py-0.5 rounded ${sig.rationale.cpi ? 'bg-green-200 text-green-900' : 'bg-muted text-muted-foreground'}`}>CPI</span></li>
                    <li><span className={`px-2 py-0.5 rounded ${sig.rationale.debt ? 'bg-green-200 text-green-900' : 'bg-muted text-muted-foreground'}`}>Debt</span></li>
                    <li><span className={`px-2 py-0.5 rounded ${sig.rationale.fiatDebasement ? 'bg-green-200 text-green-900' : 'bg-muted text-muted-foreground'}`}>Fiat Debasement</span></li>
                    <li><span className={`px-2 py-0.5 rounded ${sig.rationale.qe ? 'bg-green-200 text-green-900' : 'bg-muted text-muted-foreground'}`}>QE</span></li>
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}; 