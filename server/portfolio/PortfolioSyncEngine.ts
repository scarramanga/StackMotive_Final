// Block 78: Portfolio Sync Engine - Engine
// Real-time Portfolio Synchronization with External Brokers

import {
  PortfolioSyncEngine,
  SyncConfiguration,
  BrokerConnection,
  SyncStatus,
  SyncRecord,
  SyncOperationRequest,
  SyncOperationResponse,
  SyncConflict,
  PortfolioSyncFilter,
  SyncStatusType,
  SyncMode,
  BrokerType,
  SyncDataType,
  ConflictStrategy,
  ValidationRule,
  SyncIssue
} from '../types/portfolioSyncEngine';

export class PortfolioSyncEngineManager {
  private static instance: PortfolioSyncEngineManager;
  private engines: Map<string, PortfolioSyncEngine> = new Map();
  private activeOperations: Map<string, AbortController> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastUpdate = new Date();

  private constructor() {
    this.initializeManager();
  }

  public static getInstance(): PortfolioSyncEngineManager {
    if (!PortfolioSyncEngineManager.instance) {
      PortfolioSyncEngineManager.instance = new PortfolioSyncEngineManager();
    }
    return PortfolioSyncEngineManager.instance;
  }

  private initializeManager(): void {
    // Initialize with mock data
    this.createMockEngines();
    
    // Setup global monitoring
    this.setupGlobalMonitoring();
  }

  // Core Engine Operations
  public createEngine(config: Omit<PortfolioSyncEngine, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): PortfolioSyncEngine {
    const newEngine: PortfolioSyncEngine = {
      ...config,
      id: this.generateId(),
      userId: this.getCurrentUserId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Initialize engine state
    this.initializeEngineState(newEngine);
    
    this.engines.set(newEngine.id, newEngine);
    return newEngine;
  }

  public updateEngine(id: string, updates: Partial<PortfolioSyncEngine>): PortfolioSyncEngine {
    const existingEngine = this.engines.get(id);
    if (!existingEngine) {
      throw new Error(`Sync engine with id ${id} not found`);
    }

    const updatedEngine = {
      ...existingEngine,
      ...updates,
      updatedAt: new Date()
    };

    this.engines.set(id, updatedEngine);
    return updatedEngine;
  }

  public deleteEngine(id: string): void {
    if (!this.engines.has(id)) {
      throw new Error(`Sync engine with id ${id} not found`);
    }
    
    // Stop any active operations
    this.cancelSync(id);
    this.stopMonitoring(id);
    
    this.engines.delete(id);
  }

  public getEngine(id: string): PortfolioSyncEngine | undefined {
    return this.engines.get(id);
  }

  public getEngines(): PortfolioSyncEngine[] {
    return Array.from(this.engines.values());
  }

  // Sync Operations
  public async startSync(request: SyncOperationRequest): Promise<SyncOperationResponse> {
    try {
      const engine = this.engines.get(request.engineId);
      if (!engine) {
        throw new Error('Sync engine not found');
      }

      // Check if already syncing
      if (engine.syncStatus.overallStatus === 'syncing') {
        throw new Error('Sync already in progress');
      }

      // Validate configuration
      this.validateSyncRequest(request, engine);

      // Create abort controller for this operation
      const abortController = new AbortController();
      const operationId = this.generateId();
      this.activeOperations.set(operationId, abortController);

      // Update engine status
      this.updateEngineStatus(request.engineId, 'syncing', 'Starting sync operation');

      // Start sync process
      this.executeSyncOperation(request, operationId, abortController.signal);

      return {
        success: true,
        operationId,
        status: 'syncing',
        estimatedCompletion: this.calculateEstimatedCompletion(engine)
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Sync failed to start']
      };
    }
  }

  public async pauseSync(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }

    this.updateEngineStatus(engineId, 'paused', 'Sync paused by user');
  }

  public async resumeSync(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }

