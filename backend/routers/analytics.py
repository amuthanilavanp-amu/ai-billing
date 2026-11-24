"""
SmartBiz AI — Universal Analytics, BI & Business Performance Router
Provides deep sales analytics, top/most sold items, velocity analysis (fast vs dead stock),
profit margin intelligence, category & payment breakdowns, rush hour heatmaps, and customer metrics.
"""
from datetime import date, timedelta, datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, distinct

from database import get_db
from models.invoice_models import Invoice, InvoiceItem, InvoiceStatus, PaymentMethod
from models.product_models import BusinessProduct, ProductStatus, ProductCategory
from models.expense_models import Expense
from models.customer_models import Customer
from models.company_models import Company
from models.user_models import User
from routers.auth import get_current_user

router = APIRouter()


def _get_active_company_id(current_user: User, db: Session) -> Optional[int]:
    """Resolve active company ID from user or system default."""
    if current_user.company_id:
        return current_user.company_id
    comp = db.query(Company).first()
    return comp.id if comp else None


def _resolve_date_range(
    preset: Optional[str],
    date_from: Optional[date],
    date_to: Optional[date],
) -> tuple[date, date]:
    """Resolve preset date ranges into concrete (start_date, end_date)."""
    today = date.today()
    if preset == "today":
        return today, today
    elif preset == "yesterday":
        y = today - timedelta(days=1)
        return y, y
    elif preset == "7days":
        return today - timedelta(days=6), today
    elif preset == "30days":
        return today - timedelta(days=29), today
    elif preset == "this_month":
        return today.replace(day=1), today
    elif preset == "last_month":
        first_of_this_month = today.replace(day=1)
        last_of_last_month = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_of_last_month.replace(day=1)
        return first_of_last_month, last_of_last_month
    elif preset == "all_time":
        return date(2020, 1, 1), today

    # Fallbacks for manual dates
    d_from = date_from or today.replace(day=1)
    d_to = date_to or today
    return d_from, d_to


