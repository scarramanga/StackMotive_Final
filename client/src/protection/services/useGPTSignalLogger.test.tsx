import React from 'react';
import { renderHook } from '@testing-library/react';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import { useGPTSignalLogger } from './useGPTSignalLogger';

test('useGPTSignalLogger returns noop when vault is null', () => {
  const { result } = renderHook(() => useGPTSignalLogger(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <PortfolioProvider>{children}</PortfolioProvider>
    )
  });

  expect(typeof result.current.logGPTSignalForSessionVault).toBe('function');
});
