import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  GitMerge,
  Check,
  AlertTriangle,
  X,
  Filter,
  FilterX,
  AlertCircle,
  Info
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import OverlayCompatibilityEngineService, {
  useOverlayData,
  useOverlayCompatibilityState,
  useProcessedOverlays,
  useCompatibilityMatrix,
  useFilteredMatrix,
  type OverlayInfo,
  type OverlayCompatibility,
  type CompatibilityMatrix
} from '../../services/overlayCompatibilityEngineService';

// Compatibility status component using service
const CompatibilityStatus: React.FC<{ 
  status: 'compatible' | 'mild_conflict' | 'conflict';
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}> = ({ status, explanation, severity, recommendation }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'compatible':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'mild_conflict':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'conflict':
        return <X className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`
            flex items-center justify-center p-2 border rounded cursor-help transition-colors
            ${OverlayCompatibilityEngineService.getStatusColor(status)}
          `}>
            {getStatusIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              {OverlayCompatibilityEngineService.getStatusLabel(status)}
              {severity !== 'low' && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {severity} severity
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {explanation}
            </div>
            {recommendation && (
              <div className="text-sm font-medium">
                Recommendation: {recommendation}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Conflict banner component using service
const ConflictBanner: React.FC<{ 
  conflicts: OverlayCompatibility[];
  onDismiss: () => void;
}> = ({ conflicts, onDismiss }) => {
  const criticalConflicts = conflicts.filter(c => c.status === 'conflict');
  
  if (criticalConflicts.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900 mb-2">
            Critical Overlay Conflicts Detected
          </h4>
          <div className="text-sm text-red-700 mb-3">
            {criticalConflicts.length} overlay{criticalConflicts.length > 1 ? 's have' : ' has'} conflicting strategies
            that may reduce portfolio effectiveness.
          </div>
          <div className="space-y-1">
            {criticalConflicts.slice(0, 3).map((conflict, index) => (
              <div key={index} className="text-xs text-red-600">
                • {conflict.overlay1} ↔ {conflict.overlay2}: {conflict.explanation}
              </div>
            ))}
            {criticalConflicts.length > 3 && (
              <div className="text-xs text-red-600">
                ... and {criticalConflicts.length - 3} more conflicts
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-700"
        >
          ×
        </Button>
      </div>
    </div>
  );
};

// Matrix cell component using service
const MatrixCell: React.FC<{
  overlay1: OverlayInfo;
  overlay2: OverlayInfo;
  compatibility: OverlayCompatibility | null;
  isHovered: boolean;
  onHover: (overlayId: string | null) => void;
}> = ({ overlay1, overlay2, compatibility, isHovered, onHover }) => {
  // Same overlay - show diagonal indicator
  if (overlay1.id === overlay2.id) {
    return (
      <div className="p-2 bg-gray-100 border border-gray-200">
        <div className="w-full h-8 bg-gray-300 rounded diagonal-line"></div>
      </div>
    );
  }

  // No compatibility data - show neutral
  if (!compatibility) {
    return (
      <div className="p-2 border border-gray-200">
        <div className="w-full h-8 bg-gray-50 rounded flex items-center justify-center">
          <Info className="h-3 w-3 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`transition-all duration-200 ${
        isHovered ? 'ring-2 ring-primary/30 scale-105' : ''
      }`}
      onMouseEnter={() => onHover(overlay1.id)}
      onMouseLeave={() => onHover(null)}
    >
      <CompatibilityStatus
        status={compatibility.status}
        explanation={compatibility.explanation}
        severity={compatibility.severity}
        recommendation={compatibility.recommendation}
      />
    </div>
  );
};

export const OverlayCompatibilityPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // Using service hooks for data fetching and state management
  const {
    state,
    setOverlayHover,
    setShowConflictsOnly,
    setShowBanner
  } = useOverlayCompatibilityState();
  
  const { data: overlayData, isLoading } = useOverlayData(activeVaultId);

  // Using service hooks for business logic
  const overlays = useProcessedOverlays(overlayData);
  const compatibilityMatrix = useCompatibilityMatrix(overlays);
  const filteredMatrix = useFilteredMatrix(
    compatibilityMatrix, 
    state.showConflictsOnly ? 'conflicts' : 'all'
  );

  // Event handlers using service
  const handleOverlayHover = (overlayId: string | null) => {
    setOverlayHover(overlayId);
  };

  const handleFilterToggle = () => {
    setShowConflictsOnly(!state.showConflictsOnly);
  };

  const handleBannerDismiss = () => {
    setShowBanner(false);
  };

  // Get compatibility for specific overlay pair using service
  const getCompatibilityForPair = (overlay1: OverlayInfo, overlay2: OverlayInfo): OverlayCompatibility | null => {
    return OverlayCompatibilityEngineService.getCompatibilityForPair(overlay1, overlay2, compatibilityMatrix);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Overlay Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded-lg"></div>
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
            <GitMerge className="h-5 w-5" />
            Overlay Compatibility
            <Badge variant="secondary" className="text-xs">
              {overlays.length} Active
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFilterToggle}
            >
              {state.showConflictsOnly ? <FilterX className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              {state.showConflictsOnly ? 'Show All' : 'Conflicts Only'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Conflict Banner */}
        {state.showBanner && (
          <ConflictBanner 
            conflicts={compatibilityMatrix.pairs.filter(c => c.status === 'conflict')}
            onDismiss={handleBannerDismiss}
          />
        )}

        {overlays.length === 0 ? (
          <div className="text-center py-8">
            <GitMerge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No overlays to analyze</p>
          </div>
        ) : overlays.length === 1 ? (
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">At least 2 overlays needed for compatibility analysis</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="mb-6 grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{compatibilityMatrix.statistics.total}</div>
                <div className="text-xs text-muted-foreground">Total Pairs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{compatibilityMatrix.statistics.compatible}</div>
                <div className="text-xs text-muted-foreground">Compatible</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{compatibilityMatrix.statistics.mildConflicts}</div>
                <div className="text-xs text-muted-foreground">Mild Conflicts</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{compatibilityMatrix.statistics.conflicts}</div>
                <div className="text-xs text-muted-foreground">Conflicts</div>
              </div>
            </div>

            {/* Compatibility Matrix */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="w-full">
                  <thead>
                    <tr>
                      <td className="p-2"></td>
                      {overlays.map((overlay) => (
                        <th key={overlay.id} className="p-2 text-xs font-medium">
                          <div className="transform -rotate-45 origin-left whitespace-nowrap">
                            {overlay.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overlays.map((overlay1) => (
                      <tr key={overlay1.id}>
                        <th className="p-2 text-left text-xs font-medium max-w-32">
                          <div className="truncate">{overlay1.name}</div>
                        </th>
                        {overlays.map((overlay2) => (
                          <td key={overlay2.id} className="p-1">
                            <MatrixCell
                              overlay1={overlay1}
                              overlay2={overlay2}
                              compatibility={getCompatibilityForPair(overlay1, overlay2)}
                              isHovered={state.overlayHoverId === overlay1.id || state.overlayHoverId === overlay2.id}
                              onHover={handleOverlayHover}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Compatible</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Mild Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <span>Conflict</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OverlayCompatibilityPanel; 