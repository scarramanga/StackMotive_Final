// Block 71: API Sync Health Monitor
import React from 'react';
import type { SyncJob } from '../../types/portfolio';

interface SyncHealthMonitorProps {
  syncJob: SyncJob | null;
  onForceResync: () => void;
}

const getStatus = (job: SyncJob | null) => {
  if (!job) return { color: 'gray', label: 'No Sync', tooltip: 'No sync has occurred yet.' };
  if (job.status === 'success') return { color: 'green', label: 'Healthy', tooltip: `Last sync: ${new Date(job.finishedAt || job.startedAt).toLocaleString()}` };
  if (job.status === 'pending') return { color: 'yellow', label: 'Pending', tooltip: `Sync in progress since ${new Date(job.startedAt).toLocaleString()}` };
  if (job.status === 'error') return { color: 'red', label: 'Error', tooltip: `Last error: ${job.errorLog || 'Unknown error'} (at ${new Date(job.finishedAt || job.startedAt).toLocaleString()})` };
  return { color: 'gray', label: 'Unknown', tooltip: 'Unknown sync status.' };
};

const SyncHealthMonitor: React.FC<SyncHealthMonitorProps> = ({ syncJob, onForceResync }) => {
  const status = getStatus(syncJob);
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded shadow border w-fit">
      <span
        className={`w-3 h-3 rounded-full inline-block ${
          status.color === 'green' ? 'bg-green-500' :
          status.color === 'yellow' ? 'bg-yellow-400' :
          status.color === 'red' ? 'bg-red-500' : 'bg-gray-400'
        }`}
        title={status.tooltip}
        aria-label={status.tooltip}
      />
      <span className="font-semibold text-sm" title={status.tooltip}>{status.label}</span>
      <button
        className="ml-4 px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
        onClick={onForceResync}
        aria-label="Force Resync"
      >
        Force Resync
      </button>
    </div>
  );
};

export default SyncHealthMonitor; 