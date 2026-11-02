import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';
import { Product } from '../../types';

export const ProductList: React.FC = () => {
  const { company } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    sku: '',
    unit: 'Pcs',
    selling_price: '0',
    purchase_price: '0',
    gst_rate: '0',
    hsn_sac_code: '',
    opening_stock: '0',
    reorder_level: '5',
    track_inventory: true,
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/products', {
        params: { search: search || undefined, page, page_size: 50 },
      });
      setProducts(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      sku: '',
      unit: 'Pcs',
      selling_price: '0',
      purchase_price: '0',
      gst_rate: '0',
      hsn_sac_code: '',
      opening_stock: '0',
      reorder_level: '5',
      track_inventory: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      barcode: p.barcode || '',
      sku: p.sku || '',
      unit: p.unit || 'Pcs',
      selling_price: p.selling_price.toString(),
      purchase_price: p.purchase_price ? p.purchase_price.toString() : '0',
      gst_rate: p.gst_rate.toString(),
      hsn_sac_code: p.hsn_sac_code || '',
      opening_stock: p.opening_stock ? p.opening_stock.toString() : '0',
      reorder_level: p.reorder_level ? p.reorder_level.toString() : '5',
      track_inventory: p.track_inventory,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Product Name is required.');
      return;
    }

    const payload = {
      name: formData.name,
      barcode: formData.barcode.trim() || undefined,
      sku: formData.sku.trim() || undefined,
      unit: formData.unit,
      selling_price: parseFloat(formData.selling_price) || 0,
      purchase_price: parseFloat(formData.purchase_price) || undefined,
      gst_rate: parseFloat(formData.gst_rate) || 0,
      hsn_sac_code: formData.hsn_sac_code.trim() || undefined,
      opening_stock: parseFloat(formData.opening_stock) || 0,
      reorder_level: parseFloat(formData.reorder_level) || 0,
      track_inventory: formData.track_inventory,
    };

    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert('Save failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to discontinue this product?')) return;
    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="text-blue-400" />
            Products & Inventory Master
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Total of <span className="text-blue-400 font-semibold">{total}</span> items registered in business
            catalogue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a href="/bulk-import" className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <FileSpreadsheet size={15} />
            <span>Bulk Import / Export</span>
          </a>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm flex items-center gap-1.5">
            <Plus size={15} />
            <span>Add Single Product</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="search-bar flex-1 max-w-md">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package />
            <h3>No products found</h3>
            <p className="mb-4">You have not added any products yet, or no items match your search.</p>
            <div className="flex gap-2">
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                Add Product
              </button>
              <a href="/catalogue" className="btn btn-secondary btn-sm">
                Browse Starter Catalogue
              </a>
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode / SKU</th>
                <th>Unit</th>
                <th className="text-right">Sale Price</th>
                <th className="text-right">Cost Price</th>
                <th className="text-center">GST Rate</th>
                <th className="text-center">Current Stock</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.track_inventory && p.current_stock <= p.reorder_level && p.reorder_level > 0;
                const isOut = p.track_inventory && p.current_stock <= 0;

                return (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold text-slate-200 text-sm">{p.name}</div>
                      {p.category_name && (
                        <div className="text-[10px] text-slate-500">{p.category_name}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-xs text-slate-300 font-mono flex items-center gap-1">
                        {p.barcode ? (
                          <>
                            <Barcode size={14} className="text-slate-500" />
                            <span>{p.barcode}</span>
                          </>
                        ) : p.sku ? (
                          <span>{p.sku}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs text-slate-400">{p.unit}</td>
                    <td className="text-right text-xs font-semibold text-white">
                      ₹{p.selling_price.toFixed(2)}
                    </td>
                    <td className="text-right text-xs text-slate-400">
                      {p.purchase_price ? `₹${p.purchase_price.toFixed(2)}` : '—'}
                    </td>
                    <td className="text-center">
                      <span className="badge badge-gray text-xs">{p.gst_rate}%</span>
                    </td>
                    <td className="text-center">
                      {p.track_inventory ? (
                        <span
                          className={`badge ${
                            isOut ? 'badge-red' : isLow ? 'badge-yellow' : 'badge-green'
                          }`}
                        >
                          {p.current_stock} {p.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Service</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge ${
                          p.status === 'active' ? 'badge-blue' : 'badge-gray'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-slate-400 hover:text-blue-400 rounded"
                          title="Edit Product"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-red-400 rounded"
                          title="Discontinue"
                        >
                          <Trash2 size={15} />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-xl">
            <div className="card-header">
              <h2 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Masala Chai, Basmati Rice 1Kg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or enter code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Internal SKU"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Plate">Plate</option>
                    <option value="Cup">Cup</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Gm">Gm (Grams)</option>
                    <option value="Ltr">Ltr (Liters)</option>
                    <option value="Ml">Ml (Milliliters)</option>
                    <option value="Box">Box</option>
                    <option value="Packet">Packet</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Strip">Strip</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Opening Stock {editingProduct && '(Immutable)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    disabled={!!editingProduct}
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">HSN / SAC Code</label>
                <input
                  type="text"
                  value={formData.hsn_sac_code}
                  onChange={(e) => setFormData({ ...formData, hsn_sac_code: e.target.value })}
                  placeholder="e.g. 1006, 3004"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