@router.get("/dashboard")
def dashboard_summary(
    preset: Optional[str] = Query(None, description="today, yesterday, 7days, 30days, this_month, last_month, all_time"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Comprehensive executive analytics summary:
    Sales, estimated COGS, Gross Profit, Net Profit, Average Basket Value,
    Units Sold, Outstanding, and Product Health.
    """
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return {"error": "No company configured"}

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)
    today = date.today()
    yesterday = today - timedelta(days=1)

    # 1. Period Sales & Totals
    sales_q = db.query(
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_sales"),
        func.coalesce(func.sum(Invoice.taxable_amount), 0).label("taxable_amount"),
        func.coalesce(func.sum(Invoice.total_tax), 0).label("total_tax"),
        func.coalesce(func.sum(Invoice.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(Invoice.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(Invoice.igst_amount), 0).label("igst"),
        func.coalesce(func.sum(Invoice.discount_amount), 0).label("total_discount"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).first()

    total_sales = round(float(sales_q.total_sales), 2)
    taxable_amount = round(float(sales_q.taxable_amount), 2)
    invoice_count = sales_q.invoice_count or 0

    # 2. Units Sold & Estimated COGS in this period
    cogs_q = db.query(
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_units"),
        func.coalesce(
            func.sum(
                InvoiceItem.quantity * func.coalesce(BusinessProduct.purchase_price, BusinessProduct.selling_price * 0.7, 0)
            ),
            0,
        ).label("estimated_cogs"),
    ).select_from(InvoiceItem).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).outerjoin(
        BusinessProduct, InvoiceItem.product_id == BusinessProduct.id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).first()

    total_units_sold = round(float(cogs_q.total_units), 2)
    estimated_cogs = round(float(cogs_q.estimated_cogs), 2)

    # Profit calculations
    gross_profit = round(taxable_amount - estimated_cogs, 2)
    gross_margin_pct = round((gross_profit / taxable_amount * 100), 2) if taxable_amount > 0 else 0.0

    # 3. Expenses in period
    expenses = db.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.company_id == company_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date,
    ).scalar() or 0.0
    expenses = round(float(expenses), 2)

    net_profit = round(gross_profit - expenses, 2)
    net_margin_pct = round((net_profit / total_sales * 100), 2) if total_sales > 0 else 0.0

    # 4. Average Ticket Size / Basket Value
    avg_invoice = round(total_sales / invoice_count, 2) if invoice_count > 0 else 0.0
    avg_units_per_bill = round(total_units_sold / invoice_count, 2) if invoice_count > 0 else 0.0

    # 5. Today's vs Yesterday's Sales
    today_q = db.query(
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date == today,
    ).first()

    yesterday_q = db.query(
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date == yesterday,
    ).first()

    today_sales = round(float(today_q.total), 2)
    yesterday_sales = round(float(yesterday_q.total), 2)
    day_growth_pct = round(((today_sales - yesterday_sales) / yesterday_sales * 100), 1) if yesterday_sales > 0 else 0.0

    # 6. Outstanding Receivables
    outstanding = db.query(
        func.coalesce(func.sum(Invoice.balance_due), 0)
    ).filter(
        Invoice.company_id == company_id,
        Invoice.balance_due > 0,
        Invoice.is_cancelled == False,
    ).scalar() or 0.0

    # 7. Inventory Health
    total_products = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
    ).count()

    low_stock = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
        BusinessProduct.current_stock <= BusinessProduct.reorder_level,
        BusinessProduct.reorder_level > 0,
    ).count()

    out_of_stock = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
        BusinessProduct.current_stock <= 0,
    ).count()

    # 8. Customer count
    total_customers = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.is_active == True,
    ).count()

    return {
        "period": {
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
            "preset": preset or "custom",
        },
        "sales": {
            "invoice_count": invoice_count,
            "total_sales": total_sales,
            "taxable_amount": taxable_amount,
            "total_tax": round(float(sales_q.total_tax), 2),
            "cgst": round(float(sales_q.cgst), 2),
            "sgst": round(float(sales_q.sgst), 2),
            "igst": round(float(sales_q.igst), 2),
            "total_discount": round(float(sales_q.total_discount), 2),
            "average_invoice": avg_invoice,
            "total_units_sold": total_units_sold,
            "avg_units_per_bill": avg_units_per_bill,
        },
        "profitability": {
            "estimated_cogs": estimated_cogs,
            "gross_profit": gross_profit,
            "gross_margin_percent": gross_margin_pct,
            "expenses": expenses,
            "net_profit": net_profit,
            "net_margin_percent": net_margin_pct,
        },
        "today": {
            "invoice_count": today_q.count,
            "total_sales": today_sales,
            "yesterday_sales": yesterday_sales,
            "growth_percent": day_growth_pct,
        },
        "outstanding": round(float(outstanding), 2),
        "products": {
            "total": total_products,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
        },
        "customers": {
            "total": total_customers,
        },
    }


@router.get("/top-products")
def top_products(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Most sold products across three analytical perspectives:
    1. by_volume: Most items sold (Units/Qty)
    2. by_revenue: Highest sales turnover (₹)
    3. by_profit: Highest gross margin contributors (₹)
    """
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return {"by_volume": [], "by_revenue": [], "by_profit": [], "total_products_sold": 0, "total_units_sold": 0}

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    # Base aggregated query
    rows = db.query(
        InvoiceItem.product_name,
        func.coalesce(InvoiceItem.product_sku, "").label("sku"),
        InvoiceItem.unit,
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_qty"),
        func.coalesce(func.sum(InvoiceItem.total_amount), 0).label("total_revenue"),
        func.coalesce(func.sum(InvoiceItem.taxable_amount), 0).label("taxable_revenue"),
        func.coalesce(
            func.sum(
                InvoiceItem.quantity * func.coalesce(BusinessProduct.purchase_price, BusinessProduct.selling_price * 0.7, 0)
            ),
            0,
        ).label("total_cogs"),
    ).select_from(InvoiceItem).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).outerjoin(
        BusinessProduct, InvoiceItem.product_id == BusinessProduct.id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        InvoiceItem.product_name,
        InvoiceItem.product_sku,
        InvoiceItem.unit,
    ).all()

    if not rows:
        return {
            "by_volume": [],
            "by_revenue": [],
            "by_profit": [],
            "total_products_sold": 0,
            "total_units_sold": 0,
            "period": {"from": start_date.isoformat(), "to": end_date.isoformat()},
        }

    total_period_revenue = sum(float(r.total_revenue) for r in rows) or 1.0
    total_period_units = sum(float(r.total_qty) for r in rows)

    parsed_items = []
    for r in rows:
        qty = round(float(r.total_qty), 2)
        rev = round(float(r.total_revenue), 2)
        taxable = round(float(r.taxable_revenue), 2)
        cogs = round(float(r.total_cogs), 2)
        profit = round(taxable - cogs, 2)
        margin_pct = round((profit / taxable * 100), 1) if taxable > 0 else 0.0
        avg_price = round(rev / qty, 2) if qty > 0 else 0.0
        revenue_share = round((rev / total_period_revenue * 100), 1)

        parsed_items.append({
            "name": r.product_name,
            "sku": r.sku or "—",
            "unit": r.unit or "Pcs",
            "total_qty": qty,
            "total_revenue": rev,
            "taxable_revenue": taxable,
            "estimated_cogs": cogs,
            "gross_profit": profit,
            "margin_percent": margin_pct,
            "average_price": avg_price,
            "revenue_share_percent": revenue_share,
        })

    # 1. By Volume (Most units sold)
    by_volume = sorted(parsed_items, key=lambda x: x["total_qty"], reverse=True)[:limit]
    for i, it in enumerate(by_volume, 1):
        it["rank"] = i

    # 2. By Revenue (Highest ₹ turnover)
    by_revenue = sorted(parsed_items, key=lambda x: x["total_revenue"], reverse=True)[:limit]
    for i, it in enumerate(by_revenue, 1):
        it["rank"] = i

    # 3. By Gross Profit
    by_profit = sorted(parsed_items, key=lambda x: x["gross_profit"], reverse=True)[:limit]
    for i, it in enumerate(by_profit, 1):
        it["rank"] = i

    return {
        "period": {"from": start_date.isoformat(), "to": end_date.isoformat()},
        "total_products_sold": len(parsed_items),
        "total_units_sold": round(total_period_units, 2),
        "total_revenue": round(total_period_revenue, 2),
        "by_volume": by_volume,
        "by_revenue": by_revenue,
        "by_profit": by_profit,
    }


@router.get("/product-velocity")
def product_velocity(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sales velocity classification:
    - Fast-Moving: High selling frequency and high volume
    - Slow-Moving: Low selling frequency
    - Dead Stock: Physical on-hand stock present (>0) with ZERO sales in the period (tied-up working capital)
    """
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return {"fast_moving": [], "slow_moving": [], "dead_stock": [], "total_capital_blocked": 0}

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    # 1. Get all products sold in period
    sold_rows = db.query(
        InvoiceItem.product_id,
        InvoiceItem.product_name,
        func.coalesce(InvoiceItem.product_sku, "").label("sku"),
        InvoiceItem.unit,
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("units_sold"),
        func.coalesce(func.sum(InvoiceItem.total_amount), 0).label("revenue"),
        func.count(distinct(Invoice.id)).label("order_frequency"),
    ).select_from(InvoiceItem).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        InvoiceItem.product_id,
        InvoiceItem.product_name,
        InvoiceItem.product_sku,
        InvoiceItem.unit,
    ).all()

    sold_product_ids = {r.product_id for r in sold_rows if r.product_id is not None}
    sold_product_names = {r.product_name.strip().lower() for r in sold_rows}

    # Velocity threshold: top quartile or >= 5 units sold
    all_sold = []
    for r in sold_rows:
        all_sold.append({
            "product_id": r.product_id,
            "name": r.product_name,
            "sku": r.sku or "—",
            "unit": r.unit or "Pcs",
            "units_sold": round(float(r.units_sold), 2),
            "revenue": round(float(r.revenue), 2),
            "order_frequency": r.order_frequency,
        })

    all_sold.sort(key=lambda x: x["units_sold"], reverse=True)
    avg_sold = (sum(x["units_sold"] for x in all_sold) / len(all_sold)) if all_sold else 0

    fast_moving = [x for x in all_sold if x["units_sold"] >= max(avg_sold, 3.0)][:15]
    slow_moving = [x for x in all_sold if x["units_sold"] < max(avg_sold, 3.0)][:15]

    # 2. Dead stock: Active products with stock > 0 but 0 sales
    active_stock_items = db.query(
        BusinessProduct.id,
        BusinessProduct.name,
        BusinessProduct.sku,
        BusinessProduct.unit,
        BusinessProduct.current_stock,
        BusinessProduct.purchase_price,
        BusinessProduct.selling_price,
        ProductCategory.name.label("category_name"),
    ).outerjoin(
        ProductCategory, BusinessProduct.category_id == ProductCategory.id
    ).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
        BusinessProduct.current_stock > 0,
    ).all()

    dead_stock = []
    total_capital_blocked = 0.0

    for p in active_stock_items:
        # Check if not sold
        if p.id not in sold_product_ids and p.name.strip().lower() not in sold_product_names:
            stock = round(float(p.current_stock), 2)
            cost_rate = float(p.purchase_price or (p.selling_price * 0.7) or 0.0)
            blocked = round(stock * cost_rate, 2)
            total_capital_blocked += blocked

            dead_stock.append({
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku or "—",
                "category": p.category_name or "General",
                "unit": p.unit or "Pcs",
                "current_stock": stock,
                "unit_cost": round(cost_rate, 2),
                "blocked_capital": blocked,
                "recommendation": "Offer discount or combo bundle to recover capital",
            })

    dead_stock.sort(key=lambda x: x["blocked_capital"], reverse=True)

    return {
        "period": {"from": start_date.isoformat(), "to": end_date.isoformat()},
        "fast_moving": fast_moving,
        "slow_moving": slow_moving,
        "dead_stock": dead_stock[:20],
        "dead_stock_count": len(dead_stock),
        "total_capital_blocked": round(total_capital_blocked, 2),
    }


@router.get("/category-breakdown")
def category_breakdown(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sales and unit distribution grouped by product category."""
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return []

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    rows = db.query(
        func.coalesce(ProductCategory.name, "General / Uncategorized").label("category_name"),
        func.count(distinct(InvoiceItem.product_name)).label("item_count"),
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("units_sold"),
        func.coalesce(func.sum(InvoiceItem.total_amount), 0).label("total_sales"),
        func.coalesce(func.sum(InvoiceItem.taxable_amount), 0).label("taxable_sales"),
    ).select_from(InvoiceItem).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).outerjoin(
        BusinessProduct, InvoiceItem.product_id == BusinessProduct.id
    ).outerjoin(
        ProductCategory, BusinessProduct.category_id == ProductCategory.id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        ProductCategory.name
    ).order_by(
        func.sum(InvoiceItem.total_amount).desc()
    ).all()

    total_revenue = sum(float(r.total_sales) for r in rows) or 1.0

    return [
        {
            "category": r.category_name,
            "item_count": r.item_count,
            "units_sold": round(float(r.units_sold), 2),
            "total_sales": round(float(r.total_sales), 2),
            "taxable_sales": round(float(r.taxable_sales), 2),
            "percentage_share": round((float(r.total_sales) / total_revenue * 100), 1),
        }
        for r in rows
    ]


@router.get("/payment-breakdown")
def payment_breakdown(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Payment mode breakdown (Cash, UPI, Card, Credit/Khata)."""
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return []

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    labels = {
        "cash": "Cash Payment",
        "upi": "UPI / QR (GPay / PhonePe / Paytm)",
        "card": "Debit / Credit Card",
        "credit": "Credit (Khata / Pay Later)",
        "bank_transfer": "Bank Transfer / NEFT",
        "cheque": "Cheque",
        "mixed": "Split / Mixed Payment",
    }

    rows = db.query(
        Invoice.payment_method,
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_amount"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(Invoice.payment_method).all()

    total_amount = sum(float(r.total_amount) for r in rows) or 1.0

    result = []
    for r in rows:
        val = r.payment_method.value if hasattr(r.payment_method, "value") else str(r.payment_method)
        amt = round(float(r.total_amount), 2)
        cnt = r.invoice_count or 0
        pct = round((amt / total_amount * 100), 1)

        result.append({
            "method": val,
            "label": labels.get(val, val.replace("_", " ").title()),
            "total_amount": amt,
            "invoice_count": cnt,
            "percentage_share": pct,
        })

    result.sort(key=lambda x: x["total_amount"], reverse=True)
    return result


@router.get("/hourly-distribution")
def hourly_distribution(
    preset: Optional[str] = Query("today"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hourly sales velocity and invoice traffic to identify peak rush hours.
    """
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return []

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    # In SQLite, strftime('%H', created_at) returns '00' to '23'
    rows = db.query(
        func.strftime("%H", Invoice.created_at).label("hour_str"),
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_sales"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        func.strftime("%H", Invoice.created_at)
    ).all()

    data_map = {}
    for r in rows:
        if r.hour_str:
            try:
                h = int(r.hour_str)
                data_map[h] = {
                    "count": r.invoice_count,
                    "sales": round(float(r.total_sales), 2),
                }
            except (ValueError, TypeError):
                continue

    max_sales = max([v["sales"] for v in data_map.values()], default=0.0)

    # Standard retail store hours: 06:00 to 23:00 (or all 24)
    hours_list = []
    for h in range(6, 24):
        h_info = data_map.get(h, {"count": 0, "sales": 0.0})
        ampm = "AM" if h < 12 else "PM"
        display_h = 12 if h in (0, 12) else h % 12
        label = f"{display_h} {ampm}"

        hours_list.append({
            "hour": h,
            "label": label,
            "invoice_count": h_info["count"],
            "total_sales": h_info["sales"],
            "is_peak": (h_info["sales"] == max_sales and max_sales > 0),
        })

    return hours_list


@router.get("/customer-insights")
def customer_insights(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Top spending customers, repeat purchase rates, and walk-in split.
    """
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return {"top_customers": [], "walkin_vs_registered": {}}

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    # 1. Top registered customers
    top_custs = db.query(
        Customer.id,
        Customer.name,
        func.coalesce(Customer.phone, "—").label("phone"),
        Customer.outstanding_balance,
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_spent"),
    ).join(
        Invoice, Customer.id == Invoice.customer_id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        Customer.id, Customer.name, Customer.phone, Customer.outstanding_balance
    ).order_by(
        func.sum(Invoice.grand_total).desc()
    ).limit(limit).all()

    top_list = []
    for r in top_custs:
        spent = round(float(r.total_spent), 2)
        cnt = r.invoice_count or 1
        top_list.append({
            "id": r.id,
            "name": r.name,
            "phone": r.phone,
            "outstanding_balance": round(float(r.outstanding_balance or 0), 2),
            "invoice_count": cnt,
            "total_spent": spent,
            "average_bill": round(spent / cnt, 2),
        })

    # 2. Walk-in vs Registered split
    split_rows = db.query(
        (Invoice.customer_id != None).label("is_registered"),
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        Invoice.customer_id != None
    ).all()

    total_split_sales = sum(float(r.total) for r in split_rows) or 1.0
    walkin = {"count": 0, "sales": 0.0, "percentage": 0.0}
    registered = {"count": 0, "sales": 0.0, "percentage": 0.0}

    for r in split_rows:
        amt = round(float(r.total), 2)
        cnt = r.count or 0
        pct = round((amt / total_split_sales * 100), 1)
        if r.is_registered:
            registered = {"count": cnt, "sales": amt, "percentage": pct}
        else:
            walkin = {"count": cnt, "sales": amt, "percentage": pct}

    return {
        "period": {"from": start_date.isoformat(), "to": end_date.isoformat()},
        "top_customers": top_list,
        "walkin_vs_registered": {
            "walkin": walkin,
            "registered": registered,
        },
    }


@router.get("/sales-trend")
def sales_trend(
    days: int = Query(14, ge=7, le=365),
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily sales trend for charts."""
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return []

    if preset or date_from:
        start_date, end_date = _resolve_date_range(preset, date_from, date_to)
        num_days = (end_date - start_date).days
    else:
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)
        num_days = days - 1

    results = db.query(
        Invoice.invoice_date,
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
        func.coalesce(func.sum(Invoice.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(Invoice.total_tax), 0).label("tax"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(Invoice.invoice_date).order_by(Invoice.invoice_date).all()

    date_map = {
        r.invoice_date: {
            "count": r.count,
            "total": float(r.total),
            "taxable": float(r.taxable),
            "tax": float(r.tax),
        }
        for r in results
    }

    trend = []
    for i in range(num_days + 1):
        d = start_date + timedelta(days=i)
        data = date_map.get(d, {"count": 0, "total": 0.0, "taxable": 0.0, "tax": 0.0})
        trend.append({
            "date": d.isoformat(),
            "formatted_date": d.strftime("%d %b"),
            "day_name": d.strftime("%a"),
            "invoice_count": data["count"],
            "total_sales": round(data["total"], 2),
            "taxable_sales": round(data["taxable"], 2),
            "tax_collected": round(data["tax"], 2),
        })

    return trend


@router.get("/gst-summary")
def gst_summary(
    preset: Optional[str] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GST collection summary by rate slabs (0%, 5%, 12%, 18%, 28%)."""
    company_id = _get_active_company_id(current_user, db)
    if not company_id:
        return {}

    start_date, end_date = _resolve_date_range(preset, date_from, date_to)

    result = db.query(
        func.coalesce(func.sum(Invoice.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(Invoice.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(Invoice.igst_amount), 0).label("igst"),
        func.coalesce(func.sum(Invoice.total_tax), 0).label("total_tax"),
        func.coalesce(func.sum(Invoice.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("grand_total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).first()

    # Tax slabs by item rate
    slab_rows = db.query(
        InvoiceItem.gst_rate,
        func.coalesce(func.sum(InvoiceItem.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(InvoiceItem.tax_amount), 0).label("tax"),
        func.coalesce(func.sum(InvoiceItem.total_amount), 0).label("total"),
    ).select_from(InvoiceItem).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
    ).group_by(
        InvoiceItem.gst_rate
    ).order_by(
        InvoiceItem.gst_rate
    ).all()

    slabs = [
        {
            "gst_rate": float(s.gst_rate),
            "label": f"GST {int(s.gst_rate) if s.gst_rate.is_integer() else s.gst_rate}% Slab",
            "taxable_amount": round(float(s.taxable), 2),
            "tax_amount": round(float(s.tax), 2),
            "total_amount": round(float(s.total), 2),
        }
        for s in slab_rows
    ]

    return {
        "period": {"from": start_date.isoformat(), "to": end_date.isoformat()},
        "cgst": round(float(result.cgst), 2),
        "sgst": round(float(result.sgst), 2),
        "igst": round(float(result.igst), 2),
        "total_tax_collected": round(float(result.total_tax), 2),
        "taxable_amount": round(float(result.taxable), 2),
        "gross_sales": round(float(result.grand_total), 2),
        "slabs": slabs,
        "note": "This summary is computed from recorded invoices and item tax rates for GST filing assistance.",
    }
