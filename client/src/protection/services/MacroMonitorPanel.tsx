// Block 8: MacroMonitorPanel UI
import React from 'react';
import { useMacroMonitor } from '../../hooks/useMacroMonitor';
import { useSessionStore } from '../../store/session';

export default function MacroMonitorPanel({ holdings, gptPromptVersion }: { holdings: string[]; gptPromptVersion: string }) {
  const user = useSessionStore(s => s.user);
  const isPremium = user?.isPremium;
  const { events, alerts, loading } = useMacroMonitor({ holdings, gptPromptVersion });

  if (!isPremium) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Macro Monitor (Premium Only)</h1>
        <p className="mb-4">Upgrade to unlock macro event monitoring and impact alerts.</p>
        <button className="btn btn-primary">Upgrade Now</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Macro Monitor Agent</h1>
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Recent Macro Events</h2>
        {loading && <div>Loading...</div>}
        {events.length === 0 && !loading && <div className="text-gray-500">No macro events found.</div>}
        {events.map(event => (
          <div key={event.id} className="mb-2 p-3 bg-purple-100 rounded">
            <div className="font-semibold">{event.headline}</div>
            <div className="text-xs text-gray-600">{event.type} — {event.date} — {event.sourceCount} sources</div>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <h2 className="font-semibold mb-2">Impact Alerts</h2>
        {alerts.length === 0 && !loading && <div className="text-gray-500">No macro alerts.</div>}
        {alerts.map(alert => (
          <div key={alert.id} className="mb-2 p-3 bg-pink-200 border-2 border-pink-400 rounded">
            <div className="flex justify-between items-center">
              <div>
                <b>{alert.event.headline}</b>
                <span className="ml-2 text-xs text-gray-600">{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              <button className="btn btn-sm btn-outline ml-2">Dismiss</button>
            </div>
            <div className="text-sm mt-1">{alert.assessment.impactSummary}</div>
            <div className="text-xs text-gray-600 mt-1">Prompt v{alert.assessment.gptPromptVersion}</div>
            <div className="mt-2">
              {alert.assessment.assetImpacts.map(ai => (
                <div key={ai.asset} className="text-xs">
                  <b>{ai.asset}:</b> {ai.estimate} — {ai.rationale}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-xs btn-secondary">Snooze</button>
              <button className="btn btn-xs btn-primary">Take Action</button>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-4">Macro alerts are visually distinct. All events are advisory only.</div>
    </div>
  );
} 