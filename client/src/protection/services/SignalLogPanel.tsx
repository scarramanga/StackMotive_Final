import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSignalLogStore } from '../../store/signalLog';
import { DatePicker } from '../ui/date-picker';
import { MultiSelect } from '../ui/multi-select';
import { TimelineView } from '../ui/TimelineView';
import { DataTable } from '../ui/data-table';
import { TagInput } from '../ui/TagInput';
import { useUserSettings } from '../../contexts/UserSettingsContext';
import { useDeepLink } from '../../hooks/useDeepLink';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { CSVLink } from 'react-csv';
import { format, parseISO } from 'date-fns';
import { useInView } from 'react-intersection-observer';
import { fetchSignalLog, exportSignalLogCSV } from '../../lib/advisorAudit';
import { detectAnomalies } from '../../utils/anomalyDetection';
import { ProvenanceTag } from '../ui/ProvenanceTag';

// --- Panel Component ---
const SignalLogPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    filters,
    setFilters,
    logEntries,
    fetchMore,
    hasMore,
    loading,
    exportCSV,
    setAnnotation,
    setTag,
    timelineMode,
    setTimelineMode,
    anomalyMap,
    subscribeRealtime,
    unsubscribeRealtime,
  } = useSignalLogStore();
  const { timezone, locale } = useUserSettings();
  const { ref, inView } = useInView({ threshold: 0 });
  const [csvData, setCSVData] = useState<string | null>(null);
  const [csvAuditFooter, setCSVAuditFooter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const deepLink = useDeepLink();

  // Infinite scroll fetch
  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchMore();
    }
  }, [inView, hasMore, loading, fetchMore]);

  // Real-time updates (polling)
  useEffect(() => {
    subscribeRealtime();
    return () => unsubscribeRealtime();
  }, [subscribeRealtime, unsubscribeRealtime]);

  // CSV export with audit footer
  const handleExport = useCallback(async () => {
    const { csv, auditFooter } = await exportSignalLogCSV(filters);
    setCSVData(csv);
    setCSVAuditFooter(auditFooter);
  }, [filters]);

  // Row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Tagging/annotation
  const handleTag = (id: string, tag: string) => setTag(id, tag);
  const handleAnnotation = (id: string, note: string) => setAnnotation(id, note);

  // Filter/search UI
  return (
    <section aria-label={t('Signal History Log')} className="w-full max-w-5xl mx-auto p-2 md:p-6">
      <header className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 mb-4">
        <MultiSelect
          label={t('Asset')}
          options={filters.assetOptions}
          value={filters.assets}
          onChange={assets => setFilters({ ...filters, assets })}
          aria-label={t('Filter by asset')}
        />
        <MultiSelect
          label={t('Overlay')}
          options={filters.overlayOptions}
          value={filters.overlays}
          onChange={overlays => setFilters({ ...filters, overlays })}
          aria-label={t('Filter by overlay')}
        />
        <MultiSelect
          label={t('Trigger')}
          options={filters.triggerOptions}
          value={filters.triggers}
          onChange={triggers => setFilters({ ...filters, triggers })}
          aria-label={t('Filter by trigger')}
        />
        <DatePicker
          value={filters.dateRange}
          onChange={dateRange => setFilters({ ...filters, dateRange })}
          aria-label={t('Filter by date range')}
        />
        <input
          type="search"
          className="input input-bordered"
          placeholder={t('Search rationale, notes, agent...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={t('Free-text search')}
        />
        <Button onClick={handleExport} aria-label={t('Export CSV')}>{t('Export CSV')}</Button>
        {csvData && (
          <CSVLink data={csvData} filename="signal_log.csv">
            {t('Download')}
          </CSVLink>
        )}
        <Button onClick={() => setTimelineMode(!timelineMode)} aria-pressed={timelineMode} aria-label={t('Toggle timeline/table view')}>
          {timelineMode ? t('Table View') : t('Timeline View')}
        </Button>
      </header>
      <main>
        {timelineMode ? (
          <TimelineView
            entries={logEntries}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
            onTag={handleTag}
            onAnnotate={handleAnnotation}
            anomalyMap={anomalyMap}
            search={search}
            timezone={timezone}
            locale={locale}
            deepLink={deepLink}
          />
        ) : (
          <DataTable
            data={logEntries}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
            onTag={handleTag}
            onAnnotate={handleAnnotation}
            anomalyMap={anomalyMap}
            search={search}
            timezone={timezone}
            locale={locale}
            deepLink={deepLink}
            aria-label={t('Signal Log Table')}
          />
        )}
        {loading && <div className="text-center p-4" aria-live="polite">{t('Loading...')}</div>}
        <div ref={ref} />
      </main>
      {csvAuditFooter && <footer className="text-xs text-muted-foreground mt-4">{csvAuditFooter}</footer>}
    </section>
  );
};

export default SignalLogPanel; 