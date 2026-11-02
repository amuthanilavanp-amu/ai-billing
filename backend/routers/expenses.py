"""Expenses router"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.expense_models import Expense
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    expense_date: date
    payment_method: str = "cash"
    reference: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_expenses(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {"total": 0, "items": []}
    q = db.query(Expense).filter(Expense.company_id == current_user.company_id)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    if category:
        q = q.filter(Expense.category == category)
    total = q.count()
    items = q.order_by(Expense.expense_date.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {
        "total": total,
        "items": [{"id": e.id, "category": e.category, "description": e.description, "amount": e.amount, "expense_date": e.expense_date.isoformat(), "payment_method": e.payment_method} for e in items],
    }


@router.post("")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")
    expense = Expense(company_id=current_user.company_id, created_by=current_user.id, **data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "amount": expense.amount}
