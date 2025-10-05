import { useState, useEffect, useCallback } from 'react';
import { getFollowedSignals, saveFollowedSignals } from '../utils/persistence';

export type SignalPanelType = 'gpt' | 'details' | null;

export interface UseSignalPanel {
  selectedSignal: string | null;
  panelType: SignalPanelType;
  openPanel: (signal: string, type: Exclude<SignalPanelType, null>) => void;
  closePanel: () => void;
  followedSignals: Set<string>;
  toggleFollow: (signal: string) => void;
  isPersistingFollow: boolean;
  persistError: string | null;
  loading: boolean;
  error: string | null;
}

const MOCK_USER_ID = 'test-user';

export function useSignalPanel(): UseSignalPanel {
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [panelType, setPanelType] = useState<SignalPanelType>(null);
  const [followedSignals, setFollowedSignals] = useState<Set<string>>(new Set());
  const [isPersistingFollow, setIsPersistingFollow] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load followed signals on mount
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const signals = await getFollowedSignals(MOCK_USER_ID);
        if (!ignore) setFollowedSignals(new Set(signals));
      } catch (err: any) {
        setError('Failed to load followed signals.');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  // Save followed signals to backend and localStorage
  const saveFollowed = useCallback(async (signals: string[]) => {
    setIsPersistingFollow(true);
    setPersistError(null);
    try {
      await saveFollowedSignals(MOCK_USER_ID, signals);
    } catch (err: any) {
      setPersistError('Failed to persist followed signals. Changes saved locally.');
    } finally {
      setIsPersistingFollow(false);
    }
  }, []);

  const openPanel = (signal: string, type: Exclude<SignalPanelType, null>) => {
    setSelectedSignal(signal);
    setPanelType(type);
  };

  const closePanel = () => {
    setSelectedSignal(null);
    setPanelType(null);
  };

  const toggleFollow = (signal: string) => {
    setFollowedSignals(prev => {
      const next = new Set(prev);
      next.has(signal) ? next.delete(signal) : next.add(signal);
      // Optimistically persist
      saveFollowed(Array.from(next));
      return next;
    });
  };

  return {
    selectedSignal,
    panelType,
    openPanel,
    closePanel,
    followedSignals,
    toggleFollow,
    isPersistingFollow,
    persistError,
    loading,
    error,
  };
} 