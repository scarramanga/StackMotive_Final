import React from 'react';
import { renderHook } from '@testing-library/react';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import { useSignalAPI } from './useSignalAPI';

test('useSignalAPI returns stable methods with null vault', () => {
  const { result } = renderHook(() => useSignalAPI(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <PortfolioProvider>{children}</PortfolioProvider>
    )
  });

  expect(typeof result.current.fetchSignalsForSessionVault).toBe('function');
  expect(typeof result.current.addSignalForSessionVault).toBe('function');
  expect(typeof result.current.deleteSignalsForSessionVault).toBe('function');
});
