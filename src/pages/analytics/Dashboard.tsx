import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ReceiptText,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  PackageCheck,
  Calendar,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

export const Dashboard: React.FC = () => {
  const { company } = useBusiness();

  const [summary, setSummary] = useState<any | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [sumRes, trendRes, topRes] = await Promise.all([
          apiClient.get('/analytics/dashboard'),
          apiClient.get('/analytics/sales-trend', { params: { days: 14 } }),
          apiClient.get('/analytics/top-products', { params: { limit: 5 } }),
        ]);
        setSummary(sumRes.data);
        setTrend(trendRes.data);
        setTopProducts(topRes.data);
      } catch (e) {
        console.error('Error loading analytics:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const maxSale = Math.max(...trend.map((t) => t.total_sales), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-orange-500" />
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time business performance for{' '}
            <strong className="text-slate-200">{company?.name || 'Your Business'}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <a href="/billing" className="btn btn-primary btn-sm flex items-center gap-1.5">
            <ReceiptText size={15} />
            <span>Open POS Terminal</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Today's Sales</span>
          <span className="stat-value text-emerald-400">
            ₹{summary ? summary.today?.total_sales?.toLocaleString('en-IN') : '0.00'}
          </span>
          <span className="stat-change text-slate-400">
            {summary?.today?.invoice_count || 0} bills generated today
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">This Month Revenue</span>
          <span className="stat-value text-white">
            ₹{summary ? summary.sales?.total_sales?.toLocaleString('en-IN') : '0.00'}
          </span>
          <span className="stat-change text-slate-400">
            {summary?.sales?.invoice_count || 0} total invoices
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Outstanding Receivables</span>
          <span className="stat-value text-amber-400">
            ₹{summary ? summary.outstanding?.toLocaleString('en-IN') : '0.00'}
          </span>
          <span className="stat-change text-amber-500">Uncollected credit balances</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">GST Collected (MTD)</span>
          <span className="stat-value text-orange-400">
            ₹{summary ? summary.sales?.total_tax?.toLocaleString('en-IN') : '0.00'}
          </span>
          <span className="stat-change text-slate-400">CGST + SGST + IGST liability</span>
        </div>
      </div>

      {/* Charts & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Bar Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="text-sm font-bold text-white">14-Day Sales Velocity (₹)</h2>
              <p className="text-xs text-slate-400">Daily gross invoice revenue</p>
            </div>
          </div>

          <div className="h-56 flex items-end gap-2 pt-6 pb-2 px-2">
            {trend.map((day, i) => {
              const heightPct = Math.round((day.total_sales / maxSale) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition text-[10px] text-orange-400 font-bold whitespace-nowrap">
                    ₹{day.total_sales}
                  </div>
                  <div
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    className="w-full bg-orange-500/40 hover:bg-orange-500 rounded-t transition-all"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    {day.date.split('-').slice(1).join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best Selling Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-bold text-white">Top Revenue Items</h2>
            <span className="text-xs text-slate-400">This Month</span>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No invoice sales recorded yet.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-semibold text-slate-200 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.total_qty} units sold</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-emerald-400">
                      ₹{p.total_revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
