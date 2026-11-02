"""Company and business settings models"""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class BusinessCategory(str, enum.Enum):
    HOTEL_RESTAURANT = "hotel_restaurant"
    CAFE_COFFEE = "cafe_coffee"
    BAKERY_SWEETS = "bakery_sweets"
    SUPERMARKET = "supermarket"
    GROCERY_PROVISION = "grocery_provision"
    WHOLESALE = "wholesale"
    RETAIL = "retail"
    PHARMACY = "pharmacy"
    HOSPITAL_CLINIC = "hospital_clinic"
    MEDICAL_SUPPLIES = "medical_supplies"
    CLOTHING = "clothing"
    FOOTWEAR = "footwear"
    ELECTRONICS = "electronics"
    MOBILE_ACCESSORIES = "mobile_accessories"
    HARDWARE = "hardware"
    COSMETICS = "cosmetics"
    SALON_BEAUTY = "salon_beauty"
    AUTOMOBILE_WORKSHOP = "automobile_workshop"
    SPARE_PARTS = "spare_parts"
    MANUFACTURING = "manufacturing"
    FURNITURE = "furniture"
    STATIONERY = "stationery"
    AGRICULTURE = "agriculture"
    PET_SUPPLIES = "pet_supplies"
    SPORTS_FITNESS = "sports_fitness"
    ECOMMERCE = "ecommerce"
    EDUCATION = "education"
    PROFESSIONAL_SERVICES = "professional_services"
    REPAIR_MAINTENANCE = "repair_maintenance"
    OTHER = "other"


class TaxScheme(str, enum.Enum):
    GST = "gst"
    NON_GST = "non_gst"
    EXEMPT = "exempt"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_category: Mapped[BusinessCategory] = mapped_column(
        Enum(BusinessCategory), default=BusinessCategory.OTHER
    )
    logo_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address_line1: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India")
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(10), default="INR")
    currency_symbol: Mapped[str] = mapped_column(String(5), default="₹")
    tax_scheme: Mapped[TaxScheme] = mapped_column(Enum(TaxScheme), default=TaxScheme.GST)
    state_code: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # For GST
    invoice_prefix: Mapped[str] = mapped_column(String(20), default="INV")
    invoice_next_number: Mapped[int] = mapped_column(Integer, default=1)
    fiscal_year_start: Mapped[str] = mapped_column(String(10), default="04-01")  # MM-DD
    date_format: Mapped[str] = mapped_column(String(20), default="DD/MM/YYYY")
    decimal_places: Mapped[int] = mapped_column(Integer, default=2)
    is_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[int] = mapped_column(Integer, default=1)
    footer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    users: Mapped[list["User"]] = relationship(  # type: ignore[name-defined]
        "User", back_populates="company"
    )
    products: Mapped[list["BusinessProduct"]] = relationship(  # type: ignore[name-defined]
        "BusinessProduct", back_populates="company"
    )
    invoices: Mapped[list["Invoice"]] = relationship(  # type: ignore[name-defined]
        "Invoice", back_populates="company"
    )
