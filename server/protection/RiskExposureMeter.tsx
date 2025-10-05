// Block 77: Risk Exposure Meter
import React from 'react';
import { usePortfolioHealthStore } from '../../store/portfolioHealth';

interface RiskExposureMeterProps {
  riskScore?: number; // 0-100, optional override
  explanation?: string;
}

const getRiskColor = (score: number) => {
  if (score < 33) return 'text-green-600';
  if (score < 66) return 'text-yellow-600';
  return 'text-red-600';
};

const RiskExposureMeter: React.FC<RiskExposureMeterProps> = ({ riskScore, explanation }) => {
  const { breakdown } = usePortfolioHealthStore();
  // Use normalized risk (1 = low risk, 0 = high risk)
  const score = riskScore !== undefined ? riskScore : Math.round((1 - breakdown.risk) * 100);
  const color = getRiskColor(score);
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <div className="relative w-40 h-20">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="#e5e7eb" strokeWidth="16" />
          <path
            d="M10,100 A90,90 0 0,1 190,100"
            fill="none"
            stroke={score < 33 ? '#16a34a' : score < 66 ? '#eab308' : '#dc2626'}
            strokeWidth="16"
            strokeDasharray={`${(score / 100) * 283},283`}
            strokeLinecap="round"
          />
          <circle cx={100 + 90 * Math.cos(Math.PI * (1 - score / 100))} cy={100 - 90 * Math.sin(Math.PI * (score / 100))} r="8" fill={score < 33 ? '#16a34a' : score < 66 ? '#eab308' : '#dc2626'} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-muted-foreground mt-1">Risk Score</span>
        </div>
      </div>
      {explanation && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-300 text-center max-w-xs">
          {explanation}
        </div>
      )}
    </div>
  );
};

export default RiskExposureMeter; 