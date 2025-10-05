import React, { useState } from 'react';
import { useNotificationStore, Notification, NotificationType, NotificationSeverity } from '../../store/notifications';

// Block 26: Notification Center
const typeLabels: Record<NotificationType, string> = {
  macro: 'Macro',
  rebalance: 'Rebalance',
  performance: 'Performance',
  custom: 'Custom',
  signal: 'Signal',
  watchlist: 'Watchlist',
};
const severityColors: Record<NotificationSeverity, string> = {
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};

export const NotificationCenter: React.FC = () => {
  const { notifications, markAsRead, clearNotification, digestMode, setDigestMode } = useNotificationStore();
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  return (
    <section className="rounded-xl bg-card dark:bg-card/80 p-4 shadow-lg border border-border max-w-2xl mx-auto my-6 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Notification Center</h2>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={digestMode}
            onChange={e => setDigestMode(e.target.checked)}
            className="accent-primary"
          />
          Daily Digest
        </label>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          className={`px-2 py-1 rounded text-xs font-medium ${filter === 'all' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
          onClick={() => setFilter('all')}
        >All</button>
        {Object.entries(typeLabels).map(([type, label]) => (
          <button
            key={type}
            className={`px-2 py-1 rounded text-xs font-medium ${filter === type ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
            onClick={() => setFilter(type as NotificationType)}
          >{label}</button>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {filtered.length === 0 && (
          <li className="text-xs text-muted-foreground py-6 text-center">No notifications yet.</li>
        )}
        {filtered.map(n => (
          <li key={n.id} className={`flex items-start gap-3 py-3 ${n.read ? 'opacity-60' : ''}`}>
            <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
              n.severity === 'success' ? 'bg-green-500' :
              n.severity === 'error' ? 'bg-red-500' :
              n.severity === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${severityColors[n.severity]} px-2 py-0.5 rounded`}>{typeLabels[n.type]}</span>
                <span className="text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</span>
              </div>
              <div className="text-sm font-medium break-words">{n.message}</div>
              {n.source && <div className="text-xs text-muted-foreground">Source: {n.source}</div>}
            </div>
            <div className="flex flex-col gap-1 ml-2">
              {!n.read && (
                <button
                  className="text-xs text-primary underline"
                  onClick={() => markAsRead(n.id)}
                  aria-label="Mark as read"
                >Read</button>
              )}
              <button
                className="text-xs text-destructive underline"
                onClick={() => clearNotification(n.id)}
                aria-label="Clear notification"
              >Clear</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}; 