import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Zap,
  ShoppingBag,
  AlertCircle,
  Percent,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';
import { Product, CartItem } from '../../types';
import { Logo } from '../../components/common/Logo';

// Audio feedback for hardware scanner beep
const playScannerBeep = (success = true) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.08);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    }
  } catch {
    // Ignore audio errors if audio context is blocked
  }
};

export const BillingPOS: React.FC = () => {
  const { company } = useBusiness();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart & billing state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scanNotice, setScanNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Customer info & tender
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [isIgst, setIsIgst] = useState(false);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState('0');

  // Checkout modal & print
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  // Quick custom item modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customItem, setCustomItem] = useState({
    name: '',
    price: '',
    qty: '1',
    gstRate: '0',
    unit: 'Pcs',
  });

  // Hardware Scanner automatic keyboard interceptor
  const scannerBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Focus barcode input on mount and keep scanner ready
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Show auto-dismissing toast notification
  const notifyScan = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setScanNotice({ message, type });
    playScannerBeep(type === 'success');
    setTimeout(() => {
      setScanNotice((prev) => (prev?.message === message ? null : prev));
    }, 2500);
  }, []);

  // Add a product object to the active POS cart
  const addProductToCart = useCallback((product: Product, quantityToAdd = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product_id === product.id || (item.product_name === product.name && item.unit_price === product.selling_price)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + quantityToAdd;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
        notifyScan(`Updated: ${product.name} (Qty: ${newQty})`, 'success');
        return updated;
      }

      notifyScan(`Added: ${product.name} (₹${product.selling_price.toFixed(2)})`, 'success');
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku || '',
          hsn_sac_code: product.hsn_sac_code || '',
          unit: product.unit || 'Pcs',
          quantity: quantityToAdd,
          unit_price: product.selling_price || 0,
          discount_percent: 0,
          gst_rate: product.gst_rate || 0,
        },
      ];
    });

    setSearchQuery('');
    setSearchResults([]);
  }, [notifyScan]);

  // Lookup and add product by scanned barcode/SKU
  const handleBarcodeLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      // 1. Try exact or normalized barcode lookup
      const res = await apiClient.get(`/products/barcode/${encodeURIComponent(trimmed)}`);
      if (res.data) {
        addProductToCart(res.data);
        return true;
      }
    } catch {
      // 2. Fallback to product search by code or name
      try {
        const res = await apiClient.get('/products', {
          params: { search: trimmed, page_size: 1 },
        });
        if (res.data.items && res.data.items.length > 0) {
          addProductToCart(res.data.items[0]);
          return true;
        }
      } catch {
        // failed fallback
      }
    }

    notifyScan(`Item not found for barcode: "${trimmed}"`, 'error');
    return false;
  }, [addProductToCart, notifyScan]);

  // Global keydown listener for rapid hardware barcode scanner guns
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside modal or typing in specific inputs like textarea
      if (isCheckingOut || isCustomModalOpen) return;

      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const isBarcodeInput = target === barcodeInputRef.current;

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle barcode scanner Enter key
      if (e.key === 'Enter') {
        if (scannerBufferRef.current.length >= 2) {
          const scannedCode = scannerBufferRef.current;
          scannerBufferRef.current = '';
          e.preventDefault();
          handleBarcodeLookup(scannedCode);
          if (isBarcodeInput) setBarcodeInput('');
          return;
        }
      }

      // If key is printable character (letters, numbers, symbols)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Scanners send characters with extremely low latency (< 45ms)
        if (timeDiff < 45 || isBarcodeInput) {
          scannerBufferRef.current += e.key;
        } else {
          // Normal manual typing resets buffer
          scannerBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleBarcodeLookup, isCheckingOut, isCustomModalOpen]);

  // Form submit for manual barcode input
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim();
    setBarcodeInput('');
    await handleBarcodeLookup(code);
    barcodeInputRef.current?.focus();
  };

  // Live product search debounced
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
    }, 180);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Update item quantity
  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: qty };
      return updated;
    });
  };

  // Update item unit price
  const updateUnitPrice = (index: number, price: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit_price: Math.max(0, price) };
      return updated;
    });
  };

  // Remove single line item
  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    barcodeInputRef.current?.focus();
  };

  // Clear entire cart
  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear all items from current cart?')) {
      setCart([]);
      barcodeInputRef.current?.focus();
    }
  };

  // Quick custom item creation
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(customItem.price);
    const qty = parseFloat(customItem.qty);
    if (!customItem.name.trim() || isNaN(price) || price < 0 || isNaN(qty) || qty <= 0) {
      alert('Please enter valid product details');
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        product_name: customItem.name.trim(),
        unit: customItem.unit,
        quantity: qty,
        unit_price: price,
        discount_percent: 0,
        gst_rate: parseFloat(customItem.gstRate) || 0,
      },
    ]);

    setIsCustomModalOpen(false);
    setCustomItem({ name: '', price: '', qty: '1', gstRate: '0', unit: 'Pcs' });
    notifyScan(`Added: ${customItem.name}`, 'success');
    barcodeInputRef.current?.focus();
  };

  // Accurate billing math & tax calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineDiscount = (lineSubtotal * (item.discount_percent || 0)) / 100;
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const tax = (taxable * (item.gst_rate || 0)) / 100;
      subtotal += lineSubtotal;
      totalTax += tax;
    });

    const overallDiscountPct = Math.min(100, Math.max(0, parseFloat(overallDiscountPercent) || 0));
    const billDiscountAmount = (subtotal * overallDiscountPct) / 100;
    const taxableAfterBillDiscount = Math.max(0, subtotal - billDiscountAmount);

    // Exact rounded calculations
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedDiscount = Math.round(billDiscountAmount * 100) / 100;
    const roundedTaxable = Math.round(taxableAfterBillDiscount * 100) / 100;
    const roundedTotalTax = Math.round(totalTax * 100) / 100;

    const rawGrandTotal = roundedTaxable + roundedTotalTax;
    const grandTotal = Math.round(rawGrandTotal * 100) / 100;
    const roundOff = Math.round((Math.round(grandTotal) - grandTotal) * 100) / 100;
    const finalPayable = Math.round(grandTotal + roundOff);

    // Change due calculation for cash payments
    const tendered = parseFloat(tenderedAmount) || 0;
    const changeDue = tendered > finalPayable ? tendered - finalPayable : 0;

    return {
      subtotal: roundedSubtotal,
      discountAmount: roundedDiscount,
      taxableAmount: roundedTaxable,
      totalTax: roundedTotalTax,
      cgst: isIgst ? 0 : Math.round((roundedTotalTax / 2) * 100) / 100,
      sgst: isIgst ? 0 : Math.round((roundedTotalTax / 2) * 100) / 100,
      igst: isIgst ? roundedTotalTax : 0,
      grandTotal: finalPayable,
      rawGrandTotal,
      roundOff,
      tendered,
      changeDue: Math.round(changeDue * 100) / 100,
    };
  };

  const totals = calculateTotals();

  // Process checkout & invoice persistence
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please scan or add items before checkout.');
      barcodeInputRef.current?.focus();
      return;
    }

    setIsCheckingOut(true);
    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || undefined,
        payment_method: paymentMethod,
        discount_percent: parseFloat(overallDiscountPercent) || 0,
        is_igst: isIgst,
        round_off: totals.roundOff,
        items: cart.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          product_sku: i.product_sku || '',
          hsn_sac_code: i.hsn_sac_code || '',
          unit: i.unit,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent || 0,
          gst_rate: i.gst_rate || 0,
        })),
      };

      const res = await apiClient.post('/billing', payload);
      setCreatedInvoice(res.data);
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setTenderedAmount('');
      setOverallDiscountPercent('0');
      notifyScan(`Invoice #${res.data.invoice_number} Generated!`, 'success');
    } catch (e: any) {
      alert('Checkout error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 overflow-hidden relative">
      {/* Scan Feedback Banner / Toast */}
      {scanNotice && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border shadow-xl flex items-center gap-2 text-xs font-bold transition-all duration-200 animate-slide-up ${
            scanNotice.type === 'success'
              ? 'bg-orange-600/95 text-white border-orange-400 shadow-orange-500/20'
              : 'bg-red-950/95 text-red-200 border-red-500 shadow-red-500/20'
          }`}
        >
          {scanNotice.type === 'success' ? <Zap size={15} className="text-white" /> : <AlertCircle size={15} />}
          <span>{scanNotice.message}</span>
        </div>
      )}

      {/* LEFT SECTION: Barcode Scan Bar, Search & Live Cart Table */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#101014] border border-[#272733] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Scanner & Search Bar */}
        <div className="p-3.5 border-b border-[#252530] bg-[#141419] flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[320px]">
            {/* Barcode scan input */}
            <form onSubmit={handleBarcodeSubmit} className="search-bar w-80 bg-[#1c1c24] border-[#313140]">
              <Barcode size={20} className="text-orange-500 flex-shrink-0" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode / Enter SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="font-mono text-sm tracking-wide text-white placeholder-zinc-500"
              />
              <span className="badge badge-orange text-[10px] py-0.5 px-1.5 uppercase font-mono font-bold">
                Ready
              </span>
            </form>

            {/* Product text search input with live dropdown */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="search-bar w-full bg-[#1c1c24] border-[#313140]">
                <Search size={16} className="text-zinc-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Quick search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs text-white placeholder-zinc-500"
                />
              </div>

              {/* Live search dropdown results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#181820] border border-[#2d2d3a] rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-zinc-800">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addProductToCart(product)}
                      className="p-3 hover:bg-orange-500/10 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{product.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {product.barcode ? `Barcode: ${product.barcode}` : product.sku || ''} • {product.unit} • Stock: {product.current_stock}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-orange-400">₹{product.selling_price.toFixed(2)}</div>
                        <span className="badge badge-gray text-[10px]">{product.gst_rate}% GST</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="btn btn-secondary btn-sm text-xs font-bold text-white border-[#313140] hover:border-orange-500"
            >
              <Plus size={14} className="text-orange-400" />
              <span>Custom Item</span>
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-secondary btn-sm text-xs text-zinc-400 hover:text-red-400 border-[#313140]"
                title="Clear Cart"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Cart Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="empty-state h-full flex flex-col justify-center">
              <ShoppingBag className="w-16 h-16 text-zinc-700 mb-3" />
              <h3 className="text-base font-bold text-white">Cart is Empty</h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
                Scan product barcodes with your handheld scanner or search items above. Scanned products will automatically appear with accurate pricing and tax.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Product Description</th>
                    <th className="text-right w-24">Rate (₹)</th>
                    <th className="w-32 text-center">Qty</th>
                    <th className="text-center w-20">GST</th>
                    <th className="text-right w-28">Total (₹)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const lineSubtotal = item.quantity * item.unit_price;
                    const lineDiscount = (lineSubtotal * (item.discount_percent || 0)) / 100;
                    const taxable = Math.max(0, lineSubtotal - lineDiscount);
                    const lineTax = (taxable * (item.gst_rate || 0)) / 100;
                    const lineTotal = taxable + lineTax;

                    return (
                      <tr key={idx} className="hover:bg-orange-500/5 transition-colors">
                        <td className="text-zinc-500 text-xs font-mono">{idx + 1}</td>
                        <td>
                          <div className="font-bold text-white text-xs">{item.product_name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {item.product_sku ? `SKU: ${item.product_sku} • ` : ''}
                            Unit: {item.unit}
                          </div>
                        </td>
                        <td className="text-right text-xs font-semibold text-zinc-200">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 px-1.5 py-0.5 text-right text-xs bg-[#1a1a22] border border-[#2b2b38] rounded text-white"
                          />
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-[#20202a] text-zinc-300 hover:bg-orange-600 hover:text-white flex items-center justify-center text-xs transition"
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(idx, parseFloat(e.target.value) || 1)}
                              className="w-12 px-1 py-0.5 text-center text-xs font-bold bg-[#141419] border border-[#2e2e3d] rounded text-white"
                            />
                            <button
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-[#20202a] text-zinc-300 hover:bg-orange-600 hover:text-white flex items-center justify-center text-xs transition"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="text-center text-xs font-mono text-zinc-400">
                          <span className="badge badge-gray text-[10px]">{item.gst_rate}%</span>
                        </td>
                        <td className="text-right text-xs font-black text-white font-mono">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition"
                            title="Remove Line"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Quick Bar */}
        <div className="p-3 bg-[#0a0a0d] border-t border-[#252530] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Items: <strong className="text-white">{cart.length}</strong></span>
            <span>Total Units: <strong className="text-white">{cart.reduce((sum, i) => sum + i.quantity, 0)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <span className="badge badge-orange text-[10px]">Auto-Scanner Ready</span>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Customer, Calculation Breakdown & Tender Checkout */}
      <div className="w-full md:w-[380px] bg-[#121217] border border-[#272733] rounded-2xl p-5 flex flex-col justify-between shadow-2xl">
        <div>
          {/* Customer & Tax Type Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#252530] mb-3.5">
            <h2 className="font-extrabold text-white text-sm flex items-center gap-2">
              <UserCheck size={17} className="text-orange-500" />
              <span>Customer & Billing</span>
            </h2>
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isIgst}
                onChange={(e) => setIsIgst(e.target.checked)}
              />
              <span className="font-semibold text-zinc-300">Inter-State (IGST)</span>
            </label>
          </div>

          {/* Customer input fields */}
          <div className="space-y-2.5 mb-4">
            <input
              type="text"
              placeholder="Customer Name (e.g. Walk-in Customer)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-xs bg-[#191922] border-[#2d2d3a] font-medium"
            />
            <input
              type="text"
              placeholder="Mobile Phone (for WhatsApp / SMS bill)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="text-xs bg-[#191922] border-[#2d2d3a] font-medium"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Payment Tender
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI / QR', icon: QrCode },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'credit', label: 'Credit', icon: Clock },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400 text-white shadow-md shadow-orange-500/30'
                        : 'bg-[#181820] border-[#2b2b38] text-zinc-400 hover:bg-[#22222d] hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                    <span className="text-[11px] font-bold mt-1.5">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Cash: Quick Cash Tender & Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className="mb-4 p-3 bg-[#181820] border border-[#2b2b38] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Tendered Cash (₹):</span>
                <input
                  type="number"
                  placeholder={totals.grandTotal.toString()}
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="w-28 px-2 py-1 text-right text-xs bg-[#111116] border-[#313142] font-mono font-bold text-white rounded"
                />
              </div>
              <div className="flex gap-1.5 justify-end">
                {[totals.grandTotal, 100, 200, 500, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTenderedAmount(val.toString())}
                    className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#262633] text-zinc-300 hover:text-white hover:bg-orange-600 rounded transition"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
              {totals.tendered > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-700 text-xs">
                  <span className="text-zinc-400 font-semibold">Change to Return:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    ₹{totals.changeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bill Calculation Breakdown Card */}
          <div className="bg-[#0c0c10] p-4 rounded-xl border border-[#272733] space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400 font-medium">
              <span>Items Total ({cart.length})</span>
              <span className="font-mono font-semibold text-white">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <span>Bill Discount (%)</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallDiscountPercent}
                  onChange={(e) => setOverallDiscountPercent(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-right text-xs bg-[#181820] border-[#2e2e3d] rounded text-white font-mono"
                />
                <span className="text-zinc-500">%</span>
              </div>
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-orange-400 font-medium">
                <span>Discount Deduction</span>
                <span className="font-mono font-bold">-₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-zinc-400 font-medium">
              <span>Taxable Value</span>
              <span className="font-mono text-white">₹{totals.taxableAmount.toFixed(2)}</span>
            </div>

            {isIgst ? (
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>IGST (Integrated Tax)</span>
                <span className="font-mono text-white">₹{totals.igst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-zinc-400 font-medium">
                  <span>CGST (Central Tax)</span>
                  <span className="font-mono text-white">₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 font-medium">
                  <span>SGST (State Tax)</span>
                  <span className="font-mono text-white">₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            )}

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>Round Off</span>
                <span className="font-mono text-zinc-300">
                  {totals.roundOff > 0 ? `+₹${totals.roundOff}` : `-₹${Math.abs(totals.roundOff)}`}
                </span>
              </div>
            )}

            {/* Grand Total */}
            <div className="pt-3 border-t border-[#252530] flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-white uppercase tracking-wider">
                Total Payable
              </span>
              <span className="text-2xl font-black text-orange-400 font-mono tracking-tight">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Checkout Button */}
        <div className="pt-4 mt-2">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2 font-extrabold text-base shadow-lg shadow-orange-500/25"
          >
            {isCheckingOut ? (
              <>
                <span className="loading-spinner" />
                <span>Generating Invoice...</span>
              </>
            ) : (
              <>
                <ReceiptText size={20} />
                <span>Checkout & Print (₹{totals.grandTotal.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: Quick Custom Product Add */}
      {isCustomModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md">
            <div className="card-header">
              <h3 className="font-bold text-white text-base">Add Custom Item to Bill</h3>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Dessert or Custom Repair"
                  value={customItem.name}
                  onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={customItem.price}
                    onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={customItem.qty}
                    onChange={(e) => setCustomItem({ ...customItem, qty: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">GST Rate (%)</label>
                  <select
                    value={customItem.gstRate}
                    onChange={(e) => setCustomItem({ ...customItem, gstRate: e.target.value })}
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Unit</label>
                  <select
                    value={customItem.unit}
                    onChange={(e) => setCustomItem({ ...customItem, unit: e.target.value })}
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Plate">Plate</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Box">Box</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#252530] flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsCustomModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Professional Printed Invoice Receipt */}
      {createdInvoice && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md text-center p-6">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-base font-extrabold text-white mb-0.5">Payment Successful!</h3>
            <p className="text-xs text-zinc-400 mb-4 font-mono">
              Invoice #{createdInvoice.invoice_number} • ₹{createdInvoice.grand_total}
            </p>

            {/* Thermal / Printed Receipt Preview Container */}
            <div className="bg-black/90 p-5 rounded-xl border border-zinc-700 text-left font-mono text-xs mb-4 space-y-2 text-zinc-200 shadow-inner">
              {/* Receipt Logo & Header */}
              <div className="text-center pb-2 border-b border-dashed border-zinc-700">
                <Logo variant="receipt" size="sm" className="mb-2" />
                <div className="text-sm font-bold text-white">{company?.name || 'SmartBiz AI'}</div>
                {company?.address_line1 && (
                  <div className="text-[10px] text-zinc-400">{company.address_line1}, {company.city}</div>
                )}
                <div className="text-[10px] text-zinc-400">GSTIN: {company?.gstin || 'UNREGISTERED'}</div>
                {company?.phone && (
                  <div className="text-[10px] text-zinc-400">Phone: {company.phone}</div>
                )}
              </div>

              <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                <span>Inv: {createdInvoice.invoice_number}</span>
                <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Customer: {createdInvoice.customer_name || 'Walk-in'}
              </div>

              {/* Items Table in Receipt */}
              <div className="pt-2 border-t border-dashed border-zinc-700">
                <div className="grid grid-cols-12 text-[10px] font-bold text-zinc-400 uppercase pb-1">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Amount</span>
                </div>
                {createdInvoice.items && createdInvoice.items.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 text-[11px] py-0.5">
                    <span className="col-span-6 truncate text-white">{item.product_name}</span>
                    <span className="col-span-2 text-center text-zinc-400">{item.quantity}</span>
                    <span className="col-span-4 text-right font-bold text-white">₹{(item.total_amount || (item.quantity * item.unit_price)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Receipt Totals */}
              <div className="pt-2 border-t border-dashed border-zinc-700 space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span>₹{createdInvoice.subtotal?.toFixed(2)}</span>
                </div>
                {createdInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Discount:</span>
                    <span>-₹{createdInvoice.discount_amount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Total Tax:</span>
                  <span>₹{createdInvoice.total_tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-white pt-1.5 border-t border-zinc-700">
                  <span>NET TOTAL:</span>
                  <span className="text-orange-400">₹{createdInvoice.grand_total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-white uppercase">{createdInvoice.payment_method}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-zinc-400 pt-3 border-t border-dashed border-zinc-700">
                {company?.footer_note || 'Thank you for shopping with us! Please visit again.'}
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => {
                  window.print();
                  setCreatedInvoice(null);
                  barcodeInputRef.current?.focus();
                }}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5 font-bold"
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => {
                  setCreatedInvoice(null);
                  barcodeInputRef.current?.focus();
                }}
                className="btn btn-secondary flex-1 font-bold"
              >
                Next Customer (F2)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
