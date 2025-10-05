import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  TestTube, 
  Play, 
  Pause, 
  Stop, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Copy,
  Settings,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Percent,
  LineChart,
  PieChart,
  AlertTriangle,
  Info,
  Eye,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  Edit,
  FileText,
  Database,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  Signal,
  Brain,
  TrendingUpDown,
  Volume2,
  Gauge,
  Crosshair
} from 'lucide-react';

import {
  useTests,
  useTest,
  useCreateTest,
  useUpdateTest,
  useDeleteTest,
  useRunTest,
  useStopTest,
  useValidateSignal,
  useAvailableIndicators,
  useHistoricalData,
  useExportTestResults,
  useCloneTest,
  useSignalTestingUtils,
  type SignalTest,
  type TestResult,
  type SignalDefinition,
  type TestConfiguration,
  type TestRequest,
  type TestQuery,
  type TestStatus,
  type SignalType,
  type IndicatorType,
  type TestFrequency,
  type PerformanceMetrics,
} from '@/services/signalTestingEnvironmentService';

interface SignalTestingEnvironmentPanelProps {
  userId: string;
  className?: string;
}

export function SignalTestingEnvironmentPanel({ 
  userId, 
  className = '' 
}: SignalTestingEnvironmentPanelProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'tests' | 'create' | 'results' | 'settings'>('tests');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  
  // Form states
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [signalType, setSignalType] = useState<SignalType>('momentum');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorType[]>([]);
  const [testAssets, setTestAssets] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState({
    start: '',
    end: '',
  });
  const [initialCapital, setInitialCapital] = useState(100000);
  const [frequency, setFrequency] = useState<TestFrequency>('day');
  const [riskLimits, setRiskLimits] = useState({
    maxDrawdown: 0.2,
    maxVolatility: 0.3,
    stopLoss: 0.1,
    takeProfit: 0.2,
  });
  const [transactionCosts, setTransactionCosts] = useState({
    fixed: 5,
    variable: 0.001,
  });

  // Build query for tests
  const testQuery = useMemo((): TestQuery => {
    const query: TestQuery = {
      userId,
      limit: 50,
      offset: 0,
    };
    
    if (searchTerm) query.search = searchTerm;
    if (statusFilter !== 'all') query.status = statusFilter;
    
    return query;
  }, [userId, searchTerm, statusFilter]);

  // Service hooks
  const { data: testsData, isLoading: testsLoading, error: testsError } = useTests(testQuery);
  const { data: testDetails, isLoading: testDetailsLoading } = useTest(selectedTest);
  const { data: availableIndicators = [] } = useAvailableIndicators();
  const createTestMutation = useCreateTest(userId);
  const updateTestMutation = useUpdateTest(selectedTest, userId);
  const deleteTestMutation = useDeleteTest(userId);
  const runTestMutation = useRunTest(selectedTest, userId);
  const stopTestMutation = useStopTest(selectedTest, userId);
  const validateSignalMutation = useValidateSignal(userId);
  const exportResultsMutation = useExportTestResults(userId);
  const cloneTestMutation = useCloneTest(userId);
  const utils = useSignalTestingUtils(userId);

  // Event handlers
  const handleCreateTest = useCallback(async () => {
    if (!testName.trim()) {
      Toast({ title: 'Error', description: 'Please enter a test name' });
      return;
    }

    if (!timeRange.start || !timeRange.end) {
      Toast({ title: 'Error', description: 'Please select a time range' });
      return;
    }

    if (testAssets.length === 0) {
      Toast({ title: 'Error', description: 'Please select at least one asset' });
      return;
    }

    const signalDefinition: SignalDefinition = {
      id: `signal-${Date.now()}`,
      name: testName,
      type: signalType,
      category: 'entry',
      indicators: selectedIndicators.map(type => ({
        id: `indicator-${type}-${Date.now()}`,
        name: type,
        type,
        parameters: [],
        timeframe: '1d',
        source: { provider: 'yahoo', endpoint: '/api/data', parameters: {} },
        weight: 1,
        isRequired: true,
        validation: { isValid: true, errors: [], warnings: [] },
      })),
      conditions: [],
      parameters: [],
      triggers: [],
      filters: [],
      validation: {
        rules: [],
        minimumConfidence: 0.7,
        maximumRisk: 0.3,
        requiredIndicators: selectedIndicators,
        forbiddenCombinations: [],
      },
    };

    const testConfiguration: TestConfiguration = {
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
        warmupPeriod: 30,
        cooldownPeriod: 0,
      },
      assets: testAssets,
      benchmark: 'SPY',
      frequency,
      initialCapital,
      transactionCosts: {
        fixed: transactionCosts.fixed,
        variable: transactionCosts.variable,
        spread: 0.001,
        slippage: 0.001,
      },
      slippage: 0.001,
      maxPositionSize: 0.1,
      riskLimits: {
        maxDrawdown: riskLimits.maxDrawdown,
        maxVolatility: riskLimits.maxVolatility,
        maxConcentration: 0.3,
        maxLeverage: 1,
        stopLoss: riskLimits.stopLoss,
        takeProfit: riskLimits.takeProfit,
      },
      rebalanceFrequency: 'daily',
      lookaheadBias: false,
      survivorshipBias: false,
      options: {
        includeWeekends: false,
        includeHolidays: false,
        realTimeSimulation: false,
        paperTrading: false,
        recordTrades: true,
        recordSignals: true,
        recordPerformance: true,
        enableLogging: true,
      },
    };

    const request: TestRequest = {
      name: testName,
      description: testDescription,
      signalDefinition,
      testConfiguration,
      saveResults: true,
    };

    try {
      await createTestMutation.mutateAsync(request);
      setShowCreateDialog(false);
      resetForm();
      Toast({ title: 'Success', description: 'Test created successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to create test' });
    }
  }, [
    testName,
    testDescription,
    signalType,
    selectedIndicators,
    testAssets,
    timeRange,
    initialCapital,
    frequency,
    riskLimits,
    transactionCosts,
    createTestMutation,
  ]);

  const handleRunTest = useCallback(async (testId: string) => {
    try {
      await runTestMutation.mutateAsync();
      Toast({ title: 'Success', description: 'Test started successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to start test' });
    }
  }, [runTestMutation]);

  const handleStopTest = useCallback(async (testId: string) => {
    try {
      await stopTestMutation.mutateAsync();
      Toast({ title: 'Success', description: 'Test stopped successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to stop test' });
    }
  }, [stopTestMutation]);

  const handleDeleteTest = useCallback(async (testId: string) => {
    try {
      await deleteTestMutation.mutateAsync(testId);
      Toast({ title: 'Success', description: 'Test deleted successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to delete test' });
    }
  }, [deleteTestMutation]);

  const handleCloneTest = useCallback(async (testId: string, name: string) => {
    try {
      await cloneTestMutation.mutateAsync({ testId, name });
      Toast({ title: 'Success', description: 'Test cloned successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to clone test' });
    }
  }, [cloneTestMutation]);

  const handleExportResults = useCallback(async (testId: string, format: 'json' | 'csv' | 'xlsx') => {
    try {
      await exportResultsMutation.mutateAsync({ testId, format });
      Toast({ title: 'Success', description: 'Results exported successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to export results' });
    }
  }, [exportResultsMutation]);

  const handleAddAsset = useCallback((asset: string) => {
    if (asset.trim() && !testAssets.includes(asset.trim())) {
      setTestAssets(prev => [...prev, asset.trim()]);
    }
  }, [testAssets]);

  const handleRemoveAsset = useCallback((asset: string) => {
    setTestAssets(prev => prev.filter(a => a !== asset));
  }, []);

  const handleAddIndicator = useCallback((indicator: IndicatorType) => {
    if (!selectedIndicators.includes(indicator)) {
      setSelectedIndicators(prev => [...prev, indicator]);
    }
  }, [selectedIndicators]);

  const handleRemoveIndicator = useCallback((indicator: IndicatorType) => {
    setSelectedIndicators(prev => prev.filter(i => i !== indicator));
  }, []);

  const resetForm = useCallback(() => {
    setTestName('');
    setTestDescription('');
    setSignalType('momentum');
    setSelectedIndicators([]);
    setTestAssets([]);
    setTimeRange({ start: '', end: '' });
    setInitialCapital(100000);
    setFrequency('day');
    setRiskLimits({
      maxDrawdown: 0.2,
      maxVolatility: 0.3,
      stopLoss: 0.1,
      takeProfit: 0.2,
    });
    setTransactionCosts({
      fixed: 5,
      variable: 0.001,
    });
  }, []);

  // Render performance metrics
  const renderPerformanceMetrics = useCallback((performance: PerformanceMetrics) => {
    const metrics = [
      { label: 'Total Return', value: performance.totalReturn, format: 'percentage' },
      { label: 'Annualized Return', value: performance.annualizedReturn, format: 'percentage' },
      { label: 'Sharpe Ratio', value: performance.sharpeRatio, format: 'ratio' },
      { label: 'Max Drawdown', value: performance.maxDrawdown, format: 'percentage' },
      { label: 'Volatility', value: performance.volatility, format: 'percentage' },
      { label: 'Win Rate', value: performance.winRate, format: 'percentage' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                <div className="flex items-center space-x-1">
                  {metric.format === 'percentage' && metric.value > 0 && (
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  )}
                  {metric.format === 'percentage' && metric.value < 0 && (
                    <ArrowDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-lg font-bold ${
                    metric.format === 'percentage' ? 
                      (metric.value > 0 ? 'text-green-500' : 'text-red-500') : 
                      'text-foreground'
                  }`}>
                    {utils.formatPerformanceMetric(metric.value, metric.format as any)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [utils]);

  // Render test item
  const renderTestItem = useCallback((test: SignalTest) => {
    const latestResult = test.results[test.results.length - 1];
    const score = latestResult ? utils.calculatePerformanceScore(latestResult.performance) : 0;
    
    return (
      <Card key={test.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <TestTube className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={test.status === 'completed' ? 'default' : 
                        test.status === 'running' ? 'secondary' : 
                        test.status === 'failed' ? 'destructive' : 'outline'}
                style={{ color: utils.getStatusColor(test.status) }}
              >
                {utils.formatTestStatus(test.status)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {utils.formatSignalType(test.signalDefinition.type)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Assets:</span>
              <span className="ml-2">{test.testConfiguration.assets.join(', ')}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Period:</span>
              <span className="ml-2">
                {new Date(test.testConfiguration.timeRange.start).toLocaleDateString()} - 
                {new Date(test.testConfiguration.timeRange.end).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Capital:</span>
              <span className="ml-2">${test.testConfiguration.initialCapital.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Score:</span>
              <span className="ml-2 font-medium">{score.toFixed(1)}/100</span>
            </div>
          </div>

          {latestResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Return:</span>
                <span className={`ml-2 font-medium ${latestResult.performance.totalReturn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {utils.formatPerformanceMetric(latestResult.performance.totalReturn, 'percentage')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Sharpe:</span>
                <span className="ml-2 font-medium">{latestResult.performance.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Max DD:</span>
                <span className="ml-2 font-medium text-red-500">
                  {utils.formatPerformanceMetric(latestResult.performance.maxDrawdown, 'percentage')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Win Rate:</span>
                <span className="ml-2 font-medium">{utils.formatPerformanceMetric(latestResult.performance.winRate, 'percentage')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Created: {new Date(test.created).toLocaleDateString()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTest(test.id);
                  setShowTestDetails(true);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              
              {test.status === 'configured' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunTest(test.id)}
                  disabled={runTestMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Run
                </Button>
              )}
              
              {test.status === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStopTest(test.id)}
                  disabled={stopTestMutation.isPending}
                >
                  <Stop className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              )}
              
              {test.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportResults(test.id, 'json')}
                  disabled={exportResultsMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCloneTest(test.id, `${test.name} (Copy)`)}
                disabled={cloneTestMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTest(test.id)}
                disabled={deleteTestMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [
    utils,
    handleRunTest,
    handleStopTest,
    handleExportResults,
    handleCloneTest,
    handleDeleteTest,
    runTestMutation.isPending,
    stopTestMutation.isPending,
    exportResultsMutation.isPending,
    cloneTestMutation.isPending,
    deleteTestMutation.isPending,
  ]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Signal Testing Environment</span>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tests">
                <TestTube className="h-4 w-4 mr-2" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </TabsTrigger>
              <TabsTrigger value="results">
                <BarChart3 className="h-4 w-4 mr-2" />
                Results
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="configured">Configured</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              {testsData?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{testsData.summary.totalTests}</div>
                      <p className="text-sm text-muted-foreground">Total Tests</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-500">{testsData.summary.completedTests}</div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-yellow-500">{testsData.summary.runningTests}</div>
                      <p className="text-sm text-muted-foreground">Running</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{testsData.summary.averageScore.toFixed(1)}</div>
                      <p className="text-sm text-muted-foreground">Avg Score</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tests List */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {testsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading tests...</p>
                    </div>
                  ) : testsError ? (
                    <div className="text-center py-8">
                      <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Failed to load tests</p>
                    </div>
                  ) : testsData?.tests?.length === 0 ? (
                    <div className="text-center py-8">
                      <TestTube className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No tests found</p>
                    </div>
                  ) : (
                    testsData?.tests?.map(renderTestItem)
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Test Name</label>
                      <Input
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="Enter test name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={testDescription}
                        onChange={(e) => setTestDescription(e.target.value)}
                        placeholder="Enter test description"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Signal Type</label>
                      <Select value={signalType} onValueChange={(value) => setSignalType(value as SignalType)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="momentum">Momentum</SelectItem>
                          <SelectItem value="reversal">Reversal</SelectItem>
                          <SelectItem value="trend_following">Trend Following</SelectItem>
                          <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                          <SelectItem value="volatility">Volatility</SelectItem>
                          <SelectItem value="volume">Volume</SelectItem>
                          <SelectItem value="sentiment">Sentiment</SelectItem>
                          <SelectItem value="fundamental">Fundamental</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="macro">Macro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Indicators</label>
                      <div className="mt-1 space-y-2">
                        <Select onValueChange={(value) => handleAddIndicator(value as IndicatorType)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add indicator" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableIndicators.map((indicator) => (
                              <SelectItem key={indicator} value={indicator}>
                                {indicator.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2">
                          {selectedIndicators.map((indicator) => (
                            <Badge key={indicator} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveIndicator(indicator)}>
                              {indicator.toUpperCase()} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Test Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={timeRange.start}
                          onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="date"
                          value={timeRange.end}
                          onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Assets</label>
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="Enter asset symbol (e.g., AAPL)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                handleAddAsset(target.value);
                                target.value = '';
                              }
                            }}
                          />
                          <Button 
                            variant="outline" 
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              handleAddAsset(input.value);
                              input.value = '';
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {testAssets.map((asset) => (
                            <Badge key={asset} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveAsset(asset)}>
                              {asset} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Frequency</label>
                      <Select value={frequency} onValueChange={(value) => setFrequency(value as TestFrequency)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minute">Minute</SelectItem>
                          <SelectItem value="hour">Hour</SelectItem>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Initial Capital</label>
                      <Input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Risk & Transaction Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Risk Limits</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Max Drawdown ({(riskLimits.maxDrawdown * 100).toFixed(0)}%)</label>
                          <Slider
                            value={[riskLimits.maxDrawdown]}
                            onValueChange={(value) => setRiskLimits(prev => ({ ...prev, maxDrawdown: value[0] }))}
                            min={0.05}
                            max={0.5}
                            step={0.01}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Max Volatility ({(riskLimits.maxVolatility * 100).toFixed(0)}%)</label>
                          <Slider
                            value={[riskLimits.maxVolatility]}
                            onValueChange={(value) => setRiskLimits(prev => ({ ...prev, maxVolatility: value[0] }))}
                            min={0.1}
                            max={1.0}
                            step={0.01}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Stop Loss ({(riskLimits.stopLoss * 100).toFixed(0)}%)</label>
                          <Slider
                            value={[riskLimits.stopLoss]}
                            onValueChange={(value) => setRiskLimits(prev => ({ ...prev, stopLoss: value[0] }))}
                            min={0.01}
                            max={0.3}
                            step={0.01}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Take Profit ({(riskLimits.takeProfit * 100).toFixed(0)}%)</label>
                          <Slider
                            value={[riskLimits.takeProfit]}
                            onValueChange={(value) => setRiskLimits(prev => ({ ...prev, takeProfit: value[0] }))}
                            min={0.02}
                            max={0.5}
                            step={0.01}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Transaction Costs</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Fixed Cost ($)</label>
                          <Input
                            type="number"
                            value={transactionCosts.fixed}
                            onChange={(e) => setTransactionCosts(prev => ({ ...prev, fixed: Number(e.target.value) }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Variable Cost (%)</label>
                          <Input
                            type="number"
                            value={transactionCosts.variable}
                            onChange={(e) => setTransactionCosts(prev => ({ ...prev, variable: Number(e.target.value) }))}
                            step={0.0001}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleCreateTest} disabled={createTestMutation.isPending}>
                  {createTestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Test
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a test to view detailed results</p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Default Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-save" defaultChecked />
                      <label htmlFor="auto-save" className="text-sm">Auto-save tests</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="real-time" defaultChecked />
                      <label htmlFor="real-time" className="text-sm">Real-time updates</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="notifications" defaultChecked />
                      <label htmlFor="notifications" className="text-sm">Test completion notifications</label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Signal Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use the Create tab to configure your signal test parameters.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowCreateDialog(false);
                setActiveTab('create');
              }}>
                Go to Create Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Details Dialog */}
      <Dialog open={showTestDetails} onOpenChange={setShowTestDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Test Details</DialogTitle>
          </DialogHeader>
          {testDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Test Information</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Name:</strong> {testDetails.name}</div>
                    <div><strong>Description:</strong> {testDetails.description}</div>
                    <div><strong>Signal Type:</strong> {utils.formatSignalType(testDetails.signalDefinition.type)}</div>
                    <div><strong>Status:</strong> {utils.formatTestStatus(testDetails.status)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Configuration</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div><strong>Assets:</strong> {testDetails.testConfiguration.assets.join(', ')}</div>
                    <div><strong>Initial Capital:</strong> ${testDetails.testConfiguration.initialCapital.toLocaleString()}</div>
                    <div><strong>Frequency:</strong> {testDetails.testConfiguration.frequency}</div>
                    <div><strong>Period:</strong> {testDetails.testConfiguration.timeRange.start} to {testDetails.testConfiguration.timeRange.end}</div>
                  </div>
                </div>
              </div>
              
              {testDetails.results.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Latest Results</h4>
                  {renderPerformanceMetrics(testDetails.results[testDetails.results.length - 1].performance)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 