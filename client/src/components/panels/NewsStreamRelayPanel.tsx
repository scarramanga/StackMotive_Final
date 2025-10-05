import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Newspaper,
  ExternalLink,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  Tag,
  Loader2,
  BarChart3,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  author?: string;
  publishedAt: string;
  url: string;
  sentiment: {
    score: number; // -100 to 100
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  relevanceScore: number;
  tags: string[];
  assetMentions: string[];
  category: 'market' | 'crypto' | 'economic' | 'regulatory' | 'technology' | 'other';
  isBreaking: boolean;
  readTime: number; // in minutes
}

interface NewsStreamData {
  items: NewsItem[];
  totalCount: number;
  hasMore: boolean;
  lastUpdated: string;
  summary: {
    totalArticles: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    topSources: Array<{
      source: string;
      count: number;
    }>;
    mostMentioned: Array<{
      asset: string;
      count: number;
    }>;
    breakingNews: number;
  };
}

interface SentimentTagsData {
  [itemId: string]: {
    tags: Array<{
      tag: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      confidence: number;
    }>;
  };
}

export const NewsStreamRelayPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Fetch news stream data
  const { data: newsData, isLoading, error } = useQuery<NewsStreamData>({
    queryKey: ['/api/news/stream', activeVaultId, searchTerm, sourceFilter, sentimentFilter, categoryFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (activeVaultId) params.append('vaultId', activeVaultId);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (sentimentFilter !== 'all') params.append('sentiment', sentimentFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const res = await fetch(`/api/news/stream?${params}`);
      if (!res.ok) throw new Error('Failed to fetch news stream');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 30000,
  });

  // Fetch sentiment tags for expanded items
  const { data: sentimentTags } = useQuery<SentimentTagsData>({
    queryKey: ['/api/news/sentiment-tags', activeVaultId, Array.from(expandedItems)],
    queryFn: async () => {
      if (expandedItems.size === 0) return {};
      
      const params = new URLSearchParams({
        itemIds: Array.from(expandedItems).join(','),
      });
      
      if (activeVaultId) params.append('vaultId', activeVaultId);
      
      const res = await fetch(`/api/news/sentiment-tags?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sentiment tags');
      return res.json();
    },
    enabled: !!user && !!activeVaultId && expandedItems.size > 0,
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'source':
        setSourceFilter(value);
        break;
      case 'sentiment':
        setSentimentFilter(value);
        break;
      case 'category':
        setCategoryFilter(value);
        break;
    }
    setPage(1);
  };

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/news/stream'] });
    queryClient.invalidateQueries({ queryKey: ['/api/news/sentiment-tags'] });
  };

  // Toggle expanded item
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Get sentiment badge
  const getSentimentBadge = (sentiment: { score: number; label: string; confidence: number }) => {
    switch (sentiment.label) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">Negative</Badge>;
      case 'neutral':
        return <Badge className="bg-gray-100 text-gray-800">Neutral</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{sentiment.label}</Badge>;
    }
  };

  // Get sentiment icon
  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      market: 'bg-blue-100 text-blue-800',
      crypto: 'bg-orange-100 text-orange-800',
      economic: 'bg-purple-100 text-purple-800',
      regulatory: 'bg-red-100 text-red-800',
      technology: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={categoryColors[category as keyof typeof categoryColors] || categoryColors.other}>
        {category.toUpperCase()}
      </Badge>
    );
  };

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get unique sources
  const uniqueSources = React.useMemo(() => {
    if (!newsData?.items) return [];
    const sources = new Set(newsData.items.map(item => item.source));
    return Array.from(sources);
  }, [newsData?.items]);

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading news stream: {error.message}
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
            Loading news stream...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!newsData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No news data available
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
            <Newspaper className="h-5 w-5" />
            News Stream Relay
            <Badge className="bg-blue-100 text-blue-800">
              {newsData.totalCount} articles
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {newsData.summary.positiveCount}
              </div>
              <div className="text-sm text-green-700">Positive</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {newsData.summary.neutralCount}
              </div>
              <div className="text-sm text-gray-700">Neutral</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {newsData.summary.negativeCount}
              </div>
              <div className="text-sm text-red-700">Negative</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {newsData.summary.breakingNews}
              </div>
              <div className="text-sm text-orange-700">Breaking</div>
            </div>
          </div>

          {/* Top Sources and Most Mentioned */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-3">Top Sources</h3>
              <div className="space-y-2">
                {newsData.summary.topSources.slice(0, 5).map((source, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">{source.source}</span>
                    <Badge className="bg-blue-100 text-blue-800">{source.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-3">Most Mentioned Assets</h3>
              <div className="space-y-2">
                {newsData.summary.mostMentioned.slice(0, 5).map((asset, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">{asset.asset}</span>
                    <Badge className="bg-purple-100 text-purple-800">{asset.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sourceFilter} onValueChange={(value) => handleFilterChange('source', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sentimentFilter} onValueChange={(value) => handleFilterChange('sentiment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="economic">Economic</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* News Items */}
          <div className="space-y-4">
            {newsData.items.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.isBreaking && (
                        <Badge className="bg-red-100 text-red-800">BREAKING</Badge>
                      )}
                      {getCategoryBadge(item.category)}
                      {getSentimentBadge(item.sentiment)}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.publishedAt)}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.summary}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      {expandedItems.has(item.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {item.source}
                    </div>
                    {item.author && (
                      <div>by {item.author}</div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.readTime}min read
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getSentimentIcon(item.sentiment.label)}
                    <span>{item.sentiment.confidence.toFixed(0)}% confident</span>
                  </div>
                </div>

                {/* Tags and Asset Mentions */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.assetMentions.map((asset, index) => (
                    <Badge key={index} className="bg-yellow-100 text-yellow-800 text-xs">
                      {asset}
                    </Badge>
                  ))}
                  {item.tags.map((tag, index) => (
                    <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Expanded Content */}
                {expandedItems.has(item.id) && (
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="prose prose-sm max-w-none mb-4">
                      <p className="text-sm leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    
                    {/* Sentiment Tags */}
                    {sentimentTags?.[item.id] && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Sentiment Analysis</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {sentimentTags[item.id].tags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              className={`text-xs ${
                                tag.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                tag.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tag.tag} ({tag.confidence.toFixed(0)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More */}
          {newsData.hasMore && (
            <div className="text-center">
              <Button
                onClick={() => setPage(page + 1)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}

          {/* No Results */}
          {newsData.items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No news articles found matching your filters
            </div>
          )}

          {/* Information */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">News Stream Information</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• <strong>Real-time Feed:</strong> Updates every 30 seconds with latest news</div>
              <div>• <strong>Sentiment Analysis:</strong> AI-powered sentiment scoring for each article</div>
              <div>• <strong>Asset Mentions:</strong> Automatic detection of cryptocurrency and asset references</div>
              <div>• <strong>Breaking News:</strong> High-priority articles marked with breaking news badge</div>
              <div>• <strong>Last Updated:</strong> {formatTime(newsData.lastUpdated)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsStreamRelayPanel; 