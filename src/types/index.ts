export type BusinessCategory =
  | 'hotel_restaurant'
  | 'cafe_coffee'
  | 'bakery_sweets'
  | 'supermarket'
  | 'grocery_provision'
  | 'wholesale'
  | 'retail'
  | 'pharmacy'
  | 'hospital_clinic'
  | 'medical_supplies'
  | 'clothing'
  | 'footwear'
  | 'electronics'
  | 'mobile_accessories'
  | 'hardware'
  | 'cosmetics'
  | 'salon_beauty'
  | 'automobile_workshop'
  | 'spare_parts'
  | 'manufacturing'
  | 'furniture'
  | 'stationery'
  | 'agriculture'
  | 'pet_supplies'
  | 'sports_fitness'
  | 'ecommerce'
  | 'education'
  | 'professional_services'
  | 'repair_maintenance'
  | 'other';

export interface User {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'manager' | 'cashier' | 'accountant' | 'inventory_manager';
  company_id?: number;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  business_category: BusinessCategory;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  currency_code: string;
  currency_symbol: string;
  invoice_prefix: string;
  invoice_next_number: number;
  is_onboarding_complete: boolean;
  onboarding_step: number;
  footer_note?: string;
  terms_conditions?: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  brand_id?: number;
  product_type: 'product' | 'service';
  status: 'active' | 'inactive' | 'discontinued';
  sku?: string;
  barcode?: string;
  hsn_sac_code?: string;
  purchase_price?: number;
  selling_price: number;
  mrp?: number;
  unit: string;
  tax_type: 'gst' | 'vat' | 'none';
  gst_rate: number;
  tax_inclusive: boolean;
  tax_verified: boolean;
  current_stock: number;
  opening_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  track_inventory: boolean;
  is_vegetarian?: boolean;
  catalogue_item_id?: number;
  created_at?: string;
}

export interface CatalogueCategory {
  id: number;
  name: string;
  item_count: number;
}

export interface CatalogueItem {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  subcategory_id?: number;
  subcategory_name?: string;
  default_unit: string;
  is_vegetarian?: boolean;
  is_service: boolean;
  tags?: string;
}

export interface CartItem {
  product_id?: number;
  product_name: string;
  product_sku?: string;
  hsn_sac_code?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
  notes?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_gstin?: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'issued' | 'paid' | 'partial' | 'cancelled';
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit' | 'cheque';
  items?: Array<{
    id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    unit: string;
    total_amount: number;
    gst_rate: number;
  }>;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  outstanding_balance: number;
  credit_limit?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  lead_time_days?: number;
  outstanding_balance: number;
}

export interface ReplenishmentRecommendation {
  product_id: number;
  product_name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  daily_velocity: number;
  days_of_stock?: number;
  total_sold_30d: number;
  suggested_order_qty: number;
  reference_order_qty: number;
  pct_change: string;
  recommendation: 'reorder_now' | 'reorder_soon' | 'review_manually' | 'maintain';
  reason: string;
  has_sufficient_data: boolean;
  data_note?: string;
}
