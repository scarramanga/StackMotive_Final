import React, { useState } from 'react';
import { useSignalArchive, SignalArchiveEntry } from '../../hooks/useSignalArchive';

const PAGE_SIZE = 5;
const SOURCE_COLORS = {
  GPT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Indicator: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  User: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

function confidenceColor(conf: number) {
  if (conf > 0.85) return 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-200';
  if (conf > 0.7) return 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-200';
  return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-200';
}

const unique = (arr: string[]) => Array.from(new Set(arr));

const SignalArchive: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const dateRange = dateFrom && dateTo ? [dateFrom, dateTo] as [string, string] : undefined;
  const data = useSignalArchive({ dateRange, symbol: symbol || undefined, type: type || undefined });

  const paged = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  // For filter dropdowns
  const allSymbols = unique(data.map(d => d.symbol));
  const allTypes = unique(data.map(d => d.signalType));

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Signal Archive & Notification Log</h2>
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium mb-1">Symbol</label>
          <select className="border rounded px-2 py-1" value={symbol} onChange={e => { setSymbol(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Signal Type</label>
          <select className="border rounded px-2 py-1" value={type} onChange={e => { setType(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">From</label>
          <input type="date" className="border rounded px-2 py-1" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">To</label>
          <input type="date" className="border rounded px-2 py-1" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-1 text-left">Timestamp</th>
              <th className="p-1">Symbol</th>
              <th className="p-1">Signal Type</th>
              <th className="p-1">Confidence</th>
              <th className="p-1">Action</th>
              <th className="p-1">Source</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((entry, i) => (
              <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-1 text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</td>
                <td className="p-1 font-mono">{entry.symbol}</td>
                <td className="p-1">{entry.signalType}</td>
                <td className="p-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${confidenceColor(entry.confidence)}`}>{Math.round(entry.confidence * 100)}%</span>
                </td>
                <td className="p-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${entry.action === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : entry.action === 'sell' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{entry.action.toUpperCase()}</span>
                </td>
                <td className="p-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SOURCE_COLORS[entry.source]}`}>{entry.source}</span>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-400">No signals found for filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-gray-500">Page {page + 1} of {totalPages || 1}</span>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default SignalArchive; 