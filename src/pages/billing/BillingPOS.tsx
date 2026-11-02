import React, { useState, useEffect, useRef } from 'react';
import {
  ReceiptText,
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  Printer,
  CheckCircle,
  X,
  UserCheck,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';
import { Product, CartItem, Invoice } from '../../types';

export const BillingPOS: React.FC = () => {
  const { company } = useBusiness();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart & billing state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [isIgst, setIsIgst] = useState(false);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState('0');

  // Checkout modal & print
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  // Keep barcode input focused for rapid desktop barcode gun scanning
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Live product search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await apiClient.get('/products', {
          params: { search: searchQuery, page_size: 10 },
        });
        setSearchResults(res.data.items);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle barcode scanner enter key
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      const res = await apiClient.get(`/products/barcode/${code}`);
      if (res.data) {
        addToCart(res.data);
        setBarcodeInput('');
      }
    } catch {
      // If not exact barcode, search by code
      try {
        const res = await apiClient.get('/products', { params: { search: code, page_size: 1 } });
        if (res.data.items?.length > 0) {
          addToCart(res.data.items[0]);
          setBarcodeInput('');
        } else {
          alert(`Product not found for barcode: ${code}`);
        }
      } catch (err: any) {
        alert(`Error finding barcode ${code}`);
      }
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          hsn_sac_code: product.hsn_sac_code,
          unit: product.unit,
          quantity: 1,
          unit_price: product.selling_price,
          discount_percent: 0,
          gst_rate: product.gst_rate || 0,
        },
      ];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity = qty;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Tax calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineDiscount = (lineSubtotal * item.discount_percent) / 100;
      const taxable = lineSubtotal - lineDiscount;
      const tax = (taxable * item.gst_rate) / 100;
      subtotal += lineSubtotal;
      totalTax += tax;
    });

    const discountAmount = (subtotal * (parseFloat(overallDiscountPercent) || 0)) / 100;
    const taxableAfterDiscount = subtotal - discountAmount;
    const grandTotal = Math.round((taxableAfterDiscount + totalTax) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAfterDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgst: isIgst ? 0 : Math.round((totalTax / 2) * 100) / 100,
      sgst: isIgst ? 0 : Math.round((totalTax / 2) * 100) / 100,
      igst: isIgst ? Math.round(totalTax * 100) / 100 : 0,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add products before checkout.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        payment_method: paymentMethod,
        discount_percent: parseFloat(overallDiscountPercent) || 0,
        is_igst: isIgst,
        items: cart.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          product_sku: i.product_sku,
          hsn_sac_code: i.hsn_sac_code,
          unit: i.unit,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent,
          gst_rate: i.gst_rate,
        })),
      };

      const res = await apiClient.post('/billing', payload);
      setCreatedInvoice(res.data);
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      barcodeInputRef.current?.focus();
    } catch (e: any) {
      alert('Invoice creation failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 overflow-hidden">
      {/* LEFT: Barcode & Product Selection + Cart Items */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Barcode & Search Top Toolbar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap gap-3 items-center">
          {/* Barcode scan box */}
          <form onSubmit={handleBarcodeSubmit} className="search-bar w-72">
            <Barcode size={18} className="text-blue-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode & Press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
          </form>

          {/* Product search box */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="search-bar w-full">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search product by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Dropdown search results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-2.5 hover:bg-slate-700/80 cursor-pointer flex items-center justify-between border-b border-slate-700/50"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{product.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {product.unit} • Stock: {product.current_stock}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">₹{product.selling_price.toFixed(2)}</div>
                      <span className="badge badge-gray text-[10px]">{product.gst_rate}% GST</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items Table */}
        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="empty-state h-full flex flex-col justify-center">
              <ReceiptText className="w-12 h-12 text-slate-600 mb-2" />
              <h3 className="text-sm font-semibold text-slate-400">Cart is empty</h3>
              <p className="text-xs text-slate-500">
                Scan barcode with a scanner gun or search products above to start billing.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Product</th>
                  <th className="w-28 text-center">Qty</th>
                  <th className="text-right w-24">Rate (₹)</th>
                  <th className="text-center w-20">GST</th>
                  <th className="text-right w-28">Total (₹)</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => {
                  const lineTotal = item.quantity * item.unit_price * (1 + item.gst_rate / 100);
                  return (
                    <tr key={idx}>
                      <td className="text-slate-500 text-xs">{idx + 1}</td>
                      <td>
                        <div className="font-semibold text-slate-200 text-xs">{item.product_name}</div>
                        <div className="text-[10px] text-slate-500">{item.unit}</div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-xs"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 text-center text-xs bg-slate-900 border border-slate-700 rounded"
                          />
                          <button
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-xs"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="text-right text-xs text-slate-200">
                        {item.unit_price.toFixed(2)}
                      </td>
                      <td className="text-center text-xs text-slate-400">
                        {item.gst_rate}%
                      </td>
                      <td className="text-right text-xs font-bold text-white">
                        {lineTotal.toFixed(2)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={14} />
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

      {/* RIGHT: Customer, Tax Breakdown, Payment & Checkout */}
      <div className="w-full md:w-96 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <UserCheck size={16} className="text-blue-400" />
              Customer Details
            </h2>
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isIgst}
                onChange={(e) => setIsIgst(e.target.checked)}
              />
              <span>Inter-State (IGST)</span>
            </label>
          </div>

          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Customer Name (e.g. Walk-in)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-xs"
            />
            <input
              type="text"
              placeholder="Phone (optional for SMS receipt)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'credit', label: 'Pay Later', icon: Clock },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-blue-400' : 'text-slate-400'} />
                    <span className="text-[10px] mt-1">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bill Calculation Breakdown */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Items Total ({cart.length})</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Bill Discount (%)</span>
              <input
                type="number"
                value={overallDiscountPercent}
                onChange={(e) => setOverallDiscountPercent(e.target.value)}
                className="w-16 px-1 py-0.5 text-right text-xs bg-slate-900 border border-slate-700 rounded"
              />
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Taxable Value</span>
              <span>₹{totals.taxableAmount.toFixed(2)}</span>
            </div>

            {isIgst ? (
              <div className="flex justify-between text-slate-400">
                <span>IGST</span>
                <span>₹{totals.igst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>CGST</span>
                  <span>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SGST</span>
                  <span>₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
              <span>Grand Total</span>
              <span className="text-emerald-400 text-lg">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="pt-4 mt-2">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="btn btn-success btn-lg w-full flex justify-center items-center gap-2"
          >
            {isCheckingOut ? (
              <>
                <span className="loading-spinner" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <ReceiptText size={18} />
                <span>Pay & Print Invoice (₹{totals.grandTotal.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invoice Generated Success Modal */}
      {createdInvoice && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Invoice Generated!</h3>
            <p className="text-xs text-slate-400 mb-4">
              Invoice #{createdInvoice.invoice_number} • Total ₹{createdInvoice.grand_total}
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-left font-mono text-[11px] mb-4 space-y-1 text-slate-300">
              <div className="text-center font-bold text-white pb-1 border-b border-slate-800">
                {company?.name || 'SmartBiz AI'}
              </div>
              <div className="text-center text-[10px] text-slate-500">
                GSTIN: {company?.gstin || 'UNREGISTERED'}
              </div>
              <div className="flex justify-between pt-1">
                <span>Inv: {createdInvoice.invoice_number}</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
                <span>PAID ({paymentMethod.toUpperCase()})</span>
                <span>₹{createdInvoice.grand_total}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  window.print();
                  setCreatedInvoice(null);
                }}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
              <button onClick={() => setCreatedInvoice(null)} className="btn btn-secondary flex-1">
                Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
