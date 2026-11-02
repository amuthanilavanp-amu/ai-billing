# SmartBiz AI — Universal Desktop Billing, Inventory, Analytics & Business Intelligence Software

SmartBiz AI is a production-grade, local-first Windows 10/11 desktop software designed for small, medium, and large enterprises across 30 distinct industry verticals. It combines desktop point-of-sale (POS) speed, automated category catalogues, bulk Excel/CSV ingestion, automated inventory movements, predictive demand replenishment, and a restricted local AI business assistant.

---

## 🌟 Key Architecture & Capabilities

1. **Local-First Reliability & Privacy**:
   - Zero cloud requirement for core retail operations. Operates 100% offline.
   - High-throughput SQLite database engine configured with Write-Ahead Logging (`PRAGMA journal_mode=WAL`), foreign key enforcement (`PRAGMA foreign_keys=ON`), memory temp store, and 64 MB connection cache.
   - Checkpointed online database backup engine for disaster recovery snapshots.

2. **Category-Aware Starter Catalogue (30 Business Verticals)**:
   - Onboarding adapts directly to the selected industry: Hotel & Restaurant, Cafe, Bakery, Supermarket, Grocery, Wholesale, Retail, Pharmacy, Clinic, Medical Supplies, Apparel/Clothing, Footwear, Electronics, Mobile Accessories, Hardware, Salon, Auto Workshop, Spare Parts, Manufacturing, Furniture, Stationery, Agriculture, and more.
   - Over 500+ pre-seeded realistic items organized into hierarchical categories and subcategories (e.g. South Indian Meals, Dosa/Idli variants, Biryanis, Beverages with veg/non-veg flags, standard units of measure, and default tax classifications).

3. **Robust Bulk Product Import & Export System**:
   - Pre-formatted Excel (`.xlsx`) and CSV templates tailored per business category (Restaurant, Pharmacy, Retail, Supermarket).
   - Dynamic spreadsheet parser supporting thousands of rows.
   - Interactive column mapping interface with automatic header recognition.
   - Multi-strategy duplicate resolution: **Skip**, **Update Existing**, or **Stop on Error**.
   - Full master catalogue export to Excel or CSV.

4. **High-Speed Point of Sale (POS) Billing**:
   - Barcode scanner integration with continuous background focus.
   - Real-time tax computation engine: CGST (50%) + SGST (50%) for intra-state and IGST for inter-state transactions.
   - Multi-tender payment support: Cash, UPI / QR, Card, and Pay Later (Customer Credit).
   - Instant printable invoice and thermal receipt formats.

5. **Inventory Control & Stock Ledger**:
   - Automatic real-time inventory deductions upon billing.
   - Reorder threshold tracking with color-coded low stock and out-of-stock badges.
   - Stock adjustments (physical audits, damages, returns) with complete immutable movement audit trails.

6. **Predictive Demand Replenishment & Forecasting**:
   - 30-day sales consumption velocity tracking.
   - Statistical Exponential Moving Average (EMA) forecast modeling with confidence bounds.
   - Actionable replenishment advisor classifying items by urgency (`REORDER NOW`, `REORDER SOON`, `HEALTHY`).

7. **SmartBiz AI Local Assistant**:
   - Restricted local business intelligence assistant.
   - Strictly queries only your local SQLite database records (today's sales, low stock alerts, top revenue products, pending bills).
   - Zero data exfiltration to third-party cloud servers.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ or v24+
- **Python**: 3.11, 3.12, or 3.13 (64-bit)

### 2. Run in Development Mode
To launch the full Electron desktop app with live reload:
```powershell
# 1. Activate Python virtual environment and run backend
.\venv\Scripts\activate
uvicorn backend.main:app --port 8765

# 2. In another terminal, start Vite + Electron
npm.cmd run dev
```

### 3. Run Backend Integration Tests
```powershell
.\venv\Scripts\pytest.exe backend\tests\test_smartbiz.py
```

### 4. Build Production Desktop Application
```powershell
# Compile Vite frontend and Electron main process
npm.cmd run build

# Package Windows 64-bit installer (.exe)
npm.cmd run dist:win
```
