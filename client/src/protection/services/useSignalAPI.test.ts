import { renderHook } from '@testing-library/react-hooks';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import { useSignalAPI } from '@/hooks/useSignalAPI';

test('useSignalAPI returns stable methods with null vault', () => {
  const { result } = renderHook(() => useSignalAPI(), {
    wrapper: ({ children }) => (
      <PortfolioProvider>{children}</PortfolioProvider>
    )
  });

  expect(typeof result.current.fetchSignalsForSessionVault).toBe('function');
  expect(typeof result.current.addSignalForSessionVault).toBe('function');
  expect(typeof result.current.deleteSignalsForSessionVault).toBe('function');
}); 