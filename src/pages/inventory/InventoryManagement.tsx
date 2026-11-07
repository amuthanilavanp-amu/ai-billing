import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowDownUp,
  History,
  TrendingDown,
  DollarSign,
  Plus,
  Minus,
  Check,
  X,
} from 'lucide-react';
import apiClient from '../../api/client';
import { Product } from '../../types';

interface InventorySummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number;
  low_stock_items: Array<{ id: number; name: string; current_stock: number; reorder_level: number }>;
  out_of_stock_items: Array<{ id: number; name: string; unit: string }>;
}

export const InventoryManagement: React.FC = () => {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Movement History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get('/inventory/summary');
      setSummary(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/products', { params: { page_size: 100 } });
      setProducts(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchProducts();
  }, []);

  const openAdjustment = (p: Product) => {
    setSelectedProduct(p);
    setAdjustQty('');
    setAdjustType('adjustment');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) return;

    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0) {
      alert('Please enter a valid non-zero adjustment quantity (+ to add, - to deduct).');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/inventory/adjust', {
        product_id: selectedProduct.id,
        quantity: qty,
        movement_type: adjustType,
        notes: adjustNotes || 'Manual stock adjustment',
      });
      setIsAdjustModalOpen(false);
      fetchSummary();
      fetchProducts();
    } catch (err: any) {
      alert('Adjustment failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewHistory = async (p: Product) => {
    setSelectedProduct(p);
    try {
      const res = await apiClient.get(`/inventory/movements/${p.id}`);
      setMovements(res.data.items);
      setIsHistoryModalOpen(true);
    } catch (err: any) {
      alert('Failed to load movements: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Boxes className="text-orange-500" />
          Inventory Control & Stock Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor physical on-hand stock, record audit adjustments, and review stock movements.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Inventory Valuation</span>
          <span className="stat-value text-emerald-400">
            ₹{summary ? summary.total_inventory_value.toLocaleString('en-IN') : '0.00'}
          </span>
          <span className="stat-change">Cost-basis physical stock value</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Tracked Items</span>
          <span className="stat-value text-orange-400">{summary?.total_products || 0}</span>
          <span className="stat-change">Products with stock tracking enabled</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Low Stock Alerts</span>
          <span className="stat-value text-amber-400">{summary?.low_stock_count || 0}</span>
          <span className="stat-change text-amber-500">At or below reorder threshold</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Out of Stock</span>
          <span className="stat-value text-red-400">{summary?.out_of_stock_count || 0}</span>
          <span className="stat-change text-red-500">Immediate purchase required</span>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {summary && summary.low_stock_items.length > 0 && (
        <div className="card bg-amber-950/20 border-amber-500/40 p-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
            <AlertTriangle size={16} />
            <span>CRITICAL REORDER ALERTS ({summary.low_stock_items.length} Products)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.low_stock_items.map((item) => (
              <span
                key={item.id}
                className="bg-amber-900/40 text-amber-200 border border-amber-600/40 px-2.5 py-1 rounded text-xs"
              >
                <strong>{item.name}</strong>: {item.current_stock} left (Reorder at {item.reorder_level})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Stock Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Current Physical Stock Levels</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading inventory...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th className="text-center">Current Stock</th>
                <th className="text-center">Reorder Level</th>
                <th className="text-right">Unit Value (₹)</th>
                <th className="text-right">Total Valuation (₹)</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter((p) => p.track_inventory)
                .map((p) => {
                  const isLow = p.current_stock <= p.reorder_level && p.reorder_level > 0;
                  const isOut = p.current_stock <= 0;
                  const val = p.current_stock * (p.purchase_price || p.selling_price);

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="font-semibold text-slate-200 text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{p.unit}</div>
                      </td>
                      <td className="text-xs text-slate-400 font-mono">{p.barcode || '—'}</td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            isOut ? 'badge-red' : isLow ? 'badge-yellow' : 'badge-green'
                          }`}
                        >
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="text-center text-xs text-slate-400">{p.reorder_level}</td>
                      <td className="text-right text-xs text-slate-300">
                        ₹{(p.purchase_price || p.selling_price).toFixed(2)}
                      </td>
                      <td className="text-right text-xs font-semibold text-white">
                        ₹{val.toFixed(2)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAdjustment(p)}
                            className="btn btn-secondary btn-sm text-xs"
                          >
                            <ArrowDownUp size={13} />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => viewHistory(p)}
                            className="btn btn-secondary btn-sm text-xs"
                          >
                            <History size={13} />
                            <span>Log</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md">
            <div className="card-header">
              <div>
                <h3 className="font-bold text-white text-base">Stock Adjustment</h3>
                <p className="text-xs text-slate-400">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">Current On-Hand Stock:</span>
                <span className="font-bold text-white">
                  {selectedProduct.current_stock} {selectedProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity Adjustment (+ to add, - to subtract)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. +10 or -3"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Type</label>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                  <option value="adjustment">Physical Audit Discrepancy</option>
                  <option value="damage">Damaged / Expired</option>
                  <option value="return_in">Customer Return</option>
                  <option value="return_out">Supplier Return</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Month-end physical count"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Ledger History Modal */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-2xl">
            <div className="card-header">
              <div>
                <h3 className="font-bold text-white text-base">Movement History Ledger</h3>
                <p className="text-xs text-slate-400">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {movements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No movement records found.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th className="text-right">Change</th>
                      <th className="text-right">Before</th>
                      <th className="text-right">After</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="text-xs text-slate-400">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="badge badge-gray text-[10px] uppercase">{m.movement_type}</span>
                        </td>
                        <td
                          className={`text-right text-xs font-bold ${
                            m.quantity >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="text-right text-xs text-slate-400">{m.stock_before}</td>
                        <td className="text-right text-xs font-semibold text-white">{m.stock_after}</td>
                        <td className="text-xs text-slate-500">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
              <button onClick={() => setIsHistoryModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
