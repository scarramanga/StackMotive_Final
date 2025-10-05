import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Eye, 
  EyeOff,
  Activity,
  Target,
  Shield
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  useStrategyOverlays, 
  strategyStackService,
  type StrategyOverlay 
} from '../../services/strategyStackService';

// Icon mapping using service
const getOverlayIcon = (type?: string) => {
  const iconType = strategyStackService.getOverlayIconType(type);
  switch (iconType) {
    case 'trending-up': return <TrendingUp className="h-4 w-4" />;
    case 'shield': return <Shield className="h-4 w-4" />;
    case 'target': return <Target className="h-4 w-4" />;
    case 'activity': return <Activity className="h-4 w-4" />;
    default: return <Layers className="h-4 w-4" />;
  }
};

// Signal indicator component
const SignalIndicator: React.FC<{ 
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}> = ({ signal, strength }) => {
  const styling = strategyStackService.getSignalStyling(signal);

  const getSignalIcon = () => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="h-4 w-4" />;
      case 'bearish': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${styling.color} ${styling.bgColor}`}>
      {getSignalIcon()}
      <span className="font-medium capitalize">{signal}</span>
      <span className="text-sm">({(strength * 100).toFixed(0)}%)</span>
    </div>
  );
};

// Individual overlay stack item component
const OverlayStackItem: React.FC<{
  overlay: StrategyOverlay;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  showDetails: boolean;
  totalValue: number;
}> = ({ overlay, isHovered, onHover, showDetails, totalValue }) => {
  const performanceColor = strategyStackService.getPerformanceColor(overlay.performance);
  const weightPercentage = strategyStackService.calculateWeightPercentage(overlay, totalValue);
  const styling = overlay.signal ? strategyStackService.getSignalStyling(overlay.signal) : null;

  return (
    <div
      className={`
        p-3 border rounded-lg transition-all duration-200 cursor-pointer
        ${isHovered ? 'bg-primary/5 border-primary/30 shadow-md' : 'bg-card border-border hover:bg-muted/50'}
      `}
      onMouseEnter={() => onHover(overlay.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-md">
            {getOverlayIcon(overlay.overlayType)}
          </div>
          <div>
            <div className="font-medium text-foreground">{overlay.name}</div>
            {showDetails && (
              <div className="text-xs text-muted-foreground">
                {overlay.assets.slice(0, 3).join(', ')}
                {overlay.assets.length > 3 && ` +${overlay.assets.length - 3} more`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">{weightPercentage.toFixed(1)}%</div>
            <div className={`text-xs ${performanceColor}`}>
              {strategyStackService.formatPerformance(overlay.performance)}
            </div>
          </div>
          
          {overlay.signal && styling && (
            <Badge 
              variant="outline" 
              className={`text-xs ${styling.borderColor} ${styling.color}`}
            >
              {overlay.signal}
            </Badge>
          )}
        </div>
      </div>
      
      {showDetails && isHovered && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Total Value:</span>
              <span className="ml-1 font-medium">${overlay.totalValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Priority:</span>
              <span className="ml-1 font-medium">{overlay.priority || 'Normal'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StrategyStackPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [hoverOverlayId, setHoverOverlayId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch strategy overlays data using service
  const { data: overlayData, isLoading, error } = useStrategyOverlays(activeVaultId, user);

  // Process overlay data using service
  const stackData = useMemo(() => {
    return overlayData ? strategyStackService.processOverlayData(overlayData) : {
      overlays: [],
      activeCount: 0,
      totalValue: 0,
      overallSignal: 'neutral' as const,
      signalStrength: 0
    };
  }, [overlayData]);

  // Handle hover events
  const handleOverlayHover = (overlayId: string | null) => {
    setHoverOverlayId(overlayId);
  };

  // Handle details toggle with logging
  const handleDetailsToggle = () => {
    const newShowDetails = !showDetails;
    
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'strategy-stack',
        userId: user?.id || undefined,
        action: newShowDetails ? 'show_details' : 'hide_details',
        timestamp: new Date().toISOString(),
        details: { 
          overlayCount: stackData.overlays.length,
          totalValue: stackData.totalValue,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);
    
    setShowDetails(newShowDetails);
  };

  // Handle overlay interaction with logging
  const handleOverlayInteraction = (overlay: StrategyOverlay, action: 'hover' | 'click') => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'strategy-stack',
        userId: user?.id || undefined,
        action: `overlay_${action}`,
        timestamp: new Date().toISOString(),
        details: { 
          overlayId: overlay.id,
          overlayName: overlay.name,
          overlayType: overlay.overlayType,
          performance: overlay.performance,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Strategy Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Strategy Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load strategy stack</p>
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
            <Layers className="h-5 w-5" />
            Strategy Stack
            <Badge variant="secondary">
              {stackData.activeCount} Active
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetailsToggle}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {stackData.overlays.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No strategy overlays active</p>
          </div>
        ) : (
          <>
            {/* Vertical Stack Display */}
            <div className="space-y-3 mb-6">
              {stackData.overlays.map((overlay) => (
                <OverlayStackItem
                  key={overlay.id}
                  overlay={overlay}
                  isHovered={hoverOverlayId === overlay.id}
                  onHover={handleOverlayHover}
                  showDetails={showDetails}
                  totalValue={stackData.totalValue}
                />
              ))}
            </div>

            {/* Overall Signal Bar */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-foreground">Overall Signal</div>
                <div className="text-sm text-muted-foreground">
                  Based on {stackData.overlays.length} overlay{stackData.overlays.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <SignalIndicator 
                signal={stackData.overallSignal}
                strength={stackData.signalStrength}
              />
              
              {showDetails && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">Stack Summary</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="ml-1 font-medium">${stackData.totalValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Active Overlays:</span>
                      <span className="ml-1 font-medium">{stackData.activeCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Signal Confidence:</span>
                      <span className="ml-1 font-medium">{(stackData.signalStrength * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StrategyStackPanel; 