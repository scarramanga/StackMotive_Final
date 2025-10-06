import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Typography, CircularProgress, Box, Tooltip } from '@mui/material';
import { withTierGuard } from '../layout/withTierGuard';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';

interface CorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
}

interface CorrelationMatrixResponse {
  matrix: CorrelationData[];
  assets: string[];
}

const fetchCorrelationMatrix = async (vaultId: string, token: string): Promise<CorrelationMatrixResponse> => {
  const response = await fetch(`/api/correlation/matrix?vaultId=${vaultId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch correlation matrix');
  }

  return response.json();
};

const getCorrelationColor = (correlation: number): string => {
  if (correlation >= 0.7) return 'bg-red-500';
  if (correlation >= 0.4) return 'bg-orange-400';
  if (correlation >= 0) return 'bg-yellow-300';
  if (correlation >= -0.4) return 'bg-blue-300';
  return 'bg-blue-500';
};

const getCorrelationLabel = (correlation: number): string => {
  if (correlation >= 0.7) return 'Strong Positive';
  if (correlation >= 0.4) return 'Moderate Positive';
  if (correlation >= 0) return 'Weak Positive';
  if (correlation >= -0.4) return 'Weak Negative';
  return 'Strong Negative';
};

const CorrelationMatrixPanelComponent: React.FC = () => {
  const { activeVaultId } = usePortfolio();
  const { user } = useAuth();
  const [hoveredCell, setHoveredCell] = useState<{ asset1: string; asset2: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['correlationMatrix', activeVaultId],
    queryFn: () => {
      const token = localStorage.getItem('auth_token');
      if (!activeVaultId || !token) {
        throw new Error('Missing vault ID or auth token');
      }
      return fetchCorrelationMatrix(activeVaultId, token);
    },
    enabled: !!activeVaultId && !!user,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <Typography color="error">
              Failed to load correlation matrix: {(error as Error).message}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const assets = data?.assets || [];
  const matrixData = data?.matrix || [];

  const getCorrelation = (asset1: string, asset2: string): number => {
    if (asset1 === asset2) return 1.0;
    const found = matrixData.find(
      (item) =>
        (item.asset1 === asset1 && item.asset2 === asset2) ||
        (item.asset1 === asset2 && item.asset2 === asset1)
    );
    return found?.correlation || 0;
  };

  return (
    <Card className="w-full">
      <CardHeader
        title="Asset Correlation Matrix"
        subheader="Portfolio risk analysis through asset correlation heatmap"
      />
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 bg-gray-100 sticky left-0 z-10"></th>
                  {assets.map((asset) => (
                    <th
                      key={asset}
                      className="border border-gray-300 p-2 bg-gray-100 text-sm font-semibold min-w-[80px]"
                    >
                      {asset}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset1) => (
                  <tr key={asset1}>
                    <td className="border border-gray-300 p-2 bg-gray-100 font-semibold text-sm sticky left-0 z-10">
                      {asset1}
                    </td>
                    {assets.map((asset2) => {
                      const correlation = getCorrelation(asset1, asset2);
                      const colorClass = getCorrelationColor(correlation);
                      const isHovered =
                        hoveredCell?.asset1 === asset1 && hoveredCell?.asset2 === asset2;

                      return (
                        <Tooltip
                          key={`${asset1}-${asset2}`}
                          title={
                            <div>
                              <div className="font-semibold">
                                {asset1} vs {asset2}
                              </div>
                              <div>Correlation: {correlation.toFixed(3)}</div>
                              <div>{getCorrelationLabel(correlation)}</div>
                            </div>
                          }
                          arrow
                        >
                          <td
                            className={`border border-gray-300 p-2 text-center text-sm cursor-pointer transition-all ${colorClass} ${
                              isHovered ? 'ring-2 ring-blue-600' : ''
                            }`}
                            onMouseEnter={() => setHoveredCell({ asset1, asset2 })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <span className="font-mono text-white font-semibold">
                              {correlation.toFixed(2)}
                            </span>
                          </td>
                        </Tooltip>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <Typography variant="caption">Strong Positive (≥0.7)</Typography>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <Typography variant="caption">Moderate Positive (0.4-0.7)</Typography>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-300 rounded"></div>
            <Typography variant="caption">Weak Positive (0-0.4)</Typography>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <Typography variant="caption">Weak Negative (-0.4-0)</Typography>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <Typography variant="caption">Strong Negative (≤-0.4)</Typography>
          </div>
        </div>

        <Box mt={4}>
          <Typography variant="body2" color="textSecondary">
            Correlation measures the relationship between asset price movements. High positive
            correlation (red) indicates assets move together, increasing concentration risk. Low or
            negative correlation (blue) indicates diversification benefits.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export const CorrelationMatrixPanel = withTierGuard(CorrelationMatrixPanelComponent, {
  requiredTier: 'navigator',
  upgradeMessage: 'Access the Correlation Matrix to analyze portfolio diversification and concentration risk. Upgrade to Navigator tier or higher.',
});
