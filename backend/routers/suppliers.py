"""Supplier router"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models.supplier_models import Supplier
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    credit_days: int = 0
    lead_time_days: int = 1
    notes: Optional[str] = None


@router.get("")
def list_suppliers(search: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        return {"total": 0, "items": []}
    q = db.query(Supplier).filter(Supplier.company_id == current_user.company_id, Supplier.is_active == True)
    if search:
        q = q.filter(or_(Supplier.name.ilike(f"%{search}%"), Supplier.phone.ilike(f"%{search}%")))
    total = q.count()
    items = q.order_by(Supplier.name).offset((page-1)*page_size).limit(page_size).all()
    return {"total": total, "items": [{"id": s.id, "name": s.name, "phone": s.phone, "email": s.email, "outstanding_balance": s.outstanding_balance} for s in items]}


@router.post("")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    supplier = Supplier(company_id=current_user.company_id, **data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return {"id": supplier.id, "name": supplier.name}


@router.get("/{supplier_id}")
def get_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.company_id == current_user.company_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"id": s.id, "name": s.name, "phone": s.phone, "email": s.email, "gstin": s.gstin, "lead_time_days": s.lead_time_days, "outstanding_balance": s.outstanding_balance}
