// Block 29: Asset Trust Score Badge
export interface TrustScoreResult {
  score: number; // 1-5
  rationale: string;
  breakdown: {
    technical: number;
    onChain: number;
    sentiment: number;
  };
}

export interface Asset {
  symbol: string;
  name: string;
  technical: { macd: number; rsi: number; volume: number };
  onChain?: { txVolume: number; holders: number; age: number };
  sentiment: { news: number; twitter: number };
}

export function calculateTrustScore(asset: Asset): TrustScoreResult {
  // Technical: MACD (bullish >0), RSI (40-70 optimal), volume (normalized)
  let techScore = 0;
  if (asset.technical.macd > 0) techScore += 0.4;
  if (asset.technical.rsi >= 40 && asset.technical.rsi <= 70) techScore += 0.4;
  techScore += Math.min(0.2, asset.technical.volume / 1000000);
  techScore = Math.round(techScore * 100) / 100;

  // On-chain: txVolume, holders, age (if available)
  let onChainScore = 0;
  if (asset.onChain) {
    if (asset.onChain.txVolume > 100000) onChainScore += 0.15;
    if (asset.onChain.holders > 1000) onChainScore += 0.1;
    if (asset.onChain.age > 365) onChainScore += 0.05;
  }
  onChainScore = Math.round(onChainScore * 100) / 100;

  // Sentiment: news, twitter (normalized -1 to 1)
  let sentimentScore = 0.15 + 0.15;
  if (asset.sentiment.news > 0) sentimentScore += 0.15;
  if (asset.sentiment.twitter > 0) sentimentScore += 0.15;
  sentimentScore = Math.round(sentimentScore * 100) / 100;

  // Weighted sum
  const total = techScore * 0.4 + onChainScore * 0.3 + sentimentScore * 0.3;
  const score = Math.max(1, Math.min(5, Math.round(total * 5)));

  // Rationale
  const rationale = `Technical: ${techScore * 100}/100, On-chain: ${onChainScore * 100}/100, Sentiment: ${sentimentScore * 100}/100`;

  return {
    score,
    rationale,
    breakdown: {
      technical: techScore,
      onChain: onChainScore,
      sentiment: sentimentScore,
    },
  };
} 