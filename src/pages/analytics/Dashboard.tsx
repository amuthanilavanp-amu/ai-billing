import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ReceiptText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PackageCheck,
  Calendar,
  Clock,
  PieChart,
  BarChart3,
  Users,
  Wallet,
  CreditCard,
  Layers,
  AlertOctagon,
  Percent,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Printer,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

type TabType = 'overview' | 'top_products' | 'velocity_rush' | 'categories_payments' | 'customers' | 'dead_stock';

export const Dashboard: React.FC = () => {
  const { company } = useBusiness();

  // Active view tab & date preset
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [preset, setPreset] = useState<string>('this_month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [topSortBy, setTopSortBy] = useState<'volume' | 'revenue' | 'profit'>('revenue');

  // Analytical data states
  const [summary, setSummary] = useState<any | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any | null>(null);
  const [velocityData, setVelocityData] = useState<any | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
  const [customerInsights, setCustomerInsights] = useState<any | null>(null);
  const [gstSummary, setGstSummary] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAllAnalytics = async (selectedPreset = preset, fromDate?: string, toDate?: string) => {
    setIsRefreshing(true);
    try {
      const params: Record<string, any> = {};
      if (selectedPreset === 'custom' && fromDate && toDate) {
        params.date_from = fromDate;
        params.date_to = toDate;
      } else {
        params.preset = selectedPreset;
      }

      const [
        sumRes,
        trendRes,
        topRes,
        velRes,
        catRes,
        payRes,
        hourRes,
        custRes,
        gstRes,
      ] = await Promise.all([
        apiClient.get('/analytics/dashboard', { params }),
        apiClient.get('/analytics/sales-trend', { params: { ...params, days: 14 } }),
        apiClient.get('/analytics/top-products', { params: { ...params, limit: 15 } }),
        apiClient.get('/analytics/product-velocity', { params }),
        apiClient.get('/analytics/category-breakdown', { params }),
        apiClient.get('/analytics/payment-breakdown', { params }),
        apiClient.get('/analytics/hourly-distribution', { params }),
        apiClient.get('/analytics/customer-insights', { params: { ...params, limit: 10 } }),
        apiClient.get('/analytics/gst-summary', { params }),
      ]);

      setSummary(sumRes.data);
      setTrend(trendRes.data || []);
      setTopProductsData(topRes.data);
      setVelocityData(velRes.data);
      setCategoryBreakdown(catRes.data || []);
      setPaymentBreakdown(payRes.data || []);
      setHourlyDistribution(hourRes.data || []);
      setCustomerInsights(custRes.data);
      setGstSummary(gstRes.data);
    } catch (err) {
      console.error('Failed to load business intelligence data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics(preset);
  }, [preset]);

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      loadAllAnalytics(newPreset);
    }
  };

  const handleApplyCustomDates = () => {
    if (customFrom && customTo) {
      setPreset('custom');
      loadAllAnalytics('custom', customFrom, customTo);
    }
  };

  const maxSale = Math.max(...trend.map((t) => t.total_sales), 1);
  const maxHourlySale = Math.max(...hourlyDistribution.map((h) => h.total_sales), 1);

  // Selected top products list based on volume/revenue/profit
  const currentTopList =
    topSortBy === 'volume'
      ? topProductsData?.by_volume || []
      : topSortBy === 'profit'
      ? topProductsData?.by_profit || []
      : topProductsData?.by_revenue || [];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#272733]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <LayoutDashboard size={22} />
              </span>
              Business Intelligence & Analytics
            </h1>
            <span className="badge badge-orange text-[10px] uppercase font-bold tracking-wider">
              Real-Time OLAP
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            Deep financial metrics, product sales velocity, peak hours, and customer intelligence for{' '}
            <strong className="text-white font-semibold">{company?.name || 'Your Business'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadAllAnalytics(preset)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-orange-400' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <a href="/billing" className="btn btn-primary btn-sm flex items-center gap-1.5">
            <ReceiptText size={15} />
            <span>Open POS Terminal</span>
          </a>
        </div>
      </div>

      {/* ─── Date Range Preset Filter Bar ─── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3 bg-[#121217] border-[#272733]">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Calendar size={14} className="text-orange-500" />
            Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all_time', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePresetChange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                preset === item.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-[#181820] text-zinc-400 hover:text-white hover:bg-[#20202b]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-[#181820] border-[#292936] text-white text-xs px-2.5 py-1 rounded"
          />
          <span className="text-zinc-500">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-[#181820] border-[#292936] text-white text-xs px-2.5 py-1 rounded"
          />
          <button
            onClick={handleApplyCustomDates}
            disabled={!customFrom || !customTo}
            className="btn btn-secondary btn-sm text-xs py-1 px-3"
          >
            Apply
          </button>
        </div>
      </div>

      {/* ─── Executive KPI Cards: Revenue, Gross & Net Margins ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Gross Sales</span>
            <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <DollarSign size={18} />
            </span>
          </div>
          <span className="stat-value text-white text-2xl font-black mt-2">
            ₹{summary ? summary.sales?.total_sales?.toLocaleString('en-IN') : '0.00'}
          </span>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 pt-2 border-t border-[#20202c]">
            <span>{summary?.sales?.invoice_count || 0} Bills Generated</span>
            <span className="text-orange-400 font-semibold">
              Avg: ₹{summary ? summary.sales?.average_invoice?.toLocaleString('en-IN') : '0'}
            </span>
          </div>
        </div>

        {/* Card 2: Gross Profit & Margin % */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Gross Margin / Profit</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="stat-value text-emerald-400 text-2xl font-black">
              ₹{summary ? summary.profitability?.gross_profit?.toLocaleString('en-IN') : '0.00'}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {summary ? summary.profitability?.gross_margin_percent : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 pt-2 border-t border-[#20202c]">
            <span>Estimated COGS:</span>
            <span className="text-zinc-300 font-mono font-medium">
              ₹{summary ? summary.profitability?.estimated_cogs?.toLocaleString('en-IN') : '0'}
            </span>
          </div>
        </div>

        {/* Card 3: Net Profit After Expenses */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Net Operating Profit</span>
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Percent size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="stat-value text-cyan-400 text-2xl font-black">
              ₹{summary ? summary.profitability?.net_profit?.toLocaleString('en-IN') : '0.00'}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              {summary ? summary.profitability?.net_margin_percent : 0}% Net
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 pt-2 border-t border-[#20202c]">
            <span>Operating Expenses:</span>
            <span className="text-red-400 font-mono font-medium">
              -₹{summary ? summary.profitability?.expenses?.toLocaleString('en-IN') : '0'}
            </span>
          </div>
        </div>

        {/* Card 4: Units Sold & Basket Size */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Products Sold & Volume</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ShoppingBag size={18} />
            </span>
          </div>
          <span className="stat-value text-purple-400 text-2xl font-black mt-2">
            {summary ? summary.sales?.total_units_sold?.toLocaleString('en-IN') : '0'}
            <span className="text-xs text-zinc-400 font-normal ml-1.5">units</span>
          </span>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 pt-2 border-t border-[#20202c]">
            <span>Items per Bill:</span>
            <span className="text-zinc-200 font-bold">
              {summary?.sales?.avg_units_per_bill || 0} items/ticket
            </span>
          </div>
        </div>
      </div>

      {/* ─── Secondary Metrics Row: Today's Velocity, GST & Outstanding ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Velocity & Growth */}
        <div className="card p-4 flex items-center justify-between bg-[#14141a]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Today's Performance
            </span>
            <div className="text-lg font-black text-white mt-1">
              ₹{summary ? summary.today?.total_sales?.toLocaleString('en-IN') : '0.00'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {summary?.today?.invoice_count || 0} bills today
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                (summary?.today?.growth_percent || 0) >= 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {(summary?.today?.growth_percent || 0) >= 0 ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {summary?.today?.growth_percent || 0}%
            </span>
            <div className="text-[10px] text-zinc-500 mt-1">vs Yesterday</div>
          </div>
        </div>

        {/* GST Liability */}
        <div className="card p-4 flex items-center justify-between bg-[#14141a]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Tax Collected (CGST+SGST)
            </span>
            <div className="text-lg font-black text-orange-400 mt-1">
              ₹{summary ? summary.sales?.total_tax?.toLocaleString('en-IN') : '0.00'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              CGST: ₹{summary?.sales?.cgst || 0} | SGST: ₹{summary?.sales?.sgst || 0}
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <ReceiptText size={20} />
          </span>
        </div>

        {/* Outstanding Receivables / Khata */}
        <div className="card p-4 flex items-center justify-between bg-[#14141a]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Uncollected Khata / Credit
            </span>
            <div className="text-lg font-black text-amber-400 mt-1">
              ₹{summary ? summary.outstanding?.toLocaleString('en-IN') : '0.00'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Pending customer credit balances</div>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet size={20} />
          </span>
        </div>
      </div>

      {/* ─── Multi-View Analytical Tab Bar ─── */}
      <div className="flex border-b border-[#272733] gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Sales Velocity & Rush Hours', icon: TrendingUp },
          { id: 'top_products', label: 'Most Sold & Top Products', icon: PackageCheck },
          { id: 'categories_payments', label: 'Categories & Payment Modes', icon: Layers },
          { id: 'customers', label: 'Customer Intelligence', icon: Users },
          { id: 'dead_stock', label: `Dead Stock & Locked Capital (${velocityData?.dead_stock_count || 0})`, icon: AlertOctagon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-orange-500 text-white bg-orange-500/10 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#16161f]'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-orange-500' : 'text-zinc-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & RUSH HOURS ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 14-Day Sales Velocity Chart */}
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 size={18} className="text-orange-500" />
                    Daily Sales Velocity & Revenue (₹)
                  </h2>
                  <p className="text-xs text-zinc-400">Day-by-day gross revenue and invoice count</p>
                </div>
              </div>

              <div className="h-64 flex items-end gap-2 pt-8 pb-2 px-2">
                {trend.map((day, i) => {
                  const heightPct = Math.round((day.total_sales / maxSale) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="opacity-0 group-hover:opacity-100 transition text-[10px] text-orange-400 font-bold whitespace-nowrap bg-[#181820] px-1.5 py-0.5 rounded border border-[#272733] shadow">
                        ₹{day.total_sales.toLocaleString('en-IN')}
                      </div>
                      <div
                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                        className="w-full bg-gradient-to-t from-orange-600/70 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-t transition-all cursor-pointer relative"
                        title={`${day.date}: ₹${day.total_sales} (${day.invoice_count} bills)`}
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {day.formatted_date || day.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Rush Hours Breakdown */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-orange-500" />
                    Peak Rush Hours
                  </h2>
                  <p className="text-xs text-zinc-400">Hourly store traffic heatmap</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {hourlyDistribution.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10">No hourly sales data recorded.</p>
                ) : (
                  hourlyDistribution.map((h, idx) => {
                    const barWidth = Math.round((h.total_sales / maxHourlySale) * 100);
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg transition ${
                          h.is_peak
                            ? 'bg-orange-500/15 border border-orange-500/40 text-white font-bold'
                            : 'bg-[#181820] border border-[#252533]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                            {h.label}
                            {h.is_peak && (
                              <span className="badge badge-orange text-[9px] py-0">🔥 Peak Rush</span>
                            )}
                          </span>
                          <span className="font-bold text-orange-400">
                            ₹{h.total_sales.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-[#0d0d12] rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(barWidth, 3)}%` }}
                            className={`h-full rounded-full ${
                              h.is_peak ? 'bg-orange-500' : 'bg-zinc-600'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Preview of Top 5 Items & Top Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Products Quick Snapshot */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PackageCheck size={16} className="text-orange-500" />
                  Top Selling Products
                </h3>
                <button
                  onClick={() => setActiveTab('top_products')}
                  className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  View All Detailed <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                {(topProductsData?.by_revenue || []).slice(0, 5).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#181820] border border-[#252533]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-orange-500/20 text-orange-400 text-xs font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-zinc-400">
                          {p.total_qty} {p.unit} sold • Avg ₹{p.average_price}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        ₹{p.total_revenue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        {p.revenue_share_percent}% of sales
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GST Slabs Summary Snapshot */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Percent size={16} className="text-orange-500" />
                  GST Slabs Breakdown
                </h3>
                <span className="text-xs text-zinc-400 font-mono">Tax Collections</span>
              </div>

              <div className="space-y-2.5">
                {(gstSummary?.slabs || []).length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">No tax collected in this period.</p>
                ) : (
                  (gstSummary?.slabs || []).map((slab: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#181820] border border-[#252533]"
                    >
                      <div>
                        <span className="text-xs font-bold text-white">{slab.label}</span>
                        <div className="text-[10px] text-zinc-400">
                          Taxable: ₹{slab.taxable_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-orange-400">
                          ₹{slab.tax_amount.toLocaleString('en-IN')}
                        </span>
                        <div className="text-[10px] text-zinc-400">Tax Collected</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MOST SOLD & TOP PRODUCTS (DETAILED) ─── */}
      {activeTab === 'top_products' && (
        <div className="space-y-4">
          <div className="card">
            {/* Filter controls between Volume, Revenue, and Margin */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#272733]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PackageCheck size={18} className="text-orange-500" />
                  Product Sales Analysis & Ranking
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Analyze products by units sold (volume), total revenue, or gross profit contribution.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#181820] rounded-xl border border-[#272733]">
                <button
                  onClick={() => setTopSortBy('revenue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    topSortBy === 'revenue'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  By Revenue (₹)
                </button>
                <button
                  onClick={() => setTopSortBy('volume')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    topSortBy === 'volume'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  By Volume (Units Sold)
                </button>
                <button
                  onClick={() => setTopSortBy('profit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    topSortBy === 'profit'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  By Gross Profit (₹)
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto mt-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">Rank</th>
                    <th>Product / Item Name</th>
                    <th>SKU Code</th>
                    <th className="text-right">Units Sold</th>
                    <th className="text-right">Average Price</th>
                    <th className="text-right">Gross Revenue</th>
                    <th className="text-right">Gross Profit</th>
                    <th className="text-center">Margin %</th>
                    <th className="w-32 text-right">Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTopList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-zinc-500 text-xs">
                        No sales recorded for the selected period.
                      </td>
                    </tr>
                  ) : (
                    currentTopList.map((item: any) => (
                      <tr key={item.rank} className="hover:bg-[#1a1a24] transition">
                        <td>
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                              item.rank === 1
                                ? 'bg-amber-500 text-black shadow-md'
                                : item.rank === 2
                                ? 'bg-slate-300 text-black'
                                : item.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-[#20202c] text-zinc-400'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-white text-sm">{item.name}</div>
                        </td>
                        <td className="text-xs text-zinc-400 font-mono">{item.sku}</td>
                        <td className="text-right font-bold text-white">
                          {item.total_qty.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-zinc-400 font-normal">{item.unit}</span>
                        </td>
                        <td className="text-right text-xs text-zinc-300 font-mono">
                          ₹{item.average_price.toFixed(2)}
                        </td>
                        <td className="text-right font-black text-emerald-400 font-mono text-sm">
                          ₹{item.total_revenue.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right font-bold text-cyan-400 font-mono text-xs">
                          ₹{item.gross_profit.toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge text-[10px] font-bold ${
                              item.margin_percent >= 30
                                ? 'badge-green'
                                : item.margin_percent >= 15
                                ? 'badge-yellow'
                                : 'badge-red'
                            }`}
                          >
                            {item.margin_percent}%
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-semibold text-zinc-300">
                              {item.revenue_share_percent}%
                            </span>
                            <div className="w-16 bg-[#20202c] rounded-full h-1.5 overflow-hidden">
                              <div
                                style={{ width: `${Math.min(item.revenue_share_percent * 2, 100)}%` }}
                                className="h-full bg-orange-500 rounded-full"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: CATEGORIES & PAYMENT MODES ─── */}
      {activeTab === 'categories_payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Sales Breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-orange-500" />
                  Category Sales Distribution
                </h2>
                <p className="text-xs text-zinc-400">Revenue and volume by product department</p>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-10">No category sales recorded.</p>
              ) : (
                categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#181820] border border-[#272733]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white text-sm">{cat.category}</span>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 font-mono text-sm">
                          ₹{cat.total_sales.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-zinc-400 ml-2">({cat.percentage_share}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#0d0d12] rounded-full h-2 overflow-hidden mb-2">
                      <div
                        style={{ width: `${cat.percentage_share}%` }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{cat.item_count} distinct items</span>
                      <span>{cat.units_sold.toLocaleString('en-IN')} units sold</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-orange-500" />
                  Payment Method Breakdown
                </h2>
                <p className="text-xs text-zinc-400">Cash vs UPI vs Card vs Credit (Khata)</p>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              {paymentBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-10">No payment data available.</p>
              ) : (
                paymentBreakdown.map((pay, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#181820] border border-[#272733]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        {pay.method === 'cash' ? (
                          <Wallet size={16} className="text-emerald-400" />
                        ) : pay.method === 'upi' ? (
                          <Sparkles size={16} className="text-orange-400" />
                        ) : pay.method === 'card' ? (
                          <CreditCard size={16} className="text-cyan-400" />
                        ) : (
                          <ReceiptText size={16} className="text-amber-400" />
                        )}
                        {pay.label}
                      </span>
                      <div className="text-right">
                        <span className="font-black text-white font-mono text-sm">
                          ₹{pay.total_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-zinc-400 ml-2">({pay.percentage_share}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-[#0d0d12] rounded-full h-2 overflow-hidden mb-2">
                      <div
                        style={{ width: `${pay.percentage_share}%` }}
                        className={`h-full rounded-full ${
                          pay.method === 'cash'
                            ? 'bg-emerald-500'
                            : pay.method === 'upi'
                            ? 'bg-orange-500'
                            : pay.method === 'card'
                            ? 'bg-cyan-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{pay.invoice_count} transactions</span>
                      <span className="font-medium text-zinc-300">
                        Avg Ticket: ₹
                        {pay.invoice_count > 0
                          ? Math.round(pay.total_amount / pay.invoice_count).toLocaleString('en-IN')
                          : 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CUSTOMER INTELLIGENCE ─── */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Customer Split Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-[#14141a]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Walk-In Customers
                  </span>
                  <div className="text-xl font-black text-white mt-1">
                    ₹{customerInsights?.walkin_vs_registered?.walkin?.sales?.toLocaleString('en-IN') || '0'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {customerInsights?.walkin_vs_registered?.walkin?.count || 0} Invoices (
                    {customerInsights?.walkin_vs_registered?.walkin?.percentage || 0}% of sales)
                  </div>
                </div>
                <span className="p-3 rounded-xl bg-zinc-800 text-zinc-300">
                  <ShoppingBag size={24} />
                </span>
              </div>
            </div>

            <div className="card bg-[#14141a]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Registered & Repeat Customers
                  </span>
                  <div className="text-xl font-black text-orange-400 mt-1">
                    ₹{customerInsights?.walkin_vs_registered?.registered?.sales?.toLocaleString('en-IN') || '0'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {customerInsights?.walkin_vs_registered?.registered?.count || 0} Invoices (
                    {customerInsights?.walkin_vs_registered?.registered?.percentage || 0}% of sales)
                  </div>
                </div>
                <span className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Users size={24} />
                </span>
              </div>
            </div>
          </div>

          {/* Top 10 Spending Customers Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users size={18} className="text-orange-500" />
                  Top Spending Customers
                </h2>
                <p className="text-xs text-zinc-400">High-value repeat clients and purchase history</p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">Rank</th>
                    <th>Customer Name</th>
                    <th>Phone Contact</th>
                    <th className="text-center">Total Invoices</th>
                    <th className="text-right">Average Bill</th>
                    <th className="text-right">Total Lifetime Spent</th>
                    <th className="text-right">Pending Balance (Khata)</th>
                  </tr>
                </thead>
                <tbody>
                  {(customerInsights?.top_customers || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-500 text-xs">
                        No registered customer sales in this period.
                      </td>
                    </tr>
                  ) : (
                    (customerInsights?.top_customers || []).map((c: any, idx: number) => (
                      <tr key={c.id} className="hover:bg-[#1a1a24] transition">
                        <td>
                          <span className="w-6 h-6 rounded-md bg-[#20202c] text-zinc-300 text-xs font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-white text-sm">{c.name}</div>
                        </td>
                        <td className="text-xs text-zinc-400 font-mono">{c.phone}</td>
                        <td className="text-center font-bold text-white">{c.invoice_count}</td>
                        <td className="text-right text-xs text-zinc-300 font-mono">
                          ₹{c.average_bill.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right font-black text-emerald-400 font-mono text-sm">
                          ₹{c.total_spent.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right">
                          <span
                            className={`font-mono text-xs font-bold ${
                              c.outstanding_balance > 0 ? 'text-amber-400' : 'text-zinc-500'
                            }`}
                          >
                            ₹{c.outstanding_balance.toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: DEAD STOCK & LOCKED WORKING CAPITAL ─── */}
      {activeTab === 'dead_stock' && (
        <div className="space-y-4">
          {/* Capital Warning Banner */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-red-500/20 text-red-400 mt-0.5">
                <AlertOctagon size={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Dead Stock Warning — Non-Moving Inventory Detected
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                  These products have physical stock on hand but have recorded <strong>0 sales</strong> during
                  this period. This ties up your business working capital. Consider promotional bundles, price
                  clearances, or returns to suppliers.
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                Total Capital Blocked
              </span>
              <div className="text-xl font-black text-red-400 mt-0.5">
                ₹{velocityData?.total_capital_blocked?.toLocaleString('en-IN') || '0.00'}
              </div>
            </div>
          </div>

          {/* Dead Stock Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                Dead Stock Inventory Register ({velocityData?.dead_stock_count || 0} Items)
              </h2>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>SKU Code</th>
                    <th className="text-right">Stock On Hand</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Tied-Up Working Capital</th>
                    <th>Action Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {(velocityData?.dead_stock || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-emerald-400 text-xs">
                        ✓ Excellent! No dead stock detected in this period. All products are moving.
                      </td>
                    </tr>
                  ) : (
                    (velocityData?.dead_stock || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#1a1a24] transition">
                        <td>
                          <div className="font-bold text-white text-sm">{item.name}</div>
                        </td>
                        <td>
                          <span className="badge badge-gray text-[10px]">{item.category}</span>
                        </td>
                        <td className="text-xs text-zinc-400 font-mono">{item.sku}</td>
                        <td className="text-right font-bold text-white">
                          {item.current_stock} <span className="text-[10px] text-zinc-400">{item.unit}</span>
                        </td>
                        <td className="text-right text-xs text-zinc-300 font-mono">
                          ₹{item.unit_cost.toFixed(2)}
                        </td>
                        <td className="text-right font-black text-red-400 font-mono text-sm">
                          ₹{item.blocked_capital.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className="text-xs text-amber-300 font-medium">
                            {item.recommendation}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
