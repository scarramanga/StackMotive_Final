// Block 88 Implementation
import React from 'react';
import { Signal } from '../../hooks/useSignalAPI';
import { formatDistanceToNow } from 'date-fns';
import { ConfidenceBadge } from './ConfidenceBadge';

interface GPTSignalCardProps {
  signal?: Signal | null;
}

const getTypeBadgeColor = (type: string | undefined) => {
  if (!type) return 'bg-gray-200 text-gray-700';
  switch (type.toLowerCase()) {
    case 'buy':
      return 'bg-green-100 text-green-800';
    case 'sell':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const getConfidenceColor = (confidence?: number) => {
  if (confidence === undefined) return 'text-gray-500';
  if (confidence > 0.7) return 'text-green-600';
  if (confidence >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
};

const GPTSignalCard: React.FC<GPTSignalCardProps> = ({ signal }) => {
  // Block 88 Implementation
  if (!signal) return null;

  const { symbol, signal_type, confidence, source, timestamp } = signal;

  return (
    <div className="rounded-xl shadow bg-white dark:bg-gray-900 p-4 flex flex-col gap-2 w-full max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{symbol}</span>
        {signal_type && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getTypeBadgeColor(signal_type)}`}>{signal_type}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Confidence</span>
        <ConfidenceBadge score={Math.round((confidence ?? 0) * 100)} />
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Source: {source || 'gpt'}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : ''}
      </div>
    </div>
  );
};

export default GPTSignalCard; 