import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Feed Engine Plug
export interface FeedSource {
  id: string;
  name: string;
  type: 'news' | 'social' | 'market_data' | 'research' | 'analyst' | 'custom';
  url: string;
  isActive: boolean;
  lastUpdate: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  credentialsRequired: boolean;
  updateFrequency: number; // minutes
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  metadata: {
    description?: string;
    apiVersion?: string;
    supportedFormats?: string[];
    rateLimits?: {
      requestsPerHour: number;
      requestsPerDay: number;
    };
  };
}

export interface FeedData {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  timestamp: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  relevanceScore?: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface FeedCredentials {
  sourceId: string;
  apiKey?: string;
  accessToken?: string;
  secretKey?: string;
  username?: string;
  password?: string;
  customFields?: Record<string, string>;
}

export interface FeedEngineData {
  sources: FeedSource[];
  recentFeeds: FeedData[];
  totalSources: number;
  activeSources: number;
  totalFeeds: number;
  averageSentiment: number;
  lastSyncTime: string;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    errors: string[];
  };
}

// Feed Engine Plug Service Class
export class FeedEnginePlugService {
  private baseUrl = '/api/feeds';

  // Fetch feed engine data
  async getFeedEngineData(vaultId?: string): Promise<FeedEngineData> {
    const url = vaultId 
      ? `${this.baseUrl}/engine?vaultId=${vaultId}`
      : `${this.baseUrl}/engine`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch feed engine data');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('data_processed', {
      totalSources: result.totalSources,
      activeSources: result.activeSources,
      totalFeeds: result.totalFeeds,
      systemStatus: result.systemHealth.status,
      vaultId: vaultId || null,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Add new feed source
  async addFeedSource(source: Omit<FeedSource, 'id' | 'lastUpdate' | 'status'>, vaultId?: string): Promise<FeedSource> {
    const url = vaultId 
      ? `${this.baseUrl}/sources?vaultId=${vaultId}`
      : `${this.baseUrl}/sources`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'add_feed_source',
        error: `Failed to add feed source: ${response.status}`,
        sourceType: source.type,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to add feed source');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('feed_connected', {
      sourceId: result.id,
      sourceName: result.name,
      sourceType: result.type,
      isActive: result.isActive,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Update feed source
  async updateFeedSource(id: string, updates: Partial<FeedSource>, vaultId?: string): Promise<FeedSource> {
    const url = vaultId 
      ? `${this.baseUrl}/sources/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/sources/${id}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'update_feed_source',
        error: `Failed to update feed source: ${response.status}`,
        sourceId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to update feed source');
    }
    
    const result = await response.json();
    
    // Log agent memory for status changes
    if (updates.isActive !== undefined) {
      await this.logAgentMemory(updates.isActive ? 'feed_connected' : 'feed_disconnected', {
        sourceId: id,
        sourceName: result.name,
        sourceType: result.type,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      });
    } else {
      await this.logAgentMemory('feed_updated', {
        sourceId: id,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }

  // Delete feed source
  async deleteFeedSource(id: string, vaultId?: string): Promise<void> {
    const url = vaultId 
      ? `${this.baseUrl}/sources/${id}?vaultId=${vaultId}`
      : `${this.baseUrl}/sources/${id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'delete_feed_source',
        error: `Failed to delete feed source: ${response.status}`,
        sourceId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to delete feed source');
    }
    
    // Log agent memory
    await this.logAgentMemory('feed_disconnected', {
      sourceId: id,
      action: 'deleted',
      timestamp: new Date().toISOString()
    });
  }

  // Test feed source connection
  async testFeedSource(id: string, vaultId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const url = vaultId 
      ? `${this.baseUrl}/sources/${id}/test?vaultId=${vaultId}`
      : `${this.baseUrl}/sources/${id}/test`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'test_feed_source',
        error: `Failed to test feed source: ${response.status}`,
        sourceId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to test feed source');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('feed_tested', {
      sourceId: id,
      testResult: result.success ? 'success' : 'failure',
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Set feed source credentials
  async setFeedCredentials(credentials: FeedCredentials, vaultId?: string): Promise<{ success: boolean }> {
    const url = vaultId 
      ? `${this.baseUrl}/credentials?vaultId=${vaultId}`
      : `${this.baseUrl}/credentials`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'set_feed_credentials',
        error: `Failed to set credentials: ${response.status}`,
        sourceId: credentials.sourceId,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to set feed credentials');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('credentials_updated', {
      sourceId: credentials.sourceId,
      credentialTypes: Object.keys(credentials).filter(k => k !== 'sourceId'),
      success: result.success,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Sync all feeds
  async syncAllFeeds(vaultId?: string): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    const url = vaultId 
      ? `${this.baseUrl}/sync?vaultId=${vaultId}`
      : `${this.baseUrl}/sync`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
      await this.logAgentMemory('error_handled', {
        action: 'sync_all_feeds',
        error: `Failed to sync feeds: ${response.status}`,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to sync feeds');
    }
    
    const result = await response.json();
    
    // Log agent memory
    await this.logAgentMemory('data_processed', {
      action: 'sync_all_feeds',
      syncedCount: result.syncedCount,
      errorCount: result.errors.length,
      success: result.success,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  // Get feed source status color
  getSourceStatusColor(status: FeedSource['status']): string {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  // Get feed source status background
  getSourceStatusBackground(status: FeedSource['status']): string {
    switch (status) {
      case 'connected': return 'bg-green-50 border-green-200';
      case 'disconnected': return 'bg-gray-50 border-gray-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  // Get priority color
  getPriorityColor(priority: FeedSource['priority']): string {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  // Get sentiment color
  getSentimentColor(sentiment?: FeedData['sentiment']): string {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }

  // Format update frequency
  formatUpdateFrequency(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  }

  // Calculate uptime percentage
  calculateUptimePercentage(uptime: number): number {
    return Math.min(100, Math.max(0, uptime));
  }

  // Get system health color
  getSystemHealthColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // Validate feed source URL
  validateFeedUrl(url: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!url.trim()) {
      errors.push('URL is required');
      return { isValid: false, errors };
    }
    
    try {
      const parsedUrl = new URL(url);
      
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
      
      if (!parsedUrl.hostname) {
        errors.push('URL must have a valid hostname');
      }
    } catch (error) {
      errors.push('Invalid URL format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Filter sources by type
  filterSourcesByType(sources: FeedSource[], type: string): FeedSource[] {
    if (type === 'all') return sources;
    return sources.filter(source => source.type === type);
  }

  // Filter sources by status
  filterSourcesByStatus(sources: FeedSource[], status: string): FeedSource[] {
    if (status === 'all') return sources;
    return sources.filter(source => source.status === status);
  }

  // Sort sources by various criteria
  sortSources(sources: FeedSource[], sortBy: 'name' | 'type' | 'status' | 'lastUpdate' | 'priority', order: 'asc' | 'desc' = 'asc'): FeedSource[] {
    return [...sources].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'type':
          compareValue = a.type.localeCompare(b.type);
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'lastUpdate':
          compareValue = new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  }

  // Get feed type icon
  getFeedTypeIcon(type: FeedSource['type']): string {
    switch (type) {
      case 'news': return 'newspaper';
      case 'social': return 'message-circle';
      case 'market_data': return 'trending-up';
      case 'research': return 'file-text';
      case 'analyst': return 'user';
      case 'custom': return 'settings';
      default: return 'rss';
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

  // Calculate average sentiment
  calculateAverageSentiment(feeds: FeedData[]): number {
    const feedsWithSentiment = feeds.filter(feed => feed.sentiment);
    if (feedsWithSentiment.length === 0) return 0;
    
    const sentimentValues = feedsWithSentiment.map(feed => {
      switch (feed.sentiment) {
        case 'positive': return 1;
        case 'negative': return -1;
        case 'neutral': return 0;
        default: return 0;
      }
    });
    
    const average = sentimentValues.reduce((sum, value) => sum + value, 0) / sentimentValues.length;
    return Math.round(average * 100) / 100;
  }

  // Get unique feed types
  getUniqueFeedTypes(sources: FeedSource[]): string[] {
    return [...new Set(sources.map(source => source.type))];
  }

  // Get unique tags
  getUniqueTags(sources: FeedSource[]): string[] {
    const allTags = sources.flatMap(source => source.tags);
    return [...new Set(allTags)].sort();
  }

  // Create default feed source
  createDefaultFeedSource(): Omit<FeedSource, 'id' | 'lastUpdate' | 'status'> {
    return {
      name: '',
      type: 'news',
      url: '',
      isActive: true,
      credentialsRequired: false,
      updateFrequency: 60, // 1 hour
      priority: 'medium',
      tags: [],
      metadata: {
        description: '',
        supportedFormats: ['json', 'xml'],
        rateLimits: {
          requestsPerHour: 100,
          requestsPerDay: 1000
        }
      }
    };
  }

  // Validate feed source form
  validateFeedSourceForm(source: Partial<FeedSource>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!source.name?.trim()) {
      errors.push('Source name is required');
    }
    
    if (!source.url?.trim()) {
      errors.push('Source URL is required');
    } else {
      const urlValidation = this.validateFeedUrl(source.url);
      if (!urlValidation.isValid) {
        errors.push(...urlValidation.errors);
      }
    }
    
    if (!source.type) {
      errors.push('Source type is required');
    }
    
    if (source.updateFrequency && source.updateFrequency < 1) {
      errors.push('Update frequency must be at least 1 minute');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate feed statistics
  calculateFeedStats(feeds: FeedData[]): {
    totalFeeds: number;
    positiveFeeds: number;
    negativeFeeds: number;
    neutralFeeds: number;
    averageRelevance: number;
    averageConfidence: number;
    topTags: Array<{ tag: string; count: number }>;
  } {
    const positiveFeeds = feeds.filter(f => f.sentiment === 'positive').length;
    const negativeFeeds = feeds.filter(f => f.sentiment === 'negative').length;
    const neutralFeeds = feeds.filter(f => f.sentiment === 'neutral').length;
    
    const feedsWithRelevance = feeds.filter(f => f.relevanceScore !== undefined);
    const averageRelevance = feedsWithRelevance.length > 0 
      ? feedsWithRelevance.reduce((sum, f) => sum + (f.relevanceScore || 0), 0) / feedsWithRelevance.length
      : 0;
    
    const feedsWithConfidence = feeds.filter(f => f.confidence !== undefined);
    const averageConfidence = feedsWithConfidence.length > 0
      ? feedsWithConfidence.reduce((sum, f) => sum + (f.confidence || 0), 0) / feedsWithConfidence.length
      : 0;
    
    // Calculate top tags
    const tagCounts = feeds.reduce((counts, feed) => {
      feed.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
    
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const stats = {
      totalFeeds: feeds.length,
      positiveFeeds,
      negativeFeeds,
      neutralFeeds,
      averageRelevance,
      averageConfidence,
      topTags
    };
    
    // Log agent memory for stats calculation
    this.logAgentMemory('data_processed', {
      action: 'calculate_feed_stats',
      stats,
      timestamp: new Date().toISOString()
    });
    
    return stats;
  }

  // Format confidence percentage
  formatConfidence(confidence?: number): string {
    if (confidence === undefined) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  }

  // Format relevance score
  formatRelevanceScore(score?: number): string {
    if (score === undefined) return 'N/A';
    return score.toFixed(2);
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
          component: 'FeedEnginePlugService',
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
export const feedEnginePlugService = new FeedEnginePlugService();

// React Query hooks
export const useFeedEngineData = (vaultId?: string, user?: any) => {
  return useQuery({
    queryKey: ['/api/feeds/engine', vaultId],
    queryFn: () => feedEnginePlugService.getFeedEngineData(vaultId),
    enabled: !!user && !!vaultId,
    refetchInterval: 30000,
  });
};

export const useAddFeedSource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ source, vaultId }: { source: Omit<FeedSource, 'id' | 'lastUpdate' | 'status'>; vaultId?: string }) => 
      feedEnginePlugService.addFeedSource(source, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/engine'] });
    },
  });
};

export const useUpdateFeedSource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, vaultId }: { id: string; updates: Partial<FeedSource>; vaultId?: string }) => 
      feedEnginePlugService.updateFeedSource(id, updates, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/engine'] });
    },
  });
};

export const useDeleteFeedSource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      feedEnginePlugService.deleteFeedSource(id, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/engine'] });
    },
  });
};

export const useTestFeedSource = () => {
  return useMutation({
    mutationFn: ({ id, vaultId }: { id: string; vaultId?: string }) => 
      feedEnginePlugService.testFeedSource(id, vaultId),
  });
};

export const useSetFeedCredentials = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ credentials, vaultId }: { credentials: FeedCredentials; vaultId?: string }) => 
      feedEnginePlugService.setFeedCredentials(credentials, vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/engine'] });
    },
  });
};

export const useSyncAllFeeds = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ vaultId }: { vaultId?: string }) => 
      feedEnginePlugService.syncAllFeeds(vaultId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/engine'] });
    },
  });
}; 