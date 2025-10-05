// Block 8: useMacroMonitor Hook
import { useEffect, useState } from 'react';
import { useSessionStore } from '../store/session';
import { fetchMacroFeeds, normalizeMacroEvents, assessMacroImpact } from '../engines/MacroMonitorEngine';
import type { MacroEvent, MacroAssessment, MacroAlert } from '../types/macro';

export function useMacroMonitor({ holdings, gptPromptVersion }: { holdings: string[]; gptPromptVersion: string }) {
  const user = useSessionStore(s => s.user);
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [alerts, setAlerts] = useState<MacroAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const isPremium = user?.isPremium;

  useEffect(() => {
    if (!isPremium) return;
    setLoading(true);
    fetchMacroFeeds().then(raw => {
      const normalized = normalizeMacroEvents(raw);
      setEvents(normalized);
      Promise.all(
        normalized.map(event =>
          assessMacroImpact(event, holdings, gptPromptVersion).then(assessment => ({
            id: `${event.id}-${Date.now()}`,
            event,
            assessment,
            timestamp: new Date().toISOString(),
            dismissed: false,
            snoozed: false,
          }))
        )
      ).then(setAlerts).finally(() => setLoading(false));
    });
    // Poll every 10 minutes
    const interval = setInterval(() => {
      fetchMacroFeeds().then(raw => {
        const normalized = normalizeMacroEvents(raw);
        setEvents(normalized);
        Promise.all(
          normalized.map(event =>
            assessMacroImpact(event, holdings, gptPromptVersion).then(assessment => ({
              id: `${event.id}-${Date.now()}`,
              event,
              assessment,
              timestamp: new Date().toISOString(),
              dismissed: false,
              snoozed: false,
            }))
          )
        ).then(setAlerts);
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [holdings, gptPromptVersion, isPremium]);

  return { events, alerts, loading };
} 