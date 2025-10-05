import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for sentiment analysis
export interface SentimentAnalysis {
  symbol: string;
  lastUpdated: Date;
  timeframe: string;
  overallScore: {
    value: number; // 0-100 sentiment score
    change: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  sources: {
    news: {
      count: number;
      score: number;
      articles: Array<{
        title: string;
        source: string;
        url: string;
        summary?: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        score: number;
        timestamp: string;
        keywords?: string[];
      }>;
    };
    social: {
      count: number;
      score: number;
      posts: Array<{
        author: string;
        platform: string;
        content: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        score: number;
        timestamp: string;
        metrics?: {
          likes: number;
          shares: number;
          comments: number;
        };
      }>;
    };
    analyst: {
      count: number;
      score: number;
      consensus: 'buy' | 'sell' | 'hold' | 'neutral';
      priceTargets: {
        average: number;
        high: number;
        low: number;
      };
    };
  };
  keywordAnalysis: Array<{
    keyword: string;
    frequency: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  events: Array<{
    type: string;
    title: string;
    date: string;
    importance: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'negative' | 'neutral';
    description?: string;
  }>;
}

// Cache for sentiment analysis to reduce API calls
const sentimentCache = new Map<string, { data: SentimentAnalysis, timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL

/**
 * Get portfolio data
 */
async function getPortfolioData(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: {
      userId: userId
    },
    include: {
      asset: true
    }
  });
  
  return holdings;
}

/**
 * Get watchlist data
 */
async function getWatchlist() {
  try {
    // This would typically come from a database, but for simplicity we'll use mock data
    return [
      { id: 1, userId: 1, symbol: "AAPL", exchange: "NASDAQ" },
      { id: 2, userId: 1, symbol: "MSFT", exchange: "NASDAQ" },
      { id: 3, userId: 1, symbol: "GOOGL", exchange: "NASDAQ" },
      { id: 4, userId: 1, symbol: "AMZN", exchange: "NASDAQ" }
    ];
  } catch (error) {
    console.error('Error reading watchlist:', error);
    return [];
  }
}

/**
 * Find news articles for a symbol in the portfolio
 */
function findNewsArticles(symbol: string) {
  try {
    const portfolio = getPortfolioData(1);
    
    // Check in equities
    const equity = portfolio.equities.find((asset: any) => asset.Symbol === symbol);
    if (equity && equity.news) {
      return equity.news;
    }
    
    // Check in crypto
    const crypto = portfolio.crypto.find((asset: any) => asset.Symbol === symbol);
    if (crypto && crypto.news) {
      return crypto.news;
    }
    
    return [];
  } catch (error) {
    console.error(`Error finding news articles for ${symbol}:`, error);
    return [];
  }
}

/**
 * Generate a sentiment score for a news article
 */
function analyzeSentiment(title: string): { sentiment: 'positive' | 'negative' | 'neutral', score: number } {
  // In a real implementation, this would use NLP or call an external API
  // For now, we'll use simple keyword matching
  
  const positiveKeywords = [
    'success', 'growth', 'profit', 'gain', 'positive', 'rise', 'up', 'higher',
    'increase', 'exceeding', 'beating', 'bullish', 'strong', 'record',
    'opportunity', 'innovation', 'partnership', 'launch', 'expansion'
  ];
  
  const negativeKeywords = [
    'fail', 'drop', 'loss', 'decrease', 'negative', 'fall', 'down', 'lower',
    'decline', 'miss', 'disappointing', 'bearish', 'weak', 'challenge',
    'risk', 'warning', 'trouble', 'problem', 'issue', 'concern'
  ];
  
  // Convert to lowercase for case-insensitive matching
  const lowerTitle = title.toLowerCase();
  
  // Count positive and negative keyword matches
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const keyword of positiveKeywords) {
    if (lowerTitle.includes(keyword)) {
      positiveCount++;
    }
  }
  
  for (const keyword of negativeKeywords) {
    if (lowerTitle.includes(keyword)) {
      negativeCount++;
    }
  }
  
