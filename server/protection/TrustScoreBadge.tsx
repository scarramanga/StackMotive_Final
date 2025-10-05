import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface TrustScoreBadgeProps {
  score: number | null; // 1–5, null if not available
  explanation?: string;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score, explanation }) => {
  // TODO: Integrate real scoring logic and data
  if (score == null) {
    return <Badge variant="secondary">No Score</Badge>;
  }
  return (
    <span title={explanation || 'Trust score based on trend, macro, sentiment, and alerts'}>
      <Badge variant="default">Trust: {score}/5</Badge>
    </span>
  );
};

export default TrustScoreBadge; 