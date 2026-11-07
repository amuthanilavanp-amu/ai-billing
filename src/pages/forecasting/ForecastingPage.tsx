import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import apiClient from '../../api/client';
import { ReplenishmentRecommendation } from '../../types';

export const ForecastingPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<ReplenishmentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductForecast, setSelectedProductForecast] = useState<any | null>(null);
  const [loadingForecastId, setLoadingForecastId] = useState<number | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/forecasting/replenishment');
      setRecommendations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const viewForecastDetail = async (productId: number) => {
    setLoadingForecastId(productId);
    try {
      const res = await apiClient.get(`/forecasting/forecast/${productId}`);
      setSelectedProductForecast(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForecastId(null);
    }
  };

  const urgentReorders = recommendations.filter((r) => r.recommendation === 'reorder_now');
  const soonReorders = recommendations.filter((r) => r.recommendation === 'reorder_soon');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-orange-500" />
          AI Replenishment & Demand Forecasting
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Predictive reorder recommendations calculated from 30-day historical consumption velocity and lead time.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Urgent Reorders</span>
          <span className="stat-value text-red-400">{urgentReorders.length}</span>
          <span className="stat-change text-red-500">Stockout or critical threshold reached</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Reorder Soon (7-14 Days)</span>
          <span className="stat-value text-amber-400">{soonReorders.length}</span>
          <span className="stat-change text-amber-500">Plan purchase orders with suppliers</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Products Analyzed</span>
          <span className="stat-value text-orange-400">{recommendations.length}</span>
          <span className="stat-change">Active inventory items tracked</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Prediction Method</span>
          <span className="stat-value text-slate-200 text-lg">Statistical EMA</span>
          <span className="stat-change">Exponential Moving Average + Velocity</span>
        </div>
      </div>

      {/* Main Replenishment Advice Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Suggested Replenishment Orders</h2>
          <span className="text-xs text-slate-400">Sorted by urgency level</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Computing sales velocity and reorder levels...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="empty-state">
            <TrendingUp />
            <h3>No inventory items</h3>
            <p>Add products to your catalogue and complete sales to generate replenishment forecasts.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-center">Current Stock</th>
                <th className="text-center">Daily Sales Velocity</th>
                <th className="text-center">Days of Stock Left</th>
                <th className="text-center">Suggested Order</th>
                <th className="text-center">Urgency Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((r) => {
                const isNow = r.recommendation === 'reorder_now';
                const isSoon = r.recommendation === 'reorder_soon';

                return (
                  <tr key={r.product_id}>
                    <td>
                      <div className="font-semibold text-slate-200 text-xs">{r.product_name}</div>
                      <div className="text-[10px] text-slate-500">
                        {r.total_sold_30d} {r.unit} sold in last 30 days
                      </div>
                    </td>
                    <td className="text-center text-xs font-semibold text-white">
                      {r.current_stock} {r.unit}
                    </td>
                    <td className="text-center text-xs text-slate-300">
                      {r.daily_velocity} {r.unit}/day
                    </td>
                    <td className="text-center">
                      {r.days_of_stock !== null && r.days_of_stock !== undefined ? (
                        <span
                          className={`badge ${
                            r.days_of_stock <= 3
                              ? 'badge-red'
                              : r.days_of_stock <= 7
                              ? 'badge-yellow'
                              : 'badge-green'
                          }`}
                        >
                          {r.days_of_stock} days
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="font-bold text-orange-400 text-xs">
                        +{r.suggested_order_qty} {r.unit}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge ${
                          isNow ? 'badge-red' : isSoon ? 'badge-yellow' : 'badge-green'
                        }`}
                      >
                        {isNow ? 'REORDER NOW' : isSoon ? 'REORDER SOON' : 'HEALTHY'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => viewForecastDetail(r.product_id)}
                        disabled={loadingForecastId === r.product_id}
                        className="btn btn-secondary btn-sm text-xs"
                      >
                        {loadingForecastId === r.product_id ? (
                          <span className="loading-spinner" />
                        ) : (
                          'View Forecast'
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Forecast Detail Modal */}
      {selectedProductForecast && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-lg">
            <div className="card-header">
              <div>
                <h3 className="font-bold text-white text-base">Demand Forecast Model</h3>
                <p className="text-xs text-slate-400">{selectedProductForecast.product_name}</p>
              </div>
              <button
                onClick={() => setSelectedProductForecast(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedProductForecast.has_sufficient_data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      Expected 30-Day Demand
                    </span>
                    <div className="text-lg font-bold text-orange-400 mt-1">
                      {selectedProductForecast.horizon_forecast} {selectedProductForecast.unit}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      Confidence Interval
                    </span>
                    <div className="text-sm font-semibold text-slate-200 mt-1">
                      {selectedProductForecast.lower_bound} – {selectedProductForecast.upper_bound}{' '}
                      {selectedProductForecast.unit}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Stock:</span>
                    <span className="font-semibold text-white">
                      {selectedProductForecast.current_stock} {selectedProductForecast.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daily Demand Run-rate:</span>
                    <span>
                      {selectedProductForecast.daily_forecast} {selectedProductForecast.unit}/day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stock Coverage:</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedProductForecast.stock_covers_days} days
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-orange-950/20 border border-orange-500/30 rounded-lg text-xs text-orange-300 flex items-start gap-2">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{selectedProductForecast.disclaimer}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400">
                <AlertTriangle size={32} className="text-amber-400 mx-auto mb-2" />
                <p className="text-xs">{selectedProductForecast.message}</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedProductForecast(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
