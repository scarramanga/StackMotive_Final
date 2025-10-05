import React, { useState, useMemo } from 'react';
import { useDashboardData } from '../../hooks/use-dashboard-data';
import { BarChart2, Edit2, Check, X } from 'lucide-react';

// Default categories (user can edit/add)
const DEFAULT_CATEGORIES = [
  { key: 'sovereign', label: 'Sovereign', color: 'bg-blue-500' },
  { key: 'real', label: 'Real Asset', color: 'bg-yellow-600' },
  { key: 'tech', label: 'Tech', color: 'bg-green-500' },
  { key: 'other', label: 'Other', color: 'bg-gray-400' },
];

// Example mapping (should be user-editable in future)
const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  BTC: 'sovereign',
  XAU: 'real',
  GLD: 'real',
  AAPL: 'tech',
  TSLA: 'tech',
};

const THRESHOLD = 0.05; // 5% deviation triggers prompt

// Add support for custom categories (max 10/user)
const LOCAL_STORAGE_KEY = 'customCategories';

function loadCustomCategories() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveCustomCategories(categories: typeof DEFAULT_CATEGORIES) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
}

const VaultAllocator: React.FC = () => {
  const { data } = useDashboardData();
  const [categories, setCategories] = useState(() => {
    const custom = loadCustomCategories();
    return [...DEFAULT_CATEGORIES, ...custom];
  });
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>(DEFAULT_CATEGORY_MAP);
  const [targets, setTargets] = useState<Record<string, number>>({
    sovereign: 0.4,
    real: 0.2,
    tech: 0.3,
    other: 0.1,
  });
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  // Cash buffer state
  const [cashFloor, setCashFloor] = useState(5); // default 5%
  const [cashTarget, setCashTarget] = useState(10); // default 10%

  // Add UI for adding/editing/deleting custom categories
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('#888888');
  const addCustomCategory = () => {
    if (categories.length >= 10 || !newCatLabel.trim()) return;
    const newCat = { key: `custom-${Date.now()}`, label: newCatLabel, color: newCatColor };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCustomCategories(updated.filter(c => c.key.startsWith('custom-')));
    setNewCatLabel('');
    setNewCatColor('#888888');
  };
  const deleteCustomCategory = (key: string) => {
    const updated = categories.filter(c => c.key !== key);
    setCategories(updated);
    saveCustomCategories(updated.filter(c => c.key.startsWith('custom-')));
  };

  // Compute current allocation by category
  const current = useMemo(() => {
    if (!data) return {};
    const total = data.holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const catSums: Record<string, number> = {};
    data.holdings.forEach(h => {
      const cat = categoryMap[h.symbol] || 'other';
      catSums[cat] = (catSums[cat] || 0) + h.totalValue;
    });
    const result: Record<string, number> = {};
    Object.keys(catSums).forEach(cat => {
      result[cat] = total > 0 ? catSums[cat] / total : 0;
    });
    return result;
  }, [data, categoryMap]);

  // Over/under-exposed detection
  const deviations = useMemo(() => {
    const devs: Record<string, number> = {};
    categories.forEach(cat => {
      devs[cat.key] = (current[cat.key] || 0) - (targets[cat.key] || 0);
    });
    return devs;
  }, [categories, current, targets]);

  // Edit category label/color
  const startEdit = (key: string, label: string, color: string) => {
    setEditingCat(key);
    setEditLabel(label);
    setEditColor(color);
  };
  const saveEdit = () => {
    setCategories(cats => cats.map(cat => cat.key === editingCat ? { ...cat, label: editLabel, color: editColor } : cat));
    setEditingCat(null);
    setEditLabel('');
    setEditColor('');
  };
  const cancelEdit = () => {
    setEditingCat(null);
    setEditLabel('');
    setEditColor('');
  };

  // Manual override for mapping
  const setAssetCategory = (symbol: string, catKey: string) => {
    setCategoryMap(map => ({ ...map, [symbol]: catKey }));
  };

  // Manual override for targets
  const setTarget = (catKey: string, value: number) => {
    setTargets(t => ({ ...t, [catKey]: Math.max(0, Math.min(1, value)) }));
  };

  // Suggest rebalance if any deviation exceeds threshold
  const needsRebalance = Object.values(deviations).some(d => Math.abs(d) > THRESHOLD);

  // Calculate current cash %
  const cashCategory = categories.find(c => c.key === 'cash');
  const currentCashPct = current['cash'] || 0;

  // Cash buffer enforcement
  const cashBelowFloor = currentCashPct < cashFloor;
  const [overrideBuffer, setOverrideBuffer] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BarChart2 className="w-6 h-6 text-primary" /> Vault Category Allocator
      </h2>
      {/* Cash Buffer Controls */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <label className="font-medium">Cash Buffer Floor:</label>
          <input type="number" min={0} max={100} value={cashFloor} onChange={e => setCashFloor(Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
          <span className="text-xs text-gray-500">%</span>
          <label className="font-medium ml-6">Target:</label>
          <input type="number" min={0} max={100} value={cashTarget} onChange={e => setCashTarget(Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
          <span className="text-xs text-gray-500">%</span>
          <span className="ml-6 font-medium">Current Cash:</span>
          <span className="font-mono text-blue-700 dark:text-blue-300">{currentCashPct.toFixed(1)}%</span>
        </div>
        <input type="range" min={0} max={100} value={cashTarget} onChange={e => setCashTarget(Number(e.target.value))} className="w-full mt-2" />
      </div>
      {/* Warning if cash below floor */}
      {cashBelowFloor && !overrideBuffer && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded border border-red-300">
          <strong>Warning:</strong> Rebalancing would drop cash below your floor ({cashFloor}%).
          <button className="ml-4 px-2 py-1 rounded bg-red-200 hover:bg-red-300 text-xs font-semibold" onClick={() => setOverrideBuffer(true)}>
            Override
          </button>
        </div>
      )}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {categories.map(cat => (
            <div key={cat.key} className={`flex items-center gap-2 px-3 py-1 rounded ${cat.color} text-white`}>
              {editingCat === cat.key ? (
                <>
                  <input
                    className="w-24 px-1 rounded text-black"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                  />
                  <input
                    className="w-24 px-1 rounded text-black"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    placeholder="bg-blue-500"
                  />
                  <button className="ml-1" onClick={saveEdit}><Check className="w-4 h-4" /></button>
                  <button className="ml-1" onClick={cancelEdit}><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span>{cat.label}</span>
                  <button className="ml-1" onClick={() => startEdit(cat.key, cat.label, cat.color)}><Edit2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="w-24 font-medium">{cat.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={targets[cat.key] || 0}
                onChange={e => setTarget(cat.key, parseFloat(e.target.value))}
                className="w-32 accent-primary"
                aria-label={`Set target for ${cat.label}`}
              />
              <span className="w-12 text-right tabular-nums">{((targets[cat.key] || 0) * 100).toFixed(0)}%</span>
              <span className="w-24 text-xs text-muted-foreground">Current: {((current[cat.key] || 0) * 100).toFixed(0)}%</span>
              <span className={`w-24 text-xs ${Math.abs(deviations[cat.key]) > THRESHOLD ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                {deviations[cat.key] > 0 ? '+' : ''}{(deviations[cat.key] * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-base font-semibold mb-2">Asset Category Mapping</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border rounded">
            <thead>
              <tr>
                <th className="text-left">Asset</th>
                <th className="text-left">Category</th>
                <th className="text-left">Manual Override</th>
              </tr>
            </thead>
            <tbody>
              {data?.holdings.map(h => (
                <tr key={h.symbol}>
                  <td className="font-mono px-2 py-1">{h.symbol}</td>
                  <td className="px-2 py-1">{categories.find(c => c.key === (categoryMap[h.symbol] || 'other'))?.label || 'Other'}</td>
                  <td className="px-2 py-1">
                    <select
                      value={categoryMap[h.symbol] || 'other'}
                      onChange={e => setAssetCategory(h.symbol, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      {categories.map(cat => (
                        <option key={cat.key} value={cat.key}>{cat.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Custom Category UI */}
      <div className="mb-4">
        <h3 className="text-base font-semibold mb-2">Custom Categories</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Category name"
            value={newCatLabel}
            onChange={e => setNewCatLabel(e.target.value)}
            maxLength={20}
          />
          <input
            type="color"
            value={newCatColor}
            onChange={e => setNewCatColor(e.target.value)}
            className="w-8 h-8 border rounded"
            aria-label="Category color"
          />
          <button
            className="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold"
            onClick={addCustomCategory}
            disabled={categories.length >= 10 || !newCatLabel.trim()}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.filter(c => c.key.startsWith('custom-')).map(cat => (
            <span key={cat.key} className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: cat.color, color: '#fff' }}>
              {cat.label}
              <button
                className="ml-1 text-xs text-red-200 hover:text-red-500"
                onClick={() => deleteCustomCategory(cat.key)}
                aria-label={`Delete ${cat.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {needsRebalance && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-900 rounded border border-yellow-300">
          <strong>Rebalance suggested:</strong> One or more categories deviate from target by more than {(THRESHOLD * 100).toFixed(0)}%.
        </div>
      )}
    </div>
  );
};

export default VaultAllocator; 