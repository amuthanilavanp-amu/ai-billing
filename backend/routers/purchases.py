"""Purchases router"""
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.purchase_models import Purchase, PurchaseItem, PurchaseStatus
from models.product_models import BusinessProduct
from models.inventory_models import InventoryMovement, MovementType
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class PurchaseItemInput(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit: str = "Pcs"
    unit_price: float
    tax_percent: float = 0.0
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None


class PurchaseCreate(BaseModel):
    supplier_id: Optional[int] = None
    purchase_date: date
    supplier_invoice_number: Optional[str] = None
    notes: Optional[str] = None
    items: List[PurchaseItemInput]


@router.post("")
def create_purchase(data: PurchaseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    company_id = current_user.company_id

    # Generate purchase number
    count = db.query(Purchase).filter(Purchase.company_id == company_id).count()
    purchase_number = f"PO-{count + 1:05d}"

    subtotal = sum(i.quantity * i.unit_price for i in data.items)
    tax_amount = sum(i.quantity * i.unit_price * i.tax_percent / 100 for i in data.items)
    grand_total = subtotal + tax_amount

    purchase = Purchase(
        company_id=company_id,
        supplier_id=data.supplier_id,
        purchase_number=purchase_number,
        purchase_date=data.purchase_date,
        status=PurchaseStatus.RECEIVED,
        supplier_invoice_number=data.supplier_invoice_number,
        subtotal=round(subtotal, 2),
        tax_amount=round(tax_amount, 2),
        grand_total=round(grand_total, 2),
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(purchase)
    db.flush()

    for item_data in data.items:
        item_total = item_data.quantity * item_data.unit_price * (1 + item_data.tax_percent / 100)
        item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            tax_percent=item_data.tax_percent,
            tax_amount=round(item_data.quantity * item_data.unit_price * item_data.tax_percent / 100, 2),
            total_amount=round(item_total, 2),
            batch_number=item_data.batch_number,
            expiry_date=item_data.expiry_date,
        )
        db.add(item)

        # Update stock
        if item_data.product_id:
            product = db.query(BusinessProduct).filter(
                BusinessProduct.id == item_data.product_id,
                BusinessProduct.company_id == company_id,
            ).first()
            if product:
                stock_before = product.current_stock
                product.current_stock += item_data.quantity
                if item_data.unit_price:
                    product.purchase_price = item_data.unit_price
                db.add(InventoryMovement(
                    company_id=company_id,
                    product_id=product.id,
                    movement_type=MovementType.PURCHASE,
                    quantity=item_data.quantity,
                    unit_cost=item_data.unit_price,
                    stock_before=stock_before,
                    stock_after=product.current_stock,
                    reference_type="purchase",
                    reference_id=purchase.id,
                    batch_number=item_data.batch_number,
                    expiry_date=item_data.expiry_date,
                    created_by=current_user.id,
                ))

    db.commit()
    return {"id": purchase.id, "purchase_number": purchase_number, "grand_total": round(grand_total, 2)}


@router.get("")
def list_purchases(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        return {"total": 0, "items": []}
    q = db.query(Purchase).filter(Purchase.company_id == current_user.company_id)
    total = q.count()
    items = q.order_by(Purchase.purchase_date.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"total": total, "items": [{"id": p.id, "purchase_number": p.purchase_number, "purchase_date": p.purchase_date.isoformat(), "grand_total": p.grand_total, "status": p.status.value} for p in items]}
