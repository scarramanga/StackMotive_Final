import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertTriangle, Shield, TrendingUp, TrendingDown, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  useRebalanceRisks, 
  useRiskRefresh, 
  rebalanceRiskScannerService 
} from '../../services/rebalanceRiskScannerService';

export const RebalanceRiskScannerPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // API hooks
  const { data: riskData, isLoading, error } = useRebalanceRisks((user as any)?.id || '1', activeVaultId || undefined);
  const refreshMutation = useRiskRefresh();

  // Process and filter risks using service
  const filteredRisks = useMemo(() => {
    if (!riskData?.risks) return [];
    
    const filtered = rebalanceRiskScannerService.filterRisks(riskData.risks, {
      riskType: riskTypeFilter,
      severity: severityFilter
    });
    
    // Log filter application
    if (riskTypeFilter !== 'all' || severityFilter !== 'all') {
      rebalanceRiskScannerService.logAgentMemory('risk_scan_filtered', {
        userId: (user as any)?.id || '1',
        vaultId: activeVaultId || undefined,
        riskCount: filtered.length,
        filterApplied: `${riskTypeFilter}:${severityFilter}`,
        metadata: { originalCount: riskData.risks.length }
      });
    }
    
    return filtered;
  }, [riskData, riskTypeFilter, severityFilter, user, activeVaultId]);

  // Summary statistics using service
  const summaryStats = useMemo(() => {
    if (!riskData?.risks) return { total: 0, high: 0, medium: 0, low: 0, drift: 0, trust: 0, signal: 0 };
    return rebalanceRiskScannerService.calculateSummaryStats(riskData.risks);
  }, [riskData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync({ 
        userId: (user as any)?.id || '1', 
        vaultId: activeVaultId || undefined 
      });
      
      // Log refresh action
      await rebalanceRiskScannerService.logAgentMemory('risk_scan_refreshed', {
        userId: (user as any)?.id || '1',
        vaultId: activeVaultId || undefined,
        riskCount: summaryStats.total,
        highRiskCount: summaryStats.high
      });
    } catch (error) {
      console.error('Failed to refresh risk data:', error);
    }
  };

  // Handle filter changes
  const handleRiskTypeFilterChange = (value: string) => {
    setRiskTypeFilter(value);
  };

  const handleSeverityFilterChange = (value: string) => {
    setSeverityFilter(value);
  };

  // Get severity badge using service
  const getSeverityBadge = (severity: string) => {
    const config = rebalanceRiskScannerService.getSeverityBadgeConfig(severity);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Get risk type badge using service
  const getRiskTypeBadge = (riskType: string) => {
    const config = rebalanceRiskScannerService.getRiskTypeBadgeConfig(riskType);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Get signal icon using service
  const getSignalIcon = (signal: string) => {
    const config = rebalanceRiskScannerService.getSignalIconConfig(signal);
    switch (config.type) {
      case 'trending-up':
        return <TrendingUp className={config.className} />;
      case 'trending-down':
        return <TrendingDown className={config.className} />;
      default:
        return <div className={config.className} />;
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">Error loading rebalance risks: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Rebalance Risk Scanner
            <Badge variant="secondary" className="text-xs">{summaryStats.total} risks</Badge>
            {summaryStats.high > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">{summaryStats.high} high</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Last scan: {riskData?.lastUpdated ? new Date(riskData.lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
            <RefreshCw 
              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary"
              onClick={handleRefresh}
            />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
            {[
              { label: 'Total Risks', value: summaryStats.total, bgColor: 'bg-muted/50', textColor: '' },
              { label: 'High', value: summaryStats.high, bgColor: 'bg-red-50', textColor: 'text-red-600' },
              { label: 'Medium', value: summaryStats.medium, bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
              { label: 'Low', value: summaryStats.low, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
              { label: 'Drift', value: summaryStats.drift, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
              { label: 'Trust', value: summaryStats.trust, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
              { label: 'Signal', value: summaryStats.signal, bgColor: 'bg-green-50', textColor: 'text-green-600' }
            ].map((stat, idx) => (
              <div key={idx} className={`text-center p-3 ${stat.bgColor} rounded-lg`}>
                <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</div>
                <div className={`text-xs ${stat.textColor || 'text-muted-foreground'}`}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={riskTypeFilter} onValueChange={handleRiskTypeFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Types</SelectItem>
                <SelectItem value="drift">Weight Drift</SelectItem>
                <SelectItem value="trust">Trust Score</SelectItem>
                <SelectItem value="signal">Signal Sync</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={handleSeverityFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground">
              Showing {filteredRisks.length} of {summaryStats.total} risks
            </div>
          </div>

          {/* Risk Table */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No risks detected</h3>
              <p className="text-muted-foreground">
                {riskTypeFilter !== 'all' || severityFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'All overlays are within acceptable risk thresholds'}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 border-b border-border">
                <div className="grid grid-cols-8 gap-4 p-3 text-sm font-medium">
                  <div>Overlay</div>
                  <div>Risk Type</div>
                  <div>Severity</div>
                  <div>Signal Status</div>
                  <div>Days Since Rotation</div>
                  <div>Current Weight</div>
                  <div>Target Weight</div>
                  <div>Risk Score</div>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {filteredRisks.map((risk) => (
                  <div key={risk.id} className="grid grid-cols-8 gap-4 p-3 hover:bg-muted/50 transition-colors">
                    <div className="font-medium">{risk.overlay}</div>
                    <div>{getRiskTypeBadge(risk.riskType)}</div>
                    <div>{getSeverityBadge(risk.severity)}</div>
                    <div className="flex items-center gap-2">
                      {getSignalIcon(risk.signalStatus)}
                      <span className="text-sm capitalize">{risk.signalStatus}</span>
                    </div>
                    <div className={`text-sm ${rebalanceRiskScannerService.getDaysColor(risk.daysSinceLastRotation)}`}>
                      {risk.daysSinceLastRotation} days
                    </div>
                    <div className="text-sm font-mono">{risk.currentWeight.toFixed(1)}%</div>
                    <div className="text-sm font-mono">
                      {risk.targetWeight.toFixed(1)}%
                      {Math.abs(risk.weightDrift) > 0.1 && (
                        <div className={`text-xs ${rebalanceRiskScannerService.getWeightDriftColor(risk.weightDrift)}`}>
                          {risk.weightDrift > 0 ? '+' : ''}{risk.weightDrift.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-bold">
                      <div className={rebalanceRiskScannerService.getRiskScoreColor(risk.riskScore)}>
                        {risk.riskScore.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Details */}
          {filteredRisks.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-medium">Risk Details</div>
              <div className="space-y-2">
                {filteredRisks.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="p-3 bg-muted/25 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{risk.overlay}</span>
                        {getRiskTypeBadge(risk.riskType)}
                        {getSeverityBadge(risk.severity)}
                      </div>
                      <div className="text-sm text-muted-foreground">Score: {risk.riskScore.toFixed(0)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      <strong>Issue:</strong> {risk.description}
                    </div>
                    <div className="text-sm text-blue-600">
                      <strong>Recommended Action:</strong> {risk.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Threshold Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Risk Threshold Guide</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>Weight Drift:</strong> Variance between current and target allocation</div>
              <div>• <strong>Trust Score:</strong> Overlay reliability and historical performance</div>
              <div>• <strong>Signal Sync:</strong> Alignment between overlay signals and market conditions</div>
              <div>• <strong>High Risk:</strong> Immediate attention required (Score 80+)</div>
              <div>• <strong>Medium Risk:</strong> Monitor closely (Score 60-79)</div>
              <div>• <strong>Low Risk:</strong> Within acceptable parameters (Score &lt;60)</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RebalanceRiskScannerPanel; 