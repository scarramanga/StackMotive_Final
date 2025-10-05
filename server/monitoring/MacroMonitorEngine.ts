// Block 8: Macro Monitor Engine
import type { MacroEvent, MacroAssessment } from '../types/macro';

export async function fetchMacroFeeds(): Promise<MacroEvent[]> {
  // TODO: Replace with real backend/API calls (calendar, RSS, Twitter, etc.)
  return [];
}

export function normalizeMacroEvents(rawEvents: any[]): MacroEvent[] {
  // Normalize and deduplicate events
  const map = new Map<string, MacroEvent>();
  for (const e of rawEvents) {
    const key = `${e.type}-${e.date}-${e.headline}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        type: e.type,
        date: e.date,
        headline: e.headline,
        sources: [e.source],
        sourceCount: 1,
      });
    } else {
      const existing = map.get(key)!;
      existing.sources.push(e.source);
      existing.sourceCount++;
    }
  }
  return Array.from(map.values());
}

export async function assessMacroImpact(event: MacroEvent, holdings: string[], gptPromptVersion: string): Promise<MacroAssessment> {
  // TODO: Integrate with GPT/LLM backend, persist prompt version
  // For now, return a stub (no mock data, just contract)
  return {
    eventId: event.id,
    gptPromptVersion,
    impactSummary: '',
    assetImpacts: holdings.map(asset => ({ asset, estimate: 0, rationale: '' })),
  };
} 