import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Overlay Simulation Sandbox
export interface OverlayType {
  id: string;
  name: string;
  description: string;
  category: 'signal' | 'sentiment' | 'risk' | 'macro' | 'technical' | 'fundamental' | 'volatility' | 'momentum';
  defaultWeight: number;
  minWeight: number;
  maxWeight: number;
  isActive: boolean;
  icon: string;
  color: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  signalStrength: number; // 0-1
  lastUpdated: string;
  dataSource: string;
  updateFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
}

export interface OverlayConfiguration {
  id: string;
  overlayId: string;
  weight: number;
  isEnabled: boolean;
  parameters: Record<string, any>;
  exclusions: string[];
  conditions: OverlayCondition[];
  position: {
    x: number;
    y: number;
  };
  zIndex: number;
  customLabel?: string;
  notes?: string;
}

export interface OverlayCondition {
  id: string;
  type: 'asset_class' | 'market_cap' | 'sector' | 'region' | 'signal_strength' | 'volatility' | 'time_window';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  description: string;
  isActive: boolean;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  userId: string;
  vaultId: string;
  overlays: OverlayConfiguration[];
  exclusions: string[];
  createdAt: string;
  lastModified: string;
  isActive: boolean;
  isBaselineSnapshot: boolean;
  tags: string[];
}

export interface SimulationResult {
  scenarioId: string;
  timestamp: string;
  portfolio: {
    totalValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    beta: number;
    alpha: number;
  };
  allocations: AssetAllocation[];
  performanceMetrics: PerformanceMetric[];
  riskMetrics: RiskMetric[];
  impactAnalysis: ImpactAnalysis;
  recommendations: string[];
  warnings: string[];
  validationErrors: string[];
}

export interface AssetAllocation {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: string;
  sector: string;
  region: string;
  currentWeight: number;
  simulatedWeight: number;
  weightChange: number;
  currentValue: number;
  simulatedValue: number;
  valueChange: number;
  expectedReturn: number;
  risk: number;
  contributionToReturn: number;
  contributionToRisk: number;
  overlayImpacts: OverlayImpact[];
}

export interface OverlayImpact {
  overlayId: string;
  overlayName: string;
  weight: number;
  impact: number;
  reasoning: string;
  confidence: number;
}

export interface PerformanceMetric {
  name: string;
  current: number;
  simulated: number;
  change: number;
  changePercent: number;
  unit: string;
  category: 'return' | 'risk' | 'efficiency' | 'drawdown';
  description: string;
  isImprovement: boolean;
}

export interface RiskMetric {
  name: string;
  current: number;
  simulated: number;
  change: number;
  changePercent: number;
  unit: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  description: string;
  isImprovement: boolean;
}

export interface ImpactAnalysis {
  totalImpact: number;
  overlayContributions: Array<{
    overlayId: string;
    overlayName: string;
    contribution: number;
    contributionPercent: number;
    direction: 'positive' | 'negative' | 'neutral';
  }>;
  sectorImpacts: Array<{
    sector: string;
    impact: number;
    reason: string;
  }>;
  assetClassImpacts: Array<{
    assetClass: string;
    impact: number;
    reason: string;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  correlationChanges: Array<{
    asset1: string;
    asset2: string;
    originalCorrelation: number;
    newCorrelation: number;
    impact: number;
  }>;
}

export interface SimulationComparison {
  baseScenario: SimulationResult;
  comparisonScenarios: SimulationResult[];
  comparisonMetrics: Array<{
    metric: string;
    values: number[];
    bestScenario: string;
    worstScenario: string;
    range: number;
    standardDeviation: number;
  }>;
  recommendations: string[];
  summary: {
    bestOverallScenario: string;
    worstOverallScenario: string;
    mostStableScenario: string;
    highestReturnScenario: string;
    lowestRiskScenario: string;
  };
}

export interface SimulationSnapshot {
  id: string;
  scenarioId: string;
  timestamp: string;
  name: string;
  description: string;
  result: SimulationResult;
  isBaseline: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

export interface DragDropItem {
  id: string;
  type: 'overlay' | 'exclusion' | 'condition';
  data: any;
  isActive: boolean;
  position: {
    x: number;
    y: number;
  };
}

// Overlay Simulation Sandbox Service Class
export class OverlaySimulationSandboxService {
  private baseUrl = '/api/simulation/overlay';

