import React, { useState, useEffect } from 'react';
import { rotationPresets, RotationPreset } from '../../config/rotationPresets';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { useStrategyOverlay } from '../../hooks/useStrategyOverlay';
import { auditAdvisorAction } from '../../lib/advisorAudit';

// Block 35: Rotation Mode Presets — Preferences Panel
export const PreferencesPanel: React.FC = () => {
  const { preferences, setPreference } = useUserPreferencesStore();
  const { getOverlaySuggestions } = useStrategyOverlay();
  const [selectedPreset, setSelectedPreset] = useState<RotationPreset | null>(null);

  // Hydrate from user preferences
  useEffect(() => {
    if (preferences.rotationPresetName) {
      const preset = rotationPresets.find(p => p.name === preferences.rotationPresetName);
      if (preset) setSelectedPreset(preset);
    }
  }, [preferences.rotationPresetName]);

  // Handle preset change
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = rotationPresets.find(p => p.name === e.target.value) || null;
    setSelectedPreset(preset);
    setPreference('rotationPresetName', preset?.name || '');
    // TODO: Integrate with overlay engine using real signals when available
    // Log usage
    auditAdvisorAction({
      id: `rotation-preset-select-${preset?.name || 'none'}-${Date.now()}`,
      tab: 'rebalance',
      asset: undefined,
      action: 'select-rotation-preset',
      rationale: `User selected rotation preset: ${preset?.name}`,
      markdown: '',
      timestamp: new Date().toISOString(),
      completed: true,
      accepted: true,
      declined: false,
    });
  };

  return (
    <section className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-2xl mx-auto my-6 transition-colors" aria-labelledby="preferences-panel-title">
      <h2 id="preferences-panel-title" className="text-lg font-semibold mb-2">Preferences</h2>
      <div className="mb-4">
        <label htmlFor="rotation-preset-select" className="block text-sm font-medium mb-1">Rotation Mode Preset</label>
        <select
          id="rotation-preset-select"
          className="w-full rounded border px-3 py-2 text-sm"
          value={selectedPreset?.name || ''}
          onChange={handlePresetChange}
        >
          <option value="">Select a preset…</option>
          {rotationPresets.map(preset => (
            <option key={preset.name} value={preset.name}>{preset.name} — {preset.description}</option>
          ))}
        </select>
      </div>
      {selectedPreset && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Current Preset:</span> {selectedPreset.name}
        </div>
      )}
    </section>
  );
}; 