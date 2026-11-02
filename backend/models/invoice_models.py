"""Invoice and billing models"""
import enum
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
    CREDIT = "credit"
    MIXED = "mixed"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.ISSUED)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.CASH)

    # Amounts — stored and NEVER recomputed from product prices
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    taxable_amount: Mapped[float] = mapped_column(Float, default=0.0)
    cgst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    sgst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    igst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_tax: Mapped[float] = mapped_column(Float, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, default=0.0)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    balance_due: Mapped[float] = mapped_column(Float, default=0.0)
    round_off: Mapped[float] = mapped_column(Float, default=0.0)

    # Billing address snapshot
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    customer_gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_return: Mapped[bool] = mapped_column(Boolean, default=False)
    original_invoice_id: Mapped[Optional[int]] = mapped_column(ForeignKey("invoices.id"), nullable=True)

    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    company: Mapped["Company"] = relationship("Company", back_populates="invoices")  # type: ignore
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="invoices")  # type: ignore
    items: Mapped[list["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="invoice")

    __table_args__ = (
        Index("ix_invoices_company_date", "company_id", "invoice_date"),
        Index("ix_invoices_number", "company_id", "invoice_number"),
    )


class InvoiceItem(Base):
    """
    Line items on an invoice.
    All amounts are SNAPSHOTTED at time of billing — never recomputed.
    """
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False, index=True)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("business_products.id"), nullable=True)

    # Snapshots — preserved even if product changes
    product_name: Mapped[str] = mapped_column(String(300), nullable=False)
    product_sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hsn_sac_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), default="Pcs")
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    taxable_amount: Mapped[float] = mapped_column(Float, nullable=False)
    gst_rate: Mapped[float] = mapped_column(Float, default=0.0)
    cgst_rate: Mapped[float] = mapped_column(Float, default=0.0)
    sgst_rate: Mapped[float] = mapped_column(Float, default=0.0)
    igst_rate: Mapped[float] = mapped_column(Float, default=0.0)
    cgst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    sgst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    igst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False, index=True)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.CASH)
    reference_number: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")