  // Overlay Management
  async getAvailableOverlays(): Promise<OverlayType[]> {
    const response = await fetch(`${this.baseUrl}/overlays`);
    if (!response.ok) {
      throw new Error('Failed to fetch available overlays');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('overlays_loaded', {
      overlayCount: result.length,
      categories: [...new Set(result.map((o: OverlayType) => o.category))],
      activeOverlays: result.filter((o: OverlayType) => o.isActive).length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async getOverlayDetails(overlayId: string): Promise<OverlayType> {
    const response = await fetch(`${this.baseUrl}/overlays/${overlayId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch overlay details');
    }

    return response.json();
  }

  // Scenario Management
  async getScenarios(userId: string, vaultId: string): Promise<SimulationScenario[]> {
    const params = new URLSearchParams({ userId, vaultId });
    const response = await fetch(`${this.baseUrl}/scenarios?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scenarios');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('scenarios_loaded', {
      userId,
      vaultId,
      scenarioCount: result.length,
      activeScenarios: result.filter((s: SimulationScenario) => s.isActive).length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async createScenario(scenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'lastModified'>): Promise<SimulationScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });

    if (!response.ok) {
      throw new Error('Failed to create scenario');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('scenario_created', {
      scenarioId: result.id,
      scenarioName: result.name,
      userId: result.userId,
      vaultId: result.vaultId,
      overlayCount: result.overlays.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async updateScenario(scenarioId: string, updates: Partial<SimulationScenario>): Promise<SimulationScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update scenario');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('scenario_updated', {
      scenarioId: result.id,
      scenarioName: result.name,
      overlayCount: result.overlays.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete scenario');
    }

    // Log agent memory
    await this.logAgentMemory('scenario_deleted', {
      scenarioId,
      timestamp: new Date().toISOString()
    });
  }

  // Simulation Execution
  async runSimulation(scenarioId: string): Promise<SimulationResult> {
    const response = await fetch(`${this.baseUrl}/simulate/${scenarioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to run simulation');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('simulation_run', {
      scenarioId,
      totalValue: result.portfolio.totalValue,
      totalReturn: result.portfolio.totalReturn,
      sharpeRatio: result.portfolio.sharpeRatio,
      allocationsCount: result.allocations.length,
      warningsCount: result.warnings.length,
      errorsCount: result.validationErrors.length,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async runRealTimeSimulation(scenarioId: string): Promise<SimulationResult> {
    const response = await fetch(`${this.baseUrl}/simulate/${scenarioId}/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to run real-time simulation');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('realtime_simulation_run', {
      scenarioId,
      totalValue: result.portfolio.totalValue,
      totalReturn: result.portfolio.totalReturn,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Snapshot Management
  async createSnapshot(
    scenarioId: string,
    name: string,
    description: string,
    isBaseline: boolean = false
  ): Promise<SimulationSnapshot> {
    const response = await fetch(`${this.baseUrl}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId,
        name,
        description,
        isBaseline,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create snapshot');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('snapshot_created', {
      snapshotId: result.id,
      scenarioId,
      name,
      isBaseline,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async getSnapshots(scenarioId: string): Promise<SimulationSnapshot[]> {
    const response = await fetch(`${this.baseUrl}/snapshots?scenarioId=${scenarioId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch snapshots');
    }

    return response.json();
  }

  async revertToSnapshot(snapshotId: string): Promise<SimulationScenario> {
    const response = await fetch(`${this.baseUrl}/snapshots/${snapshotId}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to revert to snapshot');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('snapshot_reverted', {
      snapshotId,
      scenarioId: result.id,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Comparison and Analysis
  async compareScenarios(scenarioIds: string[]): Promise<SimulationComparison> {
    const response = await fetch(`${this.baseUrl}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to compare scenarios');
    }

    const result = await response.json();

    // Log agent memory
    await this.logAgentMemory('scenarios_compared', {
      scenarioIds,
      scenarioCount: scenarioIds.length,
      bestScenario: result.summary.bestOverallScenario,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  async getImpactAnalysis(scenarioId: string): Promise<ImpactAnalysis> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}/impact`);
    if (!response.ok) {
      throw new Error('Failed to get impact analysis');
    }

    return response.json();
  }

  // Business Logic Methods
  async handleOverlayDrop(
    scenarioId: string,
    overlayId: string,
    position: { x: number; y: number },
    weight: number = 1.0
  ): Promise<{ success: boolean; scenario?: SimulationScenario; error?: string }> {
    try {
      const scenario = await this.getScenario(scenarioId);
      
      // Check if overlay already exists
      const existingOverlay = scenario.overlays.find(o => o.overlayId === overlayId);
      if (existingOverlay) {
        return { success: false, error: 'Overlay already exists in scenario' };
      }

      const newOverlay: OverlayConfiguration = {
        id: `overlay_${Date.now()}`,
        overlayId,
        weight,
        isEnabled: true,
        parameters: {},
        exclusions: [],
        conditions: [],
        position,
        zIndex: scenario.overlays.length + 1
      };

      const updatedScenario = await this.updateScenario(scenarioId, {
        overlays: [...scenario.overlays, newOverlay]
      });

      return { success: true, scenario: updatedScenario };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleOverlayRemove(
    scenarioId: string,
    overlayConfigId: string
  ): Promise<{ success: boolean; scenario?: SimulationScenario; error?: string }> {
    try {
      const scenario = await this.getScenario(scenarioId);
      
      const updatedScenario = await this.updateScenario(scenarioId, {
        overlays: scenario.overlays.filter(o => o.id !== overlayConfigId)
      });

      return { success: true, scenario: updatedScenario };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleOverlayWeightChange(
    scenarioId: string,
    overlayConfigId: string,
    newWeight: number
  ): Promise<{ success: boolean; scenario?: SimulationScenario; error?: string }> {
    try {
      const scenario = await this.getScenario(scenarioId);
      
      const updatedOverlays = scenario.overlays.map(overlay => 
        overlay.id === overlayConfigId 
          ? { ...overlay, weight: newWeight }
          : overlay
      );

      const updatedScenario = await this.updateScenario(scenarioId, {
        overlays: updatedOverlays
      });

      return { success: true, scenario: updatedScenario };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleExclusionDrop(
    scenarioId: string,
    assetId: string
  ): Promise<{ success: boolean; scenario?: SimulationScenario; error?: string }> {
    try {
      const scenario = await this.getScenario(scenarioId);
      
      if (scenario.exclusions.includes(assetId)) {
        return { success: false, error: 'Asset already excluded' };
      }

      const updatedScenario = await this.updateScenario(scenarioId, {
        exclusions: [...scenario.exclusions, assetId]
      });

      return { success: true, scenario: updatedScenario };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleSimulationRun(
    scenarioId: string,
    realTime: boolean = false
  ): Promise<{ success: boolean; result?: SimulationResult; error?: string }> {
    try {
      const result = realTime 
        ? await this.runRealTimeSimulation(scenarioId)
        : await this.runSimulation(scenarioId);
      
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async handleScenarioRevert(
    scenarioId: string,
    snapshotId?: string
  ): Promise<{ success: boolean; scenario?: SimulationScenario; error?: string }> {
    try {
      if (snapshotId) {
        const scenario = await this.revertToSnapshot(snapshotId);
        return { success: true, scenario };
      } else {
        // Revert to baseline/empty scenario
        const scenario = await this.updateScenario(scenarioId, {
          overlays: [],
          exclusions: []
        });
        return { success: true, scenario };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Utility Methods
  private async getScenario(scenarioId: string): Promise<SimulationScenario> {
    const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scenario');
    }
    return response.json();
  }

  createDefaultScenario(
    name: string,
    userId: string,
    vaultId: string,
    description: string = ''
  ): Omit<SimulationScenario, 'id' | 'createdAt' | 'lastModified'> {
    return {
      name,
      description,
      userId,
      vaultId,
      overlays: [],
      exclusions: [],
      isActive: true,
      isBaselineSnapshot: false,
      tags: []
    };
  }

  createDefaultOverlayConfiguration(
    overlayId: string,
    position: { x: number; y: number } = { x: 0, y: 0 },
    weight: number = 1.0
  ): OverlayConfiguration {
    return {
      id: `overlay_${Date.now()}`,
      overlayId,
      weight,
      isEnabled: true,
      parameters: {},
      exclusions: [],
      conditions: [],
      position,
      zIndex: 1
    };
  }

  getOverlayCategoryColor(category: OverlayType['category']): string {
    switch (category) {
      case 'signal': return 'text-blue-600';
      case 'sentiment': return 'text-green-600';
      case 'risk': return 'text-red-600';
      case 'macro': return 'text-purple-600';
      case 'technical': return 'text-orange-600';
      case 'fundamental': return 'text-indigo-600';
      case 'volatility': return 'text-yellow-600';
      case 'momentum': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  }

  getOverlayComplexityColor(complexity: OverlayType['complexity']): string {
    switch (complexity) {
      case 'basic': return 'text-green-600';
      case 'intermediate': return 'text-yellow-600';
      case 'advanced': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  calculateWeightValidation(overlays: OverlayConfiguration[]): {
    isValid: boolean;
    totalWeight: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const totalWeight = overlays.reduce((sum, overlay) => sum + overlay.weight, 0);
    
    if (totalWeight > 2.0) {
      errors.push('Total overlay weight exceeds 200%');
    }
    
    if (totalWeight > 1.5) {
      warnings.push('Total overlay weight is high (>150%)');
    }
    
    overlays.forEach(overlay => {
      if (overlay.weight < 0) {
        errors.push(`Overlay ${overlay.overlayId} has negative weight`);
      }
      if (overlay.weight > 1.5) {
        warnings.push(`Overlay ${overlay.overlayId} has high weight (>150%)`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      totalWeight,
      errors,
      warnings
    };
  }

  getPerformanceColor(value: number, isImprovement: boolean): string {
    if (isImprovement) {
      return value > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return value > 0 ? 'text-red-600' : 'text-green-600';
    }
  }

  getRiskLevelColor(riskLevel: RiskMetric['riskLevel']): string {
    switch (riskLevel) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'extreme': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  validateScenario(scenario: SimulationScenario): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scenario.name.trim()) {
      errors.push('Scenario name is required');
    }

    if (!scenario.userId) {
      errors.push('User ID is required');
    }

    if (!scenario.vaultId) {
      errors.push('Vault ID is required');
    }

    const weightValidation = this.calculateWeightValidation(scenario.overlays);
    if (!weightValidation.isValid) {
      errors.push(...weightValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-47-overlay-simulation-sandbox',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const overlaySimulationSandboxService = new OverlaySimulationSandboxService();

// React Query hooks
export const useAvailableOverlays = () => {
  return useQuery({
    queryKey: ['/api/simulation/overlay/overlays'],
    queryFn: () => overlaySimulationSandboxService.getAvailableOverlays(),
    staleTime: 300000, // 5 minutes
  });
};

export const useSimulationScenarios = (userId: string, vaultId: string) => {
  return useQuery({
    queryKey: ['/api/simulation/overlay/scenarios', userId, vaultId],
    queryFn: () => overlaySimulationSandboxService.getScenarios(userId, vaultId),
    enabled: !!userId && !!vaultId,
    staleTime: 60000, // 1 minute
  });
};

export const useCreateScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'lastModified'>) =>
      overlaySimulationSandboxService.createScenario(scenario),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/overlay/scenarios', data.userId, data.vaultId] });
    },
  });
};

export const useUpdateScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scenarioId, updates }: { scenarioId: string; updates: Partial<SimulationScenario> }) =>
      overlaySimulationSandboxService.updateScenario(scenarioId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/overlay/scenarios', data.userId, data.vaultId] });
    },
  });
};

export const useDeleteScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scenarioId: string) => overlaySimulationSandboxService.deleteScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/overlay/scenarios'] });
    },
  });
};

export const useRunSimulation = () => {
  return useMutation({
    mutationFn: ({ scenarioId, realTime }: { scenarioId: string; realTime?: boolean }) =>
      realTime 
        ? overlaySimulationSandboxService.runRealTimeSimulation(scenarioId)
        : overlaySimulationSandboxService.runSimulation(scenarioId),
  });
};

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scenarioId, name, description, isBaseline }: { 
      scenarioId: string; 
      name: string; 
      description: string; 
      isBaseline?: boolean 
    }) => overlaySimulationSandboxService.createSnapshot(scenarioId, name, description, isBaseline),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/overlay/snapshots', data.scenarioId] });
    },
  });
};

export const useSnapshots = (scenarioId: string) => {
  return useQuery({
    queryKey: ['/api/simulation/overlay/snapshots', scenarioId],
    queryFn: () => overlaySimulationSandboxService.getSnapshots(scenarioId),
    enabled: !!scenarioId,
  });
};

export const useRevertToSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (snapshotId: string) => overlaySimulationSandboxService.revertToSnapshot(snapshotId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/simulation/overlay/scenarios', data.userId, data.vaultId] });
    },
  });
};

export const useCompareScenarios = () => {
  return useMutation({
    mutationFn: (scenarioIds: string[]) => overlaySimulationSandboxService.compareScenarios(scenarioIds),
  });
};

export const useImpactAnalysis = (scenarioId: string) => {
  return useQuery({
    queryKey: ['/api/simulation/overlay/impact', scenarioId],
    queryFn: () => overlaySimulationSandboxService.getImpactAnalysis(scenarioId),
    enabled: !!scenarioId,
  });
}; 