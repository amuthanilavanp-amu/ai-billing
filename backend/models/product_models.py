"""
Business-specific product models — each company's own product inventory.
These are SEPARATE from the shared catalogue templates.
"""
import enum
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, func, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ProductType(str, enum.Enum):
    PRODUCT = "product"
    SERVICE = "service"
    COMBO = "combo"


class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class TaxType(str, enum.Enum):
    GST = "gst"
    EXEMPT = "exempt"
    NON_TAXABLE = "non_taxable"


class ProductCategory(Base):
    """Business-specific product categories."""
    __tablename__ = "product_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list["BusinessProduct"]] = relationship(
        "BusinessProduct", back_populates="category"
    )

    __table_args__ = (
        UniqueConstraint("company_id", "name", "parent_id", name="uq_product_category"),
    )


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_brand_company"),
    )


class BusinessProduct(Base):
    """A product or service in a specific company's catalogue."""
    __tablename__ = "business_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    brand_id: Mapped[Optional[int]] = mapped_column(ForeignKey("brands.id"), nullable=True)
    catalogue_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("catalogue_items.id"), nullable=True
    )  # Source template, if imported from catalogue
    import_batch_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("import_batches.id"), nullable=True
    )

    # Core fields
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_type: Mapped[ProductType] = mapped_column(Enum(ProductType), default=ProductType.PRODUCT)
    status: Mapped[ProductStatus] = mapped_column(Enum(ProductStatus), default=ProductStatus.ACTIVE)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    hsn_sac_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # For GST

    # Pricing
    purchase_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)
    mrp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wholesale_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_selling_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Units
    unit: Mapped[str] = mapped_column(String(50), default="Pcs")
    secondary_unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    conversion_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Tax
    tax_type: Mapped[TaxType] = mapped_column(Enum(TaxType), default=TaxType.GST)
    gst_rate: Mapped[float] = mapped_column(Float, default=0.0)  # Total GST %
    tax_inclusive: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Inventory
    opening_stock: Mapped[float] = mapped_column(Float, default=0.0)
    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_level: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    max_stock_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_negative_stock: Mapped[bool] = mapped_column(Boolean, default=False)

    # Tracking
    track_batch: Mapped[bool] = mapped_column(Boolean, default=False)
    track_expiry: Mapped[bool] = mapped_column(Boolean, default=False)
    track_serial: Mapped[bool] = mapped_column(Boolean, default=False)

    # Restaurant-specific
    is_vegetarian: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    preparation_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    kitchen_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Images
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Supplier
    primary_supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    supplier_sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    company: Mapped["Company"] = relationship("Company", back_populates="products")  # type: ignore
    category: Mapped[Optional["ProductCategory"]] = relationship("ProductCategory", back_populates="products")
    brand: Mapped[Optional["Brand"]] = relationship("Brand")
    variants: Mapped[list["ProductVariant"]] = relationship("ProductVariant", back_populates="product")
    barcodes: Mapped[list["ProductBarcode"]] = relationship("ProductBarcode", back_populates="product")
    inventory_movements: Mapped[list["InventoryMovement"]] = relationship(  # type: ignore
        "InventoryMovement", back_populates="product"
    )

    __table_args__ = (
        Index("ix_business_products_company_name", "company_id", "name"),
        Index("ix_business_products_company_sku", "company_id", "sku"),
        Index("ix_business_products_company_barcode", "company_id", "barcode"),
    )


class ProductVariant(Base):
    """Product variants (size, color, etc.)."""
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("business_products.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # e.g. "Large", "Red/L"
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    additional_price: Mapped[float] = mapped_column(Float, default=0.0)
    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    # Size/color attributes (JSON string)
    attributes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped["BusinessProduct"] = relationship("BusinessProduct", back_populates="variants")


class ProductBarcode(Base):
    """Multiple barcodes can map to one product."""
    __tablename__ = "product_barcodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("business_products.id"), nullable=False, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    barcode: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    barcode_type: Mapped[str] = mapped_column(String(20), default="EAN13")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped["BusinessProduct"] = relationship("BusinessProduct", back_populates="barcodes")

    __table_args__ = (
        UniqueConstraint("company_id", "barcode", name="uq_barcode_company"),
    )
