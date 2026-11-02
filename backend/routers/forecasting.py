"""Demand forecasting and replenishment router"""
from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.invoice_models import InvoiceItem, Invoice
from models.product_models import BusinessProduct, ProductStatus
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()

MIN_DATA_POINTS = 14  # Minimum days of sales data required


@router.get("/replenishment")
def replenishment_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Smart replenishment advisor based on sales velocity and current stock."""
    if not current_user.company_id:
        return []
    
    today = date.today()
    lookback_days = 30
    start_date = today - timedelta(days=lookback_days)
    company_id = current_user.company_id
    
    # Get products with inventory tracking
    products = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
    ).all()
    
    recommendations = []
    
    for product in products:
        # Get recent sales
        sales_result = db.query(
            func.count(InvoiceItem.id).label("sale_days"),
            func.coalesce(func.sum(InvoiceItem.quantity), 0).label("total_sold"),
        ).join(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.is_cancelled == False,
            InvoiceItem.product_id == product.id,
            Invoice.invoice_date >= start_date,
        ).first()
        
        total_sold = float(sales_result.total_sold) if sales_result else 0.0
        daily_velocity = total_sold / lookback_days if lookback_days > 0 else 0.0
        
        if daily_velocity <= 0 and product.current_stock > product.reorder_level * 2:
            continue  # Skip non-moving products with adequate stock
        
        # Days of stock remaining
        days_of_stock = product.current_stock / daily_velocity if daily_velocity > 0 else 999
        
        # Suggested order quantity (30-day demand)
        suggested_qty = round(daily_velocity * 30, 0)
        ref_qty = product.reorder_quantity if product.reorder_quantity > 0 else suggested_qty
        
        # Determine recommendation
        if product.current_stock <= 0:
            recommendation = "reorder_now"
            reason = "Out of stock"
        elif days_of_stock <= 7:
            recommendation = "reorder_now"
            reason = f"Only {round(days_of_stock, 1)} days of stock remaining"
        elif days_of_stock <= 14:
            recommendation = "reorder_soon"
            reason = f"{round(days_of_stock, 1)} days of stock remaining"
        elif product.current_stock <= product.reorder_level and product.reorder_level > 0:
            recommendation = "reorder_now"
            reason = "Below reorder level"
        elif total_sold == 0:
            recommendation = "review_manually"
            reason = "No sales in last 30 days"
        else:
            recommendation = "maintain"
            reason = f"Adequate stock for {round(days_of_stock, 0)} days"
        
        # Percent change
        if ref_qty > 0:
            pct_change = round((suggested_qty - ref_qty) / ref_qty * 100, 1)
            pct_label = f"{'+' if pct_change >= 0 else ''}{pct_change}%"
        else:
            pct_label = "New recommendation"
        
        has_sufficient_data = total_sold > 0
        
        recommendations.append({
            "product_id": product.id,
            "product_name": product.name,
            "unit": product.unit,
            "current_stock": round(product.current_stock, 2),
            "reorder_level": round(product.reorder_level, 2),
            "daily_velocity": round(daily_velocity, 3),
            "days_of_stock": round(days_of_stock, 1) if days_of_stock < 999 else None,
            "total_sold_30d": round(total_sold, 2),
            "suggested_order_qty": suggested_qty,
            "reference_order_qty": ref_qty,
            "pct_change": pct_label,
            "recommendation": recommendation,
            "reason": reason,
            "has_sufficient_data": has_sufficient_data,
            "data_note": None if has_sufficient_data else "Insufficient sales data — recommendation based on reorder level only",
        })
    
    # Sort: reorder_now first
    priority = {"reorder_now": 0, "reorder_soon": 1, "review_manually": 2, "maintain": 3}
    recommendations.sort(key=lambda x: priority.get(x["recommendation"], 99))
    
    return recommendations


@router.get("/forecast/{product_id}")
def product_forecast(
    product_id: int,
    horizon_days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simple demand forecast for a single product."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    
    product = db.query(BusinessProduct).filter(
        BusinessProduct.id == product_id,
        BusinessProduct.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    today = date.today()
    lookback_days = 90
    start_date = today - timedelta(days=lookback_days)
    
    # Get daily sales
    daily_sales = db.query(
        Invoice.invoice_date,
        func.sum(InvoiceItem.quantity).label("qty"),
    ).join(Invoice).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.is_cancelled == False,
        InvoiceItem.product_id == product_id,
        Invoice.invoice_date >= start_date,
    ).group_by(Invoice.invoice_date).order_by(Invoice.invoice_date).all()
    
    if len(daily_sales) < MIN_DATA_POINTS:
        return {
            "product_id": product_id,
            "product_name": product.name,
            "has_sufficient_data": False,
            "data_points": len(daily_sales),
            "min_required": MIN_DATA_POINTS,
            "message": f"Insufficient sales history ({len(daily_sales)} selling days recorded, {MIN_DATA_POINTS} required). Collect more data for reliable forecasting.",
            "forecast": None,
        }
    
    # Simple moving average forecast
    quantities = [float(r.qty) for r in daily_sales]
    n = len(quantities)
    
    # Use exponential moving average
    alpha = 0.3
    ema = quantities[0]
    for q in quantities[1:]:
        ema = alpha * q + (1 - alpha) * ema
    
    daily_forecast = round(ema, 3)
    horizon_forecast = round(daily_forecast * horizon_days, 2)
    
    # Simple standard deviation for uncertainty
    mean = sum(quantities) / n
    variance = sum((q - mean) ** 2 for q in quantities) / n
    std_dev = variance ** 0.5
    
    lower = max(0, round(horizon_forecast - 1.5 * std_dev * (horizon_days ** 0.5), 2))
    upper = round(horizon_forecast + 1.5 * std_dev * (horizon_days ** 0.5), 2)
    
    return {
        "product_id": product_id,
        "product_name": product.name,
        "unit": product.unit,
        "has_sufficient_data": True,
        "data_points": n,
        "lookback_days": lookback_days,
        "horizon_days": horizon_days,
        "daily_forecast": daily_forecast,
        "horizon_forecast": horizon_forecast,
        "lower_bound": lower,
        "upper_bound": upper,
        "method": "exponential_moving_average",
        "current_stock": round(product.current_stock, 2),
        "stock_covers_days": round(product.current_stock / daily_forecast, 1) if daily_forecast > 0 else None,
        "disclaimer": "Forecasts are based on historical sales and statistical methods. Actual demand may differ.",
    }
