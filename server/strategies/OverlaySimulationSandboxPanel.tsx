import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  MousePointer2,
  Play,
  Pause,
  RotateCcw,
  Save,
  Copy,
  Trash2,
  Plus,
  Layers,
  Target,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Eye,
  EyeOff,
  Move,
  Zap,
  Activity,
  Brain,
  Heart,
  Globe,
  Clock,
  Loader2,
  DragHandleDots2,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Compare,
  Camera,
  Download,
  Upload
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import {
  overlaySimulationSandboxService,
  useAvailableOverlays,
  useSimulationScenarios,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useRunSimulation,
  useCreateSnapshot,
  useSnapshots,
  useRevertToSnapshot,
  useCompareScenarios,
  useImpactAnalysis,
  OverlayType,
  SimulationScenario,
  OverlayConfiguration,
  SimulationResult,
  DragDropItem
} from '../../services/overlaySimulationSandboxService';

interface DragState {
  isDragging: boolean;
  draggedItem: DragDropItem | null;
  dragOffset: { x: number; y: number };
  dropZone: 'canvas' | 'exclusions' | 'trash' | null;
}

export const OverlaySimulationSandboxPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('sandbox');
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    dropZone: null
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [comparisonScenarios, setComparisonScenarios] = useState<string[]>([]);
  const [selectedOverlayConfig, setSelectedOverlayConfig] = useState<OverlayConfiguration | null>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragImageRef = useRef<HTMLDivElement>(null);

  // Mutations
  const createScenarioMutation = useCreateScenario();
  const updateScenarioMutation = useUpdateScenario();
  const deleteScenarioMutation = useDeleteScenario();
  const runSimulationMutation = useRunSimulation();
  const createSnapshotMutation = useCreateSnapshot();
  const revertToSnapshotMutation = useRevertToSnapshot();
  const compareScenariosMutation = useCompareScenarios();

  // Fetch data
  const { data: availableOverlays, isLoading: loadingOverlays } = useAvailableOverlays();
  const { data: scenarios, isLoading: loadingScenarios } = useSimulationScenarios(
    user?.id || '', 
    activeVaultId || ''
  );
  const { data: snapshots } = useSnapshots(selectedScenario?.id || '');
  const { data: impactAnalysis } = useImpactAnalysis(selectedScenario?.id || '');

  // Group overlays by category
  const overlayCategories = useMemo(() => {
    if (!availableOverlays) return {};
    
    return availableOverlays.reduce((acc, overlay) => {
      if (!acc[overlay.category]) {
        acc[overlay.category] = [];
      }
      acc[overlay.category].push(overlay);
      return acc;
    }, {} as Record<string, OverlayType[]>);
  }, [availableOverlays]);

  // Handle drag start
  const handleDragStart = useCallback((
    e: React.DragEvent,
    item: DragDropItem
  ) => {
    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOffset: { x: e.clientX, y: e.clientY },
      dropZone: null
    });

    // Create custom drag image
    if (dragImageRef.current) {
      e.dataTransfer.setDragImage(dragImageRef.current, 50, 25);
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Determine drop zone
      let dropZone: DragState['dropZone'] = null;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        dropZone = 'canvas';
      }
      
      setDragState(prev => ({ ...prev, dropZone }));
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!dragState.draggedItem || !selectedScenario) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragState.draggedItem.type === 'overlay') {
      const result = await overlaySimulationSandboxService.handleOverlayDrop(
        selectedScenario.id,
        dragState.draggedItem.data.id,
        { x, y }
      );
      
      if (result.success && result.scenario) {
        setSelectedScenario(result.scenario);
        if (realTimeMode) {
          handleRunSimulation(true);
        }
      }
    }

    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      dropZone: null
    });
  }, [dragState, selectedScenario, realTimeMode]);

  // Handle overlay weight change
  const handleOverlayWeightChange = useCallback(async (
    overlayConfigId: string,
    newWeight: number
  ) => {
    if (!selectedScenario) return;

    const result = await overlaySimulationSandboxService.handleOverlayWeightChange(
      selectedScenario.id,
      overlayConfigId,
      newWeight
    );
    
    if (result.success && result.scenario) {
      setSelectedScenario(result.scenario);
      if (realTimeMode) {
        handleRunSimulation(true);
      }
    }
  }, [selectedScenario, realTimeMode]);

  // Handle overlay remove
  const handleOverlayRemove = useCallback(async (overlayConfigId: string) => {
    if (!selectedScenario) return;

    const result = await overlaySimulationSandboxService.handleOverlayRemove(
      selectedScenario.id,
      overlayConfigId
    );
    
    if (result.success && result.scenario) {
      setSelectedScenario(result.scenario);
      if (realTimeMode) {
        handleRunSimulation(true);
      }
    }
  }, [selectedScenario, realTimeMode]);

  // Handle run simulation
  const handleRunSimulation = useCallback(async (realTime: boolean = false) => {
    if (!selectedScenario) return;

    setIsSimulating(true);
    try {
      const result = await overlaySimulationSandboxService.handleSimulationRun(
        selectedScenario.id,
        realTime
      );
      
      if (result.success && result.result) {
        setSimulationResult(result.result);
      }
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  }, [selectedScenario]);

  // Handle create scenario
  const handleCreateScenario = useCallback(async () => {
    if (!newScenarioName.trim()) return;

    try {
      const scenario = await createScenarioMutation.mutateAsync(
        overlaySimulationSandboxService.createDefaultScenario(
          newScenarioName,
          user?.id || '',
          activeVaultId || '',
          newScenarioDescription
        )
      );
      
      setSelectedScenario(scenario);
      setNewScenarioName('');
      setNewScenarioDescription('');
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create scenario:', error);
    }
  }, [newScenarioName, newScenarioDescription, user?.id, activeVaultId, createScenarioMutation]);

  // Handle revert scenario
  const handleRevertScenario = useCallback(async (snapshotId?: string) => {
    if (!selectedScenario) return;

    try {
      const result = await overlaySimulationSandboxService.handleScenarioRevert(
        selectedScenario.id,
        snapshotId
      );
      
      if (result.success && result.scenario) {
        setSelectedScenario(result.scenario);
        setSimulationResult(null);
      }
    } catch (error) {
      console.error('Failed to revert scenario:', error);
    }
  }, [selectedScenario]);

  // Handle create snapshot
  const handleCreateSnapshot = useCallback(async () => {
    if (!selectedScenario) return;

    try {
      await createSnapshotMutation.mutateAsync({
        scenarioId: selectedScenario.id,
        name: `Snapshot ${new Date().toLocaleString()}`,
        description: 'Auto-generated snapshot',
        isBaseline: false
      });
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  }, [selectedScenario, createSnapshotMutation]);

  // Get overlay by ID
  const getOverlayById = useCallback((overlayId: string): OverlayType | undefined => {
    return availableOverlays?.find(overlay => overlay.id === overlayId);
  }, [availableOverlays]);

  // Render overlay on canvas
  const renderOverlayOnCanvas = (overlayConfig: OverlayConfiguration) => {
    const overlay = getOverlayById(overlayConfig.overlayId);
    if (!overlay) return null;

    return (
      <div
        key={overlayConfig.id}
        className="absolute bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg cursor-move min-w-[200px]"
        style={{
          left: overlayConfig.position.x,
          top: overlayConfig.position.y,
          zIndex: overlayConfig.zIndex
        }}
        onClick={() => setSelectedOverlayConfig(overlayConfig)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${overlaySimulationSandboxService.getOverlayCategoryColor(overlay.category)}`} />
            <span className="font-medium text-sm">{overlay.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOverlayConfig(overlayConfig);
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleOverlayRemove(overlayConfig.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Weight:</Label>
            <Slider
              value={[overlayConfig.weight]}
              onValueChange={([value]) => handleOverlayWeightChange(overlayConfig.id, value)}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12">
              {overlaySimulationSandboxService.formatPercentage(overlayConfig.weight)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Strength: {overlaySimulationSandboxService.formatPercentage(overlay.signalStrength)}</span>
            <Badge className={`${overlaySimulationSandboxService.getOverlayComplexityColor(overlay.complexity)} text-xs`}>
              {overlay.complexity}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  if (loadingOverlays || loadingScenarios) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
            Loading overlay simulation sandbox...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-5 w-5" />
              Overlay Simulation Sandbox
              {selectedScenario && (
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedScenario.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRealTimeMode(!realTimeMode)}
              >
                {realTimeMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {realTimeMode ? 'Pause' : 'Real-time'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Scenario Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Active Scenario</Label>
                <Select 
                  value={selectedScenario?.id || ''} 
                  onValueChange={(value) => {
                    const scenario = scenarios?.find(s => s.id === value);
                    setSelectedScenario(scenario || null);
                    setSimulationResult(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios?.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{scenario.name}</span>
                          <div className="flex items-center gap-1 ml-2">
                            <Badge className="bg-gray-100 text-gray-800 text-xs">
                              {scenario.overlays.length} overlays
                            </Badge>
                            {scenario.isActive && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedScenario && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRunSimulation(false)}
                    disabled={isSimulating}
                  >
                    {isSimulating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Simulate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateSnapshot}
                  >
                    <Camera className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevertScenario()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              )}
            </div>

            {selectedScenario && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Overlay Library */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Overlay Library</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {Object.entries(overlayCategories).map(([category, overlays]) => (
                          <div key={category} className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Label>
                            <div className="space-y-2">
                              {overlays.map((overlay) => (
                                <div
                                  key={overlay.id}
                                  className="p-3 border border-border rounded-lg cursor-move hover:bg-muted/50"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, {
                                    id: overlay.id,
                                    type: 'overlay',
                                    data: overlay,
                                    isActive: overlay.isActive,
                                    position: { x: 0, y: 0 }
                                  })}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{overlay.name}</span>
                                    <div className={`w-2 h-2 rounded-full ${overlaySimulationSandboxService.getOverlayCategoryColor(overlay.category)}`} />
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {overlay.description}
                                  </p>
                                  <div className="flex items-center justify-between text-xs">
                                    <span>Strength: {overlaySimulationSandboxService.formatPercentage(overlay.signalStrength)}</span>
                                    <Badge className={`${overlaySimulationSandboxService.getOverlayComplexityColor(overlay.complexity)} text-xs`}>
                                      {overlay.complexity}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Simulation Canvas */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Simulation Canvas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      ref={canvasRef}
                      className="relative w-full h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      {selectedScenario.overlays.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <MousePointer2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p>Drag overlays here to start simulation</p>
                          </div>
                        </div>
                      ) : (
                        selectedScenario.overlays.map(renderOverlayOnCanvas)
                      )}
                      
                      {/* Drop zone indicator */}
                      {dragState.isDragging && dragState.dropZone === 'canvas' && (
                        <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg" />
                      )}
                    </div>

                    {/* Overlay Weight Summary */}
                    {selectedScenario.overlays.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span>Total Weight:</span>
                          <span className="font-medium">
                            {overlaySimulationSandboxService.formatPercentage(
                              selectedScenario.overlays.reduce((sum, o) => sum + o.weight, 0)
                            )}
                          </span>
                        </div>
                        
                        {(() => {
                          const validation = overlaySimulationSandboxService.calculateWeightValidation(selectedScenario.overlays);
                          return (
                            <div className="mt-2 space-y-1">
                              {validation.warnings.map((warning, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs text-yellow-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {warning}
                                </div>
                              ))}
                              {validation.errors.map((error, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {error}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Results Panel */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {simulationResult ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {overlaySimulationSandboxService.formatCurrency(simulationResult.portfolio.totalValue)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Value</div>
                          </div>
                          
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              simulationResult.portfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {simulationResult.portfolio.totalReturn >= 0 ? '+' : ''}
                              {overlaySimulationSandboxService.formatPercentage(simulationResult.portfolio.totalReturnPercent)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Return</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">
                              {overlaySimulationSandboxService.formatNumber(simulationResult.portfolio.sharpeRatio)}
                            </div>
                            <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Risk Metrics</Label>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Volatility:</span>
                              <span>{overlaySimulationSandboxService.formatPercentage(simulationResult.portfolio.volatility)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Max Drawdown:</span>
                              <span className="text-red-600">
                                {overlaySimulationSandboxService.formatPercentage(simulationResult.portfolio.maxDrawdown)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Beta:</span>
                              <span>{overlaySimulationSandboxService.formatNumber(simulationResult.portfolio.beta)}</span>
                            </div>
                          </div>
                        </div>

                        {simulationResult.warnings.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-yellow-600">Warnings</Label>
                            <div className="space-y-1">
                              {simulationResult.warnings.map((warning, index) => (
                                <div key={index} className="flex items-start gap-2 text-xs text-yellow-600">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{warning}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {simulationResult.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-blue-600">Recommendations</Label>
                            <div className="space-y-1">
                              {simulationResult.recommendations.map((rec, index) => (
                                <div key={index} className="flex items-start gap-2 text-xs text-blue-600">
                                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Run simulation to see results</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Snapshots */}
            {selectedScenario && snapshots && snapshots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {snapshots.map((snapshot) => (
                      <div key={snapshot.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{snapshot.name}</span>
                          <Badge className={`${snapshot.isBaseline ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} text-xs`}>
                            {snapshot.isBaseline ? 'Baseline' : 'Snapshot'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {snapshot.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{overlaySimulationSandboxService.formatDateTime(snapshot.timestamp)}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revertToSnapshotMutation.mutate(snapshot.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>

        {/* Create Scenario Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scenario Name</Label>
                <Input
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="Enter scenario name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newScenarioDescription}
                  onChange={(e) => setNewScenarioDescription(e.target.value)}
                  placeholder="Enter scenario description"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateScenario}
                  disabled={!newScenarioName.trim() || createScenarioMutation.isPending}
                >
                  {createScenarioMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Drag Image Element */}
        <div
          ref={dragImageRef}
          className="fixed -top-full -left-full opacity-0 pointer-events-none bg-white border-2 border-blue-500 rounded-lg p-2 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <DragHandleDots2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Dragging...</span>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};

export default OverlaySimulationSandboxPanel; 