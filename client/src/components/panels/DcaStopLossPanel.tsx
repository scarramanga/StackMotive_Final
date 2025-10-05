import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  TrendingUp, Shield, Play, Pause, Plus, Edit, Trash2, Activity, Clock, Target
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { 
  useDCAStopLossData, useCreateDCARule, useCreateStopLossRule, useUpdateDCARule, 
  useUpdateStopLossRule, useDeleteDCARule, useDeleteStopLossRule, useExecuteDCA, 
  useExecuteStopLoss, dcaStopLossService, type DCARule, type StopLossRule
} from '../../services/dcaStopLossService';

export const DcaStopLossPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeVaultId } = usePortfolio();
  
  const [activeTab, setActiveTab] = useState('dca');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DCARule | StopLossRule | null>(null);
  const [ruleType, setRuleType] = useState<'dca' | 'stop_loss'>('dca');
  const [dcaForm, setDcaForm] = useState<Partial<DCARule>>(dcaStopLossService.getDefaultDCAForm());
  const [stopLossForm, setStopLossForm] = useState<Partial<StopLossRule>>(dcaStopLossService.getDefaultStopLossForm());

  const { data: rulesData, isLoading, error } = useDCAStopLossData((user as any)?.id || '1', activeVaultId || undefined);
  const createDCAMutation = useCreateDCARule();
  const createStopLossMutation = useCreateStopLossRule();
  const updateDCAMutation = useUpdateDCARule();
  const updateStopLossMutation = useUpdateStopLossRule();
  const deleteDCAMutation = useDeleteDCARule();
  const deleteStopLossMutation = useDeleteStopLossRule();
  const executeDCAMutation = useExecuteDCA();
  const executeStopLossMutation = useExecuteStopLoss();

  const userId = (user as any)?.id || '1';
  const vaultId = activeVaultId || undefined;

  const handleDCASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule && 'dcaType' in editingRule) {
        const result = await dcaStopLossService.handleUpdateDCARule(editingRule.id, dcaForm, userId, vaultId);
        if (!result.success) return console.error('Failed to update DCA rule:', result.error);
        await updateDCAMutation.mutateAsync({ ruleId: editingRule.id, updates: dcaForm });
      } else {
        const result = await dcaStopLossService.handleCreateDCARule(dcaForm, userId, vaultId);
        if (!result.success) return console.error('Failed to create DCA rule:', result.error);
        await createDCAMutation.mutateAsync(result.rule as any);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleStopLossSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule && 'stopLossType' in editingRule) {
        const result = await dcaStopLossService.handleUpdateStopLossRule(editingRule.id, stopLossForm, userId, vaultId);
        if (!result.success) return console.error('Failed to update stop-loss rule:', result.error);
        await updateStopLossMutation.mutateAsync({ ruleId: editingRule.id, updates: stopLossForm });
      } else {
        const result = await dcaStopLossService.handleCreateStopLossRule(stopLossForm, userId, vaultId);
        if (!result.success) return console.error('Failed to create stop-loss rule:', result.error);
        await createStopLossMutation.mutateAsync(result.rule as any);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleEdit = (rule: DCARule | StopLossRule) => {
    setEditingRule(rule);
    const { ruleType, formData } = dcaStopLossService.prepareRuleForEdit(rule);
    setRuleType(ruleType);
    if (ruleType === 'dca') setDcaForm(formData as Partial<DCARule>);
    else setStopLossForm(formData as Partial<StopLossRule>);
    setShowCreateModal(true);
    dcaStopLossService.logAgentMemory('modal_opened', { userId, vaultId, metadata: { action: 'edit', ruleType, ruleId: rule.id } });
  };

  const handleDelete = async (rule: DCARule | StopLossRule) => {
    const result = await dcaStopLossService.handleDeleteRule(rule, userId, vaultId);
    if (!result.success) return console.error('Failed to delete rule:', result.error);
    try {
      if ('dcaType' in rule) await deleteDCAMutation.mutateAsync(rule.id);
      else await deleteStopLossMutation.mutateAsync(rule.id);
    } catch (error) {
      console.error('Delete mutation error:', error);
    }
  };

  const handleToggleStatus = async (rule: DCARule | StopLossRule) => {
    const result = await dcaStopLossService.handleToggleRuleStatus(rule, userId, vaultId);
    if (!result.success) return console.error('Failed to toggle rule status:', result.error);
    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active';
      if ('dcaType' in rule) await updateDCAMutation.mutateAsync({ ruleId: rule.id, updates: { status: newStatus } });
      else await updateStopLossMutation.mutateAsync({ ruleId: rule.id, updates: { status: newStatus } });
    } catch (error) {
      console.error('Toggle status mutation error:', error);
    }
  };

  const handleExecute = async (rule: DCARule | StopLossRule) => {
    const result = await dcaStopLossService.handleExecuteRule(rule, userId, vaultId);
    if (!result.success) return console.error('Failed to execute rule:', result.error);
    try {
      if ('dcaType' in rule) await executeDCAMutation.mutateAsync({ ruleId: rule.id });
      else await executeStopLossMutation.mutateAsync({ ruleId: rule.id });
    } catch (error) {
      console.error('Execute mutation error:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    dcaStopLossService.logAgentMemory('tab_changed', { userId, vaultId, metadata: { newTab: value } });
  };

  const handleOpenModal = () => {
    setShowCreateModal(true);
    dcaStopLossService.logAgentMemory('modal_opened', { userId, vaultId, metadata: { action: 'create' } });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingRule(null);
    const { dcaForm: defaultDCA, stopLossForm: defaultStopLoss } = dcaStopLossService.getEmptyFormStates();
    setDcaForm(defaultDCA);
    setStopLossForm(defaultStopLoss);
    dcaStopLossService.logAgentMemory('modal_closed', { userId, vaultId, metadata: { action: editingRule ? 'edit' : 'create' } });
  };

  const renderDCARule = (rule: DCARule) => {
    const statusBadge = dcaStopLossService.getDCAStatusBadge(rule.status);
    return (
      <Card key={rule.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="truncate">{rule.name}</span>
            </div>
            <Badge className={statusBadge.variant}>{statusBadge.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Symbol</div><div className="font-medium">{rule.symbol}</div></div>
            <div><div className="text-sm text-muted-foreground">Type</div><div className="font-medium capitalize">{rule.dcaType.replace('_', ' ')}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Amount</div><div className="font-medium">${rule.amount}</div></div>
            <div><div className="text-sm text-muted-foreground">Frequency</div><div className="font-medium capitalize">{rule.frequency}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Executions</div><div className="font-medium">{rule.executionCount}</div></div>
            <div><div className="text-sm text-muted-foreground">Total Invested</div><div className="font-medium">${rule.totalInvested.toLocaleString()}</div></div>
          </div>
          {rule.nextExecution && (
            <div><div className="text-sm text-muted-foreground">Next Execution</div><div className="font-medium">{dcaStopLossService.formatNextExecution(rule)}</div></div>
          )}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => handleToggleStatus(rule)}>
              {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExecute(rule)} disabled={rule.status !== 'active'}>
              <Activity className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}><Edit className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(rule)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStopLossRule = (rule: StopLossRule) => {
    const statusBadge = dcaStopLossService.getStopLossStatusBadge(rule.status);
    return (
      <Card key={rule.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="truncate">{rule.name}</span>
            </div>
            <Badge className={statusBadge.variant}>{statusBadge.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Symbol</div><div className="font-medium">{rule.symbol}</div></div>
            <div><div className="text-sm text-muted-foreground">Type</div><div className="font-medium capitalize">{rule.stopLossType.replace('_', ' ')}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Trigger</div><div className="font-medium">{rule.triggerPercent ? `${rule.triggerPercent}%` : rule.triggerPrice ? `$${rule.triggerPrice}` : 'Not set'}</div></div>
            <div><div className="text-sm text-muted-foreground">Execution</div><div className="font-medium capitalize">{rule.executionMethod}</div></div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => handleToggleStatus(rule)}>
              {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}><Edit className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(rule)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFormModal = () => (
    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle></DialogHeader>
        <Tabs value={ruleType} onValueChange={setRuleType as any} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dca">DCA Rule</TabsTrigger>
            <TabsTrigger value="stop_loss">Stop-Loss Rule</TabsTrigger>
          </TabsList>
          <TabsContent value="dca">
            <form onSubmit={handleDCASubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="dcaName">Rule Name</Label><Input id="dcaName" value={dcaForm.name} onChange={(e) => setDcaForm(prev => ({ ...prev, name: e.target.value }))} required /></div>
                <div><Label htmlFor="dcaSymbol">Symbol</Label><Input id="dcaSymbol" value={dcaForm.symbol} onChange={(e) => setDcaForm(prev => ({ ...prev, symbol: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="dcaType">DCA Type</Label><Select value={dcaForm.dcaType} onValueChange={(value) => setDcaForm(prev => ({ ...prev, dcaType: value as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="time_based">Time Based</SelectItem><SelectItem value="trigger_based">Trigger Based</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="dcaAmount">Amount</Label><Input id="dcaAmount" type="number" value={dcaForm.amount} onChange={(e) => setDcaForm(prev => ({ ...prev, amount: Number(e.target.value) }))} required /></div>
              </div>
              {dcaForm.dcaType === 'time_based' && (
                <div><Label htmlFor="dcaFrequency">Frequency</Label><Select value={dcaForm.frequency} onValueChange={(value) => setDcaForm(prev => ({ ...prev, frequency: value as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
              )}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createDCAMutation.isPending || updateDCAMutation.isPending}>{editingRule ? 'Update' : 'Create'} DCA Rule</Button>
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="stop_loss">
            <form onSubmit={handleStopLossSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="stopLossName">Rule Name</Label><Input id="stopLossName" value={stopLossForm.name} onChange={(e) => setStopLossForm(prev => ({ ...prev, name: e.target.value }))} required /></div>
                <div><Label htmlFor="stopLossSymbol">Symbol</Label><Input id="stopLossSymbol" value={stopLossForm.symbol} onChange={(e) => setStopLossForm(prev => ({ ...prev, symbol: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="stopLossType">Stop-Loss Type</Label><Select value={stopLossForm.stopLossType} onValueChange={(value) => setStopLossForm(prev => ({ ...prev, stopLossType: value as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed_price">Fixed Price</SelectItem><SelectItem value="trailing">Trailing</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="triggerPercent">Trigger Percent (%)</Label><Input id="triggerPercent" type="number" value={stopLossForm.triggerPercent} onChange={(e) => setStopLossForm(prev => ({ ...prev, triggerPercent: Number(e.target.value) }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="executionMethod">Execution Method</Label><Select value={stopLossForm.executionMethod} onValueChange={(value) => setStopLossForm(prev => ({ ...prev, executionMethod: value as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="market">Market Order</SelectItem><SelectItem value="limit">Limit Order</SelectItem><SelectItem value="alert_only">Alert Only</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="sellPercentage">Sell Percentage (%)</Label><Input id="sellPercentage" type="number" value={stopLossForm.sellPercentage} onChange={(e) => setStopLossForm(prev => ({ ...prev, sellPercentage: Number(e.target.value) }))} required /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createStopLossMutation.isPending || updateStopLossMutation.isPending}>{editingRule ? 'Update' : 'Create'} Stop-Loss Rule</Button>
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">Error loading DCA/Stop-Loss rules: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  const dcaRules = rulesData?.dcaRules || [];
  const stopLossRules = rulesData?.stopLossRules || [];
  const summary = rulesData?.summary;

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              DCA & Stop-Loss Assistant
            </div>
            <Button onClick={handleOpenModal}><Plus className="h-4 w-4 mr-2" />New Rule</Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{summary.activeDCARules}</div><div className="text-xs text-muted-foreground">Active DCA Rules</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{summary.activeStopLossRules}</div><div className="text-xs text-muted-foreground">Active Stop-Loss Rules</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">${summary.totalInvested.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Invested</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{summary.unrealizedPnL >= 0 ? '+' : ''}${summary.unrealizedPnL.toLocaleString()}</div><div className="text-xs text-muted-foreground">Unrealized P&L</div></CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dca">DCA Rules</TabsTrigger>
          <TabsTrigger value="stop_loss">Stop-Loss Rules</TabsTrigger>
          <TabsTrigger value="history">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="dca" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (<Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded"></div></CardContent></Card>))}
            </div>
          ) : dcaRules.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No DCA rules configured</h3><p className="text-muted-foreground mb-4">Create your first DCA rule to start dollar-cost averaging</p><Button onClick={() => { setRuleType('dca'); handleOpenModal(); }}><Plus className="h-4 w-4 mr-2" />Create DCA Rule</Button></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{dcaRules.map(renderDCARule)}</div>
          )}
        </TabsContent>

        <TabsContent value="stop_loss" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (<Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded"></div></CardContent></Card>))}
            </div>
          ) : stopLossRules.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No stop-loss rules configured</h3><p className="text-muted-foreground mb-4">Create your first stop-loss rule to protect your positions</p><Button onClick={() => { setRuleType('stop_loss'); handleOpenModal(); }}><Plus className="h-4 w-4 mr-2" />Create Stop-Loss Rule</Button></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{stopLossRules.map(renderStopLossRule)}</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card><CardContent className="p-8 text-center"><Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">Activity Log</h3><p className="text-muted-foreground">Execution history will appear here</p></CardContent></Card>
        </TabsContent>
      </Tabs>

      {renderFormModal()}
    </div>
  );
};

export default DcaStopLossPanel; 