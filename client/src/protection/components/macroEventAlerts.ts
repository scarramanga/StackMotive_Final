// Block 43: Macro Event Alerts
export interface MacroEvent {
  type: 'cpi' | 'gdp' | 'rate' | 'war' | 'sanction' | 'election' | 'other';
  description: string;
  timestamp: string;
  severity: number; // 0-1
  region?: string;
}

export interface UserMacroAlertSettings {
  sensitivity: number; // 0-1
  regions?: string[];
  eventTypes?: MacroEvent['type'][];
}

export interface MacroAlertResult {
  event: MacroEvent;
  shouldReassess: boolean;
  rationale: string;
  overlayAdjustments?: string[];
  rebalancePrompt?: string;
}

export function macroEventAlerts(
  events: MacroEvent[],
  userSettings: UserMacroAlertSettings,
  strategyExposure: Record<string, number>
): MacroAlertResult[] {
  // Filter and score events
  return events.map(event => {
    const matchesRegion = !userSettings.regions || !event.region || userSettings.regions.includes(event.region);
    const matchesType = !userSettings.eventTypes || userSettings.eventTypes.includes(event.type);
    const exposure = strategyExposure[event.type] || 0;
    const severityScore = event.severity * (userSettings.sensitivity || 1) * (matchesRegion ? 1 : 0.5) * (matchesType ? 1 : 0.5);
    const shouldReassess = severityScore > 0.5 || exposure > 0.5;
    let rationale = `Event: ${event.description}. Severity: ${(event.severity*100).toFixed(0)}%.`;
    if (exposure > 0.5) rationale += ` High exposure to ${event.type}.`;
    if (shouldReassess) rationale += ' Strategy reassessment recommended.';
    // Overlay/asset suggestions
    const overlayAdjustments = shouldReassess ? [`Review overlays for ${event.type}`] : undefined;
    const rebalancePrompt = shouldReassess ? 'Consider rebalancing portfolio.' : undefined;
    return {
      event,
      shouldReassess,
      rationale,
      overlayAdjustments,
      rebalancePrompt,
    };
  });
} 