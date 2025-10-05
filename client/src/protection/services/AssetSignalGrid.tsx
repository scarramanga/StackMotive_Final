import React from 'react';
import { PageFade } from '../animation/PageFade';
import { SignalTileProps, SignalTile } from '../ui/SignalTile';

export type TileAction = 'openGPT' | 'showDetails' | 'follow';

export interface AssetSignalGridSignal extends SignalTileProps {
  sparkline?: number[];
  asset: string;
}

interface AssetSignalGridProps {
  assets: string[];
  signals: Record<string, AssetSignalGridSignal>;
  onTileClick?: (asset: string) => void;
  onTileAction?: (asset: string, action: TileAction) => void;
  sortBy?: 'confidence' | 'signal' | 'name';
  filterAssets?: string[];
  className?: string;
  followedSignals?: Set<string>;
}

export const AssetSignalGrid: React.FC<AssetSignalGridProps> = ({
  assets,
  signals,
  onTileClick,
  onTileAction,
  sortBy,
  filterAssets,
  className,
  followedSignals,
}) => {
  // Filter and sort assets
  let filtered = assets;
  if (filterAssets && filterAssets.length > 0) {
    filtered = filtered.filter(a => filterAssets.includes(a));
  }
  if (sortBy) {
    filtered = [...filtered].sort((a, b) => {
      const sa = signals[a];
      const sb = signals[b];
      if (sortBy === 'confidence') return (sb.confidence ?? 0) - (sa.confidence ?? 0);
      if (sortBy === 'signal') return (sa.title || '').localeCompare(sb.title || '');
      if (sortBy === 'name') return a.localeCompare(b);
      return 0;
    });
  }

  return (
    <PageFade className={className}>
      <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
        {filtered.map(asset => (
          <button
            key={asset}
            type="button"
            className="text-left focus:outline-none active:scale-[0.98] transition-transform"
            onClick={onTileClick ? () => onTileClick(asset) : undefined}
            tabIndex={0}
          >
            <SignalTile
              {...signals[asset]}
              isFollowed={!!(followedSignals && followedSignals.has(asset))}
              onTileAction={onTileAction}
            />
          </button>
        ))}
      </div>
    </PageFade>
  );
}; 