// Block 7: usePortfolioSync Hook
import { useState } from 'react';
import { parseCSV, validatePortfolio, normalizePortfolio, logSyncJob } from '../engines/PortfolioSyncEngine';
import type { NormalizedPortfolio, FieldMapping, SyncJob } from '../types/portfolio';

export function usePortfolioSync() {
  const [portfolio, setPortfolio] = useState<NormalizedPortfolio | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);

  function handleCSVUpload(csv: string, mapping: FieldMapping, userId: string) {
    const data = parseCSV(csv, mapping);
    const validationErrors = validatePortfolio(data);
    if (validationErrors.length) {
      setErrors(validationErrors);
      setPortfolio(null);
      setSyncJob(null);
      logSyncJob({
        id: `${userId}-${Date.now()}`,
        userId,
        startedAt: new Date().toISOString(),
        source: 'csv',
        status: 'error',
        errorLog: validationErrors.join('\n'),
        fieldMapping: mapping,
      });
      return;
    }
    const syncJobId = `${userId}-${Date.now()}`;
    const normalized = normalizePortfolio(data, 'csv', syncJobId);
    setPortfolio(normalized);
    setErrors([]);
    const job: SyncJob = {
      id: syncJobId,
      userId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      source: 'csv',
      status: 'success',
      fieldMapping: mapping,
    };
    setSyncJob(job);
    logSyncJob(job);
  }

  function forceResync() {
    // TODO: Implement real force resync logic
    // For now, just log or set a state
    console.log('Force resync triggered');
  }

  return { portfolio, errors, fieldMapping, setFieldMapping, handleCSVUpload, syncJob, forceResync };
} 