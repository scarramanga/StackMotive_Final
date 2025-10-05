import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  Send,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  Filter,
  Minus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SignalAlertDispatcherService, {
  useSignalAlerts,
  useDispatchAlerts,
  useSignalAlertState,
  useProcessedAlerts,
  useAlertSummaryStats,
  useCooldownStatus,
  type SignalAlert,
  type DispatchResponse
} from '../../services/signalAlertDispatcherService';

// Signal type icon helper using service
const SignalTypeIcon: React.FC<{ signalType: string }> = ({ signalType }) => {
  const iconName = SignalAlertDispatcherService.getSignalTypeIcon(signalType);
  const color = SignalAlertDispatcherService.getSignalTypeColor(signalType);
  
  switch (iconName) {
    case 'trending-up':
      return <TrendingUp className={`h-4 w-4 ${color}`} />;
    case 'trending-down':
      return <TrendingDown className={`h-4 w-4 ${color}`} />;
    case 'zap':
      return <Zap className={`h-4 w-4 ${color}`} />;
    case 'minus':
      return <Minus className={`h-4 w-4 ${color}`} />;
    default:
      return <Info className={`h-4 w-4 ${color}`} />;
  }
};

export const SignalAlertDispatcherPanel: React.FC = () => {
  const { user } = useAuth();
  
  // Using service hooks for data fetching and state management
  const {
    state,
    setOnlyHighSeverity,
    setDispatchFeedback
  } = useSignalAlertState();
  
  const { data: alertsData, isLoading, error } = useSignalAlerts(state.autoRefresh);
  const dispatchAlerts = useDispatchAlerts();

  // Using service hooks for business logic
  const processedAlerts = useProcessedAlerts(
    alertsData?.alerts || [],
    state.filters,
    state.onlyHighSeverity,
    state.sortBy,
    state.sortOrder
  );

  const summaryStats = useAlertSummaryStats(alertsData?.alerts || []);
  const cooldownStatus = useCooldownStatus(alertsData?.cooldownUntil);

  // Event handlers using service
  const handleDispatch = async () => {
    try {
      const result = await dispatchAlerts.mutateAsync(undefined);
      setDispatchFeedback({
        type: 'success',
        message: result.message || `Successfully dispatched ${result.dispatchedCount} alerts`
      });
    } catch (error) {
      setDispatchFeedback({
        type: 'error',
        message: 'Failed to dispatch alerts. Please try again.'
      });
    }
  };

  const handleSeverityFilterChange = (checked: boolean) => {
    setOnlyHighSeverity(checked);
  };

  // Derived state using service
  const canDispatch = summaryStats.undispatched > 0 && 
                     !cooldownStatus.active && 
                     !dispatchAlerts.isPending;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading signal alerts: {error.message}
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
            <Zap className="h-5 w-5" />
            Signal Alert Dispatcher
            <Badge variant="secondary" className="text-xs">
              {summaryStats.total} alerts
            </Badge>
            {summaryStats.high > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                {summaryStats.high} high
              </Badge>
            )}
          </div>
          <Button
            onClick={handleDispatch}
            disabled={!canDispatch}
            variant={summaryStats.high > 0 ? 'default' : 'outline'}
          >
            {dispatchAlerts.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Dispatch Now ({summaryStats.undispatched})
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{summaryStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summaryStats.high}</div>
              <div className="text-xs text-red-600">High Severity</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summaryStats.medium}</div>
              <div className="text-xs text-yellow-600">Medium Severity</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.low}</div>
              <div className="text-xs text-blue-600">Low Severity</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summaryStats.undispatched}</div>
              <div className="text-xs text-green-600">Pending Dispatch</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="high-severity-only"
                checked={state.onlyHighSeverity}
                onCheckedChange={handleSeverityFilterChange}
              />
              <Label htmlFor="high-severity-only" className="text-sm">
                Show only high-severity alerts
              </Label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {processedAlerts.length} alert{processedAlerts.length !== 1 ? 's' : ''} shown
            </div>
          </div>

          {/* Cooldown Status */}
          {cooldownStatus.active && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Dispatch Cooldown Active</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Next dispatch available in {cooldownStatus.timeRemaining}
              </div>
            </div>
          )}

          {/* Dispatch Feedback */}
          {state.dispatchFeedback && (
            <div className={`p-3 rounded-lg border ${
              state.dispatchFeedback.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {state.dispatchFeedback.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{state.dispatchFeedback.message}</span>
              </div>
            </div>
          )}

          {/* Alerts Table */}
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : processedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No alerts found</h3>
              <p className="text-muted-foreground">
                {state.onlyHighSeverity 
                  ? 'No high-severity alerts available' 
                  : 'No signal alerts have been generated yet'}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-muted/50 border-b border-border">
                <div className="grid grid-cols-7 gap-4 p-3 text-sm font-medium">
                  <div>Time</div>
                  <div>Overlay</div>
                  <div>Asset</div>
                  <div>Signal Type</div>
                  <div>Severity</div>
                  <div>Confidence</div>
                  <div>Status</div>
                </div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-border">
                {processedAlerts.map((alert: SignalAlert) => (
                  <div 
                    key={alert.id} 
                    className={`grid grid-cols-7 gap-4 p-3 hover:bg-muted/50 transition-colors ${
                      alert.severity === 'high' ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <div className="text-sm text-muted-foreground">
                      {SignalAlertDispatcherService.formatTimeSince(alert.timestamp)}
                    </div>
                    
                    <div className="font-medium">
                      {alert.overlay}
                    </div>
                    
                    <div className="font-medium">
                      {alert.asset}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <SignalTypeIcon signalType={alert.signalType} />
                      <span className="text-sm capitalize">{alert.signalType}</span>
                    </div>
                    
                    <div>
                      <Badge className={SignalAlertDispatcherService.getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    
                    <div className="font-mono text-sm">
                      {SignalAlertDispatcherService.formatConfidence(alert.confidence)}
                    </div>
                    
                    <div>
                      {alert.isDispatched ? (
                        <Badge className="bg-green-100 text-green-800">
                          Dispatched
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Message Details */}
          {processedAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Alert Messages</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {processedAlerts.slice(0, 3).map((alert: SignalAlert) => (
                  <div key={alert.id} className="text-xs text-muted-foreground p-2 bg-muted/25 rounded">
                    <span className="font-medium">{alert.overlay}:</span> {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalAlertDispatcherPanel; 