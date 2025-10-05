import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for News Stream Relay
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  source: NewsSource;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  tags: string[];
  categories: string[];
  relatedSymbols: string[];
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
  };
  relevanceScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isBreaking: boolean;
  metadata: {
    wordCount: number;
    readingTime: number;
    language: string;
    region: string;
    timezone: string;
    views?: number;
    shares?: number;
    engagementScore?: number;
  };
}

export interface NewsSource {
  id: string;
  name: string;
  displayName: string;
  type: 'major_media' | 'financial_news' | 'blog' | 'social' | 'press_release' | 'research' | 'government';
  credibilityScore: number;
  reliabilityRating: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  bias: 'left' | 'center_left' | 'center' | 'center_right' | 'right' | 'unknown';
  coverage: string[];
  language: string;
  country: string;
  website: string;
  logoUrl?: string;
  isActive: boolean;
  lastUpdate: string;
  articleCount: number;
}

export interface NewsFilter {
  sources?: string[];
  categories?: string[];
  symbols?: string[];
  sentiment?: string[];
  priority?: string[];
  tags?: string[];
  dateRange?: { start: string; end: string };
  minRelevance?: number;
  language?: string;
  region?: string;
  breakingOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NewsAlert {
  id: string;
  type: 'breaking_news' | 'symbol_mention' | 'sentiment_change' | 'high_impact' | 'custom';
  title: string;
  description: string;
  articleId: string;
  symbols: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead: boolean;
  isActive: boolean;
  triggerConditions: {
    keywords?: string[];
    sources?: string[];
    sentimentThreshold?: number;
    relevanceThreshold?: number;
  };
}

export interface NewsAnalytics {
  totalArticles: number;
  breakingNews: number;
  sourceDistribution: Array<{ source: string; count: number; percentage: number }>;
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topSymbols: Array<{ symbol: string; mentions: number; sentiment: number }>;
  topKeywords: Array<{ keyword: string; count: number; trend: 'rising' | 'stable' | 'falling' }>;
  hourlyVolume: Array<{ hour: number; count: number; breakingCount: number }>;
  averageRelevance: number;
  averageSentiment: number;
}

export interface NewsStream {
  id: string;
  name: string;
  description: string;
  filters: NewsFilter;
  isActive: boolean;
  priority: number;
  lastUpdate: string;
  articleCount: number;
  subscribers: number;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    webhook?: string;
  };
}

export interface RelatedStory {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  relevanceScore: number;
  similarityScore: number;
  url: string;
}

// News Stream Relay Service Class
export class NewsStreamRelayService {
  private baseUrl = '/api/news/stream';

