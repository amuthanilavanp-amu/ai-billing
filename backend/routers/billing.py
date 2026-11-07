"""Billing and invoice router"""
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.invoice_models import Invoice, InvoiceItem, Payment, InvoiceStatus, PaymentMethod
from models.product_models import BusinessProduct, ProductStatus
from models.customer_models import Customer
from models.inventory_models import InventoryMovement, MovementType
from routers.auth import get_current_user
from models.user_models import User

router = APIRouter()


class InvoiceItemInput(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    product_sku: Optional[str] = None
    hsn_sac_code: Optional[str] = None
    unit: str = "Pcs"
    quantity: float
    unit_price: float
    discount_percent: float = 0.0
    gst_rate: float = 0.0
    notes: Optional[str] = None


class InvoiceCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_gstin: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_method: str = "cash"
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    notes: Optional[str] = None
    items: List[InvoiceItemInput]
    is_igst: bool = False  # True if inter-state (IGST instead of CGST+SGST)
    round_off: float = 0.0


def _calculate_invoice(items: List[InvoiceItemInput], discount_percent: float, discount_amount: float, is_igst: bool, round_off: float):
    """Calculate invoice totals from line items."""
    subtotal = 0.0
    line_items = []

    for item in items:
        line_subtotal = round(item.quantity * item.unit_price, 2)
        line_discount = round(line_subtotal * item.discount_percent / 100, 2)
        taxable = round(line_subtotal - line_discount, 2)
        tax_amount = round(taxable * item.gst_rate / 100, 2)
        total = round(taxable + tax_amount, 2)
        subtotal += line_subtotal

        cgst_rate = sgst_rate = igst_rate = 0.0
        cgst_amount = sgst_amount = igst_amount = 0.0

        if is_igst:
            igst_rate = item.gst_rate
            igst_amount = tax_amount
        else:
            cgst_rate = sgst_rate = round(item.gst_rate / 2, 3)
            cgst_amount = sgst_amount = round(tax_amount / 2, 2)

        line_items.append({
            "product_name": item.product_name,
            "product_id": item.product_id,
            "product_sku": item.product_sku,
            "hsn_sac_code": item.hsn_sac_code,
            "unit": item.unit,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "discount_percent": item.discount_percent,
            "discount_amount": line_discount,
            "taxable_amount": taxable,
            "gst_rate": item.gst_rate,
            "cgst_rate": cgst_rate,
            "sgst_rate": sgst_rate,
            "igst_rate": igst_rate,
            "cgst_amount": cgst_amount,
            "sgst_amount": sgst_amount,
            "igst_amount": igst_amount,
            "tax_amount": tax_amount,
            "total_amount": total,
            "notes": item.notes,
        })

    # Apply invoice-level discount
    invoice_discount = discount_amount if discount_amount > 0 else round(subtotal * discount_percent / 100, 2)
    taxable_amount = round(subtotal - invoice_discount, 2)

    total_tax = sum(li["tax_amount"] for li in line_items)
    cgst_total = sum(li["cgst_amount"] for li in line_items)
    sgst_total = sum(li["sgst_amount"] for li in line_items)
    igst_total = sum(li["igst_amount"] for li in line_items)
    grand_total = round(taxable_amount + total_tax + round_off, 2)

    return {
        "subtotal": round(subtotal, 2),
        "discount_amount": invoice_discount,
        "taxable_amount": taxable_amount,
        "total_tax": round(total_tax, 2),
        "cgst_amount": round(cgst_total, 2),
        "sgst_amount": round(sgst_total, 2),
        "igst_amount": round(igst_total, 2),
        "grand_total": grand_total,
        "round_off": round_off,
        "line_items": line_items,
    }


@router.post("")
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No company")

    from models.company_models import Company
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")

    # Generate invoice number
    invoice_number = f"{company.invoice_prefix}-{company.invoice_next_number:05d}"
    company.invoice_next_number += 1

    calc = _calculate_invoice(
        data.items,
        data.discount_percent,
        data.discount_amount,
        data.is_igst,
        data.round_off,
    )

    invoice_date = data.invoice_date or date.today()

    invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=data.customer_id,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        due_date=data.due_date,
        status=InvoiceStatus.PAID if data.payment_method != "credit" else InvoiceStatus.ISSUED,
        payment_method=PaymentMethod(data.payment_method) if data.payment_method in [m.value for m in PaymentMethod] else PaymentMethod.CASH,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_gstin=data.customer_gstin,
        subtotal=calc["subtotal"],
        discount_amount=calc["discount_amount"],
        discount_percent=data.discount_percent,
        taxable_amount=calc["taxable_amount"],
        cgst_amount=calc["cgst_amount"],
        sgst_amount=calc["sgst_amount"],
        igst_amount=calc["igst_amount"],
        total_tax=calc["total_tax"],
        grand_total=calc["grand_total"],
        paid_amount=calc["grand_total"] if data.payment_method != "credit" else 0.0,
        balance_due=0.0 if data.payment_method != "credit" else calc["grand_total"],
        round_off=data.round_off,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(invoice)
    db.flush()

    for idx, li in enumerate(calc["line_items"]):
        item = InvoiceItem(
            invoice_id=invoice.id,
            sort_order=idx,
            **{k: v for k, v in li.items()},
        )
        db.add(item)

        # Deduct inventory
        if li["product_id"]:
            product = db.query(BusinessProduct).filter(
                BusinessProduct.id == li["product_id"],
                BusinessProduct.company_id == current_user.company_id,
            ).first()
            if product and product.track_inventory:
                stock_before = product.current_stock
                product.current_stock = max(0, product.current_stock - li["quantity"])
                movement = InventoryMovement(
                    company_id=current_user.company_id,
                    product_id=product.id,
                    movement_type=MovementType.SALE,
                    quantity=-li["quantity"],
                    unit_cost=product.purchase_price,
                    stock_before=stock_before,
                    stock_after=product.current_stock,
                    reference_type="invoice",
                    reference_id=invoice.id,
                    created_by=current_user.id,
                )
                db.add(movement)

    # Record payment
    if data.payment_method != "credit":
        payment = Payment(
            company_id=current_user.company_id,
            invoice_id=invoice.id,
            payment_date=invoice_date,
            amount=calc["grand_total"],
            payment_method=invoice.payment_method,
            created_by=current_user.id,
        )
        db.add(payment)

    db.commit()
    return {
        "id": invoice.id,
        "invoice_number": invoice_number,
        "invoice_date": invoice_date.isoformat(),
        "customer_name": invoice.customer_name or "Walk-in Customer",
        "customer_phone": invoice.customer_phone,
        "customer_gstin": invoice.customer_gstin,
        "subtotal": calc["subtotal"],
        "discount_amount": calc["discount_amount"],
        "discount_percent": data.discount_percent,
        "taxable_amount": calc["taxable_amount"],
        "cgst_amount": calc["cgst_amount"],
        "sgst_amount": calc["sgst_amount"],
        "igst_amount": calc["igst_amount"],
        "total_tax": calc["total_tax"],
        "grand_total": calc["grand_total"],
        "paid_amount": invoice.paid_amount,
        "balance_due": invoice.balance_due,
        "round_off": data.round_off,
        "payment_method": invoice.payment_method.value,
        "items": calc["line_items"],
    }


@router.get("")
def list_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.company_id:
        return {"total": 0, "items": []}

    q = db.query(Invoice).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.is_cancelled == False,
    )

    if search:
        q = q.filter(Invoice.invoice_number.ilike(f"%{search}%"))
    if status:
        try:
            q = q.filter(Invoice.status == InvoiceStatus(status))
        except ValueError:
            pass
    if date_from:
        q = q.filter(Invoice.invoice_date >= date_from)
    if date_to:
        q = q.filter(Invoice.invoice_date <= date_to)

    total = q.count()
    invoices = q.order_by(Invoice.invoice_date.desc(), Invoice.id.desc()).offset((page-1)*page_size).limit(page_size).all()

    return {
        "total": total,
        "items": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "customer_name": inv.customer_name or (inv.customer.name if inv.customer else "Walk-in"),
                "grand_total": inv.grand_total,
                "paid_amount": inv.paid_amount,
                "balance_due": inv.balance_due,
                "status": inv.status.value,
                "payment_method": inv.payment_method.value,
            }
            for inv in invoices
        ],
    }


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date.isoformat(),
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "customer_id": invoice.customer_id,
        "customer_name": invoice.customer_name,
        "customer_phone": invoice.customer_phone,
        "customer_gstin": invoice.customer_gstin,
        "subtotal": invoice.subtotal,
        "discount_amount": invoice.discount_amount,
        "taxable_amount": invoice.taxable_amount,
        "cgst_amount": invoice.cgst_amount,
        "sgst_amount": invoice.sgst_amount,
        "igst_amount": invoice.igst_amount,
        "total_tax": invoice.total_tax,
        "grand_total": invoice.grand_total,
        "paid_amount": invoice.paid_amount,
        "balance_due": invoice.balance_due,
        "round_off": invoice.round_off,
        "status": invoice.status.value,
        "payment_method": invoice.payment_method.value,
        "notes": invoice.notes,
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "product_sku": item.product_sku,
                "hsn_sac_code": item.hsn_sac_code,
                "unit": item.unit,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount_percent": item.discount_percent,
                "discount_amount": item.discount_amount,
                "taxable_amount": item.taxable_amount,
                "gst_rate": item.gst_rate,
                "cgst_amount": item.cgst_amount,
                "sgst_amount": item.sgst_amount,
                "igst_amount": item.igst_amount,
                "tax_amount": item.tax_amount,
                "total_amount": item.total_amount,
            }
            for item in invoice.items
        ],
    }
