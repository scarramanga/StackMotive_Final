import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Scale,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../hooks/useAuth';

// Types for rebalance prompt
interface RebalanceRecommendation {
  hasRecommendation: boolean;
  urgency: 'low' | 'medium' | 'high';
  reason: string;
  count: number;
  triggeredAt?: Date;
  triggerType?: 'threshold' | 'time' | 'volatility' | 'performance';
  thresholdBreached?: number;
  details?: {
    overweightAssets: string[];
    underweightAssets: string[];
    suggestedActions: string[];
  };
}

interface RebalanceMetrics {
  portfolioValue: number;
  driftFromTarget: number;
  lastRebalance?: Date;
  timeSinceRebalance: number;
  volatilityScore: number;
  performanceScore: number;
}

// Urgency indicator component
const UrgencyIndicator: React.FC<{ 
  urgency: 'low' | 'medium' | 'high';
  className?: string;
}> = ({ urgency, className = "" }) => {
  const getUrgencyColor = () => {
    switch (urgency) {
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getUrgencyIcon = () => {
    switch (urgency) {
      case 'low': return <Clock className="h-3 w-3" />;
      case 'medium': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Zap className="h-3 w-3" />;
    }
  };

  return (
    <Badge variant="outline" className={`${getUrgencyColor()} flex items-center gap-1 ${className}`}>
      {getUrgencyIcon()}
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)} Priority
    </Badge>
  );
};