  // Get news articles
  async getNewsArticles(filters?: NewsFilter): Promise<{
    articles: NewsArticle[];
    total: number;
    hasMore: boolean;
    analytics: NewsAnalytics;
  }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/articles?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch news articles');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_fetched', {
      articleCount: result.total,
      hasFilters: !!filters,
      filters: filters || {},
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get specific article
  async getArticle(id: string, includeRelated: boolean = true): Promise<{
    article: NewsArticle;
    relatedStories?: RelatedStory[];
  }> {
    const params = new URLSearchParams();
    if (includeRelated) params.append('includeRelated', 'true');
    
    const response = await fetch(`${this.baseUrl}/articles/${id}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch article');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_processed', {
      articleId: id,
      includeRelated,
      hasRelatedStories: !!(result.relatedStories?.length),
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get news sources
  async getNewsSources(options?: {
    type?: string;
    active?: boolean;
    minCredibility?: number;
    country?: string;
  }): Promise<NewsSource[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/sources?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch news sources');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_sources_fetched', {
      sourceCount: result.length,
      options: options || {},
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Create news stream
  async createNewsStream(stream: Omit<NewsStream, 'id' | 'lastUpdate' | 'articleCount' | 'subscribers'>): Promise<NewsStream> {
    const response = await fetch(`${this.baseUrl}/streams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stream),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create news stream');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('feed_updated', {
      action: 'created',
      streamId: result.id,
      streamName: result.name,
      isActive: result.isActive,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Update news stream
  async updateNewsStream(id: string, updates: Partial<NewsStream>): Promise<NewsStream> {
    const response = await fetch(`${this.baseUrl}/streams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update news stream');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('feed_updated', {
      action: 'updated',
      streamId: id,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Delete news stream
  async deleteNewsStream(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/streams/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete news stream');
    }
    
    // Log agent memory
    await this.logAgentMemory('feed_updated', {
      action: 'deleted',
      streamId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Get news alerts
  async getNewsAlerts(options?: {
    unreadOnly?: boolean;
    type?: string;
    severity?: string;
    symbol?: string;
    limit?: number;
  }): Promise<NewsAlert[]> {
    const params = new URLSearchParams();
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/alerts?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch news alerts');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_alerts_fetched', {
      alertCount: result.length,
      options: options || {},
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Create news alert
  async createNewsAlert(alert: Omit<NewsAlert, 'id' | 'timestamp' | 'isRead'>): Promise<NewsAlert> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create news alert');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_alert_created', {
      alertId: result.id,
      alertType: result.type,
      severity: result.severity,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Mark alert as read
  async markAlertAsRead(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}/read`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark alert as read');
    }
    
    // Log agent memory
    await this.logAgentMemory('news_alert_read', {
      alertId: id,
      timestamp: new Date().toISOString()
    });
  }

  // Search news articles
  async searchArticles(query: string, filters?: NewsFilter): Promise<{
    articles: NewsArticle[];
    total: number;
    suggestions: string[];
    facets: {
      sources: Array<{ name: string; count: number }>;
      categories: Array<{ name: string; count: number }>;
      symbols: Array<{ name: string; count: number }>;
    };
  }> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/search?${params}`);
    if (!response.ok) {
      throw new Error('Failed to search articles');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('news_searched', {
      query,
      resultCount: result.total,
      hasFilters: !!filters,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get trending topics
  async getTrendingTopics(timeframe: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<Array<{
    topic: string;
    mentions: number;
    trend: 'rising' | 'stable' | 'falling';
    sentiment: number;
    articles: string[];
    relatedSymbols: string[];
  }>> {
    const response = await fetch(`${this.baseUrl}/trending?timeframe=${timeframe}`);
    if (!response.ok) {
      throw new Error('Failed to fetch trending topics');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('trending_topics_fetched', {
      timeframe,
      topicCount: result.length,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get article sentiment color
  getSentimentColor(sentiment: NewsArticle['sentiment']['overall']): string {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get priority color
  getPriorityColor(priority: NewsArticle['priority']): string {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Get source credibility color
  getCredibilityColor(rating: NewsSource['reliabilityRating']): string {
    switch (rating) {
      case 'very_high': return 'text-green-700';
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-orange-600';
      case 'very_low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Get alert severity color
  getAlertSeverityColor(severity: NewsAlert['severity']): string {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  // Format relative time
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  }

  // Format reading time
  formatReadingTime(minutes: number): string {
    if (minutes < 1) return '< 1 min read';
    return `${Math.round(minutes)} min read`;
  }

  // Format sentiment score
  formatSentimentScore(score: number): string {
    const percentage = Math.round(score * 100);
    return `${percentage >= 0 ? '+' : ''}${percentage}%`;
  }

  // Filter articles
  filterArticles(articles: NewsArticle[], filters: NewsFilter): NewsArticle[] {
    const filtered = articles.filter(article => {
      if (filters.sources && !filters.sources.includes(article.source.id)) {
        return false;
      }
      
      if (filters.categories && !filters.categories.some(cat => article.categories.includes(cat))) {
        return false;
      }
      
      if (filters.symbols && !filters.symbols.some(symbol => article.relatedSymbols.includes(symbol))) {
        return false;
      }
      
      if (filters.sentiment && !filters.sentiment.includes(article.sentiment.overall)) {
        return false;
      }
      
      if (filters.priority && !filters.priority.includes(article.priority)) {
        return false;
      }
      
      if (filters.tags && !filters.tags.some(tag => article.tags.includes(tag))) {
        return false;
      }
      
      if (filters.minRelevance && article.relevanceScore < filters.minRelevance) {
        return false;
      }
      
      if (filters.language && article.metadata.language !== filters.language) {
        return false;
      }
      
      if (filters.region && article.metadata.region !== filters.region) {
        return false;
      }
      
      if (filters.breakingOnly && !article.isBreaking) {
        return false;
      }
      
      if (filters.dateRange) {
        const articleTime = new Date(article.publishedAt);
        const startTime = new Date(filters.dateRange.start);
        const endTime = new Date(filters.dateRange.end);
        if (articleTime < startTime || articleTime > endTime) {
          return false;
        }
      }
      
      return true;
    });
    
    // Log agent memory for filtering
    this.logAgentMemory('news_filtered', {
      originalCount: articles.length,
      filteredCount: filtered.length,
      filtersApplied: Object.keys(filters),
      timestamp: new Date().toISOString()
    });
    
    return filtered;
  }

  // Sort articles
  sortArticles(articles: NewsArticle[], sortBy: 'published' | 'relevance' | 'sentiment' | 'priority', order: 'asc' | 'desc' = 'desc'): NewsArticle[] {
    return [...articles].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'published':
          compareValue = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'relevance':
          compareValue = a.relevanceScore - b.relevanceScore;
          break;
        case 'sentiment':
          compareValue = a.sentiment.score - b.sentiment.score;
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Calculate article engagement score
  calculateEngagementScore(article: NewsArticle): number {
    const { views = 0, shares = 0, wordCount, relevanceScore } = article.metadata;
    
    // Base score from relevance
    let score = relevanceScore * 40;
    
    // Views component (0-30 points)
    const viewsScore = Math.min(30, Math.log10(views + 1) * 10);
    score += viewsScore;
    
    // Shares component (0-20 points)
    const sharesScore = Math.min(20, Math.log10(shares + 1) * 15);
    score += sharesScore;
    
    // Content quality (0-10 points)
    const qualityScore = Math.min(10, Math.max(0, (wordCount - 100) / 50));
    score += qualityScore;
    
    return Math.min(100, score);
  }

  // Get unique categories
  getUniqueCategories(articles: NewsArticle[]): string[] {
    const categories = articles.flatMap(article => article.categories);
    return [...new Set(categories)].sort();
  }

  // Get unique symbols
  getUniqueSymbols(articles: NewsArticle[]): string[] {
    const symbols = articles.flatMap(article => article.relatedSymbols);
    return [...new Set(symbols)].sort();
  }

  // Get unique sources
  getUniqueSources(articles: NewsArticle[]): NewsSource[] {
    const sourceMap = new Map<string, NewsSource>();
    articles.forEach(article => {
      sourceMap.set(article.source.id, article.source);
    });
    return Array.from(sourceMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Calculate news momentum
  calculateNewsMomentum(articles: NewsArticle[], symbol?: string): {
    momentum: 'accelerating' | 'stable' | 'decelerating';
    volume: number;
    sentiment: number;
    breakingCount: number;
  } {
    let filteredArticles = articles;
    if (symbol) {
      filteredArticles = articles.filter(article => article.relatedSymbols.includes(symbol));
    }
    
    // Get articles from last 24 hours
    const now = new Date();
    const recent = filteredArticles.filter(article => 
      new Date(article.publishedAt) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    
    // Get articles from previous 24 hours
    const previous = filteredArticles.filter(article => {
      const time = new Date(article.publishedAt);
      return time > new Date(now.getTime() - 48 * 60 * 60 * 1000) && 
             time <= new Date(now.getTime() - 24 * 60 * 60 * 1000);
    });
    
    const volume = recent.length;
    const previousVolume = previous.length;
    
    let momentum: 'accelerating' | 'stable' | 'decelerating';
    if (volume > previousVolume * 1.2) momentum = 'accelerating';
    else if (volume < previousVolume * 0.8) momentum = 'decelerating';
    else momentum = 'stable';
    
    const sentiment = recent.length > 0 
      ? recent.reduce((sum, article) => sum + article.sentiment.score, 0) / recent.length
      : 0;
    
    const breakingCount = recent.filter(article => article.isBreaking).length;
    
    return { momentum, volume, sentiment, breakingCount };
  }

  // Generate news summary
  generateNewsSummary(articles: NewsArticle[], timeframe: string = '24h'): {
    totalArticles: number;
    breakingNews: number;
    topStories: NewsArticle[];
    sentimentOverview: string;
    keyTopics: string[];
    mostMentionedSymbols: Array<{ symbol: string; count: number }>;
  } {
    const totalArticles = articles.length;
    const breakingNews = articles.filter(article => article.isBreaking).length;
    
    const topStories = this.sortArticles(articles, 'relevance').slice(0, 5);
    
    const avgSentiment = articles.length > 0 
      ? articles.reduce((sum, article) => sum + article.sentiment.score, 0) / articles.length
      : 0;
    
    let sentimentOverview = '';
    if (avgSentiment > 0.2) sentimentOverview = 'Generally positive sentiment';
    else if (avgSentiment < -0.2) sentimentOverview = 'Generally negative sentiment';
    else sentimentOverview = 'Mixed sentiment';
    
    // Extract key topics from tags
    const tagCounts = articles.reduce((counts, article) => {
      article.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
    
    const keyTopics = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag]) => tag);
    
    // Count symbol mentions
    const symbolCounts = articles.reduce((counts, article) => {
      article.relatedSymbols.forEach(symbol => {
        counts[symbol] = (counts[symbol] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
    
    const mostMentionedSymbols = Object.entries(symbolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }));
    
    return {
      totalArticles,
      breakingNews,
      topStories,
      sentimentOverview,
      keyTopics,
      mostMentionedSymbols
    };
  }

  // Create default news filter
  createDefaultNewsFilter(): NewsFilter {
    return {
      limit: 50,
      offset: 0,
      minRelevance: 0.3,
      language: 'en',
      breakingOnly: false
    };
  }

  // Validate news filter
  validateNewsFilter(filter: NewsFilter): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (filter.limit && (filter.limit < 1 || filter.limit > 1000)) {
      errors.push('Limit must be between 1 and 1000');
    }
    
    if (filter.offset && filter.offset < 0) {
      errors.push('Offset must be non-negative');
    }
    
    if (filter.minRelevance && (filter.minRelevance < 0 || filter.minRelevance > 1)) {
      errors.push('Min relevance must be between 0 and 1');
    }
    
    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start);
      const end = new Date(filter.dateRange.end);
      if (start >= end) {
        errors.push('Start date must be before end date');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Agent memory logging
  async logAgentMemory(
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'NewsStreamRelayService',
          action,
          details,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to log agent memory:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging agent memory:', error);
    }
  }
}

// Service instance
export const newsStreamRelayService = new NewsStreamRelayService();

// React Query hooks
export const useNewsArticles = (filters?: NewsFilter) => {
  return useQuery({
    queryKey: ['/api/news/stream/articles', filters],
    queryFn: () => newsStreamRelayService.getNewsArticles(filters),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useArticle = (id: string, includeRelated: boolean = true) => {
  return useQuery({
    queryKey: ['/api/news/stream/articles', id, includeRelated],
    queryFn: () => newsStreamRelayService.getArticle(id, includeRelated),
    enabled: !!id,
  });
};

export const useNewsSources = (options?: any) => {
  return useQuery({
    queryKey: ['/api/news/stream/sources', options],
    queryFn: () => newsStreamRelayService.getNewsSources(options),
  });
};

export const useCreateNewsStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (stream: any) => 
      newsStreamRelayService.createNewsStream(stream),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news/stream/streams'] });
    },
  });
};

export const useUpdateNewsStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<NewsStream> }) => 
      newsStreamRelayService.updateNewsStream(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news/stream/streams'] });
    },
  });
};

export const useDeleteNewsStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      newsStreamRelayService.deleteNewsStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news/stream/streams'] });
    },
  });
};

export const useNewsAlerts = (options?: any) => {
  return useQuery({
    queryKey: ['/api/news/stream/alerts', options],
    queryFn: () => newsStreamRelayService.getNewsAlerts(options),
    refetchInterval: 30000,
  });
};

export const useCreateNewsAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alert: any) => 
      newsStreamRelayService.createNewsAlert(alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news/stream/alerts'] });
    },
  });
};

export const useMarkNewsAlertAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => 
      newsStreamRelayService.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news/stream/alerts'] });
    },
  });
};

export const useSearchArticles = (query: string, filters?: NewsFilter) => {
  return useQuery({
    queryKey: ['/api/news/stream/search', query, filters],
    queryFn: () => newsStreamRelayService.searchArticles(query, filters),
    enabled: !!query && query.length > 2,
  });
};

export const useTrendingTopics = (timeframe: '1h' | '6h' | '24h' | '7d' = '24h') => {
  return useQuery({
    queryKey: ['/api/news/stream/trending', timeframe],
    queryFn: () => newsStreamRelayService.getTrendingTopics(timeframe),
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}; 