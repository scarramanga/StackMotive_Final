import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  Plus,
  Search,
  Settings,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  StarOff,
  Filter,
  SortAsc,
  SortDesc,
  Loader2,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Bitcoin,
  Package,
  Globe,
  BarChart,
  FileText,
  Folder
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  watchlistEngineService,
  useWatchlists,
  useWatchlist,
  useCreateWatchlist,
  useUpdateWatchlist,
  useDeleteWatchlist,
  useSearchAssets,
  useAddAssetToWatchlist,
  useRemoveAssetFromWatchlist,
  useAssetSignals,
  useWatchlistSummary,
  Watchlist,
  WatchlistAsset,
  WatchlistFilter,
  AssetSearchResult
} from '../../services/watchlistEngineService';

export const WatchlistEnginePanel: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [watchlistForm, setWatchlistForm] = useState(watchlistEngineService.createDefaultWatchlist());
  const [assetSearch, setAssetSearch] = useState('');
  const [assetCategory, setAssetCategory] = useState<string>('');
  const [watchlistErrors, setWatchlistErrors] = useState<string[]>([]);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<WatchlistFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: watchlists, isLoading: watchlistsLoading, error: watchlistsError, refetch: refetchWatchlists } = useWatchlists(user?.id);
  const { data: currentWatchlist, isLoading: watchlistLoading } = useWatchlist(selectedWatchlistId, user?.id);
  const { data: assetSearchResults } = useSearchAssets(assetSearch, assetCategory);
  const { data: summary } = useWatchlistSummary(user?.id);

  // Mutations
  const createWatchlistMutation = useCreateWatchlist();
  const updateWatchlistMutation = useUpdateWatchlist();
  const deleteWatchlistMutation = useDeleteWatchlist();
  const addAssetMutation = useAddAssetToWatchlist();
  const removeAssetMutation = useRemoveAssetFromWatchlist();

  // Computed values
  const filteredAssets = useMemo(() => {
    if (!currentWatchlist?.assets) return [];
    return watchlistEngineService.filterAssets(currentWatchlist.assets, filter);
  }, [currentWatchlist?.assets, filter]);

  const sortedAssets = useMemo(() => {
    if (!currentWatchlist?.settings) return filteredAssets;
    return watchlistEngineService.sortAssets(
      filteredAssets,
      currentWatchlist.settings.sortBy,
      currentWatchlist.settings.sortOrder
    );
  }, [filteredAssets, currentWatchlist?.settings]);

  const watchlistStats = useMemo(() => {
    if (!currentWatchlist) return null;
    return watchlistEngineService.getAssetStats(currentWatchlist);
  }, [currentWatchlist]);

  // Handle form changes
  const handleWatchlistFormChange = (field: string, value: any) => {
    if (field.startsWith('settings.')) {
      const settingKey = field.replace('settings.', '');
      setWatchlistForm(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: value
        }
      }));
    } else {
      setWatchlistForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle watchlist creation
  const handleCreateWatchlist = () => {
    setWatchlistForm(watchlistEngineService.createDefaultWatchlist());
    setIsCreating(true);
    setWatchlistErrors([]);
  };

  // Handle watchlist editing
  const handleEditWatchlist = (watchlist: Watchlist) => {
    setWatchlistForm({
      name: watchlist.name,
      description: watchlist.description,
      color: watchlist.color,
      isDefault: watchlist.isDefault,
      isPublic: watchlist.isPublic,
      tags: watchlist.tags,
      settings: watchlist.settings
    });
    setEditingWatchlistId(watchlist.id);
    setIsEditing(true);
    setWatchlistErrors([]);
  };

  // Handle watchlist submit
  const handleWatchlistSubmit = async () => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    setWatchlistErrors([]);
    
    try {
      const result = await watchlistEngineService.handleWatchlistSubmit(
        watchlistForm,
        editingWatchlistId,
        user.id
      );
      
      if (result.success) {
        setIsCreating(false);
        setIsEditing(false);
        setEditingWatchlistId(null);
        setWatchlistForm(watchlistEngineService.createDefaultWatchlist());
        refetchWatchlists();
        
        if (result.result && !selectedWatchlistId) {
          setSelectedWatchlistId(result.result.id);
        }
      } else {
        setWatchlistErrors([result.error || 'Failed to save watchlist']);
      }
    } catch (error) {
      setWatchlistErrors(['An error occurred while saving']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle watchlist deletion
  const handleDeleteWatchlist = async (watchlistId: string, watchlistName: string) => {
    if (!user?.id) return;
    
    try {
      const result = await watchlistEngineService.handleWatchlistDelete(watchlistId, watchlistName, user.id);
      
      if (result.success) {
        if (selectedWatchlistId === watchlistId) {
          setSelectedWatchlistId(null);
        }
        refetchWatchlists();
      }
    } catch (error) {
      console.error('Failed to delete watchlist:', error);
    }
  };

  // Handle asset addition
  const handleAddAsset = async (ticker: string) => {
    if (!user?.id || !selectedWatchlistId) return;
    
    setIsSubmitting(true);
    setAssetErrors([]);
    
    try {
      const result = await watchlistEngineService.handleAssetAddition(
        selectedWatchlistId,
        ticker,
        user.id
      );
      
      if (result.success) {
        setAssetSearch('');
        setIsAddingAsset(false);
        refetchWatchlists();
      } else {
        setAssetErrors([result.error || 'Failed to add asset']);
      }
    } catch (error) {
      setAssetErrors(['Failed to add asset']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle asset removal
  const handleRemoveAsset = async (assetId: string) => {
    if (!user?.id || !selectedWatchlistId) return;
    
    try {
      const result = await watchlistEngineService.handleAssetRemoval(
        selectedWatchlistId,
        assetId,
        user.id
      );
      
      if (result.success) {
        refetchWatchlists();
      }
    } catch (error) {
      console.error('Failed to remove asset:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof WatchlistFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle sort changes
  const handleSortChange = (sortBy: Watchlist['settings']['sortBy']) => {
    if (!currentWatchlist || !user?.id) return;
    
    const newOrder = currentWatchlist.settings.sortBy === sortBy && currentWatchlist.settings.sortOrder === 'desc' ? 'asc' : 'desc';
    
    updateWatchlistMutation.mutate({
      id: currentWatchlist.id,
      updates: {
        settings: {
          ...currentWatchlist.settings,
          sortBy,
          sortOrder: newOrder
        }
      },
      userId: user.id
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchWatchlists();
  };

  // Handle modal close
  const handleCloseCreateModal = () => {
    setIsCreating(false);
    setWatchlistForm(watchlistEngineService.createDefaultWatchlist());
    setWatchlistErrors([]);
  };

  const handleCloseEditModal = () => {
    setIsEditing(false);
    setEditingWatchlistId(null);
    setWatchlistForm(watchlistEngineService.createDefaultWatchlist());
    setWatchlistErrors([]);
  };

  const handleCloseAssetModal = () => {
    setIsAddingAsset(false);
    setAssetSearch('');
    setAssetCategory('');
    setAssetErrors([]);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconName = watchlistEngineService.getCategoryIcon(category as any);
    switch (iconName) {
      case 'bitcoin':
        return <Bitcoin className="h-4 w-4" />;
      case 'trending-up':
        return <TrendingUp className="h-4 w-4" />;
      case 'file-text':
        return <FileText className="h-4 w-4" />;
      case 'package':
        return <Package className="h-4 w-4" />;
      case 'globe':
        return <Globe className="h-4 w-4" />;
      case 'bar-chart':
        return <BarChart className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  if (watchlistsError) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading watchlists: {watchlistsError.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (watchlistsLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
            Loading watchlists...
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
            <Eye className="h-5 w-5" />
            Watchlist Engine
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleCreateWatchlist}>
              <Plus className="h-4 w-4 mr-1" />
              Create Watchlist
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Watchlists</div>
                <div className="text-2xl font-bold">{summary.totalWatchlists}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Assets</div>
                <div className="text-2xl font-bold">{summary.totalAssets}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Unique Assets</div>
                <div className="text-2xl font-bold">{summary.uniqueAssets}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Recent Signals</div>
                <div className="text-2xl font-bold">{summary.recentSignals.length}</div>
              </div>
            </div>
          )}

          {/* Watchlist Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedWatchlistId || ''} onValueChange={setSelectedWatchlistId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a watchlist" />
                </SelectTrigger>
                <SelectContent>
                  {watchlists?.map(watchlist => (
                    <SelectItem key={watchlist.id} value={watchlist.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: watchlist.color }}
                        />
                        <span>{watchlist.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {watchlist.assetCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedWatchlistId && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingAsset(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Asset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {selectedWatchlistId && currentWatchlist && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditWatchlist(currentWatchlist)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteWatchlist(currentWatchlist.id, currentWatchlist.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* No Watchlists */}
          {watchlists?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No watchlists found. Create your first watchlist to get started.</p>
            </div>
          )}

          {/* Filters */}
          {showFilters && currentWatchlist && (
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select 
                    value={filter.category || ''} 
                    onValueChange={(value) => handleFilterChange('category', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="bonds">Bonds</SelectItem>
                      <SelectItem value="commodities">Commodities</SelectItem>
                      <SelectItem value="forex">Forex</SelectItem>
                      <SelectItem value="indices">Indices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Has Signals</label>
                  <Select 
                    value={filter.hasSignals === undefined ? '' : filter.hasSignals.toString()} 
                    onValueChange={(value) => handleFilterChange('hasSignals', value === '' ? undefined : value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All assets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All assets</SelectItem>
                      <SelectItem value="true">With signals</SelectItem>
                      <SelectItem value="false">Without signals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilter({})}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Watchlist Stats */}
          {watchlistStats && currentWatchlist && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Value</div>
                <div className="text-lg font-bold">
                  {watchlistEngineService.formatCurrency(watchlistStats.totalValue)}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">24h Change</div>
                <div className={`text-lg font-bold ${watchlistEngineService.getPerformanceColor(watchlistStats.totalChangePercent)}`}>
                  {watchlistEngineService.formatPercentage(watchlistStats.totalChangePercent)}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Active Signals</div>
                <div className="text-lg font-bold">{watchlistStats.signalCount}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Assets</div>
                <div className="text-lg font-bold">{currentWatchlist.assetCount}</div>
              </div>
            </div>
          )}

          {/* Assets Table */}
          {currentWatchlist && (
            <div>
              <h3 className="font-medium mb-4">Assets</h3>
              {sortedAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {currentWatchlist.assetCount === 0 
                      ? 'No assets in this watchlist. Add your first asset above.'
                      : 'No assets match the current filters.'
                    }
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSortChange('name')}
                            className="h-auto p-0 font-medium"
                          >
                            Asset
                            {currentWatchlist.settings.sortBy === 'name' && (
                              currentWatchlist.settings.sortOrder === 'desc' ? <SortDesc className="h-4 w-4 ml-1" /> : <SortAsc className="h-4 w-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSortChange('price')}
                            className="h-auto p-0 font-medium"
                          >
                            Price
                            {currentWatchlist.settings.sortBy === 'price' && (
                              currentWatchlist.settings.sortOrder === 'desc' ? <SortDesc className="h-4 w-4 ml-1" /> : <SortAsc className="h-4 w-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSortChange('change')}
                            className="h-auto p-0 font-medium"
                          >
                            24h Change
                            {currentWatchlist.settings.sortBy === 'change' && (
                              currentWatchlist.settings.sortOrder === 'desc' ? <SortDesc className="h-4 w-4 ml-1" /> : <SortAsc className="h-4 w-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Signals</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssets.map(asset => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`${watchlistEngineService.getCategoryColor(asset.category)}`}>
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <div className="font-medium">{asset.ticker}</div>
                                <div className="text-sm text-muted-foreground">{asset.name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="font-medium">
                                {watchlistEngineService.formatCurrency(asset.currentPrice, asset.currency)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Vol: {watchlistEngineService.formatLargeNumber(asset.volume24h)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`text-right ${watchlistEngineService.getPerformanceColor(asset.changePercent24h)}`}>
                              <div className="font-medium">
                                {watchlistEngineService.formatPercentage(asset.changePercent24h)}
                              </div>
                              <div className="text-sm">
                                {watchlistEngineService.formatCurrency(asset.change24h, asset.currency)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {asset.signals.slice(0, 3).map(signal => {
                                const strength = watchlistEngineService.getSignalStrengthBadge(signal.strength);
                                return (
                                  <Badge
                                    key={signal.id}
                                    className={`${strength.className} text-xs`}
                                  >
                                    {signal.type.toUpperCase()}
                                  </Badge>
                                );
                              })}
                              {asset.signals.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{asset.signals.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Watchlist Modal */}
      <Dialog open={isCreating} onOpenChange={handleCloseCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Watchlist</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Form Errors */}
            {watchlistErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  {watchlistErrors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Watchlist Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={watchlistForm.name}
                onChange={(e) => handleWatchlistFormChange('name', e.target.value)}
                placeholder="My Watchlist"
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Textarea
                value={watchlistForm.description}
                onChange={(e) => handleWatchlistFormChange('description', e.target.value)}
                placeholder="Description of this watchlist..."
                rows={2}
                maxLength={200}
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <Input
                type="color"
                value={watchlistForm.color}
                onChange={(e) => handleWatchlistFormChange('color', e.target.value)}
                className="w-full h-10"
              />
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Default Watchlist</label>
                <Switch
                  checked={watchlistForm.isDefault}
                  onCheckedChange={(checked) => handleWatchlistFormChange('isDefault', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Public</label>
                <Switch
                  checked={watchlistForm.isPublic}
                  onCheckedChange={(checked) => handleWatchlistFormChange('isPublic', checked)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseCreateModal}>
                Cancel
              </Button>
              <Button onClick={handleWatchlistSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Watchlist Modal */}
      <Dialog open={isEditing} onOpenChange={handleCloseEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Form Errors */}
            {watchlistErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  {watchlistErrors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Watchlist Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={watchlistForm.name}
                onChange={(e) => handleWatchlistFormChange('name', e.target.value)}
                placeholder="My Watchlist"
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Textarea
                value={watchlistForm.description}
                onChange={(e) => handleWatchlistFormChange('description', e.target.value)}
                placeholder="Description of this watchlist..."
                rows={2}
                maxLength={200}
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <Input
                type="color"
                value={watchlistForm.color}
                onChange={(e) => handleWatchlistFormChange('color', e.target.value)}
                className="w-full h-10"
              />
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Default Watchlist</label>
                <Switch
                  checked={watchlistForm.isDefault}
                  onCheckedChange={(checked) => handleWatchlistFormChange('isDefault', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Public</label>
                <Switch
                  checked={watchlistForm.isPublic}
                  onCheckedChange={(checked) => handleWatchlistFormChange('isPublic', checked)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseEditModal}>
                Cancel
              </Button>
              <Button onClick={handleWatchlistSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Asset Modal */}
      <Dialog open={isAddingAsset} onOpenChange={handleCloseAssetModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Form Errors */}
            {assetErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  {assetErrors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Search Assets</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search by ticker or name..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select value={assetCategory} onValueChange={setAssetCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="bonds">Bonds</SelectItem>
                  <SelectItem value="commodities">Commodities</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="indices">Indices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Results */}
            {assetSearchResults && assetSearchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                {assetSearchResults.map(asset => (
                  <div
                    key={asset.ticker}
                    className="p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                    onClick={() => handleAddAsset(asset.ticker)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`${watchlistEngineService.getCategoryColor(asset.category)}`}>
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="font-medium">{asset.ticker}</div>
                          <div className="text-sm text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {watchlistEngineService.formatCurrency(asset.currentPrice, asset.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.exchange}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseAssetModal}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}; 