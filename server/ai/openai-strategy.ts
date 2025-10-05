import dotenv from 'dotenv';
dotenv.config();

import OpenAI from "openai";
import { json } from "drizzle-orm/pg-core";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export { openai };

// Types for strategy generation
export interface StrategyParameters {
  symbol: string;
  exchange: string;
  timeframe: string;
  riskLevel: string;  // low, medium, high
  strategyType: string; // trend-following, mean-reversion, breakout, etc.
  investmentAmount: number;
  includeOptions?: boolean;
  tradingHours?: string[];
  maxPositions?: number;
  existingStrategies?: any[];
}

export interface GeneratedStrategy {
  name: string;
  description: string;
  entryConditions: any;
  exitConditions: any;
  indicators: any;
  stopLoss: any;
  takeProfit: any;
  positionSizing: any;
  riskManagement: any;
  timeframes: string[];
  backtestResults?: any;
  expectedPerformance?: any;
}

// Function to generate AI trading strategy
export async function generateAIStrategy(params: StrategyParameters): Promise<GeneratedStrategy> {
  try {
    const prompt = buildStrategyPrompt(params);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert algorithmic trading advisor specialized in developing optimized trading strategies. Provide detailed trading strategies in a structured JSON format.\n\nThis response is for informational purposes only and should not be interpreted as financial advice. Use of StackMotive is subject to the full disclaimer at /legal/disclaimer."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const strategyContent = response.choices[0].message.content;
    
    if (!strategyContent) {
      throw new Error("Failed to generate strategy content");
    }

    // Parse and validate the strategy
    const generatedStrategy = JSON.parse(strategyContent);
    return validateAndEnhanceStrategy(generatedStrategy, params);
  } catch (error) {
    console.error("Error generating AI strategy:", error);
    throw new Error("Failed to generate AI trading strategy");
  }
}

// Function to optimize an existing strategy using ML techniques
export async function optimizeStrategy(
  strategy: GeneratedStrategy, 
  historicalData: any[], 
  optimizationParams: {
    optimizationTarget: string, // maxProfit, minDrawdown, sharpeRatio, etc.
    iterations: number,
    timeframe: string
  }
): Promise<GeneratedStrategy> {
  try {
    // Create optimization prompt
    const optimizationPrompt = buildOptimizationPrompt(strategy, historicalData, optimizationParams);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert ML trading strategy optimizer. Analyze historical performance and suggest parameter optimizations to improve strategy performance."
        },
        { role: "user", content: optimizationPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const optimizedContent = response.choices[0].message.content;
    
    if (!optimizedContent) {
      throw new Error("Failed to generate optimized strategy");
    }

    // Parse the optimized strategy
    const optimizedStrategy = JSON.parse(optimizedContent);
    
    // Merge with original strategy but keep optimized parameters
    return {
      ...strategy,
      ...optimizedStrategy,
      name: strategy.name,
      description: optimizedStrategy.description || strategy.description,
      expectedPerformance: optimizedStrategy.expectedPerformance || strategy.expectedPerformance
    };
  } catch (error) {
    console.error("Error optimizing strategy:", error);
    throw new Error("Failed to optimize trading strategy");
  }
}

// Function to analyze market sentiment for a symbol
export async function analyzeMarketSentiment(symbol: string, newsArticles: any[]): Promise<{
  sentiment: string;
  sentimentScore: number;
  keyInsights: string[];
  recommendedActions: string[];
}> {
  try {
    // Create sentiment analysis prompt
    const sentimentPrompt = buildSentimentPrompt(symbol, newsArticles);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing market sentiment from news articles and financial data. Provide detailed sentiment analysis with actionable insights."
        },
        { role: "user", content: sentimentPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const sentimentContent = response.choices[0].message.content;
    
    if (!sentimentContent) {
      throw new Error("Failed to generate sentiment analysis");
    }

    // Parse the sentiment analysis
    return JSON.parse(sentimentContent);
  } catch (error) {
    console.error("Error analyzing market sentiment:", error);
    throw new Error("Failed to analyze market sentiment");
  }
}

