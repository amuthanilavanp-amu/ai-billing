"""
Shared starter catalogue models — templates available to all businesses.
These are TEMPLATES, not actual business inventory.
"""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class CatalogueCategory(Base):
    """Top-level category within a business category's catalogue."""
    __tablename__ = "catalogue_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subcategories: Mapped[list["CatalogueSubcategory"]] = relationship(
        "CatalogueSubcategory", back_populates="category"
    )
    items: Mapped[list["CatalogueItem"]] = relationship(
        "CatalogueItem", back_populates="category"
    )


class CatalogueSubcategory(Base):
    """Subcategory within a catalogue category."""
    __tablename__ = "catalogue_subcategories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("catalogue_categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["CatalogueCategory"] = relationship("CatalogueCategory", back_populates="subcategories")
    items: Mapped[list["CatalogueItem"]] = relationship("CatalogueItem", back_populates="subcategory")


class CatalogueItem(Base):
    """A product/service template in the shared starter catalogue."""
    __tablename__ = "catalogue_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("catalogue_categories.id"), nullable=False, index=True)
    subcategory_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("catalogue_subcategories.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    default_price_hint: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Hint only, NOT binding
    is_vegetarian: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)  # For food
    is_service: Mapped[bool] = mapped_column(Boolean, default=False)
    # Tags for search
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped["CatalogueCategory"] = relationship("CatalogueCategory", back_populates="items")
    subcategory: Mapped[Optional["CatalogueSubcategory"]] = relationship(
        "CatalogueSubcategory", back_populates="items"
    )

    __table_args__ = (
        Index("ix_catalogue_items_search", "category_id", "name"),
    )


class ImportBatch(Base):
    """Tracks a single product import operation."""
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # csv, xlsx
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0)
    updated_rows: Mapped[int] = mapped_column(Integer, default=0)
    skipped_rows: Mapped[int] = mapped_column(Integer, default=0)
    error_rows: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, processing, done, error
    column_mapping: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    error_report_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ImportRowError(Base):
    """Stores per-row errors from an import operation."""
    __tablename__ = "import_row_errors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id"), nullable=False, index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    error_type: Mapped[str] = mapped_column(String(50), nullable=False)  # validation, duplicate, system
