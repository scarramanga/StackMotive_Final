import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Wallet,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Download
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  useVaultAssets, 
  useAddAsset, 
  useUpdateAsset, 
  useRemoveAsset,
  vaultAssetsService,
  type Asset 
} from '../../services/vaultAssetsService';

export const VaultAssetsPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  // State for UI operations
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    allocation: 0,
    assetClass: '',
    sector: ''
  });

  // Fetch assets using service
  const { data: assetsData, isLoading, error } = useVaultAssets(activeVaultId || '', user);

  // Mutations using service
  const addAssetMutation = useAddAsset();
  const updateAssetMutation = useUpdateAsset();
  const removeAssetMutation = useRemoveAsset();

  // Process assets data using service
  const processedAssets = useMemo(() => {
    if (!assetsData?.assets) return [];
    return vaultAssetsService.sortAssets(assetsData.assets, 'allocation', 'desc');
  }, [assetsData]);

  // Calculate portfolio metrics using service
  const portfolioMetrics = useMemo(() => {
    if (!processedAssets.length) return null;
    return vaultAssetsService.calculatePortfolioMetrics(processedAssets);
  }, [processedAssets]);

  // Handle form reset
  const resetForm = () => {
    setFormData({ name: '', symbol: '', allocation: 0, assetClass: '', sector: '' });
    setEditingAsset(null);
    setShowAddForm(false);
  };

  // Handle add asset
  const handleAddAsset = async () => {
    if (!activeVaultId) return;

    // Validate using service
    const validation = vaultAssetsService.validateAsset(formData, processedAssets);
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }

    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'vault-assets',
        userId: user?.id || undefined,
        action: 'asset_add',
        timestamp: new Date().toISOString(),
        details: { 
          assetName: formData.name,
          symbol: formData.symbol,
          allocation: formData.allocation,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);

    try {
      await addAssetMutation.mutateAsync({
        vaultId: activeVaultId,
        asset: {
          ...formData,
          symbol: vaultAssetsService.normalizeSymbol(formData.symbol)
        }
      });
      resetForm();
    } catch (error) {
      console.error('Failed to add asset:', error);
    }
  };

  // Handle update asset
  const handleUpdateAsset = async () => {
    if (!editingAsset) return;

    // Validate using service
    const validation = vaultAssetsService.validateAsset(formData, processedAssets);
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }

    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'vault-assets',
        userId: user?.id || undefined,
        action: 'asset_update',
        timestamp: new Date().toISOString(),
        details: { 
          assetId: editingAsset.id,
          assetName: formData.name,
          changes: formData,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);

    try {
      await updateAssetMutation.mutateAsync({
        id: editingAsset.id,
        updates: {
          ...formData,
          symbol: vaultAssetsService.normalizeSymbol(formData.symbol)
        }
      });
      resetForm();
    } catch (error) {
      console.error('Failed to update asset:', error);
    }
  };

  // Handle remove asset
  const handleRemoveAsset = async (asset: Asset) => {
    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'vault-assets',
        userId: user?.id || undefined,
        action: 'asset_remove',
        timestamp: new Date().toISOString(),
        details: { 
          assetId: asset.id,
          assetName: asset.name,
          symbol: asset.symbol,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);

    try {
      await removeAssetMutation.mutateAsync(asset.id);
    } catch (error) {
      console.error('Failed to remove asset:', error);
    }
  };

  // Handle start edit
  const handleStartEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      symbol: asset.symbol,
      allocation: asset.allocation,
      assetClass: asset.assetClass || '',
      sector: asset.sector || ''
    });
    setShowAddForm(true);
  };

  // Handle export
  const handleExport = () => {
    if (!processedAssets.length) return;

    // Log agent action
    fetch('/api/agent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockId: 'vault-assets',
        userId: user?.id || undefined,
        action: 'assets_export',
        timestamp: new Date().toISOString(),
        details: { 
          assetCount: processedAssets.length,
          vaultId: activeVaultId 
        }
      })
    }).catch(console.error);

    const csv = vaultAssetsService.exportToCSV(processedAssets);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vault_assets_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Vault Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Vault Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <p className="text-red-600">Failed to load vault assets</p>
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
            <Wallet className="h-5 w-5" />
            Vault Assets
            <Badge variant="secondary" className="text-xs">
              {processedAssets.length} assets
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!processedAssets.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={showAddForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Portfolio Metrics */}
          {portfolioMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{vaultAssetsService.formatAllocation(portfolioMetrics.totalAllocation)}</div>
                <div className="text-xs text-muted-foreground">Total Allocation</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{portfolioMetrics.assetCount}</div>
                <div className="text-xs text-muted-foreground">Assets</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{portfolioMetrics.diversificationScore.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Diversification</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{vaultAssetsService.formatAllocation(portfolioMetrics.largestAllocation)}</div>
                <div className="text-xs text-muted-foreground">Largest Position</div>
              </div>
            </div>
          )}

          {/* Allocation Warnings */}
          {portfolioMetrics?.isOverAllocated && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Portfolio is over-allocated</span>
              </div>
              <div className="text-xs text-red-600 mt-1">
                Total allocation: {vaultAssetsService.formatAllocation(portfolioMetrics.totalAllocation)}
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-4">
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Asset name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="SYMBOL"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Allocation (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.allocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, allocation: Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Asset Class</label>
                  <Select 
                    value={formData.assetClass} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assetClass: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="bond">Bond</SelectItem>
                      <SelectItem value="commodity">Commodity</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  onClick={editingAsset ? handleUpdateAsset : handleAddAsset}
                  disabled={!formData.name || !formData.symbol || formData.allocation <= 0}
                >
                  {editingAsset ? 'Update' : 'Add'} Asset
                </Button>
              </div>
            </div>
          )}

          {/* Assets Table */}
          {processedAssets.length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assets found</h3>
              <p className="text-muted-foreground">Add your first asset to get started</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 border-b border-border">
                <div className="grid grid-cols-6 gap-4 p-3 text-sm font-medium">
                  <div>Asset</div>
                  <div>Symbol</div>
                  <div>Allocation</div>
                  <div>Class</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {processedAssets.map((asset) => {
                  const allocationStatus = vaultAssetsService.getAllocationStatus(asset.allocation);
                  
                  return (
                    <div key={asset.id} className="grid grid-cols-6 gap-4 p-3 hover:bg-muted/50 transition-colors">
                      <div className="font-medium">{asset.name}</div>
                      <div className="font-mono text-sm">{asset.symbol}</div>
                      <div className="font-mono text-sm">
                        {vaultAssetsService.formatAllocation(asset.allocation)}
                      </div>
                      <div>
                        <Badge variant="outline" className={vaultAssetsService.getAssetClassColor(asset.assetClass)}>
                          {asset.assetClass || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant="outline" className={allocationStatus.color}>
                          {allocationStatus.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(asset)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAsset(asset)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 