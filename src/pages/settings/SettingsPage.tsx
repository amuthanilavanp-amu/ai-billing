import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Save,
  Building,
  Shield,
  CheckCircle,
  FileText,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

export const SettingsPage: React.FC = () => {
  const { company, updateCompany } = useBusiness();

  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    invoice_prefix: 'INV',
    footer_note: '',
    terms_conditions: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup state
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        gstin: company.gstin || '',
        phone: company.phone || '',
        email: company.email || '',
        address_line1: company.address_line1 || '',
        city: company.city || '',
        state: company.state || '',
        pincode: company.pincode || '',
        invoice_prefix: company.invoice_prefix || 'INV',
        footer_note: company.footer_note || '',
        terms_conditions: company.terms_conditions || '',
      });
    }
  }, [company]);

  const loadBackups = async () => {
    try {
      const res = await apiClient.get('/backup/list');
      setBackups(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateCompany(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update company settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      const res = await apiClient.post('/backup/create');
      setBackupMessage(`Backup generated: ${res.data.filename}`);
      loadBackups();
    } catch (err: any) {
      alert('Backup failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="text-orange-500" />
          System Settings & Database Backups
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure business invoice headers, statutory tax IDs, and manage SQLite database snapshots.
        </p>
      </div>

      {/* Business Details Form */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Building size={18} className="text-orange-400" />
            <h2 className="text-sm font-bold text-white">Business Invoice Header & Contact</h2>
          </div>
          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle size={14} />
              Saved successfully!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Store Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Support Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Footer Note</label>
            <input
              type="text"
              placeholder="e.g. Thank you for your business! Goods once sold will not be taken back."
              value={formData.footer_note}
              onChange={(e) => setFormData({ ...formData, footer_note: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={isSaving} className="btn btn-primary flex items-center gap-1.5">
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Update Business Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database Backup Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Database Backup & Disaster Recovery</h2>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={isBackingUp}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            {isBackingUp ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Download size={14} />
                <span>Create Safe Snapshot Now</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          SmartBiz AI utilizes SQLite with Write-Ahead Logging (WAL). Creating a snapshot executes an online
          checkpointed atomic backup directly to your local backup directory, ensuring zero downtime and zero
          data corruption.
        </p>

        {backupMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{backupMessage}</span>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Backup File</th>
                <th>File Size</th>
                <th>Snapshot Created At</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-500 text-xs">
                    No database snapshots found. Click "Create Safe Snapshot Now" above.
                  </td>
                </tr>
              ) : (
                backups.map((b, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs text-slate-200">{b.filename}</td>
                    <td className="text-xs text-slate-400">{b.size_mb} MB</td>
                    <td className="text-xs text-slate-400">{new Date(b.created).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