  // Calculate sentiment
  if (positiveCount > negativeCount) {
    const score = 0.5 + (positiveCount / (positiveCount + negativeCount) * 0.5);
    return { sentiment: 'positive', score };
  } else if (negativeCount > positiveCount) {
    const score = 0.5 - (negativeCount / (positiveCount + negativeCount) * 0.5);
    return { sentiment: 'negative', score };
  } else {
    return { sentiment: 'neutral', score: 0.5 };
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // In a real implementation, this would use NLP
  // For now, we'll use a simple word frequency approach
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const stopWords = ['that', 'this', 'with', 'from', 'have', 'will', 'would', 'were', 'their', 'there'];
  
  const filtered = words.filter(word => !stopWords.includes(word));
  const frequency: Record<string, number> = {};
  
  for (const word of filtered) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  
  // Return the top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Generate simulated social media posts
 */
function generateSocialMediaPosts(symbol: string, newsArticles: any[]): any[] {
  const platforms = ['Twitter', 'Reddit', 'LinkedIn', 'StockTwits'];
  const authors = ['MarketWhisperer', 'InvestorInsights', 'TechAnalyst', 'EconomicsProf', 'RetailTracker'];
  
  // Generate posts based on news articles if available
  if (newsArticles && newsArticles.length > 0) {
    return newsArticles.slice(0, 3).map((article, index) => {
      const sentiment = analyzeSentiment(article.title);
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const author = authors[Math.floor(Math.random() * authors.length)];
      
      // Create post content based on the article title
      let content = '';
      if (sentiment.sentiment === 'positive') {
        content = `${symbol} is making great moves with ${article.title.toLowerCase()}. Looking bullish! 📈`;
      } else if (sentiment.sentiment === 'negative') {
        content = `Concerned about ${symbol} after seeing ${article.title.toLowerCase()}. Might be time to reassess.`;
      } else {
        content = `Interesting developments for ${symbol}: ${article.title}. Need more data to make a decision.`;
      }
      
      // Random metrics
      const likes = Math.floor(Math.random() * 400) + 100;
      const shares = Math.floor(Math.random() * 200) + 50;
      const comments = Math.floor(Math.random() * 100) + 20;
      
      return {
        id: index + 1,
        author,
        platform,
        content,
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        timestamp: `${Math.floor(Math.random() * 12) + 1} hours ago`,
        metrics: {
          likes,
          shares,
          comments
        }
      };
    });
  }
  
  // Generate generic posts if no news articles
  const posts = [];
  for (let i = 0; i < 3; i++) {
    const isPositive = Math.random() > 0.4;
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    let content = '';
    let sentiment: 'positive' | 'negative' | 'neutral';
    let score: number;
    
    if (isPositive) {
      content = `${symbol} looks promising with its recent performance. Holding for long-term growth.`;
      sentiment = 'positive';
      score = 0.7 + (Math.random() * 0.3);
    } else if (Math.random() > 0.5) {
      content = `Not sure about ${symbol} right now. Market conditions are volatile. Watching closely.`;
      sentiment = 'neutral';
      score = 0.4 + (Math.random() * 0.2);
    } else {
      content = `${symbol} isn't meeting expectations. Considering reducing my position.`;
      sentiment = 'negative';
      score = Math.random() * 0.4;
    }
    
    // Random metrics
    const likes = Math.floor(Math.random() * 400) + 100;
    const shares = Math.floor(Math.random() * 200) + 50;
    const comments = Math.floor(Math.random() * 100) + 20;
    
    posts.push({
      id: i + 1,
      author,
      platform,
      content,
      sentiment,
      score,
      timestamp: `${Math.floor(Math.random() * 12) + 1} hours ago`,
      metrics: {
        likes,
        shares,
        comments
      }
    });
  }
  
  return posts;
}

/**
 * Generate analyst consensus
 */
function generateAnalystConsensus(symbol: string, newsArticles: any[]): any {
  // Determine sentiment from news articles
  let overallSentiment = 0.5;
  if (newsArticles && newsArticles.length > 0) {
    const sentiments = newsArticles.map(article => analyzeSentiment(article.title).score);
    overallSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
  }
  
  // Current price (random for now)
  const currentPrice = Math.random() * 100 + 50;
  
  // Determine consensus based on overall sentiment
  let consensus: 'buy' | 'sell' | 'hold' | 'neutral';
  if (overallSentiment > 0.7) {
    consensus = 'buy';
  } else if (overallSentiment < 0.3) {
    consensus = 'sell';
  } else if (overallSentiment >= 0.4 && overallSentiment <= 0.6) {
    consensus = 'hold';
  } else {
    consensus = 'neutral';
  }
  
  // Generate price targets
  const averageTarget = currentPrice * (1 + (overallSentiment - 0.5) * 0.2);
  const highTarget = averageTarget * (1 + Math.random() * 0.1);
  const lowTarget = averageTarget * (1 - Math.random() * 0.1);
  
  // Generate analyst count based on symbol popularity
  let count;
  if (['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'TSLA', 'BTC', 'ETH'].includes(symbol)) {
    count = Math.floor(Math.random() * 15) + 15; // 15-30 analysts for popular stocks/crypto
  } else {
    count = Math.floor(Math.random() * 10) + 5; // 5-15 analysts for others
  }
  
  return {
    count,
    score: overallSentiment * 100,
    consensus,
    priceTargets: {
      average: parseFloat(averageTarget.toFixed(2)),
      high: parseFloat(highTarget.toFixed(2)),
      low: parseFloat(lowTarget.toFixed(2))
    }
  };
}

/**
 * Generate keyword analysis
 */
function generateKeywordAnalysis(newsArticles: any[]): any[] {
  if (!newsArticles || newsArticles.length === 0) {
    return [];
  }
  
  // Combine all titles
  const allText = newsArticles.map(article => article.title).join(' ');
  
  // Extract keywords
  const keywords = extractKeywords(allText);
  
  // Generate sentiment for each keyword
  return keywords.map(keyword => {
    // Count how many articles contain this keyword
    const frequency = newsArticles.filter(article => 
      article.title.toLowerCase().includes(keyword)
    ).length;
    
    // Calculate sentiment distribution
    let positive = Math.random();
    let negative = Math.random() * (1 - positive);
    let neutral = 1 - positive - negative;
    
    // Normalize to sum to 1
    const total = positive + negative + neutral;
    positive = positive / total;
    negative = negative / total;
    neutral = neutral / total;
    
    return {
      keyword,
      frequency,
      sentiment: {
        positive: Math.round(positive * 100),
        neutral: Math.round(neutral * 100),
        negative: Math.round(negative * 100)
      }
    };
  });
}

/**
 * Generate market events
 */
function generateMarketEvents(symbol: string, newsArticles: any[]): any[] {
  const events = [];
  const now = new Date();
  
  // Add events based on news articles
  if (newsArticles && newsArticles.length > 0) {
    for (let i = 0; i < Math.min(2, newsArticles.length); i++) {
      const article = newsArticles[i];
      const sentiment = analyzeSentiment(article.title);
      
      let eventType = 'News';
      if (article.title.toLowerCase().includes('earnings')) {
        eventType = 'Earnings';
      } else if (article.title.toLowerCase().includes('product') || article.title.toLowerCase().includes('launch')) {
        eventType = 'Product Launch';
      } else if (article.title.toLowerCase().includes('partnership') || article.title.toLowerCase().includes('deal')) {
        eventType = 'Partnership';
      }
      
      const event = {
        type: eventType,
        title: article.title,
        date: now.toISOString().split('T')[0],
        importance: 'medium' as 'high' | 'medium' | 'low',
        sentiment: sentiment.sentiment,
        description: `Reported by ${article.source}`
      };
      events.push(event);
    }
  }
  
  // Add future earnings event
  const earningsDate = new Date(now);
  earningsDate.setDate(earningsDate.getDate() + Math.floor(Math.random() * 30) + 15);
  
  events.push({
    type: 'Earnings',
    title: `${symbol} Quarterly Earnings Report`,
    date: earningsDate.toISOString().split('T')[0],
    importance: 'high' as 'high',
    sentiment: 'neutral' as 'positive' | 'negative' | 'neutral',
    description: 'Upcoming quarterly earnings announcement'
  });
  
  return events;
}

/**
 * Get sentiment analysis for a symbol
 */
export async function getSentimentAnalysis(symbol: string, timeframe: string = '7d'): Promise<SentimentAnalysis> {
  try {
    const cacheKey = `${symbol}-${timeframe}`;
    const cachedData = sentimentCache.get(cacheKey);
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      return cachedData.data;
    }
    
    // Find news articles for the symbol
    const newsArticles = findNewsArticles(symbol);
    
    // Process the news articles
    const processedNews = {
      count: newsArticles.length,
      score: 0,
      articles: newsArticles.map((article: any) => {
        const { sentiment, score } = analyzeSentiment(article.title);
        return {
          title: article.title,
          source: article.source,
          url: article.url,
          sentiment,
          score,
          timestamp: `${Math.floor(Math.random() * 48) + 1} hours ago`,
          keywords: extractKeywords(article.title)
        };
      })
    };
    
    // Calculate average sentiment score for news
    if (processedNews.articles.length > 0) {
      processedNews.score = processedNews.articles.reduce((sum: number, article: any) => sum + article.score, 0) / processedNews.articles.length * 100;
    }
    
    // Generate social media posts
    const socialPosts = generateSocialMediaPosts(symbol, newsArticles);
    
    // Calculate average sentiment score for social
    const socialScore = socialPosts.length > 0 
      ? socialPosts.reduce((sum, post) => sum + post.score, 0) / socialPosts.length * 100
      : 50;
    
    // Generate analyst consensus
    const analyst = generateAnalystConsensus(symbol, newsArticles);
    
    // Generate keyword analysis
    const keywordAnalysis = generateKeywordAnalysis(newsArticles);
    
    // Generate events
    const events = generateMarketEvents(symbol, newsArticles);
    
    // Calculate overall sentiment score
    const newsWeight = 0.4;
    const socialWeight = 0.3;
    const analystWeight = 0.3;
    
    const overallScore = (
      processedNews.score * newsWeight +
      socialScore * socialWeight +
      analyst.score * analystWeight
    );
    
    // Generate a random change in sentiment
    const change = (Math.random() * 10) - 5;
    const trend: 'improving' | 'declining' | 'stable' = 
      change > 2 ? 'improving' : 
      change < -2 ? 'declining' : 
      'stable';
    
    // Create sentiment analysis object
    const sentimentAnalysis: SentimentAnalysis = {
      symbol,
      lastUpdated: new Date(),
      timeframe,
      overallScore: {
        value: overallScore,
        change,
        trend
      },
      sources: {
        news: processedNews,
        social: {
          count: socialPosts.length,
          score: socialScore,
          posts: socialPosts
        },
        analyst
      },
      keywordAnalysis,
      events
    };
    
    // Cache the results
    sentimentCache.set(cacheKey, { data: sentimentAnalysis, timestamp: now });
    
    return sentimentAnalysis;
  } catch (error) {
    console.error(`Error getting sentiment analysis for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get sentiment analysis for all portfolio and watchlist assets
 */
export async function getAllSentimentAnalysis(timeframe: string = '7d'): Promise<SentimentAnalysis[]> {
  try {
    const portfolio = getPortfolioData(1);
    const watchlist = await getWatchlist();
    
    // Combine symbols from portfolio and watchlist
    const portfolioSymbols = [
      ...portfolio.equities.map((asset: any) => asset.Symbol),
      ...portfolio.crypto.map((asset: any) => asset.Symbol)
    ];
    const watchlistSymbols = watchlist.map((item: any) => item.symbol);
    const allSymbols = Array.from(new Set([...portfolioSymbols, ...watchlistSymbols]));
    
    // Get sentiment analysis for all symbols with error handling
    const sentimentAnalysesPromises = allSymbols.map(async (symbol) => {
      try {
        return await getSentimentAnalysis(symbol, timeframe);
      } catch (error) {
        console.log(`Generating default sentiment analysis for watchlist item: ${symbol}`);
        
        // Generate a random sentiment score
        const sentimentScore = Math.random() * 100;
        const change = (Math.random() * 10) - 5;
        const trend: 'improving' | 'declining' | 'stable' = 
          change > 2 ? 'improving' : 
          change < -2 ? 'declining' : 
          'stable';
        
        // Create default sentiment analysis for watchlist items
        return {
          symbol,
          lastUpdated: new Date(),
          timeframe,
          overallScore: {
            value: sentimentScore,
            change,
            trend
          },
          sources: {
            news: {
              count: 0,
              score: 0,
              articles: []
            },
            social: {
              count: 3,
              score: sentimentScore,
              posts: Array(3).fill(0).map((_, i) => ({
                id: i + 1,
                author: ['MarketExpert', 'FinanceGuru', 'InvestorInsights'][i],
                platform: ['Twitter', 'Reddit', 'StockTwits'][i],
                content: `General market sentiment for ${symbol} is ${sentimentScore > 60 ? 'positive' : sentimentScore < 40 ? 'negative' : 'neutral'}.`,
                sentiment: sentimentScore > 60 ? 'positive' : sentimentScore < 40 ? 'negative' : 'neutral' as 'positive' | 'negative' | 'neutral',
                score: sentimentScore / 100,
                timestamp: `${Math.floor(Math.random() * 12) + 1} hours ago`,
                metrics: {
                  likes: Math.floor(Math.random() * 400) + 100,
                  shares: Math.floor(Math.random() * 200) + 50,
                  comments: Math.floor(Math.random() * 100) + 20
                }
              }))
            },
            analyst: {
              count: Math.floor(Math.random() * 10) + 5,
              score: sentimentScore,
              consensus: sentimentScore > 60 ? 'buy' : sentimentScore < 40 ? 'sell' : 'hold' as 'buy' | 'sell' | 'hold' | 'neutral',
              priceTargets: {
                average: 100 + (Math.random() * 50),
                high: 100 + (Math.random() * 100),
                low: 80 + (Math.random() * 30)
              }
            }
          },
          keywordAnalysis: [],
          events: [{
            type: 'Earnings',
            title: `${symbol} Quarterly Earnings Report`,
            date: new Date(Date.now() + (Math.random() * 30 + 15) * 86400000).toISOString().split('T')[0],
            importance: 'high' as 'high' | 'medium' | 'low',
            sentiment: 'neutral' as 'positive' | 'negative' | 'neutral',
            description: 'Upcoming quarterly earnings announcement'
          }]
        };
      }
    });
    
    const sentimentAnalyses = await Promise.all(sentimentAnalysesPromises);
    
    // Sort by sentiment score (highest first)
    return sentimentAnalyses.sort((a, b) => b.overallScore.value - a.overallScore.value);
  } catch (error) {
    console.error(`Error getting all sentiment analyses:`, error);
    throw error;
  }
}

/**
 * Get sentiment trends over time
 */
export async function getSentimentTrends(symbol: string, days: number = 15): Promise<any[]> {
  try {
    const now = new Date();
    const trends = [];
    
    // Generate random trend data
    let score = 50 + (Math.random() * 20) - 10; // Start between 40-60
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - i - 1));
      
      // Add some random variation to the score
      score += (Math.random() * 4) - 2;
      // Keep within bounds
      score = Math.min(Math.max(score, 0), 100);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(score)
      });
    }
    
    return trends;
  } catch (error) {
    console.error(`Error getting sentiment trends for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get sentiment by source breakdown
 */
export async function getSentimentBySource(): Promise<any[]> {
  try {
    return [
      { name: 'News', positive: 65, neutral: 25, negative: 10 },
      { name: 'Social Media', positive: 55, neutral: 15, negative: 30 },
      { name: 'Analyst Reports', positive: 75, neutral: 15, negative: 10 },
      { name: 'SEC Filings', positive: 45, neutral: 45, negative: 10 },
      { name: 'Corporate Blogs', positive: 80, neutral: 15, negative: 5 },
    ];
  } catch (error) {
    console.error(`Error getting sentiment by source:`, error);
    throw error;
  }
}