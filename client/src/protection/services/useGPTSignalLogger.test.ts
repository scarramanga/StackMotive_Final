import { renderHook } from '@testing-library/react-hooks';
import { PortfolioProvider } from '@/contexts/PortfolioContext';
import { useGPTSignalLogger } from '@/hooks/useGPTSignalLogger';

test('useGPTSignalLogger returns noop when vault is null', () => {
  const { result } = renderHook(() => useGPTSignalLogger(), {
    wrapper: ({ children }) => (
      <PortfolioProvider>{children}</PortfolioProvider>
    )
  });

  expect(typeof result.current.logGPTSignalForSessionVault).toBe('function');
}); 