    this.updateEngineStatus(engineId, 'syncing', 'Sync resumed');
  }

  public async cancelSync(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }

    // Find and abort active operations
    for (const [operationId, controller] of this.activeOperations.entries()) {
      if (operationId.startsWith(engineId)) {
        controller.abort();
        this.activeOperations.delete(operationId);
      }
    }

    this.updateEngineStatus(engineId, 'cancelled', 'Sync cancelled by user');
  }

  // Broker Operations
  public async connectBroker(engineId: string, brokerConfig: BrokerConnection): Promise<BrokerConnection> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }

    // Test connection
    const connectionTest = await this.testBrokerConnection(brokerConfig);
    if (!connectionTest.success) {
      throw new Error(`Broker connection failed: ${connectionTest.error}`);
    }

    // Add broker to engine
    const updatedBrokers = [...engine.brokerConnections, brokerConfig];
    this.updateEngine(engineId, { brokerConnections: updatedBrokers });

    return brokerConfig;
  }

  public async disconnectBroker(engineId: string, brokerId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }

    const updatedBrokers = engine.brokerConnections.filter(broker => broker.id !== brokerId);
    this.updateEngine(engineId, { brokerConnections: updatedBrokers });
  }

  public async testBrokerConnection(brokerConfig: BrokerConnection): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate broker connection test
      const testResult = await this.simulateBrokerConnection(brokerConfig);
      return { success: testResult };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  // Monitoring and Status
  public getSyncStatus(engineId: string): SyncStatus {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }
    return engine.syncStatus;
  }

  public getSyncHistory(engineId: string, limit: number = 50): SyncRecord[] {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }
    
    return engine.syncHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  public getActiveIssues(engineId: string): SyncIssue[] {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }
    
    return engine.syncStatus.activeIssues.filter(issue => issue.status === 'open');
  }

  // Conflict Resolution
  public async resolveConflict(conflictId: string, resolution: ConflictStrategy): Promise<void> {
    // Find conflict across all engines
    for (const engine of this.engines.values()) {
      const conflict = this.findConflictInEngine(engine, conflictId);
      if (conflict) {
        await this.applyConflictResolution(conflict, resolution);
        return;
      }
    }
    throw new Error('Conflict not found');
  }

  public getPendingConflicts(engineId: string): SyncConflict[] {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error('Sync engine not found');
    }
    
    // Mock implementation - would integrate with actual conflict detection
    return this.generateMockConflicts(engineId);
  }

  // Real-time Monitoring
  public startMonitoring(engineId: string): void {
    if (this.monitoringIntervals.has(engineId)) {
      return; // Already monitoring
    }

    const interval = setInterval(() => {
      this.performMonitoringCheck(engineId);
    }, 30000); // 30 second intervals

    this.monitoringIntervals.set(engineId, interval);
  }

  public stopMonitoring(engineId: string): void {
    const interval = this.monitoringIntervals.get(engineId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(engineId);
    }
  }

  // Filtering
  public filterEngines(engines: PortfolioSyncEngine[], filter: PortfolioSyncFilter): PortfolioSyncEngine[] {
    return engines.filter(engine => {
      // Sync status filter
      if (filter.syncStatus && filter.syncStatus.length > 0) {
        if (!filter.syncStatus.includes(engine.syncStatus.overallStatus)) return false;
      }

      // Broker types filter
      if (filter.brokerTypes && filter.brokerTypes.length > 0) {
        const engineBrokerTypes = engine.brokerConnections.map(broker => broker.brokerType);
        if (!filter.brokerTypes.some(type => engineBrokerTypes.includes(type))) return false;
      }

      // Sync modes filter
      if (filter.syncModes && filter.syncModes.length > 0) {
        if (!filter.syncModes.includes(engine.syncConfig.syncMode)) return false;
      }

      // Date filters
      if (filter.lastSyncAfter && engine.lastSuccessfulSync < filter.lastSyncAfter) return false;
      if (filter.lastSyncBefore && engine.lastSuccessfulSync > filter.lastSyncBefore) return false;

      // Performance filters
      if (filter.errorRateThreshold !== undefined) {
        const errorRate = this.calculateErrorRate(engine);
        if (errorRate > filter.errorRateThreshold) return false;
      }

      // Status filters
      if (filter.hasActiveIssues !== undefined) {
        const hasIssues = engine.syncStatus.activeIssues.length > 0;
        if (filter.hasActiveIssues !== hasIssues) return false;
      }

      // Search term
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        const matchesName = engine.engineName.toLowerCase().includes(searchLower);
        const matchesDesc = engine.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }

  // Private Methods
  private initializeEngineState(engine: PortfolioSyncEngine): void {
    // Initialize sync status
    engine.syncStatus = this.createInitialSyncStatus();
    
    // Initialize performance metrics
    engine.performanceMetrics = this.createInitialPerformanceMetrics();
    
    // Set up default sync history
    engine.syncHistory = [];
  }

  private createInitialSyncStatus(): SyncStatus {
    return {
      overallStatus: 'idle',
      statusMessage: 'Ready for synchronization',
      progress: {
        overallProgress: 0,
        brokerProgress: [],
        dataTypeProgress: [],
        estimatedCompletion: new Date(),
        estimatedDuration: 0
      },
      stats: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalRecords: 0,
        newRecords: 0,
        updatedRecords: 0,
        deletedRecords: 0,
        duplicateRecords: 0,
        avgSyncDuration: 0,
        avgRecordsPerSecond: 0,
        totalDataSynced: 0,
        lastHour: { syncCount: 0, recordCount: 0, errorCount: 0, dataVolume: 0, avgDuration: 0 },
        lastDay: { syncCount: 0, recordCount: 0, errorCount: 0, dataVolume: 0, avgDuration: 0 },
        lastWeek: { syncCount: 0, recordCount: 0, errorCount: 0, dataVolume: 0, avgDuration: 0 },
        lastMonth: { syncCount: 0, recordCount: 0, errorCount: 0, dataVolume: 0, avgDuration: 0 }
      },
      activeIssues: [],
      lastSyncSummary: this.createEmptySyncSummary()
    };
  }

  private createInitialPerformanceMetrics() {
    return {
      recordsPerSecond: 0,
      bytesPerSecond: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      dataQualityScore: 95,
      validationPassRate: 98,
      syncSuccessRate: 95,
      connectionStability: 98,
      performanceTrends: []
    };
  }

  private createEmptySyncSummary() {
    return {
      syncId: '',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'idle' as SyncStatusType,
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      dataTypeSummary: [],
      brokerSummary: [],
      issuesEncountered: [],
      performanceMetrics: this.createInitialPerformanceMetrics()
    };
  }

  private validateSyncRequest(request: SyncOperationRequest, engine: PortfolioSyncEngine): void {
    // Validate broker connections
    if (request.brokerIds && request.brokerIds.length > 0) {
      const availableBrokerIds = engine.brokerConnections.map(b => b.id);
      const invalidBrokers = request.brokerIds.filter(id => !availableBrokerIds.includes(id));
      if (invalidBrokers.length > 0) {
        throw new Error(`Invalid broker IDs: ${invalidBrokers.join(', ')}`);
      }
    }

    // Validate data types
    if (request.dataTypes && request.dataTypes.length === 0) {
      throw new Error('At least one data type must be specified');
    }

    // Check engine configuration
    if (!engine.syncConfig.enableRealTimeSync && request.operationType === 'delta_sync') {
      throw new Error('Real-time sync is not enabled for delta synchronization');
    }
  }

  private updateEngineStatus(engineId: string, status: SyncStatusType, message: string): void {
    const engine = this.engines.get(engineId);
    if (engine) {
      engine.syncStatus.overallStatus = status;
      engine.syncStatus.statusMessage = message;
      engine.updatedAt = new Date();
      
      if (status === 'completed' || status === 'failed') {
        engine.lastSyncAttempt = new Date();
        if (status === 'completed') {
          engine.lastSuccessfulSync = new Date();
        }
      }
    }
  }

  private async executeSyncOperation(
    request: SyncOperationRequest, 
    operationId: string, 
    signal: AbortSignal
  ): Promise<void> {
    try {
      const engine = this.engines.get(request.engineId);
      if (!engine) return;

      // Simulate sync process
      const syncSteps = this.planSyncSteps(request, engine);
      
      for (let i = 0; i < syncSteps.length; i++) {
        if (signal.aborted) {
          this.updateEngineStatus(request.engineId, 'cancelled', 'Sync cancelled');
          return;
        }

        const step = syncSteps[i];
        await this.executeSyncStep(step, request.engineId);
        
        // Update progress
        const progress = ((i + 1) / syncSteps.length) * 100;
        this.updateSyncProgress(request.engineId, progress);
        
        // Simulate processing time
        await this.delay(1000);
      }

      // Complete sync
      this.completeSyncOperation(request.engineId, operationId);
      
    } catch (error) {
      this.handleSyncError(request.engineId, error);
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  private planSyncSteps(request: SyncOperationRequest, engine: PortfolioSyncEngine): SyncStep[] {
    const steps: SyncStep[] = [];
    
    // Add broker connection steps
    const brokerIds = request.brokerIds || engine.brokerConnections.map(b => b.id);
    brokerIds.forEach(brokerId => {
      steps.push({ type: 'connect_broker', brokerId, dataType: null });
    });

    // Add data sync steps
    const dataTypes = request.dataTypes || ['holdings', 'transactions', 'balances'];
    dataTypes.forEach(dataType => {
      brokerIds.forEach(brokerId => {
        steps.push({ type: 'sync_data', brokerId, dataType });
      });
    });

    // Add validation step
    steps.push({ type: 'validate', brokerId: null, dataType: null });

    return steps;
  }

  private async executeSyncStep(step: SyncStep, engineId: string): Promise<void> {
    switch (step.type) {
      case 'connect_broker':
        await this.simulateBrokerConnection(step.brokerId!);
        break;
      case 'sync_data':
        await this.simulateDataSync(step.brokerId!, step.dataType!);
        break;
      case 'validate':
        await this.simulateValidation(engineId);
        break;
    }
  }

  private updateSyncProgress(engineId: string, progress: number): void {
    const engine = this.engines.get(engineId);
    if (engine) {
      engine.syncStatus.progress.overallProgress = progress;
      engine.syncStatus.statusMessage = `Sync in progress: ${progress.toFixed(0)}%`;
    }
  }

  private completeSyncOperation(engineId: string, operationId: string): void {
    const engine = this.engines.get(engineId);
    if (!engine) return;

    // Create sync record
    const syncRecord: SyncRecord = {
      id: this.generateId(),
      syncId: operationId,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date(),
      duration: 60,
      syncMode: engine.syncConfig.syncMode,
      brokersInvolved: engine.brokerConnections.map(b => b.id),
      dataTypesInvolved: ['holdings', 'transactions'],
      status: 'completed',
      recordsProcessed: 150,
      recordsSuccessful: 148,
      recordsFailed: 2,
      avgProcessingTime: 100,
      dataVolume: 2.5,
      issuesCount: 1,
      criticalIssuesCount: 0,
      triggeredBy: 'manual',
      triggeredAt: new Date(Date.now() - 60000),
      completedAt: new Date()
    };

    // Update engine
    engine.syncHistory.unshift(syncRecord);
    if (engine.syncHistory.length > 100) {
      engine.syncHistory = engine.syncHistory.slice(0, 100);
    }

    this.updateEngineStatus(engineId, 'completed', 'Sync completed successfully');
  }

  private handleSyncError(engineId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    this.updateEngineStatus(engineId, 'failed', `Sync failed: ${errorMessage}`);
    
    // Create error issue
    const issue: SyncIssue = {
      issueId: this.generateId(),
      issueType: 'system_error',
      severity: 'error',
      title: 'Sync Operation Failed',
      description: errorMessage,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      occurrenceCount: 1,
      status: 'open',
      resolutionSteps: ['Check broker connections', 'Verify credentials', 'Retry sync'],
      impactLevel: 'medium',
      affectedRecords: 0
    };

    const engine = this.engines.get(engineId);
    if (engine) {
      engine.syncStatus.activeIssues.push(issue);
    }
  }

  private calculateEstimatedCompletion(engine: PortfolioSyncEngine): Date {
    // Base estimate on historical performance
    const avgDuration = engine.syncStatus.stats.avgSyncDuration || 300; // 5 minutes default
    return new Date(Date.now() + avgDuration * 1000);
  }

  private calculateErrorRate(engine: PortfolioSyncEngine): number {
    const stats = engine.syncStatus.stats;
    if (stats.totalSyncs === 0) return 0;
    return (stats.failedSyncs / stats.totalSyncs) * 100;
  }

  private async simulateBrokerConnection(brokerConfig: BrokerConnection | string): Promise<boolean> {
    // Simulate connection test
    await this.delay(500);
    return Math.random() > 0.1; // 90% success rate
  }

  private async simulateDataSync(brokerId: string, dataType: SyncDataType): Promise<void> {
    // Simulate data synchronization
    await this.delay(1000);
  }

  private async simulateValidation(engineId: string): Promise<void> {
    // Simulate validation
    await this.delay(500);
  }

  private findConflictInEngine(engine: PortfolioSyncEngine, conflictId: string): SyncConflict | null {
    // Mock implementation
    return null;
  }

  private async applyConflictResolution(conflict: SyncConflict, resolution: ConflictStrategy): Promise<void> {
    // Mock implementation
    await this.delay(100);
  }

  private generateMockConflicts(engineId: string): SyncConflict[] {
    return [];
  }

  private performMonitoringCheck(engineId: string): void {
    const engine = this.engines.get(engineId);
    if (!engine) return;

    // Update performance metrics
    this.updatePerformanceMetrics(engine);
    
    // Check for issues
    this.detectIssues(engine);
  }

  private updatePerformanceMetrics(engine: PortfolioSyncEngine): void {
    // Simulate metric updates
    engine.performanceMetrics.recordsPerSecond = 50 + Math.random() * 20;
    engine.performanceMetrics.avgResponseTime = 200 + Math.random() * 100;
    engine.performanceMetrics.cpuUsage = 20 + Math.random() * 30;
    engine.performanceMetrics.memoryUsage = 100 + Math.random() * 50;
  }

  private detectIssues(engine: PortfolioSyncEngine): void {
    // Mock issue detection
    if (Math.random() > 0.95) { // 5% chance of detecting an issue
      const issue: SyncIssue = {
        issueId: this.generateId(),
        issueType: 'connection_error',
        severity: 'warning',
        title: 'Intermittent Connection Issues',
        description: 'Experiencing temporary connection issues with broker',
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        occurrenceCount: 1,
        status: 'open',
        resolutionSteps: ['Check network connectivity', 'Verify broker status'],
        impactLevel: 'low',
        affectedRecords: 0
      };
      
      engine.syncStatus.activeIssues.push(issue);
    }
  }

  private setupGlobalMonitoring(): void {
    // Setup global monitoring tasks
    setInterval(() => {
      this.performGlobalHealthCheck();
    }, 60000); // Every minute
  }

  private performGlobalHealthCheck(): void {
    // Check all engines for health issues
    for (const engine of this.engines.values()) {
      if (engine.isActive) {
        this.checkEngineHealth(engine);
      }
    }
  }

  private checkEngineHealth(engine: PortfolioSyncEngine): void {
    // Health check logic
    const timeSinceLastSync = Date.now() - engine.lastSuccessfulSync.getTime();
    const maxInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    if (timeSinceLastSync > maxInterval && engine.syncConfig.syncMode === 'automatic') {
      // Engine hasn't synced in 24 hours
      const issue: SyncIssue = {
        issueId: this.generateId(),
        issueType: 'system_error',
        severity: 'warning',
        title: 'Sync Overdue',
        description: 'Engine has not synced in over 24 hours',
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        occurrenceCount: 1,
        status: 'open',
        resolutionSteps: ['Check engine configuration', 'Review sync schedule'],
        impactLevel: 'medium',
        affectedRecords: 0
      };
      
      engine.syncStatus.activeIssues.push(issue);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `sync_engine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    // TODO: Get from auth context
    return 'user_123';
  }

  // Mock Data Creation
  private createMockEngines(): void {
    const mockEngine = this.createMockEngine();
    this.engines.set(mockEngine.id, mockEngine);
  }

  private createMockEngine(): PortfolioSyncEngine {
    const engineId = this.generateId();
    
    const mockEngine: PortfolioSyncEngine = {
      id: engineId,
      userId: 'user_123',
      engineName: 'Primary Portfolio Sync',
      description: 'Main synchronization engine for AU broker accounts',
      syncConfig: this.createMockSyncConfig(),
      brokerConnections: this.createMockBrokerConnections(),
      syncStatus: this.createInitialSyncStatus(),
      lastSyncAttempt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      lastSuccessfulSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      syncHistory: [],
      conflictResolution: this.createMockConflictResolution(),
      errorHandling: this.createMockErrorHandling(),
      performanceMetrics: this.createInitialPerformanceMetrics(),
      syncSchedule: this.createMockSyncSchedule(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return mockEngine;
  }

  private createMockSyncConfig(): SyncConfiguration {
    return {
      syncMode: 'automatic',
      direction: 'bidirectional',
      frequency: 'hourly',
      enableRealTimeSync: true,
      realTimeSyncInterval: 30000,
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 5000,
      syncHoldings: true,
      syncTransactions: true,
      syncBalances: true,
      syncDividends: true,
      syncCorporateActions: false,
      syncFilters: [],
      enableValidation: true,
      validationRules: [],
      enableAUNZTaxSync: true,
      syncFrankingCredits: true,
      syncFIFTaxCalculations: false,
      notifyOnSync: true,
      notifyOnErrors: true,
      notificationChannels: ['email', 'push']
    };
  }

  private createMockBrokerConnections(): BrokerConnection[] {
    return [
      {
        id: 'broker_commsec_001',
        brokerName: 'CommSec',
        brokerType: 'commsec',
        connectionConfig: {
          baseUrl: 'https://api.commsec.com.au',
          apiVersion: 'v1',
          timeout: 30000,
          rateLimits: [],
          maxConnections: 5,
          connectionTimeout: 10000,
          sslVerification: true
        },
        connectionStatus: 'connected',
        authConfig: {
          authType: 'oauth2',
          credentials: {
            clientId: 'cs_client_123',
            accessToken: 'token_123'
          },
          encryptCredentials: true,
          refreshRequired: false
        },
        apiConfig: {
          endpoints: [],
          requestFormat: 'json',
          responseFormat: 'json',
          paginationConfig: {
            type: 'page',
            pageSize: 50,
            maxPages: 100,
            pageParam: 'page',
            limitParam: 'limit',
            offsetParam: 'offset',
            totalField: 'total',
            pageField: 'page',
            dataField: 'data'
          },
          errorMapping: [],
          fieldMapping: []
        },
        syncSettings: {
          syncPriority: 'high',
          dataTypes: ['holdings', 'transactions', 'balances'],
          syncWindow: {
            startTime: '06:00',
            endTime: '18:00',
            timezone: 'Australia/Sydney',
            alignWithMarketHours: true,
            marketHours: []
          },
          excludedDays: ['Saturday', 'Sunday'],
          conflictStrategy: 'broker_wins',
          batchSize: 50,
          parallelSyncs: 2,
          enableMonitoring: true,
          alertThresholds: []
        },
        connectionMetrics: {
          avgResponseTime: 250,
          successRate: 98.5,
          errorRate: 1.5,
          requestsPerHour: 120,
          dataVolumePerHour: 5.2,
          uptime: 99.2,
          lastDowntime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          downtimeReason: 'Scheduled maintenance',
          recentRequests: [],
          rateLimitStatus: {
            endpoint: '/api/holdings',
            current: 45,
            limit: 100,
            resetTime: new Date(Date.now() + 60 * 60 * 1000),
            isThrottled: false
          }
        },
        jurisdiction: 'AU',
        regulatoryCompliance: {
          requirements: [],
          reportingRequired: true,
          reportingFrequency: 'monthly',
          dataRetentionPeriod: 2555, // 7 years
          privacyCompliance: {
            gdprCompliant: false,
            privacyActCompliant: true,
            nzPrivacyActCompliant: false,
            dataMinimization: true,
            purposeLimitation: true,
            storageLocation: 'Australia',
            encryptionRequired: true
          },
          auditRequired: true,
          auditFrequency: 'annually'
        },
        isActive: true,
        lastConnected: new Date(),
        lastDataReceived: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ];
  }

  private createMockConflictResolution() {
    return {
      defaultStrategy: 'timestamp_based' as ConflictStrategy,
      dataTypeStrategies: [],
      fieldStrategies: [],
      enableAutoResolution: true,
      autoResolutionThreshold: 80,
      requireManualReview: false,
      manualReviewThreshold: 60,
      enableEscalation: true,
      escalationCriteria: []
    };
  }

  private createMockErrorHandling() {
    return {
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffStrategy: 'exponential' as const,
        retryableErrors: ['timeout', 'rate_limit', 'server_error']
      },
      errorClassification: [],
      fallbackStrategies: [],
      enableCircuitBreaker: true,
      circuitBreakerConfig: {
        failureThreshold: 5,
        timeoutDuration: 60000,
        recoveryTimeout: 300000,
        halfOpenMaxCalls: 3
      },
      errorReporting: {
        enableReporting: true,
        reportingChannels: ['email'],
        errorAggregation: {
          aggregationWindow: 15,
          duplicateDetection: true,
          errorGrouping: []
        },
        reportCriticalImmediately: true,
        batchNonCriticalErrors: true,
        batchSize: 10,
        batchTimeout: 60
      }
    };
  }

  private createMockSyncSchedule() {
    return {
      isEnabled: true,
      scheduleType: 'interval' as const,
      interval: 60, // Every hour
      recurrencePattern: {
        frequency: 'hourly' as const,
        interval: 1,
        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        daysOfMonth: [],
        months: [],
        exceptions: [],
        holidays: []
      },
      executionWindow: {
        startTime: '06:00',
        endTime: '18:00',
        timezone: 'Australia/Sydney',
        alignWithMarketHours: true,
        markets: ['ASX'],
        blackoutPeriods: []
      },
      executionConditions: [],
      nextExecution: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      lastExecution: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    };
  }
}

interface SyncStep {
  type: 'connect_broker' | 'sync_data' | 'validate';
  brokerId: string | null;
  dataType: SyncDataType | null;
} 