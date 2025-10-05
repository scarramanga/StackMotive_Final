// Block 34: Sovereign Signal Dashboard
import { getMacroSignals } from '../api/marketData';

export interface SovereignSignalRationale {
  summary: string;
  cpi: boolean;
  debt: boolean;
  fiatDebasement: boolean;
  qe: boolean;
}

export interface SovereignSignal {
  asset: string;
  signalStrength: number;
  rationale: SovereignSignalRationale;
  isSovereignHedge: boolean;
}

export async function getSovereignSignals({ portfolio, overlays }: { portfolio: any; overlays: any[] }): Promise<SovereignSignal[]> {
  const macro = await getMacroSignals(); // { cpi, debt, fiatDebasement, qe }
  // Example logic: flag assets that hedge inflation/QE (e.g., BTC, gold, TIPS, commodities)
  const sovereignAssets = ['BTC', 'XAU', 'TIPS', 'COMMODITIES', 'CHF'];
  const results: SovereignSignal[] = [];
  for (const asset of sovereignAssets) {
    let strength = 0;
    let rationaleSummary = '';
    let rationale: SovereignSignalRationale = {
      summary: '',
      cpi: false,
      debt: false,
      fiatDebasement: false,
      qe: false,
    };
    // CPI high: inflation hedge assets get boost
    if (macro.cpi > 3) {
      if (['BTC', 'XAU', 'TIPS', 'COMMODITIES'].includes(asset)) {
        strength += 0.4;
        rationaleSummary += 'High CPI: inflation hedge. ';
        rationale.cpi = true;
      }
    }
    // Debt/QE high: hard assets get boost
    if (macro.debt > 100 || macro.qeActive) {
      if (['BTC', 'XAU', 'CHF'].includes(asset)) {
        strength += 0.3;
        rationaleSummary += 'High debt/QE: hard asset hedge. ';
        rationale.debt = macro.debt > 100;
        rationale.qe = macro.qeActive;
      }
    }
    // Fiat debasement: non-fiat assets get boost
    if (macro.fiatDebasement > 0.05) {
      if (['BTC', 'XAU', 'COMMODITIES', 'CHF'].includes(asset)) {
        strength += 0.3;
        rationaleSummary += 'Fiat debasement: non-fiat hedge. ';
        rationale.fiatDebasement = true;
      }
    }
    rationale.summary = rationaleSummary.trim();
    if (strength > 0) {
      results.push({
        asset,
        signalStrength: Math.min(1, strength),
        rationale,
        isSovereignHedge: true,
      });
    }
  }
  // Flag user holdings that match
  for (const holding of portfolio.holdings) {
    if (!results.find(r => r.asset === holding.symbol)) continue;
    // Already flagged as sovereign hedge
    continue;
  }
  return results;
} 