import React, { useId } from 'react';

interface Props {
  data: {
    asset: string;
    strength: number; // -1 to 1
  }[];
}

// Helper: map strength [-1,1] to color (red to green)
function getStrengthColor(strength: number, highContrast = false) {
  // Clamp
  const s = Math.max(-1, Math.min(1, strength));
  if (highContrast) {
    // Use only 3 colors for high contrast
    if (s > 0.33) return '#008000'; // green
    if (s < -0.33) return '#B22222'; // red
    return '#FFD700'; // yellow
  }
  // Interpolate red-yellow-green
  const r = s < 0 ? 255 : Math.round(255 - 255 * s);
  const g = s > 0 ? 180 : Math.round(180 + 75 * s);
  const b = 60;
  return `rgb(${r},${g},${b})`;
}

export const SignalHeatmap: React.FC<Props & { highContrast?: boolean }> = ({ data, highContrast = false }) => {
  const tooltipId = useId();
  // Responsive grid: min 3 cols, up to 6
  const colCount = Math.min(6, Math.max(3, data.length < 6 ? data.length : 6));

  return (
    <div
      className={`grid gap-2 sm:gap-3 md:gap-4`} 
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
      }}
      role="list"
      aria-label="Signal heatmap"
    >
      {data.map(({ asset, strength }, i) => (
        <div
          key={asset}
          tabIndex={0}
          role="listitem"
          aria-describedby={`${tooltipId}-${i}`}
          className={`relative aspect-square rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer transition-colors`}
          style={{
            background: getStrengthColor(strength, highContrast),
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* Tooltip */}
          <div
            id={`${tooltipId}-${i}`}
            className="pointer-events-none absolute z-20 left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity shadow-lg"
            role="tooltip"
          >
            <span className="font-semibold">{asset}</span>: {strength > 0 ? '+' : ''}{(strength * 100).toFixed(0)}%
          </div>
          {/* Visually hidden label for screen readers */}
          <span className="sr-only">{asset}: {strength > 0 ? '+' : ''}{(strength * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}; 