// Helper functions
function buildStrategyPrompt(params: StrategyParameters): string {
  return `
Create a detailed trading strategy for ${params.symbol} on ${params.exchange} with the following criteria:
- Timeframe: ${params.timeframe}
- Risk level: ${params.riskLevel}
- Strategy type preference: ${params.strategyType}
- Investment amount: $${params.investmentAmount}
- Include options strategies: ${params.includeOptions ? 'Yes' : 'No'}
${params.tradingHours ? `- Trading hours: ${params.tradingHours.join(', ')}` : ''}
${params.maxPositions ? `- Maximum positions: ${params.maxPositions}` : ''}

Please provide a complete strategy in JSON format with the following structure:
{
  "name": "Strategy name",
  "description": "Detailed description of the strategy",
  "entryConditions": {
    "primary": ["detailed primary entry conditions"],
    "confirmation": ["secondary confirmation indicators"]
  },
  "exitConditions": {
    "takeProfit": "take profit rules",
    "stopLoss": "stop loss rules",
    "timeBasedExit": "time-based exit conditions"
  },
  "indicators": {
    "indicator1": "settings and parameters",
    "indicator2": "settings and parameters"
  },
  "positionSizing": "position sizing rules",
  "riskManagement": {
    "maxRiskPerTrade": "percentage",
    "maxOpenPositions": number,
    "portfolioDiversification": "rules"
  },
  "timeframes": ["primary", "secondary for confirmation"],
  "expectedPerformance": {
    "winRate": "estimated win rate",
    "profitFactor": "estimated profit factor",
    "maxDrawdown": "estimated max drawdown",
    "averageRRR": "risk-reward ratio"
  }
}

Provide specific technical parameters where applicable, not just general descriptions. Make the strategy sophisticated yet practical for implementation by retail traders.
`;
}

function buildOptimizationPrompt(strategy: GeneratedStrategy, historicalData: any[], optimizationParams: any): string {
  // Create a summary of the historical data
  const dataStart = new Date(historicalData[0].date).toISOString().split('T')[0];
  const dataEnd = new Date(historicalData[historicalData.length - 1].date).toISOString().split('T')[0];
  
  // Sample performance metrics from historical data
  const sampleData = historicalData.length > 10 
    ? historicalData.slice(0, 10).map(d => `${d.date}: Open ${d.open}, High ${d.high}, Low ${d.low}, Close ${d.close}, Volume ${d.volume}`).join('\n')
    : 'Insufficient historical data provided';
    
  return `
Optimize the following trading strategy using machine learning techniques:

CURRENT STRATEGY:
${JSON.stringify(strategy, null, 2)}

OPTIMIZATION PARAMETERS:
- Target: ${optimizationParams.optimizationTarget}
- Iterations: ${optimizationParams.iterations}
- Timeframe: ${optimizationParams.timeframe}

HISTORICAL DATA SUMMARY:
- Date range: ${dataStart} to ${dataEnd}
- Number of data points: ${historicalData.length}
- Timeframe: ${optimizationParams.timeframe}

SAMPLE DATA (first 10 records):
${sampleData}

Based on this information, please optimize the strategy parameters to improve the ${optimizationParams.optimizationTarget}. 
Return the complete optimized strategy in the same JSON format as the original strategy, with optimized parameters highlighted.
Include expected performance metrics and optimization rationale.
`;
}

function buildSentimentPrompt(symbol: string, newsArticles: any[]): string {
  // Create a summary of the news articles
  const articlesSummary = newsArticles
    .map((article, index) => {
      return `Article ${index + 1}:
- Title: ${article.title}
- Date: ${article.publishedAt}
- Content: ${article.content.substring(0, 300)}...
`;
    })
    .join('\n');
    
  return `
Analyze market sentiment for ${symbol} based on the following news articles:

${articlesSummary}

Please provide a comprehensive sentiment analysis in the following JSON format:
{
  "sentiment": "bullish/bearish/neutral",
  "sentimentScore": number between -1 (extremely bearish) and 1 (extremely bullish),
  "keyInsights": ["key insight 1", "key insight 2", ...],
  "recommendedActions": ["recommended action 1", "recommended action 2", ...]
}

Ensure your analysis is data-driven and provides actionable insights for traders.
`;
}

function validateAndEnhanceStrategy(strategy: any, params: StrategyParameters): GeneratedStrategy {
  // Basic validation to ensure all required fields are present
  const requiredFields = [
    'name', 'description', 'entryConditions', 'exitConditions', 
    'indicators', 'positionSizing', 'riskManagement', 'timeframes'
  ];
  
  for (const field of requiredFields) {
    if (!strategy[field]) {
      strategy[field] = field === 'name' 
        ? `AI ${params.strategyType} Strategy for ${params.symbol}`
        : field === 'description'
        ? `Automatically generated ${params.strategyType} strategy for ${params.symbol} with ${params.riskLevel} risk profile`
        : {};
    }
  }
  
  // Add default values for missing sections
  if (!strategy.stopLoss) {
    strategy.stopLoss = {
      percentage: params.riskLevel === 'low' ? '2%' : params.riskLevel === 'medium' ? '5%' : '8%',
      trailingStop: params.riskLevel !== 'low'
    };
  }
  
  if (!strategy.takeProfit) {
    strategy.takeProfit = {
      percentage: params.riskLevel === 'low' ? '4%' : params.riskLevel === 'medium' ? '10%' : '16%',
      partialTakes: params.riskLevel !== 'low'
    };
  }
  
  return strategy as GeneratedStrategy;
}
