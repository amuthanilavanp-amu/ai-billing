"""Analytics and dashboard router"""
from datetime import date, timedelta, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_

from database import get_db
from models.invoice_models import Invoice, InvoiceItem, InvoiceStatus
from models.product_models import BusinessProduct, ProductStatus
from models.expense_models import Expense
from models.inventory_models import InventoryMovement
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


@router.get("/dashboard")
def dashboard_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {}
    
    today = date.today()
    if not date_from:
        date_from = today.replace(day=1)  # Start of current month
    if not date_to:
        date_to = today
    
    company_id = current_user.company_id
    
    # Sales totals
    sales_q = db.query(
        func.count(Invoice.id).label("invoice_count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total_sales"),
        func.coalesce(func.sum(Invoice.total_tax), 0).label("total_tax"),
        func.coalesce(func.sum(Invoice.discount_amount), 0).label("total_discount"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= date_from,
        Invoice.invoice_date <= date_to,
    ).first()
    
    # Today's sales
    today_sales = db.query(
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date == today,
    ).first()
    
    # Outstanding receivables
    outstanding = db.query(
        func.coalesce(func.sum(Invoice.balance_due), 0)
    ).filter(
        Invoice.company_id == company_id,
        Invoice.balance_due > 0,
        Invoice.is_cancelled == False,
    ).scalar() or 0.0
    
    # Total expenses in period
    expenses = db.query(
        func.coalesce(func.sum(Expense.amount), 0)
    ).filter(
        Expense.company_id == company_id,
        Expense.expense_date >= date_from,
        Expense.expense_date <= date_to,
    ).scalar() or 0.0
    
    # Product stats
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
    
    return {
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "sales": {
            "invoice_count": sales_q.invoice_count,
            "total_sales": round(float(sales_q.total_sales), 2),
            "total_tax": round(float(sales_q.total_tax), 2),
            "total_discount": round(float(sales_q.total_discount), 2),
            "average_invoice": round(float(sales_q.total_sales) / max(sales_q.invoice_count, 1), 2),
        },
        "today": {
            "invoice_count": today_sales.count,
            "total_sales": round(float(today_sales.total), 2),
        },
        "outstanding": round(float(outstanding), 2),
        "expenses": round(float(expenses), 2),
        "products": {
            "total": total_products,
            "low_stock": low_stock,
        },
    }


@router.get("/sales-trend")
def sales_trend(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily sales trend for chart."""
    if not current_user.company_id:
        return []
    
    today = date.today()
    start = today - timedelta(days=days)
    
    results = db.query(
        Invoice.invoice_date,
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= start,
        Invoice.invoice_date <= today,
    ).group_by(Invoice.invoice_date).order_by(Invoice.invoice_date).all()
    
    # Fill in missing days with zeros
    date_map = {r.invoice_date: {"count": r.count, "total": float(r.total)} for r in results}
    trend = []
    for i in range(days + 1):
        d = start + timedelta(days=i)
        data = date_map.get(d, {"count": 0, "total": 0.0})
        trend.append({"date": d.isoformat(), "invoice_count": data["count"], "total_sales": round(data["total"], 2)})
    
    return trend


@router.get("/top-products")
def top_products(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(10, ge=5, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top selling products by revenue."""
    if not current_user.company_id:
        return []
    
    today = date.today()
    date_from = date_from or today.replace(day=1)
    date_to = date_to or today
    
    results = db.query(
        InvoiceItem.product_name,
        func.sum(InvoiceItem.quantity).label("total_qty"),
        func.sum(InvoiceItem.total_amount).label("total_revenue"),
    ).join(Invoice).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= date_from,
        Invoice.invoice_date <= date_to,
    ).group_by(InvoiceItem.product_name).order_by(
        func.sum(InvoiceItem.total_amount).desc()
    ).limit(limit).all()
    
    return [
        {
            "name": r.product_name,
            "total_qty": round(float(r.total_qty), 2),
            "total_revenue": round(float(r.total_revenue), 2),
        }
        for r in results
    ]


@router.get("/gst-summary")
def gst_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GST collection summary by rate."""
    if not current_user.company_id:
        return {}
    
    today = date.today()
    date_from = date_from or today.replace(day=1)
    date_to = date_to or today
    
    result = db.query(
        func.coalesce(func.sum(Invoice.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(Invoice.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(Invoice.igst_amount), 0).label("igst"),
        func.coalesce(func.sum(Invoice.total_tax), 0).label("total_tax"),
        func.coalesce(func.sum(Invoice.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("grand_total"),
    ).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= date_from,
        Invoice.invoice_date <= date_to,
    ).first()
    
    return {
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "cgst": round(float(result.cgst), 2),
        "sgst": round(float(result.sgst), 2),
        "igst": round(float(result.igst), 2),
        "total_tax_collected": round(float(result.total_tax), 2),
        "taxable_amount": round(float(result.taxable), 2),
        "gross_sales": round(float(result.grand_total), 2),
        "note": "This summary is for reference only. Consult a qualified CA for your GST filing.",
    }
