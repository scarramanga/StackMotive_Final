import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Download,
  BarChart3,
  Calendar,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Target
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { 
  sentimentService, 
  useSentimentDashboard, 
  useSentimentTimeline, 
  useSentimentDrivers,
  SentimentDashboardData,
  SentimentSnapshot
} from '../../services/sentimentService';

export const SentimentDashboardPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const queryClient = useQueryClient();
  
  // State management
  const [viewMode, setViewMode] = useState<'overlay' | 'asset' | 'macro'>('overlay');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>('1D');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch sentiment dashboard data
  const { data: dashboardData, isLoading, error } = useSentimentDashboard(activeVaultId, user, viewMode);

  // Fetch timeline data
  const { data: timelineData } = useSentimentTimeline(activeVaultId, user, timeframe, selectedItem);

  // Fetch driver data
  const { data: driversData } = useSentimentDrivers(activeVaultId, user, selectedItem);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await sentimentService.exportSentimentData(activeVaultId, viewMode, 'csv');
      sentimentService.createDownloadLink(blob, `sentiment-dashboard-${viewMode}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    sentimentService.refreshSentimentData(queryClient, activeVaultId);
  };

  // Filter snapshots
  const filteredSnapshots = React.useMemo(() => {
    if (!dashboardData?.snapshots) return [];
    
    return sentimentService.filterSentimentSnapshots(
      dashboardData.snapshots,
      viewMode,
      searchTerm
    );
  }, [dashboardData?.snapshots, viewMode, searchTerm]);

  // Get section icon
  const getSectionIcon = (type: string) => {
    const iconName = sentimentService.getDriverIcon(type);
    switch (iconName) {
      case 'bar-chart-3':
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      case 'file-spreadsheet':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'trending-up':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'target':
        return <Target className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading sentiment dashboard: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
            Loading sentiment dashboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No sentiment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sentiment Dashboard
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className={`text-2xl font-bold ${
                dashboardData.summary.overallSentiment > 0 ? 'text-green-600' : 
                dashboardData.summary.overallSentiment < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {dashboardData.summary.overallSentiment.toFixed(1)}
              </div>
              <div className="text-sm text-blue-700">Overall Sentiment</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-bold text-green-600 truncate">
                {dashboardData.summary.strongestPositive}
              </div>
              <div className="text-sm text-green-700">Most Positive</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm font-bold text-red-600 truncate">
                {dashboardData.summary.strongestNegative}
              </div>
              <div className="text-sm text-red-700">Most Negative</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.summary.totalSignals}
              </div>
              <div className="text-sm text-purple-700">Total Signals</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-40">
              <Select value={viewMode} onValueChange={(value: 'overlay' | 'asset' | 'macro') => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overlay">Overlays</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="macro">Macro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-32">
              <Select value={timeframe} onValueChange={(value: '1D' | '1W' | '1M') => setTimeframe(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1D">1 Day</SelectItem>
                  <SelectItem value="1W">1 Week</SelectItem>
                  <SelectItem value="1M">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sentiment Heatmap */}
          <div>
            <h3 className="font-medium mb-4">Sentiment Heatmap</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedItem === snapshot.id 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: sentimentService.getSentimentColor(snapshot.sentiment) + '20' }}
                  onClick={() => setSelectedItem(snapshot.id)}
                >
                  <div className="text-center">
                    <div 
                      className="text-2xl font-bold mb-1"
                      style={{ color: sentimentService.getSentimentColor(snapshot.sentiment) }}
                    >
                      {snapshot.sentiment.toFixed(0)}
                    </div>
                    <div className="text-sm font-medium mb-2 truncate">
                      {snapshot.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sentimentService.formatPercentage(snapshot.change24h)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Chart */}
          {timelineData?.timeline && timelineData.timeline.length > 0 && (
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-medium mb-4">
                Sentiment Trend {selectedItem ? `- ${filteredSnapshots.find(s => s.id === selectedItem)?.name}` : '(Overall)'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis domain={[-100, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => sentimentService.formatTime(value as string)}
                      formatter={(value, name) => {
                        if (name === 'sentiment') return [value, 'Sentiment'];
                        if (name === 'confidence') return [`${value}%`, 'Confidence'];
                        return [value, name];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sentiment" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#10b981" 
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Item Info */}
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-4">Details</h3>
                {(() => {
                  const item = filteredSnapshots.find(s => s.id === selectedItem);
                  if (!item) return null;
                  
                  const badgeInfo = sentimentService.getSentimentBadge(item.sentimentLabel);
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sentiment Score</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: sentimentService.getSentimentColor(item.sentiment) }}>
                            {item.sentiment.toFixed(1)}
                          </span>
                          <Badge className={badgeInfo.className}>
                            {badgeInfo.text}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-medium">{item.confidence.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">24h Change</span>
                        <span className={`font-bold ${
                          item.change24h > 0 ? 'text-green-600' : 
                          item.change24h < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {sentimentService.formatPercentage(item.change24h)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <span className="text-sm">{sentimentService.formatTime(item.lastUpdated)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Driver Breakdown */}
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-4">Driver Breakdown</h3>
                {(() => {
                  const item = filteredSnapshots.find(s => s.id === selectedItem);
                  if (!item?.drivers || item.drivers.length === 0) {
                    return (
                      <div className="text-center text-muted-foreground py-8">
                        No driver data available
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {item.drivers.map((driver, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getSectionIcon(driver.type)}
                            <div>
                              <div className="font-medium capitalize">{driver.type}</div>
                              <div className="text-sm text-muted-foreground">{driver.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{(driver.weight * 100).toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Weight</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 