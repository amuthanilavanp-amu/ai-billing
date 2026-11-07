import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  FileDown,
  Info,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';

interface PreviewData {
  filename: string;
  file_type: string;
  total_rows: number;
  headers: string[];
  suggested_mapping: Record<string, string | null>;
  preview_rows: string[][];
  required_fields: string[];
}

export const BulkImport: React.FC = () => {
  const { company } = useBusiness();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Column mapping: field -> header string
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'error'>('skip');

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Handle File Upload and Preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/import-export/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(res.data);

      // Initialize mapping from suggestions
      const initialMap: Record<string, string> = {};
      Object.entries(res.data.suggested_mapping).forEach(([field, header]) => {
        if (header) {
          initialMap[field] = header as string;
        }
      });
      setMapping(initialMap);
    } catch (err: any) {
      alert('Error previewing file: ' + (err.response?.data?.detail || err.message));
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile || !previewData) return;

    if (!mapping['name']) {
      alert('Please map the Product Name column (required).');
      return;
    }

    setIsProcessing(true);

    // Convert string mapping to 0-based column indices for execute-v2
    const indexMapping: Record<string, number> = {};
    Object.entries(mapping).forEach(([field, header]) => {
      const colIdx = previewData.headers.indexOf(header);
      if (colIdx !== -1) {
        indexMapping[field] = colIdx;
      }
    });

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('column_mapping', JSON.stringify(indexMapping));
    formData.append('duplicate_strategy', duplicateStrategy);

    try {
      const res = await apiClient.post('/import-export/execute-v2', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
    } catch (err: any) {
      alert('Import execution failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async (templateType: string, format: 'csv' | 'xlsx') => {
    const endpoint =
      format === 'xlsx'
        ? `/import-export/template/${templateType}/xlsx`
        : `/import-export/template/${templateType}`;
    try {
      const res = await apiClient.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartbiz_template_${templateType}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to download template: ' + err.message);
    }
  };

  const handleExportCatalogue = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await apiClient.get(`/import-export/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartbiz_products_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to export catalogue: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and navigation tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="text-orange-500" />
            Bulk Product Import & Export
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Import thousands of products from Excel or CSV with intelligent header mapping and error validation.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Upload size={16} />
            <span>Import Products</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Download size={16} />
            <span>Sample Templates</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`btn ${activeTab === 'export' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileDown size={16} />
            <span>Export Inventory</span>
          </button>
        </div>
      </div>

      {/* TAB 1: IMPORT PRODUCTS */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload Box */}
          {!previewData && !importResult && (
            <div className="card border-dashed border-2 border-slate-700 hover:border-orange-500/60 p-12 text-center transition flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                Select your Excel (.xlsx) or CSV Spreadsheet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                Drag and drop your product list or click browse below. You will be able to review headers, map
                fields, and preview rows before importing.
              </p>

              <button
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary btn-lg"
              >
                {isUploading ? (
                  <>
                    <span className="loading-spinner" />
                    <span>Parsing Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Choose File to Upload</span>
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                <Info size={14} />
                <span>Need a formatted file? Download a sample template first from the Templates tab.</span>
              </div>
            </div>
          )}

          {/* Mapping and Preview Stage */}
          {previewData && !importResult && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="font-bold text-white text-base">Step 1: Map Spreadsheet Columns</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      File: <span className="text-orange-400 font-semibold">{previewData.filename}</span> (
                      {previewData.total_rows} data rows detected)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel / Choose Another File
                  </button>
                </div>

                {/* Mapping Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { field: 'name', label: 'Product Name', required: true },
                    { field: 'selling_price', label: 'Selling Price (MRP / Rate)' },
                    { field: 'purchase_price', label: 'Purchase Cost' },
                    { field: 'category', label: 'Category' },
                    { field: 'barcode', label: 'Barcode / EAN' },
                    { field: 'sku', label: 'SKU Code' },
                    { field: 'unit', label: 'Unit of Measure (Kg, Pcs, Box)' },
                    { field: 'gst_rate', label: 'GST Rate % (e.g. 5, 12, 18)' },
                    { field: 'hsn_sac_code', label: 'HSN / SAC Code' },
                    { field: 'opening_stock', label: 'Opening Physical Stock' },
                    { field: 'reorder_level', label: 'Reorder Alert Threshold' },
                  ].map(({ field, label, required }) => (
                    <div key={field} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {label} {required && <span className="text-red-400">*</span>}
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        className="text-xs"
                      >
                        <option value="">-- Don't Map / None --</option>
                        {previewData.headers.map((h, i) => (
                          <option key={i} value={h}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Duplicate strategy & options */}
                <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-300">If barcode or name matches existing:</span>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_strat"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                      />
                      <span>Skip (Keep existing)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_strat"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                      />
                      <span>Update existing prices & details</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_strat"
                        checked={duplicateStrategy === 'error'}
                        onChange={() => setDuplicateStrategy('error')}
                      />
                      <span>Stop on error</span>
                    </label>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isProcessing}
                    className="btn btn-primary btn-lg flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <span className="loading-spinner" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <span>Commit & Import {previewData.total_rows} Products</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-bold text-white text-sm">Spreadsheet Preview (First 10 Rows)</h3>
                  <span className="text-xs text-slate-400">Review your column values before committing</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        {previewData.headers.map((h, i) => (
                          <th key={i}>{h || `Col ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview_rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="text-slate-500 text-xs">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="text-xs text-slate-300">
                              {cell || <span className="text-slate-600 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Complete Results */}
          {importResult && (
            <div className="card border-emerald-500/50 bg-emerald-950/10 p-8 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Import Completed Successfully!</h2>
              <p className="text-xs text-slate-400 mb-6">
                Your products have been ingested and are ready for inventory tracking and instant POS billing.
              </p>

              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center">
                  <div className="text-xl font-bold text-emerald-400">{importResult.imported}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">New Added</div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center">
                  <div className="text-xl font-bold text-orange-400">{importResult.updated}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Updated</div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center">
                  <div className="text-xl font-bold text-amber-400">{importResult.skipped}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Skipped</div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center">
                  <div className="text-xl font-bold text-red-400">{importResult.errors}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Errors</div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setImportResult(null);
                    setPreviewData(null);
                    setSelectedFile(null);
                  }}
                  className="btn btn-secondary"
                >
                  Import Another File
                </button>
                <a href="/products" className="btn btn-primary">
                  View Product Inventory
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'general',
              title: 'Standard Product Template',
              desc: 'General retail & supermarket catalogue format with barcodes, purchase/sale rates & stock.',
            },
            {
              id: 'hotel_restaurant',
              title: 'Hotel & Restaurant Template',
              desc: 'Menu-oriented template with food categories, portions, vegetarian classification & rates.',
            },
            {
              id: 'pharmacy',
              title: 'Pharmacy & Medicine Template',
              desc: 'Formulation, drug name, HSN code, batch, and tax schedule headers.',
            },
            {
              id: 'clothing',
              title: 'Apparel & Garments Template',
              desc: 'Fashion retail format supporting product variants, sizes, colors, and SKU codes.',
            },
          ].map((t) => (
            <div key={t.id} className="card flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3">
                  <FileSpreadsheet size={22} />
                </div>
                <h3 className="font-bold text-white text-sm">{t.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate(t.id, 'xlsx')}
                  className="btn btn-primary btn-sm flex-1 flex justify-center items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleDownloadTemplate(t.id, 'csv')}
                  className="btn btn-secondary btn-sm flex-1 flex justify-center items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EXPORT INVENTORY */}
      {activeTab === 'export' && (
        <div className="card max-w-xl mx-auto text-center p-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-4">
            <FileDown size={32} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Export Current Product Master</h2>
          <p className="text-xs text-slate-400 mb-8 max-w-md mx-auto">
            Download your complete catalogue, current stock levels, selling prices, purchase costs, and tax details
            to open in Microsoft Excel or Google Sheets.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => handleExportCatalogue('xlsx')}
              className="btn btn-primary btn-lg flex items-center gap-2"
            >
              <Download size={18} />
              <span>Export as Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => handleExportCatalogue('csv')}
              className="btn btn-secondary btn-lg flex items-center gap-2"
            >
              <Download size={18} />
              <span>Export as CSV</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