// Trigger explanation component
const TriggerExplanation: React.FC<{ 
  recommendation: RebalanceRecommendation;
  metrics: RebalanceMetrics;
}> = ({ recommendation, metrics }) => {
  const getTriggerDescription = () => {
    switch (recommendation.triggerType) {
      case 'threshold':
        return `Portfolio drift of ${metrics.driftFromTarget.toFixed(1)}% exceeds threshold of ${recommendation.thresholdBreached}%`;
      case 'time':
        return `${metrics.timeSinceRebalance} days since last rebalance (recommended: 30 days)`;
      case 'volatility':
        return `Elevated volatility score of ${metrics.volatilityScore.toFixed(1)} suggests rebalancing opportunity`;
      case 'performance':
        return `Performance divergence score of ${metrics.performanceScore.toFixed(1)} indicates asset class rotation`;
      default:
        return recommendation.reason;
    }
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Triggered:</span>
        <span className="font-medium">{formatTimestamp(recommendation.triggeredAt)}</span>
      </div>
      
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="text-sm font-medium mb-1">Trigger Logic</div>
        <div className="text-sm text-muted-foreground">{getTriggerDescription()}</div>
      </div>

      {recommendation.details && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {recommendation.details.overweightAssets.length > 0 && (
            <div>
              <div className="font-medium text-red-700 mb-1">Overweight Assets</div>
              <div className="space-y-1">
                {recommendation.details.overweightAssets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-2 text-red-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>{asset}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {recommendation.details.underweightAssets.length > 0 && (
            <div>
              <div className="font-medium text-blue-700 mb-1">Underweight Assets</div>
              <div className="space-y-1">
                {recommendation.details.underweightAssets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-2 text-blue-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>{asset}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Collapsed indicator component
const CollapsedIndicator: React.FC<{ 
  onClick: () => void;
  lastChecked: Date;
}> = ({ onClick, lastChecked }) => {
  const formatLastChecked = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastChecked.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-foreground">Portfolio Balanced</div>
              <div className="text-sm text-muted-foreground">
                No rebalancing needed • Last checked {formatLastChecked()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Optimal
            </Badge>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RebalancePromptPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null);

  // Fetch rebalance recommendations
  const { data: rebalanceData, isLoading: isLoadingRebalance } = useQuery({
    queryKey: ['/api/portfolio/rebalance-recommendations', activeVaultId],
    queryFn: async () => {
      const url = activeVaultId 
        ? `/api/portfolio/rebalance-recommendations?vaultId=${activeVaultId}`
        : '/api/portfolio/rebalance-recommendations';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rebalance recommendations');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 300000, // Check every 5 minutes
  });

  // Fetch strategy overlays for context
  const { data: overlayData } = useQuery({
    queryKey: ['/api/strategy/overlays', activeVaultId],
    queryFn: async () => {
      const url = activeVaultId 
        ? `/api/strategy/overlays?vaultId=${activeVaultId}`
        : '/api/strategy/overlays';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch strategy overlays');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 120000,
  });

  // Process rebalance data
  const recommendation: RebalanceRecommendation = useMemo(() => {
    if (!rebalanceData) {
      return {
        hasRecommendation: false,
        urgency: 'low',
        reason: 'Portfolio is well balanced',
        count: 0
      };
    }

    // Generate additional details based on reason
    const generateDetails = () => {
      if (!rebalanceData.hasRecommendation) return undefined;

      // Mock asset analysis based on reason
      const overweightAssets: string[] = [];
      const underweightAssets: string[] = [];
      const suggestedActions: string[] = [];

      if (rebalanceData.reason.toLowerCase().includes('overweight')) {
        const asset = rebalanceData.reason.match(/(\w+) is overweight/)?.[1];
        if (asset) overweightAssets.push(asset);
        suggestedActions.push(`Reduce ${asset} allocation by 3-5%`);
      }

      if (rebalanceData.reason.toLowerCase().includes('underweight')) {
        const asset = rebalanceData.reason.match(/(\w+) is underweight/)?.[1];
        if (asset) underweightAssets.push(asset);
        suggestedActions.push(`Increase ${asset} allocation by 2-4%`);
      }

      return { overweightAssets, underweightAssets, suggestedActions };
    };

    return {
      ...rebalanceData,
      triggeredAt: new Date(Date.now() - Math.random() * 3600000), // Random time within last hour
      triggerType: rebalanceData.urgency === 'high' ? 'threshold' : 
                  rebalanceData.urgency === 'medium' ? 'time' : 'performance',
      thresholdBreached: rebalanceData.urgency === 'high' ? 10 : 
                        rebalanceData.urgency === 'medium' ? 7 : 5,
      details: generateDetails()
    };
  }, [rebalanceData]);

  // Generate portfolio metrics
  const metrics: RebalanceMetrics = useMemo(() => {
    return {
      portfolioValue: 125000 + Math.random() * 50000, // Mock portfolio value
      driftFromTarget: recommendation.urgency === 'high' ? 12.5 : 
                      recommendation.urgency === 'medium' ? 8.2 : 3.1,
      lastRebalance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      timeSinceRebalance: Math.floor(Math.random() * 45) + 5, // 5-50 days
      volatilityScore: Math.random() * 10 + 5, // 5-15 scale
      performanceScore: Math.random() * 8 + 2 // 2-10 scale
    };
  }, [recommendation.urgency]);

  // Update state when recommendation changes
  useEffect(() => {
    if (recommendation.hasRecommendation) {
      setUrgencyLevel(recommendation.urgency);
      setLastTriggered(recommendation.triggeredAt || new Date());
      setRebalanceOpen(recommendation.urgency === 'high'); // Auto-open for high urgency
    }
  }, [recommendation]);

  // Handle preview rebalance button
  const handlePreviewRebalance = () => {
    // This would typically navigate to a rebalance preview page
    console.log('Preview rebalance clicked');
  };

  // Handle panel toggle
  const handleTogglePanel = () => {
    setRebalanceOpen(!rebalanceOpen);
  };

  // Loading state
  if (isLoadingRebalance) {
    return (
      <div className="w-full h-16 bg-muted animate-pulse rounded-lg flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded-lg"></div>
          <div className="space-y-1">
            <div className="w-32 h-4 bg-muted-foreground/20 rounded"></div>
            <div className="w-24 h-3 bg-muted-foreground/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No rebalance needed - show collapsed indicator
  if (!recommendation.hasRecommendation) {
    return (
      <CollapsedIndicator 
        onClick={handleTogglePanel}
        lastChecked={new Date()}
      />
    );
  }

  // Rebalance needed - show full panel
  return (
    <Card className="w-full">
      <CardHeader 
        className="cursor-pointer"
        onClick={handleTogglePanel}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              recommendation.urgency === 'high' ? 'bg-red-100' :
              recommendation.urgency === 'medium' ? 'bg-orange-100' : 'bg-yellow-100'
            }`}>
              <Scale className={`h-5 w-5 ${
                recommendation.urgency === 'high' ? 'text-red-600' :
                recommendation.urgency === 'medium' ? 'text-orange-600' : 'text-yellow-600'
              }`} />
            </div>
            <div>
              <div className="font-medium text-foreground">Rebalance Opportunity</div>
              <div className="text-sm text-muted-foreground">
                {recommendation.count} recommendation{recommendation.count > 1 ? 's' : ''} • {recommendation.reason}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <UrgencyIndicator urgency={recommendation.urgency} />
            {rebalanceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardTitle>
      </CardHeader>
      
      {rebalanceOpen && (
        <CardContent>
          <div className="space-y-6">
            {/* Trigger explanation */}
            <TriggerExplanation 
              recommendation={recommendation}
              metrics={metrics}
            />

            {/* Portfolio metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">${metrics.portfolioValue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Portfolio Value</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{metrics.driftFromTarget.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Drift from Target</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.timeSinceRebalance}</div>
                <div className="text-xs text-muted-foreground">Days Since Rebalance</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{overlayData?.activeCount || 0}</div>
                <div className="text-xs text-muted-foreground">Active Overlays</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={handlePreviewRebalance}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Rebalance
              </Button>
              
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analysis
              </Button>
              
              <Button variant="ghost" size="sm">
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>

            {/* Additional info for high urgency */}
            {recommendation.urgency === 'high' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900 mb-1">High Priority Rebalance</div>
                    <div className="text-sm text-red-700">
                      Your portfolio has drifted significantly from target allocation. 
                      Consider rebalancing soon to maintain your investment strategy.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RebalancePromptPanel; 