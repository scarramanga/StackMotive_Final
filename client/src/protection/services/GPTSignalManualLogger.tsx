// Block 92 Implementation
import React, { useState } from 'react';
import { useGPTSignalLogger } from '../../hooks/useGPTSignalLogger';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface FormState {
  asset: string;
  type: 'long' | 'short' | 'alert';
  confidence: number;
  source: string;
}

const initialState: FormState = {
  asset: '',
  type: 'long',
  confidence: 50,
  source: 'gpt',
};

const GPTSignalManualLogger: React.FC = () => {
  // Block 92 Implementation
  const { logGPTSignalForSessionVault } = useGPTSignalLogger();
  const { activeVaultId } = usePortfolio();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (typeof window === 'undefined' || !activeVaultId) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: name === 'confidence' ? Math.max(0, Math.min(100, Number(value))) : value,
    }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    if (!form.asset.trim()) {
      setError('Asset is required.');
      setSubmitting(false);
      return;
    }
    if (form.confidence < 0 || form.confidence > 100) {
      setError('Confidence must be between 0 and 100.');
      setSubmitting(false);
      return;
    }
    try {
      await logGPTSignalForSessionVault({
        asset: form.asset.trim(),
        type: form.type,
        confidence: form.confidence / 100,
        source: form.source.trim() || 'gpt',
        timestamp: new Date().toISOString(),
      });
      setSuccess(true);
      setForm(initialState);
    } catch (err) {
      setError('Failed to log signal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col gap-4 mt-6"
      onSubmit={handleSubmit}
      aria-label="Manual GPT Signal Logger"
    >
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Manual GPT Signal Logger</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="asset" className="font-medium text-gray-700 dark:text-gray-200">
          Asset <span className="text-red-500">*</span>
        </label>
        <input
          id="asset"
          name="asset"
          type="text"
          value={form.asset}
          onChange={handleChange}
          className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          required
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="type" className="font-medium text-gray-700 dark:text-gray-200">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={form.type}
          onChange={handleChange}
          className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={submitting}
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
          <option value="alert">Alert</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confidence" className="font-medium text-gray-700 dark:text-gray-200">
          Confidence (0–100)
        </label>
        <input
          id="confidence"
          name="confidence"
          type="number"
          min={0}
          max={100}
          step={1}
          value={form.confidence}
          onChange={handleChange}
          className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          required
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="source" className="font-medium text-gray-700 dark:text-gray-200">
          Source
        </label>
        <input
          id="source"
          name="source"
          type="text"
          value={form.source}
          onChange={handleChange}
          className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={submitting}
        />
      </div>
      {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
      {success && <div className="text-green-600 text-sm" role="status">Signal logged successfully.</div>}
      <button
        type="submit"
        className="btn btn-primary w-full mt-2 disabled:opacity-50"
        disabled={submitting || !form.asset || form.confidence < 0 || form.confidence > 100}
      >
        {submitting ? 'Logging...' : 'Log Signal'}
      </button>
    </form>
  );
};

export default GPTSignalManualLogger; 