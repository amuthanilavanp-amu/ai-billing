"""Inventory movement models"""
import enum
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class MovementType(str, enum.Enum):
    OPENING = "opening"
    PURCHASE = "purchase"
    SALE = "sale"
    RETURN_IN = "return_in"
    RETURN_OUT = "return_out"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    DAMAGE = "damage"
    EXPIRY = "expiry"


class InventoryMovement(Base):
    """Every stock change generates an auditable movement record."""
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("business_products.id"), nullable=False, index=True)
    movement_type: Mapped[MovementType] = mapped_column(Enum(MovementType), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)  # Positive = in, Negative = out
    unit_cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stock_before: Mapped[float] = mapped_column(Float, nullable=False)
    stock_after: Mapped[float] = mapped_column(Float, nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # invoice, purchase, etc.
    reference_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    batch_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    product: Mapped["BusinessProduct"] = relationship("BusinessProduct", back_populates="inventory_movements")  # type: ignore

    __table_args__ = (
        Index("ix_inv_movement_company_product_date", "company_id", "product_id", "created_at"),
    )
