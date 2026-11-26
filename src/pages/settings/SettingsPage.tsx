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
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

export const SettingsPage: React.FC = () => {
  const { company, updateCompany } = useBusiness();

  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    logo_path: '',
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({ ...prev, logo_path: event.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Backup state
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        logo_path: company.logo_path || '',
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
          {/* Business Logo Field */}
          <div className="p-4 rounded-xl bg-[#14141c] border border-[#272736] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#3a3a4a] bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {formData.logo_path ? (
                  <img src={formData.logo_path} alt="Business Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={26} className="text-zinc-500" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Store Logo Image</span>
                  <span className="text-[10px] text-orange-400 font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    Printed on Bills & Receipts
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Your official logo is printed at the top of customer invoices and POS receipts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload size={14} />
                <span>{formData.logo_path ? 'Change Logo' : 'Upload Logo'}</span>
              </button>
              {formData.logo_path && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, logo_path: '' }))}
                  className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:text-red-300 cursor-pointer"
                  title="Remove Logo"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

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
          The Cronus utilizes SQLite with Write-Ahead Logging (WAL). Creating a snapshot executes an online
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
