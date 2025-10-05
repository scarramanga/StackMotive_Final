import React from 'react';
import { withTierGuard } from '../layout/withTierGuard';

const BacktestPanel: React.FC = () => {
  // ... existing code ...
};

export default withTierGuard(BacktestPanel, {
  requiredTier: 'navigator',
  upgradeMessage: 'Backtesting is available for Navigator tier and above. Upgrade to unlock advanced strategy simulation.'
}); 