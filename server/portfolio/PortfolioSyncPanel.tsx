// Block 7: PortfolioSyncPanel UI
import React, { useRef, useState } from 'react';
import { usePortfolioSync } from '../../hooks/usePortfolioSync';
import { useSessionStore } from '../../store/session';

export default function PortfolioSyncPanel() {
  const user = useSessionStore(s => s.user);
  const { portfolio, errors, fieldMapping, setFieldMapping, handleCSVUpload, syncJob } = usePortfolioSync();
  const [csv, setCSV] = useState('');
  const [showMapping, setShowMapping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCSV(ev.target?.result as string);
      setShowMapping(true);
    };
    reader.readAsText(file);
  }

  function onImport() {
    if (!user) return;
    handleCSVUpload(csv, fieldMapping, user.id);
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio Sync (CSV/API)</h1>
      <input type="file" accept=".csv" ref={fileInput} onChange={onFileChange} className="mb-4" />
      {showMapping && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Field Mapping</h2>
          {/* TODO: Add auto-detect and manual override UI */}
          <p className="text-sm text-gray-500">Field mapping configuration goes here.</p>
        </div>
      )}
      <button className="btn btn-primary mb-4" onClick={onImport}>Import Portfolio</button>
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-100 rounded">
          <b>Validation Errors:</b>
          <ul className="text-xs mt-2">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {portfolio && (
        <div className="mb-4 p-4 bg-green-50 rounded">
          <h2 className="font-semibold mb-2">Preview</h2>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(portfolio, null, 2)}</pre>
        </div>
      )}
      {syncJob && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h2 className="font-semibold mb-2">Sync Job</h2>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(syncJob, null, 2)}</pre>
        </div>
      )}
    </div>
  );
} 