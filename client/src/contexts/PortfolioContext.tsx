import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export interface Vault {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioContextType {
  activeVaultId: string | null;
  setActiveVaultId: (vaultId: string | null) => void;
  vaults: Vault[];
  isLoading: boolean;
  refreshVaults: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVaults = async () => {
    if (!isAuthenticated) {
      setVaults([]);
      setActiveVaultId(null);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/portfolio/vaults', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vaults');
      }

      const data = await response.json();
      setVaults(data.vaults || []);

      if (data.vaults && data.vaults.length > 0 && !activeVaultId) {
        setActiveVaultId(data.vaults[0].id);
      }
    } catch (error) {
      console.error('Error fetching vaults:', error);
      setVaults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVaults = async () => {
    await fetchVaults();
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVaults();
    } else {
      setVaults([]);
      setActiveVaultId(null);
    }
  }, [isAuthenticated, user]);

  const value: PortfolioContextType = {
    activeVaultId,
    setActiveVaultId,
    vaults,
    isLoading,
    refreshVaults,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
