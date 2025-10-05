import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, CheckCircle, X, Clock, TrendingUp, TrendingDown, Info, Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  rebalanceAlertModalService,
  useRebalanceAlert,
  useConfirmRebalance,
  useCancelRebalance,
  RebalanceAlert,
  ModalState
} from '../../services/rebalanceAlertModalService';

export const RebalanceAlertModalPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // User data for logging
  const userId = (user as any)?.id || '1';
  const vaultId = activeVaultId || undefined;

  // Modal state using service logic
  const [modalState, setModalState] = useState<ModalState>(
    () => rebalanceAlertModalService.createInitialModalState()
  );

  // Use service hooks
  const { data: alertData, isLoading, error } = useRebalanceAlert(activeVaultId, user);
  const confirmRebalance = useConfirmRebalance();
  const cancelRebalance = useCancelRebalance();

  // Handler functions with logging
  const handleModalOpen = async (alert: RebalanceAlert) => {
    const newState = rebalanceAlertModalService.updateModalStateForAlert(modalState, alert);
    setModalState(newState);
    
    await rebalanceAlertModalService.logAgentMemory('modal_opened', {
      userId, vaultId,
      metadata: { 
        alertId: alert.id, 
        riskLevel: alert.riskLevel, 
        confidenceScore: alert.confidenceScore 
      }
    });
  };

  const handleNotesChange = (value: string) => {
    setModalState(prev => ({ ...prev, userNotes: value }));
  };

  const handleCooldownOverrideChange = async (checked: boolean) => {
    setModalState(prev => ({ ...prev, overrideCooldown: checked }));
    
    if (checked) {
      await rebalanceAlertModalService.logAgentMemory('cooldown_overridden', {
        userId, vaultId,
        metadata: { alertId: alertData?.alert?.id }
      });
    }
  };

  const handleConfirm = async () => {
    if (!alertData?.alert) return;
    
    const confirmation = rebalanceAlertModalService.createConfirmation(
      modalState.userNotes,
      modalState.overrideCooldown
    );
    
    confirmRebalance.mutate(
      { 
        alertId: alertData.alert.id, 
        confirmation, 
        vaultId: activeVaultId 
      },
      {
        onSuccess: () => {
          setModalState(rebalanceAlertModalService.closeModalAndReset());
        }
      }
    );

    await rebalanceAlertModalService.logAgentMemory('rebalance_confirmed', {
      userId, vaultId,
      metadata: {
        alertId: alertData.alert.id,
        hasNotes: !!confirmation.userNotes,
        overrideCooldown: confirmation.overrideCooldown
      }
    });
  };

  const handleCancel = async () => {
    if (!alertData?.alert) return;
    
    cancelRebalance.mutate(
      { alertId: alertData.alert.id, vaultId: activeVaultId },
      {
        onSuccess: () => {
          setModalState(rebalanceAlertModalService.closeModalAndReset());
        }
      }
    );

    await rebalanceAlertModalService.logAgentMemory('rebalance_cancelled', {
      userId, vaultId,
      metadata: { alertId: alertData.alert.id }
    });
  };

  const handleDismiss = async () => {
    setModalState(rebalanceAlertModalService.closeModalAndReset());
    
    await rebalanceAlertModalService.logAgentMemory('alert_dismissed', {
      userId, vaultId,
      metadata: { alertId: alertData?.alert?.id }
    });
  };

  // Open modal when alert is available
  useEffect(() => {
    if (alertData?.alert && !modalState.isOpen) {
      handleModalOpen(alertData.alert);
    }
  }, [alertData, modalState.isOpen]);

  // Countdown timer using service logic
  useEffect(() => {
    if (modalState.countdown > 0 && modalState.isOpen) {
      const timer = setTimeout(() => {
        setModalState(prev => ({
          ...prev,
          countdown: rebalanceAlertModalService.updateCountdown(prev.countdown)
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [modalState.countdown, modalState.isOpen]);

  if (!modalState.isOpen || !alertData?.alert) {
    return null;
  }

  const alert: RebalanceAlert = alertData.alert;
  
  // Use service methods for UI logic
  const riskBadge = rebalanceAlertModalService.getRiskBadge(alert.riskLevel);
  const summaryStats = rebalanceAlertModalService.calculateSummaryStats(alert.affectedOverlays);
  const canConfirm = rebalanceAlertModalService.canConfirmRebalance(
    modalState.countdown, 
    modalState.overrideCooldown
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Rebalance Alert
              <Badge className={riskBadge.className}>{riskBadge.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {modalState.countdown > 0 && !modalState.overrideCooldown && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Cooldown: {rebalanceAlertModalService.formatTime(modalState.countdown)}
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Alert Summary */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-orange-800 mb-2">
                    Rebalance Required
                  </div>
                  <div className="text-sm text-orange-700 mb-3">
                    {alert.affectedOverlays.length} overlays need rebalancing. 
                    Triggered by: {alert.triggeredBy}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-orange-600 mb-1">Confidence Score</div>
                      <div className={`font-bold ${rebalanceAlertModalService.getConfidenceColor(alert.confidenceScore)}`}>
                        {alert.confidenceScore}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-orange-600 mb-1">Max Weight Change</div>
                      <div className="font-bold">
                        {rebalanceAlertModalService.formatPercentage(alert.summary.maxWeightChange)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-orange-600 mb-1">Risk Delta</div>
                      <div className={`font-bold ${rebalanceAlertModalService.getRiskDeltaColor(alert.summary.riskDelta)}`}>
                        {rebalanceAlertModalService.formatPercentage(alert.summary.riskDelta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-orange-600 mb-1">Est. Duration</div>
                      <div className="font-bold">
                        {rebalanceAlertModalService.formatDuration(alert.estimatedDuration)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Score Tooltip */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <strong>Confidence Score:</strong> Based on signal strength, market conditions, 
                  and historical performance. Scores above 70% are generally reliable.
                </div>
              </div>
            </div>

            {/* Affected Overlays */}
            <div>
              <h3 className="text-lg font-medium mb-4">Affected Overlays</h3>
              <div className="space-y-3">
                {alert.affectedOverlays.map((overlay) => {
                  const overlayRiskBadge = rebalanceAlertModalService.getRiskBadge(overlay.risk);
                  const weightChangeDisplay = rebalanceAlertModalService.getWeightChangeDisplay(overlay.weightChange);
                  
                  return (
                    <div key={overlay.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{overlay.name}</div>
                          <Badge className={overlayRiskBadge.className}>{overlayRiskBadge.label}</Badge>
                        </div>
                        <div className={`text-sm font-bold ${rebalanceAlertModalService.getConfidenceColor(overlay.confidence)}`}>
                          {overlay.confidence}% confidence
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Current Weight</div>
                          <div className="font-medium">{overlay.currentWeight.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Target Weight</div>
                          <div className="font-medium">{overlay.targetWeight.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Change</div>
                          <div className={`font-bold ${weightChangeDisplay.color}`}>
                            {weightChangeDisplay.icon === 'up' ? (
                              <TrendingUp className="h-4 w-4 inline mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 inline mr-1" />
                            )}
                            {weightChangeDisplay.formatted}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <strong>Reason:</strong> {overlay.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warnings */}
            {alert.warnings.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="font-medium text-red-800">Warnings</div>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {alert.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {alert.recommendations.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="font-medium text-green-800">Recommendations</div>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  {alert.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* User Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={modalState.userNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add any notes about this rebalance..."
                className="w-full p-3 border border-border rounded-lg resize-none"
                rows={3}
              />
            </div>

            {/* Cooldown Override */}
            {modalState.countdown > 0 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={modalState.overrideCooldown}
                  onChange={(e) => handleCooldownOverrideChange(e.target.checked)}
                  className="mt-1"
                />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 mb-1">
                    Override Cooldown Timer
                  </div>
                  <div className="text-yellow-700">
                    There's a {rebalanceAlertModalService.formatTime(modalState.countdown)} cooldown remaining. 
                    Check this box to proceed immediately.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={cancelRebalance.isPending}
              >
                {cancelRebalance.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Rebalance'
                )}
              </Button>

              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  This action cannot be undone
                </div>
                <Button
                  onClick={handleConfirm}
                  disabled={confirmRebalance.isPending || !canConfirm}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {confirmRebalance.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Rebalance
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {(confirmRebalance.error || cancelRebalance.error) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-700">
                  Error: {confirmRebalance.error?.message || cancelRebalance.error?.message}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RebalanceAlertModalPanel; 