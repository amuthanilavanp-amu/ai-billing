"""Customer router"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models.customer_models import Customer
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    credit_limit: float = 0.0
    notes: Optional[str] = None


@router.get("")
def list_customers(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {"total": 0, "items": []}
    q = db.query(Customer).filter(
        Customer.company_id == current_user.company_id,
        Customer.is_active == True,
    )
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Customer.name.ilike(term), Customer.phone.ilike(term)))
    total = q.count()
    items = q.order_by(Customer.name).offset((page-1)*page_size).limit(page_size).all()
    return {
        "total": total,
        "items": [{"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "gstin": c.gstin, "outstanding_balance": c.outstanding_balance} for c in items],
    }


@router.post("")
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    customer = Customer(company_id=current_user.company_id, **data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"id": customer.id, "name": customer.name}


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id, Customer.company_id == current_user.company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "address": c.address, "gstin": c.gstin, "credit_limit": c.credit_limit, "outstanding_balance": c.outstanding_balance}


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Customer).filter(Customer.id == customer_id, Customer.company_id == current_user.company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return {"success": True}
