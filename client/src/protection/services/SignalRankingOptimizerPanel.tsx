import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSignalSources,
  useSignalRanks,
  useSignalSourcePerformance,
  useCalculateRankings,
  useUpdateSourceInclusion,
  useSaveRankingConfiguration,
  useExportRankings,
  useSignalRankingOptimizerUtils,
  type RankingPeriod,
  type RankingRequest,
  type RankingConfiguration,
  type SignalSource,
  type SignalRanking,
} from '@/services/signalRankingOptimizerService';

interface SignalRankingOptimizerPanelProps {
  className?: string;
}

export const SignalRankingOptimizerPanel: React.FC<SignalRankingOptimizerPanelProps> = ({ className }) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  // Service hooks
  const { data: signalSources, isLoading: sourcesLoading } = useSignalSources();
  const { data: signalRanks, isLoading: ranksLoading } = useSignalRanks();
  const calculateRankings = useCalculateRankings(userId);
  const updateSourceInclusion = useUpdateSourceInclusion(userId);
  const saveRankingConfiguration = useSaveRankingConfiguration(userId);
  const exportRankings = useExportRankings(userId);
  const utils = useSignalRankingOptimizerUtils(userId);

  // Local state
  const [activeTab, setActiveTab] = useState('rankings');
  const [selectedPeriod, setSelectedPeriod] = useState<RankingPeriod>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    duration: '30d',
    frequency: 'daily',
    dataPoints: 30,
    completeness: 1.0,
  });
  const [configurationName, setConfigurationName] = useState('');
  const [performanceWeight, setPerformanceWeight] = useState(0.4);
  const [reliabilityWeight, setReliabilityWeight] = useState(0.3);
  const [recencyWeight, setRecencyWeight] = useState(0.3);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('json');

  // Computed values
  const isLoading = sourcesLoading || ranksLoading;
  const totalSources = signalSources?.length || 0;
  const activeSources = signalSources?.filter(s => s.isActive).length || 0;
  const topPerformers = signalRanks?.slice(0, 5) || [];
  const worstPerformers = signalRanks?.slice(-5).reverse() || [];

  // Event handlers
  const handleCalculateRankings = () => {
    if (!signalSources) return;

    const request: RankingRequest = {
      period: selectedPeriod,
      sources: selectedSources.length > 0 ? selectedSources : signalSources.map(s => s.id),
      parameters: {
        performanceWeight,
        reliabilityWeight,
        recencyWeight,
        consistencyWeight: 0.0,
        riskAdjustmentFactor: 1.0,
        volatilityNormalization: true,
        outlierHandling: 'cap',
        minimumDataPoints: 10,
      },
      benchmarks: ['market', 'sector'],
      options: {
        includeOutcomes: true,
        includeAttribution: true,
        exportFormat: 'json',
        realTimeUpdates: false,
        cacheResults: true,
      },
    };

    calculateRankings.mutate(request);
  };

  const handleToggleSourceInclusion = (sourceId: string, isIncluded: boolean) => {
    updateSourceInclusion.mutate({ sourceId, isIncluded });
  };

  const handleSaveConfiguration = () => {
    if (!configurationName.trim()) return;

    const config: RankingConfiguration = {
      id: '',
      name: configurationName,
      description: `Custom ranking configuration with ${performanceWeight * 100}% performance weight`,
      userId,
      parameters: {
        performanceWeight,
        reliabilityWeight,
        recencyWeight,
        consistencyWeight: 0.0,
        riskAdjustmentFactor: 1.0,
        volatilityNormalization: true,
        outlierHandling: 'cap',
        minimumDataPoints: 10,
      },
      includedSources: selectedSources.length > 0 ? selectedSources : signalSources?.map(s => s.id) || [],
      excludedSources: [],
      customWeights: [],
      filters: [],
      benchmarks: ['market', 'sector'],
      isActive: true,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    saveRankingConfiguration.mutate(config);
    setConfigurationName('');
  };

  const handleExportRankings = () => {
    if (!signalRanks || signalRanks.length === 0) return;
    
    const latestRanking = signalRanks[0];
    exportRankings.mutate({
      rankingId: latestRanking.id,
      format: exportFormat,
    });
  };

  const handleSourceSelection = (sourceId: string, selected: boolean) => {
    if (selected) {
      setSelectedSources(prev => [...prev, sourceId]);
    } else {
      setSelectedSources(prev => prev.filter(id => id !== sourceId));
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Signal Ranking Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalSources}</div>
              <div className="text-sm text-muted-foreground">Total Sources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeSources}</div>
              <div className="text-sm text-muted-foreground">Active Sources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{signalRanks?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Ranked Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {topPerformers[0] ? topPerformers[0].score.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Top Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signal Rankings</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCalculateRankings}
                  disabled={calculateRankings.isPending}
                  size="sm"
                >
                  {calculateRankings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    'Recalculate Rankings'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRankings}
                  disabled={!signalRanks || signalRanks.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading rankings...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Reliability</TableHead>
                      <TableHead>Recency</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signalRanks?.map((ranking) => (
                      <TableRow key={ranking.id}>
                        <TableCell>
                          <Badge variant={ranking.rank <= 3 ? 'default' : 'secondary'}>
                            #{ranking.rank}
                          </Badge>
                        </TableCell>
                        <TableCell>{ranking.sourceId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: utils.getPerformanceColor(ranking.score) }}
                            />
                            {ranking.score.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {utils.formatPerformanceMetric(ranking.performance.annualizedReturn, 'percentage')}
                        </TableCell>
                        <TableCell>
                          {utils.formatPerformanceMetric(ranking.reliability.signalAccuracy, 'percentage')}
                        </TableCell>
                        <TableCell>
                          {utils.formatPerformanceMetric(ranking.recency.recentPerformance, 'percentage')}
                        </TableCell>
                        <TableCell>
                          {ranking.recency.trendDirection === 'improving' ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : ranking.recency.trendDirection === 'declining' ? (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signal Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Select Sources to Include:</Label>
                  <Badge variant="outline">
                    {selectedSources.length > 0 ? selectedSources.length : 'All'} selected
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {signalSources?.map((source) => (
                    <div key={source.id} className="flex items-center space-x-2 p-3 border rounded">
                      <Checkbox
                        id={source.id}
                        checked={selectedSources.length === 0 || selectedSources.includes(source.id)}
                        onCheckedChange={(checked) => handleSourceSelection(source.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={source.id} className="text-sm font-medium">
                            {source.name}
                          </Label>
                          <Badge variant={source.isActive ? 'default' : 'secondary'}>
                            {source.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {utils.formatSignalSourceType(source.type)} • {utils.formatSignalCategory(source.category)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSourceInclusion(source.id, !source.isActive)}
                        disabled={updateSourceInclusion.isPending}
                      >
                        {source.isActive ? 'Exclude' : 'Include'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Configuration Name</Label>
                  <Input
                    value={configurationName}
                    onChange={(e) => setConfigurationName(e.target.value)}
                    placeholder="Enter configuration name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Performance Weight: {(performanceWeight * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[performanceWeight]}
                      onValueChange={(value) => setPerformanceWeight(value[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Reliability Weight: {(reliabilityWeight * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[reliabilityWeight]}
                      onValueChange={(value) => setReliabilityWeight(value[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Recency Weight: {(recencyWeight * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[recencyWeight]}
                      onValueChange={(value) => setRecencyWeight(value[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Period Start</Label>
                    <Input
                      type="date"
                      value={selectedPeriod.start.split('T')[0]}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value + 'T00:00:00.000Z' }))}
                    />
                  </div>
                  <div>
                    <Label>Period End</Label>
                    <Input
                      type="date"
                      value={selectedPeriod.end.split('T')[0]}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value + 'T23:59:59.999Z' }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveConfiguration}
                  disabled={!configurationName.trim() || saveRankingConfiguration.isPending}
                >
                  {saveRankingConfiguration.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.map((ranking, index) => (
                    <div key={ranking.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">#{index + 1}</Badge>
                        <span className="text-sm">{ranking.sourceId}</span>
                      </div>
                      <span className="text-sm font-medium">{ranking.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Underperformers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {worstPerformers.map((ranking, index) => (
                    <div key={ranking.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">#{ranking.rank}</Badge>
                        <span className="text-sm">{ranking.sourceId}</span>
                      </div>
                      <span className="text-sm font-medium">{ranking.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Messages */}
      {calculateRankings.isSuccess && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            Rankings calculated successfully! {calculateRankings.data?.summary.rankedSources} sources ranked.
          </AlertDescription>
        </Alert>
      )}

      {calculateRankings.isError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Failed to calculate rankings. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}; 