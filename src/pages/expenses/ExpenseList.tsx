import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Calendar, Tag, X } from 'lucide-react';
import apiClient from '../../api/client';

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Rent',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
  });

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/expenses');
      setExpenses(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      await apiClient.post('/expenses', {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setIsModalOpen(false);
      setFormData({
        category: 'Rent',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
      });
      fetchExpenses();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-blue-400" />
            Operating Expense Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record store expenses, utility bills, employee wages, and general overhead.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={15} />
          <span>Record Expense</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Recorded Expenses</span>
          <span className="stat-value text-red-400">₹{totalExpense.toLocaleString('en-IN')}</span>
          <span className="stat-change">{expenses.length} expense vouchers</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <DollarSign />
            <h3>No expenses recorded</h3>
            <p>Log store operating costs to monitor true net business profitability.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment Mode</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs text-slate-400">{e.expense_date}</td>
                  <td>
                    <span className="badge badge-gray text-xs">{e.category}</span>
                  </td>
                  <td className="text-xs font-semibold text-slate-200">{e.description}</td>
                  <td className="text-xs text-slate-400 uppercase font-mono">{e.payment_method}</td>
                  <td className="text-right text-xs font-bold text-red-400">
                    ₹{e.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md">
            <div className="card-header">
              <h3 className="font-bold text-white text-base">Record Operating Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Rent">Shop Rent</option>
                    <option value="Electricity">Electricity / Utilities</option>
                    <option value="Salaries">Staff Salaries & Wages</option>
                    <option value="Supplies">Packing & Store Supplies</option>
                    <option value="Maintenance">Repairs & Maintenance</option>
                    <option value="Transport">Transport / Logistics</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Voucher Note *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October shop rent paid to landlord"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
