import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Link,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Plus,
  Database,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface ThirdPartyService {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  description: string;
  requiresApiKey: boolean;
  supportedAssets: string[];
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  connectionDate?: string;
  lastSync?: string;
  syncedAssets: number;
  errors: string[];
}

interface SyncedAsset {
  id: string;
  symbol: string;
  name: string;
  service: string;
  lastSync: string;
  status: 'synced' | 'stale' | 'error';
  balance: number;
  value: number;
  currency: string;
  errors: string[];
}

interface ApiToken {
  id: string;
  service: string;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

interface ThirdPartySyncData {
  services: ThirdPartyService[];
  syncedAssets: SyncedAsset[];
  apiTokens: ApiToken[];
  syncStats: {
    totalAssets: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastFullSync: string;
  };
}

export const ThirdPartyPortfolioSyncPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedService, setSelectedService] = useState<string>('');
  const [newToken, setNewToken] = useState<string>('');
  const [tokenName, setTokenName] = useState<string>('');
  const [showTokens, setShowTokens] = useState<{[key: string]: boolean}>({});
  const [isTestingConnection, setIsTestingConnection] = useState<{[key: string]: boolean}>({});

  // Fetch third-party sync data
  const { data: syncData, isLoading, error } = useQuery<ThirdPartySyncData>({
    queryKey: ['/api/portfolio/third-party-sync', activeVaultId],
    queryFn: async () => {
      const url = activeVaultId 
        ? `/api/portfolio/third-party-sync?vaultId=${activeVaultId}`
        : '/api/portfolio/third-party-sync';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch third-party sync data');
      return res.json();
    },
    enabled: !!user && !!activeVaultId,
    refetchInterval: 30000,
  });

  // Add/Update API token mutation
  const updateToken = useMutation({
    mutationFn: async (tokenData: { service: string; name: string; token: string }) => {
      const url = activeVaultId 
        ? `/api/portfolio/third-party-token?vaultId=${activeVaultId}`
        : '/api/portfolio/third-party-token';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData),
      });
      if (!res.ok) throw new Error('Failed to update API token');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/third-party-sync'] });
      setNewToken('');
      setTokenName('');
      setSelectedService('');
    },
  });

  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async (service: string) => {
      const url = activeVaultId 
        ? `/api/portfolio/third-party-test?vaultId=${activeVaultId}`
        : '/api/portfolio/third-party-test';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      if (!res.ok) throw new Error('Failed to test connection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/third-party-sync'] });
    },
  });

  // Delete token mutation
  const deleteToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const url = activeVaultId 
        ? `/api/portfolio/third-party-token/${tokenId}?vaultId=${activeVaultId}`
        : `/api/portfolio/third-party-token/${tokenId}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete API token');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/third-party-sync'] });
    },
  });

  // Manual sync mutation
  const manualSync = useMutation({
    mutationFn: async (service?: string) => {
      const url = activeVaultId 
        ? `/api/portfolio/third-party-sync-manual?vaultId=${activeVaultId}`
        : '/api/portfolio/third-party-sync-manual';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      if (!res.ok) throw new Error('Failed to trigger manual sync');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/third-party-sync'] });
    },
  });

  // Handle add token
  const handleAddToken = () => {
    if (selectedService && newToken.trim() && tokenName.trim()) {
      updateToken.mutate({
        service: selectedService,
        name: tokenName.trim(),
        token: newToken.trim(),
      });
    }
  };

  // Handle test connection
  const handleTestConnection = (service: string) => {
    setIsTestingConnection(prev => ({ ...prev, [service]: true }));
    testConnection.mutate(service, {
      onSettled: () => {
        setIsTestingConnection(prev => ({ ...prev, [service]: false }));
      }
    });
  };

  // Handle delete token
  const handleDeleteToken = (tokenId: string) => {
    deleteToken.mutate(tokenId);
  };

  // Handle manual sync
  const handleManualSync = (service?: string) => {
    manualSync.mutate(service);
  };

  // Toggle token visibility
  const toggleTokenVisibility = (tokenId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-100 text-blue-800">Syncing</Badge>;
      case 'synced':
        return <Badge className="bg-green-100 text-green-800">Synced</Badge>;
      case 'stale':
        return <Badge className="bg-yellow-100 text-yellow-800">Stale</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Get service icon
  const getServiceIcon = (service: ThirdPartyService) => {
    switch (service.name) {
      case 'sharesight':
        return <TrendingUp className="h-4 w-4" />;
      case 'cointracker':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Mask token
  const maskToken = (token: string) => {
    return token.slice(0, 4) + '...' + token.slice(-4);
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading third-party sync data: {error.message}
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
            Loading third-party sync data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!syncData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No third-party sync data available
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
            <Link className="h-5 w-5" />
            Third-Party Portfolio Sync
          </div>
          <Button
            size="sm"
            onClick={() => handleManualSync()}
            disabled={manualSync.isPending}
          >
            {manualSync.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Sync Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{syncData.syncStats.totalAssets}</div>
              <div className="text-sm text-blue-700">Total Assets</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{syncData.syncStats.successfulSyncs}</div>
              <div className="text-sm text-green-700">Successful Syncs</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{syncData.syncStats.failedSyncs}</div>
              <div className="text-sm text-red-700">Failed Syncs</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">Last Full Sync</div>
              <div className="text-xs text-gray-600">
                {formatTime(syncData.syncStats.lastFullSync)}
              </div>
            </div>
          </div>

          {/* Connected Services */}
          <div>
            <h3 className="font-medium mb-4">Connected Services</h3>
            <div className="space-y-3">
              {syncData.services.map((service) => (
                <div key={service.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getServiceIcon(service)}
                      <div>
                        <div className="font-medium">{service.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(service.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(service.name)}
                        disabled={isTestingConnection[service.name]}
                      >
                        {isTestingConnection[service.name] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualSync(service.name)}
                        disabled={manualSync.isPending || service.status !== 'connected'}
                      >
                        {manualSync.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Synced Assets</div>
                      <div className="font-medium">{service.syncedAssets}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Last Sync</div>
                      <div className="font-medium">
                        {service.lastSync ? formatTime(service.lastSync) : 'Never'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Status</div>
                      <div className="font-medium">{service.status}</div>
                    </div>
                  </div>
                  
                  {service.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                      <div className="text-sm text-red-700">
                        <div className="font-medium mb-1">Errors:</div>
                        <ul className="list-disc list-inside">
                          {service.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* API Token Management */}
          <div>
            <h3 className="font-medium mb-4">API Token Management</h3>
            
            {/* Add New Token */}
            <div className="p-4 border border-border rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Add New API Token</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {syncData.services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="Token name"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
                
                <Input
                  type="password"
                  placeholder="API token"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                />
                
                <Button
                  onClick={handleAddToken}
                  disabled={!selectedService || !newToken.trim() || !tokenName.trim() || updateToken.isPending}
                >
                  {updateToken.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Token'
                  )}
                </Button>
              </div>
            </div>

            {/* Existing Tokens */}
            <div className="space-y-3">
              {syncData.apiTokens.map((token) => (
                <div key={token.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{token.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {token.service} • Created {formatTime(token.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {token.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTokenVisibility(token.id)}
                      >
                        {showTokens[token.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteToken(token.id)}
                        disabled={deleteToken.isPending}
                      >
                        {deleteToken.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Token</div>
                      <div className="font-mono">
                        {showTokens[token.id] ? token.token : maskToken(token.token)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Last Used</div>
                      <div className="font-medium">
                        {token.lastUsed ? formatTime(token.lastUsed) : 'Never'}
                      </div>
                    </div>
                  </div>
                  
                  {token.permissions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground mb-1">Permissions</div>
                      <div className="flex gap-1 flex-wrap">
                        {token.permissions.map((permission, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Synced Assets Table */}
          <div>
            <h3 className="font-medium mb-4">Synced Assets</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-left p-3 font-medium">Service</th>
                      <th className="text-left p-3 font-medium">Balance</th>
                      <th className="text-left p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Last Sync</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncData.syncedAssets.map((asset) => (
                      <tr key={asset.id} className="border-t border-border">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{asset.symbol}</div>
                            <div className="text-sm text-muted-foreground">{asset.name}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getServiceIcon(syncData.services.find(s => s.name === asset.service)!)}
                            <span className="capitalize">{asset.service}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{asset.balance.toFixed(8)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            {formatCurrency(asset.value, asset.currency)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{formatTime(asset.lastSync)}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(asset.status)}
                            {asset.errors.length > 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Service Documentation */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Service Documentation</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• <strong>Sharesight:</strong> Requires API key with portfolio read permissions</div>
              <div>• <strong>CoinTracker:</strong> Supports read-only API access for portfolio data</div>
              <div>• <strong>Sync Frequency:</strong> Assets are synced every 15 minutes when connected</div>
              <div>• <strong>Rate Limits:</strong> API calls are throttled to respect service limits</div>
            </div>
          </div>

          {/* Error Display */}
          {(updateToken.error || deleteToken.error || testConnection.error || manualSync.error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700">
                Error: {updateToken.error?.message || deleteToken.error?.message || testConnection.error?.message || manualSync.error?.message}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThirdPartyPortfolioSyncPanel; 