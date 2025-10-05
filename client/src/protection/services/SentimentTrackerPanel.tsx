import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MessageCircle,
  Newspaper,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  useLiveSentiment,
  sentimentService,
  type SentimentIndicator
} from '../../services/sentimentService';

export const SentimentTrackerPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'heatmap'>('grid');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [demoData, setDemoData] = useState(sentimentService.generateDemoSentiment());

  // Use demo data for now (in production, this would be real API data)
  const { data: sentimentData, isLoading, error, refetch } = useLiveSentiment();

  // Refresh demo data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoData(sentimentService.generateDemoSentiment());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Use demo data if real data is not available
  const data = sentimentData || demoData;

  // Filter indicators by category
  const filteredIndicators = selectedCategory === 'all' 
    ? data.indicators 
    : data.indicators.filter(indicator => indicator.category === selectedCategory);

  // Get available categories
  const categories = [...new Set(data.indicators.map(i => i.category))];

  // Handle category filter change with logging
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    
    // Log agent memory
    sentimentService.logAgentMemory('sentiment_filtered', {
      userId: (user as any)?.id || '1',
      vaultId: activeVaultId || undefined,
      metadata: { 
        filterType: 'category', 
        filterValue: value, 
        totalIndicators: data.indicators.length,
        filteredCount: value === 'all' ? data.indicators.length : data.indicators.filter(i => i.category === value).length
      }
    });
  };

  // Handle timeframe change with logging
  const handleTimeframeChange = (value: 'daily' | 'weekly') => {
    setTimeframe(value);
    
    // Log agent memory
    sentimentService.logAgentMemory('timeframe_changed', {
      userId: (user as any)?.id || '1',
      vaultId: activeVaultId || undefined,
      metadata: { 
        oldTimeframe: timeframe,
        newTimeframe: value,
        totalIndicators: data.indicators.length
      }
    });
  };

  // Handle view mode change with logging
  const handleViewModeChange = (mode: 'grid' | 'heatmap') => {
    setViewMode(mode);
    
    // Log agent memory
    sentimentService.logAgentMemory('view_mode_changed', {
      userId: (user as any)?.id || '1',
      vaultId: activeVaultId || undefined,
      metadata: { 
        oldViewMode: viewMode,
        newViewMode: mode,
        currentCategory: selectedCategory,
        totalIndicators: data.indicators.length
      }
    });
  };

  // Handle manual refresh with logging
  const handleRefresh = () => {
    setDemoData(sentimentService.generateDemoSentiment());
    
    // Log agent memory
    sentimentService.logAgentMemory('sentiment_refreshed', {
      userId: (user as any)?.id || '1',
      vaultId: activeVaultId || undefined,
      metadata: { 
        viewMode,
        selectedCategory,
        timeframe,
        totalIndicators: data.indicators.length
      }
    });
  };

  // Render sentiment indicator card
  const renderSentimentCard = (indicator: SentimentIndicator) => {
    const sentimentColor = sentimentService.getSentimentColor(indicator.sentiment.score);
    const bgColor = sentimentService.getSentimentBgColor(indicator.sentiment.score);
    const trendIcon = sentimentService.getTrendIcon(indicator.trends.hour24);
    
    return (
      <Card key={indicator.symbol} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{indicator.symbol}</CardTitle>
              <p className="text-sm text-muted-foreground">{indicator.name}</p>
            </div>
            <Badge variant="secondary" className="text-xs capitalize">
              {indicator.category}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Sentiment Score */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Sentiment Score</div>
              <div className={`text-2xl font-bold ${sentimentColor}`}>
                {sentimentService.formatSentimentScore(indicator.sentiment.score)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="text-lg font-semibold">{indicator.sentiment.confidence.toFixed(0)}%</div>
            </div>
          </div>

          {/* Sentiment Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${bgColor}`}
                style={{ 
                  width: `${Math.max(5, Math.min(95, (indicator.sentiment.score + 100) / 2))}%`,
                  marginLeft: indicator.sentiment.score < 0 ? '0' : 'auto'
                }}
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Bullish</div>
              <div className="text-sm font-semibold text-green-600">
                {indicator.metrics.bullishPercent.toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Neutral</div>
              <div className="text-sm font-semibold text-gray-600">
                {indicator.metrics.neutralPercent.toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Bearish</div>
              <div className="text-sm font-semibold text-red-600">
                {indicator.metrics.bearishPercent.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-lg">{trendIcon}</span>
              <div>
                <div className="text-xs text-muted-foreground">24h Change</div>
                <div className={`text-sm font-semibold ${
                  indicator.trends.hour24 > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {sentimentService.formatTrendChange(indicator.trends.hour24)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="text-sm font-semibold">
                {sentimentService.formatVolume(indicator.metrics.socialVolume)}
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{indicator.sources.reddit.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>{indicator.sources.twitter.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Newspaper className="h-3 w-3" />
              <span>{indicator.sources.news.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>{indicator.sources.technical.toFixed(0)}</span>
            </div>
          </div>

          {/* Fear & Greed Index for crypto */}
          {indicator.metrics.fearGreedIndex !== undefined && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">Fear & Greed Index</div>
              <div className="flex items-center justify-between">
                <div className={`text-lg font-bold ${
                  sentimentService.getFearGreedColor(indicator.metrics.fearGreedIndex)
                }`}>
                  {indicator.metrics.fearGreedIndex.toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {sentimentService.getFearGreedLabel(indicator.metrics.fearGreedIndex)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render heatmap
  const renderHeatmap = () => {
    return (
      <div className="space-y-4">
        {Object.entries(data.heatmap.categories).map(([category, categoryData]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{categoryData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {categoryData.indicators.map((indicator) => (
                  <div
                    key={indicator.symbol}
                    className="p-3 rounded-lg border text-center hover:shadow-md transition-shadow"
                    style={{
                      backgroundColor: `rgba(${
                        indicator.sentiment.score > 0 ? '34, 197, 94' : '239, 68, 68'
                      }, ${Math.abs(indicator.sentiment.score) / 200 + 0.1})`
                    }}
                  >
                    <div className="font-semibold">{indicator.symbol}</div>
                    <div className={`text-sm ${sentimentService.getSentimentColor(indicator.sentiment.score)}`}>
                      {sentimentService.formatSentimentScore(indicator.sentiment.score)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            Error loading sentiment data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Sentiment Tracker
              <Badge variant="secondary" className="text-xs">
                {data.summary.totalIndicators} assets
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data.summary.bullishCount}</div>
            <div className="text-xs text-muted-foreground">Bullish</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{data.summary.neutralCount}</div>
            <div className="text-xs text-muted-foreground">Neutral</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{data.summary.bearishCount}</div>
            <div className="text-xs text-muted-foreground">Bearish</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${
              sentimentService.getSentimentColor(data.summary.avgSentiment)
            }`}>
              {sentimentService.formatSentimentScore(data.summary.avgSentiment)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Sentiment</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.summary.volatilityIndex.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Volatility Index</div>
          </CardContent>
        </Card>
      </div>

      {/* Global Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Global Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${
                sentimentService.getSentimentColor(data.heatmap.globalSentiment.score)
              }`}>
                {sentimentService.formatSentimentScore(data.heatmap.globalSentiment.score)}
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {sentimentService.getSentimentLabel(data.heatmap.globalSentiment.score)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Overall market sentiment
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${
                data.heatmap.globalSentiment.change24h > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.heatmap.globalSentiment.trend === 'up' ? <TrendingUp className="h-5 w-5" /> : 
                 data.heatmap.globalSentiment.trend === 'down' ? <TrendingDown className="h-5 w-5" /> : 
                 <Activity className="h-5 w-5" />}
              </div>
              <div className="text-sm text-muted-foreground">
                {sentimentService.formatTrendChange(data.heatmap.globalSentiment.change24h)} 24h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="weekly">Weekly View</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => handleViewModeChange('grid')}
          >
            Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'heatmap' ? 'default' : 'outline'}
            onClick={() => handleViewModeChange('heatmap')}
          >
            Heatmap
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            filteredIndicators.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sentiment data</h3>
                  <p className="text-muted-foreground">
                    {selectedCategory !== 'all' ? 'Try selecting a different category' : 'Sentiment data will appear here'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIndicators.map(renderSentimentCard)}
              </div>
            )
          ) : (
            renderHeatmap()
          )}
        </>
      )}
    </div>
  );
};

export default SentimentTrackerPanel; 