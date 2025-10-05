import React, { useState } from 'react';
import { TileAction } from '../tiles/AssetSignalGrid';
import { motion, useReducedMotion } from 'framer-motion';

export interface SignalTileProps {
  type: 'technical' | 'macro' | 'news' | 'social' | 'earnings';
  title: string;
  value: string | number;
  confidence: number; // 0 to 1
  rationale?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  onAction?: (action: TileAction) => void;
  isFollowed?: boolean;
  asset: string;
  onTileAction?: (asset: string, action: TileAction) => void;
}

const confidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.5) return 'bg-yellow-400';
  if (confidence >= 0.2) return 'bg-orange-400';
  return 'bg-red-500';
};

const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const norm = (v: number) => ((v - min) / (max - min || 1)) * 24;
  const d = points.map((v, i) => `${(i / (points.length - 1)) * 48},${24 - norm(v)}`).join(' ');
  return (
    <svg width={48} height={24} className="block mx-auto my-1">
      <polyline
        fill="none"
        stroke="#10B981"
        strokeWidth="2"
        points={d}
      />
    </svg>
  );
};

export const SignalTile: React.FC<SignalTileProps> = ({
  type,
  title,
  value,
  confidence,
  rationale,
  icon,
  sparkline,
  onAction,
  isFollowed,
  asset,
  onTileAction,
}) => {
  const [showRationale, setShowRationale] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Show toolbar on hover, focus, or tap (mobile)
  const showToolbar = toolbarOpen || showRationale;

  return (
    <div
      tabIndex={0}
      className="group relative rounded-xl bg-card shadow-md p-4 flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.03] focus:scale-[1.03] cursor-pointer border border-border dark:bg-card/80 dark:shadow-lg outline-none"
      aria-label={`${title} signal tile`}
      onMouseEnter={() => setShowRationale(true)}
      onMouseLeave={() => setShowRationale(false)}
      onFocus={() => setShowRationale(true)}
      onBlur={() => setShowRationale(false)}
      onTouchStart={() => setToolbarOpen(v => !v)}
      onClick={() => setToolbarOpen(v => !v)}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
        <span className="font-semibold text-base truncate flex-1">{title}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground font-medium capitalize">{type}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold text-primary">{value}</span>
        <div className="flex-1 ml-4 flex items-center">
          <div className="w-full h-2 rounded bg-border dark:bg-border/40 overflow-hidden">
            <div
              className={`h-2 rounded ${confidenceColor(confidence)}`}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="ml-2 text-xs font-medium text-muted-foreground">{Math.round(confidence * 100)}%</span>
        </div>
      </div>
      {sparkline && <Sparkline points={sparkline} />}
      {/* Inline Action Toolbar */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        animate={showToolbar ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
        className="flex gap-2 mt-2 justify-center pointer-events-auto"
        aria-label="Signal actions toolbar"
      >
        <button
          type="button"
          aria-label="Open GPT Panel"
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent focus-visible:ring focus:outline-none transition-colors"
          onClick={e => { e.stopPropagation(); onAction && onAction('openGPT'); onTileAction && onTileAction(asset, 'openGPT'); }}
        >
          GPT
        </button>
        <button
          type="button"
          aria-label="Show Details"
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent focus-visible:ring focus:outline-none transition-colors"
          onClick={e => { e.stopPropagation(); onAction && onAction('showDetails'); onTileAction && onTileAction(asset, 'showDetails'); }}
        >
          Details
        </button>
        <button
          type="button"
          aria-label={isFollowed ? 'Unfollow' : 'Follow'}
          className={`text-xs px-2 py-1 rounded ${isFollowed ? 'bg-primary text-primary-foreground' : 'bg-muted'} hover:bg-accent focus-visible:ring focus:outline-none transition-colors`}
          onClick={e => { e.stopPropagation(); onTileAction && onTileAction(asset, 'follow'); }}
        >
          {isFollowed ? '★' : '☆'}
        </button>
      </motion.div>
      {rationale && (
        <div
          className={`absolute left-0 right-0 bottom-0 z-20 p-3 bg-popover text-xs rounded-b-xl shadow-lg border-t border-border transition-opacity duration-200 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 opacity-0 ${showRationale ? 'opacity-100' : ''} dark:bg-popover/90`}
          style={{ minHeight: '2.5rem' }}
        >
          {rationale}
        </div>
      )}
    </div>
  );
}; 