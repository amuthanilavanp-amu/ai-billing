import React, { useState, useEffect } from 'react';
import { FileBarChart, Printer, Download, Calendar, Info, ShieldCheck } from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

export const ReportsPage: React.FC = () => {
  const { company } = useBusiness();

  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [gstData, setGstData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGstSummary = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/analytics/gst-summary', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      setGstData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGstSummary();
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="text-orange-500" />
            Tax Compliance & Business Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            GSTR-1 assistance, tax schedule breakdowns, and sales auditing reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-orange-400" />
          <span className="text-xs font-semibold text-slate-300">Reporting Period:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 text-xs"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 text-xs"
          />
        </div>

        <div className="text-xs text-slate-400">
          Entity GSTIN: <strong className="text-white">{company?.gstin || 'UNREGISTERED'}</strong>
        </div>
      </div>

      {/* GST Schedule Breakdown */}
      {gstData && (
        <div className="space-y-6">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Gross Sales (Total Invoiced)</span>
              <span className="stat-value text-white">
                ₹{gstData.gross_sales.toLocaleString('en-IN')}
              </span>
              <span className="stat-change">Includes all taxes & round-off</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Net Taxable Value</span>
              <span className="stat-value text-slate-200">
                ₹{gstData.taxable_amount.toLocaleString('en-IN')}
              </span>
              <span className="stat-change">Total base value of goods/services</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Total GST Collected</span>
              <span className="stat-value text-emerald-400">
                ₹{gstData.total_tax_collected.toLocaleString('en-IN')}
              </span>
              <span className="stat-change text-emerald-500">Output tax liability</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-bold text-white">Tax Component Summary (CGST / SGST / IGST)</h2>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Tax Component</th>
                  <th>Classification</th>
                  <th className="text-right">Tax Collected (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-xs text-slate-200">Central GST (CGST)</td>
                  <td className="text-xs text-slate-400">Intra-State Supply (50% share)</td>
                  <td className="text-right font-mono text-xs font-bold text-white">
                    ₹{gstData.cgst.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-xs text-slate-200">State GST (SGST)</td>
                  <td className="text-xs text-slate-400">Intra-State Supply (50% share)</td>
                  <td className="text-right font-mono text-xs font-bold text-white">
                    ₹{gstData.sgst.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-xs text-slate-200">Integrated GST (IGST)</td>
                  <td className="text-xs text-slate-400">Inter-State Supply (100% share)</td>
                  <td className="text-right font-mono text-xs font-bold text-white">
                    ₹{gstData.igst.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-slate-800/40 font-bold">
                  <td className="text-white text-xs">Total Tax Collected</td>
                  <td></td>
                  <td className="text-right font-mono text-xs text-emerald-400">
                    ₹{gstData.total_tax_collected.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 p-3 rounded-lg bg-orange-950/20 border border-orange-500/30 text-xs text-orange-300 flex items-start gap-2">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Statutory Notice:</strong> {gstData.note} SmartBiz AI computes taxes strictly from the
                rates assigned to line items. It does not replace the professional advice of a Chartered
                Accountant.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
