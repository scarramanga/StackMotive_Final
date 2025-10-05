import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  Shield,
  AlertTriangle,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  Eye,
  Lock,
  Unlock,
  Calendar,
  Archive,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import {
  riskDisclosureService,
  useRiskDisclosures,
  useAcknowledgmentHistory,
  useSubmitAcknowledgments,
  useDownloadPDF,
  RiskDisclosure,
  AcknowledgmentHistory
} from '../../services/riskDisclosureService';

export const RiskDisclosurePanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [acknowledgmentStates, setAcknowledgmentStates] = useState<Record<string, boolean>>({});
  const [expandedDisclosures, setExpandedDisclosures] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  // Mutations
  const submitAcknowledgmentsMutation = useSubmitAcknowledgments();
  const downloadPDFMutation = useDownloadPDF();

  // Fetch data
  const { data: disclosureData, isLoading, error } = useRiskDisclosures(activeVaultId);
  const { data: historyData } = useAcknowledgmentHistory(activeVaultId, showHistory);

  // Computed values using service methods
  const processedData = useMemo(() => {
    if (!disclosureData) return null;
    
    const filter = riskDisclosureService.createDisclosureFilter(selectedCategory);
    return riskDisclosureService.processDisclosuresForDisplay(
      disclosureData.disclosures,
      disclosureData.acknowledgments,
      filter
    );
  }, [disclosureData, selectedCategory]);

  const pendingAcknowledgments = Object.values(acknowledgmentStates).filter(Boolean).length;
  const canProceed = disclosureData?.complianceStatus.isCompliant || pendingAcknowledgments > 0;

  // Handle acknowledgment toggle
  const handleAcknowledgmentToggle = (disclosureId: string, checked: boolean) => {
    setAcknowledgmentStates(prev => ({
      ...prev,
      [disclosureId]: checked
    }));
  };

  // Handle bulk acknowledgment submission
  const handleSubmitAcknowledgments = async () => {
    const acknowledgedIds = Object.keys(acknowledgmentStates).filter(
      id => acknowledgmentStates[id]
    );
    
    if (acknowledgedIds.length === 0) return;
    
    try {
      const result = await riskDisclosureService.handleAcknowledgmentSubmission(
        acknowledgedIds,
        activeVaultId
      );
      
      if (result.success) {
        setAcknowledgmentStates({});
      }
    } catch (error) {
      console.error('Failed to submit acknowledgments:', error);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      await riskDisclosureService.handlePDFDownload(
        activeVaultId,
        selectedCategory,
        'standard'
      );
    } catch (error) {
      console.error('PDF download failed:', error);
    }
  };

  // Handle disclosure expansion toggle
  const handleToggleDisclosure = (disclosureId: string) => {
    setExpandedDisclosures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(disclosureId)) {
        newSet.delete(disclosureId);
      } else {
        newSet.add(disclosureId);
      }
      return newSet;
    });
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconName = riskDisclosureService.getCategoryIcon(category as any);
    switch (iconName) {
      case 'shield':
        return <Shield className="h-4 w-4" />;
      case 'file-text':
        return <FileText className="h-4 w-4" />;
      case 'alert-triangle':
        return <AlertTriangle className="h-4 w-4" />;
      case 'alert-circle':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'archive':
        return <Archive className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading risk disclosures: {error.message}
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
            Loading risk disclosures...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!disclosureData || !processedData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No risk disclosures available
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
              <Shield className="h-5 w-5" />
              Risk Disclosure & Compliance
              {!disclosureData.complianceStatus.isCompliant && (
                <Badge className="bg-red-100 text-red-800">
                  Action Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="h-4 w-4" />
                History
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={downloadPDFMutation.isPending}
              >
                {downloadPDFMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Compliance Status */}
            <div className={`p-4 rounded-lg border ${
              disclosureData.complianceStatus.isCompliant 
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {disclosureData.complianceStatus.isCompliant ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  disclosureData.complianceStatus.isCompliant 
                    ? 'text-green-800' 
                    : 'text-red-800'
                }`}>
                  {disclosureData.complianceStatus.isCompliant 
                    ? 'Compliance Up to Date' 
                    : 'Compliance Action Required'
                  }
                </span>
              </div>
              <div className={`text-sm ${
                disclosureData.complianceStatus.isCompliant 
                  ? 'text-green-700' 
                  : 'text-red-700'
              }`}>
                {disclosureData.complianceStatus.completedAcknowledgments} of {disclosureData.complianceStatus.requiredAcknowledgments} required disclosures acknowledged
              </div>
              {disclosureData.complianceStatus.blockedActions.length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  <div className="font-medium">Blocked Actions:</div>
                  <ul className="list-disc list-inside">
                    {disclosureData.complianceStatus.blockedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                All Categories
              </Button>
              {disclosureData.categories.map((cat) => (
                <Button
                  key={cat.category}
                  size="sm"
                  variant={selectedCategory === cat.category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.category)}
                >
                  {riskDisclosureService.formatCategoryName(cat.category)} ({cat.count})
                </Button>
              ))}
            </div>

            {/* Risk Disclosures */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Risk Disclosures {selectedCategory !== 'all' && `- ${riskDisclosureService.formatCategoryName(selectedCategory)}`}
                </Label>
                {pendingAcknowledgments > 0 && (
                  <Badge className="bg-blue-100 text-blue-800">
                    {pendingAcknowledgments} pending
                  </Badge>
                )}
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-4 pr-4">
                  {processedData.filtered.map((disclosure) => {
                    const isAcknowledged = riskDisclosureService.isDisclosureAcknowledged(
                      disclosure.id, 
                      disclosure.version, 
                      disclosureData.acknowledgments
                    );
                    const isExpanded = expandedDisclosures.has(disclosure.id);
                    const isPendingAck = acknowledgmentStates[disclosure.id] || false;
                    
                    return (
                      <div key={disclosure.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={riskDisclosureService.getCategoryColor(disclosure.category)}>
                                {getCategoryIcon(disclosure.category)}
                              </div>
                              <span className="font-medium">{disclosure.title}</span>
                              <Badge className={riskDisclosureService.getSeverityBackground(disclosure.severity)}>
                                {disclosure.severity.charAt(0).toUpperCase() + disclosure.severity.slice(1)}
                              </Badge>
                              {disclosure.isRequired && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  Required
                                </Badge>
                              )}
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div>Category: {riskDisclosureService.formatCategoryName(disclosure.category)}</div>
                                    <div>Version: {disclosure.version}</div>
                                    <div>Read time: {disclosure.estimatedReadTime}min</div>
                                    <div>Updated: {new Date(disclosure.lastUpdated).toLocaleDateString()}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {disclosure.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {isAcknowledged ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs">Acknowledged</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`ack-${disclosure.id}`}
                                  checked={isPendingAck}
                                  onCheckedChange={(checked) => 
                                    handleAcknowledgmentToggle(disclosure.id, checked)
                                  }
                                  aria-label={`Acknowledge ${disclosure.title}`}
                                />
                                <Label 
                                  htmlFor={`ack-${disclosure.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  {isPendingAck ? 'Acknowledged' : 'Acknowledge'}
                                </Label>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleDisclosure(disclosure.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Applicable Strategies/Assets */}
                        {(disclosure.applicableStrategies.length > 0 || disclosure.applicableAssets.length > 0) && (
                          <div className="mb-3 text-xs text-muted-foreground">
                            {disclosure.applicableStrategies.length > 0 && (
                              <div>
                                <strong>Strategies:</strong> {disclosure.applicableStrategies.join(', ')}
                              </div>
                            )}
                            {disclosure.applicableAssets.length > 0 && (
                              <div>
                                <strong>Assets:</strong> {disclosure.applicableAssets.join(', ')}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <ScrollArea className="h-32">
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {disclosure.content}
                              </div>
                            </ScrollArea>
                            {disclosure.regulatoryReference && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <strong>Regulatory Reference:</strong> {disclosure.regulatoryReference}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {canProceed ? (
                  <Unlock className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  canProceed ? 'text-green-700' : 'text-red-700'
                }`}>
                  {canProceed 
                    ? 'Ready to proceed with trading actions' 
                    : 'Complete acknowledgments to proceed'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {pendingAcknowledgments > 0 && (
                  <Button
                    onClick={handleSubmitAcknowledgments}
                    disabled={submitAcknowledgmentsMutation.isPending}
                  >
                    {submitAcknowledgmentsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Submit Acknowledgments ({pendingAcknowledgments})
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  variant={canProceed ? 'default' : 'secondary'}
                  disabled={!canProceed}
                >
                  {canProceed ? 'Proceed to Trading' : 'Blocked - Complete Disclosures'}
                </Button>
              </div>
            </div>

            {/* Information Footer */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Important Information</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• <strong>Legal Requirement:</strong> All risk disclosures must be acknowledged before trading</div>
                <div>• <strong>Version Control:</strong> Re-acknowledgment required when disclosures are updated</div>
                <div>• <strong>Compliance Record:</strong> All acknowledgments are logged with timestamp and audit trail</div>
                <div>• <strong>Auto-Refresh:</strong> Disclosures update every 60 seconds for latest compliance requirements</div>
                <div>• <strong>Last Updated:</strong> {riskDisclosureService.formatTimestamp(disclosureData.complianceStatus.lastComplianceCheck)}</div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Acknowledgment History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Acknowledgment History</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-96">
              {!historyData || historyData.history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No acknowledgment history found
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.history.map((entry) => (
                    <div key={entry.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{entry.disclosureTitle}</div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            entry.isCurrentVersion 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            v{entry.version}
                          </Badge>
                          {entry.isCurrentVersion && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {riskDisclosureService.formatTimestamp(entry.acknowledgedAt)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {riskDisclosureService.formatCategoryName(entry.category)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
};

export default RiskDisclosurePanel; 