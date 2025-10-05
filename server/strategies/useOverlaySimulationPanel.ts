// Block 26: Overlay Simulation Panel - Hook
// React hook for overlay simulation panel management

import { useState, useEffect, useCallback } from 'react';
import { OverlaySimulationPanelEngine } from '../engines/OverlaySimulationPanelEngine';
import { useOverlaySimulationPanelStore } from '../store/overlaySimulationPanelStore';
import {
  SimulationPanel,
  SimulationWidget,
  SimulationData,
  PanelConfig,
  PanelLayout,
  WidgetType,
  DataSource,
  DataFilter,
  ChartType
} from '../types/overlaySimulationPanel';

export const useOverlaySimulationPanel = () => {
  const engine = OverlaySimulationPanelEngine.getInstance();
  const store = useOverlaySimulationPanelStore();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Initialize
  useEffect(() => {
    const initializeStore = async () => {
      try {
        setLoading(true);
        
        const panels = engine.getAllPanels();
        store.setPanels(panels);
        
        const simulations = engine.getAllSimulations();
        store.setSimulations(simulations);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    initializeStore();
  }, []);

  // Panel Management
  const createPanel = useCallback(async (
    config: Omit<SimulationPanel, 'id' | 'createdAt' | 'updatedAt' | 'lastRefresh'>
  ): Promise<SimulationPanel> => {
    try {
      setLoading(true);
      setError(null);

      const panel = engine.createPanel(config);
      store.addPanel(panel);

      return panel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePanel = useCallback(async (
    id: string,
    updates: Partial<SimulationPanel>
  ): Promise<SimulationPanel> => {
    try {
      setLoading(true);
      setError(null);

      const panel = engine.updatePanel(id, updates);
      store.updatePanel(id, panel);

      return panel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePanel = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = engine.deletePanel(id);
      if (success) {
        store.removePanel(id);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clonePanel = useCallback(async (id: string, name?: string): Promise<SimulationPanel> => {
    try {
      setLoading(true);
      setError(null);

      const panel = engine.clonePanel(id, name);
      store.addPanel(panel);

      return panel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Widget Management
  const createWidget = useCallback(async (
    widget: Omit<SimulationWidget, 'id' | 'createdAt' | 'updatedAt' | 'lastRefresh'>
  ): Promise<SimulationWidget> => {
    try {
      setLoading(true);
      setError(null);

      const newWidget = engine.createWidget(widget);
      store.addWidget(newWidget);

      return newWidget;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create widget';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWidget = useCallback(async (
    id: string,
    updates: Partial<SimulationWidget>
  ): Promise<SimulationWidget> => {
    try {
      setLoading(true);
      setError(null);

      const widget = engine.updateWidget(id, updates);
      store.updateWidget(id, widget);

      return widget;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update widget';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteWidget = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = engine.deleteWidget(id);
      if (success) {
        store.removeWidget(id);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete widget';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshWidget = useCallback(async (id: string): Promise<void> => {
    try {
      setRefreshing(true);
      setError(null);

      await engine.refreshWidget(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh widget';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Layout Management
  const updateLayout = useCallback(async (
    panelId: string,
    layout: PanelLayout
  ): Promise<SimulationPanel> => {
    try {
      setLoading(true);
      setError(null);

      const panel = engine.updateLayout(panelId, layout);
      store.updatePanel(panelId, panel);

      return panel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update layout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveLayout = useCallback(async (panelId: string, name: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      engine.saveLayout(panelId, name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save layout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLayout = useCallback(async (panelId: string, name: string): Promise<SimulationPanel> => {
    try {
      setLoading(true);
      setError(null);

      const panel = engine.loadLayout(panelId, name);
      store.updatePanel(panelId, panel);

      return panel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load layout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Data Management
  const loadData = useCallback(async (
    dataSource: DataSource,
    filters?: DataFilter[]
  ): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      return await engine.loadData(dataSource, filters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPanel = useCallback(async (panelId: string): Promise<void> => {
    try {
      setRefreshing(true);
      setError(null);

      await engine.refreshPanel(panelId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Simulation Management
  const runSimulation = useCallback(async (parameters: any): Promise<SimulationData> => {
    try {
      setLoading(true);
      setError(null);

      const simulation = await engine.runSimulation(parameters);
      store.addSimulation(simulation);

      return simulation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run simulation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chart Generation
  const generateChart = useCallback((
    type: ChartType,
    data: any[],
    config: any
  ): any => {
    try {
      return engine.generateChart(type, data, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate chart';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Export Functions
  const exportPanel = useCallback(async (
    panelId: string,
    format: string
  ): Promise<Blob> => {
    try {
      setExporting(true);
      setError(null);

      return await engine.exportPanel(panelId, format);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export panel';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, []);

  // Event Handlers
  const addEventListener = useCallback((event: string, handler: Function): void => {
    engine.on(event, handler);
  }, []);

  const removeEventListener = useCallback((event: string, handler: Function): void => {
    engine.off(event, handler);
  }, []);

  // Utilities
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAll = useCallback(async (): Promise<void> => {
    try {
      setRefreshing(true);
      setError(null);

      const panels = engine.getAllPanels();
      store.setPanels(panels);

      const simulations = engine.getAllSimulations();
      store.setSimulations(simulations);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Store data
  const panels = store.panels;
  const widgets = store.widgets;
  const simulations = store.simulations;
  const selectedPanel = store.selectedPanel;
  const selectedWidget = store.selectedWidget;
  const selectedSimulation = store.selectedSimulation;

  // Filtered data
  const activePanels = panels.filter(p => p.isActive);
  const visiblePanels = panels.filter(p => p.isVisible);
  const runningSimulations = simulations.filter(s => s.status === 'running');
  const completedSimulations = simulations.filter(s => s.status === 'completed');

  return {
    // State
    loading,
    error,
    refreshing,
    exporting,

    // Data
    panels,
    widgets,
    simulations,
    selectedPanel,
    selectedWidget,
    selectedSimulation,

    // Filtered data
    activePanels,
    visiblePanels,
    runningSimulations,
    completedSimulations,

    // Panel actions
    createPanel,
    updatePanel,
    deletePanel,
    clonePanel,

    // Widget actions
    createWidget,
    updateWidget,
    deleteWidget,
    refreshWidget,

    // Layout actions
    updateLayout,
    saveLayout,
    loadLayout,

    // Data actions
    loadData,
    refreshPanel,

    // Simulation actions
    runSimulation,

    // Chart actions
    generateChart,

    // Export actions
    exportPanel,

    // Event handlers
    addEventListener,
    removeEventListener,

    // Utilities
    clearError,
    refreshAll,

    // Store actions
    setSelectedPanel: store.setSelectedPanel,
    setSelectedWidget: store.setSelectedWidget,
    setSelectedSimulation: store.setSelectedSimulation,
    setView: store.setView,
    setFilter: store.setFilter,
    setSort: store.setSort
  };
};

// Specialized hooks
export const usePanelManagement = () => {
  const {
    panels,
    selectedPanel,
    createPanel,
    updatePanel,
    deletePanel,
    clonePanel,
    setSelectedPanel,
    loading,
    error,
    clearError
  } = useOverlaySimulationPanel();

  return {
    panels,
    selectedPanel,
    createPanel,
    updatePanel,
    deletePanel,
    clonePanel,
    setSelectedPanel,
    loading,
    error,
    clearError
  };
};

export const useWidgetManagement = () => {
  const {
    widgets,
    selectedWidget,
    createWidget,
    updateWidget,
    deleteWidget,
    refreshWidget,
    setSelectedWidget,
    loading,
    error,
    clearError
  } = useOverlaySimulationPanel();

  return {
    widgets,
    selectedWidget,
    createWidget,
    updateWidget,
    deleteWidget,
    refreshWidget,
    setSelectedWidget,
    loading,
    error,
    clearError
  };
};

export const useSimulationManagement = () => {
  const {
    simulations,
    selectedSimulation,
    runSimulation,
    runningSimulations,
    completedSimulations,
    setSelectedSimulation,
    loading,
    error,
    clearError
  } = useOverlaySimulationPanel();

  return {
    simulations,
    selectedSimulation,
    runSimulation,
    runningSimulations,
    completedSimulations,
    setSelectedSimulation,
    loading,
    error,
    clearError
  };
};

export const useChartGeneration = () => {
  const {
    generateChart,
    error,
    clearError
  } = useOverlaySimulationPanel();

  return {
    generateChart,
    error,
    clearError
  };
};

export const usePanelExport = () => {
  const {
    exportPanel,
    exporting,
    error,
    clearError
  } = useOverlaySimulationPanel();

  return {
    exportPanel,
    exporting,
    error,
    clearError
  };
}; 