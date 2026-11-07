import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle,
  Plus,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';
import { CatalogueCategory, CatalogueItem } from '../../types';

export const CatalogueBrowser: React.FC = () => {
  const { company } = useBusiness();

  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [defaultPrice, setDefaultPrice] = useState<string>('0');
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  const businessCategory = company?.business_category || 'hotel_restaurant';

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalogue/categories', {
        params: { business_category: businessCategory },
      });
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/catalogue/items', {
        params: {
          business_category: businessCategory,
          category_id: selectedCatId || undefined,
          search: search || undefined,
          page_size: 150,
        },
      });
      setItems(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [businessCategory]);

  useEffect(() => {
    fetchItems();
  }, [businessCategory, selectedCatId, search]);

  const toggleSelect = (id: number) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const selectAllCurrentPage = () => {
    const allSelected = items.every((item) => selectedIds.has(item.id));
    const updated = new Set(selectedIds);
    items.forEach((item) => {
      if (allSelected) {
        updated.delete(item.id);
      } else {
        updated.add(item.id);
      }
    });
    setSelectedIds(updated);
  };

  const handleImportSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one catalogue item to add.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await apiClient.post('/products/import-from-catalogue', {
        catalogue_item_ids: Array.from(selectedIds),
        default_selling_price: parseFloat(defaultPrice) || 0,
      });
      setImportSummary(res.data);
      setSelectedIds(new Set());
    } catch (e: any) {
      alert('Import failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-orange-500" />
            Starter Catalogue Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Industry starter template for{' '}
            <span className="text-orange-400 font-semibold capitalize">
              {businessCategory.replace(/_/g, ' ')}
            </span>
            . Select items to add them directly to your business inventory.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-orange-950/40 border border-orange-500/40 p-2 px-4 rounded-xl">
            <span className="text-xs font-semibold text-orange-200">
              Selected: <strong className="text-white">{selectedIds.size}</strong> items
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Default Price:</span>
              <input
                type="number"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-right"
                placeholder="0.00"
              />
            </div>
            <button
              onClick={handleImportSelected}
              disabled={isImporting}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              {isImporting ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  <Plus size={14} />
                  <span>Import to Inventory</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Modal */}
      {importSummary && (
        <div className="card bg-emerald-950/20 border-emerald-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-emerald-400" size={20} />
            <div>
              <div className="text-sm font-bold text-emerald-300">
                Added {importSummary.imported} product(s) to inventory!
              </div>
              <div className="text-xs text-slate-400">
                {importSummary.skipped} were already in your inventory (skipped).
              </div>
            </div>
          </div>
          <button onClick={() => setImportSummary(null)} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="search-bar flex-1 max-w-md">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search items, ingredients, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={selectAllCurrentPage} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            {items.length > 0 && items.every((i) => selectedIds.has(i.id)) ? (
              <CheckSquare size={14} className="text-orange-400" />
            ) : (
              <Square size={14} />
            )}
            <span>Select All on Page</span>
          </button>
        </div>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCatId(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            selectedCatId === null
              ? 'bg-orange-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedCatId === cat.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {cat.name} ({cat.item_count})
          </button>
        ))}
      </div>

      {/* Items Table / Cards */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="loading-spinner mb-2" />
            <p className="text-xs">Loading starter items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">No items found matching your filters.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && items.every((i) => selectedIds.has(i.id))}
                    onChange={selectAllCurrentPage}
                  />
                </th>
                <th>Item / Product Name</th>
                <th>Category</th>
                <th>Default Unit</th>
                <th>Classification</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer ${isSelected ? 'bg-orange-500/10' : ''}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td>
                      <div className="font-semibold text-slate-200 text-sm">{item.name}</div>
                      {item.tags && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.tags}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">{item.category_name || 'General'}</span>
                    </td>
                    <td className="text-xs text-slate-300 font-medium">{item.default_unit}</td>
                    <td>
                      {item.is_vegetarian !== null && (
                        <span
                          className={`badge text-[10px] ${
                            item.is_vegetarian ? 'badge-veg' : 'badge-nonveg'
                          }`}
                        >
                          {item.is_vegetarian ? 'VEG' : 'NON-VEG'}
                        </span>
                      )}
                      {item.is_service && <span className="badge badge-orange ml-1">Service</span>}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`btn btn-sm ${isSelected ? 'btn-danger' : 'btn-secondary'}`}
                      >
                        {isSelected ? 'Deselect' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
