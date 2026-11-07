import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, FileText, X } from 'lucide-react';
import apiClient from '../../api/client';
import { Customer } from '../../types';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/customers', { params: { search: search || undefined } });
      setCustomers(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await apiClient.post('/customers', formData);
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', gstin: '' });
      fetchCustomers();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-orange-500" />
            Customer Profiles & Ledgers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain customer contact directories, credit limits, and outstanding balances.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={15} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="search-bar max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search by customer name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <Users />
            <h3>No customers found</h3>
            <p>Add customer records to track credit billing and send SMS invoices.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th className="text-right">Outstanding Due</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-slate-200 text-xs">{c.name}</td>
                  <td className="text-xs text-slate-300">{c.phone || '—'}</td>
                  <td className="text-xs text-slate-400">{c.email || '—'}</td>
                  <td className="text-xs text-slate-400 font-mono">{c.gstin || '—'}</td>
                  <td className="text-right text-xs font-bold text-amber-400">
                    ₹{(c.outstanding_balance || 0).toFixed(2)}
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
              <h3 className="font-bold text-white text-base">New Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
