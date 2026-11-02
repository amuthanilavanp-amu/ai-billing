"""Inventory router"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.product_models import BusinessProduct, ProductStatus
from models.inventory_models import InventoryMovement, MovementType
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class StockAdjustment(BaseModel):
    product_id: int
    quantity: float  # Positive to add, negative to subtract
    movement_type: str = "adjustment"
    notes: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None


@router.get("/summary")
def inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {}
    products = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == current_user.company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
    ).all()
    total_products = len(products)
    low_stock = [p for p in products if p.current_stock <= p.reorder_level and p.reorder_level > 0]
    out_of_stock = [p for p in products if p.current_stock <= 0]
    total_value = sum((p.purchase_price or p.selling_price) * p.current_stock for p in products)
    return {
        "total_products": total_products,
        "low_stock_count": len(low_stock),
        "out_of_stock_count": len(out_of_stock),
        "total_inventory_value": round(total_value, 2),
        "low_stock_items": [
            {"id": p.id, "name": p.name, "current_stock": p.current_stock, "reorder_level": p.reorder_level}
            for p in low_stock[:20]
        ],
        "out_of_stock_items": [
            {"id": p.id, "name": p.name, "unit": p.unit}
            for p in out_of_stock[:20]
        ],
    }


@router.post("/adjust")
def adjust_stock(
    data: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    product = db.query(BusinessProduct).filter(
        BusinessProduct.id == data.product_id,
        BusinessProduct.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    stock_before = product.current_stock
    new_stock = stock_before + data.quantity
    if new_stock < 0 and not product.allow_negative_stock:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    product.current_stock = new_stock

    try:
        mov_type = MovementType(data.movement_type)
    except ValueError:
        mov_type = MovementType.ADJUSTMENT

    movement = InventoryMovement(
        company_id=current_user.company_id,
        product_id=product.id,
        movement_type=mov_type,
        quantity=data.quantity,
        stock_before=stock_before,
        stock_after=new_stock,
        batch_number=data.batch_number,
        expiry_date=data.expiry_date,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(movement)
    db.commit()
    return {"success": True, "stock_before": stock_before, "stock_after": new_stock}


@router.get("/movements/{product_id}")
def get_movements(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {"total": 0, "items": []}
    q = db.query(InventoryMovement).filter(
        InventoryMovement.company_id == current_user.company_id,
        InventoryMovement.product_id == product_id,
    ).order_by(InventoryMovement.created_at.desc())
    total = q.count()
    items = q.offset((page-1)*page_size).limit(page_size).all()
    return {
        "total": total,
        "items": [
            {
                "id": m.id,
                "movement_type": m.movement_type.value,
                "quantity": m.quantity,
                "stock_before": m.stock_before,
                "stock_after": m.stock_after,
                "notes": m.notes,
                "created_at": m.created_at.isoformat(),
            }
            for m in items
        ],
    }
