import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Target,
  Info
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import AIPortfolioAdvisorService, {
  useStrategyOverlays,
  usePortfolioSnapshot,
  usePerformanceData,
  useAIAdvisorState,
  useOverlayExplanations,
  useSimulationPreview,
  formatConfidenceScore,
  formatReturnChange,
  formatPerformanceMetric,
  getTrustScoreDisplay,
  getRecommendationBadgeVariant,
  type OverlayExplanation,
  type SimulationPreview
} from '../../services/aiPortfolioAdvisorService';

// Trust badge component using service
const TrustBadge: React.FC<{ score: number }> = ({ score }) => {
  const trustMetrics = AIPortfolioAdvisorService.calculateTrustScore({ 
    id: '', 
    name: '', 
    enabled: true 
  });
  
  const iconComponent = trustMetrics.level === 'high' ? <CheckCircle className="h-3 w-3" /> :
                       trustMetrics.level === 'medium' ? <AlertTriangle className="h-3 w-3" /> :
                       <Shield className="h-3 w-3" />;

  return (
    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${trustMetrics.color}`}>
      {iconComponent}
      {trustMetrics.label}
    </Badge>
  );
};

// Simulation preview component using service
const SimulationPreview: React.FC<{ 
  preview: SimulationPreview;
  onClose: () => void;
}> = ({ preview, onClose }) => {
  const returnChange = preview.projectedReturn - preview.currentReturn;
  const riskChange = preview.projectedRisk - preview.currentRisk;
  const badgeVariant = getRecommendationBadgeVariant(preview.recommendation);

  return (
    <div className="absolute top-full left-0 right-0 z-10 mt-2 p-4 bg-background border border-border rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">Removal Impact Preview</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Expected Return</div>
            <div className={`font-medium ${returnChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatReturnChange(returnChange)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Risk Change</div>
            <div className={`font-medium ${riskChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatReturnChange(riskChange)}
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">AI Analysis</div>
          <div className="text-sm">{preview.explanation}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant} className="text-xs">
            {preview.recommendation === 'keep' ? 'Recommend Keep' :
             preview.recommendation === 'remove' ? 'Recommend Remove' : 'Recommend Modify'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatConfidenceScore(preview.confidence)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Individual overlay explanation component using service
const OverlayExplanationCard: React.FC<{
  explanation: OverlayExplanation;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSimulate: (id: string) => void;
  simulationPreview: SimulationPreview | null;
  onCloseSimulation: () => void;
}> = ({ 
  explanation, 
  isExpanded, 
  onToggleExpand, 
  onSimulate, 
  simulationPreview,
  onCloseSimulation 
}) => {
  const performanceMetrics = explanation.performanceMetrics || {
    returnContribution: 0,
    riskAdjustment: 0,
    activeDays: 0
  };

  return (
    <div className={`relative border rounded-lg transition-all duration-200 ${
      isExpanded ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-foreground">{explanation.name}</h3>
            <TrustBadge score={explanation.trustScore} />
            {explanation.isRecentlyChanged && (
              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                <Clock className="h-3 w-3 mr-1" />
                Recently Changed
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSimulate(explanation.id)}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              What if removed?
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(explanation.id)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Basic rationale */}
        <div className="text-sm text-muted-foreground mb-3">
          {explanation.rationale}
        </div>

        {/* Impact summary */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Impact:</span>
            <span className="ml-1 font-medium">{explanation.impact}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <span className="ml-1 font-medium">{formatConfidenceScore(explanation.confidence)}</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="pt-4 space-y-4">
            {/* Detailed explanation */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How This Overlay Works
              </h4>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {explanation.detailedExplanation || 'This overlay monitors market momentum indicators and adjusts portfolio allocation based on trend strength.'}
              </div>
            </div>

            {/* Performance metrics */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Current Performance
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Return Contribution</div>
                  <div className="font-medium text-green-600">
                    {formatPerformanceMetric(performanceMetrics.returnContribution, 'return')}
                  </div>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Risk Adjustment</div>
                  <div className="font-medium text-blue-600">
                    {formatPerformanceMetric(performanceMetrics.riskAdjustment, 'risk')}
                  </div>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Active For</div>
                  <div className="font-medium">
                    {formatPerformanceMetric(performanceMetrics.activeDays, 'days')}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent changes */}
            {explanation.isRecentlyChanged && explanation.lastModified && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Changes
                </h4>
                <div className="text-sm text-muted-foreground">
                  Modified {explanation.lastModified.toLocaleDateString()} - 
                  Increased allocation threshold from 15% to 20% based on improved market stability.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulation preview */}
      {simulationPreview && simulationPreview.overlayId === explanation.id && (
        <SimulationPreview 
          preview={simulationPreview}
          onClose={onCloseSimulation}
        />
      )}
    </div>
  );
};

export const AIPortfolioAdvisorPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // Using service hooks for data fetching
  const overlayData = useStrategyOverlays(activeVaultId, !!user);
  const portfolioSnapshot = usePortfolioSnapshot(activeVaultId, !!user);
  const performanceData = usePerformanceData(activeVaultId, '30d', !!user);
  
  // Using service hooks for business logic
  const { state, handleToggleExpand, handleSimulate, handleCloseSimulation } = useAIAdvisorState();
  const overlayExplanations = useOverlayExplanations(overlayData.data);
  const simulationPreview = useSimulationPreview(
    state.simulateWithoutOverlayId || undefined,
    overlayExplanations,
    portfolioSnapshot.data || null
  );

  // Event handlers using service
  const handleToggleExpandClick = (overlayId: string) => {
    handleToggleExpand(overlayId);
  };

  const handleSimulateClick = (overlayId: string) => {
    handleSimulate(overlayId);
  };

  const handleCloseSimulationClick = () => {
    handleCloseSimulation();
  };

  // Loading state
  if (overlayData.isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Portfolio Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
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
            <Brain className="h-5 w-5" />
            AI Portfolio Advisor
            <Badge variant="secondary" className="text-xs">
              {overlayExplanations.length} Active Strategies
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-4 w-4" />
            Real-time analysis
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {overlayExplanations.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active strategy overlays to analyze</p>
          </div>
        ) : (
          <div className="space-y-4">
            {overlayExplanations.map((explanation) => (
              <OverlayExplanationCard
                key={explanation.id}
                explanation={explanation}
                isExpanded={state.expandedOverlayId === explanation.id}
                onToggleExpand={handleToggleExpandClick}
                onSimulate={handleSimulateClick}
                simulationPreview={simulationPreview}
                onCloseSimulation={handleCloseSimulationClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIPortfolioAdvisorPanel; 