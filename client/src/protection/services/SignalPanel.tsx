// Block 80 Implementation
import React, { useEffect, useState } from 'react';
import { useSignalAPI, Signal } from '../../hooks/useSignalAPI';
import { usePortfolio } from '../../contexts/PortfolioContext';

const SignalPanel: React.FC = () => {
  // Block 80 Implementation
  const { fetchSignalsForSessionVault, deleteSignalsForSessionVault } = useSignalAPI();
  const { activeVaultId } = usePortfolio();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      if (typeof window === 'undefined' || !activeVaultId) {
        setSignals([]);
        setLoading(false);
        return;
      }
      const data = await fetchSignalsForSessionVault();
      if (!ignore) setSignals(data);
      setLoading(false);
    }
    load();
    return () => { ignore = true; };
  }, [fetchSignalsForSessionVault, activeVaultId]);

  if (typeof window === 'undefined' || !activeVaultId) return null;

  const handleDeleteAll = async () => {
    await deleteSignalsForSessionVault();
    setSignals([]);
  };

  return (
    <section className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Signals</h2>
        {signals.length > 0 && (
          <button
            className="px-3 py-1 text-xs rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
            onClick={handleDeleteAll}
            aria-label="Delete all signals"
          >
            Delete All
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-gray-500">Loading signals...</div>
      ) : signals.length === 0 ? (
        <div className="text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <span className="block text-3xl mb-2">📡</span>
          <span>No signals for this Vault.</span>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {signals.map(signal => (
            <li key={signal.signal_id} className="py-4 flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-base">
                  {signal.symbol}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold uppercase">
                  {signal.signal_type}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {signal.confidence !== undefined ? `${Math.round((signal.confidence * 100))}%` : 'N/A'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {signal.source || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {signal.timestamp ? new Date(signal.timestamp).toLocaleString() : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SignalPanel; 