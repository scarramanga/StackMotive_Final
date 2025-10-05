import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  MessageSquare, 
  Target, 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Search,
  Eye,
  Trash2,
  FileText,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Zap,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  Filter,
  Settings,
  HelpCircle
} from 'lucide-react';

import {
  useExplanations,
  useExplanation,
  useGenerateExplanation,
  useRegenerateExplanation,
  useDeleteExplanation,
  useExportExplanation,
  useAISignalExplanationUtils,
  type SignalExplanation,
  type ExplanationRequest,
  type ExplanationQuery,
  type ExplanationStatus,
  type ComplexityLevel,
  type DetailLevel,
  type ExplanationStyle,
  type AudienceLevel,
  type SignalData,
} from '@/services/aiSignalExplanationLayerService';

interface AISignalExplanationLayerPanelProps {
  userId: string;
  className?: string;
}

export function AISignalExplanationLayerPanel({ 
  userId, 
  className = '' 
}: AISignalExplanationLayerPanelProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'explanations' | 'generate' | 'settings'>('explanations');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExplanationStatus | 'all'>('all');
  const [complexityFilter, setComplexityFilter] = useState<ComplexityLevel | 'all'>('all');
  const [selectedExplanation, setSelectedExplanation] = useState<string>('');
  const [showExplanationDialog, setShowExplanationDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Generation form state
  const [signalId, setSignalId] = useState('');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard');
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>('conversational');
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('intermediate');

  const explanationQuery: ExplanationQuery = {
    userId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    complexity: complexityFilter === 'all' ? undefined : complexityFilter,
    search: searchTerm || undefined,
    limit: 50,
  };

  // Service hooks
  const { data: explanationsData, isLoading: explanationsLoading } = useExplanations(explanationQuery);
  const { data: selectedExplanationData } = useExplanation(selectedExplanation);
  const generateExplanationMutation = useGenerateExplanation(userId);
  const regenerateExplanationMutation = useRegenerateExplanation(selectedExplanation, userId);
  const deleteExplanationMutation = useDeleteExplanation(userId);
  const exportExplanationMutation = useExportExplanation(userId);
  const utils = useAISignalExplanationUtils(userId);

  // Event handlers
  const handleGenerateExplanation = useCallback(async () => {
    if (!signalId.trim()) {
      Toast({ title: 'Error', description: 'Please enter a signal ID' });
      return;
    }

    const mockSignalData: SignalData = {
      id: signalId,
      type: 'buy',
      strength: 0.8,
      confidence: 0.75,
      inputs: [],
      context: {
        asset: 'AAPL',
        market: 'NASDAQ',
        timeframe: '1h',
        conditions: {},
      },
      timestamp: new Date().toISOString(),
    };

    const request: ExplanationRequest = {
      signalId,
      signalData: mockSignalData,
      options: {
        detail: detailLevel,
        style: explanationStyle,
        audience: audienceLevel,
        language: 'en',
        format: 'text',
        includeScores: true,
        includeEvidence: true,
        includeRecommendations: true,
      },
    };

    try {
      await generateExplanationMutation.mutateAsync(request);
      setShowGenerateDialog(false);
      Toast({ title: 'Success', description: 'Explanation generated successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to generate explanation' });
    }
  }, [signalId, detailLevel, explanationStyle, audienceLevel, generateExplanationMutation]);

  const handleRegenerateExplanation = useCallback(async (explanationId: string) => {
    try {
      await regenerateExplanationMutation.mutateAsync({
        detail: detailLevel,
        style: explanationStyle,
        audience: audienceLevel,
      });
      Toast({ title: 'Success', description: 'Explanation regenerated successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to regenerate explanation' });
    }
  }, [detailLevel, explanationStyle, audienceLevel, regenerateExplanationMutation]);

  const handleDeleteExplanation = useCallback(async (explanationId: string) => {
    try {
      await deleteExplanationMutation.mutateAsync(explanationId);
      Toast({ title: 'Success', description: 'Explanation deleted successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to delete explanation' });
    }
  }, [deleteExplanationMutation]);

  const handleExportExplanation = useCallback(async (explanationId: string) => {
    try {
      await exportExplanationMutation.mutateAsync({
        explanationId,
        format: 'text',
      });
      Toast({ title: 'Success', description: 'Explanation exported successfully' });
    } catch (error) {
      Toast({ title: 'Error', description: 'Failed to export explanation' });
    }
  }, [exportExplanationMutation]);

  // Render confidence indicator
  const renderConfidenceIndicator = useCallback((confidence: number) => {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${confidence * 100}%`,
              backgroundColor: utils.getConfidenceColor(confidence),
            }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: utils.getConfidenceColor(confidence) }}>
          {(confidence * 100).toFixed(0)}%
        </span>
      </div>
    );
  }, [utils]);

  // Render score breakdown
  const renderScoreBreakdown = useCallback((explanation: SignalExplanation) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Score</span>
          <span className="text-lg font-bold">{explanation.scoreBreakdown.overall.toFixed(1)}</span>
        </div>
        
        <div className="space-y-2">
          {explanation.scoreBreakdown.components.map((component) => (
            <div key={component.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">{component.name}</span>
                <span className="text-sm font-medium">{component.score.toFixed(1)}</span>
              </div>
              <Progress value={component.score} className="h-2" />
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <span className="ml-2 font-medium">{(explanation.scoreBreakdown.confidence * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Reliability:</span>
            <span className="ml-2 font-medium">{(explanation.scoreBreakdown.reliability * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }, []);

  // Render explanation item
  const renderExplanationItem = useCallback((explanation: SignalExplanation) => {
    const score = utils.calculateExplanationScore(explanation);
    
    return (
      <Card key={explanation.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">Signal Explanation</h4>
                <p className="text-sm text-muted-foreground">ID: {explanation.signalId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={
                explanation.status === 'completed' ? 'default' :
                explanation.status === 'processing' ? 'secondary' :
                explanation.status === 'failed' ? 'destructive' : 'outline'
              }>
                {utils.formatExplanationStatus(explanation.status)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {utils.formatComplexity(explanation.complexity)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Confidence:</span>
              <div className="mt-1">
                {renderConfidenceIndicator(explanation.confidence)}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Score:</span>
              <span className="ml-2 font-medium">{score.toFixed(1)}/100</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Generated:</span>
              <span className="ml-2">{new Date(explanation.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="text-sm font-medium mb-2">Summary</h5>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {explanation.explanation.summary}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground">
                Processing: {explanation.metadata.processingTime}ms
              </div>
              <div className="text-xs text-muted-foreground">
                Model: {explanation.metadata.model}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedExplanation(explanation.id);
                  setShowExplanationDialog(true);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRegenerateExplanation(explanation.id)}
                disabled={regenerateExplanationMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportExplanation(explanation.id)}
                disabled={exportExplanationMutation.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteExplanation(explanation.id)}
                disabled={deleteExplanationMutation.isPending}
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
    renderConfidenceIndicator,
    handleRegenerateExplanation,
    handleExportExplanation,
    handleDeleteExplanation,
    regenerateExplanationMutation.isPending,
    exportExplanationMutation.isPending,
    deleteExplanationMutation.isPending,
  ]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Signal Explanation Layer</span>
            </div>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Generate Explanation
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="explanations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Explanations
              </TabsTrigger>
              <TabsTrigger value="generate">
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="explanations" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search explanations..."
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={complexityFilter} onValueChange={(value) => setComplexityFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Complexity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              {explanationsData?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{explanationsData.summary.totalExplanations}</div>
                      <p className="text-sm text-muted-foreground">Total Explanations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{(explanationsData.summary.averageConfidence * 100).toFixed(0)}%</div>
                      <p className="text-sm text-muted-foreground">Avg Confidence</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{explanationsData.summary.performanceMetrics.responseTime.toFixed(0)}ms</div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{(explanationsData.summary.performanceMetrics.satisfaction * 100).toFixed(0)}%</div>
                      <p className="text-sm text-muted-foreground">Satisfaction</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Explanations List */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {explanationsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading explanations...</p>
                    </div>
                  ) : explanationsData?.explanations?.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No explanations found</p>
                    </div>
                  ) : (
                    explanationsData?.explanations?.map(renderExplanationItem)
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Signal Explanation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Signal ID</label>
                    <Input
                      value={signalId}
                      onChange={(e) => setSignalId(e.target.value)}
                      placeholder="Enter signal ID to explain"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Detail Level</label>
                      <Select value={detailLevel} onValueChange={(value) => setDetailLevel(value as DetailLevel)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Style</label>
                      <Select value={explanationStyle} onValueChange={(value) => setExplanationStyle(value as ExplanationStyle)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="simplified">Simplified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Audience</label>
                      <Select value={audienceLevel} onValueChange={(value) => setAudienceLevel(value as AudienceLevel)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleGenerateExplanation}
                      disabled={generateExplanationMutation.isPending}
                    >
                      {generateExplanationMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Generate Explanation
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Explanation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="auto-generate" defaultChecked />
                      <label htmlFor="auto-generate" className="text-sm">Auto-generate explanations for new signals</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="include-scores" defaultChecked />
                      <label htmlFor="include-scores" className="text-sm">Include score breakdowns</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="include-evidence" defaultChecked />
                      <label htmlFor="include-evidence" className="text-sm">Include supporting evidence</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="include-recommendations" defaultChecked />
                      <label htmlFor="include-recommendations" className="text-sm">Include recommendations</label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Explanation Details Dialog */}
      <Dialog open={showExplanationDialog} onOpenChange={setShowExplanationDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Signal Explanation Details</DialogTitle>
          </DialogHeader>
          {selectedExplanationData && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedExplanationData.explanation.summary}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderScoreBreakdown(selectedExplanationData)}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedExplanationData.explanation.reasoning}</p>
                </CardContent>
              </Card>
              
              {selectedExplanationData.explanation.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {selectedExplanationData.explanation.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start space-x-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {selectedExplanationData.explanation.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {selectedExplanationData.explanation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 