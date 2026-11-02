"""
SmartBiz Assistant — restricted business chatbot.
Only answers questions about the current business data.
Enforces restrictions at the backend level, not just prompt level.
"""
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import re

from database import get_db
from models.invoice_models import Invoice, InvoiceStatus
from models.product_models import BusinessProduct, ProductStatus
from models.expense_models import Expense
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()

# Allowlisted intent patterns — NO arbitrary queries allowed
INTENT_PATTERNS = [
    (r"sales.*(today|yesterday|this week|this month|last month)", "sales_summary"),
    (r"(revenue|income|billing).*(today|yesterday|this month)", "sales_summary"),
    (r"(top|best|most).*(product|item|sell)", "top_products"),
    (r"low.*(stock|inventory)", "low_stock"),
    (r"out.*(stock)", "out_of_stock"),
    (r"(unpaid|outstanding|due).*(invoice|bill)", "outstanding_invoices"),
    (r"(expense|cost).*(this month|today|this week)", "expenses"),
    (r"(replenish|reorder|purchase|order)", "replenishment"),
    (r"(help|how|import|product list|catalogue)", "help"),
    (r"(forecast|predict|demand)", "forecast_help"),
    (r"(invoice|bill|create).*(invoice|bill)", "help_invoice"),
    (r"gst|tax.*(report|summary)", "help_gst"),
]

OFF_TOPIC_RESPONSE = (
    "I'm SmartBiz Assistant. I can help with your billing records, sales analytics, "
    "inventory, GST reports, forecasts, and purchase recommendations. "
    "Please ask a question related to your business data."
)


class ChatMessage(BaseModel):
    message: str


def _detect_intent(message: str) -> Optional[str]:
    msg = message.lower().strip()
    for pattern, intent in INTENT_PATTERNS:
        if re.search(pattern, msg):
            return intent
    return None


def _get_sales_summary(company_id: int, db: Session, period: str) -> str:
    today = date.today()
    if "yesterday" in period:
        d = today - timedelta(days=1)
        date_from = date_to = d
        label = "yesterday"
    elif "this week" in period:
        date_from = today - timedelta(days=today.weekday())
        date_to = today
        label = "this week"
    elif "this month" in period:
        date_from = today.replace(day=1)
        date_to = today
        label = "this month"
    elif "last month" in period:
        first_this = today.replace(day=1)
        date_to = first_this - timedelta(days=1)
        date_from = date_to.replace(day=1)
        label = "last month"
    else:  # today
        date_from = date_to = today
        label = "today"

    result = db.query(
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.grand_total), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.is_cancelled == False,
        Invoice.invoice_date >= date_from,
        Invoice.invoice_date <= date_to,
    ).first()

    count = result.count if result else 0
    total = round(float(result.total), 2) if result else 0.0

    if count == 0:
        return f"No sales recorded for {label}."
    return f"For {label}: {count} invoice(s) totalling ₹{total:,.2f}."


def _get_low_stock(company_id: int, db: Session) -> str:
    items = db.query(BusinessProduct).filter(
        BusinessProduct.company_id == company_id,
        BusinessProduct.status == ProductStatus.ACTIVE,
        BusinessProduct.track_inventory == True,
        BusinessProduct.current_stock <= BusinessProduct.reorder_level,
        BusinessProduct.reorder_level > 0,
    ).order_by(BusinessProduct.current_stock).limit(10).all()
    if not items:
        return "No products are currently at or below their reorder level. Inventory looks healthy!"
    lines = [f"  - {p.name}: {p.current_stock} {p.unit} (reorder at {p.reorder_level})" for p in items]
    return f"{len(items)} products are low or at reorder level:\n" + "\n".join(lines)


def _get_outstanding(company_id: int, db: Session) -> str:
    result = db.query(
        func.count(Invoice.id).label("count"),
        func.coalesce(func.sum(Invoice.balance_due), 0).label("total"),
    ).filter(
        Invoice.company_id == company_id,
        Invoice.balance_due > 0,
        Invoice.is_cancelled == False,
    ).first()
    count = result.count if result else 0
    total = round(float(result.total), 2) if result else 0.0
    if count == 0:
        return "No outstanding invoices. All payments are up to date!"
    return f"{count} invoice(s) have outstanding balances totalling ₹{total:,.2f}."


