import React, { ComponentType } from 'react';
import { useAuth, User } from '../../hooks/useAuth';

type Tier = User['tier'];

const TIER_HIERARCHY: Record<Tier, number> = {
  observer: 1,
  navigator: 2,
  operator: 3,
  sovereign: 4,
};

interface WithTierGuardProps {
  requiredTier: Tier;
  upgradeMessage?: string;
}

export function withTierGuard<P extends object>(
  Component: ComponentType<P>,
  { requiredTier, upgradeMessage }: WithTierGuardProps
): ComponentType<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated || !user) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="max-w-md text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600">
              Please log in to access this feature.
            </p>
          </div>
        </div>
      );
    }

    const userTierLevel = TIER_HIERARCHY[user.tier];
    const requiredTierLevel = TIER_HIERARCHY[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      const defaultMessage = `This feature requires ${requiredTier} tier or higher. Your current tier: ${user.tier}.`;
      
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="max-w-md text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tier Upgrade Required
            </h3>
            <p className="text-gray-600 mb-4">
              {upgradeMessage || defaultMessage}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                Current: <span className="font-semibold capitalize">{user.tier}</span>
              </span>
              <span className="text-gray-400">→</span>
              <span className="px-3 py-1 bg-blue-100 rounded-full text-blue-700">
                Required: <span className="font-semibold capitalize">{requiredTier}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withTierGuard(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
