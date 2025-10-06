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
} from '@mui/material';
import { withTierGuard } from '../layout/withTierGuard';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';

interface EarningsEvent {
  id: string;
  symbol: string;
  companyName: string;
  earningsDate: string;
  estimatedEPS: number | null;
  actualEPS: number | null;
  quarter: string;
  fiscalYear: number;
  portfolioHolding: boolean;
  holdingWeight: number;
}

interface EarningsCalendarResponse {
  events: EarningsEvent[];
}

const fetchEarningsCalendar = async (
  vaultId: string,
  token: string,
  daysAhead: number
): Promise<EarningsCalendarResponse> => {
  const response = await fetch(
    `/api/earnings/calendar?vaultId=${vaultId}&daysAhead=${daysAhead}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings calendar');
  }

  return response.json();
};

const EarningsCalendarPanelComponent: React.FC = () => {
  const { activeVaultId } = usePortfolio();
  const { user } = useAuth();
  const [daysAhead, setDaysAhead] = useState<number>(7);
  const [filterHoldings, setFilterHoldings] = useState<boolean>(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['earningsCalendar', activeVaultId, daysAhead],
    queryFn: () => {
      const token = localStorage.getItem('auth_token');
      if (!activeVaultId || !token) {
        throw new Error('Missing vault ID or auth token');
      }
      return fetchEarningsCalendar(activeVaultId, token, daysAhead);
    },
    enabled: !!activeVaultId && !!user,
    refetchInterval: 3600000,
  });

  const handleDaysChange = (event: SelectChangeEvent<number>) => {
    setDaysAhead(Number(event.target.value));
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterHoldings(event.target.value === 'holdings');
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
              Failed to load earnings calendar: {(error as Error).message}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events || [];
  const filteredEvents = filterHoldings
    ? events.filter((event) => event.portfolioHolding)
    : events;

  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime()
  );

  const groupedByDate = sortedEvents.reduce((acc, event) => {
    const dateKey = format(parseISO(event.earningsDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, EarningsEvent[]>);

  return (
    <Card className="w-full">
      <CardHeader
        title="Earnings Calendar"
        subheader="Upcoming earnings announcements for portfolio holdings and watchlist"
      />
      <CardContent>
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={daysAhead} onChange={handleDaysChange}>
              <MenuItem value={7}>Next 7 Days</MenuItem>
              <MenuItem value={14}>Next 14 Days</MenuItem>
              <MenuItem value={30}>Next 30 Days</MenuItem>
              <MenuItem value={60}>Next 60 Days</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={filterHoldings ? 'holdings' : 'all'}
              onChange={handleFilterChange}
            >
              <MenuItem value="holdings">Portfolio Holdings Only</MenuItem>
              <MenuItem value="all">All Events</MenuItem>
            </Select>
          </FormControl>

          <Box flexGrow={1} />

          <Typography variant="body2" color="textSecondary" alignSelf="center">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>

        {sortedEvents.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="textSecondary">
              No earnings events scheduled in the selected timeframe
            </Typography>
          </Box>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateKey, dateEvents]) => (
              <div key={dateKey}>
                <Typography variant="h6" className="mb-2 text-gray-700">
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Quarter</TableCell>
                        <TableCell align="right">Est. EPS</TableCell>
                        <TableCell align="right">Actual EPS</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Portfolio Weight</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dateEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {event.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{event.companyName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {event.quarter} {event.fiscalYear}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {event.estimatedEPS !== null
                                ? `$${event.estimatedEPS.toFixed(2)}`
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {event.actualEPS !== null
                                ? `$${event.actualEPS.toFixed(2)}`
                                : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {event.portfolioHolding ? (
                              <Chip
                                label="Holding"
                                color="primary"
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="Watchlist"
                                color="default"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {event.portfolioHolding
                                ? `${(event.holdingWeight * 100).toFixed(2)}%`
                                : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            ))}
          </div>
        )}

        <Box mt={4}>
          <Typography variant="body2" color="textSecondary">
            Earnings announcements can cause significant price volatility. Monitor these dates to
            adjust position sizing or implement protective strategies for holdings with upcoming
            earnings.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export const EarningsCalendarPanel = withTierGuard(EarningsCalendarPanelComponent, {
  requiredTier: 'operator',
  upgradeMessage:
    'Track earnings announcements for portfolio holdings. Upgrade to Operator tier or higher.',
});
