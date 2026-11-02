import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Phone, Mail, X } from 'lucide-react';
import apiClient from '../../api/client';
import { Supplier } from '../../types';

export const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    gstin: '',
    lead_time_days: '3',
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/suppliers', { params: { search: search || undefined } });
      setSuppliers(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await apiClient.post('/suppliers', {
        ...formData,
        lead_time_days: parseInt(formData.lead_time_days) || 1,
      });
      setIsModalOpen(false);
      setFormData({ name: '', contact_person: '', phone: '', email: '', gstin: '', lead_time_days: '3' });
      fetchSuppliers();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="text-blue-400" />
            Vendor & Supplier Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage wholesale distributors, procurement lead times, and accounts payable.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={15} />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="search-bar max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search by vendor name or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading suppliers...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <Truck />
            <h3>No vendors registered</h3>
            <p>Add wholesale suppliers to track purchase orders and stock arrivals.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor / Company</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th className="text-right">Outstanding Payable</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold text-slate-200 text-xs">{s.name}</td>
                  <td className="text-xs text-slate-300">{s.phone || '—'}</td>
                  <td className="text-xs text-slate-400">{s.email || '—'}</td>
                  <td className="text-xs text-slate-400 font-mono">{s.gstin || '—'}</td>
                  <td className="text-right text-xs font-bold text-slate-300">
                    ₹{(s.outstanding_balance || 0).toFixed(2)}
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
              <h3 className="font-bold text-white text-base">New Supplier</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
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
              <div className="pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