def _get_expenses(company_id: int, db: Session, period: str) -> str:
    today = date.today()
    date_from = today.replace(day=1)
    date_to = today
    label = "this month"
    if "today" in period:
        date_from = date_to = today
        label = "today"
    result = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.company_id == company_id,
        Expense.expense_date >= date_from,
        Expense.expense_date <= date_to,
    ).scalar() or 0.0
    return f"Total expenses for {label}: ₹{round(float(result), 2):,.2f}."


@router.post("/chat")
def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Restricted business assistant.
    Only answers questions about actual business data.
    Cannot execute arbitrary code, SQL, or access external systems.
    """
    company_id = current_user.company_id
    if not company_id:
        return {"response": "Please complete your business setup first."}

    user_message = message.message.strip()
    if not user_message:
        return {"response": "Please enter a question."}

    # Security: reject suspiciously long or injection-like messages
    if len(user_message) > 500:
        return {"response": OFF_TOPIC_RESPONSE}

    msg_lower = user_message.lower()
    intent = _detect_intent(user_message)

    if not intent:
        return {"response": OFF_TOPIC_RESPONSE}

    try:
        if intent == "sales_summary":
            response = _get_sales_summary(company_id, db, msg_lower)
        elif intent == "low_stock":
            response = _get_low_stock(company_id, db)
        elif intent == "out_of_stock":
            out_items = db.query(BusinessProduct).filter(
                BusinessProduct.company_id == company_id,
                BusinessProduct.current_stock <= 0,
                BusinessProduct.status == ProductStatus.ACTIVE,
                BusinessProduct.track_inventory == True,
            ).limit(15).all()
            if not out_items:
                response = "Great news — no products are currently out of stock!"
            else:
                names = ", ".join(p.name for p in out_items[:10])
                response = f"{len(out_items)} products are out of stock: {names}{'...' if len(out_items) > 10 else '.'}"
        elif intent == "outstanding_invoices":
            response = _get_outstanding(company_id, db)
        elif intent == "expenses":
            response = _get_expenses(company_id, db, msg_lower)
        elif intent == "top_products":
            from sqlalchemy import func as sqlfunc
            from models.invoice_models import InvoiceItem
            today = date.today()
            top = db.query(
                InvoiceItem.product_name,
                sqlfunc.sum(InvoiceItem.total_amount).label("rev"),
            ).join(Invoice).filter(
                Invoice.company_id == company_id,
                Invoice.is_cancelled == False,
                Invoice.invoice_date >= today.replace(day=1),
            ).group_by(InvoiceItem.product_name).order_by(sqlfunc.sum(InvoiceItem.total_amount).desc()).limit(5).all()
            if not top:
                response = "No sales recorded this month yet."
            else:
                lines = [f"  {i+1}. {r.product_name} — ₹{round(float(r.rev), 2):,.2f}" for i, r in enumerate(top)]
                response = "Top 5 products this month by revenue:\n" + "\n".join(lines)
        elif intent == "replenishment":
            low = db.query(BusinessProduct).filter(
                BusinessProduct.company_id == company_id,
                BusinessProduct.status == ProductStatus.ACTIVE,
                BusinessProduct.track_inventory == True,
                BusinessProduct.current_stock <= BusinessProduct.reorder_level,
                BusinessProduct.reorder_level > 0,
            ).limit(5).all()
            if not low:
                response = "No products need immediate replenishment based on current reorder levels."
            else:
                names = ", ".join(p.name for p in low)
                response = f"Products needing replenishment: {names}. Go to the Replenishment module for detailed recommendations."
        elif intent == "help":
            response = (
                "To import your product list: go to Products → Import Products. "
                "You can upload a CSV or Excel file. Download a template first for the correct format. "
                "For restaurant menus: go to Setup → Select Menu Items to browse and select from the starter catalogue."
            )
        elif intent == "forecast_help":
            response = "Go to Analytics → Demand Forecast to see product-level forecasts. The system needs at least 14 days of sales history to generate forecasts."
        elif intent == "help_invoice":
            response = "To create an invoice: go to Billing → New Invoice. Add products by searching or scanning barcodes, select a customer, and click Create Invoice."
        elif intent == "help_gst":
            response = "Go to Reports → GST Summary to view your tax collection by period. Note: SmartBiz AI provides reporting assistance, not legal tax advice. Consult a qualified CA for GST filing."
        else:
            response = OFF_TOPIC_RESPONSE
    except Exception as e:
        response = "Sorry, I encountered an error retrieving that information. Please try again."

    return {"response": response, "intent": intent}
