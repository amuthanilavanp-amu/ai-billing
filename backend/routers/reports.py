"""Reports router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from routers.auth import get_current_user
from models.user_models import User
from database import get_db

router = APIRouter()


@router.get("/")
def list_reports(current_user: User = Depends(get_current_user)):
    return [
        {"id": "sales_summary", "name": "Sales Summary"},
        {"id": "gst_summary", "name": "GST Summary"},
        {"id": "inventory_valuation", "name": "Inventory Valuation"},
        {"id": "expense_summary", "name": "Expense Summary"},
        {"id": "purchase_summary", "name": "Purchase Summary"},
    ]
