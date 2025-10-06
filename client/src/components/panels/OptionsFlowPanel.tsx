import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import { withTierGuard } from '../layout/withTierGuard';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import { format, parseISO } from 'date-fns';

interface OptionsFlowData {
  id: string;
  symbol: string;
  timestamp: string;
  optionType: 'call' | 'put';
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  premium: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  unusualActivity: boolean;
  portfolioRelevance: boolean;
}

interface OptionsFlowResponse {
  flows: OptionsFlowData[];
  summary: {
    totalVolume: number;
    callPutRatio: number;
    unusualActivityCount: number;
  };
}

const fetchOptionsFlow = async (
  vaultId: string,
  token: string,
  timeframe: string
): Promise<OptionsFlowResponse> => {
  const response = await fetch(
    `/api/options/flow?vaultId=${vaultId}&timeframe=${timeframe}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch options flow');
  }

  return response.json();
};

const OptionsFlowPanelComponent: React.FC = () => {
  const { activeVaultId } = usePortfolio();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [filterUnusual, setFilterUnusual] = useState<boolean>(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['optionsFlow', activeVaultId, timeframe],
    queryFn: () => {
      const token = localStorage.getItem('auth_token');
      if (!activeVaultId || !token) {
        throw new Error('Missing vault ID or auth token');
      }
      return fetchOptionsFlow(activeVaultId, token, timeframe);
    },
    enabled: !!activeVaultId && !!user,
    refetchInterval: 30000,
  });

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setTimeframe(event.target.value);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterUnusual(event.target.value === 'unusual');
  };

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
              Failed to load options flow: {(error as Error).message}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const flows = data?.flows || [];
  const summary = data?.summary || { totalVolume: 0, callPutRatio: 0, unusualActivityCount: 0 };

  const filteredFlows = filterUnusual ? flows.filter((flow) => flow.unusualActivity) : flows;

  const sortedFlows = [...filteredFlows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="w-full">
      <CardHeader
        title="Options Flow Monitor"
        subheader="Real-time options activity and unusual flow detection for risk analysis"
      />
      <CardContent>
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={timeframe} onChange={handleTimeframeChange}>
              <MenuItem value="15m">Last 15 Minutes</MenuItem>
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="4h">Last 4 Hours</MenuItem>
              <MenuItem value="1d">Today</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={filterUnusual ? 'unusual' : 'all'} onChange={handleFilterChange}>
              <MenuItem value="all">All Activity</MenuItem>
              <MenuItem value="unusual">Unusual Activity Only</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Total Volume
              </Typography>
              <Typography variant="h5">{summary.totalVolume.toLocaleString()}</Typography>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Call/Put Ratio
              </Typography>
              <Typography variant="h5">
                {summary.callPutRatio.toFixed(2)}
                {summary.callPutRatio > 1 ? (
                  <TrendingUpIcon className="inline ml-2 text-green-600" />
                ) : (
                  <TrendingDownIcon className="inline ml-2 text-red-600" />
                )}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                Unusual Activity
              </Typography>
              <Typography variant="h5">
                {summary.unusualActivityCount}
                {summary.unusualActivityCount > 0 && (
                  <WarningIcon className="inline ml-2 text-orange-600" />
                )}
              </Typography>
            </CardContent>
          </Card>
        </div>

        {summary.unusualActivityCount > 5 && (
          <Alert severity="warning" className="mb-4">
            High number of unusual options activity detected. This may indicate significant market
            positioning or upcoming volatility.
          </Alert>
        )}

        {sortedFlows.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="textSecondary">No options flow data for selected timeframe</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Strike</TableCell>
                  <TableCell>Expiration</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Open Int.</TableCell>
                  <TableCell align="right">IV</TableCell>
                  <TableCell align="right">Premium</TableCell>
                  <TableCell>Sentiment</TableCell>
                  <TableCell>Flags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFlows.map((flow) => (
                  <TableRow
                    key={flow.id}
                    className={flow.unusualActivity ? 'bg-yellow-50' : ''}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {format(parseISO(flow.timestamp), 'HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {flow.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={flow.optionType.toUpperCase()}
                        color={flow.optionType === 'call' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">${flow.strike.toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(parseISO(flow.expiration), 'MM/dd/yy')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{flow.volume.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {flow.openInterest.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {(flow.impliedVolatility * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        ${(flow.premium / 1000).toFixed(1)}K
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={flow.sentiment}
                        color={
                          flow.sentiment === 'bullish'
                            ? 'success'
                            : flow.sentiment === 'bearish'
                            ? 'error'
                            : 'default'
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {flow.unusualActivity && (
                          <Chip label="Unusual" color="warning" size="small" />
                        )}
                        {flow.portfolioRelevance && (
                          <Chip label="Portfolio" color="primary" size="small" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box mt={4}>
          <Typography variant="body2" color="textSecondary">
            <strong>Retail Investor Protection Notice:</strong> This panel provides options flow
            analysis for risk assessment and educational purposes only. StackMotive does not
            execute options trades. Unusual activity may indicate institutional positioning, hedging,
            or potential market-moving events. Use this information to understand market sentiment
            and adjust your risk exposure accordingly.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export const OptionsFlowPanel = withTierGuard(OptionsFlowPanelComponent, {
  requiredTier: 'sovereign',
  upgradeMessage:
    'Monitor real-time options flow and unusual activity for advanced risk analysis. Upgrade to Sovereign tier.',
});
